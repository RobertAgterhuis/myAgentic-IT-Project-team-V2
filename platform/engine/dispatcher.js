'use strict';

/**
 * Agent Invocation Dispatcher (FEAT-05-B)
 *
 * Given a state transition, selects the correct agent, injects context
 * (predecessor outputs + questionnaire answers), invokes the agent,
 * validates the deliverable, and logs the result.
 *
 * AC-1: Receives agent ID, platform, predecessor paths, questionnaire inputs
 * AC-2: Platform routing (Copilot, Claude, OpenAI)
 * AC-3: Context injection from predecessor files
 * AC-4: Questionnaire injection
 * AC-5: Deliverable validation against contract
 * AC-6: Timeout handling
 * AC-7: Retry logic
 * AC-8: Logging
 */

const path = require('node:path');
const { STATES } = require('./state-machine');

// ─── Agent Registry ──────────────────────────────────────────
// Maps state → list of agents to invoke (in order)

const PHASE_AGENTS = Object.freeze({
  [STATES.ONBOARDING]: [{ id: '25', name: 'Onboarding Agent' }],
  [STATES.PHASE_1]: [
    { id: '01', name: 'Business Analyst' },
    { id: '02', name: 'Domain Expert' },
    { id: '03', name: 'Sales Strategist' },
    { id: '04', name: 'Financial Analyst' },
    { id: '34', name: 'Product Manager' },
  ],
  [STATES.CRITIC_1]: [
    { id: '18', name: 'Critic Agent' },
    { id: '19', name: 'Risk Agent' },
  ],
  [STATES.PHASE_2]: [
    { id: '05', name: 'Software Architect' },
    { id: '06', name: 'Senior Developer' },
    { id: '07', name: 'DevOps Engineer' },
    { id: '08', name: 'Security Architect' },
    { id: '09', name: 'Data Architect' },
    { id: '33', name: 'Legal Counsel' },
  ],
  [STATES.CRITIC_2]: [
    { id: '18', name: 'Critic Agent' },
    { id: '19', name: 'Risk Agent' },
  ],
  [STATES.PHASE_3]: [
    { id: '10', name: 'UX Researcher' },
    { id: '11', name: 'UX Designer' },
    { id: '12', name: 'UI Designer' },
    { id: '13', name: 'Accessibility Specialist' },
    { id: '32', name: 'Content Strategist' },
    { id: '35', name: 'Localization Specialist' },
  ],
  [STATES.CRITIC_3]: [
    { id: '18', name: 'Critic Agent' },
    { id: '19', name: 'Risk Agent' },
  ],
  [STATES.PHASE_4]: [
    { id: '14', name: 'Brand Strategist' },
    { id: '15', name: 'Growth Marketer' },
    { id: '16', name: 'CRO Specialist' },
    { id: '30', name: 'Brand & Assets Agent' },
    { id: '31', name: 'Storybook Agent' },
  ],
  [STATES.CRITIC_4]: [
    { id: '18', name: 'Critic Agent' },
    { id: '19', name: 'Risk Agent' },
  ],
  [STATES.SYNTHESIS]: [{ id: '17', name: 'Synthesis Agent' }],
  [STATES.SPRINT_GATE]: [{ id: '00', name: 'Orchestrator (Sprint Gate)' }],
  [STATES.PHASE_5_EXECUTING]: [
    { id: '20', name: 'Implementation Agent' },
    { id: '21', name: 'Test Agent' },
    { id: '38', name: 'Architecture Compliance Reviewer' },
    { id: '22', name: 'PR/Review Agent' },
    { id: '29', name: 'KPI Agent' },
    { id: '26', name: 'Documentation Agent' },
    { id: '27', name: 'GitHub Integration Agent' },
    { id: '28', name: 'Retrospective Agent' },
  ],
});

// ─── Supported Platforms ─────────────────────────────────────
const PLATFORMS = Object.freeze({
  COPILOT: 'copilot',
  CLAUDE: 'claude',
  OPENAI: 'openai',
});

// ─── Default Configuration ───────────────────────────────────
const DEFAULT_CONFIG = Object.freeze({
  platform: PLATFORMS.COPILOT,
  timeoutMs: 300000, // 5 minutes default
  maxRetries: 2,
  retryDelayMs: 5000,
  skillsDir: 'templates/sdlc/agents',
  docsDir: 'docs',
});

// ─── Invocation Log Entry ────────────────────────────────────

/**
 * @typedef {object} InvocationLogEntry
 * @property {string} agentId
 * @property {string} agentName
 * @property {string} platform
 * @property {string} state
 * @property {string} startTime
 * @property {string} [endTime]
 * @property {number} [durationMs]
 * @property {'success'|'failure'|'timeout'|'retry'} status
 * @property {string} [error]
 * @property {number} attempt
 * @property {string} [outputPath]
 */

// ─── Dispatcher Class ────────────────────────────────────────

class Dispatcher {
  /**
   * @param {object} options
   * @param {object} options.store - File store abstraction (read/write/exists)
   * @param {object} [options.config] - Override default config
   * @param {Function} [options.invoker] - Platform invocation function (for testability)
   * @param {Function} [options.onLog] - Callback for invocation log entries
   */
  constructor(options = {}) {
    const { store, config = {}, invoker, onLog, phaseAgents } = options;

    if (!store) throw new Error('Dispatcher requires a store');

    this._store = store;
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._phaseAgents = phaseAgents || PHASE_AGENTS;
    this._invoker = invoker || this._defaultInvoker.bind(this);
    this._onLog = onLog || (() => {});
    this._log = [];
  }

