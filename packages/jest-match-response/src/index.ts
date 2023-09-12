export { buildToMatchJson, type Options } from "./toMatchJson";
export { toMatchResponse } from "./toMatchResponse";

export const matchResponseAndReturn = async (response: { json: () => any | Promise<any> } & ({ status: number } | { statusCode: number }), statusCode: number, model: any) => {
    const jsonValue = await response.json();
    expect({ ...response, json() {
        return jsonValue
    }})
    //@ts-ignore
    .toMatchResponse(statusCode, model);

    return jsonValue;
}
