# ABS OMS with Payroll - Firebase ERP India

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-10.12.2-orange)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.4-38B2AC)](https://tailwindcss.com/)

## 🚀 Overview

ABS OMS (Order Management System) with Payroll is a comprehensive Enterprise Resource Planning (ERP) system designed specifically for Indian businesses. Built with modern web technologies, it provides a unified platform for managing sales, purchases, inventory, payroll, customer relationships, and project management.

### ✨ Key Features

- **📊 Dashboard** - Real-time business insights and metrics
- **💰 Sales Management** - Quotes, Sales Orders, Delivery Orders
- **🛒 Purchase Management** - Purchase Orders and Vendor Management
- **📦 Inventory Management** - Stock tracking with real-time updates
- **👥 Customer & Vendor Management** - Comprehensive contact management
- **💼 Payroll System** - Complete payroll processing with Indian compliance
- **🎯 Project Management** - Financial and measurement-based project tracking
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **🔒 Role-based Access Control** - Secure user management with granular permissions
- **📄 PDF Generation** - Professional documents (invoices, reports, payslips)
- **⚡ Real-time Sync** - Instant updates across all devices
- **🌐 Offline Support** - Continue working without internet connectivity
- **📱 Mobile App** - React Native companion app for on-the-go access

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** + **Radix UI** for modern, accessible UI components
- **React Router DOM** for client-side routing
- **Zustand** for state management
- **Firebase SDK** for backend integration

### Backend Services
- **Firebase Firestore** - NoSQL database with offline persistence
- **Firebase Authentication** - User authentication and authorization
- **Firebase Storage** - File storage for documents and assets
- **Firebase Hosting** - Web hosting and CDN

### Key Libraries
- **jsPDF** + **jspdf-autotable** - PDF generation
- **html2canvas** - Screenshot and image generation
- **Lucide React** - Modern icon library
- **EmailJS** - Client-side email notifications

## 📋 Prerequisites

Before setting up the project, ensure you have:

- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn** package manager
- **Firebase Project** with Firestore, Authentication, and Storage enabled
- **Git** for version control

## ⚡ Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/salilgupta4/ABSOMS.git
cd "ABS OMS with Payroll"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Configuration

Create a `.env.local` file in the root directory and add your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication (Email/Password)
4. Enable Firestore Database
5. Enable Storage
6. Copy configuration to your `.env.local` file

### 5. Initialize Firestore Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

### 6. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 7. First-time Setup

1. Navigate to the application in your browser
2. Create an admin account (first user automatically gets admin privileges)
3. Configure company details in Settings
4. Start adding your business data

## 📁 Project Structure

```
ABS OMS with Payroll/
├── components/                 # React components
│   ├── auth/                  # Authentication components
│   ├── customers/             # Customer management
│   ├── Dashboard.tsx          # Main dashboard
│   ├── inventory/             # Inventory management
│   ├── payroll/              # Payroll system
│   ├── products/             # Product management
│   ├── purchase/             # Purchase management
│   ├── sales/                # Sales management
│   ├── settings/             # System settings
│   ├── ui/                   # Reusable UI components
│   ├── users/                # User management
│   └── vendors/              # Vendor management
├── contexts/                  # React contexts
├── hooks/                     # Custom React hooks
├── services/                  # API and business logic
├── stores/                    # State management
├── types.ts                   # TypeScript type definitions
├── utils/                     # Utility functions
├── public/                    # Static assets
├── docs/                      # Documentation
└── ABSOMSMobile/             # React Native mobile app
```

## 🔐 User Roles & Permissions

| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | Full system access | All modules, user management, settings |
| **Maker** | Document creator | Create/edit quotes, orders, customers |
| **Approver** | Document approver | Approve documents, view reports |
| **Viewer** | Read-only access | View-only access to most modules |
| **Payroll Admin** | Payroll specialist | Full payroll module access |
| **Projects Admin** | Project manager | Full projects module access |

## 💻 Core Modules

### 📊 Dashboard
- Real-time business metrics
- Top inventory items
- Recent document activity
- Quick action shortcuts

### 💰 Sales Management
- **Quotes**: Create professional quotations with revisions
- **Sales Orders**: Convert quotes to confirmed orders
- **Delivery Orders**: Manage product deliveries
- **Pending Items**: Track undelivered items with TV mode for warehouse display

### 🛒 Purchase Management
- **Purchase Orders**: Create and manage supplier orders
- **Vendor Management**: Maintain vendor database with GST details

### 📦 Inventory Management
- **Real-time Stock Tracking**: Automatic stock updates
- **Stock History**: Detailed movement tracking
- **Stock Adjustments**: Manual stock corrections with audit trail

### 💼 Payroll System
- **Employee Management**: Complete employee profiles
- **Advance Payments**: Track and manage salary advances
- **Leave Management**: Leave requests and approvals
- **Payroll Processing**: Monthly salary calculations
- **Compliance**: PF, ESI, TDS calculations as per Indian standards
- **Reports**: Comprehensive payroll reports

### 🎯 Project Management
- **Financial Projects**: Revenue and cost tracking
- **Measurement Projects**: Area/volume-based billing
- **Project Analytics**: Profit/loss analysis

## 📱 Mobile Application

The project includes a React Native mobile application located in the `ABSOMSMobile/` directory. 

### Mobile App Features
- Native iOS and Android apps
- Offline-first architecture
- Real-time synchronization
- Essential ERP functions on mobile

### Mobile App Setup
```bash
cd ABSOMSMobile
npm install
npx react-native run-android  # For Android
npx react-native run-ios      # For iOS
```

## 🚀 Deployment

### Firebase Hosting Deployment

1. **Build the project:**
```bash
npm run build
```

2. **Deploy to Firebase:**
```bash
firebase deploy
```

### Manual Deployment

1. Build the project: `npm run build`
2. Upload the `dist/` folder to your web server
3. Configure your server for SPA routing (redirect all routes to `index.html`)

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | Yes |

### Firestore Security Rules

The application uses comprehensive Firestore security rules to ensure data privacy and security. Rules are defined in `firestore.rules` and include:

- User authentication verification
- Role-based access control
- Data validation rules
- Rate limiting

### Custom Settings

Configure the application through the Settings module:

- **Company Details**: Name, address, GST number
- **Document Numbering**: Custom formats for quotes, orders
- **PDF Customization**: Letterheads, signatures, layouts
- **Terms & Conditions**: Default terms for documents
- **Theme Settings**: Brand colors and styling

## 🧪 Testing

### Running Tests
```bash
npm run test          # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage reports
```

### Test Structure
- **Unit Tests**: Component and utility function tests
- **Integration Tests**: API and service tests
- **E2E Tests**: Full user journey tests

## 📊 Performance

### Optimization Features
- **Code Splitting**: Lazy-loaded components
- **Bundle Optimization**: Tree shaking and minification
- **Image Optimization**: WebP format with fallbacks
- **Caching**: Service worker for offline functionality
- **Database Optimization**: Indexed queries and pagination

### Performance Metrics
- Lighthouse Performance Score: 95+
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Bundle Size: <2MB (compressed)

## 🐛 Troubleshooting

### Common Issues

**1. EPERM: operation not permitted during npm install**
```bash
# Use NVM (recommended)
nvm install --lts
nvm use --lts
npm install

# Or use sudo (not recommended)
sudo npm install
```

**2. Firebase Authentication Error**
- Verify Firebase configuration in `.env.local`
- Check Firebase console for enabled authentication methods
- Ensure correct domain authorization

**3. Firestore Permission Denied**
- Check Firestore security rules
- Verify user authentication
- Confirm user role assignments

**4. Build Errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**5. Mobile App Issues**
```bash
# Reset React Native cache
cd ABSOMSMobile
npx react-native start --reset-cache
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm run test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Create a Pull Request

### Code Standards

- Use TypeScript for all new code
- Follow ESLint configuration
- Write unit tests for new features
- Update documentation for API changes
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Lead Developer**: [Salil Gupta](https://github.com/salilgupta4)
- **Contributors**: See [Contributors](https://github.com/salilgupta4/ABSOMS/contributors)

## 📞 Support

For support and questions:

- 📧 Email: [support@absoms.com](mailto:support@absoms.com)
- 📖 Documentation: [docs.absoms.com](https://docs.absoms.com)
- 🐛 Issues: [GitHub Issues](https://github.com/salilgupta4/ABSOMS/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/salilgupta4/ABSOMS/discussions)

## 🗺️ Roadmap

### Upcoming Features
- [ ] Advanced Analytics Dashboard
- [ ] Multi-currency Support
- [ ] API Integration Framework
- [ ] Advanced Reporting Engine
- [ ] Workflow Automation
- [ ] Multi-company Support
- [ ] Advanced Inventory Planning

### Version History
- **v2.1.0** - Enhanced TV Mode, improved UI consistency
- **v2.0.0** - Complete payroll system, mobile app
- **v1.5.0** - Project management module
- **v1.0.0** - Initial release with core ERP functionality

---

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=salilgupta4/ABSOMS&type=Date)](https://star-history.com/#salilgupta4/ABSOMS&Date)

---

**Built with ❤️ for Indian businesses**