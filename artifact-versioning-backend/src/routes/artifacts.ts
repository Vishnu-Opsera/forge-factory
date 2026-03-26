import { Router } from 'express';
import { z } from 'zod';
import { artifactService } from '../services/artifact.service.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const CreateArtifactSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['requirement', 'architecture', 'diagram', 'other']),
});

const UpdateArtifactSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['requirement', 'architecture', 'diagram', 'other']).optional(),
});

const ListArtifactsQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

router.get('/', validate(ListArtifactsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as z.infer<typeof ListArtifactsQuerySchema>;
    const data = await artifactService.listArtifacts({
      projectId: q.project_id,
      type: q.type,
      name: q.name,
      limit: q.limit,
      offset: q.offset,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(CreateArtifactSchema), async (req, res, next) => {
  try {
    const artifact = await artifactService.createArtifact(req.body);
    res.status(201).json(artifact);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const artifact = await artifactService.getArtifact(req.params.id);
    res.json(artifact);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(UpdateArtifactSchema), async (req, res, next) => {
  try {
    const artifact = await artifactService.updateArtifact(req.params.id, req.body);
    res.json(artifact);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await artifactService.softDeleteArtifact(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
