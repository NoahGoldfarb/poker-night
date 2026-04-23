// pages/_app.tsx
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <style global jsx>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0d1117; }
        input:focus { outline: none; border-color: #388bfd !important; }
        button:hover:not(:disabled) { opacity: 0.88; }
        button:active:not(:disabled) { transform: scale(0.97); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
