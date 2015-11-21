/// Copyright 2014-2015 Red Hat, Inc. and/or its affiliates
/// and other contributors as indicated by the @author tags.
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///   http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
/// <reference path="../libs/hawtio-utilities/defs.d.ts"/>
/// <reference path="../libs/hawtio-oauth/defs.d.ts"/>
/// <reference path="../libs/hawtio-kubernetes/defs.d.ts"/>
/// <reference path="../libs/hawtio-integration/defs.d.ts"/>
/// <reference path="../libs/hawtio-dashboard/defs.d.ts"/>

var Forge;
(function (Forge) {
    Forge.context = '/workspaces/:namespace/forge';
    Forge.hash = '#' + Forge.context;
    Forge.pluginName = 'Forge';
    Forge.pluginPath = 'plugins/forge/';
    Forge.templatePath = Forge.pluginPath + 'html/';
    Forge.log = Logger.get(Forge.pluginName);
    Forge.defaultIconUrl = Core.url("/img/forge.svg");
    Forge.gogsServiceName = Kubernetes.gogsServiceName;
    Forge.orionServiceName = "orion";
    Forge.loggedInToGogs = false;
    function isForge(workspace) {
        return true;
    }
    Forge.isForge = isForge;
    function initScope($scope, $location, $routeParams) {
        $scope.namespace = $routeParams["namespace"] || Kubernetes.currentKubernetesNamespace();
        $scope.projectId = $routeParams["project"];
        $scope.$workspaceLink = Developer.workspaceLink();
        $scope.$projectLink = Developer.projectLink($scope.projectId);
        $scope.breadcrumbConfig = Developer.createProjectBreadcrumbs($scope.projectId);
        $scope.subTabConfig = Developer.createProjectSubNavBars($scope.projectId);
    }
    Forge.initScope = initScope;
    function commandLink(projectId, name, resourcePath) {
        var link = Developer.projectLink(projectId);
        if (name) {
            if (resourcePath) {
                return UrlHelpers.join(link, "/forge/command", name, resourcePath);
            }
            else {
                return UrlHelpers.join(link, "/forge/command/", name);
            }
        }
        return null;
    }
    Forge.commandLink = commandLink;
    function commandsLink(resourcePath, projectId) {
        var link = Developer.projectLink(projectId);
        if (resourcePath) {
            return UrlHelpers.join(link, "/forge/commands/user", resourcePath);
        }
        else {
            return UrlHelpers.join(link, "/forge/commands");
        }
    }
    Forge.commandsLink = commandsLink;
    function reposApiUrl(ForgeApiURL) {
        return UrlHelpers.join(ForgeApiURL, "/repos");
    }
    Forge.reposApiUrl = reposApiUrl;
    function repoApiUrl(ForgeApiURL, path) {
        return UrlHelpers.join(ForgeApiURL, "/repos/user", path);
    }
    Forge.repoApiUrl = repoApiUrl;
    function commandApiUrl(ForgeApiURL, commandId, ns, projectId, resourcePath) {
        if (resourcePath === void 0) { resourcePath = null; }
        return UrlHelpers.join(ForgeApiURL, "command", commandId, ns, projectId, resourcePath);
    }
    Forge.commandApiUrl = commandApiUrl;
    function executeCommandApiUrl(ForgeApiURL, commandId) {
        return UrlHelpers.join(ForgeApiURL, "command", "execute", commandId);
    }
    Forge.executeCommandApiUrl = executeCommandApiUrl;
    function validateCommandApiUrl(ForgeApiURL, commandId) {
        return UrlHelpers.join(ForgeApiURL, "command", "validate", commandId);
    }
    Forge.validateCommandApiUrl = validateCommandApiUrl;
    function commandInputApiUrl(ForgeApiURL, commandId, ns, projectId, resourcePath) {
        if (ns && projectId) {
            return UrlHelpers.join(ForgeApiURL, "commandInput", commandId, ns, projectId, resourcePath);
        }
        else {
            return UrlHelpers.join(ForgeApiURL, "commandInput", commandId);
        }
    }
    Forge.commandInputApiUrl = commandInputApiUrl;
    function modelProject(ForgeModel, resourcePath) {
        if (resourcePath) {
            var project = ForgeModel.projects[resourcePath];
            if (!project) {
                project = {};
                ForgeModel.projects[resourcePath] = project;
            }
            return project;
        }
        else {
            return ForgeModel.rootProject;
        }
    }
    function setModelCommands(ForgeModel, resourcePath, commands) {
        var project = modelProject(ForgeModel, resourcePath);
        project.$commands = commands;
    }
    Forge.setModelCommands = setModelCommands;
    function getModelCommands(ForgeModel, resourcePath) {
        var project = modelProject(ForgeModel, resourcePath);
        return project.$commands || [];
    }
    Forge.getModelCommands = getModelCommands;
    function modelCommandInputMap(ForgeModel, resourcePath) {
        var project = modelProject(ForgeModel, resourcePath);
        var commandInputs = project.$commandInputs;
        if (!commandInputs) {
            commandInputs = {};
            project.$commandInputs = commandInputs;
        }
        return commandInputs;
    }
    function getModelCommandInputs(ForgeModel, resourcePath, id) {
        var commandInputs = modelCommandInputMap(ForgeModel, resourcePath);
        return commandInputs[id];
    }
    Forge.getModelCommandInputs = getModelCommandInputs;
    function setModelCommandInputs(ForgeModel, resourcePath, id, item) {
        var commandInputs = modelCommandInputMap(ForgeModel, resourcePath);
        return commandInputs[id] = item;
    }
    Forge.setModelCommandInputs = setModelCommandInputs;
    function enrichRepo(repo) {
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
                    var orionLink = ServiceRegistry.serviceLink(Forge.orionServiceName);
                    var gogsService = ServiceRegistry.findService(Forge.gogsServiceName);
                    if (orionLink && gogsService) {
                        var portalIp = gogsService.portalIP;
                        if (portalIp) {
                            var port = gogsService.port;
                            var portText = (port && port !== 80 && port !== 443) ? ":" + port : "";
                            var protocol = (port && port === 443) ? "https://" : "http://";
                            var gitCloneUrl = UrlHelpers.join(protocol + portalIp + portText + "/", resourcePath + ".git");
                            repo.$openProjectLink = UrlHelpers.join(orionLink, "/git/git-repository.html#,createProject.name=" + name + ",cloneGit=" + gitCloneUrl);
                        }
                    }
                }
            }
        }
    }
    Forge.enrichRepo = enrichRepo;
    function createHttpConfig() {
        var config = {
            headers: {}
        };
        return config;
    }
    Forge.createHttpConfig = createHttpConfig;
    function addQueryArgument(url, name, value) {
        if (url && name && value) {
            var sep = (url.indexOf("?") >= 0) ? "&" : "?";
            return url + sep + name + "=" + encodeURIComponent(value);
        }
        return url;
    }
    function createHttpUrl(projectId, url, authHeader, email) {
        if (authHeader === void 0) { authHeader = null; }
        if (email === void 0) { email = null; }
        var localStorage = Kubernetes.inject("localStorage") || {};
        var ns = Kubernetes.currentKubernetesNamespace();
        var secret = Forge.getProjectSourceSecret(localStorage, ns, projectId);
        var secretNS = Forge.getSourceSecretNamespace(localStorage);
        authHeader = authHeader || localStorage["gogsAuthorization"];
        email = email || localStorage["gogsEmail"];
        url = addQueryArgument(url, "_gogsAuth", authHeader);
        url = addQueryArgument(url, "_gogsEmail", email);
        url = addQueryArgument(url, "secret", secret);
        url = addQueryArgument(url, "secretNamespace", secretNS);
        return url;
    }
    Forge.createHttpUrl = createHttpUrl;
    function commandMatchesText(command, filterText) {
        if (filterText) {
            return Core.matchFilterIgnoreCase(angular.toJson(command), filterText);
        }
        else {
            return true;
        }
    }
    Forge.commandMatchesText = commandMatchesText;
    function isSourceSecretDefinedForProject(ns, projectId) {
        var localStorage = Kubernetes.inject("localStorage") || {};
        return Forge.getProjectSourceSecret(localStorage, ns, projectId);
    }
    Forge.isSourceSecretDefinedForProject = isSourceSecretDefinedForProject;
    function redirectToSetupSecretsIfNotDefined($scope, $location) {
        var ns = $scope.namespace || Kubernetes.currentKubernetesNamespace();
        var projectId = $scope.projectId;
        if (!isSourceSecretDefinedForProject(ns, projectId)) {
            var loginPage = Developer.projectSecretsLink(ns, projectId) + "Required";
            Forge.log.info("No secret setup so redirecting to " + loginPage);
            $location.path(loginPage);
        }
    }
    Forge.redirectToSetupSecretsIfNotDefined = redirectToSetupSecretsIfNotDefined;
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
var Forge;
(function (Forge) {
    Forge._module = angular.module(Forge.pluginName, ['hawtio-core', 'hawtio-ui']);
    Forge.controller = PluginHelpers.createControllerFunction(Forge._module, Forge.pluginName);
    Forge.route = PluginHelpers.createRoutingFunction(Forge.templatePath);
    Forge._module.config(['$routeProvider', function ($routeProvider) {
            console.log("Listening on: " + UrlHelpers.join(Forge.context, '/createProject'));
            $routeProvider.when(UrlHelpers.join(Forge.context, '/createProject'), Forge.route('createProject.html', false))
                .when(UrlHelpers.join(Forge.context, '/repos/:path*'), Forge.route('repo.html', false))
                .when(UrlHelpers.join(Forge.context, '/repos'), Forge.route('repos.html', false));
            angular.forEach([Forge.context, '/workspaces/:namespace/projects/:project/forge'], function (path) {
                $routeProvider
                    .when(UrlHelpers.join(path, '/commands'), Forge.route('commands.html', false))
                    .when(UrlHelpers.join(path, '/commands/:path*'), Forge.route('commands.html', false))
                    .when(UrlHelpers.join(path, '/command/:id'), Forge.route('command.html', false))
                    .when(UrlHelpers.join(path, '/command/:id/:path*'), Forge.route('command.html', false));
            });
            angular.forEach([Forge.context, '/workspaces/:namespace/projects/:project/forge', '/workspaces/:namespace/projects/forge'], function (path) {
                $routeProvider
                    .when(UrlHelpers.join(path, '/secrets'), Forge.route('secrets.html', false))
                    .when(UrlHelpers.join(path, '/secretsRequired'), Forge.route('secretsRequired.html', false));
            });
        }]);
    Forge._module.factory('ForgeApiURL', ['$q', '$rootScope', function ($q, $rootScope) {
            return Kubernetes.kubernetesApiUrl() + "/proxy" + Kubernetes.kubernetesNamespacePath() + "/services/fabric8-forge/api/forge";
        }]);
    Forge._module.factory('ForgeModel', ['$q', '$rootScope', function ($q, $rootScope) {
            return {
                rootProject: {},
                projects: []
            };
        }]);
    Forge._module.run(['viewRegistry', 'HawtioNav', function (viewRegistry, HawtioNav) {
            viewRegistry['forge'] = Forge.templatePath + 'layoutForge.html';
        }]);
    hawtioPluginLoader.addModule(Forge.pluginName);
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.CommandController = Forge.controller("CommandController", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
        function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) {
            $scope.model = ForgeModel;
            $scope.resourcePath = $routeParams["path"] || $location.search()["path"] || "";
            $scope.id = $routeParams["id"];
            $scope.path = $routeParams["path"];
            $scope.avatar_url = localStorage["gogsAvatarUrl"];
            $scope.user = localStorage["gogsUser"];
            $scope.repoName = "";
            var pathSteps = $scope.resourcePath.split("/");
            if (pathSteps && pathSteps.length) {
                $scope.repoName = pathSteps[pathSteps.length - 1];
            }
            Forge.initScope($scope, $location, $routeParams);
            if ($scope.id === "devops-edit") {
                $scope.breadcrumbConfig = Developer.createProjectSettingsBreadcrumbs($scope.projectId);
                $scope.subTabConfig = Developer.createProjectSettingsSubNavBars($scope.projectId);
            }
            Forge.redirectToSetupSecretsIfNotDefined($scope, $location);
            $scope.$completeLink = $scope.$projectLink;
            if ($scope.projectId) {
            }
            $scope.commandsLink = Forge.commandsLink($scope.resourcePath, $scope.projectId);
            $scope.completedLink = $scope.projectId ? UrlHelpers.join($scope.$projectLink, "environments") : $scope.$projectLink;
            $scope.entity = {};
            $scope.inputList = [$scope.entity];
            $scope.schema = Forge.getModelCommandInputs(ForgeModel, $scope.resourcePath, $scope.id);
            onSchemaLoad();
            function onRouteChanged() {
                console.log("route updated; lets clear the entity");
                $scope.entity = {};
                $scope.inputList = [$scope.entity];
                $scope.previousSchemaJson = "";
                $scope.schema = null;
                Core.$apply($scope);
                updateData();
            }
            $scope.$on('$routeChangeSuccess', onRouteChanged);
            $scope.execute = function () {
                $scope.response = null;
                $scope.executing = true;
                $scope.invalid = false;
                $scope.validationError = null;
                var commandId = $scope.id;
                var resourcePath = $scope.resourcePath;
                var url = Forge.executeCommandApiUrl(ForgeApiURL, commandId);
                var request = {
                    namespace: $scope.namespace,
                    projectName: $scope.projectId,
                    resource: resourcePath,
                    inputList: $scope.inputList
                };
                url = Forge.createHttpUrl($scope.projectId, url);
                Forge.log.info("About to post to " + url + " payload: " + angular.toJson(request));
                $http.post(url, request, Forge.createHttpConfig()).
                    success(function (data, status, headers, config) {
                    $scope.executing = false;
                    $scope.invalid = false;
                    $scope.validationError = null;
                    if (data) {
                        data.message = data.message || data.output;
                        var wizardResults = data.wizardResults;
                        if (wizardResults) {
                            angular.forEach(wizardResults.stepValidations, function (validation) {
                                if (!$scope.invalid && !validation.valid) {
                                    var messages = validation.messages || [];
                                    if (messages.length) {
                                        var message = messages[0];
                                        if (message) {
                                            $scope.invalid = true;
                                            $scope.validationError = message.description;
                                            $scope.validationInput = message.inputName;
                                        }
                                    }
                                }
                            });
                            var stepInputs = wizardResults.stepInputs;
                            if (stepInputs) {
                                var schema = _.last(stepInputs);
                                if (schema) {
                                    $scope.entity = {};
                                    function copyValuesFromSchema() {
                                        angular.forEach(schema["properties"], function (property, name) {
                                            var value = property.value;
                                            if (value) {
                                                Forge.log.info("Adding entity." + name + " = " + value);
                                                $scope.entity[name] = value;
                                            }
                                        });
                                    }
                                    copyValuesFromSchema();
                                    $scope.inputList.push($scope.entity);
                                    $timeout(function () {
                                        copyValuesFromSchema();
                                    }, 200);
                                    updateSchema(schema);
                                    if (data.canMoveToNextStep) {
                                        data = null;
                                    }
                                    else {
                                        $scope.wizardCompleted = true;
                                    }
                                }
                            }
                        }
                    }
                    if (!$scope.invalid) {
                        $scope.response = data;
                        var dataOrEmpty = (data || {});
                        var status = (dataOrEmpty.status || "").toString().toLowerCase();
                        $scope.responseClass = toBackgroundStyle(status);
                        var outputProperties = (dataOrEmpty.outputProperties || {});
                        var projectId = dataOrEmpty.projectName || outputProperties.fullName;
                        if ($scope.response && projectId && $scope.id === 'project-new') {
                            $scope.response = null;
                            if (!Forge.getProjectSourceSecret(localStorage, $scope.namespace, projectId)) {
                                var defaultSecretName = Forge.getProjectSourceSecret(localStorage, $scope.namespace, null);
                                Forge.setProjectSourceSecret(localStorage, $scope.namespace, projectId, defaultSecretName);
                            }
                            var editPath = UrlHelpers.join(Developer.projectLink(projectId), "/forge/command/devops-edit");
                            Forge.log.info("Moving to the secrets edit path: " + editPath);
                            $location.path(editPath);
                        }
                    }
                    Core.$apply($scope);
                }).
                    error(function (data, status, headers, config) {
                    $scope.executing = false;
                    Forge.log.warn("Failed to load " + url + " " + data + " " + status);
                });
            };
            $scope.$watchCollection("entity", function () {
                validate();
            });
            function updateSchema(schema) {
                if (schema) {
                    var schemaWithoutValues = angular.copy(schema);
                    angular.forEach(schemaWithoutValues.properties, function (property) {
                        delete property["value"];
                        delete property["enabled"];
                    });
                    var json = angular.toJson(schemaWithoutValues);
                    if (json !== $scope.previousSchemaJson) {
                        console.log("updated schema: " + json);
                        $scope.previousSchemaJson = json;
                        $scope.schema = schema;
                        if ($scope.id === "project-new") {
                            var entity = $scope.entity;
                            var properties = schema.properties || {};
                            var overwrite = properties.overwrite;
                            var catalog = properties.catalog;
                            var targetLocation = properties.targetLocation;
                            if (targetLocation) {
                                targetLocation.hidden = true;
                                if (overwrite) {
                                    overwrite.hidden = true;
                                }
                                console.log("hiding targetLocation!");
                                if (!entity.type) {
                                    entity.type = "From Archetype Catalog";
                                }
                            }
                            if (catalog) {
                                if (!entity.catalog) {
                                    entity.catalog = "fabric8";
                                }
                            }
                        }
                    }
                }
            }
            function validate() {
                if ($scope.executing || $scope.validating) {
                    return;
                }
                var newJson = angular.toJson($scope.entity);
                if (newJson === $scope.validatedEntityJson) {
                    return;
                }
                else {
                    $scope.validatedEntityJson = newJson;
                }
                var commandId = $scope.id;
                var resourcePath = $scope.resourcePath;
                var url = Forge.validateCommandApiUrl(ForgeApiURL, commandId);
                var inputList = [].concat($scope.inputList);
                inputList[inputList.length - 1] = $scope.entity;
                var request = {
                    namespace: $scope.namespace,
                    projectName: $scope.projectId,
                    resource: resourcePath,
                    inputList: $scope.inputList
                };
                url = Forge.createHttpUrl($scope.projectId, url);
                $scope.validating = true;
                $http.post(url, request, Forge.createHttpConfig()).
                    success(function (data, status, headers, config) {
                    this.validation = data;
                    var wizardResults = data.wizardResults;
                    if (wizardResults) {
                        var stepInputs = wizardResults.stepInputs;
                        if (stepInputs) {
                            var schema = _.last(stepInputs);
                            updateSchema(schema);
                        }
                    }
                    Core.$apply($scope);
                    $timeout(function () {
                        $scope.validating = false;
                        validate();
                    }, 200);
                }).
                    error(function (data, status, headers, config) {
                    $scope.executing = false;
                    Forge.log.warn("Failed to load " + url + " " + data + " " + status);
                });
            }
            updateData();
            function toBackgroundStyle(status) {
                if (!status) {
                    status = "";
                }
                if (status.startsWith("suc")) {
                    return "bg-success";
                }
                return "bg-warning";
            }
            function updateData() {
                $scope.item = null;
                var commandId = $scope.id;
                if (commandId) {
                    var resourcePath = $scope.resourcePath;
                    var url = Forge.commandInputApiUrl(ForgeApiURL, commandId, $scope.namespace, $scope.projectId, resourcePath);
                    url = Forge.createHttpUrl($scope.projectId, url);
                    $http.get(url, Forge.createHttpConfig()).
                        success(function (data, status, headers, config) {
                        if (data) {
                            $scope.fetched = true;
                            console.log("updateData loaded schema");
                            updateSchema(data);
                            Forge.setModelCommandInputs(ForgeModel, $scope.resourcePath, $scope.id, $scope.schema);
                            onSchemaLoad();
                        }
                        Core.$apply($scope);
                    }).
                        error(function (data, status, headers, config) {
                        Forge.log.warn("Failed to load " + url + " " + data + " " + status);
                    });
                }
                else {
                    Core.$apply($scope);
                }
            }
            function onSchemaLoad() {
                var schema = $scope.schema;
                $scope.fetched = schema;
                var entity = $scope.entity;
                if (schema) {
                    angular.forEach(schema.properties, function (property, key) {
                        var value = property.value;
                        if (value && !entity[key]) {
                            entity[key] = value;
                        }
                    });
                }
            }
        }]);
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.CommandsController = Forge.controller("CommandsController", ["$scope", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
        function ($scope, $dialog, $window, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL, ForgeModel) {
            $scope.model = ForgeModel;
            $scope.resourcePath = $routeParams["path"] || $location.search()["path"] || "";
            $scope.repoName = "";
            $scope.projectDescription = $scope.resourcePath || "";
            var pathSteps = $scope.projectDescription.split("/");
            if (pathSteps && pathSteps.length) {
                $scope.repoName = pathSteps[pathSteps.length - 1];
            }
            if (!$scope.projectDescription.startsWith("/") && $scope.projectDescription.length > 0) {
                $scope.projectDescription = "/" + $scope.projectDescription;
            }
            $scope.avatar_url = localStorage["gogsAvatarUrl"];
            $scope.user = localStorage["gogsUser"];
            $scope.commands = Forge.getModelCommands(ForgeModel, $scope.resourcePath);
            $scope.fetched = $scope.commands.length !== 0;
            Forge.initScope($scope, $location, $routeParams);
            Forge.redirectToSetupSecretsIfNotDefined($scope, $location);
            $scope.tableConfig = {
                data: 'commands',
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
                        displayName: 'Name',
                        cellTemplate: $templateCache.get("idTemplate.html")
                    },
                    {
                        field: 'description',
                        displayName: 'Description'
                    },
                    {
                        field: 'category',
                        displayName: 'Category'
                    }
                ]
            };
            function commandMatches(command) {
                var filterText = $scope.tableConfig.filterOptions.filterText;
                return Forge.commandMatchesText(command, filterText);
            }
            $scope.commandSelector = {
                filterText: "",
                folders: [],
                selectedCommands: [],
                expandedFolders: {},
                isOpen: function (folder) {
                    var filterText = $scope.tableConfig.filterOptions.filterText;
                    if (filterText !== '' || $scope.commandSelector.expandedFolders[folder.id]) {
                        return "opened";
                    }
                    return "closed";
                },
                clearSelected: function () {
                    $scope.commandSelector.expandedFolders = {};
                    Core.$apply($scope);
                },
                updateSelected: function () {
                    var selectedCommands = [];
                    angular.forEach($scope.model.appFolders, function (folder) {
                        var apps = folder.apps.filter(function (app) { return app.selected; });
                        if (apps) {
                            selectedCommands = selectedCommands.concat(apps);
                        }
                    });
                    $scope.commandSelector.selectedCommands = selectedCommands.sortBy("name");
                },
                select: function (command, flag) {
                    var id = command.name;
                    $scope.commandSelector.updateSelected();
                },
                getSelectedClass: function (app) {
                    if (app.abstract) {
                        return "abstract";
                    }
                    if (app.selected) {
                        return "selected";
                    }
                    return "";
                },
                showCommand: function (command) {
                    return commandMatches(command);
                },
                showFolder: function (folder) {
                    var filterText = $scope.tableConfig.filterOptions.filterText;
                    return !filterText || folder.commands.some(function (app) { return commandMatches(app); });
                }
            };
            var url = UrlHelpers.join(ForgeApiURL, "commands", $scope.namespace, $scope.projectId, $scope.resourcePath);
            url = Forge.createHttpUrl($scope.projectId, url);
            Forge.log.info("Fetching commands from: " + url);
            $http.get(url, Forge.createHttpConfig()).
                success(function (data, status, headers, config) {
                if (angular.isArray(data) && status === 200) {
                    var resourcePath = $scope.resourcePath;
                    var folderMap = {};
                    var folders = [];
                    $scope.commands = _.sortBy(data, "name");
                    angular.forEach($scope.commands, function (command) {
                        var id = command.id || command.name;
                        command.$link = Forge.commandLink($scope.projectId, id, resourcePath);
                        var name = command.name || command.id;
                        var folderName = command.category;
                        var shortName = name;
                        var names = name.split(":", 2);
                        if (names != null && names.length > 1) {
                            folderName = names[0];
                            shortName = names[1].trim();
                        }
                        if (folderName === "Project/Build") {
                            folderName = "Project";
                        }
                        command.$shortName = shortName;
                        command.$folderName = folderName;
                        var folder = folderMap[folderName];
                        if (!folder) {
                            folder = {
                                name: folderName,
                                commands: []
                            };
                            folderMap[folderName] = folder;
                            folders.push(folder);
                        }
                        folder.commands.push(command);
                    });
                    folders = _.sortBy(folders, "name");
                    angular.forEach(folders, function (folder) {
                        folder.commands = _.sortBy(folder.commands, "$shortName");
                    });
                    $scope.commandSelector.folders = folders;
                    Forge.setModelCommands($scope.model, $scope.resourcePath, $scope.commands);
                    $scope.fetched = true;
                }
            }).
                error(function (data, status, headers, config) {
                Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
            });
        }]);
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.RepoController = Forge.controller("RepoController", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL",
        function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL) {
            $scope.name = $routeParams["path"];
            Forge.initScope($scope, $location, $routeParams);
            Forge.redirectToSetupSecretsIfNotDefined($scope, $location);
            $scope.$on('$routeUpdate', function ($event) {
                updateData();
            });
            updateData();
            function updateData() {
                if ($scope.name) {
                    var url = Forge.repoApiUrl(ForgeApiURL, $scope.name);
                    url = Forge.createHttpUrl($scope.projectId, url);
                    var config = Forge.createHttpConfig();
                    $http.get(url, config).
                        success(function (data, status, headers, config) {
                        if (data) {
                            Forge.enrichRepo(data);
                        }
                        $scope.entity = data;
                        $scope.fetched = true;
                    }).
                        error(function (data, status, headers, config) {
                        Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
                    });
                }
                else {
                    $scope.fetched = true;
                }
            }
        }]);
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.ReposController = Forge.controller("ReposController", ["$scope", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "KubernetesModel", "ServiceRegistry",
        function ($scope, $dialog, $window, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL, KubernetesModel, ServiceRegistry) {
            $scope.model = KubernetesModel;
            $scope.resourcePath = $routeParams["path"];
            $scope.commandsLink = function (path) { return Forge.commandsLink(path, $scope.projectId); };
            Forge.initScope($scope, $location, $routeParams);
            $scope.breadcrumbConfig.push({
                label: "Create Project"
            });
            $scope.subTabConfig = [];
            $scope.$on('kubernetesModelUpdated', function () {
                updateLinks();
                Core.$apply($scope);
            });
            var projectId = null;
            var ns = $scope.namespace;
            $scope.sourceSecret = Forge.getProjectSourceSecret(localStorage, ns, projectId);
            $scope.tableConfig = {
                data: 'projects',
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
                        displayName: 'Repository Name',
                        cellTemplate: $templateCache.get("repoTemplate.html")
                    },
                    {
                        field: 'actions',
                        displayName: 'Actions',
                        cellTemplate: $templateCache.get("repoActionsTemplate.html")
                    }
                ]
            };
            $scope.login = {
                authHeader: localStorage["gogsAuthorization"] || "",
                relogin: false,
                avatar_url: localStorage["gogsAvatarUrl"] || "",
                user: localStorage["gogsUser"] || "",
                password: "",
                email: localStorage["gogsEmail"] || ""
            };
            $scope.doLogin = function () {
                var login = $scope.login;
                var user = login.user;
                var password = login.password;
                if (user && password) {
                    var userPwd = user + ':' + password;
                    login.authHeader = 'Basic ' + (userPwd.encodeBase64());
                    updateData();
                }
            };
            $scope.logout = function () {
                delete localStorage["gogsAuthorization"];
                $scope.login.authHeader = null;
                $scope.login.loggedIn = false;
                $scope.login.failed = false;
                Forge.loggedInToGogs = false;
            };
            $scope.openCommands = function () {
                var resourcePath = null;
                var selected = $scope.tableConfig.selectedItems;
                if (_.isArray(selected) && selected.length) {
                    resourcePath = selected[0].path;
                }
                var link = Forge.commandsLink(resourcePath, $scope.projectId);
                Forge.log.info("moving to commands link: " + link);
                $location.path(link);
            };
            $scope.delete = function (projects) {
                UI.multiItemConfirmActionDialog({
                    collection: projects,
                    index: 'path',
                    onClose: function (result) {
                        if (result) {
                            doDelete(projects);
                        }
                    },
                    title: 'Delete projects?',
                    action: 'The following projects will be removed (though the files will remain on your file system):',
                    okText: 'Delete',
                    okClass: 'btn-danger',
                    custom: "This operation is permanent once completed!",
                    customClass: "alert alert-warning"
                }).open();
            };
            updateLinks();
            function doDelete(projects) {
                angular.forEach(projects, function (project) {
                    Forge.log.info("Deleting " + angular.toJson($scope.projects));
                    var path = project.path;
                    if (path) {
                        var url = Forge.repoApiUrl(ForgeApiURL, path);
                        $http.delete(url).
                            success(function (data, status, headers, config) {
                            updateData();
                        }).
                            error(function (data, status, headers, config) {
                            Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
                            var message = "Failed to POST to " + url + " got status: " + status;
                            Core.notification('error', message);
                        });
                    }
                });
            }
            function updateLinks() {
                var $gogsLink = ServiceRegistry.serviceReadyLink(Forge.gogsServiceName);
                if ($gogsLink) {
                    $scope.signUpUrl = UrlHelpers.join($gogsLink, "user/sign_up");
                    $scope.forgotPasswordUrl = UrlHelpers.join($gogsLink, "user/forget_password");
                }
                $scope.$gogsLink = $gogsLink;
                $scope.$forgeLink = ServiceRegistry.serviceReadyLink(Kubernetes.fabric8ForgeServiceName);
                $scope.$hasCDPipelineTemplate = _.any($scope.model.templates, function (t) { return "cd-pipeline" === Kubernetes.getName(t); });
                var expectedRCS = [Kubernetes.gogsServiceName, Kubernetes.fabric8ForgeServiceName, Kubernetes.jenkinsServiceName];
                var requiredRCs = {};
                var ns = Kubernetes.currentKubernetesNamespace();
                var runningCDPipeline = true;
                angular.forEach(expectedRCS, function (rcName) {
                    var rc = $scope.model.getReplicationController(ns, rcName);
                    if (rc) {
                        requiredRCs[rcName] = rc;
                    }
                    else {
                        runningCDPipeline = false;
                    }
                });
                $scope.$requiredRCs = requiredRCs;
                $scope.$runningCDPipeline = runningCDPipeline;
                var url = "";
                $location = Kubernetes.inject("$location");
                if ($location) {
                    url = $location.url();
                }
                if (!url) {
                    url = window.location.toString();
                }
                var templateNamespace = "default";
                $scope.$runCDPipelineLink = "/kubernetes/namespace/" + templateNamespace + "/templates/" + ns + "?q=cd-pipeline&returnTo=" + encodeURIComponent(url);
            }
            function updateData() {
                var authHeader = $scope.login.authHeader;
                var email = $scope.login.email || "";
                if (authHeader) {
                    var url = Forge.reposApiUrl(ForgeApiURL);
                    url = Forge.createHttpUrl($scope.projectId, url, authHeader, email);
                    var config = {};
                    $http.get(url, config).
                        success(function (data, status, headers, config) {
                        $scope.login.failed = false;
                        $scope.login.loggedIn = true;
                        Forge.loggedInToGogs = true;
                        var avatar_url = null;
                        if (status === 200) {
                            if (!data || !angular.isArray(data)) {
                                data = [];
                            }
                            localStorage["gogsAuthorization"] = authHeader;
                            localStorage["gogsEmail"] = email;
                            localStorage["gogsUser"] = $scope.login.user || "";
                            $scope.projects = _.sortBy(data, "name");
                            angular.forEach($scope.projects, function (repo) {
                                Forge.enrichRepo(repo);
                                if (!avatar_url) {
                                    avatar_url = Core.pathGet(repo, ["owner", "avatar_url"]);
                                    if (avatar_url) {
                                        $scope.login.avatar_url = avatar_url;
                                        localStorage["gogsAvatarUrl"] = avatar_url;
                                    }
                                }
                            });
                            $scope.fetched = true;
                        }
                    }).
                        error(function (data, status, headers, config) {
                        $scope.logout();
                        $scope.login.failed = true;
                        if (status !== 403) {
                            Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
                        }
                    });
                }
            }
            updateData();
        }]);
})(Forge || (Forge = {}));

// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
var Forge;
(function (Forge) {
    var secretNamespaceKey = "fabric8SourceSecretNamespace";
    var secretNameKey = "fabric8SourceSecret";
    function getSourceSecretNamespace(localStorage) {
        var secretNamespace = localStorage[secretNamespaceKey];
        var userName = Kubernetes.currentUserName();
        if (!secretNamespace) {
            secretNamespace = "user-secrets-source-" + userName;
        }
        return secretNamespace;
    }
    Forge.getSourceSecretNamespace = getSourceSecretNamespace;
    function getProjectSourceSecret(localStorage, ns, projectId) {
        if (!ns) {
            ns = Kubernetes.currentKubernetesNamespace();
        }
        var secretKey = createLocalStorageKey(secretNameKey, ns, projectId);
        var sourceSecret = localStorage[secretKey];
        return sourceSecret;
    }
    Forge.getProjectSourceSecret = getProjectSourceSecret;
    function setProjectSourceSecret(localStorage, ns, projectId, secretName) {
        var secretKey = createLocalStorageKey(secretNameKey, ns, projectId);
        localStorage[secretKey] = secretName;
    }
    Forge.setProjectSourceSecret = setProjectSourceSecret;
    function parseUrl(url) {
        if (url) {
            var parser = document.createElement('a');
            parser.href = url;
            return parser;
        }
        return {
            protocol: "",
            host: ""
        };
    }
    Forge.parseUrl = parseUrl;
    function createLocalStorageKey(prefix, ns, name) {
        return prefix + "/" + ns + "/" + (name || "");
    }
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="secretHelpers.ts"/>
var Forge;
(function (Forge) {
    Forge.SecretsController = Forge.controller("SecretsController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", "KubernetesModel",
        function ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL, ForgeModel, KubernetesModel) {
            $scope.model = KubernetesModel;
            Forge.initScope($scope, $location, $routeParams);
            $scope.breadcrumbConfig = Developer.createProjectSettingsBreadcrumbs($scope.projectId);
            $scope.subTabConfig = Developer.createProjectSettingsSubNavBars($scope.projectId);
            var projectId = $scope.projectId;
            var ns = $scope.namespace;
            var userName = Kubernetes.currentUserName();
            $scope.sourceSecret = Forge.getProjectSourceSecret(localStorage, ns, projectId);
            var createdSecret = $location.search()["secret"];
            var projectClient = Kubernetes.createKubernetesClient("projects");
            $scope.sourceSecretNamespace = Forge.getSourceSecretNamespace(localStorage);
            $scope.setupSecretsLink = Developer.projectSecretsLink(ns, projectId);
            $scope.secretNamespaceLink = Developer.secretsNamespaceLink(ns, projectId, $scope.sourceSecretNamespace);
            Forge.log.debug("Found source secret namespace " + $scope.sourceSecretNamespace);
            Forge.log.debug("Found source secret for " + ns + "/" + projectId + " = " + $scope.sourceSecret);
            $scope.$on('$routeUpdate', function ($event) {
                updateData();
            });
            $scope.$on('kubernetesModelUpdated', function () {
                updateData();
            });
            $scope.tableConfig = {
                data: 'filteredSecrets',
                showSelectionCheckbox: true,
                enableRowClickSelection: true,
                multiSelect: false,
                selectedItems: [],
                filterOptions: {
                    filterText: $location.search()["q"] || ''
                },
                columnDefs: [
                    {
                        field: '_key',
                        displayName: 'Secret Name',
                        defaultSort: true,
                        cellTemplate: '<div class="ngCellText nowrap">{{row.entity.metadata.name}}</div>'
                    },
                    {
                        field: '$labelsText',
                        displayName: 'Labels',
                        cellTemplate: $templateCache.get("labelTemplate.html")
                    },
                ]
            };
            if (createdSecret) {
                $location.search("secret", null);
                $scope.selectedSecretName = createdSecret;
            }
            else {
                selectedSecretName();
            }
            $scope.$watchCollection("tableConfig.selectedItems", function () {
                selectedSecretName();
            });
            function updateData() {
                checkNamespaceCreated();
                updateProject();
                Core.$apply($scope);
            }
            checkNamespaceCreated();
            function selectedSecretName() {
                $scope.selectedSecretName = createdSecret || Forge.getProjectSourceSecret(localStorage, ns, projectId);
                var selectedItems = $scope.tableConfig.selectedItems;
                if (selectedItems && selectedItems.length) {
                    var secret = selectedItems[0];
                    var name_1 = Kubernetes.getName(secret);
                    if (name_1) {
                        $scope.selectedSecretName = name_1;
                        if (createdSecret && name_1 !== createdSecret) {
                            createdSecret = null;
                        }
                    }
                }
                return $scope.selectedSecretName;
            }
            $scope.cancel = function () {
                var selectedItems = $scope.tableConfig.selectedItems;
                selectedItems.splice(0, selectedItems.length);
                var current = createdSecret || Forge.getProjectSourceSecret(localStorage, ns, projectId);
                if (current) {
                    angular.forEach($scope.personalSecrets, function (secret) {
                        if (!selectedItems.length && current === Kubernetes.getName(secret)) {
                            selectedItems.push(secret);
                        }
                    });
                }
                $scope.tableConfig.selectedItems = selectedItems;
                selectedSecretName();
            };
            $scope.canSave = function () {
                var selected = selectedSecretName();
                var current = Forge.getProjectSourceSecret(localStorage, ns, projectId);
                return selected && selected !== current;
            };
            $scope.save = function () {
                var selected = selectedSecretName();
                if (selected) {
                    Forge.setProjectSourceSecret(localStorage, ns, projectId, selected);
                    if (!projectId) {
                        $location.path(Developer.createProjectLink(ns));
                    }
                }
            };
            checkNamespaceCreated();
            function updateProject() {
                angular.forEach($scope.model.buildconfigs, function (project) {
                    if (projectId === Kubernetes.getName(project)) {
                        $scope.project = project;
                    }
                });
                $scope.gitUrl = Core.pathGet($scope.project, ['spec', 'source', 'git', 'uri']);
                var parser = Forge.parseUrl($scope.gitUrl);
                var kind = parser.protocol;
                if (!$scope.gitUrl) {
                    kind = "https";
                }
                else if ($scope.gitUrl && $scope.gitUrl.startsWith("git@")) {
                    kind = "ssh";
                }
                var host = parser.host;
                var requiredDataKeys = Kubernetes.sshSecretDataKeys;
                if (kind && kind.startsWith('http')) {
                    kind = 'https';
                    requiredDataKeys = Kubernetes.httpsSecretDataKeys;
                }
                else {
                    kind = 'ssh';
                }
                $scope.kind = kind;
                var savedUrl = $location.path();
                var newSecretPath = UrlHelpers.join("namespace", $scope.sourceSecretNamespace, "secretCreate?kind=" + kind + "&savedUrl=" + savedUrl);
                $scope.addNewSecretLink = (projectId) ?
                    Developer.projectWorkspaceLink(ns, projectId, newSecretPath) :
                    UrlHelpers.join(HawtioCore.documentBase(), Kubernetes.context, newSecretPath);
                var filteredSecrets = [];
                angular.forEach($scope.personalSecrets, function (secret) {
                    var data = secret.data;
                    if (data) {
                        var valid = true;
                        angular.forEach(requiredDataKeys, function (key) {
                            if (!data[key]) {
                                valid = false;
                            }
                        });
                        if (valid) {
                            filteredSecrets.push(secret);
                        }
                    }
                    $scope.filteredSecrets = _.sortBy(filteredSecrets, "_key");
                });
            }
            function onPersonalSecrets(secrets) {
                Forge.log.info("got secrets!");
                $scope.personalSecrets = secrets;
                $scope.fetched = true;
                $scope.cancel();
                updateProject();
                Core.$apply($scope);
            }
            function onBuildConfigs(buildconfigs) {
                if (onBuildConfigs && !($scope.model.buildconfigs || []).length) {
                    $scope.model.buildconfigs = buildconfigs;
                }
                updateProject();
            }
            function checkNamespaceCreated() {
                var namespaceName = $scope.sourceSecretNamespace;
                function watchSecrets() {
                    Forge.log.info("watching secrets on namespace: " + namespaceName);
                    Kubernetes.watch($scope, $element, "secrets", namespaceName, onPersonalSecrets);
                    Kubernetes.watch($scope, $element, "buildconfigs", ns, onBuildConfigs);
                    Core.$apply($scope);
                }
                if (!$scope.secretNamespace) {
                    angular.forEach($scope.model.projects, function (project) {
                        var name = Kubernetes.getName(project);
                        if (name === namespaceName) {
                            $scope.secretNamespace = project;
                            watchSecrets();
                        }
                    });
                }
                if (!$scope.secretNamespace && $scope.model.projects && $scope.model.projects.length) {
                    Forge.log.info("Creating a new namespace for the user secrets.... " + namespaceName);
                    var project = {
                        apiVersion: Kubernetes.defaultApiVersion,
                        kind: "Project",
                        metadata: {
                            name: namespaceName,
                            labels: {
                                user: userName,
                                group: 'secrets',
                                project: 'source'
                            }
                        }
                    };
                    projectClient.put(project, function (data) {
                        $scope.secretNamespace = project;
                        watchSecrets();
                    }, function (err) {
                        Core.notification('error', "Failed to create secret namespace: " + namespaceName + "\n" + err);
                    });
                }
            }
        }]);
})(Forge || (Forge = {}));

/// Copyright 2014-2015 Red Hat, Inc. and/or its affiliates
/// and other contributors as indicated by the @author tags.
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///   http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
/// <reference path="../../includes.ts"/>
var Main;
(function (Main) {
    Main.pluginName = "fabric8-console";
    Main.log = Logger.get(Main.pluginName);
    Main.templatePath = "plugins/main/html";
    Main.chatServiceName = "letschat";
    Main.grafanaServiceName = "grafana";
    Main.appLibraryServiceName = "app-library";
    Main.version = {};
})(Main || (Main = {}));

/// Copyright 2014-2015 Red Hat, Inc. and/or its affiliates
/// and other contributors as indicated by the @author tags.
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///   http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
/// <reference path="../../includes.ts"/>
/// <reference path="../../forge/ts/forgeHelpers.ts"/>
/// <reference path="mainGlobals.ts"/>
var Main;
(function (Main) {
    Main._module = angular.module(Main.pluginName, [Forge.pluginName]);
    var tab = undefined;
    Main._module.run(["$rootScope", "HawtioNav", "KubernetesModel", "ServiceRegistry", "preferencesRegistry", function ($rootScope, HawtioNav, KubernetesModel, ServiceRegistry, preferencesRegistry) {
        HawtioNav.on(HawtioMainNav.Actions.CHANGED, Main.pluginName, function (items) {
            items.forEach(function (item) {
                switch (item.id) {
                    case 'forge':
                    case 'jvm':
                    case 'wiki':
                    case 'docker-registry':
                        item.isValid = function () { return false; };
                }
            });
        });
        HawtioNav.add({
            id: 'library',
            title: function () { return 'Library'; },
            tooltip: function () { return 'View the library of applications'; },
            isValid: function () { return ServiceRegistry.hasService(Main.appLibraryServiceName) && ServiceRegistry.hasService("app-library-jolokia"); },
            href: function () { return "/wiki/view"; },
            isActive: function () { return false; }
        });
        var kibanaServiceName = Kubernetes.kibanaServiceName;
        HawtioNav.add({
            id: 'kibana',
            title: function () { return 'Logs'; },
            tooltip: function () { return 'View and search all logs across all containers using Kibana and ElasticSearch'; },
            isValid: function () { return ServiceRegistry.hasService(kibanaServiceName); },
            href: function () { return Kubernetes.kibanaLogsLink(ServiceRegistry); },
            isActive: function () { return false; }
        });
        HawtioNav.add({
            id: 'apiman',
            title: function () { return 'API Management'; },
            tooltip: function () { return 'Add Policies and Plans to your APIs with Apiman'; },
            isValid: function () { return ServiceRegistry.hasService('apiman'); },
            oldHref: function () { },
            href: function () {
                var hash = {
                    backTo: new URI().toString(),
                    token: HawtioOAuth.getOAuthToken()
                };
                var uri = new URI(ServiceRegistry.serviceLink('apiman'));
                uri.port('80').query({}).path('apimanui/index.html').hash(URI.encode(angular.toJson(hash)));
                return uri.toString();
            }
        });
        HawtioNav.add({
            id: 'grafana',
            title: function () { return 'Metrics'; },
            tooltip: function () { return 'Views metrics across all containers using Grafana and InfluxDB'; },
            isValid: function () { return ServiceRegistry.hasService(Main.grafanaServiceName); },
            href: function () { return ServiceRegistry.serviceLink(Main.grafanaServiceName); },
            isActive: function () { return false; }
        });
        HawtioNav.add({
            id: "chat",
            title: function () { return 'Chat'; },
            tooltip: function () { return 'Chat room for discussing this namespace'; },
            isValid: function () { return ServiceRegistry.hasService(Main.chatServiceName); },
            href: function () {
                var answer = ServiceRegistry.serviceLink(Main.chatServiceName);
                if (answer) {
                }
                return answer;
            },
            isActive: function () { return false; }
        });
        preferencesRegistry.addTab('About ' + Main.version.name, UrlHelpers.join(Main.templatePath, 'about.html'));
        Main.log.info("started, version: ", Main.version.version);
        Main.log.info("commit ID: ", Main.version.commitId);
    }]);
    hawtioPluginLoader.registerPreBootstrapTask(function (next) {
        $.ajax({
            url: 'version.json?rev=' + Date.now(),
            success: function (data) {
                try {
                    Main.version = angular.fromJson(data);
                }
                catch (err) {
                    Main.version = {
                        name: 'fabric8-console',
                        version: ''
                    };
                }
                next();
            },
            error: function (jqXHR, text, status) {
                Main.log.debug("Failed to fetch version: jqXHR: ", jqXHR, " text: ", text, " status: ", status);
                next();
            },
            dataType: "html"
        });
    });
    hawtioPluginLoader.addModule(Main.pluginName);
})(Main || (Main = {}));

/// <reference path="mainGlobals.ts"/>
/// <reference path="mainPlugin.ts"/>
var Main;
(function (Main) {
    Main._module.controller('Main.About', ["$scope", function ($scope) {
        $scope.info = Main.version;
    }]);
})(Main || (Main = {}));

/// <reference path="../../includes.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.log = Logger.get("Wiki");
    Wiki.camelNamespaces = ["http://camel.apache.org/schema/spring", "http://camel.apache.org/schema/blueprint"];
    Wiki.springNamespaces = ["http://www.springframework.org/schema/beans"];
    Wiki.droolsNamespaces = ["http://drools.org/schema/drools-spring"];
    Wiki.dozerNamespaces = ["http://dozer.sourceforge.net"];
    Wiki.activemqNamespaces = ["http://activemq.apache.org/schema/core"];
    Wiki.useCamelCanvasByDefault = false;
    Wiki.excludeAdjustmentPrefixes = ["http://", "https://", "#"];
    (function (ViewMode) {
        ViewMode[ViewMode["List"] = 0] = "List";
        ViewMode[ViewMode["Icon"] = 1] = "Icon";
    })(Wiki.ViewMode || (Wiki.ViewMode = {}));
    var ViewMode = Wiki.ViewMode;
    ;
    Wiki.customWikiViewPages = ["/formTable", "/camel/diagram", "/camel/canvas", "/camel/properties", "/dozer/mappings"];
    Wiki.hideExtensions = [".profile"];
    var defaultFileNamePattern = /^[a-zA-Z0-9._-]*$/;
    var defaultFileNamePatternInvalid = "Name must be: letters, numbers, and . _ or - characters";
    var defaultFileNameExtensionPattern = "";
    var defaultLowerCaseFileNamePattern = /^[a-z0-9._-]*$/;
    var defaultLowerCaseFileNamePatternInvalid = "Name must be: lower-case letters, numbers, and . _ or - characters";
    Wiki.documentTemplates = [
        {
            label: "Folder",
            tooltip: "Create a new folder to contain documents",
            folder: true,
            icon: "/img/icons/wiki/folder.gif",
            exemplar: "myfolder",
            regex: defaultLowerCaseFileNamePattern,
            invalid: defaultLowerCaseFileNamePatternInvalid
        },
        {
            label: "Properties File",
            tooltip: "A properties file typically used to configure Java classes",
            exemplar: "properties-file.properties",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".properties"
        },
        {
            label: "JSON File",
            tooltip: "A file containing JSON data",
            exemplar: "document.json",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".json"
        },
        {
            label: "Markdown Document",
            tooltip: "A basic markup document using the Markdown wiki markup, particularly useful for ReadMe files in directories",
            exemplar: "ReadMe.md",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".md"
        },
        {
            label: "Text Document",
            tooltip: "A plain text file",
            exemplar: "document.text",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".txt"
        },
        {
            label: "HTML Document",
            tooltip: "A HTML document you can edit directly using the HTML markup",
            exemplar: "document.html",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".html"
        },
        {
            label: "XML Document",
            tooltip: "An empty XML document",
            exemplar: "document.xml",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".xml"
        },
        {
            label: "Integration Flows",
            tooltip: "Camel routes for defining your integration flows",
            children: [
                {
                    label: "Camel XML document",
                    tooltip: "A vanilla Camel XML document for integration flows",
                    icon: "/img/icons/camel.svg",
                    exemplar: "camel.xml",
                    regex: defaultFileNamePattern,
                    invalid: defaultFileNamePatternInvalid,
                    extension: ".xml"
                },
                {
                    label: "Camel OSGi Blueprint XML document",
                    tooltip: "A vanilla Camel XML document for integration flows when using OSGi Blueprint",
                    icon: "/img/icons/camel.svg",
                    exemplar: "camel-blueprint.xml",
                    regex: defaultFileNamePattern,
                    invalid: defaultFileNamePatternInvalid,
                    extension: ".xml"
                },
                {
                    label: "Camel Spring XML document",
                    tooltip: "A vanilla Camel XML document for integration flows when using the Spring framework",
                    icon: "/img/icons/camel.svg",
                    exemplar: "camel-spring.xml",
                    regex: defaultFileNamePattern,
                    invalid: defaultFileNamePatternInvalid,
                    extension: ".xml"
                }
            ]
        },
        {
            label: "Data Mapping Document",
            tooltip: "Dozer based configuration of mapping documents",
            icon: "/img/icons/dozer/dozer.gif",
            exemplar: "dozer-mapping.xml",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".xml"
        }
    ];
    function isFMCContainer(workspace) {
        return false;
    }
    Wiki.isFMCContainer = isFMCContainer;
    function isWikiEnabled(workspace, jolokia, localStorage) {
        return true;
    }
    Wiki.isWikiEnabled = isWikiEnabled;
    function goToLink(link, $timeout, $location) {
        var href = Core.trimLeading(link, "#");
        $timeout(function () {
            Wiki.log.debug("About to navigate to: " + href);
            $location.url(href);
        }, 100);
    }
    Wiki.goToLink = goToLink;
    function customViewLinks($scope) {
        var prefix = Core.trimLeading(Wiki.startLink($scope), "#");
        return Wiki.customWikiViewPages.map(function (path) { return prefix + path; });
    }
    Wiki.customViewLinks = customViewLinks;
    function createWizardTree(workspace, $scope) {
        var root = createFolder("New Documents");
        addCreateWizardFolders(workspace, $scope, root, Wiki.documentTemplates);
        return root;
    }
    Wiki.createWizardTree = createWizardTree;
    function createFolder(name) {
        return {
            name: name,
            children: []
        };
    }
    function addCreateWizardFolders(workspace, $scope, parent, templates) {
        angular.forEach(templates, function (template) {
            if (template.generated) {
                if (template.generated.init) {
                    template.generated.init(workspace, $scope);
                }
            }
            var title = template.label || key;
            var node = createFolder(title);
            node.parent = parent;
            node.entity = template;
            var addClass = template.addClass;
            if (addClass) {
                node.addClass = addClass;
            }
            var key = template.exemplar;
            var parentKey = parent.key || "";
            node.key = parentKey ? parentKey + "_" + key : key;
            var icon = template.icon;
            if (icon) {
                node.icon = Core.url(icon);
            }
            var tooltip = template["tooltip"] || template["description"] || '';
            node.tooltip = tooltip;
            if (template["folder"]) {
                node.isFolder = function () { return true; };
            }
            parent.children.push(node);
            var children = template.children;
            if (children) {
                addCreateWizardFolders(workspace, $scope, node, children);
            }
        });
    }
    Wiki.addCreateWizardFolders = addCreateWizardFolders;
    function startWikiLink(projectId, branch) {
        var start = UrlHelpers.join(Developer.projectLink(projectId), "/wiki");
        if (branch) {
            start = UrlHelpers.join(start, 'branch', branch);
        }
        return start;
    }
    Wiki.startWikiLink = startWikiLink;
    function startLink($scope) {
        var projectId = $scope.projectId;
        var branch = $scope.branch;
        return startWikiLink(projectId, branch);
    }
    Wiki.startLink = startLink;
    function isIndexPage(path) {
        return path && (path.endsWith("index.md") || path.endsWith("index.html") || path.endsWith("index")) ? true : false;
    }
    Wiki.isIndexPage = isIndexPage;
    function viewLink($scope, pageId, $location, fileName) {
        if (fileName === void 0) { fileName = null; }
        var link = null;
        var start = startLink($scope);
        if (pageId) {
            var view = isIndexPage(pageId) ? "/book/" : "/view/";
            link = start + view + encodePath(Core.trimLeading(pageId, "/"));
        }
        else {
            var path = $location.path();
            link = "#" + path.replace(/(edit|create)/, "view");
        }
        if (fileName && pageId && pageId.endsWith(fileName)) {
            return link;
        }
        if (fileName) {
            if (!link.endsWith("/")) {
                link += "/";
            }
            link += fileName;
        }
        return link;
    }
    Wiki.viewLink = viewLink;
    function branchLink($scope, pageId, $location, fileName) {
        if (fileName === void 0) { fileName = null; }
        return viewLink($scope, pageId, $location, fileName);
    }
    Wiki.branchLink = branchLink;
    function editLink($scope, pageId, $location) {
        var link = null;
        var format = Wiki.fileFormat(pageId);
        switch (format) {
            case "image":
                break;
            default:
                var start = startLink($scope);
                if (pageId) {
                    link = start + "/edit/" + encodePath(pageId);
                }
                else {
                    var path = $location.path();
                    link = "#" + path.replace(/(view|create)/, "edit");
                }
        }
        return link;
    }
    Wiki.editLink = editLink;
    function createLink($scope, pageId, $location) {
        var path = $location.path();
        var start = startLink($scope);
        var link = '';
        if (pageId) {
            link = start + "/create/" + encodePath(pageId);
        }
        else {
            link = "#" + path.replace(/(view|edit|formTable)/, "create");
        }
        var idx = link.lastIndexOf("/");
        if (idx > 0 && !$scope.children && !path.startsWith("/wiki/formTable")) {
            link = link.substring(0, idx + 1);
        }
        return link;
    }
    Wiki.createLink = createLink;
    function encodePath(pageId) {
        return pageId.split("/").map(encodeURIComponent).join("/");
    }
    Wiki.encodePath = encodePath;
    function decodePath(pageId) {
        return pageId.split("/").map(decodeURIComponent).join("/");
    }
    Wiki.decodePath = decodePath;
    function fileFormat(name, fileExtensionTypeRegistry) {
        var extension = fileExtension(name);
        if (name) {
            if (name === "Jenkinsfile") {
                extension = "groovy";
            }
        }
        var answer = null;
        if (!fileExtensionTypeRegistry) {
            fileExtensionTypeRegistry = HawtioCore.injector.get("fileExtensionTypeRegistry");
        }
        angular.forEach(fileExtensionTypeRegistry, function (array, key) {
            if (array.indexOf(extension) >= 0) {
                answer = key;
            }
        });
        return answer;
    }
    Wiki.fileFormat = fileFormat;
    function fileName(path) {
        if (path) {
            var idx = path.lastIndexOf("/");
            if (idx > 0) {
                return path.substring(idx + 1);
            }
        }
        return path;
    }
    Wiki.fileName = fileName;
    function fileParent(path) {
        if (path) {
            var idx = path.lastIndexOf("/");
            if (idx > 0) {
                return path.substring(0, idx);
            }
        }
        return "";
    }
    Wiki.fileParent = fileParent;
    function hideFileNameExtensions(name) {
        if (name) {
            angular.forEach(Wiki.hideExtensions, function (extension) {
                if (name.endsWith(extension)) {
                    name = name.substring(0, name.length - extension.length);
                }
            });
        }
        return name;
    }
    Wiki.hideFileNameExtensions = hideFileNameExtensions;
    function gitRestURL($scope, path) {
        var url = gitRelativeURL($scope, path);
        url = Core.url('/' + url);
        return url;
    }
    Wiki.gitRestURL = gitRestURL;
    function gitUrlPrefix() {
        var prefix = "";
        var injector = HawtioCore.injector;
        if (injector) {
            prefix = injector.get("WikiGitUrlPrefix") || "";
        }
        return prefix;
    }
    function gitRelativeURL($scope, path) {
        var branch = $scope.branch;
        var prefix = gitUrlPrefix();
        branch = branch || "master";
        path = path || "/";
        return UrlHelpers.join(prefix, "git/" + branch, path);
    }
    Wiki.gitRelativeURL = gitRelativeURL;
    function fileIconHtml(row) {
        var name = row.name;
        var path = row.path;
        var branch = row.branch;
        var directory = row.directory;
        var xmlNamespaces = row.xml_namespaces || row.xmlNamespaces;
        var iconUrl = row.iconUrl;
        var entity = row.entity;
        if (entity) {
            name = name || entity.name;
            path = path || entity.path;
            branch = branch || entity.branch;
            directory = directory || entity.directory;
            xmlNamespaces = xmlNamespaces || entity.xml_namespaces || entity.xmlNamespaces;
            iconUrl = iconUrl || entity.iconUrl;
        }
        branch = branch || "master";
        var css = null;
        var icon = null;
        var extension = fileExtension(name);
        if (xmlNamespaces && xmlNamespaces.length) {
            if (xmlNamespaces.any(function (ns) { return Wiki.camelNamespaces.any(ns); })) {
                icon = "img/icons/camel.svg";
            }
            else if (xmlNamespaces.any(function (ns) { return Wiki.dozerNamespaces.any(ns); })) {
                icon = "img/icons/dozer/dozer.gif";
            }
            else if (xmlNamespaces.any(function (ns) { return Wiki.activemqNamespaces.any(ns); })) {
                icon = "img/icons/messagebroker.svg";
            }
            else {
                Wiki.log.debug("file " + name + " has namespaces " + xmlNamespaces);
            }
        }
        if (!iconUrl && name) {
            var lowerName = name.toLowerCase();
            if (lowerName == "pom.xml") {
                iconUrl = "img/maven-icon.png";
            }
            else if (lowerName == "jenkinsfile") {
                iconUrl = "img/jenkins-icon.svg";
            }
            else if (lowerName == "fabric8.yml") {
                iconUrl = "img/fabric8_icon.svg";
            }
        }
        if (iconUrl) {
            css = null;
            icon = iconUrl;
        }
        if (!icon) {
            if (directory) {
                switch (extension) {
                    case 'profile':
                        css = "fa fa-book";
                        break;
                    default:
                        css = "fa fa-folder folder-icon";
                }
            }
            else {
                switch (extension) {
                    case 'java':
                        icon = "img/java.svg";
                        break;
                    case 'png':
                    case 'svg':
                    case 'jpg':
                    case 'gif':
                        css = null;
                        icon = Wiki.gitRelativeURL(branch, path);
                        break;
                    case 'json':
                    case 'xml':
                        css = "fa fa-file-text";
                        break;
                    case 'md':
                        css = "fa fa-file-text-o";
                        break;
                    default:
                        css = "fa fa-file-o";
                }
            }
        }
        if (icon) {
            return "<img src='" + Core.url(icon) + "'>";
        }
        else {
            return "<i class='" + css + "'></i>";
        }
    }
    Wiki.fileIconHtml = fileIconHtml;
    function iconClass(row) {
        var name = row.getProperty("name");
        var extension = fileExtension(name);
        var directory = row.getProperty("directory");
        if (directory) {
            return "fa fa-folder";
        }
        if ("xml" === extension) {
            return "fa fa-cog";
        }
        else if ("md" === extension) {
            return "fa fa-file-text-o";
        }
        return "fa fa-file-o";
    }
    Wiki.iconClass = iconClass;
    function initScope($scope, $routeParams, $location) {
        $scope.pageId = Wiki.pageId($routeParams, $location);
        $scope.projectId = $routeParams["projectId"] || $scope.id;
        $scope.namespace = $routeParams["namespace"] || $scope.namespace;
        $scope.owner = $routeParams["owner"];
        $scope.repoId = $routeParams["repoId"];
        $scope.branch = $routeParams["branch"] || $location.search()["branch"];
        $scope.objectId = $routeParams["objectId"] || $routeParams["diffObjectId1"];
        $scope.startLink = startLink($scope);
        $scope.$viewLink = viewLink($scope, $scope.pageId, $location);
        $scope.historyLink = startLink($scope) + "/history/" + ($scope.pageId || "");
        $scope.wikiRepository = new Wiki.GitWikiRepository($scope);
        $scope.$workspaceLink = Developer.workspaceLink();
        $scope.$projectLink = Developer.projectLink($scope.projectId);
        $scope.breadcrumbConfig = Developer.createProjectBreadcrumbs($scope.projectId, Wiki.createSourceBreadcrumbs($scope));
        $scope.subTabConfig = Developer.createProjectSubNavBars($scope.projectId);
    }
    Wiki.initScope = initScope;
    function loadBranches(jolokia, wikiRepository, $scope, isFmc) {
        if (isFmc === void 0) { isFmc = false; }
        wikiRepository.branches(function (response) {
            $scope.branches = response.sortBy(function (v) { return Core.versionToSortableString(v); }, true);
            if (!$scope.branch && $scope.branches.find(function (branch) {
                return branch === "master";
            })) {
                $scope.branch = "master";
            }
            Core.$apply($scope);
        });
    }
    Wiki.loadBranches = loadBranches;
    function pageId($routeParams, $location) {
        var pageId = $routeParams['page'];
        if (!pageId) {
            for (var i = 0; i < 100; i++) {
                var value = $routeParams['path' + i];
                if (angular.isDefined(value)) {
                    if (!pageId) {
                        pageId = value;
                    }
                    else {
                        pageId += "/" + value;
                    }
                }
                else
                    break;
            }
            return pageId || "/";
        }
        if (!pageId) {
            pageId = pageIdFromURI($location.path());
        }
        return pageId;
    }
    Wiki.pageId = pageId;
    function pageIdFromURI(url) {
        var wikiPrefix = "/wiki/";
        if (url && url.startsWith(wikiPrefix)) {
            var idx = url.indexOf("/", wikiPrefix.length + 1);
            if (idx > 0) {
                return url.substring(idx + 1, url.length);
            }
        }
        return null;
    }
    Wiki.pageIdFromURI = pageIdFromURI;
    function fileExtension(name) {
        if (name.indexOf('#') > 0)
            name = name.substring(0, name.indexOf('#'));
        return Core.fileExtension(name, "markdown");
    }
    Wiki.fileExtension = fileExtension;
    function onComplete(status) {
        console.log("Completed operation with status: " + JSON.stringify(status));
    }
    Wiki.onComplete = onComplete;
    function parseJson(text) {
        if (text) {
            try {
                return JSON.parse(text);
            }
            catch (e) {
                Core.notification("error", "Failed to parse JSON: " + e);
            }
        }
        return null;
    }
    Wiki.parseJson = parseJson;
    function adjustHref($scope, $location, href, fileExtension) {
        var extension = fileExtension ? "." + fileExtension : "";
        var path = $location.path();
        var folderPath = path;
        var idx = path.lastIndexOf("/");
        if (idx > 0) {
            var lastName = path.substring(idx + 1);
            if (lastName.indexOf(".") >= 0) {
                folderPath = path.substring(0, idx);
            }
        }
        if (href.startsWith('../')) {
            var parts = href.split('/');
            var pathParts = folderPath.split('/');
            var parents = parts.filter(function (part) {
                return part === "..";
            });
            parts = parts.last(parts.length - parents.length);
            pathParts = pathParts.first(pathParts.length - parents.length);
            return '#' + pathParts.join('/') + '/' + parts.join('/') + extension + $location.hash();
        }
        if (href.startsWith('/')) {
            return Wiki.branchLink($scope, href + extension, $location) + extension;
        }
        if (!Wiki.excludeAdjustmentPrefixes.any(function (exclude) {
            return href.startsWith(exclude);
        })) {
            return '#' + folderPath + "/" + href + extension + $location.hash();
        }
        else {
            return null;
        }
    }
    Wiki.adjustHref = adjustHref;
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.pluginName = 'wiki';
    Wiki.templatePath = 'plugins/wiki/html/';
    Wiki.tab = null;
    Wiki._module = angular.module(Wiki.pluginName, ['hawtio-core', 'hawtio-ui', 'treeControl', 'ui.codemirror']);
    Wiki.controller = PluginHelpers.createControllerFunction(Wiki._module, 'Wiki');
    Wiki.route = PluginHelpers.createRoutingFunction(Wiki.templatePath);
    Wiki._module.config(["$routeProvider", function ($routeProvider) {
            angular.forEach(["", "/branch/:branch"], function (path) {
                var startContext = '/workspaces/:namespace/projects/:projectId/wiki';
                $routeProvider.
                    when(UrlHelpers.join(startContext, path, 'view'), Wiki.route('viewPage.html', false)).
                    when(UrlHelpers.join(startContext, path, 'create/:page*'), Wiki.route('create.html', false)).
                    when(startContext + path + '/view/:page*', { templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false }).
                    when(startContext + path + '/book/:page*', { templateUrl: 'plugins/wiki/html/viewBook.html', reloadOnSearch: false }).
                    when(startContext + path + '/edit/:page*', { templateUrl: 'plugins/wiki/html/editPage.html' }).
                    when(startContext + path + '/version/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/viewPage.html' }).
                    when(startContext + path + '/history/:page*', { templateUrl: 'plugins/wiki/html/history.html' }).
                    when(startContext + path + '/commit/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/commit.html' }).
                    when(startContext + path + '/commitDetail/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/commitDetail.html' }).
                    when(startContext + path + '/diff/:diffObjectId1/:diffObjectId2/:page*', { templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false }).
                    when(startContext + path + '/formTable/:page*', { templateUrl: 'plugins/wiki/html/formTable.html' }).
                    when(startContext + path + '/dozer/mappings/:page*', { templateUrl: 'plugins/wiki/html/dozerMappings.html' }).
                    when(startContext + path + '/configurations/:page*', { templateUrl: 'plugins/wiki/html/configurations.html' }).
                    when(startContext + path + '/configuration/:pid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' }).
                    when(startContext + path + '/newConfiguration/:factoryPid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' }).
                    when(startContext + path + '/camel/diagram/:page*', { templateUrl: 'plugins/wiki/html/camelDiagram.html' }).
                    when(startContext + path + '/camel/canvas/:page*', { templateUrl: 'plugins/wiki/html/camelCanvas.html' }).
                    when(startContext + path + '/camel/properties/:page*', { templateUrl: 'plugins/wiki/html/camelProperties.html' });
            });
        }]);
    Wiki._module.factory('wikiBranchMenu', function () {
        var self = {
            items: [],
            addExtension: function (item) {
                self.items.push(item);
            },
            applyMenuExtensions: function (menu) {
                if (self.items.length === 0) {
                    return;
                }
                var extendedMenu = [{
                        heading: "Actions"
                    }];
                self.items.forEach(function (item) {
                    if (item.valid()) {
                        extendedMenu.push(item);
                    }
                });
                if (extendedMenu.length > 1) {
                    menu.add(extendedMenu);
                }
            }
        };
        return self;
    });
    Wiki._module.factory('WikiGitUrlPrefix', function () {
        return "";
    });
    Wiki._module.factory('fileExtensionTypeRegistry', function () {
        return {
            "image": ["svg", "png", "ico", "bmp", "jpg", "gif"],
            "markdown": ["md", "markdown", "mdown", "mkdn", "mkd"],
            "htmlmixed": ["html", "xhtml", "htm"],
            "text/x-java": ["java"],
            "text/x-groovy": ["groovy"],
            "text/x-scala": ["scala"],
            "javascript": ["js", "json", "javascript", "jscript", "ecmascript", "form"],
            "xml": ["xml", "xsd", "wsdl", "atom"],
            "text/x-yaml": ["yaml", "yml"],
            "properties": ["properties"]
        };
    });
    Wiki._module.filter('fileIconClass', function () { return Wiki.iconClass; });
    Wiki._module.run(["$location", "viewRegistry", "localStorage", "layoutFull", "helpRegistry", "preferencesRegistry", "wikiRepository",
        "$rootScope", function ($location, viewRegistry, localStorage, layoutFull, helpRegistry, preferencesRegistry, wikiRepository, $rootScope) {
            viewRegistry['wiki'] = Wiki.templatePath + 'layoutWiki.html';
            Wiki.documentTemplates.forEach(function (template) {
                if (!template['regex']) {
                    template.regex = /(?:)/;
                }
            });
        }]);
    hawtioPluginLoader.addModule(Wiki.pluginName);
})(Wiki || (Wiki = {}));

/// <reference path="./wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.CamelController = Wiki._module.controller("Wiki.CamelController", ["$scope", "$rootScope", "$location", "$routeParams", "$compile", "$templateCache", "localStorage", function ($scope, $rootScope, $location, $routeParams, $compile, $templateCache, localStorage) {
            var jolokia = null;
            var jolokiaStatus = null;
            var jmxTreeLazyLoadRegistry = null;
            var userDetails = null;
            var HawtioNav = null;
            var workspace = new Workspace(jolokia, jolokiaStatus, jmxTreeLazyLoadRegistry, $location, $compile, $templateCache, localStorage, $rootScope, userDetails, HawtioNav);
            Wiki.initScope($scope, $routeParams, $location);
            Camel.initEndpointChooserScope($scope, $location, localStorage, workspace, jolokia);
            var wikiRepository = $scope.wikiRepository;
            $scope.schema = Camel.getConfiguredCamelModel();
            $scope.modified = false;
            $scope.switchToCanvasView = new UI.Dialog();
            $scope.findProfileCamelContext = true;
            $scope.camelSelectionDetails = {
                selectedCamelContextId: null,
                selectedRouteId: null
            };
            $scope.isValid = function (nav) {
                return nav && nav.isValid(workspace);
            };
            $scope.camelSubLevelTabs = [
                {
                    content: '<i class="fa fa-picture-o"></i> Canvas',
                    title: "Edit the diagram in a draggy droppy way",
                    isValid: function (workspace) { return true; },
                    href: function () { return Wiki.startLink($scope) + "/camel/canvas/" + $scope.pageId; }
                },
                {
                    content: '<i class="fa fa-tree"></i> Tree',
                    title: "View the routes as a tree",
                    isValid: function (workspace) { return true; },
                    href: function () { return Wiki.startLink($scope) + "/camel/properties/" + $scope.pageId; }
                }
            ];
            var routeModel = _apacheCamelModel.definitions.route;
            routeModel["_id"] = "route";
            $scope.addDialog = new UI.Dialog();
            $scope.addDialog.options["dialogClass"] = "modal-large";
            $scope.addDialog.options["cssClass"] = "modal-large";
            $scope.paletteItemSearch = "";
            $scope.paletteTree = new Folder("Palette");
            $scope.paletteActivations = ["Routing_aggregate"];
            angular.forEach(_apacheCamelModel.definitions, function (value, key) {
                if (value.group) {
                    var group = (key === "route") ? $scope.paletteTree : $scope.paletteTree.getOrElse(value.group);
                    if (!group.key) {
                        group.key = value.group;
                    }
                    value["_id"] = key;
                    var title = value["title"] || key;
                    var node = new Folder(title);
                    node.key = group.key + "_" + key;
                    node["nodeModel"] = value;
                    var imageUrl = Camel.getRouteNodeIcon(value);
                    node.icon = imageUrl;
                    var tooltip = value["tooltip"] || value["description"] || '';
                    node.tooltip = tooltip;
                    group.children.push(node);
                }
            });
            $scope.componentTree = new Folder("Endpoints");
            $scope.$watch("componentNames", function () {
                var componentNames = $scope.componentNames;
                if (componentNames && componentNames.length) {
                    $scope.componentTree = new Folder("Endpoints");
                    angular.forEach($scope.componentNames, function (endpointName) {
                        var category = Camel.getEndpointCategory(endpointName);
                        var groupName = category.label || "Core";
                        var groupKey = category.id || groupName;
                        var group = $scope.componentTree.getOrElse(groupName);
                        var value = Camel.getEndpointConfig(endpointName, category);
                        var key = endpointName;
                        var label = value["label"] || endpointName;
                        var node = new Folder(label);
                        node.key = groupKey + "_" + key;
                        node.key = key;
                        node["nodeModel"] = value;
                        var tooltip = value["tooltip"] || value["description"] || label;
                        var imageUrl = Core.url(value["icon"] || Camel.endpointIcon);
                        node.icon = imageUrl;
                        node.tooltip = tooltip;
                        group.children.push(node);
                    });
                }
            });
            $scope.componentActivations = ["bean"];
            $scope.$watch('addDialog.show', function () {
                if ($scope.addDialog.show) {
                    setTimeout(function () {
                        $('#submit').focus();
                    }, 50);
                }
            });
            $scope.$on("hawtio.form.modelChange", onModelChangeEvent);
            $scope.onRootTreeNode = function (rootTreeNode) {
                $scope.rootTreeNode = rootTreeNode;
                rootTreeNode.data = $scope.camelContextTree;
            };
            $scope.addNode = function () {
                if ($scope.nodeXmlNode) {
                    $scope.addDialog.open();
                }
                else {
                    addNewNode(routeModel);
                }
            };
            $scope.onPaletteSelect = function (node) {
                $scope.selectedPaletteNode = (node && node["nodeModel"]) ? node : null;
                if ($scope.selectedPaletteNode) {
                    $scope.selectedComponentNode = null;
                }
                Wiki.log.debug("Selected " + $scope.selectedPaletteNode + " : " + $scope.selectedComponentNode);
            };
            $scope.onComponentSelect = function (node) {
                $scope.selectedComponentNode = (node && node["nodeModel"]) ? node : null;
                if ($scope.selectedComponentNode) {
                    $scope.selectedPaletteNode = null;
                    var nodeName = node.key;
                    Wiki.log.debug("loading endpoint schema for node " + nodeName);
                    $scope.loadEndpointSchema(nodeName);
                    $scope.selectedComponentName = nodeName;
                }
                Wiki.log.debug("Selected " + $scope.selectedPaletteNode + " : " + $scope.selectedComponentNode);
            };
            $scope.selectedNodeModel = function () {
                var nodeModel = null;
                if ($scope.selectedPaletteNode) {
                    nodeModel = $scope.selectedPaletteNode["nodeModel"];
                    $scope.endpointConfig = null;
                }
                else if ($scope.selectedComponentNode) {
                    var endpointConfig = $scope.selectedComponentNode["nodeModel"];
                    var endpointSchema = $scope.endpointSchema;
                    nodeModel = $scope.schema.definitions.endpoint;
                    $scope.endpointConfig = {
                        key: $scope.selectedComponentNode.key,
                        schema: endpointSchema,
                        details: endpointConfig
                    };
                }
                return nodeModel;
            };
            $scope.addAndCloseDialog = function () {
                var nodeModel = $scope.selectedNodeModel();
                if (nodeModel) {
                    addNewNode(nodeModel);
                }
                else {
                    Wiki.log.debug("WARNING: no nodeModel!");
                }
                $scope.addDialog.close();
            };
            $scope.removeNode = function () {
                if ($scope.selectedFolder && $scope.treeNode) {
                    $scope.selectedFolder.detach();
                    $scope.treeNode.remove();
                    $scope.selectedFolder = null;
                    $scope.treeNode = null;
                }
            };
            $scope.canDelete = function () {
                return $scope.selectedFolder ? true : false;
            };
            $scope.isActive = function (nav) {
                if (angular.isString(nav))
                    return workspace.isLinkActive(nav);
                var fn = nav.isActive;
                if (fn) {
                    return fn(workspace);
                }
                return workspace.isLinkActive(nav.href());
            };
            $scope.save = function () {
                if ($scope.modified && $scope.rootTreeNode) {
                    var xmlNode = Camel.generateXmlFromFolder($scope.rootTreeNode);
                    if (xmlNode) {
                        var text = Core.xmlNodeToString(xmlNode);
                        if (text) {
                            var commitMessage = $scope.commitMessage || "Updated page " + $scope.pageId;
                            wikiRepository.putPage($scope.branch, $scope.pageId, text, commitMessage, function (status) {
                                Wiki.onComplete(status);
                                Core.notification("success", "Saved " + $scope.pageId);
                                $scope.modified = false;
                                goToView();
                                Core.$apply($scope);
                            });
                        }
                    }
                }
            };
            $scope.cancel = function () {
                Wiki.log.debug("cancelling...");
            };
            $scope.$watch('workspace.tree', function () {
                if (!$scope.git) {
                    setTimeout(updateView, 50);
                }
            });
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                setTimeout(updateView, 50);
            });
            function getFolderXmlNode(treeNode) {
                var routeXmlNode = Camel.createFolderXmlTree(treeNode, null);
                if (routeXmlNode) {
                    $scope.nodeXmlNode = routeXmlNode;
                }
                return routeXmlNode;
            }
            $scope.onNodeSelect = function (folder, treeNode) {
                $scope.selectedFolder = folder;
                $scope.treeNode = treeNode;
                $scope.propertiesTemplate = null;
                $scope.diagramTemplate = null;
                $scope.nodeXmlNode = null;
                if (folder) {
                    $scope.nodeData = Camel.getRouteFolderJSON(folder);
                    $scope.nodeDataChangedFields = {};
                }
                var nodeName = Camel.getFolderCamelNodeId(folder);
                var routeXmlNode = getFolderXmlNode(treeNode);
                if (nodeName) {
                    $scope.nodeModel = Camel.getCamelSchema(nodeName);
                    if ($scope.nodeModel) {
                        $scope.propertiesTemplate = "plugins/wiki/html/camelPropertiesEdit.html";
                    }
                    $scope.diagramTemplate = "app/camel/html/routes.html";
                    Core.$apply($scope);
                }
            };
            $scope.onNodeDragEnter = function (node, sourceNode) {
                var nodeFolder = node.data;
                var sourceFolder = sourceNode.data;
                if (nodeFolder && sourceFolder) {
                    var nodeId = Camel.getFolderCamelNodeId(nodeFolder);
                    var sourceId = Camel.getFolderCamelNodeId(sourceFolder);
                    if (nodeId && sourceId) {
                        if (sourceId === "route") {
                            return nodeId === "route";
                        }
                        return true;
                    }
                }
                return false;
            };
            $scope.onNodeDrop = function (node, sourceNode, hitMode, ui, draggable) {
                var nodeFolder = node.data;
                var sourceFolder = sourceNode.data;
                if (nodeFolder && sourceFolder) {
                    var nodeId = Camel.getFolderCamelNodeId(nodeFolder);
                    var sourceId = Camel.getFolderCamelNodeId(sourceFolder);
                    if (nodeId === "route") {
                        if (sourceId === "route") {
                            if (hitMode === "over") {
                                hitMode = "after";
                            }
                        }
                        else {
                            hitMode = "over";
                        }
                    }
                    else {
                        if (Camel.acceptOutput(nodeId)) {
                            hitMode = "over";
                        }
                        else {
                            if (hitMode !== "before") {
                                hitMode = "after";
                            }
                        }
                    }
                    Wiki.log.debug("nodeDrop nodeId: " + nodeId + " sourceId: " + sourceId + " hitMode: " + hitMode);
                    sourceNode.move(node, hitMode);
                }
            };
            updateView();
            function addNewNode(nodeModel) {
                var doc = $scope.doc || document;
                var parentFolder = $scope.selectedFolder || $scope.camelContextTree;
                var key = nodeModel["_id"];
                var beforeNode = null;
                if (!key) {
                    Wiki.log.debug("WARNING: no id for model " + JSON.stringify(nodeModel));
                }
                else {
                    var treeNode = $scope.treeNode;
                    if (key === "route") {
                        treeNode = $scope.rootTreeNode;
                    }
                    else {
                        if (!treeNode) {
                            var root = $scope.rootTreeNode;
                            var children = root.getChildren();
                            if (!children || !children.length) {
                                addNewNode(Camel.getCamelSchema("route"));
                                children = root.getChildren();
                            }
                            if (children && children.length) {
                                treeNode = children[children.length - 1];
                            }
                            else {
                                Wiki.log.debug("Could not add a new route to the empty tree!");
                                return;
                            }
                        }
                        var parentId = Camel.getFolderCamelNodeId(treeNode.data);
                        if (!Camel.acceptOutput(parentId)) {
                            beforeNode = treeNode.getNextSibling();
                            treeNode = treeNode.getParent() || treeNode;
                        }
                    }
                    if (treeNode) {
                        var node = doc.createElement(key);
                        parentFolder = treeNode.data;
                        var addedNode = Camel.addRouteChild(parentFolder, node);
                        if (addedNode) {
                            var added = treeNode.addChild(addedNode, beforeNode);
                            if (added) {
                                getFolderXmlNode(added);
                                added.expand(true);
                                added.select(true);
                                added.activate(true);
                            }
                        }
                    }
                }
            }
            function onModelChangeEvent(event, name) {
                if ($scope.nodeData) {
                    var fieldMap = $scope.nodeDataChangedFields;
                    if (fieldMap) {
                        if (fieldMap[name]) {
                            onNodeDataChanged();
                        }
                        else {
                            fieldMap[name] = true;
                        }
                    }
                }
            }
            function onNodeDataChanged() {
                $scope.modified = true;
                var selectedFolder = $scope.selectedFolder;
                if ($scope.treeNode && selectedFolder) {
                    var routeXmlNode = getFolderXmlNode($scope.treeNode);
                    if (routeXmlNode) {
                        var nodeName = routeXmlNode.localName;
                        var nodeSettings = Camel.getCamelSchema(nodeName);
                        if (nodeSettings) {
                            Camel.updateRouteNodeLabelAndTooltip(selectedFolder, routeXmlNode, nodeSettings);
                            $scope.treeNode.render(false, false);
                        }
                    }
                    selectedFolder["camelNodeData"] = $scope.nodeData;
                }
            }
            function onResults(response) {
                var text = response.text;
                if (text) {
                    var tree = Camel.loadCamelTree(text, $scope.pageId);
                    if (tree) {
                        $scope.camelContextTree = tree;
                    }
                }
                else {
                    Wiki.log.debug("No XML found for page " + $scope.pageId);
                }
                Core.$applyLater($scope);
            }
            function updateView() {
                $scope.loadEndpointNames();
                $scope.pageId = Wiki.pageId($routeParams, $location);
                Wiki.log.debug("Has page id: " + $scope.pageId + " with $routeParams " + JSON.stringify($routeParams));
                wikiRepository.getPage($scope.branch, $scope.pageId, $scope.objectId, onResults);
            }
            function goToView() {
            }
            $scope.doSwitchToCanvasView = function () {
                var link = $location.url().replace(/\/properties\//, '/canvas/');
                Wiki.log.debug("Link: ", link);
                $location.url(link);
            };
            $scope.confirmSwitchToCanvasView = function () {
                if ($scope.modified) {
                    $scope.switchToCanvasView.open();
                }
                else {
                    $scope.doSwitchToCanvasView();
                }
            };
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="./wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.CamelCanvasController = Wiki._module.controller("Wiki.CamelCanvasController", ["$scope", "$element", "$routeParams", "$templateCache", "$interpolate", "$location", function ($scope, $element, $routeParams, $templateCache, $interpolate, $location) {
            var jsPlumbInstance = jsPlumb.getInstance();
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            $scope.addDialog = new UI.Dialog();
            $scope.propertiesDialog = new UI.Dialog();
            $scope.switchToTreeView = new UI.Dialog();
            $scope.modified = false;
            $scope.camelIgnoreIdForLabel = Camel.ignoreIdForLabel(localStorage);
            $scope.camelMaximumLabelWidth = Camel.maximumLabelWidth(localStorage);
            $scope.camelMaximumTraceOrDebugBodyLength = Camel.maximumTraceOrDebugBodyLength(localStorage);
            $scope.forms = {};
            $scope.nodeTemplate = $interpolate($templateCache.get("nodeTemplate"));
            $scope.$watch("camelContextTree", function () {
                var tree = $scope.camelContextTree;
                $scope.rootFolder = tree;
                $scope.folders = Camel.addFoldersToIndex($scope.rootFolder);
                var doc = Core.pathGet(tree, ["xmlDocument"]);
                if (doc) {
                    $scope.doc = doc;
                    reloadRouteIds();
                    onRouteSelectionChanged();
                }
            });
            $scope.addAndCloseDialog = function () {
                var nodeModel = $scope.selectedNodeModel();
                if (nodeModel) {
                    addNewNode(nodeModel);
                }
                $scope.addDialog.close();
            };
            $scope.removeNode = function () {
                var folder = getSelectedOrRouteFolder();
                if (folder) {
                    var nodeName = Camel.getFolderCamelNodeId(folder);
                    folder.detach();
                    if ("route" === nodeName) {
                        $scope.selectedRouteId = null;
                    }
                    updateSelection(null);
                    treeModified();
                }
            };
            $scope.doLayout = function () {
                $scope.drawnRouteId = null;
                onRouteSelectionChanged();
            };
            function isRouteOrNode() {
                return !$scope.selectedFolder;
            }
            $scope.getDeleteTitle = function () {
                if (isRouteOrNode()) {
                    return "Delete this route";
                }
                return "Delete this node";
            };
            $scope.getDeleteTarget = function () {
                if (isRouteOrNode()) {
                    return "Route";
                }
                return "Node";
            };
            $scope.isFormDirty = function () {
                Wiki.log.debug("endpointForm: ", $scope.endpointForm);
                if ($scope.endpointForm.$dirty) {
                    return true;
                }
                if (!$scope.forms['formEditor']) {
                    return false;
                }
                else {
                    return $scope.forms['formEditor']['$dirty'];
                }
            };
            function createEndpointURI(endpointScheme, slashesText, endpointPath, endpointParameters) {
                Wiki.log.debug("scheme " + endpointScheme + " path " + endpointPath + " parameters " + endpointParameters);
                var uri = ((endpointScheme) ? endpointScheme + ":" + slashesText : "") + (endpointPath ? endpointPath : "");
                var paramText = Core.hashToString(endpointParameters);
                if (paramText) {
                    uri += "?" + paramText;
                }
                return uri;
            }
            $scope.updateProperties = function () {
                Wiki.log.info("old URI is " + $scope.nodeData.uri);
                var uri = createEndpointURI($scope.endpointScheme, ($scope.endpointPathHasSlashes ? "//" : ""), $scope.endpointPath, $scope.endpointParameters);
                Wiki.log.info("new URI is " + uri);
                if (uri) {
                    $scope.nodeData.uri = uri;
                }
                var key = null;
                var selectedFolder = $scope.selectedFolder;
                if (selectedFolder) {
                    key = selectedFolder.key;
                    var elements = $element.find(".canvas").find("[id='" + key + "']").first().remove();
                }
                treeModified();
                if (key) {
                    updateSelection(key);
                }
                if ($scope.isFormDirty()) {
                    $scope.endpointForm.$setPristine();
                    if ($scope.forms['formEditor']) {
                        $scope.forms['formEditor'].$setPristine();
                    }
                }
                Core.$apply($scope);
            };
            $scope.save = function () {
                if ($scope.modified && $scope.rootFolder) {
                    var xmlNode = Camel.generateXmlFromFolder($scope.rootFolder);
                    if (xmlNode) {
                        var text = Core.xmlNodeToString(xmlNode);
                        if (text) {
                            var decoded = decodeURIComponent(text);
                            Wiki.log.debug("Saving xml decoded: " + decoded);
                            var commitMessage = $scope.commitMessage || "Updated page " + $scope.pageId;
                            wikiRepository.putPage($scope.branch, $scope.pageId, decoded, commitMessage, function (status) {
                                Wiki.onComplete(status);
                                Core.notification("success", "Saved " + $scope.pageId);
                                $scope.modified = false;
                                goToView();
                                Core.$apply($scope);
                            });
                        }
                    }
                }
            };
            $scope.cancel = function () {
                Wiki.log.debug("cancelling...");
            };
            $scope.$watch("selectedRouteId", onRouteSelectionChanged);
            function goToView() {
            }
            function addNewNode(nodeModel) {
                var doc = $scope.doc || document;
                var parentFolder = $scope.selectedFolder || $scope.rootFolder;
                var key = nodeModel["_id"];
                if (!key) {
                    Wiki.log.debug("WARNING: no id for model " + JSON.stringify(nodeModel));
                }
                else {
                    var treeNode = $scope.selectedFolder;
                    if (key === "route") {
                        treeNode = $scope.rootFolder;
                    }
                    else {
                        if (!treeNode) {
                            var root = $scope.rootFolder;
                            var children = root.children;
                            if (!children || !children.length) {
                                addNewNode(Camel.getCamelSchema("route"));
                                children = root.children;
                            }
                            if (children && children.length) {
                                treeNode = getRouteFolder($scope.rootFolder, $scope.selectedRouteId) || children[children.length - 1];
                            }
                            else {
                                Wiki.log.debug("Could not add a new route to the empty tree!");
                                return;
                            }
                        }
                        var parentTypeName = Camel.getFolderCamelNodeId(treeNode);
                        if (!Camel.acceptOutput(parentTypeName)) {
                            treeNode = treeNode.parent || treeNode;
                        }
                    }
                    if (treeNode) {
                        var node = doc.createElement(key);
                        parentFolder = treeNode;
                        var addedNode = Camel.addRouteChild(parentFolder, node);
                        var nodeData = {};
                        if (key === "endpoint" && $scope.endpointConfig) {
                            var key = $scope.endpointConfig.key;
                            if (key) {
                                nodeData["uri"] = key + ":";
                            }
                        }
                        addedNode["camelNodeData"] = nodeData;
                        addedNode["endpointConfig"] = $scope.endpointConfig;
                        if (key === "route") {
                            var count = $scope.routeIds.length;
                            var nodeId = null;
                            while (true) {
                                nodeId = "route" + (++count);
                                if (!$scope.routeIds.find(nodeId)) {
                                    break;
                                }
                            }
                            addedNode["routeXmlNode"].setAttribute("id", nodeId);
                            $scope.selectedRouteId = nodeId;
                        }
                    }
                }
                treeModified();
            }
            function treeModified(reposition) {
                if (reposition === void 0) { reposition = true; }
                var newDoc = Camel.generateXmlFromFolder($scope.rootFolder);
                var tree = Camel.loadCamelTree(newDoc, $scope.pageId);
                if (tree) {
                    $scope.rootFolder = tree;
                    $scope.doc = Core.pathGet(tree, ["xmlDocument"]);
                }
                $scope.modified = true;
                reloadRouteIds();
                $scope.doLayout();
                Core.$apply($scope);
            }
            function reloadRouteIds() {
                $scope.routeIds = [];
                var doc = $($scope.doc);
                $scope.camelSelectionDetails.selectedCamelContextId = doc.find("camelContext").attr("id");
                doc.find("route").each(function (idx, route) {
                    var id = route.getAttribute("id");
                    if (id) {
                        $scope.routeIds.push(id);
                    }
                });
            }
            function onRouteSelectionChanged() {
                if ($scope.doc) {
                    if (!$scope.selectedRouteId && $scope.routeIds && $scope.routeIds.length) {
                        $scope.selectedRouteId = $scope.routeIds[0];
                    }
                    if ($scope.selectedRouteId && $scope.selectedRouteId !== $scope.drawnRouteId) {
                        var nodes = [];
                        var links = [];
                        Camel.loadRouteXmlNodes($scope, $scope.doc, $scope.selectedRouteId, nodes, links, getWidth());
                        updateSelection($scope.selectedRouteId);
                        $scope.folders = Camel.addFoldersToIndex($scope.rootFolder);
                        showGraph(nodes, links);
                        $scope.drawnRouteId = $scope.selectedRouteId;
                    }
                    $scope.camelSelectionDetails.selectedRouteId = $scope.selectedRouteId;
                }
            }
            function showGraph(nodes, links) {
                layoutGraph(nodes, links);
            }
            function getNodeId(node) {
                if (angular.isNumber(node)) {
                    var idx = node;
                    node = $scope.nodeStates[idx];
                    if (!node) {
                        Wiki.log.debug("Cant find node at " + idx);
                        return "node-" + idx;
                    }
                }
                return node.cid || "node-" + node.id;
            }
            function getSelectedOrRouteFolder() {
                return $scope.selectedFolder || getRouteFolder($scope.rootFolder, $scope.selectedRouteId);
            }
            function getContainerElement() {
                var rootElement = $element;
                var containerElement = rootElement.find(".canvas");
                if (!containerElement || !containerElement.length)
                    containerElement = rootElement;
                return containerElement;
            }
            var endpointStyle = ["Dot", { radius: 4, cssClass: 'camel-canvas-endpoint' }];
            var hoverPaintStyle = { strokeStyle: "red", lineWidth: 3 };
            var labelStyles = ["Label"];
            var arrowStyles = ["Arrow", {
                    location: 1,
                    id: "arrow",
                    length: 8,
                    width: 8,
                    foldback: 0.8
                }];
            var connectorStyle = ["StateMachine", { curviness: 10, proximityLimit: 50 }];
            jsPlumbInstance.importDefaults({
                Endpoint: endpointStyle,
                HoverPaintStyle: hoverPaintStyle,
                ConnectionOverlays: [
                    arrowStyles,
                    labelStyles
                ]
            });
            $scope.$on('$destroy', function () {
                jsPlumbInstance.reset();
                delete jsPlumbInstance;
            });
            jsPlumbInstance.bind("dblclick", function (connection, originalEvent) {
                if (jsPlumbInstance.isSuspendDrawing()) {
                    return;
                }
                alert("double click on connection from " + connection.sourceId + " to " + connection.targetId);
            });
            jsPlumbInstance.bind('connection', function (info, evt) {
                Wiki.log.debug("Creating connection from ", info.sourceId, " to ", info.targetId);
                var link = getLink(info);
                var source = $scope.nodes[link.source];
                var sourceFolder = $scope.folders[link.source];
                var targetFolder = $scope.folders[link.target];
                if (Camel.isNextSiblingAddedAsChild(source.type)) {
                    sourceFolder.moveChild(targetFolder);
                }
                else {
                    sourceFolder.parent.insertAfter(targetFolder, sourceFolder);
                }
                treeModified();
            });
            jsPlumbInstance.bind("click", function (c) {
                if (jsPlumbInstance.isSuspendDrawing()) {
                    return;
                }
                jsPlumbInstance.detach(c);
            });
            function layoutGraph(nodes, links) {
                var transitions = [];
                var states = Core.createGraphStates(nodes, links, transitions);
                Wiki.log.debug("links: ", links);
                Wiki.log.debug("transitions: ", transitions);
                $scope.nodeStates = states;
                var containerElement = getContainerElement();
                jsPlumbInstance.doWhileSuspended(function () {
                    containerElement.css({
                        'width': '800px',
                        'height': '800px',
                        'min-height': '800px',
                        'min-width': '800px'
                    });
                    var containerHeight = 0;
                    var containerWidth = 0;
                    containerElement.find('div.component').each(function (i, el) {
                        Wiki.log.debug("Checking: ", el, " ", i);
                        if (!states.any(function (node) {
                            return el.id === getNodeId(node);
                        })) {
                            Wiki.log.debug("Removing element: ", el.id);
                            jsPlumbInstance.remove(el);
                        }
                    });
                    angular.forEach(states, function (node) {
                        Wiki.log.debug("node: ", node);
                        var id = getNodeId(node);
                        var div = containerElement.find('#' + id);
                        if (!div[0]) {
                            div = $($scope.nodeTemplate({
                                id: id,
                                node: node
                            }));
                            div.appendTo(containerElement);
                        }
                        jsPlumbInstance.makeSource(div, {
                            filter: "img.nodeIcon",
                            anchor: "Continuous",
                            connector: connectorStyle,
                            connectorStyle: { strokeStyle: "#666", lineWidth: 3 },
                            maxConnections: -1
                        });
                        jsPlumbInstance.makeTarget(div, {
                            dropOptions: { hoverClass: "dragHover" },
                            anchor: "Continuous"
                        });
                        jsPlumbInstance.draggable(div, {
                            containment: '.camel-canvas'
                        });
                        div.click(function () {
                            var newFlag = !div.hasClass("selected");
                            containerElement.find('div.component').toggleClass("selected", false);
                            div.toggleClass("selected", newFlag);
                            var id = div.attr("id");
                            updateSelection(newFlag ? id : null);
                            Core.$apply($scope);
                        });
                        div.dblclick(function () {
                            var id = div.attr("id");
                            updateSelection(id);
                            Core.$apply($scope);
                        });
                        var height = div.height();
                        var width = div.width();
                        if (height || width) {
                            node.width = width;
                            node.height = height;
                            div.css({
                                'min-width': width,
                                'min-height': height
                            });
                        }
                    });
                    var edgeSep = 10;
                    dagre.layout()
                        .nodeSep(100)
                        .edgeSep(edgeSep)
                        .rankSep(75)
                        .nodes(states)
                        .edges(transitions)
                        .debugLevel(1)
                        .run();
                    angular.forEach(states, function (node) {
                        var id = getNodeId(node);
                        var div = $("#" + id);
                        var divHeight = div.height();
                        var divWidth = div.width();
                        var leftOffset = node.dagre.x + divWidth;
                        var bottomOffset = node.dagre.y + divHeight;
                        if (containerHeight < bottomOffset) {
                            containerHeight = bottomOffset + edgeSep * 2;
                        }
                        if (containerWidth < leftOffset) {
                            containerWidth = leftOffset + edgeSep * 2;
                        }
                        div.css({ top: node.dagre.y, left: node.dagre.x });
                    });
                    containerElement.css({
                        'width': containerWidth,
                        'height': containerHeight,
                        'min-height': containerHeight,
                        'min-width': containerWidth
                    });
                    containerElement.dblclick(function () {
                        $scope.propertiesDialog.open();
                    });
                    jsPlumbInstance.setSuspendEvents(true);
                    jsPlumbInstance.detachEveryConnection({ fireEvent: false });
                    angular.forEach(links, function (link) {
                        jsPlumbInstance.connect({
                            source: getNodeId(link.source),
                            target: getNodeId(link.target)
                        });
                    });
                    jsPlumbInstance.setSuspendEvents(false);
                });
                return states;
            }
            function getLink(info) {
                var sourceId = info.sourceId;
                var targetId = info.targetId;
                return {
                    source: sourceId,
                    target: targetId
                };
            }
            function getNodeByCID(nodes, cid) {
                return nodes.find(function (node) {
                    return node.cid === cid;
                });
            }
            function updateSelection(folderOrId) {
                var folder = null;
                if (angular.isString(folderOrId)) {
                    var id = folderOrId;
                    folder = (id && $scope.folders) ? $scope.folders[id] : null;
                }
                else {
                    folder = folderOrId;
                }
                $scope.selectedFolder = folder;
                folder = getSelectedOrRouteFolder();
                $scope.nodeXmlNode = null;
                $scope.propertiesTemplate = null;
                if (folder) {
                    var nodeName = Camel.getFolderCamelNodeId(folder);
                    $scope.nodeData = Camel.getRouteFolderJSON(folder);
                    $scope.nodeDataChangedFields = {};
                    $scope.nodeModel = Camel.getCamelSchema(nodeName);
                    if ($scope.nodeModel) {
                        $scope.propertiesTemplate = "plugins/wiki/html/camelPropertiesEdit.html";
                    }
                    $scope.selectedEndpoint = null;
                    if ("endpoint" === nodeName) {
                        var uri = $scope.nodeData["uri"];
                        if (uri) {
                            var idx = uri.indexOf(":");
                            if (idx > 0) {
                                var endpointScheme = uri.substring(0, idx);
                                var endpointPath = uri.substring(idx + 1);
                                $scope.endpointPathHasSlashes = endpointPath ? false : true;
                                if (endpointPath.startsWith("//")) {
                                    endpointPath = endpointPath.substring(2);
                                    $scope.endpointPathHasSlashes = true;
                                }
                                idx = endpointPath.indexOf("?");
                                var endpointParameters = {};
                                if (idx > 0) {
                                    var parameters = endpointPath.substring(idx + 1);
                                    endpointPath = endpointPath.substring(0, idx);
                                    endpointParameters = Core.stringToHash(parameters);
                                }
                                $scope.endpointScheme = endpointScheme;
                                $scope.endpointPath = endpointPath;
                                $scope.endpointParameters = endpointParameters;
                                Wiki.log.debug("endpoint " + endpointScheme + " path " + endpointPath + " and parameters " + JSON.stringify(endpointParameters));
                                $scope.loadEndpointSchema(endpointScheme);
                                $scope.selectedEndpoint = {
                                    endpointScheme: endpointScheme,
                                    endpointPath: endpointPath,
                                    parameters: endpointParameters
                                };
                            }
                        }
                    }
                }
            }
            function getWidth() {
                var canvasDiv = $($element);
                return canvasDiv.width();
            }
            function getFolderIdAttribute(route) {
                var id = null;
                if (route) {
                    var xmlNode = route["routeXmlNode"];
                    if (xmlNode) {
                        id = xmlNode.getAttribute("id");
                    }
                }
                return id;
            }
            function getRouteFolder(tree, routeId) {
                var answer = null;
                if (tree) {
                    angular.forEach(tree.children, function (route) {
                        if (!answer) {
                            var id = getFolderIdAttribute(route);
                            if (routeId === id) {
                                answer = route;
                            }
                        }
                    });
                }
                return answer;
            }
            $scope.doSwitchToTreeView = function () {
                $location.url(Core.trimLeading(($scope.startLink + "/camel/properties/" + $scope.pageId), '#'));
            };
            $scope.confirmSwitchToTreeView = function () {
                if ($scope.modified) {
                    $scope.switchToTreeView.open();
                }
                else {
                    $scope.doSwitchToTreeView();
                }
            };
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.CommitController", ["$scope", "$location", "$routeParams", "$templateCache", "marked", "fileExtensionTypeRegistry", function ($scope, $location, $routeParams, $templateCache, marked, fileExtensionTypeRegistry) {
            var isFmc = false;
            var jolokia = null;
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            $scope.commitId = $scope.objectId;
            $scope.dateFormat = 'EEE, MMM d, y : hh:mm:ss a';
            $scope.gridOptions = {
                data: 'commits',
                showFilter: false,
                multiSelect: false,
                selectWithCheckboxOnly: true,
                showSelectionCheckbox: true,
                displaySelectionCheckbox: true,
                selectedItems: [],
                filterOptions: {
                    filterText: ''
                },
                columnDefs: [
                    {
                        field: 'path',
                        displayName: 'File Name',
                        cellTemplate: $templateCache.get('fileCellTemplate.html'),
                        width: "***",
                        cellFilter: ""
                    },
                    {
                        field: '$diffLink',
                        displayName: 'Options',
                        cellTemplate: $templateCache.get('viewDiffTemplate.html')
                    }
                ]
            };
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                setTimeout(updateView, 50);
            });
            $scope.$watch('workspace.tree', function () {
                if (!$scope.git) {
                    setTimeout(updateView, 50);
                }
            });
            $scope.canRevert = function () {
                return $scope.gridOptions.selectedItems.length === 1;
            };
            $scope.revert = function () {
                var selectedItems = $scope.gridOptions.selectedItems;
                if (selectedItems.length > 0) {
                    var path = commitPath(selectedItems[0]);
                    var objectId = $scope.commitId;
                    if (path && objectId) {
                        var commitMessage = "Reverting file " + $scope.pageId + " to previous version " + objectId;
                        wikiRepository.revertTo($scope.branch, objectId, $scope.pageId, commitMessage, function (result) {
                            Wiki.onComplete(result);
                            updateView();
                        });
                    }
                }
            };
            function commitPath(commit) {
                return commit.path || commit.name;
            }
            $scope.diff = function () {
                var selectedItems = $scope.gridOptions.selectedItems;
                if (selectedItems.length > 0) {
                    var commit = selectedItems[0];
                    var otherCommitId = $scope.commitId;
                    var link = UrlHelpers.join(Wiki.startLink($scope), "/diff/" + $scope.commitId + "/" + otherCommitId + "/" + commitPath(commit));
                    var path = Core.trimLeading(link, "#");
                    $location.path(path);
                }
            };
            updateView();
            function updateView() {
                var commitId = $scope.commitId;
                Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
                wikiRepository.commitInfo(commitId, function (commitInfo) {
                    $scope.commitInfo = commitInfo;
                    Core.$apply($scope);
                });
                wikiRepository.commitTree(commitId, function (commits) {
                    $scope.commits = commits;
                    angular.forEach(commits, function (commit) {
                        commit.fileIconHtml = Wiki.fileIconHtml(commit);
                        commit.fileClass = commit.name.endsWith(".profile") ? "green" : "";
                        var changeType = commit.changeType;
                        var path = commitPath(commit);
                        if (path) {
                            commit.fileLink = Wiki.startLink($scope) + '/version/' + path + '/' + commitId;
                        }
                        commit.$diffLink = Wiki.startLink($scope) + "/diff/" + commitId + "/" + commitId + "/" + (path || "");
                        if (changeType) {
                            changeType = changeType.toLowerCase();
                            if (changeType.startsWith("a")) {
                                commit.changeClass = "change-add";
                                commit.change = "add";
                                commit.title = "added";
                            }
                            else if (changeType.startsWith("d")) {
                                commit.changeClass = "change-delete";
                                commit.change = "delete";
                                commit.title = "deleted";
                                commit.fileLink = null;
                            }
                            else {
                                commit.changeClass = "change-modify";
                                commit.change = "modify";
                                commit.title = "modified";
                            }
                            commit.changeTypeHtml = '<span class="' + commit.changeClass + '">' + commit.title + '</span>';
                        }
                    });
                    Core.$apply($scope);
                });
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.CommitDetailController", ["$scope", "$location", "$routeParams", "$templateCache", "marked", "fileExtensionTypeRegistry", function ($scope, $location, $routeParams, $templateCache, marked, fileExtensionTypeRegistry) {
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
                setTimeout(updateView, 50);
            });
            $scope.$watch('workspace.tree', function () {
                if (!$scope.git) {
                    setTimeout(updateView, 50);
                }
            });
            $scope.canRevert = function () {
                return $scope.gridOptions.selectedItems.length === 1;
            };
            $scope.revert = function () {
                var selectedItems = $scope.gridOptions.selectedItems;
                if (selectedItems.length > 0) {
                    var path = commitPath(selectedItems[0]);
                    var objectId = $scope.commitId;
                    if (path && objectId) {
                        var commitMessage = "Reverting file " + $scope.pageId + " to previous version " + objectId;
                        wikiRepository.revertTo($scope.branch, objectId, $scope.pageId, commitMessage, function (result) {
                            Wiki.onComplete(result);
                            updateView();
                        });
                    }
                }
            };
            function commitPath(commit) {
                return commit.path || commit.name;
            }
            $scope.diff = function () {
                var selectedItems = $scope.gridOptions.selectedItems;
                if (selectedItems.length > 0) {
                    var commit = selectedItems[0];
                    var otherCommitId = $scope.commitId;
                    var link = UrlHelpers.join(Wiki.startLink($scope), "/diff/" + $scope.commitId + "/" + otherCommitId + "/" + commitPath(commit));
                    var path = Core.trimLeading(link, "#");
                    $location.path(path);
                }
            };
            updateView();
            function updateView() {
                var commitId = $scope.commitId;
                Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
                wikiRepository.commitDetail(commitId, function (commitDetail) {
                    if (commitDetail) {
                        $scope.commitDetail = commitDetail;
                        var commit = commitDetail.commit_info;
                        $scope.commit = commit;
                        if (commit) {
                            commit.$date = Developer.asDate(commit.date);
                        }
                        angular.forEach(commitDetail.diffs, function (diff) {
                            var path = diff.new_path;
                            if (path) {
                                diff.$viewLink = UrlHelpers.join(Wiki.startWikiLink($scope.projectId, commitId), "view", path);
                            }
                        });
                    }
                    Core.$apply($scope);
                });
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    var CreateController = Wiki.controller("CreateController", ["$scope", "$location", "$routeParams", "$route", "$http", "$timeout", function ($scope, $location, $routeParams, $route, $http, $timeout) {
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            var workspace = null;
            $scope.createDocumentTree = Wiki.createWizardTree(workspace, $scope);
            $scope.createDocumentTreeChildren = $scope.createDocumentTree.children;
            $scope.createDocumentTreeActivations = ["camel-spring.xml", "ReadMe.md"];
            $scope.treeOptions = {
                nodeChildren: "children",
                dirSelectable: true,
                injectClasses: {
                    ul: "a1",
                    li: "a2",
                    liSelected: "a7",
                    iExpanded: "a3",
                    iCollapsed: "a4",
                    iLeaf: "a5",
                    label: "a6",
                    labelSelected: "a8"
                }
            };
            $scope.fileExists = {
                exists: false,
                name: ""
            };
            $scope.newDocumentName = "";
            $scope.selectedCreateDocumentExtension = null;
            $scope.fileExists.exists = false;
            $scope.fileExists.name = "";
            $scope.newDocumentName = "";
            function returnToDirectory() {
                var link = Wiki.viewLink($scope, $scope.pageId, $location);
                Wiki.log.debug("Cancelling, going to link: ", link);
                Wiki.goToLink(link, $timeout, $location);
            }
            $scope.cancel = function () {
                returnToDirectory();
            };
            $scope.onCreateDocumentSelect = function (node) {
                $scope.fileExists.exists = false;
                $scope.fileExists.name = "";
                var entity = node ? node.entity : null;
                $scope.selectedCreateDocumentTemplate = entity;
                $scope.selectedCreateDocumentTemplateRegex = $scope.selectedCreateDocumentTemplate.regex || /.*/;
                $scope.selectedCreateDocumentTemplateInvalid = $scope.selectedCreateDocumentTemplate.invalid || "invalid name";
                $scope.selectedCreateDocumentTemplateExtension = $scope.selectedCreateDocumentTemplate.extension || null;
                Wiki.log.debug("Entity: ", entity);
                if (entity) {
                    if (entity.generated) {
                        $scope.formSchema = entity.generated.schema;
                        $scope.formData = entity.generated.form(workspace, $scope);
                    }
                    else {
                        $scope.formSchema = {};
                        $scope.formData = {};
                    }
                    Core.$apply($scope);
                }
            };
            $scope.addAndCloseDialog = function (fileName) {
                $scope.newDocumentName = fileName;
                var template = $scope.selectedCreateDocumentTemplate;
                var path = getNewDocumentPath();
                $scope.newDocumentName = null;
                $scope.fileExists.exists = false;
                $scope.fileExists.name = "";
                $scope.fileExtensionInvalid = null;
                if (!template || !path) {
                    return;
                }
                if ($scope.selectedCreateDocumentTemplateExtension) {
                    var idx = path.lastIndexOf('.');
                    if (idx > 0) {
                        var ext = path.substring(idx);
                        if ($scope.selectedCreateDocumentTemplateExtension !== ext) {
                            $scope.fileExtensionInvalid = "File extension must be: " + $scope.selectedCreateDocumentTemplateExtension;
                            Core.$apply($scope);
                            return;
                        }
                    }
                }
                wikiRepository.exists($scope.branch, path, function (exists) {
                    $scope.fileExists.exists = exists;
                    $scope.fileExists.name = exists ? path : false;
                    if (!exists) {
                        doCreate();
                    }
                    Core.$apply($scope);
                });
                function doCreate() {
                    var name = Wiki.fileName(path);
                    var folder = Wiki.fileParent(path);
                    var exemplar = template.exemplar;
                    var commitMessage = "Created " + template.label;
                    var exemplarUri = Core.url("/plugins/wiki/exemplar/" + exemplar);
                    if (template.folder) {
                        Core.notification("success", "Creating new folder " + name);
                        wikiRepository.createDirectory($scope.branch, path, commitMessage, function (status) {
                            var link = Wiki.viewLink($scope, path, $location);
                            Wiki.goToLink(link, $timeout, $location);
                        });
                    }
                    else if (template.profile) {
                        function toPath(profileName) {
                            var answer = "fabric/profiles/" + profileName;
                            answer = answer.replace(/-/g, "/");
                            answer = answer + ".profile";
                            return answer;
                        }
                        function toProfileName(path) {
                            var answer = path.replace(/^fabric\/profiles\//, "");
                            answer = answer.replace(/\//g, "-");
                            answer = answer.replace(/\.profile$/, "");
                            return answer;
                        }
                        folder = folder.replace(/\/=?(\w*)\.profile$/, "");
                        var concatenated = folder + "/" + name;
                        var profileName = toProfileName(concatenated);
                        var targetPath = toPath(profileName);
                    }
                    else if (template.generated) {
                        var options = {
                            workspace: workspace,
                            form: $scope.formData,
                            name: fileName,
                            parentId: folder,
                            branch: $scope.branch,
                            success: function (contents) {
                                if (contents) {
                                    wikiRepository.putPage($scope.branch, path, contents, commitMessage, function (status) {
                                        Wiki.log.debug("Created file " + name);
                                        Wiki.onComplete(status);
                                        returnToDirectory();
                                    });
                                }
                                else {
                                    returnToDirectory();
                                }
                            },
                            error: function (error) {
                                Core.notification('error', error);
                                Core.$apply($scope);
                            }
                        };
                        template.generated.generate(options);
                    }
                    else {
                        $http.get(exemplarUri)
                            .success(function (data, status, headers, config) {
                            putPage(path, name, folder, data, commitMessage);
                        })
                            .error(function (data, status, headers, config) {
                            putPage(path, name, folder, "", commitMessage);
                        });
                    }
                }
            };
            function putPage(path, name, folder, contents, commitMessage) {
                wikiRepository.putPage($scope.branch, path, contents, commitMessage, function (status) {
                    Wiki.log.debug("Created file " + name);
                    Wiki.onComplete(status);
                    $scope.git = wikiRepository.getPage($scope.branch, folder, $scope.objectId, function (details) {
                        var link = null;
                        if (details && details.children) {
                            Wiki.log.debug("scanned the directory " + details.children.length + " children");
                            var child = details.children.find(function (c) { return c.name === Wiki.fileName; });
                            if (child) {
                                link = $scope.childLink(child);
                            }
                            else {
                                Wiki.log.debug("Could not find name '" + Wiki.fileName + "' in the list of file names " + JSON.stringify(details.children.map(function (c) { return c.name; })));
                            }
                        }
                        if (!link) {
                            Wiki.log.debug("WARNING: could not find the childLink so reverting to the wiki edit page!");
                            link = Wiki.editLink($scope, path, $location);
                        }
                        Wiki.goToLink(link, $timeout, $location);
                    });
                });
            }
            function getNewDocumentPath() {
                var template = $scope.selectedCreateDocumentTemplate;
                if (!template) {
                    Wiki.log.debug("No template selected.");
                    return null;
                }
                var exemplar = template.exemplar || "";
                var name = $scope.newDocumentName || exemplar;
                if (name.indexOf('.') < 0) {
                    var idx = exemplar.lastIndexOf(".");
                    if (idx > 0) {
                        name += exemplar.substring(idx);
                    }
                }
                var folder = $scope.pageId;
                if ($scope.isFile) {
                    var idx = folder.lastIndexOf("/");
                    if (idx <= 0) {
                        folder = "";
                    }
                    else {
                        folder = folder.substring(0, idx);
                    }
                }
                var idx = name.lastIndexOf("/");
                if (idx > 0) {
                    folder += "/" + name.substring(0, idx);
                    name = name.substring(idx + 1);
                }
                folder = Core.trimLeading(folder, "/");
                return folder + (folder ? "/" : "") + name;
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.EditController", ["$scope", "$location", "$routeParams", "fileExtensionTypeRegistry", function ($scope, $location, $routeParams, fileExtensionTypeRegistry) {
            Wiki.initScope($scope, $routeParams, $location);
            $scope.breadcrumbConfig.push(Wiki.createEditingBreadcrumb($scope));
            var wikiRepository = $scope.wikiRepository;
            $scope.entity = {
                source: null
            };
            var format = Wiki.fileFormat($scope.pageId, fileExtensionTypeRegistry);
            var form = null;
            if ((format && format === "javascript") || isCreate()) {
                form = $location.search()["form"];
            }
            var options = {
                mode: {
                    name: format
                }
            };
            $scope.codeMirrorOptions = CodeEditor.createEditorSettings(options);
            $scope.modified = false;
            $scope.isValid = function () { return $scope.fileName; };
            $scope.canSave = function () { return !$scope.modified; };
            $scope.$watch('entity.source', function (newValue, oldValue) {
                $scope.modified = newValue && oldValue && newValue !== oldValue;
            }, true);
            Wiki.log.debug("path: ", $scope.path);
            $scope.$watch('modified', function (newValue, oldValue) {
                Wiki.log.debug("modified: ", newValue);
            });
            $scope.viewLink = function () { return Wiki.viewLink($scope, $scope.pageId, $location, $scope.fileName); };
            $scope.cancel = function () {
                goToView();
            };
            $scope.save = function () {
                if ($scope.modified && $scope.fileName) {
                    saveTo($scope["pageId"]);
                }
            };
            $scope.create = function () {
                var path = $scope.pageId + "/" + $scope.fileName;
                Wiki.log.debug("creating new file at " + path);
                saveTo(path);
            };
            $scope.onSubmit = function (json, form) {
                if (isCreate()) {
                    $scope.create();
                }
                else {
                    $scope.save();
                }
            };
            $scope.onCancel = function (form) {
                setTimeout(function () {
                    goToView();
                    Core.$apply($scope);
                }, 50);
            };
            updateView();
            function isCreate() {
                return $location.path().startsWith("/wiki/create");
            }
            function updateView() {
                if (isCreate()) {
                    updateSourceView();
                }
                else {
                    Wiki.log.debug("Getting page, branch: ", $scope.branch, " pageId: ", $scope.pageId, " objectId: ", $scope.objectId);
                    wikiRepository.getPage($scope.branch, $scope.pageId, $scope.objectId, onFileContents);
                }
            }
            function onFileContents(details) {
                var contents = details.text;
                $scope.entity.source = contents;
                $scope.fileName = $scope.pageId.split('/').last();
                Wiki.log.debug("file name: ", $scope.fileName);
                Wiki.log.debug("file details: ", details);
                updateSourceView();
                Core.$apply($scope);
            }
            function updateSourceView() {
                if (form) {
                    if (isCreate()) {
                        if (!$scope.fileName) {
                            $scope.fileName = "" + Core.getUUID() + ".json";
                        }
                    }
                    $scope.sourceView = null;
                    $scope.git = wikiRepository.getPage($scope.branch, form, $scope.objectId, function (details) {
                        onFormSchema(Wiki.parseJson(details.text));
                    });
                }
                else {
                    $scope.sourceView = "plugins/wiki/html/sourceEdit.html";
                }
            }
            function onFormSchema(json) {
                $scope.formDefinition = json;
                if ($scope.entity.source) {
                    $scope.formEntity = Wiki.parseJson($scope.entity.source);
                }
                $scope.sourceView = "plugins/wiki/html/formEdit.html";
                Core.$apply($scope);
            }
            function goToView() {
                var path = Core.trimLeading($scope.viewLink(), "#");
                Wiki.log.debug("going to view " + path);
                $location.path(Wiki.decodePath(path));
                Wiki.log.debug("location is now " + $location.path());
            }
            function saveTo(path) {
                var commitMessage = $scope.commitMessage || "Updated page " + $scope.pageId;
                var contents = $scope.entity.source;
                if ($scope.formEntity) {
                    contents = JSON.stringify($scope.formEntity, null, "  ");
                }
                Wiki.log.debug("Saving file, branch: ", $scope.branch, " path: ", $scope.path);
                wikiRepository.putPage($scope.branch, path, contents, commitMessage, function (status) {
                    Wiki.onComplete(status);
                    $scope.modified = false;
                    Core.notification("success", "Saved " + path);
                    goToView();
                    Core.$apply($scope);
                });
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.FileDropController = Wiki._module.controller("Wiki.FileDropController", ["$scope", "FileUploader", "$route", "$timeout", "userDetails", function ($scope, FileUploader, $route, $timeout, userDetails) {
            var uploadURI = Wiki.gitRestURL($scope, $scope.pageId) + '/';
            var uploader = $scope.uploader = new FileUploader({
                headers: {
                    'Authorization': Core.authHeaderValue(userDetails)
                },
                autoUpload: true,
                withCredentials: true,
                method: 'POST',
                url: uploadURI
            });
            $scope.doUpload = function () {
                uploader.uploadAll();
            };
            uploader.onWhenAddingFileFailed = function (item, filter, options) {
                Wiki.log.debug('onWhenAddingFileFailed', item, filter, options);
            };
            uploader.onAfterAddingFile = function (fileItem) {
                Wiki.log.debug('onAfterAddingFile', fileItem);
            };
            uploader.onAfterAddingAll = function (addedFileItems) {
                Wiki.log.debug('onAfterAddingAll', addedFileItems);
            };
            uploader.onBeforeUploadItem = function (item) {
                if ('file' in item) {
                    item.fileSizeMB = (item.file.size / 1024 / 1024).toFixed(2);
                }
                else {
                    item.fileSizeMB = 0;
                }
                item.url = uploadURI;
                Wiki.log.info("Loading files to " + uploadURI);
                Wiki.log.debug('onBeforeUploadItem', item);
            };
            uploader.onProgressItem = function (fileItem, progress) {
                Wiki.log.debug('onProgressItem', fileItem, progress);
            };
            uploader.onProgressAll = function (progress) {
                Wiki.log.debug('onProgressAll', progress);
            };
            uploader.onSuccessItem = function (fileItem, response, status, headers) {
                Wiki.log.debug('onSuccessItem', fileItem, response, status, headers);
            };
            uploader.onErrorItem = function (fileItem, response, status, headers) {
                Wiki.log.debug('onErrorItem', fileItem, response, status, headers);
            };
            uploader.onCancelItem = function (fileItem, response, status, headers) {
                Wiki.log.debug('onCancelItem', fileItem, response, status, headers);
            };
            uploader.onCompleteItem = function (fileItem, response, status, headers) {
                Wiki.log.debug('onCompleteItem', fileItem, response, status, headers);
            };
            uploader.onCompleteAll = function () {
                Wiki.log.debug('onCompleteAll');
                uploader.clearQueue();
                $timeout(function () {
                    Wiki.log.info("Completed all uploads. Lets force a reload");
                    $route.reload();
                    Core.$apply($scope);
                }, 200);
            };
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.FormTableController", ["$scope", "$location", "$routeParams", function ($scope, $location, $routeParams) {
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            $scope.columnDefs = [];
            $scope.gridOptions = {
                data: 'list',
                displayFooter: false,
                showFilter: false,
                filterOptions: {
                    filterText: ''
                },
                columnDefs: $scope.columnDefs
            };
            $scope.viewLink = function (row) {
                return childLink(row, "/view");
            };
            $scope.editLink = function (row) {
                return childLink(row, "/edit");
            };
            function childLink(child, prefix) {
                var start = Wiki.startLink($scope);
                var childId = (child) ? child["_id"] || "" : "";
                return Core.createHref($location, start + prefix + "/" + $scope.pageId + "/" + childId);
            }
            var linksColumn = {
                field: '_id',
                displayName: 'Actions',
                cellTemplate: '<div class="ngCellText""><a ng-href="{{viewLink(row.entity)}}" class="btn">View</a> <a ng-href="{{editLink(row.entity)}}" class="btn">Edit</a></div>'
            };
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                setTimeout(updateView, 50);
            });
            var form = $location.search()["form"];
            if (form) {
                wikiRepository.getPage($scope.branch, form, $scope.objectId, onFormData);
            }
            updateView();
            function onResults(response) {
                var list = [];
                var map = Wiki.parseJson(response);
                angular.forEach(map, function (value, key) {
                    value["_id"] = key;
                    list.push(value);
                });
                $scope.list = list;
                Core.$apply($scope);
            }
            function updateView() {
                var filter = Core.pathGet($scope, ["gridOptions", "filterOptions", "filterText"]) || "";
                $scope.git = wikiRepository.jsonChildContents($scope.pageId, "*.json", filter, onResults);
            }
            function onFormData(details) {
                var text = details.text;
                if (text) {
                    $scope.formDefinition = Wiki.parseJson(text);
                    var columnDefs = [];
                    var schema = $scope.formDefinition;
                    angular.forEach(schema.properties, function (property, name) {
                        if (name) {
                            if (!Forms.isArrayOrNestedObject(property, schema)) {
                                var colDef = {
                                    field: name,
                                    displayName: property.description || name,
                                    visible: true
                                };
                                columnDefs.push(colDef);
                            }
                        }
                    });
                    columnDefs.push(linksColumn);
                    $scope.columnDefs = columnDefs;
                    $scope.gridOptions.columnDefs = columnDefs;
                    $scope.tableView = "plugins/wiki/html/formTableDatatable.html";
                }
            }
            Core.$apply($scope);
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.GitPreferences", ["$scope", "localStorage", "userDetails", function ($scope, localStorage, userDetails) {
            var config = {
                properties: {
                    gitUserName: {
                        type: 'string',
                        label: 'Username',
                        description: 'The user name to be used when making changes to files with the source control system'
                    },
                    gitUserEmail: {
                        type: 'string',
                        label: 'Email',
                        description: 'The email address to use when making changes to files with the source control system'
                    }
                }
            };
            $scope.entity = $scope;
            $scope.config = config;
            Core.initPreferenceScope($scope, localStorage, {
                'gitUserName': {
                    'value': userDetails.username || ""
                },
                'gitUserEmail': {
                    'value': ''
                }
            });
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.HistoryController", ["$scope", "$location", "$routeParams", "$templateCache", "marked", "fileExtensionTypeRegistry", function ($scope, $location, $routeParams, $templateCache, marked, fileExtensionTypeRegistry) {
            var isFmc = false;
            var jolokia = null;
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            $scope.dateFormat = 'EEE, MMM d, y at HH:mm:ss Z';
            $scope.gridOptions = {
                data: 'logs',
                showFilter: false,
                enableRowClickSelection: false,
                multiSelect: true,
                selectedItems: [],
                showSelectionCheckbox: true,
                displaySelectionCheckbox: true,
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
                setTimeout(updateView, 50);
            });
            $scope.canRevert = function () {
                var selectedItems = $scope.gridOptions.selectedItems;
                return selectedItems.length === 1 && selectedItems[0] !== $scope.logs[0];
            };
            $scope.revert = function () {
                var selectedItems = $scope.gridOptions.selectedItems;
                if (selectedItems.length > 0) {
                    var objectId = selectedItems[0].sha;
                    if (objectId) {
                        var commitMessage = "Reverting file " + $scope.pageId + " to previous version " + objectId;
                        wikiRepository.revertTo($scope.branch, objectId, $scope.pageId, commitMessage, function (result) {
                            Wiki.onComplete(result);
                            Core.notification('success', "Successfully reverted " + $scope.pageId);
                            updateView();
                        });
                    }
                    selectedItems.splice(0, selectedItems.length);
                }
            };
            $scope.diff = function () {
                var defaultValue = " ";
                var objectId = defaultValue;
                var selectedItems = $scope.gridOptions.selectedItems;
                if (selectedItems.length > 0) {
                    objectId = selectedItems[0].sha || defaultValue;
                }
                var baseObjectId = defaultValue;
                if (selectedItems.length > 1) {
                    baseObjectId = selectedItems[1].sha || defaultValue;
                    if (selectedItems[0].date < selectedItems[1].date) {
                        var _ = baseObjectId;
                        baseObjectId = objectId;
                        objectId = _;
                    }
                }
                var link = Wiki.startLink($scope) + "/diff/" + objectId + "/" + baseObjectId + "/" + $scope.pageId;
                var path = Core.trimLeading(link, "#");
                $location.path(path);
            };
            updateView();
            function updateView() {
                var objectId = "";
                var limit = 0;
                $scope.git = wikiRepository.history($scope.branch, objectId, $scope.pageId, limit, function (logArray) {
                    angular.forEach(logArray, function (log) {
                        var commitId = log.sha;
                        log.$date = Developer.asDate(log.date);
                        log.commitLink = Wiki.startLink($scope) + "/commitDetail/" + $scope.pageId + "/" + commitId;
                    });
                    $scope.logs = _.sortBy(logArray, "$date").reverse();
                    Core.$apply($scope);
                });
                Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.directive("commitHistoryPanel", function () {
        return {
            templateUrl: Wiki.templatePath + 'historyPanel.html'
        };
    });
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.NavBarController", ["$scope", "$location", "$routeParams", "wikiBranchMenu", function ($scope, $location, $routeParams, wikiBranchMenu) {
            var isFmc = false;
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            $scope.branchMenuConfig = {
                title: $scope.branch,
                items: []
            };
            $scope.ViewMode = Wiki.ViewMode;
            $scope.setViewMode = function (mode) {
                $scope.$emit('Wiki.SetViewMode', mode);
            };
            wikiBranchMenu.applyMenuExtensions($scope.branchMenuConfig.items);
            $scope.$watch('branches', function (newValue, oldValue) {
                if (newValue === oldValue || !newValue) {
                    return;
                }
                $scope.branchMenuConfig.items = [];
                if (newValue.length > 0) {
                    $scope.branchMenuConfig.items.push({
                        heading: isFmc ? "Versions" : "Branches"
                    });
                }
                newValue.sort().forEach(function (item) {
                    var menuItem = {
                        title: item,
                        icon: '',
                        action: function () { }
                    };
                    if (item === $scope.branch) {
                        menuItem.icon = "fa fa-ok";
                    }
                    else {
                        menuItem.action = function () {
                            var targetUrl = Wiki.branchLink(item, $scope.pageId, $location);
                            $location.path(Core.toPath(targetUrl));
                            Core.$apply($scope);
                        };
                    }
                    $scope.branchMenuConfig.items.push(menuItem);
                });
                wikiBranchMenu.applyMenuExtensions($scope.branchMenuConfig.items);
            }, true);
            $scope.createLink = function () {
                var pageId = Wiki.pageId($routeParams, $location);
                return Wiki.createLink($scope, pageId, $location);
            };
            $scope.startLink = Wiki.startLink($scope);
            $scope.sourceLink = function () {
                var path = $location.path();
                var answer = null;
                angular.forEach(Wiki.customViewLinks($scope), function (link) {
                    if (path.startsWith(link)) {
                        answer = Core.createHref($location, Wiki.startLink($scope) + "/view" + path.substring(link.length));
                    }
                });
                return (!answer && $location.search()["form"])
                    ? Core.createHref($location, "#" + path, ["form"])
                    : answer;
            };
            $scope.isActive = function (href) {
                if (!href) {
                    return false;
                }
                return href.endsWith($routeParams['page']);
            };
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                setTimeout(loadBreadcrumbs, 50);
            });
            loadBreadcrumbs();
            function switchFromViewToCustomLink(breadcrumb, link) {
                var href = breadcrumb.href;
                if (href) {
                    breadcrumb.href = href.replace("wiki/view", link);
                }
            }
            function loadBreadcrumbs() {
                var start = Wiki.startLink($scope);
                var href = start + "/view";
                $scope.breadcrumbs = [
                    { href: href, name: "root" }
                ];
                var path = Wiki.pageId($routeParams, $location);
                var array = path ? path.split("/") : [];
                angular.forEach(array, function (name) {
                    if (!name.startsWith("/") && !href.endsWith("/")) {
                        href += "/";
                    }
                    href += Wiki.encodePath(name);
                    if (!name.isBlank()) {
                        $scope.breadcrumbs.push({ href: href, name: name });
                    }
                });
                var loc = $location.path();
                if ($scope.breadcrumbs.length) {
                    var last = $scope.breadcrumbs[$scope.breadcrumbs.length - 1];
                    last.name = Wiki.hideFileNameExtensions(last.name);
                    var swizzled = false;
                    angular.forEach(Wiki.customViewLinks($scope), function (link) {
                        if (!swizzled && loc.startsWith(link)) {
                            switchFromViewToCustomLink($scope.breadcrumbs.last(), Core.trimLeading(link, "/"));
                            swizzled = true;
                        }
                    });
                    if (!swizzled && $location.search()["form"]) {
                        var lastName = $scope.breadcrumbs.last().name;
                        if (lastName && lastName.endsWith(".json")) {
                            switchFromViewToCustomLink($scope.breadcrumbs[$scope.breadcrumbs.length - 2], "wiki/formTable");
                        }
                    }
                }
                var name = null;
                if (loc.startsWith("/wiki/version")) {
                    name = ($routeParams["objectId"] || "").substring(0, 6) || "Version";
                    $scope.breadcrumbs.push({ href: "#" + loc, name: name });
                }
                if (loc.startsWith("/wiki/diff")) {
                    var v1 = ($routeParams["objectId"] || "").substring(0, 6);
                    var v2 = ($routeParams["baseObjectId"] || "").substring(0, 6);
                    name = "Diff";
                    if (v1) {
                        if (v2) {
                            name += " " + v1 + " " + v2;
                        }
                        else {
                            name += " " + v1;
                        }
                    }
                    $scope.breadcrumbs.push({ href: "#" + loc, name: name });
                }
                Core.$apply($scope);
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller('Wiki.OverviewDashboard', ["$scope", "$location", "$routeParams", function ($scope, $location, $routeParams) {
        Wiki.initScope($scope, $routeParams, $location);
        $scope.dashboardEmbedded = true;
        $scope.dashboardId = '0';
        $scope.dashboardIndex = '0';
        $scope.dashboardRepository = {
            getType: function () { return 'GitWikiRepository'; },
            putDashboards: function (array, commitMessage, cb) {
                return null;
            },
            deleteDashboards: function (array, fn) {
                return null;
            },
            getDashboards: function (fn) {
                Wiki.log.debug("getDashboards called");
                setTimeout(function () {
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
            getDashboard: function (id, fn) {
                $scope.$watch('model.fetched', function (fetched) {
                    if (!fetched) {
                        return;
                    }
                    $scope.$watch('selectedBuild', function (build) {
                        if (!build) {
                            return;
                        }
                        $scope.$watch('entity', function (entity) {
                            if (!entity) {
                                return;
                            }
                            var model = $scope.$eval('model');
                            console.log("Build: ", build);
                            console.log("Model: ", model);
                            console.log("Entity: ", entity);
                            setTimeout(function () {
                                var search = {
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
                                    _.forEach(entity.environments, function (env, index) {
                                        var s = _.extend({
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
            createDashboard: function (options) {
            }
        };
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.ViewController = Wiki._module.controller("Wiki.ViewController", ["$scope", "$location", "$routeParams", "$route", "$http", "$timeout", "marked", "fileExtensionTypeRegistry", "$compile", "$templateCache", "localStorage", "$interpolate", "$dialog", function ($scope, $location, $routeParams, $route, $http, $timeout, marked, fileExtensionTypeRegistry, $compile, $templateCache, localStorage, $interpolate, $dialog) {
            $scope.name = "WikiViewController";
            var isFmc = false;
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            SelectionHelpers.decorate($scope);
            $scope.fabricTopLevel = "fabric/profiles/";
            $scope.versionId = $scope.branch;
            $scope.paneTemplate = '';
            $scope.profileId = "";
            $scope.showProfileHeader = false;
            $scope.showAppHeader = false;
            $scope.operationCounter = 1;
            $scope.renameDialog = null;
            $scope.moveDialog = null;
            $scope.deleteDialog = null;
            $scope.isFile = false;
            $scope.rename = {
                newFileName: ""
            };
            $scope.move = {
                moveFolder: ""
            };
            $scope.ViewMode = Wiki.ViewMode;
            Core.bindModelToSearchParam($scope, $location, "searchText", "q", "");
            StorageHelpers.bindModelToLocalStorage({
                $scope: $scope,
                $location: $location,
                localStorage: localStorage,
                modelName: 'mode',
                paramName: 'wikiViewMode',
                initialValue: Wiki.ViewMode.Icon,
                to: Core.numberToString,
                from: Core.parseIntValue
            });
            Core.reloadWhenParametersChange($route, $scope, $location, ['wikiViewMode']);
            $scope.gridOptions = {
                data: 'children',
                displayFooter: false,
                selectedItems: [],
                showSelectionCheckbox: true,
                enableSorting: false,
                useExternalSorting: true,
                columnDefs: [
                    {
                        field: 'name',
                        displayName: 'Name',
                        cellTemplate: $templateCache.get('fileCellTemplate.html'),
                        headerCellTemplate: $templateCache.get('fileColumnTemplate.html')
                    }
                ]
            };
            $scope.$on('Wiki.SetViewMode', function ($event, mode) {
                $scope.mode = mode;
                switch (mode) {
                    case Wiki.ViewMode.List:
                        Wiki.log.debug("List view mode");
                        break;
                    case Wiki.ViewMode.Icon:
                        Wiki.log.debug("Icon view mode");
                        break;
                    default:
                        $scope.mode = Wiki.ViewMode.List;
                        Wiki.log.debug("Defaulting to list view mode");
                        break;
                }
            });
            $scope.childActions = [];
            var maybeUpdateView = Core.throttled(updateView, 1000);
            $scope.marked = function (text) {
                if (text) {
                    return marked(text);
                }
                else {
                    return '';
                }
            };
            $scope.$on('wikiBranchesUpdated', function () {
                updateView();
            });
            $scope.createDashboardLink = function () {
                var href = '/wiki/branch/:branch/view/*page';
                var page = $routeParams['page'];
                var title = page ? page.split("/").last() : null;
                var size = angular.toJson({
                    size_x: 2,
                    size_y: 2
                });
                var answer = "#/dashboard/add?tab=dashboard" +
                    "&href=" + encodeURIComponent(href) +
                    "&size=" + encodeURIComponent(size) +
                    "&routeParams=" + encodeURIComponent(angular.toJson($routeParams));
                if (title) {
                    answer += "&title=" + encodeURIComponent(title);
                }
                return answer;
            };
            $scope.displayClass = function () {
                if (!$scope.children || $scope.children.length === 0) {
                    return "";
                }
                return "span9";
            };
            $scope.parentLink = function () {
                var start = Wiki.startLink($scope);
                var prefix = start + "/view";
                var parts = $scope.pageId.split("/");
                var path = "/" + parts.first(parts.length - 1).join("/");
                return Core.createHref($location, prefix + path, []);
            };
            $scope.childLink = function (child) {
                var start = Wiki.startLink($scope);
                var prefix = start + "/view";
                var postFix = "";
                var path = Wiki.encodePath(child.path);
                if (child.directory) {
                    var formPath = path + ".form";
                    var children = $scope.children;
                    if (children) {
                        var formFile = children.find(function (child) {
                            return child['path'] === formPath;
                        });
                        if (formFile) {
                            prefix = start + "/formTable";
                            postFix = "?form=" + formPath;
                        }
                    }
                }
                else {
                    var xmlNamespaces = child.xml_namespaces || child.xmlNamespaces;
                    if (xmlNamespaces && xmlNamespaces.length) {
                        if (xmlNamespaces.any(function (ns) { return Wiki.camelNamespaces.any(ns); })) {
                            if (Wiki.useCamelCanvasByDefault) {
                                prefix = start + "/camel/canvas";
                            }
                            else {
                                prefix = start + "/camel/properties";
                            }
                        }
                        else if (xmlNamespaces.any(function (ns) { return Wiki.dozerNamespaces.any(ns); })) {
                            prefix = start + "/dozer/mappings";
                        }
                        else {
                            Wiki.log.debug("child " + path + " has namespaces " + xmlNamespaces);
                        }
                    }
                    if (child.path.endsWith(".form")) {
                        postFix = "?form=/";
                    }
                    else if (Wiki.isIndexPage(child.path)) {
                        prefix = start + "/book";
                    }
                }
                return Core.createHref($location, UrlHelpers.join(prefix, path) + postFix, ["form"]);
            };
            $scope.fileName = function (entity) {
                return Wiki.hideFileNameExtensions(entity.displayName || entity.name);
            };
            $scope.fileClass = function (entity) {
                if (entity.name.has(".profile")) {
                    return "green";
                }
                return "";
            };
            $scope.fileIconHtml = function (entity) {
                return Wiki.fileIconHtml(entity);
            };
            $scope.format = Wiki.fileFormat($scope.pageId, fileExtensionTypeRegistry);
            var options = {
                readOnly: true,
                mode: {
                    name: $scope.format
                }
            };
            $scope.codeMirrorOptions = CodeEditor.createEditorSettings(options);
            $scope.editLink = function () {
                var pageName = ($scope.directory) ? $scope.readMePath : $scope.pageId;
                return (pageName) ? Wiki.editLink($scope, pageName, $location) : null;
            };
            $scope.branchLink = function (branch) {
                if (branch) {
                    return Wiki.branchLink(branch, $scope.pageId, $location);
                }
                return null;
            };
            $scope.historyLink = "#/wiki" + ($scope.branch ? "/branch/" + $scope.branch : "") + "/history/" + $scope.pageId;
            $scope.$watch('workspace.tree', function () {
                if (!$scope.git) {
                    setTimeout(maybeUpdateView, 50);
                }
            });
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                setTimeout(maybeUpdateView, 50);
            });
            $scope.openDeleteDialog = function () {
                if ($scope.gridOptions.selectedItems.length) {
                    $scope.selectedFileHtml = "<ul>" + $scope.gridOptions.selectedItems.map(function (file) { return "<li>" + file.name + "</li>"; }).sort().join("") + "</ul>";
                    if ($scope.gridOptions.selectedItems.find(function (file) { return file.name.endsWith(".profile"); })) {
                        $scope.deleteWarning = "You are about to delete document(s) which represent Fabric8 profile(s). This really can't be undone! Wiki operations are low level and may lead to non-functional state of Fabric.";
                    }
                    else {
                        $scope.deleteWarning = null;
                    }
                    $scope.deleteDialog = Wiki.getDeleteDialog($dialog, {
                        callbacks: function () { return $scope.deleteAndCloseDialog; },
                        selectedFileHtml: function () { return $scope.selectedFileHtml; },
                        warning: function () { return $scope.deleteWarning; }
                    });
                    $scope.deleteDialog.open();
                }
                else {
                    Wiki.log.debug("No items selected right now! " + $scope.gridOptions.selectedItems);
                }
            };
            $scope.deleteAndCloseDialog = function () {
                var files = $scope.gridOptions.selectedItems;
                var fileCount = files.length;
                Wiki.log.debug("Deleting selection: " + files);
                var pathsToDelete = [];
                angular.forEach(files, function (file, idx) {
                    var path = UrlHelpers.join($scope.pageId, file.name);
                    pathsToDelete.push(path);
                });
                Wiki.log.debug("About to delete " + pathsToDelete);
                $scope.git = wikiRepository.removePages($scope.branch, pathsToDelete, null, function (result) {
                    $scope.gridOptions.selectedItems = [];
                    var message = Core.maybePlural(fileCount, "document");
                    Core.notification("success", "Deleted " + message);
                    Core.$apply($scope);
                    updateView();
                });
                $scope.deleteDialog.close();
            };
            $scope.$watch("rename.newFileName", function () {
                var path = getRenameFilePath();
                if ($scope.originalRenameFilePath === path) {
                    $scope.fileExists = { exists: false, name: null };
                }
                else {
                    checkFileExists(path);
                }
            });
            $scope.renameAndCloseDialog = function () {
                if ($scope.gridOptions.selectedItems.length) {
                    var selected = $scope.gridOptions.selectedItems[0];
                    var newPath = getRenameFilePath();
                    if (selected && newPath) {
                        var oldName = selected.name;
                        var newName = Wiki.fileName(newPath);
                        var oldPath = UrlHelpers.join($scope.pageId, oldName);
                        Wiki.log.debug("About to rename file " + oldPath + " to " + newPath);
                        $scope.git = wikiRepository.rename($scope.branch, oldPath, newPath, null, function (result) {
                            Core.notification("success", "Renamed file to  " + newName);
                            $scope.gridOptions.selectedItems.splice(0, 1);
                            $scope.renameDialog.close();
                            Core.$apply($scope);
                            updateView();
                        });
                    }
                }
                $scope.renameDialog.close();
            };
            $scope.openRenameDialog = function () {
                var name = null;
                if ($scope.gridOptions.selectedItems.length) {
                    var selected = $scope.gridOptions.selectedItems[0];
                    name = selected.name;
                }
                if (name) {
                    $scope.rename.newFileName = name;
                    $scope.originalRenameFilePath = getRenameFilePath();
                    $scope.renameDialog = Wiki.getRenameDialog($dialog, {
                        rename: function () { return $scope.rename; },
                        fileExists: function () { return $scope.fileExists; },
                        fileName: function () { return $scope.fileName; },
                        callbacks: function () { return $scope.renameAndCloseDialog; }
                    });
                    $scope.renameDialog.open();
                    $timeout(function () {
                        $('#renameFileName').focus();
                    }, 50);
                }
                else {
                    Wiki.log.debug("No items selected right now! " + $scope.gridOptions.selectedItems);
                }
            };
            $scope.moveAndCloseDialog = function () {
                var files = $scope.gridOptions.selectedItems;
                var fileCount = files.length;
                var moveFolder = $scope.move.moveFolder;
                var oldFolder = $scope.pageId;
                if (moveFolder && fileCount && moveFolder !== oldFolder) {
                    Wiki.log.debug("Moving " + fileCount + " file(s) to " + moveFolder);
                    angular.forEach(files, function (file, idx) {
                        var oldPath = oldFolder + "/" + file.name;
                        var newPath = moveFolder + "/" + file.name;
                        Wiki.log.debug("About to move " + oldPath + " to " + newPath);
                        $scope.git = wikiRepository.rename($scope.branch, oldPath, newPath, null, function (result) {
                            if (idx + 1 === fileCount) {
                                $scope.gridOptions.selectedItems.splice(0, fileCount);
                                var message = Core.maybePlural(fileCount, "document");
                                Core.notification("success", "Moved " + message + " to " + newPath);
                                $scope.moveDialog.close();
                                Core.$apply($scope);
                                updateView();
                            }
                        });
                    });
                }
                $scope.moveDialog.close();
            };
            $scope.folderNames = function (text) {
                return wikiRepository.completePath($scope.branch, text, true, null);
            };
            $scope.openMoveDialog = function () {
                if ($scope.gridOptions.selectedItems.length) {
                    $scope.move.moveFolder = $scope.pageId;
                    $scope.moveDialog = Wiki.getMoveDialog($dialog, {
                        move: function () { return $scope.move; },
                        folderNames: function () { return $scope.folderNames; },
                        callbacks: function () { return $scope.moveAndCloseDialog; }
                    });
                    $scope.moveDialog.open();
                    $timeout(function () {
                        $('#moveFolder').focus();
                    }, 50);
                }
                else {
                    Wiki.log.debug("No items selected right now! " + $scope.gridOptions.selectedItems);
                }
            };
            setTimeout(maybeUpdateView, 50);
            function isDiffView() {
                return $routeParams["diffObjectId1"] || $routeParams["diffObjectId2"] ? true : false;
            }
            function updateView() {
                var jolokia = null;
                if (isDiffView()) {
                    var baseObjectId = $routeParams["diffObjectId2"];
                    $scope.git = wikiRepository.diff($scope.objectId, baseObjectId, $scope.pageId, onFileDetails);
                }
                else {
                    $scope.git = wikiRepository.getPage($scope.branch, $scope.pageId, $scope.objectId, onFileDetails);
                }
                Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
            }
            $scope.updateView = updateView;
            function viewContents(pageName, contents) {
                $scope.sourceView = null;
                var format = null;
                if (isDiffView()) {
                    format = "diff";
                }
                else {
                    format = Wiki.fileFormat(pageName, fileExtensionTypeRegistry) || $scope.format;
                }
                Wiki.log.debug("File format: ", format);
                switch (format) {
                    case "image":
                        var imageURL = 'git/' + $scope.branch;
                        Wiki.log.debug("$scope: ", $scope);
                        imageURL = UrlHelpers.join(imageURL, $scope.pageId);
                        var interpolateFunc = $interpolate($templateCache.get("imageTemplate.html"));
                        $scope.html = interpolateFunc({
                            imageURL: imageURL
                        });
                        break;
                    case "markdown":
                        $scope.html = contents ? marked(contents) : "";
                        break;
                    case "javascript":
                        var form = null;
                        form = $location.search()["form"];
                        $scope.source = contents;
                        $scope.form = form;
                        if (form) {
                            $scope.sourceView = null;
                            $scope.git = wikiRepository.getPage($scope.branch, form, $scope.objectId, function (details) {
                                onFormSchema(Wiki.parseJson(details.text));
                            });
                        }
                        else {
                            $scope.sourceView = "plugins/wiki/html/sourceView.html";
                        }
                        break;
                    default:
                        $scope.html = null;
                        $scope.source = contents;
                        $scope.sourceView = "plugins/wiki/html/sourceView.html";
                }
                Core.$apply($scope);
            }
            function onFormSchema(json) {
                $scope.formDefinition = json;
                if ($scope.source) {
                    $scope.formEntity = Wiki.parseJson($scope.source);
                }
                $scope.sourceView = "plugins/wiki/html/formView.html";
                Core.$apply($scope);
            }
            function onFileDetails(details) {
                var contents = details.text;
                $scope.directory = details.directory;
                $scope.fileDetails = details;
                if (details && details.format) {
                    $scope.format = details.format;
                }
                else {
                    $scope.format = Wiki.fileFormat($scope.pageId, fileExtensionTypeRegistry);
                }
                $scope.codeMirrorOptions.mode.name = $scope.format;
                $scope.children = null;
                if (details.directory) {
                    var directories = details.children.filter(function (dir) {
                        return dir.directory;
                    });
                    var profiles = details.children.filter(function (dir) {
                        return false;
                    });
                    var files = details.children.filter(function (file) {
                        return !file.directory;
                    });
                    directories = directories.sortBy(function (dir) {
                        return dir.name;
                    });
                    profiles = profiles.sortBy(function (dir) {
                        return dir.name;
                    });
                    files = files.sortBy(function (file) {
                        return file.name;
                    })
                        .sortBy(function (file) {
                        return file.name.split('.').last();
                    });
                    $scope.children = Array.create(directories, profiles, files).map(function (file) {
                        file.branch = $scope.branch;
                        file.fileName = file.name;
                        if (file.directory) {
                            file.fileName += ".zip";
                        }
                        file.downloadURL = Wiki.gitRestURL($scope, file.path);
                        return file;
                    });
                }
                $scope.html = null;
                $scope.source = null;
                $scope.readMePath = null;
                $scope.isFile = false;
                if ($scope.children) {
                    $scope.$broadcast('pane.open');
                    var item = $scope.children.find(function (info) {
                        var name = (info.name || "").toLowerCase();
                        var ext = Wiki.fileExtension(name);
                        return name && ext && ((name.startsWith("readme.") || name === "readme") || (name.startsWith("index.") || name === "index"));
                    });
                    if (item) {
                        var pageName = item.path;
                        $scope.readMePath = pageName;
                        wikiRepository.getPage($scope.branch, pageName, $scope.objectId, function (readmeDetails) {
                            viewContents(pageName, readmeDetails.text);
                        });
                    }
                    var kubernetesJson = $scope.children.find(function (child) {
                        var name = (child.name || "").toLowerCase();
                        var ext = Wiki.fileExtension(name);
                        return name && ext && name.startsWith("kubernetes") && ext === "json";
                    });
                    if (kubernetesJson) {
                        wikiRepository.getPage($scope.branch, kubernetesJson.path, undefined, function (json) {
                            if (json && json.text) {
                                try {
                                    $scope.kubernetesJson = angular.fromJson(json.text);
                                }
                                catch (e) {
                                    $scope.kubernetesJson = {
                                        errorParsing: true,
                                        error: e
                                    };
                                }
                                $scope.showAppHeader = true;
                                Core.$apply($scope);
                            }
                        });
                    }
                    $scope.$broadcast('Wiki.ViewPage.Children', $scope.pageId, $scope.children);
                }
                else {
                    $scope.$broadcast('pane.close');
                    var pageName = $scope.pageId;
                    viewContents(pageName, contents);
                    $scope.isFile = true;
                }
                Core.$apply($scope);
            }
            function checkFileExists(path) {
                $scope.operationCounter += 1;
                var counter = $scope.operationCounter;
                if (path) {
                    wikiRepository.exists($scope.branch, path, function (result) {
                        if ($scope.operationCounter === counter) {
                            Wiki.log.debug("checkFileExists for path " + path + " got result " + result);
                            $scope.fileExists.exists = result ? true : false;
                            $scope.fileExists.name = result ? result.name : null;
                            Core.$apply($scope);
                        }
                        else {
                        }
                    });
                }
            }
            $scope.getContents = function (filename, cb) {
                var pageId = filename;
                if ($scope.directory) {
                    pageId = $scope.pageId + '/' + filename;
                }
                else {
                    var pathParts = $scope.pageId.split('/');
                    pathParts = pathParts.remove(pathParts.last());
                    pathParts.push(filename);
                    pageId = pathParts.join('/');
                }
                Wiki.log.debug("pageId: ", $scope.pageId);
                Wiki.log.debug("branch: ", $scope.branch);
                Wiki.log.debug("filename: ", filename);
                Wiki.log.debug("using pageId: ", pageId);
                wikiRepository.getPage($scope.branch, pageId, undefined, function (data) {
                    cb(data.text);
                });
            };
            function getRenameFilePath() {
                var newFileName = $scope.rename.newFileName;
                return ($scope.pageId && newFileName) ? UrlHelpers.join($scope.pageId, newFileName) : null;
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    function getRenameDialog($dialog, $scope) {
        return $dialog.dialog({
            resolve: $scope,
            templateUrl: 'plugins/wiki/html/modal/renameDialog.html',
            controller: ["$scope", "dialog", "callbacks", "rename", "fileExists", "fileName", function ($scope, dialog, callbacks, rename, fileExists, fileName) {
                    $scope.rename = rename;
                    $scope.fileExists = fileExists;
                    $scope.fileName = fileName;
                    $scope.close = function (result) {
                        dialog.close();
                    };
                    $scope.renameAndCloseDialog = callbacks;
                }]
        });
    }
    Wiki.getRenameDialog = getRenameDialog;
    function getMoveDialog($dialog, $scope) {
        return $dialog.dialog({
            resolve: $scope,
            templateUrl: 'plugins/wiki/html/modal/moveDialog.html',
            controller: ["$scope", "dialog", "callbacks", "move", "folderNames", function ($scope, dialog, callbacks, move, folderNames) {
                    $scope.move = move;
                    $scope.folderNames = folderNames;
                    $scope.close = function (result) {
                        dialog.close();
                    };
                    $scope.moveAndCloseDialog = callbacks;
                }]
        });
    }
    Wiki.getMoveDialog = getMoveDialog;
    function getDeleteDialog($dialog, $scope) {
        return $dialog.dialog({
            resolve: $scope,
            templateUrl: 'plugins/wiki/html/modal/deleteDialog.html',
            controller: ["$scope", "dialog", "callbacks", "selectedFileHtml", "warning", function ($scope, dialog, callbacks, selectedFileHtml, warning) {
                    $scope.selectedFileHtml = selectedFileHtml;
                    $scope.close = function (result) {
                        dialog.close();
                    };
                    $scope.deleteAndCloseDialog = callbacks;
                    $scope.warning = warning;
                }]
        });
    }
    Wiki.getDeleteDialog = getDeleteDialog;
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.directive('wikiHrefAdjuster', ["$location", function ($location) {
            return {
                restrict: 'A',
                link: function ($scope, $element, $attr) {
                    $element.bind('DOMNodeInserted', function (event) {
                        var ays = $element.find('a');
                        angular.forEach(ays, function (a) {
                            if (a.hasAttribute('no-adjust')) {
                                return;
                            }
                            a = $(a);
                            var href = (a.attr('href') || "").trim();
                            if (href) {
                                var fileExtension = a.attr('file-extension');
                                var newValue = Wiki.adjustHref($scope, $location, href, fileExtension);
                                if (newValue) {
                                    a.attr('href', newValue);
                                }
                            }
                        });
                        var imgs = $element.find('img');
                        angular.forEach(imgs, function (a) {
                            if (a.hasAttribute('no-adjust')) {
                                return;
                            }
                            a = $(a);
                            var href = (a.attr('src') || "").trim();
                            if (href) {
                                if (href.startsWith("/")) {
                                    href = Core.url(href);
                                    a.attr('src', href);
                                    a.attr('no-adjust', 'true');
                                }
                            }
                        });
                    });
                }
            };
        }]);
    Wiki._module.directive('wikiTitleLinker', ["$location", function ($location) {
            return {
                restrict: 'A',
                link: function ($scope, $element, $attr) {
                    var loaded = false;
                    function offsetTop(elements) {
                        if (elements) {
                            var offset = elements.offset();
                            if (offset) {
                                return offset.top;
                            }
                        }
                        return 0;
                    }
                    function scrollToHash() {
                        var answer = false;
                        var id = $location.search()["hash"];
                        return scrollToId(id);
                    }
                    function scrollToId(id) {
                        var answer = false;
                        var id = $location.search()["hash"];
                        if (id) {
                            var selector = 'a[name="' + id + '"]';
                            var targetElements = $element.find(selector);
                            if (targetElements && targetElements.length) {
                                var scrollDuration = 1;
                                var delta = offsetTop($($element));
                                var top = offsetTop(targetElements) - delta;
                                if (top < 0) {
                                    top = 0;
                                }
                                $('body,html').animate({
                                    scrollTop: top
                                }, scrollDuration);
                                answer = true;
                            }
                            else {
                            }
                        }
                        return answer;
                    }
                    function addLinks(event) {
                        var headings = $element.find('h1,h2,h3,h4,h5,h6,h7');
                        var updated = false;
                        angular.forEach(headings, function (he) {
                            var h1 = $(he);
                            var a = h1.parent("a");
                            if (!a || !a.length) {
                                var text = h1.text();
                                if (text) {
                                    var target = text.replace(/ /g, "-");
                                    var pathWithHash = "#" + $location.path() + "?hash=" + target;
                                    var link = Core.createHref($location, pathWithHash, ['hash']);
                                    var newA = $('<a name="' + target + '" href="' + link + '" ng-click="onLinkClick()"></a>');
                                    newA.on("click", function () {
                                        setTimeout(function () {
                                            if (scrollToId(target)) {
                                            }
                                        }, 50);
                                    });
                                    newA.insertBefore(h1);
                                    h1.detach();
                                    newA.append(h1);
                                    updated = true;
                                }
                            }
                        });
                        if (updated && !loaded) {
                            setTimeout(function () {
                                if (scrollToHash()) {
                                    loaded = true;
                                }
                            }, 50);
                        }
                    }
                    function onEventInserted(event) {
                        $element.unbind('DOMNodeInserted', onEventInserted);
                        addLinks(event);
                        $element.bind('DOMNodeInserted', onEventInserted);
                    }
                    $element.bind('DOMNodeInserted', onEventInserted);
                }
            };
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
var Wiki;
(function (Wiki) {
    Developer.customProjectSubTabFactories.push(function (context) {
        var projectLink = context.projectLink;
        var wikiLink = null;
        if (projectLink) {
            wikiLink = UrlHelpers.join(projectLink, "wiki", "view");
        }
        return {
            isValid: function () { return wikiLink && Developer.forgeReadyLink(); },
            href: wikiLink,
            label: "Source",
            title: "Browse the source code of this project"
        };
    });
    function createSourceBreadcrumbs($scope) {
        var sourceLink = $scope.$viewLink || UrlHelpers.join(Wiki.startLink($scope), "view");
        return [
            {
                label: "Source",
                href: sourceLink,
                title: "Browse the source code of this project"
            }
        ];
    }
    Wiki.createSourceBreadcrumbs = createSourceBreadcrumbs;
    function createEditingBreadcrumb($scope) {
        return {
            label: "Editing",
            title: "Editing this file"
        };
    }
    Wiki.createEditingBreadcrumb = createEditingBreadcrumb;
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    var GitWikiRepository = (function () {
        function GitWikiRepository($scope) {
            this.directoryPrefix = "";
            var ForgeApiURL = Kubernetes.inject("ForgeApiURL");
            this.$http = Kubernetes.inject("$http");
            this.config = Forge.createHttpConfig();
            var owner = $scope.owner;
            var repoName = $scope.repoId;
            var projectId = $scope.projectId;
            this.projectId = projectId;
            var ns = $scope.namespace || Kubernetes.currentKubernetesNamespace();
            this.baseUrl = UrlHelpers.join(ForgeApiURL, "repos/project", ns, projectId);
        }
        GitWikiRepository.prototype.getPage = function (branch, path, objectId, fn) {
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            this.doGet(UrlHelpers.join("content", path || "/"), query, function (data, status, headers, config) {
                if (data) {
                    var details = null;
                    if (angular.isArray(data)) {
                        angular.forEach(data, function (file) {
                            if (!file.directory && file.type === "dir") {
                                file.directory = true;
                            }
                        });
                        details = {
                            directory: true,
                            children: data
                        };
                    }
                    else {
                        details = data;
                        var content = data.content;
                        if (content) {
                            details.text = content.decodeBase64();
                        }
                    }
                    fn(details);
                }
            });
        };
        GitWikiRepository.prototype.putPage = function (branch, path, contents, commitMessage, fn) {
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            if (commitMessage) {
                query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
            }
            var body = contents;
            this.doPost(UrlHelpers.join("content", path || "/"), query, body, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.history = function (branch, objectId, path, limit, fn) {
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            if (limit) {
                query = (query ? query + "&" : "") + "limit=" + limit;
            }
            var commitId = objectId || branch;
            this.doGet(UrlHelpers.join("history", commitId, path), query, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.commitInfo = function (commitId, fn) {
            var query = null;
            this.doGet(UrlHelpers.join("commitInfo", commitId), query, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.commitDetail = function (commitId, fn) {
            var query = null;
            this.doGet(UrlHelpers.join("commitDetail", commitId), query, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.commitTree = function (commitId, fn) {
            var query = null;
            this.doGet(UrlHelpers.join("commitTree", commitId), query, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.diff = function (objectId, baseObjectId, path, fn) {
            var query = null;
            var config = Forge.createHttpConfig();
            config.transformResponse = function (data, headersGetter, status) {
                Wiki.log.info("got diff data: " + data);
                return data;
            };
            this.doGet(UrlHelpers.join("diff", objectId, baseObjectId, path), query, function (data, status, headers, config) {
                var details = {
                    text: data,
                    format: "diff",
                    directory: false
                };
                fn(details);
            }, null, config);
        };
        GitWikiRepository.prototype.branches = function (fn) {
            var query = null;
            this.doGet("listBranches", query, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.exists = function (branch, path, fn) {
            var answer = false;
            this.getPage(branch, path, null, function (data) {
                if (data.directory) {
                    if (data.children.length) {
                        answer = true;
                    }
                }
                else {
                    answer = true;
                }
                Wiki.log.info("exists " + path + " answer = " + answer);
                if (angular.isFunction(fn)) {
                    fn(answer);
                }
            });
            return answer;
        };
        GitWikiRepository.prototype.revertTo = function (branch, objectId, blobPath, commitMessage, fn) {
            if (!commitMessage) {
                commitMessage = "Reverting " + blobPath + " commit " + (objectId || branch);
            }
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            if (commitMessage) {
                query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
            }
            var body = "";
            this.doPost(UrlHelpers.join("revert", objectId, blobPath || "/"), query, body, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.rename = function (branch, oldPath, newPath, commitMessage, fn) {
            if (!commitMessage) {
                commitMessage = "Renaming page " + oldPath + " to " + newPath;
            }
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            if (commitMessage) {
                query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
            }
            if (oldPath) {
                query = (query ? query + "&" : "") + "old=" + encodeURIComponent(oldPath);
            }
            var body = "";
            this.doPost(UrlHelpers.join("mv", newPath || "/"), query, body, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.removePage = function (branch, path, commitMessage, fn) {
            if (!commitMessage) {
                commitMessage = "Removing page " + path;
            }
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            if (commitMessage) {
                query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
            }
            var body = "";
            this.doPost(UrlHelpers.join("rm", path || "/"), query, body, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.removePages = function (branch, paths, commitMessage, fn) {
            if (!commitMessage) {
                commitMessage = "Removing page" + (paths.length > 1 ? "s" : "") + " " + paths.join(", ");
            }
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            if (commitMessage) {
                query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
            }
            var body = paths;
            this.doPost(UrlHelpers.join("rm"), query, body, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.doGet = function (path, query, successFn, errorFn, config) {
            if (errorFn === void 0) { errorFn = null; }
            if (config === void 0) { config = null; }
            var url = Forge.createHttpUrl(this.projectId, UrlHelpers.join(this.baseUrl, path));
            if (query) {
                url += "&" + query;
            }
            if (!errorFn) {
                errorFn = function (data, status, headers, config) {
                    Wiki.log.warn("failed to load! " + url + ". status: " + status + " data: " + data);
                };
            }
            if (!config) {
                config = this.config;
            }
            this.$http.get(url, config).
                success(successFn).
                error(errorFn);
        };
        GitWikiRepository.prototype.doPost = function (path, query, body, successFn, errorFn) {
            if (errorFn === void 0) { errorFn = null; }
            var url = Forge.createHttpUrl(this.projectId, UrlHelpers.join(this.baseUrl, path));
            if (query) {
                url += "&" + query;
            }
            if (!errorFn) {
                errorFn = function (data, status, headers, config) {
                    Wiki.log.warn("failed to load! " + url + ". status: " + status + " data: " + data);
                };
            }
            this.$http.post(url, body, this.config).
                success(successFn).
                error(errorFn);
        };
        GitWikiRepository.prototype.doPostForm = function (path, query, body, successFn, errorFn) {
            if (errorFn === void 0) { errorFn = null; }
            var url = Forge.createHttpUrl(this.projectId, UrlHelpers.join(this.baseUrl, path));
            if (query) {
                url += "&" + query;
            }
            if (!errorFn) {
                errorFn = function (data, status, headers, config) {
                    Wiki.log.warn("failed to load! " + url + ". status: " + status + " data: " + data);
                };
            }
            var config = Forge.createHttpConfig();
            if (!config.headers) {
                config.headers = {};
            }
            config.headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8";
            this.$http.post(url, body, config).
                success(successFn).
                error(errorFn);
        };
        GitWikiRepository.prototype.completePath = function (branch, completionText, directoriesOnly, fn) {
        };
        GitWikiRepository.prototype.getPath = function (path) {
            var directoryPrefix = this.directoryPrefix;
            return (directoryPrefix) ? directoryPrefix + path : path;
        };
        GitWikiRepository.prototype.getLogPath = function (path) {
            return Core.trimLeading(this.getPath(path), "/");
        };
        GitWikiRepository.prototype.getContent = function (objectId, blobPath, fn) {
        };
        GitWikiRepository.prototype.jsonChildContents = function (path, nameWildcard, search, fn) {
        };
        GitWikiRepository.prototype.git = function () {
        };
        return GitWikiRepository;
    })();
    Wiki.GitWikiRepository = GitWikiRepository;
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.TopLevelController = Wiki._module.controller("Wiki.TopLevelController", ['$scope', '$route', '$routeParams', function ($scope, $route, $routeParams) {
        }]);
})(Wiki || (Wiki = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VQbHVnaW4udHMiLCJmb3JnZS90cy9jb21tYW5kLnRzIiwiZm9yZ2UvdHMvY29tbWFuZHMudHMiLCJmb3JnZS90cy9yZXBvLnRzIiwiZm9yZ2UvdHMvcmVwb3MudHMiLCJmb3JnZS90cy9zZWNyZXRIZWxwZXJzLnRzIiwiZm9yZ2UvdHMvc2VjcmV0cy50cyIsIm1haW4vdHMvbWFpbkdsb2JhbHMudHMiLCJtYWluL3RzL21haW5QbHVnaW4udHMiLCJtYWluL3RzL2Fib3V0LnRzIiwid2lraS90cy93aWtpSGVscGVycy50cyIsIndpa2kvdHMvd2lraVBsdWdpbi50cyIsIndpa2kvdHMvY2FtZWwudHMiLCJ3aWtpL3RzL2NhbWVsQ2FudmFzLnRzIiwid2lraS90cy9jb21taXQudHMiLCJ3aWtpL3RzL2NvbW1pdERldGFpbC50cyIsIndpa2kvdHMvY3JlYXRlLnRzIiwid2lraS90cy9lZGl0LnRzIiwid2lraS90cy9maWxlRHJvcC50cyIsIndpa2kvdHMvZm9ybVRhYmxlLnRzIiwid2lraS90cy9naXRQcmVmZXJlbmNlcy50cyIsIndpa2kvdHMvaGlzdG9yeS50cyIsIndpa2kvdHMvaGlzdG9yeURpcmVjdGl2ZS50cyIsIndpa2kvdHMvbmF2YmFyLnRzIiwid2lraS90cy9vdmVydmlld0Rhc2hib2FyZC50cyIsIndpa2kvdHMvdmlldy50cyIsIndpa2kvdHMvd2lraURpYWxvZ3MudHMiLCJ3aWtpL3RzL3dpa2lEaXJlY3RpdmVzLnRzIiwid2lraS90cy93aWtpTmF2aWdhdGlvbi50cyIsIndpa2kvdHMvd2lraVJlcG9zaXRvcnkudHMiLCJ3aWtpL3RzL3dpa2lUb3BMZXZlbC50cyJdLCJuYW1lcyI6WyJGb3JnZSIsIkZvcmdlLmlzRm9yZ2UiLCJGb3JnZS5pbml0U2NvcGUiLCJGb3JnZS5jb21tYW5kTGluayIsIkZvcmdlLmNvbW1hbmRzTGluayIsIkZvcmdlLnJlcG9zQXBpVXJsIiwiRm9yZ2UucmVwb0FwaVVybCIsIkZvcmdlLmNvbW1hbmRBcGlVcmwiLCJGb3JnZS5leGVjdXRlQ29tbWFuZEFwaVVybCIsIkZvcmdlLnZhbGlkYXRlQ29tbWFuZEFwaVVybCIsIkZvcmdlLmNvbW1hbmRJbnB1dEFwaVVybCIsIkZvcmdlLm1vZGVsUHJvamVjdCIsIkZvcmdlLnNldE1vZGVsQ29tbWFuZHMiLCJGb3JnZS5nZXRNb2RlbENvbW1hbmRzIiwiRm9yZ2UubW9kZWxDb21tYW5kSW5wdXRNYXAiLCJGb3JnZS5nZXRNb2RlbENvbW1hbmRJbnB1dHMiLCJGb3JnZS5zZXRNb2RlbENvbW1hbmRJbnB1dHMiLCJGb3JnZS5lbnJpY2hSZXBvIiwiRm9yZ2UuY3JlYXRlSHR0cENvbmZpZyIsIkZvcmdlLmFkZFF1ZXJ5QXJndW1lbnQiLCJGb3JnZS5jcmVhdGVIdHRwVXJsIiwiRm9yZ2UuY29tbWFuZE1hdGNoZXNUZXh0IiwiRm9yZ2UuaXNTb3VyY2VTZWNyZXREZWZpbmVkRm9yUHJvamVjdCIsIkZvcmdlLnJlZGlyZWN0VG9TZXR1cFNlY3JldHNJZk5vdERlZmluZWQiLCJGb3JnZS5vblJvdXRlQ2hhbmdlZCIsImNvcHlWYWx1ZXNGcm9tU2NoZW1hIiwiRm9yZ2UudXBkYXRlU2NoZW1hIiwiRm9yZ2UudmFsaWRhdGUiLCJGb3JnZS50b0JhY2tncm91bmRTdHlsZSIsIkZvcmdlLnVwZGF0ZURhdGEiLCJGb3JnZS5vblNjaGVtYUxvYWQiLCJGb3JnZS5jb21tYW5kTWF0Y2hlcyIsIkZvcmdlLmRvRGVsZXRlIiwiRm9yZ2UudXBkYXRlTGlua3MiLCJGb3JnZS5nZXRTb3VyY2VTZWNyZXROYW1lc3BhY2UiLCJGb3JnZS5nZXRQcm9qZWN0U291cmNlU2VjcmV0IiwiRm9yZ2Uuc2V0UHJvamVjdFNvdXJjZVNlY3JldCIsIkZvcmdlLnBhcnNlVXJsIiwiRm9yZ2UuY3JlYXRlTG9jYWxTdG9yYWdlS2V5IiwiRm9yZ2Uuc2VsZWN0ZWRTZWNyZXROYW1lIiwiRm9yZ2UudXBkYXRlUHJvamVjdCIsIkZvcmdlLm9uUGVyc29uYWxTZWNyZXRzIiwiRm9yZ2Uub25CdWlsZENvbmZpZ3MiLCJGb3JnZS5jaGVja05hbWVzcGFjZUNyZWF0ZWQiLCJGb3JnZS5jaGVja05hbWVzcGFjZUNyZWF0ZWQud2F0Y2hTZWNyZXRzIiwiTWFpbiIsIldpa2kiLCJXaWtpLlZpZXdNb2RlIiwiV2lraS5pc0ZNQ0NvbnRhaW5lciIsIldpa2kuaXNXaWtpRW5hYmxlZCIsIldpa2kuZ29Ub0xpbmsiLCJXaWtpLmN1c3RvbVZpZXdMaW5rcyIsIldpa2kuY3JlYXRlV2l6YXJkVHJlZSIsIldpa2kuY3JlYXRlRm9sZGVyIiwiV2lraS5hZGRDcmVhdGVXaXphcmRGb2xkZXJzIiwiV2lraS5zdGFydFdpa2lMaW5rIiwiV2lraS5zdGFydExpbmsiLCJXaWtpLmlzSW5kZXhQYWdlIiwiV2lraS52aWV3TGluayIsIldpa2kuYnJhbmNoTGluayIsIldpa2kuZWRpdExpbmsiLCJXaWtpLmNyZWF0ZUxpbmsiLCJXaWtpLmVuY29kZVBhdGgiLCJXaWtpLmRlY29kZVBhdGgiLCJXaWtpLmZpbGVGb3JtYXQiLCJXaWtpLmZpbGVOYW1lIiwiV2lraS5maWxlUGFyZW50IiwiV2lraS5oaWRlRmlsZU5hbWVFeHRlbnNpb25zIiwiV2lraS5naXRSZXN0VVJMIiwiV2lraS5naXRVcmxQcmVmaXgiLCJXaWtpLmdpdFJlbGF0aXZlVVJMIiwiV2lraS5maWxlSWNvbkh0bWwiLCJXaWtpLmljb25DbGFzcyIsIldpa2kuaW5pdFNjb3BlIiwiV2lraS5sb2FkQnJhbmNoZXMiLCJXaWtpLnBhZ2VJZCIsIldpa2kucGFnZUlkRnJvbVVSSSIsIldpa2kuZmlsZUV4dGVuc2lvbiIsIldpa2kub25Db21wbGV0ZSIsIldpa2kucGFyc2VKc29uIiwiV2lraS5hZGp1c3RIcmVmIiwiV2lraS5nZXRGb2xkZXJYbWxOb2RlIiwiV2lraS5hZGROZXdOb2RlIiwiV2lraS5vbk1vZGVsQ2hhbmdlRXZlbnQiLCJXaWtpLm9uTm9kZURhdGFDaGFuZ2VkIiwiV2lraS5vblJlc3VsdHMiLCJXaWtpLnVwZGF0ZVZpZXciLCJXaWtpLmdvVG9WaWV3IiwiV2lraS5pc1JvdXRlT3JOb2RlIiwiV2lraS5jcmVhdGVFbmRwb2ludFVSSSIsIldpa2kudHJlZU1vZGlmaWVkIiwiV2lraS5yZWxvYWRSb3V0ZUlkcyIsIldpa2kub25Sb3V0ZVNlbGVjdGlvbkNoYW5nZWQiLCJXaWtpLnNob3dHcmFwaCIsIldpa2kuZ2V0Tm9kZUlkIiwiV2lraS5nZXRTZWxlY3RlZE9yUm91dGVGb2xkZXIiLCJXaWtpLmdldENvbnRhaW5lckVsZW1lbnQiLCJXaWtpLmxheW91dEdyYXBoIiwiV2lraS5nZXRMaW5rIiwiV2lraS5nZXROb2RlQnlDSUQiLCJXaWtpLnVwZGF0ZVNlbGVjdGlvbiIsIldpa2kuZ2V0V2lkdGgiLCJXaWtpLmdldEZvbGRlcklkQXR0cmlidXRlIiwiV2lraS5nZXRSb3V0ZUZvbGRlciIsIldpa2kuY29tbWl0UGF0aCIsIldpa2kucmV0dXJuVG9EaXJlY3RvcnkiLCJXaWtpLmRvQ3JlYXRlIiwiV2lraS5kb0NyZWF0ZS50b1BhdGgiLCJXaWtpLmRvQ3JlYXRlLnRvUHJvZmlsZU5hbWUiLCJXaWtpLnB1dFBhZ2UiLCJXaWtpLmdldE5ld0RvY3VtZW50UGF0aCIsIldpa2kuaXNDcmVhdGUiLCJXaWtpLm9uRmlsZUNvbnRlbnRzIiwiV2lraS51cGRhdGVTb3VyY2VWaWV3IiwiV2lraS5vbkZvcm1TY2hlbWEiLCJXaWtpLnNhdmVUbyIsIldpa2kuY2hpbGRMaW5rIiwiV2lraS5vbkZvcm1EYXRhIiwiV2lraS5zd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluayIsIldpa2kubG9hZEJyZWFkY3J1bWJzIiwiV2lraS5pc0RpZmZWaWV3IiwiV2lraS52aWV3Q29udGVudHMiLCJXaWtpLm9uRmlsZURldGFpbHMiLCJXaWtpLmNoZWNrRmlsZUV4aXN0cyIsIldpa2kuZ2V0UmVuYW1lRmlsZVBhdGgiLCJXaWtpLmdldFJlbmFtZURpYWxvZyIsIldpa2kuZ2V0TW92ZURpYWxvZyIsIldpa2kuZ2V0RGVsZXRlRGlhbG9nIiwiV2lraS5vZmZzZXRUb3AiLCJXaWtpLnNjcm9sbFRvSGFzaCIsIldpa2kuc2Nyb2xsVG9JZCIsIldpa2kuYWRkTGlua3MiLCJXaWtpLm9uRXZlbnRJbnNlcnRlZCIsIldpa2kuY3JlYXRlU291cmNlQnJlYWRjcnVtYnMiLCJXaWtpLmNyZWF0ZUVkaXRpbmdCcmVhZGNydW1iIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29uc3RydWN0b3IiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmdldFBhZ2UiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5Lmhpc3RvcnkiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbW1pdEluZm8iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbW1pdERldGFpbCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tbWl0VHJlZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZGlmZiIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuYnJhbmNoZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmV4aXN0cyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LnJlbmFtZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvR2V0IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5kb1Bvc3QiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvUG9zdEZvcm0iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbXBsZXRlUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0UGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0TG9nUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0Q29udGVudCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuanNvbkNoaWxkQ29udGVudHMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmdpdCJdLCJtYXBwaW5ncyI6IkFBQUEsMkRBQTJEO0FBQzNELDREQUE0RDtBQUM1RCxHQUFHO0FBQ0gsbUVBQW1FO0FBQ25FLG9FQUFvRTtBQUNwRSwyQ0FBMkM7QUFDM0MsR0FBRztBQUNILGdEQUFnRDtBQUNoRCxHQUFHO0FBQ0gsdUVBQXVFO0FBQ3ZFLHFFQUFxRTtBQUNyRSw0RUFBNEU7QUFDNUUsdUVBQXVFO0FBQ3ZFLGtDQUFrQztBQUVsQywwREFBMEQ7QUFDMUQsc0RBQXNEO0FBQ3RELDJEQUEyRDtBQUMzRCw0REFBNEQ7QUFDNUQsMERBQTBEOztBQ2xCMUQsSUFBTyxLQUFLLENBZ09YO0FBaE9ELFdBQU8sS0FBSyxFQUFDLENBQUM7SUFFREEsYUFBT0EsR0FBR0EsOEJBQThCQSxDQUFDQTtJQUV6Q0EsVUFBSUEsR0FBR0EsR0FBR0EsR0FBR0EsYUFBT0EsQ0FBQ0E7SUFDckJBLGdCQUFVQSxHQUFHQSxPQUFPQSxDQUFDQTtJQUNyQkEsZ0JBQVVBLEdBQUdBLGdCQUFnQkEsQ0FBQ0E7SUFDOUJBLGtCQUFZQSxHQUFHQSxnQkFBVUEsR0FBR0EsT0FBT0EsQ0FBQ0E7SUFDcENBLFNBQUdBLEdBQWtCQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxnQkFBVUEsQ0FBQ0EsQ0FBQ0E7SUFFNUNBLG9CQUFjQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxnQkFBZ0JBLENBQUNBLENBQUNBO0lBRTVDQSxxQkFBZUEsR0FBR0EsVUFBVUEsQ0FBQ0EsZUFBZUEsQ0FBQ0E7SUFDN0NBLHNCQUFnQkEsR0FBR0EsT0FBT0EsQ0FBQ0E7SUFFM0JBLG9CQUFjQSxHQUFHQSxLQUFLQSxDQUFDQTtJQUVsQ0EsaUJBQXdCQSxTQUFTQTtRQUMvQkMsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7SUFDZEEsQ0FBQ0E7SUFGZUQsYUFBT0EsVUFFdEJBLENBQUFBO0lBRURB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QSxFQUFFQSxVQUFVQTtZQUVySUEsTUFBTUEsQ0FBQ0EsS0FBS0EsR0FBR0EsVUFBVUEsQ0FBQ0E7WUFFMUJBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1lBQy9FQSxNQUFNQSxDQUFDQSxFQUFFQSxHQUFHQSxZQUFZQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUMvQkEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFFbkNBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO1lBQ2xEQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxZQUFZQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtZQUN2Q0EsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDckJBLElBQUlBLFNBQVNBLEdBQUdBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQy9DQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxJQUFJQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbENBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO1lBQ3BEQSxDQUFDQTtZQUdEQSxlQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQTtZQUMzQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsRUFBRUEsS0FBS0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2hDQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLEdBQUdBLFNBQVNBLENBQUNBLGdDQUFn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U0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2xDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNwREEsQ0FBQ0E7WUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUN2RkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxHQUFHQSxHQUFHQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBO1lBQzlEQSxDQUFDQTtZQUVEQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxZQUFZQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQTtZQUNsREEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsWUFBWUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7WUFFdkNBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLHNCQUFnQkEsQ0FBQ0EsVUFBVUEsRUFBRUEsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7WUFDcEVBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLEtBQUtBLENBQUNBLENBQUNBO1lBRTlDQSxlQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQTtZQUMzQ0Esd0NBQWtDQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUd0REEsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0E7Z0JBQ25CQSxJQUFJQSxFQUFFQSxVQUFVQTtnQkFDaEJBLHFCQUFxQkEsRUFBRUEsSUFBSUE7Z0JBQzNCQSx1QkFBdUJBLEVBQUVBLEtBQUtBO2dCQUM5QkEsV0FB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Q0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7UUFDdkNBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLFlBQVlBLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO1FBQ3ZFQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxZQUFZQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxZQUFZQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQTtRQUM1RUEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFDckNBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLFFBQVFBLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1FBQzlEQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxXQUFXQSxHQUFHQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxJQUFJQSxFQUFFQSxDQUFDQSxDQUFDQTtRQUM3RUEsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsSUFBSUEsc0JBQWlCQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUN0REEsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsU0FBU0EsQ0FBQ0EsYUFBYUEsRUFBRUEsQ0FBQ0E7UUFDbERBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFNBQVNBLENBQUNBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1FBQzlEQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLEdBQUdBLFNBQVNBLENBQUNBLHdCQUF3QkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsRUFBRUEsNEJBQXVCQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNoSEEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsU0FBU0EsQ0FBQ0EsdUJBQXVCQSxDQUFDQSxNQUFNQSxD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LFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzNCQSxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUM1QkEsSUFBSUEsU0FBU0EsR0FBR0EsVUFBVUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDdENBLElBQUlBLE9BQU9BLEdBQUdBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLElBQUlBO2dCQUM5QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0E7WUFDdkJBLENBQUNBLENBQUNBLENBQUNBO1lBQ0hBLEtBQUtBLEdBQUdBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLEdBQUdBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ2xEQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxLQUFLQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxHQUFHQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUUvREEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDMUZBLENBQUNBO1FBR0RBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxFQUFFQSxJQUFJQSxHQUFHQSxTQUFTQSxFQUFFQSxTQUFTQSxDQUFDQSxHQUFHQSxTQUFTQSxDQUFDQTtRQUMxRUEsQ0FBQ0E7UUFFREEsRUFBRUEsQ0FBQ0Es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R0RBLElBQUlBLE1BQU1BLEdBQVVBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO2dCQUNsQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBRWxCQSxJQUFJQSxHQUFHQSxHQUFPQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtvQkFDdENBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNiQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQTtvQkFDZEEsQ0FBQ0E7b0JBQUNBLElBQUlBLENBQUNBLENBQUNBO3dCQUNOQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtvQkFDcENBLENBQUNBO2dCQUNIQSxDQUFDQTtnQkFDREEsSUFBSUEsR0FBR0EsR0FBT0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3BDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDWkEsTUFBTUEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3ZDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDakNBLENBQUNBO2dCQUNEQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDdkNBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLE1BQU1BLEdBQUdBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBO1lBQzdDQSxDQUFDQTtRQUVIaEUsQ0FBQ0Es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UUEsR0FBR0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsR0FBR0E7d0JBQ3pDQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtvQkFDZkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ0hBLElBQUlBLEtBQUtBLEdBQUdBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLElBQUlBO3dCQUN2Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0E7b0JBQ3pCQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDSEEsV0FBV0EsR0FBR0EsV0FBV0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsR0FBR0E7d0JBQ25DQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDbEJBLENBQUNBLENBQUNBLENBQUNBO29CQUNIQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxHQUFHQTt3QkFDN0JBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBO29CQUNsQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ0hBLEtBQUtBLEdBQUdBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLElBQUlBO3dCQUN4QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7b0JBQ25CQSxDQUFDQSxDQUFDQTt5QkFDQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsSUFBSUE7d0JBQ1hBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO29CQUNyQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBRUxBLE1BQU1BLENBQUNBLFFBQVFBLEdBQVNBLEtBQU1BLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLEVBQUVBLFFBQVFBLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLFVBQUNBLElBQUlB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QSxJQUFXQSxFQUFFQSxZQUFtQkEsRUFBRUEsTUFBYUEsRUFBRUEsRUFBRUE7UUFTNUVzQixDQUFDQTtRQUdNdEIsK0JBQUdBLEdBQVZBO1FBUUF1QixDQUFDQTtRQUNIdkIsd0JBQUNBO0lBQURBLENBM1lBekYsQUEyWUN5RixJQUFBekY7SUEzWVlBLHNCQUFpQkEsb0JBMlk3QkEsQ0FBQUE7QUFDSEEsQ0FBQ0EsRUFqWk0sSUFBSSxLQUFKLElBQUksUUFpWlY7O0FDeFpELHlDQUF5QztBQUN6QyxzQ0FBc0M7QUFDdEMscUNBQXFDO0FBRXJDLElBQU8sSUFBSSxDQU1WO0FBTkQsV0FBTyxJQUFJLEVBQUMsQ0FBQztJQUVBQSx1QkFBa0JBLEdBQUdBLFlBQU9BLENBQUNBLFVBQVVBLENBQUNBLHlCQUF5QkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsUUFBUUEsRUFBRUEsY0FBY0EsRUFBRUEsVUFBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsRUFBRUEsWUFBWUE7UUFFaEpBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBRU5BLENBQUNBLEVBTk0sSUFBSSxLQUFKLElBQUksUUFNViIsImZpbGUiOiJjb21waWxlZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyBDb3B5cmlnaHQgMjAxNC0yMDE1IFJlZCBIYXQsIEluYy4gYW5kL29yIGl0cyBhZmZpbGlhdGVzXG4vLy8gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyBhcyBpbmRpY2F0ZWQgYnkgdGhlIEBhdXRob3IgdGFncy5cbi8vL1xuLy8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8vXG4vLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vL1xuLy8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbGlicy9oYXd0aW8tdXRpbGl0aWVzL2RlZnMuZC50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9saWJzL2hhd3Rpby1vYXV0aC9kZWZzLmQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbGlicy9oYXd0aW8ta3ViZXJuZXRlcy9kZWZzLmQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbGlicy9oYXd0aW8taW50ZWdyYXRpb24vZGVmcy5kLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2xpYnMvaGF3dGlvLWRhc2hib2FyZC9kZWZzLmQudHNcIi8+XG4iLCIvLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBjb250ZXh0ID0gJy93b3Jrc3BhY2VzLzpuYW1lc3BhY2UvZm9yZ2UnO1xuXG4gIGV4cG9ydCB2YXIgaGFzaCA9ICcjJyArIGNvbnRleHQ7XG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9ICdGb3JnZSc7XG4gIGV4cG9ydCB2YXIgcGx1Z2luUGF0aCA9ICdwbHVnaW5zL2ZvcmdlLyc7XG4gIGV4cG9ydCB2YXIgdGVtcGxhdGVQYXRoID0gcGx1Z2luUGF0aCArICdodG1sLyc7XG4gIGV4cG9ydCB2YXIgbG9nOkxvZ2dpbmcuTG9nZ2VyID0gTG9nZ2VyLmdldChwbHVnaW5OYW1lKTtcblxuICBleHBvcnQgdmFyIGRlZmF1bHRJY29uVXJsID0gQ29yZS51cmwoXCIvaW1nL2ZvcmdlLnN2Z1wiKTtcblxuICBleHBvcnQgdmFyIGdvZ3NTZXJ2aWNlTmFtZSA9IEt1YmVybmV0ZXMuZ29nc1NlcnZpY2VOYW1lO1xuICBleHBvcnQgdmFyIG9yaW9uU2VydmljZU5hbWUgPSBcIm9yaW9uXCI7XG5cbiAgZXhwb3J0IHZhciBsb2dnZWRJblRvR29ncyA9IGZhbHNlO1xuXG4gIGV4cG9ydCBmdW5jdGlvbiBpc0ZvcmdlKHdvcmtzcGFjZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKSB7XG4gICAgJHNjb3BlLm5hbWVzcGFjZSA9ICRyb3V0ZVBhcmFtc1tcIm5hbWVzcGFjZVwiXSB8fCBLdWJlcm5ldGVzLmN1cnJlbnRLdWJlcm5ldGVzTmFtZXNwYWNlKCk7XG4gICAgJHNjb3BlLnByb2plY3RJZCA9ICRyb3V0ZVBhcmFtc1tcInByb2plY3RcIl07XG4gICAgJHNjb3BlLiR3b3Jrc3BhY2VMaW5rID0gRGV2ZWxvcGVyLndvcmtzcGFjZUxpbmsoKTtcbiAgICAkc2NvcGUuJHByb2plY3RMaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RCcmVhZGNydW1icygkc2NvcGUucHJvamVjdElkKTtcbiAgICAkc2NvcGUuc3ViVGFiQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTdWJOYXZCYXJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRMaW5rKHByb2plY3RJZCwgbmFtZSwgcmVzb3VyY2VQYXRoKSB7XG4gICAgdmFyIGxpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsocHJvamVjdElkKTtcbiAgICBpZiAobmFtZSkge1xuICAgICAgaWYgKHJlc291cmNlUGF0aCkge1xuICAgICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmRcIiwgbmFtZSwgcmVzb3VyY2VQYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZC9cIiwgbmFtZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsIHByb2plY3RJZCkge1xuICAgIHZhciBsaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCk7XG4gICAgaWYgKHJlc291cmNlUGF0aCkge1xuICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihsaW5rLCBcIi9mb3JnZS9jb21tYW5kcy91c2VyXCIsIHJlc291cmNlUGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZHNcIik7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHJlcG9zQXBpVXJsKEZvcmdlQXBpVVJMKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCIvcmVwb3NcIik7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgcGF0aCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiL3JlcG9zL3VzZXJcIiwgcGF0aCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkLCBucywgcHJvamVjdElkLCByZXNvdXJjZVBhdGggPSBudWxsKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kXCIsIGNvbW1hbmRJZCwgbnMsIHByb2plY3RJZCwgcmVzb3VyY2VQYXRoKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBleGVjdXRlQ29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kXCIsIFwiZXhlY3V0ZVwiLCBjb21tYW5kSWQpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kXCIsIFwidmFsaWRhdGVcIiwgY29tbWFuZElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kSW5wdXRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCwgbnMsIHByb2plY3RJZCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgaWYgKG5zICYmIHByb2plY3RJZCkge1xuICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kSW5wdXRcIiwgY29tbWFuZElkLCBucywgcHJvamVjdElkLCByZXNvdXJjZVBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRJbnB1dFwiLCBjb21tYW5kSWQpO1xuICAgIH1cbiAgfVxuXG5cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcHJvamVjdCBmb3IgdGhlIGdpdmVuIHJlc291cmNlIHBhdGhcbiAgICovXG4gIGZ1bmN0aW9uIG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpIHtcbiAgICBpZiAocmVzb3VyY2VQYXRoKSB7XG4gICAgICB2YXIgcHJvamVjdCA9IEZvcmdlTW9kZWwucHJvamVjdHNbcmVzb3VyY2VQYXRoXTtcbiAgICAgIGlmICghcHJvamVjdCkge1xuICAgICAgICBwcm9qZWN0ID0ge307XG4gICAgICAgIEZvcmdlTW9kZWwucHJvamVjdHNbcmVzb3VyY2VQYXRoXSA9IHByb2plY3Q7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvamVjdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEZvcmdlTW9kZWwucm9vdFByb2plY3Q7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoLCBjb21tYW5kcykge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcHJvamVjdC4kY29tbWFuZHMgPSBjb21tYW5kcztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlbENvbW1hbmRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIHByb2plY3QuJGNvbW1hbmRzIHx8IFtdO1xuICB9XG5cbiAgZnVuY3Rpb24gbW9kZWxDb21tYW5kSW5wdXRNYXAoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgdmFyIHByb2plY3QgPSBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IHByb2plY3QuJGNvbW1hbmRJbnB1dHM7XG4gICAgaWYgKCFjb21tYW5kSW5wdXRzKSB7XG4gICAgICBjb21tYW5kSW5wdXRzID0ge307XG4gICAgICBwcm9qZWN0LiRjb21tYW5kSW5wdXRzID0gY29tbWFuZElucHV0cztcbiAgICB9XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHM7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCwgaWQpIHtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IG1vZGVsQ29tbWFuZElucHV0TWFwKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHNbaWRdO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgsIGlkLCBpdGVtKSB7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBtb2RlbENvbW1hbmRJbnB1dE1hcChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBjb21tYW5kSW5wdXRzW2lkXSA9IGl0ZW07XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZW5yaWNoUmVwbyhyZXBvKSB7XG4gICAgdmFyIG93bmVyID0gcmVwby5vd25lciB8fCB7fTtcbiAgICB2YXIgdXNlciA9IG93bmVyLnVzZXJuYW1lIHx8IHJlcG8udXNlcjtcbiAgICB2YXIgbmFtZSA9IHJlcG8ubmFtZTtcbiAgICB2YXIgcHJvamVjdElkID0gbmFtZTtcbiAgICB2YXIgYXZhdGFyX3VybCA9IG93bmVyLmF2YXRhcl91cmw7XG4gICAgaWYgKGF2YXRhcl91cmwgJiYgYXZhdGFyX3VybC5zdGFydHNXaXRoKFwiaHR0cC8vXCIpKSB7XG4gICAgICBhdmF0YXJfdXJsID0gXCJodHRwOi8vXCIgKyBhdmF0YXJfdXJsLnN1YnN0cmluZyg2KTtcbiAgICAgIG93bmVyLmF2YXRhcl91cmwgPSBhdmF0YXJfdXJsO1xuICAgIH1cbiAgICBpZiAodXNlciAmJiBuYW1lKSB7XG4gICAgICB2YXIgcmVzb3VyY2VQYXRoID0gdXNlciArIFwiL1wiICsgbmFtZTtcbiAgICAgIHJlcG8uJGNvbW1hbmRzTGluayA9IGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsIHByb2plY3RJZCk7XG4gICAgICByZXBvLiRidWlsZHNMaW5rID0gXCIva3ViZXJuZXRlcy9idWlsZHM/cT0vXCIgKyByZXNvdXJjZVBhdGggKyBcIi5naXRcIjtcbiAgICAgIHZhciBpbmplY3RvciA9IEhhd3Rpb0NvcmUuaW5qZWN0b3I7XG4gICAgICBpZiAoaW5qZWN0b3IpIHtcbiAgICAgICAgdmFyIFNlcnZpY2VSZWdpc3RyeSA9IGluamVjdG9yLmdldChcIlNlcnZpY2VSZWdpc3RyeVwiKTtcbiAgICAgICAgaWYgKFNlcnZpY2VSZWdpc3RyeSkge1xuICAgICAgICAgIHZhciBvcmlvbkxpbmsgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsob3Jpb25TZXJ2aWNlTmFtZSk7XG4gICAgICAgICAgdmFyIGdvZ3NTZXJ2aWNlID0gU2VydmljZVJlZ2lzdHJ5LmZpbmRTZXJ2aWNlKGdvZ3NTZXJ2aWNlTmFtZSk7XG4gICAgICAgICAgaWYgKG9yaW9uTGluayAmJiBnb2dzU2VydmljZSkge1xuICAgICAgICAgICAgdmFyIHBvcnRhbElwID0gZ29nc1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgICBpZiAocG9ydGFsSXApIHtcbiAgICAgICAgICAgICAgdmFyIHBvcnQgPSBnb2dzU2VydmljZS5wb3J0O1xuICAgICAgICAgICAgICB2YXIgcG9ydFRleHQgPSAocG9ydCAmJiBwb3J0ICE9PSA4MCAmJiBwb3J0ICE9PSA0NDMpID8gXCI6XCIgKyBwb3J0IDogXCJcIjtcbiAgICAgICAgICAgICAgdmFyIHByb3RvY29sID0gKHBvcnQgJiYgcG9ydCA9PT0gNDQzKSA/IFwiaHR0cHM6Ly9cIiA6IFwiaHR0cDovL1wiO1xuICAgICAgICAgICAgICB2YXIgZ2l0Q2xvbmVVcmwgPSBVcmxIZWxwZXJzLmpvaW4ocHJvdG9jb2wgKyBwb3J0YWxJcCArIHBvcnRUZXh0ICsgXCIvXCIsIHJlc291cmNlUGF0aCArIFwiLmdpdFwiKTtcblxuICAgICAgICAgICAgICByZXBvLiRvcGVuUHJvamVjdExpbmsgPSBVcmxIZWxwZXJzLmpvaW4ob3Jpb25MaW5rLFxuICAgICAgICAgICAgICAgIFwiL2dpdC9naXQtcmVwb3NpdG9yeS5odG1sIyxjcmVhdGVQcm9qZWN0Lm5hbWU9XCIgKyBuYW1lICsgXCIsY2xvbmVHaXQ9XCIgKyBnaXRDbG9uZVVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUh0dHBDb25maWcoKSB7XG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRRdWVyeUFyZ3VtZW50KHVybCwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodXJsICYmIG5hbWUgJiYgdmFsdWUpIHtcbiAgICAgIHZhciBzZXAgPSAgKHVybC5pbmRleE9mKFwiP1wiKSA+PSAwKSA/IFwiJlwiIDogXCI/XCI7XG4gICAgICByZXR1cm4gdXJsICsgc2VwICsgIG5hbWUgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlSHR0cFVybChwcm9qZWN0SWQsIHVybCwgYXV0aEhlYWRlciA9IG51bGwsIGVtYWlsID0gbnVsbCkge1xuICAgIHZhciBsb2NhbFN0b3JhZ2UgPSBLdWJlcm5ldGVzLmluamVjdChcImxvY2FsU3RvcmFnZVwiKSB8fCB7fTtcbiAgICB2YXIgbnMgPSBLdWJlcm5ldGVzLmN1cnJlbnRLdWJlcm5ldGVzTmFtZXNwYWNlKCk7XG4gICAgdmFyIHNlY3JldCA9IGdldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCBucywgcHJvamVjdElkKTtcbiAgICB2YXIgc2VjcmV0TlMgPSBnZXRTb3VyY2VTZWNyZXROYW1lc3BhY2UobG9jYWxTdG9yYWdlKTtcblxuICAgIGF1dGhIZWFkZXIgPSBhdXRoSGVhZGVyIHx8IGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdO1xuICAgIGVtYWlsID0gZW1haWwgfHwgbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdO1xuXG4gICAgdXJsID0gYWRkUXVlcnlBcmd1bWVudCh1cmwsIFwiX2dvZ3NBdXRoXCIsIGF1dGhIZWFkZXIpO1xuICAgIHVybCA9IGFkZFF1ZXJ5QXJndW1lbnQodXJsLCBcIl9nb2dzRW1haWxcIiwgZW1haWwpO1xuICAgIHVybCA9IGFkZFF1ZXJ5QXJndW1lbnQodXJsLCBcInNlY3JldFwiLCBzZWNyZXQpO1xuICAgIHVybCA9IGFkZFF1ZXJ5QXJndW1lbnQodXJsLCBcInNlY3JldE5hbWVzcGFjZVwiLCBzZWNyZXROUyk7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTWF0Y2hlc1RleHQoY29tbWFuZCwgZmlsdGVyVGV4dCkge1xuICAgIGlmIChmaWx0ZXJUZXh0KSB7XG4gICAgICByZXR1cm4gQ29yZS5tYXRjaEZpbHRlcklnbm9yZUNhc2UoYW5ndWxhci50b0pzb24oY29tbWFuZCksIGZpbHRlclRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaXNTb3VyY2VTZWNyZXREZWZpbmVkRm9yUHJvamVjdChucywgcHJvamVjdElkKSB7XG4gICAgdmFyIGxvY2FsU3RvcmFnZSA9IEt1YmVybmV0ZXMuaW5qZWN0KFwibG9jYWxTdG9yYWdlXCIpIHx8IHt9O1xuXG4gICAgcmV0dXJuIGdldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCBucywgcHJvamVjdElkKTtcbi8qXG4gICAgdmFyIGF1dGhIZWFkZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICByZXR1cm4gYXV0aEhlYWRlciA/IHRydWUgOiBmYWxzZTtcbiovXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcmVkaXJlY3RUb1NldHVwU2VjcmV0c0lmTm90RGVmaW5lZCgkc2NvcGUsICRsb2NhdGlvbikge1xuICAgIHZhciBucyA9ICRzY29wZS5uYW1lc3BhY2UgfHwgS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgIHZhciBwcm9qZWN0SWQgPSAkc2NvcGUucHJvamVjdElkO1xuXG4gICAgaWYgKCFpc1NvdXJjZVNlY3JldERlZmluZWRGb3JQcm9qZWN0KG5zLCBwcm9qZWN0SWQpKSB7XG4gICAgICB2YXIgbG9naW5QYWdlID0gRGV2ZWxvcGVyLnByb2plY3RTZWNyZXRzTGluayhucywgcHJvamVjdElkKSArIFwiUmVxdWlyZWRcIjtcbiAgICAgIGxvZy5pbmZvKFwiTm8gc2VjcmV0IHNldHVwIHNvIHJlZGlyZWN0aW5nIHRvIFwiICsgbG9naW5QYWdlKTtcbiAgICAgICRsb2NhdGlvbi5wYXRoKGxvZ2luUGFnZSlcbiAgICB9XG4gIH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgWydoYXd0aW8tY29yZScsICdoYXd0aW8tdWknXSk7XG4gIGV4cG9ydCB2YXIgY29udHJvbGxlciA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlQ29udHJvbGxlckZ1bmN0aW9uKF9tb2R1bGUsIHBsdWdpbk5hbWUpO1xuICBleHBvcnQgdmFyIHJvdXRlID0gUGx1Z2luSGVscGVycy5jcmVhdGVSb3V0aW5nRnVuY3Rpb24odGVtcGxhdGVQYXRoKTtcblxuICBfbW9kdWxlLmNvbmZpZyhbJyRyb3V0ZVByb3ZpZGVyJywgKCRyb3V0ZVByb3ZpZGVyOm5nLnJvdXRlLklSb3V0ZVByb3ZpZGVyKSA9PiB7XG5cbiAgICBjb25zb2xlLmxvZyhcIkxpc3RlbmluZyBvbjogXCIgKyBVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9jcmVhdGVQcm9qZWN0JykpO1xuXG4gICAgJHJvdXRlUHJvdmlkZXIud2hlbihVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9jcmVhdGVQcm9qZWN0JyksIHJvdXRlKCdjcmVhdGVQcm9qZWN0Lmh0bWwnLCBmYWxzZSkpXG4gICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9yZXBvcy86cGF0aConKSwgcm91dGUoJ3JlcG8uaHRtbCcsIGZhbHNlKSlcbiAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL3JlcG9zJyksIHJvdXRlKCdyZXBvcy5odG1sJywgZmFsc2UpKTtcblxuICAgIGFuZ3VsYXIuZm9yRWFjaChbY29udGV4dCwgJy93b3Jrc3BhY2VzLzpuYW1lc3BhY2UvcHJvamVjdHMvOnByb2plY3QvZm9yZ2UnXSwgKHBhdGgpID0+IHtcbiAgICAgICRyb3V0ZVByb3ZpZGVyXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmRzJyksIHJvdXRlKCdjb21tYW5kcy5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kcy86cGF0aConKSwgcm91dGUoJ2NvbW1hbmRzLmh0bWwnLCBmYWxzZSkpXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmQvOmlkJyksIHJvdXRlKCdjb21tYW5kLmh0bWwnLCBmYWxzZSkpXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmQvOmlkLzpwYXRoKicpLCByb3V0ZSgnY29tbWFuZC5odG1sJywgZmFsc2UpKTtcbiAgICB9KTtcblxuICAgIGFuZ3VsYXIuZm9yRWFjaChbY29udGV4dCwgJy93b3Jrc3BhY2VzLzpuYW1lc3BhY2UvcHJvamVjdHMvOnByb2plY3QvZm9yZ2UnLCAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9wcm9qZWN0cy9mb3JnZSddLCAocGF0aCkgPT4ge1xuICAgICAgJHJvdXRlUHJvdmlkZXJcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvc2VjcmV0cycpLCByb3V0ZSgnc2VjcmV0cy5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9zZWNyZXRzUmVxdWlyZWQnKSwgcm91dGUoJ3NlY3JldHNSZXF1aXJlZC5odG1sJywgZmFsc2UpKTtcbiAgICB9KTtcblxuICB9XSk7XG5cbiAgX21vZHVsZS5mYWN0b3J5KCdGb3JnZUFwaVVSTCcsIFsnJHEnLCAnJHJvb3RTY29wZScsICgkcTpuZy5JUVNlcnZpY2UsICRyb290U2NvcGU6bmcuSVJvb3RTY29wZVNlcnZpY2UpID0+IHtcbiAgICByZXR1cm4gS3ViZXJuZXRlcy5rdWJlcm5ldGVzQXBpVXJsKCkgKyBcIi9wcm94eVwiICsgS3ViZXJuZXRlcy5rdWJlcm5ldGVzTmFtZXNwYWNlUGF0aCgpICsgXCIvc2VydmljZXMvZmFicmljOC1mb3JnZS9hcGkvZm9yZ2VcIjtcbiAgfV0pO1xuXG5cbiAgX21vZHVsZS5mYWN0b3J5KCdGb3JnZU1vZGVsJywgWyckcScsICckcm9vdFNjb3BlJywgKCRxOm5nLklRU2VydmljZSwgJHJvb3RTY29wZTpuZy5JUm9vdFNjb3BlU2VydmljZSkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICByb290UHJvamVjdDoge30sXG4gICAgICBwcm9qZWN0czogW11cbiAgICB9XG4gIH1dKTtcblxuICBfbW9kdWxlLnJ1bihbJ3ZpZXdSZWdpc3RyeScsICdIYXd0aW9OYXYnLCAodmlld1JlZ2lzdHJ5LCBIYXd0aW9OYXYpID0+IHtcbiAgICB2aWV3UmVnaXN0cnlbJ2ZvcmdlJ10gPSB0ZW1wbGF0ZVBhdGggKyAnbGF5b3V0Rm9yZ2UuaHRtbCc7XG4gIH1dKTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIuYWRkTW9kdWxlKHBsdWdpbk5hbWUpO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIENvbW1hbmRDb250cm9sbGVyID0gY29udHJvbGxlcihcIkNvbW1hbmRDb250cm9sbGVyXCIsXG4gICAgW1wiJHNjb3BlXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJGb3JnZU1vZGVsXCIsXG4gICAgICAoJHNjb3BlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXMsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwpID0+IHtcblxuICAgICAgICAkc2NvcGUubW9kZWwgPSBGb3JnZU1vZGVsO1xuXG4gICAgICAgICRzY29wZS5yZXNvdXJjZVBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdIHx8ICRsb2NhdGlvbi5zZWFyY2goKVtcInBhdGhcIl0gfHwgXCJcIjtcbiAgICAgICAgJHNjb3BlLmlkID0gJHJvdXRlUGFyYW1zW1wiaWRcIl07XG4gICAgICAgICRzY29wZS5wYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXTtcblxuICAgICAgICAkc2NvcGUuYXZhdGFyX3VybCA9IGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl07XG4gICAgICAgICRzY29wZS51c2VyID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl07XG4gICAgICAgICRzY29wZS5yZXBvTmFtZSA9IFwiXCI7XG4gICAgICAgIHZhciBwYXRoU3RlcHMgPSAkc2NvcGUucmVzb3VyY2VQYXRoLnNwbGl0KFwiL1wiKTtcbiAgICAgICAgaWYgKHBhdGhTdGVwcyAmJiBwYXRoU3RlcHMubGVuZ3RoKSB7XG4gICAgICAgICAgJHNjb3BlLnJlcG9OYW1lID0gcGF0aFN0ZXBzW3BhdGhTdGVwcy5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuICAgICAgICBpZiAoJHNjb3BlLmlkID09PSBcImRldm9wcy1lZGl0XCIpIHtcbiAgICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U2V0dGluZ3NCcmVhZGNydW1icygkc2NvcGUucHJvamVjdElkKTtcbiAgICAgICAgICAkc2NvcGUuc3ViVGFiQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTZXR0aW5nc1N1Yk5hdkJhcnMoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVkaXJlY3RUb1NldHVwU2VjcmV0c0lmTm90RGVmaW5lZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cbiAgICAgICAgJHNjb3BlLiRjb21wbGV0ZUxpbmsgPSAkc2NvcGUuJHByb2plY3RMaW5rO1xuICAgICAgICBpZiAoJHNjb3BlLnByb2plY3RJZCkge1xuXG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmNvbW1hbmRzTGluayA9IGNvbW1hbmRzTGluaygkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUucHJvamVjdElkKTtcbiAgICAgICAgJHNjb3BlLmNvbXBsZXRlZExpbmsgPSAkc2NvcGUucHJvamVjdElkID8gVXJsSGVscGVycy5qb2luKCRzY29wZS4kcHJvamVjdExpbmssIFwiZW52aXJvbm1lbnRzXCIpIDogJHNjb3BlLiRwcm9qZWN0TGluaztcblxuICAgICAgICAkc2NvcGUuZW50aXR5ID0ge1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuaW5wdXRMaXN0ID0gWyRzY29wZS5lbnRpdHldO1xuXG4gICAgICAgICRzY29wZS5zY2hlbWEgPSBnZXRNb2RlbENvbW1hbmRJbnB1dHMoRm9yZ2VNb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLmlkKTtcbiAgICAgICAgb25TY2hlbWFMb2FkKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gb25Sb3V0ZUNoYW5nZWQoKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJyb3V0ZSB1cGRhdGVkOyBsZXRzIGNsZWFyIHRoZSBlbnRpdHlcIik7XG4gICAgICAgICAgJHNjb3BlLmVudGl0eSA9IHtcbiAgICAgICAgICB9O1xuICAgICAgICAgICRzY29wZS5pbnB1dExpc3QgPSBbJHNjb3BlLmVudGl0eV07XG4gICAgICAgICAgJHNjb3BlLnByZXZpb3VzU2NoZW1hSnNvbiA9IFwiXCI7XG4gICAgICAgICAgJHNjb3BlLnNjaGVtYSA9IG51bGw7XG4gICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuJG9uKCckcm91dGVDaGFuZ2VTdWNjZXNzJywgb25Sb3V0ZUNoYW5nZWQpO1xuXG4gICAgICAgICRzY29wZS5leGVjdXRlID0gKCkgPT4ge1xuICAgICAgICAgIC8vIFRPRE8gY2hlY2sgaWYgdmFsaWQuLi5cbiAgICAgICAgICAkc2NvcGUucmVzcG9uc2UgPSBudWxsO1xuICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSB0cnVlO1xuICAgICAgICAgICRzY29wZS5pbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25FcnJvciA9IG51bGw7XG4gICAgICAgICAgdmFyIGNvbW1hbmRJZCA9ICRzY29wZS5pZDtcbiAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICB2YXIgdXJsID0gZXhlY3V0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCk7XG4gICAgICAgICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICAgICAgICBuYW1lc3BhY2U6ICRzY29wZS5uYW1lc3BhY2UsXG4gICAgICAgICAgICBwcm9qZWN0TmFtZTogJHNjb3BlLnByb2plY3RJZCxcbiAgICAgICAgICAgIHJlc291cmNlOiByZXNvdXJjZVBhdGgsXG4gICAgICAgICAgICBpbnB1dExpc3Q6ICRzY29wZS5pbnB1dExpc3RcbiAgICAgICAgICB9O1xuICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwoJHNjb3BlLnByb2plY3RJZCwgdXJsKTtcbiAgICAgICAgICBsb2cuaW5mbyhcIkFib3V0IHRvIHBvc3QgdG8gXCIgKyB1cmwgKyBcIiBwYXlsb2FkOiBcIiArIGFuZ3VsYXIudG9Kc29uKHJlcXVlc3QpKTtcbiAgICAgICAgICAkaHR0cC5wb3N0KHVybCwgcmVxdWVzdCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgJHNjb3BlLmludmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25FcnJvciA9IG51bGw7XG5cbiAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlIHx8IGRhdGEub3V0cHV0O1xuICAgICAgICAgICAgICAgIHZhciB3aXphcmRSZXN1bHRzID0gZGF0YS53aXphcmRSZXN1bHRzO1xuICAgICAgICAgICAgICAgIGlmICh3aXphcmRSZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2god2l6YXJkUmVzdWx0cy5zdGVwVmFsaWRhdGlvbnMsICh2YWxpZGF0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghJHNjb3BlLmludmFsaWQgJiYgIXZhbGlkYXRpb24udmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZXMgPSB2YWxpZGF0aW9uLm1lc3NhZ2VzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbWVzc2FnZXNbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaW52YWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uRXJyb3IgPSBtZXNzYWdlLmRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbklucHV0ID0gbWVzc2FnZS5pbnB1dE5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIHZhciBzdGVwSW5wdXRzID0gd2l6YXJkUmVzdWx0cy5zdGVwSW5wdXRzO1xuICAgICAgICAgICAgICAgICAgaWYgKHN0ZXBJbnB1dHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNjaGVtYSA9IF8ubGFzdChzdGVwSW5wdXRzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHkgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBsZXRzIGNvcHkgYWNyb3NzIGFueSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSBzY2hlbWFcblxuICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNvcHlWYWx1ZXNGcm9tU2NoZW1hKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYVtcInByb3BlcnRpZXNcIl0sIChwcm9wZXJ0eSwgbmFtZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0eS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nLmluZm8oXCJBZGRpbmcgZW50aXR5LlwiICsgbmFtZSArIFwiID0gXCIgKyB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVudGl0eVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICBjb3B5VmFsdWVzRnJvbVNjaGVtYSgpO1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pbnB1dExpc3QucHVzaCgkc2NvcGUuZW50aXR5KTtcblxuICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luYyB0byBiZSBzdXJlIHRoZXkgZG9uJ3QgZ2V0IG92ZXJ3cml0dGVuIGJ5IHRoZSBmb3JtIHdpZGdldFxuICAgICAgICAgICAgICAgICAgICAgICAgY29weVZhbHVlc0Zyb21TY2hlbWEoKTtcbiAgICAgICAgICAgICAgICAgICAgICB9LCAyMDApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgdXBkYXRlU2NoZW1hKHNjaGVtYSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5jYW5Nb3ZlVG9OZXh0U3RlcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0cyBjbGVhciB0aGUgcmVzcG9uc2Ugd2UndmUgYW5vdGhlciB3aXphcmQgcGFnZSB0byBkb1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG90aGVyd2lzZSBpbmRpY2F0ZSB0aGF0IHRoZSB3aXphcmQganVzdCBjb21wbGV0ZWQgYW5kIGxldHMgaGlkZSB0aGUgaW5wdXQgZm9ybVxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndpemFyZENvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICghJHNjb3BlLmludmFsaWQpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2UgPSBkYXRhO1xuICAgICAgICAgICAgICAgIHZhciBkYXRhT3JFbXB0eSA9IChkYXRhIHx8IHt9KTtcbiAgICAgICAgICAgICAgICB2YXIgc3RhdHVzID0gKGRhdGFPckVtcHR5LnN0YXR1cyB8fCBcIlwiKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlc3BvbnNlQ2xhc3MgPSB0b0JhY2tncm91bmRTdHlsZShzdGF0dXMpO1xuXG4gICAgICAgICAgICAgICAgdmFyIG91dHB1dFByb3BlcnRpZXMgPSAoZGF0YU9yRW1wdHkub3V0cHV0UHJvcGVydGllcyB8fCB7fSk7XG4gICAgICAgICAgICAgICAgdmFyIHByb2plY3RJZCA9IGRhdGFPckVtcHR5LnByb2plY3ROYW1lIHx8IG91dHB1dFByb3BlcnRpZXMuZnVsbE5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS5yZXNwb25zZSAmJiBwcm9qZWN0SWQgJiYgJHNjb3BlLmlkID09PSAncHJvamVjdC1uZXcnKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2UgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgLy8gbGV0cyBmb3J3YXJkIHRvIHRoZSBkZXZvcHMgZWRpdCBwYWdlXG4gICAgICAgICAgICAgICAgICAvLyBsZXRzIHNldCB0aGUgc2VjcmV0IG5hbWUgaWYgaXRzIG51bGxcbiAgICAgICAgICAgICAgICAgIGlmICghZ2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsICRzY29wZS5uYW1lc3BhY2UsIHByb2plY3RJZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRlZmF1bHRTZWNyZXROYW1lID0gZ2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsICRzY29wZS5uYW1lc3BhY2UsICBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsICRzY29wZS5uYW1lc3BhY2UsIHByb2plY3RJZCwgZGVmYXVsdFNlY3JldE5hbWUpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgdmFyIGVkaXRQYXRoID0gVXJsSGVscGVycy5qb2luKERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpLCBcIi9mb3JnZS9jb21tYW5kL2Rldm9wcy1lZGl0XCIpO1xuICAgICAgICAgICAgICAgICAgLy92YXIgZWRpdFBhdGggPSBEZXZlbG9wZXIucHJvamVjdFNlY3JldHNMaW5rKCRzY29wZS5uYW1lc3BhY2UsIHByb2plY3RJZCk7XG4gICAgICAgICAgICAgICAgICBsb2cuaW5mbyhcIk1vdmluZyB0byB0aGUgc2VjcmV0cyBlZGl0IHBhdGg6IFwiICsgZWRpdFBhdGgpO1xuICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoZWRpdFBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oXCJlbnRpdHlcIiwgKCkgPT4ge1xuICAgICAgICAgIHZhbGlkYXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZVNjaGVtYShzY2hlbWEpIHtcbiAgICAgICAgICBpZiAoc2NoZW1hKSB7XG4gICAgICAgICAgICAvLyBsZXRzIHJlbW92ZSB0aGUgdmFsdWVzIHNvIHRoYXQgd2UgY2FuIHByb3Blcmx5IGNoZWNrIHdoZW4gdGhlIHNjaGVtYSByZWFsbHkgZG9lcyBjaGFuZ2VcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSB0aGUgc2NoZW1hIHdpbGwgY2hhbmdlIGV2ZXJ5IHRpbWUgd2UgdHlwZSBhIGNoYXJhY3RlciA7KVxuICAgICAgICAgICAgdmFyIHNjaGVtYVdpdGhvdXRWYWx1ZXMgPSBhbmd1bGFyLmNvcHkoc2NoZW1hKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWFXaXRob3V0VmFsdWVzLnByb3BlcnRpZXMsIChwcm9wZXJ0eSkgPT4ge1xuICAgICAgICAgICAgICBkZWxldGUgcHJvcGVydHlbXCJ2YWx1ZVwiXTtcbiAgICAgICAgICAgICAgZGVsZXRlIHByb3BlcnR5W1wiZW5hYmxlZFwiXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIGpzb24gPSBhbmd1bGFyLnRvSnNvbihzY2hlbWFXaXRob3V0VmFsdWVzKTtcbiAgICAgICAgICAgIGlmIChqc29uICE9PSAkc2NvcGUucHJldmlvdXNTY2hlbWFKc29uKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlZCBzY2hlbWE6IFwiICsganNvbik7XG4gICAgICAgICAgICAgICRzY29wZS5wcmV2aW91c1NjaGVtYUpzb24gPSBqc29uO1xuICAgICAgICAgICAgICAkc2NvcGUuc2NoZW1hID0gc2NoZW1hO1xuXG4gICAgICAgICAgICAgIGlmICgkc2NvcGUuaWQgPT09IFwicHJvamVjdC1uZXdcIikge1xuICAgICAgICAgICAgICAgIHZhciBlbnRpdHkgPSAkc2NvcGUuZW50aXR5O1xuICAgICAgICAgICAgICAgIC8vIGxldHMgaGlkZSB0aGUgdGFyZ2V0IGxvY2F0aW9uIVxuICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0aWVzID0gc2NoZW1hLnByb3BlcnRpZXMgfHwge307XG4gICAgICAgICAgICAgICAgdmFyIG92ZXJ3cml0ZSA9IHByb3BlcnRpZXMub3ZlcndyaXRlO1xuICAgICAgICAgICAgICAgIHZhciBjYXRhbG9nID0gcHJvcGVydGllcy5jYXRhbG9nO1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXRMb2NhdGlvbiA9IHByb3BlcnRpZXMudGFyZ2V0TG9jYXRpb247XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldExvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgICB0YXJnZXRMb2NhdGlvbi5oaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgaWYgKG92ZXJ3cml0ZSkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyd3JpdGUuaGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGlkaW5nIHRhcmdldExvY2F0aW9uIVwiKTtcblxuICAgICAgICAgICAgICAgICAgLy8gbGV0cyBkZWZhdWx0IHRoZSB0eXBlXG4gICAgICAgICAgICAgICAgICBpZiAoIWVudGl0eS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eS50eXBlID0gXCJGcm9tIEFyY2hldHlwZSBDYXRhbG9nXCI7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYXRhbG9nKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIWVudGl0eS5jYXRhbG9nKSB7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eS5jYXRhbG9nID0gXCJmYWJyaWM4XCI7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdmFsaWRhdGUoKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5leGVjdXRpbmcgfHwgJHNjb3BlLnZhbGlkYXRpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG5ld0pzb24gPSBhbmd1bGFyLnRvSnNvbigkc2NvcGUuZW50aXR5KTtcbiAgICAgICAgICBpZiAobmV3SnNvbiA9PT0gJHNjb3BlLnZhbGlkYXRlZEVudGl0eUpzb24pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRlZEVudGl0eUpzb24gPSBuZXdKc29uO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgY29tbWFuZElkID0gJHNjb3BlLmlkO1xuICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgIHZhciB1cmwgPSB2YWxpZGF0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCk7XG4gICAgICAgICAgLy8gbGV0cyBwdXQgdGhlIGVudGl0eSBpbiB0aGUgbGFzdCBpdGVtIGluIHRoZSBsaXN0XG4gICAgICAgICAgdmFyIGlucHV0TGlzdCA9IFtdLmNvbmNhdCgkc2NvcGUuaW5wdXRMaXN0KTtcbiAgICAgICAgICBpbnB1dExpc3RbaW5wdXRMaXN0Lmxlbmd0aCAtIDFdID0gJHNjb3BlLmVudGl0eTtcbiAgICAgICAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJHNjb3BlLm5hbWVzcGFjZSxcbiAgICAgICAgICAgIHByb2plY3ROYW1lOiAkc2NvcGUucHJvamVjdElkLFxuICAgICAgICAgICAgcmVzb3VyY2U6IHJlc291cmNlUGF0aCxcbiAgICAgICAgICAgIGlucHV0TGlzdDogJHNjb3BlLmlucHV0TGlzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCgkc2NvcGUucHJvamVjdElkLCB1cmwpO1xuICAgICAgICAgICRzY29wZS52YWxpZGF0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAkaHR0cC5wb3N0KHVybCwgcmVxdWVzdCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgIHRoaXMudmFsaWRhdGlvbiA9IGRhdGE7XG4gICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJnb3QgdmFsaWRhdGlvbiBcIiArIGFuZ3VsYXIudG9Kc29uKGRhdGEsIHRydWUpKTtcbiAgICAgICAgICAgICAgdmFyIHdpemFyZFJlc3VsdHMgPSBkYXRhLndpemFyZFJlc3VsdHM7XG4gICAgICAgICAgICAgIGlmICh3aXphcmRSZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0ZXBJbnB1dHMgPSB3aXphcmRSZXN1bHRzLnN0ZXBJbnB1dHM7XG4gICAgICAgICAgICAgICAgaWYgKHN0ZXBJbnB1dHMpIHtcbiAgICAgICAgICAgICAgICAgIHZhciBzY2hlbWEgPSBfLmxhc3Qoc3RlcElucHV0cyk7XG4gICAgICAgICAgICAgICAgICB1cGRhdGVTY2hlbWEoc2NoZW1hKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcblxuICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgKiBMZXRzIHRocm90dGxlIHRoZSB2YWxpZGF0aW9ucyBzbyB0aGF0IHdlIG9ubHkgZmlyZSBhbm90aGVyIHZhbGlkYXRpb24gYSBsaXR0bGVcbiAgICAgICAgICAgICAgICogYWZ0ZXIgd2UndmUgZ290IGEgcmVwbHkgYW5kIG9ubHkgaWYgdGhlIG1vZGVsIGhhcyBjaGFuZ2VkIHNpbmNlIHRoZW5cbiAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhbGlkYXRlKCk7XG4gICAgICAgICAgICAgIH0sIDIwMCk7XG4gICAgICAgICAgICB9KS5cbiAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgIGxvZy53YXJuKFwiRmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIiBcIiArIGRhdGEgKyBcIiBcIiArIHN0YXR1cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZURhdGEoKTtcblxuICAgICAgICBmdW5jdGlvbiB0b0JhY2tncm91bmRTdHlsZShzdGF0dXMpIHtcbiAgICAgICAgICBpZiAoIXN0YXR1cykge1xuICAgICAgICAgICAgc3RhdHVzID0gXCJcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YXR1cy5zdGFydHNXaXRoKFwic3VjXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJiZy1zdWNjZXNzXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBcImJnLXdhcm5pbmdcIlxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlRGF0YSgpIHtcbiAgICAgICAgICAkc2NvcGUuaXRlbSA9IG51bGw7XG4gICAgICAgICAgdmFyIGNvbW1hbmRJZCA9ICRzY29wZS5pZDtcbiAgICAgICAgICBpZiAoY29tbWFuZElkKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICAgIHZhciB1cmwgPSBjb21tYW5kSW5wdXRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCwgJHNjb3BlLm5hbWVzcGFjZSwgJHNjb3BlLnByb2plY3RJZCwgcmVzb3VyY2VQYXRoKTtcbiAgICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwoJHNjb3BlLnByb2plY3RJZCwgdXJsKTtcbiAgICAgICAgICAgICRodHRwLmdldCh1cmwsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlRGF0YSBsb2FkZWQgc2NoZW1hXCIpO1xuICAgICAgICAgICAgICAgICAgdXBkYXRlU2NoZW1hKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgc2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5pZCwgJHNjb3BlLnNjaGVtYSk7XG4gICAgICAgICAgICAgICAgICBvblNjaGVtYUxvYWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiRmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIiBcIiArIGRhdGEgKyBcIiBcIiArIHN0YXR1cyk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG9uU2NoZW1hTG9hZCgpIHtcbiAgICAgICAgICAvLyBsZXRzIHVwZGF0ZSB0aGUgdmFsdWUgaWYgaXRzIGJsYW5rIHdpdGggdGhlIGRlZmF1bHQgdmFsdWVzIGZyb20gdGhlIHByb3BlcnRpZXNcbiAgICAgICAgICB2YXIgc2NoZW1hID0gJHNjb3BlLnNjaGVtYTtcbiAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHNjaGVtYTtcbiAgICAgICAgICB2YXIgZW50aXR5ID0gJHNjb3BlLmVudGl0eTtcbiAgICAgICAgICBpZiAoc2NoZW1hKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hLnByb3BlcnRpZXMsIChwcm9wZXJ0eSwga2V5KSA9PiB7XG4gICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHByb3BlcnR5LnZhbHVlO1xuICAgICAgICAgICAgICBpZiAodmFsdWUgJiYgIWVudGl0eVtrZXldKSB7XG4gICAgICAgICAgICAgICAgZW50aXR5W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBDb21tYW5kc0NvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiQ29tbWFuZHNDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRkaWFsb2dcIiwgXCIkd2luZG93XCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkbG9jYXRpb25cIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJGb3JnZU1vZGVsXCIsXG4gICAgKCRzY29wZSwgJGRpYWxvZywgJHdpbmRvdywgJHRlbXBsYXRlQ2FjaGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsIGxvY2FsU3RvcmFnZSwgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCwgRm9yZ2VNb2RlbCkgPT4ge1xuXG4gICAgICAkc2NvcGUubW9kZWwgPSBGb3JnZU1vZGVsO1xuICAgICAgJHNjb3BlLnJlc291cmNlUGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl0gfHwgJGxvY2F0aW9uLnNlYXJjaCgpW1wicGF0aFwiXSB8fCBcIlwiO1xuICAgICAgJHNjb3BlLnJlcG9OYW1lID0gXCJcIjtcbiAgICAgICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24gPSAkc2NvcGUucmVzb3VyY2VQYXRoIHx8IFwiXCI7XG4gICAgICB2YXIgcGF0aFN0ZXBzID0gJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbi5zcGxpdChcIi9cIik7XG4gICAgICBpZiAocGF0aFN0ZXBzICYmIHBhdGhTdGVwcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLnJlcG9OYW1lID0gcGF0aFN0ZXBzW3BhdGhTdGVwcy5sZW5ndGggLSAxXTtcbiAgICAgIH1cbiAgICAgIGlmICghJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbi5zdGFydHNXaXRoKFwiL1wiKSAmJiAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uLmxlbmd0aCA+IDApIHtcbiAgICAgICAgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbiA9IFwiL1wiICsgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbjtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmF2YXRhcl91cmwgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdO1xuICAgICAgJHNjb3BlLnVzZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXTtcblxuICAgICAgJHNjb3BlLmNvbW1hbmRzID0gZ2V0TW9kZWxDb21tYW5kcyhGb3JnZU1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoKTtcbiAgICAgICRzY29wZS5mZXRjaGVkID0gJHNjb3BlLmNvbW1hbmRzLmxlbmd0aCAhPT0gMDtcblxuICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuICAgICAgcmVkaXJlY3RUb1NldHVwU2VjcmV0c0lmTm90RGVmaW5lZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cblxuICAgICAgJHNjb3BlLnRhYmxlQ29uZmlnID0ge1xuICAgICAgICBkYXRhOiAnY29tbWFuZHMnLFxuICAgICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgbXVsdGlTZWxlY3Q6IHRydWUsXG4gICAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICAgZmlsdGVyVGV4dDogJGxvY2F0aW9uLnNlYXJjaCgpW1wicVwiXSB8fCAnJ1xuICAgICAgICB9LFxuICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICduYW1lJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTmFtZScsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcImlkVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0Rlc2NyaXB0aW9uJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdjYXRlZ29yeScsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0NhdGVnb3J5J1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gY29tbWFuZE1hdGNoZXMoY29tbWFuZCkge1xuICAgICAgICB2YXIgZmlsdGVyVGV4dCA9ICRzY29wZS50YWJsZUNvbmZpZy5maWx0ZXJPcHRpb25zLmZpbHRlclRleHQ7XG4gICAgICAgIHJldHVybiBjb21tYW5kTWF0Y2hlc1RleHQoY29tbWFuZCwgZmlsdGVyVGV4dCk7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3IgPSB7XG4gICAgICAgIGZpbHRlclRleHQ6IFwiXCIsXG4gICAgICAgIGZvbGRlcnM6IFtdLFxuICAgICAgICBzZWxlY3RlZENvbW1hbmRzOiBbXSxcbiAgICAgICAgZXhwYW5kZWRGb2xkZXJzOiB7fSxcblxuICAgICAgICBpc09wZW46IChmb2xkZXIpID0+IHtcbiAgICAgICAgICB2YXIgZmlsdGVyVGV4dCA9ICRzY29wZS50YWJsZUNvbmZpZy5maWx0ZXJPcHRpb25zLmZpbHRlclRleHQ7XG4gICAgICAgICAgaWYgKGZpbHRlclRleHQgIT09ICcnIHx8ICRzY29wZS5jb21tYW5kU2VsZWN0b3IuZXhwYW5kZWRGb2xkZXJzW2ZvbGRlci5pZF0pIHtcbiAgICAgICAgICAgIHJldHVybiBcIm9wZW5lZFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJjbG9zZWRcIjtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhclNlbGVjdGVkOiAoKSA9PiB7XG4gICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5leHBhbmRlZEZvbGRlcnMgPSB7fTtcbiAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZVNlbGVjdGVkOiAoKSA9PiB7XG4gICAgICAgICAgLy8gbGV0cyB1cGRhdGUgdGhlIHNlbGVjdGVkIGFwcHNcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRDb21tYW5kcyA9IFtdO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUubW9kZWwuYXBwRm9sZGVycywgKGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgdmFyIGFwcHMgPSBmb2xkZXIuYXBwcy5maWx0ZXIoKGFwcCkgPT4gYXBwLnNlbGVjdGVkKTtcbiAgICAgICAgICAgIGlmIChhcHBzKSB7XG4gICAgICAgICAgICAgIHNlbGVjdGVkQ29tbWFuZHMgPSBzZWxlY3RlZENvbW1hbmRzLmNvbmNhdChhcHBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLnNlbGVjdGVkQ29tbWFuZHMgPSBzZWxlY3RlZENvbW1hbmRzLnNvcnRCeShcIm5hbWVcIik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2VsZWN0OiAoY29tbWFuZCwgZmxhZykgPT4ge1xuICAgICAgICAgIHZhciBpZCA9IGNvbW1hbmQubmFtZTtcbi8qXG4gICAgICAgICAgYXBwLnNlbGVjdGVkID0gZmxhZztcbiovXG4gICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci51cGRhdGVTZWxlY3RlZCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFNlbGVjdGVkQ2xhc3M6IChhcHApID0+IHtcbiAgICAgICAgICBpZiAoYXBwLmFic3RyYWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gXCJhYnN0cmFjdFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYXBwLnNlbGVjdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJzZWxlY3RlZFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgfSxcblxuICAgICAgICBzaG93Q29tbWFuZDogKGNvbW1hbmQpID0+IHtcbiAgICAgICAgICByZXR1cm4gY29tbWFuZE1hdGNoZXMoY29tbWFuZCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2hvd0ZvbGRlcjogKGZvbGRlcikgPT4ge1xuICAgICAgICAgIHZhciBmaWx0ZXJUZXh0ID0gJHNjb3BlLnRhYmxlQ29uZmlnLmZpbHRlck9wdGlvbnMuZmlsdGVyVGV4dDtcbiAgICAgICAgICByZXR1cm4gIWZpbHRlclRleHQgfHwgZm9sZGVyLmNvbW1hbmRzLnNvbWUoKGFwcCkgPT4gY29tbWFuZE1hdGNoZXMoYXBwKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cblxuICAgICAgdmFyIHVybCA9IFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kc1wiLCAkc2NvcGUubmFtZXNwYWNlLCAkc2NvcGUucHJvamVjdElkLCAkc2NvcGUucmVzb3VyY2VQYXRoKTtcbiAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwoJHNjb3BlLnByb2plY3RJZCwgdXJsKTtcbiAgICAgIGxvZy5pbmZvKFwiRmV0Y2hpbmcgY29tbWFuZHMgZnJvbTogXCIgKyB1cmwpO1xuICAgICAgJGh0dHAuZ2V0KHVybCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGRhdGEpICYmIHN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICAgIHZhciBmb2xkZXJNYXAgPSB7fTtcbiAgICAgICAgICAgIHZhciBmb2xkZXJzID0gW107XG4gICAgICAgICAgICAkc2NvcGUuY29tbWFuZHMgPSBfLnNvcnRCeShkYXRhLCBcIm5hbWVcIik7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmNvbW1hbmRzLCAoY29tbWFuZCkgPT4ge1xuICAgICAgICAgICAgICB2YXIgaWQgPSBjb21tYW5kLmlkIHx8IGNvbW1hbmQubmFtZTtcbiAgICAgICAgICAgICAgY29tbWFuZC4kbGluayA9IGNvbW1hbmRMaW5rKCRzY29wZS5wcm9qZWN0SWQsIGlkLCByZXNvdXJjZVBhdGgpO1xuXG4gICAgICAgICAgICAgIHZhciBuYW1lID0gY29tbWFuZC5uYW1lIHx8IGNvbW1hbmQuaWQ7XG4gICAgICAgICAgICAgIHZhciBmb2xkZXJOYW1lID0gY29tbWFuZC5jYXRlZ29yeTtcbiAgICAgICAgICAgICAgdmFyIHNob3J0TmFtZSA9IG5hbWU7XG4gICAgICAgICAgICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoXCI6XCIsIDIpO1xuICAgICAgICAgICAgICBpZiAobmFtZXMgIT0gbnVsbCAmJiBuYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZm9sZGVyTmFtZSA9IG5hbWVzWzBdO1xuICAgICAgICAgICAgICAgIHNob3J0TmFtZSA9IG5hbWVzWzFdLnRyaW0oKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoZm9sZGVyTmFtZSA9PT0gXCJQcm9qZWN0L0J1aWxkXCIpIHtcbiAgICAgICAgICAgICAgICBmb2xkZXJOYW1lID0gXCJQcm9qZWN0XCI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29tbWFuZC4kc2hvcnROYW1lID0gc2hvcnROYW1lO1xuICAgICAgICAgICAgICBjb21tYW5kLiRmb2xkZXJOYW1lID0gZm9sZGVyTmFtZTtcbiAgICAgICAgICAgICAgdmFyIGZvbGRlciA9IGZvbGRlck1hcFtmb2xkZXJOYW1lXTtcbiAgICAgICAgICAgICAgaWYgKCFmb2xkZXIpIHtcbiAgICAgICAgICAgICAgICBmb2xkZXIgPSB7XG4gICAgICAgICAgICAgICAgICBuYW1lOiBmb2xkZXJOYW1lLFxuICAgICAgICAgICAgICAgICAgY29tbWFuZHM6IFtdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBmb2xkZXJNYXBbZm9sZGVyTmFtZV0gPSBmb2xkZXI7XG4gICAgICAgICAgICAgICAgZm9sZGVycy5wdXNoKGZvbGRlcik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZm9sZGVyLmNvbW1hbmRzLnB1c2goY29tbWFuZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGZvbGRlcnMgPSBfLnNvcnRCeShmb2xkZXJzLCBcIm5hbWVcIik7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goZm9sZGVycywgKGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgICBmb2xkZXIuY29tbWFuZHMgPSBfLnNvcnRCeShmb2xkZXIuY29tbWFuZHMsIFwiJHNob3J0TmFtZVwiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5mb2xkZXJzID0gZm9sZGVycztcblxuICAgICAgICAgICAgc2V0TW9kZWxDb21tYW5kcygkc2NvcGUubW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5jb21tYW5kcyk7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KS5cbiAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgUmVwb0NvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiUmVwb0NvbnRyb2xsZXJcIixcbiAgICBbXCIkc2NvcGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLFxuICAgICAgKCRzY29wZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLm5hbWUgPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdO1xuXG4gICAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgICAgcmVkaXJlY3RUb1NldHVwU2VjcmV0c0lmTm90RGVmaW5lZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cbiAgICAgICAgJHNjb3BlLiRvbignJHJvdXRlVXBkYXRlJywgKCRldmVudCkgPT4ge1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdXBkYXRlRGF0YSgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5uYW1lKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgJHNjb3BlLm5hbWUpO1xuICAgICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCgkc2NvcGUucHJvamVjdElkLCB1cmwpO1xuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IGNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgICAgICAgICRodHRwLmdldCh1cmwsIGNvbmZpZykuXG4gICAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgIGVucmljaFJlcG8oZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHkgPSBkYXRhO1xuICAgICAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgUmVwb3NDb250cm9sbGVyID0gY29udHJvbGxlcihcIlJlcG9zQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGxvY2F0aW9uXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiS3ViZXJuZXRlc01vZGVsXCIsIFwiU2VydmljZVJlZ2lzdHJ5XCIsXG4gICAgKCRzY29wZSwgJGRpYWxvZywgJHdpbmRvdywgJHRlbXBsYXRlQ2FjaGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsIGxvY2FsU3RvcmFnZSwgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCwgS3ViZXJuZXRlc01vZGVsOiBLdWJlcm5ldGVzLkt1YmVybmV0ZXNNb2RlbFNlcnZpY2UsIFNlcnZpY2VSZWdpc3RyeSkgPT4ge1xuXG4gICAgICAkc2NvcGUubW9kZWwgPSBLdWJlcm5ldGVzTW9kZWw7XG4gICAgICAkc2NvcGUucmVzb3VyY2VQYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXTtcbiAgICAgICRzY29wZS5jb21tYW5kc0xpbmsgPSAocGF0aCkgPT4gY29tbWFuZHNMaW5rKHBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuXG4gICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG4gICAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZy5wdXNoKHtcbiAgICAgICAgbGFiZWw6IFwiQ3JlYXRlIFByb2plY3RcIlxuICAgICAgfSk7XG4gICAgICAkc2NvcGUuc3ViVGFiQ29uZmlnID0gW107XG5cblxuICAgICAgJHNjb3BlLiRvbigna3ViZXJuZXRlc01vZGVsVXBkYXRlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXBkYXRlTGlua3MoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgcHJvamVjdElkID0gbnVsbDtcbiAgICAgIHZhciBucyA9ICRzY29wZS5uYW1lc3BhY2U7XG4gICAgICAkc2NvcGUuc291cmNlU2VjcmV0ID0gZ2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsIG5zLCBwcm9qZWN0SWQpO1xuXG4gICAgICAkc2NvcGUudGFibGVDb25maWcgPSB7XG4gICAgICAgIGRhdGE6ICdwcm9qZWN0cycsXG4gICAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlUm93Q2xpY2tTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICBtdWx0aVNlbGVjdDogdHJ1ZSxcbiAgICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgICBmaWx0ZXJUZXh0OiAkbG9jYXRpb24uc2VhcmNoKClbXCJxXCJdIHx8ICcnXG4gICAgICAgIH0sXG4gICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ25hbWUnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdSZXBvc2l0b3J5IE5hbWUnLFxuICAgICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoXCJyZXBvVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdhY3Rpb25zJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnQWN0aW9ucycsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcInJlcG9BY3Rpb25zVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmxvZ2luID0ge1xuICAgICAgICBhdXRoSGVhZGVyOiBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXSB8fCBcIlwiLFxuICAgICAgICByZWxvZ2luOiBmYWxzZSxcbiAgICAgICAgYXZhdGFyX3VybDogbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXSB8fCBcIlwiLFxuICAgICAgICB1c2VyOiBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXSB8fCBcIlwiLFxuICAgICAgICBwYXNzd29yZDogXCJcIixcbiAgICAgICAgZW1haWw6IGxvY2FsU3RvcmFnZVtcImdvZ3NFbWFpbFwiXSB8fCBcIlwiXG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZG9Mb2dpbiA9ICgpID0+IHtcbiAgICAgICAgdmFyIGxvZ2luID0gJHNjb3BlLmxvZ2luO1xuICAgICAgICB2YXIgdXNlciA9IGxvZ2luLnVzZXI7XG4gICAgICAgIHZhciBwYXNzd29yZCA9IGxvZ2luLnBhc3N3b3JkO1xuICAgICAgICBpZiAodXNlciAmJiBwYXNzd29yZCkge1xuICAgICAgICAgIHZhciB1c2VyUHdkID0gdXNlciArICc6JyArIHBhc3N3b3JkO1xuICAgICAgICAgIGxvZ2luLmF1dGhIZWFkZXIgPSAnQmFzaWMgJyArICh1c2VyUHdkLmVuY29kZUJhc2U2NCgpKTtcbiAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5sb2dvdXQgPSAoKSA9PiB7XG4gICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICAgICAgJHNjb3BlLmxvZ2luLmF1dGhIZWFkZXIgPSBudWxsO1xuICAgICAgICAkc2NvcGUubG9naW4ubG9nZ2VkSW4gPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLmxvZ2luLmZhaWxlZCA9IGZhbHNlO1xuICAgICAgICBsb2dnZWRJblRvR29ncyA9IGZhbHNlO1xuICAgICAgfTtcblxuXG4gICAgICAkc2NvcGUub3BlbkNvbW1hbmRzID0gKCkgPT4ge1xuICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gbnVsbDtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLnRhYmxlQ29uZmlnLnNlbGVjdGVkSXRlbXM7XG4gICAgICAgIGlmIChfLmlzQXJyYXkoc2VsZWN0ZWQpICYmIHNlbGVjdGVkLmxlbmd0aCkge1xuICAgICAgICAgIHJlc291cmNlUGF0aCA9IHNlbGVjdGVkWzBdLnBhdGg7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGxpbmsgPSBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCAkc2NvcGUucHJvamVjdElkKTtcbiAgICAgICAgbG9nLmluZm8oXCJtb3ZpbmcgdG8gY29tbWFuZHMgbGluazogXCIgKyBsaW5rKTtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgobGluayk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZGVsZXRlID0gKHByb2plY3RzKSA9PiB7XG4gICAgICAgIFVJLm11bHRpSXRlbUNvbmZpcm1BY3Rpb25EaWFsb2coPFVJLk11bHRpSXRlbUNvbmZpcm1BY3Rpb25PcHRpb25zPntcbiAgICAgICAgICBjb2xsZWN0aW9uOiBwcm9qZWN0cyxcbiAgICAgICAgICBpbmRleDogJ3BhdGgnLFxuICAgICAgICAgIG9uQ2xvc2U6IChyZXN1bHQ6Ym9vbGVhbikgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICBkb0RlbGV0ZShwcm9qZWN0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB0aXRsZTogJ0RlbGV0ZSBwcm9qZWN0cz8nLFxuICAgICAgICAgIGFjdGlvbjogJ1RoZSBmb2xsb3dpbmcgcHJvamVjdHMgd2lsbCBiZSByZW1vdmVkICh0aG91Z2ggdGhlIGZpbGVzIHdpbGwgcmVtYWluIG9uIHlvdXIgZmlsZSBzeXN0ZW0pOicsXG4gICAgICAgICAgb2tUZXh0OiAnRGVsZXRlJyxcbiAgICAgICAgICBva0NsYXNzOiAnYnRuLWRhbmdlcicsXG4gICAgICAgICAgY3VzdG9tOiBcIlRoaXMgb3BlcmF0aW9uIGlzIHBlcm1hbmVudCBvbmNlIGNvbXBsZXRlZCFcIixcbiAgICAgICAgICBjdXN0b21DbGFzczogXCJhbGVydCBhbGVydC13YXJuaW5nXCJcbiAgICAgICAgfSkub3BlbigpO1xuICAgICAgfTtcblxuICAgICAgdXBkYXRlTGlua3MoKTtcblxuICAgICAgZnVuY3Rpb24gZG9EZWxldGUocHJvamVjdHMpIHtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHByb2plY3RzLCAocHJvamVjdCkgPT4ge1xuICAgICAgICAgIGxvZy5pbmZvKFwiRGVsZXRpbmcgXCIgKyBhbmd1bGFyLnRvSnNvbigkc2NvcGUucHJvamVjdHMpKTtcbiAgICAgICAgICB2YXIgcGF0aCA9IHByb2plY3QucGF0aDtcbiAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgdmFyIHVybCA9IHJlcG9BcGlVcmwoRm9yZ2VBcGlVUkwsIHBhdGgpO1xuICAgICAgICAgICAgJGh0dHAuZGVsZXRlKHVybCkuXG4gICAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgICAgICAgICB9KS5cbiAgICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IFwiRmFpbGVkIHRvIFBPU1QgdG8gXCIgKyB1cmwgKyBcIiBnb3Qgc3RhdHVzOiBcIiArIHN0YXR1cztcbiAgICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbignZXJyb3InLCBtZXNzYWdlKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gdXBkYXRlTGlua3MoKSB7XG4gICAgICAgIHZhciAkZ29nc0xpbmsgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZVJlYWR5TGluayhnb2dzU2VydmljZU5hbWUpO1xuICAgICAgICBpZiAoJGdvZ3NMaW5rKSB7XG4gICAgICAgICAgJHNjb3BlLnNpZ25VcFVybCA9IFVybEhlbHBlcnMuam9pbigkZ29nc0xpbmssIFwidXNlci9zaWduX3VwXCIpO1xuICAgICAgICAgICRzY29wZS5mb3Jnb3RQYXNzd29yZFVybCA9IFVybEhlbHBlcnMuam9pbigkZ29nc0xpbmssIFwidXNlci9mb3JnZXRfcGFzc3dvcmRcIik7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLiRnb2dzTGluayA9ICRnb2dzTGluaztcbiAgICAgICAgJHNjb3BlLiRmb3JnZUxpbmsgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZVJlYWR5TGluayhLdWJlcm5ldGVzLmZhYnJpYzhGb3JnZVNlcnZpY2VOYW1lKTtcblxuICAgICAgICAkc2NvcGUuJGhhc0NEUGlwZWxpbmVUZW1wbGF0ZSA9IF8uYW55KCRzY29wZS5tb2RlbC50ZW1wbGF0ZXMsICh0KSA9PiBcImNkLXBpcGVsaW5lXCIgPT09IEt1YmVybmV0ZXMuZ2V0TmFtZSh0KSk7XG5cbiAgICAgICAgdmFyIGV4cGVjdGVkUkNTID0gW0t1YmVybmV0ZXMuZ29nc1NlcnZpY2VOYW1lLCBLdWJlcm5ldGVzLmZhYnJpYzhGb3JnZVNlcnZpY2VOYW1lLCBLdWJlcm5ldGVzLmplbmtpbnNTZXJ2aWNlTmFtZV07XG4gICAgICAgIHZhciByZXF1aXJlZFJDcyA9IHt9O1xuICAgICAgICB2YXIgbnMgPSBLdWJlcm5ldGVzLmN1cnJlbnRLdWJlcm5ldGVzTmFtZXNwYWNlKCk7XG4gICAgICAgIHZhciBydW5uaW5nQ0RQaXBlbGluZSA9IHRydWU7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChleHBlY3RlZFJDUywgKHJjTmFtZSkgPT4ge1xuICAgICAgICAgIHZhciByYyA9ICRzY29wZS5tb2RlbC5nZXRSZXBsaWNhdGlvbkNvbnRyb2xsZXIobnMsIHJjTmFtZSk7XG4gICAgICAgICAgaWYgKHJjKSB7XG4gICAgICAgICAgICByZXF1aXJlZFJDc1tyY05hbWVdID0gcmM7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJ1bm5pbmdDRFBpcGVsaW5lID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgJHNjb3BlLiRyZXF1aXJlZFJDcyA9IHJlcXVpcmVkUkNzO1xuICAgICAgICAkc2NvcGUuJHJ1bm5pbmdDRFBpcGVsaW5lID0gcnVubmluZ0NEUGlwZWxpbmU7XG4gICAgICAgIHZhciB1cmwgPSBcIlwiO1xuICAgICAgICAkbG9jYXRpb24gPSBLdWJlcm5ldGVzLmluamVjdChcIiRsb2NhdGlvblwiKTtcbiAgICAgICAgaWYgKCRsb2NhdGlvbikge1xuICAgICAgICAgIHVybCA9ICRsb2NhdGlvbi51cmwoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgIHVybCA9IHdpbmRvdy5sb2NhdGlvbi50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE8gc2hvdWxkIHdlIHN1cHBvcnQgYW55IG90aGVyIHRlbXBsYXRlIG5hbWVzcGFjZXM/XG4gICAgICAgIHZhciB0ZW1wbGF0ZU5hbWVzcGFjZSA9IFwiZGVmYXVsdFwiO1xuICAgICAgICAkc2NvcGUuJHJ1bkNEUGlwZWxpbmVMaW5rID0gXCIva3ViZXJuZXRlcy9uYW1lc3BhY2UvXCIgKyB0ZW1wbGF0ZU5hbWVzcGFjZSArIFwiL3RlbXBsYXRlcy9cIiArIG5zICsgXCI/cT1jZC1waXBlbGluZSZyZXR1cm5Ubz1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh1cmwpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiB1cGRhdGVEYXRhKCkge1xuICAgICAgICB2YXIgYXV0aEhlYWRlciA9ICRzY29wZS5sb2dpbi5hdXRoSGVhZGVyO1xuICAgICAgICB2YXIgZW1haWwgPSAkc2NvcGUubG9naW4uZW1haWwgfHwgXCJcIjtcbiAgICAgICAgaWYgKGF1dGhIZWFkZXIpIHtcbiAgICAgICAgICB2YXIgdXJsID0gcmVwb3NBcGlVcmwoRm9yZ2VBcGlVUkwpO1xuICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwoJHNjb3BlLnByb2plY3RJZCwgdXJsLCBhdXRoSGVhZGVyLCBlbWFpbCk7XG4gICAgICAgICAgdmFyIGNvbmZpZyA9IHtcbi8qXG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgIEdvZ3NBdXRob3JpemF0aW9uOiBhdXRoSGVhZGVyLFxuICAgICAgICAgICAgICBHb2dzRW1haWw6IGVtYWlsXG4gICAgICAgICAgICB9XG4qL1xuICAgICAgICAgIH07XG4gICAgICAgICAgJGh0dHAuZ2V0KHVybCwgY29uZmlnKS5cbiAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dpbi5mYWlsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmxvZ2dlZEluID0gdHJ1ZTtcbiAgICAgICAgICAgICAgbG9nZ2VkSW5Ub0dvZ3MgPSB0cnVlO1xuICAgICAgICAgICAgICB2YXIgYXZhdGFyX3VybCA9IG51bGw7XG4gICAgICAgICAgICAgIGlmIChzdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIGlmICghZGF0YSB8fCAhYW5ndWxhci5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICBkYXRhID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGxldHMgc3RvcmUgYSBzdWNjZXNzZnVsIGxvZ2luIHNvIHRoYXQgd2UgaGlkZSB0aGUgbG9naW4gcGFnZVxuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdID0gYXV0aEhlYWRlcjtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl0gPSBlbWFpbDtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXSA9ICRzY29wZS5sb2dpbi51c2VyIHx8IFwiXCI7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUucHJvamVjdHMgPSBfLnNvcnRCeShkYXRhLCBcIm5hbWVcIik7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5wcm9qZWN0cywgKHJlcG8pID0+IHtcbiAgICAgICAgICAgICAgICAgIGVucmljaFJlcG8ocmVwbyk7XG4gICAgICAgICAgICAgICAgICBpZiAoIWF2YXRhcl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgYXZhdGFyX3VybCA9IENvcmUucGF0aEdldChyZXBvLCBbXCJvd25lclwiLCBcImF2YXRhcl91cmxcIl0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXZhdGFyX3VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5sb2dpbi5hdmF0YXJfdXJsID0gYXZhdGFyX3VybDtcbiAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdID0gYXZhdGFyX3VybDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ291dCgpO1xuICAgICAgICAgICAgICAkc2NvcGUubG9naW4uZmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgaWYgKHN0YXR1cyAhPT0gNDAzKSB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdXBkYXRlRGF0YSgpO1xuXG4gICAgfV0pO1xufVxuIiwiLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGNvbnN0IHNlY3JldE5hbWVzcGFjZUtleSA9IFwiZmFicmljOFNvdXJjZVNlY3JldE5hbWVzcGFjZVwiO1xuICBjb25zdCBzZWNyZXROYW1lS2V5ID0gXCJmYWJyaWM4U291cmNlU2VjcmV0XCI7XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldFNvdXJjZVNlY3JldE5hbWVzcGFjZShsb2NhbFN0b3JhZ2UpIHtcbiAgICB2YXIgc2VjcmV0TmFtZXNwYWNlID0gbG9jYWxTdG9yYWdlW3NlY3JldE5hbWVzcGFjZUtleV07XG4gICAgdmFyIHVzZXJOYW1lID0gS3ViZXJuZXRlcy5jdXJyZW50VXNlck5hbWUoKTtcbiAgICBpZiAoIXNlY3JldE5hbWVzcGFjZSkge1xuICAgICAgc2VjcmV0TmFtZXNwYWNlID0gXCJ1c2VyLXNlY3JldHMtc291cmNlLVwiICsgdXNlck5hbWU7XG4gICAgfVxuICAgIHJldHVybiBzZWNyZXROYW1lc3BhY2U7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0U291cmNlU2VjcmV0KGxvY2FsU3RvcmFnZSwgbnMsIHByb2plY3RJZCkge1xuICAgIGlmICghbnMpIHtcbiAgICAgIG5zID0gS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgIH1cbiAgICB2YXIgc2VjcmV0S2V5ID0gY3JlYXRlTG9jYWxTdG9yYWdlS2V5KHNlY3JldE5hbWVLZXksIG5zLCBwcm9qZWN0SWQpO1xuICAgIHZhciBzb3VyY2VTZWNyZXQgPSBsb2NhbFN0b3JhZ2Vbc2VjcmV0S2V5XTtcbiAgICByZXR1cm4gc291cmNlU2VjcmV0O1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCBucywgcHJvamVjdElkLCBzZWNyZXROYW1lKSB7XG4gICAgdmFyIHNlY3JldEtleSA9IGNyZWF0ZUxvY2FsU3RvcmFnZUtleShzZWNyZXROYW1lS2V5LCBucywgcHJvamVjdElkKTtcbiAgICBsb2NhbFN0b3JhZ2Vbc2VjcmV0S2V5XSA9IHNlY3JldE5hbWU7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcGFyc2VVcmwodXJsKSB7XG4gICAgaWYgKHVybCkge1xuICAgICAgdmFyIHBhcnNlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgIHBhcnNlci5ocmVmID0gdXJsO1xuICAgICAgcmV0dXJuIHBhcnNlcjtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHByb3RvY29sOiBcIlwiLFxuICAgICAgaG9zdDogXCJcIlxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVMb2NhbFN0b3JhZ2VLZXkocHJlZml4LCBucywgbmFtZSkge1xuICAgIHJldHVybiBwcmVmaXggKyBcIi9cIiArIG5zICsgXCIvXCIgKyAobmFtZSB8fCBcIlwiKTtcbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJzZWNyZXRIZWxwZXJzLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG5cbiAgZXhwb3J0IHZhciBTZWNyZXRzQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJTZWNyZXRzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiRlbGVtZW50XCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkbG9jYXRpb25cIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJGb3JnZU1vZGVsXCIsIFwiS3ViZXJuZXRlc01vZGVsXCIsXG4gICAgKCRzY29wZSwgJGRpYWxvZywgJHdpbmRvdywgJGVsZW1lbnQsICR0ZW1wbGF0ZUNhY2hlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwsIEt1YmVybmV0ZXNNb2RlbCkgPT4ge1xuXG4gICAgICAkc2NvcGUubW9kZWwgPSBLdWJlcm5ldGVzTW9kZWw7XG5cbiAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTZXR0aW5nc0JyZWFkY3J1bWJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U2V0dGluZ3NTdWJOYXZCYXJzKCRzY29wZS5wcm9qZWN0SWQpO1xuXG4gICAgICB2YXIgcHJvamVjdElkID0gJHNjb3BlLnByb2plY3RJZDtcbiAgICAgIHZhciBucyA9ICRzY29wZS5uYW1lc3BhY2U7XG4gICAgICB2YXIgdXNlck5hbWUgPSBLdWJlcm5ldGVzLmN1cnJlbnRVc2VyTmFtZSgpO1xuICAgICAgJHNjb3BlLnNvdXJjZVNlY3JldCA9IGdldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCBucywgcHJvamVjdElkKTtcblxuXG4gICAgICB2YXIgY3JlYXRlZFNlY3JldCA9ICRsb2NhdGlvbi5zZWFyY2goKVtcInNlY3JldFwiXTtcblxuICAgICAgdmFyIHByb2plY3RDbGllbnQgPSBLdWJlcm5ldGVzLmNyZWF0ZUt1YmVybmV0ZXNDbGllbnQoXCJwcm9qZWN0c1wiKTtcbiAgICAgICRzY29wZS5zb3VyY2VTZWNyZXROYW1lc3BhY2UgPSBnZXRTb3VyY2VTZWNyZXROYW1lc3BhY2UobG9jYWxTdG9yYWdlKTtcblxuICAgICAgJHNjb3BlLnNldHVwU2VjcmV0c0xpbmsgPSBEZXZlbG9wZXIucHJvamVjdFNlY3JldHNMaW5rKG5zLCBwcm9qZWN0SWQpO1xuICAgICAgJHNjb3BlLnNlY3JldE5hbWVzcGFjZUxpbmsgPSBEZXZlbG9wZXIuc2VjcmV0c05hbWVzcGFjZUxpbmsobnMsIHByb2plY3RJZCwgJHNjb3BlLnNvdXJjZVNlY3JldE5hbWVzcGFjZSk7XG5cbiAgICAgIGxvZy5kZWJ1ZyhcIkZvdW5kIHNvdXJjZSBzZWNyZXQgbmFtZXNwYWNlIFwiICsgJHNjb3BlLnNvdXJjZVNlY3JldE5hbWVzcGFjZSk7XG4gICAgICBsb2cuZGVidWcoXCJGb3VuZCBzb3VyY2Ugc2VjcmV0IGZvciBcIiArIG5zICsgXCIvXCIgKyBwcm9qZWN0SWQgKyBcIiA9IFwiICsgJHNjb3BlLnNvdXJjZVNlY3JldCk7XG5cbiAgICAgICRzY29wZS4kb24oJyRyb3V0ZVVwZGF0ZScsICgkZXZlbnQpID0+IHtcbiAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgfSk7XG5cbiAgICAgICRzY29wZS4kb24oJ2t1YmVybmV0ZXNNb2RlbFVwZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgIH0pO1xuXG4gICAgICAkc2NvcGUudGFibGVDb25maWcgPSB7XG4gICAgICAgIGRhdGE6ICdmaWx0ZXJlZFNlY3JldHMnLFxuICAgICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiB0cnVlLFxuICAgICAgICBtdWx0aVNlbGVjdDogZmFsc2UsXG4gICAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICAgZmlsdGVyVGV4dDogJGxvY2F0aW9uLnNlYXJjaCgpW1wicVwiXSB8fCAnJ1xuICAgICAgICB9LFxuICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdfa2V5JyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnU2VjcmV0IE5hbWUnLFxuICAgICAgICAgICAgZGVmYXVsdFNvcnQ6IHRydWUsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dCBub3dyYXBcIj57e3Jvdy5lbnRpdHkubWV0YWRhdGEubmFtZX19PC9kaXY+J1xuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICckbGFiZWxzVGV4dCcsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0xhYmVscycsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcImxhYmVsVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH0sXG4gICAgICAgIF1cbiAgICAgIH07XG5cbiAgICAgIGlmIChjcmVhdGVkU2VjcmV0KSB7XG4gICAgICAgICRsb2NhdGlvbi5zZWFyY2goXCJzZWNyZXRcIiwgbnVsbCk7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZFNlY3JldE5hbWUgPSBjcmVhdGVkU2VjcmV0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZWN0ZWRTZWNyZXROYW1lKCk7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKFwidGFibGVDb25maWcuc2VsZWN0ZWRJdGVtc1wiLCAoKSA9PiB7XG4gICAgICAgIHNlbGVjdGVkU2VjcmV0TmFtZSgpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgIGNoZWNrTmFtZXNwYWNlQ3JlYXRlZCgpO1xuICAgICAgICB1cGRhdGVQcm9qZWN0KCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9XG5cbiAgICAgIGNoZWNrTmFtZXNwYWNlQ3JlYXRlZCgpO1xuXG4gICAgICBmdW5jdGlvbiBzZWxlY3RlZFNlY3JldE5hbWUoKSB7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZFNlY3JldE5hbWUgPSBjcmVhdGVkU2VjcmV0IHx8IGdldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCBucywgcHJvamVjdElkKTtcbiAgICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUudGFibGVDb25maWcuc2VsZWN0ZWRJdGVtcztcbiAgICAgICAgaWYgKHNlbGVjdGVkSXRlbXMgJiYgc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgc2VjcmV0ID0gc2VsZWN0ZWRJdGVtc1swXTtcbiAgICAgICAgICBjb25zdCBuYW1lID0gS3ViZXJuZXRlcy5nZXROYW1lKHNlY3JldCk7XG4gICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZFNlY3JldE5hbWUgPSBuYW1lO1xuICAgICAgICAgICAgaWYgKGNyZWF0ZWRTZWNyZXQgJiYgbmFtZSAhPT0gY3JlYXRlZFNlY3JldCkge1xuICAgICAgICAgICAgICAvLyBsZXRzIGNsZWFyIHRoZSBwcmV2aW91c2x5IGNyZWF0ZWQgc2VjcmV0XG4gICAgICAgICAgICAgIGNyZWF0ZWRTZWNyZXQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJHNjb3BlLnNlbGVjdGVkU2VjcmV0TmFtZTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUudGFibGVDb25maWcuc2VsZWN0ZWRJdGVtcztcbiAgICAgICAgc2VsZWN0ZWRJdGVtcy5zcGxpY2UoMCwgc2VsZWN0ZWRJdGVtcy5sZW5ndGgpO1xuICAgICAgICB2YXIgY3VycmVudCA9IGNyZWF0ZWRTZWNyZXQgfHwgZ2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsIG5zLCBwcm9qZWN0SWQpO1xuICAgICAgICBpZiAoY3VycmVudCkge1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUucGVyc29uYWxTZWNyZXRzLCAoc2VjcmV0KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXNlbGVjdGVkSXRlbXMubGVuZ3RoICYmIGN1cnJlbnQgPT09IEt1YmVybmV0ZXMuZ2V0TmFtZShzZWNyZXQpKSB7XG4gICAgICAgICAgICAgIHNlbGVjdGVkSXRlbXMucHVzaChzZWNyZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS50YWJsZUNvbmZpZy5zZWxlY3RlZEl0ZW1zID0gc2VsZWN0ZWRJdGVtcztcbiAgICAgICAgc2VsZWN0ZWRTZWNyZXROYW1lKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuY2FuU2F2ZSA9ICgpID0+IHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gc2VsZWN0ZWRTZWNyZXROYW1lKCk7XG4gICAgICAgIHZhciBjdXJyZW50ID0gZ2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsIG5zLCBwcm9qZWN0SWQpO1xuICAgICAgICByZXR1cm4gc2VsZWN0ZWQgJiYgc2VsZWN0ZWQgIT09IGN1cnJlbnQ7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuc2F2ZSA9ICgpID0+IHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gc2VsZWN0ZWRTZWNyZXROYW1lKCk7XG4gICAgICAgIGlmIChzZWxlY3RlZCkge1xuICAgICAgICAgIHNldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCBucywgcHJvamVjdElkLCBzZWxlY3RlZCk7XG5cbiAgICAgICAgICBpZiAoIXByb2plY3RJZCkge1xuICAgICAgICAgICAgLy8gbGV0cyByZWRpcmVjdCBiYWNrIHRvIHRoZSBjcmVhdGUgcHJvamVjdCBwYWdlXG4gICAgICAgICAgICAkbG9jYXRpb24ucGF0aChEZXZlbG9wZXIuY3JlYXRlUHJvamVjdExpbmsobnMpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGNoZWNrTmFtZXNwYWNlQ3JlYXRlZCgpO1xuXG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZVByb2plY3QoKSB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUubW9kZWwuYnVpbGRjb25maWdzLCAocHJvamVjdCkgPT4ge1xuICAgICAgICAgIGlmIChwcm9qZWN0SWQgPT09IEt1YmVybmV0ZXMuZ2V0TmFtZShwcm9qZWN0KSkge1xuICAgICAgICAgICAgJHNjb3BlLnByb2plY3QgPSBwcm9qZWN0O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgICRzY29wZS5naXRVcmwgPSBDb3JlLnBhdGhHZXQoJHNjb3BlLnByb2plY3QsIFsnc3BlYycsICdzb3VyY2UnLCAnZ2l0JywgJ3VyaSddKTtcbiAgICAgICAgdmFyIHBhcnNlciA9IHBhcnNlVXJsKCRzY29wZS5naXRVcmwpO1xuICAgICAgICB2YXIga2luZCA9IHBhcnNlci5wcm90b2NvbDtcbiAgICAgICAgLy8gdGhlc2Uga2luZHMgb2YgVVJMcyBzaG93IHVwIGFzIGh0dHBcbiAgICAgICAgaWYgKCEkc2NvcGUuZ2l0VXJsKSB7XG4gICAgICAgICAga2luZCA9IFwiaHR0cHNcIjtcbiAgICAgICAgfSBlbHNlIGlmICgkc2NvcGUuZ2l0VXJsICYmICRzY29wZS5naXRVcmwuc3RhcnRzV2l0aChcImdpdEBcIikpIHtcbiAgICAgICAgICBraW5kID0gXCJzc2hcIjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaG9zdCA9IHBhcnNlci5ob3N0O1xuICAgICAgICB2YXIgcmVxdWlyZWREYXRhS2V5cyA9IEt1YmVybmV0ZXMuc3NoU2VjcmV0RGF0YUtleXM7XG4gICAgICAgIGlmIChraW5kICYmIGtpbmQuc3RhcnRzV2l0aCgnaHR0cCcpKSB7XG4gICAgICAgICAga2luZCA9ICdodHRwcyc7XG4gICAgICAgICAgcmVxdWlyZWREYXRhS2V5cyA9IEt1YmVybmV0ZXMuaHR0cHNTZWNyZXREYXRhS2V5cztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBraW5kID0gJ3NzaCc7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmtpbmQgPSBraW5kO1xuICAgICAgICB2YXIgc2F2ZWRVcmwgPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgICBjb25zdCBuZXdTZWNyZXRQYXRoID0gVXJsSGVscGVycy5qb2luKFwibmFtZXNwYWNlXCIsICRzY29wZS5zb3VyY2VTZWNyZXROYW1lc3BhY2UsIFwic2VjcmV0Q3JlYXRlP2tpbmQ9XCIgKyBraW5kICsgXCImc2F2ZWRVcmw9XCIgKyBzYXZlZFVybCk7XG4gICAgICAgICRzY29wZS5hZGROZXdTZWNyZXRMaW5rID0gKHByb2plY3RJZCkgP1xuICAgICAgICAgIERldmVsb3Blci5wcm9qZWN0V29ya3NwYWNlTGluayhucywgcHJvamVjdElkLCBuZXdTZWNyZXRQYXRoKSA6XG4gICAgICAgICAgVXJsSGVscGVycy5qb2luKEhhd3Rpb0NvcmUuZG9jdW1lbnRCYXNlKCksIEt1YmVybmV0ZXMuY29udGV4dCwgbmV3U2VjcmV0UGF0aCk7XG5cbiAgICAgICAgdmFyIGZpbHRlcmVkU2VjcmV0cyA9IFtdO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLnBlcnNvbmFsU2VjcmV0cywgKHNlY3JldCkgPT4ge1xuICAgICAgICAgIHZhciBkYXRhID0gc2VjcmV0LmRhdGE7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciB2YWxpZCA9IHRydWU7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2gocmVxdWlyZWREYXRhS2V5cywgKGtleSkgPT4ge1xuICAgICAgICAgICAgICBpZiAoIWRhdGFba2V5XSkge1xuICAgICAgICAgICAgICAgIHZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHZhbGlkKSB7XG4gICAgICAgICAgICAgIGZpbHRlcmVkU2VjcmV0cy5wdXNoKHNlY3JldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgICRzY29wZS5maWx0ZXJlZFNlY3JldHMgPSBfLnNvcnRCeShmaWx0ZXJlZFNlY3JldHMsIFwiX2tleVwiKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG9uUGVyc29uYWxTZWNyZXRzKHNlY3JldHMpIHtcbiAgICAgICAgbG9nLmluZm8oXCJnb3Qgc2VjcmV0cyFcIik7XG4gICAgICAgICRzY29wZS5wZXJzb25hbFNlY3JldHMgPSBzZWNyZXRzO1xuICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICRzY29wZS5jYW5jZWwoKTtcbiAgICAgICAgdXBkYXRlUHJvamVjdCgpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvbkJ1aWxkQ29uZmlncyhidWlsZGNvbmZpZ3MpIHtcbiAgICAgICAgaWYgKG9uQnVpbGRDb25maWdzICYmICEoJHNjb3BlLm1vZGVsLmJ1aWxkY29uZmlncyB8fCBbXSkubGVuZ3RoKSB7XG4gICAgICAgICAgJHNjb3BlLm1vZGVsLmJ1aWxkY29uZmlncyA9IGJ1aWxkY29uZmlncztcbiAgICAgICAgfVxuICAgICAgICB1cGRhdGVQcm9qZWN0KCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNoZWNrTmFtZXNwYWNlQ3JlYXRlZCgpIHtcbiAgICAgICAgdmFyIG5hbWVzcGFjZU5hbWUgPSAkc2NvcGUuc291cmNlU2VjcmV0TmFtZXNwYWNlO1xuXG4gICAgICAgIGZ1bmN0aW9uIHdhdGNoU2VjcmV0cygpIHtcbiAgICAgICAgICBsb2cuaW5mbyhcIndhdGNoaW5nIHNlY3JldHMgb24gbmFtZXNwYWNlOiBcIiArIG5hbWVzcGFjZU5hbWUpO1xuICAgICAgICAgIEt1YmVybmV0ZXMud2F0Y2goJHNjb3BlLCAkZWxlbWVudCwgXCJzZWNyZXRzXCIsIG5hbWVzcGFjZU5hbWUsIG9uUGVyc29uYWxTZWNyZXRzKTtcbiAgICAgICAgICBLdWJlcm5ldGVzLndhdGNoKCRzY29wZSwgJGVsZW1lbnQsIFwiYnVpbGRjb25maWdzXCIsIG5zLCBvbkJ1aWxkQ29uZmlncyk7XG4gICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghJHNjb3BlLnNlY3JldE5hbWVzcGFjZSkge1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUubW9kZWwucHJvamVjdHMsIChwcm9qZWN0KSA9PiB7XG4gICAgICAgICAgICB2YXIgbmFtZSA9IEt1YmVybmV0ZXMuZ2V0TmFtZShwcm9qZWN0KTtcbiAgICAgICAgICAgIGlmIChuYW1lID09PSBuYW1lc3BhY2VOYW1lKSB7XG4gICAgICAgICAgICAgICRzY29wZS5zZWNyZXROYW1lc3BhY2UgPSBwcm9qZWN0O1xuICAgICAgICAgICAgICB3YXRjaFNlY3JldHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghJHNjb3BlLnNlY3JldE5hbWVzcGFjZSAmJiAkc2NvcGUubW9kZWwucHJvamVjdHMgJiYgJHNjb3BlLm1vZGVsLnByb2plY3RzLmxlbmd0aCkge1xuICAgICAgICAgIGxvZy5pbmZvKFwiQ3JlYXRpbmcgYSBuZXcgbmFtZXNwYWNlIGZvciB0aGUgdXNlciBzZWNyZXRzLi4uLiBcIiArIG5hbWVzcGFjZU5hbWUpO1xuICAgICAgICAgIHZhciBwcm9qZWN0ID0ge1xuICAgICAgICAgICAgYXBpVmVyc2lvbjogS3ViZXJuZXRlcy5kZWZhdWx0QXBpVmVyc2lvbixcbiAgICAgICAgICAgIGtpbmQ6IFwiUHJvamVjdFwiLFxuICAgICAgICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgICAgICAgbmFtZTogbmFtZXNwYWNlTmFtZSxcbiAgICAgICAgICAgICAgbGFiZWxzOiB7XG4gICAgICAgICAgICAgICAgdXNlcjogdXNlck5hbWUsXG4gICAgICAgICAgICAgICAgZ3JvdXA6ICdzZWNyZXRzJyxcbiAgICAgICAgICAgICAgICBwcm9qZWN0OiAnc291cmNlJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHByb2plY3RDbGllbnQucHV0KHByb2plY3QsXG4gICAgICAgICAgICAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAkc2NvcGUuc2VjcmV0TmFtZXNwYWNlID0gcHJvamVjdDtcbiAgICAgICAgICAgICAgd2F0Y2hTZWNyZXRzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKGVycikgPT4ge1xuICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbignZXJyb3InLCBcIkZhaWxlZCB0byBjcmVhdGUgc2VjcmV0IG5hbWVzcGFjZTogXCIgKyBuYW1lc3BhY2VOYW1lICsgXCJcXG5cIiArIGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1dKTtcbn1cbiIsIi8vLyBDb3B5cmlnaHQgMjAxNC0yMDE1IFJlZCBIYXQsIEluYy4gYW5kL29yIGl0cyBhZmZpbGlhdGVzXG4vLy8gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyBhcyBpbmRpY2F0ZWQgYnkgdGhlIEBhdXRob3IgdGFncy5cbi8vL1xuLy8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8vXG4vLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vL1xuLy8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5tb2R1bGUgTWFpbiB7XG5cbiAgZXhwb3J0IHZhciBwbHVnaW5OYW1lID0gXCJmYWJyaWM4LWNvbnNvbGVcIjtcblxuICBleHBvcnQgdmFyIGxvZzogTG9nZ2luZy5Mb2dnZXIgPSBMb2dnZXIuZ2V0KHBsdWdpbk5hbWUpO1xuXG4gIGV4cG9ydCB2YXIgdGVtcGxhdGVQYXRoID0gXCJwbHVnaW5zL21haW4vaHRtbFwiO1xuXG4gIC8vIGt1YmVybmV0ZXMgc2VydmljZSBuYW1lc1xuICBleHBvcnQgdmFyIGNoYXRTZXJ2aWNlTmFtZSA9IFwibGV0c2NoYXRcIjtcbiAgZXhwb3J0IHZhciBncmFmYW5hU2VydmljZU5hbWUgPSBcImdyYWZhbmFcIjtcbiAgZXhwb3J0IHZhciBhcHBMaWJyYXJ5U2VydmljZU5hbWUgPSBcImFwcC1saWJyYXJ5XCI7XG5cbiAgZXhwb3J0IHZhciB2ZXJzaW9uOmFueSA9IHt9O1xuXG59XG4iLCIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2ZvcmdlL3RzL2ZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYWluR2xvYmFscy50c1wiLz5cblxubW9kdWxlIE1haW4ge1xuXG4gIGV4cG9ydCB2YXIgX21vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKHBsdWdpbk5hbWUsIFtGb3JnZS5wbHVnaW5OYW1lXSk7XG5cbiAgdmFyIHRhYiA9IHVuZGVmaW5lZDtcblxuICBfbW9kdWxlLnJ1bigoJHJvb3RTY29wZSwgSGF3dGlvTmF2OiBIYXd0aW9NYWluTmF2LlJlZ2lzdHJ5LCBLdWJlcm5ldGVzTW9kZWwsIFNlcnZpY2VSZWdpc3RyeSwgcHJlZmVyZW5jZXNSZWdpc3RyeSkgPT4ge1xuXG4gICAgSGF3dGlvTmF2Lm9uKEhhd3Rpb01haW5OYXYuQWN0aW9ucy5DSEFOR0VELCBwbHVnaW5OYW1lLCAoaXRlbXMpID0+IHtcbiAgICAgIGl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgc3dpdGNoKGl0ZW0uaWQpIHtcbiAgICAgICAgICBjYXNlICdmb3JnZSc6XG4gICAgICAgICAgY2FzZSAnanZtJzpcbiAgICAgICAgICBjYXNlICd3aWtpJzpcbiAgICAgICAgICBjYXNlICdkb2NrZXItcmVnaXN0cnknOlxuICAgICAgICAgICAgaXRlbS5pc1ZhbGlkID0gKCkgPT4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6ICdsaWJyYXJ5JyxcbiAgICAgIHRpdGxlOiAoKSA9PiAnTGlicmFyeScsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlldyB0aGUgbGlicmFyeSBvZiBhcHBsaWNhdGlvbnMnLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoYXBwTGlicmFyeVNlcnZpY2VOYW1lKSAmJiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShcImFwcC1saWJyYXJ5LWpvbG9raWFcIiksXG4gICAgICBocmVmOiAoKSA9PiBcIi93aWtpL3ZpZXdcIixcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgdmFyIGtpYmFuYVNlcnZpY2VOYW1lID0gS3ViZXJuZXRlcy5raWJhbmFTZXJ2aWNlTmFtZTtcblxuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6ICdraWJhbmEnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnTG9ncycsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlldyBhbmQgc2VhcmNoIGFsbCBsb2dzIGFjcm9zcyBhbGwgY29udGFpbmVycyB1c2luZyBLaWJhbmEgYW5kIEVsYXN0aWNTZWFyY2gnLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2Uoa2liYW5hU2VydmljZU5hbWUpLFxuICAgICAgaHJlZjogKCkgPT4gS3ViZXJuZXRlcy5raWJhbmFMb2dzTGluayhTZXJ2aWNlUmVnaXN0cnkpLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAnYXBpbWFuJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAnQVBJIE1hbmFnZW1lbnQnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0FkZCBQb2xpY2llcyBhbmQgUGxhbnMgdG8geW91ciBBUElzIHdpdGggQXBpbWFuJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKCdhcGltYW4nKSxcbiAgICAgIG9sZEhyZWY6ICgpID0+IHsgLyogbm90aGluZyB0byBkbyAqLyB9LFxuICAgICAgaHJlZjogKCkgPT4ge1xuICAgICAgICB2YXIgaGFzaCA9IHtcbiAgICAgICAgICBiYWNrVG86IG5ldyBVUkkoKS50b1N0cmluZygpLFxuICAgICAgICAgIHRva2VuOiBIYXd0aW9PQXV0aC5nZXRPQXV0aFRva2VuKClcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHVyaSA9IG5ldyBVUkkoU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKCdhcGltYW4nKSk7XG4gICAgICAgIC8vIFRPRE8gaGF2ZSB0byBvdmVyd3JpdGUgdGhlIHBvcnQgaGVyZSBmb3Igc29tZSByZWFzb25cbiAgICAgICAgKDxhbnk+dXJpLnBvcnQoJzgwJykucXVlcnkoe30pLnBhdGgoJ2FwaW1hbnVpL2luZGV4Lmh0bWwnKSkuaGFzaChVUkkuZW5jb2RlKGFuZ3VsYXIudG9Kc29uKGhhc2gpKSk7XG4gICAgICAgIHJldHVybiB1cmkudG9TdHJpbmcoKTtcbiAgICAgIH0gICAgXG4gICAgfSk7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAnZ3JhZmFuYScsXG4gICAgICB0aXRsZTogKCkgPT4gICdNZXRyaWNzJyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdWaWV3cyBtZXRyaWNzIGFjcm9zcyBhbGwgY29udGFpbmVycyB1c2luZyBHcmFmYW5hIGFuZCBJbmZsdXhEQicsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShncmFmYW5hU2VydmljZU5hbWUpLFxuICAgICAgaHJlZjogKCkgPT4gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKGdyYWZhbmFTZXJ2aWNlTmFtZSksXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6IFwiY2hhdFwiLFxuICAgICAgdGl0bGU6ICgpID0+ICAnQ2hhdCcsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnQ2hhdCByb29tIGZvciBkaXNjdXNzaW5nIHRoaXMgbmFtZXNwYWNlJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGNoYXRTZXJ2aWNlTmFtZSksXG4gICAgICBocmVmOiAoKSA9PiB7XG4gICAgICAgIHZhciBhbnN3ZXIgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsoY2hhdFNlcnZpY2VOYW1lKTtcbiAgICAgICAgaWYgKGFuc3dlcikge1xuLypcbiAgICAgICAgICBUT0RPIGFkZCBhIGN1c3RvbSBsaW5rIHRvIHRoZSBjb3JyZWN0IHJvb20gZm9yIHRoZSBjdXJyZW50IG5hbWVzcGFjZT9cblxuICAgICAgICAgIHZhciBpcmNIb3N0ID0gXCJcIjtcbiAgICAgICAgICB2YXIgaXJjU2VydmljZSA9IFNlcnZpY2VSZWdpc3RyeS5maW5kU2VydmljZShcImh1Ym90XCIpO1xuICAgICAgICAgIGlmIChpcmNTZXJ2aWNlKSB7XG4gICAgICAgICAgICBpcmNIb3N0ID0gaXJjU2VydmljZS5wb3J0YWxJUDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlyY0hvc3QpIHtcbiAgICAgICAgICAgIHZhciBuaWNrID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl0gfHwgbG9jYWxTdG9yYWdlW1wiaXJjTmlja1wiXSB8fCBcIm15bmFtZVwiO1xuICAgICAgICAgICAgdmFyIHJvb20gPSBcIiNmYWJyaWM4LVwiICsgIGN1cnJlbnRLdWJlcm5ldGVzTmFtZXNwYWNlKCk7XG4gICAgICAgICAgICBhbnN3ZXIgPSBVcmxIZWxwZXJzLmpvaW4oYW5zd2VyLCBcIi9raXdpXCIsIGlyY0hvc3QsIFwiPyZuaWNrPVwiICsgbmljayArIHJvb20pO1xuICAgICAgICAgIH1cbiovXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgIH0sXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIC8vIFRPRE8gd2Ugc2hvdWxkIG1vdmUgdGhpcyB0byBhIG5pY2VyIGxpbmsgaW5zaWRlIHRoZSBMaWJyYXJ5IHNvb24gLSBhbHNvIGxldHMgaGlkZSB1bnRpbCBpdCB3b3Jrcy4uLlxuLypcbiAgICB3b3Jrc3BhY2UudG9wTGV2ZWxUYWJzLnB1c2goe1xuICAgICAgaWQ6ICdjcmVhdGVQcm9qZWN0JyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0NyZWF0ZScsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnQ3JlYXRlcyBhIG5ldyBwcm9qZWN0JyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKFwiYXBwLWxpYnJhcnlcIikgJiYgZmFsc2UsXG4gICAgICBocmVmOiAoKSA9PiBcIi9wcm9qZWN0L2NyZWF0ZVwiXG4gICAgfSk7XG4qL1xuXG4gICAgcHJlZmVyZW5jZXNSZWdpc3RyeS5hZGRUYWIoJ0Fib3V0ICcgKyB2ZXJzaW9uLm5hbWUsIFVybEhlbHBlcnMuam9pbih0ZW1wbGF0ZVBhdGgsICdhYm91dC5odG1sJykpO1xuXG4gICAgbG9nLmluZm8oXCJzdGFydGVkLCB2ZXJzaW9uOiBcIiwgdmVyc2lvbi52ZXJzaW9uKTtcbiAgICBsb2cuaW5mbyhcImNvbW1pdCBJRDogXCIsIHZlcnNpb24uY29tbWl0SWQpO1xuICB9KTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIucmVnaXN0ZXJQcmVCb290c3RyYXBUYXNrKChuZXh0KSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgIHVybDogJ3ZlcnNpb24uanNvbj9yZXY9JyArIERhdGUubm93KCksIFxuICAgICAgc3VjY2VzczogKGRhdGEpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2ZXJzaW9uID0gYW5ndWxhci5mcm9tSnNvbihkYXRhKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgdmVyc2lvbiA9IHtcbiAgICAgICAgICAgIG5hbWU6ICdmYWJyaWM4LWNvbnNvbGUnLFxuICAgICAgICAgICAgdmVyc2lvbjogJydcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0sXG4gICAgICBlcnJvcjogKGpxWEhSLCB0ZXh0LCBzdGF0dXMpID0+IHtcbiAgICAgICAgbG9nLmRlYnVnKFwiRmFpbGVkIHRvIGZldGNoIHZlcnNpb246IGpxWEhSOiBcIiwganFYSFIsIFwiIHRleHQ6IFwiLCB0ZXh0LCBcIiBzdGF0dXM6IFwiLCBzdGF0dXMpO1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9LFxuICAgICAgZGF0YVR5cGU6IFwiaHRtbFwiXG4gICAgfSk7XG4gIH0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5hZGRNb2R1bGUocGx1Z2luTmFtZSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwibWFpbkdsb2JhbHMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWFpblBsdWdpbi50c1wiLz5cblxubW9kdWxlIE1haW4ge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoJ01haW4uQWJvdXQnLCAoJHNjb3BlKSA9PiB7XG4gICAgJHNjb3BlLmluZm8gPSB2ZXJzaW9uO1xuICB9KTtcbn1cblxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuXG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgdmFyIGxvZzpMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQoXCJXaWtpXCIpO1xuXG4gIGV4cG9ydCB2YXIgY2FtZWxOYW1lc3BhY2VzID0gW1wiaHR0cDovL2NhbWVsLmFwYWNoZS5vcmcvc2NoZW1hL3NwcmluZ1wiLCBcImh0dHA6Ly9jYW1lbC5hcGFjaGUub3JnL3NjaGVtYS9ibHVlcHJpbnRcIl07XG4gIGV4cG9ydCB2YXIgc3ByaW5nTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly93d3cuc3ByaW5nZnJhbWV3b3JrLm9yZy9zY2hlbWEvYmVhbnNcIl07XG4gIGV4cG9ydCB2YXIgZHJvb2xzTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9kcm9vbHMub3JnL3NjaGVtYS9kcm9vbHMtc3ByaW5nXCJdO1xuICBleHBvcnQgdmFyIGRvemVyTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9kb3plci5zb3VyY2Vmb3JnZS5uZXRcIl07XG4gIGV4cG9ydCB2YXIgYWN0aXZlbXFOYW1lc3BhY2VzID0gW1wiaHR0cDovL2FjdGl2ZW1xLmFwYWNoZS5vcmcvc2NoZW1hL2NvcmVcIl07XG5cbiAgZXhwb3J0IHZhciB1c2VDYW1lbENhbnZhc0J5RGVmYXVsdCA9IGZhbHNlO1xuXG4gIGV4cG9ydCB2YXIgZXhjbHVkZUFkanVzdG1lbnRQcmVmaXhlcyA9IFtcImh0dHA6Ly9cIiwgXCJodHRwczovL1wiLCBcIiNcIl07XG5cbiAgZXhwb3J0IGVudW0gVmlld01vZGUgeyBMaXN0LCBJY29uIH07XG5cbiAgLyoqXG4gICAqIFRoZSBjdXN0b20gdmlld3Mgd2l0aGluIHRoZSB3aWtpIG5hbWVzcGFjZTsgZWl0aGVyIFwiL3dpa2kvJGZvb1wiIG9yIFwiL3dpa2kvYnJhbmNoLyRicmFuY2gvJGZvb1wiXG4gICAqL1xuICBleHBvcnQgdmFyIGN1c3RvbVdpa2lWaWV3UGFnZXMgPSBbXCIvZm9ybVRhYmxlXCIsIFwiL2NhbWVsL2RpYWdyYW1cIiwgXCIvY2FtZWwvY2FudmFzXCIsIFwiL2NhbWVsL3Byb3BlcnRpZXNcIiwgXCIvZG96ZXIvbWFwcGluZ3NcIl07XG5cbiAgLyoqXG4gICAqIFdoaWNoIGV4dGVuc2lvbnMgZG8gd2Ugd2lzaCB0byBoaWRlIGluIHRoZSB3aWtpIGZpbGUgbGlzdGluZ1xuICAgKiBAcHJvcGVydHkgaGlkZUV4dGVuc2lvbnNcbiAgICogQGZvciBXaWtpXG4gICAqIEB0eXBlIEFycmF5XG4gICAqL1xuICBleHBvcnQgdmFyIGhpZGVFeHRlbnNpb25zID0gW1wiLnByb2ZpbGVcIl07XG5cbiAgdmFyIGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4gPSAvXlthLXpBLVowLTkuXy1dKiQvO1xuICB2YXIgZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQgPSBcIk5hbWUgbXVzdCBiZTogbGV0dGVycywgbnVtYmVycywgYW5kIC4gXyBvciAtIGNoYXJhY3RlcnNcIjtcblxuICB2YXIgZGVmYXVsdEZpbGVOYW1lRXh0ZW5zaW9uUGF0dGVybiA9IFwiXCI7XG5cbiAgdmFyIGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm4gPSAvXlthLXowLTkuXy1dKiQvO1xuICB2YXIgZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybkludmFsaWQgPSBcIk5hbWUgbXVzdCBiZTogbG93ZXItY2FzZSBsZXR0ZXJzLCBudW1iZXJzLCBhbmQgLiBfIG9yIC0gY2hhcmFjdGVyc1wiO1xuXG4gIGV4cG9ydCBpbnRlcmZhY2UgR2VuZXJhdGVPcHRpb25zIHtcbiAgICB3b3Jrc3BhY2U6IGFueTtcbiAgICBmb3JtOiBhbnk7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGJyYW5jaDogc3RyaW5nO1xuICAgIHBhcmVudElkOiBzdHJpbmc7XG4gICAgc3VjY2VzczogKGZpbGVDb250ZW50cz86c3RyaW5nKSA9PiB2b2lkO1xuICAgIGVycm9yOiAoZXJyb3I6YW55KSA9PiB2b2lkO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSB3aXphcmQgdHJlZSBmb3IgY3JlYXRpbmcgbmV3IGNvbnRlbnQgaW4gdGhlIHdpa2lcbiAgICogQHByb3BlcnR5IGRvY3VtZW50VGVtcGxhdGVzXG4gICAqIEBmb3IgV2lraVxuICAgKiBAdHlwZSBBcnJheVxuICAgKi9cbiAgZXhwb3J0IHZhciBkb2N1bWVudFRlbXBsYXRlcyA9IFtcbiAgICB7XG4gICAgICBsYWJlbDogXCJGb2xkZXJcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlIGEgbmV3IGZvbGRlciB0byBjb250YWluIGRvY3VtZW50c1wiLFxuICAgICAgZm9sZGVyOiB0cnVlLFxuICAgICAgaWNvbjogXCIvaW1nL2ljb25zL3dpa2kvZm9sZGVyLmdpZlwiLFxuICAgICAgZXhlbXBsYXI6IFwibXlmb2xkZXJcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybkludmFsaWRcbiAgICB9LFxuICAgIC8qXG4gICAge1xuICAgICAgbGFiZWw6IFwiQXBwXCIsXG4gICAgICB0b29sdGlwOiBcIkNyZWF0ZXMgYSBuZXcgQXBwIGZvbGRlciB1c2VkIHRvIGNvbmZpZ3VyZSBhbmQgcnVuIGNvbnRhaW5lcnNcIixcbiAgICAgIGFkZENsYXNzOiBcImZhIGZhLWNvZyBncmVlblwiLFxuICAgICAgZXhlbXBsYXI6ICdteWFwcCcsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiAnJyxcbiAgICAgIGdlbmVyYXRlZDoge1xuICAgICAgICBtYmVhbjogWydpby5mYWJyaWM4JywgeyB0eXBlOiAnS3ViZXJuZXRlc1RlbXBsYXRlTWFuYWdlcicgfV0sXG4gICAgICAgIGluaXQ6ICh3b3Jrc3BhY2UsICRzY29wZSkgPT4ge1xuXG4gICAgICAgIH0sXG4gICAgICAgIGdlbmVyYXRlOiAob3B0aW9uczpHZW5lcmF0ZU9wdGlvbnMpID0+IHtcbiAgICAgICAgICBsb2cuZGVidWcoXCJHb3Qgb3B0aW9uczogXCIsIG9wdGlvbnMpO1xuICAgICAgICAgIG9wdGlvbnMuZm9ybS5uYW1lID0gb3B0aW9ucy5uYW1lO1xuICAgICAgICAgIG9wdGlvbnMuZm9ybS5wYXRoID0gb3B0aW9ucy5wYXJlbnRJZDtcbiAgICAgICAgICBvcHRpb25zLmZvcm0uYnJhbmNoID0gb3B0aW9ucy5icmFuY2g7XG4gICAgICAgICAgdmFyIGpzb24gPSBhbmd1bGFyLnRvSnNvbihvcHRpb25zLmZvcm0pO1xuICAgICAgICAgIHZhciBqb2xva2lhID0gPEpvbG9raWEuSUpvbG9raWE+IEhhd3Rpb0NvcmUuaW5qZWN0b3IuZ2V0KFwiam9sb2tpYVwiKTtcbiAgICAgICAgICBqb2xva2lhLnJlcXVlc3Qoe1xuICAgICAgICAgICAgdHlwZTogJ2V4ZWMnLFxuICAgICAgICAgICAgbWJlYW46ICdpby5mYWJyaWM4OnR5cGU9S3ViZXJuZXRlc1RlbXBsYXRlTWFuYWdlcicsXG4gICAgICAgICAgICBvcGVyYXRpb246ICdjcmVhdGVBcHBCeUpzb24nLFxuICAgICAgICAgICAgYXJndW1lbnRzOiBbanNvbl1cbiAgICAgICAgICB9LCBDb3JlLm9uU3VjY2VzcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIkdlbmVyYXRlZCBhcHAsIHJlc3BvbnNlOiBcIiwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKHVuZGVmaW5lZCk7IFxuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgIGVycm9yOiAocmVzcG9uc2UpID0+IHsgb3B0aW9ucy5lcnJvcihyZXNwb25zZS5lcnJvcik7IH1cbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZvcm06ICh3b3Jrc3BhY2UsICRzY29wZSkgPT4ge1xuICAgICAgICAgIC8vIFRPRE8gZG9ja2VyIHJlZ2lzdHJ5IGNvbXBsZXRpb25cbiAgICAgICAgICBpZiAoISRzY29wZS5kb0RvY2tlclJlZ2lzdHJ5Q29tcGxldGlvbikge1xuICAgICAgICAgICAgJHNjb3BlLmZldGNoRG9ja2VyUmVwb3NpdG9yaWVzID0gKCkgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gRG9ja2VyUmVnaXN0cnkuY29tcGxldGVEb2NrZXJSZWdpc3RyeSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VtbWFyeU1hcmtkb3duOiAnQWRkIGFwcCBzdW1tYXJ5IGhlcmUnLFxuICAgICAgICAgICAgcmVwbGljYUNvdW50OiAxXG4gICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgc2NoZW1hOiB7XG4gICAgICAgICAgZGVzY3JpcHRpb246ICdBcHAgc2V0dGluZ3MnLFxuICAgICAgICAgIHR5cGU6ICdqYXZhLmxhbmcuU3RyaW5nJyxcbiAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAnZG9ja2VySW1hZ2UnOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdEb2NrZXIgSW1hZ2UnLFxuICAgICAgICAgICAgICAndHlwZSc6ICdqYXZhLmxhbmcuU3RyaW5nJyxcbiAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7IFxuICAgICAgICAgICAgICAgICdyZXF1aXJlZCc6ICcnLCBcbiAgICAgICAgICAgICAgICAnY2xhc3MnOiAnaW5wdXQteGxhcmdlJyxcbiAgICAgICAgICAgICAgICAndHlwZWFoZWFkJzogJ3JlcG8gZm9yIHJlcG8gaW4gZmV0Y2hEb2NrZXJSZXBvc2l0b3JpZXMoKSB8IGZpbHRlcjokdmlld1ZhbHVlJyxcbiAgICAgICAgICAgICAgICAndHlwZWFoZWFkLXdhaXQtbXMnOiAnMjAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3N1bW1hcnlNYXJrZG93bic6IHtcbiAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogJ1Nob3J0IERlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnamF2YS5sYW5nLlN0cmluZycsXG4gICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyAnY2xhc3MnOiAnaW5wdXQteGxhcmdlJyB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3JlcGxpY2FDb3VudCc6IHtcbiAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogJ1JlcGxpY2EgQ291bnQnLFxuICAgICAgICAgICAgICAndHlwZSc6ICdqYXZhLmxhbmcuSW50ZWdlcicsXG4gICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzoge1xuICAgICAgICAgICAgICAgIG1pbjogJzAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbGFiZWxzJzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnTGFiZWxzJyxcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnbWFwJyxcbiAgICAgICAgICAgICAgJ2l0ZW1zJzoge1xuICAgICAgICAgICAgICAgICd0eXBlJzogJ3N0cmluZydcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiRmFicmljOCBQcm9maWxlXCIsXG4gICAgICB0b29sdGlwOiBcIkNyZWF0ZSBhIG5ldyBlbXB0eSBmYWJyaWMgcHJvZmlsZS4gVXNpbmcgYSBoeXBoZW4gKCctJykgd2lsbCBjcmVhdGUgYSBmb2xkZXIgaGVpcmFyY2h5LCBmb3IgZXhhbXBsZSAnbXktYXdlc29tZS1wcm9maWxlJyB3aWxsIGJlIGF2YWlsYWJsZSB2aWEgdGhlIHBhdGggJ215L2F3ZXNvbWUvcHJvZmlsZScuXCIsXG4gICAgICBwcm9maWxlOiB0cnVlLFxuICAgICAgYWRkQ2xhc3M6IFwiZmEgZmEtYm9vayBncmVlblwiLFxuICAgICAgZXhlbXBsYXI6IFwidXNlci1wcm9maWxlXCIsXG4gICAgICByZWdleDogZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZmFicmljT25seTogdHJ1ZVxuICAgIH0sXG4gICAgKi9cbiAgICB7XG4gICAgICBsYWJlbDogXCJQcm9wZXJ0aWVzIEZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBwcm9wZXJ0aWVzIGZpbGUgdHlwaWNhbGx5IHVzZWQgdG8gY29uZmlndXJlIEphdmEgY2xhc3Nlc1wiLFxuICAgICAgZXhlbXBsYXI6IFwicHJvcGVydGllcy1maWxlLnByb3BlcnRpZXNcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLnByb3BlcnRpZXNcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiSlNPTiBGaWxlXCIsXG4gICAgICB0b29sdGlwOiBcIkEgZmlsZSBjb250YWluaW5nIEpTT04gZGF0YVwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG9jdW1lbnQuanNvblwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIuanNvblwiXG4gICAgfSxcbiAgICAvKlxuICAgIHtcbiAgICAgIGxhYmVsOiBcIktleSBTdG9yZSBGaWxlXCIsXG4gICAgICB0b29sdGlwOiBcIkNyZWF0ZXMgYSBrZXlzdG9yZSAoZGF0YWJhc2UpIG9mIGNyeXB0b2dyYXBoaWMga2V5cywgWC41MDkgY2VydGlmaWNhdGUgY2hhaW5zLCBhbmQgdHJ1c3RlZCBjZXJ0aWZpY2F0ZXMuXCIsXG4gICAgICBleGVtcGxhcjogJ2tleXN0b3JlLmprcycsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5qa3NcIixcbiAgICAgIGdlbmVyYXRlZDoge1xuICAgICAgICBtYmVhbjogWydoYXd0aW8nLCB7IHR5cGU6ICdLZXlzdG9yZVNlcnZpY2UnIH1dLFxuICAgICAgICBpbml0OiBmdW5jdGlvbih3b3Jrc3BhY2UsICRzY29wZSkge1xuICAgICAgICAgIHZhciBtYmVhbiA9ICdoYXd0aW86dHlwZT1LZXlzdG9yZVNlcnZpY2UnO1xuICAgICAgICAgIHZhciByZXNwb25zZSA9IHdvcmtzcGFjZS5qb2xva2lhLnJlcXVlc3QoIHt0eXBlOiBcInJlYWRcIiwgbWJlYW46IG1iZWFuLCBhdHRyaWJ1dGU6IFwiU2VjdXJpdHlQcm92aWRlckluZm9cIiB9LCB7XG4gICAgICAgICAgICBzdWNjZXNzOiAocmVzcG9uc2UpPT57XG4gICAgICAgICAgICAgICRzY29wZS5zZWN1cml0eVByb3ZpZGVySW5mbyA9IHJlc3BvbnNlLnZhbHVlO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0NvdWxkIG5vdCBmaW5kIHRoZSBzdXBwb3J0ZWQgc2VjdXJpdHkgYWxnb3JpdGhtczogJywgcmVzcG9uc2UuZXJyb3IpO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBnZW5lcmF0ZTogZnVuY3Rpb24ob3B0aW9uczpHZW5lcmF0ZU9wdGlvbnMpIHtcbiAgICAgICAgICB2YXIgZW5jb2RlZEZvcm0gPSBKU09OLnN0cmluZ2lmeShvcHRpb25zLmZvcm0pXG4gICAgICAgICAgdmFyIG1iZWFuID0gJ2hhd3Rpbzp0eXBlPUtleXN0b3JlU2VydmljZSc7XG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0gb3B0aW9ucy53b3Jrc3BhY2Uuam9sb2tpYS5yZXF1ZXN0KCB7XG4gICAgICAgICAgICAgIHR5cGU6ICdleGVjJywgXG4gICAgICAgICAgICAgIG1iZWFuOiBtYmVhbixcbiAgICAgICAgICAgICAgb3BlcmF0aW9uOiAnY3JlYXRlS2V5U3RvcmVWaWFKU09OKGphdmEubGFuZy5TdHJpbmcpJyxcbiAgICAgICAgICAgICAgYXJndW1lbnRzOiBbZW5jb2RlZEZvcm1dXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgIG1ldGhvZDonUE9TVCcsXG4gICAgICAgICAgICAgIHN1Y2Nlc3M6ZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnN1Y2Nlc3MocmVzcG9uc2UudmFsdWUpXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGVycm9yOmZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmVycm9yKHJlc3BvbnNlLmVycm9yKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZm9ybTogZnVuY3Rpb24od29ya3NwYWNlLCAkc2NvcGUpeyBcbiAgICAgICAgICByZXR1cm4geyBcbiAgICAgICAgICAgIHN0b3JlVHlwZTogJHNjb3BlLnNlY3VyaXR5UHJvdmlkZXJJbmZvLnN1cHBvcnRlZEtleVN0b3JlVHlwZXNbMF0sXG4gICAgICAgICAgICBjcmVhdGVQcml2YXRlS2V5OiBmYWxzZSxcbiAgICAgICAgICAgIGtleUxlbmd0aDogNDA5NixcbiAgICAgICAgICAgIGtleUFsZ29yaXRobTogJHNjb3BlLnNlY3VyaXR5UHJvdmlkZXJJbmZvLnN1cHBvcnRlZEtleUFsZ29yaXRobXNbMF0sXG4gICAgICAgICAgICBrZXlWYWxpZGl0eTogMzY1XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzY2hlbWE6IHtcbiAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIktleXN0b3JlIFNldHRpbmdzXCIsXG4gICAgICAgICAgIFwidHlwZVwiOiBcImphdmEubGFuZy5TdHJpbmdcIixcbiAgICAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHsgXG4gICAgICAgICAgICAgXCJzdG9yZVBhc3N3b3JkXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJLZXlzdG9yZSBwYXNzd29yZC5cIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInBhc3N3b3JkXCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgXCJyZXF1aXJlZFwiOiAgXCJcIiwgIFwibmctbWlubGVuZ3RoXCI6NiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcInN0b3JlVHlwZVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHR5cGUgb2Ygc3RvcmUgdG8gY3JlYXRlXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtZWxlbWVudCc6IFwic2VsZWN0XCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgXCJuZy1vcHRpb25zXCI6ICBcInYgZm9yIHYgaW4gc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5U3RvcmVUeXBlc1wiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwiY3JlYXRlUHJpdmF0ZUtleVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2hvdWxkIHdlIGdlbmVyYXRlIGEgc2VsZi1zaWduZWQgcHJpdmF0ZSBrZXk/XCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5Q29tbW9uTmFtZVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbW1vbiBuYW1lIG9mIHRoZSBrZXksIHR5cGljYWxseSBzZXQgdG8gdGhlIGhvc3RuYW1lIG9mIHRoZSBzZXJ2ZXJcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImphdmEubGFuZy5TdHJpbmdcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlMZW5ndGhcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBsZW5ndGggb2YgdGhlIGNyeXB0b2dyYXBoaWMga2V5XCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJMb25nXCIsXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5QWxnb3JpdGhtXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUga2V5IGFsZ29yaXRobVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWVsZW1lbnQnOiBcInNlbGVjdFwiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7IFwibmctb3B0aW9uc1wiOiAgXCJ2IGZvciB2IGluIHNlY3VyaXR5UHJvdmlkZXJJbmZvLnN1cHBvcnRlZEtleUFsZ29yaXRobXNcIiB9LFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleVZhbGlkaXR5XCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbnVtYmVyIG9mIGRheXMgdGhlIGtleSB3aWxsIGJlIHZhbGlkIGZvclwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiTG9uZ1wiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleVBhc3N3b3JkXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJQYXNzd29yZCB0byB0aGUgcHJpdmF0ZSBrZXlcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInBhc3N3b3JkXCIsXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9XG4gICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgKi9cbiAgICB7XG4gICAgICBsYWJlbDogXCJNYXJrZG93biBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJBIGJhc2ljIG1hcmt1cCBkb2N1bWVudCB1c2luZyB0aGUgTWFya2Rvd24gd2lraSBtYXJrdXAsIHBhcnRpY3VsYXJseSB1c2VmdWwgZm9yIFJlYWRNZSBmaWxlcyBpbiBkaXJlY3Rvcmllc1wiLFxuICAgICAgZXhlbXBsYXI6IFwiUmVhZE1lLm1kXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5tZFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJUZXh0IERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkEgcGxhaW4gdGV4dCBmaWxlXCIsXG4gICAgICBleGVtcGxhcjogXCJkb2N1bWVudC50ZXh0XCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi50eHRcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiSFRNTCBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJBIEhUTUwgZG9jdW1lbnQgeW91IGNhbiBlZGl0IGRpcmVjdGx5IHVzaW5nIHRoZSBIVE1MIG1hcmt1cFwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG9jdW1lbnQuaHRtbFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIuaHRtbFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJYTUwgRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQW4gZW1wdHkgWE1MIGRvY3VtZW50XCIsXG4gICAgICBleGVtcGxhcjogXCJkb2N1bWVudC54bWxcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJJbnRlZ3JhdGlvbiBGbG93c1wiLFxuICAgICAgdG9vbHRpcDogXCJDYW1lbCByb3V0ZXMgZm9yIGRlZmluaW5nIHlvdXIgaW50ZWdyYXRpb24gZmxvd3NcIixcbiAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogXCJDYW1lbCBYTUwgZG9jdW1lbnRcIixcbiAgICAgICAgICB0b29sdGlwOiBcIkEgdmFuaWxsYSBDYW1lbCBYTUwgZG9jdW1lbnQgZm9yIGludGVncmF0aW9uIGZsb3dzXCIsXG4gICAgICAgICAgaWNvbjogXCIvaW1nL2ljb25zL2NhbWVsLnN2Z1wiLFxuICAgICAgICAgIGV4ZW1wbGFyOiBcImNhbWVsLnhtbFwiLFxuICAgICAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiBcIkNhbWVsIE9TR2kgQmx1ZXByaW50IFhNTCBkb2N1bWVudFwiLFxuICAgICAgICAgIHRvb2x0aXA6IFwiQSB2YW5pbGxhIENhbWVsIFhNTCBkb2N1bWVudCBmb3IgaW50ZWdyYXRpb24gZmxvd3Mgd2hlbiB1c2luZyBPU0dpIEJsdWVwcmludFwiLFxuICAgICAgICAgIGljb246IFwiL2ltZy9pY29ucy9jYW1lbC5zdmdcIixcbiAgICAgICAgICBleGVtcGxhcjogXCJjYW1lbC1ibHVlcHJpbnQueG1sXCIsXG4gICAgICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IFwiQ2FtZWwgU3ByaW5nIFhNTCBkb2N1bWVudFwiLFxuICAgICAgICAgIHRvb2x0aXA6IFwiQSB2YW5pbGxhIENhbWVsIFhNTCBkb2N1bWVudCBmb3IgaW50ZWdyYXRpb24gZmxvd3Mgd2hlbiB1c2luZyB0aGUgU3ByaW5nIGZyYW1ld29ya1wiLFxuICAgICAgICAgIGljb246IFwiL2ltZy9pY29ucy9jYW1lbC5zdmdcIixcbiAgICAgICAgICBleGVtcGxhcjogXCJjYW1lbC1zcHJpbmcueG1sXCIsXG4gICAgICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJEYXRhIE1hcHBpbmcgRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiRG96ZXIgYmFzZWQgY29uZmlndXJhdGlvbiBvZiBtYXBwaW5nIGRvY3VtZW50c1wiLFxuICAgICAgaWNvbjogXCIvaW1nL2ljb25zL2RvemVyL2RvemVyLmdpZlwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG96ZXItbWFwcGluZy54bWxcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgfVxuICBdO1xuXG4gIC8vIFRPRE8gUkVNT1ZFXG4gIGV4cG9ydCBmdW5jdGlvbiBpc0ZNQ0NvbnRhaW5lcih3b3Jrc3BhY2UpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBUT0RPIFJFTU9WRVxuICBleHBvcnQgZnVuY3Rpb24gaXNXaWtpRW5hYmxlZCh3b3Jrc3BhY2UsIGpvbG9raWEsIGxvY2FsU3RvcmFnZSkge1xuICAgIHJldHVybiB0cnVlO1xuLypcbiAgICByZXR1cm4gR2l0LmNyZWF0ZUdpdFJlcG9zaXRvcnkod29ya3NwYWNlLCBqb2xva2lhLCBsb2NhbFN0b3JhZ2UpICE9PSBudWxsO1xuKi9cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnb1RvTGluayhsaW5rLCAkdGltZW91dCwgJGxvY2F0aW9uKSB7XG4gICAgdmFyIGhyZWYgPSBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiI1wiKTtcbiAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICBsb2cuZGVidWcoXCJBYm91dCB0byBuYXZpZ2F0ZSB0bzogXCIgKyBocmVmKTtcbiAgICAgICRsb2NhdGlvbi51cmwoaHJlZik7XG4gICAgfSwgMTAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFsbCB0aGUgbGlua3MgZm9yIHRoZSBnaXZlbiBicmFuY2ggZm9yIHRoZSBjdXN0b20gdmlld3MsIHN0YXJ0aW5nIHdpdGggXCIvXCJcbiAgICogQHBhcmFtICRzY29wZVxuICAgKiBAcmV0dXJucyB7c3RyaW5nW119XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gY3VzdG9tVmlld0xpbmtzKCRzY29wZSkge1xuICAgIHZhciBwcmVmaXggPSBDb3JlLnRyaW1MZWFkaW5nKFdpa2kuc3RhcnRMaW5rKCRzY29wZSksIFwiI1wiKTtcbiAgICByZXR1cm4gY3VzdG9tV2lraVZpZXdQYWdlcy5tYXAocGF0aCA9PiBwcmVmaXggKyBwYXRoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgbmV3IGNyZWF0ZSBkb2N1bWVudCB3aXphcmQgdHJlZVxuICAgKiBAbWV0aG9kIGNyZWF0ZVdpemFyZFRyZWVcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVXaXphcmRUcmVlKHdvcmtzcGFjZSwgJHNjb3BlKSB7XG4gICAgdmFyIHJvb3QgPSBjcmVhdGVGb2xkZXIoXCJOZXcgRG9jdW1lbnRzXCIpO1xuICAgIGFkZENyZWF0ZVdpemFyZEZvbGRlcnMod29ya3NwYWNlLCAkc2NvcGUsIHJvb3QsIGRvY3VtZW50VGVtcGxhdGVzKTtcbiAgICByZXR1cm4gcm9vdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUZvbGRlcihuYW1lKTogYW55IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogbmFtZSxcbiAgICAgIGNoaWxkcmVuOiBbXVxuICAgIH07XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gYWRkQ3JlYXRlV2l6YXJkRm9sZGVycyh3b3Jrc3BhY2UsICRzY29wZSwgcGFyZW50LCB0ZW1wbGF0ZXM6IGFueVtdKSB7XG4gICAgYW5ndWxhci5mb3JFYWNoKHRlbXBsYXRlcywgKHRlbXBsYXRlKSA9PiB7XG5cbiAgICAgIGlmICggdGVtcGxhdGUuZ2VuZXJhdGVkICkge1xuICAgICAgICBpZiAoIHRlbXBsYXRlLmdlbmVyYXRlZC5pbml0ICkge1xuICAgICAgICAgIHRlbXBsYXRlLmdlbmVyYXRlZC5pbml0KHdvcmtzcGFjZSwgJHNjb3BlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgdGl0bGUgPSB0ZW1wbGF0ZS5sYWJlbCB8fCBrZXk7XG4gICAgICB2YXIgbm9kZSA9IGNyZWF0ZUZvbGRlcih0aXRsZSk7XG4gICAgICBub2RlLnBhcmVudCA9IHBhcmVudDtcbiAgICAgIG5vZGUuZW50aXR5ID0gdGVtcGxhdGU7XG5cbiAgICAgIHZhciBhZGRDbGFzcyA9IHRlbXBsYXRlLmFkZENsYXNzO1xuICAgICAgaWYgKGFkZENsYXNzKSB7XG4gICAgICAgIG5vZGUuYWRkQ2xhc3MgPSBhZGRDbGFzcztcbiAgICAgIH1cblxuICAgICAgdmFyIGtleSA9IHRlbXBsYXRlLmV4ZW1wbGFyO1xuICAgICAgdmFyIHBhcmVudEtleSA9IHBhcmVudC5rZXkgfHwgXCJcIjtcbiAgICAgIG5vZGUua2V5ID0gcGFyZW50S2V5ID8gcGFyZW50S2V5ICsgXCJfXCIgKyBrZXkgOiBrZXk7XG4gICAgICB2YXIgaWNvbiA9IHRlbXBsYXRlLmljb247XG4gICAgICBpZiAoaWNvbikge1xuICAgICAgICBub2RlLmljb24gPSBDb3JlLnVybChpY29uKTtcbiAgICAgIH1cbiAgICAgIC8vIGNvbXBpbGVyIHdhcyBjb21wbGFpbmluZyBhYm91dCAnbGFiZWwnIGhhZCBubyBpZGVhIHdoZXJlIGl0J3MgY29taW5nIGZyb21cbiAgICAgIC8vIHZhciB0b29sdGlwID0gdmFsdWVbXCJ0b29sdGlwXCJdIHx8IHZhbHVlW1wiZGVzY3JpcHRpb25cIl0gfHwgbGFiZWw7XG4gICAgICB2YXIgdG9vbHRpcCA9IHRlbXBsYXRlW1widG9vbHRpcFwiXSB8fCB0ZW1wbGF0ZVtcImRlc2NyaXB0aW9uXCJdIHx8ICcnO1xuICAgICAgbm9kZS50b29sdGlwID0gdG9vbHRpcDtcbiAgICAgIGlmICh0ZW1wbGF0ZVtcImZvbGRlclwiXSkge1xuICAgICAgICBub2RlLmlzRm9sZGVyID0gKCkgPT4geyByZXR1cm4gdHJ1ZTsgfTtcbiAgICAgIH1cbiAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKG5vZGUpO1xuXG4gICAgICB2YXIgY2hpbGRyZW4gPSB0ZW1wbGF0ZS5jaGlsZHJlbjtcbiAgICAgIGlmIChjaGlsZHJlbikge1xuICAgICAgICBhZGRDcmVhdGVXaXphcmRGb2xkZXJzKHdvcmtzcGFjZSwgJHNjb3BlLCBub2RlLCBjaGlsZHJlbik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gc3RhcnRXaWtpTGluayhwcm9qZWN0SWQsIGJyYW5jaCkge1xuICAgIHZhciBzdGFydCA9IFVybEhlbHBlcnMuam9pbihEZXZlbG9wZXIucHJvamVjdExpbmsocHJvamVjdElkKSwgXCIvd2lraVwiKTtcbiAgICBpZiAoYnJhbmNoKSB7XG4gICAgICBzdGFydCA9IFVybEhlbHBlcnMuam9pbihzdGFydCwgJ2JyYW5jaCcsIGJyYW5jaCk7XG4gICAgfVxuICAgIHJldHVybiBzdGFydDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzdGFydExpbmsoJHNjb3BlKSB7XG4gICAgdmFyIHByb2plY3RJZCA9ICRzY29wZS5wcm9qZWN0SWQ7XG4gICAgdmFyIGJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgcmV0dXJuIHN0YXJ0V2lraUxpbmsocHJvamVjdElkLCBicmFuY2gpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gZmlsZW5hbWUvcGF0aCBpcyBhbiBpbmRleCBwYWdlIChuYW1lZCBpbmRleC4qIGFuZCBpcyBhIG1hcmtkb3duL2h0bWwgcGFnZSkuXG4gICAqXG4gICAqIEBwYXJhbSBwYXRoXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGlzSW5kZXhQYWdlKHBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiBwYXRoICYmIChwYXRoLmVuZHNXaXRoKFwiaW5kZXgubWRcIikgfHwgcGF0aC5lbmRzV2l0aChcImluZGV4Lmh0bWxcIikgfHwgcGF0aC5lbmRzV2l0aChcImluZGV4XCIpKSA/IHRydWUgOiBmYWxzZTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB2aWV3TGluaygkc2NvcGUsIHBhZ2VJZDpzdHJpbmcsICRsb2NhdGlvbiwgZmlsZU5hbWU6c3RyaW5nID0gbnVsbCkge1xuICAgIHZhciBsaW5rOnN0cmluZyA9IG51bGw7XG4gICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgaWYgKHBhZ2VJZCkge1xuICAgICAgLy8gZmlndXJlIG91dCB3aGljaCB2aWV3IHRvIHVzZSBmb3IgdGhpcyBwYWdlXG4gICAgICB2YXIgdmlldyA9IGlzSW5kZXhQYWdlKHBhZ2VJZCkgPyBcIi9ib29rL1wiIDogXCIvdmlldy9cIjtcbiAgICAgIGxpbmsgPSBzdGFydCArIHZpZXcgKyBlbmNvZGVQYXRoKENvcmUudHJpbUxlYWRpbmcocGFnZUlkLCBcIi9cIikpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBsZXRzIHVzZSB0aGUgY3VycmVudCBwYXRoXG4gICAgICB2YXIgcGF0aDpzdHJpbmcgPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgbGluayA9IFwiI1wiICsgcGF0aC5yZXBsYWNlKC8oZWRpdHxjcmVhdGUpLywgXCJ2aWV3XCIpO1xuICAgIH1cbiAgICBpZiAoZmlsZU5hbWUgJiYgcGFnZUlkICYmIHBhZ2VJZC5lbmRzV2l0aChmaWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiBsaW5rO1xuICAgIH1cbiAgICBpZiAoZmlsZU5hbWUpIHtcbiAgICAgIGlmICghbGluay5lbmRzV2l0aChcIi9cIikpIHtcbiAgICAgICAgbGluayArPSBcIi9cIjtcbiAgICAgIH1cbiAgICAgIGxpbmsgKz0gZmlsZU5hbWU7XG4gICAgfVxuICAgIHJldHVybiBsaW5rO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGJyYW5jaExpbmsoJHNjb3BlLCBwYWdlSWQ6IHN0cmluZywgJGxvY2F0aW9uLCBmaWxlTmFtZTpzdHJpbmcgPSBudWxsKSB7XG4gICAgcmV0dXJuIHZpZXdMaW5rKCRzY29wZSwgcGFnZUlkLCAkbG9jYXRpb24sIGZpbGVOYW1lKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBlZGl0TGluaygkc2NvcGUsIHBhZ2VJZDpzdHJpbmcsICRsb2NhdGlvbikge1xuICAgIHZhciBsaW5rOnN0cmluZyA9IG51bGw7XG4gICAgdmFyIGZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdChwYWdlSWQpO1xuICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICBjYXNlIFwiaW1hZ2VcIjpcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICBpZiAocGFnZUlkKSB7XG4gICAgICAgIGxpbmsgPSBzdGFydCArIFwiL2VkaXQvXCIgKyBlbmNvZGVQYXRoKHBhZ2VJZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBsZXRzIHVzZSB0aGUgY3VycmVudCBwYXRoXG4gICAgICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICAgICAgbGluayA9IFwiI1wiICsgcGF0aC5yZXBsYWNlKC8odmlld3xjcmVhdGUpLywgXCJlZGl0XCIpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGluaztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMaW5rKCRzY29wZSwgcGFnZUlkOnN0cmluZywgJGxvY2F0aW9uKSB7XG4gICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgIHZhciBzdGFydCA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgIHZhciBsaW5rID0gJyc7XG4gICAgaWYgKHBhZ2VJZCkge1xuICAgICAgbGluayA9IHN0YXJ0ICsgXCIvY3JlYXRlL1wiICsgZW5jb2RlUGF0aChwYWdlSWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBsZXRzIHVzZSB0aGUgY3VycmVudCBwYXRoXG4gICAgICBsaW5rID0gXCIjXCIgKyBwYXRoLnJlcGxhY2UoLyh2aWV3fGVkaXR8Zm9ybVRhYmxlKS8sIFwiY3JlYXRlXCIpO1xuICAgIH1cbiAgICAvLyB3ZSBoYXZlIHRoZSBsaW5rIHNvIGxldHMgbm93IHJlbW92ZSB0aGUgbGFzdCBwYXRoXG4gICAgLy8gb3IgaWYgdGhlcmUgaXMgbm8gLyBpbiB0aGUgcGF0aCB0aGVuIHJlbW92ZSB0aGUgbGFzdCBzZWN0aW9uXG4gICAgdmFyIGlkeCA9IGxpbmsubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgIGlmIChpZHggPiAwICYmICEkc2NvcGUuY2hpbGRyZW4gJiYgIXBhdGguc3RhcnRzV2l0aChcIi93aWtpL2Zvcm1UYWJsZVwiKSkge1xuICAgICAgbGluayA9IGxpbmsuc3Vic3RyaW5nKDAsIGlkeCArIDEpO1xuICAgIH1cbiAgICByZXR1cm4gbGluaztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBlbmNvZGVQYXRoKHBhZ2VJZDpzdHJpbmcpIHtcbiAgICByZXR1cm4gcGFnZUlkLnNwbGl0KFwiL1wiKS5tYXAoZW5jb2RlVVJJQ29tcG9uZW50KS5qb2luKFwiL1wiKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBkZWNvZGVQYXRoKHBhZ2VJZDpzdHJpbmcpIHtcbiAgICByZXR1cm4gcGFnZUlkLnNwbGl0KFwiL1wiKS5tYXAoZGVjb2RlVVJJQ29tcG9uZW50KS5qb2luKFwiL1wiKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlRm9ybWF0KG5hbWU6c3RyaW5nLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5Pykge1xuICAgIHZhciBleHRlbnNpb24gPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgIGlmIChuYW1lKSB7XG4gICAgICBpZiAobmFtZSA9PT0gXCJKZW5raW5zZmlsZVwiKSB7XG4gICAgICAgIGV4dGVuc2lvbiA9IFwiZ3Jvb3Z5XCI7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBhbnN3ZXIgPSBudWxsO1xuICAgIGlmICghZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkge1xuICAgICAgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSA9IEhhd3Rpb0NvcmUuaW5qZWN0b3IuZ2V0KFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiKTtcbiAgICB9XG4gICAgYW5ndWxhci5mb3JFYWNoKGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnksIChhcnJheSwga2V5KSA9PiB7XG4gICAgICBpZiAoYXJyYXkuaW5kZXhPZihleHRlbnNpb24pID49IDApIHtcbiAgICAgICAgYW5zd2VyID0ga2V5O1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBhbnN3ZXI7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZmlsZSBuYW1lIG9mIHRoZSBnaXZlbiBwYXRoOyBzdHJpcHBpbmcgb2ZmIGFueSBkaXJlY3Rvcmllc1xuICAgKiBAbWV0aG9kIGZpbGVOYW1lXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlTmFtZShwYXRoOiBzdHJpbmcpIHtcbiAgICBpZiAocGF0aCkge1xuICAgICAgIHZhciBpZHggPSBwYXRoLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIHJldHVybiBwYXRoLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhdGg7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZm9sZGVyIG9mIHRoZSBnaXZlbiBwYXRoIChldmVyeXRoaW5nIGJ1dCB0aGUgbGFzdCBwYXRoIG5hbWUpXG4gICAqIEBtZXRob2QgZmlsZVBhcmVudFxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZmlsZVBhcmVudChwYXRoOiBzdHJpbmcpIHtcbiAgICBpZiAocGF0aCkge1xuICAgICAgIHZhciBpZHggPSBwYXRoLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIHJldHVybiBwYXRoLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBsZXRzIHJldHVybiB0aGUgcm9vdCBkaXJlY3RvcnlcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmaWxlIG5hbWUgZm9yIHRoZSBnaXZlbiBuYW1lOyB3ZSBoaWRlIHNvbWUgZXh0ZW5zaW9uc1xuICAgKiBAbWV0aG9kIGhpZGVGaW5lTmFtZUV4dGVuc2lvbnNcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGhpZGVGaWxlTmFtZUV4dGVuc2lvbnMobmFtZSkge1xuICAgIGlmIChuYW1lKSB7XG4gICAgICBhbmd1bGFyLmZvckVhY2goV2lraS5oaWRlRXh0ZW5zaW9ucywgKGV4dGVuc2lvbikgPT4ge1xuICAgICAgICBpZiAobmFtZS5lbmRzV2l0aChleHRlbnNpb24pKSB7XG4gICAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKDAsIG5hbWUubGVuZ3RoIC0gZXh0ZW5zaW9uLmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBVUkwgdG8gcGVyZm9ybSBhIEdFVCBvciBQT1NUIGZvciB0aGUgZ2l2ZW4gYnJhbmNoIG5hbWUgYW5kIHBhdGhcbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBnaXRSZXN0VVJMKCRzY29wZSwgcGF0aDogc3RyaW5nKSB7XG4gICAgdmFyIHVybCA9IGdpdFJlbGF0aXZlVVJMKCRzY29wZSwgcGF0aCk7XG4gICAgdXJsID0gQ29yZS51cmwoJy8nICsgdXJsKTtcblxuLypcbiAgICB2YXIgY29ubmVjdGlvbk5hbWUgPSBDb3JlLmdldENvbm5lY3Rpb25OYW1lUGFyYW1ldGVyKCk7XG4gICAgaWYgKGNvbm5lY3Rpb25OYW1lKSB7XG4gICAgICB2YXIgY29ubmVjdGlvbk9wdGlvbnMgPSBDb3JlLmdldENvbm5lY3RPcHRpb25zKGNvbm5lY3Rpb25OYW1lKTtcbiAgICAgIGlmIChjb25uZWN0aW9uT3B0aW9ucykge1xuICAgICAgICBjb25uZWN0aW9uT3B0aW9ucy5wYXRoID0gdXJsO1xuICAgICAgICB1cmwgPSA8c3RyaW5nPkNvcmUuY3JlYXRlU2VydmVyQ29ubmVjdGlvblVybChjb25uZWN0aW9uT3B0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuXG4qL1xuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICAgIGZ1bmN0aW9uIGdpdFVybFByZWZpeCgpIHtcbiAgICAgICAgdmFyIHByZWZpeCA9IFwiXCI7XG4gICAgICAgIHZhciBpbmplY3RvciA9IEhhd3Rpb0NvcmUuaW5qZWN0b3I7XG4gICAgICAgIGlmIChpbmplY3Rvcikge1xuICAgICAgICAgICAgcHJlZml4ID0gaW5qZWN0b3IuZ2V0KFwiV2lraUdpdFVybFByZWZpeFwiKSB8fCBcIlwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmVmaXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAqIFJldHVybnMgYSByZWxhdGl2ZSBVUkwgdG8gcGVyZm9ybSBhIEdFVCBvciBQT1NUIGZvciB0aGUgZ2l2ZW4gYnJhbmNoL3BhdGhcbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBnaXRSZWxhdGl2ZVVSTCgkc2NvcGUsIHBhdGg6IHN0cmluZykge1xuICAgICAgdmFyIGJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgdmFyIHByZWZpeCA9IGdpdFVybFByZWZpeCgpO1xuICAgIGJyYW5jaCA9IGJyYW5jaCB8fCBcIm1hc3RlclwiO1xuICAgIHBhdGggPSBwYXRoIHx8IFwiL1wiO1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4ocHJlZml4LCBcImdpdC9cIiArIGJyYW5jaCwgcGF0aCk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBUYWtlcyBhIHJvdyBjb250YWluaW5nIHRoZSBlbnRpdHkgb2JqZWN0OyBvciBjYW4gdGFrZSB0aGUgZW50aXR5IGRpcmVjdGx5LlxuICAgKlxuICAgKiBJdCB0aGVuIHVzZXMgdGhlIG5hbWUsIGRpcmVjdG9yeSBhbmQgeG1sTmFtZXNwYWNlcyBwcm9wZXJ0aWVzXG4gICAqXG4gICAqIEBtZXRob2QgZmlsZUljb25IdG1sXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7YW55fSByb3dcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKlxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVJY29uSHRtbChyb3cpIHtcbiAgICB2YXIgbmFtZSA9IHJvdy5uYW1lO1xuICAgIHZhciBwYXRoID0gcm93LnBhdGg7XG4gICAgdmFyIGJyYW5jaCA9IHJvdy5icmFuY2ggO1xuICAgIHZhciBkaXJlY3RvcnkgPSByb3cuZGlyZWN0b3J5O1xuICAgIHZhciB4bWxOYW1lc3BhY2VzID0gcm93LnhtbF9uYW1lc3BhY2VzIHx8IHJvdy54bWxOYW1lc3BhY2VzO1xuICAgIHZhciBpY29uVXJsID0gcm93Lmljb25Vcmw7XG4gICAgdmFyIGVudGl0eSA9IHJvdy5lbnRpdHk7XG4gICAgaWYgKGVudGl0eSkge1xuICAgICAgbmFtZSA9IG5hbWUgfHwgZW50aXR5Lm5hbWU7XG4gICAgICBwYXRoID0gcGF0aCB8fCBlbnRpdHkucGF0aDtcbiAgICAgIGJyYW5jaCA9IGJyYW5jaCB8fCBlbnRpdHkuYnJhbmNoO1xuICAgICAgZGlyZWN0b3J5ID0gZGlyZWN0b3J5IHx8IGVudGl0eS5kaXJlY3Rvcnk7XG4gICAgICB4bWxOYW1lc3BhY2VzID0geG1sTmFtZXNwYWNlcyB8fCBlbnRpdHkueG1sX25hbWVzcGFjZXMgfHwgZW50aXR5LnhtbE5hbWVzcGFjZXM7XG4gICAgICBpY29uVXJsID0gaWNvblVybCB8fCBlbnRpdHkuaWNvblVybDtcbiAgICB9XG4gICAgYnJhbmNoID0gYnJhbmNoIHx8IFwibWFzdGVyXCI7XG4gICAgdmFyIGNzcyA9IG51bGw7XG4gICAgdmFyIGljb246c3RyaW5nID0gbnVsbDtcbiAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAvLyBUT0RPIGNvdWxkIHdlIHVzZSBkaWZmZXJlbnQgaWNvbnMgZm9yIG1hcmtkb3duIHYgeG1sIHYgaHRtbFxuICAgIGlmICh4bWxOYW1lc3BhY2VzICYmIHhtbE5hbWVzcGFjZXMubGVuZ3RoKSB7XG4gICAgICBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmNhbWVsTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICBpY29uID0gXCJpbWcvaWNvbnMvY2FtZWwuc3ZnXCI7XG4gICAgICB9IGVsc2UgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5kb3plck5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgaWNvbiA9IFwiaW1nL2ljb25zL2RvemVyL2RvemVyLmdpZlwiO1xuICAgICAgfSBlbHNlIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuYWN0aXZlbXFOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgIGljb24gPSBcImltZy9pY29ucy9tZXNzYWdlYnJva2VyLnN2Z1wiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiZmlsZSBcIiArIG5hbWUgKyBcIiBoYXMgbmFtZXNwYWNlcyBcIiArIHhtbE5hbWVzcGFjZXMpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWljb25VcmwgJiYgbmFtZSkge1xuICAgICAgdmFyIGxvd2VyTmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIGlmIChsb3dlck5hbWUgPT0gXCJwb20ueG1sXCIpIHtcbiAgICAgICAgaWNvblVybCA9IFwiaW1nL21hdmVuLWljb24ucG5nXCI7XG4gICAgICB9IGVsc2UgaWYgKGxvd2VyTmFtZSA9PSBcImplbmtpbnNmaWxlXCIpIHtcbiAgICAgICAgaWNvblVybCA9IFwiaW1nL2plbmtpbnMtaWNvbi5zdmdcIjtcbiAgICAgIH0gZWxzZSBpZiAobG93ZXJOYW1lID09IFwiZmFicmljOC55bWxcIikge1xuICAgICAgICBpY29uVXJsID0gXCJpbWcvZmFicmljOF9pY29uLnN2Z1wiO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpY29uVXJsKSB7XG4gICAgICBjc3MgPSBudWxsO1xuICAgICAgaWNvbiA9IGljb25Vcmw7XG4vKlxuICAgICAgdmFyIHByZWZpeCA9IGdpdFVybFByZWZpeCgpO1xuICAgICAgaWNvbiA9IFVybEhlbHBlcnMuam9pbihwcmVmaXgsIFwiZ2l0XCIsIGljb25VcmwpO1xuKi9cbi8qXG4gICAgICB2YXIgY29ubmVjdGlvbk5hbWUgPSBDb3JlLmdldENvbm5lY3Rpb25OYW1lUGFyYW1ldGVyKCk7XG4gICAgICBpZiAoY29ubmVjdGlvbk5hbWUpIHtcbiAgICAgICAgdmFyIGNvbm5lY3Rpb25PcHRpb25zID0gQ29yZS5nZXRDb25uZWN0T3B0aW9ucyhjb25uZWN0aW9uTmFtZSk7XG4gICAgICAgIGlmIChjb25uZWN0aW9uT3B0aW9ucykge1xuICAgICAgICAgIGNvbm5lY3Rpb25PcHRpb25zLnBhdGggPSBDb3JlLnVybCgnLycgKyBpY29uKTtcbiAgICAgICAgICBpY29uID0gPHN0cmluZz5Db3JlLmNyZWF0ZVNlcnZlckNvbm5lY3Rpb25VcmwoY29ubmVjdGlvbk9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICB9XG4qL1xuICAgIH1cbiAgICBpZiAoIWljb24pIHtcbiAgICAgIGlmIChkaXJlY3RvcnkpIHtcbiAgICAgICAgc3dpdGNoIChleHRlbnNpb24pIHtcbiAgICAgICAgICBjYXNlICdwcm9maWxlJzpcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtYm9va1wiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIGxvZy5kZWJ1ZyhcIk5vIG1hdGNoIGZvciBleHRlbnNpb246IFwiLCBleHRlbnNpb24sIFwiIHVzaW5nIGEgZ2VuZXJpYyBmb2xkZXIgaWNvblwiKTtcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtZm9sZGVyIGZvbGRlci1pY29uXCI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN3aXRjaCAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgY2FzZSAnamF2YSc6XG4gICAgICAgICAgICBpY29uID0gXCJpbWcvamF2YS5zdmdcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3BuZyc6XG4gICAgICAgICAgY2FzZSAnc3ZnJzpcbiAgICAgICAgICBjYXNlICdqcGcnOlxuICAgICAgICAgIGNhc2UgJ2dpZic6XG4gICAgICAgICAgICBjc3MgPSBudWxsO1xuICAgICAgICAgICAgaWNvbiA9IFdpa2kuZ2l0UmVsYXRpdmVVUkwoYnJhbmNoLCBwYXRoKTtcbi8qXG4gICAgICAgICAgICB2YXIgY29ubmVjdGlvbk5hbWUgPSBDb3JlLmdldENvbm5lY3Rpb25OYW1lUGFyYW1ldGVyKCk7XG4gICAgICAgICAgICBpZiAoY29ubmVjdGlvbk5hbWUpIHtcbiAgICAgICAgICAgICAgdmFyIGNvbm5lY3Rpb25PcHRpb25zID0gQ29yZS5nZXRDb25uZWN0T3B0aW9ucyhjb25uZWN0aW9uTmFtZSk7XG4gICAgICAgICAgICAgIGlmIChjb25uZWN0aW9uT3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25PcHRpb25zLnBhdGggPSBDb3JlLnVybCgnLycgKyBpY29uKTtcbiAgICAgICAgICAgICAgICBpY29uID0gPHN0cmluZz5Db3JlLmNyZWF0ZVNlcnZlckNvbm5lY3Rpb25VcmwoY29ubmVjdGlvbk9wdGlvbnMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4qL1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnanNvbic6XG4gICAgICAgICAgY2FzZSAneG1sJzpcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtZmlsZS10ZXh0XCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdtZCc6XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZpbGUtdGV4dC1vXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gbG9nLmRlYnVnKFwiTm8gbWF0Y2ggZm9yIGV4dGVuc2lvbjogXCIsIGV4dGVuc2lvbiwgXCIgdXNpbmcgYSBnZW5lcmljIGZpbGUgaWNvblwiKTtcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtZmlsZS1vXCI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGljb24pIHtcbiAgICAgIHJldHVybiBcIjxpbWcgc3JjPSdcIiArIENvcmUudXJsKGljb24pICsgXCInPlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gXCI8aSBjbGFzcz0nXCIgKyBjc3MgKyBcIic+PC9pPlwiO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpY29uQ2xhc3Mocm93KSB7XG4gICAgdmFyIG5hbWUgPSByb3cuZ2V0UHJvcGVydHkoXCJuYW1lXCIpO1xuICAgIHZhciBleHRlbnNpb24gPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgIHZhciBkaXJlY3RvcnkgPSByb3cuZ2V0UHJvcGVydHkoXCJkaXJlY3RvcnlcIik7XG4gICAgaWYgKGRpcmVjdG9yeSkge1xuICAgICAgcmV0dXJuIFwiZmEgZmEtZm9sZGVyXCI7XG4gICAgfVxuICAgIGlmIChcInhtbFwiID09PSBleHRlbnNpb24pIHtcbiAgICAgICAgcmV0dXJuIFwiZmEgZmEtY29nXCI7XG4gICAgfSBlbHNlIGlmIChcIm1kXCIgPT09IGV4dGVuc2lvbikge1xuICAgICAgICByZXR1cm4gXCJmYSBmYS1maWxlLXRleHQtb1wiO1xuICAgIH1cbiAgICAvLyBUT0RPIGNvdWxkIHdlIHVzZSBkaWZmZXJlbnQgaWNvbnMgZm9yIG1hcmtkb3duIHYgeG1sIHYgaHRtbFxuICAgIHJldHVybiBcImZhIGZhLWZpbGUtb1wiO1xuICB9XG5cblxuICAvKipcbiAgICogRXh0cmFjdHMgdGhlIHBhZ2VJZCwgYnJhbmNoLCBvYmplY3RJZCBmcm9tIHRoZSByb3V0ZSBwYXJhbWV0ZXJzXG4gICAqIEBtZXRob2QgaW5pdFNjb3BlXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7Kn0gJHNjb3BlXG4gICAqIEBwYXJhbSB7YW55fSAkcm91dGVQYXJhbXNcbiAgICogQHBhcmFtIHtuZy5JTG9jYXRpb25TZXJ2aWNlfSAkbG9jYXRpb25cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBpbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbikge1xuICAgICRzY29wZS5wYWdlSWQgPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG5cbiAgICAvLyBsZXRzIGxldCB0aGVzZSB0byBiZSBpbmhlcml0ZWQgaWYgd2UgaW5jbHVkZSBhIHRlbXBsYXRlIG9uIGFub3RoZXIgcGFnZVxuICAgICRzY29wZS5wcm9qZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJwcm9qZWN0SWRcIl0gfHwgJHNjb3BlLmlkO1xuICAgICRzY29wZS5uYW1lc3BhY2UgPSAkcm91dGVQYXJhbXNbXCJuYW1lc3BhY2VcIl0gfHwgJHNjb3BlLm5hbWVzcGFjZTtcblxuICAgICRzY29wZS5vd25lciA9ICRyb3V0ZVBhcmFtc1tcIm93bmVyXCJdO1xuICAgICRzY29wZS5yZXBvSWQgPSAkcm91dGVQYXJhbXNbXCJyZXBvSWRcIl07XG4gICAgJHNjb3BlLmJyYW5jaCA9ICRyb3V0ZVBhcmFtc1tcImJyYW5jaFwiXSB8fCAkbG9jYXRpb24uc2VhcmNoKClbXCJicmFuY2hcIl07XG4gICAgJHNjb3BlLm9iamVjdElkID0gJHJvdXRlUGFyYW1zW1wib2JqZWN0SWRcIl0gfHwgJHJvdXRlUGFyYW1zW1wiZGlmZk9iamVjdElkMVwiXTtcbiAgICAkc2NvcGUuc3RhcnRMaW5rID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgJHNjb3BlLiR2aWV3TGluayA9IHZpZXdMaW5rKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uKTtcbiAgICAkc2NvcGUuaGlzdG9yeUxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArIFwiL2hpc3RvcnkvXCIgKyAoJHNjb3BlLnBhZ2VJZCB8fCBcIlwiKTtcbiAgICAkc2NvcGUud2lraVJlcG9zaXRvcnkgPSBuZXcgR2l0V2lraVJlcG9zaXRvcnkoJHNjb3BlKTtcbiAgICAkc2NvcGUuJHdvcmtzcGFjZUxpbmsgPSBEZXZlbG9wZXIud29ya3NwYWNlTGluaygpO1xuICAgICRzY29wZS4kcHJvamVjdExpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgJHNjb3BlLmJyZWFkY3J1bWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdEJyZWFkY3J1bWJzKCRzY29wZS5wcm9qZWN0SWQsIGNyZWF0ZVNvdXJjZUJyZWFkY3J1bWJzKCRzY29wZSkpO1xuICAgICRzY29wZS5zdWJUYWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdFN1Yk5hdkJhcnMoJHNjb3BlLnByb2plY3RJZCk7XG4gIH1cblxuICAvKipcbiAgICogTG9hZHMgdGhlIGJyYW5jaGVzIGZvciB0aGlzIHdpa2kgcmVwb3NpdG9yeSBhbmQgc3RvcmVzIHRoZW0gaW4gdGhlIGJyYW5jaGVzIHByb3BlcnR5IGluXG4gICAqIHRoZSAkc2NvcGUgYW5kIGVuc3VyZXMgJHNjb3BlLmJyYW5jaCBpcyBzZXQgdG8gYSB2YWxpZCB2YWx1ZVxuICAgKlxuICAgKiBAcGFyYW0gd2lraVJlcG9zaXRvcnlcbiAgICogQHBhcmFtICRzY29wZVxuICAgKiBAcGFyYW0gaXNGbWMgd2hldGhlciB3ZSBydW4gYXMgZmFicmljOCBvciBhcyBoYXd0aW9cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBsb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMgPSBmYWxzZSkge1xuICAgIHdpa2lSZXBvc2l0b3J5LmJyYW5jaGVzKChyZXNwb25zZSkgPT4ge1xuICAgICAgLy8gbGV0cyBzb3J0IGJ5IHZlcnNpb24gbnVtYmVyXG4gICAgICAkc2NvcGUuYnJhbmNoZXMgPSByZXNwb25zZS5zb3J0QnkoKHYpID0+IENvcmUudmVyc2lvblRvU29ydGFibGVTdHJpbmcodiksIHRydWUpO1xuXG4gICAgICAvLyBkZWZhdWx0IHRoZSBicmFuY2ggbmFtZSBpZiB3ZSBoYXZlICdtYXN0ZXInXG4gICAgICBpZiAoISRzY29wZS5icmFuY2ggJiYgJHNjb3BlLmJyYW5jaGVzLmZpbmQoKGJyYW5jaCkgPT4ge1xuICAgICAgICByZXR1cm4gYnJhbmNoID09PSBcIm1hc3RlclwiO1xuICAgICAgfSkpIHtcbiAgICAgICAgJHNjb3BlLmJyYW5jaCA9IFwibWFzdGVyXCI7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIHRoZSBwYWdlSWQgZnJvbSB0aGUgcm91dGUgcGFyYW1ldGVyc1xuICAgKiBAbWV0aG9kIHBhZ2VJZFxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge2FueX0gJHJvdXRlUGFyYW1zXG4gICAqIEBwYXJhbSBAbmcuSUxvY2F0aW9uU2VydmljZSBAbG9jYXRpb25cbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIHBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbikge1xuICAgIHZhciBwYWdlSWQgPSAkcm91dGVQYXJhbXNbJ3BhZ2UnXTtcbiAgICBpZiAoIXBhZ2VJZCkge1xuICAgICAgLy8gTGV0cyBkZWFsIHdpdGggdGhlIGhhY2sgb2YgQW5ndWxhckpTIG5vdCBzdXBwb3J0aW5nIC8gaW4gYSBwYXRoIHZhcmlhYmxlXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDEwMDsgaSsrKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9ICRyb3V0ZVBhcmFtc1sncGF0aCcgKyBpXTtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHZhbHVlKSkge1xuICAgICAgICAgIGlmICghcGFnZUlkKSB7XG4gICAgICAgICAgICBwYWdlSWQgPSB2YWx1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFnZUlkICs9IFwiL1wiICsgdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgYnJlYWs7XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFnZUlkIHx8IFwiL1wiO1xuICAgIH1cblxuICAgIC8vIGlmIG5vICRyb3V0ZVBhcmFtcyB2YXJpYWJsZXMgbGV0cyBmaWd1cmUgaXQgb3V0IGZyb20gdGhlICRsb2NhdGlvblxuICAgIGlmICghcGFnZUlkKSB7XG4gICAgICBwYWdlSWQgPSBwYWdlSWRGcm9tVVJJKCRsb2NhdGlvbi5wYXRoKCkpO1xuICAgIH1cbiAgICByZXR1cm4gcGFnZUlkO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHBhZ2VJZEZyb21VUkkodXJsOnN0cmluZykge1xuICAgIHZhciB3aWtpUHJlZml4ID0gXCIvd2lraS9cIjtcbiAgICBpZiAodXJsICYmIHVybC5zdGFydHNXaXRoKHdpa2lQcmVmaXgpKSB7XG4gICAgICB2YXIgaWR4ID0gdXJsLmluZGV4T2YoXCIvXCIsIHdpa2lQcmVmaXgubGVuZ3RoICsgMSk7XG4gICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICByZXR1cm4gdXJsLnN1YnN0cmluZyhpZHggKyAxLCB1cmwubGVuZ3RoKVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbFxuXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZmlsZUV4dGVuc2lvbihuYW1lKSB7XG4gICAgaWYgKG5hbWUuaW5kZXhPZignIycpID4gMClcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZygwLCBuYW1lLmluZGV4T2YoJyMnKSk7XG4gICAgcmV0dXJuIENvcmUuZmlsZUV4dGVuc2lvbihuYW1lLCBcIm1hcmtkb3duXCIpO1xuICB9XG5cblxuICBleHBvcnQgZnVuY3Rpb24gb25Db21wbGV0ZShzdGF0dXMpIHtcbiAgICBjb25zb2xlLmxvZyhcIkNvbXBsZXRlZCBvcGVyYXRpb24gd2l0aCBzdGF0dXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoc3RhdHVzKSk7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2VzIHRoZSBnaXZlbiBKU09OIHRleHQgcmVwb3J0aW5nIHRvIHRoZSB1c2VyIGlmIHRoZXJlIGlzIGEgcGFyc2UgZXJyb3JcbiAgICogQG1ldGhvZCBwYXJzZUpzb25cbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRleHRcbiAgICogQHJldHVybiB7YW55fVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSnNvbih0ZXh0OnN0cmluZykge1xuICAgIGlmICh0ZXh0KSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZSh0ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJlcnJvclwiLCBcIkZhaWxlZCB0byBwYXJzZSBKU09OOiBcIiArIGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGp1c3RzIGEgcmVsYXRpdmUgb3IgYWJzb2x1dGUgbGluayBmcm9tIGEgd2lraSBvciBmaWxlIHN5c3RlbSB0byBvbmUgdXNpbmcgdGhlIGhhc2ggYmFuZyBzeW50YXhcbiAgICogQG1ldGhvZCBhZGp1c3RIcmVmXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7Kn0gJHNjb3BlXG4gICAqIEBwYXJhbSB7bmcuSUxvY2F0aW9uU2VydmljZX0gJGxvY2F0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBocmVmXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBmaWxlRXh0ZW5zaW9uXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBhZGp1c3RIcmVmKCRzY29wZSwgJGxvY2F0aW9uLCBocmVmLCBmaWxlRXh0ZW5zaW9uKSB7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24gPyBcIi5cIiArIGZpbGVFeHRlbnNpb24gOiBcIlwiO1xuXG4gICAgLy8gaWYgdGhlIGxhc3QgcGFydCBvZiB0aGUgcGF0aCBoYXMgYSBkb3QgaW4gaXQgbGV0c1xuICAgIC8vIGV4Y2x1ZGUgaXQgYXMgd2UgYXJlIHJlbGF0aXZlIHRvIGEgbWFya2Rvd24gb3IgaHRtbCBmaWxlIGluIGEgZm9sZGVyXG4gICAgLy8gc3VjaCBhcyB3aGVuIHZpZXdpbmcgcmVhZG1lLm1kIG9yIGluZGV4Lm1kXG4gICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgIHZhciBmb2xkZXJQYXRoID0gcGF0aDtcbiAgICB2YXIgaWR4ID0gcGF0aC5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgaWYgKGlkeCA+IDApIHtcbiAgICAgIHZhciBsYXN0TmFtZSA9IHBhdGguc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgaWYgKGxhc3ROYW1lLmluZGV4T2YoXCIuXCIpID49IDApIHtcbiAgICAgICAgZm9sZGVyUGF0aCA9IHBhdGguc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVhbCB3aXRoIHJlbGF0aXZlIFVSTHMgZmlyc3QuLi5cbiAgICBpZiAoaHJlZi5zdGFydHNXaXRoKCcuLi8nKSkge1xuICAgICAgdmFyIHBhcnRzID0gaHJlZi5zcGxpdCgnLycpO1xuICAgICAgdmFyIHBhdGhQYXJ0cyA9IGZvbGRlclBhdGguc3BsaXQoJy8nKTtcbiAgICAgIHZhciBwYXJlbnRzID0gcGFydHMuZmlsdGVyKChwYXJ0KSA9PiB7XG4gICAgICAgIHJldHVybiBwYXJ0ID09PSBcIi4uXCI7XG4gICAgICB9KTtcbiAgICAgIHBhcnRzID0gcGFydHMubGFzdChwYXJ0cy5sZW5ndGggLSBwYXJlbnRzLmxlbmd0aCk7XG4gICAgICBwYXRoUGFydHMgPSBwYXRoUGFydHMuZmlyc3QocGF0aFBhcnRzLmxlbmd0aCAtIHBhcmVudHMubGVuZ3RoKTtcblxuICAgICAgcmV0dXJuICcjJyArIHBhdGhQYXJ0cy5qb2luKCcvJykgKyAnLycgKyBwYXJ0cy5qb2luKCcvJykgKyBleHRlbnNpb24gKyAkbG9jYXRpb24uaGFzaCgpO1xuICAgIH1cblxuICAgIC8vIFR1cm4gYW4gYWJzb2x1dGUgbGluayBpbnRvIGEgd2lraSBsaW5rLi4uXG4gICAgaWYgKGhyZWYuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICByZXR1cm4gV2lraS5icmFuY2hMaW5rKCRzY29wZSwgaHJlZiArIGV4dGVuc2lvbiwgJGxvY2F0aW9uKSArIGV4dGVuc2lvbjtcbiAgICB9XG5cbiAgICBpZiAoIVdpa2kuZXhjbHVkZUFkanVzdG1lbnRQcmVmaXhlcy5hbnkoKGV4Y2x1ZGUpID0+IHtcbiAgICAgIHJldHVybiBocmVmLnN0YXJ0c1dpdGgoZXhjbHVkZSk7XG4gICAgfSkpIHtcbiAgICAgIHJldHVybiAnIycgKyBmb2xkZXJQYXRoICsgXCIvXCIgKyBocmVmICsgZXh0ZW5zaW9uICsgJGxvY2F0aW9uLmhhc2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKiBAbWFpbiBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSAnd2lraSc7XG4gIGV4cG9ydCB2YXIgdGVtcGxhdGVQYXRoID0gJ3BsdWdpbnMvd2lraS9odG1sLyc7XG4gIGV4cG9ydCB2YXIgdGFiOmFueSA9IG51bGw7XG5cbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgWydoYXd0aW8tY29yZScsICdoYXd0aW8tdWknLCAndHJlZUNvbnRyb2wnLCAndWkuY29kZW1pcnJvciddKTtcbiAgZXhwb3J0IHZhciBjb250cm9sbGVyID0gUGx1Z2luSGVscGVycy5jcmVhdGVDb250cm9sbGVyRnVuY3Rpb24oX21vZHVsZSwgJ1dpa2knKTtcbiAgZXhwb3J0IHZhciByb3V0ZSA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlUm91dGluZ0Z1bmN0aW9uKHRlbXBsYXRlUGF0aCk7XG5cbiAgX21vZHVsZS5jb25maWcoW1wiJHJvdXRlUHJvdmlkZXJcIiwgKCRyb3V0ZVByb3ZpZGVyKSA9PiB7XG5cbiAgICAvLyBhbGxvdyBvcHRpb25hbCBicmFuY2ggcGF0aHMuLi5cbiAgICBhbmd1bGFyLmZvckVhY2goW1wiXCIsIFwiL2JyYW5jaC86YnJhbmNoXCJdLCAocGF0aCkgPT4ge1xuICAgICAgLy92YXIgc3RhcnRDb250ZXh0ID0gJy93aWtpJztcbiAgICAgIHZhciBzdGFydENvbnRleHQgPSAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9wcm9qZWN0cy86cHJvamVjdElkL3dpa2knO1xuICAgICAgJHJvdXRlUHJvdmlkZXIuXG4gICAgICAgICAgICAgIHdoZW4oVXJsSGVscGVycy5qb2luKHN0YXJ0Q29udGV4dCwgcGF0aCwgJ3ZpZXcnKSwgcm91dGUoJ3ZpZXdQYWdlLmh0bWwnLCBmYWxzZSkpLlxuICAgICAgICAgICAgICB3aGVuKFVybEhlbHBlcnMuam9pbihzdGFydENvbnRleHQsIHBhdGgsICdjcmVhdGUvOnBhZ2UqJyksIHJvdXRlKCdjcmVhdGUuaHRtbCcsIGZhbHNlKSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvdmlldy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC92aWV3UGFnZS5odG1sJywgcmVsb2FkT25TZWFyY2g6IGZhbHNlfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvYm9vay86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC92aWV3Qm9vay5odG1sJywgcmVsb2FkT25TZWFyY2g6IGZhbHNlfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvZWRpdC86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9lZGl0UGFnZS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL3ZlcnNpb24vOnBhZ2UqXFwvOm9iamVjdElkJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld1BhZ2UuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9oaXN0b3J5LzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2hpc3RvcnkuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jb21taXQvOnBhZ2UqXFwvOm9iamVjdElkJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29tbWl0Lmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY29tbWl0RGV0YWlsLzpwYWdlKlxcLzpvYmplY3RJZCcsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbW1pdERldGFpbC5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2RpZmYvOmRpZmZPYmplY3RJZDEvOmRpZmZPYmplY3RJZDIvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld1BhZ2UuaHRtbCcsIHJlbG9hZE9uU2VhcmNoOiBmYWxzZX0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2Zvcm1UYWJsZS86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9mb3JtVGFibGUuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9kb3plci9tYXBwaW5ncy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9kb3plck1hcHBpbmdzLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY29uZmlndXJhdGlvbnMvOnBhZ2UqJywgeyB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbmZpZ3VyYXRpb25zLmh0bWwnIH0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NvbmZpZ3VyYXRpb24vOnBpZC86cGFnZSonLCB7IHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29uZmlndXJhdGlvbi5odG1sJyB9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9uZXdDb25maWd1cmF0aW9uLzpmYWN0b3J5UGlkLzpwYWdlKicsIHsgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb25maWd1cmF0aW9uLmh0bWwnIH0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NhbWVsL2RpYWdyYW0vOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY2FtZWxEaWFncmFtLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY2FtZWwvY2FudmFzLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NhbWVsQ2FudmFzLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY2FtZWwvcHJvcGVydGllcy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jYW1lbFByb3BlcnRpZXMuaHRtbCd9KTtcbiAgICB9KTtcbn1dKTtcblxuICAvKipcbiAgICogQnJhbmNoIE1lbnUgc2VydmljZVxuICAgKi9cbiAgZXhwb3J0IGludGVyZmFjZSBCcmFuY2hNZW51IHtcbiAgICBhZGRFeHRlbnNpb246IChpdGVtOlVJLk1lbnVJdGVtKSA9PiB2b2lkO1xuICAgIGFwcGx5TWVudUV4dGVuc2lvbnM6IChtZW51OlVJLk1lbnVJdGVtW10pID0+IHZvaWQ7XG4gIH1cblxuICBfbW9kdWxlLmZhY3RvcnkoJ3dpa2lCcmFuY2hNZW51JywgKCkgPT4ge1xuICAgIHZhciBzZWxmID0ge1xuICAgICAgaXRlbXM6IFtdLFxuICAgICAgYWRkRXh0ZW5zaW9uOiAoaXRlbTpVSS5NZW51SXRlbSkgPT4ge1xuICAgICAgICBzZWxmLml0ZW1zLnB1c2goaXRlbSk7XG4gICAgICB9LFxuICAgICAgYXBwbHlNZW51RXh0ZW5zaW9uczogKG1lbnU6VUkuTWVudUl0ZW1bXSkgPT4ge1xuICAgICAgICBpZiAoc2VsZi5pdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGV4dGVuZGVkTWVudTpVSS5NZW51SXRlbVtdID0gW3tcbiAgICAgICAgICBoZWFkaW5nOiBcIkFjdGlvbnNcIlxuICAgICAgICB9XTtcbiAgICAgICAgc2VsZi5pdGVtcy5mb3JFYWNoKChpdGVtOlVJLk1lbnVJdGVtKSA9PiB7XG4gICAgICAgICAgaWYgKGl0ZW0udmFsaWQoKSkge1xuICAgICAgICAgICAgZXh0ZW5kZWRNZW51LnB1c2goaXRlbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGV4dGVuZGVkTWVudS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgbWVudS5hZGQoZXh0ZW5kZWRNZW51KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIHNlbGY7XG4gIH0pO1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnV2lraUdpdFVybFByZWZpeCcsICgpID0+IHtcbiAgICAgIHJldHVybiBcIlwiO1xuICB9KTtcblxuICBfbW9kdWxlLmZhY3RvcnkoJ2ZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnknLCAoKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIFwiaW1hZ2VcIjogW1wic3ZnXCIsIFwicG5nXCIsIFwiaWNvXCIsIFwiYm1wXCIsIFwianBnXCIsIFwiZ2lmXCJdLFxuICAgICAgXCJtYXJrZG93blwiOiBbXCJtZFwiLCBcIm1hcmtkb3duXCIsIFwibWRvd25cIiwgXCJta2RuXCIsIFwibWtkXCJdLFxuICAgICAgXCJodG1sbWl4ZWRcIjogW1wiaHRtbFwiLCBcInhodG1sXCIsIFwiaHRtXCJdLFxuICAgICAgXCJ0ZXh0L3gtamF2YVwiOiBbXCJqYXZhXCJdLFxuICAgICAgXCJ0ZXh0L3gtZ3Jvb3Z5XCI6IFtcImdyb292eVwiXSxcbiAgICAgIFwidGV4dC94LXNjYWxhXCI6IFtcInNjYWxhXCJdLFxuICAgICAgXCJqYXZhc2NyaXB0XCI6IFtcImpzXCIsIFwianNvblwiLCBcImphdmFzY3JpcHRcIiwgXCJqc2NyaXB0XCIsIFwiZWNtYXNjcmlwdFwiLCBcImZvcm1cIl0sXG4gICAgICBcInhtbFwiOiBbXCJ4bWxcIiwgXCJ4c2RcIiwgXCJ3c2RsXCIsIFwiYXRvbVwiXSxcbiAgICAgIFwidGV4dC94LXlhbWxcIjogW1wieWFtbFwiLCBcInltbFwiXSxcbiAgICAgIFwicHJvcGVydGllc1wiOiBbXCJwcm9wZXJ0aWVzXCJdXG4gICAgfTtcbiAgfSk7XG5cbiAgX21vZHVsZS5maWx0ZXIoJ2ZpbGVJY29uQ2xhc3MnLCAoKSA9PiBpY29uQ2xhc3MpO1xuXG4gIF9tb2R1bGUucnVuKFtcIiRsb2NhdGlvblwiLFwidmlld1JlZ2lzdHJ5XCIsICBcImxvY2FsU3RvcmFnZVwiLCBcImxheW91dEZ1bGxcIiwgXCJoZWxwUmVnaXN0cnlcIiwgXCJwcmVmZXJlbmNlc1JlZ2lzdHJ5XCIsIFwid2lraVJlcG9zaXRvcnlcIixcbiAgICBcIiRyb290U2NvcGVcIiwgKCRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLFxuICAgICAgICB2aWV3UmVnaXN0cnksXG4gICAgICAgIGxvY2FsU3RvcmFnZSxcbiAgICAgICAgbGF5b3V0RnVsbCxcbiAgICAgICAgaGVscFJlZ2lzdHJ5LFxuICAgICAgICBwcmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgICB3aWtpUmVwb3NpdG9yeSxcbiAgICAgICAgJHJvb3RTY29wZSkgPT4ge1xuXG4gICAgdmlld1JlZ2lzdHJ5Wyd3aWtpJ10gPSB0ZW1wbGF0ZVBhdGggKyAnbGF5b3V0V2lraS5odG1sJztcbi8qXG4gICAgaGVscFJlZ2lzdHJ5LmFkZFVzZXJEb2MoJ3dpa2knLCAncGx1Z2lucy93aWtpL2RvYy9oZWxwLm1kJywgKCkgPT4ge1xuICAgICAgcmV0dXJuIFdpa2kuaXNXaWtpRW5hYmxlZCh3b3Jrc3BhY2UsIGpvbG9raWEsIGxvY2FsU3RvcmFnZSk7XG4gICAgfSk7XG4qL1xuXG4vKlxuICAgIHByZWZlcmVuY2VzUmVnaXN0cnkuYWRkVGFiKFwiR2l0XCIsICdwbHVnaW5zL3dpa2kvaHRtbC9naXRQcmVmZXJlbmNlcy5odG1sJyk7XG4qL1xuXG4vKlxuICAgIHRhYiA9IHtcbiAgICAgIGlkOiBcIndpa2lcIixcbiAgICAgIGNvbnRlbnQ6IFwiV2lraVwiLFxuICAgICAgdGl0bGU6IFwiVmlldyBhbmQgZWRpdCB3aWtpIHBhZ2VzXCIsXG4gICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gV2lraS5pc1dpa2lFbmFibGVkKHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKSxcbiAgICAgIGhyZWY6ICgpID0+IFwiIy93aWtpL3ZpZXdcIixcbiAgICAgIGlzQWN0aXZlOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gd29ya3NwYWNlLmlzTGlua0FjdGl2ZShcIi93aWtpXCIpICYmICF3b3Jrc3BhY2UubGlua0NvbnRhaW5zKFwiZmFicmljXCIsIFwicHJvZmlsZXNcIikgJiYgIXdvcmtzcGFjZS5saW5rQ29udGFpbnMoXCJlZGl0RmVhdHVyZXNcIilcbiAgICB9O1xuICAgIHdvcmtzcGFjZS50b3BMZXZlbFRhYnMucHVzaCh0YWIpO1xuKi9cblxuICAgIC8vIGFkZCBlbXB0eSByZWdleHMgdG8gdGVtcGxhdGVzIHRoYXQgZG9uJ3QgZGVmaW5lXG4gICAgLy8gdGhlbSBzbyBuZy1wYXR0ZXJuIGRvZXNuJ3QgYmFyZlxuICAgIFdpa2kuZG9jdW1lbnRUZW1wbGF0ZXMuZm9yRWFjaCgodGVtcGxhdGU6IGFueSkgPT4ge1xuICAgICAgaWYgKCF0ZW1wbGF0ZVsncmVnZXgnXSkge1xuICAgICAgICB0ZW1wbGF0ZS5yZWdleCA9IC8oPzopLztcbiAgICAgIH1cbiAgICB9KTtcblxuICB9XSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3dpa2lQbHVnaW4udHNcIi8+XG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IHZhciBDYW1lbENvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkNhbWVsQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkcm9vdFNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGNvbXBpbGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcImxvY2FsU3RvcmFnZVwiLCAoJHNjb3BlLCAkcm9vdFNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgJGNvbXBpbGUsICR0ZW1wbGF0ZUNhY2hlLCBsb2NhbFN0b3JhZ2U6V2luZG93TG9jYWxTdG9yYWdlKSA9PiB7XG5cbiAgICAvLyBUT0RPIFJFTU9WRVxuICAgIHZhciBqb2xva2lhID0gbnVsbDtcbiAgICB2YXIgam9sb2tpYVN0YXR1cyA9IG51bGw7XG4gICAgdmFyIGpteFRyZWVMYXp5TG9hZFJlZ2lzdHJ5ID0gbnVsbDtcbiAgICB2YXIgdXNlckRldGFpbHMgPSBudWxsO1xuICAgIHZhciBIYXd0aW9OYXYgPSBudWxsO1xuICAgIHZhciB3b3Jrc3BhY2UgPSBuZXcgV29ya3NwYWNlKGpvbG9raWEsIGpvbG9raWFTdGF0dXMsIGpteFRyZWVMYXp5TG9hZFJlZ2lzdHJ5LCAkbG9jYXRpb24sICRjb21waWxlLCAkdGVtcGxhdGVDYWNoZSwgbG9jYWxTdG9yYWdlLCAkcm9vdFNjb3BlLCB1c2VyRGV0YWlscywgSGF3dGlvTmF2KTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIENhbWVsLmluaXRFbmRwb2ludENob29zZXJTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgbG9jYWxTdG9yYWdlLCB3b3Jrc3BhY2UsIGpvbG9raWEpO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5zY2hlbWEgPSBDYW1lbC5nZXRDb25maWd1cmVkQ2FtZWxNb2RlbCgpO1xuICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLnN3aXRjaFRvQ2FudmFzVmlldyA9IG5ldyBVSS5EaWFsb2coKTtcblxuICAgICRzY29wZS5maW5kUHJvZmlsZUNhbWVsQ29udGV4dCA9IHRydWU7XG4gICAgJHNjb3BlLmNhbWVsU2VsZWN0aW9uRGV0YWlscyA9IHtcbiAgICAgIHNlbGVjdGVkQ2FtZWxDb250ZXh0SWQ6IG51bGwsXG4gICAgICBzZWxlY3RlZFJvdXRlSWQ6IG51bGxcbiAgICB9O1xuXG4gICAgJHNjb3BlLmlzVmFsaWQgPSAobmF2KSA9PiB7XG4gICAgICByZXR1cm4gbmF2ICYmIG5hdi5pc1ZhbGlkKHdvcmtzcGFjZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jYW1lbFN1YkxldmVsVGFicyA9IFtcbiAgICAgIHtcbiAgICAgICAgY29udGVudDogJzxpIGNsYXNzPVwiZmEgZmEtcGljdHVyZS1vXCI+PC9pPiBDYW52YXMnLFxuICAgICAgICB0aXRsZTogXCJFZGl0IHRoZSBkaWFncmFtIGluIGEgZHJhZ2d5IGRyb3BweSB3YXlcIixcbiAgICAgICAgaXNWYWxpZDogKHdvcmtzcGFjZTpXb3Jrc3BhY2UpID0+IHRydWUsXG4gICAgICAgIGhyZWY6ICgpID0+IFdpa2kuc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9jYW1lbC9jYW52YXMvXCIgKyAkc2NvcGUucGFnZUlkXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBjb250ZW50OiAnPGkgY2xhc3M9XCJmYSBmYS10cmVlXCI+PC9pPiBUcmVlJyxcbiAgICAgICAgdGl0bGU6IFwiVmlldyB0aGUgcm91dGVzIGFzIGEgdHJlZVwiLFxuICAgICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gdHJ1ZSxcbiAgICAgICAgaHJlZjogKCkgPT4gV2lraS5zdGFydExpbmsoJHNjb3BlKSArIFwiL2NhbWVsL3Byb3BlcnRpZXMvXCIgKyAkc2NvcGUucGFnZUlkXG4gICAgICB9LyosXG4gICAgICAge1xuICAgICAgIGNvbnRlbnQ6ICc8aSBjbGFzcz1cImZhIGZhLXNpdGVtYXBcIj48L2k+IERpYWdyYW0nLFxuICAgICAgIHRpdGxlOiBcIlZpZXcgYSBkaWFncmFtIG9mIHRoZSByb3V0ZVwiLFxuICAgICAgIGlzVmFsaWQ6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiB0cnVlLFxuICAgICAgIGhyZWY6ICgpID0+IFdpa2kuc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9jYW1lbC9kaWFncmFtL1wiICsgJHNjb3BlLnBhZ2VJZFxuICAgICAgIH0sKi9cbiAgICBdO1xuXG4gICAgdmFyIHJvdXRlTW9kZWwgPSBfYXBhY2hlQ2FtZWxNb2RlbC5kZWZpbml0aW9ucy5yb3V0ZTtcbiAgICByb3V0ZU1vZGVsW1wiX2lkXCJdID0gXCJyb3V0ZVwiO1xuXG4gICAgJHNjb3BlLmFkZERpYWxvZyA9IG5ldyBVSS5EaWFsb2coKTtcblxuICAgIC8vIFRPRE8gZG9lc24ndCBzZWVtIHRoYXQgYW5ndWxhci11aSB1c2VzIHRoZXNlP1xuICAgICRzY29wZS5hZGREaWFsb2cub3B0aW9uc1tcImRpYWxvZ0NsYXNzXCJdID0gXCJtb2RhbC1sYXJnZVwiO1xuICAgICRzY29wZS5hZGREaWFsb2cub3B0aW9uc1tcImNzc0NsYXNzXCJdID0gXCJtb2RhbC1sYXJnZVwiO1xuXG4gICAgJHNjb3BlLnBhbGV0dGVJdGVtU2VhcmNoID0gXCJcIjtcbiAgICAkc2NvcGUucGFsZXR0ZVRyZWUgPSBuZXcgRm9sZGVyKFwiUGFsZXR0ZVwiKTtcbiAgICAkc2NvcGUucGFsZXR0ZUFjdGl2YXRpb25zID0gW1wiUm91dGluZ19hZ2dyZWdhdGVcIl07XG5cbiAgICAvLyBsb2FkICRzY29wZS5wYWxldHRlVHJlZVxuICAgIGFuZ3VsYXIuZm9yRWFjaChfYXBhY2hlQ2FtZWxNb2RlbC5kZWZpbml0aW9ucywgKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgIGlmICh2YWx1ZS5ncm91cCkge1xuICAgICAgICB2YXIgZ3JvdXAgPSAoa2V5ID09PSBcInJvdXRlXCIpID8gJHNjb3BlLnBhbGV0dGVUcmVlIDogJHNjb3BlLnBhbGV0dGVUcmVlLmdldE9yRWxzZSh2YWx1ZS5ncm91cCk7XG4gICAgICAgIGlmICghZ3JvdXAua2V5KSB7XG4gICAgICAgICAgZ3JvdXAua2V5ID0gdmFsdWUuZ3JvdXA7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVbXCJfaWRcIl0gPSBrZXk7XG4gICAgICAgIHZhciB0aXRsZSA9IHZhbHVlW1widGl0bGVcIl0gfHwga2V5O1xuICAgICAgICB2YXIgbm9kZSA9IG5ldyBGb2xkZXIodGl0bGUpO1xuICAgICAgICBub2RlLmtleSA9IGdyb3VwLmtleSArIFwiX1wiICsga2V5O1xuICAgICAgICBub2RlW1wibm9kZU1vZGVsXCJdID0gdmFsdWU7XG4gICAgICAgIHZhciBpbWFnZVVybCA9IENhbWVsLmdldFJvdXRlTm9kZUljb24odmFsdWUpO1xuICAgICAgICBub2RlLmljb24gPSBpbWFnZVVybDtcbiAgICAgICAgLy8gY29tcGlsZXIgd2FzIGNvbXBsYWluaW5nIGFib3V0ICdsYWJlbCcgaGFkIG5vIGlkZWEgd2hlcmUgaXQncyBjb21pbmcgZnJvbVxuICAgICAgICAvLyB2YXIgdG9vbHRpcCA9IHZhbHVlW1widG9vbHRpcFwiXSB8fCB2YWx1ZVtcImRlc2NyaXB0aW9uXCJdIHx8IGxhYmVsO1xuICAgICAgICB2YXIgdG9vbHRpcCA9IHZhbHVlW1widG9vbHRpcFwiXSB8fCB2YWx1ZVtcImRlc2NyaXB0aW9uXCJdIHx8ICcnO1xuICAgICAgICBub2RlLnRvb2x0aXAgPSB0b29sdGlwO1xuXG4gICAgICAgIGdyb3VwLmNoaWxkcmVuLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBsb2FkICRzY29wZS5jb21wb25lbnRUcmVlXG4gICAgJHNjb3BlLmNvbXBvbmVudFRyZWUgPSBuZXcgRm9sZGVyKFwiRW5kcG9pbnRzXCIpO1xuXG4gICAgJHNjb3BlLiR3YXRjaChcImNvbXBvbmVudE5hbWVzXCIsICgpID0+IHtcbiAgICAgIHZhciBjb21wb25lbnROYW1lcyA9ICRzY29wZS5jb21wb25lbnROYW1lcztcbiAgICAgIGlmIChjb21wb25lbnROYW1lcyAmJiBjb21wb25lbnROYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLmNvbXBvbmVudFRyZWUgPSBuZXcgRm9sZGVyKFwiRW5kcG9pbnRzXCIpO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmNvbXBvbmVudE5hbWVzLCAoZW5kcG9pbnROYW1lKSA9PiB7XG4gICAgICAgICAgdmFyIGNhdGVnb3J5ID0gQ2FtZWwuZ2V0RW5kcG9pbnRDYXRlZ29yeShlbmRwb2ludE5hbWUpO1xuICAgICAgICAgIHZhciBncm91cE5hbWUgPSBjYXRlZ29yeS5sYWJlbCB8fCBcIkNvcmVcIjtcbiAgICAgICAgICB2YXIgZ3JvdXBLZXkgPSBjYXRlZ29yeS5pZCB8fCBncm91cE5hbWU7XG4gICAgICAgICAgdmFyIGdyb3VwID0gJHNjb3BlLmNvbXBvbmVudFRyZWUuZ2V0T3JFbHNlKGdyb3VwTmFtZSk7XG5cbiAgICAgICAgICB2YXIgdmFsdWUgPSBDYW1lbC5nZXRFbmRwb2ludENvbmZpZyhlbmRwb2ludE5hbWUsIGNhdGVnb3J5KTtcbiAgICAgICAgICB2YXIga2V5ID0gZW5kcG9pbnROYW1lO1xuICAgICAgICAgIHZhciBsYWJlbCA9IHZhbHVlW1wibGFiZWxcIl0gfHwgZW5kcG9pbnROYW1lO1xuICAgICAgICAgIHZhciBub2RlID0gbmV3IEZvbGRlcihsYWJlbCk7XG4gICAgICAgICAgbm9kZS5rZXkgPSBncm91cEtleSArIFwiX1wiICsga2V5O1xuICAgICAgICAgIG5vZGUua2V5ID0ga2V5O1xuICAgICAgICAgIG5vZGVbXCJub2RlTW9kZWxcIl0gPSB2YWx1ZTtcbiAgICAgICAgICB2YXIgdG9vbHRpcCA9IHZhbHVlW1widG9vbHRpcFwiXSB8fCB2YWx1ZVtcImRlc2NyaXB0aW9uXCJdIHx8IGxhYmVsO1xuICAgICAgICAgIHZhciBpbWFnZVVybCA9IENvcmUudXJsKHZhbHVlW1wiaWNvblwiXSB8fCBDYW1lbC5lbmRwb2ludEljb24pO1xuICAgICAgICAgIG5vZGUuaWNvbiA9IGltYWdlVXJsO1xuICAgICAgICAgIG5vZGUudG9vbHRpcCA9IHRvb2x0aXA7XG5cbiAgICAgICAgICBncm91cC5jaGlsZHJlbi5wdXNoKG5vZGUpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAkc2NvcGUuY29tcG9uZW50QWN0aXZhdGlvbnMgPSBbXCJiZWFuXCJdO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnYWRkRGlhbG9nLnNob3cnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoJHNjb3BlLmFkZERpYWxvZy5zaG93KSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICQoJyNzdWJtaXQnKS5mb2N1cygpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKFwiaGF3dGlvLmZvcm0ubW9kZWxDaGFuZ2VcIiwgb25Nb2RlbENoYW5nZUV2ZW50KTtcblxuICAgICRzY29wZS5vblJvb3RUcmVlTm9kZSA9IChyb290VHJlZU5vZGUpID0+IHtcbiAgICAgICRzY29wZS5yb290VHJlZU5vZGUgPSByb290VHJlZU5vZGU7XG4gICAgICAvLyByZXN0b3JlIHRoZSByZWFsIGRhdGEgYXQgdGhlIHJvb3QgZm9yIHNhdmluZyB0aGUgZG9jIGV0Y1xuICAgICAgcm9vdFRyZWVOb2RlLmRhdGEgPSAkc2NvcGUuY2FtZWxDb250ZXh0VHJlZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmFkZE5vZGUgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLm5vZGVYbWxOb2RlKSB7XG4gICAgICAgICRzY29wZS5hZGREaWFsb2cub3BlbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWRkTmV3Tm9kZShyb3V0ZU1vZGVsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uUGFsZXR0ZVNlbGVjdCA9IChub2RlKSA9PiB7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSA9IChub2RlICYmIG5vZGVbXCJub2RlTW9kZWxcIl0pID8gbm9kZSA6IG51bGw7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSA9IG51bGw7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoXCJTZWxlY3RlZCBcIiArICRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlICsgXCIgOiBcIiArICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub25Db21wb25lbnRTZWxlY3QgPSAobm9kZSkgPT4ge1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSA9IChub2RlICYmIG5vZGVbXCJub2RlTW9kZWxcIl0pID8gbm9kZSA6IG51bGw7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSkge1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSA9IG51bGw7XG4gICAgICAgIHZhciBub2RlTmFtZSA9IG5vZGUua2V5O1xuICAgICAgICBsb2cuZGVidWcoXCJsb2FkaW5nIGVuZHBvaW50IHNjaGVtYSBmb3Igbm9kZSBcIiArIG5vZGVOYW1lKTtcbiAgICAgICAgJHNjb3BlLmxvYWRFbmRwb2ludFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5hbWUgPSBub2RlTmFtZTtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcIlNlbGVjdGVkIFwiICsgJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUgKyBcIiA6IFwiICsgJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5zZWxlY3RlZE5vZGVNb2RlbCA9ICgpID0+IHtcbiAgICAgIHZhciBub2RlTW9kZWwgPSBudWxsO1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlKSB7XG4gICAgICAgIG5vZGVNb2RlbCA9ICRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlW1wibm9kZU1vZGVsXCJdO1xuICAgICAgICAkc2NvcGUuZW5kcG9pbnRDb25maWcgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICgkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlKSB7XG4gICAgICAgIC8vIFRPRE8gbGVzdCBjcmVhdGUgYW4gZW5kcG9pbnQgbm9kZU1vZGVsIGFuZCBhc3NvY2lhdGVcbiAgICAgICAgLy8gdGhlIGR1bW15IFVSTCBhbmQgcHJvcGVydGllcyBldGMuLi5cbiAgICAgICAgdmFyIGVuZHBvaW50Q29uZmlnID0gJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZVtcIm5vZGVNb2RlbFwiXTtcbiAgICAgICAgdmFyIGVuZHBvaW50U2NoZW1hID0gJHNjb3BlLmVuZHBvaW50U2NoZW1hO1xuICAgICAgICBub2RlTW9kZWwgPSAkc2NvcGUuc2NoZW1hLmRlZmluaXRpb25zLmVuZHBvaW50O1xuICAgICAgICAkc2NvcGUuZW5kcG9pbnRDb25maWcgPSB7XG4gICAgICAgICAga2V5OiAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlLmtleSxcbiAgICAgICAgICBzY2hlbWE6IGVuZHBvaW50U2NoZW1hLFxuICAgICAgICAgIGRldGFpbHM6IGVuZHBvaW50Q29uZmlnXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4gbm9kZU1vZGVsO1xuICAgIH07XG5cbiAgICAkc2NvcGUuYWRkQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgbm9kZU1vZGVsID0gJHNjb3BlLnNlbGVjdGVkTm9kZU1vZGVsKCk7XG4gICAgICBpZiAobm9kZU1vZGVsKSB7XG4gICAgICAgIGFkZE5ld05vZGUobm9kZU1vZGVsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIldBUk5JTkc6IG5vIG5vZGVNb2RlbCFcIik7XG4gICAgICB9XG4gICAgICAkc2NvcGUuYWRkRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5yZW1vdmVOb2RlID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZEZvbGRlciAmJiAkc2NvcGUudHJlZU5vZGUpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRm9sZGVyLmRldGFjaCgpO1xuICAgICAgICAkc2NvcGUudHJlZU5vZGUucmVtb3ZlKCk7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZEZvbGRlciA9IG51bGw7XG4gICAgICAgICRzY29wZS50cmVlTm9kZSA9IG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jYW5EZWxldGUgPSAoKSA9PiB7XG4gICAgICByZXR1cm4gJHNjb3BlLnNlbGVjdGVkRm9sZGVyID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH07XG5cbiAgICAkc2NvcGUuaXNBY3RpdmUgPSAobmF2KSA9PiB7XG4gICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyhuYXYpKVxuICAgICAgICByZXR1cm4gd29ya3NwYWNlLmlzTGlua0FjdGl2ZShuYXYpO1xuICAgICAgdmFyIGZuID0gbmF2LmlzQWN0aXZlO1xuICAgICAgaWYgKGZuKSB7XG4gICAgICAgIHJldHVybiBmbih3b3Jrc3BhY2UpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHdvcmtzcGFjZS5pc0xpbmtBY3RpdmUobmF2LmhyZWYoKSk7XG4gICAgfTtcblxuICAgICRzY29wZS5zYXZlID0gKCkgPT4ge1xuICAgICAgLy8gZ2VuZXJhdGUgdGhlIG5ldyBYTUxcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQgJiYgJHNjb3BlLnJvb3RUcmVlTm9kZSkge1xuICAgICAgICB2YXIgeG1sTm9kZSA9IENhbWVsLmdlbmVyYXRlWG1sRnJvbUZvbGRlcigkc2NvcGUucm9vdFRyZWVOb2RlKTtcbiAgICAgICAgaWYgKHhtbE5vZGUpIHtcbiAgICAgICAgICB2YXIgdGV4dCA9IENvcmUueG1sTm9kZVRvU3RyaW5nKHhtbE5vZGUpO1xuICAgICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICAvLyBsZXRzIHNhdmUgdGhlIGZpbGUuLi5cbiAgICAgICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gJHNjb3BlLmNvbW1pdE1lc3NhZ2UgfHwgXCJVcGRhdGVkIHBhZ2UgXCIgKyAkc2NvcGUucGFnZUlkO1xuICAgICAgICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCB0ZXh0LCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShzdGF0dXMpO1xuICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJTYXZlZCBcIiArICRzY29wZS5wYWdlSWQpO1xuICAgICAgICAgICAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgZ29Ub1ZpZXcoKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgbG9nLmRlYnVnKFwiY2FuY2VsbGluZy4uLlwiKTtcbiAgICAgIC8vIFRPRE8gc2hvdyBkaWFsb2cgaWYgZm9sa3MgYXJlIGFib3V0IHRvIGxvc2UgY2hhbmdlcy4uLlxuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKCd3b3Jrc3BhY2UudHJlZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghJHNjb3BlLmdpdCkge1xuICAgICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgICAvL2xvZy5kZWJ1ZyhcIlJlbG9hZGluZyB0aGUgdmlldyBhcyB3ZSBub3cgc2VlbSB0byBoYXZlIGEgZ2l0IG1iZWFuIVwiKTtcbiAgICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBnZXRGb2xkZXJYbWxOb2RlKHRyZWVOb2RlKSB7XG4gICAgICB2YXIgcm91dGVYbWxOb2RlID0gQ2FtZWwuY3JlYXRlRm9sZGVyWG1sVHJlZSh0cmVlTm9kZSwgbnVsbCk7XG4gICAgICBpZiAocm91dGVYbWxOb2RlKSB7XG4gICAgICAgICRzY29wZS5ub2RlWG1sTm9kZSA9IHJvdXRlWG1sTm9kZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByb3V0ZVhtbE5vZGU7XG4gICAgfVxuXG4gICAgJHNjb3BlLm9uTm9kZVNlbGVjdCA9IChmb2xkZXIsIHRyZWVOb2RlKSA9PiB7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgPSBmb2xkZXI7XG4gICAgICAkc2NvcGUudHJlZU5vZGUgPSB0cmVlTm9kZTtcbiAgICAgICRzY29wZS5wcm9wZXJ0aWVzVGVtcGxhdGUgPSBudWxsO1xuICAgICAgJHNjb3BlLmRpYWdyYW1UZW1wbGF0ZSA9IG51bGw7XG4gICAgICAkc2NvcGUubm9kZVhtbE5vZGUgPSBudWxsO1xuICAgICAgaWYgKGZvbGRlcikge1xuICAgICAgICAkc2NvcGUubm9kZURhdGEgPSBDYW1lbC5nZXRSb3V0ZUZvbGRlckpTT04oZm9sZGVyKTtcbiAgICAgICAgJHNjb3BlLm5vZGVEYXRhQ2hhbmdlZEZpZWxkcyA9IHt9O1xuICAgICAgfVxuICAgICAgdmFyIG5vZGVOYW1lID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQoZm9sZGVyKTtcbiAgICAgIC8vIGxldHMgbGF6aWx5IGNyZWF0ZSB0aGUgWE1MIHRyZWUgc28gaXQgY2FuIGJlIHVzZWQgYnkgdGhlIGRpYWdyYW1cbiAgICAgIHZhciByb3V0ZVhtbE5vZGUgPSBnZXRGb2xkZXJYbWxOb2RlKHRyZWVOb2RlKTtcbiAgICAgIGlmIChub2RlTmFtZSkge1xuICAgICAgICAvL3ZhciBub2RlTmFtZSA9IHJvdXRlWG1sTm9kZS5sb2NhbE5hbWU7XG4gICAgICAgICRzY29wZS5ub2RlTW9kZWwgPSBDYW1lbC5nZXRDYW1lbFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgIGlmICgkc2NvcGUubm9kZU1vZGVsKSB7XG4gICAgICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IFwicGx1Z2lucy93aWtpL2h0bWwvY2FtZWxQcm9wZXJ0aWVzRWRpdC5odG1sXCI7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmRpYWdyYW1UZW1wbGF0ZSA9IFwiYXBwL2NhbWVsL2h0bWwvcm91dGVzLmh0bWxcIjtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uTm9kZURyYWdFbnRlciA9IChub2RlLCBzb3VyY2VOb2RlKSA9PiB7XG4gICAgICB2YXIgbm9kZUZvbGRlciA9IG5vZGUuZGF0YTtcbiAgICAgIHZhciBzb3VyY2VGb2xkZXIgPSBzb3VyY2VOb2RlLmRhdGE7XG4gICAgICBpZiAobm9kZUZvbGRlciAmJiBzb3VyY2VGb2xkZXIpIHtcbiAgICAgICAgdmFyIG5vZGVJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKG5vZGVGb2xkZXIpO1xuICAgICAgICB2YXIgc291cmNlSWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChzb3VyY2VGb2xkZXIpO1xuICAgICAgICBpZiAobm9kZUlkICYmIHNvdXJjZUlkKSB7XG4gICAgICAgICAgLy8gd2UgY2FuIG9ubHkgZHJhZyByb3V0ZXMgb250byBvdGhlciByb3V0ZXMgKGJlZm9yZSAvIGFmdGVyIC8gb3ZlcilcbiAgICAgICAgICBpZiAoc291cmNlSWQgPT09IFwicm91dGVcIikge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGVJZCA9PT0gXCJyb3V0ZVwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICAkc2NvcGUub25Ob2RlRHJvcCA9IChub2RlLCBzb3VyY2VOb2RlLCBoaXRNb2RlLCB1aSwgZHJhZ2dhYmxlKSA9PiB7XG4gICAgICB2YXIgbm9kZUZvbGRlciA9IG5vZGUuZGF0YTtcbiAgICAgIHZhciBzb3VyY2VGb2xkZXIgPSBzb3VyY2VOb2RlLmRhdGE7XG4gICAgICBpZiAobm9kZUZvbGRlciAmJiBzb3VyY2VGb2xkZXIpIHtcbiAgICAgICAgLy8gd2UgY2Fubm90IGRyb3AgYSByb3V0ZSBpbnRvIGEgcm91dGUgb3IgYSBub24tcm91dGUgdG8gYSB0b3AgbGV2ZWwhXG4gICAgICAgIHZhciBub2RlSWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChub2RlRm9sZGVyKTtcbiAgICAgICAgdmFyIHNvdXJjZUlkID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQoc291cmNlRm9sZGVyKTtcblxuICAgICAgICBpZiAobm9kZUlkID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAvLyBoaXRNb2RlIG11c3QgYmUgXCJvdmVyXCIgaWYgd2UgYXJlIG5vdCBhbm90aGVyIHJvdXRlXG4gICAgICAgICAgaWYgKHNvdXJjZUlkID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAgIGlmIChoaXRNb2RlID09PSBcIm92ZXJcIikge1xuICAgICAgICAgICAgICBoaXRNb2RlID0gXCJhZnRlclwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBkaXNhYmxlIGJlZm9yZSAvIGFmdGVyXG4gICAgICAgICAgICBoaXRNb2RlID0gXCJvdmVyXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmIChDYW1lbC5hY2NlcHRPdXRwdXQobm9kZUlkKSkge1xuICAgICAgICAgICAgaGl0TW9kZSA9IFwib3ZlclwiO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaGl0TW9kZSAhPT0gXCJiZWZvcmVcIikge1xuICAgICAgICAgICAgICBoaXRNb2RlID0gXCJhZnRlclwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsb2cuZGVidWcoXCJub2RlRHJvcCBub2RlSWQ6IFwiICsgbm9kZUlkICsgXCIgc291cmNlSWQ6IFwiICsgc291cmNlSWQgKyBcIiBoaXRNb2RlOiBcIiArIGhpdE1vZGUpO1xuXG4gICAgICAgIHNvdXJjZU5vZGUubW92ZShub2RlLCBoaXRNb2RlKTtcbiAgICAgIH1cbiAgICB9O1xuXG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiBhZGROZXdOb2RlKG5vZGVNb2RlbCkge1xuICAgICAgdmFyIGRvYyA9ICRzY29wZS5kb2MgfHwgZG9jdW1lbnQ7XG4gICAgICB2YXIgcGFyZW50Rm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyIHx8ICRzY29wZS5jYW1lbENvbnRleHRUcmVlO1xuICAgICAgdmFyIGtleSA9IG5vZGVNb2RlbFtcIl9pZFwiXTtcbiAgICAgIHZhciBiZWZvcmVOb2RlID0gbnVsbDtcbiAgICAgIGlmICgha2V5KSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIldBUk5JTkc6IG5vIGlkIGZvciBtb2RlbCBcIiArIEpTT04uc3RyaW5naWZ5KG5vZGVNb2RlbCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRyZWVOb2RlID0gJHNjb3BlLnRyZWVOb2RlO1xuICAgICAgICBpZiAoa2V5ID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAvLyBsZXRzIGFkZCB0byB0aGUgcm9vdCBvZiB0aGUgdHJlZVxuICAgICAgICAgIHRyZWVOb2RlID0gJHNjb3BlLnJvb3RUcmVlTm9kZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoIXRyZWVOb2RlKSB7XG4gICAgICAgICAgICAvLyBsZXRzIHNlbGVjdCB0aGUgbGFzdCByb3V0ZSAtIGFuZCBjcmVhdGUgYSBuZXcgcm91dGUgaWYgbmVlZCBiZVxuICAgICAgICAgICAgdmFyIHJvb3QgPSAkc2NvcGUucm9vdFRyZWVOb2RlO1xuICAgICAgICAgICAgdmFyIGNoaWxkcmVuID0gcm9vdC5nZXRDaGlsZHJlbigpO1xuICAgICAgICAgICAgaWYgKCFjaGlsZHJlbiB8fCAhY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIGFkZE5ld05vZGUoQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEoXCJyb3V0ZVwiKSk7XG4gICAgICAgICAgICAgIGNoaWxkcmVuID0gcm9vdC5nZXRDaGlsZHJlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICB0cmVlTm9kZSA9IGNoaWxkcmVuW2NoaWxkcmVuLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9nLmRlYnVnKFwiQ291bGQgbm90IGFkZCBhIG5ldyByb3V0ZSB0byB0aGUgZW1wdHkgdHJlZSFcIik7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cblxuICAgICAgICAgIC8vIGlmIHRoZSBwYXJlbnQgZm9sZGVyIGxpa2VzIHRvIGFjdCBhcyBhIHBpcGVsaW5lLCB0aGVuIGFkZFxuICAgICAgICAgIC8vIGFmdGVyIHRoZSBwYXJlbnQsIHJhdGhlciB0aGFuIGFzIGEgY2hpbGRcbiAgICAgICAgICB2YXIgcGFyZW50SWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZCh0cmVlTm9kZS5kYXRhKTtcbiAgICAgICAgICBpZiAoIUNhbWVsLmFjY2VwdE91dHB1dChwYXJlbnRJZCkpIHtcbiAgICAgICAgICAgIC8vIGxldHMgYWRkIHRoZSBuZXcgbm9kZSB0byB0aGUgZW5kIG9mIHRoZSBwYXJlbnRcbiAgICAgICAgICAgIGJlZm9yZU5vZGUgPSB0cmVlTm9kZS5nZXROZXh0U2libGluZygpO1xuICAgICAgICAgICAgdHJlZU5vZGUgPSB0cmVlTm9kZS5nZXRQYXJlbnQoKSB8fCB0cmVlTm9kZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyZWVOb2RlKSB7XG4gICAgICAgICAgdmFyIG5vZGUgPSBkb2MuY3JlYXRlRWxlbWVudChrZXkpO1xuICAgICAgICAgIHBhcmVudEZvbGRlciA9IHRyZWVOb2RlLmRhdGE7XG4gICAgICAgICAgdmFyIGFkZGVkTm9kZSA9IENhbWVsLmFkZFJvdXRlQ2hpbGQocGFyZW50Rm9sZGVyLCBub2RlKTtcbiAgICAgICAgICBpZiAoYWRkZWROb2RlKSB7XG4gICAgICAgICAgICB2YXIgYWRkZWQgPSB0cmVlTm9kZS5hZGRDaGlsZChhZGRlZE5vZGUsIGJlZm9yZU5vZGUpO1xuICAgICAgICAgICAgaWYgKGFkZGVkKSB7XG4gICAgICAgICAgICAgIGdldEZvbGRlclhtbE5vZGUoYWRkZWQpO1xuICAgICAgICAgICAgICBhZGRlZC5leHBhbmQodHJ1ZSk7XG4gICAgICAgICAgICAgIGFkZGVkLnNlbGVjdCh0cnVlKTtcbiAgICAgICAgICAgICAgYWRkZWQuYWN0aXZhdGUodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Nb2RlbENoYW5nZUV2ZW50KGV2ZW50LCBuYW1lKSB7XG4gICAgICAvLyBsZXRzIGZpbHRlciBvdXQgZXZlbnRzIGR1ZSB0byB0aGUgbm9kZSBjaGFuZ2luZyBjYXVzaW5nIHRoZVxuICAgICAgLy8gZm9ybXMgdG8gYmUgcmVjcmVhdGVkXG4gICAgICBpZiAoJHNjb3BlLm5vZGVEYXRhKSB7XG4gICAgICAgIHZhciBmaWVsZE1hcCA9ICRzY29wZS5ub2RlRGF0YUNoYW5nZWRGaWVsZHM7XG4gICAgICAgIGlmIChmaWVsZE1hcCkge1xuICAgICAgICAgIGlmIChmaWVsZE1hcFtuYW1lXSkge1xuICAgICAgICAgICAgb25Ob2RlRGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gdGhlIHNlbGVjdGlvbiBoYXMganVzdCBjaGFuZ2VkIHNvIHdlIGdldCB0aGUgaW5pdGlhbCBldmVudFxuICAgICAgICAgICAgLy8gd2UgY2FuIGlnbm9yZSB0aGlzIDopXG4gICAgICAgICAgICBmaWVsZE1hcFtuYW1lXSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Ob2RlRGF0YUNoYW5nZWQoKSB7XG4gICAgICAkc2NvcGUubW9kaWZpZWQgPSB0cnVlO1xuICAgICAgdmFyIHNlbGVjdGVkRm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyO1xuICAgICAgaWYgKCRzY29wZS50cmVlTm9kZSAmJiBzZWxlY3RlZEZvbGRlcikge1xuICAgICAgICB2YXIgcm91dGVYbWxOb2RlID0gZ2V0Rm9sZGVyWG1sTm9kZSgkc2NvcGUudHJlZU5vZGUpO1xuICAgICAgICBpZiAocm91dGVYbWxOb2RlKSB7XG4gICAgICAgICAgdmFyIG5vZGVOYW1lID0gcm91dGVYbWxOb2RlLmxvY2FsTmFtZTtcbiAgICAgICAgICB2YXIgbm9kZVNldHRpbmdzID0gQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEobm9kZU5hbWUpO1xuICAgICAgICAgIGlmIChub2RlU2V0dGluZ3MpIHtcbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgdGl0bGUgYW5kIHRvb2x0aXAgZXRjXG4gICAgICAgICAgICBDYW1lbC51cGRhdGVSb3V0ZU5vZGVMYWJlbEFuZFRvb2x0aXAoc2VsZWN0ZWRGb2xkZXIsIHJvdXRlWG1sTm9kZSwgbm9kZVNldHRpbmdzKTtcbiAgICAgICAgICAgICRzY29wZS50cmVlTm9kZS5yZW5kZXIoZmFsc2UsIGZhbHNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyBub3Qgc3VyZSB3ZSBuZWVkIHRoaXMgdG8gYmUgaG9uZXN0XG4gICAgICAgIHNlbGVjdGVkRm9sZGVyW1wiY2FtZWxOb2RlRGF0YVwiXSA9ICRzY29wZS5ub2RlRGF0YTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgIHZhciB0ZXh0ID0gcmVzcG9uc2UudGV4dDtcbiAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgIC8vIGxldHMgcmVtb3ZlIGFueSBkb2RneSBjaGFyYWN0ZXJzIHNvIHdlIGNhbiB1c2UgaXQgYXMgYSBET00gaWRcbiAgICAgICAgdmFyIHRyZWUgPSBDYW1lbC5sb2FkQ2FtZWxUcmVlKHRleHQsICRzY29wZS5wYWdlSWQpO1xuICAgICAgICBpZiAodHJlZSkge1xuICAgICAgICAgICRzY29wZS5jYW1lbENvbnRleHRUcmVlID0gdHJlZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gWE1MIGZvdW5kIGZvciBwYWdlIFwiICsgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseUxhdGVyKCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgICRzY29wZS5sb2FkRW5kcG9pbnROYW1lcygpO1xuICAgICAgJHNjb3BlLnBhZ2VJZCA9IFdpa2kucGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAgIGxvZy5kZWJ1ZyhcIkhhcyBwYWdlIGlkOiBcIiArICRzY29wZS5wYWdlSWQgKyBcIiB3aXRoICRyb3V0ZVBhcmFtcyBcIiArIEpTT04uc3RyaW5naWZ5KCRyb3V0ZVBhcmFtcykpO1xuXG4gICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsICRzY29wZS5vYmplY3RJZCwgb25SZXN1bHRzKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGdvVG9WaWV3KCkge1xuICAgICAgLy8gVE9ETyBsZXRzIG5hdmlnYXRlIHRvIHRoZSB2aWV3IGlmIHdlIGhhdmUgYSBzZXBhcmF0ZSB2aWV3IG9uZSBkYXkgOilcbiAgICAgIC8qXG4gICAgICAgaWYgKCRzY29wZS5icmVhZGNydW1icyAmJiAkc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoID4gMSkge1xuICAgICAgIHZhciB2aWV3TGluayA9ICRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMl07XG4gICAgICAgbG9nLmRlYnVnKFwiZ29Ub1ZpZXcgaGFzIGZvdW5kIHZpZXcgXCIgKyB2aWV3TGluayk7XG4gICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKHZpZXdMaW5rLCBcIiNcIik7XG4gICAgICAgJGxvY2F0aW9uLnBhdGgocGF0aCk7XG4gICAgICAgfSBlbHNlIHtcbiAgICAgICBsb2cuZGVidWcoXCJnb1RvVmlldyBoYXMgbm8gYnJlYWRjcnVtYnMhXCIpO1xuICAgICAgIH1cbiAgICAgICAqL1xuICAgIH1cblxuICAgICRzY29wZS5kb1N3aXRjaFRvQ2FudmFzVmlldyA9ICgpID0+IHtcbiAgICAgIHZhciBsaW5rID0gJGxvY2F0aW9uLnVybCgpLnJlcGxhY2UoL1xcL3Byb3BlcnRpZXNcXC8vLCAnL2NhbnZhcy8nKTtcbiAgICAgIGxvZy5kZWJ1ZyhcIkxpbms6IFwiLCBsaW5rKTtcbiAgICAgICRsb2NhdGlvbi51cmwobGluayk7XG4gICAgfTtcblxuICAgICRzY29wZS5jb25maXJtU3dpdGNoVG9DYW52YXNWaWV3ID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5tb2RpZmllZCkge1xuICAgICAgICAkc2NvcGUuc3dpdGNoVG9DYW52YXNWaWV3Lm9wZW4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5kb1N3aXRjaFRvQ2FudmFzVmlldygpO1xuICAgICAgfVxuICAgIH07XG5cbiAgfV0pO1xufVxuIiwiLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vd2lraVBsdWdpbi50c1wiLz5cbm1vZHVsZSBXaWtpIHtcbiAgZXhwb3J0IHZhciBDYW1lbENhbnZhc0NvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkNhbWVsQ2FudmFzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZWxlbWVudFwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJGludGVycG9sYXRlXCIsIFwiJGxvY2F0aW9uXCIsICgkc2NvcGUsICRlbGVtZW50LCAkcm91dGVQYXJhbXMsICR0ZW1wbGF0ZUNhY2hlLCAkaW50ZXJwb2xhdGUsICRsb2NhdGlvbikgPT4ge1xuICAgIHZhciBqc1BsdW1iSW5zdGFuY2UgPSBqc1BsdW1iLmdldEluc3RhbmNlKCk7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuYWRkRGlhbG9nID0gbmV3IFVJLkRpYWxvZygpO1xuICAgICRzY29wZS5wcm9wZXJ0aWVzRGlhbG9nID0gbmV3IFVJLkRpYWxvZygpO1xuICAgICRzY29wZS5zd2l0Y2hUb1RyZWVWaWV3ID0gbmV3IFVJLkRpYWxvZygpO1xuICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuICAgICRzY29wZS5jYW1lbElnbm9yZUlkRm9yTGFiZWwgPSBDYW1lbC5pZ25vcmVJZEZvckxhYmVsKGxvY2FsU3RvcmFnZSk7XG4gICAgJHNjb3BlLmNhbWVsTWF4aW11bUxhYmVsV2lkdGggPSBDYW1lbC5tYXhpbXVtTGFiZWxXaWR0aChsb2NhbFN0b3JhZ2UpO1xuICAgICRzY29wZS5jYW1lbE1heGltdW1UcmFjZU9yRGVidWdCb2R5TGVuZ3RoID0gQ2FtZWwubWF4aW11bVRyYWNlT3JEZWJ1Z0JvZHlMZW5ndGgobG9jYWxTdG9yYWdlKTtcblxuICAgICRzY29wZS5mb3JtcyA9IHt9O1xuXG4gICAgJHNjb3BlLm5vZGVUZW1wbGF0ZSA9ICRpbnRlcnBvbGF0ZSgkdGVtcGxhdGVDYWNoZS5nZXQoXCJub2RlVGVtcGxhdGVcIikpO1xuXG4gICAgJHNjb3BlLiR3YXRjaChcImNhbWVsQ29udGV4dFRyZWVcIiwgKCkgPT4ge1xuICAgICAgdmFyIHRyZWUgPSAkc2NvcGUuY2FtZWxDb250ZXh0VHJlZTtcbiAgICAgICRzY29wZS5yb290Rm9sZGVyID0gdHJlZTtcbiAgICAgIC8vIG5vdyB3ZSd2ZSBnb3QgY2lkIHZhbHVlcyBpbiB0aGUgdHJlZSBhbmQgRE9NLCBsZXRzIGNyZWF0ZSBhbiBpbmRleCBzbyB3ZSBjYW4gYmluZCB0aGUgRE9NIHRvIHRoZSB0cmVlIG1vZGVsXG4gICAgICAkc2NvcGUuZm9sZGVycyA9IENhbWVsLmFkZEZvbGRlcnNUb0luZGV4KCRzY29wZS5yb290Rm9sZGVyKTtcblxuICAgICAgdmFyIGRvYyA9IENvcmUucGF0aEdldCh0cmVlLCBbXCJ4bWxEb2N1bWVudFwiXSk7XG4gICAgICBpZiAoZG9jKSB7XG4gICAgICAgICRzY29wZS5kb2MgPSBkb2M7XG4gICAgICAgIHJlbG9hZFJvdXRlSWRzKCk7XG4gICAgICAgIG9uUm91dGVTZWxlY3Rpb25DaGFuZ2VkKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuYWRkQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgbm9kZU1vZGVsID0gJHNjb3BlLnNlbGVjdGVkTm9kZU1vZGVsKCk7XG4gICAgICBpZiAobm9kZU1vZGVsKSB7XG4gICAgICAgIGFkZE5ld05vZGUobm9kZU1vZGVsKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5hZGREaWFsb2cuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJlbW92ZU5vZGUgPSAoKSA9PiB7XG4gICAgICB2YXIgZm9sZGVyID0gZ2V0U2VsZWN0ZWRPclJvdXRlRm9sZGVyKCk7XG4gICAgICBpZiAoZm9sZGVyKSB7XG4gICAgICAgIHZhciBub2RlTmFtZSA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKGZvbGRlcik7XG4gICAgICAgIGZvbGRlci5kZXRhY2goKTtcbiAgICAgICAgaWYgKFwicm91dGVcIiA9PT0gbm9kZU5hbWUpIHtcbiAgICAgICAgICAvLyBsZXRzIGFsc28gY2xlYXIgdGhlIHNlbGVjdGVkIHJvdXRlIG5vZGVcbiAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB1cGRhdGVTZWxlY3Rpb24obnVsbCk7XG4gICAgICAgIHRyZWVNb2RpZmllZCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZG9MYXlvdXQgPSAoKSA9PiB7XG4gICAgICAkc2NvcGUuZHJhd25Sb3V0ZUlkID0gbnVsbDtcbiAgICAgIG9uUm91dGVTZWxlY3Rpb25DaGFuZ2VkKCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGlzUm91dGVPck5vZGUoKSB7XG4gICAgICByZXR1cm4gISRzY29wZS5zZWxlY3RlZEZvbGRlclxuICAgIH1cblxuICAgICRzY29wZS5nZXREZWxldGVUaXRsZSA9ICgpID0+IHtcbiAgICAgIGlmIChpc1JvdXRlT3JOb2RlKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiRGVsZXRlIHRoaXMgcm91dGVcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcIkRlbGV0ZSB0aGlzIG5vZGVcIjtcbiAgICB9XG5cbiAgICAkc2NvcGUuZ2V0RGVsZXRlVGFyZ2V0ID0gKCkgPT4ge1xuICAgICAgaWYgKGlzUm91dGVPck5vZGUoKSkge1xuICAgICAgICByZXR1cm4gXCJSb3V0ZVwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFwiTm9kZVwiO1xuICAgIH1cblxuICAgICRzY29wZS5pc0Zvcm1EaXJ0eSA9ICgpID0+IHtcbiAgICAgIGxvZy5kZWJ1ZyhcImVuZHBvaW50Rm9ybTogXCIsICRzY29wZS5lbmRwb2ludEZvcm0pO1xuICAgICAgaWYgKCRzY29wZS5lbmRwb2ludEZvcm0uJGRpcnR5KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKCEkc2NvcGUuZm9ybXNbJ2Zvcm1FZGl0b3InXSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJHNjb3BlLmZvcm1zWydmb3JtRWRpdG9yJ11bJyRkaXJ0eSddO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvKiBUT0RPXG4gICAgICRzY29wZS5yZXNldEZvcm1zID0gKCkgPT4ge1xuXG4gICAgIH1cbiAgICAgKi9cblxuICAgIC8qXG4gICAgICogQ29udmVydHMgYSBwYXRoIGFuZCBhIHNldCBvZiBlbmRwb2ludCBwYXJhbWV0ZXJzIGludG8gYSBVUkkgd2UgY2FuIHRoZW4gdXNlIHRvIHN0b3JlIGluIHRoZSBYTUxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVFbmRwb2ludFVSSShlbmRwb2ludFNjaGVtZTpzdHJpbmcsIHNsYXNoZXNUZXh0OnN0cmluZywgZW5kcG9pbnRQYXRoOnN0cmluZywgZW5kcG9pbnRQYXJhbWV0ZXJzOmFueSkge1xuICAgICAgbG9nLmRlYnVnKFwic2NoZW1lIFwiICsgZW5kcG9pbnRTY2hlbWUgKyBcIiBwYXRoIFwiICsgZW5kcG9pbnRQYXRoICsgXCIgcGFyYW1ldGVycyBcIiArIGVuZHBvaW50UGFyYW1ldGVycyk7XG4gICAgICAvLyBub3cgbGV0cyBjcmVhdGUgdGhlIG5ldyBVUkkgZnJvbSB0aGUgcGF0aCBhbmQgcGFyYW1ldGVyc1xuICAgICAgLy8gVE9ETyBzaG91bGQgd2UgdXNlIEpNWCBmb3IgdGhpcz9cbiAgICAgIHZhciB1cmkgPSAoKGVuZHBvaW50U2NoZW1lKSA/IGVuZHBvaW50U2NoZW1lICsgXCI6XCIgKyBzbGFzaGVzVGV4dCA6IFwiXCIpICsgKGVuZHBvaW50UGF0aCA/IGVuZHBvaW50UGF0aCA6IFwiXCIpO1xuICAgICAgdmFyIHBhcmFtVGV4dCA9IENvcmUuaGFzaFRvU3RyaW5nKGVuZHBvaW50UGFyYW1ldGVycyk7XG4gICAgICBpZiAocGFyYW1UZXh0KSB7XG4gICAgICAgIHVyaSArPSBcIj9cIiArIHBhcmFtVGV4dDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1cmk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnVwZGF0ZVByb3BlcnRpZXMgPSAoKSA9PiB7XG4gICAgICBsb2cuaW5mbyhcIm9sZCBVUkkgaXMgXCIgKyAkc2NvcGUubm9kZURhdGEudXJpKTtcbiAgICAgIHZhciB1cmkgPSBjcmVhdGVFbmRwb2ludFVSSSgkc2NvcGUuZW5kcG9pbnRTY2hlbWUsICgkc2NvcGUuZW5kcG9pbnRQYXRoSGFzU2xhc2hlcyA/IFwiLy9cIiA6IFwiXCIpLCAkc2NvcGUuZW5kcG9pbnRQYXRoLCAkc2NvcGUuZW5kcG9pbnRQYXJhbWV0ZXJzKTtcbiAgICAgIGxvZy5pbmZvKFwibmV3IFVSSSBpcyBcIiArIHVyaSk7XG4gICAgICBpZiAodXJpKSB7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YS51cmkgPSB1cmk7XG4gICAgICB9XG5cbiAgICAgIHZhciBrZXkgPSBudWxsO1xuICAgICAgdmFyIHNlbGVjdGVkRm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyO1xuICAgICAgaWYgKHNlbGVjdGVkRm9sZGVyKSB7XG4gICAgICAgIGtleSA9IHNlbGVjdGVkRm9sZGVyLmtleTtcblxuICAgICAgICAvLyBsZXRzIGRlbGV0ZSB0aGUgY3VycmVudCBzZWxlY3RlZCBub2RlJ3MgZGl2IHNvIGl0cyB1cGRhdGVkIHdpdGggdGhlIG5ldyB0ZW1wbGF0ZSB2YWx1ZXNcbiAgICAgICAgdmFyIGVsZW1lbnRzID0gJGVsZW1lbnQuZmluZChcIi5jYW52YXNcIikuZmluZChcIltpZD0nXCIgKyBrZXkgKyBcIiddXCIpLmZpcnN0KCkucmVtb3ZlKCk7XG4gICAgICB9XG5cbiAgICAgIHRyZWVNb2RpZmllZCgpO1xuXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHVwZGF0ZVNlbGVjdGlvbihrZXkpXG4gICAgICB9XG5cbiAgICAgIGlmICgkc2NvcGUuaXNGb3JtRGlydHkoKSkge1xuICAgICAgICAkc2NvcGUuZW5kcG9pbnRGb3JtLiRzZXRQcmlzdGluZSgpO1xuICAgICAgICBpZiAoJHNjb3BlLmZvcm1zWydmb3JtRWRpdG9yJ10pIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybXNbJ2Zvcm1FZGl0b3InXS4kc2V0UHJpc3RpbmUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZSA9ICgpID0+IHtcbiAgICAgIC8vIGdlbmVyYXRlIHRoZSBuZXcgWE1MXG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkICYmICRzY29wZS5yb290Rm9sZGVyKSB7XG4gICAgICAgIHZhciB4bWxOb2RlID0gQ2FtZWwuZ2VuZXJhdGVYbWxGcm9tRm9sZGVyKCRzY29wZS5yb290Rm9sZGVyKTtcbiAgICAgICAgaWYgKHhtbE5vZGUpIHtcbiAgICAgICAgICB2YXIgdGV4dCA9IENvcmUueG1sTm9kZVRvU3RyaW5nKHhtbE5vZGUpO1xuICAgICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICB2YXIgZGVjb2RlZCA9IGRlY29kZVVSSUNvbXBvbmVudCh0ZXh0KTtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIlNhdmluZyB4bWwgZGVjb2RlZDogXCIgKyBkZWNvZGVkKTtcblxuICAgICAgICAgICAgLy8gbGV0cyBzYXZlIHRoZSBmaWxlLi4uXG4gICAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9ICRzY29wZS5jb21taXRNZXNzYWdlIHx8IFwiVXBkYXRlZCBwYWdlIFwiICsgJHNjb3BlLnBhZ2VJZDtcbiAgICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgZGVjb2RlZCwgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiU2F2ZWQgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICAgICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIGxvZy5kZWJ1ZyhcImNhbmNlbGxpbmcuLi5cIik7XG4gICAgICAvLyBUT0RPIHNob3cgZGlhbG9nIGlmIGZvbGtzIGFyZSBhYm91dCB0byBsb3NlIGNoYW5nZXMuLi5cbiAgICB9O1xuXG4gICAgJHNjb3BlLiR3YXRjaChcInNlbGVjdGVkUm91dGVJZFwiLCBvblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCk7XG5cbiAgICBmdW5jdGlvbiBnb1RvVmlldygpIHtcbiAgICAgIC8vIFRPRE8gbGV0cyBuYXZpZ2F0ZSB0byB0aGUgdmlldyBpZiB3ZSBoYXZlIGEgc2VwYXJhdGUgdmlldyBvbmUgZGF5IDopXG4gICAgICAvKlxuICAgICAgIGlmICgkc2NvcGUuYnJlYWRjcnVtYnMgJiYgJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCA+IDEpIHtcbiAgICAgICB2YXIgdmlld0xpbmsgPSAkc2NvcGUuYnJlYWRjcnVtYnNbJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCAtIDJdO1xuICAgICAgIGxvZy5kZWJ1ZyhcImdvVG9WaWV3IGhhcyBmb3VuZCB2aWV3IFwiICsgdmlld0xpbmspO1xuICAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyh2aWV3TGluaywgXCIjXCIpO1xuICAgICAgICRsb2NhdGlvbi5wYXRoKHBhdGgpO1xuICAgICAgIH0gZWxzZSB7XG4gICAgICAgbG9nLmRlYnVnKFwiZ29Ub1ZpZXcgaGFzIG5vIGJyZWFkY3J1bWJzIVwiKTtcbiAgICAgICB9XG4gICAgICAgKi9cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGROZXdOb2RlKG5vZGVNb2RlbCkge1xuICAgICAgdmFyIGRvYyA9ICRzY29wZS5kb2MgfHwgZG9jdW1lbnQ7XG4gICAgICB2YXIgcGFyZW50Rm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyIHx8ICRzY29wZS5yb290Rm9sZGVyO1xuICAgICAgdmFyIGtleSA9IG5vZGVNb2RlbFtcIl9pZFwiXTtcbiAgICAgIGlmICgha2V5KSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIldBUk5JTkc6IG5vIGlkIGZvciBtb2RlbCBcIiArIEpTT04uc3RyaW5naWZ5KG5vZGVNb2RlbCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRyZWVOb2RlID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyO1xuICAgICAgICBpZiAoa2V5ID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAvLyBsZXRzIGFkZCB0byB0aGUgcm9vdCBvZiB0aGUgdHJlZVxuICAgICAgICAgIHRyZWVOb2RlID0gJHNjb3BlLnJvb3RGb2xkZXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKCF0cmVlTm9kZSkge1xuICAgICAgICAgICAgLy8gbGV0cyBzZWxlY3QgdGhlIGxhc3Qgcm91dGUgLSBhbmQgY3JlYXRlIGEgbmV3IHJvdXRlIGlmIG5lZWQgYmVcbiAgICAgICAgICAgIHZhciByb290ID0gJHNjb3BlLnJvb3RGb2xkZXI7XG4gICAgICAgICAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuO1xuICAgICAgICAgICAgaWYgKCFjaGlsZHJlbiB8fCAhY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIGFkZE5ld05vZGUoQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEoXCJyb3V0ZVwiKSk7XG4gICAgICAgICAgICAgIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdHJlZU5vZGUgPSBnZXRSb3V0ZUZvbGRlcigkc2NvcGUucm9vdEZvbGRlciwgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCkgfHwgY2hpbGRyZW5bY2hpbGRyZW4ubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2cuZGVidWcoXCJDb3VsZCBub3QgYWRkIGEgbmV3IHJvdXRlIHRvIHRoZSBlbXB0eSB0cmVlIVwiKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGlmIHRoZSBwYXJlbnQgZm9sZGVyIGxpa2VzIHRvIGFjdCBhcyBhIHBpcGVsaW5lLCB0aGVuIGFkZFxuICAgICAgICAgIC8vIGFmdGVyIHRoZSBwYXJlbnQsIHJhdGhlciB0aGFuIGFzIGEgY2hpbGRcbiAgICAgICAgICB2YXIgcGFyZW50VHlwZU5hbWUgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZCh0cmVlTm9kZSk7XG4gICAgICAgICAgaWYgKCFDYW1lbC5hY2NlcHRPdXRwdXQocGFyZW50VHlwZU5hbWUpKSB7XG4gICAgICAgICAgICB0cmVlTm9kZSA9IHRyZWVOb2RlLnBhcmVudCB8fCB0cmVlTm9kZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyZWVOb2RlKSB7XG4gICAgICAgICAgdmFyIG5vZGUgPSBkb2MuY3JlYXRlRWxlbWVudChrZXkpO1xuICAgICAgICAgIHBhcmVudEZvbGRlciA9IHRyZWVOb2RlO1xuICAgICAgICAgIHZhciBhZGRlZE5vZGUgPSBDYW1lbC5hZGRSb3V0ZUNoaWxkKHBhcmVudEZvbGRlciwgbm9kZSk7XG4gICAgICAgICAgLy8gVE9ETyBhZGQgdGhlIHNjaGVtYSBoZXJlIGZvciBhbiBlbGVtZW50Pz9cbiAgICAgICAgICAvLyBvciBkZWZhdWx0IHRoZSBkYXRhIG9yIHNvbWV0aGluZ1xuXG4gICAgICAgICAgdmFyIG5vZGVEYXRhID0ge1xuICAgICAgICAgIH07XG4gICAgICAgICAgaWYgKGtleSA9PT0gXCJlbmRwb2ludFwiICYmICRzY29wZS5lbmRwb2ludENvbmZpZykge1xuICAgICAgICAgICAgdmFyIGtleSA9ICRzY29wZS5lbmRwb2ludENvbmZpZy5rZXk7XG4gICAgICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICAgIG5vZGVEYXRhW1widXJpXCJdID0ga2V5ICsgXCI6XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGFkZGVkTm9kZVtcImNhbWVsTm9kZURhdGFcIl0gPSBub2RlRGF0YTtcbiAgICAgICAgICBhZGRlZE5vZGVbXCJlbmRwb2ludENvbmZpZ1wiXSA9ICRzY29wZS5lbmRwb2ludENvbmZpZztcblxuICAgICAgICAgIGlmIChrZXkgPT09IFwicm91dGVcIikge1xuICAgICAgICAgICAgLy8gbGV0cyBnZW5lcmF0ZSBhIG5ldyByb3V0ZUlkIGFuZCBzd2l0Y2ggdG8gaXRcbiAgICAgICAgICAgIHZhciBjb3VudCA9ICRzY29wZS5yb3V0ZUlkcy5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgbm9kZUlkID0gbnVsbDtcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgIG5vZGVJZCA9IFwicm91dGVcIiArICgrK2NvdW50KTtcbiAgICAgICAgICAgICAgaWYgKCEkc2NvcGUucm91dGVJZHMuZmluZChub2RlSWQpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFkZGVkTm9kZVtcInJvdXRlWG1sTm9kZVwiXS5zZXRBdHRyaWJ1dGUoXCJpZFwiLCBub2RlSWQpO1xuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCA9IG5vZGVJZDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRyZWVNb2RpZmllZCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyZWVNb2RpZmllZChyZXBvc2l0aW9uID0gdHJ1ZSkge1xuICAgICAgLy8gbGV0cyByZWNyZWF0ZSB0aGUgWE1MIG1vZGVsIGZyb20gdGhlIHVwZGF0ZSBGb2xkZXIgdHJlZVxuICAgICAgdmFyIG5ld0RvYyA9IENhbWVsLmdlbmVyYXRlWG1sRnJvbUZvbGRlcigkc2NvcGUucm9vdEZvbGRlcik7XG4gICAgICB2YXIgdHJlZSA9IENhbWVsLmxvYWRDYW1lbFRyZWUobmV3RG9jLCAkc2NvcGUucGFnZUlkKTtcbiAgICAgIGlmICh0cmVlKSB7XG4gICAgICAgICRzY29wZS5yb290Rm9sZGVyID0gdHJlZTtcbiAgICAgICAgJHNjb3BlLmRvYyA9IENvcmUucGF0aEdldCh0cmVlLCBbXCJ4bWxEb2N1bWVudFwiXSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUubW9kaWZpZWQgPSB0cnVlO1xuICAgICAgcmVsb2FkUm91dGVJZHMoKTtcbiAgICAgICRzY29wZS5kb0xheW91dCgpO1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHJlbG9hZFJvdXRlSWRzKCkge1xuICAgICAgJHNjb3BlLnJvdXRlSWRzID0gW107XG4gICAgICB2YXIgZG9jID0gJCgkc2NvcGUuZG9jKTtcbiAgICAgICRzY29wZS5jYW1lbFNlbGVjdGlvbkRldGFpbHMuc2VsZWN0ZWRDYW1lbENvbnRleHRJZCA9IGRvYy5maW5kKFwiY2FtZWxDb250ZXh0XCIpLmF0dHIoXCJpZFwiKTtcbiAgICAgIGRvYy5maW5kKFwicm91dGVcIikuZWFjaCgoaWR4LCByb3V0ZSkgPT4ge1xuICAgICAgICB2YXIgaWQgPSByb3V0ZS5nZXRBdHRyaWJ1dGUoXCJpZFwiKTtcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgJHNjb3BlLnJvdXRlSWRzLnB1c2goaWQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCgpIHtcbiAgICAgIGlmICgkc2NvcGUuZG9jKSB7XG4gICAgICAgIGlmICghJHNjb3BlLnNlbGVjdGVkUm91dGVJZCAmJiAkc2NvcGUucm91dGVJZHMgJiYgJHNjb3BlLnJvdXRlSWRzLmxlbmd0aCkge1xuICAgICAgICAgICRzY29wZS5zZWxlY3RlZFJvdXRlSWQgPSAkc2NvcGUucm91dGVJZHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZFJvdXRlSWQgJiYgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCAhPT0gJHNjb3BlLmRyYXduUm91dGVJZCkge1xuICAgICAgICAgIHZhciBub2RlcyA9IFtdO1xuICAgICAgICAgIHZhciBsaW5rcyA9IFtdO1xuICAgICAgICAgIENhbWVsLmxvYWRSb3V0ZVhtbE5vZGVzKCRzY29wZSwgJHNjb3BlLmRvYywgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCwgbm9kZXMsIGxpbmtzLCBnZXRXaWR0aCgpKTtcbiAgICAgICAgICB1cGRhdGVTZWxlY3Rpb24oJHNjb3BlLnNlbGVjdGVkUm91dGVJZCk7XG4gICAgICAgICAgLy8gbm93IHdlJ3ZlIGdvdCBjaWQgdmFsdWVzIGluIHRoZSB0cmVlIGFuZCBET00sIGxldHMgY3JlYXRlIGFuIGluZGV4IHNvIHdlIGNhbiBiaW5kIHRoZSBET00gdG8gdGhlIHRyZWUgbW9kZWxcbiAgICAgICAgICAkc2NvcGUuZm9sZGVycyA9IENhbWVsLmFkZEZvbGRlcnNUb0luZGV4KCRzY29wZS5yb290Rm9sZGVyKTtcbiAgICAgICAgICBzaG93R3JhcGgobm9kZXMsIGxpbmtzKTtcbiAgICAgICAgICAkc2NvcGUuZHJhd25Sb3V0ZUlkID0gJHNjb3BlLnNlbGVjdGVkUm91dGVJZDtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuY2FtZWxTZWxlY3Rpb25EZXRhaWxzLnNlbGVjdGVkUm91dGVJZCA9ICRzY29wZS5zZWxlY3RlZFJvdXRlSWQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd0dyYXBoKG5vZGVzLCBsaW5rcykge1xuICAgICAgbGF5b3V0R3JhcGgobm9kZXMsIGxpbmtzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROb2RlSWQobm9kZSkge1xuICAgICAgaWYgKGFuZ3VsYXIuaXNOdW1iZXIobm9kZSkpIHtcbiAgICAgICAgdmFyIGlkeCA9IG5vZGU7XG4gICAgICAgIG5vZGUgPSAkc2NvcGUubm9kZVN0YXRlc1tpZHhdO1xuICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICBsb2cuZGVidWcoXCJDYW50IGZpbmQgbm9kZSBhdCBcIiArIGlkeCk7XG4gICAgICAgICAgcmV0dXJuIFwibm9kZS1cIiArIGlkeDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGUuY2lkIHx8IFwibm9kZS1cIiArIG5vZGUuaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0ZWRPclJvdXRlRm9sZGVyKCkge1xuICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZEZvbGRlciB8fCBnZXRSb3V0ZUZvbGRlcigkc2NvcGUucm9vdEZvbGRlciwgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Q29udGFpbmVyRWxlbWVudCgpIHtcbiAgICAgIHZhciByb290RWxlbWVudCA9ICRlbGVtZW50O1xuICAgICAgdmFyIGNvbnRhaW5lckVsZW1lbnQgPSByb290RWxlbWVudC5maW5kKFwiLmNhbnZhc1wiKTtcbiAgICAgIGlmICghY29udGFpbmVyRWxlbWVudCB8fCAhY29udGFpbmVyRWxlbWVudC5sZW5ndGgpIGNvbnRhaW5lckVsZW1lbnQgPSByb290RWxlbWVudDtcbiAgICAgIHJldHVybiBjb250YWluZXJFbGVtZW50O1xuICAgIH1cblxuICAgIC8vIGNvbmZpZ3VyZSBjYW52YXMgbGF5b3V0IGFuZCBzdHlsZXNcbiAgICB2YXIgZW5kcG9pbnRTdHlsZTphbnlbXSA9IFtcIkRvdFwiLCB7IHJhZGl1czogNCwgY3NzQ2xhc3M6ICdjYW1lbC1jYW52YXMtZW5kcG9pbnQnIH1dO1xuICAgIHZhciBob3ZlclBhaW50U3R5bGUgPSB7IHN0cm9rZVN0eWxlOiBcInJlZFwiLCBsaW5lV2lkdGg6IDMgfTtcbiAgICAvL3ZhciBsYWJlbFN0eWxlczogYW55W10gPSBbIFwiTGFiZWxcIiwgeyBsYWJlbDpcIkZPT1wiLCBpZDpcImxhYmVsXCIgfV07XG4gICAgdmFyIGxhYmVsU3R5bGVzOmFueVtdID0gWyBcIkxhYmVsXCIgXTtcbiAgICB2YXIgYXJyb3dTdHlsZXM6YW55W10gPSBbIFwiQXJyb3dcIiwge1xuICAgICAgbG9jYXRpb246IDEsXG4gICAgICBpZDogXCJhcnJvd1wiLFxuICAgICAgbGVuZ3RoOiA4LFxuICAgICAgd2lkdGg6IDgsXG4gICAgICBmb2xkYmFjazogMC44XG4gICAgfSBdO1xuICAgIHZhciBjb25uZWN0b3JTdHlsZTphbnlbXSA9IFsgXCJTdGF0ZU1hY2hpbmVcIiwgeyBjdXJ2aW5lc3M6IDEwLCBwcm94aW1pdHlMaW1pdDogNTAgfSBdO1xuXG4gICAganNQbHVtYkluc3RhbmNlLmltcG9ydERlZmF1bHRzKHtcbiAgICAgIEVuZHBvaW50OiBlbmRwb2ludFN0eWxlLFxuICAgICAgSG92ZXJQYWludFN0eWxlOiBob3ZlclBhaW50U3R5bGUsXG4gICAgICBDb25uZWN0aW9uT3ZlcmxheXM6IFtcbiAgICAgICAgYXJyb3dTdHlsZXMsXG4gICAgICAgIGxhYmVsU3R5bGVzXG4gICAgICBdXG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcbiAgICAgIGpzUGx1bWJJbnN0YW5jZS5yZXNldCgpO1xuICAgICAgZGVsZXRlIGpzUGx1bWJJbnN0YW5jZTtcbiAgICB9KTtcblxuICAgIC8vIGRvdWJsZSBjbGljayBvbiBhbnkgY29ubmVjdGlvblxuICAgIGpzUGx1bWJJbnN0YW5jZS5iaW5kKFwiZGJsY2xpY2tcIiwgZnVuY3Rpb24gKGNvbm5lY3Rpb24sIG9yaWdpbmFsRXZlbnQpIHtcbiAgICAgIGlmIChqc1BsdW1iSW5zdGFuY2UuaXNTdXNwZW5kRHJhd2luZygpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGFsZXJ0KFwiZG91YmxlIGNsaWNrIG9uIGNvbm5lY3Rpb24gZnJvbSBcIiArIGNvbm5lY3Rpb24uc291cmNlSWQgKyBcIiB0byBcIiArIGNvbm5lY3Rpb24udGFyZ2V0SWQpO1xuICAgIH0pO1xuXG4gICAganNQbHVtYkluc3RhbmNlLmJpbmQoJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbiAoaW5mbywgZXZ0KSB7XG4gICAgICAvL2xvZy5kZWJ1ZyhcIkNvbm5lY3Rpb24gZXZlbnQ6IFwiLCBpbmZvKTtcbiAgICAgIGxvZy5kZWJ1ZyhcIkNyZWF0aW5nIGNvbm5lY3Rpb24gZnJvbSBcIiwgaW5mby5zb3VyY2VJZCwgXCIgdG8gXCIsIGluZm8udGFyZ2V0SWQpO1xuICAgICAgdmFyIGxpbmsgPSBnZXRMaW5rKGluZm8pO1xuICAgICAgdmFyIHNvdXJjZSA9ICRzY29wZS5ub2Rlc1tsaW5rLnNvdXJjZV07XG4gICAgICB2YXIgc291cmNlRm9sZGVyID0gJHNjb3BlLmZvbGRlcnNbbGluay5zb3VyY2VdO1xuICAgICAgdmFyIHRhcmdldEZvbGRlciA9ICRzY29wZS5mb2xkZXJzW2xpbmsudGFyZ2V0XTtcbiAgICAgIGlmIChDYW1lbC5pc05leHRTaWJsaW5nQWRkZWRBc0NoaWxkKHNvdXJjZS50eXBlKSkge1xuICAgICAgICBzb3VyY2VGb2xkZXIubW92ZUNoaWxkKHRhcmdldEZvbGRlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzb3VyY2VGb2xkZXIucGFyZW50Lmluc2VydEFmdGVyKHRhcmdldEZvbGRlciwgc291cmNlRm9sZGVyKTtcbiAgICAgIH1cbiAgICAgIHRyZWVNb2RpZmllZCgpO1xuICAgIH0pO1xuXG4gICAgLy8gbGV0cyBkZWxldGUgY29ubmVjdGlvbnMgb24gY2xpY2tcbiAgICBqc1BsdW1iSW5zdGFuY2UuYmluZChcImNsaWNrXCIsIGZ1bmN0aW9uIChjKSB7XG4gICAgICBpZiAoanNQbHVtYkluc3RhbmNlLmlzU3VzcGVuZERyYXdpbmcoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBqc1BsdW1iSW5zdGFuY2UuZGV0YWNoKGMpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gbGF5b3V0R3JhcGgobm9kZXMsIGxpbmtzKSB7XG4gICAgICB2YXIgdHJhbnNpdGlvbnMgPSBbXTtcbiAgICAgIHZhciBzdGF0ZXMgPSBDb3JlLmNyZWF0ZUdyYXBoU3RhdGVzKG5vZGVzLCBsaW5rcywgdHJhbnNpdGlvbnMpO1xuXG4gICAgICBsb2cuZGVidWcoXCJsaW5rczogXCIsIGxpbmtzKTtcbiAgICAgIGxvZy5kZWJ1ZyhcInRyYW5zaXRpb25zOiBcIiwgdHJhbnNpdGlvbnMpO1xuXG4gICAgICAkc2NvcGUubm9kZVN0YXRlcyA9IHN0YXRlcztcbiAgICAgIHZhciBjb250YWluZXJFbGVtZW50ID0gZ2V0Q29udGFpbmVyRWxlbWVudCgpO1xuXG4gICAgICBqc1BsdW1iSW5zdGFuY2UuZG9XaGlsZVN1c3BlbmRlZCgoKSA9PiB7XG5cbiAgICAgICAgLy9zZXQgb3VyIGNvbnRhaW5lciB0byBzb21lIGFyYml0cmFyeSBpbml0aWFsIHNpemVcbiAgICAgICAgY29udGFpbmVyRWxlbWVudC5jc3Moe1xuICAgICAgICAgICd3aWR0aCc6ICc4MDBweCcsXG4gICAgICAgICAgJ2hlaWdodCc6ICc4MDBweCcsXG4gICAgICAgICAgJ21pbi1oZWlnaHQnOiAnODAwcHgnLFxuICAgICAgICAgICdtaW4td2lkdGgnOiAnODAwcHgnXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgY29udGFpbmVySGVpZ2h0ID0gMDtcbiAgICAgICAgdmFyIGNvbnRhaW5lcldpZHRoID0gMDtcblxuICAgICAgICBjb250YWluZXJFbGVtZW50LmZpbmQoJ2Rpdi5jb21wb25lbnQnKS5lYWNoKChpLCBlbCkgPT4ge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNoZWNraW5nOiBcIiwgZWwsIFwiIFwiLCBpKTtcbiAgICAgICAgICBpZiAoIXN0YXRlcy5hbnkoKG5vZGUpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWwuaWQgPT09IGdldE5vZGVJZChub2RlKTtcbiAgICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIlJlbW92aW5nIGVsZW1lbnQ6IFwiLCBlbC5pZCk7XG4gICAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UucmVtb3ZlKGVsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzdGF0ZXMsIChub2RlKSA9PiB7XG4gICAgICAgICAgbG9nLmRlYnVnKFwibm9kZTogXCIsIG5vZGUpO1xuICAgICAgICAgIHZhciBpZCA9IGdldE5vZGVJZChub2RlKTtcbiAgICAgICAgICB2YXIgZGl2ID0gY29udGFpbmVyRWxlbWVudC5maW5kKCcjJyArIGlkKTtcblxuICAgICAgICAgIGlmICghZGl2WzBdKSB7XG4gICAgICAgICAgICBkaXYgPSAkKCRzY29wZS5ub2RlVGVtcGxhdGUoe1xuICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgIG5vZGU6IG5vZGVcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIGRpdi5hcHBlbmRUbyhjb250YWluZXJFbGVtZW50KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBNYWtlIHRoZSBub2RlIGEganNwbHVtYiBzb3VyY2VcbiAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UubWFrZVNvdXJjZShkaXYsIHtcbiAgICAgICAgICAgIGZpbHRlcjogXCJpbWcubm9kZUljb25cIixcbiAgICAgICAgICAgIGFuY2hvcjogXCJDb250aW51b3VzXCIsXG4gICAgICAgICAgICBjb25uZWN0b3I6IGNvbm5lY3RvclN0eWxlLFxuICAgICAgICAgICAgY29ubmVjdG9yU3R5bGU6IHsgc3Ryb2tlU3R5bGU6IFwiIzY2NlwiLCBsaW5lV2lkdGg6IDMgfSxcbiAgICAgICAgICAgIG1heENvbm5lY3Rpb25zOiAtMVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gYW5kIGFsc28gYSBqc3BsdW1iIHRhcmdldFxuICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5tYWtlVGFyZ2V0KGRpdiwge1xuICAgICAgICAgICAgZHJvcE9wdGlvbnM6IHsgaG92ZXJDbGFzczogXCJkcmFnSG92ZXJcIiB9LFxuICAgICAgICAgICAgYW5jaG9yOiBcIkNvbnRpbnVvdXNcIlxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAganNQbHVtYkluc3RhbmNlLmRyYWdnYWJsZShkaXYsIHtcbiAgICAgICAgICAgIGNvbnRhaW5tZW50OiAnLmNhbWVsLWNhbnZhcydcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIGFkZCBldmVudCBoYW5kbGVycyB0byB0aGlzIG5vZGVcbiAgICAgICAgICBkaXYuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG5ld0ZsYWcgPSAhZGl2Lmhhc0NsYXNzKFwic2VsZWN0ZWRcIik7XG4gICAgICAgICAgICBjb250YWluZXJFbGVtZW50LmZpbmQoJ2Rpdi5jb21wb25lbnQnKS50b2dnbGVDbGFzcyhcInNlbGVjdGVkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIGRpdi50b2dnbGVDbGFzcyhcInNlbGVjdGVkXCIsIG5ld0ZsYWcpO1xuICAgICAgICAgICAgdmFyIGlkID0gZGl2LmF0dHIoXCJpZFwiKTtcbiAgICAgICAgICAgIHVwZGF0ZVNlbGVjdGlvbihuZXdGbGFnID8gaWQgOiBudWxsKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBkaXYuZGJsY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGlkID0gZGl2LmF0dHIoXCJpZFwiKTtcbiAgICAgICAgICAgIHVwZGF0ZVNlbGVjdGlvbihpZCk7XG4gICAgICAgICAgICAvLyRzY29wZS5wcm9wZXJ0aWVzRGlhbG9nLm9wZW4oKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgaGVpZ2h0ID0gZGl2LmhlaWdodCgpO1xuICAgICAgICAgIHZhciB3aWR0aCA9IGRpdi53aWR0aCgpO1xuICAgICAgICAgIGlmIChoZWlnaHQgfHwgd2lkdGgpIHtcbiAgICAgICAgICAgIG5vZGUud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIG5vZGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAgICAgZGl2LmNzcyh7XG4gICAgICAgICAgICAgICdtaW4td2lkdGgnOiB3aWR0aCxcbiAgICAgICAgICAgICAgJ21pbi1oZWlnaHQnOiBoZWlnaHRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGVkZ2VTZXAgPSAxMDtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIGxheW91dCBhbmQgZ2V0IHRoZSBidWlsZEdyYXBoXG4gICAgICAgIGRhZ3JlLmxheW91dCgpXG4gICAgICAgICAgICAubm9kZVNlcCgxMDApXG4gICAgICAgICAgICAuZWRnZVNlcChlZGdlU2VwKVxuICAgICAgICAgICAgLnJhbmtTZXAoNzUpXG4gICAgICAgICAgICAubm9kZXMoc3RhdGVzKVxuICAgICAgICAgICAgLmVkZ2VzKHRyYW5zaXRpb25zKVxuICAgICAgICAgICAgLmRlYnVnTGV2ZWwoMSlcbiAgICAgICAgICAgIC5ydW4oKTtcblxuICAgICAgICBhbmd1bGFyLmZvckVhY2goc3RhdGVzLCAobm9kZSkgPT4ge1xuXG4gICAgICAgICAgLy8gcG9zaXRpb24gdGhlIG5vZGUgaW4gdGhlIGdyYXBoXG4gICAgICAgICAgdmFyIGlkID0gZ2V0Tm9kZUlkKG5vZGUpO1xuICAgICAgICAgIHZhciBkaXYgPSAkKFwiI1wiICsgaWQpO1xuICAgICAgICAgIHZhciBkaXZIZWlnaHQgPSBkaXYuaGVpZ2h0KCk7XG4gICAgICAgICAgdmFyIGRpdldpZHRoID0gZGl2LndpZHRoKCk7XG4gICAgICAgICAgdmFyIGxlZnRPZmZzZXQgPSBub2RlLmRhZ3JlLnggKyBkaXZXaWR0aDtcbiAgICAgICAgICB2YXIgYm90dG9tT2Zmc2V0ID0gbm9kZS5kYWdyZS55ICsgZGl2SGVpZ2h0O1xuICAgICAgICAgIGlmIChjb250YWluZXJIZWlnaHQgPCBib3R0b21PZmZzZXQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9IGJvdHRvbU9mZnNldCArIGVkZ2VTZXAgKiAyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY29udGFpbmVyV2lkdGggPCBsZWZ0T2Zmc2V0KSB7XG4gICAgICAgICAgICBjb250YWluZXJXaWR0aCA9IGxlZnRPZmZzZXQgKyBlZGdlU2VwICogMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGl2LmNzcyh7dG9wOiBub2RlLmRhZ3JlLnksIGxlZnQ6IG5vZGUuZGFncmUueH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBzaXplIHRoZSBjb250YWluZXIgdG8gZml0IHRoZSBncmFwaFxuICAgICAgICBjb250YWluZXJFbGVtZW50LmNzcyh7XG4gICAgICAgICAgJ3dpZHRoJzogY29udGFpbmVyV2lkdGgsXG4gICAgICAgICAgJ2hlaWdodCc6IGNvbnRhaW5lckhlaWdodCxcbiAgICAgICAgICAnbWluLWhlaWdodCc6IGNvbnRhaW5lckhlaWdodCxcbiAgICAgICAgICAnbWluLXdpZHRoJzogY29udGFpbmVyV2lkdGhcbiAgICAgICAgfSk7XG5cblxuICAgICAgICBjb250YWluZXJFbGVtZW50LmRibGNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAkc2NvcGUucHJvcGVydGllc0RpYWxvZy5vcGVuKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGpzUGx1bWJJbnN0YW5jZS5zZXRTdXNwZW5kRXZlbnRzKHRydWUpO1xuICAgICAgICAvLyBEZXRhY2ggYWxsIHRoZSBjdXJyZW50IGNvbm5lY3Rpb25zIGFuZCByZWNvbm5lY3QgZXZlcnl0aGluZyBiYXNlZCBvbiB0aGUgdXBkYXRlZCBncmFwaFxuICAgICAgICBqc1BsdW1iSW5zdGFuY2UuZGV0YWNoRXZlcnlDb25uZWN0aW9uKHtmaXJlRXZlbnQ6IGZhbHNlfSk7XG5cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGxpbmtzLCAobGluaykgPT4ge1xuICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5jb25uZWN0KHtcbiAgICAgICAgICAgIHNvdXJjZTogZ2V0Tm9kZUlkKGxpbmsuc291cmNlKSxcbiAgICAgICAgICAgIHRhcmdldDogZ2V0Tm9kZUlkKGxpbmsudGFyZ2V0KVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAganNQbHVtYkluc3RhbmNlLnNldFN1c3BlbmRFdmVudHMoZmFsc2UpO1xuXG4gICAgICB9KTtcblxuXG4gICAgICByZXR1cm4gc3RhdGVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldExpbmsoaW5mbykge1xuICAgICAgdmFyIHNvdXJjZUlkID0gaW5mby5zb3VyY2VJZDtcbiAgICAgIHZhciB0YXJnZXRJZCA9IGluZm8udGFyZ2V0SWQ7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzb3VyY2U6IHNvdXJjZUlkLFxuICAgICAgICB0YXJnZXQ6IHRhcmdldElkXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Tm9kZUJ5Q0lEKG5vZGVzLCBjaWQpIHtcbiAgICAgIHJldHVybiBub2Rlcy5maW5kKChub2RlKSA9PiB7XG4gICAgICAgIHJldHVybiBub2RlLmNpZCA9PT0gY2lkO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBVcGRhdGVzIHRoZSBzZWxlY3Rpb24gd2l0aCB0aGUgZ2l2ZW4gZm9sZGVyIG9yIElEXG4gICAgICovXG4gICAgZnVuY3Rpb24gdXBkYXRlU2VsZWN0aW9uKGZvbGRlck9ySWQpIHtcbiAgICAgIHZhciBmb2xkZXIgPSBudWxsO1xuICAgICAgaWYgKGFuZ3VsYXIuaXNTdHJpbmcoZm9sZGVyT3JJZCkpIHtcbiAgICAgICAgdmFyIGlkID0gZm9sZGVyT3JJZDtcbiAgICAgICAgZm9sZGVyID0gKGlkICYmICRzY29wZS5mb2xkZXJzKSA/ICRzY29wZS5mb2xkZXJzW2lkXSA6IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb2xkZXIgPSBmb2xkZXJPcklkO1xuICAgICAgfVxuICAgICAgJHNjb3BlLnNlbGVjdGVkRm9sZGVyID0gZm9sZGVyO1xuICAgICAgZm9sZGVyID0gZ2V0U2VsZWN0ZWRPclJvdXRlRm9sZGVyKCk7XG4gICAgICAkc2NvcGUubm9kZVhtbE5vZGUgPSBudWxsO1xuICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IG51bGw7XG4gICAgICBpZiAoZm9sZGVyKSB7XG4gICAgICAgIHZhciBub2RlTmFtZSA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKGZvbGRlcik7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YSA9IENhbWVsLmdldFJvdXRlRm9sZGVySlNPTihmb2xkZXIpO1xuICAgICAgICAkc2NvcGUubm9kZURhdGFDaGFuZ2VkRmllbGRzID0ge307XG4gICAgICAgICRzY29wZS5ub2RlTW9kZWwgPSBDYW1lbC5nZXRDYW1lbFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgIGlmICgkc2NvcGUubm9kZU1vZGVsKSB7XG4gICAgICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IFwicGx1Z2lucy93aWtpL2h0bWwvY2FtZWxQcm9wZXJ0aWVzRWRpdC5odG1sXCI7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRW5kcG9pbnQgPSBudWxsO1xuICAgICAgICBpZiAoXCJlbmRwb2ludFwiID09PSBub2RlTmFtZSkge1xuICAgICAgICAgIHZhciB1cmkgPSAkc2NvcGUubm9kZURhdGFbXCJ1cmlcIl07XG4gICAgICAgICAgaWYgKHVyaSkge1xuICAgICAgICAgICAgLy8gbGV0cyBkZWNvbXBvc2UgdGhlIFVSSSBpbnRvIHNjaGVtZSwgcGF0aCBhbmQgcGFyYW1ldGVyc1xuICAgICAgICAgICAgdmFyIGlkeCA9IHVyaS5pbmRleE9mKFwiOlwiKTtcbiAgICAgICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgICAgIHZhciBlbmRwb2ludFNjaGVtZSA9IHVyaS5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgICAgICAgdmFyIGVuZHBvaW50UGF0aCA9IHVyaS5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICAgICAgICAgIC8vIGZvciBlbXB0eSBwYXRocyBsZXRzIGFzc3VtZSB3ZSBuZWVkIC8vIG9uIGEgVVJJXG4gICAgICAgICAgICAgICRzY29wZS5lbmRwb2ludFBhdGhIYXNTbGFzaGVzID0gZW5kcG9pbnRQYXRoID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICAgICAgICBpZiAoZW5kcG9pbnRQYXRoLnN0YXJ0c1dpdGgoXCIvL1wiKSkge1xuICAgICAgICAgICAgICAgIGVuZHBvaW50UGF0aCA9IGVuZHBvaW50UGF0aC5zdWJzdHJpbmcoMik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGF0aEhhc1NsYXNoZXMgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlkeCA9IGVuZHBvaW50UGF0aC5pbmRleE9mKFwiP1wiKTtcbiAgICAgICAgICAgICAgdmFyIGVuZHBvaW50UGFyYW1ldGVycyA9IHt9O1xuICAgICAgICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbWV0ZXJzID0gZW5kcG9pbnRQYXRoLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgICAgICAgICAgICBlbmRwb2ludFBhdGggPSBlbmRwb2ludFBhdGguc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgICAgICAgICAgZW5kcG9pbnRQYXJhbWV0ZXJzID0gQ29yZS5zdHJpbmdUb0hhc2gocGFyYW1ldGVycyk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAkc2NvcGUuZW5kcG9pbnRTY2hlbWUgPSBlbmRwb2ludFNjaGVtZTtcbiAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGF0aCA9IGVuZHBvaW50UGF0aDtcbiAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGFyYW1ldGVycyA9IGVuZHBvaW50UGFyYW1ldGVycztcblxuICAgICAgICAgICAgICBsb2cuZGVidWcoXCJlbmRwb2ludCBcIiArIGVuZHBvaW50U2NoZW1lICsgXCIgcGF0aCBcIiArIGVuZHBvaW50UGF0aCArIFwiIGFuZCBwYXJhbWV0ZXJzIFwiICsgSlNPTi5zdHJpbmdpZnkoZW5kcG9pbnRQYXJhbWV0ZXJzKSk7XG4gICAgICAgICAgICAgICRzY29wZS5sb2FkRW5kcG9pbnRTY2hlbWEoZW5kcG9pbnRTY2hlbWUpO1xuICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRFbmRwb2ludCA9IHtcbiAgICAgICAgICAgICAgICBlbmRwb2ludFNjaGVtZTogZW5kcG9pbnRTY2hlbWUsXG4gICAgICAgICAgICAgICAgZW5kcG9pbnRQYXRoOiBlbmRwb2ludFBhdGgsXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyczogZW5kcG9pbnRQYXJhbWV0ZXJzXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0V2lkdGgoKSB7XG4gICAgICB2YXIgY2FudmFzRGl2ID0gJCgkZWxlbWVudCk7XG4gICAgICByZXR1cm4gY2FudmFzRGl2LndpZHRoKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Rm9sZGVySWRBdHRyaWJ1dGUocm91dGUpIHtcbiAgICAgIHZhciBpZCA9IG51bGw7XG4gICAgICBpZiAocm91dGUpIHtcbiAgICAgICAgdmFyIHhtbE5vZGUgPSByb3V0ZVtcInJvdXRlWG1sTm9kZVwiXTtcbiAgICAgICAgaWYgKHhtbE5vZGUpIHtcbiAgICAgICAgICBpZCA9IHhtbE5vZGUuZ2V0QXR0cmlidXRlKFwiaWRcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBpZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRSb3V0ZUZvbGRlcih0cmVlLCByb3V0ZUlkKSB7XG4gICAgICB2YXIgYW5zd2VyID0gbnVsbDtcbiAgICAgIGlmICh0cmVlKSB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0cmVlLmNoaWxkcmVuLCAocm91dGUpID0+IHtcbiAgICAgICAgICBpZiAoIWFuc3dlcikge1xuICAgICAgICAgICAgdmFyIGlkID0gZ2V0Rm9sZGVySWRBdHRyaWJ1dGUocm91dGUpO1xuICAgICAgICAgICAgaWYgKHJvdXRlSWQgPT09IGlkKSB7XG4gICAgICAgICAgICAgIGFuc3dlciA9IHJvdXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYW5zd2VyO1xuICAgIH1cblxuICAgICRzY29wZS5kb1N3aXRjaFRvVHJlZVZpZXcgPSAoKSA9PiB7XG4gICAgICAkbG9jYXRpb24udXJsKENvcmUudHJpbUxlYWRpbmcoKCRzY29wZS5zdGFydExpbmsgKyBcIi9jYW1lbC9wcm9wZXJ0aWVzL1wiICsgJHNjb3BlLnBhZ2VJZCksICcjJykpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY29uZmlybVN3aXRjaFRvVHJlZVZpZXcgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkKSB7XG4gICAgICAgICRzY29wZS5zd2l0Y2hUb1RyZWVWaWV3Lm9wZW4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5kb1N3aXRjaFRvVHJlZVZpZXcoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5Db21taXRDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwibWFya2VkXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgJHRlbXBsYXRlQ2FjaGUsIG1hcmtlZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgPT4ge1xuXG4gICAgLy8gVE9ETyByZW1vdmUhXG4gICAgdmFyIGlzRm1jID0gZmFsc2U7XG4gICAgdmFyIGpvbG9raWEgPSBudWxsO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmNvbW1pdElkID0gJHNjb3BlLm9iamVjdElkO1xuXG4gICAgLy8gVE9ETyB3ZSBjb3VsZCBjb25maWd1cmUgdGhpcz9cbiAgICAkc2NvcGUuZGF0ZUZvcm1hdCA9ICdFRUUsIE1NTSBkLCB5IDogaGg6bW06c3MgYSc7XG5cbiAgICAkc2NvcGUuZ3JpZE9wdGlvbnMgPSB7XG4gICAgICBkYXRhOiAnY29tbWl0cycsXG4gICAgICBzaG93RmlsdGVyOiBmYWxzZSxcbiAgICAgIG11bHRpU2VsZWN0OiBmYWxzZSxcbiAgICAgIHNlbGVjdFdpdGhDaGVja2JveE9ubHk6IHRydWUsXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBkaXNwbGF5U2VsZWN0aW9uQ2hlY2tib3ggOiB0cnVlLCAvLyBvbGQgcHJlIDIuMCBjb25maWchXG4gICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgZmlsdGVyVGV4dDogJydcbiAgICAgIH0sXG4gICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ3BhdGgnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnRmlsZSBOYW1lJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldCgnZmlsZUNlbGxUZW1wbGF0ZS5odG1sJyksXG4gICAgICAgICAgd2lkdGg6IFwiKioqXCIsXG4gICAgICAgICAgY2VsbEZpbHRlcjogXCJcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICckZGlmZkxpbmsnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnT3B0aW9ucycsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ3ZpZXdEaWZmVGVtcGxhdGUuaHRtbCcpXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnd29ya3NwYWNlLnRyZWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISRzY29wZS5naXQpIHtcbiAgICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIlJlbG9hZGluZyB0aGUgdmlldyBhcyB3ZSBub3cgc2VlbSB0byBoYXZlIGEgZ2l0IG1iZWFuIVwiKTtcbiAgICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgICRzY29wZS5jYW5SZXZlcnQgPSAoKSA9PiB7XG4gICAgICByZXR1cm4gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoID09PSAxO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIHBhdGggPSBjb21taXRQYXRoKHNlbGVjdGVkSXRlbXNbMF0pO1xuICAgICAgICB2YXIgb2JqZWN0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG4gICAgICAgIGlmIChwYXRoICYmIG9iamVjdElkKSB7XG4gICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBmaWxlIFwiICsgJHNjb3BlLnBhZ2VJZCArIFwiIHRvIHByZXZpb3VzIHZlcnNpb24gXCIgKyBvYmplY3RJZDtcbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5yZXZlcnRUbygkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgY29tbWl0TWVzc2FnZSwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHJlc3VsdCk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB1cGRhdGUgdGhlIHZpZXdcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjb21taXRQYXRoKGNvbW1pdCkge1xuICAgICAgcmV0dXJuIGNvbW1pdC5wYXRoIHx8IGNvbW1pdC5uYW1lO1xuICAgIH1cblxuICAgICRzY29wZS5kaWZmID0gKCkgPT4ge1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIGNvbW1pdCA9IHNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgIC8qXG4gICAgICAgICB2YXIgY29tbWl0ID0gcm93O1xuICAgICAgICAgdmFyIGVudGl0eSA9IHJvdy5lbnRpdHk7XG4gICAgICAgICBpZiAoZW50aXR5KSB7XG4gICAgICAgICBjb21taXQgPSBlbnRpdHk7XG4gICAgICAgICB9XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgb3RoZXJDb21taXRJZCA9ICRzY29wZS5jb21taXRJZDtcbiAgICAgICAgdmFyIGxpbmsgPSBVcmxIZWxwZXJzLmpvaW4oc3RhcnRMaW5rKCRzY29wZSksICBcIi9kaWZmL1wiICsgJHNjb3BlLmNvbW1pdElkICsgXCIvXCIgKyBvdGhlckNvbW1pdElkICsgXCIvXCIgKyBjb21taXRQYXRoKGNvbW1pdCkpO1xuICAgICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcobGluaywgXCIjXCIpO1xuICAgICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIHZhciBjb21taXRJZCA9ICRzY29wZS5jb21taXRJZDtcblxuICAgICAgV2lraS5sb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMpO1xuXG4gICAgICB3aWtpUmVwb3NpdG9yeS5jb21taXRJbmZvKGNvbW1pdElkLCAoY29tbWl0SW5mbykgPT4ge1xuICAgICAgICAkc2NvcGUuY29tbWl0SW5mbyA9IGNvbW1pdEluZm87XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcblxuICAgICAgd2lraVJlcG9zaXRvcnkuY29tbWl0VHJlZShjb21taXRJZCwgKGNvbW1pdHMpID0+IHtcbiAgICAgICAgJHNjb3BlLmNvbW1pdHMgPSBjb21taXRzO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goY29tbWl0cywgKGNvbW1pdCkgPT4ge1xuICAgICAgICAgIGNvbW1pdC5maWxlSWNvbkh0bWwgPSBXaWtpLmZpbGVJY29uSHRtbChjb21taXQpO1xuICAgICAgICAgIGNvbW1pdC5maWxlQ2xhc3MgPSBjb21taXQubmFtZS5lbmRzV2l0aChcIi5wcm9maWxlXCIpID8gXCJncmVlblwiIDogXCJcIjtcbiAgICAgICAgICB2YXIgY2hhbmdlVHlwZSA9IGNvbW1pdC5jaGFuZ2VUeXBlO1xuICAgICAgICAgIHZhciBwYXRoID0gY29tbWl0UGF0aChjb21taXQpO1xuICAgICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgICBjb21taXQuZmlsZUxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArICcvdmVyc2lvbi8nICsgcGF0aCArICcvJyArIGNvbW1pdElkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb21taXQuJGRpZmZMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9kaWZmL1wiICsgY29tbWl0SWQgKyBcIi9cIiArIGNvbW1pdElkICsgXCIvXCIgKyAocGF0aCB8fCBcIlwiKTtcbiAgICAgICAgICBpZiAoY2hhbmdlVHlwZSkge1xuICAgICAgICAgICAgY2hhbmdlVHlwZSA9IGNoYW5nZVR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmIChjaGFuZ2VUeXBlLnN0YXJ0c1dpdGgoXCJhXCIpKSB7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VDbGFzcyA9IFwiY2hhbmdlLWFkZFwiO1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlID0gXCJhZGRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LnRpdGxlID0gXCJhZGRlZFwiO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaGFuZ2VUeXBlLnN0YXJ0c1dpdGgoXCJkXCIpKSB7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VDbGFzcyA9IFwiY2hhbmdlLWRlbGV0ZVwiO1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlID0gXCJkZWxldGVcIjtcbiAgICAgICAgICAgICAgY29tbWl0LnRpdGxlID0gXCJkZWxldGVkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5maWxlTGluayA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1tb2RpZnlcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwibW9kaWZ5XCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwibW9kaWZpZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VUeXBlSHRtbCA9ICc8c3BhbiBjbGFzcz1cIicgKyBjb21taXQuY2hhbmdlQ2xhc3MgKyAnXCI+JyArIGNvbW1pdC50aXRsZSArICc8L3NwYW4+JztcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuQ29tbWl0RGV0YWlsQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsICR0ZW1wbGF0ZUNhY2hlLCBtYXJrZWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpID0+IHtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuICAgIHZhciBqb2xva2lhID0gbnVsbDtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5jb21taXRJZCA9ICRzY29wZS5vYmplY3RJZDtcblxuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICBtb2RlOiB7XG4gICAgICAgIG5hbWU6ICdkaWZmJ1xuICAgICAgfVxuICAgIH07XG4gICAgJHNjb3BlLmNvZGVNaXJyb3JPcHRpb25zID0gQ29kZUVkaXRvci5jcmVhdGVFZGl0b3JTZXR0aW5ncyhvcHRpb25zKTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgICRzY29wZS4kd2F0Y2goJ3dvcmtzcGFjZS50cmVlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEkc2NvcGUuZ2l0KSB7XG4gICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJSZWxvYWRpbmcgdGhlIHZpZXcgYXMgd2Ugbm93IHNlZW0gdG8gaGF2ZSBhIGdpdCBtYmVhbiFcIik7XG4gICAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUuY2FuUmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgcmV0dXJuICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCA9PT0gMTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJldmVydCA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBwYXRoID0gY29tbWl0UGF0aChzZWxlY3RlZEl0ZW1zWzBdKTtcbiAgICAgICAgdmFyIG9iamVjdElkID0gJHNjb3BlLmNvbW1pdElkO1xuICAgICAgICBpZiAocGF0aCAmJiBvYmplY3RJZCkge1xuICAgICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gXCJSZXZlcnRpbmcgZmlsZSBcIiArICRzY29wZS5wYWdlSWQgKyBcIiB0byBwcmV2aW91cyB2ZXJzaW9uIFwiICsgb2JqZWN0SWQ7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8oJHNjb3BlLmJyYW5jaCwgb2JqZWN0SWQsICRzY29wZS5wYWdlSWQsIGNvbW1pdE1lc3NhZ2UsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShyZXN1bHQpO1xuICAgICAgICAgICAgLy8gbm93IGxldHMgdXBkYXRlIHRoZSB2aWV3XG4gICAgICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY29tbWl0UGF0aChjb21taXQpIHtcbiAgICAgIHJldHVybiBjb21taXQucGF0aCB8fCBjb21taXQubmFtZTtcbiAgICB9XG5cbiAgICAkc2NvcGUuZGlmZiA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBjb21taXQgPSBzZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICAvKlxuICAgICAgICAgdmFyIGNvbW1pdCA9IHJvdztcbiAgICAgICAgIHZhciBlbnRpdHkgPSByb3cuZW50aXR5O1xuICAgICAgICAgaWYgKGVudGl0eSkge1xuICAgICAgICAgY29tbWl0ID0gZW50aXR5O1xuICAgICAgICAgfVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIG90aGVyQ29tbWl0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG4gICAgICAgIHZhciBsaW5rID0gVXJsSGVscGVycy5qb2luKHN0YXJ0TGluaygkc2NvcGUpLCAgXCIvZGlmZi9cIiArICRzY29wZS5jb21taXRJZCArIFwiL1wiICsgb3RoZXJDb21taXRJZCArIFwiL1wiICsgY29tbWl0UGF0aChjb21taXQpKTtcbiAgICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiI1wiKTtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgocGF0aCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICB2YXIgY29tbWl0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG5cbiAgICAgIFdpa2kubG9hZEJyYW5jaGVzKGpvbG9raWEsIHdpa2lSZXBvc2l0b3J5LCAkc2NvcGUsIGlzRm1jKTtcblxuICAgICAgd2lraVJlcG9zaXRvcnkuY29tbWl0RGV0YWlsKGNvbW1pdElkLCAoY29tbWl0RGV0YWlsKSA9PiB7XG4gICAgICAgIGlmIChjb21taXREZXRhaWwpIHtcbiAgICAgICAgICAkc2NvcGUuY29tbWl0RGV0YWlsID0gY29tbWl0RGV0YWlsO1xuICAgICAgICAgIHZhciBjb21taXQgPSBjb21taXREZXRhaWwuY29tbWl0X2luZm87XG4gICAgICAgICAgJHNjb3BlLmNvbW1pdCA9IGNvbW1pdDtcbiAgICAgICAgICBpZiAoY29tbWl0KSB7XG4gICAgICAgICAgICBjb21taXQuJGRhdGUgPSBEZXZlbG9wZXIuYXNEYXRlKGNvbW1pdC5kYXRlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbW1pdERldGFpbC5kaWZmcywgKGRpZmYpID0+IHtcbiAgICAgICAgICAgIC8vIGFkZCBsaW5rIHRvIHZpZXcgZmlsZSBsaW5rXG4gICAgICAgICAgICB2YXIgcGF0aCA9IGRpZmYubmV3X3BhdGg7XG4gICAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgICBkaWZmLiR2aWV3TGluayA9IFVybEhlbHBlcnMuam9pbihXaWtpLnN0YXJ0V2lraUxpbmsoJHNjb3BlLnByb2plY3RJZCwgY29tbWl0SWQpLCBcInZpZXdcIiwgcGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuICAgIH1cblxuLypcbiAgICAgIHdpa2lSZXBvc2l0b3J5LmNvbW1pdFRyZWUoY29tbWl0SWQsIChjb21taXRzKSA9PiB7XG4gICAgICAgICRzY29wZS5jb21taXRzID0gY29tbWl0cztcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbW1pdHMsIChjb21taXQpID0+IHtcbiAgICAgICAgICBjb21taXQuZmlsZUljb25IdG1sID0gV2lraS5maWxlSWNvbkh0bWwoY29tbWl0KTtcbiAgICAgICAgICBjb21taXQuZmlsZUNsYXNzID0gY29tbWl0Lm5hbWUuZW5kc1dpdGgoXCIucHJvZmlsZVwiKSA/IFwiZ3JlZW5cIiA6IFwiXCI7XG4gICAgICAgICAgdmFyIGNoYW5nZVR5cGUgPSBjb21taXQuY2hhbmdlVHlwZTtcbiAgICAgICAgICB2YXIgcGF0aCA9IGNvbW1pdFBhdGgoY29tbWl0KTtcbiAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgY29tbWl0LmZpbGVMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyAnL3ZlcnNpb24vJyArIHBhdGggKyAnLycgKyBjb21taXRJZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29tbWl0LiRkaWZmTGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvZGlmZi9cIiArIGNvbW1pdElkICsgXCIvXCIgKyBjb21taXRJZCArIFwiL1wiICsgKHBhdGggfHwgXCJcIik7XG4gICAgICAgICAgaWYgKGNoYW5nZVR5cGUpIHtcbiAgICAgICAgICAgIGNoYW5nZVR5cGUgPSBjaGFuZ2VUeXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBpZiAoY2hhbmdlVHlwZS5zdGFydHNXaXRoKFwiYVwiKSkge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1hZGRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwiYWRkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwiYWRkZWRcIjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhbmdlVHlwZS5zdGFydHNXaXRoKFwiZFwiKSkge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1kZWxldGVcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwiZGVsZXRlXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwiZGVsZXRlZFwiO1xuICAgICAgICAgICAgICBjb21taXQuZmlsZUxpbmsgPSBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtbW9kaWZ5XCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcIm1vZGlmeVwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcIm1vZGlmaWVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21taXQuY2hhbmdlVHlwZUh0bWwgPSAnPHNwYW4gY2xhc3M9XCInICsgY29tbWl0LmNoYW5nZUNsYXNzICsgJ1wiPicgKyBjb21taXQudGl0bGUgKyAnPC9zcGFuPic7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG4gICAgfSk7XG4qL1xuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIHZhciBDcmVhdGVDb250cm9sbGVyID0gY29udHJvbGxlcihcIkNyZWF0ZUNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHJvdXRlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCAoJHNjb3BlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zOm5nLnJvdXRlLklSb3V0ZVBhcmFtc1NlcnZpY2UsICRyb3V0ZTpuZy5yb3V0ZS5JUm91dGVTZXJ2aWNlLCAkaHR0cDpuZy5JSHR0cFNlcnZpY2UsICR0aW1lb3V0Om5nLklUaW1lb3V0U2VydmljZSkgPT4ge1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG5cbiAgICAvLyBUT0RPIHJlbW92ZVxuICAgIHZhciB3b3Jrc3BhY2UgPSBudWxsO1xuXG4gICAgJHNjb3BlLmNyZWF0ZURvY3VtZW50VHJlZSA9IFdpa2kuY3JlYXRlV2l6YXJkVHJlZSh3b3Jrc3BhY2UsICRzY29wZSk7XG4gICAgJHNjb3BlLmNyZWF0ZURvY3VtZW50VHJlZUNoaWxkcmVuID0gJHNjb3BlLmNyZWF0ZURvY3VtZW50VHJlZS5jaGlsZHJlbjtcbiAgICAkc2NvcGUuY3JlYXRlRG9jdW1lbnRUcmVlQWN0aXZhdGlvbnMgPSBbXCJjYW1lbC1zcHJpbmcueG1sXCIsIFwiUmVhZE1lLm1kXCJdO1xuXG4gICAgJHNjb3BlLnRyZWVPcHRpb25zID0ge1xuICAgICAgICBub2RlQ2hpbGRyZW46IFwiY2hpbGRyZW5cIixcbiAgICAgICAgZGlyU2VsZWN0YWJsZTogdHJ1ZSxcbiAgICAgICAgaW5qZWN0Q2xhc3Nlczoge1xuICAgICAgICAgICAgdWw6IFwiYTFcIixcbiAgICAgICAgICAgIGxpOiBcImEyXCIsXG4gICAgICAgICAgICBsaVNlbGVjdGVkOiBcImE3XCIsXG4gICAgICAgICAgICBpRXhwYW5kZWQ6IFwiYTNcIixcbiAgICAgICAgICAgIGlDb2xsYXBzZWQ6IFwiYTRcIixcbiAgICAgICAgICAgIGlMZWFmOiBcImE1XCIsXG4gICAgICAgICAgICBsYWJlbDogXCJhNlwiLFxuICAgICAgICAgICAgbGFiZWxTZWxlY3RlZDogXCJhOFwiXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmZpbGVFeGlzdHMgPSB7XG4gICAgICBleGlzdHM6IGZhbHNlLFxuICAgICAgbmFtZTogXCJcIlxuICAgIH07XG4gICAgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSA9IFwiXCI7XG4gICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRFeHRlbnNpb24gPSBudWxsO1xuICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGZhbHNlO1xuICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSBcIlwiO1xuICAgICRzY29wZS5uZXdEb2N1bWVudE5hbWUgPSBcIlwiO1xuXG4gICAgZnVuY3Rpb24gcmV0dXJuVG9EaXJlY3RvcnkoKSB7XG4gICAgICB2YXIgbGluayA9IFdpa2kudmlld0xpbmsoJHNjb3BlLCAkc2NvcGUucGFnZUlkLCAkbG9jYXRpb24pXG4gICAgICBsb2cuZGVidWcoXCJDYW5jZWxsaW5nLCBnb2luZyB0byBsaW5rOiBcIiwgbGluayk7XG4gICAgICBXaWtpLmdvVG9MaW5rKGxpbmssICR0aW1lb3V0LCAkbG9jYXRpb24pO1xuICAgIH1cblxuICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICByZXR1cm5Ub0RpcmVjdG9yeSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub25DcmVhdGVEb2N1bWVudFNlbGVjdCA9IChub2RlKSA9PiB7XG4gICAgICAvLyByZXNldCBhcyB3ZSBzd2l0Y2ggYmV0d2VlbiBkb2N1bWVudCB0eXBlc1xuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gZmFsc2U7XG4gICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gXCJcIjtcbiAgICAgIHZhciBlbnRpdHkgPSBub2RlID8gbm9kZS5lbnRpdHkgOiBudWxsO1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZSA9IGVudGl0eTtcbiAgICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVSZWdleCA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUucmVnZXggfHwgLy4qLztcbiAgICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVJbnZhbGlkID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZS5pbnZhbGlkIHx8IFwiaW52YWxpZCBuYW1lXCI7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlRXh0ZW5zaW9uID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZS5leHRlbnNpb24gfHwgbnVsbDtcbiAgICAgIGxvZy5kZWJ1ZyhcIkVudGl0eTogXCIsIGVudGl0eSk7XG4gICAgICBpZiAoZW50aXR5KSB7XG4gICAgICAgIGlmIChlbnRpdHkuZ2VuZXJhdGVkKSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1TY2hlbWEgPSBlbnRpdHkuZ2VuZXJhdGVkLnNjaGVtYTtcbiAgICAgICAgICAkc2NvcGUuZm9ybURhdGEgPSBlbnRpdHkuZ2VuZXJhdGVkLmZvcm0od29ya3NwYWNlLCAkc2NvcGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRzY29wZS5mb3JtU2NoZW1hID0ge307XG4gICAgICAgICAgJHNjb3BlLmZvcm1EYXRhID0ge307XG4gICAgICAgIH1cbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH1cblxuICAgIH07XG5cbiAgICAkc2NvcGUuYWRkQW5kQ2xvc2VEaWFsb2cgPSAoZmlsZU5hbWU6c3RyaW5nKSA9PiB7XG4gICAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gZmlsZU5hbWU7XG4gICAgICB2YXIgdGVtcGxhdGUgPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlO1xuICAgICAgdmFyIHBhdGggPSBnZXROZXdEb2N1bWVudFBhdGgoKTtcblxuICAgICAgLy8gY2xlYXIgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSBzbyB3ZSBkb250IHJlbWVtYmVyIGl0IHdoZW4gd2Ugb3BlbiBpdCBuZXh0IHRpbWVcbiAgICAgICRzY29wZS5uZXdEb2N1bWVudE5hbWUgPSBudWxsO1xuXG4gICAgICAvLyByZXNldCBiZWZvcmUgd2UgY2hlY2sganVzdCBpbiBhIGJpdFxuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gZmFsc2U7XG4gICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gXCJcIjtcbiAgICAgICRzY29wZS5maWxlRXh0ZW5zaW9uSW52YWxpZCA9IG51bGw7XG5cbiAgICAgIGlmICghdGVtcGxhdGUgfHwgIXBhdGgpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZGF0ZSBpZiB0aGUgbmFtZSBtYXRjaCB0aGUgZXh0ZW5zaW9uXG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbikge1xuICAgICAgICB2YXIgaWR4ID0gcGF0aC5sYXN0SW5kZXhPZignLicpO1xuICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgIHZhciBleHQgPSBwYXRoLnN1YnN0cmluZyhpZHgpO1xuICAgICAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlRXh0ZW5zaW9uICE9PSBleHQpIHtcbiAgICAgICAgICAgICRzY29wZS5maWxlRXh0ZW5zaW9uSW52YWxpZCA9IFwiRmlsZSBleHRlbnNpb24gbXVzdCBiZTogXCIgKyAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlRXh0ZW5zaW9uO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGUgaWYgdGhlIGZpbGUgZXhpc3RzLCBhbmQgdXNlIHRoZSBzeW5jaHJvbm91cyBjYWxsXG4gICAgICB3aWtpUmVwb3NpdG9yeS5leGlzdHMoJHNjb3BlLmJyYW5jaCwgcGF0aCwgKGV4aXN0cykgPT4ge1xuICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSBleGlzdHM7XG4gICAgICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSBleGlzdHMgPyBwYXRoIDogZmFsc2U7XG4gICAgICAgIGlmICghZXhpc3RzKSB7XG4gICAgICAgICAgZG9DcmVhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIGRvQ3JlYXRlKCkge1xuICAgICAgICB2YXIgbmFtZSA9IFdpa2kuZmlsZU5hbWUocGF0aCk7XG4gICAgICAgIHZhciBmb2xkZXIgPSBXaWtpLmZpbGVQYXJlbnQocGF0aCk7XG4gICAgICAgIHZhciBleGVtcGxhciA9IHRlbXBsYXRlLmV4ZW1wbGFyO1xuXG4gICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gXCJDcmVhdGVkIFwiICsgdGVtcGxhdGUubGFiZWw7XG4gICAgICAgIHZhciBleGVtcGxhclVyaSA9IENvcmUudXJsKFwiL3BsdWdpbnMvd2lraS9leGVtcGxhci9cIiArIGV4ZW1wbGFyKTtcblxuICAgICAgICBpZiAodGVtcGxhdGUuZm9sZGVyKSB7XG4gICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiQ3JlYXRpbmcgbmV3IGZvbGRlciBcIiArIG5hbWUpO1xuXG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkuY3JlYXRlRGlyZWN0b3J5KCRzY29wZS5icmFuY2gsIHBhdGgsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgICAgIHZhciBsaW5rID0gV2lraS52aWV3TGluaygkc2NvcGUsIHBhdGgsICRsb2NhdGlvbik7XG4gICAgICAgICAgICBnb1RvTGluayhsaW5rLCAkdGltZW91dCwgJGxvY2F0aW9uKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZS5wcm9maWxlKSB7XG5cbiAgICAgICAgICBmdW5jdGlvbiB0b1BhdGgocHJvZmlsZU5hbWU6c3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgYW5zd2VyID0gXCJmYWJyaWMvcHJvZmlsZXMvXCIgKyBwcm9maWxlTmFtZTtcbiAgICAgICAgICAgIGFuc3dlciA9IGFuc3dlci5yZXBsYWNlKC8tL2csIFwiL1wiKTtcbiAgICAgICAgICAgIGFuc3dlciA9IGFuc3dlciArIFwiLnByb2ZpbGVcIjtcbiAgICAgICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3Rpb24gdG9Qcm9maWxlTmFtZShwYXRoOnN0cmluZykge1xuICAgICAgICAgICAgdmFyIGFuc3dlciA9IHBhdGgucmVwbGFjZSgvXmZhYnJpY1xcL3Byb2ZpbGVzXFwvLywgXCJcIik7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIucmVwbGFjZSgvXFwvL2csIFwiLVwiKTtcbiAgICAgICAgICAgIGFuc3dlciA9IGFuc3dlci5yZXBsYWNlKC9cXC5wcm9maWxlJC8sIFwiXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBzdHJpcCBvZmYgYW55IHByb2ZpbGUgbmFtZSBpbiBjYXNlIHRoZSB1c2VyIGNyZWF0ZXMgYSBwcm9maWxlIHdoaWxlIGxvb2tpbmcgYXRcbiAgICAgICAgICAvLyBhbm90aGVyIHByb2ZpbGVcbiAgICAgICAgICBmb2xkZXIgPSBmb2xkZXIucmVwbGFjZSgvXFwvPT8oXFx3KilcXC5wcm9maWxlJC8sIFwiXCIpO1xuXG4gICAgICAgICAgdmFyIGNvbmNhdGVuYXRlZCA9IGZvbGRlciArIFwiL1wiICsgbmFtZTtcblxuICAgICAgICAgIHZhciBwcm9maWxlTmFtZSA9IHRvUHJvZmlsZU5hbWUoY29uY2F0ZW5hdGVkKTtcbiAgICAgICAgICB2YXIgdGFyZ2V0UGF0aCA9IHRvUGF0aChwcm9maWxlTmFtZSk7XG5cbiAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZS5nZW5lcmF0ZWQpIHtcbiAgICAgICAgICB2YXIgb3B0aW9uczpXaWtpLkdlbmVyYXRlT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHdvcmtzcGFjZTogd29ya3NwYWNlLFxuICAgICAgICAgICAgZm9ybTogJHNjb3BlLmZvcm1EYXRhLFxuICAgICAgICAgICAgbmFtZTogZmlsZU5hbWUsXG4gICAgICAgICAgICBwYXJlbnRJZDogZm9sZGVyLFxuICAgICAgICAgICAgYnJhbmNoOiAkc2NvcGUuYnJhbmNoLFxuICAgICAgICAgICAgc3VjY2VzczogKGNvbnRlbnRzKT0+IHtcbiAgICAgICAgICAgICAgaWYgKGNvbnRlbnRzKSB7XG4gICAgICAgICAgICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb250ZW50cywgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnKFwiQ3JlYXRlZCBmaWxlIFwiICsgbmFtZSk7XG4gICAgICAgICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgICAgICAgICAgIHJldHVyblRvRGlyZWN0b3J5KCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuVG9EaXJlY3RvcnkoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yOiAoZXJyb3IpPT4ge1xuICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbignZXJyb3InLCBlcnJvcik7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgICB0ZW1wbGF0ZS5nZW5lcmF0ZWQuZ2VuZXJhdGUob3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gbG9hZCB0aGUgZXhhbXBsZSBkYXRhIChpZiBhbnkpIGFuZCB0aGVuIGFkZCB0aGUgZG9jdW1lbnQgdG8gZ2l0IGFuZCBjaGFuZ2UgdGhlIGxpbmsgdG8gdGhlIG5ldyBkb2N1bWVudFxuICAgICAgICAgICRodHRwLmdldChleGVtcGxhclVyaSlcbiAgICAgICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICBwdXRQYWdlKHBhdGgsIG5hbWUsIGZvbGRlciwgZGF0YSwgY29tbWl0TWVzc2FnZSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAvLyBjcmVhdGUgYW4gZW1wdHkgZmlsZVxuICAgICAgICAgICAgICBwdXRQYWdlKHBhdGgsIG5hbWUsIGZvbGRlciwgXCJcIiwgY29tbWl0TWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBwdXRQYWdlKHBhdGgsIG5hbWUsIGZvbGRlciwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgIC8vIFRPRE8gbGV0cyBjaGVjayB0aGlzIHBhZ2UgZG9lcyBub3QgZXhpc3QgLSBpZiBpdCBkb2VzIGxldHMga2VlcCBhZGRpbmcgYSBuZXcgcG9zdCBmaXguLi5cbiAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgbG9nLmRlYnVnKFwiQ3JlYXRlZCBmaWxlIFwiICsgbmFtZSk7XG4gICAgICAgIFdpa2kub25Db21wbGV0ZShzdGF0dXMpO1xuXG4gICAgICAgIC8vIGxldHMgbmF2aWdhdGUgdG8gdGhlIGVkaXQgbGlua1xuICAgICAgICAvLyBsb2FkIHRoZSBkaXJlY3RvcnkgYW5kIGZpbmQgdGhlIGNoaWxkIGl0ZW1cbiAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgZm9sZGVyLCAkc2NvcGUub2JqZWN0SWQsIChkZXRhaWxzKSA9PiB7XG4gICAgICAgICAgLy8gbGV0cyBmaW5kIHRoZSBjaGlsZCBlbnRyeSBzbyB3ZSBjYW4gY2FsY3VsYXRlIGl0cyBjb3JyZWN0IGVkaXQgbGlua1xuICAgICAgICAgIHZhciBsaW5rOnN0cmluZyA9IG51bGw7XG4gICAgICAgICAgaWYgKGRldGFpbHMgJiYgZGV0YWlscy5jaGlsZHJlbikge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwic2Nhbm5lZCB0aGUgZGlyZWN0b3J5IFwiICsgZGV0YWlscy5jaGlsZHJlbi5sZW5ndGggKyBcIiBjaGlsZHJlblwiKTtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGRldGFpbHMuY2hpbGRyZW4uZmluZChjID0+IGMubmFtZSA9PT0gZmlsZU5hbWUpO1xuICAgICAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgICAgIGxpbmsgPSAkc2NvcGUuY2hpbGRMaW5rKGNoaWxkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNvdWxkIG5vdCBmaW5kIG5hbWUgJ1wiICsgZmlsZU5hbWUgKyBcIicgaW4gdGhlIGxpc3Qgb2YgZmlsZSBuYW1lcyBcIiArIEpTT04uc3RyaW5naWZ5KGRldGFpbHMuY2hpbGRyZW4ubWFwKGMgPT4gYy5uYW1lKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWxpbmspIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIldBUk5JTkc6IGNvdWxkIG5vdCBmaW5kIHRoZSBjaGlsZExpbmsgc28gcmV2ZXJ0aW5nIHRvIHRoZSB3aWtpIGVkaXQgcGFnZSFcIik7XG4gICAgICAgICAgICBsaW5rID0gV2lraS5lZGl0TGluaygkc2NvcGUsIHBhdGgsICRsb2NhdGlvbik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICBnb1RvTGluayhsaW5rLCAkdGltZW91dCwgJGxvY2F0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5ld0RvY3VtZW50UGF0aCgpIHtcbiAgICAgIHZhciB0ZW1wbGF0ZSA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGU7XG4gICAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIHRlbXBsYXRlIHNlbGVjdGVkLlwiKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICB2YXIgZXhlbXBsYXIgPSB0ZW1wbGF0ZS5leGVtcGxhciB8fCBcIlwiO1xuICAgICAgdmFyIG5hbWU6c3RyaW5nID0gJHNjb3BlLm5ld0RvY3VtZW50TmFtZSB8fCBleGVtcGxhcjtcblxuICAgICAgaWYgKG5hbWUuaW5kZXhPZignLicpIDwgMCkge1xuICAgICAgICAvLyBsZXRzIGFkZCB0aGUgZmlsZSBleHRlbnNpb24gZnJvbSB0aGUgZXhlbXBsYXJcbiAgICAgICAgdmFyIGlkeCA9IGV4ZW1wbGFyLmxhc3RJbmRleE9mKFwiLlwiKTtcbiAgICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgICBuYW1lICs9IGV4ZW1wbGFyLnN1YnN0cmluZyhpZHgpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGxldHMgZGVhbCB3aXRoIGRpcmVjdG9yaWVzIGluIHRoZSBuYW1lXG4gICAgICB2YXIgZm9sZGVyOnN0cmluZyA9ICRzY29wZS5wYWdlSWQ7XG4gICAgICBpZiAoJHNjb3BlLmlzRmlsZSkge1xuICAgICAgICAvLyBpZiB3ZSBhcmUgYSBmaWxlIGxldHMgZGlzY2FyZCB0aGUgbGFzdCBwYXJ0IG9mIHRoZSBwYXRoXG4gICAgICAgIHZhciBpZHg6YW55ID0gZm9sZGVyLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgICAgaWYgKGlkeCA8PSAwKSB7XG4gICAgICAgICAgZm9sZGVyID0gXCJcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb2xkZXIgPSBmb2xkZXIuc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBpZHg6YW55ID0gbmFtZS5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICBmb2xkZXIgKz0gXCIvXCIgKyBuYW1lLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICB9XG4gICAgICBmb2xkZXIgPSBDb3JlLnRyaW1MZWFkaW5nKGZvbGRlciwgXCIvXCIpO1xuICAgICAgcmV0dXJuIGZvbGRlciArIChmb2xkZXIgPyBcIi9cIiA6IFwiXCIpICsgbmFtZTtcbiAgICB9XG5cbiAgfV0pO1xuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkVkaXRDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpID0+IHtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnLnB1c2goY3JlYXRlRWRpdGluZ0JyZWFkY3J1bWIoJHNjb3BlKSk7XG5cbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuZW50aXR5ID0ge1xuICAgICAgc291cmNlOiBudWxsXG4gICAgfTtcblxuICAgIHZhciBmb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQoJHNjb3BlLnBhZ2VJZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSk7XG4gICAgdmFyIGZvcm0gPSBudWxsO1xuICAgIGlmICgoZm9ybWF0ICYmIGZvcm1hdCA9PT0gXCJqYXZhc2NyaXB0XCIpIHx8IGlzQ3JlYXRlKCkpIHtcbiAgICAgIGZvcm0gPSAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdO1xuICAgIH1cblxuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgbW9kZToge1xuICAgICAgICBuYW1lOiBmb3JtYXRcbiAgICAgIH1cbiAgICB9O1xuICAgICRzY29wZS5jb2RlTWlycm9yT3B0aW9ucyA9IENvZGVFZGl0b3IuY3JlYXRlRWRpdG9yU2V0dGluZ3Mob3B0aW9ucyk7XG4gICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG5cblxuICAgICRzY29wZS5pc1ZhbGlkID0gKCkgPT4gJHNjb3BlLmZpbGVOYW1lO1xuXG4gICAgJHNjb3BlLmNhblNhdmUgPSAoKSA9PiAhJHNjb3BlLm1vZGlmaWVkO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnZW50aXR5LnNvdXJjZScsIChuZXdWYWx1ZSwgb2xkVmFsdWUpID0+IHtcbiAgICAgICRzY29wZS5tb2RpZmllZCA9IG5ld1ZhbHVlICYmIG9sZFZhbHVlICYmIG5ld1ZhbHVlICE9PSBvbGRWYWx1ZTtcbiAgICB9LCB0cnVlKTtcblxuICAgIGxvZy5kZWJ1ZyhcInBhdGg6IFwiLCAkc2NvcGUucGF0aCk7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdtb2RpZmllZCcsIChuZXdWYWx1ZSwgb2xkVmFsdWUpID0+IHtcbiAgICAgIGxvZy5kZWJ1ZyhcIm1vZGlmaWVkOiBcIiwgbmV3VmFsdWUpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLnZpZXdMaW5rID0gKCkgPT4gV2lraS52aWV3TGluaygkc2NvcGUsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbiwgJHNjb3BlLmZpbGVOYW1lKTtcblxuICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICBnb1RvVmlldygpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZSA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQgJiYgJHNjb3BlLmZpbGVOYW1lKSB7XG4gICAgICAgIHNhdmVUbygkc2NvcGVbXCJwYWdlSWRcIl0pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY3JlYXRlID0gKCkgPT4ge1xuICAgICAgLy8gbGV0cyBjb21iaW5lIHRoZSBmaWxlIG5hbWUgd2l0aCB0aGUgY3VycmVudCBwYWdlSWQgKHdoaWNoIGlzIHRoZSBkaXJlY3RvcnkpXG4gICAgICB2YXIgcGF0aCA9ICRzY29wZS5wYWdlSWQgKyBcIi9cIiArICRzY29wZS5maWxlTmFtZTtcbiAgICAgIGxvZy5kZWJ1ZyhcImNyZWF0aW5nIG5ldyBmaWxlIGF0IFwiICsgcGF0aCk7XG4gICAgICBzYXZlVG8ocGF0aCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vblN1Ym1pdCA9IChqc29uLCBmb3JtKSA9PiB7XG4gICAgICBpZiAoaXNDcmVhdGUoKSkge1xuICAgICAgICAkc2NvcGUuY3JlYXRlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuc2F2ZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUub25DYW5jZWwgPSAoZm9ybSkgPT4ge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSlcbiAgICAgIH0sIDUwKTtcbiAgICB9O1xuXG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiBpc0NyZWF0ZSgpIHtcbiAgICAgIHJldHVybiAkbG9jYXRpb24ucGF0aCgpLnN0YXJ0c1dpdGgoXCIvd2lraS9jcmVhdGVcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIC8vIG9ubHkgbG9hZCB0aGUgc291cmNlIGlmIG5vdCBpbiBjcmVhdGUgbW9kZVxuICAgICAgaWYgKGlzQ3JlYXRlKCkpIHtcbiAgICAgICAgdXBkYXRlU291cmNlVmlldygpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiR2V0dGluZyBwYWdlLCBicmFuY2g6IFwiLCAkc2NvcGUuYnJhbmNoLCBcIiBwYWdlSWQ6IFwiLCAkc2NvcGUucGFnZUlkLCBcIiBvYmplY3RJZDogXCIsICRzY29wZS5vYmplY3RJZCk7XG4gICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgJHNjb3BlLm9iamVjdElkLCBvbkZpbGVDb250ZW50cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25GaWxlQ29udGVudHMoZGV0YWlscykge1xuICAgICAgdmFyIGNvbnRlbnRzID0gZGV0YWlscy50ZXh0O1xuICAgICAgJHNjb3BlLmVudGl0eS5zb3VyY2UgPSBjb250ZW50cztcbiAgICAgICRzY29wZS5maWxlTmFtZSA9ICRzY29wZS5wYWdlSWQuc3BsaXQoJy8nKS5sYXN0KCk7XG4gICAgICBsb2cuZGVidWcoXCJmaWxlIG5hbWU6IFwiLCAkc2NvcGUuZmlsZU5hbWUpO1xuICAgICAgbG9nLmRlYnVnKFwiZmlsZSBkZXRhaWxzOiBcIiwgZGV0YWlscyk7XG4gICAgICB1cGRhdGVTb3VyY2VWaWV3KCk7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVNvdXJjZVZpZXcoKSB7XG4gICAgICBpZiAoZm9ybSkge1xuICAgICAgICBpZiAoaXNDcmVhdGUoKSkge1xuICAgICAgICAgIC8vIGxldHMgZGVmYXVsdCBhIGZpbGUgbmFtZVxuICAgICAgICAgIGlmICghJHNjb3BlLmZpbGVOYW1lKSB7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZU5hbWUgPSBcIlwiICsgQ29yZS5nZXRVVUlEKCkgKyBcIi5qc29uXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIG5vdyBsZXRzIHRyeSBsb2FkIHRoZSBmb3JtIGRlZmludGlvbiBKU09OIHNvIHdlIGNhbiB0aGVuIHJlbmRlciB0aGUgZm9ybVxuICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IG51bGw7XG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvcm0sICRzY29wZS5vYmplY3RJZCwgKGRldGFpbHMpID0+IHtcbiAgICAgICAgICBvbkZvcm1TY2hlbWEoV2lraS5wYXJzZUpzb24oZGV0YWlscy50ZXh0KSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL3NvdXJjZUVkaXQuaHRtbFwiO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRm9ybVNjaGVtYShqc29uKSB7XG4gICAgICAkc2NvcGUuZm9ybURlZmluaXRpb24gPSBqc29uO1xuICAgICAgaWYgKCRzY29wZS5lbnRpdHkuc291cmNlKSB7XG4gICAgICAgICRzY29wZS5mb3JtRW50aXR5ID0gV2lraS5wYXJzZUpzb24oJHNjb3BlLmVudGl0eS5zb3VyY2UpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL2Zvcm1FZGl0Lmh0bWxcIjtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ29Ub1ZpZXcoKSB7XG4gICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcoJHNjb3BlLnZpZXdMaW5rKCksIFwiI1wiKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImdvaW5nIHRvIHZpZXcgXCIgKyBwYXRoKTtcbiAgICAgICRsb2NhdGlvbi5wYXRoKFdpa2kuZGVjb2RlUGF0aChwYXRoKSk7XG4gICAgICBsb2cuZGVidWcoXCJsb2NhdGlvbiBpcyBub3cgXCIgKyAkbG9jYXRpb24ucGF0aCgpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzYXZlVG8ocGF0aDpzdHJpbmcpIHtcbiAgICAgIHZhciBjb21taXRNZXNzYWdlID0gJHNjb3BlLmNvbW1pdE1lc3NhZ2UgfHwgXCJVcGRhdGVkIHBhZ2UgXCIgKyAkc2NvcGUucGFnZUlkO1xuICAgICAgdmFyIGNvbnRlbnRzID0gJHNjb3BlLmVudGl0eS5zb3VyY2U7XG4gICAgICBpZiAoJHNjb3BlLmZvcm1FbnRpdHkpIHtcbiAgICAgICAgY29udGVudHMgPSBKU09OLnN0cmluZ2lmeSgkc2NvcGUuZm9ybUVudGl0eSwgbnVsbCwgXCIgIFwiKTtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcIlNhdmluZyBmaWxlLCBicmFuY2g6IFwiLCAkc2NvcGUuYnJhbmNoLCBcIiBwYXRoOiBcIiwgJHNjb3BlLnBhdGgpO1xuICAgICAgLy9sb2cuZGVidWcoXCJBYm91dCB0byB3cml0ZSBjb250ZW50cyAnXCIgKyBjb250ZW50cyArIFwiJ1wiKTtcbiAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG4gICAgICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJTYXZlZCBcIiArIHBhdGgpO1xuICAgICAgICBnb1RvVmlldygpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIC8vIGNvbnRyb2xsZXIgZm9yIGhhbmRsaW5nIGZpbGUgZHJvcHNcbiAgZXhwb3J0IHZhciBGaWxlRHJvcENvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkZpbGVEcm9wQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCJGaWxlVXBsb2FkZXJcIiwgXCIkcm91dGVcIiwgXCIkdGltZW91dFwiLCBcInVzZXJEZXRhaWxzXCIsICgkc2NvcGUsIEZpbGVVcGxvYWRlciwgJHJvdXRlOm5nLnJvdXRlLklSb3V0ZVNlcnZpY2UsICR0aW1lb3V0Om5nLklUaW1lb3V0U2VydmljZSwgdXNlckRldGFpbHM6Q29yZS5Vc2VyRGV0YWlscykgPT4ge1xuXG5cbiAgICB2YXIgdXBsb2FkVVJJID0gV2lraS5naXRSZXN0VVJMKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCkgKyAnLyc7XG4gICAgdmFyIHVwbG9hZGVyID0gJHNjb3BlLnVwbG9hZGVyID0gbmV3IEZpbGVVcGxvYWRlcih7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdBdXRob3JpemF0aW9uJzogQ29yZS5hdXRoSGVhZGVyVmFsdWUodXNlckRldGFpbHMpXG4gICAgICB9LFxuICAgICAgYXV0b1VwbG9hZDogdHJ1ZSxcbiAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZSxcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgdXJsOiB1cGxvYWRVUklcbiAgICB9KTtcbiAgICAkc2NvcGUuZG9VcGxvYWQgPSAoKSA9PiB7XG4gICAgICB1cGxvYWRlci51cGxvYWRBbGwoKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uV2hlbkFkZGluZ0ZpbGVGYWlsZWQgPSBmdW5jdGlvbiAoaXRlbSAvKntGaWxlfEZpbGVMaWtlT2JqZWN0fSovLCBmaWx0ZXIsIG9wdGlvbnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25XaGVuQWRkaW5nRmlsZUZhaWxlZCcsIGl0ZW0sIGZpbHRlciwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkFmdGVyQWRkaW5nRmlsZSA9IGZ1bmN0aW9uIChmaWxlSXRlbSkge1xuICAgICAgbG9nLmRlYnVnKCdvbkFmdGVyQWRkaW5nRmlsZScsIGZpbGVJdGVtKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQWZ0ZXJBZGRpbmdBbGwgPSBmdW5jdGlvbiAoYWRkZWRGaWxlSXRlbXMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25BZnRlckFkZGluZ0FsbCcsIGFkZGVkRmlsZUl0ZW1zKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQmVmb3JlVXBsb2FkSXRlbSA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICBpZiAoJ2ZpbGUnIGluIGl0ZW0pIHtcbiAgICAgICAgaXRlbS5maWxlU2l6ZU1CID0gKGl0ZW0uZmlsZS5zaXplIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoMik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpdGVtLmZpbGVTaXplTUIgPSAwO1xuICAgICAgfVxuICAgICAgLy9pdGVtLnVybCA9IFVybEhlbHBlcnMuam9pbih1cGxvYWRVUkksIGl0ZW0uZmlsZS5uYW1lKTtcbiAgICAgIGl0ZW0udXJsID0gdXBsb2FkVVJJO1xuICAgICAgbG9nLmluZm8oXCJMb2FkaW5nIGZpbGVzIHRvIFwiICsgdXBsb2FkVVJJKTtcbiAgICAgIGxvZy5kZWJ1Zygnb25CZWZvcmVVcGxvYWRJdGVtJywgaXRlbSk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vblByb2dyZXNzSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcHJvZ3Jlc3MpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25Qcm9ncmVzc0l0ZW0nLCBmaWxlSXRlbSwgcHJvZ3Jlc3MpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25Qcm9ncmVzc0FsbCA9IGZ1bmN0aW9uIChwcm9ncmVzcykge1xuICAgICAgbG9nLmRlYnVnKCdvblByb2dyZXNzQWxsJywgcHJvZ3Jlc3MpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25TdWNjZXNzSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvblN1Y2Nlc3NJdGVtJywgZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25FcnJvckl0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25FcnJvckl0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkNhbmNlbEl0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25DYW5jZWxJdGVtJywgZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25Db21wbGV0ZUl0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25Db21wbGV0ZUl0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkNvbXBsZXRlQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgbG9nLmRlYnVnKCdvbkNvbXBsZXRlQWxsJyk7XG4gICAgICB1cGxvYWRlci5jbGVhclF1ZXVlKCk7XG4gICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgIGxvZy5pbmZvKFwiQ29tcGxldGVkIGFsbCB1cGxvYWRzLiBMZXRzIGZvcmNlIGEgcmVsb2FkXCIpO1xuICAgICAgICAkcm91dGUucmVsb2FkKCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9LCAyMDApO1xuICAgIH07XG4gIH1dKTtcblxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkZvcm1UYWJsZUNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKSA9PiB7XG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmNvbHVtbkRlZnMgPSBbXTtcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgICBkYXRhOiAnbGlzdCcsXG4gICAgICAgZGlzcGxheUZvb3RlcjogZmFsc2UsXG4gICAgICAgc2hvd0ZpbHRlcjogZmFsc2UsXG4gICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgZmlsdGVyVGV4dDogJydcbiAgICAgICB9LFxuICAgICAgIGNvbHVtbkRlZnM6ICRzY29wZS5jb2x1bW5EZWZzXG4gICAgIH07XG5cblxuICAgICRzY29wZS52aWV3TGluayA9IChyb3cpID0+IHtcbiAgICAgIHJldHVybiBjaGlsZExpbmsocm93LCBcIi92aWV3XCIpO1xuICAgIH07XG4gICAgJHNjb3BlLmVkaXRMaW5rID0gKHJvdykgPT4ge1xuICAgICAgcmV0dXJuIGNoaWxkTGluayhyb3csIFwiL2VkaXRcIik7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNoaWxkTGluayhjaGlsZCwgcHJlZml4KSB7XG4gICAgICB2YXIgc3RhcnQgPSBXaWtpLnN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgdmFyIGNoaWxkSWQgPSAoY2hpbGQpID8gY2hpbGRbXCJfaWRcIl0gfHwgXCJcIiA6IFwiXCI7XG4gICAgICByZXR1cm4gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgc3RhcnQgKyBwcmVmaXggKyBcIi9cIiArICRzY29wZS5wYWdlSWQgKyBcIi9cIiArIGNoaWxkSWQpO1xuICAgIH1cblxuICAgIHZhciBsaW5rc0NvbHVtbiA9IHtcbiAgICAgIGZpZWxkOiAnX2lkJyxcbiAgICAgIGRpc3BsYXlOYW1lOiAnQWN0aW9ucycsXG4gICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dFwiXCI+PGEgbmctaHJlZj1cInt7dmlld0xpbmsocm93LmVudGl0eSl9fVwiIGNsYXNzPVwiYnRuXCI+VmlldzwvYT4gPGEgbmctaHJlZj1cInt7ZWRpdExpbmsocm93LmVudGl0eSl9fVwiIGNsYXNzPVwiYnRuXCI+RWRpdDwvYT48L2Rpdj4nXG4gICAgfTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgIHZhciBmb3JtID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXTtcbiAgICBpZiAoZm9ybSkge1xuICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb3JtLCAkc2NvcGUub2JqZWN0SWQsIG9uRm9ybURhdGEpO1xuICAgIH1cblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIG9uUmVzdWx0cyhyZXNwb25zZSkge1xuICAgICAgdmFyIGxpc3QgPSBbXTtcbiAgICAgIHZhciBtYXAgPSBXaWtpLnBhcnNlSnNvbihyZXNwb25zZSk7XG4gICAgICBhbmd1bGFyLmZvckVhY2gobWFwLCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICB2YWx1ZVtcIl9pZFwiXSA9IGtleTtcbiAgICAgICAgbGlzdC5wdXNoKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgICAgJHNjb3BlLmxpc3QgPSBsaXN0O1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgdmFyIGZpbHRlciA9IENvcmUucGF0aEdldCgkc2NvcGUsIFtcImdyaWRPcHRpb25zXCIsIFwiZmlsdGVyT3B0aW9uc1wiLCBcImZpbHRlclRleHRcIl0pIHx8IFwiXCI7XG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuanNvbkNoaWxkQ29udGVudHMoJHNjb3BlLnBhZ2VJZCwgXCIqLmpzb25cIiwgZmlsdGVyLCBvblJlc3VsdHMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRm9ybURhdGEoZGV0YWlscykge1xuICAgICAgdmFyIHRleHQgPSBkZXRhaWxzLnRleHQ7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICAkc2NvcGUuZm9ybURlZmluaXRpb24gPSBXaWtpLnBhcnNlSnNvbih0ZXh0KTtcblxuICAgICAgICB2YXIgY29sdW1uRGVmcyA9IFtdO1xuICAgICAgICB2YXIgc2NoZW1hID0gJHNjb3BlLmZvcm1EZWZpbml0aW9uO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hLnByb3BlcnRpZXMsIChwcm9wZXJ0eSwgbmFtZSkgPT4ge1xuICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICBpZiAoIUZvcm1zLmlzQXJyYXlPck5lc3RlZE9iamVjdChwcm9wZXJ0eSwgc2NoZW1hKSkge1xuICAgICAgICAgICAgICB2YXIgY29sRGVmID0ge1xuICAgICAgICAgICAgICAgIGZpZWxkOiBuYW1lLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiBwcm9wZXJ0eS5kZXNjcmlwdGlvbiB8fCBuYW1lLFxuICAgICAgICAgICAgICAgIHZpc2libGU6IHRydWVcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY29sdW1uRGVmcy5wdXNoKGNvbERlZik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY29sdW1uRGVmcy5wdXNoKGxpbmtzQ29sdW1uKTtcblxuICAgICAgICAkc2NvcGUuY29sdW1uRGVmcyA9IGNvbHVtbkRlZnM7XG4gICAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5jb2x1bW5EZWZzID0gY29sdW1uRGVmcztcblxuICAgICAgICAvLyBub3cgd2UgaGF2ZSB0aGUgZ3JpZCBjb2x1bW4gc3R1ZmYgbG9hZGVkLCBsZXRzIGxvYWQgdGhlIGRhdGF0YWJsZVxuICAgICAgICAkc2NvcGUudGFibGVWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9mb3JtVGFibGVEYXRhdGFibGUuaHRtbFwiO1xuICAgICAgfVxuICAgIH1cbiAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xuIG1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5HaXRQcmVmZXJlbmNlc1wiLCBbXCIkc2NvcGVcIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCJ1c2VyRGV0YWlsc1wiLCAoJHNjb3BlLCBsb2NhbFN0b3JhZ2UsIHVzZXJEZXRhaWxzKSA9PiB7XG5cbiAgICB2YXIgY29uZmlnID0ge1xuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBnaXRVc2VyTmFtZToge1xuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGxhYmVsOiAnVXNlcm5hbWUnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIHVzZXIgbmFtZSB0byBiZSB1c2VkIHdoZW4gbWFraW5nIGNoYW5nZXMgdG8gZmlsZXMgd2l0aCB0aGUgc291cmNlIGNvbnRyb2wgc3lzdGVtJ1xuICAgICAgICB9LFxuICAgICAgICBnaXRVc2VyRW1haWw6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBsYWJlbDogJ0VtYWlsJyxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBlbWFpbCBhZGRyZXNzIHRvIHVzZSB3aGVuIG1ha2luZyBjaGFuZ2VzIHRvIGZpbGVzIHdpdGggdGhlIHNvdXJjZSBjb250cm9sIHN5c3RlbSdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZW50aXR5ID0gJHNjb3BlO1xuICAgICRzY29wZS5jb25maWcgPSBjb25maWc7XG5cbiAgICBDb3JlLmluaXRQcmVmZXJlbmNlU2NvcGUoJHNjb3BlLCBsb2NhbFN0b3JhZ2UsIHtcbiAgICAgICdnaXRVc2VyTmFtZSc6IHtcbiAgICAgICAgJ3ZhbHVlJzogdXNlckRldGFpbHMudXNlcm5hbWUgfHwgXCJcIlxuICAgICAgfSxcbiAgICAgICdnaXRVc2VyRW1haWwnOiB7XG4gICAgICAgICd2YWx1ZSc6ICcnXG4gICAgICB9ICBcbiAgICB9KTtcbiAgfV0pO1xuIH1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5IaXN0b3J5Q29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgbWFya2VkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcbiAgICB2YXIgam9sb2tpYSA9IG51bGw7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAvLyBUT0RPIHdlIGNvdWxkIGNvbmZpZ3VyZSB0aGlzP1xuICAgICRzY29wZS5kYXRlRm9ybWF0ID0gJ0VFRSwgTU1NIGQsIHkgYXQgSEg6bW06c3MgWic7XG4gICAgLy8neXl5eS1NTS1kZCBISDptbTpzcyBaJ1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgZGF0YTogJ2xvZ3MnLFxuICAgICAgc2hvd0ZpbHRlcjogZmFsc2UsXG4gICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogZmFsc2UsXG4gICAgICBtdWx0aVNlbGVjdDogdHJ1ZSxcbiAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgZGlzcGxheVNlbGVjdGlvbkNoZWNrYm94IDogdHJ1ZSwgLy8gb2xkIHByZSAyLjAgY29uZmlnIVxuICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICBmaWx0ZXJUZXh0OiAnJ1xuICAgICAgfSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnJGRhdGUnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTW9kaWZpZWQnLFxuICAgICAgICAgIGRlZmF1bHRTb3J0OiB0cnVlLFxuICAgICAgICAgIGFzY2VuZGluZzogZmFsc2UsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cIm5nQ2VsbFRleHQgdGV4dC1ub3dyYXBcIiB0aXRsZT1cInt7cm93LmVudGl0eS4kZGF0ZSB8IGRhdGU6XFwnRUVFLCBNTU0gZCwgeXl5eSA6IEhIOm1tOnNzIFpcXCd9fVwiPnt7cm93LmVudGl0eS4kZGF0ZS5yZWxhdGl2ZSgpfX08L2Rpdj4nLFxuICAgICAgICAgIHdpZHRoOiBcIioqXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnc2hhJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ0NoYW5nZScsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cIm5nQ2VsbFRleHQgdGV4dC1ub3dyYXBcIj48YSBjbGFzcz1cImNvbW1pdC1saW5rXCIgbmctaHJlZj1cInt7cm93LmVudGl0eS5jb21taXRMaW5rfX17e2hhc2h9fVwiIHRpdGxlPVwie3tyb3cuZW50aXR5LnNoYX19XCI+e3tyb3cuZW50aXR5LnNoYSB8IGxpbWl0VG86N319IDxpIGNsYXNzPVwiZmEgZmEtYXJyb3ctY2lyY2xlLXJpZ2h0XCI+PC9pPjwvYT48L2Rpdj4nLFxuICAgICAgICAgIGNlbGxGaWx0ZXI6IFwiXCIsXG4gICAgICAgICAgd2lkdGg6IFwiKlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ2F1dGhvcicsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdBdXRob3InLFxuICAgICAgICAgIGNlbGxGaWx0ZXI6IFwiXCIsXG4gICAgICAgICAgd2lkdGg6IFwiKipcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdzaG9ydF9tZXNzYWdlJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ01lc3NhZ2UnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0IHRleHQtbm93cmFwXCIgdGl0bGU9XCJ7e3Jvdy5lbnRpdHkuc2hvcnRfbWVzc2FnZX19XCI+e3tyb3cuZW50aXR5LnNob3J0X21lc3NhZ2V9fTwvZGl2PicsXG4gICAgICAgICAgd2lkdGg6IFwiKioqKlwiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmNhblJldmVydCA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICByZXR1cm4gc2VsZWN0ZWRJdGVtcy5sZW5ndGggPT09IDEgJiYgc2VsZWN0ZWRJdGVtc1swXSAhPT0gJHNjb3BlLmxvZ3NbMF07XG4gICAgfTtcblxuICAgICRzY29wZS5yZXZlcnQgPSAoKSA9PiB7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgb2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzBdLnNoYTtcbiAgICAgICAgaWYgKG9iamVjdElkKSB7XG4gICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBmaWxlIFwiICsgJHNjb3BlLnBhZ2VJZCArIFwiIHRvIHByZXZpb3VzIHZlcnNpb24gXCIgKyBvYmplY3RJZDtcbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5yZXZlcnRUbygkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgY29tbWl0TWVzc2FnZSwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHJlc3VsdCk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB1cGRhdGUgdGhlIHZpZXdcbiAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdzdWNjZXNzJywgXCJTdWNjZXNzZnVsbHkgcmV2ZXJ0ZWQgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBzZWxlY3RlZEl0ZW1zLnNwbGljZSgwLCBzZWxlY3RlZEl0ZW1zLmxlbmd0aCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5kaWZmID0gKCkgPT4ge1xuICAgICAgdmFyIGRlZmF1bHRWYWx1ZSA9IFwiIFwiO1xuICAgICAgdmFyIG9iamVjdElkID0gZGVmYXVsdFZhbHVlO1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgb2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzBdLnNoYSB8fCBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG4gICAgICB2YXIgYmFzZU9iamVjdElkID0gZGVmYXVsdFZhbHVlO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMSkge1xuICAgICAgICBiYXNlT2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzFdLnNoYSB8fGRlZmF1bHRWYWx1ZTtcbiAgICAgICAgLy8gbWFrZSB0aGUgb2JqZWN0SWQgKHRoZSBvbmUgdGhhdCB3aWxsIHN0YXJ0IHdpdGggYi8gcGF0aCkgYWx3YXlzIG5ld2VyIHRoYW4gYmFzZU9iamVjdElkXG4gICAgICAgIGlmIChzZWxlY3RlZEl0ZW1zWzBdLmRhdGUgPCBzZWxlY3RlZEl0ZW1zWzFdLmRhdGUpIHtcbiAgICAgICAgICB2YXIgXyA9IGJhc2VPYmplY3RJZDtcbiAgICAgICAgICBiYXNlT2JqZWN0SWQgPSBvYmplY3RJZDtcbiAgICAgICAgICBvYmplY3RJZCA9IF87XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBsaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9kaWZmL1wiICsgb2JqZWN0SWQgKyBcIi9cIiArIGJhc2VPYmplY3RJZCArIFwiL1wiICsgJHNjb3BlLnBhZ2VJZDtcbiAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIiNcIik7XG4gICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICB9O1xuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIHZhciBvYmplY3RJZCA9IFwiXCI7XG4gICAgICB2YXIgbGltaXQgPSAwO1xuXG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuaGlzdG9yeSgkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgbGltaXQsIChsb2dBcnJheSkgPT4ge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2gobG9nQXJyYXksIChsb2cpID0+IHtcbiAgICAgICAgICAvLyBsZXRzIHVzZSB0aGUgc2hvcnRlciBoYXNoIGZvciBsaW5rcyBieSBkZWZhdWx0XG4gICAgICAgICAgdmFyIGNvbW1pdElkID0gbG9nLnNoYTtcbiAgICAgICAgICBsb2cuJGRhdGUgPSBEZXZlbG9wZXIuYXNEYXRlKGxvZy5kYXRlKTtcbiAgICAgICAgICBsb2cuY29tbWl0TGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvY29tbWl0RGV0YWlsL1wiICsgJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgY29tbWl0SWQ7XG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUubG9ncyA9IF8uc29ydEJ5KGxvZ0FycmF5LCBcIiRkYXRlXCIpLnJldmVyc2UoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuICAgICAgV2lraS5sb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMpO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5kaXJlY3RpdmUoXCJjb21taXRIaXN0b3J5UGFuZWxcIiwgKCkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVQYXRoICsgJ2hpc3RvcnlQYW5lbC5odG1sJ1xuICAgIH07XG4gIH0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5OYXZCYXJDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIndpa2lCcmFuY2hNZW51XCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCB3aWtpQnJhbmNoTWVudTpCcmFuY2hNZW51KSA9PiB7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnID0gPFVJLk1lbnVJdGVtPntcbiAgICAgIHRpdGxlOiAkc2NvcGUuYnJhbmNoLFxuICAgICAgaXRlbXM6IFtdXG4gICAgfTtcblxuICAgICRzY29wZS5WaWV3TW9kZSA9IFdpa2kuVmlld01vZGU7XG4gICAgJHNjb3BlLnNldFZpZXdNb2RlID0gKG1vZGU6V2lraS5WaWV3TW9kZSkgPT4ge1xuICAgICAgJHNjb3BlLiRlbWl0KCdXaWtpLlNldFZpZXdNb2RlJywgbW9kZSk7XG4gICAgfTtcblxuICAgIHdpa2lCcmFuY2hNZW51LmFwcGx5TWVudUV4dGVuc2lvbnMoJHNjb3BlLmJyYW5jaE1lbnVDb25maWcuaXRlbXMpO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnYnJhbmNoZXMnLCAobmV3VmFsdWUsIG9sZFZhbHVlKSA9PiB7XG4gICAgICBpZiAobmV3VmFsdWUgPT09IG9sZFZhbHVlIHx8ICFuZXdWYWx1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcyA9IFtdO1xuICAgICAgaWYgKG5ld1ZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgJHNjb3BlLmJyYW5jaE1lbnVDb25maWcuaXRlbXMucHVzaCh7XG4gICAgICAgICAgaGVhZGluZzogaXNGbWMgPyBcIlZlcnNpb25zXCIgOiBcIkJyYW5jaGVzXCJcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBuZXdWYWx1ZS5zb3J0KCkuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICB2YXIgbWVudUl0ZW0gPSB7XG4gICAgICAgICAgdGl0bGU6IGl0ZW0sXG4gICAgICAgICAgaWNvbjogJycsXG4gICAgICAgICAgYWN0aW9uOiAoKSA9PiB7fVxuICAgICAgICB9O1xuICAgICAgICBpZiAoaXRlbSA9PT0gJHNjb3BlLmJyYW5jaCkge1xuICAgICAgICAgIG1lbnVJdGVtLmljb24gPSBcImZhIGZhLW9rXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWVudUl0ZW0uYWN0aW9uID0gKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHRhcmdldFVybCA9IGJyYW5jaExpbmsoaXRlbSwgPHN0cmluZz4kc2NvcGUucGFnZUlkLCAkbG9jYXRpb24pO1xuICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoQ29yZS50b1BhdGgodGFyZ2V0VXJsKSk7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcy5wdXNoKG1lbnVJdGVtKTtcbiAgICAgIH0pO1xuICAgICAgd2lraUJyYW5jaE1lbnUuYXBwbHlNZW51RXh0ZW5zaW9ucygkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcyk7XG4gICAgfSwgdHJ1ZSk7XG5cbiAgICAkc2NvcGUuY3JlYXRlTGluayA9ICgpID0+IHtcbiAgICAgIHZhciBwYWdlSWQgPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgICByZXR1cm4gV2lraS5jcmVhdGVMaW5rKCRzY29wZSwgcGFnZUlkLCAkbG9jYXRpb24pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc3RhcnRMaW5rID0gc3RhcnRMaW5rKCRzY29wZSk7XG5cbiAgICAkc2NvcGUuc291cmNlTGluayA9ICgpID0+IHtcbiAgICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICAgIHZhciBhbnN3ZXIgPSA8c3RyaW5nPm51bGw7XG4gICAgICBhbmd1bGFyLmZvckVhY2goV2lraS5jdXN0b21WaWV3TGlua3MoJHNjb3BlKSwgKGxpbmspID0+IHtcbiAgICAgICAgaWYgKHBhdGguc3RhcnRzV2l0aChsaW5rKSkge1xuICAgICAgICAgIGFuc3dlciA9IDxzdHJpbmc+Q29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgV2lraS5zdGFydExpbmsoJHNjb3BlKSArIFwiL3ZpZXdcIiArIHBhdGguc3Vic3RyaW5nKGxpbmsubGVuZ3RoKSlcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvLyByZW1vdmUgdGhlIGZvcm0gcGFyYW1ldGVyIG9uIHZpZXcvZWRpdCBsaW5rc1xuICAgICAgcmV0dXJuICghYW5zd2VyICYmICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl0pXG4gICAgICAgICAgICAgID8gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgXCIjXCIgKyBwYXRoLCBbXCJmb3JtXCJdKVxuICAgICAgICAgICAgICA6IGFuc3dlcjtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmlzQWN0aXZlID0gKGhyZWYpID0+IHtcbiAgICAgIGlmICghaHJlZikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gaHJlZi5lbmRzV2l0aCgkcm91dGVQYXJhbXNbJ3BhZ2UnXSk7XG4gICAgfTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KGxvYWRCcmVhZGNydW1icywgNTApO1xuICAgIH0pO1xuXG4gICAgbG9hZEJyZWFkY3J1bWJzKCk7XG5cbiAgICBmdW5jdGlvbiBzd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluayhicmVhZGNydW1iLCBsaW5rKSB7XG4gICAgICB2YXIgaHJlZiA9IGJyZWFkY3J1bWIuaHJlZjtcbiAgICAgIGlmIChocmVmKSB7XG4gICAgICAgIGJyZWFkY3J1bWIuaHJlZiA9IGhyZWYucmVwbGFjZShcIndpa2kvdmlld1wiLCBsaW5rKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsb2FkQnJlYWRjcnVtYnMoKSB7XG4gICAgICB2YXIgc3RhcnQgPSBXaWtpLnN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgdmFyIGhyZWYgPSBzdGFydCArIFwiL3ZpZXdcIjtcbiAgICAgICRzY29wZS5icmVhZGNydW1icyA9IFtcbiAgICAgICAge2hyZWY6IGhyZWYsIG5hbWU6IFwicm9vdFwifVxuICAgICAgXTtcbiAgICAgIHZhciBwYXRoID0gV2lraS5wYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgICAgdmFyIGFycmF5ID0gcGF0aCA/IHBhdGguc3BsaXQoXCIvXCIpIDogW107XG4gICAgICBhbmd1bGFyLmZvckVhY2goYXJyYXksIChuYW1lKSA9PiB7XG4gICAgICAgIGlmICghbmFtZS5zdGFydHNXaXRoKFwiL1wiKSAmJiAhaHJlZi5lbmRzV2l0aChcIi9cIikpIHtcbiAgICAgICAgICBocmVmICs9IFwiL1wiO1xuICAgICAgICB9XG4gICAgICAgIGhyZWYgKz0gV2lraS5lbmNvZGVQYXRoKG5hbWUpO1xuICAgICAgICBpZiAoIW5hbWUuaXNCbGFuaygpKSB7XG4gICAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IGhyZWYsIG5hbWU6IG5hbWV9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvLyBsZXRzIHN3aXp6bGUgdGhlIGxhc3Qgb25lIG9yIHR3byB0byBiZSBmb3JtVGFibGUgdmlld3MgaWYgdGhlIGxhc3Qgb3IgMm5kIHRvIGxhc3RcbiAgICAgIHZhciBsb2MgPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgaWYgKCRzY29wZS5icmVhZGNydW1icy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGxhc3QgPSAkc2NvcGUuYnJlYWRjcnVtYnNbJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCAtIDFdO1xuICAgICAgICAvLyBwb3NzaWJseSB0cmltIGFueSByZXF1aXJlZCBmaWxlIGV4dGVuc2lvbnNcbiAgICAgICAgbGFzdC5uYW1lID0gV2lraS5oaWRlRmlsZU5hbWVFeHRlbnNpb25zKGxhc3QubmFtZSk7XG5cbiAgICAgICAgdmFyIHN3aXp6bGVkID0gZmFsc2U7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChXaWtpLmN1c3RvbVZpZXdMaW5rcygkc2NvcGUpLCAobGluaykgPT4ge1xuICAgICAgICAgIGlmICghc3dpenpsZWQgJiYgbG9jLnN0YXJ0c1dpdGgobGluaykpIHtcbiAgICAgICAgICAgIC8vIGxldHMgc3dpenpsZSB0aGUgdmlldyB0byB0aGUgY3VycmVudCBsaW5rXG4gICAgICAgICAgICBzd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluaygkc2NvcGUuYnJlYWRjcnVtYnMubGFzdCgpLCBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiL1wiKSk7XG4gICAgICAgICAgICBzd2l6emxlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFzd2l6emxlZCAmJiAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdKSB7XG4gICAgICAgICAgdmFyIGxhc3ROYW1lID0gJHNjb3BlLmJyZWFkY3J1bWJzLmxhc3QoKS5uYW1lO1xuICAgICAgICAgIGlmIChsYXN0TmFtZSAmJiBsYXN0TmFtZS5lbmRzV2l0aChcIi5qc29uXCIpKSB7XG4gICAgICAgICAgICAvLyBwcmV2aW91cyBicmVhZGNydW1iIHNob3VsZCBiZSBhIGZvcm1UYWJsZVxuICAgICAgICAgICAgc3dpdGNoRnJvbVZpZXdUb0N1c3RvbUxpbmsoJHNjb3BlLmJyZWFkY3J1bWJzWyRzY29wZS5icmVhZGNydW1icy5sZW5ndGggLSAyXSwgXCJ3aWtpL2Zvcm1UYWJsZVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8qXG4gICAgICBpZiAobG9jLnN0YXJ0c1dpdGgoXCIvd2lraS9oaXN0b3J5XCIpIHx8IGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvdmVyc2lvblwiKVxuICAgICAgICB8fCBsb2Muc3RhcnRzV2l0aChcIi93aWtpL2RpZmZcIikgfHwgbG9jLnN0YXJ0c1dpdGgoXCIvd2lraS9jb21taXRcIikpIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgYSBoaXN0b3J5IHRhYlxuICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogXCIjL3dpa2kvaGlzdG9yeS9cIiArIHBhdGgsIG5hbWU6IFwiSGlzdG9yeVwifSk7XG4gICAgICB9IGVsc2UgaWYgKCRzY29wZS5icmFuY2gpIHtcbiAgICAgICAgdmFyIHByZWZpeCA9XCIvd2lraS9icmFuY2gvXCIgKyAkc2NvcGUuYnJhbmNoO1xuICAgICAgICBpZiAobG9jLnN0YXJ0c1dpdGgocHJlZml4ICsgXCIvaGlzdG9yeVwiKSB8fCBsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi92ZXJzaW9uXCIpXG4gICAgICAgICAgfHwgbG9jLnN0YXJ0c1dpdGgocHJlZml4ICsgXCIvZGlmZlwiKSB8fCBsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi9jb21taXRcIikpIHtcbiAgICAgICAgICAvLyBsZXRzIGFkZCBhIGhpc3RvcnkgdGFiXG4gICAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IFwiIy93aWtpL2JyYW5jaC9cIiArICRzY29wZS5icmFuY2ggKyBcIi9oaXN0b3J5L1wiICsgcGF0aCwgbmFtZTogXCJIaXN0b3J5XCJ9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgKi9cbiAgICAgIHZhciBuYW1lOnN0cmluZyA9IG51bGw7XG4gICAgICBpZiAobG9jLnN0YXJ0c1dpdGgoXCIvd2lraS92ZXJzaW9uXCIpKSB7XG4gICAgICAgIC8vIGxldHMgYWRkIGEgdmVyc2lvbiB0YWJcbiAgICAgICAgbmFtZSA9ICgkcm91dGVQYXJhbXNbXCJvYmplY3RJZFwiXSB8fCBcIlwiKS5zdWJzdHJpbmcoMCwgNikgfHwgXCJWZXJzaW9uXCI7XG4gICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiNcIiArIGxvYywgbmFtZTogbmFtZX0pO1xuICAgICAgfVxuICAgICAgaWYgKGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvZGlmZlwiKSkge1xuICAgICAgICAvLyBsZXRzIGFkZCBhIHZlcnNpb24gdGFiXG4gICAgICAgIHZhciB2MSA9ICgkcm91dGVQYXJhbXNbXCJvYmplY3RJZFwiXSB8fCBcIlwiKS5zdWJzdHJpbmcoMCwgNik7XG4gICAgICAgIHZhciB2MiA9ICgkcm91dGVQYXJhbXNbXCJiYXNlT2JqZWN0SWRcIl0gfHwgXCJcIikuc3Vic3RyaW5nKDAsIDYpO1xuICAgICAgICBuYW1lID0gXCJEaWZmXCI7XG4gICAgICAgIGlmICh2MSkge1xuICAgICAgICAgIGlmICh2Mikge1xuICAgICAgICAgICAgbmFtZSArPSBcIiBcIiArIHYxICsgXCIgXCIgKyB2MjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmFtZSArPSBcIiBcIiArIHYxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogXCIjXCIgKyBsb2MsIG5hbWU6IG5hbWV9KTtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cbm1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKCdXaWtpLk92ZXJ2aWV3RGFzaGJvYXJkJywgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpID0+IHtcbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAkc2NvcGUuZGFzaGJvYXJkRW1iZWRkZWQgPSB0cnVlO1xuICAgICRzY29wZS5kYXNoYm9hcmRJZCA9ICcwJztcbiAgICAkc2NvcGUuZGFzaGJvYXJkSW5kZXggPSAnMCc7XG4gICAgJHNjb3BlLmRhc2hib2FyZFJlcG9zaXRvcnkgPSB7XG4gICAgICBnZXRUeXBlOiAoKSA9PiAnR2l0V2lraVJlcG9zaXRvcnknLFxuICAgICAgcHV0RGFzaGJvYXJkczogKGFycmF5OmFueVtdLCBjb21taXRNZXNzYWdlOnN0cmluZywgY2IpID0+IHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9LFxuICAgICAgZGVsZXRlRGFzaGJvYXJkczogKGFycmF5OkFycmF5PERhc2hib2FyZC5EYXNoYm9hcmQ+LCBmbikgPT4ge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0sXG4gICAgICBnZXREYXNoYm9hcmRzOiAoZm46KGRhc2hib2FyZHM6IEFycmF5PERhc2hib2FyZC5EYXNoYm9hcmQ+KSA9PiB2b2lkKSA9PiB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcImdldERhc2hib2FyZHMgY2FsbGVkXCIpO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBmbihbe1xuICAgICAgICAgICAgZ3JvdXA6ICdUZXN0JyxcbiAgICAgICAgICAgIGlkOiAnMCcsXG4gICAgICAgICAgICB0aXRsZTogJ1Rlc3QnLFxuICAgICAgICAgICAgd2lkZ2V0czogW3tcbiAgICAgICAgICAgICAgY29sOiAxLFxuICAgICAgICAgICAgICBpZDogJ3cxJyxcbiAgICAgICAgICAgICAgaW5jbHVkZTogJ3BsdWdpbnMvd2lraS9odG1sL3Byb2plY3RzQ29tbWl0UGFuZWwuaHRtbCcsXG4gICAgICAgICAgICAgIHBhdGg6ICRsb2NhdGlvbi5wYXRoKCksXG4gICAgICAgICAgICAgIHJvdzogMSxcbiAgICAgICAgICAgICAgc2VhcmNoOiAkbG9jYXRpb24uc2VhcmNoKCksXG4gICAgICAgICAgICAgIHNpemVfeDogMyxcbiAgICAgICAgICAgICAgc2l6ZV95OiAyLFxuICAgICAgICAgICAgICB0aXRsZTogJ0NvbW1pdHMnXG4gICAgICAgICAgICB9XVxuICAgICAgICAgIH1dKTtcbiAgICAgICAgfSwgMTAwMCk7XG5cbiAgICAgIH0sXG4gICAgICBnZXREYXNoYm9hcmQ6IChpZDpzdHJpbmcsIGZuOiAoZGFzaGJvYXJkOiBEYXNoYm9hcmQuRGFzaGJvYXJkKSA9PiB2b2lkKSA9PiB7XG4gICAgICAgICRzY29wZS4kd2F0Y2goJ21vZGVsLmZldGNoZWQnLCAoZmV0Y2hlZCkgPT4ge1xuICAgICAgICAgIGlmICghZmV0Y2hlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdzZWxlY3RlZEJ1aWxkJywgKGJ1aWxkKSA9PiB7XG4gICAgICAgICAgICBpZiAoIWJ1aWxkKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2VudGl0eScsIChlbnRpdHkpID0+IHtcbiAgICAgICAgICAgICAgaWYgKCFlbnRpdHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFyIG1vZGVsID0gJHNjb3BlLiRldmFsKCdtb2RlbCcpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkJ1aWxkOiBcIiwgYnVpbGQpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk1vZGVsOiBcIiwgbW9kZWwpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVudGl0eTogXCIsIGVudGl0eSk7XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZhciBzZWFyY2ggPSA8RGFzaGJvYXJkLlNlYXJjaE1hcD4ge1xuICAgICAgICAgICAgICAgIHByb2plY3RJZDogJHNjb3BlLnByb2plY3RJZCxcbiAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICRzY29wZS5uYW1lc3BhY2UsXG4gICAgICAgICAgICAgICAgb3duZXI6ICRzY29wZS5vd25lcixcbiAgICAgICAgICAgICAgICBicmFuY2g6ICRzY29wZS5icmFuY2gsXG4gICAgICAgICAgICAgICAgam9iOiBidWlsZC4kam9iSWQsXG4gICAgICAgICAgICAgICAgaWQ6ICRzY29wZS5wcm9qZWN0SWQsXG4gICAgICAgICAgICAgICAgYnVpbGQ6IGJ1aWxkLmlkXG5cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciBkYXNoYm9hcmQgPSB7XG4gICAgICAgICAgICAgICAgICBncm91cDogJ1Rlc3QnLFxuICAgICAgICAgICAgICAgICAgaWQ6ICcwJyxcbiAgICAgICAgICAgICAgICAgIHRpdGxlOiAnVGVzdCcsXG4gICAgICAgICAgICAgICAgICB3aWRnZXRzOiBbXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGNvbDogMSxcbiAgICAgICAgICAgICAgICAgICAgcm93OiAzLFxuICAgICAgICAgICAgICAgICAgICBpZDogJ3czJyxcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVkZTogJ3BsdWdpbnMva3ViZXJuZXRlcy9odG1sL3BlbmRpbmdQaXBlbGluZXMuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6ICRsb2NhdGlvbi5wYXRoKCksXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaDogc2VhcmNoLFxuICAgICAgICAgICAgICAgICAgICBzaXplX3g6IDksXG4gICAgICAgICAgICAgICAgICAgIHNpemVfeTogMSxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdQaXBlbGluZXMnXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb2w6IDEsXG4gICAgICAgICAgICAgICAgICAgIHJvdzogNCxcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICd3MicsXG4gICAgICAgICAgICAgICAgICAgIGluY2x1ZGU6ICdwbHVnaW5zL2RldmVsb3Blci9odG1sL2xvZ1BhbmVsLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiAkbG9jYXRpb24ucGF0aCgpLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHNlYXJjaCxcbiAgICAgICAgICAgICAgICAgICAgc2l6ZV94OiA0LFxuICAgICAgICAgICAgICAgICAgICBzaXplX3k6IDIsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnTG9ncyBmb3Igam9iOiAnICsgYnVpbGQuJGpvYklkICsgJyBidWlsZDogJyArIGJ1aWxkLmlkXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb2w6IDUsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAndzQnLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlOiAncGx1Z2lucy93aWtpL2h0bWwvcHJvamVjdENvbW1pdHNQYW5lbC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogJGxvY2F0aW9uLnBhdGgoKSxcbiAgICAgICAgICAgICAgICAgICAgcm93OiA0LFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHNlYXJjaCxcbiAgICAgICAgICAgICAgICAgICAgc2l6ZV94OiA1LFxuICAgICAgICAgICAgICAgICAgICBzaXplX3k6IDIsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQ29tbWl0cydcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmIChlbnRpdHkuZW52aXJvbm1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgdmFyIGNvbFBvc2l0aW9uID0gMTtcbiAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChlbnRpdHkuZW52aXJvbm1lbnRzLCAoZW52OmFueSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHMgPSA8RGFzaGJvYXJkLlNlYXJjaE1hcD4gXy5leHRlbmQoe1xuICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBlbnYubGFiZWxcbiAgICAgICAgICAgICAgICAgICAgfSwgc2VhcmNoKTtcbiAgICAgICAgICAgICAgICAgICAgZGFzaGJvYXJkLndpZGdldHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgaWQ6IGVudi51cmwsXG4gICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdFbnZpcm9ubWVudDogJyArIGVudi5sYWJlbCxcbiAgICAgICAgICAgICAgICAgICAgICBzaXplX3g6IDMsXG4gICAgICAgICAgICAgICAgICAgICAgc2l6ZV95OiAyLFxuICAgICAgICAgICAgICAgICAgICAgIGNvbDogY29sUG9zaXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgcm93OiAxLFxuICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGU6ICdwbHVnaW5zL2RldmVsb3Blci9odG1sL2Vudmlyb25tZW50UGFuZWwuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgcGF0aDogJGxvY2F0aW9uLnBhdGgoKSxcbiAgICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHNcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbFBvc2l0aW9uID0gY29sUG9zaXRpb24gKyAzO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZm4oZGFzaGJvYXJkKTtcbiAgICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgY3JlYXRlRGFzaGJvYXJkOiAob3B0aW9uczphbnkpID0+IHtcblxuICAgICAgfVxuICAgIH07XG5cblxuICB9KTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLy8gbWFpbiBwYWdlIGNvbnRyb2xsZXJcbiAgZXhwb3J0IHZhciBWaWV3Q29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuVmlld0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHJvdXRlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgIFwiJGNvbXBpbGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcImxvY2FsU3RvcmFnZVwiLCBcIiRpbnRlcnBvbGF0ZVwiLCBcIiRkaWFsb2dcIiwgKCRzY29wZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtczpuZy5yb3V0ZS5JUm91dGVQYXJhbXNTZXJ2aWNlLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJGh0dHA6bmcuSUh0dHBTZXJ2aWNlLCAkdGltZW91dDpuZy5JVGltZW91dFNlcnZpY2UsIG1hcmtlZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSwgICRjb21waWxlOm5nLklDb21waWxlU2VydmljZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRpbnRlcnBvbGF0ZTpuZy5JSW50ZXJwb2xhdGVTZXJ2aWNlLCAkZGlhbG9nKSA9PiB7XG5cbiAgICAkc2NvcGUubmFtZSA9IFwiV2lraVZpZXdDb250cm9sbGVyXCI7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgIFNlbGVjdGlvbkhlbHBlcnMuZGVjb3JhdGUoJHNjb3BlKTtcblxuICAgICRzY29wZS5mYWJyaWNUb3BMZXZlbCA9IFwiZmFicmljL3Byb2ZpbGVzL1wiO1xuXG4gICAgJHNjb3BlLnZlcnNpb25JZCA9ICRzY29wZS5icmFuY2g7XG5cbiAgICAkc2NvcGUucGFuZVRlbXBsYXRlID0gJyc7XG5cbiAgICAkc2NvcGUucHJvZmlsZUlkID0gXCJcIjtcbiAgICAkc2NvcGUuc2hvd1Byb2ZpbGVIZWFkZXIgPSBmYWxzZTtcbiAgICAkc2NvcGUuc2hvd0FwcEhlYWRlciA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLm9wZXJhdGlvbkNvdW50ZXIgPSAxO1xuICAgICRzY29wZS5yZW5hbWVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUubW92ZURpYWxvZyA9IDxXaWtpRGlhbG9nPiBudWxsO1xuICAgICRzY29wZS5kZWxldGVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUuaXNGaWxlID0gZmFsc2U7XG5cbiAgICAkc2NvcGUucmVuYW1lID0ge1xuICAgICAgbmV3RmlsZU5hbWU6IFwiXCJcbiAgICB9O1xuICAgICRzY29wZS5tb3ZlID0ge1xuICAgICAgbW92ZUZvbGRlcjogXCJcIlxuICAgIH07XG4gICAgJHNjb3BlLlZpZXdNb2RlID0gV2lraS5WaWV3TW9kZTtcblxuICAgIC8vIGJpbmQgZmlsdGVyIG1vZGVsIHZhbHVlcyB0byBzZWFyY2ggcGFyYW1zLi4uXG4gICAgQ29yZS5iaW5kTW9kZWxUb1NlYXJjaFBhcmFtKCRzY29wZSwgJGxvY2F0aW9uLCBcInNlYXJjaFRleHRcIiwgXCJxXCIsIFwiXCIpO1xuXG4gICAgU3RvcmFnZUhlbHBlcnMuYmluZE1vZGVsVG9Mb2NhbFN0b3JhZ2Uoe1xuICAgICAgJHNjb3BlOiAkc2NvcGUsXG4gICAgICAkbG9jYXRpb246ICRsb2NhdGlvbixcbiAgICAgIGxvY2FsU3RvcmFnZTogbG9jYWxTdG9yYWdlLFxuICAgICAgbW9kZWxOYW1lOiAnbW9kZScsXG4gICAgICBwYXJhbU5hbWU6ICd3aWtpVmlld01vZGUnLFxuICAgICAgaW5pdGlhbFZhbHVlOiBXaWtpLlZpZXdNb2RlLkljb24sXG4gICAgICB0bzogQ29yZS5udW1iZXJUb1N0cmluZyxcbiAgICAgIGZyb206IENvcmUucGFyc2VJbnRWYWx1ZVxuICAgIH0pO1xuXG4gICAgLy8gb25seSByZWxvYWQgdGhlIHBhZ2UgaWYgY2VydGFpbiBzZWFyY2ggcGFyYW1ldGVycyBjaGFuZ2VcbiAgICBDb3JlLnJlbG9hZFdoZW5QYXJhbWV0ZXJzQ2hhbmdlKCRyb3V0ZSwgJHNjb3BlLCAkbG9jYXRpb24sIFsnd2lraVZpZXdNb2RlJ10pO1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgZGF0YTogJ2NoaWxkcmVuJyxcbiAgICAgIGRpc3BsYXlGb290ZXI6IGZhbHNlLFxuICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBlbmFibGVTb3J0aW5nOiBmYWxzZSxcbiAgICAgIHVzZUV4dGVybmFsU29ydGluZzogdHJ1ZSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdOYW1lJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldCgnZmlsZUNlbGxUZW1wbGF0ZS5odG1sJyksXG4gICAgICAgICAgaGVhZGVyQ2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ2ZpbGVDb2x1bW5UZW1wbGF0ZS5odG1sJylcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKCdXaWtpLlNldFZpZXdNb2RlJywgKCRldmVudCwgbW9kZTpXaWtpLlZpZXdNb2RlKSA9PiB7XG4gICAgICAkc2NvcGUubW9kZSA9IG1vZGU7XG4gICAgICBzd2l0Y2gobW9kZSkge1xuICAgICAgICBjYXNlIFZpZXdNb2RlLkxpc3Q6XG4gICAgICAgICAgbG9nLmRlYnVnKFwiTGlzdCB2aWV3IG1vZGVcIik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgVmlld01vZGUuSWNvbjpcbiAgICAgICAgICBsb2cuZGVidWcoXCJJY29uIHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAkc2NvcGUubW9kZSA9IFZpZXdNb2RlLkxpc3Q7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiRGVmYXVsdGluZyB0byBsaXN0IHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgJHNjb3BlLmNoaWxkQWN0aW9ucyA9IFtdO1xuXG4gICAgdmFyIG1heWJlVXBkYXRlVmlldyA9IENvcmUudGhyb3R0bGVkKHVwZGF0ZVZpZXcsIDEwMDApO1xuXG4gICAgJHNjb3BlLm1hcmtlZCA9ICh0ZXh0KSA9PiB7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICByZXR1cm4gbWFya2VkKHRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuICAgIH07XG5cblxuICAgICRzY29wZS4kb24oJ3dpa2lCcmFuY2hlc1VwZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1cGRhdGVWaWV3KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuY3JlYXRlRGFzaGJvYXJkTGluayA9ICgpID0+IHtcbiAgICAgIHZhciBocmVmID0gJy93aWtpL2JyYW5jaC86YnJhbmNoL3ZpZXcvKnBhZ2UnO1xuICAgICAgdmFyIHBhZ2UgPSAkcm91dGVQYXJhbXNbJ3BhZ2UnXTtcbiAgICAgIHZhciB0aXRsZSA9IHBhZ2UgPyBwYWdlLnNwbGl0KFwiL1wiKS5sYXN0KCkgOiBudWxsO1xuICAgICAgdmFyIHNpemUgPSBhbmd1bGFyLnRvSnNvbih7XG4gICAgICAgIHNpemVfeDogMixcbiAgICAgICAgc2l6ZV95OiAyXG4gICAgICB9KTtcbiAgICAgIHZhciBhbnN3ZXIgPSBcIiMvZGFzaGJvYXJkL2FkZD90YWI9ZGFzaGJvYXJkXCIgK1xuICAgICAgICBcIiZocmVmPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGhyZWYpICtcbiAgICAgICAgXCImc2l6ZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChzaXplKSArXG4gICAgICAgIFwiJnJvdXRlUGFyYW1zPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGFuZ3VsYXIudG9Kc29uKCRyb3V0ZVBhcmFtcykpO1xuICAgICAgaWYgKHRpdGxlKSB7XG4gICAgICAgIGFuc3dlciArPSBcIiZ0aXRsZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh0aXRsZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYW5zd2VyO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZGlzcGxheUNsYXNzID0gKCkgPT4ge1xuICAgICAgaWYgKCEkc2NvcGUuY2hpbGRyZW4gfHwgJHNjb3BlLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcInNwYW45XCI7XG4gICAgfTtcblxuICAgICRzY29wZS5wYXJlbnRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgcHJlZml4ID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhZ2VJZDogXCIsICRzY29wZS5wYWdlSWQpXG4gICAgICB2YXIgcGFydHMgPSAkc2NvcGUucGFnZUlkLnNwbGl0KFwiL1wiKTtcbiAgICAgIC8vbG9nLmRlYnVnKFwicGFydHM6IFwiLCBwYXJ0cyk7XG4gICAgICB2YXIgcGF0aCA9IFwiL1wiICsgcGFydHMuZmlyc3QocGFydHMubGVuZ3RoIC0gMSkuam9pbihcIi9cIik7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhdGg6IFwiLCBwYXRoKTtcbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBwcmVmaXggKyBwYXRoLCBbXSk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmNoaWxkTGluayA9IChjaGlsZCkgPT4ge1xuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgcHJlZml4ID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICB2YXIgcG9zdEZpeCA9IFwiXCI7XG4gICAgICB2YXIgcGF0aCA9IFdpa2kuZW5jb2RlUGF0aChjaGlsZC5wYXRoKTtcbiAgICAgIGlmIChjaGlsZC5kaXJlY3RvcnkpIHtcbiAgICAgICAgLy8gaWYgd2UgYXJlIGEgZm9sZGVyIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBhIGZvcm0gZmlsZSwgbGV0cyBhZGQgYSBmb3JtIHBhcmFtLi4uXG4gICAgICAgIHZhciBmb3JtUGF0aCA9IHBhdGggKyBcIi5mb3JtXCI7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9ICRzY29wZS5jaGlsZHJlbjtcbiAgICAgICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgICAgdmFyIGZvcm1GaWxlID0gY2hpbGRyZW4uZmluZCgoY2hpbGQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZFsncGF0aCddID09PSBmb3JtUGF0aDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAoZm9ybUZpbGUpIHtcbiAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvZm9ybVRhYmxlXCI7XG4gICAgICAgICAgICBwb3N0Rml4ID0gXCI/Zm9ybT1cIiArIGZvcm1QYXRoO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHhtbE5hbWVzcGFjZXMgPSBjaGlsZC54bWxfbmFtZXNwYWNlcyB8fCBjaGlsZC54bWxOYW1lc3BhY2VzO1xuICAgICAgICBpZiAoeG1sTmFtZXNwYWNlcyAmJiB4bWxOYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICAgIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuY2FtZWxOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgICAgICBpZiAodXNlQ2FtZWxDYW52YXNCeURlZmF1bHQpIHtcbiAgICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9jYW1lbC9jYW52YXNcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvY2FtZWwvcHJvcGVydGllc1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmRvemVyTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9kb3plci9tYXBwaW5nc1wiO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJjaGlsZCBcIiArIHBhdGggKyBcIiBoYXMgbmFtZXNwYWNlcyBcIiArIHhtbE5hbWVzcGFjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGQucGF0aC5lbmRzV2l0aChcIi5mb3JtXCIpKSB7XG4gICAgICAgICAgcG9zdEZpeCA9IFwiP2Zvcm09L1wiO1xuICAgICAgICB9IGVsc2UgaWYgKFdpa2kuaXNJbmRleFBhZ2UoY2hpbGQucGF0aCkpIHtcbiAgICAgICAgICAvLyBsZXRzIGRlZmF1bHQgdG8gYm9vayB2aWV3IG9uIGluZGV4IHBhZ2VzXG4gICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9ib29rXCI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBVcmxIZWxwZXJzLmpvaW4ocHJlZml4LCBwYXRoKSArIHBvc3RGaXgsIFtcImZvcm1cIl0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZU5hbWUgPSAoZW50aXR5KSA9PiB7XG4gICAgICByZXR1cm4gV2lraS5oaWRlRmlsZU5hbWVFeHRlbnNpb25zKGVudGl0eS5kaXNwbGF5TmFtZSB8fCBlbnRpdHkubmFtZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlQ2xhc3MgPSAoZW50aXR5KSA9PiB7XG4gICAgICBpZiAoZW50aXR5Lm5hbWUuaGFzKFwiLnByb2ZpbGVcIikpIHtcbiAgICAgICAgcmV0dXJuIFwiZ3JlZW5cIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZUljb25IdG1sID0gKGVudGl0eSkgPT4ge1xuICAgICAgcmV0dXJuIFdpa2kuZmlsZUljb25IdG1sKGVudGl0eSk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdCgkc2NvcGUucGFnZUlkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KTtcbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgbW9kZToge1xuICAgICAgICBuYW1lOiAkc2NvcGUuZm9ybWF0XG4gICAgICB9XG4gICAgfTtcbiAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMgPSBDb2RlRWRpdG9yLmNyZWF0ZUVkaXRvclNldHRpbmdzKG9wdGlvbnMpO1xuXG4gICAgJHNjb3BlLmVkaXRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhZ2VOYW1lID0gKCRzY29wZS5kaXJlY3RvcnkpID8gJHNjb3BlLnJlYWRNZVBhdGggOiAkc2NvcGUucGFnZUlkO1xuICAgICAgcmV0dXJuIChwYWdlTmFtZSkgPyBXaWtpLmVkaXRMaW5rKCRzY29wZSwgcGFnZU5hbWUsICRsb2NhdGlvbikgOiBudWxsO1xuICAgIH07XG5cbiAgICAkc2NvcGUuYnJhbmNoTGluayA9IChicmFuY2gpID0+IHtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcmV0dXJuIFdpa2kuYnJhbmNoTGluayhicmFuY2gsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH07XG5cbiAgICAkc2NvcGUuaGlzdG9yeUxpbmsgPSBcIiMvd2lraVwiICsgKCRzY29wZS5icmFuY2ggPyBcIi9icmFuY2gvXCIgKyAkc2NvcGUuYnJhbmNoIDogXCJcIikgKyBcIi9oaXN0b3J5L1wiICsgJHNjb3BlLnBhZ2VJZDtcblxuICAgICRzY29wZS4kd2F0Y2goJ3dvcmtzcGFjZS50cmVlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEkc2NvcGUuZ2l0KSB7XG4gICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAgIC8vbG9nLmluZm8oXCJSZWxvYWRpbmcgdmlldyBhcyB0aGUgdHJlZSBjaGFuZ2VkIGFuZCB3ZSBoYXZlIGEgZ2l0IG1iZWFuIG5vd1wiKTtcbiAgICAgICAgc2V0VGltZW91dChtYXliZVVwZGF0ZVZpZXcsIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAvL2xvZy5pbmZvKFwiUmVsb2FkaW5nIHZpZXcgZHVlIHRvICRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIik7XG4gICAgICBzZXRUaW1lb3V0KG1heWJlVXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUub3BlbkRlbGV0ZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRmlsZUh0bWwgPSBcIjx1bD5cIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLm1hcChmaWxlID0+IFwiPGxpPlwiICsgZmlsZS5uYW1lICsgXCI8L2xpPlwiKS5zb3J0KCkuam9pbihcIlwiKSArIFwiPC91bD5cIjtcblxuICAgICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMuZmluZCgoZmlsZSkgPT4geyByZXR1cm4gZmlsZS5uYW1lLmVuZHNXaXRoKFwiLnByb2ZpbGVcIil9KSkge1xuICAgICAgICAgICRzY29wZS5kZWxldGVXYXJuaW5nID0gXCJZb3UgYXJlIGFib3V0IHRvIGRlbGV0ZSBkb2N1bWVudChzKSB3aGljaCByZXByZXNlbnQgRmFicmljOCBwcm9maWxlKHMpLiBUaGlzIHJlYWxseSBjYW4ndCBiZSB1bmRvbmUhIFdpa2kgb3BlcmF0aW9ucyBhcmUgbG93IGxldmVsIGFuZCBtYXkgbGVhZCB0byBub24tZnVuY3Rpb25hbCBzdGF0ZSBvZiBGYWJyaWMuXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJHNjb3BlLmRlbGV0ZVdhcm5pbmcgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLmRlbGV0ZURpYWxvZyA9IFdpa2kuZ2V0RGVsZXRlRGlhbG9nKCRkaWFsb2csIDxXaWtpLkRlbGV0ZURpYWxvZ09wdGlvbnM+e1xuICAgICAgICAgIGNhbGxiYWNrczogKCkgPT4geyByZXR1cm4gJHNjb3BlLmRlbGV0ZUFuZENsb3NlRGlhbG9nOyB9LFxuICAgICAgICAgIHNlbGVjdGVkRmlsZUh0bWw6ICgpID0+ICB7IHJldHVybiAkc2NvcGUuc2VsZWN0ZWRGaWxlSHRtbDsgfSxcbiAgICAgICAgICB3YXJuaW5nOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZGVsZXRlV2FybmluZzsgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuZGVsZXRlRGlhbG9nLm9wZW4oKTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gaXRlbXMgc2VsZWN0ZWQgcmlnaHQgbm93ISBcIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRlbGV0ZUFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIGZpbGVzID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICB2YXIgZmlsZUNvdW50ID0gZmlsZXMubGVuZ3RoO1xuICAgICAgbG9nLmRlYnVnKFwiRGVsZXRpbmcgc2VsZWN0aW9uOiBcIiArIGZpbGVzKTtcblxuICAgICAgdmFyIHBhdGhzVG9EZWxldGUgPSBbXTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChmaWxlcywgKGZpbGUsIGlkeCkgPT4ge1xuICAgICAgICB2YXIgcGF0aCA9IFVybEhlbHBlcnMuam9pbigkc2NvcGUucGFnZUlkLCBmaWxlLm5hbWUpO1xuICAgICAgICBwYXRoc1RvRGVsZXRlLnB1c2gocGF0aCk7XG4gICAgICB9KTtcblxuICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gZGVsZXRlIFwiICsgcGF0aHNUb0RlbGV0ZSk7XG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZXMoJHNjb3BlLmJyYW5jaCwgcGF0aHNUb0RlbGV0ZSwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyA9IFtdO1xuICAgICAgICB2YXIgbWVzc2FnZSA9IENvcmUubWF5YmVQbHVyYWwoZmlsZUNvdW50LCBcImRvY3VtZW50XCIpO1xuICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJEZWxldGVkIFwiICsgbWVzc2FnZSk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgIH0pO1xuICAgICAgJHNjb3BlLmRlbGV0ZURpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKFwicmVuYW1lLm5ld0ZpbGVOYW1lXCIsICgpID0+IHtcbiAgICAgIC8vIGlnbm9yZSBlcnJvcnMgaWYgdGhlIGZpbGUgaXMgdGhlIHNhbWUgYXMgdGhlIHJlbmFtZSBmaWxlIVxuICAgICAgdmFyIHBhdGggPSBnZXRSZW5hbWVGaWxlUGF0aCgpO1xuICAgICAgaWYgKCRzY29wZS5vcmlnaW5hbFJlbmFtZUZpbGVQYXRoID09PSBwYXRoKSB7XG4gICAgICAgICRzY29wZS5maWxlRXhpc3RzID0geyBleGlzdHM6IGZhbHNlLCBuYW1lOiBudWxsIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGVja0ZpbGVFeGlzdHMocGF0aCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUucmVuYW1lQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICB2YXIgbmV3UGF0aCA9IGdldFJlbmFtZUZpbGVQYXRoKCk7XG4gICAgICAgIGlmIChzZWxlY3RlZCAmJiBuZXdQYXRoKSB7XG4gICAgICAgICAgdmFyIG9sZE5hbWUgPSBzZWxlY3RlZC5uYW1lO1xuICAgICAgICAgIHZhciBuZXdOYW1lID0gV2lraS5maWxlTmFtZShuZXdQYXRoKTtcbiAgICAgICAgICB2YXIgb2xkUGF0aCA9IFVybEhlbHBlcnMuam9pbigkc2NvcGUucGFnZUlkLCBvbGROYW1lKTtcbiAgICAgICAgICBsb2cuZGVidWcoXCJBYm91dCB0byByZW5hbWUgZmlsZSBcIiArIG9sZFBhdGggKyBcIiB0byBcIiArIG5ld1BhdGgpO1xuICAgICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5yZW5hbWUoJHNjb3BlLmJyYW5jaCwgb2xkUGF0aCwgbmV3UGF0aCwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiUmVuYW1lZCBmaWxlIHRvICBcIiArIG5ld05hbWUpO1xuICAgICAgICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMuc3BsaWNlKDAsIDEpO1xuICAgICAgICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZy5jbG9zZSgpO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub3BlblJlbmFtZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBuYW1lID0gbnVsbDtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgIG5hbWUgPSBzZWxlY3RlZC5uYW1lO1xuICAgICAgfVxuICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgJHNjb3BlLnJlbmFtZS5uZXdGaWxlTmFtZSA9IG5hbWU7XG4gICAgICAgICRzY29wZS5vcmlnaW5hbFJlbmFtZUZpbGVQYXRoID0gZ2V0UmVuYW1lRmlsZVBhdGgoKTtcblxuICAgICAgICAkc2NvcGUucmVuYW1lRGlhbG9nID0gV2lraS5nZXRSZW5hbWVEaWFsb2coJGRpYWxvZywgPFdpa2kuUmVuYW1lRGlhbG9nT3B0aW9ucz57XG4gICAgICAgICAgcmVuYW1lOiAoKSA9PiB7ICByZXR1cm4gJHNjb3BlLnJlbmFtZTsgfSxcbiAgICAgICAgICBmaWxlRXhpc3RzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZmlsZUV4aXN0czsgfSxcbiAgICAgICAgICBmaWxlTmFtZTogKCkgPT4geyByZXR1cm4gJHNjb3BlLmZpbGVOYW1lOyB9LFxuICAgICAgICAgIGNhbGxiYWNrczogKCkgPT4geyByZXR1cm4gJHNjb3BlLnJlbmFtZUFuZENsb3NlRGlhbG9nOyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5yZW5hbWVEaWFsb2cub3BlbigpO1xuXG4gICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAkKCcjcmVuYW1lRmlsZU5hbWUnKS5mb2N1cygpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJObyBpdGVtcyBzZWxlY3RlZCByaWdodCBub3chIFwiICsgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUubW92ZUFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIGZpbGVzID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICB2YXIgZmlsZUNvdW50ID0gZmlsZXMubGVuZ3RoO1xuICAgICAgdmFyIG1vdmVGb2xkZXIgPSAkc2NvcGUubW92ZS5tb3ZlRm9sZGVyO1xuICAgICAgdmFyIG9sZEZvbGRlcjpzdHJpbmcgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgaWYgKG1vdmVGb2xkZXIgJiYgZmlsZUNvdW50ICYmIG1vdmVGb2xkZXIgIT09IG9sZEZvbGRlcikge1xuICAgICAgICBsb2cuZGVidWcoXCJNb3ZpbmcgXCIgKyBmaWxlQ291bnQgKyBcIiBmaWxlKHMpIHRvIFwiICsgbW92ZUZvbGRlcik7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChmaWxlcywgKGZpbGUsIGlkeCkgPT4ge1xuICAgICAgICAgIHZhciBvbGRQYXRoID0gb2xkRm9sZGVyICsgXCIvXCIgKyBmaWxlLm5hbWU7XG4gICAgICAgICAgdmFyIG5ld1BhdGggPSBtb3ZlRm9sZGVyICsgXCIvXCIgKyBmaWxlLm5hbWU7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gbW92ZSBcIiArIG9sZFBhdGggKyBcIiB0byBcIiArIG5ld1BhdGgpO1xuICAgICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5yZW5hbWUoJHNjb3BlLmJyYW5jaCwgb2xkUGF0aCwgbmV3UGF0aCwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlkeCArIDEgPT09IGZpbGVDb3VudCkge1xuICAgICAgICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5zcGxpY2UoMCwgZmlsZUNvdW50KTtcbiAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBDb3JlLm1heWJlUGx1cmFsKGZpbGVDb3VudCwgXCJkb2N1bWVudFwiKTtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiTW92ZWQgXCIgKyBtZXNzYWdlICsgXCIgdG8gXCIgKyBuZXdQYXRoKTtcbiAgICAgICAgICAgICAgJHNjb3BlLm1vdmVEaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5tb3ZlRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5mb2xkZXJOYW1lcyA9ICh0ZXh0KSA9PiB7XG4gICAgICByZXR1cm4gd2lraVJlcG9zaXRvcnkuY29tcGxldGVQYXRoKCRzY29wZS5icmFuY2gsIHRleHQsIHRydWUsIG51bGwpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub3Blbk1vdmVEaWFsb2cgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5tb3ZlLm1vdmVGb2xkZXIgPSAkc2NvcGUucGFnZUlkO1xuXG4gICAgICAgICRzY29wZS5tb3ZlRGlhbG9nID0gV2lraS5nZXRNb3ZlRGlhbG9nKCRkaWFsb2csIDxXaWtpLk1vdmVEaWFsb2dPcHRpb25zPntcbiAgICAgICAgICBtb3ZlOiAoKSA9PiB7ICByZXR1cm4gJHNjb3BlLm1vdmU7IH0sXG4gICAgICAgICAgZm9sZGVyTmFtZXM6ICgpID0+IHsgcmV0dXJuICRzY29wZS5mb2xkZXJOYW1lczsgfSxcbiAgICAgICAgICBjYWxsYmFja3M6ICgpID0+IHsgcmV0dXJuICRzY29wZS5tb3ZlQW5kQ2xvc2VEaWFsb2c7IH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLm1vdmVEaWFsb2cub3BlbigpO1xuXG4gICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAkKCcjbW92ZUZvbGRlcicpLmZvY3VzKCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIGl0ZW1zIHNlbGVjdGVkIHJpZ2h0IG5vdyEgXCIgKyAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyk7XG4gICAgICB9XG4gICAgfTtcblxuXG4gICAgc2V0VGltZW91dChtYXliZVVwZGF0ZVZpZXcsIDUwKTtcblxuICAgIGZ1bmN0aW9uIGlzRGlmZlZpZXcoKSB7XG4gICAgICByZXR1cm4gJHJvdXRlUGFyYW1zW1wiZGlmZk9iamVjdElkMVwiXSB8fCAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQyXCJdID8gdHJ1ZSA6IGZhbHNlXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgICAgLy8gVE9ETyByZW1vdmUhXG4gICAgICAgIHZhciBqb2xva2lhID0gbnVsbDtcblxuXG4gICAgICBpZiAoaXNEaWZmVmlldygpKSB7XG4gICAgICAgIHZhciBiYXNlT2JqZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQyXCJdO1xuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZGlmZigkc2NvcGUub2JqZWN0SWQsIGJhc2VPYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgb25GaWxlRGV0YWlscyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCAkc2NvcGUub2JqZWN0SWQsIG9uRmlsZURldGFpbHMpO1xuICAgICAgfVxuICAgICAgV2lraS5sb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMpO1xuICAgIH1cblxuICAgICRzY29wZS51cGRhdGVWaWV3ID0gdXBkYXRlVmlldztcblxuICAgIGZ1bmN0aW9uIHZpZXdDb250ZW50cyhwYWdlTmFtZSwgY29udGVudHMpIHtcbiAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gbnVsbDtcblxuICAgICAgdmFyIGZvcm1hdDpzdHJpbmcgPSBudWxsO1xuICAgICAgaWYgKGlzRGlmZlZpZXcoKSkge1xuICAgICAgICBmb3JtYXQgPSBcImRpZmZcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdChwYWdlTmFtZSwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgfHwgJHNjb3BlLmZvcm1hdDtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcIkZpbGUgZm9ybWF0OiBcIiwgZm9ybWF0KTtcbiAgICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICAgIGNhc2UgXCJpbWFnZVwiOlxuICAgICAgICAgIHZhciBpbWFnZVVSTCA9ICdnaXQvJyArICRzY29wZS5icmFuY2g7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiJHNjb3BlOiBcIiwgJHNjb3BlKTtcbiAgICAgICAgICBpbWFnZVVSTCA9IFVybEhlbHBlcnMuam9pbihpbWFnZVVSTCwgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgICAgdmFyIGludGVycG9sYXRlRnVuYyA9ICRpbnRlcnBvbGF0ZSgkdGVtcGxhdGVDYWNoZS5nZXQoXCJpbWFnZVRlbXBsYXRlLmh0bWxcIikpO1xuICAgICAgICAgICRzY29wZS5odG1sID0gaW50ZXJwb2xhdGVGdW5jKHtcbiAgICAgICAgICAgIGltYWdlVVJMOiBpbWFnZVVSTFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwibWFya2Rvd25cIjpcbiAgICAgICAgICAkc2NvcGUuaHRtbCA9IGNvbnRlbnRzID8gbWFya2VkKGNvbnRlbnRzKSA6IFwiXCI7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJqYXZhc2NyaXB0XCI6XG4gICAgICAgICAgdmFyIGZvcm0gPSBudWxsO1xuICAgICAgICAgIGZvcm0gPSAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdO1xuICAgICAgICAgICRzY29wZS5zb3VyY2UgPSBjb250ZW50cztcbiAgICAgICAgICAkc2NvcGUuZm9ybSA9IGZvcm07XG4gICAgICAgICAgaWYgKGZvcm0pIHtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHRyeSBsb2FkIHRoZSBmb3JtIEpTT04gc28gd2UgY2FuIHRoZW4gcmVuZGVyIHRoZSBmb3JtXG4gICAgICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb3JtLCAkc2NvcGUub2JqZWN0SWQsIChkZXRhaWxzKSA9PiB7XG4gICAgICAgICAgICAgIG9uRm9ybVNjaGVtYShXaWtpLnBhcnNlSnNvbihkZXRhaWxzLnRleHQpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvc291cmNlVmlldy5odG1sXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICRzY29wZS5odG1sID0gbnVsbDtcbiAgICAgICAgICAkc2NvcGUuc291cmNlID0gY29udGVudHM7XG4gICAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL3NvdXJjZVZpZXcuaHRtbFwiO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZvcm1TY2hlbWEoanNvbikge1xuICAgICAgJHNjb3BlLmZvcm1EZWZpbml0aW9uID0ganNvbjtcbiAgICAgIGlmICgkc2NvcGUuc291cmNlKSB7XG4gICAgICAgICRzY29wZS5mb3JtRW50aXR5ID0gV2lraS5wYXJzZUpzb24oJHNjb3BlLnNvdXJjZSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvZm9ybVZpZXcuaHRtbFwiO1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZpbGVEZXRhaWxzKGRldGFpbHMpIHtcbiAgICAgIHZhciBjb250ZW50cyA9IGRldGFpbHMudGV4dDtcbiAgICAgICRzY29wZS5kaXJlY3RvcnkgPSBkZXRhaWxzLmRpcmVjdG9yeTtcbiAgICAgICRzY29wZS5maWxlRGV0YWlscyA9IGRldGFpbHM7XG5cbiAgICAgIGlmIChkZXRhaWxzICYmIGRldGFpbHMuZm9ybWF0KSB7XG4gICAgICAgICRzY29wZS5mb3JtYXQgPSBkZXRhaWxzLmZvcm1hdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5mb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQoJHNjb3BlLnBhZ2VJZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMubW9kZS5uYW1lID0gJHNjb3BlLmZvcm1hdDtcbiAgICAgICRzY29wZS5jaGlsZHJlbiA9IG51bGw7XG5cbiAgICAgIGlmIChkZXRhaWxzLmRpcmVjdG9yeSkge1xuICAgICAgICB2YXIgZGlyZWN0b3JpZXMgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbHRlcigoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRpci5kaXJlY3Rvcnk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgcHJvZmlsZXMgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbHRlcigoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGZpbGVzID0gZGV0YWlscy5jaGlsZHJlbi5maWx0ZXIoKGZpbGUpID0+IHtcbiAgICAgICAgICByZXR1cm4gIWZpbGUuZGlyZWN0b3J5O1xuICAgICAgICB9KTtcbiAgICAgICAgZGlyZWN0b3JpZXMgPSBkaXJlY3Rvcmllcy5zb3J0QnkoKGRpcikgPT4ge1xuICAgICAgICAgIHJldHVybiBkaXIubmFtZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2ZpbGVzID0gcHJvZmlsZXMuc29ydEJ5KChkaXIpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGlyLm5hbWU7XG4gICAgICAgIH0pO1xuICAgICAgICBmaWxlcyA9IGZpbGVzLnNvcnRCeSgoZmlsZSkgPT4ge1xuICAgICAgICAgIHJldHVybiBmaWxlLm5hbWU7XG4gICAgICAgIH0pXG4gICAgICAgICAgLnNvcnRCeSgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGZpbGUubmFtZS5zcGxpdCgnLicpLmxhc3QoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgLy8gQWxzbyBlbnJpY2ggdGhlIHJlc3BvbnNlIHdpdGggdGhlIGN1cnJlbnQgYnJhbmNoLCBhcyB0aGF0J3MgcGFydCBvZiB0aGUgY29vcmRpbmF0ZSBmb3IgbG9jYXRpbmcgdGhlIGFjdHVhbCBmaWxlIGluIGdpdFxuICAgICAgICAkc2NvcGUuY2hpbGRyZW4gPSAoPGFueT5BcnJheSkuY3JlYXRlKGRpcmVjdG9yaWVzLCBwcm9maWxlcywgZmlsZXMpLm1hcCgoZmlsZSkgPT4ge1xuICAgICAgICAgIGZpbGUuYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICAgICAgICBmaWxlLmZpbGVOYW1lID0gZmlsZS5uYW1lO1xuICAgICAgICAgIGlmIChmaWxlLmRpcmVjdG9yeSkge1xuICAgICAgICAgICAgZmlsZS5maWxlTmFtZSArPSBcIi56aXBcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmlsZS5kb3dubG9hZFVSTCA9IFdpa2kuZ2l0UmVzdFVSTCgkc2NvcGUsIGZpbGUucGF0aCk7XG4gICAgICAgICAgcmV0dXJuIGZpbGU7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG5cbiAgICAgICRzY29wZS5odG1sID0gbnVsbDtcbiAgICAgICRzY29wZS5zb3VyY2UgPSBudWxsO1xuICAgICAgJHNjb3BlLnJlYWRNZVBhdGggPSBudWxsO1xuXG4gICAgICAkc2NvcGUuaXNGaWxlID0gZmFsc2U7XG4gICAgICBpZiAoJHNjb3BlLmNoaWxkcmVuKSB7XG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdwYW5lLm9wZW4nKTtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIHJlYWRtZSB0aGVuIGxldHMgcmVuZGVyIGl0Li4uXG4gICAgICAgIHZhciBpdGVtID0gJHNjb3BlLmNoaWxkcmVuLmZpbmQoKGluZm8pID0+IHtcbiAgICAgICAgICB2YXIgbmFtZSA9IChpbmZvLm5hbWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICB2YXIgZXh0ID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAgICAgICByZXR1cm4gbmFtZSAmJiBleHQgJiYgKChuYW1lLnN0YXJ0c1dpdGgoXCJyZWFkbWUuXCIpIHx8IG5hbWUgPT09IFwicmVhZG1lXCIpIHx8IChuYW1lLnN0YXJ0c1dpdGgoXCJpbmRleC5cIikgfHwgbmFtZSA9PT0gXCJpbmRleFwiKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgIHZhciBwYWdlTmFtZSA9IGl0ZW0ucGF0aDtcbiAgICAgICAgICAkc2NvcGUucmVhZE1lUGF0aCA9IHBhZ2VOYW1lO1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGFnZU5hbWUsICRzY29wZS5vYmplY3RJZCwgKHJlYWRtZURldGFpbHMpID0+IHtcbiAgICAgICAgICAgIHZpZXdDb250ZW50cyhwYWdlTmFtZSwgcmVhZG1lRGV0YWlscy50ZXh0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIga3ViZXJuZXRlc0pzb24gPSAkc2NvcGUuY2hpbGRyZW4uZmluZCgoY2hpbGQpID0+IHtcbiAgICAgICAgICB2YXIgbmFtZSA9IChjaGlsZC5uYW1lIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgdmFyIGV4dCA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgICAgICAgcmV0dXJuIG5hbWUgJiYgZXh0ICYmIG5hbWUuc3RhcnRzV2l0aChcImt1YmVybmV0ZXNcIikgJiYgZXh0ID09PSBcImpzb25cIjtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChrdWJlcm5ldGVzSnNvbikge1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwga3ViZXJuZXRlc0pzb24ucGF0aCwgdW5kZWZpbmVkLCAoanNvbikgPT4ge1xuICAgICAgICAgICAgaWYgKGpzb24gJiYganNvbi50ZXh0KSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmt1YmVybmV0ZXNKc29uID0gYW5ndWxhci5mcm9tSnNvbihqc29uLnRleHQpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmt1YmVybmV0ZXNKc29uID0ge1xuICAgICAgICAgICAgICAgICAgZXJyb3JQYXJzaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgZXJyb3I6IGVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRzY29wZS5zaG93QXBwSGVhZGVyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnV2lraS5WaWV3UGFnZS5DaGlsZHJlbicsICRzY29wZS5wYWdlSWQsICRzY29wZS5jaGlsZHJlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgncGFuZS5jbG9zZScpO1xuICAgICAgICB2YXIgcGFnZU5hbWUgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgICB2aWV3Q29udGVudHMocGFnZU5hbWUsIGNvbnRlbnRzKTtcbiAgICAgICAgJHNjb3BlLmlzRmlsZSA9IHRydWU7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrRmlsZUV4aXN0cyhwYXRoKSB7XG4gICAgICAkc2NvcGUub3BlcmF0aW9uQ291bnRlciArPSAxO1xuICAgICAgdmFyIGNvdW50ZXIgPSAkc2NvcGUub3BlcmF0aW9uQ291bnRlcjtcbiAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgIHdpa2lSZXBvc2l0b3J5LmV4aXN0cygkc2NvcGUuYnJhbmNoLCBwYXRoLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgLy8gZmlsdGVyIG9sZCByZXN1bHRzXG4gICAgICAgICAgaWYgKCRzY29wZS5vcGVyYXRpb25Db3VudGVyID09PSBjb3VudGVyKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJjaGVja0ZpbGVFeGlzdHMgZm9yIHBhdGggXCIgKyBwYXRoICsgXCIgZ290IHJlc3VsdCBcIiArIHJlc3VsdCk7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSByZXN1bHQgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gcmVzdWx0ID8gcmVzdWx0Lm5hbWUgOiBudWxsO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbG9nLmRlYnVnKFwiSWdub3Jpbmcgb2xkIHJlc3VsdHMgZm9yIFwiICsgcGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDYWxsZWQgYnkgaGF3dGlvIFRPQyBkaXJlY3RpdmUuLi5cbiAgICAkc2NvcGUuZ2V0Q29udGVudHMgPSAoZmlsZW5hbWUsIGNiKSA9PiB7XG4gICAgICB2YXIgcGFnZUlkID0gZmlsZW5hbWU7XG4gICAgICBpZiAoJHNjb3BlLmRpcmVjdG9yeSkge1xuICAgICAgICBwYWdlSWQgPSAkc2NvcGUucGFnZUlkICsgJy8nICsgZmlsZW5hbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGF0aFBhcnRzID0gJHNjb3BlLnBhZ2VJZC5zcGxpdCgnLycpO1xuICAgICAgICBwYXRoUGFydHMgPSBwYXRoUGFydHMucmVtb3ZlKHBhdGhQYXJ0cy5sYXN0KCkpO1xuICAgICAgICBwYXRoUGFydHMucHVzaChmaWxlbmFtZSk7XG4gICAgICAgIHBhZ2VJZCA9IHBhdGhQYXJ0cy5qb2luKCcvJyk7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoXCJwYWdlSWQ6IFwiLCAkc2NvcGUucGFnZUlkKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImJyYW5jaDogXCIsICRzY29wZS5icmFuY2gpO1xuICAgICAgbG9nLmRlYnVnKFwiZmlsZW5hbWU6IFwiLCBmaWxlbmFtZSk7XG4gICAgICBsb2cuZGVidWcoXCJ1c2luZyBwYWdlSWQ6IFwiLCBwYWdlSWQpO1xuICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYWdlSWQsIHVuZGVmaW5lZCwgKGRhdGEpID0+IHtcbiAgICAgICAgY2IoZGF0YS50ZXh0KTtcbiAgICAgIH0pO1xuICAgIH07XG5cblxuICAgIGZ1bmN0aW9uIGdldFJlbmFtZUZpbGVQYXRoKCkge1xuICAgICAgdmFyIG5ld0ZpbGVOYW1lID0gJHNjb3BlLnJlbmFtZS5uZXdGaWxlTmFtZTtcbiAgICAgIHJldHVybiAoJHNjb3BlLnBhZ2VJZCAmJiBuZXdGaWxlTmFtZSkgPyBVcmxIZWxwZXJzLmpvaW4oJHNjb3BlLnBhZ2VJZCwgbmV3RmlsZU5hbWUpIDogbnVsbDtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IGludGVyZmFjZSBXaWtpRGlhbG9nIHtcbiAgICBvcGVuOiAoKSA9PiB7fTtcbiAgICBjbG9zZTogKCkgPT4ge307XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIFJlbmFtZURpYWxvZ09wdGlvbnMge1xuICAgIHJlbmFtZTogKCkgPT4ge307XG4gICAgZmlsZUV4aXN0czogKCkgPT4ge307XG4gICAgZmlsZU5hbWU6ICgpID0+IFN0cmluZztcbiAgICBjYWxsYmFja3M6ICgpID0+IFN0cmluZztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRSZW5hbWVEaWFsb2coJGRpYWxvZywgJHNjb3BlOlJlbmFtZURpYWxvZ09wdGlvbnMpOldpa2kuV2lraURpYWxvZyB7XG4gICAgcmV0dXJuICRkaWFsb2cuZGlhbG9nKHtcbiAgICAgIHJlc29sdmU6ICRzY29wZSxcbiAgICAgIHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvbW9kYWwvcmVuYW1lRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcInJlbmFtZVwiLCBcImZpbGVFeGlzdHNcIiwgXCJmaWxlTmFtZVwiLCAoJHNjb3BlLCBkaWFsb2csIGNhbGxiYWNrcywgcmVuYW1lLCBmaWxlRXhpc3RzLCBmaWxlTmFtZSkgPT4ge1xuICAgICAgICAkc2NvcGUucmVuYW1lICA9IHJlbmFtZTtcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMgID0gZmlsZUV4aXN0cztcbiAgICAgICAgJHNjb3BlLmZpbGVOYW1lICA9IGZpbGVOYW1lO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUucmVuYW1lQW5kQ2xvc2VEaWFsb2cgPSBjYWxsYmFja3M7XG5cbiAgICAgIH1dXG4gICAgfSk7XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIE1vdmVEaWFsb2dPcHRpb25zIHtcbiAgICBtb3ZlOiAoKSA9PiB7fTtcbiAgICBmb2xkZXJOYW1lczogKCkgPT4ge307XG4gICAgY2FsbGJhY2tzOiAoKSA9PiBTdHJpbmc7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRNb3ZlRGlhbG9nKCRkaWFsb2csICRzY29wZTpNb3ZlRGlhbG9nT3B0aW9ucyk6V2lraS5XaWtpRGlhbG9nIHtcbiAgICByZXR1cm4gJGRpYWxvZy5kaWFsb2coe1xuICAgICAgcmVzb2x2ZTogJHNjb3BlLFxuICAgICAgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9tb2RhbC9tb3ZlRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcIm1vdmVcIiwgXCJmb2xkZXJOYW1lc1wiLCAoJHNjb3BlLCBkaWFsb2csIGNhbGxiYWNrcywgbW92ZSwgZm9sZGVyTmFtZXMpID0+IHtcbiAgICAgICAgJHNjb3BlLm1vdmUgID0gbW92ZTtcbiAgICAgICAgJHNjb3BlLmZvbGRlck5hbWVzICA9IGZvbGRlck5hbWVzO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUubW92ZUFuZENsb3NlRGlhbG9nID0gY2FsbGJhY2tzO1xuXG4gICAgICB9XVxuICAgIH0pO1xuICB9XG5cblxuICBleHBvcnQgaW50ZXJmYWNlIERlbGV0ZURpYWxvZ09wdGlvbnMge1xuICAgIGNhbGxiYWNrczogKCkgPT4gU3RyaW5nO1xuICAgIHNlbGVjdGVkRmlsZUh0bWw6ICgpID0+IFN0cmluZztcbiAgICB3YXJuaW5nOiAoKSA9PiBzdHJpbmc7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXREZWxldGVEaWFsb2coJGRpYWxvZywgJHNjb3BlOkRlbGV0ZURpYWxvZ09wdGlvbnMpOldpa2kuV2lraURpYWxvZyB7XG4gICAgcmV0dXJuICRkaWFsb2cuZGlhbG9nKHtcbiAgICAgIHJlc29sdmU6ICRzY29wZSxcbiAgICAgIHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvbW9kYWwvZGVsZXRlRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcInNlbGVjdGVkRmlsZUh0bWxcIiwgXCJ3YXJuaW5nXCIsICgkc2NvcGUsIGRpYWxvZywgY2FsbGJhY2tzLCBzZWxlY3RlZEZpbGVIdG1sLCB3YXJuaW5nKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRmlsZUh0bWwgPSBzZWxlY3RlZEZpbGVIdG1sO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGVsZXRlQW5kQ2xvc2VEaWFsb2cgPSBjYWxsYmFja3M7XG5cbiAgICAgICAgJHNjb3BlLndhcm5pbmcgPSB3YXJuaW5nO1xuICAgICAgfV1cbiAgICB9KTtcbiAgfVxuXG5cblxuXG5cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuZGlyZWN0aXZlKCd3aWtpSHJlZkFkanVzdGVyJywgW1wiJGxvY2F0aW9uXCIsICgkbG9jYXRpb24pID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgIGxpbms6ICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cikgPT4ge1xuXG4gICAgICAgICRlbGVtZW50LmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIChldmVudCkgPT4ge1xuICAgICAgICAgIHZhciBheXMgPSAkZWxlbWVudC5maW5kKCdhJyk7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGF5cywgKGEpID0+IHtcbiAgICAgICAgICAgIGlmIChhLmhhc0F0dHJpYnV0ZSgnbm8tYWRqdXN0JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYSA9ICQoYSk7XG4gICAgICAgICAgICB2YXIgaHJlZiA9IChhLmF0dHIoJ2hyZWYnKSB8fCBcIlwiKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoaHJlZikge1xuICAgICAgICAgICAgICB2YXIgZmlsZUV4dGVuc2lvbiA9IGEuYXR0cignZmlsZS1leHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gV2lraS5hZGp1c3RIcmVmKCRzY29wZSwgJGxvY2F0aW9uLCBocmVmLCBmaWxlRXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYS5hdHRyKCdocmVmJywgbmV3VmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmFyIGltZ3MgPSAkZWxlbWVudC5maW5kKCdpbWcnKTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goaW1ncywgKGEpID0+IHtcbiAgICAgICAgICAgIGlmIChhLmhhc0F0dHJpYnV0ZSgnbm8tYWRqdXN0JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYSA9ICQoYSk7XG4gICAgICAgICAgICB2YXIgaHJlZiA9IChhLmF0dHIoJ3NyYycpIHx8IFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChocmVmKSB7XG4gICAgICAgICAgICAgIGlmIChocmVmLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XG4gICAgICAgICAgICAgICAgaHJlZiA9IENvcmUudXJsKGhyZWYpO1xuICAgICAgICAgICAgICAgIGEuYXR0cignc3JjJywgaHJlZik7XG5cbiAgICAgICAgICAgICAgICAvLyBsZXRzIGF2b2lkIHRoaXMgZWxlbWVudCBiZWluZyByZXByb2Nlc3NlZFxuICAgICAgICAgICAgICAgIGEuYXR0cignbm8tYWRqdXN0JywgJ3RydWUnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIF9tb2R1bGUuZGlyZWN0aXZlKCd3aWtpVGl0bGVMaW5rZXInLCBbXCIkbG9jYXRpb25cIiwgKCRsb2NhdGlvbikgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgbGluazogKCRzY29wZSwgJGVsZW1lbnQsICRhdHRyKSA9PiB7XG4gICAgICAgIHZhciBsb2FkZWQgPSBmYWxzZTtcblxuICAgICAgICBmdW5jdGlvbiBvZmZzZXRUb3AoZWxlbWVudHMpIHtcbiAgICAgICAgICBpZiAoZWxlbWVudHMpIHtcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSBlbGVtZW50cy5vZmZzZXQoKTtcbiAgICAgICAgICAgIGlmIChvZmZzZXQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mZnNldC50b3A7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2Nyb2xsVG9IYXNoKCkge1xuICAgICAgICAgIHZhciBhbnN3ZXIgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgaWQgPSAkbG9jYXRpb24uc2VhcmNoKClbXCJoYXNoXCJdO1xuICAgICAgICAgIHJldHVybiBzY3JvbGxUb0lkKGlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNjcm9sbFRvSWQoaWQpIHtcbiAgICAgICAgICB2YXIgYW5zd2VyID0gZmFsc2U7XG4gICAgICAgICAgdmFyIGlkID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiaGFzaFwiXTtcbiAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHZhciBzZWxlY3RvciA9ICdhW25hbWU9XCInICsgaWQgKyAnXCJdJztcbiAgICAgICAgICAgIHZhciB0YXJnZXRFbGVtZW50cyA9ICRlbGVtZW50LmZpbmQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKHRhcmdldEVsZW1lbnRzICYmIHRhcmdldEVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB2YXIgc2Nyb2xsRHVyYXRpb24gPSAxO1xuICAgICAgICAgICAgICB2YXIgZGVsdGEgPSBvZmZzZXRUb3AoJCgkZWxlbWVudCkpO1xuICAgICAgICAgICAgICB2YXIgdG9wID0gb2Zmc2V0VG9wKHRhcmdldEVsZW1lbnRzKSAtIGRlbHRhO1xuICAgICAgICAgICAgICBpZiAodG9wIDwgMCkge1xuICAgICAgICAgICAgICAgIHRvcCA9IDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy9sb2cuaW5mbyhcInNjcm9sbGluZyB0byBoYXNoOiBcIiArIGlkICsgXCIgdG9wOiBcIiArIHRvcCArIFwiIGRlbHRhOlwiICsgZGVsdGEpO1xuICAgICAgICAgICAgICAkKCdib2R5LGh0bWwnKS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY3JvbGxUb3A6IHRvcFxuICAgICAgICAgICAgICB9LCBzY3JvbGxEdXJhdGlvbik7XG4gICAgICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvL2xvZy5pbmZvKFwiY291bGQgZmluZCBlbGVtZW50IGZvcjogXCIgKyBzZWxlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGRMaW5rcyhldmVudCkge1xuICAgICAgICAgIHZhciBoZWFkaW5ncyA9ICRlbGVtZW50LmZpbmQoJ2gxLGgyLGgzLGg0LGg1LGg2LGg3Jyk7XG4gICAgICAgICAgdmFyIHVwZGF0ZWQgPSBmYWxzZTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goaGVhZGluZ3MsIChoZSkgPT4ge1xuICAgICAgICAgICAgdmFyIGgxID0gJChoZSk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB0cnkgZmluZCBhIGNoaWxkIGhlYWRlclxuICAgICAgICAgICAgdmFyIGEgPSBoMS5wYXJlbnQoXCJhXCIpO1xuICAgICAgICAgICAgaWYgKCFhIHx8ICFhLmxlbmd0aCkge1xuICAgICAgICAgICAgICB2YXIgdGV4dCA9IGgxLnRleHQoKTtcbiAgICAgICAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gdGV4dC5yZXBsYWNlKC8gL2csIFwiLVwiKTtcbiAgICAgICAgICAgICAgICB2YXIgcGF0aFdpdGhIYXNoID0gXCIjXCIgKyAkbG9jYXRpb24ucGF0aCgpICsgXCI/aGFzaD1cIiArIHRhcmdldDtcbiAgICAgICAgICAgICAgICB2YXIgbGluayA9IENvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIHBhdGhXaXRoSGFzaCwgWydoYXNoJ10pO1xuXG4gICAgICAgICAgICAgICAgLy8gbGV0cyB3cmFwIHRoZSBoZWFkaW5nIGluIGEgbGlua1xuICAgICAgICAgICAgICAgIHZhciBuZXdBID0gJCgnPGEgbmFtZT1cIicgKyB0YXJnZXQgKyAnXCIgaHJlZj1cIicgKyBsaW5rICsgJ1wiIG5nLWNsaWNrPVwib25MaW5rQ2xpY2soKVwiPjwvYT4nKTtcbiAgICAgICAgICAgICAgICBuZXdBLm9uKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxUb0lkKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbmV3QS5pbnNlcnRCZWZvcmUoaDEpO1xuICAgICAgICAgICAgICAgIGgxLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIG5ld0EuYXBwZW5kKGgxKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmICh1cGRhdGVkICYmICFsb2FkZWQpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICBpZiAoc2Nyb2xsVG9IYXNoKCkpIHtcbiAgICAgICAgICAgICAgICBsb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25FdmVudEluc2VydGVkKGV2ZW50KSB7XG4gICAgICAgICAgLy8gYXZvaWQgYW55IG1vcmUgZXZlbnRzIHdoaWxlIHdlIGRvIG91ciB0aGluZ1xuICAgICAgICAgICRlbGVtZW50LnVuYmluZCgnRE9NTm9kZUluc2VydGVkJywgb25FdmVudEluc2VydGVkKTtcbiAgICAgICAgICBhZGRMaW5rcyhldmVudCk7XG4gICAgICAgICAgJGVsZW1lbnQuYmluZCgnRE9NTm9kZUluc2VydGVkJywgb25FdmVudEluc2VydGVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRlbGVtZW50LmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIG9uRXZlbnRJbnNlcnRlZCk7XG4gICAgICB9XG4gICAgfTtcbiAgfV0pO1xuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIERldmVsb3Blci5jdXN0b21Qcm9qZWN0U3ViVGFiRmFjdG9yaWVzLnB1c2goXG4gICAgKGNvbnRleHQpID0+IHtcbiAgICAgIHZhciBwcm9qZWN0TGluayA9IGNvbnRleHQucHJvamVjdExpbms7XG4gICAgICB2YXIgd2lraUxpbmsgPSBudWxsO1xuICAgICAgaWYgKHByb2plY3RMaW5rKSB7XG4gICAgICAgIHdpa2lMaW5rID0gVXJsSGVscGVycy5qb2luKHByb2plY3RMaW5rLCBcIndpa2lcIiwgXCJ2aWV3XCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNWYWxpZDogKCkgPT4gd2lraUxpbmsgJiYgRGV2ZWxvcGVyLmZvcmdlUmVhZHlMaW5rKCksXG4gICAgICAgIGhyZWY6IHdpa2lMaW5rLFxuICAgICAgICBsYWJlbDogXCJTb3VyY2VcIixcbiAgICAgICAgdGl0bGU6IFwiQnJvd3NlIHRoZSBzb3VyY2UgY29kZSBvZiB0aGlzIHByb2plY3RcIlxuICAgICAgfTtcbiAgICB9KTtcblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTb3VyY2VCcmVhZGNydW1icygkc2NvcGUpIHtcbiAgICB2YXIgc291cmNlTGluayA9ICRzY29wZS4kdmlld0xpbmsgfHwgVXJsSGVscGVycy5qb2luKHN0YXJ0TGluaygkc2NvcGUpLCBcInZpZXdcIik7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtcbiAgICAgICAgbGFiZWw6IFwiU291cmNlXCIsXG4gICAgICAgIGhyZWY6IHNvdXJjZUxpbmssXG4gICAgICAgIHRpdGxlOiBcIkJyb3dzZSB0aGUgc291cmNlIGNvZGUgb2YgdGhpcyBwcm9qZWN0XCJcbiAgICAgIH1cbiAgICBdXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlRWRpdGluZ0JyZWFkY3J1bWIoJHNjb3BlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsYWJlbDogXCJFZGl0aW5nXCIsXG4gICAgICAgIHRpdGxlOiBcIkVkaXRpbmcgdGhpcyBmaWxlXCJcbiAgICAgIH07XG4gIH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLyoqXG4gICAqIEBjbGFzcyBHaXRXaWtpUmVwb3NpdG9yeVxuICAgKi9cbiAgZXhwb3J0IGNsYXNzIEdpdFdpa2lSZXBvc2l0b3J5IHtcbiAgICBwdWJsaWMgZGlyZWN0b3J5UHJlZml4ID0gXCJcIjtcbiAgICBwcml2YXRlICRodHRwO1xuICAgIHByaXZhdGUgY29uZmlnO1xuICAgIHByaXZhdGUgYmFzZVVybDtcbiAgICBwcml2YXRlIHByb2plY3RJZDtcblxuXG4gICAgY29uc3RydWN0b3IoJHNjb3BlKSB7XG4gICAgICB2YXIgRm9yZ2VBcGlVUkwgPSBLdWJlcm5ldGVzLmluamVjdChcIkZvcmdlQXBpVVJMXCIpO1xuICAgICAgdGhpcy4kaHR0cCA9IEt1YmVybmV0ZXMuaW5qZWN0KFwiJGh0dHBcIik7XG4gICAgICB0aGlzLmNvbmZpZyA9IEZvcmdlLmNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgIHZhciBvd25lciA9ICRzY29wZS5vd25lcjtcbiAgICAgIHZhciByZXBvTmFtZSA9ICRzY29wZS5yZXBvSWQ7XG4gICAgICB2YXIgcHJvamVjdElkID0gJHNjb3BlLnByb2plY3RJZDtcbiAgICAgIHRoaXMucHJvamVjdElkID0gcHJvamVjdElkO1xuICAgICAgdmFyIG5zID0gJHNjb3BlLm5hbWVzcGFjZSB8fCBLdWJlcm5ldGVzLmN1cnJlbnRLdWJlcm5ldGVzTmFtZXNwYWNlKCk7XG4gICAgICB0aGlzLmJhc2VVcmwgPSBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwicmVwb3MvcHJvamVjdFwiLCBucywgcHJvamVjdElkKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0UGFnZShicmFuY2g6c3RyaW5nLCBwYXRoOnN0cmluZywgb2JqZWN0SWQ6c3RyaW5nLCBmbikge1xuICAgICAgLy8gVE9ETyBpZ25vcmluZyBvYmplY3RJZFxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiY29udGVudFwiLCBwYXRoIHx8IFwiL1wiKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICB2YXIgZGV0YWlsczogYW55ID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGRhdGEsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFmaWxlLmRpcmVjdG9yeSAmJiBmaWxlLnR5cGUgPT09IFwiZGlyXCIpIHtcbiAgICAgICAgICAgICAgICAgIGZpbGUuZGlyZWN0b3J5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBkZXRhaWxzID0ge1xuICAgICAgICAgICAgICAgIGRpcmVjdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGlsZHJlbjogZGF0YVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkZXRhaWxzID0gZGF0YTtcbiAgICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSBkYXRhLmNvbnRlbnQ7XG4gICAgICAgICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgZGV0YWlscy50ZXh0ID0gY29udGVudC5kZWNvZGVCYXNlNjQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm4oZGV0YWlscyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcHV0UGFnZShicmFuY2g6c3RyaW5nLCBwYXRoOnN0cmluZywgY29udGVudHM6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gY29udGVudHM7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJjb250ZW50XCIsIHBhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgaGlzdG9yeSBvZiB0aGUgcmVwb3NpdG9yeSBvciBhIHNwZWNpZmljIGRpcmVjdG9yeSBvciBmaWxlIHBhdGhcbiAgICAgKiBAbWV0aG9kIGhpc3RvcnlcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGJyYW5jaFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RJZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGxpbWl0XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGhpc3RvcnkoYnJhbmNoOnN0cmluZywgb2JqZWN0SWQ6c3RyaW5nLCBwYXRoOnN0cmluZywgbGltaXQ6bnVtYmVyLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChsaW1pdCkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibGltaXQ9XCIgKyBsaW1pdDtcbiAgICAgIH1cbiAgICAgIHZhciBjb21taXRJZCA9IG9iamVjdElkIHx8IGJyYW5jaDtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiaGlzdG9yeVwiLCBjb21taXRJZCwgcGF0aCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGNvbW1pdEluZm8oY29tbWl0SWQ6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiY29tbWl0SW5mb1wiLCBjb21taXRJZCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGNvbW1pdERldGFpbChjb21taXRJZDpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJjb21taXREZXRhaWxcIiwgY29tbWl0SWQpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBjb21taXRUcmVlKGNvbW1pdElkOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImNvbW1pdFRyZWVcIiwgY29tbWl0SWQpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgYSBkaWZmIG9uIHRoZSB2ZXJzaW9uc1xuICAgICAqIEBtZXRob2QgZGlmZlxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYmFzZU9iamVjdElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgZGlmZihvYmplY3RJZDpzdHJpbmcsIGJhc2VPYmplY3RJZDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHZhciBjb25maWc6IGFueSA9IEZvcmdlLmNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgIGNvbmZpZy50cmFuc2Zvcm1SZXNwb25zZSA9IChkYXRhLCBoZWFkZXJzR2V0dGVyLCBzdGF0dXMpID0+IHtcbiAgICAgICAgbG9nLmluZm8oXCJnb3QgZGlmZiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgIH07XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImRpZmZcIiwgb2JqZWN0SWQsIGJhc2VPYmplY3RJZCwgcGF0aCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICB2YXIgZGV0YWlscyA9IHtcbiAgICAgICAgICAgIHRleHQ6IGRhdGEsXG4gICAgICAgICAgICBmb3JtYXQ6IFwiZGlmZlwiLFxuICAgICAgICAgICAgZGlyZWN0b3J5OiBmYWxzZVxuICAgICAgICAgIH07XG4gICAgICAgICAgZm4oZGV0YWlscyk7XG4gICAgICAgIH0sXG4gICAgICAgIG51bGwsIGNvbmZpZyk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGxpc3Qgb2YgYnJhbmNoZXNcbiAgICAgKiBAbWV0aG9kIGJyYW5jaGVzXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBicmFuY2hlcyhmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHRoaXMuZG9HZXQoXCJsaXN0QnJhbmNoZXNcIiwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZXhpc3RzKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBmbik6IEJvb2xlYW4ge1xuICAgICAgdmFyIGFuc3dlciA9IGZhbHNlO1xuICAgICAgdGhpcy5nZXRQYWdlKGJyYW5jaCwgcGF0aCwgbnVsbCwgKGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGRhdGEuZGlyZWN0b3J5KSB7XG4gICAgICAgICAgaWYgKGRhdGEuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICBhbnN3ZXIgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhbnN3ZXIgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGxvZy5pbmZvKFwiZXhpc3RzIFwiICsgcGF0aCArIFwiIGFuc3dlciA9IFwiICsgYW5zd2VyKTtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNGdW5jdGlvbihmbikpIHtcbiAgICAgICAgICBmbihhbnN3ZXIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgfVxuXG4gICAgcHVibGljIHJldmVydFRvKGJyYW5jaDpzdHJpbmcsIG9iamVjdElkOnN0cmluZywgYmxvYlBhdGg6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZXZlcnRpbmcgXCIgKyBibG9iUGF0aCArIFwiIGNvbW1pdCBcIiArIChvYmplY3RJZCB8fCBicmFuY2gpO1xuICAgICAgfVxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgdmFyIGJvZHkgPSBcIlwiO1xuICAgICAgdGhpcy5kb1Bvc3QoVXJsSGVscGVycy5qb2luKFwicmV2ZXJ0XCIsIG9iamVjdElkLCBibG9iUGF0aCB8fCBcIi9cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIHJlbmFtZShicmFuY2g6c3RyaW5nLCBvbGRQYXRoOnN0cmluZywgIG5ld1BhdGg6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW5hbWluZyBwYWdlIFwiICsgb2xkUGF0aCArIFwiIHRvIFwiICsgbmV3UGF0aDtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIGlmIChvbGRQYXRoKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJvbGQ9XCIgKyBlbmNvZGVVUklDb21wb25lbnQob2xkUGF0aCk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IFwiXCI7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJtdlwiLCBuZXdQYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVtb3ZlUGFnZShicmFuY2g6c3RyaW5nLCBwYXRoOnN0cmluZywgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICBpZiAoIWNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgY29tbWl0TWVzc2FnZSA9IFwiUmVtb3ZpbmcgcGFnZSBcIiArIHBhdGg7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IFwiXCI7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJybVwiLCBwYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVtb3ZlUGFnZXMoYnJhbmNoOnN0cmluZywgcGF0aHM6QXJyYXk8c3RyaW5nPiwgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICBpZiAoIWNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgY29tbWl0TWVzc2FnZSA9IFwiUmVtb3ZpbmcgcGFnZVwiICsgKHBhdGhzLmxlbmd0aCA+IDEgPyBcInNcIiA6IFwiXCIpICsgXCIgXCIgKyBwYXRocy5qb2luKFwiLCBcIik7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IHBhdGhzO1xuICAgICAgdGhpcy5kb1Bvc3QoVXJsSGVscGVycy5qb2luKFwicm1cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cblxuICAgIHByaXZhdGUgZG9HZXQocGF0aCwgcXVlcnksIHN1Y2Nlc3NGbiwgZXJyb3JGbiA9IG51bGwsIGNvbmZpZyA9IG51bGwpIHtcbiAgICAgIHZhciB1cmwgPSBGb3JnZS5jcmVhdGVIdHRwVXJsKHRoaXMucHJvamVjdElkLCBVcmxIZWxwZXJzLmpvaW4odGhpcy5iYXNlVXJsLCBwYXRoKSk7XG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdXJsICs9IFwiJlwiICsgcXVlcnk7XG4gICAgICB9XG4gICAgICBpZiAoIWVycm9yRm4pIHtcbiAgICAgICAgZXJyb3JGbiA9IChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQhIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICB9O1xuXG4gICAgICB9XG4gICAgICBpZiAoIWNvbmZpZykge1xuICAgICAgICBjb25maWcgPSB0aGlzLmNvbmZpZztcbiAgICAgIH1cbiAgICAgIHRoaXMuJGh0dHAuZ2V0KHVybCwgY29uZmlnKS5cbiAgICAgICAgc3VjY2VzcyhzdWNjZXNzRm4pLlxuICAgICAgICBlcnJvcihlcnJvckZuKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGRvUG9zdChwYXRoLCBxdWVyeSwgYm9keSwgc3VjY2Vzc0ZuLCBlcnJvckZuID0gbnVsbCkge1xuICAgICAgdmFyIHVybCA9IEZvcmdlLmNyZWF0ZUh0dHBVcmwodGhpcy5wcm9qZWN0SWQsIFVybEhlbHBlcnMuam9pbih0aGlzLmJhc2VVcmwsIHBhdGgpKTtcbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB1cmwgKz0gXCImXCIgKyBxdWVyeTtcbiAgICAgIH1cbiAgICAgIGlmICghZXJyb3JGbikge1xuICAgICAgICBlcnJvckZuID0gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCEgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgIH1cbiAgICAgIHRoaXMuJGh0dHAucG9zdCh1cmwsIGJvZHksIHRoaXMuY29uZmlnKS5cbiAgICAgICAgc3VjY2VzcyhzdWNjZXNzRm4pLlxuICAgICAgICBlcnJvcihlcnJvckZuKTtcbiAgICB9XG5cblxuICAgIHByaXZhdGUgZG9Qb3N0Rm9ybShwYXRoLCBxdWVyeSwgYm9keSwgc3VjY2Vzc0ZuLCBlcnJvckZuID0gbnVsbCkge1xuICAgICAgdmFyIHVybCA9IEZvcmdlLmNyZWF0ZUh0dHBVcmwodGhpcy5wcm9qZWN0SWQsIFVybEhlbHBlcnMuam9pbih0aGlzLmJhc2VVcmwsIHBhdGgpKTtcbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB1cmwgKz0gXCImXCIgKyBxdWVyeTtcbiAgICAgIH1cbiAgICAgIGlmICghZXJyb3JGbikge1xuICAgICAgICBlcnJvckZuID0gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCEgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgIH1cbiAgICAgIHZhciBjb25maWcgPSBGb3JnZS5jcmVhdGVIdHRwQ29uZmlnKCk7XG4gICAgICBpZiAoIWNvbmZpZy5oZWFkZXJzKSB7XG4gICAgICAgIGNvbmZpZy5oZWFkZXJzID0ge307XG4gICAgICB9XG4gICAgICBjb25maWcuaGVhZGVyc1tcIkNvbnRlbnQtVHlwZVwiXSA9IFwiYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PXV0Zi04XCI7XG5cbiAgICAgIHRoaXMuJGh0dHAucG9zdCh1cmwsIGJvZHksIGNvbmZpZykuXG4gICAgICAgIHN1Y2Nlc3Moc3VjY2Vzc0ZuKS5cbiAgICAgICAgZXJyb3IoZXJyb3JGbik7XG4gICAgfVxuXG5cblxuICAgIHB1YmxpYyBjb21wbGV0ZVBhdGgoYnJhbmNoOnN0cmluZywgY29tcGxldGlvblRleHQ6c3RyaW5nLCBkaXJlY3Rvcmllc09ubHk6Ym9vbGVhbiwgZm4pIHtcbi8qXG4gICAgICByZXR1cm4gdGhpcy5naXQoKS5jb21wbGV0ZVBhdGgoYnJhbmNoLCBjb21wbGV0aW9uVGV4dCwgZGlyZWN0b3JpZXNPbmx5LCBmbik7XG4qL1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZnVsbCBwYXRoIHRvIHVzZSBpbiB0aGUgZ2l0IHJlcG9cbiAgICAgKiBAbWV0aG9kIGdldFBhdGhcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd7XG4gICAgICovXG4gICAgcHVibGljIGdldFBhdGgocGF0aDpzdHJpbmcpIHtcbiAgICAgIHZhciBkaXJlY3RvcnlQcmVmaXggPSB0aGlzLmRpcmVjdG9yeVByZWZpeDtcbiAgICAgIHJldHVybiAoZGlyZWN0b3J5UHJlZml4KSA/IGRpcmVjdG9yeVByZWZpeCArIHBhdGggOiBwYXRoO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRMb2dQYXRoKHBhdGg6c3RyaW5nKSB7XG4gICAgICByZXR1cm4gQ29yZS50cmltTGVhZGluZyh0aGlzLmdldFBhdGgocGF0aCksIFwiL1wiKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgY29udGVudHMgb2YgYSBibG9iUGF0aCBmb3IgYSBnaXZlbiBjb21taXQgb2JqZWN0SWRcbiAgICAgKiBAbWV0aG9kIGdldENvbnRlbnRcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGJsb2JQYXRoXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGdldENvbnRlbnQob2JqZWN0SWQ6c3RyaW5nLCBibG9iUGF0aDpzdHJpbmcsIGZuKSB7XG4vKlxuICAgICAgdmFyIGZ1bGxQYXRoID0gdGhpcy5nZXRMb2dQYXRoKGJsb2JQYXRoKTtcbiAgICAgIHZhciBnaXQgPSB0aGlzLmdpdCgpO1xuICAgICAgaWYgKGdpdCkge1xuICAgICAgICBnaXQuZ2V0Q29udGVudChvYmplY3RJZCwgZnVsbFBhdGgsIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBnaXQ7XG4qL1xuICAgIH1cblxuXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIEpTT04gY29udGVudHMgb2YgdGhlIHBhdGggd2l0aCBvcHRpb25hbCBuYW1lIHdpbGRjYXJkIGFuZCBzZWFyY2hcbiAgICAgKiBAbWV0aG9kIGpzb25DaGlsZENvbnRlbnRzXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVXaWxkY2FyZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzZWFyY2hcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMganNvbkNoaWxkQ29udGVudHMocGF0aDpzdHJpbmcsIG5hbWVXaWxkY2FyZDpzdHJpbmcsIHNlYXJjaDpzdHJpbmcsIGZuKSB7XG4vKlxuICAgICAgdmFyIGZ1bGxQYXRoID0gdGhpcy5nZXRMb2dQYXRoKHBhdGgpO1xuICAgICAgdmFyIGdpdCA9IHRoaXMuZ2l0KCk7XG4gICAgICBpZiAoZ2l0KSB7XG4gICAgICAgIGdpdC5yZWFkSnNvbkNoaWxkQ29udGVudChmdWxsUGF0aCwgbmFtZVdpbGRjYXJkLCBzZWFyY2gsIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBnaXQ7XG4qL1xuICAgIH1cblxuXG4gICAgcHVibGljIGdpdCgpIHtcbi8qXG4gICAgICB2YXIgcmVwb3NpdG9yeSA9IHRoaXMuZmFjdG9yeU1ldGhvZCgpO1xuICAgICAgaWYgKCFyZXBvc2l0b3J5KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTm8gcmVwb3NpdG9yeSB5ZXQhIFRPRE8gd2Ugc2hvdWxkIHVzZSBhIGxvY2FsIGltcGwhXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlcG9zaXRvcnk7XG4qL1xuICAgIH1cbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgdmFyIFRvcExldmVsQ29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuVG9wTGV2ZWxDb250cm9sbGVyXCIsIFsnJHNjb3BlJywgJyRyb3V0ZScsICckcm91dGVQYXJhbXMnLCAoJHNjb3BlLCAkcm91dGUsICRyb3V0ZVBhcmFtcykgPT4ge1xuXG4gIH1dKTtcblxufVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9

angular.module("fabric8-console-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/forge/html/command.html","<div ng-controller=\"Forge.CommandController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n<!--\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n-->\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <h3>{{schema.info.description}}</h3>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"executing\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-info\">executing...\n        <i class=\"fa fa-spinner fa-spin\"></i>\n      </p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response\">\n    <div class=\"col-md-12\">\n      <p ng-show=\"response.message\" ng-class=\"responseClass\"><span class=\"response-message\">{{response.message}}</span></p>\n      <p ng-show=\"response.output\" ng-class=\"responseClass\"><span class=\"response-output\">{{response.output}}</span></p>\n      <p ng-show=\"response.err\" ng-class=\"bg-warning\"><span class=\"response-err\">{{response.err}}</span></p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response && !invalid\">\n    <div class=\"col-md-12\">\n      <a class=\"btn btn-primary\" href=\"{{completedLink}}\">Done</a>\n      <a class=\"btn btn-default\" ng-click=\"response = null\" ng-hide=\"wizardCompleted\">Hide</a>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"validationError\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-danger\">{{validationError}}</p>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched && !wizardCompleted\">\n        <div hawtio-form-2=\"schema\" entity=\'entity\'></div>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\" ng-hide=\"wizardCompleted\">\n    <div class=\"col-md-2\">\n    </div>\n    <div class=\"col-md-2\">\n      <button class=\"btn btn-primary\"\n              title=\"Perform this command\"\n              ng-show=\"fetched\"\n              ng-disabled=\"executing\"\n              ng-click=\"execute()\">\n        Execute\n      </button>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/commands.html","<div class=\"row\" ng-controller=\"Forge.CommandsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\" ng-show=\"commands.length\">\n      <span ng-show=\"!id\">\n        Command: <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                                css-class=\"input-xxlarge\"\n                                placeholder=\"Filter commands...\"\n                                save-as=\"fabric8-forge-command-filter\"></hawtio-filter>\n      </span>\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched\">\n        <div ng-hide=\"commands.length\" class=\"align-center\">\n          <p class=\"alert alert-info\">There are no commands available!</p>\n        </div>\n        <div ng-show=\"commands.length\">\n        </div>\n        <div ng-show=\"mode == \'table\'\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && commands.length && mode != \'table\'\">\n    <div class=\"row\">\n      <ul>\n        <li class=\"no-list command-selector-folder\" ng-repeat=\"folder in commandSelector.folders\"\n            ng-show=\"commandSelector.showFolder(folder)\">\n          <div class=\"expandable\" ng-class=\"commandSelector.isOpen(folder)\">\n            <div title=\"{{folder.name}}\" class=\"title\">\n              <i class=\"expandable-indicator folder\"></i> <span class=\"folder-title\"\n                                                                ng-show=\"folder.name\">{{folder.name}}</span><span\n                    class=\"folder-title\" ng-hide=\"folder.name\">Uncategorized</span>\n            </div>\n            <div class=\"expandable-body\">\n              <ul>\n                <li class=\"no-list command\" ng-repeat=\"command in folder.commands\"\n                    ng-show=\"commandSelector.showCommand(command)\">\n                  <div class=\"inline-block command-selector-name\"\n                       ng-class=\"commandSelector.getSelectedClass(command)\">\n                    <span class=\"contained c-max\">\n                      <a href=\"{{command.$link}}\"\n                         title=\"{{command.description}}\">\n                        <span class=\"command-name\">{{command.$shortName}}</span>\n                      </a>\n                    </span>\n                  </div>\n                </li>\n              </ul>\n            </div>\n          </div>\n        </li>\n      </ul>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/createProject.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <style>\n    .createProjectPage {\n      padding-top: 40px;\n    }\n  </style>\n\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n\n  <div ng-show=\"model.fetched && $runningCDPipeline && (!$gogsLink || !$forgeLink)\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p>Waiting for the <b>CD Pipeline</b> application to startup: &nbsp;&nbsp;<i class=\"fa fa-spinner fa-spin\"></i>\n        </p>\n\n        <ul class=\"pending-pods\">\n          <li class=\"ngCellText\" ng-repeat=\"item in $requiredRCs\">\n            <a ng-href=\"{{item | kubernetesPageLink}}\">\n              <img class=\"app-icon-small\" ng-src=\"{{item.$iconUrl}}\" ng-show=\"item.$iconUrl\">\n              <b>{{item.metadata.name}}</b>\n            </a>\n            <a ng-show=\"item.$podCounters.podsLink\" href=\"{{item.$podCounters.podsLink}}\" title=\"View pods\">\n              <span ng-show=\"item.$podCounters.ready\" class=\"badge badge-success\">{{item.$podCounters.ready}}</span>\n              <span ng-show=\"item.$podCounters.valid\" class=\"badge badge-info\">{{item.$podCounters.valid}}</span>\n              <span ng-show=\"item.$podCounters.waiting\" class=\"badge\">{{item.$podCounters.waiting}}</span>\n              <span ng-show=\"item.$podCounters.error\" class=\"badge badge-warning\">{{item.$podCounters.error}}</span>\n            </a>\n          </li>\n        </ul>\n        <p>Please be patient while the above pods are ready!</p>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && !$runningCDPipeline\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p class=\"text-warning\">You are not running the <b>CD Pipeline</b> application in this workspace.</p>\n\n        <p>To be able to create new projects please run it!</p>\n\n        <p><a href=\"{{$runCDPipelineLink}}\" class=\"btn btn-lg btn-default\">Run the <b>CD Pipeline</b></a></p>\n      </div>\n    </div>\n  </div>\n\n  <div ng-hide=\"model.fetched || !$gogsLink ||!$forgeLink\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && $gogsLink && $forgeLink\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <div class=\"col-md-6\">\n          <p class=\"align-center\">\n            <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/buildConfigEdit/\"\n               title=\"Import an existing project from a git source control repository\">\n              <i class=\"fa fa-plus\"></i> Import Project from Git\n            </a>\n          </p>\n\n          <p class=\"align-center\">\n            Import a project which already exists in git repository\n          </p>\n        </div>\n\n        <div class=\"col-md-6\">\n          <div ng-show=\"sourceSecret\">\n            <p class=\"align-center\">\n              <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n                 title=\"Create a new project in this workspace using a wizard\">\n                <i class=\"fa fa-plus\"></i> Create Java Project using Wizard\n              </a>\n            </p>\n\n            <p class=\"align-center\">\n              This wizard guides you though creating a new Java project from our library of sample projects with the configured\n              <a href=\"{{$workspaceLink}}/forge/secrets\"\n                 title=\"View or change the secret used to create new projects\">\n                source secret\n              </a>\n            </p>\n          </div>\n          <div ng-hide=\"sourceSecret\">\n            <p class=\"align-center\">\n              <a class=\"btn btn-default btn-lg\" href=\"{{$workspaceLink}}/forge/secrets\"\n                 title=\"Setup the secrets so that you can create new projects\">\n                <i class=\"fa fa-pencil-square-o\"></i> Setup Source Secret\n              </a>\n            </p>\n\n            <p class=\"align-center\">\n              Setup a secret so that you can create new projects and git repositories.\n            </p>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/layoutForge.html","<script type=\"text/ng-template\" id=\"idTemplate.html\">\n  <div class=\"ngCellText\">\n    <a href=\"\"\n       title=\"Execute command {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$link}}\">\n      {{row.entity.name}}</a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoTemplate.html\">\n  <div class=\"ngCellText\">\n    <a title=\"View repository {{row.entity.name}}\"\n       ng-href=\"/forge/repos/{{row.entity.name}}\">\n      {{row.entity.name}}\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoActionsTemplate.html\">\n  <div class=\"ngCellText\">\n    <a ng-show=\"row.entity.$openProjectLink\"\n       class=\"btn btn-primary\" target=\"editor\"\n       title=\"Open project {{row.entity.name}} in an editor\"\n       ng-href=\"{{row.entity.$openProjectLink}}\">\n      <i class=\"fa fa-pencil-square\"></i>\n      Open\n    </a>\n    <a ng-show=\"row.entity.html_url\"\n       class=\"btn btn-default\" target=\"browse\"\n       title=\"Browse project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.html_url}}\">\n      <i class=\"fa fa-external-link\"></i>\n      Repository\n    </a>\n    <a ng-show=\"row.entity.$buildsLink\"\n       class=\"btn btn-default\" target=\"builds\"\n       title=\"View builds for this repository {{row.entity.owner.username}}/{{row.entity.name}}\"\n       ng-href=\"{{row.entity.$buildsLink}}\">\n      <i class=\"fa fa-cog\"></i>\n      Builds\n    </a>\n    <a ng-show=\"row.entity.$commandsLink\"\n       class=\"btn btn-default\"\n       title=\"Commands for project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$commandsLink}}\">\n      <i class=\"fa fa-play-circle\"></i>\n      Run...\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"categoryTemplate.html\">\n  <div class=\"ngCellText\">\n    <span class=\"pod-label badge\"\n          class=\"background-light-grey mouse-pointer\">{{row.entity.category}}</span>\n  </div>\n</script>\n\n<div class=\"row\">\n  <div class=\"wiki-icon-view\">\n    <div class=\"row forge-view\" ng-view></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repo.html","<div class=\"row\" ng-controller=\"Forge.RepoController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\"\n              href=\"/forge/repos\"><i class=\"fa fa-list\"></i></a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.$commandsLink\"\n         class=\"btn btn-default pull-right\"\n         title=\"Commands for project {{entity.name}}\"\n         ng-href=\"{{entity.$commandsLink}}\">\n        <i class=\"fa fa-play-circle\"></i>\n        Run...\n      </a>\n      <span class=\"pull-right\" ng-show=\"entity.$buildsLink\">&nbsp;</span>\n      <a ng-show=\"entity.$buildsLink\"\n         class=\"btn btn-primary pull-right\" target=\"builds\"\n         title=\"View builds for this repository {{entity.owner.username}}/{{entity.name}}\"\n         ng-href=\"{{entity.$buildsLink}}\">\n        <i class=\"fa fa-cog\"></i>\n        Builds\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.html_url\"\n         class=\"btn btn-default pull-right\" target=\"browse\"\n         title=\"Browse project {{entity.name}}\"\n         ng-href=\"{{entity.html_url}}\">\n        <i class=\"fa fa-external-link\"></i>\n        Browse\n      </a>\n    </div>\n  </div>\n\n  <div ng-hide=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n  <div ng-show=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <h3 title=\"repository for {{entity.owner.username}}\">\n          <span ng-show=\"entity.owner.username\">\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              <img src=\"{{entity.owner.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"entity.owner.avatar_url\">\n            </a>\n            &nbsp;\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              {{entity.owner.username}}\n            </a>\n             &nbsp;/&nbsp;\n          </span>\n          {{entity.name}}\n        </h3>\n      </div>\n    </div>\n\n    <div class=\"git-clone-tabs\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div class=\"tabbable\">\n            <div value=\"ssh\" class=\"tab-pane\" title=\"SSH\" ng-show=\"entity.ssh_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>ssh</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.ssh_url}}</code>\n                </pre>\n              </div>\n            </div>\n\n            <div value=\"http\" class=\"tab-pane\" title=\"HTTP\" ng-show=\"entity.clone_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>http</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.clone_url}}</code>\n                </pre>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repos.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                     ng-show=\"projects.length\"\n                     css-class=\"input-xxlarge\"\n                     placeholder=\"Filter repositories...\"></hawtio-filter>\n      <!--\n            <span class=\"pull-right\">&nbsp;</span>\n            <button ng-show=\"fetched\"\n                    class=\"btn btn-danger pull-right\"\n                    ng-disabled=\"tableConfig.selectedItems.length == 0\"\n                    ng-click=\"delete(tableConfig.selectedItems)\">\n              <i class=\"fa fa-remove\"></i> Delete\n            </button>\n      -->\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-primary pull-right\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n         ng-show=\"login.loggedIn\"\n         title=\"Create a new project and repository\">\n        <i class=\"fa fa-plus\"></i> Create Project</a>\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\" ng-show=\"login.loggedIn\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n      <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n        <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n        {{login.user}}\n      </div>\n    </div>\n  </div>\n\n\n  <div ng-show=\"!login.authHeader || login.relogin\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n          <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"fetched || !login.authHeader || login.relogin\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && login.authHeader\">\n    <div ng-hide=\"projects.length\" class=\"align-center\">\n      <div class=\"padded-div\">\n        <div class=\"row\">\n          <div class=\"col-md-12\">\n            <p class=\"alert alert-info\">There are no git repositories yet. Please create one!</p>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-show=\"projects.length\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/secrets.html","<div ng-controller=\"Forge.SecretsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row filter-header\" ng-show=\"filteredSecrets.length\">\n    <div class=\"col-md-12\">\n      <button class=\"btn btn-default pull-right\"\n              title=\"Cancel changes to this secret\"\n              ng-click=\"cancel()\">\n        Cancel\n      </button>\n      <span class=\"pull-right\">&nbsp;</span>\n      <button class=\"btn btn-primary pull-right\"\n              title=\"Saves changes to this secret\"\n              ng-disabled=\"!canSave()\"\n              ng-click=\"save()\">\n        Save Changes\n      </button>\n    </div>\n  </div>\n\n\n  <div ng-hide=\"fetched\">\n    <div class=\"row select-table-filter\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n\n  <div ng-show=\"fetched\">\n    <div class=\"row filter-header\">\n      <div class=\"col-md-12\">\n        <p>To be able to edit source code in a repository we need your secret (SSH keys or username &amp; password). The secrets are stored securely in your own\n          <a href=\"{{secretNamespaceLink}}\" title=\"View the namespace for your personal secrets\">personal namespace</a>.</p>\n      </div>\n    </div>\n\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <form name=\"secretForm\" class=\"form-horizontal\">\n          <div class=\"form-group\" ng-hide=\"id\" ng-class=\"{\'has-error\': secretForm.$error.validator || !selectedSecretName}\">\n            <label class=\"col-sm-2 control-label\" for=\"secretName\">\n              Source Editing Secret\n              <a tabindex=\"0\" role=\"button\" data-toggle=\"popover\" data-trigger=\"focus\" data-html=\"true\" title=\"\"\n                 data-content=\"Select the secret used to clone and edit the git repository\" data-placement=\"top\"\n                 data-original-title=\"\">\n                <span class=\"fa fa-info-circle\"></span>\n              </a>\n            </label>\n\n            <div class=\"col-sm-4\">\n              <input type=\"text\" id=\"secretName\" name=\"secretName\" class=\"form-control\" ng-model=\"selectedSecretName\"\n                     required readonly>\n            </div>\n\n            <div ng-show=\"gitUrl\">\n              <label class=\"col-sm-2 control-label\" for=\"gitRepo\">\n                Repository\n                <a tabindex=\"0\" role=\"button\" data-toggle=\"popover\" data-trigger=\"focus\" data-html=\"true\" title=\"\"\n                   data-content=\"The git repository to edit the source code\" data-placement=\"top\"\n                   data-original-title=\"\">\n                  <span class=\"fa fa-info-circle\"></span>\n                </a>\n              </label>\n\n              <div class=\"col-sm-4\">\n                <input type=\"text\" id=\"gitRepo\" name=\"gitRepo\" class=\"form-control\" ng-model=\"gitUrl\" required readonly>\n              </div>\n            </div>\n          </div>\n        </form>\n      </div>\n    </div>\n\n    <div ng-hide=\"filteredSecrets.length\" class=\"align-center\">\n      <div class=\"row select-table-filter\">\n        <div class=\"col-md-12\">\n          <p class=\"alert alert-info\">There are currently no suitable secrets to choose from. Please create one.</p>\n        </div>\n      </div>\n      <div class=\"row\">\n        <div class=\"col-md-12 text-center\">\n          <a class=\"btn btn-primary\" href=\"{{addNewSecretLink}}\"\n             title=\"Create a new secret for editing the git repository for this project\">\n            <i class=\"fa fa-plus\"></i> Create Secret\n          </a>\n        </div>\n      </div>\n    </div>\n    <div ng-show=\"filteredSecrets.length\">\n      <div class=\"row select-table-filter\">\n        <div class=\"col-md-12\">\n          <div class=\" pull-right\">\n            <hawtio-filter ng-show=\"filteredSecrets.length > 1\"\n                           ng-model=\"tableConfig.filterOptions.filterText\"\n                           css-class=\"input-xxlarge\"\n                           placeholder=\"Filter secrets...\"></hawtio-filter>\n\n          </div>\n        </div>\n      </div>\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n      <div class=\"row\">\n        <div class=\"col-md-12 text-center\">\n          <a class=\"btn btn-default\" href=\"{{addNewSecretLink}}\"\n             title=\"Create a new secret for editing the git repository for this project\">\n            <i class=\"fa fa-plus\"></i> Create Secret\n          </a>\n        </div>\n      </div>\n    </div>\n\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/secretsRequired.html","<div ng-controller=\"Forge.SecretsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div>\n    <div class=\"row filter-header\">\n      <div class=\"col-md-2\">\n      </div>\n      <div class=\"col-md-8 text-center\">\n        <div class=\"alert alert-info\">\n          <span class=\"pficon pficon-info\"></span>\n          <strong>To be able to create or edit a project you need to choose or setup a secret to work with the repository for the SSH keys or username &amp; password.</strong>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"row\">\n      <div class=\"col-md-12 text-center\">\n        <a class=\"btn btn-primary btn-lg\" href=\"{{setupSecretsLink}}\"\n           title=\"Setup the secrets so that you can edit this project\">\n          Setup Source Secret\n        </a>\n      </div>\n    </div>\n\n  </div>\n</div>\n");
$templateCache.put("plugins/main/html/about.html","<div ng-controller=\"Main.About\">\n  <p>Version: {{info.version}}</p>\n  <p>Commit ID: {{info.commitId}}</p>\n  <table class=\"table table-striped\">\n    <thead>\n      <tr>\n        <th>\n          Name\n        </th>\n        <th>\n          Version\n        </th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr ng-repeat=\"(key, info) in info.packages\">\n        <td>{{key}}</td>\n        <td>{{info.version || \'--\'}}</td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n");
$templateCache.put("plugins/wiki/exemplar/document.html","<h2>This is a title</h2>\n\n<p>Here are some notes</p>");
$templateCache.put("plugins/wiki/html/camelCanvas.html","<div ng-controller=\"Wiki.CamelController\">\n  <div class=\"camel-canvas-page\" ng-controller=\"Wiki.CamelCanvasController\">\n\n      <ng-include src=\"\'plugins/wiki/html/camelNavBar.html\'\"></ng-include>\n\n      <script type=\"text/ng-template\"\n              id=\"nodeTemplate\">\n        <div class=\"component window\"\n             id=\"{{id}}\"\n             title=\"{{node.tooltip}}\">\n          <div class=\"window-inner {{node.type}}\">\n            <img class=\"nodeIcon\"\n                 title=\"Click and drag to create a connection\"\n                 src=\"{{node.imageUrl}}\">\n          <span class=\"nodeText\"\n                title=\"{{node.label}}\">{{node.label}}</span>\n          </div>\n        </div>\n      </script>\n\n\n      <div class=\"row\">\n          <ul class=\"nav nav-tabs\">\n            <!-- navigation tabs -->\n            <li ng-repeat=\"nav in camelSubLevelTabs\" ng-show=\"isValid(nav)\" ng-class=\"{active : isActive(nav)}\">\n              <a ng-href=\"{{nav.href()}}{{hash}}\" title=\"{{nav.title}}\"\n                data-placement=\"bottom\" ng-bind-html=\"nav.content\"></a></li>\n\n            <!-- controls -->\n            <li class=\"pull-right\">\n              <a href=\'\' title=\"Add new pattern node connecting to this pattern\" ng-click=\"addDialog.open()\"\n                 data-placement=\"bottom\">\n                 <i class=\"icon-plus\"></i> Add</a></li>\n\n            <li class=\"pull-right\">\n              <a href=\'\' title=\"Automatically layout the diagram \" ng-click=\"doLayout()\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-magic\"></i> Layout</a></li>\n\n            <li class=\"pull-right\" style=\"margin-top: 0; margin-bottom: 0;\">\n            </li>\n\n            <!--\n            <li class=\"pull-right\">\n              <a href=\'\' title=\"Edit the properties for the selected node\" ng-disabled=\"!selectedFolder\"\n                 ng-click=\"propertiesDialog.open()\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-edit\"></i> Properties</a></li>\n                -->\n          </ul>\n\n          <div class=\"modal-large\">\n            <div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n              <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n                <div class=\"modal-header\"><h4>Add Node</h4></div>\n                <div class=\"modal-body\">\n                  <tabset>\n                    <tab heading=\"Patterns\">\n                      <div hawtio-tree=\"paletteTree\" hideRoot=\"true\" onSelect=\"onPaletteSelect\"\n                           activateNodes=\"paletteActivations\"></div>\n                    </tab>\n                    <tab heading=\"Endpoints\">\n                      <div hawtio-tree=\"componentTree\" hideRoot=\"true\" onSelect=\"onComponentSelect\"\n                           activateNodes=\"componentActivations\"></div>\n                    </tab>\n                  </tabset>\n                </div>\n                <div class=\"modal-footer\">\n                  <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\"\n                         ng-disabled=\"!selectedPaletteNode && !selectedComponentNode\"\n                         value=\"Add\">\n                  <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n                </div>\n              </form>\n            </div>\n          </div>\n\n\n          <!--\n          <div modal=\"propertiesDialog.show\" close=\"propertiesDialog.close()\" ng-options=\"propertiesDialog.options\">\n            <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"updatePropertiesAndCloseDialog()\">\n              <div class=\"modal-header\"><h4>Properties</h4></div>\n              <div class=\"modal-body\">\n\n                <div ng-show=\"!selectedEndpoint\"> -->\n          <!-- pattern form --> <!--\n                <div simple-form name=\"formEditor\" entity=\'nodeData\' data=\'nodeModel\' schema=\"schema\"\n                     onsubmit=\"updatePropertiesAndCloseDialog\"></div>\n              </div>\n              <div ng-show=\"selectedEndpoint\"> -->\n          <!-- endpoint form -->\n          <!--\n          <div class=\"control-group\">\n            <label class=\"control-label\" for=\"endpointPath\">Endpoint</label>\n\n            <div class=\"controls\">\n              <input id=\"endpointPath\" class=\"col-md-10\" type=\"text\" ng-model=\"endpointPath\" placeholder=\"name\"\n                     typeahead=\"title for title in endpointCompletions($viewValue) | filter:$viewValue\"\n                     typeahead-editable=\'true\'\n                     min-length=\"1\">\n            </div>\n          </div>\n          <div simple-form name=\"formEditor\" entity=\'endpointParameters\' data=\'endpointSchema\'\n               schema=\"schema\"></div>\n        </div>\n\n\n      </div>\n      <div class=\"modal-footer\">\n        <input class=\"btn btn-primary add\" type=\"submit\" ng-click=\"updatePropertiesAndCloseDialog()\" value=\"OK\">\n        <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"propertiesDialog.close()\">Cancel</button>\n      </div>\n    </form>\n  </div>\n  -->\n\n      </div>\n\n      <div class=\"panes\" hawtio-window-height>\n        <div class=\"left-pane\">\n          <div class=\"camel-viewport camel-canvas\">\n            <div style=\"position: relative;\" class=\"canvas\"></div>\n          </div>\n        </div>\n        <div class=\"right-pane\">\n          <div class=\"camel-props\">\n            <div class=\"button-bar\">\n              <div class=\"centered\">\n                <form class=\"form-inline\">\n                  <label>Route: </label>\n                  <select ng-model=\"selectedRouteId\" ng-options=\"routeId for routeId in routeIds\"></select>\n                </form>\n                <div class=\"btn-group\">\n                  <button class=\"btn\"\n                          title=\"{{getDeleteTitle()}}\"\n                          ng-click=\"removeNode()\"\n                          data-placement=\"bottom\">\n                    <i class=\"icon-remove\"></i> Delete {{getDeleteTarget()}}\n                  </button>\n                  <button class=\"btn\"\n                          title=\"Apply any changes to the endpoint properties\"\n                          ng-disabled=\"!isFormDirty()\"\n                          ng-click=\"updateProperties()\">\n                    <i class=\"icon-ok\"></i> Apply\n                  </button>\n                  <!-- TODO Would be good to have this too\n                  <button class=\"btn\"\n                          title=\"Clear any changes to the endpoint properties\"\n                          ng-disabled=\"!isFormDirty()\"\n                          ng-click=\"resetForms()\">\n                    <i class=\"icon-remove\"></i> Cancel</button> -->\n                </div>\n              </div>\n            </div>\n            <div class=\"prop-viewport\">\n\n              <div>\n                <!-- pattern form -->\n                <div ng-show=\"!selectedEndpoint\">\n                  <div hawtio-form-2=\"nodeModel\"\n                       name=\"formEditor\"\n                       entity=\"nodeData\"\n                       data=\"nodeModel\"\n                       schema=\"schema\"\n                       onsubmit=\"updateProperties\"></div>\n                </div>\n\n                <!-- endpoint form -->\n                <div class=\"endpoint-props\" ng-show=\"selectedEndpoint\">\n                  <p>Endpoint</p>\n\n                  <form name=\"endpointForm\">\n                    <div class=\"control-group\">\n                      <label class=\"control-label\" for=\"endpointPath\">URI:</label>\n\n                      <div class=\"controls\">\n                        <input id=\"endpointPath\" class=\"col-md-10\" type=\"text\" ng-model=\"endpointPath\"\n                               placeholder=\"name\"\n                               typeahead=\"title for title in endpointCompletions($viewValue) | filter:$viewValue\"\n                               typeahead-editable=\'true\'\n                               min-length=\"1\">\n                      </div>\n                    </div>\n                  </form>\n\n                  <div simple-form\n                       name=\"formEditor\"\n                       entity=\'endpointParameters\'\n                       data=\'endpointSchema\'\n                       schema=\"schema\"\n                       onsubmit=\"updateProperties\"></div>\n                </div>\n\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n\n      <div hawtio-confirm-dialog=\"switchToTreeView.show\" ok-button-text=\"Yes\" cancel-button-text=\"No\"\n           on-ok=\"doSwitchToTreeView()\" title=\"You have unsaved changes\">\n        <div class=\"dialog-body\">\n          <p>Unsaved changes will be discarded. Do you really want to switch views?</p>\n        </div>\n      </div>\n\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/camelDiagram.html","<div ng-include=\"diagramTemplate\"></div>\n");
$templateCache.put("plugins/wiki/html/camelNavBar.html","<div class=\"wiki source-nav-widget\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"inline-block app-path\" hawtio-breadcrumbs></div>\n  <div class=\"inline-block source-path\">\n    <ol class=\"breadcrumb\">\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n        <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n          <span class=\"contained c-medium\">{{link.name}}</span>\n        </a>\n      </li>\n      <li ng-show=\"objectId\">\n        <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n      </li>\n      <li ng-show=\"objectId\" class=\"active\">\n        <a>{{objectId}}</a>\n      </li>\n    </ol>\n  </div>\n  <ul class=\"pull-right nav nav-tabs\">\n    <!--\n    <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n      <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n    </li>\n    -->\n\n    <!--\n    <li class=\"pull-right\">\n      <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this camel configuration\"\n        data-placement=\"bottom\">\n        <i class=\"icon-edit\"></i> Edit</a></li>\n    <li class=\"pull-right\" ng-show=\"sourceLink()\">\n      -->\n      <li class=\"pull-right\">\n        <a ng-href=\"\" id=\"saveButton\" ng-disabled=\"!modified\" ng-click=\"save(); $event.stopPropagation();\"\n          ng-class=\"{\'nav-primary\' : modified, \'nav-primary-disabled\' : !modified}\"\n          title=\"Saves the Camel document\">\n          <i class=\"icon-save\"></i> Save</a>\n      </li>\n      <!--<li class=\"pull-right\">-->\n        <!--<a href=\"\" id=\"cancelButton\" ng-click=\"cancel()\"-->\n          <!--title=\"Discards any updates\">-->\n          <!--<i class=\"icon-remove\"></i> Cancel</a>-->\n        <!--</li>-->\n\n      <li class=\"pull-right\">\n        <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n          data-placement=\"bottom\">\n          <i class=\"icon-file-alt\"></i> Source</a>\n      </li>\n    </ul>\n</div>\n");
$templateCache.put("plugins/wiki/html/camelProperties.html","<div ng-controller=\"Wiki.CamelController\" class=\"camel-properties-page\">\n\n  <ng-include src=\"\'plugins/wiki/html/camelNavBar.html\'\"></ng-include>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\" ng-include=\"\'plugins/wiki/html/camelSubLevelTabs.html\'\"></div>\n  </div>\n\n  <div class=\"row\">\n    <div id=\"tree-container\" class=\"col-md-3\" ng-controller=\"Camel.TreeController\">\n      <div hawtio-tree=\"camelContextTree\" onselect=\"onNodeSelect\" onDragEnter=\"onNodeDragEnter\" onDrop=\"onNodeDrop\"\n        onRoot=\"onRootTreeNode\"\n        hideRoot=\"true\"></div>\n    </div>\n\n    <div class=\"col-md-9\">\n      <div ng-include=\"propertiesTemplate\"></div>\n    </div>\n  </div>\n\n  <div hawtio-confirm-dialog=\"switchToCanvasView.show\" ok-button-text=\"Yes\" cancel-button-text=\"No\"\n    on-ok=\"doSwitchToCanvasView()\" title=\"You have unsaved changes\">\n    <div class=\"dialog-body\">\n      <p>Unsaved changes will be discarded. Do you really want to switch views?</p>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/camelPropertiesEdit.html","<div simple-form name=\"formEditor\" entity=\'nodeData\' data=\'nodeModel\' schema=\"schema\"></div>\n");
$templateCache.put("plugins/wiki/html/camelSubLevelTabs.html","<ul class=\"nav nav-tabs\">\n\n  <!--\n  <li ng-class=\"{ active : isActive({ id: \'canvas\' }) }\">\n    <a href=\'\' ng-click=\'confirmSwitchToCanvasView()\' title=\"Edit the diagram in a draggy droppy way\"\n        data-placement=\"bottom\">\n        <i class=\"fa fa-icon-picture\"></i> Canvas</a>\n    </li>\n    -->\n\n  <li ng-repeat=\"nav in camelSubLevelTabs\" ng-show=\"isValid(nav)\" ng-class=\"{active : isActive(nav)}\">\n    <a ng-href=\"{{nav.href()}}{{hash}}\" title=\"{{nav.title}}\"\n       data-placement=\"bottom\" ng-bind-html=\"nav.content\"></a></li>\n\n  <li class=\"pull-right\">\n    <a href=\'\' title=\"Add new pattern node connecting to this pattern\" ng-click=\"addNode()\" data-placement=\"bottom\">\n      <i class=\"icon-plus\"></i> Add</a></li>\n\n  <li class=\"pull-right\">\n    <a href=\'\' title=\"Deletes the selected pattern\" ng-disabled=\"!canDelete()\" ng-click=\"removeNode()\" data-placement=\"bottom\">\n      <i class=\"icon-remove\"></i> Delete</a></li>\n\n</ul>\n\n<div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n  <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Add Node</h4></div>\n    <div class=\"modal-body\">\n      <div hawtio-tree=\"paletteTree\" hideRoot=\"true\" onSelect=\"onPaletteSelect\" activateNodes=\"paletteActivations\"></div>\n    </div>\n    <div class=\"modal-footer\">\n      <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\" ng-disabled=\"!selectedPaletteNode\" value=\"Add\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n      </div>\n    </form>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/commit.html","<div ng-controller=\"Wiki.CommitController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\">\n      <a ng-href=\"{{row.entity.fileLink}}\" class=\"file-name text-nowrap\" title=\"{{row.entity.title}}\">\n        <span ng-class=\"row.entity.changeClass\"></span>\n        <span class=\"file-icon\" ng-class=\"row.entity.fileClass\" ng-bind-html=\"row.entity.fileIconHtml\"></span>\n        {{row.entity.path}}\n      </a>\n    </div>\n  </script>\n  <script type=\"text/ng-template\" id=\"viewDiffTemplate.html\">\n    <div class=\"ngCellText\">\n      <a ng-href=\"{{row.entity.$diffLink}}\" ng-show=\"row.entity.$diffLink\" title=\"View the actual changes to this change\">\n        View Diff\n      </a>\n    </div>\n  </script>\n\n  <div ng-hide=\"inDashboard\" class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div ng-hide=\"inDashboard\" class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n          <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n             title=\"The branch to view\">\n            {{branch || \'branch\'}}\n            <span class=\"caret\"></span>\n          </a>\n          <ul class=\"dropdown-menu\">\n            <li ng-repeat=\"otherBranch in branches\">\n              <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n                 ng-hide=\"otherBranch === branch\"\n                 title=\"Switch to the {{otherBranch}} branch\"\n                 data-placement=\"bottom\">\n                {{otherBranch}}</a>\n            </li>\n          </ul>\n        </li>\n        <li ng-repeat=\"link in breadcrumbs\">\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n        <li>\n          <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n        </li>\n        <li title=\"{{commitInfo.shortMessage}}\" class=\"active\">\n          <a class=\"commit-id\">{{commitInfo.commitHashText}}</a>\n        </li>\n        <li class=\"pull-right\">\n        <span class=\"commit-author\">\n          <i class=\"fa fa-user\"></i> {{commitInfo.author}}\n        </span>\n        </li>\n        <li class=\"pull-right\">\n          <span class=\"commit-date\">{{commitInfo.date | date: dateFormat}}</span>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed row\">\n    <div class=\"commit-message\" title=\"{{commitInfo.shortMessage}}\">\n      {{commitInfo.trimmedMessage}}\n    </div>\n  </div>\n\n  <div class=\"row filter-header\">\n    <div class=\"col-md-12\">\n      <hawtio-filter ng-model=\"gridOptions.filterOptions.filterText\"\n                     css-class=\"input-xxlarge\"\n                     placeholder=\"Filter...\"></hawtio-filter>\n\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-click=\"diff()\"\n         title=\"Compare the selected versions of the files to see how they differ\">\n        <i class=\"fa fa-exchange\"></i>\n        Compare\n      </a>\n    </div>\n  </div>\n\n  <div class=\"form-horizontal\">\n    <div class=\"row\">\n      <table class=\"table-condensed table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/commitDetail.html","<div ng-controller=\"Wiki.CommitDetailController\">\n  <div class=\"row\">\n    <div class=\"wiki source-nav-widget\">\n      <div class=\"inline-block app-path\" hawtio-breadcrumbs></div>\n      <div class=\"inline-block source-path\">\n        <ol class=\"breadcrumb\">\n          <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n            <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n              <span class=\"contained c-medium\">{{link.name}}</span>\n            </a>\n          </li>\n          <li class=\"\">\n            <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n          </li>\n          <li class=\"active\">\n            <a title=\"{{commitDetail.commit_info.sha}}\">{{commitDetail.commit_info.sha | limitTo:7}}</a>\n          </li>\n        </ol>\n      </div>\n\n\n      <!--\n              <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n                <a class=\"btn\" href=\"\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-click=\"diff()\"\n                  title=\"Compare the selected versions of the files to see how they differ\">\n                  <i class=\"fa fa-exchange\"></i> Compare\n                </a>\n              </li>\n              <li class=\"pull-right\">\n                <a class=\"btn\" href=\"\" ng-disabled=\"!canRevert()\" ng-click=\"revert()\"\n                  title=\"Revert to this version of the file\" hawtio-show object-name=\"{{gitMBean}}\"\n                  method-name=\"revertTo\">\n                  <i class=\"fa fa-exchange\"></i> Revert\n                </a>\n              </li>\n      -->\n    </div>\n  </div>\n\n  <!--\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"control-group\">\n          <input class=\"col-md-12 search-query\" type=\"text\" ng-model=\"filterText\"\n                 placeholder=\"search\">\n        </div>\n      </div>\n    </div>\n  -->\n\n  <div class=\"row\"  ng-show=\"commit\">\n    <div class=\"col-md-12\">\n      <div class=\"commit-summary-panel\">\n        <p class=\"commit-history-message bg-info\">{{commit.short_message}}</p>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"row\"  ng-show=\"commit\">\n    <div class=\"col-md-12\">\n      <table class=\"commit-table\">\n        <tr class=\"commit-row\">\n          <td class=\"commit-avatar\" title=\"{{commit.name}}\">\n            <img ng-show=\"commit.avatar_url\" src=\"{{commit.avatar_url}}\"/>\n          </td>\n          <td>\n            <p class=\"commit-details text-nowrap\">\n              <span class=\"commit-history-author\">{{commit.author}}</span>\n              <span class=\"\"> committed </span>\n              <span class=\"commit-date\" title=\"{{commit.$date | date:\'EEE, MMM d, yyyy : HH:mm:ss Z\'}}\">{{commit.$date.relative()}}</span>\n            </p>\n          </td>\n          <td>\n            commit\n            <span class=\"commit-sha\">{{commit.sha}}</span>\n        </tr>\n      </table>\n    </div>\n  </div>\n\n\n  <div ng-repeat=\"diff in commitDetail.diffs | filter:filterText track by $index\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"diff-panel\">\n          <div class=\"diff-filename\">\n            <a href=\"{{diff.$viewLink}}\">{{diff.new_path}}</a>\n          </div>\n          <div class=\"diff-delta\">\n            <textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"diff.diff\"></textarea>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/configuration.html","<div ng-hide=\"inDashboard\" class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n        <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n           title=\"The branch to view\">\n          {{branch || \'branch\'}}\n          <span class=\"caret\"></span>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-repeat=\"otherBranch in branches\">\n            <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n               ng-hide=\"otherBranch === branch\"\n               title=\"Switch to the {{otherBranch}} branch\"\n               data-placement=\"bottom\">\n              {{otherBranch}}</a>\n          </li>\n        </ul>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\">\n        <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n      </li>\n      <li class=\"ng-scope\">\n        <a ng-href=\"{{startLink}}/configurations/{{pageId}}\">configuration</a>\n      </li>\n      <li class=\"ng-scope active\">\n        <a>pid</a>\n      </li>\n    </ul>\n  </div>\n</div>\n<div class=\"wiki-fixed\">\n  <div class=\"controller-section\" ng-controller=\"Osgi.PidController\">\n    <div ng-include src=\"\'plugins/osgi/html/pid-details.html\'\"></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/configurations.html","<div ng-hide=\"inDashboard\" class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n        <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n           title=\"The branch to view\">\n          {{branch || \'branch\'}}\n          <span class=\"caret\"></span>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-repeat=\"otherBranch in branches\">\n            <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n               ng-hide=\"otherBranch === branch\"\n               title=\"Switch to the {{otherBranch}} branch\"\n               data-placement=\"bottom\">\n              {{otherBranch}}</a>\n          </li>\n        </ul>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\">\n        <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n      </li>\n      <li class=\"ng-scope active\">\n        <a>configuration</a>\n      </li>\n    </ul>\n  </div>\n</div>\n\n<div class=\"wiki-fixed\">\n  <div ng-include src=\"\'plugins/osgi/html/configurations.html\'\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/create.html","<div class=\"row\" ng-controller=\"Wiki.CreateController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <form name=\"createForm\"\n            novalidate\n            class=\"form-horizontal no-bottom-margin\"\n            ng-submit=\"addAndCloseDialog(newDocumentName)\">\n        <fieldset>\n\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <h4>Create Document</h4>\n            </div>\n          </div>\n\n          <div class=\"row\">\n            <div class=\"col-md-6\">\n              <treecontrol class=\"tree-classic\"\n                 tree-model=\"createDocumentTree\"\n                 options=\"treeOptions\"\n                 on-selection=\"onCreateDocumentSelect(node)\">\n                 {{node.name}}\n              </treecontrol>\n              <!--\n              <div hawtio-tree=\"createDocumentTree\"\n                     hideRoot=\"true\"\n                     onSelect=\"onCreateDocumentSelect\"\n                     activateNodes=\"createDocumentTreeActivations\"></div>\n-->\n            </div>\n            <div class=\"col-md-6\">\n              <div class=\"row\">\n                <div class=\"well\">\n                  {{selectedCreateDocumentTemplate.tooltip}}\n                </div>\n              </div>\n              <div class=\"row\">\n                <div ng-show=\"fileExists.exists\" class=\"alert\">\n                  Please choose a different name as <b>{{fileExists.name}}</b> already exists\n                </div>\n                <div ng-show=\"fileExtensionInvalid\" class=\"alert\">\n                  {{fileExtensionInvalid}}\n                </div>\n                <div ng-show=\"!createForm.$valid\" class=\"alert\">\n                  {{selectedCreateDocumentTemplateInvalid}}\n                </div>\n\n                <div class=\"form-group\">\n                  <label class=\"col-sm-2 control-label\" for=\"fileName\">Name: </label>\n                  <div class=\"col-sm-10\">\n                    <input name=\"fileName\" id=\"fileName\"\n                           class=\"form-control\"\n                           type=\"text\"\n                           ng-pattern=\"selectedCreateDocumentTemplateRegex\"\n                           ng-model=\"newDocumentName\"\n                           placeholder=\"{{selectedCreateDocumentTemplate.exemplar}}\">\n                  </div>\n                </div>\n              </div>\n              <div class=\"row\">\n                <div simple-form data=\"formSchema\" entity=\"formData\" onSubmit=\"generate()\"></div>\n              </div>\n              <div class=\"row\">\n                <input class=\"btn btn-primary add pull-right\"\n                       type=\"submit\"\n                       ng-disabled=\"!selectedCreateDocumentTemplate.exemplar || !createForm.$valid\"\n                       value=\"Create\">\n                <span class=\"pull-right\">&nbsp;</span>\n                <button class=\"btn btn-warning cancel pull-right\" type=\"button\" ng-click=\"cancel()\">Cancel</button>\n              </div>\n            </div>\n            <div class=\"col-md-2\">\n            </div>\n          </div>\n        </fieldset>\n      </form>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/createPage.html","<div ng-controller=\"Wiki.EditController\">\n  <div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n\n    <div class=\"wiki logbar-container\">\n\n      <ul class=\"connected nav nav-tabs\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">\n            {{link.name}}\n          </a>\n        </li>\n\n        <li class=\"pull-right\">\n\n          <a href=\"\" id=\"cancelButton\" ng-click=\"cancel()\"\n                  class=\"pull-right\"\n                  title=\"Discards any updates\">\n            <i class=\"fa fa-remove\"></i> Cancel\n          </a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a href=\"\" id=\"saveButton\" ng-show=\"isValid()\" ng-click=\"create()\"\n                  class=\"pull-right\"\n                  title=\"Creates this page and saves it in the wiki\">\n            <i class=\"fa fa-file-o\"></i> Create\n          </a>\n        </li>\n\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"control-group\">\n      <input type=\"text\" ng-model=\"fileName\" placeholder=\"File name\" class=\"col-md-12\"/>\n    </div>\n    <div class=\"control-group\">\n      <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/dozerMappings.html","<div class=\"wiki-fixed\" ng-controller=\"Wiki.DozerMappingsController\">\n  <div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs connected\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n\n        <!--\n                <li class=\"pull-right\">\n                  <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this camel configuration\"\n                     data-placement=\"bottom\">\n                    <i class=\"fa fa-edit\"></i> Edit</a></li>\n                <li class=\"pull-right\" ng-show=\"sourceLink()\">\n        -->\n        <li class=\"pull-right\">\n          <a href=\"\" id=\"saveButton\" ng-disabled=\"!isValid()\" ng-click=\"save()\"\n             ng-class=\"{\'nav-primary\' : modified}\"\n             title=\"Saves the Mappings document\">\n            <i class=\"fa fa-save\"></i> Save</a>\n        </li>\n        <li class=\"pull-right\">\n          <a href=\"\" id=\"cancelButton\" ng-click=\"cancel()\"\n             title=\"Discards any updates\">\n            <i class=\"fa fa-remove\"></i> Cancel</a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-file-o\"></i> Source</a>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"tabbable hawtio-form-tabs\" ng-model=\"tab\" ng-hide=\"missingContainer\">\n\n    <div class=\"tab-pane\" title=\"Mappings\">\n\n      <div class=\"row\">\n        <div class=\"col-md-12 centered spacer\">\n          <select class=\"no-bottom-margin\" ng-model=\"selectedMapping\" ng-options=\"m.map_id for m in mappings\"></select>\n          <button class=\"btn\"\n                  ng-click=\"addMapping()\"\n                  title=\"Add mapping\">\n            <i class=\"fa fa-plus\"></i>\n          </button>\n          <button class=\"btn\"\n                  ng-click=\"deleteDialog = true\"\n                  title=\"Delete mapping\">\n            <i class=\"fa fa-minus\"></i>\n          </button>\n          &nbsp;\n          &nbsp;\n          <label class=\"inline-block\" for=\"map_id\">Map ID: </label>\n          <input id=\"map_id\" type=\"text\" class=\"input-xxlarge no-bottom-margin\" ng-model=\"selectedMapping.map_id\">\n        </div>\n      </div>\n\n      <div class=\"row\">\n        <!-- \"From\" class header -->\n        <div class=\"col-md-5\">\n          <div class=\"row\">\n            <input type=\"text\" class=\"col-md-12\"\n                   ng-model=\"aName\"\n                   typeahead=\"title for title in classNames($viewValue) | filter:$viewValue\"\n                   typeahead-editable=\"true\" title=\"Java classname for class \'A\'\"\n                   placeholder=\"Java classname for class \'A\'\">\n          </div>\n          <div class=\"row\" ng-show=\"selectedMapping.class_a.error\">\n            <div class=\"alert alert-error\">\n              <div class=\"expandable closed\">\n                <div class=\"title\">\n                  <i class=\"expandable-indicator\"></i> Failed to load properties for {{selectedMapping.class_a.value}} due to {{selectedMapping.class_a.error.type}}\n                </div>\n                <div class=\"expandable-body well\">\n                  <div ng-bind-html-unsafe=\"formatStackTrace(selectedMapping.class_a.error.stackTrace)\"></div>\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"col-md-2 centered\">\n          <button class=\"btn\" ng-click=\"doReload()\" ng-disabled=\"disableReload()\"><i class=\"fa fa-refresh\"></i> Reload</button>\n        </div>\n\n        <!-- \"To\" class header -->\n        <div class=\"col-md-5\">\n          <div class=\"row\">\n            <input type=\"text\" class=\"col-md-12\"\n                   ng-model=\"bName\"\n                   typeahead=\"title for title in classNames($viewValue) | filter:$viewValue\"\n                   typeahead-editable=\"true\" title=\"Java classname for class \'B\'\"\n                   placeholder=\"Java classname for class \'B\'\">\n          </div>\n          <div class=\"row\" ng-show=\"selectedMapping.class_b.error\">\n            <div class=\"alert alert-error\">\n              <div class=\"expandable closed\">\n                <div class=\"title\">\n                  <i class=\"expandable-indicator\"></i> Failed to load properties for {{selectedMapping.class_b.value}} due to {{selectedMapping.class_b.error.type}}\n                </div>\n                <div class=\"expandable-body well\">\n                  <div ng-bind-html-unsafe=\"formatStackTrace(selectedMapping.class_b.error.stackTrace)\"></div>\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n      </div>\n\n      <script type=\"text/ng-template\" id=\"property.html\">\n        <span class=\"jsplumb-node dozer-mapping-node\"\n              id=\"{{field.id}}\"\n              anchors=\"{{field.anchor}}\"\n              field-path=\"{{field.path}}\">\n          <strong>{{field.displayName}}</strong> : <span class=\"typeName\">{{field.typeName}}</span>\n        </span>\n        <ul>\n          <li ng-repeat=\"field in field.properties\"\n              ng-include=\"\'property.html\'\"></li>\n        </ul>\n      </script>\n\n\n      <script type=\"text/ng-template\" id=\"pageTemplate.html\">\n        <div hawtio-jsplumb draggable=\"false\" layout=\"false\" timeout=\"500\">\n\n          <!-- \"from\" class -->\n          <div class=\"col-md-6\">\n            <div class=\"row\" ng-hide=\"selectedMapping.class_a.error\">\n              <ul class=\"dozer-mappings from\">\n                <li ng-repeat=\"field in selectedMapping.class_a.properties\"\n                    ng-include=\"\'property.html\'\"></li>\n              </ul>\n            </div>\n          </div>\n\n\n          <!-- \"to\" class -->\n          <div class=\"col-md-6\">\n            <div class=\"row\" ng-hide=\"selectedMapping.class_b.error\">\n              <ul class=\"dozer-mappings to\">\n                <li ng-repeat=\"field in selectedMapping.class_b.properties\"\n                    ng-include=\"\'property.html\'\"></li>\n              </ul>\n            </div>\n          </div>\n        </div>\n      </script>\n      <div class=\"row\" compile=\"main\"></div>\n\n    </div>\n\n    <div class=\"tab-pane\" title=\"Tree\">\n\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <ul class=\"nav nav-pills\">\n            <li>\n              <a href=\'\' title=\"Add a new mapping between two classes\" ng-click=\"addMapping()\" data-placement=\"bottom\">\n                <i class=\"fa fa-plus\"></i> Class</a></li>\n            <li>\n              <a href=\'\' title=\"Add new mappings between fields in these classes\" ng-disable=\"!selectedMapping\" ng-click=\"addField()\" data-placement=\"bottom\">\n                <i class=\"fa fa-plus\"></i> Field</a></li>\n            <li>\n              <a href=\'\' title=\"Deletes the selected item\" ng-disabled=\"!canDelete()\" ng-click=\"deleteDialog = true\" data-placement=\"bottom\">\n                <i class=\"fa fa-remove\"></i> Delete</a></li>\n          </ul>\n        </div>\n      </div>\n\n      <div class=\"row\">\n        <div id=\"tree-container\" class=\"col-md-4\">\n          <div hawtio-tree=\"mappingTree\" onselect=\"onNodeSelect\" onDragEnter=\"onNodeDragEnter\" onDrop=\"onNodeDrop\"\n               onRoot=\"onRootTreeNode\"\n               hideRoot=\"true\"></div>\n        </div>\n\n        <div class=\"col-md-8\">\n          <div ng-include=\"propertiesTemplate\"></div>\n        </div>\n      </div>\n\n      <div hawtio-confirm-dialog=\"deleteDialog\"\n           ok-button-text=\"Delete\"\n           on-ok=\"removeNode()\">\n        <div class=\"dialog-body\">\n          <p>You are about to delete the selected {{selectedDescription}}\n          </p>\n          <p>This operation cannot be undone so please be careful.</p>\n        </div>\n      </div>\n\n      <div class=\"modal-large\">\n        <div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n          <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n            <div class=\"modal-header\"><h4>Add Fields</h4></div>\n            <div class=\"modal-body\">\n              <table class=\"\">\n                <tr>\n                  <th>From</th>\n                  <th></th>\n                  <th>To</th>\n                  <th>Exclude</th>\n                </tr>\n                <tr ng-repeat=\"unmapped in unmappedFields\">\n                  <td>\n                    {{unmapped.fromField}}\n                  </td>\n                  <td>-></td>\n                  <td>\n                    <input type=\"text\" ng-model=\"unmapped.toField\" ng-change=\"onUnmappedFieldChange(unmapped)\"\n                           typeahead=\"title for title in toFieldNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'\n                           title=\"The field to map to\"/>\n                  </td>\n                  <td>\n                    <input type=\"checkbox\" ng-model=\"unmapped.exclude\" ng-click=\"onUnmappedFieldChange(unmapped)\"\n                           title=\"Whether or not the field should be excluded\"/>\n                  </td>\n                </tr>\n              </table>\n            </div>\n            <div class=\"modal-footer\">\n              <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\" ng-disabled=\"!unmappedFieldsHasValid\"\n                     value=\"Add\">\n              <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n            </div>\n          </form>\n        </div>\n      </div>\n    </div>\n\n  </div>\n\n  <div class=\"jumbotron\" ng-show=\"missingContainer\">\n    <p>You cannot edit the dozer mapping file as there is no container running for the profile <b>{{profileId}}</b>.</p>\n\n    <p>\n      <a class=\"btn btn-primary btn-lg\"\n         href=\"#/fabric/containers/createContainer?profileIds={{profileId}}&versionId={{versionId}}\">\n        Create a container for: <strong>{{profileId}}</strong>\n      </a>\n    </p>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/dozerPropertiesEdit.html","<div simple-form name=\"formEditor\" entity=\'dozerEntity\' data=\'nodeModel\' schema=\"schema\"></div>\n");
$templateCache.put("plugins/wiki/html/editPage.html","<div ng-controller=\"Wiki.EditController\">\n\n  <div class=\"inline-block app-path\" hawtio-breadcrumbs></div>\n  <div class=\"inline-block source-path\" ng-controller=\"Wiki.NavBarController\">\n    <ol class=\"breadcrumb\">\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n        <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n      </li>\n\n    </ol>\n  </div>\n\n  <ul class=\"pull-right nav nav-tabs\">\n    <li class=\"pull-right\">\n      <a id=\"saveButton\"\n         ng-disabled=\"canSave()\"\n         ng-click=\"save()\"\n         title=\"Saves the updated wiki page\">\n        <i class=\"fa fa-save\"></i> Save</a>\n    </li>\n    <li class=\"pull-right\">\n      <a id=\"cancelButton\"\n         ng-click=\"cancel()\"\n         title=\"Discards any updates\">\n        <i class=\"fa fa-remove\"></i> Cancel</a>\n    </li>\n  </ul>\n\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"control-group editor-autoresize\">\n      <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/formEdit.html","<div simple-form name=\"formEditor\" entity=\'formEntity\' data=\'formDefinition\'></div>\n");
$templateCache.put("plugins/wiki/html/formTable.html","<div ng-controller=\"Wiki.FormTableController\">\n  <div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-edit\"></i> Edit</a></li>\n        <li class=\"pull-right\">\n          <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-comments-alt\"></i> History</a></li>\n        <li class=\"pull-right\">\n          <a ng-href=\"{{createLink()}}{{hash}}\" title=\"Create new page\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-plus\"></i> Create</a></li>\n        <li class=\"pull-right\" ng-show=\"sourceLink()\">\n          <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-file-o\"></i> Source</a></li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed row\">\n    <input class=\"search-query col-md-12\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n           placeholder=\"Filter...\">\n  </div>\n\n  <div class=\"form-horizontal\">\n    <div class=\"row\">\n      <div ng-include=\"tableView\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/formTableDatatable.html","<div class=\"gridStyle\" hawtio-datatable=\"gridOptions\"></div>\n");
$templateCache.put("plugins/wiki/html/formView.html","<div simple-form name=\"formViewer\" mode=\'view\' entity=\'formEntity\' data=\'formDefinition\'></div>\n");
$templateCache.put("plugins/wiki/html/gitPreferences.html","<div title=\"Git\" ng-controller=\"Wiki.GitPreferences\">\n  <div hawtio-form-2=\"config\" entity=\"entity\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/history.html","<div ng-controller=\"Wiki.HistoryController\">\n  <div class=\"row\">\n    <div class=\"wiki source-nav-widget\">\n      <div class=\"inline-block app-path\" hawtio-breadcrumbs></div>\n      <div class=\"inline-block source-path\">\n        <ol class=\"breadcrumb\">\n          <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n            <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n              <span class=\"contained c-medium\">{{link.name}}</span>\n            </a>\n          </li>\n          <li class=\"active\">\n            <a href=\"\">History</a>\n          </li>\n        </ol>\n      </div>\n      <ul class=\"pull-right nav nav-tabs\">\n        <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n          <a class=\"btn\" href=\"\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-click=\"diff()\"\n            title=\"Compare the selected versions of the files to see how they differ\">\n            <i class=\"fa fa-exchange\"></i> Compare\n          </a>\n        </li>\n        <li class=\"pull-right\">\n          <a class=\"btn\" href=\"\" ng-disabled=\"!canRevert()\" ng-click=\"revert()\"\n            title=\"Revert to this version of the file\" hawtio-show object-name=\"{{gitMBean}}\"\n            method-name=\"revertTo\">\n            <i class=\"fa fa-exchange\"></i> Revert\n          </a>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div class=\"control-group\">\n        <input class=\"col-md-12 search-query\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n               placeholder=\"search\">\n      </div>\n    </div>\n  </div>\n\n  <div commit-history-panel></div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/historyPanel.html","<div ng-controller=\"Wiki.HistoryController\">\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <table class=\"commit-table\">\n        <tr class=\"commit-row\" ng-repeat=\"commit in logs | filter:filterTemplates track by $index\">\n          <td class=\"commit-avatar\" title=\"{{commit.name}}\">\n              <img ng-show=\"commit.avatar_url\" src=\"{{commit.avatar_url}}\"/>\n            </div>\n          </td>\n          <td>\n            <p class=\"commit-history-message\">{{commit.short_message}}</p>\n\n            <p class=\"commit-details text-nowrap\">\n              <span class=\"commit-history-author\">{{commit.author}}</span>\n              <span class=\"\"> committed </span>\n              <span class=\"commit-date\" title=\"{{commit.$date | date:\'EEE, MMM d, yyyy : HH:mm:ss Z\'}}\">{{commit.$date.relative()}}</span>\n            </p>\n          </td>\n          <td class=\"commit-links\">\n            <a class=\"text-nowrap btn\" ng-href=\"{{commit.commitLink}}{{hash}}\" title=\"{{commit.sha}}\">\n              {{commit.sha | limitTo:7}}\n              <i class=\"fa fa-arrow-circle-right\"></i></a>\n          </td>\n        </tr>\n      </table>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/layoutWiki.html","<div class=\"row\" ng-controller=\"Wiki.TopLevelController\">\n  <div ng-view></div>\n</div>\n\n");
$templateCache.put("plugins/wiki/html/overviewDashboard.html","<div ng-controller=\"Wiki.OverviewDashboard\">\n  <div class=\"gridster\">\n    <ul id=\"widgets\" hawtio-dashboard></ul>\n  </div>\n</div>\n\n");
$templateCache.put("plugins/wiki/html/projectCommitsPanel.html","<div ng-controller=\"Wiki.HistoryController\">\n  <div ng-show=\"logs.length\">\n    <!--\n    <div class=\"row\">\n      <h4 class=\"project-overview-title\"><a ng-href=\"{{$projectLink}}/wiki/history//\">Commits</a></h4>\n    </div>\n    -->\n    <div commit-history-panel></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/sourceEdit.html","<textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"entity.source\"></textarea>\n");
$templateCache.put("plugins/wiki/html/sourceView.html","<textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"source\"></textarea>\n");
$templateCache.put("plugins/wiki/html/viewBook.html","<div ng-controller=\"Wiki.ViewController\">\n\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.length}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              ng-bind-html-unsafe=\"fileIconHtml(row)\">\n\n              </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"fa fa-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n\n  </script>\n\n  <ng-include src=\"\'plugins/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"row\">\n      <div class=\"tocify\" wiki-href-adjuster>\n        <!-- TODO we maybe want a more flexible way to find the links to include than the current link-filter -->\n        <div hawtio-toc-display get-contents=\"getContents(filename, cb)\"\n             html=\"html\" link-filter=\"[file-extension]\">\n        </div>\n      </div>\n      <div class=\"toc-content\" id=\"toc-content\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/viewNavBar.html","<div ng-hide=\"inDashboard\" class=\"wiki source-nav-widget\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"inline-block app-path\" hawtio-breadcrumbs></div>\n  <div class=\"inline-block source-path\">\n    <ol class=\"breadcrumb\">\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n        <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n          <span class=\"contained c-medium\">{{link.name}}</span>\n        </a>\n      </li>\n      <li ng-show=\"objectId\">\n        <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n      </li>\n      <li ng-show=\"objectId\" class=\"active\">\n        <a>{{objectId}}</a>\n      </li>\n    </ol>\n  </div>\n  <ul class=\"pull-right nav nav-tabs\">\n\n    <li class=\"pull-right dropdown\">\n      <a href=\"\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">\n        <i class=\"fa fa-ellipsis-v\"></i>\n      </a>\n      <ul class=\"dropdown-menu\">\n        <li ng-show=\"sourceLink()\">\n          <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n            data-placement=\"bottom\">\n            <i class=\"fa fa-file-o\"></i> Source</a>\n        </li>\n        <li>\n          <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n            data-placement=\"bottom\">\n            <i class=\"fa fa-comments-alt\"></i> History</a>\n        </li>\n        <!--\n        <li class=\"divider\">\n        </li>\n        -->\n        <li ng-hide=\"gridOptions.selectedItems.length !== 1\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n          <a ng-click=\"openRenameDialog()\"\n            title=\"Rename the selected document\"\n            data-placement=\"bottom\">\n            <i class=\"fa fa-adjust\"></i> Rename</a>\n        </li>\n        <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n          <a ng-click=\"openMoveDialog()\"\n            title=\"move the selected documents to a new folder\"\n            data-placement=\"bottom\">\n            <i class=\"fa fa-move\"></i> Move</a>\n        </li>\n        <!--\n        <li class=\"divider\">\n        </li>\n        -->\n        <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"remove\">\n          <a ng-click=\"openDeleteDialog()\"\n            title=\"Delete the selected document(s)\"\n            data-placement=\"bottom\">\n            <i class=\"fa fa-remove\"></i> Delete</a>\n        </li>\n        <li class=\"divider\" ng-show=\"childActions.length\">\n        </li>\n        <li ng-repeat=\"childAction in childActions\">\n          <a ng-click=\"childAction.doAction()\"\n            title=\"{{childAction.title}}\"\n            data-placement=\"bottom\">\n            <i class=\"{{childAction.icon}}\"></i> {{childAction.name}}</a>\n        </li>\n      </ul>\n    </li>\n    <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n      <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n        data-placement=\"bottom\">\n        <i class=\"fa fa-edit\"></i> Edit</a>\n    </li>\n    <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n      <a ng-href=\"{{createLink()}}{{hash}}\"\n        title=\"Create new page\"\n        data-placement=\"bottom\">\n        <i class=\"fa fa-plus\"></i> Create</a>\n    </li>\n\n    <li class=\"pull-right branch-menu\" ng-show=\"branches.length || branch\">\n      <div hawtio-drop-down=\"branchMenuConfig\"></div>\n    </li>\n\n    <li class=\"pull-right view-style\">\n      <div class=\"btn-group\" \n        ng-hide=\"!children || profile\">\n        <a class=\"btn btn-sm\"\n          ng-disabled=\"mode == ViewMode.List\"\n          href=\"\" \n          ng-click=\"setViewMode(ViewMode.List)\">\n          <i class=\"fa fa-list\"></i></a>\n        <a class=\"btn btn-sm\" \n          ng-disabled=\"mode == ViewMode.Icon\"\n          href=\"\" \n          ng-click=\"setViewMode(ViewMode.Icon)\">\n          <i class=\"fa fa-th-large\"></i></a>\n      </div>\n    </li>\n<!--\n      <li class=\"pull-right\">\n        <a href=\"\" ng-hide=\"children || profile\" title=\"Add to dashboard\" ng-href=\"{{createDashboardLink()}}\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-share\"></i>\n        </a>\n      </li>\n-->\n    </ul>\n</div>\n\n\n");
$templateCache.put("plugins/wiki/html/viewPage.html","<div ng-controller=\"Wiki.ViewController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.size}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\" hawtio-file-drop=\"{{row.entity.fileName}}\" download-url=\"{{row.entity.downloadURL}}\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              compile=\"fileIconHtml(row)\">\n        </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"fa fa-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"imageTemplate.html\">\n    <img src=\"{{imageURL}}\">\n  </script>\n\n  <ng-include src=\"\'plugins/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <!-- Icon View -->\n  <div ng-show=\"mode == ViewMode.Icon\" class=\"wiki-fixed\">\n    <div ng-hide=\"!showAppHeader\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div kubernetes-json=\"kubernetesJson\"></div>\n        </div>\n      </div>\n    </div>\n    <div class=\"row\" ng-show=\"html && children\">\n      <div class=\"col-md-12 wiki-icon-view-header\">\n        <h5>Directories and Files</h5>\n      </div>\n    </div>\n    <div class=\"row\" ng-hide=\"!directory\">\n      <div class=\"col-md-12\" ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-icon-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"column-box mouse-pointer well\"\n               ng-repeat=\"child in children track by $index\"\n               ng-class=\"isInGroup(gridOptions.selectedItems, child, \'selected\', \'\')\"\n               ng-click=\"toggleSelectionFromGroup(gridOptions.selectedItems, child)\">\n            <div class=\"row\">\n              <div class=\"col-md-2\" hawtio-file-drop=\"{{child.fileName}}\" download-url=\"{{child.downloadURL}}\">\n                  <span class=\"app-logo\" ng-class=\"fileClass(child)\" compile=\"fileIconHtml(child)\"></span>\n              </div>\n              <div class=\"col-md-10\">\n                <h3>\n                  <a href=\"{{childLink(child)}}\">{{child.displayName || child.name}}</a>\n                </h3>\n              </div>\n            </div>\n            <div class=\"row\" ng-show=\"child.summary\">\n              <div class=\"col-md-12\">\n                <p compile=\"marked(child.summary)\"></p>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n      <div class=\"row\" style=\"margin-left: 10px\">\n        <div class=\"col-md-12\">\n          <div compile=\"html\"></div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end Icon view -->\n\n  <!-- start List view -->\n  <div ng-show=\"mode == ViewMode.List\" class=\"wiki-fixed\">\n    <hawtio-pane position=\"left\" width=\"300\">\n      <div ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-list-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"wiki-grid\" hawtio-list=\"gridOptions\"></div>\n        </div>\n      </div>\n    </hawtio-pane>\n    <div class=\"row\">\n      <div ng-class=\"col-md-12\">\n        <div ng-hide=\"!showProfileHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div fabric-profile-details version-id=\"versionId\" profile-id=\"profileId\"></div>\n              <p></p>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!showAppHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div kubernetes-json=\"kubernetesJson\" children=\"children\"></div>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n          <div class=\"row\" style=\"margin-left: 10px\">\n            <div class=\"col-md-12\">\n              <div compile=\"html\"></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end List view -->\n  <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/deleteDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"deleteAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Delete Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <p>You are about to delete\n          <ng-pluralize count=\"gridOptions.selectedItems.length\"\n                        when=\"{\'1\': \'this document!\', \'other\': \'these {} documents!\'}\">\n          </ng-pluralize>\n        </p>\n\n        <div ng-bind-html-unsafe=\"selectedFileHtml\"></div>\n        <p class=\"alert alert-danger\" ng-show=\"warning\" ng-bind-html-unsafe=\"warning\">\n        </p>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             value=\"Delete\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/moveDialog.html","<div>\n    <form class=\"form-horizontal\" ng-submit=\"moveAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Move Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"moveFolder\">Folder</label>\n\n        <div class=\"controls\">\n          <input type=\"text\" id=\"moveFolder\" ng-model=\"move.moveFolder\"\n                 typeahead=\"title for title in folderNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!move.moveFolder\"\n             value=\"Move\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>");
$templateCache.put("plugins/wiki/html/modal/renameDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"renameAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Rename Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"row\">\n        <div class=\"form-group\">\n          <label class=\"col-sm-2 control-label\" for=\"renameFileName\">Name</label>\n\n          <div class=\"col-sm-10\">\n            <input type=\"text\" id=\"renameFileName\" ng-model=\"rename.newFileName\">\n          </div>\n        </div>\n\n        <div class=\"form-group\">\n          <div ng-show=\"fileExists.exists\" class=\"alert\">\n            Please choose a different name as <b>{{fileExists.name}}</b> already exists\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!fileName || fileExists.exists\"\n             value=\"Rename\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");}]); hawtioPluginLoader.addModule("fabric8-console-templates");