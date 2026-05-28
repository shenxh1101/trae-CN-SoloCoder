#!/usr/bin/env python3
"""
Tests for the MindMap Generator.
"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mindmap import (
    MindMapNode,
    MindMapForest,
    TextParser,
    MarkdownParser,
    OPMLParser,
    HTMLExporter,
    ASCIIExporter,
    FreeMindExporter,
    EmbedCodeExporter,
    StyleConfig,
    NodeStyle,
)


class TestMindMapNode(unittest.TestCase):
    """Tests for MindMapNode."""

    def test_create_node(self):
        node = MindMapNode(content="Test Node")
        self.assertEqual(node.content, "Test Node")
        self.assertEqual(node.children, [])
        self.assertIsNone(node.parent)
        self.assertEqual(node.get_level(), 0)

    def test_add_child(self):
        parent = MindMapNode(content="Parent")
        child = MindMapNode(content="Child")
        parent.add_child(child)
        self.assertEqual(len(parent.children), 1)
        self.assertEqual(child.parent, parent)
        self.assertEqual(child.get_level(), 1)

    def test_remove_child(self):
        parent = MindMapNode(content="Parent")
        child = MindMapNode(content="Child")
        parent.add_child(child)
        result = parent.remove_child(child)
        self.assertTrue(result)
        self.assertEqual(len(parent.children), 0)
        self.assertIsNone(child.parent)

    def test_find_by_id(self):
        root = MindMapNode(content="Root")
        child = MindMapNode(content="Child", node_id="test123")
        root.add_child(child)
        found = root.find_by_id("test123")
        self.assertEqual(found, child)
        self.assertIsNone(root.find_by_id("nonexistent"))

    def test_find_by_content(self):
        root = MindMapNode(content="Root")
        child1 = MindMapNode(content="Apple")
        child2 = MindMapNode(content="Banana")
        root.add_child(child1)
        root.add_child(child2)
        results = root.find_by_content("app")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0], child1)

    def test_traverse(self):
        root = MindMapNode(content="Root")
        child1 = MindMapNode(content="Child1")
        child2 = MindMapNode(content="Child2")
        grandchild = MindMapNode(content="Grandchild")
        root.add_child(child1)
        root.add_child(child2)
        child1.add_child(grandchild)
        nodes = list(root.traverse())
        self.assertEqual(len(nodes), 4)
        self.assertEqual(nodes[0], root)
        self.assertEqual(nodes[1], child1)
        self.assertEqual(nodes[2], grandchild)
        self.assertEqual(nodes[3], child2)

    def test_to_dict_and_from_dict(self):
        root = MindMapNode(
            content="Root",
            note="This is a note",
            icon="📌",
            collapsed=True,
        )
        child = MindMapNode(content="Child", note="Child note")
        root.add_child(child)
        data = root.to_dict()
        new_root = MindMapNode.from_dict(data)
        self.assertEqual(new_root.content, "Root")
        self.assertEqual(new_root.note, "This is a note")
        self.assertEqual(new_root.icon, "📌")
        self.assertTrue(new_root.collapsed)
        self.assertEqual(len(new_root.children), 1)
        self.assertEqual(new_root.children[0].content, "Child")
        self.assertEqual(new_root.children[0].note, "Child note")

    def test_clone(self):
        root = MindMapNode(content="Root")
        child = MindMapNode(content="Child")
        root.add_child(child)
        clone = root.clone()
        self.assertEqual(clone.content, "Root")
        self.assertEqual(len(clone.children), 1)
        self.assertIsNot(clone, root)
        self.assertIsNot(clone.children[0], child)

    def test_get_leaf_nodes(self):
        root = MindMapNode(content="Root")
        child1 = MindMapNode(content="Child1")
        child2 = MindMapNode(content="Child2")
        grandchild = MindMapNode(content="Grandchild")
        root.add_child(child1)
        root.add_child(child2)
        child1.add_child(grandchild)
        leaves = root.get_leaf_nodes()
        self.assertEqual(len(leaves), 2)
        self.assertIn(grandchild, leaves)
        self.assertIn(child2, leaves)

    def test_get_siblings(self):
        parent = MindMapNode(content="Parent")
        child1 = MindMapNode(content="Child1")
        child2 = MindMapNode(content="Child2")
        child3 = MindMapNode(content="Child3")
        parent.add_child(child1)
        parent.add_child(child2)
        parent.add_child(child3)
        siblings = child2.get_siblings()
        self.assertEqual(len(siblings), 2)
        self.assertIn(child1, siblings)
        self.assertIn(child3, siblings)

    def test_get_path(self):
        root = MindMapNode(content="Root", node_id="root")
        child = MindMapNode(content="Child", node_id="child")
        grandchild = MindMapNode(content="Grandchild", node_id="grand")
        root.add_child(child)
        child.add_child(grandchild)
        path = grandchild.get_path()
        self.assertEqual(path, ["root", "child", "grand"])


class TestMindMapForest(unittest.TestCase):
    """Tests for MindMapForest."""

    def test_create_forest(self):
        forest = MindMapForest()
        self.assertEqual(len(forest), 0)

    def test_add_root(self):
        forest = MindMapForest()
        root1 = MindMapNode(content="Root1")
        root2 = MindMapNode(content="Root2")
        forest.add_root(root1)
        forest.add_root(root2)
        self.assertEqual(len(forest), 2)
        self.assertEqual(forest[0], root1)
        self.assertEqual(forest[1], root2)

    def test_remove_root(self):
        forest = MindMapForest()
        root = MindMapNode(content="Root")
        forest.add_root(root)
        result = forest.remove_root(root)
        self.assertTrue(result)
        self.assertEqual(len(forest), 0)

    def test_find_by_id(self):
        forest = MindMapForest()
        root1 = MindMapNode(content="Root1", node_id="root1")
        root2 = MindMapNode(content="Root2", node_id="root2")
        child = MindMapNode(content="Child", node_id="child")
        root2.add_child(child)
        forest.add_root(root1)
        forest.add_root(root2)
        found = forest.find_by_id("child")
        self.assertEqual(found, child)
        found = forest.find_by_id("root1")
        self.assertEqual(found, root1)
        self.assertIsNone(forest.find_by_id("nonexistent"))

    def test_find_by_content(self):
        forest = MindMapForest()
        root1 = MindMapNode(content="Apple")
        root2 = MindMapNode(content="Banana")
        forest.add_root(root1)
        forest.add_root(root2)
        results = forest.find_by_content("app")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0], root1)

    def test_get_all_nodes(self):
        forest = MindMapForest()
        root1 = MindMapNode(content="Root1")
        root2 = MindMapNode(content="Root2")
        child = MindMapNode(content="Child")
        root2.add_child(child)
        forest.add_root(root1)
        forest.add_root(root2)
        all_nodes = forest.get_all_nodes()
        self.assertEqual(len(all_nodes), 3)

    def test_to_dict_and_from_dict(self):
        forest = MindMapForest(metadata={"title": "Test Map"})
        root = MindMapNode(content="Root")
        child = MindMapNode(content="Child")
        root.add_child(child)
        forest.add_root(root)
        data = forest.to_dict()
        new_forest = MindMapForest.from_dict(data)
        self.assertEqual(new_forest.metadata.get("title"), "Test Map")
        self.assertEqual(len(new_forest), 1)
        self.assertEqual(new_forest[0].content, "Root")
        self.assertEqual(len(new_forest[0].children), 1)

    def test_iteration(self):
        forest = MindMapForest()
        root1 = MindMapNode(content="Root1")
        root2 = MindMapNode(content="Root2")
        forest.add_root(root1)
        forest.add_root(root2)
        roots = [r for r in forest]
        self.assertEqual(len(roots), 2)


class TestTextParser(unittest.TestCase):
    """Tests for TextParser."""

    def test_parse_simple(self):
        text = """Root
    Child1
    Child2
        Grandchild
