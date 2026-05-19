import { Router } from "express";
import { getUserByUnsubscribeToken, updateUser } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const token = String(req.query.t || req.query.token || "");
  if (!token) return res.status(400).json({ error: "missing token" });

  const user = await getUserByUnsubscribeToken(token);
  if (!user) return res.status(404).json({ error: "invalid token" });

  if (user.status !== "unsubscribed") {
    await updateUser(user.id, { status: "unsubscribed" });
  }
  res.json({ ok: true, email: user.email });
});

export default router;
