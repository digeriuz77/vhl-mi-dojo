import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Markdown from 'react-markdown';
import { useToast } from "@/components/ui/use-toast"

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Persona {
  type: string;
  text: {
    value: string;
  };
}

const UserMessage = ({ content }: { content: string }) => (
  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mb-2 text-black dark:text-white">
    <p>{content}</p>
  </div>
);

const AssistantMessage = ({ content }: { content: string }) => (
  <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mb-2 text-black dark:text-white">
    <Markdown>{content}</Markdown>
  </div>
);

export default function AssistantChat() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [personaThreadId, setPersonaThreadId] = useState<string | null>(null);
  const [monitorThreadId, setMonitorThreadId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [scenarioType, setScenarioType] = useState<string>('');
  const [changeReadiness, setChangeReadiness] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const PERSONA_ASSISTANT_ID = process.env.NEXT_PUBLIC_PERSONA_ASSISTANT_ID;
  const MONITORING_ASSISTANT_ID = process.env.NEXT_PUBLIC_MONITORING_ASSISTANT_ID;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createPersona = async () => {
    if (!scenarioType || !changeReadiness) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select both scenario type and change readiness",
      })
      return;
    }

    setIsLoading(true);
    try {
      // Create persona
      const response = await fetch('/api/create_persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_type: scenarioType, change_readiness: changeReadiness }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Failed to create persona: ${data.error || 'Unknown error'}`);
      }

      setPersona(data.persona);
      setPersonaThreadId(data.thread_id);

      // Create monitor thread
      const monitorThreadResponse = await fetch('/api/create-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantType: 'monitor' }),
      });

      if (!monitorThreadResponse.ok) {
        throw new Error('Failed to create monitor thread');
      }

      const monitorThreadData = await monitorThreadResponse.json();
      setMonitorThreadId(monitorThreadData.threadId);

      // Set initial message
      setMessages([{ 
        role: 'assistant', 
        content: data.persona.text.value 
      }]);

    } catch (error) {
      console.error('Error in persona creation:', error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      })
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !personaThreadId || !monitorThreadId) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');

    try {
      // Send message to Persona Assistant
      const personaResponse = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: personaThreadId,
          message: input,
          assistantId: PERSONA_ASSISTANT_ID,
        }),
      });

      if (!personaResponse.ok) {
        throw new Error('Failed to send message to Persona Assistant');
      }

      // Set up streaming response handling
      const reader = personaResponse.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let assistantMessage = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5));
              
              if (data.type === 'message') {
                assistantMessage = data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage,
                  };
                  return newMessages;
                });
              } else if (data.type === 'error') {
                throw new Error(data.content);
              }
            } catch (error) {
              console.error('Error parsing SSE message:', error);
            }
          }
        }
      }

      // After streaming is complete, analyze conversation
      const history = await fetch(`/api/get-conversation-history?threadId=${personaThreadId}`);
      const historyData = await history.json();

      // Send conversation to Monitoring Assistant
      const monitorResponse = await fetch('/api/analyze-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: monitorThreadId,
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

  if (!persona) {
    return (
      <Card className="w-full max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle>Create Persona</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); createPersona(); }} className="space-y-4">
            <Select onValueChange={setScenarioType}>
              <SelectTrigger>
                <SelectValue placeholder="Select scenario type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chronic_illness">Chronic Illness</SelectItem>
                <SelectItem value="addiction">Addiction</SelectItem>
                <SelectItem value="lifestyle_change">Lifestyle Change</SelectItem>
                <SelectItem value="mental_health">Mental Health</SelectItem>
                <SelectItem value="preventive_care">Preventive Care</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={setChangeReadiness}>
              <SelectTrigger>
                <SelectValue placeholder="Select change readiness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre-contemplation">Pre-contemplation</SelectItem>
                <SelectItem value="contemplation">Contemplation</SelectItem>
                <SelectItem value="preparation">Preparation</SelectItem>
                <SelectItem value="action">Action</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={isLoading || !scenarioType || !changeReadiness}>
              {isLoading ? 'Creating...' : 'Create Persona'}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full bg-white dark:bg-gray-800 text-black dark:text-white">
      <Card className="w-2/3 h-full flex flex-col rounded-none border-r border-gray-200 dark:border-gray-700">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <CardTitle>Chat with AI Persona</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-auto p-4 space-y-4">
          {console.log('Current messages:', messages)}
          {messages.map((msg, index) => (
            msg.role === 'user' ? (
              <UserMessage key={`msg-${index}`} content={msg.content} />
            ) : (
              <AssistantMessage key={`msg-${index}`} content={msg.content} />
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
      <div className="w-1/3">
        {/* Space for future sidebar content */}
      </div>
    </div>
  );
}