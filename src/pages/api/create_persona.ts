import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const createPersonaFunctionDefinition = {
  name: 'create_persona',
  description: 'Create a persona for Motivational Interviewing practice',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
      background: { type: 'string' },
      health_issue: { type: 'string' },
      change_readiness: { type: 'string', enum: ['pre-contemplation', 'contemplation', 'preparation', 'action', 'maintenance'] },
      personality_traits: { type: 'array', items: { type: 'string' } },
    },
    required: ['name', 'age', 'background', 'health_issue', 'change_readiness', 'personality_traits'],
  },
};

const validScenarioTypes = ['chronic_illness', 'addiction', 'lifestyle_change', 'mental_health', 'preventive_care'];
const validChangeReadiness = ['pre-contemplation', 'contemplation', 'preparation', 'action', 'maintenance'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  const { scenario_type, change_readiness } = req.body;

  if (!validScenarioTypes.includes(scenario_type)) {
    return res.status(400).json({ error: 'Invalid scenario_type provided' });
  }

  if (!validChangeReadiness.includes(change_readiness)) {
    return res.status(400).json({ error: 'Invalid change_readiness provided' });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4-0613',
      messages: [
        {
          role: 'system',
          content: 'You are to create a persona for MI practice.',
        },
        {
          role: 'user',
          content: `Create a persona for a ${scenario_type} scenario with ${change_readiness} change readiness.`,
        },
      ],
      functions: [createPersonaFunctionDefinition],
      function_call: { name: 'create_persona' },
    });

    const functionCall = response.choices[0].message.function_call;
    if (functionCall && functionCall.name === 'create_persona') {
      let persona;
      try {
        persona = JSON.parse(functionCall.arguments);
      } catch (parseError) {
        console.error('Error parsing function call arguments:', parseError);
        return res.status(500).json({ error: 'Error parsing persona data' });
      }

      const personaId = `persona_${Date.now()}`; // Generate a unique ID
      // Here you would typically save the persona to a database
      // For now, we'll just return it
      res.status(200).json({ personaId, persona });
    } else {
      throw new Error('Unexpected response from OpenAI');
    }
  } catch (error) {
    console.error('Error creating persona:', error);
    res.status(500).json({ error: error.message || 'Error creating persona' });
  }
}