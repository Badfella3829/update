const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';
const premiumPlans = new Set(['pro', 'premium', 'admin']);

const openAIEnv = {
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
};

const openAIReady = Boolean(openAIEnv.apiKey);
const openai = openAIReady
  ? new OpenAI({
      apiKey: openAIEnv.apiKey,
      ...(openAIEnv.baseURL ? { baseURL: openAIEnv.baseURL } : {}),
    })
  : null;

const startupWarnings = [];
if (!openAIReady) {
  startupWarnings.push('OpenAI disabled: AI_INTEGRATIONS_OPENAI_API_KEY/OPENAI_API_KEY is not set.');
}

let adminAuth = null;
let firestore = null;
let firebaseAuthReady = false;

function setupFirebaseAdmin() {
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    adminAuth = admin.auth();
    firestore = admin.firestore();
    firebaseAuthReady = true;
  } catch (error) {
    startupWarnings.push(`Firebase Admin unavailable: ${error.message}`);
  }
}

setupFirebaseAdmin();

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

async function getUserPlanFromFirestore(uid) {
  if (!firestore) return null;
  const snap = await firestore.collection('users').doc(uid).get();
  if (!snap.exists) return 'free';
  const plan = (snap.data()?.plan || 'free').toString().toLowerCase();
  return plan;
}

async function resolveUserContext(req) {
  const token = getBearerToken(req);
  if (!token || !adminAuth) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const planFromClaims = decoded.plan ? String(decoded.plan).toLowerCase() : null;
    const planFromDb = await getUserPlanFromFirestore(decoded.uid);
    return {
      uid: decoded.uid,
      email: decoded.email || null,
      plan: planFromDb || planFromClaims || 'free',
    };
  } catch (error) {
    return null;
  }
}

function createRateLimiter({ windowMs, maxRequests }) {
  const bucket = new Map();

  return (req, res, next) => {
    const userKey = req.user?.uid || req.ip || 'anonymous';
    const routeKey = req.path;
    const key = `${routeKey}:${userKey}`;
    const now = Date.now();

    const entry = bucket.get(key);
    if (!entry || now - entry.start > windowMs) {
      bucket.set(key, { start: now, count: 1 });
      return next();
    }

    entry.count += 1;
    if (entry.count > maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
      });
    }

    return next();
  };
}

async function attachUserContext(req, _res, next) {
  req.user = await resolveUserContext(req);
  next();
}

function requireOpenAI(req, res, next) {
  if (!openai) {
    return res.status(503).json({
      error: 'AI services are temporarily unavailable. Missing OpenAI credentials on server.',
      code: 'AI_UNAVAILABLE',
    });
  }
  next();
}

const requirePremium = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const plan = String(req.user.plan || 'free').toLowerCase();
  if (!premiumPlans.has(plan)) {
    return res.status(403).json({
      error: 'Premium subscription required',
      code: 'PREMIUM_REQUIRED',
    });
  }

  next();
};

function validateHistory(history) {
  if (!Array.isArray(history)) return [];
  const validRoles = ['user', 'assistant'];
  return history
    .filter((msg) => msg && typeof msg.content === 'string' && validRoles.includes(msg.role))
    .slice(-10)
    .map((msg) => ({
      role: msg.role,
      content: msg.content.slice(0, 4000),
    }));
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    services: {
      openai: openAIReady ? 'ready' : 'disabled',
      firebaseAdmin: firebaseAuthReady ? 'ready' : 'disabled',
    },
    warnings: startupWarnings,
  });
});

app.use('/api', attachUserContext);
app.use('/api', createRateLimiter({ windowMs: 60 * 1000, maxRequests: 40 }));

