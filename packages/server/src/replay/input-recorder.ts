export interface InputEvent {
  tick: number;
  clientId: string;
  type: 'move_to' | 'chat' | 'interact' | 'join' | 'leave';
  payload: unknown;
  timestamp: number;
}

export interface RecordingMetadata {
  seed: number;
  startTime: number;
  endTime?: number;
  tickRate: number;
  roomId: string;
}

export interface Recording {
  metadata: RecordingMetadata;
  events: InputEvent[];
}

export class InputRecorder {
  private events: InputEvent[] = [];
  private metadata: RecordingMetadata | null = null;
  private isRecording = false;

  startRecording(seed: number, tickRate: number, roomId: string): void {
    this.events = [];
    this.metadata = {
      seed,
      startTime: Date.now(),
      tickRate,
      roomId,
    };
    this.isRecording = true;
  }

  stopRecording(): Recording | null {
    if (!this.metadata) return null;

    this.isRecording = false;
    this.metadata.endTime = Date.now();

    return {
      metadata: { ...this.metadata },
      events: [...this.events],
    };
  }

  record(tick: number, clientId: string, type: InputEvent['type'], payload: unknown): void {
    if (!this.isRecording) return;

    this.events.push({
      tick,
      clientId,
      type,
      payload,
      timestamp: Date.now(),
    });
  }

  getEvents(): InputEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
    this.metadata = null;
    this.isRecording = false;
  }

  isActive(): boolean {
    return this.isRecording;
  }
}
