/**
 * Grammar for ANSI C (with some C99 mods)
 *
 * Copyright (c) 2013 Derrell Lipman
 * 
 * License:
 *   GPL Version 2: http://www.gnu.org/licenses/gpl-2.0.html 
 */

%token CONSTANT_HEX CONSTANT_OCTAL CONSTANT_DECIMAL CONSTANT_CHAR CONSTANT_FLOAT
%token IDENTIFIER STRING_LITERAL SIZEOF
%token PTR_OP INC_OP DEC_OP LEFT_OP RIGHT_OP LE_OP GE_OP EQ_OP NE_OP
%token AND_OP OR_OP MUL_ASSIGN DIV_ASSIGN MOD_ASSIGN ADD_ASSIGN
%token SUB_ASSIGN LEFT_ASSIGN RIGHT_ASSIGN AND_ASSIGN
%token XOR_ASSIGN OR_ASSIGN TYPE_NAME

%token TYPEDEF EXTERN STATIC AUTO REGISTER
%token CHAR SHORT INT LONG SIGNED UNSIGNED FLOAT DOUBLE CONST VOLATILE VOID
%token STRUCT UNION ENUM ELLIPSIS

%token CASE DEFAULT IF ELSE SWITCH WHILE DO FOR GOTO CONTINUE BREAK RETURN

%token LBRACE RBRACE

%nonassoc IF_WITHOUT_ELSE
%nonassoc ELSE


%start start_sym

%%

start_sym
  : translation_unit
  {
    R("start_sym : translation_unit");
    if (error.errorCount == 0)
    {
      playground.c.AbstractSyntaxTree.process($1);
    }
    else
    {
      sys.print("\nErrors encountered: " + error.errorCount + "\n\n");
    }
  }
  ;

primary_expression
  : identifier
    {
      R("primary_expression : identifier");
      $$ = $1;
    }
  | constant
    {
      R("primary_expression : constant");
      $$ = $1;
    }
  | string_literal
    {
      R("primary_expression : string_literal");
      $$ = $1;
    }
  | '(' expression ')'
    {
      R("primary_expression : '(' expression ')'");
      $$ = $2;
    }
  ;

postfix_expression
  : primary_expression
    {
      R("postfix_expression : primary_expression");
      $$ = new playground.c.lib.Node("postfix_expression", yytext, yylineno);
      $$.children.push($1);
    }
  | postfix_expression '[' expression ']'
    {
      R("postfix_expression : postfix_expression '[' expression ']'");

      var             array_expression;

      $$ = $1;
      array_expression =
        new playground.c.lib.Node("array_expression", yytext, yylineno);
      array_expression.children.push($1);
      array_expression.children.push($3);
      $$.children.push(array_expression);
    }
  | postfix_expression '(' ')'
    {
      R("postfix_expression : postfix_expression '(' ')'");
      $$ = new playground.c.lib.Node("function_call", yytext, yylineno);
      $$.children.push($1);
      $$.children.push(null);   // no argument_expression_list
    }
  | postfix_expression '(' argument_expression_list ')'
    {
      R("postfix_expression : " +
        "postfix_expression '(' argument_expression_list ')'");
      $$ = new playground.c.lib.Node("function_call", yytext, yylineno);
      $$.children.push($1);
      $$.children.push($3);
    }
  | postfix_expression '.' identifier
    {
      R("postfix_expression : postfix_expression '.' identifier");

      var             structure_reference;

      $$ = $1;
      structure_reference =
        new playground.c.lib.Node("structure_reference", yytext, yylineno);
      structure_reference.children.push($3);
      $$.children.push(structure_reference);
    }
  | postfix_expression PTR_OP identifier
    {
      R("postfix_expression : postfix_expression PTR_OP identifier");

      var             pointer_access;

      $$ = $1;
      pointer_access =
        new playground.c.lib.Node("pointer_access", yytext, yylineno);
      pointer_access.children.push($3);
      $$.children.push(pointer_access);
    }
  | postfix_expression INC_OP
    {
      R("postfix_expression : postfix_expression INC_OP");
      $$ = new playground.c.lib.Node("post_increment_op", yytext, yylineno);
      $$.children.push($1);
    }
  | postfix_expression DEC_OP
    {
      R("postfix_expression : postfix_expression DEC_OP");
      $$ = new playground.c.lib.Node("post_decrement_op", yytext, yylineno);
      $$.children.push($1);
    }
  ;

argument_expression_list
  : assignment_expression
  {
    R("argument_expression_list : assignment_expression");
    $$ =
      new playground.c.lib.Node("argument_expression_list", yytext, yylineno);
    $$.children.push($1);
  }
  | argument_expression_list ',' assignment_expression
  {
    R("argument_expression_list : " +
      "argument_expression_list ',' assignment_expression");
    $$ = $1;
    $$.children.push($3);
  }
  ;

unary_expression
  : postfix_expression
  {
    R("unary_expression : postfix_expression");
    $$ = $1;
  }
  | INC_OP unary_expression
  {
    R("unary_expression : INC_OP unary_expression");
    $$ = new playground.c.lib.Node("pre_increment_op", yytext, yylineno);
    $$.children.push($2);
  }
  | DEC_OP unary_expression
  {
    R("unary_expression : DEC_OP unary_expression");
    $$ = new playground.c.lib.Node("pre_decrement_op", yytext, yylineno);
    $$.children.push($2);
  }
  | unary_operator cast_expression
  {
    R("unary_expression : unary_operator cast_expression");
    $$ = $1;
    $$.children.push($2);
  }
  | SIZEOF unary_expression
  {
    R("unary_expression : SIZEOF unary_expression");
    $$ = new playground.c.lib.Node("sizeof", yytext, yylineno);
    $$.children.push($2);
  }
  | SIZEOF '(' type_name ')'
  {
    R("unary_expression : SIZEOF '(' type_name ')'");
    $$ = new playground.c.lib.Node("sizeof", yytext, yylineno);
    $$.children.push($3);
  }
  ;

unary_operator
  : '&'
  {
    R("unary_operator : '&'");
    $$ = new playground.c.lib.Node("address_of", yytext, yylineno);
  }
  | '*'
  {
    R("unary_operator : '*'");
    $$ = new playground.c.lib.Node("dereference", yytext, yylineno);
  }
  | '+'
  {
    R("unary_operator : '+'");
    $$ = new playground.c.lib.Node("positive", yytext, yylineno);
  }
  | '-'
  {
    R("unary_operator : '-'");
    $$ = new playground.c.lib.Node("negative", yytext, yylineno);
  }
  | '~'
  {
    R("unary_operator : '~'");
    $$ = new playground.c.lib.Node("bit_invert", yytext, yylineno);
  }
  | '!'
  {
    R("unary_operator : '!'");
    $$ = new playground.c.lib.Node("not", yytext, yylineno);
  }
  ;

cast_expression
  : unary_expression
  {
    R("cast_expression : unary_expression");
    $$ = $1;
  }
  | '(' type_name ')' cast_expression
  {
    R("cast_expression : '(' type_name ')' cast_expression");
    $$ = new playground.c.lib.Node("cast_expression", yytext, yylineno);
    $$.children.push($2);
    $$.children.push($4);
  }
  ;

