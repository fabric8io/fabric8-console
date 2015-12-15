/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {

  export var PipelinePicker = controller("PipelinePicker",
    ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
      ($scope, $templateCache:ng.ITemplateCacheService, $location:ng.ILocationService, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) => {

        var config = $scope.config || {};
        var properties = config.properties || {};
        var pipeline = properties.pipeline || {};
        $scope.pipelines = pipeline.typeaheadData;

        $scope.tableConfig = {
          data: 'pipelines',
          primaryKeyFn: (item) => item.value,
          showSelectionCheckbox: false,
          enableRowClickSelection: true,
          multiSelect: false,
          selectedItems: [],
          filterOptions: {
            filterText: ''
          },
          columnDefs: [
            {
              field: 'label',
              displayName: 'Pipeline',
              defaultSort: true
            },
            {
              field: 'environments',
              displayName: 'Environments',
              cellTemplate: $templateCache.get("devOpsPipelineChooserEnvironments.html")
            },
            {
              field: 'stages',
              displayName: 'Stages',
              cellTemplate: $templateCache.get("devOpsPipelineChooserStages.html")
            }
          ]
        };
        var pipeline = $scope.entity.pipeline || {};
        var pipelineValue = angular.isString(pipeline) ? pipeline : pipeline.value;
        var initialSelection = getSelection(pipelineValue);
        if (initialSelection) {
          $scope.tableConfig.selectedItems = [initialSelection];
          updateSelection();
          Core.$apply($scope);
        }

        function getSelection(value) {
          var answer = null;
          if (value) {
            angular.forEach($scope.pipelines, (pipeline) => {
              if (!answer && (value === pipeline.value || value === pipeline.label)) {
                answer = pipeline;
              }
            });
          }
          return answer;
        }

        $scope.$watchCollection("tableConfig.selectedItems", updateSelection);

        function updateSelection() {
          var selection = $scope.tableConfig.selectedItems;
          var selectedValue = "";
          var description = "";
          var selected = null;
          if (selection && selection.length) {
            selected = selection[0];
            selectedValue = selected.value;
            description = selected.descriptionMarkdown;
          }
          $scope.selected = selected;
          //log.info("==== Selected pipeline is: " + angular.toJson($scope.selected));
          $scope.html = description ? marked(description) : "";
          $scope.entity.pipeline = selectedValue;
          Core.$apply($scope);
        }
      }]);
}
