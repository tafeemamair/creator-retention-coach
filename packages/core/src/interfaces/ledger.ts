export interface CreditReservationResult {
  success: boolean;
  status: "consumed_free" | "consumed_paid" | "idempotent" | "no_credits" | "concurrency_locked" | "sync_required";
  reservationId?: string;
  error?: string;
  freeUsed?: boolean;
  creditsRemaining?: number;
}

export interface LedgerRepository {
  reserveCredit(userId: string, scriptHash: string, platform?: string): Promise<CreditReservationResult>;
  rollbackCredit(userId: string, scriptHash: string, reservationType: "free" | "paid", platform?: string): Promise<boolean>;
  markAnalyzed(userId: string, scriptHash: string, platform?: string): Promise<void>;
}
