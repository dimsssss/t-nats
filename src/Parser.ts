import { Client } from './Client';
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
  constructor() {}

  parse(buffer: Buffer, client: Client) {
    let i = 0;
    let skip = 0;

    for (i = 0; i < buffer.length; i++) {
      if (!client.status) {
        // buffer의 첫글자로 operation 설정
        if (
          buffer[i] === 'c'.charCodeAt(0) ||
          buffer[i] === 'C'.charCodeAt(0)
        ) {
          client.status = C_C;
        } else if (
          buffer[i] === 'p'.charCodeAt(0) ||
          buffer[i] === 'P'.charCodeAt(0)
        ) {
          client.status = C_P;
        } else if (
          buffer[i] === 's'.charCodeAt(0) ||
          buffer[i] === 'S'.charCodeAt(0)
        ) {
          client.status = C_S;
        } else {
          throw new Error('not supported commnad\r\n');
        }
      }

      if (client.status === C_C) {
        if (
          buffer[i] === 'O'.charCodeAt(0) ||
          buffer[i] === 'o'.charCodeAt(0)
        ) {
          client.status = C_CO;
          continue;
        }
      } else if (client.status === C_CO) {
        if (
          buffer[i] === 'N'.charCodeAt(0) ||
          buffer[i] === 'n'.charCodeAt(0)
        ) {
          client.status = C_CON;
          continue;
        }
      } else if (client.status === C_CON) {
        if (
          buffer[i] === 'N'.charCodeAt(0) ||
          buffer[i] === 'n'.charCodeAt(0)
        ) {
          client.status = C_CONN;
          continue;
        }
      } else if (client.status === C_CONN) {
        if (
          buffer[i] === 'E'.charCodeAt(0) ||
          buffer[i] === 'e'.charCodeAt(0)
        ) {
          client.status = C_CONNE;
          continue;
        }
      } else if (client.status === C_CONNE) {
        if (
          buffer[i] === 'C'.charCodeAt(0) ||
          buffer[i] === 'c'.charCodeAt(0)
        ) {
          client.status = C_CONNEC;
          continue;
        }
      } else if (client.status === C_CONNEC) {
        if (
          buffer[i] === 'T'.charCodeAt(0) ||
          buffer[i] === 't'.charCodeAt(0)
        ) {
          client.status = C_CONNECT;
          continue;
        }
      } else if (client.status === C_CONNECT) {
        if (
          buffer[i] === ' '.charCodeAt(0) ||
          buffer[i] === '\t'.charCodeAt(0)
        ) {
          continue;
        }

        client.setCommandIndex(i);
        client.status = C_CONNECT_ARG;
      } else if (client.status === C_CONNECT_ARG) {
        if (buffer[i] === '\r'.charCodeAt(0)) {
          skip = 1;
        } else if (buffer[i] === '\n'.charCodeAt(0)) {
          client.addBuffer(buffer);

          skip = 0;
          const result = buffer
            .subarray(client.commandIndex, buffer.length - 2)
            .toString();
          client.clearStatus();
          return JSON.stringify(result);
        }
      } else if (client.status === C_P) {
        if (
          buffer[i] === 'U'.charCodeAt(0) ||
          buffer[i] === 'u'.charCodeAt(0)
        ) {
          client.status = C_PU;
          continue;
        }
        if (
          buffer[i] === 'I'.charCodeAt(0) ||
          buffer[i] === 'i'.charCodeAt(0)
        ) {
          client.status = C_PI;
          continue;
        }
      } else if (client.status === C_PU) {
        if (
          buffer[i] === 'B'.charCodeAt(0) ||
          buffer[i] === 'b'.charCodeAt(0)
        ) {
          client.status = C_PUB;
          continue;
        }
      } else if (client.status === C_PUB) {
        if (
          buffer[i] === ' '.charCodeAt(0) ||
          buffer[i] === '\t'.charCodeAt(0)
        ) {
          continue;
        }
        client.commandIndex = i - 1;
        client.status = C_PUB_ARG;
      } else if (client.status === C_PUB_ARG) {
        if (buffer[i] === '\r'.charCodeAt(0)) {
          skip = 1;
        } else if (buffer[i] === '\n'.charCodeAt(0)) {
          const args = buffer.subarray(client.commandIndex, i - skip);
          const bytesIndex =
            args.findLastIndex((value) => value === ' '.charCodeAt(0)) + 1;

          client.payloadSize = Number(args.subarray(bytesIndex, args.length));
          client.addArgs(buffer);
          client.status = C_PUB_MSG;
          skip = 0;
        }
      } else if (client.status === C_PUB_MSG) {
        client.status = C_PAYLOAD;
        i -= 1;
      } else if (client.status === C_PAYLOAD) {
        if (i + 1 === client.payloadSize) {
          client.status = C_PAYLOAD_RE;
          continue;
        }
      } else if (client.status === C_PAYLOAD_RE) {
        if (buffer[i] !== '\r'.charCodeAt(0)) {
          throw new Error();
        }

        client.status = C_PAYLOAD_NE;
      } else if (client.status === C_PAYLOAD_NE) {
        if (buffer[i] !== '\n'.charCodeAt(0)) {
          throw new Error('');
        }
        const args = Buffer.from(client.bufferArgs)
          .subarray(0, client.bufferArgs.length - 1)
          .toString()
          .split(' ');
        client.publish([
          ...args,
          buffer.subarray(0, buffer.length - 2).toString(),
        ]);
        client.clearStatus();
        return args;
      } else if (client.status === C_PI) {
        client.status = C_PIN;
      } else if (client.status === C_PIN) {
        client.status = C_PING;
      } else if (client.status === C_PING) {
        if (buffer[i] !== '\r'.charCodeAt(0)) {
          skip = 1;
          continue;
        }
        if (buffer[i] !== '\n'.charCodeAt(0)) {
          client.status = '';
          return `PONG\r\n`;
        }
      } else if (client.status === C_S) {
        if (
          buffer[i] === 'U'.charCodeAt(0) ||
          buffer[i] === 'u'.charCodeAt(0)
        ) {
          client.status = C_SU;
          continue;
        }
      } else if (client.status === C_SU) {
        if (
          buffer[i] === 'B'.charCodeAt(0) ||
          buffer[i] === 'b'.charCodeAt(0)
        ) {
          continue;
        }
        client.status = C_SUB;
      } else if (client.status === C_SUB) {
        if (
          buffer[i] === ' '.charCodeAt(0) ||
          buffer[i] === '\t'.charCodeAt(0)
        ) {
          continue;
        }
        client.commandIndex = i;
        client.status = C_SUB_ARG;
      } else if (client.status === C_SUB_ARG) {
        if (buffer[i] === '\r'.charCodeAt(0)) {
          skip = 1;
        } else if (buffer[i] === '\n'.charCodeAt(0)) {
          client.addArgs(buffer);
          const args = buffer
            .subarray(client.commandIndex, i - skip)
            .toString()
            .split(' ');
          skip = 0;
          client.subscribe(args);
          client.clearStatus();
          return args;
        }
      } else if (client.status === C_PUB_MSG) {
        client.isValidPayloadSize(buffer.length);
        client.status = C_PAYLOAD;
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
