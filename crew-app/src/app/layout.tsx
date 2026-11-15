import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CrewProvider } from "@/components/crew-provider";
import { SiteHeader } from "@/components/site-header";
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
  title: "SageCare Crew Dashboard",
  description: "Deep-space health monitoring dashboard for astronaut crews.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <CrewProvider>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <footer className="mx-auto w-full max-w-7xl px-4 pb-6 pt-2 text-center text-xs text-slate-500 sm:px-6 lg:px-10">
            SageCare · Crew health overview · Demo data is stored on this device
          </footer>
        </CrewProvider>
      </body>
    </html>
  );
}
