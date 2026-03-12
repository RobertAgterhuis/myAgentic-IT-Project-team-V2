'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, '..', '..', '.github', 'webapp', 'email-templates');

describe('SP-2-BTN Email Templates', () => {
  test('base-layout.html exists and contains required placeholders', () => {
    const layout = fs.readFileSync(path.join(TEMPLATE_DIR, 'base-layout.html'), 'utf8');
    expect(layout).toContain('{{SUBJECT}}');
    expect(layout).toContain('{{PREHEADER}}');
    expect(layout).toContain('{{CONTENT}}');
    expect(layout).toContain('{{UNSUBSCRIBE_URL}}');
    // Brand compliance
    expect(layout).toContain('#2563eb');
    expect(layout).toContain('Agentic SDLC Platform');
    expect(layout).toContain('max-width:600px');
    // Dark mode support
    expect(layout).toContain('prefers-color-scheme: dark');
    // Responsive
    expect(layout).toContain('max-width: 620px');
  });

  test('base-layout.html has valid HTML structure', () => {
    const layout = fs.readFileSync(path.join(TEMPLATE_DIR, 'base-layout.html'), 'utf8');
    expect(layout).toContain('<!DOCTYPE html>');
    expect(layout).toContain('<html');
    expect(layout).toContain('</html>');
    expect(layout).toContain('role="presentation"');
    // No external stylesheets (email best practice)
    expect(layout).not.toContain('<link rel="stylesheet"');
  });

  const WELCOME_EMAILS = [
    { file: 'welcome-1.md', subject: 'Welcome to the Agentic SDLC Platform', seq: 1, delay: 0 },
    { file: 'welcome-2.md', subject: 'Why 68% of software projects fail', seq: 2, delay: 2 },
    { file: 'welcome-3.md', subject: 'How 4 phases replace chaos with clarity', seq: 3, delay: 4 },
    { file: 'welcome-4.md', subject: 'Sprint 1: 15 items, 113 tests, 0 blockers', seq: 4, delay: 7 },
    { file: 'welcome-5.md', subject: 'Ready to build your first project?', seq: 5, delay: 10 },
  ];

  test.each(WELCOME_EMAILS)('$file exists with correct frontmatter', ({ file, subject, seq, delay }) => {
    const content = fs.readFileSync(path.join(TEMPLATE_DIR, file), 'utf8');
    // Frontmatter present
    expect(content).toMatch(/^---\r?\n/);
    expect(content).toContain(`subject: "${subject}"`);
    expect(content).toContain(`sequence: ${seq}`);
    expect(content).toContain(`send_delay_days: ${delay}`);
    expect(content).toContain('preheader:');
  });

  test('all welcome emails contain UTM-tagged links', () => {
    for (const { file, seq } of WELCOME_EMAILS) {
      const content = fs.readFileSync(path.join(TEMPLATE_DIR, file), 'utf8');
      expect(content).toContain(`utm_campaign=welcome-seq-${seq}`);
      expect(content).toContain('utm_source=email');
      expect(content).toContain('utm_medium=welcome-sequence');
    }
  });

  test('all welcome emails end with team signature', () => {
    for (const { file } of WELCOME_EMAILS) {
      const content = fs.readFileSync(path.join(TEMPLATE_DIR, file), 'utf8');
      expect(content).toContain('The Agentic SDLC Team');
    }
  });

  test('README.md documents the template system', () => {
    const readme = fs.readFileSync(path.join(TEMPLATE_DIR, 'README.md'), 'utf8');
    expect(readme).toContain('Welcome Sequence');
    expect(readme).toContain('Buttondown');
    expect(readme).toContain('CAN-SPAM');
    expect(readme).toContain('GDPR');
    expect(readme).toContain('base-layout.html');
  });
});
