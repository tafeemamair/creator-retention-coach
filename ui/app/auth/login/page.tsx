import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextUrl = params?.next || "/app";

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 selection:bg-indigo-500 selection:text-white relative">
      <div className="absolute top-8 left-8">
        <Link
          href="/"
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
        >
          <span>←</span> Back to home
        </Link>
      </div>

      <LoginForm nextUrl={nextUrl} />
    </main>
  );
}
