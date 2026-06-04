import { HelpCircle, ShieldCheck } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-white border-t border-neutral-200/80 px-6 py-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-neutral-400">
        
        {/* Brand and Version */}
        <div className="flex items-center gap-2">
          <span className="h-5 w-5 bg-neutral-900 text-white flex items-center justify-center rounded text-[10px] font-black">
            S
          </span>
          <span className="text-neutral-600 font-bold">SimpLab Console</span>
          <span>•</span>
          <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-[10px] text-neutral-500 font-mono">
            v1.4.2-stable
          </span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a
            href="https://simplab.io/help"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-indigo-600 flex items-center gap-1 transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Help Center</span>
          </a>
          <a
            href="https://simplab.io/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-indigo-600 transition-colors"
          >
            Terms of Service
          </a>
          <a
            href="https://simplab.io/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-indigo-600 transition-colors"
          >
            Privacy Policy
          </a>
        </div>

        {/* System Status / Copyright */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-100">
            <ShieldCheck className="h-3 w-3" />
            <span>System Status: Operational</span>
          </div>
          <span>&copy; {currentYear} SimpLab, Inc.</span>
        </div>

      </div>
    </footer>
  )
}

export default Footer
