"use strict";

const seymourGrammar = ohm.grammar(`

Seymour {

  Program
    = (ClassDecl | MethodDecl | Stmt)*

  Stmt
    = var varName "=" Exp ";"       -- varDecl
    | varName "=" Exp ";"           -- varAssign
    | this "." varName "=" Exp ";"  -- instVarAssign
    | return Exp ";"                -- return
    | Exp ";"                       -- exp
    | "@{" (~"}@" any)* "}@"        -- js

  ClassDecl
    = class className (extends className)? (with NonemptyListOf<varName, ",">)? ";"

  MethodDecl
    = def className "." varName "(" ListOf<varName, ","> ")" MethodBody  -- java
    | def className "(" ListOf<varName, ","> ")" MethodBody              -- call
    | def varName className (kwSelectorPart varName)+ MethodBody         -- prefixKeyword
    | def className (kwSelectorPart varName)+ MethodBody                 -- keyword
    | def className binSelector varName MethodBody                       -- binary

  MethodBody
    = "=" Exp ";"    -- exp
    | "{" Stmt* "}"  -- stmt

  Exp
    = KWSendExp

  KWSendExp
    = varName EqExp (kwSelectorPart EqExp)+  -- prefixKeyword
    | EqExp (kwSelectorPart EqExp)+          -- keyword
    | super (kwSelectorPart EqExp)+          -- super
    | EqExp

  EqExp
    = RelExp ("==" | "!=") RelExp  -- eq
    | RelExp

  RelExp
    = AddExp ("<=" | "<" | ">=" | ">") AddExp  -- rel
    | AddExp

  AddExp
    = AddExp ("+" | "-") MulExp  -- add
    | MulExp

  MulExp
    = MulExp ("*" | "/" | "%") DotExp  -- mul
    | DotExp

  DotExp
    = DotExp "(" Actuals ")"              -- call
    | DotExp "." varName "(" Actuals ")"  -- send
    | super "." varName "(" Actuals ")"   -- superSend
    | this "." varName ~"("               -- instVarAccess
    | UnExp

  UnExp
    = "-" PriExp  -- neg
    | PriExp

  PriExp
    = "(" Exp ")"                        -- paren
    | "{" BlockArgNames? Stmt* Exp? "}"  -- block
    | "[" ListOf<Exp, ","> "]"           -- array
    | new UnExp "(" Actuals ")"          -- new
    | string                             -- str
    | varName                            -- var
    | className                          -- class
    | number                             -- number
    | this                               -- this
    | true                               -- true
    | false                              -- false
    | null                               -- null

  BlockArgNames
    = ListOf<varName, ","> "|"

  Actuals
    = ListOf<Exp, ",">

  // Lexical rules

  varName  (a variable name)
    = ~keyword lower alnum*

  className  (a class name)
    = upper alnum*

  kwSelectorPart
    = varName ":"

  string  (a string)
    = "\\"" (~"\\"" ~"\\n" any)* "\\""

  number  (a number)
    = digit* "." digit+  -- fract
    | digit+             -- whole

  binSelector  (a binary selector)
    = "==" | "!=" | "<=" | "<" | ">=" | ">" | "+"  | "-"  | "*"  | "/" | "%" | "@"

  class = "class" ~alnum
  def = "def" ~alnum
  extends = "extends" ~alnum
  false = "false" ~alnum
  new = "new" ~alnum
  with = "with" ~alnum
  owner = "owner" ~alnum
  null = "null" ~alnum
  return = "return" ~alnum
  super = "super" ~alnum
  this = "this" ~alnum
  true = "true" ~alnum
  var = "var" ~alnum

  keyword
    = class | def | extends | false | new | with | owner | null | return | super | this | true | var

  space
   += comment

  comment
    = "/*" (~"*/" any)* "*/"   -- multiLine
    | "//" (~"\\n" any)*       -- singleLine

  // Lexical rules for syntax highlighting (admittedly hacky!)

  tokens
    = token*

  token
    = comment | kwSelectorPrefix | kwSelectorPart | valueToken | keyword | instVarAccess
    | javaStyleSelector | binSelector | any

  valueToken
    = this | null | true | false | varName | className | string | number

  instVarAccess
    = "." spaces varName ~(spaces "(")

  javaStyleSelector
    = "." spaces varName &(spaces "(")

  kwSelectorPrefix
    = varName &(space+ expStart)

  expStart
    = valueToken | "(" | "{"

}

`);
