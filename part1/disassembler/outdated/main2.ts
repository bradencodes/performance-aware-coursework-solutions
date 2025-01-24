import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";

const getInstructionName = (opcode: number) => {
  const instructionNameMap = [];
  instructionNameMap[0b100010] = "mov";
  instructionNameMap[0b1011] = "mov";

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

const getRegisterMemoryToFromRegisterInstructionParts = (
  byte1: number,
  byte2: number,
) => {
  const opcode = (byte1 & 0b11111100) >>> 2;
  const d = (byte1 & 0b00000010) >>> 1;
  const w = byte1 & 0b00000001;
  const mod = (byte2 & 0b11000000) >>> 6;
  const reg = (byte2 & 0b00111000) >>> 3;
  const rm = byte2 & 0b00000111;

  return { opcode, d, w, mod, reg, rm };
};

const getRegisterToRegisterAssemblyText = (byte1: number, byte2: number) => {
  const { opcode, d, w, reg, rm } =
    getRegisterMemoryToFromRegisterInstructionParts(byte1, byte2);

  const destinationByte = d ? reg : rm;
  const sourceByte = !d ? reg : rm;

  const instructionName = getInstructionName(opcode);
  const destinationName = getRegisterName(w, destinationByte);
  const sourceName = getRegisterName(w, sourceByte);

  return `${instructionName} ${destinationName}, ${sourceName}`;
};

const get8bitImmediateToRegisterAssemblyText = (
  byte1: number,
  byte2: number,
) => {
  const getInstructionParts = (byte1: number, byte2: number) => {
    const opcode = (byte1 & 0b11110000) >>> 4;
    const w = (byte1 & 0b00001000) >>> 3;
    const reg = byte1 & 0b00000111;
    const data = byte2;

    return { opcode, w, reg, data };
  };
  const { opcode, w, reg, data } = getInstructionParts(byte1, byte2);

  const instructionName = getInstructionName(opcode);
  const destinationName = getRegisterName(w, reg);
  const immediateValue = data;

  return `${instructionName} ${destinationName}, ${immediateValue}`;
};

const get16bitImmediateToRegisterAssemblyText = (
  byte1: number,
  byte2: number,
  byte3: number,
) => {
  const getInstructionParts = (byte1: number, byte2: number, byte3: number) => {
    const opcode = (byte1 & 0b11110000) >>> 4;
    const w = (byte1 & 0b00001000) >>> 3;
    const reg = byte1 & 0b00000111;
    const data = (byte3 << 8) | byte2;

    return { opcode, w, reg, data };
  };
  const { opcode, w, reg, data } = getInstructionParts(byte1, byte2, byte3);

  const instructionName = getInstructionName(opcode);
  const destinationName = getRegisterName(w, reg);
  const immediateValue = data;

  return `${instructionName} ${destinationName}, ${immediateValue}`;
};

const get8bitDirectAddressCalculationAssemblyText = (
  byte1: number,
  byte2: number,
  byte3: number,
) => {
  const { opcode, d, w, reg } = getRegisterMemoryToFromRegisterInstructionParts(
    byte1,
    byte2,
  );

  const instructionName = getInstructionName(opcode);
  const registerName = getRegisterName(w, reg);

  const memoryString = `[${byte3}]`;

  const destinationString = d ? registerName : memoryString;
  const sourceString = !d ? registerName : memoryString;

  return `${instructionName} ${destinationString}, ${sourceString}`;
};

const get16bitDirectAddressCalculationAssemblyText = (
  byte1: number,
  byte2: number,
  byte3: number,
  byte4: number,
) => {
  const { opcode, d, w, reg } = getRegisterMemoryToFromRegisterInstructionParts(
    byte1,
    byte2,
  );

  const instructionName = getInstructionName(opcode);
  const registerName = getRegisterName(w, reg);

  const memoryString = `[${(byte4 << 8) | byte3}]`;

  const destinationString = d ? registerName : memoryString;
  const sourceString = !d ? registerName : memoryString;

  return `${instructionName} ${destinationString}, ${sourceString}`;
};

const getAddressCalculationString = (rm: number) => {
  const addressCalculationMap = new Array(8);
  addressCalculationMap[0b000] = "bx + si";
  addressCalculationMap[0b001] = "bx + di";
  addressCalculationMap[0b010] = "bp + si";
  addressCalculationMap[0b011] = "bp + di";
  addressCalculationMap[0b100] = "si";
  addressCalculationMap[0b101] = "di";
  addressCalculationMap[0b110] = "bp";
  addressCalculationMap[0b111] = "bx";

  return addressCalculationMap[rm];
};

const getAddressCalculationAssemblyText = (byte1: number, byte2: number) => {
  const { opcode, d, w, reg, rm } =
    getRegisterMemoryToFromRegisterInstructionParts(byte1, byte2);

  const instructionName = getInstructionName(opcode);
  const registerName = getRegisterName(w, reg);
  const memoryString = `[${getAddressCalculationString(rm)}]`;

  const destinationString = d ? registerName : memoryString;
  const sourceString = !d ? registerName : memoryString;

  return `${instructionName} ${destinationString}, ${sourceString}`;
};

const getAddressCalculationPlus8bitDisplacementAssemblyText = (
  byte1: number,
  byte2: number,
  byte3: number,
) => {
  const { opcode, d, w, reg, rm } =
    getRegisterMemoryToFromRegisterInstructionParts(byte1, byte2);

  const instructionName = getInstructionName(opcode);
  const registerName = getRegisterName(w, reg);
  const memoryString = `[${getAddressCalculationString(rm)} + ${byte3}]`;

  const destinationString = d ? registerName : memoryString;
  const sourceString = !d ? registerName : memoryString;

  return `${instructionName} ${destinationString}, ${sourceString}`;
};

const getAddressCalculationPlus16bitDisplacementAssemblyText = (
  byte1: number,
  byte2: number,
  byte3: number,
  byte4: number,
) => {
  const { opcode, d, w, reg, rm } =
    getRegisterMemoryToFromRegisterInstructionParts(byte1, byte2);

  const instructionName = getInstructionName(opcode);
  const registerName = getRegisterName(w, reg);
  const memoryString = `[${getAddressCalculationString(rm)} + ${
    (byte4 << 8) | byte3
  }]`;

  const destinationString = d ? registerName : memoryString;
  const sourceString = !d ? registerName : memoryString;

  return `${instructionName} ${destinationString}, ${sourceString}`;
};

const getInstructionInfo = (
  byte1: number,
  byte2: number,
  byte3: number,
  byte4: number,
) => {
  const isRegisterToRegister = (() => {
    const opcode = (byte1 & 0b11111100) >>> 2;
    if (opcode !== 0b100010) return false;

    const mod = (byte2 & 0b11000000) >>> 6;
    if (mod !== 0b11) return false;

    return true;
  })();
  if (isRegisterToRegister) {
    const byteLength = 2;
    const assemblyText = getRegisterToRegisterAssemblyText(
      byte1,
      byte2,
    );

    return { assemblyText, byteLength };
  }

  const is8bitImmediateToRegister = (() => {
    const opcode = (byte1 & 0b11110000) >>> 4;
    if (opcode !== 0b1011) return false;

    const w = (byte1 & 0b00001000) >>> 3;
    if (w !== 0b0) return false;

    return true;
  })();
  if (is8bitImmediateToRegister) {
    const byteLength = 2;
    const assemblyText = get8bitImmediateToRegisterAssemblyText(
      byte1,
      byte2,
    );

    return { assemblyText, byteLength };
  }

  const is16bitImmediateToRegister = (() => {
    const opcode = (byte1 & 0b11110000) >>> 4;
    if (opcode !== 0b1011) return false;

    const w = (byte1 & 0b00001000) >>> 3;
    if (w !== 0b1) return false;

    return true;
  })();
  if (is16bitImmediateToRegister) {
    const byteLength = 3;
    const assemblyText = get16bitImmediateToRegisterAssemblyText(
      byte1,
      byte2,
      byte3,
    );

    return { assemblyText, byteLength };
  }

  const is8bitDirectAddressCalculation = (() => {
    const opcode = (byte1 & 0b11111100) >>> 2;
    if (opcode !== 0b100010) return false;

    const mod = (byte2 & 0b11000000) >>> 6;
    if (mod !== 0b00) return false;

    const rm = byte2 & 0b00000111;
    if (rm !== 0b110) return false;

    const w = byte1 & 0b00000001;
    if (w !== 0b0) return false;

    return true;
  })();
  if (is8bitDirectAddressCalculation) {
    const byteLength = 3;
    const assemblyText = get8bitDirectAddressCalculationAssemblyText(
      byte1,
      byte2,
      byte3,
    );

    return { assemblyText, byteLength };
  }

  const is16bitDirectAddressCalculation = (() => {
    const opcode = (byte1 & 0b11111100) >>> 2;
    if (opcode !== 0b100010) return false;

    const mod = (byte2 & 0b11000000) >>> 6;
    if (mod !== 0b00) return false;

    const rm = byte2 & 0b00000111;
    if (rm !== 0b110) return false;

    const w = byte1 & 0b00000001;
    if (w !== 0b1) return false;

    return true;
  })();
  if (is16bitDirectAddressCalculation) {
    const byteLength = 4;
    const assemblyText = get16bitDirectAddressCalculationAssemblyText(
      byte1,
      byte2,
      byte3,
      byte4,
    );

    return { assemblyText, byteLength };
  }

  const isAddressCalculation = (() => {
    const opcode = (byte1 & 0b11111100) >>> 2;
    if (opcode !== 0b100010) return false;

    const mod = (byte2 & 0b11000000) >>> 6;
    if (mod !== 0b00) return false;

    const rm = byte2 & 0b00000111;
    if (rm === 0b110) return false;

    return true;
  })();
  if (isAddressCalculation) {
    const byteLength = 2;
    const assemblyText = getAddressCalculationAssemblyText(
      byte1,
      byte2,
    );

    return { assemblyText, byteLength };
  }

  const isAddressCalculationPlus8bitDisplacement = (() => {
    const opcode = (byte1 & 0b11111100) >>> 2;
    if (opcode !== 0b100010) return false;

    const mod = (byte2 & 0b11000000) >>> 6;
    if (mod !== 0b01) return false;

    return true;
  })();
  if (isAddressCalculationPlus8bitDisplacement) {
    const byteLength = 3;
    const assemblyText = getAddressCalculationPlus8bitDisplacementAssemblyText(
      byte1,
      byte2,
      byte3,
    );

    return { assemblyText, byteLength };
  }

  const isAddressCalculationPlus16bitDisplacement = (() => {
    const opcode = (byte1 & 0b11111100) >>> 2;
    if (opcode !== 0b100010) return false;

    const mod = (byte2 & 0b11000000) >>> 6;
    if (mod !== 0b10) return false;

    return true;
  })();
  if (isAddressCalculationPlus16bitDisplacement) {
    const byteLength = 4;
    const assemblyText = getAddressCalculationPlus16bitDisplacementAssemblyText(
      byte1,
      byte2,
      byte3,
      byte4,
    );

    return { assemblyText, byteLength };
  }

  return { assemblyText: "invalid", byteLength: 1 };
};

const main = () => {
  const binaryFilePath = parse(Deno.args)._[0];

  if (!binaryFilePath || typeof binaryFilePath !== "string") return;

  let assemblyText = "bits 16\n";

  const bytes = Deno.readFileSync(binaryFilePath);

  let currentByteNum = 0;
  while (currentByteNum < bytes.length) {
    const {
      assemblyText: instructionAssemblyText,
      byteLength: instructionByteLength,
    } = getInstructionInfo(
      bytes[currentByteNum],
      bytes[currentByteNum + 1],
      bytes[currentByteNum + 2],
      bytes[currentByteNum + 3],
    );
    assemblyText += `\n${instructionAssemblyText}`;
    currentByteNum += instructionByteLength;
  }

  return assemblyText;
};

console.log(main());
