import type { Request, Response } from 'express';
import { z } from 'zod';
import usersController from '../controllers/usersController';
import dnsController from '../controllers/dnsController';
import httpController from '../controllers/httpController';
import servicesController from '../controllers/servicesController';
import { TUser, dnsConfigurationSchema, httpConfigSchema } from '@server-manager/shared';
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

// --- User Tools ---
async function getAllUsers(): Promise<TUser[]> {
  const req = {} as Request;
  const res = new MockResponse() as unknown as Response;
  await usersController.getAllUsers(req, res);
  return res._json;
}

async function getUserById({ id }: { id: number }): Promise<TUser> {
  const req = { params: { id: id.toString() } } as unknown as Request;
  const res = new MockResponse() as unknown as Response;
  await usersController.getUserById(req, res);
  return res._json;
}

// --- DNS Tools ---
async function getCurrentDnsConfiguration() {
  const req = {} as Request;
  const res = new MockResponse() as unknown as Response;
  await dnsController.getCurrentDnsConfiguration(req, res);
  return res._json;
}

async function updateDnsConfiguration(config: any) {
  const req = { body: config } as Request;
  const res = new MockResponse() as unknown as Response;
  await dnsController.updateDnsConfiguration(req, res);
  return res._json;
}

// --- HTTP Tools ---
async function getCurrentHttpConfiguration() {
  const req = {} as Request;
  const res = new MockResponse() as unknown as Response;
  await httpController.getCurrentHttpConfiguration(req, res);
  return res._json;
}

async function updateHttpConfiguration(config: any) {
  const req = { body: config } as Request;
  const res = new MockResponse() as unknown as Response;
  await httpController.updateHttpConfiguration(req, res);
  return res._json;
}

async function validateHttpConfiguration(config: any) {
  const req = { body: config } as Request;
  const res = new MockResponse() as unknown as Response;
  await httpController.validateHttpConfiguration(req, res);
  return res._json;
}

async function controlHttpService({ action }: { action: 'start' | 'stop' | 'restart' | 'reload' | 'status' }) {
  const req = { params: { action } } as unknown as Request;
  const res = new MockResponse() as unknown as Response;
  await httpController.controlHttpService(req, res);
  return res._json;
}

async function getHttpServiceStatus() {
    const req = {} as Request;
    const res = new MockResponse() as unknown as Response;
    await httpController.getHttpServiceStatus(req, res);
    return res._json;
}

// --- Service Tools ---
async function getServiceStatus({ service }: { service: 'named' | 'dhcpd' | 'httpd' }) {
    const req = { params: { service } } as unknown as Request;
    const res = new MockResponse() as unknown as Response;
    await servicesController.getServiceStatus(req, res);
    return res._json;
}

async function startService({ service }: { service: 'named' | 'dhcpd' | 'httpd' }) {
    const req = { params: { service } } as unknown as Request;
    const res = new MockResponse() as unknown as Response;
    await servicesController.startService(req, res);
    return res._json;
}

async function stopService({ service }: { service: 'named' | 'dhcpd' | 'httpd' }) {
    const req = { params: { service } } as unknown as Request;
    const res = new MockResponse() as unknown as Response;
    await servicesController.stopService(req, res);
    return res._json;
}

async function restartService({ service }: { service: 'named' | 'dhcpd' | 'httpd' }) {
    const req = { params: { service } } as unknown as Request;
    const res = new MockResponse() as unknown as Response;
    await servicesController.restartService(req, res);
    return res._json;
}

async function getAllServicesStatus() {
    const req = {} as Request;
    const res = new MockResponse() as unknown as Response;
    await servicesController.getAllServicesStatus(req, res);
    return res._json;
}


export const tools: Record<string, CoreTool> = {
  // User tools
  getAllUsers: {
    description: 'Get a list of all users in the system.',
    parameters: z.object({}),
    execute: getAllUsers,
  },
  getUserById: {
    description: 'Get a specific user by their ID.',
    parameters: z.object({ id: z.number().describe('The ID of the user to retrieve.') }),
    execute: getUserById,
  },

  // DNS tools
  getCurrentDnsConfiguration: {
    description: 'Get the current DNS configuration.',
    parameters: z.object({}),
    execute: getCurrentDnsConfiguration,
  },
  updateDnsConfiguration: {
    description: 'Update the DNS configuration. Use getCurrentDnsConfiguration to get the current config first.',
    parameters: dnsConfigurationSchema,
    execute: updateDnsConfiguration,
  },

  // HTTP tools
  getCurrentHttpConfiguration: {
    description: 'Get the current HTTP configuration.',
    parameters: z.object({}),
    execute: getCurrentHttpConfiguration,
  },
  updateHttpConfiguration: {
    description: 'Update the HTTP configuration. Use getCurrentHttpConfiguration to get the current config first.',
    parameters: httpConfigSchema,
    execute: updateHttpConfiguration,
  },
  validateHttpConfiguration: {
    description: 'Validate the HTTP configuration without applying it.',
    parameters: httpConfigSchema,
    execute: validateHttpConfiguration,
  },
  controlHttpService: {
    description: 'Control the HTTP service (start, stop, restart, reload, status).',
    parameters: z.object({ action: z.enum(['start', 'stop', 'restart', 'reload', 'status']) }),
    execute: controlHttpService,
  },
    getHttpServiceStatus: {
    description: 'Get the status of the HTTP service.',
    parameters: z.object({}),
    execute: getHttpServiceStatus,
  },

  // Service tools
  getServiceStatus: {
    description: 'Get the status of a specific service (named, dhcpd, httpd).',
    parameters: z.object({ service: z.enum(['named', 'dhcpd', 'httpd']) }),
    execute: getServiceStatus,
  },
  startService: {
    description: 'Start a specific service (named, dhcpd, httpd).',
    parameters: z.object({ service: z.enum(['named', 'dhcpd', 'httpd']) }),
    execute: startService,
  },
  stopService: {
    description: 'Stop a specific service (named, dhcpd, httpd).',
    parameters: z.object({ service: z.enum(['named', 'dhcpd', 'httpd']) }),
    execute: stopService,
  },
  restartService: {
    description: 'Restart a specific service (named, dhcpd, httpd).',
    parameters: z.object({ service: z.enum(['named', 'dhcpd', 'httpd']) }),
    execute: restartService,
  },
  getAllServicesStatus: {
    description: 'Get the status of all services.',
    parameters: z.object({}),
    execute: getAllServicesStatus,
  },
};
