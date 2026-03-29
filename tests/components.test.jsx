import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Outlet } from 'react-router-dom';
import React from 'react';

// Mock react-router-dom's useOutletContext
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: vi.fn(() => ({
      user: { user: { id: '1', username: 'testuser' }, hasInstallation: true },
      setUser: vi.fn(),
    })),
  };
});

// Mock the api module
vi.mock('../src/api', () => ({
  api: {
    getAuthUrl: vi.fn(),
    getMe: vi.fn(),
    getRepos: vi.fn(),
    getJobs: vi.fn(),
    createPR: vi.fn(),
    getJob: vi.fn(),
  },
  setToken: vi.fn(),
  getToken: vi.fn(),
}));

import { api, getToken, setToken } from '../src/api';
import { useOutletContext } from 'react-router-dom';
import Login from '../src/pages/Login';
import Connect from '../src/pages/Connect';
import Dashboard from '../src/pages/Dashboard';

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getToken.mockReturnValue(null);
  });

  it('should render login button', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByText(/Login with GitHub/i)).toBeInTheDocument();
  });

  it('should call getAuthUrl when login clicked', async () => {
    api.getAuthUrl.mockResolvedValue({ url: 'https://github.com/login' });
    
    // Mock window.location
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const loginButton = screen.getByText(/Login with GitHub/i);
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(api.getAuthUrl).toHaveBeenCalled();
    });

    window.location = originalLocation;
  });
});

describe('Connect Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getToken.mockReturnValue('test-token');
    useOutletContext.mockReturnValue({
      user: { user: { id: '1', username: 'testuser' }, hasInstallation: false },
      setUser: vi.fn(),
    });
  });

  it('should render install button', () => {
    render(
      <MemoryRouter initialEntries={['/connect']}>
        <Connect />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /Install GitHub App/i })).toBeInTheDocument();
  });

  it('should show installation steps', () => {
    render(
      <MemoryRouter>
        <Connect />
      </MemoryRouter>
    );

    expect(screen.getByText(/Click the button below/i)).toBeInTheDocument();
    expect(screen.getByText(/Select the repositories/i)).toBeInTheDocument();
  });
});

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getToken.mockReturnValue('test-token');
    useOutletContext.mockReturnValue({
      user: { user: { id: '1', username: 'testuser' }, hasInstallation: true },
      setUser: vi.fn(),
    });
    api.getRepos.mockResolvedValue({
      repos: [
        { id: 1, name: 'repo1', full_name: 'user/repo1', private: false },
        { id: 2, name: 'repo2', full_name: 'user/repo2', private: true },
      ],
    });
    api.getJobs.mockResolvedValue({ jobs: [] });
  });

  it('should show loading state initially', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});

describe('Component Integration', () => {
  it('should handle API errors gracefully', async () => {
    getToken.mockReturnValue('test-token');
    useOutletContext.mockReturnValue({
      user: { user: { id: '1', username: 'testuser' }, hasInstallation: true },
      setUser: vi.fn(),
    });
    api.getRepos.mockRejectedValue(new Error('Network error'));
    api.getJobs.mockRejectedValue(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
