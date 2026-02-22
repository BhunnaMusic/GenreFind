import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrackSource — DJ Metadata Hub",
  description:
    "A comprehensive metadata hub for DJs and producers. Aggregates BPM, Camelot key, energy, lyrics, backstory and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
