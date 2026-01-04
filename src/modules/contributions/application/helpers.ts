// Application: Contribution Helpers
// Helper functions for contribution cycle workflows

import prisma from '@/shared/infrastructure/prisma/prismaClient';

/**
 * Generate unique contribution cycle number in format: CC-YYYY-NNNNN
 * Example: CC-2026-00001
 */
export async function generateCycleNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CC-${currentYear}-`;

  // Find the latest cycle number for current year
  const latestCycle = await prisma.contributionCycle.findFirst({
    where: {
      cycleNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      cycleNumber: 'desc',
    },
    select: {
      cycleNumber: true,
    },
  });

  let nextNumber = 1;
  if (latestCycle) {
    // Extract number from CC-YYYY-NNNNN
    const parts = latestCycle.cycleNumber.split('-');
    if (parts.length === 3) {
      const lastNumber = parseInt(parts[2], 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
  }

  // Pad with zeros to 5 digits
  const paddedNumber = nextNumber.toString().padStart(5, '0');
  return `${prefix}${paddedNumber}`;
}
