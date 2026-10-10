# Plan: Meal Menu APIs — Admin + Customer

## Context

The Zaadi Kitchen backend needs two new feature groups implemented:

1. **Admin Meal Library + Week Planner** (`/api/v1/admin/meals`, `/api/v1/admin/menu/weeks`) — lets admin staff build a weekly menu by creating dishes, assigning them to daily slots, and publishing the week's menu.
2. **Customer Home + Menu Endpoints** (`/api/v1/home`, `/api/v1/menu`, `/api/v1/meals`) — lets the mobile app render the home screen (subscription state–aware), browse this week's and next week's meal schedule, and open meal detail sheets.

These are listed as "Not Yet Implemented" in `docs/UI_API_FLOW_GUIDE.md §7.2` and fully specified in:
- `docs/zaadi_admin_api_phase2_menu_manager.md` (admin)
- `docs/home_api.md` (customer)

Architecture: Clean Architecture (NestJS + Sequelize + factory-function use cases). All new code follows `docs/coding_standards.md`.

---

## New Dependency Required

- `xlsx` — XLSX parsing for `POST /admin/meals/import`
- `@types/multer` — TypeScript types for file upload (multer already bundled with `@nestjs/platform-express`)

```bash
npm install xlsx
npm install -D @types/multer
```

---

## Phase 1 — Database (2 migrations + 3 models)

### New Tables

#### `meals`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | UUIDV4 |
| `name_en` | VARCHAR(80) NOT NULL | |
| `name_ar` | VARCHAR(80) NULL | |
| `meal_type` | ENUM('executive','salad') NOT NULL | |
| `kcal` | INTEGER NOT NULL | |
| `protein_g` | DECIMAL(6,2) NULL | |
| `carbs_g` | DECIMAL(6,2) NULL | |
| `fat_g` | DECIMAL(6,2) NULL | |
| `chef_note` | TEXT NULL | |
| `key_ingredients` | JSONB NULL | Array of strings |
| `emoji` | VARCHAR(10) DEFAULT '🍛' | |
| `status` | ENUM('draft','active') DEFAULT 'draft' | |
| `photo_url` | VARCHAR NULL | |
| `activated_at` | TIMESTAMP NULL | |
| `last_served` | DATE NULL | Updated on week publish |
| `times_served` | INTEGER DEFAULT 0 | |
| `created_at` / `updated_at` | TIMESTAMP | |

Index: `(meal_type, status)`, `(status)`

#### `menu_weeks`
| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR(20) PK | e.g. `w2025-19` |
| `week_number` | INTEGER NOT NULL | ISO week number |
| `year` | INTEGER NOT NULL | |
| `date_from` | DATE NOT NULL | Sunday of work week |
| `date_to` | DATE NOT NULL | Thursday of work week |
| `status` | ENUM('draft','published','past') DEFAULT 'draft' | |
| `published_at` | TIMESTAMP NULL | |
| `published_by` | UUID NULL | FK → users(id) SET NULL |
| `created_at` / `updated_at` | TIMESTAMP | |

Index: `(year, week_number)`, `(date_from)`

#### `menu_slots`
| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR(50) PK | e.g. `slot_w2025-19_sun_exec` |
| `week_id` | VARCHAR(20) NOT NULL | FK → menu_weeks(id) |
| `delivery_date` | DATE NOT NULL | |
| `meal_type` | ENUM('executive','salad') NOT NULL | |
| `meal_id` | UUID NULL | FK → meals(id) SET NULL |
| `created_at` / `updated_at` | TIMESTAMP | |

Unique: `(week_id, delivery_date, meal_type)` — one slot per day per meal type

### Migration Files
1. `YYYYMMDDHHMMSS-create-meals.js`
2. `YYYYMMDDHHMMSS-create-menu-weeks-and-slots.js`

### Sequelize Model Files
- `src/infrastructure/SequelizePersistence/models/MealModel.ts`
- `src/infrastructure/SequelizePersistence/models/MenuWeekModel.ts`
- `src/infrastructure/SequelizePersistence/models/MenuSlotModel.ts`
- Update `models/index.ts` barrel + `database.module.ts` models array

---

## Phase 2 — Core Layer

### New Entities (TypeScript interfaces)

**`src/core/entities/Meal.ts`**
```typescript
export interface Meal {
  id: string
  nameEn: string
  nameAr?: string
  mealType: 'executive' | 'salad'
  kcal: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  chefNote?: string
  keyIngredients?: string[]
  emoji: string
  status: 'draft' | 'active'
  photoUrl?: string
  activatedAt?: Date
  lastServed?: string
  timesServed: number
  createdAt: Date
  updatedAt: Date
}
```

