import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '物理可视化',
  description: '从经典混沌到量子引力——交互式物理实验与理论可视化',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="antialiased">{children}</body>
    </html>
  )
}
