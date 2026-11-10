"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { MikdexBrand } from "@/components/mikdex-brand";
import AuthBackgroundShape from "@/components/auth-background-shape";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";

export default function Login() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      if (data.authenticated) router.push("/");
    } catch {
      // Stay on the sign-in screen when the auth check is unavailable.
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute" aria-hidden="true"><AuthBackgroundShape /></div>
      <Card className="z-1 w-full gap-6 py-6 sm:max-w-lg">
        <CardHeader className="gap-6 px-6">
          <div className="flex items-center gap-3">
            <MikdexBrand />
          </div>
          <div>
            <CardTitle className="mb-2 text-2xl font-semibold">Sign in to Mikdex Finance</CardTitle>
            <CardDescription className="text-base">Manage your freelance income and expenses.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field className="gap-2">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </Field>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Signing in…" : "Sign in"}</Button>
          </form>
          <p className="text-muted-foreground mt-6 flex items-center justify-center gap-1.5 text-sm"><LockKeyhole className="size-3.5" /> Private workspace</p>
        </CardContent>
      </Card>
    </div>
  );
}
