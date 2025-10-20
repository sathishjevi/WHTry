import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

// ✅ Step 1 — Verify webhook (Meta calls this when setting up)
app.get("/webhook", (req, res) => {
  const verifyToken = "HTRE3272Ho#UITHPUYU37#"; // must match the one set in Meta dashboard
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === verifyToken) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ Step 2 — Handle incoming messages
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
    const phoneNumberId = changes?.value?.metadata?.phone_number_id;

    if (message && message.text) {
      const from = message.from; // user phone number
      const msgBody = message.text.body;

      console.log("📩 Received message:", msgBody);

      // ✅ Step 4 — Add simple automation logic
      const reply = `Hi! Thanks for your message: "${msgBody}". We'll get back to you soon.`;

      // Call WhatsApp API to send reply (Step 5)
      await sendMessage(phoneNumberId, from, reply);
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// ✅ Step 5 — Function to send reply using WhatsApp Cloud API
async function sendMessage(phoneNumberId, to, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/1320294105747933/messages`,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer EAALQeQn33PUBPpukZCkxKmSZCawiDlXquzw6XkAFjxZAQHONVvto8yXANupotESm3oMdzerZAIeRCfEIabkK7gATIeNhzJxIkKSsfzrS0y11D3hA75WSe5zArzMt4gKGS7lyGmfm1FyZAChIzjfcb2zZAe11u4DeHBzAXKJinC5FmpcjYG9ZAHKjxgfbe9b8EUJPAZDZD`, // from Meta Developer Dashboard
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Reply sent!");
  } catch (error) {
    console.error("❌ Error sending message:", error.response?.data || error.message);
  }
}

// 🚀 Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Webhook running on port ${PORT}`));
