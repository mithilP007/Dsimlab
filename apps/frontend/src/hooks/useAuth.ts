import { useEffect } from "react"
import { useNavigate } from "react-router"
import { useAuthStore } from "@/stores/authStore"
import type { UserRole } from "@/types"

/**
 * useAuth – provides the active session and role-based navigation helpers.
 *
 * Call this at the top of any page that needs the logged-in user.
 * On first mount it re-validates the session against /api/v1/auth/me so the
 * UI always reflects the live server state.
 */
export function useAuth() {
  const { user, role, isAuthenticated, isLoadingSession, refreshSession, logout } =
    useAuthStore()

  useEffect(() => {
    // Re-validate session on page load / component mount if we think we're logged in
    if (isAuthenticated) {
      refreshSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { user, role, isAuthenticated, isLoadingSession, logout, refreshSession }
}

/**
 * useRequireAuth – redirects to /login if not authenticated.
 * Optionally enforces one or more allowed roles.
 */
export function useRequireAuth(allowedRoles?: UserRole[], redirectTo: string = "/login") {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoadingSession, refreshSession } = useAuthStore()

  useEffect(() => {
    if (isLoadingSession) return // still checking, do not redirect yet

    if (!isAuthenticated || !user) {
      navigate(redirectTo, { replace: true })
      return
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      navigate("/", { replace: true })
    }
  }, [user, isAuthenticated, isLoadingSession, allowedRoles, navigate, redirectTo])

  useEffect(() => {
    refreshSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { user, isAuthenticated, isLoadingSession }
}
