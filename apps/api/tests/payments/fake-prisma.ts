/**
 * Database giả trong bộ nhớ, chỉ đủ các hàm Prisma mà payments và dashboard dùng.
 * $transaction có rollback thật: lỗi trong callback thì dữ liệu quay về như cũ.
 */
export class Decimal {
  private v: string;
  constructor(v: number | string | Decimal) {
    this.v = String(v instanceof Decimal ? v.v : v);
  }
  toFixed(n: number) { return Number(this.v).toFixed(n); }
  equals(o: Decimal | number | string) { return Number(this.v) === Number(o instanceof Decimal ? o.v : o); }
  toString() { return this.v; }
  valueOf() { return Number(this.v); }
  toJSON() { return this.v; }
}

type Row = Record<string, any>;
type Tables = { order: Row[]; payment: Row[]; productVariant: Row[]; product: Row[] };

const isPlain = (v: unknown) => v !== null && typeof v === "object" && !(v instanceof Date) && !(v instanceof Decimal) && !Array.isArray(v);
const norm = (v: any) => (v instanceof Date ? v.getTime() : v instanceof Decimal ? Number(v) : v);

function clone<T>(x: T): T {
  if (x instanceof Date) return new Date(x.getTime()) as T;
  if (x instanceof Decimal) return new Decimal(x) as T;
  if (Array.isArray(x)) return x.map(clone) as T;
  if (isPlain(x)) return Object.fromEntries(Object.entries(x as Row).map(([k, v]) => [k, clone(v)])) as T;
  return x;
}

