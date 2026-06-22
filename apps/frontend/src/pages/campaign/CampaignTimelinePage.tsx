import { useEffect } from "react";
import { Link } from "react-router";
import { useDailyCampaignStore } from "@/stores/dailyCampaignStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, CheckCircle2, Lock, Play } from "lucide-react";

export function CampaignTimelinePage() {
  const { activeRun, results, fetchState, fetchResults } = useDailyCampaignStore();

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (activeRun) {
      fetchResults(activeRun.id);
    }
  }, [activeRun, fetchResults]);

  if (!activeRun) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const currentDay = activeRun.currentDay;
  const totalDays = activeRun.durationDays;

  // Build array of days
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6 text-left animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-neutral-200 pb-5">
        <Link to="/campaign">
          <Button variant="outline" size="icon" className="rounded-full border-neutral-200">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Campaign Timeline Tracker
          </h1>
          <p className="text-xs text-neutral-500 font-semibold mt-0.5">
            Track day-wise decisions and simulated results
          </p>
        </div>
      </div>

      {/* Timeline List */}
      <div className="relative border-l border-neutral-200 pl-6 ml-3 space-y-6">
        {daysArray.map(day => {
          const result = results.find(r => r.dayNumber === day);
          const isToday = day === currentDay;
          const isPast = day < currentDay;
          const isFuture = day > currentDay;

          return (
            <div key={day} className="relative">
              {/* Marker Icon */}
              <span className={`absolute -left-[35px] top-1.5 flex items-center justify-center rounded-full w-[18px] h-[18px] border-2 bg-white ${
                isPast 
                  ? "border-emerald-500 text-emerald-500"
                  : isToday
                    ? "border-indigo-600 text-indigo-600 animate-pulse"
                    : "border-neutral-300 text-neutral-300"
              }`}>
                {isPast ? (
                  <CheckCircle2 className="h-3.5 w-3.5 fill-emerald-50 text-emerald-500" />
                ) : isToday ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                ) : (
                  <Lock className="h-2.5 w-2.5" />
                )}
              </span>

              <Card className={`p-5 bg-white border-neutral-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-neutral-300 ${
                isToday ? "border-indigo-400 ring-1 ring-indigo-100" : ""
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-neutral-800">Day {day}</span>
                    {isToday && (
                      <Badge className="bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold px-2 py-0.5 text-[8px] uppercase">
                        Today
                      </Badge>
                    )}
                    {isPast && (
                      <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 text-[8px] uppercase">
                        Completed
                      </Badge>
                    )}
                    {isFuture && (
                      <Badge className="bg-neutral-50 text-neutral-400 border border-neutral-200 font-bold px-2 py-0.5 text-[8px] uppercase">
                        Locked
                      </Badge>
                    )}
                  </div>

                  {result ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-neutral-500 pt-1">
                      <span>Score: <strong className="text-neutral-800">{result.compositeScore.toFixed(0)}%</strong></span>
                      <span>Spend: <strong className="text-neutral-800">${result.spend.toFixed(0)}</strong></span>
                      <span>Revenue: <strong className="text-neutral-800">${result.revenue.toFixed(0)}</strong></span>
                      <span>ROAS: <strong className="text-neutral-800">{result.roas.toFixed(2)}x</strong></span>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 font-semibold pt-1">
                      {isToday ? "Configure and submit decisions to process." : "Awaiting processing."}
                    </p>
                  )}
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  {isPast && (
                    <Link to={`/campaign/results/day/${day}`}>
                      <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs font-bold h-8 border-neutral-200 rounded-xl">
                        View Report
                      </Button>
                    </Link>
                  )}

                  {isToday && activeRun.status === "ACTIVE" && (
                    <Link to={`/campaign/day/${day}`}>
                      <Button size="sm" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-8 rounded-xl flex items-center justify-center gap-1">
                        Configure Settings
                        <Play className="h-3 w-3 fill-white" />
                      </Button>
                    </Link>
                  )}

                  {isFuture && (
                    <Button size="sm" disabled className="w-full sm:w-auto text-xs font-bold h-8 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400">
                      Locked
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>

    </div>
  );
}
export default CampaignTimelinePage;
