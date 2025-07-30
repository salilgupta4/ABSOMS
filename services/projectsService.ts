import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

// Import types from the proj module
export type ProjectStatus = 'Planned' | 'In Progress' | 'Completed';
export type ProjectType = 'Financial' | 'Measurement';

export interface LineItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'revenue' | 'cost';
}

export interface Product {
  id: string;
  name: string;
  items: LineItem[];
}

export interface MeasurementItem {
  id: string;
  date: string;
  oldWidth: number;
  oldHeight: number;
  oldDis: string;
  oldQty: number;
  newWidth: number;
  newHeight: number;
  newDis: string;
  newQty: number;
}

export interface Project {
  id: string;
  name: string;
  orderNumber: string;
  client: string;
  status: ProjectStatus;
  projectType: ProjectType;
  estimatedRevenue?: number;
  estimatedCost?: number;
  measurementRate?: number;
  products: Product[];
  measurements?: MeasurementItem[];
  createdAt?: string;
  updatedAt?: string;
}

// Separate collection name to avoid conflicts with existing OMS data
const COLLECTION_NAME = 'projects_module';

// Sample data for initial testing
const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'E-commerce Platform',
    orderNumber: 'ORD-2024-001',
    client: 'Global Tech Inc.',
    status: 'In Progress',
    projectType: 'Financial',
    estimatedRevenue: 5000000,
    estimatedCost: 3500000,
    products: [
      {
        id: 'prod-1-1',
        name: 'Frontend Development',
        items: [
          { id: 'item-1', date: '2024-05-10', description: 'Initial Milestone Payment', amount: 2500000, type: 'revenue' },
          { id: 'item-2', date: '2024-05-15', description: 'UI/UX Design Software', amount: 50000, type: 'cost' },
          { id: 'item-3', date: '2024-06-01', description: 'Developer Salaries (FE)', amount: 600000, type: 'cost' },
        ]
      },
      {
        id: 'prod-1-2',
        name: 'Backend Services',
        items: [
          { id: 'item-4', date: '2024-05-20', description: 'Server Setup & Hosting', amount: 200000, type: 'cost' },
          { id: 'item-5', date: '2024-05-22', description: 'Database License', amount: 100000, type: 'cost' },
          { id: 'item-6', date: '2024-06-01', description: 'Developer Salaries (BE)', amount: 600000, type: 'cost' },
        ]
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'proj-2',
    name: 'Office Fit-out Measurement',
    orderNumber: 'ORD-2024-002',
    client: 'Corporate Solutions Ltd.',
    status: 'Planned',
    projectType: 'Measurement',
    measurementRate: 250,
    estimatedCost: 80000,
    products: [
      {
        id: 'prod-2-1',
        name: 'General Costs',
        items: [
          { id: 'item-7', date: '2024-07-01', description: 'Travel Expenses', amount: 15000, type: 'cost' }
        ]
      }
    ],
    measurements: [
      { id: 'meas-1', date: '2024-07-10', oldWidth: 5000, oldHeight: 3000, oldDis: 'Office A', oldQty: 2, newWidth: 0, newHeight: 0, newDis: '', newQty: 0 },
      { id: 'meas-2', date: '2024-07-11', oldWidth: 4000, oldHeight: 3000, oldDis: 'Office B', oldQty: 3, newWidth: 0, newHeight: 0, newDis: '', newQty: 0 }
    ],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  },
  {
    id: 'proj-3',
    name: 'Marketing Website',
    orderNumber: 'ORD-2024-003',
    client: 'Creative Designs',
    status: 'Completed',
    projectType: 'Financial',
    estimatedRevenue: 750000,
    estimatedCost: 500000,
    products: [
      {
        id: 'prod-3-1',
        name: 'Project Revenue',
        items: [
          { id: 'item-8', date: '2024-04-01', description: 'Upfront Payment', amount: 375000, type: 'revenue' },
          { id: 'item-9', date: '2024-05-30', description: 'Final Payment', amount: 375000, type: 'revenue' }
        ]
      },
      {
        id: 'prod-3-2',
        name: 'Project Costs',
        items: [
          { id: 'item-10', date: '2024-04-05', description: 'Stock Photos & Assets', amount: 25000, type: 'cost' },
          { id: 'item-11', date: '2024-04-15', description: 'Freelance Copywriter', amount: 100000, type: 'cost' },
          { id: 'item-12', date: '2024-05-01', description: 'Developer Salaries', amount: 350000, type: 'cost' }
        ]
      }
    ],
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z'
  }
];

