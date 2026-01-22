import RetentionForm from "./RetentionForm";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top, #1a1a1a, #0e0e0e)",
        padding: 16,
      }}
    >
      <RetentionForm />
    </div>
  );
}
