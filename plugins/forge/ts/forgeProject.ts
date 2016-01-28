/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>

module Forge {

  export class ForgeProjectService {
    public projectId = "";
    public namespace = "";
    public overview: any = null;
    $scope: any = null;


    public hasBuilder(name) {
      var array = (this.overview || {}).builders;
      return angular.isArray(array) && array.indexOf(name) >= 0;
    }

    public hasPerspective(name) {
      var array = (this.overview || {}).perspectives;
      return angular.isArray(array) && array.indexOf(name) >= 0;
    }

    public updateProject($scope) {
      this.$scope = $scope;
      $scope.$forgeProject = this;

      var projectId = $scope.projectId;
      var namespace = $scope.namespace;
      if (this.projectId !== projectId || this.namespace !== namespace) {
        this.projectId = projectId;
        this.namespace = namespace;
        this.clearCache();
      }
    }

    clearCache() {
      this.overview = null;

      // lets reload the project overview
      var commandId = "devops-get-overview";
      var projectId = this.projectId;
      var request = {
        namespace: this.namespace,
        projectName: projectId,
        resource: "",
        inputList: [
          {
            format: "JSON"
          }
        ]
      };
      var onData = (jsonData) => {
        this.overview = jsonData;
        Core.$apply(this.$scope);
      };
      var $http = Kubernetes.inject("$http");
      var ForgeApiURL = Kubernetes.inject("ForgeApiURL");
      executeCommand(this.$scope, $http, ForgeApiURL, commandId, projectId, request, onData);
    }
  }
}
