import sys
import os
import subprocess
from typing import List

try:
    import pyperclip
    PYPERCLIP_AVAILABLE = True
except ImportError:
    PYPERCLIP_AVAILABLE = False


class ClipboardManager:
    def __init__(self):
        self.available = PYPERCLIP_AVAILABLE
        self.platform = sys.platform
        self.use_macos_native = False
        
        if self.platform == "darwin":
            self.use_macos_native = self._check_macos_clipboard()

    def _check_macos_clipboard(self) -> bool:
        try:
            result = subprocess.run(
                ["which", "pbcopy"],
                capture_output=True,
                text=True
            )
            return result.returncode == 0
        except Exception:
            return False

    def _copy_with_pbcopy(self, text: str) -> bool:
        try:
            text_bytes = text.encode("utf-8")
            process = subprocess.Popen(
                ["pbcopy"],
                stdin=subprocess.PIPE,
                close_fds=True
            )
            process.stdin.write(text_bytes)
            process.stdin.close()
            process.wait(timeout=5)
            return process.returncode == 0
        except Exception:
            return False

    def _paste_with_pbpaste(self) -> str:
        try:
            result = subprocess.run(
                ["pbpaste"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                return result.stdout
        except Exception:
            pass
        return ""

    def copy(self, text: str) -> bool:
        if not self.available and not self.use_macos_native:
            return False
        
        try:
            text = self._normalize_text(text)
            
            if self.use_macos_native:
                success = self._copy_with_pbcopy(text)
                if success:
                    return True
            
            if self.available:
                pyperclip.copy(text)
                return True
                
            return False
        except Exception:
            return False

    def _normalize_text(self, text: str) -> str:
        text = text.replace("\r\n", "\n")
        text = text.replace("\r", "\n")
        text = text.strip() + "\n"
        return text

    def copy_titles(self, titles: List[str], separator: str = "\n") -> bool:
        if not titles:
            return False
        
        text = separator.join([f"• {title}" for title in titles])
        return self.copy(text)

    def copy_single_title(self, title: str) -> bool:
        return self.copy(title.strip())

    def copy_ab_test_pair(self, title_a: str, title_b: str, include_labels: bool = True) -> bool:
        if include_labels:
            text = f"""【A/B测试标题对】
A: {title_a}
B: {title_b}
"""
        else:
            text = f"{title_a}\n{title_b}"
        return self.copy(text)

    def copy_all_ab_tests(self, test_pairs: List[dict], include_predictions: bool = False) -> bool:
        lines = ["【A/B测试完整方案】", ""]
        
        for i, pair in enumerate(test_pairs, 1):
            lines.append(f"{'='*40}")
            lines.append(f"测试 {i}: {pair['dimension']}")
            lines.append(f"{'='*40}")
            lines.append(f"A: {pair['title_a']}")
            
            if include_predictions and "prediction_a" in pair:
                pred = pair["prediction_a"]
                lines.append(f"   预测: CTR {pred['ctr']:.1f}% | 分享 {pred['share_rate']:.1f}% | 互动 {pred['interaction_rate']:.1f}%")
            
            lines.append(f"B: {pair['title_b']}")
            
            if include_predictions and "prediction_b" in pair:
                pred = pair["prediction_b"]
                lines.append(f"   预测: CTR {pred['ctr']:.1f}% | 分享 {pred['share_rate']:.1f}% | 互动 {pred['interaction_rate']:.1f}%")
            
            lines.append(f"")
            lines.append(f"💡 建议: {pair['recommendation']}")
            lines.append("")
        
        lines.append("")
        lines.append("【使用说明】")
        lines.append("- 复制后可直接粘贴到表格或文档中")
        lines.append("- 建议每组测试至少获得1000次曝光")
        lines.append("- 关注CTR、阅读完成率和互动率指标")
        
        return self.copy("\n".join(lines))

    def paste(self) -> str:
        if not self.available and not self.use_macos_native:
            return ""
        
        try:
            if self.use_macos_native:
                result = self._paste_with_pbpaste()
                if result:
                    return result.rstrip("\n")
            
            if self.available:
                return pyperclip.paste().rstrip("\n")
                
            return ""
        except Exception:
            return ""

    def verify_copy(self, original_text: str) -> bool:
        try:
            pasted = self.paste()
            return original_text.strip() in pasted
        except Exception:
            return False
