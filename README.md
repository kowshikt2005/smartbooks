# SmartBooks - WhatsApp-Integrated Accounting App

A comprehensive web-based accounting and customer management application with WhatsApp Cloud API integration for automated payment reminders and transaction statements.

## Features

### Core Features
- **Customer Management**: Simplified customer profiles with essential information
- **WhatsApp Integration**: Send payment reminders and transaction statements via WhatsApp Cloud API
- **Excel Import/Export**: Smart Excel import with automatic customer mapping
- **Transaction Statements**: Generate and send Excel statements with transaction details
- **Real-time Dashboard**: Live overview of customer statistics

### WhatsApp Cloud API Integration
- ✅ Template-based messaging (payment reminders)
- ✅ Document attachments (Excel statements)
- ✅ Dual mode: Cloud API (automated) and Web mode (manual)
- ✅ Bulk messaging with rate limiting
- ✅ Message tracking and analytics
- ✅ Free tier: 1000 conversations/month

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Frontend**: React 19, TypeScript 5, Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Vercel Blob Storage
- **WhatsApp**: WhatsApp Cloud API (Meta)
- **Excel**: XLSX library

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- WhatsApp Business Account with Cloud API access
- Vercel account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd smartbooks
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure `.env.local` with your credentials:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_APP_ID=your_app_id
WHATSAPP_APP_SECRET=your_app_secret

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_blob_token
```

5. Run database migrations:
```bash
npm run db:migrate
```

6. Start development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## WhatsApp Cloud API Setup

### 1. Create Meta Business Account
- Go to [business.facebook.com](https://business.facebook.com)
- Create a new business account

### 2. Create WhatsApp Business App
- Go to [developers.facebook.com](https://developers.facebook.com)
- Create a new app
- Add WhatsApp product

### 3. Get Credentials
- Get permanent access token
- Get phone number ID
- Get business account ID
- Get app ID and secret

### 4. Configure Webhook (Optional)
- Set webhook URL: `https://yourdomain.com/api/whatsapp/webhook`
- Set verify token
- Subscribe to message status updates

## Vercel Blob Storage Setup

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Create or select your project
3. Go to **Storage** tab
4. Click **Create Database** → Select **Blob**
5. Copy the `BLOB_READ_WRITE_TOKEN`
6. Add to `.env.local`

## Deployment

### Deploy to Vercel

1. Push code to GitHub:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. Import project in Vercel:
- Go to [vercel.com/new](https://vercel.com/new)
- Import your GitHub repository
- Add environment variables
- Deploy

3. Auto-deployment:
- Every push to `main` branch auto-deploys
- Preview deployments for pull requests

## Usage

### Send Payment Reminder

1. Go to WhatsApp page
2. Select customer
3. Click "Send Message"
4. Message sent via Cloud API

### Send Transaction Statement

1. Go to WhatsApp page
2. Select customer with multiple transactions
3. Click "Send Statement"
4. System generates Excel and sends via WhatsApp

### Import Excel Data

1. Go to WhatsApp page
2. Click "Import Excel"
3. Upload Excel file
4. Review and resolve conflicts
5. Import data

## Project Structure

```
smartbooks/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── customers/         # Customer management
│   │   ├── dashboard/         # Dashboard
│   │   └── whatsapp/          # WhatsApp interface
│   ├── components/            # React components
│   ├── lib/
│   │   ├── services/          # Business logic services
│   │   ├── database/          # Database utilities
│   │   └── supabase/          # Supabase client
│   ├── types/                 # TypeScript types
│   └── utils/                 # Helper functions
├── public/                    # Static assets
└── package.json
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run db:migrate   # Run database migrations
npm run db:status    # Check migration status
```

## Environment Variables

See `.env.example` for all required environment variables.

## License

Private - All rights reserved

## Support

For issues or questions, contact the development team. - Accounting & Customer Management

SmartBooks is a modern web-based accounting and customer management application designed for small to medium businesses. Built with Next.js 15, Supabase, and modern web technologies.

## ✨ Features

- **📊 Dashboard**: Real-time overview of customers, bank balances, and outstanding amounts
- **👥 Customer Management**: Comprehensive customer profiles with financial tracking
- **💰 Financial Tracking**: Bank balances and outstanding purchase amounts per customer
- **📱 WhatsApp Integration**: Bulk payment reminders via WhatsApp with smart message grouping
- **🔍 Advanced Search**: Search and filter customers by various criteria
- **📋 Data Tables**: Sortable, filterable tables with pagination
- **🎨 Modern UI**: Clean, responsive design with Tailwind CSS
- **🔄 Real-time Updates**: Live data updates using Supabase subscriptions

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS 4 with custom design system
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Authentication**: Supabase Auth with protected routes
- **UI Components**: Custom component library with Headless UI
- **Forms**: React Hook Form with Zod validation
- **Tables**: TanStack Table for advanced data grids
- **Icons**: Heroicons
- **State Management**: React hooks and context

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/smartbooks.git
cd smartbooks
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env.local
```
Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up the database**:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the migration files in order:
     - `src/lib/database/migrations/001_initial_schema.sql`
     - `src/lib/database/migrations/002_customer_financials.sql`

5. **Run the development server**:
```bash
npm run dev
```

6. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
smartbooks/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Dashboard page
│   │   ├── customers/          # Customer management pages
│   │   ├── whatsapp/          # WhatsApp messaging page
│   │   └── login/             # Authentication pages
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   ├── layout/           # Layout components
│   │   ├── customers/        # Customer-specific components
│   │   └── auth/             # Authentication components
│   ├── lib/                  # Utility functions and services
│   │   ├── services/         # API services
│   │   ├── database/         # Database migrations and utilities
│   │   ├── supabase/         # Supabase client and types
│   │   ├── utils/            # Helper functions
│   │   └── validations/      # Form validation schemas
│   ├── types/                # TypeScript type definitions
│   ├── hooks/                # Custom React hooks
│   └── contexts/             # React contexts
├── public/                   # Static assets
└── docs/                    # Documentation
```

## 🗄️ Database Schema

### Core Tables
- **`customers`** - Customer information with financial data
- **`customer_ledger`** - Transaction history and audit trail
- **`ledger_entries`** - General ledger entries
- **`whatsapp_logs`** - WhatsApp message logs (for future use)

### Key Features
- Real-time subscriptions for live updates
- Automatic timestamps and triggers
- Financial data validation and constraints
- Audit trail for all transactions

## 📱 WhatsApp Integration

The WhatsApp feature allows you to:
- Send payment reminders to individual customers
- Bulk send messages to multiple customers
- Smart message grouping for customers with the same phone number
- Professional message templates
- Real-time progress feedback

### How it works:
1. Select customers from the WhatsApp page
2. Click "Send Messages" for bulk sending
3. WhatsApp opens with pre-filled professional messages
4. Send messages directly from WhatsApp

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**:
   - Import your GitHub repository to Vercel
   - Configure environment variables in Vercel dashboard
   - Deploy automatically

2. **Environment Variables**:
   Set the same variables from `.env.local` in your Vercel dashboard

### Manual Deployment

1. **Build the application**:
```bash
npm run build
```

2. **Start the production server**:
```bash
npm start
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Run database migrations
- `npm run db:status` - Check migration status

### Code Style

- **TypeScript** for type safety
- **ESLint** for code quality
- **Tailwind CSS** for styling
- **Component-based architecture**
- **Custom hooks** for reusable logic

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support and questions, please create an issue in the GitHub repository.

---

Built with ❤️ using Next.js and Supabase