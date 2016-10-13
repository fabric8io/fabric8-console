/// <reference path="mainPlugin.ts"/>

module Main {
  export var HelpController = _module.controller('Main.HelpController', ['$scope', '$route', '$location', ($scope, $route, $location) => {
    $scope.breadcrumbConfig = [{
      label: 'Help'
    }];
    $scope.subTabConfig = [];
  }]);
}
