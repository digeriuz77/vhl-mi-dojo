import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { threadId, conversation, assistantId } = req.body;

  if (!threadId || !conversation || !assistantId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Add the conversation to the monitoring thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: `Please analyze the following conversation for MI adherence:\n\n${conversation.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`,
    });

    // Run the monitoring assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    // Retrieve the monitoring assistant's feedback
    const messages = await openai.beta.threads.messages.list(threadId);
    const feedbackMessage = messages.data[0].content[0];

    if (feedbackMessage.type === 'text') {
      res.status(200).json({ feedback: feedbackMessage.text.value });
    } else {
      res.status(500).json({ error: 'Unexpected response type from monitoring assistant' });
    }
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    res.status(500).json({ error: 'Failed to analyze conversation' });
  }
}