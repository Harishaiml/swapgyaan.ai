# SwapGyaan AI Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-Hosted_on_Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white)](https://swapgyaan-ai.web.app)

## Abstract
SwapGyaan AI Platform is an intelligent, full-stack educational web application designed to seamlessly connect students with knowledgeable teachers or peers for skill swapping, tutoring, and collaborative learning. Leveraging a dynamic AI-driven ecosystem, it streamlines the entire educational workflow—from intelligent matching and scheduling sessions to generating verifiable PDF certificates and providing AI-powered tutoring assistance. The platform offers a unified, modern, and highly responsive user interface targeted towards simplifying knowledge exchange.

## Key Features

- **Intelligent Matching System:** A robust system that pairs students with the right teachers based on their learning requirements, subject interests, and availability.
- **Session & Scheduling Management:** Complete lifecycle management for educational sessions. Teachers can set up availability slots, and students can request or book them. Includes a soft-delete mechanism for flexible calendar management without permanent data loss.
- **AI Tutor Assistant:** Integrates intelligent artificial intelligence to help guide students, assist with queries, and provide on-demand learning support within the platform.
- **Dynamic Certificate Generation:** A premium credentialing system that issues customized, visually rich PDF certificates upon course or session completion. It leverages docxtemplater, HTML2Canvas, and JSPDF with custom background templates.
- **Certificate Verification Portal:** Built-in public pages designed for anyone to openly verify the authenticity of a generated certificate via unique IDs.
- **Secure Authentication:** Integrated with Supabase, it supports robust user authentication, including email verification loops, password resets, and secure profile management.
- **Interactive Dashboards:** Distinct and personalized dashboards for teachers and students, visualizing schedules, requests, current matches, and earned credentials using modern charts and animated UI components.
- **Responsive & Accessible UI:** Designed with a meticulously crafted dark/light mode adaptable interface utilizing Tailwind CSS, Framer Motion for sleek micro-animations, and Radix UI primitives for enhanced accessibility.

## Technical Details

### Core Technology Stack
- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript
- **Routing:** React Router DOM (v6)

### State Management & Data Fetching
- **Server State:** `@tanstack/react-query` (Caching, synchronization, and data fetching)
- **Local State/Context:** React Context API (Auth Context)

### UI & Styling
- **CSS Framework:** Tailwind CSS (with `tailwindcss-animate` and `@tailwindcss/typography`)
- **Component Library:** shadcn/ui (Built on top of Radix UI primitives for headless accessibility)
- **Animations:** Framer Motion & GSAP concepts for smooth page transitions and micro-interactions
- **Icons:** Lucide React
- **Data Visualization:** Recharts

### Backend & Infrastructure
- **BaaS (Backend as a Service):** Supabase
  - PostgreSQL database for relational data and soft mapping.
  - Authentication functionality (JWT, Row Level Security).
  - Storage buckets for media and template assets.

### Document & Data Processing
- **PDF Generation:** HTML2Canvas, JSPDF
- **Document Templating:** docxtemplater, pizzip
- **Form Handling:** React Hook Form
- **Schema Validation:** Zod

## Project Structure

```text
src/
├── assets/          # Static files, images, and brand assets
├── components/      # Reusable UI components (shadcn ui) and feature modules
│   ├── dashboard/   # Dashboard specific complex components (AITutor, MatchView, Sessions, Certificates)
│   └── ui/          # Standardized UI atoms (Buttons, Inputs, Dialogs)
├── contexts/        # React Context providers (e.g., AuthProvider)
├── hooks/           # Custom React hooks
├── integrations/    # Third-party integrations (Supabase clients)
├── lib/             # Utility libraries and configuration helpers (Tailwind merge, etc.)
├── pages/           # Route-level components (Auth, Dashboard, Index, Verify, NotFound)
└── utils/           # Helper scripts (e.g., certificateGenerator.ts)
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- `npm` or `yarn` or `bun`
- A Supabase Project (Database, Auth, and Storage configured)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd gyaan-sync-hub-main
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   # or
   bun run dev
   ```
   The application will start on `http://localhost:8080` (or `http://localhost:5173` locally, dependent on Vite config).

### Building for Production
To build the application for deployment:
```bash
npm run build
```
This will compile the TypeScript, bundle the React application via Vite, and output optimized static files to the `dist/` directory.

### Linting & Testing
- **Lint Code:** `npm run lint`
- **Run Tests:** `npm run test` (Powered by Vitest & Playwright)
