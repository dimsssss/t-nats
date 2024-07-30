import { Client } from './Client';

export class Observer {
  private subjects: Record<string, Record<string, Client>[]> = {};
  private queueGroup: Record<string, Client[]> = {};
  private clientIds: Record<string, string> = {};

  constructor() {}

  addClient(client: Client, args: string[]) {
    let subject, group, sid;

    if (args.length === 3) {
      subject = args[0];
      group = args[1];
      sid = args[2];

      this.queueGroup[group].push(client);
    } else if (args.length === 2) {
      subject = args[0];
      sid = args[1];
    } else {
      throw new Error('invalid args length');
    }

    if (this.clientIds[sid]) {
      throw new Error('sid should be unique');
    }

    if (!this.subjects[subject]) {
      this.subjects[subject] = [];
    }

    this.subjects[subject].push({ [sid]: client });
  }

  publish(args: string[]) {
    const [subject] = args;
    if (args.length === 4) {
      this.subjects[subject]
        .filter((value) => {
          const [sid] = Object.keys(value);
          const replyTo = args[1];
          return sid === replyTo;
        })
        .forEach((value) => {
          Object.values(value).forEach((client: Client) => {
            const payload = args[3];
            client.send(`${payload}\r\n`);
          });
        });
    } else if (args.length === 3) {
      this.subjects[subject].forEach((value) => {
        Object.values(value).forEach((client: Client) => {
          const payload = args[2];
          client.send(`${payload}\r\n`);
        });
      });
    } else if (args.length === 2) {
      this.subjects[subject].forEach((value) => {
        Object.values(value).forEach((client: Client) => {
          client.send('');
        });
      });
    } else {
      throw new Error('invalid argument length');
    }
  }
}
