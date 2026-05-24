## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层"
        A["Vue 3 客户端"] --> B["Socket.io 客户端"]
        A --> C["Vue Router 路由"]
        A --> D["Pinia 状态管理"]
        A --> E["Chart.js 图表"]
        A --> F["TailwindCSS 样式"]
    end
    
    subgraph "后端层"
        G["Express.js 服务器"] --> H["Socket.io 服务端"]
        G --> I["REST API 接口"]
        H --> J["房间管理模块"]
        H --> K["实时投票处理"]
        H --> L["弹幕消息处理"]
        I --> M["用户认证"]
        I --> N["文件存储接口"]
    end
    
    subgraph "数据层"
        O["JSON 文件存储"] --> P["rooms.json 房间数据"]
        O --> Q["backups/ 自动备份"]
    end
    
    subgraph "外部服务"
        R["qrcode 二维码生成"]
        S["@fingerprintjs/fingerprintjs 浏览器指纹"]
    end
    
    B --> H
    C --> G
    D --> A
    E --> A
    F --> A
    J --> O
    K --> O
    L --> O
    N --> O
    A --> S
    A --> R
```

## 2. 技术描述

- **前端**：Vue 3 + TypeScript + Vite + Pinia + Vue Router + TailwindCSS 3 + Chart.js + Socket.io-client + @fingerprintjs/fingerprintjs + qrcode
- **后端**：Node.js + Express 4 + TypeScript + Socket.io + cors
- **数据存储**：本地JSON文件，每分钟自动备份到 backups 目录
- **初始化工具**：vite-init，使用 vue-express-ts 模板

## 3. 路由定义

| 路由 | 页面 | 功能 |
|------|------|------|
| / | 首页 | 创建投票、加入投票入口 |
| /create | 创建房间页 | 设置投票参数，生成房间 |
| /room/:id | 投票页面 | 实时投票、弹幕、结果展示 |
| /room/:id/results | 结果报告页 | 图表展示、统计详情 |

## 4. API 定义

### 4.1 REST API

```typescript
// 创建投票房间
POST /api/rooms
Request: {
  title: string;
  options: string[];
  endTime: number;
  isMultiple: boolean;
  isAnonymous: boolean;
  antiCheat: boolean;
  creatorName: string;
}
Response: {
  roomId: string;
  shareUrl: string;
  qrCodeUrl: string;
}

// 获取房间信息
GET /api/rooms/:id
Response: Room

// 验证投票权限
POST /api/rooms/:id/verify
Request: {
  fingerprint: string;
  ip: string;
}
Response: {
  allowed: boolean;
  hasVoted: boolean;
  role: 'host' | 'voter' | 'viewer';
}
```

### 4.2 Socket.io 事件

```typescript
// 客户端发送事件
socket.emit('join-room', { roomId, userId, userName, fingerprint })
socket.emit('vote', { roomId, optionIds, userId, fingerprint })
socket.emit('danmu', { roomId, userId, userName, content })
socket.emit('control-vote', { roomId, action: 'start' | 'pause' | 'resume' | 'end' })

// 服务端广播事件
socket.on('user-joined', (data) => { user, onlineCount })
socket.on('vote-updated', (data) => { options, totalVotes })
socket.on('danmu-received', (data) => { id, userId, userName, content, timestamp })
socket.on('vote-status-changed', (data) => { status, endTime })
socket.on('vote-ended', (data) => { finalResults })
```

## 5. 服务器架构图

```mermaid
graph LR
    A["客户端请求"] --> B["Express HTTP 服务"]
    A --> C["Socket.io 连接"]
    
    B --> D["中间件层"]
    D --> D1["CORS 处理"]
    D --> D2["IP 提取"]
    D --> D3["请求日志"]
    
    C --> E["Socket 事件处理器"]
    E --> E1["房间连接管理"]
    E --> E2["投票事件处理"]
    E --> E3["弹幕事件处理"]
    E --> E4["控制事件处理"]
    
    E1 --> F["房间管理服务"]
    E2 --> G["投票服务"]
    E3 --> H["弹幕服务"]
    E4 --> I["控制服务"]
    
    F --> J["防刷票验证"]
    G --> J
    J --> J1["IP 检查"]
    J --> J2["指纹检查"]
    
    F --> K["数据存储层"]
    G --> K
    H --> K
    I --> K
    L["定时备份服务"] --> K
    
    K --> M["JSON 文件读写"]
    M --> N["rooms.json"]
    M --> O["backups/*.json"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    ROOM {
        string id PK
        string title
        string status
        string creatorId
        string creatorName
        boolean isMultiple
        boolean isAnonymous
        boolean antiCheat
        number endTime
        number createdAt
        number startedAt
        number endedAt
    }
    
    OPTION {
        string id PK
        string roomId FK
        string text
        number votes
    }
    
    VOTE_RECORD {
        string id PK
        string roomId FK
        string userId
        string userName
        string optionId FK
        string ip
        string fingerprint
        number timestamp
    }
    
    DANMU {
        string id PK
        string roomId FK
        string userId
        string userName
        string content
        number timestamp
    }
    
    USER {
        string id PK
        string name
        string fingerprint
        string lastIp
    }
    
    ROOM ||--o{ OPTION : has
    ROOM ||--o{ VOTE_RECORD : has
    ROOM ||--o{ DANMU : has
    OPTION ||--o{ VOTE_RECORD : "voted in"
    USER ||--o{ VOTE_RECORD : makes
    USER ||--o{ DANMU : sends
```

### 6.2 TypeScript 类型定义

```typescript
// shared/types.ts

export interface Room {
  id: string;
  title: string;
  status: 'waiting' | 'voting' | 'paused' | 'ended';
  creatorId: string;
  creatorName: string;
  options: Option[];
  isMultiple: boolean;
  isAnonymous: boolean;
  antiCheat: boolean;
  endTime: number;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  voteRecords: VoteRecord[];
  danmus: Danmu[];
  onlineUsers: User[];
}

export interface Option {
  id: string;
  text: string;
  votes: number;
}

export interface VoteRecord {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  optionIds: string[];
  ip: string;
  fingerprint: string;
  timestamp: number;
}

export interface Danmu {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  fingerprint: string;
  lastIp: string;
  hasVoted: boolean;
  role: 'host' | 'voter' | 'viewer';
}

export interface VoteUpdate {
  roomId: string;
  options: Option[];
  totalVotes: number;
}
```

### 6.3 JSON 存储结构

```json
{
  "rooms": {
    "roomId1": {
      "id": "roomId1",
      "title": "投票主题",
      "status": "voting",
      "creatorId": "userId1",
      "creatorName": "主持人",
      "options": [
        { "id": "opt1", "text": "选项A", "votes": 10 },
        { "id": "opt2", "text": "选项B", "votes": 15 }
      ],
      "isMultiple": false,
      "isAnonymous": true,
      "antiCheat": true,
      "endTime": 1717234567890,
      "createdAt": 1717234500000,
      "startedAt": 1717234510000,
      "voteRecords": [],
      "danmus": []
    }
  },
  "lastBackup": 1717234560000
}
```

