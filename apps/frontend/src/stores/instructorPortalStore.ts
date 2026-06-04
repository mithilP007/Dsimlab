import { create } from "zustand"

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface InstructorClass {
  id: string
  name: string
  scenario: string
  studentsCount: number
  maxStudents: number
  deadline: string
  status: "active" | "draft" | "completed"
  avgScore: number
  createdAt: string
}

export interface InstructorScenario {
  id: string
  name: string
  description: string
  difficulty: "beginner" | "intermediate" | "advanced"
  rounds: number
  budget: number
}

export interface InstructorStudent {
  id: string
  name: string
  email: string
  classId: string
  joinedAt: string
  lastActive: string
  overallScore: number
  completionRate: number
  status: "active" | "inactive"
  roundScores: number[]
  seoScore: number
  googleAdsScore: number
  metaAdsScore: number
  feedbackNotes: string
}

export interface InstructorAnalytics {
  totalStudents: number
  avgClassScore: number
  completionRate: number
  activeNow: number
}

interface InstructorPortalState {
  classes: InstructorClass[]
  scenarios: InstructorScenario[]
  students: InstructorStudent[]
  selectedClassId: string | null
  analytics: InstructorAnalytics

  // Actions
  createClass: (name: string, scenarioId: string, maxStudents: number, deadline: string) => void
  archiveClass: (id: string) => void
  inviteStudent: (classId: string, email: string) => void
  removeStudent: (classId: string, studentId: string) => void
  selectClass: (id: string | null) => void
  duplicateScenario: (id: string) => void
  updateStudentNotes: (studentId: string, notes: string) => void
  addCustomScenario: (scenario: Omit<InstructorScenario, "id">) => void
  updateClassDetails: (id: string, updates: Partial<Pick<InstructorClass, "name" | "deadline" | "maxStudents">>) => void
}

// ─── Initial Mock Data ────────────────────────────────────────────────────────

const INITIAL_SCENARIOS: InstructorScenario[] = [
  {
    id: "sc_1",
    name: "Startup Launch",
    description: "Build initial user adoption for a boot-strapped digital agency startup.",
    difficulty: "beginner",
    rounds: 10,
    budget: 3000,
  },
  {
    id: "sc_2",
    name: "E-commerce Growth",
    description: "Scale conversion values and optimize PPC ROI for a fashion e-tailer.",
    difficulty: "intermediate",
    rounds: 15,
    budget: 5000,
  },
  {
    id: "sc_3",
    name: "Brand Awareness",
    description: "Expand reach and social impressions for an organic beverage manufacturer.",
    difficulty: "beginner",
    rounds: 8,
    budget: 2500,
  },
  {
    id: "sc_4",
    name: "SaaS Leads Blitz",
    description: "Maximize trial signups and optimize CPA for a team collaboration software.",
    difficulty: "advanced",
    rounds: 20,
    budget: 10000,
  },
  {
    id: "sc_5",
    name: "Local Services Drive",
    description: "Attract local service leads using search campaigns for a plumbing services aggregator.",
    difficulty: "intermediate",
    rounds: 12,
    budget: 4000,
  },
]

const INITIAL_CLASSES: InstructorClass[] = [
  {
    id: "c_1",
    name: "MKT 410: Advanced Digital Marketing",
    scenario: "E-commerce Growth",
    studentsCount: 12,
    maxStudents: 25,
    deadline: "2026-06-15",
    status: "active",
    avgScore: 84.5,
    createdAt: "2026-05-01T10:00:00Z",
  },
  {
    id: "c_2",
    name: "MKT 420: Social Media Strategy",
    scenario: "Startup Launch",
    studentsCount: 8,
    maxStudents: 20,
    deadline: "2026-06-25",
    status: "draft",
    avgScore: 78.2,
    createdAt: "2026-05-10T12:00:00Z",
  },
  {
    id: "c_3",
    name: "MKT 310: Intro to Advertising",
    scenario: "Brand Awareness",
    studentsCount: 5,
    maxStudents: 30,
    deadline: "2026-05-30",
    status: "completed",
    avgScore: 81.0,
    createdAt: "2026-04-15T09:00:00Z",
  },
]

