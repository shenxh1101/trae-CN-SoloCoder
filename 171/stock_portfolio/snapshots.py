from datetime import datetime, date
from typing import Dict, List, Optional
from .database import execute_query
from .portfolio import get_portfolio_summary, get_portfolio_by_id


def create_snapshot(portfolio_id: int, snapshot_date: str = None, 
                    cash_balance: float = 0.0) -> int:
    if snapshot_date is None:
        snapshot_date = date.today().strftime("%Y-%m-%d")
    
    summary = get_portfolio_summary(portfolio_id)
    
    total_value = summary["total_value"] + cash_balance
    total_cost = summary["total_cost"]
    total_pnl = total_value - total_cost
    
    existing = execute_query(
        "SELECT * FROM snapshots WHERE portfolio_id = ? AND snapshot_date = ?",
        (portfolio_id, snapshot_date),
        fetch=True
    )
    
    if existing:
        execute_query(
            """UPDATE snapshots 
               SET total_value = ?, total_cost = ?, total_pnl = ?, cash_balance = ?, created_at = ?
               WHERE portfolio_id = ? AND snapshot_date = ?""",
            (total_value, total_cost, total_pnl, cash_balance, datetime.now(), 
             portfolio_id, snapshot_date)
        )
        return existing[0]["id"]
    
    return execute_query(
        """INSERT INTO snapshots 
           (portfolio_id, snapshot_date, total_value, total_cost, total_pnl, cash_balance)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (portfolio_id, snapshot_date, total_value, total_cost, total_pnl, cash_balance)
    )


def create_all_portfolios_snapshot(snapshot_date: str = None, 
                                   cash_balances: Dict[int, float] = None) -> List[int]:
    from .portfolio import list_portfolios
    
    if cash_balances is None:
        cash_balances = {}
    
    portfolios = list_portfolios()
    snapshot_ids = []
    
    for pf in portfolios:
        cash = cash_balances.get(pf["id"], 0.0)
        sid = create_snapshot(pf["id"], snapshot_date, cash)
        snapshot_ids.append(sid)
    
    return snapshot_ids


def get_snapshots(portfolio_id: int, start_date: str = None, 
                  end_date: str = None, limit: int = 365) -> List[Dict]:
    query = "SELECT * FROM snapshots WHERE portfolio_id = ?"
    params = [portfolio_id]
    
    if start_date:
        query += " AND snapshot_date >= ?"
        params.append(start_date)
    
    if end_date:
        query += " AND snapshot_date <= ?"
        params.append(end_date)
    
    query += " ORDER BY snapshot_date ASC LIMIT ?"
    params.append(limit)
    
    return execute_query(query, tuple(params), fetch=True)


def get_latest_snapshot(portfolio_id: int) -> Optional[Dict]:
    results = execute_query(
        """SELECT * FROM snapshots 
           WHERE portfolio_id = ? 
           ORDER BY snapshot_date DESC LIMIT 1""",
        (portfolio_id,),
        fetch=True
    )
    return results[0] if results else None


def delete_snapshot(snapshot_id: int) -> None:
    execute_query("DELETE FROM snapshots WHERE id = ?", (snapshot_id,))


def get_asset_growth(portfolio_id: int, days: int = 30) -> Dict:
    end_date = date.today()
    start_date = date.fromordinal(end_date.toordinal() - days)
    
    snapshots = get_snapshots(
        portfolio_id,
        start_date=start_date.strftime("%Y-%m-%d"),
        end_date=end_date.strftime("%Y-%m-%d")
    )
    
    if not snapshots:
        return {}
    
    first = snapshots[0]
    last = snapshots[-1]
    
    absolute_growth = last["total_value"] - first["total_value"]
    percent_growth = (absolute_growth / first["total_value"] * 100) if first["total_value"] > 0 else 0
    
    max_value = max(s["total_value"] for s in snapshots)
    min_value = min(s["total_value"] for s in snapshots)
    
    peak = None
    max_drawdown = 0
    max_drawdown_pct = 0
    
    for i, s in enumerate(snapshots):
        if peak is None or s["total_value"] > peak:
            peak = s["total_value"]
        
        drawdown = peak - s["total_value"]
        drawdown_pct = (drawdown / peak * 100) if peak > 0 else 0
        
        if drawdown_pct > max_drawdown_pct:
            max_drawdown = drawdown
            max_drawdown_pct = drawdown_pct
    
    return {
        "start_value": first["total_value"],
        "end_value": last["total_value"],
        "absolute_growth": absolute_growth,
        "percent_growth": percent_growth,
        "max_value": max_value,
        "min_value": min_value,
        "max_drawdown": max_drawdown,
        "max_drawdown_pct": max_drawdown_pct,
        "snapshots": snapshots,
    }


def print_snapshot_summary(portfolio_id: int, days: int = 30) -> None:
    portfolio = get_portfolio_by_id(portfolio_id)
    if not portfolio:
        print(f"Portfolio not found: {portfolio_id}")
        return
    
    growth = get_asset_growth(portfolio_id, days)
    
    if not growth:
        print("\n暂无资产快照数据\n")
        return
    
    print("\n" + "=" * 70)
    print(f"  {portfolio['name']} - 资产增长分析 (近{days}天)")
    print("=" * 70)
    print()
    
    def format_value(v):
        return f"¥{v:,.2f}"
    
    def format_pct(v):
        if v >= 0:
            return f"+{v:.2f}%"
        else:
            return f"{v:.2f}%"
    
    def pnl_color(v):
        if v > 0:
            return "\033[91m"
        elif v < 0:
            return "\033[92m"
        return ""
    
    reset = "\033[0m"
    
    rows = [
        ("期初资产", format_value(growth["start_value"]), ""),
        ("期末资产", format_value(growth["end_value"]), ""),
        ("资产增长", f"{pnl_color(growth['absolute_growth'])}{format_value(growth['absolute_growth'])}{reset}", 
         f"{pnl_color(growth['percent_growth'])}{format_pct(growth['percent_growth'])}{reset}"),
        ("最高资产", format_value(growth["max_value"]), ""),
        ("最低资产", format_value(growth["min_value"]), ""),
        ("最大回撤", f"\033[93m{format_value(growth['max_drawdown'])}{reset}", 
         f"\033[93m-{growth['max_drawdown_pct']:.2f}%{reset}"),
    ]
    
    for label, value, pct in rows:
        line = f"  {label:<12} {value:>18}"
        if pct:
            line += f"  {pct:>12}"
        print(line)
    
    print()


def export_snapshots_to_csv(portfolio_id: int, output_path: str) -> str:
    from pathlib import Path
    
    portfolio = get_portfolio_by_id(portfolio_id)
    if not portfolio:
        raise ValueError(f"Portfolio not found: {portfolio_id}")
    
    snapshots = get_snapshots(portfolio_id, limit=10000)
    
    path = Path(output_path)
    if path.is_dir():
        filename = f"snapshots_{portfolio['name']}_{datetime.now().strftime('%Y%m%d')}.csv"
        path = path / filename
    
    import csv
    with open(path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(["日期", "总资产", "总成本", "总盈亏", "现金余额"])
        
        for s in snapshots:
            writer.writerow([
                s["snapshot_date"],
                s["total_value"],
                s["total_cost"],
                s["total_pnl"],
                s.get("cash_balance", 0),
            ])
    
    return str(path)


def generate_asset_curve_image(portfolio_id: int, output_path: str, 
                               days: int = 180) -> str:
    from pathlib import Path
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    import platform
    
    system = platform.system()
    if system == 'Darwin':
        plt.rcParams['font.sans-serif'] = ['PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'SimHei']
    elif system == 'Windows':
        plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei']
    else:
        plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
    plt.rcParams['axes.unicode_minus'] = False
    
    portfolio = get_portfolio_by_id(portfolio_id)
    if not portfolio:
        raise ValueError(f"Portfolio not found: {portfolio_id}")
    
    growth = get_asset_growth(portfolio_id, days)
    if not growth:
        raise ValueError("No snapshot data available")
    
    snapshots = growth["snapshots"]
    dates = [s["snapshot_date"] for s in snapshots]
    values = [s["total_value"] for s in snapshots]
    
    fig, ax = plt.subplots(figsize=(12, 6))
    
    ax.plot(dates, values, linewidth=2, color='#667eea', marker='o', markersize=3)
    ax.fill_between(dates, values, alpha=0.3, color='#667eea')
    
    ax.set_xlabel('日期', fontsize=12)
    ax.set_ylabel('总资产 (¥)', fontsize=12)
    ax.set_title(f"{portfolio['name']} - 资产曲线", fontsize=14, fontweight='bold')
    
    ax.grid(True, alpha=0.3, linestyle='--')
    
    if len(dates) > 15:
        step = len(dates) // 10
        ax.set_xticks(dates[::step])
        ax.set_xticklabels([d for d in dates[::step]], rotation=45)
    
    ax.ticklabel_format(style='plain', axis='y')
    ax.get_yaxis().set_major_formatter(
        plt.FuncFormatter(lambda x, p: format(int(x), ','))
    )
    
    start_val = values[0]
    end_val = values[-1]
    pnl = end_val - start_val
    pnl_pct = (pnl / start_val * 100) if start_val > 0 else 0
    
    bbox_props = dict(boxstyle='round', facecolor='wheat', alpha=0.8)
    color = 'red' if pnl >= 0 else 'green'
    sign = '+' if pnl >= 0 else ''
    ax.text(0.02, 0.95, f'期初: ¥{start_val:,.0f}\n期末: ¥{end_val:,.0f}\n盈亏: {sign}¥{pnl:,.0f} ({sign}{pnl_pct:.1f}%)',
            transform=ax.transAxes, fontsize=11, verticalalignment='top', bbox=bbox_props, color=color)
    
    plt.tight_layout()
    
    path = Path(output_path)
    if path.is_dir():
        filename = f"asset_curve_{portfolio['name']}_{datetime.now().strftime('%Y%m%d')}.png"
        path = path / filename
    
    plt.savefig(path, dpi=150, bbox_inches='tight')
    plt.close()
    
    return str(path)
