'use client'

import { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

let ThemeProvider: React.ComponentType<{ children: ReactNode }> | null = null
try {
  ThemeProvider = require('next-themes').ThemeProvider
} catch (error) {
  console.warn('next-themes not found, theme functionality will be disabled')
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const content = (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )

  if (ThemeProvider) {
    return <ThemeProvider attribute="class" defaultTheme="light">{content}</ThemeProvider>
  }

  return content
}