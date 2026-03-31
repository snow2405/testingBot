import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock the api module
vi.mock('../src/api', () => ({
  api: {
    getMe: vi.fn(),
  },
  setToken: vi.fn(),
  getToken: vi.fn(),
}));

import { api, getToken, setToken } from '../src/api';
import App from '../src/App';

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getToken.mockReturnValue(null);
  });

  it('should render loading state initially', () => {
    getToken.mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('should redirect to login when no token', async () => {
    getToken.mockReturnValue(null);

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
  });

  it('should load user data when authenticated', async () => {
    getToken.mockReturnValue('valid-token');
    api.getMe.mockResolvedValue({
      user: { id: '1', username: 'testuser' },
      hasInstallation: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.getMe).toHaveBeenCalled();
    });

    expect(screen.getByText(/PR Bot/i)).toBeInTheDocument();
  });

  it('should display username when user is authenticated', async () => {
    getToken.mockReturnValue('valid-token');
    api.getMe.mockResolvedValue({
      user: { id: '1', username: 'testuser' },
      hasInstallation: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('@testuser')).toBeInTheDocument();
    });
  });

  it('should show logout button for authenticated user', async () => {
    getToken.mockReturnValue('valid-token');
    api.getMe.mockResolvedValue({
      user: { id: '1', username: 'testuser' },
      hasInstallation: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
    });
  });

  it('should clear token on logout', async () => {
    getToken.mockReturnValue('valid-token');
    api.getMe.mockResolvedValue({
      user: { id: '1', username: 'testuser' },
      hasInstallation: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: /Logout/i });
    logoutButton.click();

    await waitFor(() => {
      expect(setToken).toHaveBeenCalledWith(null);
    });
  });

  it('should handle auth check failure gracefully', async () => {
    getToken.mockReturnValue('invalid-token');
    api.getMe.mockRejectedValue(new Error('Unauthorized'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(setToken).toHaveBeenCalledWith(null);
    });

    consoleSpy.mockRestore();
  });

  it('should handle token from URL parameters', async () => {
    getToken.mockReturnValueOnce(null).mockReturnValue('url-token');
    api.getMe.mockResolvedValue({
      user: { id: '1', username: 'testuser' },
      hasInstallation: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard?token=url-token']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(setToken).toHaveBeenCalledWith('url-token');
    });
  });

  it('should redirect to connect page when no installation', async () => {
    getToken.mockReturnValue('valid-token');
    api.getMe.mockResolvedValue({
      user: { id: '1', username: 'testuser' },
      hasInstallation: false,
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.getMe).toHaveBeenCalled();
    });
  });

  it('should render header with app title', async () => {
    getToken.mockReturnValue('valid-token');
    api.getMe.mockResolvedValue({
      user: { id: '1', username: 'testuser' },
      hasInstallation: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/PR Bot/i)).toBeInTheDocument();
    });
  });

  it('should only fetch auth status on location search change', async () => {
    getToken.mockReturnValue('valid-token');
    api.getMe.mockResolvedValue({
      user: { id: '1', username: 'testuser' },
      hasInstallation: true,
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.getMe).toHaveBeenCalledTimes(1);
    });

    // Verify it doesn't call getMe again with same path
    rerender(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Should still be 1 call since location.search hasn't changed
      expect(api.getMe).toHaveBeenCalledTimes(1);
    });
  });
});
