export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  pages: number;
  items: T[];
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: unknown[];
  timestamp: string;
  path?: string;
}
