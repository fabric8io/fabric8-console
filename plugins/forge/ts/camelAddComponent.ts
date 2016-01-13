/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="secretHelpers.ts"/>

module Forge {

  export var CamelAddComponentController = controller("CamelAddComponentController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", "KubernetesModel",
    ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $http, $timeout, ForgeApiURL, ForgeModel, KubernetesModel) => {

      $scope.id = "camel-get-components";
      initScope($scope, $location, $routeParams);

      var addComponent = $location.path().endsWith("Component");

      var resourcePath = "";

      $scope.tableConfig = {
        data: 'camelComponents',
        showSelectionCheckbox: true,
        enableRowClickSelection: true,
        multiSelect: false,
        selectedItems: [],
        filterOptions: {
          filterText: $location.search()["q"] || ''
        },
        columnDefs: [
          {
            field: 'scheme',
            displayName: 'Name',
            defaultSort: true
          },
          {
            field: 'description',
            displayName: 'Description'
          },
          {
            field: '$tagsText',
            displayName: 'Tags',
            cellTemplate: '<div class="ngCellText"><span class="badge" ng-repeat="tag in row.entity.tags">{{tag}}</span></div>'
          },
        ]
      };

      $scope.addComponent = () => {
        var selection = $scope.tableConfig.selectedItems;
        if (selection && selection.length) {
          var component = selection[0];

          var input = {};
          var nextCommand = "camel-add-endpoint";
          var nextPage = 1;
          if (addComponent) {
            nextCommand = "camel-add-component";
            nextPage = 2;
            input["name"] = component.scheme;
          } else {
            input["componentName"] = component.scheme;
          }
          gotoCommand($location, $scope.projectId, nextCommand, resourcePath, input, nextPage);
        }
      };


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
              excludeProject: addComponent ? "true" : "false",
              format: "JSON"
            }
          ]
        };
        var onData = (jsonData) => {
          $scope.camelComponents = angular.fromJson(jsonData);
          angular.forEach($scope.camelComponents, (component) => {
            var tags = component.tags;
            if (tags) {
              component.$tagsText = tags.join(",");
            }
          });
          //log.info("Got data: " + angular.toJson($scope.camelComponents, true));
        };
        executeCommand($scope, $http, ForgeApiURL, commandId, projectId, request, onData);
      }
    }]);
}
