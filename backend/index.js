const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { google } = require("googleapis");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

app.get("/", (req, res) => {
  res.send("✅ Backend is running");
});

// 🔐 Google OAuth Step 1
app.get("/auth/google", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
  console.log("Redirecting to:", authUrl);
  res.redirect(authUrl);
});

// 🔁 OAuth Callback & Event Summarization
app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const eventsRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 5,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = eventsRes.data.items.map((event) => ({
      title: event.summary || "Untitled Event",
      description: event.description?.trim() || "",
      time: event.start.dateTime || event.start.date,
    }));

    const formattedEvents = events
      .map((e, i) => {
        const desc = e.description ? `Description: ${e.description}\n   ` : "";
        return `${i + 1}. Title: ${e.title}\n   ${desc}Time: ${e.time}`;
      })
      .join("\n");

    const promptMessages = [
      {
        role: "system",
        content: `You are a professional executive assistant tasked with summarizing calendar events for busy business leaders. 
Your tone is polished, concise, and clear. Only include event descriptions if they add useful context. Summarize the weekly schedule in paragraph form (not bullets), including all meeting titles, dates, times, and purposes. If a meeting has no meaningful description, simply mention the meeting title, date, and time.`,
      },
      {
        role: "user",
        content: `Here are this week's calendar events:\n\n${formattedEvents}\n\nPlease provide a professional summary of this week's meeting schedule.`,
      },
    ];

    const response = await axios.post(
      `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`,
      { messages: promptMessages, temperature: 0.7 },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_API_KEY,
        },
      }
    );

    const summary = response.data.choices[0].message.content;

    const eventsBase64 = Buffer.from(JSON.stringify(events)).toString("base64");
    const summaryEncoded = encodeURIComponent(summary);

    res.redirect(`http://localhost:3000/?summary=${summaryEncoded}&events=${eventsBase64}`);
  } catch (err) {
    console.error("❌ OAuth or Summary Error:", err.message);
    res.status(500).send("❌ Authentication or Event Fetch Failed");
  }
});

// 🔁 Regenerate summary for a single event
app.post("/regenerate-summary", async (req, res) => {
  const { title, description, time } = req.body;

  const promptMessages = [
    {
      role: "system",
      content: `You are a professional executive assistant. Summarize a calendar event briefly and clearly.`,
    },
    {
      role: "user",
      content: `Title: ${title}\nDescription: ${description}\nTime: ${time}\n\nSummarize this event.`,
    },
  ];

  try {
    const response = await axios.post(
      `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`,
      { messages: promptMessages, temperature: 0.7 },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_API_KEY,
        },
      }
    );

    const newSummary = response.data.choices[0].message.content;
    res.json({ summary: newSummary });
  } catch (error) {
    console.error("❌ regenerate-summary error:", error.message);
    res.status(500).json({ error: "Failed to regenerate summary." });
  }
});

// 🧠 Generate embedding from text
app.post("/generate-embedding", async (req, res) => {
  const { inputText } = req.body;

  try {
    const embeddingResponse = await axios.post(
      `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}/embeddings?api-version=2023-05-15`,
      { input: inputText },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_API_KEY,
        },
      }
    );

    const embedding = embeddingResponse.data.data[0].embedding;
    res.json({ embedding });
  } catch (err) {
    console.error("❌ Embedding error:", err.message);
    res.status(500).json({ error: "Failed to generate embedding." });
  }
});

// 💾 Store summary + embedding
app.post("/store-embedding", async (req, res) => {
  const { user_id, title, description, time, summary } = req.body;

  try {
    const embeddingRes = await axios.post(
      `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}/embeddings?api-version=2023-05-15`,
      { input: summary },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_API_KEY,
        },
      }
    );

    const embedding = embeddingRes.data.data[0].embedding;

    const { error } = await supabase.from("summaries").insert([
      {
        user_id,
        event_title: title,
        event_description: description,
        event_time: time,
        summary,
        embedding,
      },
    ]);

    if (error) {
      console.error("❌ Supabase insert error:", error.message);
      return res.status(500).json({ error: "Failed to store summary in DB" });
    }

    res.json({ message: "✅ Summary and embedding stored successfully" });
  } catch (err) {
    console.error("❌ Storage error:", err.message);
    res.status(500).json({ error: "Embedding or DB storage failed" });
  }
});

// 🔍 Search similar summaries
app.post("/search-similar-events", async (req, res) => {
  const { inputText } = req.body;

  try {
    const embeddingResponse = await axios.post(
      `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}/embeddings?api-version=2023-05-15`,
      { input: inputText },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_API_KEY,
        },
      }
    );

    const queryEmbedding = embeddingResponse.data.data[0].embedding;

    const { data, error } = await supabase.rpc("match_summaries", {
      query_embedding: queryEmbedding,
      match_threshold: 0.8,
      match_count: 5,
    });

    if (error) {
      console.error("❌ Supabase RPC error:", error.message);
      return res.status(500).json({ error: "Similarity search failed" });
    }

    res.json({ matches: data });
  } catch (err) {
    console.error("❌ Similarity search error:", err.message);
    res.status(500).json({ error: "Embedding generation or search failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
