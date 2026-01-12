import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HelpMeApply AI - Smart Job Application Assistant',
  description: 'Automate your job search and application process with AI-powered assistance',
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: 'https://res.cloudinary.com/drvfzwgjm/image/upload/v1761079284/6d9abdda-f20a-4568-8638-09bc7f5949c5_bzags5.jpg',
    shortcut: 'https://res.cloudinary.com/drvfzwgjm/image/upload/v1761079284/6d9abdda-f20a-4568-8638-09bc7f5949c5_bzags5.jpg',
    apple: 'https://res.cloudinary.com/drvfzwgjm/image/upload/v1761079284/6d9abdda-f20a-4568-8638-09bc7f5949c5_bzags5.jpg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-M811Z2MNQF"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-M811Z2MNQF');
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}