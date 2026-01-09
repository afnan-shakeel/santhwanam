# Dev-Only Member Registration Endpoint

---

## **Purpose**

Single endpoint to bypass the multi-step registration workflow and create fully approved members instantly for development/testing.

---

## **Endpoint Specification**

```
POST /api/dev/members/quick-register
```

### **Important Security Measures:**

```typescript
// CRITICAL: Only enable in development
if (process.env.NODE_ENV === 'production') {
  throw new Error('Dev endpoint not available in production');
}

// OR: Require special dev token
if (req.headers['x-dev-token'] !== process.env.DEV_SECRET_TOKEN) {
  throw new UnauthorizedException('Invalid dev token');
}
```

---

## **Request Body Structure**

```typescript
{
  // Personal Information (Required)
  fullName: string;
  dateOfBirth: string; // "1990-01-15"
  gender: "Male" | "Female" | "Other";
  phone: string;
  email: string;
  
  // Address (Required)
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  state: string;
  country: string;
  
  // Membership (Required)
  tierId: string; // UUID or will use default Tier A
  agentId: string; // UUID or will assign to default agent
  unitId?: string; // Optional, will get from agent if not provided
  
  // Registration Payment (Optional - will use defaults)
  registrationFee?: number; // Default: 500
  advanceDeposit?: number; // Default: 1000
  paymentMethod?: string; // Default: "Cash"
  collectionDate?: string; // Default: now
  
  // Nominees (Optional - can add 1-3)
  nominees?: [
    {
      fullName: string;
      relationship: string;
      phone: string;
      dateOfBirth: string;
      addressLine1: string;
      addressLine2: string;
      postalCode: string;
      state: string;
      country: string;
    }
  ];
  
  // Control flags
  autoApprove?: boolean; // Default: true (skip approval workflow)
  createWallet?: boolean; // Default: true
  skipDocuments?: boolean; // Default: true (for dev)
}
```

---

## **Implementation**

