
Upgrade the existing IELTS Spelling Trainer into a **production-ready public, multi-user, local-first web application**.

The application will be hosted online and anyone should be able to open and use it immediately.

IMPORTANT:
This is an implementation task, not a UI mockup.

Before changing anything:

1. Inspect the entire existing codebase.
2. Understand the current Word system.
3. Understand Practice.
4. Understand Learning.
5. Understand the adaptive word-selection engine.
6. Understand audio.
7. Understand progress tracking.
8. Understand current Settings.
9. Understand current persistence/storage.
10. Reuse the existing architecture wherever possible.

DO NOT rebuild unrelated features.

---

# 1. CORE PRODUCT MODEL

The app must be:

**Local-first + anonymous + personal per-browser**

There will be NO required account/login/backend for the current version.

Every user gets their own local profile and learning data.

For example:

User A opens the website:

```text
Name: Rahim
```

User B opens the same website on another browser:

```text
Name: Karim
```

Their data must NEVER mix.

The application must store each user's data locally.

Use:

* `localStorage` for small persistent user/profile/settings data.
* IndexedDB if the existing app has large/complex learning datasets and localStorage becomes unsuitable.
* Cache API + Service Worker/PWA caching for application/static assets.

Do not send personal learning data to a server.

---

# 2. FIRST-TIME USER ONBOARDING

When a completely new browser/user opens the application for the first time:

Show a simple onboarding screen.

Ask ONLY:

**What's your name?**

Input:

```text
Your name
```

Button:

```text
Continue
```

Do NOT ask:

* email
* password
* phone
* age
* country
* account
* unnecessary questions

The onboarding must be extremely fast.

Example:

```text
Welcome to IELTS Spelling Trainer

What's your name?

[ Your name ]

[ Continue ]
```

After Continue:

1. Validate the name.
2. Trim whitespace.
3. Reject empty name.
4. Save the name locally.
5. Mark onboarding as completed.
6. Navigate to Dashboard.

---

# 3. RETURNING USER

If onboarding has already been completed:

DO NOT show the name screen again.

Immediately load the saved profile.

Example:

```text
Hi, Al A Min
```

or use the existing dashboard design.

The saved name must survive:

* refresh
* closing browser
* reopening browser
* navigating between pages

---

# 4. DASHBOARD PERSONALIZATION

The current dashboard contains something similar to:

```text
How you’re doing,

Good to see you back.

You’ve practiced 109 times with 12% average accuracy.
Keep the streak alive.
```

Make this dynamic.

The user's actual saved name must be displayed.

Example:

```text
How you’re doing, Al A Min

Good to see you back.

You’ve practiced 109 times with 82% average accuracy.
Keep the streak alive.
```

Do NOT hardcode:

`109`

`12%`

or any other statistics.

Everything must come from the actual user's stored progress.

---

# 5. ZERO-DATA DASHBOARD

For a new user who has just entered their name and has never practiced:

DO NOT show fake statistics.

Do NOT show:

```text
109 practices
12% accuracy
7 day streak
```

Instead show real zero-state information.

Example:

```text
How you’re doing, Al A Min

Good to see you.

You haven't practiced yet.
Start your first practice session to build your progress.
```

Use the existing UI/design language.

---

# 6. REAL PROGRESS CALCULATION

Audit the existing statistics system.

All dashboard statistics must be calculated from real persisted data.

Examples:

### Total Practices

Count actual completed word attempts/sessions according to the existing app's data model.

### Accuracy

Calculate from real answers:

```text
correct answers / total answered
```

Do not use placeholder numbers.

### Streak

Calculate from actual practice dates.

A streak must not increase simply because the dashboard was opened.

### Words Learned

Use actual learning-state/progress data.

### Mastered Words

Use the existing mastery engine.

### Weak Words

Use actual adaptive engine state.

---

# 7. SINGLE SOURCE OF TRUTH

This is extremely important.

Do NOT create separate fake statistics for Dashboard.

Do NOT create separate progress logic for Learning.

Do NOT create separate progress logic for Practice.

All of these must use one shared user-progress system.

Conceptually:

```text
User Profile
      ↓
Local Persistence
      ↓
Progress Repository
      ↓
Practice
Learning
Adaptive Engine
Dashboard
Words
Settings
```

