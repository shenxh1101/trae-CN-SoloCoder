#!/usr/bin/env python3
import click
import sys
from pathlib import Path
from config import Config
from manual_generator import ManualGenerator
from batch_processor import BatchProcessor
from template_learner import TemplateLearner
from package_builder import PackageBuilder
from preview_editor import PreviewEditor


@click.group()
@click.version_option(version="1.0.0", prog_name="product-manual-generator")
def cli():
    """AI产品说明书自动撰写工具 - 快速生成专业的产品说明书"""
    Config.ensure_dirs()


@cli.command()
@click.option('--name', '-n', required=True, help='产品名称')
@click.option('--features', '-f', required=True, help='核心功能点，用分号分隔')
@click.option('--positioning', '-p', required=True, help='产品定位')
@click.option('--style', '-s', type=click.Choice(['professional', 'simple', 'marketing']), 
              default='professional', help='写作风格 (默认: professional)')
@click.option('--language', '-l', type=click.Choice(['zh', 'en']), 
              default='zh', help='语言 (默认: zh)')
@click.option('--format', '-fmt', type=click.Choice(['markdown', 'html', 'text']), 
              default='markdown', help='输出格式 (默认: markdown)')
@click.option('--output', '-o', help='输出文件路径')
@click.option('--template', '-t', help='使用的模板名称')
@click.option('--interactive', '-i', is_flag=True, help='交互模式，支持预览和修改')
def generate(name, features, positioning, style, language, format, output, template, interactive):
    """生成单款产品的说明书"""
    features_list = [f.strip() for f in features.split(';') if f.strip()]
    
    generator = ManualGenerator()
    
    template_structure = None
    if template:
        learner = TemplateLearner()
        template_structure = learner.load_template_analysis(template)
        click.echo(f"使用模板: {template}")
    
    click.echo(f"正在生成 {name} 的产品说明书...")
    manual = generator.generate(name, features_list, positioning, style, language, template_structure)
    
    if interactive:
        editor = PreviewEditor()
        revised_manual = editor.interactive_edit(manual)
        if revised_manual:
            manual = revised_manual
            editor.save_manual_data(manual)
        else:
            click.echo("已取消保存")
            return
    
    output_path = generator.save_manual(manual, output, format)
    click.echo(f"✓ 说明书已生成: {output_path}")
    click.echo(f"  广告语: {manual.slogan}")


@cli.command()
@click.option('--input', '-i', required=True, help='CSV文件路径')
@click.option('--output-dir', '-o', help='输出目录')
def batch(input, output_dir):
    """批量生成多款产品的说明书（从CSV文件读取）"""
    processor = BatchProcessor()
    click.echo(f"正在读取CSV文件: {input}")
    
    products = processor.load_from_csv(input)
    click.echo(f"找到 {len(products)} 款产品")
    
    if len(products) == 0:
        click.echo("错误: CSV文件中没有有效的产品信息")
        sys.exit(1)
    
    generated = processor.process_csv(input, output_dir)
    click.echo(f"\n✓ 批量生成完成，共生成 {len(generated)} 个文件")


@cli.command()
@click.option('--input', '-i', required=True, help='模板文件路径')
@click.option('--name', '-n', required=True, help='模板名称')
def learn_template(input, name):
    """从现有说明书模板中学习结构"""
    learner = TemplateLearner()
    click.echo(f"正在分析模板文件: {input}")
    
    analysis = learner.analyze_template_file(input)
    output_path = learner.save_template_analysis(analysis, name)
    
    click.echo(f"✓ 模板分析完成，已保存: {output_path}")
    click.echo(f"  风格: {analysis.get('style', 'N/A')}")
    click.echo(f"  章节数: {len(analysis.get('structure', []))}")


@cli.command()
def list_templates():
    """列出所有已学习的模板"""
    learner = TemplateLearner()
    templates = learner.list_templates()
    
    if not templates:
        click.echo("暂无已保存的模板")
        click.echo("使用 'pmg learn-template' 命令学习新模板")
        return
    
    click.echo("已保存的模板:")
    for t in templates:
        click.echo(f"  - {t}")
        try:
            analysis = learner.load_template_analysis(t)
            click.echo(f"    风格: {analysis.get('style', 'N/A')}")
            click.echo(f"    章节: {len(analysis.get('structure', []))} 个")
        except:
            pass


@cli.command()
@click.option('--name', '-n', default='default', help='模板名称')
def create_sample_template(name):
    """创建示例模板结构"""
    learner = TemplateLearner()
    output_path = learner.create_sample_template(name)
    click.echo(f"✓ 示例模板已创建: {output_path}")


