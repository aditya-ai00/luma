import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// Your Murf API key
const MURF_API_KEY = "ap2_1d9b158a-dd9a-4cb1-ab3c-b36c78ed9e9c";

// Simple route for Day 1
app.post("/api/tts", async (req, res) => {
  const text = req.body.text;

  try {
    const response = await fetch("https://api.murf.ai/v1/speech/generate", {
      method: "POST",
      headers: {
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voiceId: "natalie",   // voice for Day 1
        text: text,
        format: "mp3",
      }),
    });

    const data = await response.json();
    console.log("MURF RESPONSE:", data);

    return res.json({
      audioUrl: data.audioFile,
      text: text,
    });

  } catch (err) {
    console.error("TTS ERROR:", err);
    res.status(500).json({ error: "TTS failed" });
  }
});

app.listen(8000, () => {
  console.log("Day 1 Agent running on http://localhost:8000");
});
