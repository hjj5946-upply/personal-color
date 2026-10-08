import { describe, expect, it } from "vitest";
import { Disposables } from "./disposables";

describe("Disposables (분석 종료·취소 시 자원 해제)", () => {
  it("등록 역순으로 한 번만 실행", () => {
    const log: string[] = [];
    const bag = new Disposables();
    bag.add(() => log.push("bitmap"));
    bag.add(() => log.push("canvas"));
    bag.dispose();
    bag.dispose();
    expect(log).toEqual(["canvas", "bitmap"]);
    expect(bag.isDisposed).toBe(true);
  });
  it("하나가 실패해도 나머지는 실행", () => {
    const log: string[] = [];
    const bag = new Disposables();
    bag.add(() => log.push("a"));
    bag.add(() => {
      throw new Error("fail");
    });
    bag.add(() => log.push("c"));
    expect(() => bag.dispose()).not.toThrow();
    expect(log).toEqual(["c", "a"]);
  });
  it("이미 해제된 뒤 등록하면 바로 실행 (취소 후 늦게 만든 자원도 남지 않음)", () => {
    const log: string[] = [];
    const bag = new Disposables();
    bag.dispose();
    bag.add(() => log.push("late"));
    expect(log).toEqual(["late"]);
  });
});
