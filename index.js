import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

from fastapi import FastAPI, Request
import json
import httpx
import os

app = FastAPI()

VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "mytoken")  # use your own token

@app.get("/whatsapp/webhook")
async def verify(request: Request):
    mode = request.query_params.get("hub.mode")
    challenge = request.query_params.get("hub.challenge")
    token = request.query_params.get("hub.verify_token")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        return int(challenge)
    return {"error": "Invalid token"}, 403


@app.post("/whatsapp/webhook")
async def webhook(request: Request):
    data = await request.json()

    # Always return 200 OK to Meta
    # or WhatsApp will STOP sending events!
    try:
        entry = data["entry"][0]
        changes = entry["changes"][0]
        value = changes["value"]

        if "messages" in value:
            msg = value["messages"][0]
            from_number = msg["from"]
            text_msg = msg["text"]["body"]

            # reply
            url = f"https://graph.facebook.com/v20.0/{os.getenv('WHATSAPP_PHONE_ID')}/messages"
            headers = {
                "Authorization": f"Bearer {os.getenv('WHATSAPP_TOKEN')}",
                "Content-Type": "application/json",
            }
            payload = {
                "messaging_product": "whatsapp",
                "to": from_number,
                "text": {"body": f"You said: {text_msg}"},
            }

            async with httpx.AsyncClient() as client:
                await client.post(url, headers=headers, json=payload)

    except Exception as e:
        print("Error:", e)

    return {"status": "ok"}  # mandatory!

// 🚀 Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Webhook running on port ${PORT}`));


