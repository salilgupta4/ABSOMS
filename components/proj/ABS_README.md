# ABS Projects Pro

A modern, modular project management system designed for easy integration with ABS OMS.

## Features

- **Project Management**: Create, edit, and track projects with financial and measurement data
- **CSV Import/Export**: Import and export financial and measurement data via CSV files
- **AI Insights**: Get AI-powered project analysis (requires Gemini API key)
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark/Light Theme**: Toggle between light and dark modes
- **Modular Architecture**: Designed for integration with ABS OMS

## Project Types

### Financial Projects
- Track revenue and cost line items
- Multiple product categories per project
- Real-time profit/loss calculations
- CSV import/export for financial data

### Measurement Projects
- Track old and new measurements (width, height, quantity)
- Automatic SQM (square meter) calculations
- Measurement rate-based revenue calculation
- CSV import/export for measurement data

## CSV Import/Export

### Financial Data Format
```csv
Product Name,Item Date,Item Description,Revenue,Cost
Frontend Development,2024-05-10,Initial Payment,2500000,
Frontend Development,2024-05-15,Software License,,50000
```

### Measurement Data Format
```csv
Date,Old Width,Old Dis,Old Height,Old Qty,New Width,New Dis,New Height,New Qty
2024-07-10,5000,Office A,3000,2,0,,0,0
```

## Running the Application

### Development
```bash
npm install
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

## ABS OMS Integration

This system is designed to be easily integrated into ABS OMS as a module:

### Integration Steps

1. **Import the module**:
```typescript
import { initABSProjectsModule, getProjectsComponent } from './abs-config';

// Initialize with OMS configuration
const projectsModule = initABSProjectsModule({
  isIntegratedWithOMS: true,
  omsApiEndpoint: '/api/oms',
  showNavbar: false,
  onProjectCreate: (project) => {
    // Handle project creation in OMS
  }
});
```

2. **CSS Integration**: Include `abs-projects.css` in your OMS build

3. **Container Integration**: Use the module within your OMS layout:
```html
<div class="abs-projects-module abs-oms-integrated">
  <!-- ABS Projects content goes here -->
</div>
```

### Configuration Options

- `isIntegratedWithOMS`: Hide/show standalone features
- `omsApiEndpoint`: API endpoint for OMS integration
- `showNavbar`: Control navbar visibility
- `enableFirebaseSync`: Toggle Firebase sync (disable for OMS database)
- Callback functions for project CRUD operations

## Environment Variables

- `GEMINI_API_KEY`: Required for AI insights feature

## Technologies Used

- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **Bootstrap 5**: UI framework
- **Bootstrap Icons**: Icon library
- **Firebase**: Database and real-time sync (optional)
- **Google Gemini AI**: AI insights (optional)

## File Structure

```
├── components/           # React/TypeScript components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── ProjectDetail.tsx # Project detail view
│   ├── CreateProjectForm.tsx # Project forms
│   ├── SettingsModal.tsx # Settings modal
│   └── icons.ts         # Icon definitions
├── data.ts              # Data types and initial data
├── utils.ts             # Utility functions (CSV, calculations)
├── index.tsx            # Main application entry
├── abs-config.ts        # Modular configuration
├── abs-projects.css     # Custom styles
└── index.html           # HTML template
```

## Modular Design Benefits

1. **Easy Integration**: Drop-in module for ABS OMS
2. **Configuration-Driven**: Behavior controlled via config
3. **Isolated Styles**: CSS scoped to prevent conflicts
4. **Flexible Data**: Support for external databases
5. **Callback System**: Hooks for parent system integration

## License

Proprietary - ABS Projects Pro