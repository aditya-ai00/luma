import express from "express";
import cors from "cors";
import fs from "fs";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(cors());

// 🔑 Murf TTS
const MURF_API_KEY = "";

async function murfSpeak(text) {
  try {
    const resp = await fetch("https://api.murf.ai/v1/speech/generate", {
      method: "POST",
      headers: {
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "GEN2",
        voiceId: "alicia",
        text,
        format: "mp3"
      })
    });
    const data = await resp.json();
    return data.audioFile || null;
  } catch {
    return null;
  }
}

// 🎭 Game state
let player = "";
let round = 0;
const MAX_ROUNDS = 3;
let waitingForActing = false;
const scenarios = JSON.parse(fs.readFileSync("scenarios.json", "utf8"));

app.post("/api/improv", async (req, res) => {
  const text = req.body.text.trim();

  // Step 1: ask name
  if (!player) {
    player = text;
    const msg = `Welcome ${player} to Improv Battle. Get ready for fun improv scenes! Say START to begin.`;
    return res.json({ reply: msg, audioUrl: await murfSpeak(msg) });
  }

  // Start game
  if (/start/i.test(text) && round === 0) {
    round = 1;
    waitingForActing = true;
    const scene = scenarios[round - 1];
    const msg = `Round ${round}. ${scene.prompt} Start acting now.`;
    return res.json({ reply: msg, audioUrl: await murfSpeak(msg) });
  }

  // Player improv response
  if (waitingForActing) {
    waitingForActing = false;
    const reaction = scenarios[round - 1].reaction;
    const msg = `${reaction}. Say NEXT to move to the next round.`;
    return res.json({ reply: msg, audioUrl: await murfSpeak(msg) });
  }

  // Next round
  if (/next/i.test(text)) {
    round++;
    if (round > MAX_ROUNDS) {
      const msg = `And that's a wrap ${player}! You completed Improv Battle! Amazing performance.`;
      player = "";
      round = 0;
      return res.json({ reply: msg, audioUrl: await murfSpeak(msg) });
    }
    waitingForActing = true;
    const scene = scenarios[round - 1];
    const msg = `Round ${round}. ${scene.prompt} Start acting now.`;
    return res.json({ reply: msg, audioUrl: await murfSpeak(msg) });
  }

  const msg = `Say START to begin or NEXT to continue.`;
  res.json({ reply: msg, audioUrl: await murfSpeak(msg) });
});

// Start server
app.listen(8000, () => console.log("Improv Battle running on http://localhost:8000"));

