/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="secretHelpers.ts"/>

module Forge {

  export var FunktionOverviewController = controller("FunktionOverviewController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", "KubernetesModel",
    ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $http, $timeout, ForgeApiURL, ForgeModel, KubernetesModel) => {

      $scope.id = "funktion-get-overview";
      initScope($scope, $location, $routeParams);

      var resourcePath = "";
      var projectId = $scope.projectId;

      $scope.addComponentLink = Forge.projectPerspectiveLink($scope.namespace, projectId, "camelAddComponent");

/*
      $scope.editEndpoint = () => {
        var selection = $scope.tableConfig.selectedItems;
        if (selection && selection.length) {
          var endpoint = selection[0];
          var input = {
            endpoints: endpoint.endpointUri
          };
          var commandId = "camel-edit-endpoint";
          var fileName = endpoint.fileName || "";
          if (fileName.endsWith(".xml")) {
            commandId = "camel-edit-endpoint-xml";
          }
          gotoCommand($location, projectId, commandId, resourcePath, input, 2);
        }
      };

      $scope.createEndpointForComponent = () => {
        var selection = $scope.componentTable.selectedItems;
        if (selection && selection.length) {
          var component = selection[0];
          var input = {
            componentName: component.scheme
          };
          var commandId = "camel-add-endpoint";
          gotoCommand($location, projectId, commandId, resourcePath, input, 1);
        } else {
          log.warn("No component selected!");
        }
      };
*/

      $scope.$on('$routeUpdate', ($event) => {
        updateData();
      });

      $scope.updateData = updateData;

      updateData();

      function updateData() {
        var commandId = $scope.id;
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
          var routes = [];
          var routeBuilderCount = 0;
          $scope.funktionProject = jsonData || {};

          $scope.funktionRules = Core.pathGet($scope.funktionProject, ["config", "rules"]) || [];

          angular.forEach($scope.funktionRules, (rule) => {
/*
            var fileName = endpoint.fileName;
            if (fileName) {
              var prefix = "src/main/java";
              if (fileName.endsWith(".xml")) {
                prefix = "src/main/resources";
                var pageId = UrlHelpers.join(prefix, fileName);
                endpoint.$fileLink = Wiki.customEditLink($scope, pageId, $location, "camel/canvas");
              } else {
                routeBuilderCount++;
                var pageId = UrlHelpers.join(prefix, fileName);
                endpoint.$fileLink = Wiki.editLink($scope, pageId, $location);
              }
              var kind = "";
              if (endpoint.consumerOnly) {
                kind = endpoint.producerOnly ? "pipe" : "consumer";
              } else if (endpoint.producerOnly) {
                kind = "producer";
              }
              endpoint.$kind = kind;

              // lets add routes dynamically if the camel component doesn't return them
              if (!_.some(routes, {"fileName": fileName})) {
                routes.push({
                  fileName: fileName,
                  $fileLink: endpoint.$fileLink
                });
              }
            }
*/
          });
          log.info("loaded the funktion project");
          Core.$apply($scope);
          //log.info("Got data: " + angular.toJson($scope.funktionProject, true));
        };
        executeCommand($scope, $http, ForgeApiURL, commandId, projectId, request, onData);
      }
    }]);
}
