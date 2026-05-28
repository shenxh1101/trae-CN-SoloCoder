"""
Style configuration for mind map nodes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class NodeStyle:
    """Style configuration for a single node."""

    color: str = "#333333"
    background_color: str = "#ffffff"
    border_color: str = "#cccccc"
    border_width: int = 1
    border_radius: int = 5
    font_size: int = 14
    font_family: str = "Arial, sans-serif"
    font_weight: str = "normal"
    shape: str = "rectangle"
    padding: int = 8
    margin: int = 10
    line_color: str = "#999999"
    line_width: int = 2
    line_style: str = "solid"
    icon_size: int = 16

    def to_dict(self) -> Dict[str, Any]:
        return {
            "color": self.color,
            "backgroundColor": self.background_color,
            "borderColor": self.border_color,
            "borderWidth": self.border_width,
            "borderRadius": self.border_radius,
            "fontSize": self.font_size,
            "fontFamily": self.font_family,
            "fontWeight": self.font_weight,
            "shape": self.shape,
            "padding": self.padding,
            "margin": self.margin,
            "lineColor": self.line_color,
            "lineWidth": self.line_width,
            "lineStyle": self.line_style,
            "iconSize": self.icon_size,
        }

    def to_css(self) -> Dict[str, str]:
        return {
            "color": self.color,
            "background-color": self.background_color,
            "border-color": self.border_color,
            "border-width": f"{self.border_width}px",
            "border-radius": f"{self.border_radius}px",
            "font-size": f"{self.font_size}px",
            "font-family": self.font_family,
            "font-weight": self.font_weight,
            "padding": f"{self.padding}px",
            "margin": f"{self.margin}px",
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "NodeStyle":
        return cls(
            color=data.get("color", cls.color),
            background_color=data.get("backgroundColor", data.get("background_color", cls.background_color)),
            border_color=data.get("borderColor", data.get("border_color", cls.border_color)),
            border_width=data.get("borderWidth", data.get("border_width", cls.border_width)),
            border_radius=data.get("borderRadius", data.get("border_radius", cls.border_radius)),
            font_size=data.get("fontSize", data.get("font_size", cls.font_size)),
            font_family=data.get("fontFamily", data.get("font_family", cls.font_family)),
            font_weight=data.get("fontWeight", data.get("font_weight", cls.font_weight)),
            shape=data.get("shape", cls.shape),
            padding=data.get("padding", cls.padding),
            margin=data.get("margin", cls.margin),
            line_color=data.get("lineColor", data.get("line_color", cls.line_color)),
            line_width=data.get("lineWidth", data.get("line_width", cls.line_width)),
            line_style=data.get("lineStyle", data.get("line_style", cls.line_style)),
            icon_size=data.get("iconSize", data.get("icon_size", cls.icon_size)),
        )


@dataclass
class StyleConfig:
    """Global style configuration with per-level overrides."""

    layout: str = "right"
    level_styles: Dict[int, NodeStyle] = field(default_factory=dict)
    default_style: NodeStyle = field(default_factory=NodeStyle)
    root_style: NodeStyle = field(
        default_factory=lambda: NodeStyle(
            color="#ffffff",
            background_color="#4a90d9",
            border_color="#357abd",
            border_width=2,
            font_size=20,
            font_weight="bold",
            border_radius=8,
            padding=12,
        )
    )
    custom_styles: Dict[str, NodeStyle] = field(default_factory=dict)

    def get_style_for_level(self, level: int) -> NodeStyle:
        """Get the style for a given level."""
        if level == 0:
            return self.root_style
        if level in self.level_styles:
            return self.level_styles[level]
        style = NodeStyle.from_dict(self.default_style.to_dict())
        scale_factor = max(0.85, 1 - (level * 0.05))
        style.font_size = max(10, int(self.default_style.font_size * scale_factor))
        return style

    def get_style_for_node(self, node: Any) -> NodeStyle:
        """Get the style for a specific node."""
        if node.style:
            return NodeStyle.from_dict(node.style)
        if node.node_id in self.custom_styles:
            return self.custom_styles[node.node_id]
        return self.get_style_for_level(node.get_level())

    def set_level_style(self, level: int, style: NodeStyle) -> None:
        """Set the style for a specific level."""
        self.level_styles[level] = style

    def set_node_style(self, node_id: str, style: NodeStyle) -> None:
        """Set the style for a specific node."""
        self.custom_styles[node_id] = style

    def to_dict(self) -> Dict[str, Any]:
        return {
            "layout": self.layout,
            "defaultStyle": self.default_style.to_dict(),
            "rootStyle": self.root_style.to_dict(),
            "levelStyles": {str(k): v.to_dict() for k, v in self.level_styles.items()},
            "customStyles": {k: v.to_dict() for k, v in self.custom_styles.items()},
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StyleConfig":
        config = cls(layout=data.get("layout", cls.layout))
        if "defaultStyle" in data:
            config.default_style = NodeStyle.from_dict(data["defaultStyle"])
        if "rootStyle" in data:
            config.root_style = NodeStyle.from_dict(data["rootStyle"])
        if "levelStyles" in data:
            config.level_styles = {
                int(k): NodeStyle.from_dict(v) for k, v in data["levelStyles"].items()
            }
        if "customStyles" in data:
            config.custom_styles = {
                k: NodeStyle.from_dict(v) for k, v in data["customStyles"].items()
            }
        return config

    @classmethod
    def create_preset(cls, preset_name: str) -> "StyleConfig":
        """Create a style configuration from a preset."""
        presets = {
            "default": cls(),
            "warm": cls(
                layout="right",
                root_style=NodeStyle(
                    color="#ffffff",
                    background_color="#e74c3c",
                    border_color="#c0392b",
                    border_width=2,
                    font_size=20,
                    font_weight="bold",
                ),
            ),
            "cool": cls(
                layout="right",
                root_style=NodeStyle(
                    color="#ffffff",
                    background_color="#27ae60",
                    border_color="#229954",
                    border_width=2,
                    font_size=20,
                    font_weight="bold",
                ),
            ),
            "ocean": cls(
                layout="right",
                root_style=NodeStyle(
                    color="#ffffff",
                    background_color="#1abc9c",
                    border_color="#16a085",
                    border_width=2,
                    font_size=20,
                    font_weight="bold",
                ),
            ),
            "sunset": cls(
                layout="right",
                root_style=NodeStyle(
                    color="#ffffff",
                    background_color="#e67e22",
                    border_color="#d35400",
                    border_width=2,
                    font_size=20,
                    font_weight="bold",
                ),
            ),
            "purple": cls(
                layout="right",
                root_style=NodeStyle(
                    color="#ffffff",
                    background_color="#9b59b6",
                    border_color="#8e44ad",
                    border_width=2,
                    font_size=20,
                    font_weight="bold",
                ),
            ),
            "dark": cls(
                layout="right",
                default_style=NodeStyle(
                    color="#e0e0e0",
                    background_color="#2c2c2c",
                    border_color="#555555",
                    line_color="#666666",
                ),
                root_style=NodeStyle(
                    color="#ffffff",
                    background_color="#444444",
                    border_color="#666666",
                    border_width=2,
                    font_size=20,
                    font_weight="bold",
                ),
            ),
            "minimal": cls(
                layout="right",
                default_style=NodeStyle(
                    color="#333333",
                    background_color="#ffffff",
                    border_color="#e0e0e0",
                    border_width=1,
                    border_radius=0,
                    line_color="#e0e0e0",
                    line_width=1,
                    line_style="dashed",
                ),
                root_style=NodeStyle(
                    color="#333333",
                    background_color="#ffffff",
                    border_color="#333333",
                    border_width=2,
                    border_radius=0,
                    font_size=20,
                    font_weight="bold",
                ),
            ),
        }
        return presets.get(preset_name, cls())

    def generate_level_styles(self, num_levels: int = 10) -> None:
        """Generate automatic level styles with color gradient."""
        colors = [
            "#e74c3c", "#e67e22", "#f1c40f", "#27ae60",
            "#1abc9c", "#3498db", "#9b59b6", "#34495e",
            "#7f8c8d", "#95a5a6",
        ]
        for i in range(1, num_levels + 1):
            style = self.get_style_for_level(i)
            color_idx = (i - 1) % len(colors)
            style.border_color = colors[color_idx]
            style.line_color = colors[color_idx]
            self.level_styles[i] = style
