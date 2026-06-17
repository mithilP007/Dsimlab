import { useState, useEffect, useRef } from "react"
import { useParams, Link } from "react-router"
import { useCertificationStore } from "@/stores/certificationStore"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Award, Download, Printer, Share2, ZoomIn, ZoomOut,
  ArrowLeft, ShieldCheck, QrCode, Check
} from "lucide-react"

export function CertificateViewer() {
  const { certificateId } = useParams<{ certificateId: string }>()
  const { fetchCertificateById, currentCertificate, downloadCertificate, isLoading } = useCertificationStore()

  // Local UI States
  const [zoom, setZoom] = useState(1.0)
  const [isCopied, setIsCopied] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const certificateRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (certificateId) {
      fetchCertificateById(certificateId).catch((err) => {
        console.error("Failed to load certificate:", err)
        toast.error("Certificate not found or unauthorized.")
      })
    }
  }, [certificateId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Award className="h-10 w-10 text-indigo-600 animate-spin" />
        <span className="text-sm text-neutral-500 font-bold">Retrieving certificate credentials...</span>
      </div>
    )
  }

  if (!currentCertificate) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white border border-neutral-200 rounded-2xl text-center space-y-4 shadow-sm">
        <Award className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-neutral-900">Certificate Not Found</h2>
        <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
          The requested certificate credentials could not be located.
        </p>
        <Link to="/certificate" className="text-xs text-indigo-600 font-bold hover:underline block">
          Back to Certificate Portal
        </Link>
      </div>
    )
  }

  const verifyUrl = `${window.location.origin}/verify/${currentCertificate.verificationId}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verifyUrl)}`

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.7))
  const handleZoomReset = () => setZoom(1.0)

  const handleShare = () => {
    navigator.clipboard.writeText(verifyUrl)
    setIsCopied(true)
    toast.success("Verification link copied!")
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  const downloadQrCode = async () => {
    try {
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = `QR_${currentCertificate.verificationId}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
      toast.success("QR Code downloaded successfully!")
    } catch (err) {
      console.error(err)
      toast.error("Failed to download QR code.")
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* CSS overrides for print-only styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-certificate-container, #print-certificate-container * {
            visibility: visible !important;
          }
          #print-certificate-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            transform: scale(1) !important;
            background: white !important;
          }
        }
      `}</style>

      {/* Header Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-3 text-left">
          <Link
            to="/certificate"
            className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-500 hover:text-neutral-750 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-xl font-black text-neutral-900">Certificate Viewer</h2>
            <p className="text-xs font-semibold text-neutral-400 mt-0.5">
              Verify credentials status or export matching PDFs.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom controls */}
          <div className="flex bg-neutral-100 border border-neutral-200/50 p-1 rounded-xl gap-0.5">
            <button onClick={handleZoomOut} title="Zoom Out" className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-white transition-all">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleZoomReset} title="Reset Zoom" className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-white transition-all text-xs font-black px-2">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={handleZoomIn} title="Zoom In" className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-white transition-all">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            onClick={handleShare}
            variant="outline"
            className="border-neutral-250 text-neutral-600 hover:bg-neutral-50 text-xs font-bold h-9 px-3 rounded-xl flex items-center gap-1.5"
          >
            {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
            Share
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-neutral-250 text-neutral-600 hover:bg-neutral-50 text-xs font-bold h-9 px-3 rounded-xl flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>

          <Button
            onClick={() => setIsQrModalOpen(true)}
            variant="outline"
            className="border-neutral-250 text-neutral-600 hover:bg-neutral-50 text-xs font-bold h-9 px-3 rounded-xl flex items-center gap-1.5"
          >
            <QrCode className="h-4 w-4" />
            QR Verification
          </Button>

          <Button
            onClick={() => downloadCertificate(currentCertificate.verificationId || currentCertificate.id)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-9 px-3 rounded-xl flex items-center gap-1.5 shadow"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="w-full overflow-x-auto flex justify-center py-6 bg-neutral-100 rounded-3xl border border-neutral-200/50 shadow-inner">
        <div
          ref={certificateRef}
          id="print-certificate-container"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center top" }}
          className="w-[297mm] h-[210mm] min-w-[297mm] min-h-[210mm] bg-white border-[16px] border-indigo-950 p-12 text-center flex flex-col justify-between shadow-2xl relative transition-transform duration-200"
        >
          {/* Internal double golden border */}
          <div className="absolute inset-2.5 border border-amber-500 pointer-events-none" />
          <div className="absolute inset-3 border border-amber-400 pointer-events-none" />

          {/* Certificate Header Banner */}
          <div className="space-y-3.5 mt-4">
            <div className="flex justify-center items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-indigo-950 fill-amber-400 stroke-[2px]" />
              <span className="font-serif text-3xl font-extrabold text-indigo-950 tracking-widest uppercase">
                SimLab Certification
              </span>
            </div>
            <div className="h-0.5 w-64 bg-amber-500 mx-auto" />
            <span className="text-xs uppercase text-neutral-400 font-bold tracking-widest block">
              Digital Marketing simulator pass credentials
            </span>
          </div>

          {/* Award Text Block */}
          <div className="space-y-4">
            <span className="font-serif italic text-sm text-neutral-500">This certificate is proudly awarded to</span>
            <h1 className="font-serif text-4xl sm:text-5xl font-black text-indigo-950 underline decoration-amber-400 decoration-2 underline-offset-8">
              {currentCertificate.recipientName}
            </h1>
            <p className="max-w-xl mx-auto text-xs text-neutral-500 leading-relaxed font-semibold">
              For successfully qualifying in the simulator scenario campaign category: 
              <span className="text-neutral-850 font-bold block mt-1.5 text-sm uppercase">
                {currentCertificate.simulation?.class?.scenario?.industry || "Marketing Campaign"}
              </span>
            </p>
          </div>

          {/* Competency level and Skills */}
          <div className="space-y-4">
            <div className="inline-flex flex-col items-center gap-1">
              <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider">Achieved Competency Level</span>
              <span className="text-lg font-black text-amber-500 bg-amber-50 border border-amber-200 px-6 py-1 rounded-full uppercase tracking-wider">
                {currentCertificate.band} Level
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] text-neutral-400 uppercase font-black tracking-wider block">Demonstrated Core Skills</span>
              <div className="flex justify-center gap-4 text-xs font-extrabold text-neutral-700">
                {currentCertificate.skills.map((skill, idx) => (
                  <span key={idx} className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex justify-between items-end border-t border-neutral-100 pt-6 mt-4">
            <div className="text-left space-y-1">
              <span className="text-[8px] text-neutral-450 uppercase font-bold block">Verification ID</span>
              <code className="text-xs font-mono font-bold text-indigo-950 block">{currentCertificate.verificationId}</code>
            </div>

            {/* Embedded QR Code */}
            <div className="bg-neutral-50 p-2 border border-neutral-200/50 rounded-xl flex items-center gap-3">
              <img
                src={qrCodeUrl}
                alt="Verification QR Code"
                className="h-14 w-14 border border-white bg-white shrink-0 shadow-sm"
              />
              <div className="text-left">
                <span className="text-[8px] text-neutral-400 uppercase font-bold block">Public Verification</span>
                <span className="text-[9px] text-neutral-600 font-bold block mt-0.5 max-w-[120px] leading-tight">
                  Scan code to verify authentic credentials.
                </span>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="text-[8px] text-neutral-450 uppercase font-bold block">Issue Date</span>
              <span className="text-xs font-bold text-indigo-950 block">
                {new Date(currentCertificate.issueDate).toLocaleDateString()}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* QR Verification Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-neutral-200 max-w-sm w-full p-6 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                <QrCode className="h-4.5 w-4.5 text-indigo-600" />
                Verification QR Code
              </h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="text-xs font-bold text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200/50 inline-block">
              <img
                src={qrCodeUrl}
                alt="Verification QR Code"
                className="h-44 w-44 border border-white bg-white mx-auto shadow-md rounded-xl"
              />
            </div>

            <p className="text-xs font-semibold text-neutral-500 leading-relaxed max-w-[260px] mx-auto">
              Scan this code using any smartphone camera to view the cryptographic public validation results.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                onClick={downloadQrCode}
                variant="outline"
                className="border-neutral-250 text-neutral-600 hover:bg-neutral-50 text-xs font-bold h-9 px-3 rounded-xl flex items-center justify-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                Download QR
              </Button>
              <Button
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  printWindow?.document.write(`
                    <html>
                      <body style="display:flex;flex-direction:column;align-items:center;justify-center;height:100vh;font-family:sans-serif;margin:0;">
                        <h2>Verification QR Code</h2>
                        <p style="font-size:12px;color:#666;">ID: ${currentCertificate.verificationId}</p>
                        <img src="${qrCodeUrl}" style="border:1px solid #ccc;padding:12px;border-radius:12px;" />
                        <script>window.onload = function() { window.print(); window.close(); }</script>
                      </body>
                    </html>
                  `);
                  printWindow?.document.close();
                }}
                className="bg-slate-900 hover:bg-slate-950 text-white text-xs font-black h-9 px-3 rounded-xl flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Print QR
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
export default CertificateViewer;
