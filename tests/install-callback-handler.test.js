import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  gt: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

describe('Install Callback Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.upsert.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.gt.mockReturnValue(mockSupabase);
    mockSupabase.single.mockReturnValue(mockSupabase);
  });

  describe('GET /api/install/callback', () => {
    it('should store installation for authenticated user', async () => {
      vi.stubEnv('APP_URL', 'http://localhost:3000');

      const handler = (await import('../api/install/callback.js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      mockSupabase.mockResolvedValueOnce({
        error: null,
      });

      const req = {
        method: 'GET',
        headers: {},
        query: {
          installation_id: '12345',
          state: 'valid-token',
          setup_action: 'created',
        },
        body: {}
      };
      const res = {
        statusCode: 200,
        redirectUrl: null,
        status: vi.fn(function(code) {
          this.statusCode = code;
          return this;
        }),
        json: vi.fn(function(data) {
          this.data = data;
          return this;
        }),
        redirect: vi.fn(function(url) {
          this.redirectUrl = url;
          return this;
        }),
      };

      await handler(req, res);

      expect(mockSupabase.from).toHaveBeenCalledWith('sessions');
      expect(mockSupabase.from).toHaveBeenCalledWith('installations');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-123',
        installation_id: 12345,
      }), expect.any(Object));
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));

      vi.unstubAllEnvs();
    });

    it('should redirect to login when no token provided', async () => {
      vi.stubEnv('APP_URL', 'http://localhost:3000');

      const handler = (await import('../api/install/callback.js')).default;

      const req = {
        method: 'GET',
        headers: {},
        query: {
          installation_id: '12345',
          // No state/token
          setup_action: 'created',
        },
        body: {}
      };
      const res = {
        statusCode: 200,
        redirectUrl: null,
        status: vi.fn(function(code) {
          this.statusCode = code;
          return this;
        }),
        json: vi.fn(function(data) {
          this.data = data;
          return this;
        }),
        redirect: vi.fn(function(url) {
          this.redirectUrl = url;
          return this;
        }),
      };

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/login'));

      vi.unstubAllEnvs();
    });

    it('should redirect to connect error when installation_id missing', async () => {
      vi.stubEnv('APP_URL', 'http://localhost:3000');

      const handler = (await import('../api/install/callback.js')).default;

      const req = {
        method: 'GET',
        headers: {},
        query: {
          state: 'valid-token',
          // No installation_id
        },
        body: {}
      };
      const res = {
        statusCode: 200,
        redirectUrl: null,
        status: vi.fn(function(code) {
          this.statusCode = code;
          return this;
        }),
        json: vi.fn(function(data) {
          this.data = data;
          return this;
        }),
        redirect: vi.fn(function(url) {
          this.redirectUrl = url;
          return this;
        }),
      };

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/connect'));
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=no_installation_id'));

      vi.unstubAllEnvs();
    });

    it('should return 405 for non-GET requests', async () => {
      const handler = (await import('../api/install/callback.js')).default;

      const req = {
        method: 'POST',
        headers: {},
        query: {
          installation_id: '12345',
          state: 'valid-token',
        },
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

    it('should handle invalid or expired session', async () => {
      vi.stubEnv('APP_URL', 'http://localhost:3000');

      const handler = (await import('../api/install/callback.js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid session' },
      });

      const req = {
        method: 'GET',
        headers: {},
        query: {
          installation_id: '12345',
          state: 'expired-token',
          setup_action: 'created',
        },
        body: {}
      };
      const res = {
        statusCode: 200,
        redirectUrl: null,
        status: vi.fn(function(code) {
          this.statusCode = code;
          return this;
        }),
        json: vi.fn(function(data) {
          this.data = data;
          return this;
        }),
        redirect: vi.fn(function(url) {
          this.redirectUrl = url;
          return this;
        }),
      };

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/login'));
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=invalid_session'));

      vi.unstubAllEnvs();
    });

    it('should handle database errors gracefully', async () => {
      vi.stubEnv('APP_URL', 'http://localhost:3000');

      const handler = (await import('../api/install/callback.js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      mockSupabase.mockResolvedValueOnce({
        error: { message: 'Database error' },
      });

      const req = {
        method: 'GET',
        headers: {},
        query: {
          installation_id: '12345',
          state: 'valid-token',
          setup_action: 'created',
        },
        body: {}
      };
      const res = {
        statusCode: 200,
        redirectUrl: null,
        status: vi.fn(function(code) {
          this.statusCode = code;
          return this;
        }),
        json: vi.fn(function(data) {
          this.data = data;
          return this;
        }),
        redirect: vi.fn(function(url) {
          this.redirectUrl = url;
          return this;
        }),
      };

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/connect'));
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=save_failed'));

      vi.unstubAllEnvs();
    });

    it('should parse installation_id as integer', async () => {
      vi.stubEnv('APP_URL', 'http://localhost:3000');

      const handler = (await import('../api/install/callback.js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      mockSupabase.mockResolvedValueOnce({
        error: null,
      });

      const req = {
        method: 'GET',
        headers: {},
        query: {
          installation_id: '67890',
          state: 'valid-token',
          setup_action: 'created',
        },
        body: {}
      };
      const res = {
        statusCode: 200,
        redirectUrl: null,
        status: vi.fn(function(code) {
          this.statusCode = code;
          return this;
        }),
        json: vi.fn(function(data) {
          this.data = data;
          return this;
        }),
        redirect: vi.fn(function(url) {
          this.redirectUrl = url;
          return this;
        }),
      };

      await handler(req, res);

      expect(mockSupabase.upsert).toHaveBeenCalledWith(expect.objectContaining({
        installation_id: 67890, // Should be numeric, not string
      }), expect.any(Object));

      vi.unstubAllEnvs();
    });
  });
});
