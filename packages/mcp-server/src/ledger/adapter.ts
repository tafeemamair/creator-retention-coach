import type {
  LedgerRepository,
  LedgerReservation,
  UserEntitlement,
} from "../../../core/src/index";
import { RedisLedgerRepository } from "../../../infra/src/index";

/**
 * Production Ledger Adapter for MCP.
 * Delegates directly to RedisLedgerRepository in packages/infra,
 * connecting MCP to the authoritative Upstash Redis & Supabase credit infrastructure.
 */
export class McpLedgerAdapter implements LedgerRepository {
  private redisLedger: LedgerRepository;

  constructor(redisLedger?: LedgerRepository) {
    this.redisLedger = redisLedger || new RedisLedgerRepository();
  }

  async reserveCredit(userId: string, scriptHash: string, platform: string): Promise<LedgerReservation> {
    return this.redisLedger.reserveCredit(userId, scriptHash, platform);
  }

  async commitCredit(reservationId: string): Promise<void> {
    return this.redisLedger.commitCredit(reservationId);
  }

  async rollbackCredit(reservationId: string): Promise<void> {
    return this.redisLedger.rollbackCredit(reservationId);
  }

  async getEntitlement(userId: string): Promise<UserEntitlement> {
    if (this.redisLedger.getEntitlement) {
      return this.redisLedger.getEntitlement(userId);
    }
    return {
      userId,
      freeClaimAvailable: true,
      freeCreditsRemaining: 1,
      paidCreditsRemaining: 0,
      totalCredits: 1,
    };
  }
}
