import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { MIMetrics } from '@/types';
import { storeInBlobStorage, retrieveFromBlobStorage } from '@/utils/blobStorage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const ASSISTANT_ID = process.env.ASSISTANT_ID!;

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

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required and must be a string' });
  }

  try {
    const hash = crypto.createHash('sha256').update(message).digest('hex');
    const cacheKey = `mi_analysis_${hash}.json`;

    // Check cache
    const cachedAnalysis = await retrieveFromBlobStorage<MIMetrics>(cacheKey);
    if (cachedAnalysis) {
      return res.status(200).json({ data: cachedAnalysis });
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
        
        Provide a structured analysis using the analyze_motivational_interviewing function.
      `,
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

    if (!analysisMessage || !analysisMessage.content || analysisMessage.content.length === 0) {
      throw new Error('No analysis found');
    }

    let analysis: MIMetrics;
    try {
      const content = analysisMessage.content[0] as { text: { value: string } };
      analysis = JSON.parse(content.text.value) as MIMetrics;
    } catch (parseError) {
      console.error('Error parsing analysis results:', parseError);
      return res.status(500).json({ error: 'Error parsing analysis results' });
    }

    // Store the result in Blob storage
    await storeInBlobStorage(cacheKey, analysis);

    res.status(200).json({ data: analysis, threadId: thread.id });
  } catch (error) {
    console.error('Error analyzing MI metrics:', error);
    res.status(500).json({ error: 'Error analyzing MI metrics' });
  }
}