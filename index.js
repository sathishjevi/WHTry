const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// 👇 Use your own token (same as the one in Meta dashboard)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "my_verify_token";

app.use(bodyParser.json());

// ✅ Verification endpoint (GET)
app.get("/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ Handle incoming messages (POST)
app.post("/whatsapp/webhook", (req, res) => {
  console.log("📩 Incoming Message:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// Health check (optional)
app.get("/", (req, res) => res.send("✅ WhatsApp Webhook is running!"));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
});
