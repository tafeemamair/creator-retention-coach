import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const siteUrl = "https://www.creatorretentioncoach.in";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Creator Retention Coach — Improve Your Short-Form Scripts",
    template: "%s | Creator Retention Coach",
  },
  description:
    "Analyze your YouTube Shorts, Instagram Reels, and TikTok scripts before you film. Find retention risks, estimated drop-off points, and practical ways to improve your script.",
  keywords: [
    "short-form script analyzer",
    "YouTube Shorts script analyzer",
    "TikTok script analyzer",
    "Instagram Reels script analyzer",
    "script retention analysis",
    "hook analyzer",
    "creator script analysis",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Creator Retention Coach",
    title: "Creator Retention Coach — Improve Your Short-Form Scripts",
    description:
      "Find where your YouTube Shorts, Reels, or TikTok script may lose viewers before you hit record.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Creator Retention Coach — Improve Your Short-Form Scripts",
    description:
      "Analyze your short-form script before filming and find potential retention risks.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
