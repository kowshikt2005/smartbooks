import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClusterCard from '../ClusterCard';
import type { ContactCluster } from '../../../lib/services/contactClustering';

// Mock the phone utils
jest.mock('../../../utils/phoneUtils', () => ({
  formatPhoneForDisplay: (phone: string) => phone,
  validatePhoneNumber: (phone: string) => ({ isValid: true, message: null })
}));

// Mock Button component
jest.mock('../../ui/Button', () => {
  return function MockButton({ children, onClick, ...props }: any) {
    return <button onClick={onClick} {...props}>{children}</button>;
  };
});

describe('ClusterCard', () => {
  const mockCluster: ContactCluster = {
    id: 'cluster_1',
    name: 'John Smith',
    contacts: [
      {
        id: '1',
        name: 'John Smith',
        phone_no: '+91 98765 43210',
        balance_pays: 15000,
        invoice_id: 'INV-001',
        location: 'Mumbai'
      },
      {
        id: '2',
        name: 'John Smith',
        phone_no: '+91 98765 43210',
        balance_pays: 8500,
        invoice_id: 'INV-002',
        location: 'Mumbai'
      }
    ],
    totalOutstanding: 23500,
    primaryPhone: '+91 98765 43210',
    alternatePhones: [],
    isExpanded: false,
    lastUpdated: new Date(),
    conflictCount: 0
  };

  const mockProps = {
    cluster: mockCluster,
    onPhoneUpdate: jest.fn(),
    onToggleExpand: jest.fn(),
    onSelectContact: jest.fn(),
    selectedContacts: new Set<string>(),
    isSelected: false,
    onSelectCluster: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders cluster name correctly', () => {
    render(<ClusterCard {...mockProps} />);
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('renders total outstanding amount correctly', () => {
    render(<ClusterCard {...mockProps} />);
    expect(screen.getByText('₹23,500')).toBeInTheDocument();
  });

  it('shows contact count badge', () => {
    render(<ClusterCard {...mockProps} />);
    expect(screen.getByText('2 contacts')).toBeInTheDocument();
  });

  it('displays primary phone number', () => {
    render(<ClusterCard {...mockProps} />);
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
  });

  it('shows collapsed state by default', () => {
    render(<ClusterCard {...mockProps} />);
    // Should show ChevronRightIcon when collapsed
    const chevronRight = document.querySelector('[data-testid="chevron-right"]');
    expect(screen.getByText('Click to expand and view details')).toBeInTheDocument();
  });

  it('calls onToggleExpand when header is clicked', () => {
    render(<ClusterCard {...mockProps} />);
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);
    expect(mockProps.onToggleExpand).toHaveBeenCalledWith('cluster_1');
  });

  it('shows expanded content when isExpanded is true', () => {
    const expandedCluster = { ...mockCluster, isExpanded: true };
    render(<ClusterCard {...mockProps} cluster={expandedCluster} />);
    
    // Should show individual contacts
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('INV-002')).toBeInTheDocument();
  });

  it('shows conflict indicator when conflicts exist', () => {
    const clusterWithConflicts = { ...mockCluster, conflictCount: 2 };
    render(<ClusterCard {...mockProps} cluster={clusterWithConflicts} />);
    expect(screen.getByText('2 conflicts')).toBeInTheDocument();
  });

  it('handles cluster selection', () => {
    render(<ClusterCard {...mockProps} />);
    const checkbox = screen.getAllByRole('checkbox')[0]; // First checkbox is cluster selection
    fireEvent.click(checkbox);
    expect(mockProps.onSelectCluster).toHaveBeenCalledWith('cluster_1', true);
  });

  it('shows phone editor when edit button is clicked', () => {
    render(<ClusterCard {...mockProps} />);
    const editButton = screen.getByTitle('Edit phone number for all contacts in cluster');
    fireEvent.click(editButton);
    expect(screen.getByPlaceholderText('Enter phone number')).toBeInTheDocument();
  });
});