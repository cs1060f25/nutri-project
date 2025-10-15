# CrimsonFuel - Prototype 2 (PWA with Flask Backend)

A Progressive Web App for Harvard students with dietary restrictions, focusing on gluten-free tracking.

## Overview

CrimsonFuel helps Harvard students with dietary restrictions (especially gluten-free) sign up and track their nutrition goals. This prototype emphasizes accessibility, mobile-first design, and PWA capabilities.

## Tech Stack

- **Frontend**: React 18, Progressive Web App (PWA)
- **Backend**: Python Flask, SQLite3 (mocked in-memory)
- **Design**: Apple Human Interface Guidelines (HIG)
- **Accessibility**: WCAG AA compliant

## Features

- **Harvard Email Authentication**: Sign up with @college.harvard.edu
- **Gluten-Free Focus**: Special emphasis on dietary restrictions
- **3-Step Onboarding**: Personal info, food preferences, nutrition goals
- **PWA Support**: Installable, works offline
- **Accessible Design**: WCAG AA compliant with keyboard navigation, proper ARIA labels, and color contrast
- **Mobile-First**: Large tap targets (44x44px), gesture-friendly, responsive layout

## Installation

### Backend (Flask)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run Flask server
python server/app.py
```

Server runs on http://localhost:5001

### Frontend (React)

```bash
# Install Node dependencies
cd client
npm install

# Run React dev server
npm start
```

App runs on http://localhost:3000

## User Flow

1. **Sign Up**: Create account with Harvard email + password
2. **Personal Info**: Name, gender, gluten-free status
3. **Preferences**: Food preferences (vegetarian, vegan, etc.) and activity level
4. **Goals**: Select nutrition goal (weight loss, muscle gain, maintenance, performance)
5. **Success**: View profile summary and dining hall scanning instructions

## Design Principles

### Apple HIG Compliance
- Rounded cards (16px border radius)
- Large tap targets (minimum 44x44px)
- iOS-style colors (#007AFF blue)
- SF Pro Display typography
- Smooth transitions and animations

### Accessibility Features
- WCAG AA color contrast ratios
- Keyboard navigation support
- ARIA labels and roles
- Focus indicators
- Screen reader friendly
- Semantic HTML

## Known Issues (Intentional)

⚠️ **Missing Password Validation in Backend**: The Flask API does not validate if the password field is empty before inserting into the database. This is an intentional error for demonstration purposes.

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/signup` - Create new user account
- `POST /api/onboarding/complete` - Complete onboarding questionnaire

## PWA Features

- Service worker for offline support
- Web app manifest for installation
- Mobile-optimized viewport
- Apple touch icons support

## Project Structure

```
nutri-project/
├── server/
│   └── app.py              # Flask backend with SQLite3
├── client/
│   ├── public/
│   │   ├── index.html      # PWA-enabled HTML
│   │   └── manifest.json   # PWA manifest
│   └── src/
│       ├── components/
│       │   ├── SignUpForm.js
│       │   ├── OnboardingQuestionnaire.js
│       │   └── SuccessScreen.js
│       ├── App.js
│       ├── App.css         # Apple HIG styles
│       └── serviceWorkerRegistration.js
└── requirements.txt
```

## Team

Hewan Kidanemariam, Katherine Harvey, Waseem Ahmad, Maria Priebe Rocha, Nico Fidalgo

**[Google Drive Link](https://drive.google.com/drive/folders/1dKW0DE_A_zDPKRCA3VlAjAYWQKWR3-yu?usp=drive_link)**

---

**Note**: This is Prototype 2 of multiple design iterations. See branch `hewan-p1` for Material Design prototype.