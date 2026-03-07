import { useState, useEffect } from 'react';
import api from '../api';

export default function EmailDashboard() {
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
      setStats(response.data || {
        overview: { total_sent: 0, total_opened: 0, open_rate: 0, total_opens: 0 },
        byType: [],
        recent: [],
      });
    } catch (err) {
      console.error('Failed to load email stats:', err);
      setError(err.response?.data?.error || 'Failed to load email stats');
      setStats({
        overview: { total_sent: 0, total_opened: 0, open_rate: 0, total_opens: 0 },
        byType: [],
        recent: [],
      });
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
      setRangeStats(response.data || {
        overview: { total_sent: 0, total_opened: 0, open_rate: 0, total_opens: 0 },
        byType: [],
        daily: [],
      });
    } catch (err) {
      console.error('Failed to load date range stats:', err);
      setError(err.response?.data?.error || 'Failed to load date range stats');
      setRangeStats({
        overview: { total_sent: 0, total_opened: 0, open_rate: 0, total_opens: 0 },
        byType: [],
        daily: [],
      });
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
      verification: ' Verification',
      password_reset: ' Password Reset',
      blast: ' Blast Email',
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

  return (<div className="minimum-h-screen p-8"><div className="max-w-7xl mx-auto"><h1>Email Dashboard</h1><p>Stats will load here</p></div></div>);
}