import { useState } from "react"
import { useMetaAdsStore, computeStrength } from "@/stores/metaAdsStore"
import type { CreativeType, MetaCreative } from "@/stores/metaAdsStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Image,
  Film,
  LayoutGrid,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Eye,
  PenLine,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── CTA options ──────────────────────────────────────────────────────────────

const CTA_OPTIONS = ["Shop Now", "Learn More", "Sign Up", "Download", "Book Now", "Contact Us"]

// ─── Strength helper ──────────────────────────────────────────────────────────

function strengthLabel(score: number): { label: string; color: string; bg: string; icon: typeof CheckCircle2; bars: number } {
  if (score > 75) return { label: "Excellent", color: "text-emerald-700", bg: "bg-emerald-50", icon: CheckCircle2, bars: 3 }
  if (score >= 50) return { label: "Average",  color: "text-amber-700",  bg: "bg-amber-50",   icon: AlertTriangle, bars: 2 }
  return              { label: "Poor",      color: "text-red-700",    bg: "bg-red-50",     icon: AlertCircle, bars: 1 }
}

// ─── Character Counter ────────────────────────────────────────────────────────

function CharCount({ current, max }: { current: number; max: number }) {
  const pct = (current / max) * 100
  return (
    <span className={cn("text-[10px] font-bold", current > max ? "text-red-500" : pct > 80 ? "text-amber-500" : "text-neutral-400")}>
      {current}/{max}
    </span>
  )
}

// ─── Facebook Ad Preview ──────────────────────────────────────────────────────

