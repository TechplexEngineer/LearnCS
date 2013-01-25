/**
 * Create a new node.
 * 
 * @param type {String}
 *   The node type
 * 
 * @param text {String}
 *   The token text (if this node is generated as the result of a rule parsing
 *   a terminal symbol)
 * 
 * @param line {Integer}
 *   The line number in the source code of the just-parsed code.
 *
 * @param filename {String?}
 *   The file name of the source code of the just-parsed code. May not be used.
 *
 * @return {Map}
 *   A node contains 'type' containing the specified node type, 'children', an
 *   initially empty array, and 'lineno' indicating the source code line which
 *   caused the node to be created.
 */
exports.create = function(type, text, line, filename)
{
  var             node;
    
  // Create this new node
  node =
    {
      type     : type,
      children : [],
      line     : line,
      filename : filename
    };
  
  // Redefine push() to save the parent of the pushed child in the child
  node.children.push = function(child)
  {
    // If this child is a node, save the parent of this child node
    if (child !== null)
    {
      child.parent = node;
    }
    
    // Now push this child node into the parent's children list
    [].push.call(node.children, child);
  };
  
  return node;
};

/**
 * Display, recursively, the abstract syntax tree beginning at the specified
 * node
 *
 * @param node {Map|String|Null}
 *   One of:
 *    - A Node object to be displayed, along with, recursively, all of its
 *      children.
 *    - A string, representing the value of the parent node. This is used for
 *      the names of identifiers, values of integers, etc.
 *    - null, to indicate lack of an optional child of the parent node
 *
 * @param indent {Integer?}
 *   The indentation level. The top-level call may be issued without passing
 *   this parameter, in which case 0 is used.
 */
exports.display = function(node, indent)
{
  var             i;

  // Default value for indent
  indent = indent || 0;

  // Create the tree lines
  sys.print(new Array(indent + 1).join("| "));
  
  // Is this a Node object?
  if (node && typeof node == "object")
  {
    // Yup. Display its type and line number, then call its children
    // recursively.
    if (typeof node.value !== "undefined")
    {
      sys.print(node.type + ": " + node.value + "\n");
    }
    else
    {
      sys.print(node.type + " (" + node.line + ")" +  "\n");

      // Call recursively to handle children
      for (i = 0; i < node.children.length; i++)
      {
        arguments.callee(node.children[i], indent + 1);
      }
    }
  }
  else
  {
    // It's null. Display a representation of a null value.
    sys.print("<null>\n");
  }
};

/**
 * Process, recursively, the abstract syntax tree beginning at the specified
 * node.
 *
 * @param node {Map|String|Null}
 *   One of:
 *    - A Node object to be processed, along with, recursively, all of its
 *      children.
 *    - A string, representing the value of the parent node. This is used for
 *      the names of identifiers, values of integers, etc.
 *    - null, to indicate lack of an optional child of the parent node
 */
