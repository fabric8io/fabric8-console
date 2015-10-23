/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>

/**
 * @module Wiki
 */
 module Wiki {
  _module.controller("Wiki.GitPreferences", ["$scope", "localStorage", "userDetails", ($scope, localStorage, userDetails) => {

    var config = {
      properties: {
        gitUserName: {
          type: 'string',
          label: 'Username',
          description: 'The user name to be used when making changes to files with the source control system'
        },
        gitUserEmail: {
          type: 'string',
          label: 'Email',
          description: 'The email address to use when making changes to files with the source control system'
        }
      }
    };

    $scope.entity = $scope;
    $scope.config = config;

    Core.initPreferenceScope($scope, localStorage, {
      'gitUserName': {
        'value': userDetails.username || ""
      },
      'gitUserEmail': {
        'value': ''
      }  
    });
  }]);
 }
