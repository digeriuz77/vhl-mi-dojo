import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PERSONA_ASSISTANT_ID = process.env.NEXT_PUBLIC_PERSONA_ASSISTANT_ID;

if (!process.env.OPENAI_API_KEY || !PERSONA_ASSISTANT_ID) {
  throw new Error('OPENAI_API_KEY or PERSONA_ASSISTANT_ID is not set in environment variables');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { threadId, sessionSummary } = req.body;

  if (!threadId || !sessionSummary) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Add the session summary to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `Based on this session summary, update the persona: ${sessionSummary}`
    });

    // Run the assistant to update the persona
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: PERSONA_ASSISTANT_ID,
      instructions: "Update the persona based on the provided session summary. Provide a summary of the changes made to the persona."
    });

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status !== "completed") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    // Retrieve the assistant's response
    const messages = await openai.beta.threads.messages.list(threadId);
    const updateMessage = messages.data[0].content[0];

    if (updateMessage.type !== 'text') {
      throw new Error('Unexpected response type from assistant');
    }

    res.status(200).json({ update: updateMessage.text.value });
  } catch (error) {
    console.error('Error updating persona:', error);
    res.status(500).json({ error: 'Error updating persona' });
  }
}