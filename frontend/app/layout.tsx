import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600;1,700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0d1b2e" />
      </head>
      <body>{children}</body>
    </html>
  );
}
