
import { GoogleGenAI, Type } from "@google/genai";
import { projects, Project, ProjectStatus, Product, ProjectType, MeasurementItem, LineItem } from './data';
import { renderDashboard } from './components/Dashboard';
import { renderProjectDetail, generateFinancialProductHtml, generateFinancialItemHtml, generateMeasurementItemHtml } from './components/ProjectDetail';
import { renderCreateProjectForm, renderAddProductForm, renderEditProjectForm } from './components/CreateProjectForm';
import { renderSettingsModal } from './components/SettingsModal';
import { deepCopy, calculateProjectTotals, calculateProductTotals, financialsToCsvString, parseCsvToFinancials, measurementsToCsvString, parseCsvToMeasurements, parseDisplayDate, showNotification, formatCurrency, formatDateForDisplay } from './utils';
import { iconSparkles } from "./components/icons";

// A minimal interface for the Bootstrap Modal to ensure type safety.
interface IBootstrapModal {
  show: () => void;
  hide: () => void;
}

// Extend the global Window interface to inform TypeScript about libraries
// loaded via <script> tags. This prevents "not defined" errors at runtime
// by correctly scoping them to the window object.
declare global {
  interface Window {
    bootstrap: {
      Modal: new (element: HTMLElement | null, options?: any) => IBootstrapModal;
      Toast: new (element: HTMLElement | null, options?: any) => {
        show: () => void;
        hide: () => void;
        dispose: () => void;
      };
    };
  }
}

// --- APPLICATION STATE ---
let appState = {
  projects: projects,
  currentSearch: '',
  activeModals: {} as Record<string, IBootstrapModal>,
  itemTemplates: new Set<string>()
};

const mainContent = document.getElementById('main-content') as HTMLElement;
const modalContainer = document.getElementById('modal-container') as HTMLElement;

// --- DYNAMIC FORM LOGIC ---
function toggleProjectTypeFields(type: string) {
    const modalEl = document.querySelector('.modal.show');
    if (!modalEl) return;

    const financialFields = modalEl.querySelector('#financial-fields') as HTMLElement;
    const measurementFields = modalEl.querySelector('#measurement-fields') as HTMLElement;

    if (!financialFields || !measurementFields) return;

    if (type === 'Measurement') {
      financialFields.style.display = 'none';
      measurementFields.style.display = 'contents';
    } else {
      financialFields.style.display = 'contents';
      measurementFields.style.display = 'none';
    }
}


// --- STATE MUTATION & RENDERING ---

/**
 * Updates the project in the global app state. Does NOT trigger a re-render.
 */
function updateProjectInState(updatedProject: Project) {
  appState.projects = appState.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
}


/**
 * Surgically updates all displayed totals and calculated values on the Project Detail page.
 */
