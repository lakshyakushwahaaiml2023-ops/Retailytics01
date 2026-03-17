import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const libsql = createClient({ url: "file:///D:/Lakshya/Hackathon-DAVV/retailytics/dev.db" });
const adapter = new PrismaLibSql(libsql);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.user.upsert({
    where: { email: "owner@demo.com" },
    update: {},
    create: { id: "demo-user", email: "owner@demo.com", role: "owner" },
  });

  const biz = await prisma.business.upsert({
    where: { id: "demo-biz" },
    update: {},
    create: {
      id: "demo-biz",
      name: "Sharma General Store",
      type: "grocery",
      city: "Pithampur",
      locality: "Sector 1",
      areaType: "Urban",
      customerAgeRange: "25-50",
      deliveryRadius: 5,
      ownerId: "demo-user",
    },
  });

  const products = [
    { name: "Basmati Rice (5kg)", price: 320, stock: 40 },
    { name: "Sunflower Oil (1L)", price: 140, stock: 25 },
    { name: "Toor Dal (1kg)", price: 130, stock: 30 },
    { name: "Electric Induction Cooktop", price: 1499, stock: 5 },
    { name: "Atta (10kg)", price: 380, stock: 20 },
    { name: "Sugar (1kg)", price: 45, stock: 50 },
    { name: "Cold Drink (Coke 2L)", price: 90, stock: 24 },
    { name: "Mosquito Repellent Spray", price: 110, stock: 15 },
    { name: "Packaged Drinking Water (20L)", price: 60, stock: 18 },
    { name: "Namkeen Snacks Assorted", price: 30, stock: 60 },
  ];

  for (const p of products) {
    await prisma.product.create({ data: { ...p, businessId: biz.id } });
  }

  console.log("Seeded successfully");
}

main().catch(console.error).finally(() => prisma.$disconnect());