const INITIAL_STUDENTS: InstructorStudent[] = [
  // Class 1 (c_1) - 12 Students
  { id: "s1", name: "Alexander Wright", email: "alex.wright@univ.edu", classId: "c_1", joinedAt: "2026-05-01", lastActive: "2 mins ago", overallScore: 94.2, completionRate: 90, status: "active", roundScores: [65, 76, 88, 94], seoScore: 96, googleAdsScore: 95, metaAdsScore: 92, feedbackNotes: "Doing excellent work on landing page optimizations." },
  { id: "s2", name: "Sophia Martinez", email: "sophia.m@univ.edu", classId: "c_1", joinedAt: "2026-05-01", lastActive: "5 mins ago", overallScore: 91.5, completionRate: 90, status: "active", roundScores: [70, 78, 85, 91], seoScore: 92, googleAdsScore: 91, metaAdsScore: 92, feedbackNotes: "" },
  { id: "s3", name: "Liam Chen", email: "l.chen@univ.edu", classId: "c_1", joinedAt: "2026-05-01", lastActive: "15 mins ago", overallScore: 89.1, completionRate: 90, status: "active", roundScores: [62, 74, 82, 89], seoScore: 89, googleAdsScore: 90, metaAdsScore: 88, feedbackNotes: "Great improvement in Meta Ads allocation." },
  { id: "s4", name: "Emma Johnson", email: "emma.j@univ.edu", classId: "c_1", joinedAt: "2026-05-01", lastActive: "1 hour ago", overallScore: 87.0, completionRate: 80, status: "active", roundScores: [58, 69, 78, 87], seoScore: 84, googleAdsScore: 88, metaAdsScore: 89, feedbackNotes: "" },
  { id: "s5", name: "Oliver Brown", email: "oliver.b@univ.edu", classId: "c_1", joinedAt: "2026-05-02", lastActive: "2 hours ago", overallScore: 83.2, completionRate: 80, status: "active", roundScores: [60, 68, 75, 83], seoScore: 82, googleAdsScore: 83, metaAdsScore: 85, feedbackNotes: "" },
  { id: "s6", name: "Mia Davis", email: "mia.d@univ.edu", classId: "c_1", joinedAt: "2026-05-02", lastActive: "10 mins ago", overallScore: 81.0, completionRate: 80, status: "active", roundScores: [54, 65, 72, 81], seoScore: 79, googleAdsScore: 81, metaAdsScore: 83, feedbackNotes: "" },
  { id: "s7", name: "Lucas Wilson", email: "lucas.w@univ.edu", classId: "c_1", joinedAt: "2026-05-02", lastActive: "3 hours ago", overallScore: 79.4, completionRate: 70, status: "active", roundScores: [52, 60, 70, 79], seoScore: 78, googleAdsScore: 80, metaAdsScore: 80, feedbackNotes: "Watch Google Ads keyword matches closely." },
  { id: "s8", name: "Aria Taylor", email: "aria.t@univ.edu", classId: "c_1", joinedAt: "2026-05-03", lastActive: "1 day ago", overallScore: 76.5, completionRate: 70, status: "active", roundScores: [50, 62, 68, 76], seoScore: 76, googleAdsScore: 75, metaAdsScore: 78, feedbackNotes: "" },
  { id: "s9", name: "Ethan Thomas", email: "ethan.t@univ.edu", classId: "c_1", joinedAt: "2026-05-03", lastActive: "30 mins ago", overallScore: 73.8, completionRate: 70, status: "active", roundScores: [48, 55, 65, 73], seoScore: 72, googleAdsScore: 74, metaAdsScore: 75, feedbackNotes: "" },
  { id: "s10", name: "Isabella Anderson", email: "isabella.a@univ.edu", classId: "c_1", joinedAt: "2026-05-03", lastActive: "4 hours ago", overallScore: 71.0, completionRate: 60, status: "inactive", roundScores: [45, 52, 62, 71], seoScore: 70, googleAdsScore: 71, metaAdsScore: 72, feedbackNotes: "" },
  { id: "s11", name: "Mason Jackson", email: "mason.j@univ.edu", classId: "c_1", joinedAt: "2026-05-04", lastActive: "15 mins ago", overallScore: 69.2, completionRate: 60, status: "active", roundScores: [40, 50, 60, 69], seoScore: 68, googleAdsScore: 69, metaAdsScore: 71, feedbackNotes: "" },
  { id: "s12", name: "Zoe Roberts", email: "zoe.r@univ.edu", classId: "c_1", joinedAt: "2026-05-04", lastActive: "5 hours ago", overallScore: 67.5, completionRate: 60, status: "active", roundScores: [42, 48, 58, 67], seoScore: 65, googleAdsScore: 68, metaAdsScore: 69, feedbackNotes: "" },

  // Class 2 (c_2) - 8 Students
  { id: "s13", name: "Logan White", email: "logan.w@univ.edu", classId: "c_2", joinedAt: "2026-05-10", lastActive: "2 days ago", overallScore: 65.4, completionRate: 50, status: "inactive", roundScores: [40, 52, 65], seoScore: 63, googleAdsScore: 66, metaAdsScore: 67, feedbackNotes: "" },
  { id: "s14", name: "Lily Harris", email: "lily.h@univ.edu", classId: "c_2", joinedAt: "2026-05-10", lastActive: "1 day ago", overallScore: 63.0, completionRate: 50, status: "active", roundScores: [42, 50, 63], seoScore: 62, googleAdsScore: 64, metaAdsScore: 63, feedbackNotes: "" },
  { id: "s15", name: "Jackson Martin", email: "jackson.m@univ.edu", classId: "c_2", joinedAt: "2026-05-11", lastActive: "3 days ago", overallScore: 61.8, completionRate: 50, status: "active", roundScores: [45, 53, 61], seoScore: 60, googleAdsScore: 62, metaAdsScore: 63, feedbackNotes: "" },
  { id: "s16", name: "Grace Nelson", email: "grace.n@univ.edu", classId: "c_2", joinedAt: "2026-05-11", lastActive: "1 hour ago", overallScore: 59.5, completionRate: 40, status: "active", roundScores: [38, 48, 59], seoScore: 58, googleAdsScore: 60, metaAdsScore: 61, feedbackNotes: "Requires review on search marketing bids." },
  { id: "s17", name: "Lucas Lee", email: "lucas.l@univ.edu", classId: "c_2", joinedAt: "2026-05-12", lastActive: "1 day ago", overallScore: 57.2, completionRate: 40, status: "active", roundScores: [40, 48, 57], seoScore: 56, googleAdsScore: 58, metaAdsScore: 58, feedbackNotes: "" },
  { id: "s18", name: "Avery King", email: "avery.k@univ.edu", classId: "c_2", joinedAt: "2026-05-12", lastActive: "4 days ago", overallScore: 55.0, completionRate: 40, status: "inactive", roundScores: [35, 45, 55], seoScore: 54, googleAdsScore: 56, metaAdsScore: 55, feedbackNotes: "" },
  { id: "s19", name: "Jack Green", email: "jack.g@univ.edu", classId: "c_2", joinedAt: "2026-05-13", lastActive: "2 hours ago", overallScore: 52.8, completionRate: 30, status: "active", roundScores: [32, 42, 52], seoScore: 52, googleAdsScore: 53, metaAdsScore: 54, feedbackNotes: "" },
  { id: "s20", name: "Chloe Adams", email: "chloe.a@univ.edu", classId: "c_2", joinedAt: "2026-05-13", lastActive: "2 days ago", overallScore: 50.0, completionRate: 30, status: "active", roundScores: [30, 40, 50], seoScore: 49, googleAdsScore: 51, metaAdsScore: 50, feedbackNotes: "" },

  // Class 3 (c_3) - 5 Students
  { id: "s21", name: "Owen Baker", email: "owen.b@univ.edu", classId: "c_3", joinedAt: "2026-04-15", lastActive: "3 hours ago", overallScore: 47.5, completionRate: 20, status: "active", roundScores: [32, 47], seoScore: 46, googleAdsScore: 48, metaAdsScore: 49, feedbackNotes: "" },
  { id: "s22", name: "Nora Carter", email: "nora.c@univ.edu", classId: "c_3", joinedAt: "2026-04-15", lastActive: "3 days ago", overallScore: 45.0, completionRate: 20, status: "inactive", roundScores: [35, 45], seoScore: 44, googleAdsScore: 45, metaAdsScore: 46, feedbackNotes: "" },
  { id: "s23", name: "Leo Miller", email: "leo.m@univ.edu", classId: "c_3", joinedAt: "2026-04-16", lastActive: "5 days ago", overallScore: 42.4, completionRate: 10, status: "active", roundScores: [30, 42], seoScore: 41, googleAdsScore: 43, metaAdsScore: 43, feedbackNotes: "" },
  { id: "s24", name: "Stella Ward", email: "stella.w@univ.edu", classId: "c_3", joinedAt: "2026-04-16", lastActive: "4 hours ago", overallScore: 39.5, completionRate: 10, status: "active", roundScores: [25, 39], seoScore: 38, googleAdsScore: 40, metaAdsScore: 41, feedbackNotes: "" },
  { id: "s25", name: "Henry Foster", email: "henry.f@univ.edu", classId: "c_3", joinedAt: "2026-04-17", lastActive: "1 hour ago", overallScore: 89.2, completionRate: 100, status: "active", roundScores: [75, 82, 85, 89], seoScore: 90, googleAdsScore: 88, metaAdsScore: 90, feedbackNotes: "Great job completing the course." },
]

