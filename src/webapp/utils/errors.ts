// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Standardized error response format for the API.
 * Each error includes: code, message (user-friendly), and recovery action.
 */

interface ErrorEntry {
  message: string;
  recovery: string;
}

export const ERROR_CATALOG: Record<string, ErrorEntry> = {
  VALIDATION_ERROR: {
    message: 'The request contains invalid data.',
    recovery: 'Check your input and try again.',
  },
  FILE_NOT_FOUND: {
    message: 'The requested file was not found.',
    recovery: 'Refresh the page to reload the latest data.',
  },
  DECISIONS_NOT_FOUND: {
    message: 'The decisions file is missing.',
    recovery: 'Ensure decisions.md exists in your workspace.',
  },
  INVALID_ACTION: {
    message: 'The requested action is not recognized.',
    recovery: 'Check the action name and try again.',
  },
  UNKNOWN_COMMAND: {
    message: 'The command is not recognized.',
    recovery: 'Check available commands in the help section.',
  },
  INVALID_TOPIC: {
    message: 'The help topic identifier is invalid.',
    recovery: 'Use a valid topic from the help index.',
  },
  TOPIC_NOT_FOUND: {
    message: 'The help topic was not found.',
    recovery: 'Check the help index for available topics.',
  },
  NOT_FOUND: {
    message: 'The requested resource was not found.',
    recovery: 'Check the URL and try again.',
  },
  PATH_TRAVERSAL: {
    message: 'Access to this path is not allowed.',
    recovery: 'Use only valid file paths within the workspace.',
  },
  PAYLOAD_TOO_LARGE: {
    message: 'The request is too large to process.',
    recovery: 'Reduce the size of the data being sent.',
  },
  INVALID_CONTENT_TYPE: {
    message: 'The request content type is not supported.',
    recovery: 'Send requests with Content-Type: application/json.',
  },
  INVALID_JSON: {
    message: 'The request body contains invalid JSON.',
    recovery: 'Check the JSON syntax and try again.',
  },
  INVALID_INPUT: {
    message: 'One or more input fields are invalid.',
    recovery: 'Review the field requirements and try again.',
  },
  METHOD_NOT_ALLOWED: {
    message: 'This HTTP method is not supported here.',
    recovery: 'Use a supported HTTP method for this endpoint.',
  },
  RATE_LIMITED: {
    message: 'Too many requests — rate limit exceeded.',
    recovery: 'Wait a moment and try again.',
  },
  INTERNAL_ERROR: {
    message: 'An unexpected server error occurred.',
    recovery: 'Try again. If the problem persists, check server logs.',
  },
};

const STATUS_TO_CODE: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  403: 'PATH_TRAVERSAL',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'INVALID_CONTENT_TYPE',
  429: 'RATE_LIMITED',
};

export function errorResponse(code: string, detail?: string) {
  const entry = ERROR_CATALOG[code] || ERROR_CATALOG.INTERNAL_ERROR;
  return {
    error: detail || entry.message,
    code: ERROR_CATALOG[code] ? code : 'INTERNAL_ERROR',
    message: detail || entry.message,
    recovery: entry.recovery,
  };
}

export function statusToCode(status: number): string {
  return STATUS_TO_CODE[status] || 'INTERNAL_ERROR';
}
