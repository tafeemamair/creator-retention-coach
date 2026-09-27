import crypto from "node:crypto";
import type {
  LedgerRepository,
  CreditReservationResult,
} from "../../../core/src/index";

export interface RedisLedgerConfig {
  url?: string;
  token?: string;
}

export interface UserEntitlement {
  userId: string;
  freeClaimAvailable: boolean;
  freeCreditsRemaining: number;
  paidCreditsRemaining: number;
  totalCredits: number;
}

export interface UserEntitlementRecord {
  userId: string;
  freeUsed: boolean;
  freeUsedScriptHash?: string;
  paidCredits: number;
  updatedAt: number;
}

// Atomic Lua script for authenticated user credit consumption with bounded platform-aware idempotency
const ATOMIC_AUTH_CONSUME_LUA = `
local entitlementKey = KEYS[1]
local hashKey = KEYS[2]
local lockKey = KEYS[3]

local scriptHash = ARGV[1]
local now = tonumber(ARGV[2])
local reservationId = ARGV[3]

-- 1. Check bounded same-script idempotency
local alreadyAnalyzed = redis.call('GET', hashKey)
if alreadyAnalyzed then
  local rawRecord = redis.call('GET', entitlementKey)
  local record = rawRecord and cjson.decode(rawRecord) or { freeUsed = true, paidCredits = 0, updatedAt = now }
  return cjson.encode({ status = 'idempotent', record = record })
end

-- 2. Concurrency Lock
local locked = redis.call('SET', lockKey, reservationId, 'NX', 'EX', 15)
if not locked then
  return cjson.encode({ status = 'concurrency_locked' })
end

-- 3. Fetch Entitlement Record
local raw = redis.call('GET', entitlementKey)
if not raw then
  redis.call('DEL', lockKey)
  return cjson.encode({ status = 'sync_required' })
end

local record = cjson.decode(raw)

-- 4. Try Free Entitlement
if not record.freeUsed then
  record.freeUsed = true
  record.freeUsedScriptHash = scriptHash
  record.updatedAt = now
  redis.call('SET', entitlementKey, cjson.encode(record), 'EX', 2592000)
  redis.call('DEL', lockKey)
  return cjson.encode({ status = 'consumed_free', record = record })
end

-- 5. Try Paid Credits
if tonumber(record.paidCredits) > 0 then
  record.paidCredits = record.paidCredits - 1
  record.updatedAt = now
  redis.call('SET', entitlementKey, cjson.encode(record), 'EX', 2592000)
  redis.call('DEL', lockKey)
  return cjson.encode({ status = 'consumed_paid', record = record })
end

-- 6. Insufficient credits
redis.call('DEL', lockKey)
return cjson.encode({ status = 'no_credits', record = record })
`;

// Atomic Lua script for rollback
const ATOMIC_AUTH_ROLLBACK_LUA = `
local entitlementKey = KEYS[1]
local hashKey = KEYS[2]

local reservationType = ARGV[1]
local now = tonumber(ARGV[2])

redis.call('DEL', hashKey)

local raw = redis.call('GET', entitlementKey)
if not raw then
  return cjson.encode({ status = 'not_found' })
end

local record = cjson.decode(raw)

if reservationType == 'free' then
  record.freeUsed = false
  record.freeUsedScriptHash = nil
elseif reservationType == 'paid' then
  record.paidCredits = (tonumber(record.paidCredits) or 0) + 1
end

record.updatedAt = now
redis.call('SET', entitlementKey, cjson.encode(record), 'EX', 2592000)

return cjson.encode({ status = 'rolled_back', record = record })
`;

export function getUserEntitlementKey(userId: string): string {
  return `user:${userId}:entitlement`;
}

export function getUserScriptHashKey(userId: string, scriptHash: string, platform: string = "youtube_shorts"): string {
  const normPlatform = (platform || "youtube_shorts").toLowerCase().replace(/\s+/g, "_");
  return `hash:${userId}:${scriptHash}:${normPlatform}`;
}

export function getUserLockKey(userId: string): string {
  return `lock:user:${userId}`;
}

export class RedisLedgerRepository implements LedgerRepository {
  private url: string;
  private token: string;
  private memoryStore = new Map<string, string>();
  private activeReservations = new Map<string, { userId: string; scriptHash: string; platform: string; creditType: "free" | "paid" }>();

  constructor(config?: RedisLedgerConfig) {
    this.url = config?.url || process.env.UPSTASH_REDIS_REST_URL || "";
    this.token = config?.token || process.env.UPSTASH_REDIS_REST_TOKEN || "";
  }

  private isRedisConfigured(): boolean {
    return Boolean(this.url && this.token);
  }

  getUserEntitlementKey(userId: string): string {
    return getUserEntitlementKey(userId);
  }

  getUserScriptHashKey(userId: string, scriptHash: string, platform: string = "youtube_shorts"): string {
    return getUserScriptHashKey(userId, scriptHash, platform);
  }

  getUserLockKey(userId: string): string {
    return getUserLockKey(userId);
  }

