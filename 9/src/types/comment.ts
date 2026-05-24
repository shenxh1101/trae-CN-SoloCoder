/**
 * 评论相关类型定义
 */

/**
 * @提及用户接口
 */
export interface MentionUser {
  /** 用户ID */
  userId: number;
  /** 用户名 */
  userName: string;
  /** 在评论内容中的起始位置 */
  startIndex: number;
  /** 在评论内容中的结束位置 */
  endIndex: number;
}

/**
 * 评论接口
 */
export interface Comment {
  /** 评论ID */
  id: number;
  /** 关联文档ID */
  documentId: number;
  /** 评论内容 */
  content: string;
  /** 作者ID */
  authorId: number;
  /** 作者姓名 */
  authorName: string;
  /** 作者头像URL */
  authorAvatar: string;
  /** 父评论ID（回复评论时使用） */
  parentId: number | null;
  /** 回复目标用户ID */
  replyToUserId: number | null;
  /** 回复目标用户姓名 */
  replyToUserName: string | null;
  /** @提及的用户列表 */
  mentions: MentionUser[];
  /** 当前用户是否已点赞 */
  isLiked: boolean;
  /** 点赞次数 */
  likeCount: number;
  /** 创建时间（ISO格式） */
  createdAt: string;
  /** 更新时间（ISO格式） */
  updatedAt: string;
}

/**
 * 创建评论请求接口
 */
export interface CreateCommentRequest {
  /** 关联文档ID */
  documentId: number;
  /** 评论内容 */
  content: string;
  /** 父评论ID（回复评论时使用） */
  parentId: number | null;
  /** 回复目标用户ID */
  replyToUserId: number | null;
}
