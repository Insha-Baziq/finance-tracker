import { NextRequest, NextResponse } from "next/server";
import { removePushSubscription, savePushSubscription, type StoredPushSubscription } from "@/lib/redis";

function isAuthenticated(request: NextRequest) {
  return request.cookies.get("auth")?.value === "true";
}

function parseSubscription(value: unknown): StoredPushSubscription | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Partial<StoredPushSubscription>;
  if (typeof candidate.endpoint !== "string" || candidate.endpoint.length > 4096) return null;

  try {
    if (new URL(candidate.endpoint).protocol !== "https:") return null;
  } catch {
    return null;
  }

  if (
    !candidate.keys ||
    typeof candidate.keys.p256dh !== "string" ||
    typeof candidate.keys.auth !== "string" ||
    !candidate.keys.p256dh ||
    !candidate.keys.auth
  ) return null;
  if (candidate.expirationTime !== undefined && candidate.expirationTime !== null && typeof candidate.expirationTime !== "number") return null;

  return {
    endpoint: candidate.endpoint,
    expirationTime: candidate.expirationTime ?? null,
    keys: {
      p256dh: candidate.keys.p256dh,
      auth: candidate.keys.auth,
    },
  };
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body: unknown = await request.json();
    const subscription = typeof body === "object" && body !== null
      ? parseSubscription((body as { subscription?: unknown }).subscription)
      : null;
    if (!subscription) return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });

    await savePushSubscription(subscription);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    return NextResponse.json({ error: "Could not save push subscription" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body: unknown = await request.json();
    const endpoint = typeof body === "object" && body !== null
      ? (body as { endpoint?: unknown }).endpoint
      : null;
    if (typeof endpoint !== "string" || endpoint.length > 4096) {
      return NextResponse.json({ error: "Invalid push endpoint" }, { status: 400 });
    }

    await removePushSubscription(endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing push subscription:", error);
    return NextResponse.json({ error: "Could not remove push subscription" }, { status: 500 });
  }
}
