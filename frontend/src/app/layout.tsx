import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider, Show, SignInButton, UserButton } from "@clerk/nextjs";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Emaki — Turn anyone into a manga",
  description: "Upload a photo, describe someone, get a full AI-generated manga with voice narration and soundtrack.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Emaki — Turn anyone into a manga",
    description: "Upload a photo, describe someone, get a full AI-generated manga with voice narration and soundtrack.",
    url: "https://emaki.app",
    siteName: "Emaki",
    images: [{ url: "https://emaki.app/og-image.png", width: 2048, height: 1152 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Emaki — Turn anyone into a manga",
    description: "Upload a photo, describe someone, get a full AI-generated manga with voice narration and soundtrack.",
    images: ["https://emaki.app/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geist.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-black text-white">{children}</body>
      </html>
    </ClerkProvider>
  );
}
