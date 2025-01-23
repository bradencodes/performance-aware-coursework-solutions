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

const RegisterOrMemoryAndRegisterInstructions = {
  getParts: (
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
  },

  getAssemblyText: (
    { d, w, mod, reg, rm, disp, mnemonic }: {
      d: number;
      w: number;
      mod: number;
      reg: number;
      rm: number;
      disp?: number;
      mnemonic: string;
    },
  ) => {
    const registerName = getRegisterName(w, reg);

    const rmString = getRmString({ w, mod, rm, disp });

    const destination = d ? registerName : rmString;
    const source = !d ? registerName : rmString;

    return `${mnemonic} ${destination}, ${source}`;
  },

  getInstructionInfo: (
    mnemonic: string,
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
    } = RegisterOrMemoryAndRegisterInstructions.getParts(
      byte1,
      byte2,
      byte3,
      byte4,
    );

    const assemblyText = RegisterOrMemoryAndRegisterInstructions
      .getAssemblyText({
        d,
        w,
        mod,
        reg,
        rm,
        disp,
        mnemonic,
      });

    return { assemblyText, numOfBytes };
  },
};

const ImmediateAndRegisterOrMemoryInstructions = {
  getParts: (
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
  },

  getAssemblyText: (
    { mnemonic, w, mod, rm, disp, data }: {
      mnemonic: string;
      w: number;
      mod: number;
      rm: number;
      disp?: number;
      data: number;
    },
  ) => {
    const rmString = getRmString({ w, mod, rm, disp });

    const widthPrefix = (() => {
      if (mod === 0b11) return null;

      if (w === 0b1) return "word";

      return "byte";
    })();

    return `${mnemonic} ${rmString}, ${
      widthPrefix ? `${widthPrefix} ` : ""
    }${data}`;
  },

  getInstructionInfo: (
    mnemonic: string,
    byte1: number,
    byte2: number,
    byte3: number,
    byte4?: number,
    byte5?: number,
    byte6?: number,
  ) => {
    const { w, mod, rm, disp, data, numOfBytes } =
      ImmediateAndRegisterOrMemoryInstructions.getParts(
        byte1,
        byte2,
        byte3,
        byte4,
        byte5,
        byte6,
      );

    const assemblyText = ImmediateAndRegisterOrMemoryInstructions
      .getAssemblyText({ mnemonic, w, mod, rm, disp, data });

    return { assemblyText, numOfBytes };
  },
};

const ImmediateAndRegisterOrMemoryArithmeticInstructions = {
  getParts: (
    byte1: number,
    byte2: number,
    byte3: number,
    byte4?: number,
    byte5?: number,
    byte6?: number,
  ) => {
    const s = (byte1 && 0b00000010) >>> 1;
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

    const isData8bit = w === 0b0 || s === 0b1;

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

      if (isData8bit) return dataLo;

      return (dataHi << 8) | dataLo;
    })();

    const numOfBytes = (() => {
      if (!hasDispLo) {
        if (isData8bit) return 3;
        return 4;
      }

      if (hasDispHi) {
        if (isData8bit) return 5;
        return 6;
      }

      if (isData8bit) return 4;
      return 5;
    })();

    return { s, w, mod, rm, disp, data, numOfBytes };
  },

  getAssemblyText: ImmediateAndRegisterOrMemoryInstructions.getAssemblyText,

  getInstructionInfo: (
    mnemonic: string,
    byte1: number,
    byte2: number,
    byte3: number,
    byte4?: number,
    byte5?: number,
    byte6?: number,
  ) => {
    const { w, mod, rm, disp, data, numOfBytes } =
      ImmediateAndRegisterOrMemoryArithmeticInstructions.getParts(
        byte1,
        byte2,
        byte3,
        byte4,
        byte5,
        byte6,
      );

    const assemblyText = ImmediateAndRegisterOrMemoryInstructions
      .getAssemblyText({ mnemonic, w, mod, rm, disp, data });

    return { assemblyText, numOfBytes };
  },
};

