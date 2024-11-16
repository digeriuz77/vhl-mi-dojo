"use client";

import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Persona {
  name: string;
  age: number;
  background: string;
  health_issue: string;
  change_readiness: string;
  personality_traits: string[];
}

const UserMessage = ({ content }: { content: string }) => (
  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mb-2 text-black dark:text-white">
    {content}
  </div>
);

const AssistantMessage = ({ content }: { content: string }) => (
  <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mb-2 text-black dark:text-white">
    <Markdown>{content}</Markdown>
  </div>
);

export default function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [personaThreadId, setPersonaThreadId] = useState<string | null>(null);
  const [monitorThreadId, setMonitorThreadId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const PERSONA_ASSISTANT_ID = process.env.NEXT_PUBLIC_PERSONA_ASSISTANT_ID;
  const MONITORING_ASSISTANT_ID = process.env.NEXT_PUBLIC_MONITORING_ASSISTANT_ID;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createThread = async (assistantType: 'persona' | 'monitor') => {
    try {
      const response = await fetch('/api/create-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantType }),
      });
      const data = await response.json();
      if (assistantType === 'persona') {
        setPersonaThreadId(data.threadId);
      } else {
        setMonitorThreadId(data.threadId);
      }
      return data.threadId;
    } catch (error) {
      console.error(`Error creating ${assistantType} thread:`, error);
      throw error;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');

    try {
      const currentPersonaThreadId = personaThreadId || await createThread('persona');
      const currentMonitorThreadId = monitorThreadId || await createThread('monitor');

      // Send message to Persona Assistant
      const personaResponse = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: currentPersonaThreadId,
          message: input,
          assistantId: PERSONA_ASSISTANT_ID,
        }),
      });

      if (!personaResponse.ok) {
        throw new Error('Failed to send message to Persona Assistant');
      }

      const personaData = await personaResponse.json();
      setMessages(prev => [...prev, { role: 'assistant', content: personaData.response }]);

      // Get conversation history
      const history = await fetch(`/api/get-conversation-history?threadId=${currentPersonaThreadId}`);
      const historyData = await history.json();

      // Send conversation to Monitoring Assistant
      const monitorResponse = await fetch('/api/analyze-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: currentMonitorThreadId,
          conversation: historyData.history,
          assistantId: MONITORING_ASSISTANT_ID,
        }),
      });

      if (!monitorResponse.ok) {
        throw new Error('Failed to analyze conversation');
      }

      const monitorData = await monitorResponse.json();
      setFeedback(monitorData.feedback);

    } catch (error) {
      console.error('Error in chat process:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was an error processing your request.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-800 text-black dark:text-white">
      <Card className="w-2/3 h-full flex flex-col rounded-none">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <CardTitle>Chat with AI Persona</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            msg.role === 'user' ? (
              <UserMessage key={index} content={msg.content} />
            ) : (
              <AssistantMessage key={index} content={msg.content} />
            )
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "Waiting for response..." : "Type your message here..."}
              disabled={isLoading}
              className="flex-grow px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-700 dark:border-gray-600"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </Card>
      <Card className="w-1/3 h-full flex flex-col rounded-none border-l border-gray-200 dark:border-gray-700">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <CardTitle>MI Adherence Feedback</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-auto p-4">
          {feedback ? (
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">{feedback}</div>
          ) : (
            <p>No feedback available yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}