If the existing project already has a progress service/store, extend it.

Do not duplicate it.

---

# 8. LOCAL STORAGE ARCHITECTURE

Create a clean storage abstraction.

For example:

```ts
storage/
  userStorage.ts
  progressStorage.ts
  settingsStorage.ts
  wordStorage.ts
  storageKeys.ts
```

Adapt this to the existing architecture.

DO NOT scatter:

```ts
localStorage.setItem(...)
```

throughout React components.

Use a centralized repository/service.

Example conceptual API:

```ts
getUserProfile()
saveUserProfile()
updateUserProfile()

getSettings()
updateSettings()

getProgress()
saveProgress()

getCustomWords()
saveCustomWord()
deleteCustomWord()

clearProgress()
clearAllData()
```

---

# 9. STORAGE VERSIONING

The local data structure must be versioned.

Example:

```ts
const STORAGE_VERSION = 1;
```

Use a structure similar to:

```ts
{
  version: 1,
  profile: {...},
  settings: {...},
  progress: {...},
  customWords: [...]
}
```

The exact structure should match the existing project.

The goal is future migration support.

If the app's data model changes later, old local data should not immediately break the application.

Implement migration handling where appropriate.

---

# 10. DATA ISOLATION

Each browser's local data is independent.

Never use:

* global in-memory user state as the only persistence
* hardcoded user identity
* shared server state
* demo profile

The app should behave correctly if multiple people use the same website from different browsers/devices.

Example:

```text
Chrome → Rahim's local data

Edge → Karim's local data
```

No mixing.

---

# 11. ONLINE HOSTING / CACHE

The app will be deployed online.

Make the application production-ready for hosting.

Implement proper browser caching for:

* static JS
* CSS
* fonts
* icons
* images
* app shell
* existing static word dataset
* audio assets where appropriate

Use the framework's existing capabilities first.

If appropriate for the existing stack, implement a Service Worker/PWA strategy.

IMPORTANT:

Cache is for application/assets/offline performance.

User learning data must remain in persistent local storage/IndexedDB.

Do NOT store critical user progress ONLY inside Cache API.

---

# 12. SERVICE WORKER SAFETY

If a Service Worker is introduced:

It must NOT break application updates.

Use a sensible caching strategy.

Static assets:

* cache-first where appropriate.

Dynamic navigation:

* network-first or suitable fallback.

Do not accidentally cache stale API responses forever.

When deploying a new application version:

The service worker must be able to update correctly.

Avoid aggressive caching that causes users to remain stuck on old versions.

---

# 13. OFFLINE-FIRST BEHAVIOR

Where technically possible, the application should remain usable when temporarily offline after the initial load.

At minimum:

* Words should remain available.
* Previously available learning data should remain available.
* Practice should remain usable if audio assets are already cached.
* Dashboard should remain usable.
* Settings should remain usable.
* User data must remain accessible.

If an external dictionary API requires internet:

show a graceful offline state instead of crashing.

---

# 14. SETTINGS PAGE — REAL FUNCTIONALITY ONLY

Audit the current Settings page.

Every visible setting must actually work.

CRITICAL RULE:

**NO MOCK SETTINGS.**

Do NOT leave:

* fake toggles
* fake dropdowns
* fake buttons
* placeholder controls
* "Coming soon" settings presented as functional
* buttons that visually change but don't persist
* settings that reset after refresh

If a setting exists in UI, implement its complete functionality.

If a feature cannot actually be implemented, remove the UI control instead of presenting a fake setting.

---

# 15. SETTINGS — PROFILE

Add a real Profile section.

Show:

```text
Your name
[ Al A Min ]
```

Allow the user to edit the name.

Save immediately or through a Save button, using the existing UI pattern.

After changing the name:

Dashboard must immediately use the new name.

Example:

Before:

```text
How you're doing, Rahim
```

After:

```text
How you're doing, Karim
```

This must persist after refresh.

---

# 16. SETTINGS — DATA MANAGEMENT

Create a real:

**Data & Privacy**

section.

Show useful actions such as:

### Clear Practice Progress

This should actually clear:

