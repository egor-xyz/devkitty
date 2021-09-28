import { ipcRenderer } from 'electron';
import axiosXhr, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from 'axios';

type Request = <T = any>(
  method: Method,
  url: string,
  data?: any,
  config?: AxiosRequestConfig
) => Promise<Response<T>>;

type RequestFunc = <T>(axios: AxiosInstance, ...args: Parameters<Request>) => Promise<Response<T>>;

type Response<T = any> = {
  _origin?: AxiosResponse<T>;
  data?: T;
  error?: AxiosError;
  status: number;
  success: boolean;
}

export const request: RequestFunc = async (axios, method, url, data = null, config = {}) => {
  try {
    const res = await axios.request({
      ...{ data, method, url },
      ...config,
    });
    return {
      _origin: res,
      data: res.data,
      status: res.status,
      success: true,
    };
  } catch (error: any) {
    return {
      data: error.response?.data,
      error,
      status: error.status,
      success: false
    };
  }
};

export const requestClient: Request = (...args) => request(axiosXhr, ...args);

export const requestServer: Request = (...args) => new Promise<any>((resolve) => {
  ipcRenderer.invoke('requestServer', {
    config: args[3] ?? {},
    data: args[2] ?? null,
    method: args[0],
    url: args[1]
  }).then(res => resolve(res));
});
