/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>

/**
 * @module Wiki
 */
module Wiki {

  _module.controller("Wiki.HistoryController", ["$scope", "$location", "$routeParams", "$templateCache", "marked", "fileExtensionTypeRegistry",  ($scope, $location, $routeParams, $templateCache, marked, fileExtensionTypeRegistry) => {

    // TODO remove!
    var isFmc = false;
    var jolokia = null;

    Wiki.initScope($scope, $routeParams, $location);
    var wikiRepository = $scope.wikiRepository;

    $scope.fetched = false;

    // TODO we could configure this?
    $scope.dateFormat = 'EEE, MMM d, y at HH:mm:ss Z';
    //'yyyy-MM-dd HH:mm:ss Z'

    $scope.gridOptions = {
      data: 'logs',
      showFilter: false,
      enableRowClickSelection: true,
      multiSelect: true,
      selectedItems: [],
      showSelectionCheckbox: true,
      displaySelectionCheckbox : true, // old pre 2.0 config!
      filterOptions: {
        filterText: ''
      },
      columnDefs: [
        {
          field: '$date',
          displayName: 'Modified',
          defaultSort: true,
          ascending: false,
          cellTemplate: '<div class="ngCellText text-nowrap" title="{{row.entity.$date | date:\'EEE, MMM d, yyyy : HH:mm:ss Z\'}}">{{row.entity.$date.relative()}}</div>',
          width: "**"
        },
        {
          field: 'sha',
          displayName: 'Change',
          cellTemplate: '<div class="ngCellText text-nowrap"><a class="commit-link" ng-href="{{row.entity.commitLink}}{{hash}}" title="{{row.entity.sha}}">{{row.entity.sha | limitTo:7}} <i class="fa fa-arrow-circle-right"></i></a></div>',
          cellFilter: "",
          width: "*"
        },
        {
          field: 'author',
          displayName: 'Author',
          cellFilter: "",
          width: "**"
        },
        {
          field: 'short_message',
          displayName: 'Message',
          cellTemplate: '<div class="ngCellText text-nowrap" title="{{row.entity.short_message}}">{{row.entity.short_message}}</div>',
          width: "****"
        }
      ]
    };

    $scope.$on("$routeChangeSuccess", function (event, current, previous) {
      // lets do this asynchronously to avoid Error: $digest already in progress
      setTimeout(updateView, 50);
    });

    $scope.canRevert = () => {
      var selectedItems = $scope.gridOptions.selectedItems;
      return selectedItems.length === 1 && selectedItems[0] !== $scope.logs[0];
    };

    $scope.revert = () => {
      var selectedItems = $scope.gridOptions.selectedItems;
      if (selectedItems.length > 0) {
        var objectId = selectedItems[0].sha;
        if (objectId) {
          var commitMessage = "Reverting file " + $scope.pageId + " to previous version " + objectId;
          wikiRepository.revertTo($scope.branch, objectId, $scope.pageId, commitMessage, (result) => {
            Wiki.onComplete(result);
            // now lets update the view
            Core.notification('success', "Successfully reverted " + $scope.pageId);
            updateView();
          });
        }
        selectedItems.splice(0, selectedItems.length);
      }
    };

    $scope.diff = () => {
      var defaultValue = " ";
      var objectId = defaultValue;
      var selectedItems = $scope.gridOptions.selectedItems;
      if (selectedItems.length > 0) {
        objectId = selectedItems[0].sha || defaultValue;
      }
      var baseObjectId = defaultValue;
      if (selectedItems.length > 1) {
        baseObjectId = selectedItems[1].sha ||defaultValue;
        // make the objectId (the one that will start with b/ path) always newer than baseObjectId
        if (selectedItems[0].date < selectedItems[1].date) {
          var _ = baseObjectId;
          baseObjectId = objectId;
          objectId = _;
        }
      }
      var link = startLink($scope) + "/diff/" + objectId + "/" + baseObjectId + "/" + $scope.pageId;
      var path = Core.trimLeading(link, "#");
      $location.path(path);
    };

    updateView();

    function updateView() {
      var objectId = "";
      var limit = 0;

      $scope.git = wikiRepository.history($scope.branch, objectId, $scope.pageId, limit, (logArray) => {
        angular.forEach(logArray, (log) => {
          // lets use the shorter hash for links by default
          var commitId = log.sha;
          log.$date = Developer.asDate(log.date);
          log.commitLink = startLink($scope) + "/commitDetail/" + $scope.pageId + "/" + commitId;
        });
        $scope.logs = _.sortBy(logArray, "$date").reverse();
        $scope.fetched = true;
        Core.$apply($scope);
      });
      Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
    }
  }]);
}
