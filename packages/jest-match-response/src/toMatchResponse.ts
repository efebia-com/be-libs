import { expect } from '@jest/globals';

export const toMatchResponse = async function(received, statusCode, model) {
    if (!(Object.hasOwn(received, 'json') && typeof received.json === 'function')) throw new Error('toMatchResponse: the received value needs to have a .json method');
    if (!(Object.hasOwn(received, 'status') || Object.hasOwn(received, 'statusCode'))) throw new Error('toMatchResponse: the received value needs to have a status or statusCode property');
    const status = received.status || received.statusCode;
    const jsonResponse = await received.json();

    const statusCodePass = this.isNot ? status !== statusCode : status === statusCode;
    if (!statusCodePass) {
        const message = () => (
            // eslint-disable-next-line prefer-template
            this.utils.matcherHint('toMatchResponse', undefined, undefined, { comment: 'Match response equality', isNot: this.isNot, promise: this.promise }) +
            '\n\n' +
            `Expected Status Code: ${this.utils.printExpected(statusCode)}\n` +
            `Received Status Code: ${this.utils.printReceived(status)}\n` +
            `Received Body: ${this.utils.printReceived(jsonResponse)}`
        );

        return { actual: status, message, name: 'toMatchResponse', pass: false };
    }

    if (this.isNot) return expect(jsonResponse).not.toMatchJson(model);
    expect(jsonResponse).toMatchJson(model)

    return { pass: true }
};

declare module "expect" {
    interface AsymmetricMatchers {
      toMatchResponse(statusCode: number, model: any): void;
    }
    interface Matchers<R> {
      toMatchResponse(statusCode: number, model: any): R;
    }
  }