# 🥗 NutriMe

**NutriMe** is an AI-powered personalized nutrition assistant designed to help users track their meals, analyze nutritional content, and achieve their health goals through real-time feedback and intelligent insights.

---

## 🚀 Features

- **Real-time Food Detection**: Leverages advanced AI models (YOLO/ONNX) to identify food items directly from your camera.
- **Nutritional Analysis**: Instant breakdown of calories, macros (carbs, protein, fats), and micronutrients for scanned meals.
- **Interactive AI Nutritionist**: A dedicated chat assistant that provides personalized advice based on your meal scans and profile.
- **Meal Logging and History**: Keep a detailed record of your nutrition journey with a visual history of past meals.
- **Personalized Profile Setup**: Customizes nutritional goals and advice based on user-specific data like age, weight, and activity level.
- **Smooth Dashboard**: A modern, responsive interface with real-time performance tracking (FPS).

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) (for animations)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **AI/ML**: [onnxruntime-web](https://onnxruntime.ai/) (for browser-based inference)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)

---

## 📁 Project Structure

```text
src/
├── components/     # Reusable UI components (Protected Routes, etc.)
├── contexts/       # React Contexts for global state (AuthContext)
├── layouts/        # Page layouts (AuthLayout, DashboardLayout)
├── lib/            # External library configurations (Supabase client)
├── pages/          # Individual application pages
│   ├── AnalysisResult.jsx  # AI Analysis and Nutritionist Chat
│   ├── Dashboard.jsx       # Real-time camera and quick stats
│   ├── Landing.jsx         # Project entry point
│   ├── LogMeal.jsx         # Manual meal logging
│   └── ...
├── utils/           # Helper functions and utilities
└── App.jsx          # Root component and routing logic
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js (version 18 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd NutriMe
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🧠 AI Model

The project uses a custom-trained ONNX model for food detection. The model is located in `public/models/best.onnx` and is executed directly in the browser using WebGL/WASM execution providers for optimal performance.

---

## 📄 License

This project is for educational/personal use.

---

*Made with ❤️ by the NutriMe Team*
