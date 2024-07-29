import { Client } from './Client';

export class Observer {
  private subjects: Record<string, Record<string, Client>[]> = {};
  private queueGroup: Record<string, Client[]> = {};
  private clientIds: Record<string, string> = {};

  constructor() {}

  addClient(client: Client, args: string[]) {
    const [subject, group, sid] = args;

    if (this.clientIds[sid]) {
      throw new Error('sid should be unique');
    }

    if (args.length === 3) {
      this.queueGroup[group].push(client);
    }

    if (!this.subjects[subject]) {
      this.subjects[subject] = [];
    }

    this.subjects[subject].push({ sid: client });
  }

  publish(args: string[]) {
    const [subject, replyTo, bytesSize, payload] = args;

    if ((!replyTo && !payload) || Number(bytesSize) === 0) {
      this.subjects[subject].forEach((value) => {
        Object.values(value).forEach((client: Client) => {
          client.send('');
        });
      });
    } else if (!replyTo && payload) {
      this.subjects[subject].forEach((value) => {
        Object.values(value).forEach((client: Client) => {
          client.send(payload);
        });
      });
    } else if (replyTo && payload) {
      Object.entries(this.subjects[subject])
        .filter(([key, client]) => {
          return key === replyTo;
        })
        .forEach((key, value) => {
          Object.values(value).forEach((client: Client) => {
            client.send(payload);
          });
        });
    }
  }
}
