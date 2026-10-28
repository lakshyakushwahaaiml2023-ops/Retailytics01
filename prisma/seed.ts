import { seedWorkforceData } from "../lib/seedData";

async function main() {
  console.log("🌱 Running Retailytics AI Workforce seed script...");
  const result = await seedWorkforceData(true);
  console.log("✅ Seed completed:", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
