import { existsSync } from "node:fs";
import { localFileToInput, type InputFile } from "./conversion.helper.js";
import { FileNotFoundException } from "../exceptions/file-no-found.exception.js";

export async function loadFile(path: string): Promise<InputFile> {
  if (!existsSync(path))
    throw new FileNotFoundException(`file ${path} does not exist`);
  return localFileToInput(path);
}
