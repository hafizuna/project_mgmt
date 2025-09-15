import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';
import { organizationApi, type Organization, type OrganizationUsage } from '../../lib/api/organization';

const organizationUpdateSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  settings: z.object({
    allowProjectCreation: z.boolean(),
    defaultTaskPriority: z.enum(['Low', 'Medium', 'High']),
    requireTaskDescription: z.boolean(),
    maxProjectMembers: z.number().min(1).max(100),
  }).optional(),
});

type OrganizationUpdateForm = z.infer<typeof organizationUpdateSchema>;

export default function OrganizationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [usage, setUsage] = useState<OrganizationUsage | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OrganizationUpdateForm>({
    resolver: zodResolver(organizationUpdateSchema),
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orgData, usageData] = await Promise.all([
        organizationApi.getOrganization(),
        organizationApi.getUsage(),
      ]);
      
      setOrganization(orgData);
      setUsage(usageData);
      
      // Reset form with current data
      reset({
        name: orgData.name,
        settings: {
          allowProjectCreation: orgData.settings?.allowProjectCreation ?? true,
          defaultTaskPriority: orgData.settings?.defaultTaskPriority ?? 'Medium',
          requireTaskDescription: orgData.settings?.requireTaskDescription ?? false,
          maxProjectMembers: orgData.settings?.maxProjectMembers ?? 10,
        },
      });
    } catch (error) {
      console.error('Failed to load organization data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organization settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: OrganizationUpdateForm) => {
    setSaving(true);
    try {
      const updatedOrg = await organizationApi.updateOrganization(data);
      setOrganization(updatedOrg);
      toast({
        title: 'Success',
        description: 'Organization settings updated successfully',
      });
    } catch (error) {
      console.error('Failed to update organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to update organization settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your organization's configuration and view usage statistics.
        </p>
      </div>

      {/* Organization Details */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Organization Details</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Organization Name
              </label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Slug
              </label>
              <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md">
                <code className="text-sm text-gray-600">{organization?.slug}</code>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                The organization slug cannot be changed.
              </p>
            </div>

            {/* Project Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Project Settings</h3>
              
              <div className="flex items-center">
                <input
                  id="allowProjectCreation"
                  type="checkbox"
                  {...register('settings.allowProjectCreation')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowProjectCreation" className="ml-2 block text-sm text-gray-900">
                  Allow non-admin users to create projects
                </label>
              </div>

              <div>
                <label htmlFor="maxProjectMembers" className="block text-sm font-medium text-gray-700">
                  Maximum Project Members
                </label>
                <input
                  type="number"
                  id="maxProjectMembers"
                  min="1"
                  max="100"
                  {...register('settings.maxProjectMembers', { valueAsNumber: true })}
                  className="mt-1 block w-20 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.settings?.maxProjectMembers && (
                  <p className="mt-1 text-sm text-red-600">{errors.settings.maxProjectMembers.message}</p>
                )}
              </div>
            </div>

            {/* Task Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Task Settings</h3>
              
              <div>
                <label htmlFor="defaultTaskPriority" className="block text-sm font-medium text-gray-700">
                  Default Task Priority
                </label>
                <select
                  id="defaultTaskPriority"
                  {...register('settings.defaultTaskPriority')}
                  className="mt-1 block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  id="requireTaskDescription"
                  type="checkbox"
                  {...register('settings.requireTaskDescription')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="requireTaskDescription" className="ml-2 block text-sm text-gray-900">
                  Require task description
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Usage Statistics */}
      {usage && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">Total Users</p>
                    <p className="text-2xl font-semibold text-blue-900">{usage.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">Active Projects</p>
                    <p className="text-2xl font-semibold text-green-900">{usage.activeProjects}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m2 0h2a2 2 0 002-2V7a2 2 0 00-2-2h-2m0 0V3a2 2 0 012-2h2a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800">Open Tasks</p>
                    <p className="text-2xl font-semibold text-yellow-900">{usage.openTasks}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Organization Created</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(organization!.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Last Updated</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(organization!.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Total Projects</dt>
                  <dd className="font-medium text-gray-900">{usage.totalProjects}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Total Tasks</dt>
                  <dd className="font-medium text-gray-900">{usage.totalTasks}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
