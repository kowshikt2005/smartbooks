import { CustomerList } from '../../components/customers/CustomerList';

export default function CustomersPage() {
  return <CustomerList />;
}

export const metadata = {
  title: 'Customers - SmartBooks',
  description: 'Manage your customer database',
};