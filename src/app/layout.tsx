import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DevtoolsProtection } from "@/components/devtools-protection";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CyberLearn — Quiz Cybersécurité Multijoueur",
  description:
    "Plateforme premium de quiz cybersécurité en temps réel. Rejoignez une partie avec un code et un pseudo.",
  keywords: ["cybersécurité", "quiz", "multijoueur", "kahoot", "pentest"],
};

export const viewport: Viewport = {
  themeColor: "#050510",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-cyber-bg text-white min-h-screen`}
      >
        <DevtoolsProtection />
        {children}

        <a
          href="https://discord.gg/cyberlearn"
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-50 rounded-full border border-white/10 bg-black/90 px-4 py-2 text-sm font-medium text-white shadow-[0_0_18px_rgba(255,255,255,0.18)] transition-all duration-300 hover:scale-[1.02] hover:bg-black"
          aria-label="Rejoindre le Discord CyberLearn"
        >
          Discord
        </a>
      </body>
    </html>
  );
}
