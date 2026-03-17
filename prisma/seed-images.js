// Demo: Same product in 3 stores, different prices/distances
const demoProducts = [
  // Basmati Rice (5kg) in 3 stores
  { name: "Basmati Rice (5kg)", price: 320, stock: 20, biz: "biz-1" }, // Sharma General Store
  { name: "Basmati Rice (5kg)", price: 340, stock: 15, biz: "biz-5" }, // Verma Kirana & Provisions
  { name: "Basmati Rice (5kg)", price: 320, stock: 10, biz: "biz-3" }, // Khan Medical Store (same price, different location)
  // Sunflower Oil (1L) in 3 stores
  { name: "Sunflower Oil (1L)", price: 140, stock: 10, biz: "biz-1" },
  { name: "Sunflower Oil (1L)", price: 145, stock: 8, biz: "biz-5" },
  { name: "Sunflower Oil (1L)", price: 140, stock: 12, biz: "biz-3" },
  // Toor Dal (1kg) in 3 stores
  { name: "Toor Dal (1kg)", price: 130, stock: 18, biz: "biz-1" },
  { name: "Toor Dal (1kg)", price: 135, stock: 14, biz: "biz-5" },
  { name: "Toor Dal (1kg)", price: 130, stock: 16, biz: "biz-3" },
];
for (const p of demoProducts) {
  insertProduct.run(p.name, p.price, p.stock, p.biz);
}