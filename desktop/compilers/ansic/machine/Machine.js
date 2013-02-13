/**
 * The virtual machine, and facilities for executing instructions thereon
 *
 * Copyright (c) 2013 Derrell Lipman
 * 
 * License:
 *   GPL Version 2: http://www.gnu.org/licenses/gpl-2.0.html 
 */

var qx = require("qooxdoo");
var sys = require("sys");
require("./Memory");
require("./Instruction");

var mem = learncs.machine.Memory.getInstance();
var Memory = learncs.machine.Memory;
var Instruction = learncs.machine.Instruction;


qx.Class.define("learncs.machine.Machine",
{
  type      : "singleton",
  extend    : qx.core.Object,

  construct : function()
  {
    this.base(arguments);

    // Initialize the machine
    this.initAll();
  },
  
  members :
  {
    initAll : function()
    {
      // Initialize the registers
      mem.setReg("PC", 
                 "unsigned int",
                 0);
      mem.setReg("SP", 
                 "unsigned int",
                 Memory.info.rts.start + Memory.info.rts.length);
      mem.setReg("ESP", 
                 "unsigned int",
                 Memory.info.es.start + Memory.info.es.length);
      mem.setReg("FP", 
                 "unsigned int",
                 Memory.info.rts.start);
console.log("Machine.initAll: set FP to " + mem.getReg("FP", "unsigned int"));
    },

    /**
     * Execute a program in virtual memory.
     * 
     * @param pc {Number}
     *   The initial program counter value, i.e., the instruction address at
     *   which to begin the program.
     */
    execute : function(pc)
    {
      var             instr;
      var             instrAddr;
      var             opcode;
      var             numDataWords;
      var             debugInfo;

      // Initialize the program counter
      mem.setReg("PC", "unsigned int", pc);

      try
      {
        for (;;)
        {
          // Get the program counter value
          pc = mem.getReg("PC", "unsigned int");

          // Retrieve an instruction from that address
          instr = mem.get(pc, "unsigned int");

          // The high-order three bits determine the primary opcode
          opcode = instr >>> 29;

          // Retrieve the debug info that immediately follows the instruction
          debugInfo = mem.get(pc + Memory.WORDSIZE, "unsigned int");

          // Determine how many extra words this instruction uses
          numDataWords = debugInfo >>> 24;

          // Save the address from which we retrieved this instruction
          instrAddr = pc;

          // Update the program counter. It is incremented by 1 word for the
          // instruction itself, plus 1 word for the debug info, plus however
          // many extra words this instruction requires.
          pc += Memory.WORDSIZE * (2 + numDataWords);

          // Save the new program counter now. It may get altered when we
          // process the instruction.
          mem.setReg("PC", "unsigned int", pc);

          // Call the appropriate function to process this reuqest
//          this.__displayInstruction(instr);
          learncs.machine.Instruction.processOpcode[opcode](instr, instrAddr);

          mem.displayAsMemTemplate(instrAddr.toString(16));
        }
      }
      catch (e)
      {
        if (e.toString().match(/Normal program exit/))
        {
          if (false)
          {
            sys.print("Exit code: " + 
                      mem.getReg("R1", "unsigned char").toString(16) +
                      "\n");
          }
        }
        else
        {
          sys.print("Program halted: " + e + "\n" + e.stack + "\n");
        }
      }
    },
    
    __displayInstruction : function(instr)
    {
      var             p;
      var             parts;
      
      p = "00000000000000000000000000000000" + instr.toString(2);
      p = p.substr(-32);
      
      parts = /(\d{3})(\d{5})(\d{4})(\d{4})(\d{16})/.exec(p);
      parts.shift();
      
      parts.forEach(
        function(part)
        {
          sys.print(part + " ");
        });
      sys.print("\n");
    }
  }
});
