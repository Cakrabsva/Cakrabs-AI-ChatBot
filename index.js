'use strict'

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai';

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.static('public'))

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const myPersonaInstruction = fs.readFileSync(path.join(__dirname, 'persona.txt'), 'utf-8')

const chatSessions = new Map(); 

app.post('/api/start-chat', async (req, res) => {
  const userId = req.body.userId || `user-${Date.now()}`;

  try {
    const chat = ai.chats.create({
      model: 'gemini-flash-latest',
      config: {
        systemInstruction: myPersonaInstruction
      }
    });

    chatSessions.set(userId, chat);

    res.json({
      userId,
      initialBotMessage: "Hello! I'm Cakra Bilisairo's chatbot. you can ask me anything",
      message: "Chat session started!"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, userId } = req.body;

  const chat = chatSessions.get(userId);
  if (!chat) {
    return res.status(404).json({ error: 'Chat session not found.' });
  }

  const response = await chat.sendMessage({ message });
  res.json({ output: response.text });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})