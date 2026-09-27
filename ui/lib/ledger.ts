import { Redis } from "@upstash/redis";
import crypto from "crypto";

export type PlanType = "single" | "pack5" | "free" | string;

export interface CreditRecord {
  orderId: string;
  plan: PlanType;
  creditsRemaining: number;
  totalCredits: number;
  usedHashes: string[];
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface FreeRecord {
  anonId: string;
  usedAt: number;
  usedScriptHash: string;
  expiresAt: number;
}

export interface UserEntitlementRecord {
  userId: string;
  freeUsed: boolean;
  freeUsedScriptHash?: string;
  paidCredits: number;
  updatedAt: number;
}

export type ConsumeResult =
  | { success: true; status: "consumed"; record: CreditRecord }
  | { success: true; status: "idempotent"; record: CreditRecord }
  | { success: false; status: "not_found"; error: string }
  | { success: false; status: "expired"; error: string; record?: CreditRecord }
  | { success: false; status: "no_credits"; error: string; record: CreditRecord };

export type FreeConsumeResult =
  | { success: true; status: "granted"; record: FreeRecord }
  | { success: true; status: "idempotent"; record: FreeRecord }
  | { success: false; status: "already_used"; error: string; record: FreeRecord };

export type AuthConsumeResult =
  | { success: true; status: "consumed_free" | "consumed_paid" | "idempotent"; reservationId: string; record: UserEntitlementRecord }
  | { success: false; status: "no_credits" | "free_already_used" | "concurrency_locked" | "sync_required"; error: string; record?: UserEntitlementRecord };

// Atomic Lua script for paid credit consumption and same-script idempotency (Phase 1 legacy order ledger)
const ATOMIC_CONSUME_LUA = `
local key = KEYS[1]
local scriptHash = ARGV[1]
local now = tonumber(ARGV[2])

local raw = redis.call('GET', key)
if not raw then
  return cjson.encode({ status = 'not_found' })
end

local record = cjson.decode(raw)

if now > tonumber(record.expiresAt) then
  return cjson.encode({ status = 'expired', record = record })
end

-- Check idempotency: has this exact script hash already been analyzed?
local hashes = record.usedHashes or {}
for i = 1, #hashes do
  if hashes[i] == scriptHash then
    return cjson.encode({ status = 'idempotent', record = record })
  end
end

-- Check remaining balance
if tonumber(record.creditsRemaining) <= 0 then
  return cjson.encode({ status = 'no_credits', record = record })
end

-- Atomically deduct 1 credit and register the script hash
record.creditsRemaining = record.creditsRemaining - 1
table.insert(hashes, scriptHash)
record.usedHashes = hashes
record.updatedAt = now

local updatedJson = cjson.encode(record)
local ttl = redis.call('TTL', key)

if ttl > 0 then
  redis.call('SET', key, updatedJson, 'EX', ttl)
else
  redis.call('SET', key, updatedJson)
end

return cjson.encode({ status = 'consumed', record = record })
`;

// Atomic Lua script for 1 free full analysis per anonymous user
const ATOMIC_FREE_CONSUME_LUA = `
local key = KEYS[1]
local scriptHash = ARGV[1]
local now = tonumber(ARGV[2])
local anonId = ARGV[3]

local raw = redis.call('GET', key)
if raw then
  local record = cjson.decode(raw)
  if record.usedScriptHash == scriptHash then
    return cjson.encode({ status = 'idempotent', record = record })
  else
    return cjson.encode({ status = 'already_used', record = record })
  end
end

local newRecord = {
  anonId = anonId,
  usedAt = now,
  usedScriptHash = scriptHash,
  expiresAt = now + (30 * 24 * 60 * 60 * 1000)
}

redis.call('SET', key, cjson.encode(newRecord), 'EX', 2592000)
return cjson.encode({ status = 'granted', record = newRecord })
`;

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

// Atomic Lua script for authenticated user rollback on AI/DB error
const ATOMIC_AUTH_ROLLBACK_LUA = `
local entitlementKey = KEYS[1]
local hashKey = KEYS[2]

local reservationType = ARGV[1]
local now = tonumber(ARGV[2])

local raw = redis.call('GET', entitlementKey)
if not raw then
  return cjson.encode({ status = 'not_found' })
end

local record = cjson.decode(raw)

if reservationType == 'free' then
  record.freeUsed = false
  record.freeUsedScriptHash = nil
  record.updatedAt = now
  redis.call('SET', entitlementKey, cjson.encode(record), 'EX', 2592000)
elseif reservationType == 'paid' then
  record.paidCredits = record.paidCredits + 1
  record.updatedAt = now
  redis.call('SET', entitlementKey, cjson.encode(record), 'EX', 2592000)
end

redis.call('DEL', hashKey)
return cjson.encode({ status = 'rolled_back', record = record })
`;

// In-memory fallback for local development or testing when Redis is not configured
const memoryLedger = new Map<string, string>();

let redisClient: Redis | null = null;
let isRedisConfigured: boolean | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (isRedisConfigured === null) {
      console.warn("Upstash Redis is not configured. Falling back to local in-memory ledger.");
      isRedisConfigured = false;
    }
    return null;
  }

  try {
    redisClient = new Redis({ url, token });
    isRedisConfigured = true;
    return redisClient;
  } catch (err) {
    console.warn("Failed to initialize Redis client:", err);
    return null;
  }
}

