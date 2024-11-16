import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { assistantType } = req.body;

  if (!assistantType || (assistantType !== 'persona' && assistantType !== 'monitor')) {
    return res.status(400).json({ error: 'Invalid assistant type' });
  }

  try {
    const thread = await openai.beta.threads.create();
    res.status(200).json({ threadId: thread.id });
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
}