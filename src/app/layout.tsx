import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/client-layout";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Track your Fiverr and Upwork income and expenses",
  icons: {
    icon: [
      { url: "/ft-logo.png", type: "image/png", sizes: "32x32" },
      { url: "/ft-logo.png", type: "image/png", sizes: "16x16" },
      { url: "/ft-logo.png", type: "image/png", sizes: "192x192" },
      { url: "/ft-logo.png", type: "image/png", sizes: "512x512" }
    ],
    apple: [
      { url: "/ft-logo.png", sizes: "180x180", type: "image/png" }
    ]
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} flex min-h-full w-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full w-full flex-auto flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