```typescript
// controllers/DevController.ts

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { DevMemberRegistrationDto } from './dtos/dev-member-registration.dto';
import { DevGuard } from '../guards/dev.guard';

@Controller('dev')
@UseGuards(DevGuard) // Ensures only dev environment
export class DevController {
  constructor(
    private readonly memberService: MemberService,
    private readonly walletService: WalletService,
    private readonly nomineeService: NomineeService,
    private readonly accountingService: AccountingService,
  ) {}

  @Post('members/quick-register')
  async quickRegisterMember(@Body() dto: DevMemberRegistrationDto) {
    // Validate environment
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Dev endpoints not available in production');
    }

    return await this.createMemberQuickly(dto);
  }

  private async createMemberQuickly(dto: DevMemberRegistrationDto) {
    // Start transaction
    return await this.db.transaction(async (trx) => {
      
      // 1. Generate member code
      const memberCode = await this.generateMemberCode(trx);
      
      // 2. Get tier (use provided or default to Tier A)
      let tierId = dto.tierId;
      if (!tierId) {
        const defaultTier = await trx.tiers.findFirst({
          where: { tierName: 'Tier A' }
        });
        tierId = defaultTier.tierId;
      }
      
      // 3. Get agent and hierarchy
      let agentId = dto.agentId;
      let unitId = dto.unitId;
      let areaId, forumId;
      
      if (!agentId) {
        // Get first available agent
        const defaultAgent = await trx.agents.findFirst({
          where: { agentStatus: 'Active' },
          include: { unit: { include: { area: { include: { forum: true } } } } }
        });
        agentId = defaultAgent.agentId;
        unitId = defaultAgent.unitId;
        areaId = defaultAgent.unit.areaId;
        forumId = defaultAgent.unit.area.forumId;
      } else {
        // Get hierarchy from agent
        const agent = await trx.agents.findUnique({
          where: { agentId },
          include: { unit: { include: { area: { include: { forum: true } } } } }
        });
        unitId = agent.unitId;
        areaId = agent.unit.areaId;
        forumId = agent.unit.area.forumId;
      }
      
      // 4. Create member
      const member = await trx.members.create({
        data: {
          memberId: generateUUID(),
          memberCode,
          fullName: dto.fullName,
          dateOfBirth: new Date(dto.dateOfBirth),
          gender: dto.gender,
          idNumber: dto.idNumber,
          phone: dto.phone,
          email: dto.email,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          postalCode: dto.postalCode,
          state: dto.state,
          country: dto.country,
          
          memberStatus: dto.autoApprove !== false ? 'Active' : 'PendingApproval',
          registrationStatus: dto.autoApprove !== false ? 'Approved' : 'Pending',
          registrationDate: new Date(),
          
          tierId,
          agentId,
          unitId,
          areaId,
          forumId,
          
          createdAt: new Date(),
          createdBy: 'dev-script' // Mark as dev created
        }
      });
      
      // 5. Create registration payment
      const registrationFee = dto.registrationFee ?? 500;
      const advanceDeposit = dto.advanceDeposit ?? 1000;
      
      await trx.registrationPayments.create({
        data: {
          paymentId: generateUUID(),
          memberId: member.memberId,
          registrationFee,
          advanceDeposit,
          totalAmount: registrationFee + advanceDeposit,
          paymentMethod: dto.paymentMethod ?? 'Cash',
          collectionDate: dto.collectionDate ? new Date(dto.collectionDate) : new Date(),
          collectedBy: agentId,
          paymentStatus: dto.autoApprove !== false ? 'Approved' : 'Pending',
          approvedBy: dto.autoApprove !== false ? 'dev-script' : null,
          approvedAt: dto.autoApprove !== false ? new Date() : null,
          createdAt: new Date()
        }
      });
      
      // 6. Create wallet
      let wallet = null;
      if (dto.createWallet !== false) {
        wallet = await trx.wallets.create({
          data: {
            walletId: generateUUID(),
            memberId: member.memberId,
            currentBalance: advanceDeposit,
            createdAt: new Date()
          }
        });
        
        // Create initial wallet transaction
        await trx.walletTransactions.create({
          data: {
            transactionId: generateUUID(),
            walletId: wallet.walletId,
            transactionType: 'Deposit',
            amount: advanceDeposit,
            balanceAfter: advanceDeposit,
            description: 'Initial advance deposit',
            transactionDate: new Date(),
            createdAt: new Date()
          }
        });
      }
      
      // 7. Create accounting entries
      if (dto.autoApprove !== false) {
        await this.accountingService.recordRegistrationPayment(
          trx,
          {
            amount: registrationFee + advanceDeposit,
            registrationFee,
            advanceDeposit,
            memberId: member.memberId,
            date: new Date()
          }
        );
      }
      
      // 8. Create nominees
      const createdNominees = [];
      if (dto.nominees && dto.nominees.length > 0) {
        
        for (let i = 0; i < dto.nominees.length; i++) {
          const nomineeData = dto.nominees[i];
          
          const nominee = await trx.nominees.create({
            data: {
              nomineeId: generateUUID(),
              memberId: member.memberId,
              fullName: nomineeData.fullName,
              relationship: nomineeData.relationship,
              phone: nomineeData.phone,
              dateOfBirth: new Date(nomineeData.dateOfBirth),
              addressLine1: nomineeData.addressLine1,
              addressLine2: nomineeData.addressLine2,
              postalCode: nomineeData.postalCode,
              state: nomineeData.state,
              country: nomineeData.country,
              createdAt: new Date()
            }
          });
          
          createdNominees.push(nominee);
        }
      }
      
      // 9. Return complete member data
      return {
        success: true,
        message: 'Member created successfully (dev mode)',
        data: {
          member: {
            memberId: member.memberId,
            memberCode: member.memberCode,
            fullName: member.fullName,
            memberStatus: member.memberStatus,
            registrationStatus: member.registrationStatus
          },
          wallet: wallet ? {
            walletId: wallet.walletId,
            balance: wallet.currentBalance
          } : null,
          nominees: createdNominees.map(n => ({
            nomineeId: n.nomineeId,
            fullName: n.fullName,
          })),
          registrationPayment: {
            registrationFee,
            advanceDeposit,
            totalAmount: registrationFee + advanceDeposit,
            status: dto.autoApprove !== false ? 'Approved' : 'Pending'
          }
        }
      };
    });
  }
  
  private async generateMemberCode(trx: any): Promise<string> {
    const year = new Date().getFullYear();
    const count = await trx.members.count({
      where: {
        memberCode: {
          startsWith: `MEM-${year}-`
        }
      }
    });
    
    const sequence = String(count + 1).padStart(5, '0');
    return `MEM-${year}-${sequence}`;
  }
}
```

---

## **DTO Validation**

