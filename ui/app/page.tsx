import RetentionForm from "./RetentionForm";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0b0b",
        padding: 16,
      }}
    >
      <RetentionForm />
    </div>
  );
}
