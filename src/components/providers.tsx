'use client'

import { ThemeProvider } from 'next-themes'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
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
    </ThemeProvider>
  )
}