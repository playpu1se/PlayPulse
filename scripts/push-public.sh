#!/usr/bin/env bash
# 공개 저장소에 올리기: 익명 검사를 통과해야만 올려요. 사용: scripts/push-public.sh
set -euo pipefail
cd "$(dirname "$0")/.."
BRANCH=release
if ! scripts/check-public.sh "$BRANCH"; then
  echo "검사 실패 → 올리지 않았어요."
  exit 1
fi
git -c credential.helper= -c 'credential.helper=!f() { echo username=playpu1se; echo "password=$(gh auth token --user playpu1se)"; }; f' \
  push origin "$BRANCH:main"
