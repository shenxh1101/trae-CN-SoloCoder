import numpy as np
from typing import List, Dict, Optional
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from .models import AnalysisDataset, WaferData, ParamAdjustment, ProcessWindow


class ParamPredictor:
    def __init__(self, dataset: AnalysisDataset):
        self.dataset = dataset
        self.model: Optional[RandomForestRegressor] = None
        self.scaler: Optional[StandardScaler] = None
        self.feature_names = ['power', 'time_us', 'force_grams', 'temp_celsius']
        self.adjustments: List[ParamAdjustment] = []
    
    def train_model(self):
        X = []
        y = []
        
        for wafer in self.dataset.wafers.values():
            if not wafer.pull_tests or not wafer.bonding_params_list:
                continue
            
            for params in wafer.bonding_params_list:
                features = [
                    params.power,
                    params.time_us,
                    params.force_grams,
                    params.temp_celsius
                ]
                X.append(features)
                y.append(wafer.avg_pull_force)
        
        if len(X) < 10:
            return False
        
        X = np.array(X)
        y = np.array(y)
        
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        self.model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        self.model.fit(X_scaled, y)
        
        return True
    
    def predict_pull_force(self, params: Dict[str, float]) -> float:
        if self.model is None or self.scaler is None:
            return 0.0
        
        feature_vector = [
            params['power'],
            params['time_us'],
            params['force_grams'],
            params['temp_celsius']
        ]
        
        X_scaled = self.scaler.transform([feature_vector])
        return float(self.model.predict(X_scaled)[0])
    
    def get_param_adjustments(self, wafer: WaferData, 
                               process_window: Optional[ProcessWindow] = None) -> List[ParamAdjustment]:
        if process_window is None:
            process_window = self.dataset.process_windows.get(wafer.chip_model)
        
        if not wafer.bonding_params_list:
            return []
        
        if not self.model or not self.scaler:
            if not self.train_model():
                return []
        
        current_params = {
            'power': wafer.avg_power,
            'time_us': wafer.avg_time,
            'force_grams': wafer.avg_force,
            'temp_celsius': wafer.avg_temp
        }
        
        target_pull_force = wafer.avg_pull_force * 1.1
        
        adjustments = []
        
        for param_name in self.feature_names:
            if process_window:
                param_min = getattr(process_window, f'{param_name.split("_")[0]}_min', None)
                param_max = getattr(process_window, f'{param_name.split("_")[0]}_max', None)
                if param_min is None or param_max is None:
                    param_min = current_params[param_name] * 0.9
                    param_max = current_params[param_name] * 1.1
            else:
                param_min = current_params[param_name] * 0.9
                param_max = current_params[param_name] * 1.1
            
            best_value = current_params[param_name]
            best_improvement = 0.0
            
            for test_value in np.linspace(param_min, param_max, 20):
                test_params = current_params.copy()
                test_params[param_name] = test_value
                
                predicted = self.predict_pull_force(test_params)
                improvement = predicted - wafer.avg_pull_force
                
                if improvement > best_improvement:
                    best_improvement = improvement
                    best_value = test_value
            
            if abs(best_value - current_params[param_name]) > current_params[param_name] * 0.01:
                direction = "increase" if best_value > current_params[param_name] else "decrease"
                
                adjustments.append(ParamAdjustment(
                    param_name=param_name,
                    current_value=current_params[param_name],
                    suggested_value=float(best_value),
                    adjustment_direction=direction,
                    expected_improvement=float(best_improvement),
                    confidence=0.8
                ))
        
        self.adjustments = adjustments
        return adjustments
    
    def get_optimal_parameters(self, chip_model: str, 
                               process_window: Optional[ProcessWindow] = None) -> Dict[str, float]:
        if process_window is None:
            process_window = self.dataset.process_windows.get(chip_model)
        
        if not process_window:
            return {}
        
        if not self.model or not self.scaler:
            wafers = self.dataset.get_wafers_by_chip_model(chip_model)
            if wafers:
                high_perf = [w for w in wafers if w.avg_pull_force > np.mean([w.avg_pull_force for w in wafers])]
                if high_perf:
                    return {
                        'power': np.mean([w.avg_power for w in high_perf]),
                        'time_us': np.mean([w.avg_time for w in high_perf]),
                        'force_grams': np.mean([w.avg_force for w in high_perf]),
                        'temp_celsius': np.mean([w.avg_temp for w in high_perf])
                    }
            return {}
        
        best_params = {}
        best_predicted = 0.0
        
        for power in np.linspace(process_window.power_min, process_window.power_max, 10):
            for time in np.linspace(process_window.time_min, process_window.time_max, 10):
                for force in np.linspace(process_window.force_min, process_window.force_max, 10):
                    for temp in np.linspace(process_window.temp_min, process_window.temp_max, 5):
                        params = {
                            'power': power,
                            'time_us': time,
                            'force_grams': force,
                            'temp_celsius': temp
                        }
                        predicted = self.predict_pull_force(params)
                        if predicted > best_predicted:
                            best_predicted = predicted
                            best_params = params
        
        return best_params
    
    def get_feature_importance(self) -> Dict[str, float]:
        if self.model is None:
            return {}
        
        importance = self.model.feature_importances_
        return {name: float(imp) for name, imp in zip(self.feature_names, importance)}


def predict_adjustments(dataset: AnalysisDataset, wafer: WaferData) -> List[ParamAdjustment]:
    predictor = ParamPredictor(dataset)
    predictor.train_model()
    return predictor.get_param_adjustments(wafer)
