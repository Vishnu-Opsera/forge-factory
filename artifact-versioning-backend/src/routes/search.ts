import { Router } from 'express';
import { z } from 'zod';
import { searchService } from '../services/search.service.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const SemanticSearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional(),
  project_id: z.string().uuid().optional(),
  type: z.string().optional(),
});

router.post('/semantic', validate(SemanticSearchSchema), async (req, res, next) => {
  try {
    const { query, limit, project_id, type } = req.body as z.infer<typeof SemanticSearchSchema>;
    const results = await searchService.semanticSearch({
      query,
      limit,
      projectId: project_id,
      type,
    });
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
});

const TextSearchQuerySchema = z.object({
  q: z.string().min(1),
  project_id: z.string().uuid().optional(),
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

router.get('/text', validate(TextSearchQuerySchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as z.infer<typeof TextSearchQuerySchema>;
    const results = await searchService.textSearch({
      q: q.q,
      projectId: q.project_id,
      type: q.type,
      limit: q.limit,
      offset: q.offset,
    });
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
});

export default router;
