import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3600";
const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Amplified Traders";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Amplified Traders — Your Trading. Your Network. Amplified.",
    template: "%s · Amplified Traders",
  },
  description:
    "Amplified Traders is a modern trading ecosystem connecting traders and investors through copy trading, structured investment packages, referral networking, and a global trader community.",
  applicationName: siteName,
  keywords: [
    "trading community",
    "copy trading",
    "traders network",
    "investment packages",
    "referral network",
    "trading education",
    "amplified traders",
  ],
  authors: [{ name: siteName }],
  openGraph: {
    type: "website",
    siteName,
    title: "Amplified Traders — Your Trading. Your Network. Amplified.",
    description:
      "A modern trading ecosystem — copy trading, investment packages, referral networking, and a global trader community in one platform.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Amplified Traders — Your Trading. Your Network. Amplified.",
    description:
      "A modern trading ecosystem — copy trading, investment packages, referral networking, and a global trader community in one platform.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0e1013",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Reveal animations start hidden; without JS they must never stay hidden. */}
        <noscript>
          <style>{`.reveal{opacity:1 !important;transform:none !important;}`}</style>
        </noscript>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "#1a1e24",
              border: "1px solid rgba(195,203,214,0.24)",
              color: "#ffffff",
            },
          }}
        />
      </body>
    </html>
  );
}
