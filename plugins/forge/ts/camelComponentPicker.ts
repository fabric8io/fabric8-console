/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {


  export var CamelComponentPicker = controller("CamelComponentPicker",
    ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
      ($scope, $templateCache:ng.ITemplateCacheService, $location:ng.ILocationService, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) => {

        var config = $scope.config || {};
        var properties = config.properties || {};
        var componentName = properties.componentName || {};
        $scope.components = componentName.enum;
        angular.forEach($scope.components, (component) => {
          component.$icon = getCamelComponentIconUrl(component.scheme);
        });

        $scope.tileConfig = {
          selectionMatchProp: "scheme",
          selectedItems: [],
          showSelectBox: false,
          selectItems: true,
          multiSelect: false
        };

        entityChanged();

        $scope.$watch("entity.componentName", entityChanged);
        $scope.$watchCollection("tileConfig.selectedItems", userSelectionChanged);

        function getSelection(value) {
          var answer = null;
          if (value) {
            angular.forEach($scope.components, (pipeline) => {
              if (!answer && value === pipeline.scheme) {
                answer = pipeline;
              }
            });
          }
          return answer;
        }

        function entityChanged() {
          var component = $scope.entity.componentName;
          var initialSelection = component;
          if (angular.isString(component)) {
            initialSelection = getSelection(component);
          }
          if (initialSelection) {
            $scope.tileConfig.selectedItems = [initialSelection];
            userSelectionChanged();
          }
        }

        var first = true;

        function userSelectionChanged() {
          var selection = $scope.tileConfig.selectedItems;
          var selectedValue = "";
          var selected = null;
          if (selection && selection.length) {
            selected = selection[0];
            selectedValue = selected.scheme;
          }

          // lets not clear the selection on startup when we have an empty selection
          if (selectedValue || !first) {
            $scope.entity.componentName = selectedValue;
            first = false;
          }
          $scope.selected = selected;
          Core.$apply($scope);
        }
      }]);
}
