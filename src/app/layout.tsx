import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lunar Holdmanager",
  description: "Holdets kampe, tilgængelighed og sæson samlet ét sted.",
  applicationName: "Lunar Holdmanager",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Lunar Hold" },
};

export const viewport: Viewport = {
  themeColor: "#f4f6f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
