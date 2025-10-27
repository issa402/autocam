/**
 * Dashboard Page
 * 
 * This is the main dashboard where users see their projects.
 * 
 * Features:
 * - List all projects
 * - Create new project
 * - View project stats (photo count, selected count)
 * - Navigate to project details
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken, user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  /**
   * Fetch projects using React Query
   * 
   * React Query automatically:
   * - Caches the data
   * - Refetches on window focus
   * - Handles loading and error states
   */
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      return data.data as Project[];
    },
    enabled: isAuthenticated, // Only run if authenticated
  });

  /**
   * Create project mutation
   * 
   * Mutations are for creating/updating/deleting data
   */
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { name: string; description?: string }) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Close modal
      setShowCreateModal(false);
      // Reset form
      setNewProjectName('');
      setNewProjectDescription('');
    },
  });

  /**
   * Delete project mutation
   */
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Close confirmation
      setDeleteConfirmId(null);
    },
  });

  /**
   * Handle create project
   */
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProjectName.trim()) {
      return;
    }

    createProjectMutation.mutate({
      name: newProjectName,
      description: newProjectDescription || undefined,
    });
  };

  /**
   * Handle delete project
   */
  const handleDeleteProject = (projectId: string) => {
    deleteProjectMutation.mutate(projectId);
  };

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              📸 AutoCam
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back, {user?.name || user?.email}!
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            + New Project
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="spinner w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading projects...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
            Failed to load projects. Please try again.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && projects?.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No projects yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first project to start managing photos
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Create Project
            </button>
          </div>
        )}

        {/* Projects grid */}
        {!isLoading && !error && projects && projects.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div
                  onClick={() => router.push(`/project/${project.id}`)}
                  className="cursor-pointer mb-4"
                >
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {project.name}
                  </h3>

                  {project.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {project.description}
                    </p>
                  )}

                  <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div>
                      <span className="font-semibold">{project.photoCount || 0}</span> photos
                    </div>
                    <div>
                      <span className="font-semibold">{project.selectedCount || 0}</span> selected
                    </div>
                  </div>

                  <div className="text-xs text-gray-400">
                    Created {formatRelativeTime(new Date(project.createdAt))}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(project.id);
                  }}
                  className="w-full mt-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm font-medium"
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Create New Project
            </h2>
            
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="Basketball Game 2024"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="Championship game photos"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {createProjectMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Delete Project?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete this project and all associated photos. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleteProjectMutation.isPending}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirmId)}
                disabled={deleteProjectMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

