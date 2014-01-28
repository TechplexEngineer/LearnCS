/**
 * Copyright (c) 2013 Derrell Lipman
 * 
 * License:
 *   GPL Version 2: http://www.gnu.org/licenses/gpl-2.0.html 
 */

/**
 * @use(playground.dbif.ObjCourse)
 */

qx.Mixin.define("playground.dbif.MDbifCommon",
{
  include :
  [
    playground.dbif.MUser,
    playground.dbif.MUsageDetail,
    playground.dbif.MFiles,
    playground.dbif.MSettings
  ],

  construct : function()
  {
    // Use our authorization function
    liberated.AbstractRpcHandler.authorizationFunction = 
      playground.dbif.MDbifCommon.authorize;
  },

  properties :
  {
    /**
     * Information about the currently-logged-in user. The value is a map
     * containing the fields: user, isAdmin, and optionally, displayName.
     */
    whoAmI :
    {
      nullable : true,
      init     : null,
      check    : "Object",
      apply    : "_applyWhoAmI"
    },
    
    /**
     * The database (ObjUser) ID of the current user
     */
    myUserId :
    {
      init     : null,
      apply    : "_applyMyUserId"
    },

    logoutUrl :
    {
      init     : "",
      check    : "String"
    }
  },

  members :
  {
    _applyWhoAmI : function(value, old)
    {
      var             userData;

      playground.dbif.MDbifCommon.__whoAmI = value;

      // If there's no user name provided...
      if (value === null)
      {
        // ... we have nothing more to do
        return;
      }

      // Retrieve the data for this user
      userData = liberated.dbif.Entity.query(
        "playground.dbif.ObjUser",
        {
          type  : "element",
          field : "user",
          value : value.user
        });

      // If this user doesn't exist...
      if (userData.length === 0)
      {
        // ... we have nothing more to do
      }

      // There should be exactly one returned entry. Get it.
      userData = userData[0];

      this.setMyUserId(userData.id);
    },

    // TODO: the myUserId property is now only set by _applyWhoAmI. Remove it,
    // and access getWhoAmI().id instead.
    _applyMyUserId : function(value, old)
    {
      playground.dbif.MDbifCommon.__myUserId = value;
    }
  },

  statics :
  {
    /**
     * Standardized time stamp for all Date fields
     *
     * @return {Integer}
     *   The number of milliseconds since midnight, 1 Jan 1970
     */
    currentTimestamp : function()
    {
      return new Date().getTime();
    },

    /**
     * Retrieve the id of the current user
     * 
     * @return {Number}
     *   The id of the current user
     */
    getCurrentUserId : function()
    {
      return playground.dbif.MDbifCommon.__myUserId;
    },

    /**
     * Function to be called for authorization to run a service
     * method.
     *
     * @param methodName {String}
     *   The fully-qualified name of the method to be called
     *
     * @return {Boolean}
     *   true to allow the function to be called, or false to indicates
     *   permission denied.
     */
    authorize : function(methodName)
    {
      var             me;
      var             bAnonymous;

      // Are they logged in, or anonymous?
      bAnonymous = (playground.dbif.MDbifCommon.__whoAmI === null);

      // Get a shortcut to my user name
      me = (bAnonymous ? null : playground.dbif.MDbifCommon.__whoAmI.user);

      // If the user is an adminstrator, ...
      if (! bAnonymous && playground.dbif.MDbifCommon.__whoAmI.isAdmin)
      {
        // ... they implicitly have access.
        return true;
      }

      //
      // Authorize individual methods. Use of a method may be authorized for
      // any user, for any logged-in user, or only for specific users.
      //
      switch(methodName)
      {
      case "learncs.userInit":
        return ! bAnonymous;    // Access is allowed if they're logged in

      case "learncs.usageDetail":
        return ! bAnonymous;    // Access is allowed if they're logged in

      case "learncs.getDirectoryListing":
        return ! bAnonymous;    // Access is allowed if they're logged in

      case "learncs.getProgram":
        return ! bAnonymous;    // Access is allowed if they're logged in

      case "learncs.renameProgram":
        return ! bAnonymous;    // Access is allowed if they're logged in

      case "learncs.removeProgram":
        return ! bAnonymous;    // Access is allowed if they're logged in

      case "learncs.copyProgram":
        return ! bAnonymous;    // Access is allowed if they're logged in

      case "learncs.saveSettings":
        return ! bAnonymous;    // Access is allowed if they're logged in


/*
      case "learncs.somePrivateMethod":
        return (me == "joe@blow.com");
*/

      default:
        // Do not allow access to unrecognized method names
        return false;
      }
    }
  }
});
