import React, { useState, useEffect } from "react";

function App() {
  const [summary, setSummary] = useState("");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    window.location.href = "http://localhost:5000/auth/google";
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const summaryParam = urlParams.get("summary");
    const eventsParam = urlParams.get("events");

    if (summaryParam && eventsParam) {
      setLoading(true);
      try {
        const decodedSummary = decodeURIComponent(summaryParam);
        const decodedEvents = JSON.parse(atob(eventsParam));
        setSummary(decodedSummary);
        setEvents(decodedEvents);
      } catch (err) {
        console.error("Error decoding data:", err);
      } finally {
        setLoading(false);
        // Remove query params from URL
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", background: "#f4f4f4", minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <h1 style={{ color: "#333" }}>📅 Calendar AI Dashboard</h1>
        <p style={{ color: "#666" }}>Summarized view of your upcoming events using GPT-4</p>

        <button
          onClick={handleConnect}
          style={{
            padding: "10px 20px",
            background: "#007BFF",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            margin: "1rem 0"
          }}
        >
          🔗 Connect Google Calendar
        </button>

        {loading && <p>Loading events and summary...</p>}

        {summary && (
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "8px", marginTop: "1rem", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
            <h2 style={{ color: "#007BFF" }}>🧠 Summary</h2>
            <p>{summary}</p>
          </div>
        )}

        {events.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <h2 style={{ color: "#007BFF" }}>📆 Events</h2>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {events.map((e, i) => (
                <li
                  key={i}
                  style={{
                    background: "white",
                    margin: "1rem 0",
                    padding: "1rem",
                    borderRadius: "8px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
                  }}
                >
                  <strong style={{ fontSize: "1.1rem" }}>{e.title}</strong>
                  <p style={{ margin: "0.3rem 0", color: "#555" }}>{e.description}</p>
                  <p style={{ color: "#888" }}>{new Date(e.time).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
