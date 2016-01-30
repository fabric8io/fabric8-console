/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="secretHelpers.ts"/>

module Forge {

  export var CamelNodeController = controller("CamelNodeController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", "KubernetesModel",
    ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $http, $timeout, ForgeApiURL, ForgeModel, KubernetesModel) => {

      var node = $scope.node || {};
      var key = node.key;
      var children = node.children || [];

      if (children.length) {
        $scope.hasChildren = true;
        $scope.expandClass = "expandable closed";
        //$scope.expandClass = "expandable opened";
      }

      // TODO make this visible in the parent scope!
      var xml = $scope.xml || "META-INF/spring/camel-context.xml";
      var resourcePath = "";

      $scope.pattern = node.pattern;

      var addEndpointEnabled = true;
      var icon = camelIcons[$scope.pattern];
      $scope.label = node.label || $scope.pattern;
      $scope.description = node.description || $scope.pattern;

      switch ($scope.pattern) {
        case "camelContext":
          $scope.addRouteEnabled = true;
          icon = "/img/icons/camel/camel_route_folder.png";
           addEndpointEnabled = false;
          break;
        case "route":
          icon = "/img/icons/camel/camel.png";
          break;
        case "from":
        case "to":
          icon = "/img/icons/camel/endpoint24.png";
          addEndpointEnabled = false;
          var componentName = "";
          var uri = node.properties.uri;
          if (uri) {
            var parts = uri.split(":");
            if (parts && parts.length) {
              componentName = parts[0];
            }
          }
          icon = camelEndpointIcons[componentName];
          if (!icon) {
            icon =  camelEndpointIcons["core"] || "/img/icons/camel/endpoint24.png";
          }
          break;
        default:
          $scope.addRouteEnabled = false;
      }
      if (!icon) {
        icon = "/img/icons/camel/generic24.png";
      }
      $scope.addEndpointEnabled = addEndpointEnabled;
      $scope.addPatternEnabled = addEndpointEnabled;
      $scope.editEnabled = true;
      $scope.icon = icon;

      $scope.deletePrompt = () => {
        UI.multiItemConfirmActionDialog(<UI.MultiItemConfirmActionOptions>{
          collection: [node],
          index: 'label',
          onClose: (result:boolean) => {
            if (result) {
              doDelete();
            }
          },
          title: 'Delete Node',
          action: 'The following node will be deleted:',
          okText: 'Delete',
          okClass: 'btn-danger',
          custom: "This operation is permanent once completed!",
          customClass: "alert alert-warning"
        }).open();
      };

      function doDelete() {
        log.info("Deleting node " + key + " from xml " + xml);
        var commandId = "camel-delete-node-xml";
        var projectId = $scope.projectId;
        var request = {
          namespace: $scope.namespace,
          projectName: projectId,
          resource: "",
          inputList: [
            {
              node: key,
              xml: xml
            }
          ]
        };
        var onData = (jsonData) => {
          log.info("Deleted and got data: " + jsonData);
          $scope.updateData();
        };
        executeCommand($scope, $http, ForgeApiURL, commandId, projectId, request, onData, false);
      }

      $scope.deleteNode = () => {
        var input = {
          node: key,
          xml: xml
        };
        var nextCommand = "camel-delete-node-xml";
        var nextPage = 1;
        gotoCommand($location, $scope.projectId, nextCommand, resourcePath, input, nextPage);
      };

      $scope.editNode = () => {
        log.info("about to edit the node!");

        var input = {
          node: key,
          xml: xml
        };
        var nextCommand = "camel-edit-node-xml";
        var nextPage = 1;
        gotoCommand($location, $scope.projectId, nextCommand, resourcePath, input, nextPage);
      };

      $scope.addPatternNode = () => {
        var input = {
          parent: key,
          xml: xml
        };
        var nextCommand = "camel-add-node-xml";
        var nextPage = 1;
        gotoCommand($location, $scope.projectId, nextCommand, resourcePath, input, nextPage);
      };

      $scope.addEndpointNode = () => {
        var input = {
          node: key,
          xml: xml
        };
        var nextCommand = "camel-add-endpoint-xml";
        var nextPage = 1;
        gotoCommand($location, $scope.projectId, nextCommand, resourcePath, input, nextPage);
      };

      $scope.addRoute = () => {
        var input = {
          xml: xml
        };
        var nextCommand = "camel-add-route-xml";
        var nextPage = 1;
        gotoCommand($location, $scope.projectId, nextCommand, resourcePath, input, nextPage);
      };

    }]);
}
