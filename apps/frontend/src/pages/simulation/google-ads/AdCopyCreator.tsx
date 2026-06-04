import { useState } from "react"
import { useGoogleAdsStore } from "@/stores/googleAdsStore"
import type { AdStrength } from "@/stores/googleAdsStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PenLine, Eye, Trash2, Plus, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Strength Config ──────────────────────────────────────────────────────────

const STRENGTH_CONFIG: Record<AdStrength, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  excellent: { label: "Excellent", color: "text-emerald-700", bg: "bg-emerald-50", icon: CheckCircle2 },
  average:   { label: "Average",   color: "text-amber-700",   bg: "bg-amber-50",   icon: AlertTriangle },
  poor:      { label: "Poor",      color: "text-red-700",     bg: "bg-red-50",     icon: AlertCircle },
}

const STRENGTH_BARS: Record<AdStrength, number> = {
  poor: 1, average: 2, excellent: 3,
}

// ─── Character counter ────────────────────────────────────────────────────────

function CharCount({ current, max }: { current: number; max: number }) {
  const pct = (current / max) * 100
  return (
    <span
      className={cn(
        "text-[10px] font-bold",
        current > max ? "text-red-500" :
        pct > 80 ? "text-amber-500" :
        "text-neutral-400",
      )}
    >
      {current}/{max}
    </span>
  )
}

// ─── Ad Preview ───────────────────────────────────────────────────────────────

function AdPreview({
  headline1, headline2, headline3,
  description1, description2,
}: {
  headline1: string; headline2: string; headline3: string;
  description1: string; description2: string;
}) {
  const h1 = headline1 || "Your Headline 1"
  const h2 = headline2 || "Headline 2"
  const h3 = headline3 || "Headline 3"
  const d1 = description1 || "Your compelling ad description goes here. Tell users what makes you unique."
  const d2 = description2 || ""

  return (
    <div className="p-4 rounded-xl border border-neutral-200 bg-white space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-neutral-500 border border-neutral-300 rounded px-1 py-0.5">
          Sponsored
        </span>
        <span className="text-[10px] text-green-700 truncate">www.yourstore.com</span>
      </div>
      <p className="text-sm font-bold leading-snug">
        <span className="text-blue-700">{h1}</span>
        <span className="text-neutral-400 mx-1">|</span>
        <span className="text-blue-700">{h2}</span>
        {h3 && <><span className="text-neutral-400 mx-1">|</span><span className="text-blue-700">{h3}</span></>}
      </p>
      <p className="text-[11px] text-neutral-600 leading-relaxed">
        {d1}{d2 && ` ${d2}`}
      </p>
    </div>
  )
}

// ─── Blank form ───────────────────────────────────────────────────────────────

const BLANK = { headline1: "", headline2: "", headline3: "", description1: "", description2: "" }

// ─── Component ────────────────────────────────────────────────────────────────

