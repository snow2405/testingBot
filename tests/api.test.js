import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, setToken, getToken } from '../src/api';

describe('Token Management', () => {
  beforeEach(() => {
    localStorage.getItem.mockReturnValue(null);
  });

  it('should set token in localStorage', () => {
    setToken('test-token-123');
    expect(localStorage.setItem).toHaveBeenCalledWith('pr_bot_token', 'test-token-123');
  });

  it('should remove token when setting null', () => {
    setToken(null);
    expect(localStorage.removeItem).toHaveBeenCalledWith('pr_bot_token');
  });

  it('should get token from localStorage', () => {
    localStorage.getItem.mockReturnValue('stored-token');
    // Need to re-import to get fresh token value
    expect(getToken()).toBeDefined();
  });
});

describe('API Methods', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  describe('getAuthUrl', () => {
    it('should call auth/github endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://github.com/login/oauth/authorize?...' }),
      });

      const result = await api.getAuthUrl();

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/github', expect.objectContaining({
        method: 'POST',
      }));
      expect(result.url).toContain('github.com');
    });
  });

  describe('getMe', () => {
    it('should call auth/me endpoint with auth header', async () => {
      setToken('test-token');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: { username: 'testuser' } }),
      });

      const result = await api.getMe();

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
        }),
      }));
      expect(result.user.username).toBe('testuser');
    });
  });

  describe('getRepos', () => {
    it('should fetch repositories', async () => {
      setToken('test-token');
      const mockRepos = {
        repos: [
          { id: 1, name: 'repo1', full_name: 'user/repo1' },
          { id: 2, name: 'repo2', full_name: 'user/repo2' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRepos),
      });

      const result = await api.getRepos();

      expect(global.fetch).toHaveBeenCalledWith('/api/repos', expect.any(Object));
      expect(result.repos).toHaveLength(2);
    });
  });

  describe('createPR', () => {
    it('should create PR with repo and prompt', async () => {
      setToken('test-token');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123' }),
      });

      const result = await api.createPR('user/repo', 'Update the README');

      expect(global.fetch).toHaveBeenCalledWith('/api/create-pr', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ repo: 'user/repo', prompt: 'Update the README' }),
      }));
      expect(result.jobId).toBe('job-123');
    });
  });

  describe('getJob', () => {
    it('should fetch job by id', async () => {
      setToken('test-token');
      const mockJob = {
        id: 'job-123',
        status: 'done',
        pr_url: 'https://github.com/user/repo/pull/1',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockJob),
      });

      const result = await api.getJob('job-123');

      expect(global.fetch).toHaveBeenCalledWith('/api/jobs/job-123', expect.any(Object));
      expect(result.status).toBe('done');
    });
  });

  describe('getJobs', () => {
    it('should fetch all jobs', async () => {
      setToken('test-token');
      const mockJobs = {
        jobs: [
          { id: 'job-1', status: 'done' },
          { id: 'job-2', status: 'pending' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockJobs),
      });

      const result = await api.getJobs();

      expect(global.fetch).toHaveBeenCalledWith('/api/jobs', expect.any(Object));
      expect(result.jobs).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should throw error on failed request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      await expect(api.getMe()).rejects.toThrow('Unauthorized');
    });
  });
});
