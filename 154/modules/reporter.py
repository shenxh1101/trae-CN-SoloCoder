import json
from typing import Dict, Any


def export_json(analysis_data: Dict[str, Any], output_path: str) -> None:
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(analysis_data, f, indent=2, ensure_ascii=False)


def export_html(analysis_data: Dict[str, Any], output_path: str) -> None:
    html_template = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File Analysis Report</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #1a1a2e;
            color: #eaeaea;
            line-height: 1.6;
            padding: 20px;
        }}

        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}

        h1 {{
            color: #00d9ff;
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #16213e;
        }}

        h2 {{
            color: #00d9ff;
            margin-top: 30px;
            margin-bottom: 15px;
            padding-left: 10px;
            border-left: 4px solid #00d9ff;
        }}

        .section {{
            background-color: #16213e;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }}

        th, td {{
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #1a1a2e;
        }}

        th {{
            background-color: #0f3460;
            color: #00d9ff;
            font-weight: 600;
        }}

        tr:hover {{
            background-color: #0f3460;
        }}

        .hex-data {{
            font-family: 'Courier New', Courier, monospace;
            background-color: #0f0f1a;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            color: #a8ff78;
            font-size: 14px;
            line-height: 1.5;
        }}

        .hash-value {{
            font-family: 'Courier New', Courier, monospace;
            color: #ff6b6b;
            word-break: break-all;
        }}

        .entropy-bar {{
            height: 20px;
            background-color: #0f3460;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 10px;
        }}

        .entropy-fill {{
            height: 100%;
            background: linear-gradient(90deg, #00d9ff, #a8ff78, #ff6b6b);
            transition: width 0.5s ease;
        }}

        .strings-list {{
            max-height: 300px;
            overflow-y: auto;
            background-color: #0f0f1a;
            border-radius: 5px;
            padding: 10px;
        }}

        .string-item {{
            font-family: 'Courier New', Courier, monospace;
            padding: 5px 10px;
            border-bottom: 1px solid #1a1a2e;
            color: #a8ff78;
            font-size: 13px;
        }}

        .string-item:last-child {{
            border-bottom: none;
        }}

        .empty {{
            color: #666;
            font-style: italic;
        }}

        ul {{
            list-style-type: none;
            padding-left: 0;
        }}

        li {{
            padding: 8px 0;
            border-bottom: 1px solid #1a1a2e;
        }}

        li:last-child {{
            border-bottom: none;
        }}

        .label {{
            color: #00d9ff;
            font-weight: 600;
            margin-right: 10px;
        }}

        .value {{
            color: #eaeaea;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>File Analysis Report</h1>

        {file_info_section}

        {type_detection_section}

        {entropy_section}

        {strings_section}

        {pe_section}

        {elf_section}

        {hashes_section}
    </div>
</body>
</html>'''

    file_info_section = _render_file_info(analysis_data.get('file_info', {}))
    type_detection_section = _render_type_detection(analysis_data.get('type_detection', {}))
    entropy_section = _render_entropy(analysis_data.get('entropy', {}))
    strings_section = _render_strings(analysis_data.get('strings', []))
    pe_section = _render_pe_analysis(analysis_data.get('pe_analysis', {}))
    elf_section = _render_elf_analysis(analysis_data.get('elf_analysis', {}))
    hashes_section = _render_hashes(analysis_data.get('hashes', {}))

    html_content = html_template.format(
        file_info_section=file_info_section,
        type_detection_section=type_detection_section,
        entropy_section=entropy_section,
        strings_section=strings_section,
        pe_section=pe_section,
        elf_section=elf_section,
        hashes_section=hashes_section
    )

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)


def _render_file_info(file_info: Dict[str, Any]) -> str:
    if not file_info:
        return '<div class="section"><h2>File Info</h2><p class="empty">No file information available</p></div>'

    rows = ''
    for key, value in file_info.items():
        rows += f'<tr><th>{key}</th><td class="value">{value}</td></tr>'

    return f'''
        <div class="section">
            <h2>File Info</h2>
            <table>
                {rows}
            </table>
        </div>
    '''


def _render_type_detection(type_detection: Dict[str, Any]) -> str:
    if not type_detection:
        return '<div class="section"><h2>Type Detection</h2><p class="empty">No type detection information available</p></div>'

    rows = ''
    for key, value in type_detection.items():
        rows += f'<tr><th>{key}</th><td class="value">{value}</td></tr>'

    return f'''
        <div class="section">
            <h2>Type Detection</h2>
            <table>
                {rows}
            </table>
        </div>
    '''


def _render_entropy(entropy_data: Dict[str, Any]) -> str:
    if not entropy_data:
        return '<div class="section"><h2>Entropy Analysis</h2><p class="empty">No entropy analysis available</p></div>'

    entropy_value = entropy_data.get('value', 0)
    percentage = min(entropy_value / 8.0 * 100, 100)

    rows = ''
    for key, value in entropy_data.items():
        if key != 'value':
            rows += f'<tr><th>{key}</th><td class="value">{value}</td></tr>'

    return f'''
        <div class="section">
            <h2>Entropy Analysis</h2>
            <table>
                <tr><th>Entropy Value</th><td class="value">{entropy_value:.4f} / 8.0</td></tr>
                {rows}
            </table>
            <div class="entropy-bar">
                <div class="entropy-fill" style="width: {percentage}%"></div>
            </div>
            <p style="margin-top: 10px; color: #666; font-size: 14px;">
                Higher entropy (closer to 8.0) may indicate encrypted or compressed data.
            </p>
        </div>
    '''


def _render_strings(strings_list: list) -> str:
    if not strings_list:
        return '<div class="section"><h2>Strings</h2><p class="empty">No strings found</p></div>'

    string_items = ''
    for s in strings_list:
        string_items += f'<div class="string-item">{_escape_html(s)}</div>'

    return f'''
        <div class="section">
            <h2>Strings</h2>
            <p style="margin-bottom: 10px; color: #666;">Found {len(strings_list)} strings:</p>
            <div class="strings-list">
                {string_items}
            </div>
        </div>
    '''


def _render_pe_analysis(pe_data: Dict[str, Any]) -> str:
    if not pe_data:
        return '<div class="section"><h2>PE Analysis</h2><p class="empty">Not a PE file or no analysis available</p></div>'

    content = ''
    for section, data in pe_data.items():
        if isinstance(data, dict):
            rows = ''
            for key, value in data.items():
                if isinstance(value, list):
                    value = ', '.join(str(v) for v in value)
                rows += f'<tr><th>{key}</th><td class="value">{value}</td></tr>'
            content += f'<h3 style="color: #a8ff78; margin: 20px 0 10px 0;">{section}</h3><table>{rows}</table>'
        elif isinstance(data, list):
            items = ''.join(f'<li>{_escape_html(str(item))}</li>' for item in data)
            content += f'<h3 style="color: #a8ff78; margin: 20px 0 10px 0;">{section}</h3><ul>{items}</ul>'
        else:
            content += f'<p><span class="label">{section}:</span><span class="value">{data}</span></p>'

    return f'''
        <div class="section">
            <h2>PE Analysis</h2>
            {content}
        </div>
    '''


def _render_elf_analysis(elf_data: Dict[str, Any]) -> str:
    if not elf_data:
        return '<div class="section"><h2>ELF Analysis</h2><p class="empty">Not an ELF file or no analysis available</p></div>'

    content = ''
    for section, data in elf_data.items():
        if isinstance(data, dict):
            rows = ''
            for key, value in data.items():
                if isinstance(value, list):
                    value = ', '.join(str(v) for v in value)
                rows += f'<tr><th>{key}</th><td class="value">{value}</td></tr>'
            content += f'<h3 style="color: #a8ff78; margin: 20px 0 10px 0;">{section}</h3><table>{rows}</table>'
        elif isinstance(data, list):
            items = ''.join(f'<li>{_escape_html(str(item))}</li>' for item in data)
            content += f'<h3 style="color: #a8ff78; margin: 20px 0 10px 0;">{section}</h3><ul>{items}</ul>'
        else:
            content += f'<p><span class="label">{section}:</span><span class="value">{data}</span></p>'

    return f'''
        <div class="section">
            <h2>ELF Analysis</h2>
            {content}
        </div>
    '''


def _render_hashes(hashes: Dict[str, Any]) -> str:
    if not hashes:
        return '<div class="section"><h2>Hashes</h2><p class="empty">No hashes available</p></div>'

    rows = ''
    for algo, hash_val in hashes.items():
        rows += f'<tr><th>{algo.upper()}</th><td class="hash-value">{hash_val}</td></tr>'

    return f'''
        <div class="section">
            <h2>Hashes</h2>
            <table>
                {rows}
            </table>
        </div>
    '''


def _escape_html(text: str) -> str:
    html_escape_table = {
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
        '>': '&gt;',
        '<': '&lt;',
    }
    return ''.join(html_escape_table.get(c, c) for c in str(text))
