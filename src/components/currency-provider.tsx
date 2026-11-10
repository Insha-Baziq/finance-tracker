"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Currency = "USD" | "PKR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  convert: (amount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => {
    if (typeof window === "undefined") return "USD";
    return (localStorage.getItem("currency") as Currency | null) || "USD";
  });
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    if (typeof window === "undefined") return 280;
    const savedRate = localStorage.getItem("exchangeRate");
    return savedRate ? parseFloat(savedRate) : 280;
  });

  useEffect(() => {
    fetch("/api/exchange-rate")
      .then(res => res.json())
      .then(data => {
        if (data.rate) {
          setExchangeRate(data.rate);
        }
      })
      .catch(console.error);
  }, []);

  const handleSetCurrency = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    localStorage.setItem("currency", newCurrency);
  };

  const handleSetExchangeRate = (rate: number) => {
    setExchangeRate(rate);
    localStorage.setItem("exchangeRate", rate.toString());
  };

  const convert = (amount: number) => {
    if (currency === "PKR") {
      return amount * exchangeRate;
    }
    return amount;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency: handleSetCurrency,
        exchangeRate,
        setExchangeRate: handleSetExchangeRate,
        convert,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
}
