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

export interface VoteUpdate {
  roomId: string;
  options: Option[];
  totalVotes: number;
}

export interface CreateRoomRequest {
  title: string;
  options: string[];
  endTime: number;
  isMultiple: boolean;
  isAnonymous: boolean;
  antiCheat: boolean;
  creatorName: string;
}

export interface CreateRoomResponse {
  roomId: string;
  shareUrl: string;
}

export interface VerifyRequest {
  fingerprint: string;
  ip: string;
  userId?: string;
}

export interface VerifyResponse {
  allowed: boolean;
  hasVoted: boolean;
  role: 'host' | 'voter' | 'viewer';
}

export interface ServerToClientEvents {
  'user-joined': (data: { user: User; onlineCount: number }) => void;
  'user-left': (data: { userId: string; onlineCount: number }) => void;
  'vote-updated': (data: VoteUpdate) => void;
  'danmu-received': (data: Danmu) => void;
  'vote-status-changed': (data: { status: Room['status']; endTime?: number }) => void;
  'vote-ended': (data: { finalResults: Option[]; totalVotes: number }) => void;
}

export interface ClientToServerEvents {
  'join-room': (data: { roomId: string; userId: string; userName: string; fingerprint: string }) => void;
  'leave-room': (data: { roomId: string; userId: string }) => void;
  'vote': (data: { roomId: string; optionIds: string[]; userId: string; userName: string; fingerprint: string }) => void;
  'danmu': (data: { roomId: string; userId: string; userName: string; content: string }) => void;
  'control-vote': (data: { roomId: string; userId: string; action: 'start' | 'pause' | 'resume' | 'end' }) => void;
}
