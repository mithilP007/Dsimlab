import { useState, useEffect } from "react"
import { useAdminStore } from "@/stores/adminStore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  School,
  Edit2,
  Power,
  PowerOff,
  Activity,
  ArrowLeft,
  Download
} from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

export function AdminInstitutionManagement() {
  const {
    institutions,
    fetchInstitutions,
    renameInstitution,
    deactivateInstitution,
    reactivateInstitution,
    createInstitution,
    isLoading
  } = useAdminStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [editingInstitution, setEditingInstitution] = useState<string | null>(null)
  const [newName, setNewName] = useState("")

  // College registration states
  const [createName, setCreateName] = useState("")
  const [createCode, setCreateCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchInstitutions()
  }, [fetchInstitutions])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim() || !createCode.trim()) {
      toast.error("Please fill in both fields")
      return
    }
    setIsSubmitting(true)
    try {
      await createInstitution(createName.trim(), createCode.trim().toUpperCase())
      toast.success("College registered successfully!")
      setCreateName("")
      setCreateCode("")
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to register college")
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredInstitutions = institutions.filter((inst) =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleRenameSubmit = async (name: string) => {
    if (!newName.trim()) {
      toast.error("Institution name cannot be empty")
      return
    }
    try {
      await renameInstitution(name, newName)
      toast.success(`Renamed institution to "${newName}"`)
      setEditingInstitution(null)
      setNewName("")
    } catch {
      toast.error("Failed to rename institution")
    }
  }

  const handleDeactivate = async (name: string) => {
    if (confirm(`Are you sure you want to deactivate all users in "${name}"?`)) {
      try {
        await deactivateInstitution(name)
        toast.success(`Deactivated institution "${name}"`)
      } catch {
        toast.error("Failed to deactivate institution")
      }
    }
  }

  const handleReactivate = async (name: string) => {
    try {
      await reactivateInstitution(name)
      toast.success(`Reactivated institution "${name}"`)
    } catch {
      toast.error("Failed to reactivate institution")
    }
  }

  const handleExportCSV = () => {
    if (filteredInstitutions.length === 0) {
      toast.error("No institutions to export")
      return
    }
    const headers = ["name", "studentsCount", "instructorCount", "completionRate", "certificationRate", "status"]
    const rows = filteredInstitutions.map(inst => [
      inst.name,
      inst.studentsCount,
      inst.instructorCount,
      inst.completionRate,
      inst.certificationRate,
      inst.status
    ])
    const csvContent = [headers.join(","), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `institutions_export_${Date.now()}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("CSV export downloaded")
  }

  const handleExportJSON = () => {
    if (filteredInstitutions.length === 0) {
      toast.error("No institutions to export")
      return
    }
    const blob = new Blob([JSON.stringify(filteredInstitutions, null, 2)], { type: "application/json;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `institutions_export_${Date.now()}.json`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("JSON export downloaded")
  }

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-5">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 hover:bg-neutral-50 rounded-lg border border-neutral-200 transition-colors">
            <ArrowLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Colleges & Institutions Management
            </h1>
            <p className="text-sm text-neutral-500 font-semibold">
              Track student and instructor counts, active simulation completion, and accreditation metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-neutral-200 text-neutral-700 font-semibold flex items-center gap-1.5 text-xs h-9 px-3"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            onClick={handleExportJSON}
            variant="outline"
            className="border-neutral-200 text-neutral-700 font-semibold flex items-center gap-1.5 text-xs h-9 px-3"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Register College Form */}
        <div className="lg:col-span-1 bg-white p-6 border border-neutral-200/60 rounded-xl shadow-sm space-y-4 h-fit">
          <h2 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
            <School className="h-4 w-4 text-neutral-500" />
            Register New College
          </h2>
          <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
            Provision a new institutional cohort workspace. Instructors and faculty can register using the generated college code.
          </p>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase">College Name</label>
              <Input
                placeholder="e.g. Stanford University"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase">Invite Code (Slug)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. STANFORD2026"
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                  required
                  className="text-xs h-9 uppercase font-mono"
                />
                <Button
                  type="button"
                  onClick={() => {
                    const randomCode = "SL" + Math.random().toString(36).substring(2, 8).toUpperCase();
                    setCreateCode(randomCode);
                  }}
                  variant="outline"
                  className="text-neutral-700 h-9 px-2 text-xs font-semibold shrink-0"
                >
                  Gen
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs h-9 mt-2"
            >
              {isSubmitting ? "Registering..." : "Register College Workspace"}
            </Button>
          </form>
        </div>

        {/* Institutions Registry List */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search Bar */}
          <div className="flex items-center justify-between gap-4 bg-white p-4 border border-neutral-200/60 rounded-xl shadow-sm">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search institutions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-neutral-50 focus:bg-white text-xs border-neutral-250/70"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-neutral-500 font-semibold text-sm">
              <Activity className="h-5 w-5 animate-spin mr-2" />
              Synchronizing institutional registries...
            </div>
          ) : (
            <Card className="border-neutral-200/60 shadow-sm">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold text-neutral-700">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/50">
                      <th className="py-3 px-4 text-neutral-500 font-bold">Institution Profile</th>
                      <th className="py-3 px-2 text-center text-neutral-500 font-bold">Invite Code</th>
                      <th className="py-3 px-2 text-center text-neutral-500 font-bold">Students Count</th>
                      <th className="py-3 px-2 text-center text-neutral-500 font-bold">Instructors Count</th>
                      <th className="py-3 px-2 text-center text-neutral-500 font-bold">Avg Completion Rate</th>
                      <th className="py-3 px-2 text-center text-neutral-500 font-bold">Certification Rate</th>
                      <th className="py-3 px-2 text-center text-neutral-500 font-bold">Status</th>
                      <th className="py-3 px-4 text-right text-neutral-500 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredInstitutions.length > 0 ? (
                      filteredInstitutions.map((inst) => (
                        <tr key={inst.name} className="hover:bg-neutral-50/40 transition-colors">
                          <td className="py-4 px-4 font-bold text-neutral-850">
                            {editingInstitution === inst.name ? (
                              <div className="flex items-center gap-2 max-w-sm">
                                <Input
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  className="text-xs font-bold py-1 h-8"
                                  placeholder="New institution name"
                                />
                                <Button
                                  onClick={() => handleRenameSubmit(inst.name)}
                                  size="sm"
                                  className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-[10px]"
                                >
                                  Save
                                </Button>
                                <Button
                                  onClick={() => setEditingInstitution(null)}
                                  variant="outline"
                                  size="sm"
                                  className="font-bold text-[10px]"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <School className="h-4 w-4 text-neutral-400 shrink-0" />
                                <span>{inst.name}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-2 text-center font-mono font-bold text-indigo-650">
                            {inst.code || "N/A"}
                          </td>
                          <td className="py-4 px-2 text-center font-mono font-bold text-neutral-800">
                            {inst.studentsCount}
                          </td>
                          <td className="py-4 px-2 text-center font-mono font-bold text-neutral-800">
                            {inst.instructorCount}
                          </td>
                          <td className="py-4 px-2 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-mono font-bold text-neutral-850">{inst.completionRate}%</span>
                              <div className="w-12 bg-neutral-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="bg-neutral-900 h-full rounded-full"
                                  style={{ width: `${Math.min(100, inst.completionRate)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <span className="font-mono font-bold text-neutral-850">{inst.certificationRate}%</span>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <Badge className={`border-none text-[9px] font-bold ${
                              inst.status === "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}>
                              {inst.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingInstitution(inst.name)
                                  setNewName(inst.name)
                                }}
                                className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded"
                                title="Edit Name"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              {inst.status === "active" ? (
                                <button
                                  onClick={() => handleDeactivate(inst.name)}
                                  className="p-1.5 text-rose-450 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="Deactivate Institution"
                                >
                                  <PowerOff className="h-3.5 w-3.5 text-rose-500" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivate(inst.name)}
                                  className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                  title="Reactivate Institution"
                                >
                                  <Power className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-neutral-400 font-medium">
                          No institutions matching query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
export default AdminInstitutionManagement
