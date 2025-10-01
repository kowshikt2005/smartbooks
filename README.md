# SmartBooks - Accounting & Customer Management

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