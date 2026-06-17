import { useState, useEffect } from "react"
import { useNavigate } from "react-router"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/stores/authStore"
import { ChevronDown, School } from "lucide-react"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import api from "@/lib/api"

export function TopBar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [classroomName, setClassroomName] = useState<string | null>(null)
  const [instructorName, setInstructorName] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (user?.classId) {
      api.get("/api/classes")
        .then((res) => {
          if (active && res.data?.success && res.data.classes?.length > 0) {
            const cls = res.data.classes[0]
            setClassroomName(cls.name)
            if (cls.instructor?.name) {
              setInstructorName(cls.instructor.name)
            }
          }
        })
        .catch((err) => {
          console.error("Failed to fetch classroom info", err)
        })
    } else {
      setClassroomName(null)
      setInstructorName(null)
    }
    return () => {
      active = false
    }
  }, [user])

  return (
    <header className="h-16 border-b border-neutral-200 bg-white px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
      {user?.classId && classroomName ? (
        <div className="flex items-center gap-2.5 animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
            <School className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-neutral-800 leading-none">
              {classroomName}
            </span>
            {instructorName && (
              <span className="text-[10px] font-semibold text-neutral-400 mt-1">
                Instructor: {instructorName}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div />
      )}

      {/* Global Configuration Controls */}
      <div className="flex items-center gap-4 sm:gap-6">


        <NotificationBell />

        {/* User Account Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-neutral-50 p-1.5 rounded-full transition-colors focus:outline-none shrink-0 border border-neutral-100">
              <div className="h-8 w-8 rounded-full bg-neutral-950 flex items-center justify-center text-white text-xs font-bold font-sans">
                {user?.name.substring(0, 2).toUpperCase() || "JD"}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-neutral-800 leading-none">
                  {user?.name || "User"}
                </span>
                <span className="text-[10px] font-semibold text-neutral-400 capitalize">
                  {user?.role || "student"}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-neutral-400 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel
              className="font-normal cursor-pointer hover:bg-neutral-50 p-2 rounded-lg transition-colors text-left"
              onClick={() => navigate("/profile")}
              title="Click to edit profile"
            >
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-neutral-900">{user?.name}</p>
                <p className="text-xs text-neutral-500">{user?.email}</p>
                <span className="text-[9px] text-indigo-600 font-bold mt-1">Click to edit details</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-700 cursor-pointer text-xs"
              onClick={logout}
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
export default TopBar
