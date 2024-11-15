import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const updatePersonaFunctionDefinition = {
  name: "update_persona_characteristics",
  description: "Update client persona based on session interaction",
  parameters: {
    type: "object",
    required: ["current_persona", "session_data"],
    properties: {
      current_persona: {
        type: "object",
        required: ["stage_of_change", "emotional_state"],
        properties: {
          stage_of_change: {
            type: "string",
            enum: ["pre-contemplation", "contemplation", "preparation", "action", "maintenance"],
            description: "Current stage in change process"
          },
          emotional_state: {
            type: "object",
            required: ["primary_emotion", "intensity"],
            properties: {
              primary_emotion: {
                type: "string",
                description: "The primary emotion of the client"
              },
              intensity: {
                type: "integer",
                description: "Intensity of the primary emotion on a scale from 1 to 10"
              }
            },
            additionalProperties: false
          }
        },
        additionalProperties: false
      },
      session_data: {
        type: "object",
        required: ["session_context"],
        properties: {
          session_context: {
            type: "object",
            required: ["rapport_level", "significant_events"],
            properties: {
              rapport_level: {
                type: "integer",
                description: "Rapport level with the client on a scale from 1 to 10"
              },
              significant_events: {
                type: "array",
                items: {
                  type: "string",
                  description: "List of significant events that occurred during the session"
                },
                description: "Array of significant events"
              }
            },
            additionalProperties: false
          }
        },
        additionalProperties: false
      }
    },
    additionalProperties: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  const { current_persona, session_data } = req.body;

  // Input validation
  if (!current_persona || !session_data) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4-0613',
      messages: [
        {
          role: 'system',
          content: 'You are to update a persona for MI practice based on session interaction.',
        },
        {
          role: 'user',
          content: JSON.stringify({ current_persona, session_data }),
        },
      ],
      functions: [updatePersonaFunctionDefinition],
      function_call: { name: 'update_persona_characteristics' },
    });

    const functionCall = response.choices[0].message.function_call;
    if (functionCall && functionCall.name === 'update_persona_characteristics') {
      let updatedPersona;
      try {
        updatedPersona = JSON.parse(functionCall.arguments);
      } catch (parseError) {
        console.error('Error parsing function call arguments:', parseError);
        return res.status(500).json({ error: 'Error parsing updated persona data' });
      }

      // Here you would typically update the persona in your database
      // For now, we'll just return the updated persona
      res.status(200).json({ updatedPersona });
    } else {
      throw new Error('Unexpected response from OpenAI');
    }
  } catch (error) {
    console.error('Error updating persona:', error);
    res.status(500).json({ error: error.message || 'Error updating persona' });
  }
}