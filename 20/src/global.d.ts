export {};

declare global {
  interface Window {
    electronAPI: {
      file: {
        read: (path: string) => Promise<string>;
        write: (path: string, content: string, encrypted?: boolean, password?: string) => Promise<boolean>;
        delete: (path: string) => Promise<boolean>;
        move: (from: string, to: string) => Promise<boolean>;
        exists: (path: string) => Promise<boolean>;
      };
      dir: {
        list: (path: string) => Promise<Array<{ path: string; name: string; type: string; size?: number; modifiedAt: string; createdAt: string }>>;
        create: (path: string) => Promise<boolean>;
        delete: (path: string) => Promise<boolean>;
      };
      version: {
        save: (notePath: string, content: string, message?: string) => Promise<string>;
        list: (notePath: string) => Promise<Array<{ id: string; timestamp: string; size: number; content?: string }>>;
        restore: (notePath: string, snapshotId: string) => Promise<string>;
        delete: (notePath: string, snapshotId: string) => Promise<boolean>;
      };
      export: {
        pdf: (html: string, outputPath: string, options?: object) => Promise<boolean>;
        html: (html: string, outputPath: string, options?: object) => Promise<boolean>;
        image: (imageData: string, outputPath: string) => Promise<boolean>;
        zip: (notebookPath: string, outputPath: string) => Promise<boolean>;
      };
      tray: {
        pin: (notePath: string, noteTitle: string) => Promise<boolean>;
        unpin: (notePath: string) => Promise<boolean>;
        getPinned: () => Promise<Array<{ notePath: string; noteTitle: string; pinnedAt: string }>>;
      };
      upload: {
        image: (imagePath: string, config: object) => Promise<string>;
        clipboardImage: () => Promise<string | null>;
      };
      crypto: {
        encrypt: (content: string, password: string) => Promise<string>;
        decrypt: (encrypted: string, password: string) => Promise<string | null>;
        verifyPassword: (encrypted: string, password: string) => Promise<boolean>;
      };
      settings: {
        get: () => Promise<object>;
        set: (settings: object) => Promise<boolean>;
      };
      app: {
        getPath: (name: string) => Promise<string>;
        showOpenDialog: (options: object) => Promise<{ canceled: boolean; filePaths: string[] }>;
        showSaveDialog: (options: object) => Promise<{ canceled: boolean; filePath?: string }>;
        showMessageBox: (options: object) => Promise<object>;
        openExternal: (url: string) => Promise<void>;
      };
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
        setTitle: (title: string) => Promise<void>;
      };
      on: (channel: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (channel: string, callback: (...args: unknown[]) => void) => void;
    };

    handleWikiLinkClick: (targetName: string, anchor: string) => void;
    handleTagClick: (tag: string) => void;
  }

  interface CSSProperties {
    WebkitAppRegion?: string;
  }
}
