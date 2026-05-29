from datetime import datetime
from typing import Dict, List, Optional
from .database import execute_query, get_connection
from .price_fetcher import normalize_stock_code, fetch_stock_prices


def create_portfolio(name: str, description: str = "") -> int:
    query = "INSERT INTO portfolios (name, description) VALUES (?, ?)"
    return execute_query(query, (name, description))


def delete_portfolio(portfolio_id: int) -> None:
    execute_query("DELETE FROM portfolios WHERE id = ?", (portfolio_id,))


def list_portfolios() -> List[Dict]:
    return execute_query("SELECT * FROM portfolios ORDER BY created_at", fetch=True)


def get_portfolio_by_id(portfolio_id: int) -> Optional[Dict]:
    results = execute_query("SELECT * FROM portfolios WHERE id = ?", (portfolio_id,), fetch=True)
    return results[0] if results else None


def get_portfolio_by_name(name: str) -> Optional[Dict]:
    results = execute_query("SELECT * FROM portfolios WHERE name = ?", (name,), fetch=True)
    return results[0] if results else None


def get_or_create_portfolio(name: str) -> Dict:
    portfolio = get_portfolio_by_name(name)
    if portfolio:
        return portfolio
    pid = create_portfolio(name)
    return {"id": pid, "name": name, "description": ""}


def add_position(portfolio_id: int, stock_code: str, shares: float, price: float, 
                 stock_name: str = "", fee: float = 0.0, 
                 transaction_date: str = None) -> int:
    stock_code = normalize_stock_code(stock_code)
    
    if transaction_date is None:
        transaction_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    amount = shares * price + fee
    
    position = get_position(portfolio_id, stock_code)
    
    if position:
        new_shares = position["total_shares"] + shares
        new_cost = position["total_cost"] + amount
        new_avg = new_cost / new_shares if new_shares > 0 else 0
        
        execute_query(
            """UPDATE positions 
               SET total_shares = ?, total_cost = ?, avg_cost = ?, stock_name = COALESCE(?, stock_name), updated_at = ?
               WHERE id = ?""",
            (new_shares, new_cost, new_avg, stock_name, datetime.now(), position["id"])
        )
        position_id = position["id"]
    else:
        avg_cost = amount / shares if shares > 0 else 0
        position_id = execute_query(
            """INSERT INTO positions (portfolio_id, stock_code, stock_name, total_shares, total_cost, avg_cost)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (portfolio_id, stock_code, stock_name, shares, amount, avg_cost)
        )
    
    execute_query(
        """INSERT INTO transactions (portfolio_id, stock_code, transaction_type, shares, price, amount, fee, transaction_date)
           VALUES (?, ?, 'BUY', ?, ?, ?, ?, ?)""",
        (portfolio_id, stock_code, shares, price, amount, fee, transaction_date)
    )
    
    return position_id


def get_position(portfolio_id: int, stock_code: str) -> Optional[Dict]:
    stock_code = normalize_stock_code(stock_code)
    results = execute_query(
        "SELECT * FROM positions WHERE portfolio_id = ? AND stock_code = ?",
        (portfolio_id, stock_code),
        fetch=True
    )
    return results[0] if results else None


def get_all_positions(portfolio_id: int) -> List[Dict]:
    return execute_query(
        "SELECT * FROM positions WHERE portfolio_id = ? AND total_shares > 0 ORDER BY stock_code",
        (portfolio_id,),
        fetch=True
    )


def get_all_positions_with_prices(portfolio_id: int) -> List[Dict]:
    positions = get_all_positions(portfolio_id)
    if not positions:
        return []
    
    stock_codes = [p["stock_code"] for p in positions]
    price_data = fetch_stock_prices(stock_codes)
    
    enriched = []
    for pos in positions:
        code = pos["stock_code"]
        price_info = price_data.get(code, {})
        current_price = price_info.get("current", pos["avg_cost"])
        stock_name = price_info.get("name", pos["stock_name"] or code)
        
        market_value = current_price * pos["total_shares"]
        cost_basis = pos["total_cost"]
        unrealized_pnl = market_value - cost_basis
        pnl_percent = (unrealized_pnl / cost_basis * 100) if cost_basis > 0 else 0
        
        enriched.append({
            **pos,
            "stock_name": stock_name,
            "current_price": current_price,
            "market_value": market_value,
            "cost_basis": cost_basis,
            "unrealized_pnl": unrealized_pnl,
            "pnl_percent": pnl_percent,
            "prev_close": price_info.get("prev_close", 0),
            "change_today": ((current_price - price_info.get("prev_close", 0)) / 
                            price_info.get("prev_close", 1) * 100) if price_info.get("prev_close", 0) > 0 else 0,
        })
    
    return enriched


def update_position_price_info(position_id: int, stock_name: str) -> None:
    execute_query(
        "UPDATE positions SET stock_name = ?, updated_at = ? WHERE id = ?",
        (stock_name, datetime.now(), position_id)
    )


def set_alert_prices(portfolio_id: int, stock_code: str, 
                     take_profit: Optional[float] = None, 
                     stop_loss: Optional[float] = None) -> None:
    stock_code = normalize_stock_code(stock_code)
    position = get_position(portfolio_id, stock_code)
    if not position:
        raise ValueError(f"Position not found: {stock_code}")
    
    updates = []
    params = []
    if take_profit is not None:
        updates.append("take_profit_price = ?")
        params.append(take_profit)
    if stop_loss is not None:
        updates.append("stop_loss_price = ?")
        params.append(stop_loss)
    
    if updates:
        updates.append("updated_at = ?")
        params.append(datetime.now())
        params.append(position["id"])
        
        query = f"UPDATE positions SET {', '.join(updates)} WHERE id = ?"
        execute_query(query, tuple(params))


def delete_position(portfolio_id: int, stock_code: str) -> None:
    stock_code = normalize_stock_code(stock_code)
    execute_query(
        "DELETE FROM positions WHERE portfolio_id = ? AND stock_code = ?",
        (portfolio_id, stock_code)
    )


def get_portfolio_summary(portfolio_id: int) -> Dict:
    positions = get_all_positions_with_prices(portfolio_id)
    
    total_cost = sum(p["cost_basis"] for p in positions)
    total_value = sum(p["market_value"] for p in positions)
    total_pnl = total_value - total_cost
    total_pnl_percent = (total_pnl / total_cost * 100) if total_cost > 0 else 0
    
    return {
        "total_positions": len(positions),
        "total_cost": total_cost,
        "total_value": total_value,
        "total_pnl": total_pnl,
        "total_pnl_percent": total_pnl_percent,
        "positions": positions,
    }
