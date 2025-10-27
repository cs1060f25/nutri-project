# Firestore Schema

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

Profiles are written immediately after Firebase Auth creates an account and can be extended with additional fields (e.g., goals) via profile update endpoints.
