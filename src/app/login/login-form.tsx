"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ providers }: { providers: string[] }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  return (
    <div className="w-full max-w-sm space-y-6">
      {providers.includes("google") && (
        <Button className="w-full" variant="outline" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
          Masuk dengan Google
        </Button>
      )}

      {providers.includes("google") && providers.includes("email") && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          atau
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {providers.includes("email") && (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setSending(true);
            await signIn("email", { email, callbackUrl: "/dashboard" });
            setSending(false);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="kamu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={sending}>
            {sending ? "Mengirim link..." : "Kirim magic link"}
          </Button>
        </form>
      )}

      {providers.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Belum ada provider login yang dikonfigurasi. Isi GOOGLE_CLIENT_ID/SECRET atau
          EMAIL_SERVER/EMAIL_FROM di environment variables.
        </p>
      )}
    </div>
  );
}
