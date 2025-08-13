import type { Request, Response } from 'express';
import { z } from 'zod';
import usersController from '../controllers/usersController';
import { TUser } from '@server-manager/shared';
import { CoreTool } from 'ai';

// A mock response object to capture the output of controller methods
class MockResponse {
  _status: number = 200;
  _json: any = null;
  _ended: boolean = false;

  status(code: number) {
    this._status = code;
    return this;
  }

  json(data: any) {
    this._json = data;
    this._ended = true;
    return this;
  }

  send(data: any) {
    this._json = data;
    this._ended = true;
    return this;
  }
}

// Wrapper for usersController.getAllUsers
async function getAllUsers(): Promise<TUser[]> {
  const req = {} as Request;
  const res = new MockResponse() as unknown as Response;

  await usersController.getAllUsers(req, res);
  return res._json;
}

// Wrapper for usersController.getUserById
async function getUserById({ id }: { id: number }): Promise<TUser> {
  const req = { params: { id: id.toString() } } as unknown as Request;
  const res = new MockResponse() as unknown as Response;

  await usersController.getUserById(req, res);
  return res._json;
}

export const tools: Record<string, CoreTool> = {
  getAllUsers: {
    description: 'Get a list of all users in the system.',
    parameters: z.object({}),
    execute: getAllUsers,
  },
  getUserById: {
    description: 'Get a specific user by their ID.',
    parameters: z.object({
      id: z.number().describe('The ID of the user to retrieve.'),
    }),
    execute: getUserById,
  },
};
