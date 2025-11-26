import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

const MURF_KEY = "ap2_1d9b158a-dd9a-4cb1-ab3c-b36c78ed9e9c";   // your key
const TTS_URL = "https://api.murf.ai/v1/speech/generate/gen2";
const PORT = 8000;

// Load FAQs
const FAQ_PATH = path.resolve("faqs.json");
let faqs = JSON.parse(fs.readFileSync(FAQ_PATH, "utf-8"));

// Lead store
const LEADS_PATH = path.resolve("leads.json");
if (!fs.existsSync(LEADS_PATH)) fs.writeFileSync(LEADS_PATH, "[]");

// SDR state
let collecting = false;
let current = {};
const fields = ["name", "company", "email", "role", "useCase", "teamSize", "timeline"];
let i = 0;

// Questions for each field
const prompts = {
  name: "Great — what's your name?",
  company: "Nice. What company do you represent?",
  email: "What's your work email?",
  role: "What's your role?",
  useCase: "What do you want to use Zomato for?",
  teamSize: "How many people are in your team?",
  timeline: "When do you plan to get started? (now / soon / later)"
};

async function speak(text, voice = "matthew") {
  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      "api-key": MURF_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gen2",
      voiceId: voice,
      text,
      format: "mp3"
    })
  });

  const data = await res.json();
  return data.audioFile || null;
}

app.post("/api/sdr", async (req, res) => {
  const q = (req.body.text || "").trim();
  const lower = q.toLowerCase();
  let reply = "";
  let audioUrl = "";

  // reset
  if (lower === "reset") {
    collecting = false;
    i = 0;
    current = {};
    reply = "Reset. How can I help you about Zomato today?";
    return res.json({ reply, audioUrl: await speak(reply), collecting, current });
  }

  // during lead collection
  if (collecting) {
    current[fields[i]] = q;
    i++;

    if (i >= fields.length) {
      // save
      const arr = JSON.parse(fs.readFileSync(LEADS_PATH, "utf8"));
      arr.push(current);
      fs.writeFileSync(LEADS_PATH, JSON.stringify(arr, null, 2));
      reply = `Thanks ${current.name}. Your details are saved. We'll reach out soon at ${current.email}.`;
      collecting = false;
      i = 0;
      return res.json({ reply, audioUrl: await speak(reply), collecting, current });
    }

    reply = prompts[fields[i]];
    return res.json({ reply, audioUrl: await speak(reply, "alicia"), collecting, current });
  }

  // If user wants SDR flow
  if (lower.includes("talk to sales") || lower.includes("interested") || lower.includes("demo")) {
    collecting = true;
    i = 0;
    current = {};
    reply = prompts["name"];
    return res.json({ reply, audioUrl: await speak(reply, "alicia"), collecting, current });
  }

  // FAQ answer
  const faq = faqs.find(f => lower.includes(f.question.toLowerCase().split(" ")[0]));
  if (faq) {
    reply = `${faq.answer}`;
    return res.json({ reply, audioUrl: await speak(reply), collecting, current });
  }

  reply = "Ask about Zomato product, pricing, FAQ or say 'I want to talk to sales'.";
  return res.json({ reply, audioUrl: await speak(reply), collecting, current });
});

app.listen(PORT, () => console.log(`SDR running → http://localhost:${PORT}`));

