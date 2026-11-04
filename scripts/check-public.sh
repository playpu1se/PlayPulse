#!/usr/bin/env bash
# 공개(push) 전 검사: scripts/check-public.sh [브랜치]  (기본 = 현재 HEAD)
# 작업 폴더가 아니라 그 브랜치에 들어 있는 내용만 봐요.
set -u
git() { command git -c core.quotepath=off "$@"; }
export LC_ALL="${LC_ALL:-en_US.UTF-8}"
REF="${1:-HEAD}"
OK_NAME="playpu1se"
OK_MAIL="352357684+playpu1se@users.noreply.github.com"
# 찾을 글자 목록은 저장소 밖(이 컴퓨터에만 있는 파일)에서 읽어요. 목록 자체가 공개되면 안 되니까요.
PATTERN_FILE="${PUBLIC_PATTERN_FILE:-_private/public-patterns.txt}"
if [ ! -s "$PATTERN_FILE" ]; then
  echo "찾을 글자 목록 파일이 없어요: $PATTERN_FILE (한 줄에 하나씩)"; exit 1
fi
PATTERN=$(grep -v '^[[:space:]]*$' "$PATTERN_FILE" | grep -v '^#' | paste -sd'|' -)
PATTERN="$PATTERN|/Users/"
PROBLEMS=0

if ! git rev-parse --verify -q "$REF^{commit}" >/dev/null; then
  echo "브랜치를 찾을 수 없어요: $REF"; exit 1
fi
echo "검사 대상: $REF"

# 1) 작성자 / 커밋한 사람
BAD=$(git log --format='%h|%an|%ae|%cn|%ce' "$REF" -- | awk -F'|' -v n="$OK_NAME" -v m="$OK_MAIL" \
  '$2!=n || $3!=m || $4!=n || $5!=m')
if [ -n "$BAD" ]; then
  CNT=$(printf '%s\n' "$BAD" | wc -l | tr -d ' ')
  echo "[문제] 작성자/커밋한 사람이 다른 커밋 ${CNT}개:"
  printf '%s\n' "$BAD" | head -10 | cut -c1-120 | sed 's/^/  /'
  [ "$CNT" -gt 10 ] && echo "  ... (나머지 생략)"
  PROBLEMS=$((PROBLEMS+CNT))
fi

# 2) 내용 검사 (package-lock.json 은 /Users/ 만)
HITS=$(git grep -n -I -i -E "$PATTERN" "$REF" -- . ':(exclude)package-lock.json' ':(exclude)scripts/check-public.sh' 2>/dev/null)
LOCK=$(git grep -n -I -E '/Users/' "$REF" -- package-lock.json 2>/dev/null)
ALL=$(printf '%s\n%s\n' "$HITS" "$LOCK" | sed '/^$/d')
if [ -n "$ALL" ]; then
  CNT=$(printf '%s\n' "$ALL" | wc -l | tr -d ' ')
  echo "[문제] 개인 정보가 들어 있는 줄 ${CNT}개 (파일:줄):"
  printf '%s\n' "$ALL" | sed "s|^$REF:||" | cut -c1-120 | head -50 | sed 's/^/  /'
  [ "$CNT" -gt 50 ] && echo "  ... (나머지 생략)"
  PROBLEMS=$((PROBLEMS+CNT))
fi
# 2-1) 지난 커밋 기록 안까지 (지금 파일에서 지워도 기록에 남으면 공개돼요)
HIST=$(for c in $(git rev-list "$REF" --); do git grep -l -I -i -E "$PATTERN" "$c" -- . ':(exclude)package-lock.json' ':(exclude)scripts/check-public.sh' 2>/dev/null; done | sed 's|^[0-9a-f]*:||' | sort -u)
if [ -n "$HIST" ]; then
  CNT=$(printf '%s\n' "$HIST" | wc -l | tr -d ' ')
  echo "[문제] 지난 커밋 기록에 개인 정보가 남은 파일 ${CNT}개:"
  printf '%s\n' "$HIST" | head -20 | sed 's/^/  /'
  PROBLEMS=$((PROBLEMS+CNT))
fi
# 파일 이름에 들어 있는 경우도 확인
NAMES=$(git ls-tree -r --name-only "$REF" | grep -i -E "$PATTERN")
if [ -n "$NAMES" ]; then
  echo "[문제] 파일 이름에 개인 정보:"
  printf '%s\n' "$NAMES" | cut -c1-120 | sed 's/^/  /'
  PROBLEMS=$((PROBLEMS+$(printf '%s\n' "$NAMES" | wc -l)))
fi

# 3) 비밀 파일처럼 보이는 경로
SECRET=$(git ls-tree -r --name-only "$REF" | grep -E \
  '(^|/)\.env($|\.)|\.db$|\.sqlite|(^|/)data/|(^|/)_private/|(^|/)id_ed25519|\.pem$|\.key$' \
  | grep -v -E '(^|/)\.env\.example$')
if [ -n "$SECRET" ]; then
  echo "[문제] 비밀 파일처럼 보이는 경로:"
  printf '%s\n' "$SECRET" | cut -c1-120 | sed 's/^/  /'
  PROBLEMS=$((PROBLEMS+$(printf '%s\n' "$SECRET" | wc -l)))
fi

echo "----"
if [ "$PROBLEMS" -gt 0 ]; then
  echo "공개하면 안 돼요: 문제 ${PROBLEMS}건. 고친 뒤 다시 검사하세요."
  exit 1
fi
echo "공개해도 안전해요"
exit 0
