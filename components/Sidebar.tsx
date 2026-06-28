"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, CheckSquare, Folder, Home, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ orgName, userName, userEmail }: { orgName: string; userName: string; userEmail: string }) {
  const pathname = usePathname();
  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <div className="px-5 py-5 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">C</div>
          <div>
            <div className="text-sm font-semibold leading-tight">Task Tracker</div>
            <div className="text-xs text-muted-foreground leading-tight">{orgName}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t">
        <div className="px-2 py-2">
          <div className="text-xs font-medium truncate">{userName}</div>
          <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
