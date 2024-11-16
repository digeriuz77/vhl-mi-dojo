import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { threadId, message, assistantId } = req.body;

  if (!threadId || !message || !assistantId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Add the user's message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    // Retrieve the assistant's response
    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantResponse = messages.data[0].content[0];

    if (assistantResponse.type === 'text') {
      res.status(200).json({ response: assistantResponse.text.value });
    } else {
      res.status(500).json({ error: 'Unexpected response type from assistant' });
    }
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
}