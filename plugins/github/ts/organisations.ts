/// <reference path="../../includes.ts"/>
/// <reference path="githubHelpers.ts"/>

module Github {

  export var OrganisationsController = controller("OrganisationsController", ["$scope", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$timeout", 'GithubOAuth', 'HawtioPreferences', 
  ($scope, $dialog, $window, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $timeout, GithubOAuth, HawtioPreferences) => {

    var oauth = $scope.oauth = GithubOAuth;
    $scope.prefs = HawtioPreferences;
    $scope.data = [];

    if (!oauth.hasToken()) {
      return;
    }

    $scope.fetched = false;

    $scope.tableConfig = {
      data: 'data',
      showSelectionCheckbox: false,
      enableRowClickSelection: true,
      selectedItems: [],
      filterOptions: {
        filterText: $location.search()["q"] || ''
      },
      columnDefs: [
        {
          field: 'login',
          cellTemplate: `
            <div>
              <img style="width: 32px; height: 32px;" ng-src="{{row.entity.avatar_url}}">&nbsp;<span ng-bind="row.entity.login"></span>
            </div>
          `,
          displayName: 'Name'
        }]
    };

    Github.initScope($scope, $location, $routeParams);

    function updateData() {
      $.ajax('https://api.github.com/user/orgs', <any>{
        method: 'GET',
        headers: {
          'Authorization': oauth.getHeader(),
        },
        success: (data) => {
          $scope.data = data;
        },
        error: (data) => {
          $scope.data = data;
        },
        complete: () => {
          $scope.fetched = true;
          Core.$apply($scope);
        },
        // super-important, otherwise the openshift bearer token will get used
        beforeSend: () => {}
      });
    }
    updateData();
  }]);
}
