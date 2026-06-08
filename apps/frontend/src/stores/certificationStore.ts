import { create } from "zustand"
import api from "@/lib/api"
import config from "@/lib/config"

export interface CertificateCriteria {
  minScore: number
  minRank: number
  allRoundsComplete: boolean
}

export interface PlatformCertificate {
  id: string
  studentName: string
  className: string
  issueDate: string
  expiryDate: string
  score: number
  rank: number
  status: "earned" | "pending" | "failed"
  type: "completion" | "distinction" | "excellence"
  criteria: CertificateCriteria
  pdfUrl?: string
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
  eligibleFor: string[] // 'completion' | 'distinction' | 'excellence'
}

interface CertificationState {
  certificates: PlatformCertificate[]
  criteriaConfig: CriteriaConfig
  currentUserProgress: UserProgress
  isLoading: boolean

  // Actions
  checkEligibility: (simulationId: string) => Promise<boolean>
  issueCertificate: (studentName: string, type: "completion" | "distinction" | "excellence", simulationId: string) => Promise<any>
  updateCriteria: (config: Partial<CriteriaConfig>) => void
  downloadCertificate: (id: string, format: "pdf" | "png") => void
}

export const useCertificationStore = create<CertificationState>((set, get) => ({
  certificates: [],
  criteriaConfig: {
    completionEnabled: true,
    distinctionEnabled: true,
    excellenceEnabled: true,
    minScoreCompletion: 60,
    minScoreDistinction: 75,
    minScoreExcellence: 90,
    minRankDistinction: 10,
    minRankExcellence: 3,
  },
  currentUserProgress: {
    overallScore: 0,
    rank: 1,
    roundsCompleted: 0,
    totalRounds: 10,
    eligibleFor: [],
  },
  isLoading: false,

  checkEligibility: async (simulationId) => {
    set({ isLoading: true })
    try {
      const res = await api.post<{
        success: boolean
        eligible: boolean
        reasons: string[]
        band: string
        compositeScore: number
      }>('/api/certificates/check-eligibility', { simulationId })

      const data = res.data
      const eligibleFor = data.eligible && data.band ? [data.band] : []

      set((state) => ({
        currentUserProgress: {
          ...state.currentUserProgress,
          overallScore: Math.round(data.compositeScore || 0),
          eligibleFor,
        },
        isLoading: false,
      }))
      return data.eligible
    } catch (err) {
      console.error("Failed to check eligibility:", err)
      set({ isLoading: false })
      return false
    }
  },

  issueCertificate: async (_studentName, _type, simulationId) => {
    set({ isLoading: true })
    try {
      const res = await api.post<{
        success: boolean
        certificate: any
        downloadUrl: string
      }>('/api/certificates/issue', { simulationId })

      const data = res.data
      if (data.success && data.downloadUrl) {
        // Open download link
        const fullDownloadUrl = `${config.apiBaseUrl}${data.downloadUrl}`
        window.open(fullDownloadUrl, '_blank')

        // Mapped certificate to append/update
        const newCert: PlatformCertificate = {
          id: data.certificate.verificationId || data.certificate.id,
          studentName: data.certificate.recipientName,
          className: "SimLab Simulation Campaign",
          issueDate: data.certificate.issueDate,
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().split("T")[0],
          score: Math.round(data.certificate.compositeScore || 0),
          rank: 1,
          status: "earned",
          type: (data.certificate.band || "completion").toLowerCase() as any,
          criteria: { minScore: 60, minRank: 10, allRoundsComplete: true },
          pdfUrl: fullDownloadUrl,
        }

        set((state) => ({
          certificates: [newCert, ...state.certificates.filter((c) => c.id !== newCert.id)],
          isLoading: false,
        }))
      }
      return data
    } catch (err) {
      console.error("Failed to issue certificate:", err)
      set({ isLoading: false })
      throw err
    }
  },

  updateCriteria: (config) => {
    set((state) => ({
      criteriaConfig: {
        ...state.criteriaConfig,
        ...config,
      },
    }))
  },

  downloadCertificate: (id, _format) => {
    const cert = get().certificates.find((c) => c.id === id)
    if (cert && cert.pdfUrl) {
      window.open(cert.pdfUrl, '_blank')
    } else {
      console.warn(`No PDF URL found for certificate ID: ${id}`)
    }
  },
}))

export default useCertificationStore
