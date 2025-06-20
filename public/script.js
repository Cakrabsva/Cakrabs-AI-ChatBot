'use strict';
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const loadingSpinner = document.getElementById('loading-spinner');

const backendBaseUrl = '/api';
let currentUserId = null;

function generateUniqueId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
    messageDiv.innerHTML = text.replace(/\n/g, '<br>');
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function startChatSession() {
    currentUserId = generateUniqueId();
    try {
        const response = await fetch(`${backendBaseUrl}/start-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUserId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        addMessage(data.initialBotMessage, 'bot');
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();

    } catch (error) {
        console.error('Error starting chat session:', error);
        addMessage(`Failed to start chat: ${error.message}. Please try refreshing the page.`, 'bot');
        userInput.disabled = true;
        sendButton.disabled = true;
    }
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (message === '' || !currentUserId) return;

    addMessage(message, 'user');
    userInput.value = '';
    userInput.disabled = true;
    sendButton.disabled = true;
    loadingSpinner.style.display = 'block';

    try {
        const response = await fetch(`${backendBaseUrl}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message, userId: currentUserId })
        });

        const data = await response.json();
        
        if (!response.ok) {
            if (data.restartChat) {
                  addMessage(data.error + " Starting a new conversation.", 'bot');
                  chatBox.innerHTML = ''; 
                  await startChatSession();
            } else {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
        } else {
            addMessage(data.output, 'bot');
        }

    } catch (error) {
        console.error('Error sending message:', error);
        addMessage(`Sorry, there was an issue: ${error.message}. Please try again.`, 'bot');
    } finally {
        userInput.disabled = false;
        sendButton.disabled = false;
        loadingSpinner.style.display = 'none';
        userInput.focus();
    }
}

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
  });
window.addEventListener('load', startChatSession);