"""
        parser = TextParser()
        forest = parser.parse(text)
        self.assertEqual(len(forest), 1)
        root = forest[0]
        self.assertEqual(root.content, "Root")
        self.assertEqual(len(root.children), 2)
        self.assertEqual(root.children[0].content, "Child1")
        self.assertEqual(root.children[1].content, "Child2")
        self.assertEqual(len(root.children[1].children), 1)
        self.assertEqual(root.children[1].children[0].content, "Grandchild")

    def test_parse_with_icon_and_note(self):
        text = "📌 Root [This is a note]\n    Child"
        parser = TextParser()
        forest = parser.parse(text)
        root = forest[0]
        self.assertEqual(root.icon, "📌")
        self.assertEqual(root.note, "This is a note")
        self.assertEqual(root.content, "Root")

    def test_parse_with_comments(self):
        text = """// This is a comment
Root
# Another comment
    Child
"""
        parser = TextParser()
        forest = parser.parse(text)
        self.assertEqual(len(forest), 1)
        self.assertEqual(len(forest[0].children), 1)

    def test_parse_multiple_roots(self):
        text = """Root1
    Child1
Root2
    Child2
"""
        parser = TextParser()
        forest = parser.parse(text)
        self.assertEqual(len(forest), 2)
        self.assertEqual(forest[0].content, "Root1")
        self.assertEqual(forest[1].content, "Root2")

    def test_parse_tabs(self):
        text = "Root\n\tChild\n\t\tGrandchild"
        parser = TextParser(indent_char='\t', indent_size=1)
        forest = parser.parse(text)
        root = forest[0]
        self.assertEqual(len(root.children), 1)
        self.assertEqual(len(root.children[0].children), 1)


class TestMarkdownParser(unittest.TestCase):
    """Tests for MarkdownParser."""

    def test_parse_list_format(self):
        text = """- Root
    - Child1
    - Child2
        - Grandchild
