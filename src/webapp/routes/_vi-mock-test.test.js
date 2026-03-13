// Quick test: does vi.mock work for local CJS modules?
import { parseBody } from '../middleware.js';

vi.mock('../middleware.js', () => ({
  structuredLog: vi.fn(),
  json: vi.fn(),
  parseBody: vi.fn(() => 'MOCKED_PARSEBODY'),
  _setSecurityHeaders: vi.fn(),
}));

describe('vi.mock CJS interception test', () => {
  it('test import gets mock', () => {
    expect(parseBody).toBeDefined();
    expect(parseBody()).toBe('MOCKED_PARSEBODY');
    console.log('Test import: parseBody is mock?', typeof parseBody.mock === 'object');
  });

  it('SUT require gets mock', async () => {
    // Force vitest to load orchestrator.js which does require('../middleware')
    const mod = await import('./orchestrator.js');
    const createRoutes = mod.default;
    const routes = createRoutes({ sseNotify: () => {} });
    const handler = routes['GET /api/orchestrator/status'];

    const res = {
      setHeader: vi.fn(),
      writeHead: vi.fn(),
      end: vi.fn(),
    };
    handler({}, res);

    // If json mock was called by the SUT, we'd see it
    const { json } = await import('../middleware.js');
    console.log('json mock called?', json.mock?.calls?.length ?? 'NOT A MOCK');
  });
});
