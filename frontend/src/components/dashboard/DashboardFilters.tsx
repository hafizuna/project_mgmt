import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter, RefreshCw, X } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api/projects';

export interface DashboardFiltersState {
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
  refreshInterval?: number;
}

interface DashboardFiltersProps {
  filters: DashboardFiltersState;
  onFiltersChange: (filters: DashboardFiltersState) => void;
  showProjectFilter?: boolean;
  showDateRange?: boolean;
  showRefreshControls?: boolean;
}

export function DashboardFilters({
  filters,
  onFiltersChange,
  showProjectFilter = true,
  showDateRange = true,
  showRefreshControls = true
}: DashboardFiltersProps) {
  const [localFilters, setLocalFilters] = useState<DashboardFiltersState>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch projects for project filter
  const { data: projectsResponse } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getProjects(),
    enabled: showProjectFilter,
  });
  
  const projects = projectsResponse?.projects || [];

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleResetFilters = () => {
    const resetFilters = {};
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const hasActiveFilters = Object.keys(filters).some(key => 
    filters[key as keyof DashboardFiltersState] !== undefined && 
    filters[key as keyof DashboardFiltersState] !== ''
  );

  // Quick date range presets
  const quickDateRanges = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
  ];

  const setQuickDateRange = (days: number) => {
    const dateTo = new Date().toISOString().split('T')[0];
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const newFilters = { ...localFilters, dateFrom, dateTo };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Dashboard Filters
            {hasActiveFilters && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                Active
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {showRefreshControls && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFiltersChange(filters)}
                className="h-8"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {(isExpanded || hasActiveFilters) && (
        <CardContent className="space-y-4">
          {/* Quick Date Range Buttons */}
          {showDateRange && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Quick Date Ranges</Label>
              <div className="flex gap-2 flex-wrap">
                {quickDateRanges.map((range) => (
                  <Button
                    key={range.days}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateRange(range.days)}
                    className="h-7 text-xs"
                  >
                    {range.label}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newFilters = { ...localFilters };
                    delete newFilters.dateFrom;
                    delete newFilters.dateTo;
                    setLocalFilters(newFilters);
                    onFiltersChange(newFilters);
                  }}
                  className="h-7 text-xs"
                >
                  All Time
                </Button>
              </div>
            </div>
          )}

          {/* Custom Date Range */}
          {showDateRange && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-sm">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={localFilters.dateFrom || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, dateFrom: e.target.value })}
                  className="h-8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-sm">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={localFilters.dateTo || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, dateTo: e.target.value })}
                  className="h-8"
                />
              </div>
            </div>
          )}

          {/* Project Filter */}
          {showProjectFilter && (
            <div className="space-y-2">
              <Label className="text-sm">Filter by Project</Label>
              <Select 
                value={localFilters.projectId || ''} 
                onValueChange={(value) => 
                  setLocalFilters({ ...localFilters, projectId: value || undefined })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Projects</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Auto-refresh Controls */}
          {showRefreshControls && (
            <div className="space-y-2">
              <Label className="text-sm">Auto Refresh</Label>
              <Select
                value={localFilters.refreshInterval?.toString() || ''}
                onValueChange={(value) =>
                  setLocalFilters({
                    ...localFilters,
                    refreshInterval: value ? parseInt(value) : undefined
                  })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Manual refresh" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Manual refresh</SelectItem>
                  <SelectItem value="30000">Every 30 seconds</SelectItem>
                  <SelectItem value="60000">Every minute</SelectItem>
                  <SelectItem value="300000">Every 5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              onClick={handleApplyFilters}
              size="sm"
              className="h-8"
            >
              Apply Filters
            </Button>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleResetFilters}
                size="sm"
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="font-medium">Active Filters:</div>
                {filters.dateFrom && filters.dateTo && (
                  <div>• Date Range: {filters.dateFrom} to {filters.dateTo}</div>
                )}
                {filters.projectId && projects && (
                  <div>
                    • Project: {projects.find(p => p.id === filters.projectId)?.name || 'Unknown'}
                  </div>
                )}
                {filters.refreshInterval && (
                  <div>• Auto-refresh: Every {filters.refreshInterval / 1000}s</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}