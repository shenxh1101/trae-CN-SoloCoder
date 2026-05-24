/**
 * 通用API响应类型
 */

/**
 * API统一响应接口
 * @param T 响应数据的泛型类型
 */
export interface ApiResponse<T> {
  /** 响应状态码，200表示成功 */
  code: number;
  /** 响应消息 */
  message: string;
  /** 响应数据 */
  data: T;
  /** 响应时间戳 */
  timestamp: number;
}

/**
 * 分页结果接口
 * @param T 列表项数据的泛型类型
 */
export interface PageResult<T> {
  /** 数据列表 */
  list: T[];
  /** 总记录数 */
  total: number;
  /** 当前页码，从1开始 */
  page: number;
  /** 每页条数 */
  pageSize: number;
}
