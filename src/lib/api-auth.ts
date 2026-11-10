import { NextRequest, NextResponse } from "next/server";

export function requireAuthenticatedRequest(request: NextRequest): NextResponse | null {
  if (request.cookies.get("auth")?.value === "true") return null;
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}
