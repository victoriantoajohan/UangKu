/**
 * Parses Indonesian shorthand amounts into plain numbers.
 * Supports: "25000", "25.000", "Rp 25.000", "25rb", "1.5jt", "100k", "2jt".
 */
export function parseIndonesianAmount(input: string): number | null {
  const raw = input.trim().toLowerCase().replace(/rp\.?\s*/g, "");

  const shorthandMatch = raw.match(/^([\d.,]+)\s*(rb|ribu|k|jt|juta|m|jut)\b/);
  if (shorthandMatch) {
    const numberPart = shorthandMatch[1].replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
    const value = parseFloat(numberPart);
    if (Number.isNaN(value)) return null;
    const unit = shorthandMatch[2];
    if (unit === "rb" || unit === "ribu" || unit === "k") return Math.round(value * 1_000);
    if (unit === "jt" || unit === "juta" || unit === "m" || unit === "jut") {
      return Math.round(value * 1_000_000);
    }
  }

  // Plain number, possibly with thousands separators: "25.000" or "25,000" or "25000"
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  // If it looks like an Indonesian-formatted integer (dots as thousands separators)
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return parseInt(cleaned.replace(/\./g, ""), 10);
  }
  if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
    return parseInt(cleaned.replace(/,/g, ""), 10);
  }

  const value = parseFloat(cleaned.replace(",", "."));
  return Number.isNaN(value) ? null : Math.round(value);
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
