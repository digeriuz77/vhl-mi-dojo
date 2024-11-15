import OpenAI from 'openai';
import { NextApiRequest, NextApiResponse } from 'next';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;

if (!ASSISTANT_ID) {
  throw new Error('ASSISTANT_ID is not set in environment variables');
}

let threadId: string | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API route called');
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key not configured');
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  if (req.method !== 'POST') {
    console.error('Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { message } = req.body;
    console.log('Received message:', message);

    if (!message) {
      console.error('No message provided');
      res.write(`data: ${JSON.stringify({ error: 'Message is required' })}\n\n`);
      return res.end();
    }

    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      console.log('New thread created:', threadId);
      res.write(`data: ${JSON.stringify({ type: 'info', content: 'Thread created' })}\n\n`);
    }

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });
    console.log('Message added to thread');

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID
    });
    console.log('Run created:', run.id);

    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    
    while (runStatus.status !== "completed") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      console.log('Run status:', runStatus.status);
      res.write(`data: ${JSON.stringify({ type: 'status', content: runStatus.status })}\n\n`);
    }

    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessages = messages.data.filter(message => message.role === "assistant");
    const latestMessage = assistantMessages[0].content[0].text.value;

    console.log('Sending response:', latestMessage);
    res.write(`data: ${JSON.stringify({ type: 'message', content: latestMessage })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error in API route:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Error communicating with OpenAI' })}\n\n`);
    res.end();
  }
}