import {
  ResponsiveContainer,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from "recharts"
import { cn } from "@/lib/utils"

export interface RadarDataPoint {
  subject: string
  student: number
  average: number
  fullMark: number
}

interface RadarChartProps {
  data: RadarDataPoint[]
  className?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color?: string
    payload: RadarDataPoint
  }>
}

export function RadarChart({ data, className }: RadarChartProps) {
  return (
    <div className={cn("w-full h-80 min-h-[300px]", className)}>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#cbd5e1" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#475569", fontSize: 11, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
          />
          <Radar
            name="Student Score"
            dataKey="student"
            stroke="#0f172a"
            fill="#0f172a"
            fillOpacity={0.15}
          />
          <Radar
            name="Class Average"
            dataKey="average"
            stroke="#94a3b8"
            fill="#94a3b8"
            fillOpacity={0.05}
          />
          <Tooltip
            content={(props: CustomTooltipProps) => {
              const { active, payload } = props
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-xs space-y-1">
                    <p className="font-bold text-slate-800">{payload[0].payload?.subject}</p>
                    {payload.map((p) => (
                      <p key={p.name} className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">{p.name}:</span>
                        <span className="font-bold text-slate-900">{p.value}</span>
                      </p>
                    ))}
                  </div>
                )
              }
              return null
            }}
          />
          <Legend verticalAlign="bottom" height={36} />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default RadarChart
