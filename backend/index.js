const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { google } = require("googleapis");
const axios = require("axios");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

app.get("/", (req, res) => {
  res.send("✅ Backend is running");
});

// 🔐 Step 1: Redirect to Google OAuth
app.get("/auth/google", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // ensure fresh token
  });
  console.log("Redirecting to:", authUrl);
  res.redirect(authUrl);
});

// 🔁 Step 2: Callback → Events + Summary → Redirect to React frontend
app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  console.log("OAuth Code received:", code);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log("Tokens received.");

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const eventsRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 5,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = eventsRes.data.items.map((event) => ({
      title: event.summary || "No Title",
      description: event.description || "No Description",
      time: event.start.dateTime || event.start.date,
    }));

    const formattedEvents = events
      .map(
        (e, i) =>
          `${i + 1}. Title: ${e.title}\n   Description: ${e.description}\n   Time: ${e.time}`
      )
      .join("\n");

    const promptMessages = [
      {
        role: "system",
        content: "You are a helpful assistant. Summarize upcoming calendar events concisely in natural language.",
      },
      {
        role: "user",
        content: `Here are some upcoming events:\n${formattedEvents}\n\nGive me a short overview as if you're summarizing this person's week.`,
      },
    ];

    console.log("Sending to Azure OpenAI...");

    const response = await axios.post(
      `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`,
      {
        messages: promptMessages,
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_API_KEY,
        },
      }
    );

    const summary = response.data.choices[0].message.content;

    // Encode events data to safely pass via query param
    const eventsBase64 = Buffer.from(JSON.stringify(events)).toString("base64");
    const summaryEncoded = encodeURIComponent(summary);

    // Redirect back to React frontend with data
    res.redirect(`http://localhost:3000/?summary=${summaryEncoded}&events=${eventsBase64}`);
  } catch (err) {
    console.error("🔴 Full Error:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    } else {
      console.error(err.message);
    }

    res.status(500).send("❌ Authentication or Event Fetch Failed");
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
