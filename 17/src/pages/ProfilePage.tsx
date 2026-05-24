import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  User,
  Code2,
  Heart,
  Eye,
  Calendar,
  GitFork,
  BarChart3,
  FileCode,
  Bookmark,
  TrendingUp,
  MapPin,
  Link as LinkIcon,
  Edit3,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import SnippetCard from '@/components/snippets/SnippetCard';
import Empty from '@/components/Empty';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSnippetStore } from '@/stores/useSnippetStore';
import { useEditorStore } from '@/stores/useEditorStore';
import type { UserStats, Snippet } from '@/shared/types';

const mockViewsByDay = [
  { date: '05-18', count: 45 },
  { date: '05-19', count: 62 },
  { date: '05-20', count: 38 },
  { date: '05-21', count: 89 },
  { date: '05-22', count: 120 },
  { date: '05-23', count: 75 },
  { date: '05-24', count: 156 },
];

const mockLanguageDistribution = [
  { language: 'JavaScript', count: 12 },
  { language: 'Python', count: 8 },
  { language: 'Go', count: 5 },
  { language: 'Rust', count: 3 },
];

const mockSnippets: Snippet[] = [
  {
    id: '1',
    title: '快速排序算法实现',
    description: 'JavaScript 实现的快速排序算法，包含详细注释',
    language: 'javascript',
    code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}`,
    isPublic: true,
    authorId: '1',
    author: {
      id: '1',
      username: 'demo_user',
      email: 'demo@example.com',
      createdAt: new Date('2024-01-01'),
    },
    likesCount: 128,
    favoritesCount: 45,
    forksCount: 23,
    viewsCount: 1520,
    shortCode: 'abc123',
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-05-20'),
    tags: ['算法', '排序', 'JavaScript'],
  },
  {
    id: '2',
    title: 'Python 数据爬取模板',
    description: '使用 requests 和 BeautifulSoup 的通用爬虫模板',
    language: 'python',
    code: `import requests
from bs4 import BeautifulSoup

def scrape(url):
    headers = {'User-Agent': 'Mozilla/5.0'}
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    return soup`,
    isPublic: true,
    authorId: '1',
    author: {
      id: '1',
      username: 'demo_user',
      email: 'demo@example.com',
      createdAt: new Date('2024-01-01'),
    },
    likesCount: 89,
    favoritesCount: 67,
    forksCount: 34,
    viewsCount: 2340,
    shortCode: 'def456',
    createdAt: new Date('2024-04-10'),
    updatedAt: new Date('2024-05-15'),
    tags: ['爬虫', 'Python', '数据'],
  },
];

const mockFavoriteSnippets: Snippet[] = [
  {
    id: '3',
    title: 'Go 并发模式',
    description: 'Goroutine 和 Channel 的常用并发模式',
    language: 'go',
    code: `package main

import (
    "fmt"
    "sync"
)

func worker(id int, jobs <-chan int, results chan<- int) {
    for j := range jobs {
        results <- j * 2
    }
}`,
    isPublic: true,
    authorId: '2',
    author: {
      id: '2',
      username: 'gopher',
      email: 'gopher@example.com',
      createdAt: new Date('2024-02-01'),
    },
    likesCount: 256,
    favoritesCount: 128,
    forksCount: 56,
    viewsCount: 4560,
    shortCode: 'ghi789',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-05-10'),
    tags: ['Go', '并发', 'Goroutine'],
  },
];

const COLORS = ['#3B82F6', '#8B5CF6', '#06B6D4', '#F97316'];

type ProfileTab = 'created' | 'favorites' | 'stats';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, logout } = useAuthStore();
  const { snippets, likeSnippet, favoriteSnippet, forkSnippet } = useSnippetStore();
  const { setCode, setLanguage } = useEditorStore();
  
  const [activeTab, setActiveTab] = useState<ProfileTab>('created');
  const [isLoading, setIsLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    const timer = setTimeout(() => {
      setProfileUser({
        id: '1',
        username: username || 'demo_user',
        email: 'demo@example.com',
        avatar: '',
        bio: '热爱编程，专注于 Web 开发和算法。分享代码，分享快乐。',
        location: '北京',
        website: 'https://example.com',
        createdAt: new Date('2024-01-15'),
      });
      setUserStats({
        totalSnippets: 28,
        totalForks: 156,
        totalLikes: 892,
        totalViews: 15680,
        viewsByDay: mockViewsByDay,
        languageDistribution: mockLanguageDistribution,
      });
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleRun = useCallback((snippet: any) => {
    setCode(snippet.code);
    setLanguage(snippet.language);
    window.location.href = `/editor/${snippet.shortCode}`;
  }, [setCode, setLanguage]);

  const handleNewSnippet = () => {
    setCode(`// JavaScript 代码
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
`);
    setLanguage('javascript');
    window.location.href = '/editor/new';
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  const displaySnippets = activeTab === 'created' ? mockSnippets : mockFavoriteSnippets;

  const tabs = [
    { key: 'created' as const, label: '我创建的', icon: FileCode, count: userStats?.totalSnippets || 0 },
    { key: 'favorites' as const, label: '我收藏的', icon: Bookmark, count: mockFavoriteSnippets.length },
    { key: 'stats' as const, label: '访问统计', icon: BarChart3 },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={currentUser} onLogout={logout} onLogin={handleLogin} />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-500 dark:text-gray-400">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar user={currentUser} onLogout={logout} onLogin={handleLogin} onNewSnippet={handleNewSnippet} />

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 pb-24 pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {profileUser?.avatar ? (
                <img
                  src={profileUser.avatar}
                  alt={profileUser.username}
                  className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-xl dark:border-gray-800"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-400 to-purple-500 shadow-xl dark:border-gray-800">
                  <User className="h-16 w-16 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-white">{profileUser?.username}</h1>
                {profileUser?.bio && (
                  <p className="mt-2 max-w-xl text-white/80">{profileUser.bio}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-white/70">
                  {profileUser?.location && (
                    <span className="flex items-center gap-1.5 text-sm">
                      <MapPin className="h-4 w-4" />
                      {profileUser.location}
                    </span>
                  )}
                  {profileUser?.website && (
                    <a
                      href={profileUser.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm hover:text-white hover:underline"
                    >
                      <LinkIcon className="h-4 w-4" />
                      {profileUser.website}
                    </a>
                  )}
                  <span className="flex items-center gap-1.5 text-sm">
                    <Calendar className="h-4 w-4" />
                    加入于 {new Date(profileUser?.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
                  </span>
                </div>
              </div>
            </div>

            {isOwnProfile && (
              <button className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30 transition-colors">
                <Edit3 className="h-4 w-4" />
                编辑资料
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <FileCode className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats?.totalSnippets || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">代码片段</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                <Heart className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats?.totalLikes || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">获赞</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                <GitFork className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats?.totalForks || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">被 Fork</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <Eye className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats?.totalViews?.toLocaleString() || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">总浏览</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 dark:border-gray-800">
            <nav className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'relative inline-flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-medium transition-colors',
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {(activeTab === 'created' || activeTab === 'favorites') && (
              <div>
                {displaySnippets.length === 0 ? (
                  <Empty
                    title={activeTab === 'created' ? '还没有创建代码片段' : '还没有收藏任何代码片段'}
                    description={activeTab === 'created' ? '开始创建你的第一个代码片段吧' : '探索广场，发现精彩代码'}
                    action={
                      <button
                        onClick={handleNewSnippet}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        <Code2 className="h-4 w-4" />
                        创建代码片段
                      </button>
                    }
                  />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {displaySnippets.map((snippet) => (
                      <SnippetCard
                        key={snippet.id}
                        snippet={snippet}
                        onLike={likeSnippet}
                        onFavorite={favoriteSnippet}
                        onFork={forkSnippet}
                        onRun={handleRun}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && userStats && (
              <div className="space-y-8">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
                    <div className="mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        近 7 天访问趋势
                      </h3>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={userStats.viewsByDay}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                          <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                          <YAxis stroke="#6B7280" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#F9FAFB',
                            }}
                            labelStyle={{ color: '#F9FAFB' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            fill="url(#colorViews)"
                            name="访问量"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
                    <div className="mb-4 flex items-center gap-2">
                      <Code2 className="h-5 w-5 text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        编程语言分布
                      </h3>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={userStats.languageDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="count"
                            nameKey="language"
                            label={({ language, percent }) => `${language} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {userStats.languageDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#F9FAFB',
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      各语言代码片段数量
                    </h3>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={userStats.languageDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                        <XAxis dataKey="language" stroke="#6B7280" fontSize={12} />
                        <YAxis stroke="#6B7280" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#F9FAFB',
                          }}
                        />
                        <Bar dataKey="count" name="数量" radius={[4, 4, 0, 0]}>
                          {userStats.languageDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
