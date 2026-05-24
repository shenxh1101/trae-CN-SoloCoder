/**
 * 用户相关类型定义
 */

/**
 * 用户角色接口
 */
export interface Role {
  /** 角色ID */
  id: number;
  /** 角色名称 */
  name: string;
  /** 角色编码 */
  code: string;
}

/**
 * 用户信息接口（登录后返回的精简信息）
 */
export interface UserInfo {
  /** 用户ID */
  id: number;
  /** 用户名 */
  username: string;
  /** 真实姓名 */
  realName: string;
  /** 邮箱 */
  email: string;
  /** 头像URL */
  avatar: string;
  /** 所属部门ID */
  departmentId: number;
  /** 所属部门名称 */
  departmentName: string;
  /** 角色编码列表 */
  roles: string[];
  /** 权限编码列表 */
  permissions: string[];
}

/**
 * 用户完整信息接口
 */
export interface User {
  /** 用户ID */
  id: number;
  /** 用户名 */
  username: string;
  /** 真实姓名 */
  realName: string;
  /** 邮箱 */
  email: string;
  /** 手机号 */
  phone: string;
  /** 头像URL */
  avatar: string;
  /** 所属部门ID */
  departmentId: number;
  /** 所属部门名称 */
  departmentName: string;
  /** 用户状态：ACTIVE-启用，DISABLED-禁用 */
  status: 'ACTIVE' | 'DISABLED';
  /** 角色列表 */
  roles: Role[];
  /** 创建时间（ISO格式） */
  createdAt: string;
}

/**
 * 登录请求接口
 */
export interface LoginRequest {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
}

/**
 * 登录响应接口
 */
export interface LoginResponse {
  /** 访问令牌 */
  token: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 用户信息 */
  userInfo: UserInfo;
}
