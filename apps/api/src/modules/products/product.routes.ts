import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/utilities/asyncHandler.js';
import { validate } from '../../common/middleware/validate.js';
import { sendSuccess, paginationMeta } from '../../common/http/response.js';
import { listProducts, getProductBySlug } from './product.service.js';

const router = Router();

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(12),
  category: z.string().optional(),
  collection: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  newArrival: z.coerce.boolean().optional(),
  search: z.string().optional(),
  ids: z
    .string()
    .transform((value) => value.split(",").filter(Boolean))
    .pipe(z.array(z.string().min(1)).max(60))
    .optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular', 'discount']).optional(),
});

router.get(
  '/',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const { total, items } = await listProducts(q);
    sendSuccess(res, items, 200, paginationMeta(q.page, q.pageSize, total));
  })
);

router.get(
  '/:slug',
  validate({ params: z.object({ slug: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const product = await getProductBySlug(String(Object.values(req.params)[0]));
    sendSuccess(res, product);
  })
);

export const productRouter = router;
