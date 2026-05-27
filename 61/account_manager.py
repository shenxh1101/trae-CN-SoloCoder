import os
import json
from typing import Dict, List, Optional
from datetime import datetime
from models import Account

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
ACCOUNTS_DIR = os.path.join(DATA_DIR, "accounts")

class AccountManager:
    def __init__(self):
        self._ensure_dirs()
        self.accounts: Dict[str, Account] = {}
        self.current_account: Optional[Account] = None
        self._load_all_accounts()

    def _ensure_dirs(self):
        os.makedirs(ACCOUNTS_DIR, exist_ok=True)

    def _load_all_accounts(self):
        for filename in os.listdir(ACCOUNTS_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(ACCOUNTS_DIR, filename)
                try:
                    account = Account.load(filepath)
                    self.accounts[account.name] = account
                except Exception as e:
                    print(f"加载账户 {filename} 失败: {e}")

    def create_account(self, name: str, initial_cash: float = 100000.0) -> Optional[Account]:
        if name in self.accounts:
            print(f"账户 {name} 已存在！")
            return None
        account = Account(name=name, cash=initial_cash)
        self.accounts[name] = account
        self._save_account(account)
        return account

    def switch_account(self, name: str) -> bool:
        if name in self.accounts:
            self.current_account = self.accounts[name]
            return True
        print(f"账户 {name} 不存在！")
        return False

    def delete_account(self, name: str) -> bool:
        if name in self.accounts:
            del self.accounts[name]
            filepath = os.path.join(ACCOUNTS_DIR, f"{name}.json")
            if os.path.exists(filepath):
                os.remove(filepath)
            if self.current_account and self.current_account.name == name:
                self.current_account = None
            return True
        return False

    def reset_account(self, name: str, initial_cash: float = 100000.0) -> Optional[Account]:
        if name in self.accounts:
            account = Account(name=name, cash=initial_cash)
            self.accounts[name] = account
            if self.current_account and self.current_account.name == name:
                self.current_account = account
            self._save_account(account)
            return account
        return None

    def save_current_account(self):
        if self.current_account:
            self._save_account(self.current_account)

    def _save_account(self, account: Account):
        filepath = os.path.join(ACCOUNTS_DIR, f"{account.name}.json")
        account.save(filepath)

    def get_account_list(self) -> List[str]:
        return sorted(self.accounts.keys())

    def get_account(self, name: str) -> Optional[Account]:
        return self.accounts.get(name)

    def take_daily_snapshot(self):
        current_date = datetime.now().strftime("%Y-%m-%d")
        for account in self.accounts.values():
            if current_date not in account.daily_snapshots:
                total_asset = self._calculate_total_asset(account)
                account.daily_snapshots[current_date] = total_asset
                self._save_account(account)

    def _calculate_total_asset(self, account: Account, stock_engine=None) -> float:
        total = account.cash
        if stock_engine:
            for code, position in account.positions.items():
                stock = stock_engine.get_stock(code)
                if stock:
                    total += position.quantity * stock.price
        return total

    def update_asset_history(self, stock_engine):
        for account in self.accounts.values():
            total_asset = self._calculate_total_asset(account, stock_engine)
            account.asset_history.append((datetime.now(), total_asset))
            if len(account.asset_history) > 10000:
                account.asset_history = account.asset_history[-10000:]
