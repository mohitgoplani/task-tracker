import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Task Tracker",
  description: "Internal task tracker with calendar feed for your team",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
