# CareerPilot AI

CareerPilot AI is a modern web application for creating ATS-friendly resumes with AI assistance. Generate, customize, and export professional resumes in PDF format with an intuitive interface and powerful AI-driven editing capabilities.

## Features

- **User Authentication**: Secure registration and login with email/password or Google OAuth via Supabase
- **Resume Management**: Upload existing resumes or start from scratch
- **AI-Powered Generation**: Generate ATS-friendly resumes based on job descriptions and user profiles
- **Live Editing**: Real-time resume preview with an integrated AI copilot for suggestions and improvements
- **Multiple Templates**: Choose from professional resume templates
- **PDF Export**: Download your resume as a formatted PDF
- **Dashboard**: Organized workspace for managing multiple resumes
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

### Frontend
- **React 19** - UI framework
- **TanStack Router** - Type-safe routing
- **TanStack Start** - Meta framework for React
- **TypeScript** - Static type safety
- **Tailwind CSS** - Utility-first styling
- **React Hook Form** - Form state management
- **Sonner** - Toast notifications

### Backend & Infrastructure
- **TanStack React Start** - Full-stack framework with SSR support
- **Supabase** - PostgreSQL database, authentication, and object storage
- **OpenAI API** - AI resume generation and enhancement (optional)
- **Nitro** - Server engine for deployment

### Development
- **Vite** - Lightning-fast build tool
- **Vitest** - Unit and integration testing
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Getting Started

### Prerequisites
- Node.js 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or equivalent package manager

### Installation

```bash
git clone <repository-url>
cd pilot-my-resume
npm install
```

### Environment Setup

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Configure the required environment variables:

```env
# Supabase (required)
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
VITE_SUPABASE_PROJECT_ID=<your-project-ref>

SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sbprivate_xxx

# Optional: OpenAI API for AI features
OPENAI_API_KEY=sk_test_xxx
```

### Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building

```bash
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:dom

# Generate coverage report
npm run test:coverage
```

### Linting & Formatting

```bash
npm run lint
npm run format
```

## Supabase Setup

To use CareerPilot AI, you'll need a Supabase project:

1. Create a project at [supabase.com](https://supabase.com)
2. Set up authentication (Email/Password and Google OAuth)
3. Create the required database tables (migrations are in `supabase/migrations/`)
4. Configure storage buckets for resume uploads
5. Copy your project URL and API keys to `.env`

For detailed information, see [docs/DATABASE.md](docs/DATABASE.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Architecture

- **src/routes/** - Application routes and page components
- **src/components/** - Reusable React components
- **src/services/** - API and external service integrations
- **src/lib/** - Core business logic and utilities
- **src/integrations/** - Third-party service integrations (Supabase, AI)
- **src/context/** - React context providers for global state
- **src/hooks/** - Custom React hooks
- **tests/** - Test files (unit, integration, e2e)

## Deployment

CareerPilot AI can be deployed to various platforms using Nitro. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

## Contributing

Contributions are welcome! Please ensure code passes linting and tests before submitting pull requests.

## License

This project is provided as-is for educational and commercial use.

## Support

For issues, questions, or suggestions, please open an issue in the repository.

