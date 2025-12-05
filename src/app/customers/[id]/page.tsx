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
  title: 'Contact Details - KSolutions',
  description: 'View contact information and account details',
};

