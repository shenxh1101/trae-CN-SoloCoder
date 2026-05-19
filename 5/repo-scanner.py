#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Git 仓库扫描与分析工具
使用 Python 标准库，支持 SQLite 存储、增量扫描、多维度分析
"""

import os
import sys
import json
import sqlite3
import subprocess
import argparse
import csv
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Tuple

# =============================================================================
# 常量配置
# =============================================================================

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = SCRIPT_DIR / "repo_data.db"
DEFAULT_CONFIG_PATH = SCRIPT_DIR / "config.json"

DEFAULT_IGNORE_DIRS = [
    "node_modules", ".venv", "venv", "__pycache__",
    "dist", "build", ".git", "target", "vendor"
]

# =============================================================================
# 日志工具
# =============================================================================

class Logger:
    """简单日志工具"""
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
    
    def info(self, msg: str) -> None:
        print(f"[INFO] {msg}")
    
    def debug(self, msg: str) -> None:
        if self.verbose:
            print(f"[DEBUG] {msg}")
    
    def warn(self, msg: str) -> None:
        print(f"[WARN] {msg}", file=sys.stderr)
    
    def error(self, msg: str) -> None:
        print(f"[ERROR] {msg}", file=sys.stderr)

logger = Logger(False)

# =============================================================================
# 配置管理
# =============================================================================

def load_config(config_path: Optional[Path] = None) -> dict:
    """加载配置文件"""
    path = config_path or DEFAULT_CONFIG_PATH
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            config = json.load(f)
        logger.debug(f"已加载配置文件: {path}")
        return config
    return {
        "scan_path": str(Path.home()),
        "ignore_dirs": DEFAULT_IGNORE_DIRS.copy(),
        "db_path": str(DEFAULT_DB_PATH)
    }

def save_config(config: dict, config_path: Optional[Path] = None) -> None:
    """保存配置文件"""
    path = config_path or DEFAULT_CONFIG_PATH
    with open(path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    logger.info(f"配置已保存到: {path}")

# =============================================================================
# 数据库层
# =============================================================================

class Database:
    """SQLite 数据库管理"""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.conn: Optional[sqlite3.Connection] = None
    
    def connect(self) -> None:
        """连接数据库"""
        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.row_factory = sqlite3.Row
    
    def close(self) -> None:
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()
            self.conn = None
    
    def init_schema(self) -> None:
        """初始化数据库表结构"""
        if not self.conn:
            self.connect()
        
        cursor = self.conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS repositories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                current_branch TEXT,
                latest_commit_hash TEXT,
                latest_commit_author TEXT,
                latest_commit_time DATETIME,
                weekly_commits INTEGER DEFAULT 0,
                total_commits INTEGER DEFAULT 0,
                last_scanned DATETIME NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS commit_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                repo_id INTEGER NOT NULL,
                commit_hash TEXT NOT NULL,
                author TEXT NOT NULL,
                commit_time DATETIME NOT NULL,
                message TEXT,
                FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
                UNIQUE(repo_id, commit_hash)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scan_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_time DATETIME NOT NULL,
                repos_scanned INTEGER DEFAULT 0,
                repos_added INTEGER DEFAULT 0,
                repos_updated INTEGER DEFAULT 0
            )
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_commit_time ON commit_history(commit_time)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_repo_path ON repositories(path)")
        
        self.conn.commit()
    
    def upsert_repo(self, repo_data: dict) -> Tuple[int, bool]:
        """插入或更新仓库信息，返回 (repo_id, is_new)"""
        cursor = self.conn.cursor()
        now = datetime.now().isoformat()
        
        cursor.execute("SELECT id FROM repositories WHERE path = ?", (repo_data["path"],))
        existing = cursor.fetchone()
        
        if existing:
            repo_id = existing["id"]
            cursor.execute("""
                UPDATE repositories SET
                    name = ?, current_branch = ?, latest_commit_hash = ?,
                    latest_commit_author = ?, latest_commit_time = ?,
                    weekly_commits = ?, total_commits = ?, last_scanned = ?, updated_at = ?
                WHERE id = ?
            """, (
                repo_data["name"], repo_data["current_branch"],
                repo_data["latest_commit_hash"], repo_data["latest_commit_author"],
                repo_data["latest_commit_time"], repo_data["weekly_commits"],
                repo_data["total_commits"], now, now, repo_id
            ))
            return repo_id, False
        else:
            cursor.execute("""
                INSERT INTO repositories (
                    path, name, current_branch, latest_commit_hash,
                    latest_commit_author, latest_commit_time, weekly_commits,
                    total_commits, last_scanned, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                repo_data["path"], repo_data["name"], repo_data["current_branch"],
                repo_data["latest_commit_hash"], repo_data["latest_commit_author"],
                repo_data["latest_commit_time"], repo_data["weekly_commits"],
                repo_data["total_commits"], now, now, now
            ))
            return cursor.lastrowid, True
    
    def insert_commits(self, repo_id: int, commits: List[dict]) -> int:
        """批量插入提交记录，返回新增数量"""
        cursor = self.conn.cursor()
        added = 0
        for commit in commits:
            try:
                cursor.execute("""
                    INSERT OR IGNORE INTO commit_history 
                    (repo_id, commit_hash, author, commit_time, message)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    repo_id, commit["hash"], commit["author"],
                    commit["time"], commit["message"]
                ))
                if cursor.rowcount > 0:
                    added += 1
            except sqlite3.IntegrityError:
                pass
        return added
    
    def get_all_repos(self) -> List[sqlite3.Row]:
        """获取所有仓库"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM repositories ORDER BY weekly_commits DESC")
        return cursor.fetchall()
    
    def get_repo_by_id(self, repo_id: int) -> Optional[sqlite3.Row]:
        """根据ID获取仓库"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM repositories WHERE id = ?", (repo_id,))
        return cursor.fetchone()
    
    def get_commits_in_range(self, repo_id: int, start: datetime, end: datetime) -> int:
        """统计指定时间范围内的提交数"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) as count FROM commit_history
            WHERE repo_id = ? AND commit_time >= ? AND commit_time < ?
        """, (repo_id, start.isoformat(), end.isoformat()))
        return cursor.fetchone()["count"]
    
    def record_scan(self, scanned: int, added: int, updated: int) -> None:
        """记录扫描历史"""
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO scan_history (scan_time, repos_scanned, repos_added, repos_updated)
            VALUES (?, ?, ?, ?)
        """, (datetime.now().isoformat(), scanned, added, updated))
        self.conn.commit()
    
    def commit(self) -> None:
        """提交事务"""
        if self.conn:
            self.conn.commit()

