/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {


  export var ProjectTypePicker = controller("ProjectTypePicker",
    ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
      ($scope, $templateCache:ng.ITemplateCacheService, $location:ng.ILocationService, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) => {

        var config = $scope.config || {};
        var properties = config.properties || {};

        var selectionValueProperty = "value";
        var propertyName = "type";
        var propertyInfo = properties[propertyName] || {};

        $scope.projectTypes = [];
        angular.forEach(propertyInfo.enum, (typeName) => {
          // ignore some project types
          if (typeName === "Parent" || typeName === "Forge Addon (JAR)" || typeName === "Java Resources (JAR)") {
            // ignore
          } else {
            var projectType = {
              label: typeName,
              value: typeName,
              $icon: "",
              $maven: true
            };
            projectTypeIcon(typeName, projectType);
            $scope.projectTypes.push(projectType);
          }
        });

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


        function projectTypeIcon(typeName, projectType) {
          var icon = "img/java.svg";
          var maven = true;
          if (typeName) {
            var lower = typeName.toLowerCase();
            if (lower.startsWith("go")) {
              icon = "img/icons/gopher.png";
              maven = false;
            } else if (lower.startsWith("integrat")) {
              icon = "img/icons/camel.svg";
            } else if (lower.startsWith("from archetype")) {
              icon = "img/maven-icon.png";
            } else if (lower.startsWith("forge")) {
              icon = "img/icons/forge.svg";
            } else if (lower.startsWith("node")) {
              icon = "img/icons/javascript.png";
              maven = false;
            } else if (lower.startsWith("python") || lower.startsWith("django")) {
              icon = "img/icons/python.png";
              maven = false;
            } else if (lower.startsWith("ruby") || lower.startsWith("rails")) {
              icon = "img/icons/ruby.png";
              maven = false;
            } else if (lower.startsWith("swift")) {
              icon = "img/icons/swift.png";
              maven = false;
            }
          }
          projectType.$icon = icon;
          projectType.$maven = maven;
        }

        function getSelection(value) {
          var answer = null;
          if (value) {
            angular.forEach($scope.projectTypes, (pipeline) => {
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
