import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { projects, type Project } from '../db/schema.js';

class ProjectService {
  async listProjects(limit = 20, offset = 0): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(isNull(projects.deletedAt))
      .orderBy(desc(projects.createdAt))
      .limit(Math.min(limit, 100))
      .offset(offset);
  }

  async createProject(input: { name: string; description?: string; metadata?: Record<string, unknown> }): Promise<Project> {
    const [project] = await db.insert(projects).values(input).returning();
    return project;
  }

  async getProject(id: string): Promise<Project> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)));
    if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
    return project;
  }

  async updateProject(id: string, patch: Partial<Pick<Project, 'name' | 'description'>>): Promise<Project> {
    const [updated] = await db
      .update(projects)
      .set(patch)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .returning();
    if (!updated) throw Object.assign(new Error('Project not found'), { status: 404 });
    return updated;
  }

  async softDeleteProject(id: string): Promise<void> {
    const result = await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .returning({ id: projects.id });
    if (!result.length) throw Object.assign(new Error('Project not found'), { status: 404 });
  }
}

export const projectService = new ProjectService();
