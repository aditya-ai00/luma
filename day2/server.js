import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

// Put your Murf API key here
const MURF_API_KEY = "ap2_1d9b158a-dd9a-4cb1-ab3c-b36c78ed9e9c";

// ------------------------------
// ORDER STATE
// ------------------------------

let order = {
  drinkType: "",
  size: "",
  milk: "",
  extras: [],
  name: ""
};

// Save order to order.json
function saveOrder() {
  fs.writeFileSync("order.json", JSON.stringify(order, null, 2));
}

// ------------------------------
// BARISTA LOGIC
// ------------------------------

app.post("/api/barista", async (req, res) => {
  const userMsg = req.body.text.toLowerCase();
  let nextQ = "";

  // STEP 1: Ask for name
  if (!order.name) {
    order.name = userMsg;
    nextQ = `Nice to meet you, ${order.name}. What drink would you like to order?`;
  }

  // STEP 2: Drink type
  else if (!order.drinkType) {
    order.drinkType = userMsg;
    nextQ = "Got it! What size would you like? Small, medium, or large?";
  }

  // STEP 3: Size
  else if (!order.size) {
    order.size = userMsg;
    nextQ = "Perfect. What kind of milk should I use?";
  }

  // STEP 4: Milk
  else if (!order.milk) {
    order.milk = userMsg;
    nextQ = "Any extras? Like sugar, cream, caramel?";
  }

  // STEP 5: Extras
  else if (order.extras.length === 0) {
    order.extras = userMsg.split(",").map(e => e.trim());
    nextQ = null; // means order is complete
  }

  let reply;

  // If order incomplete → ask next question
  if (nextQ) {
    reply = nextQ;
  }

  // If order complete → final summary + save JSON
  else {
    reply = `Great ${order.name}! Your ${order.size} ${order.drinkType} with ${order.milk} milk and extras (${order.extras.join(", ")}) is ready!`;
    saveOrder();
  }

  // ------------------------------
  // MURF TTS REQUEST
  // ------------------------------
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

  return res.json({
    reply,
    audioUrl: data.audioFile,
    order
  });
});

// ------------------------------

app.listen(8000, () => {
  console.log("Barista Agent running on http://localhost:8000");
});