# =============================================================================
# Git 操作
# =============================================================================

def run_git_command(repo_path: Path, *args: str) -> Optional[str]:
    """执行 Git 命令并返回输出"""
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=str(repo_path),
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            return result.stdout.strip()
        logger.debug(f"Git 命令失败 ({repo_path}): {' '.join(args)} -> {result.stderr.strip()}")
        return None
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, FileNotFoundError) as e:
        logger.debug(f"Git 命令异常 ({repo_path}): {e}")
        return None

def is_git_repo(path: Path) -> bool:
    """检查是否为 Git 仓库"""
    git_dir = path / ".git"
    return git_dir.exists() and git_dir.is_dir()

def get_current_branch(repo_path: Path) -> Optional[str]:
    """获取当前分支"""
    return run_git_command(repo_path, "rev-parse", "--abbrev-ref", "HEAD")

def get_latest_commit(repo_path: Path) -> Optional[dict]:
    """获取最新提交信息"""
    output = run_git_command(repo_path, "log", "-1", "--pretty=format:%H|%an|%aI|%s")
    if output:
        parts = output.split("|", 3)
        if len(parts) == 4:
            return {
                "hash": parts[0],
                "author": parts[1],
                "time": parts[2],
                "message": parts[3]
            }
    return None

def get_commit_history(repo_path: Path, since: Optional[datetime] = None) -> List[dict]:
    """获取提交历史"""
    args = ["log", "--pretty=format:%H|%an|%aI|%s"]
    if since:
        args.extend(["--since", since.isoformat()])
    
    output = run_git_command(repo_path, *args)
    if not output:
        return []
    
    commits = []
    for line in output.split("\n"):
        if line:
            parts = line.split("|", 3)
            if len(parts) == 4:
                commits.append({
                    "hash": parts[0],
                    "author": parts[1],
                    "time": parts[2],
                    "message": parts[3]
                })
    return commits

def count_total_commits(repo_path: Path) -> int:
    """统计总提交数"""
    output = run_git_command(repo_path, "rev-list", "--count", "HEAD")
    if output:
        try:
            return int(output)
        except ValueError:
            pass
    return 0

def count_commits_since(repo_path: Path, since: datetime) -> int:
    """统计指定时间以来的提交数"""
    output = run_git_command(repo_path, "rev-list", "--count", "--since", since.isoformat(), "HEAD")
    if output:
        try:
            return int(output)
        except ValueError:
            pass
    return 0