function AdPreview({ creative }: { creative: Pick<MetaCreative, "type" | "headline" | "primaryText" | "callToAction"> }) {
  const TypeIcon = creative.type === "image" ? Image : creative.type === "video" ? Film : LayoutGrid
  const typeBg = creative.type === "image" ? "bg-sky-50" : creative.type === "video" ? "bg-rose-50" : "bg-violet-50"
  const typeColor = creative.type === "image" ? "text-sky-500" : creative.type === "video" ? "text-rose-500" : "text-violet-500"

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      {/* Profile row */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-black shrink-0">S</div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-neutral-900">YourStore.com</p>
          <p className="text-[9px] text-neutral-400">Sponsored · <span className="text-blue-600">👥 Like Page</span></p>
        </div>
      </div>
      {/* Primary text */}
      <p className="px-3 pb-2 text-[11px] text-neutral-700 leading-relaxed">
        {creative.primaryText.slice(0, 100) || "Your primary text appears here…"}
        {creative.primaryText.length > 100 && "…"}
      </p>
      {/* Media placeholder */}
      <div className={cn("flex items-center justify-center h-32 w-full border-y border-neutral-100", typeBg)}>
        <div className="flex flex-col items-center gap-1.5">
          <TypeIcon className={cn("h-8 w-8", typeColor)} />
          <span className="text-[9px] font-bold text-neutral-500 capitalize">{creative.type} ad</span>
        </div>
      </div>
      {/* Bottom: headline + CTA */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-neutral-50 border-t border-neutral-100">
        <div className="min-w-0">
          <p className="text-[10px] text-neutral-400 font-medium">yourstore.com</p>
          <p className="text-[11px] font-bold text-neutral-800 truncate">{creative.headline || "Your Headline"}</p>
        </div>
        <button
          type="button"
          className="ml-2 shrink-0 px-2.5 py-1 rounded bg-blue-600 text-white text-[9px] font-bold"
        >
          {creative.callToAction || "Shop Now"}
        </button>
      </div>
    </div>
  )
}

// ─── Blank form ───────────────────────────────────────────────────────────────

const BLANK: Omit<MetaCreative, "id"> = {
  type: "image",
  headline: "",
  primaryText: "",
  callToAction: "Shop Now",
  mediaQuality: 60,
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreativeStudio() {
  const { creatives, addCreative, removeCreative } = useMetaAdsStore()
  const [form, setForm] = useState<Omit<MetaCreative, "id">>(BLANK)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<CreativeType>("image")

  const upd = <K extends keyof typeof BLANK>(k: K, v: (typeof BLANK)[K]) =>
    setForm((p) => ({ ...p, [k]: v }))

  const score = computeStrength({ ...form, id: "__preview" })
  const sInfo = strengthLabel(score)
  const SIcon = sInfo.icon

  const handleAdd = () => {
    if (!form.headline || !form.primaryText) return
    addCreative({ ...form, type: activeTab })
    setForm(BLANK)
    setShowForm(false)
  }

  return (
    <Card className="border-neutral-200 shadow-sm bg-white text-left">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-neutral-500" />
            Creative Studio
          </span>
          <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
            {creatives.length} saved
          </span>
        </CardTitle>
        <CardDescription>
          Build ad creatives for your campaign. Strong creatives reduce CPC and increase CTR.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Saved Creatives */}
        {creatives.map((c) => {
          const sc = computeStrength(c)
          const si = strengthLabel(sc)
          const SI = si.icon
          return (
            <div key={c.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="text-[9px] font-bold border-none bg-neutral-100 text-neutral-600 capitalize">{c.type}</Badge>
                  <Badge className={cn("text-[9px] font-bold border-none flex items-center gap-1", si.bg, si.color)}>
                    <SI className="h-2.5 w-2.5" />{si.label} ({sc})
                  </Badge>
                </div>
                <button type="button" onClick={() => removeCreative(c.id)} className="text-neutral-300 hover:text-red-500 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <AdPreview creative={c} />
            </div>
          )
        })}

        {/* New Creative Form */}
        {showForm ? (
          <div className="space-y-4 p-4 rounded-xl border border-neutral-200 bg-neutral-50/40">
            {/* Type Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as CreativeType); upd("type", v as CreativeType) }}>
              <TabsList className="w-full">
                <TabsTrigger value="image"    className="flex-1 gap-1.5 text-xs"><Image   className="h-3.5 w-3.5" />Image</TabsTrigger>
                <TabsTrigger value="video"    className="flex-1 gap-1.5 text-xs"><Film    className="h-3.5 w-3.5" />Video</TabsTrigger>
                <TabsTrigger value="carousel" className="flex-1 gap-1.5 text-xs"><LayoutGrid className="h-3.5 w-3.5" />Carousel</TabsTrigger>
              </TabsList>

              {(["image", "video", "carousel"] as CreativeType[]).map((t) => (
                <TabsContent key={t} value={t} className="mt-4 space-y-4">
                  {/* Live Preview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-3 w-3 text-neutral-400" />
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Facebook Preview</p>
                    </div>
                    <AdPreview creative={{ ...form, type: t }} />
                  </div>

                  {/* Creative Strength */}
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider shrink-0">Strength</p>
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className={cn(
                          "h-1.5 flex-1 rounded-full transition-all",
                          n <= sInfo.bars
                            ? sInfo.bars === 3 ? "bg-emerald-500" : sInfo.bars === 2 ? "bg-amber-500" : "bg-red-400"
                            : "bg-neutral-200",
                        )} />
                      ))}
                    </div>
                    <span className={cn("text-[10px] font-black shrink-0 flex items-center gap-1", sInfo.color)}>
                      <SIcon className="h-3 w-3" />{sInfo.label} ({score})
                    </span>
                  </div>

                  {/* Headline */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-xs font-bold text-neutral-700">Headline ✱</label>
                      <CharCount current={form.headline.length} max={40} />
                    </div>
                    <Input value={form.headline} onChange={(e) => upd("headline", e.target.value.slice(0, 40))} placeholder="e.g. Buy Premium Shoes Online" className="text-xs" />
                  </div>

                  {/* Primary Text */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-xs font-bold text-neutral-700">Primary Text ✱</label>
                      <CharCount current={form.primaryText.length} max={125} />
                    </div>
                    <Textarea value={form.primaryText} onChange={(e) => upd("primaryText", e.target.value.slice(0, 125))} placeholder="e.g. Step into comfort. Shop our latest collection of premium athletic footwear." rows={3} className="text-xs resize-none" />
                  </div>

                  {/* CTA */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700">Call to Action</label>
                    <Select value={form.callToAction} onValueChange={(v) => upd("callToAction", v)}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CTA_OPTIONS.map((cta) => (
                          <SelectItem key={cta} value={cta} className="text-xs">{cta}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Media Quality */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-neutral-700">
                      <label>Media Quality</label>
                      <span>{form.mediaQuality}%</span>
                    </div>
                    <Slider min={0} max={100} step={5} value={[form.mediaQuality]} onValueChange={([v]) => upd("mediaQuality", v)} />
                    <div className="flex justify-between text-[9px] text-neutral-400 font-bold">
                      <span>Poor</span><span>Average</span><span>High</span>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!form.headline || !form.primaryText}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all border",
                  form.headline && form.primaryText
                    ? "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700"
                    : "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed",
                )}
              >
                <Plus className="h-3.5 w-3.5" />Save Creative
              </button>
              <button type="button" onClick={() => { setForm(BLANK); setShowForm(false) }} className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:border-neutral-400 transition-all">
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
            <Plus className="h-4 w-4" />Add Creative
          </button>
        )}
      </CardContent>
    </Card>
  )
}

export default CreativeStudio
