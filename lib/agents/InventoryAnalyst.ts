/**
 * InventoryAnalyst Agent
 * Synthesizes computed inventory metrics, enforces budget constraints,
 * and calls Groq LLaMA 3.3 with Zod schema validation and single-retry resilience.
 */

import { z } from "zod";
import { createChatCompletion } from "../ai.ts";
import {
  allocateBudget,
} from "../analytics/inventoryEngine.ts";
import type {
  InventoryAnalysis,
  ProductMetrics,
} from "../analytics/inventoryEngine.ts";

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const RestockRecommendationSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  suggestedQty: z.number().int().nonnegative(),
  when: z.enum(["Immediately", "Within 2 days", "Within 1 week", "Monitor"]),
  unitCost: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  supplierName: z.string().default("Primary Supplier"),
  rationale: z.string(),
  metricsCited: z.object({
    velocity7d: z.number(),
    daysOfStockLeft: z.number(),
    reorderPoint: z.number(),
    currentStock: z.number(),
  }),
});

export const DeadStockActionSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  currentStock: z.number(),
  action: z.enum([
    "Flash Discount 40-50%",
    "Bundle with Fast Mover",
    "Return to Vendor",
    "Liquidate / Scrap",
  ]),
  rationale: z.string(),
  capitalLocked: z.number().nonnegative(),
});

export const InventoryAnomalySchema = z.object({
  type: z.enum([
    "Velocity Spike",
    "Lead Time Vulnerability",
    "Rapid Stockout",
    "Decelerating Velocity",
    "Disproportionate Tied Capital",
  ]),
  description: z.string(),
  affectedProduct: z.string(),
  severity: z.enum(["High", "Medium", "Low"]),
  metricEvidence: z.string(),
});

export const InventoryAnalystOutputSchema = z.object({
  summary: z.string(),
  executiveGuidance: z.string(),
  budgetSummary: z.object({
    budgetAllocated: z.number(),
    totalSpendRecommended: z.number(),
    remainingBudget: z.number(),
    budgetCompliant: z.boolean(),
  }),
  restockOrders: z.array(RestockRecommendationSchema),
  deadStockActions: z.array(DeadStockActionSchema),
  anomalies: z.array(InventoryAnomalySchema),
});

export type InventoryAnalystOutput = z.infer<typeof InventoryAnalystOutputSchema>;

// ==========================================
// DETERMINISTIC BUDGET ENFORCEMENT
// ==========================================

export function enforceBudgetConstraints(
  recommendations: z.infer<typeof RestockRecommendationSchema>[],
  budget: number
): {
  clampedOrders: z.infer<typeof RestockRecommendationSchema>[];
  totalSpend: number;
  remainingBudget: number;
  wasClamped: boolean;
} {
  let runningSpend = 0;
  let wasClamped = false;
  const clampedOrders: z.infer<typeof RestockRecommendationSchema>[] = [];

  for (const rec of recommendations) {
    if (runningSpend >= budget) {
      wasClamped = true;
      continue;
    }

    const unitCost = rec.unitCost > 0 ? rec.unitCost : 1;
    const availableBudget = budget - runningSpend;
    const maxAffordable = Math.floor(availableBudget / unitCost);

    let finalQty = rec.suggestedQty;
    if (finalQty > maxAffordable) {
      finalQty = maxAffordable;
      wasClamped = true;
    }

    if (finalQty > 0) {
      const lineCost = Math.round(finalQty * unitCost);
      runningSpend += lineCost;

      let adjustedRationale = rec.rationale;
      if (finalQty < rec.suggestedQty) {
        adjustedRationale += ` [Budget Enforcement: Clamped from ${rec.suggestedQty} to ${finalQty} to stay within ₹${budget} budget]`;
      }

      clampedOrders.push({
        ...rec,
        suggestedQty: finalQty,
        totalCost: lineCost,
        rationale: adjustedRationale,
      });
    }
  }

  return {
    clampedOrders,
    totalSpend: runningSpend,
    remainingBudget: Math.max(0, budget - runningSpend),
    wasClamped,
  };
}

// ==========================================
// FALLBACK GENERATOR (DETERMINISTIC)
// ==========================================

