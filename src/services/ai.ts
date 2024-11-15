import { Message, MIMetrics } from "@/types";

interface ChatApiResponse {
  response: string;
  threadId?: string;
  error?: string;
}

export async function sendMessage(message: string, threadId?: string): Promise<{ response: string; threadId?: string }> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, threadId }),
    });

    const contentType = response.headers.get('Content-Type');

    if (!response.ok) {
      let errorMessage = 'Failed to send message';

      if (contentType && contentType.includes('application/json')) {
        const errorData: ChatApiResponse = await response.json();
        errorMessage = errorData.error || errorMessage;
      }

      throw new Error(errorMessage);
    }

    if (contentType && contentType.includes('application/json')) {
      const data: ChatApiResponse = await response.json();
      return { response: data.response, threadId: data.threadId };
    } else {
      const textData = await response.text();
      throw new Error(`Unexpected response format: ${textData}`);
    }
  } catch (error: any) {
    console.error('Error in sendMessage:', error);
    throw new Error(error.message || 'An unknown error occurred in sendMessage');
  }
}

export async function analyzeResponse(message: string): Promise<MIMetrics> {
  // Placeholder implementation
  // In a real implementation, this would involve an API call to an analysis service
  return {
    reflectionToQuestionRatio: Math.random(),
    percentComplexReflections: Math.random() * 100,
    percentOpenQuestions: Math.random() * 100,
    miAdherentResponses: Math.floor(Math.random() * 10),
  };
}