**`src/core/entities/MenuWeek.ts`**
```typescript
export interface MenuWeek {
  id: string          // 'w2025-19'
  weekNumber: number
  year: number
  dateFrom: string    // YYYY-MM-DD (Sunday)
  dateTo: string      // YYYY-MM-DD (Thursday)
  status: 'draft' | 'published' | 'past'
  publishedAt?: Date
  publishedBy?: string
  createdAt: Date
  updatedAt: Date
}
```

**`src/core/entities/MenuSlot.ts`**
```typescript
export interface MenuSlot {
  id: string          // 'slot_w2025-19_sun_exec'
  weekId: string
  deliveryDate: string
  mealType: 'executive' | 'salad'
  mealId?: string
  createdAt: Date
  updatedAt: Date
}

export interface MenuSlotWithMeal extends MenuSlot {
  meal?: Meal
}
```

Update `src/core/entities/index.ts` barrel.

### New Gateway Interfaces

**`src/core/entitygateway/Meal.ts`**
```typescript
export interface MealLoader {
  getMealById(id: string): Promise<Meal | null>
  getMeals(filters: {
    status?: 'draft' | 'active' | 'all'
    mealType?: 'executive' | 'salad' | 'all'
    q?: string
    page?: number
    perPage?: number
    excludeWeekId?: string   // returns already_used flag
  }): Promise<{ meals: (Meal & { alreadyUsed?: boolean; usedOnDay?: string | null })[]; total: number }>
  getMealsByIds(ids: string[]): Promise<Meal[]>
}

export interface MealPersistor {
  createMeal(input: CreateMealInput): Promise<Meal>
  updateMeal(id: string, updates: Partial<Meal>): Promise<Meal>
  updateMealStatus(id: string, status: 'active' | 'draft'): Promise<Meal>
  bulkCreateMeals(meals: CreateMealInput[]): Promise<{ created: Meal[]; skipped: number; errors: ImportError[] }>
  incrementTimesServed(mealIds: string[]): Promise<void>
  updateLastServed(mealIds: string[], date: string): Promise<void>
}
```

**`src/core/entitygateway/MenuWeek.ts`**
```typescript
export interface MenuWeekLoader {
  getWeekById(weekId: string): Promise<MenuWeek | null>
  getWeeks(filters: { fromWeek?: string; count?: number }): Promise<MenuWeek[]>
  getWeekForDate(date: string): Promise<MenuWeek | null>   // finds published week containing date
  getSlotsByWeekId(weekId: string): Promise<MenuSlot[]>
  getSlotById(slotId: string): Promise<MenuSlot | null>
  getMealIdsByWeekId(weekId: string): Promise<string[]>   // for "already used" check
  getMenuForDateRange(from: string, to: string): Promise<MenuSlotWithMeal[]>  // for customer queries
}

export interface MenuWeekPersistor {
  ensureWeekExists(params: EnsureWeekParams): Promise<{ week: MenuWeek; slots: MenuSlot[] }>
  assignMealToSlot(slotId: string, mealId: string): Promise<MenuSlot>
  clearSlot(slotId: string): Promise<MenuSlot>
  publishWeek(weekId: string, publishedBy: string): Promise<MenuWeek>
  transitionPastWeeks(): Promise<void>  // updates status to 'past' for expired weeks
}
```

Update `src/core/entitygateway/index.ts` — add `mealLoader`, `mealPersistor`, `menuWeekLoader`, `menuWeekPersistor` to `Deps`.

### Week Generation Utility

Create `src/core/usecases/services/weekUtils.ts`:
- `getSaudiWorkWeekBounds(referenceDate: Date)` — returns `{ weekId, weekNumber, year, dateFrom (Sunday), dateTo (Thursday), deliveryDates: string[] }`
- Saudi work week = Sunday to Thursday
- `weekId` = `w{year}-{isoWeekOfSunday}` where ISO week is computed from the Sunday date
- `getCurrentAndNextWeekIds()` — returns the two week IDs for the planner

### New Use Cases

