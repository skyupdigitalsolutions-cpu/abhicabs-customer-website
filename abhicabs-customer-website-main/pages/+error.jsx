import React from "react";

export default function ErrorPage({ is404 }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 22px", textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>{is404 ? "🗺️" : "⚠️"}</div>
      <h1 style={{ fontWeight: 800, fontSize: 28, margin: "0 0 10px" }}>
        {is404 ? "Page Not Found" : "Something went wrong"}
      </h1>
      <p style={{ fontSize: 15, color: "#666", margin: "0 0 28px", maxWidth: 420 }}>
        {is404
          ? "The page you're looking for doesn't exist or has been moved."
          : "An unexpected error occurred. Please refresh and try again."}
      </p>
      <a
        href="/"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 9999, background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 15, textDecoration: "none" }}
      >
        ← Back to Home
      </a>
    </div>
  );
}
