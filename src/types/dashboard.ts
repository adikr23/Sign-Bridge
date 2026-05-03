export type ContextMode = "General" | "Medical" | "Travel" | "Emergency";

export interface TelemetryData {
  flex: number[];
  accel: {
    x: string;
    y: string;
    z: string;
  };
  timestamp: number;
}

export interface PredictionState {
  word: string;
  confidence: number;
  suggestions: string[];
}
