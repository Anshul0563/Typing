import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getUserAnalytics,
  getPerformanceTrend,
  getExamWiseStats,
  getTestModeComparison,
  getWeeklyPattern,
  getHourlyPattern,
  getProgressReport,
  getDetailedReport
} from '../controllers/analyticsController.js';

const router = express.Router();

// All analytics routes require authentication
router.use(authenticateToken);

// Get overall user statistics
router.get('/summary/:userId', getUserAnalytics);

// Get performance trend over time (default 30 days)
router.get('/trend/:userId', getPerformanceTrend);

// Get exam-wise statistics
router.get('/exam-stats/:userId', getExamWiseStats);

// Compare performance across test modes (TCS, NTA, Standard)
router.get('/mode-comparison/:userId', getTestModeComparison);

// Get weekly activity pattern (best performing days)
router.get('/weekly-pattern/:userId', getWeeklyPattern);

// Get hourly activity pattern (best performing hours)
router.get('/hourly-pattern/:userId', getHourlyPattern);

// Get progress report with improvement metrics
router.get('/progress/:userId', getProgressReport);

// Get detailed results with filtering
router.get('/detailed/:userId', getDetailedReport);

export default router;
