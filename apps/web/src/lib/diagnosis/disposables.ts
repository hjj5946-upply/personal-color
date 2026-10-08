// 분석이 끝나거나 취소되면 사진 객체·임시 URL·캔버스를 즉시 해제한다 (04 색 정확도 규칙, CLAUDE.md).
// 정리 작업을 모아 두었다가 한 번에 실행한다. 여러 번 불러도 한 번만 실행되고, 하나가 실패해도 나머지는 실행한다.

export class Disposables {
  private tasks: (() => void)[] = [];
  private disposed = false;

  /** 정리 작업 등록. 이미 해제된 뒤라면 바로 실행한다. */
  add(task: () => void): void {
    if (this.disposed) {
      runSafely(task);
      return;
    }
    this.tasks.push(task);
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  /** 등록 역순으로 실행 (나중에 만든 것을 먼저 정리) */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const tasks = this.tasks.reverse();
    this.tasks = [];
    for (const t of tasks) runSafely(t);
  }
}

function runSafely(task: () => void): void {
  try {
    task();
  } catch {
    // 정리 실패는 무시한다 (로그에 이미지·좌표를 남기지 않기 위해 내용도 출력하지 않음, S-8)
  }
}
