// User Types

// This type represents the structure for creating a new user in the database,
// including the password hash. It's primarily for backend internal use
// between services or before hashing, if not directly using Drizzle's NewUser type.
export interface NewUserCredentials {
  email: string;
  passwordHash: string;
  // name?: string; // Not in current DB model
  // age?: number;  // Not in current DB model
}

// Represents the decoded user information, typically from a JWT token,
// used for authentication context.
export interface AuthUser {
  id: number;
  email: string;
  // Add other JWT payload fields if necessary (e.g., roles)
} 

// Note: Other user-related types (for API inputs and outputs) are now
// inferred from Zod schemas in 'packages/shared/src/validators/userValidator.ts'.
// Examples:
// - UserSignupInputType
// - UserLoginInputType
// - UserCreateInputType
// - UserUpdateInputType
// - UserIdInputType
// - UserOutputType (for API responses, excludes sensitive data)
// - LoginOutputType