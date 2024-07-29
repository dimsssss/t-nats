import { Parser } from '../src/Parser';

describe('command parser test', () => {
  let parser: Parser;

  beforeAll(() => {
    parser = new Parser();
  });

  test('connect should return json', () => {
    const buffer = Buffer.from(
      'CONNECT {"verbose":false,"pedantic":false,"tls_required":false,"name":"","lang":"go","version":"1.2.2","protocol":1}\r\n',
    );
    expect(parser.parse(buffer)).toBe(
      `\"{\\\"verbose\\\":false,\\\"pedantic\\\":false,\\\"tls_required\\\":false,\\\"name\\\":\\\"\\\",\\\"lang\\\":\\\"go\\\",\\\"version\\\":\\\"1.2.2\\\",\\\"protocol\\\":1}\"`,
    );
  });

  test('pub should throw if CRLF not exist', () => {
    const buffer1 = Buffer.from('PUB foo 5\r\nhello\r');
    const buffer2 = Buffer.from('PUB foo.bar INBOX.22 11\r\nhello world\r');
    const buffer3 = Buffer.from('PUB foo.bar 11\r\nhello world hello world\r');

    expect(() => parser.parse(buffer1)).toThrow(Error);
    expect(() => parser.parse(buffer2)).toThrow(Error);
    expect(() => parser.parse(buffer3)).toThrow(Error);
  });

  test('sub should throw if CRLF not exist', () => {
    const buffer1 = Buffer.from('SUB foo 1\r');

    expect(() => parser.parse(buffer1)).toThrow(Error);
  });
});
