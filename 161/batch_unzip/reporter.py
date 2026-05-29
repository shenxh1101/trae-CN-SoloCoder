import json
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime

from .scanner import ArchiveInfo
from .logger import get_logger, console

logger = get_logger(__name__)


@dataclass
class ExtractionReport:
    start_time: str
    end_time: str = ""
    total_archives: int = 0
    successful: int = 0
    failed: int = 0
    skipped: int = 0
    total_password_attempts: int = 0
    archives_with_password: int = 0
    integrity_tests_passed: int = 0
    integrity_tests_failed: int = 0
    archives: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)


class Reporter:
    def __init__(self):
        self.report = ExtractionReport(
            start_time=datetime.now().isoformat()
        )

    def add_archive_result(self, archive: ArchiveInfo) -> None:
        archive_data = {
            "name": archive.name,
            "path": str(archive.path),
            "type": archive.file_type,
            "size": archive.size,
            "is_encrypted": archive.is_encrypted,
            "file_count": archive.file_count,
            "extract_success": archive.extract_success,
            "password_attempts": archive.password_attempts,
            "correct_password": archive.correct_password,
            "error_message": archive.error_message,
        }
        self.report.archives.append(archive_data)

        self.report.total_archives += 1
        self.report.total_password_attempts += archive.password_attempts

        if archive.is_encrypted and archive.password_attempts > 0:
            self.report.archives_with_password += 1

        if archive.extract_success is True:
            self.report.successful += 1
        elif archive.extract_success is False:
            self.report.failed += 1
        else:
            self.report.skipped += 1

    def add_integrity_result(self, archive: ArchiveInfo, passed: bool) -> None:
        if passed:
            self.report.integrity_tests_passed += 1
        else:
            self.report.integrity_tests_failed += 1

    def finalize(self) -> None:
        self.report.end_time = datetime.now().isoformat()

    def print_summary(self) -> None:
        from rich.table import Table
        from rich.panel import Panel
        from rich.text import Text

        console.print()
        console.print(Panel.fit(
            "[bold cyan]Extraction Report Summary[/bold cyan]",
            border_style="cyan"
        ))

        table = Table(show_header=False, border_style="dim")
        table.add_column("Metric", style="bold")
        table.add_column("Value", justify="right")

        table.add_row("Total archives processed", str(self.report.total_archives))
        table.add_row("[green]Successful[/green]", f"[green]{self.report.successful}[/green]")
        table.add_row("[red]Failed[/red]", f"[red]{self.report.failed}[/red]")
        table.add_row("[yellow]Skipped[/yellow]", f"[yellow]{self.report.skipped}[/yellow]")
        table.add_row("Archives with password", str(self.report.archives_with_password))
        table.add_row("Total password attempts", str(self.report.total_password_attempts))

        if self.report.integrity_tests_passed + self.report.integrity_tests_failed > 0:
            table.add_row("Integrity tests passed", f"[green]{self.report.integrity_tests_passed}[/green]")
            table.add_row("Integrity tests failed", f"[red]{self.report.integrity_tests_failed}[/red]")

        if self.report.total_archives > 0:
            success_rate = (self.report.successful / self.report.total_archives) * 100
            table.add_row("Success rate", f"{success_rate:.1f}%")

        console.print(table)

        if self.report.failed > 0:
            console.print()
            console.print("[bold red]Failed archives:[/bold red]")
            for archive in self.report.archives:
                if archive["extract_success"] is False:
                    error = archive["error_message"] or "Unknown error"
                    console.print(f"  [red]•[/red] {archive['name']}: {error}")

        if self.report.archives_with_password > 0:
            console.print()
            console.print("[bold yellow]Password-protected archives:[/bold yellow]")
            for archive in self.report.archives:
                if archive["is_encrypted"]:
                    status = "[green]✓[/green]" if archive["extract_success"] else "[red]✗[/red]"
                    attempts = archive["password_attempts"]
                    console.print(f"  {status} {archive['name']} ({attempts} attempts)")

    def save_report(self, file_path: Path, format: str = "json") -> None:
        self.finalize()
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)

            if format == "json":
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(self.report.to_json())
            elif format == "text":
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(self._generate_text_report())
            elif format == "csv":
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(self._generate_csv_report())
            else:
                raise ValueError(f"Unsupported report format: {format}")

            logger.info(f"Report saved to: {file_path}")
        except Exception as e:
            logger.error(f"Failed to save report: {e}")

    def _generate_text_report(self) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("BATCH UNZIP REPORT")
        lines.append("=" * 60)
        lines.append(f"Start time: {self.report.start_time}")
        lines.append(f"End time: {self.report.end_time}")
        lines.append("")
        lines.append(f"Total archives processed: {self.report.total_archives}")
        lines.append(f"Successful: {self.report.successful}")
        lines.append(f"Failed: {self.report.failed}")
        lines.append(f"Skipped: {self.report.skipped}")
        lines.append(f"Archives with password: {self.report.archives_with_password}")
        lines.append(f"Total password attempts: {self.report.total_password_attempts}")
        lines.append("")
        lines.append("-" * 60)
        lines.append("ARCHIVE DETAILS")
        lines.append("-" * 60)

        for archive in self.report.archives:
            lines.append("")
            lines.append(f"File: {archive['name']}")
            lines.append(f"  Type: {archive['type']}")
            lines.append(f"  Size: {archive['size']} bytes")
            lines.append(f"  Encrypted: {archive['is_encrypted']}")
            lines.append(f"  Success: {archive['extract_success']}")
            if archive['password_attempts'] > 0:
                lines.append(f"  Password attempts: {archive['password_attempts']}")
            if archive['error_message']:
                lines.append(f"  Error: {archive['error_message']}")

        lines.append("")
        lines.append("=" * 60)
        return "\n".join(lines)

    def _generate_csv_report(self) -> str:
        import csv
        from io import StringIO

        output = StringIO()
        writer = csv.writer(output)

        headers = [
            "File", "Type", "Size", "Encrypted", "File Count",
            "Success", "Password Attempts", "Correct Password", "Error"
        ]
        writer.writerow(headers)

        for archive in self.report.archives:
            row = [
                archive["name"],
                archive["type"],
                archive["size"],
                archive["is_encrypted"],
                archive["file_count"],
                archive["extract_success"],
                archive["password_attempts"],
                archive["correct_password"] or "",
                archive["error_message"] or ""
            ]
            writer.writerow(row)

        output.write("\n\n")
        writer.writerow([])
        writer.writerow(["Summary"])
        writer.writerow(["Total archives", self.report.total_archives])
        writer.writerow(["Successful", self.report.successful])
        writer.writerow(["Failed", self.report.failed])
        writer.writerow(["Skipped", self.report.skipped])
        writer.writerow(["Total password attempts", self.report.total_password_attempts])

        return output.getvalue()
