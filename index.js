const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// Environment variables
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "mytoken";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

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

// --- POST: Incoming WhatsApp messages + async reply ---
app.post("/whatsapp/webhook", (req, res) => {
  try {
    // Always respond 200 immediately
    res.sendStatus(200);

    // Safety checks for payload
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages;

    if (!messages || messages.length === 0) {
      console.log("No messages found in webhook payload.");
      return;
    }

    const msg = messages[0];
    const from = msg.from; // sender phone number
    const text = msg.text?.body || "No text";

    console.log(`Incoming message from ${from}: ${text}`);

    // Send reply asynchronously
    axios.post(
      `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: `You said: ${text}` },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 4000 // 4 seconds max
      }
    )
    .then(() => {
      console.log(`Reply sent to ${from}`);
    })
    .catch(err => {
      console.error("Error sending reply:", err.response?.data || err.message || err);
    });

  } catch (err) {
    console.error("Webhook POST error:", err.message || err);
  }
});

// --- Health check endpoint ---
app.get("/health", (req, res) => {
  res.status(200).send("Webhook is running");
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
