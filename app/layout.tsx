import type { Metadata } from "next";
import "./globals.css";
import { PW_EYE_JS } from "../lib/pw-eye";
import Sidebar from "@/components/Sidebar";
import { DemoProvider } from "@/lib/demo-context";

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
        <DemoProvider>
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
        </DemoProvider>
        <script dangerouslySetInnerHTML={{ __html: PW_EYE_JS }} />
      </body>
    </html>
  );
}
