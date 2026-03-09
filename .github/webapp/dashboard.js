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
  const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

  const TABLE_PAGE_SIZE = 5;

  const milestoneState = {
    rows: [],
    sortKey: 'completion',
    sortDir: 'desc',
    query: '',
    status: 'all',
    completionStart: '',
    completionEnd: '',
    progressMin: 0,
    page: 1,
    pageSize: TABLE_PAGE_SIZE
  };

  let activeLoadingToast = null;

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

  function showLoadingToast() {
    if (activeLoadingToast && activeLoadingToast.parentElement) {
      activeLoadingToast.remove();
    }
    activeLoadingToast = showToast('Loading dashboard data...', 'info', 0) || null;
  }

  function clearLoadingToast() {
    if (activeLoadingToast && activeLoadingToast.parentElement) {
      activeLoadingToast.remove();
    }
    activeLoadingToast = null;
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

    // eslint-disable-next-line complexity
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

    // eslint-disable-next-line complexity
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
  // eslint-disable-next-line complexity
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

    const metadataHtml = item.metadata ? Object.entries(item.metadata).map(([_k, v]) => {
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

  /* ── Milestone Table Interactions (SP-8) ────────────────────── */

  function initializeMilestoneTable() {
    const body = document.getElementById('milestone-table-body');
    if (!body) return;

    milestoneState.rows = Array.from(body.querySelectorAll('tr')).map(parseMilestoneRow);

    bindMilestoneSortHandlers();
    bindMilestoneFilterHandlers();
    bindMilestonePaginationHandlers();
    bindMilestoneExportHandler();
    bindMilestoneRowActionHandlers();

    applyMilestoneTableState();
  }

  function bindMilestoneSortHandlers() {
    const headers = document.querySelectorAll('#milestone-table th[data-sort-key]');
    headers.forEach((header) => {
      const onSort = () => {
        const key = header.getAttribute('data-sort-key');
        if (!key) return;
        if (milestoneState.sortKey === key) {
          milestoneState.sortDir = milestoneState.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          milestoneState.sortKey = key;
          milestoneState.sortDir = key === 'completion' ? 'desc' : 'asc';
        }
        milestoneState.page = 1;
        applyMilestoneTableState();
      };

      header.addEventListener('click', onSort);
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort();
        }
      });
    });
  }

  // eslint-disable-next-line complexity
  function parseMilestoneRow(row, index) {
    const milestone = row.getAttribute('data-milestone') || row.cells[0]?.textContent?.trim() || '';
    const status = (row.getAttribute('data-status') || '').toLowerCase();
    const progress = Number.parseInt(row.getAttribute('data-progress') || '0', 10) || 0;
    const completion = row.getAttribute('data-completion') || row.cells[3]?.textContent?.trim() || '';
    return { id: `row-${index + 1}`, milestone, status, progress, completion, element: row };
  }

  function bindIfPresent(element, eventName, handler) {
    if (!element) return;
    element.addEventListener(eventName, handler);
  }

  function resetMilestoneFilters(searchInput, statusSelect, completionStart, completionEnd, progressSlider) {
    if (searchInput) searchInput.value = '';
    if (statusSelect) statusSelect.value = 'all';
    if (completionStart) completionStart.value = '';
    if (completionEnd) completionEnd.value = '';
    if (progressSlider) progressSlider.value = '0';

    milestoneState.query = '';
    milestoneState.status = 'all';
    milestoneState.completionStart = '';
    milestoneState.completionEnd = '';
    milestoneState.progressMin = 0;
    milestoneState.page = 1;

    updateMilestoneProgressLabel();
    applyMilestoneTableState();
  }

  function bindMilestoneFilterHandlers() {
    const filterToggle = document.getElementById('btn-filter-milestones');
    const filterPanel = document.getElementById('milestone-filters');
    const searchInput = document.getElementById('milestone-search');
    const statusSelect = document.getElementById('milestone-status-filter');
    const completionStart = document.getElementById('milestone-completion-start');
    const completionEnd = document.getElementById('milestone-completion-end');
    const progressSlider = document.getElementById('milestone-progress-slider');
    const resetButton = document.getElementById('btn-reset-milestone-filters');

    if (filterToggle && filterPanel) {
      filterToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const isVisible = filterPanel.style.display !== 'none';
        filterPanel.style.display = isVisible ? 'none' : 'flex';
      });
    }

    if (searchInput) {
      let searchDebounce;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
          milestoneState.query = (searchInput.value || '').trim().toLowerCase();
          milestoneState.page = 1;
          applyMilestoneTableState();
        }, 150);
      });
    }

    bindIfPresent(statusSelect, 'change', () => {
      milestoneState.status = statusSelect.value;
      milestoneState.page = 1;
      applyMilestoneTableState();
    });

    bindIfPresent(completionStart, 'change', () => {
      milestoneState.completionStart = completionStart.value;
      milestoneState.page = 1;
      applyMilestoneTableState();
    });

    bindIfPresent(completionEnd, 'change', () => {
      milestoneState.completionEnd = completionEnd.value;
      milestoneState.page = 1;
      applyMilestoneTableState();
    });

    bindIfPresent(progressSlider, 'input', () => {
      milestoneState.progressMin = Number.parseInt(progressSlider.value, 10);
      updateMilestoneProgressLabel();
      milestoneState.page = 1;
      applyMilestoneTableState();
    });

    bindIfPresent(resetButton, 'click', (e) => {
      e.preventDefault();
      resetMilestoneFilters(searchInput, statusSelect, completionStart, completionEnd, progressSlider);
    });
  }

  function bindMilestonePaginationHandlers() {
    const prev = document.getElementById('btn-milestone-prev');
    const next = document.getElementById('btn-milestone-next');

    if (prev) {
      prev.addEventListener('click', () => {
        milestoneState.page = Math.max(1, milestoneState.page - 1);
        applyMilestoneTableState();
      });
    }

    if (next) {
      next.addEventListener('click', () => {
        const filtered = getFilteredAndSortedRows();
        const maxPage = Math.max(1, Math.ceil(filtered.length / milestoneState.pageSize));
        milestoneState.page = Math.min(maxPage, milestoneState.page + 1);
        applyMilestoneTableState();
      });
    }
  }

  function bindMilestoneExportHandler() {
    const btnExport = document.getElementById('btn-export-milestones');
    if (!btnExport) return;

    btnExport.addEventListener('click', (e) => {
      e.preventDefault();
      const rows = getFilteredAndSortedRows();
      if (rows.length === 0) {
        showToast('No visible milestones to export', 'warning', 2500);
        return;
      }

      const header = ['Milestone', 'Status', 'Progress', 'Completion'];
      const csvRows = [header.join(',')];
      rows.forEach((row) => {
        csvRows.push([
          csvEscape(row.milestone),
          csvEscape(row.status),
          csvEscape(`${row.progress}%`),
          csvEscape(row.completion)
        ].join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `milestones-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast('Milestones exported as CSV', 'success', 2500);
    });
  }

  // Track which row's menu is currently open for single-open behavior (SP-8.3)
  let currentMenuTrigger = null;

  function bindMilestoneRowActionHandlers() {
    const body = document.getElementById('milestone-table-body');
    if (!body) return;

    // Delegate click events on row action buttons (⋯ "More options" button)
    body.addEventListener('click', (e) => {
      const moreOptionsBtn = e.target.closest('.row-action-btn[title="More options"]');
      if (!moreOptionsBtn) return;

      e.preventDefault();
      e.stopPropagation();

      const row = e.target.closest('tr');
      if (!row) return;

      const milestone = row.getAttribute('data-milestone');

      // Close previous menu if open
      if (currentMenuTrigger && currentMenuTrigger !== moreOptionsBtn) {
        closeRowActionMenu();
      }

      // Toggle menu for this row
      const menu = document.getElementById('row-action-menu');
      const isOpen = menu.style.display !== 'none';

      if (isOpen) {
        closeRowActionMenu();
        return;
      }

      // Open menu and position it near the button
      currentMenuTrigger = moreOptionsBtn;
      const rect = moreOptionsBtn.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 4}px`;
      menu.style.left = `${rect.left}px`;
      menu.setAttribute('data-milestone', milestone);
      menu.style.display = 'block';
      menu.setAttribute('aria-hidden', 'false');

      // Focus first menu item for keyboard navigation
      const firstItem = menu.querySelector('[role="menuitem"]');
      if (firstItem) firstItem.focus();

      // Close menu on Escape
      const onEscape = (ev) => {
        if (ev.key === 'Escape') {
          closeRowActionMenu();
          document.removeEventListener('keydown', onEscape);
          moreOptionsBtn.focus(); // Return focus to trigger
        }
      };
      document.addEventListener('keydown', onEscape);

      // Close menu on outside click
      const onOutsideClick = (ev) => {
        if (!menu.contains(ev.target) && ev.target !== moreOptionsBtn) {
          closeRowActionMenu();
          document.removeEventListener('click', onOutsideClick);
        }
      };
      // Delay to avoid immediate closure from current click
      setTimeout(() => {
        document.addEventListener('click', onOutsideClick);
      }, 0);
    });

    // Handle menu item clicks (View, Edit, Delete)
    const menu = document.getElementById('row-action-menu');
    menu.addEventListener('click', (e) => {
      const menuItem = e.target.closest('[data-action]');
      if (!menuItem) return;

      e.preventDefault();
      e.stopPropagation();

      const action = menuItem.getAttribute('data-action');
      const milestone = menu.getAttribute('data-milestone');
      handleRowAction(action, milestone);
    });
  }

  function handleRowAction(action, milestone) {
    const row = document.querySelector(`#milestone-table-body tr[data-milestone="${milestone}"]`);
    if (!row) {
      showToast('Milestone row not found', 'error', 2500);
      closeRowActionMenu();
      return;
    }

    if (action === 'view') {
      showMilestoneDetailModal(milestone);
    } else if (action === 'edit') {
      const milestoneId = row.getAttribute('data-id') || milestone;
      const status = row.getAttribute('data-status');
      const progress = row.getAttribute('data-progress');
      const completion = row.getAttribute('data-completion');
      openMilestoneEditModal(milestoneId, milestone, status, progress, completion);
    } else if (action === 'delete') {
      const milestoneId = row.getAttribute('data-id') || milestone;
      deleteMilestoneWithAPI(milestoneId, milestone);
    }

    closeRowActionMenu();
    if (currentMenuTrigger) currentMenuTrigger.focus();
  }

  function closeRowActionMenu() {
    const menu = document.getElementById('row-action-menu');
    menu.style.display = 'none';
    menu.setAttribute('aria-hidden', 'true');
    currentMenuTrigger = null;
  }

  function showMilestoneDetailModal(milestone) {
    const row = milestoneState.rows.find((r) => r.milestone === milestone);
    if (!row) return;

    document.getElementById('milestone-detail-title').textContent = `${milestone} Details`;
    document.getElementById('detail-milestone').textContent = row.milestone;
    document.getElementById('detail-status').textContent = row.status;
    document.getElementById('detail-progress').textContent = `${row.progress}%`;
    document.getElementById('detail-completion').textContent = row.completion;

    const modal = document.getElementById('milestone-detail-modal');
    modal.style.display = 'flex';
    modal.classList.add('open');

    // Focus first inner button for keyboard navigation
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();

    // Close modal on Escape
    const onEscape = (ev) => {
      if (ev.key === 'Escape') {
        closeMilestoneDetailModal();
        document.removeEventListener('keydown', onEscape);
      }
    };
    document.addEventListener('keydown', onEscape);
  }

  function closeMilestoneDetailModal() {
    const modal = document.getElementById('milestone-detail-modal');
    modal.style.display = 'none';
    modal.classList.remove('open');
  }

  function matchesMilestoneQuery(row, query) {
    return !query || row.milestone.toLowerCase().includes(query);
  }

  function matchesMilestoneStatus(row, statusFilter) {
    return statusFilter === 'all' || row.status === statusFilter;
  }

  function matchesMilestoneDateRange(row, completionStart, completionEnd) {
    if (!completionStart && !completionEnd) return true;
    if (!row.completion) return false;

    const rowDate = new Date(row.completion);
    if (completionStart && rowDate < completionStart) return false;
    if (completionEnd && rowDate > completionEnd) return false;
    return true;
  }

  function matchesMilestoneProgress(row, progressMin) {
    return !progressMin || row.progress >= progressMin;
  }

  function getFilteredAndSortedRows() {
    const query = milestoneState.query;
    const statusFilter = milestoneState.status;
    const completionStart = milestoneState.completionStart ? new Date(milestoneState.completionStart) : null;
    const completionEnd = milestoneState.completionEnd ? new Date(milestoneState.completionEnd) : null;
    const progressMin = milestoneState.progressMin || 0;

    const filtered = milestoneState.rows.filter((row) => (
      matchesMilestoneQuery(row, query)
      && matchesMilestoneStatus(row, statusFilter)
      && matchesMilestoneDateRange(row, completionStart, completionEnd)
      && matchesMilestoneProgress(row, progressMin)
    ));

    const sorted = filtered.sort((a, b) => {
      const dir = milestoneState.sortDir === 'asc' ? 1 : -1;
      const key = milestoneState.sortKey;

      if (key === 'progress') return (a.progress - b.progress) * dir;
      if (key === 'completion') return (new Date(a.completion) - new Date(b.completion)) * dir;

      const left = String(a[key] || '').toLowerCase();
      const right = String(b[key] || '').toLowerCase();
      if (left < right) return -1 * dir;
      if (left > right) return 1 * dir;
      return 0;
    });

    return sorted;
  }

  function applyMilestoneTableState() {
    const body = document.getElementById('milestone-table-body');
    if (!body) return;

    const sortedRows = getFilteredAndSortedRows();
    const total = sortedRows.length;
    const maxPage = Math.max(1, Math.ceil(total / milestoneState.pageSize));
    milestoneState.page = Math.min(milestoneState.page, maxPage);

    const start = (milestoneState.page - 1) * milestoneState.pageSize;
    const end = start + milestoneState.pageSize;
    const pagedRows = sortedRows.slice(start, end);

    milestoneState.rows.forEach((row) => {
      row.element.style.display = 'none';
    });
    pagedRows.forEach((row) => {
      row.element.style.display = '';
      body.appendChild(row.element);
    });

    updateMilestoneSortIndicators();
    updateMilestoneResultCount(total, start, end);
    updateMilestonePagination(total, maxPage);
  }

  function updateMilestoneProgressLabel() {
    const label = document.getElementById('milestone-progress-label');
    const slider = document.getElementById('milestone-progress-slider');
    if (!label || !slider) return;
    
    const min = Number.parseInt(slider.value, 10);
    label.textContent = min > 0 ? `${min}%–100%` : 'All progress';
  }

  function updateMilestoneSortIndicators() {
    const headers = document.querySelectorAll('#milestone-table th[data-sort-key]');
    headers.forEach((header) => {
      const key = header.getAttribute('data-sort-key');
      const isActive = key === milestoneState.sortKey;
      header.setAttribute('aria-sort', isActive ? (milestoneState.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
      header.classList.toggle('active', isActive);
    });
  }

  function updateMilestoneResultCount(total, start, end) {
    const count = document.getElementById('milestone-results-count');
    if (!count) return;

    if (total === 0) {
      count.textContent = '0 results';
      return;
    }

    const startDisplay = start + 1;
    const endDisplay = Math.min(end, total);
    count.textContent = `Showing ${startDisplay}-${endDisplay} of ${total} results`;
  }

  function updateMilestonePagination(total, maxPage) {
    const indicator = document.getElementById('milestone-page-indicator');
    const prev = document.getElementById('btn-milestone-prev');
    const next = document.getElementById('btn-milestone-next');

    if (indicator) indicator.textContent = `Page ${milestoneState.page} of ${maxPage}`;
    if (prev) prev.disabled = milestoneState.page <= 1 || total === 0;
    if (next) next.disabled = milestoneState.page >= maxPage || total === 0;
  }

  function csvEscape(value) {
    const s = String(value ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  /* ── Main Loading & Orchestration ───────────────────────────── */

  /**
   * Load all dashboard data and render to page.
   * Shows toast on success/error.
   */
  async function loadDashboardData() {
    try {
      console.log('[Dashboard] Loading data...');
      showLoadingToast();

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
    } finally {
      clearLoadingToast();
    }
  }

  /**
   * Initialize dashboard on page load.
   */
  function initialize() {
    console.log('[Dashboard] Initializing...');

    // Load initial data
    loadDashboardData();
    initializeMilestoneTable();
    initializeMilestoneModals();
    updateMilestoneProgressLabel();

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

  /* ── Milestone Create Modal (SP-9.8) ──────────────────────── */

  function openMilestoneCreateModal() {
    const modal = document.getElementById('milestone-create-modal');
    const form = document.getElementById('milestone-create-form');
    
    form.reset();
    document.getElementById('create-progress-label').textContent = '0';
    document.getElementById('create-form-errors').style.display = 'none';
    document.getElementById('create-form-errors').textContent = '';
    document.getElementById('create-name-error').textContent = '';
    document.getElementById('create-completion-error').textContent = '';
    
    modal.style.display = 'flex';
    modal.classList.add('open');
    
    const nameInput = document.getElementById('create-milestone-name');
    if (nameInput) nameInput.focus();
    
    // Close modal on Escape
    const onEscape = (ev) => {
      if (ev.key === 'Escape') {
        closeMilestoneCreateModal();
        document.removeEventListener('keydown', onEscape);
      }
    };
    document.addEventListener('keydown', onEscape);
  }

  function closeMilestoneCreateModal() {
    const modal = document.getElementById('milestone-create-modal');
    modal.style.display = 'none';
    modal.classList.remove('open');
    document.getElementById('milestone-create-form').reset();
  }

  function handleMilestoneCreateSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('create-milestone-name').value.trim();
    const status = document.getElementById('create-milestone-status').value;
    const progress = Number.parseInt(document.getElementById('create-milestone-progress').value, 10);
    const completion = document.getElementById('create-milestone-completion').value;
    
    // Clear previous errors
    document.getElementById('create-name-error').textContent = '';
    document.getElementById('create-completion-error').textContent = '';
    document.getElementById('create-form-errors').style.display = 'none';
    
    // Basic validation
    if (!name) {
      document.getElementById('create-name-error').textContent = 'Milestone name is required';
      return;
    }
    if (!completion) {
      document.getElementById('create-completion-error').textContent = 'Completion date is required';
      return;
    }
    
    // Call API to create milestone
    fetch('/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status, progress, completion })
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) {
          const errors = data.details || [data.error];
          document.getElementById('create-form-errors').textContent = errors.join('; ');
          document.getElementById('create-form-errors').style.display = 'block';
          showToast(`Failed to create milestone: ${errors.join('; ')}`, 'error', 3000);
          return;
        }
        
        showToast(`Milestone "${data.data.name}" created successfully`, 'success', 2500);
        closeMilestoneCreateModal();
        reloadMilestoneTable();
      })
      .catch((err) => {
        document.getElementById('create-form-errors').textContent = err.message;
        document.getElementById('create-form-errors').style.display = 'block';
        showToast(`Error: ${err.message}`, 'error', 3000);
      });
  }

  /* ── Milestone Edit Modal (SP-9.4) ───────────────────────── */

  function openMilestoneEditModal(milestoneId, milestoneName, status, progress, completion) {
    const modal = document.getElementById('milestone-edit-modal');
    
    document.getElementById('edit-milestone-id').value = milestoneId;
    document.getElementById('edit-milestone-name').value = milestoneName;
    document.getElementById('edit-milestone-status').value = status;
    document.getElementById('edit-milestone-progress').value = progress;
    document.getElementById('edit-progress-label').textContent = progress;
    document.getElementById('edit-milestone-completion').value = completion;
    
    document.getElementById('edit-form-errors').style.display = 'none';
    document.getElementById('edit-form-errors').textContent = '';
    document.getElementById('edit-name-error').textContent = '';
    document.getElementById('edit-completion-error').textContent = '';
    
    modal.style.display = 'flex';
    modal.classList.add('open');
    
    const nameInput = document.getElementById('edit-milestone-name');
    if (nameInput) nameInput.focus();
    
    const onEscape = (ev) => {
      if (ev.key === 'Escape') {
        closeMilestoneEditModal();
        document.removeEventListener('keydown', onEscape);
      }
    };
    document.addEventListener('keydown', onEscape);
  }

  function closeMilestoneEditModal() {
    const modal = document.getElementById('milestone-edit-modal');
    modal.style.display = 'none';
    modal.classList.remove('open');
    document.getElementById('milestone-edit-form').reset();
  }

  function handleMilestoneEditSubmit(e) {
    e.preventDefault();
    
    const milestoneId = document.getElementById('edit-milestone-id').value;
    const name = document.getElementById('edit-milestone-name').value.trim();
    const status = document.getElementById('edit-milestone-status').value;
    const progress = Number.parseInt(document.getElementById('edit-milestone-progress').value, 10);
    const completion = document.getElementById('edit-milestone-completion').value;
    
    // Clear previous errors
    document.getElementById('edit-name-error').textContent = '';
    document.getElementById('edit-completion-error').textContent = '';
    document.getElementById('edit-form-errors').style.display = 'none';
    
    // Basic validation
    if (!name) {
      document.getElementById('edit-name-error').textContent = 'Milestone name is required';
      return;
    }
    if (!completion) {
      document.getElementById('edit-completion-error').textContent = 'Completion date is required';
      return;
    }
    
    // Call API to update milestone
    fetch(`/api/milestones/${milestoneId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status, progress, completion })
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) {
          const errors = data.details || [data.error];
          document.getElementById('edit-form-errors').textContent = errors.join('; ');
          document.getElementById('edit-form-errors').style.display = 'block';
          showToast(`Failed to update milestone: ${errors.join('; ')}`, 'error', 3000);
          return;
        }
        
        showToast(`Milestone "${data.data.name}" updated successfully`, 'success', 2500);
        closeMilestoneEditModal();
        reloadMilestoneTable();
      })
      .catch((err) => {
        document.getElementById('edit-form-errors').textContent = err.message;
        document.getElementById('edit-form-errors').style.display = 'block';
        showToast(`Error: ${err.message}`, 'error', 3000);
      });
  }

  /* ── Milestone Delete with API (SP-9.5) ───────────────────– */

  function deleteMilestoneWithAPI(milestoneId, milestoneName) {
    if (!window.confirm(`Are you sure you want to delete "${milestoneName}"? This action cannot be undone.`)) {
      return;
    }
    
    // Call API to archive/delete milestone
    fetch(`/api/milestones/${milestoneId}/archive`, {
      method: 'PATCH'
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) {
          const error = data.details?.[0] || data.error || 'Unknown error';
          showToast(`Failed to delete milestone: ${error}`, 'error', 3000);
          return;
        }
        
        showToast(`Milestone "${milestoneName}" archived successfully`, 'success', 2500);
        reloadMilestoneTable();
      })
      .catch((err) => {
        showToast(`Error: ${err.message}`, 'error', 3000);
      });
  }

  /* ── Reload Milestone Table ──────────────────────────────── */

  function reloadMilestoneTable() {
    // Fetch milestones from API and update table
    fetch('/api/milestones')
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) {
          showToast('Failed to reload milestones', 'warning', 2500);
          return;
        }
        
        const body = document.getElementById('milestone-table-body');
        if (!body) return;
        
        // Clear existing rows
        body.innerHTML = '';
        
        // Add rows from API
        (data.data || []).forEach((milestone) => {
          const row = document.createElement('tr');
          row.setAttribute('data-milestone', milestone.name);
          row.setAttribute('data-status', milestone.status);
          row.setAttribute('data-progress', milestone.progress);
          row.setAttribute('data-completion', milestone.completion);
          row.setAttribute('data-id', milestone.id);
          
          const statusBadge = milestone.status === 'complete' ? 'badge-success' 
                            : milestone.status === 'in progress' ? 'badge-info'
                            : milestone.status === 'blocked' ? 'badge-warning'
                            : 'badge-secondary';
          
          const statusLabel = milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1);
          
          row.innerHTML = `
            <td><strong>${milestone.name.split(' ')[0]}</strong> ${milestone.name.substring(milestone.name.indexOf(' ') + 1)}</td>
            <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
            <td>
              <div class="progress-bar" style="height: 6px;">
                <div class="progress-fill" style="width: ${milestone.progress}%; background: var(--success);"></div>
              </div>
            </td>
            <td>${milestone.completion}</td>
            <td>
              <div class="row-actions">
                <button class="row-action-btn" title="View details" onclick="showMilestoneDetailModal('${milestone.name}');">👁</button>
                <button class="row-action-btn" title="More options">⋯</button>
              </div>
            </td>
          `;
          
          body.appendChild(row);
        });
        
        // Reinitialize table interactions
        initializeMilestoneTable();
      })
      .catch((err) => {
        showToast(`Error reloading milestones: ${err.message}`, 'error', 3000);
      });
  }

  /* ── Milestone Modals Initialization ─────────────────────── */

  function initializeMilestoneModals() {
    // Create form submit handler
    const createForm = document.getElementById('milestone-create-form');
    if (createForm) {
      createForm.addEventListener('submit', handleMilestoneCreateSubmit);
    }

    // Edit form submit handler
    const editForm = document.getElementById('milestone-edit-form');
    if (editForm) {
      editForm.addEventListener('submit', handleMilestoneEditSubmit);
    }

    // Create progress slider listener
    const createProgressSlider = document.getElementById('create-milestone-progress');
    if (createProgressSlider) {
      createProgressSlider.addEventListener('input', () => {
        document.getElementById('create-progress-label').textContent = createProgressSlider.value;
      });
    }

    // Edit progress slider listener
    const editProgressSlider = document.getElementById('edit-milestone-progress');
    if (editProgressSlider) {
      editProgressSlider.addEventListener('input', () => {
        document.getElementById('edit-progress-label').textContent = editProgressSlider.value;
      });
    }
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
    initializeMilestoneTable,
    initializeMilestoneModals,
    showToast,
    showMilestoneDetailModal,
    closeMilestoneDetailModal,
    openMilestoneCreateModal,
    closeMilestoneCreateModal,
    openMilestoneEditModal,
    closeMilestoneEditModal,
    deleteMilestoneWithAPI,
    reloadMilestoneTable,
    initialize
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})(window);
