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

      $scope.tileConfig = {
        selectionMatchProp: "scheme",
        selectedItems: [],
        showSelectBox: false,
        selectItems: true,
        multiSelect: false
      };


      $scope.$watch("filter", updateFilter);

      $scope.addComponent = () => {
        var selection = $scope.tileConfig.selectedItems;
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

      function updateFilter() {
        var components = $scope.camelAllComponents;
        var filter = $scope.filter;
        if (filter) {
          components = [];
          angular.forEach($scope.camelAllComponents, (component) => {
            var tags = component.tags;
            //if (tags && _.indexOf(tags, filter) >= 0) {
            if (tags && tags.indexOf(filter) >= 0) {
              components.push(component);
            }
          });
        }
        $scope.camelComponents = components;
        Core.$apply($scope);
      }

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
          $scope.camelAllComponents = angular.fromJson(jsonData);
          var tagMap = {};
          angular.forEach($scope.camelAllComponents, (component) => {
            var tags = component.tags;
            if (tags) {
              component.$icon = getCamelComponentIconUrl(component.scheme);
              angular.forEach(tags, (tag) => {
                tagMap[tag] = tag;
              })
              component.$tagsText = tags.join(",");
            }
          });
          $scope.tags = _.keys(tagMap).sort();

          //log.info("Got data: " + angular.toJson($scope.camelComponents, true));
          updateFilter();
        };
        executeCommand($scope, $http, ForgeApiURL, commandId, projectId, request, onData);
      }
    }]);
}
