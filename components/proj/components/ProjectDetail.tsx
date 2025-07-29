
import { Project, Product, LineItem, MeasurementItem } from '../data';
import { calculateProjectTotals, calculateProductTotals, formatCurrency, formatDateForDisplay } from '../utils';
import { iconDelete, iconSparkles, iconBackArrow, iconPlus } from './icons';

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'Planned': return 'badge-planned';
        case 'In Progress': return 'badge-in-progress';
        case 'Completed': return 'badge-completed';
        default: return 'text-bg-secondary';
    }
};

const renderCsvControls = (projectId: string, type: 'financials' | 'measurements'): string => {
    const id = `import-${type}-${projectId}`;
    return `
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-outline-secondary btn-sm" data-action="export-${type}-csv" data-project-id="${projectId}">
            <i class="bi bi-box-arrow-down"></i> Export CSV
        </button>
        <label for="${id}" class="btn btn-outline-secondary btn-sm mb-0">
            <i class="bi bi-box-arrow-up"></i> Import CSV
        </label>
        <input type="file" id="${id}" accept=".csv" class="d-none" data-import-action="import-${type}-csv" data-project-id="${projectId}">
      </div>
    `;
};

export const renderProjectDetail = (project: Project, itemTemplates: Set<string>): string => {
  const statusBadge = getStatusBadgeClass(project.status);

  return `
  <div>
    <!-- Navigation Breadcrumb -->
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <a href="#/" data-action="navigate">
            <i class="bi bi-speedometer2 me-1"></i>Dashboard
          </a>
        </li>
        <li class="breadcrumb-item active" aria-current="page">${project.name}</li>
      </ol>
    </nav>

    <!-- Project Header -->
    <div class="card shadow-sm mb-4">
      <div class="card-header p-3">
        <div class="d-flex flex-wrap justify-content-between align-items-center">
          <div>
            <h2 class="h4 mb-0 editable" data-action="make-editable" data-field="name" data-project-id="${project.id}">${project.name}</h2>
            <p class="text-muted small mb-0">
              Client: <span class="editable" data-action="make-editable" data-field="client" data-project-id="${project.id}">${project.client}</span> |
              Order #: <span class="editable" data-action="make-editable" data-field="orderNumber" data-project-id="${project.id}">${project.orderNumber}</span>
            </p>
          </div>
          <div class="d-flex align-items-center gap-2 mt-2 mt-md-0">
            <span class="status-badge ${statusBadge}">${project.status}</span>
             <div class="dropdown">
              <button class="btn btn-sm btn-outline-secondary py-1 px-2" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="More project actions">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" href="#" data-action="show-edit-project-modal" data-project-id="${project.id}">Edit Project Details</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" data-action="delete-project" data-project-id="${project.id}">Delete Project</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Dynamic View Based on Project Type -->
    <div class="mb-4">
        ${renderOverview(project)}
    </div>
    <div>
        ${project.projectType === 'Measurement'
            ? renderMeasurementProjectDetailBody(project, itemTemplates)
            : renderFinancialProjectDetailBody(project, itemTemplates)
        }
    </div>
  </div>
  `;
};

const renderOverview = (project: Project): string => {
    const { totalRevenue, totalCost, grossProfit } = calculateProjectTotals(project);
    const profitClass = grossProfit >= 0 ? 'text-success' : 'text-danger';

    let revenueDetailHtml: string;
    if (project.projectType === 'Measurement') {
        const totalOldSqm = (project.measurements || []).reduce((sqmSum, m) => {
            const sqm = (m.oldWidth / 1000) * (m.oldHeight / 1000) * m.oldQty;
            return sqmSum + sqm;
        }, 0);
        revenueDetailHtml = `
            <div data-summary="revenue-detail" data-project-id="${project.id}">
                <p class="h4 mb-0" data-summary="total-revenue" data-project-id="${project.id}">${formatCurrency(totalRevenue)}</p>
                <span class="text-muted small d-block">(${totalOldSqm.toFixed(3)} SQM &times; ${formatCurrency(project.measurementRate || 0)}/SQM)</span>
            </div>
        `;
    } else {
        revenueDetailHtml = `<p class="h4" data-summary="total-revenue" data-project-id="${project.id}">${formatCurrency(totalRevenue)}</p>`;
    }


    return `
    <div class="row g-4">
      <!-- Left Column: Stats -->
      <div class="col-lg-8">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Financial Overview</h5>
             <div class="row text-center g-3">
                <div class="col-md-4 col-sm-12 border-end-md">
                    <h6 class="text-muted">Total Revenue</h6>
                    ${revenueDetailHtml}
                </div>
                <div class="col-md-4 col-sm-12 border-end-md">
                    <h6 class="text-muted">Total Costs</h6>
                    <p class="h4" data-summary="total-cost" data-project-id="${project.id}">${formatCurrency(totalCost)}</p>
                </div>
                <div class="col-md-4 col-sm-12">
                    <h6 class="text-muted">Gross Profit</h6>
                    <p class="h4 ${profitClass}" data-summary="gross-profit" data-project-id="${project.id}">${formatCurrency(grossProfit)}</p>
                </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: AI Insights -->
      <div class="col-lg-4">
        <div class="d-grid gap-2">
            <button class="btn btn-secondary btn-lg" data-action="get-insights" data-project-id="${project.id}" aria-label="Get AI-powered analysis for this project">
              ${iconSparkles}
              <span>Get AI Insights</span>
            </button>
        </div>
        <div id="insights-card-container" class="mt-3"></div>
      </div>
    </div>
    `;
};

