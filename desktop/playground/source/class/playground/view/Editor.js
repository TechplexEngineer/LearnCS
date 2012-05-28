/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/* ************************************************************************

#asset(playground/*)
#ignore(require)
#ignore(ace)

************************************************************************ */

/**
 * Container for the source code editor.
 */
qx.Class.define("playground.view.Editor",
{
  extend : qx.ui.container.Composite,
  include : qx.ui.core.MBlocker,


  construct : function(broadcast)
  {
    this.base(arguments);
    
    // Save the provided broadcast function
    this.__broadcast = broadcast;
  },


  events :
  {
    /**
     * Event for signaling that the highlighting could not be done by the editor.
     */
    "disableHighlighting" : "qx.event.type.Event"
  },


  members :
  {
    __textarea : null,
    __highlighted : null,
    __editor : null,
    __ace : null,

    /**
     * The constructor was spit up to make the included mixin available during
     * the init process.
     *
     * @lint ignoreUndefined(require)
     */
    init: function()
    {
      this.setBackgroundColor("white");

      // If widgets are added to the container, the zIndex of the editor blocker
      // is set to 100. This makes possible to resize the splitpanes
      this.addListener("addChildWidget", function() {
        this.getBlocker().getContentBlockerElement().setStyles({ "zIndex" : 100 });
        this.getBlocker().getBlockerElement().setStyles({ "zIndex" : 100 });
      }, this);

      // layout stuff
      var layout = new qx.ui.layout.VBox();
      this.setLayout(layout);
      this.setDecorator("main");

      // Create a tab view to contain the blocks and source editors
      this.__codeView = new qx.ui.tabview.TabView();
      this.add(this.__codeView, { flex : 1 });
      
      // Create the blocks editor page
      var blocksPage = new qx.ui.tabview.Page(this.tr("Blocks Editor"));
      var label = blocksPage.getChildControl("button").getChildControl("label");
      label.setFont("bold");
      blocksPage.setLayout(new qx.ui.layout.VBox());
      this.__codeView.add(blocksPage);

      // Create a blockly editor
      this.__blocksEditor = 
        new blockly.Blockly(workshop.language.Language.getLanguageData(),
                            this.__broadcast);
      blocksPage.add(this.__blocksEditor, { flex : 1 });

      // Create the source editor page
      var sourcePage = new qx.ui.tabview.Page(this.tr("Source Code"));
      label = sourcePage.getChildControl("button").getChildControl("label");
      label.setFont("bold");
      sourcePage.setLayout(new qx.ui.layout.VBox());
      this.__codeView.add(sourcePage);
      
/*
      this.__codeView.setSelection( [ sourcePage ] );
      qx.util.TimerManager.getInstance().start(
        function()
        {
          this.__codeView.setSelection( [ blocksPage ] );
        },
        0,
        this,
        null,
        100);
*/
      

      // plain text area
      this.__textarea = new qx.ui.form.TextArea().set({
        wrap      : false,
        font      : qx.bom.Font.fromString("14px monospace"),
        decorator : "separator-vertical",
        backgroundColor: "white",
        padding   : [0,0,0,5]
      });
      sourcePage.add(this.__textarea, { flex : 1 });

      this.__editor = new qx.ui.core.Widget();
      this.__editor.setDecorator("separator-vertical");
      var highlightDisabled = false;
/*
      var badIE = qx.core.Environment.get("engine.name") == "mshtml";
      if (badIE) {
        badIE = parseFloat(qx.core.Environment.get("browser.version")) <= 8 ||
          qx.core.Environment.get("browser.documentmode") <= 8;
      }

      // FF2 does not have that...
      if (!document.createElement("div").getBoundingClientRect || badIE || !window.ace) {
        this.fireEvent("disableHighlighting");
        highlightDisabled = true;
      } else {
        this.__editor.addListenerOnce("appear", function() {
          this.__onEditorAppear();
        }, this);
      }
      this.__editor.setVisibility("excluded");
      sourcePage.add(this.__editor, { flex : 1 });
*/
this.fireEvent("disableHighlighting");
highlightDisabled = true;


      // load the CSS files for the code editor
      var uri = qx.util.ResourceManager.getInstance().toUri("resource/playground/css/editor.css");
      qx.bom.Stylesheet.includeFile(uri);
      uri = qx.util.ResourceManager.getInstance().toUri("resource/playground/css/tm.css");
      qx.bom.Stylesheet.includeFile(uri);

      // override the focus border CSS of the editor
      qx.bom.Stylesheet.createElement(
        ".ace_editor {border: 0px solid #9F9F9F !important;}"
      );

      // chech the initial highlight state
      var shouldHighligth = qx.bom.Cookie.get("playgroundHighlight") !== "false";
      this.useHighlight(!highlightDisabled && shouldHighligth);
    },


    /**
     * This code part uses the ajax.org code editor library to add a
     * syntax-highlighting editor as an textarea replacement
     *
     * @lint ignoreUndefined(ace,require)
     */
    __onEditorAppear : function() {
      // timout needed for chrome to not get the ACE layout wrong and show the
      // text on top of the gutter
      qx.event.Timer.once(function() {
        var container = this.__editor.getContentElement().getDomElement();

        // HOTFIX for webkit to enable space entering
        if (qx.core.Environment.get("engine.name") == "webkit") {
          this.__editor.addListener("click", function(e) {
            editor.textInput.blur();
            editor.textInput.focus();
          }, this);
        }

        // create the editor
        var editor = this.__ace = ace.edit(container);

        // set javascript mode
        var JavaScriptMode = require("ace/mode/javascript").Mode;
        editor.getSession().setMode(new JavaScriptMode());

        // configure the editor
        var session = editor.getSession();
        session.setUseSoftTabs(true);
        session.setTabSize(2);

        // disable the lint check in opera. Its not working anyway!
        if (qx.core.Environment.get("browser.name") == "opera") {
          session.setAnnotations = function() {};
        }

        // copy the inital value
        session.setValue(this.__textarea.getValue() || "");

        var self = this;
        // append resize listener
        this.__editor.addListener("resize", function() {
          // use a timeout to let the layout queue apply its changes to the dom
          window.setTimeout(function() {
            self.__ace.resize();
          }, 0);
        });
      }, this, 500);
    },


    /**
     * Returns the current set code of the editor.
     * @return {String} The current set text.
     */
    getCode : function() {
      if (this.__highlighted && this.__ace) {
        return this.__ace.getSession().getValue();
      } else {
        return this.__textarea.getValue();
      }
    },


    /**
     * Sets the given code to the editor.
     * @param code {String} The new code.
     */
    setCode : function(code) {
      if (this.__ace) {
        this.__ace.getSession().setValue(code);

        // move cursor to start to prevent scrolling to the bottom
        this.__ace.renderer.scrollToX(0);
        this.__ace.renderer.scrollToY(0);
        this.__ace.selection.moveCursorFileStart();
      }
      this.__textarea.setValue(code);
    },


    /**
     * Switches between the ajax code editor editor and a plain textarea.
     * @param value {Boolean} True, if the code editor should be used.
     */
    useHighlight : function(value) {
      this.__highlighted = value;

      if (value) {
        // change the visibility
        this.__editor.setVisibility("visible");
        this.__textarea.setVisibility("excluded");

        // copy the value, if the editor already availabe
        if (this.__ace) {
          this.__ace.getSession().setValue(this.__textarea.getValue());
        }
      } else {
        // change the visibility
        this.__editor.setVisibility("excluded");
        this.__textarea.setVisibility("visible");

        // copy the value, if the editor already availabe
        if (this.__ace) {
          this.__textarea.setValue(this.__ace.getSession().getValue());
        }
      }
    },
    
    getCodeView : function()
    {
      return this.__codeView;
    },
    
    getBlocksCode : function()
    {
      return this.__blocksEditor.toJavaScript();
    }
  },



  /*
   *****************************************************************************
      DESTRUCTOR
   *****************************************************************************
   */

  destruct : function()
  {
    this._disposeObjects("__textarea");
    this.__ace = null;
  }
});
