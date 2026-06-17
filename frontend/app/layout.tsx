import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans-next",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif-next",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BorderlessBridge — Embassy Proof of Funds Support",
  description:
    "Fast, confidential, and professionally managed Proof of Funds support for study, work, and travel visa applications. Meet embassy requirements without tying up your savings.",
  keywords: [
    "proof of funds",
    "embassy proof of funds",
    "visa application support",
    "study visa proof of funds",
    "work visa POF",
    "travel visa financial documentation",
    "BorderlessBridge",
  ],
  openGraph: {
    title: "BorderlessBridge — Embassy Proof of Funds Support",
    description:
      "Meet embassy Proof of Funds requirements without tying up your savings. Fast, confidential, professionally managed.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0d1b2e" />
      </head>
      <body>{children}</body>
    </html>
  );
}

