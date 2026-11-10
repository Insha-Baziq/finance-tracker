import { NextRequest, NextResponse } from "next/server";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/redis";

export async function GET() {
  try {
    const notifications = await getNotifications();
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error getting notifications:", error);
    return NextResponse.json({ error: "Failed to get notifications" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, markAllRead } = body;

    if (markAllRead) {
      await markAllNotificationsRead();
      return NextResponse.json({ success: true });
    }

    if (id) {
      await markNotificationRead(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 });
  }
}
