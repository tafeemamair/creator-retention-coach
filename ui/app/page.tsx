import RetentionForm from "../components/RetentionForm";

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: 80,
        background: "#0b0b0b",
      }}
    >
      <RetentionForm />
    </main>
  );
}

