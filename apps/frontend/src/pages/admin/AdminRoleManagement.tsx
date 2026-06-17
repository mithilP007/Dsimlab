import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X, Shield, ArrowLeft, Users, FileText, Settings, Key } from "lucide-react"
import { Link } from "react-router"

interface PermissionRow {
  resource: string
  description: string
  admin: boolean
  instructor: boolean
  student: boolean
  individual: boolean
}

export function AdminRoleManagement() {
  const [selectedRole, setSelectedRole] = useState<"admin" | "instructor" | "student" | "individual">("admin")

  const permissions: PermissionRow[] = [
    { resource: "User Registry Directory", description: "View list of users, search, filter profiles", admin: true, instructor: true, student: false, individual: false },
    { resource: "Account Provisioning", description: "Manually provision accounts, assign roles", admin: true, instructor: false, student: false, individual: false },
    { resource: "Account Controls", description: "Suspend, reactivate, or delete user records", admin: true, instructor: false, student: false, individual: false },
    { resource: "Credential Override", description: "Administrative password resets", admin: true, instructor: false, student: false, individual: false },
    { resource: "Institution Analytics", description: "Track student and completion rates per college", admin: true, instructor: true, student: false, individual: false },
    { resource: "Institution Configuration", description: "Deactivate institution cohort, rename profile", admin: true, instructor: false, student: false, individual: false },
    { resource: "System Health Telemetry", description: "Review database latency, process memory, storage", admin: true, instructor: false, student: false, individual: false },
    { resource: "Security Audit Logs", description: "View immutable actor event trails", admin: true, instructor: false, student: false, individual: false },
    { resource: "Global Announcement Broadcaster", description: "Send platform notifications and emergency banners", admin: true, instructor: false, student: false, individual: false },
    { resource: "Class Management", description: "Create classes, edit student rosters, archive course", admin: true, instructor: true, student: false, individual: false },
    { resource: "Simulation Execution", description: "Play through SEO, Google, or Meta Ads scenarios", admin: true, instructor: true, student: true, individual: true },
    { resource: "Accredited NBA/OBE Reporting", description: "View and export accreditation metrics", admin: true, instructor: true, student: false, individual: false }
  ]

  const roleDetails = {
    admin: {
      title: "Platform Administrator (Super Admin)",
      description: "Full read and write capabilities across user directories, database telemetry, audits, and configurations.",
      badge: "Full Control",
      icon: Shield
    },
    instructor: {
      title: "Faculty Instructor",
      description: "Manage classes, customize scenarios, review student assignments, and pull NBA/OBE accreditation outputs.",
      badge: "Roster Manager",
      icon: Users
    },
    student: {
      title: "Institution Student",
      description: "Access briefings, execute simulation round decisions, view leaderboard standing, and claim certificates.",
      badge: "Simulation Operator",
      icon: FileText
    },
    individual: {
      title: "Individual Self-Paced User",
      description: "Independent sandbox runner without college/class scoping. Run campaigns and acquire certificates.",
      badge: "Sandbox Operator",
      icon: Key
    }
  }

  const ActiveIcon = roleDetails[selectedRole].icon

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-5">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 hover:bg-neutral-50 rounded-lg border border-neutral-200 transition-colors">
            <ArrowLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Role-Based Access Control (RBAC) Console
            </h1>
            <p className="text-sm text-neutral-500 font-semibold">
              Verify resource permission mappings, audit access control limits, and review roles.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Role details and selectors */}
        <div className="space-y-6">
          <Card className="border-neutral-200/60 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-bold text-neutral-900">System Role Directory</CardTitle>
              <CardDescription>Select a system role to inspect its privileges and descriptions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {(Object.keys(roleDetails) as Array<keyof typeof roleDetails>).map((roleKey) => {
                const isActive = selectedRole === roleKey
                return (
                  <button
                    key={roleKey}
                    onClick={() => setSelectedRole(roleKey)}
                    className={`w-full text-left p-3 rounded-lg border font-bold text-xs transition-all flex items-center justify-between ${
                      isActive
                        ? "bg-neutral-900 text-white border-neutral-900 shadow-md"
                        : "bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <span className="capitalize">{roleKey.replace("-", " ")}</span>
                    <Badge className={`border-none text-[9px] font-bold uppercase tracking-wider ${
                      isActive ? "bg-white/10 text-white" : "bg-neutral-100 text-neutral-700"
                    }`}>
                      {roleDetails[roleKey].badge}
                    </Badge>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Detailed inspect card */}
          <Card className="border-neutral-200/60 shadow-sm bg-neutral-900 text-white relative overflow-hidden">
            <div className="absolute right-[-20px] bottom-[-20px] text-white/5 pointer-events-none">
              <ActiveIcon className="h-32 w-32" />
            </div>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <ActiveIcon className="h-5 w-5 text-neutral-300" />
                <h4 className="text-sm font-bold tracking-tight">{roleDetails[selectedRole].title}</h4>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
                {roleDetails[selectedRole].description}
              </p>
              <div className="flex items-center gap-1.5 pt-2">
                <Settings className="h-3.5 w-3.5 text-neutral-400" />
                <span className="text-[10px] text-neutral-450 uppercase tracking-widest font-black">Scoping Level</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Matrix list */}
        <div className="lg:col-span-2">
          <Card className="border-neutral-200/60 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-bold text-neutral-900">RBAC Permission Matrix</CardTitle>
              <CardDescription>Visual matrix displaying permission gates per user group.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-semibold text-neutral-700">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/50">
                    <th className="py-3 px-4 text-neutral-500 font-bold">Scope / Resource</th>
                    <th className="py-3 px-2 text-center text-neutral-500 font-bold">Admin</th>
                    <th className="py-3 px-2 text-center text-neutral-500 font-bold">Instructor</th>
                    <th className="py-3 px-2 text-center text-neutral-500 font-bold">Student</th>
                    <th className="py-3 px-2 text-center text-neutral-500 font-bold">Individual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {permissions.map((p) => (
                    <tr key={p.resource} className="hover:bg-neutral-50/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-neutral-850">{p.resource}</p>
                        <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">{p.description}</p>
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        {p.admin ? (
                          <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-rose-500 mx-auto" />
                        )}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        {p.instructor ? (
                          <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-rose-500 mx-auto" />
                        )}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        {p.student ? (
                          <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-rose-500 mx-auto" />
                        )}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        {p.individual ? (
                          <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-rose-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
export default AdminRoleManagement
