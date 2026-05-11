declare module 'plantuml-encoder' {
  const encoder: {
    encode(value: string): string;
    decode(value: string): string;
  };

  export default encoder;
}
