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

      $scope.componentTable = {
        data: 'camelProject.components',
        showSelectionCheckbox: true,
        enableRowClickSelection: true,
        multiSelect: false,
        selectedItems: [],
        filterOptions: {
          filterText: $location.search()["cq"] || ''
        },
        columnDefs: [
          {
            field: 'scheme',
            displayName: 'Scheme',
            defaultSort: true
          },
          {
            field: 'syntax',
            displayName: 'Syntrax',
            defaultSort: true
          },
          {
            field: 'description',
            displayName: 'Description'
          }
        ]
      };

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

      $scope.routeTable = {
        data: 'camelProject.routes',
        showSelectionCheckbox: true,
        enableRowClickSelection: true,
        multiSelect: false,
        selectedItems: [],
        filterOptions: {
          filterText: $location.search()["rq"] || ''
        },
        columnDefs: [
/*
          {
            field: 'endpointInstance',
            displayName: 'Name',
            defaultSort: true
          },
*/
          {
            field: 'fileName',
            displayName: 'Route File',
            cellTemplate: $templateCache.get("endpointFileName.html")
          },
        ]
      };


      $scope.addRouteBuilderLink = commandLink(projectId, "camel-new-routebuilder", "");
      $scope.createEndpointLink = commandLink(projectId, "camel-add-endpoint", "");
      $scope.addComponentLink = Forge.projectPerspectiveLink($scope.namespace, projectId, "camelAddComponent");


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
          if (isXmlProject()) {
            commandId = "camel-add-endpoint-xml";
          }
          gotoCommand($location, projectId, commandId, resourcePath, input, 1);
        } else {
          log.warn("No component selected!");
        }
      };

      $scope.$on('$routeUpdate', ($event) => {
        updateData();
      });

      function isXmlProject() {
        var javaCount = 0;
        var xmlCount = 0;
        angular.forEach($scope.camelProject.routes, (route) => {
          var fileName = route.fileName;
          if (fileName) {
            if (fileName.toLowerCase().endsWith(".xml")) {
              xmlCount++;
            } else {
              javaCount++;
            }
          }
        });
        return xmlCount || !javaCount;
      }

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
          $scope.camelProject = jsonData || {};
          angular.forEach($scope.camelProject.endpoints, (endpoint) => {
            var fileName = endpoint.fileName;
            if (fileName) {
              var prefix = "src/main/java";
              if (fileName.endsWith(".xml")) {
                prefix = "src/main/resources";
                var pageId = UrlHelpers.join(prefix, fileName);
                endpoint.$fileLink = Wiki.customEditLink($scope, pageId, $location, "camel/canvas");
              } else {
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
          });
          if (!angular.isArray($scope.camelProject.routes) || !$scope.camelProject.routes.length) {
            $scope.camelProject.routes = routes;
          }
          log.info("loaded the camel project");
          Core.$apply($scope);
          //log.info("Got data: " + angular.toJson($scope.camelProject, true));
        };
        executeCommand($scope, $http, ForgeApiURL, commandId, projectId, request, onData);
      }
    }]);
}
