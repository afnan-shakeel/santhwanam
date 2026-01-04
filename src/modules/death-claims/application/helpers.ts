// Helper functions for death claims module

import { DeathClaimRepository } from '../domain/repositories';

/**
 * Generates a unique death claim number in format: DC-YYYY-NNNNN
 * Example: DC-2026-00001
 */
export async function generateClaimNumber(
  deathClaimRepository: DeathClaimRepository,
  tx?: any
): Promise<string> {
  const year = new Date().getFullYear();

  const lastClaimNumber = await deathClaimRepository.getLastClaimNumberByYear(year, tx);

  let sequence = 1;
  if (lastClaimNumber) {
    const parts = lastClaimNumber.split('-');
    sequence = parseInt(parts[2]) + 1;
  }

  return `DC-${year}-${sequence.toString().padStart(5, '0')}`;
}
