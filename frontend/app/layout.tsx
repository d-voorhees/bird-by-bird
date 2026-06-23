import type { Metadata } from "next";

import Script from "next/script";

import { Providers } from "@/components/Providers";
import { ToastHost } from "@/components/ToastHost";

import "./globals.css";

export const metadata: Metadata = {
  title: "Bird",
  description: "One task at a time.",
  icons: {
    icon: "/img/Artboard7.svg",
    shortcut: "/img/Artboard7.svg",
    apple: "/img/Artboard7.svg",
  },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("bird-theme");document.documentElement.classList.toggle("dark",t==="dark");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="geist-mono">
        <Providers>
          {children}
          <ToastHost />
        </Providers>
      </body>
    </html>
  );
}
