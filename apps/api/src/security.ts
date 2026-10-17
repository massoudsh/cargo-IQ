import type { RequestHandler } from "express";

declare global {
  namespace Express {
    interface Request {
      tenantId: string;
    }
  }
}

const minuteMs = 60_000;

export function tenantGuard(): RequestHandler {
  const configuredKeys = process.env.CARGOIQ_API_KEYS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) ?? [];

  return (req, res, next) => {
    if (configuredKeys.length === 0) {
      req.tenantId = "development";
      next();
      return;
    }

    const apiKey = req.header("x-api-key");
    if (!apiKey || !configuredKeys.includes(apiKey)) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "کلید API معتبر نیست." } });
      return;
    }

    req.tenantId = `key:${configuredKeys.indexOf(apiKey) + 1}`;
    next();
  };
}

export function rateLimit(maxRequests = 120): RequestHandler {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const key = `${req.tenantId}:${req.ip}`;
    const now = Date.now();
    const current = requests.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + minuteMs } : current;
    bucket.count += 1;
    requests.set(key, bucket);

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - bucket.count));
    if (bucket.count > maxRequests) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      res.status(429).json({ error: { code: "RATE_LIMITED", message: "تعداد درخواست‌ها بیش از حد مجاز است." } });
      return;
    }
    next();
  };
}
