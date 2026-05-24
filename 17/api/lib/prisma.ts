import { mockDb } from '../mocks/database.js';
import { PrismaClient } from '@prisma/client';

let prisma: any;

const createPrismaWithFallback = (): any => {
  try {
    const realPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
    
    return new Proxy(realPrisma, {
      get(target: any, prop: string) {
        const originalModel = target[prop];
        if (typeof originalModel === 'object' && originalModel !== null) {
          return new Proxy(originalModel, {
            get(modelTarget: any, methodName: string) {
              const originalMethod = modelTarget[methodName];
              if (typeof originalMethod === 'function') {
                return async (...args: any[]) => {
                  try {
                    return await originalMethod.apply(modelTarget, args);
                  } catch (error) {
                    console.log(`[DB Fallback] ${prop}.${methodName} failed, using mock DB`);
                    const mockModel = (mockDb as any)[prop];
                    if (mockModel && typeof mockModel[methodName] === 'function') {
                      return mockModel[methodName](...args);
                    }
                    throw error;
                  }
                };
              }
              return originalMethod;
            },
          });
        }
        return originalModel;
      },
    });
  } catch (error) {
    console.log('Using mock database (PostgreSQL not available)');
    return mockDb;
  }
};

prisma = createPrismaWithFallback();

export { prisma };
export default prisma;