function refreshProjectDisplays(project: Project) {
    const totals = calculateProjectTotals(project);

    // Update main overview
    document.querySelector(`[data-summary="total-revenue"][data-project-id="${project.id}"]`)!.textContent = formatCurrency(totals.totalRevenue);
    document.querySelector(`[data-summary="total-cost"][data-project-id="${project.id}"]`)!.textContent = formatCurrency(totals.totalCost);
    
    const profitEl = document.querySelector(`[data-summary="gross-profit"][data-project-id="${project.id}"]`)!;
    profitEl.textContent = formatCurrency(totals.grossProfit);
    profitEl.classList.toggle('text-success', totals.grossProfit >= 0);
    profitEl.classList.toggle('text-danger', totals.grossProfit < 0);

    // Update product-level totals
    project.products.forEach(product => {
        const productTotals = calculateProductTotals(product);
        const revEl = document.querySelector(`[data-summary="product-revenue"][data-product-id="${product.id}"]`);
        const costEl = document.querySelector(`[data-summary="product-cost"][data-product-id="${product.id}"]`);
        if(revEl) revEl.textContent = formatCurrency(productTotals.totalRevenue);
        if(costEl) costEl.textContent = formatCurrency(productTotals.totalCost);
    });

    if (project.projectType === 'Measurement' && project.measurements) {
        const totalOldSqm = project.measurements.reduce((sqmSum, m) => sqmSum + ((m.oldWidth / 1000) * (m.oldHeight / 1000) * m.oldQty), 0);
        const totalNewSqm = project.measurements.reduce((sqmSum, m) => sqmSum + ((m.newWidth / 1000) * (m.newHeight / 1000) * m.newQty), 0);
        
        const revDetailEl = document.querySelector(`[data-summary="revenue-detail"][data-project-id="${project.id}"]`);
        if (revDetailEl) {
             revDetailEl.innerHTML = `
                <p class="h4 mb-0" data-summary="total-revenue" data-project-id="${project.id}">${formatCurrency(totals.totalRevenue)}</p>
                <span class="text-muted small d-block">(${totalOldSqm.toFixed(3)} SQM &times; ${formatCurrency(project.measurementRate || 0)}/SQM)</span>
             `;
        }
        
        const oldSqmEl = document.querySelector(`[data-summary="total-old-sqm"][data-project-id="${project.id}"]`);
        const newSqmEl = document.querySelector(`[data-summary="total-new-sqm"][data-project-id="${project.id}"]`);
        if(oldSqmEl) oldSqmEl.textContent = totalOldSqm.toFixed(3);
        if(newSqmEl) newSqmEl.textContent = totalNewSqm.toFixed(3);
    }
}


function createProject(projectData: Omit<Project, 'id' | 'products' | 'measurements'>) {
    const newProject: Project = {
        id: `proj-${Date.now()}`,
        ...projectData,
        products: [],
        measurements: projectData.projectType === 'Measurement' ? [] : undefined,
    };
    appState.projects.push(newProject);
    hideModal('create-project-modal');
    window.location.hash = `#/project/${newProject.id}`;
}

function deleteProject(projectId: string) {
    appState.projects = appState.projects.filter(p => p.id !== projectId);
    window.location.hash = '#/';
}

function findProjectById(projectId: string): Project | undefined {
    return appState.projects.find(p => p.id === projectId);
}

// --- MODAL MANAGEMENT ---
function showModal(id: string, content: string) {
    modalContainer.innerHTML = content;
    const modalEl = document.getElementById(id);
    if (modalEl) {
        const modalInstance = new window.bootstrap.Modal(modalEl);
        modalInstance.show();
        appState.activeModals[id] = modalInstance;

        // Special handling for project forms to initialize fields visibility
        if (id === 'create-project-modal' || id === 'edit-project-modal') {
             modalEl.addEventListener('shown.bs.modal', () => {
                const typeSelector = modalEl.querySelector('select[name="projectType"]') as HTMLSelectElement;
                if(typeSelector) {
                    toggleProjectTypeFields(typeSelector.value);
                }
            }, { once: true });
        }
        
        modalEl.addEventListener('hidden.bs.modal', () => {
            delete appState.activeModals[id];
            modalContainer.innerHTML = '';
        }, { once: true });
    }
}

function hideModal(id: string) {
    appState.activeModals[id]?.hide();
}

