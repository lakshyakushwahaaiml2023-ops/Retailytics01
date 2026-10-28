/**
 * Unit Tests for Retailytics Inventory Analytics Engine
 * Hand-computed mathematical proofs and assertions.
 */

import {
  computeVelocities,
  computeReorderPoint,
  assignABCClasses,
  analyzeProduct,
  allocateBudget,
  calculateStdDev,
} from "./inventoryEngine.ts";
import type { DailySaleRecord, ProductInput } from "./inventoryEngine.ts";

function assertEqual(actual: any, expected: any, testName: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.error(`❌ FAIL: ${testName}`);
    console.error(`   Expected: ${expectedStr}`);
    console.error(`   Actual:   ${actualStr}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

function assertTrue(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.error(`❌ FAIL: ${testName} (expected true, got false)`);
    throw new Error(`Test failed: ${testName}`);
  }
}

export function runInventoryUnitTests() {
  console.log("🧪 Running Retailytics Inventory Analytics Unit Tests...\n");

  const today = new Date("2026-10-28T00:00:00Z");

  // -------------------------------------------------------------
  // Test 1: Standard Deviation Calculation
  // Hand-computed: values [10, 12, 14]
  // Mean = 12. Variance = ((10-12)^2 + (12-12)^2 + (14-12)^2) / (3 - 1) = (4 + 0 + 4)/2 = 4
  // StdDev = sqrt(4) = 2.0
  // -------------------------------------------------------------
  const stdDev = calculateStdDev([10, 12, 14]);
  assertEqual(Number(stdDev.toFixed(2)), 2.0, "calculateStdDev: [10, 12, 14] -> 2.0");

  // -------------------------------------------------------------
  // Test 2: Sales Velocity (7d, 30d, 90d) and Trend
  // Hand-computed:
  // Days 0-6 (7 days): exactly 10 units/day -> total 7d = 70, velocity7d = 70 / 7 = 10.0
  // Days 7-29 (23 days): exactly 10 units/day -> total 30d = 300, velocity30d = 300 / 30 = 10.0
  // Days 30-89 (60 days): exactly 10 units/day -> total 90d = 900, velocity90d = 900 / 90 = 10.0
  // -------------------------------------------------------------
  const stableSales: DailySaleRecord[] = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    stableSales.push({
      date: d.toISOString().split("T")[0],
      quantity: 10,
      revenue: 100,
    });
  }

  const vStable = computeVelocities(stableSales, today);
  assertEqual(vStable.velocity7d, 10.0, "Velocity 7d should be exactly 10.0");
  assertEqual(vStable.velocity30d, 10.0, "Velocity 30d should be exactly 10.0");
  assertEqual(vStable.velocity90d, 10.0, "Velocity 90d should be exactly 10.0");
  assertEqual(vStable.trendRatio, 1.0, "Trend ratio for constant sales should be 1.0");
  assertEqual(vStable.trendDirection, "stable", "Trend direction should be 'stable'");

  // -------------------------------------------------------------
  // Test 3: Accelerating Trend
  // Recent 7 days: 20 units/day (total = 140)
  // Days 7-29 (23 days): 5 units/day (total = 115)
  // Total 30d = 140 + 115 = 255. Velocity 30d = 255 / 30 = 8.5
  // Velocity 7d = 140 / 7 = 20.0
  // Trend ratio = 20.0 / 8.5 = 2.35 -> accelerating
  // -------------------------------------------------------------
  const acceleratingSales: DailySaleRecord[] = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    acceleratingSales.push({
      date: d.toISOString().split("T")[0],
      quantity: i < 7 ? 20 : 5,
      revenue: i < 7 ? 200 : 50,
    });
  }

  const vAcc = computeVelocities(acceleratingSales, today);
  assertEqual(vAcc.velocity7d, 20.0, "Accelerating velocity 7d = 20.0");
  assertEqual(vAcc.velocity30d, 8.5, "Accelerating velocity 30d = 8.5");
  assertEqual(vAcc.trendDirection, "accelerating", "Trend direction should be 'accelerating'");

  // -------------------------------------------------------------
  // Test 4: Reorder Point & Safety Stock
  // Hand-computed:
  // velocity = 10, leadTimeDays = 3, salesStdDev = 2.0, Z = 1.65
  // safetyStock = ceil(1.65 * sqrt(3) * 2) = ceil(1.65 * 1.73205 * 2) = ceil(5.7157) = 6
  // leadTimeDemand = 10 * 3 = 30
  // reorderPoint = ceil(30 + 6) = 36
  // -------------------------------------------------------------
  const rop = computeReorderPoint({
    effectiveVelocity: 10,
    leadTimeDays: 3,
    salesStdDev: 2.0,
    serviceLevelZ: 1.65,
  });
  assertEqual(rop.safetyStock, 6, "Safety stock should be 6 units");
  assertEqual(rop.reorderPoint, 36, "Reorder point should be 36 units");

  // -------------------------------------------------------------
  // Test 5: Days of Stock Left & Stockout Threshold
  // Product stock = 20, velocity = 10 -> daysLeft = 20 / 10 = 2.0 days
  // Since 20 <= 36 (reorder point), needsRestock must be true!
  // -------------------------------------------------------------
  const sampleProduct: ProductInput = {
    id: "test-prod-1",
    name: "Basmati Rice 5kg",
    category: "Grains",
    price: 300,
    cost: 240,
    stock: 20,
    reorderLevel: 15,
    leadTimeDays: 3,
  };
  const analysis1 = analyzeProduct(sampleProduct, stableSales, "A", today);
  assertEqual(analysis1.daysOfStockLeft, 2.0, "Days of stock left should be 2.0");
  assertTrue(analysis1.needsRestock, "Product stock (20) <= reorderPoint (36) -> needsRestock true");
  assertEqual(analysis1.urgency, "Immediate", "Stock left (2d) <= lead time (3d) -> Immediate urgency");

  // -------------------------------------------------------------
  // Test 6: ABC Pareto Classification
  // Total 90d revenue:
  // Item 1: ₹70,000 (70% of total) -> Class 'A'
  // Item 2: ₹20,000 (20% of total) -> Class 'B'
  // Item 3: ₹10,000 (10% of total) -> Class 'C'
  // -------------------------------------------------------------
  const abcItems = [
    { id: "item-1", totalRevenue90d: 70000 },
    { id: "item-2", totalRevenue90d: 20000 },
    { id: "item-3", totalRevenue90d: 10000 },
  ];
  const abcMap = assignABCClasses(abcItems);
  assertEqual(abcMap.get("item-1"), "A", "Item 1 should be Class A");
  assertEqual(abcMap.get("item-2"), "B", "Item 2 should be Class B");
  assertEqual(abcMap.get("item-3"), "C", "Item 3 should be Class C");

  // -------------------------------------------------------------
  // Test 7: Dead Stock Flag
  // 0 sales in 90 days, stock = 15 -> isDeadStock must be true!
  // -------------------------------------------------------------
  const deadSales: DailySaleRecord[] = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    deadSales.push({ date: d.toISOString().split("T")[0], quantity: 0, revenue: 0 });
  }
  const deadProduct: ProductInput = {
    id: "dead-prod-1",
    name: "Ancient Adapter",
    category: "Obsolete",
    price: 150,
    cost: 100,
    stock: 15,
    reorderLevel: 5,
    leadTimeDays: 7,
  };
  const analysisDead = analyzeProduct(deadProduct, deadSales, "C", today);
  assertTrue(analysisDead.isDeadStock, "Product with 0 sales and stock > 0 is dead stock");
  assertEqual(analysisDead.urgency, "Liquidate", "Dead stock urgency should be 'Liquidate'");
  assertEqual(analysisDead.needsRestock, false, "Dead stock should NEVER trigger a restock order");

  // -------------------------------------------------------------
  // Test 8: Budget-Constrained Restock Allocation
  // Budget = ₹1,000
  // Candidate 1 (Priority 80): Unit cost ₹100, needs 5 -> cost = ₹500
  // Candidate 2 (Priority 70): Unit cost ₹200, needs 4 -> affordable = floor(500/200) = 2 -> cost = ₹400
  // Candidate 3 (Priority 60): Unit cost ₹300, needs 2 -> affordable = floor(100/300) = 0 -> cost = ₹0
  // Total Spent = ₹500 + ₹400 = ₹900. Remaining = ₹100 <= ₹1,000!
  // -------------------------------------------------------------
  const mockCandidates = [
    {
      productId: "c1",
      name: "High Priority Item",
      category: "Cat1",
      price: 120,
      cost: 100,
      stock: 5,
      leadTimeDays: 2,
      reorderLevel: 10,
      supplierId: null,
      supplierName: null,
      sales7d: 35,
      sales30d: 150,
      sales90d: 450,
      velocity7d: 5.0,
      velocity30d: 5.0,
      velocity90d: 5.0,
      salesStdDev: 1.0,
      trendRatio: 1.0,
      trendDirection: "stable" as const,
      totalRevenue90d: 54000,
      daysOfStockLeft: 1.0,
      isLowStock: true,
      isStockout: false,
      safetyStock: 3,
      reorderPoint: 13,
      needsRestock: true,
      suggestedRestockQty: 5,
      estimatedRestockCost: 500,
      abcClass: "A" as const,
      isDeadStock: false,
      priorityScore: 80,
      urgency: "Immediate" as const,
    },
    {
      productId: "c2",
      name: "Medium Priority Item",
      category: "Cat2",
      price: 250,
      cost: 200,
      stock: 4,
      leadTimeDays: 3,
      reorderLevel: 8,
      supplierId: null,
      supplierName: null,
      sales7d: 20,
      sales30d: 90,
      sales90d: 270,
      velocity7d: 3.0,
      velocity30d: 3.0,
      velocity90d: 3.0,
      salesStdDev: 1.0,
      trendRatio: 1.0,
      trendDirection: "stable" as const,
      totalRevenue90d: 67500,
      daysOfStockLeft: 1.3,
      isLowStock: true,
      isStockout: false,
      safetyStock: 3,
      reorderPoint: 12,
      needsRestock: true,
      suggestedRestockQty: 4,
      estimatedRestockCost: 800,
      abcClass: "B" as const,
      isDeadStock: false,
      priorityScore: 70,
      urgency: "Soon" as const,
    },
    {
      productId: "c3",
      name: "Lower Priority Item",
      category: "Cat3",
      price: 360,
      cost: 300,
      stock: 3,
      leadTimeDays: 4,
      reorderLevel: 6,
      supplierId: null,
      supplierName: null,
      sales7d: 14,
      sales30d: 60,
      sales90d: 180,
      velocity7d: 2.0,
      velocity30d: 2.0,
      velocity90d: 2.0,
      salesStdDev: 1.0,
      trendRatio: 1.0,
      trendDirection: "stable" as const,
      totalRevenue90d: 64800,
      daysOfStockLeft: 1.5,
      isLowStock: true,
      isStockout: false,
      safetyStock: 3,
      reorderPoint: 11,
      needsRestock: true,
      suggestedRestockQty: 2,
      estimatedRestockCost: 600,
      abcClass: "B" as const,
      isDeadStock: false,
      priorityScore: 60,
      urgency: "Soon" as const,
    },
  ];

  const budgetResult = allocateBudget(mockCandidates, 1000);
  assertEqual(budgetResult.totalSpent, 900, "Total allocated spent must be exactly ₹900");
  assertEqual(budgetResult.remainingBudget, 100, "Remaining budget must be exactly ₹100");
  assertTrue(budgetResult.totalSpent <= 1000, "Budget constraint strictly respected");
  assertEqual(budgetResult.restockPlan.length, 2, "Only first 2 items receive allocations");
  assertEqual(budgetResult.restockPlan[0].allocatedQty, 5, "Candidate 1 gets all 5 units");
  assertEqual(budgetResult.restockPlan[1].allocatedQty, 2, "Candidate 2 scaled down to 2 units due to budget");

  console.log("\n🎉 All 8 Unit Tests Passed Successfully!");
}

// Auto-run if executed directly via Node
if (typeof process !== "undefined" && process.argv[1]?.endsWith("inventoryEngine.test.ts")) {
  runInventoryUnitTests();
}