* practice history
* attempts
* accuracy history
* streak data
* word practice statistics

But it should NOT delete:

* user name
* custom words
* app settings

Require confirmation before destructive action.

Example confirmation:

```text
Clear practice progress?

This will permanently remove your practice history and progress.

[Cancel] [Clear Progress]
```

After confirmation:

Actually delete the data.

Refresh the dashboard and all relevant pages.

---

# 17. CLEAR ALL DATA

Provide:

**Reset Everything**

or:

**Clear All App Data**

This is a destructive action.

It must actually delete:

* name
* onboarding state
* practice history
* learning progress
* custom words
* settings
* streak
* adaptive engine state
* cached user-specific app data where applicable

After successful reset:

1. Clear storage.
2. Clear relevant IndexedDB data.
3. Reset application state.
4. Return user to onboarding.
5. Ask for name again.

Do NOT leave old data in React memory.

Do NOT require a manual browser refresh.

---

# 18. CONFIRMATION SAFETY

Destructive actions must require explicit confirmation.

Never clear data from a single accidental click.

Use a proper confirmation dialog.

For "Clear All Data", make the wording very clear:

```text
This cannot be undone.
```

---

# 19. RESET AFTER CLEAR

After clearing data, verify:

* Dashboard statistics = zero
* No old name remains
* Old custom words disappear
* Practice history disappears
* Learning progress resets
* Adaptive engine resets
* Settings return to defaults
* Onboarding appears again

This must happen without needing to manually delete browser storage.

---

# 20. SETTINGS PERSISTENCE

Any real setting must survive:

```text
change setting
→ refresh
→ setting remains
```

Also:

```text
change setting
→ close browser
→ reopen
→ setting remains
```

---

# 21. SETTINGS SHOULD NOT BE OVERLOADED

Do not add unnecessary settings just to make the page look complete.

Only expose settings that actually control existing application behavior.

Examples of valid settings if supported by the existing app:

* Name
* Audio preference
* Practice preference
* Theme if the app already supports themes
* Sound effects if actually implemented
* Data management

If there is no implementation behind a setting:

REMOVE IT.

---

# 22. CUSTOM WORDS + LOCAL DATA

The previously requested `/words` custom word feature must also be local-first.

When a user adds:

```text
resilient
```

it belongs only to that browser's user profile.

It must persist locally.

It must work with:

* Words
* Learning
* Practice
* Adaptive engine
* Progress tracking

It must be removed when "Clear All Data" is executed.

---

# 23. ADAPTIVE ENGINE PERSISTENCE

The existing adaptive word-selection engine must persist its state.

If a user practices:

```text
environment
```

10 times,

then closes the browser and returns,

the engine must remember the previous state.

Do NOT restart the adaptive algorithm from zero after every reload.

Persist:

* attempts
* correct
* wrong
* accuracy
* mastery
* state
* recent mistakes
* review information
* last practiced
* other existing adaptive data

Use the existing adaptive engine's data model.

---

# 24. PRACTICE SESSION PERSISTENCE

Be careful with unfinished sessions.

Do NOT accidentally count a word as practiced merely because it was displayed.

Define clearly what counts as an actual attempt/completed practice based on the existing Practice implementation.

Progress must represent real user actions.

---

# 25. PREVENT FAKE DATA

Perform a full codebase audit for:

```text
109
12%
dummy
mock
demo
fake
placeholder
sample
testUser
John
Alex
```

and similar hardcoded dashboard/profile values.

Remove production mock data.

If test fixtures exist, keep them isolated from production runtime.

---

# 26. FIRST LOAD FLOW

Expected production flow:

```text
User opens website
        ↓
Check local storage
        ↓
Is profile available?
     ↙       ↘
   NO        YES
   ↓          ↓
Name screen  Dashboard
   ↓
Save name
   ↓
Dashboard
```

No account creation.

No login.

No backend dependency for basic usage.

---

# 27. ERROR RECOVERY

If localStorage is unavailable or corrupted:

Do not crash the entire application.

Handle storage errors gracefully.

Possible message:

```text
We couldn't access your local data.
Your browser may be blocking site storage.
```

The app should fail gracefully.

If stored JSON is corrupted:

