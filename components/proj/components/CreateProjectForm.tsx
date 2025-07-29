


import { Project } from "../data";

const commonFormFields = (project?: Project) => `
    <div class="row g-3">
        <div class="col-md-6">
            <label for="name" class="form-label">Project Name</label>
            <input type="text" class="form-control" name="name" value="${project?.name || ''}" required>
        </div>
        <div class="col-md-6">
            <label for="client" class="form-label">Client Name</label>
            <input type="text" class="form-control" name="client" value="${project?.client || ''}" required>
        </div>
        <div class="col-md-6">
            <label for="orderNumber" class="form-label">Order Number</label>
            <input type="text" class="form-control" name="orderNumber" value="${project?.orderNumber || ''}" required>
        </div>
        <div class="col-md-6">
            <label for="status" class="form-label">Status</label>
            <select name="status" class="form-select">
            <option ${project?.status === 'Planned' ? 'selected' : ''}>Planned</option>
            <option ${project?.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option ${project?.status === 'Completed' ? 'selected' : ''}>Completed</option>
            </select>
        </div>
        <div class="col-12">
            <label for="projectType" class="form-label">Project Type</label>
            <select name="projectType" class="form-select">
                <option value="Financial" ${project?.projectType === 'Financial' ? 'selected' : ''}>Financial</option>
                <option value="Measurement" ${project?.projectType === 'Measurement' ? 'selected' : ''}>Measurement</option>
            </select>
        </div>

        <!-- Financial Fields -->
        <div id="financial-fields" class="row g-3 m-0">
            <div class="col-md-6">
                <label for="estimatedRevenue" class="form-label">Estimated Revenue</label>
                <input type="number" class="form-control" name="estimatedRevenue" value="${project?.estimatedRevenue || ''}">
            </div>
        </div>

        <!-- Measurement Fields -->
        <div id="measurement-fields" class="row g-3 m-0">
            <div class="col-md-6">
                <label for="measurementRate" class="form-label">Rate per SQM</label>
                <input type="number" step="any" class="form-control" name="measurementRate" value="${project?.measurementRate || ''}">
            </div>
        </div>
        
        <!-- Common Cost Field -->
        <div class="col-md-6">
            <label for="estimatedCost" class="form-label">Estimated Cost</label>
            <input type="number" class="form-control" name="estimatedCost" value="${project?.estimatedCost || ''}" required>
        </div>
    </div>
`;

export const renderCreateProjectForm = (): string => {
  return `
    <div class="modal fade" id="create-project-modal" tabindex="-1" aria-labelledby="createProjectModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <form data-action="create-project">
            <div class="modal-header">
              <h1 class="modal-title fs-5" id="createProjectModalLabel">Create New Project</h1>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${commonFormFields()}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Project</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
};

export const renderEditProjectForm = (project: Project): string => {
  return `
    <div class="modal fade" id="edit-project-modal" tabindex="-1" aria-labelledby="editProjectModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <form data-action="update-project" data-project-id="${project.id}">
            <div class="modal-header">
              <h1 class="modal-title fs-5" id="editProjectModalLabel">Edit Project: ${project.name}</h1>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${commonFormFields(project)}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
};

export const renderAddProductForm = (projectId: string): string => {
    return `
    <div class="modal fade" id="add-product-modal" tabindex="-1" aria-labelledby="addProductModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <form data-action="add-product" data-project-id="${projectId}">
            <div class="modal-header">
              <h1 class="modal-title fs-5" id="addProductModalLabel">Add New Product / Cost Category</h1>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <label for="name" class="form-label">Product / Category Name</label>
              <input type="text" class="form-control" name="name" required>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Add</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
};