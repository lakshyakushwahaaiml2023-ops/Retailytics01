import { runInventoryUnitTests } from "./inventoryEngine.test.ts";

try {
  runInventoryUnitTests();
  process.exit(0);
} catch (e) {
  console.error("Test execution failed:", e);
  process.exit(1);
}
