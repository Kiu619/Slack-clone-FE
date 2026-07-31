import "../../slack-theme.css"
import "./globals.css"
import { ThemeProvider } from "@/providers/theme-provider"

export default function MainLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ThemeProvider
      attribute='class'
      defaultTheme='system'
      enableSystem
      disableTransitionOnChange
    >

      <div className="workspace-theme fixed inset-0 flex min-h-0 w-screen flex-col overflow-hidden bg-workspace-background">
        {children}
      </div>
    </ThemeProvider>
  )
}
