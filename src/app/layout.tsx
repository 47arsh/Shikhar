import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-hind" });

export const metadata: Metadata = {
  title: "Shikhar",
  description: "An Indian rarity-trivia climbing game. Climb Kanchenjunga with rare answers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
