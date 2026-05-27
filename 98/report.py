import json
from typing import Dict, List, Tuple
from datetime import datetime


def _format_bytes(n: int) -> str:
    if n < 1024:
        return f'{n} B'
    if n < 1048576:
        return f'{n / 1024:.2f} KB'
    if n < 1073741824:
        return f'{n / 1048576:.2f} MB'
    return f'{n / 1073741824:.2f} GB'


def _format_pct(change: float) -> str:
    if change == float('inf'):
        return '∞% (new)'
    if change == float('-inf'):
        return '-∞% (removed)'
    sign = '+' if change > 0 else ''
    return f'{sign}{change:.2f}%'


def ascii_bar_chart(data: List[Dict], width: int = 60, title: str = '') -> str:
    if not data:
        return 'No data available.'
    max_val = max(d['count'] for d in data) if data else 1
    if max_val == 0:
        max_val = 1
    lines = []
    if title:
        lines.append(f'\n{title}')
        lines.append('=' * len(title))
    for item in data:
        label = item.get('hour', item.get('label', str(item.get('key', ''))))
        count = item['count']
        bar_len = int((count / max_val) * width)
        bar = '█' * bar_len + '░' * (width - bar_len)
        lines.append(f'{label:>16} │{bar}│ {count:,}')
    return '\n'.join(lines)


def geo_map(country_counts: List[Tuple[str, int]]) -> str:
    from geo import generate_world_map
    return generate_world_map(country_counts)


