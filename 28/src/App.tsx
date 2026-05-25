import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import LoginPage from "@/components/LoginPage";
import RadioPage from "@/components/RadioPage";
import PlaylistDetailPage from "@/components/PlaylistDetailPage";
import HistoryPage from "@/pages/HistoryPage";
import Sidebar from "@/components/Sidebar";
import PlayerBar from "@/components/PlayerBar";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PlayQueue from "@/components/PlayQueue";
import ApiStatusIndicator from "@/components/ApiStatusIndicator";
import { usePlayerStore } from "@/store/playerStore";
import { useApiStatusStore } from "@/store/apiStatusStore";
import { usePlayer } from "@/hooks";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading } = usePlayer();
  const [showQueue, setShowQueue] = useState(false);
  const { currentSong } = usePlayerStore();
  const { status, error, setError } = useApiStatusStore();
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  useEffect(() => {
    if (error && (status === 'fallback' || status === 'offline')) {
      setShowErrorBanner(true);
      const timer = setTimeout(() => setShowErrorBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, status]);

  useEffect(() => {
    useApiStatusStore.getState().checkApiHealth();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="absolute top-4 right-4 z-50">
          <ApiStatusIndicator />
        </div>
        <AnimatePresence>
          {showErrorBanner && error && (
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              className={cn(
                'fixed top-0 left-0 right-0 z-50 p-4',
                status === 'fallback' ? 'bg-amber-500/90' : 'bg-red-500/90'
              )}
            >
              <div className="max-w-5xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">{error}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => useApiStatusStore.getState().checkApiHealth()}
                    className="px-4 py-1.5 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors"
                  >
                    重试
                  </button>
                  <button
                    onClick={() => {
                      setShowErrorBanner(false);
                      setError(null);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
      <AnimatePresence>
        {showQueue && (
          <PlayQueue isOpen={showQueue} onClose={() => setShowQueue(false)} />
        )}
      </AnimatePresence>
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <PlayerBar onToggleQueue={() => setShowQueue(!showQueue)} showQueue={showQueue} />
      </div>
      {loading && !currentSong && (
        <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-accent-purple border-t-transparent animate-spin" />
            <p className="text-text-secondary">正在加载...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={
          <AppLayout>
            <LoginPage />
          </AppLayout>
        } />
        <Route path="/radio" element={
          <AppLayout>
            <RadioPage />
          </AppLayout>
        } />
        <Route path="/playlist/:id" element={
          <AppLayout>
            <PlaylistDetailPage />
          </AppLayout>
        } />
        <Route path="/history" element={
          <AppLayout>
            <HistoryPage />
          </AppLayout>
        } />
      </Routes>
    </Router>
  );
}
