import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Mess — Hostel & Mess Management",
  description:
    "Multi-role Mess/Hostel Management System. Manage students, rooms, billing, expenses, and financial reports.",
  keywords: [
    "Smart Mess",
    "Hostel Management",
    "Mess Management",
    "Student Accommodation",
    "Bangladesh",
  ],
  authors: [{ name: "Smart Mess" }],
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
  openGraph: {
    title: "Smart Mess",
    description: "Hostel & Mess Management System",
    siteName: "Smart Mess",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
