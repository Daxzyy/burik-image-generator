import type { Metadata } from "next";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://burik.givy.eu.cc";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Burik Image Generator",
  description: "Mengubah foto lu jadi burik kaya epep 😂",
  openGraph: {
    title: "Burik Image Generator",
    description: "Mengubah foto lu jadi burik kaya epep 😂",
    url: BASE_URL,
    siteName: "Burik Image Generator",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Burik Image Generator",
    description: "Mengubah foto lu jadi burik kaya epep 😂",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