* detect it
* attempt migration/recovery if possible
* otherwise safely reset only the corrupted portion
* never crash the entire application

---

# 28. PERFORMANCE

The app must remain fast with:

* 1200+ system words
* hundreds of user attempts
* large practice history
* custom words
* adaptive learning data

Avoid writing huge objects to localStorage on every keystroke.

Persist state at sensible boundaries:

* answer submitted
* word completed
* session completed
* setting changed
* word added
* profile changed

Do not cause excessive storage writes.

---

# 29. MULTI-TAB CONSISTENCY

If the same user opens the app in two browser tabs:

Changes to important local data should eventually synchronize where practical.

Use:

* `storage` event
* BroadcastChannel if appropriate
* existing state management

At minimum, prevent obvious stale dashboard data.

---

# 30. PRIVACY

Because this is local-first:

Do not transmit the user's:

* name
* practice history
* learning progress
* custom words

to any server unless an explicitly implemented feature requires it.

Do not add analytics that sends personal learning data without an actual requirement.

---

# 31. DATA EXPORT / IMPORT

If the existing app already has export/import functionality:

Make it fully compatible with the new profile/storage architecture.

Export should include:

* profile/name
* settings
* custom words
* learning progress
* practice history
* adaptive engine data

Import should restore them correctly.

If export/import does not exist, do NOT add fake UI just for appearance.

Only add it if you implement the complete functionality.

---

# 32. APP UPDATE SAFETY

The application will be publicly hosted.

Ensure:

* production build works
* direct navigation to `/words` works
* direct navigation to `/learning` works
* direct navigation to `/practice` works
* browser refresh does not break routes
* service worker does not trap old builds
* local user data survives normal app updates

---

# 33. TEST THE COMPLETE USER JOURNEY

Test this exact flow:

### User 1

1. Open website.
2. Enter `Rahim`.
3. Go Dashboard.
4. Verify real zero-state.
5. Practice several words.
6. Verify statistics update.
7. Go Words.
8. Add a custom word.
9. Verify custom word persists.
10. Go Learning.
11. Verify adaptive state works.
12. Refresh browser.
13. Verify everything remains.
14. Change name from Settings.
15. Verify Dashboard updates.
16. Clear Practice Progress.
17. Verify practice statistics reset.
18. Verify custom word still exists.
19. Clear All Data.
20. Verify everything is gone.
21. Verify onboarding appears again.

### User 2 simulation

Use another browser/private window.

1. Open website.
2. Enter `Karim`.
3. Verify Rahim's data is NOT visible.
4. Practice words.
5. Verify independent statistics.
6. Add custom word.
7. Verify independent custom words.

---

# 34. PRODUCTION CODE QUALITY

Do not solve this with hacks.

Avoid:

* global mutable variables
* duplicated localStorage logic
* hardcoded statistics
* fake settings
* hidden magic state
* random IDs that reset unexpectedly
* storing critical state only in React memory
* coupling UI directly to storage implementation

Use clean TypeScript types and service boundaries.

---

# 35. FINAL ACCEPTANCE CRITERIA

The implementation is complete ONLY if all of these are true:

* Anyone can open and use the website.
* No login is required.
* First visit asks only for name.
* Name persists.
* Dashboard uses the real saved name.
* Dashboard statistics are real.
* New users do not see fake statistics.
* User data is isolated per browser.
* Practice progress persists.
* Learning progress persists.
* Adaptive engine persists.
* Custom words persist.
* Settings actually work.
* No mock settings remain.
* Clear Practice Progress actually works.
* Clear All Data actually works.
* Reset returns to onboarding.
* Storage errors are handled gracefully.
* Cache/service worker does not break updates.
* App works after refresh.
* App works after reopening browser.
* Existing Practice remains functional.
* Existing Learning remains functional.
* Existing Words remains functional.
* Existing audio remains functional.
* Existing adaptive selection remains functional.
* No unrelated feature is broken.

MOST IMPORTANT:

**If a UI control exists, it must perform the real action it claims to perform.**

Never ship a visual-only/mock setting.

The final application should feel like a real public product:

**Open → Enter Name → Learn → Practice → Progress is saved locally → Return later → Continue exactly where you left off.**
