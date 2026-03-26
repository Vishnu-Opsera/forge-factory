import { Router } from 'express';
import { z } from 'zod';
import { projectService } from '../services/project.service.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const CreateProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

router.get('/', validate(PaginationSchema, 'query'), async (req, res, next) => {
  try {
    const { limit, offset } = req.query as { limit?: number; offset?: number };
    const data = await projectService.listProjects(limit, offset);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(CreateProjectSchema), async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await projectService.getProject(req.params.id);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(UpdateProjectSchema), async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await projectService.softDeleteProject(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
