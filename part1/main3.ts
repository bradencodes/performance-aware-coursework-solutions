import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";

const MODE = {
  getHasDispLo: (mod: number, rm: number) =>
    (mod === 0b00 && rm === 0b110) || mod === 0b01 || mod === 0b10,
  getHasDispHi: (mod: number, rm: number) =>
    (mod === 0b00 && rm === 0b110) || mod === 0b10,
};

const WIDTH = {
  getIs8bit: (w: number) => w === 0b0,
  getIs16bit: (w: number) => w === 0b1,
};

const getPartsForRegisterOrMemoryToOrFromRegisterInstructions = (
  byte1: number,
  byte2: number,
  byte3?: number,
  byte4?: number,
) => {
  const d = (byte1 & 0b00000010) >>> 1;
  const w = byte1 & 0b00000001;
  const mod = (byte2 & 0b11000000) >>> 6;
  const reg = (byte2 & 0b00111000) >>> 3;
  const rm = byte2 & 0b00000111;

  const hasDispLo = MODE.getHasDispLo(mod, rm);
  const hasDispHi = MODE.getHasDispHi(mod, rm);

  const disp = (() => {
    if (!hasDispLo) return undefined; // no displacement
    if (hasDispHi) return (byte4 as number << 8) | byte3 as number; // 16-bit displacement
    return byte3; // 8-bit displacement
  })();

  const numOfBytes = (() => {
    if (!hasDispLo) return 2; // no displacement
    if (hasDispHi) return 4; // 16-bit displacement
    return 3; // 8-bit displacement
  })();

  return { d, w, mod, reg, rm, disp, numOfBytes };
};

const getPartsForImmediateToRegisterOrMemoryCommonInstructions = (
  byte1: number,
  byte2: number,
  byte3: number,
  byte4?: number,
  byte5?: number,
  byte6?: number,
) => {
  const w = byte1 & 0b00000001;
  const mod = (byte2 & 0b11000000) >>> 6;
  const rm = byte2 & 0b00000111;

  const hasDispLo = MODE.getHasDispLo(mod, rm);
  const hasDispHi = MODE.getHasDispHi(mod, rm);

  const disp = (() => {
    if (!hasDispLo) return undefined; // no displacement

    if (hasDispHi) return (byte4 as number << 8) | byte3 as number; // 16-bit displacement

    return byte3; // 8-bit displacement
  })();

  const is8bit = WIDTH.getIs8bit(w);

  const data = (() => {
    const dataLo = (() => {
      if (hasDispHi) return byte5 as number;
      if (hasDispLo) return byte4 as number;
      return byte3 as number;
    })();

    const dataHi = (() => {
      if (hasDispHi) return byte6 as number;
      if (hasDispLo) return byte5 as number;
      return byte4 as number;
    })();

    if (is8bit) {
      return dataLo;
    }

    return (dataHi << 8) | dataLo;
  })();

  const numOfBytes = (() => {
    if (!hasDispLo) {
      if (is8bit) return 3;
      return 4;
    }

    if (hasDispHi) {
      if (is8bit) return 5;
      return 6;
    }

    if (is8bit) return 4;
    return 5;
  })();

  return { w, mod, rm, disp, data, numOfBytes };
};

const getPartsForImmediateToRegisterOrMemoryArithmeticInstructions = (
  byte1: number,
  byte2: number,
  byte3: number,
  byte4?: number,
  byte5?: number,
  byte6?: number,
) => {
  const s = (byte1 && 0b00000010) >>> 1;

  const { w, mod, rm, disp, data, numOfBytes } =
    getPartsForImmediateToRegisterOrMemoryCommonInstructions(
      byte1,
      byte2,
      byte3,
      byte4,
      byte5,
      byte6,
    );

  return { s, w, mod, rm, disp, data, numOfBytes };
};

const getPartsForImmediateAndAccumulatorArithmeticInstructions = (
  byte1: number,
  byte2: number,
  byte3?: number,
) => {
  const w = byte1 & 0b00000001;

  const data = (() => {
    const is8bit = WIDTH.getIs8bit(w);
    if (is8bit) {
      return byte2;
    }

    return (byte3 as number << 8) | byte2;
  })();

  return { w, data };
};

