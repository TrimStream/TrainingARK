import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Rajdhani } from 'next/font/google'
import { Providers } from "@/components/auth/Providers";

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-rajdhani',
})

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: {
        default: "TrainingARK",
        template: "%s | TrainingARK",
    },
    description: "Interactive scenario training for competitive Commander (cEDH).",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
       <html
          lang="en"
          className={`${geistSans.variable} ${geistMono.variable} ${rajdhani.variable} h-full antialiased`}
       >
       <body className="min-h-full flex flex-col">
       <Providers>
          {children}
       </Providers>
       <SpeedInsights />
       <Analytics />
       </body>
       </html>
    );
}