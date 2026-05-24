import { useEffect } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSearchStore } from '@/store/useSearchStore';
import { useAppStore } from '@/store/useAppStore';

export default function Home() {
  const { initSettings } = useSettingsStore();
  const { initIndex } = useSearchStore();
  const { initApp } = useAppStore();

  useEffect(() => {
    const init = async () => {
      await initSettings();
      initIndex();
      await initApp();

      if (window.electronAPI) {
        window.electronAPI.on('app:ready', () => {
          console.log('App ready');
        });

        window.electronAPI.on('note:created', (notePath: unknown) => {
          console.log('Note created:', notePath);
        });
      }
    };

    init();
  }, [initSettings, initIndex, initApp]);

  return <MainLayout />;
}
