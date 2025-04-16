declare module 'react-pdf' {
  // Simple approach to fix the type error by declaring the module without specific types
  const Document: any;
  const Page: any;
  const pdfjs: any;
  
  export { Document, Page, pdfjs };
}
