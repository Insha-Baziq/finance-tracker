import * as webpush from "web-push";
import { getPushSubscriptions, removePushSubscription, type StoredPushSubscription } from "@/lib/redis";

export interface AppPushMessage {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function isWebPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function sendPushToSubscribers(message: AppPushMessage) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return { configured: false, sent: 0 };

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "https://mikdexfinance.vercel.app",
    publicKey,
    privateKey,
  );

  const subscriptions = await getPushSubscriptions();
  const payload = JSON.stringify(message);
  let sent = 0;

  await Promise.all(subscriptions.map(async (subscription: StoredPushSubscription) => {
    try {
      await webpush.sendNotification(subscription, payload, { TTL: 60 * 60, urgency: "normal" });
      sent += 1;
    } catch (error) {
      const statusCode = typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : undefined;

      if (statusCode === 404 || statusCode === 410) {
        await removePushSubscription(subscription.endpoint);
      } else {
        console.error("Could not send web push notification:", error);
      }
    }
  }));

  return { configured: true, sent };
}