multiplicative_expression
  : cast_expression
  {
    R("multiplicative_expression : cast_expression");
    $$ = $1;
  }
  | multiplicative_expression '*' cast_expression
  {
    R("multiplicative_expression : " +
      "multiplicative_expression '*' cast_expression");
    $$ = new playground.c.lib.Node("multiply", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  | multiplicative_expression '/' cast_expression
  {
    R("multiplicative_expression : " +
      "multiplicative_expression '/' cast_expression");
    $$ = new playground.c.lib.Node("divide", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  | multiplicative_expression '%' cast_expression
  {
    R("multiplicative_expression : " +
      "multiplicative_expression '%' cast_expression");
    $$ = new playground.c.lib.Node("mod", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  ;

additive_expression
  : multiplicative_expression
  {
    R("additive_expression : multiplicative_expression");
    $$ = $1;
  }
  | additive_expression '+' multiplicative_expression
  {
    R("additive_expression : " +
      "additive_expression '+' multiplicative_expression");
    $$ = new playground.c.lib.Node("add", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  | additive_expression '-' multiplicative_expression
  {
    R("additive_expression : " +
      "additive_expression '-' multiplicative_expression");
    $$ = new playground.c.lib.Node("subtract", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  ;

shift_expression
  : additive_expression
  {
    R("shift_expression : additive_expression");
    $$ = $1;
  }
  | shift_expression LEFT_OP additive_expression
  {
    R("shift_expression : shift_expression LEFT_OP additive_expression");
    $$ = new playground.c.lib.Node("left-shift", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  | shift_expression RIGHT_OP additive_expression
  {
    R("shift_expression : shift_expression RIGHT_OP additive_expression");
    $$ = new playground.c.lib.Node("right-shift", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  ;

relational_expression
  : shift_expression
  {
    R("relational_expression : shift_expression");
    $$ = $1;
  }
  | relational_expression '<' shift_expression
  {
    R("relational_expression : relational_expression '<' shift_expression");
    $$ = new playground.c.lib.Node("less-than", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  | relational_expression '>' shift_expression
  {
    R("relational_expression : relational_expression '>' shift_expression");
    $$ = new playground.c.lib.Node("greater-than", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  | relational_expression LE_OP shift_expression
  {
    R("relational_expression : relational_expression LE_OP shift_expression");
    $$ = new playground.c.lib.Node("less-equal", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  | relational_expression GE_OP shift_expression
  {
    R("relational_expression : relational_expression GE_OP shift_expression");
    $$ = new playground.c.lib.Node("greater-equal", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  ;

equality_expression
  : relational_expression
  {
    R("equality_expression : relational_expression");
    $$ = $1;
  }
  | equality_expression EQ_OP relational_expression
  {
    R("equality_expression : equality_expression EQ_OP relational_expression");
    $$ = new playground.c.lib.Node("equal", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  | equality_expression NE_OP relational_expression
  {
    R("equality_expression : equality_expression NE_OP relational_expression");
    $$ = new playground.c.lib.Node("not-equal", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  ;

and_expression
  : equality_expression
  {
    R("and_expression : equality_expression");
    $$ = $1;
  }
  | and_expression '&' equality_expression
  {
    R("and_expression : and_expression '&' equality_expression");
    $$ = new playground.c.lib.Node("bit-and", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  ;

exclusive_or_expression
  : and_expression
  {
    R("exclusive_or_expression : and_expression");
    $$ = $1;
  }
  | exclusive_or_expression '^' and_expression
  {
    R("exclusive_or_expression : exclusive_or_expression '^' and_expression");
    $$ = new playground.c.lib.Node("exclusive-or", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  ;

inclusive_or_expression
  : exclusive_or_expression
  {
    R("inclusive_or_expression : exclusive_or_expression");
    $$ = $1;
  }
  | inclusive_or_expression '|' exclusive_or_expression
  {
    R("inclusive_or_expression : " +
      "inclusive_or_expression '|' exclusive_or_expression");
    $$ = new playground.c.lib.Node("bit-or", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  ;

logical_and_expression
  : inclusive_or_expression
  {
    R("logical_and_expression : inclusive_or_expression");
    $$ = $1;
  }
  | logical_and_expression AND_OP inclusive_or_expression
  {
    R("logical_and_expression : logical_and_expression AND_OP inclusive_or_expression");
    $$ = new playground.c.lib.Node("and", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  ;

logical_or_expression
  : logical_and_expression
  {
    R("logical_or_expression : logical_and_expression");
    $$ = $1;
  }
  | logical_or_expression OR_OP logical_and_expression
  {
    R("logical_or_expression : " +
      "logical_or_expression OR_OP logical_and_expression");
    $$ = new playground.c.lib.Node("or", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  ;

conditional_expression
  : logical_or_expression
  {
    R("conditional_expression : logical_or_expression");
    $$ = $1;
  }
  | logical_or_expression '?' expression ':' conditional_expression
  {
    R("conditional_expression : " +
      "logical_or_expression '?' expression ':' conditional_expression");
    $$ = new playground.c.lib.Node("trinary", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
    $$.children.push($5);
  }
  ;

assignment_expression
  : conditional_expression
  {
    R("assignment_expression : conditional_expression");
    $$ = $1;
  }
  | unary_expression assignment_operator assignment_expression
  {
    R("assignment_expression : " +
      "unary_expression assignment_operator assignment_expression");
    $$ = $2;
    $$.children.push($1);
    $$.children.push($3);
  }
  ;

assignment_operator
  : '='
  {
    R("assignment_operator : '='");
    $$ = new playground.c.lib.Node("assign", yytext, yylineno);
  }
  | MUL_ASSIGN
  {
    R("assignment_operator : MUL_ASSIGN");
    $$ = new playground.c.lib.Node("multiply-assign", yytext, yylineno);
  }
  | DIV_ASSIGN
  {
    R("assignment_operator : DIV_ASSIGN");
    $$ = new playground.c.lib.Node("divide-assign", yytext, yylineno);
  }
  | MOD_ASSIGN
  {
    R("assignment_operator : MOD_ASSIGN");
    $$ = new playground.c.lib.Node("mod-assign", yytext, yylineno);
  }
  | ADD_ASSIGN
  {
    R("assignment_operator : ADD_ASSIGN");
    $$ = new playground.c.lib.Node("add-assign", yytext, yylineno);
  }
  | SUB_ASSIGN
  {
    R("assignment_operator : SUB_ASSIGN");
    $$ = new playground.c.lib.Node("subtract-assign", yytext, yylineno);
  }
  | LEFT_ASSIGN
  {
    R("assignment_operator : LEFT_ASSIGN");
    $$ = new playground.c.lib.Node("left-shift-assign", yytext, yylineno);
  }
  | RIGHT_ASSIGN
  {
    R("assignment_operator : RIGHT_ASSIGN");
    $$ = new playground.c.lib.Node("right-shift-assign", yytext, yylineno);
  }
  | AND_ASSIGN
  {
    R("assignment_operator : AND_ASSIGN");
    $$ = new playground.c.lib.Node("bit-and-assign", yytext, yylineno);
  }
  | XOR_ASSIGN
  {
    R("assignment_operator : XOR_ASSIGN");
    $$ = new playground.c.lib.Node("xor-assign", yytext, yylineno);
  }
  | OR_ASSIGN
  {
    R("assignment_operator : OR_ASSIGN");
    $$ = new playground.c.lib.Node("bit-or-assign", yytext, yylineno);
  }
  ;

expression
  : assignment_expression
  {
    R("expression : assignment_expression");
    $$ = $1;
  }
  | expression ',' assignment_expression
  {
    R("expression : expression ',' assignment_expression");
    $$ = new playground.c.lib.Node("expression", yytext, yylineno);
    $$.children.push($3);
  }
  ;

constant_expression
  : conditional_expression
  {
    R("constant_expression : conditional_expression");
    $$ = $1;
  }
  ;

declaration
  : declaration_specifiers ';'
  {
    R("declaration : declaration_specifiers ';'");

    var             type;
    var             initDeclaratorList;

    // If we were in the typedef start condition, revert to the initial
    // condition.
    lexer.begin("INITIAL");

    $$ = new playground.c.lib.Node("declaration", yytext, yylineno);
    $$.children.push($1);
  }
  | declaration_specifiers init_declarator_list ';'
  {
    R("declaration : declaration_specifiers init_declarator_list ';'");

    // If we were in the typedef start condition, revert to the initial
    // condition.
    lexer.begin("INITIAL");

    $$ = new playground.c.lib.Node("declaration", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($2);
  }
  ;

declaration_specifiers
  : storage_class_specifier
  {
    R("declaration_specifiers : storage_class_specifier");
    $$ = new playground.c.lib.Node("declaration_specifiers", yytext, yylineno);
    $$.children.unshift($1);
  }
  | storage_class_specifier declaration_specifiers
  {
    R("declaration_specifiers : " +
      "storage_class_specifier declaration_specifiers");
    $$ = $2;
    $$.children.unshift($1);
  }
  | type_specifier
  {
    R("declaration_specifiers : type_specifier");
    $$ = new playground.c.lib.Node("declaration_specifiers", yytext, yylineno);
    $$.children.unshift($1);
  }
  | type_specifier declaration_specifiers
  {
    R("declaration_specifiers : type_specifier declaration_specifiers");
    $$ = $2;
    $$.children.unshift($1);
  }
  | type_qualifier
  {
    R("declaration_specifiers : type_qualifier");
    $$ = new playground.c.lib.Node("declaration_specifiers", yytext, yylineno);
    $$.children.unshift($1);
  }
  | type_qualifier declaration_specifiers
  {
    R("declaration_specifiers : type_qualifier declaration_specifiers");
    $$ = $2;
    $$.children.unshift($1);
  }
  ;

init_declarator_list
  : init_declarator
  {
    R("init_declarator_list : init_declarator");
    $$ = new playground.c.lib.Node("init_declarator_list", yytext, yylineno);
    $$.children.push($1);
  }
  | init_declarator_list ',' init_declarator
  {
    R("init_declarator_list : init_declarator_list ',' init_declarator");
    $$ = $1;
    $$.children.push($3);
  }
  ;

init_declarator
  : declarator
  {
    R("init_declarator : declarator");
    $$ = new playground.c.lib.Node("init_declarator", yytext, yylineno);
    $$.children.push($1);
    $$.children.push(null);     // no initializer
  }
  | declarator '=' initializer
  {
    R("init_declarator : declarator '=' initializer");
    $$ = new playground.c.lib.Node("init_declarator", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  ;

storage_class_specifier
  : TYPEDEF
  {
    R("storage_class_specifier : TYPEDEF");
    lexer.begin("typedef_mode");
    $$ = new playground.c.lib.Node("typedef", yytext, yylineno);
  }
  | EXTERN
  {
    R("storage_class_specifier : EXTERN");
    $$ = new playground.c.lib.Node("extern", yytext, yylineno);
  }
  | STATIC
  {
    R("storage_class_specifier : STATIC");
    $$ = new playground.c.lib.Node("static", yytext, yylineno);
  }
  | AUTO
  {
    R("storage_class_specifier : AUTO");
    $$ = new playground.c.lib.Node("auto", yytext, yylineno);
  }
  | REGISTER
  {
    R("storage_class_specifier : REGISTER");
    $$ = new playground.c.lib.Node("register", yytext, yylineno);
  }
  ;

type_specifier
  : VOID
  {
    R("type_specifier : VOID");
    $$ = new playground.c.lib.Node("void", yytext, yylineno);
  }
  | CHAR
  {
    R("type_specifier : CHAR");
    $$ = new playground.c.lib.Node("char", yytext, yylineno);
  }
  | SHORT
  {
    R("type_specifier : SHORT");
    $$ = new playground.c.lib.Node("short", yytext, yylineno);
  }
  | INT
  {
    R("type_specifier : INT");
    $$ = new playground.c.lib.Node("int", yytext, yylineno);
  }
  | LONG
  {
    R("type_specifier : LONG");
    $$ = new playground.c.lib.Node("long", yytext, yylineno);
  }
  | FLOAT
  {
    R("type_specifier : FLOAT");
    $$ = new playground.c.lib.Node("float", yytext, yylineno);
  }
  | DOUBLE
  {
    R("type_specifier : DOUBLE");
    $$ = new playground.c.lib.Node("double", yytext, yylineno);
  }
  | SIGNED
  {
    R("type_specifier : SIGNED");
    $$ = new playground.c.lib.Node("signed", yytext, yylineno);
  }
  | UNSIGNED
  {
    R("type_specifier : UNSIGNED");
    $$ = new playground.c.lib.Node("unsigned", yytext, yylineno);
  }
  | struct_or_union_specifier
  {
    R("type_specifier : struct_or_union_specifier");
    $$ = $1;
  }
  | enum_specifier
  {
    R("type_specifier : enum_specifier");
    $$ = $1;
  }
  | type_name_token
  {
    R("type_specifier : type_name_token");
    $$ = $1;
  }
  ;

struct_or_union_specifier
  : struct_or_union identifier lbrace struct_declaration_list rbrace
  {
    R("struct_or_union_specifier : " +
      "struct_or_union identifier lbrace struct_declaration_list rbrace");
    $$ = $1;
    $$.children.push($4);

    // Munge the name of the struct
    $2.value = "struct#" + $2.value;

    $$.children.push($2);

    // Add a symbol table entry for this struct (a type)
    playground.c.lib.Symtab.getCurrent().add($2.value, yylineno, true);
  }
  | struct_or_union lbrace struct_declaration_list rbrace
  {
    R("struct_or_union_specifier : " +
      "struct_or_union lbrace struct_declaration_list rbrace");
    $$ = $1;
    $$.children.push($3);
    $$.children.push(null);     // no identifier

    // Add a symbol table entry for this struct (a type)
    playground.c.lib.Symtab.getCurrent().add(
      "struct#" + playground.c.lib.Symtab.getUniqueId(), yylineno, true);
  }
  | struct_or_union identifier
  {
    R("struct_or_union_specifier : struct_or_union identifier");
    $$ = $1;
    $$.children.push(null);     // no declaration list

    // Munge the name of the struct
    $2.value = "struct#" + $2.value;

    $$.children.push($2);

    // Add a symbol table entry for this struct (a type)
    playground.c.lib.Symtab.getCurrent().add($2.value, yylineno, true);
  }
  ;

struct_or_union
  : STRUCT
  {
    R("struct_or_union : STRUCT");
    $$ = new playground.c.lib.Node("struct", yytext, yylineno);
  }
  | UNION
  {
    R("struct_or_union : UNION");
    $$ = new playground.c.lib.Node("union", yytext, yylineno);
  }
  ;

struct_declaration_list
  : struct_declaration
  {
    R("struct_declaration_list : struct_declaration");
    $$ = new playground.c.lib.Node("struct_declaration_list", yytext, yylineno);
    $$.children.push($1);
  }
  | struct_declaration_list struct_declaration
  {
    R("struct_declaration_list : struct_declaration_list struct_declaration");
    $$ = $1;
    $$.children.push($2);
  }
  ;

struct_declaration
  : specifier_qualifier_list struct_declarator_list ';'
  {
    R("struct_declaration : " +
      "specifier_qualifier_list struct_declarator_list ';'");
    $$ = new playground.c.lib.Node("struct_declaration", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($2);
  }
  ;

specifier_qualifier_list
  : type_specifier specifier_qualifier_list
  {
    R("specifier_qualifier_list : type_specifier specifier_qualifier_list");
    $$ = $2;
    $$.children.unshift($1);
  }
  | type_specifier
  {
    R("specifier_qualifier_list : type_specifier");
    $$ =
      new playground.c.lib.Node("specifier_qualifier_list", yytext, yylineno);
    $$.children.unshift($1);
  }
  | type_qualifier specifier_qualifier_list
  {
    R("specifier_qualifier_list : type_qualifier specifier_qualifier_list");
    $$ = $2;
    $$.children.unshift($1);
  }
  | type_qualifier
  {
    R("specifier_qualifier_list : type_qualifier");
    $$ =
      new layground.c.lib.Node("specifier_qualifier_list", yytext, yylineno);
    $$.children.unshift($1);
  }
  ;

struct_declarator_list
  : struct_declarator
  {
    R("struct_declarator_list : struct_declarator");
    $$ = new playground.c.lib.Node("struct_declarator_list", yytext, yylineno);
    $$.children.push($1);
  }
  | struct_declarator_list ',' struct_declarator
  {
    R("struct_declarator_list : struct_declarator_list ',' struct_declarator");
    $$ = $1;
    $$.children.push($3);
  }
  ;

struct_declarator
  : declarator
  {
    R("struct_declarator : declarator");
    $$ = new playground.c.lib.Node("struct_declarator", yytext, yylineno);
    $$.children.push($1);
  }
  | ':' constant_expression
  {
    R("struct_declarator : ':' constant_expression");
    $$ = new playground.c.lib.Node("struct_declarator", yytext, yylineno);
    $$.children.push(null);     // no declarator
    $$.children.push($2);
  }
  | declarator ':' constant_expression
  {
    R("struct_declarator : declarator ':' constant_expression");
    $$ = new playground.c.lib.Node("struct_declarator", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  ;

enum_specifier
  : ENUM lbrace enumerator_list rbrace
  {
    R("enum_specifier : ENUM lbrace enumerator_list rbrace");
    $$ = new playground.c.lib.Node("enum_specifier", yytext, yylineno);
    $$.children.push($3);
    $$.children.push(null);     // no identifier
  }
  | ENUM identifier lbrace enumerator_list rbrace
  {
    R("enum_specifier : ENUM identifier lbrace enumerator_list rbrace");
    $$ = new playground.c.lib.Node("enum_specifier", yytext, yylineno);
    $$.children.push($4);
    $$.children.push($2);
  }
  | ENUM identifier
  {
    R("enum_specifier : ENUM identifier");
    $$ = new playground.c.lib.Node("enum_specifier", yytext, yylineno);
    $$.children.push(null);     // no enumerator list
    $$.children.push($2);
  }
  ;

enumerator_list
  : enumerator
  {
    R("enumerator_list : enumerator");
    $$ = new playground.c.lib.Node("enumerator_list", yytext, yylineno);
    $$.children.push($1);
  }
  | enumerator_list ',' enumerator
  {
    R("enumerator_list : enumerator_list ',' enumerator");
    $$ = $1;
    $$.children.push($3);
  }
  ;

enumerator
  : identifier
  {
    R("enumerator : identifier");
    $$ = $1;
  }
  | identifier '=' constant_expression
  {
    R("enumerator : identifier '=' constant_expression");
    $$ = $1;
    $$.children.push($3);
  }
  ;

type_qualifier
  : CONST
  {
    R("type_qualifier : CONST");
    $$ = new playground.c.lib.Node("const", yytext, yylineno);
  }
  | VOLATILE
  {
    R("type_qualifier : VOLATILE");
    $$ = new playground.c.lib.Node("volatile", yytext, yylineno);
  }
  ;

declarator
  : pointer direct_declarator
  {
    R("declarator : pointer direct_declarator");
    $$ = new playground.c.lib.Node("declarator", yytext, yylineno);
    $$.children.push($2);
    $$.children.push($1);
  }
  | direct_declarator
  {
    R("declarator : direct_declarator");
    $$ = new playground.c.lib.Node("declarator", yytext, yylineno);
    $$.children.push($1);
    $$.children.push(null);
  }
  ;

direct_declarator
  : identifier
  {
    R("direct_declarator : identifier");
    $$ = $1;
  }
  | '(' declarator ')'
  {
    R("direct_declarator : '(' declarator ')'");
    $$ = $2;
  }
  | direct_declarator '[' constant_expression ']'
  {
    R("direct_declarator : direct_declarator '[' constant_expression ']'");

    var             array_decl;

    $$ = $1;
    array_decl = new playground.c.lib.Node("array_decl", yytext, yylineno);
    array_decl.children.push($3);
    $$.children.push(array_decl);
  }
  | direct_declarator '[' ']'
  {
    R("direct_declarator : direct_declarator '[' ']'");

    var             array_decl;

    $$ = $1;
    array_decl = new playground.c.lib.Node("array_decl", yytext, yylineno);
    $$.children.push(array_decl);
  }
  | direct_declarator function_scope '(' parameter_type_list ')'
  {
    R("direct_declarator : " +
      "direct_declarator '(' parameter_type_list ')'");
    
    $$ = new playground.c.lib.Node("function_decl", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($4);
    $$.children.push(null);     // no identifier_list
  }
  | direct_declarator function_scope '(' identifier_list ')'
  {
    R("direct_declarator : " +
      "direct_declarator '(' identifier_list ')'");

    $$ = new playground.c.lib.Node("function_decl", yytext, yylineno);
    $$.children.push($1);
    $$.children.push(null);     // no parameter_type_list
    $$.children.push($4);
  }
  | direct_declarator function_scope '(' ')'
  {
    R("direct_declarator : direct_declarator '(' ')'");
    
    $$ = new playground.c.lib.Node("function_decl", yytext, yylineno);
    $$.children.push($1);
    $$.children.push(null);     // no parameter_type_list
    $$.children.push(null);     // no identifier_list
  }
  ;

pointer
  : '*'
  {
    R("pointer : '*'");
    $$ = new playground.c.lib.Node("pointer", yytext, yylineno);
  }
  | '*' type_qualifier_list
  {
    R("pointer : '*' type_qualifier_list");
    $$ = new playground.c.lib.Node("pointer", yytext, yylineno);
    $$.children.push($2);
  }
  | '*' pointer
  {
    R("pointer : '*' pointer");
    $$ = new playground.c.lib.Node("pointer", yytext, yylineno);
    $$.children.push($2);
  }
  | '*' type_qualifier_list pointer
  {
    R("pointer : '*' type_qualifier_list pointer");
    $$ = new playground.c.lib.Node("pointer", yytext, yylineno);
    $$.children.push($2);
    $$.children.push($3);
  }
  ;

type_qualifier_list
  : type_qualifier
  {
    R("type_qualifier_list : type_qualifier");
    $$ = new playground.c.lib.Node("type_qualifier_list", yytext, yylineno);
    $$.children.push($1);
  }
  | type_qualifier_list type_qualifier
  {
    R("type_qualifier_list : type_qualifier_list type_qualifier");
    $$ = $1;
    $$.children.push($2);
  }
  ;


parameter_type_list
  : parameter_list
  {
    R("parameter_type_list : parameter_list");
    $$ = $1;
  }
  | parameter_list ',' ellipsis
  {
    R("parameter_type_list : parameter_list ',' ellipsis");
    $$ = $1;
    $$.children.push($3);
  }
  ;

parameter_list
  : parameter_declaration
  {
    R("parameter_list : parameter_declaration");
    $$ = new playground.c.lib.Node("parameter_list", yytext, yylineno);
    $$.children.push($1);
  }
  | parameter_list ',' parameter_declaration
  {
    R("parameter_list : parameter_list ',' parameter_declaration");
    $$ = $1;
    $$.children.push($3);
  }
  ;

parameter_declaration
  : declaration_specifiers declarator
  {
    R("parameter_declaration : declaration_specifiers declarator");
    $$ = new playground.c.lib.Node("parameter_declaration", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($2);
    $$.children.push(null);     // no abstract declarator
  }
  | declaration_specifiers abstract_declarator
  {
    R("parameter_declaration : declaration_specifiers abstract_declarator");
    $$ = new playground.c.lib.Node("parameter_declaration", yytext, yylineno);
    $$.children.push($1);
    $$.children.push(null);     // no declarator
    $$.children.push($2);
  }
  | declaration_specifiers
  {
    R("parameter_declaration : declaration_specifiers");
    $$ = new playground.c.lib.Node("parameter_declaration", yytext, yylineno);
    $$.children.push($1);
    $$.children.push(null);     // no declarator
    $$.children.push(null);     // no abstract declarator
  }
  ;

identifier_list
  : identifier
  {
    R("identifier_list : identifier");
    $$ = new playground.c.lib.Node("identifier_list", yytext, yylineno);
    $$.children.push($1);
  }
  | identifier_list ',' identifier
  {
    R("identifier_list : identifier_list ',' identifier");
    $$ = $1;
    $$.children.push($3);
  }
  ;

type_name
  : specifier_qualifier_list
  {
    R("type_name : specifier_qualifier_list");
    $$ = new playground.c.lib.Node("type_name", yytext, yylineno);
    $$.children.push($1);
  }
  | specifier_qualifier_list abstract_declarator
  {
    R("type_name : specifier_qualifier_list abstract_declarator");
    $$ = new playground.c.lib.Node("type_name", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($2);
  }
  ;

abstract_declarator
  : pointer
  {
    R("abstract_declarator : pointer");
    $$ = new playground.c.lib.Node("abstract_declarator", yytext, yylineno);
    $$.children.push($1);
  }
  | direct_abstract_declarator
  {
    R("abstract_declarator : direct_abstract_declarator");
    $$ = new playground.c.lib.Node("abstract_declarator", yytext, yylineno);
    $$.children.push(null);     // no pointer
    $$.children.push($1);
  }
  | pointer direct_abstract_declarator
  {
    R("abstract_declarator : pointer direct_abstract_declarator");
    $$ = new playground.c.lib.Node("abstract_declarator", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($2);
  }
  ;

direct_abstract_declarator
  : '(' abstract_declarator ')'
  {
    R("direct_abstract_declarator : '(' abstract_declarator ')'");
    $$ =
      new playground.c.lib.Node("direct_abstract_declarator", yytext, yylineno);
    $$.children.push($2);
  }
  | '[' ']'
  {
    R("direct_abstract_declarator : '[' ']'");
    
    var             array_decl;

    $$ =
      new playground.c.lib.Node("direct_abstract_declarator", yytext, yylineno);
    array_decl = new playground.c.lib.Node("array_decl", yytext, yylineno);
    $$.children.push(array_decl);
  }
  | '[' constant_expression ']'
  {
    R("direct_abstract_declarator : '[' constant_expression ']'");
    
    var             array_decl;

    $$ =
      new playground.c.lib.Node("direct_abstract_declarator", yytext, yylineno);
    array_decl = new playground.c.lib.Node("array_decl", yytext, yylineno);
    array_decl.children.push($2);
    $$.children.push(array_decl);
  }
  | direct_abstract_declarator '[' ']'
  {
    R("direct_abstract_declarator : direct_abstract_declarator '[' ']'");
    
    var             array_decl;
    var             child;

    $$ = $1;
    child =
      new playground.c.lib.Node("direct_abstract_declarator", yytext, yylineno);
    array_decl = new playground.c.lib.Node("array_decl", yytext, yylineno);
    child.children.push(array_decl);
    $$.children.push(child);
  }
  | direct_abstract_declarator '[' constant_expression ']'
  {
    R("direct_abstract_declarator : " +
      "direct_abstract_declarator '[' constant_expression ']'");
    
    var             array_decl;
    var             child;

    $$ = $1;
    child =
      new playground.c.lib.Node("direct_abstract_declarator", yytext, yylineno);
    array_decl = new playground.c.lib.Node("array_decl", yytext, yylineno);
    array_decl.children.push($3);
    child.children.push(array_decl);
    $$.children.push(child);
  }
  | '(' ')'
  {
    R("direct_abstract_declarator : '(' ')'");
    $$ =
      new playground.c.lib.Node("direct_abstract_declarator", yytext, yylineno);
  }
  | '(' parameter_type_list ')'
  {
    R("direct_abstract_declarator : '(' parameter_type_list ')'");
    $$ =
      new playground.c.lib.Node("direct_abstract_declarator", yytext, yylineno);
    $$.children.push($2);
  }
  | direct_abstract_declarator '(' ')'
  {
    R("direct_abstract_declarator : direct_abstract_declarator '(' ')'");
    
    var             child;

    $$ = $1;
    child =
      new playground.c.lib.Node("direct_abstract_declarator", yytext, yylineno);
    $$.children.push(child);
  }
  | direct_abstract_declarator '(' parameter_type_list ')'
  {
    R("direct_abstract_declarator : " +
      "direct_abstract_declarator '(' parameter_type_list ')'");
    
    var             child;

    $$ = $1;
    child =
      new playground.c.lib.Node("direct_abstract_declarator", yytext, yylineno);
    child.children.push($2);
    $$.children.push(child);
  }
  ;

initializer
  : assignment_expression
  {
    R("initializer : assignment_expression");
    $$ = $1;
  }
  | lbrace initializer_list rbrace
  {
    R("initializer : lbrace initializer_list rbrace");
    $$ = $2;
  }
  | lbrace initializer_list ',' rbrace
  {
    R("initializer : lbrace initializer_list ',' rbrace");
    $$ = $2;
  }
  ;

initializer_list
  : initializer
  {
    R("initializer_list : initializer");
    $$ = new playground.c.lib.Node("initializer_list", yytext, yylineno);
    $$.children.push($1);
  }
  | initializer_list ',' initializer
  {
    R("initializer_list : initializer_list ',' initializer");
    $$ = $1;
    $$.children.push($3);
  }
  ;

statement
  : labeled_statement
  {
    R("statement : labeled_statement");
    $$ = $1;
  }
  | compound_statement
  {
    R("statement : compound_statement");
    $$ = $1;
  }
  | expression_statement
  {
    R("statement : expression_statement");
    $$ = $1;
  }
  | selection_statement
  {
    R("statement : selection_statement");
    $$ = $1;
  }
  | iteration_statement
  {
    R("statement : iteration_statement");
    $$ = $1;
  }
  | jump_statement
  {
    R("statement : jump_statement");
    $$ = $1;
  }
  | error
  {
    R("statement : error");
  }
  ;

labeled_statement
  : identifier ':' statement
  {
    R("labeled_statement : identifier ':' statement");
    $$ = new playground.c.lib.Node("label", yytext, yylineno);
    $$.children.push($1);
    $$.children.push($3);
  }
  | CASE constant_expression ':' statement
  {
    R("labeled_statement : CASE constant_expression ':' statement");
    $$ = new playground.c.lib.Node("case", yytext, yylineno);
    $$.children.push($2);
    $$.children.push($4);
  }
  | DEFAULT ':' statement
  {
    R("labeled_statement : DEFAULT ':' statement");
    $$ = new playground.c.lib.Node("default", yytext, yylineno);
    $$.children.push($3);
  }
  ;

compound_statement
  : lbrace_scope rbrace_scope
  {
    R("compound_statement : lbrace_scope rbrace_scope");
    $$ = new playground.c.lib.Node("compound_statement", yytext, yylineno);
  }
  | lbrace_scope statement_list rbrace_scope
  {
    R("compound_statement : lbrace_scope statement_list rbrace_scope");
    $$ = new playground.c.lib.Node("compound_statement", yytext, yylineno);
    $$.children.push(null);     // no declaration_list
    $$.children.push($2);
  }
  | lbrace_scope declaration_list rbrace_scope
  {
    R("compound_statement : lbrace_scope declaration_list rbrace_scope");
    $$ = new playground.c.lib.Node("compound_statement", yytext, yylineno);
    $$.children.push($2);
    $$.children.push(null);     // no statement list
  }
  | lbrace_scope declaration_list statement_list rbrace_scope
  {
    R("compound_statement : lbrace_scope declaration_list statement_list rbrace_scope");
    $$ = new playground.c.lib.Node("compound_statement", yytext, yylineno);
    $$.children.push($2);
    $$.children.push($3);
  }
  ;

declaration_list
  : declaration
  {
    R("declaration_list : declaration");
    $$ = new playground.c.lib.Node("declaration_list", yytext, yylineno);
    $$.children.push($1);
  }
  | declaration_list declaration
  {
    R("declaration_list : declaration_list declaration");
    $$ = $1;
    $$.children.push($2);
  }
  ;

statement_list
  : statement
  {
    R("statement_list : statement");
    $$ = new playground.c.lib.Node("statement_list", yytext, yylineno);
    $$.children.push($1);
  }
  | statement_list statement
  {
    R("statement_list : statement_list statement");
    $$ = $1;
    $$.children.push($2);
  }
  ;

expression_statement
  : ';'
  {
    R("expression_statement : ';'");
    $$ = new playground.c.lib.Node("expression", yytext, yylineno);
  }
  | expression ';'
  {
    R("expression_statement : expression ';'");
    $$ = $1;
  }
  ;

selection_statement
  : IF '(' expression ')' statement %prec IF_WITHOUT_ELSE
  {
    R("selection_statement : IF '(' expression ')' statement");
    $$ = new playground.c.lib.Node("if", yytext, yylineno);
    $$.children.push($3);
    $$.children.push($5);
  }
  | IF '(' expression ')' statement ELSE statement
  {
    R("selection_statement : IF '(' expression ')' statement ELSE statement");
    $$ = new playground.c.lib.Node("if", yytext, yylineno);
    $$.children.push($3);
    $$.children.push($5);
    $$.children.push($7);
  }
  | SWITCH '(' expression ')' statement
  {
    R("selection_statement : SWITCH '(' expression ')' statement");
    $$ = new playground.c.lib.Node("switch", yytext, yylineno);
    $$.children.push($3);
    $$.children.push($5);
  }
  ;

iteration_statement
  : WHILE '(' expression ')' statement
  {
    R("iteration_statement : WHILE '(' expression ')' statement");
    $$ = new playground.c.lib.Node("for", yytext, yylineno);
    $$.children.push(null);     // initialization
    $$.children.push($3);       // while condition
    $$.children.push($5);       // statement block
    $$.children.push(null);     // after each iteration
  }
  | DO statement WHILE '(' expression ')' ';'
  {
    R("iteration_statement : DO statement WHILE '(' expression ')' ';'");
    $$ = new playground.c.lib.Node("do-while", yytext, yylineno);
    $$.children.push($2);       // statement
    $$.children.push($4);       // while condition
  }
  | FOR '(' expression_statement expression_statement ')' statement
  {
    R("iteration_statement : FOR '(' expression_statement expression_statement ')' statement");
    $$ = new playground.c.lib.Node("for", yytext, yylineno);
    $$.children.push($3);       // initialization
    $$.children.push($4);       // while condition
    $$.children.push($6);       // statement block
    $$.children.push(null);     // after each iteration
  }
  | FOR '(' expression_statement expression_statement expression ')' statement
  {
    R("iteration_statement : " +
      "FOR '(' expression_statement expression_statement expression ')' " +
      "statement");
    $$ = new playground.c.lib.Node("for", yytext, yylineno);
    $$.children.push($3);       // initialization
    $$.children.push($4);       // while condition
    $$.children.push($7);       // statement block
    $$.children.push($5);       // after each iteration
  }
  ;

jump_statement
  : GOTO identifier ';'
  {
    R("jump_statement : GOTO identifier ';'");
    $$ = new playground.c.lib.Node("goto", yytext, yylineno);
    $$.children.push($2);
  }
  | CONTINUE ';'
  {
    R("jump_statement : CONTINUE ';'");
    $$ = new playground.c.lib.Node("continue", yytext, yylineno);
  }
  | BREAK ';'
  {
    R("jump_statement : BREAK ';'");
    $$ = new playground.c.lib.Node("break", yytext, yylineno);
  }
  | RETURN ';'
  {
    R("jump_statement : RETURN ';'");
    $$ = new playground.c.lib.Node("return", yytext, yylineno);
  }
  | RETURN expression ';'
  {
    R("jump_statement : RETURN expression ';'");
    $$ = new playground.c.lib.Node("return", yytext, yylineno);
    $$.children.push($2);
  }
  ;

translation_unit
  : external_declaration
    {
      R("translation_unit : external_declaration");
      $$ = new playground.c.lib.Node("translation_unit", yytext, yylineno);
      $$.children.push($1);
    }
  | translation_unit external_declaration
    {
      R("translation_unit : translation_unit external_declaration");
      $$ = $1;
      $$.children.push($2);
    }
  ;

external_declaration
  : function_definition
  {
    R("external_declaration : function_definition");
    $$ = $1;

    // Pop the symtab created by function_scope from the stack
    playground.c.lib.Symtab.popStack();
  }
  | declaration
  {
    R("external_declaration : declaration");
    $$ = $1;
  }
  ;

function_definition
  : declaration_specifiers declarator declaration_list compound_statement
  {
    R("function_definition : " +
      "declaration_specifiers declarator declaration_list compound_statement");
    $$ = new playground.c.lib.Node("function_definition", yytext, yylineno);
    $$.children.push($1);       // declaration_specifiers
    $$.children.push($2);       // declarator
    $$.children.push($3);       // declaration_list
    $$.children.push($4);       // compound_statement
  }
  | declaration_specifiers declarator compound_statement
  {
    R("function_definition : " +
      "declaration_specifiers declarator compound_statement");
    $$ = new playground.c.lib.Node("function_definition", yytext, yylineno);
    $$.children.push($1);       // declaration_specifiers
    $$.children.push($2);       // declarator
    $$.children.push(null);     // declaration_list
    $$.children.push($3);       // compound_statement
  }
  | declarator declaration_list compound_statement
  {
    R("function_definition : declarator declaration_list compound_statement");
    $$ = new playground.c.lib.Node("function_definition", yytext, yylineno);
    $$.children.push(null);     // declaration_specifiers
    $$.children.push($1);       // declarator
    $$.children.push($2);       // declaration_list
    $$.children.push($3);       // compound_statement
  }
  | declarator compound_statement
  {
    R("function_definition : declarator compound_statement");
    $$ = new playground.c.lib.Node("function_definition", yytext, yylineno);
    $$.children.push(null);     // declaration_specifiers
    $$.children.push($1);       // declarator
    $$.children.push(null);     // declaration_list
    $$.children.push($2);       // compound_statement
  }
  ;

function_scope
  :
  {
    new playground.c.lib.Symtab(
      playground.c.lib.Symtab.getCurrent(), null, yylineno + 1);
    $$ = $1;
  }
  ;

identifier
  : IDENTIFIER
  {
    if (lexer.conditionStack[lexer.conditionStack.length - 1] == "typedef_mode")
    {
      R("identifier : TYPE_DEFINITION (" + yytext + ")");
      $$ = new playground.c.lib.Node("type_definition", yytext, yylineno);
      $$.value = yytext;
      playground.c.lib.Symtab.getCurrent().add(yytext, yylineno, true);
    }
    else
    {
      R("identifier : IDENTIFIER (" + yytext + ")");
      $$ = new playground.c.lib.Node("identifier", yytext, yylineno);
      $$.value = yytext;
    }
  }
  ;

type_name_token
  : TYPE_NAME
  {
    R("identifier : TYPE_NAME (" + yytext + ")");
    $$ = new playground.c.lib.Node("type_name", yytext, yylineno);
    $$.value = yytext;
  }
  ;

constant
  : CONSTANT_HEX
  {
    var bUnsigned;
    var bLong;

    R("constant : CONSTANT_HEX (" + yytext + ")");
    
    $$ = new playground.c.lib.Node("constant", yytext, yylineno);

    bUnsigned = yytext.toLowerCase().indexOf("u") != -1;
    bLong     = yytext.toLowerCase().indexOf("l") != -1;
    if (bUnsigned && bLong)
    {
      $$.numberType = playground.c.lib.Node.NumberType.ULong;
    }
    else if (bUnsigned)
    {
      $$.numberType = playground.c.lib.Node.NumberType.ULong;
    }
    else if (bLong)
    {
      $$.numberType = playground.c.lib.Node.NumberType.Long;
    }
    else
    {
      $$.numberType = playground.c.lib.Node.NumberType.Int;
    }

    $$.value = parseInt(yytext, 16);
  }
  | CONSTANT_OCTAL
  {
    var             bUnsigned;
    var             bLong;

    R("constant : CONSTANT_OCTAL (" + yytext + ")");
    
    $$ = new playground.c.lib.Node("constant", yytext, yylineno);

    bUnsigned = yytext.toLowerCase().indexOf("u") != -1;
    bLong     = yytext.toLowerCase().indexOf("l") != -1;
    if (bUnsigned && bLong)
    {
      $$.numberType = playground.c.lib.Node.NumberType.ULong;
    }
    else if (bUnsigned)
    {
      $$.numberType = playground.c.lib.Node.NumberType.ULong;
    }
    else if (bLong)
    {
      $$.numberType = playground.c.lib.Node.NumberType.Long;
    }
    else
    {
      $$.numberType = playground.c.lib.Node.NumberType.Int;
    }

    $$.value = parseInt(yytext, 8);
  }
  | CONSTANT_DECIMAL
  {
    var             bUnsigned;
    var             bLong;

    R("constant : CONSTANT_DECIMAL (" + yytext + ")");
    
    $$ = new playground.c.lib.Node("constant", yytext, yylineno);

    bUnsigned = yytext.toLowerCase().indexOf("u") != -1;
    bLong     = yytext.toLowerCase().indexOf("l") != -1;
    if (bUnsigned && bLong)
    {
      $$.numberType = playground.c.lib.Node.NumberType.ULong;
    }
    else if (bUnsigned)
    {
      $$.numberType = playground.c.lib.Node.NumberType.ULong;
    }
    else if (bLong)
    {
      $$.numberType = playground.c.lib.Node.NumberType.Long;
    }
    else
    {
      $$.numberType = playground.c.lib.Node.NumberType.Int;
    }

    $$.value = parseInt(yytext, 10);
  }
  | CONSTANT_CHAR
  {
    var             value;
    var             match;

    R("constant : CONSTANT_CHAR (" + yytext + ")");
    
    // We don't support long characters, at present
    if (yytext.charAt(0) == "L")
    {
      throw new Error("Line " + yylineno + ": " +
                      "Long characters (characters of the form L'x') " +
                      "are not currently supported.");
    }

    $$ = new playground.c.lib.Node("constant", yytext, yylineno);

    // If the length is exactly 3, it's a single quote, simple character, and
    // another single quote.
    if (yytext.length == 3)
    {
      value = yytext.charCodeAt(1);
    }

    // Try to match against the possible special escape sequences
    if (typeof value == "undefined")
    {
      [
        [ /^'\\a'$/,   7 ],                    // bell (alert)
        [ /^'\\b'$/,   8 ],                    // backspace
        [ /^'\\f'$/,  12 ],                    // formfeed
        [ /^'\\n'$/,  10 ],                    // newline
        [ /^'\\r'$/,  13 ],                    // carriage return
        [ /^'\\t'$/,   9 ],                    // tab
        [ /^'\\v'$/,  11 ],                    // vertical tab
        [ /^'\\''$/,  39 ],                    // single quote
        [ /^'\\"'$/,  34 ],                    // double quote
        [ /^'\\\\'$/, 92 ],                    // backslash
        [ /^'\\\?'$/, 63 ]                     // literal question mark
      ].forEach(
        function(escape)
        {
          if (typeof value != "undefined")
          {
            return;
          }
          
          if (escape[0].test(yytext))
          {
            value = escape[1];
          }
        });
    }

    // If it wasn't special, then see if it's an octal character
    if (typeof value == "undefined" &&
        (match = /'\\([0-7]{3})'/.exec(yytext)))
    {
      value = parseInt(match[1], 8);
    }

    // If it wasn't special or octal, see if it's a hex character
    if (typeof value == "undefined" &&
        (match = /'\\([0-9a-fA-F]{2})'/.exec(yytext)))
    {
      value = parseInt(match[1], 16);
    }

    // If it wasn't special or octal or hex, see if it's a long hex character
    // NOT IMPLEMENTED
    if (false &&
        typeof value == "undefined" &&
        (match = /'\\([0-9a-fA-F]{4})'/.exec(yytext)))
    {
      value = parseInt(match[1], 16);
    }

    // If it's none of those, and the length is exactly 4, (a single quote, a
    // backslash, some character, and another single quote), then convert the
    // "some character" to its ASCII value.
    if (typeof value == "undefined" &&
        yytext.length === 4)
    {
      value = yytext.charCodeAt(2);
    }

    // If we still haven't converted it, there's something wrong
    if (typeof value != "undefined")
    {
      // Save the converted value
      $$.numberType = playground.c.lib.Node.NumberType.Int;
      $$.value = value;
    }
    else
    {
      error.parseError("Unrecognized single-quoted character (" + yytext + ")",
                       { line : yylineno });
    }
  }
  | CONSTANT_FLOAT
  {
    R("constant : CONSTANT (" + yytext + ")");
    
    var             ch;

    $$ = new playground.c.lib.Node("constant", yytext, yylineno);
    $$.numberType = playground.c.lib.Node.NumberType.Float;
    $$.value = parseFloat(yytext);
    }
  }
  ;

string_literal
  : STRING_LITERAL
  {
    R("string_literal : STRING_LITERAL");
    $$ = new playground.c.lib.Node("string_literal", yytext, yylineno);
        
    // Borrowed from a patch to node-po by cdauth:
    // https://github.com/cdauth/node-po/commit/77aa531743234a07c95c04cee0222b2717d85b57
    $$.value = 
      (function extract(string)
       {
         string = string.replace(
           /\\([abtnvfr'"\\?]|([0-7]{3})|x([0-9a-fA-F]{2}))/g,
           function(match, esc, oct, hex, offset, s)
           {
             if (oct)
             {
               return String.fromCharCode(parseInt(oct, 8));
             }

             if (hex)
             {
               return String.fromCharCode(parseInt(hex, 16));
             }

             switch(esc)
             {
             case 'a':
               return '\x07';

             case 'b':
               return '\b';

             case 't': 
               return '\t';

             case 'n': 
               return '\n';

             case 'v': 
               return '\v';

             case 'f': 
               return '\f';

             case 'r': 
               return '\r';

             default: 
               return esc;
             }
           });

         return string;
       }(yytext.substr(1, yytext.length - 2)));
  }
  ;

ellipsis
  : ELLIPSIS
  {
    R("ellipsis : ELLIPSIS");
    $$ = new playground.c.lib.Node("ellipsis", yytext, yylineno);
  }
  ;

lbrace_scope
  : lbrace
  {
    R("lbrace_scope : lbrace");

    // Create a symbol table with an arbitrary (for now) name.
    new playground.c.lib.Symtab(
      playground.c.lib.Symtab.getCurrent(), null, yylineno + 1);
  }
  ;
  
rbrace_scope
  : rbrace
  {
    R("rbrace_scope : rbrace");

    // Pop this block's symbol table from the stack
    playground.c.lib.Symtab.popStack();
  }
  ;
  
lbrace
  : LBRACE
  {
    R("lbrace : LBRACE");
    $$ = new playground.c.lib.Node("lbrace", yytext, yylineno);
  }
  ;

rbrace
  : RBRACE
  {
    R("rbrace : RBRACE");
    $$ = new playground.c.lib.Node("rbrace", yytext, yylineno);;
  }
  ;

%%

if (typeof window === "undefined")
{
  require("../../playground/source/class/playground/c/lib/Symtab.js");
  require("../../playground/source/class/playground/c/lib/Node.js");
  require("../../playground/source/class/playground/c/machine/Machine.js");
  require("../../playground/source/class/playground/c/AbstractSyntaxTree.js");
}

var error =
{
  /**
   * Function called upon each error encountered during parsing
   * 
   * @param str {String}
   *   A pre-defined error string which shows where in the line the error
   *   occurred.
   * 
   * @param hash {Map}
   *   A map containing details of the error and its location.
   */
  parseError : function(str, hash)
  {
    var             sys = require("sys");

    if (true)
    {
      var errStr =
        "Parse error on line " +
        hash.line +
        ":\n" +
        parser.lexer.showPosition() +
        "\n"
        ;

      if (str)
      {
        errStr += "\t" + str;
      }

      sys.print(errStr + "\n");
    }
    else
    {
      // For debugging, this code displays all values of hash.
      sys.print(str + "\n");

      sys.print("Details:\n");
      for (var x in hash)
      {
        sys.print("  " + x + ": " + hash[x] + "\n");
      }
    }

    // Increment the number of errors encountered so far.
    ++exports.errorCount;
  },

  /** Count of errors encountered so far */
  errorCount : 0
};

// Function called upon each error encountered during parsing
parser.yy.parseError = error.parseError;

// Create the root-level symbol table
new playground.c.lib.Symtab(null, null, 0);

// Function to display rules as they are parsed
function R(rule)
{
//  console.log("rule: " + rule + "\n");
}
