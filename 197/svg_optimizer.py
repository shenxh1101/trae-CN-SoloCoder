#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import io
import sys
import logging
import zipfile
import shutil
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Tuple, Optional, Any
from xml.etree import ElementTree as ET
from dataclasses import dataclass, field

import click
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn
from scour.scour import generateDefaultOptions, scourString

console = Console()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger('svg_optimizer')


class OptimizationLevel:
    LIGHT = 'light'
    MEDIUM = 'medium'
    AGGRESSIVE = 'aggressive'


@dataclass
class OptimizationConfig:
    level: str = OptimizationLevel.MEDIUM
    digits: int = 5
    cdigits: int = -1
    simple_colors: bool = True
    style_to_xml: bool = True
    group_collapse: bool = True
    group_create: bool = False
    keep_editor_data: bool = False
    keep_defs: bool = False
    renderer_workaround: bool = True
    strip_xml_prolog: bool = False
    remove_titles: bool = False
    remove_descriptions: bool = False
    remove_metadata: bool = False
    remove_descriptive_elements: bool = False
    strip_comments: bool = False
    embed_rasters: bool = True
    enable_viewboxing: bool = False
    indent_type: str = 'space'
    indent_depth: int = 1
    newlines: bool = True
    strip_xml_space_attribute: bool = False
    strip_ids: bool = False
    shorten_ids: bool = False
    shorten_ids_prefix: str = ''
    protect_ids_noninkscape: bool = False
    protect_ids_list: Optional[List[str]] = None
    protect_ids_prefix: Optional[str] = None
    error_on_flowtext: bool = False
    quiet: bool = True
    verbose: bool = False


OPTIMIZATION_LEVELS = {
    OptimizationLevel.LIGHT: {
        'remove_metadata': True,
        'strip_comments': True,
        'remove_descriptions': True,
        'digits': 3,
        'indent_type': 'none',
        'newlines': False,
        'strip_xml_prolog': True,
    },
    OptimizationLevel.MEDIUM: {
        'remove_metadata': True,
        'strip_comments': True,
        'remove_descriptions': True,
        'remove_titles': True,
        'shorten_ids': True,
        'strip_ids': True,
        'digits': 2,
        'indent_type': 'none',
        'newlines': False,
        'strip_xml_prolog': True,
        'enable_viewboxing': True,
        'strip_xml_space_attribute': True,
    },
    OptimizationLevel.AGGRESSIVE: {
        'remove_metadata': True,
        'strip_comments': True,
        'remove_descriptions': True,
        'remove_titles': True,
        'shorten_ids': True,
        'strip_ids': True,
        'digits': 1,
        'indent_type': 'none',
        'newlines': False,
        'strip_xml_prolog': True,
        'enable_viewboxing': True,
        'strip_xml_space_attribute': True,
        'group_create': True,
        'remove_descriptive_elements': True,
        'keep_defs': False,
    }
}


@dataclass
class OptimizationResult:
    filename: str
    original_size: int
    optimized_size: int
    status: str = 'success'
    error_message: Optional[str] = None
    backup_path: Optional[str] = None
    output_path: Optional[str] = None
    react_path: Optional[str] = None
    vue_path: Optional[str] = None
    used_scour: bool = False
    optimization_level: str = OptimizationLevel.MEDIUM


