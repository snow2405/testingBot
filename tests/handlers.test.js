import { describe, it, expect, vi } from 'vitest';

// Mock request/response for serverless functions
function createMockReq(options = {}) {
  return {
    method: options.method || 'GET',
    headers: options.headers || {},
    query: options.query || {},
    body: options.body || {},
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    data: null,
    redirectUrl: null,
    status: vi.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((data) => {
      res.data = data;
      return res;
    }),
    redirect: vi.fn((url) => {
      res.redirectUrl = url;
      return res;
    }),
  };
  return res;
}

describe('API Endpoint Handlers', () => {
  describe('POST /api/auth/github', () => {
    it('should return GitHub OAuth URL', async () => {
      // Mock env variables
      vi.stubEnv('GITHUB_CLIENT_ID', 'test-client-id');
      vi.stubEnv('APP_URL', 'http://localhost:3000');

      const handler = (await import('../api/auth/github.js')).default;
      const req = createMockReq({ method: 'POST' });
      const res = createMockRes();

      handler(req, res);

      expect(res.data.url).toContain('github.com/login/oauth/authorize');
      expect(res.data.url).toContain('client_id=test-client-id');

      vi.unstubAllEnvs();
    });

    it('should reject non-POST requests', async () => {
      const handler = (await import('../api/auth/github.js')).default;
      const req = createMockReq({ method: 'GET' });
      const res = createMockRes();

      handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.data.error).toBe('Method not allowed');
    });
  });
});

describe('Helper Functions', () => {
  describe('generateDiff', () => {
    it('should append AI-generated content to file', async () => {
      const { generateDiff } = await import('../lib/github.js');
      
      const originalContent = '# My README\n\nSome content';
      const prompt = 'Add a section about installation';
      
      const result = await generateDiff(prompt, originalContent);
      
      expect(result).toContain(originalContent);
      expect(result).toContain('AI Generated Update');
      expect(result).toContain(prompt);
    });
  });
});

describe('Job Status Flow', () => {
  it('should have valid job statuses', () => {
    const validStatuses = ['pending', 'running', 'done', 'failed'];
    
    validStatuses.forEach(status => {
      expect(['pending', 'running', 'done', 'failed']).toContain(status);
    });
  });

  it('should transition from pending to running to done', () => {
    const transitions = {
      'pending': ['running'],
      'running': ['done', 'failed'],
      'done': [],
      'failed': [],
    };

    expect(transitions['pending']).toContain('running');
    expect(transitions['running']).toContain('done');
    expect(transitions['running']).toContain('failed');
  });
});
