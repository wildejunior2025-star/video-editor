type Job<T> = {
  fn: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

class SimpleQueue {
  private queue: Job<unknown>[] = []
  private running = false

  add<T>(fn: () => Promise<T>): { promise: Promise<T>; position: () => number } {
    let jobIndex = -1
    const promise = new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject } as Job<unknown>)
      jobIndex = this.queue.length - 1
      this.process()
    })
    return {
      promise,
      position: () => jobIndex,
    }
  }

  private async process() {
    if (this.running) return
    this.running = true
    while (this.queue.length > 0) {
      const job = this.queue.shift()!
      try {
        const result = await job.fn()
        job.resolve(result)
      } catch (err) {
        job.reject(err)
      }
    }
    this.running = false
  }

  get size() { return this.queue.length }
  get busy() { return this.running }
}

export const renderQueue = new SimpleQueue()
