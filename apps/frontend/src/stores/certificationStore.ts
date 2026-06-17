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
  simulationId: string
  userId: string
  recipientName: string
  issueDate: string
  verificationHash: string
  verificationId: string | null
  compositeScore: number
  pdfUrl: string
  band: string
  skills: string[]
  simulation?: {
    class: {
      name: string
      scenario: {
        industry: string
        name: string
      }
    }
  }
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
  eligibleFor: string[] // 'bronze' | 'silver' | 'gold' | 'platinum'
}

interface CertificationState {
  certificates: PlatformCertificate[]
  currentCertificate: PlatformCertificate | null
  criteriaConfig: CriteriaConfig
  currentUserProgress: UserProgress
  isLoading: boolean
  classCertifications: {
    totalStudents: number
    certifiedCount: number
    successRate: number
    distribution: { BRONZE: number; SILVER: number; GOLD: number; PLATINUM: number }
    certificates: any[]
    eligibleStudents: any[]
  } | null
  adminAnalytics: {
    totalIssued: number
    verificationRequests: number
    mostCommonLevel: string
    institutionDistribution: { name: string; count: number }[]
    growthTrends: { month: string; count: number }[]
  } | null

  // Actions
  checkEligibility: (simulationId: string) => Promise<boolean>
  issueCertificate: (studentName: string, type: string, simulationId: string) => Promise<any>
  updateCriteria: (config: Partial<CriteriaConfig>) => void
  downloadCertificate: (id: string) => void
  fetchUserCertificates: () => Promise<void>
  fetchCertificateById: (id: string) => Promise<PlatformCertificate>
  verifyCertificate: (verificationId: string) => Promise<any>
  fetchClassCertifications: (classId: string) => Promise<any>
  fetchAdminAnalytics: () => Promise<any>
}

export const useCertificationStore = create<CertificationState>((set) => ({
  certificates: [],
  currentCertificate: null,
  criteriaConfig: {
    completionEnabled: true,
    distinctionEnabled: true,
    excellenceEnabled: true,
    minScoreCompletion: 70,
    minScoreDistinction: 80,
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
  classCertifications: null,
  adminAnalytics: null,

  checkEligibility: async (_simulationId) => {
    set({ isLoading: true })
    try {
      const res = await api.post<{
        success: boolean
        eligible: boolean
        reasons: string[]
        band: string
        compositeScore: number
      }>('/api/certificates/check-eligibility', { simulationId: _simulationId })

      const data = res.data
      const eligibleFor = data.eligible && data.band ? [data.band.toLowerCase()] : []

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

  issueCertificate: async (_studentName, _type, _simulationId) => {
    set({ isLoading: true })
    try {
      const res = await api.post<{
        success: boolean
        certificate: any
      }>('/api/certificates/issue', { simulationId: _simulationId })

      const data = res.data
      if (data.success && data.certificate) {
        const fullDownloadUrl = `${config.apiBaseUrl}${data.certificate.pdfUrl}`
        
        let parsedSkills: string[] = []
        try {
          parsedSkills = JSON.parse(data.certificate.skills)
        } catch {
          parsedSkills = []
        }

        const newCert: PlatformCertificate = {
          id: data.certificate.id,
          simulationId: data.certificate.simulationId,
          userId: data.certificate.userId,
          recipientName: data.certificate.recipientName,
          issueDate: data.certificate.issueDate,
          verificationHash: data.certificate.verificationHash,
          verificationId: data.certificate.verificationId,
          compositeScore: Math.round(data.certificate.compositeScore || 0),
          pdfUrl: fullDownloadUrl,
          band: data.certificate.band,
          skills: parsedSkills,
        }

        set((state) => ({
          certificates: [newCert, ...state.certificates.filter((c) => c.id !== newCert.id)],
          currentCertificate: newCert,
          isLoading: false,
        }))
        return data.certificate
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

  downloadCertificate: (id) => {
    const fullDownloadUrl = `${config.apiBaseUrl}/api/certificates/${id}/download`
    window.open(fullDownloadUrl, '_blank')
  },

  fetchUserCertificates: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get<{ success: boolean; report: any[] }>('/api/v1/report/certificate-summary')
      const certs = (res.data?.report || []).map(c => ({
        id: c.verificationId,
        simulationId: '',
        userId: '',
        recipientName: '',
        issueDate: c.issueDate,
        verificationHash: '',
        verificationId: c.verificationId,
        compositeScore: c.compositeScore,
        pdfUrl: `${config.apiBaseUrl}${c.pdfUrl}`,
        band: c.band,
        skills: []
      }))
      set({ certificates: certs, isLoading: false })
    } catch (err) {
      console.error("Failed to fetch user certificates:", err)
      set({ isLoading: false })
    }
  },

  fetchCertificateById: async (id: string) => {
    set({ isLoading: true })
    try {
      const res = await api.get<{ success: boolean; certificate: any }>(`/api/certificates/${id}`)
      const cert = res.data.certificate
      let skillsArray: string[] = []
      try {
        skillsArray = JSON.parse(cert.skills)
      } catch {
        skillsArray = []
      }

      const fullCert: PlatformCertificate = {
        id: cert.id,
        simulationId: cert.simulationId,
        userId: cert.userId,
        recipientName: cert.recipientName,
        issueDate: cert.issueDate,
        verificationHash: cert.verificationHash,
        verificationId: cert.verificationId,
        compositeScore: cert.compositeScore,
        pdfUrl: `${config.apiBaseUrl}${cert.pdfUrl}`,
        band: cert.band,
        skills: skillsArray,
        simulation: cert.simulation
      }
      set({ currentCertificate: fullCert, isLoading: false })
      return fullCert
    } catch (err) {
      console.error("Failed to fetch certificate by ID:", err)
      set({ isLoading: false })
      throw err
    }
  },

  verifyCertificate: async (verificationId: string) => {
    try {
      const res = await api.get<any>(`/api/certificates/verify/${verificationId}`)
      return res.data
    } catch (err) {
      console.error("Failed to verify certificate:", err)
      throw err
    }
  },

  fetchClassCertifications: async (classId: string) => {
    set({ isLoading: true })
    try {
      const res = await api.get<any>(`/api/v1/class/${classId}/certifications`)
      set({ classCertifications: res.data, isLoading: false })
      return res.data
    } catch (err) {
      console.error("Failed to fetch class certifications:", err)
      set({ isLoading: false })
      throw err
    }
  },

  fetchAdminAnalytics: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get<any>('/api/v1/report/analytics/certifications')
      set({ adminAnalytics: res.data, isLoading: false })
      return res.data
    } catch (err) {
      console.error("Failed to fetch admin analytics:", err)
      set({ isLoading: false })
      throw err
    }
  },
}))

export default useCertificationStore
