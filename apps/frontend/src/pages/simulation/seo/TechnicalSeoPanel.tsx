import { useCampaignStore } from "@/stores/campaignStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Settings, Smartphone, Zap, Code, Map, Lock, Link, CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

type TechKey =
  | "mobileOptimized"
  | "pageSpeedOptimized"
  | "schemaMarkup"
  | "xmlSitemap"
  | "httpsSecured"
  | "canonicalUrls"

interface TechItem {
  key: TechKey
  title: string
  description: string
  icon: React.ElementType
  scoreContribution: number
}

const TECH_ITEMS: TechItem[] = [
  {
    key: "mobileOptimized",
    title: "Mobile Optimization",
    description: "Responsive layout that adapts to all screen sizes. Required for mobile-first indexing.",
    icon: Smartphone,
    scoreContribution: 20,
  },
  {
    key: "pageSpeedOptimized",
    title: "Page Speed Optimized",
    description: "Core Web Vitals (LCP, FID, CLS) within Google thresholds. Major ranking signal.",
    icon: Zap,
    scoreContribution: 20,
  },
  {
    key: "schemaMarkup",
    title: "Schema Markup Added",
    description: "Structured JSON-LD data enabling rich snippets in search results.",
    icon: Code,
    scoreContribution: 15,
  },
  {
    key: "xmlSitemap",
    title: "XML Sitemap Submitted",
    description: "Submitted sitemap.xml to Google Search Console for faster page discovery.",
    icon: Map,
    scoreContribution: 15,
  },
  {
    key: "httpsSecured",
    title: "HTTPS Secured",
    description: "SSL/TLS certificate active. Google marks non-HTTPS sites as insecure.",
    icon: Lock,
    scoreContribution: 20,
  },
  {
    key: "canonicalUrls",
    title: "Canonical URLs Set",
    description: "Canonical <link> tags prevent duplicate content penalties from multiple URLs.",
    icon: Link,
    scoreContribution: 10,
  },
]

type TechnicalToggles = Record<TechKey, boolean>

export function TechnicalSeoPanel() {
  const { technicalScore, setTechnicalScore } = useCampaignStore()

  // Derive per-item toggle states from the score breakdown
  // We track them locally since the store now just holds the aggregate score
  const [toggles, setToggles] = React.useState<TechnicalToggles>({
    mobileOptimized: false,
    pageSpeedOptimized: false,
    schemaMarkup: false,
    xmlSitemap: false,
    httpsSecured: false,
    canonicalUrls: false,
  })

  const handleToggle = (key: TechKey) => {
    const next: TechnicalToggles = { ...toggles, [key]: !toggles[key] }
    setToggles(next)

    // Recalculate technical score from active items
    const total = TECH_ITEMS.filter((item) => next[item.key]).reduce(
      (sum, item) => sum + item.scoreContribution,
      0,
    )
    setTechnicalScore(Math.min(100, total))
  }

  const activeCount = Object.values(toggles).filter(Boolean).length

  const gaugeColor =
    technicalScore >= 80
      ? "text-emerald-600 bg-emerald-50"
      : technicalScore >= 50
        ? "text-sky-600 bg-sky-50"
        : technicalScore >= 30
          ? "text-amber-600 bg-amber-50"
          : "text-neutral-500 bg-neutral-100"

  return (
    <Card className="border-neutral-200 shadow-sm bg-white text-left flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
          <Settings className="h-4 w-4 text-neutral-500" />
          Technical SEO Setup
        </CardTitle>
        <CardDescription>
          Optimize site infrastructure for search engine crawlers.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 flex-1">
        {/* Score Gauge */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Technical Health Score
            </p>
            <p className="text-2xl font-black text-neutral-900 mt-0.5">
              {technicalScore}{" "}
              <span className="text-sm font-medium text-neutral-400">/ 100</span>
            </p>
            <p className="text-[10px] font-bold text-neutral-400 mt-0.5">
              {activeCount} of {TECH_ITEMS.length} optimizations active
            </p>
          </div>
          <div
            className={cn(
              "h-14 w-14 rounded-xl flex flex-col items-center justify-center gap-0.5 shrink-0",
              gaugeColor,
            )}
          >
            <span className="text-lg font-black leading-none">{technicalScore}</span>
            <span className="text-[9px] font-bold uppercase tracking-wide opacity-70">Score</span>
          </div>
        </div>

        {/* Toggle Checklist */}
        <div className="space-y-3">
          {TECH_ITEMS.map((item) => {
            const Icon = item.icon
            const isOn = toggles[item.key]
            return (
              <div
                key={item.key}
                className={cn(
                  "flex items-start justify-between gap-4 p-3 rounded-xl border transition-all",
                  isOn
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-neutral-100 bg-white",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      isOn ? "bg-emerald-500 text-white" : "bg-neutral-100 text-neutral-500",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-neutral-800">{item.title}</p>
                      {isOn ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="h-3 w-3 text-neutral-300 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-450 leading-relaxed max-w-xs">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Switch checked={isOn} onCheckedChange={() => handleToggle(item.key)} />
                  <span className="text-[9px] font-black text-neutral-400 uppercase">
                    +{item.scoreContribution}pts
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// React import needed for useState
import React from "react"

export default TechnicalSeoPanel
