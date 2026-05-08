# 🥗 NutriNet

**NutriNet** is an advanced AI-powered personalized health and nutrition assistant. It uniquely combines real-time food detection on the edge with predictive cardiovascular risk modeling, helping users track their dietary habits while monitoring their long-term heart health and hereditary risks.

---

## 🚀 Features

- **Edge AI Food Detection**: Utilizes a custom 15-class YOLO object detection model, converted to ONNX, running directly in the browser via `onnxruntime-web` for real-time, privacy-preserving food identification.
- **Web-Based Multi-Threading**: Features a multi-threaded architecture using Web Workers to decouple heavy AI inference from the main UI thread, ensuring a smooth, responsive camera feed and dashboard.
- **Cardiovascular Risk Prediction**: Integrates a standalone Random Forest machine learning model trained on a 70,000-row dataset to predict cardiovascular risk based on user health metrics (BMI, blood pressure, cholesterol, glucose).
- **Hereditary Risk Logic**: Advanced backend logic to compute a combined family history risk score by analyzing the health profiles of parents and grandparents.
- **Interactive Health Dashboard**: A modern, responsive interface built with React and Tailwind CSS, featuring real-time performance tracking (FPS) and visual meal histories.
- **Secure Authentication & Data Storage**: Powered by Supabase for reliable user authentication and database management.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/)
- **Edge AI Inference**: [onnxruntime-web](https://onnxruntime.ai/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Machine Learning**: `scikit-learn` (Random Forest), `pandas`, `joblib`
- **Database & Auth**: [Supabase](https://supabase.com/)

---

## 📁 Project Structure

```text
NutriNet/
├── backend/          # FastAPI server for Cardio & Hereditary Risk Prediction
│   ├── main.py       # API endpoints and model integration
│   ├── models/       # Pickled Random Forest models
│   └── risk_logic.py # Hereditary risk computation algorithms
├── public/           # Static assets
│   └── models/       # YOLO ONNX models for Edge AI
├── src/              # React Frontend Source
│   ├── components/   # Reusable UI elements
│   ├── contexts/     # Global state management
│   ├── layouts/      # Page structures (Auth, Dashboard)
│   ├── lib/          # External configurations (Supabase client)
│   ├── pages/        # Application views (Dashboard, Setup, etc.)
│   └── utils/        # Helper functions
└── App.jsx           # Root React component
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- npm or yarn

### Frontend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run the React development server**:
   ```bash
   npm run dev
   ```

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install Python dependencies**:
   ```bash
   pip install fastapi uvicorn scikit-learn pandas joblib pydantic
   ```

3. **Start the FastAPI server**:
   ```bash
   python main.py
   ```

---

## 🧠 AI Models Architecture

1. **Food Detection (Edge)**: A highly optimized YOLO model, exported to ONNX format. Inference is executed entirely client-side using WebGL/WASM to guarantee low latency and zero server costs for image processing.
2. **Cardiovascular Assessment (Cloud)**: A Random Forest classifier residing on the FastAPI backend, utilizing health markers to deliver probabilistic cardiovascular risk assessments.

---

## 📄 License

This project is for educational and research purposes.

---

*Made with ❤️ by the NutriNet Team*
