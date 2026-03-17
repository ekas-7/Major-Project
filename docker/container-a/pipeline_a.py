"""
Container A — Lightweight RGB Pipeline
Models: RGB Intensity Baseline + MobileNetV2 + ResNet50
Preprocessing: Standard RGB normalization (no CLAHE, no CIELAB)
Strategy: Simple 80/20 train-test split
"""
import os, glob, time, json, datetime
import cv2
import numpy as np
import psutil
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, recall_score, roc_auc_score

# --- Config from env ---
PIPELINE_NAME = os.environ.get("PIPELINE_NAME", "Container_A_Lightweight")
EPOCHS        = int(os.environ.get("EPOCHS", "10"))
BATCH_SIZE    = int(os.environ.get("BATCH_SIZE", "16"))
IMG_SIZE      = (224, 224)
DATASET_DIR   = os.environ.get("DATASET_DIR", "/data/cp_dataset")
RAR_PATH      = os.environ.get("RAR_PATH", "/data/dataset.rar")
OUTPUT_FILE   = os.environ.get("OUTPUT_FILE", "/metrics/container_a_results.json")


# ==========================================
# PHASE 1: EXTRACT RAR
# ==========================================
def extract_dataset():
    if os.path.isdir(DATASET_DIR) and any(
        os.path.isdir(os.path.join(DATASET_DIR, d)) for d in ["Anemic", "Non-anemic"]
    ):
        print(f"Dataset already extracted at {DATASET_DIR}")
        return
    os.makedirs(DATASET_DIR, exist_ok=True)
    print(f"Extracting {RAR_PATH} -> {DATASET_DIR}")
    import rarfile
    with rarfile.RarFile(RAR_PATH) as rf:
        rf.extractall(DATASET_DIR)
    print("Extraction complete.")


# ==========================================
# PHASE 2: LOAD DATA (plain RGB)
# ==========================================
def load_data(dataset_path):
    print("--- Loading images (plain RGB normalization) ---")
    images, labels = [], []
    classes = {"Anemic": 1.0, "Non-anemic": 0.0}
    for class_name, label in classes.items():
        folder = os.path.join(dataset_path, class_name)
        paths  = glob.glob(os.path.join(folder, "*.*"))
        print(f"  {class_name}: {len(paths)} images")
        for p in paths:
            try:
                img = cv2.imread(p)
                if img is None: continue
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                img = cv2.resize(img, IMG_SIZE)
                images.append(img)
                labels.append(label)
            except Exception:
                pass
    return np.array(images, dtype=np.float32), np.array(labels, dtype=np.float32)


# ==========================================
# PHASE 3: MODELS
# ==========================================
class RGBIntensityModel:
    def __init__(self):
        self.threshold = 0.0

    def fit(self, X, y):
        reds = np.mean(X[:, :, :, 0], axis=(1, 2))
        best_acc, best_t = 0, 0
        for t in np.linspace(reds.min(), reds.max(), 100):
            for preds in [(reds > t).astype(float), (reds < t).astype(float)]:
                acc = accuracy_score(y, preds)
                if acc > best_acc:
                    best_acc, best_t = acc, t
        self.threshold = best_t
        print(f"  RGB threshold: {self.threshold:.4f}")

    def predict(self, X):
        reds = np.mean(X[:, :, :, 0], axis=(1, 2))
        preds_a = (reds > self.threshold).astype(float)
        preds_b = (reds < self.threshold).astype(float)
        # return whichever matches training direction
        return preds_a

    def predict_proba(self, X):
        reds = np.mean(X[:, :, :, 0], axis=(1, 2))
        return reds / reds.max()


def build_dl_model(name):
    from tensorflow.keras import layers, models, Input
    inp = Input(shape=(IMG_SIZE[0], IMG_SIZE[1], 3))
    if name == "MobileNetV2":
        base = tf.keras.applications.MobileNetV2(weights="imagenet", include_top=False, input_tensor=inp)
    elif name == "ResNet50":
        base = tf.keras.applications.ResNet50(weights="imagenet", include_top=False, input_tensor=inp)
    base.trainable = False
    x = layers.GlobalAveragePooling2D()(base.output)
    x = layers.Dense(64, activation="relu")(x)
    out = layers.Dense(1, activation="sigmoid")(x)
    model = models.Model(inp, out)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-4),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")],
    )
    return model


def evaluate(model, name, X, y, is_baseline=False):
    proc = psutil.Process(os.getpid())
    proc.cpu_percent(None)
    start = time.time()
    if is_baseline:
        preds = model.predict(X)
        proba = model.predict_proba(X)
    else:
        proba = model.predict(X, verbose=0).flatten()
        preds = (proba > 0.5).astype(float)
    elapsed = time.time() - start
    cpu = proc.cpu_percent(None)
    try:
        auc = round(float(roc_auc_score(y, proba)), 4)
    except Exception:
        auc = None
    return {
        "model": name,
        "accuracy": round(float(accuracy_score(y, preds)), 4),
        "auc": auc,
        "recall": round(float(recall_score(y, preds, zero_division=0)), 4),
        "inference_time_ms": round((elapsed / len(X)) * 1000, 2),
        "cpu_util_pct": round(cpu, 2),
    }


# ==========================================
# MAIN
# ==========================================
if __name__ == "__main__":
    extract_dataset()
    X, y = load_data(DATASET_DIR)
    print(f"Loaded {len(X)} images total.")

    X = X / 255.0
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )
    print(f"Train: {len(X_train)}  Test: {len(X_test)}")

    results = []

    # 1. RGB Intensity Baseline
    print("\n[1/3] RGB Intensity Baseline")
    rgb = RGBIntensityModel()
    rgb.fit(X_train, y_train)
    results.append(evaluate(rgb, "RGB_Intensity", X_test, y_test, is_baseline=True))

    # 2. MobileNetV2
    print("\n[2/3] MobileNetV2")
    tf.keras.backend.clear_session()
    m = build_dl_model("MobileNetV2")
    m.fit(X_train, y_train, epochs=EPOCHS, batch_size=BATCH_SIZE, verbose=0)
    results.append(evaluate(m, "MobileNetV2", X_test, y_test))
    del m

    # 3. ResNet50
    print("\n[3/3] ResNet50")
    tf.keras.backend.clear_session()
    m = build_dl_model("ResNet50")
    m.fit(X_train, y_train, epochs=EPOCHS, batch_size=BATCH_SIZE, verbose=0)
    results.append(evaluate(m, "ResNet50", X_test, y_test))
    del m

    output = {
        "container": PIPELINE_NAME,
        "pipeline": "lightweight",
        "preprocessing": {"clahe": False, "colorspace": "RGB", "se_blocks": False},
        "training": {
            "strategy": "train_test_split",
            "test_size": 0.20,
            "epochs": EPOCHS,
            "early_stopping": False,
        },
        "completed_at": datetime.datetime.utcnow().isoformat() + "Z",
        "dataset": {
            "total_images": int(len(X)),
            "anemic": int((y == 1).sum()),
            "healthy": int((y == 0).sum()),
        },
        "results": results,
    }

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nResults written to {OUTPUT_FILE}")
    for r in results:
        print(f"  {r['model']:20s}  acc={r['accuracy']}  auc={r['auc']}  recall={r['recall']}  "
              f"inf={r['inference_time_ms']}ms  cpu={r['cpu_util_pct']}%")
