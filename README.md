

A JavaScript code to transform MathML into AsciiMath during "copy" and "dragstart" events.
See [example.html](https://yaffle.github.io/mathml-to-clipboard/example.html).

This allows the user to select a part of the rendered MathML on a page, then copy and paste the selection or use drag-and-drop.
The selection is serialized to a plain text string as AsciiMath.

The script only handles MathML tags, so MathJax may not always be supported. It works with MathML polyfills, such as https://github.com/fred-wang/mathml.css/ .

Usage:

```sh
npm install Yaffle/mathml-to-clipboard
npm run-script build
```
Then add the script to your html page:
```html
<script src="dist/main.js"></script>
```
It will set the "copy" and "dragstart" event handlers on the document.
