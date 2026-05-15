import numpy as np
from typing import List, Dict
from scipy import stats
from .models import AnalysisDataset, WaferData, CorrelationResult


class CorrelationAnalyzer:
    def __init__(self, dataset: AnalysisDataset):
        self.dataset = dataset
        self.results: List[CorrelationResult] = []
    
    def analyze_all(self) -> List[CorrelationResult]:
        self._analyze_param_vs_pull_force()
        return self.results
    
    def _analyze_param_vs_pull_force(self):
        param_names = ['avg_power', 'avg_time', 'avg_force', 'avg_temp']
        param_extractors = {
            'avg_power': lambda w: w.avg_power,
            'avg_time': lambda w: w.avg_time,
            'avg_force': lambda w: w.avg_force,
            'avg_temp': lambda w: w.avg_temp
        }
        
        for chip_model in set(w.chip_model for w in self.dataset.wafers.values()):
            wafers = self.dataset.get_wafers_by_chip_model(chip_model)
            if len(wafers) < 5:
                continue
            
            for param_name in param_names:
                x = []
                y = []
                
                for wafer in wafers:
                    if wafer.pull_tests:
                        param_value = param_extractors[param_name](wafer)
                        avg_pull = wafer.avg_pull_force
                        if param_value > 0 and avg_pull > 0:
                            x.append(param_value)
                            y.append(avg_pull)
                
                if len(x) >= 5:
                    corr_coeff, p_value = stats.pearsonr(x, y)
                    significance = self._get_significance(p_value)
                    trend = self._get_trend(corr_coeff)
                    
                    self.results.append(CorrelationResult(
                        param_name=f"{chip_model}_{param_name}",
                        correlation_coeff=corr_coeff,
                        p_value=p_value,
                        significance=significance,
                        trend=trend
                    ))
        
        x_all = []
        y_all = []
        
        for wafer in self.dataset.wafers.values():
            if wafer.pull_tests and wafer.bonding_params_list:
                for params in wafer.bonding_params_list:
                    for test in wafer.pull_tests:
                        x_all.extend([params.power, params.time_us, params.force_grams, params.temp_celsius])
                        y_all.extend([test.pull_force_grams] * 4)
        
        if len(x_all) >= 10:
            x_array = np.array(x_all)
            y_array = np.array(y_all)
            
            for i, param_name in enumerate(['power', 'time_us', 'force_grams', 'temp_celsius']):
                x_sub = x_array[i::4]
                y_sub = y_array[i::4]
                
                if len(x_sub) >= 5:
                    corr_coeff, p_value = stats.pearsonr(x_sub, y_sub)
                    significance = self._get_significance(p_value)
                    trend = self._get_trend(corr_coeff)
                    
                    self.results.append(CorrelationResult(
                        param_name=f"overall_{param_name}",
                        correlation_coeff=corr_coeff,
                        p_value=p_value,
                        significance=significance,
                        trend=trend
                    ))
    
    def _get_significance(self, p_value: float) -> str:
        if p_value < 0.001:
            return "***"
        elif p_value < 0.01:
            return "**"
        elif p_value < 0.05:
            return "*"
        elif p_value < 0.1:
            return "."
        else:
            return " "
    
    def _get_trend(self, corr_coeff: float) -> str:
        if corr_coeff > 0.7:
            return "strong_positive"
        elif corr_coeff > 0.3:
            return "moderate_positive"
        elif corr_coeff > 0:
            return "weak_positive"
        elif corr_coeff > -0.3:
            return "weak_negative"
        elif corr_coeff > -0.7:
            return "moderate_negative"
        else:
            return "strong_negative"
    
    def get_significant_correlations(self, p_threshold: float = 0.05) -> List[CorrelationResult]:
        return [r for r in self.results if r.p_value < p_threshold]
    
    def get_correlation_matrix(self) -> Dict[str, Dict[str, float]]:
        all_params = ['power', 'time_us', 'force_grams', 'temp_celsius', 'pull_force']
        matrix = {p: {q: 0.0 for q in all_params} for p in all_params}
        
        data = {p: [] for p in all_params}
        for wafer in self.dataset.wafers.values():
            if wafer.pull_tests and wafer.bonding_params_list:
                for params in wafer.bonding_params_list:
                    data['power'].append(params.power)
                    data['time_us'].append(params.time_us)
                    data['force_grams'].append(params.force_grams)
                    data['temp_celsius'].append(params.temp_celsius)
                    data['pull_force'].append(wafer.avg_pull_force)
        
        for p in all_params:
            for q in all_params:
                if len(data[p]) >= 5 and len(data[q]) >= 5:
                    corr, _ = stats.pearsonr(data[p], data[q])
                    matrix[p][q] = corr
        
        return matrix


def analyze_correlations(dataset: AnalysisDataset) -> List[CorrelationResult]:
    analyzer = CorrelationAnalyzer(dataset)
    return analyzer.analyze_all()
