export interface Notebook {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  notebookId: string;
  type: 'folder';
  children?: TreeNode[];
}

export interface Note {
  id: string;
  title: string;
  path: string;
  content: string;
  tags: string[];
  encrypted: boolean;
  passwordHint?: string;
  createdAt: string;
  updatedAt: string;
  backlinks: BacklinkInfo[];
  type: 'note';
}

export interface TreeNode {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'note';
  parentId: string | null;
  notebookId: string;
  children?: TreeNode[];
  tags?: string[];
  encrypted?: boolean;
}

export interface BacklinkInfo {
  sourceNoteId: string;
  sourceNoteTitle: string;
  sourceNotePath: string;
  anchor?: string;
}

export interface LinkInfo {
  targetName: string;
  anchor?: string;
  position: number;
  length: number;
  targetNoteId?: string;
  targetNotePath?: string;
}

export interface Tag {
  name: string;
  count: number;
  noteIds: string[];
}

export interface Snapshot {
  id: string;
  noteId: string;
  notePath: string;
  content: string;
  timestamp: string;
  size: number;
  message?: string;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  category: 'diary' | 'meeting' | 'custom';
  createdAt: string;
  updatedAt: string;
}

export interface UploadConfig {
  type: 'local' | 'qiniu' | 'upyun';
  localPath?: string;
  qiniu?: {
    accessKey: string;
    secretKey: string;
    bucket: string;
    domain: string;
    region: string;
  };
  upyun?: {
    serviceName: string;
    operatorName: string;
    operatorPassword: string;
    domain: string;
  };
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  editorFontFamily: string;
  editorFontSize: number;
  autoSave: boolean;
  autoSaveInterval: number;
  versionSnapshotInterval: number;
  maxSnapshotsPerNote: number;
  imageUpload: UploadConfig;
  pinnedNotes: string[];
  defaultNotebook: string | null;
  defaultTemplate: string | null;
}

export interface PinnedNote {
  notePath: string;
  noteTitle: string;
  pinnedAt: string;
}

export interface SearchResult {
  id: string;
  title: string;
  path: string;
  tags: string[];
  matches: SearchMatch[];
}

export interface SearchMatch {
  field: 'title' | 'content';
  start: number;
  end: number;
  text: string;
  context: string;
}

export interface AppState {
  notebooks: Notebook[];
  currentNotebook: Notebook | null;
  currentNote: Note | null;
  currentFolder: Folder | null;
  fileTree: TreeNode[];
  expandedFolders: Set<string>;
  sidebarWidth: number;
  editorWidth: number;
  previewWidth: number;
  showSidebar: boolean;
  showPreview: boolean;
  viewMode: 'split' | 'editor' | 'preview';
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  loading: boolean;
  error: string | null;
  unsavedChanges: boolean;
}

export interface MetadataFile {
  notebook: Notebook;
  files: {
    id: string;
    type: 'note' | 'folder';
    path: string;
    title?: string;
    tags: string[];
    encrypted: boolean;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  tags: Record<string, { count: number; notes: string[] }>;
}

export interface ExportOptions {
  format: 'pdf' | 'html' | 'image' | 'zip';
  outputPath: string;
  includeStyles?: boolean;
  includeImages?: boolean;
  pageSize?: 'A4' | 'Letter';
}
