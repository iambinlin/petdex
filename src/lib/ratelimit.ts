import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const submitRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "24 h"),
  prefix: "petdex:submit",
  analytics: true,
});

// Withdrawals from /my-pets — generous so retries don't lock you out, but
// stops a malicious automated loop.
export const withdrawRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "10 m"),
  prefix: "petdex:withdraw",
});

// Claim attempts — anti-bruteforce for the cross-account flow even though
// the verified-email check already blocks the actual data move.
export const claimRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  prefix: "petdex:claim",
});
