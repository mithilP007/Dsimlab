import { useMetaAdsStore, OBJECTIVE_META } from "@/stores/metaAdsStore"
import type { MetaObjective } from "@/stores/metaAdsStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import {
  Eye,
  MousePointer,
  Heart,
  Target,
  ShoppingCart,
  Settings2,
  DollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"

const OBJECTIVE_ICONS: Record<MetaObjective, React.ElementType> = {
  awareness:   Eye,
  traffic:     MousePointer,
  engagement:  Heart,
  conversions: Target,
  sales:       ShoppingCart,
}

const OBJECTIVE_COLORS: Record<MetaObjective, { icon: string; bg: string; ring: string }> = {
  awareness:   { icon: "text-violet-600", bg: "bg-violet-50", ring: "ring-violet-500 border-violet-500" },
  traffic:     { icon: "text-sky-600",    bg: "bg-sky-50",    ring: "ring-sky-500 border-sky-500" },
  engagement:  { icon: "text-rose-600",   bg: "bg-rose-50",   ring: "ring-rose-500 border-rose-500" },
  conversions: { icon: "text-amber-600",  bg: "bg-amber-50",  ring: "ring-amber-500 border-amber-500" },
  sales:       { icon: "text-emerald-600",bg: "bg-emerald-50",ring: "ring-emerald-500 border-emerald-500" },
}

const OBJECTIVES = Object.keys(OBJECTIVE_META) as MetaObjective[]

export function CampaignSetup() {
  const {
    campaignName, setCampaignName,
    objective, setObjective,
    dailyBudget, setDailyBudget,
    totalBudget, budgetSpent,
  } = useMetaAdsStore()

  const budgetPct = totalBudget > 0 ? Math.min(100, (budgetSpent / totalBudget) * 100) : 0
  const selectedColors = OBJECTIVE_COLORS[objective]

  return (
    <Card className="border-neutral-200 shadow-sm bg-white text-left">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-neutral-500" />
          Campaign Setup
        </CardTitle>
        <CardDescription>
          Name your campaign and choose an objective and budget.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Campaign Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700">Campaign Name</label>
          <Input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g. Footwear Summer Meta Campaign"
          />
        </div>

        {/* Objective Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-700">Campaign Objective</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {OBJECTIVES.map((obj) => {
              const Icon = OBJECTIVE_ICONS[obj]
              const colors = OBJECTIVE_COLORS[obj]
              const isActive = objective === obj
              return (
                <button
                  key={obj}
                  type="button"
                  onClick={() => setObjective(obj)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    isActive
                      ? `${colors.ring} ring-1 bg-white`
                      : "border-neutral-200 bg-white hover:border-neutral-300",
                  )}
                >
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center mb-2", colors.bg)}>
                    <Icon className={cn("h-3.5 w-3.5", colors.icon)} />
                  </div>
                  <p className="text-[11px] font-bold text-neutral-800 capitalize">{obj}</p>
                </button>
              )
            })}
          </div>

          {/* Selected objective description */}
          <div className={cn(
            "flex items-start gap-2 p-3 rounded-xl border transition-all",
            `${selectedColors.ring} bg-white ring-1`,
          )}>
            {(() => { const Icon = OBJECTIVE_ICONS[objective]; return <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", selectedColors.icon)} /> })()}
            <p className="text-[10px] text-neutral-600 font-medium leading-relaxed">
              <span className="font-bold text-neutral-800 capitalize">{objective}: </span>
              {OBJECTIVE_META[objective].description}
            </p>
          </div>
        </div>

        {/* Budget Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700">Budget Type</label>
          <select
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 outline-none focus:border-neutral-900 transition-all"
            defaultValue="daily"
          >
            <option value="daily">Daily Budget (Individual Ad Set control)</option>
            <option value="lifetime">Lifetime Budget (Total campaign pacing)</option>
            <option value="cbo">Campaign Budget Optimization (CBO - AI allocated)</option>
          </select>
        </div>

        {/* Daily Budget */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-700">Daily Budget</label>
            <span className="text-sm font-black text-neutral-900">${dailyBudget}</span>
          </div>
          <Slider
            min={10}
            max={300}
            step={5}
            value={[dailyBudget]}
            onValueChange={([v]) => setDailyBudget(v)}
          />
          <div className="flex justify-between text-[9px] text-neutral-400 font-bold">
            <span>$10</span><span>$75</span><span>$150</span><span>$225</span><span>$300</span>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3 text-neutral-400" />
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Budget Tracker</span>
            </div>
            <span className="text-xs font-black text-neutral-900">${totalBudget.toLocaleString()} / month</span>
          </div>
          <Progress value={budgetPct} className="h-2" />
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-neutral-500">
              Spent <span className="text-neutral-900">${budgetSpent.toFixed(2)}</span>
            </span>
            <span className="text-neutral-500">
              Total <span className="text-neutral-900">${totalBudget.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CampaignSetup
