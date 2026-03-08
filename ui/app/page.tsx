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
        background: "linear-gradient(180deg, #0f172a 0%, #111827 45%, #020617 100%)",
        padding: "40px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 860 }}>
        <RetentionForm />
      </div>
      <div style={{ marginTop: 18, fontSize: 12, color: "#94a3b8" }}>
        <a href="/terms" style={{ color: "#94a3b8", marginRight: 8 }}>
          Terms
        </a>
        ·
        <a href="/privacy" style={{ color: "#94a3b8", marginLeft: 8 }}>
          Privacy
        </a>
      </div>
    </div>
  );
}
