import OpenAI from 'openai';
import { NextApiRequest, NextApiResponse } from 'next';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Input validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scenario_type, change_readiness } = req.body;
  
  if (!scenario_type || !change_readiness) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      details: {
        scenario_type: !scenario_type ? 'missing' : 'present',
        change_readiness: !change_readiness ? 'missing' : 'present'
      }
    });
  }

  // Assistant ID validation
  const ASSISTANT_ID = process.env.NEXT_PUBLIC_PERSONA_ASSISTANT_ID;
  if (!ASSISTANT_ID) {
    console.error('Assistant ID not configured');
    return res.status(500).json({ 
      error: 'Configuration error',
      details: 'Assistant ID not found in environment variables'
    });
  }

  try {
    console.log('Starting persona creation with:', {
      scenario_type,
      change_readiness,
      assistant_id: ASSISTANT_ID
    });

    // Verify assistant exists
    try {
      const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
      console.log('Assistant verified:', assistant.id);
    } catch (error: any) {
      console.error('Failed to verify assistant:', error);
      return res.status(500).json({
        error: 'Assistant verification failed',
        details: error.message
      });
    }

    // Create thread
    let thread;
    try {
      thread = await openai.beta.threads.create();
      console.log('Thread created:', thread.id);
    } catch (error: any) {
      console.error('Failed to create thread:', error);
      return res.status(500).json({
        error: 'Thread creation failed',
        details: error.message
      });
    }

    // Add message
    try {
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: `Create a persona for a ${scenario_type} scenario with ${change_readiness} change readiness.`
      });
      console.log('Message added to thread');
    } catch (error: any) {
      console.error('Failed to add message:', error);
      return res.status(500).json({
        error: 'Message creation failed',
        details: error.message
      });
    }

    // Run assistant
    let run;
    try {
      run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: ASSISTANT_ID,
      });
      console.log('Run created:', run.id);
    } catch (error: any) {
      console.error('Failed to create run:', error);
      return res.status(500).json({
        error: 'Run creation failed',
        details: error.message
      });
    }

    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    console.log('Initial run status:', runStatus.status);
    
    const startTime = Date.now();
    const TIMEOUT = 30000; // 30 second timeout

    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      if (Date.now() - startTime > TIMEOUT) {
        console.error('Run timed out');
        return res.status(500).json({
          error: 'Run timed out',
          details: `Run did not complete within ${TIMEOUT/1000} seconds`
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log('Updated run status:', runStatus.status);
      
      if (runStatus.status === 'failed' || runStatus.status === 'expired' || runStatus.status === 'cancelled') {
        console.error('Run failed with status:', runStatus.status);
        return res.status(500).json({
          error: 'Run failed',
          details: {
            status: runStatus.status,
            error: runStatus.last_error?.message
          }
        });
      }
    }

    // Get messages
    const messages = await openai.beta.threads.messages.list(thread.id);
    console.log('Retrieved messages count:', messages.data.length);

    if (messages.data.length === 0) {
      return res.status(500).json({
        error: 'No response',
        details: 'No messages received from assistant'
      });
    }

    const lastMessage = messages.data[0];
    console.log('Last message full content:', JSON.stringify(lastMessage, null, 2));
    console.log('Content being sent:', JSON.stringify(lastMessage.content[0], null, 2));
    console.log('Successful response with thread ID:', thread.id);
    
    return res.status(200).json({
      persona: lastMessage.content[0],
      thread_id: thread.id
    });

  } catch (error: any) {
    console.error('Unhandled error in persona creation:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    return res.status(500).json({
      error: 'Unhandled error',
      details: {
        message: error.message,
        type: error.name,
        response: error.response?.data
      }
    });
  }
}