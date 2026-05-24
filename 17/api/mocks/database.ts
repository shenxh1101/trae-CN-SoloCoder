import type { User, Snippet, SnippetVersion, Comment, SnippetLike, SnippetFavorite, CodeTemplate, UserStats, Language } from '@/shared/types';

const generateId = (): string => Math.random().toString(36).substring(2, 15);

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

const mockUsers: User[] = [
  {
    id: 'user-1',
    username: 'alice_dev',
    email: 'alice@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    bio: 'Full-stack developer | JavaScript enthusiast',
    createdAt: daysAgo(30),
  },
  {
    id: 'user-2',
    username: 'bob_coder',
    email: 'bob@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    bio: 'Python & Go developer | Open source contributor',
    createdAt: daysAgo(25),
  },
  {
    id: 'user-3',
    username: 'charlie_rust',
    email: 'charlie@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
    bio: 'Rustacean | Systems programming',
    createdAt: daysAgo(20),
  },
];

const mockSnippets: Snippet[] = [
  {
    id: 'snippet-1',
    title: 'JavaScript 快速排序实现',
    description: '一个高效的快速排序算法实现，包含详细注释',
    language: 'javascript',
    code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

// 测试
const numbers = [64, 34, 25, 12, 22, 11, 90];
console.log('排序前:', numbers);
console.log('排序后:', quickSort(numbers));`,
    isPublic: true,
    authorId: 'user-1',
    author: mockUsers[0],
    likesCount: 42,
    favoritesCount: 18,
    forksCount: 7,
    viewsCount: 1256,
    shortCode: 'jsqck1',
    createdAt: daysAgo(15),
    updatedAt: daysAgo(3),
    tags: ['算法', '排序', 'javascript'],
  },
  {
    id: 'snippet-2',
    title: 'Python 异步爬虫示例',
    description: '使用 aiohttp 和 asyncio 的高性能异步爬虫',
    language: 'python',
    code: `import asyncio
import aiohttp

async def fetch_url(session, url):
    async with session.get(url) as response:
        return await response.text()

async def crawl_urls(urls):
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        return results

# 使用示例
async def main():
    urls = [
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3',
    ]
    pages = await crawl_urls(urls)
    for url, content in zip(urls, pages):
        print(f"{url}: {len(content)} bytes")

if __name__ == "__main__":
    asyncio.run(main())`,
    isPublic: true,
    authorId: 'user-2',
    author: mockUsers[1],
    likesCount: 38,
    favoritesCount: 24,
    forksCount: 12,
    viewsCount: 892,
    shortCode: 'pyspd2',
    createdAt: daysAgo(10),
    updatedAt: daysAgo(2),
    tags: ['爬虫', '异步', 'python'],
  },
  {
    id: 'snippet-3',
    title: 'Go 并发 Web 服务器',
    description: '使用 goroutine 的高性能并发 Web 服务器模板',
    language: 'go',
    code: `package main

import (
    "fmt"
    "log"
    "net/http"
    "sync"
)

type Server struct {
    mu    sync.Mutex
    count int
}

func (s *Server) handleRequest(w http.ResponseWriter, r *http.Request) {
    s.mu.Lock()
    s.count++
    requestCount := s.count
    s.mu.Unlock()

    fmt.Fprintf(w, "Hello, World!\\n")
    fmt.Fprintf(w, "Request #%d\\n", requestCount)
    fmt.Fprintf(w, "Path: %s\\n", r.URL.Path)
}

func main() {
    server := &Server{}
    
    http.HandleFunc("/", server.handleRequest)
    
    fmt.Println("Server starting on :8080...")
    log.Fatal(http.ListenAndServe(":8080", nil))
}`,
    isPublic: true,
    authorId: 'user-2',
    author: mockUsers[1],
    likesCount: 56,
    favoritesCount: 31,
    forksCount: 15,
    viewsCount: 1523,
    shortCode: 'gosrv3',
    createdAt: daysAgo(8),
    updatedAt: daysAgo(1),
    tags: ['web', '并发', 'go'],
  },
  {
    id: 'snippet-4',
    title: 'Rust 线程安全单例模式',
    description: '使用 OnceLock 的线程安全单例模式实现',
    language: 'rust',
    code: `use std::sync::OnceLock;

struct AppConfig {
    database_url: String,
    max_connections: u32,
    api_key: String,
}

impl AppConfig {
    fn new() -> Self {
        Self {
            database_url: "postgres://localhost:5432/app".to_string(),
            max_connections: 100,
            api_key: "your-api-key-here".to_string(),
        }
    }

    fn global() -> &'static Self {
        static CONFIG: OnceLock<AppConfig> = OnceLock::new();
        CONFIG.get_or_init(|| AppConfig::new())
    }
}

fn main() {
    let config = AppConfig::global();
    println!("Database URL: {}", config.database_url);
    println!("Max Connections: {}", config.max_connections);
    
    // 所有线程获取同一个实例
    let config2 = AppConfig::global();
    println!("API Key: {}", config2.api_key);
}`,
    isPublic: true,
    authorId: 'user-3',
    author: mockUsers[2],
    likesCount: 29,
    favoritesCount: 16,
    forksCount: 5,
    viewsCount: 634,
    shortCode: 'rstsn4',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(0),
    tags: ['设计模式', '线程安全', 'rust'],
  },
  {
    id: 'snippet-5',
    title: 'JavaScript Promise 并发控制',
    description: '控制并发 Promise 数量的工具函数',
    language: 'javascript',
    code: `async function promisePool(tasks, limit) {
  const results = [];
  const executing = [];
  
  for (let i = 0; i < tasks.length; i++) {
    const p = Promise.resolve().then(() => tasks[i]());
    results.push(p);
    
    if (limit <= tasks.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  
  return Promise.all(results);
}

// 使用示例
const urls = [
  'https://api.example.com/data/1',
  'https://api.example.com/data/2',
  'https://api.example.com/data/3',
  'https://api.example.com/data/4',
  'https://api.example.com/data/5',
];

const tasks = urls.map(url => () => fetch(url).then(r => r.json()));

// 限制同时最多 3 个并发
promisePool(tasks, 3).then(results => {
  console.log('All results:', results);
});`,
    isPublic: true,
    authorId: 'user-1',
    author: mockUsers[0],
    likesCount: 67,
    favoritesCount: 42,
    forksCount: 23,
    viewsCount: 2156,
    shortCode: 'jsprm5',
    createdAt: daysAgo(3),
    updatedAt: daysAgo(0),
    tags: ['Promise', '并发', 'javascript'],
  },
];

const mockVersions: SnippetVersion[] = [
  {
    id: 'ver-1',
    snippetId: 'snippet-1',
    version: '1',
    label: '初始版本',
    code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[0];
  const left = [];
  const right = [];
  
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < pivot) {
      left.push(arr[i]);
    } else {
      right.push(arr[i]);
    }
  }
  
  return [...left, pivot, ...right];
}

// 测试
const arr = [64, 34, 25, 12, 22, 11, 90];
console.log(quickSort(arr));`,
    language: 'javascript',
    createdAt: daysAgo(15),
    createdById: 'user-1',
  },
  {
    id: 'ver-2',
    snippetId: 'snippet-1',
    version: '2',
    label: '优化性能',
    code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = [];
  const right = [];
  const equal = [];
  
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < pivot) {
      left.push(arr[i]);
    } else if (arr[i] > pivot) {
      right.push(arr[i]);
    } else {
      equal.push(arr[i]);
    }
  }
  
  return [...quickSort(left), ...equal, ...quickSort(right)];
}

