import { mockReset, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import prisma from '../prisma/prisma-client';

// Resolves to the deep mock created in src/prisma/__mocks__/prisma-client.ts.
// This only replaces the real client when the importing test file has called
// jest.mock('../../prisma/prisma-client') (path relative to that file) —
// without that call, `prisma` here is the real PrismaClient and every
// service under test would try to hit a live database.
const prismaMock = (prisma as unknown as DeepMockProxy<PrismaClient>) as any;

// Setup basic mock returns - minimal configuration
const setupBasicMocks = () => {
  // Override methods that cause circular type issues
  prismaMock.article = {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  };
  
  prismaMock.user = {
    create: jest.fn().mockResolvedValue({}),
    findUnique: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({}),
  };
  
  prismaMock.comment = {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue({}),
  };
  
  prismaMock.tag = {
    findMany: jest.fn().mockResolvedValue([]),
  };
};

// Initialize basic mocks
setupBasicMocks();

// Reset function that re-applies basic setup
export const resetPrismaMock = () => {
  mockReset(prismaMock);
  setupBasicMocks();
};

beforeEach(() => {
  resetPrismaMock();
});

export default prismaMock;