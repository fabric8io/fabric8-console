/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {

  export var FractionsPicker = controller("FractionsPicker",
    ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
      ($scope, $templateCache:ng.ITemplateCacheService, $location:ng.ILocationService, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) => {

        var config = $scope.config || {};
        var properties = config.properties || {};
        var fractions = properties.fractions || {};

        $scope.fractions = [];
        angular.forEach(fractions.enum, (fraction) => {
          $scope.fractions.push({
            id: fraction,
            label: fraction
          });
        });

        $scope.selectedItems = [];

        $scope.currentItem = null;
        entityChanged();

        $scope.$watch("currentItem", () => {
          var currentItem = $scope.currentItem;
          if (angular.isObject(currentItem)) {
            var id = currentItem.id;
            if (id) {
              if (!_.find($scope.selectedItems, {id: id})) {
                $scope.selectedItems.push(currentItem);
                userSelectionChanged();
              }
              $scope.currentItem = null;
            }
          }
        });

        $scope.removeItem = (item) => {
          if (item) {
            _.remove($scope.selectedItems, item);
            userSelectionChanged();
          }
        };

        $scope.$watch("entity.fractions", entityChanged);

        function getSelection(value) {
          var answer = null;
          if (value) {
            angular.forEach($scope.fractions, (pipeline) => {
              if (!answer && value === pipeline.$value) {
                answer = pipeline;
              }
            });
          }
          return answer;
        }

        function entityChanged() {
        }

        var first = true;

        function userSelectionChanged() {
          var answer = [];
          angular.forEach($scope.selectedItems, (item) => {
            var id = (item || {}).id;
            if (id) {
              answer.push(id);
            }
          });
          $scope.entity.fractions = answer;
          log.info("updated fractions to: " + $scope.entity.fractions);
        }
      }]);
}
