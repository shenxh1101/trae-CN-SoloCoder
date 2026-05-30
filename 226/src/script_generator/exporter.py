"""
导出模块 - 支持将剧本导出为多种格式
"""

import os
import json
from typing import Optional
from datetime import datetime
from xml.etree.ElementTree import Element, SubElement, tostring, indent
from xml.dom import minidom
from .models import Script


class Exporter:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        self._ensure_dir()

    def _ensure_dir(self):
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir, exist_ok=True)

    def export(
        self,
        script: Script,
        format_type: str = "txt",
        filename: Optional[str] = None
    ) -> str:
        format_type = format_type.lower()

        if format_type == "txt":
            return self.export_txt(script, filename)
        elif format_type == "json":
            return self.export_json(script, filename)
        elif format_type == "fdx":
            return self.export_fdx(script, filename)
        else:
            raise ValueError(f"不支持的导出格式: {format_type}")

    def export_txt(
        self,
        script: Script,
        filename: Optional[str] = None
    ) -> str:
        if not filename:
            filename = self._generate_filename(script, "txt")

        filepath = os.path.join(self.output_dir, filename)

        lines = []
        lines.append(f"场景：{script.scene}")
        lines.append(f"角色：{', '.join([c.name for c in script.characters])}")
        lines.append(f"创建时间：{script.created_at}")
        lines.append("")
        lines.append("=" * 60)
        lines.append("")

        for line in script.dialogue:
            lines.append(line.format_with_emotion())

        lines.append("")
        lines.append("=" * 60)

        if script.overall_arc:
            lines.append(f"情感弧线：{script.overall_arc}")

        content = "\n".join(lines)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        return filepath

    def export_json(
        self,
        script: Script,
        filename: Optional[str] = None
    ) -> str:
        if not filename:
            filename = self._generate_filename(script, "json")

        filepath = os.path.join(self.output_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(script.to_json(indent=2))

        return filepath

    def export_fdx(
        self,
        script: Script,
        filename: Optional[str] = None
    ) -> str:
        if not filename:
            filename = self._generate_filename(script, "fdx")

        filepath = os.path.join(self.output_dir, filename)

        xml_content = self._generate_fdx_xml(script)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(xml_content)

        return filepath

    def _generate_filename(self, script: Script, extension: str) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_names = []
        for c in script.characters:
            safe_name = c.name.replace(' ', '_').replace('·', '_')
            safe_names.append(safe_name)
        char_names = "_".join(safe_names)
        return f"{timestamp}_{char_names}_v{script.version}.{extension}"

    def _generate_fdx_xml(self, script: Script) -> str:
        fd = Element("FinalDraft")
        fd.set("DocumentType", "Script")
        fd.set("Template", "No")
        fd.set("Version", "3")

        wt = SubElement(fd, "WordProcessing")
        wt.text = "No"

        content = SubElement(fd, "Content")

        scene_heading = SubElement(content, "Paragraph")
        scene_heading.set("Type", "Scene Heading")
        sh_align = SubElement(scene_heading, "Alignment")
        sh_align.set("Justify", "Left")
        sh_text = SubElement(scene_heading, "Text")
        sh_text.set("AdornmentStyle", "0")
        sh_text.set("Shadow", "0")
        sh_text.set("Font", "Courier Final Draft")
        sh_text.set("Size", "12")
        scene_location = self._fdx_sanitize_scene(script.scene)
        sh_text.text = scene_location

        action_para = SubElement(content, "Paragraph")
        action_para.set("Type", "Action")
        action_align = SubElement(action_para, "Alignment")
        action_align.set("Justify", "Left")
        action_text_el = SubElement(action_para, "Text")
        action_text_el.set("Font", "Courier Final Draft")
        action_text_el.set("Size", "12")
        action_text_el.text = self._fdx_escape(script.scene + "。")

        for line in script.dialogue:
            char_para = SubElement(content, "Paragraph")
            char_para.set("Type", "Character")
            char_align = SubElement(char_para, "Alignment")
            char_align.set("Justify", "Center")
            char_text_el = SubElement(char_para, "Text")
            char_text_el.set("Font", "Courier Final Draft")
            char_text_el.set("Size", "12")
            char_text_el.text = self._fdx_escape(line.speaker.upper())

            if line.emotion:
                paren_para = SubElement(content, "Paragraph")
                paren_para.set("Type", "Parenthetical")
                paren_align = SubElement(paren_para, "Alignment")
                paren_align.set("Justify", "Left")
                paren_text_el = SubElement(paren_para, "Text")
                paren_text_el.set("Font", "Courier Final Draft")
                paren_text_el.set("Size", "12")
                paren_text_el.text = f"({self._fdx_escape(line.emotion)})"

            dialog_para = SubElement(content, "Paragraph")
            dialog_para.set("Type", "Dialogue")
            dialog_align = SubElement(dialog_para, "Alignment")
            dialog_align.set("Justify", "Left")
            dialog_text_el = SubElement(dialog_para, "Text")
            dialog_text_el.set("Font", "Courier Final Draft")
            dialog_text_el.set("Size", "12")
            dialog_text_el.text = self._fdx_escape(line.text)

        try:
            indent(fd, space="  ")
        except Exception:
            pass

        rough_string = tostring(fd, encoding='unicode', xml_declaration=False)

        xml_lines = rough_string.split('\n')
        pretty_lines = []
        for line_str in xml_lines:
            stripped = line_str.rstrip()
            if stripped:
                pretty_lines.append(stripped)
        pretty_xml = '\n'.join(pretty_lines)

        final_xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + pretty_xml

        return final_xml

    def _fdx_sanitize_scene(self, scene: str) -> str:
        sanitized = scene.upper()
        if not sanitized.startswith("INT.") and not sanitized.startswith("EXT."):
            sanitized = "INT. " + sanitized
        if " - " not in sanitized:
            sanitized += " - DAY"
        return sanitized

    def _fdx_escape(self, text: str) -> str:
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    def batch_export(
        self,
        scripts: list,
        format_type: str = "txt",
        prefix: str = "batch"
    ) -> list:
        filepaths = []
        for idx, script in enumerate(scripts, 1):
            filename = f"{prefix}_{idx}_{self._generate_filename(script, format_type)}"
            filepath = self.export(script, format_type, filename)
            filepaths.append(filepath)
        return filepaths
