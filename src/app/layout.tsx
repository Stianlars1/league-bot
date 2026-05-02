import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import styles from "./layout.module.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Counter — Live draft coach",
  description:
    "Live tactical recommendations against your opponent's team in League of Legends and Dota 2. Real-time, public APIs only.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <div className={styles.shell}>{children}</div>
      </body>
    </html>
  );
}
