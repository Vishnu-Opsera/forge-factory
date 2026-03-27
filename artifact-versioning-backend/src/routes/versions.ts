import { Router } from 'express';
import { z } from 'zod';
import { artifactService } from '../services/artifact.service.js';
import { versionService } from '../services/version.service.js';
import { tagService } from '../services/tag.service.js';
import { presignedGetUrl, downloadObject } from '../storage/s3.js';
import { unifiedDiff } from '../utils/diff.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/env.js';
import { markdownToPdfBuffer, plainTextToPdfBuffer, architectureToPdfBuffer } from '../utils/toPdf.js';

const router = Router({ mergeParams: true });

// ─── Versions ────────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const versions = await versionService.listVersions(req.params.id);
    res.json({ data: versions });
  } catch (err) {
    next(err);
  }
});

const CreateVersionSchema = z.object({
  created_by: z.string().min(1),
  change_summary: z.string().optional(),
  generation_metadata: z.record(z.unknown()).optional(),
  parent_version_id: z.string().uuid().optional(),
});

/**
 * POST /artifacts/:id/versions
 * Accepts raw binary body with Content-Type header, plus JSON fields as
 * multipart form fields OR query params for simplicity.
 */
router.post('/', async (req, res, next) => {
  try {
    const contentType = req.headers['content-type'] ?? 'application/octet-stream';
    const createdBy = (req.query['created_by'] as string) ?? 'user:anonymous';
    const changeSummary = req.query['change_summary'] as string | undefined;
    const parentVersionId = req.query['parent_version_id'] as string | undefined;
    let generationMetadata: Record<string, unknown> = {};
    try {
      if (req.query['generation_metadata']) {
        generationMetadata = JSON.parse(req.query['generation_metadata'] as string);
      }
    } catch { /* ignore parse errors */ }

    // Collect raw body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const content = Buffer.concat(chunks);

    if (content.length === 0) {
      res.status(422).json({
        type: 'https://httpstatuses.com/422',
        title: 'Validation Error',
        status: 422,
        detail: 'Request body must not be empty',
        instance: req.originalUrl,
      });
      return;
    }

    // Convert text content to PDF before storing
    let finalContent = content;
    let finalContentType = contentType.split(';')[0].trim();
    let artifactTitle = 'Artifact';
    let artifactType = '';
    try {
      const artifactRecord = await artifactService.getArtifact(req.params.id);
      artifactTitle = artifactRecord.name;
      artifactType = artifactRecord.type;
    } catch { /* use default title */ }

    if (finalContentType === 'text/markdown') {
      finalContent = await markdownToPdfBuffer(content.toString('utf8'), artifactTitle);
      finalContentType = 'application/pdf';
    } else if (finalContentType === 'text/plain') {
      if (artifactType === 'architecture') {
        try {
          const archData = JSON.parse(content.toString('utf8'));
          finalContent = await architectureToPdfBuffer(archData, artifactTitle);
        } catch {
          finalContent = await plainTextToPdfBuffer(content.toString('utf8'), artifactTitle);
        }
      } else {
        finalContent = await plainTextToPdfBuffer(content.toString('utf8'), artifactTitle);
      }
      finalContentType = 'application/pdf';
    }

    const version = await artifactService.createVersion({
      artifactId: req.params.id,
      content: finalContent,
      contentType: finalContentType,
      createdBy,
      changeSummary,
      generationMetadata,
      parentVersionId,
    });

    res.status(201).json(version);
  } catch (err) {
    next(err);
  }
});

router.get('/latest', async (req, res, next) => {
  try {
    const version = await versionService.getLatestVersion(req.params.id);
    const url = await presignedGetUrl(version.storageKey);
    res.json({ ...version, downloadUrl: url });
  } catch (err) {
    next(err);
  }
});

router.get('/:vnum', async (req, res, next) => {
  try {
    const vnum = parseInt(req.params.vnum, 10);
    if (isNaN(vnum)) {
      res.status(422).json({ status: 422, detail: 'Version must be an integer' });
      return;
    }
    const version = await versionService.getVersion(req.params.id, vnum);
    const downloadUrl = await presignedGetUrl(version.storageKey);
    res.json({ ...version, downloadUrl });
  } catch (err) {
    next(err);
  }
});

router.get('/:vnum/content', async (req, res, next) => {
  try {
    const vnum = parseInt(req.params.vnum, 10);
    if (isNaN(vnum)) {
      res.status(422).json({ status: 422, detail: 'Version must be an integer' });
      return;
    }
    const version = await versionService.getVersion(req.params.id, vnum);
    const ONE_MB = 1_048_576;

    if (req.query['inline'] === 'true' && version.sizeBytes < ONE_MB) {
      const buf = await downloadObject(version.storageKey);
      res.setHeader('Content-Type', version.contentType);
      res.setHeader('X-Artifact-Version', String(version.version));
      res.send(buf);
    } else {
      const url = await presignedGetUrl(version.storageKey);
      res.redirect(302, url);
    }
  } catch (err) {
    next(err);
  }
});

router.get('/:vnum/diff', async (req, res, next) => {
  try {
    const vnum = parseInt(req.params.vnum, 10);
    if (isNaN(vnum)) {
      res.status(422).json({ status: 422, detail: 'Version must be an integer' });
      return;
    }
    const version = await versionService.getVersion(req.params.id, vnum);

    if (!version.contentType.startsWith('text/') && version.contentType !== 'application/pdf') {
      res.status(422).json({
        status: 422,
        detail: 'Diff is only supported for text and PDF content types',
      });
      return;
    }

    const prevVersion = await versionService.getPreviousVersion(req.params.id, vnum);
    const [current, previous] = await Promise.all([
      downloadObject(version.storageKey).then((b) => b.toString('utf8')),
      prevVersion ? downloadObject(prevVersion.storageKey).then((b) => b.toString('utf8')) : Promise.resolve(''),
    ]);

    const diff = unifiedDiff(
      previous,
      current,
      prevVersion ? `v${prevVersion.version}` : 'empty',
      `v${version.version}`,
    );

    res.setHeader('Content-Type', 'text/plain');
    res.send(diff);
  } catch (err) {
    next(err);
  }
});

// ─── Lineage ─────────────────────────────────────────────────────────────────

router.get('/lineage', async (req, res, next) => {
  try {
    const graph = await versionService.getLineage(req.params.id);
    res.json(graph);
  } catch (err) {
    next(err);
  }
});

// ─── Tags ─────────────────────────────────────────────────────────────────────

router.get('/tags', async (req, res, next) => {
  try {
    const tags = await tagService.listTags(req.params.id);
    res.json({ data: tags });
  } catch (err) {
    next(err);
  }
});

const UpsertTagSchema = z.object({
  tag: z.string().min(1),
  version_id: z.string().uuid(),
  created_by: z.string().min(1),
});

router.post('/tags', validate(UpsertTagSchema), async (req, res, next) => {
  try {
    const { tag, version_id, created_by } = req.body as z.infer<typeof UpsertTagSchema>;
    const result = await tagService.upsertTag({
      artifactId: req.params.id,
      versionId: version_id,
      tag,
      createdBy: created_by,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/tags/:tag', async (req, res, next) => {
  try {
    await tagService.deleteTag(req.params.id, req.params.tag);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/tags/:tag/version', async (req, res, next) => {
  try {
    const result = await tagService.resolveTag(req.params.id, req.params.tag);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
