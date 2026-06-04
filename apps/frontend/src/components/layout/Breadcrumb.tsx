import { Link, useLocation } from "react-router"
import { ChevronRight, Home } from "lucide-react"

export function Breadcrumb() {
  const location = useLocation()
  const pathnames = location.pathname.split("/").filter((x) => x)

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm text-neutral-500 font-medium">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-neutral-900 transition-colors duration-200"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join("/")}`
        const isLast = index === pathnames.length - 1
        const label = value.charAt(0).toUpperCase() + value.slice(1).replace("-", " ")

        return (
          <div key={to} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-neutral-300 mx-1 shrink-0" />
            {isLast ? (
              <span className="text-neutral-900 font-semibold truncate max-w-[120px] sm:max-w-none">
                {label}
              </span>
            ) : (
              <Link
                to={to}
                className="hover:text-neutral-900 transition-colors duration-200 truncate max-w-[120px] sm:max-w-none"
              >
                {label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
