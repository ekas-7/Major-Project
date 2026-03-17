"""
Container B — Advanced CIELAB + CLAHE Pipeline
Models: LAB_Intensity_Baseline + ResNet50_SE + DenseNet121_SE
Preprocessing: CIELAB color space + CLAHE contrast enhancement
Strategy: 5-Fold Cross-Validation with EarlyStopping + ReduceLROnPlateau
"""
import os, glob, time, json, datetime
import cv2
import numpy as np
import psutil
import tensorflow as tf
from sklearn.model_selection import KFold
from sklearn.metrics import accuracy_score, recall_score, roc_auc_score

# --- Config from env ---
PIPELINE_NAME = os.environ.get("PIPELINE_NAME", "Container_B_Advanced")
EPOCHS        = int(os.environ.get("EPOCHS", "15"))
BATCH_SIZE    = int(os.environ.get("BATCH_SIZE", "16"))
K_FOLDS       = int(os.environ.get("K_FOLDS", "5"))
IMG_SIZE      = (224, 224)
DATASET_DIR   = os.environ.get("DATASET_DIR", "/data/cp_dataset")
RAR_PATH      = os.environ.get("RAR_PATH", "/data/dataset.rar")
OUTPUT_FILE   = os.environ.get("OUTPUT_FILE", "/metrics/container_b_results.json")


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
    import patoolib
    patoolib.extract_archive(RAR_PATH, outdir=DATASET_DIR)
    print("Extraction complete.")


# ==========================================
# PHASE 2: LOAD DATA (CIELAB + CLAHE)
# ==========================================
def load_data(dataset_path):
    print("--- Loading images (CIELAB + CLAHE preprocessing) ---")
    images, labels = [], []
    classes = {"Anemic": 1.0, "Non-anemic": 0.0}
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    for class_name, label in classes.items():
        folder = os.path.join(dataset_path, class_name)
        paths  = glob.glob(os.path.join(folder, "*.*"))
        print(f"  {class_name}: {len(paths)} images")
        for p in paths:
            try:
                img = cv2.imread(p)
                if img is None: continue
                lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
                l, a, b = cv2.split(lab)
                l_enh = clahe.apply(l)
                lab_enh = cv2.merge((l_enh, a, b))
                img_resized = cv2.resize(lab_enh, IMG_SIZE)
                images.append(img_resized)
                labels.append(label)
            except Exception as e:
                print(f"  Error: {p}: {e}")
    return np.array(images, dtype=np.float32), np.array(labels, dtype=np.float32)


# ==========================================
# PHASE 3: MODELS
# ==========================================
class LABIntensityModel:
    """Uses the 'a' channel (red-green axis in LAB) as a proxy for pallor."""
    def __init__(self):
        self.threshold = 0.0
        self.channel = 1  # 'a' channel in LAB

    def fit(self, X, y):
        ch_vals = np.mean(X[:, :, :, self.channel], axis=(1, 2))
        best_acc, best_t = 0, 0
        for t in np.linspace(ch_vals.min(), ch_vals.max(), 100):
            for preds in [(ch_vals > t).astype(float), (ch_vals < t).astype(float)]:
                acc = accuracy_score(y, preds)
                if acc > best_acc:
                    best_acc, best_t = acc, t
        self.threshold = best_t
        print(f"  LAB 'a' channel threshold: {self.threshold:.4f}")

    def predict(self, X):
        ch_vals = np.mean(X[:, :, :, self.channel], axis=(1, 2))
        return (ch_vals > self.threshold).astype(float)

    def predict_proba(self, X):
        ch_vals = np.mean(X[:, :, :, self.channel], axis=(1, 2))
        mn, mx = ch_vals.min(), ch_vals.max()
        return (ch_vals - mn) / (mx - mn + 1e-8)


