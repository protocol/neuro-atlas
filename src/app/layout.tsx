import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SideNav, MobileBar } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Neuro Atlas",
  description:
    "An interactive atlas of the brain-computer interface field — milestones, capital, velocity, and the field's trajectory.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="describedby" href="/llms.txt" type="text/plain" />
      </head>
      <body className="min-h-full bg-background">
        <ThemeProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-[100rem] px-0 lg:pl-4">
            <SideNav />
            <div className="flex min-w-0 flex-1 flex-col">
              <MobileBar />
              <main className="flex-1 p-3 sm:p-4 lg:py-4 lg:pl-2 lg:pr-4">
                <div className="min-h-[calc(100vh-2rem)] rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7 lg:p-9">
                  {children}
                </div>
              </main>
              <SiteFooter />
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