exports.process = function(node, data)
{
  var             i;

  // Is this a Node object?
  if (node && typeof node == "object")
  {
    // Yup. See what type it is.
    switch(node.type)
    {
    case "abstract_declarator" :
      break;
      
    case "add" :
      break;
      
    case "add-assign" :
      break;
      
    case "address_of" :
      break;
      
    case "and" :
      break;
      
    case "argument_expression_list" :
      break;
      
    case "array_decl" :
      break;
      
    case "array_decl" :
      break;
      
    case "array_decl" :
      break;
      
    case "array_decl" :
      break;
      
    case "array_decl" :
      break;
      
    case "array_expression" :
      break;
      
    case "assign" :
      break;
      
    case "auto" :
      break;
      
    case "bit-and" :
      break;
      
    case "bit-and-assign" :
      break;
      
    case "bit_invert" :
      break;
      
    case "bit-or" :
      break;
      
    case "bit-or-assign" :
      break;
      
    case "break" :
      break;
      
    case "case" :
      break;
      
    case "cast_expression" :
      break;
      
    case "char" :
      break;
      
    case "compound_statement" :
      break;
      
    case "const" :
      break;
      
    case "constant" :
      break;
      
    case "continue" :
      break;
      
    case "declaration_list" :
      break;
      
    case "declarator" :
      break;
      
    case "default" :
      break;
      
    case "dereference" :
      break;
      
    case "direct_abstract_declarator" :
      break;
      
    case "direct_abstract_declarator" :
      break;
      
    case "direct_abstract_declarator" :
      break;
      
    case "direct_abstract_declarator" :
      break;
      
    case "direct_abstract_declarator" :
      break;
      
    case "direct_declarator" :
      break;
      
    case "divide" :
      break;
      
    case "divide-assign" :
      break;
      
    case "double" :
      break;
      
    case "do-while" :
      break;
      
    case "ellipsis" :
      break;
      
    case "enumerator_list" :
      break;
      
    case "enum_specifier" :
      break;
      
    case "equal" :
      break;
      
    case "exclusive-or" :
      break;
      
    case "expression" :
      break;
      
    case "expression" :
      break;
      
    case "extern" :
      break;
      
    case "float" :
      break;
      
    case "for" :
      break;
      
    case "for" :
      break;
      
    case "function_call" :
      break;
      
    case "function_decl" :
      break;
      
    case "function_definition" :
      break;
      
    case "goto" :
      break;
      
    case "greater-equal" :
      break;
      
    case "greater-than" :
      break;
      
    case "identifer" :
      break;
      
    case "identifier_list" :
      break;
      
    case "if" :
      break;
      
    case "init_declarator_list" :
      break;
      
    case "initializer" :
      break;
      
    case "initializer_list" :
      break;
      
    case "int" :
      break;
      
    case "label" :
      break;
      
    case "left-shift" :
      break;
      
    case "left-shift-assign" :
      break;
      
    case "less-equal" :
      break;
      
    case "less-than" :
      break;
      
    case "long" :
      break;
      
    case "mod" :
      break;
      
    case "mod-assign" :
      break;
      
    case "multiply" :
      break;
      
    case "multiply-assign" :
      break;
      
    case "negative" :
      break;
      
    case "not" :
      break;
      
    case "not-equal" :
      break;
      
    case "or" :
      break;
      
    case "parameter_declaration" :
      break;
      
    case "parameter_list" :
      break;
      
    case "parameter_type_list" :
      break;
      
    case "pointer" :
      break;
      
    case "pointer_access" :
      break;
      
    case "positive" :
      break;
      
    case "post_decrement_op" :
      break;
      
    case "postfix_expression" :
      break;
      
    case "post_increment_op" :
      break;
      
    case "pre_decrement_op" :
      break;
      
    case "pre_increment_op" :
      break;
      
    case "register" :
      break;
      
    case "return" :
      break;
      
    case "right-shift" :
      break;
      
    case "right-shift-assign" :
      break;
      
    case "short" :
      break;
      
    case "signed" :
      break;
      
    case "sizeof" :
      break;
      
    case "specifier_qualifier_list" :
      break;
      
    case "statement_list" :
      break;
      
    case "static" :
      break;
      
    case "string_literal" :
      break;
      
    case "struct" :
      break;
      
    case "struct_declaration" :
      break;
      
    case "struct_declaration_list" :
      break;
      
    case "struct_declarator" :
      break;
      
    case "struct_declarator_list" :
      break;
      
    case "structure_reference" :
      break;
      
    case "subtract" :
      break;
      
    case "subtract-assign" :
      break;
      
    case "switch" :
      break;
      
    case "translation_unit" :
      node.children.forEach(arguments.callee, data);
      break;
      
    case "trinary" :
      break;
      
    case "type" :
      break;
      
    case "typedef" :
      break;
      
    case "type_definition" :
      break;
      
    case "type_name" :
      break;
      
    case "type_name" :
      break;
      
    case "type_qualifier_list" :
      break;
      
    case "union" :
      break;
      
    case "unsigned" :
      break;
      
    case "void" :
      break;
      
    case "volatile" :
      break;
      
    case "xor-assign" :
      break;

    default:
      sys.print("Unexpected node type: " + node.type);
      break;
    }
  }
  else
  {
    // It's null. Display a representation of a null value.
    sys.print("<null>\n");
  }
};

