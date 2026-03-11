import RetentionForm from "../components/RetentionForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <RetentionForm />
      </div>
    </main>
  );
}