// 测试
const arr = [64, 34, 25, 12, 22, 11, 90];
console.log(quickSort(arr));`,
    language: 'javascript',
    createdAt: daysAgo(10),
    createdById: 'user-1',
  },
  {
    id: 'ver-3',
    snippetId: 'snippet-1',
    version: '3',
    label: '修复边界情况',
    code: `function quickSort(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    const pivotIndex = partition(arr, low, high);
    quickSort(arr, low, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, high);
  }
  return arr;
}

function partition(arr, low, high) {
  const pivot = arr[high];
  let i = low - 1;
  
  for (let j = low; j < high; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1;
}

// 测试
const arr = [64, 34, 25, 12, 22, 11, 90];
console.log(quickSort([...arr]));`,
    language: 'javascript',
    createdAt: daysAgo(3),
    createdById: 'user-1',
  },
];

const mockComments: Comment[] = [
  {
    id: 'comment-1',
    snippetId: 'snippet-1',
    authorId: 'user-2',
    author: mockUsers[1],
    content: '非常清晰的实现！建议可以添加随机化 pivot 来避免最坏情况 O(n²)。',
    lineNumber: 4,
    lineContent: 'const pivot = arr[Math.floor(arr.length / 2)];',
    createdAt: daysAgo(12),
  },
  {
    id: 'comment-2',
    snippetId: 'snippet-1',
    authorId: 'user-3',
    author: mockUsers[2],
    content: '能不能出一个原地排序的版本？这样空间复杂度可以降到 O(log n)。',
    createdAt: daysAgo(10),
  },
  {
    id: 'comment-3',
    snippetId: 'snippet-1',
    authorId: 'user-1',
    author: mockUsers[0],
    content: '@charlie_rust 好主意！原地版本我已经更新到 v3 了，感谢建议。',
    parentId: 'comment-2',
    createdAt: daysAgo(9),
  },
];

const mockLikes: SnippetLike[] = [
  { id: 'like-1', snippetId: 'snippet-1', userId: 'user-2', createdAt: daysAgo(12) },
  { id: 'like-2', snippetId: 'snippet-1', userId: 'user-3', createdAt: daysAgo(10) },
];

const mockFavorites: SnippetFavorite[] = [
  { id: 'fav-1', snippetId: 'snippet-1', userId: 'user-2', createdAt: daysAgo(12) },
  { id: 'fav-2', snippetId: 'snippet-3', userId: 'user-1', createdAt: daysAgo(5) },
];

const mockTemplates: CodeTemplate[] = [
  {
    id: 'tpl-1',
    language: 'javascript',
    name: 'Hello World',
    description: '基础的 JavaScript Hello World 示例',
    code: 'console.log("Hello, World!");',
    category: '基础',
  },
  {
    id: 'tpl-2',
    language: 'javascript',
    name: '快速排序',
    description: 'JavaScript 实现的快速排序算法',
    code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

console.log(quickSort([64, 34, 25, 12, 22, 11, 90]));`,
    category: '算法',
  },
  {
    id: 'tpl-3',
    language: 'python',
    name: 'Hello World',
    description: '基础的 Python Hello World 示例',
    code: 'print("Hello, World!")',
    category: '基础',
  },
  {
    id: 'tpl-4',
    language: 'python',
    name: '快速排序',
    description: 'Python 实现的快速排序算法',
    code: `def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

print(quick_sort([64, 34, 25, 12, 22, 11, 90]))`,
    category: '算法',
  },
  {
    id: 'tpl-5',
    language: 'go',
    name: 'Hello World',
    description: '基础的 Go Hello World 示例',
    code: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,
    category: '基础',
  },
  {
    id: 'tpl-6',
    language: 'go',
    name: '快速排序',
    description: 'Go 实现的快速排序算法',
    code: `package main

import "fmt"

func quickSort(arr []int) []int {
    if len(arr) <= 1 {
        return arr
    }
    pivot := arr[len(arr)/2]
    var left, middle, right []int
    for _, x := range arr {
        switch {
        case x < pivot:
            left = append(left, x)
        case x == pivot:
            middle = append(middle, x)
        case x > pivot:
            right = append(right, x)
        }
    }
    return append(append(quickSort(left), middle...), quickSort(right)...)
}

func main() {
    fmt.Println(quickSort([]int{64, 34, 25, 12, 22, 11, 90}))
}`,
    category: '算法',
  },
  {
    id: 'tpl-7',
    language: 'rust',
    name: 'Hello World',
    description: '基础的 Rust Hello World 示例',
    code: `fn main() {
    println!("Hello, World!");
}`,
    category: '基础',
  },
  {
    id: 'tpl-8',
    language: 'rust',
    name: '快速排序',
    description: 'Rust 实现的快速排序算法',
    code: `fn quick_sort<T: Ord>(arr: &mut [T]) {
    if arr.len() <= 1 {
        return;
    }
    let pivot = partition(arr);
    let (left, right) = arr.split_at_mut(pivot);
    quick_sort(left);
    quick_sort(&mut right[1..]);
}

fn partition<T: Ord>(arr: &mut [T]) -> usize {
    let len = arr.len();
    let pivot_idx = len / 2;
    arr.swap(pivot_idx, len - 1);
    let mut store_idx = 0;
    for i in 0..len - 1 {
        if arr[i] < arr[len - 1] {
            arr.swap(i, store_idx);
            store_idx += 1;
        }
    }
    arr.swap(store_idx, len - 1);
    store_idx
}

fn main() {
    let mut arr = vec![64, 34, 25, 12, 22, 11, 90];
    quick_sort(&mut arr);
    println!("{:?}", arr);
}`,
    category: '算法',
  },
];

