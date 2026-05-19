import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { registerPushToken, revokePushToken } from "../push.js";

const router = Router();
router.use(requireAuth);

const registerSchema = z.object({
  token: z.string().regex(/^ExponentPushToken\[/).max(200),
  platform: z.enum(["ios", "android"]).optional(),
  app_version: z.string().max(40).optional(),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid push token" });
  try {
    await registerPushToken({
      userId: req.userId,
      token: parsed.data.token,
      platform: parsed.data.platform,
      appVersion: parsed.data.app_version,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("push register error:", err.message);
    res.status(500).json({ error: "could not register push token" });
  }
});

router.delete("/", async (req, res) => {
  const token = String(req.query.token || req.body?.token || "");
  if (!token) return res.status(400).json({ error: "token required" });
  try {
    await revokePushToken({ userId: req.userId, token });
    res.json({ ok: true });
  } catch (err) {
    console.error("push revoke error:", err.message);
    res.status(500).json({ error: "could not revoke" });
  }
});

export default router;
