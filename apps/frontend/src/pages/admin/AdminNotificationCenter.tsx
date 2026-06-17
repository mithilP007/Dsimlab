import { useState, useEffect } from "react"
import { useAdminStore } from "@/stores/adminStore"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Megaphone, Users, Landmark, AlertTriangle, ArrowLeft } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

export function AdminNotificationCenter() {
  const { institutions, fetchInstitutions, broadcastNotification, isLoading } = useAdminStore()

  // Form states
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [targetRole, setTargetRole] = useState("")
  const [targetInstitution, setTargetInstitution] = useState("")

  useEffect(() => {
    fetchInstitutions()
  }, [fetchInstitutions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !message.trim()) {
      toast.error("Announcement title and body are required")
      return
    }

    try {
      await broadcastNotification({
        title,
        message,
        targetRole: targetRole || undefined,
        targetInstitution: targetInstitution || undefined
      })
      toast.success("Platform announcement dispatched successfully")
      setTitle("")
      setMessage("")
      setTargetRole("")
      setTargetInstitution("")
    } catch {
      toast.error("Failed to broadcast announcement")
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-4xl animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-5">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 hover:bg-neutral-50 rounded-lg border border-neutral-200 transition-colors">
            <ArrowLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Global Notification Dispatcher
            </h1>
            <p className="text-sm text-neutral-500 font-semibold">
              Broadcast platform-wide notifications, maintenance schedules, or target alerts to specific institutions.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="border-neutral-200/60 shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-neutral-900" />
              <CardTitle className="text-base font-bold text-neutral-900">Draft Platform Announcement</CardTitle>
            </div>
            <CardDescription>Compose title, select filter groups, and trigger push alerts.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Alert Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Announcement Title</label>
                <Input
                  required
                  placeholder="e.g. Server Maintenance Schedule, New SEO Lab Release"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-neutral-50 text-sm border-neutral-250 focus:bg-white"
                />
              </div>

              {/* Message Details */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Announcement Body</label>
                <Textarea
                  required
                  placeholder="Write clear, concise details about the announcement..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="bg-neutral-50 text-sm border-neutral-250 focus:bg-white resize-none"
                />
              </div>

              {/* Target Filtering Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Target Role Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Target Role Filter
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg p-2.5 outline-none shadow-sm cursor-pointer focus:bg-white"
                  >
                    <option value="">All User Roles</option>
                    <option value="student">Students</option>
                    <option value="instructor">Instructors</option>
                    <option value="admin">Administrators</option>
                  </select>
                </div>

                {/* Target Institution Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider flex items-center gap-1">
                    <Landmark className="h-3.5 w-3.5" />
                    Target Institution
                  </label>
                  <select
                    value={targetInstitution}
                    onChange={(e) => setTargetInstitution(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg p-2.5 outline-none shadow-sm cursor-pointer focus:bg-white"
                  >
                    <option value="">All Institutions</option>
                    {institutions.map((inst) => (
                      <option key={inst.name} value={inst.name}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-neutral-100 pt-5">
                <div className="flex items-center gap-2 text-neutral-400">
                  <AlertTriangle className="h-4 w-4 text-neutral-450" />
                  <span className="text-[10px] font-semibold">Broadcasting will trigger notification banners instantly.</span>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-2 px-6 flex items-center gap-2"
                >
                  <Megaphone className="h-4 w-4" />
                  Broadcast Alert
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default AdminNotificationCenter
