import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";

const getInstructionParts = (byte1: number, byte2: number) => {
  const opcode = (byte1 & 0b11111100) >>> 2;
  const d = (byte1 & 0b00000010) >>> 1;
  const w = byte1 & 0b00000001;
  const mod = (byte2 & 0b11000000) >>> 6;
  const reg = (byte2 & 0b00111000) >>> 3;
  const rm = byte2 & 0b00000111;

  return { opcode, d, w, mod, reg, rm };
};

const getInstructionName = (opcode: number) => {
  const instructionNameMap = [];
  instructionNameMap[0b100010] = "mov";

  return instructionNameMap[opcode];
};

const getRegisterName = (w: number, registerCode: number) => {
  const regsiterNameMap = [new Array(8), new Array(8)];
  regsiterNameMap[0][0b000] = "al";
  regsiterNameMap[0][0b001] = "cl";
  regsiterNameMap[0][0b010] = "dl";
  regsiterNameMap[0][0b011] = "bl";
  regsiterNameMap[0][0b100] = "ah";
  regsiterNameMap[0][0b101] = "ch";
  regsiterNameMap[0][0b110] = "dh";
  regsiterNameMap[0][0b111] = "bh";

  regsiterNameMap[1][0b000] = "ax";
  regsiterNameMap[1][0b001] = "cx";
  regsiterNameMap[1][0b010] = "dx";
  regsiterNameMap[1][0b011] = "bx";
  regsiterNameMap[1][0b100] = "sp";
  regsiterNameMap[1][0b101] = "bp";
  regsiterNameMap[1][0b110] = "si";
  regsiterNameMap[1][0b111] = "di";

  return regsiterNameMap[w][registerCode];
};

const main = () => {
  const binaryFileName = parse(Deno.args)._[0];

  if (!binaryFileName || typeof binaryFileName !== "string") return;

  let assemblyText = "bits 16\n";

  const bytes = Deno.readFileSync(binaryFileName);

  for (let i = 0; i < bytes.length; i += 2) {
    const byte1 = bytes[i];
    const byte2 = bytes[i + 1];

    const { opcode, d, w, reg, rm } = getInstructionParts(byte1, byte2);

    const destinationByte = d ? reg : rm;
    const sourceByte = !d ? reg : rm;

    const instructionName = getInstructionName(opcode);
    const destinationName = getRegisterName(w, destinationByte);
    const sourceName = getRegisterName(w, sourceByte);

    assemblyText += `\n${instructionName} ${destinationName}, ${sourceName}`;
  }

  return assemblyText;
};

console.log(main());
