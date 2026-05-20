import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import SurveyList from './pages/SurveyList.jsx'
import SurveyEditor from './pages/SurveyEditor.jsx'
import SurveyPreview from './pages/SurveyPreview.jsx'
import SurveyFill from './pages/SurveyFill.jsx'
import SurveyStats from './pages/SurveyStats.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import PrivateRoute from './components/PrivateRoute.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/survey/:id" element={<SurveyFill />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/surveys"
        element={
          <PrivateRoute>
            <SurveyList />
          </PrivateRoute>
        }
      />
      <Route
        path="/surveys/new"
        element={
          <PrivateRoute>
            <SurveyEditor />
          </PrivateRoute>
        }
      />
      <Route
        path="/surveys/:id/edit"
        element={
          <PrivateRoute>
            <SurveyEditor />
          </PrivateRoute>
        }
      />
      <Route
        path="/surveys/:id/preview"
        element={
          <PrivateRoute>
            <SurveyPreview />
          </PrivateRoute>
        }
      />
      <Route
        path="/surveys/:id/stats"
        element={
          <PrivateRoute>
            <SurveyStats />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <AdminPanel />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
