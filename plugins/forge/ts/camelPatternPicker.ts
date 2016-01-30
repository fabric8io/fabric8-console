/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {


  export var CamelPatternPicker = controller("CamelPatternPicker",
    ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
      ($scope, $templateCache:ng.ITemplateCacheService, $location:ng.ILocationService, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) => {

        var config = $scope.config || {};
        var properties = config.properties || {};

        var selectionValueProperty = "name";
        var propertyName = "name";
        var propertyInfo = properties[propertyName] || {};

        $scope.patterns = [];
        angular.forEach(propertyInfo.enum, (pattern) => {
          if (pattern.name === "crypto") {
            // lets use a nicer title / description
            pattern.title = "Crypto Data Format";
            pattern.description = "Crypto (Java Cryptographic Extension)";
          }
          var tags = pattern.tags;
          if (angular.isArray(tags)) {
            pattern.$class = tags.join(" ");
          }
          $scope.patterns.push(pattern);
        });
        $scope.patterns = _.sortBy($scope.patterns , "title");

        $scope.tileConfig = {
          selectionMatchProp: selectionValueProperty,
          selectedItems: [],
          showSelectBox: false,
          selectItems: true,
          multiSelect: false
        };

        entityChanged();

        $scope.$watch("entity." + propertyName, entityChanged);
        $scope.$watchCollection("tileConfig.selectedItems", userSelectionChanged);


        function getSelection(value) {
          var answer = null;
          if (value) {
            angular.forEach($scope.patterns, (pipeline) => {
              if (!answer && value === pipeline[selectionValueProperty]) {
                answer = pipeline;
              }
            });
          }
          return answer;
        }

        function entityChanged() {
          var component = $scope.entity[propertyName];
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
            selectedValue = selected[selectionValueProperty];
          }

/*
          if (selected) {
            propertyInfo["selected"] = selected;
            var schema = $scope.schema;
            if (schema) {
              var schemaProperties = schema.properties || {};
              var schemaPropertyInfo =  schemaProperties[propertyName] || {};
              if (schemaPropertyInfo) {
                schemaPropertyInfo["selected"] = selected;
              }
            }
          }
*/

          // lets not clear the selection on startup when we have an empty selection
          if (selectedValue || !first) {
            $scope.entity[propertyName] = selectedValue;
            first = false;
          }
          $scope.selected = selected;
          Core.$apply($scope);
        }
      }]);
}
