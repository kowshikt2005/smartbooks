/**
 * Test file for ContactClusteringService
 * This file can be used to verify the clustering functionality works correctly
 */

import { ContactClusteringService, type WhatsAppCustomer } from '../contactClustering';

// Mock data for testing
const mockContacts: WhatsAppCustomer[] = [
  {
    id: '1',
    name: 'John Doe',
    phone_no: '9876543210',
    balance_pays: 1000,
    location: 'Mumbai'
  },
  {
    id: '2',
    name: 'John Doe',
    phone_no: '9876543211',
    balance_pays: 2000,
    location: 'Delhi'
  },
  {
    id: '3',
    name: 'Jane Smith',
    phone_no: '9876543212',
    balance_pays: 1500,
    location: 'Bangalore'
  },
  {
    id: '4',
    name: 'john doe',  // Different case
    phone_no: '9876543210',  // Same phone as first
    balance_pays: 500,
    location: 'Chennai'
  }
];

/**
 * Test clustering functionality
 */
export function testContactClustering() {
  console.log('Testing Contact Clustering Service...');
  
  // Test 1: Basic clustering
  const clusters = ContactClusteringService.clusterContacts(mockContacts);
  console.log('Clusters created:', clusters.length);
  
  // Should create 2 clusters: "John Doe" (3 contacts) and "Jane Smith" (1 contact)
  const johnCluster = clusters.find(c => c.name.toLowerCase().includes('john'));
  const janeCluster = clusters.find(c => c.name.toLowerCase().includes('jane'));
  
  console.log('John Doe cluster contacts:', johnCluster?.contacts.length);
  console.log('Jane Smith cluster contacts:', janeCluster?.contacts.length);
  
  // Test 2: Phone number normalization
  const normalized1 = ContactClusteringService.normalizePhone('+91 98765 43210');
  const normalized2 = ContactClusteringService.normalizePhone('9876543210');
  console.log('Phone normalization test:', normalized1 === normalized2);
  
  // Test 3: Name similarity
  const similarity = ContactClusteringService.calculateNameSimilarity('John Doe', 'john doe');
  console.log('Name similarity (should be 1.0):', similarity);
  
  // Test 4: Statistics
  const stats = ContactClusteringService.getClusterStatistics(clusters);
  console.log('Cluster statistics:', stats);
  
  // Test 5: Should use clustering check
  const shouldCluster = ContactClusteringService.shouldUseClustering(mockContacts);
  console.log('Should use clustering:', shouldCluster);
  
  console.log('Contact Clustering Service tests completed!');
  
  return {
    clusters,
    stats,
    shouldCluster
  };
}

// Export for potential use in actual tests
export { mockContacts };