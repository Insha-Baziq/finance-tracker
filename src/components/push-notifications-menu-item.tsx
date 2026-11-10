"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type PushControlState = "checking" | "off" | "on" | "unconfigured" | "unsupported" | "install-required" | "denied" | "error";

function isAppleMobileDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInstalledPwa() {
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || standaloneNavigator.standalone === true;
}

function base64UrlToBytes(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

export function PushNotificationsMenuItem() {
  const [state, setState] = useState<PushControlState>("checking");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkPushStatus() {
      try {
        if (isAppleMobileDevice() && !isInstalledPwa()) {
          if (!cancelled) setState("install-required");
          return;
        }
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
          if (!cancelled) setState("unsupported");
          return;
        }

        const keyResponse = await fetch("/api/push/public-key", { cache: "no-store" });
        const keyData: { publicKey?: string | null } = await keyResponse.json();
        if (!keyData.publicKey) {
          if (!cancelled) setState("unconfigured");
          return;
        }

        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const saveResponse = await fetch("/api/push/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: subscription.toJSON() }),
          });
          if (!saveResponse.ok) throw new Error("Could not sync this device’s notification subscription.");
        }

        if (!cancelled) {
          setPublicKey(keyData.publicKey);
          setState(subscription ? "on" : Notification.permission === "denied" ? "denied" : "off");
        }
      } catch (error) {
        console.error("Error checking push notification support:", error);
        if (!cancelled) setState("error");
      }
    }

    void checkPushStatus();
    return () => { cancelled = true; };
  }, []);

  const setNotificationsEnabled = async (enabled: boolean) => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      if (!enabled) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const response = await fetch("/api/push/subscriptions", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          if (!response.ok) throw new Error("Could not turn off notifications for this device.");
          await subscription.unsubscribe();
        }
        setState("off");
        return;
      }

      if (!publicKey) {
        setState("unconfigured");
        return;
      }
      if (isAppleMobileDevice() && !isInstalledPwa()) {
        setState("install-required");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(publicKey),
      });
      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!response.ok) throw new Error("Could not save this device’s notification subscription.");
      setState("on");
    } catch (error) {
      console.error("Error updating push notifications:", error);
      setState("error");
    } finally {
      setIsWorking(false);
    }
  };

  const description = state === "checking" || isWorking
    ? "Updating…"
    : state === "on"
      ? "On for this device"
      : state === "off"
        ? "Off"
        : state === "install-required"
          ? "Install this app on your iPhone or iPad to turn notifications on"
          : state === "unsupported"
            ? "Not supported by this browser"
            : state === "denied"
              ? "Allow notifications in your browser settings"
              : state === "unconfigured"
                ? "Notifications are not configured for this deployment"
                : "Could not update notification settings";

  const disabled = isWorking || state === "checking" || state === "unsupported" || state === "install-required" || state === "denied" || state === "unconfigured" || state === "error";

  return (
    <div className="flex items-center justify-between gap-3 px-2 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">Notifications</p>
        <p aria-live="polite" className="text-xs text-muted-foreground">{description}</p>
      </div>
      {isWorking || state === "checking" ? (
        <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <Switch
          aria-label="Notifications"
          checked={state === "on"}
          disabled={disabled}
          onCheckedChange={(checked) => void setNotificationsEnabled(checked)}
        />
      )}
    </div>
  );
}
