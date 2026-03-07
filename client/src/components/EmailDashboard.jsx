import { useState, useEffect } from 'react';
import api from '../api';
import { useLanguage } from '../LanguageContext';

export default function EmailDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [rangeStats, setRangeStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/email/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load email stats:', err);
      setError(err.response?.data?.error || 'Failed to load email stats');
    } finally {
      setLoading(false);
    }
  };

  const loadRangeStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/email/stats/range', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      setRangeStats(response.data);
    } catch (err) {
      console.error('Failed to load date range stats:', err);
      setError(err.response?.data?.error || 'Failed to load date range stats');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const formatPercent = (value) => {
    if (value == null) return '0.0%';
    return `${parseFloat(value).toFixed(1)}%`;
  };

  const getTypeLabel = (type) => {
    const labels = {
      verification: '📧 Verification',
      password_reset: '🔑 Password Reset',
      blast: '📢 Blast Email',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      verification: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
      password_reset: 'from-red-500/20 to-red-600/10 border-red-500/30',
      blast: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    };
    return colors[type] || 'from-gray-500/20 to-gray-600/10 border-gray-500/30';
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            📧 Email Dashboard
          </h1>
          <p className="text-gray-400">Track email opens and engagement metrics</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-slate-800/50 text-gray-400 hover:bg-slate-800'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'recent'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-slate-800/50 text-gray-400 hover:bg-slate-800'
            }`}
          >
            📋 Recent Emails
          </button>
          <button
            onClick={() => setActiveTab('daterange')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'daterange'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-slate-800/50 text-gray-400 hover:bg-slate-800'
            }`}
          >
            📅 Date Range
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-6">
                <div className="text-purple-400 text-sm font-medium mb-2">Total Sent</div>
                <div className="text-3xl font-bold">{stats.overview.total_sent || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-2xl p-6">
                <div className="text-green-400 text-sm font-medium mb-2">Total Opened</div>
                <div className="text-3xl font-bold">{stats.overview.total_opened || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-6">
                <div className="text-blue-400 text-sm font-medium mb-2">Open Rate</div>
                <div className="text-3xl font-bold">{formatPercent(stats.overview.open_rate)}</div>
              </div>
              <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 border border-pink-500/30 rounded-2xl p-6">
                <div className="text-pink-400 text-sm font-medium mb-2">Total Opens</div>
                <div className="text-3xl font-bold">{stats.overview.total_opens || 0}</div>
                <div className="text-xs text-gray-400 mt-1">Including re-opens</div>
              </div>
            </div>

            {/* Stats by Type */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-xl font-bold mb-4">Performance by Email Type</h2>
              <div className="grid grid-cols-1 gap-4">
                {stats.byType.map((typeStats) => (
                  <div
                    key={typeStats.type}
                    className={`bg-gradient-to-r ${getTypeColor(typeStats.type)} border rounded-xl p-5`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold">{getTypeLabel(typeStats.type)}</h3>
                      <span className="text-2xl font-bold">{formatPercent(typeStats.open_rate)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Sent</div>
                        <div className="text-xl font-bold">{typeStats.sent}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Opened</div>
                        <div className="text-xl font-bold">{typeStats.opened}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Total Opens</div>
                        <div className="text-xl font-bold">{typeStats.total_opens || 0}</div>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3 w-full bg-slate-900/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, typeStats.open_rate || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Emails Tab */}
        {activeTab === 'recent' && stats && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Recipient</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Sent At</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Opens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {stats.recent.map((email) => (
                    <tr key={email.tracking_id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm">{getTypeLabel(email.type)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{email.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{email.recipient_name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{formatDate(email.sent_at)}</td>
                      <td className="px-6 py-4">
                        {email.opened_at ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                            Opened
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-medium">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                            Not Opened
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium">{email.open_count || 0}</span>
                        {email.last_opened_at && email.open_count > 1 && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Last: {formatDate(email.last_opened_at)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Date Range Tab */}
        {activeTab === 'daterange' && (
          <div>
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Select Date Range</h2>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={loadRangeStats}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load Stats'}
                </button>
              </div>
            </div>

            {rangeStats && (
              <div>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-6">
                    <div className="text-purple-400 text-sm font-medium mb-2">Total Sent</div>
                    <div className="text-3xl font-bold">{rangeStats.overview.total_sent || 0}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-2xl p-6">
                    <div className="text-green-400 text-sm font-medium mb-2">Total Opened</div>
                    <div className="text-3xl font-bold">{rangeStats.overview.total_opened || 0}</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-6">
                    <div className="text-blue-400 text-sm font-medium mb-2">Open Rate</div>
                    <div className="text-3xl font-bold">{formatPercent(rangeStats.overview.open_rate)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 border border-pink-500/30 rounded-2xl p-6">
                    <div className="text-pink-400 text-sm font-medium mb-2">Total Opens</div>
                    <div className="text-3xl font-bold">{rangeStats.overview.total_opens || 0}</div>
                  </div>
                </div>

                {/* Daily Stats */}
                <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-6 mb-6">
                  <h2 className="text-xl font-bold mb-4">Daily Performance</h2>
                  <div className="space-y-3">
                    {rangeStats.daily.map((day) => (
                      <div key={day.date} className="bg-slate-900/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{day.date}</span>
                          <span className="text-lg font-bold">{formatPercent(day.open_rate)}</span>
                        </div>
                        <div className="flex gap-6 text-sm text-gray-400">
                          <span>Sent: {day.sent}</span>
                          <span>Opened: {day.opened}</span>
                        </div>
                        <div className="mt-2 w-full bg-slate-800 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, day.open_rate || 0)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats by Type */}
                <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-6">
                  <h2 className="text-xl font-bold mb-4">Performance by Type</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {rangeStats.byType.map((typeStats) => (
                      <div
                        key={typeStats.type}
                        className={`bg-gradient-to-r ${getTypeColor(typeStats.type)} border rounded-xl p-5`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-bold">{getTypeLabel(typeStats.type)}</h3>
                          <span className="text-2xl font-bold">{formatPercent(typeStats.open_rate)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-400">Sent</div>
                            <div className="text-xl font-bold">{typeStats.sent}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Opened</div>
                            <div className="text-xl font-bold">{typeStats.opened}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
