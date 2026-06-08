import { Outlet } from "react-router"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { MobileNav } from "./MobileNav"
import { Breadcrumb } from "./Breadcrumb"
import { ErrorBoundary } from "../ErrorBoundary"
import { Footer } from "../Footer"

import { useUiStore } from "@/stores/uiStore"
import { useSocket } from "@/hooks/useSocket"

interface AppShellProps {
  children?: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const connectionError = useUiStore((state) => state.connectionError)
  useSocket() // Initialize the WebSocket connection on dashboard shell mount

  return (
    <div className="flex min-h-screen w-screen bg-gray-50 font-sans antialiased text-neutral-900 overflow-hidden">
      {/* Fixed Desktop Sidebar (Hidden on mobile) */}
      <Sidebar className="hidden lg:flex" />

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {connectionError && (
          <div className="w-full bg-red-600 text-white text-center py-2 px-4 text-sm font-semibold shrink-0 z-50">
            {connectionError}
          </div>
        )}
        {/* Fixed Header TopBar */}
        <TopBar />

        {/* Dynamic Scrollable Main Content Viewport */}
        <main className="flex-1 overflow-y-auto focus:outline-none flex flex-col justify-between">
          <div className="p-6 pb-24 lg:pb-6 space-y-6 flex-1">
            {/* Breadcrumb section */}
            <div className="flex items-center">
              <Breadcrumb />
            </div>

            {/* Render target content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <ErrorBoundary>
                {children || <Outlet />}
              </ErrorBoundary>
            </div>
          </div>

          {/* Footer at bottom of scroll container */}
          <Footer />
        </main>

        {/* Bottom Mobile Tab Bar (Hidden on desktop) */}
        <MobileNav />
      </div>
    </div>
  )
}
export default AppShell
