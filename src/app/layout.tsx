import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GameProvider } from "@/context/GameContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-hind" });

export const metadata: Metadata = {
  title: {
    template: "%s | Shikhar",
    default: "Shikhar",
  },
  description: "An Indian rarity-trivia climbing game. Climb Kanchenjunga with rare answers.",
  keywords: [
    "trivia game",
    "Indian trivia",
    "rarity game",
    "climbing game",
    "Kanchenjunga",
    "Shikhar game",
  ],
  authors: [{ name: "Shikhar" }],
  creator: "Shikhar",
  publisher: "Shikhar",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://shikhar.example"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Shikhar",
    title: "Shikhar - Indian Rarity-Trivia Climbing Game",
    description: "Name any real answer to Indian trivia prompts. Score rarer answers higher and climb Kanchenjunga.",
    images: [
      {
        url: "/images/og-shikhar.png",
        width: 1200,
        height: 630,
        alt: "Shikhar - Climb Kanchenjunga with rare answers",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shikhar - Indian Rarity-Trivia Climbing Game",
    description: "Name any real answer to Indian trivia prompts. Score rarer answers higher and climb Kanchenjunga.",
    images: ["/images/og-shikhar.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
