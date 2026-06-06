import axios from "axios"
import { config } from "./config"
import { useUiStore } from "@/stores/uiStore"
import { toast } from "sonner"

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.requestTimeout,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request Interceptor
apiClient.interceptors.request.use(
  (reqConfig) => {
    // Better-Auth uses HTTP-only cookies, which are attached automatically by the browser when withCredentials is true.
    return reqConfig
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Clear connection error on successful request
    useUiStore.getState().setConnectionError(null)
    return response
  },
  (error) => {
    const { response, code } = error

    if (!response || code === "ERR_NETWORK" || error.message === "Network Error") {
      const errMsg = "Cannot connect to DM SimLab servers. Please check your connection."
      useUiStore.getState().setConnectionError(errMsg)
      toast.error(errMsg, { id: "connection-error" })
    } else {
      // Clear error if we got a response from the server
      useUiStore.getState().setConnectionError(null)

      if (response.status === 401) {
        const currentPath = window.location.pathname
        if (!currentPath.startsWith("/login") && !currentPath.startsWith("/landing") && currentPath !== "/") {
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath + window.location.search)}`
        }
      } else if (response.status === 403) {
        toast.error("Access denied.", { id: "access-denied" })
      } else if (response.status === 500) {
        toast.error("Server error. Please try again.", { id: "server-error" })
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
