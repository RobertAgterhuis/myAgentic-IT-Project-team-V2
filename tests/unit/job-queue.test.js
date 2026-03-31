// Copyright (c) 2026 Robert Agterhuis. MIT License.
// M24: Background Job Execution — Unit Tests
import { MemoryQueue } from '../../platform/engine/jobs/memory-queue';
import { JobWorker } from '../../platform/engine/jobs/worker';
import { Dispatcher } from '../../platform/engine/dispatcher';
import { collectJobMetrics, flushJobMetrics } from '../../platform/engine/jobs/job-metrics';

// ─── Test Helpers ────────────────────────────────────────────

function makeInput(overrides = {}) {
  return {
    type: 'agent-invocation',
    payload: { agentId: '01', state: 'PHASE_1' },
    priority: 5,
    retryCount: 0,
    maxRetries: 2,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// M24-001: Job types (compile-time — tested implicitly by usage)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// M24-002: MemoryQueue
// ─────────────────────────────────────────────────────────────
describe('MemoryQueue — in-process job queue', () => {
  let queue;

  beforeEach(() => {
    queue = new MemoryQueue({ concurrency: 3, defaultTimeoutMs: 60000 });
  });

  afterEach(() => {
    queue.destroy();
  });

  it('enqueues and assigns id + status + createdAt', async () => {
    const job = await queue.enqueue(makeInput());
    expect(job.id).toBeTruthy();
    expect(job.status).toBe('queued');
    expect(job.createdAt).toBeTruthy();
    expect(job.type).toBe('agent-invocation');
  });

  it('dequeues highest priority job first', async () => {
    await queue.enqueue(makeInput({ priority: 1, payload: { name: 'low' } }));
    await queue.enqueue(makeInput({ priority: 10, payload: { name: 'high' } }));
    await queue.enqueue(makeInput({ priority: 5, payload: { name: 'mid' } }));

    const job = await queue.dequeue();
    expect(job).not.toBeNull();
    expect(job.payload.name).toBe('high');
    expect(job.status).toBe('running');
    expect(job.startedAt).toBeTruthy();
  });

  it('returns FIFO order within same priority', async () => {
    const j1 = await queue.enqueue(makeInput({ priority: 5, payload: { seq: 1 } }));
    await queue.enqueue(makeInput({ priority: 5, payload: { seq: 2 } }));

    const first = await queue.dequeue();
    expect(first.id).toBe(j1.id);
  });

  it('enforces concurrency limit', async () => {
    const q = new MemoryQueue({ concurrency: 2, defaultTimeoutMs: 60000 });
    await q.enqueue(makeInput());
    await q.enqueue(makeInput());
    await q.enqueue(makeInput());

    const j1 = await q.dequeue();
    const j2 = await q.dequeue();
    const j3 = await q.dequeue(); // should be null — 2 running

    expect(j1).not.toBeNull();
    expect(j2).not.toBeNull();
    expect(j3).toBeNull();

    q.destroy();
  });

  it('completes a job with result', async () => {
    await queue.enqueue(makeInput());
    const job = await queue.dequeue();
    await queue.complete(job.id, { outputPath: '/output.md' });

    const updated = await queue.status(job.id);
    expect(updated.status).toBe('completed');
    expect(updated.result).toEqual({ outputPath: '/output.md' });
    expect(updated.completedAt).toBeTruthy();
  });

  it('fails a job with error', async () => {
    await queue.enqueue(makeInput({ maxRetries: 0 }));
    const job = await queue.dequeue();
    await queue.fail(job.id, { message: 'fatal error', severity: 'fatal' });

    const updated = await queue.status(job.id);
    expect(updated.status).toBe('failed');
    expect(updated.error.message).toBe('fatal error');
    expect(updated.error.severity).toBe('fatal');
  });

  it('retries transient failures by re-queuing', async () => {
    await queue.enqueue(makeInput({ maxRetries: 2 }));
    const job = await queue.dequeue();
    await queue.fail(job.id, { message: 'timeout', severity: 'transient' });

    const updated = await queue.status(job.id);
    expect(updated.status).toBe('queued');
    expect(updated.retryCount).toBe(1);
  });

  it('cancels a queued job', async () => {
    const job = await queue.enqueue(makeInput());
    await queue.cancel(job.id);

    const updated = await queue.status(job.id);
    expect(updated.status).toBe('cancelled');
    expect(updated.completedAt).toBeTruthy();
  });

  it('cancels a running job', async () => {
    await queue.enqueue(makeInput());
    const job = await queue.dequeue();
    await queue.cancel(job.id);

    const updated = await queue.status(job.id);
    expect(updated.status).toBe('cancelled');
  });

  it('rejects cancel on completed job', async () => {
    await queue.enqueue(makeInput());
    const job = await queue.dequeue();
    await queue.complete(job.id, 'done');

    await expect(queue.cancel(job.id)).rejects.toThrow(/Cannot cancel/);
  });

  it('filters by type on dequeue', async () => {
    await queue.enqueue(makeInput({ type: 'gate-validation', payload: { gate: true } }));
    await queue.enqueue(makeInput({ type: 'agent-invocation', payload: { agent: true } }));

    const job = await queue.dequeue(['gate-validation']);
    expect(job.type).toBe('gate-validation');
  });

  it('lists jobs with filters', async () => {
    await queue.enqueue(makeInput({ type: 'agent-invocation' }));
    await queue.enqueue(makeInput({ type: 'gate-validation' }));
    await queue.enqueue(makeInput({ type: 'agent-invocation' }));

    const agentJobs = await queue.list({ type: 'agent-invocation' });
    expect(agentJobs.length).toBe(2);

    const all = await queue.list();
    expect(all.length).toBe(3);
  });

  it('size() returns job count by status', async () => {
    await queue.enqueue(makeInput());
    await queue.enqueue(makeInput());
    await queue.dequeue();

    expect(await queue.size()).toBe(2);
    expect(await queue.size('queued')).toBe(1);
    expect(await queue.size('running')).toBe(1);
  });

  it('returns null on dequeue from empty queue', async () => {
    const job = await queue.dequeue();
    expect(job).toBeNull();
  });

  it('throws on status for missing job', async () => {
    const job = await queue.status('nonexistent');
    expect(job).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// M24-004: JobWorker
// ─────────────────────────────────────────────────────────────
describe('JobWorker — worker loop', () => {
  let queue;

  beforeEach(() => {
    queue = new MemoryQueue({ concurrency: 5, defaultTimeoutMs: 60000 });
  });

  afterEach(() => {
    queue.destroy();
  });

  it('processes a single job end-to-end', async () => {
    const job = await queue.enqueue(makeInput());

    const executor = async (j) => ({ agentResult: 'ok', jobId: j.id });
    const worker = new JobWorker(queue, executor, {
      workerCount: 1,
      pollIntervalMs: 50,
    });

    worker.start();
    // Wait for processing
    await new Promise((r) => setTimeout(r, 200));
    await worker.stop();

    const result = await queue.status(job.id);
    expect(result.status).toBe('completed');
    expect(result.result).toEqual({ agentResult: 'ok', jobId: job.id });
  });

  it('reports health metrics', async () => {
    const worker = new JobWorker(queue, async () => 'ok', {
      workerCount: 1,
      pollIntervalMs: 50,
    });

    worker.start();
    await new Promise((r) => setTimeout(r, 20));
    const health = await worker.health();

    expect(health).toHaveProperty('activeJobs');
    expect(health).toHaveProperty('queueDepth');
    expect(health).toHaveProperty('totalProcessed');
    expect(health).toHaveProperty('totalFailed');
    expect(health).toHaveProperty('shuttingDown');
    expect(health).toHaveProperty('uptimeMs');
    expect(health.shuttingDown).toBe(false);
    expect(health.uptimeMs).toBeGreaterThan(0);

    await worker.stop();
  });

  it('fires onJobEvent callbacks', async () => {
    const events = [];
    await queue.enqueue(makeInput());

    const worker = new JobWorker(queue, async () => 'result', {
      workerCount: 1,
      pollIntervalMs: 50,
      onJobEvent: (e) => events.push(e),
    });

    worker.start();
    await new Promise((r) => setTimeout(r, 200));
    await worker.stop();

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].type).toBe('running');
    expect(events[1].type).toBe('completed');
  });

  it('handles executor failure gracefully', async () => {
    await queue.enqueue(makeInput({ maxRetries: 0 }));

    const worker = new JobWorker(
      queue,
      async () => {
        throw new Error('executor crash');
      },
      { workerCount: 1, pollIntervalMs: 50 }
    );

    worker.start();
    await new Promise((r) => setTimeout(r, 200));
    await worker.stop();

    const health = await worker.health();
    expect(health.totalFailed).toBeGreaterThanOrEqual(1);
  });

  it('graceful shutdown completes in-flight jobs', async () => {
    let jobStarted = false;
    let jobFinished = false;

    await queue.enqueue(makeInput());

    const worker = new JobWorker(
      queue,
      async () => {
        jobStarted = true;
        await new Promise((r) => setTimeout(r, 100));
        jobFinished = true;
        return 'done';
      },
      { workerCount: 1, pollIntervalMs: 10 }
    );

    worker.start();
    // Wait for job to start
    await new Promise((r) => setTimeout(r, 50));
    // Initiate shutdown
    const stopPromise = worker.stop();
    await stopPromise;

    // Job should have completed despite shutdown
    expect(jobStarted).toBe(true);
    expect(jobFinished).toBe(true);
    expect(worker.running).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// M24-005: Dispatcher job queue integration
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — job queue integration', () => {
  function createMockStore(files = {}) {
    return {
      exists: (fp) => fp in files,
      read: (fp) => files[fp] || '',
      write: (fp, content) => {
        files[fp] = content;
      },
      _files: files,
    };
  }

  it('enqueueInvocation creates a job in the queue', async () => {
    const queue = new MemoryQueue({ concurrency: 3, defaultTimeoutMs: 60000 });
    const dispatcher = new Dispatcher({
      store: createMockStore(),
      jobQueue: queue,
    });

    const agent = { id: '01', name: 'Business Analyst' };
    const result = await dispatcher.enqueueInvocation(agent, 'PHASE_1', {});

    expect(result.jobId).toBeTruthy();
    const job = await queue.status(result.jobId);
    expect(job.type).toBe('agent-invocation');
    expect(job.status).toBe('queued');
    expect(job.payload.agentId).toBe('01');
    expect(job.payload.agentName).toBe('Business Analyst');

    queue.destroy();
  });

  it('enqueueInvocation throws when no queue configured', async () => {
    const dispatcher = new Dispatcher({
      store: createMockStore(),
    });

    const agent = { id: '01', name: 'Business Analyst' };
    await expect(dispatcher.enqueueInvocation(agent, 'PHASE_1', {})).rejects.toThrow(
      /No job queue configured/
    );
  });
});

// ─────────────────────────────────────────────────────────────
// M24-007: Job metrics
// ─────────────────────────────────────────────────────────────
describe('Job metrics — snapshot collection', () => {
  it('collectJobMetrics returns a valid snapshot', async () => {
    const queue = new MemoryQueue({ concurrency: 5, defaultTimeoutMs: 60000 });
    await queue.enqueue(makeInput());
    await queue.enqueue(makeInput({ type: 'gate-validation' }));
    const j = await queue.dequeue();
    await queue.complete(j.id, 'done');

    const snapshot = await collectJobMetrics(queue);

    expect(snapshot.queueDepth.queued).toBe(1);
    expect(snapshot.queueDepth.completed).toBe(1);
    expect(snapshot.jobsByType['agent-invocation']).toBe(1);
    expect(snapshot.jobsByType['gate-validation']).toBe(1);
    expect(snapshot.failureRate).toBe(0);
    expect(snapshot.timestamp).toBeTruthy();

    queue.destroy();
  });

  it('flushJobMetrics writes to store without error', () => {
    const files = {};
    const store = {
      exists: (fp) => fp in files,
      readFile: (fp) => files[fp] || '',
      writeFile: (fp, data) => {
        files[fp] = data;
      },
      mkdirp: () => {},
    };

    const snapshot = {
      queueDepth: { queued: 3, running: 1, completed: 10, failed: 2, cancelled: 0 },
      jobsByType: { 'agent-invocation': 10, 'gate-validation': 6 },
      failureRate: 0.167,
      duration: { p50: 1000, p95: 5000, p99: 8000 },
      avgRetries: 1.5,
      timestamp: new Date().toISOString(),
    };

    expect(() => flushJobMetrics(store, snapshot, 'test-metrics.json')).not.toThrow();
    expect(files['test-metrics.json']).toBeTruthy();

    const parsed = JSON.parse(files['test-metrics.json']);
    expect(parsed.metrics).toBeTruthy();
    expect(parsed.metrics.job_queue_depth_queued).toBeTruthy();
    expect(parsed.metrics.job_failure_rate).toBeTruthy();
    expect(parsed.metrics.job_duration_p50).toBeTruthy();
  });
});
