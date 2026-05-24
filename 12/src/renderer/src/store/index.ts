import { create } from 'zustand';
import type {
  EmailAccount,
  MailFolder,
  Email,
  EmailLabel,
  FilterRule,
  AppSettings,
  Thread,
  SearchQuery,
  SearchResult,
  EmailSignature,
  EmailTemplate,
  GpgKey
} from '@shared/types';

interface AppState {
  initialized: boolean;
  accounts: EmailAccount[];
  folders: MailFolder[];
  labels: EmailLabel[];
  filters: FilterRule[];
  signatures: EmailSignature[];
  templates: EmailTemplate[];
  gpgKeys: GpgKey[];
  settings: AppSettings | null;
  selectedAccountId: string | null;
  selectedFolderId: string | null;
  selectedEmailId: string | null;
  selectedThreadId: string | null;
  emails: Email[];
  threads: Thread[];
  totalEmails: number;
  totalThreads: number;
  currentEmail: Email | null;
  isSyncing: boolean;
  syncProgress: { progress: number; currentFolder: string; accountId: string } | null;
  isLoading: boolean;
  searchResult: SearchResult | null;
  searchQuery: SearchQuery | null;
  showCompose: boolean;
  composeData: Partial<Email> | null;
  showSettings: boolean;
  activeTab: string;
  setInitialized: (value: boolean) => void;
  setAccounts: (accounts: EmailAccount[]) => void;
  setFolders: (folders: MailFolder[]) => void;
  setLabels: (labels: EmailLabel[]) => void;
  setFilters: (filters: FilterRule[]) => void;
  setSignatures: (signatures: EmailSignature[]) => void;
  setTemplates: (templates: EmailTemplate[]) => void;
  setGpgKeys: (keys: GpgKey[]) => void;
  setSettings: (settings: AppSettings) => void;
  setSelectedAccountId: (id: string | null) => void;
  setSelectedFolderId: (id: string | null) => void;
  setSelectedEmailId: (id: string | null) => void;
  setSelectedThreadId: (id: string | null) => void;
  setEmails: (emails: Email[], total: number) => void;
  setThreads: (threads: Thread[], total: number) => void;
  setCurrentEmail: (email: Email | null) => void;
  setIsSyncing: (value: boolean) => void;
  setSyncProgress: (progress: any) => void;
  setIsLoading: (value: boolean) => void;
  setSearchResult: (result: SearchResult | null) => void;
  setSearchQuery: (query: SearchQuery | null) => void;
  setShowCompose: (show: boolean, data?: Partial<Email> | null) => void;
  setShowSettings: (show: boolean) => void;
  setActiveTab: (tab: string) => void;
  addAccount: (account: EmailAccount) => void;
  updateAccount: (account: EmailAccount) => void;
  removeAccount: (id: string) => void;
  addFolder: (folder: MailFolder) => void;
  updateFolder: (folder: MailFolder) => void;
  removeFolder: (id: string) => void;
  addLabel: (label: EmailLabel) => void;
  updateLabel: (label: EmailLabel) => void;
  removeLabel: (id: string) => void;
  addFilter: (filter: FilterRule) => void;
  updateFilter: (filter: FilterRule) => void;
  removeFilter: (id: string) => void;
  addSignature: (signature: EmailSignature) => void;
  updateSignature: (signature: EmailSignature) => void;
  removeSignature: (id: string) => void;
  addTemplate: (template: EmailTemplate) => void;
  updateTemplate: (template: EmailTemplate) => void;
  removeTemplate: (id: string) => void;
  updateEmail: (email: Email) => void;
  removeEmail: (id: string) => void;
  refreshData: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  initialized: false,
  accounts: [],
  folders: [],
  labels: [],
  filters: [],
  signatures: [],
  templates: [],
  gpgKeys: [],
  settings: null,
  selectedAccountId: null,
  selectedFolderId: null,
  selectedEmailId: null,
  selectedThreadId: null,
  emails: [],
  threads: [],
  totalEmails: 0,
  totalThreads: 0,
  currentEmail: null,
  isSyncing: false,
  syncProgress: null,
  isLoading: false,
  searchResult: null,
  searchQuery: null,
  showCompose: false,
  composeData: null,
  showSettings: false,
  activeTab: 'general',

