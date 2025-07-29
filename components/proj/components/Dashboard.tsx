
import { Project } from "../data";
import { calculateProjectTotals, formatCurrency } from "../utils";
import { iconPlus } from './icons';

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'Planned': return 'badge-planned';
        case 'In Progress': return 'badge-in-progress';
        case 'Completed': return 'badge-completed';
        default: return 'text-bg-secondary';
    }
}

export const renderDashboard = (projects: Project[], filterText: string = ''): string => {
  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()) || p.client.toLowerCase().includes(filterText.toLowerCase()));
  
  const totalProfit = projects.reduce((sum, p) => sum + calculateProjectTotals(p).grossProfit, 0);
  const activeProjects = projects.filter(p => p.status === 'In Progress').length;

  return `
    <!-- Top Stats -->
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-subtitle text-muted">Total Projects</h6>
            <p class="card-title h4">${projects.length}</p>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-subtitle text-muted">Active Projects</h6>
            <p class="card-title h4">${activeProjects}</p>
          </div>
        </div>
      </div>
       <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-subtitle text-muted">Total Gross Profit</h6>
            <p class="card-title h4">${formatCurrency(totalProfit)}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Dashboard Header -->
    <div class="row align-items-center mb-4">
      <div class="col-md-6">
        <h2 class="mb-0">
          <i class="bi bi-speedometer2 me-2 text-primary"></i>
          Projects Dashboard
        </h2>
      </div>
      <div class="col-md-6">
        <div class="d-flex flex-column flex-md-row gap-2">
          <input type="search" id="project-search" class="form-control" placeholder="Search projects..." value="${filterText}" data-action="search-projects" aria-label="Search projects">
          <button class="btn btn-primary flex-shrink-0" data-action="show-create-project-modal">
            ${iconPlus} <span class="d-none d-sm-inline">Create Project</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Project Cards -->
    <div class="row">
      ${filteredProjects.length > 0 ? filteredProjects.map(p => {
        const { grossProfit } = calculateProjectTotals(p);
        const profitClass = grossProfit >= 0 ? 'text-success' : 'text-danger';
        const statusBadge = getStatusBadgeClass(p.status);

        return `
          <div class="col-xl-4 col-md-6 mb-4">
            <div class="card project-card h-100 shadow-sm border-0">
              <div class="card-body">
                <h5 class="card-title fw-bold">${p.name}</h5>
                <p class="card-subtitle mb-2 text-muted">${p.client}</p>
                <p class="card-text small">Order #: ${p.orderNumber}</p>
              </div>
              <div class="card-footer border-top-0 pt-0">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="status-badge ${statusBadge}">${p.status}</span>
                    <span class="fw-bold ${profitClass}">${formatCurrency(grossProfit)}</span>
                  </div>
              </div>
              <a href="#/project/${p.id}" class="stretched-link" data-action="navigate" aria-label="View project ${p.name}"></a>
            </div>
          </div>
          `;
      }).join('') : '<div class="col"><p class="text-center p-5 bg-light rounded">No projects match your search.</p></div>'}
    </div>
  `;
};