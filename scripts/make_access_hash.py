"""Generate the SHA-256 hash of an access code for ACCESS_CODE_HASH.

The plaintext code never leaves your machine or lives in the repo — only its
hash is stored in the backend host's environment.

Usage:
    python scripts/make_access_hash.py "my secret access code"

Copy the printed value into ACCESS_CODE_HASH on Render (or your .env).
"""
from __future__ import annotations

import hashlib
import sys


def main() -> int:
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        print('Usage: python scripts/make_access_hash.py "<access code>"', file=sys.stderr)
        return 1
    code = sys.argv[1].strip()
    print(hashlib.sha256(code.encode("utf-8")).hexdigest())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