// ─── Store Creation ──────────────────────────────────────────────────────────

export const useInstructorPortalStore = create<InstructorPortalState>((set) => ({
  classes: INITIAL_CLASSES,
  scenarios: INITIAL_SCENARIOS,
  students: INITIAL_STUDENTS,
  selectedClassId: null,
  analytics: {
    totalStudents: 25,
    avgClassScore: 81.2,
    completionRate: 72,
    activeNow: 8,
  },

  createClass: (name, scenarioId, maxStudents, deadline) => {
    set((state) => {
      const scenario = state.scenarios.find((s) => s.id === scenarioId)
      const newClass: InstructorClass = {
        id: `c_${state.classes.length + 1}`,
        name,
        scenario: scenario ? scenario.name : "Startup Launch",
        studentsCount: 0,
        maxStudents,
        deadline,
        status: "draft",
        avgScore: 0,
        createdAt: new Date().toISOString(),
      }
      return {
        classes: [...state.classes, newClass],
      }
    })
  },

  archiveClass: (id) => {
    set((state) => ({
      classes: state.classes.map((c) => (c.id === id ? { ...c, status: "completed" as const } : c)),
      selectedClassId: state.selectedClassId === id ? null : state.selectedClassId,
    }))
  },

  inviteStudent: (classId, email) => {
    set((state) => {
      const parts = email.split("@")[0].split(".")
      const firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "New"
      const lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : "Student"
      const fullName = `${firstName} ${lastName}`

      const newStudent: InstructorStudent = {
        id: `s_new_${Date.now()}`,
        name: fullName,
        email,
        classId,
        joinedAt: new Date().toISOString().split("T")[0],
        lastActive: "Just now",
        overallScore: 0,
        completionRate: 0,
        status: "active",
        roundScores: [0],
        seoScore: 0,
        googleAdsScore: 0,
        metaAdsScore: 0,
        feedbackNotes: "",
      }

      // Update student count in Class
      const updatedClasses = state.classes.map((cls) => {
        if (cls.id === classId) {
          return { ...cls, studentsCount: cls.studentsCount + 1 }
        }
        return cls
      })

      return {
        students: [...state.students, newStudent],
        classes: updatedClasses,
        analytics: {
          ...state.analytics,
          totalStudents: state.analytics.totalStudents + 1,
        },
      }
    })
  },

  removeStudent: (classId, studentId) => {
    set((state) => {
      const updatedStudents = state.students.filter((s) => s.id !== studentId)

      // Update student count in Class
      const updatedClasses = state.classes.map((cls) => {
        if (cls.id === classId) {
          return { ...cls, studentsCount: Math.max(0, cls.studentsCount - 1) }
        }
        return cls
      })

      return {
        students: updatedStudents,
        classes: updatedClasses,
        analytics: {
          ...state.analytics,
          totalStudents: Math.max(0, state.analytics.totalStudents - 1),
        },
      }
    })
  },

  selectClass: (id) => {
    set({ selectedClassId: id })
  },

  duplicateScenario: (id) => {
    set((state) => {
      const scenario = state.scenarios.find((s) => s.id === id)
      if (!scenario) return {}
      const duplicated: InstructorScenario = {
        ...scenario,
        id: `sc_${state.scenarios.length + 1}`,
        name: `${scenario.name} (Copy)`,
      }
      return {
        scenarios: [...state.scenarios, duplicated],
      }
    })
  },

  updateStudentNotes: (studentId, notes) => {
    set((state) => ({
      students: state.students.map((s) => (s.id === studentId ? { ...s, feedbackNotes: notes } : s)),
    }))
  },

  addCustomScenario: (scenario) => {
    set((state) => {
      const newScenario: InstructorScenario = {
        ...scenario,
        id: `sc_${state.scenarios.length + 1}`,
      }
      return {
        scenarios: [...state.scenarios, newScenario],
      }
    })
  },

  updateClassDetails: (id, updates) => {
    set((state) => ({
      classes: state.classes.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }))
  },
}))

export default useInstructorPortalStore
