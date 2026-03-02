// Pure TypeScript — session state machine
export class SessionStateService {
  assertInProgress(status: string): void {
    if (status !== 'in_progress') {
      throw new Error('QUIZ_ALREADY_COMPLETE');
    }
  }

  assertCompleted(status: string): void {
    if (status !== 'completed') {
      throw new Error('SESSION_NOT_COMPLETE');
    }
  }

  canSkip(studyMode: string): boolean {
    return studyMode !== 'exam_simulation';
  }
}
