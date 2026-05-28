"""
MindMap Node and Forest data models.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Iterator, List, Optional


@dataclass
class MindMapNode:
    """A single node in the mind map."""

    content: str
    children: List["MindMapNode"] = field(default_factory=list)
    parent: Optional["MindMapNode"] = None
    node_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    note: Optional[str] = None
    icon: Optional[str] = None
    collapsed: bool = False
    style: Optional[dict] = None
    _level: int = 0

    def add_child(self, child: "MindMapNode") -> "MindMapNode":
        """Add a child node."""
        child.parent = self
        child._level = self._level + 1
        self.children.append(child)
        return child

    def remove_child(self, child: "MindMapNode") -> bool:
        """Remove a child node."""
        if child in self.children:
            self.children.remove(child)
            child.parent = None
            return True
        return False

    def insert_before(self, new_node: "MindMapNode", reference: "MindMapNode") -> bool:
        """Insert a node before a reference child."""
        if reference in self.children:
            idx = self.children.index(reference)
            new_node.parent = self
            new_node._level = self._level + 1
            self.children.insert(idx, new_node)
            return True
        return False

    def insert_after(self, new_node: "MindMapNode", reference: "MindMapNode") -> bool:
        """Insert a node after a reference child."""
        if reference in self.children:
            idx = self.children.index(reference)
            new_node.parent = self
            new_node._level = self._level + 1
            self.children.insert(idx + 1, new_node)
            return True
        return False

    def get_level(self) -> int:
        """Get the depth level of this node (0 for root)."""
        level = 0
        current = self.parent
        while current is not None:
            level += 1
            current = current.parent
        return level

    def get_siblings(self) -> List["MindMapNode"]:
        """Get all sibling nodes."""
        if self.parent is None:
            return []
        return [c for c in self.parent.children if c != self]

    def get_path(self) -> List[str]:
        """Get the path from root to this node as list of node IDs."""
        path = []
        current: Optional["MindMapNode"] = self
        while current is not None:
            path.insert(0, current.node_id)
            current = current.parent
        return path

    def find_by_id(self, node_id: str) -> Optional["MindMapNode"]:
        """Find a node by its ID in the subtree."""
        if self.node_id == node_id:
            return self
        for child in self.children:
            found = child.find_by_id(node_id)
            if found is not None:
                return found
        return None

    def find_by_content(self, content: str, exact: bool = False) -> List["MindMapNode"]:
        """Find nodes by content in the subtree."""
        results = []
        if exact:
            if self.content == content:
                results.append(self)
        else:
            if content.lower() in self.content.lower():
                results.append(self)
        for child in self.children:
            results.extend(child.find_by_content(content, exact))
        return results

    def traverse(self) -> Iterator["MindMapNode"]:
        """Traverse all nodes in the subtree (pre-order)."""
        yield self
        for child in self.children:
            yield from child.traverse()

    def get_descendants(self) -> List["MindMapNode"]:
        """Get all descendant nodes."""
        return list(self.traverse())[1:]

    def get_leaf_nodes(self) -> List["MindMapNode"]:
        """Get all leaf nodes in the subtree."""
        if not self.children:
            return [self]
        leaves = []
        for child in self.children:
            leaves.extend(child.get_leaf_nodes())
        return leaves

    def to_dict(self) -> dict:
        """Convert node to dictionary."""
        return {
            "id": self.node_id,
            "content": self.content,
            "note": self.note,
            "icon": self.icon,
            "collapsed": self.collapsed,
            "style": self.style,
            "level": self.get_level(),
            "children": [child.to_dict() for child in self.children],
        }

    def to_json(self, indent: int = 2) -> str:
        """Convert node to JSON string."""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)

    @classmethod
    def from_dict(cls, data: dict, parent: Optional["MindMapNode"] = None) -> "MindMapNode":
        """Create a node from dictionary."""
        node = cls(
            content=data.get("content", ""),
            node_id=data.get("id", uuid.uuid4().hex[:8]),
            note=data.get("note"),
            icon=data.get("icon"),
            collapsed=data.get("collapsed", False),
            style=data.get("style"),
            parent=parent,
            _level=parent._level + 1 if parent else 0,
        )
        for child_data in data.get("children", []):
            child = cls.from_dict(child_data, node)
            node.children.append(child)
        return node

    def clone(self) -> "MindMapNode":
        """Create a deep copy of this node."""
        return MindMapNode.from_dict(self.to_dict())

    def __repr__(self) -> str:
        return f"MindMapNode(id={self.node_id}, content='{self.content[:30]}...', children={len(self.children)})"

    def __str__(self) -> str:
        return self.content


@dataclass
class MindMapForest:
    """A collection of root nodes (forest mode - multiple roots)."""

    roots: List[MindMapNode] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    def add_root(self, root: MindMapNode) -> MindMapNode:
        """Add a root node."""
        root.parent = None
        root._level = 0
        self.roots.append(root)
        return root

    def remove_root(self, root: MindMapNode) -> bool:
        """Remove a root node."""
        if root in self.roots:
            self.roots.remove(root)
            return True
        return False

    def find_by_id(self, node_id: str) -> Optional[MindMapNode]:
        """Find a node by ID across all trees."""
        for root in self.roots:
            found = root.find_by_id(node_id)
            if found is not None:
                return found
        return None

    def find_by_content(self, content: str, exact: bool = False) -> List[MindMapNode]:
        """Find nodes by content across all trees."""
        results = []
        for root in self.roots:
            results.extend(root.find_by_content(content, exact))
        return results

    def traverse(self) -> Iterator[MindMapNode]:
        """Traverse all nodes in the forest."""
        for root in self.roots:
            yield from root.traverse()

    def get_all_nodes(self) -> List[MindMapNode]:
        """Get all nodes in the forest."""
        return list(self.traverse())

    def to_dict(self) -> dict:
        """Convert forest to dictionary."""
        return {
            "metadata": self.metadata,
            "roots": [root.to_dict() for root in self.roots],
        }

    def to_json(self, indent: int = 2) -> str:
        """Convert forest to JSON string."""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)

    @classmethod
    def from_dict(cls, data: dict) -> "MindMapForest":
        """Create a forest from dictionary."""
        forest = cls(metadata=data.get("metadata", {}))
        for root_data in data.get("roots", []):
            root = MindMapNode.from_dict(root_data)
            forest.roots.append(root)
        return forest

    def __len__(self) -> int:
        return len(self.roots)

    def __iter__(self) -> Iterator[MindMapNode]:
        return iter(self.roots)

    def __getitem__(self, index: int) -> MindMapNode:
        return self.roots[index]
