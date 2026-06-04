import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  className?: string
  fullscreen?: boolean
  label?: string
}

export function LoadingSpinner({
  className,
  fullscreen = false,
  label = "Loading platform metrics...",
}: LoadingSpinnerProps) {
  const spinnerElement = (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* Premium custom double ring loading spinner */}
      <div className="relative h-12 w-12 flex items-center justify-center">
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-indigo-600/20 border-t-indigo-600 animate-spin" />
        {/* Inner Ring (Pulsing / counter-spin) */}
        <div className="absolute h-8 w-8 rounded-full border-4 border-blue-500/10 border-b-blue-500 animate-spin-reverse" />
        {/* Core emblem */}
        <span className="text-[10px] font-black text-indigo-700 animate-pulse uppercase tracking-widest select-none">
          S
        </span>
      </div>
      
      {label && (
        <span className="text-xs font-bold text-neutral-400 tracking-wider uppercase animate-pulse">
          {label}
        </span>
      )}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-300">
        {spinnerElement}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      {spinnerElement}
    </div>
  )
}

export default LoadingSpinner