app.post('/api/chat', requireOpenAI, async (req, res) => {
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
      { role: 'user', content: userMessage },
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
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

app.post('/api/image-generate', requireOpenAI, async (req, res) => {
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
      image: imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : imageData.url,
    });
  } catch (error) {
    console.error('Image Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

app.post('/api/content-ai', requireOpenAI, requirePremium, async (req, res) => {
  try {
    const { type, topic, tone = 'professional' } = req.body;

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const contentTypes = {
      blog: 'Write a detailed blog post about',
      article: 'Write an informative article about',
      social: 'Write engaging social media posts about',
      marketing: 'Write marketing copy about',
      description: 'Write a product description for',
      ad: 'Write compelling ad copy about',
      email: 'Write an email newsletter about',
    };

    const contentPrompt = contentTypes[type] || contentTypes.blog;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are a professional content writer. Write in a ${tone} tone. Be creative, engaging, and informative.` },
        { role: 'user', content: `${contentPrompt}: ${topic.slice(0, 500)}` },
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

app.post('/api/code-ai', requireOpenAI, requirePremium, async (req, res) => {
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
        { role: 'user', content: userMessage },
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

app.post('/api/email-ai', requireOpenAI, requirePremium, async (req, res) => {
  try {
    const { type, subject, details, tone = 'professional' } = req.body;

    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'Email subject is required' });
    }

    const emailTypes = {
      business: 'Write a professional business email',
      'follow-up': 'Write a follow-up email',
      'thank-you': 'Write a thank you email',
      apology: 'Write an apology email',
      introduction: 'Write an introduction email',
      request: 'Write a request email',
      reply: 'Write a reply to an email',
    };

    const emailPrompt = emailTypes[type] || emailTypes.business;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are an expert email writer. Write clear, ${tone} emails that are well-structured and effective.` },
        { role: 'user', content: `${emailPrompt} about: ${subject.slice(0, 200)}\n\nAdditional details: ${(details || '').slice(0, 500)}` },
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

app.post('/api/voice-ai/tts', requireOpenAI, requirePremium, async (req, res) => {
  try {
    const { text, voice = 'alloy' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const safeText = text.slice(0, 4096);
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const selectedVoice = validVoices.includes(voice) ? voice : 'alloy';

    const response = await openai.chat.completions.create({
      model: 'gpt-audio-mini',
      modalities: ['text', 'audio'],
      audio: { voice: selectedVoice, format: 'wav' },
      messages: [
        { role: 'system', content: 'You are a helpful voice assistant. Convert the following text to natural speech.' },
        { role: 'user', content: `Read this aloud: ${safeText}` },
      ],
      max_completion_tokens: 2048,
    });

    const audioData = response.choices[0]?.message?.audio?.data;
    if (audioData) {
      res.json({ success: true, audio: `data:audio/wav;base64,${audioData}` });
    } else {
      res.json({ success: true, text: response.choices[0]?.message?.content || safeText });
    }
  } catch (error) {
    console.error('Voice AI TTS Error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

app.post('/api/resume-ai', requireOpenAI, requirePremium, async (req, res) => {
  try {
    const { name, jobTitle, experience, skills, education, summary } = req.body;

    if (!name || !jobTitle) {
      return res.status(400).json({ error: 'Name and job title are required' });
    }

    const prompt = `Create a professional resume for:
Name: ${name}
Target Job Title: ${jobTitle}
Experience: ${experience || 'Not provided'}
Skills: ${skills || 'Not provided'}
Education: ${education || 'Not provided'}
Summary/About: ${summary || 'Not provided'}

Generate a complete, well-formatted resume with:
- Professional Summary
- Work Experience section (create realistic examples if not provided)
- Skills section (technical and soft skills)
- Education section
- Format it clearly with sections and bullet points`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert resume writer and career coach. Create ATS-friendly, professional resumes that highlight achievements and use action verbs.' },
        { role: 'user', content: prompt },
      ],
      max_completion_tokens: 3000,
    });

    const resume = response.choices[0]?.message?.content || 'Sorry, could not generate resume.';
    res.json({ success: true, resume });
  } catch (error) {
    console.error('Resume AI Error:', error);
    res.status(500).json({ error: 'Failed to generate resume' });
  }
});

app.post('/api/data-ai', requireOpenAI, requirePremium, async (req, res) => {
  try {
    const { data, task = 'analyze', question } = req.body;

    if (!data || typeof data !== 'string') {
      return res.status(400).json({ error: 'Data is required' });
    }

    const tasks = {
      analyze: 'Analyze the following data and provide key insights, patterns, and trends:',
      summarize: 'Summarize the following data in a clear and concise manner:',
      visualize: 'Suggest the best ways to visualize this data and describe what charts/graphs would be most effective:',
      question: question ? `Answer this question about the data: ${question}` : 'Analyze the data:',
    };

    const taskPrompt = tasks[task] || tasks.analyze;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a data analyst expert. Provide clear, actionable insights from data. Use bullet points and organize your analysis well.' },
        { role: 'user', content: `${taskPrompt}\n\nData:\n${data.slice(0, 8000)}` },
      ],
      max_completion_tokens: 2048,
    });

    const analysis = response.choices[0]?.message?.content || 'Sorry, could not analyze data.';
    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Data AI Error:', error);
    res.status(500).json({ error: 'Failed to analyze data' });
  }
});

app.post('/api/logo-generate', requireOpenAI, async (req, res) => {
  try {
    const { brandName, style = 'modern', colors, industry } = req.body;

    if (!brandName || typeof brandName !== 'string') {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    const prompt = `Create a professional logo design for "${brandName}". 
Style: ${style} (minimalist, clean, professional)
${colors ? `Colors: ${colors}` : 'Colors: Use professional color palette'}
${industry ? `Industry: ${industry}` : ''}
Requirements: Simple, memorable, scalable logo suitable for business use. White or transparent background. No text unless essential.`;

    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: prompt.slice(0, 1000),
      n: 1,
      size: '1024x1024',
    });

    const imageData = response.data[0];
    res.json({
      success: true,
      image: imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : imageData.url,
    });
  } catch (error) {
    console.error('Logo Generator Error:', error);
    res.status(500).json({ error: 'Failed to generate logo' });
  }
});

app.post('/api/chat-simple', requireOpenAI, async (req, res) => {
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
      { role: 'user', content: userMessage },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_completion_tokens: 2048,
    });

    const aiResponse = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

app.use(express.static(__dirname));

app.use((req, res) => {
  const ext = path.extname(req.path);
  if (!ext || ext === '.html') {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
  if (startupWarnings.length) {
    console.warn('Startup warnings:');
    startupWarnings.forEach((warning) => console.warn(`- ${warning}`));
  }
});
