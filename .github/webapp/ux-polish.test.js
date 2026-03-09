// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';
/* global describe, it, expect */
const fs = require('fs');
const path = require('path');

/**
 * UX Polish Tests — SP-7 (UX-04 Loading State + UX-05 Empty State)
 *
 * Validates:
 *   UX-04: Button loading pattern (CSS + JS helper + wiring)
 *   UX-05: Enhanced empty states with guided steps (questionnaires + decisions)
 *   Skeleton loaders for decisions panel
 */

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
const css = styleMatch ? styleMatch[1] : '';

const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = scriptMatch ? scriptMatch[1] : '';

/* ═══ UX-04: Button Loading State — CSS ══════════════ */

describe('UX-04: Button loading CSS', () => {
  it('.btn-loading class exists with position: relative', () => {
    expect(css).toMatch(/\.btn-loading\s*\{[^}]*position:\s*relative/);
  });

  it('.btn-loading hides text via color: transparent', () => {
    expect(css).toMatch(/\.btn-loading\s*\{[^}]*color:\s*transparent/);
  });

  it('.btn-loading disables interaction via pointer-events: none', () => {
    expect(css).toMatch(/\.btn-loading\s*\{[^}]*pointer-events:\s*none/);
  });

  it('.btn-loading::after spinner pseudo-element exists', () => {
    expect(css).toMatch(/\.btn-loading::after\s*\{/);
  });

  it('spinner uses border-radius for circular shape', () => {
    expect(css).toMatch(/\.btn-loading::after\s*\{[^}]*border-radius:/);
  });

  it('spinner uses @keyframes spin animation', () => {
    expect(css).toMatch(/@keyframes\s+spin\s*\{/);
  });

  it('.btn-loading::after references spin animation', () => {
    expect(css).toMatch(/\.btn-loading::after\s*\{[^}]*animation:\s*spin/);
  });
});

/* ═══ UX-04: Button Loading State — JS Helper ════════ */

describe('UX-04: setBtnLoading helper', () => {
  it('setBtnLoading function is defined', () => {
    expect(js).toMatch(/function setBtnLoading\s*\(\s*btn\s*,\s*loading\s*\)/);
  });

  it('adds btn-loading class when loading=true', () => {
    expect(js).toMatch(/classList\.add\(\s*['"]btn-loading['"]\s*\)/);
  });

  it('removes btn-loading class when loading=false', () => {
    expect(js).toMatch(/classList\.remove\(\s*['"]btn-loading['"]\s*\)/);
  });

  it('sets aria-busy=true when loading', () => {
    expect(js).toMatch(/setAttribute\(\s*['"]aria-busy['"]\s*,\s*['"]true['"]\s*\)/);
  });

  it('sets aria-busy=false when done', () => {
    expect(js).toMatch(/setAttribute\(\s*['"]aria-busy['"]\s*,\s*['"]false['"]\s*\)/);
  });

  it('disables button when loading', () => {
    expect(js).toMatch(/setBtnLoading[\s\S]*?btn\.disabled\s*=\s*true/);
  });

  it('re-enables button when done', () => {
    expect(js).toMatch(/setBtnLoading[\s\S]*?btn\.disabled\s*=\s*false/);
  });
});

/* ═══ UX-04: Loading State Wiring — Save Buttons ═════ */

describe('UX-04: Save button loading wiring', () => {
  it('saveBtn uses setBtnLoading in delegated click handler', () => {
    expect(js).toMatch(/saveBtn[\s\S]*?setBtnLoading\(\s*saveBtn\s*,\s*true\s*\)/);
  });

  it('saveBtn restores via .finally(() => setBtnLoading(saveBtn, false))', () => {
    expect(js).toMatch(/saveOne[\s\S]*?\.finally\(\s*\(\)\s*=>\s*setBtnLoading\(\s*saveBtn\s*,\s*false\s*\)\s*\)/);
  });

  it('saveAllBtn uses setBtnLoading in delegated click handler', () => {
    expect(js).toMatch(/saveAllBtn[\s\S]*?setBtnLoading\(\s*saveAllBtn\s*,\s*true\s*\)/);
  });

  it('btnSaveAll global uses setBtnLoading', () => {
    expect(js).toMatch(/btnSaveAll[\s\S]*?setBtnLoading\(\s*this\s*,\s*true\s*\)/);
  });
});

/* ═══ UX-04: Loading State Wiring — Decision Buttons ═ */

describe('UX-04: Decision button loading wiring', () => {
  it('answerDecision button uses setBtnLoading', () => {
    expect(js).toMatch(/ansBtn[\s\S]*?setBtnLoading\(\s*ansBtn\s*,\s*true\s*\)[\s\S]*?answerDecision/);
  });

  it('decideDecision button uses setBtnLoading', () => {
    expect(js).toMatch(/decBtn[\s\S]*?setBtnLoading\(\s*decBtn\s*,\s*true\s*\)[\s\S]*?decideDecision/);
  });

  it('deferDecision button uses setBtnLoading', () => {
    expect(js).toMatch(/defBtn[\s\S]*?setBtnLoading\(\s*defBtn\s*,\s*true\s*\)[\s\S]*?deferDecision/);
  });

  it('expireDecision button uses setBtnLoading', () => {
    expect(js).toMatch(/expBtn[\s\S]*?setBtnLoading\(\s*expBtn\s*,\s*true\s*\)[\s\S]*?expireDecision/);
  });

  it('reopenDecision button uses setBtnLoading', () => {
    expect(js).toMatch(/reopBtn[\s\S]*?setBtnLoading\(\s*reopBtn\s*,\s*true\s*\)[\s\S]*?reopenDecision/);
  });

  it('activateDeferredCategory button uses setBtnLoading', () => {
    expect(js).toMatch(/actCatBtn[\s\S]*?setBtnLoading\(\s*actCatBtn\s*,\s*true\s*\)[\s\S]*?activateDeferredCategory/);
  });

  it('decision buttons check !btn.disabled before firing', () => {
    expect(js).toMatch(/ansBtn\s*&&\s*!ansBtn\.disabled/);
    expect(js).toMatch(/decBtn\s*&&\s*!decBtn\.disabled/);
    expect(js).toMatch(/defBtn\s*&&\s*!defBtn\.disabled/);
  });
});

/* ═══ UX-04: Loading State Wiring — Modal Buttons ════ */

describe('UX-04: Modal button loading wiring', () => {
  it('btnConfirmNewDec uses setBtnLoading', () => {
    expect(js).toMatch(/btnConfirmNewDec[\s\S]*?setBtnLoading\(\s*btn\s*,\s*true\s*\)[\s\S]*?createDecision/);
  });

  it('btnConfirmReeval uses setBtnLoading', () => {
    expect(js).toMatch(/btnConfirmReeval[\s\S]*?setBtnLoading\(\s*btn\s*,\s*true\s*\)[\s\S]*?doReeval/);
  });

  it('btnConfirmEditDec uses setBtnLoading', () => {
    expect(js).toMatch(/btnConfirmEditDec[\s\S]*?setBtnLoading\(\s*btn\s*,\s*true\s*\)[\s\S]*?saveEditDecision/);
  });
});

/* ═══ UX-05: Enhanced Empty States — STRINGS ═════════ */

describe('UX-05: Empty state STRINGS', () => {
  it('noQuestionnairesSteps array is defined', () => {
    expect(js).toMatch(/noQuestionnairesSteps:\s*\[/);
  });

  it('noQuestionnairesSteps has multiple step entries', () => {
    const match = js.match(/noQuestionnairesSteps:\s*\[([\s\S]*?)\],/);
    expect(match).toBeTruthy();
    const commas = match[1].match(/,/g);
    expect(commas.length).toBeGreaterThanOrEqual(3);
  });

  it('noDecisionsSteps array is defined', () => {
    expect(js).toMatch(/noDecisionsSteps:\s*\[/);
  });

  it('noDecisionsSteps has multiple step entries', () => {
    const match = js.match(/noDecisionsSteps:\s*\[([\s\S]*?)\]/);
    expect(match).toBeTruthy();
    const steps = match[1].split("'").filter(s => s.trim().length > 10);
    expect(steps.length).toBeGreaterThanOrEqual(2);
  });
});

/* ═══ UX-05: Enhanced Empty States — Questionnaires ══ */

describe('UX-05: Questionnaire empty state rendering', () => {
  it('renderEmpty() uses empty-steps ordered list', () => {
    expect(js).toMatch(/renderEmpty[\s\S]*?empty-steps/);
  });

  it('renderEmpty() maps noQuestionnairesSteps into list items', () => {
    expect(js).toMatch(/noQuestionnairesSteps[\s\S]*?map\s*\(/);
  });

  it('renderEmpty() includes empty-action wrapper', () => {
    expect(js).toMatch(/renderEmpty[\s\S]*?empty-action/);
  });

  it('renderEmpty() includes empty-icon', () => {
    expect(js).toMatch(/renderEmpty[\s\S]*?empty-icon/);
  });

  it('renderEmpty() includes empty-title', () => {
    expect(js).toMatch(/renderEmpty[\s\S]*?empty-title/);
  });
});

/* ═══ UX-05: Enhanced Empty States — Decisions ═══════ */

describe('UX-05: Decisions empty state rendering', () => {
  it('renderDecisions shows noDecisionsSteps when no decisions exist', () => {
    expect(js).toMatch(/noDecisionsSteps[\s\S]*?map\s*\(/);
  });

  it('renderDecisions distinguishes filter-empty from truly-empty', () => {
    expect(js).toMatch(/isFilterEmpty[\s\S]*?noMatchFilters/);
  });

  it('renderDecisions only shows steps in truly-empty state (not filter-empty)', () => {
    expect(js).toMatch(/!isFilterEmpty[\s\S]*?noDecisionsSteps/);
  });
});

/* ═══ UX-05: Empty State CSS ═════════════════════════ */

describe('UX-05: Empty state CSS classes', () => {
  it('.empty-action class exists', () => {
    expect(css).toMatch(/\.empty-action\s*\{/);
  });

  it('.empty-steps class exists', () => {
    expect(css).toMatch(/\.empty-steps\s*\{/);
  });

  it('.empty-steps li has counter-based numbering', () => {
    expect(css).toMatch(/\.empty-steps\s+li::before[\s\S]*?counter/);
  });

  it('.empty-steps li::before uses primary color', () => {
    expect(css).toMatch(/\.empty-steps\s+li::before[\s\S]*?var\(--primary\)/);
  });

  it('.empty-steps uses counter-reset', () => {
    expect(css).toMatch(/\.empty-steps\s*\{[^}]*counter-reset/);
  });
});

/* ═══ UX-04: Decisions Skeleton Loader ═══════════════ */

describe('UX-04: Decisions skeleton loader', () => {
  it('load() shows skeleton in decisions panel on first load', () => {
    expect(js).toMatch(/decMain[\s\S]*?skeleton-card[\s\S]*?skeleton-line/);
  });

  it('load() sets aria-busy=true on decMain during skeleton', () => {
    expect(js).toMatch(/decMain[\s\S]*?setAttribute\(\s*['"]aria-busy['"]\s*,\s*['"]true['"]\s*\)/);
  });

  it('load() clears aria-busy on decMain after load', () => {
    expect(js).toMatch(/decMain[\s\S]*?setAttribute\(\s*['"]aria-busy['"]\s*,\s*['"]false['"]\s*\)/);
  });
});
