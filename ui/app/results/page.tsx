import RetentionForm from "../../components/RetentionForm";

export default function ResultsPage() {
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
    </div>
  );
}
