# CrimsonFuel - Prototype 3 (Conversational UI)

A conversational chat-style onboarding experience for students with severe allergies.

## Overview

This prototype uses a unique chat interface with Microsoft Fluent Design to create an engaging, friendly onboarding experience focused on allergy safety.

## Tech Stack

- **Frontend**: React 18, Fluent UI (Microsoft)
- **Backend**: Django 4.2, Django REST Framework
- **Database**: PostgreSQL (mocked with SQLite)
- **Design**: Microsoft Fluent Design System

## Features

- **Conversational UI**: Chat-style onboarding instead of forms
- **Allergy-Focused**: Multi-select allergy management
- **Fluent Design**: Acrylic effects, reveal animations, modern aesthetics
- **Safety Badge**: Verified profile indicator
- **Real-time Chat**: Typing indicators and smooth animations
- **Unique Design**: Completely different from card-based prototypes

## Installation

### Backend (Django)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run migrations
cd server
python manage.py makemigrations
python manage.py migrate

# Run Django server
python manage.py runserver
```

Server runs on http://localhost:8000

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

1. **Welcome**: Bot greets user and asks for name
2. **Allergies**: Multi-select chips for severe allergies
3. **Diet Goal**: Choose nutrition objective
4. **Activity Level**: Select typical activity
5. **Confirmation**: Profile summary with safety badge

## Design Principles

### Microsoft Fluent Design
- Acrylic material (frosted glass effect)
- Reveal effects on hover
- Depth and layering
- Smooth animations
- Modern gradient backgrounds

### Conversational UX
- Chat bubbles instead of forms
- Typing indicators
- Friendly bot personality
- Progressive disclosure
- Natural conversation flow

## What Makes This Different

**vs. Prototype 1 (Material Design)**:
- Chat UI vs. stepper forms
- Conversational vs. structured
- Fluent vs. Material Design

**vs. Prototype 2 (Apple HIG)**:
- Desktop-first vs. mobile-first
- Chat interface vs. card forms
- Gradient backgrounds vs. minimal design

## Team

Hewan Kidanemariam, Katherine Harvey, Waseem Ahmad, Maria Priebe Rocha, Nico Fidalgo

**[Google Drive Link](https://drive.google.com/drive/folders/1dKW0DE_A_zDPKRCA3VlAjAYWQKWR3-yu?usp=drive_link)**

---

**Note**: This is Prototype 3 of multiple design iterations. See branches `hewan-p1` and `hewan-p2` for other prototypes.