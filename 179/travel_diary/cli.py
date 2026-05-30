import click
import sys
import os
from datetime import datetime
from pathlib import Path

from .manager import DiaryManager
from .models import Location
from .report import ReportGenerator
from .map_generator import MapGenerator
from .statistics import StatisticsAnalyzer
from .zip_utils import ZipManager
from .storage import StorageManager


class Context:
    def __init__(self):
        self.manager = DiaryManager()
        self.report = ReportGenerator(self.manager)
        self.map_gen = MapGenerator(self.manager)
        self.stats = StatisticsAnalyzer(self.manager)
        self.zip_mgr = ZipManager(self.manager.storage)


pass_ctx = click.make_pass_decorator(Context)


@click.group()
@click.version_option(version="1.0.0", prog_name="travel-diary")
@click.pass_context
def cli(ctx):
    """✈️  旅行日记 - 记录您的每一段美好旅程
    
    一个功能丰富的命令行旅行日记工具，支持：
    • 创建和管理多个旅行计划
    • 每日记录文字日记和开销
    • 上传心情照片
    • 生成Markdown/PDF旅行报告
    • 生成Leaflet交互式地图
    • 详细的开销统计分析
    • 数据的导入导出
    """
    ctx.obj = Context()


@cli.group()
def user():
    """👤 用户管理 - 创建和管理用户账户"""
    pass


@user.command("create")
@click.argument("username")
@click.option("--name", "-n", help="显示名称")
@click.option("--email", "-e", help="邮箱地址")
@pass_ctx
def create_user(ctx, username, name, email):
    """创建新用户"""
    try:
        user = ctx.manager.create_user(username, name, email)
        click.secho(f"✅ 用户创建成功!", fg="green")
        click.echo(f"   用户名: {user.username}")
        click.echo(f"   显示名: {user.display_name}")
        if user.email:
            click.echo(f"   邮箱: {user.email}")
    except ValueError as e:
        click.secho(f"❌ 错误: {e}", fg="red")
        sys.exit(1)


@user.command("list")
@pass_ctx
def list_users(ctx):
    """列出所有用户"""
    users = ctx.manager.list_users()
    if not users:
        click.echo("暂无用户，请先使用 'travel-diary user create' 创建用户")
        return
    click.secho("📋 用户列表:", fg="cyan")
    for u in users:
        user = ctx.manager.get_user(u)
        trips = ctx.manager.list_trips(u)
        click.echo(f"  • {u} ({user.display_name}) - {len(trips)} 次旅行")


@user.command("delete")
@click.argument("username")
@click.option("--yes", is_flag=True, help="跳过确认")
@pass_ctx
def delete_user(ctx, username, yes):
    """删除用户及其所有数据"""
    if not ctx.manager.storage.user_exists(username):
        click.secho(f"❌ 用户 '{username}' 不存在", fg="red")
        sys.exit(1)
    if not yes:
        click.secho(f"⚠️  警告: 这将删除用户 '{username}' 的所有数据，包括旅行、日记和照片!", fg="yellow")
        click.confirm("确定要删除吗?", abort=True)
    ctx.manager.delete_user(username)
    click.secho(f"✅ 用户 '{username}' 已删除", fg="green")


@cli.group()
@click.argument("username")
@click.pass_context
def trip(ctx, username):
    """✈️  旅行管理 - 创建和管理旅行计划
    
    使用方式: travel-diary trip <用户名> <子命令>
    """
    if not ctx.obj.manager.storage.user_exists(username):
        click.secho(f"❌ 用户 '{username}' 不存在", fg="red")
        sys.exit(1)
    ctx.obj.username = username


@trip.command("create")
@click.option("--name", "-n", required=True, help="旅行名称")
@click.option("--destination", "-d", required=True, help="目的地")
@click.option("--start", "-s", required=True, help="出发日期 (YYYY-MM-DD)")
@click.option("--end", "-e", required=True, help="返回日期 (YYYY-MM-DD)")
@click.option("--description", "-m", help="旅行描述")
@pass_ctx
def create_trip(ctx, name, destination, start, end, description):
    """创建新旅行计划"""
    try:
        trip = ctx.manager.create_trip(ctx.username, name, destination, start, end, description)
        click.secho(f"✅ 旅行创建成功!", fg="green")
        click.echo(f"   旅行ID: {trip.id}")
        click.echo(f"   名称: {trip.name}")
        click.echo(f"   目的地: {trip.destination}")
        click.echo(f"   日期: {trip.start_date} ~ {trip.end_date}")
        if trip.description:
            click.echo(f"   描述: {trip.description}")
    except ValueError as e:
        click.secho(f"❌ 错误: {e}", fg="red")
        sys.exit(1)


