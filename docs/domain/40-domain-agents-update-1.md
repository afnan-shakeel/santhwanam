# Agent Profile Enhancements - UI & API Specification

## Overview

Enhancements to the Agent Profile page to support:
1. **Pending Contributions Tab** - View and collect pending member contributions
2. **Low Wallet Balance Tab** - View members with low balance and alert them
3. **Members Tab Enhancements** - Add pending contribution count and wallet balance columns

---

## Tab Structure

**Updated Tab Order:**

```
Overview | Members | Pending Contributions | Low Balance | Cash Custody | Activity
                          (new)                (new)
```

---

# Part 1: Pending Contributions Tab

## Purpose

Allow agents to view all pending contributions from their members across active cycles and quickly navigate to collect them.

---

## Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│ Dawood M Ali                                                │
│ AG-2026-00001 → Unit One → Area One → Forum 001            │
├─────────────────────────────────────────────────────────────┤
│ Overview | Members | Pending Contributions | Low Balance |...│
│                            ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ 📋 Pending      │  │ 💰 Total        │                  │
│  │    Collections  │  │    Amount       │                  │
│  │                 │  │                 │                  │
│  │       12        │  │    ₹1,200       │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  Cycle: [All Active Cycles ▾]       🔍 Search members...    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ MEMBER              │ CYCLE        │ AMOUNT │ DUE DATE│  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ SD  Sixth of Dawood │ CC-2026-0001 │  ₹100  │ 22 Jan  │  │
│  │     MEM-2026-00030  │              │        │ (3 days)│  │
│  │                     │              │        │ [Collect]│  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ JD  John Doe        │ CC-2026-0001 │  ₹100  │ 22 Jan  │  │
│  │     MEM-2026-00025  │              │        │ (3 days)│  │
│  │                     │              │        │ [Collect]│  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ AB  Alice Brown     │ CC-2026-0001 │  ₹100  │ 22 Jan  │  │
│  │     MEM-2026-00028  │ ⚠️ Wallet Low │        │ (3 days)│  │
│  │                     │              │        │ [Collect]│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Showing 1-10 of 12                        [1] [2] [>]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Stats Cards

| Card | Value | Description |
|------|-------|-------------|
| Pending Collections | Count | Total pending contributions |
| Total Amount | Sum | Total amount to be collected |

---

## Table Columns

| Column | Description |
|--------|-------------|
| Member | Avatar + Name + Member Code |
| Cycle | Cycle code + optional warning if wallet insufficient |
| Amount | Contribution amount |
| Due Date | Due date + days remaining |
| Action | [Collect] button |

---

## Actions

### [Collect] Button

Navigates to the member's contribution page:
```
/members/:memberId/profile/contributions
```

---

## Filters

| Filter | Type | Options |
|--------|------|---------|
| Cycle | Dropdown | All Active Cycles, or specific cycle |
| Search | Text | Search by member name or code |

---

## Empty State

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                    ✅                                │
│                                                      │
│           No Pending Contributions                   │
│                                                      │
│     All your members are up to date with their      │
│     contribution payments.                           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

# Part 2: Low Wallet Balance Tab

## Purpose

Allow agents to view members with wallet balance below the minimum threshold and send them alerts to top up.

---

## Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│ Dawood M Ali                                                │
│ AG-2026-00001 → Unit One → Area One → Forum 001            │
├─────────────────────────────────────────────────────────────┤
│ Overview | Members | Pending Contributions | Low Balance |...│
│                                               ▔▔▔▔▔▔▔▔▔▔    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ 5 members have wallet balance below ₹200               │
│                                                             │
│  🔍 Search members...                                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ MEMBER              │ WALLET    │ STATUS  │          │  │
│  │                     │ BALANCE   │         │          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ AB  Alice Brown     │    ₹0     │ Active  │ [Alert]  │  │
│  │     MEM-2026-00028  │  🔴 Empty │         │          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ SD  Sixth of Dawood │   ₹50     │ Active  │ [Alert]  │  │
│  │     MEM-2026-00030  │  ⚠️ Low   │         │          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ JD  John Doe        │  ₹120     │ Active  │ [Alert]  │  │
│  │     MEM-2026-00025  │  ⚠️ Low   │         │          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ MJ  Mary Johnson    │  ₹180     │ Active  │ [Alert]  │  │
│  │     MEM-2026-00022  │  ⚠️ Low   │         │          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Showing 1-5 of 5                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Header Alert Banner

