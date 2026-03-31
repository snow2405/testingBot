import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  gt: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

describe('Auth Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.upsert.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.gt.mockReturnValue(mockSupabase);
    mockSupabase.single.mockReturnValue(mockSupabase);
  });

  describe('POST /api/auth/github', () => {
    it('should return GitHub OAuth URL', async () => {
      vi.stubEnv('GITHUB_CLIENT_ID', 'test-client-id');
      vi.stubEnv('APP_URL', 'http://localhost:3000');

      const handler = (await import('../api/auth/github.js')).default;
      const req = { method: 'POST', headers: {}, query: {}, body: {} };
      const res = {
        statusCode: 200,
        data: null,
        status: vi.fn(function(code) {
          this.statusCode = code;
          return this;
        }),
        json: vi.fn(function(data) {
          this.data = data;
          return this;
        }),
      };

      handler(req, res);

      expect(res.data.url).toContain('github.com/login/oauth/authorize');
      expect(res.data.url).toContain('client_id=test-client-id');

      vi.unstubAllEnvs();
    });

    it('should reject non-POST requests', async () => {
      const handler = (await import('../api/auth/github.js')).default;
      const req = { method: 'GET', headers: {}, query: {}, body: {} };
      const res = {
        statusCode: 200,
        data: null,
        status: vi.fn(function(code) {
          this.statusCode = code;
          return this;
        }),
        json: vi.fn(function(data) {
          this.data = data;
          return this;
        }),
      };

      handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.data.error).toBe('Method not allowed');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const handler = (await import('../api/auth/me.js')).default;

      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: 'user-123',
          users: {
            id: 'user-123',
            username: 'testuser',
            github_id: 12345
          }
        },
        error: null,
      });

      const req = {
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' },
        query: {},
        body: {}
      };
      const res = {
        statusCode: 200,
        data: null,
        status: vi.fn(function(code) {
          this.statusCode = code;
          return this;
        }),
        json: vi.fn(function(data) {
          this.data = data;
          return this;
        }),
      };

      await handler(req, res);

      expect(mockSupabase.from).toHaveBeenCalledWith('sessions');
      expect(mockSupabase.eq).toHaveBeenCalledWith('token', 'valid-token');
    });

    it('should reject requests without authorization header', async () => {
      const handler = (await import('../api/auth/me.js')).default;

      const req = {
        method: 'GET',
        headers: {},
        query: {},
        body: {}
      };
      const res = {
        statusCode: 200,
        data: null,
        status: vi.fn(function(code) {
          this.statusCode = code;
          return this;
        }),
        json: vi.fn(function(data) {
          this.data = data;
          return this;
        }),
      };

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.data.error).toContain('Unauthorized');
    });

    it('should reject invalid token', async () => {
      const handler = (await import('../api/auth/me.js')).default;

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'No session found' },
      });

      const req = {
        method: 'GET',
        headers: { authorization: 'Bearer invalid-token' },
        query: {},
        body: {}
      };
      const res = {
        statusCode: 200,
        data: null,
        status: vi.fn(function(code) {
          this.statusCode = code;
          return this;
        }),
        json: vi.fn(function(data) {
          this.data = data;
          return this;
        }),
      };

      await handler(req, res);

      expect(res.statusCode).toBe(401);
    });

    it('should reject non-GET requests', async () => {
      const handler = (await import('../api/auth/me.js')).default;

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        query: {},
        body: {}
      };
      const res = {
        statusCode: 200,
        data: null,
        status: vi.fn(function(code) {
          this.statusCode = code;
          return this;
        }),
        json: vi.fn(function(data) {
          this.data = data;
          return this;
        }),
      };

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.data.error).toBe('Method not allowed');
    });
  });
});
