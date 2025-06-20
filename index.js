'use stict'

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import {GoogleGenerativeAI} from '@google/generative-ai'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.static('public'))

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const myPersonaInstruction = process.env.personalPrompt
const chatSessions = new Map(); 

app.post('/api/start-chat', async (req, res) => {
    const userId = req.body.userId || `user-${Date.now()}`;

    
    try {
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' }); 

        const chat = model.startChat({
            history: [], 
            systemInstruction: {
                role: "model", 
                parts: [{ text: myPersonaInstruction }]
            }
        });

        chatSessions.set(userId, chat); 

        res.json({
            userId: userId,
            initialBotMessage: `Hello! I'm Cakra Bilisairo's chatbot. you can ask me anything`,
            message: "Chat session started!"
        });

    } catch (err) {
        console.error('Error starting chat session:', err);
        res.status(500).json({ error: `Failed to start chat session: ${err.message}` });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId } = req.body;

        if (!message || !userId) {
            return res.status(400).json({ error: 'Message and userId are required.' });
        }

        const chat = chatSessions.get(userId);

        if (!chat) {
            return res.status(404).json({ error: 'Chat session not found. Please start a new chat session.' });
        }

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        res.json({ output: responseText });

    } catch (err) {
        console.error('Error in /api/chat:', err);
        if (err.message.includes('context')) {
            res.status(500).json({ error: 'Conversation too long. Please start a new chat.', restartChat: true });
        } else {
            res.status(500).json({ error: `Error processing message: ${err.message}` });
        }
    }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
 