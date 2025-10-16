import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestHeaders,
  AxiosResponse,
  type InternalAxiosRequestConfig,
  type RawAxiosRequestHeaders,
} from 'axios';
import { ApiError, ErrorCode } from './errors';
import { ApiEnvelope, HttpMethod, HttpResponse, RequestConfig } from './types';

export interface CreateHttpClientOptions {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
  getAuthToken?: () => string | undefined;
}

export class HttpClient {
  private readonly instance: AxiosInstance;
  private readonly getAuthToken?: () => string | undefined;

  constructor(options: CreateHttpClientOptions = {}) {
    this.getAuthToken = options.getAuthToken;
    this.instance = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeoutMs ?? 15000,
      headers: options.defaultHeaders,
    });

    this.instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = this.getAuthToken?.();
      if (token) {
        if (config.headers) {
          if (config.headers instanceof AxiosHeaders) {
            config.headers.set('Authorization', `Bearer ${token}`);
          } else {
            (config.headers as RawAxiosRequestHeaders)['Authorization'] = `Bearer ${token}`;
          }
        } else {
          config.headers = { Authorization: `Bearer ${token}` } as AxiosRequestHeaders;
        }
      }
      return config;
    });

    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.code === 'ECONNABORTED') {
          throw new ApiError(ErrorCode.Timeout, '请求超时', undefined, error);
        }
        if (!error.response) {
          throw new ApiError(ErrorCode.Network, '网络异常', undefined, error);
        }

        const { status, data } = error.response as { status: number; data?: unknown };
        let code = ErrorCode.Unknown;
        if (status === 400) code = ErrorCode.BadRequest;
        else if (status === 401) code = ErrorCode.Unauthorized;
        else if (status === 403) code = ErrorCode.Forbidden;
        else if (status === 404) code = ErrorCode.NotFound;
        else if (status >= 500) code = ErrorCode.Server;

        throw new ApiError(code, '请求失败', status, data);
      }
    );
  }

  async request<TData, TQuery = unknown, TBody = unknown>(
    config: RequestConfig<TQuery, TBody>
  ): Promise<HttpResponse<TData>> {
    const { url, method = HttpMethod.GET, query, body, headers, timeoutMs } = config;
    const res = await this.instance.request<ApiEnvelope<TData>>({
      url,
      method,
      params: query,
      data: body,
      headers,
      timeout: timeoutMs,
    });

    const envelope = res.data;
    if (typeof envelope === 'object' && envelope && 'code' in envelope) {
      const cast = envelope as ApiEnvelope<TData>;
      if (cast.code !== 0) {
        throw new ApiError(ErrorCode.Unknown, cast.message ?? '业务异常', res.status, envelope);
      }
      return {
        status: res.status,
        data: cast.data,
        headers: res.headers as Record<string, string>,
      };
    }

    // 非标准包裹结构时，直接返回
    return {
      status: res.status,
      data: envelope as unknown as TData,
      headers: res.headers as Record<string, string>,
    };
  }

  get<TData, TQuery = unknown>(url: string, query?: TQuery, headers?: Record<string, string>) {
    return this.request<TData, TQuery>({ url, method: HttpMethod.GET, query, headers });
  }

  post<TData, TBody = unknown>(url: string, body?: TBody, headers?: Record<string, string>) {
    return this.request<TData, unknown, TBody>({ url, method: HttpMethod.POST, body, headers });
  }
}

export function createHttpClient(options: CreateHttpClientOptions = {}) {
  return new HttpClient(options);
}
