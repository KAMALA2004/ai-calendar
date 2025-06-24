import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../styles/Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [summary, setSummary] = useState("");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromQuery, setFromQuery] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      } else {
        setSession(session);
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!authChecked) return;
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
        setFromQuery(true);
      } catch (err) {
        console.error("❌ Error decoding summary/events:", err);
      } finally {
        setLoading(false);
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, [authChecked]);

  useEffect(() => {
    if (session && events.length && fromQuery) {
      const store = async () => {
        for (const event of events) {
          try {
            const summaryRes = await fetch("http://localhost:5000/regenerate-summary", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(event),
            });
            const summaryData = await summaryRes.json();
            const individualSummary = summaryData.summary;

            await fetch("http://localhost:5000/store-embedding", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: session.user.id,
                title: event.title,
                description: event.description,
                time: event.time,
                summary: individualSummary,
              }),
            });
          } catch (err) {
            console.error("❌ Failed to store individual summary embedding:", err);
          }
        }
      };
      store();
    }
  }, [session, events, fromQuery]);

  const handleConnect = () => {
    window.location.href = "http://localhost:5000/auth/google";
  };

  const regenerateSummary = async (event, index) => {
    try {
      const res = await fetch("http://localhost:5000/regenerate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      const data = await res.json();
      if (data.summary) {
        const updatedEvents = [...events];
        updatedEvents[index].regeneratedSummary = data.summary;
        setEvents(updatedEvents);
      }
    } catch (err) {
      console.error("❌ Failed to regenerate summary:", err);
    }
  };

  const formatDate = (dateString) => {
    const options = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      meeting: "#6C5CE7",
      general: "#00B894",
      personal: "#FD79A8",
      work: "#0984E3",
      team: "#FDCB6E",
      default: "#636E72"
    };
    return colorMap[category?.toLowerCase()] || colorMap.default;
  };

  const renderSummary = () => {
    if (!summary) return null;

    const cleanText = summary.replace(/›/g, "").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    const parts = cleanText.split(
      /(?=\bOn (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b)/
    );
    const filteredParts = parts.filter((part) => {
      const trimmed = part.trim();
      return (
        trimmed.length > 0 &&
        !/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i.test(trimmed)
      );
    });

    return (
      <div className="summary-lines">
        <p className="summary-title">📅 Weekly Overview</p>
        <p className="summary-intro">{filteredParts[0].trim()}</p>
        {filteredParts.slice(1).map((line, i) => {
          const dayMatch = line.match(
            /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/
          );
          const day = dayMatch ? dayMatch[0] : `Day ${i + 1}`;
          return (
            <div key={i} className="summary-day">
              <p className="summary-day-title">📌 {day}</p>
              <p className="summary-day-content">{line.trim()}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setSearching(true);
    setSearchResults([]);

    try {
      const res = await fetch("http://localhost:5000/search-similar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputText: searchInput }),
      });

      const data = await res.json();
      if (data.matches) {
        const seenTitles = new Map();

        const uniqueResults = data.matches.filter((match) => {
          const existing = seenTitles.get(match.event_title);
          if (!existing || match.similarity > existing.similarity) {
            seenTitles.set(match.event_title, match);
            return true;
          }
          return false;
        });

        setSearchResults([...seenTitles.values()]);
      }
    } catch (err) {
      console.error("❌ Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!authChecked) return null;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Calendar Intelligence</h1>
            <p className="subtitle">AI-powered insights into your schedule</p>
          </div>
          
          {/* Integrated Search in Header */}
          <div className="header-search">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search events..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="search-input"
              />
              <button onClick={handleSearch} className="search-button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-content">
        {/* Search Results Section */}
        {searching && (
          <div className="search-loading">
            <div className="loading-spinner"></div>
            <p>Searching your calendar events...</p>
          </div>
        )}
        
        {searchResults.length > 0 && (
          <section className="search-results-section">
            <div className="section-header">
              <h2>
                <span className="icon-circle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 21L16.65 16.65" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Search Results
              </h2>
              <p className="results-count">{searchResults.length} events found</p>
            </div>
            
            <div className="search-results-grid">
              {searchResults.map((result, i) => (
                <div key={i} className="search-result-card">
                  <div className="result-header">
                    <h3>{result.event_title}</h3>
                    <div className="similarity-badge" style={{ backgroundColor: `rgba(0, 184, 148, ${0.3 + (result.similarity * 0.7)})` }}>
                      {(result.similarity * 100).toFixed(0)}% match
                    </div>
                  </div>
                  <p className="result-summary">{result.summary}</p>
                  {result.time && (
                    <div className="result-time">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#4A4A4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 6V12L16 14" stroke="#4A4A4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {formatDate(result.time)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!summary && !loading && !fromQuery && !searchResults.length && (
          <div className="empty-state">
            <div className="empty-state-content">
              <div className="empty-state-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21M19 21L21 21M19 21H14M5 21L3 21M5 21H10M9 7H15M9 11H15M10 21V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V21M10 21H14" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2>Optimize Your Schedule</h2>
              <p>Connect your calendar to get intelligent insights and time management recommendations</p>
              <button onClick={handleConnect} className="connect-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C14.1976 3 16.2161 3.7806 17.8124 5.09302M12 3V12M12 12L16 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Connect Google Calendar
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="loading-content">
              <div className="loading-spinner"></div>
              <h3>Analyzing your schedule</h3>
              <p>We're processing your calendar events to provide insights</p>
            </div>
          </div>
        )}

        {/* Summary Section */}
        {summary && !searchResults.length && (
          <section className="summary-section">
            <div className="section-header">
              <h2>
                <span className="icon-circle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 17V11M12 17V13M15 17V15M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Your Schedule Insights
              </h2>
              <p className="section-subtitle">AI analysis of your upcoming week</p>
            </div>
            
            <div className="summary-card">
              {renderSummary()}
              <div className="time-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 6V12L16 14" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                All times are displayed in your local timezone
              </div>
            </div>
          </section>
        )}

        {/* Events Section */}
        {events.length > 0 && !searchResults.length && (
          <section className="events-section">
            <div className="section-header">
              <h2>
                <span className="icon-circle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 2V6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 2V6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 10H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Upcoming Events
              </h2>
              <p className="section-subtitle">Your schedule at a glance</p>
            </div>
            
            <div className="events-grid">
              {events.map((event, index) => (
                <div key={index} className="event-card">
                  <div className="event-time">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 6V12L16 14" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {formatDate(event.time)}
                  </div>
                  
                  <h3 className="event-title">{event.title}</h3>
                  
                  {event.description && (
                    <div className="event-description">
                      <p>{event.description}</p>
                    </div>
                  )}
                  
                  <div className="event-footer">
                    <div 
                      className="event-category" 
                      style={{ backgroundColor: getCategoryColor(event.category) }}
                    >
                      {event.category || "General"}
                    </div>
                    
                    <button 
                      className="regenerate-btn" 
                      onClick={() => regenerateSummary(event, index)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3.51 9C4.01717 7.56678 4.87913 6.2854 6.01547 5.27542C7.1518 4.26543 8.52547 3.55976 10.0083 3.22426C11.4911 2.88875 13.0348 2.93434 14.4952 3.35677C15.9556 3.77921 17.2853 4.56471 18.36 5.64L23 10M1 14L5.64 18.36C6.71475 19.4353 8.04437 20.2208 9.50481 20.6432C10.9652 21.0657 12.5089 21.1112 13.9917 20.7757C15.4745 20.4402 16.8482 19.7346 17.9845 18.7246C19.1209 17.7146 19.9828 16.4332 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Regenerate Summary
                    </button>
                  </div>
                  
                  {event.regeneratedSummary && (
                    <div className="regenerated-summary">
                      <div className="summary-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        AI Summary
                      </div>
                      <p>{event.regeneratedSummary}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;