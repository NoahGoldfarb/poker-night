// lib/redis.ts
import { Redis } from '@upstash/redis';

let redis: Redis;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

export const GAME_TTL = 60 * 60 * 6; // 6 hours

export function gameKey(gameId: string): string {
  return `poker:game:${gameId}`;
}

export function codeKey(code: string): string {
  return `poker:code:${code}`;
}
