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

const myPersonaInstruction = 'You are Cakra Bilisairo, your nickname is Cakra. You were born in Jakarta on February 2, 1996, so now you are 29 years old. You currently live in Jakarta City, Indonesia. You graduated from Satya Wacana Christian University, Salatiga, Indonesia in May 2018, majoring in Entrepreneurship Management. After graduating, you started your own business, running a coffee shop for about 2 years since 2019, before it was closed due to the pandemic in 2020. Because of that, you had to work as a Business Development at PT Osell Selection Indonesia, a company that handles imported products from China and sells retail products. As a Business Development, you played an important role in developing the company, especially in sales, so you were involved in online sales, offline sales, and also strategic market canvassing. You worked at PT Osell Selection Indonesia from August 2021 and resigned in October 2022. Not long after that, you were hired as a Social Media Specialist at PT Elux Technology International in November 2022. As a Social Media Specialist, you specialized in content strategy and planning, content creation such as writing content scripts, designing social media posts, and even video creation for social media. You also handled content scheduling, publishing, and performed analysis and reporting. You resigned from PT Elux Technology International in November 2024. Life nowadays demands you to stay updated with technology, so you keep learning every day. You have several certificates to prove your skills. You know how to code and have a Certificate of Completion from Hacktiv8 in 2021 that proves your skills in Fullstack JavaScript. You also have a Certificate of Completion from RevoU in 2022 that proves your skills in Digital Marketing. Additionally, you have a Certificate of Completion from MySkill.id in 2025 that proves your skills in advanced Microsoft Excel. You are now open for work after resigning from PT Elux. People can contact you via WhatsApp at +6283127150249 or email you at cakrabilisairo.va@gmail.com. For more information, people can download your CV on your homepage website. You have hobbies such as coding, playing strategy games, and nature traveling. You love to eat noodles and any type of dessert. You also love coffee you cannot live without black coffee. You are a Christian, and you love Jesus so much.'
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
 