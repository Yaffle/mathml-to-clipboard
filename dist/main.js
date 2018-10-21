(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){


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

},{"mathml-to-asciimath/lib/handlers/math":3,"mathml-to-asciimath/lib/handlers/mfrac":4,"mathml-to-asciimath/lib/handlers/mi":5,"mathml-to-asciimath/lib/handlers/mn":6,"mathml-to-asciimath/lib/handlers/mo":7,"mathml-to-asciimath/lib/handlers/mover":8,"mathml-to-asciimath/lib/handlers/mrow":9,"mathml-to-asciimath/lib/handlers/msqrt":10,"mathml-to-asciimath/lib/handlers/mstyle":11,"mathml-to-asciimath/lib/handlers/msub":12,"mathml-to-asciimath/lib/handlers/msup":13,"mathml-to-asciimath/lib/handlers/mtext":14}],2:[function(require,module,exports){
/*global window, document, console, Node */
"use strict";

var transformMathMLToAsciiMath = require("mathml-to-asciimath");

var isBlock = function (display) {
  switch (display) {
    case "inline":
    case "inline-block":
    case "inline-flex":
    case "inline-grid":
    case "inline-table":
    case "none":
    case "table-column":
    case "table-column-group":
    case "table-cell":
      return false;
  }
  return true;
};

var getNodeLength = function (container) {
  if (container.nodeType === Node.TEXT_NODE) {
    return container.nodeValue.length;
  }
  if (container.nodeType === Node.ELEMENT_NODE) {
    var count = 0;
    var child = container.firstChild;
    while (child != null) {
      child = child.nextSibling;
      count += 1;
    }
    return count;
  }
  return undefined;
};

var isBoundaryPoint = function (container, offset, which, node) {
  var x = container;
  if (which === "end" && offset !== getNodeLength(container) || which === "start" && offset !== 0) {
    return false;
  }
  while (x !== node) {
    if (which === "end" && x.nextSibling != null || which === "start" && x.previousSibling != null) {
      return false;
    }
    x = x.parentNode;
  }
  return true;
};

var getChildNode = function (container, offset, which, node) {
  var child = null;
  var x = container;
  while (x !== node) {
    child = x;
    x = x.parentNode;
  }
  if (child != null) {
    child = which === "end" ? child.nextSibling : (which === "start" ? child : null);
  } else {
    var i = -1;
    child = container.firstChild; // node === container
    while (++i < offset) {
      child = child.nextSibling;
    }
  }
  return child;
};

var serialize = function (range, isLineStart) {
  // big thanks to everyone
  // see https://github.com/timdown/rangy/blob/master/src/modules/rangy-textrange.js
  // see https://github.com/WebKit/webkit/blob/ec2f4d46b97bb20fd0877b1f4b5ec50f7b9ec521/Source/WebCore/editing/TextIterator.cpp#L1188
  // see https://github.com/jackcviers/Rangy/blob/master/spec/innerText.htm

  var node = range.commonAncestorContainer;
  var startContainer = range.startContainer;
  var startOffset = range.startOffset;
  var endContainer = range.endContainer;
  var endOffset = range.endOffset;

  if (node.nodeType === Node.TEXT_NODE) {
    if (node !== startContainer || node !== endContainer) {
      throw new Error();
    }
    var nodeValue = node.nodeValue.slice(startOffset, endOffset);
    //var nodeValue = node.nodeValue.slice(node === startContainer ? startOffset : 0, node === endContainer ? endOffset : node.nodeValue.length);
    nodeValue = nodeValue.replace(/[\u0020\n\r\t\v]+/g, " ");
    if (isLineStart) {
      nodeValue = nodeValue.replace(/^[\u0020\n\r\t\v]/g, "");
    }
    return nodeValue;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    var display = window.getComputedStyle(node, null).display;
    if (display === "none") {
      return "";
    }
    var result = "";
    if (isBlock(display) && !isLineStart) {
      result += "\n";
      isLineStart = true;
    }
    var x = undefined;
    if (isBoundaryPoint(startContainer, startOffset, "start", node) &&
        isBoundaryPoint(endContainer, endOffset, "end", node)) {
      var tagName = node.tagName.toUpperCase();
      if (tagName === "MATH" || isMathMLTagName(tagName)) {
        x = transformMathMLToAsciiMath(node);
      }
      if (tagName === "BR") {
        x = "\n";
      }
    }
    if (x != undefined) {
      result += x;
    } else {
      var startChildNode = getChildNode(startContainer, startOffset, "start", node);
      var endChildNode = getChildNode(endContainer, endOffset, "end", node);
      var childNode = startChildNode;
      while (childNode !== endChildNode) {
        var childNodeRange = document.createRange();
        childNodeRange.setStart(childNode, 0);
        childNodeRange.setEnd(childNode, getNodeLength(childNode));
        if (childNode === startChildNode && startContainer !== node) {
          childNodeRange.setStart(startContainer, startOffset);
        }
        if (childNode.nextSibling === endChildNode && endContainer !== node) {
          childNodeRange.setEnd(endContainer, endOffset);
        }
        var y = serialize(childNodeRange, isLineStart);
        isLineStart = y === "" && isLineStart || y.slice(-1) === "\n";
        result += y;
        childNode = childNode.nextSibling;
      }
    }
    if (display === "table-cell") {
      result += "\t";
    }
    if (isBlock(display) && !isLineStart) {
      result = result.replace(/[\u0020\n\r\t\v]$/g, "");
      result += "\n";
      isLineStart = true;
    }
    return result;
  }
  return "";
};

var serializeAsPlainText = function (range) {
  var isLineStart = !(range.startContainer.nodeType === Node.TEXT_NODE && range.startContainer.nodeValue.slice(0, range.startOffset).replace(/\s+/g, "") !== "");
  var isLineEnd = !(range.endContainer.nodeType === Node.TEXT_NODE && range.endContainer.nodeValue.slice(range.endOffset, range.endContainer.nodeValue.length).replace(/\s+/g, "") !== "");
  var value = serialize(range, false);
  if (isLineStart) {
    value = value.replace(/^\s/g, "");
  }
  if (isLineEnd) {
    value = value.replace(/\s$/g, "");
  }
  return value;
};

var isMathMLTagName = function (tagName) {
  if (tagName.charCodeAt(0) === "M".charCodeAt(0)) {
    switch (tagName) {
      case "MAIN":
      case "MAP":
      case "MARK":
      case "MATH":
      case "MENU":
      case "MENUITEM":
      case "META":
      case "METER":
        return false;
    }
    return true;
  }
  return false;
};

var serializeAsHTML = function (range) {
  var fragment = range.cloneContents();
  var div = document.createElement("div");
  div.appendChild(fragment);
  return div.innerHTML;
};

var onCopyOrDragStart = function (event) {
  var dataTransfer = event.type === "copy" ? event.clipboardData : event.dataTransfer;
  var tagName = event.target.nodeType === Node.ELEMENT_NODE ? event.target.tagName.toUpperCase() : "";
  if (tagName !== "INPUT" && tagName !== "TEXTAREA" && (tagName !== "A" || event.type === "copy") && tagName !== "IMG") {
    //! dataTransfer.effectAllowed throws an exception in FireFox if tagName is INPUT or TEXTAREA
    if ((event.type === "copy" || dataTransfer.effectAllowed === "uninitialized") && !event.defaultPrevented) {
      var selection = window.getSelection();
      var rangeCount = selection.rangeCount;
      if (rangeCount !== 0 && !selection.isCollapsed) {
        var i = -1;
        var plainText = "";
        var htmlText = "";
        while (++i < rangeCount) {
          var range = selection.getRangeAt(i);
          htmlText += serializeAsHTML(range);
          plainText += serializeAsPlainText(range);
        }
        dataTransfer.setData("Text", plainText);
        dataTransfer.setData("text/html", htmlText);
        if (event.type === "copy") {
          event.preventDefault();
        } else {
          dataTransfer.effectAllowed = "copy";
        }
      }
    }
  }
};

document.addEventListener("copy", onCopyOrDragStart, false);
document.addEventListener("dragstart", onCopyOrDragStart, false);

},{"mathml-to-asciimath":1}],3:[function(require,module,exports){
module.exports = function init(handlerApi) {

  return function handle(element, buffer) {
    handlerApi.handleAll(element.children, buffer);
  };
};

},{}],4:[function(require,module,exports){
module.exports = function init(handlerApi) {

  return function handle(element, buffer) {
    var firstChild = element.children[0];
    var secondChild = element.children[1];

    handlerApi.handle(firstChild, buffer);
    buffer.push('/');
    handlerApi.handle(secondChild, buffer);
  };
};

},{}],5:[function(require,module,exports){
var trim = require('trim');

var miToAsciiMath = {
    '&alpha;'   : 'alpha',
    '&beta;'    : 'beta',
    '&chi;'     : 'chi',
    '&delta;'   : 'delta',
    '&epsilon;' : 'epsi',
    '&eta;'     : 'eta',
    '&gamma;'   : 'gamma',
    '&iota;'    : 'iota',
    '&kappa;'   : 'kappa',
    '&lambda;'  : 'lambda',
    '&mu;'      : 'mu',
    '&nu;'      : 'nu',
    '&omega;'   : 'omega',
    '&phi;'     : 'phi',
    '&pi;'      : 'pi',
    '&psi;'     : 'psi',
    '&rho;'     : 'rho',
    '&sigma;'   : 'sigma',
    '&tau;'     : 'tau',
    '&theta;'   : 'theta',
    '&upsilon;' : 'upsilon',
    '&xi;'      : 'xi',
    '&zeta;'    : 'zeta'
};

module.exports = function init() {
  return function handle(element, buffer) {
    var value = trim(element.val);

    buffer.push(miToAsciiMath[value] || value);
  };
};

},{"trim":16}],6:[function(require,module,exports){
var trim = require('trim');

module.exports = function init() {
  return function handle(element, buffer) {
    buffer.push(trim(element.val));
  };
};

},{"trim":16}],7:[function(require,module,exports){
var moHelpers = require('../mo-helpers');
var trim = require('trim');

module.exports = function init() {
  return function handle(element, buffer) {
    var value = trim(element.val)
    var asciiMathSymbol = moHelpers.toAsciiMath(value);

    if (typeof asciiMathSymbol == 'undefined') {
      throw new Error('Unsupported operator: ' + value)
    }

    buffer.push(asciiMathSymbol);
  };
};

},{"../mo-helpers":15,"trim":16}],8:[function(require,module,exports){
module.exports = function init(handlerApi) {

  return function handle(element, buffer) {
    var base = element.children[0];
    var overscript = element.children[1];

    handlerApi.handleAll([overscript, base], buffer);
  };
};

},{}],9:[function(require,module,exports){
var moHelpers = require('../mo-helpers');

function needsGrouping(element) {
    var firstChild = element.children[0];
    var lastChild = element.children.slice(-1)[0];

    // already has grouping operators
    if (firstChild.name == 'mo' &&
        moHelpers.isOpenOperator(firstChild.val) &&
        lastChild.name == 'mo' &&
        moHelpers.isCloseOperator(lastChild.val)) {

      return false;
    }

    // just mtext by itself -- ASCIIMathML does this when given text(foo)
    if (element.children.length == 1 && firstChild.name == 'mtext') {
      return false;
    }

    return true;
}

module.exports = function init(handlerApi) {

  return function handle(element, buffer) {
    var addParens = needsGrouping(element);

    if (addParens) {
      buffer.push('(');
    }

    handlerApi.handleAll(element.children, buffer);

    if (addParens) {
      buffer.push(')');
    }
  };
};

},{"../mo-helpers":15}],10:[function(require,module,exports){
module.exports = function init(handlerApi) {

  return function handle(element, buffer) {
    buffer.push('sqrt');
    handlerApi.handleAll(element.children, buffer);
  };
};

},{}],11:[function(require,module,exports){
arguments[4][3][0].apply(exports,arguments)
},{"dup":3}],12:[function(require,module,exports){
module.exports = function init(handlerApi) {

  return function handle(element, buffer) {
    var firstChild = element.children[0];
    var secondChild = element.children[1];

    handlerApi.handle(firstChild, buffer);
    buffer.push('_');
    handlerApi.handle(secondChild, buffer);
  };
};

},{}],13:[function(require,module,exports){
module.exports = function init(handlerApi) {

  return function handle(element, buffer) {
    var firstChild = element.children[0];
    var secondChild = element.children[1];

    handlerApi.handle(firstChild, buffer);
    buffer.push('^');
    handlerApi.handle(secondChild, buffer);
  };
};

},{}],14:[function(require,module,exports){
var trim = require('trim');

module.exports = function init() {
  return function handle(element, buffer) {
    var value = trim(element.val);
    buffer.push('text(' + value + ')');
  };
};

},{"trim":16}],15:[function(require,module,exports){
// value in <mo> -> AsciiMath symbol
var moToAsciiMath = {
  '+'       : '+',
  '-'       : '-',
  '&sdot;'  : '*',
  '&Star;'  : '**',
  '&times;' : 'xx',
  '/'       : '//',
  '&divide;': '-:',
  '='       : '=',
  '&ne;'    : '!=',
  '<'       : '<',
  '>'       : '>',
  '&le;'    : '<=',
  '&ge;'    : '>=',
  '('       : '(',
  ')'       : ')',
  '&asymp;' : '~~',
  '['       : '[',
  ']'       : ']',
  ','       : ',',
  '{'       : '{',
  '}'       : '}',
  '&macr;'  : 'bar',
  '&rarr;'  : 'vec',
  '&harr;'  : 'line',
  '&plusmn;': '+-',
  '?'       : '?',
  '&ang;'   : '/_',
  '&deg;'   : 'deg',
  '&Delta;' : 'Delta',
  '&Gamma;' : 'Gamma',
  '&Lambda;': 'Lambda',
  '&Omega;' : 'Omega',
  '&Phi;'   : 'Phi',
  '&Pi;'    : 'Pi',
  '&Sigma;' : 'Sigma',
  '&Theta;' : 'Theta',
  '&Xi;'    : 'Xi'
};

exports.toAsciiMath = function toAsciiMath(mo) {
  return moToAsciiMath[mo];
};

exports.isOpenOperator = function isOpenOperator(operator) {
  return ['(', '[', '{'].indexOf(operator) != -1;
};

exports.isCloseOperator = function isCloseOperator(operator) {
  return [')', ']', '}'].indexOf(operator) != -1;
};

},{}],16:[function(require,module,exports){

exports = module.exports = trim;

function trim(str){
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  return str.replace(/\s*$/, '');
};

},{}]},{},[2]);