# =============================================================================
# 仓库扫描
# =============================================================================

def find_git_repos(base_path: Path, ignore_dirs: List[str]) -> List[Path]:
    """递归查找所有 Git 仓库"""
    repos = []
    logger.debug(f"开始扫描目录: {base_path}")
    
    for root, dirs, files in os.walk(base_path, topdown=True):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        current_path = Path(root)
        if is_git_repo(current_path):
            repos.append(current_path)
            dirs[:] = []
            logger.debug(f"发现 Git 仓库: {current_path}")
    
    logger.info(f"扫描完成，共发现 {len(repos)} 个 Git 仓库")
    return repos

def scan_repo(repo_path: Path) -> Optional[dict]:
    """扫描单个仓库并返回数据"""
    try:
        branch = get_current_branch(repo_path) or "unknown"
        latest = get_latest_commit(repo_path)
        
        if not latest:
            return {
                "path": str(repo_path),
                "name": repo_path.name,
                "current_branch": branch,
                "latest_commit_hash": None,
                "latest_commit_author": None,
                "latest_commit_time": None,
                "weekly_commits": 0,
                "total_commits": 0
            }
        
        one_week_ago = datetime.now() - timedelta(days=7)
        weekly = count_commits_since(repo_path, one_week_ago)
        total = count_total_commits(repo_path)
        
        return {
            "path": str(repo_path),
            "name": repo_path.name,
            "current_branch": branch,
            "latest_commit_hash": latest["hash"],
            "latest_commit_author": latest["author"],
            "latest_commit_time": latest["time"],
            "weekly_commits": weekly,
            "total_commits": total
        }
    except Exception as e:
        logger.error(f"扫描仓库失败 {repo_path}: {e}")
        return None

def scan_command(args: argparse.Namespace, config: dict) -> None:
    """执行扫描命令"""
    db_path = Path(config.get("db_path", str(DEFAULT_DB_PATH)))
    scan_path = Path(args.path) if args.path else Path(config.get("scan_path", str(Path.home())))
    ignore_dirs = config.get("ignore_dirs", DEFAULT_IGNORE_DIRS)
    
    logger.info(f"扫描路径: {scan_path}")
    logger.info(f"数据库: {db_path}")
    
    db = Database(db_path)
    db.connect()
    db.init_schema()
    
    repos = find_git_repos(scan_path, ignore_dirs)
    
    added_count = 0
    updated_count = 0
    
    for i, repo_path in enumerate(repos, 1):
        logger.info(f"[{i}/{len(repos)}] 扫描: {repo_path}")
        
        repo_data = scan_repo(repo_path)
        if not repo_data:
            continue
        
        repo_id, is_new = db.upsert_repo(repo_data)
        
        if is_new:
            added_count += 1
            logger.debug(f"新增仓库: {repo_path}")
        else:
            updated_count += 1
            logger.debug(f"更新仓库: {repo_path}")
        
        commits = get_commit_history(repo_path)
        if commits:
            inserted = db.insert_commits(repo_id, commits)
            logger.debug(f"  新增 {inserted} 条提交记录")
        
        if i % 10 == 0:
            db.commit()
    
    db.commit()
    db.record_scan(len(repos), added_count, updated_count)
    db.close()
    
    print("\n" + "=" * 60)
    print("📊 扫描完成")
    print(f"  扫描仓库总数: {len(repos)}")
    print(f"  新增仓库: {added_count}")
    print(f"  更新仓库: {updated_count}")
    print("=" * 60)

# =============================================================================
# 报告生成
# =============================================================================

def format_time(time_str: Optional[str]) -> str:
    """格式化时间显示"""
    if not time_str:
        return "-"
    try:
        dt = datetime.fromisoformat(time_str)
        return dt.strftime("%Y-%m-%d %H:%M")
    except ValueError:
        return time_str

