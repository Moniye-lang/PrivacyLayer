import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || '';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    });

    redisClient.on('error', (err) => {
      console.warn('[Redis] Connection warning, using fallback cache:', err.message);
    });
  }

  return redisClient;
}

// In-Memory Rate Limiting Token Bucket Fallback
const localTokenBucket = new Map<string, { count: number; expiresAt: number }>();

export async function checkRateLimit(
  key: string,
  limit: number = 100,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.pexpire(key, windowMs);
      }
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
      };
    } catch {
      // Fall through to memory bucket
    }
  }

  // Local Memory Rate Limiter
  const now = Date.now();
  const bucket = localTokenBucket.get(key);

  if (!bucket || now > bucket.expiresAt) {
    localTokenBucket.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
  };
}
