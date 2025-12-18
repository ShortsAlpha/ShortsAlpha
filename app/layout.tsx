import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Shorts Alpha',
    description: 'Automated 9:16 video creator',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Inter:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Open+Sans:wght@400;700&family=Oswald:wght@400;700&family=Poppins:wght@400;700&family=Raleway:wght@400;700&family=Roboto:wght@400;700&display=swap" rel="stylesheet" />
            </head>
            <body className={inter.className}>{children}</body>
        </html>
    )
}
