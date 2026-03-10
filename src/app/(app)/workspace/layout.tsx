import { ThemeProvider } from "next-themes"

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