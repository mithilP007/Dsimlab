import { useCampaignStore } from "@/stores/campaignStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { FileText, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SliderItem {
  label: string
  description: string
  value: number
  onChange: (val: number) => void
  accentColor: string
}

function SeoSlider({ label, description, value, onChange, accentColor }: SliderItem) {
  const quality =
    value >= 75 ? "Excellent" : value >= 50 ? "Good" : value >= 25 ? "Fair" : "Poor"

  const qualityColor =
    value >= 75
      ? "text-emerald-600"
      : value >= 50
        ? "text-sky-600"
        : value >= 25
          ? "text-amber-600"
          : "text-neutral-400"

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-neutral-800">{label}</p>
          <p className="text-[10px] text-neutral-450 font-medium">{description}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-lg font-black text-neutral-900">{value}</span>
          <span className="text-xs text-neutral-400 ml-0.5">/100</span>
          <p className={cn("text-[9px] font-bold uppercase tracking-wider", qualityColor)}>
            {quality}
          </p>
        </div>
      </div>
      <Slider
        min={0}
        max={100}
        step={1}
        value={[value]}
        onValueChange={([val]) => onChange(val)}
        className={cn("w-full", accentColor)}
      />
    </div>
  )
}

export function OnPageEditor() {
  const { onPageScore, setOnPageScore } = useCampaignStore()

  // Sub-scores distributed across 4 sliders (each 0–25 for total 0–100)
  const contentQuality = Math.round(onPageScore * 0.35)
  const keywordDensity = Math.round(onPageScore * 0.25)
  const metaOptimization = Math.round(onPageScore * 0.25)
  const internalLinking = Math.round(onPageScore * 0.15)

  // Each slider controls the overall on-page score via a weighted dimension
  // We use individual local state and merge into a single score
  const handleContentQuality = (val: number) => {
    const next = Math.min(100, Math.round(val / 0.35))
    setOnPageScore(Math.min(100, next))
  }
  const handleKeywordDensity = (val: number) => {
    const next = Math.min(100, Math.round(val / 0.25))
    setOnPageScore(Math.min(100, next))
  }
  const handleMetaOptimization = (val: number) => {
    const next = Math.min(100, Math.round(val / 0.25))
    setOnPageScore(Math.min(100, next))
  }
  const handleInternalLinking = (val: number) => {
    const next = Math.min(100, Math.round(val / 0.15))
    setOnPageScore(Math.min(100, next))
  }

  const scoreColor =
    onPageScore >= 75
      ? "text-emerald-600"
      : onPageScore >= 50
        ? "text-sky-600"
        : onPageScore >= 25
          ? "text-amber-600"
          : "text-neutral-400"

  const progressColor =
    onPageScore >= 75
      ? "bg-emerald-500"
      : onPageScore >= 50
        ? "bg-sky-500"
        : onPageScore >= 25
          ? "bg-amber-500"
          : "bg-neutral-300"

  return (
    <Card className="border-neutral-200 shadow-sm bg-white text-left flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-neutral-500" />
          On-Page SEO Editor
        </CardTitle>
        <CardDescription>
          Adjust content quality, keyword usage, and structural elements.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 flex-1">
        {/* Live Score Preview */}
        <div className="p-4 rounded-xl bg-neutral-950 text-white space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-neutral-400" />
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                On-Page Score Preview
              </span>
            </div>
            <span className={cn("text-2xl font-black", scoreColor)}>
              {onPageScore}
            </span>
          </div>
          <Progress
            value={onPageScore}
            className="h-2 bg-neutral-800"
            // @ts-expect-error custom indicator color via CSS var
            indicatorClassName={progressColor}
          />
          <div className="flex justify-between text-[9px] text-neutral-500 font-bold">
            <span>0 – Poor</span>
            <span>25 – Fair</span>
            <span>50 – Good</span>
            <span>75 – Excellent</span>
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-5">
          <SeoSlider
            label="Content Quality"
            description="Depth, relevance, and originality of page content."
            value={contentQuality}
            onChange={handleContentQuality}
            accentColor="accent-violet-600"
          />
          <SeoSlider
            label="Keyword Density"
            description="Target keyword frequency within body copy (1%–2.5% ideal)."
            value={keywordDensity}
            onChange={handleKeywordDensity}
            accentColor="accent-sky-600"
          />
          <SeoSlider
            label="Meta Optimization"
            description="Title tags, meta descriptions, and open-graph fields."
            value={metaOptimization}
            onChange={handleMetaOptimization}
            accentColor="accent-amber-600"
          />
          <SeoSlider
            label="Internal Linking"
            description="Number and relevance of links between your own pages."
            value={internalLinking}
            onChange={handleInternalLinking}
            accentColor="accent-emerald-600"
          />
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { label: "Content Quality", val: contentQuality, pct: "35%" },
            { label: "Keyword Density", val: keywordDensity, pct: "25%" },
            { label: "Meta Optimization", val: metaOptimization, pct: "25%" },
            { label: "Internal Linking", val: internalLinking, pct: "15%" },
          ].map((item) => (
            <div
              key={item.label}
              className="p-2.5 rounded-lg border border-neutral-100 bg-neutral-50/50"
            >
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide truncate">
                {item.label}
              </p>
              <div className="flex items-end justify-between mt-0.5">
                <span className="text-sm font-black text-neutral-900">{item.val}</span>
                <span className="text-[9px] text-neutral-400 font-bold">{item.pct} weight</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default OnPageEditor
