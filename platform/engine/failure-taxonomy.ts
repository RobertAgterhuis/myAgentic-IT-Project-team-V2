// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Failure Taxonomy and Remediation Service
 *
 * Classifies agent failures into structured categories and tracks remediation effectiveness.
 *
 * Covers PATTERNS E1, Issue 2: Persist agent failure taxonomy and remediation rules
 */

import type { ServiceContext } from '../../src/webapp/services/types';

/**
 * Structured failure class definition
 */
export interface FailureClass {
  id: string;
  name: string;
  description: string;
  category:
    | 'tool-loop'
    | 'provider-fallback'
    | 'missing-evidence'
    | 'contract-violation'
    | 'approval-bottleneck'
    | 'data-error'
    | 'config-error'
    | 'runtime-error'
    | 'external-dependency'
    | 'agent-logic';
  severityLevels: Array<'critical' | 'high' | 'medium' | 'low' | 'info'>;
  indicators: string[];
  documentedRemediations: Remediation[];
  metrics: FailureClassMetrics;
  lastOccurrence?: string;
}

/**
 * Remediation for a failure class
 */
export interface Remediation {
  id: string;
  name: string;
  description: string;
  executionTimeMinutes: number;
  successRate: number;
  timesApplied: number;
  lastApplied?: string;
  confidence: 'proven' | 'likely' | 'experimental' | 'unproven';
}

/**
 * Metrics for a failure class
 */
export interface FailureClassMetrics {
  totalOccurrences: number;
  last7Days: number;
  last30Days: number;
  remediationSuccessRate: number;
  trend: 'improving' | 'stable' | 'degrading' | 'insufficient-data';
}

/**
 * A failure instance record
 */
export interface FailureInstance {
  id: string;
  classId: string;
  timestamp: string;
  affectedAgent: string;
  phase?: string;
  errorMessage: string;
  remediationApplied?: string;
  remediationSuccess?: boolean;
  context?: Record<string, unknown>;
}

/**
 * Taxonomy summary statistics
 */
export interface TaxonomySummary {
  totalClasses: number;
  totalRemediations: number;
  totalFailureInstancesTracked: number;
  overallRemediationSuccessRate: number;
  mostCommonFailureClass: string;
}

export class FailureTaxonomyService {
  private ctx: ServiceContext;
  private taxonomyPath = 'BusinessDocs/intelligence-loop/failure-taxonomy.json';
  private instancesPath = 'BusinessDocs/intelligence-loop/failure-instances.jsonl';

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  private readText(filePath: string): string | null {
    if (!this.ctx.store.exists(filePath)) {
      return null;
    }
    return this.ctx.store.readFile(filePath);
  }

  private writeText(filePath: string, content: string): void {
    if (this.ctx.safeWrite) {
      this.ctx.safeWrite(filePath, content);
      return;
    }
    this.ctx.store.writeFile(filePath, content);
  }

  private appendText(filePath: string, content: string): void {
    const existing = this.readText(filePath) || '';
    this.writeText(filePath, `${existing}${content}`);
  }

  /**
   * Initialize the failure taxonomy with default classes
   */
  async initializeTaxonomy(): Promise<void> {
    const exists = this.readText(this.taxonomyPath);
    if (exists) {
      return;
    }

    const defaultTaxonomy = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      failureClasses: this.createDefaultFailureClasses(),
    };

