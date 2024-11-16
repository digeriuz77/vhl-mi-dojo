import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { threadId } = req.query;

  if (!threadId || typeof threadId !== 'string') {
    return res.status(400).json({ error: 'Invalid thread ID' });
  }

  try {
    const messages = await openai.beta.threads.messages.list(threadId);
    const history = messages.data.map(message => ({
      role: message.role,
      content: message.content[0].type === 'text' ? message.content[0].text.value : '',
    }));

    res.status(200).json({ history });
  } catch (error) {
    console.error('Error retrieving conversation history:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
}