import express from "express";
import cors from "cors";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";

const app = express();
app.use(express.json());

app.use(cors({
  origin: "http://localhost:5500"   // frontend port
}));

const MURF_API_KEY = "ap2_0ca37a78-d348-413d-a4b6-aefd93316c4f"; // your key
const MURF_ENDPOINT = "https://api.murf.ai/v1/speech/generate/gen2";
const PORT = 8000;

const CATALOG_PATH = path.resolve("catalog.json");
const ORDERS_PATH = path.resolve("orders.json");

let catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
if (!fs.existsSync(ORDERS_PATH)) fs.writeFileSync(ORDERS_PATH, "[]", "utf8");

let cart = [];
let userName = "";

// ---------- Murf Voice ----------
async function murfSpeak(text) {
  try {
    const resp = await fetch(MURF_ENDPOINT, {
      method: "POST",
      headers: { "api-key": MURF_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gen2",
        voiceId: "alicia",
        text,
        format: "mp3"
      })
    });
    const data = await resp.json();
    return data.audioFile || null;
  } catch (err) {
    console.error("TTS ERROR:", err);
    return null;
  }
}

// ---------- API ----------
app.post("/api/order", async (req, res) => {
  const text = (req.body.text || "").toLowerCase().trim();

  if (text === "reset") {
    cart = [];
    userName = "";
    const msg = "Cart cleared. Tell me your name to begin.";
    return res.json({ reply: msg, audioUrl: await murfSpeak(msg) });
  }

  if (!userName) {
    userName = req.body.text;
    const greeting = `Hi ${userName}, welcome to Zepto. What would you like to order first?`;
    return res.json({ reply: greeting, audioUrl: await murfSpeak(greeting) });
  }

  const match = text.match(/add (\d+)? ?(.+)/);
  if (match) {
    const qty = match[1] ? parseInt(match[1]) : 1;
    const itemName = match[2];

    const item = catalog.find(i => i.name.toLowerCase().includes(itemName));
    if (!item) {
      const msg = `I couldn't find ${itemName} in our Zepto catalog.`;
      return res.json({ reply: msg, audioUrl: await murfSpeak(msg) });
    }

    cart.push({ ...item, qty });
    const msg = `Added ${qty} ${item.name} to your cart. Anything else?`;
    return res.json({ reply: msg, audioUrl: await murfSpeak(msg) });
  }

  if (text.includes("cart")) {
    if (!cart.length) {
      const msg = "Your cart is empty.";
      return res.json({ reply: msg, audioUrl: await murfSpeak(msg) });
    }
    const msg = "Your cart has " + cart.map(c => `${c.qty}× ${c.name}`).join(", ");
    return res.json({ reply: msg, audioUrl: await murfSpeak(msg) });
  }

  if (text.includes("place") || text.includes("done") || text.includes("finish") || text.includes("order")) {
    const total = cart.reduce((t, c) => t + c.qty * c.price, 0);
    const order = {
      user: userName,
      items: cart,
      total,
      timestamp: new Date().toISOString()
    };

    const orders = JSON.parse(fs.readFileSync(ORDERS_PATH));
    orders.push(order);
    fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2));

    const msg = `Order placed successfully. Total bill ₹${total}.`;
    cart = [];
    userName = "";
    return res.json({ reply: msg, audioUrl: await murfSpeak(msg) });
  }

  const msg = "I can add groceries, show cart, or place order. Try saying 'add 2 milk'.";
  res.json({ reply: msg, audioUrl: await murfSpeak(msg) });
});

app.listen(PORT, () => console.log(`Zepto Agent running on http://localhost:${PORT}`));

