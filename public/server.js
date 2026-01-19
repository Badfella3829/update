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

// Premium plan verification middleware
// In production, this should verify Firebase ID token and check plan from Firestore
const requirePremium = (req, res, next) => {
  const userPlan = req.headers['x-user-plan'];
  const premiumPlans = ['pro', 'premium', 'admin'];
  
  if (!userPlan || !premiumPlans.includes(userPlan.toLowerCase())) {
    return res.status(403).json({ 
      error: 'Premium subscription required',
      code: 'PREMIUM_REQUIRED'
    });
  }
  next();
};

// Validate and sanitize chat history
function validateHistory(history) {
  if (!Array.isArray(history)) return [];
  const validRoles = ['user', 'assistant'];
  return history
    .filter(msg => msg && typeof msg.content === 'string' && validRoles.includes(msg.role))
    .slice(-10) // Limit to last 10 messages
    .map(msg => ({
      role: msg.role,
      content: msg.content.slice(0, 4000) // Limit message length
    }));
}

// AI Chat API endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Limit message size
    const userMessage = message.slice(0, 4000);
    const validatedHistory = validateHistory(history);

    // Build messages array
    const messages = [
      { role: 'system', content: 'You are TechVyro AI, a helpful and friendly assistant for creators, founders, and brands. Provide clear, concise, and actionable advice. Be professional yet approachable.' },
      ...validatedHistory,
      { role: 'user', content: userMessage }
    ];

    // Set up SSE for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

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
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('AI Chat Error:', error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: 'Failed to get AI response' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.status(500).json({ error: 'Failed to get AI response' });
    }
  }
});

// Image Generation API endpoint (FREE)
app.post('/api/image-generate', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const safePrompt = prompt.slice(0, 1000);

    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: safePrompt,
      n: 1,
      size: '1024x1024',
    });

    const imageData = response.data[0];
    res.json({
      success: true,
      image: imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : imageData.url
    });
  } catch (error) {
    console.error('Image Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// Content AI API endpoint (PREMIUM)
app.post('/api/content-ai', requirePremium, async (req, res) => {
  try {
    const { type, topic, tone = 'professional' } = req.body;

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const contentTypes = {
      'blog': 'Write a detailed blog post about',
      'article': 'Write an informative article about',
      'social': 'Write engaging social media posts about',
      'marketing': 'Write marketing copy about',
      'description': 'Write a product description for'
    };

    const contentPrompt = contentTypes[type] || contentTypes['blog'];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are a professional content writer. Write in a ${tone} tone. Be creative, engaging, and informative.` },
        { role: 'user', content: `${contentPrompt}: ${topic.slice(0, 500)}` }
      ],
      max_completion_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || 'Sorry, could not generate content.';
    res.json({ success: true, content });
  } catch (error) {
    console.error('Content AI Error:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

// Code AI API endpoint (PREMIUM)
app.post('/api/code-ai', requirePremium, async (req, res) => {
  try {
    const { task, language = 'javascript', code = '' } = req.body;

    if (!task || typeof task !== 'string') {
      return res.status(400).json({ error: 'Task description is required' });
    }

    const systemPrompt = `You are an expert programmer. Help with coding tasks in ${language}. 
    Provide clean, well-commented code. If debugging, explain the issue and fix it.
    Format code properly with syntax highlighting markers.`;

    const userMessage = code 
      ? `Task: ${task.slice(0, 500)}\n\nCode:\n${code.slice(0, 3000)}`
      : `Task: ${task.slice(0, 1000)}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_completion_tokens: 3000,
    });

    const result = response.choices[0]?.message?.content || 'Sorry, could not process your code request.';
    res.json({ success: true, result });
  } catch (error) {
    console.error('Code AI Error:', error);
    res.status(500).json({ error: 'Failed to process code request' });
  }
});

// Email AI API endpoint (PREMIUM)
app.post('/api/email-ai', requirePremium, async (req, res) => {
  try {
    const { type, subject, details, tone = 'professional' } = req.body;

    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'Email subject is required' });
    }

    const emailTypes = {
      'business': 'Write a professional business email',
      'follow-up': 'Write a follow-up email',
      'thank-you': 'Write a thank you email',
      'apology': 'Write an apology email',
      'introduction': 'Write an introduction email',
      'request': 'Write a request email',
      'reply': 'Write a reply to an email'
    };

    const emailPrompt = emailTypes[type] || emailTypes['business'];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are an expert email writer. Write clear, ${tone} emails that are well-structured and effective.` },
        { role: 'user', content: `${emailPrompt} about: ${subject.slice(0, 200)}\n\nAdditional details: ${(details || '').slice(0, 500)}` }
      ],
      max_completion_tokens: 1024,
    });

    const email = response.choices[0]?.message?.content || 'Sorry, could not generate email.';
    res.json({ success: true, email });
  } catch (error) {
    console.error('Email AI Error:', error);
    res.status(500).json({ error: 'Failed to generate email' });
  }
});

// Non-streaming chat endpoint (simpler alternative)
app.post('/api/chat-simple', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userMessage = message.slice(0, 4000);
    const validatedHistory = validateHistory(history);

    const messages = [
      { role: 'system', content: 'You are TechVyro AI, a helpful and friendly assistant for creators, founders, and brands. Provide clear, concise, and actionable advice. Be professional yet approachable.' },
      ...validatedHistory,
      { role: 'user', content: userMessage }
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
