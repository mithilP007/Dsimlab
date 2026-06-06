import { useState, useEffect } from "react"
import { useSearchParams } from "react-router"
import { useAdminStore, type AdminUser } from "@/stores/adminStore"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Plus,
  Search,
  Trash2,
  Mail,
  ArrowLeft,
  ArrowRight,
  Download,
  Ban,
  Unlock,
  CheckSquare,
  Square,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function UserManager() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    users,
    suspendUser,
    activateUser,
    changeUserRole,
    deleteUser,
    addUser,
  } = useAdminStore()

  // State: Search & Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // State: Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // State: Selection for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // State: Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null)

  // Form States (for Provisioning)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"student" | "instructor" | "admin">("student")
  const [status, setStatus] = useState<"active" | "suspended" | "pending">("active")

  // Sync "add=true" URL query param to open Provisioning Dialog
  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setIsAddOpen(true)
      // Clear URL parameter so it doesn't reopen on refresh
      const newParams = new URLSearchParams(searchParams)
      newParams.delete("add")
      setSearchParams(newParams)
    }
  }, [searchParams, setSearchParams])

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds([])
  }, [searchTerm, roleFilter, statusFilter])

  // Handlers: User modification
  const handleProvision = () => {
    if (!name.trim()) {
      toast.error("Please enter a name")
      return
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address")
      return
    }

    addUser({
      name: name.trim(),
      email: email.trim(),
      role,
      status,
      classCount: role === "student" ? 1 : 0,
      totalScore: role === "student" ? 80.0 : 0,
    })

    toast.success(`User ${name.trim()} provisioned successfully`)
    setName("")
    setEmail("")
    setRole("student")
    setStatus("active")
    setIsAddOpen(false)
  }

  const handleDeleteRequest = (id: string, name: string) => {
    setUserToDelete({ id, name })
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete.id)
      setSelectedIds((prev) => prev.filter((id) => id !== userToDelete.id))
      toast.success(`Deleted user: ${userToDelete.name}`)
      setIsDeleteConfirmOpen(false)
      setUserToDelete(null)
    }
  }

  // Bulk Actions
  const handleToggleSelectAll = (filteredOnPage: AdminUser[]) => {
    const pageIds = filteredOnPage.map((u) => u.id)
    const allSelectedOnPage = pageIds.every((id) => selectedIds.includes(id))

    if (allSelectedOnPage) {
      // Unselect page IDs
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      // Select all page IDs
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleBulkSuspend = () => {
    if (selectedIds.length === 0) return
    selectedIds.forEach((id) => suspendUser(id))
    toast.success(`Suspended ${selectedIds.length} user(s)`)
    setSelectedIds([])
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected user(s)?`)) {
      selectedIds.forEach((id) => deleteUser(id))
      toast.success(`Deleted ${selectedIds.length} user(s)`)
      setSelectedIds([])
    }
  }

  // Functional CSV Exporter
  const handleExportCSV = () => {
    const headers = "ID,Name,Email,Role,Status,JoinedAt,LastLogin,ClassCount,TotalScore\n"
    const rows = filteredUsers
      .map(
        (u) =>
          `"${u.id}","${u.name}","${u.email}","${u.role}","${u.status}","${u.joinedAt}","${u.lastLogin}",${u.classCount},${u.totalScore}`
      )
      .join("\n")

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `Simplab_Users_Export_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Successfully exported ${filteredUsers.length} users to CSV`)
  }

  // Filter Logic
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management Directory
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Admin console to modify roles, toggle suspensions, and manage credentials.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 text-xs border-neutral-250 font-bold bg-white text-neutral-700 rounded-xl"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>

          {/* Provision Modal Button */}
          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="h-9 font-black bg-slate-900 text-white hover:bg-slate-950 text-xs rounded-xl px-4 shadow-sm"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add User
          </Button>
        </div>
      </div>

      {/* Directory Table Card */}
      <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden">
        {/* Filters and Search Toolbar */}
        <div className="p-4 bg-neutral-50/50 border-b border-neutral-100 flex flex-col md:flex-row gap-3 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search by user name or email address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs border-neutral-200 bg-white w-full max-w-md"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs border-neutral-200 bg-white text-neutral-705 font-bold">
                <SelectValue placeholder="Role Filter" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-neutral-200 text-neutral-800">
                <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                <SelectItem value="student" className="text-xs">Student</SelectItem>
                <SelectItem value="instructor" className="text-xs">Instructor</SelectItem>
                <SelectItem value="admin" className="text-xs">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs border-neutral-200 bg-white text-neutral-705 font-bold">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-neutral-200 text-neutral-800">
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="active" className="text-xs">Active</SelectItem>
                <SelectItem value="suspended" className="text-xs">Suspended</SelectItem>
                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk Actions Bar (Visible when row checks exist) */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-indigo-50/45 border-b border-indigo-100 flex items-center justify-between px-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs text-indigo-950 font-bold">
              <CheckSquare className="h-4 w-4 text-indigo-600" />
              <span>{selectedIds.length} user(s) selected</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkSuspend}
                className="h-8 text-[11px] font-bold border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50/50 rounded-lg px-2.5"
              >
                <Ban className="h-3 w-3 mr-1" />
                Bulk Suspend
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="h-8 text-[11px] font-bold border-red-200 bg-white text-red-700 hover:bg-red-50/50 rounded-lg px-2.5"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Bulk Delete
              </Button>
            </div>
          </div>
        )}

        {/* Table list */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-neutral-50/70 border-b border-neutral-100">
              <TableRow>
                <TableHead className="w-[45px] py-3.5 text-center">
                  <button
                    onClick={() => handleToggleSelectAll(paginatedUsers)}
                    className="p-1 rounded hover:bg-neutral-100"
                  >
                    {paginatedUsers.length > 0 &&
                    paginatedUsers.map((u) => u.id).every((id) => selectedIds.includes(id)) ? (
                      <CheckSquare className="h-4 w-4 text-indigo-600" />
                    ) : (
                      <Square className="h-4 w-4 text-neutral-350" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="text-left font-black text-[10px] text-neutral-450 uppercase tracking-wider w-[240px]">Name / Learner</TableHead>
                <TableHead className="text-left font-black text-[10px] text-neutral-450 uppercase tracking-wider">Role</TableHead>
                <TableHead className="text-left font-black text-[10px] text-neutral-450 uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-left font-black text-[10px] text-neutral-450 uppercase tracking-wider">Joined</TableHead>
                <TableHead className="text-left font-black text-[10px] text-neutral-450 uppercase tracking-wider">Last Login</TableHead>
                <TableHead className="text-right font-black text-[10px] text-neutral-450 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-neutral-100">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => {
                  const isChecked = selectedIds.includes(user.id)
                  return (
                    <TableRow
                      key={user.id}
                      className={cn(
                        "hover:bg-neutral-50/50 transition-colors",
                        isChecked && "bg-indigo-50/10 hover:bg-indigo-50/20"
                      )}
                    >
                      {/* Checkbox select */}
                      <TableCell className="py-3.5 text-center">
                        <button
                          onClick={() => handleToggleSelectRow(user.id)}
                          className="p-1 rounded hover:bg-neutral-100"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Square className="h-4 w-4 text-neutral-350" />
                          )}
                        </button>
                      </TableCell>

                      {/* Learner Info */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3 text-left">
                          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                            {user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-neutral-900 truncate">{user.name}</span>
                            <span className="text-[10px] font-semibold text-neutral-450 flex items-center gap-1 mt-0.5 truncate">
                              <Mail className="h-3 w-3 text-neutral-350" />
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role Selector dropdown */}
                      <TableCell className="py-3.5 text-left">
                        <Select
                          value={user.role}
                          onValueChange={(val) =>
                            changeUserRole(user.id, val as "student" | "instructor" | "admin")
                          }
                        >
                          <SelectTrigger className="h-7 w-[110px] text-[10px] font-extrabold border-neutral-200 bg-white uppercase py-0 rounded-lg shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-neutral-200 text-neutral-800">
                            <SelectItem value="student" className="text-xs">Student</SelectItem>
                            <SelectItem value="instructor" className="text-xs">Instructor</SelectItem>
                            <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3.5 text-left">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border border-transparent shadow-none uppercase",
                            user.status === "active" && "bg-emerald-50 text-emerald-700 border-emerald-100",
                            user.status === "suspended" && "bg-neutral-150 text-neutral-600 border-neutral-200",
                            user.status === "pending" && "bg-sky-50 text-sky-700 border-sky-100"
                          )}
                        >
                          {user.status}
                        </Badge>
                      </TableCell>

                      {/* Joined Date */}
                      <TableCell className="py-3.5 text-xs text-neutral-500 font-semibold text-left">
                        {user.joinedAt}
                      </TableCell>

                      {/* Last Login */}
                      <TableCell className="py-3.5 text-xs text-neutral-500 font-semibold text-left">
                        {user.lastLogin}
                      </TableCell>

                      {/* Row Actions */}
                      <TableCell className="py-3.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          {/* Suspend / Activate toggle */}
                          {user.status === "suspended" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                activateUser(user.id)
                                toast.success(`Activated user: ${user.name}`)
                              }}
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                              title="Activate User"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                suspendUser(user.id)
                                toast.success(`Suspended user: ${user.name}`)
                              }}
                              className="h-8 w-8 text-neutral-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                              title="Suspend User"
                              disabled={user.status === "pending"}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRequest(user.id, user.name)}
                            className="h-8 w-8 text-neutral-400 hover:text-red-650 hover:bg-red-50 rounded-lg"
                            title="Delete User"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-xs text-neutral-400 font-semibold">
                    No users matching criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-neutral-100 flex items-center justify-between px-6 bg-neutral-50/20">
            <span className="text-xs text-neutral-500 font-bold">
              Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="h-8 text-xs border-neutral-250 bg-white font-bold rounded-lg"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 text-xs border-neutral-250 bg-white font-bold rounded-lg"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add User Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-white border border-neutral-200 rounded-2xl max-w-sm p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-neutral-900 flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5" />
              Provision Account
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                Full Name
              </label>
              <Input
                type="text"
                placeholder="e.g. May Maple"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs border-neutral-250 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="e.g. may@hoenn.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs border-neutral-250 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                  Role
                </label>
                <Select value={role} onValueChange={(val) => setRole(val as any)}>
                  <SelectTrigger className="w-full h-9 text-xs border-neutral-250 bg-white font-bold text-neutral-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-neutral-200 text-neutral-800">
                    <SelectItem value="student" className="text-xs">Student</SelectItem>
                    <SelectItem value="instructor" className="text-xs">Instructor</SelectItem>
                    <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                  Status
                </label>
                <Select value={status} onValueChange={(val) => setStatus(val as any)}>
                  <SelectTrigger className="w-full h-9 text-xs border-neutral-250 bg-white font-bold text-neutral-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-neutral-200 text-neutral-800">
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="suspended" className="text-xs">Suspended</SelectItem>
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 flex gap-2">
            <Button
              variant="outline"
              className="h-9 font-bold text-xs border-neutral-250 bg-white"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-9 font-black bg-slate-900 text-white hover:bg-slate-950 text-xs"
              onClick={handleProvision}
            >
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-white border border-neutral-200 rounded-2xl max-w-sm p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-red-950 flex items-center gap-1.5">
              <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
            Are you sure you want to delete account <strong>{userToDelete?.name}</strong>? This action is permanent and all associated simulation progress will be lost.
          </p>

          <DialogFooter className="pt-2 flex gap-2">
            <Button
              variant="outline"
              className="h-9 font-bold text-xs border-neutral-250 bg-white"
              onClick={() => {
                setIsDeleteConfirmOpen(false)
                setUserToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              className="h-9 font-black bg-red-650 text-white hover:bg-red-700 text-xs"
              onClick={confirmDelete}
            >
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UserManager
