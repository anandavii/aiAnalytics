import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "AI Analytics Dashboard",
  description: "Upload, Clean, and Analyze your data with AI.",
};

import { QueryProvider } from "@/components/providers/query-provider";
import { ChatHistoryProvider } from "@/components/providers/chat-history-provider";
import { AddOnsProvider } from "@/components/providers/addons-context";
import { DataStoryProvider } from "@/components/providers/data-story-provider";
import { ActiveDatasetProvider } from "@/components/providers/active-dataset-provider";
import { Toaster } from "@/components/ui/sonner"
import AuthProvider from "@/components/auth/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <ActiveDatasetProvider>
              <ChatHistoryProvider>
                <AddOnsProvider>
                  <DataStoryProvider>
                    {children}
                  </DataStoryProvider>
                </AddOnsProvider>
              </ChatHistoryProvider>
            </ActiveDatasetProvider>
          </AuthProvider>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}

