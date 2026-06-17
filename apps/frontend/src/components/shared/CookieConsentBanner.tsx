import { useState, useEffect } from "react"
import { Shield, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link } from "react-router"

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem("simlab_cookie_consent")
    if (!consent) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem("simlab_cookie_consent", "accepted")
    setIsVisible(false)
  };

  const handleDecline = () => {
    localStorage.setItem("simlab_cookie_consent", "declined")
    setIsVisible(false)
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-2xl z-50 animate-in slide-in-from-bottom-5 duration-300 flex gap-4">
      <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
        <Shield className="h-5 w-5" />
      </div>

      <div className="space-y-3 flex-1">
        <div className="flex items-start justify-between">
          <h4 className="text-xs font-black text-neutral-900 tracking-tight">Cookie Compliance Consent</h4>
          <button onClick={() => setIsVisible(false)} className="text-neutral-450 hover:text-neutral-600 p-0.5 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] font-semibold text-neutral-500 leading-normal">
          SimLab utilizes session tokens, security checkers, and performance parameters. 
          For compliance details, review our <Link to="/privacy" className="text-indigo-600 underline font-bold">Privacy Policy</Link>.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <Button onClick={handleDecline} variant="ghost" size="sm" className="text-[10px] font-bold h-7 px-3 text-neutral-500 hover:bg-neutral-50">
            Decline
          </Button>
          <Button onClick={handleAccept} size="sm" className="text-[10px] font-bold h-7 px-4 bg-neutral-900 hover:bg-neutral-850 text-white rounded-lg shadow-sm">
            Accept Cookies
          </Button>
        </div>
      </div>
    </div>
  )
}
export default CookieConsentBanner
