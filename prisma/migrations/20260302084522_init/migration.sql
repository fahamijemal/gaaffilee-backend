-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'teacher', 'admin');

-- CreateEnum
CREATE TYPE "StreamSlug" AS ENUM ('natural', 'social');

-- CreateEnum
CREATE TYPE "StudyMode" AS ENUM ('year_based', 'chapter_based', 'exam_simulation');

-- CreateEnum
CREATE TYPE "QuizMode" AS ENUM ('practice', 'timed');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('in_progress', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('active', 'draft', 'archived');

-- CreateTable
CREATE TABLE "streams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" "StreamSlug" NOT NULL,
    "color_hex" VARCHAR(7) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "stream_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "grade_min" INTEGER NOT NULL,
    "grade_max" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "exam_year" VARCHAR(12) NOT NULL,
    "question_text" TEXT NOT NULL,
    "option_a" VARCHAR(500) NOT NULL,
    "option_b" VARCHAR(500) NOT NULL,
    "option_c" VARCHAR(500) NOT NULL,
    "option_d" VARCHAR(500) NOT NULL,
    "correct_answer" VARCHAR(1) NOT NULL,
    "explanation" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'medium',
    "status" "QuestionStatus" NOT NULL DEFAULT 'active',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(60) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'student',
    "grade" INTEGER,
    "stream" "StreamSlug",
    "school" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "otp_hash" VARCHAR(64),
    "otp_expires_at" TIMESTAMP(3),
    "otp_attempts" INTEGER NOT NULL DEFAULT 0,
    "reset_token_hash" VARCHAR(64),
    "reset_token_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "grade" INTEGER NOT NULL,
    "exam_year" VARCHAR(12),
    "study_mode" "StudyMode" NOT NULL,
    "quiz_mode" "QuizMode" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'in_progress',
    "total_questions" INTEGER NOT NULL,
    "ai_calls_used" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER,
    "percentage" DOUBLE PRECISION,
    "band" VARCHAR(20),
    "total_time_sec" INTEGER,
    "weakness_report_status" VARCHAR(10),
    "weakness_report" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_answers" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "selected" VARCHAR(1),
    "is_correct" BOOLEAN NOT NULL,
    "is_skipped" BOOLEAN NOT NULL DEFAULT false,
    "is_timed_out" BOOLEAN NOT NULL DEFAULT false,
    "ai_hint_used" BOOLEAN NOT NULL DEFAULT false,
    "time_taken_sec" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "streams_slug_key" ON "streams"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_slug_key" ON "subjects"("slug");

-- CreateIndex
CREATE INDEX "subjects_stream_id_idx" ON "subjects"("stream_id");

-- CreateIndex
CREATE INDEX "chapters_subject_id_grade_idx" ON "chapters"("subject_id", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_subject_id_grade_chapter_number_key" ON "chapters"("subject_id", "grade", "chapter_number");

-- CreateIndex
CREATE INDEX "idx_q_sub_grade_status" ON "questions"("subject_id", "grade", "status");

-- CreateIndex
CREATE INDEX "idx_q_sub_chapter_status" ON "questions"("subject_id", "chapter_id", "status");

-- CreateIndex
CREATE INDEX "idx_q_sub_year_status" ON "questions"("subject_id", "exam_year", "status");

-- CreateIndex
CREATE INDEX "idx_q_sub_grade_ch_status" ON "questions"("subject_id", "grade", "chapter_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_sessions_user" ON "quiz_sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_sessions_user_subject" ON "quiz_sessions"("user_id", "subject_id");

-- CreateIndex
CREATE INDEX "idx_sessions_user_status" ON "quiz_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_sessions_subject_status" ON "quiz_sessions"("subject_id", "status");

-- CreateIndex
CREATE INDEX "idx_answers_session" ON "quiz_answers"("session_id");

-- CreateIndex
CREATE INDEX "idx_answers_question" ON "quiz_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_answers_session_id_question_id_key" ON "quiz_answers"("session_id", "question_id");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "quiz_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
