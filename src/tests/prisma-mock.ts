import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

// Create a single mock instance with minimal typing
const prismaMock = mockDeep<PrismaClient>() as any;

// Setup basic mock returns - minimal configuration
const setupBasicMocks = () => {
  // Override methods that cause circular type issues
  prismaMock.article = {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
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