"""
        parser = MarkdownParser()
        forest = parser.parse(text)
        self.assertEqual(len(forest), 1)
        root = forest[0]
        self.assertEqual(root.content, "Root")
        self.assertEqual(len(root.children), 2)

    def test_parse_heading_format(self):
        text = """# Root
## Child1
## Child2
### Grandchild
"""
        parser = MarkdownParser()
        forest = parser.parse(text)
        self.assertEqual(len(forest), 1)
        root = forest[0]
        self.assertEqual(root.content, "Root")
        self.assertEqual(len(root.children), 2)
        self.assertEqual(len(root.children[1].children), 1)

    def test_parse_with_asterisks(self):
        text = "* Root\n  * Child1\n  * Child2"
        parser = MarkdownParser()
        forest = parser.parse(text)
        self.assertEqual(len(forest), 1)
        self.assertEqual(len(forest[0].children), 2)

    def test_parse_with_plus(self):
        text = "+ Root\n  + Child"
        parser = MarkdownParser()
        forest = parser.parse(text)
        self.assertEqual(len(forest), 1)
        self.assertEqual(len(forest[0].children), 1)

    def test_parse_with_icon_and_note(self):
        text = "- 📌 Root [Note]\n    - Child"
        parser = MarkdownParser()
        forest = parser.parse(text)
        root = forest[0]
        self.assertEqual(root.icon, "📌")
        self.assertEqual(root.note, "Note")
        self.assertEqual(root.content, "Root")


class TestOPMLParser(unittest.TestCase):
    """Tests for OPMLParser."""

    def test_parse_simple(self):
        xml = """<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Test</title></head>
  <body>
    <outline text="Root">
      <outline text="Child"/>
    </outline>
  </body>
</opml>"""
        parser = OPMLParser()
        forest = parser.parse(xml)
        self.assertEqual(forest.metadata.get("title"), "Test")
        self.assertEqual(len(forest), 1)
        self.assertEqual(forest[0].content, "Root")
        self.assertEqual(len(forest[0].children), 1)
        self.assertEqual(forest[0].children[0].content, "Child")

    def test_parse_with_note(self):
        xml = """<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Root" _note="This is a note"/>
  </body>
</opml>"""
        parser = OPMLParser()
        forest = parser.parse(xml)
        self.assertEqual(forest[0].note, "This is a note")

    def test_parse_with_collapsed(self):
        xml = """<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Root" collapsed="true">
      <outline text="Child"/>
    </outline>
  </body>
</opml>"""
        parser = OPMLParser()
        forest = parser.parse(xml)
        self.assertTrue(forest[0].collapsed)

    def test_parse_multiple_roots(self):
        xml = """<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Root1"/>
    <outline text="Root2"/>
  </body>
