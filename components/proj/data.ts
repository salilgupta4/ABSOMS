
// --- TYPE DEFINITIONS ---
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
}


// --- MOCK DATABASE ---
// This data is used to seed the Firestore database on the first run.
export let projects: Project[] = [
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
    ]
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
    ]
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
    ]
  },
];