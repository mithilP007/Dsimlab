import { useSimulationStore } from "@/stores/simulationStore"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Save, Search } from "lucide-react"
import { toast } from "sonner"

export function SeoCampaignView() {
  const { saveDecisions, decisionsSaved } = useSimulationStore()

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    saveDecisions()
    toast.success("SEO decisions saved successfully!")
  }

  return (
    <Card className="border-neutral-200 shadow-sm bg-white">
      <CardHeader>
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
          <Search className="h-4.5 w-4.5 text-neutral-600" />
          <span>SEO Optimization Campaign</span>
        </CardTitle>
        <CardDescription>
          Optimize your organic search index rankings by managing organic keywords and page indexing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-600">Target Organic Keywords</label>
            <Input defaultValue="buy shoes, running shoes, athletic footwear" placeholder="Enter keywords separated by commas..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-600">Pages to Optimize</label>
            <Input type="number" defaultValue="5" min="1" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-600">Monthly Backlink Acquisition Target</label>
            <Input type="number" defaultValue="10" min="1" />
          </div>
          <Button type="submit" disabled={decisionsSaved} className="h-9 text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800">
            <Save className="mr-1.5 h-4 w-4" />
            {decisionsSaved ? "Decisions Saved" : "Save SEO Decisions"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default SeoCampaignView
