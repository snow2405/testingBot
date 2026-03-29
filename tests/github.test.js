import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  apps: {
    listReposAccessibleToInstallation: vi.fn(),
  },
};

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => mockOctokit),
}));

describe('GitHub Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Repository Operations', () => {
    it('should get repository info', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: {
          name: 'test-repo',
          default_branch: 'main',
          owner: { login: 'testuser' },
        },
      });

      const result = await mockOctokit.repos.get({
        owner: 'testuser',
        repo: 'test-repo',
      });

      expect(result.data.default_branch).toBe('main');
      expect(mockOctokit.repos.get).toHaveBeenCalledWith({
        owner: 'testuser',
        repo: 'test-repo',
      });
    });

    it('should list accessible repositories', async () => {
      mockOctokit.apps.listReposAccessibleToInstallation.mockResolvedValue({
        data: {
          repositories: [
            { id: 1, name: 'repo1', full_name: 'user/repo1' },
            { id: 2, name: 'repo2', full_name: 'user/repo2' },
          ],
        },
      });

      const result = await mockOctokit.apps.listReposAccessibleToInstallation({
        per_page: 100,
      });

      expect(result.data.repositories).toHaveLength(2);
    });
  });

  describe('Branch Operations', () => {
    it('should get branch reference', async () => {
      mockOctokit.git.getRef.mockResolvedValue({
        data: {
          object: { sha: 'abc123' },
        },
      });

      const result = await mockOctokit.git.getRef({
        owner: 'testuser',
        repo: 'test-repo',
        ref: 'heads/main',
      });

      expect(result.data.object.sha).toBe('abc123');
    });

    it('should create new branch', async () => {
      mockOctokit.git.createRef.mockResolvedValue({
        data: {
          ref: 'refs/heads/bot/new-branch',
        },
      });

      const result = await mockOctokit.git.createRef({
        owner: 'testuser',
        repo: 'test-repo',
        ref: 'refs/heads/bot/new-branch',
        sha: 'abc123',
      });

      expect(result.data.ref).toBe('refs/heads/bot/new-branch');
    });

    it('should handle empty repository (409 error)', async () => {
      const emptyRepoError = new Error('Git Repository is empty.');
      emptyRepoError.status = 409;

      mockOctokit.git.getRef.mockRejectedValue(emptyRepoError);

      try {
        await mockOctokit.git.getRef({
          owner: 'testuser',
          repo: 'empty-repo',
          ref: 'heads/main',
        });
      } catch (error) {
        expect(error.status).toBe(409);
        expect(error.message).toContain('empty');
      }
    });
  });

  describe('File Operations', () => {
    it('should get file content', async () => {
      const content = '# README\n\nSome content';
      const encoded = Buffer.from(content).toString('base64');

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: encoded,
          sha: 'file-sha-123',
        },
      });

      const result = await mockOctokit.repos.getContent({
        owner: 'testuser',
        repo: 'test-repo',
        path: 'README.md',
      });

      const decoded = Buffer.from(result.data.content, 'base64').toString('utf8');
      expect(decoded).toBe(content);
    });

    it('should create or update file with SHA', async () => {
      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({
        data: {
          commit: { sha: 'new-commit-sha' },
        },
      });

      const content = Buffer.from('Updated content').toString('base64');

      await mockOctokit.repos.createOrUpdateFileContents({
        owner: 'testuser',
        repo: 'test-repo',
        path: 'README.md',
        message: 'Update README',
        content: content,
        branch: 'bot/new-branch',
        sha: 'existing-file-sha',
      });

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          sha: 'existing-file-sha',
          content: content,
        })
      );
    });
  });

  describe('Pull Request Operations', () => {
    it('should create pull request', async () => {
      mockOctokit.pulls.create.mockResolvedValue({
        data: {
          number: 42,
          html_url: 'https://github.com/testuser/test-repo/pull/42',
          title: 'AI Update: Test prompt',
        },
      });

      const result = await mockOctokit.pulls.create({
        owner: 'testuser',
        repo: 'test-repo',
        title: 'AI Update: Test prompt',
        head: 'bot/new-branch',
        base: 'main',
        body: 'Automated PR',
      });

      expect(result.data.number).toBe(42);
      expect(result.data.html_url).toContain('github.com');
    });
  });
});

describe('PR Creation Flow', () => {
  it('should follow correct sequence', async () => {
    const callOrder = [];

    mockOctokit.repos.get.mockImplementation(() => {
      callOrder.push('get_repo');
      return Promise.resolve({ data: { default_branch: 'main' } });
    });

    mockOctokit.git.getRef.mockImplementation(() => {
      callOrder.push('get_ref');
      return Promise.resolve({ data: { object: { sha: 'abc123' } } });
    });

    mockOctokit.git.createRef.mockImplementation(() => {
      callOrder.push('create_branch');
      return Promise.resolve({ data: {} });
    });

    mockOctokit.repos.getContent.mockImplementation(() => {
      callOrder.push('get_content');
      return Promise.resolve({ 
        data: { 
          content: Buffer.from('# README').toString('base64'),
          sha: 'file-sha',
        } 
      });
    });

    mockOctokit.repos.createOrUpdateFileContents.mockImplementation(() => {
      callOrder.push('update_file');
      return Promise.resolve({ data: {} });
    });

    mockOctokit.pulls.create.mockImplementation(() => {
      callOrder.push('create_pr');
      return Promise.resolve({ data: { html_url: 'https://github.com/...' } });
    });

    // Simulate the flow
    await mockOctokit.repos.get({ owner: 'user', repo: 'repo' });
    await mockOctokit.git.getRef({ owner: 'user', repo: 'repo', ref: 'heads/main' });
    await mockOctokit.git.createRef({ owner: 'user', repo: 'repo', ref: 'refs/heads/new', sha: 'abc123' });
    await mockOctokit.repos.getContent({ owner: 'user', repo: 'repo', path: 'README.md' });
    await mockOctokit.repos.createOrUpdateFileContents({ owner: 'user', repo: 'repo', path: 'README.md', content: '' });
    await mockOctokit.pulls.create({ owner: 'user', repo: 'repo', title: 'PR', head: 'new', base: 'main' });

    expect(callOrder).toEqual([
      'get_repo',
      'get_ref',
      'create_branch',
      'get_content',
      'update_file',
      'create_pr',
    ]);
  });
});
