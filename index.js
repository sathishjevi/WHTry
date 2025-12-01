const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "mytoken";

// --- GET Webhook verification ---
app.get("/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook Verified!");
    res.status(200).send(challenge);
  } else {
    console.log("Webhook Verification Failed");
    res.sendStatus(403);
  }
});

// --- POST: Incoming WhatsApp messages ---
app.post("/whatsapp/webhook", (req, res) => {
  console.log("Incoming Webhook:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
