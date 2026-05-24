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

export interface PinnedNote {
  notePath: string;
  noteTitle: string;
  pinnedAt: string;
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
