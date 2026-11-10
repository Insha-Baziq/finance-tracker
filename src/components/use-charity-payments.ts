"use client";

import { useCallback, useEffect, useState } from "react";
import type { CharityPayment } from "@/lib/charity";

export function useCharityPayments() {
  const [payments, setPayments] = useState<CharityPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/charity", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load charity payment history.");
      setPayments(await response.json());
    } catch (loadError) {
      console.error("Error loading charity payments:", loadError);
      setError("Could not load charity payment history.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addPayment = useCallback((payment: CharityPayment) => {
    setPayments((current) => [payment, ...current]);
  }, []);

  const updatePayment = useCallback((payment: CharityPayment) => {
    setPayments((current) => current.map((item) => item.id === payment.id ? payment : item));
  }, []);

  return { payments, isLoading, error, refresh, addPayment, updatePayment };
}
