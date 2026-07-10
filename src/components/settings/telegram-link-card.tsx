"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

export function TelegramLinkCard() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ data: { linked: boolean; username: string | null } }>("/api/telegram/link").then((res) => {
      setLinked(res.data.linked);
      setUsername(res.data.username);
    });
  }, []);

  async function generateCode() {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { code: string; expiresAt: string } }>("/api/telegram/link", {
        method: "POST",
      });
      setCode(res.data.code);
      setExpiresAt(res.data.expiresAt);
    } catch (error: any) {
      toast.error(error.message ?? "Gagal membuat kode");
    } finally {
      setLoading(false);
    }
  }

  async function unlink() {
    if (!confirm("Putuskan hubungan akun Telegram?")) return;
    await apiFetch("/api/telegram/link", { method: "DELETE" });
    setLinked(false);
    setUsername(null);
    toast.success("Akun Telegram diputuskan");
  }

  function copyCommand() {
    if (!code) return;
    navigator.clipboard.writeText(`/link ${code}`);
    toast.success("Disalin ke clipboard");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" /> Hubungkan Telegram
        </CardTitle>
        <CardDescription>
          Catat transaksi lewat chat Telegram dengan teks natural atau foto struk belanja.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {linked ? (
          <div className="space-y-3">
            <p className="text-sm">
              ✅ Terhubung{username ? ` sebagai @${username}` : ""}.
            </p>
            <Button variant="outline" size="sm" onClick={unlink}>
              Putuskan Hubungan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {code ? (
              <div className="space-y-2 rounded-md border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Kirim perintah berikut ke bot UangKu di Telegram (berlaku 10 menit):
                </p>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-background px-3 py-1.5 font-mono text-lg font-semibold">
                    /link {code}
                  </code>
                  <Button variant="ghost" size="icon" onClick={copyCommand}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Berlaku sampai {new Date(expiresAt).toLocaleTimeString("id-ID")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum terhubung ke akun Telegram manapun.</p>
            )}
            <Button onClick={generateCode} disabled={loading}>
              {loading ? "Membuat kode..." : "Generate Kode OTP"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
