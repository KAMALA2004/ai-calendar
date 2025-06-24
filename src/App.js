import React, { useState, useEffect } from "react";
import './App.css';

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
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, []);

  const formatDate = (dateString) => {
    const options = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getRandomColor = () => {
    const colors = [
      'rgba(253, 121, 168, 0.9)',  // Pink
      'rgba(0, 184, 148, 0.9)',    // Teal
      'rgba(108, 92, 231, 0.9)',    // Purple
      'rgba(253, 203, 110, 0.9)'    // Yellow
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

const renderSummary = () => {
  if (!summary) return null;

  const cleanText = summary
    .replace(/›/g, '')
    .replace(/\n/g, ' ')           // Remove line breaks
    .replace(/\s+/g, ' ')          // Collapse extra spaces
    .trim();

  // Split into blocks starting with weekdays
  const parts = cleanText.split(/(?=\bOn (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b)/);

  // Filter out garbage like “Wednesday” or “Thursday” alone
  const filteredParts = parts.filter(part => {
    const trimmed = part.trim();
    return trimmed.length > 0 && !/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i.test(trimmed);
  });

  return (
    <div className="summary-lines">
      <p style={{ fontWeight: "bold", fontSize: "1.1rem", marginBottom: "8px" }}>📅 Weekly Overview</p>
      <p style={{ marginBottom: "12px" }}>{filteredParts[0].trim()}</p>

      {filteredParts.slice(1).map((line, i) => {
        const dayMatch = line.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/);
        const day = dayMatch ? dayMatch[0] : `Day ${i + 1}`;
        return (
          <div key={i} style={{ marginBottom: "14px" }}>
            <p style={{ fontWeight: "bold", color: "#693F21", marginBottom: "4px" }}>📌 {day}</p>
            <p>{line.trim()}</p>
          </div>
        );
      })}
    </div>
  );
};



 

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>Calendar Intelligence</h1>
          <p className="subtitle">AI-powered insights into your schedule</p>
        </div>
        <div className="header-accent"></div>
      </header>

      <main className="app-content">
        {!summary && !loading && (
          <div className="connect-section">
            <div className="connect-card">
              <div className="connect-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <h2>Optimize Your Schedule</h2>
              <p>Connect your calendar to get intelligent insights and time management recommendations</p>
              <button onClick={handleConnect} className="connect-button">
                Connect Google Calendar
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Analyzing your schedule patterns...</p>
          </div>
        )}

        {summary && (
          <section className="summary-section">
            <div className="section-header">
              <div className="section-title">
                <h2>
                  <span className="icon-circle" style={{ background: 'var(--accent-color)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </span>
                  Your Schedule Insights
                </h2>
                <p className="section-subtitle">AI analysis of your upcoming week</p>
              </div>
            </div>
            <div className="summary-content">
              {renderSummary()}
              <p className="time-note">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                All times are displayed in your local timezone.
              </p>
            </div>
          </section>
        )}

        {events.length > 0 && (
          <section className="events-section">
            <div className="section-header">
              <div className="section-title">
                <h2>
                  <span className="icon-circle" style={{ background: 'var(--secondary-color)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                  </span>
                  Upcoming Events
                </h2>
                <p className="section-subtitle">Your schedule at a glance</p>
              </div>
            </div>
            <div className="events-list">
              {events.map((event, index) => (
                <div key={index} className="event-card">
                  <div className="event-time-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    {formatDate(event.time)}
                  </div>
                  <h3 className="event-title">{event.title}</h3>
                  {event.description && (
                    <div className="event-description">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                      <p>{event.description}</p>
                    </div>
                  )}
                  <div className="event-category" style={{ background: getRandomColor() }}>
                    {event.category || "General"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      
    </div>
  );
}

export default App;