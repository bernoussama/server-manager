import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignupPage from '../SignupPage';
import { BrowserRouter as Router } from 'react-router-dom'; // Needed if SignupPage uses useNavigate

// Mock react-router-dom's useNavigate (if SignupPage uses it, though not explicitly requested for redirection)
const mockNavigateSignup = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigateSignup, // Provide a separate mock if needed or reuse if behavior is same
}));

// Mock global fetch
global.fetch = jest.fn();

describe('SignupPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockNavigateSignup.mockClear();
    (fetch as jest.Mock).mockClear();
  });

  // Wrap component rendering in Router if it uses Link or useNavigate
  const renderSignupPage = () => {
    return render(
      <Router>
        <SignupPage />
      </Router>
    );
  };

  test('renders correctly with email, password inputs and signup button', () => {
    renderSignupPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signup/i })).toBeInTheDocument();
  });

  test('successful signup displays a success message and clears form', async () => {
    const mockUser = { id: '2', email: 'newuser@example.com' };
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Signup successful', user: mockUser }),
    });

    renderSignupPage();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
    fireEvent.click(screen.getByRole('button', { name: /signup/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/auth/signup', expect.any(Object));
      expect(screen.getByText('Signup successful! Please login.')).toBeInTheDocument();
      expect(emailInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
    });
  });

  test('failed signup (e.g., user exists) displays an error message', async () => {
    const errorMessage = 'User already exists';
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: errorMessage }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /signup/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/auth/signup', expect.any(Object));
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('network error during signup displays an error message', async () => {
    const networkErrorMessage = 'Failed to connect';
    (fetch as jest.Mock).mockRejectedValueOnce(new Error(networkErrorMessage));

    renderSignupPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /signup/i }));

    await waitFor(() => {
        expect(screen.getByText(networkErrorMessage)).toBeInTheDocument();
        // Or a more generic message like:
        // expect(screen.getByText(/an unexpected error occurred during signup/i)).toBeInTheDocument();
    });
  });
});
