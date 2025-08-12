export default function htmlOrderPlugin() {
  return {
    name: 'html-order',
    enforce: 'post',
    transformIndexHtml(html) {
      const reactScript = html.match(/<link rel="modulepreload" crossorigin href="\/vendor-react\..*\.js">/);
      const radixUiScript = html.match(/<link rel="modulepreload" crossorigin href="\/vendor-radix-ui\..*\.js">/);

      if (reactScript && radixUiScript) {
        // Remove both scripts
        html = html.replace(reactScript[0], '');
        html = html.replace(radixUiScript[0], '');

        // Insert react script before radix-ui script
        html = html.replace(
          '</head>',
          `  ${reactScript[0]}
  ${radixUiScript[0]}
</head>`
        );
      }
      return html;
    },
  };
}