import { useSimulationStore } from "@/stores/simulationStore"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Save, Target } from "lucide-react"
import { toast } from "sonner"

export function GoogleAdsView() {
  const { saveDecisions, decisionsSaved } = useSimulationStore()

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    saveDecisions()
    toast.success("Google Ads decisions saved successfully!")
  }

  return (
    <Card className="border-neutral-200 shadow-sm bg-white">
      <CardHeader>
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
          <Target className="h-4.5 w-4.5 text-neutral-600" />
          <span>Google Ads CPC Campaign</span>
        </CardTitle>
        <CardDescription>
          Configure pay-per-click target keyword keywords, maximum cost-per-click bids, and campaign budgets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-600">Daily Campaign Budget ($)</label>
            <Input type="number" defaultValue="150" min="1" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-600">Target PPC Keywords</label>
            <Input defaultValue="discount sneakers, running sneakers, walking shoes" placeholder="Enter keywords..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-600">Max CPC Bid Limit ($)</label>
            <Input type="number" step="0.01" defaultValue="1.50" min="0.01" />
          </div>
          <Button type="submit" disabled={decisionsSaved} className="h-9 text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800">
            <Save className="mr-1.5 h-4 w-4" />
            {decisionsSaved ? "Decisions Saved" : "Save Google Ads Decisions"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default GoogleAdsView
