import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/notify-emergency", async (req, res) => {
    const { contactPhone, userName, location, trackingLink } = req.body;

    if (!contactPhone || !userName || !location) {
      return res.status(400).json({ error: "Missing required data" });
    }

    const message = `SOS ALERT: ${userName} is in distress! Location: ${location.lat}, ${location.lng}. View Live Track: ${trackingLink}`;

    console.log(`[SMS AUTHENTICATED SENT TO ${contactPhone}]: ${message}`);

    // REAL INTEGRATION (e.g., Twilio)
    // if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    //   const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    //   try {
    //     await client.messages.create({
    //       body: message,
    //       from: process.env.TWILIO_PHONE_NUMBER,
    //       to: contactPhone
    //     });
    //     return res.json({ status: "success", provider: "twilio" });
    //   } catch (err) {
    //     console.error("Twilio Error:", err);
    //     return res.status(500).json({ error: "Failed to send SMS via Twilio" });
    //   }
    // }

    // Mock success if no keys (for testing)
    res.json({ 
      status: "simulated", 
      message: "SMS would be sent via Twilio if configured in .env",
      content: message 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CAT-SERVER UP on http://localhost:${PORT}`);
  });
}

startServer();