class MockDatabase {
  private users: Map<string, User> = new Map();
  private snippets: Map<string, Snippet> = new Map();
  private versions: Map<string, SnippetVersion> = new Map();
  private comments: Map<string, Comment> = new Map();
  private likes: Map<string, SnippetLike> = new Map();
  private favorites: Map<string, SnippetFavorite> = new Map();
  private templates: Map<string, CodeTemplate> = new Map();
  private shortCodeMap: Map<string, string> = new Map();

  constructor() {
    mockUsers.forEach(u => this.users.set(u.id, u));
    mockSnippets.forEach(s => {
      this.snippets.set(s.id, s);
      this.shortCodeMap.set(s.shortCode, s.id);
    });
    mockVersions.forEach(v => {
      const version = {
        ...v,
        createdBy: this.users.get(v.createdById)!,
      };
      this.versions.set(v.id, version);
    });
    mockComments.forEach(c => {
      const comment = {
        ...c,
        author: this.users.get(c.authorId)!,
      };
      this.comments.set(c.id, comment);
    });
    mockLikes.forEach(l => this.likes.set(l.id, l));
    mockFavorites.forEach(f => this.favorites.set(f.id, f));
    mockTemplates.forEach(t => this.templates.set(t.id, t));
  }

  async $queryRaw(sql: string): Promise<any> {
    console.log('Mock DB Query:', sql.substring(0, 100));
    return [];
  }

