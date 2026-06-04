import { useGoogleAdsStore } from "@/stores/googleAdsStore"
import type { CampaignStatus } from "@/stores/googleAdsStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Settings2,
  Laptop,
  Smartphone,
  Tablet,
  MapPin,
  DollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft:  "bg-neutral-100 text-neutral-600",
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
}

const STATUS_DOTS: Record<CampaignStatus, string> = {
  draft:  "bg-neutral-400",
  active: "bg-emerald-500 animate-pulse",
  paused: "bg-amber-400",
}

export function CampaignBuilder() {
  const {
    campaignName, setCampaignName,
    dailyBudget, setDailyBudget,
    totalBudget, budgetSpent,
    devices, toggleDevice,
    locations, toggleLocation,
    campaignStatus, setCampaignStatus,
  } = useGoogleAdsStore()

  const budgetPct = Math.min(100, (budgetSpent / totalBudget) * 100)

  const STATUS_OPTIONS: CampaignStatus[] = ["draft", "active", "paused"]

  return (
    <Card className="border-neutral-200 shadow-sm bg-white text-left">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-neutral-500" />
          Campaign Builder
        </CardTitle>
        <CardDescription>
          Name your campaign, set budgets, targeting devices and locations.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Campaign Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700">Campaign Name</label>
          <Input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g. Footwear Summer Sale 2025"
          />
        </div>

        {/* Campaign Status */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-700">Campaign Status</label>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCampaignStatus(s)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold capitalize transition-all",
                  campaignStatus === s
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", campaignStatus === s ? "bg-white" : STATUS_DOTS[s])} />
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Daily Budget Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
            <label>Daily Budget</label>
            <span className="text-neutral-900 font-black">${dailyBudget}</span>
          </div>
          <Slider
            min={10}
            max={500}
            step={5}
            value={[dailyBudget]}
            onValueChange={([v]) => setDailyBudget(v)}
          />
          <div className="flex justify-between text-[9px] text-neutral-400 font-bold">
            <span>$10</span>
            <span>$125</span>
            <span>$250</span>
            <span>$375</span>
            <span>$500</span>
          </div>
        </div>

        {/* Total Budget */}
        <div className="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-neutral-400" />
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                Monthly Budget Tracker
              </span>
            </div>
            <Badge className={cn("text-[9px] font-black border-none capitalize", STATUS_STYLES[campaignStatus])}>
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1", STATUS_DOTS[campaignStatus])} />
              {campaignStatus}
            </Badge>
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

        {/* Device Targeting */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-neutral-700">Device Targeting</label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { key: "desktop" as const, label: "Desktop",  icon: Laptop },
                { key: "mobile"  as const, label: "Mobile",   icon: Smartphone },
                { key: "tablet"  as const, label: "Tablet",   icon: Tablet },
              ] as const
            ).map(({ key, label, icon: Icon }) => {
              const isOn = devices[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDevice(key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-xs font-bold",
                    isOn
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Location Targeting */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-neutral-400" />
            <label className="text-xs font-bold text-neutral-700">Location Targeting</label>
          </div>
          <div className="space-y-2">
            {locations.map((loc) => (
              <label
                key={loc.name}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all",
                  loc.selected
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 bg-white hover:border-neutral-300",
                )}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={loc.selected}
                    onChange={() => toggleLocation(loc.name)}
                    className="h-3.5 w-3.5 accent-neutral-900 rounded"
                  />
                  <span className="text-xs font-semibold text-neutral-800">{loc.name}</span>
                </div>
                {loc.selected && (
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </label>
            ))}
          </div>
          <p className="text-[10px] text-neutral-400 font-medium">
            {locations.filter((l) => l.selected).length} location{locations.filter((l) => l.selected).length !== 1 ? "s" : ""} selected
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default CampaignBuilder
