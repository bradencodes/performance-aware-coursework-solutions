import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { getInstructionInfoFromUnknownCode, INSTRUCTIONS } from "./main3.ts";

describe("INSTRUCTIONS", () => {
  describe("MOVE", () => {
    describe("RegisterOrMemoryToOrFromRegister", () => {
      describe("getInstructionInfo()", () => {
        describe("gets the correct assembly text", () => {
          it("works for d", () => {
            const byte2 = 0b11_100_111;

            const { assemblyText: destination0 } = INSTRUCTIONS.MOVE
              .RegisterOrMemoryToOrFromRegister.getInstructionInfo(
                0b100010_0_1,
                byte2,
              );

            const { assemblyText: destination1 } = INSTRUCTIONS.MOVE
              .RegisterOrMemoryToOrFromRegister.getInstructionInfo(
                0b100010_1_1,
                byte2,
              );

            expect(destination0).toBe("mov di, sp");
            expect(destination1).toBe("mov sp, di");
          });

          it("works for w", () => {
            const byte2 = 0b11_100_111;

            const { assemblyText: width0 } = INSTRUCTIONS.MOVE
              .RegisterOrMemoryToOrFromRegister.getInstructionInfo(
                0b100010_1_0,
                byte2,
              );

            const { assemblyText: width1 } = INSTRUCTIONS.MOVE
              .RegisterOrMemoryToOrFromRegister.getInstructionInfo(
                0b100010_1_1,
                byte2,
              );

            expect(width0).toBe("mov ah, bh");
            expect(width1).toBe("mov sp, di");
          });

          it("works for mod", () => {
            const byte1 = 0b100010_1_0;

            const { assemblyText: mod0 } = INSTRUCTIONS.MOVE
              .RegisterOrMemoryToOrFromRegister.getInstructionInfo(
                byte1,
                0b00_100_111,
              );

            const { assemblyText: mod1 } = INSTRUCTIONS.MOVE
              .RegisterOrMemoryToOrFromRegister.getInstructionInfo(
                byte1,
                0b01_100_111,
                0b00101000, // 40
              );

            const { assemblyText: mod2 } = INSTRUCTIONS.MOVE
              .RegisterOrMemoryToOrFromRegister.getInstructionInfo(
                byte1,
                0b10_100_111,
                0b00101000,
                0b00000001, // 296
              );

            const { assemblyText: mod3 } = INSTRUCTIONS.MOVE
              .RegisterOrMemoryToOrFromRegister.getInstructionInfo(
                byte1,
                0b11_100_111,
              );

            expect(mod0).toBe("mov ah, [bx]");
            expect(mod1).toBe("mov ah, [bx + 40]");
            expect(mod2).toBe("mov ah, [bx + 296]");
            expect(mod3).toBe("mov ah, bh");
          });

          it("works for immediate value", () => {
            const { assemblyText } = INSTRUCTIONS.MOVE
              .RegisterOrMemoryToOrFromRegister.getInstructionInfo(
                0b100010_1_0,
                0b00_100_110,
                0b00101000, // 40
              );

            expect(assemblyText).toBe("mov ah, [40]");
          });
        });

        it("gets the correct number of bytes", () => {
          const { numOfBytes: numOfBytes2 } = INSTRUCTIONS.MOVE
            .RegisterOrMemoryToOrFromRegister.getInstructionInfo(
              0b100010_0_1,
              0b11_100_111,
            );
          expect(numOfBytes2).toBe(2);

          const { numOfBytes: numOfBytes3 } = INSTRUCTIONS.MOVE
            .RegisterOrMemoryToOrFromRegister.getInstructionInfo(
              0b100010_1_0,
              0b01_100_111,
              0b00101000, // 40
            );
          expect(numOfBytes3).toBe(3);

          const { numOfBytes: numOfBytes4 } = INSTRUCTIONS.MOVE
            .RegisterOrMemoryToOrFromRegister.getInstructionInfo(
              0b100010_1_0,
              0b10_100_111,
              0b00101000,
              0b00000001, // 296
            );
          expect(numOfBytes4).toBe(4);
        });
      });
    });

    describe("ImmediateToRegisterOrMemory", () => {
      describe("getInstructionInfo()", () => {
        describe("gets the correct assembly text", () => {
          it("works for w", () => {
            const byte2 = 0b11_000_111;

            const { assemblyText: width0 } = INSTRUCTIONS.MOVE
              .ImmediateToRegisterOrMemory.getInstructionInfo(
                0b1100010_0,
                byte2,
                0b00101000, // 40
              );
            expect(width0).toBe("mov bh, 40");

            const { assemblyText: width1 } = INSTRUCTIONS.MOVE
              .ImmediateToRegisterOrMemory.getInstructionInfo(
                0b1100010_1,
                byte2,
                0b00101000,
                0b00000001, // 296
              );
            expect(width1).toBe("mov di, 296");
          });

          it("works for mod", () => {
            const byte1 = 0b1100010_0;

            const { assemblyText: mod0 } = INSTRUCTIONS.MOVE
              .ImmediateToRegisterOrMemory.getInstructionInfo(
                byte1,
                0b00_000_111,
                0b00101000, // 40
              );
            expect(mod0).toBe("mov [bx], byte 40");

            const { assemblyText: mod1 } = INSTRUCTIONS.MOVE
              .ImmediateToRegisterOrMemory.getInstructionInfo(
                byte1,
                0b01_000_111,
                0b00000001, // 1
                0b00101000, // 40
              );
            expect(mod1).toBe("mov [bx + 1], byte 40");

            const { assemblyText: mod2 } = INSTRUCTIONS.MOVE
              .ImmediateToRegisterOrMemory.getInstructionInfo(
                byte1,
                0b10_000_111,
                0b00000001, // 1
                0b00000001, // +256 = 257
                0b00101000, // 40
              );
            expect(mod2).toBe("mov [bx + 257], byte 40");

            const { assemblyText: mod3 } = INSTRUCTIONS.MOVE
              .ImmediateToRegisterOrMemory.getInstructionInfo(
                byte1,
                0b11_000_111,
                0b00101000, // 40
              );
            expect(mod3).toBe("mov bh, 40");
          });
        });
      });
    });
  });
});