Shows the count and threshold:
```
⚠️ {count} members have wallet balance below ₹{threshold}
```

The threshold value comes from the `min_wallet_balance` system configuration.

---

## Table Columns

| Column | Description |
|--------|-------------|
| Member | Avatar + Name + Member Code |
| Wallet Balance | Amount + indicator (🔴 Empty / ⚠️ Low) |
| Status | Member status (Active/Suspended) |
| Action | [Alert] button |

---

## Balance Indicators

| Balance | Indicator | Color |
|---------|-----------|-------|
| 0 | 🔴 Empty | Red |
| 1 to threshold-1 | ⚠️ Low | Orange/Yellow |

---

## Actions

### [Alert] Button

1. Click [Alert]
2. Show confirmation modal:

```
┌─────────────────────────────────────────────────────────────┐
│ Send Low Balance Alert                                  ✕   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ℹ️  Send a low balance notification to this member?       │
│                                                             │
│      Member: Sixth of Dawood (MEM-2026-00030)              │
│      Current Balance: ₹50                                   │
│      Minimum Required: ₹200                                 │
│                                                             │
│      The member will be notified via SMS/Email to top up   │
│      their wallet.                                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                   [Cancel]    [Send Alert]  │
└─────────────────────────────────────────────────────────────┘
```

3. On confirm → Call API (dummy for now) → Show success toast

**Success Toast:**
```
✅ Alert sent to Sixth of Dawood
```

---

## Empty State

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                    ✅                                │
│                                                      │
│           All Members Have Sufficient Balance        │
│                                                      │
│     None of your members have wallet balance        │
│     below the minimum threshold of ₹200.            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

# Part 3: Members Tab Enhancements

## Current State

The Members tab shows: Member, Contact, Tier, Status, Registered, Action

## Enhanced State

Add two new columns:
- **Pending Contrib** - Count of pending contributions
- **Wallet** - Wallet balance with indicator

---

## Updated Wireframe

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Members  6                                                                     │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                            │
│  │ Total       │  │ Active      │  │ Suspended   │                            │
│  │ Members     │  │             │  │             │                            │
│  │      6      │  │      2      │  │      0      │                            │
│  └─────────────┘  └─────────────┘  └─────────────┘                            │
│                                                                                │
│  Members                           🔍 Search members...    Status: [All ▾]    │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ MEMBER          │ CONTACT       │ TIER  │ STATUS  │PENDING│ WALLET │     │ │
│  │                 │               │       │         │CONTRIB│        │     │ │
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │ SD Sixth of...  │ 27364736727   │ Basic │ Active  │   2   │  ₹50 ⚠️│ View│ │
│  │    MEM-2026-... │ sixth.dawood@ │       │         │       │        │     │ │
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │ FD Fifth of...  │ 7362736767    │ Basic │ Deceased│   0   │  ₹500  │ View│ │
│  │    MEM-2026-... │ fifth.dawood@ │       │         │       │        │     │ │
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │ FD Fourth of... │ 23878782738   │ Basic │ Deceased│   0   │   ₹0 🔴│ View│ │
│  │    MEM-2026-... │ fourth.dawood@│       │         │       │        │     │ │
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │ TD Third of...  │ 9876543210    │ Basic │ Active  │   1   │  ₹2,500│ View│ │
│  │    MEM-2026-... │ third.dawood@ │       │         │       │        │     │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## New Columns

### Pending Contrib Column

| Value | Display |
|-------|---------|
| 0 | `0` (plain text, gray) |
| 1+ | `{count}` (bold, could be clickable to filter Pending Contributions tab) |

### Wallet Column

| Balance | Display |
|---------|---------|
| 0 | `₹0 🔴` |
| 1 to threshold-1 | `₹{amount} ⚠️` |
| threshold+ | `₹{amount}` (no indicator) |

---

# Part 4: API Requirements

## New Endpoints

### 1. GET /api/system-config/:key

Get a single system configuration value.

**Request:**
```
GET /api/system-config/min_wallet_balance
```

**Response:**
```json
{
  "key": "min_wallet_balance",
  "value": "200",
  "dataType": "number"
}
```

