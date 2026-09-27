import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  metadataBase: new URL("https://www.creatorretentioncoach.in"),
  title: "Creator Retention Coach | Retention Intelligence for Short-Form Creators",
  description:
    "Make your scripts harder to scroll past. Spot weak opening lines, predict the exact second viewers swipe away, and get 3 retention rewrites before filming.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Creator Retention Coach | Retention Intelligence for Short-Form Creators",
    description:
      "Make your scripts harder to scroll past. Spot weak opening lines, predict the exact second viewers swipe away, and get 3 retention rewrites before filming.",
    url: "https://www.creatorretentioncoach.in",
    siteName: "Creator Retention Coach",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Creator Retention Coach | Retention Intelligence for Short-Form Creators",
    description:
      "Make your scripts harder to scroll past. Spot weak opening lines, predict the exact second viewers swipe away, and get 3 retention rewrites before filming.",
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
  keywords: [
    "script retention",
    "short-form video scripts",
    "YouTube Shorts retention",
    "Instagram Reels hooks",
    "TikTok script analyzer",
    "video drop-off prediction",
  ],
  verification: {
    google: "lyZqHqv-vLKlB2nQkvCTMF5D7MyxM2hS1HWK6uMyCrA",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Creator Retention Coach",
  url: "https://www.creatorretentioncoach.in/",
  logo: "https://www.creatorretentioncoach.in/logo.png",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100`}
      >
        {children}
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
