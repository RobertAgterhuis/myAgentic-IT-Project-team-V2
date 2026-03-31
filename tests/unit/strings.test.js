import * as __req_0 from '../../src/webapp/strings';
const { VALIDATION, RESPONSES, STATIC } = __req_0;

describe('VALIDATION string functions', () => {
  it('invalidQID returns formatted message', () => {
    expect(VALIDATION.invalidQID('Q-999')).toBe('Invalid Q-ID: Q-999');
  });

  it('invalidStatus returns formatted message', () => {
    expect(VALIDATION.invalidStatus('bad-status')).toBe('Invalid status: bad-status');
  });

  it('exports static validation strings', () => {
    expect(typeof VALIDATION.UPDATES_RANGE).toBe('string');
    expect(typeof VALIDATION.MISSING_ID).toBe('string');
  });
});

describe('RESPONSES string functions', () => {
  it('reevaluateTrigger returns message with scope', () => {
    const msg = RESPONSES.reevaluateTrigger('global');
    expect(msg).toContain('global');
    expect(msg).toContain('REEVALUATE');
  });

  it('commandQueued returns message with command text', () => {
    const msg = RESPONSES.commandQueued('do something');
    expect(msg).toContain('do something');
  });

  it('unknownEvent returns message with event type', () => {
    const msg = RESPONSES.unknownEvent('my-event');
    expect(msg).toContain('my-event');
  });

  it('unknownAction returns message with action name', () => {
    const msg = RESPONSES.unknownAction('my-action');
    expect(msg).toContain('my-action');
  });

  it('unknownCommand returns message with command name', () => {
    const msg = RESPONSES.unknownCommand('my-command');
    expect(msg).toContain('my-command');
  });
});

describe('STATIC strings', () => {
  it('exports NOT_FOUND string', () => {
    expect(STATIC.NOT_FOUND).toBe('Not found');
  });
});
