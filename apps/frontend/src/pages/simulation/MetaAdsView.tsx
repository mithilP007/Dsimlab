import { useSimulationStore } from "@/stores/simulationStore"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Save, Share2 } from "lucide-react"
import { toast } from "sonner"

export function MetaAdsView() {
  const { saveDecisions, decisionsSaved } = useSimulationStore()

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    saveDecisions()
    toast.success("Meta Social Ads decisions saved successfully!")
  }

  return (
    <Card className="border-neutral-200 shadow-sm bg-white">
      <CardHeader>
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
          <Share2 className="h-4.5 w-4.5 text-neutral-600" />
          <span>Meta Social Ads Campaign</span>
        </CardTitle>
        <CardDescription>
          Optimize your Meta Social target demographic parameters and daily media placements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-600">Daily Campaign Budget ($)</label>
            <Input type="number" defaultValue="200" min="1" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-600">Target Demographic Audience</label>
            <Input defaultValue="Adults 18-35, Fitness Enthusiasts" placeholder="Enter target descriptors..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-600">Primary Ad Placements</label>
            <Input defaultValue="Instagram Story, Facebook Feed" placeholder="Enter placements..." />
          </div>
          <Button type="submit" disabled={decisionsSaved} className="h-9 text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800">
            <Save className="mr-1.5 h-4 w-4" />
            {decisionsSaved ? "Decisions Saved" : "Save Meta Ads Decisions"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default MetaAdsView
