# Coaching Hub 🏋️‍♂️

A cross-platform mobile fitness app built with React Native (Expo), integrating workouts, nutrition tracking, health metrics, community features, and daily motivation.

> **COM668 Computing Project** · Ulster University · Adrian Dallas (B00902149)

---

## 🎬 Demo

[![Coaching Hub App Demo](https://img.youtube.com/vi/B0vKgBGfV-c/maxresdefault.jpg)](https://youtu.be/Ksfxh4NRMzQ)

▶️ **[Watch Full Demo on YouTube](https://youtu.be/Ksfxh4NRMzQ)**

---

## 📱 Screenshots

| Signup                                   | Dashboard                                      | My Health                                  |
|------------------------------------------|------------------------------------------------|--------------------------------------------|
| ![Signup](FFFApp/screenshots/Signup.png) | ![Dashboard](FFFApp/screenshots/Dashboard.png) | ![Health](FFFApp/screenshots/MyHealth.png) |

| Exercise                                     | Nutrition                                      | Community                                      |
|----------------------------------------------|------------------------------------------------|------------------------------------------------|
| ![Exercise](FFFApp/screenshots/Exercise.png) | ![Nutrition](FFFApp/screenshots/Nutrition.png) | ![Community](FFFApp/screenshots/Community.png) |

| Profile                                    | Search                                   |
|--------------------------------------------|------------------------------------------|
| ![Profile](FFFApp/screenshots/Profile.png) | ![Search](FFFApp/screenshots/Search.png) |

| ExerciseDemo                                         | AddPost                                    | Macros                                   |
|------------------------------------------------------|--------------------------------------------|------------------------------------------|
| ![ExerciseDemo](FFFApp/screenshots/ExerciseDemo.png) | ![AddPost](FFFApp/screenshots/AddPost.png) | ![Macros](FFFApp/screenshots/Macros.png) | |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React Native, Expo |
| State | Redux Toolkit |
| Navigation | React Navigation |
| Backend | Node.js, Express |
| Database | MongoDB Atlas |
| Auth | JWT / Firebase |
| UI | NativeBase |

## Key Features

- 🔐 JWT Authentication (login / register)
- 📊 Unified health dashboard (weight, sleep, BPM, activity)
- 💪 Exercise database with video demos and ratings
- 🥗 Nutrition logging with calorie tracking
- 👥 Community newsfeed — post workouts, leave reviews
- 📖 Daily Quote API integration
- 🔍 Exercise search by name, muscle group, equipment

## Project Structure
```
FFFApp/
├── backend/           # Node.js / Express API
│   ├── models/        # Mongoose schemas
│   ├── routes/        # REST endpoints (~20-25 routes)
│   └── server.js
├── src/
│   ├── components/    # Reusable UI components
│   ├── screens/       # App screens
│   ├── navigation/    # React Navigation setup
│   └── store/         # Redux slices
├── screenshots/       # App screenshots
└── App.tsx
```

## Getting Started
```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Configure environment
cp backend/.env.example backend/.env
# Add your MongoDB URI and JWT secret

# Run
npm start             # Expo (frontend)
cd backend && npm start  # Backend API
```

## Contact

**Adrian Dallas** · B00902149  
📧 [amccrea354@gmail.com](mailto:amccrea354@gmail.com)  
🔗 [LinkedIn](https://www.linkedin.com/in/adriandallas1995/) | [Portfolio](#)