  private async executeRedisCommand(command: string[]): Promise<any> {
    const res = await fetch(`${this.url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!res.ok) {
      throw new Error(`Upstash Redis HTTP error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { result?: any; error?: string };
    if (data.error) {
      throw new Error(`Upstash Redis command error: ${data.error}`);
    }
    return data.result;
  }

  async reserveCredit(userId: string, scriptHash: string, platform = "youtube_shorts"): Promise<CreditReservationResult> {
    if (!userId) {
      return { success: false, status: "sync_required", error: "Missing authenticated userId." };
    }

    const reservationId = `res_${crypto.randomUUID()}`;
    const entitlementKey = this.getUserEntitlementKey(userId);
    const hashKey = this.getUserScriptHashKey(userId, scriptHash, platform);
    const lockKey = this.getUserLockKey(userId);
    const now = Date.now();

    if (this.isRedisConfigured()) {
      try {
        const rawResult = await this.executeRedisCommand([
          "EVAL",
          ATOMIC_AUTH_CONSUME_LUA,
          "3",
          entitlementKey,
          hashKey,
          lockKey,
          scriptHash,
          now.toString(),
          reservationId,
        ]);

        const parsed = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;

        if (parsed.status === "consumed_free" || parsed.status === "consumed_paid" || parsed.status === "idempotent") {
          const creditType = parsed.status === "consumed_paid" ? "paid" : "free";
          this.activeReservations.set(reservationId, { userId, scriptHash, platform, creditType });
          return {
            success: true,
            status: parsed.status,
            reservationId,
            freeUsed: parsed.record?.freeUsed,
            creditsRemaining: parsed.record?.paidCredits,
          };
        }

        if (parsed.status === "concurrency_locked") {
          return { success: false, status: "concurrency_locked", error: "An analysis request is already in progress for your account. Please wait a moment." };
        }

        if (parsed.status === "no_credits") {
          return { success: false, status: "no_credits", error: "No analysis credits remaining. Choose a plan to unlock more reports." };
        }

        if (parsed.status === "sync_required") {
          // Initialize fresh user entitlement with 1 free analysis
          const initialRecord: UserEntitlementRecord = {
            userId,
            freeUsed: true,
            freeUsedScriptHash: scriptHash,
            paidCredits: 0,
            updatedAt: now,
          };
          await this.executeRedisCommand(["SET", entitlementKey, JSON.stringify(initialRecord), "EX", "2592000"]);
          this.activeReservations.set(reservationId, { userId, scriptHash, platform, creditType: "free" });
          return { success: true, status: "consumed_free", reservationId, freeUsed: true, creditsRemaining: 0 };
        }
      } catch (err: any) {
        console.error("[RedisLedgerRepository] Error in reserveCredit:", err);
        return { success: false, status: "sync_required", error: err?.message || "Ledger reservation failed." };
      }
    }

    // Memory store fallback (preserving identical semantics for tests / local development)
    const existingHash = this.memoryStore.get(hashKey);
    const existingRaw = this.memoryStore.get(entitlementKey);

    if (existingHash) {
      this.activeReservations.set(reservationId, { userId, scriptHash, platform, creditType: "free" });
      return { success: true, status: "idempotent", reservationId, freeUsed: true, creditsRemaining: 0 };
    }

    let record: UserEntitlementRecord;
    if (!existingRaw) {
      record = { userId, freeUsed: true, freeUsedScriptHash: scriptHash, paidCredits: 0, updatedAt: now };
      this.memoryStore.set(entitlementKey, JSON.stringify(record));
      this.activeReservations.set(reservationId, { userId, scriptHash, platform, creditType: "free" });
      return { success: true, status: "consumed_free", reservationId, freeUsed: true, creditsRemaining: 0 };
    }

    record = JSON.parse(existingRaw) as UserEntitlementRecord;
    if (!record.freeUsed) {
      record.freeUsed = true;
      record.freeUsedScriptHash = scriptHash;
      record.updatedAt = now;
      this.memoryStore.set(entitlementKey, JSON.stringify(record));
      this.activeReservations.set(reservationId, { userId, scriptHash, platform, creditType: "free" });
      return { success: true, status: "consumed_free", reservationId, freeUsed: true, creditsRemaining: record.paidCredits };
    }

    if (record.paidCredits > 0) {
      record.paidCredits -= 1;
      record.updatedAt = now;
      this.memoryStore.set(entitlementKey, JSON.stringify(record));
      this.activeReservations.set(reservationId, { userId, scriptHash, platform, creditType: "paid" });
      return { success: true, status: "consumed_paid", reservationId, freeUsed: true, creditsRemaining: record.paidCredits };
    }

    return { success: false, status: "no_credits", error: "No analysis credits remaining. Choose a plan to unlock more reports." };
  }

  async markAnalyzed(userId: string, scriptHash: string, platform = "youtube_shorts"): Promise<void> {
    const hashKey = this.getUserScriptHashKey(userId, scriptHash, platform);
    if (this.isRedisConfigured()) {
      try {
        await this.executeRedisCommand(["SET", hashKey, "1", "EX", "2592000"]);
      } catch (err) {
        console.error("[RedisLedgerRepository] Error committing script hash:", err);
      }
    } else {
      this.memoryStore.set(hashKey, "1");
    }
  }

  async commitCredit(reservationId: string): Promise<void> {
    const reservation = this.activeReservations.get(reservationId);
    if (!reservation) return;
    await this.markAnalyzed(reservation.userId, reservation.scriptHash, reservation.platform);
    this.activeReservations.delete(reservationId);
  }

  async rollbackCredit(
    arg1: string,
    arg2?: string,
    arg3?: "free" | "paid",
    arg4?: string
  ): Promise<boolean> {
    // Overload 1: rollbackCredit(reservationId)
    if (this.activeReservations.has(arg1)) {
      const reservation = this.activeReservations.get(arg1)!;
      const entitlementKey = this.getUserEntitlementKey(reservation.userId);
      const hashKey = this.getUserScriptHashKey(reservation.userId, reservation.scriptHash, reservation.platform);
      const now = Date.now();

      if (this.isRedisConfigured()) {
        try {
          await this.executeRedisCommand([
            "EVAL",
            ATOMIC_AUTH_ROLLBACK_LUA,
            "2",
            entitlementKey,
            hashKey,
            reservation.creditType,
            now.toString(),
          ]);
        } catch (err) {
          console.error("[RedisLedgerRepository] Error in rollbackCredit:", err);
        }
      } else {
        this.memoryStore.delete(hashKey);
        const existingRaw = this.memoryStore.get(entitlementKey);
        if (existingRaw) {
          const record = JSON.parse(existingRaw) as UserEntitlementRecord;
          if (reservation.creditType === "free") {
            record.freeUsed = false;
            record.freeUsedScriptHash = undefined;
          } else if (reservation.creditType === "paid") {
            record.paidCredits += 1;
          }
          record.updatedAt = now;
          this.memoryStore.set(entitlementKey, JSON.stringify(record));
        }
      }

      this.activeReservations.delete(arg1);
      return true;
    }

    // Overload 2: rollbackCredit(userId, scriptHash, reservationType, platform)
    const userId = arg1;
    const scriptHash = arg2 || "";
    const reservationType = arg3 || "free";
    const platform = arg4 || "youtube_shorts";

    const entitlementKey = this.getUserEntitlementKey(userId);
    const hashKey = this.getUserScriptHashKey(userId, scriptHash, platform);
    const now = Date.now();

    if (this.isRedisConfigured()) {
      try {
        const raw = await this.executeRedisCommand([
          "EVAL",
          ATOMIC_AUTH_ROLLBACK_LUA,
          "2",
          entitlementKey,
          hashKey,
          reservationType,
          now.toString(),
        ]);
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return parsed?.status === "rolled_back";
      } catch (err) {
        console.error("[RedisLedgerRepository] Error in rollbackCredit:", err);
        return false;
      }
    } else {
      this.memoryStore.delete(hashKey);
      const existingRaw = this.memoryStore.get(entitlementKey);
      if (existingRaw) {
        const record = JSON.parse(existingRaw) as UserEntitlementRecord;
        if (reservationType === "free") {
          record.freeUsed = false;
          record.freeUsedScriptHash = undefined;
        } else if (reservationType === "paid") {
          record.paidCredits += 1;
        }
        record.updatedAt = now;
        this.memoryStore.set(entitlementKey, JSON.stringify(record));
        return true;
      }
      return false;
    }
  }

  async getEntitlement(userId: string): Promise<UserEntitlement> {
    if (!userId) {
      throw new Error("Missing userId for entitlement check.");
    }

    const entitlementKey = this.getUserEntitlementKey(userId);

    if (this.isRedisConfigured()) {
      try {
        const raw = await this.executeRedisCommand(["GET", entitlementKey]);
        if (raw) {
          const record = (typeof raw === "string" ? JSON.parse(raw) : raw) as UserEntitlementRecord;
          const freeClaimAvailable = !record.freeUsed;
          const freeCreditsRemaining = freeClaimAvailable ? 1 : 0;
          const paidCreditsRemaining = Math.max(0, record.paidCredits || 0);

          return {
            userId,
            freeClaimAvailable,
            freeCreditsRemaining,
            paidCreditsRemaining,
            totalCredits: freeCreditsRemaining + paidCreditsRemaining,
          };
        }
      } catch (err) {
        console.error("[RedisLedgerRepository] Error getting entitlement:", err);
      }
    }

    // Memory fallback
    const raw = this.memoryStore.get(entitlementKey);
    if (raw) {
      const record = JSON.parse(raw) as UserEntitlementRecord;
      const freeClaimAvailable = !record.freeUsed;
      const freeCreditsRemaining = freeClaimAvailable ? 1 : 0;
      const paidCreditsRemaining = Math.max(0, record.paidCredits || 0);

      return {
        userId,
        freeClaimAvailable,
        freeCreditsRemaining,
        paidCreditsRemaining,
        totalCredits: freeCreditsRemaining + paidCreditsRemaining,
      };
    }

    // Default for brand new user before first consumption
    return {
      userId,
      freeClaimAvailable: true,
      freeCreditsRemaining: 1,
      paidCreditsRemaining: 0,
      totalCredits: 1,
    };
  }
}
