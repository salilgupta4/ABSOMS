import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { FolderOpen, Plus, Search, X } from 'lucide-react';
import { projectsService, Project, ProjectStatus, ProjectType } from '@/services/projectsService';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

// Stats Card Component matching OMS style
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md flex items-center h-full">
    <div className={`p-4 rounded-full ${color}`}>
      {icon}
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  </div>
);

// Create Project Modal Component
const CreateProjectModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (project: Omit<Project, 'id' | 'products' | 'measurements' | 'createdAt' | 'updatedAt'>) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  console.log('CreateProjectModal rendered, isOpen:', isOpen);
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    orderNumber: '',
    status: 'Planned' as ProjectStatus,
    projectType: 'Financial' as ProjectType,
    estimatedRevenue: '',
    estimatedCost: '',
    measurementRate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    
    // Validate required fields
    if (!formData.name.trim() || !formData.client.trim() || !formData.orderNumber.trim()) {
      alert('Please fill in all required fields (Name, Client, Order Number)');
      return;
    }
    
    const projectData: any = {
      name: formData.name.trim(),
      client: formData.client.trim(),
      orderNumber: formData.orderNumber.trim(),
      status: formData.status,
      projectType: formData.projectType,
      estimatedCost: Number(formData.estimatedCost) || 0,
    };

    if (formData.projectType === 'Financial') {
      projectData.estimatedRevenue = Number(formData.estimatedRevenue) || 0;
    } else {
      projectData.measurementRate = Number(formData.measurementRate) || 0;
    }

    console.log('Processed project data:', projectData);
    onSubmit(projectData);
    
    // Reset form
    setFormData({
      name: '',
      client: '',
      orderNumber: '',
      status: 'Planned',
      projectType: 'Financial',
      estimatedRevenue: '',
      estimatedCost: '',
      measurementRate: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Create New Project</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Client *
            </label>
            <input
              type="text"
              required
              value={formData.client}
              onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Order Number *
            </label>
            <input
              type="text"
              required
              value={formData.orderNumber}
              onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={formData.projectType}
                onChange={(e) => setFormData({ ...formData, projectType: e.target.value as ProjectType })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="Financial">Financial</option>
                <option value="Measurement">Measurement</option>
              </select>
            </div>
          </div>

          {formData.projectType === 'Financial' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Estimated Revenue
              </label>
              <input
                type="number"
                value={formData.estimatedRevenue}
                onChange={(e) => setFormData({ ...formData, estimatedRevenue: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Measurement Rate (per SQM)
              </label>
              <input
                type="number"
                value={formData.measurementRate}
                onChange={(e) => setFormData({ ...formData, measurementRate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Estimated Cost
            </label>
            <input
              type="number"
              value={formData.estimatedCost}
              onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} className="flex-1 bg-slate-500 hover:bg-slate-600">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Dashboard Component
const ProjectsDashboard: React.FC<{ projects: Project[]; onRefresh: () => void }> = ({ projects, onRefresh }) => {
  const [currentSearch, setCurrentSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreateProject = async (projectData: Omit<Project, 'id' | 'products' | 'measurements' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('handleCreateProject called with:', projectData);
      
      const fullProjectData = {
        ...projectData,
        products: [],
        measurements: projectData.projectType === 'Measurement' ? [] : undefined
      };
      
      console.log('Full project data:', fullProjectData);
      
      const newProject = await projectsService.createProject(fullProjectData);
      console.log('Created new project successfully:', newProject);
      
      await onRefresh(); // Refresh the projects list
      setIsCreateModalOpen(false);
      alert('Project created successfully!');
    } catch (error) {
      console.error('Error creating project:', error);
      alert(`Error creating project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Test function to create a simple project
  const testCreateProject = async () => {
    try {
      console.log('=== TEST CREATE PROJECT START ===');
      console.log('projectsService object:', projectsService);
      
      const testProject = {
        name: 'Test Project',
        client: 'Test Client',
        orderNumber: 'TEST-001',
        status: 'Planned' as ProjectStatus,
        projectType: 'Financial' as ProjectType,
        estimatedRevenue: 100000,
        estimatedCost: 50000,
        products: [],
      };
      
      console.log('Test project data:', testProject);
      console.log('Calling projectsService.createProject...');
      
      const result = await projectsService.createProject(testProject);
      console.log('Test project created successfully:', result);
      
      console.log('Calling onRefresh...');
      await onRefresh();
      
      alert('Test project created successfully!');
      console.log('=== TEST CREATE PROJECT END ===');
    } catch (error) {
      console.error('=== TEST CREATE PROJECT ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      alert(`Test project creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(currentSearch.toLowerCase()) || 
    p.client.toLowerCase().includes(currentSearch.toLowerCase())
  );

  const totalProfit = projects.reduce((sum, p) => sum + projectsService.calculateProjectTotals(p).grossProfit, 0);
  const activeProjects = projects.filter(p => p.status === 'In Progress').length;

  return (
    <div className="p-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Projects"
          value={projects.length}
          icon={<FolderOpen size={24} />}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
        />
        <StatCard
          title="Active Projects"
          value={activeProjects}
          icon={<FolderOpen size={24} />}
          color="bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
        />
        <StatCard
          title="Total Gross Profit"
          value={projectsService.formatCurrency(totalProfit)}
          icon={<FolderOpen size={24} />}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300"
        />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          <FolderOpen className="inline mr-3" size={32} />
          Projects Management
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="search"
              placeholder="Search projects..."
              value={currentSearch}
              onChange={(e) => setCurrentSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100 w-full sm:w-64"
            />
          </div>
          <Button onClick={() => {
            console.log('Create Project button clicked');
            setIsCreateModalOpen(true);
          }} className="whitespace-nowrap">
            <Plus size={18} className="mr-2" />
            Create Project
          </Button>
          <Button onClick={testCreateProject} className="whitespace-nowrap bg-red-500 hover:bg-red-600">
            Test Create
          </Button>
          <Button onClick={() => {
            console.log('Direct LocalStorage Test');
            try {
              const testProject = {
                id: `proj-${Date.now()}`,
                name: 'Direct Test Project',
                client: 'Direct Test Client',
                orderNumber: 'DIRECT-001',
                status: 'Planned' as ProjectStatus,
                projectType: 'Financial' as ProjectType,
                estimatedRevenue: 100000,
                estimatedCost: 50000,
                products: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              
              const existingProjects = localStorage.getItem('abs_projects_module');
              const projects = existingProjects ? JSON.parse(existingProjects) : [];
              projects.unshift(testProject);
              localStorage.setItem('abs_projects_module', JSON.stringify(projects));
              
              console.log('Direct localStorage test successful');
              onRefresh();
              alert('Direct localStorage test successful!');
            } catch (error) {
              console.error('Direct localStorage test failed:', error);
              alert('Direct localStorage test failed!');
            }
          }} className="whitespace-nowrap bg-green-500 hover:bg-green-600">
            Direct Test
          </Button>
          <Button onClick={() => {
            console.log('=== CHECKING LOCALSTORAGE ===');
            const stored = localStorage.getItem('abs_projects_module');
            console.log('Raw localStorage data:', stored);
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                console.log('Parsed projects:', parsed.length, 'projects');
                console.log('Projects:', parsed);
                alert(`Found ${parsed.length} projects in localStorage`);
              } catch (error) {
                console.error('Error parsing localStorage:', error);
                alert('Error parsing localStorage data');
              }
            } else {
              console.log('No data in localStorage');
              alert('No data found in localStorage');
            }
          }} className="whitespace-nowrap bg-purple-500 hover:bg-purple-600">
            Check Storage
          </Button>
          <Button onClick={async () => {
            console.log('=== INITIALIZING SAMPLE DATA ===');
            try {
              // Clear existing data
              localStorage.removeItem('abs_projects_module');
              console.log('Cleared localStorage');
              
              // Trigger fresh load which should initialize sample data
              await loadProjects();
              console.log('Sample data initialization complete');
              alert('Sample data initialized! Check the page now.');
            } catch (error) {
              console.error('Error initializing sample data:', error);
              alert('Error initializing sample data');
            }
          }} className="whitespace-nowrap bg-yellow-500 hover:bg-yellow-600">
            Init Sample Data
          </Button>
        </div>
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.length > 0 ? filteredProjects.map(p => {
          const { grossProfit } = projectsService.calculateProjectTotals(p);
          const profitClass = grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
          
          let statusClass = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
          if (p.status === 'Completed') {
            statusClass = 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
          } else if (p.status === 'In Progress') {
            statusClass = 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
          }

          return (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{p.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-2">{p.client}</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">Order #: {p.orderNumber}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 dark:text-slate-400">Gross Profit</span>
                <span className={`font-bold ${profitClass}`}>
                  {projectsService.formatCurrency(grossProfit)}
                </span>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full">
            <div className="text-center py-12">
              <FolderOpen size={64} className="mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">No projects found matching your search.</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};

// Project Detail Component
const ProjectDetail: React.FC<{ projects: Project[]; onRefresh: () => void }> = ({ projects, onRefresh }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const project = projects.find(p => p.id === id);

  if (!project) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Project Not Found</h4>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">The requested project could not be found.</p>
          <Button onClick={() => navigate('/projects')}>
            ← Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const totals = projectsService.calculateProjectTotals(project);

  let statusClass = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  if (project.status === 'Completed') {
    statusClass = 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  } else if (project.status === 'In Progress') {
    statusClass = 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
  }

  const DetailCard: React.FC<{ title: string; value: string; color?: string }> = ({ title, value, color = '' }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md text-center">
      <h6 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{title}</h6>
      <p className={`text-2xl font-bold ${color || 'text-slate-800 dark:text-slate-100'}`}>{value}</p>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button onClick={() => navigate('/projects')} className="mb-4">
          ← Back to Projects
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{project.name}</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Client: {project.client} | Order: {project.orderNumber}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusClass} self-start`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Project Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <DetailCard 
          title="Status" 
          value={project.status} 
        />
        <DetailCard 
          title="Total Revenue" 
          value={projectsService.formatCurrency(totals.totalRevenue)}
          color="text-green-600 dark:text-green-400"
        />
        <DetailCard 
          title="Total Cost" 
          value={projectsService.formatCurrency(totals.totalCost)}
          color="text-red-600 dark:text-red-400"
        />
        <DetailCard 
          title="Gross Profit" 
          value={projectsService.formatCurrency(totals.grossProfit)}
          color={totals.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
        />
      </div>

      {/* Project Details */}
      <Card title="Project Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Type: </span>
              <span className="text-slate-600 dark:text-slate-400">{project.projectType}</span>
            </div>
            {project.estimatedRevenue && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Estimated Revenue: </span>
                <span className="text-slate-600 dark:text-slate-400">{projectsService.formatCurrency(project.estimatedRevenue)}</span>
              </div>
            )}
            {project.measurementRate && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Measurement Rate: </span>
                <span className="text-slate-600 dark:text-slate-400">{projectsService.formatCurrency(project.measurementRate)}/SQM</span>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Estimated Cost: </span>
              <span className="text-slate-600 dark:text-slate-400">{projectsService.formatCurrency(project.estimatedCost || 0)}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Products/Categories: </span>
              <span className="text-slate-600 dark:text-slate-400">{project.products.length}</span>
            </div>
            {project.measurements && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Measurements: </span>
                <span className="text-slate-600 dark:text-slate-400">{project.measurements.length} entries</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Financial Line Items Section */}
      {project.projectType === 'Financial' && (
        <Card title="Financial Line Items">
          <div className="space-y-4">
            {project.products.map(product => (
              <div key={product.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{product.name}</h4>
                  <Button 
                    onClick={async () => {
                      const newItem = {
                        id: `item-${Date.now()}`,
                        date: new Date().toISOString().split('T')[0],
                        description: 'New line item',
                        amount: 0,
                        type: 'revenue' as 'revenue' | 'cost'
                      };
                      // Add to product items and update project
                      const updatedProject = {
                        ...project,
                        products: project.products.map(p => 
                          p.id === product.id 
                            ? { ...p, items: [...p.items, newItem] }
                            : p
                        )
                      };
                      await projectsService.updateProject(project.id, updatedProject);
                      await onRefresh();
                      alert('Line item added successfully!');
                    }}
                    className="text-sm"
                  >
                    Add Line Item
                  </Button>
                </div>
                
                {product.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Description</th>
                          <th className="text-left py-2">Type</th>
                          <th className="text-right py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.items.map(item => (
                          <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="py-2">{new Date(item.date).toLocaleDateString()}</td>
                            <td className="py-2">{item.description}</td>
                            <td className="py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                item.type === 'revenue' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="py-2 text-right font-medium">
                              {projectsService.formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No line items yet. Click "Add Line Item" to get started.</p>
                )}
              </div>
            ))}
            
            {project.products.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400 mb-4">No product categories yet.</p>
                <Button onClick={async () => {
                  const newProduct = {
                    id: `prod-${Date.now()}`,
                    name: 'New Product Category',
                    items: []
                  };
                  const updatedProject = {
                    ...project,
                    products: [...project.products, newProduct]
                  };
                  await projectsService.updateProject(project.id, updatedProject);
                  await onRefresh();
                  alert('Product category added successfully!');
                }}>
                  Add Product Category
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Measurement Items Section */}
      {project.projectType === 'Measurement' && (
        <Card title="Measurement Entries">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-slate-600 dark:text-slate-400">Track measurement data for this project</p>
              <Button onClick={async () => {
                const newMeasurement = {
                  id: `meas-${Date.now()}`,
                  date: new Date().toISOString().split('T')[0],
                  oldWidth: 0,
                  oldHeight: 0,
                  oldDis: '',
                  oldQty: 0,
                  newWidth: 0,
                  newHeight: 0,
                  newDis: '',
                  newQty: 0
                };
                const updatedProject = {
                  ...project,
                  measurements: [...(project.measurements || []), newMeasurement]
                };
                await projectsService.updateProject(project.id, updatedProject);
                await onRefresh();
                alert('Measurement entry added successfully!');
              }}>
                Add Measurement Entry
              </Button>
            </div>

            {project.measurements && project.measurements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Old Width</th>
                      <th className="text-right py-2">Old Height</th>
                      <th className="text-right py-2">Old Qty</th>
                      <th className="text-right py-2">Old SQM</th>
                      <th className="text-right py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.measurements.map(measurement => {
                      const oldSqm = (measurement.oldWidth / 1000) * (measurement.oldHeight / 1000) * measurement.oldQty;
                      const revenue = oldSqm * (project.measurementRate || 0);
                      return (
                        <tr key={measurement.id} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-2">{new Date(measurement.date).toLocaleDateString()}</td>
                          <td className="py-2">{measurement.oldDis}</td>
                          <td className="py-2 text-right">{measurement.oldWidth}mm</td>
                          <td className="py-2 text-right">{measurement.oldHeight}mm</td>
                          <td className="py-2 text-right">{measurement.oldQty}</td>
                          <td className="py-2 text-right">{oldSqm.toFixed(3)}</td>
                          <td className="py-2 text-right font-medium">{projectsService.formatCurrency(revenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">No measurement entries yet. Click "Add Measurement Entry" to get started.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

// Main Module Component
const ProjectsModule: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    try {
      console.log('=== LOADING PROJECTS START ===');
      setLoading(true);
      const projectsData = await projectsService.getAllProjects();
      console.log('Projects loaded from service:', projectsData.length, 'projects');
      console.log('First project:', projectsData[0]);
      setProjects(projectsData);
      console.log('Projects state updated');
      console.log('=== LOADING PROJECTS END ===');
    } catch (error) {
      console.error('=== LOADING PROJECTS ERROR ===');
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('ProjectsModule mounted, loading projects...');
    loadProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="projects-module-container">
      <Routes>
        <Route 
          path="/" 
          element={<ProjectsDashboard projects={projects} onRefresh={loadProjects} />} 
        />
        <Route 
          path="/:id" 
          element={<ProjectDetail projects={projects} onRefresh={loadProjects} />} 
        />
      </Routes>
    </div>
  );
};

export default ProjectsModule;