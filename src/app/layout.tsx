import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Noto_Sans_KR } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { DesktopSidebar, MobileHeader } from "@/components/layout/sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { AiAssistant } from "@/components/layout/ai-assistant";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "업무일지",
  description: "AI 기반 업무 관리 · 트랙 · 통계를 한 곳에",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "업무일지",
    startupImage: "/icon",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "application-name": "업무일지",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const secret = process.env.API_SECRET;
  const cookieStore = await cookies();
  const isAuthenticated = !secret || cookieStore.get("auth-token")?.value === secret;

  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${notoSansKR.className}`}>
        <ThemeProvider>
          {isAuthenticated ? (
            <div className="flex min-h-screen">
              <DesktopSidebar />
              <div className="flex flex-1 flex-col">
                <MobileHeader />
                <main className="flex-1 px-4 py-6 pb-28 md:px-10 md:py-8 md:pb-8">
                  <div className="mx-auto max-w-5xl animate-fade-in-up">
                    {children}
                  </div>
                </main>
                <MobileBottomNav />
              </div>
              <CommandPalette />
              <AiAssistant />
            </div>
          ) : (
            children
          )}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
