/**
 * Auto-generated aligned buffer accessors
 * Use with WebAssembly.Memory for zero-copy access
 */

export const LocationType = {
  Unknown: 0,
  State: 1,
  City: 2,
  Landmark: 4,
  Country: 8,
  Region: 16,
  Airport: 32,
} as const;
export type LocationType = typeof LocationType[keyof typeof LocationType];

export const ALIGNEDLOCATION_SIZE = 148;
export const ALIGNEDLOCATION_ALIGN = 4;

export const AlignedLocationOffsets = {
  name: 0,
  longitude: 128,
  latitude: 132,
  heading: 136,
  population: 140,
  type: 144,
  reserved: 146,
} as const;

export class AlignedLocationView {
  private readonly view: DataView;

  constructor(buffer: ArrayBuffer, byteOffset = 0) {
    this.view = new DataView(buffer, byteOffset, 148);
  }

  static fromMemory(memory: WebAssembly.Memory, ptr: number): AlignedLocationView {
    return new AlignedLocationView(memory.buffer, ptr);
  }

  static fromBytes(bytes: Uint8Array, offset = 0): AlignedLocationView {
    return new AlignedLocationView(bytes.buffer, bytes.byteOffset + offset);
  }

  get name(): Uint8Array {
    return new Uint8Array(this.view.buffer, this.view.byteOffset + 0, 128);
  }

  get longitude(): number {
    return this.view.getFloat32(128, true);
  }
  set longitude(v: number) {
    this.view.setFloat32(128, v, true);
  }

  get latitude(): number {
    return this.view.getFloat32(132, true);
  }
  set latitude(v: number) {
    this.view.setFloat32(132, v, true);
  }

  get heading(): number {
    return this.view.getFloat32(136, true);
  }
  set heading(v: number) {
    this.view.setFloat32(136, v, true);
  }

  get population(): number {
    return this.view.getUint32(140, true);
  }
  set population(v: number) {
    this.view.setUint32(140, v, true);
  }

  get type(): number {
    return this.view.getUint16(144, true);
  }
  set type(v: number) {
    this.view.setUint16(144, v, true);
  }

  get reserved(): number {
    return this.view.getUint16(146, true);
  }
  set reserved(v: number) {
    this.view.setUint16(146, v, true);
  }

  toObject(): Record<string, unknown> {
    return {
      name: Array.from(this.name),
      longitude: this.longitude,
      latitude: this.latitude,
      heading: this.heading,
      population: this.population,
      type: this.type,
      reserved: this.reserved,
    };
  }

  copyFrom(obj: Partial<Record<string, unknown>>): void {
    if (obj.name !== undefined) {
      const arr = this.name;
      const src = obj.name as ArrayLike<number>;
      for (let i = 0; i < Math.min(arr.length, src.length); i++) arr[i] = src[i];
    }
    if (obj.longitude !== undefined) this.longitude = obj.longitude as number;
    if (obj.latitude !== undefined) this.latitude = obj.latitude as number;
    if (obj.heading !== undefined) this.heading = obj.heading as number;
    if (obj.population !== undefined) this.population = obj.population as number;
    if (obj.type !== undefined) this.type = obj.type as number;
    if (obj.reserved !== undefined) this.reserved = obj.reserved as number;
  }

  static allocate(): AlignedLocationView {
    return new AlignedLocationView(new ArrayBuffer(148));
  }

  copyTo(dest: Uint8Array, offset = 0): void {
    const src = new Uint8Array(this.view.buffer, this.view.byteOffset, 148);
    dest.set(src, offset);
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.view.buffer, this.view.byteOffset, 148);
  }
}

export class AlignedLocationArrayView {
  private readonly buffer: ArrayBuffer;
  private readonly baseOffset: number;
  readonly length: number;

  constructor(buffer: ArrayBuffer, byteOffset: number, count: number) {
    this.buffer = buffer;
    this.baseOffset = byteOffset;
    this.length = count;
  }

  static fromMemory(memory: WebAssembly.Memory, ptr: number, count: number): AlignedLocationArrayView {
    return new AlignedLocationArrayView(memory.buffer, ptr, count);
  }

  at(index: number): AlignedLocationView {
    if (index < 0 || index >= this.length) {
      throw new RangeError(`Index ${index} out of bounds [0, ${this.length})`);
    }
    return new AlignedLocationView(this.buffer, this.baseOffset + index * 148);
  }

  *[Symbol.iterator](): Iterator<AlignedLocationView> {
    for (let i = 0; i < this.length; i++) {
      yield this.at(i);
    }
  }
}

export const ALIGNEDLOCATIONDATABASEHEADER_SIZE = 64;
export const ALIGNEDLOCATIONDATABASEHEADER_ALIGN = 8;

export const AlignedLocationDatabaseHeaderOffsets = {
  magic: 0,
  version: 8,
  flags: 12,
  location_count: 16,
  reserved1: 20,
  created_timestamp: 24,
  modified_timestamp: 32,
  reserved2: 40,
} as const;

