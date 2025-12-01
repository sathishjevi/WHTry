const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// Webhook verification token (your choice)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "mytoken";

// --- GET Webhook verification ---
app.get("/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook Verified!");
    res.status(200).send(challenge);
  } else {
    console.log("Webhook Verification Failed");
    res.sendStatus(403);
  }
});

// --- POST: Incoming WhatsApp messages + auto-reply ---
app.post("/whatsapp/webhook", async (req, res) => {
  try {
    const entry = req.body.entry && req.body.entry[0];
    const changes = entry?.changes && entry.changes[0];
    const messages = changes?.value?.messages;

    if (messages && messages.length > 0) {
      const msg = messages[0];
      const from = msg.from; // sender phone number
      const text = msg.text?.body || "No text";

      console.log(`Incoming message from ${from}: ${text}`);

      // Send reply using WhatsApp Cloud API
      await axios.post(
        `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          text: { body: `You said: ${text}` },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`Reply sent to ${from}`);
    }

    // Always respond 200 OK to Meta
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err.response?.data || err.message || err);
    res.sendStatus(500);
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
