/*
 * phpjade
 * https://github.com/kurohara/phpjade
 *
 * Copyright (c) 2015 Hiroyoshi Kurohara
 * Licensed under the MIT license.
 */

'use strict';

var Modifier = require('./modifier');
module.exports = new Modifier();

/**
 * call prefunction passed from options.
 * 'prefunction' does cumbersome preprocess just after php part of code found.
 */
function php_prefunc(input, options) {
  if (options.prefunction) {
    return options.prefunction(input, options);
  } else {
    return input;
  }
}

/**
 * escape as php code.
 */
function phpescape(str, bEscape) {
  if (bEscape) {
    return 'htmlspecialchars(' + str + ', ENT_QUOTES, \'UTF-8\')';
  } else {
    return str;
  }
}

/**
 * parse JavaScript(and php) expr then returns AST structure.
 */
function parseExpr(str) {
  try {
    return require('acorn').parseExpressionAt(str, 0);
  } catch (e) {
  }
}

var fixphpexpr = require("./fixphpexpr.js");

/**
 * traverse AST structure then generate editing array.
 */
function traverseAst(ast, result) {
  if (! result) {
    result = { edit: [], options: {}, raw: "" };
  }

  if (! ast) {
    return;
  }
  var elem = { start: ast.start, end: ast.end };
  switch (ast.type) {
  case 'BinaryExpression':
    traverseAst(ast.left, result);
    traverseAst(ast.right, result);
    break;
  case 'UnaryExpression':
    if (ast.operator === '-' && ast.argument.type === 'CallExpression') {
      // replace '-' -> ' '.
      result.raw = result.raw.substring(0, ast.start) + " " + result.raw.substring(ast.start + 1);
      var oldEcho = result.options.needEcho;
      result.options.needEcho = false;
      traverseAst(ast.argument, result);
      result.options.needEcho = oldEcho;
    }
    break;
  case 'CallExpression':
    var echo = result.options.needEcho ? "echo " : "";
    var callexpr = result.raw.substring(ast.start, ast.end);
    elem.str = fixphpexpr("<?php " + echo + phpescape(callexpr, result.options.bEscape) + "; ?>");
    result.edit.push(elem);
    break;
  case 'MemberExpression':
    break;
  case 'Identifier':
    if (ast.name.charAt(0) === "$") {
      elem.str = fixphpexpr("<?php echo " + phpescape(ast.name, result.options.bEscape) + "; ?>");
      result.edit.push(elem);
    }
    break;
  case 'Literal':
    elem.str = fixphpexpr(ast.value);
    result.edit.push(elem);
    break;
  default:
    break;
  }
}

/**
 * apply editing array to original string.
 */
function doEdit(result) {
  var rstrs = [];

  var pstart = 0;
  for (var i in result.edit) {
    rstrs.push(result.raw.substring(pstart, result.edit[i].start));
    rstrs.push(result.edit[i].str);
    pstart = result.edit[i].end;
  }

  rstrs.push(result.raw.substring(pstart));

  return rstrs.join("");
}


Modifier.prototype.override = function(jade) {
    // for debug purpose
    // var sys = require('sys');


    /**
     * append semicolon so that the line become correct php line of code.
     */
   /* function appendSemicolon(code) {
      if (! code.trim().match(/[;:]$/)) {
        return code + ";";
      } else {
        return code;
      }
    }*/

    /**
     * delete tailing semicolon.
     */
    function deleteSemicolon(code) {
      return code.replace(/(.*);[ \t]*$/, "$1");
    }

    /**
     * check if the expression is correct(in php syntax).
     * currently, do nothing.
     */
    function assertExpression(exp) {
        // this verifies that a JavaScript expression is valid
		// no check is applied, now.
        return exp;
    }

	// moved from Jade to call my own 'assertExpression'.
    jade.Lexer.prototype.code = function () {
        var captures;
        if (captures = /^(!?=|-)[ \t]*([^\n]+)/.exec(this.input)) {
            this.consume(captures[0].length);
            var flags = captures[1];
            captures[1] = captures[2];
            var tok = this.tok('code', captures[1]);
            tok.flags = flags;
            tok.escape = flags.charAt(0) === '=';
            tok.buffer = flags.charAt(0) === '=' || flags.charAt(1) === '=';
            if (tok.buffer) { assertExpression(captures[1]); }
            return tok;
        }
    };

    /**
     * override the code to parse the 'code' part of jade source.
     * currently, this code does nothing(just calls original code).
     */
    jade.Parser.prototype.parseCode = function(afterIf) {
      var node = this.super.parseCode.call(this, afterIf);
      return node;
    };

    /**
     * removes surrounding symbols("'-).
     */
    function removeSurroundings(src) {
       return src.replace(/['"](.*)['"]/ ,"$1").replace(/[-]{0,1}(.*)/, "$1");
    }

    /**
     * processes attribute parts.
     */
    jade.Compiler.prototype.attrs = function(attrs, buffer) {
      for (var index = attrs.length - 1;index >= 0;--index) {
          var attr = attrs[index];
          var key = attr.name;
          var escaped = attr.escaped;
          var val = deleteSemicolon(attr.val);
          if (this.options.usestrip && key.match(/^__+$/)) {
              val = removeSurroundings(val);
              val = php_prefunc(val, this.options);
              this.buffer(" <?php " + val + "; ?> ", true);
              // remove this from attrs list.
              attrs.splice(index, 1);
          } else {
              // edit attribute value part.
              val = php_prefunc(val, this.options);
              var result = { edit: [], raw: val, options: { needEcho: true, bEscape: escaped }};
              traverseAst(parseExpr(val), result);
              attr.val = doEdit(result);
              attr.escaped = false;
          }
      }

      return this.super.attrs.call(this, attrs, buffer);
    };

    // Allow custom filters to process text to end of line if no text block following
    jade.Parser.prototype.parseFilter = function(){
        var tok = this.expect('filter');
        //var attrs = this.accept('attrs');
        var block;

        block = this.parseTextBlock();
        if (typeof block === typeof undefined) {
            block = new jade.nodes.Block();
            var text = this.parseText();
            block.push(text);
        }

        var options = {};

        var node = new jade.nodes.Filter(tok.val, block, options);
        node.line = this.line();
        return node;
    };

};



/**
 * filter function for Jade.
 * Here defines ':php' filter.
 */
Modifier.prototype.addFilter = function(jade) {
	if (jade) {
		jade.filters.php = function(block,options) {
            var stack = require('stack-trace').get();
            var compiler = stack[2].receiver;
            if (compiler && compiler.options) {
              block = php_prefunc(block, compiler.options);
            }
			return "<?php " + block + " ?>";
		};
	}
};

