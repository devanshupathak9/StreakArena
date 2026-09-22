import { Router } from "express";
import { prisma } from "../db.js";
import { loadUser, requireAuth } from "../auth.js";
import { isPlatformId, platformCatalog, publicAccount, validateHandle } from "../platforms.js";

export const profilesRouter = Router();

profilesRouter.use(requireAuth, loadUser);

/** The platforms a handle can be linked to — static, but it keeps the client in sync. */
profilesRouter.get("/platforms", (req, res) => {
  res.json({ platforms: platformCatalog() });
});

profilesRouter.get("/profiles", async (req, res) => {
  const accounts = await prisma.platformAccount.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "asc" },
  });
  res.json({ profiles: accounts.map(publicAccount) });
});

/** Link or re-link one platform. One handle per platform, so this is an upsert. */
profilesRouter.put("/profiles/:platform", async (req, res) => {
  const { platform } = req.params;
  if (!isPlatformId(platform)) return res.status(404).json({ error: "Unknown platform" });

  // Tolerate a pasted profile URL by keeping only its last path segment.
  const raw = String(req.body?.handle ?? "").trim();
  const handle = raw.replace(/\/+$/, "").split("/").pop() ?? "";

  const problem = validateHandle(platform, handle);
  if (problem) return res.status(400).json({ error: problem });

  const account = await prisma.platformAccount.upsert({
    where: { userId_platform: { userId: req.user.id, platform } },
    create: { userId: req.user.id, platform, handle },
    update: { handle },
  });
  res.json({ profile: publicAccount(account) });
});

profilesRouter.delete("/profiles/:platform", async (req, res) => {
  // Scoped by userId, so another user's row simply matches nothing.
  const { count } = await prisma.platformAccount.deleteMany({
    where: { userId: req.user.id, platform: req.params.platform },
  });
  if (!count) return res.status(404).json({ error: "That profile isn't linked" });
  res.json({ ok: true });
});
