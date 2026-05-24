import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import MainLayout from './components/layout/MainLayout';
import MailView from './pages/MailView';
import SearchView from './pages/SearchView';
import SettingsView from './pages/SettingsView';
import LabelView from './pages/LabelView';
import { ThemeProvider } from './components/ThemeProvider';
import type { AppSettings, EmailAccount, MailFolder, EmailLabel, FilterRule } from '@shared/types';

declare global {
  interface Window {
    api: any;
  }
}

export default function App() {
  const { setAccounts, setFolders, setLabels, setFilters, setSettings, setInitialized } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const [settings, accounts, folders, labels, filters] = await Promise.all([
          window.api.settings.get(),
          window.api.account.list(),
          window.api.folder.list(),
          window.api.label.list(),
          window.api.filter.list()
        ]);

        setSettings(settings);
        setAccounts(accounts as EmailAccount[]);
        setFolders(folders as MailFolder[]);
        setLabels(labels as EmailLabel[]);
        setFilters(filters as FilterRule[]);
        
        if (accounts.length > 0) {
          const inboxFolder = folders.find((f: MailFolder) => 
            f.name.toLowerCase() === 'inbox' || f.name.toLowerCase() === '收件箱'
          );
          if (inboxFolder) {
            useStore.getState().setSelectedFolderId(inboxFolder.id);
          }
        }

        const cleanup = window.api.sync.onProgress((data: any) => {
          useStore.getState().setSyncProgress(data);
        });

        setInitialized(true);
        setLoading(false);

        return cleanup;
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setLoading(false);
      }
    };

    initializeApp();
  }, [setAccounts, setFolders, setLabels, setFilters, setSettings, setInitialized]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/mail" replace />} />
          <Route path="/mail" element={<MailView />} />
          <Route path="/mail/folder/:folderId" element={<MailView />} />
          <Route path="/mail/thread/:threadId" element={<MailView />} />
          <Route path="/search" element={<SearchView />} />
          <Route path="/label/:labelId" element={<LabelView />} />
          <Route path="/settings/*" element={<SettingsView />} />
        </Routes>
      </MainLayout>
    </ThemeProvider>
  );
}
