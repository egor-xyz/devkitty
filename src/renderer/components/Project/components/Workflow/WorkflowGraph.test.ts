import { describe, expect, it } from 'vitest';

import { groupJobsIntoColumns } from './WorkflowGraph';

type Job = Parameters<typeof groupJobsIntoColumns>[0][number];

const iso = (ms: number) => new Date(ms).toISOString();

const makeJob = (id: number, started?: number, completed?: number): Job => ({
  id,
  name: `job-${id}`,
  ...(started !== undefined && { started_at: iso(started) }),
  ...(completed !== undefined && { completed_at: iso(completed) })
});

describe('groupJobsIntoColumns', () => {
  it('returns empty array for empty input', () => {
    expect(groupJobsIntoColumns([])).toEqual([]);
  });

  it('places a single job in its own column', () => {
    const jobs = [makeJob(1, 0, 5000)];
    const result = groupJobsIntoColumns(jobs);
    expect(result.map((c) => c.map((j) => j.id))).toEqual([[1]]);
  });

  it('keeps sequential jobs in separate columns when one starts shortly after the other finishes', () => {
    // Regression: previously a 2000ms slack would merge these together, causing
    // all parallel post-setup jobs to collapse into the setup column.
    const setup = makeJob(1, 0, 5000);
    const build = makeJob(2, 5500, 15000); // starts 500ms after setup finishes
    const result = groupJobsIntoColumns([setup, build]);
    expect(result.map((c) => c.map((j) => j.id))).toEqual([[1], [2]]);
  });

  it('places a setup job alone and groups all parallel follow-ups into one column', () => {
    // Typical deployment workflow: one setup, then many parallel builds.
    const jobs = [
      makeJob(1, 0, 5000), // Setup
      makeJob(2, 5500, 11500), // Update Vendors Content (completed)
      makeJob(3, 5600), // Build PDF Backend (still running)
      makeJob(4, 10000), // Build Frontend (still running)
      makeJob(5, 10000), // Build Migrator (still running)
      makeJob(6, 10000), // Update SKU Content (still running)
      makeJob(7, 10000) // Analytics / Deploy Views (still running)
    ];
    const result = groupJobsIntoColumns(jobs);
    expect(result).toHaveLength(2);
    expect(result[0].map((j) => j.id)).toEqual([1]);
    expect(result[1].map((j) => j.id).sort()).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it('groups overlapping jobs into the same column', () => {
    const a = makeJob(1, 0, 10000);
    const b = makeJob(2, 2000, 8000); // runs entirely within a
    const c = makeJob(3, 5000, 12000); // overlaps end of a and b
    const result = groupJobsIntoColumns([a, b, c]);
    expect(result).toHaveLength(1);
    expect(result[0].map((j) => j.id).sort()).toEqual([1, 2, 3]);
  });

  it('groups all not-yet-started jobs into a single final column', () => {
    const setup = makeJob(1, 0, 5000);
    const pending1 = makeJob(2); // no started_at
    const pending2 = makeJob(3);
    const result = groupJobsIntoColumns([setup, pending1, pending2]);
    expect(result).toHaveLength(2);
    expect(result[0].map((j) => j.id)).toEqual([1]);
    expect(result[1].map((j) => j.id).sort()).toEqual([2, 3]);
  });

  it('handles three stages of sequential jobs', () => {
    const a = makeJob(1, 0, 5000);
    const b = makeJob(2, 6000, 10000); // strictly after a
    const c = makeJob(3, 11000, 15000); // strictly after b
    const result = groupJobsIntoColumns([a, b, c]);
    expect(result.map((col) => col.map((j) => j.id))).toEqual([[1], [2], [3]]);
  });

  it('groups parallel in-progress jobs together even with no completion time', () => {
    const a = makeJob(1, 1000); // in progress
    const b = makeJob(2, 1500); // in progress, overlaps a
    const result = groupJobsIntoColumns([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0].map((j) => j.id).sort()).toEqual([1, 2]);
  });
});
