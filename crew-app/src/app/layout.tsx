import type { Metadata } from "next";
import { CrewProvider } from "@/components/providers/crew-provider";
import { HealthReminderToast } from "@/components/app-shell/health-reminder-toast";
import { SiteHeader } from "@/components/app-shell/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "SageCare Crew Dashboard",
  description: "Deep-space health monitoring dashboard for astronaut crews.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <CrewProvider>
          <SiteHeader />
          <HealthReminderToast />
          <div className="flex-1">{children}</div>
          <footer className="mx-auto w-full max-w-7xl px-4 pb-6 pt-2 text-center text-xs text-slate-500 sm:px-6 lg:px-10">
            SageCare · Crew health overview · Sample profiles; records saved on this server
          </footer>
        </CrewProvider>
      </body>
    </html>
  );
}
