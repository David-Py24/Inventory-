import { Router } from 'express';
import { and, eq, lte, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { products } from '../db/schema.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

export const productsRouter = Router();

productsRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(products).orderBy(products.name);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

productsRouter.get('/low-stock', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(products)
      .where(lte(products.currentQty, products.reorderLevel));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

productsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { skuCode, name, category, costPrice, retailPrice, currentQty, reorderLevel, isPinnedRestock } =
      req.body ?? {};
    if (!name) throw new HttpError(400, 'name is required');

    const [created] = await db
      .insert(products)
      .values({
        skuCode: skuCode ?? null,
        name,
        category: category ?? 'General',
        costPrice: String(costPrice ?? 0),
        retailPrice: String(retailPrice ?? 0),
        currentQty: String(currentQty ?? 0),
        reorderLevel: String(reorderLevel ?? 5),
        isPinnedRestock: Boolean(isPinnedRestock ?? false),
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

productsRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};
    const [updated] = await db
      .update(products)
      .set({
        ...(body.skuCode !== undefined ? { skuCode: body.skuCode } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.costPrice !== undefined ? { costPrice: String(body.costPrice) } : {}),
        ...(body.retailPrice !== undefined ? { retailPrice: String(body.retailPrice) } : {}),
        ...(body.currentQty !== undefined ? { currentQty: String(body.currentQty) } : {}),
        ...(body.reorderLevel !== undefined ? { reorderLevel: String(body.reorderLevel) } : {}),
        ...(body.isPinnedRestock !== undefined
          ? { isPinnedRestock: Boolean(body.isPinnedRestock) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
    if (!updated) throw new HttpError(404, 'product not found');
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

productsRouter.post('/:id/adjust', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const delta = Number(req.body?.delta ?? 0);
    if (!Number.isFinite(delta) || delta === 0 || !Number.isInteger(delta * 1000)) throw new HttpError(400, 'delta must be non-zero with at most 3 decimal places');
    const [current] = await db.select().from(products).where(eq(products.id, id));
    if (!current) throw new HttpError(404, 'product not found');
    if (Number(current.currentQty) + delta < 0) throw new HttpError(409, 'adjustment would make stock negative');

    const [updated] = await db
      .update(products)
      .set({
        currentQty: String(Number(current.currentQty) + delta),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

productsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(products).where(eq(products.id, id)).returning();
    if (!deleted.length) throw new HttpError(404, 'product not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Restock shopping list
productsRouter.get('/restock-list', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(products)
      .where(or(lte(products.currentQty, products.reorderLevel), eq(products.isPinnedRestock, true)));

    const list = rows.map((item) => {
      const currentQty = Number(item.currentQty);
      const reorderLevel = Number(item.reorderLevel);
      const suggestedBuyQty =
        currentQty <= reorderLevel ? Math.max(reorderLevel - currentQty, 1) : 0;
      return {
        id: item.id,
        name: item.name,
        currentStock: currentQty,
        reorderLevel,
        suggestedBuyQty,
        lastUnitCost: item.costPrice,
        estimatedSubtotal: (suggestedBuyQty * Number(item.costPrice)).toFixed(2),
        isPinnedRestock: item.isPinnedRestock,
      };
    });

    const totalEstimatedPuhunan = list
      .reduce((sum, item) => sum + Number(item.estimatedSubtotal), 0)
      .toFixed(2);

    res.json({ items: list, totalEstimatedPuhunan });
  } catch (err) {
    next(err);
  }
});
