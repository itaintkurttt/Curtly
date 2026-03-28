import { Router, type IRouter, type Request, type Response } from "express";
import { db, reviewersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { SaveReviewerBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reviewers", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const reviewers = await db
    .select()
    .from(reviewersTable)
    .where(eq(reviewersTable.userId, req.user.id))
    .orderBy(desc(reviewersTable.createdAt));

  res.json({ reviewers });
});

router.post("/reviewers", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = SaveReviewerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body." });
    return;
  }

  const { title, sourceText, content } = parsed.data;

  const [reviewer] = await db
    .insert(reviewersTable)
    .values({ userId: req.user.id, title, sourceText, content })
    .returning();

  res.status(201).json({ reviewer });
});

router.delete("/reviewers/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid reviewer id." });
    return;
  }

  const [deleted] = await db
    .delete(reviewersTable)
    .where(and(eq(reviewersTable.id, id), eq(reviewersTable.userId, req.user.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Reviewer not found." });
    return;
  }

  res.status(204).send();
});

export default router;
