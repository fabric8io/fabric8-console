/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {

  export var ArchetypePicker = controller("ArchetypePicker",
    ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
      ($scope, $templateCache:ng.ITemplateCacheService, $location:ng.ILocationService, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) => {

        var config = $scope.config || {};
        var properties = config.properties || {};
        var archetype = properties.archetype || {};
        $scope.archetypes = archetype.enum;
        angular.forEach($scope.archetypes, (archetype) => {
          var artifactId = archetype.artifactId;
          if (artifactId) {
            var artifactLabel = Core.trimTrailing(artifactId, "-archetype");
            archetype.$artifactLabel = artifactLabel;
            archetype.$value = archetype.groupId + ":" + artifactId + ":" + archetype.version;
          }
        });

        $scope.tableConfig = {
          data: 'archetypes',
          primaryKeyFn: (item) => item.$value,
          showSelectionCheckbox: false,
          enableRowClickSelection: true,
          multiSelect: false,
          selectedItems: [],
          filterOptions: {
            filterText: ''
          },
          columnDefs: [
            {
              field: '$artifactLabel',
              displayName: 'Archetype',
            },
            {
              field: 'description',
              displayName: 'Description',
            },
            {
              field: 'groupId',
              displayName: 'Group Id',
            },
            {
              field: 'version',
              displayName: 'Version',
            }
          ]
        };
        entityChanged();

        $scope.$watch("entity.archetype", entityChanged);
        $scope.$watchCollection("tableConfig.selectedItems", userSelectionChanged);

        function getSelection(value) {
          var answer = null;
          if (value) {
            angular.forEach($scope.archetypes, (pipeline) => {
              if (!answer && value === pipeline.$value) {
                answer = pipeline;
              }
            });
          }
          return answer;
        }

        function entityChanged() {
          var archetype = $scope.entity.archetype || {};
          var pipelineValue = angular.isString(archetype) ? archetype : archetype.value;
          var initialSelection = getSelection(pipelineValue);
          if (initialSelection) {
            $scope.tableConfig.selectedItems = [initialSelection];
            userSelectionChanged();
          }
        }

        var first = true;

        function userSelectionChanged() {
          var selection = $scope.tableConfig.selectedItems;
          var selectedValue = "";
          var selected = null;
          if (selection && selection.length) {
            selected = selection[0];
            selectedValue = selected.$value;
          }

          // lets not clear the selection on startup when we have an empty selection
          if (selectedValue || !first) {
            $scope.entity.archetype = selectedValue;
            first = false;
          }
          $scope.selected = selected;
          Core.$apply($scope);
        }
      }]);
}
