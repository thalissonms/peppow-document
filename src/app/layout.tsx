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
  title: "Gerador de PDF Padronizado",
  description:
    "Envie documentos DOCX e receba um PDF com o layout padronizado da marca.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#FFF9D5] min-w-full" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}
        suppressHydrationWarning
      >
        {/* Top Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-[5px] bg-linear-to-r from-[#ff5e2b] to-[#ff7e4d] opacity-60" />
        {children}
      </body>
    </html>
  );
}
