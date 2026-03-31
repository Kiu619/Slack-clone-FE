import { ThemeProvider } from "next-themes"
import "../../slack-theme.css"
import { FontInjector } from "@/components/font-injector"

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

      <div className="flex flex-col w-screen h-screen bg-workspace-background">
        {children}
      </div>
    </ThemeProvider>
  )
}