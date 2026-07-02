export function getSafeDashboardRoute(role?: string | null): string {
  if (!role) return "/"
  const r = role.toLowerCase().replace('_', '-')
  if (r === "admin" || r === "super-admin") {
    return "/admin"
  }
  if (r === "instructor") {
    return "/instructor"
  }
  if (r === "individual" || r === "student-college" || r === "student") {
    return "/dashboard"
  }
  return "/"
}

export function exitSandboxWorkspace(navigate: any, role?: string | null) {
  const r = role ? role.toLowerCase().replace('_', '-') : null
  if (r === "admin" || r === "individual") {
    navigate("/simulation", { replace: true })
  } else {
    navigate(getSafeDashboardRoute(role), { replace: true })
  }
}
