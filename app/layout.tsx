import type { Metadata } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth/auth-provider"
import { IOSAppPromotion } from "@/components/layout/ios-app-banner"
import { MotionProvider } from "@/components/fx/motion-provider"
import { AccentColorProvider } from "@/components/accent-color-provider"
import { UsernameOnboarding } from "@/components/auth/username-onboarding"
import { Toaster } from "sonner"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

export const metadata: Metadata = {
  title: "amer.lol",
  description: "A premium, playful hub website hosting multiple mini-apps",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AccentColorProvider>
              <MotionProvider>
                <IOSAppPromotion />
                {children}
                <UsernameOnboarding />
                <Toaster position="bottom-right" />
              </MotionProvider>
            </AccentColorProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
