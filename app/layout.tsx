import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Gershon.AI · Company",
  description: "Streak CRM pipeline tracking, priority objectives, monthly analytics",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-screen flex bg-[color:var(--bg)]">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </body>
    </html>
  );
}
