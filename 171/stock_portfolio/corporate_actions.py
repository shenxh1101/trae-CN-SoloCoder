from datetime import datetime
from typing import Dict, List
from .database import execute_query
from .portfolio import get_position
from .price_fetcher import normalize_stock_code


def record_dividend(portfolio_id: int, stock_code: str, 
                    amount_per_share: float, action_date: str = None,
                    notes: str = "") -> int:
    stock_code = normalize_stock_code(stock_code)
    
    if action_date is None:
        action_date = datetime.now().strftime("%Y-%m-%d")
    
    position = get_position(portfolio_id, stock_code)
    if not position:
        raise ValueError(f"Position not found: {stock_code}")
    
    shares = position["total_shares"]
    total_amount = shares * amount_per_share
    
    action_id = execute_query(
        """INSERT INTO corporate_actions 
           (portfolio_id, stock_code, action_type, amount, action_date, notes)
           VALUES (?, ?, 'DIVIDEND', ?, ?, ?)""",
        (portfolio_id, stock_code, total_amount, action_date, notes)
    )
    
    new_total_cost = position["total_cost"] - total_amount
    new_avg_cost = new_total_cost / shares if shares > 0 else 0
    
    execute_query(
        """UPDATE positions 
           SET total_cost = ?, avg_cost = ?, updated_at = ?
           WHERE id = ?""",
        (new_total_cost, new_avg_cost, datetime.now(), position["id"])
    )
    
    return action_id


def record_stock_dividend(portfolio_id: int, stock_code: str, 
                          shares_per_holding: float, action_date: str = None,
                          notes: str = "") -> int:
    stock_code = normalize_stock_code(stock_code)
    
    if action_date is None:
        action_date = datetime.now().strftime("%Y-%m-%d")
    
    position = get_position(portfolio_id, stock_code)
    if not position:
        raise ValueError(f"Position not found: {stock_code}")
    
    current_shares = position["total_shares"]
    new_shares = current_shares * shares_per_holding
    total_new_shares = current_shares + new_shares
    
    action_id = execute_query(
        """INSERT INTO corporate_actions 
           (portfolio_id, stock_code, action_type, shares, action_date, notes)
           VALUES (?, ?, 'STOCK_DIVIDEND', ?, ?, ?)""",
        (portfolio_id, stock_code, new_shares, action_date, notes)
    )
    
    new_avg_cost = position["total_cost"] / total_new_shares if total_new_shares > 0 else 0
    
    execute_query(
        """UPDATE positions 
           SET total_shares = ?, avg_cost = ?, updated_at = ?
           WHERE id = ?""",
        (total_new_shares, new_avg_cost, datetime.now(), position["id"])
    )
    
    return action_id


def record_stock_split(portfolio_id: int, stock_code: str, 
                       split_ratio: float, action_date: str = None,
                       notes: str = "") -> int:
    stock_code = normalize_stock_code(stock_code)
    
    if action_date is None:
        action_date = datetime.now().strftime("%Y-%m-%d")
    
    position = get_position(portfolio_id, stock_code)
    if not position:
        raise ValueError(f"Position not found: {stock_code}")
    
    current_shares = position["total_shares"]
    new_shares = current_shares * split_ratio
    
    action_id = execute_query(
        """INSERT INTO corporate_actions 
           (portfolio_id, stock_code, action_type, split_ratio, shares, action_date, notes)
           VALUES (?, ?, 'SPLIT', ?, ?, ?, ?)""",
        (portfolio_id, stock_code, split_ratio, new_shares - current_shares, action_date, notes)
    )
    
    new_avg_cost = position["total_cost"] / new_shares if new_shares > 0 else 0
    
    execute_query(
        """UPDATE positions 
           SET total_shares = ?, avg_cost = ?, updated_at = ?
           WHERE id = ?""",
        (new_shares, new_avg_cost, datetime.now(), position["id"])
    )
    
    return action_id


def record_rights_issue(portfolio_id: int, stock_code: str, 
                        shares_offered: float, subscription_price: float,
                        action_date: str = None, notes: str = "") -> int:
    stock_code = normalize_stock_code(stock_code)
    
    if action_date is None:
        action_date = datetime.now().strftime("%Y-%m-%d")
    
    position = get_position(portfolio_id, stock_code)
    if not position:
        raise ValueError(f"Position not found: {stock_code}")
    
    cost_of_rights = shares_offered * subscription_price
    new_total_shares = position["total_shares"] + shares_offered
    new_total_cost = position["total_cost"] + cost_of_rights
    new_avg_cost = new_total_cost / new_total_shares if new_total_shares > 0 else 0
    
    action_id = execute_query(
        """INSERT INTO corporate_actions 
           (portfolio_id, stock_code, action_type, shares, amount, action_date, notes)
           VALUES (?, ?, 'RIGHTS_ISSUE', ?, ?, ?, ?)""",
        (portfolio_id, stock_code, shares_offered, cost_of_rights, action_date, notes)
    )
    
    execute_query(
        """UPDATE positions 
           SET total_shares = ?, total_cost = ?, avg_cost = ?, updated_at = ?
           WHERE id = ?""",
        (new_total_shares, new_total_cost, new_avg_cost, datetime.now(), position["id"])
    )
    
    return action_id


def list_corporate_actions(portfolio_id: int, stock_code: str = None) -> List[Dict]:
    if stock_code:
        stock_code = normalize_stock_code(stock_code)
        return execute_query(
            """SELECT * FROM corporate_actions 
               WHERE portfolio_id = ? AND stock_code = ?
               ORDER BY action_date DESC""",
            (portfolio_id, stock_code),
            fetch=True
        )
    else:
        return execute_query(
            """SELECT * FROM corporate_actions 
               WHERE portfolio_id = ?
               ORDER BY action_date DESC""",
            (portfolio_id,),
            fetch=True
        )


def delete_corporate_action(action_id: int) -> None:
    execute_query("DELETE FROM corporate_actions WHERE id = ?", (action_id,))
