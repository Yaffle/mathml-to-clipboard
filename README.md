

A JavaScript to transform MathML into a AsciiMath during "copy" and "dragstart" events.
See the [example.html](https://yaffle.github.io/mathml-to-clipboard/example.html).

This allows the user to select part of rendered MathML on a page, then copy and paste the selection or use Drag and Drop.
The selection is serialied to a plain text string as AsciiMath.

The script only handles MathML tags, so MathJax may not always be supported. It works with MathML polyfills like https://github.com/fred-wang/mathml.css/ .

Usage:

```sh
npm install Yaffle/mathml-to-clipboard
npm run-script build
```
