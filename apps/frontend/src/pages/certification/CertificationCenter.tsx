import { useState } from "react"
import { useCertificationStore } from "@/stores/certificationStore"
import { useAuthStore } from "@/stores/authStore"
import { CertificateViewer } from "./CertificateViewer"
import { CriteriaConfig } from "./CriteriaConfig"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Award, ShieldCheck, Trophy, Sparkles, CheckCircle2, XCircle, Eye, Download, ShieldAlert, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function CertificationCenter() {
  const { user } = useAuthStore()
  const {
    certificates,
    criteriaConfig,
    currentUserProgress,
    issueCertificate,
    downloadCertificate,
  } = useCertificationStore()

  // Tabs state for instructors (Lobby vs Config)
  const [activeTab, setActiveTab] = useState("lobby")

  // Viewing Certificate State (triggers full-screen viewer)
  const [viewingCertId, setViewingCertId] = useState<string | null>(null)

  const isInstructor = user?.role === "instructor"

  // Check if current user earned specific cert type
  const getCertStatus = (type: "completion" | "distinction" | "excellence") => {
    const cert = certificates.find((c) => c.studentName === "Student C (You)" && c.type === type)
    if (!cert) return "locked"
    return cert.status ?? "locked"
  }

  const handleClaimCertificate = (type: "completion" | "distinction" | "excellence") => {
    issueCertificate("Student C (You)", type)
    toast.success(`Congratulations! You have claimed your ${type.toUpperCase()} Certificate.`)
  }

  const handleDownload = (id: string, format: "pdf" | "png") => {
    downloadCertificate(id, format)
    toast.success(`Download started: certificate-${id}.${format}`)
  }

  const renderRequirementsChecklist = (
    type: "completion" | "distinction" | "excellence",
    roundsComplete: boolean,
    score: number,
    rank: number
  ) => {
    const reqs = []

    if (type === "completion") {
      reqs.push({
        label: "Complete all rounds",
        satisfied: roundsComplete,
      })
      reqs.push({
        label: `Score >= ${criteriaConfig.minScoreCompletion}% (Current: ${score}%)`,
        satisfied: score >= criteriaConfig.minScoreCompletion,
      })
    } else if (type === "distinction") {
      reqs.push({
        label: "Complete all rounds",
        satisfied: roundsComplete,
      })
      reqs.push({
        label: `Score >= ${criteriaConfig.minScoreDistinction}% (Current: ${score}%)`,
        satisfied: score >= criteriaConfig.minScoreDistinction,
      })
      reqs.push({
        label: `Rank <= ${criteriaConfig.minRankDistinction} (Current: #${rank})`,
        satisfied: rank <= criteriaConfig.minRankDistinction,
      })
    } else {
      reqs.push({
        label: "Complete all rounds",
        satisfied: roundsComplete,
      })
      reqs.push({
        label: `Score >= ${criteriaConfig.minScoreExcellence}% (Current: ${score}%)`,
        satisfied: score >= criteriaConfig.minScoreExcellence,
      })
      reqs.push({
        label: `Rank <= ${criteriaConfig.minRankExcellence} (Current: #${rank})`,
        satisfied: rank <= criteriaConfig.minRankExcellence,
      })
    }

    return (
      <ul className="space-y-1.5 pt-2 text-[11px] font-semibold text-neutral-500">
        {reqs.map((r, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {r.satisfied ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            )}
            <span className={cn(r.satisfied ? "text-neutral-700" : "text-neutral-450")}>
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  // Filter user's actual certificates list for the table
  const userCertificates = certificates.filter(
    (c) => c.studentName === "Student C (You)" || c.studentName === "You"
  )

  const isEligible = (type: "completion" | "distinction" | "excellence") => {
    return currentUserProgress.eligibleFor.includes(type)
  }

  // If viewing a certificate, render CertificateViewer instead
  if (viewingCertId) {
    return <CertificateViewer certificateId={viewingCertId} onBack={() => setViewingCertId(null)} />
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* ─── Header Console ─── */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <Award className="h-5.5 w-5.5 text-neutral-850" />
            <h2 className="text-xl font-black text-neutral-900 tracking-tight">Certification Center</h2>
          </div>
          <p className="text-xs text-neutral-500 font-medium max-w-lg">
            Earn, claim, and audit official credentials for the digital marketing campaigns.
          </p>
        </div>

        {isInstructor && (
          <div className="flex items-center gap-2 shrink-0 relative z-10">
            <Badge variant="outline" className="px-3 py-1 text-xs border-neutral-250 font-black bg-neutral-50 text-neutral-700 rounded-xl shadow-3xs uppercase tracking-wider">
              Instructor access enabled
            </Badge>
          </div>
        )}
      </div>

      {/* ─── Tab-based view inside instructor view ─── */}
      {isInstructor ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-xs bg-neutral-100 p-1 rounded-2xl h-10 border border-neutral-200/80">
            <TabsTrigger value="lobby" className="rounded-xl text-xs font-black tracking-wide">
              Student Lobby
            </TabsTrigger>
            <TabsTrigger value="config" className="rounded-xl text-xs font-black tracking-wide flex items-center gap-1">
              <Settings className="h-3.5 w-3.5" />
              Criteria Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lobby" className="mt-0 space-y-6">
            {renderLobby()}
          </TabsContent>

          <TabsContent value="config" className="mt-0">
            <CriteriaConfig />
          </TabsContent>
        </Tabs>
      ) : (
        renderLobby()
      )}
    </div>
  )

  // ─── Render Lobby content (Student view) ───
  function renderLobby() {
    const roundsComplete = currentUserProgress.roundsCompleted === currentUserProgress.totalRounds
    const overallScore = currentUserProgress.overallScore
    const rank = currentUserProgress.rank

    return (
      <div className="space-y-6">
        {/* ─── Progress Eligibility Banner ─── */}
        {currentUserProgress.eligibleFor.length > 0 ? (
          <Card className="border border-emerald-250 bg-emerald-50/15 shadow-2xs rounded-2xl p-4 flex gap-4 items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent" />
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-0.5 relative z-10 text-xs">
              <span className="font-black text-neutral-900 block leading-tight">
                Certificate Eligibility Earned
              </span>
              <p className="text-neutral-500 font-medium">
                You are currently eligible for:{" "}
                <strong className="text-emerald-700 font-extrabold capitalize">
                  {currentUserProgress.eligibleFor.join(", ")}
                </strong>
                . Claim your badges below!
              </p>
            </div>
          </Card>
        ) : (
          <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex gap-4 items-center">
            <div className="h-10 w-10 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-500 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-0.5 text-xs">
              <span className="font-black text-neutral-900 block leading-tight">
                No Certificates Claimable Yet
              </span>
              <p className="text-neutral-500 font-medium">
                Complete all rounds and verify score milestones to qualify for badges.
              </p>
            </div>
          </Card>
        )}

        {/* ─── 3 Certificate Tiers Grid ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Tier 1: Completion */}
          {criteriaConfig.completionEnabled && (
            <Card className="border border-neutral-200 border-l-4 border-l-emerald-500 bg-white shadow-2xs rounded-2xl p-4 flex flex-col justify-between min-h-[240px]">
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </div>
                  {renderBadge(getCertStatus("completion"), isEligible("completion"))}
                </div>

                <div className="space-y-0.5">
                  <span className="text-sm font-black text-neutral-950 block leading-tight">
                    Completion Badge
                  </span>
                  <p className="text-[11px] text-neutral-450 font-medium leading-relaxed">
                    Earned upon completing all simulation campaign cycles.
                  </p>
                </div>

                {renderRequirementsChecklist("completion", roundsComplete, overallScore, rank)}
              </div>

              {renderClaimButton("completion", getCertStatus("completion"), isEligible("completion"))}
            </Card>
          )}

          {/* Tier 2: Distinction */}
          {criteriaConfig.distinctionEnabled && (
            <Card className="border border-neutral-200 border-l-4 border-l-blue-500 bg-white shadow-2xs rounded-2xl p-4 flex flex-col justify-between min-h-[240px]">
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Award className="h-4.5 w-4.5" />
                  </div>
                  {renderBadge(getCertStatus("distinction"), isEligible("distinction"))}
                </div>

                <div className="space-y-0.5">
                  <span className="text-sm font-black text-neutral-950 block leading-tight">
                    Distinction Certificate
                  </span>
                  <p className="text-[11px] text-neutral-450 font-medium leading-relaxed">
                    Awarded for students maintaining high scoring parameters.
                  </p>
                </div>

                {renderRequirementsChecklist("distinction", roundsComplete, overallScore, rank)}
              </div>

              {renderClaimButton("distinction", getCertStatus("distinction"), isEligible("distinction"))}
            </Card>
          )}

          {/* Tier 3: Excellence */}
          {criteriaConfig.excellenceEnabled && (
            <Card className="border border-neutral-200 border-l-4 border-l-amber-500 bg-white shadow-2xs rounded-2xl p-4 flex flex-col justify-between min-h-[240px]">
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Trophy className="h-4.5 w-4.5" />
                  </div>
                  {renderBadge(getCertStatus("excellence"), isEligible("excellence"))}
                </div>

                <div className="space-y-0.5">
                  <span className="text-sm font-black text-neutral-950 block leading-tight">
                    Excellence Certificate
                  </span>
                  <p className="text-[11px] text-neutral-450 font-medium leading-relaxed">
                    Earned by students standing at the top tier of stand-board rankings.
                  </p>
                </div>

                {renderRequirementsChecklist("excellence", roundsComplete, overallScore, rank)}
              </div>

              {renderClaimButton("excellence", getCertStatus("excellence"), isEligible("excellence"))}
            </Card>
          )}
        </div>

        {/* ─── My Certificates List Table ─── */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden mt-6">
          <CardHeader className="p-5 pb-3 border-b border-neutral-100">
            <CardTitle className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
              <Award className="h-4.5 w-4.5 text-neutral-900" />
              My Certificates
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Audit credential logs and download copies.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {userCertificates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-neutral-200 bg-neutral-50 hover:bg-neutral-50">
                    <TableHead className="font-bold text-xs text-neutral-500 py-3">Certificate Type</TableHead>
                    <TableHead className="font-bold text-xs text-neutral-500 py-3">Class/Course</TableHead>
                    <TableHead className="font-bold text-xs text-neutral-500 py-3 text-center">Score</TableHead>
                    <TableHead className="font-bold text-xs text-neutral-500 py-3 text-center">Roster Rank</TableHead>
                    <TableHead className="font-bold text-xs text-neutral-500 py-3 text-center">Issue Date</TableHead>
                    <TableHead className="font-bold text-xs text-neutral-500 py-3 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userCertificates.map((cert) => (
                    <TableRow key={cert.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                      <TableCell className="font-bold text-neutral-850 py-3.5 capitalize">
                        {cert.type} Certificate
                      </TableCell>
                      <TableCell className="text-neutral-500 font-semibold py-3.5">{cert.className}</TableCell>
                      <TableCell className="text-center font-bold py-3.5 text-neutral-800">{cert.score}%</TableCell>
                      <TableCell className="text-center font-bold py-3.5 text-neutral-800">#{cert.rank}</TableCell>
                      <TableCell className="text-center text-neutral-450 font-bold text-xs py-3.5">
                        {cert.status === "earned" ? cert.issueDate : <span className="italic text-neutral-400">Not Claimed</span>}
                      </TableCell>
                      <TableCell className="text-right py-3.5 pr-6">
                        {cert.status === "earned" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => setViewingCertId(cert.id)}
                              variant="ghost"
                              className="h-8 font-black text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>

                            <Button
                              onClick={() => handleDownload(cert.id, "pdf")}
                              variant="ghost"
                              className="h-8 font-black text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-1"
                            >
                              <Download className="h-3.5 w-3.5" />
                              PDF
                            </Button>
                          </div>
                        ) : cert.status === "pending" ? (
                          <Button
                            onClick={() => handleClaimCertificate(cert.type ?? "completion")}
                            variant="outline"
                            className="h-8 font-black text-xs border-emerald-250 text-emerald-700 bg-emerald-50/20 hover:bg-emerald-50 rounded-xl"
                          >
                            Claim Credentials
                          </Button>
                        ) : (
                          <span className="text-xs font-bold text-rose-500 pr-3">Failed Requirements</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-8 text-xs font-bold text-neutral-400">
                You haven't claimed any certificates yet. Complete rounds to trigger.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  function renderBadge(status: string, eligible: boolean) {
    if (status === "earned") {
      return (
        <Badge className="bg-emerald-50 border-emerald-100 text-emerald-700 font-extrabold text-[8px] uppercase px-1.5 py-0">
          Earned
        </Badge>
      )
    }
    if (status === "pending" || (status === "locked" && eligible)) {
      return (
        <Badge className="bg-emerald-50/30 border-emerald-100 text-emerald-700 font-extrabold text-[8px] uppercase px-1.5 py-0 animate-pulse">
          Claimable
        </Badge>
      )
    }
    if (status === "failed") {
      return (
        <Badge className="bg-rose-50 border-rose-100 text-rose-700 font-extrabold text-[8px] uppercase px-1.5 py-0">
          Failed
        </Badge>
      )
    }
    return (
      <Badge className="bg-neutral-100 border-neutral-200 text-neutral-450 font-extrabold text-[8px] uppercase px-1.5 py-0">
        Locked
      </Badge>
    )
  }

  function renderClaimButton(
    type: "completion" | "distinction" | "excellence",
    status: string,
    eligible: boolean
  ) {
    if (status === "earned") {
      return (
        <Button
          onClick={() => {
            const cert = certificates.find((c) => c.studentName === "Student C (You)" && c.type === type)
            if (cert) setViewingCertId(cert.id)
          }}
          className="w-full h-8 font-black bg-slate-900 hover:bg-slate-950 text-white text-xs rounded-xl"
        >
          View Certificate
        </Button>
      )
    }

    if (status === "pending" || (status === "locked" && eligible)) {
      return (
        <Button
          onClick={() => handleClaimCertificate(type)}
          className="w-full h-8 font-black bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl shadow-xs"
        >
          Claim Certificate
        </Button>
      )
    }

    return (
      <Button
        disabled
        className="w-full h-8 font-bold border-neutral-200 bg-neutral-50 text-neutral-400 text-xs rounded-xl cursor-not-allowed"
      >
        Requirements Locked
      </Button>
    )
  }
}

export default CertificationCenter
