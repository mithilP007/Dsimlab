import { useState, useEffect } from "react"
import { useResultsStore } from "@/stores/resultsStore"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import { ArrowUp, ArrowDown, ChevronsUpDown, ChevronLeft, ChevronRight, Star } from "lucide-react"
import { cn } from "@/lib/utils"

type SortField = "keyword" | "volume" | "position" | "previousPosition" | "change"
type SortOrder = "asc" | "desc"

export function RankingReport() {
  const { keywordRankings } = useResultsStore()
  const [isLoading, setIsLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>("position")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <Card className="border-neutral-200 bg-white shadow-xs p-6 space-y-4 text-left">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-60" />
        <div className="space-y-2.5 pt-4">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={idx} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  // Position color helper
  const getPositionBadge = (pos: number) => {
    if (pos <= 3) {
      return (
        <span className="flex items-center gap-1.5 justify-center">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-black text-emerald-600">#{pos}</span>
        </span>
      )
    }
    if (pos <= 10) {
      return (
        <span className="flex items-center gap-1.5 justify-center">
          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
          <span className="font-black text-amber-600">#{pos}</span>
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1.5 justify-center">
        <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
        <span className="font-black text-rose-600">#{pos}</span>
      </span>
    )
  }

  // sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const sortedRankings = [...keywordRankings].sort((a, b) => {
    let aVal: string | number = 0
    let bVal: string | number = 0

    if (sortField === "keyword") {
      aVal = a.keyword
      bVal = b.keyword
    } else if (sortField === "volume") {
      aVal = a.volume
      bVal = b.volume
    } else if (sortField === "position") {
      aVal = a.position
      bVal = b.position
    } else if (sortField === "previousPosition") {
      aVal = a.previousPosition
      bVal = b.previousPosition
    } else if (sortField === "change") {
      aVal = a.change
      bVal = b.change
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
    return 0
  })

  // Pagination bounds
  const itemsPerPage = 10
  const totalPages = Math.ceil(sortedRankings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedRankings = sortedRankings.slice(startIndex, startIndex + itemsPerPage)

  return (
    <Card className="border-neutral-200 shadow-sm rounded-2xl overflow-hidden bg-white text-left">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-base font-black text-neutral-900 flex items-center gap-2">
          Keyword Rankings
        </CardTitle>
        <CardDescription className="text-xs text-neutral-500">
          Track organic keyword positions, search volume, round changes, and rank trends.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-50 hover:bg-neutral-50 border-neutral-100">
              <TableHead className="font-bold text-[10px] text-neutral-400 uppercase tracking-wider pl-6">
                <button
                  onClick={() => handleSort("keyword")}
                  className="flex items-center gap-1 hover:text-neutral-900 font-bold"
                >
                  Keyword <ChevronsUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-right font-bold text-[10px] text-neutral-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("volume")}
                  className="flex items-center gap-1 ml-auto hover:text-neutral-900 font-bold"
                >
                  Search Volume <ChevronsUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-center font-bold text-[10px] text-neutral-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("position")}
                  className="flex items-center gap-1 mx-auto hover:text-neutral-900 font-bold"
                >
                  Current Pos <ChevronsUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-center font-bold text-[10px] text-neutral-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("previousPosition")}
                  className="flex items-center gap-1 mx-auto hover:text-neutral-900 font-bold"
                >
                  Previous Pos <ChevronsUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-center font-bold text-[10px] text-neutral-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("change")}
                  className="flex items-center gap-1 mx-auto hover:text-neutral-900 font-bold"
                >
                  Change <ChevronsUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-center font-bold text-[10px] text-neutral-400 uppercase tracking-wider">
                Rank Badge
              </TableHead>
              <TableHead className="text-center font-bold text-[10px] text-neutral-400 uppercase tracking-wider pr-6">
                Trend (5 Rounds)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRankings.map((rk) => {
              const isTop3 = rk.position <= 3
              const changedUp = rk.change > 0
              const changedDown = rk.change < 0

              // Map trend for Sparkline
              const sparkData = rk.trend.map((val, i) => ({ val, index: i }))

              return (
                <TableRow
                  key={rk.keyword}
                  className={cn(
                    "border-neutral-100 transition-colors",
                    isTop3 ? "bg-emerald-50/20 hover:bg-emerald-50/30" : "hover:bg-neutral-50/50"
                  )}
                >
                  {/* Keyword name */}
                  <TableCell className="py-3.5 pl-6">
                    <div className="flex items-center gap-2">
                      {isTop3 && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                      <span className={cn("text-xs font-semibold text-neutral-850", isTop3 && "font-black text-neutral-950")}>
                        {rk.keyword}
                      </span>
                    </div>
                  </TableCell>

                  {/* Volume */}
                  <TableCell className="text-right py-3.5 text-xs text-neutral-600 font-medium">
                    {rk.volume.toLocaleString()}
                  </TableCell>

                  {/* Current Position */}
                  <TableCell className="text-center py-3.5 text-xs font-bold">
                    {getPositionBadge(rk.position)}
                  </TableCell>

                  {/* Previous Position */}
                  <TableCell className="text-center py-3.5 text-xs text-neutral-400 font-medium">
                    #{rk.previousPosition}
                  </TableCell>

                  {/* Change */}
                  <TableCell className="text-center py-3.5 text-xs">
                    <span className={cn(
                      "font-black flex items-center justify-center gap-0.5",
                      changedUp && "text-emerald-600",
                      changedDown && "text-rose-600",
                      rk.change === 0 && "text-neutral-400"
                    )}>
                      {changedUp && <ArrowUp className="h-3.5 w-3.5" />}
                      {changedDown && <ArrowDown className="h-3.5 w-3.5" />}
                      {rk.change !== 0 ? Math.abs(rk.change) : "-"}
                    </span>
                  </TableCell>

                  {/* Improved / Declined Badge */}
                  <TableCell className="text-center py-3.5">
                    {changedUp && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-250 font-bold text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full">
                        Improved
                      </Badge>
                    )}
                    {changedDown && (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-250 font-bold text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full">
                        Declined
                      </Badge>
                    )}
                    {rk.change === 0 && (
                      <span className="text-[10px] text-neutral-400 font-bold">-</span>
                    )}
                  </TableCell>

                  {/* Trend sparkline */}
                  <TableCell className="text-center py-3.5 pr-6 w-28">
                    <div className="h-6 w-20 mx-auto">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData}>
                          <Line
                            type="monotone"
                            dataKey="val"
                            stroke={isTop3 ? "#22c55e" : "#64748b"}
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {/* Pagination controls */}
        <div className="p-4 border-t border-neutral-100 flex items-center justify-between gap-4">
          <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 text-xs font-bold"
            >
              <ChevronLeft className="h-4 w-4 mr-0.5" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(2)}
              disabled={currentPage === 2}
              className="h-8 text-xs font-bold"
            >
              Next <ChevronRight className="h-4 w-4 ml-0.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default RankingReport
