from datetime import datetime
from typing import Dict, List, Optional, Tuple
from .database import execute_query
from .portfolio import get_position, get_portfolio_summary
from .price_fetcher import normalize_stock_code


def sell_position(portfolio_id: int, stock_code: str, shares: float, price: float,
                  fee: float = 0.0, transaction_date: str = None,
                  notes: str = "") -> Tuple[int, float]:
    stock_code = normalize_stock_code(stock_code)
    
    if transaction_date is None:
        transaction_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    position = get_position(portfolio_id, stock_code)
    if not position:
        raise ValueError(f"Position not found: {stock_code}")
    
    if shares > position["total_shares"]:
        raise ValueError(f"Cannot sell {shares} shares, only {position['total_shares']} available")
    
    avg_cost = position["avg_cost"]
    cost_of_shares_sold = shares * avg_cost
    gross_proceeds = shares * price
    net_proceeds = gross_proceeds - fee
    realized_pnl = net_proceeds - cost_of_shares_sold
    
    new_shares = position["total_shares"] - shares
    new_total_cost = position["total_cost"] - cost_of_shares_sold
    new_avg = new_total_cost / new_shares if new_shares > 0 else 0
    
    if new_shares <= 0:
        execute_query(
            "DELETE FROM positions WHERE id = ?",
            (position["id"],)
        )
    else:
        execute_query(
            """UPDATE positions 
               SET total_shares = ?, total_cost = ?, avg_cost = ?, updated_at = ?
               WHERE id = ?""",
            (new_shares, new_total_cost, new_avg, datetime.now(), position["id"])
        )
    
    tx_id = execute_query(
        """INSERT INTO transactions 
           (portfolio_id, stock_code, transaction_type, shares, price, amount, fee, 
            transaction_date, realized_pnl, notes)
           VALUES (?, ?, 'SELL', ?, ?, ?, ?, ?, ?, ?)""",
        (portfolio_id, stock_code, shares, price, net_proceeds, fee, 
         transaction_date, realized_pnl, notes)
    )
    
    return tx_id, realized_pnl


def record_buy_transaction(portfolio_id: int, stock_code: str, shares: float, 
                           price: float, fee: float = 0.0, 
                           transaction_date: str = None, notes: str = "",
                           stock_name: str = "") -> int:
    from .portfolio import add_position
    return add_position(portfolio_id, stock_code, shares, price, stock_name, 
                        fee, transaction_date)


def list_transactions(portfolio_id: int, stock_code: str = None,
                      transaction_type: str = None, limit: int = 100) -> List[Dict]:
    query = "SELECT * FROM transactions WHERE portfolio_id = ?"
    params = [portfolio_id]
    
    if stock_code:
        stock_code = normalize_stock_code(stock_code)
        query += " AND stock_code = ?"
        params.append(stock_code)
    
    if transaction_type:
        query += " AND transaction_type = ?"
        params.append(transaction_type)
    
    query += " ORDER BY transaction_date DESC LIMIT ?"
    params.append(limit)
    
    return execute_query(query, tuple(params), fetch=True)


def get_transaction(transaction_id: int) -> Optional[Dict]:
    results = execute_query(
        "SELECT * FROM transactions WHERE id = ?",
        (transaction_id,),
        fetch=True
    )
    return results[0] if results else None


def delete_transaction(transaction_id: int) -> None:
    tx = get_transaction(transaction_id)
    if not tx:
        return
    
    portfolio_id = tx["portfolio_id"]
    stock_code = tx["stock_code"]
    shares = tx["shares"]
    price = tx["price"]
    tx_type = tx["transaction_type"]
    fee = tx["fee"]
    
    position = get_position(portfolio_id, stock_code)
    
    if tx_type == "BUY":
        if position:
            cost_to_remove = shares * price + fee
            new_shares = position["total_shares"] - shares
            new_total_cost = position["total_cost"] - cost_to_remove
            
            if new_shares <= 0:
                execute_query(
                    "DELETE FROM positions WHERE id = ?",
                    (position["id"],)
                )
            else:
                new_avg = new_total_cost / new_shares if new_shares > 0 else 0
                execute_query(
                    """UPDATE positions 
                       SET total_shares = ?, total_cost = ?, avg_cost = ?, updated_at = ?
                       WHERE id = ?""",
                    (new_shares, new_total_cost, new_avg, datetime.now(), position["id"])
                )
    elif tx_type == "SELL":
        if position:
            avg_cost = position["avg_cost"]
            cost_to_add_back = shares * avg_cost
            new_shares = position["total_shares"] + shares
            new_total_cost = position["total_cost"] + cost_to_add_back
            new_avg = new_total_cost / new_shares if new_shares > 0 else 0
            
            execute_query(
                """UPDATE positions 
                   SET total_shares = ?, total_cost = ?, avg_cost = ?, updated_at = ?
                   WHERE id = ?""",
                (new_shares, new_total_cost, new_avg, datetime.now(), position["id"])
            )
    
    execute_query("DELETE FROM transactions WHERE id = ?", (transaction_id,))


def get_realized_pnl_summary(portfolio_id: int) -> Dict:
    transactions = list_transactions(portfolio_id, transaction_type="SELL", limit=10000)
    
    total_realized_pnl = sum(tx["realized_pnl"] or 0 for tx in transactions)
    total_sold_amount = sum(tx["amount"] or 0 for tx in transactions)
    total_fees = sum(tx["fee"] or 0 for tx in transactions)
    sell_count = len(transactions)
    
    winning_trades = [tx for tx in transactions if (tx["realized_pnl"] or 0) > 0]
    losing_trades = [tx for tx in transactions if (tx["realized_pnl"] or 0) < 0]
    
    win_rate = (len(winning_trades) / sell_count * 100) if sell_count > 0 else 0
    total_win = sum(tx["realized_pnl"] or 0 for tx in winning_trades)
    total_loss = sum(tx["realized_pnl"] or 0 for tx in losing_trades)
    avg_win = total_win / len(winning_trades) if winning_trades else 0
    avg_loss = total_loss / len(losing_trades) if losing_trades else 0
    
    summary = get_portfolio_summary(portfolio_id)
    
    return {
        "total_realized_pnl": total_realized_pnl,
        "total_unrealized_pnl": summary["total_pnl"],
        "total_pnl": total_realized_pnl + summary["total_pnl"],
        "total_sold_amount": total_sold_amount,
        "total_fees": total_fees,
        "trade_count": sell_count,
        "win_count": len(winning_trades),
        "loss_count": len(losing_trades),
        "win_rate": win_rate,
        "avg_win": avg_win,
        "avg_loss": avg_loss,
        "profit_factor": abs(total_win / total_loss) if total_loss != 0 else (999.99 if total_win > 0 else 0),
    }
