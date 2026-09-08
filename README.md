# Merchandising Management System (MMS)

A comprehensive Sample Request & Development Merchandising Management System built with Next.js, featuring role-based access control, real-time notifications, and department-specific workflows.

## Features

- **🎨 Fully Dynamic System**: Configure departments, stages, and fields without code changes
- **Role-Based Access Control**: Different dashboards for VMD, CAD, Commercial, MMC, and Admin roles
- **Real-Time Notifications**: Pusher.js integration for live updates and notifications
- **Department Workflows**: Each department has specific fields and approval processes
- **Custom Workflow Stages**: Create and configure stages with colors, icons, and automation
- **Dynamic Fields**: Add custom fields to SRD records for any department
- **CAD Subprocess Tracking**: Detailed tracking of Sewing, Stitching, Cutting, and Finishing
- **Flagging System**: Departments can flag issues with required comments
- **Progress Tracking**: Real-time progress calculation based on department approvals
- **Audit Trail**: Complete timeline of all activities and comments

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript (ES6+)
- **Authentication**: NextAuth.js with Credentials Provider
- **Database**: MongoDB with Mongoose (mock data for development)
- **Real-Time**: Pusher.js for WebSocket connections
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: React hooks and context

## Project Structure

```
├── app/
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── srd/             # SRD CRUD operations
│   │   └── pusher/          # Real-time authentication
│   ├── dashboard/           # Role-based dashboards
│   │   ├── vmd/
│   │   ├── cad/
│   │   ├── commercial/
│   │   ├── mmc/
│   │   └── admin/
│   ├── srd/[id]/            # SRD detail pages
│   └── login/               # Login page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Layout components
│   ├── SRDCard.js           # SRD card component
│   ├── SRDTable.js          # SRD table component
│   ├── DepartmentPanel.js   # Department-specific forms
│   └── CadSubprocessPanel.js # CAD subprocess tracking
├── lib/
│   ├── auth.js              # NextAuth configuration
│   ├── pusher.js            # Pusher.js helper
│   ├── mockData.js          # Mock SRD data
│   ├── seedUsers.js         # Demo users
│   └── use-toast.js         # Toast notifications
├── models/
│   ├── SRD.js               # SRD Mongoose schema
│   └── User.js              # User Mongoose schema
└── public/                  # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MongoDB (optional, uses mock data by default)
- Pusher account (optional, uses mock events by default)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd srds-gemini-scaffold
``

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Configure environment variables in `.env.local`:

```env
# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# MongoDB (optional)
MONGODB_URI=mongodb://localhost:27017/srd-system

# Pusher (optional - for real-time features)
NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
PUSHER_APP_ID=your-app-id
PUSHER_SECRET=your-secret
NEXT_PUBLIC_PUSHER_CLUSTER=your-cluster
```

5. Seed the dynamic system (departments, stages, fields):
```bash
npm run seed:dynamic
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎨 Dynamic System

The system now features a fully customizable architecture! See [QUICK_START_DYNAMIC.md](QUICK_START_DYNAMIC.md) for a quick guide or [DYNAMIC_SYSTEM.md](DYNAMIC_SYSTEM.md) for complete documentation.

### Configuration Pages
- **Settings Hub**: `/settings` - Central configuration dashboard
- **Departments**: `/departments` - Manage organizational departments
- **Stages**: `/stages` - Configure workflow stages with colors and icons
- **SRD Fields**: `/srdfields` - Add custom fields to SRD records

All configuration is done through the UI - no code changes required!

## Demo Accounts

Use these credentials to test different roles:

| Email | Password | Role | Access |
|-------|----------|------|---------|
| vmd@demo.com | password | VMD Manager | Create SRDs, view all SRDs |
| cad@demo.com | password | CAD Manager | CAD processes, subprocess tracking |
| commercial@demo.com | password | Commercial Manager | Supplier quotes, procurement |
| mmc@demo.com | password | MMC Manager | Production, quality control |
| admin@demo.com | password | Admin | Full system access |

## Usage Guide

### Creating an SRD (VMD)
1. Login as VMD Manager
2. Click "Create SRD" 
3. Fill in the sample details and requirements
4. Submit to automatically assign to all departments

### Department Workflows

#### VMD (Visual Merchandising & Design)
- Creates initial SRD with priority and specifications
- Reviews and approves final samples
- Can view all SRDs and department statuses

#### CAD (Computer Aided Design)
- Receives SRD after VMD approval
- Updates technical specifications (consumption, shrinkage, etc.)
- Tracks subprocesses: Sewing, Stitching, Cutting, Finishing
- Can flag issues with required comments

#### Commercial
- Handles supplier quotations and procurement
- Updates cost, lead time, and availability
- Manages supplier relationships

#### MMC (Manufacturing & Quality Control)
- Plans production requirements
- Manages quality control processes
- Tracks machine requirements and production time

### Flagging Issues
Any department can flag an SRD that requires attention:
1. Change status to "Flagged"
2. Provide a detailed comment explaining the issue
3. VMD and Admin receive real-time notifications
4. Issue resolution is tracked in the timeline

### Real-Time Features
- Live notifications for new SRDs, updates, and flags
- Progress bars update automatically
- Comments and status changes appear instantly
- Toast notifications for important events

## API Endpoints

### SRD Management
- `GET /api/srd` - List SRDs with filters
- `POST /api/srd/create` - Create new SRD
- `GET /api/srd/[id]` - Get SRD details
- `PATCH /api/srd/[id]/department/[dept]` - Update department status
- `GET /api/srd/[id]/timeline` - Get activity timeline

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/session` - Get current session

### System
- `GET /api/departments` - List departments
- `GET /api/users` - List users

## Customization

### Adding New Departments
1. Update the `getDepartments()` function in `lib/mockData.js`
2. Add department-specific fields to the SRD model
3. Create department-specific UI components
4. Update role-based routing and access control

### Modifying CAD Subprocesses
1. Update the `cadSubprocesses` schema in `models/SRD.js`
2. Modify the `CadSubprocessPanel` component
3. Update the `getOverallProgress` calculation

### Styling
- The app uses Tailwind CSS with shadcn/ui components
- Customize colors and themes in `app/globals.css`
- Component variants can be modified in individual component files

## Production Deployment

1. Set up production environment variables
2. Configure real MongoDB connection
3. Set up Pusher for real-time features
4. Build and deploy:
```bash
npm run build
npm start
```

## Troubleshooting

### Common Issues

1. **Authentication not working**
   - Check NEXTAUTH_SECRET in environment variables
   - Ensure NEXTAUTH_URL matches your domain

2. **Real-time features not working**
   - Verify Pusher credentials
   - Check browser console for WebSocket errors

3. **Database connection issues**
   - For development, mock data is used by default
   - For production, ensure MONGODB_URI is correct

4. **Build errors**
   - Clear `.next` directory: `rm -rf .next`
   - Reinstall dependencies: `npm install`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review existing GitHub issues
3. Create a new issue with detailed information