const renderFinancialProjectDetailBody = (project: Project, itemTemplates: Set<string>): string => {
  return `
    <div class="card shadow-sm">
       <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <h5 class="mb-0">Financial Line Items</h5>
            <div class="d-flex align-items-center gap-2">
                ${renderCsvControls(project.id, 'financials')}
                <button class="btn btn-primary btn-sm" data-action="show-add-product-modal" data-project-id="${project.id}">
                    ${iconPlus} Add Product
                </button>
            </div>
       </div>
       <div class="table-responsive">
        ${generateFinancialsGrid(project, itemTemplates)}
       </div>
    </div>
  `;
};

const renderMeasurementProjectDetailBody = (project: Project, itemTemplates: Set<string>): string => {
    return `
        <div class="row g-4">
            <div class="col-12">
                <div class="card shadow-sm">
                    <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <h5 class="mb-0">Measurement Line Items</h5>
                        ${renderCsvControls(project.id, 'measurements')}
                    </div>
                    <div class="table-responsive">
                        ${generateMeasurementGrid(project)}
                    </div>
                </div>
            </div>
            <div class="col-12">
                 <div class="card shadow-sm">
                    <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <h5 class="mb-0">Financial Line Items</h5>
                        <div class="d-flex align-items-center gap-2">
                            ${renderCsvControls(project.id, 'financials')}
                            <button class="btn btn-primary btn-sm" data-action="show-add-product-modal" data-project-id="${project.id}">
                                ${iconPlus} Add Product
                            </button>
                        </div>
                    </div>
                    <div class="table-responsive">
                        ${generateFinancialsGrid(project, itemTemplates)}
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const generateFinancialItemHtml = (projectId: string, productId: string, item: LineItem): string => {
    return `
      <tr class="item-row" data-item-id="${item.id}">
          <td class="editable" data-action="make-editable" data-field="itemDate" data-project-id="${projectId}" data-product-id="${productId}" data-item-id="${item.id}">${formatDateForDisplay(item.date)}</td>
          <td class="editable" data-action="make-editable" data-field="itemDescription" data-project-id="${projectId}" data-product-id="${productId}" data-item-id="${item.id}">${item.description}</td>
          ${item.type === 'revenue'
            ? `<td class="text-end editable" data-action="make-editable" data-field="itemAmount" data-project-id="${projectId}" data-product-id="${productId}" data-item-id="${item.id}">${formatCurrency(item.amount)}</td><td class="text-end"></td>`
            : `<td class="text-end"></td><td class="text-end editable" data-action="make-editable" data-field="itemAmount" data-project-id="${projectId}" data-product-id="${productId}" data-item-id="${item.id}">${formatCurrency(item.amount)}</td>`
          }
          <td class="text-center">
            <button class="btn-icon" data-action="delete-item" data-project-id="${projectId}" data-product-id="${productId}" data-item-id="${item.id}" aria-label="Delete item">${iconDelete}</button>
          </td>
      </tr>
    `;
};

export const generateFinancialProductHtml = (project: Project, product: Product): string => {
    const { totalRevenue, totalCost } = calculateProductTotals(product);
    return `
        <tbody class="table-group-divider" data-product-id="${product.id}">
          <tr class="product-row">
              <td colspan="2" class="editable" data-action="make-editable" data-field="productName" data-project-id="${project.id}" data-product-id="${product.id}">${product.name}</td>
              <td class="text-end" data-summary="product-revenue" data-product-id="${product.id}">${formatCurrency(totalRevenue)}</td>
              <td class="text-end" data-summary="product-cost" data-product-id="${product.id}">${formatCurrency(totalCost)}</td>
              <td class="text-center">
                  <button class="btn-icon" data-action="delete-product" data-project-id="${project.id}" data-product-id="${product.id}" aria-label="Delete product">${iconDelete}</button>
              </td>
          </tr>
          ${product.items.map(item => generateFinancialItemHtml(project.id, product.id, item)).join('')}
          <tr class="item-row add-item-row">
            <td colspan="5">
              <form class="d-flex gap-2 align-items-center" data-action="add-item" data-project-id="${project.id}" data-product-id="${product.id}">
                <input type="date" class="form-control form-control-sm" name="date" style="width: 140px;" value="${new Date().toISOString().slice(0,10)}" required>
                <input type="text" class="form-control form-control-sm" name="description" placeholder="+ Add item description" list="item-templates" required>
                <input type="number" class="form-control form-control-sm" name="revenue" placeholder="Revenue" style="width: 120px;">
                <input type="number" class="form-control form-control-sm" name="cost" placeholder="Cost" style="width: 120px;">
                <button type="submit" class="btn btn-success btn-sm">Add</button>
              </form>
            </td>
          </tr>
        </tbody>
      `;
};

const generateFinancialsGrid = (project: Project, itemTemplates: Set<string>): string => {
  // Autocomplete datalist
  const datalistHTML = `<datalist id="item-templates">${Array.from(itemTemplates).map(t => `<option value="${t}"></option>`).join('')}</datalist>`;
    
  let tableBody = project.products.map(product => generateFinancialProductHtml(project, product)).join('');

  return `
    ${datalistHTML}
    <table class="table table-hover mb-0 financials-table">
      <thead>
          <tr>
              <th scope="col" style="width: 130px;">Date</th>
              <th scope="col" style="width: 45%;">Product / Item</th>
              <th scope="col" class="text-end">Revenue</th>
              <th scope="col" class="text-end">Cost</th>
              <th scope="col" class="text-center" style="width: 50px;"></th>
          </tr>
      </thead>
      ${tableBody}
    </table>
  `;
};

export const generateMeasurementItemHtml = (projectId: string, m: MeasurementItem): string => {
    const oldSqm = (m.oldWidth / 1000) * (m.oldHeight / 1000);
    const newSqm = (m.newWidth / 1000) * (m.newHeight / 1000);
    return `
        <tr data-meas-id="${m.id}">
            <td class="editable" data-action="make-editable" data-field="date" data-project-id="${projectId}" data-meas-id="${m.id}">${formatDateForDisplay(m.date)}</td>
            <td class="editable text-end" data-action="make-editable" data-field="oldWidth" data-project-id="${projectId}" data-meas-id="${m.id}">${m.oldWidth}</td>
            <td class="editable text-center" data-action="make-editable" data-field="oldDis" data-project-id="${projectId}" data-meas-id="${m.id}">${m.oldDis}</td>
            <td class="editable text-end" data-action="make-editable" data-field="oldHeight" data-project-id="${projectId}" data-meas-id="${m.id}">${m.oldHeight}</td>
            <td class="editable text-end" data-action="make-editable" data-field="oldQty" data-project-id="${projectId}" data-meas-id="${m.id}">${m.oldQty}</td>
            <td class="text-end">${(oldSqm * m.oldQty).toFixed(3)}</td>

            <td class="editable text-end" data-action="make-editable" data-field="newWidth" data-project-id="${projectId}" data-meas-id="${m.id}">${m.newWidth}</td>
            <td class="editable text-center" data-action="make-editable" data-field="newDis" data-project-id="${projectId}" data-meas-id="${m.id}">${m.newDis}</td>
            <td class="editable text-end" data-action="make-editable" data-field="newHeight" data-project-id="${projectId}" data-meas-id="${m.id}">${m.newHeight}</td>
            <td class="editable text-end" data-action="make-editable" data-field="newQty" data-project-id="${projectId}" data-meas-id="${m.id}">${m.newQty}</td>
            <td class="text-end">${(newSqm * m.newQty).toFixed(3)}</td>
            <td class="text-center">
                <button class="btn-icon" data-action="delete-measurement-item" data-project-id="${projectId}" data-meas-id="${m.id}" aria-label="Delete measurement">${iconDelete}</button>
            </td>
        </tr>
    `;
};

const generateMeasurementGrid = (project: Project): string => {
    const measurements = project.measurements || [];
    
    const totalOldSqm = measurements.reduce((sum, m) => sum + ((m.oldWidth / 1000) * (m.oldHeight / 1000) * m.oldQty), 0);
    const totalNewSqm = measurements.reduce((sum, m) => sum + ((m.newWidth / 1000) * (m.newHeight / 1000) * m.newQty), 0);

    const tableBody = measurements.map(m => generateMeasurementItemHtml(project.id, m)).join('');

    return `
    <table class="table table-hover table-bordered mb-0 measurement-table">
        <thead>
            <tr class="text-center">
                <th rowspan="2" class="align-middle">Date</th>
                <th colspan="5" class="measurement-header-old">OLD</th>
                <th colspan="5" class="measurement-header-new">NEW</th>
                <th rowspan="2" class="align-middle" style="width: 50px;"></th>
            </tr>
            <tr class="text-center">
                <th>Width</th>
                <th>Dis</th>
                <th>Height</th>
                <th>Qty</th>
                <th>SQM</th>
                <th>Width</th>
                <th>Dis</th>
                <th>Height</th>
                <th>Qty</th>
                <th>SQM</th>
            </tr>
        </thead>
        <tbody>
            ${tableBody}
            <tr class="add-item-row bg-light">
                <td colspan="12">
                    <form class="d-flex gap-2 align-items-center flex-wrap" data-action="add-measurement-item" data-project-id="${project.id}">
                        <div class="d-flex gap-1 align-items-center">
                            <label class="form-label small mb-0">Date:</label>
                            <input type="date" name="date" class="form-control form-control-sm" required value="${new Date().toISOString().slice(0, 10)}" style="width: 140px;">
                        </div>
                        <div class="d-flex gap-1 align-items-center">
                            <label class="form-label small mb-0">Old W:</label>
                            <input type="number" name="oldWidth" class="form-control form-control-sm" placeholder="Width" step="0.01" required style="width: 80px;">
                        </div>
                        <div class="d-flex gap-1 align-items-center">
                            <label class="form-label small mb-0">Desc:</label>
                            <input type="text" name="oldDis" class="form-control form-control-sm" placeholder="Description" required style="width: 100px;">
                        </div>
                        <div class="d-flex gap-1 align-items-center">
                            <label class="form-label small mb-0">Old H:</label>
                            <input type="number" name="oldHeight" class="form-control form-control-sm" placeholder="Height" step="0.01" required style="width: 80px;">
                        </div>
                        <div class="d-flex gap-1 align-items-center">
                            <label class="form-label small mb-0">Old Qty:</label>
                            <input type="number" name="oldQty" class="form-control form-control-sm" placeholder="Qty" step="1" required style="width: 70px;">
                        </div>
                        <div class="d-flex gap-1 align-items-center">
                            <label class="form-label small mb-0">New W:</label>
                            <input type="number" name="newWidth" class="form-control form-control-sm" placeholder="Width" step="0.01" value="0" style="width: 80px;">
                        </div>
                        <div class="d-flex gap-1 align-items-center">
                            <label class="form-label small mb-0">New Desc:</label>
                            <input type="text" name="newDis" class="form-control form-control-sm" placeholder="Description" style="width: 100px;">
                        </div>
                        <div class="d-flex gap-1 align-items-center">
                            <label class="form-label small mb-0">New H:</label>
                            <input type="number" name="newHeight" class="form-control form-control-sm" placeholder="Height" step="0.01" value="0" style="width: 80px;">
                        </div>
                        <div class="d-flex gap-1 align-items-center">
                            <label class="form-label small mb-0">New Qty:</label>
                            <input type="number" name="newQty" class="form-control form-control-sm" placeholder="Qty" step="1" value="0" style="width: 70px;">
                        </div>
                        <button type="submit" class="btn btn-success btn-sm">
                            <i class="bi bi-plus-lg"></i> Add
                        </button>
                    </form>
                </td>
            </tr>
        </tbody>
        <tfoot class="table-group-divider">
            <tr class="fw-bold">
                <td class="text-end" colspan="5">Total SQM</td>
                <td class="text-end" data-summary="total-old-sqm" data-project-id="${project.id}">${totalOldSqm.toFixed(3)}</td>
                <td class="text-end" colspan="4">Total SQM</td>
                <td class="text-end" data-summary="total-new-sqm" data-project-id="${project.id}">${totalNewSqm.toFixed(3)}</td>
                <td></td>
            </tr>
        </tfoot>
    </table>
    `;
};
