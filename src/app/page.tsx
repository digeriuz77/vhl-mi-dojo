"use client"

import * as React from "react"
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Sun, Moon, Beaker } from 'lucide-react'
import { useTheme } from "next-themes"
import Chat from "@/components/AssistantChat"  // Import the Chat component
import ErrorBoundary from "@/components/ErrorBoundary"  // Import the ErrorBoundary component

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [isChatStarted, setIsChatStarted] = React.useState(false)
  const [key, setKey] = React.useState(0)

  React.useEffect(() => {
    if (isChatStarted) {
      console.log('Chat component should be mounting');
    }
  }, [isChatStarted]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Image src="/VHL.png" alt="VHL Logo" width={40} height={40} className="rounded-full" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">VIRTUAL HEALTH LABS</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="default"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="rounded-full"
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isChatStarted ? (
          <div className="max-w-2xl mx-auto text-center transition-opacity duration-300 ease-in-out">
            <div className="mb-8 flex justify-center">
              <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 transition-colors duration-300">
                <Beaker className="h-16 w-16 text-blue-500 dark:text-blue-400" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 transition-colors duration-300">
              Welcome to MI DOJO
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-lg mx-auto transition-colors duration-300">
              Practice your Motivational Interviewing skills with our AI-powered client simulator.
              Get real-time feedback and improve your therapeutic communication skills.
            </p>
            <Button
              onClick={() => setIsChatStarted(true)}
              size="lg"
              className="mt-8 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Start Practice Session
            </Button>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto transition-opacity duration-300 ease-in-out h-[80vh] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <ErrorBoundary 
              fallback={<div className="p-4 text-red-500">Something went wrong with the chat. Please refresh the page.</div>}
            >
              <AssistantChat key={key} />
            </ErrorBoundary>
          </div>
        )}
      </main>
    </div>
  )
}