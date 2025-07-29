
export const renderSettingsModal = (): string => {
  return `
    <div class="modal fade" id="settings-modal" tabindex="-1" aria-labelledby="settingsModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
              <h1 class="modal-title fs-5" id="settingsModalLabel">Settings</h1>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                  <h5>Data Management</h5>
                  <p class="small text-muted">Export all project data to a single JSON file. This backup can be used to restore your entire application state.</p>
              </div>
              <div class="d-grid gap-2">
                 <button class="btn btn-secondary" data-action="export-projects-json">
                    <i class="bi bi-box-arrow-down"></i> Export All Projects (JSON)
                 </button>
                 <label for="import-file-input" class="btn btn-secondary">
                    <i class="bi bi-box-arrow-up"></i> Import All Projects (JSON)
                 </label>
                 <input type="file" id="import-file-input" accept=".json" class="d-none" data-import-action="import-projects-json">
              </div>
               <hr class="my-4">
                <p class="small text-muted">
                    For individual project data, use the CSV import/export buttons found on the project detail page.
                </p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Done</button>
            </div>
        </div>
      </div>
    </div>
  `;
};
