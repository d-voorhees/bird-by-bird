ARG PYTHON_VERSION=3.11-slim

FROM python:${PYTHON_VERSION}

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

RUN pip install uv

WORKDIR /code

COPY pyproject.toml uv.lock /code/
RUN uv pip install --system -r pyproject.toml
RUN pip install gunicorn

COPY . /code

EXPOSE 8000

CMD ["gunicorn", "bird_api.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "60"]
