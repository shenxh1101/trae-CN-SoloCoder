"""完整流程集成测试和性能测试"""
import pytest
import time
import os
import tempfile
import numpy as np
import pandas as pd
from datetime import datetime, timedelta


def generate_large_test_data(num_wafers=1000, output_dir=None):
    """生成大规模测试数据用于性能测试"""
    if output_dir is None:
        output_dir = tempfile.mkdtemp()
    
    bonding_params = []
    pull_tests = []
    wafer_ids = [f"W{i:04d}" for i in range(num_wafers)]
    chip_models = ["CHIP_A", "CHIP_B", "CHIP_C"]
    machines = ["M01", "M02", "M03"]
    stations = ["S01", "S02"]
    shifts = ["morning", "afternoon", "night"]
    wire_batches = [f"WIRE_{i:03d}" for i in range(10)]
    package_types = ["standard", "stacked", "sip"]
    failure_modes = ["no_failure", "ball_lift", "wire_break", "heel_break", "pad_damage"]
    
    base_time = datetime(2024, 1, 1)
    
    for i, wafer_id in enumerate(wafer_ids):
        chip_model = chip_models[i % len(chip_models)]
        machine = machines[i % len(machines)]
        station = stations[i % len(stations)]
        shift = shifts[i % len(shifts)]
        wire_batch = wire_batches[i % len(wire_batches)]
        package_type = package_types[i % len(package_types)]
        
        num_bonds = 2 + (i % 3)
        
        for j in range(num_bonds):
            timestamp = base_time + timedelta(hours=i, minutes=j)
            
            if chip_model == "CHIP_A":
                power = 150 + np.random.normal(0, 5)
                time_us = 25 + np.random.normal(0, 2)
                force = 50 + np.random.normal(0, 3)
                temp = 180 + np.random.normal(0, 5)
            elif chip_model == "CHIP_B":
                power = 160 + np.random.normal(0, 6)
                time_us = 30 + np.random.normal(0, 3)
                force = 60 + np.random.normal(0, 4)
                temp = 190 + np.random.normal(0, 6)
            else:
                power = 180 + np.random.normal(0, 8)
                time_us = 40 + np.random.normal(0, 4)
                force = 75 + np.random.normal(0, 5)
                temp = 200 + np.random.normal(0, 7)
            
            bonding_params.append({
                "wafer_id": wafer_id,
                "chip_model": chip_model,
                "machine_id": machine,
                "station_id": station,
                "operator": f"Op{i}",
                "shift": shift,
                "batch_id": f"BATCH_{i//10:03d}",
                "wire_batch": wire_batch,
                "package_type": package_type,
                "timestamp": timestamp.isoformat(),
                "power": round(power, 1),
                "time_us": round(time_us, 1),
                "force_grams": round(force, 1),
                "temp_celsius": round(temp, 1),
                "is_ramping": i < 50,
                "cleanliness_level": 5 + (i % 5),
                "tool_wear_hours": 100 + (i % 50)
            })
        
        num_tests = 3 + (i % 3)
        for j in range(num_tests):
            test_timestamp = base_time + timedelta(hours=i, minutes=num_bonds + j)
            
            if i < num_wafers * 0.1:
                pull_force = 4 + np.random.normal(0, 0.5)
                failure_idx = 1 + (j % 4)
            elif i < num_wafers * 0.2:
                pull_force = 6 + np.random.normal(0, 0.5)
                failure_idx = j % 2
            else:
                pull_force = 8 + np.random.normal(0, 0.5)
                failure_idx = 0
            
            pull_tests.append({
                "wafer_id": wafer_id,
                "test_id": f"T{i:04d}_{j:02d}",
                "wire_id": f"{wafer_id}_{j:02d}",
                "pull_force_grams": round(max(2.0, pull_force), 1),
                "failure_mode": failure_modes[failure_idx],
                "is_sampling": False,
                "test_timestamp": test_timestamp.isoformat()
            })
    
    bonding_df = pd.DataFrame(bonding_params)
    pull_df = pd.DataFrame(pull_tests)
    
    bonding_path = os.path.join(output_dir, "large_bonding_params.csv")
    pull_path = os.path.join(output_dir, "large_pull_tests.csv")
    
    bonding_df.to_csv(bonding_path, index=False)
    pull_df.to_csv(pull_path, index=False)
    
    return bonding_path, pull_path, output_dir


