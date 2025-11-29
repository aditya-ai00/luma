
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

app.use(cors({
  origin: "http://localhost:5508"
}));

// ⬅️ Replace with your Murf API key
const MURF_API_KEY = "";

const PORT = 8000;

// Game master persona & memory
const GM_NAME = "Arion Stormweaver";
let storyLog = [];
let active = true;

async function murfSpeak(text) {
  try {
    const resp = await fetch("https://api.murf.ai/v1/speech/generate", {
      method: "POST",
      headers: {
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        voiceId: "matthew",   // sounds cinematic + deep
        format: "mp3"
      })
    });
    const data = await resp.json();
    return data.audioFile || null;
  } catch (e) {
    console.error("Murf error:", e);
    return null;
  }
}

// Reset story
function resetStory() {
  storyLog = [];
  active = true;
}

function gmResponse(user) {
  storyLog.push({ role: "user", content: user });

  if (storyLog.length === 1) {
    return `${GM_NAME}: Welcome to the neon city of Synthara. 
The sky glows purple and rain sparks like electricity on chrome streets. 
You awaken in an abandoned hover-train station, holding a data-chip marked “Omega Sequence”.
Footsteps echo behind you. A masked hunter spots you and reaches for a weapon.
What do you do?`;
  }

  if (/attack|fight|punch|shoot/.test(user)) {
    return `${GM_NAME}: You charge forward with fearless instinct. 
A burst of neon light blinds your enemy and you knock the hunter to the ground, 
but a cyber-hound leaps toward you from the shadows.
What is your next move?`;
  }

  if (/run|escape|hide/.test(user)) {
    return `${GM_NAME}: You sprint into the rain-lit alley — neon signs flicker above your head. 
A hover-bike boots up nearby, its engine humming. 
You also notice a sewer hatch glowing with a blue security lock.
Bike or hatch — where do you go?`;
  }

  if (/bike/.test(user)) {
    return `${GM_NAME}: You ignite the hover-bike and launch into the skyways! 
Drones chase but you weave between skyscrapers. 
An encrypted message appears on your visor: “Deliver Omega Sequence to District 7 to stop the Blackout”.
Do you accept the mission — yes or no?`;
  }

  if (/hatch|sewer/.test(user)) {
    return `${GM_NAME}: The hatch opens with a burst of steam and you descend into the under-net. 
Hackers whisper digital chants as screens glow around you. 
They ask: “Do you seek refuge or do you seek power?”`;
  }

  if (/yes|accept/.test(user)) {
    active = false;
    return `${GM_NAME}: You roar toward District 7 and plug the Omega Sequence into the quantum relay. 
A wave of white-blue light sweeps the city — the Blackout is stopped.
You saved Synthara.`;
  }

  if (/no|reject/.test(user)) {
    active = false;
    return `${GM_NAME}: You destroy the Omega Sequence. 
Moments later, darkness engulfs the city — the Blackout begins.
You chose rebellion over salvation.`;
  }

  return `${GM_NAME}: The neon world shifts around you. Destiny waits. What do you do next?`;
}

app.post("/api/game", async (req, res) => {
  const text = (req.body.text || "").trim();

  // Restart command
  if (text.toLowerCase() === "restart") {
    resetStory();
    const reply = `${GM_NAME}: Story restarted. You awake in Synthara once again. A masked hunter spots you. What do you do?`;
    return res.json({ reply, audioUrl: await murfSpeak(reply) });
  }

  const reply = gmResponse(text);
  const audioUrl = await murfSpeak(reply);
  res.json({ reply, audioUrl });
});

app.listen(PORT, () => console.log(`Game Master running on http://localhost:${PORT}`));
