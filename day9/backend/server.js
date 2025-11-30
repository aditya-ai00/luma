import express from "express";
import cors from "cors";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";

const app = express();
app.use(express.json());
app.use(cors());

// 🔑 Your Murf GEN2 API key
const MURF_API_KEY = 

// 📁 Data files
const CATALOG_PATH = path.resolve("catalog.json");
const ORDERS_PATH = path.resolve("orders.json");

let catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
if (!fs.existsSync(ORDERS_PATH)) fs.writeFileSync(ORDERS_PATH, "[]", "utf8");

let cart = [];
let userName = "";
let lastShownProducts = [];

/* --------------------------------------------------
   🔊 Murf GEN2 TTS
-------------------------------------------------- */
async function murfSpeak(text) {
  try {
    const response = await fetch("https://api.murf.ai/v1/speech/generate", {
      method: "POST",
      headers: {
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "GEN2",
        voiceId: "alicia",
        format: "mp3",
        text
      })
    });

    const data = await response.json();
    console.log("Murf:", data);
    return data.audioFile || null;
  } catch (err) {
    console.error("Murf GEN2 error:", err);
    return null;
  }
}

/* --------------------------------------------------
   🛍️ Voice Commerce Agent
-------------------------------------------------- */
app.post("/api/shop", async (req, res) => {
  const text = (req.body.text || "").toLowerCase().trim();

  // Initial: ask for name
  if (!userName) {
    userName = req.body.text.trim();
    const reply = `Hi ${userName}, I can help you shop. What do you want to buy?`;
    return res.json({ reply, audioUrl: await murfSpeak(reply) });
  }

  // Show categories / matching items
  const found = catalog.filter(p =>
    p.name.toLowerCase().includes(text) ||
    p.category.toLowerCase().includes(text)
  );

  if (found.length) {
    lastShownProducts = found;
    const list = found.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} ₹${p.price}`).join("\n");
    const reply = `Here are some matches:\n${list}. Say the number to add to cart.`;
    return res.json({ reply, audioUrl: await murfSpeak(reply) });
  }

  // Add item by serial number
  let pick = text.match(/(\d+)/);
  if (pick && lastShownProducts.length) {
    let index = parseInt(pick[1]) - 1;
    if (index >= 0 && index < lastShownProducts.length) {
      const item = lastShownProducts[index];
      cart.push(item);
      const reply = `${item.name} added to cart. Anything else?`;
      return res.json({ reply, audioUrl: await murfSpeak(reply) });
    }
  }

  // Show cart
  if (/cart|show/.test(text)) {
    if (!cart.length) {
      const reply = "Your cart is empty.";
      return res.json({ reply, audioUrl: await murfSpeak(reply) });
    }
    const msg = cart.map(i => i.name).join(", ");
    const reply = `Your cart contains: ${msg}. Say place order to checkout.`;
    return res.json({ reply, audioUrl: await murfSpeak(reply) });
  }

  // Place order
  if (/place|checkout|order|finish|done/.test(text)) {
    if (!cart.length) {
      const reply = "Your cart is empty.";
      return res.json({ reply, audioUrl: await murfSpeak(reply) });
    }

    const total = cart.reduce((t, i) => t + i.price, 0);
    const order = {
      id: Date.now(),
      user: userName,
      items: cart,
      total,
      currency: "INR",
      timestamp: new Date().toISOString()
    };

    const orders = JSON.parse(fs.readFileSync(ORDERS_PATH, "utf8"));
    orders.push(order);
    fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2));

    cart = [];

    const reply = `Order placed successfully. Total amount is ₹${total}.`;
    return res.json({ reply, audioUrl: await murfSpeak(reply) });
  }

  // Fallback
  const reply = "You can tell me what you want to buy, show cart or place order.";
  res.json({ reply, audioUrl: await murfSpeak(reply) });
});

/* -------------------------------------------------- */
app.listen(8000, () => console.log("E-commerce Agent running on http://localhost:8000"));