class ProjectsService {
  async getAllProjects(): Promise<Project[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const firebaseProjects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Project));
      console.log('Successfully loaded from Firebase:', firebaseProjects.length);
      
      // If Firebase is empty, initialize with sample data
      if (firebaseProjects.length === 0) {
        console.log('Firebase is empty, initializing with sample data...');
        await this.initializeSampleData();
        // Reload after initialization
        const querySnapshot2 = await getDocs(q);
        const initializedProjects = querySnapshot2.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Project));
        console.log('Initialized Firebase with sample data:', initializedProjects.length);
        return initializedProjects;
      }
      
      return firebaseProjects;
    } catch (error) {
      console.warn('Firebase not available, using localStorage:', error.message);
      // Fallback to localStorage for offline use
      const localProjects = this.getProjectsFromLocalStorage();
      console.log('Loaded from localStorage:', localProjects.length);
      return localProjects;
    }
  }

  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    try {
      const now = new Date().toISOString();
      const newProject = {
        ...projectData,
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newProject);
      const project = { id: docRef.id, ...newProject };
      
      console.log('Successfully created project in Firebase:', project.id);
      
      // Also save to localStorage as backup
      this.saveProjectToLocalStorage(project);
      
      return project;
    } catch (error) {
      console.warn('Firebase not available for create, using localStorage:', error.message);
      // Fallback to localStorage
      return this.createProjectInLocalStorage(projectData);
    }
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    try {
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, COLLECTION_NAME, projectId), updatedData);
      
      // Also update localStorage
      this.updateProjectInLocalStorage(projectId, updatedData);
    } catch (error) {
      console.error('Error updating project:', error);
      // Fallback to localStorage
      this.updateProjectInLocalStorage(projectId, updates);
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, projectId));
      this.deleteProjectFromLocalStorage(projectId);
    } catch (error) {
      console.error('Error deleting project:', error);
      this.deleteProjectFromLocalStorage(projectId);
    }
  }

  // LocalStorage fallback methods
  private getProjectsFromLocalStorage(): Project[] {
    try {
      const projects = localStorage.getItem('abs_projects_module');
      if (projects) {
        return JSON.parse(projects);
      } else {
        // Initialize with sample data if no data exists
        this.saveProjectsToLocalStorage(SAMPLE_PROJECTS);
        return SAMPLE_PROJECTS;
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return SAMPLE_PROJECTS;
    }
  }

  private saveProjectsToLocalStorage(projects: Project[]): void {
    try {
      localStorage.setItem('abs_projects_module', JSON.stringify(projects));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private saveProjectToLocalStorage(project: Project): void {
    const projects = this.getProjectsFromLocalStorage();
    projects.unshift(project);
    this.saveProjectsToLocalStorage(projects);
  }

  private createProjectInLocalStorage(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const now = new Date().toISOString();
    const project: Project = {
      id: `proj-${Date.now()}`,
      ...projectData,
      createdAt: now,
      updatedAt: now
    };
    
    this.saveProjectToLocalStorage(project);
    return project;
  }

  private updateProjectInLocalStorage(projectId: string, updates: Partial<Project>): void {
    const projects = this.getProjectsFromLocalStorage();
    const index = projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveProjectsToLocalStorage(projects);
    }
  }

  private deleteProjectFromLocalStorage(projectId: string): void {
    const projects = this.getProjectsFromLocalStorage();
    const filtered = projects.filter(p => p.id !== projectId);
    this.saveProjectsToLocalStorage(filtered);
  }

  // Initialize Firebase with sample data
  private async initializeSampleData(): Promise<void> {
    try {
      for (const sampleProject of SAMPLE_PROJECTS) {
        const { id, createdAt, updatedAt, ...projectData } = sampleProject;
        
        // Clean up measurements field for Firebase - remove undefined
        const cleanProjectData: any = { ...projectData };
        if (cleanProjectData.measurements === undefined) {
          delete cleanProjectData.measurements;
        }
        
        await addDoc(collection(db, COLLECTION_NAME), {
          ...cleanProjectData,
          createdAt: createdAt || new Date().toISOString(),
          updatedAt: updatedAt || new Date().toISOString()
        });
      }
      console.log('Sample data initialized in Firebase');
    } catch (error) {
      console.error('Error initializing sample data:', error);
      throw error;
    }
  }

  // Utility methods for project calculations
  calculateProjectTotals(project: Project) {
    let totalRevenue = 0;
    let totalCost = 0;

    if (project.projectType === 'Financial') {
      project.products.forEach(product => {
        product.items.forEach(item => {
          if (item.type === 'revenue') {
            totalRevenue += item.amount;
          } else {
            totalCost += item.amount;
          }
        });
      });
    } else if (project.projectType === 'Measurement' && project.measurements) {
      // Calculate revenue from measurements
      const totalOldSqm = project.measurements.reduce((sum, m) => 
        sum + ((m.oldWidth / 1000) * (m.oldHeight / 1000) * m.oldQty), 0
      );
      totalRevenue = totalOldSqm * (project.measurementRate || 0);

      // Add costs from products
      project.products.forEach(product => {
        product.items.forEach(item => {
          if (item.type === 'cost') {
            totalCost += item.amount;
          }
        });
      });
    }

    return {
      totalRevenue,
      totalCost,
      grossProfit: totalRevenue - totalCost
    };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}

export const projectsService = new ProjectsService();