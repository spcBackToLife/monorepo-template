export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export interface RequestConfig<TQuery = unknown, TBody = unknown> {
  url: string;
  method?: HttpMethod;
  query?: TQuery;
  body?: TBody;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface HttpResponse<TData> {
  status: number;
  data: TData;
  headers: Record<string, string>;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiListResponse<TItem> {
  items: TItem[];
  pagination?: Pagination;
}

export interface ApiEnvelope<TData> {
  code: number;
  message: string;
  data: TData;
}
