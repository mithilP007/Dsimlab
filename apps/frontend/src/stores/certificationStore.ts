import { create } from "zustand"

// ─── Interfaces ───────────────────────────────────────────────────────────────

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
  eligibleFor: string[] // Array of certificate types: 'completion' | 'distinction' | 'excellence'
}

interface CertificationState {
  certificates: PlatformCertificate[]
  criteriaConfig: CriteriaConfig
  currentUserProgress: UserProgress

  // Actions
  checkEligibility: () => void
  issueCertificate: (studentName: string, type: "completion" | "distinction" | "excellence") => void
  updateCriteria: (config: Partial<CriteriaConfig>) => void
  downloadCertificate: (id: string, format: "pdf" | "png") => void
}

// ─── Initial Mock Data ────────────────────────────────────────────────────────

const INITIAL_CRITERIA_CONFIG: CriteriaConfig = {
  completionEnabled: true,
  distinctionEnabled: true,
  excellenceEnabled: true,
  minScoreCompletion: 60,
  minScoreDistinction: 75,
  minScoreExcellence: 90,
  minRankDistinction: 10,
  minRankExcellence: 3,
}

const INITIAL_CERTIFICATES: PlatformCertificate[] = [
  {
    id: "CERT-COMP-9082",
    studentName: "Student C (You)",
    className: "MKT 410: Advanced Digital Marketing",
    issueDate: "2026-05-20",
    expiryDate: "2029-05-20",
    score: 85.5,
    rank: 5,
    status: "earned",
    type: "completion",
    criteria: { minScore: 60, minRank: 25, allRoundsComplete: true },
  },
  {
    id: "CERT-DIST-4421",
    studentName: "Sophia Martinez",
    className: "MKT 410: Advanced Digital Marketing",
    issueDate: "2026-05-25",
    expiryDate: "2029-05-25",
    score: 91.5,
    rank: 2,
    status: "earned",
    type: "distinction",
    criteria: { minScore: 75, minRank: 10, allRoundsComplete: true },
  },
  {
    id: "CERT-EXCL-1102",
    studentName: "Alexander Wright",
    className: "MKT 410: Advanced Digital Marketing",
    issueDate: "2026-05-28",
    expiryDate: "2029-05-28",
    score: 94.2,
    rank: 1,
    status: "earned",
    type: "excellence",
    criteria: { minScore: 90, minRank: 3, allRoundsComplete: true },
  },
  {
    id: "CERT-PEND-8854",
    studentName: "Student C (You)",
    className: "MKT 410: Advanced Digital Marketing",
    issueDate: "",
    expiryDate: "",
    score: 85.5,
    rank: 5,
    status: "pending",
    type: "distinction",
    criteria: { minScore: 75, minRank: 10, allRoundsComplete: true },
  },
  {
    id: "CERT-FAIL-3312",
    studentName: "Lucas Wilson",
    className: "MKT 410: Advanced Digital Marketing",
    issueDate: "",
    expiryDate: "",
    score: 57.2,
    rank: 18,
    status: "failed",
    type: "excellence",
    criteria: { minScore: 90, minRank: 3, allRoundsComplete: true },
  },
]

const INITIAL_PROGRESS: UserProgress = {
  overallScore: 85.5,
  rank: 5,
  roundsCompleted: 4,
  totalRounds: 4,
  eligibleFor: ["completion", "distinction"],
}

// ─── Store Creation ──────────────────────────────────────────────────────────

export const useCertificationStore = create<CertificationState>((set, get) => ({
  certificates: INITIAL_CERTIFICATES,
  criteriaConfig: INITIAL_CRITERIA_CONFIG,
  currentUserProgress: INITIAL_PROGRESS,

  checkEligibility: () => {
    set((state) => {
      const { overallScore, rank, roundsCompleted, totalRounds } = state.currentUserProgress
      const config = state.criteriaConfig
      const isAllRoundsComplete = roundsCompleted === totalRounds

      const eligible: string[] = []

      if (config.completionEnabled && isAllRoundsComplete && overallScore >= config.minScoreCompletion) {
        eligible.push("completion")
      }
      if (
        config.distinctionEnabled &&
        isAllRoundsComplete &&
        overallScore >= config.minScoreDistinction &&
        rank <= config.minRankDistinction
      ) {
        eligible.push("distinction")
      }
      if (
        config.excellenceEnabled &&
        isAllRoundsComplete &&
        overallScore >= config.minScoreExcellence &&
        rank <= config.minRankExcellence
      ) {
        eligible.push("excellence")
      }

      return {
        currentUserProgress: {
          ...state.currentUserProgress,
          eligibleFor: eligible,
        },
      }
    })
  },

  issueCertificate: (studentName, type) => {
    set((state) => {
      const isYou = studentName === "Student C (You)" || studentName === "You"
      const score = isYou ? state.currentUserProgress.overallScore : 88.0
      const rank = isYou ? state.currentUserProgress.rank : 4

      const minScore =
        type === "completion"
          ? state.criteriaConfig.minScoreCompletion
          : type === "distinction"
          ? state.criteriaConfig.minScoreDistinction
          : state.criteriaConfig.minScoreExcellence

      const minRank =
        type === "completion"
          ? 25
          : type === "distinction"
          ? state.criteriaConfig.minRankDistinction
          : state.criteriaConfig.minRankExcellence

      const newCert: PlatformCertificate = {
        id: `CERT-${type.toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`,
        studentName: isYou ? "Student C (You)" : studentName,
        className: "MKT 410: Advanced Digital Marketing",
        issueDate: new Date().toISOString().split("T")[0],
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().split("T")[0],
        score,
        rank,
        status: "earned",
        type,
        criteria: { minScore, minRank, allRoundsComplete: true },
      }

      // Check if student already has this certificate type pending, update it
      const existingIdx = state.certificates.findIndex(
        (c) => c.studentName === newCert.studentName && c.type === type && c.status === "pending"
      )

      let updatedCertificates = [...state.certificates]
      if (existingIdx !== -1) {
        updatedCertificates[existingIdx] = {
          ...updatedCertificates[existingIdx],
          status: "earned",
          id: newCert.id,
          issueDate: newCert.issueDate,
          expiryDate: newCert.expiryDate,
        }
      } else {
        updatedCertificates.push(newCert)
      }

      return {
        certificates: updatedCertificates,
      }
    })
  },

  updateCriteria: (config) => {
    set((state) => ({
      criteriaConfig: {
        ...state.criteriaConfig,
        ...config,
      },
    }))
    get().checkEligibility()
  },

  downloadCertificate: (id, format) => {
    // Simulated toast trigger in components, action performs state confirmation
    console.log(`Certificate ${id} download initiated in ${format.toUpperCase()} format.`)
  },
}))

export default useCertificationStore
