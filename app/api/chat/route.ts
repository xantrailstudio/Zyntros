import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();
    const selectedModel = model || "llama-3.3-70b-versatile";

    console.log(`[AI Proxy] Generating text with Groq model: ${selectedModel}`);

    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set in environment variables");
    }

    const completion = await groq.chat.completions.create({
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content
      })),
      model: selectedModel,
      temperature: 0.7,
      max_tokens: 4096,
    });

    const text = completion.choices[0]?.message?.content || "";
    return new NextResponse(text);
  } catch (error: any) {
    console.error("Error in Groq proxy:", error.message);
    return new NextResponse(`AI Service Error: ${error.message}`, { status: 500 });
  }
}
