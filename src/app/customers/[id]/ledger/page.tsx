import { CustomerLedger } from '../../../../components/customers/CustomerLedger';

interface CustomerLedgerPageProps {
  params: {
    id: string;
  };
}

export default function CustomerLedgerPage({ params }: CustomerLedgerPageProps) {
  return <CustomerLedger customerId={params.id} />;
}

export async function generateMetadata({ params }: CustomerLedgerPageProps) {
  return {
    title: 'Customer Ledger - SmartBooks',
    description: 'View customer transaction history and ledger entries',
  };
}