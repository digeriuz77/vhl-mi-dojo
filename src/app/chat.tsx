import AssistantChat from '@/components/AssistantChat';

export default function ChatPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Persona Chat with MI Feedback</h1>
      <AssistantChat />
    </div>
  );
}