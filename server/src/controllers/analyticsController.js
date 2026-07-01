import mongoose from 'mongoose';
import { Result } from '../models/Result.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

const toObjectId = (id, label = 'id') => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError(`Invalid ${label}`, 400);
  return new mongoose.Types.ObjectId(id);
};

const assertCanReadUserAnalytics = (req, userId) => {
  if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
    throw new AppError('Access denied', 403);
  }
  return toObjectId(userId, 'user id');
};

const boundedInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

export const getUserAnalytics = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const userObjectId = assertCanReadUserAnalytics(req, userId);
  const timeRange = req.query.timeRange || 'all';

  const getDateFilter = () => {
    const now = new Date();
    if (timeRange === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (timeRange === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return new Date(0);
  };

  const dateFilter = getDateFilter();

  const stats = await Result.aggregate([
    {
      $match: {
        user: userObjectId,
        createdAt: { $gte: dateFilter }
      }
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalTests: { $sum: 1 },
              avgWpm: { $avg: '$netWpm' },
              avgAccuracy: { $avg: '$accuracy' },
              maxWpm: { $max: '$netWpm' },
              minWpm: { $min: '$netWpm' },
              totalErrors: { $sum: '$totalErrors' }
            }
          }
        ]
      }
    },
    { $project: { summary: { $arrayElemAt: ['$summary', 0] } } }
  ]);

  const result = stats[0]?.summary || {
    totalTests: 0,
    avgWpm: 0,
    avgAccuracy: 0,
    maxWpm: 0,
    minWpm: 0,
    totalErrors: 0
  };

  res.json({
    success: true,
    data: result
  });
});

export const getPerformanceTrend = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const userObjectId = assertCanReadUserAnalytics(req, userId);
  const daysLimit = boundedInteger(req.query.days, 30, 1, 365);

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysLimit);

  const trend = await Result.aggregate([
    {
      $match: {
        user: userObjectId,
        createdAt: { $gte: fromDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        avgWpm: { $avg: '$netWpm' },
        avgAccuracy: { $avg: '$accuracy' },
        testCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: daysLimit }
  ]);

  res.json({
    success: true,
    data: trend,
    metadata: { daysRequested: req.query.days ? Number.parseInt(req.query.days, 10) : 30, daysLimited: daysLimit, resultsCount: trend.length }
  });
});

export const getExamWiseStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const userObjectId = assertCanReadUserAnalytics(req, userId);

  const stats = await Result.aggregate([
    {
      $match: {
        user: userObjectId
      }
    },
    {
      $group: {
        _id: '$exam',
        totalAttempts: { $sum: 1 },
        avgWpm: { $avg: '$netWpm' },
        avgAccuracy: { $avg: '$accuracy' },
        maxWpm: { $max: '$netWpm' },
        lastAttempt: { $max: '$createdAt' }
      }
    },
    {
      $lookup: {
        from: 'exams',
        localField: '_id',
        foreignField: '_id',
        as: 'examDetails'
      }
    },
    {
      $unwind: '$examDetails'
    },
    {
      $project: {
        exam: '$examDetails.name',
        totalAttempts: 1,
        avgWpm: 1,
        avgAccuracy: 1,
        maxWpm: 1,
        lastAttempt: 1
      }
    },
    { $sort: { totalAttempts: -1 } }
  ]);

  res.json({
    success: true,
    data: stats
  });
});

export const getTestModeComparison = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const userObjectId = assertCanReadUserAnalytics(req, userId);

  const comparison = await Result.aggregate([
    {
      $match: {
        user: userObjectId
      }
    },
    {
      $group: {
        _id: '$testMode',
        totalTests: { $sum: 1 },
        avgWpm: { $avg: '$netWpm' },
        avgAccuracy: { $avg: '$accuracy' },
        maxWpm: { $max: '$netWpm' }
      }
    },
    {
      $project: {
        mode: '$_id',
        totalTests: 1,
        avgWpm: { $round: ['$avgWpm', 2] },
        avgAccuracy: { $round: ['$avgAccuracy', 2] },
        maxWpm: 1,
        _id: 0
      }
    }
  ]);

  res.json({
    success: true,
    data: comparison
  });
});

export const getWeeklyPattern = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const userObjectId = assertCanReadUserAnalytics(req, userId);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const pattern = await Result.aggregate([
    {
      $match: {
        user: userObjectId
      }
    },
    {
      $group: {
        _id: '$dayOfWeek',
        testCount: { $sum: 1 },
        avgWpm: { $avg: '$netWpm' },
        avgAccuracy: { $avg: '$accuracy' }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        day: { $arrayElemAt: [dayNames, '$_id'] },
        testCount: 1,
        avgWpm: { $round: ['$avgWpm', 2] },
        avgAccuracy: { $round: ['$avgAccuracy', 2] },
        _id: 0
      }
    }
  ]);

  res.json({
    success: true,
    data: pattern
  });
});

