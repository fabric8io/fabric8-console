/// <reference path="wikiPlugin.ts"/>
module Wiki {
  _module.controller('Wiki.OverviewDashboard', ($scope, $location, $routeParams) => {
    Wiki.initScope($scope, $routeParams, $location);
    $scope.dashboardEmbedded = true;
    $scope.dashboardId = '0';
    $scope.dashboardIndex = '0';
    $scope.dashboardRepository = {
      getType: () => 'GitWikiRepository',
      putDashboards: (array:any[], commitMessage:string, cb) => {
        return null;
      },
      deleteDashboards: (array:Array<Dashboard.Dashboard>, fn) => {
        return null;
      },
      getDashboards: (fn:(dashboards: Array<Dashboard.Dashboard>) => void) => {
        log.debug("getDashboards called");
        setTimeout(() => {
          fn([{
            group: 'Test',
            id: '0',
            title: 'Test',
            widgets: [{
              col: 1,
              id: 'w1',
              include: 'plugins/wiki/html/projectsCommitPanel.html',
              path: $location.path(),
              row: 1,
              search: $location.search(),
              size_x: 3,
              size_y: 2,
              title: 'Commits'
            }]
          }]);
        }, 1000);

      },
      getDashboard: (id:string, fn: (dashboard: Dashboard.Dashboard) => void) => {
        $scope.$watch('model.fetched', (fetched) => {
          if (!fetched) {
            return;
          }
          $scope.$watch('selectedBuild', (build) => {
            if (!build) {
              return;
            }
            $scope.$watch('entity', (entity) => {
              if (!entity) {
                return;
              }
              var model = $scope.$eval('model');
              console.log("Build: ", build);
              console.log("Model: ", model);
              console.log("Entity: ", entity);
              setTimeout(() => {
                var search = <Dashboard.SearchMap> {
                projectId: $scope.projectId,
                namespace: $scope.namespace,
                owner: $scope.owner,
                branch: $scope.branch,
                job: build.$jobId,
                id: $scope.projectId,
                build: build.id

                };
                var dashboard = {
                  group: 'Test',
                  id: '0',
                  title: 'Test',
                  widgets: [
                  {
                    col: 1,
                    row: 3,
                    id: 'w3',
                    include: 'plugins/kubernetes/html/pendingPipelines.html',
                    path: $location.path(),
                    search: search,
                    size_x: 9,
                    size_y: 1,
                    title: 'Pipelines'
                  },
                  {
                    col: 1,
                    row: 4,
                    id: 'w2',
                    include: 'plugins/developer/html/logPanel.html',
                    path: $location.path(),
                    search: search,
                    size_x: 4,
                    size_y: 2,
                    title: 'Logs for job: ' + build.$jobId + ' build: ' + build.id
                  },
                  {
                    col: 5,
                    id: 'w4',
                    include: 'plugins/wiki/html/projectCommitsPanel.html',
                    path: $location.path(),
                    row: 4,
                    search: search,
                    size_x: 5,
                    size_y: 2,
                    title: 'Commits'
                  }
                  ]
                };
                if (entity.environments.length) {
                  var colPosition = 1;
                  _.forEach(entity.environments, (env:any, index) => {
                    var s = <Dashboard.SearchMap> _.extend({
                      label: env.label
                    }, search);
                    dashboard.widgets.push({
                      id: env.url,
                      title: 'Environment: ' + env.label,
                      size_x: 3,
                      size_y: 2,
                      col: colPosition,
                      row: 1,
                      include: 'plugins/developer/html/environmentPanel.html',
                      path: $location.path(),
                      search: s
                    });
                    colPosition = colPosition + 3;
                  });
                }

                fn(dashboard);
              }, 1);
            });
          });
        });
      },
      createDashboard: (options:any) => {

      }
    };


  });
}
