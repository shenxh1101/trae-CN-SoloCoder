import os
import json
from datetime import datetime

from sysmon.storage import parse_csv_data, get_csv_filename, filter_by_time_range, list_csv_files
from sysmon.report import compute_stats


def generate_html(stats, data, output_path, title="系统资源使用报告"):
    timestamps = json.dumps([d.get("timestamp", "") for d in data])
    cpu_totals = json.dumps([round(float(d.get("cpu_total", 0)), 2) for d in data])
    mem_percents = json.dumps([round(float(d.get("mem_percent", 0)), 2) for d in data])
    swap_percents = json.dumps([round(float(d.get("swap_percent", 0)), 2) for d in data])
    net_ups = json.dumps([round(float(d.get("net_upload_bytes_per_sec", 0)), 2) for d in data])
    net_downs = json.dumps([round(float(d.get("net_download_bytes_per_sec", 0)), 2) for d in data])

    disk_datasets = []
    disk_keys = set()
    for d in data:
        for k in d.keys():
            if k.startswith("disk_") and k.endswith("_percent"):
                disk_keys.add(k.replace("_percent", ""))
    for dk in sorted(disk_keys):
        values = [round(float(d.get(f"{dk}_percent", 0)), 2) for d in data]
        disk_datasets.append({"label": dk, "data": json.dumps(values)})

    cpu_core_datasets = []
    core_idx = 0
    while data and f"cpu_core_{core_idx}" in data[0]:
        values = [round(float(d.get(f"cpu_core_{core_idx}", 0)), 2) for d in data]
        cpu_core_datasets.append({"label": f"核心{core_idx}", "data": json.dumps(values)})
        core_idx += 1

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }}
  h1 {{ text-align: center; margin: 20px 0; color: #38bdf8; font-size: 2em; }}
  h2 {{ color: #94a3b8; margin: 30px 0 15px; border-bottom: 1px solid #1e293b; padding-bottom: 8px; }}
  .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }}
  .stat-card {{ background: #1e293b; border-radius: 12px; padding: 20px; text-align: center; }}
  .stat-card .value {{ font-size: 2em; font-weight: bold; color: #38bdf8; }}
  .stat-card .label {{ color: #94a3b8; margin-top: 5px; font-size: 0.9em; }}
  .chart-container {{ background: #1e293b; border-radius: 12px; padding: 20px; margin: 15px 0; }}
  .chart-container canvas {{ max-height: 350px; }}
  .footer {{ text-align: center; color: #475569; margin-top: 40px; padding: 20px; }}
</style>
</head>
<body>
<h1>{title}</h1>

<div class="stats-grid">
  <div class="stat-card"><div class="value">{stats['total_records']}</div><div class="label">记录总数</div></div>
  <div class="stat-card"><div class="value">{stats['cpu']['avg']}%</div><div class="label">平均CPU</div></div>
  <div class="stat-card"><div class="value">{stats['cpu']['max']}%</div><div class="label">最大CPU</div></div>
  <div class="stat-card"><div class="value">{stats['memory']['max']}%</div><div class="label">最大内存</div></div>
  <div class="stat-card"><div class="value">{_fmt_speed(stats['network']['upload']['peak'])}</div><div class="label">峰值上传</div></div>
  <div class="stat-card"><div class="value">{_fmt_speed(stats['network']['download']['peak'])}</div><div class="label">峰值下载</div></div>
</div>

<h2>CPU 使用率趋势</h2>
<div class="chart-container"><canvas id="cpuChart"></canvas></div>

<h2>内存与交换分区趋势</h2>
<div class="chart-container"><canvas id="memChart"></canvas></div>

<h2>磁盘使用率趋势</h2>
<div class="chart-container"><canvas id="diskChart"></canvas></div>

<h2>网络速度趋势</h2>
<div class="chart-container"><canvas id="netChart"></canvas></div>

<script>
const timestamps = {timestamps};
const commonOptions = {{
  responsive: true,
  scales: {{
    x: {{ ticks: {{ maxTicksLimit: 20, color: '#94a3b8' }}, grid: {{ color: '#1e293b' }} }},
    y: {{ ticks: {{ color: '#94a3b8' }}, grid: {{ color: '#334155' }} }}
  }},
  plugins: {{ legend: {{ labels: {{ color: '#e2e8f0' }} }} }}
}};

new Chart(document.getElementById('cpuChart'), {{
  type: 'line',
  data: {{
    labels: timestamps,
    datasets: [
      {{ label: 'CPU总体', data: {cpu_totals}, borderColor: '#f97316', fill: false, tension: 0.3 }},
      {''.join(f"{{ label: '{c['label']}', data: {c['data']}, borderColor: 'hsl({i*60},70%,60%)', fill: false, tension: 0.3 }}," for i, c in enumerate(cpu_core_datasets))}
    ]
  }},
  options: {{ ...commonOptions, scales: {{ ...commonOptions.scales, y: {{ ...commonOptions.scales.y, min: 0, max: 100 }} }} }}
}});

new Chart(document.getElementById('memChart'), {{
  type: 'line',
  data: {{
    labels: timestamps,
    datasets: [
      {{ label: '内存%', data: {mem_percents}, borderColor: '#8b5cf6', fill: true, tension: 0.3 }},
      {{ label: '交换分区%', data: {swap_percents}, borderColor: '#06b6d4', fill: false, tension: 0.3 }}
    ]
  }},
  options: {{ ...commonOptions, scales: {{ ...commonOptions.scales, y: {{ ...commonOptions.scales.y, min: 0, max: 100 }} }} }}
}});

new Chart(document.getElementById('diskChart'), {{
  type: 'line',
  data: {{
    labels: timestamps,
    datasets: [
      {''.join(f"{{ label: '{d['label']}', data: {d['data']}, borderColor: 'hsl({i*45+120},70%,60%)', fill: false, tension: 0.3 }}," for i, d in enumerate(disk_datasets))}
    ]
  }},
  options: {{ ...commonOptions, scales: {{ ...commonOptions.scales, y: {{ ...commonOptions.scales.y, min: 0, max: 100 }} }} }}
}});

new Chart(document.getElementById('netChart'), {{
  type: 'line',
  data: {{
    labels: timestamps,
    datasets: [
      {{ label: '上传(B/s)', data: {net_ups}, borderColor: '#22c55e', fill: false, tension: 0.3 }},
      {{ label: '下载(B/s)', data: {net_downs}, borderColor: '#3b82f6', fill: false, tension: 0.3 }}
    ]
  }},
  options: commonOptions
}});
</script>

<div class="footer">
  <p>报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | sysmon</p>
</div>
</body>
</html>"""

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)


def _fmt_speed(bps):
    if bps >= 1024 ** 3:
        return f"{bps / (1024**3):.2f} GB/s"
    elif bps >= 1024 ** 2:
        return f"{bps / (1024**2):.2f} MB/s"
    elif bps >= 1024:
        return f"{bps / 1024:.2f} KB/s"
    else:
        return f"{bps:.0f} B/s"


def run_html_report(args):
    filepath = args.file or get_csv_filename()
    data = parse_csv_data(filepath)
    if not data:
        print(f"文件 {filepath} 无数据。")
        return

    if args.start or args.end:
        data = filter_by_time_range(data, args.start, args.end)
        if not data:
            print("筛选后无数据。")
            return

    stats = compute_stats(data)
    output = args.output
    generate_html(stats, data, output)
    print(f"HTML 报告已生成: {output}")
