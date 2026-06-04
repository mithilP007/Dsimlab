import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User, UserRole } from "@/types"

interface AuthState {
  user: User | null
  role: UserRole | null
  isAuthenticated: boolean
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      token: null,
      login: (user, token) =>
        set({ user, role: user.role, isAuthenticated: true, token }),
      logout: () => set({ user: null, role: null, isAuthenticated: false, token: null }),
      setUser: (user) => set({ user, role: user ? user.role : null }),
    }),
    {
      name: "simplab-auth-storage",
    }
  )
)
