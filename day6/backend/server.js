// Day 6 - Fraud Alert Voice Agent (backend)

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ===== Murf Falcon (Gen2) config =====
const MURF_API_KEY = "ap2_1d9b158a-dd9a-4cb1-ab3c-b36c78ed9e9c"; // <-- replace
const MURF_GEN2_ENDPOINT = "https://api.murf.ai/v1/speech/generate/gen2";
const PORT = 8000;

// ===== Load fraud cases "database" =====
const DB_PATH = path.join(__dirname, "fraud_cases.json");
let fraudCases = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

// Simple session state (single user demo)
let currentCase = null;
let step = "ask_name"; // ask_name -> verify -> confirm_txn -> done

function saveDb() {
  fs.writeFileSync(DB_PATH, JSON.stringify(fraudCases, null, 2));
}

function findCaseByName(name) {
  const n = name.trim().toLowerCase();
  return fraudCases.find(c => c.userName.toLowerCase() === n) || null;
}

async function speak(text, voiceId = "natalie") {
  try {
    const resp = await fetch(MURF_GEN2_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gen2",
        voiceId,
        text,
        format: "mp3"
      })
    });

    const data = await resp.json();
    console.log("MURF:", data.audioFile ? "audio OK" : data);
    return data.audioFile || null;
  } catch (err) {
    console.error("Murf error:", err);
    return null;
  }
}

// Reset helper
function resetSession() {
  currentCase = null;
  step = "ask_name";
}

// Main API
app.post("/api/fraud", async (req, res) => {
  const rawText = (req.body.text || "").trim();
  const text = rawText.toLowerCase();

  // user can always reset
  if (text === "reset" || text === "start over") {
    resetSession();
    const reply = "Session reset. Please tell me your first name to begin.";
    const audioUrl = await speak(reply);
    return res.json({ reply, audioUrl, step, fraudCase: null });
  }

  // STEP 1: ask for name → load case
  if (step === "ask_name") {
    const found = findCaseByName(rawText);
    if (!found) {
      const reply =
        "Hello, this is SecureBank's fraud monitoring unit. I couldn't match that name to any alert today. Please tell me the first name on your card.";
      const audioUrl = await speak(reply);
      return res.json({ reply, audioUrl, step, fraudCase: null });
    }

    currentCase = found;
    step = "verify";

    const reply = `Hi ${currentCase.userName}. This is SecureBank's fraud team calling about a suspicious card transaction. Before we continue, I need to verify you. ${currentCase.securityQuestion}`;
    const audioUrl = await speak(reply);
    return res.json({ reply, audioUrl, step, fraudCase: currentCase });
  }

  // STEP 2: verification
  if (step === "verify" && currentCase) {
    const answer = currentCase.securityAnswer.toLowerCase();

    const ok =
      text === answer ||
      text.includes(answer); // simple match

    if (!ok) {
      currentCase.status = "verification_failed";
      currentCase.note = "Verification failed: wrong security answer.";
      saveDb();
      step = "done";

      const reply =
        "I'm sorry, your answer does not match our records. For your security, I cannot continue this call. Please contact the bank using the number on the back of your card.";
      const audioUrl = await speak(reply, "matthew");
      return res.json({ reply, audioUrl, step, fraudCase: currentCase });
    }

    // verified → describe transaction
    step = "confirm_txn";
    const c = currentCase;
    const reply = `Thank you, verification complete. We detected a transaction of ${c.transactionAmount} at ${c.transactionName} in ${c.transactionLocation} on your card ending with ${c.cardEnding}, at ${c.transactionTime}. Did you make this transaction? Please answer yes or no.`;
    const audioUrl = await speak(reply, "matthew");
    return res.json({ reply, audioUrl, step, fraudCase: currentCase });
  }

  // STEP 3: confirm transaction
  if (step === "confirm_txn" && currentCase) {
    let reply;

    if (text.includes("yes")) {
      currentCase.status = "confirmed_safe";
      currentCase.note =
        "Customer confirmed transaction as legitimate. No action required.";
      saveDb();
      step = "done";

      reply =
        "Thank you. I have marked this transaction as safe and no further action is required. If you see anything unusual in future, please contact us immediately. Goodbye.";
      const audioUrl = await speak(reply, "natalie");
      return res.json({ reply, audioUrl, step, fraudCase: currentCase });
    }

    if (text.includes("no") || text.includes("not me")) {
      currentCase.status = "confirmed_fraud";
      currentCase.note =
        "Customer denied transaction. Card blocked and dispute initiated. (demo).";
      saveDb();
      step = "done";

      reply =
        "Thank you for confirming. I have marked this transaction as fraudulent. We are blocking this card and raising a dispute on your behalf. Our team will reach out with the next steps. This is a demo flow, no real action is taken. Goodbye.";
      const audioUrl = await speak(reply, "natalie");
      return res.json({ reply, audioUrl, step, fraudCase: currentCase });
    }

    // user said something else
    reply = "Please answer with yes or no. Did you make this transaction?";
    const audioUrl = await speak(reply, "matthew");
    return res.json({ reply, audioUrl, step, fraudCase: currentCase });
  }

  // STEP done
  if (step === "done") {
    const reply =
      "This fraud alert case is already completed. Type reset to start a new demo session.";
    const audioUrl = await speak(reply);
    return res.json({ reply, audioUrl, step, fraudCase: currentCase });
  }

  // fallback
  const reply =
    "This is SecureBank's fraud monitoring unit. Please tell me your first name to start, or type reset to restart the session.";
  const audioUrl = await speak(reply);
  resetSession();
  res.json({ reply, audioUrl, step, fraudCase: null });
});

// For debugging: see DB
app.get("/api/cases", (req, res) => {
  res.json(fraudCases);
});

app.listen(PORT, () => {
  console.log(`Fraud Agent running on http://localhost:${PORT}`);
});