  get user() {
    return {
      findUnique: async ({ where }: { where: { id?: string; username?: string; email?: string } }) => {
        if (where.id) return this.users.get(where.id) || null;
        if (where.username) return Array.from(this.users.values()).find(u => u.username === where.username) || null;
        if (where.email) return Array.from(this.users.values()).find(u => u.email === where.email) || null;
        return null;
      },
      findMany: async () => Array.from(this.users.values()),
      create: async ({ data }: { data: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { passwordHash?: string } }) => {
        const user: User = {
          ...data,
          id: generateId(),
          createdAt: new Date(),
        } as User;
        this.users.set(user.id, user);
        return user;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<User> }) => {
        const user = this.users.get(where.id);
        if (!user) return null;
        const updated = { ...user, ...data };
        this.users.set(where.id, updated);
        return updated;
      },
    };
  }

  private transformSnippet(snippet: Snippet, include?: any): any {
    if (!include) return snippet;
    
    const result: any = { ...snippet };
    
    if (include.author && snippet.author) {
      const authorSel = include.author.select;
      if (authorSel) {
        const author: any = {};
        if (authorSel.id) author.id = snippet.author.id;
        if (authorSel.username) author.username = snippet.author.username;
        if (authorSel.avatar) author.avatar = snippet.author.avatar;
        result.author = author;
      } else {
        result.author = snippet.author;
      }
    }
    
    if (include.tags) {
      result.tags = (snippet.tags || []).map((tagName: string) => ({
        tag: { name: tagName },
      }));
    }
    
    return result;
  }

  get snippet() {
    return {
      findUnique: async ({ where, include }: { where: { id?: string; shortCode?: string }; include?: any }) => {
        let snippet: Snippet | null = null;
        if (where.id) snippet = this.snippets.get(where.id) || null;
        if (where.shortCode) {
          const id = this.shortCodeMap.get(where.shortCode);
          snippet = id ? this.snippets.get(id) || null : null;
        }
        return snippet ? this.transformSnippet(snippet, include) : null;
      },
      findMany: async ({
        where,
        orderBy,
        skip,
        take,
        include,
      }: {
        where?: { isPublic?: boolean; language?: Language; authorId?: string; OR?: any[] };
        orderBy?: any;
        skip?: number;
        take?: number;
        include?: any;
      }) => {
        let results = Array.from(this.snippets.values());
        
        if (where?.isPublic !== undefined) {
          results = results.filter(s => s.isPublic === where.isPublic);
        }
        if (where?.language) {
          results = results.filter(s => s.language === where.language);
        }
        if (where?.authorId) {
          results = results.filter(s => s.authorId === where.authorId);
        }
        if (where?.OR) {
          results = results.filter(s => 
            where.OR.some((cond: any) => 
              (cond.title?.contains && s.title.toLowerCase().includes(cond.title.contains.toLowerCase())) ||
              (cond.description?.contains && s.description?.toLowerCase().includes(cond.description.contains.toLowerCase()))
            )
          );
        }
        
        if (orderBy) {
          const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
          results.sort((a, b) => {
            for (const order of orders) {
              const key = Object.keys(order)[0] as keyof Snippet;
              const dir = order[key] as 'asc' | 'desc';
              const aVal = a[key];
              const bVal = b[key];
              if (typeof aVal === 'number' && typeof bVal === 'number') {
                const diff = dir === 'asc' ? aVal - bVal : bVal - aVal;
                if (diff !== 0) return diff;
              }
              if (aVal instanceof Date && bVal instanceof Date) {
                const diff = dir === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
                if (diff !== 0) return diff;
              }
            }
            return 0;
          });
        }
        
        if (skip !== undefined) results = results.slice(skip);
        if (take !== undefined) results = results.slice(0, take);
        
        return results.map(s => this.transformSnippet(s, include));
      },
      count: async () => this.snippets.size,
      create: async ({ data }: { data: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt' | 'likesCount' | 'favoritesCount' | 'forksCount' | 'viewsCount'> }) => {
        const snippet: Snippet = {
          ...data,
          id: generateId(),
          likesCount: 0,
          favoritesCount: 0,
          forksCount: 0,
          viewsCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: this.users.get(data.authorId)!,
          tags: data.tags || [],
        };
        this.snippets.set(snippet.id, snippet);
        this.shortCodeMap.set(snippet.shortCode, snippet.id);
        return snippet;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Snippet> }) => {
        const snippet = this.snippets.get(where.id);
        if (!snippet) return null;
        const updated = { ...snippet, ...data, updatedAt: new Date() };
        this.snippets.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const snippet = this.snippets.get(where.id);
        if (snippet) {
          this.snippets.delete(where.id);
          this.shortCodeMap.delete(snippet.shortCode);
        }
        return snippet;
      },
    };
  }

  private transformVersion(version: SnippetVersion, include?: any): any {
    if (!include) return version;
    
    const result: any = { ...version };
    
    if (include.createdBy && version.createdBy) {
      const userSel = include.createdBy.select;
      if (userSel) {
        const user: any = {};
        if (userSel.id) user.id = version.createdBy.id;
        if (userSel.username) user.username = version.createdBy.username;
        if (userSel.avatar) user.avatar = version.createdBy.avatar;
        result.createdBy = user;
      } else {
        result.createdBy = version.createdBy;
      }
    }
    
    return result;
  }

  get snippetVersion() {
    return {
      findMany: async ({ where, orderBy, include }: { where?: { snippetId?: string }; orderBy?: any; include?: any }) => {
        let results = Array.from(this.versions.values());
        if (where?.snippetId) {
          results = results.filter(v => v.snippetId === where.snippetId);
        }
        if (orderBy) {
          const key = Object.keys(orderBy)[0] as keyof SnippetVersion;
          const dir = orderBy[key] as 'asc' | 'desc';
          results.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            if (aVal instanceof Date && bVal instanceof Date) {
              return dir === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
            }
            return 0;
          });
        }
        return results.map(v => this.transformVersion(v, include));
      },
      findUnique: async ({ where, include }: { where: { id: string }; include?: any }) => {
        const version = this.versions.get(where.id);
        return version ? this.transformVersion(version, include) : null;
      },
      findFirst: async ({ where, orderBy, include }: { where?: { snippetId?: string }; orderBy?: any; include?: any }) => {
        let results = Array.from(this.versions.values());
        if (where?.snippetId) {
          results = results.filter(v => v.snippetId === where.snippetId);
        }
        if (orderBy) {
          const key = Object.keys(orderBy)[0] as keyof SnippetVersion;
          const dir = orderBy[key] as 'asc' | 'desc';
          results.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            if (aVal instanceof Date && bVal instanceof Date) {
              return dir === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
            }
            return 0;
          });
        }
        return results.length > 0 ? this.transformVersion(results[0], include) : null;
      },
      count: async ({ where }: { where?: { snippetId?: string } }) => {
        let results = Array.from(this.versions.values());
        if (where?.snippetId) {
          results = results.filter(v => v.snippetId === where.snippetId);
        }
        return results.length;
      },
      create: async ({ data, include }: { data: Omit<SnippetVersion, 'id' | 'createdAt'>; include?: any }) => {
        const version: SnippetVersion = {
          ...data,
          id: generateId(),
          createdAt: new Date(),
          createdBy: this.users.get(data.createdById)!,
        };
        this.versions.set(version.id, version);
        return this.transformVersion(version, include);
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<SnippetVersion> }) => {
        const version = this.versions.get(where.id);
        if (!version) return null;
        const updated = { ...version, ...data };
        this.versions.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const version = this.versions.get(where.id);
        if (version) this.versions.delete(where.id);
        return version;
      },
    };
  }

  get comment() {
    return {
      findMany: async ({ where, orderBy }: { where?: { snippetId?: string }; orderBy?: any }) => {
        let results = Array.from(this.comments.values());
        if (where?.snippetId) {
          results = results.filter(c => c.snippetId === where.snippetId);
        }
        return results;
      },
      create: async ({ data }: { data: Omit<Comment, 'id' | 'createdAt'> }) => {
        const comment: Comment = {
          ...data,
          id: generateId(),
          createdAt: new Date(),
          author: this.users.get(data.authorId)!,
        };
        this.comments.set(comment.id, comment);
        return comment;
      },
    };
  }

  get snippetLike() {
    return {
      findUnique: async ({ where }: { where?: { snippetId_userId?: { snippetId: string; userId: string } } }) => {
        if (where?.snippetId_userId) {
          const { snippetId, userId } = where.snippetId_userId;
          return Array.from(this.likes.values()).find(l => l.snippetId === snippetId && l.userId === userId) || null;
        }
        return null;
      },
      count: async ({ where }: { where?: { snippetId?: string } }) => {
        if (where?.snippetId) {
          return Array.from(this.likes.values()).filter(l => l.snippetId === where.snippetId).length;
        }
        return this.likes.size;
      },
      create: async ({ data }: { data: Omit<SnippetLike, 'id' | 'createdAt'> }) => {
        const like: SnippetLike = {
          ...data,
          id: generateId(),
          createdAt: new Date(),
        };
        this.likes.set(like.id, like);
        return like;
      },
      delete: async ({ where }: { where?: { snippetId_userId?: { snippetId: string; userId: string } } }) => {
        if (where?.snippetId_userId) {
          const { snippetId, userId } = where.snippetId_userId;
          for (const [id, like] of this.likes) {
            if (like.snippetId === snippetId && like.userId === userId) {
              this.likes.delete(id);
              return like;
            }
          }
        }
        return null;
      },
    };
  }

  get snippetFavorite() {
    return {
      findUnique: async ({ where }: { where?: { snippetId_userId?: { snippetId: string; userId: string } } }) => {
        if (where?.snippetId_userId) {
          const { snippetId, userId } = where.snippetId_userId;
          return Array.from(this.favorites.values()).find(f => f.snippetId === snippetId && f.userId === userId) || null;
        }
        return null;
      },
      findMany: async ({ where }: { where?: { userId?: string } }) => {
        let results = Array.from(this.favorites.values());
        if (where?.userId) {
          results = results.filter(f => f.userId === where.userId);
        }
        return results;
      },
      create: async ({ data }: { data: Omit<SnippetFavorite, 'id' | 'createdAt'> }) => {
        const favorite: SnippetFavorite = {
          ...data,
          id: generateId(),
          createdAt: new Date(),
        };
        this.favorites.set(favorite.id, favorite);
        return favorite;
      },
      delete: async ({ where }: { where?: { snippetId_userId?: { snippetId: string; userId: string } } }) => {
        if (where?.snippetId_userId) {
          const { snippetId, userId } = where.snippetId_userId;
          for (const [id, fav] of this.favorites) {
            if (fav.snippetId === snippetId && fav.userId === userId) {
              this.favorites.delete(id);
              return fav;
            }
          }
        }
        return null;
      },
    };
  }

  get codeTemplate() {
    return {
      findMany: async ({ where, orderBy, skip, take, select }: { where?: { language?: Language; category?: string }; orderBy?: any; skip?: number; take?: number; select?: any }) => {
        let results = Array.from(this.templates.values());
        if (where?.language) {
          results = results.filter(t => t.language === where.language);
        }
        if (where?.category) {
          results = results.filter(t => t.category === where.category);
        }
        if (orderBy) {
          const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
          results.sort((a, b) => {
            for (const order of orders) {
              const key = Object.keys(order)[0] as keyof CodeTemplate;
              const dir = order[key] as 'asc' | 'desc';
              const aVal = a[key];
              const bVal = b[key];
              if (typeof aVal === 'string' && typeof bVal === 'string') {
                const diff = dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                if (diff !== 0) return diff;
              }
            }
            return 0;
          });
        }
        if (skip !== undefined) results = results.slice(skip);
        if (take !== undefined) results = results.slice(0, take);
        
        if (select) {
          return results.map(r => {
            const selected: any = {};
            for (const key of Object.keys(select)) {
              if (select[key]) selected[key] = (r as any)[key];
            }
            return selected;
          });
        }
        
        return results;
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        return this.templates.get(where.id) || null;
      },
      count: async ({ where }: { where?: { language?: Language; category?: string } }) => {
        let results = Array.from(this.templates.values());
        if (where?.language) {
          results = results.filter(t => t.language === where.language);
        }
        if (where?.category) {
          results = results.filter(t => t.category === where.category);
        }
        return results.length;
      },
      create: async ({ data }: { data: Omit<CodeTemplate, 'id'> }) => {
        const template: CodeTemplate = {
          ...data,
          id: generateId(),
        };
        this.templates.set(template.id, template);
        return template;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<CodeTemplate> }) => {
        const template = this.templates.get(where.id);
        if (!template) return null;
        const updated = { ...template, ...data };
        this.templates.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const template = this.templates.get(where.id);
        if (template) this.templates.delete(where.id);
        return template;
      },
    };
  }

  get userSettings() {
    return {
      findUnique: async () => null,
      upsert: async ({ data }: { data: any }) => data,
    };
  }

  get viewStat() {
    return {
      upsert: async () => ({}),
      findMany: async () => [],
    };
  }
}

export const mockDb = new MockDatabase();

export const getUserStats = (userId: string): UserStats => {
  const userSnippets = Array.from(mockSnippets.values()).filter(s => s.authorId === userId);
  const totalSnippets = userSnippets.length;
  const totalForks = userSnippets.reduce((sum, s) => sum + s.forksCount, 0);
  const totalLikes = userSnippets.reduce((sum, s) => sum + s.likesCount, 0);
  const totalViews = userSnippets.reduce((sum, s) => sum + s.viewsCount, 0);
  
  const viewsByDay = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
    return {
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 100) + 10,
    };
  });
  
  const languageCounts: Record<string, number> = {};
  userSnippets.forEach(s => {
    languageCounts[s.language] = (languageCounts[s.language] || 0) + 1;
  });
  const languageDistribution = Object.entries(languageCounts).map(([language, count]) => ({ language, count }));
  
  return {
    totalSnippets,
    totalForks,
    totalLikes,
    totalViews,
    viewsByDay,
    languageDistribution,
  };
};

export default mockDb;
