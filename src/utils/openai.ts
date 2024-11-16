import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function createThread() {
  try {
    const thread = await openai.beta.threads.create();
    return thread.id;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw new Error('Failed to create thread');
  }
}

export async function addMessageToThread(threadId: string, content: string) {
  try {
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: content,
    });
  } catch (error) {
    console.error('Error adding message to thread:', error);
    throw new Error('Failed to add message to thread');
  }
}

export async function runAssistant(threadId: string, assistantId: string) {
  try {
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });

    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

    if (assistantMessage && assistantMessage.content[0].type === 'text') {
      return assistantMessage.content[0].text.value;
    } else {
      throw new Error('No valid assistant response found');
    }
  } catch (error) {
    console.error('Error running assistant:', error);
    throw new Error('Failed to run assistant');
  }
}