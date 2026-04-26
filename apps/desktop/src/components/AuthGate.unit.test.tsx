// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthGate } from './AuthGate';

// Mock the AuthProvider's useAuth hook
const mockLogin = vi.fn();
const mockSignup = vi.fn();
const mockLogout = vi.fn();

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: mockAuthState.isAuthenticated,
    isLoading: mockAuthState.isLoading,
    userId: mockAuthState.userId,
    login: mockLogin,
    signup: mockSignup,
    logout: mockLogout,
  }),
}));

let mockAuthState = { isAuthenticated: false, isLoading: false, userId: null as string | null };

describe('AuthGate', () => {
  beforeEach(() => {
    mockAuthState = { isAuthenticated: false, isLoading: false, userId: null };
    mockLogin.mockReset();
    mockSignup.mockReset();
  });

  it('shows loading screen when isLoading is true', () => {
    mockAuthState = { isAuthenticated: false, isLoading: true, userId: null };
    render(
      <AuthGate>
        <div>App Content</div>
      </AuthGate>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('App Content')).not.toBeInTheDocument();
  });

  it('shows login screen when not authenticated', () => {
    render(
      <AuthGate>
        <div>App Content</div>
      </AuthGate>
    );
    expect(screen.getByText('Sign in to get started')).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Create account')).toBeInTheDocument();
    expect(screen.queryByText('App Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockAuthState = { isAuthenticated: true, isLoading: false, userId: 'user-1' };
    render(
      <AuthGate>
        <div>App Content</div>
      </AuthGate>
    );
    expect(screen.getByText('App Content')).toBeInTheDocument();
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
  });

  it('calls login when Sign in button is clicked', () => {
    render(
      <AuthGate>
        <div>App Content</div>
      </AuthGate>
    );
    fireEvent.click(screen.getByText('Sign in'));
    expect(mockLogin).toHaveBeenCalledOnce();
  });

  it('calls signup when Create account button is clicked', () => {
    render(
      <AuthGate>
        <div>App Content</div>
      </AuthGate>
    );
    fireEvent.click(screen.getByText('Create account'));
    expect(mockSignup).toHaveBeenCalledOnce();
  });
});
