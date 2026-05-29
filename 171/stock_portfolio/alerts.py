from datetime import datetime
from typing import Dict, List, Optional
from .database import execute_query
from .portfolio import get_all_positions_with_prices, set_alert_prices
from .price_fetcher import normalize_stock_code


def add_alert(portfolio_id: int, stock_code: str, alert_type: str, 
              target_price: float) -> int:
    stock_code = normalize_stock_code(stock_code)
    
    alert_type = alert_type.upper()
    if alert_type not in ["TAKE_PROFIT", "STOP_LOSS"]:
        raise ValueError("Alert type must be 'TAKE_PROFIT' or 'STOP_LOSS'")
    
    return execute_query(
        """INSERT INTO alerts (portfolio_id, stock_code, alert_type, target_price)
           VALUES (?, ?, ?, ?)""",
        (portfolio_id, stock_code, alert_type, target_price)
    )


def delete_alert(alert_id: int) -> None:
    execute_query("DELETE FROM alerts WHERE id = ?", (alert_id,))


def list_alerts(portfolio_id: int, include_triggered: bool = False) -> List[Dict]:
    query = "SELECT * FROM alerts WHERE portfolio_id = ?"
    params = [portfolio_id]
    
    if not include_triggered:
        query += " AND triggered = 0"
    
    query += " ORDER BY created_at DESC"
    
    return execute_query(query, tuple(params), fetch=True)


def check_alerts(portfolio_id: int) -> List[Dict]:
    positions = get_all_positions_with_prices(portfolio_id)
    alerts = list_alerts(portfolio_id, include_triggered=False)
    
    price_map = {p["stock_code"]: p["current_price"] for p in positions}
    name_map = {p["stock_code"]: p["stock_name"] for p in positions}
    
    triggered = []
    now = datetime.now()
    
    for alert in alerts:
        stock_code = alert["stock_code"]
        current_price = price_map.get(stock_code, 0)
        
        if current_price <= 0:
            continue
        
        should_trigger = False
        if alert["alert_type"] == "TAKE_PROFIT" and current_price >= alert["target_price"]:
            should_trigger = True
        elif alert["alert_type"] == "STOP_LOSS" and current_price <= alert["target_price"]:
            should_trigger = True
        
        if should_trigger:
            execute_query(
                "UPDATE alerts SET triggered = 1, triggered_at = ? WHERE id = ?",
                (now, alert["id"])
            )
            
            triggered.append({
                **alert,
                "stock_name": name_map.get(stock_code, stock_code),
                "current_price": current_price,
            })
    
    return triggered


def check_position_alerts(positions: List[Dict], portfolio_id: int) -> List[Dict]:
    triggered = []
    now = datetime.now()
    
    for pos in positions:
        current_price = pos["current_price"]
        take_profit = pos.get("take_profit_price")
        stop_loss = pos.get("stop_loss_price")
        
        if take_profit and current_price >= take_profit:
            triggered.append({
                "id": pos["id"],
                "stock_code": pos["stock_code"],
                "stock_name": pos["stock_name"],
                "alert_type": "TAKE_PROFIT",
                "target_price": take_profit,
                "current_price": current_price,
                "from_position": True,
            })
        
        if stop_loss and current_price <= stop_loss:
            triggered.append({
                "id": pos["id"],
                "stock_code": pos["stock_code"],
                "stock_name": pos["stock_name"],
                "alert_type": "STOP_LOSS",
                "target_price": stop_loss,
                "current_price": current_price,
                "from_position": True,
            })
    
    return triggered


def print_alert_notification(alert: Dict) -> None:
    stock_name = alert.get("stock_name", alert["stock_code"])
    alert_type = alert["alert_type"].replace("_", " ")
    current_price = alert["current_price"]
    target_price = alert["target_price"]
    
    print("\n" + "=" * 60)
    print("  *** 价格预警 ***")
    print("=" * 60)
    print(f"  股票: {stock_name} ({alert['stock_code']})")
    print(f"  类型: {alert_type}")
    print(f"  目标价: {target_price:.2f}")
    print(f"  当前价: {current_price:.2f}")
    
    if alert["alert_type"] == "TAKE_PROFIT":
        print(f"  状态: 🎉 已达到止盈目标！涨幅达到 {(current_price/target_price - 1)*100:.2f}%")
    else:
        print(f"  状态: ⚠️  已触发止损！跌幅达到 {(1 - current_price/target_price)*100:.2f}%")
    
    print("=" * 60 + "\n")


def set_position_alert_prices(portfolio_id: int, stock_code: str,
                              take_profit: Optional[float] = None,
                              stop_loss: Optional[float] = None) -> None:
    set_alert_prices(portfolio_id, stock_code, take_profit, stop_loss)


def dismiss_alert(alert_id: int) -> None:
    execute_query(
        "UPDATE alerts SET triggered = 0, triggered_at = NULL WHERE id = ?",
        (alert_id,)
    )
