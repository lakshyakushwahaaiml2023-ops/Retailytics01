/**
 * Retailytics Core Inventory Analytics Engine
 * Pure TypeScript implementation for sales velocity, ABC classification,
 * reorder point calculations, dead stock detection, and budget-constrained restock optimization.
 */

export type DailySaleRecord = {
  date: string; // YYYY-MM-DD
  quantity: number;
  revenue: number;
};

export type ProductInput = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  reorderLevel: number;
  leadTimeDays: number;
  supplierId?: string | null;
  supplierName?: string | null;
};

export type ProductMetrics = {
  productId: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  leadTimeDays: number;
  reorderLevel: number;
  supplierId: string | null;
  supplierName: string | null;

  // Sales velocities (units per day)
  sales7d: number;
  sales30d: number;
  sales90d: number;
  velocity7d: number;
  velocity30d: number;
  velocity90d: number;

  // Demand stability & trend
  salesStdDev: number;
  trendRatio: number; // velocity7d / velocity30d
  trendDirection: "accelerating" | "stable" | "decelerating" | "dead";

  // Stockout risk
  daysOfStockLeft: number; // stock / current velocity
  isLowStock: boolean;
  isStockout: boolean;

  // Reorder point math: velocity * leadTime + safetyStock
  safetyStock: number;
  reorderPoint: number;
  needsRestock: boolean;
  suggestedRestockQty: number;
  estimatedRestockCost: number;

  // Value & dead stock classification
  totalRevenue90d: number;
  abcClass: "A" | "B" | "C";
  isDeadStock: boolean;

  // Restock priority score (higher = restock first)
  priorityScore: number;
  urgency: "Immediate" | "Soon" | "Watch" | "Healthy" | "Liquidate";
};

export type BudgetAllocatedItem = {
  productId: string;
  name: string;
  category: string;
  unitCost: number;
  currentStock: number;
  daysOfStockLeft: number;
  idealQty: number;
  allocatedQty: number;
  totalCost: number;
  urgency: "Immediate" | "Soon" | "Watch" | "Healthy" | "Liquidate";
  rationale: string;
};

export type InventoryAnalysis = {
  businessId: string;
  computedAt: string;
  totalSKUs: number;
  budgetGiven: number;
  budgetSpent: number;
  budgetRemaining: number;
  stockHealth: {
    healthyCount: number;
    lowStockCount: number;
    stockoutCount: number;
    deadStockCount: number;
  };
  abcBreakdown: {
    aCount: number;
    bCount: number;
    cCount: number;
  };
  metrics: ProductMetrics[];
  restockPlan: BudgetAllocatedItem[];
  deadStockList: ProductMetrics[];
};

/**
 * Calculates standard deviation of daily sales quantities.
 */
export function calculateStdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Computes velocity and trend over 7, 30, and 90 days.
 */
export function computeVelocities(salesHistory: DailySaleRecord[], referenceDate = new Date()) {
  const refTime = new Date(referenceDate.toISOString().split("T")[0]).getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  let total7d = 0;
  let total30d = 0;
  let total90d = 0;
  let revenue90d = 0;
  const dailyQuantities30d: number[] = [];

  for (const record of salesHistory) {
    const saleTime = new Date(record.date).getTime();
    const diffDays = Math.floor((refTime - saleTime) / ONE_DAY_MS);

    if (diffDays >= 0 && diffDays < 90) {
      total90d += record.quantity;
      revenue90d += record.revenue;
    }
    if (diffDays >= 0 && diffDays < 30) {
      total30d += record.quantity;
      dailyQuantities30d.push(record.quantity);
    }
    if (diffDays >= 0 && diffDays < 7) {
      total7d += record.quantity;
    }
  }

  const velocity7d = Number((total7d / 7).toFixed(2));
  const velocity30d = Number((total30d / 30).toFixed(2));
  const velocity90d = Number((total90d / 90).toFixed(2));

  // Trend direction
  let trendRatio = 1.0;
  let trendDirection: "accelerating" | "stable" | "decelerating" | "dead" = "stable";

  if (velocity90d === 0 && velocity30d === 0 && velocity7d === 0) {
    trendRatio = 0;
    trendDirection = "dead";
  } else if (velocity30d > 0) {
    trendRatio = Number((velocity7d / velocity30d).toFixed(2));
    if (trendRatio >= 1.2) trendDirection = "accelerating";
    else if (trendRatio <= 0.8) trendDirection = "decelerating";
    else trendDirection = "stable";
  } else if (velocity7d > 0) {
    trendRatio = 2.0;
    trendDirection = "accelerating";
  }

  const salesStdDev = Number(calculateStdDev(dailyQuantities30d).toFixed(2));

  return {
    sales7d: total7d,
    sales30d: total30d,
    sales90d: total90d,
    velocity7d,
    velocity30d,
    velocity90d,
    trendRatio,
    trendDirection,
    salesStdDev,
    totalRevenue90d: revenue90d,
  };
}

/**
 * Computes Reorder Point = Velocity * LeadTime + SafetyStock
 * Standard statistical safety stock: Z * sqrt(LeadTime) * StdDev
 * Default Z = 1.65 (95% cycle service level)
 */
