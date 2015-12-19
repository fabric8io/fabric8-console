/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="secretHelpers.ts"/>

module Forge {

  export var CamelAddComponentController = controller("CamelAddComponentController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", "KubernetesModel",
    ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $http, $timeout, ForgeApiURL, ForgeModel, KubernetesModel) => {

      $scope.id = "camel-get-components";
      initScope($scope, $location, $routeParams);

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
            field: 'label',
            displayName: 'Labels',
            cellTemplate: $templateCache.get("labels.html")
          },
        ]
      };

      $scope.addComponent = () => {
        var selection = $scope.tableConfig.selectedItems;
        if (selection && selection.length) {
          var component = selection[0];

          var input = {
            name: component.scheme
          };
          gotoCommand($location, $scope.projectId, "camel-add-component", resourcePath, input, 2);

          // TODO forward to page 2 of the camel-add-component forge command!
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
              format: "JSON"
            }
          ]
        };
        var onData = (jsonData) => {
          $scope.camelComponents = angular.fromJson(jsonData);
          log.info("Got data: " + angular.toJson($scope.camelComponents, true));
        };
        executeCommand($scope, $http, ForgeApiURL, commandId, projectId, request, onData);
      }
    }]);
}
