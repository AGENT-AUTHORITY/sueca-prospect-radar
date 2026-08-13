"""In-process control for background search runs (stop flags + concurrency).

max_concurrency is 1 by policy: one search run at a time. STOP is honored
cooperatively — the engine checks `should_stop` between queries and companies.
"""
from __future__ import annotations

import threading

_lock = threading.Lock()
_stop_events: dict[int, threading.Event] = {}
_active: set[int] = set()


def register(run_id: int) -> threading.Event:
    with _lock:
        ev = threading.Event()
        _stop_events[run_id] = ev
        _active.add(run_id)
        return ev


def request_stop(run_id: int) -> bool:
    with _lock:
        ev = _stop_events.get(run_id)
    if ev:
        ev.set()
        return True
    return False


def should_stop(run_id: int) -> bool:
    ev = _stop_events.get(run_id)
    return ev.is_set() if ev else False


def finish(run_id: int) -> None:
    with _lock:
        _stop_events.pop(run_id, None)
        _active.discard(run_id)


def has_active() -> bool:
    with _lock:
        return bool(_active)


def active_run_ids() -> list[int]:
    with _lock:
        return list(_active)