describe("getInstructionInfoFromUnknownCode", () => {
  it("works for register from memory", () => {
    expect(getInstructionInfoFromUnknownCode()).toBe("add bx, [bx + si]");

    expect(getInstructionInfoFromUnknownCode()).toBe("add bx, [bp + 0]");
  });

  it("works for immediate to register", () => {
    expect(getInstructionInfoFromUnknownCode()).toBe("add si, 2");

    expect(getInstructionInfoFromUnknownCode()).toBe("add bp, 2");

    expect(getInstructionInfoFromUnknownCode()).toBe("add cx, 8");
  });

  it("works for register from memory with 8-bit displacement", () => {
    expect(getInstructionInfoFromUnknownCode()).toBe("add bx, [bp + 0]");

    expect(getInstructionInfoFromUnknownCode()).toBe("add cx, [bx + 2]");

    expect(getInstructionInfoFromUnknownCode()).toBe("add bh, [bp + si + 4]");

    expect(getInstructionInfoFromUnknownCode()).toBe("add di, [bp + di + 6]");
  });

  it("works for register to memory", () => {
    expect(getInstructionInfoFromUnknownCode()).toBe("add [bx + si], bx");

    expect(getInstructionInfoFromUnknownCode()).toBe("add [bp], bx");
  });

  it("works for register to memory with 8-bit displacement", () => {
    expect(getInstructionInfoFromUnknownCode()).toBe("add [bp + 0], bx");

    expect(getInstructionInfoFromUnknownCode()).toBe("add [bx + 2], cx");

    expect(getInstructionInfoFromUnknownCode()).toBe("add [bp + si + 4], bh");

    expect(getInstructionInfoFromUnknownCode()).toBe("add [bp + di + 6], di");
  });

  it("works for immediate to register", () => {
    expect(getInstructionInfoFromUnknownCode()).toBe("add byte [bx], 34");

    expect(getInstructionInfoFromUnknownCode()).toBe(
      "add word [bp + si + 1000], 29",
    );
  });

  it("works for register from memory or register", () => {
    expect(getInstructionInfoFromUnknownCode()).toBe("add ax, [bp]");

    expect(getInstructionInfoFromUnknownCode()).toBe("add al, [bx + si]");

    expect(getInstructionInfoFromUnknownCode()).toBe("add ax, bx");

    expect(getInstructionInfoFromUnknownCode()).toBe("add al, ah");
  });

  it("works for immediate to accumulator", () => {
    expect(getInstructionInfoFromUnknownCode()).toBe("add ax, 1000");

    expect(getInstructionInfoFromUnknownCode()).toBe("add al, -30");

    expect(getInstructionInfoFromUnknownCode()).toBe("add al, 9");
  });
});
