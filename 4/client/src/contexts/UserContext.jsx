import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved user');
      }
    }
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await api.users.getAll();
      setUsers(data);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  }

  async function setUser(username) {
    try {
      const user = await api.users.create(username);
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      await loadUsers();
      return user;
    } catch (e) {
      console.error('Failed to set user:', e);
      throw e;
    }
  }

  function clearUser() {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  }

  return (
    <UserContext.Provider value={{ currentUser, users, loading, setUser, clearUser, loadUsers }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
