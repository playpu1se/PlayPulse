// 로컬 시험용 계정 만들기: npm run seed:dev
// 로컬 개발 전용이에요. 실제 서비스에 이 계정을 만들지 마세요.
import { createUser } from "../src/lib/auth";

export const DEV_EMAIL = "dev@playpulse.test";
export const DEV_PASSWORD = "playpulse-dev-1234";

if (process.env.TURSO_DATABASE_URL) {
  console.error("서버 DB(TURSO_DATABASE_URL)에는 시험 계정을 만들지 않아요.");
  process.exit(1);
}

const r = await createUser(DEV_EMAIL, DEV_PASSWORD, "시험 계정");
console.log(r.error ? `이미 있거나 실패: ${r.error}` : `만들었어요: ${DEV_EMAIL}`);
