import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Wallet as WalletIcon } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  const providers: string[] = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) providers.push("google");
  if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) providers.push("email");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <WalletIcon className="h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">Masuk ke UangKu</h1>
        <p className="text-sm text-muted-foreground">Catat keuangan pribadimu, di web maupun Telegram.</p>
      </div>
      <LoginForm providers={providers} />
    </main>
  );
}
