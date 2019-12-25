import { remote } from 'electron';
import axiosXhr, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from 'axios';

const axiosHttp = remote.require('axios');

type Request = <T = any>(
  method: Method,
  url: string,
  data?: any,
  config?: AxiosRequestConfig
) => Promise<Response<T>>;

type RequestFunc =<T>(axios: AxiosInstance, ...args: Parameters<Request>) => Promise<Response<T>>;

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
  } catch (error) {
    return {
      data: error.response?.data,
      error,
      status: error.status,
      success: false
    };
  }
};

export const requestServer: Request = (...args) => request(axiosHttp, ...args);
export const requestClient: Request = (...args) => request(axiosXhr, ...args);