const ImmediateAndAccumulatorArithmeticInstructions = {
  getParts: (
    byte1: number,
    byte2: number,
    byte3?: number,
  ) => {
    const w = byte1 & 0b00000001;

    const is8bit = WIDTH.getIs8bit(w);

    const data = (() => {
      if (is8bit) {
        return byte2;
      }

      return (byte3 as number << 8) | byte2;
    })();

    const numOfBytes = (() => {
      if (is8bit) return 2;

      return 3;
    })();

    return { w, data, numOfBytes };
  },

  getAssemblyText: (
    { mnemonic, w, data }: { mnemonic: string; w: number; data: number },
  ) => {
    const registerName = w === 0b0 ? "al" : "ax";

    return `${mnemonic} ${registerName} ${data}`;
  },

  getInstructionInfo: (
    mnemonic: string,
    byte1: number,
    byte2: number,
    byte3?: number,
  ) => {
    const { w, data, numOfBytes } =
      ImmediateAndAccumulatorArithmeticInstructions.getParts(
        byte1,
        byte2,
        byte3,
      );

    const assemblyText = ImmediateAndAccumulatorArithmeticInstructions
      .getAssemblyText({ mnemonic, w, data });

    return { assemblyText, numOfBytes };
  },
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

const getRmString = (
  { w, mod, rm, disp }: { w: number; mod: number; rm: number; disp?: number },
) => {
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
};

export const INSTRUCTIONS = {
  MOVE: {
    mnemonic: "mov",

    RegisterOrMemoryToOrFromRegister: {
      test: (byte1: number) => (byte1 & 0b11111100) >>> 2 === 0b100010,
      getInstructionInfo: (
        byte1: number,
        byte2: number,
        byte3?: number,
        byte4?: number,
      ) =>
        RegisterOrMemoryAndRegisterInstructions.getInstructionInfo(
          INSTRUCTIONS.MOVE.mnemonic,
          byte1,
          byte2,
          byte3,
          byte4,
        ),
    },

    ImmediateToRegisterOrMemory: {
      test: (byte1: number, byte2: number) =>
        (byte1 & 0b11111110) >>> 1 === 0b1100011 &&
        (byte2 & 0b00111000) >>> 3 === 0b000,
      getInstructionInfo: (
        byte1: number,
        byte2: number,
        byte3: number,
        byte4?: number,
        byte5?: number,
        byte6?: number,
      ) =>
        ImmediateAndRegisterOrMemoryInstructions.getInstructionInfo(
          INSTRUCTIONS.MOVE.mnemonic,
          byte1,
          byte2,
          byte3,
          byte4,
          byte5,
          byte6,
        ),
    },

    ImmediateToRegister: {
      test: (byte1: number) => (byte1 & 0b11110000) >>> 4 === 0b1011,
      getInstructionInfo: (byte1: number, byte2: number, byte3?: number) => {
        const getParts = (byte1: number, byte2: number, byte3?: number) => {
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
        };
        const { w, reg, data, numOfBytes } = getParts(byte1, byte2, byte3);

        const assemblyText = (() => {
          const registerName = getRegisterName(w, reg);

          return `${INSTRUCTIONS.MOVE.mnemonic} ${registerName}, ${data}`;
        })();

        return { assemblyText, numOfBytes };
      },
    },
  },

  ADD: {
    mnemonic: "add",

    RegisterOrMemoryWithRegisterToEither: {
      test: (byte1: number) => (byte1 & 0b11111100) >>> 2 === 0b000000,
      getInstructionInfo: (
        byte1: number,
        byte2: number,
        byte3?: number,
        byte4?: number,
      ) =>
        RegisterOrMemoryAndRegisterInstructions.getInstructionInfo(
          INSTRUCTIONS.ADD.mnemonic,
          byte1,
          byte2,
          byte3,
          byte4,
        ),
    },

    ImmediateToRegisterOrMemory: {
      test: (byte1: number, byte2: number) =>
        (byte1 & 0b11111100) >>> 2 === 0b100000 &&
        (byte2 & 0b00111000) >>> 3 === 0b000,
      getInstructionInfo: (
        byte1: number,
        byte2: number,
        byte3: number,
        byte4?: number,
        byte5?: number,
        byte6?: number,
      ) =>
        ImmediateAndRegisterOrMemoryArithmeticInstructions.getInstructionInfo(
          INSTRUCTIONS.ADD.mnemonic,
          byte1,
          byte2,
          byte3,
          byte4,
          byte5,
          byte6,
        ),
    },

    ImmediateToAccumulator: {
      test: (byte1: number) => (byte1 & 0b11111110) >>> 1 === 0b0000010,
      getInstructionInfo: (byte1: number, byte2: number, byte3?: number) =>
        ImmediateAndAccumulatorArithmeticInstructions.getInstructionInfo(
          INSTRUCTIONS.ADD.mnemonic,
          byte1,
          byte2,
          byte3,
        ),
    },
  },

  SUBTRACT: {
    mnemonic: "sub",

    RegisterOrMemoryAndRegisterToEither: {
      test: (byte1: number) => (byte1 & 0b11111100) >>> 2 === 0b001010,
      getInstructionInfo: (
        byte1: number,
        byte2: number,
        byte3?: number,
        byte4?: number,
      ) =>
        RegisterOrMemoryAndRegisterInstructions.getInstructionInfo(
          INSTRUCTIONS.SUBTRACT.mnemonic,
          byte1,
          byte2,
          byte3,
          byte4,
        ),
    },

    ImmediateFromRegisterOrMemory: {
      test: (byte1: number, byte2: number) =>
        (byte1 & 0b11111100) >>> 2 === 0b100000 &&
        (byte2 & 0b00111000) >>> 3 === 0b101,
      getInstructionInfo: (
        byte1: number,
        byte2: number,
        byte3: number,
        byte4?: number,
        byte5?: number,
        byte6?: number,
      ) =>
        ImmediateAndRegisterOrMemoryArithmeticInstructions.getInstructionInfo(
          INSTRUCTIONS.SUBTRACT.mnemonic,
          byte1,
          byte2,
          byte3,
          byte4,
          byte5,
          byte6,
        ),
    },

    ImmediateFromAccumulator: {
      test: (byte1: number) => (byte1 & 0b11111110) >>> 1 === 0b0010110,
      getInstructionInfo: (byte1: number, byte2: number, byte3?: number) =>
        ImmediateAndAccumulatorArithmeticInstructions.getInstructionInfo(
          INSTRUCTIONS.SUBTRACT.mnemonic,
          byte1,
          byte2,
          byte3,
        ),
    },
  },

  COMPARE: {
    mnemonic: "cmp",

    RegisterOrMemoryAndRegister: {
      test: (byte1: number) => (byte1 & 0b11111100) >>> 2 === 0b001110,
      getInstructionInfo: (
        byte1: number,
        byte2: number,
        byte3?: number,
        byte4?: number,
      ) =>
        RegisterOrMemoryAndRegisterInstructions.getInstructionInfo(
          INSTRUCTIONS.COMPARE.mnemonic,
          byte1,
          byte2,
          byte3,
          byte4,
        ),
    },

    ImmediateWithRegisterOrMemory: {
      test: (byte1: number, byte2: number) =>
        (byte1 & 0b11111100) >>> 2 === 0b100000 &&
        (byte2 & 0b00111000) >>> 3 === 0b111,
      getInstructionInfo: (
        byte1: number,
        byte2: number,
        byte3: number,
        byte4?: number,
        byte5?: number,
        byte6?: number,
      ) =>
        ImmediateAndRegisterOrMemoryArithmeticInstructions.getInstructionInfo(
          INSTRUCTIONS.COMPARE.mnemonic,
          byte1,
          byte2,
          byte3,
          byte4,
          byte5,
          byte6,
        ),
    },

    ImmediateWithAccumulator: {
      test: (byte1: number) => (byte1 & 0b11111110) >>> 1 === 0b0011110,
      getInstructionInfo: (byte1: number, byte2: number, byte3?: number) =>
        ImmediateAndAccumulatorArithmeticInstructions.getInstructionInfo(
          INSTRUCTIONS.COMPARE.mnemonic,
          byte1,
          byte2,
          byte3,
        ),
    },
  },
};

export const getInstructionInfoFromUnknownCode = (
  byte1: number,
  byte2: number,
  byte3?: number,
  byte4?: number,
  byte5?: number,
  byte6?: number,
): { assemblyText: string; numOfBytes: number } => {
  const { MOVE, ADD, SUBTRACT, COMPARE } = INSTRUCTIONS;

  if (MOVE.RegisterOrMemoryToOrFromRegister.test(byte1)) {
    return MOVE.RegisterOrMemoryToOrFromRegister.getInstructionInfo(
      byte1,
      byte2,
      byte3,
      byte4,
    );
  }
  if (MOVE.ImmediateToRegisterOrMemory.test(byte1, byte2)) {
    return MOVE.ImmediateToRegisterOrMemory.getInstructionInfo(
      byte1,
      byte2,
      byte3 as number,
      byte4,
      byte5,
      byte6,
    );
  }
  if (MOVE.ImmediateToRegister.test(byte1)) {
    return MOVE.ImmediateToRegister.getInstructionInfo(
      byte1,
      byte2,
      byte3,
    );
  }

  if (ADD.RegisterOrMemoryWithRegisterToEither.test(byte1)) {
    return ADD.RegisterOrMemoryWithRegisterToEither.getInstructionInfo(
      byte1,
      byte2,
      byte3,
      byte4,
    );
  }
  if (ADD.ImmediateToRegisterOrMemory.test(byte1, byte2)) {
    return ADD.ImmediateToRegisterOrMemory.getInstructionInfo(
      byte1,
      byte2,
      byte3 as number,
      byte4,
      byte5,
      byte6,
    );
  }
  if (ADD.ImmediateToAccumulator.test(byte1)) {
    return ADD.ImmediateToAccumulator.getInstructionInfo(
      byte1,
      byte2,
      byte3,
    );
  }

  if (SUBTRACT.RegisterOrMemoryAndRegisterToEither.test(byte1)) {
    return SUBTRACT.RegisterOrMemoryAndRegisterToEither.getInstructionInfo(
      byte1,
      byte2,
      byte3,
      byte4,
    );
  }
  if (SUBTRACT.ImmediateFromRegisterOrMemory.test(byte1, byte2)) {
    return SUBTRACT.ImmediateFromRegisterOrMemory.getInstructionInfo(
      byte1,
      byte2,
      byte3 as number,
      byte4,
      byte5,
      byte6,
    );
  }
  if (SUBTRACT.ImmediateFromAccumulator.test(byte1)) {
    return SUBTRACT.ImmediateFromAccumulator.getInstructionInfo(
      byte1,
      byte2,
      byte3,
    );
  }

  if (COMPARE.RegisterOrMemoryAndRegister.test(byte1)) {
    return COMPARE.RegisterOrMemoryAndRegister.getInstructionInfo(
      byte1,
      byte2,
      byte3,
      byte4,
    );
  }
  if (COMPARE.ImmediateWithRegisterOrMemory.test(byte1, byte2)) {
    return COMPARE.ImmediateWithRegisterOrMemory.getInstructionInfo(
      byte1,
      byte2,
      byte3 as number,
      byte4,
      byte5,
      byte6,
    );
  }
  if (COMPARE.ImmediateWithAccumulator.test(byte1)) {
    return COMPARE.ImmediateWithAccumulator.getInstructionInfo(
      byte1,
      byte2,
      byte3,
    );
  }

  return { assemblyText: "invalidByte", numOfBytes: 1 };
};

const main = () => {
  const binaryFilePath = parse(Deno.args)._[0];

  if (!binaryFilePath || typeof binaryFilePath !== "string") return;

  let assemblyText = "bits 16\n";

  const bytes = Deno.readFileSync(binaryFilePath);

  let currentByteIndex = 0;
  while (currentByteIndex < bytes.length) {
    const byte1 = bytes[currentByteIndex];
    const byte2 = bytes[currentByteIndex + 1];
    const byte3 = bytes[currentByteIndex + 2];
    const byte4 = bytes[currentByteIndex + 3];
    const byte5 = bytes[currentByteIndex + 4];
    const byte6 = bytes[currentByteIndex + 5];

    const {
      assemblyText: instructionAssemblyText,
      numOfBytes: numOfBytesForInstruction,
    } = getInstructionInfoFromUnknownCode(
      byte1,
      byte2,
      byte3,
      byte4,
      byte5,
      byte6,
    );
    assemblyText += `\n${instructionAssemblyText}`;
    currentByteIndex += numOfBytesForInstruction;
  }

  return assemblyText;
};

console.log(main());
