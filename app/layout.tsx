import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Calculadora de preços",
  description: "Margem, simulação e aprovação de preços especiais.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Preços MK", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f5f6f8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${plex.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