export const getHourlyPattern = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const userObjectId = assertCanReadUserAnalytics(req, userId);

  const pattern = await Result.aggregate([
    {
      $match: {
        user: userObjectId
      }
    },
    {
      $group: {
        _id: '$hourOfDay',
        testCount: { $sum: 1 },
        avgWpm: { $avg: '$netWpm' },
        avgAccuracy: { $avg: '$accuracy' }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        hour: { $concat: [{ $toString: '$_id' }, ':00'] },
        testCount: 1,
        avgWpm: { $round: ['$avgWpm', 2] },
        avgAccuracy: { $round: ['$avgAccuracy', 2] },
        _id: 0
      }
    }
  ]);

  res.json({
    success: true,
    data: pattern
  });
});

export const getProgressReport = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const userObjectId = assertCanReadUserAnalytics(req, userId);
  const days = boundedInteger(req.query.days, 30, 1, 365);

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const allResults = await Result.find({
    user: userObjectId,
    createdAt: { $gte: fromDate }
  }).sort({ createdAt: 1 });

  if (allResults.length === 0) {
    return res.json({
      success: true,
      data: {
        improvement: 0,
        trend: 'stable',
        totalTestsInPeriod: 0
      }
    });
  }

  const firstThird = allResults.slice(0, Math.ceil(allResults.length / 3));
  const lastThird = allResults.slice(-Math.ceil(allResults.length / 3));

  const avgFirstThird =
    firstThird.reduce((sum, r) => sum + r.netWpm, 0) / firstThird.length;
  const avgLastThird =
    lastThird.reduce((sum, r) => sum + r.netWpm, 0) / lastThird.length;

  const improvement = avgFirstThird > 0 ? ((avgLastThird - avgFirstThird) / avgFirstThird) * 100 : 0;
  const trend = improvement > 5 ? 'improving' : improvement < -5 ? 'declining' : 'stable';

  res.json({
    success: true,
    data: {
      improvement: improvement.toFixed(2),
      trend,
      totalTestsInPeriod: allResults.length,
      wpmStart: avgFirstThird.toFixed(2),
      wpmEnd: avgLastThird.toFixed(2)
    }
  });
});

export const getDetailedReport = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const userObjectId = assertCanReadUserAnalytics(req, userId);
  const { examId, timeRange = 'all' } = req.query;
  const pageNum = boundedInteger(req.query.page, 1, 1, 100000);
  const pageSize = boundedInteger(req.query.limit, 50, 1, 100);

  const getDateFilter = () => {
    const now = new Date();
    if (timeRange === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (timeRange === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return new Date(0);
  };

  const query = {
    user: userObjectId,
    createdAt: { $gte: getDateFilter() }
  };

  if (examId) {
    query.exam = toObjectId(examId, 'exam id');
  }

  const [results, totalCount, stats] = await Promise.all([
    Result.find(query)
      .populate('exam', 'name organization')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Result.countDocuments(query),
    Result.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          avgWpm: { $avg: '$netWpm' },
          avgAccuracy: { $avg: '$accuracy' },
          bestWpm: { $max: '$netWpm' },
          worstWpm: { $min: '$netWpm' },
          totalErrors: { $sum: '$totalErrors' }
        }
      }
    ])
  ]);

  const statsObj = stats[0] || {
    totalAttempts: 0,
    avgWpm: 0,
    avgAccuracy: 0,
    bestWpm: 0,
    worstWpm: 0,
    totalErrors: 0
  };

  res.json({
    success: true,
    data: {
      stats: {
        totalAttempts: statsObj.totalAttempts,
        avgWpm: Math.round(statsObj.avgWpm * 100) / 100,
        avgAccuracy: Math.round(statsObj.avgAccuracy * 100) / 100,
        bestWpm: statsObj.bestWpm,
        worstWpm: statsObj.worstWpm,
        totalErrors: statsObj.totalErrors
      },
      results: results.map(r => ({
        date: r.createdAt,
        exam: r.exam?.name || 'Unknown',
        wpm: r.netWpm,
        accuracy: r.accuracy,
        errors: r.totalErrors,
        testMode: r.testMode,
        timeTaken: r.timeTaken
      })),
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: totalCount,
        pages: Math.ceil(totalCount / pageSize)
      }
    }
  });
});
