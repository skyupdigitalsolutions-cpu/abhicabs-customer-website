import React, { useState, useEffect } from "react";
import { navigate } from "vike/client/router";
import { isAuthenticated } from "../../src/api/tokens";
import { api } from "../../src/api/client";

const STATUS_COLORS = {
  Open:        { bg: "#FFF7ED", text: "#C2410C", border: "#FDBA74", dot: "#F97316" },
  "In Review": { bg: "#EFF6FF", text: "#1D4ED8", border: "#93C5FD", dot: "#3B82F6" },
  Resolved:    { bg: "#F0FDF4", text: "#15803D", border: "#86EFAC", dot: "#22C55E" },
  Closed:      { bg: "#F9FAFB", text: "#6B7280", border: "#D1D5DB", dot: "#9CA3AF" },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS["Open"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999, background: c.bg, border: `1px solid ${c.border}`, fontSize: 12, fontWeight: 700, color: c.text }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
      {status}
    </span>
  );
}

function TicketCard({ ticket, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const date = ticket.submittedAt
    ? new Date(ticket.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  async function tryRefresh() {
    setRefreshing(true);
    try {
      // Try fetching updated status from backend if endpoint exists
      const data = await api.get(`/contact/${ticket.id}`);
      if (data?.status) onRefresh(ticket.id, data.status);
    } catch {
      // Backend doesn't expose this to customers yet — show a message
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 18, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>#{ticket.id?.slice(-8).toUpperCase()}</span>
            <StatusBadge status={ticket.status || "Open"} />
          </div>
          <div style={{ fontSize: 12.5, color: "#888", marginTop: 4 }}>Submitted {date}</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#FFC107", background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, padding: "4px 10px" }}>
          {ticket.topic}
        </span>
      </div>

      {/* Message preview */}
      <div style={{ background: "#F9F9F9", borderRadius: 10, padding: "12px 14px", fontSize: 13.5, color: "#444", lineHeight: 1.6 }}>
        {ticket.message?.length > 200 ? ticket.message.slice(0, 200) + "…" : ticket.message}
      </div>

      {/* Footer row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: "#999" }}>
          {ticket.name} · {ticket.phone} · {ticket.email}
        </div>
        <button
          onClick={tryRefresh}
          disabled={refreshing}
          style={{ fontSize: 12.5, fontWeight: 600, color: "#B8860B", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
        >
          {refreshing
            ? <><span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #FFC107", borderTopColor: "transparent", animation: "tkSpin .7s linear infinite", display: "inline-block" }} /> Checking…</>
            : "↻ Refresh Status"}
        </button>
      </div>
    </div>
  );
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [lookupId, setLookupId] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);
  const [tab, setTab] = useState("mine"); // "mine" | "lookup"

  useEffect(() => {
    // Load locally stored tickets
    try {
      const stored = JSON.parse(localStorage.getItem("abhicabs_tickets") || "[]");
      setTickets(stored);
    } catch { setTickets([]); }
  }, []);

  function updateStatus(id, status) {
    setTickets(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, status } : t);
      localStorage.setItem("abhicabs_tickets", JSON.stringify(updated));
      return updated;
    });
  }

  async function handleLookup(e) {
    e.preventDefault();
    if (!lookupId.trim()) return;
    setLooking(true);
    setLookupResult(null);
    setLookupError("");
    try {
      const data = await api.get(`/contact/${lookupId.trim()}`);
      setLookupResult(data);
    } catch {
      // Check local storage as fallback
      const local = tickets.find(t => t.id === lookupId.trim() || t.id?.slice(-8).toUpperCase() === lookupId.trim().toUpperCase());
      if (local) {
        setLookupResult(local);
      } else {
        setLookupError("Ticket not found. Please check your Ticket ID and try again.");
      }
    } finally {
      setLooking(false);
    }
  }

  const pillStyle = (active) => ({
    padding: "8px 18px", borderRadius: 9999, border: "none",
    fontWeight: 600, fontSize: 13.5, cursor: "pointer",
    background: active ? "#111" : "#F3F3F3",
    color: active ? "#FFC107" : "#555",
    transition: "background .2s",
  });

  return (
    <>
      <section style={{ background: "linear-gradient(to bottom, #FFFBEB, #fff)", borderBottom: "1px solid #EFEFEF", padding: "36px 22px 28px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <a href="/" style={{ color: "#888", fontSize: 12.5, textDecoration: "none" }}>Home</a>
            <span style={{ color: "#ccc" }}>›</span>
            <a href="/contact" style={{ color: "#888", fontSize: 12.5, textDecoration: "none" }}>Support</a>
            <span style={{ color: "#ccc" }}>›</span>
            <span style={{ fontSize: 12.5, color: "#111", fontWeight: 600 }}>My Tickets</span>
          </div>
          <h1 style={{ fontWeight: 800, fontSize: "clamp(24px,3.5vw,36px)", margin: "0 0 8px", letterSpacing: "-.02em" }}>My Support Tickets</h1>
          <p style={{ fontSize: 14.5, color: "#666", margin: 0 }}>Track the status of your submitted support requests.</p>
        </div>
      </section>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 22px 60px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button style={pillStyle(tab === "mine")} onClick={() => setTab("mine")}>My Tickets ({tickets.length})</button>
          <button style={pillStyle(tab === "lookup")} onClick={() => setTab("lookup")}>Look Up by ID</button>
          <button
            onClick={() => navigate("/contact")}
            style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: 9999, background: "#FFC107", color: "#111", border: "none", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
          >
            + Raise New Ticket
          </button>
        </div>

        {/* My Tickets tab */}
        {tab === "mine" && (
          tickets.length === 0 ? (
            <div style={{ background: "#fff", border: "1px dashed #E5E5E5", borderRadius: 20, padding: "48px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎫</div>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>No tickets yet</div>
              <p style={{ fontSize: 14, color: "#666", margin: "0 0 18px" }}>
                Tickets you raise through our Contact page will appear here so you can track their status.
              </p>
              <button
                onClick={() => navigate("/contact")}
                style={{ padding: "11px 24px", borderRadius: 9999, background: "#FFC107", color: "#111", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                Contact Support
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {tickets.map(t => (
                <TicketCard key={t.id} ticket={t} onRefresh={updateStatus} />
              ))}
              <button
                onClick={() => {
                  if (!window.confirm("Clear all local ticket history? This cannot be undone.")) return;
                  localStorage.removeItem("abhicabs_tickets");
                  setTickets([]);
                }}
                style={{ alignSelf: "flex-end", background: "none", border: "none", color: "#DC2626", fontSize: 12.5, fontWeight: 600, cursor: "pointer", marginTop: 4 }}
              >
                Clear history
              </button>
            </div>
          )
        )}

        {/* Lookup by ID tab */}
        {tab === "lookup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 18, padding: "24px 22px" }}>
              <h3 style={{ fontWeight: 700, fontSize: 15, margin: "0 0 6px" }}>Enter your Ticket ID</h3>
              <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px" }}>
                Your Ticket ID was shown after submitting your support request, and is listed under "My Tickets" above.
              </p>
              <form onSubmit={handleLookup} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  value={lookupId}
                  onChange={e => { setLookupId(e.target.value); setLookupError(""); setLookupResult(null); }}
                  placeholder="e.g. A1B2C3D4 or full ticket ID"
                  style={{ flex: 1, minWidth: 200, border: "1.5px solid #E0E0E0", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = "#111"}
                  onBlur={e => e.target.style.borderColor = "#E0E0E0"}
                />
                <button
                  type="submit"
                  disabled={looking || !lookupId.trim()}
                  style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: looking || !lookupId.trim() ? "#F0F0F0" : "#FFC107", color: looking || !lookupId.trim() ? "#aaa" : "#111", fontWeight: 700, fontSize: 14, cursor: looking || !lookupId.trim() ? "not-allowed" : "pointer" }}
                >
                  {looking ? "Searching…" : "Look Up"}
                </button>
              </form>
              {lookupError && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFF5F5", border: "1px solid #FCA5A5", borderRadius: 10, fontSize: 13, color: "#DC2626" }}>
                  ⚠ {lookupError}
                </div>
              )}
            </div>

            {lookupResult && (
              <TicketCard ticket={lookupResult} onRefresh={(id, status) => setLookupResult(r => ({ ...r, status }))} />
            )}

            {/* Info note */}
            <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
              <strong>Note:</strong> Our team typically responds within 2–4 business hours. For urgent issues, call us directly at <strong>+91-XXXXXXXXXX</strong> or WhatsApp us.
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes tkSpin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}