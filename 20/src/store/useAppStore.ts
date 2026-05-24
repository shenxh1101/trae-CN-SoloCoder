import { create } from 'zustand';
import type { Notebook, Note, Folder, TreeNode, SearchResult, Tag, AppState, PinnedNote, Template, Snapshot } from '../types';
import { generateId } from '../utils/helpers';

interface AppStore extends AppState {
  setCurrentNotebook: (notebook: Notebook | null) => void;
  setCurrentNote: (note: Note | null) => void;
  setCurrentFolder: (folder: Folder | null) => void;
  setFileTree: (tree: TreeNode[]) => void;
  addNotebook: (notebook: Notebook) => void;
  removeNotebook: (id: string) => void;
  addNote: (note: Note, parentId?: string | null) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  removeNote: (id: string) => void;
  addFolder: (folder: Folder, parentId?: string | null) => void;
  removeFolder: (id: string) => void;
  moveNode: (nodeId: string, newParentId: string | null, newIndex?: number) => void;
  toggleFolder: (id: string) => void;
  setSidebarWidth: (width: number) => void;
  setEditorWidth: (width: number) => void;
  setPreviewWidth: (width: number) => void;
  toggleSidebar: () => void;
  togglePreview: () => void;
  setViewMode: (mode: 'split' | 'editor' | 'preview') => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setIsSearching: (searching: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUnsavedChanges: (unsaved: boolean) => void;
  loadNotebook: (path: string) => Promise<void>;
  createNote: (parentPath: string, title: string, content?: string, templateId?: string) => Promise<Note | null>;
  saveNote: (noteId: string) => Promise<boolean>;
  loadNote: (notePath: string) => Promise<Note | null>;
  tags: Tag[];
  pinnedNotes: PinnedNote[];
  templates: Template[];
  versions: Snapshot[];
  setTags: (tags: Tag[]) => void;
  setPinnedNotes: (notes: PinnedNote[]) => void;
  setTemplates: (templates: Template[]) => void;
  setVersions: (versions: Snapshot[]) => void;
  addTag: (tag: Tag) => void;
  removeTag: (name: string) => void;
  updateTags: () => void;
  filterByTag: (tagName: string | null) => void;
  activeTagFilter: string | null;
  notes: Note[];
  pinNote: (notePath: string, noteTitle: string) => Promise<boolean>;
  unpinNote: (notePath: string) => Promise<boolean>;
  createNotebook: (name: string, path: string) => Promise<Notebook | null>;
  initApp: () => Promise<void>;
}

const initialState: AppState = {
  notebooks: [],
  currentNotebook: null,
  currentNote: null,
  currentFolder: null,
  fileTree: [],
  expandedFolders: new Set<string>(),
  sidebarWidth: 280,
  editorWidth: 50,
  previewWidth: 50,
  showSidebar: true,
  showPreview: true,
  viewMode: 'split',
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  loading: false,
  error: null,
  unsavedChanges: false,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,
  tags: [],
  pinnedNotes: [],
  templates: [],
  versions: [],
  activeTagFilter: null,
  notes: [],

  setCurrentNotebook: (notebook) => set({ currentNotebook: notebook }),
  setCurrentNote: (note) => set({ currentNote: note }),
  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  setFileTree: (tree) => set({ fileTree: tree }),

  addNotebook: (notebook) =>
    set((state) => ({ notebooks: [...state.notebooks, notebook] })),

  removeNotebook: (id) =>
    set((state) => ({
      notebooks: state.notebooks.filter((n) => n.id !== id),
      currentNotebook: state.currentNotebook?.id === id ? null : state.currentNotebook,
    })),

  addNote: (note, parentId = null) => {
    const node: TreeNode = {
      id: note.id,
      name: note.title,
      path: note.path,
      type: 'note',
      parentId,
      notebookId: get().currentNotebook?.id || '',
      tags: note.tags,
      encrypted: note.encrypted,
    };
    set((state) => ({
      fileTree: insertNode(state.fileTree, node, parentId),
    }));
  },

  updateNote: (id, updates) =>
    set((state) => ({
      currentNote:
        state.currentNote?.id === id ? { ...state.currentNote, ...updates } : state.currentNote,
      fileTree: updateNode(state.fileTree, id, {
        name: updates.title,
        tags: updates.tags,
        encrypted: updates.encrypted,
      }),
    })),

  removeNote: (id) =>
    set((state) => ({
      fileTree: removeNode(state.fileTree, id),
      currentNote: state.currentNote?.id === id ? null : state.currentNote,
    })),

  addFolder: (folder, parentId = null) => {
    const node: TreeNode = {
      id: folder.id,
      name: folder.name,
      path: folder.path,
      type: 'folder',
      parentId,
      notebookId: folder.notebookId,
      children: [],
    };
    set((state) => ({
      fileTree: insertNode(state.fileTree, node, parentId),
      expandedFolders: new Set([...state.expandedFolders, parentId || 'root']),
    }));
  },

  removeFolder: (id) =>
    set((state) => ({
      fileTree: removeNode(state.fileTree, id),
      currentFolder: state.currentFolder?.id === id ? null : state.currentFolder,
      expandedFolders: removeFromSet(state.expandedFolders, id),
    })),

  moveNode: (nodeId, newParentId) =>
    set((state) => ({
      fileTree: moveNodeInTree(state.fileTree, nodeId, newParentId),
    })),

  toggleFolder: (id) =>
    set((state) => ({
      expandedFolders: toggleSet(state.expandedFolders, id),
    })),

  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setEditorWidth: (width) => set({ editorWidth: width, previewWidth: 100 - width }),
  setPreviewWidth: (width) => set({ previewWidth: width, editorWidth: 100 - width }),
  toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
  togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (searching) => set({ isSearching: searching }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setUnsavedChanges: (unsaved) => set({ unsavedChanges: unsaved }),

  loadNotebook: async (path: string) => {
    set({ loading: true, error: null });
    try {
      if (window.electronAPI) {
        const files = await window.electronAPI.dir.list(path);
        const tree = buildFileTree(files, path);
        set({ fileTree: tree, loading: false });
      }
    } catch (error) {
      set({ error: 'Failed to load notebook', loading: false });
      console.error('Failed to load notebook:', error);
    }
  },

  createNote: async (parentPath: string, title: string, content = '', templateId?: string) => {
    try {
      const id = generateId();
      const notePath = `${parentPath}/${title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_')}.md`;
      const now = new Date().toISOString();

      let noteContent = content;
      if (templateId) {
        const template = get().templates.find((t) => t.id === templateId);
        if (template) {
          noteContent = template.content.replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
            .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString());
        }
      }

      const note: Note = {
        id,
        title,
        path: notePath,
        content: noteContent,
        tags: [],
        encrypted: false,
        createdAt: now,
        updatedAt: now,
        backlinks: [],
        type: 'note',
      };

      if (window.electronAPI) {
        const success = await window.electronAPI.file.write(notePath, noteContent);
        if (success) {
          get().addNote(note);
          set({ currentNote: note, unsavedChanges: false });
          return note;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to create note:', error);
      return null;
    }
  },

  saveNote: async (noteId: string) => {
    const { currentNote } = get();
    if (!currentNote || currentNote.id !== noteId) return false;

    try {
      if (window.electronAPI) {
        const tags = extractTags(currentNote.content);
        const updatedNote = {
          ...currentNote,
          tags,
          updatedAt: new Date().toISOString(),
        };

        const success = await window.electronAPI.file.write(
          updatedNote.path,
          updatedNote.content,
          updatedNote.encrypted
        );
        if (success) {
          await window.electronAPI.version.save(updatedNote.path, updatedNote.content);
          set((state) => ({
            currentNote: updatedNote,
            unsavedChanges: false,
            notes: state.notes.map((n) => (n.id === noteId ? updatedNote : n)),
          }));
          get().updateTags();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to save note:', error);
      return false;
    }
  },

  loadNote: async (notePath: string) => {
    set({ loading: true });
    try {
      if (window.electronAPI) {
        const content = await window.electronAPI.file.read(notePath);
        const pathParts = notePath.split('/');
        const title = pathParts[pathParts.length - 1].replace(/\.md$/, '');

        const note: Note = {
          id: generateId(),
          title,
          path: notePath,
          content,
          tags: extractTags(content),
          encrypted: content.startsWith('ENCRYPTED:'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          backlinks: [],
          type: 'note',
        };

        set((state) => ({
          currentNote: note,
          loading: false,
          unsavedChanges: false,
          notes: state.notes.some((n) => n.id === note.id)
            ? state.notes.map((n) => (n.id === note.id ? note : n))
            : [...state.notes, note],
        }));

        return note;
      }
      return null;
    } catch (error) {
      console.error('Failed to load note:', error);
      set({ loading: false, error: 'Failed to load note' });
      return null;
    }
  },

  setTags: (tags) => set({ tags }),
  setPinnedNotes: (notes) => set({ pinnedNotes: notes }),
  setTemplates: (templates) => set({ templates }),
  setVersions: (versions) => set({ versions }),

  addTag: (tag) =>
    set((state) => {
      const existing = state.tags.find((t) => t.name === tag.name);
      if (existing) {
        return {
          tags: state.tags.map((t) =>
            t.name === tag.name ? { ...t, count: t.count + 1 } : t
          ),
        };
      }
      return { tags: [...state.tags, tag] };
    }),

  removeTag: (name) =>
    set((state) => ({
      tags: state.tags.filter((t) => t.name !== name),
    })),

  updateTags: () => {
    const { notes } = get();
    const tagCountMap = new Map<string, number>();

    notes.forEach((note) => {
      const tags = note.tags || [];
      tags.forEach((tag) => {
        tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
      });
    });

    const tags: Tag[] = Array.from(tagCountMap.entries()).map(([name, count]) => ({
      name,
      count,
      noteIds: notes.filter((n) => n.tags?.includes(name)).map((n) => n.id),
    }));

    set({ tags });
  },

  filterByTag: (tagName) => {
    set({ activeTagFilter: tagName });
  },

  pinNote: async (notePath, noteTitle) => {
    try {
      if (window.electronAPI) {
        const success = await window.electronAPI.tray.pin(notePath, noteTitle);
        if (success) {
          const pinned = (await window.electronAPI.tray.getPinned()) as PinnedNote[];
          set({ pinnedNotes: pinned });
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to pin note:', error);
      return false;
    }
  },

  unpinNote: async (notePath) => {
    try {
      if (window.electronAPI) {
        const success = await window.electronAPI.tray.unpin(notePath);
        if (success) {
          const pinned = (await window.electronAPI.tray.getPinned()) as PinnedNote[];
          set({ pinnedNotes: pinned });
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to unpin note:', error);
      return false;
    }
  },

  createNotebook: async (name, path) => {
    try {
      const id = generateId();
      const notebook: Notebook = {
        id,
        name,
        path,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (window.electronAPI) {
        const exists = await window.electronAPI.dir.list(path);
        if (exists.length === 0) {
          await window.electronAPI.dir.create(path);
        }
        set((state) => ({
          notebooks: [...state.notebooks, notebook],
          currentNotebook: notebook,
        }));
        await get().loadNotebook(path);
        return notebook;
      }
      return null;
    } catch (error) {
      console.error('Failed to create notebook:', error);
      return null;
    }
  },

  initApp: async () => {
    try {
      if (!window.electronAPI) return;

      const appPath = await window.electronAPI.app.getPath('documents');
      const notebookPath = `${appPath}/MarkNote/MyNotebook`;

      const exists = await window.electronAPI.file.exists(notebookPath);
      if (!exists) {
        await window.electronAPI.dir.create(notebookPath);
      }

      const notebook = await get().createNotebook('我的笔记本', notebookPath);
      if (!notebook) return;

      const files = await window.electronAPI.dir.list(notebookPath);
      const mdFiles = files.filter((f) => f.type === 'file' && f.name.endsWith('.md'));

      if (mdFiles.length === 0) {
        const welcomeNote = await get().createNote(
          notebookPath,
          '欢迎使用 MarkNote',
          `# 欢迎使用 MarkNote 👋

这是一个功能强大的本地 Markdown 笔记应用。

## 核心功能

- ✏️ **实时双栏编辑** - 左侧编辑源码，右侧实时预览
- 🎨 **语法高亮** - 支持 100+ 编程语言的代码高亮
- 📐 **数学公式** - 使用 LaTeX 语法渲染数学公式

$$
E = mc^2
$$

- 📊 **Mermaid 图表** - 支持流程图、时序图等

\`\`\`mermaid
graph TD
    A[开始] --> B{是否需要帮助?}
    B -->|是| C[查看文档]
    B -->|否| D[开始使用]
    C --> D
\`\`\`

- 🏷️ **标签系统** - 使用 \`#标签\` 为笔记添加分类
- 🔗 **双向链接** - 使用 \`[[笔记名]]\` 链接到其他笔记
- 🔍 **全文搜索** - 快速搜索笔记内容
- 📁 **多级文件夹** - 灵活组织笔记结构
- 💾 **版本历史** - 自动保存快照，随时恢复
- 🌙 **暗色主题** - 保护你的眼睛
- 🔒 **加密保护** - 为私密笔记设置密码

## 快捷键

- \`⌘N\` 新建笔记
- \`⌘S\` 保存笔记
- \`⌘K\` 全局搜索
- \`⌘⇧P\` 打开设置

享受写作的乐趣吧！ 🎉

#入门 #使用指南
`
        );

        if (welcomeNote) {
          await get().createNote(
            notebookPath,
            '数学公式与图表测试',
            `# 数学公式与图表测试

## LaTeX 数学公式

### 行内公式

质能方程：$E = mc^2$

二次方程求根公式：$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$

欧拉公式：$e^{i\pi} + 1 = 0$

### 块级公式

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{bmatrix}
$$

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

$$
f(x) = 
\begin{cases} 
x^2 & \text{if } x \geq 0 \\
-x & \text{if } x < 0 
\end{cases}
$$

## Mermaid 图表

### 流程图

\`\`\`mermaid
graph TD
    A[用户输入] --> B{验证数据}
    B -->|有效| C[处理数据]
    B -->|无效| D[显示错误]
    C --> E[保存到数据库]
    E --> F[返回成功]
    D --> G[返回失败]
    F --> H[结束]
    G --> H
\`\`\`

### 时序图

\`\`\`mermaid
sequenceDiagram
    participant 用户
    participant 前端
    participant 后端API
    participant 数据库

    用户->>前端: 点击登录按钮
    前端->>后端API: POST /api/login (用户名, 密码)
    后端API->>数据库: 查询用户信息
    数据库-->>后端API: 返回用户数据
    alt 认证成功
        后端API-->>前端: 200 OK + JWT Token
        前端->>前端: 存储 Token
        前端-->>用户: 跳转到首页
    else 认证失败
        后端API-->>前端: 401 Unauthorized
        前端-->>用户: 显示错误提示
    end
\`\`\`

### 类图

\`\`\`mermaid
classDiagram
    class Note {
        +String id
        +String title
        +String content
        +String[] tags
        +Date createdAt
        +Date updatedAt
        +save() boolean
        +delete() boolean
    }

    class Notebook {
        +String id
        +String name
        +String path
        +Note[] notes
        +Folder[] folders
        +addNote() Note
        +removeNote() boolean
    }

    class Folder {
        +String id
        +String name
        +Note[] notes
        +Folder[] children
    }

    class Tag {
        +String name
        +int count
        +Note[] notes
    }

    Notebook "1" --> "*" Note
    Notebook "1" --> "*" Folder
    Folder "1" --> "*" Note
    Note "*" --> "*" Tag
\`\`\`

### 状态图

\`\`\`mermaid
stateDiagram-v2
    [*] --> 草稿
    草稿 --> 编辑中 : 开始编辑
    编辑中 --> 已保存 : ⌘S 保存
    已保存 --> 编辑中 : 修改内容
    编辑中 --> 已发布 : 发布
    已发布 --> 编辑中 : 重新编辑
    已保存 --> [*]
    已发布 --> [*]
\`\`\`

### 饼图

\`\`\`mermaid
pie title 笔记类型分布
    "技术笔记" : 45
    "学习笔记" : 25
    "会议记录" : 15
    "日记" : 10
    "其他" : 5
\`\`\`

### 甘特图

\`\`\`mermaid
gantt
    title 项目开发计划
    dateFormat  YYYY-MM-DD
    section 设计阶段
    需求分析     :done,    des1, 2024-01-01, 7d
    系统设计     :done,    des2, after des1, 10d
    section 开发阶段
    前端开发     :active,  dev1, after des2, 20d
    后端开发     :         dev2, after des2, 25d
    section 测试阶段
    功能测试     :         test1, after dev1, 10d
    集成测试     :         test2, after test1, 5d
    section 部署阶段
    上线部署     :         deploy1, after test2, 3d
\`\`\`

#测试 #数学公式 #Mermaid
`
          );

          await get().createNote(
            notebookPath,
            'Markdown 语法指南',
            `# Markdown 语法指南

本文档介绍 MarkNote 支持的 Markdown 语法。

## 标题

使用 \`#\` 符号表示标题，支持 1-6 级。

\`\`\`markdown
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
\`\`\`

## 文本格式

- **粗体文本** 使用 \`**文本**\`
- *斜体文本* 使用 \`*文本*\`
- ~~删除线~~ 使用 \`~~文本~~\`
- \`行内代码\` 使用反引号

## 列表

### 无序列表

- 项目 1
- 项目 2
  - 子项目 A
  - 子项目 B

### 有序列表

1. 第一步
2. 第二步
3. 第三步

### 任务列表

- [x] 已完成任务
- [ ] 待完成任务
- [ ] 待完成任务

## 代码块

支持语法高亮：

\`\`\`javascript
function hello(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Welcome to MarkNote\`;
}

hello('World');
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\`\`\`

## 表格

| 功能 | 描述 | 状态 |
|------|------|------|
| 编辑 | 实时双栏编辑 | ✅ |
| 预览 | Markdown 渲染 | ✅ |
| 搜索 | 全文搜索 | ✅ |
| 导出 | PDF/HTML/图片 | ✅ |

## 引用

> 这是一段引用文本。
> 
> — MarkNote 团队

## 链接和图片

[访问 GitHub](https://github.com)

![示例图片](https://picsum.photos/600/300)

## 数学公式

### 行内公式

爱因斯坦质能方程 $E = mc^2$ 是著名的物理学公式。

### 块级公式

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{bmatrix}
$$

## Mermaid 图表

### 流程图

\`\`\`mermaid
flowchart LR
    A[输入] --> B{处理}
    B --> C[输出]
\`\`\`

### 时序图

\`\`\`mermaid
sequenceDiagram
    participant User
    participant App
    participant DB

    User->>App: 请求数据
    App->>DB: 查询数据库
    DB-->>App: 返回结果
    App-->>User: 显示数据
\`\`\`

#教程 #Markdown
`
          );
        }
      } else {
        await get().loadNotebook(notebookPath);
      }

      const pinned = (await window.electronAPI.tray.getPinned()) as PinnedNote[];
      set({ pinnedNotes: pinned });
    } catch (error) {
      console.error('Failed to init app:', error);
      set({ error: 'Failed to initialize application' });
    }
  },
}));

function insertNode(tree: TreeNode[], node: TreeNode, parentId: string | null): TreeNode[] {
  if (!parentId) {
    return [...tree, node];
  }
  return tree.map((n) => {
    if (n.id === parentId && n.type === 'folder') {
      return { ...n, children: [...(n.children || []), node] };
    }
    if (n.children) {
      return { ...n, children: insertNode(n.children, node, parentId) };
    }
    return n;
  });
}

function updateNode(tree: TreeNode[], id: string, updates: Partial<TreeNode>): TreeNode[] {
  return tree.map((n) => {
    if (n.id === id) {
      return { ...n, ...updates };
    }
    if (n.children) {
      return { ...n, children: updateNode(n.children, id, updates) };
    }
    return n;
  });
}

function removeNode(tree: TreeNode[], id: string): TreeNode[] {
  return tree
    .filter((n) => n.id !== id)
    .map((n) => {
      if (n.children) {
        return { ...n, children: removeNode(n.children, id) };
      }
      return n;
    });
}

function moveNodeInTree(tree: TreeNode[], nodeId: string, newParentId: string | null): TreeNode[] {
  const node = findNode(tree, nodeId);
  if (!node) return tree;
  const treeWithoutNode = removeNode(tree, nodeId);
  return insertNode(treeWithoutNode, node, newParentId);
}

function findNode(tree: TreeNode[], id: string): TreeNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function buildFileTree(files: unknown[], rootPath: string): TreeNode[] {
  const tree: TreeNode[] = [];
  const fileList = files as { path: string; name: string; type: string; size?: number; modifiedAt: string; createdAt: string }[];
  
  fileList.forEach((file) => {
    const relPath = file.path.replace(rootPath, '').replace(/^\//, '');
    const parts = relPath.split('/');
    let currentLevel = tree;
    let currentPath = rootPath;

    parts.forEach((part, index) => {
      currentPath += '/' + part;
      const isLast = index === parts.length - 1;
      const existing = currentLevel.find((n) => n.name === part);

      if (!existing) {
        const node: TreeNode = {
          id: generateId(),
          name: part,
          path: currentPath,
          type: isLast && file.type === 'file' ? 'note' : 'folder',
          parentId: null,
          notebookId: '',
          children: isLast && file.type === 'file' ? undefined : [],
        };
        currentLevel.push(node);
        if (!isLast) {
          currentLevel = node.children!;
        }
      } else if (!isLast) {
        currentLevel = existing.children || [];
      }
    });
  });

  return tree;
}

function toggleSet<T>(set: Set<T>, item: T): Set<T> {
  const newSet = new Set(set);
  if (newSet.has(item)) {
    newSet.delete(item);
  } else {
    newSet.add(item);
  }
  return newSet;
}

function removeFromSet<T>(set: Set<T>, item: T): Set<T> {
  const newSet = new Set(set);
  newSet.delete(item);
  return newSet;
}

function extractTags(content: string): string[] {
  const tagRegex = /#([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;
  const tags: string[] = [];
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    if (!tags.includes(match[1])) {
      tags.push(match[1]);
    }
  }
  return tags;
}
