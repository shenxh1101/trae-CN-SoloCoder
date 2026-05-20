import yaml
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class WebsiteConfig:
    name: str
    url: str
    expected_status: int
    max_response_time: float
    interval: int


@dataclass
class ConsoleConfig:
    enabled: bool = True


@dataclass
class EmailConfig:
    enabled: bool = False
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    use_tls: bool = True
    from_addr: str = ""
    to_addrs: List[str] = field(default_factory=list)


@dataclass
class WebhookConfig:
    enabled: bool = False
    url: str = ""
    type: str = "dingtalk"
    secret: str = ""


@dataclass
class NotificationConfig:
    console: ConsoleConfig = field(default_factory=ConsoleConfig)
    email: EmailConfig = field(default_factory=EmailConfig)
    webhook: WebhookConfig = field(default_factory=WebhookConfig)


@dataclass
class LoggingConfig:
    log_file: str = "monitor.log"
    log_level: str = "INFO"
    retention_days: int = 30


@dataclass
class StatsConfig:
    output_interval: int = 3600


@dataclass
class AppConfig:
    websites: List[WebsiteConfig]
    failure_threshold: int = 3
    notifications: NotificationConfig = field(default_factory=NotificationConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    stats: StatsConfig = field(default_factory=StatsConfig)


def load_config(config_path: str = "config.yaml") -> AppConfig:
    with open(config_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    websites = [
        WebsiteConfig(
            name=w["name"],
            url=w["url"],
            expected_status=w["expected_status"],
            max_response_time=w["max_response_time"],
            interval=w["interval"],
        )
        for w in data.get("websites", [])
    ]

    notifications_data = data.get("notifications", {})
    console_data = notifications_data.get("console", {})
    email_data = notifications_data.get("email", {})
    webhook_data = notifications_data.get("webhook", {})

    notifications = NotificationConfig(
        console=ConsoleConfig(
            enabled=console_data.get("enabled", True),
        ),
        email=EmailConfig(
            enabled=email_data.get("enabled", False),
            smtp_host=email_data.get("smtp_host", ""),
            smtp_port=email_data.get("smtp_port", 587),
            smtp_username=email_data.get("smtp_username", ""),
            smtp_password=email_data.get("smtp_password", ""),
            use_tls=email_data.get("use_tls", True),
            from_addr=email_data.get("from_addr", ""),
            to_addrs=email_data.get("to_addrs", []),
        ),
        webhook=WebhookConfig(
            enabled=webhook_data.get("enabled", False),
            url=webhook_data.get("url", ""),
            type=webhook_data.get("type", "dingtalk"),
            secret=webhook_data.get("secret", ""),
        ),
    )

    logging_data = data.get("logging", {})
    logging_config = LoggingConfig(
        log_file=logging_data.get("log_file", "monitor.log"),
        log_level=logging_data.get("log_level", "INFO"),
        retention_days=logging_data.get("retention_days", 30),
    )

    stats_data = data.get("stats", {})
    stats_config = StatsConfig(
        output_interval=stats_data.get("output_interval", 3600),
    )

    return AppConfig(
        websites=websites,
        failure_threshold=data.get("failure_threshold", 3),
        notifications=notifications,
        logging=logging_config,
        stats=stats_config,
    )