**Use Case:** Frontend fetches the minimum wallet balance threshold on load.

---

### 2. GET /api/agents/:agentId/contributions/pending

Get pending contributions for an agent's members.

**Request:**
```
GET /api/agents/:agentId/contributions/pending?cycleId={optional}&search={optional}&page=1&limit=20
```

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| cycleId | UUID (optional) | Filter by specific cycle |
| search | string (optional) | Search by member name or code |
| page | integer | Page number (default: 1) |
| limit | integer | Items per page (default: 20) |

**Response:**
```json
{
  "summary": {
    "totalPending": 12,
    "totalAmount": 1200
  },
  "activeCycles": [
    {
      "cycleId": "uuid",
      "cycleCode": "CC-2026-0001",
      "dueDate": "2026-01-22"
    }
  ],
  "items": [
    {
      "contributionId": "uuid",
      "member": {
        "memberId": "uuid",
        "memberCode": "MEM-2026-00030",
        "firstName": "Sixth of",
        "lastName": "Dawood",
        "walletBalance": 50,
        "isLowBalance": true
      },
      "cycle": {
        "cycleId": "uuid",
        "cycleCode": "CC-2026-0001",
        "dueDate": "2026-01-22",
        "daysRemaining": 3
      },
      "amount": 100,
      "status": "Pending"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 12,
    "totalPages": 1
  }
}
```

---

### 3. GET /api/agents/:agentId/members/low-balance

Get members with low wallet balance for an agent.

**Request:**
```
GET /api/agents/:agentId/members/low-balance?threshold=200&search={optional}&page=1&limit=20
```

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| threshold | number | Balance threshold (from system config) |
| search | string (optional) | Search by member name or code |
| page | integer | Page number (default: 1) |
| limit | integer | Items per page (default: 20) |

**Response:**
```json
{
  "threshold": 200,
  "totalCount": 5,
  "items": [
    {
      "memberId": "uuid",
      "memberCode": "MEM-2026-00028",
      "firstName": "Alice",
      "lastName": "Brown",
      "contactNumber": "9876543210",
      "email": "alice@mail.com",
      "memberStatus": "Active",
      "walletBalance": 0,
      "balanceIndicator": "empty"
    },
    {
      "memberId": "uuid",
      "memberCode": "MEM-2026-00030",
      "firstName": "Sixth of",
      "lastName": "Dawood",
      "contactNumber": "27364736727",
      "email": "sixth.dawood@mail.com",
      "memberStatus": "Active",
      "walletBalance": 50,
      "balanceIndicator": "low"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 5,
    "totalPages": 1
  }
}
```

**balanceIndicator values:**
- `"empty"` - Balance is 0
- `"low"` - Balance is between 1 and threshold-1

---

### 4. Enhance GET /api/agents/:agentId/members

Add wallet information to existing response.

**Current Response Item:**
```json
{
  "memberId": "uuid",
  "memberCode": "MEM-2026-00029",
  "firstName": "Fifth of",
  "lastName": "Dawood",
  "contactNumber": "7362736767",
  "email": "fifth.dawood@mail.com",
  "memberStatus": "Deceased",
  "registrationStatus": "Approved",
  "tier": { ... },
  "createdAt": "...",
  "registeredAt": "...",
  "contributions": {
    "count": {
      "pending": 0
    }
  }
}
```

**Enhanced Response Item:**
```json
{
  "memberId": "uuid",
  "memberCode": "MEM-2026-00029",
  "firstName": "Fifth of",
  "lastName": "Dawood",
  "contactNumber": "7362736767",
  "email": "fifth.dawood@mail.com",
  "memberStatus": "Deceased",
  "registrationStatus": "Approved",
  "tier": { ... },
  "createdAt": "...",
  "registeredAt": "...",
  "contributions": {
    "count": {
      "pending": 0
    }
  },
  "wallet": {
    "balance": 500,
    "isLowBalance": false
  }
}
```

**New Fields:**

| Field | Type | Description |
|-------|------|-------------|
| wallet.balance | number | Current wallet balance |
| wallet.isLowBalance | boolean | true if balance < threshold |

**Note:** The threshold for `isLowBalance` should be fetched from system config (`min_wallet_balance`).

