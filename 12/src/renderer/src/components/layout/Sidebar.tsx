import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import { Badge } from '../ui/Badge';
import type { EmailAccount, MailFolder, EmailLabel } from '@shared/types';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const FolderTreeItem: React.FC<{
  folder: MailFolder;
  folders: MailFolder[];
  selectedFolderId: string | null;
  onSelect: (folderId: string) => void;
  level?: number;
}> = ({ folder, folders, selectedFolderId, onSelect, level = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const childFolders = folders.filter(f => f.parentId === folder.id);
  const hasChildren = childFolders.length > 0;
  const isSelected = selectedFolderId === folder.id;

  const getFolderIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName === 'inbox' || lowerName === '收件箱') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      );
    }
    if (lowerName === 'sent' || lowerName === '已发送' || lowerName === '发件箱') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      );
    }
    if (lowerName === 'draft' || lowerName === '草稿' || lowerName === 'drafts') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    }
    if (lowerName === 'trash' || lowerName === '垃圾箱' || lowerName === 'deleted') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    }
    if (lowerName === 'junk' || lowerName === '垃圾邮件' || lowerName === 'spam') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }
    if (lowerName === 'archive' || lowerName === '归档') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    }
    if (lowerName === 'starred' || lowerName === '星标邮件') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    );
  };

  return (
    <div>
      <div
        onClick={() => onSelect(folder.id)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
          transition-colors duration-150
          ${isSelected
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        {getFolderIcon(folder.name)}
        <span className="flex-1 truncate text-sm">{folder.name}</span>
        {folder.unreadCount > 0 && (
          <Badge variant="primary">{folder.unreadCount}</Badge>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {childFolders.map(childFolder => (
            <FolderTreeItem
              key={childFolder.id}
              folder={childFolder}
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle }) => {
  const location = useLocation();
  const {
    accounts,
    folders,
    labels,
    selectedAccountId,
    selectedFolderId,
    setSelectedAccountId,
    setSelectedFolderId,
    setShowCompose
  } = useStore();

  const currentAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];
  const accountFolders = folders.filter(f => f.accountId === currentAccount?.id);
  const rootFolders = accountFolders.filter(f => !f.parentId);

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
    const accountFolders = folders.filter(f => f.accountId === accountId);
    const inboxFolder = accountFolders.find(f => 
      f.name.toLowerCase() === 'inbox' || f.name.toLowerCase() === '收件箱'
    );
    if (inboxFolder) {
      setSelectedFolderId(inboxFolder.id);
    } else if (accountFolders.length > 0) {
      setSelectedFolderId(accountFolders[0].id);
    }
  };

  return (
    <aside
      className={`
        flex flex-col h-full bg-gray-50 dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-800
        transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Solo Mail
          </h1>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <div className="p-3">
          <button
            onClick={() => setShowCompose(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary-600/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            写邮件
          </button>
        </div>
      )}

      {!collapsed && accounts.length > 1 && (
        <div className="px-3 py-2">
          <select
            value={currentAccount?.id || ''}
            onChange={(e) => handleAccountChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {!collapsed && (
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <div className="mb-4">
            <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              文件夹
            </div>
            <div className="mt-1 space-y-0.5">
              {rootFolders.map(folder => (
                <FolderTreeItem
                  key={folder.id}
                  folder={folder}
                  folders={accountFolders}
                  selectedFolderId={selectedFolderId}
                  onSelect={handleFolderSelect}
                />
              ))}
            </div>
          </div>

          {labels.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                标签
              </div>
              <div className="mt-1 space-y-0.5">
                {labels.map(label => (
                  <Link
                    key={label.id}
                    to={`/label/${label.id}`}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                      transition-colors duration-150
                      ${location.pathname === `/label/${label.id}`
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 truncate">{label.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              快捷操作
            </div>
            <div className="mt-1 space-y-0.5">
              <Link
                to="/search"
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                  transition-colors duration-150
                  ${location.pathname === '/search'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                搜索
              </Link>
              <Link
                to="/settings"
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                  transition-colors duration-150
                  ${location.pathname.startsWith('/settings')
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                设置
              </Link>
            </div>
          </div>
        </nav>
      )}

      {!collapsed && currentAccount && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
              {currentAccount.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {currentAccount.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {currentAccount.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
