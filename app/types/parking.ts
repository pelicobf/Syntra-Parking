export type AppModule = "dashboard" | "entries" | "vehicles" | "shifts" | "cashCuts" | "reports" | "staff" | "settings";
export type UserRole = "super_admin" | "owner" | "admin" | "cashier" | "operator" | "viewer";
export type StayStatus = "active" | "pending_payment" | "paid" | "cancelled" | "lost_ticket";

export type ParkingLot = { id: string; businessId: string; name: string; code: string; capacity: number; active: boolean };
export type Profile = { id: string; fullName: string; role: UserRole; allowedLotIds: string[] };
export type RatePlan = { id: string; lotId: string; name: string; fractionMinutes: 15 | 30 | 45 | 60; price: number; graceMinutes: number; dailyMax: number | null; lostTicketFee: number };
export type ParkingStay = {
  id: string; folio: string; lotId: string; plate: string; make: string; model: string; color: string;
  enteredAt: string; exitedAt?: string; status: StayStatus; qrToken: string; barcodeValue: string; amountDue?: number;
};
export type Payment = { id: string; stayId: string; shiftId?: string; amount: number; method: "cash" | "card" | "transfer" | "courtesy"; paidAt: string };
export type CashRegister = { id: string; businessId: string; lotId: string; name: string; code: string; active: boolean };
export type Shift = { id: string; lotId: string; cashRegisterId?: string; openedAt: string; openedBy: string; openingCash: number; status: "open" | "closed" };
export type CashCut = { id: string; lotId: string; cashRegisterId?: string; openedAt: string; closedAt: string; openedBy: string; closedBy: string; openingCash: number; expectedCash: number; countedCash: number; notes?: string };
