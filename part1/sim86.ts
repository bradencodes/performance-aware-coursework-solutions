import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";
import { createAssemblyText } from "./disassembler/disassembler.ts";

const getCliArgs = () => {
  return {
    binaryFilePath: parse(Deno.args)._[0],
    shouldDisassemble: true,
  };
};

const main = () => {
  const { binaryFilePath, shouldDisassemble } = getCliArgs();

  if (!binaryFilePath || typeof binaryFilePath !== "string") {
    throw new Error("The provided file path is invalid");
  }

  const bytes = Deno.readFileSync(binaryFilePath);

  if (shouldDisassemble) {
    const assemblyText = createAssemblyText(bytes);

    console.log(assemblyText);
  }
};

try {
  main();
} catch (error) {
  console.error(`Error: ${error}`);
}
