import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  gt: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
};

// Mock Octokit
const mockOctokit = {
  apps: {
    listReposAccessibleToInstallation: vi.fn(),
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => mockOctokit),
}));

vi.mock('@octokit/auth-app', () => ({
  createAppAuth: {},
}));

describe('Repos Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.gt.mockReturnValue(mockSupabase);
    mockSupabase.single.mockReturnValue(mockSupabase);
  });

  describe('GET /api/repos', () => {
    it('should return repositories for authenticated user', async () => {
      const handler = (await import('../api/repos.js')).default;

      // Mock session lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      // Mock installation lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { installation_id: 12345 },
        error: null,
      });

      // Mock GitHub API response
      mockOctokit.apps.listReposAccessibleToInstallation.mockResolvedValue({
        data: {
          repositories: [
            {
              id: 1,
              name: 'repo1',
              full_name: 'user/repo1',
              owner: { login: 'user' },
              private: false,
              default_branch: 'main',
            },
            {
              id: 2,
              name: 'repo2',
              full_name: 'user/repo2',
              owner: { login: 'user' },
              private: true,
              default_branch: 'main',
            },
          ],
        },
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
      expect(mockSupabase.from).toHaveBeenCalledWith('installations');
      expect(mockOctokit.apps.listReposAccessibleToInstallation).toHaveBeenCalled();
      expect(res.data.repos).toHaveLength(2);
      expect(res.data.repos[0].name).toBe('repo1');
    });

    it('should return 401 for missing authorization', async () => {
      const handler = (await import('../api/repos.js')).default;

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

    it('should return 405 for non-GET requests', async () => {
      const handler = (await import('../api/repos.js')).default;

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

    it('should return 400 when no installation found', async () => {
      const handler = (await import('../api/repos.js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No installation' },
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

      expect(res.statusCode).toBe(400);
      expect(res.data.error).toContain('installation');
    });
  });
});

describe('Jobs Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.gt.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.limit.mockReturnValue(mockSupabase);
    mockSupabase.single.mockReturnValue(mockSupabase);
  });

  describe('GET /api/jobs', () => {
    it('should return all jobs for authenticated user', async () => {
      const handler = (await import('../api/jobs/index.js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      mockSupabase.mockResolvedValueOnce({
        data: [
          { id: 'job-1', status: 'done', pr_url: 'https://github.com/...' },
          { id: 'job-2', status: 'pending' },
        ],
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
      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return 401 for unauthorized request', async () => {
      const handler = (await import('../api/jobs/index.js')).default;

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
    });

    it('should return 405 for non-GET requests', async () => {
      const handler = (await import('../api/jobs/index.js')).default;

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

  describe('GET /api/jobs/[id]', () => {
    it('should return specific job for authenticated user', async () => {
      const handler = (await import('../api/jobs/[id].js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'job-123',
          status: 'done',
          pr_url: 'https://github.com/user/repo/pull/1',
          prompt: 'Update README'
        },
        error: null,
      });

      const req = {
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' },
        query: { id: 'job-123' },
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

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'job-123');
      expect(res.data.status).toBe('done');
    });

    it('should return 404 when job not found', async () => {
      const handler = (await import('../api/jobs/[id].js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const req = {
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' },
        query: { id: 'nonexistent' },
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

      expect(res.statusCode).toBe(404);
    });

    it('should return 405 for non-GET requests', async () => {
      const handler = (await import('../api/jobs/[id].js')).default;

      const req = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        query: { id: 'job-123' },
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
