import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ChatPage from "@/pages/ChatPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import KnowledgeManagementPage from "@/pages/KnowledgeManagementPage";
import MissedQuestionsPage from "@/pages/MissedQuestionsPage";
import BackupManagementPage from "@/pages/BackupManagementPage";
import { useAdminStore } from "@/store/useChatStore";

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAdminStore();
  return isLoggedIn ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/knowledge"
          element={
            <AdminRoute>
              <KnowledgeManagementPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/missed"
          element={
            <AdminRoute>
              <MissedQuestionsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/backups"
          element={
            <AdminRoute>
              <BackupManagementPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
