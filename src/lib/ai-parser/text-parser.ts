import { getAnthropicClient, CLAUDE_MODEL } from "./client";
import { parseIndonesianAmount } from "@/lib/telegram/format";

export interface ParsedTransaction {
  type: "income" | "expense";
  amount: number;
  wallet: string | null;
  category: string | null;
  note: string;
}

/**
 * Fast-path regex parser for the documented "baku" (canonical) format:
 * "keluar 25000 makan gopay" / "masuk 500000 gaji bca"
 * `keluar`/`masuk` + amount + free text (last word treated as the wallet hint).
 */
export function regexParseTransactionText(text: string): ParsedTransaction | null {
  const match = text
    .trim()
    .match(/^(keluar|masuk|expense|income)\s+([\d.,]+\s*(?:rb|ribu|k|jt|juta)?)\s+(.+)$/i);
  if (!match) return null;

  const [, typeWord, amountRaw, rest] = match;
  const amount = parseIndonesianAmount(amountRaw);
  if (amount === null || amount <= 0) return null;

  const type: "income" | "expense" = /keluar|expense/i.test(typeWord) ? "expense" : "income";
  const words = rest.trim().split(/\s+/);
  const wallet = words.length > 1 ? words[words.length - 1] : null;
  const category = words.length > 1 ? words.slice(0, -1).join(" ") : words[0];

  return { type, amount, wallet, category, note: rest.trim() };
}

const SYSTEM_PROMPT = `Kamu adalah parser transaksi keuangan pribadi berbahasa Indonesia.
Ubah pesan pengguna menjadi JSON dengan skema persis:
{"type": "income" | "expense", "amount": number, "wallet": string | null, "category": string | null, "note": string}

Aturan:
- "amount" adalah angka Rupiah murni (contoh: "25rb" -> 25000, "1.5jt" -> 1500000, "100k" -> 100000).
- "wallet" adalah nama dompet/metode pembayaran yang disebut (contoh: GoPay, BCA, Cash, OVO, Dana), atau null jika tidak disebut.
- "category" adalah tebakan kategori transaksi dalam Bahasa Indonesia singkat (contoh: "Makanan & Minuman", "Transportasi"), atau null jika tidak jelas.
- "note" adalah ringkasan singkat transaksi.
- Jika pesan berisi kata seperti "gaji", "bonus", "dapat", "terima", "masuk" itu kemungkinan income. Kata seperti "beli", "bayar", "keluar", "makan", "jajan" kemungkinan expense.
- Balas HANYA dengan JSON valid, tanpa teks lain, tanpa markdown code fence.`;

function buildUserPrompt(
  text: string,
  context?: { walletNames: string[]; categoryNames: string[] }
): string {
  let prompt = `Pesan: "${text}"`;
  if (context?.walletNames.length) {
    prompt += `\n\nDompet yang dimiliki pengguna: ${context.walletNames.join(", ")}`;
  }
  if (context?.categoryNames.length) {
    prompt += `\nKategori yang tersedia: ${context.categoryNames.join(", ")}`;
  }
  return prompt;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : trimmed;
  return JSON.parse(jsonText);
}

function isValidParsed(value: unknown): value is ParsedTransaction {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v.type === "income" || v.type === "expense") &&
    typeof v.amount === "number" &&
    v.amount > 0 &&
    (v.wallet === null || typeof v.wallet === "string") &&
    (v.category === null || typeof v.category === "string") &&
    typeof v.note === "string"
  );
}

/**
 * Parses free-form natural-language transaction text (e.g. "makan siang 25rb
 * pakai GoPay") into a structured transaction using Claude. Falls back to a
 * simple regex parser for the canonical "keluar/masuk <amount> ..." format
 * when Claude is unavailable or returns something unusable.
 */
export async function parseTransactionText(
  text: string,
  context?: { walletNames: string[]; categoryNames: string[] }
): Promise<ParsedTransaction | null> {
  const anthropic = getAnthropicClient();

  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(text, context) }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        const parsed = extractJson(textBlock.text);
        if (isValidParsed(parsed)) return parsed;
      }
    } catch (error) {
      console.error("Claude text parse failed, falling back to regex", error);
    }
  }

  return regexParseTransactionText(text);
}
