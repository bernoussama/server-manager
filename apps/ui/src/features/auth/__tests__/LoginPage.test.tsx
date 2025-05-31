import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from '../LoginPage';
import { useAuth } from '../AuthContext';
import { BrowserRouter as Router } from 'react-router-dom'; // Needed for useNavigate

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock useAuth
jest.mock('../AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('LoginPage', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    mockLogin.mockClear();
    mockNavigate.mockClear();
    (fetch as jest.Mock).mockClear();
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      isAuthenticated: false, // Default to not authenticated
    });
  });

  // Wrap component rendering in Router because LoginPage uses useNavigate
  const renderLoginPage = () => {
    return render(
      <Router>
        <LoginPage />
      </Router>
    );
  };

  test('renders correctly with email, password inputs and login button', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('successful login calls auth context login and navigates', async () => {
    const mockToken = 'test-token';
    const mockUser = { id: '1', email: 'test@example.com' };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: mockToken, user: mockUser }),
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/auth/login', expect.any(Object));
      expect(mockLogin).toHaveBeenCalledWith(mockToken, mockUser);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('failed login displays an error message', async () => {
    const errorMessage = 'Invalid credentials';
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: errorMessage }),
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/auth/login', expect.any(Object));
      expect(mockLogin).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

   test('network error during login displays an error message', async () => {
    const networkErrorMessage = 'Network error';
    (fetch as jest.Mock).mockRejectedValueOnce(new Error(networkErrorMessage));

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(networkErrorMessage)).toBeInTheDocument();
      // Or a more generic message if your component handles it that way
      // expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
    });
  });
});
