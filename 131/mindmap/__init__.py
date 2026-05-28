"""
MindMap Generator - A Python command-line mind map generation tool.
"""

__version__ = "1.0.0"
__author__ = "MindMap Generator"

from .node import MindMapNode, MindMapForest
from .parser import TextParser, MarkdownParser, OPMLParser, auto_parse
from .exporter import (
    HTMLExporter,
    ASCIIExporter,
    FreeMindExporter,
    PNGExporter,
    EmbedCodeExporter,
)
from .style import StyleConfig, NodeStyle
from .interactive import InteractiveEditor

__all__ = [
    "MindMapNode",
    "MindMapForest",
    "TextParser",
    "MarkdownParser",
    "OPMLParser",
    "auto_parse",
    "HTMLExporter",
    "ASCIIExporter",
    "FreeMindExporter",
    "PNGExporter",
    "EmbedCodeExporter",
    "StyleConfig",
    "NodeStyle",
    "InteractiveEditor",
]
