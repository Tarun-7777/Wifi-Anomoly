import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score
import joblib
import os
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, 'live_traffic.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'model.pkl')
SCALER_PATH = os.path.join(BASE_DIR, 'scaler.pkl')


class WiFiAnomalyDetector:
    def __init__(self):
        self.model = None
        self.scaler = None

    def prepare_features(self, df):
        df['Length'] = pd.to_numeric(df['Length'], errors='coerce').fillna(0)
        df['Protocol_Type'] = pd.to_numeric(df.get('Proto', 0), errors='coerce').fillna(0)

        if 'Time' in df.columns:
            try:
                time_col = pd.to_datetime(df['Time'], errors='coerce')
                time_diff = time_col.diff().dt.total_seconds().fillna(1.0)
                df['Packet_Rate'] = 1.0 / time_diff.replace(0, 1.0)
            except:
                df['Packet_Rate'] = np.random.normal(50, 10, len(df))
        else:
            df['Packet_Rate'] = np.random.normal(50, 10, len(df))

        return df[['Length', 'Protocol_Type', 'Packet_Rate']]

    def train_model(self, contamination=0.1):
        if not os.path.exists(CSV_PATH):
            print(f"CSV not found at {CSV_PATH}")
            return None, None

        df = pd.read_csv(CSV_PATH)
        if df.empty:
            print("CSV file is empty")
            return None, None

        df['Label'] = df['Length'].apply(lambda x: 1 if x > 1000 else 0)

        features = self.prepare_features(df)
        self.scaler = StandardScaler()
        features_scaled = self.scaler.fit_transform(features)

        self.model = IsolationForest(contamination=contamination, random_state=42)
        self.model.fit(features_scaled)

        joblib.dump(self.model, MODEL_PATH)
        joblib.dump(self.scaler, SCALER_PATH)

        predictions = self.model.predict(features_scaled)
        predicted_labels = [1 if p == -1 else 0 for p in predictions]
        accuracy = accuracy_score(df['Label'], predicted_labels)

        print("\nModel Training Completed!")
        print(f"Accuracy: {accuracy * 100:.2f}%")
        print(f"Total packets: {len(df)}")
        print(f"Normal packets: {sum(df['Label'] == 0)}")
        print(f"Anomalous packets: {sum(df['Label'] == 1)}\n")

        return self.model, self.scaler

    def load_model(self):
        try:
            self.model = joblib.load(MODEL_PATH)
            self.scaler = joblib.load(SCALER_PATH)
            return True
        except FileNotFoundError:
            print("Model or scaler not found.")
            return False

    def predict_anomalies(self, df):
        if self.model is None or self.scaler is None:
            if not self.load_model():
                return None, None

        features = self.prepare_features(df)
        features_scaled = self.scaler.transform(features)

        predictions = self.model.predict(features_scaled)
        scores = self.model.decision_function(features_scaled)
        return predictions, scores

    def get_anomaly_statistics(self, df):
        predictions, scores = self.predict_anomalies(df)
        df = df.copy()
        df['Prediction'] = predictions
        df['Anomaly_Score'] = scores
        df['Status'] = df['Prediction'].apply(lambda x: "Anomaly" if x == -1 else "Normal")

        stats = {
            'total_packets': len(df),
            'normal_packets': len(df[df['Status'] == 'Normal']),
            'anomaly_packets': len(df[df['Status'] == 'Anomaly']),
            'anomaly_percentage': (len(df[df['Status'] == 'Anomaly']) / len(df)) * 100
        }

        return df, stats


# Instance for external use
detector = WiFiAnomalyDetector()

def train_anomaly_model():
    return detector.train_model()

def predict_anomalies(df):
    return detector.predict_anomalies(df)

def get_anomaly_stats(df):
    return detector.get_anomaly_statistics(df)


# Run standalone for testing
if __name__ == "__main__":
    detector.train_model()
