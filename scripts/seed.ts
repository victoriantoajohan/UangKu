import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, isNull } from "drizzle-orm";
import * as schema from "../src/db/schema";

const { categories, users, wallets, DEFAULT_CATEGORIES } = schema;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  console.log("Seeding default categories...");
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await db
      .select()
      .from(categories)
      .where(
        and(
          isNull(categories.userId),
          eq(categories.name, cat.name),
          eq(categories.kind, cat.kind)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(categories).values({
        userId: null,
        name: cat.name,
        kind: cat.kind,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
      });
      console.log(`  + ${cat.name}`);
    }
  }

  const demoEmail = "demo@uangku.app";
  const [demoUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, demoEmail))
    .limit(1);

  if (!demoUser) {
    console.log("Seeding demo user + example wallets...");
    const [createdUser] = await db
      .insert(users)
      .values({ name: "Demo User", email: demoEmail })
      .returning();

    const demoWallets: Array<Omit<schema.NewWallet, "userId">> = [
      { name: "Cash", type: "cash", initialBalance: "500000", icon: "wallet", color: "#22c55e" },
      { name: "BCA", type: "bank", initialBalance: "5000000", icon: "landmark", color: "#2563eb" },
      { name: "GoPay", type: "ewallet", icon: "smartphone", color: "#00aa13", initialBalance: "150000" },
      {
        name: "Tabungan Darurat",
        type: "savings",
        initialBalance: "10000000",
        icon: "piggy-bank",
        color: "#a855f7",
        savingsMonthlyDeposit: "500000",
        savingsAnnualInterestRate: "3.5",
      },
    ];

    for (const w of demoWallets) {
      await db.insert(wallets).values({ ...w, userId: createdUser.id });
    }
    console.log(`  + demo user ${demoEmail} with ${demoWallets.length} wallets`);
  } else {
    console.log("Demo user already exists, skipping.");
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
