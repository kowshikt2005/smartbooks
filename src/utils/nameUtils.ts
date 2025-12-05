/**
 * Name matching and normalization utilities for contact clustering
 */

export interface NameSimilarityResult {
  similarity: number;
  isMatch: boolean;
  confidence: 'exact' | 'high' | 'medium' | 'low' | 'none';
}

/**
 * Normalize name for comparison
 * Standardizes name format for consistent matching
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  
  return name.toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
    .replace(/[^\w\s]/g, '')        // Remove special characters except spaces
    .replace(/\b(mr|mrs|ms|dr|prof|sir|madam)\b/g, '') // Remove titles
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of edits needed to transform one string into another
 */
export function calculateLevenshteinDistance(str1: string, str2: string): number {
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;
  
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  // Initialize first row and column
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  // Fill the matrix
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,      // deletion
        matrix[j - 1][i] + 1,      // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate name similarity using Levenshtein distance
 * Returns a similarity score between 0 and 1
 */
export function calculateNameSimilarity(name1: string | null | undefined, name2: string | null | undefined): NameSimilarityResult {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);
  
  // Handle empty names
  if (!norm1 || !norm2) {
    return {
      similarity: 0,
      isMatch: false,
      confidence: 'none'
    };
  }
  
  // Exact match
  if (norm1 === norm2) {
    return {
      similarity: 1.0,
      isMatch: true,
      confidence: 'exact'
    };
  }
  
  // Calculate similarity using Levenshtein distance
  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;
  
  if (longer.length === 0) {
    return {
      similarity: 1.0,
      isMatch: true,
      confidence: 'exact'
    };
  }
  
  const editDistance = calculateLevenshteinDistance(longer, shorter);
  const similarity = (longer.length - editDistance) / longer.length;
  
  // Determine confidence level and match status
  let confidence: 'exact' | 'high' | 'medium' | 'low' | 'none';
  let isMatch: boolean;
  
  if (similarity >= 0.9) {
    confidence = 'high';
    isMatch = true;
  } else if (similarity >= 0.8) {
    confidence = 'medium';
    isMatch = true;
  } else if (similarity >= 0.7) {
    confidence = 'low';
    isMatch = true;
  } else {
    confidence = 'none';
    isMatch = false;
  }
  
  return {
    similarity,
    isMatch,
    confidence
  };
}

/**
 * Check if two names are likely the same person using fuzzy matching
 * Uses multiple algorithms for better accuracy
 */
export function areNamesSimilar(name1: string | null | undefined, name2: string | null | undefined, threshold = 0.8): boolean {
  const result = calculateNameSimilarity(name1, name2);
  return result.similarity >= threshold;
}

/**
 * Find the best matching name from a list of candidates
 * Returns the best match and its similarity score
 */
export function findBestNameMatch(
  targetName: string, 
  candidates: string[], 
  minThreshold = 0.7
): { name: string; similarity: number; index: number } | null {
  let bestMatch: { name: string; similarity: number; index: number } | null = null;
  
  candidates.forEach((candidate, index) => {
    const result = calculateNameSimilarity(targetName, candidate);
    
    if (result.similarity >= minThreshold && 
        (!bestMatch || result.similarity > bestMatch.similarity)) {
      bestMatch = {
        name: candidate,
        similarity: result.similarity,
        index
      };
    }
  });
  
  return bestMatch;
}

/**
 * Extract name components (first, middle, last)
 * Splits name into components for more sophisticated matching
 */
export function extractNameComponents(name: string | null | undefined): {
  first: string;
  middle: string[];
  last: string;
  full: string;
} {
  const normalized = normalizeName(name);
  
  if (!normalized) {
    return { first: '', middle: [], last: '', full: '' };
  }
  
  const parts = normalized.split(' ').filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return { first: '', middle: [], last: '', full: normalized };
  } else if (parts.length === 1) {
    return { first: parts[0], middle: [], last: '', full: normalized };
  } else if (parts.length === 2) {
    return { first: parts[0], middle: [], last: parts[1], full: normalized };
  } else {
    return {
      first: parts[0],
      middle: parts.slice(1, -1),
      last: parts[parts.length - 1],
      full: normalized
    };
  }
}

/**
 * Advanced name matching using component-based comparison
 * Compares first and last names separately for better accuracy
 */