#### Admin Commands (7)
| File | UC Name | HTTP |
|---|---|---|
| `commands/CreateMeal.ts` | `CreateMeal` | POST /admin/meals |
| `commands/UpdateMeal.ts` | `UpdateMeal` | PATCH /admin/meals/:id |
| `commands/UpdateMealStatus.ts` | `UpdateMealStatus` | PATCH /admin/meals/:id/status |
| `commands/ImportMeals.ts` | `ImportMeals` | POST /admin/meals/import |
| `commands/AssignMealToSlot.ts` | `AssignMealToSlot` | POST /admin/menu/weeks/:week_id/slots/:slot_id/assign |
| `commands/ClearMenuSlot.ts` | `ClearMenuSlot` | DELETE /admin/menu/weeks/:week_id/slots/:slot_id |
| `commands/PublishMenuWeek.ts` | `PublishMenuWeek` | POST /admin/menu/weeks/:week_id/publish |

#### Admin Queries (4)
| File | UC Name | HTTP |
|---|---|---|
| `queries/GetAdminMeals.ts` | `GetAdminMeals` | GET /admin/meals |
| `queries/GetAdminMeal.ts` | `GetAdminMeal` | GET /admin/meals/:id |
| `queries/GetMenuWeeks.ts` | `GetMenuWeeks` | GET /admin/menu/weeks |
| `queries/GetMenuWeek.ts` | `GetMenuWeek` | GET /admin/menu/weeks/:week_id |

`GetMenuWeeks` and `GetMenuWeek` call `menuWeekPersistor.ensureWeekExists()` before returning, so the planner always has current + next week initialized.

#### Customer Queries (5)
| File | UC Name | HTTP |
|---|---|---|
| `queries/GetHome.ts` | `GetHome` | GET /home |
| `queries/GetHomeThisWeek.ts` | `GetHomeThisWeek` | GET /home/this-week |
| `queries/GetMenuMeta.ts` | `GetMenuMeta` | GET /menu |
| `queries/GetCustomerMenuWeek.ts` | `GetCustomerMenuWeek` | GET /menu/week |
| `queries/GetMealDetail.ts` | `GetMealDetail` | GET /meals/:meal_id |

**`GetHome` aggregates:**
1. User (`userLoader.getUserById`)
2. Active subscription (`subscriptionLoader.getActiveSubscriptionByUserId`)
3. Primary delivery location (`deliveryLocationLoader.getPrimaryLocationByUserId`)
4. Wallet balance (`walletLoader.getBalanceByUserId`)
5. All plans (`planLoader.getActivePlans`)
6. Constructs `subscription_status`, `banner`, `quick_actions` based on subscription state

**`GetCustomerMenuWeek` logic:**
1. Get current + next week date ranges
2. `menuWeekLoader.getMenuForDateRange(sunThisWeek, thuNextWeek)` — returns slots with meals (published weeks only)
3. If user has active subscription, `deliveryDayLoader.getDeliveryDaysBySubscription(...)` to overlay skip/delivered state
4. For each slot, compute `skip_available` using 18:00 AST cutoff logic and subscription counters

**Key business rules in use cases:**
- `AssignMealToSlot`: check meal is `active`, check meal not already used in same week (via `getMealIdsByWeekId`), check slot's week is not published
- `PublishMenuWeek`: all 10 slots must have `meal_id != null`; sets `last_served` and increments `times_served` on all assigned meals
- `UpdateMealStatus` draft → active on meal in published week: require `confirmPublishedEdit: true`
- `ImportMeals`: parse XLSX using `xlsx` library; always saves as `draft`; partial import allowed; max 100 rows; returns import summary

Update `src/core/usecases/index.ts` — register all 16 new UCs with `wrapUC`.

### New Domain Errors (add to `src/shared/errors/domain.errors.ts`)

```typescript
export class MealAlreadyUsedInWeekError extends BaseError  // 409 MEAL_ALREADY_USED
export class MealIsDraftError extends BaseError            // 422 MEAL_IS_DRAFT
export class WeekNotCompleteError extends BaseError        // 409 WEEK_NOT_COMPLETE
export class WeekAlreadyPublishedError extends BaseError   // 409 WEEK_ALREADY_PUBLISHED
export class SlotNotEditableError extends BaseError        // 422 SLOT_NOT_EDITABLE
export class MealInPublishedWeekError extends BaseError    // 409 MEAL_IN_PUBLISHED_WEEK
export class MealNotFoundError extends BaseError           // 404 MEAL_NOT_FOUND
```

---

## Phase 3 — Infrastructure

### New Persistence Services

**`src/infrastructure/SequelizePersistence/meal-persistence.service.ts`**
- Implements `MealLoader` + `MealPersistor`
- `getMeals` with `excludeWeekId` context: LEFT JOIN with `menu_slots` to determine `already_used` and `used_on_day`
- `bulkCreateMeals`: validates rows, creates valid ones, collects errors
- Private `toEntity(model: MealModel): Meal`

