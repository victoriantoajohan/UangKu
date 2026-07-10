import { Mail } from "lucide-react";

export default function VerifyRequestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Mail className="h-10 w-10 text-primary" />
      <h1 className="text-xl font-semibold">Cek email kamu</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Kami sudah mengirim magic link untuk masuk ke UangKu. Buka email tersebut dan klik tautannya.
      </p>
    </main>
  );
}
