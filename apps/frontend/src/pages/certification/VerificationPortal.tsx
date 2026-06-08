import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router"
import api from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Award, CheckCircle, ShieldAlert, Calendar, ArrowLeft } from "lucide-react"

interface VerificationData {
  valid: boolean
  name: string
  band: string
  skills: string[]
  issueDate: string
  status: string
}

export function VerificationPortal() {
  const { verificationId } = useParams<{ verificationId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<VerificationData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const verify = async () => {
      if (!verificationId) {
        setError("Invalid verification ID.")
        setLoading(false)
        return
      }
      try {
        const res = await api.get<VerificationData>(`/api/certificates/verify/${verificationId}`)
        setData(res.data)
      } catch (err: any) {
        console.error(err)
        setError("Credential verification failed. The provided ID may be invalid or expired.")
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, [verificationId])

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 text-left">
      <Card className="w-full max-w-xl border-neutral-200 shadow-xl rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-neutral-950 text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent" />
          <div className="flex justify-between items-start gap-4 relative z-10">
            <div className="space-y-1">
              <Badge className="bg-neutral-800 text-neutral-300 border-neutral-700 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                Verification Portal
              </Badge>
              <CardTitle className="text-xl font-black">Credential Verification</CardTitle>
              <CardDescription className="text-xs text-neutral-400 font-medium mt-0.5">
                SimpLab Digital Marketing Academy
              </CardDescription>
            </div>
            <Award className="h-10 w-10 text-indigo-400 shrink-0" />
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {loading ? (
            <div className="space-y-4 py-8 text-center">
              <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-neutral-400">Verifying credential ID...</p>
            </div>
          ) : error || !data || !data.valid ? (
            <div className="space-y-6 py-4">
              <div className="flex gap-4 p-4 rounded-2xl border border-rose-250 bg-rose-50/20 text-rose-800 items-start">
                <ShieldAlert className="h-6 w-6 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-black">Invalid Credential ID</span>
                  <p className="text-neutral-500 font-medium leading-relaxed">
                    {error || "This certificate credential ID could not be found or verified. Please check the URL or contact your course administrator."}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="w-full rounded-xl border-neutral-300 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Dashboard</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Success Badge Banner */}
              <div className="flex gap-4 p-4 rounded-2xl border border-emerald-250 bg-emerald-50/15 text-emerald-800 items-center">
                <CheckCircle className="h-6 w-6 text-emerald-500 shrink-0" />
                <div className="text-xs">
                  <span className="font-black text-neutral-900 block">Verified Credential ✓</span>
                  <p className="text-neutral-500 font-medium mt-0.5">
                    This official certificate is authentic and registered in SimpLab records.
                  </p>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4 border-b border-neutral-100 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Recipient</span>
                    <span className="text-sm font-black text-neutral-900 mt-1 block">{data.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Certification Band</span>
                    <Badge className="bg-indigo-50 border-indigo-100 text-indigo-700 font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-full mt-1">
                      {data.band}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-neutral-100 pb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Verified Skills</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.skills.map((s, idx) => (
                        <Badge key={idx} variant="outline" className="text-[9px] font-bold border-neutral-200 bg-neutral-50 text-neutral-600 rounded">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Issue Date</span>
                    <span className="text-xs font-bold text-neutral-500 mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                      {new Date(data.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Credential ID</span>
                  <code className="text-xs font-black text-neutral-800 bg-neutral-100 px-2 py-1 rounded block mt-1 select-all border border-neutral-200/50">
                    {verificationId}
                  </code>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-neutral-100">
                <Button
                  onClick={() => navigate("/")}
                  className="bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl px-5 font-bold text-xs"
                >
                  Return to Console
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default VerificationPortal
