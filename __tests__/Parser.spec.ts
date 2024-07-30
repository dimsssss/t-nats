import { Client } from '../src/Client';
import { Parser } from '../src/Parser';
import { Observer } from '../src/Observer';
import { Socket } from 'net';

describe('command parser test', () => {
  let parser: Parser;
  let client: Client;

  beforeAll(() => {
    parser = new Parser();
    client = new Client(new Socket(), new Observer());
  });

  test('connect should return json', () => {
    const buffer = Buffer.from(
      'CONNECT {"verbose":false,"pedantic":false,"tls_required":false,"name":"","lang":"go","version":"1.2.2","protocol":1}\r\n',
    );

    expect(parser.parse(buffer, client)).toBe(
      `\"{\\\"verbose\\\":false,\\\"pedantic\\\":false,\\\"tls_required\\\":false,\\\"name\\\":\\\"\\\",\\\"lang\\\":\\\"go\\\",\\\"version\\\":\\\"1.2.2\\\",\\\"protocol\\\":1}\"`,
    );
  });

  test('pub should throw if CRLF not exist', () => {
    const buffer1 = Buffer.from('PUB foo 5\r\nhello\r');
    const buffer2 = Buffer.from('PUB foo.bar INBOX.22 11\r\nhello world\r');
    const buffer3 = Buffer.from('PUB foo.bar 11\r\nhello world hello world\r');

    expect(() => parser.parse(buffer1, client)).toThrow(Error);
    expect(() => parser.parse(buffer2, client)).toThrow(Error);
    expect(() => parser.parse(buffer3, client)).toThrow(Error);
  });

  test('sub should throw if CRLF not exist', () => {
    const buffer1 = Buffer.from('SUB foo 1\r');

    expect(() => parser.parse(buffer1, client)).toThrow(Error);
  });
});
