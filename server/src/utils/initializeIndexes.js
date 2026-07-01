import { Result } from '../models/Result.js';

/**
 * Initialize performance indexes for analytics queries
 * Run this during application startup for optimal analytics performance
 */
export const initializeAnalyticsIndexes = async () => {
  try {
    await Result.collection.createIndexes([
      { key: { user: 1, createdAt: -1 }, name: 'user_1_createdAt_-1' },
      { key: { exam: 1, user: 1 }, name: 'exam_1_user_1' },
      { key: { testMode: 1, user: 1, createdAt: -1 }, name: 'testMode_1_user_1_createdAt_-1' },
      { key: { user: 1, dayOfWeek: 1, hourOfDay: 1 }, name: 'user_1_dayOfWeek_1_hourOfDay_1' }
    ]);

    console.log('Analytics indexes initialized');
  } catch (error) {
    console.warn(`Analytics index initialization warning: ${error.message}`);
    // Don't throw - index creation failures shouldn't block app startup
  }
};

export default initializeAnalyticsIndexes;