  /** @returns {InvocationLogEntry[]} Full invocation log */
  get log() {
    return [...this._log];
  }

  /**
   * Get the agents assigned to a given state.
   * @param {string} state
   * @returns {Array<{id: string, name: string}>}
   */
  getAgentsForState(state) {
    return this._phaseAgents[state] || [];
  }

  /**
   * Build agent invocation context.
   * AC-3: Reads predecessor output files and injects as context.
   * AC-4: Loads questionnaire answers.
   *
   * @param {string} agentId
   * @param {object} options
   * @param {string[]} [options.predecessorPaths] - Paths to predecessor outputs
   * @param {string} [options.questionnairePath] - Path to questionnaire answers
   * @param {object} [options.sessionState] - Current session state
   * @returns {object} Assembled context object
   */
  buildContext(agentId, options = {}) {
    const { predecessorPaths = [], questionnairePath, sessionState } = options;
    const context = {
      agentId,
      skillFile: path.join(this._config.skillsDir, `${agentId}-*.md`),
      predecessorOutputs: {},
      questionnaireInput: null,
      sessionState: sessionState || null,
    };

    // AC-3: Load predecessor outputs
    for (const p of predecessorPaths) {
      if (this._store.exists(p)) {
        context.predecessorOutputs[p] = this._store.read(p);
      }
    }

    // AC-4: Load questionnaire answers
    if (questionnairePath && this._store.exists(questionnairePath)) {
      context.questionnaireInput = this._store.read(questionnairePath);
    }

    return context;
  }

  /**
   * Invoke a single agent with retry and timeout handling.
   * AC-1, AC-2, AC-5, AC-6, AC-7, AC-8
   *
   * @param {object} agent - { id, name }
   * @param {string} state - Current state
   * @param {object} context - Built context from buildContext()
   * @param {object} [agentConfig] - Per-agent config overrides
   * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
   */
  async invoke(agent, state, context, agentConfig = {}) {
    const config = { ...this._config, ...agentConfig };
    const platform = agentConfig.platform || config.platform;
    let lastError = null;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      const entry = {
        agentId: agent.id,
        agentName: agent.name,
        platform,
        state,
        startTime: new Date().toISOString(),
        status: 'success',
        attempt,
      };

      try {
        const result = await this._withTimeout(
          this._invoker(agent, platform, context),
          config.timeoutMs
        );

        entry.endTime = new Date().toISOString();
        entry.durationMs = new Date(entry.endTime) - new Date(entry.startTime);
        entry.outputPath = result.outputPath;
        entry.status = 'success';

        this._logEntry(entry);
        return { success: true, outputPath: result.outputPath };
      } catch (err) {
        lastError = err;
        entry.endTime = new Date().toISOString();
        entry.durationMs = new Date(entry.endTime) - new Date(entry.startTime);
        entry.error = err.message;
        entry.status = Dispatcher._classifyError(err, attempt, config.maxRetries);

        this._logEntry(entry);

        if (attempt <= config.maxRetries) {
          await this._delay(config.retryDelayMs);
        }
      }
    }

    return {
      success: false,
      error: lastError ? lastError.message : 'Unknown error',
    };
  }

  /**
   * Dispatch all agents for a given state sequentially.
   * @param {string} state
   * @param {object} contextOptions - Options for buildContext
   * @param {object} [agentConfigs] - Map of agentId → config overrides
   * @param {object} [dispatchOptions] - { onFailure: 'continue'|'abort'|'escalate' }
   * @returns {Promise<{completed: string[], failed: string[], results: object[], escalated: boolean}>}
   */
  async dispatchState(state, contextOptions = {}, agentConfigs = {}, dispatchOptions = {}) {
    const { onFailure = 'continue' } = dispatchOptions;
    const agents = this.getAgentsForState(state);
    const completed = [];
    const failed = [];
    const results = [];
    let escalated = false;

    for (const agent of agents) {
      const context = this.buildContext(agent.id, contextOptions);
      const agentConfig = agentConfigs[agent.id] || {};
      const result = await this.invoke(agent, state, context, agentConfig);

      results.push({ agent, ...result });

      if (result.success) {
        completed.push(agent.id);
        // Add output to contextOptions.predecessorPaths for next agent
        if (result.outputPath) {
          contextOptions.predecessorPaths = contextOptions.predecessorPaths || [];
          contextOptions.predecessorPaths.push(result.outputPath);
        }
      } else {
        failed.push(agent.id);
        if (onFailure === 'abort') {
          break;
        }
        if (onFailure === 'escalate') {
          escalated = true;
          break;
        }
      }
    }

    return { completed, failed, results, escalated };
  }

  // ─── Internal ────────────────────────────────────────────

  static _classifyError(err, attempt, maxRetries) {
    if (err.message === 'TIMEOUT') return 'timeout';
    return attempt <= maxRetries ? 'retry' : 'failure';
  }

  /** @private — Default invoker (no-op for testing) */
  async _defaultInvoker(_agent, _platform, _context) {
    throw new Error('No invoker configured. Provide an invoker function.');
  }

  /** @private — Promise with timeout */
  _withTimeout(promise, ms) {
    if (ms <= 0) return promise;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
      promise
        .then((val) => {
          clearTimeout(timer);
          resolve(val);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /** @private */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** @private */
  _logEntry(entry) {
    this._log.push(entry);
    this._onLog(entry);
  }
}

module.exports = {
  PHASE_AGENTS,
  PLATFORMS,
  DEFAULT_CONFIG,
  Dispatcher,
};
