import type { Metadata } from "next";
import "./globals.css";
import { SCHOOL } from "@/settings/config";

export const metadata: Metadata = {
  title: `${SCHOOL.name}`,
  description: `${SCHOOL.name} - Official website and school management portal.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
