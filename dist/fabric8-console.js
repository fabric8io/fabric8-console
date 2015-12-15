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
        $scope.namespace = $routeParams["namespace"] || $scope.namespace || Kubernetes.currentKubernetesNamespace();
        Kubernetes.setCurrentKubernetesNamespace($scope.namespace);
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
            angular.forEach([Forge.context, '/workspaces/:namespace/projects/:project/forge', '/workspaces/:namespace/forge'], function (path) {
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
                        var entity = $scope.entity;
                        var properties = schema.properties || {};
                        if ($scope.id === "project-new") {
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
                        else if ($scope.id === "devops-edit") {
                            var pipeline = properties.pipeline;
                            if (pipeline) {
                                pipeline.formTemplate = $templateCache.get("devOpsPipelineChooser.html");
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
    Forge.PipelinePicker = Forge.controller("PipelinePicker", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
        function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) {
            var config = $scope.config || {};
            var properties = config.properties || {};
            var pipeline = properties.pipeline || {};
            $scope.pipelines = pipeline.typeaheadData;
            $scope.tableConfig = {
                data: 'pipelines',
                primaryKeyFn: function (item) { return item.value; },
                showSelectionCheckbox: false,
                enableRowClickSelection: true,
                multiSelect: false,
                selectedItems: [],
                filterOptions: {
                    filterText: ''
                },
                columnDefs: [
                    {
                        field: 'label',
                        displayName: 'Pipeline',
                        defaultSort: true
                    },
                    {
                        field: 'environments',
                        displayName: 'Environments',
                        cellTemplate: $templateCache.get("devOpsPipelineChooserEnvironments.html")
                    },
                    {
                        field: 'stages',
                        displayName: 'Stages',
                        cellTemplate: $templateCache.get("devOpsPipelineChooserStages.html")
                    }
                ]
            };
            var pipeline = $scope.entity.pipeline || {};
            var pipelineValue = angular.isString(pipeline) ? pipeline : pipeline.value;
            var initialSelection = getSelection(pipelineValue);
            if (initialSelection) {
                $scope.tableConfig.selectedItems = [initialSelection];
                updateSelection();
                Core.$apply($scope);
            }
            function getSelection(value) {
                var answer = null;
                if (value) {
                    angular.forEach($scope.pipelines, function (pipeline) {
                        if (!answer && (value === pipeline.value || value === pipeline.label)) {
                            answer = pipeline;
                        }
                    });
                }
                return answer;
            }
            $scope.$watchCollection("tableConfig.selectedItems", updateSelection);
            function updateSelection() {
                var selection = $scope.tableConfig.selectedItems;
                var selectedValue = "";
                var description = "";
                var selected = null;
                if (selection && selection.length) {
                    selected = selection[0];
                    selectedValue = selected.value;
                    description = selected.descriptionMarkdown;
                }
                $scope.selected = selected;
                $scope.html = description ? marked(description) : "";
                $scope.entity.pipeline = selectedValue;
                Core.$apply($scope);
            }
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
    Forge.ReposController = Forge.controller("ReposController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "KubernetesModel", "ServiceRegistry",
        function ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL, KubernetesModel, ServiceRegistry) {
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
            watchSecrets();
            function onPersonalSecrets(secrets) {
                if ($scope.sourceSecret) {
                    var found = false;
                    angular.forEach(secrets, function (secret) {
                        var name = Kubernetes.getName(secret);
                        if (name === $scope.sourceSecret) {
                            var requiredDataKeys = Kubernetes.httpsSecretDataKeys;
                            var valid = Forge.secretValid(secret, requiredDataKeys);
                            if (valid) {
                                found = true;
                            }
                            else {
                                Forge.log.warn("secret " + name + " is not valid, it does not contain keys: " + requiredDataKeys + " so clearing!");
                            }
                        }
                    });
                    if (!found) {
                        $scope.sourceSecret = "";
                    }
                }
                Core.$apply($scope);
            }
            function watchSecrets() {
                var namespaceName = Forge.getSourceSecretNamespace(localStorage);
                Kubernetes.watch($scope, $element, "secrets", namespaceName, onPersonalSecrets);
            }
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
    function secretValid(secret, requiredDataKeys) {
        var data = secret.data;
        var valid = true;
        if (data) {
            angular.forEach(requiredDataKeys, function (key) {
                if (!data[key]) {
                    valid = false;
                }
            });
        }
        else {
            valid = false;
        }
        return valid;
    }
    Forge.secretValid = secretValid;
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
            var createdSecret = $location.search()["secret"];
            var projectClient = Kubernetes.createKubernetesClient("projects");
            $scope.requiredDataKeys = Kubernetes.httpsSecretDataKeys;
            $scope.sourceSecretNamespace = Forge.getSourceSecretNamespace(localStorage);
            $scope.setupSecretsLink = Developer.projectSecretsLink(ns, projectId);
            $scope.secretNamespaceLink = Developer.secretsNamespaceLink(ns, projectId, $scope.sourceSecretNamespace);
            getCurrentSecretName();
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
            function getCurrentSecretName() {
                var answer = null;
                if (createdSecret) {
                    answer = createdSecret;
                }
                else {
                    var localStoredSecretName = Forge.getProjectSourceSecret(localStorage, ns, projectId);
                    if (localStoredSecretName) {
                        if ($scope.personalSecrets && $scope.personalSecrets.length) {
                            var valid = false;
                            angular.forEach($scope.personalSecrets, function (secret) {
                                if (localStoredSecretName === Kubernetes.getName(secret)) {
                                    if (Forge.secretValid(secret, $scope.requiredDataKeys)) {
                                        valid = true;
                                    }
                                }
                            });
                            if (!valid) {
                                Forge.log.info("Clearing secret name configuration: " + localStoredSecretName + " as the secret no longer exists!");
                                localStoredSecretName = "";
                                Forge.setProjectSourceSecret(localStorage, ns, projectId, localStoredSecretName);
                            }
                        }
                    }
                    answer = localStoredSecretName;
                }
                $scope.sourceSecret = answer;
                return answer;
            }
            function selectedSecretName() {
                $scope.selectedSecretName = getCurrentSecretName();
                var selectedItems = $scope.tableConfig.selectedItems;
                if (selectedItems && selectedItems.length) {
                    var secret = selectedItems[0];
                    var name = Kubernetes.getName(secret);
                    if (name) {
                        $scope.selectedSecretName = name;
                        if (createdSecret && name !== createdSecret) {
                            createdSecret = null;
                        }
                    }
                }
                return $scope.selectedSecretName;
            }
            $scope.cancel = function () {
                var selectedItems = $scope.tableConfig.selectedItems;
                selectedItems.splice(0, selectedItems.length);
                var current = getCurrentSecretName();
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
                var current = getCurrentSecretName();
                return selected && (selected !== current || selected == createdSecret);
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
                $scope.requiredDataKeys = requiredDataKeys;
                var savedUrl = $location.path();
                var newSecretPath = UrlHelpers.join("namespace", $scope.sourceSecretNamespace, "secretCreate?kind=" + kind + "&savedUrl=" + savedUrl);
                $scope.addNewSecretLink = (projectId) ?
                    Developer.projectWorkspaceLink(ns, projectId, newSecretPath) :
                    UrlHelpers.join(HawtioCore.documentBase(), Kubernetes.context, newSecretPath);
                var filteredSecrets = [];
                var selection = [];
                var currentSecretName = getCurrentSecretName();
                angular.forEach($scope.personalSecrets, function (secret) {
                    var valid = Forge.secretValid(secret, requiredDataKeys);
                    if (valid) {
                        var secretName = Kubernetes.getName(secret);
                        secret["_key"] = secretName;
                        filteredSecrets.push(secret);
                        if (secretName === currentSecretName) {
                            selection.push(secret);
                        }
                    }
                });
                $scope.filteredSecrets = _.sortBy(filteredSecrets, "_key");
                $scope.tableConfig.selectedItems = selection;
            }
            function onPersonalSecrets(secrets) {
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
                var namespaceName = Forge.getSourceSecretNamespace(localStorage);
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
                        Forge.log.warn("Failed to create secret namespace: " + namespaceName + ": " + angular.toJson(err));
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
        Kubernetes.setCurrentKubernetesNamespace($scope.namespace);
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
        Forge.redirectToSetupSecretsIfNotDefined($scope, $location);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VQbHVnaW4udHMiLCJmb3JnZS90cy9jb21tYW5kLnRzIiwiZm9yZ2UvdHMvY29tbWFuZHMudHMiLCJmb3JnZS90cy9waXBlbGluZVBpY2tlci50cyIsImZvcmdlL3RzL3JlcG8udHMiLCJmb3JnZS90cy9yZXBvcy50cyIsImZvcmdlL3RzL3NlY3JldEhlbHBlcnMudHMiLCJmb3JnZS90cy9zZWNyZXRzLnRzIiwibWFpbi90cy9tYWluR2xvYmFscy50cyIsIm1haW4vdHMvbWFpblBsdWdpbi50cyIsIm1haW4vdHMvYWJvdXQudHMiLCJ3aWtpL3RzL3dpa2lIZWxwZXJzLnRzIiwid2lraS90cy93aWtpUGx1Z2luLnRzIiwid2lraS90cy9jYW1lbC50cyIsIndpa2kvdHMvY2FtZWxDYW52YXMudHMiLCJ3aWtpL3RzL2NvbW1pdC50cyIsIndpa2kvdHMvY29tbWl0RGV0YWlsLnRzIiwid2lraS90cy9jcmVhdGUudHMiLCJ3aWtpL3RzL2VkaXQudHMiLCJ3aWtpL3RzL2ZpbGVEcm9wLnRzIiwid2lraS90cy9mb3JtVGFibGUudHMiLCJ3aWtpL3RzL2dpdFByZWZlcmVuY2VzLnRzIiwid2lraS90cy9oaXN0b3J5LnRzIiwid2lraS90cy9oaXN0b3J5RGlyZWN0aXZlLnRzIiwid2lraS90cy9uYXZiYXIudHMiLCJ3aWtpL3RzL292ZXJ2aWV3RGFzaGJvYXJkLnRzIiwid2lraS90cy92aWV3LnRzIiwid2lraS90cy93aWtpRGlhbG9ncy50cyIsIndpa2kvdHMvd2lraURpcmVjdGl2ZXMudHMiLCJ3aWtpL3RzL3dpa2lOYXZpZ2F0aW9uLnRzIiwid2lraS90cy93aWtpUmVwb3NpdG9yeS50cyIsIndpa2kvdHMvd2lraVRvcExldmVsLnRzIl0sIm5hbWVzIjpbIkZvcmdlIiwiRm9yZ2UuaXNGb3JnZSIsIkZvcmdlLmluaXRTY29wZSIsIkZvcmdlLmNvbW1hbmRMaW5rIiwiRm9yZ2UuY29tbWFuZHNMaW5rIiwiRm9yZ2UucmVwb3NBcGlVcmwiLCJGb3JnZS5yZXBvQXBpVXJsIiwiRm9yZ2UuY29tbWFuZEFwaVVybCIsIkZvcmdlLmV4ZWN1dGVDb21tYW5kQXBpVXJsIiwiRm9yZ2UudmFsaWRhdGVDb21tYW5kQXBpVXJsIiwiRm9yZ2UuY29tbWFuZElucHV0QXBpVXJsIiwiRm9yZ2UubW9kZWxQcm9qZWN0IiwiRm9yZ2Uuc2V0TW9kZWxDb21tYW5kcyIsIkZvcmdlLmdldE1vZGVsQ29tbWFuZHMiLCJGb3JnZS5tb2RlbENvbW1hbmRJbnB1dE1hcCIsIkZvcmdlLmdldE1vZGVsQ29tbWFuZElucHV0cyIsIkZvcmdlLnNldE1vZGVsQ29tbWFuZElucHV0cyIsIkZvcmdlLmVucmljaFJlcG8iLCJGb3JnZS5jcmVhdGVIdHRwQ29uZmlnIiwiRm9yZ2UuYWRkUXVlcnlBcmd1bWVudCIsIkZvcmdlLmNyZWF0ZUh0dHBVcmwiLCJGb3JnZS5jb21tYW5kTWF0Y2hlc1RleHQiLCJGb3JnZS5pc1NvdXJjZVNlY3JldERlZmluZWRGb3JQcm9qZWN0IiwiRm9yZ2UucmVkaXJlY3RUb1NldHVwU2VjcmV0c0lmTm90RGVmaW5lZCIsIkZvcmdlLm9uUm91dGVDaGFuZ2VkIiwiY29weVZhbHVlc0Zyb21TY2hlbWEiLCJGb3JnZS51cGRhdGVTY2hlbWEiLCJGb3JnZS52YWxpZGF0ZSIsIkZvcmdlLnRvQmFja2dyb3VuZFN0eWxlIiwiRm9yZ2UudXBkYXRlRGF0YSIsIkZvcmdlLm9uU2NoZW1hTG9hZCIsIkZvcmdlLmNvbW1hbmRNYXRjaGVzIiwiRm9yZ2UuZ2V0U2VsZWN0aW9uIiwiRm9yZ2UudXBkYXRlU2VsZWN0aW9uIiwiRm9yZ2Uub25QZXJzb25hbFNlY3JldHMiLCJGb3JnZS53YXRjaFNlY3JldHMiLCJGb3JnZS5kb0RlbGV0ZSIsIkZvcmdlLnVwZGF0ZUxpbmtzIiwiRm9yZ2UuZ2V0U291cmNlU2VjcmV0TmFtZXNwYWNlIiwiRm9yZ2UuZ2V0UHJvamVjdFNvdXJjZVNlY3JldCIsIkZvcmdlLnNldFByb2plY3RTb3VyY2VTZWNyZXQiLCJGb3JnZS5zZWNyZXRWYWxpZCIsIkZvcmdlLnBhcnNlVXJsIiwiRm9yZ2UuY3JlYXRlTG9jYWxTdG9yYWdlS2V5IiwiRm9yZ2UuZ2V0Q3VycmVudFNlY3JldE5hbWUiLCJGb3JnZS5zZWxlY3RlZFNlY3JldE5hbWUiLCJGb3JnZS51cGRhdGVQcm9qZWN0IiwiRm9yZ2Uub25CdWlsZENvbmZpZ3MiLCJGb3JnZS5jaGVja05hbWVzcGFjZUNyZWF0ZWQiLCJGb3JnZS5jaGVja05hbWVzcGFjZUNyZWF0ZWQud2F0Y2hTZWNyZXRzIiwiTWFpbiIsIldpa2kiLCJXaWtpLlZpZXdNb2RlIiwiV2lraS5pc0ZNQ0NvbnRhaW5lciIsIldpa2kuaXNXaWtpRW5hYmxlZCIsIldpa2kuZ29Ub0xpbmsiLCJXaWtpLmN1c3RvbVZpZXdMaW5rcyIsIldpa2kuY3JlYXRlV2l6YXJkVHJlZSIsIldpa2kuY3JlYXRlRm9sZGVyIiwiV2lraS5hZGRDcmVhdGVXaXphcmRGb2xkZXJzIiwiV2lraS5zdGFydFdpa2lMaW5rIiwiV2lraS5zdGFydExpbmsiLCJXaWtpLmlzSW5kZXhQYWdlIiwiV2lraS52aWV3TGluayIsIldpa2kuYnJhbmNoTGluayIsIldpa2kuZWRpdExpbmsiLCJXaWtpLmNyZWF0ZUxpbmsiLCJXaWtpLmVuY29kZVBhdGgiLCJXaWtpLmRlY29kZVBhdGgiLCJXaWtpLmZpbGVGb3JtYXQiLCJXaWtpLmZpbGVOYW1lIiwiV2lraS5maWxlUGFyZW50IiwiV2lraS5oaWRlRmlsZU5hbWVFeHRlbnNpb25zIiwiV2lraS5naXRSZXN0VVJMIiwiV2lraS5naXRVcmxQcmVmaXgiLCJXaWtpLmdpdFJlbGF0aXZlVVJMIiwiV2lraS5maWxlSWNvbkh0bWwiLCJXaWtpLmljb25DbGFzcyIsIldpa2kuaW5pdFNjb3BlIiwiV2lraS5sb2FkQnJhbmNoZXMiLCJXaWtpLnBhZ2VJZCIsIldpa2kucGFnZUlkRnJvbVVSSSIsIldpa2kuZmlsZUV4dGVuc2lvbiIsIldpa2kub25Db21wbGV0ZSIsIldpa2kucGFyc2VKc29uIiwiV2lraS5hZGp1c3RIcmVmIiwiV2lraS5nZXRGb2xkZXJYbWxOb2RlIiwiV2lraS5hZGROZXdOb2RlIiwiV2lraS5vbk1vZGVsQ2hhbmdlRXZlbnQiLCJXaWtpLm9uTm9kZURhdGFDaGFuZ2VkIiwiV2lraS5vblJlc3VsdHMiLCJXaWtpLnVwZGF0ZVZpZXciLCJXaWtpLmdvVG9WaWV3IiwiV2lraS5pc1JvdXRlT3JOb2RlIiwiV2lraS5jcmVhdGVFbmRwb2ludFVSSSIsIldpa2kudHJlZU1vZGlmaWVkIiwiV2lraS5yZWxvYWRSb3V0ZUlkcyIsIldpa2kub25Sb3V0ZVNlbGVjdGlvbkNoYW5nZWQiLCJXaWtpLnNob3dHcmFwaCIsIldpa2kuZ2V0Tm9kZUlkIiwiV2lraS5nZXRTZWxlY3RlZE9yUm91dGVGb2xkZXIiLCJXaWtpLmdldENvbnRhaW5lckVsZW1lbnQiLCJXaWtpLmxheW91dEdyYXBoIiwiV2lraS5nZXRMaW5rIiwiV2lraS5nZXROb2RlQnlDSUQiLCJXaWtpLnVwZGF0ZVNlbGVjdGlvbiIsIldpa2kuZ2V0V2lkdGgiLCJXaWtpLmdldEZvbGRlcklkQXR0cmlidXRlIiwiV2lraS5nZXRSb3V0ZUZvbGRlciIsIldpa2kuY29tbWl0UGF0aCIsIldpa2kucmV0dXJuVG9EaXJlY3RvcnkiLCJXaWtpLmRvQ3JlYXRlIiwiV2lraS5kb0NyZWF0ZS50b1BhdGgiLCJXaWtpLmRvQ3JlYXRlLnRvUHJvZmlsZU5hbWUiLCJXaWtpLnB1dFBhZ2UiLCJXaWtpLmdldE5ld0RvY3VtZW50UGF0aCIsIldpa2kuaXNDcmVhdGUiLCJXaWtpLm9uRmlsZUNvbnRlbnRzIiwiV2lraS51cGRhdGVTb3VyY2VWaWV3IiwiV2lraS5vbkZvcm1TY2hlbWEiLCJXaWtpLnNhdmVUbyIsIldpa2kuY2hpbGRMaW5rIiwiV2lraS5vbkZvcm1EYXRhIiwiV2lraS5zd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluayIsIldpa2kubG9hZEJyZWFkY3J1bWJzIiwiV2lraS5pc0RpZmZWaWV3IiwiV2lraS52aWV3Q29udGVudHMiLCJXaWtpLm9uRmlsZURldGFpbHMiLCJXaWtpLmNoZWNrRmlsZUV4aXN0cyIsIldpa2kuZ2V0UmVuYW1lRmlsZVBhdGgiLCJXaWtpLmdldFJlbmFtZURpYWxvZyIsIldpa2kuZ2V0TW92ZURpYWxvZyIsIldpa2kuZ2V0RGVsZXRlRGlhbG9nIiwiV2lraS5vZmZzZXRUb3AiLCJXaWtpLnNjcm9sbFRvSGFzaCIsIldpa2kuc2Nyb2xsVG9JZCIsIldpa2kuYWRkTGlua3MiLCJXaWtpLm9uRXZlbnRJbnNlcnRlZCIsIldpa2kuY3JlYXRlU291cmNlQnJlYWRjcnVtYnMiLCJXaWtpLmNyZWF0ZUVkaXRpbmdCcmVhZGNydW1iIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29uc3RydWN0b3IiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmdldFBhZ2UiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5Lmhpc3RvcnkiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbW1pdEluZm8iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbW1pdERldGFpbCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tbWl0VHJlZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZGlmZiIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuYnJhbmNoZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmV4aXN0cyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LnJlbmFtZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvR2V0IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5kb1Bvc3QiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvUG9zdEZvcm0iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbXBsZXRlUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0UGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0TG9nUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0Q29udGVudCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuanNvbkNoaWxkQ29udGVudHMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmdpdCJdLCJtYXBwaW5ncyI6IkFBQUEsMkRBQTJEO0FBQzNELDREQUE0RDtBQUM1RCxHQUFHO0FBQ0gsbUVBQW1FO0FBQ25FLG9FQUFvRTtBQUNwRSwyQ0FBMkM7QUFDM0MsR0FBRztBQUNILGdEQUFnRDtBQUNoRCxHQUFHO0FBQ0gsdUVBQXVFO0FBQ3ZFLHFFQUFxRTtBQUNyRSw0RUFBNEU7QUFDNUUsdUVBQXVFO0FBQ3ZFLGtDQUFrQztBQUVsQywwREFBMEQ7QUFDMUQsc0RBQXNEO0FBQ3RELDJEQUEyRDtBQUMzRCw0REFBNEQ7QUFDNUQsMERBQTBEOztBQ2xCMUQsSUFBTyxLQUFLLENBaU9YO0FBak9ELFdBQU8sS0FBSyxFQUFDLENBQUM7SUFFREEsYUFBT0EsR0FBR0EsOEJBQThCQSxDQUFDQTtJQUV6Q0EsVUFBSUEsR0FBR0EsR0FBR0EsR0FBR0EsYUFBT0EsQ0FBQ0E7SUFDckJBLGdCQUFVQSxHQUFHQSxPQUFPQSxDQUFDQTtJQUNyQkEsZ0JBQVVBLEdBQUdBLGdCQUFnQkEsQ0FBQ0E7SUFDOUJBLGtCQUFZQSxHQUFHQSxnQkFBVUEsR0FBR0EsT0FBT0EsQ0FBQ0E7SUFDcENBLFNBQUdBLEdBQWtCQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxnQkFBVUEsQ0FBQ0EsQ0FBQ0E7SUFFNUNBLG9CQUFjQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxnQkFBZ0JBLENBQUNBLENBQUNBO0lBRTVDQSxxQkFBZUEsR0FBR0EsVUFBVUEsQ0FBQ0EsZUFBZUEsQ0FBQ0E7SUFDN0NBLHNCQUFnQkEs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Q0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDcERBLENBQUNBO1lBR0RBLGVBQVNBLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLFlBQVlBLENBQUNBLENBQUNBO1lBQzNDQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxFQUFFQSxLQUFLQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDaENBLE1BQU1BLENBQUNBLGdCQUFnQkEsR0FBR0EsU0FBU0EsQ0FBQ0EsZ0NBQWdDQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtnQkFDdkZBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFNBQVNBLENBQUNBLCtCQUErQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDcEZBLENBQUNBO1lBQ0RBLHdDQUFrQ0EsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFFdERBLE1BQU1BLENBQUNBLGFBQWFBLEdBQUdBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBO1lBQzNDQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUV2QkEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0Esa0JBQVlBLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLEVBQUVBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1lBQzFFQSxNQUFNQSxDQUFDQSxhQUFhQSxHQUFHQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxZQUFZQSxFQUFFQSxjQUFjQSxDQUFDQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQTtZQUVySEEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsRUFDZkEsQ0FBQ0E7WUFDRkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFB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LE1BQU1BLENBQUNBLEtBQUtBLEdBQUdBLFlBQVlBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO1FBQ3JDQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxZQUFZQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtRQUN2Q0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsWUFBWUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7UUFDdkVBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFlBQVlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO1FBQzVFQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUNyQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsUUFBUUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDOURBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLFdBQVdBLEdBQUdBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLElBQUlBLEVBQUVBLENBQUNBLENBQUNBO1FBQzdFQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxJQUFJQSxzQkFBaUJBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBQ3REQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxTQUFTQSxDQUFDQSxhQUFhQSxFQUFFQSxDQUFDQTtRQUNsREEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsU0FBU0EsQ0FBQ0EsV0FBV0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDOURBLE1BQU1BLENBQUNBLGdCQUFnQkEsR0FBR0EsU0FBU0EsQ0FBQ0Esd0JBQXdCQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxFQUFFQSw0QkFBdUJB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Q0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9CQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUN0Q0EsQ0FBQ0E7UUFDSEEsQ0FBQ0E7UUFHREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDM0JBLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQzVCQSxJQUFJQSxTQUFTQSxHQUFHQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUN0Q0EsSUFBSUEsT0FBT0EsR0FBR0EsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsSUFBSUE7Z0JBQzlCQSxNQUFNQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQTtZQUN2QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDSEEsS0FBS0EsR0FBR0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsTUFBTUEsR0FBR0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDbERBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLEtBQUtBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEdBQUdBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBRS9EQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUMxRkEsQ0FBQ0E7UUFHREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekJBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLEdBQUdBLFNBQVNBLEVBQUVBLFNBQVNBLENBQUNBLEdBQUdBLFNBQVNBLENBQUNBO1FBQzFFQSxDQUFDQTtRQUVEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSx5QkFBeUJBLENBQUNBLEdBQUdBLENBQUNBLFVBQUNBLE9BQU9BO1lBQzlDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTtRQUNsQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDSEEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsVUFBVUEsR0FBR0EsR0FBR0EsR0FBR0EsSUFBSUEsR0FBR0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDdEVBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO1FBQ2RBLENBQUNBO0lBQ0hBLENBQUNBO0lBekNlbEMsZUFBVUEsYUF5Q3pCQSxDQUFBQTtBQUNIQSxDQUFDQSxFQXQ5Qk0sSUFBSSxLQUFKLElBQUksUUFzOUJWOztBQzU5QkQseUNBQXlDO0FBQ3pDLHNDQUFzQztBQU10QyxJQUFPLElBQUksQ0F5SVY7QUF6SUQsV0FBTyxJQUFJLEVBQUMsQ0FBQztJQUVBQSxlQUFVQSxHQUFHQSxNQUFNQSxDQUFDQTtJQUNwQkEsaUJBQVlBLEdBQUdBLG9CQUFvQkEsQ0FBQ0E7SUFDcENBLFFBQUdBLEdBQU9BLElBQUlBLENBQUNBO0lBRWZBLFlBQU9BLEdBQUdBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLGVBQVVBLEVBQUVBLENBQUNBLGFBQWFBLEVBQUVBLFdBQVdBLEVBQUVBLGFBQWFBLEVBQUVBLGVBQWVBLENBQUNBLENBQUNBLENBQUNBO0lBQ25HQSxlQUFVQSxHQUFHQSxhQUFhQSxDQUFDQSx3QkFBd0JBLENBQUNBLFlBQU9BLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBO0lBQ3JFQSxVQUFLQSxHQUFHQSxhQUFhQSxDQUFDQSxxQkFBcUJBLENBQUNBLGlCQUFZQSxDQUFDQSxDQUFDQTtJQUVyRUEsWUFBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsZ0JBQWdCQSxFQUFFQSxVQUFDQSxjQUFjQTtZQUcvQ0EsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsRUFBRUEsaUJBQWlCQSxDQUFDQSxFQUFFQSxVQUFDQSxJQUFJQTtnQkFFNUNBLElBQUlBLFlBQVlBLEdBQUdBLGlEQUFpREEsQ0FBQ0E7Z0JBQ3JFQSxjQUFjQTtvQkFDTkEsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsRUFBRUEsSUFBSUEsRUFBRUEsTUFBTUEsQ0FBQ0EsRUFBRUEsVUFBS0EsQ0FBQ0EsZUFBZUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2hGQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxFQUFFQSxJQUFJQSxFQUFFQSxlQUFlQSxDQUFDQSxFQUFFQSxVQUFLQSxDQUFDQSxhQUFhQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQTtvQkFDdkZBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLGNBQWNBLEVBQUVBLEVBQUNBLFdBQVdBLEVBQUVBLGlDQUFpQ0EsRUFBRUEsY0FBY0EsRUFBRUEsS0FBS0EsRUFBQ0EsQ0FBQ0E7b0JBQ25IQSxJQUFJQSxDQUFDQSxZQUFZQSxHQUFHQSxJQUFJQSxHQUFHQSxjQUFjQSxFQUFFQSxFQUFDQSxXQUFXQSxFQUFFQSxpQ0FBaUNBLEVBQUVBLGNBQWNBLEVBQUVBLEtBQUtBLEVBQUNBLENBQUNBO29CQUNuSEEsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsR0FBR0EsY0FBY0EsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsaUNBQWlDQSxFQUFDQSxDQUFDQTtvQkFDNUZBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLDRCQUE0QkEsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsaUNBQWlDQSxFQUFDQSxDQUFDQTtvQkFDMUdBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLGlCQUFpQkEsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsZ0NBQWdDQSxFQUFDQSxDQUFDQTtvQkFDOUZBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLDJCQUEyQkEsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsK0JBQStCQSxFQUFDQSxDQUFDQTtvQkFDdkdBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLGlDQUFpQ0EsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEscUNBQXFDQSxFQUFDQSxDQUFDQTtvQkFDbkhBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLDRDQUE0Q0EsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsaUNBQWlDQSxFQUFFQSxjQUFjQSxFQUFFQSxLQUFLQSxFQUFDQSxDQUFDQTtvQkFDakpBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLG1CQUFtQkEsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsa0NBQWtDQSxFQUFDQSxDQUFDQTtvQkFDbEdBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLHdCQUF3QkEsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsc0NBQXNDQSxFQUFDQSxDQUFDQTtvQkFDM0dBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLHdCQUF3QkEsRUFBRUEsRUFBRUEsV0FBV0EsRUFBRUEsdUNBQXVDQSxFQUFFQSxDQUFDQTtvQkFDOUdBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLDRCQUE0QkEsRUFBRUEsRUFBRUEsV0FBV0EsRUFBRUEsc0NBQXNDQSxFQUFFQSxDQUFDQTtvQkFDakhBLElBQUlB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QU1BLENBQUNBLFdBQVdBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLFNBQVNBLENBQUNBLEtBQUtBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO29CQUMvRkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2ZBLEtBQUtBLENBQUNBLEdBQUdBLEdBQUdBLEtBQUtBLENBQUNBLEtBQUtBLENBQUNBO29CQUMxQkEsQ0FBQ0E7b0JBQ0RBLEtBQUtBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBO29CQUNuQkEsSUFBSUEsS0FBS0EsR0FBR0EsS0FBS0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsR0FBR0EsQ0FBQ0E7b0JBQ2xDQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtvQkFDN0JBLElBQUlBLENBQUNBLEdBQUdBLEdBQUdBLEtBQUtBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBO29CQUNqQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0E7b0JBQzFCQSxJQUFJQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQSxnQkFBZ0JBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO29CQUM3Q0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsUUFBUUEsQ0FBQ0E7b0JBR3JCQSxJQUFJQSxPQUFPQSxHQUFHQSxLQUFLQSxDQUFDQSxTQUFTQSxDQUFDQSxJQUFJQSxLQUFLQSxDQUFDQSxhQUFhQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtvQkFDN0RBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBLE9BQU9BLENBQUNBO29CQUV2QkEsS0FBS0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzVCQSxDQUFDQTtZQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUdIQSxNQUFN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LENBQUNBO29CQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTt3QkFDTkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBRWRBLElBQUlBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBOzRCQUM3QkEsSUFBSUEsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7NEJBQzdCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDbENBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLGNBQWNBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO2dDQUMxQ0EsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7NEJBQzNCQSxDQUFDQTs0QkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsSUFBSUEsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ2hDQSxRQUFRQSxHQUFHQSxjQUFjQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxlQUFlQSxDQUFDQSxJQUFJQSxRQUFRQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDeEdBLENBQUNBOzRCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQ0FDTkEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsOENBQThDQSxDQUFDQSxDQUFDQTtnQ0FDMURBLE1BQU1BLENBQUNBOzRCQUNUQSxDQUFDQTt3QkFDSEEsQ0FBQ0E7d0JBSURBLElBQUlBLGNBQWNBLEdBQUdBLEtBQUtBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7d0JBQzFEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxZQUFZQSxDQUFDQSxjQUFjQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFD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QSxDQUFDQSxHQUFHQSxPQUFPQSxHQUFHQSxFQUFFQSxDQUFDQTt3QkFDbkVBLElBQUlBLFVBQVVBLEdBQUdBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBO3dCQUNuQ0EsSUFBSUEsSUFBSUEsR0FBR0EsVUFBVUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7d0JBQzlCQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDVEEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsY0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsV0FBV0EsR0FBR0EsSUFBSUEsR0FBR0EsR0FBR0EsR0FBR0EsUUFBUUEsQ0FBQ0E7d0JBQzVFQSxDQUFDQTt3QkFDREEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsY0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsUUFBUUEsR0FBR0EsUUFBUUEsR0FBR0EsR0FBR0EsR0FBR0EsUUFBUUEsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsSUFBSUEsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7d0JBQ2pHQSxFQUFFQSxDQUFDQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDZkEsVUFBVUEsR0FBR0EsVUFBVUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0E7NEJBQ3RDQSxFQUFFQSxDQUFDQSxDQUFDQSxVQUFVQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDL0JBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLFlBQVlBLENBQUNBO2dDQUNsQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsS0FBS0EsQ0FBQ0E7Z0NBQ3RCQSxNQUFNQSxDQUFDQSxLQUFLQSxHQUFHQSxPQUFPQSxDQUFDQTs0QkFDekJBLENBQUNBOzRCQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxVQUFVQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDdENBLE1B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Q0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFFSEEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsY0FBTUEsT0FBQUEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsRUFBaEVBLENBQWdFQSxDQUFDQTtZQUV6RkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0E7Z0JBQ2RBLFFBQVFBLEVBQUVBLENBQUNBO1lBQ2JBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBO2dCQUNaQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxJQUFJQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDdkNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUMzQkEsQ0FBQ0E7WUFDSEEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0E7Z0JBRWRBLElBQUlBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLEdBQUdBLEdBQUdBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBO2dCQUNqREEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsdUJBQXVCQSxHQUFHQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDMUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ2ZBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFVBQUNBLElBQUlBLEVBQUVBLElBQUlBO2dCQUMzQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2ZBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO2dCQUNsQkEsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNOQSxNQUFNQSxDQUFDQSxJQUFJ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RUFBRUEsQ0FBQ0E7b0JBQ3JDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFTEEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBU0EsS0FBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsRUFBRUEsUUFBUUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQ0EsSUFBSUE7d0JBQzNFQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTt3QkFDNUJBLElBQUlBLENBQUNBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLElBQUlBLENBQUNBO3dCQUMxQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ25CQSxJQUFJQSxDQUFDQSxRQUFRQSxJQUFJQSxNQUFNQSxDQUFDQTt3QkFDMUJBLENBQUNBO3dCQUNEQSxJQUFJQSxDQUFDQSxXQUFXQSxHQUFHQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxFQUFFQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTt3QkFDdERBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO29CQUNkQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDTEEsQ0FBQ0E7Z0JBR0RBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBO2dCQUNuQkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQ3JCQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFFekJBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLEtBQUtBLENBQUNBO2dCQUN0QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3BCQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQTtvQkFFL0JBLElBQUlBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLElBQUlB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QU9BLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO1FBQ25EQSxDQUFDQTtRQVlNcEIsc0NBQVVBLEdBQWpCQSxVQUFrQkEsUUFBZUEsRUFBRUEsUUFBZUEsRUFBRUEsRUFBRUE7UUFTdERxQixDQUFDQTtRQWNNckIsNkNBQWlCQSxHQUF4QkEsVUFBeUJBLElBQVdBLEVBQUVBLFlBQW1CQSxFQUFFQSxNQUFhQSxFQUFFQSxFQUFFQTtRQVM1RXNCLENBQUNBO1FBR010QiwrQkFBR0EsR0FBVkE7UUFRQXVCLENBQUNBO1FBQ0h2Qix3QkFBQ0E7SUFBREEsQ0EzWUF6RixBQTJZQ3lGLElBQUF6RjtJQTNZWUEsc0JBQWlCQSxvQkEyWTdCQSxDQUFBQTtBQUNIQSxDQUFDQSxFQWpaTSxJQUFJLEtBQUosSUFBSSxRQWlaVjs7QUN4WkQseUNBQXlDO0FBQ3pDLHNDQUFzQztBQUN0QyxxQ0FBcUM7QUFFckMsSUFBTyxJQUFJLENBTVY7QUFORCxXQUFPLElBQUksRUFBQyxDQUFDO0lBRUFBLHVCQUFrQkEsR0FBR0EsWUFBT0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EseUJBQXlCQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxRQUFRQSxFQUFFQSxjQUFjQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxFQUFFQSxZQUFZQTtRQUVoSkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFFTkEsQ0FBQ0EsRUFOTSxJQUFJLEtBQUosSUFBSSxRQU1WIiwiZmlsZSI6ImNvbXBpbGVkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9saWJzL2hhd3Rpby11dGlsaXRpZXMvZGVmcy5kLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2xpYnMvaGF3dGlvLW9hdXRoL2RlZnMuZC50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9saWJzL2hhd3Rpby1rdWJlcm5ldGVzL2RlZnMuZC50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9saWJzL2hhd3Rpby1pbnRlZ3JhdGlvbi9kZWZzLmQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbGlicy9oYXd0aW8tZGFzaGJvYXJkL2RlZnMuZC50c1wiLz5cbiIsIi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIGNvbnRleHQgPSAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9mb3JnZSc7XG5cbiAgZXhwb3J0IHZhciBoYXNoID0gJyMnICsgY29udGV4dDtcbiAgZXhwb3J0IHZhciBwbHVnaW5OYW1lID0gJ0ZvcmdlJztcbiAgZXhwb3J0IHZhciBwbHVnaW5QYXRoID0gJ3BsdWdpbnMvZm9yZ2UvJztcbiAgZXhwb3J0IHZhciB0ZW1wbGF0ZVBhdGggPSBwbHVnaW5QYXRoICsgJ2h0bWwvJztcbiAgZXhwb3J0IHZhciBsb2c6TG9nZ2luZy5Mb2dnZXIgPSBMb2dnZXIuZ2V0KHBsdWdpbk5hbWUpO1xuXG4gIGV4cG9ydCB2YXIgZGVmYXVsdEljb25VcmwgPSBDb3JlLnVybChcIi9pbWcvZm9yZ2Uuc3ZnXCIpO1xuXG4gIGV4cG9ydCB2YXIgZ29nc1NlcnZpY2VOYW1lID0gS3ViZXJuZXRlcy5nb2dzU2VydmljZU5hbWU7XG4gIGV4cG9ydCB2YXIgb3Jpb25TZXJ2aWNlTmFtZSA9IFwib3Jpb25cIjtcblxuICBleHBvcnQgdmFyIGxvZ2dlZEluVG9Hb2dzID0gZmFsc2U7XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGlzRm9yZ2Uod29ya3NwYWNlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpIHtcbiAgICAkc2NvcGUubmFtZXNwYWNlID0gJHJvdXRlUGFyYW1zW1wibmFtZXNwYWNlXCJdIHx8ICRzY29wZS5uYW1lc3BhY2UgfHwgS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgIEt1YmVybmV0ZXMuc2V0Q3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoJHNjb3BlLm5hbWVzcGFjZSk7XG4gICAgJHNjb3BlLnByb2plY3RJZCA9ICRyb3V0ZVBhcmFtc1tcInByb2plY3RcIl07XG4gICAgJHNjb3BlLiR3b3Jrc3BhY2VMaW5rID0gRGV2ZWxvcGVyLndvcmtzcGFjZUxpbmsoKTtcbiAgICAkc2NvcGUuJHByb2plY3RMaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RCcmVhZGNydW1icygkc2NvcGUucHJvamVjdElkKTtcbiAgICAkc2NvcGUuc3ViVGFiQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTdWJOYXZCYXJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRMaW5rKHByb2plY3RJZCwgbmFtZSwgcmVzb3VyY2VQYXRoKSB7XG4gICAgdmFyIGxpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsocHJvamVjdElkKTtcbiAgICBpZiAobmFtZSkge1xuICAgICAgaWYgKHJlc291cmNlUGF0aCkge1xuICAgICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmRcIiwgbmFtZSwgcmVzb3VyY2VQYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZC9cIiwgbmFtZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsIHByb2plY3RJZCkge1xuICAgIHZhciBsaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCk7XG4gICAgaWYgKHJlc291cmNlUGF0aCkge1xuICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihsaW5rLCBcIi9mb3JnZS9jb21tYW5kcy91c2VyXCIsIHJlc291cmNlUGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZHNcIik7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHJlcG9zQXBpVXJsKEZvcmdlQXBpVVJMKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCIvcmVwb3NcIik7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgcGF0aCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiL3JlcG9zL3VzZXJcIiwgcGF0aCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkLCBucywgcHJvamVjdElkLCByZXNvdXJjZVBhdGggPSBudWxsKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kXCIsIGNvbW1hbmRJZCwgbnMsIHByb2plY3RJZCwgcmVzb3VyY2VQYXRoKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBleGVjdXRlQ29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kXCIsIFwiZXhlY3V0ZVwiLCBjb21tYW5kSWQpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kXCIsIFwidmFsaWRhdGVcIiwgY29tbWFuZElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kSW5wdXRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCwgbnMsIHByb2plY3RJZCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgaWYgKG5zICYmIHByb2plY3RJZCkge1xuICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kSW5wdXRcIiwgY29tbWFuZElkLCBucywgcHJvamVjdElkLCByZXNvdXJjZVBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRJbnB1dFwiLCBjb21tYW5kSWQpO1xuICAgIH1cbiAgfVxuXG5cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcHJvamVjdCBmb3IgdGhlIGdpdmVuIHJlc291cmNlIHBhdGhcbiAgICovXG4gIGZ1bmN0aW9uIG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpIHtcbiAgICBpZiAocmVzb3VyY2VQYXRoKSB7XG4gICAgICB2YXIgcHJvamVjdCA9IEZvcmdlTW9kZWwucHJvamVjdHNbcmVzb3VyY2VQYXRoXTtcbiAgICAgIGlmICghcHJvamVjdCkge1xuICAgICAgICBwcm9qZWN0ID0ge307XG4gICAgICAgIEZvcmdlTW9kZWwucHJvamVjdHNbcmVzb3VyY2VQYXRoXSA9IHByb2plY3Q7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvamVjdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEZvcmdlTW9kZWwucm9vdFByb2plY3Q7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoLCBjb21tYW5kcykge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcHJvamVjdC4kY29tbWFuZHMgPSBjb21tYW5kcztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlbENvbW1hbmRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIHByb2plY3QuJGNvbW1hbmRzIHx8IFtdO1xuICB9XG5cbiAgZnVuY3Rpb24gbW9kZWxDb21tYW5kSW5wdXRNYXAoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgdmFyIHByb2plY3QgPSBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IHByb2plY3QuJGNvbW1hbmRJbnB1dHM7XG4gICAgaWYgKCFjb21tYW5kSW5wdXRzKSB7XG4gICAgICBjb21tYW5kSW5wdXRzID0ge307XG4gICAgICBwcm9qZWN0LiRjb21tYW5kSW5wdXRzID0gY29tbWFuZElucHV0cztcbiAgICB9XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHM7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCwgaWQpIHtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IG1vZGVsQ29tbWFuZElucHV0TWFwKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHNbaWRdO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgsIGlkLCBpdGVtKSB7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBtb2RlbENvbW1hbmRJbnB1dE1hcChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBjb21tYW5kSW5wdXRzW2lkXSA9IGl0ZW07XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZW5yaWNoUmVwbyhyZXBvKSB7XG4gICAgdmFyIG93bmVyID0gcmVwby5vd25lciB8fCB7fTtcbiAgICB2YXIgdXNlciA9IG93bmVyLnVzZXJuYW1lIHx8IHJlcG8udXNlcjtcbiAgICB2YXIgbmFtZSA9IHJlcG8ubmFtZTtcbiAgICB2YXIgcHJvamVjdElkID0gbmFtZTtcbiAgICB2YXIgYXZhdGFyX3VybCA9IG93bmVyLmF2YXRhcl91cmw7XG4gICAgaWYgKGF2YXRhcl91cmwgJiYgYXZhdGFyX3VybC5zdGFydHNXaXRoKFwiaHR0cC8vXCIpKSB7XG4gICAgICBhdmF0YXJfdXJsID0gXCJodHRwOi8vXCIgKyBhdmF0YXJfdXJsLnN1YnN0cmluZyg2KTtcbiAgICAgIG93bmVyLmF2YXRhcl91cmwgPSBhdmF0YXJfdXJsO1xuICAgIH1cbiAgICBpZiAodXNlciAmJiBuYW1lKSB7XG4gICAgICB2YXIgcmVzb3VyY2VQYXRoID0gdXNlciArIFwiL1wiICsgbmFtZTtcbiAgICAgIHJlcG8uJGNvbW1hbmRzTGluayA9IGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsIHByb2plY3RJZCk7XG4gICAgICByZXBvLiRidWlsZHNMaW5rID0gXCIva3ViZXJuZXRlcy9idWlsZHM/cT0vXCIgKyByZXNvdXJjZVBhdGggKyBcIi5naXRcIjtcbiAgICAgIHZhciBpbmplY3RvciA9IEhhd3Rpb0NvcmUuaW5qZWN0b3I7XG4gICAgICBpZiAoaW5qZWN0b3IpIHtcbiAgICAgICAgdmFyIFNlcnZpY2VSZWdpc3RyeSA9IGluamVjdG9yLmdldChcIlNlcnZpY2VSZWdpc3RyeVwiKTtcbiAgICAgICAgaWYgKFNlcnZpY2VSZWdpc3RyeSkge1xuICAgICAgICAgIHZhciBvcmlvbkxpbmsgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsob3Jpb25TZXJ2aWNlTmFtZSk7XG4gICAgICAgICAgdmFyIGdvZ3NTZXJ2aWNlID0gU2VydmljZVJlZ2lzdHJ5LmZpbmRTZXJ2aWNlKGdvZ3NTZXJ2aWNlTmFtZSk7XG4gICAgICAgICAgaWYgKG9yaW9uTGluayAmJiBnb2dzU2VydmljZSkge1xuICAgICAgICAgICAgdmFyIHBvcnRhbElwID0gZ29nc1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgICBpZiAocG9ydGFsSXApIHtcbiAgICAgICAgICAgICAgdmFyIHBvcnQgPSBnb2dzU2VydmljZS5wb3J0O1xuICAgICAgICAgICAgICB2YXIgcG9ydFRleHQgPSAocG9ydCAmJiBwb3J0ICE9PSA4MCAmJiBwb3J0ICE9PSA0NDMpID8gXCI6XCIgKyBwb3J0IDogXCJcIjtcbiAgICAgICAgICAgICAgdmFyIHByb3RvY29sID0gKHBvcnQgJiYgcG9ydCA9PT0gNDQzKSA/IFwiaHR0cHM6Ly9cIiA6IFwiaHR0cDovL1wiO1xuICAgICAgICAgICAgICB2YXIgZ2l0Q2xvbmVVcmwgPSBVcmxIZWxwZXJzLmpvaW4ocHJvdG9jb2wgKyBwb3J0YWxJcCArIHBvcnRUZXh0ICsgXCIvXCIsIHJlc291cmNlUGF0aCArIFwiLmdpdFwiKTtcblxuICAgICAgICAgICAgICByZXBvLiRvcGVuUHJvamVjdExpbmsgPSBVcmxIZWxwZXJzLmpvaW4ob3Jpb25MaW5rLFxuICAgICAgICAgICAgICAgIFwiL2dpdC9naXQtcmVwb3NpdG9yeS5odG1sIyxjcmVhdGVQcm9qZWN0Lm5hbWU9XCIgKyBuYW1lICsgXCIsY2xvbmVHaXQ9XCIgKyBnaXRDbG9uZVVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUh0dHBDb25maWcoKSB7XG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRRdWVyeUFyZ3VtZW50KHVybCwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodXJsICYmIG5hbWUgJiYgdmFsdWUpIHtcbiAgICAgIHZhciBzZXAgPSAgKHVybC5pbmRleE9mKFwiP1wiKSA+PSAwKSA/IFwiJlwiIDogXCI/XCI7XG4gICAgICByZXR1cm4gdXJsICsgc2VwICsgIG5hbWUgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlSHR0cFVybChwcm9qZWN0SWQsIHVybCwgYXV0aEhlYWRlciA9IG51bGwsIGVtYWlsID0gbnVsbCkge1xuICAgIHZhciBsb2NhbFN0b3JhZ2UgPSBLdWJlcm5ldGVzLmluamVjdChcImxvY2FsU3RvcmFnZVwiKSB8fCB7fTtcbiAgICB2YXIgbnMgPSBLdWJlcm5ldGVzLmN1cnJlbnRLdWJlcm5ldGVzTmFtZXNwYWNlKCk7XG4gICAgdmFyIHNlY3JldCA9IGdldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCBucywgcHJvamVjdElkKTtcbiAgICB2YXIgc2VjcmV0TlMgPSBnZXRTb3VyY2VTZWNyZXROYW1lc3BhY2UobG9jYWxTdG9yYWdlKTtcblxuICAgIGF1dGhIZWFkZXIgPSBhdXRoSGVhZGVyIHx8IGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdO1xuICAgIGVtYWlsID0gZW1haWwgfHwgbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdO1xuXG4gICAgdXJsID0gYWRkUXVlcnlBcmd1bWVudCh1cmwsIFwiX2dvZ3NBdXRoXCIsIGF1dGhIZWFkZXIpO1xuICAgIHVybCA9IGFkZFF1ZXJ5QXJndW1lbnQodXJsLCBcIl9nb2dzRW1haWxcIiwgZW1haWwpO1xuICAgIHVybCA9IGFkZFF1ZXJ5QXJndW1lbnQodXJsLCBcInNlY3JldFwiLCBzZWNyZXQpO1xuICAgIHVybCA9IGFkZFF1ZXJ5QXJndW1lbnQodXJsLCBcInNlY3JldE5hbWVzcGFjZVwiLCBzZWNyZXROUyk7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTWF0Y2hlc1RleHQoY29tbWFuZCwgZmlsdGVyVGV4dCkge1xuICAgIGlmIChmaWx0ZXJUZXh0KSB7XG4gICAgICByZXR1cm4gQ29yZS5tYXRjaEZpbHRlcklnbm9yZUNhc2UoYW5ndWxhci50b0pzb24oY29tbWFuZCksIGZpbHRlclRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaXNTb3VyY2VTZWNyZXREZWZpbmVkRm9yUHJvamVjdChucywgcHJvamVjdElkKSB7XG4gICAgdmFyIGxvY2FsU3RvcmFnZSA9IEt1YmVybmV0ZXMuaW5qZWN0KFwibG9jYWxTdG9yYWdlXCIpIHx8IHt9O1xuXG4gICAgcmV0dXJuIGdldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCBucywgcHJvamVjdElkKTtcbi8qXG4gICAgdmFyIGF1dGhIZWFkZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICByZXR1cm4gYXV0aEhlYWRlciA/IHRydWUgOiBmYWxzZTtcbiovXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcmVkaXJlY3RUb1NldHVwU2VjcmV0c0lmTm90RGVmaW5lZCgkc2NvcGUsICRsb2NhdGlvbikge1xuICAgIHZhciBucyA9ICRzY29wZS5uYW1lc3BhY2UgfHwgS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgIHZhciBwcm9qZWN0SWQgPSAkc2NvcGUucHJvamVjdElkO1xuXG4gICAgaWYgKCFpc1NvdXJjZVNlY3JldERlZmluZWRGb3JQcm9qZWN0KG5zLCBwcm9qZWN0SWQpKSB7XG4gICAgICB2YXIgbG9naW5QYWdlID0gRGV2ZWxvcGVyLnByb2plY3RTZWNyZXRzTGluayhucywgcHJvamVjdElkKSArIFwiUmVxdWlyZWRcIjtcbiAgICAgIGxvZy5pbmZvKFwiTm8gc2VjcmV0IHNldHVwIHNvIHJlZGlyZWN0aW5nIHRvIFwiICsgbG9naW5QYWdlKTtcbiAgICAgICRsb2NhdGlvbi5wYXRoKGxvZ2luUGFnZSlcbiAgICB9XG4gIH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgWydoYXd0aW8tY29yZScsICdoYXd0aW8tdWknXSk7XG4gIGV4cG9ydCB2YXIgY29udHJvbGxlciA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlQ29udHJvbGxlckZ1bmN0aW9uKF9tb2R1bGUsIHBsdWdpbk5hbWUpO1xuICBleHBvcnQgdmFyIHJvdXRlID0gUGx1Z2luSGVscGVycy5jcmVhdGVSb3V0aW5nRnVuY3Rpb24odGVtcGxhdGVQYXRoKTtcblxuICBfbW9kdWxlLmNvbmZpZyhbJyRyb3V0ZVByb3ZpZGVyJywgKCRyb3V0ZVByb3ZpZGVyOm5nLnJvdXRlLklSb3V0ZVByb3ZpZGVyKSA9PiB7XG5cbiAgICBjb25zb2xlLmxvZyhcIkxpc3RlbmluZyBvbjogXCIgKyBVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9jcmVhdGVQcm9qZWN0JykpO1xuXG4gICAgJHJvdXRlUHJvdmlkZXIud2hlbihVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9jcmVhdGVQcm9qZWN0JyksIHJvdXRlKCdjcmVhdGVQcm9qZWN0Lmh0bWwnLCBmYWxzZSkpXG4gICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9yZXBvcy86cGF0aConKSwgcm91dGUoJ3JlcG8uaHRtbCcsIGZhbHNlKSlcbiAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL3JlcG9zJyksIHJvdXRlKCdyZXBvcy5odG1sJywgZmFsc2UpKTtcblxuICAgIGFuZ3VsYXIuZm9yRWFjaChbY29udGV4dCwgJy93b3Jrc3BhY2VzLzpuYW1lc3BhY2UvcHJvamVjdHMvOnByb2plY3QvZm9yZ2UnLCAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9mb3JnZSddLCAocGF0aCkgPT4ge1xuICAgICAgJHJvdXRlUHJvdmlkZXJcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZHMnKSwgcm91dGUoJ2NvbW1hbmRzLmh0bWwnLCBmYWxzZSkpXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmRzLzpwYXRoKicpLCByb3V0ZSgnY29tbWFuZHMuaHRtbCcsIGZhbHNlKSlcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZC86aWQnKSwgcm91dGUoJ2NvbW1hbmQuaHRtbCcsIGZhbHNlKSlcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZC86aWQvOnBhdGgqJyksIHJvdXRlKCdjb21tYW5kLmh0bWwnLCBmYWxzZSkpO1xuICAgIH0pO1xuXG4gICAgYW5ndWxhci5mb3JFYWNoKFtjb250ZXh0LCAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9wcm9qZWN0cy86cHJvamVjdC9mb3JnZScsICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL3Byb2plY3RzL2ZvcmdlJ10sIChwYXRoKSA9PiB7XG4gICAgICAkcm91dGVQcm92aWRlclxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9zZWNyZXRzJyksIHJvdXRlKCdzZWNyZXRzLmh0bWwnLCBmYWxzZSkpXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL3NlY3JldHNSZXF1aXJlZCcpLCByb3V0ZSgnc2VjcmV0c1JlcXVpcmVkLmh0bWwnLCBmYWxzZSkpO1xuICAgIH0pO1xuXG4gIH1dKTtcblxuICBfbW9kdWxlLmZhY3RvcnkoJ0ZvcmdlQXBpVVJMJywgWyckcScsICckcm9vdFNjb3BlJywgKCRxOm5nLklRU2VydmljZSwgJHJvb3RTY29wZTpuZy5JUm9vdFNjb3BlU2VydmljZSkgPT4ge1xuICAgIHJldHVybiBLdWJlcm5ldGVzLmt1YmVybmV0ZXNBcGlVcmwoKSArIFwiL3Byb3h5XCIgKyBLdWJlcm5ldGVzLmt1YmVybmV0ZXNOYW1lc3BhY2VQYXRoKCkgKyBcIi9zZXJ2aWNlcy9mYWJyaWM4LWZvcmdlL2FwaS9mb3JnZVwiO1xuICB9XSk7XG5cblxuICBfbW9kdWxlLmZhY3RvcnkoJ0ZvcmdlTW9kZWwnLCBbJyRxJywgJyRyb290U2NvcGUnLCAoJHE6bmcuSVFTZXJ2aWNlLCAkcm9vdFNjb3BlOm5nLklSb290U2NvcGVTZXJ2aWNlKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJvb3RQcm9qZWN0OiB7fSxcbiAgICAgIHByb2plY3RzOiBbXVxuICAgIH1cbiAgfV0pO1xuXG4gIF9tb2R1bGUucnVuKFsndmlld1JlZ2lzdHJ5JywgJ0hhd3Rpb05hdicsICh2aWV3UmVnaXN0cnksIEhhd3Rpb05hdikgPT4ge1xuICAgIHZpZXdSZWdpc3RyeVsnZm9yZ2UnXSA9IHRlbXBsYXRlUGF0aCArICdsYXlvdXRGb3JnZS5odG1sJztcbiAgfV0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5hZGRNb2R1bGUocGx1Z2luTmFtZSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgQ29tbWFuZENvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiQ29tbWFuZENvbnRyb2xsZXJcIixcbiAgICBbXCIkc2NvcGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLCBcIkZvcmdlTW9kZWxcIixcbiAgICAgICgkc2NvcGUsICR0ZW1wbGF0ZUNhY2hlOm5nLklUZW1wbGF0ZUNhY2hlU2VydmljZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtcywgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCwgRm9yZ2VNb2RlbCkgPT4ge1xuXG4gICAgICAgICRzY29wZS5tb2RlbCA9IEZvcmdlTW9kZWw7XG5cbiAgICAgICAgJHNjb3BlLnJlc291cmNlUGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl0gfHwgJGxvY2F0aW9uLnNlYXJjaCgpW1wicGF0aFwiXSB8fCBcIlwiO1xuICAgICAgICAkc2NvcGUuaWQgPSAkcm91dGVQYXJhbXNbXCJpZFwiXTtcbiAgICAgICAgJHNjb3BlLnBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdO1xuXG4gICAgICAgICRzY29wZS5hdmF0YXJfdXJsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXTtcbiAgICAgICAgJHNjb3BlLnVzZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXTtcbiAgICAgICAgJHNjb3BlLnJlcG9OYW1lID0gXCJcIjtcbiAgICAgICAgdmFyIHBhdGhTdGVwcyA9ICRzY29wZS5yZXNvdXJjZVBhdGguc3BsaXQoXCIvXCIpO1xuICAgICAgICBpZiAocGF0aFN0ZXBzICYmIHBhdGhTdGVwcy5sZW5ndGgpIHtcbiAgICAgICAgICAkc2NvcGUucmVwb05hbWUgPSBwYXRoU3RlcHNbcGF0aFN0ZXBzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG5cblxuICAgICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG4gICAgICAgIGlmICgkc2NvcGUuaWQgPT09IFwiZGV2b3BzLWVkaXRcIikge1xuICAgICAgICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTZXR0aW5nc0JyZWFkY3J1bWJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgICAgICRzY29wZS5zdWJUYWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdFNldHRpbmdzU3ViTmF2QmFycygkc2NvcGUucHJvamVjdElkKTtcbiAgICAgICAgfVxuICAgICAgICByZWRpcmVjdFRvU2V0dXBTZWNyZXRzSWZOb3REZWZpbmVkKCRzY29wZSwgJGxvY2F0aW9uKTtcblxuICAgICAgICAkc2NvcGUuJGNvbXBsZXRlTGluayA9ICRzY29wZS4kcHJvamVjdExpbms7XG4gICAgICAgIGlmICgkc2NvcGUucHJvamVjdElkKSB7XG5cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuY29tbWFuZHNMaW5rID0gY29tbWFuZHNMaW5rKCRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgICAkc2NvcGUuY29tcGxldGVkTGluayA9ICRzY29wZS5wcm9qZWN0SWQgPyBVcmxIZWxwZXJzLmpvaW4oJHNjb3BlLiRwcm9qZWN0TGluaywgXCJlbnZpcm9ubWVudHNcIikgOiAkc2NvcGUuJHByb2plY3RMaW5rO1xuXG4gICAgICAgICRzY29wZS5lbnRpdHkgPSB7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5pbnB1dExpc3QgPSBbJHNjb3BlLmVudGl0eV07XG5cbiAgICAgICAgJHNjb3BlLnNjaGVtYSA9IGdldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuaWQpO1xuICAgICAgICBvblNjaGVtYUxvYWQoKTtcblxuICAgICAgICBmdW5jdGlvbiBvblJvdXRlQ2hhbmdlZCgpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInJvdXRlIHVwZGF0ZWQ7IGxldHMgY2xlYXIgdGhlIGVudGl0eVwiKTtcbiAgICAgICAgICAkc2NvcGUuZW50aXR5ID0ge1xuICAgICAgICAgIH07XG4gICAgICAgICAgJHNjb3BlLmlucHV0TGlzdCA9IFskc2NvcGUuZW50aXR5XTtcbiAgICAgICAgICAkc2NvcGUucHJldmlvdXNTY2hlbWFKc29uID0gXCJcIjtcbiAgICAgICAgICAkc2NvcGUuc2NoZW1hID0gbnVsbDtcbiAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS4kb24oJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCBvblJvdXRlQ2hhbmdlZCk7XG5cbiAgICAgICAgJHNjb3BlLmV4ZWN1dGUgPSAoKSA9PiB7XG4gICAgICAgICAgLy8gVE9ETyBjaGVjayBpZiB2YWxpZC4uLlxuICAgICAgICAgICRzY29wZS5yZXNwb25zZSA9IG51bGw7XG4gICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IHRydWU7XG4gICAgICAgICAgJHNjb3BlLmludmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbkVycm9yID0gbnVsbDtcbiAgICAgICAgICB2YXIgY29tbWFuZElkID0gJHNjb3BlLmlkO1xuICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgIHZhciB1cmwgPSBleGVjdXRlQ29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkKTtcbiAgICAgICAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJHNjb3BlLm5hbWVzcGFjZSxcbiAgICAgICAgICAgIHByb2plY3ROYW1lOiAkc2NvcGUucHJvamVjdElkLFxuICAgICAgICAgICAgcmVzb3VyY2U6IHJlc291cmNlUGF0aCxcbiAgICAgICAgICAgIGlucHV0TGlzdDogJHNjb3BlLmlucHV0TGlzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCgkc2NvcGUucHJvamVjdElkLCB1cmwpO1xuICAgICAgICAgIGxvZy5pbmZvKFwiQWJvdXQgdG8gcG9zdCB0byBcIiArIHVybCArIFwiIHBheWxvYWQ6IFwiICsgYW5ndWxhci50b0pzb24ocmVxdWVzdCkpO1xuICAgICAgICAgICRodHRwLnBvc3QodXJsLCByZXF1ZXN0LCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAkc2NvcGUuaW52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbkVycm9yID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBkYXRhLm1lc3NhZ2UgPSBkYXRhLm1lc3NhZ2UgfHwgZGF0YS5vdXRwdXQ7XG4gICAgICAgICAgICAgICAgdmFyIHdpemFyZFJlc3VsdHMgPSBkYXRhLndpemFyZFJlc3VsdHM7XG4gICAgICAgICAgICAgICAgaWYgKHdpemFyZFJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh3aXphcmRSZXN1bHRzLnN0ZXBWYWxpZGF0aW9ucywgKHZhbGlkYXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaW52YWxpZCAmJiAhdmFsaWRhdGlvbi52YWxpZCkge1xuICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlcyA9IHZhbGlkYXRpb24ubWVzc2FnZXMgfHwgW107XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBtZXNzYWdlc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pbnZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25FcnJvciA9IG1lc3NhZ2UuZGVzY3JpcHRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uSW5wdXQgPSBtZXNzYWdlLmlucHV0TmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgdmFyIHN0ZXBJbnB1dHMgPSB3aXphcmRSZXN1bHRzLnN0ZXBJbnB1dHM7XG4gICAgICAgICAgICAgICAgICBpZiAoc3RlcElucHV0cykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NoZW1hID0gXy5sYXN0KHN0ZXBJbnB1dHMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVudGl0eSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGxldHMgY29weSBhY3Jvc3MgYW55IGRlZmF1bHQgdmFsdWVzIGZyb20gdGhlIHNjaGVtYVxuXG4gICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gY29weVZhbHVlc0Zyb21TY2hlbWEoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hW1wicHJvcGVydGllc1wiXSwgKHByb3BlcnR5LCBuYW1lKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHByb3BlcnR5LnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2cuaW5mbyhcIkFkZGluZyBlbnRpdHkuXCIgKyBuYW1lICsgXCIgPSBcIiArIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZW50aXR5W25hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgIGNvcHlWYWx1ZXNGcm9tU2NoZW1hKCk7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmlucHV0TGlzdC5wdXNoKCRzY29wZS5lbnRpdHkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jIHRvIGJlIHN1cmUgdGhleSBkb24ndCBnZXQgb3ZlcndyaXR0ZW4gYnkgdGhlIGZvcm0gd2lkZ2V0XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3B5VmFsdWVzRnJvbVNjaGVtYSgpO1xuICAgICAgICAgICAgICAgICAgICAgIH0sIDIwMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVTY2hlbWEoc2NoZW1hKTtcblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmNhbk1vdmVUb05leHRTdGVwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXRzIGNsZWFyIHRoZSByZXNwb25zZSB3ZSd2ZSBhbm90aGVyIHdpemFyZCBwYWdlIHRvIGRvXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGluZGljYXRlIHRoYXQgdGhlIHdpemFyZCBqdXN0IGNvbXBsZXRlZCBhbmQgbGV0cyBoaWRlIHRoZSBpbnB1dCBmb3JtXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2l6YXJkQ29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaW52YWxpZCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5yZXNwb25zZSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGRhdGFPckVtcHR5ID0gKGRhdGEgfHwge30pO1xuICAgICAgICAgICAgICAgIHZhciBzdGF0dXMgPSAoZGF0YU9yRW1wdHkuc3RhdHVzIHx8IFwiXCIpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2VDbGFzcyA9IHRvQmFja2dyb3VuZFN0eWxlKHN0YXR1cyk7XG5cbiAgICAgICAgICAgICAgICB2YXIgb3V0cHV0UHJvcGVydGllcyA9IChkYXRhT3JFbXB0eS5vdXRwdXRQcm9wZXJ0aWVzIHx8IHt9KTtcbiAgICAgICAgICAgICAgICB2YXIgcHJvamVjdElkID0gZGF0YU9yRW1wdHkucHJvamVjdE5hbWUgfHwgb3V0cHV0UHJvcGVydGllcy5mdWxsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnJlc3BvbnNlICYmIHByb2plY3RJZCAmJiAkc2NvcGUuaWQgPT09ICdwcm9qZWN0LW5ldycpIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5yZXNwb25zZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAvLyBsZXRzIGZvcndhcmQgdG8gdGhlIGRldm9wcyBlZGl0IHBhZ2VcbiAgICAgICAgICAgICAgICAgIC8vIGxldHMgc2V0IHRoZSBzZWNyZXQgbmFtZSBpZiBpdHMgbnVsbFxuICAgICAgICAgICAgICAgICAgaWYgKCFnZXRQcm9qZWN0U291cmNlU2VjcmV0KGxvY2FsU3RvcmFnZSwgJHNjb3BlLm5hbWVzcGFjZSwgcHJvamVjdElkKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGVmYXVsdFNlY3JldE5hbWUgPSBnZXRQcm9qZWN0U291cmNlU2VjcmV0KGxvY2FsU3RvcmFnZSwgJHNjb3BlLm5hbWVzcGFjZSwgIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICBzZXRQcm9qZWN0U291cmNlU2VjcmV0KGxvY2FsU3RvcmFnZSwgJHNjb3BlLm5hbWVzcGFjZSwgcHJvamVjdElkLCBkZWZhdWx0U2VjcmV0TmFtZSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgZWRpdFBhdGggPSBVcmxIZWxwZXJzLmpvaW4oRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCksIFwiL2ZvcmdlL2NvbW1hbmQvZGV2b3BzLWVkaXRcIik7XG4gICAgICAgICAgICAgICAgICAvL3ZhciBlZGl0UGF0aCA9IERldmVsb3Blci5wcm9qZWN0U2VjcmV0c0xpbmsoJHNjb3BlLm5hbWVzcGFjZSwgcHJvamVjdElkKTtcbiAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKFwiTW92aW5nIHRvIHRoZSBzZWNyZXRzIGVkaXQgcGF0aDogXCIgKyBlZGl0UGF0aCk7XG4gICAgICAgICAgICAgICAgICAkbG9jYXRpb24ucGF0aChlZGl0UGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9KS5cbiAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgIGxvZy53YXJuKFwiRmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIiBcIiArIGRhdGEgKyBcIiBcIiArIHN0YXR1cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbihcImVudGl0eVwiLCAoKSA9PiB7XG4gICAgICAgICAgdmFsaWRhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlU2NoZW1hKHNjaGVtYSkge1xuICAgICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICAgIC8vIGxldHMgcmVtb3ZlIHRoZSB2YWx1ZXMgc28gdGhhdCB3ZSBjYW4gcHJvcGVybHkgY2hlY2sgd2hlbiB0aGUgc2NoZW1hIHJlYWxseSBkb2VzIGNoYW5nZVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBzY2hlbWEgd2lsbCBjaGFuZ2UgZXZlcnkgdGltZSB3ZSB0eXBlIGEgY2hhcmFjdGVyIDspXG4gICAgICAgICAgICB2YXIgc2NoZW1hV2l0aG91dFZhbHVlcyA9IGFuZ3VsYXIuY29weShzY2hlbWEpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYVdpdGhvdXRWYWx1ZXMucHJvcGVydGllcywgKHByb3BlcnR5KSA9PiB7XG4gICAgICAgICAgICAgIGRlbGV0ZSBwcm9wZXJ0eVtcInZhbHVlXCJdO1xuICAgICAgICAgICAgICBkZWxldGUgcHJvcGVydHlbXCJlbmFibGVkXCJdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIganNvbiA9IGFuZ3VsYXIudG9Kc29uKHNjaGVtYVdpdGhvdXRWYWx1ZXMpO1xuICAgICAgICAgICAgaWYgKGpzb24gIT09ICRzY29wZS5wcmV2aW91c1NjaGVtYUpzb24pIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVkIHNjaGVtYTogXCIgKyBqc29uKTtcbiAgICAgICAgICAgICAgJHNjb3BlLnByZXZpb3VzU2NoZW1hSnNvbiA9IGpzb247XG4gICAgICAgICAgICAgICRzY29wZS5zY2hlbWEgPSBzY2hlbWE7XG5cbiAgICAgICAgICAgICAgdmFyIGVudGl0eSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgICAgIHZhciBwcm9wZXJ0aWVzID0gc2NoZW1hLnByb3BlcnRpZXMgfHwge307XG5cbiAgICAgICAgICAgICAgaWYgKCRzY29wZS5pZCA9PT0gXCJwcm9qZWN0LW5ld1wiKSB7XG4gICAgICAgICAgICAgICAgLy8gbGV0cyBoaWRlIHRoZSB0YXJnZXQgbG9jYXRpb24hXG4gICAgICAgICAgICAgICAgdmFyIG92ZXJ3cml0ZSA9IHByb3BlcnRpZXMub3ZlcndyaXRlO1xuICAgICAgICAgICAgICAgIHZhciBjYXRhbG9nID0gcHJvcGVydGllcy5jYXRhbG9nO1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXRMb2NhdGlvbiA9IHByb3BlcnRpZXMudGFyZ2V0TG9jYXRpb247XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldExvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgICB0YXJnZXRMb2NhdGlvbi5oaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgaWYgKG92ZXJ3cml0ZSkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyd3JpdGUuaGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGlkaW5nIHRhcmdldExvY2F0aW9uIVwiKTtcblxuICAgICAgICAgICAgICAgICAgLy8gbGV0cyBkZWZhdWx0IHRoZSB0eXBlXG4gICAgICAgICAgICAgICAgICBpZiAoIWVudGl0eS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eS50eXBlID0gXCJGcm9tIEFyY2hldHlwZSBDYXRhbG9nXCI7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYXRhbG9nKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIWVudGl0eS5jYXRhbG9nKSB7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eS5jYXRhbG9nID0gXCJmYWJyaWM4XCI7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRzY29wZS5pZCA9PT0gXCJkZXZvcHMtZWRpdFwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBpcGVsaW5lID0gcHJvcGVydGllcy5waXBlbGluZTtcbiAgICAgICAgICAgICAgICBpZiAocGlwZWxpbmUpIHtcbiAgICAgICAgICAgICAgICAgIHBpcGVsaW5lLmZvcm1UZW1wbGF0ZSA9ICR0ZW1wbGF0ZUNhY2hlLmdldChcImRldk9wc1BpcGVsaW5lQ2hvb3Nlci5odG1sXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHZhbGlkYXRlKCkge1xuICAgICAgICAgIGlmICgkc2NvcGUuZXhlY3V0aW5nIHx8ICRzY29wZS52YWxpZGF0aW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBuZXdKc29uID0gYW5ndWxhci50b0pzb24oJHNjb3BlLmVudGl0eSk7XG4gICAgICAgICAgaWYgKG5ld0pzb24gPT09ICRzY29wZS52YWxpZGF0ZWRFbnRpdHlKc29uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS52YWxpZGF0ZWRFbnRpdHlKc29uID0gbmV3SnNvbjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGNvbW1hbmRJZCA9ICRzY29wZS5pZDtcbiAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICB2YXIgdXJsID0gdmFsaWRhdGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpO1xuICAgICAgICAgIC8vIGxldHMgcHV0IHRoZSBlbnRpdHkgaW4gdGhlIGxhc3QgaXRlbSBpbiB0aGUgbGlzdFxuICAgICAgICAgIHZhciBpbnB1dExpc3QgPSBbXS5jb25jYXQoJHNjb3BlLmlucHV0TGlzdCk7XG4gICAgICAgICAgaW5wdXRMaXN0W2lucHV0TGlzdC5sZW5ndGggLSAxXSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICAgICAgICBuYW1lc3BhY2U6ICRzY29wZS5uYW1lc3BhY2UsXG4gICAgICAgICAgICBwcm9qZWN0TmFtZTogJHNjb3BlLnByb2plY3RJZCxcbiAgICAgICAgICAgIHJlc291cmNlOiByZXNvdXJjZVBhdGgsXG4gICAgICAgICAgICBpbnB1dExpc3Q6ICRzY29wZS5pbnB1dExpc3RcbiAgICAgICAgICB9O1xuICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwoJHNjb3BlLnByb2plY3RJZCwgdXJsKTtcbiAgICAgICAgICAkc2NvcGUudmFsaWRhdGluZyA9IHRydWU7XG4gICAgICAgICAgJGh0dHAucG9zdCh1cmwsIHJlcXVlc3QsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICB0aGlzLnZhbGlkYXRpb24gPSBkYXRhO1xuICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiZ290IHZhbGlkYXRpb24gXCIgKyBhbmd1bGFyLnRvSnNvbihkYXRhLCB0cnVlKSk7XG4gICAgICAgICAgICAgIHZhciB3aXphcmRSZXN1bHRzID0gZGF0YS53aXphcmRSZXN1bHRzO1xuICAgICAgICAgICAgICBpZiAod2l6YXJkUmVzdWx0cykge1xuICAgICAgICAgICAgICAgIHZhciBzdGVwSW5wdXRzID0gd2l6YXJkUmVzdWx0cy5zdGVwSW5wdXRzO1xuICAgICAgICAgICAgICAgIGlmIChzdGVwSW5wdXRzKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgc2NoZW1hID0gXy5sYXN0KHN0ZXBJbnB1dHMpO1xuICAgICAgICAgICAgICAgICAgdXBkYXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG5cbiAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICogTGV0cyB0aHJvdHRsZSB0aGUgdmFsaWRhdGlvbnMgc28gdGhhdCB3ZSBvbmx5IGZpcmUgYW5vdGhlciB2YWxpZGF0aW9uIGEgbGl0dGxlXG4gICAgICAgICAgICAgICAqIGFmdGVyIHdlJ3ZlIGdvdCBhIHJlcGx5IGFuZCBvbmx5IGlmIHRoZSBtb2RlbCBoYXMgY2hhbmdlZCBzaW5jZSB0aGVuXG4gICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZSgpO1xuICAgICAgICAgICAgICB9LCAyMDApO1xuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB1cGRhdGVEYXRhKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gdG9CYWNrZ3JvdW5kU3R5bGUoc3RhdHVzKSB7XG4gICAgICAgICAgaWYgKCFzdGF0dXMpIHtcbiAgICAgICAgICAgIHN0YXR1cyA9IFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzdGF0dXMuc3RhcnRzV2l0aChcInN1Y1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYmctc3VjY2Vzc1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJiZy13YXJuaW5nXCJcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgICAgJHNjb3BlLml0ZW0gPSBudWxsO1xuICAgICAgICAgIHZhciBjb21tYW5kSWQgPSAkc2NvcGUuaWQ7XG4gICAgICAgICAgaWYgKGNvbW1hbmRJZCkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgICB2YXIgdXJsID0gY29tbWFuZElucHV0QXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsICRzY29wZS5uYW1lc3BhY2UsICRzY29wZS5wcm9qZWN0SWQsIHJlc291cmNlUGF0aCk7XG4gICAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKCRzY29wZS5wcm9qZWN0SWQsIHVybCk7XG4gICAgICAgICAgICAkaHR0cC5nZXQodXJsLCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZURhdGEgbG9hZGVkIHNjaGVtYVwiKTtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVNjaGVtYShkYXRhKTtcbiAgICAgICAgICAgICAgICAgIHNldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuaWQsICRzY29wZS5zY2hlbWEpO1xuICAgICAgICAgICAgICAgICAgb25TY2hlbWFMb2FkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvblNjaGVtYUxvYWQoKSB7XG4gICAgICAgICAgLy8gbGV0cyB1cGRhdGUgdGhlIHZhbHVlIGlmIGl0cyBibGFuayB3aXRoIHRoZSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgdmFyIHNjaGVtYSA9ICRzY29wZS5zY2hlbWE7XG4gICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSBzY2hlbWE7XG4gICAgICAgICAgdmFyIGVudGl0eSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYS5wcm9wZXJ0aWVzLCAocHJvcGVydHksIGtleSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0eS52YWx1ZTtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlICYmICFlbnRpdHlba2V5XSkge1xuICAgICAgICAgICAgICAgIGVudGl0eVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgQ29tbWFuZHNDb250cm9sbGVyID0gY29udHJvbGxlcihcIkNvbW1hbmRzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGxvY2F0aW9uXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiRm9yZ2VNb2RlbFwiLFxuICAgICgkc2NvcGUsICRkaWFsb2csICR3aW5kb3csICR0ZW1wbGF0ZUNhY2hlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwpID0+IHtcblxuICAgICAgJHNjb3BlLm1vZGVsID0gRm9yZ2VNb2RlbDtcbiAgICAgICRzY29wZS5yZXNvdXJjZVBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdIHx8ICRsb2NhdGlvbi5zZWFyY2goKVtcInBhdGhcIl0gfHwgXCJcIjtcbiAgICAgICRzY29wZS5yZXBvTmFtZSA9IFwiXCI7XG4gICAgICAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uID0gJHNjb3BlLnJlc291cmNlUGF0aCB8fCBcIlwiO1xuICAgICAgdmFyIHBhdGhTdGVwcyA9ICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24uc3BsaXQoXCIvXCIpO1xuICAgICAgaWYgKHBhdGhTdGVwcyAmJiBwYXRoU3RlcHMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5yZXBvTmFtZSA9IHBhdGhTdGVwc1twYXRoU3RlcHMubGVuZ3RoIC0gMV07XG4gICAgICB9XG4gICAgICBpZiAoISRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24uc3RhcnRzV2l0aChcIi9cIikgJiYgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24gPSBcIi9cIiArICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb247XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5hdmF0YXJfdXJsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXTtcbiAgICAgICRzY29wZS51c2VyID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl07XG5cbiAgICAgICRzY29wZS5jb21tYW5kcyA9IGdldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCk7XG4gICAgICAkc2NvcGUuZmV0Y2hlZCA9ICRzY29wZS5jb21tYW5kcy5sZW5ndGggIT09IDA7XG5cbiAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgIHJlZGlyZWN0VG9TZXR1cFNlY3JldHNJZk5vdERlZmluZWQoJHNjb3BlLCAkbG9jYXRpb24pO1xuXG5cbiAgICAgICRzY29wZS50YWJsZUNvbmZpZyA9IHtcbiAgICAgICAgZGF0YTogJ2NvbW1hbmRzJyxcbiAgICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgIG11bHRpU2VsZWN0OiB0cnVlLFxuICAgICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgIGZpbHRlclRleHQ6ICRsb2NhdGlvbi5zZWFyY2goKVtcInFcIl0gfHwgJydcbiAgICAgICAgfSxcbiAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ05hbWUnLFxuICAgICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoXCJpZFRlbXBsYXRlLmh0bWxcIilcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdEZXNjcmlwdGlvbidcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnY2F0ZWdvcnknLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdDYXRlZ29yeSdcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIGNvbW1hbmRNYXRjaGVzKGNvbW1hbmQpIHtcbiAgICAgICAgdmFyIGZpbHRlclRleHQgPSAkc2NvcGUudGFibGVDb25maWcuZmlsdGVyT3B0aW9ucy5maWx0ZXJUZXh0O1xuICAgICAgICByZXR1cm4gY29tbWFuZE1hdGNoZXNUZXh0KGNvbW1hbmQsIGZpbHRlclRleHQpO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yID0ge1xuICAgICAgICBmaWx0ZXJUZXh0OiBcIlwiLFxuICAgICAgICBmb2xkZXJzOiBbXSxcbiAgICAgICAgc2VsZWN0ZWRDb21tYW5kczogW10sXG4gICAgICAgIGV4cGFuZGVkRm9sZGVyczoge30sXG5cbiAgICAgICAgaXNPcGVuOiAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgdmFyIGZpbHRlclRleHQgPSAkc2NvcGUudGFibGVDb25maWcuZmlsdGVyT3B0aW9ucy5maWx0ZXJUZXh0O1xuICAgICAgICAgIGlmIChmaWx0ZXJUZXh0ICE9PSAnJyB8fCAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmV4cGFuZGVkRm9sZGVyc1tmb2xkZXIuaWRdKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJvcGVuZWRcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiY2xvc2VkXCI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2xlYXJTZWxlY3RlZDogKCkgPT4ge1xuICAgICAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3IuZXhwYW5kZWRGb2xkZXJzID0ge307XG4gICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgfSxcblxuICAgICAgICB1cGRhdGVTZWxlY3RlZDogKCkgPT4ge1xuICAgICAgICAgIC8vIGxldHMgdXBkYXRlIHRoZSBzZWxlY3RlZCBhcHBzXG4gICAgICAgICAgdmFyIHNlbGVjdGVkQ29tbWFuZHMgPSBbXTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLm1vZGVsLmFwcEZvbGRlcnMsIChmb2xkZXIpID0+IHtcbiAgICAgICAgICAgIHZhciBhcHBzID0gZm9sZGVyLmFwcHMuZmlsdGVyKChhcHApID0+IGFwcC5zZWxlY3RlZCk7XG4gICAgICAgICAgICBpZiAoYXBwcykge1xuICAgICAgICAgICAgICBzZWxlY3RlZENvbW1hbmRzID0gc2VsZWN0ZWRDb21tYW5kcy5jb25jYXQoYXBwcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5zZWxlY3RlZENvbW1hbmRzID0gc2VsZWN0ZWRDb21tYW5kcy5zb3J0QnkoXCJuYW1lXCIpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNlbGVjdDogKGNvbW1hbmQsIGZsYWcpID0+IHtcbiAgICAgICAgICB2YXIgaWQgPSBjb21tYW5kLm5hbWU7XG4vKlxuICAgICAgICAgIGFwcC5zZWxlY3RlZCA9IGZsYWc7XG4qL1xuICAgICAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3IudXBkYXRlU2VsZWN0ZWQoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRTZWxlY3RlZENsYXNzOiAoYXBwKSA9PiB7XG4gICAgICAgICAgaWYgKGFwcC5hYnN0cmFjdCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYWJzdHJhY3RcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFwcC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgcmV0dXJuIFwic2VsZWN0ZWRcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2hvd0NvbW1hbmQ6IChjb21tYW5kKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGNvbW1hbmRNYXRjaGVzKGNvbW1hbmQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNob3dGb2xkZXI6IChmb2xkZXIpID0+IHtcbiAgICAgICAgICB2YXIgZmlsdGVyVGV4dCA9ICRzY29wZS50YWJsZUNvbmZpZy5maWx0ZXJPcHRpb25zLmZpbHRlclRleHQ7XG4gICAgICAgICAgcmV0dXJuICFmaWx0ZXJUZXh0IHx8IGZvbGRlci5jb21tYW5kcy5zb21lKChhcHApID0+IGNvbW1hbmRNYXRjaGVzKGFwcCkpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG5cbiAgICAgIHZhciB1cmwgPSBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZHNcIiwgJHNjb3BlLm5hbWVzcGFjZSwgJHNjb3BlLnByb2plY3RJZCwgJHNjb3BlLnJlc291cmNlUGF0aCk7XG4gICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKCRzY29wZS5wcm9qZWN0SWQsIHVybCk7XG4gICAgICBsb2cuaW5mbyhcIkZldGNoaW5nIGNvbW1hbmRzIGZyb206IFwiICsgdXJsKTtcbiAgICAgICRodHRwLmdldCh1cmwsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShkYXRhKSAmJiBzdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgICB2YXIgZm9sZGVyTWFwID0ge307XG4gICAgICAgICAgICB2YXIgZm9sZGVycyA9IFtdO1xuICAgICAgICAgICAgJHNjb3BlLmNvbW1hbmRzID0gXy5zb3J0QnkoZGF0YSwgXCJuYW1lXCIpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5jb21tYW5kcywgKGNvbW1hbmQpID0+IHtcbiAgICAgICAgICAgICAgdmFyIGlkID0gY29tbWFuZC5pZCB8fCBjb21tYW5kLm5hbWU7XG4gICAgICAgICAgICAgIGNvbW1hbmQuJGxpbmsgPSBjb21tYW5kTGluaygkc2NvcGUucHJvamVjdElkLCBpZCwgcmVzb3VyY2VQYXRoKTtcblxuICAgICAgICAgICAgICB2YXIgbmFtZSA9IGNvbW1hbmQubmFtZSB8fCBjb21tYW5kLmlkO1xuICAgICAgICAgICAgICB2YXIgZm9sZGVyTmFtZSA9IGNvbW1hbmQuY2F0ZWdvcnk7XG4gICAgICAgICAgICAgIHZhciBzaG9ydE5hbWUgPSBuYW1lO1xuICAgICAgICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KFwiOlwiLCAyKTtcbiAgICAgICAgICAgICAgaWYgKG5hbWVzICE9IG51bGwgJiYgbmFtZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGZvbGRlck5hbWUgPSBuYW1lc1swXTtcbiAgICAgICAgICAgICAgICBzaG9ydE5hbWUgPSBuYW1lc1sxXS50cmltKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGZvbGRlck5hbWUgPT09IFwiUHJvamVjdC9CdWlsZFwiKSB7XG4gICAgICAgICAgICAgICAgZm9sZGVyTmFtZSA9IFwiUHJvamVjdFwiO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbW1hbmQuJHNob3J0TmFtZSA9IHNob3J0TmFtZTtcbiAgICAgICAgICAgICAgY29tbWFuZC4kZm9sZGVyTmFtZSA9IGZvbGRlck5hbWU7XG4gICAgICAgICAgICAgIHZhciBmb2xkZXIgPSBmb2xkZXJNYXBbZm9sZGVyTmFtZV07XG4gICAgICAgICAgICAgIGlmICghZm9sZGVyKSB7XG4gICAgICAgICAgICAgICAgZm9sZGVyID0ge1xuICAgICAgICAgICAgICAgICAgbmFtZTogZm9sZGVyTmFtZSxcbiAgICAgICAgICAgICAgICAgIGNvbW1hbmRzOiBbXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgZm9sZGVyTWFwW2ZvbGRlck5hbWVdID0gZm9sZGVyO1xuICAgICAgICAgICAgICAgIGZvbGRlcnMucHVzaChmb2xkZXIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGZvbGRlci5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBmb2xkZXJzID0gXy5zb3J0QnkoZm9sZGVycywgXCJuYW1lXCIpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGZvbGRlcnMsIChmb2xkZXIpID0+IHtcbiAgICAgICAgICAgICAgZm9sZGVyLmNvbW1hbmRzID0gXy5zb3J0QnkoZm9sZGVyLmNvbW1hbmRzLCBcIiRzaG9ydE5hbWVcIik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3IuZm9sZGVycyA9IGZvbGRlcnM7XG5cbiAgICAgICAgICAgIHNldE1vZGVsQ29tbWFuZHMoJHNjb3BlLm1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuY29tbWFuZHMpO1xuICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkuXG4gICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gICAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIFBpcGVsaW5lUGlja2VyID0gY29udHJvbGxlcihcIlBpcGVsaW5lUGlja2VyXCIsXG4gICAgW1wiJHNjb3BlXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJGb3JnZU1vZGVsXCIsXG4gICAgICAoJHNjb3BlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXMsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwpID0+IHtcblxuICAgICAgICB2YXIgY29uZmlnID0gJHNjb3BlLmNvbmZpZyB8fCB7fTtcbiAgICAgICAgdmFyIHByb3BlcnRpZXMgPSBjb25maWcucHJvcGVydGllcyB8fCB7fTtcbiAgICAgICAgdmFyIHBpcGVsaW5lID0gcHJvcGVydGllcy5waXBlbGluZSB8fCB7fTtcbiAgICAgICAgJHNjb3BlLnBpcGVsaW5lcyA9IHBpcGVsaW5lLnR5cGVhaGVhZERhdGE7XG5cbiAgICAgICAgJHNjb3BlLnRhYmxlQ29uZmlnID0ge1xuICAgICAgICAgIGRhdGE6ICdwaXBlbGluZXMnLFxuICAgICAgICAgIHByaW1hcnlLZXlGbjogKGl0ZW0pID0+IGl0ZW0udmFsdWUsXG4gICAgICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiBmYWxzZSxcbiAgICAgICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogdHJ1ZSxcbiAgICAgICAgICBtdWx0aVNlbGVjdDogZmFsc2UsXG4gICAgICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgICAgZmlsdGVyVGV4dDogJydcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZmllbGQ6ICdsYWJlbCcsXG4gICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnUGlwZWxpbmUnLFxuICAgICAgICAgICAgICBkZWZhdWx0U29ydDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZmllbGQ6ICdlbnZpcm9ubWVudHMnLFxuICAgICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0Vudmlyb25tZW50cycsXG4gICAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwiZGV2T3BzUGlwZWxpbmVDaG9vc2VyRW52aXJvbm1lbnRzLmh0bWxcIilcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZpZWxkOiAnc3RhZ2VzJyxcbiAgICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdTdGFnZXMnLFxuICAgICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcImRldk9wc1BpcGVsaW5lQ2hvb3NlclN0YWdlcy5odG1sXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9O1xuICAgICAgICB2YXIgcGlwZWxpbmUgPSAkc2NvcGUuZW50aXR5LnBpcGVsaW5lIHx8IHt9O1xuICAgICAgICB2YXIgcGlwZWxpbmVWYWx1ZSA9IGFuZ3VsYXIuaXNTdHJpbmcocGlwZWxpbmUpID8gcGlwZWxpbmUgOiBwaXBlbGluZS52YWx1ZTtcbiAgICAgICAgdmFyIGluaXRpYWxTZWxlY3Rpb24gPSBnZXRTZWxlY3Rpb24ocGlwZWxpbmVWYWx1ZSk7XG4gICAgICAgIGlmIChpbml0aWFsU2VsZWN0aW9uKSB7XG4gICAgICAgICAgJHNjb3BlLnRhYmxlQ29uZmlnLnNlbGVjdGVkSXRlbXMgPSBbaW5pdGlhbFNlbGVjdGlvbl07XG4gICAgICAgICAgdXBkYXRlU2VsZWN0aW9uKCk7XG4gICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFNlbGVjdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHZhciBhbnN3ZXIgPSBudWxsO1xuICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5waXBlbGluZXMsIChwaXBlbGluZSkgPT4ge1xuICAgICAgICAgICAgICBpZiAoIWFuc3dlciAmJiAodmFsdWUgPT09IHBpcGVsaW5lLnZhbHVlIHx8IHZhbHVlID09PSBwaXBlbGluZS5sYWJlbCkpIHtcbiAgICAgICAgICAgICAgICBhbnN3ZXIgPSBwaXBlbGluZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbihcInRhYmxlQ29uZmlnLnNlbGVjdGVkSXRlbXNcIiwgdXBkYXRlU2VsZWN0aW9uKTtcblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVTZWxlY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHNlbGVjdGlvbiA9ICRzY29wZS50YWJsZUNvbmZpZy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgICAgIHZhciBzZWxlY3RlZFZhbHVlID0gXCJcIjtcbiAgICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSBcIlwiO1xuICAgICAgICAgIHZhciBzZWxlY3RlZCA9IG51bGw7XG4gICAgICAgICAgaWYgKHNlbGVjdGlvbiAmJiBzZWxlY3Rpb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBzZWxlY3RlZCA9IHNlbGVjdGlvblswXTtcbiAgICAgICAgICAgIHNlbGVjdGVkVmFsdWUgPSBzZWxlY3RlZC52YWx1ZTtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uID0gc2VsZWN0ZWQuZGVzY3JpcHRpb25NYXJrZG93bjtcbiAgICAgICAgICB9XG4gICAgICAgICAgJHNjb3BlLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG4gICAgICAgICAgLy9sb2cuaW5mbyhcIj09PT0gU2VsZWN0ZWQgcGlwZWxpbmUgaXM6IFwiICsgYW5ndWxhci50b0pzb24oJHNjb3BlLnNlbGVjdGVkKSk7XG4gICAgICAgICAgJHNjb3BlLmh0bWwgPSBkZXNjcmlwdGlvbiA/IG1hcmtlZChkZXNjcmlwdGlvbikgOiBcIlwiO1xuICAgICAgICAgICRzY29wZS5lbnRpdHkucGlwZWxpbmUgPSBzZWxlY3RlZFZhbHVlO1xuICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgIH1cbiAgICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBSZXBvQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJSZXBvQ29udHJvbGxlclwiLFxuICAgIFtcIiRzY29wZVwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsXG4gICAgICAoJHNjb3BlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXMsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwpID0+IHtcblxuICAgICAgICAkc2NvcGUubmFtZSA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl07XG5cbiAgICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuICAgICAgICByZWRpcmVjdFRvU2V0dXBTZWNyZXRzSWZOb3REZWZpbmVkKCRzY29wZSwgJGxvY2F0aW9uKTtcblxuICAgICAgICAkc2NvcGUuJG9uKCckcm91dGVVcGRhdGUnLCAoJGV2ZW50KSA9PiB7XG4gICAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB1cGRhdGVEYXRhKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlRGF0YSgpIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLm5hbWUpIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSByZXBvQXBpVXJsKEZvcmdlQXBpVVJMLCAkc2NvcGUubmFtZSk7XG4gICAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKCRzY29wZS5wcm9qZWN0SWQsIHVybCk7XG4gICAgICAgICAgICB2YXIgY29uZmlnID0gY3JlYXRlSHR0cENvbmZpZygpO1xuICAgICAgICAgICAgJGh0dHAuZ2V0KHVybCwgY29uZmlnKS5cbiAgICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgZW5yaWNoUmVwbyhkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJHNjb3BlLmVudGl0eSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9KS5cbiAgICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBSZXBvc0NvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiUmVwb3NDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRkaWFsb2dcIiwgXCIkd2luZG93XCIsIFwiJGVsZW1lbnRcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRsb2NhdGlvblwiLCBcImxvY2FsU3RvcmFnZVwiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLCBcIkt1YmVybmV0ZXNNb2RlbFwiLCBcIlNlcnZpY2VSZWdpc3RyeVwiLFxuICAgICgkc2NvcGUsICRkaWFsb2csICR3aW5kb3csICRlbGVtZW50LCAkdGVtcGxhdGVDYWNoZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgbG9jYWxTdG9yYWdlLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMLCBLdWJlcm5ldGVzTW9kZWw6IEt1YmVybmV0ZXMuS3ViZXJuZXRlc01vZGVsU2VydmljZSwgU2VydmljZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICAgICRzY29wZS5tb2RlbCA9IEt1YmVybmV0ZXNNb2RlbDtcbiAgICAgICRzY29wZS5yZXNvdXJjZVBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdO1xuICAgICAgJHNjb3BlLmNvbW1hbmRzTGluayA9IChwYXRoKSA9PiBjb21tYW5kc0xpbmsocGF0aCwgJHNjb3BlLnByb2plY3RJZCk7XG5cbiAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnLnB1c2goe1xuICAgICAgICBsYWJlbDogXCJDcmVhdGUgUHJvamVjdFwiXG4gICAgICB9KTtcbiAgICAgICRzY29wZS5zdWJUYWJDb25maWcgPSBbXTtcblxuXG4gICAgICAkc2NvcGUuJG9uKCdrdWJlcm5ldGVzTW9kZWxVcGRhdGVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB1cGRhdGVMaW5rcygpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBwcm9qZWN0SWQgPSBudWxsO1xuICAgICAgdmFyIG5zID0gJHNjb3BlLm5hbWVzcGFjZTtcbiAgICAgICRzY29wZS5zb3VyY2VTZWNyZXQgPSBnZXRQcm9qZWN0U291cmNlU2VjcmV0KGxvY2FsU3RvcmFnZSwgbnMsIHByb2plY3RJZCk7XG5cbiAgICAgICRzY29wZS50YWJsZUNvbmZpZyA9IHtcbiAgICAgICAgZGF0YTogJ3Byb2plY3RzJyxcbiAgICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgIG11bHRpU2VsZWN0OiB0cnVlLFxuICAgICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgIGZpbHRlclRleHQ6ICRsb2NhdGlvbi5zZWFyY2goKVtcInFcIl0gfHwgJydcbiAgICAgICAgfSxcbiAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ1JlcG9zaXRvcnkgTmFtZScsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcInJlcG9UZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ2FjdGlvbnMnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdBY3Rpb25zJyxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwicmVwb0FjdGlvbnNUZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUubG9naW4gPSB7XG4gICAgICAgIGF1dGhIZWFkZXI6IGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdIHx8IFwiXCIsXG4gICAgICAgIHJlbG9naW46IGZhbHNlLFxuICAgICAgICBhdmF0YXJfdXJsOiBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdIHx8IFwiXCIsXG4gICAgICAgIHVzZXI6IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdIHx8IFwiXCIsXG4gICAgICAgIHBhc3N3b3JkOiBcIlwiLFxuICAgICAgICBlbWFpbDogbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdIHx8IFwiXCJcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kb0xvZ2luID0gKCkgPT4ge1xuICAgICAgICB2YXIgbG9naW4gPSAkc2NvcGUubG9naW47XG4gICAgICAgIHZhciB1c2VyID0gbG9naW4udXNlcjtcbiAgICAgICAgdmFyIHBhc3N3b3JkID0gbG9naW4ucGFzc3dvcmQ7XG4gICAgICAgIGlmICh1c2VyICYmIHBhc3N3b3JkKSB7XG4gICAgICAgICAgdmFyIHVzZXJQd2QgPSB1c2VyICsgJzonICsgcGFzc3dvcmQ7XG4gICAgICAgICAgbG9naW4uYXV0aEhlYWRlciA9ICdCYXNpYyAnICsgKHVzZXJQd2QuZW5jb2RlQmFzZTY0KCkpO1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmxvZ291dCA9ICgpID0+IHtcbiAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdO1xuICAgICAgICAkc2NvcGUubG9naW4uYXV0aEhlYWRlciA9IG51bGw7XG4gICAgICAgICRzY29wZS5sb2dpbi5sb2dnZWRJbiA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUubG9naW4uZmFpbGVkID0gZmFsc2U7XG4gICAgICAgIGxvZ2dlZEluVG9Hb2dzID0gZmFsc2U7XG4gICAgICB9O1xuXG5cbiAgICAgICRzY29wZS5vcGVuQ29tbWFuZHMgPSAoKSA9PiB7XG4gICAgICAgIHZhciByZXNvdXJjZVBhdGggPSBudWxsO1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSAkc2NvcGUudGFibGVDb25maWcuc2VsZWN0ZWRJdGVtcztcbiAgICAgICAgaWYgKF8uaXNBcnJheShzZWxlY3RlZCkgJiYgc2VsZWN0ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzb3VyY2VQYXRoID0gc2VsZWN0ZWRbMF0ucGF0aDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbGluayA9IGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgICBsb2cuaW5mbyhcIm1vdmluZyB0byBjb21tYW5kcyBsaW5rOiBcIiArIGxpbmspO1xuICAgICAgICAkbG9jYXRpb24ucGF0aChsaW5rKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGUgPSAocHJvamVjdHMpID0+IHtcbiAgICAgICAgVUkubXVsdGlJdGVtQ29uZmlybUFjdGlvbkRpYWxvZyg8VUkuTXVsdGlJdGVtQ29uZmlybUFjdGlvbk9wdGlvbnM+e1xuICAgICAgICAgIGNvbGxlY3Rpb246IHByb2plY3RzLFxuICAgICAgICAgIGluZGV4OiAncGF0aCcsXG4gICAgICAgICAgb25DbG9zZTogKHJlc3VsdDpib29sZWFuKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgIGRvRGVsZXRlKHByb2plY3RzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHRpdGxlOiAnRGVsZXRlIHByb2plY3RzPycsXG4gICAgICAgICAgYWN0aW9uOiAnVGhlIGZvbGxvd2luZyBwcm9qZWN0cyB3aWxsIGJlIHJlbW92ZWQgKHRob3VnaCB0aGUgZmlsZXMgd2lsbCByZW1haW4gb24geW91ciBmaWxlIHN5c3RlbSk6JyxcbiAgICAgICAgICBva1RleHQ6ICdEZWxldGUnLFxuICAgICAgICAgIG9rQ2xhc3M6ICdidG4tZGFuZ2VyJyxcbiAgICAgICAgICBjdXN0b206IFwiVGhpcyBvcGVyYXRpb24gaXMgcGVybWFuZW50IG9uY2UgY29tcGxldGVkIVwiLFxuICAgICAgICAgIGN1c3RvbUNsYXNzOiBcImFsZXJ0IGFsZXJ0LXdhcm5pbmdcIlxuICAgICAgICB9KS5vcGVuKCk7XG4gICAgICB9O1xuXG5cbiAgICAgIHVwZGF0ZUxpbmtzKCk7XG4gICAgICB3YXRjaFNlY3JldHMoKTtcblxuICAgICAgZnVuY3Rpb24gb25QZXJzb25hbFNlY3JldHMoc2VjcmV0cykge1xuICAgICAgICBpZiAoJHNjb3BlLnNvdXJjZVNlY3JldCkge1xuICAgICAgICAgIHZhciBmb3VuZCA9IGZhbHNlO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzZWNyZXRzLCAoc2VjcmV0KSA9PiB7XG4gICAgICAgICAgICB2YXIgbmFtZSA9IEt1YmVybmV0ZXMuZ2V0TmFtZShzZWNyZXQpO1xuICAgICAgICAgICAgaWYgKG5hbWUgPT09ICRzY29wZS5zb3VyY2VTZWNyZXQpIHtcbiAgICAgICAgICAgICAgLy8gbGV0cyB2ZXJpZnkgdGhhdCBpdCBoYXMgdGhlIHZhbGlkIGZpZWxkc1xuICAgICAgICAgICAgICB2YXIgcmVxdWlyZWREYXRhS2V5cyA9IEt1YmVybmV0ZXMuaHR0cHNTZWNyZXREYXRhS2V5cztcbiAgICAgICAgICAgICAgdmFyIHZhbGlkID0gc2VjcmV0VmFsaWQoc2VjcmV0LCByZXF1aXJlZERhdGFLZXlzKTtcbiAgICAgICAgICAgICAgaWYgKHZhbGlkKSB7XG4gICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwic2VjcmV0IFwiICsgbmFtZSArIFwiIGlzIG5vdCB2YWxpZCwgaXQgZG9lcyBub3QgY29udGFpbiBrZXlzOiBcIiArIHJlcXVpcmVkRGF0YUtleXMgKyBcIiBzbyBjbGVhcmluZyFcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAkc2NvcGUuc291cmNlU2VjcmV0ID0gXCJcIjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gd2F0Y2hTZWNyZXRzKCkge1xuICAgICAgICB2YXIgbmFtZXNwYWNlTmFtZSA9IGdldFNvdXJjZVNlY3JldE5hbWVzcGFjZShsb2NhbFN0b3JhZ2UpO1xuICAgICAgICBLdWJlcm5ldGVzLndhdGNoKCRzY29wZSwgJGVsZW1lbnQsIFwic2VjcmV0c1wiLCBuYW1lc3BhY2VOYW1lLCBvblBlcnNvbmFsU2VjcmV0cyk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGRvRGVsZXRlKHByb2plY3RzKSB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChwcm9qZWN0cywgKHByb2plY3QpID0+IHtcbiAgICAgICAgICBsb2cuaW5mbyhcIkRlbGV0aW5nIFwiICsgYW5ndWxhci50b0pzb24oJHNjb3BlLnByb2plY3RzKSk7XG4gICAgICAgICAgdmFyIHBhdGggPSBwcm9qZWN0LnBhdGg7XG4gICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSByZXBvQXBpVXJsKEZvcmdlQXBpVVJMLCBwYXRoKTtcbiAgICAgICAgICAgICRodHRwLmRlbGV0ZSh1cmwpLlxuICAgICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBcIkZhaWxlZCB0byBQT1NUIHRvIFwiICsgdXJsICsgXCIgZ290IHN0YXR1czogXCIgKyBzdGF0dXM7XG4gICAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oJ2Vycm9yJywgbWVzc2FnZSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZUxpbmtzKCkge1xuICAgICAgICB2YXIgJGdvZ3NMaW5rID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VSZWFkeUxpbmsoZ29nc1NlcnZpY2VOYW1lKTtcbiAgICAgICAgaWYgKCRnb2dzTGluaykge1xuICAgICAgICAgICRzY29wZS5zaWduVXBVcmwgPSBVcmxIZWxwZXJzLmpvaW4oJGdvZ3NMaW5rLCBcInVzZXIvc2lnbl91cFwiKTtcbiAgICAgICAgICAkc2NvcGUuZm9yZ290UGFzc3dvcmRVcmwgPSBVcmxIZWxwZXJzLmpvaW4oJGdvZ3NMaW5rLCBcInVzZXIvZm9yZ2V0X3Bhc3N3b3JkXCIpO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS4kZ29nc0xpbmsgPSAkZ29nc0xpbms7XG4gICAgICAgICRzY29wZS4kZm9yZ2VMaW5rID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VSZWFkeUxpbmsoS3ViZXJuZXRlcy5mYWJyaWM4Rm9yZ2VTZXJ2aWNlTmFtZSk7XG5cbiAgICAgICAgJHNjb3BlLiRoYXNDRFBpcGVsaW5lVGVtcGxhdGUgPSBfLmFueSgkc2NvcGUubW9kZWwudGVtcGxhdGVzLCAodCkgPT4gXCJjZC1waXBlbGluZVwiID09PSBLdWJlcm5ldGVzLmdldE5hbWUodCkpO1xuXG4gICAgICAgIHZhciBleHBlY3RlZFJDUyA9IFtLdWJlcm5ldGVzLmdvZ3NTZXJ2aWNlTmFtZSwgS3ViZXJuZXRlcy5mYWJyaWM4Rm9yZ2VTZXJ2aWNlTmFtZSwgS3ViZXJuZXRlcy5qZW5raW5zU2VydmljZU5hbWVdO1xuICAgICAgICB2YXIgcmVxdWlyZWRSQ3MgPSB7fTtcbiAgICAgICAgdmFyIG5zID0gS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgICB2YXIgcnVubmluZ0NEUGlwZWxpbmUgPSB0cnVlO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goZXhwZWN0ZWRSQ1MsIChyY05hbWUpID0+IHtcbiAgICAgICAgICB2YXIgcmMgPSAkc2NvcGUubW9kZWwuZ2V0UmVwbGljYXRpb25Db250cm9sbGVyKG5zLCByY05hbWUpO1xuICAgICAgICAgIGlmIChyYykge1xuICAgICAgICAgICAgcmVxdWlyZWRSQ3NbcmNOYW1lXSA9IHJjO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBydW5uaW5nQ0RQaXBlbGluZSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgICRzY29wZS4kcmVxdWlyZWRSQ3MgPSByZXF1aXJlZFJDcztcbiAgICAgICAgJHNjb3BlLiRydW5uaW5nQ0RQaXBlbGluZSA9IHJ1bm5pbmdDRFBpcGVsaW5lO1xuICAgICAgICB2YXIgdXJsID0gXCJcIjtcbiAgICAgICAgJGxvY2F0aW9uID0gS3ViZXJuZXRlcy5pbmplY3QoXCIkbG9jYXRpb25cIik7XG4gICAgICAgIGlmICgkbG9jYXRpb24pIHtcbiAgICAgICAgICB1cmwgPSAkbG9jYXRpb24udXJsKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICB1cmwgPSB3aW5kb3cubG9jYXRpb24udG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIHNob3VsZCB3ZSBzdXBwb3J0IGFueSBvdGhlciB0ZW1wbGF0ZSBuYW1lc3BhY2VzP1xuICAgICAgICB2YXIgdGVtcGxhdGVOYW1lc3BhY2UgPSBcImRlZmF1bHRcIjtcbiAgICAgICAgJHNjb3BlLiRydW5DRFBpcGVsaW5lTGluayA9IFwiL2t1YmVybmV0ZXMvbmFtZXNwYWNlL1wiICsgdGVtcGxhdGVOYW1lc3BhY2UgKyBcIi90ZW1wbGF0ZXMvXCIgKyBucyArIFwiP3E9Y2QtcGlwZWxpbmUmcmV0dXJuVG89XCIgKyBlbmNvZGVVUklDb21wb25lbnQodXJsKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gdXBkYXRlRGF0YSgpIHtcbiAgICAgICAgdmFyIGF1dGhIZWFkZXIgPSAkc2NvcGUubG9naW4uYXV0aEhlYWRlcjtcbiAgICAgICAgdmFyIGVtYWlsID0gJHNjb3BlLmxvZ2luLmVtYWlsIHx8IFwiXCI7XG4gICAgICAgIGlmIChhdXRoSGVhZGVyKSB7XG4gICAgICAgICAgdmFyIHVybCA9IHJlcG9zQXBpVXJsKEZvcmdlQXBpVVJMKTtcbiAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKCRzY29wZS5wcm9qZWN0SWQsIHVybCwgYXV0aEhlYWRlciwgZW1haWwpO1xuICAgICAgICAgIHZhciBjb25maWcgPSB7XG4vKlxuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICBHb2dzQXV0aG9yaXphdGlvbjogYXV0aEhlYWRlcixcbiAgICAgICAgICAgICAgR29nc0VtYWlsOiBlbWFpbFxuICAgICAgICAgICAgfVxuKi9cbiAgICAgICAgICB9O1xuICAgICAgICAgICRodHRwLmdldCh1cmwsIGNvbmZpZykuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUubG9naW4uZmFpbGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dpbi5sb2dnZWRJbiA9IHRydWU7XG4gICAgICAgICAgICAgIGxvZ2dlZEluVG9Hb2dzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdmFyIGF2YXRhcl91cmwgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICBpZiAoIWRhdGEgfHwgIWFuZ3VsYXIuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgZGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBsZXRzIHN0b3JlIGEgc3VjY2Vzc2Z1bCBsb2dpbiBzbyB0aGF0IHdlIGhpZGUgdGhlIGxvZ2luIHBhZ2VcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXSA9IGF1dGhIZWFkZXI7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdID0gZW1haWw7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl0gPSAkc2NvcGUubG9naW4udXNlciB8fCBcIlwiO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnByb2plY3RzID0gXy5zb3J0QnkoZGF0YSwgXCJuYW1lXCIpO1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUucHJvamVjdHMsIChyZXBvKSA9PiB7XG4gICAgICAgICAgICAgICAgICBlbnJpY2hSZXBvKHJlcG8pO1xuICAgICAgICAgICAgICAgICAgaWYgKCFhdmF0YXJfdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIGF2YXRhcl91cmwgPSBDb3JlLnBhdGhHZXQocmVwbywgW1wib3duZXJcIiwgXCJhdmF0YXJfdXJsXCJdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF2YXRhcl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9naW4uYXZhdGFyX3VybCA9IGF2YXRhcl91cmw7XG4gICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXSA9IGF2YXRhcl91cmw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dvdXQoKTtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmZhaWxlZCA9IHRydWU7XG4gICAgICAgICAgICAgIGlmIChzdGF0dXMgIT09IDQwMykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHVwZGF0ZURhdGEoKTtcblxuICAgIH1dKTtcbn1cbiIsIi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBjb25zdCBzZWNyZXROYW1lc3BhY2VLZXkgPSBcImZhYnJpYzhTb3VyY2VTZWNyZXROYW1lc3BhY2VcIjtcbiAgY29uc3Qgc2VjcmV0TmFtZUtleSA9IFwiZmFicmljOFNvdXJjZVNlY3JldFwiO1xuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRTb3VyY2VTZWNyZXROYW1lc3BhY2UobG9jYWxTdG9yYWdlKSB7XG4gICAgdmFyIHNlY3JldE5hbWVzcGFjZSA9IGxvY2FsU3RvcmFnZVtzZWNyZXROYW1lc3BhY2VLZXldO1xuICAgIHZhciB1c2VyTmFtZSA9IEt1YmVybmV0ZXMuY3VycmVudFVzZXJOYW1lKCk7XG4gICAgaWYgKCFzZWNyZXROYW1lc3BhY2UpIHtcbiAgICAgIHNlY3JldE5hbWVzcGFjZSA9IFwidXNlci1zZWNyZXRzLXNvdXJjZS1cIiArIHVzZXJOYW1lO1xuICAgIH1cbiAgICByZXR1cm4gc2VjcmV0TmFtZXNwYWNlO1xuICB9XG5cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsIG5zLCBwcm9qZWN0SWQpIHtcbiAgICBpZiAoIW5zKSB7XG4gICAgICBucyA9IEt1YmVybmV0ZXMuY3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoKTtcbiAgICB9XG4gICAgdmFyIHNlY3JldEtleSA9IGNyZWF0ZUxvY2FsU3RvcmFnZUtleShzZWNyZXROYW1lS2V5LCBucywgcHJvamVjdElkKTtcbiAgICB2YXIgc291cmNlU2VjcmV0ID0gbG9jYWxTdG9yYWdlW3NlY3JldEtleV07XG4gICAgcmV0dXJuIHNvdXJjZVNlY3JldDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzZXRQcm9qZWN0U291cmNlU2VjcmV0KGxvY2FsU3RvcmFnZSwgbnMsIHByb2plY3RJZCwgc2VjcmV0TmFtZSkge1xuICAgIHZhciBzZWNyZXRLZXkgPSBjcmVhdGVMb2NhbFN0b3JhZ2VLZXkoc2VjcmV0TmFtZUtleSwgbnMsIHByb2plY3RJZCk7XG4gICAgbG9jYWxTdG9yYWdlW3NlY3JldEtleV0gPSBzZWNyZXROYW1lO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNlY3JldFZhbGlkKHNlY3JldCwgcmVxdWlyZWREYXRhS2V5cykge1xuICAgIHZhciBkYXRhID0gc2VjcmV0LmRhdGE7XG4gICAgdmFyIHZhbGlkID0gdHJ1ZTtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgYW5ndWxhci5mb3JFYWNoKHJlcXVpcmVkRGF0YUtleXMsIChrZXkpID0+IHtcbiAgICAgICAgaWYgKCFkYXRhW2tleV0pIHtcbiAgICAgICAgICB2YWxpZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsaWQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbGlkO1xuICB9XG5cblxuICBleHBvcnQgZnVuY3Rpb24gcGFyc2VVcmwodXJsKSB7XG4gICAgaWYgKHVybCkge1xuICAgICAgdmFyIHBhcnNlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgIHBhcnNlci5ocmVmID0gdXJsO1xuICAgICAgcmV0dXJuIHBhcnNlcjtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHByb3RvY29sOiBcIlwiLFxuICAgICAgaG9zdDogXCJcIlxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVMb2NhbFN0b3JhZ2VLZXkocHJlZml4LCBucywgbmFtZSkge1xuICAgIHJldHVybiBwcmVmaXggKyBcIi9cIiArIG5zICsgXCIvXCIgKyAobmFtZSB8fCBcIlwiKTtcbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJzZWNyZXRIZWxwZXJzLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG5cbiAgZXhwb3J0IHZhciBTZWNyZXRzQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJTZWNyZXRzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiRlbGVtZW50XCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkbG9jYXRpb25cIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJGb3JnZU1vZGVsXCIsIFwiS3ViZXJuZXRlc01vZGVsXCIsXG4gICAgKCRzY29wZSwgJGRpYWxvZywgJHdpbmRvdywgJGVsZW1lbnQsICR0ZW1wbGF0ZUNhY2hlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwsIEt1YmVybmV0ZXNNb2RlbCkgPT4ge1xuXG4gICAgICAkc2NvcGUubW9kZWwgPSBLdWJlcm5ldGVzTW9kZWw7XG5cbiAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTZXR0aW5nc0JyZWFkY3J1bWJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U2V0dGluZ3NTdWJOYXZCYXJzKCRzY29wZS5wcm9qZWN0SWQpO1xuXG5cbiAgICAgIHZhciBwcm9qZWN0SWQgPSAkc2NvcGUucHJvamVjdElkO1xuICAgICAgdmFyIG5zID0gJHNjb3BlLm5hbWVzcGFjZTtcbiAgICAgIHZhciB1c2VyTmFtZSA9IEt1YmVybmV0ZXMuY3VycmVudFVzZXJOYW1lKCk7XG5cbiAgICAgIHZhciBjcmVhdGVkU2VjcmV0ID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wic2VjcmV0XCJdO1xuICAgICAgdmFyIHByb2plY3RDbGllbnQgPSBLdWJlcm5ldGVzLmNyZWF0ZUt1YmVybmV0ZXNDbGllbnQoXCJwcm9qZWN0c1wiKTtcblxuICAgICAgJHNjb3BlLnJlcXVpcmVkRGF0YUtleXMgPSBLdWJlcm5ldGVzLmh0dHBzU2VjcmV0RGF0YUtleXM7XG4gICAgICAkc2NvcGUuc291cmNlU2VjcmV0TmFtZXNwYWNlID0gZ2V0U291cmNlU2VjcmV0TmFtZXNwYWNlKGxvY2FsU3RvcmFnZSk7XG4gICAgICAkc2NvcGUuc2V0dXBTZWNyZXRzTGluayA9IERldmVsb3Blci5wcm9qZWN0U2VjcmV0c0xpbmsobnMsIHByb2plY3RJZCk7XG4gICAgICAkc2NvcGUuc2VjcmV0TmFtZXNwYWNlTGluayA9IERldmVsb3Blci5zZWNyZXRzTmFtZXNwYWNlTGluayhucywgcHJvamVjdElkLCAkc2NvcGUuc291cmNlU2VjcmV0TmFtZXNwYWNlKTtcblxuICAgICAgZ2V0Q3VycmVudFNlY3JldE5hbWUoKTtcblxuICAgICAgbG9nLmRlYnVnKFwiRm91bmQgc291cmNlIHNlY3JldCBuYW1lc3BhY2UgXCIgKyAkc2NvcGUuc291cmNlU2VjcmV0TmFtZXNwYWNlKTtcbiAgICAgIGxvZy5kZWJ1ZyhcIkZvdW5kIHNvdXJjZSBzZWNyZXQgZm9yIFwiICsgbnMgKyBcIi9cIiArIHByb2plY3RJZCArIFwiID0gXCIgKyAkc2NvcGUuc291cmNlU2VjcmV0KTtcblxuICAgICAgJHNjb3BlLiRvbignJHJvdXRlVXBkYXRlJywgKCRldmVudCkgPT4ge1xuICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICB9KTtcblxuICAgICAgJHNjb3BlLiRvbigna3ViZXJuZXRlc01vZGVsVXBkYXRlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgfSk7XG5cbiAgICAgICRzY29wZS50YWJsZUNvbmZpZyA9IHtcbiAgICAgICAgZGF0YTogJ2ZpbHRlcmVkU2VjcmV0cycsXG4gICAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlUm93Q2xpY2tTZWxlY3Rpb246IHRydWUsXG4gICAgICAgIG11bHRpU2VsZWN0OiBmYWxzZSxcbiAgICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgICBmaWx0ZXJUZXh0OiAkbG9jYXRpb24uc2VhcmNoKClbXCJxXCJdIHx8ICcnXG4gICAgICAgIH0sXG4gICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ19rZXknLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdTZWNyZXQgTmFtZScsXG4gICAgICAgICAgICBkZWZhdWx0U29ydDogdHJ1ZSxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0IG5vd3JhcFwiPnt7cm93LmVudGl0eS5tZXRhZGF0YS5uYW1lfX08L2Rpdj4nXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJyRsYWJlbHNUZXh0JyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTGFiZWxzJyxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwibGFiZWxUZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfSxcbiAgICAgICAgXVxuICAgICAgfTtcblxuICAgICAgaWYgKGNyZWF0ZWRTZWNyZXQpIHtcbiAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChcInNlY3JldFwiLCBudWxsKTtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkU2VjcmV0TmFtZSA9IGNyZWF0ZWRTZWNyZXQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxlY3RlZFNlY3JldE5hbWUoKTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oXCJ0YWJsZUNvbmZpZy5zZWxlY3RlZEl0ZW1zXCIsICgpID0+IHtcbiAgICAgICAgc2VsZWN0ZWRTZWNyZXROYW1lKCk7XG4gICAgICB9KTtcblxuICAgICAgZnVuY3Rpb24gdXBkYXRlRGF0YSgpIHtcbiAgICAgICAgY2hlY2tOYW1lc3BhY2VDcmVhdGVkKCk7XG4gICAgICAgIHVwZGF0ZVByb2plY3QoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH1cblxuICAgICAgY2hlY2tOYW1lc3BhY2VDcmVhdGVkKCk7XG5cbiAgICAgIGZ1bmN0aW9uIGdldEN1cnJlbnRTZWNyZXROYW1lKCkge1xuICAgICAgICB2YXIgYW5zd2VyID0gbnVsbDtcbiAgICAgICAgaWYgKGNyZWF0ZWRTZWNyZXQpIHtcbiAgICAgICAgICBhbnN3ZXIgPSBjcmVhdGVkU2VjcmV0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBsb2NhbFN0b3JlZFNlY3JldE5hbWUgPSBnZXRQcm9qZWN0U291cmNlU2VjcmV0KGxvY2FsU3RvcmFnZSwgbnMsIHByb2plY3RJZCk7XG4gICAgICAgICAgaWYgKGxvY2FsU3RvcmVkU2VjcmV0TmFtZSkge1xuICAgICAgICAgICAgLy8gbGV0cyBjaGVjayB0aGF0IGl0cyB2YWxpZCBhbmQgaWYgbm90IGxldHMgY2xlYXIgaXRcbiAgICAgICAgICAgIGlmICgkc2NvcGUucGVyc29uYWxTZWNyZXRzICYmICRzY29wZS5wZXJzb25hbFNlY3JldHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHZhciB2YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLnBlcnNvbmFsU2VjcmV0cywgKHNlY3JldCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChsb2NhbFN0b3JlZFNlY3JldE5hbWUgPT09IEt1YmVybmV0ZXMuZ2V0TmFtZShzZWNyZXQpKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoc2VjcmV0VmFsaWQoc2VjcmV0LCAkc2NvcGUucmVxdWlyZWREYXRhS2V5cykpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGlmICghdmFsaWQpIHtcbiAgICAgICAgICAgICAgICBsb2cuaW5mbyhcIkNsZWFyaW5nIHNlY3JldCBuYW1lIGNvbmZpZ3VyYXRpb246IFwiICsgbG9jYWxTdG9yZWRTZWNyZXROYW1lICsgXCIgYXMgdGhlIHNlY3JldCBubyBsb25nZXIgZXhpc3RzIVwiKTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JlZFNlY3JldE5hbWUgPSBcIlwiO1xuICAgICAgICAgICAgICAgIHNldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCBucywgcHJvamVjdElkLCBsb2NhbFN0b3JlZFNlY3JldE5hbWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGFuc3dlciA9IGxvY2FsU3RvcmVkU2VjcmV0TmFtZTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuc291cmNlU2VjcmV0ID0gYW5zd2VyO1xuICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBzZWxlY3RlZFNlY3JldE5hbWUoKSB7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZFNlY3JldE5hbWUgPSBnZXRDdXJyZW50U2VjcmV0TmFtZSgpO1xuICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS50YWJsZUNvbmZpZy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtcyAmJiBzZWxlY3RlZEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgIHZhciBzZWNyZXQgPSBzZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICAgIHZhciBuYW1lID0gS3ViZXJuZXRlcy5nZXROYW1lKHNlY3JldCk7XG4gICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZFNlY3JldE5hbWUgPSBuYW1lO1xuICAgICAgICAgICAgaWYgKGNyZWF0ZWRTZWNyZXQgJiYgbmFtZSAhPT0gY3JlYXRlZFNlY3JldCkge1xuICAgICAgICAgICAgICAvLyBsZXRzIGNsZWFyIHRoZSBwcmV2aW91c2x5IGNyZWF0ZWQgc2VjcmV0XG4gICAgICAgICAgICAgIGNyZWF0ZWRTZWNyZXQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJHNjb3BlLnNlbGVjdGVkU2VjcmV0TmFtZTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUudGFibGVDb25maWcuc2VsZWN0ZWRJdGVtcztcbiAgICAgICAgc2VsZWN0ZWRJdGVtcy5zcGxpY2UoMCwgc2VsZWN0ZWRJdGVtcy5sZW5ndGgpO1xuICAgICAgICB2YXIgY3VycmVudCA9IGdldEN1cnJlbnRTZWNyZXROYW1lKCk7XG4gICAgICAgIGlmIChjdXJyZW50KSB7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5wZXJzb25hbFNlY3JldHMsIChzZWNyZXQpID0+IHtcbiAgICAgICAgICAgIGlmICghc2VsZWN0ZWRJdGVtcy5sZW5ndGggJiYgY3VycmVudCA9PT0gS3ViZXJuZXRlcy5nZXROYW1lKHNlY3JldCkpIHtcbiAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtcy5wdXNoKHNlY3JldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnRhYmxlQ29uZmlnLnNlbGVjdGVkSXRlbXMgPSBzZWxlY3RlZEl0ZW1zO1xuICAgICAgICBzZWxlY3RlZFNlY3JldE5hbWUoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5jYW5TYXZlID0gKCkgPT4ge1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSBzZWxlY3RlZFNlY3JldE5hbWUoKTtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBnZXRDdXJyZW50U2VjcmV0TmFtZSgpO1xuICAgICAgICByZXR1cm4gc2VsZWN0ZWQgJiYgKHNlbGVjdGVkICE9PSBjdXJyZW50IHx8IHNlbGVjdGVkID09IGNyZWF0ZWRTZWNyZXQpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLnNhdmUgPSAoKSA9PiB7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9IHNlbGVjdGVkU2VjcmV0TmFtZSgpO1xuICAgICAgICBpZiAoc2VsZWN0ZWQpIHtcbiAgICAgICAgICBzZXRQcm9qZWN0U291cmNlU2VjcmV0KGxvY2FsU3RvcmFnZSwgbnMsIHByb2plY3RJZCwgc2VsZWN0ZWQpO1xuXG4gICAgICAgICAgaWYgKCFwcm9qZWN0SWQpIHtcbiAgICAgICAgICAgIC8vIGxldHMgcmVkaXJlY3QgYmFjayB0byB0aGUgY3JlYXRlIHByb2plY3QgcGFnZVxuICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RMaW5rKG5zKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBjaGVja05hbWVzcGFjZUNyZWF0ZWQoKTtcblxuXG4gICAgICBmdW5jdGlvbiB1cGRhdGVQcm9qZWN0KCkge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLm1vZGVsLmJ1aWxkY29uZmlncywgKHByb2plY3QpID0+IHtcbiAgICAgICAgICBpZiAocHJvamVjdElkID09PSBLdWJlcm5ldGVzLmdldE5hbWUocHJvamVjdCkpIHtcbiAgICAgICAgICAgICRzY29wZS5wcm9qZWN0ID0gcHJvamVjdDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUuZ2l0VXJsID0gQ29yZS5wYXRoR2V0KCRzY29wZS5wcm9qZWN0LCBbJ3NwZWMnLCAnc291cmNlJywgJ2dpdCcsICd1cmknXSk7XG4gICAgICAgIHZhciBwYXJzZXIgPSBwYXJzZVVybCgkc2NvcGUuZ2l0VXJsKTtcbiAgICAgICAgdmFyIGtpbmQgPSBwYXJzZXIucHJvdG9jb2w7XG4gICAgICAgIC8vIHRoZXNlIGtpbmRzIG9mIFVSTHMgc2hvdyB1cCBhcyBodHRwXG4gICAgICAgIGlmICghJHNjb3BlLmdpdFVybCkge1xuICAgICAgICAgIGtpbmQgPSBcImh0dHBzXCI7XG4gICAgICAgIH0gZWxzZSBpZiAoJHNjb3BlLmdpdFVybCAmJiAkc2NvcGUuZ2l0VXJsLnN0YXJ0c1dpdGgoXCJnaXRAXCIpKSB7XG4gICAgICAgICAga2luZCA9IFwic3NoXCI7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGhvc3QgPSBwYXJzZXIuaG9zdDtcbiAgICAgICAgdmFyIHJlcXVpcmVkRGF0YUtleXMgPSBLdWJlcm5ldGVzLnNzaFNlY3JldERhdGFLZXlzO1xuICAgICAgICBpZiAoa2luZCAmJiBraW5kLnN0YXJ0c1dpdGgoJ2h0dHAnKSkge1xuICAgICAgICAgIGtpbmQgPSAnaHR0cHMnO1xuICAgICAgICAgIHJlcXVpcmVkRGF0YUtleXMgPSBLdWJlcm5ldGVzLmh0dHBzU2VjcmV0RGF0YUtleXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAga2luZCA9ICdzc2gnO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS5raW5kID0ga2luZDtcbiAgICAgICAgJHNjb3BlLnJlcXVpcmVkRGF0YUtleXMgPSByZXF1aXJlZERhdGFLZXlzO1xuICAgICAgICB2YXIgc2F2ZWRVcmwgPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgICBjb25zdCBuZXdTZWNyZXRQYXRoID0gVXJsSGVscGVycy5qb2luKFwibmFtZXNwYWNlXCIsICRzY29wZS5zb3VyY2VTZWNyZXROYW1lc3BhY2UsIFwic2VjcmV0Q3JlYXRlP2tpbmQ9XCIgKyBraW5kICsgXCImc2F2ZWRVcmw9XCIgKyBzYXZlZFVybCk7XG4gICAgICAgICRzY29wZS5hZGROZXdTZWNyZXRMaW5rID0gKHByb2plY3RJZCkgP1xuICAgICAgICAgIERldmVsb3Blci5wcm9qZWN0V29ya3NwYWNlTGluayhucywgcHJvamVjdElkLCBuZXdTZWNyZXRQYXRoKSA6XG4gICAgICAgICAgVXJsSGVscGVycy5qb2luKEhhd3Rpb0NvcmUuZG9jdW1lbnRCYXNlKCksIEt1YmVybmV0ZXMuY29udGV4dCwgbmV3U2VjcmV0UGF0aCk7XG5cbiAgICAgICAgdmFyIGZpbHRlcmVkU2VjcmV0cyA9IFtdO1xuICAgICAgICB2YXIgc2VsZWN0aW9uID0gW107XG4gICAgICAgIHZhciBjdXJyZW50U2VjcmV0TmFtZSA9IGdldEN1cnJlbnRTZWNyZXROYW1lKCk7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUucGVyc29uYWxTZWNyZXRzLCAoc2VjcmV0KSA9PiB7XG4gICAgICAgICAgdmFyIHZhbGlkID0gc2VjcmV0VmFsaWQoc2VjcmV0LCByZXF1aXJlZERhdGFLZXlzKTtcbiAgICAgICAgICBpZiAodmFsaWQpIHtcbiAgICAgICAgICAgIHZhciBzZWNyZXROYW1lID0gS3ViZXJuZXRlcy5nZXROYW1lKHNlY3JldCk7XG4gICAgICAgICAgICBzZWNyZXRbXCJfa2V5XCJdID0gc2VjcmV0TmFtZTtcbiAgICAgICAgICAgIGZpbHRlcmVkU2VjcmV0cy5wdXNoKHNlY3JldCk7XG4gICAgICAgICAgICBpZiAoc2VjcmV0TmFtZSA9PT0gY3VycmVudFNlY3JldE5hbWUpIHtcbiAgICAgICAgICAgICAgc2VsZWN0aW9uLnB1c2goc2VjcmV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUuZmlsdGVyZWRTZWNyZXRzID0gXy5zb3J0QnkoZmlsdGVyZWRTZWNyZXRzLCBcIl9rZXlcIik7XG4gICAgICAgICRzY29wZS50YWJsZUNvbmZpZy5zZWxlY3RlZEl0ZW1zID0gc2VsZWN0aW9uO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvblBlcnNvbmFsU2VjcmV0cyhzZWNyZXRzKSB7XG4gICAgICAgICRzY29wZS5wZXJzb25hbFNlY3JldHMgPSBzZWNyZXRzO1xuICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICRzY29wZS5jYW5jZWwoKTtcbiAgICAgICAgdXBkYXRlUHJvamVjdCgpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvbkJ1aWxkQ29uZmlncyhidWlsZGNvbmZpZ3MpIHtcbiAgICAgICAgaWYgKG9uQnVpbGRDb25maWdzICYmICEoJHNjb3BlLm1vZGVsLmJ1aWxkY29uZmlncyB8fCBbXSkubGVuZ3RoKSB7XG4gICAgICAgICAgJHNjb3BlLm1vZGVsLmJ1aWxkY29uZmlncyA9IGJ1aWxkY29uZmlncztcbiAgICAgICAgfVxuICAgICAgICB1cGRhdGVQcm9qZWN0KCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNoZWNrTmFtZXNwYWNlQ3JlYXRlZCgpIHtcbiAgICAgICAgdmFyIG5hbWVzcGFjZU5hbWUgPSBnZXRTb3VyY2VTZWNyZXROYW1lc3BhY2UobG9jYWxTdG9yYWdlKTtcblxuICAgICAgICBmdW5jdGlvbiB3YXRjaFNlY3JldHMoKSB7XG4gICAgICAgICAgbG9nLmluZm8oXCJ3YXRjaGluZyBzZWNyZXRzIG9uIG5hbWVzcGFjZTogXCIgKyBuYW1lc3BhY2VOYW1lKTtcbiAgICAgICAgICBLdWJlcm5ldGVzLndhdGNoKCRzY29wZSwgJGVsZW1lbnQsIFwic2VjcmV0c1wiLCBuYW1lc3BhY2VOYW1lLCBvblBlcnNvbmFsU2VjcmV0cyk7XG4gICAgICAgICAgS3ViZXJuZXRlcy53YXRjaCgkc2NvcGUsICRlbGVtZW50LCBcImJ1aWxkY29uZmlnc1wiLCBucywgb25CdWlsZENvbmZpZ3MpO1xuICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoISRzY29wZS5zZWNyZXROYW1lc3BhY2UpIHtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLm1vZGVsLnByb2plY3RzLCAocHJvamVjdCkgPT4ge1xuICAgICAgICAgICAgdmFyIG5hbWUgPSBLdWJlcm5ldGVzLmdldE5hbWUocHJvamVjdCk7XG4gICAgICAgICAgICBpZiAobmFtZSA9PT0gbmFtZXNwYWNlTmFtZSkge1xuICAgICAgICAgICAgICAkc2NvcGUuc2VjcmV0TmFtZXNwYWNlID0gcHJvamVjdDtcbiAgICAgICAgICAgICAgd2F0Y2hTZWNyZXRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoISRzY29wZS5zZWNyZXROYW1lc3BhY2UgJiYgJHNjb3BlLm1vZGVsLnByb2plY3RzICYmICRzY29wZS5tb2RlbC5wcm9qZWN0cy5sZW5ndGgpIHtcbiAgICAgICAgICBsb2cuaW5mbyhcIkNyZWF0aW5nIGEgbmV3IG5hbWVzcGFjZSBmb3IgdGhlIHVzZXIgc2VjcmV0cy4uLi4gXCIgKyBuYW1lc3BhY2VOYW1lKTtcbiAgICAgICAgICB2YXIgcHJvamVjdCA9IHtcbiAgICAgICAgICAgIGFwaVZlcnNpb246IEt1YmVybmV0ZXMuZGVmYXVsdEFwaVZlcnNpb24sXG4gICAgICAgICAgICBraW5kOiBcIlByb2plY3RcIixcbiAgICAgICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgICAgIG5hbWU6IG5hbWVzcGFjZU5hbWUsXG4gICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgIHVzZXI6IHVzZXJOYW1lLFxuICAgICAgICAgICAgICAgIGdyb3VwOiAnc2VjcmV0cycsXG4gICAgICAgICAgICAgICAgcHJvamVjdDogJ3NvdXJjZSdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBwcm9qZWN0Q2xpZW50LnB1dChwcm9qZWN0LFxuICAgICAgICAgICAgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgJHNjb3BlLnNlY3JldE5hbWVzcGFjZSA9IHByb2plY3Q7XG4gICAgICAgICAgICAgIHdhdGNoU2VjcmV0cygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgbG9nLndhcm4oXCJGYWlsZWQgdG8gY3JlYXRlIHNlY3JldCBuYW1lc3BhY2U6IFwiICsgbmFtZXNwYWNlTmFtZSArIFwiOiBcIiArIGFuZ3VsYXIudG9Kc29uKGVycikpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XSk7XG59XG4iLCIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxubW9kdWxlIE1haW4ge1xuXG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9IFwiZmFicmljOC1jb25zb2xlXCI7XG5cbiAgZXhwb3J0IHZhciBsb2c6IExvZ2dpbmcuTG9nZ2VyID0gTG9nZ2VyLmdldChwbHVnaW5OYW1lKTtcblxuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IFwicGx1Z2lucy9tYWluL2h0bWxcIjtcblxuICAvLyBrdWJlcm5ldGVzIHNlcnZpY2UgbmFtZXNcbiAgZXhwb3J0IHZhciBjaGF0U2VydmljZU5hbWUgPSBcImxldHNjaGF0XCI7XG4gIGV4cG9ydCB2YXIgZ3JhZmFuYVNlcnZpY2VOYW1lID0gXCJncmFmYW5hXCI7XG4gIGV4cG9ydCB2YXIgYXBwTGlicmFyeVNlcnZpY2VOYW1lID0gXCJhcHAtbGlicmFyeVwiO1xuXG4gIGV4cG9ydCB2YXIgdmVyc2lvbjphbnkgPSB7fTtcblxufVxuIiwiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9mb3JnZS90cy9mb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWFpbkdsb2JhbHMudHNcIi8+XG5cbm1vZHVsZSBNYWluIHtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbRm9yZ2UucGx1Z2luTmFtZV0pO1xuXG4gIHZhciB0YWIgPSB1bmRlZmluZWQ7XG5cbiAgX21vZHVsZS5ydW4oKCRyb290U2NvcGUsIEhhd3Rpb05hdjogSGF3dGlvTWFpbk5hdi5SZWdpc3RyeSwgS3ViZXJuZXRlc01vZGVsLCBTZXJ2aWNlUmVnaXN0cnksIHByZWZlcmVuY2VzUmVnaXN0cnkpID0+IHtcblxuICAgIEhhd3Rpb05hdi5vbihIYXd0aW9NYWluTmF2LkFjdGlvbnMuQ0hBTkdFRCwgcGx1Z2luTmFtZSwgKGl0ZW1zKSA9PiB7XG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHN3aXRjaChpdGVtLmlkKSB7XG4gICAgICAgICAgY2FzZSAnZm9yZ2UnOlxuICAgICAgICAgIGNhc2UgJ2p2bSc6XG4gICAgICAgICAgY2FzZSAnd2lraSc6XG4gICAgICAgICAgY2FzZSAnZG9ja2VyLXJlZ2lzdHJ5JzpcbiAgICAgICAgICAgIGl0ZW0uaXNWYWxpZCA9ICgpID0+IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAnbGlicmFyeScsXG4gICAgICB0aXRsZTogKCkgPT4gJ0xpYnJhcnknLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgdGhlIGxpYnJhcnkgb2YgYXBwbGljYXRpb25zJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGFwcExpYnJhcnlTZXJ2aWNlTmFtZSkgJiYgU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoXCJhcHAtbGlicmFyeS1qb2xva2lhXCIpLFxuICAgICAgaHJlZjogKCkgPT4gXCIvd2lraS92aWV3XCIsXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIHZhciBraWJhbmFTZXJ2aWNlTmFtZSA9IEt1YmVybmV0ZXMua2liYW5hU2VydmljZU5hbWU7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAna2liYW5hJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0xvZ3MnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgYW5kIHNlYXJjaCBhbGwgbG9ncyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgS2liYW5hIGFuZCBFbGFzdGljU2VhcmNoJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGtpYmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IEt1YmVybmV0ZXMua2liYW5hTG9nc0xpbmsoU2VydmljZVJlZ2lzdHJ5KSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2FwaW1hbicsXG4gICAgICB0aXRsZTogKCkgPT4gJ0FQSSBNYW5hZ2VtZW50JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdBZGQgUG9saWNpZXMgYW5kIFBsYW5zIHRvIHlvdXIgQVBJcyB3aXRoIEFwaW1hbicsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZSgnYXBpbWFuJyksXG4gICAgICBvbGRIcmVmOiAoKSA9PiB7IC8qIG5vdGhpbmcgdG8gZG8gKi8gfSxcbiAgICAgIGhyZWY6ICgpID0+IHtcbiAgICAgICAgdmFyIGhhc2ggPSB7XG4gICAgICAgICAgYmFja1RvOiBuZXcgVVJJKCkudG9TdHJpbmcoKSxcbiAgICAgICAgICB0b2tlbjogSGF3dGlvT0F1dGguZ2V0T0F1dGhUb2tlbigpXG4gICAgICAgIH07XG4gICAgICAgIHZhciB1cmkgPSBuZXcgVVJJKFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluaygnYXBpbWFuJykpO1xuICAgICAgICAvLyBUT0RPIGhhdmUgdG8gb3ZlcndyaXRlIHRoZSBwb3J0IGhlcmUgZm9yIHNvbWUgcmVhc29uXG4gICAgICAgICg8YW55PnVyaS5wb3J0KCc4MCcpLnF1ZXJ5KHt9KS5wYXRoKCdhcGltYW51aS9pbmRleC5odG1sJykpLmhhc2goVVJJLmVuY29kZShhbmd1bGFyLnRvSnNvbihoYXNoKSkpO1xuICAgICAgICByZXR1cm4gdXJpLnRvU3RyaW5nKCk7XG4gICAgICB9ICAgIFxuICAgIH0pO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2dyYWZhbmEnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnTWV0cmljcycsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlld3MgbWV0cmljcyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgR3JhZmFuYSBhbmQgSW5mbHV4REInLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoZ3JhZmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhncmFmYW5hU2VydmljZU5hbWUpLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiBcImNoYXRcIixcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0NoYXQnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NoYXQgcm9vbSBmb3IgZGlzY3Vzc2luZyB0aGlzIG5hbWVzcGFjZScsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShjaGF0U2VydmljZU5hbWUpLFxuICAgICAgaHJlZjogKCkgPT4ge1xuICAgICAgICB2YXIgYW5zd2VyID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKGNoYXRTZXJ2aWNlTmFtZSk7XG4gICAgICAgIGlmIChhbnN3ZXIpIHtcbi8qXG4gICAgICAgICAgVE9ETyBhZGQgYSBjdXN0b20gbGluayB0byB0aGUgY29ycmVjdCByb29tIGZvciB0aGUgY3VycmVudCBuYW1lc3BhY2U/XG5cbiAgICAgICAgICB2YXIgaXJjSG9zdCA9IFwiXCI7XG4gICAgICAgICAgdmFyIGlyY1NlcnZpY2UgPSBTZXJ2aWNlUmVnaXN0cnkuZmluZFNlcnZpY2UoXCJodWJvdFwiKTtcbiAgICAgICAgICBpZiAoaXJjU2VydmljZSkge1xuICAgICAgICAgICAgaXJjSG9zdCA9IGlyY1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpcmNIb3N0KSB7XG4gICAgICAgICAgICB2YXIgbmljayA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdIHx8IGxvY2FsU3RvcmFnZVtcImlyY05pY2tcIl0gfHwgXCJteW5hbWVcIjtcbiAgICAgICAgICAgIHZhciByb29tID0gXCIjZmFicmljOC1cIiArICBjdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgICAgICAgYW5zd2VyID0gVXJsSGVscGVycy5qb2luKGFuc3dlciwgXCIva2l3aVwiLCBpcmNIb3N0LCBcIj8mbmljaz1cIiArIG5pY2sgKyByb29tKTtcbiAgICAgICAgICB9XG4qL1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICB9LFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICAvLyBUT0RPIHdlIHNob3VsZCBtb3ZlIHRoaXMgdG8gYSBuaWNlciBsaW5rIGluc2lkZSB0aGUgTGlicmFyeSBzb29uIC0gYWxzbyBsZXRzIGhpZGUgdW50aWwgaXQgd29ya3MuLi5cbi8qXG4gICAgd29ya3NwYWNlLnRvcExldmVsVGFicy5wdXNoKHtcbiAgICAgIGlkOiAnY3JlYXRlUHJvamVjdCcsXG4gICAgICB0aXRsZTogKCkgPT4gICdDcmVhdGUnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NyZWF0ZXMgYSBuZXcgcHJvamVjdCcsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShcImFwcC1saWJyYXJ5XCIpICYmIGZhbHNlLFxuICAgICAgaHJlZjogKCkgPT4gXCIvcHJvamVjdC9jcmVhdGVcIlxuICAgIH0pO1xuKi9cblxuICAgIHByZWZlcmVuY2VzUmVnaXN0cnkuYWRkVGFiKCdBYm91dCAnICsgdmVyc2lvbi5uYW1lLCBVcmxIZWxwZXJzLmpvaW4odGVtcGxhdGVQYXRoLCAnYWJvdXQuaHRtbCcpKTtcblxuICAgIGxvZy5pbmZvKFwic3RhcnRlZCwgdmVyc2lvbjogXCIsIHZlcnNpb24udmVyc2lvbik7XG4gICAgbG9nLmluZm8oXCJjb21taXQgSUQ6IFwiLCB2ZXJzaW9uLmNvbW1pdElkKTtcbiAgfSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLnJlZ2lzdGVyUHJlQm9vdHN0cmFwVGFzaygobmV4dCkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICB1cmw6ICd2ZXJzaW9uLmpzb24/cmV2PScgKyBEYXRlLm5vdygpLCBcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdmVyc2lvbiA9IGFuZ3VsYXIuZnJvbUpzb24oZGF0YSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIHZlcnNpb24gPSB7XG4gICAgICAgICAgICBuYW1lOiAnZmFicmljOC1jb25zb2xlJyxcbiAgICAgICAgICAgIHZlcnNpb246ICcnXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgICB9LFxuICAgICAgZXJyb3I6IChqcVhIUiwgdGV4dCwgc3RhdHVzKSA9PiB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIkZhaWxlZCB0byBmZXRjaCB2ZXJzaW9uOiBqcVhIUjogXCIsIGpxWEhSLCBcIiB0ZXh0OiBcIiwgdGV4dCwgXCIgc3RhdHVzOiBcIiwgc3RhdHVzKTtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSxcbiAgICAgIGRhdGFUeXBlOiBcImh0bWxcIlxuICAgIH0pO1xuICB9KTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIuYWRkTW9kdWxlKHBsdWdpbk5hbWUpO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5HbG9iYWxzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5QbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBNYWluIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKCdNYWluLkFib3V0JywgKCRzY29wZSkgPT4ge1xuICAgICRzY29wZS5pbmZvID0gdmVyc2lvbjtcbiAgfSk7XG59XG5cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cblxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IHZhciBsb2c6TG9nZ2luZy5Mb2dnZXIgPSBMb2dnZXIuZ2V0KFwiV2lraVwiKTtcblxuICBleHBvcnQgdmFyIGNhbWVsTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9jYW1lbC5hcGFjaGUub3JnL3NjaGVtYS9zcHJpbmdcIiwgXCJodHRwOi8vY2FtZWwuYXBhY2hlLm9yZy9zY2hlbWEvYmx1ZXByaW50XCJdO1xuICBleHBvcnQgdmFyIHNwcmluZ05hbWVzcGFjZXMgPSBbXCJodHRwOi8vd3d3LnNwcmluZ2ZyYW1ld29yay5vcmcvc2NoZW1hL2JlYW5zXCJdO1xuICBleHBvcnQgdmFyIGRyb29sc05hbWVzcGFjZXMgPSBbXCJodHRwOi8vZHJvb2xzLm9yZy9zY2hlbWEvZHJvb2xzLXNwcmluZ1wiXTtcbiAgZXhwb3J0IHZhciBkb3plck5hbWVzcGFjZXMgPSBbXCJodHRwOi8vZG96ZXIuc291cmNlZm9yZ2UubmV0XCJdO1xuICBleHBvcnQgdmFyIGFjdGl2ZW1xTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9hY3RpdmVtcS5hcGFjaGUub3JnL3NjaGVtYS9jb3JlXCJdO1xuXG4gIGV4cG9ydCB2YXIgdXNlQ2FtZWxDYW52YXNCeURlZmF1bHQgPSBmYWxzZTtcblxuICBleHBvcnQgdmFyIGV4Y2x1ZGVBZGp1c3RtZW50UHJlZml4ZXMgPSBbXCJodHRwOi8vXCIsIFwiaHR0cHM6Ly9cIiwgXCIjXCJdO1xuXG4gIGV4cG9ydCBlbnVtIFZpZXdNb2RlIHsgTGlzdCwgSWNvbiB9O1xuXG4gIC8qKlxuICAgKiBUaGUgY3VzdG9tIHZpZXdzIHdpdGhpbiB0aGUgd2lraSBuYW1lc3BhY2U7IGVpdGhlciBcIi93aWtpLyRmb29cIiBvciBcIi93aWtpL2JyYW5jaC8kYnJhbmNoLyRmb29cIlxuICAgKi9cbiAgZXhwb3J0IHZhciBjdXN0b21XaWtpVmlld1BhZ2VzID0gW1wiL2Zvcm1UYWJsZVwiLCBcIi9jYW1lbC9kaWFncmFtXCIsIFwiL2NhbWVsL2NhbnZhc1wiLCBcIi9jYW1lbC9wcm9wZXJ0aWVzXCIsIFwiL2RvemVyL21hcHBpbmdzXCJdO1xuXG4gIC8qKlxuICAgKiBXaGljaCBleHRlbnNpb25zIGRvIHdlIHdpc2ggdG8gaGlkZSBpbiB0aGUgd2lraSBmaWxlIGxpc3RpbmdcbiAgICogQHByb3BlcnR5IGhpZGVFeHRlbnNpb25zXG4gICAqIEBmb3IgV2lraVxuICAgKiBAdHlwZSBBcnJheVxuICAgKi9cbiAgZXhwb3J0IHZhciBoaWRlRXh0ZW5zaW9ucyA9IFtcIi5wcm9maWxlXCJdO1xuXG4gIHZhciBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuID0gL15bYS16QS1aMC05Ll8tXSokLztcbiAgdmFyIGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkID0gXCJOYW1lIG11c3QgYmU6IGxldHRlcnMsIG51bWJlcnMsIGFuZCAuIF8gb3IgLSBjaGFyYWN0ZXJzXCI7XG5cbiAgdmFyIGRlZmF1bHRGaWxlTmFtZUV4dGVuc2lvblBhdHRlcm4gPSBcIlwiO1xuXG4gIHZhciBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuID0gL15bYS16MC05Ll8tXSokLztcbiAgdmFyIGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm5JbnZhbGlkID0gXCJOYW1lIG11c3QgYmU6IGxvd2VyLWNhc2UgbGV0dGVycywgbnVtYmVycywgYW5kIC4gXyBvciAtIGNoYXJhY3RlcnNcIjtcblxuICBleHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlT3B0aW9ucyB7XG4gICAgd29ya3NwYWNlOiBhbnk7XG4gICAgZm9ybTogYW55O1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBicmFuY2g6IHN0cmluZztcbiAgICBwYXJlbnRJZDogc3RyaW5nO1xuICAgIHN1Y2Nlc3M6IChmaWxlQ29udGVudHM/OnN0cmluZykgPT4gdm9pZDtcbiAgICBlcnJvcjogKGVycm9yOmFueSkgPT4gdm9pZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgd2l6YXJkIHRyZWUgZm9yIGNyZWF0aW5nIG5ldyBjb250ZW50IGluIHRoZSB3aWtpXG4gICAqIEBwcm9wZXJ0eSBkb2N1bWVudFRlbXBsYXRlc1xuICAgKiBAZm9yIFdpa2lcbiAgICogQHR5cGUgQXJyYXlcbiAgICovXG4gIGV4cG9ydCB2YXIgZG9jdW1lbnRUZW1wbGF0ZXMgPSBbXG4gICAge1xuICAgICAgbGFiZWw6IFwiRm9sZGVyXCIsXG4gICAgICB0b29sdGlwOiBcIkNyZWF0ZSBhIG5ldyBmb2xkZXIgdG8gY29udGFpbiBkb2N1bWVudHNcIixcbiAgICAgIGZvbGRlcjogdHJ1ZSxcbiAgICAgIGljb246IFwiL2ltZy9pY29ucy93aWtpL2ZvbGRlci5naWZcIixcbiAgICAgIGV4ZW1wbGFyOiBcIm15Zm9sZGVyXCIsXG4gICAgICByZWdleDogZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm5JbnZhbGlkXG4gICAgfSxcbiAgICAvKlxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkFwcFwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGVzIGEgbmV3IEFwcCBmb2xkZXIgdXNlZCB0byBjb25maWd1cmUgYW5kIHJ1biBjb250YWluZXJzXCIsXG4gICAgICBhZGRDbGFzczogXCJmYSBmYS1jb2cgZ3JlZW5cIixcbiAgICAgIGV4ZW1wbGFyOiAnbXlhcHAnLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogJycsXG4gICAgICBnZW5lcmF0ZWQ6IHtcbiAgICAgICAgbWJlYW46IFsnaW8uZmFicmljOCcsIHsgdHlwZTogJ0t1YmVybmV0ZXNUZW1wbGF0ZU1hbmFnZXInIH1dLFxuICAgICAgICBpbml0OiAod29ya3NwYWNlLCAkc2NvcGUpID0+IHtcblxuICAgICAgICB9LFxuICAgICAgICBnZW5lcmF0ZTogKG9wdGlvbnM6R2VuZXJhdGVPcHRpb25zKSA9PiB7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiR290IG9wdGlvbnM6IFwiLCBvcHRpb25zKTtcbiAgICAgICAgICBvcHRpb25zLmZvcm0ubmFtZSA9IG9wdGlvbnMubmFtZTtcbiAgICAgICAgICBvcHRpb25zLmZvcm0ucGF0aCA9IG9wdGlvbnMucGFyZW50SWQ7XG4gICAgICAgICAgb3B0aW9ucy5mb3JtLmJyYW5jaCA9IG9wdGlvbnMuYnJhbmNoO1xuICAgICAgICAgIHZhciBqc29uID0gYW5ndWxhci50b0pzb24ob3B0aW9ucy5mb3JtKTtcbiAgICAgICAgICB2YXIgam9sb2tpYSA9IDxKb2xva2lhLklKb2xva2lhPiBIYXd0aW9Db3JlLmluamVjdG9yLmdldChcImpvbG9raWFcIik7XG4gICAgICAgICAgam9sb2tpYS5yZXF1ZXN0KHtcbiAgICAgICAgICAgIHR5cGU6ICdleGVjJyxcbiAgICAgICAgICAgIG1iZWFuOiAnaW8uZmFicmljODp0eXBlPUt1YmVybmV0ZXNUZW1wbGF0ZU1hbmFnZXInLFxuICAgICAgICAgICAgb3BlcmF0aW9uOiAnY3JlYXRlQXBwQnlKc29uJyxcbiAgICAgICAgICAgIGFyZ3VtZW50czogW2pzb25dXG4gICAgICAgICAgfSwgQ29yZS5vblN1Y2Nlc3MoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJHZW5lcmF0ZWQgYXBwLCByZXNwb25zZTogXCIsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIG9wdGlvbnMuc3VjY2Vzcyh1bmRlZmluZWQpOyBcbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICBlcnJvcjogKHJlc3BvbnNlKSA9PiB7IG9wdGlvbnMuZXJyb3IocmVzcG9uc2UuZXJyb3IpOyB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9LFxuICAgICAgICBmb3JtOiAod29ya3NwYWNlLCAkc2NvcGUpID0+IHtcbiAgICAgICAgICAvLyBUT0RPIGRvY2tlciByZWdpc3RyeSBjb21wbGV0aW9uXG4gICAgICAgICAgaWYgKCEkc2NvcGUuZG9Eb2NrZXJSZWdpc3RyeUNvbXBsZXRpb24pIHtcbiAgICAgICAgICAgICRzY29wZS5mZXRjaERvY2tlclJlcG9zaXRvcmllcyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIERvY2tlclJlZ2lzdHJ5LmNvbXBsZXRlRG9ja2VyUmVnaXN0cnkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1bW1hcnlNYXJrZG93bjogJ0FkZCBhcHAgc3VtbWFyeSBoZXJlJyxcbiAgICAgICAgICAgIHJlcGxpY2FDb3VudDogMVxuICAgICAgICAgIH07XG4gICAgICAgIH0sXG4gICAgICAgIHNjaGVtYToge1xuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXBwIHNldHRpbmdzJyxcbiAgICAgICAgICB0eXBlOiAnamF2YS5sYW5nLlN0cmluZycsXG4gICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgJ2RvY2tlckltYWdlJzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnRG9ja2VyIEltYWdlJyxcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnamF2YS5sYW5nLlN0cmluZycsXG4gICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcbiAgICAgICAgICAgICAgICAncmVxdWlyZWQnOiAnJywgXG4gICAgICAgICAgICAgICAgJ2NsYXNzJzogJ2lucHV0LXhsYXJnZScsXG4gICAgICAgICAgICAgICAgJ3R5cGVhaGVhZCc6ICdyZXBvIGZvciByZXBvIGluIGZldGNoRG9ja2VyUmVwb3NpdG9yaWVzKCkgfCBmaWx0ZXI6JHZpZXdWYWx1ZScsXG4gICAgICAgICAgICAgICAgJ3R5cGVhaGVhZC13YWl0LW1zJzogJzIwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdzdW1tYXJ5TWFya2Rvd24nOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdTaG9ydCBEZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICd0eXBlJzogJ2phdmEubGFuZy5TdHJpbmcnLFxuICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgJ2NsYXNzJzogJ2lucHV0LXhsYXJnZScgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdyZXBsaWNhQ291bnQnOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdSZXBsaWNhIENvdW50JyxcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnamF2YS5sYW5nLkludGVnZXInLFxuICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHtcbiAgICAgICAgICAgICAgICBtaW46ICcwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2xhYmVscyc6IHtcbiAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogJ0xhYmVscycsXG4gICAgICAgICAgICAgICd0eXBlJzogJ21hcCcsXG4gICAgICAgICAgICAgICdpdGVtcyc6IHtcbiAgICAgICAgICAgICAgICAndHlwZSc6ICdzdHJpbmcnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkZhYnJpYzggUHJvZmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGUgYSBuZXcgZW1wdHkgZmFicmljIHByb2ZpbGUuIFVzaW5nIGEgaHlwaGVuICgnLScpIHdpbGwgY3JlYXRlIGEgZm9sZGVyIGhlaXJhcmNoeSwgZm9yIGV4YW1wbGUgJ215LWF3ZXNvbWUtcHJvZmlsZScgd2lsbCBiZSBhdmFpbGFibGUgdmlhIHRoZSBwYXRoICdteS9hd2Vzb21lL3Byb2ZpbGUnLlwiLFxuICAgICAgcHJvZmlsZTogdHJ1ZSxcbiAgICAgIGFkZENsYXNzOiBcImZhIGZhLWJvb2sgZ3JlZW5cIixcbiAgICAgIGV4ZW1wbGFyOiBcInVzZXItcHJvZmlsZVwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGZhYnJpY09ubHk6IHRydWVcbiAgICB9LFxuICAgICovXG4gICAge1xuICAgICAgbGFiZWw6IFwiUHJvcGVydGllcyBGaWxlXCIsXG4gICAgICB0b29sdGlwOiBcIkEgcHJvcGVydGllcyBmaWxlIHR5cGljYWxseSB1c2VkIHRvIGNvbmZpZ3VyZSBKYXZhIGNsYXNzZXNcIixcbiAgICAgIGV4ZW1wbGFyOiBcInByb3BlcnRpZXMtZmlsZS5wcm9wZXJ0aWVzXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5wcm9wZXJ0aWVzXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkpTT04gRmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJBIGZpbGUgY29udGFpbmluZyBKU09OIGRhdGFcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50Lmpzb25cIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLmpzb25cIlxuICAgIH0sXG4gICAgLypcbiAgICB7XG4gICAgICBsYWJlbDogXCJLZXkgU3RvcmUgRmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGVzIGEga2V5c3RvcmUgKGRhdGFiYXNlKSBvZiBjcnlwdG9ncmFwaGljIGtleXMsIFguNTA5IGNlcnRpZmljYXRlIGNoYWlucywgYW5kIHRydXN0ZWQgY2VydGlmaWNhdGVzLlwiLFxuICAgICAgZXhlbXBsYXI6ICdrZXlzdG9yZS5qa3MnLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIuamtzXCIsXG4gICAgICBnZW5lcmF0ZWQ6IHtcbiAgICAgICAgbWJlYW46IFsnaGF3dGlvJywgeyB0eXBlOiAnS2V5c3RvcmVTZXJ2aWNlJyB9XSxcbiAgICAgICAgaW5pdDogZnVuY3Rpb24od29ya3NwYWNlLCAkc2NvcGUpIHtcbiAgICAgICAgICB2YXIgbWJlYW4gPSAnaGF3dGlvOnR5cGU9S2V5c3RvcmVTZXJ2aWNlJztcbiAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB3b3Jrc3BhY2Uuam9sb2tpYS5yZXF1ZXN0KCB7dHlwZTogXCJyZWFkXCIsIG1iZWFuOiBtYmVhbiwgYXR0cmlidXRlOiBcIlNlY3VyaXR5UHJvdmlkZXJJbmZvXCIgfSwge1xuICAgICAgICAgICAgc3VjY2VzczogKHJlc3BvbnNlKT0+e1xuICAgICAgICAgICAgICAkc2NvcGUuc2VjdXJpdHlQcm92aWRlckluZm8gPSByZXNwb25zZS52YWx1ZTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb3VsZCBub3QgZmluZCB0aGUgc3VwcG9ydGVkIHNlY3VyaXR5IGFsZ29yaXRobXM6ICcsIHJlc3BvbnNlLmVycm9yKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2VuZXJhdGU6IGZ1bmN0aW9uKG9wdGlvbnM6R2VuZXJhdGVPcHRpb25zKSB7XG4gICAgICAgICAgdmFyIGVuY29kZWRGb3JtID0gSlNPTi5zdHJpbmdpZnkob3B0aW9ucy5mb3JtKVxuICAgICAgICAgIHZhciBtYmVhbiA9ICdoYXd0aW86dHlwZT1LZXlzdG9yZVNlcnZpY2UnO1xuICAgICAgICAgIHZhciByZXNwb25zZSA9IG9wdGlvbnMud29ya3NwYWNlLmpvbG9raWEucmVxdWVzdCgge1xuICAgICAgICAgICAgICB0eXBlOiAnZXhlYycsIFxuICAgICAgICAgICAgICBtYmVhbjogbWJlYW4sXG4gICAgICAgICAgICAgIG9wZXJhdGlvbjogJ2NyZWF0ZUtleVN0b3JlVmlhSlNPTihqYXZhLmxhbmcuU3RyaW5nKScsXG4gICAgICAgICAgICAgIGFyZ3VtZW50czogW2VuY29kZWRGb3JtXVxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICBtZXRob2Q6J1BPU1QnLFxuICAgICAgICAgICAgICBzdWNjZXNzOmZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKHJlc3BvbnNlLnZhbHVlKVxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBlcnJvcjpmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5lcnJvcihyZXNwb25zZS5lcnJvcilcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZvcm06IGZ1bmN0aW9uKHdvcmtzcGFjZSwgJHNjb3BlKXsgXG4gICAgICAgICAgcmV0dXJuIHsgXG4gICAgICAgICAgICBzdG9yZVR5cGU6ICRzY29wZS5zZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlTdG9yZVR5cGVzWzBdLFxuICAgICAgICAgICAgY3JlYXRlUHJpdmF0ZUtleTogZmFsc2UsXG4gICAgICAgICAgICBrZXlMZW5ndGg6IDQwOTYsXG4gICAgICAgICAgICBrZXlBbGdvcml0aG06ICRzY29wZS5zZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlBbGdvcml0aG1zWzBdLFxuICAgICAgICAgICAga2V5VmFsaWRpdHk6IDM2NVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2NoZW1hOiB7XG4gICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJLZXlzdG9yZSBTZXR0aW5nc1wiLFxuICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgIFwicHJvcGVydGllc1wiOiB7IFxuICAgICAgICAgICAgIFwic3RvcmVQYXNzd29yZFwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiS2V5c3RvcmUgcGFzc3dvcmQuXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJwYXNzd29yZFwiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7IFwicmVxdWlyZWRcIjogIFwiXCIsICBcIm5nLW1pbmxlbmd0aFwiOjYgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJzdG9yZVR5cGVcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB0eXBlIG9mIHN0b3JlIHRvIGNyZWF0ZVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWVsZW1lbnQnOiBcInNlbGVjdFwiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7IFwibmctb3B0aW9uc1wiOiAgXCJ2IGZvciB2IGluIHNlY3VyaXR5UHJvdmlkZXJJbmZvLnN1cHBvcnRlZEtleVN0b3JlVHlwZXNcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImNyZWF0ZVByaXZhdGVLZXlcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNob3VsZCB3ZSBnZW5lcmF0ZSBhIHNlbGYtc2lnbmVkIHByaXZhdGUga2V5P1wiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleUNvbW1vbk5hbWVcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb21tb24gbmFtZSBvZiB0aGUga2V5LCB0eXBpY2FsbHkgc2V0IHRvIHRoZSBob3N0bmFtZSBvZiB0aGUgc2VydmVyXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5TGVuZ3RoXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbGVuZ3RoIG9mIHRoZSBjcnlwdG9ncmFwaGljIGtleVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiTG9uZ1wiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleUFsZ29yaXRobVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGtleSBhbGdvcml0aG1cIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImphdmEubGFuZy5TdHJpbmdcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1lbGVtZW50JzogXCJzZWxlY3RcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcIm5nLW9wdGlvbnNcIjogIFwidiBmb3IgdiBpbiBzZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlBbGdvcml0aG1zXCIgfSxcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlWYWxpZGl0eVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG51bWJlciBvZiBkYXlzIHRoZSBrZXkgd2lsbCBiZSB2YWxpZCBmb3JcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIkxvbmdcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlQYXNzd29yZFwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiUGFzc3dvcmQgdG8gdGhlIHByaXZhdGUga2V5XCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJwYXNzd29yZFwiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfVxuICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgICovXG4gICAge1xuICAgICAgbGFiZWw6IFwiTWFya2Rvd24gRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBiYXNpYyBtYXJrdXAgZG9jdW1lbnQgdXNpbmcgdGhlIE1hcmtkb3duIHdpa2kgbWFya3VwLCBwYXJ0aWN1bGFybHkgdXNlZnVsIGZvciBSZWFkTWUgZmlsZXMgaW4gZGlyZWN0b3JpZXNcIixcbiAgICAgIGV4ZW1wbGFyOiBcIlJlYWRNZS5tZFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIubWRcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiVGV4dCBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJBIHBsYWluIHRleHQgZmlsZVwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG9jdW1lbnQudGV4dFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIudHh0XCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkhUTUwgRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBIVE1MIGRvY3VtZW50IHlvdSBjYW4gZWRpdCBkaXJlY3RseSB1c2luZyB0aGUgSFRNTCBtYXJrdXBcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50Lmh0bWxcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLmh0bWxcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiWE1MIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkFuIGVtcHR5IFhNTCBkb2N1bWVudFwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG9jdW1lbnQueG1sXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiSW50ZWdyYXRpb24gRmxvd3NcIixcbiAgICAgIHRvb2x0aXA6IFwiQ2FtZWwgcm91dGVzIGZvciBkZWZpbmluZyB5b3VyIGludGVncmF0aW9uIGZsb3dzXCIsXG4gICAgICBjaGlsZHJlbjogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IFwiQ2FtZWwgWE1MIGRvY3VtZW50XCIsXG4gICAgICAgICAgdG9vbHRpcDogXCJBIHZhbmlsbGEgQ2FtZWwgWE1MIGRvY3VtZW50IGZvciBpbnRlZ3JhdGlvbiBmbG93c1wiLFxuICAgICAgICAgIGljb246IFwiL2ltZy9pY29ucy9jYW1lbC5zdmdcIixcbiAgICAgICAgICBleGVtcGxhcjogXCJjYW1lbC54bWxcIixcbiAgICAgICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogXCJDYW1lbCBPU0dpIEJsdWVwcmludCBYTUwgZG9jdW1lbnRcIixcbiAgICAgICAgICB0b29sdGlwOiBcIkEgdmFuaWxsYSBDYW1lbCBYTUwgZG9jdW1lbnQgZm9yIGludGVncmF0aW9uIGZsb3dzIHdoZW4gdXNpbmcgT1NHaSBCbHVlcHJpbnRcIixcbiAgICAgICAgICBpY29uOiBcIi9pbWcvaWNvbnMvY2FtZWwuc3ZnXCIsXG4gICAgICAgICAgZXhlbXBsYXI6IFwiY2FtZWwtYmx1ZXByaW50LnhtbFwiLFxuICAgICAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiBcIkNhbWVsIFNwcmluZyBYTUwgZG9jdW1lbnRcIixcbiAgICAgICAgICB0b29sdGlwOiBcIkEgdmFuaWxsYSBDYW1lbCBYTUwgZG9jdW1lbnQgZm9yIGludGVncmF0aW9uIGZsb3dzIHdoZW4gdXNpbmcgdGhlIFNwcmluZyBmcmFtZXdvcmtcIixcbiAgICAgICAgICBpY29uOiBcIi9pbWcvaWNvbnMvY2FtZWwuc3ZnXCIsXG4gICAgICAgICAgZXhlbXBsYXI6IFwiY2FtZWwtc3ByaW5nLnhtbFwiLFxuICAgICAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiRGF0YSBNYXBwaW5nIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkRvemVyIGJhc2VkIGNvbmZpZ3VyYXRpb24gb2YgbWFwcGluZyBkb2N1bWVudHNcIixcbiAgICAgIGljb246IFwiL2ltZy9pY29ucy9kb3plci9kb3plci5naWZcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvemVyLW1hcHBpbmcueG1sXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgIH1cbiAgXTtcblxuICAvLyBUT0RPIFJFTU9WRVxuICBleHBvcnQgZnVuY3Rpb24gaXNGTUNDb250YWluZXIod29ya3NwYWNlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gVE9ETyBSRU1PVkVcbiAgZXhwb3J0IGZ1bmN0aW9uIGlzV2lraUVuYWJsZWQod29ya3NwYWNlLCBqb2xva2lhLCBsb2NhbFN0b3JhZ2UpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbi8qXG4gICAgcmV0dXJuIEdpdC5jcmVhdGVHaXRSZXBvc2l0b3J5KHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKSAhPT0gbnVsbDtcbiovXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbikge1xuICAgIHZhciBocmVmID0gQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIiNcIik7XG4gICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gbmF2aWdhdGUgdG86IFwiICsgaHJlZik7XG4gICAgICAkbG9jYXRpb24udXJsKGhyZWYpO1xuICAgIH0sIDEwMCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbGwgdGhlIGxpbmtzIGZvciB0aGUgZ2l2ZW4gYnJhbmNoIGZvciB0aGUgY3VzdG9tIHZpZXdzLCBzdGFydGluZyB3aXRoIFwiL1wiXG4gICAqIEBwYXJhbSAkc2NvcGVcbiAgICogQHJldHVybnMge3N0cmluZ1tdfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGN1c3RvbVZpZXdMaW5rcygkc2NvcGUpIHtcbiAgICB2YXIgcHJlZml4ID0gQ29yZS50cmltTGVhZGluZyhXaWtpLnN0YXJ0TGluaygkc2NvcGUpLCBcIiNcIik7XG4gICAgcmV0dXJuIGN1c3RvbVdpa2lWaWV3UGFnZXMubWFwKHBhdGggPT4gcHJlZml4ICsgcGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIG5ldyBjcmVhdGUgZG9jdW1lbnQgd2l6YXJkIHRyZWVcbiAgICogQG1ldGhvZCBjcmVhdGVXaXphcmRUcmVlXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlV2l6YXJkVHJlZSh3b3Jrc3BhY2UsICRzY29wZSkge1xuICAgIHZhciByb290ID0gY3JlYXRlRm9sZGVyKFwiTmV3IERvY3VtZW50c1wiKTtcbiAgICBhZGRDcmVhdGVXaXphcmRGb2xkZXJzKHdvcmtzcGFjZSwgJHNjb3BlLCByb290LCBkb2N1bWVudFRlbXBsYXRlcyk7XG4gICAgcmV0dXJuIHJvb3Q7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVGb2xkZXIobmFtZSk6IGFueSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICBjaGlsZHJlbjogW11cbiAgICB9O1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGFkZENyZWF0ZVdpemFyZEZvbGRlcnMod29ya3NwYWNlLCAkc2NvcGUsIHBhcmVudCwgdGVtcGxhdGVzOiBhbnlbXSkge1xuICAgIGFuZ3VsYXIuZm9yRWFjaCh0ZW1wbGF0ZXMsICh0ZW1wbGF0ZSkgPT4ge1xuXG4gICAgICBpZiAoIHRlbXBsYXRlLmdlbmVyYXRlZCApIHtcbiAgICAgICAgaWYgKCB0ZW1wbGF0ZS5nZW5lcmF0ZWQuaW5pdCApIHtcbiAgICAgICAgICB0ZW1wbGF0ZS5nZW5lcmF0ZWQuaW5pdCh3b3Jrc3BhY2UsICRzY29wZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIHRpdGxlID0gdGVtcGxhdGUubGFiZWwgfHwga2V5O1xuICAgICAgdmFyIG5vZGUgPSBjcmVhdGVGb2xkZXIodGl0bGUpO1xuICAgICAgbm9kZS5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICBub2RlLmVudGl0eSA9IHRlbXBsYXRlO1xuXG4gICAgICB2YXIgYWRkQ2xhc3MgPSB0ZW1wbGF0ZS5hZGRDbGFzcztcbiAgICAgIGlmIChhZGRDbGFzcykge1xuICAgICAgICBub2RlLmFkZENsYXNzID0gYWRkQ2xhc3M7XG4gICAgICB9XG5cbiAgICAgIHZhciBrZXkgPSB0ZW1wbGF0ZS5leGVtcGxhcjtcbiAgICAgIHZhciBwYXJlbnRLZXkgPSBwYXJlbnQua2V5IHx8IFwiXCI7XG4gICAgICBub2RlLmtleSA9IHBhcmVudEtleSA/IHBhcmVudEtleSArIFwiX1wiICsga2V5IDoga2V5O1xuICAgICAgdmFyIGljb24gPSB0ZW1wbGF0ZS5pY29uO1xuICAgICAgaWYgKGljb24pIHtcbiAgICAgICAgbm9kZS5pY29uID0gQ29yZS51cmwoaWNvbik7XG4gICAgICB9XG4gICAgICAvLyBjb21waWxlciB3YXMgY29tcGxhaW5pbmcgYWJvdXQgJ2xhYmVsJyBoYWQgbm8gaWRlYSB3aGVyZSBpdCdzIGNvbWluZyBmcm9tXG4gICAgICAvLyB2YXIgdG9vbHRpcCA9IHZhbHVlW1widG9vbHRpcFwiXSB8fCB2YWx1ZVtcImRlc2NyaXB0aW9uXCJdIHx8IGxhYmVsO1xuICAgICAgdmFyIHRvb2x0aXAgPSB0ZW1wbGF0ZVtcInRvb2x0aXBcIl0gfHwgdGVtcGxhdGVbXCJkZXNjcmlwdGlvblwiXSB8fCAnJztcbiAgICAgIG5vZGUudG9vbHRpcCA9IHRvb2x0aXA7XG4gICAgICBpZiAodGVtcGxhdGVbXCJmb2xkZXJcIl0pIHtcbiAgICAgICAgbm9kZS5pc0ZvbGRlciA9ICgpID0+IHsgcmV0dXJuIHRydWU7IH07XG4gICAgICB9XG4gICAgICBwYXJlbnQuY2hpbGRyZW4ucHVzaChub2RlKTtcblxuICAgICAgdmFyIGNoaWxkcmVuID0gdGVtcGxhdGUuY2hpbGRyZW47XG4gICAgICBpZiAoY2hpbGRyZW4pIHtcbiAgICAgICAgYWRkQ3JlYXRlV2l6YXJkRm9sZGVycyh3b3Jrc3BhY2UsICRzY29wZSwgbm9kZSwgY2hpbGRyZW4pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0V2lraUxpbmsocHJvamVjdElkLCBicmFuY2gpIHtcbiAgICB2YXIgc3RhcnQgPSBVcmxIZWxwZXJzLmpvaW4oRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCksIFwiL3dpa2lcIik7XG4gICAgaWYgKGJyYW5jaCkge1xuICAgICAgc3RhcnQgPSBVcmxIZWxwZXJzLmpvaW4oc3RhcnQsICdicmFuY2gnLCBicmFuY2gpO1xuICAgIH1cbiAgICByZXR1cm4gc3RhcnQ7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gc3RhcnRMaW5rKCRzY29wZSkge1xuICAgIHZhciBwcm9qZWN0SWQgPSAkc2NvcGUucHJvamVjdElkO1xuICAgIHZhciBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgIHJldHVybiBzdGFydFdpa2lMaW5rKHByb2plY3RJZCwgYnJhbmNoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIGZpbGVuYW1lL3BhdGggaXMgYW4gaW5kZXggcGFnZSAobmFtZWQgaW5kZXguKiBhbmQgaXMgYSBtYXJrZG93bi9odG1sIHBhZ2UpLlxuICAgKlxuICAgKiBAcGFyYW0gcGF0aFxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBpc0luZGV4UGFnZShwYXRoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gcGF0aCAmJiAocGF0aC5lbmRzV2l0aChcImluZGV4Lm1kXCIpIHx8IHBhdGguZW5kc1dpdGgoXCJpbmRleC5odG1sXCIpIHx8IHBhdGguZW5kc1dpdGgoXCJpbmRleFwiKSkgPyB0cnVlIDogZmFsc2U7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gdmlld0xpbmsoJHNjb3BlLCBwYWdlSWQ6c3RyaW5nLCAkbG9jYXRpb24sIGZpbGVOYW1lOnN0cmluZyA9IG51bGwpIHtcbiAgICB2YXIgbGluazpzdHJpbmcgPSBudWxsO1xuICAgIHZhciBzdGFydCA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgIGlmIChwYWdlSWQpIHtcbiAgICAgIC8vIGZpZ3VyZSBvdXQgd2hpY2ggdmlldyB0byB1c2UgZm9yIHRoaXMgcGFnZVxuICAgICAgdmFyIHZpZXcgPSBpc0luZGV4UGFnZShwYWdlSWQpID8gXCIvYm9vay9cIiA6IFwiL3ZpZXcvXCI7XG4gICAgICBsaW5rID0gc3RhcnQgKyB2aWV3ICsgZW5jb2RlUGF0aChDb3JlLnRyaW1MZWFkaW5nKHBhZ2VJZCwgXCIvXCIpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbGV0cyB1c2UgdGhlIGN1cnJlbnQgcGF0aFxuICAgICAgdmFyIHBhdGg6c3RyaW5nID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICAgIGxpbmsgPSBcIiNcIiArIHBhdGgucmVwbGFjZSgvKGVkaXR8Y3JlYXRlKS8sIFwidmlld1wiKTtcbiAgICB9XG4gICAgaWYgKGZpbGVOYW1lICYmIHBhZ2VJZCAmJiBwYWdlSWQuZW5kc1dpdGgoZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gbGluaztcbiAgICB9XG4gICAgaWYgKGZpbGVOYW1lKSB7XG4gICAgICBpZiAoIWxpbmsuZW5kc1dpdGgoXCIvXCIpKSB7XG4gICAgICAgIGxpbmsgKz0gXCIvXCI7XG4gICAgICB9XG4gICAgICBsaW5rICs9IGZpbGVOYW1lO1xuICAgIH1cbiAgICByZXR1cm4gbGluaztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBicmFuY2hMaW5rKCRzY29wZSwgcGFnZUlkOiBzdHJpbmcsICRsb2NhdGlvbiwgZmlsZU5hbWU6c3RyaW5nID0gbnVsbCkge1xuICAgIHJldHVybiB2aWV3TGluaygkc2NvcGUsIHBhZ2VJZCwgJGxvY2F0aW9uLCBmaWxlTmFtZSk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZWRpdExpbmsoJHNjb3BlLCBwYWdlSWQ6c3RyaW5nLCAkbG9jYXRpb24pIHtcbiAgICB2YXIgbGluazpzdHJpbmcgPSBudWxsO1xuICAgIHZhciBmb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQocGFnZUlkKTtcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgY2FzZSBcImltYWdlXCI6XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgIHZhciBzdGFydCA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgaWYgKHBhZ2VJZCkge1xuICAgICAgICBsaW5rID0gc3RhcnQgKyBcIi9lZGl0L1wiICsgZW5jb2RlUGF0aChwYWdlSWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbGV0cyB1c2UgdGhlIGN1cnJlbnQgcGF0aFxuICAgICAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICAgIGxpbmsgPSBcIiNcIiArIHBhdGgucmVwbGFjZSgvKHZpZXd8Y3JlYXRlKS8sIFwiZWRpdFwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpbms7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlTGluaygkc2NvcGUsIHBhZ2VJZDpzdHJpbmcsICRsb2NhdGlvbikge1xuICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICB2YXIgbGluayA9ICcnO1xuICAgIGlmIChwYWdlSWQpIHtcbiAgICAgIGxpbmsgPSBzdGFydCArIFwiL2NyZWF0ZS9cIiArIGVuY29kZVBhdGgocGFnZUlkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbGV0cyB1c2UgdGhlIGN1cnJlbnQgcGF0aFxuICAgICAgbGluayA9IFwiI1wiICsgcGF0aC5yZXBsYWNlKC8odmlld3xlZGl0fGZvcm1UYWJsZSkvLCBcImNyZWF0ZVwiKTtcbiAgICB9XG4gICAgLy8gd2UgaGF2ZSB0aGUgbGluayBzbyBsZXRzIG5vdyByZW1vdmUgdGhlIGxhc3QgcGF0aFxuICAgIC8vIG9yIGlmIHRoZXJlIGlzIG5vIC8gaW4gdGhlIHBhdGggdGhlbiByZW1vdmUgdGhlIGxhc3Qgc2VjdGlvblxuICAgIHZhciBpZHggPSBsaW5rLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICBpZiAoaWR4ID4gMCAmJiAhJHNjb3BlLmNoaWxkcmVuICYmICFwYXRoLnN0YXJ0c1dpdGgoXCIvd2lraS9mb3JtVGFibGVcIikpIHtcbiAgICAgIGxpbmsgPSBsaW5rLnN1YnN0cmluZygwLCBpZHggKyAxKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbms7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZW5jb2RlUGF0aChwYWdlSWQ6c3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhZ2VJZC5zcGxpdChcIi9cIikubWFwKGVuY29kZVVSSUNvbXBvbmVudCkuam9pbihcIi9cIik7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZGVjb2RlUGF0aChwYWdlSWQ6c3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhZ2VJZC5zcGxpdChcIi9cIikubWFwKGRlY29kZVVSSUNvbXBvbmVudCkuam9pbihcIi9cIik7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZmlsZUZvcm1hdChuYW1lOnN0cmluZywgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeT8pIHtcbiAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICBpZiAobmFtZSkge1xuICAgICAgaWYgKG5hbWUgPT09IFwiSmVua2luc2ZpbGVcIikge1xuICAgICAgICBleHRlbnNpb24gPSBcImdyb292eVwiO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgYW5zd2VyID0gbnVsbDtcbiAgICBpZiAoIWZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpIHtcbiAgICAgIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkgPSBIYXd0aW9Db3JlLmluamVjdG9yLmdldChcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIik7XG4gICAgfVxuICAgIGFuZ3VsYXIuZm9yRWFjaChmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5LCAoYXJyYXksIGtleSkgPT4ge1xuICAgICAgaWYgKGFycmF5LmluZGV4T2YoZXh0ZW5zaW9uKSA+PSAwKSB7XG4gICAgICAgIGFuc3dlciA9IGtleTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYW5zd2VyO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGZpbGUgbmFtZSBvZiB0aGUgZ2l2ZW4gcGF0aDsgc3RyaXBwaW5nIG9mZiBhbnkgZGlyZWN0b3JpZXNcbiAgICogQG1ldGhvZCBmaWxlTmFtZVxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZmlsZU5hbWUocGF0aDogc3RyaW5nKSB7XG4gICAgaWYgKHBhdGgpIHtcbiAgICAgICB2YXIgaWR4ID0gcGF0aC5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICByZXR1cm4gcGF0aC5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXRoO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGZvbGRlciBvZiB0aGUgZ2l2ZW4gcGF0aCAoZXZlcnl0aGluZyBidXQgdGhlIGxhc3QgcGF0aCBuYW1lKVxuICAgKiBAbWV0aG9kIGZpbGVQYXJlbnRcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVQYXJlbnQocGF0aDogc3RyaW5nKSB7XG4gICAgaWYgKHBhdGgpIHtcbiAgICAgICB2YXIgaWR4ID0gcGF0aC5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICByZXR1cm4gcGF0aC5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gbGV0cyByZXR1cm4gdGhlIHJvb3QgZGlyZWN0b3J5XG4gICAgcmV0dXJuIFwiXCI7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZmlsZSBuYW1lIGZvciB0aGUgZ2l2ZW4gbmFtZTsgd2UgaGlkZSBzb21lIGV4dGVuc2lvbnNcbiAgICogQG1ldGhvZCBoaWRlRmluZU5hbWVFeHRlbnNpb25zXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBoaWRlRmlsZU5hbWVFeHRlbnNpb25zKG5hbWUpIHtcbiAgICBpZiAobmFtZSkge1xuICAgICAgYW5ndWxhci5mb3JFYWNoKFdpa2kuaGlkZUV4dGVuc2lvbnMsIChleHRlbnNpb24pID0+IHtcbiAgICAgICAgaWYgKG5hbWUuZW5kc1dpdGgoZXh0ZW5zaW9uKSkge1xuICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZygwLCBuYW1lLmxlbmd0aCAtIGV4dGVuc2lvbi5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWU7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgVVJMIHRvIHBlcmZvcm0gYSBHRVQgb3IgUE9TVCBmb3IgdGhlIGdpdmVuIGJyYW5jaCBuYW1lIGFuZCBwYXRoXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZ2l0UmVzdFVSTCgkc2NvcGUsIHBhdGg6IHN0cmluZykge1xuICAgIHZhciB1cmwgPSBnaXRSZWxhdGl2ZVVSTCgkc2NvcGUsIHBhdGgpO1xuICAgIHVybCA9IENvcmUudXJsKCcvJyArIHVybCk7XG5cbi8qXG4gICAgdmFyIGNvbm5lY3Rpb25OYW1lID0gQ29yZS5nZXRDb25uZWN0aW9uTmFtZVBhcmFtZXRlcigpO1xuICAgIGlmIChjb25uZWN0aW9uTmFtZSkge1xuICAgICAgdmFyIGNvbm5lY3Rpb25PcHRpb25zID0gQ29yZS5nZXRDb25uZWN0T3B0aW9ucyhjb25uZWN0aW9uTmFtZSk7XG4gICAgICBpZiAoY29ubmVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgY29ubmVjdGlvbk9wdGlvbnMucGF0aCA9IHVybDtcbiAgICAgICAgdXJsID0gPHN0cmluZz5Db3JlLmNyZWF0ZVNlcnZlckNvbm5lY3Rpb25VcmwoY29ubmVjdGlvbk9wdGlvbnMpO1xuICAgICAgfVxuICAgIH1cblxuKi9cbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgICBmdW5jdGlvbiBnaXRVcmxQcmVmaXgoKSB7XG4gICAgICAgIHZhciBwcmVmaXggPSBcIlwiO1xuICAgICAgICB2YXIgaW5qZWN0b3IgPSBIYXd0aW9Db3JlLmluamVjdG9yO1xuICAgICAgICBpZiAoaW5qZWN0b3IpIHtcbiAgICAgICAgICAgIHByZWZpeCA9IGluamVjdG9yLmdldChcIldpa2lHaXRVcmxQcmVmaXhcIikgfHwgXCJcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJlZml4O1xuICAgIH1cblxuICAgIC8qKlxuICAgKiBSZXR1cm5zIGEgcmVsYXRpdmUgVVJMIHRvIHBlcmZvcm0gYSBHRVQgb3IgUE9TVCBmb3IgdGhlIGdpdmVuIGJyYW5jaC9wYXRoXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZ2l0UmVsYXRpdmVVUkwoJHNjb3BlLCBwYXRoOiBzdHJpbmcpIHtcbiAgICAgIHZhciBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgIHZhciBwcmVmaXggPSBnaXRVcmxQcmVmaXgoKTtcbiAgICBicmFuY2ggPSBicmFuY2ggfHwgXCJtYXN0ZXJcIjtcbiAgICBwYXRoID0gcGF0aCB8fCBcIi9cIjtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKHByZWZpeCwgXCJnaXQvXCIgKyBicmFuY2gsIHBhdGgpO1xuICB9XG5cblxuICAvKipcbiAgICogVGFrZXMgYSByb3cgY29udGFpbmluZyB0aGUgZW50aXR5IG9iamVjdDsgb3IgY2FuIHRha2UgdGhlIGVudGl0eSBkaXJlY3RseS5cbiAgICpcbiAgICogSXQgdGhlbiB1c2VzIHRoZSBuYW1lLCBkaXJlY3RvcnkgYW5kIHhtbE5hbWVzcGFjZXMgcHJvcGVydGllc1xuICAgKlxuICAgKiBAbWV0aG9kIGZpbGVJY29uSHRtbFxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge2FueX0gcm93XG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICpcbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlSWNvbkh0bWwocm93KSB7XG4gICAgdmFyIG5hbWUgPSByb3cubmFtZTtcbiAgICB2YXIgcGF0aCA9IHJvdy5wYXRoO1xuICAgIHZhciBicmFuY2ggPSByb3cuYnJhbmNoIDtcbiAgICB2YXIgZGlyZWN0b3J5ID0gcm93LmRpcmVjdG9yeTtcbiAgICB2YXIgeG1sTmFtZXNwYWNlcyA9IHJvdy54bWxfbmFtZXNwYWNlcyB8fCByb3cueG1sTmFtZXNwYWNlcztcbiAgICB2YXIgaWNvblVybCA9IHJvdy5pY29uVXJsO1xuICAgIHZhciBlbnRpdHkgPSByb3cuZW50aXR5O1xuICAgIGlmIChlbnRpdHkpIHtcbiAgICAgIG5hbWUgPSBuYW1lIHx8IGVudGl0eS5uYW1lO1xuICAgICAgcGF0aCA9IHBhdGggfHwgZW50aXR5LnBhdGg7XG4gICAgICBicmFuY2ggPSBicmFuY2ggfHwgZW50aXR5LmJyYW5jaDtcbiAgICAgIGRpcmVjdG9yeSA9IGRpcmVjdG9yeSB8fCBlbnRpdHkuZGlyZWN0b3J5O1xuICAgICAgeG1sTmFtZXNwYWNlcyA9IHhtbE5hbWVzcGFjZXMgfHwgZW50aXR5LnhtbF9uYW1lc3BhY2VzIHx8IGVudGl0eS54bWxOYW1lc3BhY2VzO1xuICAgICAgaWNvblVybCA9IGljb25VcmwgfHwgZW50aXR5Lmljb25Vcmw7XG4gICAgfVxuICAgIGJyYW5jaCA9IGJyYW5jaCB8fCBcIm1hc3RlclwiO1xuICAgIHZhciBjc3MgPSBudWxsO1xuICAgIHZhciBpY29uOnN0cmluZyA9IG51bGw7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgLy8gVE9ETyBjb3VsZCB3ZSB1c2UgZGlmZmVyZW50IGljb25zIGZvciBtYXJrZG93biB2IHhtbCB2IGh0bWxcbiAgICBpZiAoeG1sTmFtZXNwYWNlcyAmJiB4bWxOYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5jYW1lbE5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgaWNvbiA9IFwiaW1nL2ljb25zL2NhbWVsLnN2Z1wiO1xuICAgICAgfSBlbHNlIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuZG96ZXJOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgIGljb24gPSBcImltZy9pY29ucy9kb3plci9kb3plci5naWZcIjtcbiAgICAgIH0gZWxzZSBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmFjdGl2ZW1xTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICBpY29uID0gXCJpbWcvaWNvbnMvbWVzc2FnZWJyb2tlci5zdmdcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcImZpbGUgXCIgKyBuYW1lICsgXCIgaGFzIG5hbWVzcGFjZXMgXCIgKyB4bWxOYW1lc3BhY2VzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFpY29uVXJsICYmIG5hbWUpIHtcbiAgICAgIHZhciBsb3dlck5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICBpZiAobG93ZXJOYW1lID09IFwicG9tLnhtbFwiKSB7XG4gICAgICAgIGljb25VcmwgPSBcImltZy9tYXZlbi1pY29uLnBuZ1wiO1xuICAgICAgfSBlbHNlIGlmIChsb3dlck5hbWUgPT0gXCJqZW5raW5zZmlsZVwiKSB7XG4gICAgICAgIGljb25VcmwgPSBcImltZy9qZW5raW5zLWljb24uc3ZnXCI7XG4gICAgICB9IGVsc2UgaWYgKGxvd2VyTmFtZSA9PSBcImZhYnJpYzgueW1sXCIpIHtcbiAgICAgICAgaWNvblVybCA9IFwiaW1nL2ZhYnJpYzhfaWNvbi5zdmdcIjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaWNvblVybCkge1xuICAgICAgY3NzID0gbnVsbDtcbiAgICAgIGljb24gPSBpY29uVXJsO1xuLypcbiAgICAgIHZhciBwcmVmaXggPSBnaXRVcmxQcmVmaXgoKTtcbiAgICAgIGljb24gPSBVcmxIZWxwZXJzLmpvaW4ocHJlZml4LCBcImdpdFwiLCBpY29uVXJsKTtcbiovXG4vKlxuICAgICAgdmFyIGNvbm5lY3Rpb25OYW1lID0gQ29yZS5nZXRDb25uZWN0aW9uTmFtZVBhcmFtZXRlcigpO1xuICAgICAgaWYgKGNvbm5lY3Rpb25OYW1lKSB7XG4gICAgICAgIHZhciBjb25uZWN0aW9uT3B0aW9ucyA9IENvcmUuZ2V0Q29ubmVjdE9wdGlvbnMoY29ubmVjdGlvbk5hbWUpO1xuICAgICAgICBpZiAoY29ubmVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgICBjb25uZWN0aW9uT3B0aW9ucy5wYXRoID0gQ29yZS51cmwoJy8nICsgaWNvbik7XG4gICAgICAgICAgaWNvbiA9IDxzdHJpbmc+Q29yZS5jcmVhdGVTZXJ2ZXJDb25uZWN0aW9uVXJsKGNvbm5lY3Rpb25PcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfVxuKi9cbiAgICB9XG4gICAgaWYgKCFpY29uKSB7XG4gICAgICBpZiAoZGlyZWN0b3J5KSB7XG4gICAgICAgIHN3aXRjaCAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgY2FzZSAncHJvZmlsZSc6XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWJvb2tcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBsb2cuZGVidWcoXCJObyBtYXRjaCBmb3IgZXh0ZW5zaW9uOiBcIiwgZXh0ZW5zaW9uLCBcIiB1c2luZyBhIGdlbmVyaWMgZm9sZGVyIGljb25cIik7XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZvbGRlciBmb2xkZXItaWNvblwiO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzd2l0Y2ggKGV4dGVuc2lvbikge1xuICAgICAgICAgIGNhc2UgJ2phdmEnOlxuICAgICAgICAgICAgaWNvbiA9IFwiaW1nL2phdmEuc3ZnXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdwbmcnOlxuICAgICAgICAgIGNhc2UgJ3N2Zyc6XG4gICAgICAgICAgY2FzZSAnanBnJzpcbiAgICAgICAgICBjYXNlICdnaWYnOlxuICAgICAgICAgICAgY3NzID0gbnVsbDtcbiAgICAgICAgICAgIGljb24gPSBXaWtpLmdpdFJlbGF0aXZlVVJMKGJyYW5jaCwgcGF0aCk7XG4vKlxuICAgICAgICAgICAgdmFyIGNvbm5lY3Rpb25OYW1lID0gQ29yZS5nZXRDb25uZWN0aW9uTmFtZVBhcmFtZXRlcigpO1xuICAgICAgICAgICAgaWYgKGNvbm5lY3Rpb25OYW1lKSB7XG4gICAgICAgICAgICAgIHZhciBjb25uZWN0aW9uT3B0aW9ucyA9IENvcmUuZ2V0Q29ubmVjdE9wdGlvbnMoY29ubmVjdGlvbk5hbWUpO1xuICAgICAgICAgICAgICBpZiAoY29ubmVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uT3B0aW9ucy5wYXRoID0gQ29yZS51cmwoJy8nICsgaWNvbik7XG4gICAgICAgICAgICAgICAgaWNvbiA9IDxzdHJpbmc+Q29yZS5jcmVhdGVTZXJ2ZXJDb25uZWN0aW9uVXJsKGNvbm5lY3Rpb25PcHRpb25zKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuKi9cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2pzb24nOlxuICAgICAgICAgIGNhc2UgJ3htbCc6XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZpbGUtdGV4dFwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnbWQnOlxuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1maWxlLXRleHQtb1wiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIGxvZy5kZWJ1ZyhcIk5vIG1hdGNoIGZvciBleHRlbnNpb246IFwiLCBleHRlbnNpb24sIFwiIHVzaW5nIGEgZ2VuZXJpYyBmaWxlIGljb25cIik7XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZpbGUtb1wiO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpY29uKSB7XG4gICAgICByZXR1cm4gXCI8aW1nIHNyYz0nXCIgKyBDb3JlLnVybChpY29uKSArIFwiJz5cIjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFwiPGkgY2xhc3M9J1wiICsgY3NzICsgXCInPjwvaT5cIjtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaWNvbkNsYXNzKHJvdykge1xuICAgIHZhciBuYW1lID0gcm93LmdldFByb3BlcnR5KFwibmFtZVwiKTtcbiAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICB2YXIgZGlyZWN0b3J5ID0gcm93LmdldFByb3BlcnR5KFwiZGlyZWN0b3J5XCIpO1xuICAgIGlmIChkaXJlY3RvcnkpIHtcbiAgICAgIHJldHVybiBcImZhIGZhLWZvbGRlclwiO1xuICAgIH1cbiAgICBpZiAoXCJ4bWxcIiA9PT0gZXh0ZW5zaW9uKSB7XG4gICAgICAgIHJldHVybiBcImZhIGZhLWNvZ1wiO1xuICAgIH0gZWxzZSBpZiAoXCJtZFwiID09PSBleHRlbnNpb24pIHtcbiAgICAgICAgcmV0dXJuIFwiZmEgZmEtZmlsZS10ZXh0LW9cIjtcbiAgICB9XG4gICAgLy8gVE9ETyBjb3VsZCB3ZSB1c2UgZGlmZmVyZW50IGljb25zIGZvciBtYXJrZG93biB2IHhtbCB2IGh0bWxcbiAgICByZXR1cm4gXCJmYSBmYS1maWxlLW9cIjtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIHRoZSBwYWdlSWQsIGJyYW5jaCwgb2JqZWN0SWQgZnJvbSB0aGUgcm91dGUgcGFyYW1ldGVyc1xuICAgKiBAbWV0aG9kIGluaXRTY29wZVxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0geyp9ICRzY29wZVxuICAgKiBAcGFyYW0ge2FueX0gJHJvdXRlUGFyYW1zXG4gICAqIEBwYXJhbSB7bmcuSUxvY2F0aW9uU2VydmljZX0gJGxvY2F0aW9uXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pIHtcbiAgICAkc2NvcGUucGFnZUlkID0gV2lraS5wYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuXG4gICAgLy8gbGV0cyBsZXQgdGhlc2UgdG8gYmUgaW5oZXJpdGVkIGlmIHdlIGluY2x1ZGUgYSB0ZW1wbGF0ZSBvbiBhbm90aGVyIHBhZ2VcbiAgICAkc2NvcGUucHJvamVjdElkID0gJHJvdXRlUGFyYW1zW1wicHJvamVjdElkXCJdIHx8ICRzY29wZS5pZDtcbiAgICAkc2NvcGUubmFtZXNwYWNlID0gJHJvdXRlUGFyYW1zW1wibmFtZXNwYWNlXCJdIHx8ICRzY29wZS5uYW1lc3BhY2U7XG4gICAgS3ViZXJuZXRlcy5zZXRDdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgkc2NvcGUubmFtZXNwYWNlKTtcblxuICAgICRzY29wZS5vd25lciA9ICRyb3V0ZVBhcmFtc1tcIm93bmVyXCJdO1xuICAgICRzY29wZS5yZXBvSWQgPSAkcm91dGVQYXJhbXNbXCJyZXBvSWRcIl07XG4gICAgJHNjb3BlLmJyYW5jaCA9ICRyb3V0ZVBhcmFtc1tcImJyYW5jaFwiXSB8fCAkbG9jYXRpb24uc2VhcmNoKClbXCJicmFuY2hcIl07XG4gICAgJHNjb3BlLm9iamVjdElkID0gJHJvdXRlUGFyYW1zW1wib2JqZWN0SWRcIl0gfHwgJHJvdXRlUGFyYW1zW1wiZGlmZk9iamVjdElkMVwiXTtcbiAgICAkc2NvcGUuc3RhcnRMaW5rID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgJHNjb3BlLiR2aWV3TGluayA9IHZpZXdMaW5rKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uKTtcbiAgICAkc2NvcGUuaGlzdG9yeUxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArIFwiL2hpc3RvcnkvXCIgKyAoJHNjb3BlLnBhZ2VJZCB8fCBcIlwiKTtcbiAgICAkc2NvcGUud2lraVJlcG9zaXRvcnkgPSBuZXcgR2l0V2lraVJlcG9zaXRvcnkoJHNjb3BlKTtcbiAgICAkc2NvcGUuJHdvcmtzcGFjZUxpbmsgPSBEZXZlbG9wZXIud29ya3NwYWNlTGluaygpO1xuICAgICRzY29wZS4kcHJvamVjdExpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgJHNjb3BlLmJyZWFkY3J1bWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdEJyZWFkY3J1bWJzKCRzY29wZS5wcm9qZWN0SWQsIGNyZWF0ZVNvdXJjZUJyZWFkY3J1bWJzKCRzY29wZSkpO1xuICAgICRzY29wZS5zdWJUYWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdFN1Yk5hdkJhcnMoJHNjb3BlLnByb2plY3RJZCk7XG5cbiAgICBGb3JnZS5yZWRpcmVjdFRvU2V0dXBTZWNyZXRzSWZOb3REZWZpbmVkKCRzY29wZSwgJGxvY2F0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2FkcyB0aGUgYnJhbmNoZXMgZm9yIHRoaXMgd2lraSByZXBvc2l0b3J5IGFuZCBzdG9yZXMgdGhlbSBpbiB0aGUgYnJhbmNoZXMgcHJvcGVydHkgaW5cbiAgICogdGhlICRzY29wZSBhbmQgZW5zdXJlcyAkc2NvcGUuYnJhbmNoIGlzIHNldCB0byBhIHZhbGlkIHZhbHVlXG4gICAqXG4gICAqIEBwYXJhbSB3aWtpUmVwb3NpdG9yeVxuICAgKiBAcGFyYW0gJHNjb3BlXG4gICAqIEBwYXJhbSBpc0ZtYyB3aGV0aGVyIHdlIHJ1biBhcyBmYWJyaWM4IG9yIGFzIGhhd3Rpb1xuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyA9IGZhbHNlKSB7XG4gICAgd2lraVJlcG9zaXRvcnkuYnJhbmNoZXMoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAvLyBsZXRzIHNvcnQgYnkgdmVyc2lvbiBudW1iZXJcbiAgICAgICRzY29wZS5icmFuY2hlcyA9IHJlc3BvbnNlLnNvcnRCeSgodikgPT4gQ29yZS52ZXJzaW9uVG9Tb3J0YWJsZVN0cmluZyh2KSwgdHJ1ZSk7XG5cbiAgICAgIC8vIGRlZmF1bHQgdGhlIGJyYW5jaCBuYW1lIGlmIHdlIGhhdmUgJ21hc3RlcidcbiAgICAgIGlmICghJHNjb3BlLmJyYW5jaCAmJiAkc2NvcGUuYnJhbmNoZXMuZmluZCgoYnJhbmNoKSA9PiB7XG4gICAgICAgIHJldHVybiBicmFuY2ggPT09IFwibWFzdGVyXCI7XG4gICAgICB9KSkge1xuICAgICAgICAkc2NvcGUuYnJhbmNoID0gXCJtYXN0ZXJcIjtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdHMgdGhlIHBhZ2VJZCBmcm9tIHRoZSByb3V0ZSBwYXJhbWV0ZXJzXG4gICAqIEBtZXRob2QgcGFnZUlkXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7YW55fSAkcm91dGVQYXJhbXNcbiAgICogQHBhcmFtIEBuZy5JTG9jYXRpb25TZXJ2aWNlIEBsb2NhdGlvblxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gcGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKSB7XG4gICAgdmFyIHBhZ2VJZCA9ICRyb3V0ZVBhcmFtc1sncGFnZSddO1xuICAgIGlmICghcGFnZUlkKSB7XG4gICAgICAvLyBMZXRzIGRlYWwgd2l0aCB0aGUgaGFjayBvZiBBbmd1bGFySlMgbm90IHN1cHBvcnRpbmcgLyBpbiBhIHBhdGggdmFyaWFibGVcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMTAwOyBpKyspIHtcbiAgICAgICAgdmFyIHZhbHVlID0gJHJvdXRlUGFyYW1zWydwYXRoJyArIGldO1xuICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpKSB7XG4gICAgICAgICAgaWYgKCFwYWdlSWQpIHtcbiAgICAgICAgICAgIHBhZ2VJZCA9IHZhbHVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYWdlSWQgKz0gXCIvXCIgKyB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBicmVhaztcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYWdlSWQgfHwgXCIvXCI7XG4gICAgfVxuXG4gICAgLy8gaWYgbm8gJHJvdXRlUGFyYW1zIHZhcmlhYmxlcyBsZXRzIGZpZ3VyZSBpdCBvdXQgZnJvbSB0aGUgJGxvY2F0aW9uXG4gICAgaWYgKCFwYWdlSWQpIHtcbiAgICAgIHBhZ2VJZCA9IHBhZ2VJZEZyb21VUkkoJGxvY2F0aW9uLnBhdGgoKSk7XG4gICAgfVxuICAgIHJldHVybiBwYWdlSWQ7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcGFnZUlkRnJvbVVSSSh1cmw6c3RyaW5nKSB7XG4gICAgdmFyIHdpa2lQcmVmaXggPSBcIi93aWtpL1wiO1xuICAgIGlmICh1cmwgJiYgdXJsLnN0YXJ0c1dpdGgod2lraVByZWZpeCkpIHtcbiAgICAgIHZhciBpZHggPSB1cmwuaW5kZXhPZihcIi9cIiwgd2lraVByZWZpeC5sZW5ndGggKyAxKTtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIHJldHVybiB1cmwuc3Vic3RyaW5nKGlkeCArIDEsIHVybC5sZW5ndGgpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsXG5cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlRXh0ZW5zaW9uKG5hbWUpIHtcbiAgICBpZiAobmFtZS5pbmRleE9mKCcjJykgPiAwKVxuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKDAsIG5hbWUuaW5kZXhPZignIycpKTtcbiAgICByZXR1cm4gQ29yZS5maWxlRXh0ZW5zaW9uKG5hbWUsIFwibWFya2Rvd25cIik7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBvbkNvbXBsZXRlKHN0YXR1cykge1xuICAgIGNvbnNvbGUubG9nKFwiQ29tcGxldGVkIG9wZXJhdGlvbiB3aXRoIHN0YXR1czogXCIgKyBKU09OLnN0cmluZ2lmeShzdGF0dXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZXMgdGhlIGdpdmVuIEpTT04gdGV4dCByZXBvcnRpbmcgdG8gdGhlIHVzZXIgaWYgdGhlcmUgaXMgYSBwYXJzZSBlcnJvclxuICAgKiBAbWV0aG9kIHBhcnNlSnNvblxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gdGV4dFxuICAgKiBAcmV0dXJuIHthbnl9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gcGFyc2VKc29uKHRleHQ6c3RyaW5nKSB7XG4gICAgaWYgKHRleHQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKHRleHQpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcImVycm9yXCIsIFwiRmFpbGVkIHRvIHBhcnNlIEpTT046IFwiICsgZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkanVzdHMgYSByZWxhdGl2ZSBvciBhYnNvbHV0ZSBsaW5rIGZyb20gYSB3aWtpIG9yIGZpbGUgc3lzdGVtIHRvIG9uZSB1c2luZyB0aGUgaGFzaCBiYW5nIHN5bnRheFxuICAgKiBAbWV0aG9kIGFkanVzdEhyZWZcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHsqfSAkc2NvcGVcbiAgICogQHBhcmFtIHtuZy5JTG9jYXRpb25TZXJ2aWNlfSAkbG9jYXRpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IGhyZWZcbiAgICogQHBhcmFtIHtTdHJpbmd9IGZpbGVFeHRlbnNpb25cbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGFkanVzdEhyZWYoJHNjb3BlLCAkbG9jYXRpb24sIGhyZWYsIGZpbGVFeHRlbnNpb24pIHtcbiAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZUV4dGVuc2lvbiA/IFwiLlwiICsgZmlsZUV4dGVuc2lvbiA6IFwiXCI7XG5cbiAgICAvLyBpZiB0aGUgbGFzdCBwYXJ0IG9mIHRoZSBwYXRoIGhhcyBhIGRvdCBpbiBpdCBsZXRzXG4gICAgLy8gZXhjbHVkZSBpdCBhcyB3ZSBhcmUgcmVsYXRpdmUgdG8gYSBtYXJrZG93biBvciBodG1sIGZpbGUgaW4gYSBmb2xkZXJcbiAgICAvLyBzdWNoIGFzIHdoZW4gdmlld2luZyByZWFkbWUubWQgb3IgaW5kZXgubWRcbiAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgdmFyIGZvbGRlclBhdGggPSBwYXRoO1xuICAgIHZhciBpZHggPSBwYXRoLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgdmFyIGxhc3ROYW1lID0gcGF0aC5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICBpZiAobGFzdE5hbWUuaW5kZXhPZihcIi5cIikgPj0gMCkge1xuICAgICAgICBmb2xkZXJQYXRoID0gcGF0aC5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZWFsIHdpdGggcmVsYXRpdmUgVVJMcyBmaXJzdC4uLlxuICAgIGlmIChocmVmLnN0YXJ0c1dpdGgoJy4uLycpKSB7XG4gICAgICB2YXIgcGFydHMgPSBocmVmLnNwbGl0KCcvJyk7XG4gICAgICB2YXIgcGF0aFBhcnRzID0gZm9sZGVyUGF0aC5zcGxpdCgnLycpO1xuICAgICAgdmFyIHBhcmVudHMgPSBwYXJ0cy5maWx0ZXIoKHBhcnQpID0+IHtcbiAgICAgICAgcmV0dXJuIHBhcnQgPT09IFwiLi5cIjtcbiAgICAgIH0pO1xuICAgICAgcGFydHMgPSBwYXJ0cy5sYXN0KHBhcnRzLmxlbmd0aCAtIHBhcmVudHMubGVuZ3RoKTtcbiAgICAgIHBhdGhQYXJ0cyA9IHBhdGhQYXJ0cy5maXJzdChwYXRoUGFydHMubGVuZ3RoIC0gcGFyZW50cy5sZW5ndGgpO1xuXG4gICAgICByZXR1cm4gJyMnICsgcGF0aFBhcnRzLmpvaW4oJy8nKSArICcvJyArIHBhcnRzLmpvaW4oJy8nKSArIGV4dGVuc2lvbiArICRsb2NhdGlvbi5oYXNoKCk7XG4gICAgfVxuXG4gICAgLy8gVHVybiBhbiBhYnNvbHV0ZSBsaW5rIGludG8gYSB3aWtpIGxpbmsuLi5cbiAgICBpZiAoaHJlZi5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgIHJldHVybiBXaWtpLmJyYW5jaExpbmsoJHNjb3BlLCBocmVmICsgZXh0ZW5zaW9uLCAkbG9jYXRpb24pICsgZXh0ZW5zaW9uO1xuICAgIH1cblxuICAgIGlmICghV2lraS5leGNsdWRlQWRqdXN0bWVudFByZWZpeGVzLmFueSgoZXhjbHVkZSkgPT4ge1xuICAgICAgcmV0dXJuIGhyZWYuc3RhcnRzV2l0aChleGNsdWRlKTtcbiAgICB9KSkge1xuICAgICAgcmV0dXJuICcjJyArIGZvbGRlclBhdGggKyBcIi9cIiArIGhyZWYgKyBleHRlbnNpb24gKyAkbG9jYXRpb24uaGFzaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqIEBtYWluIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9ICd3aWtpJztcbiAgZXhwb3J0IHZhciB0ZW1wbGF0ZVBhdGggPSAncGx1Z2lucy93aWtpL2h0bWwvJztcbiAgZXhwb3J0IHZhciB0YWI6YW55ID0gbnVsbDtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbJ2hhd3Rpby1jb3JlJywgJ2hhd3Rpby11aScsICd0cmVlQ29udHJvbCcsICd1aS5jb2RlbWlycm9yJ10pO1xuICBleHBvcnQgdmFyIGNvbnRyb2xsZXIgPSBQbHVnaW5IZWxwZXJzLmNyZWF0ZUNvbnRyb2xsZXJGdW5jdGlvbihfbW9kdWxlLCAnV2lraScpO1xuICBleHBvcnQgdmFyIHJvdXRlID0gUGx1Z2luSGVscGVycy5jcmVhdGVSb3V0aW5nRnVuY3Rpb24odGVtcGxhdGVQYXRoKTtcblxuICBfbW9kdWxlLmNvbmZpZyhbXCIkcm91dGVQcm92aWRlclwiLCAoJHJvdXRlUHJvdmlkZXIpID0+IHtcblxuICAgIC8vIGFsbG93IG9wdGlvbmFsIGJyYW5jaCBwYXRocy4uLlxuICAgIGFuZ3VsYXIuZm9yRWFjaChbXCJcIiwgXCIvYnJhbmNoLzpicmFuY2hcIl0sIChwYXRoKSA9PiB7XG4gICAgICAvL3ZhciBzdGFydENvbnRleHQgPSAnL3dpa2knO1xuICAgICAgdmFyIHN0YXJ0Q29udGV4dCA9ICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL3Byb2plY3RzLzpwcm9qZWN0SWQvd2lraSc7XG4gICAgICAkcm91dGVQcm92aWRlci5cbiAgICAgICAgICAgICAgd2hlbihVcmxIZWxwZXJzLmpvaW4oc3RhcnRDb250ZXh0LCBwYXRoLCAndmlldycpLCByb3V0ZSgndmlld1BhZ2UuaHRtbCcsIGZhbHNlKSkuXG4gICAgICAgICAgICAgIHdoZW4oVXJsSGVscGVycy5qb2luKHN0YXJ0Q29udGV4dCwgcGF0aCwgJ2NyZWF0ZS86cGFnZSonKSwgcm91dGUoJ2NyZWF0ZS5odG1sJywgZmFsc2UpKS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy92aWV3LzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL3ZpZXdQYWdlLmh0bWwnLCByZWxvYWRPblNlYXJjaDogZmFsc2V9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9ib29rLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL3ZpZXdCb29rLmh0bWwnLCByZWxvYWRPblNlYXJjaDogZmFsc2V9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9lZGl0LzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2VkaXRQYWdlLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvdmVyc2lvbi86cGFnZSpcXC86b2JqZWN0SWQnLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC92aWV3UGFnZS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2hpc3RvcnkvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvaGlzdG9yeS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NvbW1pdC86cGFnZSpcXC86b2JqZWN0SWQnLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb21taXQuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jb21taXREZXRhaWwvOnBhZ2UqXFwvOm9iamVjdElkJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29tbWl0RGV0YWlsLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvZGlmZi86ZGlmZk9iamVjdElkMS86ZGlmZk9iamVjdElkMi86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC92aWV3UGFnZS5odG1sJywgcmVsb2FkT25TZWFyY2g6IGZhbHNlfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvZm9ybVRhYmxlLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2Zvcm1UYWJsZS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2RvemVyL21hcHBpbmdzLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2RvemVyTWFwcGluZ3MuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jb25maWd1cmF0aW9ucy86cGFnZSonLCB7IHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29uZmlndXJhdGlvbnMuaHRtbCcgfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY29uZmlndXJhdGlvbi86cGlkLzpwYWdlKicsIHsgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb25maWd1cmF0aW9uLmh0bWwnIH0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL25ld0NvbmZpZ3VyYXRpb24vOmZhY3RvcnlQaWQvOnBhZ2UqJywgeyB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbmZpZ3VyYXRpb24uaHRtbCcgfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY2FtZWwvZGlhZ3JhbS86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jYW1lbERpYWdyYW0uaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jYW1lbC9jYW52YXMvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY2FtZWxDYW52YXMuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jYW1lbC9wcm9wZXJ0aWVzLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NhbWVsUHJvcGVydGllcy5odG1sJ30pO1xuICAgIH0pO1xufV0pO1xuXG4gIC8qKlxuICAgKiBCcmFuY2ggTWVudSBzZXJ2aWNlXG4gICAqL1xuICBleHBvcnQgaW50ZXJmYWNlIEJyYW5jaE1lbnUge1xuICAgIGFkZEV4dGVuc2lvbjogKGl0ZW06VUkuTWVudUl0ZW0pID0+IHZvaWQ7XG4gICAgYXBwbHlNZW51RXh0ZW5zaW9uczogKG1lbnU6VUkuTWVudUl0ZW1bXSkgPT4gdm9pZDtcbiAgfVxuXG4gIF9tb2R1bGUuZmFjdG9yeSgnd2lraUJyYW5jaE1lbnUnLCAoKSA9PiB7XG4gICAgdmFyIHNlbGYgPSB7XG4gICAgICBpdGVtczogW10sXG4gICAgICBhZGRFeHRlbnNpb246IChpdGVtOlVJLk1lbnVJdGVtKSA9PiB7XG4gICAgICAgIHNlbGYuaXRlbXMucHVzaChpdGVtKTtcbiAgICAgIH0sXG4gICAgICBhcHBseU1lbnVFeHRlbnNpb25zOiAobWVudTpVSS5NZW51SXRlbVtdKSA9PiB7XG4gICAgICAgIGlmIChzZWxmLml0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXh0ZW5kZWRNZW51OlVJLk1lbnVJdGVtW10gPSBbe1xuICAgICAgICAgIGhlYWRpbmc6IFwiQWN0aW9uc1wiXG4gICAgICAgIH1dO1xuICAgICAgICBzZWxmLml0ZW1zLmZvckVhY2goKGl0ZW06VUkuTWVudUl0ZW0pID0+IHtcbiAgICAgICAgICBpZiAoaXRlbS52YWxpZCgpKSB7XG4gICAgICAgICAgICBleHRlbmRlZE1lbnUucHVzaChpdGVtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZXh0ZW5kZWRNZW51Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBtZW51LmFkZChleHRlbmRlZE1lbnUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gc2VsZjtcbiAgfSk7XG5cbiAgX21vZHVsZS5mYWN0b3J5KCdXaWtpR2l0VXJsUHJlZml4JywgKCkgPT4ge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gIH0pO1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeScsICgpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgXCJpbWFnZVwiOiBbXCJzdmdcIiwgXCJwbmdcIiwgXCJpY29cIiwgXCJibXBcIiwgXCJqcGdcIiwgXCJnaWZcIl0sXG4gICAgICBcIm1hcmtkb3duXCI6IFtcIm1kXCIsIFwibWFya2Rvd25cIiwgXCJtZG93blwiLCBcIm1rZG5cIiwgXCJta2RcIl0sXG4gICAgICBcImh0bWxtaXhlZFwiOiBbXCJodG1sXCIsIFwieGh0bWxcIiwgXCJodG1cIl0sXG4gICAgICBcInRleHQveC1qYXZhXCI6IFtcImphdmFcIl0sXG4gICAgICBcInRleHQveC1ncm9vdnlcIjogW1wiZ3Jvb3Z5XCJdLFxuICAgICAgXCJ0ZXh0L3gtc2NhbGFcIjogW1wic2NhbGFcIl0sXG4gICAgICBcImphdmFzY3JpcHRcIjogW1wianNcIiwgXCJqc29uXCIsIFwiamF2YXNjcmlwdFwiLCBcImpzY3JpcHRcIiwgXCJlY21hc2NyaXB0XCIsIFwiZm9ybVwiXSxcbiAgICAgIFwieG1sXCI6IFtcInhtbFwiLCBcInhzZFwiLCBcIndzZGxcIiwgXCJhdG9tXCJdLFxuICAgICAgXCJ0ZXh0L3gteWFtbFwiOiBbXCJ5YW1sXCIsIFwieW1sXCJdLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IFtcInByb3BlcnRpZXNcIl1cbiAgICB9O1xuICB9KTtcblxuICBfbW9kdWxlLmZpbHRlcignZmlsZUljb25DbGFzcycsICgpID0+IGljb25DbGFzcyk7XG5cbiAgX21vZHVsZS5ydW4oW1wiJGxvY2F0aW9uXCIsXCJ2aWV3UmVnaXN0cnlcIiwgIFwibG9jYWxTdG9yYWdlXCIsIFwibGF5b3V0RnVsbFwiLCBcImhlbHBSZWdpc3RyeVwiLCBcInByZWZlcmVuY2VzUmVnaXN0cnlcIiwgXCJ3aWtpUmVwb3NpdG9yeVwiLFxuICAgIFwiJHJvb3RTY29wZVwiLCAoJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsXG4gICAgICAgIHZpZXdSZWdpc3RyeSxcbiAgICAgICAgbG9jYWxTdG9yYWdlLFxuICAgICAgICBsYXlvdXRGdWxsLFxuICAgICAgICBoZWxwUmVnaXN0cnksXG4gICAgICAgIHByZWZlcmVuY2VzUmVnaXN0cnksXG4gICAgICAgIHdpa2lSZXBvc2l0b3J5LFxuICAgICAgICAkcm9vdFNjb3BlKSA9PiB7XG5cbiAgICB2aWV3UmVnaXN0cnlbJ3dpa2knXSA9IHRlbXBsYXRlUGF0aCArICdsYXlvdXRXaWtpLmh0bWwnO1xuLypcbiAgICBoZWxwUmVnaXN0cnkuYWRkVXNlckRvYygnd2lraScsICdwbHVnaW5zL3dpa2kvZG9jL2hlbHAubWQnLCAoKSA9PiB7XG4gICAgICByZXR1cm4gV2lraS5pc1dpa2lFbmFibGVkKHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKTtcbiAgICB9KTtcbiovXG5cbi8qXG4gICAgcHJlZmVyZW5jZXNSZWdpc3RyeS5hZGRUYWIoXCJHaXRcIiwgJ3BsdWdpbnMvd2lraS9odG1sL2dpdFByZWZlcmVuY2VzLmh0bWwnKTtcbiovXG5cbi8qXG4gICAgdGFiID0ge1xuICAgICAgaWQ6IFwid2lraVwiLFxuICAgICAgY29udGVudDogXCJXaWtpXCIsXG4gICAgICB0aXRsZTogXCJWaWV3IGFuZCBlZGl0IHdpa2kgcGFnZXNcIixcbiAgICAgIGlzVmFsaWQ6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiBXaWtpLmlzV2lraUVuYWJsZWQod29ya3NwYWNlLCBqb2xva2lhLCBsb2NhbFN0b3JhZ2UpLFxuICAgICAgaHJlZjogKCkgPT4gXCIjL3dpa2kvdmlld1wiLFxuICAgICAgaXNBY3RpdmU6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiB3b3Jrc3BhY2UuaXNMaW5rQWN0aXZlKFwiL3dpa2lcIikgJiYgIXdvcmtzcGFjZS5saW5rQ29udGFpbnMoXCJmYWJyaWNcIiwgXCJwcm9maWxlc1wiKSAmJiAhd29ya3NwYWNlLmxpbmtDb250YWlucyhcImVkaXRGZWF0dXJlc1wiKVxuICAgIH07XG4gICAgd29ya3NwYWNlLnRvcExldmVsVGFicy5wdXNoKHRhYik7XG4qL1xuXG4gICAgLy8gYWRkIGVtcHR5IHJlZ2V4cyB0byB0ZW1wbGF0ZXMgdGhhdCBkb24ndCBkZWZpbmVcbiAgICAvLyB0aGVtIHNvIG5nLXBhdHRlcm4gZG9lc24ndCBiYXJmXG4gICAgV2lraS5kb2N1bWVudFRlbXBsYXRlcy5mb3JFYWNoKCh0ZW1wbGF0ZTogYW55KSA9PiB7XG4gICAgICBpZiAoIXRlbXBsYXRlWydyZWdleCddKSB7XG4gICAgICAgIHRlbXBsYXRlLnJlZ2V4ID0gLyg/OikvO1xuICAgICAgfVxuICAgIH0pO1xuXG4gIH1dKTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIuYWRkTW9kdWxlKHBsdWdpbk5hbWUpO1xufVxuIiwiLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vd2lraVBsdWdpbi50c1wiLz5cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgdmFyIENhbWVsQ29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuQ2FtZWxDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRyb290U2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkY29tcGlsZVwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwibG9jYWxTdG9yYWdlXCIsICgkc2NvcGUsICRyb290U2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkY29tcGlsZSwgJHRlbXBsYXRlQ2FjaGUsIGxvY2FsU3RvcmFnZTpXaW5kb3dMb2NhbFN0b3JhZ2UpID0+IHtcblxuICAgIC8vIFRPRE8gUkVNT1ZFXG4gICAgdmFyIGpvbG9raWEgPSBudWxsO1xuICAgIHZhciBqb2xva2lhU3RhdHVzID0gbnVsbDtcbiAgICB2YXIgam14VHJlZUxhenlMb2FkUmVnaXN0cnkgPSBudWxsO1xuICAgIHZhciB1c2VyRGV0YWlscyA9IG51bGw7XG4gICAgdmFyIEhhd3Rpb05hdiA9IG51bGw7XG4gICAgdmFyIHdvcmtzcGFjZSA9IG5ldyBXb3Jrc3BhY2Uoam9sb2tpYSwgam9sb2tpYVN0YXR1cywgam14VHJlZUxhenlMb2FkUmVnaXN0cnksICRsb2NhdGlvbiwgJGNvbXBpbGUsICR0ZW1wbGF0ZUNhY2hlLCBsb2NhbFN0b3JhZ2UsICRyb290U2NvcGUsIHVzZXJEZXRhaWxzLCBIYXd0aW9OYXYpO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgQ2FtZWwuaW5pdEVuZHBvaW50Q2hvb3NlclNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCBsb2NhbFN0b3JhZ2UsIHdvcmtzcGFjZSwgam9sb2tpYSk7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLnNjaGVtYSA9IENhbWVsLmdldENvbmZpZ3VyZWRDYW1lbE1vZGVsKCk7XG4gICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG5cbiAgICAkc2NvcGUuc3dpdGNoVG9DYW52YXNWaWV3ID0gbmV3IFVJLkRpYWxvZygpO1xuXG4gICAgJHNjb3BlLmZpbmRQcm9maWxlQ2FtZWxDb250ZXh0ID0gdHJ1ZTtcbiAgICAkc2NvcGUuY2FtZWxTZWxlY3Rpb25EZXRhaWxzID0ge1xuICAgICAgc2VsZWN0ZWRDYW1lbENvbnRleHRJZDogbnVsbCxcbiAgICAgIHNlbGVjdGVkUm91dGVJZDogbnVsbFxuICAgIH07XG5cbiAgICAkc2NvcGUuaXNWYWxpZCA9IChuYXYpID0+IHtcbiAgICAgIHJldHVybiBuYXYgJiYgbmF2LmlzVmFsaWQod29ya3NwYWNlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNhbWVsU3ViTGV2ZWxUYWJzID0gW1xuICAgICAge1xuICAgICAgICBjb250ZW50OiAnPGkgY2xhc3M9XCJmYSBmYS1waWN0dXJlLW9cIj48L2k+IENhbnZhcycsXG4gICAgICAgIHRpdGxlOiBcIkVkaXQgdGhlIGRpYWdyYW0gaW4gYSBkcmFnZ3kgZHJvcHB5IHdheVwiLFxuICAgICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gdHJ1ZSxcbiAgICAgICAgaHJlZjogKCkgPT4gV2lraS5zdGFydExpbmsoJHNjb3BlKSArIFwiL2NhbWVsL2NhbnZhcy9cIiArICRzY29wZS5wYWdlSWRcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGNvbnRlbnQ6ICc8aSBjbGFzcz1cImZhIGZhLXRyZWVcIj48L2k+IFRyZWUnLFxuICAgICAgICB0aXRsZTogXCJWaWV3IHRoZSByb3V0ZXMgYXMgYSB0cmVlXCIsXG4gICAgICAgIGlzVmFsaWQ6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiB0cnVlLFxuICAgICAgICBocmVmOiAoKSA9PiBXaWtpLnN0YXJ0TGluaygkc2NvcGUpICsgXCIvY2FtZWwvcHJvcGVydGllcy9cIiArICRzY29wZS5wYWdlSWRcbiAgICAgIH0vKixcbiAgICAgICB7XG4gICAgICAgY29udGVudDogJzxpIGNsYXNzPVwiZmEgZmEtc2l0ZW1hcFwiPjwvaT4gRGlhZ3JhbScsXG4gICAgICAgdGl0bGU6IFwiVmlldyBhIGRpYWdyYW0gb2YgdGhlIHJvdXRlXCIsXG4gICAgICAgaXNWYWxpZDogKHdvcmtzcGFjZTpXb3Jrc3BhY2UpID0+IHRydWUsXG4gICAgICAgaHJlZjogKCkgPT4gV2lraS5zdGFydExpbmsoJHNjb3BlKSArIFwiL2NhbWVsL2RpYWdyYW0vXCIgKyAkc2NvcGUucGFnZUlkXG4gICAgICAgfSwqL1xuICAgIF07XG5cbiAgICB2YXIgcm91dGVNb2RlbCA9IF9hcGFjaGVDYW1lbE1vZGVsLmRlZmluaXRpb25zLnJvdXRlO1xuICAgIHJvdXRlTW9kZWxbXCJfaWRcIl0gPSBcInJvdXRlXCI7XG5cbiAgICAkc2NvcGUuYWRkRGlhbG9nID0gbmV3IFVJLkRpYWxvZygpO1xuXG4gICAgLy8gVE9ETyBkb2Vzbid0IHNlZW0gdGhhdCBhbmd1bGFyLXVpIHVzZXMgdGhlc2U/XG4gICAgJHNjb3BlLmFkZERpYWxvZy5vcHRpb25zW1wiZGlhbG9nQ2xhc3NcIl0gPSBcIm1vZGFsLWxhcmdlXCI7XG4gICAgJHNjb3BlLmFkZERpYWxvZy5vcHRpb25zW1wiY3NzQ2xhc3NcIl0gPSBcIm1vZGFsLWxhcmdlXCI7XG5cbiAgICAkc2NvcGUucGFsZXR0ZUl0ZW1TZWFyY2ggPSBcIlwiO1xuICAgICRzY29wZS5wYWxldHRlVHJlZSA9IG5ldyBGb2xkZXIoXCJQYWxldHRlXCIpO1xuICAgICRzY29wZS5wYWxldHRlQWN0aXZhdGlvbnMgPSBbXCJSb3V0aW5nX2FnZ3JlZ2F0ZVwiXTtcblxuICAgIC8vIGxvYWQgJHNjb3BlLnBhbGV0dGVUcmVlXG4gICAgYW5ndWxhci5mb3JFYWNoKF9hcGFjaGVDYW1lbE1vZGVsLmRlZmluaXRpb25zLCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgaWYgKHZhbHVlLmdyb3VwKSB7XG4gICAgICAgIHZhciBncm91cCA9IChrZXkgPT09IFwicm91dGVcIikgPyAkc2NvcGUucGFsZXR0ZVRyZWUgOiAkc2NvcGUucGFsZXR0ZVRyZWUuZ2V0T3JFbHNlKHZhbHVlLmdyb3VwKTtcbiAgICAgICAgaWYgKCFncm91cC5rZXkpIHtcbiAgICAgICAgICBncm91cC5rZXkgPSB2YWx1ZS5ncm91cDtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZVtcIl9pZFwiXSA9IGtleTtcbiAgICAgICAgdmFyIHRpdGxlID0gdmFsdWVbXCJ0aXRsZVwiXSB8fCBrZXk7XG4gICAgICAgIHZhciBub2RlID0gbmV3IEZvbGRlcih0aXRsZSk7XG4gICAgICAgIG5vZGUua2V5ID0gZ3JvdXAua2V5ICsgXCJfXCIgKyBrZXk7XG4gICAgICAgIG5vZGVbXCJub2RlTW9kZWxcIl0gPSB2YWx1ZTtcbiAgICAgICAgdmFyIGltYWdlVXJsID0gQ2FtZWwuZ2V0Um91dGVOb2RlSWNvbih2YWx1ZSk7XG4gICAgICAgIG5vZGUuaWNvbiA9IGltYWdlVXJsO1xuICAgICAgICAvLyBjb21waWxlciB3YXMgY29tcGxhaW5pbmcgYWJvdXQgJ2xhYmVsJyBoYWQgbm8gaWRlYSB3aGVyZSBpdCdzIGNvbWluZyBmcm9tXG4gICAgICAgIC8vIHZhciB0b29sdGlwID0gdmFsdWVbXCJ0b29sdGlwXCJdIHx8IHZhbHVlW1wiZGVzY3JpcHRpb25cIl0gfHwgbGFiZWw7XG4gICAgICAgIHZhciB0b29sdGlwID0gdmFsdWVbXCJ0b29sdGlwXCJdIHx8IHZhbHVlW1wiZGVzY3JpcHRpb25cIl0gfHwgJyc7XG4gICAgICAgIG5vZGUudG9vbHRpcCA9IHRvb2x0aXA7XG5cbiAgICAgICAgZ3JvdXAuY2hpbGRyZW4ucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGxvYWQgJHNjb3BlLmNvbXBvbmVudFRyZWVcbiAgICAkc2NvcGUuY29tcG9uZW50VHJlZSA9IG5ldyBGb2xkZXIoXCJFbmRwb2ludHNcIik7XG5cbiAgICAkc2NvcGUuJHdhdGNoKFwiY29tcG9uZW50TmFtZXNcIiwgKCkgPT4ge1xuICAgICAgdmFyIGNvbXBvbmVudE5hbWVzID0gJHNjb3BlLmNvbXBvbmVudE5hbWVzO1xuICAgICAgaWYgKGNvbXBvbmVudE5hbWVzICYmIGNvbXBvbmVudE5hbWVzLmxlbmd0aCkge1xuICAgICAgICAkc2NvcGUuY29tcG9uZW50VHJlZSA9IG5ldyBGb2xkZXIoXCJFbmRwb2ludHNcIik7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuY29tcG9uZW50TmFtZXMsIChlbmRwb2ludE5hbWUpID0+IHtcbiAgICAgICAgICB2YXIgY2F0ZWdvcnkgPSBDYW1lbC5nZXRFbmRwb2ludENhdGVnb3J5KGVuZHBvaW50TmFtZSk7XG4gICAgICAgICAgdmFyIGdyb3VwTmFtZSA9IGNhdGVnb3J5LmxhYmVsIHx8IFwiQ29yZVwiO1xuICAgICAgICAgIHZhciBncm91cEtleSA9IGNhdGVnb3J5LmlkIHx8IGdyb3VwTmFtZTtcbiAgICAgICAgICB2YXIgZ3JvdXAgPSAkc2NvcGUuY29tcG9uZW50VHJlZS5nZXRPckVsc2UoZ3JvdXBOYW1lKTtcblxuICAgICAgICAgIHZhciB2YWx1ZSA9IENhbWVsLmdldEVuZHBvaW50Q29uZmlnKGVuZHBvaW50TmFtZSwgY2F0ZWdvcnkpO1xuICAgICAgICAgIHZhciBrZXkgPSBlbmRwb2ludE5hbWU7XG4gICAgICAgICAgdmFyIGxhYmVsID0gdmFsdWVbXCJsYWJlbFwiXSB8fCBlbmRwb2ludE5hbWU7XG4gICAgICAgICAgdmFyIG5vZGUgPSBuZXcgRm9sZGVyKGxhYmVsKTtcbiAgICAgICAgICBub2RlLmtleSA9IGdyb3VwS2V5ICsgXCJfXCIgKyBrZXk7XG4gICAgICAgICAgbm9kZS5rZXkgPSBrZXk7XG4gICAgICAgICAgbm9kZVtcIm5vZGVNb2RlbFwiXSA9IHZhbHVlO1xuICAgICAgICAgIHZhciB0b29sdGlwID0gdmFsdWVbXCJ0b29sdGlwXCJdIHx8IHZhbHVlW1wiZGVzY3JpcHRpb25cIl0gfHwgbGFiZWw7XG4gICAgICAgICAgdmFyIGltYWdlVXJsID0gQ29yZS51cmwodmFsdWVbXCJpY29uXCJdIHx8IENhbWVsLmVuZHBvaW50SWNvbik7XG4gICAgICAgICAgbm9kZS5pY29uID0gaW1hZ2VVcmw7XG4gICAgICAgICAgbm9kZS50b29sdGlwID0gdG9vbHRpcDtcblxuICAgICAgICAgIGdyb3VwLmNoaWxkcmVuLnB1c2gobm9kZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgICRzY29wZS5jb21wb25lbnRBY3RpdmF0aW9ucyA9IFtcImJlYW5cIl07XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdhZGREaWFsb2cuc2hvdycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICgkc2NvcGUuYWRkRGlhbG9nLnNob3cpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJCgnI3N1Ym1pdCcpLmZvY3VzKCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oXCJoYXd0aW8uZm9ybS5tb2RlbENoYW5nZVwiLCBvbk1vZGVsQ2hhbmdlRXZlbnQpO1xuXG4gICAgJHNjb3BlLm9uUm9vdFRyZWVOb2RlID0gKHJvb3RUcmVlTm9kZSkgPT4ge1xuICAgICAgJHNjb3BlLnJvb3RUcmVlTm9kZSA9IHJvb3RUcmVlTm9kZTtcbiAgICAgIC8vIHJlc3RvcmUgdGhlIHJlYWwgZGF0YSBhdCB0aGUgcm9vdCBmb3Igc2F2aW5nIHRoZSBkb2MgZXRjXG4gICAgICByb290VHJlZU5vZGUuZGF0YSA9ICRzY29wZS5jYW1lbENvbnRleHRUcmVlO1xuICAgIH07XG5cbiAgICAkc2NvcGUuYWRkTm9kZSA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUubm9kZVhtbE5vZGUpIHtcbiAgICAgICAgJHNjb3BlLmFkZERpYWxvZy5vcGVuKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhZGROZXdOb2RlKHJvdXRlTW9kZWwpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUub25QYWxldHRlU2VsZWN0ID0gKG5vZGUpID0+IHtcbiAgICAgICRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlID0gKG5vZGUgJiYgbm9kZVtcIm5vZGVNb2RlbFwiXSkgPyBub2RlIDogbnVsbDtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSkge1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcIlNlbGVjdGVkIFwiICsgJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUgKyBcIiA6IFwiICsgJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5vbkNvbXBvbmVudFNlbGVjdCA9IChub2RlKSA9PiB7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlID0gKG5vZGUgJiYgbm9kZVtcIm5vZGVNb2RlbFwiXSkgPyBub2RlIDogbnVsbDtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlKSB7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlID0gbnVsbDtcbiAgICAgICAgdmFyIG5vZGVOYW1lID0gbm9kZS5rZXk7XG4gICAgICAgIGxvZy5kZWJ1ZyhcImxvYWRpbmcgZW5kcG9pbnQgc2NoZW1hIGZvciBub2RlIFwiICsgbm9kZU5hbWUpO1xuICAgICAgICAkc2NvcGUubG9hZEVuZHBvaW50U2NoZW1hKG5vZGVOYW1lKTtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50TmFtZSA9IG5vZGVOYW1lO1xuICAgICAgfVxuICAgICAgbG9nLmRlYnVnKFwiU2VsZWN0ZWQgXCIgKyAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSArIFwiIDogXCIgKyAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNlbGVjdGVkTm9kZU1vZGVsID0gKCkgPT4ge1xuICAgICAgdmFyIG5vZGVNb2RlbCA9IG51bGw7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUpIHtcbiAgICAgICAgbm9kZU1vZGVsID0gJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGVbXCJub2RlTW9kZWxcIl07XG4gICAgICAgICRzY29wZS5lbmRwb2ludENvbmZpZyA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKCRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUpIHtcbiAgICAgICAgLy8gVE9ETyBsZXN0IGNyZWF0ZSBhbiBlbmRwb2ludCBub2RlTW9kZWwgYW5kIGFzc29jaWF0ZVxuICAgICAgICAvLyB0aGUgZHVtbXkgVVJMIGFuZCBwcm9wZXJ0aWVzIGV0Yy4uLlxuICAgICAgICB2YXIgZW5kcG9pbnRDb25maWcgPSAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlW1wibm9kZU1vZGVsXCJdO1xuICAgICAgICB2YXIgZW5kcG9pbnRTY2hlbWEgPSAkc2NvcGUuZW5kcG9pbnRTY2hlbWE7XG4gICAgICAgIG5vZGVNb2RlbCA9ICRzY29wZS5zY2hlbWEuZGVmaW5pdGlvbnMuZW5kcG9pbnQ7XG4gICAgICAgICRzY29wZS5lbmRwb2ludENvbmZpZyA9IHtcbiAgICAgICAgICBrZXk6ICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUua2V5LFxuICAgICAgICAgIHNjaGVtYTogZW5kcG9pbnRTY2hlbWEsXG4gICAgICAgICAgZGV0YWlsczogZW5kcG9pbnRDb25maWdcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlTW9kZWw7XG4gICAgfTtcblxuICAgICRzY29wZS5hZGRBbmRDbG9zZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBub2RlTW9kZWwgPSAkc2NvcGUuc2VsZWN0ZWROb2RlTW9kZWwoKTtcbiAgICAgIGlmIChub2RlTW9kZWwpIHtcbiAgICAgICAgYWRkTmV3Tm9kZShub2RlTW9kZWwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiV0FSTklORzogbm8gbm9kZU1vZGVsIVwiKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5hZGREaWFsb2cuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJlbW92ZU5vZGUgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkRm9sZGVyICYmICRzY29wZS50cmVlTm9kZSkge1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIuZGV0YWNoKCk7XG4gICAgICAgICRzY29wZS50cmVlTm9kZS5yZW1vdmUoKTtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRm9sZGVyID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLnRyZWVOb2RlID0gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNhbkRlbGV0ZSA9ICgpID0+IHtcbiAgICAgIHJldHVybiAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgPyB0cnVlIDogZmFsc2U7XG4gICAgfTtcblxuICAgICRzY29wZS5pc0FjdGl2ZSA9IChuYXYpID0+IHtcbiAgICAgIGlmIChhbmd1bGFyLmlzU3RyaW5nKG5hdikpXG4gICAgICAgIHJldHVybiB3b3Jrc3BhY2UuaXNMaW5rQWN0aXZlKG5hdik7XG4gICAgICB2YXIgZm4gPSBuYXYuaXNBY3RpdmU7XG4gICAgICBpZiAoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZuKHdvcmtzcGFjZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gd29ya3NwYWNlLmlzTGlua0FjdGl2ZShuYXYuaHJlZigpKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmUgPSAoKSA9PiB7XG4gICAgICAvLyBnZW5lcmF0ZSB0aGUgbmV3IFhNTFxuICAgICAgaWYgKCRzY29wZS5tb2RpZmllZCAmJiAkc2NvcGUucm9vdFRyZWVOb2RlKSB7XG4gICAgICAgIHZhciB4bWxOb2RlID0gQ2FtZWwuZ2VuZXJhdGVYbWxGcm9tRm9sZGVyKCRzY29wZS5yb290VHJlZU5vZGUpO1xuICAgICAgICBpZiAoeG1sTm9kZSkge1xuICAgICAgICAgIHZhciB0ZXh0ID0gQ29yZS54bWxOb2RlVG9TdHJpbmcoeG1sTm9kZSk7XG4gICAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgIC8vIGxldHMgc2F2ZSB0aGUgZmlsZS4uLlxuICAgICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSAkc2NvcGUuY29tbWl0TWVzc2FnZSB8fCBcIlVwZGF0ZWQgcGFnZSBcIiArICRzY29wZS5wYWdlSWQ7XG4gICAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5wdXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsIHRleHQsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG4gICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIlNhdmVkIFwiICsgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgICAgICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuICAgICAgICAgICAgICBnb1RvVmlldygpO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICBsb2cuZGVidWcoXCJjYW5jZWxsaW5nLi4uXCIpO1xuICAgICAgLy8gVE9ETyBzaG93IGRpYWxvZyBpZiBmb2xrcyBhcmUgYWJvdXQgdG8gbG9zZSBjaGFuZ2VzLi4uXG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goJ3dvcmtzcGFjZS50cmVlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEkc2NvcGUuZ2l0KSB7XG4gICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAgIC8vbG9nLmRlYnVnKFwiUmVsb2FkaW5nIHRoZSB2aWV3IGFzIHdlIG5vdyBzZWVtIHRvIGhhdmUgYSBnaXQgbWJlYW4hXCIpO1xuICAgICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGdldEZvbGRlclhtbE5vZGUodHJlZU5vZGUpIHtcbiAgICAgIHZhciByb3V0ZVhtbE5vZGUgPSBDYW1lbC5jcmVhdGVGb2xkZXJYbWxUcmVlKHRyZWVOb2RlLCBudWxsKTtcbiAgICAgIGlmIChyb3V0ZVhtbE5vZGUpIHtcbiAgICAgICAgJHNjb3BlLm5vZGVYbWxOb2RlID0gcm91dGVYbWxOb2RlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJvdXRlWG1sTm9kZTtcbiAgICB9XG5cbiAgICAkc2NvcGUub25Ob2RlU2VsZWN0ID0gKGZvbGRlciwgdHJlZU5vZGUpID0+IHtcbiAgICAgICRzY29wZS5zZWxlY3RlZEZvbGRlciA9IGZvbGRlcjtcbiAgICAgICRzY29wZS50cmVlTm9kZSA9IHRyZWVOb2RlO1xuICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IG51bGw7XG4gICAgICAkc2NvcGUuZGlhZ3JhbVRlbXBsYXRlID0gbnVsbDtcbiAgICAgICRzY29wZS5ub2RlWG1sTm9kZSA9IG51bGw7XG4gICAgICBpZiAoZm9sZGVyKSB7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YSA9IENhbWVsLmdldFJvdXRlRm9sZGVySlNPTihmb2xkZXIpO1xuICAgICAgICAkc2NvcGUubm9kZURhdGFDaGFuZ2VkRmllbGRzID0ge307XG4gICAgICB9XG4gICAgICB2YXIgbm9kZU5hbWUgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChmb2xkZXIpO1xuICAgICAgLy8gbGV0cyBsYXppbHkgY3JlYXRlIHRoZSBYTUwgdHJlZSBzbyBpdCBjYW4gYmUgdXNlZCBieSB0aGUgZGlhZ3JhbVxuICAgICAgdmFyIHJvdXRlWG1sTm9kZSA9IGdldEZvbGRlclhtbE5vZGUodHJlZU5vZGUpO1xuICAgICAgaWYgKG5vZGVOYW1lKSB7XG4gICAgICAgIC8vdmFyIG5vZGVOYW1lID0gcm91dGVYbWxOb2RlLmxvY2FsTmFtZTtcbiAgICAgICAgJHNjb3BlLm5vZGVNb2RlbCA9IENhbWVsLmdldENhbWVsU2NoZW1hKG5vZGVOYW1lKTtcbiAgICAgICAgaWYgKCRzY29wZS5ub2RlTW9kZWwpIHtcbiAgICAgICAgICAkc2NvcGUucHJvcGVydGllc1RlbXBsYXRlID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9jYW1lbFByb3BlcnRpZXNFZGl0Lmh0bWxcIjtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuZGlhZ3JhbVRlbXBsYXRlID0gXCJhcHAvY2FtZWwvaHRtbC9yb3V0ZXMuaHRtbFwiO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUub25Ob2RlRHJhZ0VudGVyID0gKG5vZGUsIHNvdXJjZU5vZGUpID0+IHtcbiAgICAgIHZhciBub2RlRm9sZGVyID0gbm9kZS5kYXRhO1xuICAgICAgdmFyIHNvdXJjZUZvbGRlciA9IHNvdXJjZU5vZGUuZGF0YTtcbiAgICAgIGlmIChub2RlRm9sZGVyICYmIHNvdXJjZUZvbGRlcikge1xuICAgICAgICB2YXIgbm9kZUlkID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQobm9kZUZvbGRlcik7XG4gICAgICAgIHZhciBzb3VyY2VJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKHNvdXJjZUZvbGRlcik7XG4gICAgICAgIGlmIChub2RlSWQgJiYgc291cmNlSWQpIHtcbiAgICAgICAgICAvLyB3ZSBjYW4gb25seSBkcmFnIHJvdXRlcyBvbnRvIG90aGVyIHJvdXRlcyAoYmVmb3JlIC8gYWZ0ZXIgLyBvdmVyKVxuICAgICAgICAgIGlmIChzb3VyY2VJZCA9PT0gXCJyb3V0ZVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZUlkID09PSBcInJvdXRlXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgICRzY29wZS5vbk5vZGVEcm9wID0gKG5vZGUsIHNvdXJjZU5vZGUsIGhpdE1vZGUsIHVpLCBkcmFnZ2FibGUpID0+IHtcbiAgICAgIHZhciBub2RlRm9sZGVyID0gbm9kZS5kYXRhO1xuICAgICAgdmFyIHNvdXJjZUZvbGRlciA9IHNvdXJjZU5vZGUuZGF0YTtcbiAgICAgIGlmIChub2RlRm9sZGVyICYmIHNvdXJjZUZvbGRlcikge1xuICAgICAgICAvLyB3ZSBjYW5ub3QgZHJvcCBhIHJvdXRlIGludG8gYSByb3V0ZSBvciBhIG5vbi1yb3V0ZSB0byBhIHRvcCBsZXZlbCFcbiAgICAgICAgdmFyIG5vZGVJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKG5vZGVGb2xkZXIpO1xuICAgICAgICB2YXIgc291cmNlSWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChzb3VyY2VGb2xkZXIpO1xuXG4gICAgICAgIGlmIChub2RlSWQgPT09IFwicm91dGVcIikge1xuICAgICAgICAgIC8vIGhpdE1vZGUgbXVzdCBiZSBcIm92ZXJcIiBpZiB3ZSBhcmUgbm90IGFub3RoZXIgcm91dGVcbiAgICAgICAgICBpZiAoc291cmNlSWQgPT09IFwicm91dGVcIikge1xuICAgICAgICAgICAgaWYgKGhpdE1vZGUgPT09IFwib3ZlclwiKSB7XG4gICAgICAgICAgICAgIGhpdE1vZGUgPSBcImFmdGVyXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGRpc2FibGUgYmVmb3JlIC8gYWZ0ZXJcbiAgICAgICAgICAgIGhpdE1vZGUgPSBcIm92ZXJcIjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKENhbWVsLmFjY2VwdE91dHB1dChub2RlSWQpKSB7XG4gICAgICAgICAgICBoaXRNb2RlID0gXCJvdmVyXCI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChoaXRNb2RlICE9PSBcImJlZm9yZVwiKSB7XG4gICAgICAgICAgICAgIGhpdE1vZGUgPSBcImFmdGVyXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxvZy5kZWJ1ZyhcIm5vZGVEcm9wIG5vZGVJZDogXCIgKyBub2RlSWQgKyBcIiBzb3VyY2VJZDogXCIgKyBzb3VyY2VJZCArIFwiIGhpdE1vZGU6IFwiICsgaGl0TW9kZSk7XG5cbiAgICAgICAgc291cmNlTm9kZS5tb3ZlKG5vZGUsIGhpdE1vZGUpO1xuICAgICAgfVxuICAgIH07XG5cblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIGFkZE5ld05vZGUobm9kZU1vZGVsKSB7XG4gICAgICB2YXIgZG9jID0gJHNjb3BlLmRvYyB8fCBkb2N1bWVudDtcbiAgICAgIHZhciBwYXJlbnRGb2xkZXIgPSAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgfHwgJHNjb3BlLmNhbWVsQ29udGV4dFRyZWU7XG4gICAgICB2YXIga2V5ID0gbm9kZU1vZGVsW1wiX2lkXCJdO1xuICAgICAgdmFyIGJlZm9yZU5vZGUgPSBudWxsO1xuICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiV0FSTklORzogbm8gaWQgZm9yIG1vZGVsIFwiICsgSlNPTi5zdHJpbmdpZnkobm9kZU1vZGVsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdHJlZU5vZGUgPSAkc2NvcGUudHJlZU5vZGU7XG4gICAgICAgIGlmIChrZXkgPT09IFwicm91dGVcIikge1xuICAgICAgICAgIC8vIGxldHMgYWRkIHRvIHRoZSByb290IG9mIHRoZSB0cmVlXG4gICAgICAgICAgdHJlZU5vZGUgPSAkc2NvcGUucm9vdFRyZWVOb2RlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghdHJlZU5vZGUpIHtcbiAgICAgICAgICAgIC8vIGxldHMgc2VsZWN0IHRoZSBsYXN0IHJvdXRlIC0gYW5kIGNyZWF0ZSBhIG5ldyByb3V0ZSBpZiBuZWVkIGJlXG4gICAgICAgICAgICB2YXIgcm9vdCA9ICRzY29wZS5yb290VHJlZU5vZGU7XG4gICAgICAgICAgICB2YXIgY2hpbGRyZW4gPSByb290LmdldENoaWxkcmVuKCk7XG4gICAgICAgICAgICBpZiAoIWNoaWxkcmVuIHx8ICFjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgYWRkTmV3Tm9kZShDYW1lbC5nZXRDYW1lbFNjaGVtYShcInJvdXRlXCIpKTtcbiAgICAgICAgICAgICAgY2hpbGRyZW4gPSByb290LmdldENoaWxkcmVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHRyZWVOb2RlID0gY2hpbGRyZW5bY2hpbGRyZW4ubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2cuZGVidWcoXCJDb3VsZCBub3QgYWRkIGEgbmV3IHJvdXRlIHRvIHRoZSBlbXB0eSB0cmVlIVwiKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuXG4gICAgICAgICAgLy8gaWYgdGhlIHBhcmVudCBmb2xkZXIgbGlrZXMgdG8gYWN0IGFzIGEgcGlwZWxpbmUsIHRoZW4gYWRkXG4gICAgICAgICAgLy8gYWZ0ZXIgdGhlIHBhcmVudCwgcmF0aGVyIHRoYW4gYXMgYSBjaGlsZFxuICAgICAgICAgIHZhciBwYXJlbnRJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKHRyZWVOb2RlLmRhdGEpO1xuICAgICAgICAgIGlmICghQ2FtZWwuYWNjZXB0T3V0cHV0KHBhcmVudElkKSkge1xuICAgICAgICAgICAgLy8gbGV0cyBhZGQgdGhlIG5ldyBub2RlIHRvIHRoZSBlbmQgb2YgdGhlIHBhcmVudFxuICAgICAgICAgICAgYmVmb3JlTm9kZSA9IHRyZWVOb2RlLmdldE5leHRTaWJsaW5nKCk7XG4gICAgICAgICAgICB0cmVlTm9kZSA9IHRyZWVOb2RlLmdldFBhcmVudCgpIHx8IHRyZWVOb2RlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodHJlZU5vZGUpIHtcbiAgICAgICAgICB2YXIgbm9kZSA9IGRvYy5jcmVhdGVFbGVtZW50KGtleSk7XG4gICAgICAgICAgcGFyZW50Rm9sZGVyID0gdHJlZU5vZGUuZGF0YTtcbiAgICAgICAgICB2YXIgYWRkZWROb2RlID0gQ2FtZWwuYWRkUm91dGVDaGlsZChwYXJlbnRGb2xkZXIsIG5vZGUpO1xuICAgICAgICAgIGlmIChhZGRlZE5vZGUpIHtcbiAgICAgICAgICAgIHZhciBhZGRlZCA9IHRyZWVOb2RlLmFkZENoaWxkKGFkZGVkTm9kZSwgYmVmb3JlTm9kZSk7XG4gICAgICAgICAgICBpZiAoYWRkZWQpIHtcbiAgICAgICAgICAgICAgZ2V0Rm9sZGVyWG1sTm9kZShhZGRlZCk7XG4gICAgICAgICAgICAgIGFkZGVkLmV4cGFuZCh0cnVlKTtcbiAgICAgICAgICAgICAgYWRkZWQuc2VsZWN0KHRydWUpO1xuICAgICAgICAgICAgICBhZGRlZC5hY3RpdmF0ZSh0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbk1vZGVsQ2hhbmdlRXZlbnQoZXZlbnQsIG5hbWUpIHtcbiAgICAgIC8vIGxldHMgZmlsdGVyIG91dCBldmVudHMgZHVlIHRvIHRoZSBub2RlIGNoYW5naW5nIGNhdXNpbmcgdGhlXG4gICAgICAvLyBmb3JtcyB0byBiZSByZWNyZWF0ZWRcbiAgICAgIGlmICgkc2NvcGUubm9kZURhdGEpIHtcbiAgICAgICAgdmFyIGZpZWxkTWFwID0gJHNjb3BlLm5vZGVEYXRhQ2hhbmdlZEZpZWxkcztcbiAgICAgICAgaWYgKGZpZWxkTWFwKSB7XG4gICAgICAgICAgaWYgKGZpZWxkTWFwW25hbWVdKSB7XG4gICAgICAgICAgICBvbk5vZGVEYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB0aGUgc2VsZWN0aW9uIGhhcyBqdXN0IGNoYW5nZWQgc28gd2UgZ2V0IHRoZSBpbml0aWFsIGV2ZW50XG4gICAgICAgICAgICAvLyB3ZSBjYW4gaWdub3JlIHRoaXMgOilcbiAgICAgICAgICAgIGZpZWxkTWFwW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbk5vZGVEYXRhQ2hhbmdlZCgpIHtcbiAgICAgICRzY29wZS5tb2RpZmllZCA9IHRydWU7XG4gICAgICB2YXIgc2VsZWN0ZWRGb2xkZXIgPSAkc2NvcGUuc2VsZWN0ZWRGb2xkZXI7XG4gICAgICBpZiAoJHNjb3BlLnRyZWVOb2RlICYmIHNlbGVjdGVkRm9sZGVyKSB7XG4gICAgICAgIHZhciByb3V0ZVhtbE5vZGUgPSBnZXRGb2xkZXJYbWxOb2RlKCRzY29wZS50cmVlTm9kZSk7XG4gICAgICAgIGlmIChyb3V0ZVhtbE5vZGUpIHtcbiAgICAgICAgICB2YXIgbm9kZU5hbWUgPSByb3V0ZVhtbE5vZGUubG9jYWxOYW1lO1xuICAgICAgICAgIHZhciBub2RlU2V0dGluZ3MgPSBDYW1lbC5nZXRDYW1lbFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgICAgaWYgKG5vZGVTZXR0aW5ncykge1xuICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSB0aXRsZSBhbmQgdG9vbHRpcCBldGNcbiAgICAgICAgICAgIENhbWVsLnVwZGF0ZVJvdXRlTm9kZUxhYmVsQW5kVG9vbHRpcChzZWxlY3RlZEZvbGRlciwgcm91dGVYbWxOb2RlLCBub2RlU2V0dGluZ3MpO1xuICAgICAgICAgICAgJHNjb3BlLnRyZWVOb2RlLnJlbmRlcihmYWxzZSwgZmFsc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIG5vdCBzdXJlIHdlIG5lZWQgdGhpcyB0byBiZSBob25lc3RcbiAgICAgICAgc2VsZWN0ZWRGb2xkZXJbXCJjYW1lbE5vZGVEYXRhXCJdID0gJHNjb3BlLm5vZGVEYXRhO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUmVzdWx0cyhyZXNwb25zZSkge1xuICAgICAgdmFyIHRleHQgPSByZXNwb25zZS50ZXh0O1xuICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgLy8gbGV0cyByZW1vdmUgYW55IGRvZGd5IGNoYXJhY3RlcnMgc28gd2UgY2FuIHVzZSBpdCBhcyBhIERPTSBpZFxuICAgICAgICB2YXIgdHJlZSA9IENhbWVsLmxvYWRDYW1lbFRyZWUodGV4dCwgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgIGlmICh0cmVlKSB7XG4gICAgICAgICAgJHNjb3BlLmNhbWVsQ29udGV4dFRyZWUgPSB0cmVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJObyBYTUwgZm91bmQgZm9yIHBhZ2UgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5TGF0ZXIoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgJHNjb3BlLmxvYWRFbmRwb2ludE5hbWVzKCk7XG4gICAgICAkc2NvcGUucGFnZUlkID0gV2lraS5wYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgICAgbG9nLmRlYnVnKFwiSGFzIHBhZ2UgaWQ6IFwiICsgJHNjb3BlLnBhZ2VJZCArIFwiIHdpdGggJHJvdXRlUGFyYW1zIFwiICsgSlNPTi5zdHJpbmdpZnkoJHJvdXRlUGFyYW1zKSk7XG5cbiAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgJHNjb3BlLm9iamVjdElkLCBvblJlc3VsdHMpO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gZ29Ub1ZpZXcoKSB7XG4gICAgICAvLyBUT0RPIGxldHMgbmF2aWdhdGUgdG8gdGhlIHZpZXcgaWYgd2UgaGF2ZSBhIHNlcGFyYXRlIHZpZXcgb25lIGRheSA6KVxuICAgICAgLypcbiAgICAgICBpZiAoJHNjb3BlLmJyZWFkY3J1bWJzICYmICRzY29wZS5icmVhZGNydW1icy5sZW5ndGggPiAxKSB7XG4gICAgICAgdmFyIHZpZXdMaW5rID0gJHNjb3BlLmJyZWFkY3J1bWJzWyRzY29wZS5icmVhZGNydW1icy5sZW5ndGggLSAyXTtcbiAgICAgICBsb2cuZGVidWcoXCJnb1RvVmlldyBoYXMgZm91bmQgdmlldyBcIiArIHZpZXdMaW5rKTtcbiAgICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcodmlld0xpbmssIFwiI1wiKTtcbiAgICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgIGxvZy5kZWJ1ZyhcImdvVG9WaWV3IGhhcyBubyBicmVhZGNydW1icyFcIik7XG4gICAgICAgfVxuICAgICAgICovXG4gICAgfVxuXG4gICAgJHNjb3BlLmRvU3dpdGNoVG9DYW52YXNWaWV3ID0gKCkgPT4ge1xuICAgICAgdmFyIGxpbmsgPSAkbG9jYXRpb24udXJsKCkucmVwbGFjZSgvXFwvcHJvcGVydGllc1xcLy8sICcvY2FudmFzLycpO1xuICAgICAgbG9nLmRlYnVnKFwiTGluazogXCIsIGxpbmspO1xuICAgICAgJGxvY2F0aW9uLnVybChsaW5rKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNvbmZpcm1Td2l0Y2hUb0NhbnZhc1ZpZXcgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkKSB7XG4gICAgICAgICRzY29wZS5zd2l0Y2hUb0NhbnZhc1ZpZXcub3BlbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmRvU3dpdGNoVG9DYW52YXNWaWV3KCk7XG4gICAgICB9XG4gICAgfTtcblxuICB9XSk7XG59XG4iLCIvKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi93aWtpUGx1Z2luLnRzXCIvPlxubW9kdWxlIFdpa2kge1xuICBleHBvcnQgdmFyIENhbWVsQ2FudmFzQ29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuQ2FtZWxDYW52YXNDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRlbGVtZW50XCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkaW50ZXJwb2xhdGVcIiwgXCIkbG9jYXRpb25cIiwgKCRzY29wZSwgJGVsZW1lbnQsICRyb3V0ZVBhcmFtcywgJHRlbXBsYXRlQ2FjaGUsICRpbnRlcnBvbGF0ZSwgJGxvY2F0aW9uKSA9PiB7XG4gICAgdmFyIGpzUGx1bWJJbnN0YW5jZSA9IGpzUGx1bWIuZ2V0SW5zdGFuY2UoKTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5hZGREaWFsb2cgPSBuZXcgVUkuRGlhbG9nKCk7XG4gICAgJHNjb3BlLnByb3BlcnRpZXNEaWFsb2cgPSBuZXcgVUkuRGlhbG9nKCk7XG4gICAgJHNjb3BlLnN3aXRjaFRvVHJlZVZpZXcgPSBuZXcgVUkuRGlhbG9nKCk7XG4gICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG4gICAgJHNjb3BlLmNhbWVsSWdub3JlSWRGb3JMYWJlbCA9IENhbWVsLmlnbm9yZUlkRm9yTGFiZWwobG9jYWxTdG9yYWdlKTtcbiAgICAkc2NvcGUuY2FtZWxNYXhpbXVtTGFiZWxXaWR0aCA9IENhbWVsLm1heGltdW1MYWJlbFdpZHRoKGxvY2FsU3RvcmFnZSk7XG4gICAgJHNjb3BlLmNhbWVsTWF4aW11bVRyYWNlT3JEZWJ1Z0JvZHlMZW5ndGggPSBDYW1lbC5tYXhpbXVtVHJhY2VPckRlYnVnQm9keUxlbmd0aChsb2NhbFN0b3JhZ2UpO1xuXG4gICAgJHNjb3BlLmZvcm1zID0ge307XG5cbiAgICAkc2NvcGUubm9kZVRlbXBsYXRlID0gJGludGVycG9sYXRlKCR0ZW1wbGF0ZUNhY2hlLmdldChcIm5vZGVUZW1wbGF0ZVwiKSk7XG5cbiAgICAkc2NvcGUuJHdhdGNoKFwiY2FtZWxDb250ZXh0VHJlZVwiLCAoKSA9PiB7XG4gICAgICB2YXIgdHJlZSA9ICRzY29wZS5jYW1lbENvbnRleHRUcmVlO1xuICAgICAgJHNjb3BlLnJvb3RGb2xkZXIgPSB0cmVlO1xuICAgICAgLy8gbm93IHdlJ3ZlIGdvdCBjaWQgdmFsdWVzIGluIHRoZSB0cmVlIGFuZCBET00sIGxldHMgY3JlYXRlIGFuIGluZGV4IHNvIHdlIGNhbiBiaW5kIHRoZSBET00gdG8gdGhlIHRyZWUgbW9kZWxcbiAgICAgICRzY29wZS5mb2xkZXJzID0gQ2FtZWwuYWRkRm9sZGVyc1RvSW5kZXgoJHNjb3BlLnJvb3RGb2xkZXIpO1xuXG4gICAgICB2YXIgZG9jID0gQ29yZS5wYXRoR2V0KHRyZWUsIFtcInhtbERvY3VtZW50XCJdKTtcbiAgICAgIGlmIChkb2MpIHtcbiAgICAgICAgJHNjb3BlLmRvYyA9IGRvYztcbiAgICAgICAgcmVsb2FkUm91dGVJZHMoKTtcbiAgICAgICAgb25Sb3V0ZVNlbGVjdGlvbkNoYW5nZWQoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS5hZGRBbmRDbG9zZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBub2RlTW9kZWwgPSAkc2NvcGUuc2VsZWN0ZWROb2RlTW9kZWwoKTtcbiAgICAgIGlmIChub2RlTW9kZWwpIHtcbiAgICAgICAgYWRkTmV3Tm9kZShub2RlTW9kZWwpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLmFkZERpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmVtb3ZlTm9kZSA9ICgpID0+IHtcbiAgICAgIHZhciBmb2xkZXIgPSBnZXRTZWxlY3RlZE9yUm91dGVGb2xkZXIoKTtcbiAgICAgIGlmIChmb2xkZXIpIHtcbiAgICAgICAgdmFyIG5vZGVOYW1lID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQoZm9sZGVyKTtcbiAgICAgICAgZm9sZGVyLmRldGFjaCgpO1xuICAgICAgICBpZiAoXCJyb3V0ZVwiID09PSBub2RlTmFtZSkge1xuICAgICAgICAgIC8vIGxldHMgYWxzbyBjbGVhciB0aGUgc2VsZWN0ZWQgcm91dGUgbm9kZVxuICAgICAgICAgICRzY29wZS5zZWxlY3RlZFJvdXRlSWQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHVwZGF0ZVNlbGVjdGlvbihudWxsKTtcbiAgICAgICAgdHJlZU1vZGlmaWVkKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5kb0xheW91dCA9ICgpID0+IHtcbiAgICAgICRzY29wZS5kcmF3blJvdXRlSWQgPSBudWxsO1xuICAgICAgb25Sb3V0ZVNlbGVjdGlvbkNoYW5nZWQoKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaXNSb3V0ZU9yTm9kZSgpIHtcbiAgICAgIHJldHVybiAhJHNjb3BlLnNlbGVjdGVkRm9sZGVyXG4gICAgfVxuXG4gICAgJHNjb3BlLmdldERlbGV0ZVRpdGxlID0gKCkgPT4ge1xuICAgICAgaWYgKGlzUm91dGVPck5vZGUoKSkge1xuICAgICAgICByZXR1cm4gXCJEZWxldGUgdGhpcyByb3V0ZVwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFwiRGVsZXRlIHRoaXMgbm9kZVwiO1xuICAgIH1cblxuICAgICRzY29wZS5nZXREZWxldGVUYXJnZXQgPSAoKSA9PiB7XG4gICAgICBpZiAoaXNSb3V0ZU9yTm9kZSgpKSB7XG4gICAgICAgIHJldHVybiBcIlJvdXRlXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gXCJOb2RlXCI7XG4gICAgfVxuXG4gICAgJHNjb3BlLmlzRm9ybURpcnR5ID0gKCkgPT4ge1xuICAgICAgbG9nLmRlYnVnKFwiZW5kcG9pbnRGb3JtOiBcIiwgJHNjb3BlLmVuZHBvaW50Rm9ybSk7XG4gICAgICBpZiAoJHNjb3BlLmVuZHBvaW50Rm9ybS4kZGlydHkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoISRzY29wZS5mb3Jtc1snZm9ybUVkaXRvciddKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUuZm9ybXNbJ2Zvcm1FZGl0b3InXVsnJGRpcnR5J107XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8qIFRPRE9cbiAgICAgJHNjb3BlLnJlc2V0Rm9ybXMgPSAoKSA9PiB7XG5cbiAgICAgfVxuICAgICAqL1xuXG4gICAgLypcbiAgICAgKiBDb252ZXJ0cyBhIHBhdGggYW5kIGEgc2V0IG9mIGVuZHBvaW50IHBhcmFtZXRlcnMgaW50byBhIFVSSSB3ZSBjYW4gdGhlbiB1c2UgdG8gc3RvcmUgaW4gdGhlIFhNTFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUVuZHBvaW50VVJJKGVuZHBvaW50U2NoZW1lOnN0cmluZywgc2xhc2hlc1RleHQ6c3RyaW5nLCBlbmRwb2ludFBhdGg6c3RyaW5nLCBlbmRwb2ludFBhcmFtZXRlcnM6YW55KSB7XG4gICAgICBsb2cuZGVidWcoXCJzY2hlbWUgXCIgKyBlbmRwb2ludFNjaGVtZSArIFwiIHBhdGggXCIgKyBlbmRwb2ludFBhdGggKyBcIiBwYXJhbWV0ZXJzIFwiICsgZW5kcG9pbnRQYXJhbWV0ZXJzKTtcbiAgICAgIC8vIG5vdyBsZXRzIGNyZWF0ZSB0aGUgbmV3IFVSSSBmcm9tIHRoZSBwYXRoIGFuZCBwYXJhbWV0ZXJzXG4gICAgICAvLyBUT0RPIHNob3VsZCB3ZSB1c2UgSk1YIGZvciB0aGlzP1xuICAgICAgdmFyIHVyaSA9ICgoZW5kcG9pbnRTY2hlbWUpID8gZW5kcG9pbnRTY2hlbWUgKyBcIjpcIiArIHNsYXNoZXNUZXh0IDogXCJcIikgKyAoZW5kcG9pbnRQYXRoID8gZW5kcG9pbnRQYXRoIDogXCJcIik7XG4gICAgICB2YXIgcGFyYW1UZXh0ID0gQ29yZS5oYXNoVG9TdHJpbmcoZW5kcG9pbnRQYXJhbWV0ZXJzKTtcbiAgICAgIGlmIChwYXJhbVRleHQpIHtcbiAgICAgICAgdXJpICs9IFwiP1wiICsgcGFyYW1UZXh0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVyaTtcbiAgICB9XG5cbiAgICAkc2NvcGUudXBkYXRlUHJvcGVydGllcyA9ICgpID0+IHtcbiAgICAgIGxvZy5pbmZvKFwib2xkIFVSSSBpcyBcIiArICRzY29wZS5ub2RlRGF0YS51cmkpO1xuICAgICAgdmFyIHVyaSA9IGNyZWF0ZUVuZHBvaW50VVJJKCRzY29wZS5lbmRwb2ludFNjaGVtZSwgKCRzY29wZS5lbmRwb2ludFBhdGhIYXNTbGFzaGVzID8gXCIvL1wiIDogXCJcIiksICRzY29wZS5lbmRwb2ludFBhdGgsICRzY29wZS5lbmRwb2ludFBhcmFtZXRlcnMpO1xuICAgICAgbG9nLmluZm8oXCJuZXcgVVJJIGlzIFwiICsgdXJpKTtcbiAgICAgIGlmICh1cmkpIHtcbiAgICAgICAgJHNjb3BlLm5vZGVEYXRhLnVyaSA9IHVyaTtcbiAgICAgIH1cblxuICAgICAgdmFyIGtleSA9IG51bGw7XG4gICAgICB2YXIgc2VsZWN0ZWRGb2xkZXIgPSAkc2NvcGUuc2VsZWN0ZWRGb2xkZXI7XG4gICAgICBpZiAoc2VsZWN0ZWRGb2xkZXIpIHtcbiAgICAgICAga2V5ID0gc2VsZWN0ZWRGb2xkZXIua2V5O1xuXG4gICAgICAgIC8vIGxldHMgZGVsZXRlIHRoZSBjdXJyZW50IHNlbGVjdGVkIG5vZGUncyBkaXYgc28gaXRzIHVwZGF0ZWQgd2l0aCB0aGUgbmV3IHRlbXBsYXRlIHZhbHVlc1xuICAgICAgICB2YXIgZWxlbWVudHMgPSAkZWxlbWVudC5maW5kKFwiLmNhbnZhc1wiKS5maW5kKFwiW2lkPSdcIiArIGtleSArIFwiJ11cIikuZmlyc3QoKS5yZW1vdmUoKTtcbiAgICAgIH1cblxuICAgICAgdHJlZU1vZGlmaWVkKCk7XG5cbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgdXBkYXRlU2VsZWN0aW9uKGtleSlcbiAgICAgIH1cblxuICAgICAgaWYgKCRzY29wZS5pc0Zvcm1EaXJ0eSgpKSB7XG4gICAgICAgICRzY29wZS5lbmRwb2ludEZvcm0uJHNldFByaXN0aW5lKCk7XG4gICAgICAgIGlmICgkc2NvcGUuZm9ybXNbJ2Zvcm1FZGl0b3InXSkge1xuICAgICAgICAgICRzY29wZS5mb3Jtc1snZm9ybUVkaXRvciddLiRzZXRQcmlzdGluZSgpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5zYXZlID0gKCkgPT4ge1xuICAgICAgLy8gZ2VuZXJhdGUgdGhlIG5ldyBYTUxcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQgJiYgJHNjb3BlLnJvb3RGb2xkZXIpIHtcbiAgICAgICAgdmFyIHhtbE5vZGUgPSBDYW1lbC5nZW5lcmF0ZVhtbEZyb21Gb2xkZXIoJHNjb3BlLnJvb3RGb2xkZXIpO1xuICAgICAgICBpZiAoeG1sTm9kZSkge1xuICAgICAgICAgIHZhciB0ZXh0ID0gQ29yZS54bWxOb2RlVG9TdHJpbmcoeG1sTm9kZSk7XG4gICAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgIHZhciBkZWNvZGVkID0gZGVjb2RlVVJJQ29tcG9uZW50KHRleHQpO1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiU2F2aW5nIHhtbCBkZWNvZGVkOiBcIiArIGRlY29kZWQpO1xuXG4gICAgICAgICAgICAvLyBsZXRzIHNhdmUgdGhlIGZpbGUuLi5cbiAgICAgICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gJHNjb3BlLmNvbW1pdE1lc3NhZ2UgfHwgXCJVcGRhdGVkIHBhZ2UgXCIgKyAkc2NvcGUucGFnZUlkO1xuICAgICAgICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCBkZWNvZGVkLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShzdGF0dXMpO1xuICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJTYXZlZCBcIiArICRzY29wZS5wYWdlSWQpO1xuICAgICAgICAgICAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgZ29Ub1ZpZXcoKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgbG9nLmRlYnVnKFwiY2FuY2VsbGluZy4uLlwiKTtcbiAgICAgIC8vIFRPRE8gc2hvdyBkaWFsb2cgaWYgZm9sa3MgYXJlIGFib3V0IHRvIGxvc2UgY2hhbmdlcy4uLlxuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKFwic2VsZWN0ZWRSb3V0ZUlkXCIsIG9uUm91dGVTZWxlY3Rpb25DaGFuZ2VkKTtcblxuICAgIGZ1bmN0aW9uIGdvVG9WaWV3KCkge1xuICAgICAgLy8gVE9ETyBsZXRzIG5hdmlnYXRlIHRvIHRoZSB2aWV3IGlmIHdlIGhhdmUgYSBzZXBhcmF0ZSB2aWV3IG9uZSBkYXkgOilcbiAgICAgIC8qXG4gICAgICAgaWYgKCRzY29wZS5icmVhZGNydW1icyAmJiAkc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoID4gMSkge1xuICAgICAgIHZhciB2aWV3TGluayA9ICRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMl07XG4gICAgICAgbG9nLmRlYnVnKFwiZ29Ub1ZpZXcgaGFzIGZvdW5kIHZpZXcgXCIgKyB2aWV3TGluayk7XG4gICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKHZpZXdMaW5rLCBcIiNcIik7XG4gICAgICAgJGxvY2F0aW9uLnBhdGgocGF0aCk7XG4gICAgICAgfSBlbHNlIHtcbiAgICAgICBsb2cuZGVidWcoXCJnb1RvVmlldyBoYXMgbm8gYnJlYWRjcnVtYnMhXCIpO1xuICAgICAgIH1cbiAgICAgICAqL1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZE5ld05vZGUobm9kZU1vZGVsKSB7XG4gICAgICB2YXIgZG9jID0gJHNjb3BlLmRvYyB8fCBkb2N1bWVudDtcbiAgICAgIHZhciBwYXJlbnRGb2xkZXIgPSAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgfHwgJHNjb3BlLnJvb3RGb2xkZXI7XG4gICAgICB2YXIga2V5ID0gbm9kZU1vZGVsW1wiX2lkXCJdO1xuICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiV0FSTklORzogbm8gaWQgZm9yIG1vZGVsIFwiICsgSlNPTi5zdHJpbmdpZnkobm9kZU1vZGVsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdHJlZU5vZGUgPSAkc2NvcGUuc2VsZWN0ZWRGb2xkZXI7XG4gICAgICAgIGlmIChrZXkgPT09IFwicm91dGVcIikge1xuICAgICAgICAgIC8vIGxldHMgYWRkIHRvIHRoZSByb290IG9mIHRoZSB0cmVlXG4gICAgICAgICAgdHJlZU5vZGUgPSAkc2NvcGUucm9vdEZvbGRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoIXRyZWVOb2RlKSB7XG4gICAgICAgICAgICAvLyBsZXRzIHNlbGVjdCB0aGUgbGFzdCByb3V0ZSAtIGFuZCBjcmVhdGUgYSBuZXcgcm91dGUgaWYgbmVlZCBiZVxuICAgICAgICAgICAgdmFyIHJvb3QgPSAkc2NvcGUucm9vdEZvbGRlcjtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW47XG4gICAgICAgICAgICBpZiAoIWNoaWxkcmVuIHx8ICFjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgYWRkTmV3Tm9kZShDYW1lbC5nZXRDYW1lbFNjaGVtYShcInJvdXRlXCIpKTtcbiAgICAgICAgICAgICAgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICB0cmVlTm9kZSA9IGdldFJvdXRlRm9sZGVyKCRzY29wZS5yb290Rm9sZGVyLCAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkKSB8fCBjaGlsZHJlbltjaGlsZHJlbi5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNvdWxkIG5vdCBhZGQgYSBuZXcgcm91dGUgdG8gdGhlIGVtcHR5IHRyZWUhXCIpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gaWYgdGhlIHBhcmVudCBmb2xkZXIgbGlrZXMgdG8gYWN0IGFzIGEgcGlwZWxpbmUsIHRoZW4gYWRkXG4gICAgICAgICAgLy8gYWZ0ZXIgdGhlIHBhcmVudCwgcmF0aGVyIHRoYW4gYXMgYSBjaGlsZFxuICAgICAgICAgIHZhciBwYXJlbnRUeXBlTmFtZSA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKHRyZWVOb2RlKTtcbiAgICAgICAgICBpZiAoIUNhbWVsLmFjY2VwdE91dHB1dChwYXJlbnRUeXBlTmFtZSkpIHtcbiAgICAgICAgICAgIHRyZWVOb2RlID0gdHJlZU5vZGUucGFyZW50IHx8IHRyZWVOb2RlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodHJlZU5vZGUpIHtcbiAgICAgICAgICB2YXIgbm9kZSA9IGRvYy5jcmVhdGVFbGVtZW50KGtleSk7XG4gICAgICAgICAgcGFyZW50Rm9sZGVyID0gdHJlZU5vZGU7XG4gICAgICAgICAgdmFyIGFkZGVkTm9kZSA9IENhbWVsLmFkZFJvdXRlQ2hpbGQocGFyZW50Rm9sZGVyLCBub2RlKTtcbiAgICAgICAgICAvLyBUT0RPIGFkZCB0aGUgc2NoZW1hIGhlcmUgZm9yIGFuIGVsZW1lbnQ/P1xuICAgICAgICAgIC8vIG9yIGRlZmF1bHQgdGhlIGRhdGEgb3Igc29tZXRoaW5nXG5cbiAgICAgICAgICB2YXIgbm9kZURhdGEgPSB7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBpZiAoa2V5ID09PSBcImVuZHBvaW50XCIgJiYgJHNjb3BlLmVuZHBvaW50Q29uZmlnKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0gJHNjb3BlLmVuZHBvaW50Q29uZmlnLmtleTtcbiAgICAgICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgICAgICAgbm9kZURhdGFbXCJ1cmlcIl0gPSBrZXkgKyBcIjpcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYWRkZWROb2RlW1wiY2FtZWxOb2RlRGF0YVwiXSA9IG5vZGVEYXRhO1xuICAgICAgICAgIGFkZGVkTm9kZVtcImVuZHBvaW50Q29uZmlnXCJdID0gJHNjb3BlLmVuZHBvaW50Q29uZmlnO1xuXG4gICAgICAgICAgaWYgKGtleSA9PT0gXCJyb3V0ZVwiKSB7XG4gICAgICAgICAgICAvLyBsZXRzIGdlbmVyYXRlIGEgbmV3IHJvdXRlSWQgYW5kIHN3aXRjaCB0byBpdFxuICAgICAgICAgICAgdmFyIGNvdW50ID0gJHNjb3BlLnJvdXRlSWRzLmxlbmd0aDtcbiAgICAgICAgICAgIHZhciBub2RlSWQgPSBudWxsO1xuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgbm9kZUlkID0gXCJyb3V0ZVwiICsgKCsrY291bnQpO1xuICAgICAgICAgICAgICBpZiAoISRzY29wZS5yb3V0ZUlkcy5maW5kKG5vZGVJZCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWRkZWROb2RlW1wicm91dGVYbWxOb2RlXCJdLnNldEF0dHJpYnV0ZShcImlkXCIsIG5vZGVJZCk7XG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkID0gbm9kZUlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdHJlZU1vZGlmaWVkKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJlZU1vZGlmaWVkKHJlcG9zaXRpb24gPSB0cnVlKSB7XG4gICAgICAvLyBsZXRzIHJlY3JlYXRlIHRoZSBYTUwgbW9kZWwgZnJvbSB0aGUgdXBkYXRlIEZvbGRlciB0cmVlXG4gICAgICB2YXIgbmV3RG9jID0gQ2FtZWwuZ2VuZXJhdGVYbWxGcm9tRm9sZGVyKCRzY29wZS5yb290Rm9sZGVyKTtcbiAgICAgIHZhciB0cmVlID0gQ2FtZWwubG9hZENhbWVsVHJlZShuZXdEb2MsICRzY29wZS5wYWdlSWQpO1xuICAgICAgaWYgKHRyZWUpIHtcbiAgICAgICAgJHNjb3BlLnJvb3RGb2xkZXIgPSB0cmVlO1xuICAgICAgICAkc2NvcGUuZG9jID0gQ29yZS5wYXRoR2V0KHRyZWUsIFtcInhtbERvY3VtZW50XCJdKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5tb2RpZmllZCA9IHRydWU7XG4gICAgICByZWxvYWRSb3V0ZUlkcygpO1xuICAgICAgJHNjb3BlLmRvTGF5b3V0KCk7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gcmVsb2FkUm91dGVJZHMoKSB7XG4gICAgICAkc2NvcGUucm91dGVJZHMgPSBbXTtcbiAgICAgIHZhciBkb2MgPSAkKCRzY29wZS5kb2MpO1xuICAgICAgJHNjb3BlLmNhbWVsU2VsZWN0aW9uRGV0YWlscy5zZWxlY3RlZENhbWVsQ29udGV4dElkID0gZG9jLmZpbmQoXCJjYW1lbENvbnRleHRcIikuYXR0cihcImlkXCIpO1xuICAgICAgZG9jLmZpbmQoXCJyb3V0ZVwiKS5lYWNoKChpZHgsIHJvdXRlKSA9PiB7XG4gICAgICAgIHZhciBpZCA9IHJvdXRlLmdldEF0dHJpYnV0ZShcImlkXCIpO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAkc2NvcGUucm91dGVJZHMucHVzaChpZCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUm91dGVTZWxlY3Rpb25DaGFuZ2VkKCkge1xuICAgICAgaWYgKCRzY29wZS5kb2MpIHtcbiAgICAgICAgaWYgKCEkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkICYmICRzY29wZS5yb3V0ZUlkcyAmJiAkc2NvcGUucm91dGVJZHMubGVuZ3RoKSB7XG4gICAgICAgICAgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCA9ICRzY29wZS5yb3V0ZUlkc1swXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkUm91dGVJZCAmJiAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkICE9PSAkc2NvcGUuZHJhd25Sb3V0ZUlkKSB7XG4gICAgICAgICAgdmFyIG5vZGVzID0gW107XG4gICAgICAgICAgdmFyIGxpbmtzID0gW107XG4gICAgICAgICAgQ2FtZWwubG9hZFJvdXRlWG1sTm9kZXMoJHNjb3BlLCAkc2NvcGUuZG9jLCAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkLCBub2RlcywgbGlua3MsIGdldFdpZHRoKCkpO1xuICAgICAgICAgIHVwZGF0ZVNlbGVjdGlvbigkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkKTtcbiAgICAgICAgICAvLyBub3cgd2UndmUgZ290IGNpZCB2YWx1ZXMgaW4gdGhlIHRyZWUgYW5kIERPTSwgbGV0cyBjcmVhdGUgYW4gaW5kZXggc28gd2UgY2FuIGJpbmQgdGhlIERPTSB0byB0aGUgdHJlZSBtb2RlbFxuICAgICAgICAgICRzY29wZS5mb2xkZXJzID0gQ2FtZWwuYWRkRm9sZGVyc1RvSW5kZXgoJHNjb3BlLnJvb3RGb2xkZXIpO1xuICAgICAgICAgIHNob3dHcmFwaChub2RlcywgbGlua3MpO1xuICAgICAgICAgICRzY29wZS5kcmF3blJvdXRlSWQgPSAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS5jYW1lbFNlbGVjdGlvbkRldGFpbHMuc2VsZWN0ZWRSb3V0ZUlkID0gJHNjb3BlLnNlbGVjdGVkUm91dGVJZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93R3JhcGgobm9kZXMsIGxpbmtzKSB7XG4gICAgICBsYXlvdXRHcmFwaChub2RlcywgbGlua3MpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5vZGVJZChub2RlKSB7XG4gICAgICBpZiAoYW5ndWxhci5pc051bWJlcihub2RlKSkge1xuICAgICAgICB2YXIgaWR4ID0gbm9kZTtcbiAgICAgICAgbm9kZSA9ICRzY29wZS5ub2RlU3RhdGVzW2lkeF07XG4gICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNhbnQgZmluZCBub2RlIGF0IFwiICsgaWR4KTtcbiAgICAgICAgICByZXR1cm4gXCJub2RlLVwiICsgaWR4O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbm9kZS5jaWQgfHwgXCJub2RlLVwiICsgbm9kZS5pZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZWxlY3RlZE9yUm91dGVGb2xkZXIoKSB7XG4gICAgICByZXR1cm4gJHNjb3BlLnNlbGVjdGVkRm9sZGVyIHx8IGdldFJvdXRlRm9sZGVyKCRzY29wZS5yb290Rm9sZGVyLCAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRDb250YWluZXJFbGVtZW50KCkge1xuICAgICAgdmFyIHJvb3RFbGVtZW50ID0gJGVsZW1lbnQ7XG4gICAgICB2YXIgY29udGFpbmVyRWxlbWVudCA9IHJvb3RFbGVtZW50LmZpbmQoXCIuY2FudmFzXCIpO1xuICAgICAgaWYgKCFjb250YWluZXJFbGVtZW50IHx8ICFjb250YWluZXJFbGVtZW50Lmxlbmd0aCkgY29udGFpbmVyRWxlbWVudCA9IHJvb3RFbGVtZW50O1xuICAgICAgcmV0dXJuIGNvbnRhaW5lckVsZW1lbnQ7XG4gICAgfVxuXG4gICAgLy8gY29uZmlndXJlIGNhbnZhcyBsYXlvdXQgYW5kIHN0eWxlc1xuICAgIHZhciBlbmRwb2ludFN0eWxlOmFueVtdID0gW1wiRG90XCIsIHsgcmFkaXVzOiA0LCBjc3NDbGFzczogJ2NhbWVsLWNhbnZhcy1lbmRwb2ludCcgfV07XG4gICAgdmFyIGhvdmVyUGFpbnRTdHlsZSA9IHsgc3Ryb2tlU3R5bGU6IFwicmVkXCIsIGxpbmVXaWR0aDogMyB9O1xuICAgIC8vdmFyIGxhYmVsU3R5bGVzOiBhbnlbXSA9IFsgXCJMYWJlbFwiLCB7IGxhYmVsOlwiRk9PXCIsIGlkOlwibGFiZWxcIiB9XTtcbiAgICB2YXIgbGFiZWxTdHlsZXM6YW55W10gPSBbIFwiTGFiZWxcIiBdO1xuICAgIHZhciBhcnJvd1N0eWxlczphbnlbXSA9IFsgXCJBcnJvd1wiLCB7XG4gICAgICBsb2NhdGlvbjogMSxcbiAgICAgIGlkOiBcImFycm93XCIsXG4gICAgICBsZW5ndGg6IDgsXG4gICAgICB3aWR0aDogOCxcbiAgICAgIGZvbGRiYWNrOiAwLjhcbiAgICB9IF07XG4gICAgdmFyIGNvbm5lY3RvclN0eWxlOmFueVtdID0gWyBcIlN0YXRlTWFjaGluZVwiLCB7IGN1cnZpbmVzczogMTAsIHByb3hpbWl0eUxpbWl0OiA1MCB9IF07XG5cbiAgICBqc1BsdW1iSW5zdGFuY2UuaW1wb3J0RGVmYXVsdHMoe1xuICAgICAgRW5kcG9pbnQ6IGVuZHBvaW50U3R5bGUsXG4gICAgICBIb3ZlclBhaW50U3R5bGU6IGhvdmVyUGFpbnRTdHlsZSxcbiAgICAgIENvbm5lY3Rpb25PdmVybGF5czogW1xuICAgICAgICBhcnJvd1N0eWxlcyxcbiAgICAgICAgbGFiZWxTdHlsZXNcbiAgICAgIF1cbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgKCkgPT4ge1xuICAgICAganNQbHVtYkluc3RhbmNlLnJlc2V0KCk7XG4gICAgICBkZWxldGUganNQbHVtYkluc3RhbmNlO1xuICAgIH0pO1xuXG4gICAgLy8gZG91YmxlIGNsaWNrIG9uIGFueSBjb25uZWN0aW9uXG4gICAganNQbHVtYkluc3RhbmNlLmJpbmQoXCJkYmxjbGlja1wiLCBmdW5jdGlvbiAoY29ubmVjdGlvbiwgb3JpZ2luYWxFdmVudCkge1xuICAgICAgaWYgKGpzUGx1bWJJbnN0YW5jZS5pc1N1c3BlbmREcmF3aW5nKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYWxlcnQoXCJkb3VibGUgY2xpY2sgb24gY29ubmVjdGlvbiBmcm9tIFwiICsgY29ubmVjdGlvbi5zb3VyY2VJZCArIFwiIHRvIFwiICsgY29ubmVjdGlvbi50YXJnZXRJZCk7XG4gICAgfSk7XG5cbiAgICBqc1BsdW1iSW5zdGFuY2UuYmluZCgnY29ubmVjdGlvbicsIGZ1bmN0aW9uIChpbmZvLCBldnQpIHtcbiAgICAgIC8vbG9nLmRlYnVnKFwiQ29ubmVjdGlvbiBldmVudDogXCIsIGluZm8pO1xuICAgICAgbG9nLmRlYnVnKFwiQ3JlYXRpbmcgY29ubmVjdGlvbiBmcm9tIFwiLCBpbmZvLnNvdXJjZUlkLCBcIiB0byBcIiwgaW5mby50YXJnZXRJZCk7XG4gICAgICB2YXIgbGluayA9IGdldExpbmsoaW5mbyk7XG4gICAgICB2YXIgc291cmNlID0gJHNjb3BlLm5vZGVzW2xpbmsuc291cmNlXTtcbiAgICAgIHZhciBzb3VyY2VGb2xkZXIgPSAkc2NvcGUuZm9sZGVyc1tsaW5rLnNvdXJjZV07XG4gICAgICB2YXIgdGFyZ2V0Rm9sZGVyID0gJHNjb3BlLmZvbGRlcnNbbGluay50YXJnZXRdO1xuICAgICAgaWYgKENhbWVsLmlzTmV4dFNpYmxpbmdBZGRlZEFzQ2hpbGQoc291cmNlLnR5cGUpKSB7XG4gICAgICAgIHNvdXJjZUZvbGRlci5tb3ZlQ2hpbGQodGFyZ2V0Rm9sZGVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNvdXJjZUZvbGRlci5wYXJlbnQuaW5zZXJ0QWZ0ZXIodGFyZ2V0Rm9sZGVyLCBzb3VyY2VGb2xkZXIpO1xuICAgICAgfVxuICAgICAgdHJlZU1vZGlmaWVkKCk7XG4gICAgfSk7XG5cbiAgICAvLyBsZXRzIGRlbGV0ZSBjb25uZWN0aW9ucyBvbiBjbGlja1xuICAgIGpzUGx1bWJJbnN0YW5jZS5iaW5kKFwiY2xpY2tcIiwgZnVuY3Rpb24gKGMpIHtcbiAgICAgIGlmIChqc1BsdW1iSW5zdGFuY2UuaXNTdXNwZW5kRHJhd2luZygpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGpzUGx1bWJJbnN0YW5jZS5kZXRhY2goYyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBsYXlvdXRHcmFwaChub2RlcywgbGlua3MpIHtcbiAgICAgIHZhciB0cmFuc2l0aW9ucyA9IFtdO1xuICAgICAgdmFyIHN0YXRlcyA9IENvcmUuY3JlYXRlR3JhcGhTdGF0ZXMobm9kZXMsIGxpbmtzLCB0cmFuc2l0aW9ucyk7XG5cbiAgICAgIGxvZy5kZWJ1ZyhcImxpbmtzOiBcIiwgbGlua3MpO1xuICAgICAgbG9nLmRlYnVnKFwidHJhbnNpdGlvbnM6IFwiLCB0cmFuc2l0aW9ucyk7XG5cbiAgICAgICRzY29wZS5ub2RlU3RhdGVzID0gc3RhdGVzO1xuICAgICAgdmFyIGNvbnRhaW5lckVsZW1lbnQgPSBnZXRDb250YWluZXJFbGVtZW50KCk7XG5cbiAgICAgIGpzUGx1bWJJbnN0YW5jZS5kb1doaWxlU3VzcGVuZGVkKCgpID0+IHtcblxuICAgICAgICAvL3NldCBvdXIgY29udGFpbmVyIHRvIHNvbWUgYXJiaXRyYXJ5IGluaXRpYWwgc2l6ZVxuICAgICAgICBjb250YWluZXJFbGVtZW50LmNzcyh7XG4gICAgICAgICAgJ3dpZHRoJzogJzgwMHB4JyxcbiAgICAgICAgICAnaGVpZ2h0JzogJzgwMHB4JyxcbiAgICAgICAgICAnbWluLWhlaWdodCc6ICc4MDBweCcsXG4gICAgICAgICAgJ21pbi13aWR0aCc6ICc4MDBweCdcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBjb250YWluZXJIZWlnaHQgPSAwO1xuICAgICAgICB2YXIgY29udGFpbmVyV2lkdGggPSAwO1xuXG4gICAgICAgIGNvbnRhaW5lckVsZW1lbnQuZmluZCgnZGl2LmNvbXBvbmVudCcpLmVhY2goKGksIGVsKSA9PiB7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiQ2hlY2tpbmc6IFwiLCBlbCwgXCIgXCIsIGkpO1xuICAgICAgICAgIGlmICghc3RhdGVzLmFueSgobm9kZSkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBlbC5pZCA9PT0gZ2V0Tm9kZUlkKG5vZGUpO1xuICAgICAgICAgICAgICB9KSkge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiUmVtb3ZpbmcgZWxlbWVudDogXCIsIGVsLmlkKTtcbiAgICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5yZW1vdmUoZWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHN0YXRlcywgKG5vZGUpID0+IHtcbiAgICAgICAgICBsb2cuZGVidWcoXCJub2RlOiBcIiwgbm9kZSk7XG4gICAgICAgICAgdmFyIGlkID0gZ2V0Tm9kZUlkKG5vZGUpO1xuICAgICAgICAgIHZhciBkaXYgPSBjb250YWluZXJFbGVtZW50LmZpbmQoJyMnICsgaWQpO1xuXG4gICAgICAgICAgaWYgKCFkaXZbMF0pIHtcbiAgICAgICAgICAgIGRpdiA9ICQoJHNjb3BlLm5vZGVUZW1wbGF0ZSh7XG4gICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgbm9kZTogbm9kZVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgZGl2LmFwcGVuZFRvKGNvbnRhaW5lckVsZW1lbnQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIE1ha2UgdGhlIG5vZGUgYSBqc3BsdW1iIHNvdXJjZVxuICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5tYWtlU291cmNlKGRpdiwge1xuICAgICAgICAgICAgZmlsdGVyOiBcImltZy5ub2RlSWNvblwiLFxuICAgICAgICAgICAgYW5jaG9yOiBcIkNvbnRpbnVvdXNcIixcbiAgICAgICAgICAgIGNvbm5lY3RvcjogY29ubmVjdG9yU3R5bGUsXG4gICAgICAgICAgICBjb25uZWN0b3JTdHlsZTogeyBzdHJva2VTdHlsZTogXCIjNjY2XCIsIGxpbmVXaWR0aDogMyB9LFxuICAgICAgICAgICAgbWF4Q29ubmVjdGlvbnM6IC0xXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBhbmQgYWxzbyBhIGpzcGx1bWIgdGFyZ2V0XG4gICAgICAgICAganNQbHVtYkluc3RhbmNlLm1ha2VUYXJnZXQoZGl2LCB7XG4gICAgICAgICAgICBkcm9wT3B0aW9uczogeyBob3ZlckNsYXNzOiBcImRyYWdIb3ZlclwiIH0sXG4gICAgICAgICAgICBhbmNob3I6IFwiQ29udGludW91c1wiXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UuZHJhZ2dhYmxlKGRpdiwge1xuICAgICAgICAgICAgY29udGFpbm1lbnQ6ICcuY2FtZWwtY2FudmFzJ1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gYWRkIGV2ZW50IGhhbmRsZXJzIHRvIHRoaXMgbm9kZVxuICAgICAgICAgIGRpdi5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbmV3RmxhZyA9ICFkaXYuaGFzQ2xhc3MoXCJzZWxlY3RlZFwiKTtcbiAgICAgICAgICAgIGNvbnRhaW5lckVsZW1lbnQuZmluZCgnZGl2LmNvbXBvbmVudCcpLnRvZ2dsZUNsYXNzKFwic2VsZWN0ZWRcIiwgZmFsc2UpO1xuICAgICAgICAgICAgZGl2LnRvZ2dsZUNsYXNzKFwic2VsZWN0ZWRcIiwgbmV3RmxhZyk7XG4gICAgICAgICAgICB2YXIgaWQgPSBkaXYuYXR0cihcImlkXCIpO1xuICAgICAgICAgICAgdXBkYXRlU2VsZWN0aW9uKG5ld0ZsYWcgPyBpZCA6IG51bGwpO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGRpdi5kYmxjbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSBkaXYuYXR0cihcImlkXCIpO1xuICAgICAgICAgICAgdXBkYXRlU2VsZWN0aW9uKGlkKTtcbiAgICAgICAgICAgIC8vJHNjb3BlLnByb3BlcnRpZXNEaWFsb2cub3BlbigpO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBoZWlnaHQgPSBkaXYuaGVpZ2h0KCk7XG4gICAgICAgICAgdmFyIHdpZHRoID0gZGl2LndpZHRoKCk7XG4gICAgICAgICAgaWYgKGhlaWdodCB8fCB3aWR0aCkge1xuICAgICAgICAgICAgbm9kZS53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgbm9kZS5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgICAgICBkaXYuY3NzKHtcbiAgICAgICAgICAgICAgJ21pbi13aWR0aCc6IHdpZHRoLFxuICAgICAgICAgICAgICAnbWluLWhlaWdodCc6IGhlaWdodFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgZWRnZVNlcCA9IDEwO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgbGF5b3V0IGFuZCBnZXQgdGhlIGJ1aWxkR3JhcGhcbiAgICAgICAgZGFncmUubGF5b3V0KClcbiAgICAgICAgICAgIC5ub2RlU2VwKDEwMClcbiAgICAgICAgICAgIC5lZGdlU2VwKGVkZ2VTZXApXG4gICAgICAgICAgICAucmFua1NlcCg3NSlcbiAgICAgICAgICAgIC5ub2RlcyhzdGF0ZXMpXG4gICAgICAgICAgICAuZWRnZXModHJhbnNpdGlvbnMpXG4gICAgICAgICAgICAuZGVidWdMZXZlbCgxKVxuICAgICAgICAgICAgLnJ1bigpO1xuXG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzdGF0ZXMsIChub2RlKSA9PiB7XG5cbiAgICAgICAgICAvLyBwb3NpdGlvbiB0aGUgbm9kZSBpbiB0aGUgZ3JhcGhcbiAgICAgICAgICB2YXIgaWQgPSBnZXROb2RlSWQobm9kZSk7XG4gICAgICAgICAgdmFyIGRpdiA9ICQoXCIjXCIgKyBpZCk7XG4gICAgICAgICAgdmFyIGRpdkhlaWdodCA9IGRpdi5oZWlnaHQoKTtcbiAgICAgICAgICB2YXIgZGl2V2lkdGggPSBkaXYud2lkdGgoKTtcbiAgICAgICAgICB2YXIgbGVmdE9mZnNldCA9IG5vZGUuZGFncmUueCArIGRpdldpZHRoO1xuICAgICAgICAgIHZhciBib3R0b21PZmZzZXQgPSBub2RlLmRhZ3JlLnkgKyBkaXZIZWlnaHQ7XG4gICAgICAgICAgaWYgKGNvbnRhaW5lckhlaWdodCA8IGJvdHRvbU9mZnNldCkge1xuICAgICAgICAgICAgY29udGFpbmVySGVpZ2h0ID0gYm90dG9tT2Zmc2V0ICsgZWRnZVNlcCAqIDI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjb250YWluZXJXaWR0aCA8IGxlZnRPZmZzZXQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lcldpZHRoID0gbGVmdE9mZnNldCArIGVkZ2VTZXAgKiAyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkaXYuY3NzKHt0b3A6IG5vZGUuZGFncmUueSwgbGVmdDogbm9kZS5kYWdyZS54fSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHNpemUgdGhlIGNvbnRhaW5lciB0byBmaXQgdGhlIGdyYXBoXG4gICAgICAgIGNvbnRhaW5lckVsZW1lbnQuY3NzKHtcbiAgICAgICAgICAnd2lkdGgnOiBjb250YWluZXJXaWR0aCxcbiAgICAgICAgICAnaGVpZ2h0JzogY29udGFpbmVySGVpZ2h0LFxuICAgICAgICAgICdtaW4taGVpZ2h0JzogY29udGFpbmVySGVpZ2h0LFxuICAgICAgICAgICdtaW4td2lkdGgnOiBjb250YWluZXJXaWR0aFxuICAgICAgICB9KTtcblxuXG4gICAgICAgIGNvbnRhaW5lckVsZW1lbnQuZGJsY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICRzY29wZS5wcm9wZXJ0aWVzRGlhbG9nLm9wZW4oKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAganNQbHVtYkluc3RhbmNlLnNldFN1c3BlbmRFdmVudHModHJ1ZSk7XG4gICAgICAgIC8vIERldGFjaCBhbGwgdGhlIGN1cnJlbnQgY29ubmVjdGlvbnMgYW5kIHJlY29ubmVjdCBldmVyeXRoaW5nIGJhc2VkIG9uIHRoZSB1cGRhdGVkIGdyYXBoXG4gICAgICAgIGpzUGx1bWJJbnN0YW5jZS5kZXRhY2hFdmVyeUNvbm5lY3Rpb24oe2ZpcmVFdmVudDogZmFsc2V9KTtcblxuICAgICAgICBhbmd1bGFyLmZvckVhY2gobGlua3MsIChsaW5rKSA9PiB7XG4gICAgICAgICAganNQbHVtYkluc3RhbmNlLmNvbm5lY3Qoe1xuICAgICAgICAgICAgc291cmNlOiBnZXROb2RlSWQobGluay5zb3VyY2UpLFxuICAgICAgICAgICAgdGFyZ2V0OiBnZXROb2RlSWQobGluay50YXJnZXQpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBqc1BsdW1iSW5zdGFuY2Uuc2V0U3VzcGVuZEV2ZW50cyhmYWxzZSk7XG5cbiAgICAgIH0pO1xuXG5cbiAgICAgIHJldHVybiBzdGF0ZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TGluayhpbmZvKSB7XG4gICAgICB2YXIgc291cmNlSWQgPSBpbmZvLnNvdXJjZUlkO1xuICAgICAgdmFyIHRhcmdldElkID0gaW5mby50YXJnZXRJZDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNvdXJjZTogc291cmNlSWQsXG4gICAgICAgIHRhcmdldDogdGFyZ2V0SWRcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROb2RlQnlDSUQobm9kZXMsIGNpZCkge1xuICAgICAgcmV0dXJuIG5vZGVzLmZpbmQoKG5vZGUpID0+IHtcbiAgICAgICAgcmV0dXJuIG5vZGUuY2lkID09PSBjaWQ7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqIFVwZGF0ZXMgdGhlIHNlbGVjdGlvbiB3aXRoIHRoZSBnaXZlbiBmb2xkZXIgb3IgSURcbiAgICAgKi9cbiAgICBmdW5jdGlvbiB1cGRhdGVTZWxlY3Rpb24oZm9sZGVyT3JJZCkge1xuICAgICAgdmFyIGZvbGRlciA9IG51bGw7XG4gICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyhmb2xkZXJPcklkKSkge1xuICAgICAgICB2YXIgaWQgPSBmb2xkZXJPcklkO1xuICAgICAgICBmb2xkZXIgPSAoaWQgJiYgJHNjb3BlLmZvbGRlcnMpID8gJHNjb3BlLmZvbGRlcnNbaWRdIDogbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvbGRlciA9IGZvbGRlck9ySWQ7XG4gICAgICB9XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgPSBmb2xkZXI7XG4gICAgICBmb2xkZXIgPSBnZXRTZWxlY3RlZE9yUm91dGVGb2xkZXIoKTtcbiAgICAgICRzY29wZS5ub2RlWG1sTm9kZSA9IG51bGw7XG4gICAgICAkc2NvcGUucHJvcGVydGllc1RlbXBsYXRlID0gbnVsbDtcbiAgICAgIGlmIChmb2xkZXIpIHtcbiAgICAgICAgdmFyIG5vZGVOYW1lID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQoZm9sZGVyKTtcbiAgICAgICAgJHNjb3BlLm5vZGVEYXRhID0gQ2FtZWwuZ2V0Um91dGVGb2xkZXJKU09OKGZvbGRlcik7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YUNoYW5nZWRGaWVsZHMgPSB7fTtcbiAgICAgICAgJHNjb3BlLm5vZGVNb2RlbCA9IENhbWVsLmdldENhbWVsU2NoZW1hKG5vZGVOYW1lKTtcbiAgICAgICAgaWYgKCRzY29wZS5ub2RlTW9kZWwpIHtcbiAgICAgICAgICAkc2NvcGUucHJvcGVydGllc1RlbXBsYXRlID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9jYW1lbFByb3BlcnRpZXNFZGl0Lmh0bWxcIjtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRFbmRwb2ludCA9IG51bGw7XG4gICAgICAgIGlmIChcImVuZHBvaW50XCIgPT09IG5vZGVOYW1lKSB7XG4gICAgICAgICAgdmFyIHVyaSA9ICRzY29wZS5ub2RlRGF0YVtcInVyaVwiXTtcbiAgICAgICAgICBpZiAodXJpKSB7XG4gICAgICAgICAgICAvLyBsZXRzIGRlY29tcG9zZSB0aGUgVVJJIGludG8gc2NoZW1lLCBwYXRoIGFuZCBwYXJhbWV0ZXJzXG4gICAgICAgICAgICB2YXIgaWR4ID0gdXJpLmluZGV4T2YoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgICAgICAgdmFyIGVuZHBvaW50U2NoZW1lID0gdXJpLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgICAgICAgICB2YXIgZW5kcG9pbnRQYXRoID0gdXJpLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgICAgICAgICAgLy8gZm9yIGVtcHR5IHBhdGhzIGxldHMgYXNzdW1lIHdlIG5lZWQgLy8gb24gYSBVUklcbiAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGF0aEhhc1NsYXNoZXMgPSBlbmRwb2ludFBhdGggPyBmYWxzZSA6IHRydWU7XG4gICAgICAgICAgICAgIGlmIChlbmRwb2ludFBhdGguc3RhcnRzV2l0aChcIi8vXCIpKSB7XG4gICAgICAgICAgICAgICAgZW5kcG9pbnRQYXRoID0gZW5kcG9pbnRQYXRoLnN1YnN0cmluZygyKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZW5kcG9pbnRQYXRoSGFzU2xhc2hlcyA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWR4ID0gZW5kcG9pbnRQYXRoLmluZGV4T2YoXCI/XCIpO1xuICAgICAgICAgICAgICB2YXIgZW5kcG9pbnRQYXJhbWV0ZXJzID0ge307XG4gICAgICAgICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtZXRlcnMgPSBlbmRwb2ludFBhdGguc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgICAgICAgICAgIGVuZHBvaW50UGF0aCA9IGVuZHBvaW50UGF0aC5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgICAgICAgICBlbmRwb2ludFBhcmFtZXRlcnMgPSBDb3JlLnN0cmluZ1RvSGFzaChwYXJhbWV0ZXJzKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICRzY29wZS5lbmRwb2ludFNjaGVtZSA9IGVuZHBvaW50U2NoZW1lO1xuICAgICAgICAgICAgICAkc2NvcGUuZW5kcG9pbnRQYXRoID0gZW5kcG9pbnRQYXRoO1xuICAgICAgICAgICAgICAkc2NvcGUuZW5kcG9pbnRQYXJhbWV0ZXJzID0gZW5kcG9pbnRQYXJhbWV0ZXJzO1xuXG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZyhcImVuZHBvaW50IFwiICsgZW5kcG9pbnRTY2hlbWUgKyBcIiBwYXRoIFwiICsgZW5kcG9pbnRQYXRoICsgXCIgYW5kIHBhcmFtZXRlcnMgXCIgKyBKU09OLnN0cmluZ2lmeShlbmRwb2ludFBhcmFtZXRlcnMpKTtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvYWRFbmRwb2ludFNjaGVtYShlbmRwb2ludFNjaGVtZSk7XG4gICAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZEVuZHBvaW50ID0ge1xuICAgICAgICAgICAgICAgIGVuZHBvaW50U2NoZW1lOiBlbmRwb2ludFNjaGVtZSxcbiAgICAgICAgICAgICAgICBlbmRwb2ludFBhdGg6IGVuZHBvaW50UGF0aCxcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzOiBlbmRwb2ludFBhcmFtZXRlcnNcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRXaWR0aCgpIHtcbiAgICAgIHZhciBjYW52YXNEaXYgPSAkKCRlbGVtZW50KTtcbiAgICAgIHJldHVybiBjYW52YXNEaXYud2lkdGgoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRGb2xkZXJJZEF0dHJpYnV0ZShyb3V0ZSkge1xuICAgICAgdmFyIGlkID0gbnVsbDtcbiAgICAgIGlmIChyb3V0ZSkge1xuICAgICAgICB2YXIgeG1sTm9kZSA9IHJvdXRlW1wicm91dGVYbWxOb2RlXCJdO1xuICAgICAgICBpZiAoeG1sTm9kZSkge1xuICAgICAgICAgIGlkID0geG1sTm9kZS5nZXRBdHRyaWJ1dGUoXCJpZFwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGlkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFJvdXRlRm9sZGVyKHRyZWUsIHJvdXRlSWQpIHtcbiAgICAgIHZhciBhbnN3ZXIgPSBudWxsO1xuICAgICAgaWYgKHRyZWUpIHtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRyZWUuY2hpbGRyZW4sIChyb3V0ZSkgPT4ge1xuICAgICAgICAgIGlmICghYW5zd2VyKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSBnZXRGb2xkZXJJZEF0dHJpYnV0ZShyb3V0ZSk7XG4gICAgICAgICAgICBpZiAocm91dGVJZCA9PT0gaWQpIHtcbiAgICAgICAgICAgICAgYW5zd2VyID0gcm91dGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgfVxuXG4gICAgJHNjb3BlLmRvU3dpdGNoVG9UcmVlVmlldyA9ICgpID0+IHtcbiAgICAgICRsb2NhdGlvbi51cmwoQ29yZS50cmltTGVhZGluZygoJHNjb3BlLnN0YXJ0TGluayArIFwiL2NhbWVsL3Byb3BlcnRpZXMvXCIgKyAkc2NvcGUucGFnZUlkKSwgJyMnKSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jb25maXJtU3dpdGNoVG9UcmVlVmlldyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQpIHtcbiAgICAgICAgJHNjb3BlLnN3aXRjaFRvVHJlZVZpZXcub3BlbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmRvU3dpdGNoVG9UcmVlVmlldygpO1xuICAgICAgfVxuICAgIH07XG5cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkNvbW1pdENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCJtYXJrZWRcIiwgXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgbWFya2VkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcbiAgICB2YXIgam9sb2tpYSA9IG51bGw7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuY29tbWl0SWQgPSAkc2NvcGUub2JqZWN0SWQ7XG5cbiAgICAvLyBUT0RPIHdlIGNvdWxkIGNvbmZpZ3VyZSB0aGlzP1xuICAgICRzY29wZS5kYXRlRm9ybWF0ID0gJ0VFRSwgTU1NIGQsIHkgOiBoaDptbTpzcyBhJztcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgIGRhdGE6ICdjb21taXRzJyxcbiAgICAgIHNob3dGaWx0ZXI6IGZhbHNlLFxuICAgICAgbXVsdGlTZWxlY3Q6IGZhbHNlLFxuICAgICAgc2VsZWN0V2l0aENoZWNrYm94T25seTogdHJ1ZSxcbiAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgIGRpc3BsYXlTZWxlY3Rpb25DaGVja2JveCA6IHRydWUsIC8vIG9sZCBwcmUgMi4wIGNvbmZpZyFcbiAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICBmaWx0ZXJUZXh0OiAnJ1xuICAgICAgfSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAncGF0aCcsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdGaWxlIE5hbWUnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmaWxlQ2VsbFRlbXBsYXRlLmh0bWwnKSxcbiAgICAgICAgICB3aWR0aDogXCIqKipcIixcbiAgICAgICAgICBjZWxsRmlsdGVyOiBcIlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJyRkaWZmTGluaycsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdPcHRpb25zJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldCgndmlld0RpZmZUZW1wbGF0ZS5odG1sJylcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCd3b3Jrc3BhY2UudHJlZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghJHNjb3BlLmdpdCkge1xuICAgICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiUmVsb2FkaW5nIHRoZSB2aWV3IGFzIHdlIG5vdyBzZWVtIHRvIGhhdmUgYSBnaXQgbWJlYW4hXCIpO1xuICAgICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgJHNjb3BlLmNhblJldmVydCA9ICgpID0+IHtcbiAgICAgIHJldHVybiAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGggPT09IDE7XG4gICAgfTtcblxuICAgICRzY29wZS5yZXZlcnQgPSAoKSA9PiB7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgcGF0aCA9IGNvbW1pdFBhdGgoc2VsZWN0ZWRJdGVtc1swXSk7XG4gICAgICAgIHZhciBvYmplY3RJZCA9ICRzY29wZS5jb21taXRJZDtcbiAgICAgICAgaWYgKHBhdGggJiYgb2JqZWN0SWQpIHtcbiAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9IFwiUmV2ZXJ0aW5nIGZpbGUgXCIgKyAkc2NvcGUucGFnZUlkICsgXCIgdG8gcHJldmlvdXMgdmVyc2lvbiBcIiArIG9iamVjdElkO1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnJldmVydFRvKCRzY29wZS5icmFuY2gsIG9iamVjdElkLCAkc2NvcGUucGFnZUlkLCBjb21taXRNZXNzYWdlLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUocmVzdWx0KTtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHVwZGF0ZSB0aGUgdmlld1xuICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNvbW1pdFBhdGgoY29tbWl0KSB7XG4gICAgICByZXR1cm4gY29tbWl0LnBhdGggfHwgY29tbWl0Lm5hbWU7XG4gICAgfVxuXG4gICAgJHNjb3BlLmRpZmYgPSAoKSA9PiB7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgY29tbWl0ID0gc2VsZWN0ZWRJdGVtc1swXTtcbiAgICAgICAgLypcbiAgICAgICAgIHZhciBjb21taXQgPSByb3c7XG4gICAgICAgICB2YXIgZW50aXR5ID0gcm93LmVudGl0eTtcbiAgICAgICAgIGlmIChlbnRpdHkpIHtcbiAgICAgICAgIGNvbW1pdCA9IGVudGl0eTtcbiAgICAgICAgIH1cbiAgICAgICAgICovXG4gICAgICAgIHZhciBvdGhlckNvbW1pdElkID0gJHNjb3BlLmNvbW1pdElkO1xuICAgICAgICB2YXIgbGluayA9IFVybEhlbHBlcnMuam9pbihzdGFydExpbmsoJHNjb3BlKSwgIFwiL2RpZmYvXCIgKyAkc2NvcGUuY29tbWl0SWQgKyBcIi9cIiArIG90aGVyQ29tbWl0SWQgKyBcIi9cIiArIGNvbW1pdFBhdGgoY29tbWl0KSk7XG4gICAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIiNcIik7XG4gICAgICAgICRsb2NhdGlvbi5wYXRoKHBhdGgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgdmFyIGNvbW1pdElkID0gJHNjb3BlLmNvbW1pdElkO1xuXG4gICAgICBXaWtpLmxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyk7XG5cbiAgICAgIHdpa2lSZXBvc2l0b3J5LmNvbW1pdEluZm8oY29tbWl0SWQsIChjb21taXRJbmZvKSA9PiB7XG4gICAgICAgICRzY29wZS5jb21taXRJbmZvID0gY29tbWl0SW5mbztcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuXG4gICAgICB3aWtpUmVwb3NpdG9yeS5jb21taXRUcmVlKGNvbW1pdElkLCAoY29tbWl0cykgPT4ge1xuICAgICAgICAkc2NvcGUuY29tbWl0cyA9IGNvbW1pdHM7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb21taXRzLCAoY29tbWl0KSA9PiB7XG4gICAgICAgICAgY29tbWl0LmZpbGVJY29uSHRtbCA9IFdpa2kuZmlsZUljb25IdG1sKGNvbW1pdCk7XG4gICAgICAgICAgY29tbWl0LmZpbGVDbGFzcyA9IGNvbW1pdC5uYW1lLmVuZHNXaXRoKFwiLnByb2ZpbGVcIikgPyBcImdyZWVuXCIgOiBcIlwiO1xuICAgICAgICAgIHZhciBjaGFuZ2VUeXBlID0gY29tbWl0LmNoYW5nZVR5cGU7XG4gICAgICAgICAgdmFyIHBhdGggPSBjb21taXRQYXRoKGNvbW1pdCk7XG4gICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgIGNvbW1pdC5maWxlTGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgJy92ZXJzaW9uLycgKyBwYXRoICsgJy8nICsgY29tbWl0SWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbW1pdC4kZGlmZkxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArIFwiL2RpZmYvXCIgKyBjb21taXRJZCArIFwiL1wiICsgY29tbWl0SWQgKyBcIi9cIiArIChwYXRoIHx8IFwiXCIpO1xuICAgICAgICAgIGlmIChjaGFuZ2VUeXBlKSB7XG4gICAgICAgICAgICBjaGFuZ2VUeXBlID0gY2hhbmdlVHlwZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKGNoYW5nZVR5cGUuc3RhcnRzV2l0aChcImFcIikpIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtYWRkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcImFkZFwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcImFkZGVkXCI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoYW5nZVR5cGUuc3RhcnRzV2l0aChcImRcIikpIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtZGVsZXRlXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcImRlbGV0ZVwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcImRlbGV0ZWRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmZpbGVMaW5rID0gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VDbGFzcyA9IFwiY2hhbmdlLW1vZGlmeVwiO1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlID0gXCJtb2RpZnlcIjtcbiAgICAgICAgICAgICAgY29tbWl0LnRpdGxlID0gXCJtb2RpZmllZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29tbWl0LmNoYW5nZVR5cGVIdG1sID0gJzxzcGFuIGNsYXNzPVwiJyArIGNvbW1pdC5jaGFuZ2VDbGFzcyArICdcIj4nICsgY29tbWl0LnRpdGxlICsgJzwvc3Bhbj4nO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5Db21taXREZXRhaWxDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwibWFya2VkXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgJHRlbXBsYXRlQ2FjaGUsIG1hcmtlZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgPT4ge1xuXG4gICAgLy8gVE9ETyByZW1vdmUhXG4gICAgdmFyIGlzRm1jID0gZmFsc2U7XG4gICAgdmFyIGpvbG9raWEgPSBudWxsO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmNvbW1pdElkID0gJHNjb3BlLm9iamVjdElkO1xuXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgIG1vZGU6IHtcbiAgICAgICAgbmFtZTogJ2RpZmYnXG4gICAgICB9XG4gICAgfTtcbiAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMgPSBDb2RlRWRpdG9yLmNyZWF0ZUVkaXRvclNldHRpbmdzKG9wdGlvbnMpO1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnd29ya3NwYWNlLnRyZWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISRzY29wZS5naXQpIHtcbiAgICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIlJlbG9hZGluZyB0aGUgdmlldyBhcyB3ZSBub3cgc2VlbSB0byBoYXZlIGEgZ2l0IG1iZWFuIVwiKTtcbiAgICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgICRzY29wZS5jYW5SZXZlcnQgPSAoKSA9PiB7XG4gICAgICByZXR1cm4gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoID09PSAxO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIHBhdGggPSBjb21taXRQYXRoKHNlbGVjdGVkSXRlbXNbMF0pO1xuICAgICAgICB2YXIgb2JqZWN0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG4gICAgICAgIGlmIChwYXRoICYmIG9iamVjdElkKSB7XG4gICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBmaWxlIFwiICsgJHNjb3BlLnBhZ2VJZCArIFwiIHRvIHByZXZpb3VzIHZlcnNpb24gXCIgKyBvYmplY3RJZDtcbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5yZXZlcnRUbygkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgY29tbWl0TWVzc2FnZSwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHJlc3VsdCk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB1cGRhdGUgdGhlIHZpZXdcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjb21taXRQYXRoKGNvbW1pdCkge1xuICAgICAgcmV0dXJuIGNvbW1pdC5wYXRoIHx8IGNvbW1pdC5uYW1lO1xuICAgIH1cblxuICAgICRzY29wZS5kaWZmID0gKCkgPT4ge1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIGNvbW1pdCA9IHNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgIC8qXG4gICAgICAgICB2YXIgY29tbWl0ID0gcm93O1xuICAgICAgICAgdmFyIGVudGl0eSA9IHJvdy5lbnRpdHk7XG4gICAgICAgICBpZiAoZW50aXR5KSB7XG4gICAgICAgICBjb21taXQgPSBlbnRpdHk7XG4gICAgICAgICB9XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgb3RoZXJDb21taXRJZCA9ICRzY29wZS5jb21taXRJZDtcbiAgICAgICAgdmFyIGxpbmsgPSBVcmxIZWxwZXJzLmpvaW4oc3RhcnRMaW5rKCRzY29wZSksICBcIi9kaWZmL1wiICsgJHNjb3BlLmNvbW1pdElkICsgXCIvXCIgKyBvdGhlckNvbW1pdElkICsgXCIvXCIgKyBjb21taXRQYXRoKGNvbW1pdCkpO1xuICAgICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcobGluaywgXCIjXCIpO1xuICAgICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIHZhciBjb21taXRJZCA9ICRzY29wZS5jb21taXRJZDtcblxuICAgICAgV2lraS5sb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMpO1xuXG4gICAgICB3aWtpUmVwb3NpdG9yeS5jb21taXREZXRhaWwoY29tbWl0SWQsIChjb21taXREZXRhaWwpID0+IHtcbiAgICAgICAgaWYgKGNvbW1pdERldGFpbCkge1xuICAgICAgICAgICRzY29wZS5jb21taXREZXRhaWwgPSBjb21taXREZXRhaWw7XG4gICAgICAgICAgdmFyIGNvbW1pdCA9IGNvbW1pdERldGFpbC5jb21taXRfaW5mbztcbiAgICAgICAgICAkc2NvcGUuY29tbWl0ID0gY29tbWl0O1xuICAgICAgICAgIGlmIChjb21taXQpIHtcbiAgICAgICAgICAgIGNvbW1pdC4kZGF0ZSA9IERldmVsb3Blci5hc0RhdGUoY29tbWl0LmRhdGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY29tbWl0RGV0YWlsLmRpZmZzLCAoZGlmZikgPT4ge1xuICAgICAgICAgICAgLy8gYWRkIGxpbmsgdG8gdmlldyBmaWxlIGxpbmtcbiAgICAgICAgICAgIHZhciBwYXRoID0gZGlmZi5uZXdfcGF0aDtcbiAgICAgICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgICAgIGRpZmYuJHZpZXdMaW5rID0gVXJsSGVscGVycy5qb2luKFdpa2kuc3RhcnRXaWtpTGluaygkc2NvcGUucHJvamVjdElkLCBjb21taXRJZCksIFwidmlld1wiLCBwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgfVxuXG4vKlxuICAgICAgd2lraVJlcG9zaXRvcnkuY29tbWl0VHJlZShjb21taXRJZCwgKGNvbW1pdHMpID0+IHtcbiAgICAgICAgJHNjb3BlLmNvbW1pdHMgPSBjb21taXRzO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goY29tbWl0cywgKGNvbW1pdCkgPT4ge1xuICAgICAgICAgIGNvbW1pdC5maWxlSWNvbkh0bWwgPSBXaWtpLmZpbGVJY29uSHRtbChjb21taXQpO1xuICAgICAgICAgIGNvbW1pdC5maWxlQ2xhc3MgPSBjb21taXQubmFtZS5lbmRzV2l0aChcIi5wcm9maWxlXCIpID8gXCJncmVlblwiIDogXCJcIjtcbiAgICAgICAgICB2YXIgY2hhbmdlVHlwZSA9IGNvbW1pdC5jaGFuZ2VUeXBlO1xuICAgICAgICAgIHZhciBwYXRoID0gY29tbWl0UGF0aChjb21taXQpO1xuICAgICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgICBjb21taXQuZmlsZUxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArICcvdmVyc2lvbi8nICsgcGF0aCArICcvJyArIGNvbW1pdElkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb21taXQuJGRpZmZMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9kaWZmL1wiICsgY29tbWl0SWQgKyBcIi9cIiArIGNvbW1pdElkICsgXCIvXCIgKyAocGF0aCB8fCBcIlwiKTtcbiAgICAgICAgICBpZiAoY2hhbmdlVHlwZSkge1xuICAgICAgICAgICAgY2hhbmdlVHlwZSA9IGNoYW5nZVR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmIChjaGFuZ2VUeXBlLnN0YXJ0c1dpdGgoXCJhXCIpKSB7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VDbGFzcyA9IFwiY2hhbmdlLWFkZFwiO1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlID0gXCJhZGRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LnRpdGxlID0gXCJhZGRlZFwiO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaGFuZ2VUeXBlLnN0YXJ0c1dpdGgoXCJkXCIpKSB7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VDbGFzcyA9IFwiY2hhbmdlLWRlbGV0ZVwiO1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlID0gXCJkZWxldGVcIjtcbiAgICAgICAgICAgICAgY29tbWl0LnRpdGxlID0gXCJkZWxldGVkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5maWxlTGluayA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1tb2RpZnlcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwibW9kaWZ5XCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwibW9kaWZpZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VUeXBlSHRtbCA9ICc8c3BhbiBjbGFzcz1cIicgKyBjb21taXQuY2hhbmdlQ2xhc3MgKyAnXCI+JyArIGNvbW1pdC50aXRsZSArICc8L3NwYW4+JztcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cbiAgICB9KTtcbiovXG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgV2lraSB7XG5cbiAgdmFyIENyZWF0ZUNvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiQ3JlYXRlQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkcm91dGVcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsICgkc2NvcGUsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXM6bmcucm91dGUuSVJvdXRlUGFyYW1zU2VydmljZSwgJHJvdXRlOm5nLnJvdXRlLklSb3V0ZVNlcnZpY2UsICRodHRwOm5nLklIdHRwU2VydmljZSwgJHRpbWVvdXQ6bmcuSVRpbWVvdXRTZXJ2aWNlKSA9PiB7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cblxuICAgIC8vIFRPRE8gcmVtb3ZlXG4gICAgdmFyIHdvcmtzcGFjZSA9IG51bGw7XG5cbiAgICAkc2NvcGUuY3JlYXRlRG9jdW1lbnRUcmVlID0gV2lraS5jcmVhdGVXaXphcmRUcmVlKHdvcmtzcGFjZSwgJHNjb3BlKTtcbiAgICAkc2NvcGUuY3JlYXRlRG9jdW1lbnRUcmVlQ2hpbGRyZW4gPSAkc2NvcGUuY3JlYXRlRG9jdW1lbnRUcmVlLmNoaWxkcmVuO1xuICAgICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWVBY3RpdmF0aW9ucyA9IFtcImNhbWVsLXNwcmluZy54bWxcIiwgXCJSZWFkTWUubWRcIl07XG5cbiAgICAkc2NvcGUudHJlZU9wdGlvbnMgPSB7XG4gICAgICAgIG5vZGVDaGlsZHJlbjogXCJjaGlsZHJlblwiLFxuICAgICAgICBkaXJTZWxlY3RhYmxlOiB0cnVlLFxuICAgICAgICBpbmplY3RDbGFzc2VzOiB7XG4gICAgICAgICAgICB1bDogXCJhMVwiLFxuICAgICAgICAgICAgbGk6IFwiYTJcIixcbiAgICAgICAgICAgIGxpU2VsZWN0ZWQ6IFwiYTdcIixcbiAgICAgICAgICAgIGlFeHBhbmRlZDogXCJhM1wiLFxuICAgICAgICAgICAgaUNvbGxhcHNlZDogXCJhNFwiLFxuICAgICAgICAgICAgaUxlYWY6IFwiYTVcIixcbiAgICAgICAgICAgIGxhYmVsOiBcImE2XCIsXG4gICAgICAgICAgICBsYWJlbFNlbGVjdGVkOiBcImE4XCJcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZUV4aXN0cyA9IHtcbiAgICAgIGV4aXN0czogZmFsc2UsXG4gICAgICBuYW1lOiBcIlwiXG4gICAgfTtcbiAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gXCJcIjtcbiAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudEV4dGVuc2lvbiA9IG51bGw7XG4gICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gZmFsc2U7XG4gICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IFwiXCI7XG4gICAgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSA9IFwiXCI7XG5cbiAgICBmdW5jdGlvbiByZXR1cm5Ub0RpcmVjdG9yeSgpIHtcbiAgICAgIHZhciBsaW5rID0gV2lraS52aWV3TGluaygkc2NvcGUsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbilcbiAgICAgIGxvZy5kZWJ1ZyhcIkNhbmNlbGxpbmcsIGdvaW5nIHRvIGxpbms6IFwiLCBsaW5rKTtcbiAgICAgIFdpa2kuZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbik7XG4gICAgfVxuXG4gICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIHJldHVyblRvRGlyZWN0b3J5KCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vbkNyZWF0ZURvY3VtZW50U2VsZWN0ID0gKG5vZGUpID0+IHtcbiAgICAgIC8vIHJlc2V0IGFzIHdlIHN3aXRjaCBiZXR3ZWVuIGRvY3VtZW50IHR5cGVzXG4gICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSBmYWxzZTtcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSBcIlwiO1xuICAgICAgdmFyIGVudGl0eSA9IG5vZGUgPyBub2RlLmVudGl0eSA6IG51bGw7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlID0gZW50aXR5O1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZVJlZ2V4ID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZS5yZWdleCB8fCAvLiovO1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUludmFsaWQgPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlLmludmFsaWQgfHwgXCJpbnZhbGlkIG5hbWVcIjtcbiAgICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVFeHRlbnNpb24gPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlLmV4dGVuc2lvbiB8fCBudWxsO1xuICAgICAgbG9nLmRlYnVnKFwiRW50aXR5OiBcIiwgZW50aXR5KTtcbiAgICAgIGlmIChlbnRpdHkpIHtcbiAgICAgICAgaWYgKGVudGl0eS5nZW5lcmF0ZWQpIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybVNjaGVtYSA9IGVudGl0eS5nZW5lcmF0ZWQuc2NoZW1hO1xuICAgICAgICAgICRzY29wZS5mb3JtRGF0YSA9IGVudGl0eS5nZW5lcmF0ZWQuZm9ybSh3b3Jrc3BhY2UsICRzY29wZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1TY2hlbWEgPSB7fTtcbiAgICAgICAgICAkc2NvcGUuZm9ybURhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfVxuXG4gICAgfTtcblxuICAgICRzY29wZS5hZGRBbmRDbG9zZURpYWxvZyA9IChmaWxlTmFtZTpzdHJpbmcpID0+IHtcbiAgICAgICRzY29wZS5uZXdEb2N1bWVudE5hbWUgPSBmaWxlTmFtZTtcbiAgICAgIHZhciB0ZW1wbGF0ZSA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGU7XG4gICAgICB2YXIgcGF0aCA9IGdldE5ld0RvY3VtZW50UGF0aCgpO1xuXG4gICAgICAvLyBjbGVhciAkc2NvcGUubmV3RG9jdW1lbnROYW1lIHNvIHdlIGRvbnQgcmVtZW1iZXIgaXQgd2hlbiB3ZSBvcGVuIGl0IG5leHQgdGltZVxuICAgICAgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSA9IG51bGw7XG5cbiAgICAgIC8vIHJlc2V0IGJlZm9yZSB3ZSBjaGVjayBqdXN0IGluIGEgYml0XG4gICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSBmYWxzZTtcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSBcIlwiO1xuICAgICAgJHNjb3BlLmZpbGVFeHRlbnNpb25JbnZhbGlkID0gbnVsbDtcblxuICAgICAgaWYgKCF0ZW1wbGF0ZSB8fCAhcGF0aCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkYXRlIGlmIHRoZSBuYW1lIG1hdGNoIHRoZSBleHRlbnNpb25cbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlRXh0ZW5zaW9uKSB7XG4gICAgICAgIHZhciBpZHggPSBwYXRoLmxhc3RJbmRleE9mKCcuJyk7XG4gICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgdmFyIGV4dCA9IHBhdGguc3Vic3RyaW5nKGlkeCk7XG4gICAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVFeHRlbnNpb24gIT09IGV4dCkge1xuICAgICAgICAgICAgJHNjb3BlLmZpbGVFeHRlbnNpb25JbnZhbGlkID0gXCJGaWxlIGV4dGVuc2lvbiBtdXN0IGJlOiBcIiArICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVFeHRlbnNpb247XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZGF0ZSBpZiB0aGUgZmlsZSBleGlzdHMsIGFuZCB1c2UgdGhlIHN5bmNocm9ub3VzIGNhbGxcbiAgICAgIHdpa2lSZXBvc2l0b3J5LmV4aXN0cygkc2NvcGUuYnJhbmNoLCBwYXRoLCAoZXhpc3RzKSA9PiB7XG4gICAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGV4aXN0cztcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IGV4aXN0cyA/IHBhdGggOiBmYWxzZTtcbiAgICAgICAgaWYgKCFleGlzdHMpIHtcbiAgICAgICAgICBkb0NyZWF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcblxuICAgICAgZnVuY3Rpb24gZG9DcmVhdGUoKSB7XG4gICAgICAgIHZhciBuYW1lID0gV2lraS5maWxlTmFtZShwYXRoKTtcbiAgICAgICAgdmFyIGZvbGRlciA9IFdpa2kuZmlsZVBhcmVudChwYXRoKTtcbiAgICAgICAgdmFyIGV4ZW1wbGFyID0gdGVtcGxhdGUuZXhlbXBsYXI7XG5cbiAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIkNyZWF0ZWQgXCIgKyB0ZW1wbGF0ZS5sYWJlbDtcbiAgICAgICAgdmFyIGV4ZW1wbGFyVXJpID0gQ29yZS51cmwoXCIvcGx1Z2lucy93aWtpL2V4ZW1wbGFyL1wiICsgZXhlbXBsYXIpO1xuXG4gICAgICAgIGlmICh0ZW1wbGF0ZS5mb2xkZXIpIHtcbiAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJDcmVhdGluZyBuZXcgZm9sZGVyIFwiICsgbmFtZSk7XG5cbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5jcmVhdGVEaXJlY3RvcnkoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgdmFyIGxpbmsgPSBXaWtpLnZpZXdMaW5rKCRzY29wZSwgcGF0aCwgJGxvY2F0aW9uKTtcbiAgICAgICAgICAgIGdvVG9MaW5rKGxpbmssICR0aW1lb3V0LCAkbG9jYXRpb24pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlLnByb2ZpbGUpIHtcblxuICAgICAgICAgIGZ1bmN0aW9uIHRvUGF0aChwcm9maWxlTmFtZTpzdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBhbnN3ZXIgPSBcImZhYnJpYy9wcm9maWxlcy9cIiArIHByb2ZpbGVOYW1lO1xuICAgICAgICAgICAgYW5zd2VyID0gYW5zd2VyLnJlcGxhY2UoLy0vZywgXCIvXCIpO1xuICAgICAgICAgICAgYW5zd2VyID0gYW5zd2VyICsgXCIucHJvZmlsZVwiO1xuICAgICAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmdW5jdGlvbiB0b1Byb2ZpbGVOYW1lKHBhdGg6c3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgYW5zd2VyID0gcGF0aC5yZXBsYWNlKC9eZmFicmljXFwvcHJvZmlsZXNcXC8vLCBcIlwiKTtcbiAgICAgICAgICAgIGFuc3dlciA9IGFuc3dlci5yZXBsYWNlKC9cXC8vZywgXCItXCIpO1xuICAgICAgICAgICAgYW5zd2VyID0gYW5zd2VyLnJlcGxhY2UoL1xcLnByb2ZpbGUkLywgXCJcIik7XG4gICAgICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHN0cmlwIG9mZiBhbnkgcHJvZmlsZSBuYW1lIGluIGNhc2UgdGhlIHVzZXIgY3JlYXRlcyBhIHByb2ZpbGUgd2hpbGUgbG9va2luZyBhdFxuICAgICAgICAgIC8vIGFub3RoZXIgcHJvZmlsZVxuICAgICAgICAgIGZvbGRlciA9IGZvbGRlci5yZXBsYWNlKC9cXC89PyhcXHcqKVxcLnByb2ZpbGUkLywgXCJcIik7XG5cbiAgICAgICAgICB2YXIgY29uY2F0ZW5hdGVkID0gZm9sZGVyICsgXCIvXCIgKyBuYW1lO1xuXG4gICAgICAgICAgdmFyIHByb2ZpbGVOYW1lID0gdG9Qcm9maWxlTmFtZShjb25jYXRlbmF0ZWQpO1xuICAgICAgICAgIHZhciB0YXJnZXRQYXRoID0gdG9QYXRoKHByb2ZpbGVOYW1lKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlLmdlbmVyYXRlZCkge1xuICAgICAgICAgIHZhciBvcHRpb25zOldpa2kuR2VuZXJhdGVPcHRpb25zID0ge1xuICAgICAgICAgICAgd29ya3NwYWNlOiB3b3Jrc3BhY2UsXG4gICAgICAgICAgICBmb3JtOiAkc2NvcGUuZm9ybURhdGEsXG4gICAgICAgICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgICAgICAgIHBhcmVudElkOiBmb2xkZXIsXG4gICAgICAgICAgICBicmFuY2g6ICRzY29wZS5icmFuY2gsXG4gICAgICAgICAgICBzdWNjZXNzOiAoY29udGVudHMpPT4ge1xuICAgICAgICAgICAgICBpZiAoY29udGVudHMpIHtcbiAgICAgICAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5wdXRQYWdlKCRzY29wZS5icmFuY2gsIHBhdGgsIGNvbnRlbnRzLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICAgICAgICBsb2cuZGVidWcoXCJDcmVhdGVkIGZpbGUgXCIgKyBuYW1lKTtcbiAgICAgICAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShzdGF0dXMpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuVG9EaXJlY3RvcnkoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm5Ub0RpcmVjdG9yeSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IChlcnJvcik9PiB7XG4gICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdlcnJvcicsIGVycm9yKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICAgIHRlbXBsYXRlLmdlbmVyYXRlZC5nZW5lcmF0ZShvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBsb2FkIHRoZSBleGFtcGxlIGRhdGEgKGlmIGFueSkgYW5kIHRoZW4gYWRkIHRoZSBkb2N1bWVudCB0byBnaXQgYW5kIGNoYW5nZSB0aGUgbGluayB0byB0aGUgbmV3IGRvY3VtZW50XG4gICAgICAgICAgJGh0dHAuZ2V0KGV4ZW1wbGFyVXJpKVxuICAgICAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgIHB1dFBhZ2UocGF0aCwgbmFtZSwgZm9sZGVyLCBkYXRhLCBjb21taXRNZXNzYWdlKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgIC8vIGNyZWF0ZSBhbiBlbXB0eSBmaWxlXG4gICAgICAgICAgICAgIHB1dFBhZ2UocGF0aCwgbmFtZSwgZm9sZGVyLCBcIlwiLCBjb21taXRNZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHB1dFBhZ2UocGF0aCwgbmFtZSwgZm9sZGVyLCBjb250ZW50cywgY29tbWl0TWVzc2FnZSkge1xuICAgICAgLy8gVE9ETyBsZXRzIGNoZWNrIHRoaXMgcGFnZSBkb2VzIG5vdCBleGlzdCAtIGlmIGl0IGRvZXMgbGV0cyBrZWVwIGFkZGluZyBhIG5ldyBwb3N0IGZpeC4uLlxuICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb250ZW50cywgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICBsb2cuZGVidWcoXCJDcmVhdGVkIGZpbGUgXCIgKyBuYW1lKTtcbiAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG5cbiAgICAgICAgLy8gbGV0cyBuYXZpZ2F0ZSB0byB0aGUgZWRpdCBsaW5rXG4gICAgICAgIC8vIGxvYWQgdGhlIGRpcmVjdG9yeSBhbmQgZmluZCB0aGUgY2hpbGQgaXRlbVxuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb2xkZXIsICRzY29wZS5vYmplY3RJZCwgKGRldGFpbHMpID0+IHtcbiAgICAgICAgICAvLyBsZXRzIGZpbmQgdGhlIGNoaWxkIGVudHJ5IHNvIHdlIGNhbiBjYWxjdWxhdGUgaXRzIGNvcnJlY3QgZWRpdCBsaW5rXG4gICAgICAgICAgdmFyIGxpbms6c3RyaW5nID0gbnVsbDtcbiAgICAgICAgICBpZiAoZGV0YWlscyAmJiBkZXRhaWxzLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJzY2FubmVkIHRoZSBkaXJlY3RvcnkgXCIgKyBkZXRhaWxzLmNoaWxkcmVuLmxlbmd0aCArIFwiIGNoaWxkcmVuXCIpO1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gZGV0YWlscy5jaGlsZHJlbi5maW5kKGMgPT4gYy5uYW1lID09PSBmaWxlTmFtZSk7XG4gICAgICAgICAgICBpZiAoY2hpbGQpIHtcbiAgICAgICAgICAgICAgbGluayA9ICRzY29wZS5jaGlsZExpbmsoY2hpbGQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9nLmRlYnVnKFwiQ291bGQgbm90IGZpbmQgbmFtZSAnXCIgKyBmaWxlTmFtZSArIFwiJyBpbiB0aGUgbGlzdCBvZiBmaWxlIG5hbWVzIFwiICsgSlNPTi5zdHJpbmdpZnkoZGV0YWlscy5jaGlsZHJlbi5tYXAoYyA9PiBjLm5hbWUpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghbGluaykge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiV0FSTklORzogY291bGQgbm90IGZpbmQgdGhlIGNoaWxkTGluayBzbyByZXZlcnRpbmcgdG8gdGhlIHdpa2kgZWRpdCBwYWdlIVwiKTtcbiAgICAgICAgICAgIGxpbmsgPSBXaWtpLmVkaXRMaW5rKCRzY29wZSwgcGF0aCwgJGxvY2F0aW9uKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy9Db3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIGdvVG9MaW5rKGxpbmssICR0aW1lb3V0LCAkbG9jYXRpb24pO1xuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TmV3RG9jdW1lbnRQYXRoKCkge1xuICAgICAgdmFyIHRlbXBsYXRlID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZTtcbiAgICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gdGVtcGxhdGUgc2VsZWN0ZWQuXCIpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHZhciBleGVtcGxhciA9IHRlbXBsYXRlLmV4ZW1wbGFyIHx8IFwiXCI7XG4gICAgICB2YXIgbmFtZTpzdHJpbmcgPSAkc2NvcGUubmV3RG9jdW1lbnROYW1lIHx8IGV4ZW1wbGFyO1xuXG4gICAgICBpZiAobmFtZS5pbmRleE9mKCcuJykgPCAwKSB7XG4gICAgICAgIC8vIGxldHMgYWRkIHRoZSBmaWxlIGV4dGVuc2lvbiBmcm9tIHRoZSBleGVtcGxhclxuICAgICAgICB2YXIgaWR4ID0gZXhlbXBsYXIubGFzdEluZGV4T2YoXCIuXCIpO1xuICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgIG5hbWUgKz0gZXhlbXBsYXIuc3Vic3RyaW5nKGlkeCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gbGV0cyBkZWFsIHdpdGggZGlyZWN0b3JpZXMgaW4gdGhlIG5hbWVcbiAgICAgIHZhciBmb2xkZXI6c3RyaW5nID0gJHNjb3BlLnBhZ2VJZDtcbiAgICAgIGlmICgkc2NvcGUuaXNGaWxlKSB7XG4gICAgICAgIC8vIGlmIHdlIGFyZSBhIGZpbGUgbGV0cyBkaXNjYXJkIHRoZSBsYXN0IHBhcnQgb2YgdGhlIHBhdGhcbiAgICAgICAgdmFyIGlkeDphbnkgPSBmb2xkZXIubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgICBpZiAoaWR4IDw9IDApIHtcbiAgICAgICAgICBmb2xkZXIgPSBcIlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvbGRlciA9IGZvbGRlci5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIGlkeDphbnkgPSBuYW1lLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIGZvbGRlciArPSBcIi9cIiArIG5hbWUuc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgIH1cbiAgICAgIGZvbGRlciA9IENvcmUudHJpbUxlYWRpbmcoZm9sZGVyLCBcIi9cIik7XG4gICAgICByZXR1cm4gZm9sZGVyICsgKGZvbGRlciA/IFwiL1wiIDogXCJcIikgKyBuYW1lO1xuICAgIH1cblxuICB9XSk7XG5cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuRWRpdENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgPT4ge1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgJHNjb3BlLmJyZWFkY3J1bWJDb25maWcucHVzaChjcmVhdGVFZGl0aW5nQnJlYWRjcnVtYigkc2NvcGUpKTtcblxuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5lbnRpdHkgPSB7XG4gICAgICBzb3VyY2U6IG51bGxcbiAgICB9O1xuXG4gICAgdmFyIGZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdCgkc2NvcGUucGFnZUlkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KTtcbiAgICB2YXIgZm9ybSA9IG51bGw7XG4gICAgaWYgKChmb3JtYXQgJiYgZm9ybWF0ID09PSBcImphdmFzY3JpcHRcIikgfHwgaXNDcmVhdGUoKSkge1xuICAgICAgZm9ybSA9ICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl07XG4gICAgfVxuXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICBtb2RlOiB7XG4gICAgICAgIG5hbWU6IGZvcm1hdFxuICAgICAgfVxuICAgIH07XG4gICAgJHNjb3BlLmNvZGVNaXJyb3JPcHRpb25zID0gQ29kZUVkaXRvci5jcmVhdGVFZGl0b3JTZXR0aW5ncyhvcHRpb25zKTtcbiAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcblxuXG4gICAgJHNjb3BlLmlzVmFsaWQgPSAoKSA9PiAkc2NvcGUuZmlsZU5hbWU7XG5cbiAgICAkc2NvcGUuY2FuU2F2ZSA9ICgpID0+ICEkc2NvcGUubW9kaWZpZWQ7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdlbnRpdHkuc291cmNlJywgKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgPT4ge1xuICAgICAgJHNjb3BlLm1vZGlmaWVkID0gbmV3VmFsdWUgJiYgb2xkVmFsdWUgJiYgbmV3VmFsdWUgIT09IG9sZFZhbHVlO1xuICAgIH0sIHRydWUpO1xuXG4gICAgbG9nLmRlYnVnKFwicGF0aDogXCIsICRzY29wZS5wYXRoKTtcblxuICAgICRzY29wZS4kd2F0Y2goJ21vZGlmaWVkJywgKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgPT4ge1xuICAgICAgbG9nLmRlYnVnKFwibW9kaWZpZWQ6IFwiLCBuZXdWYWx1ZSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUudmlld0xpbmsgPSAoKSA9PiBXaWtpLnZpZXdMaW5rKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uLCAkc2NvcGUuZmlsZU5hbWUpO1xuXG4gICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIGdvVG9WaWV3KCk7XG4gICAgfTtcblxuICAgICRzY29wZS5zYXZlID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5tb2RpZmllZCAmJiAkc2NvcGUuZmlsZU5hbWUpIHtcbiAgICAgICAgc2F2ZVRvKCRzY29wZVtcInBhZ2VJZFwiXSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jcmVhdGUgPSAoKSA9PiB7XG4gICAgICAvLyBsZXRzIGNvbWJpbmUgdGhlIGZpbGUgbmFtZSB3aXRoIHRoZSBjdXJyZW50IHBhZ2VJZCAod2hpY2ggaXMgdGhlIGRpcmVjdG9yeSlcbiAgICAgIHZhciBwYXRoID0gJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgJHNjb3BlLmZpbGVOYW1lO1xuICAgICAgbG9nLmRlYnVnKFwiY3JlYXRpbmcgbmV3IGZpbGUgYXQgXCIgKyBwYXRoKTtcbiAgICAgIHNhdmVUbyhwYXRoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uU3VibWl0ID0gKGpzb24sIGZvcm0pID0+IHtcbiAgICAgIGlmIChpc0NyZWF0ZSgpKSB7XG4gICAgICAgICRzY29wZS5jcmVhdGUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5zYXZlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5vbkNhbmNlbCA9IChmb3JtKSA9PiB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgZ29Ub1ZpZXcoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKVxuICAgICAgfSwgNTApO1xuICAgIH07XG5cblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIGlzQ3JlYXRlKCkge1xuICAgICAgcmV0dXJuICRsb2NhdGlvbi5wYXRoKCkuc3RhcnRzV2l0aChcIi93aWtpL2NyZWF0ZVwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgLy8gb25seSBsb2FkIHRoZSBzb3VyY2UgaWYgbm90IGluIGNyZWF0ZSBtb2RlXG4gICAgICBpZiAoaXNDcmVhdGUoKSkge1xuICAgICAgICB1cGRhdGVTb3VyY2VWaWV3KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJHZXR0aW5nIHBhZ2UsIGJyYW5jaDogXCIsICRzY29wZS5icmFuY2gsIFwiIHBhZ2VJZDogXCIsICRzY29wZS5wYWdlSWQsIFwiIG9iamVjdElkOiBcIiwgJHNjb3BlLm9iamVjdElkKTtcbiAgICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCAkc2NvcGUub2JqZWN0SWQsIG9uRmlsZUNvbnRlbnRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZpbGVDb250ZW50cyhkZXRhaWxzKSB7XG4gICAgICB2YXIgY29udGVudHMgPSBkZXRhaWxzLnRleHQ7XG4gICAgICAkc2NvcGUuZW50aXR5LnNvdXJjZSA9IGNvbnRlbnRzO1xuICAgICAgJHNjb3BlLmZpbGVOYW1lID0gJHNjb3BlLnBhZ2VJZC5zcGxpdCgnLycpLmxhc3QoKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImZpbGUgbmFtZTogXCIsICRzY29wZS5maWxlTmFtZSk7XG4gICAgICBsb2cuZGVidWcoXCJmaWxlIGRldGFpbHM6IFwiLCBkZXRhaWxzKTtcbiAgICAgIHVwZGF0ZVNvdXJjZVZpZXcoKTtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlU291cmNlVmlldygpIHtcbiAgICAgIGlmIChmb3JtKSB7XG4gICAgICAgIGlmIChpc0NyZWF0ZSgpKSB7XG4gICAgICAgICAgLy8gbGV0cyBkZWZhdWx0IGEgZmlsZSBuYW1lXG4gICAgICAgICAgaWYgKCEkc2NvcGUuZmlsZU5hbWUpIHtcbiAgICAgICAgICAgICRzY29wZS5maWxlTmFtZSA9IFwiXCIgKyBDb3JlLmdldFVVSUQoKSArIFwiLmpzb25cIjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gbm93IGxldHMgdHJ5IGxvYWQgdGhlIGZvcm0gZGVmaW50aW9uIEpTT04gc28gd2UgY2FuIHRoZW4gcmVuZGVyIHRoZSBmb3JtXG4gICAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgZm9ybSwgJHNjb3BlLm9iamVjdElkLCAoZGV0YWlscykgPT4ge1xuICAgICAgICAgIG9uRm9ybVNjaGVtYShXaWtpLnBhcnNlSnNvbihkZXRhaWxzLnRleHQpKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvc291cmNlRWRpdC5odG1sXCI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Gb3JtU2NoZW1hKGpzb24pIHtcbiAgICAgICRzY29wZS5mb3JtRGVmaW5pdGlvbiA9IGpzb247XG4gICAgICBpZiAoJHNjb3BlLmVudGl0eS5zb3VyY2UpIHtcbiAgICAgICAgJHNjb3BlLmZvcm1FbnRpdHkgPSBXaWtpLnBhcnNlSnNvbigkc2NvcGUuZW50aXR5LnNvdXJjZSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvZm9ybUVkaXQuaHRtbFwiO1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnb1RvVmlldygpIHtcbiAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZygkc2NvcGUudmlld0xpbmsoKSwgXCIjXCIpO1xuICAgICAgbG9nLmRlYnVnKFwiZ29pbmcgdG8gdmlldyBcIiArIHBhdGgpO1xuICAgICAgJGxvY2F0aW9uLnBhdGgoV2lraS5kZWNvZGVQYXRoKHBhdGgpKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImxvY2F0aW9uIGlzIG5vdyBcIiArICRsb2NhdGlvbi5wYXRoKCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNhdmVUbyhwYXRoOnN0cmluZykge1xuICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSAkc2NvcGUuY29tbWl0TWVzc2FnZSB8fCBcIlVwZGF0ZWQgcGFnZSBcIiArICRzY29wZS5wYWdlSWQ7XG4gICAgICB2YXIgY29udGVudHMgPSAkc2NvcGUuZW50aXR5LnNvdXJjZTtcbiAgICAgIGlmICgkc2NvcGUuZm9ybUVudGl0eSkge1xuICAgICAgICBjb250ZW50cyA9IEpTT04uc3RyaW5naWZ5KCRzY29wZS5mb3JtRW50aXR5LCBudWxsLCBcIiAgXCIpO1xuICAgICAgfVxuICAgICAgbG9nLmRlYnVnKFwiU2F2aW5nIGZpbGUsIGJyYW5jaDogXCIsICRzY29wZS5icmFuY2gsIFwiIHBhdGg6IFwiLCAkc2NvcGUucGF0aCk7XG4gICAgICAvL2xvZy5kZWJ1ZyhcIkFib3V0IHRvIHdyaXRlIGNvbnRlbnRzICdcIiArIGNvbnRlbnRzICsgXCInXCIpO1xuICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb250ZW50cywgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG4gICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIlNhdmVkIFwiICsgcGF0aCk7XG4gICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLy8gY29udHJvbGxlciBmb3IgaGFuZGxpbmcgZmlsZSBkcm9wc1xuICBleHBvcnQgdmFyIEZpbGVEcm9wQ29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuRmlsZURyb3BDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIkZpbGVVcGxvYWRlclwiLCBcIiRyb3V0ZVwiLCBcIiR0aW1lb3V0XCIsIFwidXNlckRldGFpbHNcIiwgKCRzY29wZSwgRmlsZVVwbG9hZGVyLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJHRpbWVvdXQ6bmcuSVRpbWVvdXRTZXJ2aWNlLCB1c2VyRGV0YWlsczpDb3JlLlVzZXJEZXRhaWxzKSA9PiB7XG5cblxuICAgIHZhciB1cGxvYWRVUkkgPSBXaWtpLmdpdFJlc3RVUkwoJHNjb3BlLCAkc2NvcGUucGFnZUlkKSArICcvJztcbiAgICB2YXIgdXBsb2FkZXIgPSAkc2NvcGUudXBsb2FkZXIgPSBuZXcgRmlsZVVwbG9hZGVyKHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBDb3JlLmF1dGhIZWFkZXJWYWx1ZSh1c2VyRGV0YWlscylcbiAgICAgIH0sXG4gICAgICBhdXRvVXBsb2FkOiB0cnVlLFxuICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlLFxuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICB1cmw6IHVwbG9hZFVSSVxuICAgIH0pO1xuICAgICRzY29wZS5kb1VwbG9hZCA9ICgpID0+IHtcbiAgICAgIHVwbG9hZGVyLnVwbG9hZEFsbCgpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25XaGVuQWRkaW5nRmlsZUZhaWxlZCA9IGZ1bmN0aW9uIChpdGVtIC8qe0ZpbGV8RmlsZUxpa2VPYmplY3R9Ki8sIGZpbHRlciwgb3B0aW9ucykge1xuICAgICAgbG9nLmRlYnVnKCdvbldoZW5BZGRpbmdGaWxlRmFpbGVkJywgaXRlbSwgZmlsdGVyLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQWZ0ZXJBZGRpbmdGaWxlID0gZnVuY3Rpb24gKGZpbGVJdGVtKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQWZ0ZXJBZGRpbmdGaWxlJywgZmlsZUl0ZW0pO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25BZnRlckFkZGluZ0FsbCA9IGZ1bmN0aW9uIChhZGRlZEZpbGVJdGVtcykge1xuICAgICAgbG9nLmRlYnVnKCdvbkFmdGVyQWRkaW5nQWxsJywgYWRkZWRGaWxlSXRlbXMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25CZWZvcmVVcGxvYWRJdGVtID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIGlmICgnZmlsZScgaW4gaXRlbSkge1xuICAgICAgICBpdGVtLmZpbGVTaXplTUIgPSAoaXRlbS5maWxlLnNpemUgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCgyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGl0ZW0uZmlsZVNpemVNQiA9IDA7XG4gICAgICB9XG4gICAgICAvL2l0ZW0udXJsID0gVXJsSGVscGVycy5qb2luKHVwbG9hZFVSSSwgaXRlbS5maWxlLm5hbWUpO1xuICAgICAgaXRlbS51cmwgPSB1cGxvYWRVUkk7XG4gICAgICBsb2cuaW5mbyhcIkxvYWRpbmcgZmlsZXMgdG8gXCIgKyB1cGxvYWRVUkkpO1xuICAgICAgbG9nLmRlYnVnKCdvbkJlZm9yZVVwbG9hZEl0ZW0nLCBpdGVtKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uUHJvZ3Jlc3NJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCBwcm9ncmVzcykge1xuICAgICAgbG9nLmRlYnVnKCdvblByb2dyZXNzSXRlbScsIGZpbGVJdGVtLCBwcm9ncmVzcyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vblByb2dyZXNzQWxsID0gZnVuY3Rpb24gKHByb2dyZXNzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uUHJvZ3Jlc3NBbGwnLCBwcm9ncmVzcyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vblN1Y2Nlc3NJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uU3VjY2Vzc0l0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkVycm9ySXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvbkVycm9ySXRlbScsIGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQ2FuY2VsSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvbkNhbmNlbEl0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkNvbXBsZXRlSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvbkNvbXBsZXRlSXRlbScsIGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQ29tcGxldGVBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQ29tcGxldGVBbGwnKTtcbiAgICAgIHVwbG9hZGVyLmNsZWFyUXVldWUoKTtcbiAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oXCJDb21wbGV0ZWQgYWxsIHVwbG9hZHMuIExldHMgZm9yY2UgYSByZWxvYWRcIik7XG4gICAgICAgICRyb3V0ZS5yZWxvYWQoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0sIDIwMCk7XG4gICAgfTtcbiAgfV0pO1xuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuRm9ybVRhYmxlQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpID0+IHtcbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuY29sdW1uRGVmcyA9IFtdO1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgIGRhdGE6ICdsaXN0JyxcbiAgICAgICBkaXNwbGF5Rm9vdGVyOiBmYWxzZSxcbiAgICAgICBzaG93RmlsdGVyOiBmYWxzZSxcbiAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICBmaWx0ZXJUZXh0OiAnJ1xuICAgICAgIH0sXG4gICAgICAgY29sdW1uRGVmczogJHNjb3BlLmNvbHVtbkRlZnNcbiAgICAgfTtcblxuXG4gICAgJHNjb3BlLnZpZXdMaW5rID0gKHJvdykgPT4ge1xuICAgICAgcmV0dXJuIGNoaWxkTGluayhyb3csIFwiL3ZpZXdcIik7XG4gICAgfTtcbiAgICAkc2NvcGUuZWRpdExpbmsgPSAocm93KSA9PiB7XG4gICAgICByZXR1cm4gY2hpbGRMaW5rKHJvdywgXCIvZWRpdFwiKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY2hpbGRMaW5rKGNoaWxkLCBwcmVmaXgpIHtcbiAgICAgIHZhciBzdGFydCA9IFdpa2kuc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgY2hpbGRJZCA9IChjaGlsZCkgPyBjaGlsZFtcIl9pZFwiXSB8fCBcIlwiIDogXCJcIjtcbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBzdGFydCArIHByZWZpeCArIFwiL1wiICsgJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgY2hpbGRJZCk7XG4gICAgfVxuXG4gICAgdmFyIGxpbmtzQ29sdW1uID0ge1xuICAgICAgZmllbGQ6ICdfaWQnLFxuICAgICAgZGlzcGxheU5hbWU6ICdBY3Rpb25zJyxcbiAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0XCJcIj48YSBuZy1ocmVmPVwie3t2aWV3TGluayhyb3cuZW50aXR5KX19XCIgY2xhc3M9XCJidG5cIj5WaWV3PC9hPiA8YSBuZy1ocmVmPVwie3tlZGl0TGluayhyb3cuZW50aXR5KX19XCIgY2xhc3M9XCJidG5cIj5FZGl0PC9hPjwvZGl2PidcbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgdmFyIGZvcm0gPSAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdO1xuICAgIGlmIChmb3JtKSB7XG4gICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvcm0sICRzY29wZS5vYmplY3RJZCwgb25Gb3JtRGF0YSk7XG4gICAgfVxuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gb25SZXN1bHRzKHJlc3BvbnNlKSB7XG4gICAgICB2YXIgbGlzdCA9IFtdO1xuICAgICAgdmFyIG1hcCA9IFdpa2kucGFyc2VKc29uKHJlc3BvbnNlKTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChtYXAsICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIHZhbHVlW1wiX2lkXCJdID0ga2V5O1xuICAgICAgICBsaXN0LnB1c2godmFsdWUpO1xuICAgICAgfSk7XG4gICAgICAkc2NvcGUubGlzdCA9IGxpc3Q7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICB2YXIgZmlsdGVyID0gQ29yZS5wYXRoR2V0KCRzY29wZSwgW1wiZ3JpZE9wdGlvbnNcIiwgXCJmaWx0ZXJPcHRpb25zXCIsIFwiZmlsdGVyVGV4dFwiXSkgfHwgXCJcIjtcbiAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5qc29uQ2hpbGRDb250ZW50cygkc2NvcGUucGFnZUlkLCBcIiouanNvblwiLCBmaWx0ZXIsIG9uUmVzdWx0cyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Gb3JtRGF0YShkZXRhaWxzKSB7XG4gICAgICB2YXIgdGV4dCA9IGRldGFpbHMudGV4dDtcbiAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICRzY29wZS5mb3JtRGVmaW5pdGlvbiA9IFdpa2kucGFyc2VKc29uKHRleHQpO1xuXG4gICAgICAgIHZhciBjb2x1bW5EZWZzID0gW107XG4gICAgICAgIHZhciBzY2hlbWEgPSAkc2NvcGUuZm9ybURlZmluaXRpb247XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWEucHJvcGVydGllcywgKHByb3BlcnR5LCBuYW1lKSA9PiB7XG4gICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgIGlmICghRm9ybXMuaXNBcnJheU9yTmVzdGVkT2JqZWN0KHByb3BlcnR5LCBzY2hlbWEpKSB7XG4gICAgICAgICAgICAgIHZhciBjb2xEZWYgPSB7XG4gICAgICAgICAgICAgICAgZmllbGQ6IG5hbWUsXG4gICAgICAgICAgICAgICAgZGlzcGxheU5hbWU6IHByb3BlcnR5LmRlc2NyaXB0aW9uIHx8IG5hbWUsXG4gICAgICAgICAgICAgICAgdmlzaWJsZTogdHJ1ZVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjb2x1bW5EZWZzLnB1c2goY29sRGVmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjb2x1bW5EZWZzLnB1c2gobGlua3NDb2x1bW4pO1xuXG4gICAgICAgICRzY29wZS5jb2x1bW5EZWZzID0gY29sdW1uRGVmcztcbiAgICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLmNvbHVtbkRlZnMgPSBjb2x1bW5EZWZzO1xuXG4gICAgICAgIC8vIG5vdyB3ZSBoYXZlIHRoZSBncmlkIGNvbHVtbiBzdHVmZiBsb2FkZWQsIGxldHMgbG9hZCB0aGUgZGF0YXRhYmxlXG4gICAgICAgICRzY29wZS50YWJsZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL2Zvcm1UYWJsZURhdGF0YWJsZS5odG1sXCI7XG4gICAgICB9XG4gICAgfVxuICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG4gbW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkdpdFByZWZlcmVuY2VzXCIsIFtcIiRzY29wZVwiLCBcImxvY2FsU3RvcmFnZVwiLCBcInVzZXJEZXRhaWxzXCIsICgkc2NvcGUsIGxvY2FsU3RvcmFnZSwgdXNlckRldGFpbHMpID0+IHtcblxuICAgIHZhciBjb25maWcgPSB7XG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGdpdFVzZXJOYW1lOiB7XG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgbGFiZWw6ICdVc2VybmFtZScsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgdXNlciBuYW1lIHRvIGJlIHVzZWQgd2hlbiBtYWtpbmcgY2hhbmdlcyB0byBmaWxlcyB3aXRoIHRoZSBzb3VyY2UgY29udHJvbCBzeXN0ZW0nXG4gICAgICAgIH0sXG4gICAgICAgIGdpdFVzZXJFbWFpbDoge1xuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGxhYmVsOiAnRW1haWwnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGVtYWlsIGFkZHJlc3MgdG8gdXNlIHdoZW4gbWFraW5nIGNoYW5nZXMgdG8gZmlsZXMgd2l0aCB0aGUgc291cmNlIGNvbnRyb2wgc3lzdGVtJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5lbnRpdHkgPSAkc2NvcGU7XG4gICAgJHNjb3BlLmNvbmZpZyA9IGNvbmZpZztcblxuICAgIENvcmUuaW5pdFByZWZlcmVuY2VTY29wZSgkc2NvcGUsIGxvY2FsU3RvcmFnZSwge1xuICAgICAgJ2dpdFVzZXJOYW1lJzoge1xuICAgICAgICAndmFsdWUnOiB1c2VyRGV0YWlscy51c2VybmFtZSB8fCBcIlwiXG4gICAgICB9LFxuICAgICAgJ2dpdFVzZXJFbWFpbCc6IHtcbiAgICAgICAgJ3ZhbHVlJzogJydcbiAgICAgIH0gIFxuICAgIH0pO1xuICB9XSk7XG4gfVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkhpc3RvcnlDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwibWFya2VkXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsICR0ZW1wbGF0ZUNhY2hlLCBtYXJrZWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpID0+IHtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuICAgIHZhciBqb2xva2lhID0gbnVsbDtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgIC8vIFRPRE8gd2UgY291bGQgY29uZmlndXJlIHRoaXM/XG4gICAgJHNjb3BlLmRhdGVGb3JtYXQgPSAnRUVFLCBNTU0gZCwgeSBhdCBISDptbTpzcyBaJztcbiAgICAvLyd5eXl5LU1NLWRkIEhIOm1tOnNzIFonXG5cbiAgICAkc2NvcGUuZ3JpZE9wdGlvbnMgPSB7XG4gICAgICBkYXRhOiAnbG9ncycsXG4gICAgICBzaG93RmlsdGVyOiBmYWxzZSxcbiAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgIG11bHRpU2VsZWN0OiB0cnVlLFxuICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBkaXNwbGF5U2VsZWN0aW9uQ2hlY2tib3ggOiB0cnVlLCAvLyBvbGQgcHJlIDIuMCBjb25maWchXG4gICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgIGZpbHRlclRleHQ6ICcnXG4gICAgICB9LFxuICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICckZGF0ZScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdNb2RpZmllZCcsXG4gICAgICAgICAgZGVmYXVsdFNvcnQ6IHRydWUsXG4gICAgICAgICAgYXNjZW5kaW5nOiBmYWxzZSxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dCB0ZXh0LW5vd3JhcFwiIHRpdGxlPVwie3tyb3cuZW50aXR5LiRkYXRlIHwgZGF0ZTpcXCdFRUUsIE1NTSBkLCB5eXl5IDogSEg6bW06c3MgWlxcJ319XCI+e3tyb3cuZW50aXR5LiRkYXRlLnJlbGF0aXZlKCl9fTwvZGl2PicsXG4gICAgICAgICAgd2lkdGg6IFwiKipcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdzaGEnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnQ2hhbmdlJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dCB0ZXh0LW5vd3JhcFwiPjxhIGNsYXNzPVwiY29tbWl0LWxpbmtcIiBuZy1ocmVmPVwie3tyb3cuZW50aXR5LmNvbW1pdExpbmt9fXt7aGFzaH19XCIgdGl0bGU9XCJ7e3Jvdy5lbnRpdHkuc2hhfX1cIj57e3Jvdy5lbnRpdHkuc2hhIHwgbGltaXRUbzo3fX0gPGkgY2xhc3M9XCJmYSBmYS1hcnJvdy1jaXJjbGUtcmlnaHRcIj48L2k+PC9hPjwvZGl2PicsXG4gICAgICAgICAgY2VsbEZpbHRlcjogXCJcIixcbiAgICAgICAgICB3aWR0aDogXCIqXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnYXV0aG9yJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ0F1dGhvcicsXG4gICAgICAgICAgY2VsbEZpbHRlcjogXCJcIixcbiAgICAgICAgICB3aWR0aDogXCIqKlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ3Nob3J0X21lc3NhZ2UnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTWVzc2FnZScsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cIm5nQ2VsbFRleHQgdGV4dC1ub3dyYXBcIiB0aXRsZT1cInt7cm93LmVudGl0eS5zaG9ydF9tZXNzYWdlfX1cIj57e3Jvdy5lbnRpdHkuc2hvcnRfbWVzc2FnZX19PC9kaXY+JyxcbiAgICAgICAgICB3aWR0aDogXCIqKioqXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuY2FuUmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIHJldHVybiBzZWxlY3RlZEl0ZW1zLmxlbmd0aCA9PT0gMSAmJiBzZWxlY3RlZEl0ZW1zWzBdICE9PSAkc2NvcGUubG9nc1swXTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJldmVydCA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBvYmplY3RJZCA9IHNlbGVjdGVkSXRlbXNbMF0uc2hhO1xuICAgICAgICBpZiAob2JqZWN0SWQpIHtcbiAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9IFwiUmV2ZXJ0aW5nIGZpbGUgXCIgKyAkc2NvcGUucGFnZUlkICsgXCIgdG8gcHJldmlvdXMgdmVyc2lvbiBcIiArIG9iamVjdElkO1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnJldmVydFRvKCRzY29wZS5icmFuY2gsIG9iamVjdElkLCAkc2NvcGUucGFnZUlkLCBjb21taXRNZXNzYWdlLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUocmVzdWx0KTtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHVwZGF0ZSB0aGUgdmlld1xuICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oJ3N1Y2Nlc3MnLCBcIlN1Y2Nlc3NmdWxseSByZXZlcnRlZCBcIiArICRzY29wZS5wYWdlSWQpO1xuICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHNlbGVjdGVkSXRlbXMuc3BsaWNlKDAsIHNlbGVjdGVkSXRlbXMubGVuZ3RoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRpZmYgPSAoKSA9PiB7XG4gICAgICB2YXIgZGVmYXVsdFZhbHVlID0gXCIgXCI7XG4gICAgICB2YXIgb2JqZWN0SWQgPSBkZWZhdWx0VmFsdWU7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICBvYmplY3RJZCA9IHNlbGVjdGVkSXRlbXNbMF0uc2hhIHx8IGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIHZhciBiYXNlT2JqZWN0SWQgPSBkZWZhdWx0VmFsdWU7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGJhc2VPYmplY3RJZCA9IHNlbGVjdGVkSXRlbXNbMV0uc2hhIHx8ZGVmYXVsdFZhbHVlO1xuICAgICAgICAvLyBtYWtlIHRoZSBvYmplY3RJZCAodGhlIG9uZSB0aGF0IHdpbGwgc3RhcnQgd2l0aCBiLyBwYXRoKSBhbHdheXMgbmV3ZXIgdGhhbiBiYXNlT2JqZWN0SWRcbiAgICAgICAgaWYgKHNlbGVjdGVkSXRlbXNbMF0uZGF0ZSA8IHNlbGVjdGVkSXRlbXNbMV0uZGF0ZSkge1xuICAgICAgICAgIHZhciBfID0gYmFzZU9iamVjdElkO1xuICAgICAgICAgIGJhc2VPYmplY3RJZCA9IG9iamVjdElkO1xuICAgICAgICAgIG9iamVjdElkID0gXztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIGxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArIFwiL2RpZmYvXCIgKyBvYmplY3RJZCArIFwiL1wiICsgYmFzZU9iamVjdElkICsgXCIvXCIgKyAkc2NvcGUucGFnZUlkO1xuICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiI1wiKTtcbiAgICAgICRsb2NhdGlvbi5wYXRoKHBhdGgpO1xuICAgIH07XG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgdmFyIG9iamVjdElkID0gXCJcIjtcbiAgICAgIHZhciBsaW1pdCA9IDA7XG5cbiAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5oaXN0b3J5KCRzY29wZS5icmFuY2gsIG9iamVjdElkLCAkc2NvcGUucGFnZUlkLCBsaW1pdCwgKGxvZ0FycmF5KSA9PiB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChsb2dBcnJheSwgKGxvZykgPT4ge1xuICAgICAgICAgIC8vIGxldHMgdXNlIHRoZSBzaG9ydGVyIGhhc2ggZm9yIGxpbmtzIGJ5IGRlZmF1bHRcbiAgICAgICAgICB2YXIgY29tbWl0SWQgPSBsb2cuc2hhO1xuICAgICAgICAgIGxvZy4kZGF0ZSA9IERldmVsb3Blci5hc0RhdGUobG9nLmRhdGUpO1xuICAgICAgICAgIGxvZy5jb21taXRMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9jb21taXREZXRhaWwvXCIgKyAkc2NvcGUucGFnZUlkICsgXCIvXCIgKyBjb21taXRJZDtcbiAgICAgICAgfSk7XG4gICAgICAgICRzY29wZS5sb2dzID0gXy5zb3J0QnkobG9nQXJyYXksIFwiJGRhdGVcIikucmV2ZXJzZSgpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgICBXaWtpLmxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmRpcmVjdGl2ZShcImNvbW1pdEhpc3RvcnlQYW5lbFwiLCAoKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZVBhdGggKyAnaGlzdG9yeVBhbmVsLmh0bWwnXG4gICAgfTtcbiAgfSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLk5hdkJhckNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwid2lraUJyYW5jaE1lbnVcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsIHdpa2lCcmFuY2hNZW51OkJyYW5jaE1lbnUpID0+IHtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmJyYW5jaE1lbnVDb25maWcgPSA8VUkuTWVudUl0ZW0+e1xuICAgICAgdGl0bGU6ICRzY29wZS5icmFuY2gsXG4gICAgICBpdGVtczogW11cbiAgICB9O1xuXG4gICAgJHNjb3BlLlZpZXdNb2RlID0gV2lraS5WaWV3TW9kZTtcbiAgICAkc2NvcGUuc2V0Vmlld01vZGUgPSAobW9kZTpXaWtpLlZpZXdNb2RlKSA9PiB7XG4gICAgICAkc2NvcGUuJGVtaXQoJ1dpa2kuU2V0Vmlld01vZGUnLCBtb2RlKTtcbiAgICB9O1xuXG4gICAgd2lraUJyYW5jaE1lbnUuYXBwbHlNZW51RXh0ZW5zaW9ucygkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcyk7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdicmFuY2hlcycsIChuZXdWYWx1ZSwgb2xkVmFsdWUpID0+IHtcbiAgICAgIGlmIChuZXdWYWx1ZSA9PT0gb2xkVmFsdWUgfHwgIW5ld1ZhbHVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zID0gW107XG4gICAgICBpZiAobmV3VmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcy5wdXNoKHtcbiAgICAgICAgICBoZWFkaW5nOiBpc0ZtYyA/IFwiVmVyc2lvbnNcIiA6IFwiQnJhbmNoZXNcIlxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIG5ld1ZhbHVlLnNvcnQoKS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHZhciBtZW51SXRlbSA9IHtcbiAgICAgICAgICB0aXRsZTogaXRlbSxcbiAgICAgICAgICBpY29uOiAnJyxcbiAgICAgICAgICBhY3Rpb246ICgpID0+IHt9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChpdGVtID09PSAkc2NvcGUuYnJhbmNoKSB7XG4gICAgICAgICAgbWVudUl0ZW0uaWNvbiA9IFwiZmEgZmEtb2tcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtZW51SXRlbS5hY3Rpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0VXJsID0gYnJhbmNoTGluayhpdGVtLCA8c3RyaW5nPiRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgICAgICAgICAkbG9jYXRpb24ucGF0aChDb3JlLnRvUGF0aCh0YXJnZXRVcmwpKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zLnB1c2gobWVudUl0ZW0pO1xuICAgICAgfSk7XG4gICAgICB3aWtpQnJhbmNoTWVudS5hcHBseU1lbnVFeHRlbnNpb25zKCRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zKTtcbiAgICB9LCB0cnVlKTtcblxuICAgICRzY29wZS5jcmVhdGVMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhZ2VJZCA9IFdpa2kucGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAgIHJldHVybiBXaWtpLmNyZWF0ZUxpbmsoJHNjb3BlLCBwYWdlSWQsICRsb2NhdGlvbik7XG4gICAgfTtcblxuICAgICRzY29wZS5zdGFydExpbmsgPSBzdGFydExpbmsoJHNjb3BlKTtcblxuICAgICRzY29wZS5zb3VyY2VMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgdmFyIGFuc3dlciA9IDxzdHJpbmc+bnVsbDtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChXaWtpLmN1c3RvbVZpZXdMaW5rcygkc2NvcGUpLCAobGluaykgPT4ge1xuICAgICAgICBpZiAocGF0aC5zdGFydHNXaXRoKGxpbmspKSB7XG4gICAgICAgICAgYW5zd2VyID0gPHN0cmluZz5Db3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBXaWtpLnN0YXJ0TGluaygkc2NvcGUpICsgXCIvdmlld1wiICsgcGF0aC5zdWJzdHJpbmcobGluay5sZW5ndGgpKVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIHJlbW92ZSB0aGUgZm9ybSBwYXJhbWV0ZXIgb24gdmlldy9lZGl0IGxpbmtzXG4gICAgICByZXR1cm4gKCFhbnN3ZXIgJiYgJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXSlcbiAgICAgICAgICAgICAgPyBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBcIiNcIiArIHBhdGgsIFtcImZvcm1cIl0pXG4gICAgICAgICAgICAgIDogYW5zd2VyO1xuICAgIH07XG5cbiAgICAkc2NvcGUuaXNBY3RpdmUgPSAoaHJlZikgPT4ge1xuICAgICAgaWYgKCFocmVmKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBocmVmLmVuZHNXaXRoKCRyb3V0ZVBhcmFtc1sncGFnZSddKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQobG9hZEJyZWFkY3J1bWJzLCA1MCk7XG4gICAgfSk7XG5cbiAgICBsb2FkQnJlYWRjcnVtYnMoKTtcblxuICAgIGZ1bmN0aW9uIHN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rKGJyZWFkY3J1bWIsIGxpbmspIHtcbiAgICAgIHZhciBocmVmID0gYnJlYWRjcnVtYi5ocmVmO1xuICAgICAgaWYgKGhyZWYpIHtcbiAgICAgICAgYnJlYWRjcnVtYi5ocmVmID0gaHJlZi5yZXBsYWNlKFwid2lraS92aWV3XCIsIGxpbmspO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxvYWRCcmVhZGNydW1icygpIHtcbiAgICAgIHZhciBzdGFydCA9IFdpa2kuc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgaHJlZiA9IHN0YXJ0ICsgXCIvdmlld1wiO1xuICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzID0gW1xuICAgICAgICB7aHJlZjogaHJlZiwgbmFtZTogXCJyb290XCJ9XG4gICAgICBdO1xuICAgICAgdmFyIHBhdGggPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgICB2YXIgYXJyYXkgPSBwYXRoID8gcGF0aC5zcGxpdChcIi9cIikgOiBbXTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChhcnJheSwgKG5hbWUpID0+IHtcbiAgICAgICAgaWYgKCFuYW1lLnN0YXJ0c1dpdGgoXCIvXCIpICYmICFocmVmLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgICAgICAgIGhyZWYgKz0gXCIvXCI7XG4gICAgICAgIH1cbiAgICAgICAgaHJlZiArPSBXaWtpLmVuY29kZVBhdGgobmFtZSk7XG4gICAgICAgIGlmICghbmFtZS5pc0JsYW5rKCkpIHtcbiAgICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogaHJlZiwgbmFtZTogbmFtZX0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIGxldHMgc3dpenpsZSB0aGUgbGFzdCBvbmUgb3IgdHdvIHRvIGJlIGZvcm1UYWJsZSB2aWV3cyBpZiB0aGUgbGFzdCBvciAybmQgdG8gbGFzdFxuICAgICAgdmFyIGxvYyA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICBpZiAoJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCkge1xuICAgICAgICB2YXIgbGFzdCA9ICRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMV07XG4gICAgICAgIC8vIHBvc3NpYmx5IHRyaW0gYW55IHJlcXVpcmVkIGZpbGUgZXh0ZW5zaW9uc1xuICAgICAgICBsYXN0Lm5hbWUgPSBXaWtpLmhpZGVGaWxlTmFtZUV4dGVuc2lvbnMobGFzdC5uYW1lKTtcblxuICAgICAgICB2YXIgc3dpenpsZWQgPSBmYWxzZTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKFdpa2kuY3VzdG9tVmlld0xpbmtzKCRzY29wZSksIChsaW5rKSA9PiB7XG4gICAgICAgICAgaWYgKCFzd2l6emxlZCAmJiBsb2Muc3RhcnRzV2l0aChsaW5rKSkge1xuICAgICAgICAgICAgLy8gbGV0cyBzd2l6emxlIHRoZSB2aWV3IHRvIHRoZSBjdXJyZW50IGxpbmtcbiAgICAgICAgICAgIHN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rKCRzY29wZS5icmVhZGNydW1icy5sYXN0KCksIENvcmUudHJpbUxlYWRpbmcobGluaywgXCIvXCIpKTtcbiAgICAgICAgICAgIHN3aXp6bGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXN3aXp6bGVkICYmICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl0pIHtcbiAgICAgICAgICB2YXIgbGFzdE5hbWUgPSAkc2NvcGUuYnJlYWRjcnVtYnMubGFzdCgpLm5hbWU7XG4gICAgICAgICAgaWYgKGxhc3ROYW1lICYmIGxhc3ROYW1lLmVuZHNXaXRoKFwiLmpzb25cIikpIHtcbiAgICAgICAgICAgIC8vIHByZXZpb3VzIGJyZWFkY3J1bWIgc2hvdWxkIGJlIGEgZm9ybVRhYmxlXG4gICAgICAgICAgICBzd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluaygkc2NvcGUuYnJlYWRjcnVtYnNbJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCAtIDJdLCBcIndpa2kvZm9ybVRhYmxlXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLypcbiAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChcIi93aWtpL2hpc3RvcnlcIikgfHwgbG9jLnN0YXJ0c1dpdGgoXCIvd2lraS92ZXJzaW9uXCIpXG4gICAgICAgIHx8IGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvZGlmZlwiKSB8fCBsb2Muc3RhcnRzV2l0aChcIi93aWtpL2NvbW1pdFwiKSkge1xuICAgICAgICAvLyBsZXRzIGFkZCBhIGhpc3RvcnkgdGFiXG4gICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiMvd2lraS9oaXN0b3J5L1wiICsgcGF0aCwgbmFtZTogXCJIaXN0b3J5XCJ9KTtcbiAgICAgIH0gZWxzZSBpZiAoJHNjb3BlLmJyYW5jaCkge1xuICAgICAgICB2YXIgcHJlZml4ID1cIi93aWtpL2JyYW5jaC9cIiArICRzY29wZS5icmFuY2g7XG4gICAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi9oaXN0b3J5XCIpIHx8IGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL3ZlcnNpb25cIilcbiAgICAgICAgICB8fCBsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi9kaWZmXCIpIHx8IGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL2NvbW1pdFwiKSkge1xuICAgICAgICAgIC8vIGxldHMgYWRkIGEgaGlzdG9yeSB0YWJcbiAgICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogXCIjL3dpa2kvYnJhbmNoL1wiICsgJHNjb3BlLmJyYW5jaCArIFwiL2hpc3RvcnkvXCIgKyBwYXRoLCBuYW1lOiBcIkhpc3RvcnlcIn0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAqL1xuICAgICAgdmFyIG5hbWU6c3RyaW5nID0gbnVsbDtcbiAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChcIi93aWtpL3ZlcnNpb25cIikpIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgYSB2ZXJzaW9uIHRhYlxuICAgICAgICBuYW1lID0gKCRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8IFwiXCIpLnN1YnN0cmluZygwLCA2KSB8fCBcIlZlcnNpb25cIjtcbiAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IFwiI1wiICsgbG9jLCBuYW1lOiBuYW1lfSk7XG4gICAgICB9XG4gICAgICBpZiAobG9jLnN0YXJ0c1dpdGgoXCIvd2lraS9kaWZmXCIpKSB7XG4gICAgICAgIC8vIGxldHMgYWRkIGEgdmVyc2lvbiB0YWJcbiAgICAgICAgdmFyIHYxID0gKCRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8IFwiXCIpLnN1YnN0cmluZygwLCA2KTtcbiAgICAgICAgdmFyIHYyID0gKCRyb3V0ZVBhcmFtc1tcImJhc2VPYmplY3RJZFwiXSB8fCBcIlwiKS5zdWJzdHJpbmcoMCwgNik7XG4gICAgICAgIG5hbWUgPSBcIkRpZmZcIjtcbiAgICAgICAgaWYgKHYxKSB7XG4gICAgICAgICAgaWYgKHYyKSB7XG4gICAgICAgICAgICBuYW1lICs9IFwiIFwiICsgdjEgKyBcIiBcIiArIHYyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuYW1lICs9IFwiIFwiICsgdjE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiNcIiArIGxvYywgbmFtZTogbmFtZX0pO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxubW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoJ1dpa2kuT3ZlcnZpZXdEYXNoYm9hcmQnLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcykgPT4ge1xuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgICRzY29wZS5kYXNoYm9hcmRFbWJlZGRlZCA9IHRydWU7XG4gICAgJHNjb3BlLmRhc2hib2FyZElkID0gJzAnO1xuICAgICRzY29wZS5kYXNoYm9hcmRJbmRleCA9ICcwJztcbiAgICAkc2NvcGUuZGFzaGJvYXJkUmVwb3NpdG9yeSA9IHtcbiAgICAgIGdldFR5cGU6ICgpID0+ICdHaXRXaWtpUmVwb3NpdG9yeScsXG4gICAgICBwdXREYXNoYm9hcmRzOiAoYXJyYXk6YW55W10sIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBjYikgPT4ge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0sXG4gICAgICBkZWxldGVEYXNoYm9hcmRzOiAoYXJyYXk6QXJyYXk8RGFzaGJvYXJkLkRhc2hib2FyZD4sIGZuKSA9PiB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSxcbiAgICAgIGdldERhc2hib2FyZHM6IChmbjooZGFzaGJvYXJkczogQXJyYXk8RGFzaGJvYXJkLkRhc2hib2FyZD4pID0+IHZvaWQpID0+IHtcbiAgICAgICAgbG9nLmRlYnVnKFwiZ2V0RGFzaGJvYXJkcyBjYWxsZWRcIik7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIGZuKFt7XG4gICAgICAgICAgICBncm91cDogJ1Rlc3QnLFxuICAgICAgICAgICAgaWQ6ICcwJyxcbiAgICAgICAgICAgIHRpdGxlOiAnVGVzdCcsXG4gICAgICAgICAgICB3aWRnZXRzOiBbe1xuICAgICAgICAgICAgICBjb2w6IDEsXG4gICAgICAgICAgICAgIGlkOiAndzEnLFxuICAgICAgICAgICAgICBpbmNsdWRlOiAncGx1Z2lucy93aWtpL2h0bWwvcHJvamVjdHNDb21taXRQYW5lbC5odG1sJyxcbiAgICAgICAgICAgICAgcGF0aDogJGxvY2F0aW9uLnBhdGgoKSxcbiAgICAgICAgICAgICAgcm93OiAxLFxuICAgICAgICAgICAgICBzZWFyY2g6ICRsb2NhdGlvbi5zZWFyY2goKSxcbiAgICAgICAgICAgICAgc2l6ZV94OiAzLFxuICAgICAgICAgICAgICBzaXplX3k6IDIsXG4gICAgICAgICAgICAgIHRpdGxlOiAnQ29tbWl0cydcbiAgICAgICAgICAgIH1dXG4gICAgICAgICAgfV0pO1xuICAgICAgICB9LCAxMDAwKTtcblxuICAgICAgfSxcbiAgICAgIGdldERhc2hib2FyZDogKGlkOnN0cmluZywgZm46IChkYXNoYm9hcmQ6IERhc2hib2FyZC5EYXNoYm9hcmQpID0+IHZvaWQpID0+IHtcbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnbW9kZWwuZmV0Y2hlZCcsIChmZXRjaGVkKSA9PiB7XG4gICAgICAgICAgaWYgKCFmZXRjaGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3NlbGVjdGVkQnVpbGQnLCAoYnVpbGQpID0+IHtcbiAgICAgICAgICAgIGlmICghYnVpbGQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnZW50aXR5JywgKGVudGl0eSkgPT4ge1xuICAgICAgICAgICAgICBpZiAoIWVudGl0eSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YXIgbW9kZWwgPSAkc2NvcGUuJGV2YWwoJ21vZGVsJyk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQnVpbGQ6IFwiLCBidWlsZCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTW9kZWw6IFwiLCBtb2RlbCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRW50aXR5OiBcIiwgZW50aXR5KTtcbiAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIHNlYXJjaCA9IDxEYXNoYm9hcmQuU2VhcmNoTWFwPiB7XG4gICAgICAgICAgICAgICAgcHJvamVjdElkOiAkc2NvcGUucHJvamVjdElkLFxuICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJHNjb3BlLm5hbWVzcGFjZSxcbiAgICAgICAgICAgICAgICBvd25lcjogJHNjb3BlLm93bmVyLFxuICAgICAgICAgICAgICAgIGJyYW5jaDogJHNjb3BlLmJyYW5jaCxcbiAgICAgICAgICAgICAgICBqb2I6IGJ1aWxkLiRqb2JJZCxcbiAgICAgICAgICAgICAgICBpZDogJHNjb3BlLnByb2plY3RJZCxcbiAgICAgICAgICAgICAgICBidWlsZDogYnVpbGQuaWRcblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIGRhc2hib2FyZCA9IHtcbiAgICAgICAgICAgICAgICAgIGdyb3VwOiAnVGVzdCcsXG4gICAgICAgICAgICAgICAgICBpZDogJzAnLFxuICAgICAgICAgICAgICAgICAgdGl0bGU6ICdUZXN0JyxcbiAgICAgICAgICAgICAgICAgIHdpZGdldHM6IFtcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29sOiAxLFxuICAgICAgICAgICAgICAgICAgICByb3c6IDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAndzMnLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlOiAncGx1Z2lucy9rdWJlcm5ldGVzL2h0bWwvcGVuZGluZ1BpcGVsaW5lcy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogJGxvY2F0aW9uLnBhdGgoKSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiBzZWFyY2gsXG4gICAgICAgICAgICAgICAgICAgIHNpemVfeDogOSxcbiAgICAgICAgICAgICAgICAgICAgc2l6ZV95OiAxLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1BpcGVsaW5lcydcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGNvbDogMSxcbiAgICAgICAgICAgICAgICAgICAgcm93OiA0LFxuICAgICAgICAgICAgICAgICAgICBpZDogJ3cyJyxcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVkZTogJ3BsdWdpbnMvZGV2ZWxvcGVyL2h0bWwvbG9nUGFuZWwuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6ICRsb2NhdGlvbi5wYXRoKCksXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaDogc2VhcmNoLFxuICAgICAgICAgICAgICAgICAgICBzaXplX3g6IDQsXG4gICAgICAgICAgICAgICAgICAgIHNpemVfeTogMixcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdMb2dzIGZvciBqb2I6ICcgKyBidWlsZC4kam9iSWQgKyAnIGJ1aWxkOiAnICsgYnVpbGQuaWRcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGNvbDogNSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICd3NCcsXG4gICAgICAgICAgICAgICAgICAgIGluY2x1ZGU6ICdwbHVnaW5zL3dpa2kvaHRtbC9wcm9qZWN0Q29tbWl0c1BhbmVsLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiAkbG9jYXRpb24ucGF0aCgpLFxuICAgICAgICAgICAgICAgICAgICByb3c6IDQsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaDogc2VhcmNoLFxuICAgICAgICAgICAgICAgICAgICBzaXplX3g6IDUsXG4gICAgICAgICAgICAgICAgICAgIHNpemVfeTogMixcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdDb21taXRzJ1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKGVudGl0eS5lbnZpcm9ubWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgY29sUG9zaXRpb24gPSAxO1xuICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGVudGl0eS5lbnZpcm9ubWVudHMsIChlbnY6YW55LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcyA9IDxEYXNoYm9hcmQuU2VhcmNoTWFwPiBfLmV4dGVuZCh7XG4gICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IGVudi5sYWJlbFxuICAgICAgICAgICAgICAgICAgICB9LCBzZWFyY2gpO1xuICAgICAgICAgICAgICAgICAgICBkYXNoYm9hcmQud2lkZ2V0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICBpZDogZW52LnVybCxcbiAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0Vudmlyb25tZW50OiAnICsgZW52LmxhYmVsLFxuICAgICAgICAgICAgICAgICAgICAgIHNpemVfeDogMyxcbiAgICAgICAgICAgICAgICAgICAgICBzaXplX3k6IDIsXG4gICAgICAgICAgICAgICAgICAgICAgY29sOiBjb2xQb3NpdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICByb3c6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZTogJ3BsdWdpbnMvZGV2ZWxvcGVyL2h0bWwvZW52aXJvbm1lbnRQYW5lbC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICBwYXRoOiAkbG9jYXRpb24ucGF0aCgpLFxuICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaDogc1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY29sUG9zaXRpb24gPSBjb2xQb3NpdGlvbiArIDM7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmbihkYXNoYm9hcmQpO1xuICAgICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBjcmVhdGVEYXNoYm9hcmQ6IChvcHRpb25zOmFueSkgPT4ge1xuXG4gICAgICB9XG4gICAgfTtcblxuXG4gIH0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICAvLyBtYWluIHBhZ2UgY29udHJvbGxlclxuICBleHBvcnQgdmFyIFZpZXdDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5WaWV3Q29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkcm91dGVcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwibWFya2VkXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAgXCIkY29tcGlsZVwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGludGVycG9sYXRlXCIsIFwiJGRpYWxvZ1wiLCAoJHNjb3BlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zOm5nLnJvdXRlLklSb3V0ZVBhcmFtc1NlcnZpY2UsICRyb3V0ZTpuZy5yb3V0ZS5JUm91dGVTZXJ2aWNlLCAkaHR0cDpuZy5JSHR0cFNlcnZpY2UsICR0aW1lb3V0Om5nLklUaW1lb3V0U2VydmljZSwgbWFya2VkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5LCAgJGNvbXBpbGU6bmcuSUNvbXBpbGVTZXJ2aWNlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsIGxvY2FsU3RvcmFnZSwgJGludGVycG9sYXRlOm5nLklJbnRlcnBvbGF0ZVNlcnZpY2UsICRkaWFsb2cpID0+IHtcblxuICAgICRzY29wZS5uYW1lID0gXCJXaWtpVmlld0NvbnRyb2xsZXJcIjtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgU2VsZWN0aW9uSGVscGVycy5kZWNvcmF0ZSgkc2NvcGUpO1xuXG4gICAgJHNjb3BlLmZhYnJpY1RvcExldmVsID0gXCJmYWJyaWMvcHJvZmlsZXMvXCI7XG5cbiAgICAkc2NvcGUudmVyc2lvbklkID0gJHNjb3BlLmJyYW5jaDtcblxuICAgICRzY29wZS5wYW5lVGVtcGxhdGUgPSAnJztcblxuICAgICRzY29wZS5wcm9maWxlSWQgPSBcIlwiO1xuICAgICRzY29wZS5zaG93UHJvZmlsZUhlYWRlciA9IGZhbHNlO1xuICAgICRzY29wZS5zaG93QXBwSGVhZGVyID0gZmFsc2U7XG5cbiAgICAkc2NvcGUub3BlcmF0aW9uQ291bnRlciA9IDE7XG4gICAgJHNjb3BlLnJlbmFtZURpYWxvZyA9IDxXaWtpRGlhbG9nPiBudWxsO1xuICAgICRzY29wZS5tb3ZlRGlhbG9nID0gPFdpa2lEaWFsb2c+IG51bGw7XG4gICAgJHNjb3BlLmRlbGV0ZURpYWxvZyA9IDxXaWtpRGlhbG9nPiBudWxsO1xuICAgICRzY29wZS5pc0ZpbGUgPSBmYWxzZTtcblxuICAgICRzY29wZS5yZW5hbWUgPSB7XG4gICAgICBuZXdGaWxlTmFtZTogXCJcIlxuICAgIH07XG4gICAgJHNjb3BlLm1vdmUgPSB7XG4gICAgICBtb3ZlRm9sZGVyOiBcIlwiXG4gICAgfTtcbiAgICAkc2NvcGUuVmlld01vZGUgPSBXaWtpLlZpZXdNb2RlO1xuXG4gICAgLy8gYmluZCBmaWx0ZXIgbW9kZWwgdmFsdWVzIHRvIHNlYXJjaCBwYXJhbXMuLi5cbiAgICBDb3JlLmJpbmRNb2RlbFRvU2VhcmNoUGFyYW0oJHNjb3BlLCAkbG9jYXRpb24sIFwic2VhcmNoVGV4dFwiLCBcInFcIiwgXCJcIik7XG5cbiAgICBTdG9yYWdlSGVscGVycy5iaW5kTW9kZWxUb0xvY2FsU3RvcmFnZSh7XG4gICAgICAkc2NvcGU6ICRzY29wZSxcbiAgICAgICRsb2NhdGlvbjogJGxvY2F0aW9uLFxuICAgICAgbG9jYWxTdG9yYWdlOiBsb2NhbFN0b3JhZ2UsXG4gICAgICBtb2RlbE5hbWU6ICdtb2RlJyxcbiAgICAgIHBhcmFtTmFtZTogJ3dpa2lWaWV3TW9kZScsXG4gICAgICBpbml0aWFsVmFsdWU6IFdpa2kuVmlld01vZGUuSWNvbixcbiAgICAgIHRvOiBDb3JlLm51bWJlclRvU3RyaW5nLFxuICAgICAgZnJvbTogQ29yZS5wYXJzZUludFZhbHVlXG4gICAgfSk7XG5cbiAgICAvLyBvbmx5IHJlbG9hZCB0aGUgcGFnZSBpZiBjZXJ0YWluIHNlYXJjaCBwYXJhbWV0ZXJzIGNoYW5nZVxuICAgIENvcmUucmVsb2FkV2hlblBhcmFtZXRlcnNDaGFuZ2UoJHJvdXRlLCAkc2NvcGUsICRsb2NhdGlvbiwgWyd3aWtpVmlld01vZGUnXSk7XG5cbiAgICAkc2NvcGUuZ3JpZE9wdGlvbnMgPSB7XG4gICAgICBkYXRhOiAnY2hpbGRyZW4nLFxuICAgICAgZGlzcGxheUZvb3RlcjogZmFsc2UsXG4gICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgIGVuYWJsZVNvcnRpbmc6IGZhbHNlLFxuICAgICAgdXNlRXh0ZXJuYWxTb3J0aW5nOiB0cnVlLFxuICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICduYW1lJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ05hbWUnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmaWxlQ2VsbFRlbXBsYXRlLmh0bWwnKSxcbiAgICAgICAgICBoZWFkZXJDZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldCgnZmlsZUNvbHVtblRlbXBsYXRlLmh0bWwnKVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcblxuICAgICRzY29wZS4kb24oJ1dpa2kuU2V0Vmlld01vZGUnLCAoJGV2ZW50LCBtb2RlOldpa2kuVmlld01vZGUpID0+IHtcbiAgICAgICRzY29wZS5tb2RlID0gbW9kZTtcbiAgICAgIHN3aXRjaChtb2RlKSB7XG4gICAgICAgIGNhc2UgVmlld01vZGUuTGlzdDpcbiAgICAgICAgICBsb2cuZGVidWcoXCJMaXN0IHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBWaWV3TW9kZS5JY29uOlxuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkljb24gdmlldyBtb2RlXCIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICRzY29wZS5tb2RlID0gVmlld01vZGUuTGlzdDtcbiAgICAgICAgICBsb2cuZGVidWcoXCJEZWZhdWx0aW5nIHRvIGxpc3QgdmlldyBtb2RlXCIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUuY2hpbGRBY3Rpb25zID0gW107XG5cbiAgICB2YXIgbWF5YmVVcGRhdGVWaWV3ID0gQ29yZS50aHJvdHRsZWQodXBkYXRlVmlldywgMTAwMCk7XG5cbiAgICAkc2NvcGUubWFya2VkID0gKHRleHQpID0+IHtcbiAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgIHJldHVybiBtYXJrZWQodGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgICB9XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLiRvbignd2lraUJyYW5jaGVzVXBkYXRlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5jcmVhdGVEYXNoYm9hcmRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIGhyZWYgPSAnL3dpa2kvYnJhbmNoLzpicmFuY2gvdmlldy8qcGFnZSc7XG4gICAgICB2YXIgcGFnZSA9ICRyb3V0ZVBhcmFtc1sncGFnZSddO1xuICAgICAgdmFyIHRpdGxlID0gcGFnZSA/IHBhZ2Uuc3BsaXQoXCIvXCIpLmxhc3QoKSA6IG51bGw7XG4gICAgICB2YXIgc2l6ZSA9IGFuZ3VsYXIudG9Kc29uKHtcbiAgICAgICAgc2l6ZV94OiAyLFxuICAgICAgICBzaXplX3k6IDJcbiAgICAgIH0pO1xuICAgICAgdmFyIGFuc3dlciA9IFwiIy9kYXNoYm9hcmQvYWRkP3RhYj1kYXNoYm9hcmRcIiArXG4gICAgICAgIFwiJmhyZWY9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoaHJlZikgK1xuICAgICAgICBcIiZzaXplPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHNpemUpICtcbiAgICAgICAgXCImcm91dGVQYXJhbXM9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoYW5ndWxhci50b0pzb24oJHJvdXRlUGFyYW1zKSk7XG4gICAgICBpZiAodGl0bGUpIHtcbiAgICAgICAgYW5zd2VyICs9IFwiJnRpdGxlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHRpdGxlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgfTtcblxuICAgICRzY29wZS5kaXNwbGF5Q2xhc3MgPSAoKSA9PiB7XG4gICAgICBpZiAoISRzY29wZS5jaGlsZHJlbiB8fCAkc2NvcGUuY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFwic3BhbjlcIjtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnBhcmVudExpbmsgPSAoKSA9PiB7XG4gICAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICAgIHZhciBwcmVmaXggPSBzdGFydCArIFwiL3ZpZXdcIjtcbiAgICAgIC8vbG9nLmRlYnVnKFwicGFnZUlkOiBcIiwgJHNjb3BlLnBhZ2VJZClcbiAgICAgIHZhciBwYXJ0cyA9ICRzY29wZS5wYWdlSWQuc3BsaXQoXCIvXCIpO1xuICAgICAgLy9sb2cuZGVidWcoXCJwYXJ0czogXCIsIHBhcnRzKTtcbiAgICAgIHZhciBwYXRoID0gXCIvXCIgKyBwYXJ0cy5maXJzdChwYXJ0cy5sZW5ndGggLSAxKS5qb2luKFwiL1wiKTtcbiAgICAgIC8vbG9nLmRlYnVnKFwicGF0aDogXCIsIHBhdGgpO1xuICAgICAgcmV0dXJuIENvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIHByZWZpeCArIHBhdGgsIFtdKTtcbiAgICB9O1xuXG5cbiAgICAkc2NvcGUuY2hpbGRMaW5rID0gKGNoaWxkKSA9PiB7XG4gICAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICAgIHZhciBwcmVmaXggPSBzdGFydCArIFwiL3ZpZXdcIjtcbiAgICAgIHZhciBwb3N0Rml4ID0gXCJcIjtcbiAgICAgIHZhciBwYXRoID0gV2lraS5lbmNvZGVQYXRoKGNoaWxkLnBhdGgpO1xuICAgICAgaWYgKGNoaWxkLmRpcmVjdG9yeSkge1xuICAgICAgICAvLyBpZiB3ZSBhcmUgYSBmb2xkZXIgd2l0aCB0aGUgc2FtZSBuYW1lIGFzIGEgZm9ybSBmaWxlLCBsZXRzIGFkZCBhIGZvcm0gcGFyYW0uLi5cbiAgICAgICAgdmFyIGZvcm1QYXRoID0gcGF0aCArIFwiLmZvcm1cIjtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gJHNjb3BlLmNoaWxkcmVuO1xuICAgICAgICBpZiAoY2hpbGRyZW4pIHtcbiAgICAgICAgICB2YXIgZm9ybUZpbGUgPSBjaGlsZHJlbi5maW5kKChjaGlsZCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGNoaWxkWydwYXRoJ10gPT09IGZvcm1QYXRoO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChmb3JtRmlsZSkge1xuICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9mb3JtVGFibGVcIjtcbiAgICAgICAgICAgIHBvc3RGaXggPSBcIj9mb3JtPVwiICsgZm9ybVBhdGg7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgeG1sTmFtZXNwYWNlcyA9IGNoaWxkLnhtbF9uYW1lc3BhY2VzIHx8IGNoaWxkLnhtbE5hbWVzcGFjZXM7XG4gICAgICAgIGlmICh4bWxOYW1lc3BhY2VzICYmIHhtbE5hbWVzcGFjZXMubGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5jYW1lbE5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgICAgIGlmICh1c2VDYW1lbENhbnZhc0J5RGVmYXVsdCkge1xuICAgICAgICAgICAgICBwcmVmaXggPSBzdGFydCArIFwiL2NhbWVsL2NhbnZhc1wiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9jYW1lbC9wcm9wZXJ0aWVzXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuZG96ZXJOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgICAgICBwcmVmaXggPSBzdGFydCArIFwiL2RvemVyL21hcHBpbmdzXCI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcImNoaWxkIFwiICsgcGF0aCArIFwiIGhhcyBuYW1lc3BhY2VzIFwiICsgeG1sTmFtZXNwYWNlcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjaGlsZC5wYXRoLmVuZHNXaXRoKFwiLmZvcm1cIikpIHtcbiAgICAgICAgICBwb3N0Rml4ID0gXCI/Zm9ybT0vXCI7XG4gICAgICAgIH0gZWxzZSBpZiAoV2lraS5pc0luZGV4UGFnZShjaGlsZC5wYXRoKSkge1xuICAgICAgICAgIC8vIGxldHMgZGVmYXVsdCB0byBib29rIHZpZXcgb24gaW5kZXggcGFnZXNcbiAgICAgICAgICBwcmVmaXggPSBzdGFydCArIFwiL2Jvb2tcIjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIENvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIFVybEhlbHBlcnMuam9pbihwcmVmaXgsIHBhdGgpICsgcG9zdEZpeCwgW1wiZm9ybVwiXSk7XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlTmFtZSA9IChlbnRpdHkpID0+IHtcbiAgICAgIHJldHVybiBXaWtpLmhpZGVGaWxlTmFtZUV4dGVuc2lvbnMoZW50aXR5LmRpc3BsYXlOYW1lIHx8IGVudGl0eS5uYW1lKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmZpbGVDbGFzcyA9IChlbnRpdHkpID0+IHtcbiAgICAgIGlmIChlbnRpdHkubmFtZS5oYXMoXCIucHJvZmlsZVwiKSkge1xuICAgICAgICByZXR1cm4gXCJncmVlblwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlSWNvbkh0bWwgPSAoZW50aXR5KSA9PiB7XG4gICAgICByZXR1cm4gV2lraS5maWxlSWNvbkh0bWwoZW50aXR5KTtcbiAgICB9O1xuXG5cbiAgICAkc2NvcGUuZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KCRzY29wZS5wYWdlSWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpO1xuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICBtb2RlOiB7XG4gICAgICAgIG5hbWU6ICRzY29wZS5mb3JtYXRcbiAgICAgIH1cbiAgICB9O1xuICAgICRzY29wZS5jb2RlTWlycm9yT3B0aW9ucyA9IENvZGVFZGl0b3IuY3JlYXRlRWRpdG9yU2V0dGluZ3Mob3B0aW9ucyk7XG5cbiAgICAkc2NvcGUuZWRpdExpbmsgPSAoKSA9PiB7XG4gICAgICB2YXIgcGFnZU5hbWUgPSAoJHNjb3BlLmRpcmVjdG9yeSkgPyAkc2NvcGUucmVhZE1lUGF0aCA6ICRzY29wZS5wYWdlSWQ7XG4gICAgICByZXR1cm4gKHBhZ2VOYW1lKSA/IFdpa2kuZWRpdExpbmsoJHNjb3BlLCBwYWdlTmFtZSwgJGxvY2F0aW9uKSA6IG51bGw7XG4gICAgfTtcblxuICAgICRzY29wZS5icmFuY2hMaW5rID0gKGJyYW5jaCkgPT4ge1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICByZXR1cm4gV2lraS5icmFuY2hMaW5rKGJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsXG4gICAgfTtcblxuICAgICRzY29wZS5oaXN0b3J5TGluayA9IFwiIy93aWtpXCIgKyAoJHNjb3BlLmJyYW5jaCA/IFwiL2JyYW5jaC9cIiArICRzY29wZS5icmFuY2ggOiBcIlwiKSArIFwiL2hpc3RvcnkvXCIgKyAkc2NvcGUucGFnZUlkO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnd29ya3NwYWNlLnRyZWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISRzY29wZS5naXQpIHtcbiAgICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgICAgLy9sb2cuaW5mbyhcIlJlbG9hZGluZyB2aWV3IGFzIHRoZSB0cmVlIGNoYW5nZWQgYW5kIHdlIGhhdmUgYSBnaXQgbWJlYW4gbm93XCIpO1xuICAgICAgICBzZXRUaW1lb3V0KG1heWJlVXBkYXRlVmlldywgNTApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIC8vbG9nLmluZm8oXCJSZWxvYWRpbmcgdmlldyBkdWUgdG8gJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiKTtcbiAgICAgIHNldFRpbWVvdXQobWF5YmVVcGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cblxuICAgICRzY29wZS5vcGVuRGVsZXRlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRGaWxlSHRtbCA9IFwiPHVsPlwiICsgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubWFwKGZpbGUgPT4gXCI8bGk+XCIgKyBmaWxlLm5hbWUgKyBcIjwvbGk+XCIpLnNvcnQoKS5qb2luKFwiXCIpICsgXCI8L3VsPlwiO1xuXG4gICAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5maW5kKChmaWxlKSA9PiB7IHJldHVybiBmaWxlLm5hbWUuZW5kc1dpdGgoXCIucHJvZmlsZVwiKX0pKSB7XG4gICAgICAgICAgJHNjb3BlLmRlbGV0ZVdhcm5pbmcgPSBcIllvdSBhcmUgYWJvdXQgdG8gZGVsZXRlIGRvY3VtZW50KHMpIHdoaWNoIHJlcHJlc2VudCBGYWJyaWM4IHByb2ZpbGUocykuIFRoaXMgcmVhbGx5IGNhbid0IGJlIHVuZG9uZSEgV2lraSBvcGVyYXRpb25zIGFyZSBsb3cgbGV2ZWwgYW5kIG1heSBsZWFkIHRvIG5vbi1mdW5jdGlvbmFsIHN0YXRlIG9mIEZhYnJpYy5cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkc2NvcGUuZGVsZXRlV2FybmluZyA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuZGVsZXRlRGlhbG9nID0gV2lraS5nZXREZWxldGVEaWFsb2coJGRpYWxvZywgPFdpa2kuRGVsZXRlRGlhbG9nT3B0aW9ucz57XG4gICAgICAgICAgY2FsbGJhY2tzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZGVsZXRlQW5kQ2xvc2VEaWFsb2c7IH0sXG4gICAgICAgICAgc2VsZWN0ZWRGaWxlSHRtbDogKCkgPT4gIHsgcmV0dXJuICRzY29wZS5zZWxlY3RlZEZpbGVIdG1sOyB9LFxuICAgICAgICAgIHdhcm5pbmc6ICgpID0+IHsgcmV0dXJuICRzY29wZS5kZWxldGVXYXJuaW5nOyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5kZWxldGVEaWFsb2cub3BlbigpO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJObyBpdGVtcyBzZWxlY3RlZCByaWdodCBub3chIFwiICsgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZGVsZXRlQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgZmlsZXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIHZhciBmaWxlQ291bnQgPSBmaWxlcy5sZW5ndGg7XG4gICAgICBsb2cuZGVidWcoXCJEZWxldGluZyBzZWxlY3Rpb246IFwiICsgZmlsZXMpO1xuXG4gICAgICB2YXIgcGF0aHNUb0RlbGV0ZSA9IFtdO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKGZpbGVzLCAoZmlsZSwgaWR4KSA9PiB7XG4gICAgICAgIHZhciBwYXRoID0gVXJsSGVscGVycy5qb2luKCRzY29wZS5wYWdlSWQsIGZpbGUubmFtZSk7XG4gICAgICAgIHBhdGhzVG9EZWxldGUucHVzaChwYXRoKTtcbiAgICAgIH0pO1xuXG4gICAgICBsb2cuZGVidWcoXCJBYm91dCB0byBkZWxldGUgXCIgKyBwYXRoc1RvRGVsZXRlKTtcbiAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5yZW1vdmVQYWdlcygkc2NvcGUuYnJhbmNoLCBwYXRoc1RvRGVsZXRlLCBudWxsLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zID0gW107XG4gICAgICAgIHZhciBtZXNzYWdlID0gQ29yZS5tYXliZVBsdXJhbChmaWxlQ291bnQsIFwiZG9jdW1lbnRcIik7XG4gICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIkRlbGV0ZWQgXCIgKyBtZXNzYWdlKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgfSk7XG4gICAgICAkc2NvcGUuZGVsZXRlRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goXCJyZW5hbWUubmV3RmlsZU5hbWVcIiwgKCkgPT4ge1xuICAgICAgLy8gaWdub3JlIGVycm9ycyBpZiB0aGUgZmlsZSBpcyB0aGUgc2FtZSBhcyB0aGUgcmVuYW1lIGZpbGUhXG4gICAgICB2YXIgcGF0aCA9IGdldFJlbmFtZUZpbGVQYXRoKCk7XG4gICAgICBpZiAoJHNjb3BlLm9yaWdpbmFsUmVuYW1lRmlsZVBhdGggPT09IHBhdGgpIHtcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMgPSB7IGV4aXN0czogZmFsc2UsIG5hbWU6IG51bGwgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoZWNrRmlsZUV4aXN0cyhwYXRoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS5yZW5hbWVBbmRDbG9zZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgIHZhciBuZXdQYXRoID0gZ2V0UmVuYW1lRmlsZVBhdGgoKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkICYmIG5ld1BhdGgpIHtcbiAgICAgICAgICB2YXIgb2xkTmFtZSA9IHNlbGVjdGVkLm5hbWU7XG4gICAgICAgICAgdmFyIG5ld05hbWUgPSBXaWtpLmZpbGVOYW1lKG5ld1BhdGgpO1xuICAgICAgICAgIHZhciBvbGRQYXRoID0gVXJsSGVscGVycy5qb2luKCRzY29wZS5wYWdlSWQsIG9sZE5hbWUpO1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkFib3V0IHRvIHJlbmFtZSBmaWxlIFwiICsgb2xkUGF0aCArIFwiIHRvIFwiICsgbmV3UGF0aCk7XG4gICAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LnJlbmFtZSgkc2NvcGUuYnJhbmNoLCBvbGRQYXRoLCBuZXdQYXRoLCBudWxsLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJSZW5hbWVkIGZpbGUgdG8gIFwiICsgbmV3TmFtZSk7XG4gICAgICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5zcGxpY2UoMCwgMSk7XG4gICAgICAgICAgICAkc2NvcGUucmVuYW1lRGlhbG9nLmNsb3NlKCk7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAkc2NvcGUucmVuYW1lRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vcGVuUmVuYW1lRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIG5hbWUgPSBudWxsO1xuICAgICAgaWYgKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtc1swXTtcbiAgICAgICAgbmFtZSA9IHNlbGVjdGVkLm5hbWU7XG4gICAgICB9XG4gICAgICBpZiAobmFtZSkge1xuICAgICAgICAkc2NvcGUucmVuYW1lLm5ld0ZpbGVOYW1lID0gbmFtZTtcbiAgICAgICAgJHNjb3BlLm9yaWdpbmFsUmVuYW1lRmlsZVBhdGggPSBnZXRSZW5hbWVGaWxlUGF0aCgpO1xuXG4gICAgICAgICRzY29wZS5yZW5hbWVEaWFsb2cgPSBXaWtpLmdldFJlbmFtZURpYWxvZygkZGlhbG9nLCA8V2lraS5SZW5hbWVEaWFsb2dPcHRpb25zPntcbiAgICAgICAgICByZW5hbWU6ICgpID0+IHsgIHJldHVybiAkc2NvcGUucmVuYW1lOyB9LFxuICAgICAgICAgIGZpbGVFeGlzdHM6ICgpID0+IHsgcmV0dXJuICRzY29wZS5maWxlRXhpc3RzOyB9LFxuICAgICAgICAgIGZpbGVOYW1lOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZmlsZU5hbWU7IH0sXG4gICAgICAgICAgY2FsbGJhY2tzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUucmVuYW1lQW5kQ2xvc2VEaWFsb2c7IH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZy5vcGVuKCk7XG5cbiAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICQoJyNyZW5hbWVGaWxlTmFtZScpLmZvY3VzKCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIGl0ZW1zIHNlbGVjdGVkIHJpZ2h0IG5vdyEgXCIgKyAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5tb3ZlQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgZmlsZXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIHZhciBmaWxlQ291bnQgPSBmaWxlcy5sZW5ndGg7XG4gICAgICB2YXIgbW92ZUZvbGRlciA9ICRzY29wZS5tb3ZlLm1vdmVGb2xkZXI7XG4gICAgICB2YXIgb2xkRm9sZGVyOnN0cmluZyA9ICRzY29wZS5wYWdlSWQ7XG4gICAgICBpZiAobW92ZUZvbGRlciAmJiBmaWxlQ291bnQgJiYgbW92ZUZvbGRlciAhPT0gb2xkRm9sZGVyKSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk1vdmluZyBcIiArIGZpbGVDb3VudCArIFwiIGZpbGUocykgdG8gXCIgKyBtb3ZlRm9sZGVyKTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGZpbGVzLCAoZmlsZSwgaWR4KSA9PiB7XG4gICAgICAgICAgdmFyIG9sZFBhdGggPSBvbGRGb2xkZXIgKyBcIi9cIiArIGZpbGUubmFtZTtcbiAgICAgICAgICB2YXIgbmV3UGF0aCA9IG1vdmVGb2xkZXIgKyBcIi9cIiArIGZpbGUubmFtZTtcbiAgICAgICAgICBsb2cuZGVidWcoXCJBYm91dCB0byBtb3ZlIFwiICsgb2xkUGF0aCArIFwiIHRvIFwiICsgbmV3UGF0aCk7XG4gICAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LnJlbmFtZSgkc2NvcGUuYnJhbmNoLCBvbGRQYXRoLCBuZXdQYXRoLCBudWxsLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBpZiAoaWR4ICsgMSA9PT0gZmlsZUNvdW50KSB7XG4gICAgICAgICAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLnNwbGljZSgwLCBmaWxlQ291bnQpO1xuICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IENvcmUubWF5YmVQbHVyYWwoZmlsZUNvdW50LCBcImRvY3VtZW50XCIpO1xuICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJNb3ZlZCBcIiArIG1lc3NhZ2UgKyBcIiB0byBcIiArIG5ld1BhdGgpO1xuICAgICAgICAgICAgICAkc2NvcGUubW92ZURpYWxvZy5jbG9zZSgpO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgJHNjb3BlLm1vdmVEaWFsb2cuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmZvbGRlck5hbWVzID0gKHRleHQpID0+IHtcbiAgICAgIHJldHVybiB3aWtpUmVwb3NpdG9yeS5jb21wbGV0ZVBhdGgoJHNjb3BlLmJyYW5jaCwgdGV4dCwgdHJ1ZSwgbnVsbCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vcGVuTW92ZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLm1vdmUubW92ZUZvbGRlciA9ICRzY29wZS5wYWdlSWQ7XG5cbiAgICAgICAgJHNjb3BlLm1vdmVEaWFsb2cgPSBXaWtpLmdldE1vdmVEaWFsb2coJGRpYWxvZywgPFdpa2kuTW92ZURpYWxvZ09wdGlvbnM+e1xuICAgICAgICAgIG1vdmU6ICgpID0+IHsgIHJldHVybiAkc2NvcGUubW92ZTsgfSxcbiAgICAgICAgICBmb2xkZXJOYW1lczogKCkgPT4geyByZXR1cm4gJHNjb3BlLmZvbGRlck5hbWVzOyB9LFxuICAgICAgICAgIGNhbGxiYWNrczogKCkgPT4geyByZXR1cm4gJHNjb3BlLm1vdmVBbmRDbG9zZURpYWxvZzsgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUubW92ZURpYWxvZy5vcGVuKCk7XG5cbiAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICQoJyNtb3ZlRm9sZGVyJykuZm9jdXMoKTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gaXRlbXMgc2VsZWN0ZWQgcmlnaHQgbm93ISBcIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zKTtcbiAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBzZXRUaW1lb3V0KG1heWJlVXBkYXRlVmlldywgNTApO1xuXG4gICAgZnVuY3Rpb24gaXNEaWZmVmlldygpIHtcbiAgICAgIHJldHVybiAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQxXCJdIHx8ICRyb3V0ZVBhcmFtc1tcImRpZmZPYmplY3RJZDJcIl0gPyB0cnVlIDogZmFsc2VcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICAgICAgdmFyIGpvbG9raWEgPSBudWxsO1xuXG5cbiAgICAgIGlmIChpc0RpZmZWaWV3KCkpIHtcbiAgICAgICAgdmFyIGJhc2VPYmplY3RJZCA9ICRyb3V0ZVBhcmFtc1tcImRpZmZPYmplY3RJZDJcIl07XG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5kaWZmKCRzY29wZS5vYmplY3RJZCwgYmFzZU9iamVjdElkLCAkc2NvcGUucGFnZUlkLCBvbkZpbGVEZXRhaWxzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsICRzY29wZS5vYmplY3RJZCwgb25GaWxlRGV0YWlscyk7XG4gICAgICB9XG4gICAgICBXaWtpLmxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnVwZGF0ZVZpZXcgPSB1cGRhdGVWaWV3O1xuXG4gICAgZnVuY3Rpb24gdmlld0NvbnRlbnRzKHBhZ2VOYW1lLCBjb250ZW50cykge1xuICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBudWxsO1xuXG4gICAgICB2YXIgZm9ybWF0OnN0cmluZyA9IG51bGw7XG4gICAgICBpZiAoaXNEaWZmVmlldygpKSB7XG4gICAgICAgIGZvcm1hdCA9IFwiZGlmZlwiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KHBhZ2VOYW1lLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSB8fCAkc2NvcGUuZm9ybWF0O1xuICAgICAgfVxuICAgICAgbG9nLmRlYnVnKFwiRmlsZSBmb3JtYXQ6IFwiLCBmb3JtYXQpO1xuICAgICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgICAgY2FzZSBcImltYWdlXCI6XG4gICAgICAgICAgdmFyIGltYWdlVVJMID0gJ2dpdC8nICsgJHNjb3BlLmJyYW5jaDtcbiAgICAgICAgICBsb2cuZGVidWcoXCIkc2NvcGU6IFwiLCAkc2NvcGUpO1xuICAgICAgICAgIGltYWdlVVJMID0gVXJsSGVscGVycy5qb2luKGltYWdlVVJMLCAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICB2YXIgaW50ZXJwb2xhdGVGdW5jID0gJGludGVycG9sYXRlKCR0ZW1wbGF0ZUNhY2hlLmdldChcImltYWdlVGVtcGxhdGUuaHRtbFwiKSk7XG4gICAgICAgICAgJHNjb3BlLmh0bWwgPSBpbnRlcnBvbGF0ZUZ1bmMoe1xuICAgICAgICAgICAgaW1hZ2VVUkw6IGltYWdlVVJMXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJtYXJrZG93blwiOlxuICAgICAgICAgICRzY29wZS5odG1sID0gY29udGVudHMgPyBtYXJrZWQoY29udGVudHMpIDogXCJcIjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcImphdmFzY3JpcHRcIjpcbiAgICAgICAgICB2YXIgZm9ybSA9IG51bGw7XG4gICAgICAgICAgZm9ybSA9ICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl07XG4gICAgICAgICAgJHNjb3BlLnNvdXJjZSA9IGNvbnRlbnRzO1xuICAgICAgICAgICRzY29wZS5mb3JtID0gZm9ybTtcbiAgICAgICAgICBpZiAoZm9ybSkge1xuICAgICAgICAgICAgLy8gbm93IGxldHMgdHJ5IGxvYWQgdGhlIGZvcm0gSlNPTiBzbyB3ZSBjYW4gdGhlbiByZW5kZXIgdGhlIGZvcm1cbiAgICAgICAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gbnVsbDtcbiAgICAgICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvcm0sICRzY29wZS5vYmplY3RJZCwgKGRldGFpbHMpID0+IHtcbiAgICAgICAgICAgICAgb25Gb3JtU2NoZW1hKFdpa2kucGFyc2VKc29uKGRldGFpbHMudGV4dCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9zb3VyY2VWaWV3Lmh0bWxcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgJHNjb3BlLmh0bWwgPSBudWxsO1xuICAgICAgICAgICRzY29wZS5zb3VyY2UgPSBjb250ZW50cztcbiAgICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvc291cmNlVmlldy5odG1sXCI7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRm9ybVNjaGVtYShqc29uKSB7XG4gICAgICAkc2NvcGUuZm9ybURlZmluaXRpb24gPSBqc29uO1xuICAgICAgaWYgKCRzY29wZS5zb3VyY2UpIHtcbiAgICAgICAgJHNjb3BlLmZvcm1FbnRpdHkgPSBXaWtpLnBhcnNlSnNvbigkc2NvcGUuc291cmNlKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9mb3JtVmlldy5odG1sXCI7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRmlsZURldGFpbHMoZGV0YWlscykge1xuICAgICAgdmFyIGNvbnRlbnRzID0gZGV0YWlscy50ZXh0O1xuICAgICAgJHNjb3BlLmRpcmVjdG9yeSA9IGRldGFpbHMuZGlyZWN0b3J5O1xuICAgICAgJHNjb3BlLmZpbGVEZXRhaWxzID0gZGV0YWlscztcblxuICAgICAgaWYgKGRldGFpbHMgJiYgZGV0YWlscy5mb3JtYXQpIHtcbiAgICAgICAgJHNjb3BlLmZvcm1hdCA9IGRldGFpbHMuZm9ybWF0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdCgkc2NvcGUucGFnZUlkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5jb2RlTWlycm9yT3B0aW9ucy5tb2RlLm5hbWUgPSAkc2NvcGUuZm9ybWF0O1xuICAgICAgJHNjb3BlLmNoaWxkcmVuID0gbnVsbDtcblxuICAgICAgaWYgKGRldGFpbHMuZGlyZWN0b3J5KSB7XG4gICAgICAgIHZhciBkaXJlY3RvcmllcyA9IGRldGFpbHMuY2hpbGRyZW4uZmlsdGVyKChkaXIpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGlyLmRpcmVjdG9yeTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBwcm9maWxlcyA9IGRldGFpbHMuY2hpbGRyZW4uZmlsdGVyKChkaXIpID0+IHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZmlsZXMgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbHRlcigoZmlsZSkgPT4ge1xuICAgICAgICAgIHJldHVybiAhZmlsZS5kaXJlY3Rvcnk7XG4gICAgICAgIH0pO1xuICAgICAgICBkaXJlY3RvcmllcyA9IGRpcmVjdG9yaWVzLnNvcnRCeSgoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRpci5uYW1lO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvZmlsZXMgPSBwcm9maWxlcy5zb3J0QnkoKGRpcikgPT4ge1xuICAgICAgICAgIHJldHVybiBkaXIubmFtZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGZpbGVzID0gZmlsZXMuc29ydEJ5KChmaWxlKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGZpbGUubmFtZTtcbiAgICAgICAgfSlcbiAgICAgICAgICAuc29ydEJ5KChmaWxlKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZmlsZS5uYW1lLnNwbGl0KCcuJykubGFzdCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAvLyBBbHNvIGVucmljaCB0aGUgcmVzcG9uc2Ugd2l0aCB0aGUgY3VycmVudCBicmFuY2gsIGFzIHRoYXQncyBwYXJ0IG9mIHRoZSBjb29yZGluYXRlIGZvciBsb2NhdGluZyB0aGUgYWN0dWFsIGZpbGUgaW4gZ2l0XG4gICAgICAgICRzY29wZS5jaGlsZHJlbiA9ICg8YW55PkFycmF5KS5jcmVhdGUoZGlyZWN0b3JpZXMsIHByb2ZpbGVzLCBmaWxlcykubWFwKChmaWxlKSA9PiB7XG4gICAgICAgICAgZmlsZS5icmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgICAgICAgIGZpbGUuZmlsZU5hbWUgPSBmaWxlLm5hbWU7XG4gICAgICAgICAgaWYgKGZpbGUuZGlyZWN0b3J5KSB7XG4gICAgICAgICAgICBmaWxlLmZpbGVOYW1lICs9IFwiLnppcFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmaWxlLmRvd25sb2FkVVJMID0gV2lraS5naXRSZXN0VVJMKCRzY29wZSwgZmlsZS5wYXRoKTtcbiAgICAgICAgICByZXR1cm4gZmlsZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cblxuICAgICAgJHNjb3BlLmh0bWwgPSBudWxsO1xuICAgICAgJHNjb3BlLnNvdXJjZSA9IG51bGw7XG4gICAgICAkc2NvcGUucmVhZE1lUGF0aCA9IG51bGw7XG5cbiAgICAgICRzY29wZS5pc0ZpbGUgPSBmYWxzZTtcbiAgICAgIGlmICgkc2NvcGUuY2hpbGRyZW4pIHtcbiAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ3BhbmUub3BlbicpO1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgcmVhZG1lIHRoZW4gbGV0cyByZW5kZXIgaXQuLi5cbiAgICAgICAgdmFyIGl0ZW0gPSAkc2NvcGUuY2hpbGRyZW4uZmluZCgoaW5mbykgPT4ge1xuICAgICAgICAgIHZhciBuYW1lID0gKGluZm8ubmFtZSB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgIHZhciBleHQgPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgICAgICAgIHJldHVybiBuYW1lICYmIGV4dCAmJiAoKG5hbWUuc3RhcnRzV2l0aChcInJlYWRtZS5cIikgfHwgbmFtZSA9PT0gXCJyZWFkbWVcIikgfHwgKG5hbWUuc3RhcnRzV2l0aChcImluZGV4LlwiKSB8fCBuYW1lID09PSBcImluZGV4XCIpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgdmFyIHBhZ2VOYW1lID0gaXRlbS5wYXRoO1xuICAgICAgICAgICRzY29wZS5yZWFkTWVQYXRoID0gcGFnZU5hbWU7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYWdlTmFtZSwgJHNjb3BlLm9iamVjdElkLCAocmVhZG1lRGV0YWlscykgPT4ge1xuICAgICAgICAgICAgdmlld0NvbnRlbnRzKHBhZ2VOYW1lLCByZWFkbWVEZXRhaWxzLnRleHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBrdWJlcm5ldGVzSnNvbiA9ICRzY29wZS5jaGlsZHJlbi5maW5kKChjaGlsZCkgPT4ge1xuICAgICAgICAgIHZhciBuYW1lID0gKGNoaWxkLm5hbWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICB2YXIgZXh0ID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAgICAgICByZXR1cm4gbmFtZSAmJiBleHQgJiYgbmFtZS5zdGFydHNXaXRoKFwia3ViZXJuZXRlc1wiKSAmJiBleHQgPT09IFwianNvblwiO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGt1YmVybmV0ZXNKc29uKSB7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBrdWJlcm5ldGVzSnNvbi5wYXRoLCB1bmRlZmluZWQsIChqc29uKSA9PiB7XG4gICAgICAgICAgICBpZiAoanNvbiAmJiBqc29uLnRleHQpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAkc2NvcGUua3ViZXJuZXRlc0pzb24gPSBhbmd1bGFyLmZyb21Kc29uKGpzb24udGV4dCk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUua3ViZXJuZXRlc0pzb24gPSB7XG4gICAgICAgICAgICAgICAgICBlcnJvclBhcnNpbmc6IHRydWUsXG4gICAgICAgICAgICAgICAgICBlcnJvcjogZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgJHNjb3BlLnNob3dBcHBIZWFkZXIgPSB0cnVlO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdXaWtpLlZpZXdQYWdlLkNoaWxkcmVuJywgJHNjb3BlLnBhZ2VJZCwgJHNjb3BlLmNoaWxkcmVuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdwYW5lLmNsb3NlJyk7XG4gICAgICAgIHZhciBwYWdlTmFtZSA9ICRzY29wZS5wYWdlSWQ7XG4gICAgICAgIHZpZXdDb250ZW50cyhwYWdlTmFtZSwgY29udGVudHMpO1xuICAgICAgICAkc2NvcGUuaXNGaWxlID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tGaWxlRXhpc3RzKHBhdGgpIHtcbiAgICAgICRzY29wZS5vcGVyYXRpb25Db3VudGVyICs9IDE7XG4gICAgICB2YXIgY291bnRlciA9ICRzY29wZS5vcGVyYXRpb25Db3VudGVyO1xuICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgd2lraVJlcG9zaXRvcnkuZXhpc3RzKCRzY29wZS5icmFuY2gsIHBhdGgsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAvLyBmaWx0ZXIgb2xkIHJlc3VsdHNcbiAgICAgICAgICBpZiAoJHNjb3BlLm9wZXJhdGlvbkNvdW50ZXIgPT09IGNvdW50ZXIpIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcImNoZWNrRmlsZUV4aXN0cyBmb3IgcGF0aCBcIiArIHBhdGggKyBcIiBnb3QgcmVzdWx0IFwiICsgcmVzdWx0KTtcbiAgICAgICAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IHJlc3VsdCA/IHRydWUgOiBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSByZXN1bHQgPyByZXN1bHQubmFtZSA6IG51bGw7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBsb2cuZGVidWcoXCJJZ25vcmluZyBvbGQgcmVzdWx0cyBmb3IgXCIgKyBwYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENhbGxlZCBieSBoYXd0aW8gVE9DIGRpcmVjdGl2ZS4uLlxuICAgICRzY29wZS5nZXRDb250ZW50cyA9IChmaWxlbmFtZSwgY2IpID0+IHtcbiAgICAgIHZhciBwYWdlSWQgPSBmaWxlbmFtZTtcbiAgICAgIGlmICgkc2NvcGUuZGlyZWN0b3J5KSB7XG4gICAgICAgIHBhZ2VJZCA9ICRzY29wZS5wYWdlSWQgKyAnLycgKyBmaWxlbmFtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwYXRoUGFydHMgPSAkc2NvcGUucGFnZUlkLnNwbGl0KCcvJyk7XG4gICAgICAgIHBhdGhQYXJ0cyA9IHBhdGhQYXJ0cy5yZW1vdmUocGF0aFBhcnRzLmxhc3QoKSk7XG4gICAgICAgIHBhdGhQYXJ0cy5wdXNoKGZpbGVuYW1lKTtcbiAgICAgICAgcGFnZUlkID0gcGF0aFBhcnRzLmpvaW4oJy8nKTtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcInBhZ2VJZDogXCIsICRzY29wZS5wYWdlSWQpO1xuICAgICAgbG9nLmRlYnVnKFwiYnJhbmNoOiBcIiwgJHNjb3BlLmJyYW5jaCk7XG4gICAgICBsb2cuZGVidWcoXCJmaWxlbmFtZTogXCIsIGZpbGVuYW1lKTtcbiAgICAgIGxvZy5kZWJ1ZyhcInVzaW5nIHBhZ2VJZDogXCIsIHBhZ2VJZCk7XG4gICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIHBhZ2VJZCwgdW5kZWZpbmVkLCAoZGF0YSkgPT4ge1xuICAgICAgICBjYihkYXRhLnRleHQpO1xuICAgICAgfSk7XG4gICAgfTtcblxuXG4gICAgZnVuY3Rpb24gZ2V0UmVuYW1lRmlsZVBhdGgoKSB7XG4gICAgICB2YXIgbmV3RmlsZU5hbWUgPSAkc2NvcGUucmVuYW1lLm5ld0ZpbGVOYW1lO1xuICAgICAgcmV0dXJuICgkc2NvcGUucGFnZUlkICYmIG5ld0ZpbGVOYW1lKSA/IFVybEhlbHBlcnMuam9pbigkc2NvcGUucGFnZUlkLCBuZXdGaWxlTmFtZSkgOiBudWxsO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgaW50ZXJmYWNlIFdpa2lEaWFsb2cge1xuICAgIG9wZW46ICgpID0+IHt9O1xuICAgIGNsb3NlOiAoKSA9PiB7fTtcbiAgfVxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgUmVuYW1lRGlhbG9nT3B0aW9ucyB7XG4gICAgcmVuYW1lOiAoKSA9PiB7fTtcbiAgICBmaWxlRXhpc3RzOiAoKSA9PiB7fTtcbiAgICBmaWxlTmFtZTogKCkgPT4gU3RyaW5nO1xuICAgIGNhbGxiYWNrczogKCkgPT4gU3RyaW5nO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldFJlbmFtZURpYWxvZygkZGlhbG9nLCAkc2NvcGU6UmVuYW1lRGlhbG9nT3B0aW9ucyk6V2lraS5XaWtpRGlhbG9nIHtcbiAgICByZXR1cm4gJGRpYWxvZy5kaWFsb2coe1xuICAgICAgcmVzb2x2ZTogJHNjb3BlLFxuICAgICAgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9tb2RhbC9yZW5hbWVEaWFsb2cuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCJkaWFsb2dcIiwgIFwiY2FsbGJhY2tzXCIsIFwicmVuYW1lXCIsIFwiZmlsZUV4aXN0c1wiLCBcImZpbGVOYW1lXCIsICgkc2NvcGUsIGRpYWxvZywgY2FsbGJhY2tzLCByZW5hbWUsIGZpbGVFeGlzdHMsIGZpbGVOYW1lKSA9PiB7XG4gICAgICAgICRzY29wZS5yZW5hbWUgID0gcmVuYW1lO1xuICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cyAgPSBmaWxlRXhpc3RzO1xuICAgICAgICAkc2NvcGUuZmlsZU5hbWUgID0gZmlsZU5hbWU7XG5cbiAgICAgICAgJHNjb3BlLmNsb3NlID0gKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGRpYWxvZy5jbG9zZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5yZW5hbWVBbmRDbG9zZURpYWxvZyA9IGNhbGxiYWNrcztcblxuICAgICAgfV1cbiAgICB9KTtcbiAgfVxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgTW92ZURpYWxvZ09wdGlvbnMge1xuICAgIG1vdmU6ICgpID0+IHt9O1xuICAgIGZvbGRlck5hbWVzOiAoKSA9PiB7fTtcbiAgICBjYWxsYmFja3M6ICgpID0+IFN0cmluZztcbiAgfVxuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldE1vdmVEaWFsb2coJGRpYWxvZywgJHNjb3BlOk1vdmVEaWFsb2dPcHRpb25zKTpXaWtpLldpa2lEaWFsb2cge1xuICAgIHJldHVybiAkZGlhbG9nLmRpYWxvZyh7XG4gICAgICByZXNvbHZlOiAkc2NvcGUsXG4gICAgICB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL21vZGFsL21vdmVEaWFsb2cuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCJkaWFsb2dcIiwgIFwiY2FsbGJhY2tzXCIsIFwibW92ZVwiLCBcImZvbGRlck5hbWVzXCIsICgkc2NvcGUsIGRpYWxvZywgY2FsbGJhY2tzLCBtb3ZlLCBmb2xkZXJOYW1lcykgPT4ge1xuICAgICAgICAkc2NvcGUubW92ZSAgPSBtb3ZlO1xuICAgICAgICAkc2NvcGUuZm9sZGVyTmFtZXMgID0gZm9sZGVyTmFtZXM7XG5cbiAgICAgICAgJHNjb3BlLmNsb3NlID0gKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGRpYWxvZy5jbG9zZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5tb3ZlQW5kQ2xvc2VEaWFsb2cgPSBjYWxsYmFja3M7XG5cbiAgICAgIH1dXG4gICAgfSk7XG4gIH1cblxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgRGVsZXRlRGlhbG9nT3B0aW9ucyB7XG4gICAgY2FsbGJhY2tzOiAoKSA9PiBTdHJpbmc7XG4gICAgc2VsZWN0ZWRGaWxlSHRtbDogKCkgPT4gU3RyaW5nO1xuICAgIHdhcm5pbmc6ICgpID0+IHN0cmluZztcbiAgfVxuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldERlbGV0ZURpYWxvZygkZGlhbG9nLCAkc2NvcGU6RGVsZXRlRGlhbG9nT3B0aW9ucyk6V2lraS5XaWtpRGlhbG9nIHtcbiAgICByZXR1cm4gJGRpYWxvZy5kaWFsb2coe1xuICAgICAgcmVzb2x2ZTogJHNjb3BlLFxuICAgICAgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9tb2RhbC9kZWxldGVEaWFsb2cuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCJkaWFsb2dcIiwgIFwiY2FsbGJhY2tzXCIsIFwic2VsZWN0ZWRGaWxlSHRtbFwiLCBcIndhcm5pbmdcIiwgKCRzY29wZSwgZGlhbG9nLCBjYWxsYmFja3MsIHNlbGVjdGVkRmlsZUh0bWwsIHdhcm5pbmcpID0+IHtcblxuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRGaWxlSHRtbCA9IHNlbGVjdGVkRmlsZUh0bWw7XG5cbiAgICAgICAgJHNjb3BlLmNsb3NlID0gKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGRpYWxvZy5jbG9zZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5kZWxldGVBbmRDbG9zZURpYWxvZyA9IGNhbGxiYWNrcztcblxuICAgICAgICAkc2NvcGUud2FybmluZyA9IHdhcm5pbmc7XG4gICAgICB9XVxuICAgIH0pO1xuICB9XG5cblxuXG5cblxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5kaXJlY3RpdmUoJ3dpa2lIcmVmQWRqdXN0ZXInLCBbXCIkbG9jYXRpb25cIiwgKCRsb2NhdGlvbikgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgbGluazogKCRzY29wZSwgJGVsZW1lbnQsICRhdHRyKSA9PiB7XG5cbiAgICAgICAgJGVsZW1lbnQuYmluZCgnRE9NTm9kZUluc2VydGVkJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgdmFyIGF5cyA9ICRlbGVtZW50LmZpbmQoJ2EnKTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goYXlzLCAoYSkgPT4ge1xuICAgICAgICAgICAgaWYgKGEuaGFzQXR0cmlidXRlKCduby1hZGp1c3QnKSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhID0gJChhKTtcbiAgICAgICAgICAgIHZhciBocmVmID0gKGEuYXR0cignaHJlZicpIHx8IFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChocmVmKSB7XG4gICAgICAgICAgICAgIHZhciBmaWxlRXh0ZW5zaW9uID0gYS5hdHRyKCdmaWxlLWV4dGVuc2lvbicpO1xuICAgICAgICAgICAgICB2YXIgbmV3VmFsdWUgPSBXaWtpLmFkanVzdEhyZWYoJHNjb3BlLCAkbG9jYXRpb24sIGhyZWYsIGZpbGVFeHRlbnNpb24pO1xuICAgICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhLmF0dHIoJ2hyZWYnLCBuZXdWYWx1ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICB2YXIgaW1ncyA9ICRlbGVtZW50LmZpbmQoJ2ltZycpO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChpbWdzLCAoYSkgPT4ge1xuICAgICAgICAgICAgaWYgKGEuaGFzQXR0cmlidXRlKCduby1hZGp1c3QnKSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhID0gJChhKTtcbiAgICAgICAgICAgIHZhciBocmVmID0gKGEuYXR0cignc3JjJykgfHwgXCJcIikudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGhyZWYpIHtcbiAgICAgICAgICAgICAgaWYgKGhyZWYuc3RhcnRzV2l0aChcIi9cIikpIHtcbiAgICAgICAgICAgICAgICBocmVmID0gQ29yZS51cmwoaHJlZik7XG4gICAgICAgICAgICAgICAgYS5hdHRyKCdzcmMnLCBocmVmKTtcblxuICAgICAgICAgICAgICAgIC8vIGxldHMgYXZvaWQgdGhpcyBlbGVtZW50IGJlaW5nIHJlcHJvY2Vzc2VkXG4gICAgICAgICAgICAgICAgYS5hdHRyKCduby1hZGp1c3QnLCAndHJ1ZScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgX21vZHVsZS5kaXJlY3RpdmUoJ3dpa2lUaXRsZUxpbmtlcicsIFtcIiRsb2NhdGlvblwiLCAoJGxvY2F0aW9uKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICBsaW5rOiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHIpID0+IHtcbiAgICAgICAgdmFyIGxvYWRlZCA9IGZhbHNlO1xuXG4gICAgICAgIGZ1bmN0aW9uIG9mZnNldFRvcChlbGVtZW50cykge1xuICAgICAgICAgIGlmIChlbGVtZW50cykge1xuICAgICAgICAgICAgdmFyIG9mZnNldCA9IGVsZW1lbnRzLm9mZnNldCgpO1xuICAgICAgICAgICAgaWYgKG9mZnNldCkge1xuICAgICAgICAgICAgICByZXR1cm4gb2Zmc2V0LnRvcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzY3JvbGxUb0hhc2goKSB7XG4gICAgICAgICAgdmFyIGFuc3dlciA9IGZhbHNlO1xuICAgICAgICAgIHZhciBpZCA9ICRsb2NhdGlvbi5zZWFyY2goKVtcImhhc2hcIl07XG4gICAgICAgICAgcmV0dXJuIHNjcm9sbFRvSWQoaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2Nyb2xsVG9JZChpZCkge1xuICAgICAgICAgIHZhciBhbnN3ZXIgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgaWQgPSAkbG9jYXRpb24uc2VhcmNoKClbXCJoYXNoXCJdO1xuICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgdmFyIHNlbGVjdG9yID0gJ2FbbmFtZT1cIicgKyBpZCArICdcIl0nO1xuICAgICAgICAgICAgdmFyIHRhcmdldEVsZW1lbnRzID0gJGVsZW1lbnQuZmluZChzZWxlY3Rvcik7XG4gICAgICAgICAgICBpZiAodGFyZ2V0RWxlbWVudHMgJiYgdGFyZ2V0RWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHZhciBzY3JvbGxEdXJhdGlvbiA9IDE7XG4gICAgICAgICAgICAgIHZhciBkZWx0YSA9IG9mZnNldFRvcCgkKCRlbGVtZW50KSk7XG4gICAgICAgICAgICAgIHZhciB0b3AgPSBvZmZzZXRUb3AodGFyZ2V0RWxlbWVudHMpIC0gZGVsdGE7XG4gICAgICAgICAgICAgIGlmICh0b3AgPCAwKSB7XG4gICAgICAgICAgICAgICAgdG9wID0gMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvL2xvZy5pbmZvKFwic2Nyb2xsaW5nIHRvIGhhc2g6IFwiICsgaWQgKyBcIiB0b3A6IFwiICsgdG9wICsgXCIgZGVsdGE6XCIgKyBkZWx0YSk7XG4gICAgICAgICAgICAgICQoJ2JvZHksaHRtbCcpLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjcm9sbFRvcDogdG9wXG4gICAgICAgICAgICAgIH0sIHNjcm9sbER1cmF0aW9uKTtcbiAgICAgICAgICAgICAgYW5zd2VyID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vbG9nLmluZm8oXCJjb3VsZCBmaW5kIGVsZW1lbnQgZm9yOiBcIiArIHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZExpbmtzKGV2ZW50KSB7XG4gICAgICAgICAgdmFyIGhlYWRpbmdzID0gJGVsZW1lbnQuZmluZCgnaDEsaDIsaDMsaDQsaDUsaDYsaDcnKTtcbiAgICAgICAgICB2YXIgdXBkYXRlZCA9IGZhbHNlO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChoZWFkaW5ncywgKGhlKSA9PiB7XG4gICAgICAgICAgICB2YXIgaDEgPSAkKGhlKTtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHRyeSBmaW5kIGEgY2hpbGQgaGVhZGVyXG4gICAgICAgICAgICB2YXIgYSA9IGgxLnBhcmVudChcImFcIik7XG4gICAgICAgICAgICBpZiAoIWEgfHwgIWEubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHZhciB0ZXh0ID0gaDEudGV4dCgpO1xuICAgICAgICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSB0ZXh0LnJlcGxhY2UoLyAvZywgXCItXCIpO1xuICAgICAgICAgICAgICAgIHZhciBwYXRoV2l0aEhhc2ggPSBcIiNcIiArICRsb2NhdGlvbi5wYXRoKCkgKyBcIj9oYXNoPVwiICsgdGFyZ2V0O1xuICAgICAgICAgICAgICAgIHZhciBsaW5rID0gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgcGF0aFdpdGhIYXNoLCBbJ2hhc2gnXSk7XG5cbiAgICAgICAgICAgICAgICAvLyBsZXRzIHdyYXAgdGhlIGhlYWRpbmcgaW4gYSBsaW5rXG4gICAgICAgICAgICAgICAgdmFyIG5ld0EgPSAkKCc8YSBuYW1lPVwiJyArIHRhcmdldCArICdcIiBocmVmPVwiJyArIGxpbmsgKyAnXCIgbmctY2xpY2s9XCJvbkxpbmtDbGljaygpXCI+PC9hPicpO1xuICAgICAgICAgICAgICAgIG5ld0Eub24oXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbFRvSWQodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBuZXdBLmluc2VydEJlZm9yZShoMSk7XG4gICAgICAgICAgICAgICAgaDEuZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgbmV3QS5hcHBlbmQoaDEpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKHVwZGF0ZWQgJiYgIWxvYWRlZCkge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChzY3JvbGxUb0hhc2goKSkge1xuICAgICAgICAgICAgICAgIGxvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvbkV2ZW50SW5zZXJ0ZWQoZXZlbnQpIHtcbiAgICAgICAgICAvLyBhdm9pZCBhbnkgbW9yZSBldmVudHMgd2hpbGUgd2UgZG8gb3VyIHRoaW5nXG4gICAgICAgICAgJGVsZW1lbnQudW5iaW5kKCdET01Ob2RlSW5zZXJ0ZWQnLCBvbkV2ZW50SW5zZXJ0ZWQpO1xuICAgICAgICAgIGFkZExpbmtzKGV2ZW50KTtcbiAgICAgICAgICAkZWxlbWVudC5iaW5kKCdET01Ob2RlSW5zZXJ0ZWQnLCBvbkV2ZW50SW5zZXJ0ZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgJGVsZW1lbnQuYmluZCgnRE9NTm9kZUluc2VydGVkJywgb25FdmVudEluc2VydGVkKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XSk7XG5cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cblxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgRGV2ZWxvcGVyLmN1c3RvbVByb2plY3RTdWJUYWJGYWN0b3JpZXMucHVzaChcbiAgICAoY29udGV4dCkgPT4ge1xuICAgICAgdmFyIHByb2plY3RMaW5rID0gY29udGV4dC5wcm9qZWN0TGluaztcbiAgICAgIHZhciB3aWtpTGluayA9IG51bGw7XG4gICAgICBpZiAocHJvamVjdExpbmspIHtcbiAgICAgICAgd2lraUxpbmsgPSBVcmxIZWxwZXJzLmpvaW4ocHJvamVjdExpbmssIFwid2lraVwiLCBcInZpZXdcIik7XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc1ZhbGlkOiAoKSA9PiB3aWtpTGluayAmJiBEZXZlbG9wZXIuZm9yZ2VSZWFkeUxpbmsoKSxcbiAgICAgICAgaHJlZjogd2lraUxpbmssXG4gICAgICAgIGxhYmVsOiBcIlNvdXJjZVwiLFxuICAgICAgICB0aXRsZTogXCJCcm93c2UgdGhlIHNvdXJjZSBjb2RlIG9mIHRoaXMgcHJvamVjdFwiXG4gICAgICB9O1xuICAgIH0pO1xuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNvdXJjZUJyZWFkY3J1bWJzKCRzY29wZSkge1xuICAgIHZhciBzb3VyY2VMaW5rID0gJHNjb3BlLiR2aWV3TGluayB8fCBVcmxIZWxwZXJzLmpvaW4oc3RhcnRMaW5rKCRzY29wZSksIFwidmlld1wiKTtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICBsYWJlbDogXCJTb3VyY2VcIixcbiAgICAgICAgaHJlZjogc291cmNlTGluayxcbiAgICAgICAgdGl0bGU6IFwiQnJvd3NlIHRoZSBzb3VyY2UgY29kZSBvZiB0aGlzIHByb2plY3RcIlxuICAgICAgfVxuICAgIF1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFZGl0aW5nQnJlYWRjcnVtYigkc2NvcGUpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxhYmVsOiBcIkVkaXRpbmdcIixcbiAgICAgICAgdGl0bGU6IFwiRWRpdGluZyB0aGlzIGZpbGVcIlxuICAgICAgfTtcbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICAvKipcbiAgICogQGNsYXNzIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAqL1xuICBleHBvcnQgY2xhc3MgR2l0V2lraVJlcG9zaXRvcnkge1xuICAgIHB1YmxpYyBkaXJlY3RvcnlQcmVmaXggPSBcIlwiO1xuICAgIHByaXZhdGUgJGh0dHA7XG4gICAgcHJpdmF0ZSBjb25maWc7XG4gICAgcHJpdmF0ZSBiYXNlVXJsO1xuICAgIHByaXZhdGUgcHJvamVjdElkO1xuXG5cbiAgICBjb25zdHJ1Y3Rvcigkc2NvcGUpIHtcbiAgICAgIHZhciBGb3JnZUFwaVVSTCA9IEt1YmVybmV0ZXMuaW5qZWN0KFwiRm9yZ2VBcGlVUkxcIik7XG4gICAgICB0aGlzLiRodHRwID0gS3ViZXJuZXRlcy5pbmplY3QoXCIkaHR0cFwiKTtcbiAgICAgIHRoaXMuY29uZmlnID0gRm9yZ2UuY3JlYXRlSHR0cENvbmZpZygpO1xuICAgICAgdmFyIG93bmVyID0gJHNjb3BlLm93bmVyO1xuICAgICAgdmFyIHJlcG9OYW1lID0gJHNjb3BlLnJlcG9JZDtcbiAgICAgIHZhciBwcm9qZWN0SWQgPSAkc2NvcGUucHJvamVjdElkO1xuICAgICAgdGhpcy5wcm9qZWN0SWQgPSBwcm9qZWN0SWQ7XG4gICAgICB2YXIgbnMgPSAkc2NvcGUubmFtZXNwYWNlIHx8IEt1YmVybmV0ZXMuY3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoKTtcbiAgICAgIHRoaXMuYmFzZVVybCA9IFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJyZXBvcy9wcm9qZWN0XCIsIG5zLCBwcm9qZWN0SWQpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRQYWdlKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBvYmplY3RJZDpzdHJpbmcsIGZuKSB7XG4gICAgICAvLyBUT0RPIGlnbm9yaW5nIG9iamVjdElkXG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJjb250ZW50XCIsIHBhdGggfHwgXCIvXCIpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBkZXRhaWxzOiBhbnkgPSBudWxsO1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goZGF0YSwgKGZpbGUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWZpbGUuZGlyZWN0b3J5ICYmIGZpbGUudHlwZSA9PT0gXCJkaXJcIikge1xuICAgICAgICAgICAgICAgICAgZmlsZS5kaXJlY3RvcnkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGRldGFpbHMgPSB7XG4gICAgICAgICAgICAgICAgZGlyZWN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBkYXRhXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGRldGFpbHMgPSBkYXRhO1xuICAgICAgICAgICAgICB2YXIgY29udGVudCA9IGRhdGEuY29udGVudDtcbiAgICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICBkZXRhaWxzLnRleHQgPSBjb250ZW50LmRlY29kZUJhc2U2NCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmbihkZXRhaWxzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBwdXRQYWdlKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBjb250ZW50czpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgdmFyIGJvZHkgPSBjb250ZW50cztcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcImNvbnRlbnRcIiwgcGF0aCB8fCBcIi9cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBoaXN0b3J5IG9mIHRoZSByZXBvc2l0b3J5IG9yIGEgc3BlY2lmaWMgZGlyZWN0b3J5IG9yIGZpbGUgcGF0aFxuICAgICAqIEBtZXRob2QgaGlzdG9yeVxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYnJhbmNoXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gbGltaXRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgaGlzdG9yeShicmFuY2g6c3RyaW5nLCBvYmplY3RJZDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBsaW1pdDpudW1iZXIsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGxpbWl0KSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJsaW1pdD1cIiArIGxpbWl0O1xuICAgICAgfVxuICAgICAgdmFyIGNvbW1pdElkID0gb2JqZWN0SWQgfHwgYnJhbmNoO1xuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJoaXN0b3J5XCIsIGNvbW1pdElkLCBwYXRoKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgY29tbWl0SW5mbyhjb21taXRJZDpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJjb21taXRJbmZvXCIsIGNvbW1pdElkKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgY29tbWl0RGV0YWlsKGNvbW1pdElkOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImNvbW1pdERldGFpbFwiLCBjb21taXRJZCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGNvbW1pdFRyZWUoY29tbWl0SWQ6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiY29tbWl0VHJlZVwiLCBjb21taXRJZCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBhIGRpZmYgb24gdGhlIHZlcnNpb25zXG4gICAgICogQG1ldGhvZCBkaWZmXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RJZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBiYXNlT2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBkaWZmKG9iamVjdElkOnN0cmluZywgYmFzZU9iamVjdElkOnN0cmluZywgcGF0aDpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdmFyIGNvbmZpZzogYW55ID0gRm9yZ2UuY3JlYXRlSHR0cENvbmZpZygpO1xuICAgICAgY29uZmlnLnRyYW5zZm9ybVJlc3BvbnNlID0gKGRhdGEsIGhlYWRlcnNHZXR0ZXIsIHN0YXR1cykgPT4ge1xuICAgICAgICBsb2cuaW5mbyhcImdvdCBkaWZmIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgfTtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiZGlmZlwiLCBvYmplY3RJZCwgYmFzZU9iamVjdElkLCBwYXRoKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIHZhciBkZXRhaWxzID0ge1xuICAgICAgICAgICAgdGV4dDogZGF0YSxcbiAgICAgICAgICAgIGZvcm1hdDogXCJkaWZmXCIsXG4gICAgICAgICAgICBkaXJlY3Rvcnk6IGZhbHNlXG4gICAgICAgICAgfTtcbiAgICAgICAgICBmbihkZXRhaWxzKTtcbiAgICAgICAgfSxcbiAgICAgICAgbnVsbCwgY29uZmlnKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgbGlzdCBvZiBicmFuY2hlc1xuICAgICAqIEBtZXRob2QgYnJhbmNoZXNcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGJyYW5jaGVzKGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdGhpcy5kb0dldChcImxpc3RCcmFuY2hlc1wiLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBleGlzdHMoYnJhbmNoOnN0cmluZywgcGF0aDpzdHJpbmcsIGZuKTogQm9vbGVhbiB7XG4gICAgICB2YXIgYW5zd2VyID0gZmFsc2U7XG4gICAgICB0aGlzLmdldFBhZ2UoYnJhbmNoLCBwYXRoLCBudWxsLCAoZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZGF0YS5kaXJlY3RvcnkpIHtcbiAgICAgICAgICBpZiAoZGF0YS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgbG9nLmluZm8oXCJleGlzdHMgXCIgKyBwYXRoICsgXCIgYW5zd2VyID0gXCIgKyBhbnN3ZXIpO1xuICAgICAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKGZuKSkge1xuICAgICAgICAgIGZuKGFuc3dlcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmV2ZXJ0VG8oYnJhbmNoOnN0cmluZywgb2JqZWN0SWQ6c3RyaW5nLCBibG9iUGF0aDpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgaWYgKCFjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBcIiArIGJsb2JQYXRoICsgXCIgY29tbWl0IFwiICsgKG9iamVjdElkIHx8IGJyYW5jaCk7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IFwiXCI7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJyZXZlcnRcIiwgb2JqZWN0SWQsIGJsb2JQYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVuYW1lKGJyYW5jaDpzdHJpbmcsIG9sZFBhdGg6c3RyaW5nLCAgbmV3UGF0aDpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgaWYgKCFjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIGNvbW1pdE1lc3NhZ2UgPSBcIlJlbmFtaW5nIHBhZ2UgXCIgKyBvbGRQYXRoICsgXCIgdG8gXCIgKyBuZXdQYXRoO1xuICAgICAgfVxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgaWYgKG9sZFBhdGgpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm9sZD1cIiArIGVuY29kZVVSSUNvbXBvbmVudChvbGRQYXRoKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gXCJcIjtcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcIm12XCIsIG5ld1BhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyByZW1vdmVQYWdlKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW1vdmluZyBwYWdlIFwiICsgcGF0aDtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gXCJcIjtcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcInJtXCIsIHBhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyByZW1vdmVQYWdlcyhicmFuY2g6c3RyaW5nLCBwYXRoczpBcnJheTxzdHJpbmc+LCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW1vdmluZyBwYWdlXCIgKyAocGF0aHMubGVuZ3RoID4gMSA/IFwic1wiIDogXCJcIikgKyBcIiBcIiArIHBhdGhzLmpvaW4oXCIsIFwiKTtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gcGF0aHM7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJybVwiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuXG4gICAgcHJpdmF0ZSBkb0dldChwYXRoLCBxdWVyeSwgc3VjY2Vzc0ZuLCBlcnJvckZuID0gbnVsbCwgY29uZmlnID0gbnVsbCkge1xuICAgICAgdmFyIHVybCA9IEZvcmdlLmNyZWF0ZUh0dHBVcmwodGhpcy5wcm9qZWN0SWQsIFVybEhlbHBlcnMuam9pbih0aGlzLmJhc2VVcmwsIHBhdGgpKTtcbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB1cmwgKz0gXCImXCIgKyBxdWVyeTtcbiAgICAgIH1cbiAgICAgIGlmICghZXJyb3JGbikge1xuICAgICAgICBlcnJvckZuID0gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCEgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgIH1cbiAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IHRoaXMuY29uZmlnO1xuICAgICAgfVxuICAgICAgdGhpcy4kaHR0cC5nZXQodXJsLCBjb25maWcpLlxuICAgICAgICBzdWNjZXNzKHN1Y2Nlc3NGbikuXG4gICAgICAgIGVycm9yKGVycm9yRm4pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZG9Qb3N0KHBhdGgsIHF1ZXJ5LCBib2R5LCBzdWNjZXNzRm4sIGVycm9yRm4gPSBudWxsKSB7XG4gICAgICB2YXIgdXJsID0gRm9yZ2UuY3JlYXRlSHR0cFVybCh0aGlzLnByb2plY3RJZCwgVXJsSGVscGVycy5qb2luKHRoaXMuYmFzZVVybCwgcGF0aCkpO1xuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHVybCArPSBcIiZcIiArIHF1ZXJ5O1xuICAgICAgfVxuICAgICAgaWYgKCFlcnJvckZuKSB7XG4gICAgICAgIGVycm9yRm4gPSAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkISBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgfVxuICAgICAgdGhpcy4kaHR0cC5wb3N0KHVybCwgYm9keSwgdGhpcy5jb25maWcpLlxuICAgICAgICBzdWNjZXNzKHN1Y2Nlc3NGbikuXG4gICAgICAgIGVycm9yKGVycm9yRm4pO1xuICAgIH1cblxuXG4gICAgcHJpdmF0ZSBkb1Bvc3RGb3JtKHBhdGgsIHF1ZXJ5LCBib2R5LCBzdWNjZXNzRm4sIGVycm9yRm4gPSBudWxsKSB7XG4gICAgICB2YXIgdXJsID0gRm9yZ2UuY3JlYXRlSHR0cFVybCh0aGlzLnByb2plY3RJZCwgVXJsSGVscGVycy5qb2luKHRoaXMuYmFzZVVybCwgcGF0aCkpO1xuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHVybCArPSBcIiZcIiArIHF1ZXJ5O1xuICAgICAgfVxuICAgICAgaWYgKCFlcnJvckZuKSB7XG4gICAgICAgIGVycm9yRm4gPSAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkISBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgfVxuICAgICAgdmFyIGNvbmZpZyA9IEZvcmdlLmNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgIGlmICghY29uZmlnLmhlYWRlcnMpIHtcbiAgICAgICAgY29uZmlnLmhlYWRlcnMgPSB7fTtcbiAgICAgIH1cbiAgICAgIGNvbmZpZy5oZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdID0gXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9dXRmLThcIjtcblxuICAgICAgdGhpcy4kaHR0cC5wb3N0KHVybCwgYm9keSwgY29uZmlnKS5cbiAgICAgICAgc3VjY2VzcyhzdWNjZXNzRm4pLlxuICAgICAgICBlcnJvcihlcnJvckZuKTtcbiAgICB9XG5cblxuXG4gICAgcHVibGljIGNvbXBsZXRlUGF0aChicmFuY2g6c3RyaW5nLCBjb21wbGV0aW9uVGV4dDpzdHJpbmcsIGRpcmVjdG9yaWVzT25seTpib29sZWFuLCBmbikge1xuLypcbiAgICAgIHJldHVybiB0aGlzLmdpdCgpLmNvbXBsZXRlUGF0aChicmFuY2gsIGNvbXBsZXRpb25UZXh0LCBkaXJlY3Rvcmllc09ubHksIGZuKTtcbiovXG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBmdWxsIHBhdGggdG8gdXNlIGluIHRoZSBnaXQgcmVwb1xuICAgICAqIEBtZXRob2QgZ2V0UGF0aFxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEByZXR1cm4ge1N0cmluZ3tcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0UGF0aChwYXRoOnN0cmluZykge1xuICAgICAgdmFyIGRpcmVjdG9yeVByZWZpeCA9IHRoaXMuZGlyZWN0b3J5UHJlZml4O1xuICAgICAgcmV0dXJuIChkaXJlY3RvcnlQcmVmaXgpID8gZGlyZWN0b3J5UHJlZml4ICsgcGF0aCA6IHBhdGg7XG4gICAgfVxuXG4gICAgcHVibGljIGdldExvZ1BhdGgocGF0aDpzdHJpbmcpIHtcbiAgICAgIHJldHVybiBDb3JlLnRyaW1MZWFkaW5nKHRoaXMuZ2V0UGF0aChwYXRoKSwgXCIvXCIpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBjb250ZW50cyBvZiBhIGJsb2JQYXRoIGZvciBhIGdpdmVuIGNvbW1pdCBvYmplY3RJZFxuICAgICAqIEBtZXRob2QgZ2V0Q29udGVudFxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYmxvYlBhdGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0Q29udGVudChvYmplY3RJZDpzdHJpbmcsIGJsb2JQYXRoOnN0cmluZywgZm4pIHtcbi8qXG4gICAgICB2YXIgZnVsbFBhdGggPSB0aGlzLmdldExvZ1BhdGgoYmxvYlBhdGgpO1xuICAgICAgdmFyIGdpdCA9IHRoaXMuZ2l0KCk7XG4gICAgICBpZiAoZ2l0KSB7XG4gICAgICAgIGdpdC5nZXRDb250ZW50KG9iamVjdElkLCBmdWxsUGF0aCwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGdpdDtcbiovXG4gICAgfVxuXG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgSlNPTiBjb250ZW50cyBvZiB0aGUgcGF0aCB3aXRoIG9wdGlvbmFsIG5hbWUgd2lsZGNhcmQgYW5kIHNlYXJjaFxuICAgICAqIEBtZXRob2QganNvbkNoaWxkQ29udGVudHNcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVdpbGRjYXJkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHNlYXJjaFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBqc29uQ2hpbGRDb250ZW50cyhwYXRoOnN0cmluZywgbmFtZVdpbGRjYXJkOnN0cmluZywgc2VhcmNoOnN0cmluZywgZm4pIHtcbi8qXG4gICAgICB2YXIgZnVsbFBhdGggPSB0aGlzLmdldExvZ1BhdGgocGF0aCk7XG4gICAgICB2YXIgZ2l0ID0gdGhpcy5naXQoKTtcbiAgICAgIGlmIChnaXQpIHtcbiAgICAgICAgZ2l0LnJlYWRKc29uQ2hpbGRDb250ZW50KGZ1bGxQYXRoLCBuYW1lV2lsZGNhcmQsIHNlYXJjaCwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGdpdDtcbiovXG4gICAgfVxuXG5cbiAgICBwdWJsaWMgZ2l0KCkge1xuLypcbiAgICAgIHZhciByZXBvc2l0b3J5ID0gdGhpcy5mYWN0b3J5TWV0aG9kKCk7XG4gICAgICBpZiAoIXJlcG9zaXRvcnkpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJObyByZXBvc2l0b3J5IHlldCEgVE9ETyB3ZSBzaG91bGQgdXNlIGEgbG9jYWwgaW1wbCFcIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVwb3NpdG9yeTtcbiovXG4gICAgfVxuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCB2YXIgVG9wTGV2ZWxDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5Ub3BMZXZlbENvbnRyb2xsZXJcIiwgWyckc2NvcGUnLCAnJHJvdXRlJywgJyRyb3V0ZVBhcmFtcycsICgkc2NvcGUsICRyb3V0ZSwgJHJvdXRlUGFyYW1zKSA9PiB7XG5cbiAgfV0pO1xuXG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=

angular.module("fabric8-console-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/main/html/about.html","<div ng-controller=\"Main.About\">\n  <p>Version: {{info.version}}</p>\n  <p>Commit ID: {{info.commitId}}</p>\n  <table class=\"table table-striped\">\n    <thead>\n      <tr>\n        <th>\n          Name\n        </th>\n        <th>\n          Version\n        </th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr ng-repeat=\"(key, info) in info.packages\">\n        <td>{{key}}</td>\n        <td>{{info.version || \'--\'}}</td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n");
$templateCache.put("plugins/forge/html/command.html","<div ng-controller=\"Forge.CommandController\">\n  <script type=\"text/ng-template\" id=\"devOpsPipelineChooser.html\">\n    <div ng-controller=\"Forge.PipelinePicker\">\n      <div class=\"col-sm-12\">\n        <div class=\"\">\n          <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                         css-class=\"input-xxlarge\"\n                         placeholder=\"Filter pipelines...\"></hawtio-filter>\n        </div>\n      </div>\n      <div class=\"col-sm-12 pipeline-chooser-panel-border\">\n        <div class=\"pipeline-chooser-panel\">\n          <table class=\"table table-condensed table-striped pipeline-chooser\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n\n      <div class=\"form-group\">\n        <label class=\"col-sm-2 control-label\">Pipeline</label>\n\n        <div class=\"col-sm-10\">\n          <!--\n                    <select ng-options=\"item as item.label for item in pipelines track by item.label\"\n                            ng-model=\"pipelineModel.current\"></select>\n                    <input type=\"text\" class=\"form-control\" ng-model=\"pipelineModel.value\" typeahead=\"item.label for item in pipelines\">\n          -->\n          <input type=\"text\" ng-disabled=\"true\" class=\"form-control\" ng-model=\"selected.label\">\n        </div>\n      </div>\n\n      <div class=\"form-group\">\n        <label class=\"col-sm-2 control-label\">Description</label>\n\n        <div class=\"col-sm-10\">\n          <div class=\"panel panel-default\">\n            <div class=\"panel-body\">\n              <div ng-bind-html=\"html\"></div>\n<!--\n              <div compile=\"html\"></div>\n-->\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </script>\n  <script type=\"text/ng-template\" id=\"devOpsPipelineChooserStages.html\">\n    <div class=\"ngCellText\">\n      <span ng-repeat=\"value in row.entity.stages track by $index\">\n        <span class=\"badge\">{{value}}</span>\n      </span>\n    </div>\n  </script>\n  <script type=\"text/ng-template\" id=\"devOpsPipelineChooserEnvironments.html\">\n    <div class=\"ngCellText\">\n      <span ng-repeat=\"value in row.entity.environments track by $index\">\n        <span class=\"badge\">{{value}}</span>\n      </span>\n    </div>\n  </script>\n\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <h3>{{schema.info.description}}</h3>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"executing\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-info\">executing...\n        <i class=\"fa fa-spinner fa-spin\"></i>\n      </p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response\">\n    <div class=\"col-md-12\">\n      <p ng-show=\"response.message\" ng-class=\"responseClass\"><span class=\"response-message\">{{response.message}}</span>\n      </p>\n\n      <p ng-show=\"response.output\" ng-class=\"responseClass\"><span class=\"response-output\">{{response.output}}</span></p>\n\n      <p ng-show=\"response.err\" ng-class=\"bg-warning\"><span class=\"response-err\">{{response.err}}</span></p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response && !invalid\">\n    <div class=\"col-md-12\">\n      <a class=\"btn btn-primary\" href=\"{{completedLink}}\">Done</a>\n      <a class=\"btn btn-default\" ng-click=\"response = null\" ng-hide=\"wizardCompleted\">Hide</a>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"validationError\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-danger\">{{validationError}}</p>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched && !wizardCompleted\">\n        <div hawtio-form-2=\"schema\" entity=\'entity\'></div>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\" ng-hide=\"wizardCompleted\">\n    <div class=\"col-md-2\">\n    </div>\n    <div class=\"col-md-2\">\n      <button class=\"btn btn-primary\"\n              title=\"Perform this command\"\n              ng-show=\"fetched\"\n              ng-disabled=\"executing\"\n              ng-click=\"execute()\">\n        Execute\n      </button>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/commands.html","<div class=\"row\" ng-controller=\"Forge.CommandsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\" ng-show=\"commands.length\">\n      <span ng-show=\"!id\">\n        Command: <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                                css-class=\"input-xxlarge\"\n                                placeholder=\"Filter commands...\"\n                                save-as=\"fabric8-forge-command-filter\"></hawtio-filter>\n      </span>\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched\">\n        <div ng-hide=\"commands.length\" class=\"align-center\">\n          <p class=\"alert alert-info\">There are no commands available!</p>\n        </div>\n        <div ng-show=\"commands.length\">\n        </div>\n        <div ng-show=\"mode == \'table\'\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && commands.length && mode != \'table\'\">\n    <div class=\"row\">\n      <ul>\n        <li class=\"no-list command-selector-folder\" ng-repeat=\"folder in commandSelector.folders\"\n            ng-show=\"commandSelector.showFolder(folder)\">\n          <div class=\"expandable\" ng-class=\"commandSelector.isOpen(folder)\">\n            <div title=\"{{folder.name}}\" class=\"title\">\n              <i class=\"expandable-indicator folder\"></i> <span class=\"folder-title\"\n                                                                ng-show=\"folder.name\">{{folder.name}}</span><span\n                    class=\"folder-title\" ng-hide=\"folder.name\">Uncategorized</span>\n            </div>\n            <div class=\"expandable-body\">\n              <ul>\n                <li class=\"no-list command\" ng-repeat=\"command in folder.commands\"\n                    ng-show=\"commandSelector.showCommand(command)\">\n                  <div class=\"inline-block command-selector-name\"\n                       ng-class=\"commandSelector.getSelectedClass(command)\">\n                    <span class=\"contained c-max\">\n                      <a href=\"{{command.$link}}\"\n                         title=\"{{command.description}}\">\n                        <span class=\"command-name\">{{command.$shortName}}</span>\n                      </a>\n                    </span>\n                  </div>\n                </li>\n              </ul>\n            </div>\n          </div>\n        </li>\n      </ul>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/createProject.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n\n  <div ng-show=\"model.fetched && $runningCDPipeline && (!$gogsLink || !$forgeLink)\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <div class=\"row\">\n          <div class=\"col-md-12\">\n            <p>Waiting for the <b>CD Pipeline</b> application to startup: &nbsp;&nbsp;<i class=\"fa fa-spinner fa-spin\"></i>\n            </p>\n\n            <ul class=\"pending-pods\">\n              <li class=\"ngCellText\" ng-repeat=\"item in $requiredRCs\">\n                <a ng-href=\"{{item | kubernetesPageLink}}\">\n                  <img class=\"app-icon-small\" ng-src=\"{{item.$iconUrl}}\" ng-show=\"item.$iconUrl\">\n                  <b>{{item.metadata.name}}</b>\n                </a>\n                <a ng-show=\"item.$podCounters.podsLink\" href=\"{{item.$podCounters.podsLink}}\" title=\"View pods\">\n                  <span ng-show=\"item.$podCounters.ready\" class=\"badge badge-success\">{{item.$podCounters.ready}}</span>\n                  <span ng-show=\"item.$podCounters.valid\" class=\"badge badge-info\">{{item.$podCounters.valid}}</span>\n                  <span ng-show=\"item.$podCounters.waiting\" class=\"badge\">{{item.$podCounters.waiting}}</span>\n                  <span ng-show=\"item.$podCounters.error\" class=\"badge badge-warning\">{{item.$podCounters.error}}</span>\n                </a>\n              </li>\n            </ul>\n            <p>Please be patient while the above pods are ready!</p>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && !$runningCDPipeline\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <div class=\"row\">\n          <div class=\"col-md-12\">\n            <p class=\"text-warning\">You are not running the <b>CD Pipeline</b> application in this workspace.</p>\n\n            <p>To be able to create new projects please run it!</p>\n\n            <p><a href=\"{{$runCDPipelineLink}}\" class=\"btn btn-lg btn-default\">Run the <b>CD Pipeline</b></a></p>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-hide=\"model.fetched || !$gogsLink ||!$forgeLink\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && $gogsLink && $forgeLink\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <div class=\"row\">\n          <div class=\"col-md-6\">\n            <p class=\"align-center\">\n              <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/importProject\"\n                 title=\"Import an existing project from a git source control repository\">\n                <i class=\"fa fa-plus\"></i> Import Project from Git\n              </a>\n            </p>\n\n            <p class=\"align-center\">\n              Import a project which already exists in a git repository\n            </p>\n          </div>\n\n          <div class=\"col-md-6\">\n            <div ng-show=\"sourceSecret\">\n              <p class=\"align-center\">\n                <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n                   title=\"Create a new project in this workspace using a wizard\">\n                  <i class=\"fa fa-plus\"></i> Create Java Project using Wizard\n                </a>\n              </p>\n\n              <p class=\"align-center\">\n                This wizard guides you though creating a new Java project from our library of sample projects with the configured\n                <a href=\"{{$workspaceLink}}/forge/secrets\"\n                   title=\"View or change the secret used to create new projects\">\n                  source secret\n                </a>\n              </p>\n            </div>\n            <div ng-hide=\"sourceSecret\">\n              <p class=\"align-center\">\n                <a class=\"btn btn-default btn-lg\" href=\"{{$workspaceLink}}/forge/secrets\"\n                   title=\"Setup the secrets so that you can create new projects and git repositories in the Gogs service\">\n                  <i class=\"fa fa-pencil-square-o\"></i> Setup Gogs Secret\n                </a>\n              </p>\n\n              <p class=\"align-center\">\n                Setup a secret so that you can create new projects and git repositories in the gogs service.\n              </p>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/layoutForge.html","<script type=\"text/ng-template\" id=\"idTemplate.html\">\n  <div class=\"ngCellText\">\n    <a href=\"\"\n       title=\"Execute command {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$link}}\">\n      {{row.entity.name}}</a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoTemplate.html\">\n  <div class=\"ngCellText\">\n    <a title=\"View repository {{row.entity.name}}\"\n       ng-href=\"/forge/repos/{{row.entity.name}}\">\n      {{row.entity.name}}\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoActionsTemplate.html\">\n  <div class=\"ngCellText\">\n    <a ng-show=\"row.entity.$openProjectLink\"\n       class=\"btn btn-primary\" target=\"editor\"\n       title=\"Open project {{row.entity.name}} in an editor\"\n       ng-href=\"{{row.entity.$openProjectLink}}\">\n      <i class=\"fa fa-pencil-square\"></i>\n      Open\n    </a>\n    <a ng-show=\"row.entity.html_url\"\n       class=\"btn btn-default\" target=\"browse\"\n       title=\"Browse project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.html_url}}\">\n      <i class=\"fa fa-external-link\"></i>\n      Repository\n    </a>\n    <a ng-show=\"row.entity.$buildsLink\"\n       class=\"btn btn-default\" target=\"builds\"\n       title=\"View builds for this repository {{row.entity.owner.username}}/{{row.entity.name}}\"\n       ng-href=\"{{row.entity.$buildsLink}}\">\n      <i class=\"fa fa-cog\"></i>\n      Builds\n    </a>\n    <a ng-show=\"row.entity.$commandsLink\"\n       class=\"btn btn-default\"\n       title=\"Commands for project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$commandsLink}}\">\n      <i class=\"fa fa-play-circle\"></i>\n      Run...\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"categoryTemplate.html\">\n  <div class=\"ngCellText\">\n    <span class=\"pod-label badge\"\n          class=\"background-light-grey mouse-pointer\">{{row.entity.category}}</span>\n  </div>\n</script>\n\n<div class=\"row\">\n  <div class=\"wiki-icon-view\">\n    <div class=\"row forge-view\" ng-view></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repo.html","<div class=\"row\" ng-controller=\"Forge.RepoController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\"\n              href=\"/forge/repos\"><i class=\"fa fa-list\"></i></a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.$commandsLink\"\n         class=\"btn btn-default pull-right\"\n         title=\"Commands for project {{entity.name}}\"\n         ng-href=\"{{entity.$commandsLink}}\">\n        <i class=\"fa fa-play-circle\"></i>\n        Run...\n      </a>\n      <span class=\"pull-right\" ng-show=\"entity.$buildsLink\">&nbsp;</span>\n      <a ng-show=\"entity.$buildsLink\"\n         class=\"btn btn-primary pull-right\" target=\"builds\"\n         title=\"View builds for this repository {{entity.owner.username}}/{{entity.name}}\"\n         ng-href=\"{{entity.$buildsLink}}\">\n        <i class=\"fa fa-cog\"></i>\n        Builds\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.html_url\"\n         class=\"btn btn-default pull-right\" target=\"browse\"\n         title=\"Browse project {{entity.name}}\"\n         ng-href=\"{{entity.html_url}}\">\n        <i class=\"fa fa-external-link\"></i>\n        Browse\n      </a>\n    </div>\n  </div>\n\n  <div ng-hide=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n  <div ng-show=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <h3 title=\"repository for {{entity.owner.username}}\">\n          <span ng-show=\"entity.owner.username\">\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              <img src=\"{{entity.owner.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"entity.owner.avatar_url\">\n            </a>\n            &nbsp;\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              {{entity.owner.username}}\n            </a>\n             &nbsp;/&nbsp;\n          </span>\n          {{entity.name}}\n        </h3>\n      </div>\n    </div>\n\n    <div class=\"git-clone-tabs\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div class=\"tabbable\">\n            <div value=\"ssh\" class=\"tab-pane\" title=\"SSH\" ng-show=\"entity.ssh_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>ssh</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.ssh_url}}</code>\n                </pre>\n              </div>\n            </div>\n\n            <div value=\"http\" class=\"tab-pane\" title=\"HTTP\" ng-show=\"entity.clone_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>http</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.clone_url}}</code>\n                </pre>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repos.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                     ng-show=\"projects.length\"\n                     css-class=\"input-xxlarge\"\n                     placeholder=\"Filter repositories...\"></hawtio-filter>\n      <!--\n            <span class=\"pull-right\">&nbsp;</span>\n            <button ng-show=\"fetched\"\n                    class=\"btn btn-danger pull-right\"\n                    ng-disabled=\"tableConfig.selectedItems.length == 0\"\n                    ng-click=\"delete(tableConfig.selectedItems)\">\n              <i class=\"fa fa-remove\"></i> Delete\n            </button>\n      -->\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-primary pull-right\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n         ng-show=\"login.loggedIn\"\n         title=\"Create a new project and repository\">\n        <i class=\"fa fa-plus\"></i> Create Project</a>\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\" ng-show=\"login.loggedIn\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n      <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n        <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n        {{login.user}}\n      </div>\n    </div>\n  </div>\n\n\n  <div ng-show=\"!login.authHeader || login.relogin\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n          <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"fetched || !login.authHeader || login.relogin\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && login.authHeader\">\n    <div ng-hide=\"projects.length\" class=\"align-center\">\n      <div class=\"padded-div\">\n        <div class=\"row\">\n          <div class=\"col-md-12\">\n            <p class=\"alert alert-info\">There are no git repositories yet. Please create one!</p>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-show=\"projects.length\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/secrets.html","<div ng-controller=\"Forge.SecretsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row filter-header\" ng-show=\"filteredSecrets.length\">\n    <div class=\"col-md-12\">\n      <button class=\"btn btn-default pull-right\"\n              title=\"Cancel changes to this secret\"\n              ng-click=\"cancel()\">\n        Cancel\n      </button>\n      <span class=\"pull-right\">&nbsp;</span>\n      <button class=\"btn btn-primary pull-right\"\n              title=\"Saves changes to this secret\"\n              ng-disabled=\"!canSave()\"\n              ng-click=\"save()\">\n        Save Changes\n      </button>\n    </div>\n  </div>\n\n\n  <div ng-hide=\"fetched\">\n    <div class=\"row select-table-filter\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n\n  <div ng-show=\"fetched\">\n    <div class=\"row filter-header\">\n      <div class=\"col-md-12\">\n        <p>To be able to edit source code in a repository we need your secret (SSH keys or username &amp; password). The secrets are stored securely in your own\n          <a href=\"{{secretNamespaceLink}}\" title=\"View the namespace for your personal secrets\">personal namespace</a>.</p>\n      </div>\n    </div>\n\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <form name=\"secretForm\" class=\"form-horizontal\">\n          <div class=\"form-group\" ng-hide=\"id\" ng-class=\"{\'has-error\': secretForm.$error.validator || !selectedSecretName}\">\n            <label class=\"col-sm-2 control-label\" for=\"secretName\">\n              Source Editing Secret\n              <a tabindex=\"0\" role=\"button\" data-toggle=\"popover\" data-trigger=\"focus\" data-html=\"true\" title=\"\"\n                 data-content=\"Select the secret used to clone and edit the git repository\" data-placement=\"top\"\n                 data-original-title=\"\">\n                <span class=\"fa fa-info-circle\"></span>\n              </a>\n            </label>\n\n            <div class=\"col-sm-4\">\n              <input type=\"text\" id=\"secretName\" name=\"secretName\" class=\"form-control\" ng-model=\"selectedSecretName\"\n                     required readonly>\n            </div>\n\n            <div ng-show=\"gitUrl\">\n              <label class=\"col-sm-2 control-label\" for=\"gitRepo\">\n                Repository\n                <a tabindex=\"0\" role=\"button\" data-toggle=\"popover\" data-trigger=\"focus\" data-html=\"true\" title=\"\"\n                   data-content=\"The git repository to edit the source code\" data-placement=\"top\"\n                   data-original-title=\"\">\n                  <span class=\"fa fa-info-circle\"></span>\n                </a>\n              </label>\n\n              <div class=\"col-sm-4\">\n                <input type=\"text\" id=\"gitRepo\" name=\"gitRepo\" class=\"form-control\" ng-model=\"gitUrl\" required readonly>\n              </div>\n            </div>\n          </div>\n        </form>\n      </div>\n    </div>\n\n    <div ng-hide=\"filteredSecrets.length\" class=\"align-center\">\n      <div class=\"row select-table-filter\">\n        <div class=\"col-md-12\">\n          <p class=\"alert alert-info\">There are currently no suitable secrets to choose from. Please create one.</p>\n        </div>\n      </div>\n      <div class=\"row\">\n        <div class=\"col-md-12 text-center\">\n          <a class=\"btn btn-primary\" href=\"{{addNewSecretLink}}\"\n             title=\"Create a new secret for editing the git repository for this project\">\n            <i class=\"fa fa-plus\"></i> Create Secret\n          </a>\n        </div>\n      </div>\n    </div>\n    <div ng-show=\"filteredSecrets.length\">\n      <div class=\"row select-table-filter\">\n        <div class=\"col-md-12\">\n          <div class=\" pull-right\">\n            <hawtio-filter ng-show=\"filteredSecrets.length > 1\"\n                           ng-model=\"tableConfig.filterOptions.filterText\"\n                           css-class=\"input-xxlarge\"\n                           placeholder=\"Filter secrets...\"></hawtio-filter>\n\n          </div>\n        </div>\n      </div>\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n      <div class=\"row\">\n        <div class=\"col-md-12 text-center\">\n          <a class=\"btn btn-default\" href=\"{{addNewSecretLink}}\"\n             title=\"Create a new secret for editing the git repository for this project\">\n            <i class=\"fa fa-plus\"></i> Create Secret\n          </a>\n        </div>\n      </div>\n    </div>\n\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/secretsRequired.html","<div ng-controller=\"Forge.SecretsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div>\n    <div class=\"row filter-header\">\n      <div class=\"col-md-2\">\n      </div>\n      <div class=\"col-md-8 text-center\">\n        <div class=\"alert alert-info\">\n          <span class=\"pficon pficon-info\"></span>\n          <strong>To be able to create or edit a project you need to choose or setup a secret to work with the repository for the SSH keys or username &amp; password.</strong>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"row\">\n      <div class=\"col-md-12 text-center\">\n        <a class=\"btn btn-primary btn-lg\" href=\"{{setupSecretsLink}}\"\n           title=\"Setup the secrets so that you can edit this project\">\n          Setup Source Secret\n        </a>\n      </div>\n    </div>\n\n  </div>\n</div>\n");
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