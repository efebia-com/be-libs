import { expect } from '@jest/globals';

export const toMatchResponse = async function(received, statusCode, model) {
    if (!(received instanceof Response)) throw new Error('toMatchResponse: the received value has to be a fetch Response object')
    const jsonResponse = await received.json();

    const statusCodePass = this.isNot ? received.status !== statusCode : received.status === statusCode;
    if (!statusCodePass) {
        const message = () => (
            // eslint-disable-next-line prefer-template
            this.utils.matcherHint('toMatchResponse', undefined, undefined, { comment: 'Match response equality', isNot: this.isNot, promise: this.promise }) +
            '\n\n' +
            `Expected Status Code: ${this.utils.printExpected(statusCode)}\n` +
            `Received Status Code: ${this.utils.printReceived(received.status)}\n` +
            `Received Body: ${this.utils.printReceived(jsonResponse)}`
        );

        return { actual: received.status, message, name: 'toMatchResponse', pass: false };
    }

    if (this.isNot) return expect(jsonResponse).not.toMatchJson(model);
    return expect(jsonResponse).toMatchJson(model)
};

declare module "expect" {
    interface AsymmetricMatchers {
      toMatchResponse(statusCode: number, model: any): void;
    }
    interface Matchers<R> {
      toMatchResponse(statusCode: number, model: any): R;
    }
  }