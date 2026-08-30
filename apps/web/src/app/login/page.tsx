import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <LoginForm />
    </main>
  );
}
