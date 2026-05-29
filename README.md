# 🕵️‍♂️ Imposter (Social Deduction Party Game)

A premium, real-time multiplayer social deduction party game inspired by the viral hit *Fakeit*. The game can be played locally (in the same room) or over the internet, and is built to run flawlessly on both **Web** and **Mobile** using **React Native / Expo** and **Firebase Realtime Database**.

---

## 🎮 Game Rules & Concept

1. **Setup**: A host creates a room, selects a category, sets the timer, and shares the **Room Code** with 4 to 8 players.
2. **Role Assignment**: Once the game starts:
   - Most players are assigned the **Secret Word** (e.g., *Airplane*).
   - One player is assigned the role of the **Imposter** (who is shown *"You are the Imposter. You do not know the word. Try to blend in!"*).
3. **Clue Phase**: Players take turns writing a single-word clue.
   - **Crucial Rule**: The turn order is randomized, but the **Imposter never goes first** (to prevent them from being immediately exposed without any context).
4. **Discussion**: A countdown timer fires, and players discuss who they think the Imposter is.
5. **Voting**: Players vote simultaneously on who they believe is the Imposter.
6. **Reveal & Guessing**:
   - If the Imposter is **not caught** (escapes), the Imposter wins bonus points!
   - If the Imposter **is caught**, they get one last **20-second chance** to guess the Secret Word from a list of options. If they guess correctly, they steal the victory!
7. **Scoreboard**: Scores are tracked dynamically across multiple rounds, complete with premium animations and a confetti celebration.

---

## ✨ Features Built

- **Cross-Platform Design**: Responsive, modern dark/light themed UI that scales dynamically on Web and Mobile using relative layout heights and responsive dimensions.
- **Fair-Play Game Logic**:
  - **Fisher-Yates Shuffle**: True random assignment of roles every round to prevent repetitive role selection.
  - **Imposter Safety**: Guarantees a non-imposter always goes first in turn order.
- **Dynamic Score System**:
  - **Imposter Escapes (Not Caught)**: `+200 pts` to the Imposter.
  - **Imposter Caught + Guesses Secret Word**: `+300 pts` to the Imposter.
  - **Players Win (Imposter Caught & Fails Guess)**: `+100 pts` to each non-imposter.
  - Uses atomic transactions on Firebase database nodes to prevent double-scoring.
- **Live Real-time Sync**: Synced room states, lobby user lists, turns, live voting, and round-over statuses powered by Firebase Realtime Database.
- **6 Category Packs**: General, Family, Adult, Movies & TV, Sports, and Food & Drinks.

---

## 🛠️ Tech Stack

- **Framework**: Expo / React Native (supporting iOS, Android, and Web)
- **Real-time Engine**: Firebase Realtime Database (RTDB)
- **Styling & Assets**: Custom React Native stylesheet design, `expo-linear-gradient` for premium aesthetics, and responsive layout calculations.

---

## ⚙️ Installation & Setup

### 1. Clone & Install Dependencies
First, fork and clone your repository, then run:
```bash
cd imposter-game
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and add your Firebase configurations (see `.env.example`):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your_database_url.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> [!NOTE]
> Make sure to enable **Anonymous Authentication** (or Email/Password) and **Realtime Database** with read/write rules enabled in your Firebase console.

---

## 🚀 Running the App

### Start the Development Server
```bash
npm run dev
# OR for web-specific execution
npm run web
```

- **Testing Web**: Open `http://localhost:8081` in your browser. You can open multiple tabs (incognito or different browsers) to test multiplayer locally.
- **Testing Mobile**: Install the **Expo Go** app on your phone and scan the QR code displayed in the terminal.

---

