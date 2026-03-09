// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Dashboard Home — Data Loading & Rendering Module (SP-7.3)
 * 
 * Fetches data from 4 API endpoints and renders the dashboard with:
 * - Progressive enhancement (graceful fallbacks for JS disabled)
 * - Skeleton loaders (while data is loading)
 * - Error handling with toast notifications
 * - Auto-refresh capability (manual or timed)
 * - Responsive data binding patterns
 * 
 * @module dashboard
 * @exported as window.Dashboard
 */

(function(window) {
  'use strict';

  const API_BASE = '/api/dashboard';
  const REFRESH_INTERVAL_MS = 60000; // 1 minute
  const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

  /* ── Toast Notification Helper ────────────────────────────────── */

  /**
   * Show a toast notification at bottom-right.
   * @param {string} message - Toast message text
   * @param {string} type - 'info' | 'success' | 'warning' | 'error'
   * @param {number} duration - Auto-dismiss duration (0 = no auto-dismiss)
   */
  function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    const icon = {
      info: 'ℹ',
      success: '✓',
      warning: '⚠',
      error: '✕'
    }[type] || '◆';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
      <button class="toast-close" aria-label="Close notification" type="button">×</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', function() {
      toast.remove();
    });

    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, duration);
    }

    return toast;
  }

  /**
   * Escape HTML special characters to prevent XSS.
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* ── Data Fetching ────────────────────────────────────────────── */

  /**
   * Fetch data from a dashboard API endpoint with timeout and error handling.
   * @param {string} endpoint - e.g., 'health', 'metrics', 'activity', 'stats'
   * @returns {Promise<object>} Parsed JSON response
   */
  async function fetchDashboardData(endpoint) {
    const url = `${API_BASE}/${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || 'API returned error status');
      }

      return data.data;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`[Dashboard] Timeout fetching ${endpoint} (${REQUEST_TIMEOUT_MS}ms)`);
        throw new Error(`Timeout loading ${endpoint}`);
      }
      console.error(`[Dashboard] Error fetching ${endpoint}:`, err);
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /* ── Health Overview Rendering ────────────────────────────────── */

  /**
   * Render health indicator data into the health-overview container.
   * @param {object} healthData - Response from /api/dashboard/health
   */
  function renderHealthOverview(healthData) {
    const container = document.getElementById('health-overview');
    if (!container) return;

    // Find or create health indicators
    const indicators = container.querySelectorAll('.health-indicator:not(.skeleton)');

    // Render health status items
    const items = [
      { key: 'quality', data: healthData.quality },
      { key: 'coverage', data: healthData.coverage },
      { key: 'builds', data: healthData.builds },
      { key: 'deployment', data: healthData.deployment }
    ];

    items.forEach((item, idx) => {
      const indicator = indicators[idx] || createHealthIndicator();
      if (!indicators[idx]) container.appendChild(indicator);

      const label = indicator.querySelector('.health-label');
      const value = indicator.querySelector('.health-value');
      const badge = indicator.querySelector('.badge');

      if (label) label.textContent = item.data.label;
      if (value) {
        value.textContent = item.data.value;
        value.setAttribute('data-metric', item.key);
        value.setAttribute('title', item.data.details || '');
      }
      if (badge) {
        const badgeClass = `badge-${item.data.status === 'excellent' ? 'success' : item.data.status === 'good' ? 'success' : 'info'}`;
        badge.className = `badge ${badgeClass}`;
        badge.textContent = capitalizeFirst(item.data.status);
      }

      indicator.classList.remove('skeleton');
    });

    // Remove skeleton loader
    container.querySelectorAll('.health-indicator.skeleton').forEach(el => el.remove());
  }

  /**
   * Create a health indicator element.
   */
  function createHealthIndicator() {
    const div = document.createElement('div');
    div.className = 'health-indicator';
    div.innerHTML = `
      <div class="health-label"></div>
      <div class="health-value"></div>
      <div class="health-status">
        <span class="badge"></span>
      </div>
    `;
    return div;
  }

  /* ── Metrics Showcase Rendering ──────────────────────────────── */

  /**
   * Render key metrics into the metrics-showcase container.
   * @param {object} metricsData - Response from /api/dashboard/metrics
   */
  function renderMetricsShowcase(metricsData) {
    const container = document.getElementById('metrics-showcase');
    if (!container) return;

    const cards = container.querySelectorAll('.metric-card-showcase:not(.skeleton)');

    // Render metric cards
    const metrics = [
      { key: 'http_requests', data: metricsData.http_requests },
      { key: 'error_rate', data: metricsData.error_rate },
      { key: 'response_time', data: metricsData.response_time }
    ];

    metrics.forEach((metric, idx) => {
      const card = cards[idx] || createMetricCard();
      if (!cards[idx]) container.appendChild(card);

      const title = card.querySelector('.metric-title-small');
      const value = card.querySelector('.metric-large-value');
      const indicator = card.querySelector('.metric-change-indicator');
      const badge = card.querySelector('.metric-badge-container .badge');

      if (title) title.textContent = metric.data.label;

      if (value) {
        // Handle unit separately for response_time
        if (metric.data.unit) {
          value.innerHTML = `${escapeHtml(metric.data.value)}<span class="metric-unit">${escapeHtml(metric.data.unit)}</span>`;
        } else {
          value.textContent = metric.data.value;
        }
        value.setAttribute('data-metric', metric.key);
      }

      if (metric.data.trend && indicator) {
        const direction = metric.data.trend_direction === 'up' ? '↑' : metric.data.trend_direction === 'down' ? '↓' : '→';
        const className = `metric-change-indicator ${metric.data.trend_direction || ''}`;
        indicator.className = className;
        indicator.innerHTML = `<span aria-hidden="true">${direction}</span> ${escapeHtml(metric.data.trend || 'Stable')}`;
      } else if (indicator) {
        indicator.textContent = 'Stable';
      }

      if (badge) {
        const badgeClass = metric.data.status === 'warning' ? 'badge-warning' : 'badge-success';
        badge.className = `badge ${badgeClass}`;
        badge.textContent = metric.data.period || 'Current';
      }

      card.classList.remove('skeleton');
    });

    // Remove skeleton loaders
    container.querySelectorAll('.metric-card-showcase.skeleton').forEach(el => el.remove());
  }

  /**
   * Create a metric card element.
   */
  function createMetricCard() {
    const div = document.createElement('div');
    div.className = 'metric-card-showcase';
    div.innerHTML = `
      <div class="metric-card-header">
        <div class="metric-title-small"></div>
        <div class="metric-badge-container">
          <span class="badge badge-info"></span>
        </div>
      </div>
      <div class="metric-large-value"></div>
      <div class="metric-change-indicator"></div>
    `;
    return div;
  }

  /* ── Activity Feed Rendering ──────────────────────────────────── */

  /**
   * Render activity feed items into the activity-feed container.
   * @param {array} activityData - Array of activity items from /api/dashboard/activity
   */
  function renderActivityFeed(activityData) {
    const container = document.getElementById('activity-feed');
    if (!container) return;

    // Clear existing skeleton loaders
    container.querySelectorAll('.activity-item.skeleton').forEach(el => el.remove());

    // Render activity items
    activityData.forEach((item) => {
      const itemEl = createActivityItem(item);
      container.appendChild(itemEl);
    });
  }

  /**
   * Create an activity item element.
   */
  function createActivityItem(item) {
    const div = document.createElement('div');
    div.className = 'activity-item';
    div.setAttribute('role', 'article');

    // Create avatar or icon
    let avatarHtml = '';
    if (item.user_avatar) {
      avatarHtml = `<img src="${escapeHtml(item.user_avatar)}" class="activity-avatar" alt="${escapeHtml(item.user || 'Activity')} avatar">`;
    } else {
      const iconMap = {
        'test_complete': '✓',
        'milestone_created': '📋',
        'commit': '◆',
        'deployment': '→'
      };
      const icon = iconMap[item.type] || '◆';
      const bgClass = {
        'test_complete': 'success',
        'milestone_created': 'primary',
        'deployment': 'info'
      }[item.type] || 'default';
      const bgStyle = bgClass === 'success' ? 'var(--success-light)' : bgClass === 'primary' ? 'var(--primary-light)' : 'var(--neutral-light)';
      const colorStyle = bgClass === 'success' ? 'var(--success)' : bgClass === 'primary' ? 'var(--primary)' : 'var(--neutral)';
      avatarHtml = `<div style="display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: ${bgStyle}; color: ${colorStyle}; border-radius: var(--radius-full); font-size: 24px; flex-shrink: 0;">${icon}</div>`;
    }

    const metadataHtml = item.metadata ? Object.entries(item.metadata).map(([k, v]) => {
      return `<span class="activity-action-badge">${escapeHtml(String(v))}</span>`;
    }).join('') : '';

    div.innerHTML = `
      ${avatarHtml}
      <div class="activity-content">
        <div class="activity-message">
          <div>
            <div class="activity-description">
              ${item.user ? `<strong>${escapeHtml(item.user)}</strong> ` : ''}<span>${escapeHtml(item.action)}</span>
            </div>
            ${item.details ? `<div class="activity-description-secondary">${escapeHtml(item.details)}</div>` : ''}
          </div>
          <div class="activity-time">${formatTimeAgo(new Date(item.timestamp))}</div>
        </div>
        ${metadataHtml ? `<div class="activity-action">${metadataHtml}</div>` : ''}
      </div>
    `;

    return div;
  }

  /**
   * Format timestamp as relative time (e.g., "2 hours ago").
   */
  function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  /* ── Quick Stats Rendering ────────────────────────────────────── */

  /**
   * Render quick statistics into the stats-row container.
   * @param {object} statsData - Response from /api/dashboard/stats
   */
  function renderQuickStats(statsData) {
    const container = document.getElementById('stats-row');
    if (!container) return;

    const cards = container.querySelectorAll('.stat-card');

    const statKeys = [
      { key: 'active_files', containerSelector: '[data-stat="files"]' },
      { key: 'team_members', containerSelector: '[data-stat="team"]' },
      { key: 'sprint_progress', containerSelector: '[data-stat="sprint"]' },
      { key: 'github_stars', containerSelector: '[data-stat="stars"]' }
    ];

    statKeys.forEach((stat, idx) => {
      const card = cards[idx];
      if (!card || !statsData[stat.key]) return;

      const data = statsData[stat.key];
      const numberEl = card.querySelector('[data-stat]');
      if (numberEl) {
        numberEl.textContent = data.value;
        numberEl.setAttribute('title', data.details || '');
      }

      const labelEl = card.querySelector('.stat-label');
      if (labelEl) labelEl.textContent = data.label;
    });
  }

  /* ── Main Loading & Orchestration ───────────────────────────── */

  /**
   * Load all dashboard data and render to page.
   * Shows toast on success/error.
   */
  async function loadDashboardData() {
    try {
      console.log('[Dashboard] Loading data...');
      showToast('Loading dashboard data...', 'info', 0);

      // Fetch all 4 endpoints in parallel
      const [health, metrics, activity, stats] = await Promise.all([
        fetchDashboardData('health'),
        fetchDashboardData('metrics'),
        fetchDashboardData('activity'),
        fetchDashboardData('stats')
      ]);

      // Render all sections
      renderHealthOverview(health);
      renderMetricsShowcase(metrics);
      renderActivityFeed(activity);
      renderQuickStats(stats);

      console.log('[Dashboard] Data loaded successfully');
      showToast('Dashboard updated successfully', 'success', 3000);
    } catch (err) {
      console.error('[Dashboard] Error loading data:', err);
      showToast(`Failed to load dashboard: ${err.message}`, 'error', 5000);
    }
  }

  /**
   * Initialize dashboard on page load.
   */
  function initialize() {
    console.log('[Dashboard] Initializing...');

    // Load initial data
    loadDashboardData();

    // Attach refresh button handlers
    const btnRefreshHealth = document.getElementById('btn-refresh-health');
    if (btnRefreshHealth) {
      btnRefreshHealth.addEventListener('click', async (e) => {
        e.preventDefault();
        btnRefreshHealth.disabled = true;
        try {
          const health = await fetchDashboardData('health');
          renderHealthOverview(health);
          showToast('Health data refreshed', 'success', 2000);
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error', 3000);
        } finally {
          btnRefreshHealth.disabled = false;
        }
      });
    }

    const btnRefreshMetrics = document.getElementById('btn-refresh-metrics');
    if (btnRefreshMetrics) {
      btnRefreshMetrics.addEventListener('click', async (e) => {
        e.preventDefault();
        btnRefreshMetrics.disabled = true;
        try {
          const metrics = await fetchDashboardData('metrics');
          renderMetricsShowcase(metrics);
          showToast('Metrics refreshed', 'success', 2000);
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error', 3000);
        } finally {
          btnRefreshMetrics.disabled = false;
        }
      });
    }

    const btnRefreshActivity = document.getElementById('btn-refresh-activity');
    if (btnRefreshActivity) {
      btnRefreshActivity.addEventListener('click', async (e) => {
        e.preventDefault();
        btnRefreshActivity.disabled = true;
        try {
          const activity = await fetchDashboardData('activity');
          renderActivityFeed(activity);
          showToast('Activity feed refreshed', 'success', 2000);
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error', 3000);
        } finally {
          btnRefreshActivity.disabled = false;
        }
      });
    }

    // Set up optional auto-refresh
    // Uncomment to enable 1-minute auto-refresh:
    // setInterval(loadDashboardData, REFRESH_INTERVAL_MS);

    console.log('[Dashboard] Initialization complete');
  }

  /* ── Helper: Capitalize First Letter ──────────────────────── */

  function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* ── Module Export ───────────────────────────────────────────── */

  // Expose public API
  window.Dashboard = {
    loadData: loadDashboardData,
    renderHealthOverview,
    renderMetricsShowcase,
    renderActivityFeed,
    renderQuickStats,
    showToast,
    initialize
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})(window);
