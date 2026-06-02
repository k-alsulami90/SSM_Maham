import { Component } from "react";

/* Catches render/runtime errors so a single component fault can't blank the
   whole PWA. Offers a reload; in dev it shows the error detail. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[Mahām] render error:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          padding: 24,
          textAlign: "center",
          fontFamily: "var(--font-en)",
          color: "var(--ink-700)",
          background: "var(--bg-canvas)",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink-900)", margin: "0 0 6px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: "0 0 16px" }}>
            The app hit an unexpected error. Your data is safe — it's stored on this device. Reloading usually fixes it.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload app
          </button>
          {import.meta.env?.DEV && (
            <pre style={{ marginTop: 16, textAlign: "start", fontSize: 11, color: "var(--hue-urgent)", whiteSpace: "pre-wrap", overflow: "auto", maxHeight: 200 }}>
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
