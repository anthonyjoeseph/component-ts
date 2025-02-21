export type None = { _tag: "None" };
export type Some<A> = { _tag: "Some"; value: A };
export type Option<A> = Some<A> | None;
export const none: Option<never> = { _tag: "None" };
export const some = <A>(value: A): Option<A> => ({ _tag: "Some", value });

export const pushUnique = (arr: symbol[], maybeUnique: symbol[]): void => {
  for (const s of maybeUnique) {
    if (!arr.includes(s)) {
      arr.push(s);
    }
  }
};

export type SymbolMapping<A> = { provenance: symbol; values: A[] }[];

export const get = <A>(mapping: SymbolMapping<A>, index: symbol): Option<A[]> => {
  const f = mapping.find((i) => i.provenance === index);
  if (!f) return none;
  return some(f.values);
};

export const set = <A>(mapping: SymbolMapping<A>, newSymbol: symbol, newVal: A): void => {
  const oldSet = mapping.find((m) => m.provenance === newSymbol);
  if (oldSet) {
    oldSet.values.push(newVal);
  } else {
    mapping.push({ provenance: newSymbol, values: [newVal] });
  }
};

export const remove = <A>(mapping: SymbolMapping<A>, oldSymbol: symbol): void => {
  const oldIndex = mapping.findIndex((m) => m.provenance === oldSymbol);
  mapping.splice(oldIndex, 1);
};
