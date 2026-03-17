FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    unrar-free \
    p7zip-full \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pipeline_b.py .

VOLUME ["/data", "/metrics"]

ENV PIPELINE_NAME="Container_B_Advanced"
ENV EPOCHS="15"
ENV BATCH_SIZE="16"
ENV K_FOLDS="5"
ENV DATASET_DIR="/data/cp_dataset"
ENV RAR_PATH="/data/dataset.rar"
ENV OUTPUT_FILE="/metrics/container_b_results.json"

CMD ["python", "pipeline_b.py"]
