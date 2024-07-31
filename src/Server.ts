import net from 'net';
import { Parser } from './Parser';
import { Client } from './Client';
import { Observer } from './Observer';

export class Server {
  private readonly parser = new Parser();
  private readonly observer = new Observer();

  constructor(
    private readonly server: net.Server,
    private readonly config: Record<string, string>,
  ) {}

  static of(config = {}) {
    return new Server(net.createServer(), config);
  }

  init() {
    this.server.on('connection', (socket) => {
      const client = new Client(socket, this.observer);

      socket.on('data', (buffer) => {
        this.parser.parse(buffer, client);
      });

      const info = {
        sever_id: process.env.SERVER_ID,
        server_name: process.env.SERVER_NAME,
        version: process.env.VERSION,
        go: process.env.GO,
        host: process.env.HOST,
        port: process.env.PORT,
        headers: process.env.HEADERS,
        max_payload: process.env.MAX_PAYLOAD,
        proto: process.env.PROTO,
        client_ip: socket.remoteAddress,
        client_port: socket.remotePort,
      };

      client.send(`${JSON.stringify(info)}\r\n`);
    });
  }

  start(port: number) {
    this.server.listen(port);
  }
}
