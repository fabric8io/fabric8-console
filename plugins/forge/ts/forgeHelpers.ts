// <reference path="../../includes.ts"/>
module Forge {

  export var context = '/workspaces/:namespace/forge';

  export var hash = '#' + context;
  export var pluginName = 'Forge';
  export var pluginPath = 'plugins/forge/';
  export var templatePath = pluginPath + 'html/';
  export var log:Logging.Logger = Logger.get(pluginName);

  export var defaultIconUrl = Core.url("/img/forge.svg");

  export var gogsServiceName = Kubernetes.gogsServiceName;
  export var orionServiceName = "orion";

  export var loggedInToGogs = false;

  export function isForge(workspace) {
    return true;
  }

  export function initScope($scope, $location, $routeParams) {
    $scope.projectId = $routeParams["project"];
    $scope.$workspaceLink = Developer.workspaceLink();
    $scope.$projectLink = Developer.projectLink($scope.projectId);
    $scope.breadcrumbConfig = Developer.createProjectBreadcrumbs($scope.projectId);
    $scope.subTabConfig = Developer.createProjectSubNavBars($scope.projectId);
  }

  export function commandLink(projectId, name, resourcePath) {
    var link = Developer.projectLink(projectId);
    if (name) {
      if (resourcePath) {
        return UrlHelpers.join(link, "/forge/command", name, resourcePath);
      } else {
        return UrlHelpers.join(link, "/forge/command/", name);
      }
    }
    return null;
  }

  export function commandsLink(resourcePath, projectId) {
    var link = Developer.projectLink(projectId);
    if (resourcePath) {
      return UrlHelpers.join(link, "/forge/commands/user", resourcePath);
    } else {
      return UrlHelpers.join(link, "/forge/commands");
    }
  }

  export function reposApiUrl(ForgeApiURL) {
    return UrlHelpers.join(ForgeApiURL, "/repos");
  }

  export function repoApiUrl(ForgeApiURL, path) {
    return UrlHelpers.join(ForgeApiURL, "/repos/user", path);
  }

  export function commandApiUrl(ForgeApiURL, commandId, resourcePath = null) {
    return UrlHelpers.join(ForgeApiURL, "command", commandId, resourcePath);
  }

  export function executeCommandApiUrl(ForgeApiURL, commandId) {
    return UrlHelpers.join(ForgeApiURL, "command", "execute", commandId);
  }

  export function validateCommandApiUrl(ForgeApiURL, commandId) {
    return UrlHelpers.join(ForgeApiURL, "command", "validate", commandId);
  }

  export function commandInputApiUrl(ForgeApiURL, commandId, resourcePath) {
    return UrlHelpers.join(ForgeApiURL, "commandInput", commandId, resourcePath);
  }



  /**
   * Returns the project for the given resource path
   */
  function modelProject(ForgeModel, resourcePath) {
    if (resourcePath) {
      var project = ForgeModel.projects[resourcePath];
      if (!project) {
        project = {};
        ForgeModel.projects[resourcePath] = project;
      }
      return project;
    } else {
      return ForgeModel.rootProject;
    }
  }

  export function setModelCommands(ForgeModel, resourcePath, commands) {
    var project = modelProject(ForgeModel, resourcePath);
    project.$commands = commands;
  }

  export function getModelCommands(ForgeModel, resourcePath) {
    var project = modelProject(ForgeModel, resourcePath);
    return project.$commands || [];
  }

  function modelCommandInputMap(ForgeModel, resourcePath) {
    var project = modelProject(ForgeModel, resourcePath);
    var commandInputs = project.$commandInputs;
    if (!commandInputs) {
      commandInputs = {};
      project.$commandInputs = commandInputs;
    }
    return commandInputs;
  }

  export function getModelCommandInputs(ForgeModel, resourcePath, id) {
    var commandInputs = modelCommandInputMap(ForgeModel, resourcePath);
    return commandInputs[id];
  }

  export function setModelCommandInputs(ForgeModel, resourcePath, id, item) {
    var commandInputs = modelCommandInputMap(ForgeModel, resourcePath);
    return commandInputs[id] = item;
  }

  export function enrichRepo(repo) {
    var owner = repo.owner || {};
    var user = owner.username || repo.user;
    var name = repo.name;
    var projectId = name;
    var avatar_url = owner.avatar_url;
    if (avatar_url && avatar_url.startsWith("http//")) {
      avatar_url = "http://" + avatar_url.substring(6);
      owner.avatar_url = avatar_url;
    }
    if (user && name) {
      var resourcePath = user + "/" + name;
      repo.$commandsLink = commandsLink(resourcePath, projectId);
      repo.$buildsLink = "/kubernetes/builds?q=/" + resourcePath + ".git";
      var injector = HawtioCore.injector;
      if (injector) {
        var ServiceRegistry = injector.get("ServiceRegistry");
        if (ServiceRegistry) {
          var orionLink = ServiceRegistry.serviceLink(orionServiceName);
          var gogsService = ServiceRegistry.findService(gogsServiceName);
          if (orionLink && gogsService) {
            var portalIp = gogsService.portalIP;
            if (portalIp) {
              var port = gogsService.port;
              var portText = (port && port !== 80 && port !== 443) ? ":" + port : "";
              var protocol = (port && port === 443) ? "https://" : "http://";
              var gitCloneUrl = UrlHelpers.join(protocol + portalIp + portText + "/", resourcePath + ".git");

              repo.$openProjectLink = UrlHelpers.join(orionLink,
                "/git/git-repository.html#,createProject.name=" + name + ",cloneGit=" + gitCloneUrl);
            }
          }
        }
      }
    }
  }

  export function createHttpConfig() {
    var authHeader = localStorage["gogsAuthorization"];
    var email = localStorage["gogsEmail"];
    var config = {
/*
      headers: {
        Authorization: authHeader,
        Email: email
      }
*/
    };
    return config;
  }

  function addQueryArgument(url, name, value) {
    if (url && name && value) {
      var sep =  (url.indexOf("?") >= 0) ? "&" : "?";
      return url + sep +  name + "=" + encodeURIComponent(value);
    }
    return url;
  }

  export function createHttpUrl(url, authHeader = null, email = null) {
    authHeader = authHeader || localStorage["gogsAuthorization"];
    email = email || localStorage["gogsEmail"];

    url = addQueryArgument(url, "_gogsAuth", authHeader);
    url = addQueryArgument(url, "_gogsEmail", email);
    return url;
  }

  export function commandMatchesText(command, filterText) {
    if (filterText) {
      return Core.matchFilterIgnoreCase(angular.toJson(command), filterText);
    } else {
      return true;
    }
  }

  export function isLoggedIntoGogs() {
    var authHeader = localStorage["gogsAuthorization"];
    return authHeader ? loggedInToGogs : false;
/*
    var config = createHttpConfig();
    return config.headers.Authorization ? true : false;
*/
  }

  export function redirectToGogsLoginIfRequired($scope, $location) {
    if (!isLoggedIntoGogs()) {
      var devLink = Developer.projectLink($scope.projectId);
      var loginPage = UrlHelpers.join(devLink, "forge/repos");
      log.info("Not logged in so redirecting to " + loginPage);
      $location.path(loginPage)
    }
  }
}
