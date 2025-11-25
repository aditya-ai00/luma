import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

// PUT YOUR MURF KEY HERE
const MURF_API_KEY = "ap2_1d9b158a-dd9a-4cb1-ab3c-b36c78ed9e9c";

// Load content
const content = JSON.parse(
  fs.readFileSync("day4_tutor_content.json", "utf8")
);

let state = {
  mode: "",
  concept: ""
};

function getConcept(id) {
  return content.find((c) => c.id === id);
}

function detectMode(text) {
  if (text.includes("learn")) return "learn";
  if (text.includes("quiz")) return "quiz";
  if (text.includes("teach")) return "teach_back";
  return null;
}

async function speak(text, voiceId) {
  const murf = await fetch("https://api.murf.ai/v1/speech/generate", {
    method: "POST",
    headers: {
      "api-key": MURF_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      voiceId,
      text,
      format: "mp3"
    })
  });

  const data = await murf.json();
  return data.audioFile || null;
}

app.post("/api/tutor", async (req, res) => {
  const msg = req.body.text.toLowerCase();
  let reply = "";
  let audioUrl = "";

  const modeSwitch = detectMode(msg);
  if (modeSwitch) {
    state.mode = modeSwitch;
    reply = `Mode changed to ${state.mode}. Which concept do you want? variables or loops?`;
    audioUrl = await speak(reply, "Matthew");
    return res.json({ reply, audioUrl, state });
  }

  if (!state.concept) {
    if (msg.includes("variable")) state.concept = "variables";
    if (msg.includes("loop")) state.concept = "loops";

    if (!state.concept) {
      reply = "Which concept do you want to study? variables or loops?";
      audioUrl = await speak(reply, "Matthew");
      return res.json({ reply, audioUrl, state });
    }
  }

  const concept = getConcept(state.concept);

  if (state.mode === "learn") {
    reply = concept.summary;
    audioUrl = await speak(reply, "Matthew");
  } else if (state.mode === "quiz") {
    reply = concept.sample_question;
    audioUrl = await speak(reply, "Alicia");
  } else if (state.mode === "teach_back") {
    reply = `Okay, explain this: ${concept.sample_question}`;
    audioUrl = await speak(reply, "Ken");
  } else {
    reply = "Welcome! Choose a mode: learn, quiz, or teach_back.";
    audioUrl = await speak(reply, "Matthew");
  }

  res.json({ reply, audioUrl, state });
});

app.listen(8000, () =>
  console.log("Day 4 Tutor running on http://localhost:8000")
);

