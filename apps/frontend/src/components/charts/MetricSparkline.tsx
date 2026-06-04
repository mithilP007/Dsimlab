import { ResponsiveContainer, AreaChart, Area } from "recharts"

interface MetricSparklineProps {
  data: number[]
  height?: number
  color?: string
}

export function MetricSparkline({
  data,
  height = 60,
  color = "#171717",
}: MetricSparklineProps) {
  const chartData = data.map((val, idx) => ({ id: idx, value: val }))

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id="rechartsSparklineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#rechartsSparklineGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
export default MetricSparkline
