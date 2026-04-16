export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      model: 'openai', // Default model for Pollinations text
      seed: Math.floor(Math.random() * 1000000),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate text from Pollinations');
  }

  return response.text();
}
