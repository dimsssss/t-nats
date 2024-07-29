import {
  C_C,
  C_CO,
  C_CON,
  C_CONN,
  C_CONNE,
  C_CONNEC,
  C_CONNECT,
  C_CONNECT_ARG,
  C_PAYLOAD,
  C_PAYLOAD_RE,
  C_PAYLOAD_NE,
  C_P,
  C_PI,
  C_PIN,
  C_PING,
  C_PO,
  C_PON,
  C_PONG,
  C_PU,
  C_PUB,
  C_PUB_MSG,
  C_PUB_ARG,
  C_S,
  C_SU,
  C_SUB,
  C_SUB_ARG,
} from './Command';

/**
 * zero allocation byte parser
 * {@link https://github.com/nats-io/nats-server/blob/45e6812d70e42891ea2ff57e0a9a6051fa5a1d27/server/parser.go#L159}
 */
export class Parser {
  private operationStatus = '';
  private args: number[] = [];
  private payloadSize: number = 0;
  private commandEnd = 0;

  constructor() {}

  private clearStatus() {
    this.operationStatus = '';
    this.payloadSize = 0;
    this.commandEnd = 0;
  }

  parse(buffer: Buffer) {
    let i = 0;
    let skip = 0;

    for (i = 0; i < buffer.length; i++) {
      if (!this.operationStatus) {
        this.args = [];
        // buffer의 첫글자로 operation 설정
        if (
          buffer[i] === 'c'.charCodeAt(0) ||
          buffer[i] === 'C'.charCodeAt(0)
        ) {
          this.operationStatus = C_C;
        } else if (
          buffer[i] === 'p'.charCodeAt(0) ||
          buffer[i] === 'P'.charCodeAt(0)
        ) {
          this.operationStatus = C_P;
        } else if (
          buffer[i] === 's'.charCodeAt(0) ||
          buffer[i] === 'S'.charCodeAt(0)
        ) {
          this.operationStatus = C_S;
        } else {
          throw new Error('not supported commnad\r\n');
        }
      }

      if (this.operationStatus === C_C) {
        if (
          buffer[i] === 'O'.charCodeAt(0) ||
          buffer[i] === 'o'.charCodeAt(0)
        ) {
          this.operationStatus = C_CO;
          continue;
        }
      } else if (this.operationStatus === C_CO) {
        if (
          buffer[i] === 'N'.charCodeAt(0) ||
          buffer[i] === 'n'.charCodeAt(0)
        ) {
          this.operationStatus = C_CON;
          continue;
        }
      } else if (this.operationStatus === C_CON) {
        if (
          buffer[i] === 'N'.charCodeAt(0) ||
          buffer[i] === 'n'.charCodeAt(0)
        ) {
          this.operationStatus = C_CONN;
          continue;
        }
      } else if (this.operationStatus === C_CONN) {
        if (
          buffer[i] === 'E'.charCodeAt(0) ||
          buffer[i] === 'e'.charCodeAt(0)
        ) {
          this.operationStatus = C_CONNE;
          continue;
        }
      } else if (this.operationStatus === C_CONNE) {
        if (
          buffer[i] === 'C'.charCodeAt(0) ||
          buffer[i] === 'c'.charCodeAt(0)
        ) {
          this.operationStatus = C_CONNEC;
          continue;
        }
      } else if (this.operationStatus === C_CONNEC) {
        if (
          buffer[i] === 'T'.charCodeAt(0) ||
          buffer[i] === 't'.charCodeAt(0)
        ) {
          this.operationStatus = C_CONNECT;
          continue;
        }
      } else if (this.operationStatus === C_CONNECT) {
        if (
          buffer[i] === ' '.charCodeAt(0) ||
          buffer[i] === '\t'.charCodeAt(0)
        ) {
          continue;
        }

        this.commandEnd = i;
        this.operationStatus = C_CONNECT_ARG;
      } else if (this.operationStatus === C_CONNECT_ARG) {
        if (buffer[i] === '\r'.charCodeAt(0)) {
          skip = 1;
        } else if (buffer[i] === '\n'.charCodeAt(0)) {
          this.args.push(...buffer.subarray(this.commandEnd, i - skip));
          const args = JSON.stringify(
            buffer.subarray(this.commandEnd, i - skip).toString(),
          );
          this.clearStatus();
          skip = 0;
          return args;
        }
      } else if (this.operationStatus === C_P) {
        if (
          buffer[i] === 'U'.charCodeAt(0) ||
          buffer[i] === 'u'.charCodeAt(0)
        ) {
          this.operationStatus = C_PU;
          continue;
        }
        if (
          buffer[i] === 'I'.charCodeAt(0) ||
          buffer[i] === 'i'.charCodeAt(0)
        ) {
          this.operationStatus = C_PI;
          continue;
        }
      } else if (this.operationStatus === C_PU) {
        if (
          buffer[i] === 'B'.charCodeAt(0) ||
          buffer[i] === 'b'.charCodeAt(0)
        ) {
          this.operationStatus = C_PUB;
          continue;
        }
      } else if (this.operationStatus === C_PUB) {
        if (
          buffer[i] === ' '.charCodeAt(0) ||
          buffer[i] === '\t'.charCodeAt(0)
        ) {
          continue;
        }
        this.operationStatus = C_PUB_ARG;
      } else if (this.operationStatus === C_PUB_ARG) {
        if (buffer[i] === '\r'.charCodeAt(0)) {
          skip = 1;
        } else if (buffer[i] === '\n'.charCodeAt(0)) {
          const args = buffer.subarray(this.commandEnd, i - skip);
          const bytesIndex =
            args.findLastIndex((value) => value === ' '.charCodeAt(0)) + 1;

          this.payloadSize = Number(args.subarray(bytesIndex, args.length));

          if (isNaN(this.payloadSize)) {
            this.clearStatus();
            throw new Error('[ERROR] invalid #bytes\r\n');
          }

          this.args.push(...buffer.subarray(this.commandEnd, i - skip));
          this.commandEnd = i + 1;
          this.operationStatus = C_PUB_MSG;
          skip = 0;
        } else {
          if (this.args.length > 0) {
            this.args.push(buffer[i]);
          }
        }
      } else if (this.operationStatus === C_PUB_MSG) {
        if (buffer.length - 2 !== this.payloadSize) {
          this.clearStatus();
          throw new Error('[ERROR] payload size invalid\r\n');
        }

        this.operationStatus = C_PAYLOAD;
        i -= 1;
      } else if (this.operationStatus === C_PAYLOAD) {
        if (i + 1 === this.payloadSize) {
          this.operationStatus = C_PAYLOAD_RE;
          continue;
        }
      } else if (this.operationStatus === C_PAYLOAD_RE) {
        if (buffer[i] !== '\r'.charCodeAt(0)) {
          throw new Error();
        }

        this.operationStatus = C_PAYLOAD_NE;
      } else if (this.operationStatus === C_PAYLOAD_NE) {
        if (buffer[i] !== '\n'.charCodeAt(0)) {
          throw new Error('');
        }
        const payload = buffer
          .subarray(0, i - 1)
          .toString()
          .split(' ');
        this.clearStatus();
        return payload;
      } else if (this.operationStatus === C_PI) {
        this.operationStatus = C_PIN;
      } else if (this.operationStatus === C_PIN) {
        this.operationStatus = C_PING;
      } else if (this.operationStatus === C_PING) {
        if (buffer[i] !== '\r'.charCodeAt(0)) {
          skip = 1;
          continue;
        }
        if (buffer[i] !== '\n'.charCodeAt(0)) {
          this.operationStatus = '';
          return `PONG\r\n`;
        }
      } else if (this.operationStatus === C_S) {
        if (
          buffer[i] === 'U'.charCodeAt(0) ||
          buffer[i] === 'u'.charCodeAt(0)
        ) {
          this.operationStatus = C_SU;
          continue;
        }
      } else if (this.operationStatus === C_SU) {
        if (
          buffer[i] === 'B'.charCodeAt(0) ||
          buffer[i] === 'b'.charCodeAt(0)
        ) {
          continue;
        }
        this.operationStatus = C_SUB;
      } else if (this.operationStatus === C_SUB) {
        if (
          buffer[i] === ' '.charCodeAt(0) ||
          buffer[i] === '\t'.charCodeAt(0)
        ) {
          continue;
        }
        this.commandEnd = i;
        this.operationStatus = C_SUB_ARG;
      } else if (this.operationStatus === C_SUB_ARG) {
        if (buffer[i] === '\r'.charCodeAt(0)) {
          skip = 1;
        } else if (buffer[i] === '\n'.charCodeAt(0)) {
          this.args.push(
            ...buffer.subarray(this.commandEnd, buffer.length - skip),
          );
          const args = buffer
            .subarray(this.commandEnd, buffer.length - skip)
            .toString()
            .split(' ');
          skip = 0;
          this.clearStatus();
          return args;
        }
      } else if (this.operationStatus === C_PUB_MSG) {
        if (buffer.length - 2 !== this.payloadSize) {
          this.clearStatus();
          throw new Error('[ERROR] payload size invalid\r\n');
        }

        this.operationStatus = C_PAYLOAD;
        i -= 1;
      }
    }

    if (C_CONNECT_ARG || C_SUB_ARG) {
      if (buffer[buffer.length - 1] !== '\n'.charCodeAt(0)) {
        throw new Error();
      }
    }
  }
}
