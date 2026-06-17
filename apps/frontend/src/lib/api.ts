import axios from 'axios';
import { toast } from 'sonner';
import { config } from './config';
import { useUiStore } from '../stores/uiStore';

export const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.requestTimeout,
  withCredentials: true, // Ensures session cookies are sent automatically
});

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Request Interceptor
api.interceptors.request.use(
  (reqConfig) => {
    if (!reqConfig.headers['x-correlation-id']) {
      reqConfig.headers['x-correlation-id'] = generateUUID();
    }

    if (['post', 'put', 'patch', 'delete'].includes(reqConfig.method?.toLowerCase() || '')) {
      if (!reqConfig.headers['x-idempotency-key']) {
        reqConfig.headers['x-idempotency-key'] = generateUUID();
      }
    }

    return reqConfig;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    // Reset connection error since request succeeded
    useUiStore.getState().setConnectionError(null);
    return response;
  },
  (error) => {
    const uiStore = useUiStore.getState();

    // Check if network is unreachable
    if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      uiStore.setConnectionError("Cannot connect to DM SimLab servers. Please check your connection.");
      return Promise.reject(error);
    }

    // Connection is alive (got response), clear connection error banner
    uiStore.setConnectionError(null);

    const { status } = error.response;
    const correlationId = error.response.headers?.['x-correlation-id'] || error.response.data?.correlationId;
    const traceText = correlationId ? ` (Trace: ${correlationId})` : '';

    if (status === 401) {
      const currentPath = window.location.pathname + window.location.search;
      const isPublicPath = 
        window.location.pathname.startsWith('/login') || 
        window.location.pathname.startsWith('/landing') || 
        window.location.pathname.startsWith('/signup') || 
        window.location.pathname.startsWith('/instructor-login');

      if (!isPublicPath) {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    } else if (status === 403) {
      toast.error(`Access denied.${traceText}`);
    } else if (status === 429) {
      toast.error(error.response.data?.message || `Rate limit exceeded. Please retry later.${traceText}`);
    } else if (status === 500) {
      toast.error(`Internal server error. Our engineering team has been notified.${traceText}`);
    }

    return Promise.reject(error);
  }
);

export default api;
