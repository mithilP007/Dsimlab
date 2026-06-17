import { useState, useEffect } from "react"
import { useParams, Link } from "react-router"
import { useCertificationStore } from "@/stores/certificationStore"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ShieldCheck, ShieldAlert, Award, Calendar, Landmark,
  ShieldX, Clock, AlertTriangle, ExternalLink
} from "lucide-react"

export function PublicVerificationPage() {
  const { verificationId } = useParams<{ verificationId: string }>()
  const { verifyCertificate } = useCertificationStore()

  // Local States
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (verificationId) {
      setLoading(true)
      verifyCertificate(verificationId)
        .then((data) => {
          setResult(data)
          setLoading(false)
        })
        .catch((err) => {
          console.error("Failed to run public verification:", err)
          setLoading(false)
        })
    }
  }, [verificationId])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center gap-4 px-4">
        <ShieldCheck className="h-12 w-12 text-indigo-600 animate-pulse" />
        <span className="text-sm text-neutral-500 font-bold">Executing Cryptographic Verification...</span>
      </div>
    )
  }

  // Determine verification state indicators
  const isInvalid = !result || result.valid === false || result.status === 'INVALID'
  const isExpired = result?.status === 'EXPIRED'
  const isRevoked = result?.status === 'REVOKED'
  const isVerified = result?.valid === true && result?.status === 'VERIFIED'

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      
      {/* Brand logo in public header */}
      <div className="flex items-center gap-2.5 mb-8 animate-in fade-in duration-300 select-none">
        <div className="h-9 w-9 rounded-lg bg-neutral-900 flex items-center justify-center text-white font-black text-lg">
          S
        </div>
        <div className="flex flex-col text-left">
          <span className="font-bold text-neutral-900 tracking-tight block">SimpLab</span>
          <span className="text-xs text-neutral-500 font-semibold block -mt-0.5">Verification Registry</span>
        </div>
      </div>

      <Card className="max-w-xl w-full border border-neutral-200 shadow-xl rounded-3xl overflow-hidden bg-white text-left animate-in zoom-in-95 duration-300">
        
        {/* Status Header Banner */}
        {isVerified && (
          <div className="p-6 bg-emerald-50 border-b border-emerald-150 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-600/10 border border-emerald-500/30 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6.5 w-6.5" />
            </div>
            <div>
              <Badge className="bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-wider">Verified Authentic</Badge>
              <h3 className="text-base font-black text-emerald-950 mt-1">Certificate Authenticated</h3>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="p-6 bg-amber-50 border-b border-amber-150 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-600/10 border border-amber-500/30 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-6.5 w-6.5" />
            </div>
            <div>
              <Badge className="bg-amber-600 text-white font-bold text-[9px] uppercase tracking-wider">Expired Credentials</Badge>
              <h3 className="text-base font-black text-amber-950 mt-1">Certificate Expired</h3>
            </div>
          </div>
        )}

        {isRevoked && (
          <div className="p-6 bg-rose-50 border-b border-rose-150 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-rose-600/10 border border-rose-500/30 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldX className="h-6.5 w-6.5" />
            </div>
            <div>
              <Badge className="bg-rose-600 text-white font-bold text-[9px] uppercase tracking-wider">Credentials Revoked</Badge>
              <h3 className="text-base font-black text-rose-950 mt-1">Certificate Revoked</h3>
            </div>
          </div>
        )}

        {isInvalid && (
          <div className="p-6 bg-neutral-100 border-b border-neutral-200 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-neutral-200 text-neutral-500 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-6.5 w-6.5" />
            </div>
            <div>
              <Badge variant="outline" className="bg-white text-neutral-500 border-neutral-300 font-bold text-[9px] uppercase tracking-wider">Invalid ID</Badge>
              <h3 className="text-base font-black text-neutral-900 mt-1">Validation Failed</h3>
            </div>
          </div>
        )}

        <CardContent className="p-6 sm:p-8 space-y-6">
          
          {isInvalid ? (
            <div className="space-y-4 text-center py-4">
              <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-black text-neutral-800">Verification ID is Invalid</h4>
                <p className="text-xs text-neutral-500 font-semibold leading-relaxed max-w-sm mx-auto">
                  No certificate record exists matching ID **{verificationId}**. The document might be altered, falsified, or deleted.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Recipient details */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-neutral-450 uppercase font-black tracking-wider block">Certificate Holder</span>
                <span className="text-xl font-serif font-black text-neutral-900 block">{result.name}</span>
              </div>

              {/* Institution and Band */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-4 border-y border-neutral-100">
                <div className="flex items-start gap-3">
                  <Landmark className="h-5 w-5 text-neutral-450 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] text-neutral-400 uppercase font-bold block">Institution</span>
                    <span className="text-xs font-bold text-neutral-850 block mt-0.5">{result.institution}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Award className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] text-neutral-400 uppercase font-bold block">Competency level</span>
                    <span className="text-xs font-black text-indigo-950 uppercase tracking-wider block mt-0.5">{result.band}</span>
                  </div>
                </div>
              </div>

              {/* Performance description */}
              <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/50 space-y-1">
                <span className="text-[9px] text-neutral-400 uppercase font-bold block">Performance summary</span>
                <p className="text-xs text-neutral-600 font-semibold leading-relaxed">
                  {result.performanceSummary}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {result.skills.map((skill: string, i: number) => (
                    <Badge key={i} variant="outline" className="bg-white text-[10px] text-neutral-600 font-bold border-neutral-200">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Security info and timestamps */}
              <div className="space-y-3 pt-2 text-[11px] font-semibold text-neutral-500">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    Issue Date
                  </span>
                  <span className="text-neutral-850 font-bold">
                    {new Date(result.issueDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    Expiration Date
                  </span>
                  <span className="text-neutral-850 font-bold">
                    {new Date(result.expirationDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-dashed border-neutral-100 pt-3 text-[10px] text-neutral-400">
                  <span>Verified Registry Timestamp</span>
                  <span className="font-mono">
                    {new Date(result.verificationTimestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Back button / navigation options */}
          <div className="pt-4 flex justify-center border-t border-neutral-100">
            <Link to="/login">
              <Button className="bg-slate-900 hover:bg-slate-950 text-white text-xs font-black h-9 px-4 rounded-xl flex items-center gap-1.5 shadow">
                Launch Marketing Laboratory
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

        </CardContent>

      </Card>
      
      <span className="text-[10px] text-neutral-400 font-bold mt-6">
        SimLab Secure Registry Registry ID: {verificationId}
      </span>

    </div>
  )
}
export default PublicVerificationPage;
