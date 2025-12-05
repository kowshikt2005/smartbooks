import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KSolutions - Accounting & Inventory Management",
  description: "Comprehensive web-based accounting and inventory management application for small to medium businesses",
  keywords: ["accounting", "inventory", "invoicing", "business management", "KSolutions"],
  authors: [{ name: "Sri Balaji Enterprises Team" }],
  creator: "Sri Balaji Enterprises",
  publisher: "Sri Balaji Enterprises",
  robots: "index, follow",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ksolutions.app",
    title: "KSolutions - Accounting & Inventory Management",
    description: "Comprehensive web-based accounting and inventory management application for small to medium businesses",
    siteName: "KSolutions",
  },
  twitter: {
    card: "summary_large_image",
    title: "KSolutions - Accounting & Inventory Management",
    description: "Comprehensive web-based accounting and inventory management application for small to medium businesses",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <div id="root">
            {children}
          </div>
          <div id="modal-root" />
          <div id="toast-root" />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#10b981',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
