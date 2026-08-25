"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Georgia, serif",
          background: "#f7f5f0",
          color: "#134e4a",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Gambo General Hospital
          </p>
          <h1 style={{ fontSize: 28, margin: "12px 0" }}>Application error</h1>
          <p style={{ fontSize: 14, opacity: 0.75 }}>
            {error?.message || "A critical error occurred."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 24,
              border: 0,
              borderRadius: 999,
              background: "#134e4a",
              color: "#fff",
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