class TestPerformance:
    """性能测试类"""
    
    def test_100_wafers_performance(self):
        """测试100晶圆处理性能"""
        bonding_path, pull_path, temp_dir = generate_large_test_data(100)
        
        start_time = time.time()
        
        from wire_bond_review.parser import load_dataset
        dataset = load_dataset(bonding_path, pull_path)
        
        from wire_bond_review.checker import ProcessChecker
        checker = ProcessChecker(dataset)
        checker.check_all()
        
        from wire_bond_review.correlation import CorrelationAnalyzer
        corr = CorrelationAnalyzer(dataset)
        corr.analyze_all()
        
        elapsed = time.time() - start_time
        
        assert elapsed < 10, f"100晶圆处理耗时 {elapsed:.2f}秒，超过预期10秒"
        print(f"100晶圆处理耗时: {elapsed:.2f}秒")
    
    def test_500_wafers_performance(self):
        """测试500晶圆处理性能"""
        bonding_path, pull_path, temp_dir = generate_large_test_data(500)
        
        start_time = time.time()
        
        from wire_bond_review.parser import load_dataset
        dataset = load_dataset(bonding_path, pull_path)
        
        from wire_bond_review.checker import ProcessChecker
        checker = ProcessChecker(dataset)
        checker.check_all()
        
        from wire_bond_review.correlation import CorrelationAnalyzer
        corr = CorrelationAnalyzer(dataset)
        corr.analyze_all()
        
        elapsed = time.time() - start_time
        
        assert elapsed < 20, f"500晶圆处理耗时 {elapsed:.2f}秒，超过预期20秒"
        print(f"500晶圆处理耗时: {elapsed:.2f}秒")


class TestFullFlow:
    """完整流程集成测试"""
    
    def test_complete_analysis_flow(self, temp_csv_dir):
        """测试完整分析流程"""
        from wire_bond_review.parser import load_dataset
        
        sample_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample")
        bonding_path = os.path.join(sample_dir, "bonding_params.csv")
        pull_path = os.path.join(sample_dir, "pull_tests.csv")
        machine_path = os.path.join(sample_dir, "machine_profiles.csv")
        window_path = os.path.join(sample_dir, "process_windows.csv")
        
        assert os.path.exists(bonding_path), "示例焊线参数文件不存在"
        assert os.path.exists(pull_path), "示例拉力测试文件不存在"
        assert os.path.exists(machine_path), "示例机器档案文件不存在"
        assert os.path.exists(window_path), "示例工艺窗口文件不存在"
        
        start_time = time.time()
        
        dataset = load_dataset(bonding_path, pull_path, machine_path, window_path)
        
        load_time = time.time() - start_time
        print(f"数据加载耗时: {load_time:.3f}秒")
        
        assert len(dataset.wafers) > 0, "晶圆数据为空"
        assert len(dataset.machine_profiles) > 0, "机器档案为空"
        assert len(dataset.process_windows) > 0, "工艺窗口为空"
        
        from wire_bond_review.checker import ProcessChecker
        checker = ProcessChecker(dataset)
        check_results = checker.check_all()
        
        check_time = time.time() - start_time - load_time
        print(f"工艺检查耗时: {check_time:.3f}秒")
        
        assert len(check_results) == len(dataset.wafers), "检查结果数量不匹配"
        
        stats = checker.get_summary_statistics()
        assert "total_wafers" in stats
        assert "mean_pull_force" in stats
        
        from wire_bond_review.correlation import CorrelationAnalyzer
        corr_analyzer = CorrelationAnalyzer(dataset)
        corr_results = corr_analyzer.analyze_all()
        
        corr_time = time.time() - start_time - load_time - check_time
        print(f"相关性分析耗时: {corr_time:.3f}秒")
        
        assert len(corr_results) >= 0
        
        corr_matrix = corr_analyzer.get_correlation_matrix()
        assert isinstance(corr_matrix, dict)
        
        from wire_bond_review.cluster import ClusterAnalyzer
        cluster_analyzer = ClusterAnalyzer(dataset)
        cluster_results = cluster_analyzer.cluster_by_failure_mode(n_clusters=3)
        
        cluster_time = time.time() - start_time - load_time - check_time - corr_time
        print(f"聚类分析耗时: {cluster_time:.3f}秒")
        
        assert isinstance(cluster_results, list)
        
        high_risk = cluster_analyzer.get_high_risk_clusters()
        assert isinstance(high_risk, list)
        
        from wire_bond_review.predictor import ParamPredictor
        predictor = ParamPredictor(dataset)
        predictor.train_model()
        
        predict_time = time.time() - start_time - load_time - check_time - corr_time - cluster_time
        print(f"预测模型训练耗时: {predict_time:.3f}秒")
        
        wafer = list(dataset.wafers.values())[0]
        adjustments = predictor.get_param_adjustments(wafer)
        assert isinstance(adjustments, list)
        
        feature_importance = predictor.get_feature_importance()
        assert isinstance(feature_importance, dict)
        
        from wire_bond_review.ranker import MachineRanker
        ranker = MachineRanker(dataset)
        rankings = ranker.rank_machines()
        
        rank_time = time.time() - start_time - load_time - check_time - corr_time - cluster_time - predict_time
        print(f"机器排名耗时: {rank_time:.3f}秒")
        
        assert isinstance(rankings, list)
        
        critical = ranker.get_critical_machines()
        assert isinstance(critical, list)
        
        from wire_bond_review.reporter import ReportGenerator
        reporter = ReportGenerator(dataset)
        
        md_path = os.path.join(temp_csv_dir, "report.md")
        reporter.generate_markdown_report(check_results, corr_results, cluster_results, rankings, md_path)
        
        assert os.path.exists(md_path), "Markdown报告未生成"
        assert os.path.getsize(md_path) > 0, "Markdown报告为空"
        
        csv_path = os.path.join(temp_csv_dir, "anomalies.csv")
        reporter.generate_anomaly_csv(check_results, csv_path)
        
        assert os.path.exists(csv_path), "异常CSV未生成"
        
        html_path = os.path.join(temp_csv_dir, "correlation.html")
        reporter.generate_heatmap_html(corr_results, html_path)
        
        assert os.path.exists(html_path), "相关性热力图未生成"
        assert os.path.getsize(html_path) > 0, "HTML报告为空"
        
        total_time = time.time() - start_time
        print(f"完整分析流程总耗时: {total_time:.3f}秒")
        
        assert total_time < 60, f"完整流程耗时过长: {total_time:.2f}秒"


