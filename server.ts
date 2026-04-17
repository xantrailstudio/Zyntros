import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser for POST requests
  app.use(express.json());

  // API Route for Image Generation (Proxy to Pollinations)
  app.get("/api/generate-image", async (req, res) => {
    const { prompt, seed, width, height, model } = req.query;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.POLLUNATION_API_KEY;
    
    // Construct Pollinations URL
    // Default values if not provided
    const s = seed || Math.floor(Math.random() * 1000000);
    const w = width || 1024;
    const h = height || 1024;
    const m = model || "flux";

    const pollinationsUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt as string)}?width=${w}&height=${h}&seed=${s}&model=${m}`;

    try {
      // We fetch the image from Pollinations using the API key in headers
      const response = await axios.get(pollinationsUrl, {
        responseType: "arraybuffer",
        headers: apiKey ? {
          "Authorization": `Bearer ${apiKey}`
        } : {}
      });

      // Forward the image data and content type
      res.setHeader("Content-Type", response.headers["content-type"] || "image/jpeg");
      res.send(response.data);
    } catch (error) {
      console.error("Error generating image via proxy:", error);
      res.status(500).json({ error: "Failed to generate image" });
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
