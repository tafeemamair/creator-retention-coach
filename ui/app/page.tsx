import RetentionForm from "../components/RetentionForm";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top, #1a1a1a, #0e0e0e)",
        padding: 16,
      }}
    >
      <RetentionForm />
    <div style={{ marginTop: 16, fontSize: 12, color: "#9ca3af" }}>
      <a href="/terms" style={{ color: "#9ca3af", marginRight: 8 }}>
        Terms
      </a>
      ·
      <a href="/privacy" style={{ color: "#9ca3af", marginLeft: 8 }}>
        Privacy
      </a>
    </div>
  </div>
  );
}