class SEBlock(tf.keras.layers.Layer):
    def __init__(self, ratio=16, **kwargs):
        super().__init__(**kwargs)
        self.ratio = ratio

    def build(self, input_shape):
        self.channels = input_shape[-1]
        self.squeeze = tf.keras.layers.GlobalAveragePooling2D()
        self.excitation = tf.keras.Sequential([
            tf.keras.layers.Dense(self.channels // self.ratio, activation="relu"),
            tf.keras.layers.Dense(self.channels, activation="sigmoid"),
        ])
        super().build(input_shape)

    def call(self, inputs):
        sq = self.squeeze(inputs)
        ex = self.excitation(sq)
        return inputs * tf.reshape(ex, [-1, 1, 1, self.channels])


def build_resnet_se(learning_rate=3e-5, dense_units=256, dropout=0.4):
    base = tf.keras.applications.ResNet50(weights="imagenet", include_top=False, input_shape=(224, 224, 3))
    base.trainable = False
    inp = tf.keras.layers.Input(shape=(224, 224, 3))
    x = base(inp, training=False)
    x = SEBlock(ratio=16)(x)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dense(dense_units, activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Dropout(dropout)(x)
    out = tf.keras.layers.Dense(1, activation="sigmoid")(x)
    model = tf.keras.Model(inp, out)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")],
    )
    return model


def build_densenet_se(learning_rate=3e-5, dense_units=256, dropout=0.3):
    base = tf.keras.applications.DenseNet121(weights="imagenet", include_top=False, input_shape=(224, 224, 3))
    base.trainable = False
    inp = tf.keras.layers.Input(shape=(224, 224, 3))
    x = base(inp, training=False)
    x = SEBlock(ratio=16)(x)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dense(dense_units, activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Dropout(dropout)(x)
    out = tf.keras.layers.Dense(1, activation="sigmoid")(x)
    model = tf.keras.Model(inp, out)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")],
    )
    return model


# ==========================================
# MAIN
# ==========================================
if __name__ == "__main__":
    extract_dataset()
    X, y = load_data(DATASET_DIR)
    print(f"Loaded {len(X)} images total.")

    X = X / 255.0
    kf = KFold(n_splits=K_FOLDS, shuffle=True, random_state=42)
    all_results = []

    models_to_test = ["LAB_Intensity_Baseline", "ResNet50_SE", "DenseNet121_SE"]

    for m_name in models_to_test:
        print(f"\n{'='*50}")
        print(f"Evaluating {m_name} with {K_FOLDS}-Fold CV")
        print(f"{'='*50}")
        fold_metrics = []

        for fold, (train_idx, val_idx) in enumerate(kf.split(X)):
            print(f"\n--- Fold {fold + 1}/{K_FOLDS} ---")
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]

            proc = psutil.Process(os.getpid())
            proc.cpu_percent(None)
            start_time = time.time()

            if m_name == "LAB_Intensity_Baseline":
                model = LABIntensityModel()
                model.fit(X_train, y_train)
                preds = model.predict(X_val)
                proba = model.predict_proba(X_val)
            else:
                tf.keras.backend.clear_session()
                if m_name == "ResNet50_SE":
                    model = build_resnet_se()
                else:
                    model = build_densenet_se()

                callbacks = [
                    tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
                    tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3),
                ]
                model.fit(
                    X_train, y_train,
                    validation_data=(X_val, y_val),
                    epochs=EPOCHS,
                    batch_size=BATCH_SIZE,
                    callbacks=callbacks,
                    verbose=0,
                )
                proba = model.predict(X_val, verbose=0).flatten()
                preds = (proba > 0.5).astype(float)

            elapsed = time.time() - start_time
            cpu_util = proc.cpu_percent(None)

            acc = float(accuracy_score(y_val, preds))
            rec = float(recall_score(y_val, preds, zero_division=0))
            try:
                auc = float(roc_auc_score(y_val, proba))
            except Exception:
                auc = 0.5
            inf_ms = (elapsed / len(X_val)) * 1000

            print(f"  Fold {fold+1}: acc={acc:.4f} auc={auc:.4f} recall={rec:.4f}")
            fold_metrics.append({
                "fold": fold + 1,
                "accuracy": round(acc, 4),
                "auc": round(auc, 4),
                "recall": round(rec, 4),
                "inference_time_ms": round(inf_ms, 2),
                "cpu_util_pct": round(float(cpu_util), 2),
            })

        avg = lambda k: round(float(np.mean([m[k] for m in fold_metrics])), 4)
        all_results.append({
            "model": m_name,
            "accuracy": avg("accuracy"),
            "auc": avg("auc"),
            "recall": avg("recall"),
            "inference_time_ms": avg("inference_time_ms"),
            "cpu_util_pct": avg("cpu_util_pct"),
            "fold_details": fold_metrics,
        })

    output = {
        "container": PIPELINE_NAME,
        "pipeline": "advanced",
        "preprocessing": {"clahe": True, "colorspace": "CIELAB", "se_blocks": True},
        "training": {
            "strategy": "kfold",
            "k": K_FOLDS,
            "epochs": EPOCHS,
            "early_stopping": True,
        },
        "completed_at": datetime.datetime.utcnow().isoformat() + "Z",
        "dataset": {
            "total_images": int(len(X)),
            "anemic": int((y == 1).sum()),
            "healthy": int((y == 0).sum()),
        },
        "results": all_results,
    }

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nResults written to {OUTPUT_FILE}")
    for r in all_results:
        print(f"  {r['model']:25s}  acc={r['accuracy']}  auc={r['auc']}  recall={r['recall']}  "
              f"inf={r['inference_time_ms']}ms  cpu={r['cpu_util_pct']}%")
