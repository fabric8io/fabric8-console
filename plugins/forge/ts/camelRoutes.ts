/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="secretHelpers.ts"/>

module Forge {

  export var CamelRoutesController = controller("CamelRoutesController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", "KubernetesModel",
    ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $http, $timeout, ForgeApiURL, ForgeModel, KubernetesModel) => {

      $scope.id = "camel-get-routes-xml";
      initScope($scope, $location, $routeParams);


      $scope.$on('$routeUpdate', ($event) => {
        updateData();
      });

      updateData();

      function updateData() {
        var commandId = $scope.id;
        var projectId = $scope.projectId;
        var request = {
          namespace: $scope.namespace,
          projectName: projectId,
          resource: "",
          inputList: [
            {
              format: "JSON"
            }
          ]
        };
        var onData = (jsonData) => {
          $scope.contexts = jsonData;
          angular.forEach($scope.contexts, (component) => {
/*
            var tags = component.tags;
            if (tags) {
              component.$tagsText = tags.join(",");
            }
*/
          });
          log.info("Got data: " + angular.toJson($scope.contexts, true));
        };
        executeCommand($scope, $http, ForgeApiURL, commandId, projectId, request, onData);
      }
    }]);
}
