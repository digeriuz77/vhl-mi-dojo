import React from 'react'
import { Message } from "@/types"

interface SessionRecorderProps {
  chatHistory: Message[];
  onPlayback: (sessionName: string, messages: Message[]) => void;
  currentSession: string | null;
  setCurrentSession: React.Dispatch<React.SetStateAction<string | null>>;
}

export function SessionRecorder({
  chatHistory,
  onPlayback,
  currentSession,
  setCurrentSession
}: SessionRecorderProps) {
  // Placeholder implementation
  return (
    <div>
      <h2>Session Recorder</h2>
      <button onClick={() => onPlayback('Sample Session', chatHistory)}>
        Play Sample Session
      </button>
    </div>
  )
}