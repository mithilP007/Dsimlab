import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User, UserRole } from "@/types"
import apiClient from "@/lib/api"

interface AuthState {
  user: User | null
  role: UserRole | null
  isAuthenticated: boolean
  isLoadingSession: boolean

  // Actions
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterPayload) => Promise<void>
  refreshSession: () => Promise<void>
  setUser: (user: User | null) => void
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  role: "individual" | "student-college"
  institution?: string
  classId?: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      isLoadingSession: false,

      /**
       * Sign in via Better-Auth /api/auth/sign-in/email.
       * The server sets an HTTP-only session cookie upon success.
       */
      login: async ({ email, password }) => {
        set({ isLoadingSession: true })
        try {
          await apiClient.post("/auth/sign-in/email", { email, password })
          // Fetch the profile after sign-in to populate the store
          await get().refreshSession()
        } finally {
          set({ isLoadingSession: false })
        }
      },

      /**
       * Sign out via Better-Auth /api/auth/sign-out.
       */
      logout: async () => {
        try {
          await apiClient.post("/auth/sign-out")
        } catch {
          // Ignore errors – always clear local state
        } finally {
          set({ user: null, role: null, isAuthenticated: false })
        }
      },

      /**
       * Register a new user via our custom bridge endpoints.
       * Role decides which custom registration endpoint is called.
       */
      register: async (data) => {
        set({ isLoadingSession: true })
        try {
          const endpoint =
            data.role === "student-college"
              ? "/auth/register/student"
              : "/auth/register/individual"

          await apiClient.post(endpoint, {
            name: data.name,
            email: data.email,
            password: data.password,
            institution: data.institution,
            classId: data.classId,
          })
          // Fetch session to populate store after registration
          await get().refreshSession()
        } finally {
          set({ isLoadingSession: false })
        }
      },

      /**
       * Fetches the current session profile from GET /api/v1/auth/me.
       * Called on app boot and after any auth action.
       */
      refreshSession: async () => {
        set({ isLoadingSession: true })
        try {
          const { data } = await apiClient.get("/v1/auth/me")
          set({
            user: data as User,
            role: data.role as UserRole,
            isAuthenticated: true,
          })
        } catch {
          // 401 clears state via the API interceptor redirect; just clear locally too
          set({ user: null, role: null, isAuthenticated: false })
        } finally {
          set({ isLoadingSession: false })
        }
      },

      setUser: (user) => set({ user, role: user ? user.role : null }),
    }),
    {
      name: "simplab-auth-storage",
      // Only persist derived values – not the loading flag
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
