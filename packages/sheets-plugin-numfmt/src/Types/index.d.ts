export * from '../index';
declare module '@univerjs/sheets-plugin-numfmt' {}

// use css module
declare module '*.less' {
    const resource: { [key: string]: string };
    export = resource;
}