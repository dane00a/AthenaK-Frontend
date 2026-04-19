from __future__ import annotations

from celery import Celery

from ..config import settings

celery = Celery(
    "athenak_frontend",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
)
