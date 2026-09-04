import "dotenv/config";
import { sendSimulatedDelivery } from "../src/lib/simulate.js";

// Usage:
//   npm run simulate            send a delivery (fixed id by default)
//   npm run simulate            run it again with no flags to see the same
//                                delivery id get deduped, exactly like a
//                                real webhook retry would
//   npm run simulate -- --new   use a fresh random delivery id instead

const useNewId = process.argv.includes("--new");
const result = await sendSimulatedDelivery(useNewId);

console.log(`-> POST /webhooks/github  [${result.status}]  delivery=${result.deliveryId}`);
console.log(result.body);

if (!useNewId) {
  console.log("\nRun `npm run simulate` again (same command) to see duplicate handling.");
  console.log("Or run `npm run simulate -- --new` for a fresh delivery id.");
}
