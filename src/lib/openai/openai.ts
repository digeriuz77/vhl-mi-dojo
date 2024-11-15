import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return response.data[0].embedding;
}

export async function getCompletion(prompt: string) {
  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
  return chatCompletion.choices[0].message.content;
}

export async function getAssistantResponse(threadId: string, assistantId: string, userMessage: string) {
  // Add the user's message to the thread
  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: userMessage
  });

  // Run the assistant
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId
  });

  // Wait for the run to complete
  let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
  while (runStatus.status !== "completed") {
    await new Promise(resolve => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
  }

  // Retrieve the assistant's response
  const messages = await openai.beta.threads.messages.list(threadId);
  const assistantMessages = messages.data.filter(message => message.role === "assistant");
  return assistantMessages[0].content[0].text.value;
}