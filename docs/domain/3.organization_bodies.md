# Organizational Bodies — Domain Design

## Core Principles

- Hierarchical Structure: `Forum → Area → Unit`
- Admin Assignment: Each entity has one admin user assigned
- Phase 1: Structure is static (no transfers, no deactivation)

---

## Domain Model

### Entity: Forum

```js
Forum {
  forumId: UUID
  forumCode: string // Admin-defined, unique globally
  forumName: string

  // Admin assignment
  adminUserId: UUID // References users.userId (Forum Admin)

  // Metadata
  establishedDate: date

  // Timestamps
  createdAt: timestamp
  createdBy: UUID // Super Admin who created it
  updatedAt: timestamp
  updatedBy: UUID?
}
```

Business Rules:

- `forumCode` must be unique globally
- `forumCode`: alphanumeric, max 50 chars, no spaces
- `forumName`: required, max 255 chars
- `adminUserId` must reference an existing active user
- Only Super Admin can create forums
- `establishedDate` cannot be in the future

### Entity: Area

```js
Area {
  areaId: UUID
  forumId: UUID // Parent forum
  areaCode: string // Admin-defined, unique within forum
  areaName: string

  // Admin assignment
  adminUserId: UUID // References users.userId (Area Admin)

  // Metadata
  establishedDate: date

  // Timestamps
  createdAt: timestamp
  createdBy: UUID // Super Admin or Forum Admin
  updatedAt: timestamp
  updatedBy: UUID?
}
```

Business Rules:

- `areaCode` must be unique within the forum (not globally)
- `forumId` must reference an existing forum
- `adminUserId` must reference an existing active user
- Only Super Admin or Forum Admin (of parent forum) can create areas
- `establishedDate` cannot be in the future

### Entity: Unit

```js
Unit {
  unitId: UUID
  areaId: UUID // Parent area
  forumId: UUID // Denormalized from area (for quick access)
  unitCode: string // Admin-defined, unique within area
  unitName: string

  // Admin assignment
  adminUserId: UUID // References users.userId (Unit Admin)

  // Metadata
  establishedDate: date

  // Timestamps
  createdAt: timestamp
  createdBy: UUID // Super Admin, Forum Admin, or Area Admin
  updatedAt: timestamp
  updatedBy: UUID?
}
```

Business Rules:

- `unitCode` must be unique within the area (not globally)
- `areaId` must reference an existing area
- `forumId` is denormalized from area (auto-populated, not user input)
- `adminUserId` must reference an existing active user
- Only Super Admin, Forum Admin (of parent forum), or Area Admin (of parent area) can create units
- `establishedDate` cannot be in the future

---

## Commands

#### 1. CreateForum

**Triggered by:** Super Admin only

**Input:**

```json
{
  "forumCode": "string",
  "forumName": "string",
  "adminUserId": "uuid",
  "establishedDate": "date",
  "createdBy": "uuid"
}
```

**Preconditions:**

- User (`createdBy`) has Super Admin role
- `forumCode` is unique globally
- `adminUserId` references an existing active user
- `establishedDate` <= today

**Validations:**

- `forumCode`: required, alphanumeric + underscore/hyphen, 3-50 chars, no spaces
- `forumName`: required, 3-255 chars
- `adminUserId`: must exist in `users` table with `isActive = true`
- `establishedDate`: valid date format, not in future

**Backend Logic:**

```js
async function createForum(input) {
  return await db.transaction(async (trx) => {
    // 1. Check permission

    // 2. Validate forumCode is unique
    // 3. Validate admin user exists
    // 4. Create forum

    // 5. Get or create Forum Admin role

    // 6. Assign Forum Admin role to the admin user (if not already assigned)

    // 7. Emit event
    await emitEvent("ForumCreated", {
      forumId: forum.forumId,
      forumCode: forum.forumCode,
      adminUserId: forum.adminUserId,
      createdBy: input.createdBy,
    });

    return forum;
  });
}
```

**Outcome:**

- Forum created
- Forum Admin role assigned to `adminUserId`
- Event: `ForumCreated`

**Returns:**

```json
{
  "forumId": "uuid",
  "forumCode": "string",
  "forumName": "string",
  "adminUserId": "uuid",
  "establishedDate": "date"
}
```

---

#### 2. UpdateForum

**Triggered by:** Super Admin, Forum Admin (of this forum)

**Input:**

```json
{
  "forumId": "uuid",
  "forumName": "string?",
  "establishedDate": "date?",
  "updatedBy": "uuid"
}
```

Note: `forumCode` and `adminUserId` cannot be changed via update (need separate commands)