@trip.command("list")
@pass_ctx
def list_trips(ctx):
    """列出用户的所有旅行"""
    trips = ctx.manager.list_trips(ctx.username)
    if not trips:
        click.echo(f"用户 '{ctx.username}' 暂无旅行计划")
        return
    click.secho(f"📋 {ctx.username} 的旅行列表:", fg="cyan")
    click.echo("-" * 70)
    for t in trips:
        status = "✓ 已完成" if t.end_date < datetime.now().strftime("%Y-%m-%d") else "🔄 进行中"
        total = t.get_total_expenses()
        click.echo(f"  [{t.id[:8]}] {t.name}")
        click.echo(f"        📍 {t.destination} | 📅 {t.start_date} ~ {t.end_date} | {status}")
        click.echo(f"        📝 {len(t.diary_entries)} 篇日记 | 💰 ¥{total:.2f}")
        click.echo()


@trip.command("show")
@click.argument("trip_id")
@pass_ctx
def show_trip(ctx, trip_id):
    """显示旅行详情和日记"""
    diary_text = ctx.manager.get_diary_text(ctx.username, trip_id)
    if not diary_text:
        click.secho(f"❌ 旅行 '{trip_id}' 不存在", fg="red")
        sys.exit(1)
    click.echo(diary_text)


@trip.command("update")
@click.argument("trip_id")
@click.option("--name", help="旅行名称")
@click.option("--destination", help="目的地")
@click.option("--start", help="出发日期")
@click.option("--end", help="返回日期")
@click.option("--description", help="旅行描述")
@pass_ctx
def update_trip(ctx, trip_id, name, destination, start, end, description):
    """更新旅行信息"""
    kwargs = {}
    if name: kwargs["name"] = name
    if destination: kwargs["destination"] = destination
    if start: kwargs["start_date"] = start
    if end: kwargs["end_date"] = end
    if description: kwargs["description"] = description
    if not kwargs:
        click.secho("❌ 请至少指定一个要更新的字段", fg="red")
        sys.exit(1)
    trip = ctx.manager.update_trip(ctx.username, trip_id, **kwargs)
    if not trip:
        click.secho(f"❌ 旅行 '{trip_id}' 不存在", fg="red")
        sys.exit(1)
    click.secho(f"✅ 旅行信息已更新", fg="green")


@trip.command("delete")
@click.argument("trip_id")
@click.option("--yes", is_flag=True, help="跳过确认")
@pass_ctx
def delete_trip(ctx, trip_id, yes):
    """删除旅行"""
    trip = ctx.manager.get_trip(ctx.username, trip_id)
    if not trip:
        click.secho(f"❌ 旅行 '{trip_id}' 不存在", fg="red")
        sys.exit(1)
    if not yes:
        click.secho(f"⚠️  警告: 这将删除旅行 '{trip.name}' 的所有数据!", fg="yellow")
        click.confirm("确定要删除吗?", abort=True)
    ctx.manager.delete_trip(ctx.username, trip_id)
    click.secho(f"✅ 旅行 '{trip.name}' 已删除", fg="green")


@trip.command("add-diary")
@click.argument("trip_id")
@click.option("--date", "-d", required=True, help="日期 (YYYY-MM-DD)")
@click.option("--content", "-c", required=True, help="日记内容")
@click.option("--mood", "-m", help="心情")
@click.option("--photo", "-p", help="照片路径")
@click.option("--location-name", help="位置名称")
@click.option("--lat", type=float, help="纬度")
@click.option("--lng", type=float, help="经度")
@pass_ctx
def add_diary(ctx, trip_id, date, content, mood, photo, location_name, lat, lng):
    """添加日记"""
    try:
        location = None
        if location_name and lat is not None and lng is not None:
            location = Location(name=location_name, latitude=lat, longitude=lng)
        entry = ctx.manager.add_diary_entry(
            ctx.username, trip_id, date, content, mood, photo, location
        )
        click.secho(f"✅ 日记已添加 ({date})", fg="green")
        click.echo(f"   心情: {entry.mood or '未设置'}")
        if entry.photo_path:
            click.echo(f"   照片: {entry.photo_path}")
        if entry.location:
            click.echo(f"   位置: {entry.location.name} ({entry.location.latitude}, {entry.location.longitude})")
    except ValueError as e:
        click.secho(f"❌ 错误: {e}", fg="red")
        sys.exit(1)


@trip.command("add-expense")
@click.argument("trip_id")
@click.option("--date", "-d", required=True, help="日期 (YYYY-MM-DD)")
@click.option("--category", "-c", required=True,
              type=click.Choice(["餐饮", "住宿", "交通", "门票", "购物", "娱乐", "其他"]),
              help="开销类别")
