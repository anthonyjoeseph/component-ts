export const fun2 = async (start: number): Promise<number> => {
  const fun1 = (await import("./nonStrict")).fun;

  if (start < 4) {
    return fun1(start);
  }
  return start;
};
