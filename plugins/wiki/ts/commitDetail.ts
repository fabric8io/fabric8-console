/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>

/**
 * @module Wiki
 */
module Wiki {

  _module.controller("Wiki.CommitDetailController", ["$scope", "$location", "$routeParams", "$templateCache", "marked", "fileExtensionTypeRegistry", ($scope, $location, $routeParams, $templateCache, marked, fileExtensionTypeRegistry) => {

    // TODO remove!
    var isFmc = false;
    var jolokia = null;

    Wiki.initScope($scope, $routeParams, $location);
    var wikiRepository = $scope.wikiRepository;

    $scope.commitId = $scope.objectId;

    var options = {
      readOnly: true,
      mode: {
        name: 'diff'
      }
    };
    $scope.codeMirrorOptions = CodeEditor.createEditorSettings(options);

    $scope.$on("$routeChangeSuccess", function (event, current, previous) {
      // lets do this asynchronously to avoid Error: $digest already in progress
      setTimeout(updateView, 50);
    });

    $scope.$watch('workspace.tree', function () {
      if (!$scope.git) {
        // lets do this asynchronously to avoid Error: $digest already in progress
        //console.log("Reloading the view as we now seem to have a git mbean!");
        setTimeout(updateView, 50);
      }
    });


    $scope.canRevert = () => {
      return $scope.gridOptions.selectedItems.length === 1;
    };

    $scope.revert = () => {
      var selectedItems = $scope.gridOptions.selectedItems;
      if (selectedItems.length > 0) {
        var path = commitPath(selectedItems[0]);
        var objectId = $scope.commitId;
        if (path && objectId) {
          var commitMessage = "Reverting file " + $scope.pageId + " to previous version " + objectId;
          wikiRepository.revertTo($scope.branch, objectId, $scope.pageId, commitMessage, (result) => {
            Wiki.onComplete(result);
            // now lets update the view
            updateView();
          });
        }
      }
    };

    function commitPath(commit) {
      return commit.path || commit.name;
    }

    $scope.diff = () => {
      var selectedItems = $scope.gridOptions.selectedItems;
      if (selectedItems.length > 0) {
        var commit = selectedItems[0];
        /*
         var commit = row;
         var entity = row.entity;
         if (entity) {
         commit = entity;
         }
         */
        var otherCommitId = $scope.commitId;
        var link = UrlHelpers.join(startLink($scope),  "/diff/" + $scope.commitId + "/" + otherCommitId + "/" + commitPath(commit));
        var path = Core.trimLeading(link, "#");
        $location.path(path);
      }
    };

    updateView();

    function updateView() {
      var commitId = $scope.commitId;

      Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);

      wikiRepository.commitDetail(commitId, (commitDetail) => {
        if (commitDetail) {
          $scope.commitDetail = commitDetail;
          var commit = commitDetail.commit_info;
          $scope.commit = commit;
          if (commit) {
            commit.$date = Developer.asDate(commit.date);
          }
          angular.forEach(commitDetail.diffs, (diff) => {
            // TODO add link to view file link
          });
        }
        Core.$apply($scope);
      });
    }

/*
      wikiRepository.commitTree(commitId, (commits) => {
        $scope.commits = commits;
        angular.forEach(commits, (commit) => {
          commit.fileIconHtml = Wiki.fileIconHtml(commit);
          commit.fileClass = commit.name.endsWith(".profile") ? "green" : "";
          var changeType = commit.changeType;
          var path = commitPath(commit);
          if (path) {
            commit.fileLink = startLink($scope) + '/version/' + path + '/' + commitId;
          }
          commit.$diffLink = startLink($scope) + "/diff/" + commitId + "/" + commitId + "/" + (path || "");
          if (changeType) {
            changeType = changeType.toLowerCase();
            if (changeType.startsWith("a")) {
              commit.changeClass = "change-add";
              commit.change = "add";
              commit.title = "added";
            } else if (changeType.startsWith("d")) {
              commit.changeClass = "change-delete";
              commit.change = "delete";
              commit.title = "deleted";
              commit.fileLink = null;
            } else {
              commit.changeClass = "change-modify";
              commit.change = "modify";
              commit.title = "modified";
            }
            commit.changeTypeHtml = '<span class="' + commit.changeClass + '">' + commit.title + '</span>';
          }
        });
        Core.$apply($scope);
    }
    });
*/
  }]);
}
