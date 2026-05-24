FROM python:{{.PythonVersion}}-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE {{.AppPort}}

CMD ["python", "app.py"]
