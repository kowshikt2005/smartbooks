import { CustomerDetails } from '../../../components/customers/CustomerDetails';

interface CustomerPageProps {
  params: {
    id: string;
  };
}

export default function CustomerPage({ params }: CustomerPageProps) {
  return <CustomerDetails customerId={params.id} />;
}

export const metadata = {
  title: 'Customer Details - SmartBooks',
  description: 'View customer information and account details',
};

