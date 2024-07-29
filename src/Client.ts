import { Socket } from 'net';
import { Observer } from './Observer';

export class Client {
  private bufferArgs: number[] = [];
  private args: number[] = [];
  status: string = '';
  commandIndex = 0;
  payloadSize = 0;

  constructor(
    private readonly socket: Socket,
    private readonly observer: Observer,
  ) {}

  clearStatus() {
    this.status = '';
    this.setPayloadSize(0);
    this.setCommandIndex(0);
  }

  setStatus(status: string) {
    this.status = status;
  }

  setCommandIndex(index: number) {
    this.commandIndex = index;
  }

  setPayloadSize(size: number) {
    if (isNaN(size)) {
      this.clearStatus();
      throw new Error('[ERROR] invalid #bytes\r\n');
    }
    this.payloadSize = size;
  }

  isValidPayloadSize(bufferSize: number) {
    if (bufferSize - 2 !== this.payloadSize) {
      this.clearStatus();
      throw new Error('[ERROR] payload size invalid\r\n');
    }
  }

  addBuffer(buffer: Buffer) {
    this.bufferArgs.push(...buffer);
  }

  addArgs(buffer: Buffer) {
    this.bufferArgs.push(
      ...buffer.subarray(this.commandIndex + 1, buffer.length - 1),
    );
  }

  send(msg: string) {
    this.socket.write(msg);
  }

  subscribe(args: string[]) {
    this.observer.addClient(this, args);
  }
}
