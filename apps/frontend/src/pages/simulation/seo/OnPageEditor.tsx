import { useEffect } from "react"
import { useCampaignStore, AVAILABLE_KEYWORDS } from "@/stores/campaignStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Heading1,
  FileCheck,
  Code,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function OnPageEditor() {
  const {
    selectedKeywords,
    onPageScore,
    setOnPageScore,
    metaTitle,
    metaDescription,
    h1Header,
    bodyContent,
    setMetaTitle,
    setMetaDescription,
    setH1Header,
    setBodyContent,
  } = useCampaignStore()

  // ─── Real-Time SEO Scoring Analysis ──────────────────────────────────────────

  // 1. Meta Title (Max 25 pts)
  const titleLength = metaTitle.length
  const isTitleIdeal = titleLength >= 40 && titleLength <= 60
  
  // Find selected keywords objects
  const activeKeywords = selectedKeywords.map((kwId) =>
    AVAILABLE_KEYWORDS.find((k) => k.id === kwId)
  ).filter(Boolean)

  const hasKeywordInTitle = activeKeywords.some((kw) =>
    kw && metaTitle.toLowerCase().includes(kw.name.toLowerCase())
  )
  const titleScore = (isTitleIdeal ? 12 : 0) + (hasKeywordInTitle ? 13 : 0)

  // 2. Meta Description (Max 25 pts)
  const descLength = metaDescription.length
  const isDescIdeal = descLength >= 120 && descLength <= 160
  const hasKeywordInDesc = activeKeywords.some((kw) =>
    kw && metaDescription.toLowerCase().includes(kw.name.toLowerCase())
  )
  const descScore = (isDescIdeal ? 12 : 0) + (hasKeywordInDesc ? 13 : 0)

  // 3. H1 Page Header (Max 15 pts)
  const hasH1 = h1Header.trim().length > 0
  const hasKeywordInH1 = activeKeywords.some((kw) =>
    kw && h1Header.toLowerCase().includes(kw.name.toLowerCase())
  )
  const h1Score = (hasH1 ? 5 : 0) + (hasKeywordInH1 ? 10 : 0)

  // 4. Content Word Count & Keyword Density (Max 35 pts)
  const words = bodyContent.trim() ? bodyContent.trim().split(/\s+/) : []
  const wordCount = words.length

  let wordCountScore = 0
  if (wordCount > 300) wordCountScore = 15
  else if (wordCount > 200) wordCountScore = 10
  else if (wordCount > 100) wordCountScore = 5

  // Calculate occurrences & density of each keyword in content
  let totalKeywordMatches = 0
  const keywordStats = activeKeywords.map((kw) => {
    if (!kw) return { id: "", name: "", count: 0, density: 0 }
    
    // Exact word boundary matching (case-insensitive)
    const escapedKw = kw.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`\\b${escapedKw}\\b`, "gi")
    const matches = bodyContent.match(regex)
    const count = matches ? matches.length : 0
    totalKeywordMatches += count

    return {
      id: kw.id,
      name: kw.name,
      count,
      density: wordCount > 0 ? Number(((count / wordCount) * 100).toFixed(2)) : 0,
    }
  })

  const overallDensity = wordCount > 0 ? Number(((totalKeywordMatches / wordCount) * 100).toFixed(2)) : 0
  
  let densityScore = 0
  let densityWarning = ""
  if (overallDensity >= 1.0 && overallDensity <= 3.5) {
    densityScore = 20
  } else if (overallDensity > 0 && overallDensity < 1.0) {
    densityScore = 10
    densityWarning = "Keyword density is low (under 1%). Try inserting your target keywords a few more times."
  } else if (overallDensity > 3.5) {
    densityScore = 8
    densityWarning = "Keyword stuffing detected (over 3.5%)! Keep density between 1.0% and 3.5% to avoid Google search penalty."
  }

  const contentScore = wordCountScore + densityScore
  const computedTotalScore = titleScore + descScore + h1Score + contentScore

  // Sync with campaign store reactively
  useEffect(() => {
    setOnPageScore(computedTotalScore)
  }, [computedTotalScore, setOnPageScore])

  // ─── UI Styling helpers ──────────────────────────────────────────────────────

  const getLengthProgressColor = (len: number, min: number, max: number) => {
    if (len === 0) return "bg-neutral-200"
    if (len < min) return "bg-amber-500"
    if (len > max) return "bg-red-500"
    return "bg-emerald-500"
  }

  const scoreColor =
    onPageScore >= 75
      ? "text-emerald-600 dark:text-emerald-400"
      : onPageScore >= 50
        ? "text-sky-600 dark:text-sky-400"
        : onPageScore >= 25
          ? "text-amber-600 dark:text-amber-400"
          : "text-neutral-450"

  const progressColor =
    onPageScore >= 75
      ? "bg-emerald-500"
      : onPageScore >= 50
        ? "bg-sky-500"
        : onPageScore >= 25
          ? "bg-amber-500"
          : "bg-neutral-300"

  return (
    <div className="space-y-5">
      {/* ─── On-Page Audit Checklist & Google Snippet ─── */}
      <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-950 text-left">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-neutral-500" />
              On-Page SEO Optimizer
            </CardTitle>
            <CardDescription>
              Write real-world landing page elements and audit them for search engine optimization.
            </CardDescription>
          </div>
          <div className="text-right shrink-0">
            <span className={cn("text-2xl font-black", scoreColor)}>
              {onPageScore}
            </span>
            <span className="text-xs text-neutral-400 ml-0.5">/100</span>
            <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400">On-Page Score</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Live Score Progress Bar */}
          <div className="space-y-1.5">
            <Progress
              value={onPageScore}
              className="h-2 bg-neutral-100 dark:bg-neutral-900"
              // @ts-expect-error custom indicator color via CSS var
              indicatorClassName={progressColor}
            />
            <div className="flex justify-between text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
              <span>Weights: 25% Title · 25% Meta · 15% H1 · 35% Body</span>
            </div>
          </div>

          {/* Google Search Snippet Preview (Interactive Replica) */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              <Globe className="h-3.5 w-3.5" />
              Google SERP Snippet Preview
            </div>
            
            <div className="bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800 rounded-xl p-4 space-y-1 shadow-3xs text-left max-w-lg">
              {/* URL */}
              <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 truncate">
                <span>https://www.simplabshoes.com</span>
                <span className="text-[10px] text-neutral-400">› store › custom-shoes</span>
              </div>
              {/* Title link */}
              <a
                href="#"
                className="text-base sm:text-lg font-medium text-blue-650 hover:underline dark:text-blue-400 leading-tight block truncate"
              >
                {metaTitle.trim() || "Please enter a Meta Title Tag..."}
              </a>
              {/* Description */}
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-normal line-clamp-2 break-words">
                {metaDescription.trim() || "Please write a Meta Description for this page copy. Optimized meta descriptions increase organic click-through rates (CTR) on Google search results."}
              </p>
            </div>
          </div>

          {/* ─── Real Meta Input Forms ─── */}
          <div className="space-y-4">
            {/* Meta Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <label className="text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                  <Code className="h-3.5 w-3.5 text-neutral-500" />
                  Meta Title Tag
                </label>
                <span className={cn(
                  "text-[10px]",
                  isTitleIdeal ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                )}>
                  {titleLength} / 60 chars {isTitleIdeal ? "(Ideal)" : ""}
                </span>
              </div>
              <Input
                type="text"
                placeholder="e.g., Buy Custom Shoes Online | Premium Athletic Footwear"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="text-xs font-semibold h-9 rounded-xl border-neutral-200 dark:border-neutral-850"
              />
              <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-200", getLengthProgressColor(titleLength, 40, 60))}
                  style={{ width: `${Math.min(100, (titleLength / 60) * 100)}%` }}
                />
              </div>
            </div>

            {/* Meta Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <label className="text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-neutral-500" />
                  Meta Description
                </label>
                <span className={cn(
                  "text-[10px]",
                  isDescIdeal ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                )}>
                  {descLength} / 160 chars {isDescIdeal ? "(Ideal)" : ""}
                </span>
              </div>
              <Textarea
                placeholder="e.g., Order sneakers with free shipping at SimpLab. Explore our wide fit athletic sneakers designed for flat feet. Custom vegan walking shoes crafted with organic details."
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="text-xs font-semibold h-20 resize-none rounded-xl border-neutral-200 dark:border-neutral-850"
              />
              <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-200", getLengthProgressColor(descLength, 120, 160))}
                  style={{ width: `${Math.min(100, (descLength / 160) * 100)}%` }}
                />
              </div>
            </div>

            {/* H1 Heading */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                <Heading1 className="h-3.5 w-3.5 text-neutral-500" />
                H1 Main Page Header
              </label>
              <Input
                type="text"
                placeholder="e.g., Custom Shoes & Vegan Running Sneakers Store"
                value={h1Header}
                onChange={(e) => setH1Header(e.target.value)}
                className="text-xs font-semibold h-9 rounded-xl border-neutral-200 dark:border-neutral-850"
              />
            </div>

            {/* Body Copy Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <label className="text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                  <FileCheck className="h-3.5 w-3.5 text-neutral-500" />
                  Landing Page Copy (Body Content)
                </label>
                <span className={cn("text-[10px]", wordCount >= 300 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                  {wordCount} words {wordCount >= 300 ? "(Optimal)" : "(aim for > 300)"}
                </span>
              </div>
              <Textarea
                placeholder="Write your main article/landing page copy here. Make sure to naturally incorporate your selected target keywords. An ideal density prevents search engine penalties while maximizing matching query relevance."
                value={bodyContent}
                onChange={(e) => setBodyContent(e.target.value)}
                className="text-xs font-semibold h-40 resize-none rounded-xl border-neutral-200 dark:border-neutral-850"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Real-Time Audit Checklist & Keywords Panel ─── */}
      <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-950 text-left">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <FileCheck className="h-4.5 w-4.5 text-neutral-500" />
            Live SEO Audit & Checklist
          </CardTitle>
          <CardDescription>
            Yoast-style real-time content checks based on selected target keywords.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {selectedKeywords.length === 0 ? (
            <div className="flex items-center gap-2 p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 text-amber-700 text-xs font-bold dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Select keywords in the selector above to audit content keyword density.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Target Keyword Usage Status */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2">Target Keywords Usage</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {keywordStats.map((kw) => (
                    <div
                      key={kw.id}
                      className="p-3 rounded-xl border border-neutral-150 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/10 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200 block truncate max-w-[150px]">
                          {kw.name}
                        </span>
                        <span className="text-[9px] text-neutral-400 font-bold block mt-0.5">
                          {kw.count} matches
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <span className={cn(
                          "text-xs font-black px-2 py-0.5 rounded-md",
                          kw.density >= 1.0 && kw.density <= 3.5
                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                            : kw.count > 0
                              ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                              : "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500"
                        )}>
                          {kw.density}%
                        </span>
                        <span className="text-[8px] font-bold text-neutral-400 dark:text-neutral-500 block mt-1">Density</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall density progress bar */}
              <div className="p-3.5 rounded-xl border border-neutral-150 dark:border-neutral-800 bg-neutral-50/10 dark:bg-neutral-900/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-neutral-700 dark:text-neutral-300">Overall Keyword Density</span>
                  <span className={cn(
                    overallDensity >= 1.0 && overallDensity <= 3.5
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  )}>
                    {overallDensity}% {overallDensity >= 1.0 && overallDensity <= 3.5 ? "(Ideal: 1.0%–3.5%)" : ""}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (overallDensity / 4.0) * 100)}
                  className="h-1.5 bg-neutral-100 dark:bg-neutral-900"
                  // @ts-expect-error custom indicator color
                  indicatorClassName={overallDensity >= 1.0 && overallDensity <= 3.5 ? "bg-emerald-500" : "bg-amber-500"}
                />
                {densityWarning && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {densityWarning}
                  </p>
                )}
              </div>

              {/* Checklist list */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2">Audit Checklist</p>
                <div className="space-y-2">
                  {[
                    // Title length
                    {
                      label: "Meta Title Tag length optimal (40-60 characters)",
                      passed: isTitleIdeal,
                      pts: "12pts",
                    },
                    // Title keyword inclusion
                    {
                      label: "Target keyword included in Meta Title",
                      passed: hasKeywordInTitle,
                      pts: "13pts",
                    },
                    // Meta Description length
                    {
                      label: "Meta Description length optimal (120-160 characters)",
                      passed: isDescIdeal,
                      pts: "12pts",
                    },
                    // Meta Description keyword
                    {
                      label: "Target keyword included in Meta Description",
                      passed: hasKeywordInDesc,
                      pts: "13pts",
                    },
                    // H1 Header presence
                    {
                      label: "H1 Header entered",
                      passed: hasH1,
                      pts: "5pts",
                    },
                    // H1 keyword inclusion
                    {
                      label: "Target keyword included in H1 Header",
                      passed: hasKeywordInH1,
                      pts: "10pts",
                    },
                    // Word count
                    {
                      label: `Landing page copy word count optimal (> 300 words). Current: ${wordCount}`,
                      passed: wordCount >= 300,
                      pts: "15pts",
                    },
                    // Keyword density range check
                    {
                      label: "Overall Keyword Density is in the ideal range (1% - 3.5%)",
                      passed: overallDensity >= 1.0 && overallDensity <= 3.5,
                      pts: "20pts",
                    },
                  ].map((check, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg border border-neutral-100/50 dark:border-neutral-900/30"
                    >
                      <div className="flex items-center gap-2 text-left">
                        {check.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className={cn(
                          "font-semibold",
                          check.passed ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-450 dark:text-neutral-500"
                        )}>
                          {check.label}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md shrink-0 ml-4",
                        check.passed
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-neutral-50 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500"
                      )}>
                        {check.passed ? check.pts : "0pts"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default OnPageEditor
