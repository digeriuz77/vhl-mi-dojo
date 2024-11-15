'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChatInterface } from "@/components/ChatInterface"
import { MIMetrics } from "@/components/MIMetrics"
import { SessionRecorder } from "@/components/SessionRecorder"
import { Login } from "@/components/Login"
import { Beaker, Moon, Sun, Mic } from 'lucide-react'
import { Message, MIMetrics as MIMetricsType } from "@/types"
import { motion } from "framer-motion"

let useTheme: () => { theme: string | undefined; setTheme: (theme: string) => void } | null = null
try {
  useTheme = require('next-themes').useTheme
} catch (error) {
  console.warn('next-themes not found, theme functionality will be disabled')
}


export default function App() {
  const [isChatStarted, setIsChatStarted] = useState(false)
  const [user, setUser] = useState<{ id: number, username: string } | null>(null)
  const [metrics, setMetrics] = useState<MIMetricsType>({
    reflectionToQuestionRatio: 0,
    percentComplexReflections: 0,
    percentOpenQuestions: 0,
    miAdherentResponses: 0,
  })
  const [chatHistory, setChatHistory] = useState<Message[]>([])
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  const [showSessionRecorder, setShowSessionRecorder] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const { theme, setTheme } = useTheme ? useTheme() : { theme: undefined, setTheme: () => {} }

  const toggleTheme = () => {
    if (setTheme) {
      setTheme(theme === 'light' ? 'dark' : 'light')
    }
  }

  const handleLogin = (loggedInUser: { id: number, username: string }) => {
    setUser(loggedInUser)
  }

  const handleMetricsUpdate = (newMetrics: MIMetricsType) => {
    setMetrics(newMetrics)
  }

  const handlePlayback = (sessionName: string, messages: Message[]) => {
    setCurrentSession(sessionName)
    setChatHistory(messages)
  }

  const handleToggleSessionRecorder = () => {
    setShowSessionRecorder(!showSessionRecorder)
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // Implement speech-to-text when ready
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className={`min-h-screen bg-background text-foreground ${theme}`}>
      <motion.header 
        className="border-b border-border"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Beaker className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold text-primary">VIRTUAL HEALTH LABS</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRecording}
              className={isRecording ? 'text-red-500' : ''}
            >
              <Mic className="h-5 w-5" />
            </Button>
            {useTheme && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-8">
        {!isChatStarted ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4 text-primary">Welcome to MI DOJO, {user.username}</h2>
              <p className="mb-6">Practice your Motivational Interviewing skills with our AI-powered client simulator.</p>
              <Button onClick={() => setIsChatStarted(true)}>Start Practice Session</Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            className="grid md:grid-cols-[1fr,300px] gap-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-6">
              <ChatInterface 
                onMetricsUpdate={handleMetricsUpdate}
                setChatHistory={setChatHistory}
                currentSession={currentSession}
                onToggleSessionRecorder={handleToggleSessionRecorder}
              />
              {showSessionRecorder && (
                <SessionRecorder 
                  chatHistory={chatHistory}
                  onPlayback={handlePlayback}
                  currentSession={currentSession}
                  setCurrentSession={setCurrentSession}
                />
              )}
            </div>
            <div className="space-y-6">
              <MIMetrics metrics={metrics} />
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}