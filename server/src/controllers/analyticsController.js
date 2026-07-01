import mongoose from 'mongoose';
import { Result } from '../models/Result.js';
import { Exam } from '../models/Exam.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getUserAnalytics = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const timeRange = req.query.timeRange || 'all'; // all, week, month

  const getDateFilter = () => {
    const now = new Date();
    if (timeRange === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (timeRange === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return new Date(0); // all time
  };

  const dateFilter = getDateFilter();

  const stats = await Result.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: dateFilter }
      }
    },
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
  ]);

  res.json({
    success: true,
    data: stats[0] || {
      totalTests: 0,
      avgWpm: 0,
      avgAccuracy: 0,
      maxWpm: 0,
      minWpm: 0,
      totalErrors: 0
    }
  });
});

export const getPerformanceTrend = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { days = 30 } = req.query;

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - parseInt(days));

  const trend = await Result.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
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
    { $limit: parseInt(days) }
  ]);

  res.json({
    success: true,
    data: trend
  });
});

export const getExamWiseStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const stats = await Result.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId)
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

  const comparison = await Result.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId)
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

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const pattern = await Result.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId)
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

  const pattern = await Result.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId)
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
  const { days = 30 } = req.query;

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - parseInt(days));

  const allResults = await Result.find({
    user: mongoose.Types.ObjectId(userId),
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

  const improvement = ((avgLastThird - avgFirstThird) / avgFirstThird) * 100;
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
  const { examId, timeRange = 'all' } = req.query;

  const getDateFilter = () => {
    const now = new Date();
    if (timeRange === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (timeRange === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return new Date(0);
  };

  const query = {
    user: mongoose.Types.ObjectId(userId),
    createdAt: { $gte: getDateFilter() }
  };

  if (examId) {
    query.exam = mongoose.Types.ObjectId(examId);
  }

  const results = await Result.find(query)
    .populate('exam', 'name organization')
    .sort({ createdAt: -1 })
    .limit(50);

  const stats = {
    totalAttempts: results.length,
    avgWpm: (results.reduce((sum, r) => sum + r.netWpm, 0) / results.length).toFixed(2),
    avgAccuracy: (results.reduce((sum, r) => sum + r.accuracy, 0) / results.length).toFixed(2),
    bestWpm: Math.max(...results.map(r => r.netWpm)),
    worstWpm: Math.min(...results.map(r => r.netWpm)),
    totalErrors: results.reduce((sum, r) => sum + r.totalErrors, 0)
  };

  res.json({
    success: true,
    data: {
      stats,
      results: results.map(r => ({
        date: r.createdAt,
        exam: r.exam.name,
        wpm: r.netWpm,
        accuracy: r.accuracy,
        errors: r.totalErrors,
        testMode: r.testMode,
        timeTaken: r.timeTaken
      }))
    }
  });
});
