import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from '@/components/Header';
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
  title: "ClassLogger",
  description: "Transparent class logs for parents & teachers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Meticulous.ai Script - Must be first script to load */}
        {(process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script
            data-recording-token="LJdHGEzkbQDWiwtVPXMfiW0dGfRvymh5TUNtzWVg"
            data-is-production-environment="false"
            src="https://snippet.meticulous.ai/v1/meticulous.js"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                <div className="p-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v6m0 6v6" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">© 2025 ClassLogger. All rights reserved.</span>
              </div>
              <p className="text-xs text-gray-500">
                Transparent class logs for parents & teachers
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}