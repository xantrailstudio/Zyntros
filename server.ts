import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

import Groq from "groq-sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Groq
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Body parser for POST requests
  app.use(express.json());

  // API Route for Text Generation (Proxy to Groq)
  app.post("/api/chat", async (req, res) => {
    const { messages, model } = req.body;
    const selectedModel = model || "llama-3.3-70b-versatile";

    console.log(`[AI Proxy] Generating text with Groq model: ${selectedModel}`);

    try {
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
      res.send(text);
    } catch (error: any) {
      console.error("Error in Groq proxy:", error.message);
      res.status(500).send(`AI Service Error: ${error.message}`);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
