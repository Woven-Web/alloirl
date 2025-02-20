import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import Link from "next/link";
import { AlloLogo } from "@/components/allo-logo";
import { Toaster } from 'react-hot-toast';
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "alloirl",
  description: "allocate resources irl",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="" suppressHydrationWarning>
        <Toaster position="top-center" />
        <main className="min-h-screen flex flex-col">
          <nav className="w-full flex justify-between items-center p-4">
            <div className="w-full max-w-5xl mx-auto flex justify-between items-center">
              <Link href="/" className="text-brand-blue">
                <AlloLogo width={32} height={32} />
              </Link>
              {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
            </div>
          </nav>
          <div className="flex-1 w-full max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
