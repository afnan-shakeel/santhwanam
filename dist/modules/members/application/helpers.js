// Helper functions for member module
/**
 * Generates a unique member code in format: MEM-YYYY-NNNNN
 * Example: MEM-2025-00001
 */
export async function generateMemberCode(memberRepository) {
    const year = new Date().getFullYear();
    const lastMemberCode = await memberRepository.getLastMemberCodeByYear(year);
    let sequence = 1;
    if (lastMemberCode) {
        const parts = lastMemberCode.split("-");
        sequence = parseInt(parts[2]) + 1;
    }
    return `MEM-${year}-${sequence.toString().padStart(5, "0")}`;
}
/**
 * Calculates age from date of birth
 */
export function calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
//# sourceMappingURL=helpers.js.map