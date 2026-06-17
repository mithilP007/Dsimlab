import { useState, useEffect } from "react"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import api from "@/lib/api"
import {
  Sparkles,
  Activity,
  TrendingUp,
  Target,
  Search,
  Share2,
  Users,
  Settings,
  Shield,
  GraduationCap,
  LogOut,
  ArrowRight,
  Plus
} from "lucide-react"

import { useNavigate } from "react-router"

export function DashboardPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [simulationLoading, setSimulationLoading] = useState(false)
  const [activeSimulation, setActiveSimulation] = useState<any>(null)

  // Redirect instructor users immediately to instructor portal
  useEffect(() => {
    if (user?.role === "instructor") {
      navigate("/instructor", { replace: true })
    }
  }, [user, navigate])

  // Fetch active simulation if exists
  useEffect(() => {
    async function checkActiveSimulation() {
      try {
        const response = await api.get("/api/simulations")
        // Find if there is an initialized or in-progress simulation
        if (response.data && response.data.length > 0) {
          setActiveSimulation(response.data[0])
        }
      } catch (err) {
        // Safe to ignore on load
      }
    }
    if (user?.role === "student-college" || user?.role === "individual") {
      checkActiveSimulation()
    }
  }, [user])

  const handleStartSimulation = async () => {
    setSimulationLoading(true)
    try {
      const response = await api.post("/api/simulations")
      setActiveSimulation(response.data)
      toast.success("New digital marketing simulation session initialized!")
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to initialize simulation session.")
    } finally {
      setSimulationLoading(false)
    }
  }

  // Render Role Badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-2.5">System Admin</Badge>
      case "instructor":
        return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-2.5">Course Instructor</Badge>
      case "student-college":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1 px-2.5">Academic Student</Badge>
      default:
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-1 px-2.5">Individual Plan</Badge>
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* 1. HEADER WELCOME AREA */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-950 p-6 md:p-8 text-white shadow-lg">
        {/* Glow decoration */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -mb-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">SimpLab Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Welcome back, {user?.name || "Marketing Specialist"}!
            </h1>
            <p className="text-sm md:text-base text-neutral-300 max-w-xl font-medium leading-relaxed">
              Manage your active sessions, monitor campaign algorithms, and track your marketing conversions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {getRoleBadge(user?.role || "individual")}
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-white/10 hover:text-white font-bold h-9"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* 2. MAIN GRID METRICS & VISUALS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <Card className="border-neutral-200/80 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Account Details</span>
              <Badge variant="outline" className="text-[10px] font-bold text-neutral-500 border-neutral-200 uppercase">Profile</Badge>
            </div>
            <CardTitle className="text-xl font-extrabold text-neutral-900 mt-2">Personal Plan</CardTitle>
            <CardDescription className="text-xs font-semibold text-neutral-400 mt-1">Details of your active plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="divide-y divide-neutral-100 text-sm">
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-neutral-500 font-medium">Email Address</span>
                <span className="text-neutral-800 font-bold truncate max-w-[180px]">{user?.email}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-neutral-500 font-medium">Platform Role</span>
                <span className="text-neutral-800 font-bold capitalize">{user?.role || "Student"}</span>
              </div>
              {user?.institution && (
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-neutral-500 font-medium">Institution</span>
                  <span className="text-neutral-800 font-bold">{user.institution}</span>
                </div>
              )}
              {user?.planType && (
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-neutral-500 font-medium">Plan Type</span>
                  <span className="text-neutral-800 font-bold capitalize">{user.planType}</span>
                </div>
              )}
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-neutral-500 font-medium">Status</span>
                <span className="text-emerald-600 font-extrabold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  Active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Traffic Statistics Chart Card */}
        <Card className="border-neutral-200/80 shadow-md hover:shadow-lg transition-all duration-300 md:col-span-2 overflow-hidden flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Campaign Trends</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <TrendingUp className="h-4 w-4" />
                <span>+12.4% overall ROI</span>
              </div>
            </div>
            <CardTitle className="text-xl font-extrabold text-neutral-900 mt-2">Conversion Campaign Metrics</CardTitle>
            <CardDescription className="text-xs font-semibold text-neutral-400 mt-1">Real-time simulated campaign data overview</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col justify-end">
            {/* SVG Wave Graph */}
            <div className="h-32 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area path */}
                <path
                  d="M 0 30 L 0 22 Q 15 12 30 18 T 60 8 T 90 14 L 100 5 L 100 30 Z"
                  fill="url(#areaGrad)"
                />
                {/* Stroke path */}
                <path
                  d="M 0 22 Q 15 12 30 18 T 60 8 T 90 14 L 100 5"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                {/* Dynamic dots */}
                <circle cx="30" cy="18" r="1.5" fill="#4f46e5" className="animate-pulse" />
                <circle cx="60" cy="8" r="1.5" fill="#4f46e5" className="animate-pulse" />
                <circle cx="100" cy="5" r="1.5" fill="#10b981" />
              </svg>
            </div>
            {/* Legend */}
            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-bold border-t border-neutral-100 pt-3 mt-4">
              <span>Day 1</span>
              <span>Day 7</span>
              <span>Day 15</span>
              <span>Day 22</span>
              <span className="text-neutral-900">Today</span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 3. DYNAMIC CONTENT BY ROLE */}
      <div>
        
        {/* ADMIN DASHBOARD CONSOLE */}
        {user?.role === "admin" && (
          <div className="space-y-6">
            <h2 className="text-lg font-black uppercase tracking-wider text-neutral-500 text-left">Administrative Controls</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <Card className="border-neutral-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 text-left">
                <CardContent className="p-5 space-y-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">User Management</h3>
                    <p className="text-xs text-neutral-500 mt-1 font-semibold">Verify new student sign-ups, approve institution accounts.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-neutral-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 text-left">
                <CardContent className="p-5 space-y-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">Classroom Control</h3>
                    <p className="text-xs text-neutral-500 mt-1 font-semibold">Track class invites, inspect run times, modify active rounds.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-neutral-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 text-left">
                <CardContent className="p-5 space-y-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">System Parameters</h3>
                    <p className="text-xs text-neutral-500 mt-1 font-semibold">Manage database schemas, control system configs, API keys.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-neutral-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 text-left">
                <CardContent className="p-5 space-y-4">
                  <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">Governance & Security</h3>
                    <p className="text-xs text-neutral-500 mt-1 font-semibold">Review log audits, configure CORS policies, token security.</p>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        )}

        {/* INSTRUCTOR DASHBOARD CONSOLE */}
        {user?.role === "instructor" && (
          <div className="space-y-6">
            <h2 className="text-lg font-black uppercase tracking-wider text-neutral-500 text-left">Classroom Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Classroom Invite Details */}
              <Card className="border-neutral-200/80 shadow-md p-6 space-y-6 text-left col-span-1">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-neutral-900">Course Invite Code</h3>
                  <p className="text-xs text-neutral-500 font-semibold">Provide this code to students to let them register inside your classroom</p>
                </div>
                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between">
                  <span className="font-mono text-lg font-black tracking-wider text-neutral-900">CLASS-CODE-78X</span>
                  <Badge className="bg-neutral-900 text-white font-bold text-[10px]">Active</Badge>
                </div>
                <Button className="w-full bg-slate-900 text-white hover:bg-slate-950 font-bold h-10">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Generate New Invite Code
                </Button>
              </Card>

              {/* Classroom stats */}
              <Card className="border-neutral-200/80 shadow-md p-6 space-y-4 text-left col-span-2 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-neutral-900 mb-4">Instructor Overview</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-neutral-100 bg-white">
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Total Students</span>
                      <span className="block text-2xl font-extrabold text-neutral-900 mt-1">24</span>
                    </div>
                    <div className="p-4 rounded-xl border border-neutral-100 bg-white">
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Submissions</span>
                      <span className="block text-2xl font-extrabold text-neutral-900 mt-1">18 / 24</span>
                    </div>
                    <div className="p-4 rounded-xl border border-neutral-100 bg-white col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Active Rounds</span>
                      <span className="block text-2xl font-extrabold text-indigo-600 mt-1">Day 15</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-neutral-100">
                  <Button variant="outline" className="flex-1 border-neutral-200 font-bold text-xs h-10">
                    Review Student Logs
                  </Button>
                  <Button className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs h-10">
                    Advance Simulation Round
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </Card>

            </div>
          </div>
        )}

        {/* STUDENT & INDIVIDUAL SANDBOX CONSOLE */}
        {(user?.role === "student-college" || user?.role === "individual" || !user?.role) && (
          <div className="space-y-6">
            <h2 className="text-lg font-black uppercase tracking-wider text-neutral-500 text-left">Active Simulation Environment</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Simulation Controller Card */}
              <Card className="border-neutral-200/80 shadow-md p-6 space-y-6 text-left md:col-span-2 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Digital Simulator Console</span>
                  </div>
                  <h3 className="font-extrabold text-lg text-neutral-900">Configure & Launch Campaigns</h3>
                  <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                    Set budget allocations, coordinate SEO keywords, index structural landing page descriptions, and establish bid triggers for Google and Meta Ads. Click below to initialize or refresh your simulation session.
                  </p>
                </div>

                {activeSimulation ? (
                  <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-3 mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 font-bold">SIMULATION SESSION</span>
                      <Badge className="bg-indigo-600 text-white text-[9px] font-bold">INITIALIZED</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-1 text-center sm:text-left">
                      <div>
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Round</span>
                        <span className="text-sm font-extrabold text-neutral-900 block mt-0.5">Round {activeSimulation.currentRound || 1}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">ID</span>
                        <span className="text-xs font-mono font-bold text-neutral-700 block mt-1 truncate max-w-[80px]">{activeSimulation.id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Status</span>
                        <span className="text-xs font-bold text-emerald-600 block mt-1">Ready</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-center py-6 mt-4">
                    <p className="text-xs text-neutral-400 font-bold">No active simulation session initialized for this user account.</p>
                  </div>
                )}

                <div className="flex gap-3 pt-6 border-t border-neutral-100">
                  <Button
                    onClick={handleStartSimulation}
                    disabled={simulationLoading}
                    className="flex-1 bg-slate-900 text-white hover:bg-slate-950 font-black text-xs h-10"
                  >
                    {simulationLoading ? "Initializing..." : "Initialize Session"}
                    {!simulationLoading && <Plus className="ml-1.5 h-4 w-4" />}
                  </Button>
                </div>
              </Card>

              {/* Simulation Quick Details Card */}
              <Card className="border-neutral-200/80 shadow-md p-6 space-y-4 text-left flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-extrabold text-base text-neutral-900">Campaign Metrics</h3>
                  <p className="text-xs text-neutral-400 font-semibold leading-relaxed">
                    Overview of active simulation rules
                  </p>
                  
                  <div className="space-y-3.5 pt-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Search className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wide block leading-none">Organic SEO</span>
                        <span className="text-xs font-bold text-neutral-800 block mt-0.5">Keywords & Content Indexing</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Target className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wide block leading-none">Paid Ads</span>
                        <span className="text-xs font-bold text-neutral-800 block mt-0.5">Google Ads CPC & Budgets</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Share2 className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wide block leading-none">Social Placements</span>
                        <span className="text-xs font-bold text-neutral-800 block mt-0.5">Meta Ads Audience Demographics</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-4 text-xs font-semibold text-neutral-400 leading-relaxed">
                  Configure campaigns in your local dev server. Simulator runs on local backend engine.
                </div>
              </Card>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}
export default DashboardPage
