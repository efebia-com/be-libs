import Ajv from "ajv";
import type { MatcherFunction } from "expect";

export type Options = {
  ajv: Ajv;
};

export const buildToMatchJson = (opts: Options) => {
  const { ajv } = opts;
  const toMatchJson: MatcherFunction<[any]> = function (json, model: any) {
    const validate = ajv.compile(model);
    const validation = validate(json);

    const pass = this.equals(validation, !this.isNot);

    const showErrors = (!pass && !this.isNot) || (pass && this.isNot);

    const message = () =>
      this.utils.matcherHint("toMatchJson", undefined, undefined, {
        comment: "Match JSON equality",
        isNot: this.isNot,
        promise: this.promise,
      }) +
      "\n\n" +
      `Expected JSON Schema: ${this.utils.printExpected(model)}\n` +
      `Received JSON: ${this.utils.printReceived(json)}` +
      showErrors
        ? `\nValidation errors: ${this.utils.printReceived(
            JSON.stringify(validate.errors)
          )}`
        : "";

    return { actual: json, message, name: "toMatchJson", pass };
  };

  return toMatchJson;
};

declare module "expect" {
  interface AsymmetricMatchers {
    toMatchJson(model: any): void;
  }
  interface Matchers<R> {
    toMatchJson(model: any): R;
  }
}
