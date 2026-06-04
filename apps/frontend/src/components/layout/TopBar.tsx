import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { INDUSTRIES } from "@/lib/constants"
import { useAuthStore } from "@/stores/authStore"
import type { UserRole } from "@/types"
import { ChevronDown, Calendar, GraduationCap, User } from "lucide-react"

export function TopBar() {
  const { user, setUser } = useAuthStore()
  const [currency, setCurrency] = useState<"USD" | "INR">("USD")
  const [selectedIndustry, setSelectedIndustry] = useState<string>("E-commerce")

  const handleRoleChange = (role: UserRole) => {
    if (user) {
      setUser({ ...user, role })
    }
  }

  return (
    <header className="h-16 border-b border-neutral-200 bg-white px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
      {/* Simulation Day Status */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-neutral-100 text-neutral-900 border-none">
          <Calendar className="h-3.5 w-3.5 text-neutral-500" />
          <span>Day 15 / 30</span>
        </Badge>
      </div>

      {/* Global Configuration Controls */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Industry Selector */}
        <div className="hidden sm:block">
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger className="w-[180px] h-9 text-xs font-medium border-neutral-200">
              <SelectValue placeholder="Select Industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((industry) => (
                <SelectItem key={industry} value={industry} className="text-xs">
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Currency Toggle */}
        <div className="flex items-center gap-2">
          <Tabs
            value={currency}
            onValueChange={(val) => setCurrency(val as "USD" | "INR")}
            className="h-9"
          >
            <TabsList className="h-9 p-0.5 bg-neutral-100 border border-neutral-200/50">
              <TabsTrigger value="USD" className="h-8 text-xs font-semibold px-3 py-1 data-[state=active]:bg-white data-[state=active]:text-neutral-900">
                USD ($)
              </TabsTrigger>
              <TabsTrigger value="INR" className="h-8 text-xs font-semibold px-3 py-1 data-[state=active]:bg-white data-[state=active]:text-neutral-900">
                INR (₹)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Vertical divider */}
        <div className="h-5 w-[1px] bg-neutral-200 hidden xs:block" />

        {/* User Account Menu & Role Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-neutral-50 p-1.5 rounded-full transition-colors focus:outline-none shrink-0 border border-neutral-100">
              <div className="h-8 w-8 rounded-full bg-neutral-950 flex items-center justify-center text-white text-xs font-bold font-sans">
                {user?.name.substring(0, 2).toUpperCase() || "JD"}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-neutral-800 leading-none">
                  {user?.name || "User"}
                </span>
                <span className="text-[10px] font-semibold text-neutral-400 capitalize">
                  {user?.role || "student"}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-neutral-400 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-neutral-900">{user?.name}</p>
                <p className="text-xs text-neutral-500">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Quick Demo Role Switcher */}
            <DropdownMenuLabel className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
              Switch Role (Demo)
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="cursor-pointer text-xs flex items-center gap-2"
              onClick={() => handleRoleChange("individual")}
            >
              <User className="h-3.5 w-3.5" />
              <span>Student / Individual</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-xs flex items-center gap-2"
              onClick={() => handleRoleChange("instructor")}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Instructor Role</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem className="text-red-600 focus:text-red-700 cursor-pointer text-xs">
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
export default TopBar
