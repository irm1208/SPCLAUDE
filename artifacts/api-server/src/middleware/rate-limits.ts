import rateLimit from "express-rate-limit";

// NOTE: Replit collapses all user traffic to a single egress IP, so all limits
// are shared across *all* concurrent users. Values are sized to accommodate
// realistic combined traffic without tripping on normal dev/admin usage.
// 100 000 per 15 min ≈ 6 666/min — enough headroom for hot-reload storms
// during development plus normal shoppers + admin activity.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down." },
});

// Shared-IP note: all users share one egress IP on Replit.
// 20 000 per 15 min — generous limit for Replit's shared-IP model while
// still blocking automated abuse on sensitive endpoints.
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts — please try again later." },
});

export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests." },
});

// Brute-force protection on admin auth-check.
// Only genuine auth failures (4xx) count toward the limit.
// 5xx responses (e.g. during server restarts) are excluded so transient
// API downtime does not burn through the window.
// 5000 failed attempts per 15 min is generous for Replit's shared IP while
// still guarding against automated credential stuffing.
export const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip counting: 2xx (success) and 5xx (server error / restart) — only 4xx auth failures count.
  requestWasSuccessful: (_req, res) => res.statusCode < 400 || res.statusCode >= 500,
  skipSuccessfulRequests: true,
  message: { error: "Too many auth attempts — please try again in 15 minutes." },
});

// Order creation: 500 orders per hour across all users (Replit shared IP)
export const orderCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many orders placed — please try again later." },
});

// Feedback submission: 200 submissions per hour across all users (Replit shared IP)
export const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions — please try again later." },
});
