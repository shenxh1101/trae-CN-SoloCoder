import click
import os
import sys
from datetime import datetime
from typing import Optional

from .parser import load_dataset
from .checker import ProcessChecker, check_process
from .correlation import CorrelationAnalyzer, analyze_correlations
from .cluster import ClusterAnalyzer, cluster_analysis
from .predictor import ParamPredictor, predict_adjustments
from .ranker import MachineRanker, rank_machines
from .reporter import ReportGenerator


@click.group()
@click.version_option(version="1.0.0", prog_name="wire-bond-review")
def cli():
    """焊线参数与连接可靠性复盘工具"""
    pass


@cli.command()
@click.argument('bonding_params_csv', type=click.Path(exists=True))
@click.argument('pull_tests_csv', type=click.Path(exists=True))
@click.option('--machine-profiles', '-m', type=click.Path(exists=True), help='机器档案CSV路径')
@click.option('--process-windows', '-p', type=click.Path(exists=True), help='工艺窗口CSV路径')
@click.option('--output', '-o', type=click.Path(), help='输出数据集路径')
@click.option('--verbose', '-v', is_flag=True, help='显示详细信息')
def import_data(bonding_params_csv, pull_tests_csv, machine_profiles, process_windows, output, verbose):
    """导入焊线参数与拉力测试数据"""
    try:
        click.echo(f"正在导入数据...")
        click.echo(f"  焊线参数: {bonding_params_csv}")
        click.echo(f"  拉力测试: {pull_tests_csv}")
        
        dataset = load_dataset(
            bonding_params_csv,
            pull_tests_csv,
            machine_profiles,
            process_windows
        )
        
        click.echo(f"\n数据导入成功!")
        click.echo(f"  晶圆总数: {len(dataset.wafers)}")
        click.echo(f"  芯片型号数: {len(set(w.chip_model for w in dataset.wafers.values()))}")
        
        if dataset.machine_profiles:
            click.echo(f"  机器档案数: {len(dataset.machine_profiles)}")
        
        if dataset.process_windows:
            click.echo(f"  工艺窗口数: {len(dataset.process_windows)}")
        
        if output:
            import pickle
            with open(output, 'wb') as f:
                pickle.dump(dataset, f)
            click.echo(f"\n数据集已保存到: {output}")
        
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('dataset_path', type=click.Path(exists=True))
@click.option('--wafer-id', '-w', help='指定晶圆ID检查')
@click.option('--output', '-o', type=click.Path(), help='输出结果JSON路径')
@click.option('--verbose', '-v', is_flag=True, help='显示详细信息')
def check(dataset_path, wafer_id, output, verbose):
    """检查参数偏离工艺窗口、拉力分布、跨工位一致性"""
    try:
        import pickle
        with open(dataset_path, 'rb') as f:
            dataset = pickle.load(f)
        
        click.echo("正在进行工艺检查...")
        
        checker = ProcessChecker(dataset)
        results = checker.check_all()
        
        stats = checker.get_summary_statistics()
        
        click.echo("\n工艺检查摘要:")
        click.echo(f"  总晶圆数: {stats['total_wafers']}")
        click.echo(f"  PASS: {stats['pass_count']} ({stats['pass_count']/stats['total_wafers']*100:.1f}%)")
        click.echo(f"  WARNING: {stats['warning_count']} ({stats['warning_count']/stats['total_wafers']*100:.1f}%)")
        click.echo(f"  FAIL: {stats['fail_count']} ({stats['fail_count']/stats['total_wafers']*100:.1f}%)")
        click.echo(f"\n  平均拉力: {stats['mean_pull_force']:.2f}g")
        click.echo(f"  拉力标准差: {stats['std_pull_force']:.2f}g")
        click.echo(f"  Cpk: {stats['cpk']:.2f}")
        
        high_risk = checker.get_high_risk_wafers()
        if high_risk:
            click.echo(f"\n高风险晶圆 ({len(high_risk)} 片):")
            for wid in high_risk[:5]:
                click.echo(f"  - {wid}")
            if len(high_risk) > 5:
                click.echo(f"  ... 还有 {len(high_risk) - 5} 片")
        
        if wafer_id and wafer_id in results:
            result = results[wafer_id]
            click.echo(f"\n晶圆 {wafer_id} 详细结果:")
            click.echo(f"  状态: {result.overall_status}")
            click.echo(f"  风险等级: {result.risk_level}")
            if result.param_deviations:
                click.echo(f"  参数偏离: {len(result.param_deviations)} 处")
            if result.pull_force_anomalies:
                click.echo(f"  拉力异常: {len(result.pull_force_anomalies)} 处")
            if result.station_inconsistencies:
                click.echo(f"  工位不一致: {len(result.station_inconsistencies)} 处")
        
        if output:
            import json
            with open(output, 'w') as f:
                json.dump({
                    'summary': stats,
                    'results': {wid: {
                        'overall_status': res.overall_status,
                        'risk_level': res.risk_level,
                        'param_deviations': len(res.param_deviations),
                        'pull_anomalies': len(res.pull_force_anomalies),
                        'station_issues': len(res.station_inconsistencies)
                    } for wid, res in results.items()}
                }, f, indent=2)
            click.echo(f"\n结果已保存到: {output}")
        
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.argument('dataset_path', type=click.Path(exists=True))
@click.option('--chip-model', '-c', help='指定芯片型号分析')
@click.option('--output', '-o', type=click.Path(), help='输出结果JSON路径')
def corr(dataset_path, chip_model, output):
    """分析参数与拉力的相关性"""
    try:
        import pickle
        with open(dataset_path, 'rb') as f:
            dataset = pickle.load(f)
        
        click.echo("正在进行相关性分析...")
        
        analyzer = CorrelationAnalyzer(dataset)
        results = analyzer.analyze_all()
        
        click.echo(f"\n相关性分析结果 (共 {len(results)} 项):")
        click.echo("")
        
        for result in sorted(results, key=lambda x: abs(x.correlation_coeff), reverse=True)[:10]:
            sign = "++" if result.correlation_coeff > 0.5 else "+" if result.correlation_coeff > 0 else "-"
            click.echo(f"{sign:2} {result.param_name:30} r={result.correlation_coeff:+.3f} p={result.p_value:.4f} {result.significance}")
        
        significant = analyzer.get_significant_correlations()
        if significant:
            click.echo(f"\n显著相关项 (p<0.05): {len(significant)} 项")
        
        if output:
            import json
            with open(output, 'w') as f:
                json.dump([{
                    'param_name': r.param_name,
                    'correlation_coeff': r.correlation_coeff,
                    'p_value': r.p_value,
                    'significance': r.significance,
                    'trend': r.trend
                } for r in results], f, indent=2)
            click.echo(f"\n结果已保存到: {output}")
        
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('dataset_path', type=click.Path(exists=True))
@click.option('--n-clusters', '-n', default=4, type=int, help='聚类数量')
@click.option('--output', '-o', type=click.Path(), help='输出结果JSON路径')
def cluster(dataset_path, n_clusters, output):
    """按失效模式聚类"""
    try:
        import pickle
        with open(dataset_path, 'rb') as f:
            dataset = pickle.load(f)
        
        click.echo(f"正在进行聚类分析 (n={n_clusters})...")
        
        analyzer = ClusterAnalyzer(dataset)
        results = analyzer.cluster_by_failure_mode(n_clusters)
        
        click.echo(f"\n聚类分析结果 (共 {len(results)} 个聚类):")
        click.echo("")
        
        for cluster in results:
            risk_color = "red" if cluster.risk_level == "HIGH" else "yellow" if cluster.risk_level == "MEDIUM" else "green"
            click.echo(f"聚类 {cluster.cluster_id}:")
            click.echo(f"  大小: {cluster.size} 片晶圆")
            click.echo(f"  主要失效模式: {cluster.dominant_failure_mode.value}")
            click.echo(f"  风险等级: {cluster.risk_level}")
            click.echo(f"  平均拉力: {cluster.characteristic_params.get('avg_pull_force', 0):.2f}g")
            click.echo("")
        
        high_risk = analyzer.get_high_risk_clusters()
        if high_risk:
            click.echo(f"高风险聚类: {len(high_risk)} 个")
        
        if output:
            import json
            with open(output, 'w') as f:
                json.dump([{
                    'cluster_id': c.cluster_id,
                    'size': c.size,
                    'dominant_failure_mode': c.dominant_failure_mode.value,
                    'risk_level': c.risk_level,
                    'characteristic_params': c.characteristic_params,
                    'wafer_ids': c.wafer_ids
                } for c in results], f, indent=2)
            click.echo(f"\n结果已保存到: {output}")
        
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('dataset_path', type=click.Path(exists=True))
@click.option('--wafer-id', '-w', help='指定晶圆ID获取建议')
@click.option('--output', '-o', type=click.Path(), help='输出结果JSON路径')
def predict(dataset_path, wafer_id, output):
    """给出参数调整建议"""
    try:
        import pickle
        with open(dataset_path, 'rb') as f:
            dataset = pickle.load(f)
        
        click.echo("正在生成参数调整建议...")
        
        predictor = ParamPredictor(dataset)
        predictor.train_model()
        
        feature_importance = predictor.get_feature_importance()
        if feature_importance:
            click.echo("\n参数重要性排序:")
            for param, importance in sorted(feature_importance.items(), key=lambda x: -x[1]):
                click.echo(f"  {param:15} {importance:.3f}")
        
        if wafer_id:
            wafer = dataset.get_wafer(wafer_id)
            if wafer:
                adjustments = predictor.get_param_adjustments(wafer)
                click.echo(f"\n晶圆 {wafer_id} 参数调整建议:")
                for adj in adjustments:
                    arrow = "↑" if adj.adjustment_direction == "increase" else "↓"
                    click.echo(f"  {adj.param_name:15} {adj.current_value:.2f} -> {adj.suggested_value:.2f} {arrow}")
                    click.echo(f"    预期提升: {adj.expected_improvement:+.2f}g (置信度: {adj.confidence:.0%})")
            else:
                click.echo(f"未找到晶圆: {wafer_id}")
        else:
            click.echo("\n各芯片型号最优参数:")
            chip_models = set(w.chip_model for w in dataset.wafers.values())
            for model in chip_models:
                optimal = predictor.get_optimal_parameters(model)
                if optimal:
                    click.echo(f"\n  {model}:")
                    for param, value in optimal.items():
                        click.echo(f"    {param:15} {value:.2f}")
        
        if output:
            import json
            with open(output, 'w') as f:
                json.dump({
                    'feature_importance': feature_importance,
                    'optimal_parameters': {
                        model: predictor.get_optimal_parameters(model)
                        for model in set(w.chip_model for w in dataset.wafers.values())
                    }
                }, f, indent=2)
            click.echo(f"\n结果已保存到: {output}")
        
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.argument('dataset_path', type=click.Path(exists=True))
@click.option('--top', '-t', default=10, type=int, help='显示前N台机器')
@click.option('--output', '-o', type=click.Path(), help='输出结果JSON路径')
def rank(dataset_path, top, output):
    """给重点维护机器排序"""
    try:
        import pickle
        with open(dataset_path, 'rb') as f:
            dataset = pickle.load(f)
        
        click.echo("正在进行机器维护优先级排名...")
        
        rankings = rank_machines(dataset)
        
        click.echo(f"\n机器维护优先级排名 (共 {len(rankings)} 台):")
        click.echo("")
        
        for i, rank in enumerate(sorted(rankings, key=lambda x: -x.score)[:top]):
            priority_colors = {
                "CRITICAL": "red",
                "HIGH": "yellow",
                "MEDIUM": "cyan",
                "LOW": "green"
            }
            click.echo(f"{i+1:2}. {rank.machine_id}_{rank.station_id:10} 得分: {rank.score:.1f} 优先级: {rank.maintenance_priority}")
            click.echo(f"    平均拉力: {rank.avg_pull_force:.2f}g 失效率: {rank.failure_rate:.2%} 参数CV: {rank.param_cv:.3f}")
            if rank.risk_factors:
                click.echo(f"    风险因素: {', '.join(rank.risk_factors)}")
            click.echo("")
        
        critical = [r for r in rankings if r.maintenance_priority == "CRITICAL"]
        high = [r for r in rankings if r.maintenance_priority == "HIGH"]
        
        click.echo(f"需要立即维护: {len(critical)} 台")
        click.echo(f"需要优先维护: {len(high)} 台")
        
        if output:
            import json
            with open(output, 'w') as f:
                json.dump([{
                    'machine_id': r.machine_id,
                    'station_id': r.station_id,
                    'score': r.score,
                    'maintenance_priority': r.maintenance_priority,
                    'risk_factors': r.risk_factors,
                    'avg_pull_force': r.avg_pull_force,
                    'failure_rate': r.failure_rate,
                    'param_cv': r.param_cv
                } for r in rankings], f, indent=2)
            click.echo(f"\n结果已保存到: {output}")
        
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('dataset_path', type=click.Path(exists=True))
@click.option('--markdown', '-m', type=click.Path(), help='Markdown报告输出路径')
@click.option('--csv', '-c', type=click.Path(), help='异常晶圆CSV输出路径')
@click.option('--html', '-t', type=click.Path(), help='相关性热力图HTML输出路径')
@click.option('--prefix', '-p', help='输出文件前缀')
def export(dataset_path, markdown, csv, html, prefix):
    """导出 Markdown 月度复盘报告、CSV 异常台账和参数-拉力热力 HTML"""
    try:
        import pickle
        with open(dataset_path, 'rb') as f:
            dataset = pickle.load(f)
        
        click.echo("正在导出报告...")
        
        checker = ProcessChecker(dataset)
        check_results = checker.check_all()
        
        analyzer = CorrelationAnalyzer(dataset)
        corr_results = analyzer.analyze_all()
        
        cluster_analyzer = ClusterAnalyzer(dataset)
        cluster_results = cluster_analyzer.cluster_by_failure_mode()
        
        machine_rankings = rank_machines(dataset)
        
        reporter = ReportGenerator(dataset)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_prefix = prefix or f"wire_bond_report_{timestamp}"
        
        if markdown or (not csv and not html):
            md_path = markdown or f"{output_prefix}.md"
            reporter.generate_markdown_report(check_results, corr_results, cluster_results, machine_rankings, md_path)
            click.echo(f"  Markdown报告: {md_path}")
        
        if csv or (not markdown and not html):
            csv_path = csv or f"{output_prefix}_anomalies.csv"
            reporter.generate_anomaly_csv(check_results, csv_path)
            click.echo(f"  异常晶圆CSV: {csv_path}")
        
        if html or (not markdown and not csv):
            html_path = html or f"{output_prefix}_correlation.html"
            reporter.generate_heatmap_html(corr_results, html_path)
            click.echo(f"  相关性热力图: {html_path}")
        
        click.echo("\n报告导出完成!")
        
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.argument('bonding_params_csv', type=click.Path(exists=True))
@click.argument('pull_tests_csv', type=click.Path(exists=True))
@click.option('--machine-profiles', '-m', type=click.Path(exists=True))
@click.option('--process-windows', '-p', type=click.Path(exists=True))
@click.option('--output-dir', '-o', type=click.Path(), default='.')
def full_analysis(bonding_params_csv, pull_tests_csv, machine_profiles, process_windows, output_dir):
    """执行完整分析流程: 导入->检查->相关性->聚类->预测->排名->导出"""
    try:
        click.echo("=" * 60)
        click.echo("焊线参数与连接可靠性完整复盘分析")
        click.echo("=" * 60)
        click.echo("")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        click.echo("步骤 1/7: 导入数据...")
        dataset = load_dataset(bonding_params_csv, pull_tests_csv, machine_profiles, process_windows)
        click.echo(f"  ✓ 成功导入 {len(dataset.wafers)} 片晶圆数据")
        click.echo("")
        
        click.echo("步骤 2/7: 工艺检查...")
        checker = ProcessChecker(dataset)
        check_results = checker.check_all()
        stats = checker.get_summary_statistics()
        click.echo(f"  ✓ PASS: {stats['pass_count']}, WARNING: {stats['warning_count']}, FAIL: {stats['fail_count']}")
        click.echo("")
        
        click.echo("步骤 3/7: 相关性分析...")
        analyzer = CorrelationAnalyzer(dataset)
        corr_results = analyzer.analyze_all()
        click.echo(f"  ✓ 发现 {len(corr_results)} 项相关性")
        click.echo("")
        
        click.echo("步骤 4/7: 聚类分析...")
        cluster_analyzer = ClusterAnalyzer(dataset)
        cluster_results = cluster_analyzer.cluster_by_failure_mode()
        click.echo(f"  ✓ 生成 {len(cluster_results)} 个聚类")
        click.echo("")
        
        click.echo("步骤 5/7: 参数预测...")
        predictor = ParamPredictor(dataset)
        predictor.train_model()
        click.echo(f"  ✓ 参数预测模型训练完成")
        click.echo("")
        
        click.echo("步骤 6/7: 机器排名...")
        machine_rankings = rank_machines(dataset)
        click.echo(f"  ✓ 完成 {len(machine_rankings)} 台机器排名")
        click.echo("")
        
        click.echo("步骤 7/7: 导出报告...")
        reporter = ReportGenerator(dataset)
        
        prefix = os.path.join(output_dir, f"wire_bond_review_{timestamp}")
        
        md_path = f"{prefix}_report.md"
        reporter.generate_markdown_report(check_results, corr_results, cluster_results, machine_rankings, md_path)
        click.echo(f"  ✓ Markdown报告: {md_path}")
        
        csv_path = f"{prefix}_anomalies.csv"
        reporter.generate_anomaly_csv(check_results, csv_path)
        click.echo(f"  ✓ 异常台账: {csv_path}")
        
        html_path = f"{prefix}_correlation.html"
        reporter.generate_heatmap_html(corr_results, html_path)
        click.echo(f"  ✓ 热力图: {html_path}")
        
        dataset_path = f"{prefix}_dataset.pkl"
        import pickle
        os.makedirs(os.path.dirname(os.path.abspath(dataset_path)), exist_ok=True)
        with open(dataset_path, 'wb') as f:
            pickle.dump(dataset, f)
        click.echo(f"  ✓ 数据集: {dataset_path}")
        
        click.echo("")
        click.echo("=" * 60)
        click.echo("分析完成! 请查看生成的报告文件。")
        click.echo("=" * 60)
        
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    cli()
