import { useState } from "react"
import { useCampaignStore, AVAILABLE_KEYWORDS } from "@/stores/campaignStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type CategoryFilter = "All" | "High Intent" | "Informational" | "Branded" | "Long-tail"

const CATEGORY_TABS: CategoryFilter[] = ["All", "High Intent", "Informational", "Branded", "Long-tail"]

function DifficultyBar({ value }: { value: number }) {
  const color =
    value <= 33
      ? "bg-emerald-500"
      : value <= 66
        ? "bg-amber-500"
        : "bg-red-500"

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-20 rounded-full bg-neutral-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[9px] font-bold",
          value <= 33 ? "text-emerald-600" : value <= 66 ? "text-amber-600" : "text-red-600",
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function KeywordSelector() {
  const { selectedKeywords, toggleKeyword } = useCampaignStore()
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("All")

  const filtered =
    activeFilter === "All"
      ? AVAILABLE_KEYWORDS
      : AVAILABLE_KEYWORDS.filter((kw) => kw.category === activeFilter)

  const selectedItems = AVAILABLE_KEYWORDS.filter((kw) =>
    selectedKeywords.includes(kw.id),
  )

  const isMaxed = selectedKeywords.length >= 10

  return (
    <Card className="border-neutral-200 shadow-sm bg-white text-left flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 text-neutral-500" />
            Keyword Selector
          </span>
          <span
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              isMaxed
                ? "bg-red-50 text-red-600"
                : "bg-neutral-100 text-neutral-600",
            )}
          >
            {selectedKeywords.length} / 10
          </span>
        </CardTitle>
        <CardDescription>
          Select up to 10 keywords. Difficulty bar: green = easy, amber = medium, red = hard.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1 overflow-hidden">
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveFilter(cat)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border",
                activeFilter === cat
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400 hover:text-neutral-700",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Selected Keywords Chips */}
        {selectedItems.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Selected Keywords
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedItems.map((kw) => (
                <button
                  key={kw.id}
                  type="button"
                  onClick={() => toggleKeyword(kw.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 text-white text-[10px] font-bold transition-all hover:bg-neutral-700"
                >
                  {kw.name}
                  <X className="h-2.5 w-2.5 ml-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Available Keyword List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 max-h-72">
          {filtered.map((kw) => {
            const isSelected = selectedKeywords.includes(kw.id)
            const isDisabled = !isSelected && isMaxed
            return (
              <div
                key={kw.id}
                onClick={() => !isDisabled && toggleKeyword(kw.id)}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer",
                  isSelected
                    ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                    : isDisabled
                      ? "border-neutral-100 bg-neutral-50/50 cursor-not-allowed opacity-50"
                      : "border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-800 truncate">
                      {kw.name}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-neutral-500 font-semibold">
                        Vol: {kw.searchVolume.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-semibold">
                        CPC: ${kw.cpc.toFixed(2)}
                      </span>
                    </div>
                    <DifficultyBar value={kw.difficulty} />
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge
                      className={cn(
                        "text-[9px] font-bold border-none px-1.5 py-0",
                        kw.category === "High Intent" && "bg-violet-50 text-violet-700",
                        kw.category === "Informational" && "bg-sky-50 text-sky-700",
                        kw.category === "Branded" && "bg-emerald-50 text-emerald-700",
                        kw.category === "Long-tail" && "bg-amber-50 text-amber-700",
                      )}
                    >
                      {kw.category}
                    </Badge>
                    <div
                      className={cn(
                        "h-4 w-4 rounded-full border flex items-center justify-center transition-all",
                        isSelected
                          ? "border-neutral-900 bg-neutral-900"
                          : "border-neutral-300 bg-white",
                      )}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 text-white stroke-[3px]" />}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default KeywordSelector
