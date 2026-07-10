import { describe, expect, it, beforeEach } from "vitest";
import { regexParseTransactionText, parseTransactionText } from "@/lib/ai-parser/text-parser";
import { parseIndonesianAmount } from "@/lib/telegram/format";

describe("parseIndonesianAmount", () => {
  it("parses shorthand thousands", () => {
    expect(parseIndonesianAmount("25rb")).toBe(25000);
    expect(parseIndonesianAmount("25 ribu")).toBe(25000);
    expect(parseIndonesianAmount("100k")).toBe(100000);
  });

  it("parses shorthand millions", () => {
    expect(parseIndonesianAmount("1.5jt")).toBe(1500000);
    expect(parseIndonesianAmount("2juta")).toBe(2000000);
  });

  it("parses Indonesian-formatted plain numbers", () => {
    expect(parseIndonesianAmount("25.000")).toBe(25000);
    expect(parseIndonesianAmount("Rp 25.000")).toBe(25000);
  });

  it("parses plain integers", () => {
    expect(parseIndonesianAmount("25000")).toBe(25000);
  });

  it("returns null for garbage input", () => {
    expect(parseIndonesianAmount("abc")).toBeNull();
  });
});

describe("regexParseTransactionText", () => {
  it("parses canonical expense format", () => {
    const result = regexParseTransactionText("keluar 25000 makan gopay");
    expect(result).toEqual({
      type: "expense",
      amount: 25000,
      wallet: "gopay",
      category: "makan",
      note: "makan gopay",
    });
  });

  it("parses canonical income format with shorthand amount", () => {
    const result = regexParseTransactionText("masuk 5jt gaji bca");
    expect(result).toEqual({
      type: "income",
      amount: 5_000_000,
      wallet: "bca",
      category: "gaji",
      note: "gaji bca",
    });
  });

  it("returns null for free-form natural language", () => {
    expect(regexParseTransactionText("makan siang 25rb pakai GoPay")).toBeNull();
  });

  it("returns null when amount is unparseable", () => {
    expect(regexParseTransactionText("keluar banyak sekali jajan")).toBeNull();
  });
});

describe("parseTransactionText (no ANTHROPIC_API_KEY)", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("falls back to the regex parser for canonical format", async () => {
    const result = await parseTransactionText("keluar 25000 makan gopay");
    expect(result).toEqual({
      type: "expense",
      amount: 25000,
      wallet: "gopay",
      category: "makan",
      note: "makan gopay",
    });
  });

  it("returns null for free-form text it cannot parse without Claude", async () => {
    const result = await parseTransactionText("makan siang 25rb pakai GoPay");
    expect(result).toBeNull();
  });
});