def report_command(args: argparse.Namespace, config: dict) -> None:
    """生成报告"""
    db_path = Path(config.get("db_path", str(DEFAULT_DB_PATH)))
    
    db = Database(db_path)
    db.connect()
    
    repos = db.get_all_repos()
    db.close()
    
    if not repos:
        print("没有找到仓库数据，请先执行 scan 命令。")
        return
    
    print("\n" + "=" * 100)
    print(f"{'#':>3} {'仓库名称':<25} {'分支':<12} {'周提交':>8} {'总提交':>8} {'最近提交时间':<20} {'作者':<15}")
    print("-" * 100)
    
    total_weekly = 0
    total_commits_all = 0
    
    for i, repo in enumerate(repos, 1):
        name = repo["name"][:23] + ".." if len(repo["name"]) > 25 else repo["name"]
        branch = repo["current_branch"] or "-"
        branch = branch[:10] + ".." if len(branch) > 12 else branch
        author = repo["latest_commit_author"] or "-"
        author = author[:13] + ".." if len(author) > 15 else author
        
        print(f"{i:>3} {name:<25} {branch:<12} {repo['weekly_commits']:>8} "
              f"{repo['total_commits']:>8} {format_time(repo['latest_commit_time']):<20} {author:<15}")
        
        total_weekly += repo["weekly_commits"]
        total_commits_all += repo["total_commits"]
    
    print("-" * 100)
    print(f"{'汇总':>41} {total_weekly:>8} {total_commits_all:>8}")
    print("=" * 100)
    print(f"共 {len(repos)} 个仓库，本周总提交 {total_weekly} 次，历史总提交 {total_commits_all} 次")

# =============================================================================
# 闲置仓库查找
# =============================================================================

def idle_command(args: argparse.Namespace, config: dict) -> None:
    """查找闲置仓库"""
    db_path = Path(config.get("db_path", str(DEFAULT_DB_PATH)))
    idle_days = args.idle
    
    db = Database(db_path)
    db.connect()
    
    repos = db.get_all_repos()
    db.close()
    
    if not repos:
        print("没有找到仓库数据，请先执行 scan 命令。")
        return
    
    now = datetime.now()
    idle_repos = []
    
    for repo in repos:
        if repo["latest_commit_time"]:
            try:
                commit_time = datetime.fromisoformat(repo["latest_commit_time"])
                idle_duration = (now - commit_time).days
                if idle_duration >= idle_days:
                    idle_repos.append((repo, idle_duration))
            except ValueError:
                pass
    
    idle_repos.sort(key=lambda x: x[1], reverse=True)
    
    if not idle_repos:
        print(f"没有找到闲置超过 {idle_days} 天的仓库。")
        return
    
    print("\n" + "=" * 100)
    print(f"🔍 闲置仓库列表（超过 {idle_days} 天无提交）")
    print("=" * 100)
    print(f"{'闲置天数':>8} {'仓库名称':<25} {'路径':<50} {'最近提交':<20}")
    print("-" * 100)
    
    for repo, days in idle_repos:
        name = repo["name"][:23] + ".." if len(repo["name"]) > 25 else repo["name"]
        path = repo["path"]
        if len(path) > 48:
            path = "..." + path[-45:]
        
        print(f"{days:>8}天 {name:<25} {path:<50} {format_time(repo['latest_commit_time']):<20}")
    
    print("=" * 100)
    print(f"共找到 {len(idle_repos)} 个闲置仓库")

# =============================================================================
# 活跃度对比
# =============================================================================

def parse_date_range(date_str: str) -> Tuple[datetime, datetime]:
    """解析日期范围字符串，如 '2024-01-01..2024-01-07' 或 'last_week'"""
    now = datetime.now()
    
    if date_str == "last_week":
        end = now - timedelta(days=7)
        start = end - timedelta(days=7)
        return start, end
    elif date_str == "this_week":
        start = now - timedelta(days=7)
        return start, now
    elif ".." in date_str:
        start_str, end_str = date_str.split("..", 1)
        try:
            start = datetime.strptime(start_str, "%Y-%m-%d")
            end = datetime.strptime(end_str, "%Y-%m-%d")
            return start, end
        except ValueError:
            raise ValueError(f"日期格式错误: {date_str}，应为 YYYY-MM-DD..YYYY-MM-DD")
    
    raise ValueError(f"无效的时间范围: {date_str}")

