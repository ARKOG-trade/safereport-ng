import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#0B1F3A",
};

export const metadata: Metadata = {
  title: "SafeReport NG",
  applicationName: "SafeReport NG",
  description: "Anonymous and secure reporting platform for crime, emergencies, corruption, missing persons, and public safety concerns.",
  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SafeReport NG",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "SafeReport NG",
    title: "SafeReport NG - Anonymous. Secure. Trusted.",
    description: "Anonymous and secure reporting platform for crime, emergencies, corruption, missing persons, and public safety concerns.",
    url: "https://safereport.ng",
    images: [
      {
        url: "https://safereport.ng/og-image.png",
        width: 1200,
        height: 630,
        alt: "SafeReport NG - Anonymous. Secure. Trusted.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@SafeReportNG",
    creator: "@SafeReportNG",
    title: "SafeReport NG - Anonymous. Secure. Trusted.",
    description: "Anonymous and secure reporting platform for crime, emergencies, corruption, missing persons, and public safety concerns.",
    images: "https://safereport.ng/og-image.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} h-full antialiased min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
