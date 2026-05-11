import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { OfflineBanner } from "@/components/layout/offline-banner";
import { PwaRegistry } from "@/components/pwa-registry";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Rapunsel & Energio Manager",
    template: "%s | Rapunsel & Energio Manager",
  },
  description:
    "Sistem manajemen layanan untuk Rapunsel Salon dan Energio Reflexologi.",
  applicationName: "Rapunsel & Energio Manager",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rapunsel & Energio",
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  icons: {
    apple: "/icons/app-icon.jpeg",
    icon: "/icons/app-icon.jpeg",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${cormorantGaramond.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegistry />
        <OfflineBanner />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
