import { Link, useNavigate } from "react-router"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import {
  Search,
  Target,
  Share2,
  TrendingUp,
  Award,
  GraduationCap,
  Eye,
  History,
  FileCheck2,
  ShieldCheck,
  Check,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react"
import { useAuthStore } from "@/stores/authStore"
import { useEffect } from "react"

export function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true })
    }
  }, [isAuthenticated, navigate])

  const benefits = [
    {
      icon: Search,
      title: "SEO Simulation",
      description: "Practice indexing site structures, optimization metadata, search intent analysis, and link-building strategies.",
    },
    {
      icon: Target,
      title: "Google Ads Training",
      description: "Build target keywords, organize negative terms, bid using exact match scopes, and manage real-time cost-per-click metrics.",
    },
    {
      icon: Share2,
      title: "Meta Ads Training",
      description: "Set campaign target rules, launch interactive budget limits, and configure feed/story placements on social media.",
    },
    {
      icon: TrendingUp,
      title: "Performance Scoring",
      description: "Gain live reporting scorecards grading conversion rates, CPC, and ROI variables on each simulation step.",
    },
    {
      icon: Award,
      title: "Certification",
      description: "Generate course achievements and validated credentials showcasing simulator score capabilities.",
    },
    {
      icon: GraduationCap,
      title: "Instructor Tools",
      description: "Deploy classroom invites, specify customized simulation days, and analyze student submission logs.",
    },
  ]

  const trustItems = [
    {
      icon: ShieldCheck,
      title: "Transparent Scoring",
      description: "Fully inspect how scorecards calculate performance across SEO and ad networks.",
    },
    {
      icon: Eye,
      title: "Instructor Oversight",
      description: "Allow faculty members to review simulation decisions, metrics, and progress logs.",
    },
    {
      icon: History,
      title: "Audit Trails",
      description: "Track round timelines, budget revisions, and structural decisions to prevent cheating.",
    },
    {
      icon: FileCheck2,
      title: "Verified Certificates",
      description: "Generate cryptographically secure digital credentials sharing completed simulator stats.",
    },
  ]

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  }

  return (
    <div className="min-h-screen bg-gray-50/50 text-neutral-900 font-sans flex flex-col antialiased">
      {/* Navigation Header */}
      <header className="h-16 px-6 md:px-12 border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-neutral-900 flex items-center justify-center text-white font-black text-lg shadow-sm">
            S
          </div>
          <span className="font-bold text-neutral-900 tracking-tight text-lg">SimpLab</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-xs sm:text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors">
            Sign In
          </Link>
          <Link to="/join">
            <Button size="sm" variant="outline" className="h-9 font-semibold text-xs border-neutral-200">
              Join with Class Code
            </Button>
          </Link>
          <Link to="/signup" className="hidden sm:inline-block">
            <Button size="sm" className="h-9 font-semibold text-xs bg-neutral-950 text-white hover:bg-neutral-800">
              Pricing
            </Button>
          </Link>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section className="relative py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto w-full text-center space-y-8 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-4 max-w-3xl"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.1]">
            Learn Digital Marketing by Running Real Simulations
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed font-medium">
            Master SEO, Google Ads, and Meta Ads through realistic marketing simulations and performance-based learning.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-2xl"
        >
          <Link to="/signup" className="flex-1 min-w-[180px]">
            <Button size="lg" className="w-full h-12 text-sm font-black bg-neutral-950 text-white hover:bg-neutral-800 shadow-md rounded-xl">
              Pricing
            </Button>
          </Link>
          <Link to="/join" className="flex-1 min-w-[180px]">
            <Button size="lg" variant="outline" className="w-full h-12 text-sm font-black border-neutral-200 hover:bg-neutral-50 rounded-xl bg-white text-neutral-800">
              Join Class
            </Button>
          </Link>
          <Link to="/instructor-login" className="flex-1 min-w-[180px]">
            <Button size="lg" variant="secondary" className="w-full h-12 text-sm font-black bg-neutral-200/60 hover:bg-neutral-200 text-neutral-800 rounded-xl">
              Instructor Portal
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* 2. AUDIENCE SECTION */}
      <section className="py-20 border-t border-b border-neutral-200/60 bg-white px-6 md:px-12 w-full">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Tailored For Your Goals</h2>
            <p className="text-sm text-neutral-500 max-w-md mx-auto font-medium">
              Choose the learning track that matches your goals.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
          >
            {/* Individual Card */}
            <motion.div variants={itemVariants}>
              <Card className="border-neutral-200/80 shadow-sm h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-neutral-900">Individual Learner</CardTitle>
                  <CardDescription className="font-medium text-xs text-neutral-400 uppercase tracking-wider">Self-Paced Practice</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between space-y-6">
                  <ul className="space-y-3.5 text-left text-sm text-neutral-600 font-medium">
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-neutral-900 shrink-0 stroke-[3px]" />
                      <span>Self-paced simulations</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-neutral-900 shrink-0 stroke-[3px]" />
                      <span>Certification</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-neutral-900 shrink-0 stroke-[3px]" />
                      <span>Progress tracking</span>
                    </li>
                  </ul>
                  <Link to="/signup" className="block pt-4">
                    <Button className="w-full font-bold h-10 bg-neutral-950 text-white hover:bg-neutral-800">
                      Pricing
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Academic Card */}
            <motion.div variants={itemVariants}>
              <Card className="border-neutral-200/80 shadow-sm h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-neutral-900">Colleges & Universities</CardTitle>
                  <CardDescription className="font-medium text-xs text-neutral-400 uppercase tracking-wider">Classroom Solutions</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between space-y-6">
                  <ul className="space-y-3.5 text-left text-sm text-neutral-600 font-medium">
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-neutral-900 shrink-0 stroke-[3px]" />
                      <span>Class management</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-neutral-900 shrink-0 stroke-[3px]" />
                      <span>Scenario creation</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-neutral-900 shrink-0 stroke-[3px]" />
                      <span>Performance analytics</span>
                    </li>
                  </ul>
                  <Link to="/instructor-login" className="block pt-4">
                    <Button variant="outline" className="w-full font-bold h-10 border-neutral-200">
                      Instructor Access
                      <ArrowUpRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                  <a href="mailto:demo@simlab.edu?subject=College%20Demo%20Request&body=Institution%20Name%3A%0AExpected%20Students%3A%0ACourse%3A" className="block">
                    <Button variant="ghost" className="w-full font-bold h-10 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100">
                      Request College Demo
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 3. BENEFITS SECTION */}
      <section className="py-24 px-6 md:px-12 w-full max-w-7xl mx-auto">
        <div className="space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Platform Capabilities</h2>
            <p className="text-sm text-neutral-500 max-w-md mx-auto font-medium">
              Everything you need to master channels and prove marketing performance.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <motion.div key={benefit.title} variants={itemVariants}>
                  <Card className="border-neutral-200 bg-white shadow-sm h-full hover:shadow-md transition-all duration-200">
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                      <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900 shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base font-bold text-neutral-950">{benefit.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-neutral-500 leading-relaxed text-left font-medium">
                        {benefit.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* 4. TRUST SECTION */}
      <section className="py-20 border-t border-b border-neutral-200/60 bg-white px-6 md:px-12 w-full">
        <div className="max-w-7xl mx-auto space-y-12 text-center">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Academic Integrity Built-In</h2>
            <p className="text-sm text-neutral-500 max-w-md mx-auto font-medium">
              Enterprise grade grading variables built directly for classrooms and schools.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {trustItems.map((item) => {
              const Icon = item.icon
              return (
                <motion.div key={item.title} variants={itemVariants}>
                  <Card className="border-neutral-200 bg-gray-50/50 shadow-sm h-full hover:bg-white transition-colors duration-200">
                    <CardContent className="p-6 text-left space-y-4">
                      <div className="h-8 w-8 rounded-lg bg-neutral-900/5 text-neutral-900 flex items-center justify-center shrink-0">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="font-bold text-sm text-neutral-950">{item.title}</h3>
                      <p className="text-xs text-neutral-500 leading-relaxed font-medium">{item.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* 5. CTA SECTION */}
      <section className="py-24 px-6 max-w-4xl mx-auto w-full text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="p-10 sm:p-14 rounded-2xl border border-neutral-200 bg-white shadow-lg space-y-6"
        >
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Ready to Start Learning?</h2>
          <p className="text-sm text-neutral-500 leading-relaxed max-w-md mx-auto font-medium">
            Join thousands of marketers simulating campaigns, ranking organic content, and earning verifiable course achievements.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <Link to="/signup" className="flex-1 min-w-[160px]">
              <Button size="lg" className="w-full h-11 text-xs font-black bg-neutral-950 text-white hover:bg-neutral-800 rounded-xl">
                Pricing
              </Button>
            </Link>
            <Link to="/instructor-login" className="flex-1 min-w-[160px]">
              <Button size="lg" variant="outline" className="w-full h-11 text-xs font-black border-neutral-200 hover:bg-neutral-50 bg-white text-neutral-800 rounded-xl">
                Instructor Access
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* 6. FOOTER */}
      <footer className="mt-auto py-8 px-6 border-t border-neutral-200 bg-white text-center text-xs text-neutral-400 font-medium w-full">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-800">SimpLab</span>
            <span>© 2026. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-neutral-900 transition-colors">About</a>
            <a href="#" className="hover:text-neutral-900 transition-colors">Certification</a>
            <a href="#" className="hover:text-neutral-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-neutral-900 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
export default LandingPage