**`src/infrastructure/SequelizePersistence/menu-week-persistence.service.ts`**
- Implements `MenuWeekLoader` + `MenuWeekPersistor`
- `ensureWeekExists`: upsert week + create 10 slots if they don't exist (idempotent)
- `getMenuForDateRange`: JOIN menu_slots + meals WHERE week.status='published' AND slot.delivery_date BETWEEN
- `transitionPastWeeks`: UPDATE menu_weeks SET status='past' WHERE date_to < today AND status='published'
- Private `toWeekEntity`, `toSlotEntity`

### DI Tokens (add to `src/tokens.ts`)
```typescript
export const MealPersistenceS = Symbol('meal-persistence')
export const MenuWeekPersistenceS = Symbol('menu-week-persistence')
```

### Register in Adapter
- `src/coreadapter/coreadapter.module.ts` — add providers for `MealPersistenceS` and `MenuWeekPersistenceS`
- `src/coreadapter/coreadapter.service.ts` — inject both, pass to `initUseCases()` as `mealLoader`, `mealPersistor`, `menuWeekLoader`, `menuWeekPersistor`

---

## Phase 4 — Presentation Layer

### New DTOs (8 files)

| File | Used by |
|---|---|
| `GetAdminMealsQueryDTO.ts` | GET /admin/meals (query params: status, meal_type, q, page, per_page, context, exclude_week_id) |
| `CreateMealDTO.ts` | POST /admin/meals |
| `UpdateMealDTO.ts` | PATCH /admin/meals/:id (all fields optional) |
| `UpdateMealStatusDTO.ts` | PATCH /admin/meals/:id/status (status enum, confirmPublishedEdit opt) |
| `AssignMealToSlotDTO.ts` | POST .../slots/:slot_id/assign (meal_id) |
| `GetMenuWeeksQueryDTO.ts` | GET /admin/menu/weeks (from_week, count) |
| `GetCustomerMenuWeekQueryDTO.ts` | GET /menu/week (meal_type: all\|executive\|salad) |
| `ConfirmPublishedEditDTO.ts` | shared mixin for confirm_published_edit flag |

Update `src/gateways/http/dto/index.ts` barrel.

### New Controllers (4 files)

**`src/gateways/http/admin-meals.controller.ts`**
- `@Controller('api/v1/admin/meals')`
- `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN, UserRole.OPS)` at class level
- `GET /` → `getAdminMeals`
- `GET /:meal_id` → `getAdminMeal`
- `POST /` → `createMeal`
- `PATCH /:meal_id` → `updateMeal`
- `PATCH /:meal_id/status` → `updateMealStatus`
- `POST /import` → `importMeals` (uses `@UseInterceptors(FileInterceptor('file'))`, `@UploadedFile()`)

**`src/gateways/http/admin-menu.controller.ts`**
- `@Controller('api/v1/admin/menu')`
- `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN, UserRole.OPS)` at class level
- `GET /weeks` → `getMenuWeeks`
- `GET /weeks/:week_id` → `getMenuWeek`
- `POST /weeks/:week_id/slots/:slot_id/assign` → `assignMealToSlot`
- `DELETE /weeks/:week_id/slots/:slot_id` → `clearMenuSlot`
- `POST /weeks/:week_id/publish` → `publishMenuWeek`

**`src/gateways/http/home.controller.ts`**
- `@Controller('api/v1/home')`
- `@UseGuards(JwtAuthGuard)` at class level
- `GET /` → `getHome`
- `GET /this-week` → `getHomeThisWeek`

**`src/gateways/http/menu.controller.ts`**
- `@Controller('api/v1')` (multiple prefixes in one controller)
- `@UseGuards(JwtAuthGuard)` at class level
- `GET /menu` → `getMenuMeta`
- `GET /menu/week` → `getCustomerMenuWeek`
- `GET /meals/:meal_id` → `getMealDetail`

Update `src/gateways/http/http.module.ts` — add 4 new controllers.

---

## Phase 5 — Postman Collection Update

Add the following groups to `backend/Zaadi_Kitchen_API.postman_collection.json`:

**New groups:**
1. **Health** — `GET /health`
2. **Admin Meals** — 6 requests (list, get, create, update, update status, import)
3. **Admin Menu Manager** — 5 requests (list weeks, get week, assign, clear slot, publish)
4. **Home** — 2 requests (GET /home, GET /home/this-week)
5. **Menu** — 3 requests (GET /menu, GET /menu/week, GET /meals/:meal_id)

