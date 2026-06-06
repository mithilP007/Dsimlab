import { useCertificationStore } from "@/stores/certificationStore"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, Share2, Download, Printer, Award, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface CertificateViewerProps {
  certificateId: string
  onBack: () => void
}

export function CertificateViewer({ certificateId, onBack }: CertificateViewerProps) {
  const { certificates, downloadCertificate } = useCertificationStore()

  const certificate = certificates.find((c) => c.id === certificateId)

  if (!certificate) {
    return (
      <div className="space-y-4 text-left">
        <Button onClick={onBack} variant="outline" size="sm" className="h-8 text-xs font-bold border-neutral-250 bg-white">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to Center
        </Button>
        <Card className="border-neutral-200 bg-white p-8 text-center text-neutral-450 font-bold text-xs rounded-2xl">
          Certificate not found.
        </Card>
      </div>
    )
  }

  const handleShare = () => {
    navigator.clipboard.writeText(`https://simplab.edu/verify/${certificate.id}`)
    toast.success("Credential verification link copied to clipboard!")
  }

  const handleDownload = (format: "pdf" | "png") => {
    downloadCertificate(certificate.id, format)
    toast.success(`Download started: certificate-${certificate.id}.${format}`)
  }

  // Get theme colors based on certificate tier
  const tierConfig = {
    completion: {
      border: "border-emerald-600 bg-emerald-50/5",
      accentText: "text-emerald-700",
      accentBg: "bg-emerald-50 text-emerald-700",
      label: "Certificate of Completion",
    },
    distinction: {
      border: "border-blue-600 bg-blue-50/5",
      accentText: "text-blue-700",
      accentBg: "bg-blue-50 text-blue-700",
      label: "Certificate of Distinction",
    },
    excellence: {
      border: "border-amber-500 bg-amber-50/5",
      accentText: "text-amber-700",
      accentBg: "bg-amber-50 text-amber-700",
      label: "Certificate of Excellence",
    },
  }

  const config = tierConfig[certificate.type ?? "completion"] ?? tierConfig.completion

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      {/* Top Controls Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-neutral-200 bg-white shadow-2xs">
        <Button onClick={onBack} variant="outline" size="sm" className="h-9 text-xs font-bold border-neutral-250 bg-white shadow-3xs rounded-xl">
          <ChevronLeft className="mr-1.5 h-4 w-4" /> Back to Center
        </Button>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleShare}
            variant="outline"
            size="sm"
            className="h-9 text-xs font-bold border-neutral-250 bg-white shadow-3xs rounded-xl flex items-center gap-1.5"
          >
            <Share2 className="h-4 w-4 text-neutral-500" />
            Share Link
          </Button>

          <Button
            onClick={() => handleDownload("png")}
            variant="outline"
            size="sm"
            className="h-9 text-xs font-bold border-neutral-250 bg-white shadow-3xs rounded-xl flex items-center gap-1.5"
          >
            <Download className="h-4 w-4 text-neutral-500" />
            PNG Image
          </Button>

          <Button
            onClick={() => handleDownload("pdf")}
            className="h-9 text-xs font-black bg-slate-900 text-white hover:bg-slate-950 shadow-xs rounded-xl flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Print PDF
          </Button>
        </div>
      </div>

      {/* ─── Grand Certificate Frame ─── */}
      <div className="bg-neutral-100 p-4 sm:p-8 rounded-3xl border border-neutral-200/80 shadow-inner flex justify-center overflow-x-auto">
        {/* The Certificate sheet */}
        <Card className={cn(
          "bg-stone-50/70 border-[10px] w-full max-w-[800px] shadow-lg rounded-none relative overflow-hidden aspect-[4/3] flex flex-col justify-between p-10 sm:p-14 text-center shrink-0 select-none",
          config.border
        )}>
          {/* Decorative Corner Borders */}
          <div className="absolute top-4 left-4 h-8 w-8 border-t-2 border-l-2 border-neutral-300" />
          <div className="absolute top-4 right-4 h-8 w-8 border-t-2 border-r-2 border-neutral-300" />
          <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-neutral-300" />
          <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-neutral-300" />

          {/* Background Watermark Emblem */}
          <Award className="h-72 w-72 text-neutral-200/20 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rotate-12" />

          {/* Header */}
          <div className="space-y-2 relative z-10">
            <div className="flex justify-center items-center gap-1.5">
              <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                S
              </div>
              <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest">
                SimpLab Verification Academy
              </span>
            </div>
            <h2 className="text-xs font-black text-neutral-400 uppercase tracking-widest">
              Digital Marketing Simulation platform
            </h2>
          </div>

          {/* Certificate Title */}
          <div className="space-y-1 relative z-10">
            <p className="text-[11px] font-medium text-neutral-500 italic">
              This official document certifies that
            </p>
            <h1 className="font-serif text-3xl font-extrabold tracking-tight text-neutral-900 border-b border-neutral-200 pb-2 max-w-md mx-auto">
              {(certificate.studentName ?? certificate.recipientName).replace(" (You)", "")}
            </h1>
            <p className="text-[11px] font-medium text-neutral-500 pt-2 italic">
              has completed all round campaign cycles and verified criteria standards for the award
            </p>
            <h3 className={cn("text-lg font-serif font-black uppercase tracking-wider mt-1.5", config.accentText)}>
              {config.label}
            </h3>
          </div>

          {/* Course and Score Meta info */}
          <div className="space-y-1.5 relative z-10 max-w-lg mx-auto">
            <p className="text-[11px] font-bold text-neutral-700">
              Class Course: <span className="font-extrabold text-neutral-950">{certificate.className ?? "DM Simulation"}</span>
            </p>
            
            <div className="flex items-center justify-center gap-3.5 pt-1 text-[10px] font-bold text-neutral-500">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                Score achieved: <strong className="text-neutral-900 font-extrabold">{certificate.score ?? certificate.compositeScore}%</strong>
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
              <span>
                Class Standing Rank: <strong className="text-neutral-900 font-extrabold">#{certificate.rank ?? "—"}</strong>
              </span>
            </div>
          </div>

          {/* Signatures & Credentials ID Footer */}
          <div className="grid grid-cols-3 items-end gap-6 relative z-10 pt-4 border-t border-neutral-100">
            {/* Signature Left */}
            <div className="text-left space-y-1">
              <div className="font-serif text-sm italic text-neutral-700 text-center font-bold">
                Sarah Jenkins
              </div>
              <div className="border-t border-neutral-300 pt-1 text-[8px] font-black text-neutral-400 uppercase tracking-widest text-center">
                Simulation Director
              </div>
            </div>

            {/* Credential ID Center */}
            <div className="space-y-1 text-center">
              <span className="text-[8px] text-neutral-400 font-black block uppercase tracking-widest">
                Verification ID
              </span>
              <span className="font-mono text-[9px] text-neutral-750 font-bold block">
                {certificate.id}
              </span>
            </div>

            {/* Date stamps Right */}
            <div className="text-right space-y-1">
              <span className="text-[9px] font-black text-neutral-850 text-center block">
                {certificate.issueDate}
              </span>
              <div className="border-t border-neutral-300 pt-1 text-[8px] font-black text-neutral-400 uppercase tracking-widest text-center">
                Issue Date
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default CertificateViewer