  setInitialized: (value) => set({ initialized: value }),
  setAccounts: (accounts) => set({ accounts }),
  setFolders: (folders) => set({ folders }),
  setLabels: (labels) => set({ labels }),
  setFilters: (filters) => set({ filters }),
  setSignatures: (signatures) => set({ signatures }),
  setTemplates: (templates) => set({ templates }),
  setGpgKeys: (gpgKeys) => set({ gpgKeys }),
  setSettings: (settings) => set({ settings }),
  setSelectedAccountId: (selectedAccountId) => set({ selectedAccountId }),
  setSelectedFolderId: (selectedFolderId) => {
    set({ selectedFolderId, selectedEmailId: null, currentEmail: null, selectedThreadId: null });
  },
  setSelectedEmailId: (selectedEmailId) => set({ selectedEmailId }),
  setSelectedThreadId: (selectedThreadId) => set({ selectedThreadId }),
  setEmails: (emails, totalEmails) => set({ emails, totalEmails }),
  setThreads: (threads, totalThreads) => set({ threads, totalThreads }),
  setCurrentEmail: (currentEmail) => set({ currentEmail }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setSyncProgress: (syncProgress) => set({ syncProgress }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSearchResult: (searchResult) => set({ searchResult }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setShowCompose: (showCompose, composeData = null) => set({ showCompose, composeData }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setActiveTab: (activeTab) => set({ activeTab }),

  addAccount: (account) => set((state) => ({
    accounts: [...state.accounts, account]
  })),

  updateAccount: (account) => set((state) => ({
    accounts: state.accounts.map(a => a.id === account.id ? account : a)
  })),

  removeAccount: (id) => set((state) => ({
    accounts: state.accounts.filter(a => a.id !== id)
  })),

  addFolder: (folder) => set((state) => ({
    folders: [...state.folders, folder]
  })),

  updateFolder: (folder) => set((state) => ({
    folders: state.folders.map(f => f.id === folder.id ? folder : f)
  })),

  removeFolder: (id) => set((state) => ({
    folders: state.folders.filter(f => f.id !== id)
  })),

  addLabel: (label) => set((state) => ({
    labels: [...state.labels, label]
  })),

  updateLabel: (label) => set((state) => ({
    labels: state.labels.map(l => l.id === label.id ? label : l)
  })),

  removeLabel: (id) => set((state) => ({
    labels: state.labels.filter(l => l.id !== id)
  })),

  addFilter: (filter) => set((state) => ({
    filters: [...state.filters, filter]
  })),

  updateFilter: (filter) => set((state) => ({
    filters: state.filters.map(f => f.id === filter.id ? filter : f)
  })),

  removeFilter: (id) => set((state) => ({
    filters: state.filters.filter(f => f.id !== id)
  })),

  addSignature: (signature) => set((state) => ({
    signatures: [...state.signatures, signature]
  })),

  updateSignature: (signature) => set((state) => ({
    signatures: state.signatures.map(s => s.id === signature.id ? signature : s)
  })),

  removeSignature: (id) => set((state) => ({
    signatures: state.signatures.filter(s => s.id !== id)
  })),

  addTemplate: (template) => set((state) => ({
    templates: [...state.templates, template]
  })),

  updateTemplate: (template) => set((state) => ({
    templates: state.templates.map(t => t.id === template.id ? template : t)
  })),

  removeTemplate: (id) => set((state) => ({
    templates: state.templates.filter(t => t.id !== id)
  })),

  updateEmail: (email) => set((state) => ({
    emails: state.emails.map(e => e.id === email.id ? email : e)
  })),

  removeEmail: (id) => set((state) => ({
    emails: state.emails.filter(e => e.id !== id),
    currentEmail: state.currentEmail?.id === id ? null : state.currentEmail
  })),

  refreshData: async () => {
    try {
      set({ isLoading: true });
      const [accounts, folders, labels, filters, signatures, templates, gpgKeys] = await Promise.all([
        window.api.account.list(),
        window.api.folder.list(),
        window.api.label.list(),
        window.api.filter.list(),
        window.api.signature.list(),
        window.api.template.list(),
        window.api.gpg.listKeys()
      ]);
      set({
        accounts: accounts as EmailAccount[],
        folders: folders as MailFolder[],
        labels: labels as EmailLabel[],
        filters: filters as FilterRule[],
        signatures: signatures as EmailSignature[],
        templates: templates as EmailTemplate[],
        gpgKeys: gpgKeys as GpgKey[],
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to refresh data:', error);
      set({ isLoading: false });
    }
  }
}));
