-- AddForeignKey
ALTER TABLE "DeathClaim" ADD CONSTRAINT "DeathClaim_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeathClaim" ADD CONSTRAINT "DeathClaim_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