**Preconditions:**

- Forum exists
- User has permission to update forum (Super Admin OR Forum Admin of this forum)

**Validations:**

- Same as create, for fields being updated

**Backend Logic:**

```js
async function updateForum(input) {
  return await db.transaction(async (trx) => {
    // 1. Get forum

    // 2. Check permission
    // 3. Update forum

    // 4. Emit event
    await emitEvent("ForumUpdated", {
      forumId: input.forumId,
      updates,
      updatedBy: input.updatedBy,
    });

    return await db.forums.findByPk(input.forumId);
  });
}
```

**Outcome:**

- Forum details updated
- Event: `ForumUpdated`

---

#### 3. AssignForumAdmin

**Triggered by:** Super Admin only

**Input:**

```json
{
  "forumId": "uuid",
  "newAdminUserId": "uuid",
  "assignedBy": "uuid"
}
```

**Preconditions:**

- Forum exists
- `newAdminUserId` references an existing active user
- User (`assignedBy`) is Super Admin

**Backend Logic:**

```js
async function assignForumAdmin(input) {
  return await db.transaction(async (trx) => {
    // 1. Check permission
    // 2. Get forum

    // 3. Validate new admin user

    // 4. Get old admin userId
    const oldAdminUserId = forum.adminUserId;

    // 5. Update forum admin

    // 6. Get Forum Admin role

    // 7. Revoke old admin's role for this forum
    if (oldAdminUserId) {
    }
    // 8. Assign role to new admin

    // 9. Emit event
    await emitEvent("ForumAdminAssigned", {
      forumId: input.forumId,
      oldAdminUserId,
      newAdminUserId: input.newAdminUserId,
      assignedBy: input.assignedBy,
    });

    return await db.forums.findByPk(input.forumId);
  });
}
```

**Outcome:**

- `forum.adminUserId` updated
- Old admin's Forum Admin role revoked for this forum
- New admin assigned Forum Admin role for this forum
- Event: `ForumAdminAssigned`

---

#### 4. CreateArea

**Triggered by:** Super Admin, Forum Admin (of parent forum)

**Input:**

```json
{
  "forumId": "uuid",
  "areaCode": "string",
  "areaName": "string",
  "adminUserId": "uuid",
  "establishedDate": "date",
  "createdBy": "uuid"
}
```

**Preconditions:**

- `forumId` references an existing forum
- `areaCode` is unique within the forum
- `adminUserId` references an existing active user
- User has permission to create areas (Super Admin OR Forum Admin of parent forum)

**Backend Logic:**

```js
async function createArea(input) {
  return await db.transaction(async (trx) => {
    // 1. Get forum
    // 2. Check permission

    // 3. Validate areaCode is unique within forum
    // 4. Validate admin user

    // 5. Create area

    // 6. Get Area Admin role

    // 7. Assign Area Admin role to admin user (if not already assigned)

    // 8. Emit event
    await emitEvent("AreaCreated", {
      areaId: area.areaId,
      forumId: input.forumId,
      areaCode: area.areaCode,
      adminUserId: area.adminUserId,
      createdBy: input.createdBy,
    });

    return area;
  });
}
```

**Outcome:**

- Area created
- Area Admin role assigned to `adminUserId`
- Event: `AreaCreated`

---

#### 5. UpdateArea

**Triggered by:** Super Admin, Forum Admin (of parent forum), Area Admin (of this area)

**Input:**

```json
{
  "areaId": "uuid",
  "areaName": "string?",
  "establishedDate": "date?",
  "updatedBy": "uuid"
}
```

Note: `areaCode`, `forumId`, and `adminUserId` cannot be changed via update

**Backend Logic:**

```js
async function updateArea(input) {
  return await db.transaction(async (trx) => {
    // 1. Get area

    // 2. Check permission

    // 3. Update area

    // 4. Emit event
    await emitEvent("AreaUpdated", {
      areaId: input.areaId,
      updates,
      updatedBy: input.updatedBy,
    });

    return await db.areas.findByPk(input.areaId);
  });
}
```

---

#### 6. AssignAreaAdmin

**Triggered by:** Super Admin, Forum Admin (of parent forum)

**Input:**

```json
{
  "areaId": "uuid",
  "newAdminUserId": "uuid",
  "assignedBy": "uuid"
}
```

**Backend Logic:** (Similar to AssignForumAdmin, but with Area scope)

```js
async function assignAreaAdmin(input) {
  return await db.transaction(async (trx) => {
    // 1. Get area

    // 2. Check permission

    // 3. Validate new admin user

    // 4-9. Similar to AssignForumAdmin logic
    // ... (revoke old admin, assign new admin, update area.adminUserId)

    return area;
  });
}
```

