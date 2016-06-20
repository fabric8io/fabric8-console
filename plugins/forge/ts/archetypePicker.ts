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

        var propertyName = "archetype";
        var selectionValueProperty = "$value";

        var useTiles = true;

        $scope.archetypes = archetype.enum;
        var allFunktions = true;
        angular.forEach($scope.archetypes, (archetype) => {
          var artifactId = archetype.artifactId;
          if (!artifactId || !_.startsWith(artifactId, "funktion-")) {
            allFunktions = false;
          }
        });

        angular.forEach($scope.archetypes, (archetype) => {
          var artifactId = archetype.artifactId;
          if (artifactId) {
            var artifactLabel = Core.trimTrailing(artifactId, "-archetype");
            archetype.$artifactLabel = artifactLabel;
            if (!archetype.$description) {
              var version = archetype.version;
              var descr = "<p><b>" + artifactLabel + "</b></p>\n<p>" + archetype.description + "</p>";
              if (version) {
                descr +=  "\n<p>version: <b>" + version + "</b></p>";
              }
              archetype.$description = descr;
            }
            archetype[selectionValueProperty] = archetype.groupId + ":" + artifactId + ":" + archetype.version;
            projectTypeIcon(artifactId, archetype, allFunktions);

            createProjectTags(artifactLabel, archetype);
          }
        });

        $scope.allArchetypes = $scope.archetypes;

        $scope.tableConfig = {
          data: 'archetypes',
          primaryKeyFn: (item) => item[selectionValueProperty],
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

        $scope.tileConfig = {
          selectionMatchProp: selectionValueProperty,
          selectedItems: [],
          showSelectBox: false,
          selectItems: true,
          multiSelect: false
        };

        $scope.toggleFilter = (tag) => {
          if (tag) {
            var paths = ["tableConfig", "filterOptions", "filterText"];
            var filter = Core.pathGet($scope, paths) || "";
            var tagSpace = tag + " ";
            var spaceTagSpace = " " + tagSpace;
            if (_.startsWith(filter, tagSpace)) {
              filter = filter.substring(tagSpace.length);
            } else {
              var idx = filter.indexOf(spaceTagSpace);
              if (idx > 0) {
                filter = filter.substring(0, idx) + filter.substring(idx + spaceTagSpace.length - 1);
              } else {
                if (filter) {
                  filter = filter + " " + tag;
                } else {
                  filter = tag;
                }
              }
            }
            Core.pathSet($scope, paths, filter);
            Core.$apply($scope);
          }
        };

        entityChanged();

        $scope.$watch("entity." + propertyName,  entityChanged);
        if (useTiles) {
          $scope.$watchCollection("tileConfig.selectedItems", updateTileSelection);
        } else {
          $scope.$watchCollection("tableConfig.selectedItems", userSelectionChanged);
        }
        $scope.$watchCollection("tableConfig.filterOptions.filterText", filterChanged);

        function filterChanged(text) {
          log.info("Filter is now: " + text);

          if (!text) {
            $scope.archetypes = $scope.allArchetypes;
          } else {
            $scope.archetypes = _.filter($scope.allArchetypes, (object) => FilterHelpers.searchObject(object, text, null, null));
          }
        }

        function updateTileSelection() {
          var selection = $scope.tileConfig.selectedItems;
          var selectedValue = "";
          var selected = null;
          if (selection && selection.length) {
            selected = selection[0];
            selectedValue = selected[selectionValueProperty];
          }
          $scope.selected = selected;
          //$scope.html = description ? marked(description) : "";
          if ($scope.entity[propertyName] !== selectedValue) {
            $scope.entity[propertyName] = selectedValue;
          }
          Core.$apply($scope);
        }


        function getSelection(value) {
          var answer = null;
          if (value) {
            angular.forEach($scope.archetypes, (pipeline) => {
              if (!answer && value === pipeline[selectionValueProperty]) {
                answer = pipeline;
              }
            });
          }
          return answer;
        }

        function entityChanged() {
          var archetype = $scope.entity[propertyName] || {};
          var value = angular.isString(archetype) ? archetype : archetype[selectionValueProperty];
          var initialSelection = getSelection(value);
          if (initialSelection) {
            if (useTiles) {
              $scope.tileConfig.selectedItems = [initialSelection];
              updateTileSelection();
            } else {
              $scope.tableConfig.selectedItems = [initialSelection];
              userSelectionChanged();
            }
          }
        }

        var first = true;

        function userSelectionChanged() {
          var selection = $scope.tableConfig.selectedItems;
          var selectedValue = "";
          var selected = null;
          if (selection && selection.length) {
            selected = selection[0];
            selectedValue = selected[selectionValueProperty];
          }

          // lets not clear the selection on startup when we have an empty selection
          if (selectedValue || !first) {
            if ($scope.entity[propertyName] !== selectedValue) {
              $scope.entity[propertyName] = selectedValue;
            }
            first = false;
          }
          $scope.selected = selected;
          Core.$apply($scope);
        }
      }]);
}