@click.option("--amount", "-a", required=True, type=float, help="金额")
@click.option("--description", "-m", help="描述")
@click.option("--currency", default="CNY", help="货币")
@pass_ctx
def add_expense(ctx, trip_id, date, category, amount, description, currency):
    """添加开销记录"""
    try:
        expense = ctx.manager.add_expense(
            ctx.username, trip_id, date, category, amount, description, currency
        )
        click.secho(f"✅ 开销已添加 ({date})", fg="green")
        click.echo(f"   类别: {expense.category}")
        click.echo(f"   金额: ¥{expense.amount:.2f}")
        if expense.description:
            click.echo(f"   描述: {expense.description}")
    except ValueError as e:
        click.secho(f"❌ 错误: {e}", fg="red")
        sys.exit(1)


@trip.command("stats")
@click.argument("trip_id")
@pass_ctx
def show_stats(ctx, trip_id):
    """显示旅行开销统计"""
    trip = ctx.manager.get_trip(ctx.username, trip_id)
    if not trip:
        click.secho(f"❌ 旅行 '{trip_id}' 不存在", fg="red")
        sys.exit(1)
    summary = ctx.stats.print_summary(ctx.username, trip_id)
    click.echo(summary)


@trip.command("report")
@click.argument("trip_id")
@click.option("--pdf", is_flag=True, help="同时生成PDF报告")
@click.option("--output", "-o", help="输出文件路径")
@pass_ctx
def generate_report(ctx, trip_id, pdf, output):
    """生成旅行报告 (Markdown/PDF)"""
    try:
        md_path = ctx.report.generate_markdown_report(ctx.username, trip_id, output)
        click.secho(f"✅ Markdown报告已生成: {md_path}", fg="green")
        if pdf:
            try:
                pdf_path = ctx.report.generate_pdf_report(ctx.username, trip_id)
                click.secho(f"✅ PDF报告已生成: {pdf_path}", fg="green")
            except Exception as e:
                click.secho(f"⚠️  PDF生成失败: {e}", fg="yellow")
                click.echo("   请确保已安装: pip install markdown weasyprint")
    except ValueError as e:
        click.secho(f"❌ 错误: {e}", fg="red")
        sys.exit(1)


@trip.command("map")
@click.argument("trip_id")
@click.option("--output", "-o", help="输出文件路径")
@pass_ctx
def generate_map(ctx, trip_id, output):
    """生成Leaflet交互式地图"""
    try:
        map_path = ctx.map_gen.generate_map(ctx.username, trip_id, output)
        click.secho(f"✅ 交互式地图已生成: {map_path}", fg="green")
        click.echo("   使用浏览器打开即可查看旅行路线和停留点")
    except ValueError as e:
        click.secho(f"❌ 错误: {e}", fg="red")
        sys.exit(1)


@trip.command("export")
@click.argument("trip_id")
@click.option("--output", "-o", help="输出Zip文件路径")
@pass_ctx
def export_trip(ctx, trip_id, output):
    """导出单个旅行为Zip包"""
    try:
        zip_path = ctx.zip_mgr.export_trip(ctx.username, trip_id, output)
        click.secho(f"✅ 旅行数据已导出: {zip_path}", fg="green")
    except ValueError as e:
        click.secho(f"❌ 错误: {e}", fg="red")
        sys.exit(1)


@user.command("export")
@click.argument("username")
@click.option("--output", "-o", help="输出Zip文件路径")
@pass_ctx
def export_user(ctx, username, output):
    """导出用户所有数据为Zip包"""
    try:
        zip_path = ctx.zip_mgr.export_user_data(username, output)
        click.secho(f"✅ 用户数据已导出: {zip_path}", fg="green")
    except ValueError as e:
        click.secho(f"❌ 错误: {e}", fg="red")
        sys.exit(1)


@cli.command("import")
@click.argument("zip_path")
@click.option("--overwrite", is_flag=True, help="覆盖已存在的用户数据")
@pass_ctx
def import_data(ctx, zip_path, overwrite):
    """从Zip包导入数据"""
    try:
        result = ctx.zip_mgr.import_data(zip_path, overwrite)
        click.secho(f"✅ {result}", fg="green")
    except (ValueError, FileNotFoundError) as e:
        click.secho(f"❌ 错误: {e}", fg="red")
        sys.exit(1)


@cli.command("categories")
def list_categories():
    """📋 列出所有开销类别"""
    categories = DiaryManager.EXPENSE_CATEGORIES
    click.secho("📋 可用开销类别:", fg="cyan")
    for i, cat in enumerate(categories, 1):
        click.echo(f"  {i}. {cat}")


def main():
    cli()


if __name__ == "__main__":
    main()