export function getOrderKey(orderId: string): string {
  return `order:${orderId}`;
}

export function getFreeKey(anonId: string): string {
  return `free_user:${anonId}`;
}

export function getUserEntitlementKey(userId: string): string {
  return `user:${userId}:entitlement`;
}

export function getUserScriptHashKey(userId: string, scriptHash: string, platform: string = "YouTube Shorts"): string {
  const normPlatform = platform.toLowerCase().replace(/\s+/g, "_");
  return `hash:${userId}:${scriptHash}:${normPlatform}`;
}

export function getUserLockKey(userId: string): string {
  return `lock:user:${userId}`;
}

/**
 * Initialize a credit record in Redis for a verified order (Phase 1 legacy support).
 */
export async function initializeCreditRecord(
  orderId: string,
  plan: PlanType,
  totalCredits: number,
  validityDays: number
): Promise<CreditRecord> {
  if (!orderId) {
    throw new Error("Cannot initialize credit record: Missing orderId.");
  }
  if (totalCredits <= 0) {
    throw new Error("Cannot initialize credit record: totalCredits must be greater than 0.");
  }
  if (validityDays <= 0) {
    throw new Error("Cannot initialize credit record: validityDays must be greater than 0.");
  }

  const redis = getRedisClient();
  const now = Date.now();
  const validitySeconds = Math.round(validityDays * 24 * 60 * 60);
  const expiresAt = now + validitySeconds * 1000;

  const record: CreditRecord = {
    orderId,
    plan,
    creditsRemaining: totalCredits,
    totalCredits,
    usedHashes: [],
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  const key = getOrderKey(orderId);
  const serialized = JSON.stringify(record);

  if (redis) {
    await redis.set(key, serialized, { ex: validitySeconds });
  } else {
    memoryLedger.set(key, serialized);
  }

  return record;
}

/**
 * Retrieve a credit record from Redis or memory (Phase 1 legacy support).
 */
export async function getCreditRecord(orderId: string): Promise<CreditRecord | null> {
  if (!orderId) return null;

  const redis = getRedisClient();
  const key = getOrderKey(orderId);

  let raw: string | CreditRecord | null = null;
  if (redis) {
    raw = await redis.get<string | CreditRecord>(key);
  } else {
    raw = memoryLedger.get(key) || null;
  }

  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as CreditRecord;
    } catch {
      return null;
    }
  }

  return raw as CreditRecord;
}

/**
 * Atomically consume 1 paid credit for an order (Phase 1 legacy support).
 */
