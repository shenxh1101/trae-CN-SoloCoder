import os
import json
import csv
from datetime import datetime
from typing import Dict, Optional, List, Any
from .models import AnalysisDataset, ProcessCheckResult, CorrelationResult, ClusterResult, MachineRanking


class ReportGenerator:
    def __init__(self, dataset: AnalysisDataset):
        self.dataset = dataset
    
    def generate_markdown_report(self, 
                                 check_results: Dict[str, ProcessCheckResult],
                                 correlation_results: List[CorrelationResult],
                                 cluster_results: List[ClusterResult],
                                 machine_rankings: List[MachineRanking],
                                 output_path: str) -> str:
        report_content = []
        
        report_content.append("# 焊线参数与连接可靠性复盘报告")
        report_content.append("")
        report_content.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_content.append(f"**分析晶圆总数**: {len(self.dataset.wafers)}")
        report_content.append("")
        
        report_content.append("## 1. 工艺检查摘要")
        report_content.append("")
        
        status_counts = {'PASS': 0, 'WARNING': 0, 'FAIL': 0}
        risk_counts = {'LOW': 0, 'MEDIUM': 0, 'HIGH': 0}
        
        for result in check_results.values():
            status_counts[result.overall_status] = status_counts.get(result.overall_status, 0) + 1
            risk_counts[result.risk_level] = risk_counts.get(result.risk_level, 0) + 1
        
        report_content.append(f"- **PASS**: {status_counts['PASS']} ({status_counts['PASS']/max(len(check_results),1)*100:.1f}%)")
        report_content.append(f"- **WARNING**: {status_counts['WARNING']} ({status_counts['WARNING']/max(len(check_results),1)*100:.1f}%)")
        report_content.append(f"- **FAIL**: {status_counts['FAIL']} ({status_counts['FAIL']/max(len(check_results),1)*100:.1f}%)")
        report_content.append("")
        report_content.append(f"- **低风险**: {risk_counts['LOW']}")
        report_content.append(f"- **中风险**: {risk_counts['MEDIUM']}")
        report_content.append(f"- **高风险**: {risk_counts['HIGH']}")
        report_content.append("")
        
        if risk_counts['HIGH'] > 0:
            high_risk_wafers = [wid for wid, res in check_results.items() if res.risk_level == "HIGH"]
            report_content.append("### 高风险晶圆列表")
            report_content.append("")
            for wid in high_risk_wafers:
                report_content.append(f"- {wid}")
            report_content.append("")
        
        report_content.append("## 2. 相关性分析")
        report_content.append("")
        
        for corr in correlation_results[:10]:
            report_content.append(f"### {corr.param_name}")
            report_content.append(f"- **相关系数**: {corr.correlation_coeff:.3f}")
            report_content.append(f"- **P值**: {corr.p_value:.4f} {corr.significance}")
            report_content.append(f"- **趋势**: {corr.trend}")
            report_content.append("")
        
        report_content.append("## 3. 聚类分析结果")
        report_content.append("")
        
        for cluster in cluster_results:
            report_content.append(f"### 聚类 {cluster.cluster_id}")
            report_content.append(f"- **大小**: {cluster.size} 片晶圆")
            report_content.append(f"- **主要失效模式**: {cluster.dominant_failure_mode.value}")
            report_content.append(f"- **风险等级**: {cluster.risk_level}")
            report_content.append(f"- **特征参数**:")
            for key, value in cluster.characteristic_params.items():
                report_content.append(f"  - {key}: {value:.3f}")
            report_content.append("")
        
        report_content.append("## 4. 机器维护优先级排名")
        report_content.append("")
        
        high_priority = [m for m in machine_rankings if m.maintenance_priority in ["CRITICAL", "HIGH"]]
        for rank in sorted(machine_rankings, key=lambda x: -x.score)[:10]:
            report_content.append(f"### {rank.machine_id}_{rank.station_id}")
            report_content.append(f"- **风险得分**: {rank.score:.1f}")
            report_content.append(f"- **维护优先级**: {rank.maintenance_priority}")
            report_content.append(f"- **平均拉力**: {rank.avg_pull_force:.2f}g")
            report_content.append(f"- **失效率**: {rank.failure_rate:.2%}")
            report_content.append(f"- **参数变异系数**: {rank.param_cv:.3f}")
            if rank.risk_factors:
                report_content.append(f"- **风险因素**: {', '.join(rank.risk_factors)}")
            report_content.append("")
        
        report_content.append("## 5. 跨芯片型号差异")
        report_content.append("")
        
        chip_models = set(w.chip_model for w in self.dataset.wafers.values())
        for model in chip_models:
            wafers = self.dataset.get_wafers_by_chip_model(model)
            if wafers:
                avg_pull = np.mean([w.avg_pull_force for w in wafers if w.pull_tests])
                avg_failure = np.mean([w.failure_rate for w in wafers if w.pull_tests])
                report_content.append(f"- **{model}**: {len(wafers)} 片, 平均拉力 {avg_pull:.2f}g, 失效率 {avg_failure:.2%}")
        
        report_content.append("")
        report_content.append("## 6. 金线批次过渡分析")
        report_content.append("")
        
        transition_wafers = self.dataset.get_transition_batches()
        if transition_wafers:
            report_content.append(f"检测到 {len(transition_wafers)} 片跨批次过渡晶圆:")
            for wafer in transition_wafers:
                wire_batches = set(bp.wire_batch for bp in wafer.bonding_params_list)
                report_content.append(f"- {wafer.wafer_id}: 金线批次 {', '.join(wire_batches)}")
        else:
            report_content.append("未检测到跨批次过渡情况")
        report_content.append("")
        
        report_content.append("## 附录")
        report_content.append("")
        report_content.append("*本报告由焊线参数与连接可靠性复盘系统自动生成*")
        
        full_content = "\n".join(report_content)
        
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(full_content)
        
        return output_path
    
    def generate_anomaly_csv(self, 
                             check_results: Dict[str, ProcessCheckResult],
                             output_path: str) -> str:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'wafer_id', 'overall_status', 'risk_level',
                'param_deviation_count', 'pull_force_anomaly_count',
                'station_inconsistency_count'
            ])
            
            for wafer_id, result in check_results.items():
                if result.overall_status != "PASS":
                    writer.writerow([
                        wafer_id,
                        result.overall_status,
                        result.risk_level,
                        len(result.param_deviations),
                        len(result.pull_force_anomalies),
                        len(result.station_inconsistencies)
                    ])
        
        return output_path
    
    def generate_heatmap_html(self, 
                              correlation_results: List[CorrelationResult],
                              output_path: str) -> str:
        html_content = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>焊线参数-拉力相关性热力图</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .container { max-width: 1200px; margin: 0 auto; }
        .chart-container { margin: 30px 0; }
        .corr-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .corr-table th, .corr-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .corr-table th { background-color: #f2f2f2; }
        .positive { background-color: #c8e6c9; }
        .negative { background-color: #ffcdd2; }
    </style>
</head>
<body>
    <div class="container">
        <h1>焊线参数-拉力相关性热力图</h1>
        <p>生成时间: """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """</p>
        
        <div class="chart-container">
            <canvas id="correlationChart"></canvas>
        </div>
        
        <h2>相关性详情表</h2>
        <table class="corr-table">
            <thead>
                <tr>
                    <th>参数</th>
                    <th>相关系数</th>
                    <th>P值</th>
                    <th>显著性</th>
                    <th>趋势</th>
                </tr>
            </thead>
            <tbody>
"""
        
        for corr in correlation_results:
            cell_class = "positive" if corr.correlation_coeff > 0 else "negative"
            html_content += f"""
                <tr class="{cell_class}">
                    <td>{corr.param_name}</td>
                    <td>{corr.correlation_coeff:.3f}</td>
                    <td>{corr.p_value:.4f}</td>
                    <td>{corr.significance}</td>
                    <td>{corr.trend}</td>
                </tr>
"""
        
        html_content += """
            </tbody>
        </table>
    </div>
    
    <script>
        const ctx = document.getElementById('correlationChart').getContext('2d');
        const correlations = """ + json.dumps([{
            'param': c.param_name,
            'coeff': c.correlation_coeff
        } for c in correlation_results]) + """;
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: correlations.map(c => c.param),
                datasets: [{
                    label: '相关系数',
                    data: correlations.map(c => c.coeff),
                    backgroundColor: correlations.map(c => 
                        c.coeff > 0 ? 'rgba(75, 192, 75, 0.7)' : 'rgba(255, 99, 132, 0.7)'
                    ),
                    borderColor: correlations.map(c => 
                        c.coeff > 0 ? 'rgba(75, 192, 75, 1)' : 'rgba(255, 99, 132, 1)'
                    ),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: '参数-拉力相关性系数' }
                },
                scales: {
                    y: { beginAtZero: true, max: 1, min: -1 }
                }
            }
        });
    </script>
</body>
</html>
"""
        
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return output_path


import numpy as np