if __name__ == "__main__":
    print("=" * 60)
    print("焊线参数与连接可靠性复盘工具 - 性能测试")
    print("=" * 60)
    print()
    
    print("生成测试数据...")
    bonding_path, pull_path, temp_dir = generate_large_test_data(1000)
    print(f"测试数据已生成: {temp_dir}")
    print()
    
    start_time = time.time()
    
    print("步骤 1/6: 加载数据...")
    t1 = time.time()
    from wire_bond_review.parser import load_dataset
    dataset = load_dataset(bonding_path, pull_path)
    print(f"  完成 - 加载 {len(dataset.wafers)} 晶圆, 耗时: {time.time() - t1:.2f}s")
    print()
    
    print("步骤 2/6: 工艺检查...")
    t2 = time.time()
    from wire_bond_review.checker import ProcessChecker
    checker = ProcessChecker(dataset)
    check_results = checker.check_all()
    stats = checker.get_summary_statistics()
    print(f"  完成 - PASS: {stats['pass_count']}, WARNING: {stats['warning_count']}, FAIL: {stats['fail_count']}, 耗时: {time.time() - t2:.2f}s")
    print()
    
    print("步骤 3/6: 相关性分析...")
    t3 = time.time()
    from wire_bond_review.correlation import CorrelationAnalyzer
    corr_analyzer = CorrelationAnalyzer(dataset)
    corr_results = corr_analyzer.analyze_all()
    print(f"  完成 - 发现 {len(corr_results)} 项相关性, 耗时: {time.time() - t3:.2f}s")
    print()
    
    print("步骤 4/6: 聚类分析...")
    t4 = time.time()
    from wire_bond_review.cluster import ClusterAnalyzer
    cluster_analyzer = ClusterAnalyzer(dataset)
    cluster_results = cluster_analyzer.cluster_by_failure_mode(n_clusters=4)
    print(f"  完成 - 生成 {len(cluster_results)} 个聚类, 耗时: {time.time() - t4:.2f}s")
    print()
    
    print("步骤 5/6: 参数预测...")
    t5 = time.time()
    from wire_bond_review.predictor import ParamPredictor
    predictor = ParamPredictor(dataset)
    predictor.train_model()
    print(f"  完成 - 模型训练完成, 耗时: {time.time() - t5:.2f}s")
    print()
    
    print("步骤 6/6: 机器排名...")
    t6 = time.time()
    from wire_bond_review.ranker import MachineRanker
    ranker = MachineRanker(dataset)
    rankings = ranker.rank_machines()
    print(f"  完成 - 排名 {len(rankings)} 台机器, 耗时: {time.time() - t6:.2f}s")
    print()
    
    total_time = time.time() - start_time
    print("=" * 60)
    print(f"1000 晶圆总处理时间: {total_time:.2f} 秒")
    print(f"性能目标: < 30 秒 - {'✓ 通过' if total_time < 30 else '✗ 未通过'}")
    print("=" * 60)
