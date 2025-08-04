import os
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

# ✅ Get absolute path to the CSV file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(BASE_DIR, 'live_traffic.csv')

# Step 1: Load data
df = pd.read_csv(file_path)

# Step 2: Clean data
df.dropna(inplace=True)
df = df[df['Length'] < 2000]

# Step 3: Features
features = df[['Length']]

# Step 4: Train model
model = IsolationForest(contamination=0.05, random_state=42)
model.fit(features)

# Step 5: Save model in the same directory
model_path = os.path.join(BASE_DIR, 'model.pkl')
joblib.dump(model, model_path)

print("✅ Model trained and saved to:", model_path)
