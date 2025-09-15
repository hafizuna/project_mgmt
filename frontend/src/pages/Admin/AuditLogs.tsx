import React, { useState, useEffect, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { 
  auditLogsApi, 
  auditLogHelpers, 
  type AuditLog, 
  type AuditLogFilters,
  type AuditLogSummary 
} from '../../lib/api/auditLogs';

const ENTITY_TYPES = ['User', 'Project', 'Task', 'Organization', 'Auth'];
const ACTION_TYPES = [
  'user.created', 'user.updated', 'user.deleted', 'user.role_changed', 'user.status_changed',
  'auth.login', 'auth.logout', 'auth.register', 'auth.password_changed',
  'project.created', 'project.updated', 'project.deleted', 'project.status_changed',
  'task.created', 'task.updated', 'task.deleted', 'task.status_changed',
  'org.settings_updated', 'org.updated'
];

export default function AuditLogs() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<AuditLogSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Filters
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 50,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [summaryDays, setSummaryDays] = useState(7);

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    loadSummary();
  }, [summaryDays]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await auditLogsApi.getAuditLogs(filters);
      
      // Defensive check - ensure response has expected structure
      if (response && typeof response === 'object') {
        setAuditLogs(response.auditLogs || []);
        setPagination(response.pagination || {
          page: 1,
          limit: 50,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });
      } else {
        console.warn('Unexpected response format:', response);
        setAuditLogs([]);
        setPagination({
          page: 1,
          limit: 50,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setAuditLogs([]);
      setPagination({
        page: 1,
        limit: 50,
        totalCount: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const summaryData = await auditLogsApi.getSummary(summaryDays);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load audit summary:', error);
    }
  };

  const applyFilters = () => {
    const newFilters: AuditLogFilters = {
      page: 1,
      limit: 50,
    };

    if (searchTerm.trim()) {
      newFilters.action = searchTerm.trim();
    }
    if (selectedEntityType) {
      newFilters.entityType = selectedEntityType;
    }
    if (selectedAction) {
      newFilters.action = selectedAction;
    }
    if (dateRange.startDate) {
      newFilters.startDate = dateRange.startDate;
    }
    if (dateRange.endDate) {
      newFilters.endDate = dateRange.endDate;
    }

    setFilters(newFilters);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedEntityType('');
    setSelectedAction('');
    setDateRange({ startDate: '', endDate: '' });
    setFilters({ page: 1, limit: 50 });
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (searchTerm && !log.action.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !log.user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !log.user.email.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [auditLogs, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track and monitor all system activities and user actions.
        </p>
      </div>

      {/* Summary Statistics */}
      {summary && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Activity Summary</h2>
              <select
                value={summaryDays}
                onChange={(e) => setSummaryDays(Number(e.target.value))}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-900">{summary.totalCount}</div>
                <div className="text-sm text-blue-600">Total Activities</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-900">
                  {summary.actionCounts.find(a => a.action.includes('created'))?.count || 0}
                </div>
                <div className="text-sm text-green-600">Created Items</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-900">
                  {summary.actionCounts.find(a => a.action.includes('login'))?.count || 0}
                </div>
                <div className="text-sm text-yellow-600">User Logins</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-900">{summary.mostActiveUsers.length}</div>
                <div className="text-sm text-purple-600">Active Users</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Actions */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Top Actions</h3>
                <div className="space-y-2">
                  {summary.actionCounts.slice(0, 5).map(({ action, count }) => (
                    <div key={action} className="flex justify-between text-sm">
                      <span className="text-gray-600">{auditLogHelpers.formatAction(action)}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Active Users */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Most Active Users</h3>
                <div className="space-y-2">
                  {summary.mostActiveUsers.slice(0, 5).map(({ user, count }, index) => (
                    <div key={user?.id || index} className="flex justify-between text-sm">
                      <span className="text-gray-600">{user?.name || 'Unknown'}</span>
                      <span className="font-medium">{count} actions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Search actions, users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity Type
              </label>
              <select
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value)}
                className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Types</option>
                {ENTITY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Actions</option>
                {ACTION_TYPES.map(action => (
                  <option key={action} value={action}>
                    {auditLogHelpers.formatAction(action)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="flex-1 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="flex-1 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={applyFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Activity Log</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          No audit logs found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col">
                              <span>{auditLogHelpers.getRelativeTime(log.createdAt)}</span>
                              <span className="text-xs text-gray-500">
                                {auditLogHelpers.formatDate(log.createdAt)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col">
                              <span className="font-medium">{log.user.name}</span>
                              <span className="text-gray-500">{log.user.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${auditLogHelpers.getActionColor(log.action)}`}>
                              {auditLogHelpers.formatAction(log.action)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <span className="mr-2">{auditLogHelpers.getEntityIcon(log.entityType)}</span>
                              <span>{log.entityType}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="max-w-xs truncate" title={auditLogHelpers.formatMetadata(log.metadata)}>
                              {auditLogHelpers.formatMetadata(log.metadata) || 'No details'}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-700">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                    {pagination.totalCount} results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm bg-blue-50 border border-blue-200 rounded-md">
                      {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