---

### 5. POST /api/members/:memberId/notify (Placeholder)

Send notification to member. This is a placeholder for future implementation.

**Request:**
```
POST /api/members/:memberId/notify
Content-Type: application/json

{
  "type": "low_balance_alert",
  "channel": "sms_email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification queued for delivery"
}
```

**Current Implementation:** Return success without actually sending anything. Log the request for future implementation.

---

## System Configuration Seed Data

Add the following configuration:

```typescript
{
  key: 'min_wallet_balance',
  value: '200',
  description: 'Minimum wallet balance threshold for low balance alerts',
  dataType: 'number'
}
```

---

# Part 5: Component Architecture

## File Structure

```
src/app/features/agents/
├── agent-profile/
│   ├── agent-profile.component.ts
│   ├── agent-profile.component.html
│   └── tabs/
│       ├── overview-tab/
│       ├── members-tab/
│       │   └── members-tab.component.ts  (enhanced)
│       ├── pending-contributions-tab/    (new)
│       │   ├── pending-contributions-tab.component.ts
│       │   └── pending-contributions-tab.component.html
│       ├── low-balance-tab/              (new)
│       │   ├── low-balance-tab.component.ts
│       │   └── low-balance-tab.component.html
│       ├── cash-custody-tab/
│       └── activity-tab/
```

---

## Pending Contributions Tab Component

```typescript
@Component({
  selector: 'app-pending-contributions-tab',
  templateUrl: './pending-contributions-tab.component.html',
  standalone: true,
  imports: [CommonModule, DatatableComponent, StatsCardComponent]
})
export class PendingContributionsTabComponent implements OnInit {
  private agentService = inject(AgentService);
  private router = inject(Router);

  // Inputs
  agentId = input.required<string>();

  // State
  loading = signal(true);
  summary = signal<{ totalPending: number; totalAmount: number }>({ totalPending: 0, totalAmount: 0 });
  activeCycles = signal<Cycle[]>([]);
  contributions = signal<PendingContribution[]>([]);
  pagination = signal<Pagination>({ page: 1, limit: 20, totalItems: 0, totalPages: 0 });

  // Filters
  selectedCycleId = signal<string | null>(null);
  searchTerm = signal('');

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await this.agentService.getPendingContributions(
        this.agentId(),
        {
          cycleId: this.selectedCycleId(),
          search: this.searchTerm(),
          page: this.pagination().page,
          limit: this.pagination().limit
        }
      );
      this.summary.set(response.summary);
      this.activeCycles.set(response.activeCycles);
      this.contributions.set(response.items);
      this.pagination.set(response.pagination);
    } finally {
      this.loading.set(false);
    }
  }

  onCollect(contribution: PendingContribution): void {
    this.router.navigate(['/members', contribution.member.memberId, 'profile', 'contributions']);
  }

  onCycleFilterChange(cycleId: string | null): void {
    this.selectedCycleId.set(cycleId);
    this.loadData();
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.loadData();
  }
}
```

---

## Low Balance Tab Component

```typescript
@Component({
  selector: 'app-low-balance-tab',
  templateUrl: './low-balance-tab.component.html',
  standalone: true,
  imports: [CommonModule, DatatableComponent, ConfirmationModalComponent]
})
export class LowBalanceTabComponent implements OnInit {
  private agentService = inject(AgentService);
  private systemConfigService = inject(SystemConfigService);
  private confirmationService = inject(ConfirmationService);
  private toastService = inject(ToastService);

  // Inputs
  agentId = input.required<string>();

  // State
  loading = signal(true);
  threshold = signal(200);
  members = signal<LowBalanceMember[]>([]);
  totalCount = signal(0);
  pagination = signal<Pagination>({ page: 1, limit: 20, totalItems: 0, totalPages: 0 });

  // Filters
  searchTerm = signal('');

  async ngOnInit(): Promise<void> {
    // Load threshold from system config
    const config = await this.systemConfigService.get('min_wallet_balance');
    if (config) {
      this.threshold.set(Number(config.value));
    }
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await this.agentService.getLowBalanceMembers(
        this.agentId(),
        {
          threshold: this.threshold(),
          search: this.searchTerm(),
          page: this.pagination().page,
          limit: this.pagination().limit
        }
      );
      this.members.set(response.items);
      this.totalCount.set(response.totalCount);
      this.pagination.set(response.pagination);
    } finally {
      this.loading.set(false);
    }
  }

  async onAlert(member: LowBalanceMember): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Send Low Balance Alert',
      message: `Send a low balance notification to this member?`,
      description: `Member: ${member.firstName} ${member.lastName} (${member.memberCode})\nCurrent Balance: ₹${member.walletBalance}\nMinimum Required: ₹${this.threshold()}\n\nThe member will be notified via SMS/Email to top up their wallet.`,
      variant: 'info',
      confirmText: 'Send Alert'
    });

    if (confirmed) {
      try {
        await this.agentService.notifyMember(member.memberId, {
          type: 'low_balance_alert',
          channel: 'sms_email'
        });
        this.toastService.success(`Alert sent to ${member.firstName} ${member.lastName}`);
      } catch (error) {
        this.toastService.error('Failed to send alert. Please try again.');
      }
    }
  }
}
```

