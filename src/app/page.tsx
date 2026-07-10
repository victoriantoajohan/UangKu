import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">UangKu</h1>
        <p className="max-w-md text-muted-foreground">
          Catat pemasukan &amp; pengeluaranmu lewat dashboard web atau bot
          Telegram — cukup ketik &quot;makan siang 25rb pakai GoPay&quot;.
        </p>
      </div>
      <Link
        href="/login"
        className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow hover:opacity-90"
      >
        Masuk / Daftar
      </Link>
    </main>
  );
}
