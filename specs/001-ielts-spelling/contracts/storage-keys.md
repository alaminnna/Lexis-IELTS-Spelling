# Contract: Storage Abstraction (Prompt §8–9)

**Source**: `src/storage/storageKeys.ts` + `src/storage/{userStorage,progressStorage,settingsStorage,wordStorage}.ts` delegating to `src/services/storage.ts`

## Keys & Version

```ts
// src/storage/storageKeys.ts
export const STORAGE_VERSION = 1 as const
export const DB_NAME = "ielts-spelling-db"
export const STORE = "app"
export const KEY = "envelope"
export const LS_KEY = "ielts-spelling-envelope-v1"
export const CACHE_NAME = "ielts-spelling-shell-v1" // Workbox precache via hashed assets + runtime cache names
```

- `STORAGE_VERSION` matches `StorageEnvelope.version`. Bump → `migrateEnvelope` handles missing fields; `safeParse` validates version prefix.

## Centralized API (no scattered localStorage)

Components NEVER call `localStorage.setItem` directly. All go via facade or `useAppStore` actions.

```ts
// src/storage/userStorage.ts
getUserProfile(): UserProfile | null
saveUserProfile(p: UserProfile): Promise<void>
updateUserProfile(patch: Partial<Pick<UserProfile,"name">>): Promise<void>
clearUserProfile(): Promise<void> // used by Clear All Data

// src/storage/progressStorage.ts
getProgress(): { wordProgress: Record<string,WordProgress>; attempts: Attempt[]; sessions: Session[]; streak: Streak; gamification: Gamification; dailyProgress: Record<string,DailyProgress>; metaLearning: MetaLearningStore; activeLearningSession: LearningSession|null }
saveProgress(partial: Partial<ProgressSlice>): Promise<void>
clearProgress(): Promise<void> // §16 — wipes attempts/sessions/streak/wordProgress/ dailyProgress / related metaLearning
getStatistics(): DerivedStats // delegates to services/statistics.ts

// src/storage/settingsStorage.ts
getSettings(): Settings
updateSettings(patch: Partial<Settings>): Promise<void>

// src/storage/wordStorage.ts
getCustomWords(): Word[]
saveCustomWord(w: Word): Promise<void>
deleteCustomWord(id: string): Promise<void>

// shared envelope ops in services/storage.ts
loadEnvelope(): Promise<StorageEnvelope>   // IDB → LS → defaultEnvelope() + migrate + recovery
saveEnvelope(env: StorageEnvelope): Promise<void> // always mirrors LS + IDB write-through
exportJson(env: StorageEnvelope): string
importJson(json: string): StorageEnvelope  // validates version + required keys, caps attempts 5000
resetEnvelope(): Promise<StorageEnvelope>   // defaultEnvelope + save

// store actions mirroring facades (single source §7)
clearProgress(): Promise<void>
clearAllData(): Promise<void> // §§17–19 — wipes everything, resets to onboarding
```

## Persistence Boundaries (§28)

Write only on:
- answer submitted (`recordAttempt`)
- word completed / session completed (`completeSession`)
- setting changed (`updateSettings`)
- word added/edited/deleted (`addUserWord` etc)
- profile changed (`updateUserProfile`, onboarding)

Never on keystroke/input change.

## Error Recovery (§27)

Every IDB/LS access wrapped `try/catch`. `safeParse` returns `null` on invalid JSON or `version !== STORAGE_VERSION`. `loadEnvelope` yields `defaultEnvelope()` in that case. UI toast: `"We couldn't access your local data. Your browser may be blocking site storage."`. Corrupted slice (e.g., `userWords` malformed) can be slice-reset without wiping whole envelope via `migrateEnvelope` heuristics.

## Isolation (§10)

Each browser has its own IDB/LS partition → `getUserProfile()` returns different data without extra namespace. No global singleton state beyond envelope local to origin.