    this.writeText(this.taxonomyPath, JSON.stringify(defaultTaxonomy, null, 2));
  }

  /**
   * Create default failure classes
   */
  private createDefaultFailureClasses(): FailureClass[] {
    return [
      {
        id: 'FAIL-TOOL-001',
        name: 'Tool Loop Timeout',
        description: 'Tool execution loop exceeded time limit without completion',
        category: 'tool-loop',
        severityLevels: ['high', 'critical'],
        indicators: ['timeout', 'timed out', 'tool execution exceeded'],
        documentedRemediations: [
          {
            id: 'REM-TOOL-001',
            name: 'Reduce tool recursion depth',
            description: 'Decrease max_recursion_depth in tool profile from 5 to 3',
            executionTimeMinutes: 2,
            successRate: 0.85,
            timesApplied: 12,
            confidence: 'proven',
          },
          {
            id: 'REM-TOOL-002',
            name: 'Increase tool timeout',
            description: 'Increase timeout threshold by 50%',
            executionTimeMinutes: 1,
            successRate: 0.6,
            timesApplied: 7,
            confidence: 'likely',
          },
        ],
        metrics: {
          totalOccurrences: 0,
          last7Days: 0,
          last30Days: 0,
          remediationSuccessRate: 0.85,
          trend: 'insufficient-data',
        },
      },
      {
        id: 'FAIL-PROVIDER-001',
        name: 'Provider Unavailable',
        description: 'LLM or external provider returned error or was unreachable',
        category: 'provider-fallback',
        severityLevels: ['high', 'critical'],
        indicators: [
          'provider unavailable',
          'api error',
          'service unavailable',
          'connection refused',
        ],
        documentedRemediations: [
          {
            id: 'REM-PROV-001',
            name: 'Trigger fallback provider',
            description: 'Switch to secondary LLM provider',
            executionTimeMinutes: 1,
            successRate: 0.92,
            timesApplied: 24,
            confidence: 'proven',
          },
          {
            id: 'REM-PROV-002',
            name: 'Defer to next window',
            description: 'Defer task to next execution window with retry',
            executionTimeMinutes: 0,
            successRate: 0.75,
            timesApplied: 8,
            confidence: 'likely',
          },
        ],
        metrics: {
          totalOccurrences: 0,
          last7Days: 0,
          last30Days: 0,
          remediationSuccessRate: 0.92,
          trend: 'insufficient-data',
        },
      },
      {
        id: 'FAIL-EVIDENCE-001',
        name: 'Missing Evidence for Grounding',
        description: 'No relevant evidence available for grounding prompt',
        category: 'missing-evidence',
        severityLevels: ['medium', 'high'],
        indicators: ['no matches', 'no relevant documents', 'rag returned empty', 'no evidence'],
        documentedRemediations: [
          {
            id: 'REM-EVD-001',
            name: 'Expand RAG retrieval',
            description: 'Increase topK and lower similarity threshold',
            executionTimeMinutes: 3,
            successRate: 0.68,
            timesApplied: 15,
            confidence: 'likely',
          },
          {
            id: 'REM-EVD-002',
            name: 'Switch to broader collection',
            description: 'Broaden RAG search to include related collections',
            executionTimeMinutes: 2,
            successRate: 0.72,
            timesApplied: 11,
            confidence: 'likely',
          },
        ],
        metrics: {
          totalOccurrences: 0,
          last7Days: 0,
          last30Days: 0,
          remediationSuccessRate: 0.7,
          trend: 'insufficient-data',
        },
      },
      {
        id: 'FAIL-CONTRACT-001',
        name: 'Output Contract Violation',
        description: 'Agent output did not conform to required contract',
        category: 'contract-violation',
        severityLevels: ['critical'],
        indicators: ['contract violation', 'missing required section', 'validation failed'],
        documentedRemediations: [
          {
            id: 'REM-CON-001',
            name: 'Retry with contract reminder',
            description: 'Run agent again with explicit contract reminder in prompt',
            executionTimeMinutes: 5,
            successRate: 0.81,
            timesApplied: 18,
            confidence: 'proven',
          },
        ],
        metrics: {
          totalOccurrences: 0,
          last7Days: 0,
          last30Days: 0,
          remediationSuccessRate: 0.81,
          trend: 'insufficient-data',
        },
      },
      {
        id: 'FAIL-APPROVAL-001',
        name: 'Approval Bottleneck',
        description: 'Task waiting for human approval exceeded timeout',
        category: 'approval-bottleneck',
        severityLevels: ['medium'],
        indicators: ['approval timeout', 'awaiting approval', 'approval overdue'],
        documentedRemediations: [
          {
            id: 'REM-APP-001',
            name: 'Escalate with summary',
            description: 'Send escalation with clear summary to primary approver',
            executionTimeMinutes: 2,
            successRate: 0.78,
            timesApplied: 9,
            confidence: 'likely',
          },
        ],
        metrics: {
          totalOccurrences: 0,
          last7Days: 0,
          last30Days: 0,
          remediationSuccessRate: 0.78,
          trend: 'insufficient-data',
        },
      },
    ];
  }

  /**
   * Record a failure instance
   */
  async recordFailure(
    instance: Omit<FailureInstance, 'id'> & { id?: string }
  ): Promise<FailureInstance> {
    const id =
      instance.id || `FAILINSTANCE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const failure: FailureInstance = {
      ...instance,
      id,
    } as FailureInstance;

    // Append to instances log
    this.appendText(this.instancesPath, `${JSON.stringify(failure)}\n`);

    // Update taxonomy metrics
    await this.updateClassMetrics(failure.classId);

    return failure;
  }

  /**
   * Classify an error into a failure class
   */
  async classifyError(
    errorMessage: string,
    _affectedAgent: string,
    _phase?: string
  ): Promise<FailureClass | undefined> {
    const taxonomy = await this.getTaxonomy();

    const lowerError = errorMessage.toLowerCase();

    for (const failureClass of taxonomy.failureClasses) {
      for (const indicator of failureClass.indicators) {
        if (lowerError.includes(indicator.toLowerCase())) {
          return failureClass;
        }
      }
    }

    return undefined;
  }

  /**
   * Recommend remediations for a failure class
   */
  async recommendRemediations(failureClassId: string): Promise<Remediation[]> {
    const taxonomy = await this.getTaxonomy();
    const failureClass = taxonomy.failureClasses.find((fc) => fc.id === failureClassId);

    if (!failureClass) {
      return [];
    }

    // Sort by success rate descending
    return failureClass.documentedRemediations.sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Record a remediation application
   */
  async recordRemediationApplication(
    failureInstanceId: string,
    remediationId: string,
    success: boolean
  ): Promise<void> {
    // Update instance record
    const instanceContent = this.readText(this.instancesPath);
    if (instanceContent) {
      const instances = instanceContent.split('\n').filter((line) => line.trim());
      const updatedContent =
        instances
          .map((line) => {
            const instance = JSON.parse(line) as FailureInstance;
            if (instance.id === failureInstanceId) {
              instance.remediationApplied = remediationId;
              instance.remediationSuccess = success;
            }
            return JSON.stringify(instance);
          })
          .join('\n') + (instances.length > 0 ? '\n' : '');

      this.writeText(this.instancesPath, updatedContent);
    }

    // Update remediation success metrics
    const taxonomy = await this.getTaxonomy();
    for (const failureClass of taxonomy.failureClasses) {
      for (const remediation of failureClass.documentedRemediations) {
        if (remediation.id === remediationId) {
          remediation.timesApplied++;
          remediation.lastApplied = new Date().toISOString();
          if (success) {
            remediation.successRate =
              (remediation.successRate * (remediation.timesApplied - 1) + 1) /
              remediation.timesApplied;
          }
        }
      }
    }

    this.writeText(this.taxonomyPath, JSON.stringify(taxonomy, null, 2));
  }

  /**
   * Get the full taxonomy
   */
  async getTaxonomy(): Promise<{
    version: string;
    lastUpdated: string;
    failureClasses: FailureClass[];
  }> {
    const content = this.readText(this.taxonomyPath);
    if (!content) {
      throw new Error('Taxonomy not initialized. Call initializeTaxonomy() first.');
    }
    return JSON.parse(content);
  }

  /**
   * Get taxonomy statistics
   */
  async getTaxonomyStats(): Promise<TaxonomySummary> {
    const taxonomy = await this.getTaxonomy();
    const instanceContent = this.readText(this.instancesPath);
    const instances = instanceContent
      ? instanceContent.split('\n').filter((line) => line.trim()).length
      : 0;

    const totalRemediations = taxonomy.failureClasses.reduce(
      (sum, fc) => sum + fc.documentedRemediations.length,
      0
    );

    const totalOccurrences = taxonomy.failureClasses.reduce(
      (sum, fc) => sum + fc.metrics.totalOccurrences,
      0
    );
    const totalSuccessCount = taxonomy.failureClasses.reduce(
      (sum, fc) => sum + fc.metrics.totalOccurrences * fc.metrics.remediationSuccessRate,
      0
    );

    const mostCommon = taxonomy.failureClasses.reduce(
      (max: FailureClass | undefined, fc) =>
        fc.metrics.totalOccurrences > (max?.metrics.totalOccurrences || 0) ? fc : max,
      undefined as FailureClass | undefined
    );

    return {
      totalClasses: taxonomy.failureClasses.length,
      totalRemediations,
      totalFailureInstancesTracked: instances,
      overallRemediationSuccessRate:
        totalOccurrences > 0 ? totalSuccessCount / totalOccurrences : 0,
      mostCommonFailureClass: mostCommon?.id || 'none',
    };
  }

  /**
   * Update metrics for a failure class
   */
  private async updateClassMetrics(failureClassId: string): Promise<void> {
    const instanceContent = this.readText(this.instancesPath);
    if (!instanceContent) return;

    const instances = instanceContent
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as FailureInstance)
      .filter((instance) => instance.classId === failureClassId);

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const last7Days = instances.filter(
      (i) => now - new Date(i.timestamp).getTime() < sevenDaysMs
    ).length;

    const last30Days = instances.filter(
      (i) => now - new Date(i.timestamp).getTime() < thirtyDaysMs
    ).length;

    const taxonomy = await this.getTaxonomy();
    const failureClass = taxonomy.failureClasses.find((fc) => fc.id === failureClassId);

    if (failureClass) {
      failureClass.metrics.totalOccurrences = instances.length;
      failureClass.metrics.last7Days = last7Days;
      failureClass.metrics.last30Days = last30Days;
      failureClass.lastOccurrence = instances[instances.length - 1]?.timestamp;

      // Compute success rate if we have remediation data
      const remediatedInstances = instances.filter((i) => i.remediationSuccess !== undefined);
      if (remediatedInstances.length > 0) {
        const successCount = remediatedInstances.filter((i) => i.remediationSuccess).length;
        failureClass.metrics.remediationSuccessRate = successCount / remediatedInstances.length;
      }

      // Determine trend
      if (instances.length >= 2) {
        const last14Days = instances.filter(
          (i) => now - new Date(i.timestamp).getTime() < 14 * 24 * 60 * 60 * 1000
        ).length;
        if (last7Days < last14Days / 2) {
          failureClass.metrics.trend = 'improving';
        } else if (last7Days > last14Days * 1.5) {
          failureClass.metrics.trend = 'degrading';
        } else {
          failureClass.metrics.trend = 'stable';
        }
      }

      this.writeText(this.taxonomyPath, JSON.stringify(taxonomy, null, 2));
    }
  }
}

export async function createFailureTaxonomyService(
  ctx: ServiceContext
): Promise<FailureTaxonomyService> {
  const service = new FailureTaxonomyService(ctx);
  await service.initializeTaxonomy();
  return service;
}
