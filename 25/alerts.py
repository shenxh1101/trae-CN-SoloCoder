import os
import sys
import platform
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from datetime import datetime
from config import ConfigManager
from stock import Stock


@dataclass
class Alert:
    id: str
    stock_code: str
    stock_name: str
    alert_type: str
    target_value: float
    triggered: bool = False
    last_triggered: Optional[datetime] = None
    enabled: bool = True
    created_at: datetime = field(default_factory=datetime.now)

    def check(self, stock: Stock) -> bool:
        if not self.enabled or self.triggered:
            return False
            
        current_price = stock.current_price
        change_percent = stock.change_percent
        
        if self.alert_type == "price_ge":
            return current_price >= self.target_value
        elif self.alert_type == "price_le":
            return current_price <= self.target_value
        elif self.alert_type == "change_ge":
            return change_percent >= self.target_value
        elif self.alert_type == "change_le":
            return change_percent <= self.target_value
            
        return False

    def get_description(self) -> str:
        type_map = {
            "price_ge": "价格大于等于",
            "price_le": "价格小于等于",
            "change_ge": "涨幅大于等于",
            "change_le": "跌幅大于等于"
        }
        
        type_desc = type_map.get(self.alert_type, self.alert_type)
        if self.alert_type in ["price_ge", "price_le"]:
            return f"{self.stock_name}({self.stock_code}) {type_desc} {self.target_value:.2f}"
        else:
            return f"{self.stock_name}({self.stock_code}) {type_desc} {self.target_value:.2f}%"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "stock_code": self.stock_code,
            "stock_name": self.stock_name,
            "alert_type": self.alert_type,
            "target_value": self.target_value,
            "triggered": self.triggered,
            "last_triggered": self.last_triggered.isoformat() if self.last_triggered else None,
            "enabled": self.enabled
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Alert":
        alert = cls(
            id=data["id"],
            stock_code=data["stock_code"],
            stock_name=data.get("stock_name", ""),
            alert_type=data["alert_type"],
            target_value=data["target_value"],
            triggered=data.get("triggered", False),
            enabled=data.get("enabled", True)
        )
        if data.get("last_triggered"):
            alert.last_triggered = datetime.fromisoformat(data["last_triggered"])
        return alert


class AlertManager:
    VALID_TYPES = ["price_ge", "price_le", "change_ge", "change_le"]

    def __init__(self, config_manager: ConfigManager):
        self.config_manager = config_manager
        self.alerts: Dict[str, Alert] = {}
        self._load_from_config()

    def _load_from_config(self) -> None:
        config = self.config_manager.get_config()
        alerts_data = config.get("alerts", [])
        
        for alert_data in alerts_data:
            try:
                alert = Alert.from_dict(alert_data)
                self.alerts[alert.id] = alert
            except Exception as e:
                print(f"加载提醒失败: {e}")

    def _save_to_config(self) -> None:
        config = self.config_manager.get_config()
        config["alerts"] = [alert.to_dict() for alert in self.alerts.values()]
        self.config_manager.save_config(config)

    def _generate_id(self) -> str:
        import uuid
        return str(uuid.uuid4())[:8]

    def add_alert(self, stock_code: str, stock_name: str, alert_type: str, 
                  target_value: float) -> Optional[Alert]:
        if alert_type not in self.VALID_TYPES:
            return None
            
        alert_id = self._generate_id()
        alert = Alert(
            id=alert_id,
            stock_code=stock_code,
            stock_name=stock_name,
            alert_type=alert_type,
            target_value=target_value
        )
        
        self.alerts[alert_id] = alert
        self._save_to_config()
        return alert

    def remove_alert(self, alert_id: str) -> bool:
        if alert_id not in self.alerts:
            return False
        del self.alerts[alert_id]
        self._save_to_config()
        return True

    def enable_alert(self, alert_id: str) -> bool:
        if alert_id not in self.alerts:
            return False
        self.alerts[alert_id].enabled = True
        self._save_to_config()
        return True

    def disable_alert(self, alert_id: str) -> bool:
        if alert_id not in self.alerts:
            return False
        self.alerts[alert_id].enabled = False
        self._save_to_config()
        return True

    def reset_alert(self, alert_id: str) -> bool:
        if alert_id not in self.alerts:
            return False
        self.alerts[alert_id].triggered = False
        self.alerts[alert_id].last_triggered = None
        self._save_to_config()
        return True

    def get_alert(self, alert_id: str) -> Optional[Alert]:
        return self.alerts.get(alert_id)

    def get_all_alerts(self) -> List[Alert]:
        return list(self.alerts.values())

    def get_alerts_by_stock(self, stock_code: str) -> List[Alert]:
        return [alert for alert in self.alerts.values() 
                if alert.stock_code == stock_code]

    def check_alerts(self, stocks: Dict[str, Stock]) -> List[Alert]:
        triggered = []
        
        for alert in self.alerts.values():
            stock = stocks.get(alert.stock_code)
            if stock and alert.check(stock):
                alert.triggered = True
                alert.last_triggered = datetime.now()
                triggered.append(alert)
        
        if triggered:
            self._save_to_config()
            
        return triggered

    def play_alert_sound(self) -> None:
        if not self.config_manager.get_setting("alert_sound", True):
            return
            
        system = platform.system()
        try:
            if system == "Darwin":
                os.system('afplay /System/Library/Sounds/Glass.aiff > /dev/null 2>&1 &')
            elif system == "Windows":
                import winsound
                winsound.Beep(1000, 500)
            else:
                os.system('play -nq -t alsa synth 0.5 sine 440 > /dev/null 2>&1 &')
        except Exception as e:
            print(f"播放提示音失败: {e}")

    def show_alert_popup(self, alert: Alert, stock: Stock) -> None:
        if not self.config_manager.get_setting("alert_popup", True):
            return
            
        title = "⚠️ 股票提醒 ⚠️"
        message = f"""
{'=' * 50}
{title}
{'=' * 50}
股票代码: {alert.stock_code}
股票名称: {alert.stock_name}
提醒条件: {alert.get_description()}
当前价格: {stock.current_price:.2f}
涨跌幅: {stock.change_percent:+.2f}%
触发时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
{'=' * 50}
        """
        
        print("\n" + message + "\n")
        self.play_alert_sound()

    def get_alert_type_help(self) -> Dict[str, str]:
        return {
            "price_ge": "价格大于等于某值",
            "price_le": "价格小于等于某值",
            "change_ge": "涨跌幅大于等于某百分比",
            "change_le": "涨跌幅小于等于某百分比（跌幅预警）"
        }