@cli.command()
@click.option('--input', '-i', required=True, help='说明书数据JSON文件或目录路径')
@click.option('--images', '-img', default='', help='产品图片路径/URL，多个用分号分隔（默认使用在线真实图片）')
@click.option('--formats', '-f', default='markdown;html;text', help='包含的格式，用分号分隔')
@click.option('--output', '-o', help='输出ZIP文件或目录路径')
def package(input, images, formats, output):
    """将说明书打包成ZIP并生成产品页面（支持单文件和目录）"""
    import zipfile
    from pathlib import Path
    builder = PackageBuilder()
    editor = PreviewEditor()
    
    input_path = Path(input)
    image_list = [img.strip() for img in images.split(';') if img.strip()]
    format_list = [fmt.strip() for fmt in formats.split(';') if fmt.strip()]
    
    if input_path.is_dir():
        click.echo(f"📦 批量打包目录: {input}")
        json_files = list(input_path.glob("*_data.json"))
        
        if not json_files:
            click.echo("  警告: 未找到_data.json文件")
            return
        
        if output and Path(output).suffix == '.zip':
            click.echo(f"  将所有产品打包到单个ZIP: {output}")
            output_path = Path(output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            import tempfile
            temp_dir = Path(tempfile.mkdtemp())
            temp_files = []
            
            for json_file in json_files:
                manual = editor.load_manual_data(str(json_file))
                click.echo(f"  正在处理: {manual.product_name}")
                
                safe_name = manual.product_name.replace(' ', '_').replace('/', '_')
                product_dir = temp_dir / safe_name
                product_dir.mkdir(parents=True, exist_ok=True)
                
                for fmt in format_list:
                    ext = {'markdown': 'md', 'html': 'html', 'text': 'txt'}[fmt]
                    file_path = product_dir / f"{manual.product_name}_说明书.{ext}"
                    builder.generator.save_manual(manual, str(file_path), fmt)
                
                page_path = builder.create_product_page(manual, image_list, product_dir / f"{manual.product_name}_产品页面.html")
                
                metadata_path = product_dir / "metadata.json"
                with open(metadata_path, 'w', encoding='utf-8') as f:
                    json.dump(manual.to_dict(), f, ensure_ascii=False, indent=2)
                
                for img_path in image_list:
                    img_p = Path(img_path)
                    if img_p.exists():
                        import shutil
                        target_img = product_dir / "images" / img_p.name
                        target_img.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(img_path, target_img)
            
            with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                for file_path in temp_dir.rglob('*'):
                    if file_path.is_file():
                        arcname = file_path.relative_to(temp_dir)
                        zf.write(file_path, arcname)
            
            import shutil
            shutil.rmtree(temp_dir)
            
            click.echo(f"\n✓ 打包完成，共包含 {len(json_files)} 款产品: {output}")
        else:
            zip_files = []
            for json_file in json_files:
                manual = editor.load_manual_data(str(json_file))
                click.echo(f"  正在打包: {manual.product_name}")
                
                out_dir = Path(output) if output else input_path
                out_dir.mkdir(parents=True, exist_ok=True)
                zip_out = str(out_dir / f"{manual.product_name.replace(' ', '_')}_package.zip")
                
                zip_path = builder.create_zip_package(manual, format_list, image_list, zip_out)
                zip_files.append(zip_path)
                click.echo(f"    ✓ {zip_path}")
            
            click.echo(f"\n✓ 批量打包完成，共生成 {len(zip_files)} 个ZIP文件")
    else:
        click.echo(f"正在加载说明书数据: {input}")
        manual = editor.load_manual_data(input)
        
        click.echo(f"正在打包: {manual.product_name}")
        zip_path = builder.create_zip_package(manual, format_list, image_list, output)
        click.echo(f"✓ 打包完成: {zip_path}")

import json


@cli.command()
@click.option('--input', '-i', required=True, help='说明书数据JSON文件路径')
@click.option('--images', '-img', help='产品图片路径，多个用分号分隔')
@click.option('--output', '-o', help='输出HTML文件路径')
def product_page(input, images, output):
    """生成简易的产品展示页面"""
    builder = PackageBuilder()
    editor = PreviewEditor()
    
    click.echo(f"正在加载说明书数据: {input}")
    manual = editor.load_manual_data(input)
    
    image_list = [img.strip() for img in images.split(';')] if images else []
    
    page_path = builder.create_product_page(manual, image_list, output)
    click.echo(f"✓ 产品页面已生成: {page_path}")


@cli.command()
@click.option('--name', '-n', required=True, help='产品名称')
@click.option('--features', '-f', required=True, help='核心功能点，用分号分隔')
@click.option('--positioning', '-p', required=True, help='产品定位')
@click.option('--language', '-l', type=click.Choice(['zh', 'en']), 
              default='zh', help='语言 (默认: zh)')
def slogan(name, features, positioning, language):
    """单独生成产品广告语"""
    features_list = [f.strip() for f in features.split(';') if f.strip()]
    
    generator = ManualGenerator()
    click.echo(f"正在为 {name} 生成广告语...")
    
    slogan_text = generator.generate_slogan(name, features_list, positioning, language)
    click.echo(f"\n🎯 广告语:")
    click.echo(f"  {slogan_text}")


@cli.command()
@click.option('--input', '-i', required=True, help='说明书数据JSON文件路径')
def preview(input):
    """预览并交互式编辑已生成的说明书"""
    editor = PreviewEditor()
    
    click.echo(f"正在加载说明书数据: {input}")
    manual = editor.load_manual_data(input)
    
    revised_manual = editor.interactive_edit(manual)
    if revised_manual:
        output_path = editor.save_manual_data(revised_manual)
        click.echo(f"✓ 已保存修改: {output_path}")


@cli.command()
@click.option('--host', '-h', default='0.0.0.0', help='Web服务器主机地址')
@click.option('--port', '-p', default=5000, type=int, help='Web服务器端口')
def web(host, port):
    """启动Web界面，支持在线预览和交互式修改"""
    from web_server import run_server
    click.echo(f"🚀 启动Web服务器...")
    click.echo(f"📱 访问地址: http://{host}:{port}")
    click.echo(f"💡 按 Ctrl+C 停止服务器")
    run_server(host, port)


if __name__ == '__main__':
    cli()