---

#### 7. CreateUnit

**Triggered by:** Super Admin, Forum Admin (of parent forum), Area Admin (of parent area)

**Input:**

```json
{
  "areaId": "uuid",
  "unitCode": "string",
  "unitName": "string",
  "adminUserId": "uuid",
  "establishedDate": "date",
  "createdBy": "uuid"
}
```

**Preconditions:**

- `areaId` references an existing area
- `unitCode` is unique within the area
- `adminUserId` references an existing active user
- User has permission to create units

**Backend Logic:**

```js
async function createUnit(input) {
  return await db.transaction(async (trx) => {
    // 1. Get area

    // 2. Check permission

    // 3. Validate unitCode is unique within area
    // 4. Validate admin user

    // 5. Create unit (with denormalized forumId from area)

    // 6. Get Unit Admin role

    // 7. Assign Unit Admin role to admin user

    // 8. Emit event
    await emitEvent("UnitCreated", {
      unitId: unit.unitId,
      areaId: input.areaId,
      forumId: area.forumId,
      unitCode: unit.unitCode,
      adminUserId: unit.adminUserId,
      createdBy: input.createdBy,
    });

    return unit;
  });
}
```

**Outcome:**

- Unit created with denormalized `forumId`
- Unit Admin role assigned to `adminUserId`
- Event: `UnitCreated`

---

#### 8. UpdateUnit

**Triggered by:** Super Admin, Forum Admin, Area Admin, Unit Admin (of this unit)

**Input:**

```json
{
  "unitId": "uuid",
  "unitName": "string?",
  "establishedDate": "date?",
  "updatedBy": "uuid"
}
```

**Backend Logic:** (Similar to `UpdateArea`)

---

#### 9. AssignUnitAdmin

**Triggered by:** Super Admin, Forum Admin (of parent forum), Area Admin (of parent area)

**Input:**

```json
{
  "unitId": "uuid",
  "newAdminUserId": "uuid",
  "assignedBy": "uuid"
}
```

**Backend Logic:** (Similar to `AssignAreaAdmin`)

---

## Read Queries (For UI / Reports)

### GetForumWithHierarchy

### ListForums (use shared search service - to be implemented)

### GetAreasByForum

### GetUnitsByArea

---

## Validation Rules Summary

### Forum

- `forumCode`: required, unique globally, alphanumeric + hyphen/underscore, 3-50 chars
- `forumName`: required, 3-255 chars
- `adminUserId`: must exist, must be active
- `establishedDate`: valid date, not in future
- Only Super Admin can create

### Area

- `areaCode`: required, unique within forum, alphanumeric + hyphen/underscore, 3-50 chars
- `areaName`: required, 3-255 chars
- `forumId`: must exist
- `adminUserId`: must exist, must be active
- `establishedDate`: valid date, not in future
- Only Super Admin or Forum Admin (of parent forum) can create

### Unit

- `unitCode`: required, unique within area, alphanumeric + hyphen/underscore, 3-50 chars
- `unitName`: required, 3-255 chars
- `areaId`: must exist
- `forumId`: auto-populated from area (denormalized)
- `adminUserId`: must exist, must be active
- `establishedDate`: valid date, not in future
- Only Super Admin, Forum Admin (of parent forum), or Area Admin (of parent area) can create

---

## Events Emitted

### Forum Events

- `ForumCreated` - When forum is created
- `ForumUpdated` - When forum details updated
- `ForumAdminAssigned` - When forum admin changed

### Area Events

- `AreaCreated` - When area is created
- `AreaUpdated` - When area details updated
- `AreaAdminAssigned` - When area admin changed

### Unit Events

- `UnitCreated` - When unit is created
- `UnitUpdated` - When unit details updated
- `UnitAdminAssigned` - When unit admin changed

---

## Summary: Commands List

### Forum

- `CreateForum` (Super Admin)
- `UpdateForum` (Super Admin, Forum Admin)
- `AssignForumAdmin` (Super Admin)

### Area

- `CreateArea` (Super Admin, Forum Admin)
- `UpdateArea` (Super Admin, Forum Admin, Area Admin)
- `AssignAreaAdmin` (Super Admin, Forum Admin)

### Unit

- `CreateUnit` (Super Admin, Forum Admin, Area Admin)
- `UpdateUnit` (Super Admin, Forum Admin, Area Admin, Unit Admin)
- `AssignUnitAdmin` (Super Admin, Forum Admin, Area Admin)
