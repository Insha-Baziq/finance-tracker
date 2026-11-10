"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  Heart,
  Plus,
  Receipt,
  UsersRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { MikdexBrand } from "@/components/mikdex-brand";
const navGroups = [
  {
    label: "Dashboard & Layouts",
    items: [{ href: "/", label: "Dashboard", icon: ChartNoAxesCombined }],
  },
  {
    label: "Finance",
    items: [
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/reimbursements", label: "Reimbursements", icon: Receipt },
      { href: "/clients", label: "Clients", icon: UsersRound },
      { href: "/charity", label: "Charity", icon: Heart },
    ],
  },
  {
    label: "Actions",
    items: [{ href: "/add", label: "Add transaction", icon: Plus }],
  },
];
function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
export function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="Mikdex AI Finance Tracker"
              className="gap-2.5 bg-transparent!"
            >
              <Link href="/">
                <MikdexBrand />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="group-data-[collapsible=icon]:overflow-y-auto">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/50 tracking-wider uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(pathname, href)}
                      tooltip={label}
                      className="data-active:bg-primary/10!"
                    >
                      <Link href={href}>
                        <Icon />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
