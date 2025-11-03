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
│   │       │   └── metrics: {
│   │       │         "protein": {
│   │       │           "enabled": true,
│   │       │           "unit": "g",
│   │       │           "target": "50"
│   │       │         },
│   │       │         "calories": {
│   │       │           "enabled": true,
│   │       │           "unit": "kcal",
│   │       │           "target": "2000"
│   │       │         }
│   │       │       }
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
| `preset`        | string    | ID of the preset used (e.g., 'balanced', 'high-protein') or null for custom |
| `presetName`    | string    | Display name of the preset (e.g., '⚖️ Balanced Diet')         |
| `metrics`       | object    | Map of enabled metrics with their settings. Key is metric ID, value is object with `enabled`, `unit`, `target`. All metrics correspond to data available in HUDS API |
| `isActive`      | boolean   | Whether this is the currently active plan for the user       |
| `createdAt`     | timestamp | When the plan was first created                              |
| `updatedAt`     | timestamp | When the plan was last modified                              |

### Example metrics object structure:
```json
{
  "protein": {
    "enabled": true,
    "unit": "g",
    "target": "50"
  },
  "calories": {
    "enabled": true,
    "unit": "kcal",
    "target": "2000"
  },
  "sodium": {
    "enabled": true,
    "unit": "mg",
    "target": "2300"
  }
}
```

### Available Metrics (based on HUDS API data):
All nutrition metrics are derived from the HUDS Dining API recipe data:
- **Energy**: `calories`, `caloriesFromFat`
- **Macronutrients**: `protein`, `totalCarbs`, `fiber`, `sugars`
- **Fats**: `totalFat`, `saturatedFat`, `transFat`
- **Other**: `cholesterol`, `sodium`

These correspond to the following HUDS API fields:
- `Calories`, `Calories_From_Fat`, `Protein`, `Total_Carb`, `Dietary_Fiber`, `Sugars`, `Total_Fat`, `Sat_Fat`, `Trans_Fat`, `Cholesterol`, `Sodium`


