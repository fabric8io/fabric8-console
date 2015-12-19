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
    $scope.namespace = $routeParams["namespace"] || $scope.namespace || Kubernetes.currentKubernetesNamespace();
    Kubernetes.setCurrentKubernetesNamespace($scope.namespace);
    $scope.projectId = $routeParams["project"];
    $scope.$workspaceLink = Developer.workspaceLink();
    $scope.$projectLink = Developer.projectLink($scope.projectId);
    $scope.breadcrumbConfig = Developer.createProjectBreadcrumbs($scope.projectId);
    $scope.subTabConfig = Developer.createProjectSubNavBars($scope.projectId);

    if ("project-new" === $scope.id) {
      $scope.breadcrumbConfig.push({
        label: "Create Project"
      });
    } else {
      $scope.breadcrumbConfig.push(_.last($scope.subTabConfig));
      $scope.breadcrumbConfig.push({
        label: "Forge",
        href: Forge.projectCommandsLink($scope.namespace, $scope.projectId)
      });
      if ($scope.id && $scope.id.startsWith("camel-")) {
        $scope.breadcrumbConfig.push({
          iconHtml: '<img class="menu-icon" src="/img/icons/camel.svg">',
          label: 'Camel',
          href: Forge.projectCamelOverviewLink($scope.namespace, $scope.projectId)
        });
      }
    }
    $scope.subTabConfig = [];
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

  export function projectCommandsLink(ns, projectId) {
    return Developer.projectWorkspaceLink(ns, projectId, "forge/commands", false);
  }

  export function projectPerspectiveLink(ns, projectId, page) {
    return Developer.projectWorkspaceLink(ns, projectId, UrlHelpers.join("forge", page), false);
  }

  export function projectCamelOverviewLink(ns, projectId) {
    return Forge.projectPerspectiveLink(ns, projectId, "camelOverview");
  }


  export function reposApiUrl(ForgeApiURL) {
    return UrlHelpers.join(ForgeApiURL, "/repos");
  }

  export function repoApiUrl(ForgeApiURL, path) {
    return UrlHelpers.join(ForgeApiURL, "/repos/user", path);
  }

  export function commandApiUrl(ForgeApiURL, commandId, ns, projectId, resourcePath = null) {
    return UrlHelpers.join(ForgeApiURL, "command", commandId, ns, projectId, resourcePath);
  }

  export function executeCommandApiUrl(ForgeApiURL, commandId) {
    return UrlHelpers.join(ForgeApiURL, "command", "execute", commandId);
  }

  export function validateCommandApiUrl(ForgeApiURL, commandId) {
    return UrlHelpers.join(ForgeApiURL, "command", "validate", commandId);
  }

  export function commandInputApiUrl(ForgeApiURL, commandId, ns, projectId, resourcePath) {
    if (ns && projectId) {
      return UrlHelpers.join(ForgeApiURL, "commandInput", commandId, ns, projectId, resourcePath);
    } else {
      return UrlHelpers.join(ForgeApiURL, "commandInput", commandId);
    }
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
    var config = {
      headers: {
      }
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

  export function createHttpUrl(projectId, url, authHeader = null, email = null) {
    var localStorage = Kubernetes.inject("localStorage") || {};
    var ns = Kubernetes.currentKubernetesNamespace();
    var secret = getProjectSourceSecret(localStorage, ns, projectId);
    var secretNS = getSourceSecretNamespace(localStorage);

    authHeader = authHeader || localStorage["gogsAuthorization"];
    email = email || localStorage["gogsEmail"];

    url = addQueryArgument(url, "_gogsAuth", authHeader);
    url = addQueryArgument(url, "_gogsEmail", email);
    url = addQueryArgument(url, "secret", secret);
    url = addQueryArgument(url, "secretNamespace", secretNS);
    return url;
  }

  export function commandMatchesText(command, filterText) {
    if (filterText) {
      return Core.matchFilterIgnoreCase(angular.toJson(command), filterText);
    } else {
      return true;
    }
  }

  export function isSourceSecretDefinedForProject(ns, projectId) {
    var localStorage = Kubernetes.inject("localStorage") || {};

    return getProjectSourceSecret(localStorage, ns, projectId);
/*
    var authHeader = localStorage["gogsAuthorization"];
    return authHeader ? true : false;
*/
  }

  export function redirectToSetupSecretsIfNotDefined($scope, $location) {
    var ns = $scope.namespace || Kubernetes.currentKubernetesNamespace();
    var projectId = $scope.projectId;

    if (!isSourceSecretDefinedForProject(ns, projectId)) {
      var loginPage = Developer.projectSecretsLink(ns, projectId) + "Required";
      log.info("No secret setup so redirecting to " + loginPage);
      $location.path(loginPage)
    }
  }

  /**
   * Executes a simple forge command that expects JSON results
   */
  export function executeCommand($scope, $http, ForgeApiURL, commandId, projectId, request, onData) {
    var url = executeCommandApiUrl(ForgeApiURL, commandId);
    url = createHttpUrl(projectId, url);
    log.info("About to post to " + url + " payload: " + angular.toJson(request));
    $http.post(url, request, createHttpConfig()).
    success(function (data, status, headers, config) {
      if (data) {
        if (data.status == "SUCCESS") {
          var message = data.message;
          if (message) {
            try {
              var jsonData = angular.fromJson(message);
              if (angular.isFunction(onData)) {
                onData(jsonData);
              } else {
                log.warn("onData is not a function!: " + onData);
              }
            } catch (e) {
              log.error("Failed to parse JSON result " + e + ". JSON: " + message);
            }
          }
        } else {
          log.warn("Failed to find camel data! " + data.status + " message: " + data.message);
        }
      }
      $scope.fetched = true;
      Core.$apply($scope);
    }).
    error(function (data, status, headers, config) {
      $scope.fetched = true;
      log.warn("Failed to load " + url + " " + data + " " + status);
      Core.$apply($scope);
    });
  }

  /**
   * Redirects to the forge command on the given page number with the input data
   */
  export function gotoCommand($location, projectId, commandId, resourcePath, input, pageNumber) {
    var href = commandLink(projectId, commandId, "");
    log.info("Navigating to forge page " + href + " with input " + angular.toJson(input) + " page " + pageNumber);
    $location.path(href);
    $location.search(input);
    if (pageNumber) {
      $location.search("_page", pageNumber);
    }
  }
}
