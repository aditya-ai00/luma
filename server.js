import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const MURF_API_KEY = "ap2_1d9b158a-dd9a-4cb1-ab3c-b36c78ed9e9c";

app.post("/api/tts", async (req, res) => {
  const text = req.body.text;

  try {
    const murfRes = await fetch("https://api.murf.ai/v1/speech/generate", {
      method: "POST",
      headers: {
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        voiceId: "natalie",   // Natalie works on FREE plan
        text: text,
        format: "mp3"
      })
    });

    const data = await murfRes.json();
    console.log("MURF RESPONSE:", data);

    if (!data.audioFile) {
  return res.status(400).json({ error: "Murf returned no audio", murf: data });
}

return res.json({
  audioUrl: data.audioFile,   // CORRECT field
  text
});


  } catch (err) {
    console.error("MURF ERROR:", err);
    res.status(500).json({ error: "TTS FAILED" });
  }
});

app.listen(8000, () => {
  console.log("Backend running on http://localhost:8000");
});
