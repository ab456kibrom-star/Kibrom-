# Weekly Activity Schedule & Weekend Planner

A comprehensive activity planner and schedule manager built with React, TypeScript, Tailwind CSS, and Vite. Designed to streamline project milestones, maintenance activities, and weekend plans with team collaboration and productivity features.

## Features

- **Activity & Milestone Scheduling**: Plan tasks across weekdays and weekends with categorized tags (Maintenance, Cleaning, Plumbing, Family, General) and safety notes.
- **Subtask Checklists & Progress Tracking**: Real-time evaluation percentages computed automatically as subtasks are completed.
- **CSV Import & Export**: Upload properly formatted CSV files to replace schedule items with preview and confirmation safeguards, or export data with one click.
- **Google Calendar Export**: Export scheduled milestones directly to your Google Calendar with custom reminders.
- **Google Sheets Synchronization**: Two-way sync with Google Sheets for tabular archiving and updates.
- **Gemini AI Copilot**: AI-powered schedule optimization and task feasibility analysis.
- **Team Chat & Live Location Tracking**: Real-time collaboration and location sharing.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for Admin, Editor, and Viewer roles.

## Getting Started

### Prerequisites

- Node.js (v18, v20, or v22)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

## Workflows & CI/CD

- `.github/workflows/webpack.yml`: Matrix build verification for Node 18.x, 20.x, and 22.x running `npm run build`.
- `.github/workflows/datadog-synthetics.yml`: Synthetic monitoring checks.
