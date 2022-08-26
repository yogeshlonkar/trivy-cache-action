import { Inputs } from "../constants";

// See: https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L67
function getInputName(name: string): string {
    return `INPUT_${name.replace(/ /g, "_").toUpperCase()}`;
}

export function setInput(name: string, value: string): void {
    process.env[getInputName(name)] = value;
}

interface CacheInput {
    ghToken: string;
    prefix: string;
    restoreKeys?: string[];
}

export function setInputs(input: CacheInput): void {
    setInput(Inputs.GhToken, input.ghToken);
    setInput(Inputs.Prefix, input.prefix);
}

export function clearInputs(): void {
    delete process.env[getInputName(Inputs.GhToken)];
    delete process.env[getInputName(Inputs.Prefix)];
    delete process.env[getInputName(Inputs.UploadChunkSize)];
}
