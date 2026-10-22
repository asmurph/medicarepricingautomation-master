# Medicare Pricing Automation

Power Apps Code App for managing Medicare pricing requests, intake submission, and operational workflow views.

## Overview

This application provides a modern React-based user interface connected to Dataverse through generated Power Apps services.

Core capabilities include:

- Left navigation with dedicated pages:
  - Home
  - My Work
  - Intake
  - Pricing Records
  - Change Requests
  - Reports
  - Documents
  - Meetings
  - Inquiries
  - Admin
- Intake form for submitting new pricing requests.
- Pricing Records grid for viewing request data.
- My Work view restricted by Requested By filtering.

## Technology Stack

- Power Apps Code App runtime and tooling
- React 18 + TypeScript
- Vite
- Generated Dataverse models and services

## Data Integration

The app uses generated service classes in [src/generated/services](src/generated/services) and models in [src/generated/models](src/generated/models), including:

- `Mpa_pricingrequestsService` for creating and retrieving pricing request records.

The main intake flow currently writes to the `mpa_pricingrequests` Dataverse table.

## Project Structure

- [src/App.tsx](src/App.tsx): Main application UI, navigation, page rendering, and form/table behavior.
- [src/App.css](src/App.css): Styling for layout, navigation, cards, forms, and grids.
- [src/PowerProvider.tsx](src/PowerProvider.tsx): App wrapper/provider boundary.
- [power.config.json](power.config.json): Power Apps local/runtime configuration.
- [vite.config.ts](vite.config.ts): Vite setup with Power Apps plugin.

## Getting Started

### Prerequisites

- Node.js LTS
- npm
- Power Apps CLI and environment access

### Install Dependencies

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

This project is configured to run local development on port `3000` to align with Power Apps local play settings.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Notes

- Intake submit validates required values and GUID format for requested/owner user references.
- Attachments are currently captured as form input only and are not persisted yet.
- Additional pages (Change Requests, Reports, Documents, Meetings, Inquiries, Admin) are scaffolded and ready for feature implementation.

## Future Enhancements

- Bind My Work automatically to current logged-in Dataverse user context.
- Persist and retrieve attachments from Dataverse/document storage.
- Add richer filtering, sorting, and paging for records.
- Add role-based access and workflow-stage permissions.
