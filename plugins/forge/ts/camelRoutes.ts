/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="secretHelpers.ts"/>

module Forge {

  export var CamelRoutesController = controller("CamelRoutesController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", "KubernetesModel",
    ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $http, $timeout, ForgeApiURL, ForgeModel, KubernetesModel) => {

      $scope.id = "camel-get-routes-xml";
      initScope($scope, $location, $routeParams);

      var resourcePath = "";

      // TODO find from model!
      var xml = "META-INF/spring/camel-context.xml";

      $scope.$on('$routeUpdate', ($event) => {
        updateData();
      });

      updateData();

      $scope.updateData = updateData;


      $scope.addRoute = () => {
        var input = {
          xml: xml
        };
        var nextCommand = "camel-add-route-xml";
        var nextPage = 1;
        gotoCommand($location, $scope.projectId, nextCommand, resourcePath, input, nextPage);
      };

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
          //log.info("Got data: " + angular.toJson($scope.contexts, true));
          log.info("Updated the camel routes");
          Core.$apply($scope);
        };
        executeCommand($scope, $http, ForgeApiURL, commandId, projectId, request, onData);
      }
    }]);
}