export async function consumeCredit(
  orderId: string,
  scriptHash: string
): Promise<ConsumeResult> {
  if (!orderId) {
    return { success: false, status: "not_found", error: "Missing orderId." };
  }
  if (!scriptHash) {
    throw new Error("Cannot consume credit: Missing scriptHash.");
  }

  const redis = getRedisClient();
  const key = getOrderKey(orderId);
  const now = Date.now();

  if (redis) {
    try {
      const rawResult = (await redis.eval(
        ATOMIC_CONSUME_LUA,
        [key],
        [scriptHash, now.toString()]
      )) as string;

      const parsed = (typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult) as {
        status: "consumed" | "idempotent" | "not_found" | "expired" | "no_credits";
        record?: CreditRecord;
      };

      switch (parsed.status) {
        case "consumed":
          return { success: true, status: "consumed", record: parsed.record! };
        case "idempotent":
          return { success: true, status: "idempotent", record: parsed.record! };
        case "expired":
          return {
            success: false,
            status: "expired",
            error: "Credit pack has expired.",
            record: parsed.record,
          };
        case "no_credits":
          return {
            success: false,
            status: "no_credits",
            error: "No credits remaining.",
            record: parsed.record!,
          };
        case "not_found":
        default:
          return {
            success: false,
            status: "not_found",
            error: `No credit record found for order ${orderId}.`,
          };
      }
    } catch (error) {
      console.error(`Credit consumption error for order ${orderId}:`, error);
      throw error;
    }
  }

  // Memory fallback logic
  const existingRaw = memoryLedger.get(key);
  if (!existingRaw) {
    return { success: false, status: "not_found", error: "Order not found." };
  }
  const record = JSON.parse(existingRaw) as CreditRecord;
  if (now > record.expiresAt) {
    return { success: false, status: "expired", error: "Credit pack expired.", record };
  }
  if (record.usedHashes.includes(scriptHash)) {
    return { success: true, status: "idempotent", record };
  }
  if (record.creditsRemaining <= 0) {
    return { success: false, status: "no_credits", error: "No credits remaining.", record };
  }
  record.creditsRemaining -= 1;
  record.usedHashes.push(scriptHash);
  record.updatedAt = now;
  memoryLedger.set(key, JSON.stringify(record));
  return { success: true, status: "consumed", record };
}

// Atomic Lua script to restore 1 credit if analysis generation fails after consumption (Phase 1 legacy)
const ATOMIC_ROLLBACK_LUA = `
local key = KEYS[1]
local scriptHash = ARGV[1]
local now = tonumber(ARGV[2])

local raw = redis.call('GET', key)
if not raw then
  return cjson.encode({ status = 'not_found' })
end

local record = cjson.decode(raw)
local hashes = record.usedHashes or {}
local foundIndex = nil

for i = 1, #hashes do
  if hashes[i] == scriptHash then
    foundIndex = i
    break
  end
end

if not foundIndex then
  return cjson.encode({ status = 'not_found_in_hashes', record = record })
end

table.remove(hashes, foundIndex)
record.usedHashes = hashes
record.creditsRemaining = math.min(tonumber(record.totalCredits), tonumber(record.creditsRemaining) + 1)
record.updatedAt = now

local updatedJson = cjson.encode(record)
local ttl = redis.call('TTL', key)

if ttl > 0 then
  redis.call('SET', key, updatedJson, 'EX', ttl)
else
  redis.call('SET', key, updatedJson)
end

return cjson.encode({ status = 'rolled_back', record = record })
`;

/**
 * Atomically restore 1 credit if analysis generation unexpectedly fails after consumption (Phase 1 legacy).
 */
