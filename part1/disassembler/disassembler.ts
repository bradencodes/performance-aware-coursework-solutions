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

const JumpAndLoopInstructionUtils = {
  getInstructionInfo: (mnemonic: string, byte2: number) => {
    const [signedNumber] = new Int8Array([byte2]);
    const assemblyText = `${mnemonic} ${signedNumber}`;

    const numOfBytes = 2;

    return { assemblyText, numOfBytes };
  },
};

export const Instructions = {
  Move: {
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
          Instructions.Move.mnemonic,
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
          Instructions.Move.mnemonic,
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

          return `${Instructions.Move.mnemonic} ${registerName}, ${data}`;
        })();

        return { assemblyText, numOfBytes };
      },
    },
  },

  Add: {
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
          Instructions.Add.mnemonic,
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
          Instructions.Add.mnemonic,
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
          Instructions.Add.mnemonic,
          byte1,
          byte2,
          byte3,
        ),
    },
  },

  Subtract: {
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
          Instructions.Subtract.mnemonic,
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
          Instructions.Subtract.mnemonic,
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
          Instructions.Subtract.mnemonic,
          byte1,
          byte2,
          byte3,
        ),
    },
  },

  Compare: {
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
          Instructions.Compare.mnemonic,
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
          Instructions.Compare.mnemonic,
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
          Instructions.Compare.mnemonic,
          byte1,
          byte2,
          byte3,
        ),
    },
  },

  Jump: {
    OnEqual: {
      mnemonic: "je",
      test: (byte1: number) => byte1 === 0b01110100,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnEqual.mnemonic,
          byte2,
        ),
    },

    OnLess: {
      mnemonic: "jl",
      test: (byte1: number) => byte1 === 0b01111100,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnLess.mnemonic,
          byte2,
        ),
    },

    OnLessOrEqual: {
      mnemonic: "jle",
      test: (byte1: number) => byte1 === 0b01111110,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnLessOrEqual.mnemonic,
          byte2,
        ),
    },

    OnBelow: {
      mnemonic: "jb",
      test: (byte1: number) => byte1 === 0b01110010,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnBelow.mnemonic,
          byte2,
        ),
    },

    OnBelowOrEqual: {
      mnemonic: "jbe",
      test: (byte1: number) => byte1 === 0b01110110,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnBelowOrEqual.mnemonic,
          byte2,
        ),
    },

    OnParity: {
      mnemonic: "jp",
      test: (byte1: number) => byte1 === 0b01111010,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnParity.mnemonic,
          byte2,
        ),
    },

    OnOverflow: {
      mnemonic: "jo",
      test: (byte1: number) => byte1 === 0b01110000,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnOverflow.mnemonic,
          byte2,
        ),
    },

    OnSign: {
      mnemonic: "js",
      test: (byte1: number) => byte1 === 0b01111000,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnSign.mnemonic,
          byte2,
        ),
    },

    OnNotEqual: {
      mnemonic: "jne",
      test: (byte1: number) => byte1 === 0b01110101,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnNotEqual.mnemonic,
          byte2,
        ),
    },

    OnNotLess: {
      mnemonic: "jnl",
      test: (byte1: number) => byte1 === 0b01111101,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnNotLess.mnemonic,
          byte2,
        ),
    },

    OnNotLessOrEqual: {
      mnemonic: "jnle",
      test: (byte1: number) => byte1 === 0b01111111,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnNotLessOrEqual.mnemonic,
          byte2,
        ),
    },

    OnNotBelow: {
      mnemonic: "jnb",
      test: (byte1: number) => byte1 === 0b01110011,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnNotBelow.mnemonic,
          byte2,
        ),
    },

    OnNotBelowOrEqual: {
      mnemonic: "jnbe",
      test: (byte1: number) => byte1 === 0b01110111,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnNotBelowOrEqual.mnemonic,
          byte2,
        ),
    },

    OnNotPar: {
      mnemonic: "jnp",
      test: (byte1: number) => byte1 === 0b01111011,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnNotPar.mnemonic,
          byte2,
        ),
    },

    OnNotOverflow: {
      mnemonic: "jno",
      test: (byte1: number) => byte1 === 0b01110001,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnNotOverflow.mnemonic,
          byte2,
        ),
    },

    OnNotSign: {
      mnemonic: "jns",
      test: (byte1: number) => byte1 === 0b01111001,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnNotSign.mnemonic,
          byte2,
        ),
    },

    OnCxZero: {
      mnemonic: "jcxz",
      test: (byte1: number) => byte1 === 0b11100011,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Jump.OnCxZero.mnemonic,
          byte2,
        ),
    },
  },

  Loop: {
    CxTimes: {
      mnemonic: "loop",
      test: (byte1: number) => byte1 === 0b11100010,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Loop.CxTimes.mnemonic,
          byte2,
        ),
    },

    WhileZero: {
      mnemonic: "loopz",
      test: (byte1: number) => byte1 === 0b11100001,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Loop.WhileZero.mnemonic,
          byte2,
        ),
    },

    WhileNotZero: {
      mnemonic: "loopnz",
      test: (byte1: number) => byte1 === 0b11100000,
      getInstructionInfo: (_: number, byte2: number) =>
        JumpAndLoopInstructionUtils.getInstructionInfo(
          Instructions.Loop.WhileNotZero.mnemonic,
          byte2,
        ),
    },
  },
};

const InstructionTestersAndInfoGetters = (() => {
  interface InstructionTesterAndInfoGetterObj {
    test: (...any: unknown[]) => boolean;
    getInstructionInfo: (...any: unknown[]) => {
      assemblyText: string;
      numOfBytes: number;
    };
  }
  const results: InstructionTesterAndInfoGetterObj[] = [];

  const findInstructionTestersAndInfoGetters = (obj: unknown) => {
    if (typeof obj !== "object" || obj === null) return;

    if ("test" in obj && "getInstructionInfo" in obj) {
      results.push({
        test: obj.test as (...any: unknown[]) => boolean,
        getInstructionInfo: obj.getInstructionInfo as (...any: unknown[]) => {
          assemblyText: string;
          numOfBytes: number;
        },
      });

      return;
    }

    for (const key in obj) {
      findInstructionTestersAndInfoGetters(
        (obj as { [key: string]: unknown })[key],
      );
    }
  };

  findInstructionTestersAndInfoGetters(Instructions);

  return results;
})();

export const getInstructionInfoFromUnknownCode = (
  byte1: number,
  byte2: number,
  byte3?: number,
  byte4?: number,
  byte5?: number,
  byte6?: number,
): { assemblyText: string; numOfBytes: number } => {
  const { getInstructionInfo } =
    InstructionTestersAndInfoGetters.find((obj) =>
      obj.test(byte1, byte2, byte3, byte4, byte5, byte6)
    ) || { getInstructionInfo: null };

  if (typeof getInstructionInfo !== "function") {
    return { assemblyText: "invalidByte", numOfBytes: 1 };
  }

  return getInstructionInfo(byte1, byte2, byte3, byte4, byte5, byte6);
};

export const createAssemblyText = (bytes: Uint8Array) => {
  let assemblyText = "bits 16\n";

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
