import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { put, get } from '@vercel/blob';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.ASSISTANT_ID;

if (!process.env.OPENAI_API_KEY || !ASSISTANT_ID) {
  throw new Error('OPENAI_API_KEY or ASSISTANT_ID is not set in environment variables');
}

const mitiJson = fs.readFileSync(path.join(process.cwd(), 'data/complete-miti-json.json'), 'utf-8');
const spiritOfMI = fs.readFileSync(path.join(process.cwd(), 'data/spirit_of_MI.txt'), 'utf-8');
const miKnowledgeBase = fs.readFileSync(path.join(process.cwd(), 'data/mi_knowledge_base.json'), 'utf-8');

const analyzeMIFunctionDefinition = {
  name: 'analyze_motivational_interviewing',
  description: 'Analyze a message for MI adherence and provide metrics.',
  parameters: {
    type: 'object',
    properties: {
      reflectionToQuestionRatio: { type: 'number' },
      percentComplexReflections: { type: 'number' },
      percentOpenQuestions: { type: 'number' },
      miAdherentResponses: { type: 'number' },
      spiritOfMIAdherence: { type: 'number' },
      changeTalkIdentification: { 
        type: 'object',
        properties: {
          preparatory: { type: 'array', items: { type: 'string' } },
          mobilizing: { type: 'array', items: { type: 'string' } }
        }
      },
      overallAdherenceScore: { type: 'number' },
      reasoning: { type: 'string' }
    },
    required: ['reflectionToQuestionRatio', 'percentComplexReflections', 'percentOpenQuestions', 'miAdherentResponses', 'spiritOfMIAdherence', 'changeTalkIdentification', 'overallAdherenceScore', 'reasoning'],
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, threadId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const hash = crypto.createHash('sha256').update(message).digest('hex');
    const cacheKey = `mi_analysis_${hash}.json`;

    // Check cache
    try {
      const response = await get(cacheKey);
      if (response && response.status === 200) {
        const cachedAnalysis = await response.json();
        if (cachedAnalysis) {
          return res.status(200).json({ data: cachedAnalysis });
        }
      }
    } catch (error) {
      console.error('Error retrieving from Blob storage:', error);
    }

    let thread;
    try {
      if (threadId) {
        thread = await openai.beta.threads.retrieve(threadId);
      } else {
        thread = await openai.beta.threads.create();
      }
    } catch (error) {
      console.error('Error retrieving or creating thread:', error);
      return res.status(500).json({ error: 'Error managing conversation thread' });
    }

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Analyze this message for MI adherence: "${message}"`
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
      instructions: `
        Analyze the given message for Motivational Interviewing (MI) adherence.
        Use the following knowledge base:
        1. MITI JSON: ${mitiJson}
        2. Spirit of MI: ${spiritOfMI}
        3. MI Knowledge Base: ${miKnowledgeBase}
        
        Use the analyze_motivational_interviewing function to provide a structured analysis.
      `,
      functions: [analyzeMIFunctionDefinition],
      function_call: { name: 'analyze_motivational_interviewing' },
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
    const analysisMessage = messages.data.find(message => message.role === "assistant");

    if (!analysisMessage || !analysisMessage.function_call) {
      throw new Error('No analysis or function call found');
    }

    let analysis;
    try {
      analysis = JSON.parse(analysisMessage.function_call.arguments);
    } catch (parseError) {
      console.error('Error parsing function arguments:', parseError);
      return res.status(500).json({ error: 'Error parsing analysis results' });
    }

    // Store the result in Blob storage
    try {
      await put(cacheKey, JSON.stringify(analysis), { access: 'private' });
    } catch (error) {
      console.error('Error storing in Blob storage:', error);
    }

    res.status(200).json({ data: analysis, threadId: thread.id });
  } catch (error) {
    console.error('Error analyzing MI metrics:', error);
    res.status(500).json({ error: 'Error analyzing MI metrics' });
  }
}