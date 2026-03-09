import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import {
  Moon,
  Sun,
  LayoutDashboard,
  GitBranch,
  Timer,
  Swords,
  Medal,
  LogOut,
  Award,
  ChevronDown,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VennLogo } from "@/components/VennLogo";

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const { theme, setTheme } = useTheme();
  const { signOut, user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "roadmaps", label: "My Roadmaps", icon: GitBranch },
    { id: "sessions", label: "Study Sessions", icon: Timer },
    { id: "certifications", label: "Certifications", icon: Award },
    { id: "battleground", label: "Battleground", icon: Swords },
    { id: "achievements", label: "Achievements", icon: Medal },
  ];

  // Get initials from email for avatar
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "?";

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-gradient-card border-b border-border sticky top-0 z-50 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center space-x-8">
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="w-9 h-9 flex items-center justify-center text-primary">
            <VennLogo className="w-9 h-9" />
          </div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            Luminary
          </h1>
        </div>

        {/* Nav Items */}
        <div className="flex space-x-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-orange"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-8 h-8 p-0 rounded-full hover:bg-muted/60"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Moon className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        {/* User avatar dropdown */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            >
              {/* Avatar circle */}
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {initials}
                </span>
              </div>
              <span className="text-xs text-muted-foreground max-w-[120px] truncate hidden sm:block">
                {user.email}
              </span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-muted-foreground transition-transform",
                  dropdownOpen && "rotate-180",
                )}
              />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                {/* User info */}
                <div className="px-3 py-2.5 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">Learner</p>
                    </div>
                  </div>
                </div>

                {/* Sign out */}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
