/**
 * Abstract syntax tree nodes
 *
 * Copyright (c) 2013 Derrell Lipman
 * 
 * License:
 *   GPL Version 2: http://www.gnu.org/licenses/gpl-2.0.html 
 */

/*
#ignore(require)
 */

/**
 * @lint ignoreUndefined(require)
 */
if (typeof qx === 'undefined')
{
  var qx = require("qooxdoo");
  var printf = require("printf");
  require("./Symtab");
  require("./NodeArray");
  require("./Specifier");
  require("./Declarator");
  require("./Return");
  require("./Break");
  require("./Continue");
}

qx.Class.define("playground.c.lib.Node",
{
  extend : qx.core.Object,
  
  /**
   * Create a new node.
   * 
   * @param type {String}
   *   The node type
   * 
   * @param text {String}
   *   The token text (if this node is generated as the result of a rule
   *   parsing a terminal symbol)
   * 
   * @param line {Integer}
   *   The line number in the source code of the just-parsed code.
   *
   * @param filename {String?}
   *   The file name of the source code of the just-parsed code. May not be
   *   used.
   *
   * @return {Map}
   *   A node contains 'type' containing the specified node type, 'children',
   *   an initially empty array, and 'lineno' indicating the source code line
   *   which caused the node to be created.
   */
  construct : function(type, text, line, filename)
  {
    this.base(arguments);
    
    this.type = type;
    this.children = new playground.c.lib.NodeArray(this);
    this.line = line + 1;
    this.filename = filename;
  },

  statics :
  {
    /** The Memory singleton instance */
    __mem : null,
    
    /** Mappings of types of numbers to their types */
    NumberType :
    {
      Int     : "int",
      Uint    : "unsigned int",
      Long    : "long",
      ULong   : "unsigned long",
      Float   : "float",
      Address : "pointer"
    },
    
    /** The error object */
    __error : null,
    
    /**
     * Setter for the error object 
     * 
     * @param error {Map}
     *   A map containing a parseError function and an errorCount value.
     */
    setError : function(error)
    {
      playground.c.lib.Node.__error = error;
    },
    
    /**
     * Getter for the error object 
     * 
     * @return {Map} 
     *   A map containing a parseError function and an errorCount value, as
     *   previously saved here by a call to setError().
     */
    getError : function()
    {
      return playground.c.lib.Node.__error;
    }
  },
  
  members :
  {
    /** The symbol table associated with this specific node */
    _symtab : null,

    /**
     * Display an error message regarding this node
     *
     * @param message {String}
     *   The error message to display
     *
     * @param bFatal {Boolean?}
     *   Whether the message is fatal and should stop execution of the
     *   program.
     */
    error : function(message, bFatal)
    {
      message = "Error: line " + this.line + ": " + message;
      ++playground.c.lib.Node.__error.errorCount;

      if (bFatal)
      {
        throw new playground.c.lib.RuntimeError(this, message);
      }
      else
      {
        console.log(message);
      }
    },

    getExpressionValue : function(value, data)
    {
      var             type;
      var             specAndDecl;
      var             specOrDecl;
      
      // Retrieve the specifier/declarator list, and its first entry
      specAndDecl =
        value instanceof playground.c.lib.SymtabEntry
        ? value.getSpecAndDecl()
        : value.specAndDecl;
      specOrDecl = specAndDecl[0];

      // If it was a symbol table entry...
      if (value instanceof playground.c.lib.SymtabEntry ||
          specOrDecl.getType() == "address")
      {
        // ... then retrieve the symbol's address, unless we're in 'case'
        // mode (cases must be constant expressions)
        switch(data.constantOnly)
        {
        case "case" :
          // occurs during executing, so error is fatal
          this.error("Each 'case' statement must represent a constant " +
                     "expression. It may not rely on any variables' values.",
                     true);
          value = null;
          break;

        case "array_decl" :
          // occurs before executing, so error need not be fatal
          this.error("Array sizes must be constants");
          value = null;
          break;

        default:
          // need not be constant
          
          // See whether we got an address or a symbol table entry
          if (value instanceof playground.c.lib.SymtabEntry)
          {
            // It's a symbol table entry. Retrieve the address and
            // specifier/declarator list.
            value =
              {
                value       : value.getAddr(), 
                specAndDecl : value.getSpecAndDecl()
              };
          }
          else
          {
            // It's an address. Remove the internal-use "address" declarator
            value.specAndDecl.shift();
          }

          // Determine the memory type to use for saving the value
          type =
            value.specAndDecl[0] instanceof playground.c.lib.Declarator
            ? "pointer"
            : value.specAndDecl[0].getCType();

          // Replace the symbol's address with the symbol's current value
          value.value = 
            playground.c.lib.Node.__mem.get(value.value, type); 
        }
      }

      return value;
    },

    /**
     * Display, recursively, the abstract syntax tree beginning at the
     * specified node
     *
     * @param node {Map|String|Null}
     *   One of:
     *    - A Node object to be displayed, along with, recursively, all of its
     *      children.
     *    - A string, representing the value of the parent node. This is used
     *      for the names of identifiers, values of integers, etc.
     *    - null, to indicate lack of an optional child of the parent node
     *
     * @param indent {Integer?}
     *   The indentation level. The top-level call may be issued without passing
     *   this parameter, in which case 0 is used.
     */
    display : function(indent)
    {
      var             i;
      var             parts = [];

      // Default value for indent
      indent = indent || 0;

      // Create the tree lines
      parts.push(new Array(indent + 1).join("| "));

      // Display its type and line number, then call its children recursively.
      if (typeof this.value !== "undefined")
      {
        // We have a value, so display it, and its type
        parts.push(this.type + ": " + this.value);
        if (typeof this.numberType != "undefined")
        {
          parts.push(" (" + this.numberType + ")");
        }
        console.log(parts.join(""));
        parts =[];
      }
      else
      {
        console.log(parts.join("") + this.type + " (" + this.line + ")");
        parts = [];
      }

      // Call recursively to handle children
      this.children.forEach(
        function(subnode)
        {
          if (subnode && typeof subnode == "object")
          {
            subnode.display(indent + 1);
          }
          else
          {
            // It's null. Display a representation of a null value.
            // Create the tree lines
            parts.push(new Array(indent + 2).join("| "));

            // Now display the (null) representation of this object.
            console.log(parts.join("") + subnode);
            parts = [];
          }
        },
        this);
    },
    
    /**
     * After parsing, the line number for a node is the line at which that
     * node's code completed. What we really want is the line at which that
     * node's code began. Search each node for its children's minimum line
     * number, and recursively set each node to have that minimum as its own
     * line number.
     */
    fixLineNumbers : function()
    {
      var             minLine = Number.MAX_VALUE;
      var             line;

      // If there are children of this node...
      if (this.children)
      {
        // ... then calculate the minimum line number of each of this node's
        // chidlren.
        this.children.forEach(
          function(subnode)
          {
            if (subnode)
            {
              // Get the minimum line number for this child node
              line = subnode.fixLineNumbers() || this.line;
            }
            else
            {
              line = this.line;
            }


            // Is it less than our previous minimum?
            if (line < minLine)
            {
              // Yup. Save this one.
              minLine = line;
            }
          },
          this);
      }

      // If this node's own line number is less than the minimum so far...
      if (this.line < minLine)
      {
        // ... then save this one.
        minLine = this.line;
      }

      // This node's line number becomes the minimum of all of its children's
      // line numbers and its own line number.
      this.line = minLine;

      // Return the (possibly new) line number of this node
      return this.line;
    },

    /**
     * Process, recursively, the abstract syntax tree beginning at the specified
     * node.
     *
     * @param data {Map}
     *   Data used for sub-node processing, as required per node type
     *
     * @param bExecuting {Boolean}
     *   false when the code is initially being compiled (symbol tables being
     *   built); true when the code is executing.
     */
    process : function(data, bExecuting)
    {
      var             i;
      var             sp;
      var             origSp;
      var             addr;
      var             offset;
      var             intSize;
      var             subnode;
      var             entry;
      var             bExists;
      var             identifier;
      var             symtab;
      var             symtab2;
      var             symtabStruct;
      var             declarator;
      var             function_decl;
      var             pointer;
      var             cases;
      var             caseAndBreak;
      var             type;
      var             specAndDecl;
      var             specOrDecl;
      var             value;
      var             value1; // typically the lhs of a binary expression
      var             value2; // typically the rhs of a binary expression
      var             value3; // typically the return result
      var             assignData;
      var             process = playground.c.lib.Node.process;
      var             model;
      var             memData;
      var             mem;
      var             WORDSIZE = playground.c.machine.Memory.WORDSIZE;

      if (bExecuting)
      {
        //
        // TODO: only update the model when the program stops at a breakpoint,
        // or upon program exit. This makes execution REALLY slow at present.
        //
        
        // Retrieve the data in memory
        memData = playground.c.machine.Memory.getInstance().getDataModel();
        
        // Convert it to a qx.data.Array
        model = qx.data.marshal.Json.createModel(memData);
        
        // Use that model to render the memory template
        try
        {
          qx.core.Init.getApplication().memTemplate.setModel(model);
        }
        catch(e)
        {
          // There's no memTemplate class when running outside of the GUI.
          // In fact, there's no Application object to get, in that case.
        }
      }

//      console.log("process: " + this.type);

      // Yup. See what type it is.
      switch(this.type)
      {
      case "abstract_declarator" :
        /*
         * abstract_declarator
         *   0 : pointer?
         *   1 : direct_abstract_declarator
         */
        this.__processSubnodes(data, bExecuting);
        break;

      case "add" :
        /*
         * add :
         *   0 : additive_expression
         *   1 : multiplicative_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Complete the operation, coercing to the appropriate type
          specAndDecl = this.__coerce(value1.specAndDecl, value2.specAndDecl);
          return (
            { 
              value       : value1.value + value2.value,
              specAndDecl : specAndDecl
            });
        }
        break;

      case "add-assign" :
        /*
         * add-assign
         *   0: unary_expression (lhs)
         *   1: assignment_expression (rhs)
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal + newVal;
                                   });

      case "address_of" :
        /*
         * address_of
         *   0: cast_expression
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // We're executing. Get the value of the cast_expression
        entry = this.children[0].process(data, bExecuting);

        // Ensure we found a symbol
        if (! (entry instanceof playground.c.lib.SymtabEntry))
        {
          this.error("Address-of operator requires a variable", true);
          break;                // not reached
        }

        // Complete the operation
        return (
          { 
            value : entry.getAddr(),
            specAndDecl  : "pointer"
          });
        break;

      case "and" :
        /*
         * and :
         *   0 : logical_and_expression
         *   1 : inclusive_or_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Complete the operation, coercing to the appropriate type
          specAndDecl = this.__coerce(value1.specAndDecl, value2.specAndDecl);
          return (
            { 
              value       : value1.value && value2.value ? 1 : 0,
              specAndDecl : specAndDecl
            });
        }
        break;

      case "argument_expression_list" :
        /*
         * argument_expression_list
         *   0: assignment_expression
         *   ...
         */
        
        if (! bExecuting)
        {
          // Likely there's nothing to do when not executing, but call
          // subnodes just in case.
          this.__processSubnodes(data, bExecuting);
        }
        else
        {
          // When we're executing, we need to push the expression values onto
          // the stack in reverse order.
          for (i = this.children.length - 1; i >= 0; --i)
          {
            value1 = this.getExpressionValue(
              this.children[i].process(data, bExecuting),
              data);

            // Pull the first specifier/declarator off of the list. We'll
            // replace it with one containing the (possibly unaltered)
            // promoted type.
            specOrDecl = value1.specAndDecl.shift();
            
            // Is this a declarator?
            if (specOrDecl instanceof playground.c.lib.Declarator)
            {
              // Yup. We're going to push an address
              type = "pointer";
            }
            else
            {
              // It's a specifier. Get a new specifier with a (possibly)
              // increased size appropriate as a promoted argument.
              specOrDecl = specOrDecl.promote();
              
              // Get the memory access type from this specifier
              type = specOrDecl.getCType();
            }
            
            // Put the (possibly altered) specifier/declarator back onto the
            // list of specifiers/declarators
            value1.specAndDecl.unshift(specOrDecl);

            // Push the argument onto the stack
            playground.c.lib.Node.__mem.stackPush(type, value1.value);
            
            // If we were given a JavaScript array in which to place args too...
            if (data.args)
            {
              // ... then add this one.
              data.args.unshift(value1.value);
            }
          }
        }
        break;

      case "array_decl" :
        /*
         * array_decl
         *   0: constant_expression
         */
        
        if (bExecuting)
        {
          break;
        }

        // Create an array declarator entry
        declarator = new playground.c.lib.Declarator(this);

        // Disallow variable access. Array sizes must be constant.
        data.constantOnly = "array_decl";

        // Is an array size specified?
        if (this.children[0])
        {
          // Yup. Determine it and add to the declarator
          value1 = this.children[0].process(data, bExecuting);
          declarator.setArrayCount(value1.value);
        }
        else
        {
          // Otherwise just note that this is an array
          declarator.setType("array");
        }
        
        // Add this array declarator to the specifier/declarator list
        data.specAndDecl.push(declarator);

        // Finished with array size. Re-allow variable access.
        delete data.constantOnly;
        break;

      case "array_expression" :
        /*
         * array_expression
         *   0: primary_expression
         *   1: expression (index)
         */
        
        if (! bExecuting)
        {
          break;
        }

        // Get the base address
        value1 = this.children[0].process(data, bExecuting);
        
        // Figure out where the specifier/declarator list is, and retrieve it.
        if (value1 instanceof playground.c.lib.SymtabEntry)
        {
          specAndDecl = value1.getSpecAndDecl();
        }
        else
        {
          specAndDecl = value1.specAndDecl;
        }

        // Look at the first specifier/declarator to ensure this can be indexed
        specOrDecl = specAndDecl[0];

        // Ensure this an array or a pointer
        type = specOrDecl.getType();
        switch(type)
        {
        case "array" :
          break;

        case "pointer" :
          break;
          
        default :
          throw new playground.c.lib.RuntimeError(
            this,
            "Can't access an array element of something that is not an array");
          break;
        }

        // If we got a symbol table entry...
        if (value1 instanceof playground.c.lib.SymtabEntry)
        {
          // ... then retrieve the symbol's address
          addr = value1.getAddr();
          
          // If this is a pointer...
          if (type == "pointer" || value1.getIsParameter())
          {
            // ... then we need to get the address that the pointer points to
            addr = playground.c.lib.Node.__mem.get(addr, "pointer"); 
          }
        }
        else
        {
          // We already have an address
          addr = value1.value;
        }
        
        // Figure out the size of each array element
        // First, get a copy of the specifier/declarator list
        specAndDecl = specAndDecl.slice(0);
        
        // Strip off the initial (pointer or array) entry to find out how many
        // bytes a value of the remaining specifier/declarator consumes
        specAndDecl.shift();
        
        // Determine the memory type of the value
        specOrDecl = specAndDecl[0];
        type =
          specOrDecl instanceof playground.c.lib.Declarator
          ? "pointer"
          : specAndDecl[0].getCType();

        // Calculate the byte count
        offset = specAndDecl[0].calculateByteCount(1, specAndDecl, 0);

        // Get the index
        value2 = this.children[1].process(data, bExecuting);
        
        // We'd better have a specifier to say what type this is.
        specOrDecl = value2.specAndDecl[0];
        if (! (specOrDecl instanceof playground.c.lib.Specifier) ||
            specOrDecl.getType() != "int")
        {
          throw new playground.c.lib.RuntimeError(
            this,
            "Array index must evaluate to an integer");
        }
        
        // Multiply together the byte count of each element, and the desired
        // index, to yield a byte offset to the element's value
        offset *= value2.value;
        
        // Prepend a special "address" declarator
        specAndDecl.unshift(new playground.c.lib.Declarator(this, "address"));

        // The return value will be the value at the calculated address plus
        // the offset.
var ret = 
{
value       : addr + offset,
specAndDecl : specAndDecl
};
console.log("array_expression returning " + ret.value + ", " + ret.specAndDecl[0].getType());
        return (
/*
          {
            value       : value,
            specAndDecl : specAndDecl
          });
*/
ret);
        
        break;

      case "assign" :
        /*
         * assign
         *   0: unary_expression (lhs)
         *   1: assignment_expression (rhs)
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return newVal;
                                   });

      case "auto" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setStorage("auto");
        break;

      case "bit-and" :
        /*
         * bit-and :
         *   0 : and_expression
         *   1 : equality_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Complete the operation, coercing to the appropriate type
          specAndDecl = this.__coerce(value1.specAndDecl, value2.specAndDecl);
          return (
            { 
              value       : value1.value & value2.value,
              specAndDecl : specAndDecl
            });
        }
        break;

      case "bit-and-assign" :
        /*
         * bit-and-assign
         *   0: unary_expression (lhs)
         *   1: assignment_expression (rhs)
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal & newVal;
                                   });

      case "bit_invert" :
        /*
         * bit_invert :
         *   0 : unary_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the unary expression
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          
          // Complete the operation
          return (
            { 
              value       : ~ value1.value,
              specAndDecl : value1.specAndDecl
            });
        }
        break;

      case "bit-or" :
        /*
         * bit-or :
         *   0 : inclusive_or_expression
         *   1 : exclusive_or_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Complete the operation, coercing to the appropriate type
          specAndDecl = this.__coerce(value1.specAndDecl, value2.specAndDecl);
          return (
            { 
              value       : value1.value | value2.value,
              specAndDecl : specAndDecl
            });
        }
        break;

      case "bit-or-assign" :
        /*
         * bit-or-assign
         *   0: unary_expression (lhs)
         *   1: assignment_expression (rhs)
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal | newVal;
                                   });

      case "break" :
        /*
         * break
         *   (no children)
         */
        if (bExecuting)
        {
          // Throw a Break error, which will be caught by loops and the switch
          // statement.
          throw new playground.c.lib.Break(this);
        }
        break;

      case "case" :
        /*
         * case
         *   0 : primary_expression
         *   1 :statement
         */

        // We only process case expressions while executing. (This has the
        // disadvantage that discovering non-constant cases is a run-time
        // error and only occurs if that code branch is executed. It should
        // hopefully be adequate for our purposes, as the alternative is much
        // more difficult to implement.) We must, however, process any
        // compound statements herein, so process the case's statement if not
        // executing.
        if (! bExecuting)
        {
          this.children[1].process(data, bExecuting);
          break;
        }
        
        // We wouldn't have gotten here if this case statement were within a
        // switch. Getting here means that we found a case statement which is
        // not immediately within a switch statement.
        this.error("Found a 'case' not immediately within a 'switch'");
        break;

      case "cast_expression" :
        throw new Error("Not yet implemented: cast_expression");
        break;

      case "char" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setSize("char");
        break;

      case "compound_statement" :
        /*
         * compound_statement
         *   0: declaration_list
         *   1: statement_list
         */

        // Determine whether we're executing or generating symbol tables
        if (bExecuting)
        {
          // We're executing. Retrieve the symbol table from the node
          symtab = this._symtab;
          if (! symtab)
          {
            throw new Error("Internal error: Expected to find symtab entry");
          }
          
          // Push this symbol table onto the stack, as if we'd just created it.
          playground.c.lib.Symtab.pushStack(symtab);

          // Save the new frame pointer
          symtab.setFramePointer(
            playground.c.lib.Node.__mem.getReg("SP", "unsigned int") -
              symtab.getSize());
        }
        else
        {
          // Create a new scope for this compound statement
          symtab = new playground.c.lib.Symtab(
            playground.c.lib.Symtab.getCurrent(),
            "compound@" + this.line,
            this.line);
          // Save the symbol table for when we're executing
          this._symtab = symtab;
        }

        // Process the declaration list
        if (this.children[0])
        {
          this.children[0].process(data, bExecuting);
        }

        // Process the statement_list
        if (this.children[1])
        {
          this.children[1].process(data, bExecuting);
        }
          
        // If we're executing...
        if (bExecuting)
        {
          // Restore the previous frame pointer
          symtab.restoreFramePointer();
        }

        // Revert to the prior scope
        playground.c.lib.Symtab.popStack();
        break;

      case "const" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setConstant("constant");
        break;

      case "constant" :
        // JavaScript is arbitrary precision. Ensure we have a valid C value
        // by writing it as a fixed-type to a register, and then reading it
        // back in.
        playground.c.lib.Node.__mem.setReg("R1", this.numberType, this.value);
        this.value = playground.c.lib.Node.__mem.getReg("R1", this.numberType);

        // Create a specifier for this number type
        specOrDecl = new playground.c.lib.Specifier(this);
        switch(this.numberType)
        {
        case playground.c.lib.Node.NumberType.Int : 
          specOrDecl.setType("int");
          break;

        case playground.c.lib.Node.NumberType.Uint : 
          specOrDecl.setType("int");
          specOrDecl.setSigned("unsigned");
          break;

        case playground.c.lib.Node.NumberType.Long : 
          specOrDecl.setType("int");
          specOrDecl.setSize("long");
          break;

        case playground.c.lib.Node.NumberType.ULong : 
          specOrDecl.setType("int");
          specOrDecl.setSigned("unsigned");
          specOrDecl.setSize("long");
          break;

        case playground.c.lib.Node.NumberType.Float : 
          specOrDecl.setType("float");
          break;
          
        default :
          throw new Error("Unexpected number type: " + this.numberType);
        }

        return (
          {
            value       : this.value, 
            specAndDecl : [ specOrDecl ]
          });

      case "continue" :
        /*
         * continue
         *   (no children)
         */
        if (bExecuting)
        {
          // Throw a Continue error, which will be caught by loops.
          throw new playground.c.lib.Continue(this);
        }
        break;

      case "declaration" :
        /*
         * declaration
         *   0: declaration_specifiers
         *   1: init_declarator_list
         */

        // Create our own data object with a new specifier for this declaration
        data = 
          {
            id : "declaration",
            specifiers : new playground.c.lib.Specifier(this)
          };

        // Process the specifiers
        this.children[0].process(data, bExecuting);
        
        // Process the declarators
        this.children[1].process(data, bExecuting);
        break;

      case "declaration_list" :
        /*
         * declaration_list
         *   0: declaration
         *   ...
         */
        this.__processSubnodes(data, bExecuting);

        // Adjust the stack pointer to take automatic local variables into
        // account. First, get the current symbol table
        symtab = playground.c.lib.Symtab.getCurrent();

        // Get the stack pointer's current value
        sp = playground.c.lib.Node.__mem.getReg("SP", "unsigned int");

        // Subtract the symbol table's size from the stack pointer, so that
        // subsequent function calls don't overwrite the automatic local
        // variables
        sp -= symtab.getSize();

        // Write the new stack pointer value
        playground.c.lib.Node.__mem.setReg("SP", "unsigned int", sp);
        break;

      case "declaration_specifiers" :
        /*
         * declaration_specifiers
         *   0: storage_class_specifier | type_specifier | type_qualifier
         *   ...
         * 
         *   these include native types and storage classes, plus:
         *      typedef
         *      type name
         *      enum
         *      struct
         */

        // We don't need to do this if we're executing
        if (bExecuting)
        {
          break;
        }

        this.__processSubnodes(data, bExecuting);
        break;

      case "declarator" :
        /*
         * declarator
         *   0 : direct_declarator
         *   1 : pointer? array?
         *   ...
         */
        
        // Process the direct declarator, to determine the identifier
        entry = this.children[0].process(data, bExecuting);
        
        // Process the remaining sub-nodes
        for (i = 1; i < this.children.length; i++)
        {
          if (this.children[i])
          {
            this.children[i].process(data, bExecuting);
          }
        }
        return entry;

      case "default" :
        /*
         * default
         *   0 :statement
         */

        // We only process default expressions while executing. We must,
        // however, process any compound statements herein, so process the
        // default statement if not executing.
        if (! bExecuting)
        {
          this.children[0].process(data, bExecuting);
          break;
        }
        
        // We wouldn't have gotten here if this case statement were within a
        // switch. Getting here means that we found a case statement which is
        // not immediately within a switch statement.
        this.error("Found a 'default' not immediately within a 'switch'");
        break;

      case "dereference" :
        /*
         * dereference
         *   0: cast_expression
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // We're executing. Get the value of the cast_expression
        value = this.children[0].process(data, bExecuting);

        // If we found a symbol, get its address and type
        if (value instanceof playground.c.lib.SymtabEntry)
        {
          // Find the address from which we will retrieve the pointer
          addr = value.getAddr();

          // Obtain the specifier/declarator list
          specAndDecl = value.getSpecAndDecl();
        }
        else
        {
          // Find the address from which we will retrieve the pointer
          addr = value.value;

          // Obtain the specifier/declarator list
          specAndDecl = value.specAndDecl;
        }
        
        // Pull the first specifier/declarator off of the list
        specOrDecl = specAndDecl.shift();

        // Ensure that we can dereference this thing. To be able to, it must
        // be either a pointer.
        if (specOrDecl.getType() != "pointer")
        {
          throw new playground.c.lib.RuntimeError(
            this,
            "Can not dereference " + value.getName() + 
              " because it is not a pointer.");
        }

        // Get the first remaining specifier/declarator
        specOrDecl = specAndDecl[0];
        
        // It must be a specifier, or we can't dereference
        if (specOrDecl instanceof playground.c.lib.Declarator)
        {
          throw new playground.c.lib.RuntimeError(
            this,
            "Can only dereference a native type " +
              "(e.g. short, unsigned long, float, etc.)");
        }

        // Determine the type to dereference, from the remaining
        // specifier/declarator
        type = specAndDecl.getCType();
        
        // Prepare the return value. We know it's specifier/declarator list.
        value3 = 
          {
            specAndDecl : specAndDecl
          };

        // Get the address that the pointer points to
        addr = playground.c.lib.Node.__mem.get(addr, "pointer"); 

        // Now get the value from that address
        value3.value = playground.c.lib.Node.__mem.get(addr, type); 

        // Complete the operation
        return value3;

      case "direct_abstract_declarator" :
        this.__processSubnodes(data, bExecuting);
        break;

      case "divide" :
        /*
         * divide :
         *   0 : multiplicative_expression
         *   1 : cast_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Complete the operation, coercing to the appropriate type
          specAndDecl = this.__coerce(value1.specAndDecl, value2.specAndDecl);
          return (
            { 
              value       : value1.value / value2.value,
              specAndDecl : specAndDecl
            });
        }
        break;

      case "divide-assign" :
        /*
         * divide-assign
         *   0: unary_expression (lhs)
         *   1: assignment_expression (rhs)
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal / newVal;
                                   });

      case "double" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setType("double");
        break;

      case "do-while" :
        /*
         * do-while
         *   0 : statement block
         *   1 : expression
         */
        if (! bExecuting)
        {
          // Ensure all symbols are defined for this statement block
          this.children[0].process(data, bExecuting);
          break;
        }
        
        // We're executing. Process the loop.
        try
        {
          // Save current symbol table so we know where to pop to upon return
          symtab = playground.c.lib.Symtab.getCurrent();

          do
          {
            // statement block
            try
            {
              // Save current symbol table so we know where to pop to upon
              // continue
              symtab2 = playground.c.lib.Symtab.getCurrent();

              // Process the statement block
              this.children[0].process(data, bExecuting);
            }
            catch(e)
            {
              // was a continue statement executed?
              if (e instanceof playground.c.lib.Continue)
              {
                // Yup. Restore symbol table to where it was when we entered
                // the statement from which we are continuing
                while (playground.c.lib.Symtab.getCurrent() != symtab2)
                {
                  playground.c.lib.Symtab.popStack();
                }
              }
              else
              {
                // It's not a continue. Re-throw the error
                throw e;
              }
            }
          } while (this.getExpressionValue(
                     this.children[1].process(data, bExecuting),
                     data).value);
        }
        catch(e)
        {
          // was a break statement executed?
          if (e instanceof playground.c.lib.Break)
          {
            // Yup. Retore symbol table to where it was when we entered the
            // statement from which we are breaking
            while (playground.c.lib.Symtab.getCurrent() != symtab)
            {
              playground.c.lib.Symtab.popStack();
            }
          }
          else
          {
            // It's not a break. Re-throw the error
            throw e;
          }
        }
        break;

      case "ellipsis" :
        throw new Error("Not yet implemented: ellipsis");
        break;

      case "enumerator_list" :
        throw new Error("Not yet implemented: enumerator_list");
        break;

      case "enum_specifier" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setType("enum");
        throw new Error("Not yet implemented: enum_specifier");
        break;

      case "equal" :
        /*
         * equal :
         *   0 : equality_expression
         *   1 : relational_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Create a specifier for the value
          specOrDecl = new playground.c.lib.Specifier(this, "int");

          // Complete the operation, coercing to the appropriate type
          return (
            { 
              value       : value1.value === value2.value ? 1 : 0,
              specAndDecl : [ specOrDecl ]
            });
        }
        break;

      case "exclusive-or" :
        /*
         * exclusive-or :
         *   0 : exclusive_or_expression
         *   1 : and_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Complete the operation, coercing to the appropriate type
          specAndDecl = this.__coerce(value1.specAndDecl, value2.specAndDecl);
          return (
            { 
              value       : value1.value ^ value2.value,
              specAndDecl : specAndDecl
            });
        }
        break;

      case "expression" :
        return this.__processSubnodes(data, bExecuting);

      case "extern" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setStorage("extern");
        break;

      case "float" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setType("float");
        break;

      case "for" :
        /*
         * for
         *   0 : expression_statement (initialization)
         *   1 : expression_statement (while condition)
         *   2 : statement (statement block)
         *   3 : expression (after each iteration)
         */
        if (! bExecuting)
        {
          // Ensure all symbols are defined for these blocks
          if (this.children[0])
          {
            // initialization
            this.children[0].process(data, bExecuting);
          }
          
          // statement block
          this.children[2].process(data, bExecuting);
              
          // after each iteration
          if (this.children[3])
          {
            this.children[3].process(data, bExecuting);
          }
          break;
        }
        
        // We're executing. Process the loop.
        try
        {
          // Save current symbol table so we know where to pop to upon return
          symtab = playground.c.lib.Symtab.getCurrent();

          // We're executing. Process the loop.
          if (this.children[0])
          {
            // initialization
            this.children[0].process(data, bExecuting);
          }

          while (this.children[1] 
                 ? this.getExpressionValue(
                     this.children[1].process(data, bExecuting),
                      data).value
                 : 1)
          {
            try
            {
              // Save current symbol table so we know where to pop to upon
              // continue
              symtab2 = playground.c.lib.Symtab.getCurrent();

              // Process the statement block
              this.children[2].process(data, bExecuting);
            }
            catch(e)
            {
              // was a continue statement executed?
              if (e instanceof playground.c.lib.Continue)
              {
                // Yup. Restore symbol table to where it was when we entered
                // the statement from which we are continuing
                while (playground.c.lib.Symtab.getCurrent() != symtab2)
                {
                  playground.c.lib.Symtab.popStack();
                }
              }
              else
              {
                // It's not a continue. Re-throw the error
                throw e;
              }
            }

            // after each iteration
            if (this.children[3])
            {
              this.children[3].process(data, bExecuting);
            }
          }
        }
        catch(e)
        {
          // was a break statement executed?
          if (e instanceof playground.c.lib.Break)
          {
            // Yup. Retore symbol table to where it was when we entered the
            // statement from which we are breaking
            while (playground.c.lib.Symtab.getCurrent() != symtab)
            {
              playground.c.lib.Symtab.popStack();
            }
          }
          else
          {
            // It's not a break. Re-throw the error
            throw e;
          }
        }
        break;

      case "function_call" :
        /*
         * function_call
         *   0: primary_expression (function to be called)
         *   1: argument_expression_list?
         */
        if (! bExecuting)
        {
          break;
        }
        
        // Get a quick reference to memory
        mem = playground.c.lib.Node.__mem;

        // Save the stack pointer, so we can restore it after the function call
        origSp = mem.getReg("SP", "unsigned int");
        
        // Retrieve the symbol table entry for this function
        value1 = this.children[0].process(data, bExecuting);
        
        // Get the address of that entry, which is the node for the called
        // function, or the reference of a built-in function.
        value2 = value1.getAddr();
        
        // Prepare to save arguments in a JS array as well as on the stack, in
        // case this is a built-in function being called.
        if (value1.getSpecAndDecl()[0].getType() == "builtIn")
        {
          data.args = [];
        }

        // Push the arguments onto the stack
        if (this.children[1])
        {
          this.children[1].process(data, bExecuting);
        }

        // Is this a built-in function, or a user-generated one?
        if (value1.getSpecAndDecl()[0].getType() == "builtIn")
        {
          // Save the return value in value3
          value3 = value2.apply(null, data.args);
        }
        else
        {
          // Save the new frame pointer
          value2._symtab.setFramePointer(mem.getReg("SP", "unsigned int"));

          // Push the return address (our current line number) onto the stack
          sp = mem.stackPush("unsigned int", this.line);
          
          // Add "symbol info" to show that this was a return address
          intSize = playground.c.machine.Memory.typeSize["int"];
          mem.setSymbolInfo(
            sp,
            {
              getName         : function() { return "called from line #"; },
              getType         : function() { return "int"; },
              getSize         : function() { return intSize; },
              getPointerCount : function() { return 0; },
              getArraySizes   : function() { return []; },
              getIsParameter  : function() { return false; }
            });
          
          // Process that function. Save its return value in value3
          value3 = value2.process(data, bExecuting);

          // Restore the previous frame pointer
          value2._symtab.restoreFramePointer();
        }
        
        // Remove our argument array
        delete data.args;

        // Restore the stack pointer
        mem.setReg("SP", "unsigned int", origSp);
        return value3;

      case "function_decl" :
        /*
         * function_decl
         *   0 : direct_declarator
         *   1 : parameter_type_list
         *   2 : identifier_list // K&R only; not implemented; always null
         */
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        // Process the direct declarator. It may add a declarator.
        this.children[0].process(data, bExecuting);

        // Find our enclosing function definition
        for (subnode = this.parent; subnode; subnode = subnode.parent)
        {
          if (subnode.type == "function_definition")
          {
            break;
          }
        }

        // Add a function declarator for this symbol.
        declarator = new playground.c.lib.Declarator(this);
        declarator.setType("function");
        declarator.setFunctionNode(subnode);
        data.specAndDecl.push(declarator);
        
        // Create a symbol table for this function's arguments
        symtab = new playground.c.lib.Symtab(
          playground.c.lib.Symtab.getCurrent(), 
          data.entry.getName(),
          this.line);

        // Save the function's symbol table and name in the function
        // definition node
        subnode._symtab = symtab;
        subnode._functionName = data.entry.getName();
        
        // Process the remaining children
        this.children.forEach(
          function(child, i)
          {
            // Skip the already-processed direct declarator, and any null
            // children.
            if (i == 0 || ! child)
            {
              return;
            }
            
            child.process(data, bExecuting);
          });
        break;

      case "function_definition" :
        /*
         * function_definition
         *   0: type specifier
         *   1: declarator
         *   2: declaration_list // K&R only; not implemented; always null
         *   3: compound_statement
         */

        // If we're not executing yet...
        if (! bExecuting)
        {
          // Create our own data object with a new specifier for this
          // declaration
          data = 
            {
              id : "function_definition",
              specifiers  : new playground.c.lib.Specifier(this),
              specAndDecl : []
            };

          // Process the children
          this.__processSubnodes(data, bExecuting);

          // Add the specifier to the end of the specifier/declarator list
          data.specAndDecl.push(data.specifiers);

          // Pop this function's symbol table from the stack
          playground.c.lib.Symtab.popStack();
        
          break;
        }

        // We're executing. The symbol table entry for this function must
        // exist. Retrieve it from the node where we saved it.
        symtab2 = this._symtab;

        // Push it onto the symbol table stack as if we'd just created it
        playground.c.lib.Symtab.pushStack(symtab2);

        try
        {
          // Save current symbol table so we know where to pop to upon return
          symtab = playground.c.lib.Symtab.getCurrent();

          // Process the paremeter list
          declarator = this.children[1];
          function_decl = declarator.children[0];
          if (function_decl.children[1])
          {
            function_decl.children[1].process(data, bExecuting);
          }

          // Process the compound statement
          this.children[3].process(data, bExecuting);
          
          // Create a specifier for the value
          specOrDecl = 
            new playground.c.lib.Specifier(this, "int", "char", "unsigned");

          // A return statement in the function will cause the catch() block
          // to be executed. If one doesn't exist, create an arbitrary return
          // value.
          value3 =
            {
              value       : Math.floor(Math.random() * 256),
              specAndDecl : [ specOrDecl ]
            };
        }
        catch(e)
        {
          // Did we get back a return value?
          if (e instanceof playground.c.lib.Return)
          {
            // Yup. It contains the return value
            value3 = e.returnCode;
            specAndDecl = value3.specAndDecl;

            // Retore symbol table to where it was when we called the function
            while (playground.c.lib.Symtab.getCurrent() != symtab)
            {
              playground.c.lib.Symtab.popStack();
            }
          }
          else
          {
            // It's not a return code. Re-throw the error
            throw e;
          }
        }

        // Pop this function's symbol table from the stack
        playground.c.lib.Symtab.popStack();
        
        // Obtain the symbol table entry for this function
        entry = symtab.getParent().get(this._functionName, true);

        // Get the specifier/declarator list for this function
        specAndDecl = entry.getSpecAndDecl();

        // Remove the "function" declarator, to leave the return type
        specAndDecl.shift();

        // Set this specAndDecl for the return value
        value3.specAndDecl = specAndDecl;

        return value3;

      case "goto" :
        throw new Error("Not yet implemented: goto");
        break;

      case "greater-equal" :
        /*
         * greater-equal :
         *   0 : relational_expression
         *   1 : shift_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Create a specifier for the value
          specOrDecl = new playground.c.lib.Specifier(this, "int");

          // Complete the operation, coercing to the appropriate type
          return (
            { 
              value       : value1.value >= value2.value ? 1 : 0,
              specAndDecl : [ specOrDecl ]
            });
        }
        break;

      case "greater-than" :
        /*
         * greater-than :
         *   0 : relational_expression
         *   1 : shift_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Create a specifier for the value
          specOrDecl = new playground.c.lib.Specifier(this, "int");

          // Complete the operation, coercing to the appropriate type
          return (
            { 
              value       : value1.value > value2.value ? 1 : 0,
              specAndDecl : [ specOrDecl ]
            });
        }
        break;

      case "identifier" :
        if (! bExecuting)
        {
          // This symbol shouldn't exist. Create a symbol table entry for it
          entry = playground.c.lib.Symtab.getCurrent().add(
            this.value, this.line, false, true);

          if (! entry)
          {
            entry = 
              playground.c.lib.Symtab.getCurrent().get(this.value, true);
            this.error("Identifier '" + this.value + "' " +
                       "was previously declared near line " +
                       entry.getLine());
            break;
          }
          
          // Attach the specifier/declarator list to this symbol
          entry.setSpecAndDecl(data.specAndDecl);
          data.entry = entry;
          
          // Process any children
          this.__processSubnodes(data, bExecuting);
        }
        
        // We're executing. Obtain the symbol table entry for this identifier
        entry = playground.c.lib.Symtab.getCurrent().get(this.value, false);
        if (! entry)
        {
          throw new playground.c.lib.RuntimeError(
            this,
            "Undeclared variable: " + this.value);
        }
        return entry;

      case "identifier_list" :
        /*
         * identifier_list
         *   0: identifier
         *   ...
         */
        throw new Error("K&R-style declarations are not supported");
        break;

      case "if" :
        /*
         * if
         *   0: expression
         *   1: statement (if)
         *   2: statement (else)
         */
        
        // If we're not executing...
        if (! bExecuting)
        {
          // ... then just process each of the subnodes
          this.__processSubnodes(data, bExecuting);
          break;
        }
        
        // We're executing. Get the value of the expression
        value1 = 
          this.getExpressionValue(this.children[0].process(data, bExecuting),
                                  data);
        
        // If the retrieved value is non-zero...
        if (value1.value)
        {
          // ... then process child 1
          this.children[1].process(data, bExecuting);
        }
        else
        {
          // otherwise process child 2 (if it exists)
          if (this.children.length > 2)
          {
            this.children[2].process(data, bExecuting);
          }
        }

        break;

      case "init_declarator" :
        /*
         * init_declarator
         *   0 : declarator
         *   1 : initializer?
         */

        if (! bExecuting)
        {
          // Create a list to hold specifiers and declarators
          data.specAndDecl = [];

          // Process the declarator, which also creates the symbol table entry
          this.children[0].process(data, bExecuting);

          // Add the specifier to the end of the specifier/declarator list
          data.specAndDecl.push(data.specifiers);

          // Calculate the offset in the symbol table for this symbol table
          // entry, based on the now-complete specifiers and declarators
          data.entry.calculateOffset();

          // We no longer need our reference to the specifier/declarator list.
          // The symbol table entry still references it
          delete data.specAndDecl;
          
          break;
        }
        
        // We're executing. Retrieve the symbol table entry for this variable.
        entry = this.children[0].process(data, bExecuting);

        // If we're executing, all we need to do is process the initializer
        if (this.children[1])
        {
          value = this.children[1].process(data, bExecuting);
          playground.c.lib.Node.__mem.set(entry.getAddr(), 
                                          entry.getType(), 
                                          value.value);
        }
        break;

      case "init_declarator_list" :
        /*
         * init_declarator_list
         *   0: init_declarator
         *   ...
         */
        this.__processSubnodes(data, bExecuting);
        break;

      case "initializer_list" :
        this.__processSubnodes(data, bExecuting);
        break;

      case "int" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setType("int");
        break;

      case "label" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setType("label");
        throw new Error("Not yet implemented: label");
        break;

      case "left-shift" :
        /*
         * left-shift :
         *   0 : shift_expression
         *   1 : additive_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Create a specifier for the value
          specOrDecl = new playground.c.lib.Specifier(this, "int");

          // Complete the operation, coercing to the appropriate type
          return (
            { 
              value       : value1.value << value2.value,
              specAndDecl : [ specOrDecl ]
            });
        }
        break;

      case "left-shift-assign" :
        /*
         * left-shift-assign
         *   0: unary_expression (lhs)
         *   1: assignment_expression (rhs)
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal << newVal;
                                   });

      case "less-equal" :
        /*
         * less-equal :
         *   0 : relational_expression
         *   1 : shift_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Create a specifier for the value
          specOrDecl = new playground.c.lib.Specifier(this, "int");

          // Complete the operation, coercing to the appropriate type
          return (
            { 
              value       : value1.value <= value2.value ? 1 : 0,
              specAndDecl : [ specOrDecl ]
            });
        }
        break;

      case "less-than" :
        /*
         * less-than :
         *   0 : relational_expression
         *   1 : shift_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Create a specifier for the value
          specOrDecl = new playground.c.lib.Specifier(this, "int");

          // Complete the operation, coercing to the appropriate type
          return (
            { 
              value       : value1.value < value2.value ? 1 : 0,
              specAndDecl : [ specOrDecl ]
            });
        }
        break;

      case "long" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setSize("long");
        break;

      case "mod" :
        /*
         * mod :
         *   0 : multiplicative_expression
         *   1 : cast_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Complete the operation, coercing to the appropriate type
          specAndDecl = this.__coerce(value1.specAndDecl, value2.specAndDecl);
          return (
            { 
              value       : value1.value % value2.value,
              specAndDecl : specAndDecl
            });
        }
        break;

      case "mod-assign" :
        /*
         * mod-assign
         *   0: unary_expression (lhs)
         *   1: assignment_expression (rhs)
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal % newVal;
                                   });

      case "multiply" :
        /*
         * multiply :
         *   0 : multiplicative_expression
         *   1 : cast_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Complete the operation, coercing to the appropriate type
          specAndDecl = this.__coerce(value1.specAndDecl, value2.specAndDecl);
          return (
            { 
              value       : value1.value * value2.value,
              specAndDecl : specAndDecl
            });
        }
        break;

      case "multiply-assign" :
        /*
         * multiply-assign
         *   0: unary_expression (lhs)
         *   1: assignment_expression (rhs)
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal * newVal;
                                   });

      case "negative" :
        /*
         * negative :
         *   0 : unary_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the unary expression
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          
          // Complete the operation
          return (
            { 
              value       : - value1.value,
              specAndDecl : value1.specAndDecl
            });
        }
        break;

      case "not" :
        /*
         * not :
         *   0 : unary_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the unary expression
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          
          // Create a specifier for the value
          specOrDecl = new playground.c.lib.Specifier(this, "int");

          // Complete the operation
          return (
            { 
              value       : ! value1.value,
              specAndDecl : [ specOrDecl ]
            });
        }
        break;

      case "not-equal" :
        /*
         * not-equal :
         *   0 : equality_expression
         *   1 : relational_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Create a specifier for the value
          specOrDecl = new playground.c.lib.Specifier(this, "int");

          // Complete the operation, coercing to the appropriate type
          return (
            { 
              value       : value1.value !== value2.value ? 1 : 0,
              specAndDecl : [ specOrDecl ]
            });
        }
        break;

      case "or" :
        /*
         * or :
         *   0 : logical_or_expression
         *   1 : logical_and_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Complete the operation, coercing to the appropriate type
          specAndDecl = this.__coerce(value1.specAndDecl, value2.specAndDecl);
          return (
            { 
              value       : value1.value || value2.value ? 1 : 0,
              specAndDecl : specAndDecl
            });
        }
        break;

      case "parameter_declaration" :
        /*
         * parameter_declaration
         *   0: declaration_specifiers
         *   1: declarator?
         *   2: abstract_declarator?
         */

        // Create our own data object with a new specifier for this declaration
        data = 
          {
            id : "parameter_declaration",
            specifiers  : new playground.c.lib.Specifier(this),
            specAndDecl : []
          };

        // Process the specifiers
        this.children[0].process(data, bExecuting);
        
        // Process the declarator
        if (this.children[1])
        {
          this.children[1].process(data, bExecuting);
        }

        // Process the abstract_declarator
        if (this.children[2])
        {
          this.children[2].process(data, bExecuting);
        }

        if (! bExecuting)
        {
          // Add the specifier to the end of the specifier/declarator list
          data.specAndDecl.push(data.specifiers);

          // If it's not a void parameter list...
          if (data.entry)
          {
            // Calculate the symbol offset required for this symbol table
            // entry, based on the now-complete specifiers and declarators
            data.entry.calculateOffset();
          }
        }

        break;

      case "parameter_list" :
        /*
         * parameter_list
         *   0: parameter_declaration
         *   ...
         *   n: ellipsis?
         */
        this.__processSubnodes(data, bExecuting);
        break;

      case "pointer" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        // Add a pointer declarator for this symbol
        declarator = new playground.c.lib.Declarator(this);
        declarator.setType("pointer");
        data.specAndDecl.push(declarator);
        
        // Process additional pointers
        this.__processSubnodes(data, bExecuting);
        break;

      case "pointer_access" :
        throw new Error("Not yet implemented: pointer_access");
        break;

      case "positive" :
        /*
         * positive :
         *   0 : unary_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the unary expression
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          
          // Complete the operation. This is a no-op.
          return value1;
        }
        break;

      case "post_decrement_op" :
        /*
         * post_decrement_op
         *   0: unary_expression
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal - 1;
                                   },
                                   true,
                                   true);

      case "primary_expression" :
        /*
         * primary_expression
         *   0: primary_expression |
         *      array_expression | 
         *      structure_reference |
         *      pointer_access
         *   ...
         */
        return this.children[0].process(data, bExecuting);

      case "post_increment_op" :
        /*
         * post_increment_op
         *   0: unary_expression
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal + 1;
                                   },
                                   true,
                                   true);

      case "pre_decrement_op" :
        /*
         * pre_decrement_op
         *   0: unary_expression
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal - 1;
                                   },
                                   true,
                                   false);
        break;

      case "pre_increment_op" :
        /*
         * pre_increment_op
         *   0: unary_expression
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal + 1;
                                   },
                                   true,
                                   false);

      case "register" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setStorage("register");
        break;

      case "return" :
        /*
         * return :
         *   0 : expression
         */
        if (! bExecuting)
        {
          break;
        }

        // If there's an expression to return...
        if (this.children[0])
        {
          // ... then retrieve its value.
          value3 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
        }
        else
        {
          // Create a specifier for the value
          specOrDecl = 
            new playground.c.lib.Specifier(this, "int", "char", "unsigned");

          // No return value was provided. Choose one at random.
          value3 =
            {
              value       : Math.floor(Math.random() * 256),
              specAndDecl : [ specOrDecl ]
            };
        }
        
        // Return via throwing an error, to unwrap intervening call frames.
        throw new playground.c.lib.Return(value3);
        break;

      case "right-shift" :
        /*
         * right-shift :
         *   0 : shift_expression
         *   1 : additive_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Create a specifier for the value
          specOrDecl = new playground.c.lib.Specifier(this, "int");

          // Complete the operation, coercing to the appropriate type
          return (
            { 
              value       : value1.value >> value2.value,
              specAndDecl : [ specOrDecl ]
            });
        }
        break;

      case "right-shift-assign" :
        /*
         * right-shift-assign
         *   0: unary_expression (lhs)
         *   1: assignment_expression (rhs)
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal >> newVal;
                                   });

      case "short" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setSize("short");
        break;

      case "signed" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setSigned("signed");
        break;

      case "sizeof" :
        throw new Error("Not yet implemented: sizeof");
        break;

      case "specifier_qualifier_list" :
        this.__processSubnodes(data, bExecuting);
        break;

      case "statement_list" :
        /*
         * statement_list
         *   0: statement
         *   ...
         */
        this.__processSubnodes(data, bExecuting);
        break;

      case "static" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setStorage("static");
        break;

      case "string_literal" :
        // Have we already allocated space for this string?
        if (! this._mem)
        {
          var             chars = [];

          // Nope. Allocate the space now
          this._mem =
            playground.c.lib.Symtab.allocGlobalSpace(this.value.length + 1,
                                                     "string",
                                                     this.line);
          
          // Write the string, as character codes, into the allocated memory
          this.value.split("").forEach(
            function(ch, i)
            {
              playground.c.lib.Node.__mem.set(this._mem + i, 
                                              "char",
                                              this.value.charCodeAt(i));
            },
            this);

          // Null terminate the string
          playground.c.lib.Node.__mem.set(this._mem + this.value.length, 
                                          "char",
                                          0);
        }
        
        // Create an initially-empty specifier/declarator list
        specAndDecl = [];

        // Create a declarator to indicate that it's a pointer, and add it to
        // the specifier/declarator list
        specAndDecl.push(new playground.c.lib.Declarator(this, "pointer"));

        // Create a specifier to indicate that it's a char *
        specAndDecl.push(new playground.c.lib.Specifier(this, "int", "char"));

        // Return the pointer to the string in global memory
        return (
          {
            value       : this._mem, 
            specAndDecl : specAndDecl
          });

      case "struct" :
        /*
         * struct
         *   0 : struct_declaration_list
         *   1 : identifier
         */
        
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setType("struct");
        throw new Error("Not yet implemented: struct");
        break;

      case "struct_declaration" :
        /*
         * struct_declaration
         *   0: specifier_qualifier_list
         *   1: struct_declarator_list
         *      0: struct_declarator
         *         0: declarator
         *            0: identifier
         *            1: pointer
         *               0: ...
         */

        // Obtain a symbol table entry for the identifier. Put it in the
        // sybol table associated with the entry in our data.
        identifier =
          this.children[1].children[0].children[0].children[0].value;
        symtabStruct = data.entry.getStructSymtab();
        entry = symtabStruct.add(identifier, this.line, false);

        if (! entry)
        {
          entry = symtabStruct.get(identifier, false);
          this.error("Structure member '" + identifier + "' " +
                     "was previously declared near line " + entry.getLine());
          return null;
        }

        // Process the specifier qualifier list to add this declaration's
        // types to the symtab entry. For each declared type...
        this.children[0].children.forEach(
          function(subnode)
          {
            // ... add this declared type to the entry. First check for ones
            // we must handle specially.
            if (subnode.type == "struct")
            {
              /*
               * struct
               *   0: struct_declaration_list
               *   1: identifier
               */
              subnode.process(data, bExecuting);
              entry.setType(subnode.children[1].value);
            }
            else if (subnode.type == "enum_specifier")
            {
              throw new Error("enum_specifier not yet implemented");
            }
            else
            {
              entry.setType(subnode.type == "type_name_token"
                            ? subnode.value
                            : subnode.type);
            }
          },
          this);
        break;

      case "struct_declaration_list" :
        /*
         * struct_declaration_list
         *   0: struct_declaration
         *   ...
         */
        this.__processSubnodes(data, bExecuting);
        break;

      case "struct_declarator" :
        throw new Error("Not yet implemented: struct_declarator");
        break;

      case "struct_declarator_list" :
        throw new Error("Not yet implemented: struct_declarator_list");
        break;

      case "structure_reference" :
        throw new Error("Not yet implemented: structure_reference");
        break;

      case "subtract" :
        /*
         * subtract :
         *   0 : additive_expression
         *   1 : multiplicative_expression
         */
        if (bExecuting)
        {
          // We're executing. Get the value of the left and right expressions
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          value2 = 
            this.getExpressionValue(this.children[1].process(data, bExecuting),
                                    data);
          
          // Complete the operation, coercing to the appropriate type
          specAndDecl = this.__coerce(value1.specAndDecl, value2.specAndDecl);
          return (
            { 
              value       : value1.value - value2.value,
              specAndDecl : specAndDecl
            });
        }
        break;

      case "subtract-assign" :
        /*
         * subtract-assign
         *   0: unary_expression (lhs)
         *   1: assignment_expression (rhs)
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal - newVal;
                                   });

      case "switch" :
        /*
         * switch
         *   0 : expression
         *   1 : statement (compound_statement)
         *     0 : declarations
         *     1 : statement_list
         */
        if (! bExecuting)
        {
          if (this.children[1].children[1].type != "statement_list")
          {
            throw new Error("Internal error: expected statement list");
          }
          
          // Process the compound statement.
          this.children[1].process(data, bExecuting);
          break;
        }

        // We're executing. Evaluate the expression, and find the correct case.
        try
        {
          // Save current symbol table so we know where to pop to upon return
          symtab = playground.c.lib.Symtab.getCurrent();

          // Evaluate the expression on which we will switch
          value1 = 
            this.getExpressionValue(this.children[0].process(data, bExecuting),
                                    data);
          
          // Get a reference to the statement list
          subnode = this.children[1].children[1];

          // If we haven't evaluated case expressions yet...
          if (! subnode.cases)
          {
            // ... then create a map of case expression values
            subnode.cases = {};
            subnode.caseAndBreak = [];

            // Run through each case and evaluate it.
            subnode.children.forEach(
              function(child)
              {
                var             map;
                var             value;

                // Is this a case label?
                if (child.type == "case")
                {
                  // Yup. Throw an error if the case expression is not constant
                  data.constantOnly = "case";

                  // Get its expression value. It (child 0) becomes the key
                  // in the cases map, and child 1, the statement, becomes the
                  // value of that key in the cases map.
                  value =
                    this.getExpressionValue(
                      child.children[0].process(data, bExecuting),
                      data).value;
                  
                  // Does this value already exist in the cases map
                  if (subnode.cases[value])
                  {
                    // Yup. This is an error.
                    this.error("Found multiple case labels for '" +
                               value + "' in 'switch'",
                               true);
                    return;     // not reached
                  }
                  
                  // This is a new case value. Save its statement.
                  map =
                    {
                      order : subnode.caseAndBreak.length,
                      node  : child.children[1]
                    };
                  subnode.cases[value] = map;
                  subnode.caseAndBreak.push(map);
                  
                  // Stop testing for constant expressions
                  delete data.constantOnly;
                }
                else if (child.type == "default")
                {
                  // Did we already find a default?
                  if (subnode.cases["default"])
                  {
                    // Yup. This is an error.
                    this.error("Found multiple 'default' labels in 'switch'",
                               true);
                    return;     // not reached
                  }
                  
                  // Add this default's node to the cases map
                  map =
                    {
                      order : subnode.caseAndBreak.length,
                      node  : child.children[0]
                    };
                  subnode.cases["default"] = map;
                  subnode.caseAndBreak.push(map);
                }
                else if (child.type == "break")
                {
                  // Do not add break to the cases map, but do add it to the
                  // caseAndBreak array.
                  map =
                    {
                      order : subnode.caseAndBreak.length,
                      node  : child
                    };
                  subnode.caseAndBreak.push(map);
                }
              },
              this);
          }
          
          // Get map of nodes for each case
          cases = subnode.cases;
          caseAndBreak = subnode.caseAndBreak;
          subnode = cases[value1.value] || cases["default"];
          
          // Did we find a case to execute?
          if (typeof subnode != "undefined")
          {
            // Yup. Process it and all following nodes (until a break is hit)
            for (i = subnode.order; i < caseAndBreak.length; i++)
            {
              if (caseAndBreak[i].node)
              {
                caseAndBreak[i].node.process(data, bExecuting);
              }
            }
          }
          else
          {
            console.log("Ignoring switch value " + value1.value);
          }
        }
        catch(e)
        {
          // was a break statement executed?
          if (e instanceof playground.c.lib.Break)
          {
            // Yup. Retore symbol table to where it was when we entered the
            // statement from which we are breaking
            while (playground.c.lib.Symtab.getCurrent() != symtab)
            {
              playground.c.lib.Symtab.popStack();
            }
          }
          else
          {
            // It's not a break. Re-throw the error
            throw e;
          }
        }
        break;

      case "translation_unit" :
        /*
         * translation_unit
         *   0: external_declaration
         *   ...
         */
        
        // Process all subnodes
        this.__processSubnodes(data, bExecuting);
        break;

      case "trinary" :
        /*
         * trinary
         *   0 : logical_or_expression
         *   1 : expression
         *   2 : conditional_expression
         */
        if (! bExecuting)
        {
          break;
        }

        // Retrieve and evaluate the logical expression from child 0
        value1 = 
          this.getExpressionValue(this.children[0].process(data, bExecuting),
                                  data);
        
        // If it's true, return the value of child 1
        if (value1.value)
        {
          return this.getExpressionValue(
            this.children[1].process(data, bExecuting),
            data);
        }

        // Otherwise return the value of child 2.
        return this.getExpressionValue(
          this.children[2].process(data, bExecuting),
          data);
        
        break;

      case "typedef" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setStorage("typedef");
        break;

      case "type_definition" :
        throw new Error("Not yet implemented: type_definition");
        break;

      case "type_name" :
        /*
         * type_name
         *   0: specifier_qualifier_list
         *   1: abstract_declarator?
         * 
         * This node type is used only for sizeof and cast, so returns a map
         * containing the textual type name (type) and its size (size). That
         * information is static -- it can not change during the course of
         * execution, so the map is cached as this.data, in case this node is
         * traversed again.
         */
        throw new Error("Not yet implemented: type_name");
        break;

      case "type_qualifier_list" :
        this.__processSubnodes(data, bExecuting);
        break;

      case "union" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setType("union");
        throw new Error("Not yet implemented: union");
        break;

      case "unsigned" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setSigned("unsigned");
        break;

      case "void" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setType("void");
        break;

      case "volatile" :
        // Only applicable before executing
        if (bExecuting)
        {
          break;
        }
        
        data.specifiers.setVolatile("volatile");
        break;

      case "xor-assign" :
        /*
         * xor-assign
         *   0: unary_expression (lhs)
         *   1: assignment_expression (rhs)
         */
        
        // Only applicable when executing
        if (! bExecuting)
        {
          break;
        }

        // Assign the new value
        return this.__assignHelper(data, 
                                   function(oldVal, newVal)
                                   {
                                     return oldVal ^ newVal;
                                   });

      default:
        console.log("Unexpected node type: " + this.type);
        break;
      }
      
      return null;
    },


    /**
     * Process all sub-nodes of a node (which are non-null)
     * 
     * @param node {playground.c.lib.Node}
     *   The node whose sub-nodes (children) are to be processed
     * 
     * @return {Map}
     *   A value expression. The value of the last subnode is returned.
     */
    __processSubnodes : function(data, bExecuting)
    {
      var             ret;

      this.children.forEach(
        function(subnode)
        {
          if (subnode)
          {
            ret = subnode.process(data, bExecuting);
          }
        }, 
        this);
      
      return ret;
    },

    /**
     * Helper funciton for assignments.
     *
     * @param data {Map}
     *   The data map currently in use for recursive calls to process()
     *
     * @param fOp {Function}
     *   Function to produce the result for assignment. It takes two
     *   arguments: the old (original) value of the lhs, and the new value.
     *
     * @param bUnary {Boolean}
     *   true if this is a unary operator (pre/post-increment/decrement)
     *   false otherwise
     *
     * @param bPostOp {Boolean}
     *   true if this is a post-increment or post-decrement operation;
     *   false otherwise
     *
     * @return {Map}
     *   Upon success, a map containing the resulting value and its type is
     *   returned. Upon failure (lhs is not an lvalue), null is returned.
     */
    __assignHelper : function(data, fOp, bUnary, bPostOp)
    {
      var             type;
      var             value;
      var             value1;
      var             value3;
      var             specOrDecl;
      var             specAndDecl;
      var             bFirst;

      // Retrieve the lvalue
      value1 = this.children[0].process(data, true);

      // If it was a symbol table entry...
      if (value1 instanceof playground.c.lib.SymtabEntry)
      {
        // ... then retrieve the symbol's address
        value1 =
          {
            value        : value1.getAddr(), 
            specAndDecl  : value1.getSpecAndDecl()
          };
      }
      else if (value1.specAndDecl[0].getType() != "address")
      {
        this.error("The left hand side of an assignment must be " +
                   "a variable, pointer dereference, " +
                   "or array element reference");
        return null;
      }
      
      // Get a shallow copy of the specifier/declarator list
      specAndDecl = value1.specAndDecl.slice(0);

      // Only loop a maximum of one time
      bFirst = true;

      do
      {
        // Get the first specifier/declarator
        specOrDecl = specAndDecl.shift();

        // Determine the memory type to use for saving the value
        switch(specOrDecl.getType())
        {
        case "pointer" :
        case "function" :
        case "array" :
          type = "pointer";
          break;

        case "address" :
          // Find out the type based on the next specifier/declarator
          if (bFirst)
          {
            bFirst = false;
            continue;
          }
          
          // There were two "address" declarators in a row. It's a pointer.
          type = "pointer";
          break;
          
        default :
          if (specOrDecl instanceof playground.c.lib.Specifier)
          {
            type = specOrDecl.getCType();
          }
          else
          {
            throw new Error("Internal error: unexpected type: " + 
                            specOrDecl.getType());
          }
          break;
        }
        
        // Normal exit from the loop
        break;
      } while (true);

      // Retrieve the current value
      value = playground.c.lib.Node.__mem.get(value1.value, type);

      // Determine the value to assign there. If it's a unary operator
      // (pre/post increment/decrement), then use the retrieved
      // value. Otherwise, get the value from the rhs of the expression.
      value3 =
        bUnary
        ? { 
            value       : value, 
            specAndDecl : value1.specAndDecl.slice(0)
          }
        : this.getExpressionValue(this.children[1].process(data, true),
                                  data);

      // Determine the memory type to use for saving the value
      type =
        value1.specAndDecl[0] instanceof playground.c.lib.Declarator
        ? "pointer"
        : value1.specAndDecl[0].getCType();

      // Save the value at its new address
      playground.c.lib.Node.__mem.set(
        value1.value,
        type,
        fOp(value, value3.value));

      // If this is not a post-increment or post-decrement...
      if (! bPostOp)
      {
        // ... then retrieve and return the altered value
        value = playground.c.lib.Node.__mem.get(value1.value, type);
      }

      // Retrieve the value and return it
      return (
        {
          value       : value,
          specAndDecl : value1.specAndDecl.slice(0)
        });
    },

    /**
     * Given two original operand types, determine the type to which to coerce
     * both operands.
     *
     * FIXME: This uses an old method of coersion. Newer compilers use the
     * "value" method of integer promotions. See, for example, page 48 of
     * http://www.open-std.org/jtc1/sc22/wg14/www/docs/n1256.pdf
     *
     * @param specAndDecl1 {String}
     *   A specifier/declarator list for the first type to be tested
     *
     * @param specAndDecl2 {String}
     *   A specifier/declarator list for the second type to be tested
     *
     * @return {String}
     *   The C type to which to coerce the operands of an operation between
     *   operands originally of type1 and type2.
     */
    __coerce : function(specAndDecl1, specAndDecl2)
    {
      var             spec1 = specAndDecl1[0];
      var             spec2 = specAndDecl2[0];
      var             type1 = spec1.getType();
      var             type2 = spec2.getType();
      var             sign1 = spec1.getSigned();
      var             sign2 = spec2.getSigned();
      var             size1 = spec1.getSize();
      var             size2 = spec2.getSize();
      
      // Ensure that we got types that can be coerced
      [ type1, type2 ].forEach(
        function(type)
        {
          switch(type)
          {
          case "int" :
          case "float" :
          case "double" :
            break;
            
          default :
            throw new Error("Can not coerce to type " + type);
          }
        });
      
      // First, test for the common and easy case: both types are already the
      // same.
      if (type1 == type2)
      {
        return specAndDecl1;
      }

      // If one of the operands is double, then coerce to double
      if (type1 == "double")
      {
        return specAndDecl1;
      }
      if (type2 == "double")
      {
        return specAndDecl2;
      }

      // If one of the operands is float, then coerce to float
      if (type1 == "float")
      {
        return specAndDecl1;
      }
      if (type2 == "float")
      {
        return specAndDecl2;
      }

      // If one of the operands is unsigned long long, then coerce to
      // unsigned long long.

      if (type1 == "unsigned long long")
      {
        return specAndDecl1;
      }
      if (type2 == "unsigned long long")
      {
        return specAndDecl2;
      }

      // If one of the operands is unsigned long, then coerce to unsigned long.
      if (type1 == "int" && sign1 == "unsigned" && size1 == "long")
      {
        return specAndDecl1;
      }
      if (type2 == "int" && sign2 == "unsigned" && size2 == "long")
      {
        return specAndDecl2;
      }

      // If one of the operands is long, then coerce to long.
      if (type1 == "int" && size1 == "long")
      {
        return specAndDecl1;
      }
      if (type2 == "int" && size2 == "long")
      {
        return specAndDecl2;
      }

      // If one of the operands is unsigned int, then coerce to unsigned int.
      if (type1 == "int" && sign1 == "unsigned" && size1 === null)
      {
        return specAndDecl1;
      }
      if (type2 == "int" && sign2 == "unsigned" && size2 == null)
      {
        return specAndDecl2;
      }

      // In any other case, coerce to int.
      return [ new playground.c.lib.Specifier(this, "int") ];
    }
  },
  
  defer : function(statics)
  {
    playground.c.lib.Node.__mem = playground.c.machine.Memory.getInstance();
  }
});
