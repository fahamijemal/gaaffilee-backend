// Pure TypeScript — NO NestJS, NO Prisma imports
import {
  EXAM_SIMULATION_BUFFER_SECONDS,
  EXAM_SIMULATION_SECONDS_PER_QUESTION,
} from '../../../config/constants';

export class SessionTimerGuardService {
  assertAnswerOnTime(studyMode: string, startedAt: Date, questionIndex: number): void {
    if (studyMode !== 'exam_simulation') return;
    const allowedSeconds = (questionIndex + 1) * EXAM_SIMULATION_SECONDS_PER_QUESTION + EXAM_SIMULATION_BUFFER_SECONDS;
    const elapsedSeconds = (Date.now() - startedAt.getTime()) / 1000;
    if (elapsedSeconds > allowedSeconds) {
      throw new Error('SESSION_EXPIRED');
    }
  }
}
