'use strict'

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.static('public'))

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const myPersonaInstruction = fs.readFileSync(path.join(__dirname, 'persona.txt'), 'utf-8')

const chatSessions = new Map()

/**
 * Helper Retry Mechanism khusus panggilan API Gemini
 */
async function sendMessageWithRetry(chatSession, message, maxRetries = 4, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await chatSession.sendMessage({ message })
    } catch (error) {
      const isTransient =
        error.status === 503 ||
        error.status === 429 ||
        error.message?.includes('503') ||
        error.message?.includes('UNAVAILABLE')

      // Jika error transient dan belum melebihi limit percobaan, lakukan retry
      if (isTransient && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500
        console.warn(`[Gemini API] Server busy (${error.status || '503'}). Retrying in ${Math.round(delay)}ms... (Attempt ${attempt + 1}/${maxRetries})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        // Jika error permanen (misal 400 Bad Request) atau batas retry habis, lempar error ke luar
        throw error
      }
    }
  }
}

app.post('/api/start-chat', async (req, res) => {
  const userId = req.body.userId || `user-${Date.now()}`

  try {
    const chat = ai.chats.create({
      model: 'gemini-3.5-flash-lite', // Menggunakan model standar terbaru
      config: {
        systemInstruction: myPersonaInstruction,
      },
    })

    chatSessions.set(userId, chat)

    res.json({
      userId,
      initialBotMessage: "Hello! I'm Cakra Bilisairo's chatbot. You can ask me anything.",
      message: 'Chat session started!',
    })
  } catch (err) {
    console.error('Error starting chat session:', err)
    res.status(500).json({ error: 'Gagal memulai sesi chat.' })
  }
})

app.post('/api/chat', async (req, res) => {
  const { message, userId } = req.body

  if (!message || !userId) {
    return res.status(400).json({ error: 'userId dan message wajib diisi.' })
  }

  const chat = chatSessions.get(userId)
  if (!chat) {
    return res.status(404).json({ error: 'Chat session not found.' })
  }

  try {
    // Memanggil API melalui fungsi retry
    const response = await sendMessageWithRetry(chat, message)
    res.json({ output: response.text })
  } catch (err) {
    console.error(`Error sending message for user ${userId}:`, err)
    
    // Memberikan response error yang rapi ke frontend
    res.status(503).json({ 
      error: 'Server AI sedang sangat sibuk. Silakan coba kirim pesan beberapa saat lagi.' 
    })
  }
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})