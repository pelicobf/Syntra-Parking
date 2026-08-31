import type { ParkingStay, RatePlan } from "@/app/types/parking";

export function normalizePlate(value: string) { return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10); }
export function displayPlate(value: string) { const p = normalizePlate(value); return p.length > 6 ? `${p.slice(0,3)}-${p.slice(3,6)}-${p.slice(6)}` : p; }
export function minutesSince(iso: string, now = Date.now()) { return Math.max(1, Math.ceil((now - new Date(iso).getTime()) / 60000)); }
export function calculateFee(enteredAt: string, rate: RatePlan, now = Date.now()) {
  if (rate.pricingMode === "free_time") return rate.flatPrice ?? 0;
  const billable = Math.max(0, minutesSince(enteredAt, now) - rate.graceMinutes);
  const amount = Math.ceil(billable / rate.fractionMinutes) * rate.price;
  return rate.dailyMax ? Math.min(amount, rate.dailyMax) : amount;
}
export function makeStay(plate: string, lotId: string, index: number): ParkingStay {
  const token = crypto.randomUUID(); const folio = `P-${String(850 + index).padStart(6, "0")}`;
  return { id: crypto.randomUUID(), folio, lotId, plate: displayPlate(plate), make: "Sin identificar", model: "Vehículo", color: "—", enteredAt: new Date().toISOString(), status: "active", qrToken: token, barcodeValue: folio.replace(/\D/g, "") };
}