export function createFakePrisma(seed: Partial<Tables> = {}) {
  let db: Tables = { order: [], payment: [], productVariant: [], product: [], ...clone(seed) };
  const hooks: { beforeUpdate?: (table: string, data: Row) => void } = {};

  const relation = (table: keyof Tables, row: Row, key: string): Row | null => {
    if (table === "payment" && key === "order") return db.order.find((o) => o.id === row.orderId) ?? null;
    if (table === "productVariant" && key === "product") return db.product.find((p) => p.id === row.productId) ?? null;
    return null;
  };
  const relTable = (key: string): keyof Tables => (key === "order" ? "order" : "product");

  function matchValue(actual: any, cond: any): boolean {
    if (!isPlain(cond)) return norm(actual) === norm(cond);
    for (const [op, v] of Object.entries(cond)) {
      const a = norm(actual), b = norm(v);
      if (op === "gte" && !(a != null && a >= b)) return false;
      if (op === "gt" && !(a != null && a > b)) return false;
      if (op === "lt" && !(a != null && a < b)) return false;
      if (op === "lte" && !(a != null && a <= b)) return false;
      if (op === "not" && a === b) return false;
      if (op === "in" && !(v as any[]).map(norm).includes(a)) return false;
      if (op === "equals" && a !== b) return false;
    }
    return true;
  }
  function match(table: keyof Tables, row: Row, where: Row = {}): boolean {
    return Object.entries(where).every(([k, cond]) => {
      if (k === "order" || k === "product") {
        const rel = relation(table, row, k);
        return rel !== null && match(relTable(k), rel, cond);
      }
      return matchValue(row[k], cond);
    });
  }
  function project(table: keyof Tables, row: Row, args: Row = {}): Row {
    if (args.select) {
      const out: Row = {};
      for (const [k, v] of Object.entries(args.select)) {
        if (!v) continue;
        if (k === "order" || k === "product") {
          const rel = relation(table, row, k);
          out[k] = rel ? project(relTable(k), rel, v === true ? {} : (v as Row)) : null;
        } else out[k] = clone(row[k]);
      }
      return out;
    }
    const out = clone(row);
    for (const [k, v] of Object.entries(args.include ?? {})) if (v) out[k] = clone(relation(table, row, k));
    return out;
  }
  function sortRows(rows: Row[], orderBy?: Row) {
    if (!orderBy) return rows;
    const [[k, dir]] = Object.entries(orderBy);
    return [...rows].sort((a, b) => {
      const x = norm(a[k]), y = norm(b[k]);
      return (x < y ? -1 : x > y ? 1 : 0) * (dir === "desc" ? -1 : 1);
    });
  }

  function model(table: keyof Tables) {
    const rows = () => db[table];
    const find = (args: Row = {}) => sortRows(rows().filter((r) => match(table, r, args.where)), args.orderBy);
    return {
      findFirst: async (args: Row = {}) => { const r = find(args)[0]; return r ? project(table, r, args) : null; },
      findUnique: async (args: Row) => { const r = find(args)[0]; return r ? project(table, r, args) : null; },
      findUniqueOrThrow: async (args: Row) => {
        const r = find(args)[0];
        if (!r) throw Object.assign(new Error("Not found"), { code: "P2025" });
        return project(table, r, args);
      },
      findMany: async (args: Row = {}) => find(args).slice(0, args.take ?? Infinity).map((r) => project(table, r, args)),
      create: async ({ data }: Row) => {
        const row = { createdAt: new Date(), failureReason: null, providerTransactionId: null, paidAt: null, paymentUrl: null, ...clone(data) };
        if (row.amount !== undefined && !(row.amount instanceof Decimal)) row.amount = new Decimal(row.amount);
        rows().push(row);
        return clone(row);
      },
      update: async ({ where, data }: Row) => {
        hooks.beforeUpdate?.(table, data);
        const r = rows().find((x) => match(table, x, where));
        if (!r) throw Object.assign(new Error("Record to update not found"), { code: "P2025" });
        Object.assign(r, clone(data), { updatedAt: new Date() });
        return clone(r);
      },
      updateMany: async ({ where, data }: Row) => {
        const list = rows().filter((x) => match(table, x, where));
        for (const r of list) Object.assign(r, clone(data), { updatedAt: new Date() });
        return { count: list.length };
      },
      aggregate: async (args: Row) => {
        const list = find(args);
        const out: Row = {};
        if (args._count) out._count = { _all: list.length };
        if (args._sum) {
          out._sum = {};
          for (const f of Object.keys(args._sum))
            out._sum[f] = list.length ? new Decimal(list.reduce((s, r) => s + Number(r[f]), 0)) : null;
        }
        return out;
      },
      groupBy: async (args: Row) => {
        const groups = new Map<string, Row[]>();
        for (const r of find(args)) {
          const key = JSON.stringify(args.by.map((b: string) => r[b]));
          groups.set(key, [...(groups.get(key) ?? []), r]);
        }
        return [...groups.entries()].map(([key, list]) => {
          const out: Row = Object.fromEntries(args.by.map((b: string, i: number) => [b, JSON.parse(key)[i]]));
          if (args._count) out._count = { _all: list.length };
          if (args._sum) {
            out._sum = {};
            for (const f of Object.keys(args._sum)) out._sum[f] = new Decimal(list.reduce((s, r) => s + Number(r[f]), 0));
          }
          return out;
        });
      },
    };
  }

  const client: Row = {
    order: model("order"),
    payment: model("payment"),
    productVariant: model("productVariant"),
    product: model("product"),
    locks: [] as string[],
    $executeRaw: async (_strings: TemplateStringsArray, ...values: unknown[]) => {
      client.locks.push(String(values[0]));
      return 1;
    },
    $transaction: async (fn: (tx: Row) => Promise<unknown>) => {
      const snapshot = clone(db);
      try {
        return await fn(client);
      } catch (e) {
        db = snapshot; // rollback
        throw e;
      }
    },
  };
  const reset = (next: Partial<Tables> = {}) => {
    db = { order: [], payment: [], productVariant: [], product: [], ...clone(next) };
    client.locks.length = 0;
    hooks.beforeUpdate = undefined;
  };
  return { prisma: client, db: () => db, hooks, reset };
}
