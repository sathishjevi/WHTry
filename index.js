const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// --- Environment variables ---
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "mytoken"; // webhook verification
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN; // permanent token
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID; // phone number ID
const ASTROBOT_URL = process.env.ASTROBOT_URL; // your AstroBot service endpoint

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

// --- POST: Incoming WhatsApp messages + bot reply ---
app.post("/whatsapp/webhook", async (req, res) => {
  try {
    // Respond 200 immediately
    res.sendStatus(200);

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

    // Check essential env vars
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
      console.error("Missing WhatsApp token or phone ID!");
      return;
    }
    if (!ASTROBOT_URL) {
      console.error("Missing AstroBot URL!");
      return;
    }

    // --- Send message to AstroBot service ---
    let botReply = "Sorry, I couldn't get a reply.";
    try {
      const botResponse = await axios.post(ASTROBOT_URL, { message: text, from });
      if (botResponse.data && botResponse.data.reply) {
        botReply = botResponse.data.reply;
      }
    } catch (err) {
      console.error("Error contacting AstroBot:", err.response?.data || err.message || err);
    }

    // --- Send reply via WhatsApp ---
    await axios.post(
      `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: botReply },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 4000,
      }
    );

    console.log(`Reply sent to ${from}: ${botReply}`);

  } catch (err) {
    console.error("Webhook POST error:", err.response?.data || err.message || err);
  }
});

// --- Health check ---
app.get("/health", (req, res) => {
  res.status(200).send("Webhook is running");
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WhatsApp Webhook running on port ${PORT}`);
});
