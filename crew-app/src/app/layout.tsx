import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SageCare | Crew health",
  description: "A calm, context-rich health dashboard for deep-space crew.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
