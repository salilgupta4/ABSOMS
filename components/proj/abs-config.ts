// ABS Projects Pro - Configuration for modular integration

export interface ABSConfig {
  // Integration settings
  isIntegratedWithOMS: boolean;
  omsApiEndpoint?: string;
  
  // UI customization
  showNavbar: boolean;
  showBreadcrumbs: boolean;
  containerClass: string;
  
  // Feature toggles
  enableFirebaseSync: boolean;
  enableAIInsights: boolean;
  enableExportImport: boolean;
  
  // Branding
  appName: string;
  appIcon: string;
  primaryColor: string;
  
  // Module integration callbacks
  onProjectCreate?: (project: any) => void;
  onProjectUpdate?: (project: any) => void;
  onProjectDelete?: (projectId: string) => void;
  
  // Navigation callbacks for OMS integration
  onNavigateBack?: () => void;
  onNavigateToProject?: (projectId: string) => void;
}

// Default configuration for standalone mode
export const defaultConfig: ABSConfig = {
  isIntegratedWithOMS: false,
  showNavbar: true,
  showBreadcrumbs: true,
  containerClass: 'container-fluid py-3 abs-projects-module abs-module-container',
  enableFirebaseSync: true,
  enableAIInsights: true,
  enableExportImport: true,
  appName: 'ABS Projects Pro',
  appIcon: 'bi-building',
  primaryColor: '#0d6efd'
};

// Configuration for ABS OMS integration
export const omsIntegratedConfig: ABSConfig = {
  isIntegratedWithOMS: true,
  omsApiEndpoint: '/api/oms',
  showNavbar: false,
  showBreadcrumbs: false,
  containerClass: 'abs-projects-module abs-oms-integrated',
  enableFirebaseSync: false, // Use OMS database instead
  enableAIInsights: true,
  enableExportImport: true,
  appName: 'Projects Module',
  appIcon: 'bi-folder',
  primaryColor: '#0d6efd'
};

// Global configuration instance
let currentConfig: ABSConfig = defaultConfig;

export const setConfig = (config: Partial<ABSConfig>) => {
  currentConfig = { ...currentConfig, ...config };
};

export const getConfig = (): ABSConfig => currentConfig;

// Utility functions for configuration-based rendering
export const shouldShowNavbar = (): boolean => currentConfig.showNavbar;
export const shouldShowBreadcrumbs = (): boolean => currentConfig.showBreadcrumbs;
export const getContainerClass = (): string => currentConfig.containerClass;
export const getAppName = (): string => currentConfig.appName;
export const getAppIcon = (): string => currentConfig.appIcon;

// Module export functions for ABS OMS integration
export const initABSProjectsModule = (config: Partial<ABSConfig> = {}) => {
  setConfig(config);
  
  // Apply CSS classes based on configuration
  if (config.isIntegratedWithOMS) {
    document.body.classList.add('abs-oms-integrated');
  }
  
  return {
    config: currentConfig,
    version: '1.0.0',
    moduleId: 'abs-projects-pro'
  };
};

// Export component for dynamic loading in ABS OMS
export const getProjectsComponent = () => ({
  name: 'ABS Projects Pro',
  version: '1.0.0',
  type: 'module',
  dependencies: ['bootstrap', 'bootstrap-icons'],
  css: ['abs-projects.css'],
  js: ['index.tsx'],
  config: currentConfig
});