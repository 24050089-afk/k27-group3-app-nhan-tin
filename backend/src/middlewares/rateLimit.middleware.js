const createRateLimit = ({
  windowMs = 60_000,
  max = 30,
  message = 'Qua nhieu yeu cau. Vui long thu lai sau.',
  keyGenerator = (req) => req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`,
} = {}) => {
  const buckets = new Map();
  let lastSweepAt = 0;

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastSweepAt >= windowMs) {
      for (const [key, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
      lastSweepAt = now;
    }

    const identity = keyGenerator(req);
    const current = buckets.get(identity);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;
    bucket.count += 1;
    buckets.set(identity, bucket);

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ success: false, message });
    }

    return next();
  };
};

module.exports = { createRateLimit };
