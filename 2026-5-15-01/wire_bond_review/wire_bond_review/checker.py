import numpy as np
from typing import List, Dict, Tuple
from scipy import stats
from .models import (
    AnalysisDataset, WaferData, ProcessWindow,
    ProcessCheckResult, FailureMode
)


class ProcessChecker:
    def __init__(self, dataset: AnalysisDataset):
        self.dataset = dataset
        self.results: Dict[str, ProcessCheckResult] = {}
    
    def check_all(self) -> Dict[str, ProcessCheckResult]:
        for wafer_id in self.dataset.get_all_wafer_ids():
            wafer = self.dataset.get_wafer(wafer_id)
            if wafer:
                self.results[wafer_id] = self.check_wafer(wafer)
        return self.results
    
    def check_wafer(self, wafer: WaferData) -> ProcessCheckResult:
        result = ProcessCheckResult(wafer_id=wafer.wafer_id)
        
        process_window = self.dataset.process_windows.get(wafer.chip_model)
        
        if process_window:
            param_deviations = self._check_param_deviations(wafer, process_window)
            result.param_deviations = param_deviations
        
        pull_anomalies = self._check_pull_force(wafer, process_window)
        result.pull_force_anomalies = pull_anomalies
        
        inconsistencies = self._check_station_consistency(wafer)
        result.station_inconsistencies = inconsistencies
        
        result.overall_status, result.risk_level = self._determine_status(result)
        
        return result
    
    def _check_param_deviations(self, wafer: WaferData, window: ProcessWindow) -> List[Dict[str, any]]:
        deviations = []
        
        for params in wafer.bonding_params_list:
            devs = []
            
            if params.power < window.power_min or params.power > window.power_max:
                devs.append({
                    'param': 'power',
                    'value': params.power,
                    'min': window.power_min,
                    'max': window.power_max,
                    'deviation_pct': abs(params.power - (window.power_min + window.power_max) / 2) / 
                                      ((window.power_max - window.power_min) / 2) * 100
                })
            
            if params.time_us < window.time_min or params.time_us > window.time_max:
                devs.append({
                    'param': 'time_us',
                    'value': params.time_us,
                    'min': window.time_min,
                    'max': window.time_max,
                    'deviation_pct': abs(params.time_us - (window.time_min + window.time_max) / 2) / 
                                      ((window.time_max - window.time_min) / 2) * 100
                })
            
            if params.force_grams < window.force_min or params.force_grams > window.force_max:
                devs.append({
                    'param': 'force_grams',
                    'value': params.force_grams,
                    'min': window.force_min,
                    'max': window.force_max,
                    'deviation_pct': abs(params.force_grams - (window.force_min + window.force_max) / 2) / 
                                      ((window.force_max - window.force_min) / 2) * 100
                })
            
            if params.temp_celsius < window.temp_min or params.temp_celsius > window.temp_max:
                devs.append({
                    'param': 'temp_celsius',
                    'value': params.temp_celsius,
                    'min': window.temp_min,
                    'max': window.temp_max,
                    'deviation_pct': abs(params.temp_celsius - (window.temp_min + window.temp_max) / 2) / 
                                      ((window.temp_max - window.temp_min) / 2) * 100
                })
            
            for dev in devs:
                dev['timestamp'] = params.timestamp
                deviations.append(dev)
        
        return deviations
    
    def _check_pull_force(self, wafer: WaferData, window: ProcessWindow) -> List[Dict[str, any]]:
        anomalies = []
        
        if not wafer.pull_tests:
            return anomalies
        
        pull_forces = [pt.pull_force_grams for pt in wafer.pull_tests]
        mean_force = np.mean(pull_forces)
        std_force = np.std(pull_forces)
        
        lower_limit = window.pull_force_lower_limit if window else mean_force - 3 * std_force
        
        for test in wafer.pull_tests:
            if test.pull_force_grams < lower_limit:
                anomalies.append({
                    'test_id': test.test_id,
                    'wire_id': test.wire_id,
                    'pull_force': test.pull_force_grams,
                    'lower_limit': lower_limit,
                    'failure_mode': test.failure_mode.value,
                    'is_sampling': test.is_sampling,
                    'z_score': (test.pull_force_grams - mean_force) / std_force if std_force > 0 else 0
                })
        
        return anomalies
    
    def _check_station_consistency(self, wafer: WaferData) -> List[Dict[str, any]]:
        inconsistencies = []
        
        if not wafer.bonding_params_list:
            return inconsistencies
        
        station_data = {}
        for params in wafer.bonding_params_list:
            station_id = params.station_id
            if station_id not in station_data:
                station_data[station_id] = {'power': [], 'time': [], 'force': [], 'temp': []}
            station_data[station_id]['power'].append(params.power)
            station_data[station_id]['time'].append(params.time_us)
            station_data[station_id]['force'].append(params.force_grams)
            station_data[station_id]['temp'].append(params.temp_celsius)
        
        if len(station_data) < 2:
            return inconsistencies
        
        station_means = {}
        for station, data in station_data.items():
            station_means[station] = {
                'power': np.mean(data['power']),
                'time': np.mean(data['time']),
                'force': np.mean(data['force']),
                'temp': np.mean(data['temp'])
            }
        
        overall_means = {}
        for param in ['power', 'time', 'force', 'temp']:
            values = [station_means[s][param] for s in station_means]
            overall_means[param] = np.mean(values)
            overall_std = np.std(values)
            
            if overall_std > 0:
                for station in station_means:
                    deviation = abs(station_means[station][param] - overall_means[param])
                    if deviation > overall_std:
                        inconsistencies.append({
                            'station_id': station,
                            'param': param,
                            'station_mean': station_means[station][param],
                            'overall_mean': overall_means[param],
                            'deviation_std': deviation / overall_std
                        })
        
        return inconsistencies
    
    def _determine_status(self, result: ProcessCheckResult) -> Tuple[str, str]:
        issues = len(result.param_deviations) + len(result.pull_force_anomalies) + len(result.station_inconsistencies)
        
        if issues == 0:
            return "PASS", "LOW"
        elif issues < 3:
            return "WARNING", "MEDIUM"
        else:
            return "FAIL", "HIGH"
    
    def get_summary_statistics(self) -> Dict[str, any]:
        all_pull_forces = []
        all_failures = []
        pass_count = 0
        warn_count = 0
        fail_count = 0
        
        for wafer_id, result in self.results.items():
            wafer = self.dataset.get_wafer(wafer_id)
            if wafer:
                all_pull_forces.extend([pt.pull_force_grams for pt in wafer.pull_tests])
                all_failures.extend([pt.failure_mode for pt in wafer.pull_tests])
            
            if result.overall_status == "PASS":
                pass_count += 1
            elif result.overall_status == "WARNING":
                warn_count += 1
            else:
                fail_count += 1
        
        failure_distribution = {}
        for failure in all_failures:
            failure_distribution[failure.value] = failure_distribution.get(failure.value, 0) + 1
        
        return {
            'total_wafers': len(self.results),
            'pass_count': pass_count,
            'warning_count': warn_count,
            'fail_count': fail_count,
            'yield_rate': pass_count / len(self.results) if self.results else 0,
            'mean_pull_force': np.mean(all_pull_forces) if all_pull_forces else 0,
            'std_pull_force': np.std(all_pull_forces) if all_pull_forces else 0,
            'min_pull_force': np.min(all_pull_forces) if all_pull_forces else 0,
            'max_pull_force': np.max(all_pull_forces) if all_pull_forces else 0,
            'failure_distribution': failure_distribution,
            'cpk': self._calculate_cpk(all_pull_forces) if all_pull_forces else 0
        }
    
    def _calculate_cpk(self, values: List[float]) -> float:
        if len(values) < 2:
            return 0.0
        
        mean_val = np.mean(values)
        std_val = np.std(values, ddof=1)
        
        if std_val == 0:
            return float('inf')
        
        usl = mean_val + 3 * std_val
        lsl = mean_val - 3 * std_val
        
        cpu = (usl - mean_val) / (3 * std_val)
        cpl = (mean_val - lsl) / (3 * std_val)
        
        return min(cpu, cpl)
    
    def get_anomalous_wafers(self) -> List[str]:
        return [wid for wid, res in self.results.items() if res.overall_status != "PASS"]
    
    def get_high_risk_wafers(self) -> List[str]:
        return [wid for wid, res in self.results.items() if res.risk_level == "HIGH"]


def check_process(dataset: AnalysisDataset) -> Dict[str, ProcessCheckResult]:
    checker = ProcessChecker(dataset)
    return checker.check_all()
