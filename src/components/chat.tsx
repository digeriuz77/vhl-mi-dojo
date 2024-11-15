"use client";

import React, { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
};

interface ApiResponse {
  type: string;
  content: string;
  threadId?: string;
  error?: string;
}

const UserMessage = ({ text }: { text: string }) => (
  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mb-2 text-black dark:text-white">
    {text}
  </div>
);

const AssistantMessage = ({ text }: { text: string }) => (
  <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mb-2 text-black dark:text-white">
    <Markdown>{text}</Markdown>
  </div>
);

const CodeMessage = ({ text }: { text: string }) => (
  <div className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white p-2 rounded-lg mb-2">
    {text.split("\n").map((line, index) => (
      <div key={index}>
        <span>{`${index + 1}. `}</span>
        {line}
      </div>
    ))}
  </div>
);

const Message = ({ role, text }: MessageProps) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} />;
    case "code":
      return <CodeMessage text={text} />;
    default:
      return null;
  }
};

export default function Chat() {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    try {
      setIsLoading(true);

      setMessages((prev) => [...prev, { role: "user", text }]);

      console.log("Sending message:", text); // Debug log

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text, threadId }),
      });

      console.log("Response status:", response.status); // Debug log

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let assistantMessage = "";
      setMessages((prev) => [...prev, { role: "assistant", text: "" }]);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split("\n");

        // Handle incomplete line at the end
        if (!buffer.endsWith("\n")) {
          buffer = lines.pop() || "";
        } else {
          buffer = "";
        }

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonString = line.slice(6).trim();
              if (jsonString) {
                const data: ApiResponse = JSON.parse(jsonString);
                console.log("Parsed data:", data); // Debug log

                if (data.type === "info" && data.threadId) {
                  setThreadId(data.threadId);
                } else if (data.type === "message") {
                  assistantMessage = data.content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      text: assistantMessage,
                    };
                    return newMessages;
                  });
                } else if (data.type === "error") {
                  throw new Error(data.content);
                }
              }
            } catch (parseError) {
              console.error("Error parsing JSON:", parseError, "Raw line:", line); // Debug log
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `An error occurred: ${error.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const messageText = userInput.trim();
    setUserInput("");
    await sendMessage(messageText);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 text-black dark:text-white rounded-2xl shadow-xl overflow-hidden">
      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-white dark:bg-gray-800">
        {messages.map((msg, index) => (
          <Message key={`message-${index}`} role={msg.role} text={msg.text} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-gray-200 dark:border-gray-700"
      >
        <div className="flex space-x-2">
          <input
            type="text"
            className="flex-grow px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-700 dark:border-gray-600"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={
              isLoading ? "Waiting for response..." : "Type your message here..."
            }
            disabled={isLoading}
            aria-label="Message input"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
            disabled={isLoading || !userInput.trim()}
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
