import { expect } from '@jest/globals';
import type { MatcherFunction } from "expect";

export const toMatchResponse: MatcherFunction<[number, any]> = async function(received, statusCode, model) {
    if (typeof received !== 'object' || !received) throw new Error('toMatchResponse: the received value needs to be of type object');
    if (!('json' in received && typeof received.json === 'function')) throw new Error('toMatchResponse: the received value needs to have a .json method');
    if (!('status' in received || 'statusCode' in received)) throw new Error('toMatchResponse: the received value needs to have a status or statusCode property');
    const status = ('status' in received ? received.status : received.statusCode);
    const jsonResponse = await received.json();

    const statusCodePass = this.isNot ? status !== statusCode : status === statusCode;
    const message = () => (
      // eslint-disable-next-line prefer-template
      this.utils.matcherHint('toMatchResponse', undefined, undefined, { comment: 'Match response equality', isNot: this.isNot, promise: this.promise }) +
      '\n\n' +
      `Expected Status Code: ${this.utils.printExpected(statusCode)}\n` +
      `Received Status Code: ${this.utils.printReceived(status)}\n` +
      `Received Body: ${this.utils.printReceived(jsonResponse)}`
    );
    if (!statusCodePass) {
        return { actual: status, message, name: 'toMatchResponse', pass: false };
    }

    if (this.isNot) {
      expect(jsonResponse).not.toMatchJson(model);
      return { pass: true, name: 'toMatchResponse', message }
    }

    expect(jsonResponse).toMatchJson(model)

    return { pass: true, name: 'toMatchResponse', message }
};

declare module "expect" {
    interface AsymmetricMatchers {
      toMatchResponse(statusCode: number, model: any): void;
    }
    interface Matchers<R> {
      toMatchResponse(statusCode: number, model: any): R;
    }
  }