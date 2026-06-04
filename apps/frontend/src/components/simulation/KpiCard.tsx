import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string | number
  description?: string
  trend?: string // e.g. "+10%", "-4%"
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}

export function KpiCard({
  title,
  value,
  description,
  trend,
  icon: Icon,
  className,
}: KpiCardProps) {
  const isPositive = trend?.startsWith("+")
  const isNegative = trend?.startsWith("-")

  return (
    <Card className={cn("border-neutral-200 shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-neutral-450 shrink-0" />}
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-black text-neutral-900 tracking-tight">
          {value}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          {trend && (
            <span
              className={cn(
                "font-bold",
                isPositive && "text-emerald-600",
                isNegative && "text-red-500"
              )}
            >
              {trend}
            </span>
          )}
          {description && <span className="text-neutral-450 font-semibold">{description}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
export default KpiCard
