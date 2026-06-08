import axios from 'axios';
import { toast } from 'sonner';
import { config } from './config';
import { useUiStore } from '../stores/uiStore';

export const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.requestTimeout,
  withCredentials: true, // Ensures session cookies are sent automatically
});

// Request Interceptor
api.interceptors.request.use(
  (reqConfig) => {
    // If the browser already has the better-auth cookie, it will be sent automatically
    // due to withCredentials: true. No manual authorization header is required.
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
      toast.error("Access denied.");
    } else if (status === 500) {
      toast.error("Server error. Please try again.");
    }

    return Promise.reject(error);
  }
);

export default api;
