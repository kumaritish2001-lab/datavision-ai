
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataVision AI | Intelligent Business Analytics",
  description:
    "Transform business data into accurate, interactive dashboards and actionable insights.",
  applicationName: "DataVision AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
