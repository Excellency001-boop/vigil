import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://vigil-gules.vercel.app"),
  title: "Vigil · the watch that never closes",
  description:
    "A 24/7 non-custodial guard for tokenized stocks on Solana. Wall Street closes; your xStocks do not. Vigil watches the live Pyth feed and acts on your rules while your broker is dark. Your wallet signs every action; Vigil never holds keys or funds.",
  applicationName: "Vigil",
  keywords: [
    "Solana",
    "tokenized stocks",
    "xStocks",
    "stop loss",
    "Jupiter",
    "Pyth",
    "non-custodial",
    "24/7 trading",
  ],
  openGraph: {
    title: "Vigil · the watch that never closes",
    description:
      "24/7 non-custodial guard for tokenized stocks on Solana. Wall Street closes; your xStocks do not.",
    url: "https://vigil-gules.vercel.app",
    siteName: "Vigil",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Vigil · the watch that never closes",
    description: "24/7 non-custodial guard for tokenized stocks on Solana.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">{children}</body>
    </html>
  );
}
