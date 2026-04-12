from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import os

app = FastAPI(title="NutriMe Cardio Risk API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "cardio_rf_model_v1.pkl")
model = None

try:
    model = joblib.load(MODEL_PATH)
    print(f"✅ Model loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"❌ Error loading model: {e}")

from typing import Optional, Literal
from risk_logic import compute_family_history_score

class HealthMetrics(BaseModel):
    age_years: Optional[int] = None
    gender: Optional[int] = None  # 1: Female, 2: Male
    height: Optional[float] = None # cm
    weight: Optional[float] = None # kg
    ap_hi: Optional[int] = None # systolic
    ap_lo: Optional[int] = None # diastolic
    cholesterol_raw: Optional[float] = None # mg/dL
    gluc_raw: Optional[float] = None # mg/dL
    active: Optional[int] = None # 0 or 1

def categorize_cholesterol(val):
    if val < 200: return 1
    elif 200 <= val <= 240: return 2
    else: return 3

def categorize_glucose(val):
    if val < 100: return 1
    elif 100 <= val <= 125: return 2
    else: return 3

def get_risk_probability(metrics: HealthMetrics):
    if model is None:
        return None, "Model not loaded"

    # 0. Impute missing values (Median Strategy)
    age = metrics.age_years if metrics.age_years is not None else 50
    gender = metrics.gender if metrics.gender is not None else 1
    height = metrics.height if metrics.height is not None else (170.0 if gender == 2 else 160.0)
    weight = metrics.weight if metrics.weight is not None else (78.0 if gender == 2 else 65.0)
    ap_hi = metrics.ap_hi if metrics.ap_hi is not None else 120
    ap_lo = metrics.ap_lo if metrics.ap_lo is not None else 80
    cholesterol_raw = metrics.cholesterol_raw if metrics.cholesterol_raw is not None else 190.0
    gluc_raw = metrics.gluc_raw if metrics.gluc_raw is not None else 90.0
    active = metrics.active if metrics.active is not None else 1

    if height <= 0: height = 160.0

    # 1. Categorization
    chol_cat = categorize_cholesterol(cholesterol_raw)
    gluc_cat = categorize_glucose(gluc_raw)

    # 2. Feature Engineering
    bmi = round(weight / (height / 100) ** 2, 2)
    pulse_pressure = ap_hi - ap_lo
    map_val = round((ap_hi + (2 * ap_lo)) / 3, 2)
    chol_gluc_risk = chol_cat * gluc_cat
    age_bp_product = (age * ap_hi) / 100

    feature_dict = {
        'age_years': [age],
        'gender': [gender],
        'height': [height],
        'weight': [weight],
        'bmi': [bmi],
        'ap_hi': [ap_hi],
        'ap_lo': [ap_lo],
        'pulse_pressure': [pulse_pressure],
        'map': [map_val],
        'cholesterol': [chol_cat],
        'gluc': [gluc_cat],
        'active': [active],
        'chol_gluc_risk': [chol_gluc_risk],
        'age_bp_product': [age_bp_product]
    }
    
    input_df = pd.DataFrame(feature_dict)
    prob = model.predict_proba(input_df)[0][1]
    
    return {
        "prob": float(prob),
        "bmi": bmi,
        "pulse_pressure": pulse_pressure,
        "map": map_val,
        "chol_cat": chol_cat,
        "gluc_cat": gluc_cat
    }, None

@app.post("/predict")
async def predict_risk(metrics: HealthMetrics):
    try:
        result, error = get_risk_probability(metrics)
        if error:
            raise HTTPException(status_code=500, detail=error)
        
        return {
            "cardio_risk_probability": result["prob"],
            "engineered_features": {
                "bmi": result["bmi"],
                "pulse_pressure": result["pulse_pressure"],
                "map": result["map"],
                "chol_cat": result["chol_cat"],
                "gluc_cat": result["gluc_cat"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")

class HereditaryRiskRequest(BaseModel):
    offspring_sex: Literal["male", "female"]
    father: HealthMetrics
    mother: HealthMetrics
    grandfather: Optional[HealthMetrics] = None
    grandmother: Optional[HealthMetrics] = None

@app.post("/predict_hereditary")
async def predict_hereditary(req: HereditaryRiskRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded on server.")

    try:
        # Predict for each mandatory relative
        dad_res, _ = get_risk_probability(req.father)
        mom_res, _ = get_risk_probability(req.mother)
        
        # Predict for optional relatives if provided and have data
        # We check age_years as a proxy for 'data provided'
        gpa_res = None
        if req.grandfather and req.grandfather.age_years:
            gpa_res, _ = get_risk_probability(req.grandfather)
            
        gma_res = None
        if req.grandmother and req.grandmother.age_years:
            gma_res, _ = get_risk_probability(req.grandmother)

        # Compute combined score
        score_data = compute_family_history_score(
            offspring_sex=req.offspring_sex,
            dad_prob=dad_res["prob"],
            dad_age=req.father.age_years,
            mom_prob=mom_res["prob"],
            mom_age=req.mother.age_years,
            grandpa_prob=gpa_res["prob"] if gpa_res else None,
            grandpa_age=req.grandfather.age_years if req.grandfather else None,
            grandma_prob=gma_res["prob"] if gma_res else None,
            grandma_age=req.grandmother.age_years if req.grandmother else None
        )

        return score_data

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Hereditary prediction error: {str(e)}")

@app.get("/")
async def root():
    return {"status": "NutriMe Backend is running", "model_loaded": model is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