New Postman variable: `meal_id`, `week_id`, `slot_id`.

---

## File Checklist (38 new/modified files)

### New Files
- `src/core/entities/Meal.ts`
- `src/core/entities/MenuWeek.ts`
- `src/core/entities/MenuSlot.ts`
- `src/core/entitygateway/Meal.ts`
- `src/core/entitygateway/MenuWeek.ts`
- `src/core/usecases/services/weekUtils.ts`
- `src/core/usecases/commands/CreateMeal.ts`
- `src/core/usecases/commands/UpdateMeal.ts`
- `src/core/usecases/commands/UpdateMealStatus.ts`
- `src/core/usecases/commands/ImportMeals.ts`
- `src/core/usecases/commands/AssignMealToSlot.ts`
- `src/core/usecases/commands/ClearMenuSlot.ts`
- `src/core/usecases/commands/PublishMenuWeek.ts`
- `src/core/usecases/queries/GetAdminMeals.ts`
- `src/core/usecases/queries/GetAdminMeal.ts`
- `src/core/usecases/queries/GetMenuWeeks.ts`
- `src/core/usecases/queries/GetMenuWeek.ts`
- `src/core/usecases/queries/GetHome.ts`
- `src/core/usecases/queries/GetHomeThisWeek.ts`
- `src/core/usecases/queries/GetMenuMeta.ts`
- `src/core/usecases/queries/GetCustomerMenuWeek.ts`
- `src/core/usecases/queries/GetMealDetail.ts`
- `src/infrastructure/SequelizePersistence/models/MealModel.ts`
- `src/infrastructure/SequelizePersistence/models/MenuWeekModel.ts`
- `src/infrastructure/SequelizePersistence/models/MenuSlotModel.ts`
- `src/infrastructure/SequelizePersistence/migrations/YYYYMMDDHHMMSS-create-meals.js`
- `src/infrastructure/SequelizePersistence/migrations/YYYYMMDDHHMMSS-create-menu-weeks-slots.js`
- `src/infrastructure/SequelizePersistence/meal-persistence.service.ts`
- `src/infrastructure/SequelizePersistence/menu-week-persistence.service.ts`
- `src/gateways/http/dto/GetAdminMealsQueryDTO.ts`
- `src/gateways/http/dto/CreateMealDTO.ts`
- `src/gateways/http/dto/UpdateMealDTO.ts`
- `src/gateways/http/dto/UpdateMealStatusDTO.ts`
- `src/gateways/http/dto/AssignMealToSlotDTO.ts`
- `src/gateways/http/dto/GetMenuWeeksQueryDTO.ts`
- `src/gateways/http/dto/GetCustomerMenuWeekQueryDTO.ts`
- `src/gateways/http/admin-meals.controller.ts`
- `src/gateways/http/admin-menu.controller.ts`
- `src/gateways/http/home.controller.ts`
- `src/gateways/http/menu.controller.ts`

### Modified Files
- `src/core/entities/index.ts` — export 3 new entities
- `src/core/entitygateway/index.ts` — add 4 new gateway fields to Deps
- `src/core/usecases/index.ts` — register 16 new UCs
- `src/infrastructure/SequelizePersistence/models/index.ts` — export 3 new models
- `src/infrastructure/SequelizePersistence/database.module.ts` — add 3 models
- `src/shared/errors/domain.errors.ts` — add 7 new error classes
- `src/tokens.ts` — add 2 new tokens
- `src/coreadapter/coreadapter.module.ts` — add 2 providers
- `src/coreadapter/coreadapter.service.ts` — wire 2 new services
- `src/gateways/http/dto/index.ts` — export 7 new DTOs
- `src/gateways/http/http.module.ts` — add 4 controllers
- `backend/Zaadi_Kitchen_API.postman_collection.json` — add 16 new requests

---

## Verification

1. `npm run build` — TypeScript compiles cleanly with no errors
2. `npm run db:migrate` — Both migrations run without error
3. Start server and use Postman:
   - Admin: Create a meal → confirm status is 'draft'
   - Admin: List weeks → current + next week auto-created with 10 empty slots
   - Admin: Assign meal to slot → confirm slot updated
   - Admin: Publish week → fails if any slot unfilled; succeeds when all 10 filled
   - Customer: `GET /home` → returns correct subscription_status for test user
   - Customer: `GET /menu/week` → returns meals from published week
   - Customer: `GET /meals/:id` → returns meal detail
4. Run `npm test` to ensure no regression in existing use cases