export function AdCopyCreator() {
  const { adCopies, addAdCopy, removeAdCopy } = useGoogleAdsStore()
  const [form, setForm] = useState(BLANK)
  const [showForm, setShowForm] = useState(false)

  const update = (field: keyof typeof BLANK, val: string) =>
    setForm((p) => ({ ...p, [field]: val }))

  // Compute live strength from form
  const liveStrength = (): AdStrength => {
    let score = 0
    if (form.headline1.length >= 20) score++
    if (form.headline2.length >= 15) score++
    if (form.headline3.length >= 10) score++
    if (form.description1.length >= 60) score++
    if (form.description2.length >= 40) score++
    if (score >= 4) return "excellent"
    if (score >= 2) return "average"
    return "poor"
  }

  const strength = liveStrength()
  const strengthCfg = STRENGTH_CONFIG[strength]
  const StrengthIcon = strengthCfg.icon

  const handleAdd = () => {
    if (!form.headline1 || !form.description1) return
    addAdCopy(form)
    setForm(BLANK)
    setShowForm(false)
  }

  return (
    <Card className="border-neutral-200 shadow-sm bg-white text-left">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-neutral-500" />
            Ad Copy Creator
          </span>
          <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
            {adCopies.length} saved
          </span>
        </CardTitle>
        <CardDescription>
          Write responsive search ads. Include keywords for better quality scores.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Saved Ad Copies */}
        {adCopies.map((ad, idx) => {
          const cfg = STRENGTH_CONFIG[ad.strength]
          const Icon = cfg.icon
          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                    Ad Copy {idx + 1}
                  </span>
                  <Badge className={cn("text-[9px] font-bold border-none flex items-center gap-1 px-1.5 py-0", cfg.bg, cfg.color)}>
                    <Icon className="h-2.5 w-2.5" />
                    {cfg.label}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => removeAdCopy(idx)}
                  className="text-neutral-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <AdPreview
                headline1={ad.headline1}
                headline2={ad.headline2}
                headline3={ad.headline3}
                description1={ad.description1}
                description2={ad.description2}
              />
            </div>
          )
        })}

        {/* Add new form */}
        {showForm ? (
          <div className="space-y-4 p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
            {/* Live Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Eye className="h-3 w-3 text-neutral-400" />
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Live Preview</p>
              </div>
              <AdPreview
                headline1={form.headline1}
                headline2={form.headline2}
                headline3={form.headline3}
                description1={form.description1}
                description2={form.description2}
              />
            </div>

            {/* Strength */}
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider shrink-0">Ad Strength</p>
              <div className="flex gap-1 flex-1">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-all",
                      n <= STRENGTH_BARS[strength]
                        ? strength === "excellent" ? "bg-emerald-500"
                          : strength === "average" ? "bg-amber-500"
                          : "bg-red-400"
                        : "bg-neutral-200",
                    )}
                  />
                ))}
              </div>
              <span className={cn("text-[10px] font-black shrink-0 flex items-center gap-1", strengthCfg.color)}>
                <StrengthIcon className="h-3 w-3" />
                {strengthCfg.label}
              </span>
            </div>

            {/* Headlines */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-neutral-700">Headlines <span className="font-normal text-neutral-400">— 30 chars max</span></p>
              {(["headline1", "headline2", "headline3"] as const).map((field, i) => (
                <div key={field} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-neutral-600">Headline {i + 1}{i < 2 ? " ✱" : ""}</label>
                    <CharCount current={form[field].length} max={30} />
                  </div>
                  <Input
                    value={form[field]}
                    onChange={(e) => update(field, e.target.value.slice(0, 30))}
                    placeholder={["e.g. Buy Premium Shoes Online", "e.g. Free Shipping on $50+", "e.g. 500+ Styles Available"][i]}
                    className="text-xs"
                  />
                </div>
              ))}
            </div>

            {/* Descriptions */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-neutral-700">Descriptions <span className="font-normal text-neutral-400">— 90 chars max</span></p>
              {(["description1", "description2"] as const).map((field, i) => (
                <div key={field} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-neutral-600">Description {i + 1}{i === 0 ? " ✱" : ""}</label>
                    <CharCount current={form[field].length} max={90} />
                  </div>
                  <Textarea
                    value={form[field]}
                    onChange={(e) => update(field, e.target.value.slice(0, 90))}
                    placeholder={i === 0
                      ? "e.g. Discover premium athletic footwear built for performance. Shop the full range."
                      : "e.g. 30-day returns. Secure checkout. Order by midnight for express delivery."}
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>
              ))}
            </div>

            {/* Strength Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-neutral-400">
                <span>Copy completeness</span>
                <span>{Math.round(([form.headline1, form.headline2, form.description1].filter(Boolean).length / 3) * 100)}%</span>
              </div>
              <Progress
                value={[form.headline1, form.headline2, form.headline3, form.description1, form.description2].filter(Boolean).length * 20}
                className="h-1.5"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!form.headline1 || !form.description1}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all border",
                  form.headline1 && form.description1
                    ? "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700"
                    : "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed",
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                Save Ad Copy
              </button>
              <button
                type="button"
                onClick={() => { setForm(BLANK); setShowForm(false) }}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:border-neutral-400 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-neutral-200 text-xs font-bold text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Ad Copy
          </button>
        )}
      </CardContent>
    </Card>
  )
}

export default AdCopyCreator