// --- DATA ACTIONS ---
function handleExportProjects() {
    try {
        const dataStr = JSON.stringify(appState.projects, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `abs-project-cost-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('All projects successfully exported.', 'success');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showNotification(`Failed to export projects. Error: ${errorMessage}`, 'error');
    }
}

function handleImportProjects(file: File) {
    const inputId = 'import-file-input';
    const fileInput = document.getElementById(inputId) as HTMLInputElement;

    if (!confirm('This will overwrite all current projects with the content of the selected file. Are you sure you want to proceed?')) {
        if (fileInput) fileInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonString = e.target?.result as string;
            if (!jsonString?.trim()) {
                throw new Error("The selected file is empty or could not be read.");
            }
            const importedProjects = JSON.parse(jsonString);
            // Basic validation: check if it's an array
            if (Array.isArray(importedProjects)) {
                appState.projects = importedProjects;
                initializeItemTemplates(); // Re-initialize templates from imported data
                hideModal('settings-modal');
                render(); // Full render is okay here as we are changing pages.
                showNotification(`Successfully imported ${importedProjects.length} projects.`, 'success');
            } else {
                throw new Error("Invalid format: File must contain a JSON array of projects.");
            }
        } catch (error) {
            console.error("Import Error:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            showNotification(`Failed to import projects. Please ensure the file is a valid JSON export. Error: ${errorMessage}`, 'error');
        } finally {
            if (fileInput) fileInput.value = '';
        }
    };
    reader.onerror = () => {
        showNotification('Error reading the selected file. Please ensure it is not corrupted.', 'error');
        if (fileInput) fileInput.value = '';
    };
    reader.readAsText(file);
}

function handleExportFinancialsCsv(project: Project) {
    if (!project) return;
    try {
        const csvString = financialsToCsvString(project.products);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name}-financials-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('Financials exported successfully.', 'success');
    } catch (error) {
        console.error("Export Error:", error);
        showNotification(`Could not export financial data. Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
}

function handleImportFinancialsCsv(file: File, project: Project) {
    const fileInput = document.getElementById(`import-financials-${project.id}`) as HTMLInputElement;
    if (!confirm(`This will overwrite all existing financial line items for project "${project.name}". Are you sure?`)) {
        if (fileInput) fileInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const csvString = e.target?.result as string;
            if (!csvString?.trim()) {
                throw new Error("The selected file is empty or could not be read.");
            }
            const parsedProducts = parseCsvToFinancials(csvString);
            const projectCopy = deepCopy(project);
            projectCopy.products = parsedProducts;
            updateProjectInState(projectCopy);
            render(); // Full re-render is needed after a bulk import
            initializeItemTemplates(); // Update autocomplete list
            showNotification(`Successfully imported ${parsedProducts.length} product categories for "${project.name}".`, 'success');
        } catch (error) {
            console.error("Import Error:", error);
            showNotification(`Import failed for "${project.name}". Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
        } finally {
            if (fileInput) fileInput.value = '';
        }
    };
    reader.onerror = () => {
        showNotification('Error reading the selected file.', 'error');
        if (fileInput) fileInput.value = '';
    };
    reader.readAsText(file);
}

function handleExportMeasurementsCsv(project: Project) {
    if (!project || !project.measurements) return;
    try {
        const csvString = measurementsToCsvString(project.measurements);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name}-measurements-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('Measurements exported successfully.', 'success');
    } catch (error) {
        console.error("Export Error:", error);
        showNotification(`Could not export measurement data. Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
}

function handleImportMeasurementsCsv(file: File, project: Project) {
    const fileInput = document.getElementById(`import-measurements-${project.id}`) as HTMLInputElement;
    if (!confirm(`This will overwrite all existing measurement line items for project "${project.name}". Are you sure?`)) {
        if (fileInput) fileInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const csvString = e.target?.result as string;
             if (!csvString?.trim()) {
                throw new Error("The selected file is empty or could not be read.");
            }
            const parsedMeasurements = parseCsvToMeasurements(csvString);
            const projectCopy = deepCopy(project);
            projectCopy.measurements = parsedMeasurements;
            updateProjectInState(projectCopy);
            render(); // Full re-render is needed after a bulk import
            showNotification(`Successfully imported ${parsedMeasurements.length} measurement rows for "${project.name}".`, 'success');
        } catch (error) {
            console.error("Import Error:", error);
            showNotification(`Import failed for "${project.name}". Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
        } finally {
            if (fileInput) fileInput.value = '';
        }
    };
    reader.onerror = () => {
        showNotification('Error reading the selected file.', 'error');
        if (fileInput) fileInput.value = '';
    };
    reader.readAsText(file);
}

// --- ASYNC ACTIONS (GEMINI API) ---
const getAiInsights = async (button: HTMLButtonElement) => {
    const insightsContainer = document.getElementById('insights-card-container');
    const projectId = button.dataset.projectId;
    if (!insightsContainer || !projectId) return;

    const project = findProjectById(projectId);
    if (!project) return;

    const originalButtonContent = button.innerHTML;
    button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Analyzing...`;
    button.disabled = true;
    insightsContainer.innerHTML = '';

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const projectDataForPrompt = {
            name: project.name, status: project.status, projectType: project.projectType,
            budget: { 
                estimatedRevenue: project.estimatedRevenue, 
                estimatedCost: project.estimatedCost,
                measurementRate: project.measurementRate
            },
            actuals: calculateProjectTotals(project),
            costItems: project.products.flatMap(p => p.items.map(i => ({ product: p.name, date: i.date, description: i.description, type: i.type, amount: i.amount })))
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze the following project data for financial health, risks, and recommendations.\n\n${JSON.stringify(projectDataForPrompt, null, 2)}`,
            config: {
                systemInstruction: "You are a senior financial analyst. Provide concise, actionable insights based *only* on the provided JSON data.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      summary: { type: Type.STRING, description: "A brief, one-sentence summary of the project's financial health." },
                      risks: { type: Type.ARRAY, description: "A list of up to 3 potential financial or project management risks.", items: { type: Type.STRING } },
                      recommendations: { type: Type.ARRAY, description: "A list of up to 3 specific, actionable recommendations.", items: { type: Type.STRING } },
                    },
                    required: ['summary', 'risks', 'recommendations']
                },
            },
        });

        const resultJson = JSON.parse(response.text);
        insightsContainer.innerHTML = `
          <div class="card fade show" id="ai-insights-card">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-2">
                  <h5 class="card-title mb-0">${iconSparkles} AI Insights</h5>
                  <button type="button" class="btn-close" data-action="close-insights" aria-label="Close"></button>
              </div>
              <p class="card-text fst-italic text-muted small">${resultJson.summary}</p>
              <h6>Potential Risks</h6>
              <ul class="small">${resultJson.risks.map((risk: string) => `<li>${risk}</li>`).join('') || '<li>None identified.</li>'}</ul>
              <h6>Recommendations</h6>
              <ul class="small">${resultJson.recommendations.map((rec: string) => `<li>${rec}</li>`).join('') || '<li>No specific recommendations.</li>'}</ul>
            </div>
          </div>
        `;
    } catch (error) {
      console.error("AI Insights Error:", error);
      let errorMessage = "An error occurred while generating insights.";
      if (error instanceof Error && (error.message.includes('403') || error.message.includes('API key'))) {
          errorMessage = "<strong>Access Denied (Error 403).</strong> Please verify your Gemini API key and permissions.";
      }
      insightsContainer.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert" id="ai-insights-card">${errorMessage}<button type="button" class="btn-close" data-action="close-insights" aria-label="Close"></button></div>`;
    } finally {
        button.innerHTML = originalButtonContent;
        button.disabled = false;
    }
};

// --- CENTRAL EVENT HANDLER ---
function handleAppEvent(e: Event) {
    const target = e.target as HTMLElement;
    const actionTarget = target.closest<HTMLElement>('[data-action]');
    if (!actionTarget) return;

    const { action, projectId, productId: prodId, itemId, measId } = actionTarget.dataset;
    const project = projectId ? findProjectById(projectId) : undefined;
    
    // Guard against unintended form submissions via clicks
    const isSubmitAction = ['create-project', 'update-project', 'add-product', 'add-item', 'add-measurement-item'].includes(action || '');
    if (isSubmitAction && e.type !== 'submit') {
        return;
    }

    // For navigation and form submissions, prevent the default browser action.
    if (action === 'navigate' || (isSubmitAction && e.type === 'submit')) {
        e.preventDefault();
    }


    switch (action) {
        // Navigation
        case 'navigate':
            window.location.hash = (actionTarget as HTMLAnchorElement).hash;
            break;

        // Modals
        case 'show-create-project-modal':
            showModal('create-project-modal', renderCreateProjectForm());
            break;
        case 'show-add-product-modal':
            if (project) showModal('add-product-modal', renderAddProductForm(project.id));
            break;
        case 'show-edit-project-modal':
            if (project) showModal('edit-project-modal', renderEditProjectForm(project));
            break;
        case 'show-settings-modal':
            showModal('settings-modal', renderSettingsModal());
            break;
        
        // CRUD Operations
        case 'create-project': {
            const form = actionTarget as HTMLFormElement;
            const formData = new FormData(form);
            const projectType = formData.get('projectType') as ProjectType;
            
            const newProjectData: any = {
              name: formData.get('name') as string,
              client: formData.get('client') as string,
              orderNumber: formData.get('orderNumber') as string,
              status: formData.get('status') as ProjectStatus,
              projectType: projectType,
              estimatedCost: Number(formData.get('estimatedCost')),
            };

            if (projectType === 'Financial') {
                newProjectData.estimatedRevenue = Number(formData.get('estimatedRevenue'));
            } else {
                newProjectData.measurementRate = Number(formData.get('measurementRate'));
            }
            createProject(newProjectData);
            break;
        }
        case 'update-project': {
            if (!project) break;
            const form = actionTarget as HTMLFormElement;
            const formData = new FormData(form);
            const projectType = formData.get('projectType') as ProjectType;
            
            const updatedProjectData: Project = {
                ...project, // Keep id, products, measurements
                name: formData.get('name') as string,
                client: formData.get('client') as string,
                orderNumber: formData.get('orderNumber') as string,
                status: formData.get('status') as ProjectStatus,
                projectType: projectType,
                estimatedCost: Number(formData.get('estimatedCost')),
                estimatedRevenue: projectType === 'Financial' ? Number(formData.get('estimatedRevenue')) : undefined,
                measurementRate: projectType === 'Measurement' ? Number(formData.get('measurementRate')) : undefined,
            };
            updateProjectInState(updatedProjectData);
            hideModal('edit-project-modal');
            render(); // Full re-render needed to reflect major changes
            break;
        }
         case 'delete-project':
            if (project && confirm(`Are you sure you want to delete project "${project.name}"? This action cannot be undone.`)) {
                deleteProject(project.id);
            }
            break;
        case 'add-product': {
             if (!project) break;
             const form = actionTarget as HTMLFormElement;
             const formData = new FormData(form);
             const projectCopy = deepCopy(project);
             const newProduct: Product = { id: `prod-${Date.now()}`, name: formData.get('name') as string, items: [] };
             projectCopy.products.push(newProduct);
             updateProjectInState(projectCopy);
             
             const table = document.querySelector('.financials-table');
             if (table) {
                table.insertAdjacentHTML('beforeend', generateFinancialProductHtml(project, newProduct));
             }

             refreshProjectDisplays(projectCopy);
             hideModal('add-product-modal');
             break;
        }
        case 'add-item': {
            if (!project || !prodId) break;
            const form = actionTarget as HTMLFormElement;
            const formData = new FormData(form);
            const date = formData.get('date') as string;
            const description = formData.get('description') as string;
            const revenueVal = Number(formData.get('revenue'));
            const costVal = Number(formData.get('cost'));

            if (date && description && (revenueVal > 0 || costVal > 0)) {
                const projectCopy = deepCopy(project);
                const product = projectCopy.products.find(p => p.id === prodId);
                if (product) {
                    appState.itemTemplates.add(description); // Add to autocomplete list once
                    const addedItems: LineItem[] = [];

                    if (revenueVal > 0) {
                        const newItem: LineItem = { id: `item-${Date.now()}-rev`, date, description, amount: revenueVal, type: 'revenue' };
                        product.items.push(newItem);
                        addedItems.push(newItem);
                    }
                    if (costVal > 0) {
                        const newItem: LineItem = { id: `item-${Date.now()}-cost`, date, description, amount: costVal, type: 'cost' };
                        product.items.push(newItem);
                        addedItems.push(newItem);
                    }
                    
                    updateProjectInState(projectCopy);
                    
                    const addItemRow = form.closest('tr');
                    addedItems.forEach(item => {
                         addItemRow?.insertAdjacentHTML('beforebegin', generateFinancialItemHtml(project.id, product.id, item));
                    });

                    refreshProjectDisplays(projectCopy);
                    form.reset();
                    (form.querySelector('[name="date"]') as HTMLInputElement).value = new Date().toISOString().slice(0, 10);
                }
            }
            break;
        }
        case 'add-measurement-item': {
            if (!project) break;
            const form = actionTarget as HTMLFormElement;
            const formData = new FormData(form);

            const newMeasurement: MeasurementItem = {
                id: `meas-${Date.now()}`,
                date: formData.get('date') as string,
                oldWidth: Number(formData.get('oldWidth')),
                oldHeight: Number(formData.get('oldHeight')),
                oldDis: formData.get('oldDis') as string,
                oldQty: Number(formData.get('oldQty')),
                newWidth: Number(formData.get('newWidth')),
                newHeight: Number(formData.get('newHeight')),
                newDis: formData.get('newDis') as string,
                newQty: Number(formData.get('newQty')),
            };

            const projectCopy = deepCopy(project);
            if (!projectCopy.measurements) projectCopy.measurements = [];
            projectCopy.measurements.push(newMeasurement);
            updateProjectInState(projectCopy);

            const addItemRow = form.closest('tr');
            addItemRow?.insertAdjacentHTML('beforebegin', generateMeasurementItemHtml(project.id, newMeasurement));
            
            refreshProjectDisplays(projectCopy);
            form.reset();
            (form.querySelector('[name="date"]') as HTMLInputElement).value = new Date().toISOString().slice(0, 10);
            break;
        }
        case 'delete-product':
            if (project && prodId && confirm('Delete this product/category and all its items?')) {
                const projectCopy = deepCopy(project);
                projectCopy.products = projectCopy.products.filter(p => p.id !== prodId);
                updateProjectInState(projectCopy);

                document.querySelector(`tbody[data-product-id="${prodId}"]`)?.remove();
                refreshProjectDisplays(projectCopy);
            }
            break;
        case 'delete-item':
            if (project && prodId && itemId && confirm('Delete this item?')) {
                const projectCopy = deepCopy(project);
                const product = projectCopy.products.find(p => p.id === prodId);
                if (product) {
                    product.items = product.items.filter(i => i.id !== itemId);
                    updateProjectInState(projectCopy);

                    document.querySelector(`tr[data-item-id="${itemId}"]`)?.remove();
                    refreshProjectDisplays(projectCopy);
                }
            }
            break;
        case 'delete-measurement-item':
             if (project && measId && confirm('Delete this measurement row?')) {
                const projectCopy = deepCopy(project);
                if (projectCopy.measurements) {
                    projectCopy.measurements = projectCopy.measurements.filter(m => m.id !== measId);
                    updateProjectInState(projectCopy);

                    document.querySelector(`tr[data-meas-id="${measId}"]`)?.remove();
                    refreshProjectDisplays(projectCopy);
                }
            }
            break;

        // Data Management
        case 'export-projects-json':
            handleExportProjects();
            break;
        case 'export-financials-csv':
            if (project) handleExportFinancialsCsv(project);
            break;
        case 'export-measurements-csv':
            if (project) handleExportMeasurementsCsv(project);
            break;

        // Inline Editing
        case 'make-editable': {
            if (actionTarget.isContentEditable) return;
            actionTarget.contentEditable = 'true';
            actionTarget.focus();
            document.execCommand('selectAll', false, undefined);
            actionTarget.classList.add('is-editing');
            const originalValue = actionTarget.textContent;

            const save = () => {
                actionTarget.contentEditable = 'false';
                actionTarget.classList.remove('is-editing');
                handleSaveEdit(actionTarget, originalValue);
                cleanUp();
            };
            const cancel = () => {
                actionTarget.contentEditable = 'false';
                actionTarget.classList.remove('is-editing');
                actionTarget.textContent = originalValue;
                cleanUp();
            }
            const handleKey = (ev: KeyboardEvent) => {
                if (ev.key === 'Enter') { ev.preventDefault(); save(); }
                if (ev.key === 'Escape') cancel();
            }
            const cleanUp = () => {
                actionTarget.removeEventListener('blur', save);
                actionTarget.removeEventListener('keydown', handleKey);
            }
            actionTarget.addEventListener('blur', save, { once: true });
            actionTarget.addEventListener('keydown', handleKey);
            break;
        }
        
        // AI Insights
        case 'get-insights':
            getAiInsights(actionTarget as HTMLButtonElement);
            break;
        case 'close-insights':
            document.getElementById('ai-insights-card')?.remove();
            break;
    }
}

function handleSaveEdit(element: HTMLElement, originalValue: string | null) {
    const { field, projectId, productId: prodId, itemId, measId } = element.dataset;
    const project = projectId ? findProjectById(projectId) : undefined;
    if (!project) return;
    
    const projectCopy = deepCopy(project);
    const newValue = element.textContent || '';
    const numValue = Number(newValue.replace(/[^0-9.-]+/g,""));
    let needsRefresh = true;

    if (field && ['name', 'client', 'orderNumber'].includes(field)) {
        (projectCopy as any)[field] = newValue;
    } else if (field === 'productName' && prodId) {
        const product = projectCopy.products.find(p => p.id === prodId);
        if (product) product.name = newValue;
    } else if (field && ['itemDate', 'itemDescription', 'itemAmount'].includes(field) && prodId && itemId) {
        const product = projectCopy.products.find(p => p.id === prodId);
        const item = product?.items.find(i => i.id === itemId);
        if (item) {
            if (field === 'itemDescription') {
                item.description = newValue;
                needsRefresh = false; // No calculations depend on this
            } else if (field === 'itemDate') {
                const isoDate = parseDisplayDate(newValue);
                if (isoDate) {
                    item.date = isoDate;
                    element.textContent = formatDateForDisplay(isoDate); // Standardize format
                } else {
                    showNotification('Invalid date format. Please use DD-MM-YYYY.', 'error');
                    element.textContent = originalValue; // Revert
                    return;
                }
                needsRefresh = false; // No calculations depend on this
            } else if (field === 'itemAmount') {
                item.amount = numValue;
                element.textContent = formatCurrency(numValue); // Standardize format
            }
        }
    } else if (field && measId && projectCopy.measurements) {
        const measurement = projectCopy.measurements.find(m => m.id === measId);
        if (measurement) {
            if (field === 'date') {
                 const isoDate = parseDisplayDate(newValue);
                 if (isoDate) {
                    measurement.date = isoDate;
                    element.textContent = formatDateForDisplay(isoDate); // Standardize format
                 } else {
                    showNotification('Invalid date format. Please use DD-MM-YYYY.', 'error');
                    element.textContent = originalValue; // Revert
                    return;
                 }
                 needsRefresh = false; // No calculations depend on this
            } else if (field in measurement) {
                (measurement as any)[field] = (field.toLowerCase().includes('dis')) ? newValue : numValue;
            }
        }
    } else { return; }

    updateProjectInState(projectCopy);
    if (needsRefresh) {
      refreshProjectDisplays(projectCopy);
    }
}

// --- ROUTER & RENDER ---
const render = () => {
    const path = window.location.hash.slice(1) || '/';
    
    if (path.startsWith('/project/')) {
        const currentProject = findProjectById(path.split('/')[2]);
        if (currentProject) {
            mainContent.innerHTML = renderProjectDetail(currentProject, appState.itemTemplates);
        } else {
            mainContent.innerHTML = '<h2>Project not found</h2><p><a href="#/" data-action="navigate">&larr; Go to Dashboard</a></p>';
        }
    } else {
        mainContent.innerHTML = renderDashboard(appState.projects, appState.currentSearch);
    }
};


// --- APP INITIALIZATION ---

function initializeItemTemplates() {
    appState.itemTemplates.clear();
    appState.projects.forEach(proj => {
        proj.products.forEach(prod => {
            prod.items.forEach(item => {
                appState.itemTemplates.add(item.description);
            });
        });
    });
}

window.addEventListener('hashchange', () => render());

window.addEventListener('load', () => {
    // Theme switcher logic
    const themeSwitcher = document.getElementById('theme-switcher');
    const moonIcon = themeSwitcher?.querySelector('.bi-moon-stars-fill');
    const sunIcon = themeSwitcher?.querySelector('.bi-sun-fill');
    const htmlEl = document.documentElement;

    const applyTheme = (theme: 'light' | 'dark') => {
        htmlEl.setAttribute('data-bs-theme', theme);
        if (theme === 'dark') {
            moonIcon?.classList.add('d-none');
            sunIcon?.classList.remove('d-none');
        } else {
            moonIcon?.classList.remove('d-none');
            sunIcon?.classList.add('d-none');
        }
    };

    themeSwitcher?.addEventListener('click', () => {
        const currentTheme = htmlEl.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    applyTheme(savedTheme || 'light'); // Default to light theme
    
    // Initialize data
    initializeItemTemplates();

    // Initial render
    render();
});


document.body.addEventListener('click', handleAppEvent);
document.body.addEventListener('submit', handleAppEvent);

document.body.addEventListener('input', (e) => {
    const target = e.target as HTMLElement;
    if (target.dataset.action === 'search-projects') {
        const searchInput = target as HTMLInputElement;
        appState.currentSearch = searchInput.value;
        mainContent.innerHTML = renderDashboard(appState.projects, appState.currentSearch);
        // Re-focus after re-render
        const newSearchInput = document.getElementById('project-search') as HTMLInputElement;
        if (newSearchInput) {
            newSearchInput.focus();
            // Move cursor to the end
            newSearchInput.setSelectionRange(newSearchInput.value.length, newSearchInput.value.length);
        }
    }
});

// Dedicated listener for all file inputs to simplify logic
document.body.addEventListener('change', (e) => {
    const target = e.target as HTMLElement;

    // Handle project type toggling in forms
    if (target.matches('select[name="projectType"]')) {
        const selectEl = target as HTMLSelectElement;
        toggleProjectTypeFields(selectEl.value);
        return;
    }

    // Handle file imports
    const inputEl = target as HTMLInputElement;
    const action = inputEl.dataset.importAction;
    if (action && inputEl.files?.length) {
        const file = inputEl.files[0];
        const projectId = inputEl.dataset.projectId;
        const project = projectId ? findProjectById(projectId) : undefined;

        if (action === 'import-projects-json') {
            handleImportProjects(file);
        } else if (action === 'import-financials-csv' && project) {
            handleImportFinancialsCsv(file, project);
        } else if (action === 'import-measurements-csv' && project) {
            handleImportMeasurementsCsv(file, project);
        } else if (!project && (action.includes('financials') || action.includes('measurements'))) {
            showNotification('Error: Could not find the project context for this import.', 'error');
            inputEl.value = '';
        }
    }
});
