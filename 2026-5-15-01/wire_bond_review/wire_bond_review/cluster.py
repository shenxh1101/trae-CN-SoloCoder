import numpy as np
from typing import List, Dict
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from .models import AnalysisDataset, WaferData, ClusterResult, FailureMode


class ClusterAnalyzer:
    def __init__(self, dataset: AnalysisDataset):
        self.dataset = dataset
        self.results: List[ClusterResult] = []
    
    def cluster_by_failure_mode(self, n_clusters: int = 4) -> List[ClusterResult]:
        features = self._extract_features()
        if len(features) < n_clusters:
            return []
        
        feature_matrix = np.array([f['features'] for f in features])
        wafer_ids = [f['wafer_id'] for f in features]
        
        scaler = StandardScaler()
        scaled_features = scaler.fit_transform(feature_matrix)
        
        best_k = self._find_optimal_k(scaled_features, n_clusters)
        kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(scaled_features)
        
        self._create_cluster_results(labels, wafer_ids, feature_matrix)
        
        return self.results
    
    def _extract_features(self) -> List[Dict]:
        features = []
        
        for wafer_id, wafer in self.dataset.wafers.items():
            if not wafer.pull_tests or not wafer.bonding_params_list:
                continue
            
            failure_counts = {
                'ball_lift': 0,
                'wire_break': 0,
                'heel_break': 0,
                'pad_damage': 0,
                'no_failure': 0
            }
            
            for test in wafer.pull_tests:
                failure_counts[test.failure_mode.value] += 1
            
            total_tests = len(wafer.pull_tests)
            failure_rates = {k: v / total_tests for k, v in failure_counts.items()}
            
            feature_vector = [
                wafer.avg_pull_force,
                wafer.pull_force_std,
                wafer.avg_power,
                wafer.avg_time,
                wafer.avg_force,
                wafer.avg_temp,
                failure_rates['ball_lift'],
                failure_rates['wire_break'],
                failure_rates['heel_break'],
                failure_rates['pad_damage']
            ]
            
            if not any(np.isnan(v) for v in feature_vector):
                features.append({
                    'wafer_id': wafer_id,
                    'features': feature_vector,
                    'wafer': wafer
                })
        
        return features
    
    def _find_optimal_k(self, features: np.ndarray, max_k: int) -> int:
        if len(features) < 5:
            return 2
        
        best_score = -1
        best_k = 2
        
        for k in range(2, min(max_k + 1, len(features) - 1)):
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = kmeans.fit_predict(features)
            score = silhouette_score(features, labels)
            
            if score > best_score:
                best_score = score
                best_k = k
        
        return best_k
    
    def _create_cluster_results(self, labels: np.ndarray, wafer_ids: List[str], 
                                feature_matrix: np.ndarray):
        unique_labels = set(labels)
        
        for label in unique_labels:
            if label == -1:
                continue
            
            mask = labels == label
            cluster_wafer_ids = [wid for wid, m in zip(wafer_ids, mask) if m]
            cluster_features = feature_matrix[mask]
            
            characteristic_params = {
                'avg_pull_force': float(np.mean(cluster_features[:, 0])),
                'pull_force_std': float(np.mean(cluster_features[:, 1])),
                'avg_power': float(np.mean(cluster_features[:, 2])),
                'avg_time': float(np.mean(cluster_features[:, 3])),
                'avg_force': float(np.mean(cluster_features[:, 4])),
                'avg_temp': float(np.mean(cluster_features[:, 5])),
                'ball_lift_rate': float(np.mean(cluster_features[:, 6])),
                'wire_break_rate': float(np.mean(cluster_features[:, 7])),
                'heel_break_rate': float(np.mean(cluster_features[:, 8])),
                'pad_damage_rate': float(np.mean(cluster_features[:, 9]))
            }
            
            dominant_failure = self._get_dominant_failure_mode(characteristic_params)
            
            risk_level = self._calculate_risk_level(characteristic_params)
            
            self.results.append(ClusterResult(
                cluster_id=label,
                wafer_ids=cluster_wafer_ids,
                dominant_failure_mode=dominant_failure,
                characteristic_params=characteristic_params,
                size=len(cluster_wafer_ids),
                risk_level=risk_level
            ))
    
    def _get_dominant_failure_mode(self, params: Dict[str, float]) -> FailureMode:
        failure_rates = {
            FailureMode.BALL_LIFT: params['ball_lift_rate'],
            FailureMode.WIRE_BREAK: params['wire_break_rate'],
            FailureMode.HEEL_BREAK: params['heel_break_rate'],
            FailureMode.PAD_DAMAGE: params['pad_damage_rate'],
            FailureMode.NO_FAILURE: 1.0 - sum([
                params['ball_lift_rate'],
                params['wire_break_rate'],
                params['heel_break_rate'],
                params['pad_damage_rate']
            ])
        }
        
        return max(failure_rates, key=failure_rates.get)
    
    def _calculate_risk_level(self, params: Dict[str, float]) -> str:
        total_failure_rate = sum([
            params['ball_lift_rate'],
            params['wire_break_rate'],
            params['heel_break_rate'],
            params['pad_damage_rate']
        ])
        
        pull_force_std = params['pull_force_std']
        
        if total_failure_rate > 0.2 or pull_force_std > 2.0:
            return "HIGH"
        elif total_failure_rate > 0.1 or pull_force_std > 1.0:
            return "MEDIUM"
        else:
            return "LOW"
    
    def get_high_risk_clusters(self) -> List[ClusterResult]:
        return [c for c in self.results if c.risk_level == "HIGH"]
    
    def get_cluster_by_failure_mode(self, failure_mode: FailureMode) -> List[ClusterResult]:
        return [c for c in self.results if c.dominant_failure_mode == failure_mode]


def cluster_analysis(dataset: AnalysisDataset, n_clusters: int = 4) -> List[ClusterResult]:
    analyzer = ClusterAnalyzer(dataset)
    return analyzer.cluster_by_failure_mode(n_clusters)
