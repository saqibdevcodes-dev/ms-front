# Mystery Shopping Platform - Frontend

A modern, responsive web application for managing mystery shopping assessments, reports, and client relationships.

## Overview

This frontend application serves as the client-facing interface for the Mystery Shopping platform, allowing users to:

- Create, manage, and view mystery shopping reports
- Filter and analyze report data across multiple branches
- Export reports in various formats (Excel, PDF)
- Manage media attachments (images, videos, audio)
- Visualize performance metrics with interactive charts

## Tech Stack

- **Vue.js 3** - Progressive JavaScript framework with Composition API
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **AG Grid** - Advanced data grid for displaying and manipulating report data
- **PrimeVue** - UI component library for Vue.js
- **ExcelJS** - Library for Excel file generation
- **Chart.js** - Charting library for data visualization
- **SweetAlert2** - Beautiful, responsive, customizable replacement for JavaScript's popup boxes

## Installation

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd ms-fe
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory and configure your environment variables:

   ```
   VUE_APP_API_URL=<backend-api-url>
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Features

### User Management

- Multi-role user system (admin, client_admin, client_user)
- Branch-based access control for client users
- Secure authentication and authorization

### Report Management

- Create custom mystery shopping report templates
- Capture and organize field data
- Support for multi-section assessments
- Automated scoring and performance calculation
- Filter reports by various criteria

### Data Visualization

- Performance dashboards with key metrics
- Branch comparison charts
- Trend analysis over time

### Media Management

- Upload and manage images, videos, and audio recordings
- Media gallery for each report
- Export media in bulk

### Export Options

- Excel export with custom formatting and branding
- PDF report generation
- Combined report exports
- Media export functionality

## Folder Structure

```
ms-fe/
├── public/                 # Static files
├── src/
│   ├── assets/             # Images, fonts, etc.
│   ├── components/         # Reusable Vue components
│   ├── layouts/            # Page layouts
│   ├── router/             # Vue Router configuration
│   ├── stores/             # State management (Pinia/Vuex)
│   ├── styles/             # Global CSS and Tailwind configuration
│   ├── utils/              # Utility functions
│   ├── views/              # Page components
│   │   ├── admin/          # Admin dashboards and views
│   │   ├── auth/           # Login, register, etc.
│   │   ├── clients/        # Client management views
│   │   │   ├── attributed-reports/    # Attributed reports view
│   │   │   ├── combined-reports/      # Combined reports view
│   │   │   ├── consolidated-reports/  # Consolidated reports view
│   │   │   ├── sectioned-reports/     # Sectioned reports view
│   │   │   └── user-reports/          # User reports view
│   │   └── reports/        # Report creation and management
│   ├── App.vue             # Root component
│   └── main.js             # Application entry point
├── .env                    # Environment variables
├── package.json            # Dependencies and scripts
└── vite.config.js          # Build configuration
```

## Usage

### Authentication

Users must log in with their credentials to access the system. Different user roles have different permissions:

- **Admin**: Full access to all functions and data
- **Client Admin**: Access to all reports for their organization
- **Client User**: Access only to reports for branches they are assigned to

### Report Views

The system provides multiple report views to meet different analysis needs:

- **User Reports**: Individual reports for standard viewing
- **Consolidated Reports**: Combined view of multiple reports
- **Sectioned Reports**: Detailed view organized by assessment sections
- **Attributed Reports**: Reports with attribution to specific evaluators
- **Combined Reports**: Custom combination of multiple report types

### Filtering and Selection

Reports can be filtered by:

- Branch
- Date range
- Performance score
- Custom fields

The "Select All" checkbox with filtered view allows users to work with a specific subset of reports.

### Exporting Data

Reports can be exported in various formats:

- **Excel**: Detailed spreadsheets with formatting
- **PDF**: Formatted documents for sharing
- **Media**: Images, videos, and audio as individual files or zip archives

## Contributing

1. Create a feature branch from the development branch
2. Make your changes
3. Submit a pull request

## License

Proprietary - All rights reserved
