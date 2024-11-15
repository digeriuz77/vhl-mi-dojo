import OpenAI from 'openai';
import { NextApiRequest, NextApiResponse } from 'next';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = 'asst_gbq9LuPZwHpe1IURaRG65WQA';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API route called'); // Debug log

  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key not configured'); // Debug log
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  if (req.method !== 'POST') {
    console.error('Invalid method:', req.method); // Debug log
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { message, threadId } = req.body;
    console.log('Received message:', message); // Debug log

    if (!message) {
      console.error('No message provided'); // Debug log
      res.write('data: ' + JSON.stringify({ error: 'Message is required' }) + '\n\n');
      return res.end();
    }

    let currentThreadId = threadId;
    if (!currentThreadId) {
      const thread = await openai.beta.threads.create();
      currentThreadId = thread.id;
      console.log('New thread created:', currentThreadId); // Debug log
      res.write(
        'data: ' +
          JSON.stringify({ type: 'info', content: 'Thread created', threadId: currentThreadId }) +
          '\n\n'
      );
    }

    await openai.beta.threads.messages.create(currentThreadId, {
      role: 'user',
      content: message,
    });
    console.log('Message added to thread'); // Debug log

    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: ASSISTANT_ID,
    });
    console.log('Run created:', run.id); // Debug log

    let runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);

    while (runStatus.status !== 'completed') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
      console.log('Run status:', runStatus.status); // Debug log
      res.write('data: ' + JSON.stringify({ type: 'status', content: runStatus.status }) + '\n\n');
    }

    const messages = await openai.beta.threads.messages.list(currentThreadId);
    const assistantMessages = messages.data.filter((msg) => msg.role === 'assistant');
    const latestMessage = assistantMessages[0]?.content[0]?.text?.value || '';

    console.log('Sending response:', latestMessage); // Debug log
    res.write(
      'data: ' +
        JSON.stringify({ type: 'message', content: latestMessage, threadId: currentThreadId }) +
        '\n\n'
    );
    res.end();
  } catch (error) {
    console.error('Error in API route:', error); // Debug log
    res.write(
      'data: ' +
        JSON.stringify({
          type: 'error',
          content: 'Error communicating with OpenAI: ' + error.message,
        }) +
        '\n\n'
    );
    res.end();
  }
}