def compare_command(args: argparse.Namespace, config: dict) -> None:
    """对比两个时间段的活跃度"""
    db_path = Path(config.get("db_path", str(DEFAULT_DB_PATH)))
    
    try:
        start1, end1 = parse_date_range(args.from_time)
        start2, end2 = parse_date_range(args.to_time)
    except ValueError as e:
        logger.error(str(e))
        return
    
    db = Database(db_path)
    db.connect()
    
    repos = db.get_all_repos()
    
    results = []
    for repo in repos:
        commits1 = db.get_commits_in_range(repo["id"], start1, end1)
        commits2 = db.get_commits_in_range(repo["id"], start2, end2)
        
        if commits1 > 0:
            change_rate = ((commits2 - commits1) / commits1) * 100
        elif commits2 > 0:
            change_rate = 100.0
        else:
            change_rate = 0.0
        
        results.append({
            "repo": repo,
            "commits1": commits1,
            "commits2": commits2,
            "change_rate": change_rate
        })
    
    db.close()
    
    threshold = 50.0
    changed = [r for r in results if abs(r["change_rate"]) >= threshold and (r["commits1"] > 0 or r["commits2"] > 0)]
    changed.sort(key=lambda x: x["change_rate"], reverse=True)
    
    print("\n" + "=" * 100)
    print(f"📊 活跃度对比")
    print(f"  时间段 1: {start1.strftime('%Y-%m-%d')} ~ {end1.strftime('%Y-%m-%d')}")
    print(f"  时间段 2: {start2.strftime('%Y-%m-%d')} ~ {end2.strftime('%Y-%m-%d')}")
    print(f"  变化率阈值: ±{threshold:.0f}%")
    print("=" * 100)
    print(f"{'仓库名称':<25} {'T1提交':>8} {'T2提交':>8} {'变化率':>12} {'状态':<15}")
    print("-" * 100)
    
    for r in changed:
        name = r["repo"]["name"][:23] + ".." if len(r["repo"]["name"]) > 25 else r["repo"]["name"]
        if r["change_rate"] > 0:
            status = "⬆️  活跃上升"
        else:
            status = "⬇️  活跃下降"
        
        print(f"{name:<25} {r['commits1']:>8} {r['commits2']:>8} {r['change_rate']:>+11.1f}% {status:<15}")
    
    if not changed:
        print(f"  没有发现变化率超过 ±{threshold:.0f}% 的仓库")
    
    print("=" * 100)
    print(f"共 {len(repos)} 个仓库，{len(changed)} 个活跃度显著变化")

# =============================================================================
# CSV 导出
# =============================================================================

def export_command(args: argparse.Namespace, config: dict) -> None:
    """导出 CSV 报告"""
    db_path = Path(config.get("db_path", str(DEFAULT_DB_PATH)))
    output_path = Path(args.output)
    
    db = Database(db_path)
    db.connect()
    
    repos = db.get_all_repos()
    db.close()
    
    if not repos:
        print("没有找到仓库数据，请先执行 scan 命令。")
        return
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "序号", "仓库名称", "路径", "当前分支", "周提交数", "总提交数",
            "最新提交哈希", "最新提交作者", "最新提交时间"
        ])
        
        for i, repo in enumerate(repos, 1):
            writer.writerow([
                i, repo["name"], repo["path"], repo["current_branch"] or "",
                repo["weekly_commits"], repo["total_commits"],
                repo["latest_commit_hash"] or "", repo["latest_commit_author"] or "",
                repo["latest_commit_time"] or ""
            ])
    
    print(f"✅ 已导出 {len(repos)} 个仓库数据到: {output_path}")

# =============================================================================
# 主函数
# =============================================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Git 仓库扫描与分析工具",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument("--config", type=str, help="配置文件路径")
    parser.add_argument("--verbose", "-v", action="store_true", help="显示详细日志")
    
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # scan 子命令
    scan_parser = subparsers.add_parser("scan", help="扫描 Git 仓库")
    scan_parser.add_argument("path", nargs="?", help="要扫描的根目录路径")
    
    # report 子命令
    subparsers.add_parser("report", help="生成仓库活跃度报告")
    
    # idle 子命令
    idle_parser = subparsers.add_parser("idle", help="查找闲置仓库")
    idle_parser.add_argument("--idle", type=int, default=30, help="闲置天数阈值 (默认: 30)")
    
    # compare 子命令
    compare_parser = subparsers.add_parser("compare", help="对比时间段活跃度")
    compare_parser.add_argument("--from", dest="from_time", required=True,
                                help="起始时间段 (格式: YYYY-MM-DD..YYYY-MM-DD 或 last_week)")
    compare_parser.add_argument("--to", dest="to_time", required=True,
                                help="结束时间段 (格式: YYYY-MM-DD..YYYY-MM-DD 或 this_week)")
    
    # export 子命令
    export_parser = subparsers.add_parser("export", help="导出 CSV 报告")
    export_parser.add_argument("--output", required=True, help="输出文件路径")
    
    args = parser.parse_args()
    
    logger.verbose = args.verbose
    
    config = load_config(Path(args.config) if args.config else None)
    
    if args.command == "scan":
        scan_command(args, config)
    elif args.command == "report":
        report_command(args, config)
    elif args.command == "idle":
        idle_command(args, config)
    elif args.command == "compare":
        compare_command(args, config)
    elif args.command == "export":
        export_command(args, config)

if __name__ == "__main__":
    main()
