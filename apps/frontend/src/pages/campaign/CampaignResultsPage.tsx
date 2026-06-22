import { useEffect } from "react";
import { useParams, Link } from "react-router";
import { useDailyCampaignStore } from "@/stores/dailyCampaignStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  RefreshCw, AlertTriangle, Lightbulb 
} from "lucide-react";

export function CampaignResultsPage() {
  const { dayNumber } = useParams<{ dayNumber: string }>();
  const { activeRun, results, recommendations, fetchState, fetchResults, fetchRecommendations } = useDailyCampaignStore();

  const targetDay = parseInt(dayNumber || "1");

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (activeRun) {
      fetchResults(activeRun.id);
      fetchRecommendations(activeRun.id, targetDay);
    }
  }, [activeRun, targetDay, fetchResults, fetchRecommendations]);

  const result = results.find(r => r.dayNumber === targetDay);

  if (!activeRun || !result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
        <span className="text-sm text-neutral-500 font-bold">Loading Day {targetDay} results...</span>
      </div>
    );
  }

  const isFallback = result.trendSnapshot?.source === "FALLBACK";

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 text-left animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link to="/campaign">
            <Button variant="outline" size="icon" className="rounded-full border-neutral-200">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Day {targetDay} Performance Report
            </h1>
            <p className="text-xs text-neutral-500 font-semibold mt-0.5">
              Simulated 24-hour campaign execution results
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isFallback && (
            <Badge className="bg-amber-50 text-amber-800 border border-amber-200 font-black px-3.5 py-1 rounded-full text-[10px] uppercase flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Fallback Data Source
            </Badge>
          )}
          <Badge className="bg-indigo-50 text-indigo-800 border border-indigo-200 font-black px-3.5 py-1 rounded-full text-[10px] uppercase">
            Score: {result.compositeScore.toFixed(1)}%
          </Badge>
        </div>
      </div>

      {/* Fallback Banner */}
      {isFallback && (
        <Card className="bg-amber-50 border-amber-200 p-4 flex items-start gap-3 rounded-2xl text-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed font-semibold">
            <span className="font-bold">Offline Trend Ingestion Mode:</span> Local deterministic data was simulated for this day because external real-time trend services did not respond. Confidence score adjusted to {Math.round((result.trendSnapshot?.confidenceScore || 0.5) * 100)}%.
          </div>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Impressions", value: result.impressions.toLocaleString(), desc: "Ad exposure & SEO impressions" },
          { label: "Total Clicks", value: result.clicks.toLocaleString(), desc: "Store landing page traffic" },
          { label: "Conversions", value: result.conversions.toLocaleString(), desc: "Successful sales closed" },
          { label: "Net Revenue", value: `$${result.revenue.toLocaleString()}`, desc: "Financial returns yield" },
          { label: "Ad Spend", value: `$${result.spend.toLocaleString()}`, desc: "SEO + Google + Meta cost" },
          { label: "ROAS Score", value: `${result.roas.toFixed(2)}x`, desc: "Return on advertising spend" },
          { label: "Cost Per Click (CPC)", value: `$${result.cpc.toFixed(2)}`, desc: "Average click expense" },
          { label: "Cost Per Acquisition (CPA)", value: `$${result.cpa.toFixed(2)}`, desc: "Sales acquisition cost" },
        ].map((stat, idx) => (
          <Card key={idx} className="p-4 bg-white border-neutral-200/80 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">{stat.label}</span>
            <div className="text-xl font-black text-neutral-800 mt-1">{stat.value}</div>
            <span className="text-[9px] text-neutral-400 mt-2 font-bold block">{stat.desc}</span>
          </Card>
        ))}
      </div>

      {/* Platform Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* SEO */}
        <Card className="p-6 bg-white border-neutral-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-neutral-800 border-b border-neutral-100 pb-2 flex items-center justify-between">
            <span>Organic Search (SEO)</span>
            <Badge className="bg-neutral-100 text-neutral-700 border-none font-bold text-[9px]">
              Score: {result.seoScore.toFixed(0)}
            </Badge>
          </h3>
          <div className="space-y-3 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-neutral-500">Organic Traffic</span>
              <span className="text-neutral-800 font-bold">{result.seoTraffic} Clicks</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Average SEO Rank</span>
              <span className="text-neutral-800 font-bold">Pos #{result.seoRank || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Domain Authority</span>
              <span className="text-neutral-800 font-bold">{result.authorityScore.toFixed(1)} DA</span>
            </div>
          </div>
        </Card>

        {/* Google Ads */}
        <Card className="p-6 bg-white border-neutral-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-neutral-800 border-b border-neutral-100 pb-2 flex items-center justify-between">
            <span>Google Paid Ads</span>
            <Badge className="bg-neutral-100 text-neutral-700 border-none font-bold text-[9px]">
              Score: {result.googleAdsScore.toFixed(0)}
            </Badge>
          </h3>
          <div className="space-y-3 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-neutral-500">Google CTR</span>
              <span className="text-neutral-800 font-bold">
                {result.ctr > 0 ? (result.ctr * 100).toFixed(2) : "0.00"}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Cost Paced</span>
              <span className="text-neutral-800 font-bold">${result.spend.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Google Conversions</span>
              <span className="text-neutral-800 font-bold">{result.conversions} Sales</span>
            </div>
          </div>
        </Card>

        {/* Meta Ads */}
        <Card className="p-6 bg-white border-neutral-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-neutral-800 border-b border-neutral-100 pb-2 flex items-center justify-between">
            <span>Meta Paid Social</span>
            <Badge className="bg-neutral-100 text-neutral-700 border-none font-bold text-[9px]">
              Score: {result.metaAdsScore.toFixed(0)}
            </Badge>
          </h3>
          <div className="space-y-3 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-neutral-500">Meta Reach</span>
              <span className="text-neutral-800 font-bold">{result.metaReach.toLocaleString()} users</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Engagements</span>
              <span className="text-neutral-800 font-bold">{result.metaEngagement.toLocaleString()} clicks</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Meta conversions</span>
              <span className="text-neutral-800 font-bold">{result.conversions} Sales</span>
            </div>
          </div>
        </Card>

      </div>

      {/* Tomorrow Action Recommendations */}
      <Card className="p-6 bg-neutral-900 border border-neutral-800 shadow-lg text-white space-y-4 rounded-3xl">
        <h3 className="text-sm font-black flex items-center gap-2 border-b border-neutral-800 pb-3">
          <Lightbulb className="h-4.5 w-4.5 text-indigo-400" />
          Recommended Actions for Tomorrow
        </h3>

        {recommendations.length === 0 ? (
          <p className="text-xs text-neutral-400 font-semibold">
            No recommendations generated. Your campaign is performing perfectly.
          </p>
        ) : (
          <div className="space-y-3.5">
            {recommendations.map(rec => (
              <div key={rec.id} className="p-3.5 bg-neutral-800/60 rounded-2xl border border-neutral-800 flex items-start gap-3">
                <Badge className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-lg border-none shrink-0 ${
                  rec.priority === "HIGH" ? "bg-rose-500 text-white" : "bg-indigo-500 text-white"
                }`}>
                  {rec.priority}
                </Badge>
                <div className="text-xs space-y-1 font-semibold leading-relaxed">
                  <div className="text-neutral-200">{rec.message}</div>
                  <div className="text-[10px] text-indigo-400 font-bold">Impact: {rec.expectedImpact}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

    </div>
  );
}
export default CampaignResultsPage;
