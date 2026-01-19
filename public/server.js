const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// OpenAI client using Replit AI Integrations
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// AI Chat API endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build messages array
    const messages = [
      { role: 'system', content: 'You are TechVyro AI, a helpful and friendly assistant for creators, founders, and brands. Provide clear, concise, and actionable advice. Be professional yet approachable.' },
      ...history,
      { role: 'user', content: message }
    ];

    // Set up SSE for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      stream: true,
      max_completion_tokens: 2048,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`);
    res.end();
  } catch (error) {
    console.error('AI Chat Error:', error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: 'Failed to get AI response' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Failed to get AI response' });
    }
  }
});

// Non-streaming chat endpoint (simpler alternative)
app.post('/api/chat-simple', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messages = [
      { role: 'system', content: 'You are TechVyro AI, a helpful and friendly assistant for creators, founders, and brands. Provide clear, concise, and actionable advice. Be professional yet approachable.' },
      ...history,
      { role: 'user', content: message }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      max_completion_tokens: 2048,
    });

    const aiResponse = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// Serve static files with cache control
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

app.use(express.static(__dirname));

// SPA fallback - use regex pattern for Express 5.x compatibility
app.use((req, res) => {
  const ext = path.extname(req.path);
  if (!ext || ext === '.html') {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
  }
});

const PORT = 5000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});
