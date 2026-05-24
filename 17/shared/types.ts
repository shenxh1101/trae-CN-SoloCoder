export type Language = 'javascript' | 'python' | 'go' | 'rust';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  createdAt: Date;
}

export interface UserStats {
  totalSnippets: number;
  totalForks: number;
  totalLikes: number;
  totalViews: number;
  viewsByDay: { date: string; count: number }[];
  languageDistribution: { language: string; count: number }[];
}

export interface Snippet {
  id: string;
  title: string;
  description?: string;
  language: Language;
  code: string;
  isPublic: boolean;
  authorId: string;
  author: User;
  likesCount: number;
  favoritesCount: number;
  forksCount: number;
  viewsCount: number;
  shortCode: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  forkedFromId?: string;
}

export interface SnippetVersion {
  id: string;
  snippetId: string;
  version: string;
  label?: string;
  code: string;
  language: Language;
  createdAt: Date;
  createdById?: string;
  createdBy?: User;
}

export interface RunRequest {
  language: Language;
  code: string;
  stdin?: string;
}

export interface RunResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  memoryUsed: number;
  error?: string;
}

export interface Comment {
  id: string;
  snippetId: string;
  authorId: string;
  author: User;
  content: string;
  lineNumber?: number;
  lineContent?: string;
  parentId?: string;
  createdAt: Date;
}

export interface Collaborator {
  userId: string;
  username: string;
  avatar: string;
  cursor: {
    lineNumber: number;
    column: number;
    selection?: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };
  };
  color: string;
}

export interface CodeTemplate {
  id: string;
  language: Language;
  name: string;
  description: string;
  code: string;
  category: string;
}

export interface EditorSettings {
  theme: 'vs-dark' | 'vs-light' | 'hc-black';
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  insertSpaces: boolean;
  minimap: boolean;
  wordWrap: 'on' | 'off' | 'wordWrapColumn';
  keybindings: Record<string, string>;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SnippetLike {
  id: string;
  snippetId: string;
  userId: string;
  createdAt: Date;
}

export interface SnippetFavorite {
  id: string;
  snippetId: string;
  userId: string;
  createdAt: Date;
}

export interface SearchQuery {
  q?: string;
  language?: Language;
  sortBy?: 'latest' | 'popular' | 'trending';
  page?: number;
  limit?: number;
}
