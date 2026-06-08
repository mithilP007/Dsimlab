import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User, UserRole } from "@/types"
import api from "@/lib/api"

interface AuthState {
  user: User | null
  role: UserRole | null
  isAuthenticated: boolean
  fetchMe: () => Promise<User | null>
  login: (email: string, password?: string) => Promise<User>
  registerIndividual: (data: any) => Promise<User>
  registerStudent: (data: any) => Promise<User>
  registerInstructor: (data: any) => Promise<User>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      role: null,
      isAuthenticated: false,

      fetchMe: async () => {
        try {
          const res = await api.get<any>('/api/auth/me');
          const data = res.data;
          if (data && data.role) {
            data.role = data.role.toLowerCase().replace('_', '-') as UserRole;
          }
          const user = data as User;
          set({ user, role: user.role, isAuthenticated: true });
          return user;
        } catch (error) {
          set({ user: null, role: null, isAuthenticated: false });
          return null;
        }
      },

      login: async (email, password = 'user_password_string') => {
        await api.post('/api/auth/sign-in/email', { email, password });
        const user = await get().fetchMe();
        if (!user) throw new Error("Failed to retrieve user profile after authentication");
        return user;
      },

      registerIndividual: async (data) => {
        await api.post('/api/auth/register/individual', {
          email: data.email,
          password: data.password || 'user_password_string',
          name: data.name,
          institution: data.institution,
          planType: data.planType,
        });
        const user = await get().fetchMe();
        if (!user) throw new Error("Failed to retrieve user profile after registration");
        return user;
      },

      registerStudent: async (data) => {
        await api.post('/api/auth/register/student', {
          email: data.email,
          password: data.password || 'user_password_string',
          name: data.name,
          classJoinCode: data.classJoinCode,
        });
        const user = await get().fetchMe();
        if (!user) throw new Error("Failed to retrieve user profile after class registration");
        return user;
      },

      registerInstructor: async (data) => {
        await api.post('/api/auth/sign-up/email', {
          email: data.email,
          password: data.password || 'user_password_string',
          name: data.name,
          role: 'INSTRUCTOR',
          institution: data.institution,
        });
        const user = await get().fetchMe();
        if (!user) throw new Error("Failed to retrieve user profile after instructor registration");
        return user;
      },

      logout: async () => {
        try {
          await api.post('/api/auth/sign-out');
        } catch (err) {
          console.error("Sign out request failed", err);
        }
        set({ user: null, role: null, isAuthenticated: false });
        window.location.href = '/';
      },

      setUser: (user) => set({ user, role: user ? user.role : null, isAuthenticated: !!user }),
    }),
    {
      name: "simplab-auth-storage",
    }
  )
)
export default useAuthStore;
