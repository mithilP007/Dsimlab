import { useState } from "react"
import { useInstructorPortalStore } from "@/stores/instructorPortalStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Sliders, DollarSign, BookOpen, Sparkles, Send, FileText } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function ScenarioBuilder() {
  const { scenarios, addCustomScenario, duplicateScenario } = useInstructorPortalStore()

  // Form State
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate")
  const [rounds, setRounds] = useState(10)
  const [budget, setBudget] = useState(3000)

  // Template presets
  const presets = [
    {
      name: "Startup Launch",
      description: "Build initial user adoption for a boot-strapped digital agency startup using organic channel optimization.",
      difficulty: "beginner" as const,
      rounds: 10,
      budget: 3000,
    },
    {
      name: "E-commerce Growth",
      description: "Scale conversion values and optimize PPC ROI for a high-end luxury fashion e-tailer.",
      difficulty: "intermediate" as const,
      rounds: 15,
      budget: 5000,
    },
    {
      name: "Brand Awareness",
      description: "Expand organic reach, backlinks count, and social impressions for a local organic beverage manufacturer.",
      difficulty: "beginner" as const,
      rounds: 8,
      budget: 2500,
    },
  ]

  const loadPreset = (preset: typeof presets[0]) => {
    setName(preset.name)
    setDescription(preset.description)
    setDifficulty(preset.difficulty)
    setRounds(preset.rounds)
    setBudget(preset.budget)
    toast.info(`Loaded template preset: ${preset.name}`)
  }

  const handleSaveScenario = (status: "draft" | "published") => {
    if (!name.trim()) {
      toast.error("Please enter a scenario name")
      return
    }
    if (!description.trim()) {
      toast.error("Please enter a campaign description")
      return
    }
    if (rounds < 5 || rounds > 30) {
      toast.error("Rounds must be between 5 and 30")
      return
    }
    if (budget <= 0) {
      toast.error("Budget per round must be greater than 0")
      return
    }

    addCustomScenario({
      name: name.trim(),
      description: description.trim(),
      difficulty,
      rounds,
      budget,
    })

    toast.success(`Successfully saved scenario as ${status}: ${name}`)

    // Reset Form
    setName("")
    setDescription("")
    setDifficulty("intermediate")
    setRounds(10)
    setBudget(3000)
  }

  const handleDuplicate = (id: string, scenarioName: string) => {
    duplicateScenario(id)
    toast.success(`Duplicated scenario briefing: ${scenarioName}`)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left items-start">
      {/* ─── LEFT: Form and templates selector (7 columns) ─── */}
      <div className="lg:col-span-7 space-y-6">
        {/* Template Quick Select presets */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-neutral-850" />
            <h3 className="text-xs font-black text-neutral-450 uppercase tracking-widest block">
              Pre-built Templates
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {presets.map((preset) => (
              <Card
                key={preset.name}
                onClick={() => loadPreset(preset)}
                className="border border-neutral-200 bg-white p-3 rounded-xl hover:border-slate-900 cursor-pointer shadow-3xs hover:shadow-2xs transition-all duration-200 text-left space-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <Badge variant="secondary" className="bg-neutral-100 text-neutral-700 font-extrabold text-[8px] px-1.5 py-0">
                    {preset.difficulty}
                  </Badge>
                  <span className="text-xs font-black text-neutral-900 block truncate mt-1">
                    {preset.name}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500 pt-1 border-t border-neutral-50">
                  <span>{preset.rounds} Rounds</span>
                  <span>${preset.budget.toLocaleString()}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Builder Form Card */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
              <Sliders className="h-4.5 w-4.5 text-neutral-900" />
              Scenario configuration briefing
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Compile difficulty curves and allocations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                  Scenario Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. B2B Enterprise Acquisition"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs border-neutral-250 bg-white font-medium"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                  Brief description
                </label>
                <Textarea
                  placeholder="Enter scenario campaign constraints..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="text-xs border-neutral-250 bg-white resize-none font-medium"
                />
              </div>

              {/* Grid configs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Difficulty */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                    Difficulty curve
                  </label>
                  <Select
                    value={difficulty}
                    onValueChange={(val: "beginner" | "intermediate" | "advanced") => setDifficulty(val)}
                  >
                    <SelectTrigger className="w-full h-9 text-xs border-neutral-250 bg-white font-bold text-neutral-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-neutral-200 text-neutral-800">
                      <SelectItem value="beginner" className="font-bold text-xs">Beginner</SelectItem>
                      <SelectItem value="intermediate" className="font-bold text-xs">Intermediate</SelectItem>
                      <SelectItem value="advanced" className="font-bold text-xs">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Rounds */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                    Rounds (5 - 30)
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={30}
                    value={rounds}
                    onChange={(e) => setRounds(parseInt(e.target.value) || 0)}
                    className="h-9 text-xs border-neutral-250 bg-white font-bold"
                  />
                </div>

                {/* Budget */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                    Budget per Round ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-450" />
                    <Input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(parseInt(e.target.value) || 0)}
                      className="pl-8 h-9 text-xs border-neutral-250 bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Form buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => handleSaveScenario("draft")}
                  variant="outline"
                  className="flex-1 h-9 font-bold text-xs border-neutral-250 bg-white rounded-xl flex items-center justify-center gap-1.5 shadow-3xs text-neutral-700"
                >
                  <FileText className="h-4 w-4" />
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleSaveScenario("published")}
                  className="flex-1 h-9 font-black bg-slate-900 hover:bg-slate-950 text-white text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Send className="h-4 w-4" />
                  Publish Briefing
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── RIGHT: Active scenarios checklist (5 columns) ─── */}
      <div className="lg:col-span-5 space-y-4">
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-4.5 w-4.5 text-neutral-850" />
          <h2 className="text-xs font-black text-neutral-450 uppercase tracking-widest block">
            Roster Templates ({scenarios.length})
          </h2>
        </div>

        <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
          {scenarios.map((sc) => (
            <Card
              key={sc.id}
              className="border border-neutral-200 bg-white shadow-3xs rounded-xl overflow-hidden transition-all duration-200 relative group text-left"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <Badge
                    className={cn(
                      "text-[8px] font-extrabold px-1.5 py-0 border border-transparent shadow-none rounded-full uppercase",
                      sc.difficulty === "beginner" && "bg-emerald-50 text-emerald-700 border-emerald-100",
                      sc.difficulty === "intermediate" && "bg-amber-50 text-amber-700 border-amber-100",
                      sc.difficulty === "advanced" && "bg-rose-50 text-rose-700 border-rose-100"
                    )}
                  >
                    {sc.difficulty}
                  </Badge>
                  <Button
                    onClick={() => handleDuplicate(sc.id, sc.name)}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-neutral-400 hover:text-slate-950 hover:bg-neutral-50 rounded-lg shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <span className="text-xs font-black text-neutral-900 block leading-tight">{sc.name}</span>
                <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">{sc.description}</p>

                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-semibold pt-2 border-t border-neutral-50 text-neutral-500">
                  <div>
                    <span className="text-neutral-400 block text-[8px] uppercase font-black">Rounds limit</span>
                    <span className="font-bold text-neutral-850 block mt-0.5">{sc.rounds} Rounds</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[8px] uppercase font-black">Budget allocation</span>
                    <span className="font-bold text-neutral-850 block mt-0.5">${sc.budget.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ScenarioBuilder
