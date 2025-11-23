import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

// === PUT YOUR REAL MURF API KEY HERE ===
const MURF_API_KEY = "ap2_1d9b158a-dd9a-4cb1-ab3c-b36c78ed9e9c";

// ================================
// AUTO RESET ON SERVER START
// ================================
let wellness = {
  name: "",
  age: "",
  goal: "",
  activity: "",
  diet: "",
  notes: "",
  completed: false
};

// delete old summary file
try { fs.unlinkSync("health_summary.json"); } catch (e) {}
console.log("Wellness state auto-reset on server start.");

// ================================
// Save Summary
// ================================
function saveSummary() {
  try {
    fs.writeFileSync("health_summary.json", JSON.stringify(wellness, null, 2));
    console.log("Saved health_summary.json");
  } catch (err) {
    console.error("Save failed:", err);
  }
}

// ================================
// Extract Name Properly
// ================================
function cleanName(text) {
  if (!text) return "";

  let cleaned = text
    .toLowerCase()
    .replace("my name is", "")
    .replace("i am", "")
    .replace("i'm", "")
    .replace("this is", "")
    .trim();

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  return cleaned;
}

// ================================
// Next Question Logic
// ================================
function nextQuestion() {
  if (!wellness.name) return "Great — what's your name?";
  if (!wellness.age) return `Nice to meet you, ${wellness.name}. How old are you?`;
  if (!wellness.goal) return "What's your main health goal? (lose weight / build muscle / stay fit)";
  if (!wellness.activity) return "How active are you generally? (low / moderate / high)";
  if (!wellness.diet) return "Any diet preference? (vegetarian / vegan / non-vegetarian)";
  if (!wellness.notes) return "Any important health notes? (allergies, pains, or 'none')";
  return null;
}

// ================================
// MAIN ENDPOINT
// ================================
app.post("/api/wellness", async (req, res) => {
  try {
    const textRaw = (req.body.text || "").trim();
    const text = textRaw.toLowerCase();

    // fill fields step-by-step
    if (!wellness.name) {
      const nm = cleanName(textRaw);
      wellness.name = nm.length < 2 ? "User" : nm;
    } 
    else if (!wellness.age) {
      const match = text.match(/\d{1,3}/);
      wellness.age = match ? match[0] : textRaw;
    } 
    else if (!wellness.goal) {
      wellness.goal = textRaw || "Not specified";
    } 
    else if (!wellness.activity) {
      if (text.includes("low")) wellness.activity = "low";
      else if (text.includes("moderate")) wellness.activity = "moderate";
      else if (text.includes("high")) wellness.activity = "high";
      else wellness.activity = textRaw;
    } 
    else if (!wellness.diet) {
      if (text.includes("vegan")) wellness.diet = "vegan";
      else if (text.includes("veg")) wellness.diet = "vegetarian";
      else if (text.includes("non")) wellness.diet = "non-vegetarian";
      else wellness.diet = textRaw;
    } 
    else if (!wellness.notes) {
      const noWords = ["no", "none", "nothing", "no issues", "no issue"];
      wellness.notes = noWords.includes(text.trim()) ? "No major issues" : textRaw;
      wellness.completed = true;
    }

    // define next reply
    let reply = nextQuestion();

    // final summary
    if (!reply) {
      reply = `Thanks ${wellness.name}. Here is your wellness summary: Age ${wellness.age}. Goal: ${wellness.goal}. Activity: ${wellness.activity}. Diet: ${wellness.diet}. Health notes: ${wellness.notes}.`;
      saveSummary();
    }

    console.log("Reply:", reply);

    // Murf TTS
    let audioUrl = null;
    try {
      const murfRes = await fetch("https://api.murf.ai/v1/speech/generate", {
        method: "POST",
        headers: {
          "api-key": MURF_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          voiceId: "natalie",
          text: reply,
          format: "mp3"
        })
      });

      const data = await murfRes.json();
      audioUrl = data.audioFile || data.audio || null;
    } catch (err) {
      console.error("Murf error:", err);
    }

    return res.json({ reply, audioUrl, wellness });

  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

// Manual reset (optional)
app.post("/api/reset", () => {
  wellness = { name: "", age: "", goal: "", activity: "", diet: "", notes: "", completed: false };
  try { fs.unlinkSync("health_summary.json"); } catch (e) {}
  return { ok: true };
});

// Start server
app.listen(8000, () => console.log("Wellness Agent running on http://localhost:8000"));
