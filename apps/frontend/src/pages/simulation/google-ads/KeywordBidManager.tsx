import { useState } from "react"
import { useGoogleAdsStore, KEYWORD_POOL } from "@/stores/googleAdsStore"
import type { MatchType, CompetitionLevel } from "@/stores/googleAdsStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DollarSign, Plus, Minus, Trash2, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

const COMPETITION_STYLE: Record<CompetitionLevel, string> = {
  Low:    "bg-emerald-50 text-emerald-700",
  Medium: "bg-amber-50 text-amber-700",
  High:   "bg-red-50 text-red-700",
}

const MATCH_TYPES: MatchType[] = ["broad", "phrase", "exact"]

const MATCH_STYLE: Record<MatchType, string> = {
  broad:  "bg-sky-50 text-sky-700 border-sky-200",
  phrase: "bg-amber-50 text-amber-700 border-amber-200",
  exact:  "bg-emerald-50 text-emerald-700 border-emerald-200",
}

export function KeywordBidManager() {
  const {
    selectedKeywords,
    addKeyword, removeKeyword,
    updateBid, updateMatchType,
    dailyBudget,
    estimatedClicks,
  } = useGoogleAdsStore()

  // Local state for new-keyword default bid per row
  const [localBids, setLocalBids] = useState<Record<string, number>>(
    () => Object.fromEntries(KEYWORD_POOL.map((k) => [k.keyword, k.suggestedBid])),
  )
  const [localMatch, setLocalMatch] = useState<Record<string, MatchType>>(
    () => Object.fromEntries(KEYWORD_POOL.map((k) => [k.keyword, "broad" as MatchType])),
  )

  const selectedSet = new Set(selectedKeywords.map((k) => k.keyword))

  const estimatedDailySpend = selectedKeywords.reduce(
    (sum, k) => sum + k.bid,
    0,
  ) / Math.max(1, selectedKeywords.length) * estimatedClicks

  return (
    <Card className="border-neutral-200 shadow-sm bg-white text-left">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-neutral-500" />
            Keyword Bid Manager
          </span>
          <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
            {selectedKeywords.length} selected
          </span>
        </CardTitle>
        <CardDescription>
          Select keywords, set bids, and choose match types for your campaign.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Budget Impact */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 bg-neutral-50/50">
          <TrendingUp className="h-4 w-4 text-neutral-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Budget Impact</p>
            <p className="text-xs font-bold text-neutral-800 mt-0.5">
              Estimated daily spend:{" "}
              <span className="text-neutral-900 font-black">
                ${Math.min(dailyBudget, estimatedDailySpend).toFixed(2)}
              </span>
              <span className="text-neutral-400 font-normal ml-1">/ ${dailyBudget} budget</span>
            </p>
          </div>
        </div>

        {/* Selected Keywords — compact inline table */}
        {selectedKeywords.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Active Keywords ({selectedKeywords.length})
            </p>
            <div className="space-y-1.5">
              {selectedKeywords.map((kw) => (
                <div
                  key={kw.keyword}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                >
                  <p className="flex-1 text-xs font-bold text-neutral-800 truncate min-w-0">{kw.keyword}</p>

                  {/* Bid controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateBid(kw.keyword, parseFloat((kw.bid - 0.05).toFixed(2)))}
                      className="h-5 w-5 rounded border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-100 transition-colors"
                    >
                      <Minus className="h-2.5 w-2.5 text-neutral-600" />
                    </button>
                    <span className="text-xs font-black text-neutral-900 w-10 text-center">
                      ${kw.bid.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateBid(kw.keyword, parseFloat((kw.bid + 0.05).toFixed(2)))}
                      className="h-5 w-5 rounded border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-100 transition-colors"
                    >
                      <Plus className="h-2.5 w-2.5 text-neutral-600" />
                    </button>
                  </div>

                  {/* Match type */}
                  <select
                    value={kw.matchType}
                    onChange={(e) => updateMatchType(kw.keyword, e.target.value as MatchType)}
                    className={cn(
                      "text-[9px] font-bold border rounded-lg px-2 py-1 focus:outline-none capitalize shrink-0",
                      MATCH_STYLE[kw.matchType],
                    )}
                  >
                    {MATCH_TYPES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => removeKeyword(kw.keyword)}
                    className="text-neutral-300 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Keywords Table */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Available Keywords
          </p>
          <div className="rounded-xl border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50 border-neutral-200">
                    <TableHead className="text-[9px] text-neutral-500 font-black uppercase tracking-wider py-2">Keyword</TableHead>
                    <TableHead className="text-[9px] text-neutral-500 font-black uppercase tracking-wider py-2">Volume</TableHead>
                    <TableHead className="text-[9px] text-neutral-500 font-black uppercase tracking-wider py-2">Sugg. Bid</TableHead>
                    <TableHead className="text-[9px] text-neutral-500 font-black uppercase tracking-wider py-2">Comp.</TableHead>
                    <TableHead className="text-[9px] text-neutral-500 font-black uppercase tracking-wider py-2">Your Bid</TableHead>
                    <TableHead className="text-[9px] text-neutral-500 font-black uppercase tracking-wider py-2">Match</TableHead>
                    <TableHead className="text-[9px] text-neutral-500 font-black uppercase tracking-wider py-2"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {KEYWORD_POOL.map((kw) => {
                    const isSelected = selectedSet.has(kw.keyword)
                    return (
                      <TableRow
                        key={kw.keyword}
                        className={cn(
                          "border-neutral-100",
                          isSelected && "bg-neutral-50 opacity-60",
                        )}
                      >
                        <TableCell className="py-2">
                          <p className="text-[11px] font-semibold text-neutral-800 max-w-[140px] truncate">
                            {kw.keyword}
                          </p>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-[10px] font-bold text-neutral-600">
                            {kw.searchVolume.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-[10px] font-bold text-neutral-600">
                            ${kw.suggestedBid.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge className={cn("text-[9px] font-bold border-none px-1.5 py-0", COMPETITION_STYLE[kw.competition])}>
                            {kw.competition}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={isSelected}
                              onClick={() => setLocalBids((p) => ({ ...p, [kw.keyword]: Math.max(0.01, parseFloat((p[kw.keyword] - 0.05).toFixed(2))) }))}
                              className="h-4 w-4 rounded border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-100 disabled:opacity-30"
                            >
                              <Minus className="h-2 w-2" />
                            </button>
                            <span className="text-[10px] font-black w-9 text-center">
                              ${localBids[kw.keyword]?.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              disabled={isSelected}
                              onClick={() => setLocalBids((p) => ({ ...p, [kw.keyword]: parseFloat((p[kw.keyword] + 0.05).toFixed(2)) }))}
                              className="h-4 w-4 rounded border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-100 disabled:opacity-30"
                            >
                              <Plus className="h-2 w-2" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <select
                            value={localMatch[kw.keyword]}
                            disabled={isSelected}
                            onChange={(e) => setLocalMatch((p) => ({ ...p, [kw.keyword]: e.target.value as MatchType }))}
                            className="text-[9px] font-bold border border-neutral-200 rounded px-1.5 py-1 focus:outline-none disabled:opacity-30 bg-white"
                          >
                            {MATCH_TYPES.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="py-2">
                          <button
                            type="button"
                            disabled={isSelected}
                            onClick={() => addKeyword(kw.keyword, localBids[kw.keyword], localMatch[kw.keyword])}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all border",
                              isSelected
                                ? "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                : "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700",
                            )}
                          >
                            {isSelected ? "Added" : <><Plus className="h-2.5 w-2.5" />Add</>}
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default KeywordBidManager