export async function rollbackCredit(
  orderId: string,
  scriptHash: string
): Promise<{ success: boolean; status: string; record?: CreditRecord }> {
  if (!orderId || !scriptHash) {
    return { success: false, status: "invalid_arguments" };
  }

  const redis = getRedisClient();
  const key = getOrderKey(orderId);
  const now = Date.now();

  if (redis) {
    try {
      const rawResult = (await redis.eval(
        ATOMIC_ROLLBACK_LUA,
        [key],
        [scriptHash, now.toString()]
      )) as string;

      const parsed = (typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult) as {
        status: "rolled_back" | "not_found" | "not_found_in_hashes";
        record?: CreditRecord;
      };

      if (parsed.status === "rolled_back") {
        return { success: true, status: "rolled_back", record: parsed.record };
      }
      return { success: false, status: parsed.status, record: parsed.record };
    } catch (error) {
      console.error(`Credit rollback error for order ${orderId}:`, error);
      throw error;
    }
  }

  const existingRaw = memoryLedger.get(key);
  if (!existingRaw) return { success: false, status: "not_found" };
  const record = JSON.parse(existingRaw) as CreditRecord;
  const idx = record.usedHashes.indexOf(scriptHash);
  if (idx >= 0) {
    record.usedHashes.splice(idx, 1);
    record.creditsRemaining = Math.min(record.totalCredits, record.creditsRemaining + 1);
    record.updatedAt = now;
    memoryLedger.set(key, JSON.stringify(record));
    return { success: true, status: "rolled_back", record };
  }
  return { success: false, status: "not_found_in_hashes", record };
}

/**
 * Atomically check and consume 1 free analysis for an anonymous user (Phase 1).
 */
export async function consumeFreeEntitlement(
  anonId: string,
  scriptHash: string
): Promise<FreeConsumeResult> {
  if (!anonId || !scriptHash) {
    return { success: false, status: "already_used", error: "Missing anonymous user identification.", record: { anonId: "", usedAt: 0, usedScriptHash: "", expiresAt: 0 } };
  }

  const redis = getRedisClient();
  const key = getFreeKey(anonId);
  const now = Date.now();

  if (redis) {
    try {
      const rawResult = (await redis.eval(
        ATOMIC_FREE_CONSUME_LUA,
        [key],
        [scriptHash, now.toString(), anonId]
      )) as string;

      const parsed = (typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult) as {
        status: "granted" | "idempotent" | "already_used";
        record: FreeRecord;
      };

      if (parsed.status === "granted" || parsed.status === "idempotent") {
        return { success: true, status: parsed.status, record: parsed.record };
      }
      return {
        success: false,
        status: "already_used",
        error: "You have used your 1 free full analysis report. Choose a plan to unlock more reports.",
        record: parsed.record,
      };
    } catch (err) {
      console.error(`Free entitlement evaluation error for ${anonId}:`, err);
      throw err;
    }
  }

  // Memory fallback
  const existingRaw = memoryLedger.get(key);
  if (existingRaw) {
    const record = JSON.parse(existingRaw) as FreeRecord;
    if (record.usedScriptHash === scriptHash) {
      return { success: true, status: "idempotent", record };
    }
    return {
      success: false,
      status: "already_used",
      error: "You have used your 1 free full analysis report. Choose a plan to unlock more reports.",
      record,
    };
  }

  const record: FreeRecord = {
    anonId,
    usedAt: now,
    usedScriptHash: scriptHash,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
  };
  memoryLedger.set(key, JSON.stringify(record));
  return { success: true, status: "granted", record };
}

/**
 * Rollback free entitlement if analysis failed during AI execution.
 */
export async function rollbackFreeEntitlement(anonId: string): Promise<boolean> {
  if (!anonId) return false;

  const redis = getRedisClient();
  const key = getFreeKey(anonId);

  try {
    if (redis) {
      await redis.del(key);
    } else {
      memoryLedger.delete(key);
    }
    return true;
  } catch (err) {
    console.error(`Failed to rollback free entitlement for ${anonId}:`, err);
    return false;
  }
}

/**
 * Retrieve free entitlement record if exists.
 */
