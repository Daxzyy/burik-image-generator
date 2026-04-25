import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Burik Image Generator",
  description: "Mengubah foto lu jadi burik kaya epep 😂",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
