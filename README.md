## Calendar Intelligence

AI-powered dashboard that connects with Google Calendar, summarizes events, and gives smart scheduling insights.

## Features

* User authentication using Supabase
* Connects to Google Calendar
* Generates AI summaries for each event
* Option to regenerate summaries
* Stores summaries in a vector database (pgvector)
* Search similar past events using semantic similarity
* Clean, user-friendly dashboard to view and explore events

## Getting Started

1. Clone this repository
2. Set up environment variables for Supabase, Google API, and OpenAI API
3. Install frontend and backend dependencies:

   * `npm install` in both `frontend` and `backend` folders
4. Run the project:

   * Start backend server
   * Start frontend with `npm start`

## AI & Backend Integration

* Summaries are generated using OpenAI’s language model
* Embeddings are created using OpenAI’s embedding endpoint
* Stored in a PostgreSQL table with pgvector for similarity search
* Backend exposes routes to store and query embeddings

Built with ❤️ by \[Your Name] for \[Hackathon or Program Name]
