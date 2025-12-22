import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'ShortsAlpha',
    description: 'AI Viral Shorts Generator',
}

import { Toaster } from 'sonner'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_b2JsaWdpbmctd3Jlbi0wLmNsZXJrLmFjY291bnRzLmRldiQ";

    return (
        <ClerkProvider publishableKey={publishableKey}>
            <html lang="en" className="dark" suppressHydrationWarning>
                <body className={inter.className}>
                    {children}
                    <Toaster theme="dark" position="bottom-right" />
                </body>
            </html>
        </ClerkProvider>
    )
}
