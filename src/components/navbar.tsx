"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/components/currency-provider";
import { Menu, X, DollarSign } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/clients", label: "Clients" },
  { href: "/add", label: "Add New" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const { currency, setCurrency, exchangeRate, setExchangeRate } = useCurrency();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <DollarSign className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold">Finance</span>
          </Link>

          <div className="hidden md:flex gap-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={isActivePath(pathname, item.href) ? "secondary" : "ghost"}
                size="sm"
                asChild
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <div className="flex rounded-md bg-muted p-0.5">
            <Button
              variant={currency === "USD" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3"
              onClick={() => setCurrency("USD")}
            >
              USD
            </Button>
            <Button
              variant={currency === "PKR" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3"
              onClick={() => setCurrency("PKR")}
            >
              PKR
            </Button>
          </div>
          <input
            type="number"
            className="w-16 h-7 text-sm border rounded-md bg-background px-2 focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="Rate"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 280)}
            title="Exchange rate (USD to PKR)"
          />
        </div>

        <button
          className="md:hidden flex h-11 w-11 items-center justify-center -mr-2 hover:bg-muted rounded-md touch-manipulation"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isMenuOpen && (
        <div ref={menuRef} className="md:hidden border-t bg-background animate-in slide-in-from-top-2">
          <div className="mx-auto w-full max-w-6xl px-3 py-4 space-y-4">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant={isActivePath(pathname, item.href) ? "secondary" : "ghost"}
                  className="justify-start h-11"
                  asChild
                >
                  <Link href={item.href} onClick={() => setIsMenuOpen(false)}>
                    {item.label}
                  </Link>
                </Button>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Currency</span>
                <div className="flex rounded-md bg-muted p-0.5">
                  <Button
                    variant={currency === "USD" ? "default" : "ghost"}
                    size="sm"
                    className="h-9 px-5"
                    onClick={() => setCurrency("USD")}
                  >
                    USD
                  </Button>
                  <Button
                    variant={currency === "PKR" ? "default" : "ghost"}
                    size="sm"
                    className="h-9 px-5"
                    onClick={() => setCurrency("PKR")}
                  >
                    PKR
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Exchange Rate</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-28 h-10 text-base border rounded-md bg-background px-3 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Rate"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 280)}
                  title="Exchange rate (USD to PKR)"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
