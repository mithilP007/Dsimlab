import { Link } from "react-router"
import { Compass, MoveLeft, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/authStore"
import { getSafeDashboardRoute } from "@/lib/navigation"

export function NotFound() {
  const { user } = useAuthStore()
  const dashboardRoute = getSafeDashboardRoute(user?.role)

  return (
    <div className="min-h-screen w-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-10 max-w-md w-full shadow-xl space-y-6">
        
        {/* Animated Compass Icon */}
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center relative animate-pulse">
            <Compass className="h-10 w-10 animate-spin" style={{ animationDuration: '8s' }} />
            <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow">
              !
            </span>
          </div>
        </div>

        {/* Text descriptions */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-indigo-650 uppercase tracking-widest block">
            404 Error - Campaign Lost
          </span>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Off-Course Parameter
          </h1>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-[280px] mx-auto">
            The workspace router could not resolve your target path. It may have been archived or moved by the instructor.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 py-5 shadow-sm">
            <Link to={dashboardRoute}>
              <MoveLeft className="h-4 w-4" />
              <span>Return to Dashboard</span>
            </Link>
          </Button>

          <a
            href="https://simplab.io/help"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-400 hover:text-neutral-600 flex items-center justify-center gap-1.5 py-1.5 transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Contact Support Help desk</span>
          </a>
        </div>

      </div>
    </div>
  )
}

export default NotFound
