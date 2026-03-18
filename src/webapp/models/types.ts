// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Domain model type definitions (M32-003).
 *
 * Explicit TypeScript interfaces for all domain types used
 * across the questionnaire, decision, and session models.
 */

/* ── Questionnaire types ──────────────────────────────────────── */

export interface QuestionnaireMetadata {
  agent: string;
  phase: string;
  generated: string;
  version: string;
}

export interface QuestionStatusEntry {
  status: string;
  lastUpdated: string;
}

export interface QuestionItem {
  id: string;
  classification: string;
  question: string;
  whyNeeded: string;
  expectedFormat: string;
  example: string;
  answer: string;
  section: string;
  status: string;
  lastUpdated: string;
}

export interface QuestionnaireSection {
  title: string;
  questions: QuestionItem[];
}

export interface ParsedQuestionnaire {
  file: string;
  agent: string;
  phase: string;
  generated: string;
  version: string;
  sections: QuestionnaireSection[];
  questions: QuestionItem[];
}

/* ── Decision types ───────────────────────────────────────────── */

export interface DecisionItem {
  id: string;
  type: string;
  status: string;
  priority?: string;
  scope: string;
  question?: string;
  answer?: string;
  decision?: string;
  notes?: string;
  subject?: string;
  reason?: string;
  date: string;
  category?: string;
}

export interface ParsedDecisions {
  open: DecisionItem[];
  decided: DecisionItem[];
  deferred: DecisionItem[];
}

export interface IndexSection {
  heading: string;
  idPattern: string;
}

export interface ParseDecisionsOptions {
  indexSections?: IndexSection[];
}

export interface CategoryHeader {
  name: string;
  stack: string;
  status: string;
  applicable: string;
  reason: string;
}

export interface OpenQuestionEntry {
  id: string;
  priority: string;
  scope: string;
  question: string;
  answer?: string;
  date: string;
}

export interface OperationalDecisionEntry {
  id: string;
  priority: string;
  scope: string;
  decision: string;
  notes?: string;
  date: string;
}

export interface EditDecidedFields {
  priority?: string;
  scope?: string;
  text?: string;
  notes?: string;
}
