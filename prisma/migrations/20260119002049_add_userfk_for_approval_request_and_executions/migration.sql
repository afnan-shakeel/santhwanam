-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStageExecution" ADD CONSTRAINT "ApprovalStageExecution_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
