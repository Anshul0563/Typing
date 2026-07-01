import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api.js';
import { Loader } from '../components/Loader.jsx';
import { Notice } from '../components/Toast.jsx';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, Zap, Target, Clock, Calendar, AlertCircle,
  Download, Filter, RefreshCw
} from 'lucide-react';
import './AnalyticsDashboard.css';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
const formatDuration = (seconds) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, '0')}s`;
};

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [examStats, setExamStats] = useState([]);
  const [modeComparison, setModeComparison] = useState([]);
  const [weeklyPattern, setWeeklyPattern] = useState([]);
  const [hourlyPattern, setHourlyPattern] = useState([]);
  const [progressReport, setProgressReport] = useState(null);
  const [detailedReport, setDetailedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('all');
  const [trendDays, setTrendDays] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [user, timeRange, trendDays]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        summaryRes,
        trendRes,
        examRes,
        modeRes,
        weekRes,
        hourRes,
        progressRes,
        detailedRes
      ] = await Promise.all([
        api(`/analytics/summary/${user._id}?timeRange=${timeRange}`),
        api(`/analytics/trend/${user._id}?days=${trendDays}`),
        api(`/analytics/exam-stats/${user._id}`),
        api(`/analytics/mode-comparison/${user._id}`),
        api(`/analytics/weekly-pattern/${user._id}`),
        api(`/analytics/hourly-pattern/${user._id}`),
        api(`/analytics/progress/${user._id}?days=${trendDays}`),
        api(`/analytics/detailed/${user._id}?timeRange=${timeRange}`)
      ]);

      setSummary(summaryRes.data);
      setTrend(trendRes.data);
      setExamStats(examRes.data);
      setModeComparison(modeRes.data);
      setWeeklyPattern(weekRes.data);
      setHourlyPattern(hourRes.data);
      setProgressReport(progressRes.data);
      setDetailedReport(detailedRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportAsJSON = () => {
    const data = {
      summary,
      trend,
      examStats,
      modeComparison,
      weeklyPattern,
      hourlyPattern,
      progressReport,
      exportedAt: new Date().toISOString()
    };
    const element = document.createElement('a');
    element.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    element.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    element.click();
  };

  // Optimize trend data for charting (limit to 50 data points for performance)
  const optimizedTrend = useMemo(() => {
    if (trend.length <= 50) return trend;
    const step = Math.ceil(trend.length / 50);
    return trend.filter((_, i) => i % step === 0);
  }, [trend]);

  if (loading) return <Loader label="Analyzing your performance…" />;

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div>
          <h1>Performance Analytics</h1>
          <p>Deep dive into your typing progress and patterns</p>
        </div>
        <div className="analytics-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="filter-select"
          >
            <option value="all">All time</option>
            <option value="month">Last 30 days</option>
            <option value="week">Last 7 days</option>
          </select>
          <button className="button button-secondary" onClick={loadAnalytics}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="button button-primary" onClick={exportAsJSON}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <Notice>{error}</Notice>

      {/* Key Metrics Overview */}
      <section className="analytics-cards">
        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#6366f1' }}>
            <Zap />
          </div>
          <div>
            <p>Avg Speed</p>
            <h3>{summary?.avgWpm?.toFixed(0) || 0} <span>WPM</span></h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#10b981' }}>
            <Target />
          </div>
          <div>
            <p>Avg Accuracy</p>
            <h3>{summary?.avgAccuracy?.toFixed(1) || 0} <span>%</span></h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#f59e0b' }}>
            <TrendingUp />
          </div>
          <div>
            <p>Best Speed</p>
            <h3>{summary?.maxWpm || 0} <span>WPM</span></h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#06b6d4' }}>
            <Calendar />
          </div>
          <div>
            <p>Total Tests</p>
            <h3>{summary?.totalTests || 0} <span>tests</span></h3>
          </div>
        </div>
      </section>

      {/* Progress Status */}
      {progressReport && (
        <section className="progress-section">
          <h2>Progress Report</h2>
          <div className="progress-cards">
            <div className="progress-card">
              <div className="progress-stat">
                <span className="label">Improvement</span>
                <span className={`value ${progressReport.trend === 'improving' ? 'positive' : progressReport.trend === 'declining' ? 'negative' : 'neutral'}`}>
                  {progressReport.improvement}%
                </span>
              </div>
              <p className="status">{progressReport.trend === 'improving' ? '📈 You\'re improving!' : progressReport.trend === 'declining' ? '📉 Keep practicing' : '⏸️ Stable performance'}</p>
            </div>

            <div className="progress-card">
              <div className="progress-stat">
                <span className="label">Speed Journey</span>
                <span className="value">{progressReport.wpmStart ?? '0.00'} → {progressReport.wpmEnd ?? '0.00'}</span>
              </div>
              <p className="status">WPM progression in {progressReport.totalTestsInPeriod} tests</p>
            </div>
          </div>
        </section>
      )}

      {/* Performance Trend Chart */}
      {trend.length > 0 && (
        <section className="chart-section">
          <h2>Speed & Accuracy Trend</h2>
          <div className="chart-controls">
            <select
              value={trendDays}
              onChange={(e) => setTrendDays(e.target.value)}
              className="filter-select"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={optimizedTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="_id" stroke="#999" />
              <YAxis yAxisId="left" stroke="#6366f1" />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                formatter={(value) => value.toFixed(2)}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="avgWpm" stroke="#6366f1" name="Avg WPM" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="avgAccuracy" stroke="#10b981" name="Accuracy %" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Mode Comparison */}
      {modeComparison.length > 0 && (
        <section className="chart-section">
          <h2>Test Mode Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={modeComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="mode" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
              <Legend />
              <Bar dataKey="avgWpm" fill="#6366f1" name="Avg WPM" />
              <Bar dataKey="avgAccuracy" fill="#10b981" name="Accuracy %" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Weekly Pattern */}
      {weeklyPattern.length > 0 && (
        <section className="chart-section half-width">
          <h2>Weekly Pattern</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyPattern}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="day" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
              <Bar dataKey="testCount" fill="#8b5cf6" name="Tests" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Hourly Pattern */}
      {hourlyPattern.length > 0 && (
        <section className="chart-section half-width">
          <h2>Hourly Pattern</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyPattern}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="hour" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
              <Bar dataKey="testCount" fill="#06b6d4" name="Tests" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Top Exams */}
      {examStats.length > 0 && (
        <section className="chart-section">
          <h2>Most Practiced Exams</h2>
          <div className="exam-list">
            {examStats.slice(0, 5).map((exam, i) => (
              <div key={i} className="exam-item">
                <div className="exam-rank">{i + 1}</div>
                <div className="exam-info">
                  <h4>{exam.exam}</h4>
                  <p>{exam.totalAttempts} attempts</p>
                </div>
                <div className="exam-stats">
                  <span className="wpm">{exam.avgWpm.toFixed(0)} WPM</span>
                  <span className="accuracy">{exam.avgAccuracy.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Detailed Results Table */}
      {detailedReport?.results && detailedReport.results.length > 0 && (
        <section className="chart-section">
          <h2>Recent Test History</h2>
          <div className="results-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Exam</th>
                  <th>Mode</th>
                  <th>Speed</th>
                  <th>Accuracy</th>
                  <th>Errors</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {detailedReport.results.slice(0, 10).map((result, i) => (
                  <tr key={i}>
                    <td>{new Date(result.date).toLocaleDateString()}</td>
                    <td>{result.exam}</td>
                    <td><span className="badge">{result.testMode}</span></td>
                    <td><strong>{result.wpm} WPM</strong></td>
                    <td>{result.accuracy.toFixed(1)}%</td>
                    <td>{result.errors}</td>
                    <td>{formatDuration(result.timeTaken)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
