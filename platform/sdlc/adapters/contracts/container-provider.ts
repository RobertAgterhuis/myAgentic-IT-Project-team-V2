// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Container Provider Contract
 *
 * Formal interface for container build and registry operations:
 * build images, push, pull, tag, and scan for vulnerabilities.
 *
 * @module sdlc/adapters/contracts/container-provider
 */

// ─── Capability Flags ────────────────────────────────────────

export interface ContainerCapabilities {
  supportsScan: boolean;
  supportsPull: boolean;
  supportsMultiPlatform: boolean;
  supportsInspect: boolean;
}

// ─── Input / Output Types ────────────────────────────────────

export interface BuildInput {
  image: string;
  tag?: string;
  context?: string;
  dockerfile?: string;
  buildArgs?: Record<string, string>;
}

export interface BuildResult {
  image: string;
  tag: string;
  context: string;
  exit_code: number;
}

export interface PushResult {
  image: string;
  pushed: boolean;
}

export interface ImageInfo {
  repository: string;
  tag: string;
  id: string;
  size: string;
}

export interface ScanResult {
  image: string;
  vulnerabilities: unknown[];
  scanner: string;
}

export interface TagResult {
  source: string;
  target: string;
  tagged: boolean;
}

// ─── Error Classification ────────────────────────────────────

export type ContainerErrorKind =
  | 'DAEMON_UNAVAILABLE'
  | 'IMAGE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'INVALID_INPUT'
  | 'UNKNOWN';

export interface ContainerError {
  kind: ContainerErrorKind;
  message: string;
  detail?: string;
}

// ─── Provider Interface ──────────────────────────────────────

export interface ContainerProvider {
  readonly providerName: string;
  readonly capabilities: ContainerCapabilities;

  build(input: BuildInput): Promise<BuildResult>;
  push(image: string, tag?: string): Promise<PushResult>;
  pull(image: string, tag?: string): Promise<PushResult>;
  tag(source: string, target: string): Promise<TagResult>;
  listImages(filter?: string): Promise<ImageInfo[]>;
  scan(image: string): Promise<ScanResult>;
}
