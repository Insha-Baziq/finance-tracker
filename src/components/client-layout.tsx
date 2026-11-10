"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { AppFooter } from "@/components/app-footer";
import { CurrencyProvider } from "@/components/currency-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <CurrencyProvider>
      {pathname === "/login" ? (
        <div className="min-h-screen">{children}</div>
      ) : (
        <SidebarProvider defaultOpen>
          <div className="flex h-full w-full min-w-0">
            <AppSidebar />
            <SidebarInset className="flex flex-1 flex-col">
              <AppHeader />
              <main className="mx-auto size-full max-w-360 flex-1 px-4 pt-6 pb-24 sm:px-6 sm:py-6">
                {children}
              </main>
              <AppFooter />
            </SidebarInset>
          </div>
        </SidebarProvider>
      )}
    </CurrencyProvider>
  );
}
