import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Web3Provider } from "@/providers/Web3Provider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: {
    default: "Circlo",
    template: "%s | Circlo",
  },
  description: "Tokenize Your Circle, Turn Predictions into Real Goals",
  openGraph: {
    title: "Circlo",
    description: "Tokenize Your Circle, Turn Predictions into Real Goals",
    type: "website",
    siteName: "Circlo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Circlo",
    description: "Tokenize Your Circle, Turn Predictions into Real Goals",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Web3Provider>{children}</Web3Provider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1a1a1a",
              color: "#ffffff",
              border: "none",
              borderRadius: "9999px",
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: 500,
            },
          }}
        />
      </body>
    </html>
  );
}
