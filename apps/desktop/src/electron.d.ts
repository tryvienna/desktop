/**
 * Extends React's JSX types with Electron's <webview> tag.
 * @see https://www.electronjs.org/docs/latest/api/webview-tag
 */
declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        partition?: string;
        preload?: string;
        httpreferrer?: string;
        useragent?: string;
        disablewebsecurity?: string;
        nodeintegration?: string;
      },
      HTMLElement
    >;
  }
}
