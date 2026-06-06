import { BrowserRouter, Routes, Route, Navigate } from "react-router"
import { AppShell } from "@/components/layout/AppShell"
import { IndividualDashboard } from "@/pages/dashboard/IndividualDashboard"
import { CollegeStudentDashboard } from "@/pages/dashboard/CollegeStudentDashboard"
import { InstructorPortal } from "@/pages/instructor/InstructorPortal"
import { SimulationShell } from "@/pages/simulation/SimulationShell"
import { SeoControlPanel } from "@/pages/simulation/seo/SeoControlPanel"
import { GoogleAdsControlPanel } from "@/pages/simulation/google-ads/GoogleAdsControlPanel"
import { MetaAdsControlPanel } from "@/pages/simulation/meta-ads/MetaAdsControlPanel"
import { ResultsDashboard } from "@/pages/simulation/results/ResultsDashboard"
import { LeaderboardPage } from "@/pages/leaderboard/LeaderboardPage"
import { DashboardPage } from "@/pages/Dashboard"
import { CertificationCenter } from "@/pages/certification/CertificationCenter"
import { LoginScreen } from "@/pages/auth/LoginScreen"
import { SignupIndividual } from "@/pages/auth/SignupIndividual"
import { JoinClassScreen } from "@/pages/auth/JoinClassScreen"
import { InstructorLogin } from "@/pages/auth/InstructorLogin"
import { LandingPage } from "@/pages/landing/LandingPage"
import { ReportsDashboard } from "@/pages/reports/ReportsDashboard"
import { NotFound } from "@/pages/NotFound"
import { useAuthStore } from "@/stores/authStore"
import { AdminDashboard } from "@/pages/admin/AdminDashboard"
import { UserManager } from "@/pages/admin/UserManager"
import { ClassOverview } from "@/pages/admin/ClassOverview"
import { SystemSettings } from "@/pages/admin/SystemSettings"
import { AdminGuard } from "@/hooks/useRoleGuard"

import { NotificationPanel } from "@/components/notifications/NotificationPanel"
import { ActivityFeed } from "@/components/notifications/ActivityFeed"

function ProtectedLayout() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />
  }

  return <AppShell />
}

function DashboardRoot() {
  const { user } = useAuthStore()
  if (user?.role === "admin") {
    return <AdminDashboard />
  }
  if (user?.role === "student-college") {
    return <CollegeStudentDashboard />
  }
  return <IndividualDashboard />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing and auth views */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupIndividual />} />
        <Route path="/join" element={<JoinClassScreen />} />
        <Route path="/instructor-login" element={<InstructorLogin />} />

        {/* Protected workspace console views */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardRoot />} />
          <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="/admin/users" element={<AdminGuard><UserManager /></AdminGuard>} />
          <Route path="/admin/classes" element={<AdminGuard><ClassOverview /></AdminGuard>} />
          <Route path="/admin/settings" element={<AdminGuard><SystemSettings /></AdminGuard>} />
          
          {/* Nested Simulation Campaigns */}
          <Route path="/simulation" element={<SimulationShell />}>
            <Route index element={<Navigate to="/simulation/seo" replace />} />
            <Route path="seo" element={<SeoControlPanel />} />
            <Route path="google-ads" element={<GoogleAdsControlPanel />} />
            <Route path="meta-ads" element={<MetaAdsControlPanel />} />
            <Route path="results" element={<ResultsDashboard />} />
          </Route>

          <Route path="/campaigns" element={<DashboardPage />} />
          <Route path="/events" element={<DashboardPage />} />
          <Route path="/analytics" element={<DashboardPage />} />
          <Route path="/reports" element={<ReportsDashboard />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/certificates" element={<CertificationCenter />} />
          <Route path="/certification" element={<Navigate to="/certificates" replace />} />
          <Route path="/instructor" element={<InstructorPortal />} />
          <Route path="/dashboard" element={<DashboardRoot />} />
          <Route path="/notifications" element={<NotificationPanel />} />
          <Route path="/activity" element={<ActivityFeed />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