def text_report(analysis: Dict, show_charts: bool = True) -> str:
    lines = []
    lines.append('=' * 80)
    lines.append('                      WEB SERVER LOG ANALYSIS REPORT')
    lines.append('=' * 80)
    lines.append('')

    s = analysis.get('summary', {})
    lines.append('📊 SUMMARY')
    lines.append('-' * 40)
    lines.append(f'  Total Requests:     {s.get("total_requests", 0):,}')
    lines.append(f'  Unique IPs:         {s.get("unique_ips", 0):,}')
    lines.append(f'  Unique URLs:        {s.get("unique_urls", 0):,}')
    lines.append(f'  Total Transfer:     {_format_bytes(s.get("total_bytes", 0))}')
    lines.append(f'  Average Size:       {_format_bytes(s.get("avg_bytes", 0))}')
    lines.append(f'  Time Range:         {s.get("time_start", "N/A")}')
    lines.append(f'                      to {s.get("time_end", "N/A")}')
    lines.append(f'  Duration:           {s.get("duration_hours", 0):.2f} hours')
    lines.append('')

    status = analysis.get('status_distribution', {})
    by_cat = status.get('by_category', {})
    by_code = status.get('by_code', {})
    lines.append('📈 STATUS CODE DISTRIBUTION')
    lines.append('-' * 40)
    for cat in ['2xx', '3xx', '4xx', '5xx']:
        cnt = by_cat.get(cat, 0)
        total = sum(by_cat.values()) or 1
        pct = cnt / total * 100
        lines.append(f'  {cat}: {cnt:>10,} ({pct:5.1f}%)')
    lines.append('')
    lines.append('  Top Status Codes:')
    for code, cnt in list(by_code.items())[:10]:
        total = sum(by_code.values()) or 1
        pct = cnt / total * 100
        lines.append(f'    {code}: {cnt:>8,} ({pct:5.1f}%)')
    lines.append('')

    lines.append('🏆 TOP 10 MOST ACTIVE IPs')
    lines.append('-' * 40)
    for i, (ip, cnt) in enumerate(analysis.get('top_ips', [])[:10], 1):
        lines.append(f'  {i:2}. {ip:<18} {cnt:>10,} requests')
    lines.append('')

    lines.append('🔥 TOP 10 MOST POPULAR URLs')
    lines.append('-' * 40)
    for i, (url, cnt) in enumerate(analysis.get('top_urls', [])[:10], 1):
        url_display = url if len(url) <= 50 else url[:47] + '...'
        lines.append(f'  {i:2}. {url_display:<50} {cnt:>8,}')
    lines.append('')

    ua = analysis.get('user_agents', {})
    lines.append('🌐 BROWSER DISTRIBUTION')
    lines.append('-' * 40)
    total_ua = sum(c for _, c in ua.get('browsers', [])) or 1
    for browser, cnt in ua.get('browsers', [])[:8]:
        pct = cnt / total_ua * 100
        lines.append(f'  {browser:<15} {cnt:>8,} ({pct:5.1f}%)')
    lines.append('')

    if ua.get('crawlers'):
        lines.append('🤖 CRAWLER DISTRIBUTION')
        lines.append('-' * 40)
        total_crawl = sum(c for _, c in ua.get('crawlers', [])) or 1
        for crawler, cnt in ua.get('crawlers', [])[:6]:
            pct = cnt / total_crawl * 100
            lines.append(f'  {crawler:<18} {cnt:>8,} ({pct:5.1f}%)')
        lines.append('')

    lines.append('💻 OPERATING SYSTEM DISTRIBUTION')
    lines.append('-' * 40)
    total_os = sum(c for _, c in analysis.get('os_distribution', [])) or 1
    for os_name, cnt in analysis.get('os_distribution', [])[:8]:
        pct = cnt / total_os * 100
        lines.append(f'  {os_name:<18} {cnt:>8,} ({pct:5.1f}%)')
    lines.append('')

    if show_charts:
        hourly = analysis.get('hourly_distribution', [])
        if hourly:
            lines.append(ascii_bar_chart(hourly, title='⏰ HOURLY REQUEST DISTRIBUTION'))
            lines.append('')

        geo_data = analysis.get('geo_data', {})
        world_map = geo_data.get('world_map', '')
        if world_map:
            lines.append(world_map)
            lines.append('')
        elif geo_data.get('by_country'):
            lines.append(geo_map(geo_data.get('by_country')))
            lines.append('')

    anom = analysis.get('anomalies', {})
    if anom.get('flooding_ips'):
        lines.append('⚠️  FLOODING IPs DETECTED')
        lines.append('-' * 40)
        for ip_data in anom['flooding_ips'][:5]:
            lines.append(
                f'  {ip_data["ip"]:<18} {ip_data["count"]:>8,} req in window '
                f'({ip_data["requests_per_second"]}/s) [{ip_data["severity"]}]'
            )
        lines.append('')

    if anom.get('sensitive_path_hits'):
        lines.append('🔒 SENSITIVE PATH ACCESSES')
        lines.append('-' * 40)
        for hit in anom['sensitive_path_hits'][:10]:
            path = hit['path'] if len(hit['path']) <= 50 else hit['path'][:47] + '...'
            lines.append(f'  {hit["ip"]:<18} {hit["status"]:>3} {path}')
        lines.append('')

    if anom.get('high_error_ips'):
        lines.append('❌ HIGH ERROR RATE IPs')
        lines.append('-' * 40)
        for err in anom['high_error_ips'][:5]:
            lines.append(
                f'  {err["ip"]:<18} {err["total_errors"]:>8,} errors '
                f'(4xx: {err["error_4xx"]}, 5xx: {err["error_5xx"]})'
            )
        lines.append('')

    if anom.get('suspicious_requests'):
        lines.append('🚨 SUSPICIOUS REQUESTS')
        lines.append('-' * 40)
        for req in anom['suspicious_requests'][:10]:
            attacks = ', '.join(req['attack_types'])
            path = req['path'] if len(req['path']) <= 40 else req['path'][:37] + '...'
            lines.append(f'  {req["ip"]:<18} [{attacks}] {path}')
        lines.append('')

    lines.append('=' * 80)
    return '\n'.join(lines)


def json_report(analysis: Dict, pretty: bool = True) -> str:
    indent = 2 if pretty else None
    return json.dumps(analysis, indent=indent, ensure_ascii=False)


