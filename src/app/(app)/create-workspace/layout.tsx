import "../../slack-theme.css"
import { ThemeProvider } from "@/providers/theme-provider"
import { FontInjector } from "@/components/font-injector"
import { ThemeScope } from "@/components/theme-scope"
import { defaultTheme } from "@/stores/useThemeStore"

export default function CreateWorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeScope scope="create-workspace" initialTheme={defaultTheme}>
        <FontInjector />
        {children}
      </ThemeScope>
    </ThemeProvider>
  )
}
