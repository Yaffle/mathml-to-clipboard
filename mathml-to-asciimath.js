

HTMLCollection.prototype.forEach = Array.prototype.forEach;

HTMLCollection.prototype.slice = Array.prototype.slice;

Object.defineProperty(Node.prototype, "val", {
  get: function () {
    return this.textContent.trim().replace(/−/g, "-").replace(/±/g, "&plusmn;").replace(/⁢/g, "&sdot;");
  }
});

function handleAll(elements, buffer) {
  elements.forEach(function(element) {
    handle(element, buffer)
  });
}

function handle(element, buffer) {
  var handler = handlers[element.tagName] || function() {
    throw new Error('Unsupported element: ' + element.tagName);
  };
  handler(element, buffer);
}

var handlerApi = {
  handle: handle,
  handleAll: handleAll
};

// element name -> function(element, buffer)
var handlers = {
  // always pass string literals to require for browserify
  math:   require('mathml-to-asciimath/lib/handlers/math')(handlerApi),
  mi:     require('mathml-to-asciimath/lib/handlers/mi')(handlerApi),
  mo:     require('mathml-to-asciimath/lib/handlers/mo')(handlerApi),
  mn:     require('mathml-to-asciimath/lib/handlers/mn')(handlerApi),
  mfrac:  require('mathml-to-asciimath/lib/handlers/mfrac')(handlerApi),
  msup:   require('mathml-to-asciimath/lib/handlers/msup')(handlerApi),
  msub:   require('mathml-to-asciimath/lib/handlers/msub')(handlerApi),
  mrow:   require('mathml-to-asciimath/lib/handlers/mrow')(handlerApi),
  msqrt:  require('mathml-to-asciimath/lib/handlers/msqrt')(handlerApi),
  mover:  require('mathml-to-asciimath/lib/handlers/mover')(handlerApi),
  mstyle: require('mathml-to-asciimath/lib/handlers/mstyle')(handlerApi),
  mtext:  require('mathml-to-asciimath/lib/handlers/mtext')(handlerApi)
};

function toAsciiMath(mathmlNode) {
  var buffer = [];
  handle(mathmlNode, buffer);
  return buffer.join(' ');
}

module.exports = toAsciiMath;
