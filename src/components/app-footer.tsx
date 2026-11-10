import Link from "next/link";

export function AppFooter() {
  return (
    <footer>
      <div className="mx-auto flex size-full max-w-360 items-center justify-between gap-3 px-4 py-3 text-muted-foreground max-sm:flex-col sm:gap-6 sm:px-6">
        <p className="text-balance text-sm max-sm:text-center">
          ©{new Date().getFullYear()} <Link href="/" className="text-primary hover:underline">Finance Tracker</Link>, Personal finance workspace
        </p>
        <div className="flex items-center gap-5 max-sm:hidden">
          <Link href="/transactions" className="text-sm transition duration-300 hover:text-foreground">Transactions</Link>
          <Link href="/clients" className="text-sm transition duration-300 hover:text-foreground">Clients</Link>
          <Link href="/charity" className="text-sm transition duration-300 hover:text-foreground">Charity</Link>
          <Link href="/add" className="text-sm transition duration-300 hover:text-foreground">Add entry</Link>
        </div>
      </div>
    </footer>
  );
}