def html_report(analysis: Dict) -> str:
    s = analysis.get('summary', {})
    status = analysis.get('status_distribution', {}).get('by_category', {})
    total = sum(status.values()) or 1

    def status_color(code):
        if code == '2xx':
            return 'success'
        if code == '3xx':
            return 'info'
        if code == '4xx':
            return 'warning'
        if code == '5xx':
            return 'danger'
        return 'secondary'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log Analysis Report</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh; padding: 20px; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        .card {{ background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1); }}
        h1 {{ color: white; text-align: center; margin-bottom: 30px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.2); }}
        h2 {{ color: #2d3748; margin-bottom: 20px; font-size: 1.5rem;
              border-bottom: 3px solid #667eea; padding-bottom: 10px; }}
        .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                         gap: 20px; }}
        .stat-card {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white; padding: 20px; border-radius: 10px; text-align: center; }}
        .stat-value {{ font-size: 2rem; font-weight: bold; }}
        .stat-label {{ opacity: 0.9; font-size: 0.9rem; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
        th {{ background: #f7fafc; color: #2d3748; text-align: left;
             padding: 12px; font-weight: 600; }}
        td {{ padding: 12px; border-bottom: 1px solid #e2e8f0; }}
        tr:hover {{ background: #f7fafc; }}
        .badge {{ padding: 4px 12px; border-radius: 20px; font-size: 0.85rem;
                  font-weight: 600; }}
        .badge-success {{ background: #c6f6d5; color: #22543d; }}
        .badge-info {{ background: #bee3f8; color: #2a4365; }}
        .badge-warning {{ background: #feebc8; color: #744210; }}
        .badge-danger {{ background: #fed7d7; color: #742a2a; }}
        .status-bar {{ height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }}
        .status-fill {{ height: 100%; }}
        .alert {{ padding: 16px; border-radius: 8px; margin-bottom: 12px; }}
        .alert-warning {{ background: #fff3cd; border-left: 4px solid #ffc107; }}
        .alert-danger {{ background: #f8d7da; border-left: 4px solid #dc3545; }}
        .hourly-chart {{ display: flex; align-items: flex-end; height: 200px; gap: 2px;
                         padding: 10px 0; }}
        .hourly-bar {{ flex: 1; background: linear-gradient(to top, #667eea, #764ba2);
                       min-width: 4px; border-radius: 2px 2px 0 0; position: relative; }}
        .geo-map {{ font-family: monospace; white-space: pre; background: #f7fafc;
                    padding: 20px; border-radius: 8px; overflow-x: auto; }}
        .two-col {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
        @media (max-width: 768px) {{ .two-col {{ grid-template-columns: 1fr; }} }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Web Server Log Analysis Report</h1>

        <div class="card">
            <h2>📋 Summary</h2>
            <div class="summary-grid">
                <div class="stat-card">
                    <div class="stat-value">{s.get('total_requests', 0):,}</div>
                    <div class="stat-label">Total Requests</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{s.get('unique_ips', 0):,}</div>
                    <div class="stat-label">Unique IPs</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{s.get('unique_urls', 0):,}</div>
                    <div class="stat-label">Unique URLs</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{_format_bytes(s.get('total_bytes', 0))}</div>
                    <div class="stat-label">Total Transfer</div>
                </div>
            </div>
            <p style="margin-top: 20px; color: #718096;">
                <strong>Time Range:</strong> {s.get('time_start', 'N/A')} to {s.get('time_end', 'N/A')}
                ({s.get('duration_hours', 0):.2f} hours)
            </p>
        </div>

        <div class="card">
            <h2>📈 Status Code Distribution</h2>
            <table>
                <tr><th>Code</th><th>Count</th><th>Percentage</th><th>Distribution</th></tr>
"""

    for code in ['2xx', '3xx', '4xx', '5xx']:
        cnt = status.get(code, 0)
        pct = cnt / total * 100
        html += f"""
                <tr>
                    <td><span class="badge badge-{status_color(code)}">{code}</span></td>
                    <td>{cnt:,}</td>
                    <td>{pct:.1f}%</td>
                    <td><div class="status-bar"><div class="status-fill" style="width: {pct}%; background: #{['48bb78', '4299e1', 'ecc94b', 'f56565'][['2xx', '3xx', '4xx', '5xx'].index(code)]}"></div></div></td>
                </tr>"""

    html += """
            </table>
        </div>

        <div class="two-col">
            <div class="card">
                <h2>🏆 Top 10 IPs</h2>
                <table>
                    <tr><th>#</th><th>IP Address</th><th>Requests</th></tr>
"""

    for i, (ip, cnt) in enumerate(analysis.get('top_ips', [])[:10], 1):
        html += f'<tr><td>{i}</td><td><code>{ip}</code></td><td>{cnt:,}</td></tr>'

    html += """
                </table>
            </div>

            <div class="card">
                <h2>🔥 Top 10 URLs</h2>
                <table>
                    <tr><th>#</th><th>Path</th><th>Hits</th></tr>
"""

    for i, (url, cnt) in enumerate(analysis.get('top_urls', [])[:10], 1):
        url_display = url if len(url) <= 40 else url[:37] + '...'
        html += f'<tr><td>{i}</td><td><code>{url_display}</code></td><td>{cnt:,}</td></tr>'

    html += """
                </table>
            </div>
        </div>

        <div class="two-col">
            <div class="card">
                <h2>🌐 Browser Distribution</h2>
                <table>
                    <tr><th>Browser</th><th>Count</th><th>%</th></tr>
"""

    ua = analysis.get('user_agents', {}).get('browsers', [])
    total_ua = sum(c for _, c in ua) or 1
    for browser, cnt in ua[:8]:
        pct = cnt / total_ua * 100
        html += f'<tr><td>{browser}</td><td>{cnt:,}</td><td>{pct:.1f}%</td></tr>'

    html += """
                </table>
            </div>

            <div class="card">
                <h2>💻 OS Distribution</h2>
                <table>
                    <tr><th>OS</th><th>Count</th><th>%</th></tr>
"""

    os_data = analysis.get('os_distribution', [])
    total_os = sum(c for _, c in os_data) or 1
    for os_name, cnt in os_data[:8]:
        pct = cnt / total_os * 100
        html += f'<tr><td>{os_name}</td><td>{cnt:,}</td><td>{pct:.1f}%</td></tr>'

    html += """
                </table>
            </div>
        </div>

        <div class="card">
            <h2>⏰ Hourly Request Distribution</h2>
            <div class="hourly-chart">
"""

    hourly = analysis.get('hourly_distribution', [])
    max_hour = max(h['count'] for h in hourly) if hourly else 1
    for h in hourly:
        height = (h['count'] / max_hour) * 100 if max_hour else 0
        html += f'<div class="hourly-bar" style="height: {height}%;" title="{h["hour"]}: {h["count"]}"></div>'

    html += """
            </div>
        </div>

        <div class="card">
            <h2>🌍 Geographic Distribution</h2>
"""

    geo_data = analysis.get('geo_data', {})
    world_map = geo_data.get('world_map', '')
    if world_map:
        html += f"""
            <div class="geo-map" style="font-family: monospace; white-space: pre; background: #f7fafc;
                    padding: 20px; border-radius: 8px; overflow-x: auto; font-size: 12px; line-height: 1.4;">
{world_map}
            </div>
"""

    geo = geo_data.get('by_country', [])
    total_geo = sum(c for _, c in geo) or 1
    if geo:
        html += """
            <table>
                <tr><th>Country</th><th>Count</th><th>%</th></tr>
"""
        for country, cnt in geo[:10]:
            from geo import country_name
            pct = cnt / total_geo * 100
            html += f'<tr><td>{country} - {country_name(country)}</td><td>{cnt:,}</td><td>{pct:.1f}%</td></tr>'
        html += """
            </table>
"""

    html += """
        </div>
"""

    anom = analysis.get('anomalies', {})
    if anom.get('flooding_ips') or anom.get('sensitive_path_hits') or anom.get('high_error_ips'):
        html += """
        <div class="card">
            <h2>⚠️ Anomalies & Alerts</h2>
"""

        if anom.get('flooding_ips'):
            html += '<div class="alert alert-warning"><strong>Flooding IPs:</strong><ul style="margin-top: 10px;">'
            for ip_data in anom['flooding_ips'][:5]:
                html += f'<li><code>{ip_data["ip"]}</code>: {ip_data["count"]:,} requests ({ip_data["requests_per_second"]}/s) [{ip_data["severity"]}]</li>'
            html += '</ul></div>'

        if anom.get('sensitive_path_hits'):
            html += '<div class="alert alert-danger"><strong>Sensitive Path Access:</strong><ul style="margin-top: 10px;">'
            for hit in anom['sensitive_path_hits'][:5]:
                html += f'<li><code>{hit["ip"]}</code> → <code>{hit["path"]}</code> ({hit["status"]})</li>'
            html += '</ul></div>'

        if anom.get('suspicious_requests'):
            html += '<div class="alert alert-danger"><strong>Suspicious Requests:</strong><ul style="margin-top: 10px;">'
            for req in anom['suspicious_requests'][:5]:
                attacks = ', '.join(req['attack_types'])
                html += f'<li><code>{req["ip"]}</code> [{attacks}] → <code>{req["path"][:50]}</code></li>'
            html += '</ul></div>'

        html += '</div>'

    html += f"""
        <div class="card" style="text-align: center; color: #718096; font-size: 0.9rem;">
            Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        </div>
    </div>
</body>
</html>
"""
    return html


def comparison_report(comparison: Dict) -> str:
    lines = []
    lines.append('=' * 80)
    lines.append('                      LOG ANALYSIS COMPARISON REPORT')
    lines.append('=' * 80)
    lines.append('')

    tr_a = comparison.get('time_range_a', {})
    tr_b = comparison.get('time_range_b', {})
    lines.append(f'  Period A: {tr_a.get("start", "N/A")} to {tr_a.get("end", "N/A")}')
    lines.append(f'  Period B: {tr_b.get("start", "N/A")} to {tr_b.get("end", "N/A")}')
    lines.append('')

    lines.append('📊 KEY METRICS COMPARISON')
    lines.append('-' * 60)
    metrics = comparison.get('metric_changes', {})
    for metric, data in metrics.items():
        change = data.get('change_pct', 0)
        change_str = _format_pct(change)
        arrow = '↑' if change > 0 else ('↓' if change < 0 else '→')
        lines.append(
            f'  {metric.replace("_", " ").title():<20} '
            f'{data.get("value_a", 0):>12,} → {data.get("value_b", 0):>12,} '
            f'{arrow} {change_str}'
        )
    lines.append('')

    lines.append('📈 STATUS CODE CHANGES')
    lines.append('-' * 60)
    status = comparison.get('status_changes', {})
    for code, data in status.items():
        change = data.get('change_pct', 0)
        change_str = _format_pct(change)
        arrow = '↑' if change > 0 else ('↓' if change < 0 else '→')
        lines.append(
            f'  {code:<4} {data.get("value_a", 0):>10,} → {data.get("value_b", 0):>10,} '
            f'{arrow} {change_str}'
        )
    lines.append('')

    lines.append('🏆 TOP IP CHANGES')
    lines.append('-' * 60)
    for ip_data in comparison.get('top_ip_changes', [])[:10]:
        change = ip_data.get('change_pct', 0)
        change_str = _format_pct(change)
        arrow = '↑' if change > 0 else ('↓' if change < 0 else '→')
        lines.append(
            f'  {ip_data["ip"]:<18} {ip_data.get("count_a", 0):>8,} → {ip_data.get("count_b", 0):>8,} '
            f'{arrow} {change_str}'
        )
    lines.append('')
    lines.append('=' * 80)
    return '\n'.join(lines)