class SVGOptimizer:
    def __init__(self, level: str = OptimizationLevel.MEDIUM):
        self.level = level
        self.config = self._get_config_for_level(level)
        self._lock = threading.Lock()

    def _get_config_for_level(self, level: str) -> OptimizationConfig:
        config = OptimizationConfig()
        level_settings = OPTIMIZATION_LEVELS.get(level, OPTIMIZATION_LEVELS[OptimizationLevel.MEDIUM])
        
        for key, value in level_settings.items():
            if hasattr(config, key):
                setattr(config, key, value)
        
        return config

    def _create_scour_options(self):
        opts = generateDefaultOptions()
        for key, value in self.config.__dict__.items():
            if hasattr(opts, key) and value is not None:
                setattr(opts, key, value)
        opts.quiet = True
        opts.verbose = False
        return opts

    def optimize_with_scour(self, svg_content: str) -> Optional[str]:
        try:
            opts = self._create_scour_options()
            result = scourString(svg_content, opts)
            
            if result and len(result.strip()) > 0:
                result = result.strip()
                result = re.sub(r'\n$', '', result)
                return result
            return None
        except Exception as e:
            logger.debug(f"Scour优化失败: {e}")
            return None

    def backup_optimize(self, svg_content: str) -> str:
        result = svg_content
        
        result = re.sub(r'<!--[\s\S]*?-->', '', result)
        
        result = re.sub(r'<metadata[^>]*>[\s\S]*?</metadata>', '', result, flags=re.IGNORECASE)
        result = re.sub(r'<dc:.*?>[\s\S]*?</dc:.*?>', '', result, flags=re.IGNORECASE)
        
        result = re.sub(r'<description[^>]*>[\s\S]*?</description>', '', result, flags=re.IGNORECASE)
        
        if self.level != OptimizationLevel.LIGHT:
            result = re.sub(r'<title[^>]*>[\s\S]*?</title>', '', result, flags=re.IGNORECASE)
        
        if self.level == OptimizationLevel.AGGRESSIVE:
            result = re.sub(r'<desc[^>]*>[\s\S]*?</desc>', '', result, flags=re.IGNORECASE)
        
        result = re.sub(r'\s+xmlns:[a-z0-9]+="[^"]*"', '', result)
        
        result = re.sub(r'\s+style="\s*"', '', result)
        
        ids_in_use = set(re.findall(r'url\(#([^)]+)\)', result))
        result = re.sub(r'\s+id="([^"]*)"', lambda m: m.group(0) if m.group(1) in ids_in_use else '', result)
        
        if self.level != OptimizationLevel.LIGHT:
            unused_defs_pattern = r'<defs[^>]*>\s*</defs>|<defs[^>]*>(?:\s*<!--.*?-->\s*)*</defs>'
            result = re.sub(unused_defs_pattern, '', result, flags=re.DOTALL)
        
        result = re.sub(r'>\s+<', '><', result)
        result = re.sub(r'\s+', ' ', result)
        result = result.strip()
        
        return result

    def optimize(self, svg_content: str) -> Tuple[str, bool]:
        scour_result = self.optimize_with_scour(svg_content)
        if scour_result:
            return scour_result, True
        return self.backup_optimize(svg_content), False


def get_file_size(file_path: str) -> int:
    return os.path.getsize(file_path)


