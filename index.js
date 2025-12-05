// index.js (copy this whole file)
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// --- Environment variables (required) ---
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "mytoken"; // webhook verification
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN; // permanent token
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID; // phone number ID

// Internal Astro service (Railway private DNS). Set this in Railway envs.
const ASTRO_INTERNAL_URL =
  process.env.ASTRO_INTERNAL_URL || "http://astro-app.up.railway.internal:3000/webhook";

// Secret header used for internal authentication between services
const ASTRO_SHARED_SECRET = process.env.ASTRO_SHARED_SECRET || "replace_with_strong_secret";

// Timeouts & retry config
const ASTRO_TIMEOUT_MS = parseInt(process.env.ASTRO_TIMEOUT_MS || "4000", 10);
const ASTRO_RETRY = parseInt(process.env.ASTRO_RETRY || "2", 10);

// --- GET Webhook verification (for Meta verification) ---
app.get("/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook Verified!");
    return res.status(200).send(challenge);
  } else {
    console.warn("Webhook Verification Failed", { mode, token });
    return res.sendStatus(403);
  }
});

// --- Helper: call Astro with retries ---
async function callAstro(payload) {
  let lastErr = null;
  for (let attempt = 1; attempt <= ASTRO_RETRY; attempt++) {
    try {
      const resp = await axios.post(
        ASTRO_INTERNAL_URL,
        payload,
        {
          timeout: ASTRO_TIMEOUT_MS,
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": ASTRO_SHARED_SECRET
          }
        }
      );
      return resp.data;
    } catch (err) {
      lastErr = err;
      console.warn(`Astro call attempt ${attempt} failed:`, err.message || err);
      // basic backoff
      await new Promise(r => setTimeout(r, 200 * attempt));
    }
  }
  throw lastErr;
}

// --- POST: Incoming WhatsApp messages + bot reply ---
app.post("/whatsapp/webhook", async (req, res) => {
  try {
    // Immediately acknowledge to WhatsApp
    res.sendStatus(200);

    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages;

    if (!messages || messages.length === 0) {
      console.log("No messages found in webhook payload.");
      return;
    }

    const msg = messages[0];
    const from = msg.from;
    const text = msg.text?.body || (msg.type || "no-text");

    console.log(`Incoming message from ${from}: ${text}`);

    // Validate critical envs before trying to respond
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
      console.error("Missing WhatsApp token or phone ID! Cannot send replies.");
      return;
    }

    // Prepare payload for Astro
    const astroPayload = { message: text, from, raw: msg };

    // Call Astro (internal)
    let botReply = "Sorry, something went wrong.";
    try {
      const astroData = await callAstro(astroPayload);
      if (astroData && astroData.reply) {
        botReply = astroData.reply;
      } else if (typeof astroData === "string") {
        botReply = astroData;
      }
      console.log("Astro returned:", astroData);
    } catch (err) {
      console.error("Error contacting Astro after retries:", err.response?.data || err.message || err);
    }

    // Send reply to user via WhatsApp Cloud API
    try {
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
          timeout: 5000,
        }
      );
      console.log(`Reply sent to ${from}: ${botReply}`);
    } catch (err) {
      console.error("Failed to send reply via WhatsApp API:", err.response?.data || err.message || err);
    }

  } catch (err) {
    console.error("Webhook POST error:", err.response?.data || err.message || err);
  }
});

// --- Health check & root ---
app.get("/", (req, res) => res.send("WhatsApp webhook service running"));
app.get("/health", (req, res) => res.status(200).send("OK"));

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WhatsApp Webhook running on port ${PORT}`);
  console.log(`Using internal Astro URL: ${ASTRO_INTERNAL_URL}`);
});
