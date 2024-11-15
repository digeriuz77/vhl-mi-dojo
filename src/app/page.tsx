'use client'

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChatInterface } from "@/components/ChatInterface"
import { MIMetrics } from "@/components/MIMetrics"
import { SessionRecorder } from "@/components/SessionRecorder"
import { Beaker, Moon, Sun, Mic } from 'lucide-react'
import { Message, MIMetrics as MIMetricsType } from "@/types"
import { motion } from "framer-motion"

export default function App() {
  const [isChatStarted, setIsChatStarted] = useState(false)
  const [user] = useState<{ id: number, username: string }>({ id: 1, username: "User" })
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
  }

  if (!mounted) {
    return null // or a loading spinner
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
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
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!isChatStarted ? (
          <Card className="p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-primary">Welcome to MI DOJO, {user.username}</h2>
            <p className="mb-6">Practice your Motivational Interviewing skills with our AI-powered client simulator.</p>
            <Button onClick={() => setIsChatStarted(true)}>Start Practice Session</Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-[1fr,300px] gap-6">
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
          </div>
        )}
      </main>
    </div>
  )
}