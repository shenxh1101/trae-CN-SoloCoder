import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import EditorPage from './pages/EditorPage.jsx';
import { clearOldSaves } from './utils/autosave.js';

function App() {
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    clearOldSaves();
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage showToast={showToast} />} />
        <Route path="/:snippetId" element={<EditorPage showToast={showToast} />} />
      </Routes>
      
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;
