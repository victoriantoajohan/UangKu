import { getGeminiClient, GEMINI_MODEL } from "./client";

export interface ParsedReceipt {
  merchant: string | null;
  date: string | null; // ISO date string, or null if unreadable
  total: number;
  items: Array<{ name: string; price: number }>;
  categoryGuess: string | null;
}

const SYSTEM_PROMPT = `Kamu adalah OCR + parser struk belanja Indonesia.
Ekstrak informasi dari foto struk dan balas HANYA dengan JSON dengan skema persis:
{"merchant": string | null, "date": string | null, "total": number, "items": [{"name": string, "price": number}], "categoryGuess": string | null}

Aturan:
- "total" adalah nilai total akhir struk dalam Rupiah (angka murni, tanpa "Rp" atau titik/koma).
- "date" adalah tanggal transaksi dalam format ISO "YYYY-MM-DD" jika terbaca, atau null.
- "merchant" adalah nama toko/restoran, atau null jika tidak terbaca.
- "items" adalah daftar barang beserta harganya jika terbaca (boleh kosong array jika tidak jelas).
- "categoryGuess" adalah salah satu dari: "Makanan & Minuman", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Pendidikan", "Lainnya" — pilih yang paling sesuai dengan jenis merchant/struk.
- Balas HANYA dengan JSON valid, tanpa teks lain, tanpa markdown code fence.`;

function isValidReceipt(value: unknown): value is ParsedReceipt {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.total === "number" && v.total >= 0 && Array.isArray(v.items);
}

/**
 * Sends a receipt photo to Gemini's vision model and returns structured
 * merchant/total/date/category data. Returns null if parsing fails or
 * GEMINI_API_KEY isn't configured (photo receipt capture then degrades
 * gracefully — the bot asks the user to enter the amount manually).
 */
export async function parseReceiptImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg"
): Promise<ParsedReceipt | null> {
  const gemini = getGeminiClient();
  if (!gemini) return null;

  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mediaType, data: imageBase64 } },
            { text: "Ekstrak data dari struk belanja ini." },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        maxOutputTokens: 1000,
      },
    });

    if (!response.text) return null;

    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response.text);
    return isValidReceipt(parsed) ? parsed : null;
  } catch (error) {
    console.error("Gemini receipt parse failed", error);
    return null;
  }
}
