This directory stores pre-seeded tiktoken cache files for offline token counting.

Seeded encodings:
- o200k_base (downloaded via `TIKTOKEN_CACHE_DIR=./data/tiktoken-cache python - <<'PY'\nimport tiktoken\ntiktoken.get_encoding("o200k_base")\nPY`)

The cache is copied into container images and mounted into compose services so
that the first tokenization call does not require internet access.