---

## Service Methods

```typescript
// agent.service.ts

@Injectable({ providedIn: 'root' })
export class AgentService {
  private http = inject(HttpClient);

  // Existing methods...

  /**
   * Get pending contributions for agent's members
   */
  getPendingContributions(
    agentId: string,
    params: {
      cycleId?: string | null;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Observable<PendingContributionsResponse> {
    return this.http.get<PendingContributionsResponse>(
      `/api/agents/${agentId}/contributions/pending`,
      { params: this.buildParams(params) }
    );
  }

  /**
   * Get low balance members for agent
   */
  getLowBalanceMembers(
    agentId: string,
    params: {
      threshold: number;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Observable<LowBalanceMembersResponse> {
    return this.http.get<LowBalanceMembersResponse>(
      `/api/agents/${agentId}/members/low-balance`,
      { params: this.buildParams(params) }
    );
  }

  /**
   * Send notification to member (placeholder)
   */
  notifyMember(
    memberId: string,
    payload: { type: string; channel: string }
  ): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `/api/members/${memberId}/notify`,
      payload
    );
  }

  private buildParams(params: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }
}
```

---

## System Config Service

```typescript
// system-config.service.ts

@Injectable({ providedIn: 'root' })
export class SystemConfigService {
  private http = inject(HttpClient);
  private cache = new Map<string, SystemConfig>();

  /**
   * Get a system configuration by key
   */
  async get(key: string): Promise<SystemConfig | null> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    try {
      const config = await firstValueFrom(
        this.http.get<SystemConfig>(`/api/system-config/${key}`)
      );
      this.cache.set(key, config);
      return config;
    } catch (error) {
      console.error(`Failed to load system config: ${key}`, error);
      return null;
    }
  }

  /**
   * Get numeric config value with default
   */
  async getNumber(key: string, defaultValue: number): Promise<number> {
    const config = await this.get(key);
    if (config && config.dataType === 'number') {
      return Number(config.value);
    }
    return defaultValue;
  }
}

interface SystemConfig {
  key: string;
  value: string;
  dataType: string;
  description?: string;
}
```

---

# Part 6: Summary

## New Features

| Feature | Location | Description |
|---------|----------|-------------|
| Pending Contributions Tab | Agent Profile | View/collect pending member contributions |
| Low Balance Tab | Agent Profile | View low balance members, send alerts |
| Enhanced Members Tab | Agent Profile | Show pending count + wallet balance columns |

## API Changes

| # | Type | Endpoint | Description |
|---|------|----------|-------------|
| 1 | New | `GET /api/system-config/:key` | Get system configuration |
| 2 | New | `GET /api/agents/:agentId/contributions/pending` | Pending contributions |
| 3 | New | `GET /api/agents/:agentId/members/low-balance` | Low balance members |
| 4 | Enhance | `GET /api/agents/:agentId/members` | Add wallet balance fields |
| 5 | New | `POST /api/members/:memberId/notify` | Send notification (placeholder) |

## System Configuration

| Key | Value | Type | Description |
|-----|-------|------|-------------|
| min_wallet_balance | 200 | number | Minimum wallet balance threshold |

## Tab Order

```
Overview | Members | Pending Contributions | Low Balance | Cash Custody | Activity
```