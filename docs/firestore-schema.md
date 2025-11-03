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
│   │   ├── nutritionPlans (subcollection)
│   │   │   │
│   │   │   ├── {planId_1} (document)
│   │   │   │   ├── preset: "mind-focus"
│   │   │   │   ├── presetName: "🧘 Mind & Focus"
│   │   │   │   ├── isActive: true
│   │   │   │   ├── createdAt: timestamp
│   │   │   │   ├── updatedAt: timestamp
│   │   │   │   └── metrics: {
│   │   │   │         "protein": {
│   │   │   │           "enabled": true,
│   │   │   │           "unit": "g",
│   │   │   │           "target": "50"
│   │   │   │         },
│   │   │   │         "calories": {
│   │   │   │           "enabled": true,
│   │   │   │           "unit": "kcal",
│   │   │   │           "target": "2000"
│   │   │   │         }
│   │   │   │       }
│   │   │   │
│   │   │   └── {planId_2} (document)
│   │   │       ├── preset: "muscle-gain"
│   │   │       ├── isActive: false
│   │   │       └── ... (same structure)
│   │   │
│   │   └── meals (subcollection)
│   │       │
│   │       ├── {mealId_1} (document)
│   │       │   ├── userId: "userId_1"
│   │       │   ├── userEmail: "user@example.com"
│   │       │   ├── mealDate: "2025-11-03"
│   │       │   ├── timestamp: timestamp (with date and time)
│   │       │   ├── mealType: "lunch"
│   │       │   ├── mealName: "Lunch"
│   │       │   ├── locationId: "05"
│   │       │   ├── locationName: "Cabot and Pforzheimer House"
│   │       │   ├── items: [...]
│   │       │   ├── totals: {...}
│   │       │   ├── createdAt: timestamp
│   │       │   └── updatedAt: timestamp
│   │       │
│   │       └── {mealId_2} (document)
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

---

## `users/{uid}/meals/{mealId}`

Subcollection storing individual meal logs for each user. Each meal represents a dining event with specific food items consumed.

| Field           | Type      | Notes                                                        |
|-----------------|-----------|--------------------------------------------------------------|
| `userId`        | string    | Reference to the user who logged the meal                    |
| `userEmail`     | string    | Email of the user (for convenience)                          |
| `mealDate`      | string    | Date of the meal in YYYY-MM-DD format                        |
| `timestamp`     | timestamp | Date and time when the meal was consumed (user-specified)    |
| `mealType`      | string    | Type of meal (lowercase, e.g., 'breakfast', 'lunch', 'dinner') |
| `mealName`      | string    | Display name of the meal from HUDS (e.g., 'Breakfast', 'Lunch') |
| `locationId`    | string    | HUDS location number (e.g., '05')                            |
| `locationName`  | string    | HUDS location name (e.g., 'Cabot and Pforzheimer House')     |
| `items`         | array     | Array of food items consumed (see structure below)           |
| `totals`        | object    | Aggregated nutritional totals for the entire meal            |
| `createdAt`     | timestamp | When the meal log was first created                          |
| `updatedAt`     | timestamp | When the meal log was last modified                          |

### Example items array structure:
```json
[
  {
    "recipeId": "36297713",
    "recipeName": "Kashi Pilaf",
    "quantity": 1.5,
    "servingSize": "5 OZL",
    "calories": "167",
    "totalFat": "3g",
    "saturatedFat": "0g",
    "transFat": "0g",
    "cholesterol": "0mg",
    "sodium": "14.8mg",
    "totalCarb": "29.6g",
    "dietaryFiber": "5.9g",
    "sugars": "0g",
    "protein": "5.9g",
    "webCodes": "VGN WGRN VGT",
    "allergens": "Wheat"
  }
]
```

### Example totals object structure:
```json
{
  "calories": 500,
  "totalFat": "15.0g",
  "saturatedFat": "3.5g",
  "transFat": "0.0g",
  "cholesterol": "45.0mg",
  "sodium": "890.0mg",
  "totalCarb": "60.0g",
  "dietaryFiber": "8.0g",
  "sugars": "12.0g",
  "protein": "25.0g"
}
```

### Notes:
- All nutritional data comes from the HUDS Dining API
- The `quantity` field in items allows users to specify portions (e.g., 1.5 servings)
- Totals are automatically calculated by multiplying each item's nutrition by its quantity
- The `timestamp` field captures both date and time for accurate meal tracking
- Items preserve all nutritional information from HUDS for comprehensive tracking


