export interface KnowledgeEntry {
  id: string;
  question: string;
  keywords: string[];
  answer_points: string[];
  legal_references: string[];
  category: string;
  weight: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  legal_references?: string[];
  urgency_level?: 'low' | 'medium' | 'high';
  urgency_reason?: string;
  recommend_lawyer?: boolean;
  matched_entry_id?: string;
  voted?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface MissedQuestion {
  id: string;
  question: string;
  count: number;
  last_asked_at: string;
}

export interface ChatRequest {
  question: string;
  style: 'simple' | 'professional';
  sessionId?: string;
}

export interface ChatResponse {
  success: boolean;
  data: {
    conversationId: string;
    messageId: string;
    answer: string;
    legal_references: string[];
    urgency_level: 'low' | 'medium' | 'high';
    urgency_reason: string;
    recommend_lawyer: boolean;
    matched_entry_id: string | null;
    matched_score: number;
  };
}

export interface VoteRequest {
  entryId: string;
  messageId: string;
  conversationId: string;
  vote: 'helpful' | 'not_helpful';
}

export interface VoteResponse {
  success: boolean;
  message: string;
  data: {
    entry_id: string;
    message_id?: string;
    conversation_id?: string;
    helpful_count: number;
    not_helpful_count: number;
    total_votes: number;
    helpful_rate: number;
    current_weight: number;
    weight_change: string;
  };
}

export interface AdminStats {
  total_conversations: number;
  total_messages: number;
  total_knowledge_entries: number;
  total_votes: number;
  helpful_rate: number;
  match_rate: number;
  missed_questions: {
    total_unique_questions: number;
    total_ask_count: number;
  };
}

export interface BackupFile {
  filename: string;
  path: string;
  size_bytes: number;
  created_at: string;
}

export interface StyleOption {
  value: 'simple' | 'professional';
  label: string;
  description: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    value: 'simple',
    label: '通俗解释',
    description: '用通俗易懂的语言解释法律问题'
  },
  {
    value: 'professional',
    label: '专业法言',
    description: '使用专业法律术语和格式'
  }
];
