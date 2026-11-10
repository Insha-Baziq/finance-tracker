"use client";
import { Fragment } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleDollarSign, LogOut } from "lucide-react";
import { useCurrency } from "@/components/currency-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { PushNotificationsMenuItem } from "@/components/push-notifications-menu-item";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
function getBreadcrumbs(pathname: string) {
  if (pathname.startsWith("/transactions/")) return [{ label: "Transactions", href: "/transactions" }, { label: "Details" }];
  if (pathname.startsWith("/clients/")) return [{ label: "Clients", href: "/clients" }, { label: decodeURIComponent(pathname.split("/").at(-1) || "Client") }];
  if (pathname === "/charity/monthly-ledger") return [{ label: "Charity", href: "/charity" }, { label: "Monthly ledger" }];
  if (pathname.startsWith("/edit/")) return [{ label: "Transactions", href: "/transactions" }, { label: "Edit transaction" }];
  if (pathname === "/add") return [{ label: "Transactions", href: "/transactions" }, { label: "Add transaction" }];
  if (pathname === "/transactions") return [{ label: "Transactions" }];
  if (pathname === "/clients") return [{ label: "Clients" }];
  if (pathname === "/charity") return [{ label: "Charity" }];
  return [{ label: "Dashboard" }];
}
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const breadcrumbs = getBreadcrumbs(pathname);
  const { currency, setCurrency, exchangeRate, setExchangeRate } = useCurrency();
  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };
  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="mx-auto flex max-w-360 items-center justify-between gap-6 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <SidebarTrigger className="[&_svg]:size-5!" />
          <Separator orientation="vertical" className="hidden h-4! data-vertical:self-center sm:block" />
          <Breadcrumb className="hidden min-w-0 sm:block">
            <BreadcrumbList className="flex-nowrap">
              {breadcrumbs.map((item, index) => (
                <Fragment key={`${item.label}-${index}`}>
                  <BreadcrumbItem className="min-w-0">
                    {item.href ? <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink> : <BreadcrumbPage className="truncate">{item.label}</BreadcrumbPage>}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label="Display currency">
                <CircleDollarSign />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-50">
              <DropdownMenuRadioGroup value={currency} onValueChange={(value) => setCurrency(value as "USD" | "PKR")}>
                <DropdownMenuRadioItem value="USD">USD · US dollar</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="PKR">PKR · Pakistani rupee</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              {currency === "PKR" && (
                <>
                  <DropdownMenuSeparator />
                  <div className="space-y-2 px-2 py-2">
                    <label htmlFor="header-exchange-rate" className="text-xs text-muted-foreground">USD to PKR rate</label>
                    <Input
                      id="header-exchange-rate"
                      type="number"
                      min="1"
                      step="0.01"
                      className="h-8 px-2 text-xs"
                      value={exchangeRate}
                      onChange={(event) => setExchangeRate(Number(event.target.value) || 280)}
                    />
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account menu" className="relative rounded-full hover:bg-transparent">
                <Avatar>
                  <AvatarFallback>FT</AvatarFallback>
                </Avatar>
                <span className="ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center gap-4 px-2 py-2.5 font-normal">
                  <div className="relative">
                    <Avatar className="size-10">
                      <AvatarFallback>FT</AvatarFallback>
                    </Avatar>
                    <span className="ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2" />
                  </div>
                  <div className="flex flex-1 flex-col items-start">
                    <span className="text-base font-semibold text-foreground">Personal account</span>
                    <span className="text-sm text-muted-foreground">Finance workspace</span>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <PushNotificationsMenuItem />
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onSelect={() => void handleLogout()}>
                  <LogOut />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