export async function getFreeEntitlementRecord(anonId: string): Promise<FreeRecord | null> {
  if (!anonId) return null;

  const redis = getRedisClient();
  const key = getFreeKey(anonId);

  let raw: string | FreeRecord | null = null;
  if (redis) {
    raw = await redis.get<string | FreeRecord>(key);
  } else {
    raw = memoryLedger.get(key) || null;
  }

  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as FreeRecord;
    } catch {
      return null;
    }
  }

  return raw as FreeRecord;
}

// ==============================================================================
// PHASE 2A: AUTHENTICATED CREATOR LEDGER (BOUNDED & RECONCILABLE)
// ==============================================================================

/**
 * Synchronize or initialize an authenticated user's entitlement ledger in Redis from PostgreSQL state.
 */
export async function syncAuthUserLedger(
  userId: string,
  state: { freeUsed: boolean; paidCredits: number; freeUsedScriptHash?: string }
): Promise<UserEntitlementRecord> {
  if (!userId) {
    throw new Error("Missing userId for ledger sync.");
  }

  const redis = getRedisClient();
  const key = getUserEntitlementKey(userId);
  const now = Date.now();

  const record: UserEntitlementRecord = {
    userId,
    freeUsed: Boolean(state.freeUsed),
    freeUsedScriptHash: state.freeUsedScriptHash,
    paidCredits: Math.max(0, state.paidCredits),
    updatedAt: now,
  };

  const serialized = JSON.stringify(record);

  if (redis) {
    await redis.set(key, serialized, { ex: 2592000 }); // 30-day TTL hot cache
  } else {
    memoryLedger.set(key, serialized);
  }

  return record;
}

/**
 * Retrieve an authenticated user's hot entitlement record from Redis.
 */
export async function getAuthUserLedger(userId: string): Promise<UserEntitlementRecord | null> {
  if (!userId) return null;

  const redis = getRedisClient();
  const key = getUserEntitlementKey(userId);

  let raw: string | UserEntitlementRecord | null = null;
  if (redis) {
    raw = await redis.get<string | UserEntitlementRecord>(key);
  } else {
    raw = memoryLedger.get(key) || null;
  }

  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as UserEntitlementRecord;
    } catch {
      return null;
    }
  }

  return raw as UserEntitlementRecord;
}

/**
 * Atomically check and reserve 1 free analysis or 1 paid credit for an authenticated user.
 */
export async function consumeAuthUserCredit(
  userId: string,
  scriptHash: string,
  platform: string = "YouTube Shorts"
): Promise<AuthConsumeResult> {
  if (!userId || !scriptHash) {
    return { success: false, status: "sync_required", error: "Missing required arguments for credit consumption." };
  }

  const redis = getRedisClient();
  const entitlementKey = getUserEntitlementKey(userId);
  const hashKey = getUserScriptHashKey(userId, scriptHash, platform);
  const lockKey = getUserLockKey(userId);
  const now = Date.now();
  const reservationId = `res_${crypto.randomUUID()}`;

  if (redis) {
    try {
      const rawResult = (await redis.eval(
        ATOMIC_AUTH_CONSUME_LUA,
        [entitlementKey, hashKey, lockKey],
        [scriptHash, now.toString(), reservationId]
      )) as string;

      const parsed = (typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult) as {
        status: "consumed_free" | "consumed_paid" | "idempotent" | "no_credits" | "concurrency_locked" | "sync_required";
        record?: UserEntitlementRecord;
      };

      if (parsed.status === "consumed_free" || parsed.status === "consumed_paid" || parsed.status === "idempotent") {
        return {
          success: true,
          status: parsed.status,
          reservationId,
          record: parsed.record || { userId, freeUsed: true, paidCredits: 0, updatedAt: now },
        };
      }

      if (parsed.status === "concurrency_locked") {
        return {
          success: false,
          status: "concurrency_locked",
          error: "An analysis request is already in progress for your account. Please wait a moment.",
        };
      }

      if (parsed.status === "sync_required") {
        return {
          success: false,
          status: "sync_required",
          error: "Account state sync required from database.",
        };
      }

      return {
        success: false,
        status: "no_credits",
        error: "No analysis credits remaining. Choose a plan to unlock more reports.",
        record: parsed.record,
      };
    } catch (err) {
      console.error(`Authenticated credit consumption error for ${userId}:`, err);
      throw err;
    }
  }

  // Memory fallback for local testing
  const existingHash = memoryLedger.get(hashKey);
  const existingRaw = memoryLedger.get(entitlementKey);
  if (existingHash) {
    const record = existingRaw ? (JSON.parse(existingRaw) as UserEntitlementRecord) : { userId, freeUsed: true, paidCredits: 0, updatedAt: now };
    return { success: true, status: "idempotent", reservationId, record };
  }

  if (!existingRaw) {
    return { success: false, status: "sync_required", error: "Account state sync required." };
  }

  const record = JSON.parse(existingRaw) as UserEntitlementRecord;
  if (!record.freeUsed) {
    record.freeUsed = true;
    record.freeUsedScriptHash = scriptHash;
    record.updatedAt = now;
    memoryLedger.set(entitlementKey, JSON.stringify(record));
    return { success: true, status: "consumed_free", reservationId, record };
  }

  if (record.paidCredits > 0) {
    record.paidCredits -= 1;
    record.updatedAt = now;
    memoryLedger.set(entitlementKey, JSON.stringify(record));
    return { success: true, status: "consumed_paid", reservationId, record };
  }

  return {
    success: false,
    status: "no_credits",
    error: "No analysis credits remaining.",
    record,
  };
}

