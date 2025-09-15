# Oeconomia Dashboard

## Overview

Oeconomia Dashboard is a comprehensive cryptocurrency portfolio management application built for tracking OEC and ELOQ tokens. The application provides real-time portfolio analytics, staking management, governance participation tracking, and trading insights through an intuitive dashboard interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built as a single-page application using:
- **React 18** with TypeScript for type safety and modern component patterns
- **Vite** as the build tool for fast development and optimized production builds
- **Tailwind CSS** with a custom design system based on shadcn/ui components
- **TanStack Query** for server state management and data fetching
- **React Hook Form** with Zod validation for form handling

The UI follows a component-driven architecture with:
- Reusable UI components in `/client/src/components/ui/`
- Feature-specific components for dashboard functionality
- Custom hooks for shared logic and mobile responsiveness
- Dark mode support with CSS custom properties

### Backend Architecture
The backend uses a Express.js server with:
- **Express.js** as the web framework
- **TypeScript** for type safety across the entire stack
- RESTful API design with `/api` prefix for all endpoints
- Modular route organization in `server/routes.ts`
- Centralized error handling middleware
- Development-only Vite integration for SSR and HMR

### Data Storage Solutions
The application supports multiple storage strategies:
- **In-memory storage** (`MemStorage`) for development and testing
- **PostgreSQL** integration ready via Drizzle ORM
- **Neon Database** serverless PostgreSQL for production
- Type-safe database schemas defined in `shared/schema.ts`
- Database migrations managed through Drizzle Kit

### Database Schema Design
Current schema includes:
- **Users table** with UUID primary keys, unique usernames, and password storage
- Extensible schema structure prepared for portfolio, token, and transaction data
- Zod validation schemas derived from Drizzle table definitions
- Shared types between frontend and backend via the `/shared` directory

### Authentication and Session Management
Session management configured for:
- **PostgreSQL session store** using `connect-pg-simple`
- Secure session configuration ready for implementation
- Cookie-based authentication strategy
- Environment-based configuration for production security

### External Dependencies
- **@neondatabase/serverless** - Serverless PostgreSQL database connectivity
- **Drizzle ORM** - Type-safe database toolkit with PostgreSQL dialect
- **Radix UI** - Headless component primitives for accessible UI components
- **Lucide React** - Icon library for consistent iconography
- **Embla Carousel** - Touch-friendly carousel components
- **Date-fns** - Date manipulation and formatting utilities
- **Class Variance Authority** - Utility for managing component variants

### Development and Build Pipeline
The build process handles:
- **Frontend bundling** with Vite targeting `/dist/public`
- **Backend compilation** with esbuild for Node.js ESM output
- **Development server** with hot module replacement and error overlays
- **Database migrations** via Drizzle Kit commands
- **TypeScript compilation** checking across client, server, and shared code

### Deployment Configuration
Production deployment supports:
- **Environment variable** configuration for database connections
- **Static asset serving** from the Express server
- **ESM module** format for modern Node.js compatibility
- **Replit-specific** plugins for development environment integration