```typescript
// dtos/dev-member-registration.dto.ts

import { IsString, IsEmail, IsOptional, IsArray, ValidateNested, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class DevNomineeDto {
  @IsString()
  fullName: string;

  @IsString()
  relationship: string;

  @IsString()
  phone: string;

  @IsString()
  dateOfBirth: string;

  @IsString()
  addressLine1: string;

  @IsString()
  addressLine2: string;

  @IsString()
  postalCode: string;

  @IsString()
  state: string;

  @IsString()
  country: string;

}

export class DevMemberRegistrationDto {
  @IsString()
  fullName: string;

  @IsString()
  dateOfBirth: string;

  @IsString()
  gender: string;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  addressLine1: string;

  @IsString()
  addressLine2: string;

  @IsString()
  postalCode: string;

  @IsString()
  state: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  tierId?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsNumber()
  registrationFee?: number;

  @IsOptional()
  @IsNumber()
  advanceDeposit?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  collectionDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DevNomineeDto)
  nominees?: DevNomineeDto[];

  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;

  @IsOptional()
  @IsBoolean()
  createWallet?: boolean;

  @IsOptional()
  @IsBoolean()
  skipDocuments?: boolean;
}
```

---

## **Example Usage**


### **Request:**

```bash
curl -X POST http://localhost:3000/api/dev/members/quick-register \
  -H "Content-Type: application/json" \
  -H "x-dev-token: your-dev-secret-token" \
  -d '{
    "fullName": "Jane Smith",
    "dateOfBirth": "1985-03-20",
    "gender": "Female",
    "phone": "+968 9876 5432",
    "email": "jane.smith@example.com",
    "addressLine1": "Building 10, Apt 5",
    "addressLine2": "Al Khuwair",
    "postalCode": "133",
    "state": "Muscat",
    "country": "Oman",
    "tierId": "tier-uuid-here",
    "agentId": "agent-uuid-here",
    "registrationFee": 500,
    "advanceDeposit": 1000,
    "paymentMethod": "Cash",
    "autoApprove": true,
    "createWallet": true,
    "nominees": [
      {
        "fullName": "Bob Smith",
        "relationship": "Spouse",
        "phone": "+968 9111 2222",
        "dateOfBirth": "1987-05-10",
        "addressLine1": "Building 10, Apt 5",
        "addressLine2": "Al Khuwair",
        "postalCode": "133",
        "state": "Muscat",
        "country": "Oman",
      },
      {
        "fullName": "Sarah Smith",
        "relationship": "Daughter",
        "phone": "+968 9333 4444",
        "dateOfBirth": "2010-08-15",
        "addressLine1": "Building 10, Apt 5",
        "addressLine2": "Al Khuwair",
        "postalCode": "133",
        "state": "Muscat",
        "country": "Oman",
      }
    ]
  }'
```

---

## **Response**

```json
{
  "success": true,
  "message": "Member created successfully (dev mode)",
  "data": {
    "member": {
      "memberId": "uuid-here",
      "memberCode": "MEM-2025-00123",
      "fullName": "Jane Smith",
      "memberStatus": "Active",
      "registrationStatus": "Approved"
    },
    "wallet": {
      "walletId": "uuid-here",
      "balance": 1000
    },
    "nominees": [
      {
        "nomineeId": "uuid-here",
        "fullName": "Bob Smith",
      },
      {
        "nomineeId": "uuid-here",
        "fullName": "Sarah Smith",
      }
    ],
    "registrationPayment": {
      "registrationFee": 500,
      "advanceDeposit": 1000,
      "totalAmount": 1500,
      "status": "Approved"
    }
  }
}
```

---

## **Environment Configuration**

```env
# .env

NODE_ENV=development
DEV_SECRET_TOKEN=super-secret-dev-token-change-this
```

---

## **What This Does**

✅ Creates member record with status: Active
✅ Creates registration payment (approved)
✅ Creates wallet with initial balance
✅ Creates nominees (if provided)
✅ Records accounting entries
✅ Generates member code automatically
✅ Assigns to default agent/tier if not provided
✅ Bypasses all approval workflows
✅ Skips document requirements

---

## **Important Notes**

⚠️ **Security:**
- Only works in development environment
- Requires dev token
- Requires access token in request headers. this is to get created by user id.

⚠️ **Production:**
- Endpoint completely disabled in production

⚠️ **Data Integrity:**
- Still validates required fields
- Still creates proper accounting entries

---

**This gives you a single endpoint to quickly create fully-functional members for testing!** 🎯