export function computeReorderPoint(params: {
  effectiveVelocity: number;
  leadTimeDays: number;
  salesStdDev: number;
  serviceLevelZ?: number;
}): { safetyStock: number; reorderPoint: number } {
  const { effectiveVelocity, leadTimeDays, salesStdDev, serviceLevelZ = 1.65 } = params;

  if (effectiveVelocity <= 0) {
    return { safetyStock: 0, reorderPoint: 0 };
  }

  // Safety stock accounts for demand variability during supplier lead time
  const safetyStock = Math.ceil(serviceLevelZ * Math.sqrt(Math.max(1, leadTimeDays)) * salesStdDev);
  const leadTimeDemand = effectiveVelocity * leadTimeDays;
  const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);

  return { safetyStock, reorderPoint };
}

/**
 * Pareto ABC Analysis:
 * Sorts products by 90d revenue descending.
 * A: Top 70% cumulative revenue
 * B: Next 20% (70%-90%)
 * C: Bottom 10% (90%-100%)
 */
export function assignABCClasses(products: { id: string; totalRevenue90d: number }[]): Map<string, "A" | "B" | "C"> {
  const sorted = [...products].sort((a, b) => b.totalRevenue90d - a.totalRevenue90d);
  const totalRev = sorted.reduce((sum, p) => sum + p.totalRevenue90d, 0);

  const resultMap = new Map<string, "A" | "B" | "C">();
  let runningRev = 0;

  for (const item of sorted) {
    if (totalRev === 0) {
      resultMap.set(item.id, "C");
      continue;
    }
    runningRev += item.totalRevenue90d;
    const cumPct = (runningRev / totalRev) * 100;

    if (cumPct <= 70) {
      resultMap.set(item.id, "A");
    } else if (cumPct <= 90) {
      resultMap.set(item.id, "B");
    } else {
      resultMap.set(item.id, "C");
    }
  }

  return resultMap;
}

/**
 * Computes end-to-end metrics for a single product.
 */
export function analyzeProduct(
  product: ProductInput,
  salesHistory: DailySaleRecord[],
  abcClass: "A" | "B" | "C",
  referenceDate = new Date()
): ProductMetrics {
  const vel = computeVelocities(salesHistory, referenceDate);

  // Effective velocity uses 7d if reliable or positive, falling back to 30d
  const effectiveVelocity = vel.velocity7d > 0 ? vel.velocity7d : vel.velocity30d;

  // Days of stock left
  const daysOfStockLeft =
    effectiveVelocity > 0 ? Number((product.stock / effectiveVelocity).toFixed(1)) : product.stock > 0 ? 999 : 0;

  // Reorder point
  const { safetyStock, reorderPoint } = computeReorderPoint({
    effectiveVelocity,
    leadTimeDays: product.leadTimeDays,
    salesStdDev: vel.salesStdDev,
  });

  // Threshold check: needs restock if stock <= reorderPoint or stock <= manual reorderLevel
  const threshold = Math.max(reorderPoint, product.reorderLevel);
  const isStockout = product.stock === 0;
  const isLowStock = product.stock <= threshold;
  const isDeadStock = vel.sales90d === 0 && product.stock > 0;

  const needsRestock = !isDeadStock && (isStockout || isLowStock);

  // Target restock batch covers lead time demand + 14 days cycle stock
  let suggestedRestockQty = 0;
  if (needsRestock) {
    const cycleDemand = Math.ceil(effectiveVelocity * 14);
    const deficit = Math.max(0, threshold - product.stock);
    suggestedRestockQty = Math.max(deficit, cycleDemand);
  }

  const estimatedRestockCost = Math.round(suggestedRestockQty * (product.cost || product.price * 0.75));

  // Priority scoring:
  // ABC weight: A=40, B=25, C=10
  // Stockout factor: 50 if stockout, 30 if daysLeft < leadTime, 15 if daysLeft < leadTime * 2
  // Trend factor: +10 if accelerating, -10 if decelerating
  let priorityScore = 0;
  let urgency: "Immediate" | "Soon" | "Watch" | "Healthy" | "Liquidate" = "Healthy";

  if (isDeadStock) {
    urgency = "Liquidate";
    priorityScore = 0;
  } else if (needsRestock) {
    const abcWeight = abcClass === "A" ? 40 : abcClass === "B" ? 25 : 10;
    let riskWeight = 10;

    if (isStockout) {
      riskWeight = 50;
      urgency = "Immediate";
    } else if (daysOfStockLeft <= product.leadTimeDays) {
      riskWeight = 40;
      urgency = "Immediate";
    } else if (daysOfStockLeft <= product.leadTimeDays * 1.5) {
      riskWeight = 25;
      urgency = "Soon";
    } else {
      urgency = "Watch";
      riskWeight = 15;
    }

    const trendBonus = vel.trendDirection === "accelerating" ? 10 : vel.trendDirection === "decelerating" ? -5 : 0;
    priorityScore = abcWeight + riskWeight + trendBonus;
  }

  return {
    productId: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    cost: product.cost || Number((product.price * 0.75).toFixed(2)),
    stock: product.stock,
    leadTimeDays: product.leadTimeDays,
    reorderLevel: product.reorderLevel,
    supplierId: product.supplierId || null,
    supplierName: product.supplierName || null,

    sales7d: vel.sales7d,
    sales30d: vel.sales30d,
    sales90d: vel.sales90d,
    velocity7d: vel.velocity7d,
    velocity30d: vel.velocity30d,
    velocity90d: vel.velocity90d,
    salesStdDev: vel.salesStdDev,
    trendRatio: vel.trendRatio,
    trendDirection: vel.trendDirection,
    totalRevenue90d: vel.totalRevenue90d,

    daysOfStockLeft,
    isLowStock,
    isStockout,
    safetyStock,
    reorderPoint,
    needsRestock,
    suggestedRestockQty,
    estimatedRestockCost,
    abcClass,
    isDeadStock,
    priorityScore,
    urgency,
  };
}

