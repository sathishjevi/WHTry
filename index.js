const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// --- Environment variables ---
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "mytoken"; // verification token
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN; // permanent token
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID; // phone number ID

// --- GET Webhook verification ---
app.get("/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook Verified!");
    return res.status(200).send(challenge);
  } else {
    console.log("Webhook Verification Failed");
    return res.sendStatus(403);
  }
});

// --- POST: Incoming WhatsApp messages + async reply ---
app.post("/whatsapp/webhook", async (req, res) => {
  try {
    // Always respond 200 immediately to Meta
    res.sendStatus(200);

    // --- Safety checks ---
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

    // Debug logs
    console.log("WHATSAPP_TOKEN length:", WHATSAPP_TOKEN?.length || "undefined");
    console.log("WHATSAPP_PHONE_ID:", WHATSAPP_PHONE_ID || "undefined");

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
      console.error("Missing WhatsApp token or phone ID!");
      return;
    }

    // --- Send reply asynchronously ---
    await axios.post(
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
        timeout: 4000,
      }
    );

    console.log(`Reply sent to ${from}`);
  } catch (err) {
    console.error("Error sending reply:", err.response?.data || err.message || err);
  }
});

// --- Health check endpoint ---
app.get("/health", (req, res) => {
  res.status(200).send("Webhook is running");
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WhatsApp Webhook running on port ${PORT}`);
});