</opml>"""
        parser = OPMLParser()
        forest = parser.parse(xml)
        self.assertEqual(len(forest), 2)


class TestStyle(unittest.TestCase):
    """Tests for style configuration."""

    def test_node_style_defaults(self):
        style = NodeStyle()
        self.assertEqual(style.color, "#333333")
        self.assertEqual(style.background_color, "#ffffff")
        self.assertEqual(style.font_size, 14)

    def test_node_style_to_dict(self):
        style = NodeStyle(color="#ff0000", font_size=16)
        data = style.to_dict()
        self.assertEqual(data["color"], "#ff0000")
        self.assertEqual(data["fontSize"], 16)

    def test_node_style_from_dict(self):
        data = {"color": "#00ff00", "backgroundColor": "#000000", "fontSize": 18}
        style = NodeStyle.from_dict(data)
        self.assertEqual(style.color, "#00ff00")
        self.assertEqual(style.background_color, "#000000")
        self.assertEqual(style.font_size, 18)

    def test_node_style_to_css(self):
        style = NodeStyle(color="#ff0000", font_size=16)
        css = style.to_css()
        self.assertEqual(css["color"], "#ff0000")
        self.assertEqual(css["font-size"], "16px")

    def test_style_config_default(self):
        config = StyleConfig()
        self.assertEqual(config.layout, "right")
        self.assertIsNotNone(config.root_style)
        self.assertIsNotNone(config.default_style)

    def test_style_config_presets(self):
        presets = ["default", "warm", "cool", "ocean", "sunset", "purple", "dark", "minimal"]
        for preset in presets:
            config = StyleConfig.create_preset(preset)
            self.assertIsNotNone(config)
            self.assertEqual(config.layout, "right")

    def test_get_style_for_level(self):
        config = StyleConfig()
        root_style = config.get_style_for_level(0)
        self.assertEqual(root_style.font_size, 20)
        level1_style = config.get_style_for_level(1)
        self.assertLessEqual(level1_style.font_size, 14)

    def test_set_level_style(self):
        config = StyleConfig()
        custom = NodeStyle(color="#ff0000")
        config.set_level_style(2, custom)
        self.assertEqual(config.get_style_for_level(2).color, "#ff0000")

    def test_generate_level_styles(self):
        config = StyleConfig()
        config.generate_level_styles(5)
        for i in range(1, 6):
            self.assertIn(i, config.level_styles)

    def test_style_config_to_dict_and_from_dict(self):
        config = StyleConfig(layout="down")
        data = config.to_dict()
        new_config = StyleConfig.from_dict(data)
        self.assertEqual(new_config.layout, "down")


class TestExporters(unittest.TestCase):
    """Tests for exporters."""

    def setUp(self):
        """Set up test forest."""
        self.forest = MindMapForest()
        root = MindMapNode(content="Root", icon="📌", note="Root note")
        child1 = MindMapNode(content="Child1")
        child2 = MindMapNode(content="Child2")
        root.add_child(child1)
        root.add_child(child2)
        self.forest.add_root(root)
        self.style = StyleConfig()

    def test_ascii_exporter(self):
        exporter = ASCIIExporter(self.style)
        result = exporter.export(self.forest)
        self.assertIn("Root", result)
        self.assertIn("Child1", result)
        self.assertIn("Child2", result)
        self.assertIn("📌", result)

    def test_ascii_exporter_with_notes(self):
        exporter = ASCIIExporter(self.style, show_notes=True)
        result = exporter.export(self.forest)
        self.assertIn("Root note", result)

    def test_ascii_exporter_styles(self):
        for style_name in ["light", "heavy", "double", "simple"]:
            exporter = ASCIIExporter(self.style, style=style_name)
            result = exporter.export(self.forest)
            self.assertIn("Root", result)

    def test_html_exporter(self):
        exporter = HTMLExporter(self.style, layout="right", title="Test Map")
        result = exporter.export(self.forest)
        self.assertIn("Test Map", result)
        self.assertIn("Root", result)
        self.assertIn("Child1", result)
        self.assertIn("Child2", result)
        self.assertIn("toggleNode", result)
        self.assertIn("📌", result)

    def test_html_exporter_layouts(self):
        for layout in ["right", "left", "down"]:
            exporter = HTMLExporter(self.style, layout=layout)
            result = exporter.export(self.forest)
            self.assertIn(f"root-{layout}", result)

    def test_freemind_exporter(self):
        exporter = FreeMindExporter(self.style)
        result = exporter.export(self.forest)
        self.assertIn('<?xml version="1.0"', result)
        self.assertIn('<map version="1.0.1">', result)
        self.assertIn('TEXT="Root"', result)
        self.assertIn('TEXT="Child1"', result)
        self.assertIn('ICON="📌"', result)
        self.assertIn('NOTE="Root note"', result)

    def test_embed_code_exporter_iframe(self):
        exporter = EmbedCodeExporter(self.style)
        result = exporter.export_iframe(self.forest)
        self.assertIn("<iframe", result)
        self.assertIn("data:text/html", result)

    def test_embed_code_exporter_div(self):
        exporter = EmbedCodeExporter(self.style)
        result = exporter.export_div(self.forest)
        self.assertIn("<style>", result)
        self.assertIn("<div", result)
        self.assertIn("<script>", result)

    def test_embed_code_exporter_json(self):
        exporter = EmbedCodeExporter(self.style)
        result = exporter.export_json(self.forest)
        self.assertIn("Root", result)
        self.assertIn("Child1", result)

    def test_forest_with_multiple_roots(self):
        forest = MindMapForest()
        forest.add_root(MindMapNode(content="Root1"))
        forest.add_root(MindMapNode(content="Root2"))
        exporter = HTMLExporter(self.style)
        result = exporter.export(forest)
        self.assertIn("forest-container", result)
        self.assertIn("Root1", result)
        self.assertIn("Root2", result)

    def test_collapsed_node(self):
        root = MindMapNode(content="Root", collapsed=True)
        root.add_child(MindMapNode(content="Child"))
        forest = MindMapForest()
        forest.add_root(root)
        exporter = HTMLExporter(self.style)
        result = exporter.export(forest)
        self.assertIn('collapsed', result)


class TestFileOperations(unittest.TestCase):
    """Tests for file operations."""

    def test_text_parser_file(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("Root\n    Child\n")
            temp_path = f.name
        try:
            forest = TextParser.parse_file(temp_path)
            self.assertEqual(len(forest), 1)
            self.assertEqual(forest[0].content, "Root")
        finally:
            os.unlink(temp_path)

    def test_markdown_parser_file(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write("- Root\n  - Child\n")
            temp_path = f.name
        try:
            forest = MarkdownParser.parse_file(temp_path)
            self.assertEqual(len(forest), 1)
            self.assertEqual(forest[0].content, "Root")
        finally:
            os.unlink(temp_path)

    def test_opml_parser_file(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.opml', delete=False) as f:
            f.write('<?xml version="1.0"?><opml version="2.0"><body><outline text="Root"/></body></opml>')
            temp_path = f.name
        try:
            forest = OPMLParser.parse_file(temp_path)
            self.assertEqual(len(forest), 1)
            self.assertEqual(forest[0].content, "Root")
        finally:
            os.unlink(temp_path)

    def test_html_exporter_file(self):
        forest = MindMapForest()
        forest.add_root(MindMapNode(content="Root"))
        exporter = HTMLExporter()
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            temp_path = f.name
        try:
            exporter.export_file(forest, temp_path)
            self.assertTrue(os.path.exists(temp_path))
            with open(temp_path, 'r') as f:
                content = f.read()
            self.assertIn("Root", content)
        finally:
            os.unlink(temp_path)

    def test_ascii_exporter_file(self):
        forest = MindMapForest()
        forest.add_root(MindMapNode(content="Root"))
        exporter = ASCIIExporter()
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            temp_path = f.name
        try:
            exporter.export_file(forest, temp_path)
            self.assertTrue(os.path.exists(temp_path))
            with open(temp_path, 'r') as f:
                content = f.read()
            self.assertIn("Root", content)
        finally:
            os.unlink(temp_path)


if __name__ == '__main__':
    unittest.main(verbosity=2)