export class AlignedLocationDatabaseHeaderView {
  private readonly view: DataView;

  constructor(buffer: ArrayBuffer, byteOffset = 0) {
    this.view = new DataView(buffer, byteOffset, 64);
  }

  static fromMemory(memory: WebAssembly.Memory, ptr: number): AlignedLocationDatabaseHeaderView {
    return new AlignedLocationDatabaseHeaderView(memory.buffer, ptr);
  }

  static fromBytes(bytes: Uint8Array, offset = 0): AlignedLocationDatabaseHeaderView {
    return new AlignedLocationDatabaseHeaderView(bytes.buffer, bytes.byteOffset + offset);
  }

  get magic(): Uint8Array {
    return new Uint8Array(this.view.buffer, this.view.byteOffset + 0, 8);
  }

  get version(): number {
    return this.view.getUint32(8, true);
  }
  set version(v: number) {
    this.view.setUint32(8, v, true);
  }

  get flags(): number {
    return this.view.getUint32(12, true);
  }
  set flags(v: number) {
    this.view.setUint32(12, v, true);
  }

  get location_count(): number {
    return this.view.getUint32(16, true);
  }
  set location_count(v: number) {
    this.view.setUint32(16, v, true);
  }

  get reserved1(): number {
    return this.view.getUint32(20, true);
  }
  set reserved1(v: number) {
    this.view.setUint32(20, v, true);
  }

  get created_timestamp(): bigint {
    return this.view.getBigUint64(24, true);
  }
  set created_timestamp(v: bigint) {
    this.view.setBigUint64(24, v, true);
  }

  get modified_timestamp(): bigint {
    return this.view.getBigUint64(32, true);
  }
  set modified_timestamp(v: bigint) {
    this.view.setBigUint64(32, v, true);
  }

  get reserved2(): Uint8Array {
    return new Uint8Array(this.view.buffer, this.view.byteOffset + 40, 24);
  }

  toObject(): Record<string, unknown> {
    return {
      magic: Array.from(this.magic),
      version: this.version,
      flags: this.flags,
      location_count: this.location_count,
      reserved1: this.reserved1,
      created_timestamp: this.created_timestamp,
      modified_timestamp: this.modified_timestamp,
      reserved2: Array.from(this.reserved2),
    };
  }

  copyFrom(obj: Partial<Record<string, unknown>>): void {
    if (obj.magic !== undefined) {
      const arr = this.magic;
      const src = obj.magic as ArrayLike<number>;
      for (let i = 0; i < Math.min(arr.length, src.length); i++) arr[i] = src[i];
    }
    if (obj.version !== undefined) this.version = obj.version as number;
    if (obj.flags !== undefined) this.flags = obj.flags as number;
    if (obj.location_count !== undefined) this.location_count = obj.location_count as number;
    if (obj.reserved1 !== undefined) this.reserved1 = obj.reserved1 as number;
    if (obj.created_timestamp !== undefined) this.created_timestamp = obj.created_timestamp as bigint;
    if (obj.modified_timestamp !== undefined) this.modified_timestamp = obj.modified_timestamp as bigint;
    if (obj.reserved2 !== undefined) {
      const arr = this.reserved2;
      const src = obj.reserved2 as ArrayLike<number>;
      for (let i = 0; i < Math.min(arr.length, src.length); i++) arr[i] = src[i];
    }
  }

  static allocate(): AlignedLocationDatabaseHeaderView {
    return new AlignedLocationDatabaseHeaderView(new ArrayBuffer(64));
  }

  copyTo(dest: Uint8Array, offset = 0): void {
    const src = new Uint8Array(this.view.buffer, this.view.byteOffset, 64);
    dest.set(src, offset);
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.view.buffer, this.view.byteOffset, 64);
  }
}

export class AlignedLocationDatabaseHeaderArrayView {
  private readonly buffer: ArrayBuffer;
  private readonly baseOffset: number;
  readonly length: number;

  constructor(buffer: ArrayBuffer, byteOffset: number, count: number) {
    this.buffer = buffer;
    this.baseOffset = byteOffset;
    this.length = count;
  }

  static fromMemory(memory: WebAssembly.Memory, ptr: number, count: number): AlignedLocationDatabaseHeaderArrayView {
    return new AlignedLocationDatabaseHeaderArrayView(memory.buffer, ptr, count);
  }

  at(index: number): AlignedLocationDatabaseHeaderView {
    if (index < 0 || index >= this.length) {
      throw new RangeError(`Index ${index} out of bounds [0, ${this.length})`);
    }
    return new AlignedLocationDatabaseHeaderView(this.buffer, this.baseOffset + index * 64);
  }

  *[Symbol.iterator](): Iterator<AlignedLocationDatabaseHeaderView> {
    for (let i = 0; i < this.length; i++) {
      yield this.at(i);
    }
  }
}

