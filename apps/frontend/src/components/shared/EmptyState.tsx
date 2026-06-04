import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  actionText?: string
  onAction?: () => void
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border-2 border-dashed border-neutral-200 rounded-xl bg-white space-y-4">
      {/* Icon Wrapper */}
      <div className="h-12 w-12 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-100">
        <Icon className="h-5 w-5" />
      </div>

      {/* Description Text */}
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-bold text-neutral-900">{title}</h3>
        <p className="text-xs text-neutral-500 font-medium leading-relaxed">
          {description}
        </p>
      </div>

      {/* Optional Call to Action */}
      {actionText && onAction && (
        <div className="pt-2">
          <Button
            size="sm"
            onClick={onAction}
            className="h-9 font-semibold text-xs bg-neutral-950 text-white hover:bg-neutral-800 shadow-sm"
          >
            {actionText}
          </Button>
        </div>
      )}
    </div>
  )
}
export default EmptyState
