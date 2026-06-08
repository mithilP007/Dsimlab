import { useGoogleAdsStore } from "@/stores/googleAdsStore"
import type { CampaignStatus } from "@/stores/googleAdsStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
    objective, setObjective,
    campaignType, setCampaignType,
    biddingStrategy, setBiddingStrategy,
    negativeKeywords, addNegativeKeyword, removeNegativeKeyword,
    landingPage, updateLandingPage,
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
          Campaign Settings
        </CardTitle>
        <CardDescription>
          Configure campaign attributes, budgets, bid strategies, negative keywords, and landing page metrics.
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

        {/* Campaign Objective */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700">Campaign Objective</label>
          <select
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 outline-none focus:border-neutral-900 transition-all"
          >
            <option value="Sales">Sales</option>
            <option value="Leads">Leads</option>
            <option value="Website Traffic">Website Traffic</option>
            <option value="Brand Awareness">Brand Awareness</option>
            <option value="App Promotion">App Promotion</option>
            <option value="Local Store Visits">Local Store Visits</option>
            <option value="Product and Brand Consideration">Product and Brand Consideration</option>
          </select>
        </div>

        {/* Campaign Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700">Campaign Type</label>
          <select
            value={campaignType}
            onChange={(e) => setCampaignType(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 outline-none focus:border-neutral-900 transition-all"
          >
            <option value="Search">Search (Text Ads)</option>
            <option value="Display">Display (Image Banner Ads)</option>
            <option value="Shopping">Shopping (Product Feed Ads)</option>
            <option value="Video">Video (YouTube Video Ads)</option>
            <option value="Performance Max">Performance Max (All Channels)</option>
            <option value="Demand Gen">Demand Gen (Social Feed Ads)</option>
          </select>
        </div>

        {/* Bidding Strategy */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700">Bidding Strategy</label>
          <select
            value={biddingStrategy}
            onChange={(e) => setBiddingStrategy(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 outline-none focus:border-neutral-900 transition-all"
          >
            <option value="Manual CPC">Manual CPC (Focus on Clicks Bid)</option>
            <option value="Maximize Clicks">Maximize Clicks (Automated Traffic)</option>
            <option value="Maximize Conversions">Maximize Conversions (Automated Actions)</option>
            <option value="Target CPA">Target CPA (Cost-per-Acquisition limit)</option>
            <option value="Target ROAS">Target ROAS (Revenue ROI focus)</option>
            <option value="Target Impression Share">Target Impression Share (Visibility focus)</option>
          </select>
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

        {/* Negative Keywords */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-700">Negative Keywords (Filters traffic)</label>
          <div className="flex gap-2">
            <Input
              id="new-negative-kw"
              placeholder="e.g. cheap, free, used"
              className="text-xs h-9"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = e.currentTarget.value.trim();
                  if (val) {
                    addNegativeKeyword(val);
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3 text-xs font-bold shrink-0 border-neutral-200"
              onClick={() => {
                const el = document.getElementById('new-negative-kw') as HTMLInputElement;
                if (el && el.value.trim()) {
                  addNegativeKeyword(el.value.trim());
                  el.value = '';
                }
              }}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {negativeKeywords.length === 0 ? (
              <span className="text-[10px] text-neutral-400 font-semibold italic">No negative keywords added.</span>
            ) : (
              negativeKeywords.map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="text-[9px] font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-750 flex items-center gap-1 py-0.5 px-2 cursor-pointer border border-neutral-200"
                  onClick={() => removeNegativeKeyword(kw)}
                >
                  {kw} <span className="text-neutral-400 font-black">×</span>
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Landing Page Quality Sliders */}
        <div className="space-y-3 p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/50">
          <label className="text-xs font-bold text-neutral-700 block">Landing Page Experience Parameters (1-10)</label>
          <div className="space-y-3">
            {[
              { key: "pageRelevance", label: "Page Relevance" },
              { key: "mobileFriendly", label: "Mobile Friendliness" },
              { key: "pageSpeed", label: "Page Speed & Core Web Vitals" },
              { key: "trustSignals", label: "Trust Signals & HTTPS" },
              { key: "offerClarity", label: "Offer Clarity & Headings" },
              { key: "conversionReadiness", label: "Form & Checkout Readiness" }
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-neutral-600">
                  <span>{label}</span>
                  <span className="text-neutral-900">{(landingPage as any)[key]}/10</span>
                </div>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[(landingPage as any)[key]]}
                  onValueChange={([v]) => updateLandingPage(key, v)}
                  className="h-1.5"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Total Budget Tracker */}
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
