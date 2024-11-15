import { NextApiRequest, NextApiResponse } from 'next';
import { get } from '@vercel/blob';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { key } = req.query;

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'Key is required and must be a string' });
  }

  try {
    const blob = await get(key);
    
    if (!blob) {
      return res.status(404).json({ error: 'Blob not found' });
    }

    const data = await blob.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error retrieving blob:', error);
    res.status(500).json({ error: 'Error retrieving blob' });
  }
}