/**
 * Budget-Constrained Restock Allocation Engine:
 * Knapsack greedy allocator that strictly respects total budget constraint:
 * sum(allocatedQty * cost) <= budget.
 */
export function allocateBudget(
  candidates: ProductMetrics[],
  budget: number
): { restockPlan: BudgetAllocatedItem[]; totalSpent: number; remainingBudget: number } {
  // Sort candidates by priority score descending
  const sorted = [...candidates]
    .filter((p) => p.needsRestock && p.suggestedRestockQty > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  let remainingBudget = budget;
  const restockPlan: BudgetAllocatedItem[] = [];

  for (const item of sorted) {
    if (remainingBudget <= 0) break;

    const unitCost = item.cost > 0 ? item.cost : item.price * 0.75;
    if (unitCost <= 0) continue;

    // Calculate maximum affordable units
    const affordableUnits = Math.floor(remainingBudget / unitCost);
    if (affordableUnits <= 0) continue;

    // Allocate ideal requested quantity or max affordable
    const allocatedQty = Math.min(item.suggestedRestockQty, affordableUnits);
    const itemTotalCost = Math.round(allocatedQty * unitCost);

    remainingBudget -= itemTotalCost;

    let rationale = `Restock ${allocatedQty} units (Class ${item.abcClass}, ${item.daysOfStockLeft}d stock left).`;
    if (allocatedQty < item.suggestedRestockQty) {
      rationale += ` (Scaled down from ideal ${item.suggestedRestockQty} due to budget limit).`;
    }

    restockPlan.push({
      productId: item.productId,
      name: item.name,
      category: item.category,
      unitCost,
      currentStock: item.stock,
      daysOfStockLeft: item.daysOfStockLeft,
      idealQty: item.suggestedRestockQty,
      allocatedQty,
      totalCost: itemTotalCost,
      urgency: item.urgency,
      rationale,
    });
  }

  const totalSpent = budget - remainingBudget;
  return { restockPlan, totalSpent, remainingBudget };
}

/**
 * Complete Inventory Analytics Orchestrator
 */
export function runInventoryAnalysis(
  businessId: string,
  products: ProductInput[],
  salesByProduct: Map<string, DailySaleRecord[]>,
  budget = 25000,
  referenceDate = new Date()
): InventoryAnalysis {
  // 1. Compute preliminary 90d revenues to establish ABC classes
  const preliminaryTotals = products.map((p) => {
    const history = salesByProduct.get(p.id) || [];
    const vel = computeVelocities(history, referenceDate);
    return { id: p.id, totalRevenue90d: vel.totalRevenue90d };
  });

  const abcMap = assignABCClasses(preliminaryTotals);

  // 2. Generate granular metrics for all products
  const metrics: ProductMetrics[] = products.map((p) => {
    const history = salesByProduct.get(p.id) || [];
    const abcClass = abcMap.get(p.id) || "C";
    return analyzeProduct(p, history, abcClass, referenceDate);
  });

  // 3. Allocate budget strictly
  const { restockPlan, totalSpent, remainingBudget } = allocateBudget(metrics, budget);

  // 4. Summaries & Dead stock identification
  const deadStockList = metrics.filter((m) => m.isDeadStock);
  const healthyCount = metrics.filter((m) => m.urgency === "Healthy").length;
  const lowStockCount = metrics.filter((m) => m.isLowStock && !m.isStockout).length;
  const stockoutCount = metrics.filter((m) => m.isStockout).length;

  const aCount = metrics.filter((m) => m.abcClass === "A").length;
  const bCount = metrics.filter((m) => m.abcClass === "B").length;
  const cCount = metrics.filter((m) => m.abcClass === "C").length;

  return {
    businessId,
    computedAt: referenceDate.toISOString(),
    totalSKUs: products.length,
    budgetGiven: budget,
    budgetSpent: totalSpent,
    budgetRemaining: remainingBudget,
    stockHealth: {
      healthyCount,
      lowStockCount,
      stockoutCount,
      deadStockCount: deadStockList.length,
    },
    abcBreakdown: {
      aCount,
      bCount,
      cCount,
    },
    metrics,
    restockPlan,
    deadStockList,
  };
}
