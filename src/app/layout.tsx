import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { QueryProvider } from "@/providers/query-provider"
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { I18nProvider } from "@/providers/I18nProvider"
import { cookies } from "next/headers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Slack",
  description: "Slack Clone",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.png",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const initialLocale = cookieStore.get("NEXT_LOCALE")?.value ?? "en"

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <I18nProvider initialLocale={initialLocale as "en" | "vi"}>
            <TooltipProvider>
              <Toaster />
              {children}
              <ReactQueryDevtools initialIsOpen={false} />
            </TooltipProvider>
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
