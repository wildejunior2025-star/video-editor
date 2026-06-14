import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VideoAI — Editor Automático',
  description: 'Edição automática de vídeo com IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
