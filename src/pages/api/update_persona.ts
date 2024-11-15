import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { put, get } from '@vercel/blob';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.ASSISTANT_ID;

if (!process.env.OPENAI_API_KEY || !ASSISTANT_ID) {
  throw new Error('OPENAI_API_KEY or ASSISTANT_ID is not set in environment variables');
}

const mitiJson = fs.readFileSync(path.join(process.cwd(), 'data/complete-miti-json.json'), 'utf-8');
const spiritOfMI = fs.readFileSync(path.join(process.cwd(), 'data/spirit_of_MI.txt'), 'utf-8');
const miKnowledgeBase = fs.readFileSync(path.join(process.cwd(), 'data/mi_knowledge_base.json'), 'utf-8');

const updatePersonaFunctionDefinition = {
  name: "update_persona_characteristics",
  description: "Update client persona based on session interaction",
  parameters: {
    type: "object",
    properties: {
      stage_of_change: {
        type: "string",
        enum: ["pre-contemplation", "contemplation", "preparation", "action", "maintenance"],
        description: "Updated stage in change process"
      },
      emotional_state: {
        type: "object",
        properties: {
          primary_emotion: { type: "string" },
          intensity: { type: "integer", minimum: 1, maximum: 10 }
        },
        required: ["primary_emotion", "intensity"]
      },
      rapport_level: { type: "integer", minimum: 1, maximum: 10 },
      significant_events: { type: "array", items: { type: "string" } },
      reasoning: { type: "string" }
    },
    required: ["stage_of_change", "emotional_state", "rapport_level", "significant_events", "reasoning"]
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { current_persona, session_data } = req.body;

  if (!current_persona || !session_data) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const hash = crypto.createHash('sha256').update(JSON.stringify({ current_persona, session_data })).digest('hex');
    const updateKey = `persona_update_${hash}_${uuidv4()}.json`;

    // Check if we have a cached result
    try {
      const response = await get(updateKey);
      if (response && response.status === 200) {
        const cachedUpdate = await response.json();
        if (cachedUpdate) {
          return res.status(200).json({ data: cachedUpdate });
        }
      }
    } catch (error) {
      console.error('Error retrieving from Blob storage:', error);
    }

    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: JSON.stringify({ current_persona, session_data })
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
      instructions: `
        Update the client persona based on the session interaction.
        Use the following knowledge base:
        1. MITI JSON: ${mitiJson}
        2. Spirit of MI: ${spiritOfMI}
        3. MI Knowledge Base: ${miKnowledgeBase}
        
        Use the update_persona_characteristics function to provide a structured update.
      `,
      functions: [updatePersonaFunctionDefinition],
      function_call: { name: 'update_persona_characteristics' },
    });

    const maxRetries = 30;
    let retries = 0;
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

    while (runStatus.status !== "completed" && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      retries++;
    }

    if (runStatus.status !== "completed") {
      throw new Error('Run did not complete in expected time');
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const updateMessage = messages.data.find(message => message.role === "assistant");

    if (!updateMessage || !updateMessage.function_call) {
      throw new Error('No update or function call found');
    }

    let updatedPersona;
    try {
      updatedPersona = JSON.parse(updateMessage.function_call.arguments);
    } catch (parseError) {
      console.error('Error parsing function arguments:', parseError);
      return res.status(500).json({ error: 'Error parsing persona update results' });
    }

    // Store the result in Blob storage
    try {
      await put(updateKey, JSON.stringify(updatedPersona), { access: 'private' });
    } catch (error) {
      console.error('Error storing in Blob storage:', error);
    }

    res.status(200).json({ data: updatedPersona, threadId: thread.id });
  } catch (error) {
    console.error('Error updating persona:', error);
    res.status(500).json({ error: 'Error updating persona' });
  }
}