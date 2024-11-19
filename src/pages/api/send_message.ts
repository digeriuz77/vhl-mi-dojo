import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ASSISTANT_ID = process.env.NEXT_PUBLIC_PERSONA_ASSISTANT_ID;

if (!ASSISTANT_ID) {
  throw new Error('ASSISTANT_ID is not set in environment variables');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API route called with method:', req.method);
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

    const { threadId, message } = req.body;
    console.log('Received request with:', { threadId, message: message?.substring(0, 50) + '...' });

    if (!threadId || !message) {
      console.error('Missing required parameters:', { threadId, message });
      res.write(`data: ${JSON.stringify({ error: 'ThreadId and message are required' })}\n\n`);
      return res.end();
    }

    try {
      await openai.beta.threads.messages.list(threadId);
      console.log('Thread verified:', threadId);
    } catch (error) {
      console.error('Thread verification failed:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'Invalid thread ID' })}\n\n`);
      return res.end();
    }

    try {
      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message
      });
      console.log('Message added to thread');
      res.write(`data: ${JSON.stringify({ type: 'status', content: 'message_added' })}\n\n`);
    } catch (error) {
      console.error('Failed to add message:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to add message' })}\n\n`);
      return res.end();
    }

    let run;
    try {
      run = await openai.beta.threads.runs.create(threadId as string, {
        assistant_id: ASSISTANT_ID
      });
      console.log('Run created:', run.id);
      res.write(`data: ${JSON.stringify({ type: 'status', content: 'run_created' })}\n\n`);
    } catch (error) {
      console.error('Failed to create run:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to create run' })}\n\n`);
      return res.end();
    }

    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    console.log('Initial run status:', runStatus.status);
    
    const startTime = Date.now();
    const TIMEOUT = 30000; // 30 second timeout

    while (runStatus.status !== "completed") {
      if (Date.now() - startTime > TIMEOUT) {
        console.error('Run timed out');
        res.write(`data: ${JSON.stringify({ type: 'error', content: 'Response timed out' })}\n\n`);
        return res.end();
      }

      if (runStatus.status === 'failed' || runStatus.status === 'expired' || runStatus.status === 'cancelled') {
        console.error('Run failed:', runStatus);
        res.write(`data: ${JSON.stringify({ type: 'error', content: `Run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}` })}\n\n`);
        return res.end();
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      console.log('Run status:', runStatus.status);
      res.write(`data: ${JSON.stringify({ type: 'status', content: runStatus.status })}\n\n`);
    }

    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessages = messages.data.filter(message => message.role === "assistant");
    
    if (assistantMessages.length === 0) {
      console.error('No assistant messages found');
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'No response received' })}\n\n`);
      return res.end();
    }

    const latestMessage = assistantMessages[0].content[0].type === 'text' 
      ? assistantMessages[0].content[0].text.value
      : 'Non-text response received';
    console.log('Sending response:', latestMessage.substring(0, 50) + '...');
    res.write(`data: ${JSON.stringify({ type: 'message', content: latestMessage })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Unhandled error in API route:', error);
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      content: error instanceof Error ? error.message : 'Error communicating with OpenAI'
    })}\n\n`);
    res.end();
  }
}