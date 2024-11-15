import React from 'react'
import { Message, MIMetrics } from "@/types"

interface ChatInterfaceProps {
  onMetricsUpdate: (metrics: MIMetrics) => void;
  setChatHistory: React.Dispatch<React.SetStateAction<Message[]>>;
  currentSession: string | null;
  onToggleSessionRecorder: () => void;
}

export function ChatInterface({ 
  onMetricsUpdate, 
  setChatHistory, 
  currentSession, 
  onToggleSessionRecorder 
}: ChatInterfaceProps) {
  // Placeholder implementation
  return (
    <div>
      <h2>Chat Interface</h2>
      <button onClick={onToggleSessionRecorder}>Toggle Session Recorder</button>
    </div>
  )
}