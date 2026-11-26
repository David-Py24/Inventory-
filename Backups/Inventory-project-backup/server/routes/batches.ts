import { Router } from 'express';
import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { inventoryBatches, products } from '../db/schema.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';

export const batchesRouter = Router();

batchesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const productId = req.query.productId ? String(req.query.productId) : undefined;
    const query = db.select().from(inventoryBatches).orderBy(asc(inventoryBatches.expiryDate));
    const rows = productId
      ? await query.where(eq(inventoryBatches.productId, productId))
      : await query;
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

batchesRouter.get('/expiring', requireAuth, async (req, res, next) => {
  try {
    const days = Number(req.query.days ?? 30);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const rows = await db
      .select({
        id: inventoryBatches.id,
        productId: inventoryBatches.productId,
        productName: products.name,
        qtyRemaining: inventoryBatches.qtyRemaining,
        costPrice: inventoryBatches.costPrice,
        expiryDate: inventoryBatches.expiryDate,
        receivedAt: inventoryBatches.receivedAt,
      })
      .from(inventoryBatches)
      .innerJoin(products, eq(products.id, inventoryBatches.productId))
      .where(
        and(
          lte(inventoryBatches.expiryDate, cutoff.toISOString().slice(0, 10)),
          gte(inventoryBatches.qtyRemaining, 1)
        )
      )
      .orderBy(asc(inventoryBatches.expiryDate));

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

batchesRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { productId, qtyRemaining, costPrice, expiryDate } = req.body ?? {};
    if (!productId) throw new HttpError(400, 'productId is required');

    const [created] = await db
      .insert(inventoryBatches)
      .values({
        productId,
        qtyRemaining: Number(qtyRemaining ?? 0),
        costPrice: String(costPrice ?? 0),
        expiryDate: expiryDate ?? null,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// Mark a restock purchase: add quantity to product and create a batch
batchesRouter.post('/mark-restocked', requireAuth, async (req, res, next) => {
  try {
    const { productId, qty, expiryDate } = req.body ?? {};
    if (!productId) throw new HttpError(400, 'productId is required');
    const quantity = Number(qty ?? 0);
    if (quantity <= 0) throw new HttpError(400, 'qty must be greater than 0');

    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) throw new HttpError(404, 'product not found');

    const [updatedProduct] = await db
      .update(products)
      .set({
        currentQty: product.currentQty + quantity,
        isPinnedRestock: false,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    const [batch] = await db
      .insert(inventoryBatches)
      .values({
        productId,
        qtyRemaining: quantity,
        costPrice: product.costPrice,
        expiryDate: expiryDate ?? null,
      })
      .returning();

    res.status(201).json({ product: updatedProduct, batch });
  } catch (err) {
    next(err);
  }
});

// FIFO helper: list active batches sorted by earliest expiry
batchesRouter.get('/fifo/:productId', requireAuth, async (req, res, next) => {
  try {
    const { productId } = req.params;
    const rows = await db
      .select()
      .from(inventoryBatches)
      .where(eq(inventoryBatches.productId, productId))
      .orderBy(asc(inventoryBatches.expiryDate));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});