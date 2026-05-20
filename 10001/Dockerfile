FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app
ENV CELERY_BROKER_URL=redis://redis:6379/0
ENV CELERY_RESULT_BACKEND=redis://redis:6379/0
ENV SQLALCHEMY_DATABASE_URL=sqlite:///data/task_scheduler.db

RUN mkdir -p /app/data

EXPOSE 8000
