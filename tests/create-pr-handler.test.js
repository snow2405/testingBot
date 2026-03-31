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
};

// Mock Octokit
const mockOctokit = {
  repos: {
    get: vi.fn(),
    getContent: vi.fn(),
    createOrUpdateFileContents: vi.fn(),
  },
  git: {
    getRef: vi.fn(),
    createRef: vi.fn(),
  },
  pulls: {
    create: vi.fn(),
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

describe('Create PR Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.gt.mockReturnValue(mockSupabase);
    mockSupabase.single.mockReturnValue(mockSupabase);
  });

  describe('POST /api/create-pr', () => {
    it('should create job for valid request', async () => {
      const handler = (await import('../api/create-pr.js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { installation_id: 12345 },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'job-123', status: 'pending' },
        error: null,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        query: {},
        body: {
          repo: 'user/my-repo',
          prompt: 'Update the README with installation instructions'
        }
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
      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        repo_owner: 'user',
        repo_name: 'my-repo',
        prompt: 'Update the README with installation instructions',
        status: 'pending',
      }));
      expect(res.data.jobId).toBe('job-123');
    });

    it('should return 401 for missing authorization', async () => {
      const handler = (await import('../api/create-pr.js')).default;

      const req = {
        method: 'POST',
        headers: {},
        query: {},
        body: {
          repo: 'user/repo',
          prompt: 'Update'
        }
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

    it('should return 405 for non-POST requests', async () => {
      const handler = (await import('../api/create-pr.js')).default;

      const req = {
        method: 'GET',
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

    it('should return 400 for missing repo or prompt', async () => {
      const handler = (await import('../api/create-pr.js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { installation_id: 12345 },
        error: null,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        query: {},
        body: {
          repo: 'user/repo'
          // Missing prompt
        }
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
      expect(res.data.error).toContain('repo or prompt');
    });

    it('should return 400 when no installation found', async () => {
      const handler = (await import('../api/create-pr.js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No installation' },
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        query: {},
        body: {
          repo: 'user/repo',
          prompt: 'Update'
        }
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

    it('should return 401 for invalid or expired session', async () => {
      const handler = (await import('../api/create-pr.js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid session' },
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer expired-token' },
        query: {},
        body: {
          repo: 'user/repo',
          prompt: 'Update'
        }
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

    it('should parse repo string correctly', async () => {
      const handler = (await import('../api/create-pr.js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { installation_id: 12345 },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'job-123' },
        error: null,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        query: {},
        body: {
          repo: 'org/repository-name',
          prompt: 'Update'
        }
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

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        repo_owner: 'org',
        repo_name: 'repository-name',
      }));
    });

    it('should handle database errors gracefully', async () => {
      const handler = (await import('../api/create-pr.js')).default;

      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { installation_id: 12345 },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        query: {},
        body: {
          repo: 'user/repo',
          prompt: 'Update'
        }
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

      expect(res.statusCode).toBe(500);
      expect(res.data.error).toContain('Failed to create job');
    });
  });
});
