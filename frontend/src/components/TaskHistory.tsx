import React, { useState, useEffect } from 'react';
import { Activity, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { toast } from 'sonner';
import { taskCommentsApi, TaskHistoryEntry } from '../lib/api/taskComments';

interface TaskHistoryProps {
  taskId: string;
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case 'CREATED':
      return '🎯';
    case 'STATUS_CHANGED':
      return '🔄';
    case 'ASSIGNED':
      return '👤';
    case 'UNASSIGNED':
      return '👤';
    case 'COMMENT_ADDED':
      return '💬';
    case 'DUE_DATE_CHANGED':
      return '📅';
    case 'PRIORITY_CHANGED':
      return '⚡';
    case 'TITLE_CHANGED':
      return '✏️';
    case 'DESCRIPTION_CHANGED':
      return '📝';
    default:
      return '📋';
  }
};

const getActivityColor = (action: string) => {
  switch (action) {
    case 'CREATED':
      return 'text-green-600 bg-green-50';
    case 'STATUS_CHANGED':
      return 'text-blue-600 bg-blue-50';
    case 'ASSIGNED':
    case 'UNASSIGNED':
      return 'text-purple-600 bg-purple-50';
    case 'COMMENT_ADDED':
      return 'text-gray-600 bg-gray-50';
    case 'DUE_DATE_CHANGED':
      return 'text-orange-600 bg-orange-50';
    case 'PRIORITY_CHANGED':
      return 'text-red-600 bg-red-50';
    case 'TITLE_CHANGED':
    case 'DESCRIPTION_CHANGED':
      return 'text-indigo-600 bg-indigo-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export const TaskHistory: React.FC<TaskHistoryProps> = ({ taskId }) => {
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const historyData = await taskCommentsApi.getTaskHistory(taskId);
      setHistory(historyData);
    } catch (error) {
      toast.error('Failed to load task history');
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [taskId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes <= 1 ? 'just now' : `${diffInMinutes} minutes ago`;
    }

    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    }

    if (diffInHours < 24 * 7) {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const groupHistoryByDate = (history: TaskHistoryEntry[]) => {
    const groups: { [key: string]: TaskHistoryEntry[] } = {};
    
    history.forEach(entry => {
      const date = new Date(entry.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    return Object.entries(groups).map(([date, entries]) => ({
      date,
      entries: entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No activity yet</p>
        <p className="text-sm text-gray-400">Task changes will appear here</p>
      </div>
    );
  }

  const groupedHistory = groupHistoryByDate(history);

  return (
    <div className="space-y-6">
      {groupedHistory.map(({ date, entries }) => (
        <div key={date} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <Clock className="w-4 h-4" />
            {new Date(date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>

          <div className="space-y-3 ml-6">
            {entries.map(entry => (
              <div key={entry.id} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${getActivityColor(entry.action)}`}>
                  <span className="text-sm">{getActivityIcon(entry.action)}</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={`https://avatar.vercel.sh/${entry.user.email}`} />
                      <AvatarFallback className="text-xs">
                        {getInitials(entry.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{entry.user.name}</span>
                    <span className="text-sm text-gray-600">{entry.description}</span>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {formatDate(entry.createdAt)}
                  </div>

                  {/* Show additional details for certain actions */}
                  {(entry.oldValue || entry.newValue) && (
                    <div className="mt-2 text-xs bg-gray-50 rounded p-2">
                      {entry.oldValue && entry.newValue && (
                        <>
                          <span className="text-red-600 line-through">
                            {JSON.parse(entry.oldValue)}
                          </span>
                          {' → '}
                          <span className="text-green-600 font-medium">
                            {JSON.parse(entry.newValue)}
                          </span>
                        </>
                      )}
                      {entry.newValue && !entry.oldValue && (
                        <span className="text-green-600 font-medium">
                          {JSON.parse(entry.newValue)}
                        </span>
                      )}
                      {entry.oldValue && !entry.newValue && (
                        <span className="text-red-600 line-through">
                          {JSON.parse(entry.oldValue)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};