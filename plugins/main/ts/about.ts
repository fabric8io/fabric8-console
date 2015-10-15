/// <reference path="mainGlobals.ts"/>
/// <reference path="mainPlugin.ts"/>

module Main {
  _module.controller('Main.About', ($scope) => {
    $scope.info = version;
  });
}

