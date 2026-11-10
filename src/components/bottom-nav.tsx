"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ArrowLeftRight, Plus, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4 items-end h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-full touch-manipulation select-none",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-[10px]", isActive && "font-semibold")}>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/add"
          className="flex flex-col items-center justify-center gap-1 h-full touch-manipulation select-none"
        >
          <span
            className={cn(
              "flex h-11 w-11 -mt-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg",
            pathname === "/add" && "ring-4 ring-primary/20"
          )}
        >
            <Plus className="h-5 w-5" />
          </span>
          <span className={cn("text-[10px]", pathname === "/add" ? "text-primary font-semibold" : "text-muted-foreground")}>
            Add
          </span>
        </Link>
        <Link
          href="/clients"
          className={cn(
            "flex flex-col items-center justify-center gap-1 h-full touch-manipulation select-none",
            pathname === "/clients" || pathname.startsWith("/clients/") ? "text-primary" : "text-muted-foreground",
          )}
        >
          <UsersRound className="h-5 w-5" strokeWidth={pathname.startsWith("/clients") ? 2.5 : 2} />
          <span className={cn("text-[10px]", pathname.startsWith("/clients") && "font-semibold")}>Clients</span>
        </Link>
      </div>
    </nav>
  );
}
