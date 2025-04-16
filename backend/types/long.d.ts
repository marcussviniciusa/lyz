declare module 'long' {
  class Long {
    constructor(low: number, high?: number, unsigned?: boolean);
    
    static fromValue(val: any): Long;
    static fromString(str: string, unsigned?: boolean | number, radix?: number): Long;
    static fromNumber(value: number, unsigned?: boolean): Long;
    static fromBits(lowBits: number, highBits: number, unsigned?: boolean): Long;
    static fromInt(value: number, unsigned?: boolean): Long;
    
    toNumber(): number;
    toString(radix?: number): string;
    
    // Common operations
    add(addend: number | Long): Long;
    subtract(subtrahend: number | Long): Long;
    multiply(multiplier: number | Long): Long;
    div(divisor: number | Long): Long;
    modulo(divisor: number | Long): Long;
    
    // Comparison
    equals(other: Long | number): boolean;
    notEquals(other: Long | number): boolean;
    lessThan(other: Long | number): boolean;
    lessThanOrEqual(other: Long | number): boolean;
    greaterThan(other: Long | number): boolean;
    greaterThanOrEqual(other: Long | number): boolean;
    
    // Bitwise operations
    and(other: Long | number): Long;
    or(other: Long | number): Long;
    xor(other: Long | number): Long;
    not(): Long;
    shiftLeft(numBits: number | Long): Long;
    shiftRight(numBits: number | Long): Long;
  }
  
  export = Long;
}
