/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="secretHelpers.ts"/>

module Forge {

  export var CamelAddComponentController = controller("CamelAddComponentController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", "KubernetesModel",
    ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $http, $timeout, ForgeApiURL, ForgeModel, KubernetesModel) => {

      $scope.id = "camel-get-components";
      initScope($scope, $location, $routeParams);

      var projectId = $scope.projectId;
      var ns = $scope.namespace;

      var addComponent = _.endsWith($location.path(), "Component");

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
            nextCommand = "camel-project-add-component";
            var request = {
              namespace: ns,
              projectName: projectId,
              resource: "",
              inputList: [
                {
                  filter: "<all>",
                },
                {
                  componentName: component.scheme,
                }
              ]
            };
            var onData = (jsonData) => {
              $scope.executing = false;
              Core.$apply($scope);
              Core.notification("success", jsonData);

              // lets navigate to the funktion page or the camel page
              log.info("namespace " + ns + " projectId: " + projectId);
              var path = projectCamelOverviewLink(ns, projectId);
              if (Forge.forgeProject().hasPerspective("funktion")) {
                path = projectFunktionOverviewLink(ns, projectId);
              }
              log.info("Navigating to path: " + path);
              Kubernetes.goToPath($location, path);
            };
            $scope.executing = true;
            Core.$apply($scope);
            executeCommand($scope, $http, ForgeApiURL, nextCommand, projectId, request, onData, false);

          } else {
            input["componentName"] = component.scheme;
            gotoCommand($location, $scope.projectId, nextCommand, resourcePath, input, nextPage);
          }
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
