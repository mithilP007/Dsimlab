import { useState } from "react"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { RefreshCw, LogOut, Clock } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"

export function PendingApprovalScreen() {
  const { user, fetchMe, logout } = useAuthStore()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const updatedUser = await fetchMe()
      if (updatedUser?.status === "active") {
        toast.success("Congratulations! Your instructor has approved your account.")
        // Reloading window to apply route changes automatically
        window.location.reload()
      } else {
        toast.info("Your status is still pending approval. Please wait for your instructor.")
      }
    } catch (err) {
      toast.error("Failed to check status. Try again later.")
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50/50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="border-neutral-200/80 shadow-lg text-center overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
          <CardHeader className="pt-8 pb-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner mb-4">
              <Clock className="h-7 w-7 animate-pulse" />
            </div>
            <CardTitle className="text-xl font-black text-neutral-900 tracking-tight">
              Awaiting Classroom Approval
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-neutral-500 max-w-xs mx-auto mt-1 leading-normal">
              Your student account has been successfully created, but you need permission from your instructor to enter the course session.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-6 pb-6 pt-2">
            <div className="p-4 rounded-xl border border-neutral-150 bg-neutral-50 text-left space-y-2.5">
              <div>
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block">Student Name</span>
                <span className="text-sm font-bold text-neutral-850 block">{user?.name}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block">Email Address</span>
                <span className="text-xs font-medium text-neutral-600 block">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-neutral-200/50">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[10px] font-bold text-amber-700 uppercase">Status: Pending Verification</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-450 font-medium leading-relaxed">
              Once Dr. Instructor approves your registration on their control console, you will be permanently forwarded to the campaign dashboard.
            </p>
          </CardContent>

          <CardFooter className="bg-neutral-50/50 border-t border-neutral-100 p-6 flex gap-3">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1 h-10 font-bold bg-slate-900 text-white hover:bg-slate-950 shadow-xs flex items-center justify-center gap-1.5 rounded-xl text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing && "animate-spin"}`} />
              {isRefreshing ? "Checking..." : "Refresh Status"}
            </Button>
            <Button
              onClick={logout}
              variant="outline"
              className="h-10 font-bold border-neutral-250 bg-white text-xs px-4 rounded-xl hover:bg-neutral-50 text-neutral-750 flex items-center justify-center gap-1.5 shadow-3xs"
            >
              <LogOut className="h-3.5 w-3.5 text-neutral-450" />
              Sign Out
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

export default PendingApprovalScreen