export const INSTRUCTIONS = {
  MOVE: {
    RegisterOrMemoryToOrFromRegister: {
      test: (byte1: number) => (byte1 & 0b11111100) >>> 2 === 0b100010,
      getInstructionInfo: (
        byte1: number,
        byte2: number,
        byte3?: number,
        byte4?: number,
      ) => {
        const {
          d,
          w,
          mod,
          reg,
          rm,
          disp,
          numOfBytes,
        } = getPartsForRegisterOrMemoryToOrFromRegisterInstructions(
          byte1,
          byte2,
          byte3,
          byte4,
        );

        const assemblyText = (() => {
          const mnemonic = "mov";

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

          const registerName = getRegisterName(w, reg);

          const rmString = (() => {
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

            if (mod === 0b00) { // Memory Mode No Displacement (except for Direct Address)
              if (rm === 0b110) return `[${disp}]`; // Direct Address

              const addressCalculationString = getAddressCalculationString(rm);
              return `[${addressCalculationString}]`;
            }

            if (mod === 0b01 || mod == 0b10) { // Memory Mode With Displacement
              const addressCalculationString = getAddressCalculationString(rm);
              return `[${addressCalculationString} + ${disp}]`;
            }

            return getRegisterName(w, rm); // Register Mode
          })();

          const destination = d ? registerName : rmString;
          const source = !d ? registerName : rmString;

          return `${mnemonic} ${destination}, ${source}`;
        })();

        return { assemblyText, numOfBytes };
      },
    },
    ImmediateToRegisterOrMemory: {
      test: (byte1: number, byte2: number) =>
        (byte1 & 0b11111110) >>> 1 === 0b1100011 &&
        (byte2 & 0b00111000) >>> 3 === 0b000,
      getParts: getPartsForImmediateToRegisterOrMemoryCommonInstructions,
    },
    ImmediateToRegister: {
      test: (byte1: number) => (byte1 & 0b11110000) >>> 4 === 0b1011,
      getParts: (byte1: number, byte2: number, byte3?: number) => {
        const w = (byte1 & 0b00001000) >>> 3;
        const reg = byte1 & 0b00000111;

        const is8bit = WIDTH.getIs8bit(w);

        const data = (() => {
          if (is8bit) {
            return byte2;
          }

          return (byte3 as number << 8) | byte2;
        })();

        const numOfBytes = is8bit ? 2 : 3;

        return { w, reg, data, numOfBytes };
      },
    },
  },

  ADD: {
    RegisterOrMemoryWithRegisterToEither: {
      test: (byte1: number) => (byte1 & 0b11111100) >>> 2 === 0b000000,
      getParts: getPartsForRegisterOrMemoryToOrFromRegisterInstructions,
    },
    ImmediateToRegisterOrMemory: {
      test: (byte1: number, byte2: number) =>
        (byte1 & 0b11111100) >>> 2 === 0b100000 &&
        (byte2 & 0b00111000) >>> 3 === 0b000,
      getParts: getPartsForImmediateToRegisterOrMemoryArithmeticInstructions,
    },
    ImmediateToAccumulator: {
      test: (byte1: number) => (byte1 & 0b11111110) >>> 1 === 0b0000010,
      getParts: getPartsForImmediateAndAccumulatorArithmeticInstructions,
    },
  },

  SUBTRACT: {
    RegisterOrMemoryAndRegisterToEither: {
      test: (byte1: number) => (byte1 & 0b11111100) >>> 2 === 0b001010,
      getParts: getPartsForRegisterOrMemoryToOrFromRegisterInstructions,
    },
    ImmediateFromRegisterOrMemory: {
      test: (byte1: number, byte2: number) =>
        (byte1 & 0b11111100) >>> 2 === 0b100000 &&
        (byte2 & 0b00111000) >>> 3 === 0b101,
      getParts: getPartsForImmediateToRegisterOrMemoryArithmeticInstructions,
    },
    ImmediateFromAccumulator: {
      test: (byte1: number) => (byte1 & 0b11111110) >>> 1 === 0b0010110,
      getParts: getPartsForImmediateAndAccumulatorArithmeticInstructions,
    },
  },

  COMPARE: {
    RegisterOrMemoryAndRegister: {
      test: (byte1: number) => (byte1 & 0b11111100) >>> 2 === 0b001110,
      getParts: getPartsForRegisterOrMemoryToOrFromRegisterInstructions,
    },
    ImmediateWithRegisterOrMemory: {
      test: (byte1: number, byte2: number) =>
        (byte1 & 0b11111100) >>> 2 === 0b100000 &&
        (byte2 & 0b00111000) >>> 3 === 0b111,
      getParts: getPartsForImmediateToRegisterOrMemoryArithmeticInstructions,
    },
    ImmediateWithAccumulator: {
      test: (byte1: number) => (byte1 & 0b11111110) >>> 1 === 0b0011110,
      getParts: getPartsForImmediateAndAccumulatorArithmeticInstructions,
    },
  },
};

const main = () => {
  const binaryFilePath = parse(Deno.args)._[0];

  if (!binaryFilePath || typeof binaryFilePath !== "string") return;

  let assemblyText = "bits 16\n";

  const bytes = Deno.readFileSync(binaryFilePath);

  let currentByteIndex = 0;
  // while (currentByteIndex < bytes.length) {
  //   const byte1 = bytes[currentByteIndex];
  //   const byte2 = bytes[currentByteIndex + 1];
  //   const byte3 = bytes[currentByteIndex + 2];
  //   const byte4 = bytes[currentByteIndex + 3];
  //   const byte5 = bytes[currentByteIndex + 4];
  //   const byte6 = bytes[currentByteIndex + 5];

  //   const {
  //     assemblyText: instructionAssemblyText,
  //     numOfBytes: numOfBytesForInstruction,
  //   } = getInstructionInfo(byte1, byte2, byte3, byte4, byte5, byte6);
  //   assemblyText += `\n${instructionAssemblyText}`;
  //   currentByteIndex += numOfBytesForInstruction;
  // }

  return assemblyText;
};

console.log(main());
