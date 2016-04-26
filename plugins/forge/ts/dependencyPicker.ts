/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {

  export var DependenciesPicker = controller("DependenciesPicker",
    ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
      ($scope, $templateCache:ng.ITemplateCacheService, $location:ng.ILocationService, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) => {

        var config = $scope.config || {};
        var properties = config.properties || {};
        var dependencies = properties.dependencies || {};
        $scope.dependencies = dependencies.enum;
        $scope.selectedItems = [];

        $scope.currentItem = null;
/*
        angular.forEach($scope.dependencies, (archetype) => {
          var artifactId = archetype.artifactId;
          if (artifactId) {
            var artifactLabel = Core.trimTrailing(artifactId, "-archetype");
            archetype.$artifactLabel = artifactLabel;
            archetype.$value = archetype.groupId + ":" + artifactId + ":" + archetype.version;
          }
        });

*/
        entityChanged();

        $scope.$watch("currentItem", () => {
          var currentItem = $scope.currentItem;
          if (angular.isObject(currentItem)) {
            // lets check we've not already got this item
            var id = currentItem.id;
            if (id) {
              if (!_.find($scope.selectedItems, {id: id})) {
                $scope.selectedItems.push(currentItem);
                userSelectionChanged();
              }
            }
            $scope.currentItem = null;
          }
        });

        $scope.removeItem = (item) => {
          if (item) {
            _.remove($scope.selectedItems, item);
            userSelectionChanged();
          }
        };

        $scope.$watch("entity.dependencies", entityChanged);

/*
        $scope.$watchCollection("tableConfig.selectedItems", userSelectionChanged);
*/

        function getSelection(value) {
          var answer = null;
          if (value) {
            angular.forEach($scope.dependencies, (pipeline) => {
              if (!answer && value === pipeline.$value) {
                answer = pipeline;
              }
            });
          }
          return answer;
        }

        function entityChanged() {
/*
          var archetype = $scope.entity.archetype || {};
          var pipelineValue = angular.isString(archetype) ? archetype : archetype.value;
          var initialSelection = getSelection(pipelineValue);
          if (initialSelection) {
            $scope.tableConfig.selectedItems = [initialSelection];
            userSelectionChanged();
          }
*/
        }

        var first = true;

        function userSelectionChanged() {
          var answer = [];
          angular.forEach($scope.selectedItems, (item) => {
            var id = (item || {}).groupAndName;
            if (id) {
              answer.push(id);
            }
          });
          $scope.entity.dependencies = answer;
          log.info("updated dependencies to: " + $scope.entity.dependencies);

/*
          $scope.entity.dependencies = null;
          if ($scope.selectedItems.length) {
            $scope.entity.dependencies = $scope.selectedItems[0].groupAndName;
          }
*/
          //$scope.entity.dependencies = $scope.selectedItems;
        }
      }]);
}