export function generateDeterministicAnalysis(analysis: InventoryAnalysis): InventoryAnalystOutput {
  const restockOrders: z.infer<typeof RestockRecommendationSchema>[] = analysis.restockPlan.map((item) => {
    const metric = analysis.metrics.find((m) => m.productId === item.productId);
    const when =
      item.daysOfStockLeft <= 1 ? "Immediately" : item.daysOfStockLeft <= 3 ? "Within 2 days" : "Within 1 week";

    return {
      productId: item.productId,
      productName: item.name,
      suggestedQty: item.allocatedQty,
      when,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
      supplierName: metric?.supplierName || "Primary Supplier",
      rationale: `Stock velocity is ${metric?.velocity7d || 0} units/day with only ${item.daysOfStockLeft} days of stock left. Reorder point is ${metric?.reorderPoint || 0}.`,
      metricsCited: {
        velocity7d: metric?.velocity7d || 0,
        daysOfStockLeft: item.daysOfStockLeft,
        reorderPoint: metric?.reorderPoint || 0,
        currentStock: item.currentStock,
      },
    };
  });

  const deadStockActions: z.infer<typeof DeadStockActionSchema>[] = analysis.deadStockList.map((item) => ({
    productId: item.productId,
    productName: item.name,
    currentStock: item.stock,
    action: item.price > 300 ? "Flash Discount 40-50%" : "Bundle with Fast Mover",
    rationale: `Zero sales recorded over 90 days. Holding ${item.stock} units with ₹${Math.round(item.stock * item.cost)} tied up in unproductive inventory.`,
    capitalLocked: Math.round(item.stock * item.cost),
  }));

  const anomalies: z.infer<typeof InventoryAnomalySchema>[] = [];

  // Anomaly 1: Rapid stockout
  const critical = analysis.metrics.filter((m) => m.daysOfStockLeft <= 2 && m.velocity7d > 5);
  for (const c of critical) {
    anomalies.push({
      type: "Rapid Stockout",
      description: `${c.name} has only ${c.daysOfStockLeft} days of inventory remaining at high run-rate (${c.velocity7d} units/day).`,
      affectedProduct: c.name,
      severity: "High",
      metricEvidence: `stock=${c.stock}, velocity7d=${c.velocity7d}, reorderPoint=${c.reorderPoint}`,
    });
  }

  // Anomaly 2: Accelerating velocity
  const surge = analysis.metrics.filter((m) => m.trendDirection === "accelerating" && m.velocity7d >= 8);
  for (const s of surge) {
    anomalies.push({
      type: "Velocity Spike",
      description: `Demand for ${s.name} surged ${Math.round((s.trendRatio - 1) * 100)}% over the 30-day baseline.`,
      affectedProduct: s.name,
      severity: "Medium",
      metricEvidence: `velocity7d=${s.velocity7d} vs velocity30d=${s.velocity30d} (trendRatio=${s.trendRatio})`,
    });
  }

  return {
    summary: `Analyzed ${analysis.totalSKUs} SKUs with budget ₹${analysis.budgetGiven.toLocaleString("en-IN")}. Recommended ${restockOrders.length} restock orders totaling ₹${analysis.budgetSpent.toLocaleString("en-IN")} and flagged ${deadStockActions.length} dead stock items for liquidation.`,
    executiveGuidance: `Immediate action required on ${critical.length} critical fast-moving items approaching stockout. Liquidate dead inventory to free up capital.`,
    budgetSummary: {
      budgetAllocated: analysis.budgetGiven,
      totalSpendRecommended: analysis.budgetSpent,
      remainingBudget: analysis.budgetRemaining,
      budgetCompliant: true,
    },
    restockOrders,
    deadStockActions,
    anomalies,
  };
}

// ==========================================
// INVENTORY ANALYST AGENT CALLER
// ==========================================

