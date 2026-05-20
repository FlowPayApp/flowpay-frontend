import { api } from "../client";
import { paymentsApiUrl } from "./config";

export async function recordPayment(chargeId: number, amount: number) {
  await api.post(paymentsApiUrl("/api/payments"), { charge_id: chargeId, amount });
}
