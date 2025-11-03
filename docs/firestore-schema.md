# Firestore Schema

## Visual Structure

```
Firestore Database
│
├── users (collection)
│   │
│   ├── {userId_1} (document)
│   │   ├── email: "user@example.com"
│   │   ├── firstName: "John"
│   │   ├── lastName: "Doe"
│   │   ├── residence: "Winthrop"
│   │   ├── createdAt: timestamp
│   │   ├── updatedAt: timestamp
│   │   │
│   │   └── nutritionPlans (subcollection)
│   │       │
│   │       ├── {planId_1} (document)
│   │       │   ├── preset: "mind-focus"
│   │       │   ├── presetName: "🧘 Mind & Focus"
│   │       │   ├── isActive: true
│   │       │   ├── createdAt: timestamp
│   │       │   ├── updatedAt: timestamp
│   │       │   ├── metrics: {
│   │       │   │     "protein": {
│   │       │   │       "enabled": true,
│   │       │   │       "unit": "g",
│   │       │   │       "target": "150"
│   │       │   │     },
│   │       │   │     "waterIntake": { ... }
│   │       │   │   }
│   │       │   └── customMetrics: [
│   │       │         {
│   │       │           "id": "custom_123",
│   │       │           "name": "Omega-3",
│   │       │           "unit": "mg",
│   │       │           "target": "1000",
│   │       │           "frequency": "daily"
│   │       │         }
│   │       │       ]
│   │       │
│   │       └── {planId_2} (document)
│   │           ├── preset: "muscle-gain"
│   │           ├── isActive: false
│   │           └── ... (same structure)
│   │
│   └── {userId_2} (document)
│       ├── email: "another@example.com"
│       └── ... (same structure)
```

---

## `users/{uid}`

Stores profile data for each authenticated user.

| Field      | Type      | Notes                                       |
|------------|-----------|---------------------------------------------|
| `email`    | string    | User's email address from Firebase Auth.    |
| `firstName`| string    | First name collected during registration.   |
| `lastName` | string    | Last name collected during registration.    |
| `residence`| string    | Dorm or house selection.                    |
| `createdAt`| timestamp | Set when the profile is first created.      |
| `updatedAt`| timestamp | Updated whenever the profile is modified.   |

Profiles are written immediately after Firebase Auth creates an account and can be extended with additional fields via profile update endpoints.

---

## `users/{uid}/nutritionPlans/{planId}`

Subcollection storing nutrition tracking plans for each user. Users can have multiple plans (for history), but only one plan is marked as active at a time.

| Field           | Type      | Notes                                                        |
|-----------------|-----------|--------------------------------------------------------------|
| `preset`        | string    | ID of the preset used (e.g., 'mind-focus', 'muscle-gain') or null for custom |
| `presetName`    | string    | Display name of the preset (e.g., '🧘 Mind & Focus')         |
| `metrics`       | object    | Map of enabled metrics with their settings. Key is metric ID, value is object with `enabled`, `unit`, `target` |
| `customMetrics` | array     | Array of custom metrics created by the user. Each contains `id`, `name`, `unit`, `target`, `frequency` |
| `isActive`      | boolean   | Whether this is the currently active plan for the user       |
| `createdAt`     | timestamp | When the plan was first created                              |
| `updatedAt`     | timestamp | When the plan was last modified                              |

### Example metrics object structure:
```json
{
  "protein": {
    "enabled": true,
    "unit": "g",
    "target": "150"
  },
  "waterIntake": {
    "enabled": true,
    "unit": "cups",
    "target": "8"
  }
}
```

### Example customMetrics array structure:
```json
[
  {
    "id": "custom_1699999999999",
    "name": "Omega-3",
    "unit": "mg",
    "target": "1000",
    "frequency": "daily"
  }
]
```


