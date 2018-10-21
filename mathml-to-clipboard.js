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