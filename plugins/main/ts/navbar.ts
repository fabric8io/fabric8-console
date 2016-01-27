/// <reference path="mainPlugin.ts"/>

module Main {

  _module.controller('Main.NavController', ['$scope', '$location', 'documentBase', ($scope, $location, documentBase) => {

    var ACTIVE = 'active';

    $scope.projectsLink = () => {
      return UrlHelpers.join(documentBase, 'workspaces');
    }

    $scope.runtimeLink = () => {
      return UrlHelpers.join(documentBase, 'namespaces');
    }

    $scope.projectsActive = () => {
      var path = $location.path();
      if (_.startsWith(path, '/workspaces')) {
        return true;
      }
      return false;
    }

    $scope.runtimeActive = () => {
      var path = $location.path();
      if (_.startsWith(path, '/namespaces')) {
        return true;
      }
      if (_.startsWith(path, '/kubernetes')) {
        return true;
      }
      return false;
    }

  }]);

}
