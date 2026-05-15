import numpy as np
from typing import List, Dict
from datetime import datetime
from .models import AnalysisDataset, WaferData, MachineRanking, MachineProfile


class MachineRanker:
    def __init__(self, dataset: AnalysisDataset):
        self.dataset = dataset
        self.rankings: List[MachineRanking] = []
    
    def rank_machines(self) -> List[MachineRanking]:
        machine_data = self._collect_machine_data()
        
        for machine_id, data in machine_data.items():
            ranking = self._calculate_machine_ranking(machine_id, data)
            self.rankings.append(ranking)
        
        self.rankings.sort(key=lambda x: x.score)
        
        return self.rankings
    
    def _collect_machine_data(self) -> Dict[str, Dict]:
        machine_data = {}
        
        for wafer in self.dataset.wafers.values():
            if not wafer.bonding_params_list:
                continue
            
            for params in wafer.bonding_params_list:
                machine_id = params.machine_id
                station_id = params.station_id
                
                key = f"{machine_id}_{station_id}"
                
                if key not in machine_data:
                    machine_data[key] = {
                        'machine_id': machine_id,
                        'station_id': station_id,
                        'pull_forces': [],
                        'failure_rates': [],
                        'power_values': [],
                        'time_values': [],
                        'force_values': [],
                        'temp_values': [],
                        'wafer_count': 0
                    }
                
                if wafer.pull_tests:
                    machine_data[key]['pull_forces'].append(wafer.avg_pull_force)
                    machine_data[key]['failure_rates'].append(wafer.failure_rate)
                
                machine_data[key]['power_values'].append(params.power)
                machine_data[key]['time_values'].append(params.time_us)
                machine_data[key]['force_values'].append(params.force_grams)
                machine_data[key]['temp_values'].append(params.temp_celsius)
                machine_data[key]['wafer_count'] += 1
        
        return machine_data
    
    def _calculate_machine_ranking(self, machine_key: str, data: Dict) -> MachineRanking:
        machine_id = data['machine_id']
        station_id = data['station_id']
        
        avg_pull_force = np.mean(data['pull_forces']) if data['pull_forces'] else 0.0
        avg_failure_rate = np.mean(data['failure_rates']) if data['failure_rates'] else 0.0
        
        param_cvs = []
        for param in ['power_values', 'time_values', 'force_values', 'temp_values']:
            values = data[param]
            if values:
                mean_val = np.mean(values)
                std_val = np.std(values)
                if mean_val > 0:
                    cv = std_val / mean_val
                    param_cvs.append(cv)
        
        avg_param_cv = np.mean(param_cvs) if param_cvs else 0.0
        
        risk_factors = []
        risk_score = 0.0
        
        if avg_pull_force < 5.0:
            risk_factors.append("Low pull force")
            risk_score += 3.0
        elif avg_pull_force < 7.0:
            risk_score += 1.0
        
        if avg_failure_rate > 0.15:
            risk_factors.append("High failure rate")
            risk_score += 3.0
        elif avg_failure_rate > 0.08:
            risk_score += 1.0
        
        if avg_param_cv > 0.15:
            risk_factors.append("High parameter variation")
            risk_score += 2.0
        elif avg_param_cv > 0.08:
            risk_score += 1.0
        
        days_since_maintenance = self._get_days_since_maintenance(machine_id)
        if days_since_maintenance > 30:
            risk_factors.append("Maintenance overdue")
            risk_score += 2.0
        elif days_since_maintenance > 14:
            risk_score += 1.0
        
        capillary_hours = self._get_capillary_hours(machine_id)
        if capillary_hours > 200:
            risk_factors.append("Capillary aging")
            risk_score += 2.0
        elif capillary_hours > 100:
            risk_score += 1.0
        
        wafer_count = data['wafer_count']
        if wafer_count < 5:
            risk_score += 0.5
        
        if risk_score >= 6.0:
            priority = "CRITICAL"
        elif risk_score >= 4.0:
            priority = "HIGH"
        elif risk_score >= 2.0:
            priority = "MEDIUM"
        else:
            priority = "LOW"
        
        return MachineRanking(
            machine_id=machine_id,
            station_id=station_id,
            score=risk_score,
            risk_factors=risk_factors,
            maintenance_priority=priority,
            avg_pull_force=float(avg_pull_force),
            failure_rate=float(avg_failure_rate),
            param_cv=float(avg_param_cv)
        )
    
    def _get_days_since_maintenance(self, machine_id: str) -> int:
        profile = self.dataset.machine_profiles.get(machine_id)
        if profile:
            delta = datetime.now() - profile.last_maintenance_date
            return delta.days
        return 0
    
    def _get_capillary_hours(self, machine_id: str) -> float:
        profile = self.dataset.machine_profiles.get(machine_id)
        if profile:
            return profile.current_capillary_hours
        return 0.0
    
    def get_critical_machines(self) -> List[MachineRanking]:
        return [r for r in self.rankings if r.maintenance_priority == "CRITICAL"]
    
    def get_high_priority_machines(self) -> List[MachineRanking]:
        return [r for r in self.rankings if r.maintenance_priority in ["CRITICAL", "HIGH"]]


def rank_machines(dataset: AnalysisDataset) -> List[MachineRanking]:
    ranker = MachineRanker(dataset)
    return ranker.rank_machines()