def format_size(size: int) -> str:
    for unit in ['B', 'KB', 'MB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} GB"


def calculate_savings(original: int, optimized: int) -> Tuple[float, float]:
    if original == 0:
        return 0, 0
    saved = original - optimized
    percent = (saved / original) * 100
    return saved, percent


def find_svg_files(input_dir: str) -> List[str]:
    svg_files = []
    for root, _, files in os.walk(input_dir):
        for file in files:
            if file.lower().endswith('.svg'):
                svg_files.append(os.path.join(root, file))
    return sorted(svg_files)


def create_backup(file_path: str, backup_dir: Optional[str] = None) -> Optional[str]:
    try:
        if backup_dir is None:
            backup_path = file_path + '.bak'
        else:
            os.makedirs(backup_dir, exist_ok=True)
            backup_path = os.path.join(backup_dir, os.path.basename(file_path) + '.bak')
        
        if os.path.exists(backup_path):
            base, ext = os.path.splitext(backup_path)
            counter = 1
            while os.path.exists(f"{base}_{counter}{ext}"):
                counter += 1
            backup_path = f"{base}_{counter}{ext}"
        
        shutil.copy2(file_path, backup_path)
        logger.info(f"已备份: {os.path.basename(file_path)} -> {os.path.basename(backup_path)}")
        return backup_path
    except Exception as e:
        logger.error(f"备份失败 {file_path}: {e}")
        return None


def clean_namespace_prefixes(content: str) -> str:
    content = re.sub(r'xmlns:ns\d+="http://www\.w3\.org/2000/svg"\s*', '', content)
    content = re.sub(r'ns\d+:([a-zA-Z][a-zA-Z0-9]*)', r'\1', content)
    return content


def generate_sprite(svg_files: List[str], output_path: str, css_path: Optional[str] = None) -> Tuple[str, str]:
    symbols = []
    css_classes = []
    
    svg_only_files = [f for f in svg_files if f.lower().endswith('.svg')]
    logger.info(f"生成精灵图，处理 {len(svg_only_files)} 个SVG文件")
    
    for svg_file in svg_only_files:
        try:
            with open(svg_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            content = re.sub(r'<\?xml[^>]*\?>', '', content)
            content = content.strip()
            
            viewbox_match = re.search(r'viewBox="([^"]*)"', content)
            viewbox = viewbox_match.group(1) if viewbox_match else ''
            
            if not viewbox:
                width_match = re.search(r'width="([^"]*)"', content)
                height_match = re.search(r'height="([^"]*)"', content)
                if width_match and height_match:
                    w = width_match.group(1)
                    h = height_match.group(1)
                    if w.replace('.', '').isdigit() and h.replace('.', '').isdigit():
                        viewbox = f"0 0 {w} {h}"
            
            symbol_id = os.path.splitext(os.path.basename(svg_file))[0]
            symbol_id = re.sub(r'[^a-zA-Z0-9_-]', '-', symbol_id)
            symbol_id = symbol_id.strip('-')
            
            inner_match = re.search(r'<svg[^>]*>([\s\S]*)</svg>', content)
            inner_content = inner_match.group(1) if inner_match else content
            
            inner_content = re.sub(r'<title[^>]*>[\s\S]*?</title>', '', inner_content, flags=re.IGNORECASE)
            inner_content = re.sub(r'<desc[^>]*>[\s\S]*?</desc>', '', inner_content, flags=re.IGNORECASE)
            inner_content = re.sub(r'<metadata[^>]*>[\s\S]*?</metadata>', '', inner_content, flags=re.IGNORECASE)
            inner_content = clean_namespace_prefixes(inner_content)
            
            if inner_content.strip():
                symbol = f'<symbol id="{symbol_id}" viewBox="{viewbox}">{inner_content.strip()}</symbol>'
                symbols.append(symbol)
                css_class = f".icon-{symbol_id}"
                css_classes.append((css_class, symbol_id))
                logger.debug(f"已添加符号: {symbol_id}")
            
        except Exception as e:
            logger.warning(f"处理精灵图文件 {svg_file} 时出错: {e}")
    
    sprite_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display: none;">
<defs>
{chr(10).join(symbols)}
</defs>
</svg>'''
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(sprite_content)
    
    css_content = '''/* SVG Sprite CSS */
.icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  stroke-width: 0;
  stroke: currentColor;
  fill: currentColor;
  vertical-align: -0.125em;
}

/* 使用示例:
<svg class="icon icon-home">
  <use xlink:href="#home"></use>
</svg>
*/

'''
    for css_class, symbol_id in css_classes:
        css_content += f'''{css_class} {{
  /* 使用方法: <svg class="icon icon-{symbol_id}"><use xlink:href="#{symbol_id}"></use></svg> */
}}
'''
    
    if css_path:
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css_content)
        logger.info(f"CSS文件已保存: {css_path}")
    
    logger.info(f"精灵图已生成: {output_path}")
    return sprite_content, css_content


def convert_to_react_component(svg_content: str, component_name: str) -> str:
    svg_content = re.sub(r'<\?xml[^>]*\?>', '', svg_content)
    svg_content = svg_content.strip()
    
    def replace_attr(match):
        attr = match.group(1)
        value = match.group(2)
        
        special_attrs = {
            'class': 'className',
            'xlink:href': 'xlinkHref',
            'xml:space': 'xmlSpace',
            'xmlns:xlink': 'xmlnsXlink',
            'clip-path': 'clipPath',
            'fill-opacity': 'fillOpacity',
            'font-family': 'fontFamily',
            'font-size': 'fontSize',
            'marker-end': 'markerEnd',
            'marker-mid': 'markerMid',
            'marker-start': 'markerStart',
            'stroke-width': 'strokeWidth',
            'stroke-opacity': 'strokeOpacity',
            'stroke-dasharray': 'strokeDasharray',
            'stroke-dashoffset': 'strokeDashoffset',
            'stroke-linecap': 'strokeLinecap',
            'stroke-linejoin': 'strokeLinejoin',
            'stroke-miterlimit': 'strokeMiterlimit',
            'text-anchor': 'textAnchor',
        }
        
        if attr in special_attrs:
            return f'{special_attrs[attr]}={value}'
        
        if '-' in attr and not attr.startswith('xmlns'):
            parts = attr.split('-')
            camel_case = parts[0] + ''.join(p.capitalize() for p in parts[1:])
            return f'{camel_case}={value}'
        
        return match.group(0)
    
    result = re.sub(r'([a-zA-Z][a-zA-Z0-9:-]*)=("[^"]*")', replace_attr, svg_content)
    
    component_name = ''.join(word.capitalize() for word in re.split(r'[^a-zA-Z0-9]', component_name) if word)
    if not component_name:
        component_name = 'SvgIcon'
    if not component_name[0].isupper():
        component_name = component_name[0].upper() + component_name[1:]
    
    svg_tag_match = re.match(r'(<svg[^>]*>)', result)
    if svg_tag_match:
        svg_tag = svg_tag_match.group(1)
        if '{...props}' not in svg_tag:
            svg_tag_with_props = svg_tag[:-1] + ' {...props}>'
            result = result.replace(svg_tag, svg_tag_with_props, 1)
    
    return f'''import React from 'react';

const {component_name} = (props) => {{
  return (
    {result}
  );
}};

{component_name}.displayName = '{component_name}';

export default {component_name};
'''


def convert_to_vue_component(svg_content: str, component_name: str) -> str:
    svg_content = re.sub(r'<\?xml[^>]*\?>', '', svg_content)
    svg_content = svg_content.strip()
    
    component_name = ''.join(word.capitalize() for word in re.split(r'[^a-zA-Z0-9]', component_name) if word)
    if not component_name:
        component_name = 'SvgIcon'
    
    svg_tag_match = re.match(r'(<svg[^>]*>)', svg_content)
    if svg_tag_match:
        svg_tag = svg_tag_match.group(1)
        if 'v-bind="$attrs"' not in svg_tag:
            svg_tag_with_attrs = svg_tag[:-1] + ' v-bind="$attrs">'
            svg_content = svg_content.replace(svg_tag, svg_tag_with_attrs, 1)
    
    return f'''<template>
  {svg_content}
</template>

<script>
export default {{
  name: '{component_name}',
  inheritAttrs: false
}};
</script>
'''


def create_zip_archive(file_paths: List[str], output_path: str):
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_path in file_paths:
            if os.path.isfile(file_path):
                arcname = os.path.relpath(file_path, os.path.dirname(output_path))
                zipf.write(file_path, arcname)
    logger.info(f"ZIP包已创建: {output_path}")


def generate_report(results: List[OptimizationResult], output_path: Optional[str] = None):
    table = Table(title="SVG 优化报告")
    table.add_column("文件名", style="cyan", no_wrap=True)
    table.add_column("原始大小", justify="right")
    table.add_column("优化后大小", justify="right")
    table.add_column("节省", justify="right")
    table.add_column("节省百分比", justify="right")
    table.add_column("方法", justify="center")
    table.add_column("状态", justify="center")
    
    total_original = 0
    total_optimized = 0
    success_count = 0
    failed_count = 0
    scour_count = 0
    backup_count = 0
    
    for result in results:
        saved, percent = calculate_savings(result.original_size, result.optimized_size)
        total_original += result.original_size
        total_optimized += result.optimized_size
        
        if result.status == 'success':
            success_count += 1
            if result.used_scour:
                scour_count += 1
                method = "[green]Scour[/green]"
            else:
                backup_count += 1
                method = "[yellow]备用[/yellow]"
            
            color = "green" if percent > 0 else "red"
            status = "[green]✓[/green]"
        else:
            failed_count += 1
            method = "[red]错误[/red]"
            color = "red"
            status = "[red]✗[/red]"
            percent = 0
        
        table.add_row(
            result.filename,
            format_size(result.original_size),
            format_size(result.optimized_size),
            format_size(saved),
            f"[{color}]{percent:.2f}%[/{color}]",
            method,
            status
        )
    
    total_saved, total_percent = calculate_savings(total_original, total_optimized)
    table.add_row(
        "[bold]总计[/bold]",
        f"[bold]{format_size(total_original)}[/bold]",
        f"[bold]{format_size(total_optimized)}[/bold]",
        f"[bold]{format_size(total_saved)}[/bold]",
        f"[bold green]{total_percent:.2f}%[/bold green]",
        f"[green]{scour_count}[/green]/[yellow]{backup_count}[/yellow]/[red]{failed_count}[/red]",
        f"[green]{success_count}[/green]/[red]{failed_count}[/red]"
    )
    
    console.print(table)
    
    console.print(f"\n[dim]统计: 成功 {success_count} | 失败 {failed_count} | Scour优化 {scour_count} | 备用优化 {backup_count}[/dim]")
    
    if output_path:
        report_content = "# SVG 优化报告\n\n"
        report_content += f"## 处理统计\n\n"
        report_content += f"- 总文件数: {len(results)}\n"
        report_content += f"- 成功: {success_count}\n"
        report_content += f"- 失败: {failed_count}\n"
        report_content += f"- Scour优化: {scour_count}\n"
        report_content += f"- 备用优化: {backup_count}\n\n"
        report_content += f"## 详细结果\n\n"
        report_content += f"| 文件名 | 原始大小 | 优化后大小 | 节省 | 节省百分比 | 方法 | 状态 |\n"
        report_content += f"|--------|----------|------------|------|------------|------|------|\n"
        
        for result in results:
            saved, percent = calculate_savings(result.original_size, result.optimized_size)
            method = "Scour" if result.used_scour else "备用"
            status = "成功" if result.status == 'success' else f"失败: {result.error_message}"
            report_content += f"| {result.filename} | {format_size(result.original_size)} | {format_size(result.optimized_size)} | {format_size(saved)} | {percent:.2f}% | {method} | {status} |\n"
        
        report_content += f"\n## 总计\n"
        report_content += f"- 原始大小: {format_size(total_original)}\n"
        report_content += f"- 优化后大小: {format_size(total_optimized)}\n"
        report_content += f"- 总节省: {format_size(total_saved)} ({total_percent:.2f}%)\n"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        console.print(f"\n[green]报告已保存到: {output_path}[/green]")


def process_single_file(
    svg_file: str,
    optimizer: SVGOptimizer,
    output_dir: Optional[str],
    preview: bool,
    backup: bool,
    backup_dir: Optional[str],
    to_react: bool,
    to_vue: bool
) -> OptimizationResult:
    filename = os.path.basename(svg_file)
    original_size = get_file_size(svg_file)
    result = OptimizationResult(
        filename=filename,
        original_size=original_size,
        optimized_size=original_size,
        optimization_level=optimizer.level
    )
    
    try:
        with open(svg_file, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        optimized_content, used_scour = optimizer.optimize(original_content)
        optimized_size = len(optimized_content.encode('utf-8'))
        
        result.optimized_size = optimized_size
        result.used_scour = used_scour
        
        if not preview:
            if backup:
                result.backup_path = create_backup(svg_file, backup_dir)
            
            if output_dir:
                output_path = os.path.join(output_dir, filename)
            else:
                output_path = svg_file
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(optimized_content)
            
            result.output_path = output_path
            
            if to_react:
                react_dir = os.path.join(output_dir or os.path.dirname(svg_file), 'react-components')
                os.makedirs(react_dir, exist_ok=True)
                component_name = os.path.splitext(filename)[0]
                react_content = convert_to_react_component(optimized_content, component_name)
                react_path = os.path.join(react_dir, f"{component_name}.jsx")
                with open(react_path, 'w', encoding='utf-8') as f:
                    f.write(react_content)
                result.react_path = react_path
            
            if to_vue:
                vue_dir = os.path.join(output_dir or os.path.dirname(svg_file), 'vue-components')
                os.makedirs(vue_dir, exist_ok=True)
                component_name = os.path.splitext(filename)[0]
                vue_content = convert_to_vue_component(optimized_content, component_name)
                vue_path = os.path.join(vue_dir, f"{component_name}.vue")
                with open(vue_path, 'w', encoding='utf-8') as f:
                    f.write(vue_content)
                result.vue_path = vue_path
        
        result.status = 'success'
        
    except Exception as e:
        result.status = 'failed'
        result.error_message = str(e)
        logger.error(f"处理 {filename} 时出错: {e}")
    
    return result


@click.command()
@click.argument('input_dir', type=click.Path(exists=True, file_okay=False))
@click.option('-o', '--output-dir', type=click.Path(file_okay=False), help='输出目录，不指定则覆盖原文件')
@click.option('-l', '--level', type=click.Choice(['light', 'medium', 'aggressive'], case_sensitive=False), default='medium', help='优化级别')
@click.option('-p', '--preview', is_flag=True, help='预览模式，只显示效果不保存')
@click.option('-r', '--report', is_flag=True, help='生成优化报告')
@click.option('-b', '--backup', is_flag=True, help='备份原始文件')
@click.option('--backup-dir', type=click.Path(file_okay=False), help='备份目录')
@click.option('--sprite', is_flag=True, help='生成SVG精灵图')
@click.option('--sprite-name', default='sprite.svg', help='精灵图文件名')
@click.option('--sprite-css', is_flag=True, help='生成精灵图CSS')
@click.option('--to-react', is_flag=True, help='转换为React组件')
@click.option('--to-vue', is_flag=True, help='转换为Vue组件')
@click.option('--zip', 'create_zip', is_flag=True, help='打包为ZIP文件')
@click.option('--zip-name', default='optimized_svgs.zip', help='ZIP文件名')
@click.option('--workers', '-w', type=int, default=1, help='并发处理线程数 (默认: 1, 建议: CPU核心数)')
@click.option('--verbose', '-v', is_flag=True, help='显示详细日志')
def main(input_dir, output_dir, level, preview, report, backup, backup_dir, sprite, sprite_name, sprite_css, to_react, to_vue, create_zip, zip_name, workers, verbose):
    """SVG图标批量优化工具 - 支持并发处理、精灵图生成、组件转换等功能"""
    
    if verbose:
        logger.setLevel(logging.DEBUG)
    
    console.print("[bold blue]═══════════════════════════════════════[/bold blue]")
    console.print("[bold blue]       SVG 批量优化工具 v2.0[/bold blue]")
    console.print("[bold blue]═══════════════════════════════════════[/bold blue]\n")
    
    console.print(f"[cyan]输入目录:[/cyan] {input_dir}")
    console.print(f"[cyan]优化级别:[/cyan] {level}")
    console.print(f"[cyan]并发线程:[/cyan] {workers}")
    if output_dir:
        console.print(f"[cyan]输出目录:[/cyan] {output_dir}")
    if preview:
        console.print("[yellow]预览模式: 只显示优化效果，不保存文件[/yellow]")
    if backup:
        console.print(f"[cyan]备份:[/cyan] 启用 {'(备份目录: ' + backup_dir + ')' if backup_dir else '(原位备份)'}")
    if sprite:
        console.print(f"[cyan]精灵图:[/cyan] 启用 {'(含CSS)' if sprite_css else ''}")
    if to_react:
        console.print("[cyan]React组件:[/cyan] 启用")
    if to_vue:
        console.print("[cyan]Vue组件:[/cyan] 启用")
    if create_zip:
        console.print("[cyan]ZIP打包:[/cyan] 启用")
    console.print()
    
    svg_files = find_svg_files(input_dir)
    
    if not svg_files:
        console.print("[yellow]未找到SVG文件[/yellow]")
        return
    
    console.print(f"找到 [green]{len(svg_files)}[/green] 个SVG文件\n")
    
    optimizer = SVGOptimizer(level=level)
    results: List[OptimizationResult] = []
    output_files: List[str] = []
    
    if output_dir and not preview:
        os.makedirs(output_dir, exist_ok=True)
        logger.info(f"已创建输出目录: {output_dir}")
    
    if workers > 1 and len(svg_files) > 1:
        console.print(f"[bold]使用 {workers} 线程并发处理...[/bold]\n")
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            TextColumn("({task.completed}/{task.total})"),
            console=console
        ) as progress:
            task = progress.add_task("优化中...", total=len(svg_files))
            
            with ThreadPoolExecutor(max_workers=workers) as executor:
                future_to_file = {
                    executor.submit(
                        process_single_file,
                        svg_file,
                        optimizer,
                        output_dir,
                        preview,
                        backup,
                        backup_dir,
                        to_react,
                        to_vue
                    ): svg_file for svg_file in svg_files
                }
                
                for future in as_completed(future_to_file):
                    result = future.result()
                    results.append(result)
                    progress.advance(task)
                    
                    if result.status == 'success':
                        saved, percent = calculate_savings(result.original_size, result.optimized_size)
                        method = "Scour" if result.used_scour else "备用"
                        console.print(f"[green]✓[/green] {result.filename}: {format_size(result.original_size)} → {format_size(result.optimized_size)} ([green]{percent:.2f}%[/green] 节省) [{method}]")
                        
                        if not preview and result.output_path:
                            output_files.append(result.output_path)
                            if result.react_path:
                                output_files.append(result.react_path)
                            if result.vue_path:
                                output_files.append(result.vue_path)
                    else:
                        console.print(f"[red]✗[/red] {result.filename}: 错误 - {result.error_message}")
    else:
        console.print("[bold]单线程处理...[/bold]\n")
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            TextColumn("({task.completed}/{task.total})"),
            console=console
        ) as progress:
            task = progress.add_task("优化中...", total=len(svg_files))
            
            for svg_file in svg_files:
                result = process_single_file(
                    svg_file,
                    optimizer,
                    output_dir,
                    preview,
                    backup,
                    backup_dir,
                    to_react,
                    to_vue
                )
                results.append(result)
                progress.advance(task)
                
                if result.status == 'success':
                    saved, percent = calculate_savings(result.original_size, result.optimized_size)
                    method = "Scour" if result.used_scour else "备用"
                    console.print(f"[green]✓[/green] {result.filename}: {format_size(result.original_size)} → {format_size(result.optimized_size)} ([green]{percent:.2f}%[/green] 节省) [{method}]")
                    
                    if not preview and result.output_path:
                        output_files.append(result.output_path)
                        if result.react_path:
                            output_files.append(result.react_path)
                        if result.vue_path:
                            output_files.append(result.vue_path)
                else:
                    console.print(f"[red]✗[/red] {result.filename}: 错误 - {result.error_message}")
    
    console.print()
    
    if sprite and not preview:
        sprite_path = os.path.join(output_dir or input_dir, sprite_name)
        css_path = os.path.join(output_dir or input_dir, 'sprite.css') if sprite_css else None
        svg_output_files = [f for f in output_files if f.lower().endswith('.svg')]
        generate_sprite(svg_output_files or svg_files, sprite_path, css_path)
        output_files.append(sprite_path)
        if css_path:
            output_files.append(css_path)
        console.print(f"[green]✓ 精灵图已生成: {sprite_path}[/green]\n")
    
    if report:
        report_path = os.path.join(output_dir or input_dir, 'optimization_report.md') if not preview else None
        generate_report(results, report_path)
    
    if create_zip and not preview:
        zip_path = os.path.join(output_dir or input_dir, zip_name)
        create_zip_archive(output_files, zip_path)
        console.print(f"\n[green]✓ ZIP包已生成: {zip_path}[/green]")
    
    success_count = sum(1 for r in results if r.status == 'success')
    failed_count = sum(1 for r in results if r.status == 'failed')
    total_saved = sum(r.original_size - r.optimized_size for r in results if r.status == 'success')
    total_original = sum(r.original_size for r in results)
    total_percent = (total_saved / total_original * 100) if total_original > 0 else 0
    
    console.print("\n[bold green]═══════════════════════════════════════[/bold green]")
    console.print("[bold green]            处理完成！[/bold green]")
    console.print(f"[bold green]  成功: {success_count} | 失败: {failed_count} | 节省: {format_size(total_saved)} ({total_percent:.2f}%)[/bold green]")
    console.print("[bold green]═══════════════════════════════════════[/bold green]\n")


if __name__ == '__main__':
    main()
