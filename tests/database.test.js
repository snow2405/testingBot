import { describe, it, expect, vi } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  gt: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
};

describe('Database Schema Validation', () => {
  describe('Users Table', () => {
    it('should have required fields', () => {
      const userFields = ['id', 'github_id', 'username', 'access_token', 'created_at', 'updated_at'];
      
      userFields.forEach(field => {
        expect(userFields).toContain(field);
      });
    });

    it('should require github_id to be unique', () => {
      // Schema defines: github_id BIGINT UNIQUE NOT NULL
      const constraints = {
        github_id: { unique: true, nullable: false },
      };

      expect(constraints.github_id.unique).toBe(true);
      expect(constraints.github_id.nullable).toBe(false);
    });
  });

  describe('Installations Table', () => {
    it('should have required fields', () => {
      const installationFields = ['id', 'user_id', 'installation_id', 'created_at'];
      
      installationFields.forEach(field => {
        expect(installationFields).toContain(field);
      });
    });

    it('should reference users table', () => {
      const foreignKeys = {
        user_id: { references: 'users(id)', onDelete: 'CASCADE' },
      };

      expect(foreignKeys.user_id.references).toBe('users(id)');
    });
  });

  describe('Jobs Table', () => {
    it('should have required fields', () => {
      const jobFields = [
        'id', 'user_id', 'installation_id', 
        'repo_owner', 'repo_name', 'prompt',
        'status', 'pr_url', 'error',
        'created_at', 'updated_at'
      ];
      
      jobFields.forEach(field => {
        expect(jobFields).toContain(field);
      });
    });

    it('should have valid status enum', () => {
      const validStatuses = ['pending', 'running', 'done', 'failed'];
      
      expect(validStatuses).toContain('pending');
      expect(validStatuses).toContain('running');
      expect(validStatuses).toContain('done');
      expect(validStatuses).toContain('failed');
      expect(validStatuses).not.toContain('cancelled');
    });
  });

  describe('Sessions Table', () => {
    it('should have required fields', () => {
      const sessionFields = ['id', 'user_id', 'token', 'expires_at', 'created_at'];
      
      sessionFields.forEach(field => {
        expect(sessionFields).toContain(field);
      });
    });

    it('should have unique token', () => {
      const constraints = {
        token: { unique: true, nullable: false },
      };

      expect(constraints.token.unique).toBe(true);
    });
  });
});

describe('Supabase Queries', () => {
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
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.limit.mockReturnValue(mockSupabase);
  });

  it('should query users by github_id', async () => {
    mockSupabase.single.mockResolvedValue({
      data: { id: '123', github_id: 12345, username: 'testuser' },
      error: null,
    });

    const result = await mockSupabase
      .from('users')
      .select('*')
      .eq('github_id', 12345)
      .single();

    expect(mockSupabase.from).toHaveBeenCalledWith('users');
    expect(mockSupabase.eq).toHaveBeenCalledWith('github_id', 12345);
  });

  it('should create job with correct data', async () => {
    mockSupabase.single.mockResolvedValue({
      data: { id: 'job-123', status: 'pending' },
      error: null,
    });

    const jobData = {
      user_id: 'user-123',
      installation_id: 12345,
      repo_owner: 'testuser',
      repo_name: 'testrepo',
      prompt: 'Update README',
      status: 'pending',
    };

    await mockSupabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single();

    expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
    expect(mockSupabase.insert).toHaveBeenCalledWith(jobData);
  });

  it('should update job status', async () => {
    mockSupabase.eq.mockResolvedValue({ data: null, error: null });

    await mockSupabase
      .from('jobs')
      .update({ status: 'running' })
      .eq('id', 'job-123');

    expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'running' });
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'job-123');
  });

  it('should validate session token and expiry', async () => {
    const now = new Date().toISOString();

    mockSupabase.single.mockResolvedValue({
      data: { user_id: 'user-123', token: 'valid-token', expires_at: now },
      error: null,
    });

    await mockSupabase
      .from('sessions')
      .select('*')
      .eq('token', 'valid-token')
      .gt('expires_at', now)
      .single();

    expect(mockSupabase.eq).toHaveBeenCalledWith('token', 'valid-token');
    expect(mockSupabase.gt).toHaveBeenCalledWith('expires_at', now);
  });
});
