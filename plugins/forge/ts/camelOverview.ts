/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="secretHelpers.ts"/>

module Forge {

  export var CamelOverviewController = controller("CamelOverviewController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", "KubernetesModel",
    ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $http, $timeout, ForgeApiURL, ForgeModel, KubernetesModel) => {

      $scope.id = "camel-get-overview";
      initScope($scope, $location, $routeParams);

      var resourcePath = "";
      var projectId = $scope.projectId;

      $scope.tableConfig = {
        data: 'camelProject.endpoints',
        showSelectionCheckbox: true,
        enableRowClickSelection: true,
        multiSelect: false,
        selectedItems: [],
        filterOptions: {
          filterText: $location.search()["q"] || ''
        },
        columnDefs: [
          {
            field: 'endpointInstance',
            displayName: 'Name',
            defaultSort: true
          },
          {
            field: 'endpointUri',
            displayName: 'URI',
            defaultSort: true
          },
          {
            field: '$kind',
            displayName: 'Kind'
          },
          {
            field: 'fileName',
            displayName: 'File',
            cellTemplate: $templateCache.get("endpointFileName.html")
          },
        ]
      };


      //$scope.createEndpointLink = commandLink(projectId, "camel-add-endpoint", "");
      $scope.createEndpointLink = Forge.projectPerspectiveLink($scope.namespace, projectId, "camelAddEndpoint");
      $scope.addComponentLink = Forge.projectPerspectiveLink($scope.namespace, projectId, "camelAddComponent");

      $scope.editEndpoint = () => {
        var selection = $scope.tableConfig.selectedItems;
        if (selection && selection.length) {
          var endpoint = selection[0];
          var input = {
            endpoints: endpoint.endpointUri
          };
          gotoCommand($location, projectId, "camel-edit-endpoint", resourcePath, input, 2);
        }
      };

      $scope.$on('$routeUpdate', ($event) => {
        updateData();
      });

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
          $scope.camelProject = jsonData || {};
          angular.forEach($scope.camelProject.endpoints, (endpoint) => {
            var fileName = endpoint.fileName;
            if (fileName) {
              endpoint.$fileLink = Wiki.editLink($scope, UrlHelpers.join("src/main/java", fileName), $location);
              var kind = "";
              if (endpoint.consumerOnly) {
                kind = endpoint.producerOnly ? "pipe" : "consumer";
              } else if (endpoint.producerOnly) {
                kind = "producer";
              }
              endpoint.$kind = kind;
            }
          });

          log.info("Got data: " + angular.toJson($scope.camelProject, true));
        };
        executeCommand($scope, $http, ForgeApiURL, commandId, projectId, request, onData);
      }
    }]);
}
