import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { INSTRUCTIONS } from "./main3.ts";

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
  });
});
