#!/usr/bin/env node
// Copyright (c) 2026 Robert Agterhuis. MIT License.
// Weblate ↔ locale sync script — pulls translations from Weblate API and
// updates locales/{lang}/*.json files, or pushes source (en-US) to Weblate.
//
// Usage:
//   WEBLATE_URL=http://localhost:8081 WEBLATE_TOKEN=<api-key> node scripts/weblate-sync.js pull
//   WEBLATE_URL=http://localhost:8081 WEBLATE_TOKEN=<api-key> node scripts/weblate-sync.js push
//   node scripts/weblate-sync.js validate       # offline locale validation only
//
// Environment:
//   WEBLATE_URL    — Base URL of the Weblate instance (default: http://localhost:8081)
//   WEBLATE_TOKEN  — Weblate API token (required for push/pull)
//   WEBLATE_PROJECT — Weblate project slug (default: agentic-sdlc)
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const LOCALES_DIR = path.resolve(__dirname, '..', 'locales');
const SOURCE_LANG = 'en-US';
const TARGET_LANGS = ['fr-FR', 'de-DE'];
const COMPONENTS = ['ui-labels', 'validation-messages', 'doc-snippets'];
const WEBLATE_URL = process.env.WEBLATE_URL || 'http://localhost:8081';
const WEBLATE_TOKEN = process.env.WEBLATE_TOKEN || '';
const WEBLATE_PROJECT = process.env.WEBLATE_PROJECT || 'agentic-sdlc';

// ── Helpers ──────────────────────────────────────────────────────

function readLocaleFile(lang, component) {
  const filePath = path.join(LOCALES_DIR, lang, `${component}.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function writeLocaleFile(lang, component, data) {
  const dir = path.join(LOCALES_DIR, lang);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${component}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`  ✓ Written ${filePath}`);
}

function weblateRequest(method, apiPath, body) {
  if (!WEBLATE_TOKEN) {
    console.error('Error: WEBLATE_TOKEN is required for push/pull operations');
    process.exit(1);
  }

  const url = new URL(`/api/${apiPath}`, WEBLATE_URL);
  const client = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        Authorization: `Token ${WEBLATE_TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : {});
        } else {
          reject(new Error(`Weblate API ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Validate (offline) ──────────────────────────────────────────

function validate() {
  console.log('Validating locale file consistency...\n');
  let errors = 0;

  for (const component of COMPONENTS) {
    const source = readLocaleFile(SOURCE_LANG, component);
    const sourceKeys = Object.keys(source).sort();
    console.log(`${component}: ${sourceKeys.length} source keys (${SOURCE_LANG})`);

    for (const lang of TARGET_LANGS) {
      const target = readLocaleFile(lang, component);
      const targetKeys = Object.keys(target).sort();

      const missing = sourceKeys.filter((k) => !targetKeys.includes(k));
      const extra = targetKeys.filter((k) => !sourceKeys.includes(k));

      if (missing.length) {
        console.error(`  ✗ ${lang}: ${missing.length} missing keys: ${missing.join(', ')}`);
        errors += missing.length;
      }
      if (extra.length) {
        console.error(`  ✗ ${lang}: ${extra.length} extra keys: ${extra.join(', ')}`);
        errors += extra.length;
      }
      if (!missing.length && !extra.length) {
        console.log(`  ✓ ${lang}: ${targetKeys.length} keys — parity OK`);
      }
    }
  }

  if (errors) {
    console.error(`\n✗ ${errors} issue(s) found.`);
    process.exit(1);
  }
  console.log('\n✓ All locale files are consistent.');
}

// ── Pull (Weblate → locales/) ───────────────────────────────────

async function pull() {
  console.log(`Pulling translations from ${WEBLATE_URL}...\n`);

  for (const component of COMPONENTS) {
    for (const lang of TARGET_LANGS) {
      const slug = lang.toLowerCase().replace('-', '_');
      try {
        const data = await weblateRequest(
          'GET',
          `translations/${WEBLATE_PROJECT}/${component}/${slug}/file/`
        );
        writeLocaleFile(lang, component, data);
      } catch (err) {
        console.error(`  ✗ ${lang}/${component}: ${err.message}`);
      }
    }
  }

  console.log('\nPull complete. Run "validate" to check consistency.');
}

// ── Push (locales/ → Weblate) ───────────────────────────────────

async function push() {
  console.log(`Pushing source strings to ${WEBLATE_URL}...\n`);

  for (const component of COMPONENTS) {
    const source = readLocaleFile(SOURCE_LANG, component);
    try {
      await weblateRequest('POST', `translations/${WEBLATE_PROJECT}/${component}/en/file/`, source);
      console.log(`  ✓ Pushed ${component} (${Object.keys(source).length} keys)`);
    } catch (err) {
      console.error(`  ✗ ${component}: ${err.message}`);
    }
  }

  console.log('\nPush complete.');
}

// ── Main ─────────────────────────────────────────────────────────

const command = process.argv[2];

switch (command) {
  case 'validate':
    validate();
    break;
  case 'pull':
    pull().catch((err) => {
      console.error('Pull failed:', err.message);
      process.exit(1);
    });
    break;
  case 'push':
    push().catch((err) => {
      console.error('Push failed:', err.message);
      process.exit(1);
    });
    break;
  default:
    console.log('Usage: node scripts/weblate-sync.js <validate|pull|push>');
    console.log('');
    console.log('Commands:');
    console.log('  validate  Check locale file consistency (offline)');
    console.log('  pull      Pull translations from Weblate → locales/');
    console.log('  push      Push source strings from locales/ → Weblate');
    process.exit(command ? 1 : 0);
}
