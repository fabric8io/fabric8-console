/// <reference path="../../includes.ts"/>
/// <reference path="githubHelpers.ts"/>

module Github {

  export var OrganisationsController = controller("OrganisationsController", ["$scope", "$auth", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout",
    ($scope, $auth, $dialog, $window, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $http, $timeout) => {


      console.log("Token: ", $auth.getToken());

      $scope.authenticate = function () {
        var url = window.location.href;

        log.info("authenticating to redirect URL: " + url);

        $auth.authenticate("github", {
          clientId: githubClientId,
          redirectUri: url
        })
          .then(function (response) {
            log.info("authenticated!!!!!");

            $scope.token = Core.pathGet(response, ["config", "data", "code"]) || $auth.getToken();
            $auth.setToken($scope.token);

            $scope.authenticated = $auth.isAuthenticated();

            log.info("authenticated " + $scope.authenticated + " token: " + $scope.token);
          })
          .catch(function (response) {
            // Something went wrong.
          });
      };


      $scope.tableConfig = {
        data: 'model.builds',
        showSelectionCheckbox: true,
        enableRowClickSelection: false,
        multiSelect: true,
        selectedItems: [],
        filterOptions: {
          filterText: $location.search()["q"] || ''
        },
        columnDefs: [
          {
            field: 'name',
            // cellTemplate: $templateCache.get("buildLinkTemplate.html")
            displayName: 'Name'
          }]
      };

      Github.initScope($scope, $location, $routeParams);
      /*
       $scope.breadcrumbConfig = Developer.createProjectBreadcrumbs($scope.buildConfigId);
       $scope.subTabConfig = Developer.createProjectSubNavBars($scope.buildConfigId, null, $scope);
       */

      function updateData() {
        /*
         if ($scope.model) {
         var builds = $scope.model.builds;
         var buildConfigId = $scope.buildConfigId;

         enrichBuilds(builds);
         $scope.fetched = true;

         if (buildConfigId) {
         $scope.buildConfig = $scope.model.getBuildConfig(buildConfigId);
         }
         }
         */
      }

      updateData();
    }]);
}
