import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Steady — Free Epilepsy Safety App',
  description:
    'A free, privacy-first epilepsy companion app. Built by a dad, for every family. Log seizures, alert loved ones, and generate neurologist reports — always free.',
  keywords: ['epilepsy', 'seizure', 'family safety', 'free', 'privacy', 'neurology'],
  openGraph: {
    title: 'Steady',
    description: 'Free epilepsy safety app. Built by a dad. For every family.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
