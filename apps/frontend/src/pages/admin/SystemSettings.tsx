import { useState } from "react"
import { useAdminStore } from "@/stores/adminStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Settings,
  ShieldAlert,
  Save,
  RotateCcw,
  Sliders,
  Users,
  Award,
  Bell,
} from "lucide-react"
import { toast } from "sonner"

export function SystemSettings() {
  const { settings, updateSettings } = useAdminStore()

  // Form States (local to component until saved)
  const [registrationOpen, setRegistrationOpen] = useState(settings.registrationOpen)
  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode)
  const [maxStudentsPerClass, setMaxStudentsPerClass] = useState(settings.maxStudentsPerClass)
  const [defaultRounds, setDefaultRounds] = useState(settings.defaultRounds)
  const [minScoreGold, setMinScoreGold] = useState(settings.minScoreGold)
  const [minScoreSilver, setMinScoreSilver] = useState(settings.minScoreSilver)
  const [minScoreBronze, setMinScoreBronze] = useState(settings.minScoreBronze)
  const [defaultBudget, setDefaultBudget] = useState(settings.defaultBudget)
  const [autoEmailToggle, setAutoEmailToggle] = useState(settings.autoEmailToggle)
  const [digestFrequency, setDigestFrequency] = useState(settings.digestFrequency)

  // Actions
  const handleSave = () => {
    // Basic validation
    if (defaultRounds < 5 || defaultRounds > 30) {
      toast.error("Default simulation rounds must be between 5 and 30")
      return
    }
    if (maxStudentsPerClass <= 0) {
      toast.error("Max students per class must be greater than 0")
      return
    }
    if (defaultBudget <= 0) {
      toast.error("Default ad budget limit must be greater than 0")
      return
    }
    if (minScoreBronze >= minScoreSilver) {
      toast.error("Bronze score threshold must be less than Silver")
      return
    }
    if (minScoreSilver >= minScoreGold) {
      toast.error("Silver score threshold must be less than Gold")
      return
    }

    updateSettings({
      registrationOpen,
      maintenanceMode,
      maxStudentsPerClass,
      defaultRounds,
      minScoreGold,
      minScoreSilver,
      minScoreBronze,
      defaultBudget,
      autoEmailToggle,
      digestFrequency,
    })

    toast.success("System configurations successfully saved")
  }

  const handleResetToDefaults = () => {
    // Reset local states to default values
    setRegistrationOpen(true)
    setMaintenanceMode(false)
    setMaxStudentsPerClass(30)
    setDefaultRounds(10)
    setMinScoreGold(90)
    setMinScoreSilver(80)
    setMinScoreBronze(70)
    setDefaultBudget(5000)
    setAutoEmailToggle(true)
    setDigestFrequency("weekly")

    // Update store settings back to default values
    updateSettings({
      registrationOpen: true,
      maintenanceMode: false,
      maxStudentsPerClass: 30,
      defaultRounds: 10,
      minScoreGold: 90,
      minScoreSilver: 80,
      minScoreBronze: 70,
      defaultBudget: 5000,
      autoEmailToggle: true,
      digestFrequency: "weekly",
    })

    toast.info("System settings reset to default parameters")
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Global Platform Configuration
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure registration locks, simulator limits, and credential score benchmarks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefaults}
            className="h-9 text-xs border-neutral-250 font-bold bg-white text-neutral-700 rounded-xl"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset to Defaults
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="h-9 text-xs bg-slate-900 text-white hover:bg-slate-950 font-black px-4 rounded-xl shadow-xs"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category 1: Platform Security */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-neutral-100 bg-neutral-50/20">
            <CardTitle className="text-xs font-black text-neutral-900 uppercase tracking-widest flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5 text-neutral-700" />
              Platform Access Controls
            </CardTitle>
            <CardDescription className="text-[11px] text-neutral-500 font-semibold">
              Manage system access and registration availability flags.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            {/* Registration Open Switch */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-[80%]">
                <span className="text-xs font-bold text-neutral-900 block">Open Registrations</span>
                <span className="text-[10px] text-neutral-400 font-bold block leading-relaxed">
                  Controls whether students and class cohorts can create new sandbox profiles.
                </span>
              </div>
              <Switch
                checked={registrationOpen}
                onCheckedChange={setRegistrationOpen}
              />
            </div>

            {/* Maintenance Mode Switch */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-amber-100 bg-amber-50/20">
              <div className="space-y-0.5 max-w-[80%]">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  Maintenance Mode Block
                </span>
                <span className="text-[10px] text-amber-700/80 font-bold block leading-relaxed">
                  Puts the portal offline and displays a lock splash screen to active learners.
                </span>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={setMaintenanceMode}
              />
            </div>
          </CardContent>
        </Card>

        {/* Category 2: Simulation Parameters */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-neutral-100 bg-neutral-50/20">
            <CardTitle className="text-xs font-black text-neutral-900 uppercase tracking-widest flex items-center gap-1.5">
              <Sliders className="h-4.5 w-4.5 text-neutral-700" />
              Simulator Constraints
            </CardTitle>
            <CardDescription className="text-[11px] text-neutral-500 font-semibold">
              Modify time steps and classroom size limitations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Default Rounds */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
                Default Simulation Rounds (5 - 30)
              </label>
              <Input
                type="number"
                min={5}
                max={30}
                value={defaultRounds}
                onChange={(e) => setDefaultRounds(parseInt(e.target.value) || 0)}
                className="h-9 text-xs border-neutral-250 bg-white font-semibold"
              />
              <span className="text-[9px] text-neutral-400 font-bold block mt-0.5">
                Defines the default duration steps for newly created classroom sandboxes.
              </span>
            </div>

            {/* Default Budget */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                Default Ad Budget ($)
              </label>
              <Input
                type="number"
                value={defaultBudget}
                onChange={(e) => setDefaultBudget(parseInt(e.target.value) || 0)}
                className="h-9 text-xs border-neutral-250 bg-white font-semibold"
              />
              <span className="text-[9px] text-neutral-400 font-bold block mt-0.5">
                Initial simulator budget limit assigned to student profiles.
              </span>
            </div>

            {/* Max Students per Class */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                Max Students per Class
              </label>
              <Input
                type="number"
                value={maxStudentsPerClass}
                onChange={(e) => setMaxStudentsPerClass(parseInt(e.target.value) || 0)}
                className="h-9 text-xs border-neutral-250 bg-white font-semibold"
              />
              <span className="text-[9px] text-neutral-400 font-bold block mt-0.5">
                Sets the student enrollment ceiling for course rosters.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Category 3: Certificate Score Benchmarks */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-neutral-100 bg-neutral-50/20">
            <CardTitle className="text-xs font-black text-neutral-900 uppercase tracking-widest flex items-center gap-1.5">
              <Award className="h-4.5 w-4.5 text-neutral-700" />
              Certificate score benchmarks
            </CardTitle>
            <CardDescription className="text-[11px] text-neutral-500 font-semibold">
              Adjust minimum average scores required for certification achievements.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {/* Bronze */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase block">
                  Bronze Limit (%)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={minScoreBronze}
                  onChange={(e) => setMinScoreBronze(parseInt(e.target.value) || 0)}
                  className="h-9 text-xs border-neutral-250 bg-white font-semibold"
                />
              </div>

              {/* Silver */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase block">
                  Silver Limit (%)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={minScoreSilver}
                  onChange={(e) => setMinScoreSilver(parseInt(e.target.value) || 0)}
                  className="h-9 text-xs border-neutral-250 bg-white font-semibold"
                />
              </div>

              {/* Gold */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase block">
                  Gold Limit (%)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={minScoreGold}
                  onChange={(e) => setMinScoreGold(parseInt(e.target.value) || 0)}
                  className="h-9 text-xs border-neutral-250 bg-white font-semibold"
                />
              </div>
            </div>
            <span className="text-[9px] text-neutral-400 font-bold block leading-relaxed mt-1">
              Minimum overall simulator score required to generate Bronze, Silver, and Gold digital course achievements.
            </span>
          </CardContent>
        </Card>

        {/* Category 4: Alerts & Notifications */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-neutral-100 bg-neutral-50/20">
            <CardTitle className="text-xs font-black text-neutral-900 uppercase tracking-widest flex items-center gap-1.5">
              <Bell className="h-4.5 w-4.5 text-neutral-700" />
              Notifications & Email Digests
            </CardTitle>
            <CardDescription className="text-[11px] text-neutral-500 font-semibold">
              Manage automatic student invitations and system report timelines.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Auto Email Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-[80%]">
                <span className="text-xs font-bold text-neutral-900 block">Auto-Email Invitations</span>
                <span className="text-[10px] text-neutral-400 font-bold block leading-relaxed">
                  Sends email notifications automatically when instructors invite students to classes.
                </span>
              </div>
              <Switch
                checked={autoEmailToggle}
                onCheckedChange={setAutoEmailToggle}
              />
            </div>

            {/* Digest Frequency */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                Digest Frequency
              </label>
              <Select
                value={digestFrequency}
                onValueChange={(val) => setDigestFrequency(val as "daily" | "weekly" | "monthly")}
              >
                <SelectTrigger className="w-full h-9 text-xs border-neutral-250 bg-white font-bold text-neutral-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-neutral-200 text-neutral-800">
                  <SelectItem value="daily" className="text-xs font-semibold">Daily Report Summary</SelectItem>
                  <SelectItem value="weekly" className="text-xs font-semibold">Weekly Consolidated Digest</SelectItem>
                  <SelectItem value="monthly" className="text-xs font-semibold">Monthly Platform Snapshot</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[9px] text-neutral-400 font-bold block mt-0.5">
                Defines the frequency of system statistics digests dispatched to administrators.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SystemSettings