export async function runInventoryAnalystAgent(
  analysis: InventoryAnalysis,
  groqApiKey?: string
): Promise<InventoryAnalystOutput> {
  const apiKey = groqApiKey || process.env.GROQ_API_KEY;

  // If no Groq API key available, execute deterministic fallback
  if (!apiKey) {
    console.warn("GROQ_API_KEY not configured. Using deterministic InventoryAnalyst engine.");
    return generateDeterministicAnalysis(analysis);
  }

  const metricsDigest = analysis.metrics.map((m) => ({
    id: m.productId,
    name: m.name,
    category: m.category,
    price: m.price,
    cost: m.cost,
    stock: m.stock,
    leadTimeDays: m.leadTimeDays,
    velocity7d: m.velocity7d,
    velocity30d: m.velocity30d,
    trendRatio: m.trendRatio,
    trendDirection: m.trendDirection,
    daysOfStockLeft: m.daysOfStockLeft,
    reorderPoint: m.reorderPoint,
    needsRestock: m.needsRestock,
    suggestedRestockQty: m.suggestedRestockQty,
    abcClass: m.abcClass,
    isDeadStock: m.isDeadStock,
    urgency: m.urgency,
  }));

  const systemPrompt = `You are the lead InventoryAnalyst agent for a retail intelligence platform.
Analyze computed SKU metrics and return a JSON inventory plan.

STRICT CONSTRAINTS:
1. TOTAL restock order spending MUST NOT exceed the provided budget of ₹${analysis.budgetGiven}.
2. Every restock recommendation MUST explicitly cite computed metrics: velocity7d, daysOfStockLeft, reorderPoint, and currentStock.
3. Every dead-stock item (0 sales in 90d, stock > 0) MUST have an action: "Flash Discount 40-50%", "Bundle with Fast Mover", "Return to Vendor", or "Liquidate / Scrap".
4. Identify demand anomalies (e.g. Velocity Spike, Rapid Stockout, Lead Time Vulnerability).
5. Output ONLY valid JSON matching the specified schema. No markdown formatting, no prologue.`;

  const userPrompt = `INVENTORY DATA SNAPSHOT:
Business: ${analysis.businessId}
Total SKUs: ${analysis.totalSKUs}
Available Restock Budget: ₹${analysis.budgetGiven}

SKU METRICS:
${JSON.stringify(metricsDigest, null, 2)}

Produce a JSON response matching:
{
  "summary": "High-level summary of store inventory health",
  "executiveGuidance": "Actionable next steps for store owner",
  "budgetSummary": {
    "budgetAllocated": ${analysis.budgetGiven},
    "totalSpendRecommended": <number <= ${analysis.budgetGiven}>,
    "remainingBudget": <number >= 0>,
    "budgetCompliant": true
  },
  "restockOrders": [
    {
      "productId": "string",
      "productName": "string",
      "suggestedQty": <integer>,
      "when": "Immediately" | "Within 2 days" | "Within 1 week" | "Monitor",
      "unitCost": <number>,
      "totalCost": <suggestedQty * unitCost>,
      "supplierName": "string",
      "rationale": "explicit reason citing velocity7d, daysOfStockLeft, reorderPoint",
      "metricsCited": {
        "velocity7d": <number>,
        "daysOfStockLeft": <number>,
        "reorderPoint": <number>,
        "currentStock": <number>
      }
    }
  ],
  "deadStockActions": [
    {
      "productId": "string",
      "productName": "string",
      "currentStock": <integer>,
      "action": "Flash Discount 40-50%" | "Bundle with Fast Mover" | "Return to Vendor" | "Liquidate / Scrap",
      "rationale": "reason citing 0 sales in 90 days and capital locked",
      "capitalLocked": <stock * cost>
    }
  ],
  "anomalies": [
    {
      "type": "Velocity Spike" | "Lead Time Vulnerability" | "Rapid Stockout" | "Decelerating Velocity" | "Disproportionate Tied Capital",
      "description": "string",
      "affectedProduct": "string",
      "severity": "High" | "Medium" | "Low",
      "metricEvidence": "string"
    }
  ]
}`;

  // Attempt 1 with Groq
  try {
    const { content: raw1 } = await createChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 2500,
    });

    const parsed1 = JSON.parse(raw1);
    const validation1 = InventoryAnalystOutputSchema.safeParse(parsed1);

    if (validation1.success) {
      // Deterministically enforce budget constraints
      const enforced = enforceBudgetConstraints(validation1.data.restockOrders, analysis.budgetGiven);
      return {
        ...validation1.data,
        budgetSummary: {
          budgetAllocated: analysis.budgetGiven,
          totalSpendRecommended: enforced.totalSpend,
          remainingBudget: enforced.remainingBudget,
          budgetCompliant: true,
        },
        restockOrders: enforced.clampedOrders,
      };
    }

    console.warn("InventoryAnalyst validation attempt 1 failed:", validation1.error.issues);
  } catch (err: any) {
    console.warn("InventoryAnalyst attempt 1 error:", err.message);
  }

  // Attempt 2 (Retry once with feedback)
  try {
    console.log("🔄 Retrying InventoryAnalyst agent call with schema corrections...");
    const { content: raw2 } = await createChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
        {
          role: "user",
          content: "Previous output failed schema validation. Please adhere strictly to the JSON schema and ensure budget is never exceeded.",
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.05,
      max_tokens: 2500,
    });

    const parsed2 = JSON.parse(raw2);
    const validation2 = InventoryAnalystOutputSchema.safeParse(parsed2);

    if (validation2.success) {
      const enforced = enforceBudgetConstraints(validation2.data.restockOrders, analysis.budgetGiven);
      return {
        ...validation2.data,
        budgetSummary: {
          budgetAllocated: analysis.budgetGiven,
          totalSpendRecommended: enforced.totalSpend,
          remainingBudget: enforced.remainingBudget,
          budgetCompliant: true,
        },
        restockOrders: enforced.clampedOrders,
      };
    }
  } catch (err: any) {
    console.error("InventoryAnalyst attempt 2 error:", err.message);
  }

  // Fallback to deterministic model if both Groq calls fail
  console.warn("Falling back to deterministic InventoryAnalyst engine.");
  return generateDeterministicAnalysis(analysis);
}