/**
 * Register a script hash as analyzed in the hot idempotency cache after DB commit succeeds.
 */
export async function markScriptAnalyzedInHotCache(
  userId: string,
  scriptHash: string,
  platform: string = "YouTube Shorts"
): Promise<void> {
  const redis = getRedisClient();
  const hashKey = getUserScriptHashKey(userId, scriptHash, platform);

  if (redis) {
    await redis.set(hashKey, "1", { ex: 2592000 }); // 30-day bounded TTL
  } else {
    memoryLedger.set(hashKey, "1");
  }
}

/**
 * Atomically rollback a reserved credit if AI or DB write fails.
 */
export async function rollbackAuthUserCredit(
  userId: string,
  scriptHash: string,
  reservationType: "free" | "paid",
  platform: string = "YouTube Shorts"
): Promise<{ success: boolean; status: string; record?: UserEntitlementRecord }> {
  if (!userId || !scriptHash) {
    return { success: false, status: "invalid_arguments" };
  }

  const redis = getRedisClient();
  const entitlementKey = getUserEntitlementKey(userId);
  const hashKey = getUserScriptHashKey(userId, scriptHash, platform);
  const now = Date.now();

  if (redis) {
    try {
      const rawResult = (await redis.eval(
        ATOMIC_AUTH_ROLLBACK_LUA,
        [entitlementKey, hashKey],
        [reservationType, now.toString()]
      )) as string;

      const parsed = (typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult) as {
        status: "rolled_back" | "not_found";
        record?: UserEntitlementRecord;
      };

      return {
        success: parsed.status === "rolled_back",
        status: parsed.status,
        record: parsed.record,
      };
    } catch (err) {
      console.error(`Rollback error for user ${userId}:`, err);
      throw err;
    }
  }

  // Memory fallback
  const existingRaw = memoryLedger.get(entitlementKey);
  memoryLedger.delete(hashKey);
  if (!existingRaw) return { success: false, status: "not_found" };

  const record = JSON.parse(existingRaw) as UserEntitlementRecord;
  if (reservationType === "free") {
    record.freeUsed = false;
    record.freeUsedScriptHash = undefined;
  } else if (reservationType === "paid") {
    record.paidCredits += 1;
  }
  record.updatedAt = now;
  memoryLedger.set(entitlementKey, JSON.stringify(record));

  return { success: true, status: "rolled_back", record };
}
