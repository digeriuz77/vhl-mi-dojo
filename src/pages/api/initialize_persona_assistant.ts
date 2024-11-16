import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { persona } = await req.json();

    if (!persona) {
      return NextResponse.json({ error: 'Missing persona data' }, { status: 400 });
    }

    // Create a new thread
    const thread = await openai.beta.threads.create();

    // Create a system message with the persona information
    const systemMessage = `You are role-playing as a person with the following characteristics:
Name: ${persona.name}
Age: ${persona.age}
Background: ${persona.background}
Health Issue: ${persona.health_issue}
Change Readiness: ${persona.change_readiness}
Personality Traits: ${persona.personality_traits.join(', ')}

Respond to the user's messages in character, based on these traits and your current state of change readiness regarding your health issue.`;

    // Add the system message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'system',
      content: systemMessage,
    });

    return NextResponse.json({ threadId: thread.id });
  } catch (error) {
    console.error('Error initializing persona assistant:', error);
    return NextResponse.json({ error: 'Failed to initialize persona assistant' }, { status: 500 });
  }
}