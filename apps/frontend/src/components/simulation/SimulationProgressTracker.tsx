import { useLocation, Link } from "react-router"
import { Check, Info, Search, Target, Share2, Award } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const STEPS: Step[] = [
  { name: "Briefing", href: "/simulation/briefing", icon: Info },
  { name: "SEO", href: "/simulation/seo", icon: Search },
  { name: "Google Ads", href: "/simulation/google-ads", icon: Target },
  { name: "Meta Ads", href: "/simulation/meta-ads", icon: Share2 },
  { name: "Results Summary", href: "/simulation/results", icon: Award },
]

export function SimulationProgressTracker() {
  const location = useLocation()
  
  const getStepIndex = (pathname: string) => {
    return STEPS.findIndex(s => pathname.startsWith(s.href))
  }

  const currentStepIndex = getStepIndex(location.pathname)

  return (
    <div className="w-full bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm mb-6">
      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
        
        {/* Connection Line (Desktop) */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-neutral-100 hidden md:block z-0" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-600 transition-all duration-500 hidden md:block z-0" 
          style={{ width: `${(Math.max(0, currentStepIndex) / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, idx) => {
          const Icon = step.icon
          const isCompleted = idx < currentStepIndex
          const isActive = idx === currentStepIndex
          
          return (
            <div 
              key={step.name}
              className={cn(
                "relative flex items-center md:flex-col gap-3 md:gap-2 z-10 w-full md:w-auto",
                isActive ? "text-indigo-600" : isCompleted ? "text-neutral-900" : "text-neutral-400"
              )}
            >
              {/* Node Circle */}
              <Link 
                to={step.href}
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0",
                  isCompleted 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" 
                    : isActive 
                      ? "bg-white border-indigo-600 text-indigo-600 ring-4 ring-indigo-50 shadow-inner" 
                      : "bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 stroke-[2.5px]" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </Link>

              {/* Step Label */}
              <div className="text-left md:text-center flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 leading-none">
                  Step {idx + 1}
                </span>
                <span className={cn(
                  "text-xs font-bold mt-1 leading-none",
                  isActive ? "text-indigo-600 font-extrabold" : "text-neutral-600"
                )}>
                  {step.name}
                </span>
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}
export default SimulationProgressTracker;
