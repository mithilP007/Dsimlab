import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Dashboard</h2>
      <Card>
        <CardHeader>
          <CardTitle>Simulation Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-600">
            Configure your campaigns and begin the simulation rounds to see performance metrics here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
