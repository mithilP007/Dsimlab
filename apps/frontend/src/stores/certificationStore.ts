import { create } from "zustand"
import apiClient from "@/lib/api"
import { toast } from "sonner"
import { config } from "@/lib/config"

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface CertificateCriteria {
  minScore: number
  minRank: number
  allRoundsComplete: boolean
}

export interface PlatformCertificate {
  id: string
  simulationId: string
  userId: string
  recipientName: string
  issueDate: string
  verificationHash: string
  compositeScore: number
  pdfUrl: string
  band?: string
  // UI-compatibility fields (mapped from backend data or left as defaults)
  studentName?: string
  className?: string
  expiryDate?: string
  score?: number
  rank?: number
  status?: "earned" | "pending" | "failed"
  type?: "completion" | "distinction" | "excellence"
}

export interface EligibilityResult {
  eligible: boolean
  reasons: string[]
  compositeScore: number
  band?: string
}

export interface CriteriaConfig {
  completionEnabled: boolean
  distinctionEnabled: boolean
  excellenceEnabled: boolean
  minScoreCompletion: number
  minScoreDistinction: number
  minScoreExcellence: number
  minRankDistinction: number
  minRankExcellence: number
}

export interface UserProgress {
  overallScore: number
  rank: number
  roundsCompleted: number
  totalRounds: number
  eligibleFor: string[]
}

// ─── State Interface ──────────────────────────────────────────────────────────

interface CertificationState {
  certificate: PlatformCertificate | null
  eligibility: EligibilityResult | null
  isLoading: boolean
  error: string | null

  // Legacy fields kept for existing UI components
  criteriaConfig: CriteriaConfig
  currentUserProgress: UserProgress
  certificates: PlatformCertificate[]

  // ─── Actions ───────────────────────────────────────────────────────────────

  /** Check if current student meets eligibility criteria */
  checkEligibility: () => Promise<void>

  /** Generate and persist a signed certificate */
  generateCertificate: () => Promise<void>

  /**
   * Download certificate PDF for a simulation.
   * Opens the authenticated download URL in a new tab.
   */
  downloadCertificate: (simulationId: string, format?: "pdf" | "png") => void

  /** Legacy stub kept for UI compatibility */
  issueCertificate: (studentName: string, type: "completion" | "distinction" | "excellence") => void
  updateCriteria: (config: Partial<CriteriaConfig>) => void
}

// ─── Initial / fallback config ────────────────────────────────────────────────

const DEFAULT_CRITERIA: CriteriaConfig = {
  completionEnabled: true,
  distinctionEnabled: true,
  excellenceEnabled: true,
  minScoreCompletion: 60,
  minScoreDistinction: 75,
  minScoreExcellence: 90,
  minRankDistinction: 10,
  minRankExcellence: 3,
}

// ─── Store Creation ───────────────────────────────────────────────────────────

export const useCertificationStore = create<CertificationState>((set, get) => ({
  certificate: null,
  eligibility: null,
  isLoading: false,
  error: null,
  criteriaConfig: DEFAULT_CRITERIA,
  certificates: [],
  currentUserProgress: {
    overallScore: 0,
    rank: 0,
    roundsCompleted: 0,
    totalRounds: 30,
    eligibleFor: [],
  },

  // ─── Check Eligibility ─────────────────────────────────────────────────────

  checkEligibility: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.get("/v1/certificate/eligibility")
      const result: EligibilityResult = {
        eligible: data.eligible,
        reasons: data.reasons ?? [],
        compositeScore: data.compositeScore ?? 0,
        band: data.band,
      }
      set({
        eligibility: result,
        currentUserProgress: {
          ...get().currentUserProgress,
          overallScore: result.compositeScore,
          eligibleFor: result.eligible ? ["completion"] : [],
        },
      })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to check eligibility."
      set({ error: msg })
      toast.error(msg)
    } finally {
      set({ isLoading: false })
    }
  },

  // ─── Generate Certificate ──────────────────────────────────────────────────

  generateCertificate: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.post("/v1/certificate/generate")
      const cert = data.certificate as PlatformCertificate
      set({
        certificate: cert,
        certificates: [cert],
      })
      toast.success("Certificate generated successfully!")
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to generate certificate."
      set({ error: msg })
      toast.error(msg)
    } finally {
      set({ isLoading: false })
    }
  },

  // ─── Download Certificate ──────────────────────────────────────────────────

  downloadCertificate: (simulationId, _format = "pdf") => {
    // The download endpoint streams a PDF and does not require a body.
    // We open it in a new tab which will trigger the browser's save dialog.
    const url = `${config.apiBaseUrl}/v1/certificate/download/${simulationId}`
    window.open(url, "_blank", "noopener,noreferrer")
  },

  // ─── Legacy stubs ─────────────────────────────────────────────────────────

  issueCertificate: (_studentName, _type) => {
    // Deprecated – use generateCertificate() instead
    get().generateCertificate()
  },

  updateCriteria: (update) => {
    set((state) => ({
      criteriaConfig: { ...state.criteriaConfig, ...update },
    }))
  },
}))

export default useCertificationStore
