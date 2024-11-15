import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const redis = Redis.fromEnv();

const ASSISTANT_ID = 'asst_gbq9LuPZwHpe1IURaRG65WQA'; // Replace with your actual Assistant ID
const CACHE_TTL = 3600; // Cache for 1 hour
const ANALYSIS_TIMEOUT = 30000; // 30 seconds timeout

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, threadId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Check cache
    const cacheKey = `mi_analysis:${message}`;
    const cachedAnalysis = await redis.get(cacheKey);
    if (cachedAnalysis) {
      return res.status(200).json(JSON.parse(cachedAnalysis));
    }

    let thread;
    if (threadId) {
      thread = await openai.beta.threads.retrieve(threadId);
    } else {
      thread = await openai.beta.threads.create();
    }

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Analyze this message for MI adherence: "${message}"`
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
      instructions: `
        Analyze the given message for Motivational Interviewing (MI) adherence.
        Use the knowledge from the files in your knowledge base:
        1. complete-miti-json.json
        2. spirt_of_MI.txt
        3. mi_knowledge_base.json
        
        Use the analyze_motivational_interviewing function to provide a structured analysis.
      `,
    });

    const startTime = Date.now();
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    while (runStatus.status !== "completed") {
      if (Date.now() - startTime > ANALYSIS_TIMEOUT) {
        throw new Error('Analysis timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const analysisMessage = messages.data.find(message => message.role === "assistant");

    if (!analysisMessage || !analysisMessage.function_call) {
      throw new Error('No analysis or function call found');
    }

    const analysis = JSON.parse(analysisMessage.function_call.arguments);

    // Cache the result
    await redis.set(cacheKey, JSON.stringify({ analysis, threadId: thread.id }), { ex: CACHE_TTL });

    res.status(200).json({ analysis, threadId: thread.id });
  } catch (error) {
    console.error('Error analyzing MI metrics:', error);
    if (error.message === 'Analysis timeout') {
      res.status(504).json({ error: 'Analysis timed out' });
    } else {
      res.status(500).json({ error: 'Error analyzing MI metrics' });
    }
  }
}