export function calculateAdvancedNameSimilarity(
  name1: string | null | undefined, 
  name2: string | null | undefined
): NameSimilarityResult {
  const components1 = extractNameComponents(name1);
  const components2 = extractNameComponents(name2);
  
  // If either name is empty, return no match
  if (!components1.full || !components2.full) {
    return {
      similarity: 0,
      isMatch: false,
      confidence: 'none'
    };
  }
  
  // Exact match on full name
  if (components1.full === components2.full) {
    return {
      similarity: 1.0,
      isMatch: true,
      confidence: 'exact'
    };
  }
  
  // Calculate similarity for different components
  const firstNameSim = calculateNameSimilarity(components1.first, components2.first);
  const lastNameSim = calculateNameSimilarity(components1.last, components2.last);
  const fullNameSim = calculateNameSimilarity(components1.full, components2.full);
  
  // Weight the similarities (first and last names are more important)
  let weightedSimilarity: number;
  
  if (components1.last && components2.last) {
    // Both have last names - weight first and last names heavily
    weightedSimilarity = (firstNameSim.similarity * 0.4) + 
                        (lastNameSim.similarity * 0.4) + 
                        (fullNameSim.similarity * 0.2);
  } else {
    // One or both don't have last names - rely more on full name similarity
    weightedSimilarity = (firstNameSim.similarity * 0.3) + 
                        (fullNameSim.similarity * 0.7);
  }
  
  // Determine confidence and match status
  let confidence: 'exact' | 'high' | 'medium' | 'low' | 'none';
  let isMatch: boolean;
  
  if (weightedSimilarity >= 0.95) {
    confidence = 'high';
    isMatch = true;
  } else if (weightedSimilarity >= 0.85) {
    confidence = 'medium';
    isMatch = true;
  } else if (weightedSimilarity >= 0.75) {
    confidence = 'low';
    isMatch = true;
  } else {
    confidence = 'none';
    isMatch = false;
  }
  
  return {
    similarity: weightedSimilarity,
    isMatch,
    confidence
  };
}

/**
 * Generate name variations for matching
 * Creates common variations of a name for broader matching
 */
export function generateNameVariations(name: string | null | undefined): string[] {
  const normalized = normalizeName(name);
  if (!normalized) return [];
  
  const variations = new Set<string>();
  variations.add(normalized);
  
  const components = extractNameComponents(normalized);
  
  // Add component combinations
  if (components.first) {
    variations.add(components.first);
  }
  
  if (components.last) {
    variations.add(components.last);
  }
  
  if (components.first && components.last) {
    variations.add(`${components.first} ${components.last}`);
    variations.add(`${components.last} ${components.first}`);
  }
  
  // Add initials variations
  if (components.first && components.last) {
    variations.add(`${components.first.charAt(0)} ${components.last}`);
    variations.add(`${components.first} ${components.last.charAt(0)}`);
  }
  
  return Array.from(variations);
}

/**
 * Batch name similarity calculation
 * Calculates similarity between one name and multiple candidates
 */
export function batchCalculateNameSimilarity(
  targetName: string, 
  candidates: string[]
): NameSimilarityResult[] {
  return candidates.map(candidate => calculateNameSimilarity(targetName, candidate));
}

/**
 * Clean and standardize name format
 * Applies consistent formatting rules to names
 */
export function standardizeName(name: string | null | undefined): string {
  if (!name) return '';
  
  const normalized = normalizeName(name);
  
  // Capitalize first letter of each word
  return normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate name format
 * Checks if name meets basic requirements
 */
export function validateName(name: string | null | undefined): { isValid: boolean; message?: string } {
  if (!name || !name.toString().trim()) {
    return { isValid: false, message: 'Name is required' };
  }
  
  const trimmed = name.toString().trim();
  
  if (trimmed.length < 2) {
    return { isValid: false, message: 'Name must be at least 2 characters long' };
  }
  
  if (trimmed.length > 100) {
    return { isValid: false, message: 'Name cannot exceed 100 characters' };
  }
  
  // Check for valid characters (letters, spaces, common punctuation)
  if (!/^[a-zA-Z\s\.\-']+$/.test(trimmed)) {
    return { isValid: false, message: 'Name can only contain letters, spaces, dots, hyphens, and apostrophes' };
  }
  
  return { isValid: true };
}