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
        var authHeader = localStorage["gogsAuthorization"];
        var email = localStorage["gogsEmail"];
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
    function createHttpUrl(url, authHeader, email) {
        if (authHeader === void 0) { authHeader = null; }
        if (email === void 0) { email = null; }
        authHeader = authHeader || localStorage["gogsAuthorization"];
        email = email || localStorage["gogsEmail"];
        url = addQueryArgument(url, "_gogsAuth", authHeader);
        url = addQueryArgument(url, "_gogsEmail", email);
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
    function isLoggedIntoGogs() {
        var localStorage = Kubernetes.inject("localStorage") || {};
        var authHeader = localStorage["gogsAuthorization"];
        return authHeader ? true : false;
    }
    Forge.isLoggedIntoGogs = isLoggedIntoGogs;
    function redirectToGogsLoginIfRequired($scope, $location) {
        if (!isLoggedIntoGogs()) {
            var devLink = Developer.projectLink($scope.projectId);
            var loginPage = UrlHelpers.join(devLink, "forge/repos");
            Forge.log.info("Not logged in so redirecting to " + loginPage);
            $location.path(loginPage);
        }
    }
    Forge.redirectToGogsLoginIfRequired = redirectToGogsLoginIfRequired;
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
                    .when(UrlHelpers.join(path, '/secrets'), Forge.route('secrets.html', false))
                    .when(UrlHelpers.join(path, '/commands'), Forge.route('commands.html', false))
                    .when(UrlHelpers.join(path, '/commands/:path*'), Forge.route('commands.html', false))
                    .when(UrlHelpers.join(path, '/command/:id'), Forge.route('command.html', false))
                    .when(UrlHelpers.join(path, '/command/:id/:path*'), Forge.route('command.html', false));
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
            Forge.redirectToGogsLoginIfRequired($scope, $location);
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
                url = Forge.createHttpUrl(url);
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
                                    updateSchema(schema);
                                    angular.forEach(schema["properties"], function (property, name) {
                                        var value = property.value;
                                        if (value) {
                                            Forge.log.info("Adding entity." + name + " = " + value);
                                            $scope.entity[name] = value;
                                        }
                                    });
                                    $scope.inputList.push($scope.entity);
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
                            var editPath = UrlHelpers.join(Developer.projectLink(projectId), "/forge/command/devops-edit");
                            Forge.log.info("Moving to the devops edit path: " + editPath);
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
                url = Forge.createHttpUrl(url);
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
                    url = Forge.createHttpUrl(url);
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
            Forge.redirectToGogsLoginIfRequired($scope, $location);
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
            url = Forge.createHttpUrl(url);
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
            Forge.redirectToGogsLoginIfRequired($scope, $location);
            $scope.$on('$routeUpdate', function ($event) {
                updateData();
            });
            updateData();
            function updateData() {
                if ($scope.name) {
                    var url = Forge.repoApiUrl(ForgeApiURL, $scope.name);
                    url = Forge.createHttpUrl(url);
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
            $scope.$on('kubernetesModelUpdated', function () {
                updateLinks();
                Core.$apply($scope);
            });
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
                    url = Forge.createHttpUrl(url, authHeader, email);
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
    function createLocalStorageKey(prefix, ns, name) {
        return prefix + "/" + ns + "/" + name;
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
            Forge.log.info("Found source secret namespace " + $scope.sourceSecretNamespace);
            Forge.log.info("Found source secret for " + ns + "/" + projectId + " = " + $scope.sourceSecret);
            var kind = "ssh";
            var savedUrl = $location.path();
            $scope.addNewSecretLink = Developer.projectWorkspaceLink(ns, projectId, UrlHelpers.join("namespace", $scope.sourceSecretNamespace, "secretCreate?kind=" + kind + "&savedUrl=" + savedUrl));
            $scope.$on('kubernetesModelUpdated', function () {
                checkNamespaceCreated();
            });
            $scope.tableConfig = {
                data: 'personalSecrets',
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
                Forge.log.info("========= setting the selected secret to: " + $scope.selectedSecretName);
            }
            else {
                selectedSecretName();
            }
            $scope.$watchCollection("tableConfig.selectedItems", function () {
                selectedSecretName();
            });
            function selectedSecretName() {
                $scope.selectedSecretName = createdSecret || Forge.getProjectSourceSecret(localStorage, ns, projectId);
                var selectedItems = $scope.tableConfig.selectedItems;
                if (selectedItems && selectedItems.length) {
                    var secret = selectedItems[0];
                    var name_1 = Kubernetes.getName(secret);
                    if (name_1) {
                        $scope.selectedSecretName = name_1;
                        if (createdSecret && name_1 !== createdSecret) {
                            Forge.log.info("----- clearing the createdSecret!");
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
                Forge.log.info("==== cancel for selection: " + current + " generated selectedItems: " + selectedItems + " has selection: " + $scope.selectedSecretName);
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
                }
            };
            checkNamespaceCreated();
            function onPersonalSecrets(secrets) {
                $scope.personalSecrets = secrets;
                $scope.fetched = true;
                $scope.cancel();
                Core.$apply($scope);
            }
            function checkNamespaceCreated() {
                var namespaceName = $scope.sourceSecretNamespace;
                function watchSecrets() {
                    Forge.log.info("watching secrets on namespace: " + namespaceName);
                    Kubernetes.watch($scope, $element, "secrets", namespaceName, onPersonalSecrets);
                    Core.$apply($scope);
                }
                if (!$scope.secretNamespace) {
                    angular.forEach($scope.model.projects, function (project) {
                        var name = Kubernetes.getName(project);
                        if (name === namespaceName) {
                            Forge.log.info("Found secret namespace! " + name);
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
                initialValue: Wiki.ViewMode.List,
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
            var url = Forge.createHttpUrl(UrlHelpers.join(this.baseUrl, path));
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
            var url = Forge.createHttpUrl(UrlHelpers.join(this.baseUrl, path));
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
            var url = Forge.createHttpUrl(UrlHelpers.join(this.baseUrl, path));
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VQbHVnaW4udHMiLCJmb3JnZS90cy9jb21tYW5kLnRzIiwiZm9yZ2UvdHMvY29tbWFuZHMudHMiLCJmb3JnZS90cy9yZXBvLnRzIiwiZm9yZ2UvdHMvcmVwb3MudHMiLCJmb3JnZS90cy9zZWNyZXRIZWxwZXJzLnRzIiwiZm9yZ2UvdHMvc2VjcmV0cy50cyIsIm1haW4vdHMvbWFpbkdsb2JhbHMudHMiLCJtYWluL3RzL21haW5QbHVnaW4udHMiLCJtYWluL3RzL2Fib3V0LnRzIiwid2lraS90cy93aWtpSGVscGVycy50cyIsIndpa2kvdHMvd2lraVBsdWdpbi50cyIsIndpa2kvdHMvY2FtZWwudHMiLCJ3aWtpL3RzL2NhbWVsQ2FudmFzLnRzIiwid2lraS90cy9jb21taXQudHMiLCJ3aWtpL3RzL2NvbW1pdERldGFpbC50cyIsIndpa2kvdHMvY3JlYXRlLnRzIiwid2lraS90cy9lZGl0LnRzIiwid2lraS90cy9maWxlRHJvcC50cyIsIndpa2kvdHMvZm9ybVRhYmxlLnRzIiwid2lraS90cy9naXRQcmVmZXJlbmNlcy50cyIsIndpa2kvdHMvaGlzdG9yeS50cyIsIndpa2kvdHMvaGlzdG9yeURpcmVjdGl2ZS50cyIsIndpa2kvdHMvbmF2YmFyLnRzIiwid2lraS90cy9vdmVydmlld0Rhc2hib2FyZC50cyIsIndpa2kvdHMvdmlldy50cyIsIndpa2kvdHMvd2lraURpYWxvZ3MudHMiLCJ3aWtpL3RzL3dpa2lEaXJlY3RpdmVzLnRzIiwid2lraS90cy93aWtpTmF2aWdhdGlvbi50cyIsIndpa2kvdHMvd2lraVJlcG9zaXRvcnkudHMiLCJ3aWtpL3RzL3dpa2lUb3BMZXZlbC50cyJdLCJuYW1lcyI6WyJGb3JnZSIsIkZvcmdlLmlzRm9yZ2UiLCJGb3JnZS5pbml0U2NvcGUiLCJGb3JnZS5jb21tYW5kTGluayIsIkZvcmdlLmNvbW1hbmRzTGluayIsIkZvcmdlLnJlcG9zQXBpVXJsIiwiRm9yZ2UucmVwb0FwaVVybCIsIkZvcmdlLmNvbW1hbmRBcGlVcmwiLCJGb3JnZS5leGVjdXRlQ29tbWFuZEFwaVVybCIsIkZvcmdlLnZhbGlkYXRlQ29tbWFuZEFwaVVybCIsIkZvcmdlLmNvbW1hbmRJbnB1dEFwaVVybCIsIkZvcmdlLm1vZGVsUHJvamVjdCIsIkZvcmdlLnNldE1vZGVsQ29tbWFuZHMiLCJGb3JnZS5nZXRNb2RlbENvbW1hbmRzIiwiRm9yZ2UubW9kZWxDb21tYW5kSW5wdXRNYXAiLCJGb3JnZS5nZXRNb2RlbENvbW1hbmRJbnB1dHMiLCJGb3JnZS5zZXRNb2RlbENvbW1hbmRJbnB1dHMiLCJGb3JnZS5lbnJpY2hSZXBvIiwiRm9yZ2UuY3JlYXRlSHR0cENvbmZpZyIsIkZvcmdlLmFkZFF1ZXJ5QXJndW1lbnQiLCJGb3JnZS5jcmVhdGVIdHRwVXJsIiwiRm9yZ2UuY29tbWFuZE1hdGNoZXNUZXh0IiwiRm9yZ2UuaXNMb2dnZWRJbnRvR29ncyIsIkZvcmdlLnJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkIiwiRm9yZ2Uub25Sb3V0ZUNoYW5nZWQiLCJGb3JnZS51cGRhdGVTY2hlbWEiLCJGb3JnZS52YWxpZGF0ZSIsIkZvcmdlLnRvQmFja2dyb3VuZFN0eWxlIiwiRm9yZ2UudXBkYXRlRGF0YSIsIkZvcmdlLm9uU2NoZW1hTG9hZCIsIkZvcmdlLmNvbW1hbmRNYXRjaGVzIiwiRm9yZ2UuZG9EZWxldGUiLCJGb3JnZS51cGRhdGVMaW5rcyIsIkZvcmdlLmdldFNvdXJjZVNlY3JldE5hbWVzcGFjZSIsIkZvcmdlLmdldFByb2plY3RTb3VyY2VTZWNyZXQiLCJGb3JnZS5zZXRQcm9qZWN0U291cmNlU2VjcmV0IiwiRm9yZ2UuY3JlYXRlTG9jYWxTdG9yYWdlS2V5IiwiRm9yZ2Uuc2VsZWN0ZWRTZWNyZXROYW1lIiwiRm9yZ2Uub25QZXJzb25hbFNlY3JldHMiLCJGb3JnZS5jaGVja05hbWVzcGFjZUNyZWF0ZWQiLCJGb3JnZS5jaGVja05hbWVzcGFjZUNyZWF0ZWQud2F0Y2hTZWNyZXRzIiwiTWFpbiIsIldpa2kiLCJXaWtpLlZpZXdNb2RlIiwiV2lraS5pc0ZNQ0NvbnRhaW5lciIsIldpa2kuaXNXaWtpRW5hYmxlZCIsIldpa2kuZ29Ub0xpbmsiLCJXaWtpLmN1c3RvbVZpZXdMaW5rcyIsIldpa2kuY3JlYXRlV2l6YXJkVHJlZSIsIldpa2kuY3JlYXRlRm9sZGVyIiwiV2lraS5hZGRDcmVhdGVXaXphcmRGb2xkZXJzIiwiV2lraS5zdGFydFdpa2lMaW5rIiwiV2lraS5zdGFydExpbmsiLCJXaWtpLmlzSW5kZXhQYWdlIiwiV2lraS52aWV3TGluayIsIldpa2kuYnJhbmNoTGluayIsIldpa2kuZWRpdExpbmsiLCJXaWtpLmNyZWF0ZUxpbmsiLCJXaWtpLmVuY29kZVBhdGgiLCJXaWtpLmRlY29kZVBhdGgiLCJXaWtpLmZpbGVGb3JtYXQiLCJXaWtpLmZpbGVOYW1lIiwiV2lraS5maWxlUGFyZW50IiwiV2lraS5oaWRlRmlsZU5hbWVFeHRlbnNpb25zIiwiV2lraS5naXRSZXN0VVJMIiwiV2lraS5naXRVcmxQcmVmaXgiLCJXaWtpLmdpdFJlbGF0aXZlVVJMIiwiV2lraS5maWxlSWNvbkh0bWwiLCJXaWtpLmljb25DbGFzcyIsIldpa2kuaW5pdFNjb3BlIiwiV2lraS5sb2FkQnJhbmNoZXMiLCJXaWtpLnBhZ2VJZCIsIldpa2kucGFnZUlkRnJvbVVSSSIsIldpa2kuZmlsZUV4dGVuc2lvbiIsIldpa2kub25Db21wbGV0ZSIsIldpa2kucGFyc2VKc29uIiwiV2lraS5hZGp1c3RIcmVmIiwiV2lraS5nZXRGb2xkZXJYbWxOb2RlIiwiV2lraS5hZGROZXdOb2RlIiwiV2lraS5vbk1vZGVsQ2hhbmdlRXZlbnQiLCJXaWtpLm9uTm9kZURhdGFDaGFuZ2VkIiwiV2lraS5vblJlc3VsdHMiLCJXaWtpLnVwZGF0ZVZpZXciLCJXaWtpLmdvVG9WaWV3IiwiV2lraS5pc1JvdXRlT3JOb2RlIiwiV2lraS5jcmVhdGVFbmRwb2ludFVSSSIsIldpa2kudHJlZU1vZGlmaWVkIiwiV2lraS5yZWxvYWRSb3V0ZUlkcyIsIldpa2kub25Sb3V0ZVNlbGVjdGlvbkNoYW5nZWQiLCJXaWtpLnNob3dHcmFwaCIsIldpa2kuZ2V0Tm9kZUlkIiwiV2lraS5nZXRTZWxlY3RlZE9yUm91dGVGb2xkZXIiLCJXaWtpLmdldENvbnRhaW5lckVsZW1lbnQiLCJXaWtpLmxheW91dEdyYXBoIiwiV2lraS5nZXRMaW5rIiwiV2lraS5nZXROb2RlQnlDSUQiLCJXaWtpLnVwZGF0ZVNlbGVjdGlvbiIsIldpa2kuZ2V0V2lkdGgiLCJXaWtpLmdldEZvbGRlcklkQXR0cmlidXRlIiwiV2lraS5nZXRSb3V0ZUZvbGRlciIsIldpa2kuY29tbWl0UGF0aCIsIldpa2kucmV0dXJuVG9EaXJlY3RvcnkiLCJXaWtpLmRvQ3JlYXRlIiwiV2lraS5kb0NyZWF0ZS50b1BhdGgiLCJXaWtpLmRvQ3JlYXRlLnRvUHJvZmlsZU5hbWUiLCJXaWtpLnB1dFBhZ2UiLCJXaWtpLmdldE5ld0RvY3VtZW50UGF0aCIsIldpa2kuaXNDcmVhdGUiLCJXaWtpLm9uRmlsZUNvbnRlbnRzIiwiV2lraS51cGRhdGVTb3VyY2VWaWV3IiwiV2lraS5vbkZvcm1TY2hlbWEiLCJXaWtpLnNhdmVUbyIsIldpa2kuY2hpbGRMaW5rIiwiV2lraS5vbkZvcm1EYXRhIiwiV2lraS5zd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluayIsIldpa2kubG9hZEJyZWFkY3J1bWJzIiwiV2lraS5pc0RpZmZWaWV3IiwiV2lraS52aWV3Q29udGVudHMiLCJXaWtpLm9uRmlsZURldGFpbHMiLCJXaWtpLmNoZWNrRmlsZUV4aXN0cyIsIldpa2kuZ2V0UmVuYW1lRmlsZVBhdGgiLCJXaWtpLmdldFJlbmFtZURpYWxvZyIsIldpa2kuZ2V0TW92ZURpYWxvZyIsIldpa2kuZ2V0RGVsZXRlRGlhbG9nIiwiV2lraS5vZmZzZXRUb3AiLCJXaWtpLnNjcm9sbFRvSGFzaCIsIldpa2kuc2Nyb2xsVG9JZCIsIldpa2kuYWRkTGlua3MiLCJXaWtpLm9uRXZlbnRJbnNlcnRlZCIsIldpa2kuY3JlYXRlU291cmNlQnJlYWRjcnVtYnMiLCJXaWtpLmNyZWF0ZUVkaXRpbmdCcmVhZGNydW1iIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29uc3RydWN0b3IiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmdldFBhZ2UiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5Lmhpc3RvcnkiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbW1pdEluZm8iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbW1pdERldGFpbCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tbWl0VHJlZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZGlmZiIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuYnJhbmNoZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmV4aXN0cyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LnJlbmFtZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvR2V0IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5kb1Bvc3QiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvUG9zdEZvcm0iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbXBsZXRlUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0UGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0TG9nUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0Q29udGVudCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuanNvbkNoaWxkQ29udGVudHMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmdpdCJdLCJtYXBwaW5ncyI6IkFBQUEsMkRB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L01BLFVBQUNBLE1BQU1BLEVBQUVBLE9BQU9BLEVBQUVBLE9BQU9BLEVBQUVBLGNBQWNBLEVBQUVBLFlBQVlBLEVBQUVBLFNBQTZCQSxFQUFFQSxZQUFZQSxFQUFFQSxLQUFLQSxFQUFFQSxRQUFRQSxFQUFFQSxXQUFXQSxFQUFFQSxVQUFVQTtZQUU1SUEsTUFBTUEsQ0FBQ0EsS0FBS0EsR0FBR0EsVUFBVUEsQ0FBQ0E7WUFDMUJBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1lBQy9FQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUNyQkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxJQUFJQSxFQUFFQSxDQUFDQTtZQUN0REEsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUNyREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2xDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNwREEsQ0FBQ0E7WUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUN2RkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxHQUFHQSxHQUFHQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBO1lBQzlEQSxDQUFDQTtZ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QSxJQUFJQSxJQUFJQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUM1QkEsSUFBSUEsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDdEJBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQ2hDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNaQSxJQUFJQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN2Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9CQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUN0Q0EsQ0FBQ0E7UUFDSEEsQ0FBQ0E7UUFHREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDM0JBLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQzVCQSxJQUFJQSxTQUFTQSxHQUFHQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUN0Q0EsSUFBSUEsT0FBT0EsR0FBR0EsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsSUFBSUE7Z0JBQzlCQSxNQUFNQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQTtZQUN2QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDSEEsS0FBS0EsR0FBR0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsTUFBTUEsR0FBR0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDbERBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLEtBQUtBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEdBQUdBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBRS9EQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUMxRkEsQ0FBQ0E7UUFHREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekJBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLEdBQUdBLFNBQVNBLEVBQUVBLFNBQVNBLENBQUNBLEdBQUdBLFNBQVNBLENBQUNBO1FBQzFFQSxDQUFDQTtRQUVEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSx5QkFBeUJBLENBQUNBLEdBQUdBLENBQUNBLFVBQUNBLE9BQU9BO1lBQzlDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTtRQUNsQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDSEEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsVUFBVUEsR0FBR0EsR0FBR0EsR0FBR0EsSUFBSUEsR0FBR0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDdEVBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO1FBQ2RBLENBQUNBO0lBQ0hBLENBQUNBO0lBekNlbEMsZUFBVUEsYUF5Q3pCQSxD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R0EsSUFBSUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0E7NEJBQ2xDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDbENBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLGNBQWNBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO2dDQUMxQ0EsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0E7NEJBQ2hDQSxDQUFDQTs0QkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsSUFBSUEsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ2hDQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDM0NBLENBQUNBOzRCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQ0FDTkEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsOENBQThDQSxDQUFDQSxDQUFDQTtnQ0FDMURBLE1BQU1BLENBQUNBOzRCQUNUQSxDQUFDQTt3QkFDSEEsQ0FBQ0E7d0JBS0RBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7d0JBQ3pEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxZQUFZQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFFbENBLFVBQVVBLEdBQUdBLFFBQVFBLENBQUNBLGNBQWNBLEVBQUVBLENBQUNBOzRCQUN2Q0EsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsU0FBU0EsRUFBRUEsSUFBSUEsUUFBUUEsQ0FBQ0E7d0JBQzlDQSxDQUFDQTtvQkFDSEEsQ0FBQ0E7b0JBQ0RBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO3dCQUNiQSxJQUFJ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QSxlQUFlQSxFQUFFQSxVQUFDQSxRQUFRQSxFQUFFQSxRQUFRQTtnQkFDaERBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFFBQVFBLElBQUlBLFFBQVFBLElBQUlBLFFBQVFBLEtBQUtBLFFBQVFBLENBQUNBO1lBQ2xFQSxDQUFDQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUVUQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxRQUFRQSxFQUFFQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUVqQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsRUFBRUEsVUFBQ0EsUUFBUUEsRUFBRUEsUUFBUUE7Z0JBQzNDQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxZQUFZQSxFQUFFQSxRQUFRQSxDQUFDQSxDQUFDQTtZQUNwQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFFSEEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsY0FBTUEsT0FBQUEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsRUFBaEVBLENBQWdFQSxDQUFDQTtZQUV6RkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0E7Z0JBQ2RBLFFBQVFBLEVBQUVBLENBQUNBO1lBQ2JBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBO2dCQUNaQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxJQUFJQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDdkNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUMzQkEsQ0FBQ0E7WUFDSEEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0E7Z0JBRWRBLElBQUlBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLEdBQUdB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Q0FBQ0E7d0JBQ3hCQSxRQUFRQSxHQUFHQSxDQUFDQSxDQUFDQTtvQkFDZkEsQ0FBQ0E7Z0JBQ0hBLENBQUNBO2dCQUNEQSxJQUFJQSxJQUFJQSxHQUFHQSxjQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxRQUFRQSxHQUFHQSxRQUFRQSxHQUFHQSxHQUFHQSxHQUFHQSxZQUFZQSxHQUFHQSxHQUFHQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtnQkFDOUZBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO2dCQUN2Q0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDdkJBLENBQUNBLENBQUNBO1lBRUZBLFVBQVVBLEVBQUVBLENBQUNBO1lBRWJBO2dCQUNFd0MsSUFBSUEsUUFBUUEsR0FBR0EsRUFBRUEsQ0FBQ0E7Z0JBQ2xCQSxJQUFJQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFFZEEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsY0FBY0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsUUFBUUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsS0FBS0EsRUFBRUEsVUFBQ0EsUUFBUUE7b0JBQzFGQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxFQUFFQSxVQUFDQSxHQUFHQTt3QkFFNUJBLElBQUlBLFFBQVFBLEdBQUdBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBO3dCQUN2QkEsR0FBR0EsQ0FBQ0EsS0FBS0EsR0FBR0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7d0JBQ3ZDQSxHQUFHQSxDQUFDQSxVQUFVQSxHQUFHQSxjQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxnQkFBZ0JBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLEdBQUdBLEdBQUdB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Q0FBQ0E7b0JBQ0hBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLEdBQUdBO3dCQUM3QkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7b0JBQ2xCQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDSEEsS0FBS0EsR0FBR0EsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsSUFBSUE7d0JBQ3hCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDbkJBLENBQUNBLENBQUNBO3lCQUNDQSxNQUFNQSxDQUFDQSxVQUFDQSxJQUFJQTt3QkFDWEEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7b0JBQ3JDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFTEEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBU0EsS0FBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsRUFBRUEsUUFBUUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQ0EsSUFBSUE7d0JBQzNFQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTt3QkFDNUJBLElBQUlBLENBQUNBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLElBQUlBLENBQUNBO3dCQUMxQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ25CQSxJQUFJQSxDQUFDQSxRQUFRQSxJQUFJQSxNQUFNQSxDQUFDQTt3QkFDMUJBLENBQUNBO3dCQUNEQSxJQUFJQSxDQUFDQSxXQUFXQSxHQUFHQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxFQUFFQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTt3QkFDdERBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO29CQUNkQSxDQUFDQSxDQUFDQSxD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LEdBQUdBLFVBQVVBLEdBQUdBLGtCQUFrQkEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0E7WUFDdEZBLENBQUNBO1lBQ0RBLElBQUlBLElBQUlBLEdBQUdBLFFBQVFBLENBQUNBO1lBQ3BCQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxFQUFFQSxJQUFJQSxJQUFJQSxHQUFHQSxDQUFDQSxFQUFFQSxLQUFLQSxFQUFFQSxJQUFJQSxFQUM5REEsVUFBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUE7Z0JBQzVCQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNYQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNQQSxDQUFDQTtRQWFNSCxtQ0FBT0EsR0FBZEEsVUFBZUEsTUFBYUEsRUFBRUEsUUFBZUEsRUFBRUEsSUFBV0EsRUFBRUEsS0FBWUEsRUFBRUEsRUFBRUE7WUFDMUVJLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBO1lBQ2pCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWEEsS0FBS0EsR0FBR0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7WUFDMUJBLENBQUNBO1lBQ0RBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO2dCQUNWQSxLQUFLQSxHQUFHQSxDQUFDQSxLQUFLQSxHQUFHQSxLQUFLQSxHQUFHQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQTtZQUN4REEsQ0FBQ0E7WUFDREEsSUFBSUEsUUFBUUEsR0FBR0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0E7WUFDbENBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLEVBQUVBLFFBQVFBLEVBQUVBLElBQUlBLENBQUNBLEVBQUVBLEtBQUtBLEVBQzFEQSxVQUFDQSxJQUFJQSxF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aWxlIjoiY29tcGlsZWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2xpYnMvaGF3dGlvLXV0aWxpdGllcy9kZWZzLmQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbGlicy9oYXd0aW8tb2F1dGgvZGVmcy5kLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2xpYnMvaGF3dGlvLWt1YmVybmV0ZXMvZGVmcy5kLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2xpYnMvaGF3dGlvLWludGVncmF0aW9uL2RlZnMuZC50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9saWJzL2hhd3Rpby1kYXNoYm9hcmQvZGVmcy5kLnRzXCIvPlxuIiwiLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgY29udGV4dCA9ICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL2ZvcmdlJztcblxuICBleHBvcnQgdmFyIGhhc2ggPSAnIycgKyBjb250ZXh0O1xuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSAnRm9yZ2UnO1xuICBleHBvcnQgdmFyIHBsdWdpblBhdGggPSAncGx1Z2lucy9mb3JnZS8nO1xuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IHBsdWdpblBhdGggKyAnaHRtbC8nO1xuICBleHBvcnQgdmFyIGxvZzpMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQocGx1Z2luTmFtZSk7XG5cbiAgZXhwb3J0IHZhciBkZWZhdWx0SWNvblVybCA9IENvcmUudXJsKFwiL2ltZy9mb3JnZS5zdmdcIik7XG5cbiAgZXhwb3J0IHZhciBnb2dzU2VydmljZU5hbWUgPSBLdWJlcm5ldGVzLmdvZ3NTZXJ2aWNlTmFtZTtcbiAgZXhwb3J0IHZhciBvcmlvblNlcnZpY2VOYW1lID0gXCJvcmlvblwiO1xuXG4gIGV4cG9ydCB2YXIgbG9nZ2VkSW5Ub0dvZ3MgPSBmYWxzZTtcblxuICBleHBvcnQgZnVuY3Rpb24gaXNGb3JnZSh3b3Jrc3BhY2UpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcykge1xuICAgICRzY29wZS5uYW1lc3BhY2UgPSAkcm91dGVQYXJhbXNbXCJuYW1lc3BhY2VcIl0gfHwgS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICRzY29wZS5wcm9qZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJwcm9qZWN0XCJdO1xuICAgICRzY29wZS4kd29ya3NwYWNlTGluayA9IERldmVsb3Blci53b3Jrc3BhY2VMaW5rKCk7XG4gICAgJHNjb3BlLiRwcm9qZWN0TGluayA9IERldmVsb3Blci5wcm9qZWN0TGluaygkc2NvcGUucHJvamVjdElkKTtcbiAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0QnJlYWRjcnVtYnMoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U3ViTmF2QmFycygkc2NvcGUucHJvamVjdElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTGluayhwcm9qZWN0SWQsIG5hbWUsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBsaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihsaW5rLCBcIi9mb3JnZS9jb21tYW5kXCIsIG5hbWUsIHJlc291cmNlUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmQvXCIsIG5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCBwcm9qZWN0SWQpIHtcbiAgICB2YXIgbGluayA9IERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpO1xuICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZHMvdXNlclwiLCByZXNvdXJjZVBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmRzXCIpO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZXBvc0FwaVVybChGb3JnZUFwaVVSTCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiL3JlcG9zXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHJlcG9BcGlVcmwoRm9yZ2VBcGlVUkwsIHBhdGgpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcIi9yZXBvcy91c2VyXCIsIHBhdGgpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCwgbnMsIHByb2plY3RJZCwgcmVzb3VyY2VQYXRoID0gbnVsbCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBjb21tYW5kSWQsIG5zLCBwcm9qZWN0SWQsIHJlc291cmNlUGF0aCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZXhlY3V0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcImV4ZWN1dGVcIiwgY29tbWFuZElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcInZhbGlkYXRlXCIsIGNvbW1hbmRJZCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY29tbWFuZElucHV0QXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsIG5zLCBwcm9qZWN0SWQsIHJlc291cmNlUGF0aCkge1xuICAgIGlmIChucyAmJiBwcm9qZWN0SWQpIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZElucHV0XCIsIGNvbW1hbmRJZCwgbnMsIHByb2plY3RJZCwgcmVzb3VyY2VQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kSW5wdXRcIiwgY29tbWFuZElkKTtcbiAgICB9XG4gIH1cblxuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHByb2plY3QgZm9yIHRoZSBnaXZlbiByZXNvdXJjZSBwYXRoXG4gICAqL1xuICBmdW5jdGlvbiBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgaWYgKHJlc291cmNlUGF0aCkge1xuICAgICAgdmFyIHByb2plY3QgPSBGb3JnZU1vZGVsLnByb2plY3RzW3Jlc291cmNlUGF0aF07XG4gICAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgICAgcHJvamVjdCA9IHt9O1xuICAgICAgICBGb3JnZU1vZGVsLnByb2plY3RzW3Jlc291cmNlUGF0aF0gPSBwcm9qZWN0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2plY3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBGb3JnZU1vZGVsLnJvb3RQcm9qZWN0O1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzZXRNb2RlbENvbW1hbmRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCwgY29tbWFuZHMpIHtcbiAgICB2YXIgcHJvamVjdCA9IG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHByb2plY3QuJGNvbW1hbmRzID0gY29tbWFuZHM7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxDb21tYW5kcyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpIHtcbiAgICB2YXIgcHJvamVjdCA9IG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBwcm9qZWN0LiRjb21tYW5kcyB8fCBbXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vZGVsQ29tbWFuZElucHV0TWFwKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBwcm9qZWN0LiRjb21tYW5kSW5wdXRzO1xuICAgIGlmICghY29tbWFuZElucHV0cykge1xuICAgICAgY29tbWFuZElucHV0cyA9IHt9O1xuICAgICAgcHJvamVjdC4kY29tbWFuZElucHV0cyA9IGNvbW1hbmRJbnB1dHM7XG4gICAgfVxuICAgIHJldHVybiBjb21tYW5kSW5wdXRzO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgsIGlkKSB7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBtb2RlbENvbW1hbmRJbnB1dE1hcChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBjb21tYW5kSW5wdXRzW2lkXTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzZXRNb2RlbENvbW1hbmRJbnB1dHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoLCBpZCwgaXRlbSkge1xuICAgIHZhciBjb21tYW5kSW5wdXRzID0gbW9kZWxDb21tYW5kSW5wdXRNYXAoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICByZXR1cm4gY29tbWFuZElucHV0c1tpZF0gPSBpdGVtO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGVucmljaFJlcG8ocmVwbykge1xuICAgIHZhciBvd25lciA9IHJlcG8ub3duZXIgfHwge307XG4gICAgdmFyIHVzZXIgPSBvd25lci51c2VybmFtZSB8fCByZXBvLnVzZXI7XG4gICAgdmFyIG5hbWUgPSByZXBvLm5hbWU7XG4gICAgdmFyIHByb2plY3RJZCA9IG5hbWU7XG4gICAgdmFyIGF2YXRhcl91cmwgPSBvd25lci5hdmF0YXJfdXJsO1xuICAgIGlmIChhdmF0YXJfdXJsICYmIGF2YXRhcl91cmwuc3RhcnRzV2l0aChcImh0dHAvL1wiKSkge1xuICAgICAgYXZhdGFyX3VybCA9IFwiaHR0cDovL1wiICsgYXZhdGFyX3VybC5zdWJzdHJpbmcoNik7XG4gICAgICBvd25lci5hdmF0YXJfdXJsID0gYXZhdGFyX3VybDtcbiAgICB9XG4gICAgaWYgKHVzZXIgJiYgbmFtZSkge1xuICAgICAgdmFyIHJlc291cmNlUGF0aCA9IHVzZXIgKyBcIi9cIiArIG5hbWU7XG4gICAgICByZXBvLiRjb21tYW5kc0xpbmsgPSBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCBwcm9qZWN0SWQpO1xuICAgICAgcmVwby4kYnVpbGRzTGluayA9IFwiL2t1YmVybmV0ZXMvYnVpbGRzP3E9L1wiICsgcmVzb3VyY2VQYXRoICsgXCIuZ2l0XCI7XG4gICAgICB2YXIgaW5qZWN0b3IgPSBIYXd0aW9Db3JlLmluamVjdG9yO1xuICAgICAgaWYgKGluamVjdG9yKSB7XG4gICAgICAgIHZhciBTZXJ2aWNlUmVnaXN0cnkgPSBpbmplY3Rvci5nZXQoXCJTZXJ2aWNlUmVnaXN0cnlcIik7XG4gICAgICAgIGlmIChTZXJ2aWNlUmVnaXN0cnkpIHtcbiAgICAgICAgICB2YXIgb3Jpb25MaW5rID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKG9yaW9uU2VydmljZU5hbWUpO1xuICAgICAgICAgIHZhciBnb2dzU2VydmljZSA9IFNlcnZpY2VSZWdpc3RyeS5maW5kU2VydmljZShnb2dzU2VydmljZU5hbWUpO1xuICAgICAgICAgIGlmIChvcmlvbkxpbmsgJiYgZ29nc1NlcnZpY2UpIHtcbiAgICAgICAgICAgIHZhciBwb3J0YWxJcCA9IGdvZ3NTZXJ2aWNlLnBvcnRhbElQO1xuICAgICAgICAgICAgaWYgKHBvcnRhbElwKSB7XG4gICAgICAgICAgICAgIHZhciBwb3J0ID0gZ29nc1NlcnZpY2UucG9ydDtcbiAgICAgICAgICAgICAgdmFyIHBvcnRUZXh0ID0gKHBvcnQgJiYgcG9ydCAhPT0gODAgJiYgcG9ydCAhPT0gNDQzKSA/IFwiOlwiICsgcG9ydCA6IFwiXCI7XG4gICAgICAgICAgICAgIHZhciBwcm90b2NvbCA9IChwb3J0ICYmIHBvcnQgPT09IDQ0MykgPyBcImh0dHBzOi8vXCIgOiBcImh0dHA6Ly9cIjtcbiAgICAgICAgICAgICAgdmFyIGdpdENsb25lVXJsID0gVXJsSGVscGVycy5qb2luKHByb3RvY29sICsgcG9ydGFsSXAgKyBwb3J0VGV4dCArIFwiL1wiLCByZXNvdXJjZVBhdGggKyBcIi5naXRcIik7XG5cbiAgICAgICAgICAgICAgcmVwby4kb3BlblByb2plY3RMaW5rID0gVXJsSGVscGVycy5qb2luKG9yaW9uTGluayxcbiAgICAgICAgICAgICAgICBcIi9naXQvZ2l0LXJlcG9zaXRvcnkuaHRtbCMsY3JlYXRlUHJvamVjdC5uYW1lPVwiICsgbmFtZSArIFwiLGNsb25lR2l0PVwiICsgZ2l0Q2xvbmVVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVIdHRwQ29uZmlnKCkge1xuICAgIHZhciBhdXRoSGVhZGVyID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl07XG4gICAgdmFyIGVtYWlsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdO1xuICAgIHZhciBjb25maWcgPSB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICB9XG4vKlxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBBdXRob3JpemF0aW9uOiBhdXRoSGVhZGVyLFxuICAgICAgICBFbWFpbDogZW1haWxcbiAgICAgIH1cbiovXG4gICAgfTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkUXVlcnlBcmd1bWVudCh1cmwsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKHVybCAmJiBuYW1lICYmIHZhbHVlKSB7XG4gICAgICB2YXIgc2VwID0gICh1cmwuaW5kZXhPZihcIj9cIikgPj0gMCkgPyBcIiZcIiA6IFwiP1wiO1xuICAgICAgcmV0dXJuIHVybCArIHNlcCArICBuYW1lICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUh0dHBVcmwodXJsLCBhdXRoSGVhZGVyID0gbnVsbCwgZW1haWwgPSBudWxsKSB7XG4gICAgYXV0aEhlYWRlciA9IGF1dGhIZWFkZXIgfHwgbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl07XG4gICAgZW1haWwgPSBlbWFpbCB8fCBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl07XG5cbiAgICB1cmwgPSBhZGRRdWVyeUFyZ3VtZW50KHVybCwgXCJfZ29nc0F1dGhcIiwgYXV0aEhlYWRlcik7XG4gICAgdXJsID0gYWRkUXVlcnlBcmd1bWVudCh1cmwsIFwiX2dvZ3NFbWFpbFwiLCBlbWFpbCk7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTWF0Y2hlc1RleHQoY29tbWFuZCwgZmlsdGVyVGV4dCkge1xuICAgIGlmIChmaWx0ZXJUZXh0KSB7XG4gICAgICByZXR1cm4gQ29yZS5tYXRjaEZpbHRlcklnbm9yZUNhc2UoYW5ndWxhci50b0pzb24oY29tbWFuZCksIGZpbHRlclRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaXNMb2dnZWRJbnRvR29ncygpIHtcbiAgICB2YXIgbG9jYWxTdG9yYWdlID0gS3ViZXJuZXRlcy5pbmplY3QoXCJsb2NhbFN0b3JhZ2VcIikgfHwge307XG4gICAgdmFyIGF1dGhIZWFkZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICAvL3JldHVybiBhdXRoSGVhZGVyID8gbG9nZ2VkSW5Ub0dvZ3MgOiBmYWxzZTtcbiAgICByZXR1cm4gYXV0aEhlYWRlciA/IHRydWUgOiBmYWxzZTtcbi8qXG4gICAgdmFyIGNvbmZpZyA9IGNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICByZXR1cm4gY29uZmlnLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA/IHRydWUgOiBmYWxzZTtcbiovXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQoJHNjb3BlLCAkbG9jYXRpb24pIHtcbiAgICBpZiAoIWlzTG9nZ2VkSW50b0dvZ3MoKSkge1xuICAgICAgdmFyIGRldkxpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICB2YXIgbG9naW5QYWdlID0gVXJsSGVscGVycy5qb2luKGRldkxpbmssIFwiZm9yZ2UvcmVwb3NcIik7XG4gICAgICBsb2cuaW5mbyhcIk5vdCBsb2dnZWQgaW4gc28gcmVkaXJlY3RpbmcgdG8gXCIgKyBsb2dpblBhZ2UpO1xuICAgICAgJGxvY2F0aW9uLnBhdGgobG9naW5QYWdlKVxuICAgIH1cbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbJ2hhd3Rpby1jb3JlJywgJ2hhd3Rpby11aSddKTtcbiAgZXhwb3J0IHZhciBjb250cm9sbGVyID0gUGx1Z2luSGVscGVycy5jcmVhdGVDb250cm9sbGVyRnVuY3Rpb24oX21vZHVsZSwgcGx1Z2luTmFtZSk7XG4gIGV4cG9ydCB2YXIgcm91dGUgPSBQbHVnaW5IZWxwZXJzLmNyZWF0ZVJvdXRpbmdGdW5jdGlvbih0ZW1wbGF0ZVBhdGgpO1xuXG4gIF9tb2R1bGUuY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCAoJHJvdXRlUHJvdmlkZXI6bmcucm91dGUuSVJvdXRlUHJvdmlkZXIpID0+IHtcblxuICAgIGNvbnNvbGUubG9nKFwiTGlzdGVuaW5nIG9uOiBcIiArIFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL2NyZWF0ZVByb2plY3QnKSk7XG5cbiAgICAkcm91dGVQcm92aWRlci53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL2NyZWF0ZVByb2plY3QnKSwgcm91dGUoJ2NyZWF0ZVByb2plY3QuaHRtbCcsIGZhbHNlKSlcbiAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL3JlcG9zLzpwYXRoKicpLCByb3V0ZSgncmVwby5odG1sJywgZmFsc2UpKVxuICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKGNvbnRleHQsICcvcmVwb3MnKSwgcm91dGUoJ3JlcG9zLmh0bWwnLCBmYWxzZSkpO1xuXG4gICAgYW5ndWxhci5mb3JFYWNoKFtjb250ZXh0LCAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9wcm9qZWN0cy86cHJvamVjdC9mb3JnZSddLCAocGF0aCkgPT4ge1xuICAgICAgJHJvdXRlUHJvdmlkZXJcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvc2VjcmV0cycpLCByb3V0ZSgnc2VjcmV0cy5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kcycpLCByb3V0ZSgnY29tbWFuZHMuaHRtbCcsIGZhbHNlKSlcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZHMvOnBhdGgqJyksIHJvdXRlKCdjb21tYW5kcy5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kLzppZCcpLCByb3V0ZSgnY29tbWFuZC5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kLzppZC86cGF0aConKSwgcm91dGUoJ2NvbW1hbmQuaHRtbCcsIGZhbHNlKSk7XG4gICAgfSk7XG5cbiAgfV0pO1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnRm9yZ2VBcGlVUkwnLCBbJyRxJywgJyRyb290U2NvcGUnLCAoJHE6bmcuSVFTZXJ2aWNlLCAkcm9vdFNjb3BlOm5nLklSb290U2NvcGVTZXJ2aWNlKSA9PiB7XG4gICAgcmV0dXJuIEt1YmVybmV0ZXMua3ViZXJuZXRlc0FwaVVybCgpICsgXCIvcHJveHlcIiArIEt1YmVybmV0ZXMua3ViZXJuZXRlc05hbWVzcGFjZVBhdGgoKSArIFwiL3NlcnZpY2VzL2ZhYnJpYzgtZm9yZ2UvYXBpL2ZvcmdlXCI7XG4gIH1dKTtcblxuXG4gIF9tb2R1bGUuZmFjdG9yeSgnRm9yZ2VNb2RlbCcsIFsnJHEnLCAnJHJvb3RTY29wZScsICgkcTpuZy5JUVNlcnZpY2UsICRyb290U2NvcGU6bmcuSVJvb3RTY29wZVNlcnZpY2UpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgcm9vdFByb2plY3Q6IHt9LFxuICAgICAgcHJvamVjdHM6IFtdXG4gICAgfVxuICB9XSk7XG5cbiAgX21vZHVsZS5ydW4oWyd2aWV3UmVnaXN0cnknLCAnSGF3dGlvTmF2JywgKHZpZXdSZWdpc3RyeSwgSGF3dGlvTmF2KSA9PiB7XG4gICAgdmlld1JlZ2lzdHJ5Wydmb3JnZSddID0gdGVtcGxhdGVQYXRoICsgJ2xheW91dEZvcmdlLmh0bWwnO1xuICB9XSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBDb21tYW5kQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJDb21tYW5kQ29udHJvbGxlclwiLFxuICAgIFtcIiRzY29wZVwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiRm9yZ2VNb2RlbFwiLFxuICAgICAgKCRzY29wZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMLCBGb3JnZU1vZGVsKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLm1vZGVsID0gRm9yZ2VNb2RlbDtcblxuICAgICAgICAkc2NvcGUucmVzb3VyY2VQYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXSB8fCAkbG9jYXRpb24uc2VhcmNoKClbXCJwYXRoXCJdIHx8IFwiXCI7XG4gICAgICAgICRzY29wZS5pZCA9ICRyb3V0ZVBhcmFtc1tcImlkXCJdO1xuICAgICAgICAkc2NvcGUucGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl07XG5cbiAgICAgICAgJHNjb3BlLmF2YXRhcl91cmwgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdO1xuICAgICAgICAkc2NvcGUudXNlciA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdO1xuICAgICAgICAkc2NvcGUucmVwb05hbWUgPSBcIlwiO1xuICAgICAgICB2YXIgcGF0aFN0ZXBzID0gJHNjb3BlLnJlc291cmNlUGF0aC5zcGxpdChcIi9cIik7XG4gICAgICAgIGlmIChwYXRoU3RlcHMgJiYgcGF0aFN0ZXBzLmxlbmd0aCkge1xuICAgICAgICAgICRzY29wZS5yZXBvTmFtZSA9IHBhdGhTdGVwc1twYXRoU3RlcHMubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cblxuXG4gICAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgICAgaWYgKCRzY29wZS5pZCA9PT0gXCJkZXZvcHMtZWRpdFwiKSB7XG4gICAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdFNldHRpbmdzQnJlYWRjcnVtYnMoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICAgICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U2V0dGluZ3NTdWJOYXZCYXJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgICB9XG4gICAgICAgIHJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkKCRzY29wZSwgJGxvY2F0aW9uKTtcblxuICAgICAgICAkc2NvcGUuJGNvbXBsZXRlTGluayA9ICRzY29wZS4kcHJvamVjdExpbms7XG4gICAgICAgIGlmICgkc2NvcGUucHJvamVjdElkKSB7XG5cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuY29tbWFuZHNMaW5rID0gY29tbWFuZHNMaW5rKCRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgICAkc2NvcGUuY29tcGxldGVkTGluayA9ICRzY29wZS5wcm9qZWN0SWQgPyBVcmxIZWxwZXJzLmpvaW4oJHNjb3BlLiRwcm9qZWN0TGluaywgXCJlbnZpcm9ubWVudHNcIikgOiAkc2NvcGUuJHByb2plY3RMaW5rO1xuXG4gICAgICAgICRzY29wZS5lbnRpdHkgPSB7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5pbnB1dExpc3QgPSBbJHNjb3BlLmVudGl0eV07XG5cbiAgICAgICAgJHNjb3BlLnNjaGVtYSA9IGdldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuaWQpO1xuICAgICAgICBvblNjaGVtYUxvYWQoKTtcblxuICAgICAgICBmdW5jdGlvbiBvblJvdXRlQ2hhbmdlZCgpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInJvdXRlIHVwZGF0ZWQ7IGxldHMgY2xlYXIgdGhlIGVudGl0eVwiKTtcbiAgICAgICAgICAkc2NvcGUuZW50aXR5ID0ge1xuICAgICAgICAgIH07XG4gICAgICAgICAgJHNjb3BlLmlucHV0TGlzdCA9IFskc2NvcGUuZW50aXR5XTtcbiAgICAgICAgICAkc2NvcGUucHJldmlvdXNTY2hlbWFKc29uID0gXCJcIjtcbiAgICAgICAgICAkc2NvcGUuc2NoZW1hID0gbnVsbDtcbiAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS4kb24oJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCBvblJvdXRlQ2hhbmdlZCk7XG5cbiAgICAgICAgJHNjb3BlLmV4ZWN1dGUgPSAoKSA9PiB7XG4gICAgICAgICAgLy8gVE9ETyBjaGVjayBpZiB2YWxpZC4uLlxuICAgICAgICAgICRzY29wZS5yZXNwb25zZSA9IG51bGw7XG4gICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IHRydWU7XG4gICAgICAgICAgJHNjb3BlLmludmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbkVycm9yID0gbnVsbDtcbiAgICAgICAgICB2YXIgY29tbWFuZElkID0gJHNjb3BlLmlkO1xuICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgIHZhciB1cmwgPSBleGVjdXRlQ29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkKTtcbiAgICAgICAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJHNjb3BlLm5hbWVzcGFjZSxcbiAgICAgICAgICAgIHByb2plY3ROYW1lOiAkc2NvcGUucHJvamVjdElkLFxuICAgICAgICAgICAgcmVzb3VyY2U6IHJlc291cmNlUGF0aCxcbiAgICAgICAgICAgIGlucHV0TGlzdDogJHNjb3BlLmlucHV0TGlzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgICAgIGxvZy5pbmZvKFwiQWJvdXQgdG8gcG9zdCB0byBcIiArIHVybCArIFwiIHBheWxvYWQ6IFwiICsgYW5ndWxhci50b0pzb24ocmVxdWVzdCkpO1xuICAgICAgICAgICRodHRwLnBvc3QodXJsLCByZXF1ZXN0LCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAkc2NvcGUuaW52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbkVycm9yID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBkYXRhLm1lc3NhZ2UgPSBkYXRhLm1lc3NhZ2UgfHwgZGF0YS5vdXRwdXQ7XG4gICAgICAgICAgICAgICAgdmFyIHdpemFyZFJlc3VsdHMgPSBkYXRhLndpemFyZFJlc3VsdHM7XG4gICAgICAgICAgICAgICAgaWYgKHdpemFyZFJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh3aXphcmRSZXN1bHRzLnN0ZXBWYWxpZGF0aW9ucywgKHZhbGlkYXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaW52YWxpZCAmJiAhdmFsaWRhdGlvbi52YWxpZCkge1xuICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlcyA9IHZhbGlkYXRpb24ubWVzc2FnZXMgfHwgW107XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBtZXNzYWdlc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pbnZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25FcnJvciA9IG1lc3NhZ2UuZGVzY3JpcHRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uSW5wdXQgPSBtZXNzYWdlLmlucHV0TmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgdmFyIHN0ZXBJbnB1dHMgPSB3aXphcmRSZXN1bHRzLnN0ZXBJbnB1dHM7XG4gICAgICAgICAgICAgICAgICBpZiAoc3RlcElucHV0cykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NoZW1hID0gXy5sYXN0KHN0ZXBJbnB1dHMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVudGl0eSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVNjaGVtYShzY2hlbWEpO1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGxldHMgY29weSBhY3Jvc3MgYW55IGRlZmF1bHQgdmFsdWVzIGZyb20gdGhlIHNjaGVtYVxuICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWFbXCJwcm9wZXJ0aWVzXCJdLCAocHJvcGVydHksIG5hbWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHByb3BlcnR5LnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKFwiQWRkaW5nIGVudGl0eS5cIiArIG5hbWUgKyBcIiA9IFwiICsgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZW50aXR5W25hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmlucHV0TGlzdC5wdXNoKCRzY29wZS5lbnRpdHkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuY2FuTW92ZVRvTmV4dFN0ZXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldHMgY2xlYXIgdGhlIHJlc3BvbnNlIHdlJ3ZlIGFub3RoZXIgd2l6YXJkIHBhZ2UgdG8gZG9cbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UgaW5kaWNhdGUgdGhhdCB0aGUgd2l6YXJkIGp1c3QgY29tcGxldGVkIGFuZCBsZXRzIGhpZGUgdGhlIGlucHV0IGZvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS53aXphcmRDb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoISRzY29wZS5pbnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlc3BvbnNlID0gZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YU9yRW1wdHkgPSAoZGF0YSB8fCB7fSk7XG4gICAgICAgICAgICAgICAgdmFyIHN0YXR1cyA9IChkYXRhT3JFbXB0eS5zdGF0dXMgfHwgXCJcIikudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICRzY29wZS5yZXNwb25zZUNsYXNzID0gdG9CYWNrZ3JvdW5kU3R5bGUoc3RhdHVzKTtcblxuICAgICAgICAgICAgICAgIHZhciBvdXRwdXRQcm9wZXJ0aWVzID0gKGRhdGFPckVtcHR5Lm91dHB1dFByb3BlcnRpZXMgfHwge30pO1xuICAgICAgICAgICAgICAgIHZhciBwcm9qZWN0SWQgPSBkYXRhT3JFbXB0eS5wcm9qZWN0TmFtZSB8fCBvdXRwdXRQcm9wZXJ0aWVzLmZ1bGxOYW1lO1xuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUucmVzcG9uc2UgJiYgcHJvamVjdElkICYmICRzY29wZS5pZCA9PT0gJ3Byb2plY3QtbmV3Jykge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIC8vIGxldHMgZm9yd2FyZCB0byB0aGUgZGV2b3BzIGVkaXQgcGFnZVxuICAgICAgICAgICAgICAgICAgdmFyIGVkaXRQYXRoID0gVXJsSGVscGVycy5qb2luKERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpLCBcIi9mb3JnZS9jb21tYW5kL2Rldm9wcy1lZGl0XCIpO1xuICAgICAgICAgICAgICAgICAgbG9nLmluZm8oXCJNb3ZpbmcgdG8gdGhlIGRldm9wcyBlZGl0IHBhdGg6IFwiICsgZWRpdFBhdGgpO1xuICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoZWRpdFBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oXCJlbnRpdHlcIiwgKCkgPT4ge1xuICAgICAgICAgIHZhbGlkYXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZVNjaGVtYShzY2hlbWEpIHtcbiAgICAgICAgICBpZiAoc2NoZW1hKSB7XG4gICAgICAgICAgICAvLyBsZXRzIHJlbW92ZSB0aGUgdmFsdWVzIHNvIHRoYXQgd2UgY2FuIHByb3Blcmx5IGNoZWNrIHdoZW4gdGhlIHNjaGVtYSByZWFsbHkgZG9lcyBjaGFuZ2VcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSB0aGUgc2NoZW1hIHdpbGwgY2hhbmdlIGV2ZXJ5IHRpbWUgd2UgdHlwZSBhIGNoYXJhY3RlciA7KVxuICAgICAgICAgICAgdmFyIHNjaGVtYVdpdGhvdXRWYWx1ZXMgPSBhbmd1bGFyLmNvcHkoc2NoZW1hKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWFXaXRob3V0VmFsdWVzLnByb3BlcnRpZXMsIChwcm9wZXJ0eSkgPT4ge1xuICAgICAgICAgICAgICBkZWxldGUgcHJvcGVydHlbXCJ2YWx1ZVwiXTtcbiAgICAgICAgICAgICAgZGVsZXRlIHByb3BlcnR5W1wiZW5hYmxlZFwiXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIGpzb24gPSBhbmd1bGFyLnRvSnNvbihzY2hlbWFXaXRob3V0VmFsdWVzKTtcbiAgICAgICAgICAgIGlmIChqc29uICE9PSAkc2NvcGUucHJldmlvdXNTY2hlbWFKc29uKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlZCBzY2hlbWE6IFwiICsganNvbik7XG4gICAgICAgICAgICAgICRzY29wZS5wcmV2aW91c1NjaGVtYUpzb24gPSBqc29uO1xuICAgICAgICAgICAgICAkc2NvcGUuc2NoZW1hID0gc2NoZW1hO1xuXG4gICAgICAgICAgICAgIGlmICgkc2NvcGUuaWQgPT09IFwicHJvamVjdC1uZXdcIikge1xuICAgICAgICAgICAgICAgIHZhciBlbnRpdHkgPSAkc2NvcGUuZW50aXR5O1xuICAgICAgICAgICAgICAgIC8vIGxldHMgaGlkZSB0aGUgdGFyZ2V0IGxvY2F0aW9uIVxuICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0aWVzID0gc2NoZW1hLnByb3BlcnRpZXMgfHwge307XG4gICAgICAgICAgICAgICAgdmFyIG92ZXJ3cml0ZSA9IHByb3BlcnRpZXMub3ZlcndyaXRlO1xuICAgICAgICAgICAgICAgIHZhciBjYXRhbG9nID0gcHJvcGVydGllcy5jYXRhbG9nO1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXRMb2NhdGlvbiA9IHByb3BlcnRpZXMudGFyZ2V0TG9jYXRpb247XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldExvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgICB0YXJnZXRMb2NhdGlvbi5oaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgaWYgKG92ZXJ3cml0ZSkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyd3JpdGUuaGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGlkaW5nIHRhcmdldExvY2F0aW9uIVwiKTtcblxuICAgICAgICAgICAgICAgICAgLy8gbGV0cyBkZWZhdWx0IHRoZSB0eXBlXG4gICAgICAgICAgICAgICAgICBpZiAoIWVudGl0eS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eS50eXBlID0gXCJGcm9tIEFyY2hldHlwZSBDYXRhbG9nXCI7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYXRhbG9nKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIWVudGl0eS5jYXRhbG9nKSB7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eS5jYXRhbG9nID0gXCJmYWJyaWM4XCI7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdmFsaWRhdGUoKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5leGVjdXRpbmcgfHwgJHNjb3BlLnZhbGlkYXRpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG5ld0pzb24gPSBhbmd1bGFyLnRvSnNvbigkc2NvcGUuZW50aXR5KTtcbiAgICAgICAgICBpZiAobmV3SnNvbiA9PT0gJHNjb3BlLnZhbGlkYXRlZEVudGl0eUpzb24pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRlZEVudGl0eUpzb24gPSBuZXdKc29uO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgY29tbWFuZElkID0gJHNjb3BlLmlkO1xuICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgIHZhciB1cmwgPSB2YWxpZGF0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCk7XG4gICAgICAgICAgLy8gbGV0cyBwdXQgdGhlIGVudGl0eSBpbiB0aGUgbGFzdCBpdGVtIGluIHRoZSBsaXN0XG4gICAgICAgICAgdmFyIGlucHV0TGlzdCA9IFtdLmNvbmNhdCgkc2NvcGUuaW5wdXRMaXN0KTtcbiAgICAgICAgICBpbnB1dExpc3RbaW5wdXRMaXN0Lmxlbmd0aCAtIDFdID0gJHNjb3BlLmVudGl0eTtcbiAgICAgICAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJHNjb3BlLm5hbWVzcGFjZSxcbiAgICAgICAgICAgIHByb2plY3ROYW1lOiAkc2NvcGUucHJvamVjdElkLFxuICAgICAgICAgICAgcmVzb3VyY2U6IHJlc291cmNlUGF0aCxcbiAgICAgICAgICAgIGlucHV0TGlzdDogJHNjb3BlLmlucHV0TGlzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgICAgIC8vbG9nLmluZm8oXCJBYm91dCB0byBwb3N0IHRvIFwiICsgdXJsICsgXCIgcGF5bG9hZDogXCIgKyBhbmd1bGFyLnRvSnNvbihyZXF1ZXN0KSk7XG4gICAgICAgICAgJHNjb3BlLnZhbGlkYXRpbmcgPSB0cnVlO1xuICAgICAgICAgICRodHRwLnBvc3QodXJsLCByZXF1ZXN0LCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgdGhpcy52YWxpZGF0aW9uID0gZGF0YTtcbiAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcImdvdCB2YWxpZGF0aW9uIFwiICsgYW5ndWxhci50b0pzb24oZGF0YSwgdHJ1ZSkpO1xuICAgICAgICAgICAgICB2YXIgd2l6YXJkUmVzdWx0cyA9IGRhdGEud2l6YXJkUmVzdWx0cztcbiAgICAgICAgICAgICAgaWYgKHdpemFyZFJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3RlcElucHV0cyA9IHdpemFyZFJlc3VsdHMuc3RlcElucHV0cztcbiAgICAgICAgICAgICAgICBpZiAoc3RlcElucHV0cykge1xuICAgICAgICAgICAgICAgICAgdmFyIHNjaGVtYSA9IF8ubGFzdChzdGVwSW5wdXRzKTtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVNjaGVtYShzY2hlbWEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuXG4gICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAqIExldHMgdGhyb3R0bGUgdGhlIHZhbGlkYXRpb25zIHNvIHRoYXQgd2Ugb25seSBmaXJlIGFub3RoZXIgdmFsaWRhdGlvbiBhIGxpdHRsZVxuICAgICAgICAgICAgICAgKiBhZnRlciB3ZSd2ZSBnb3QgYSByZXBseSBhbmQgb25seSBpZiB0aGUgbW9kZWwgaGFzIGNoYW5nZWQgc2luY2UgdGhlblxuICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGUoKTtcbiAgICAgICAgICAgICAgfSwgMjAwKTtcbiAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgbG9nLndhcm4oXCJGYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiIFwiICsgZGF0YSArIFwiIFwiICsgc3RhdHVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdXBkYXRlRGF0YSgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIHRvQmFja2dyb3VuZFN0eWxlKHN0YXR1cykge1xuICAgICAgICAgIGlmICghc3RhdHVzKSB7XG4gICAgICAgICAgICBzdGF0dXMgPSBcIlwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc3RhdHVzLnN0YXJ0c1dpdGgoXCJzdWNcIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcImJnLXN1Y2Nlc3NcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiYmctd2FybmluZ1wiXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVEYXRhKCkge1xuICAgICAgICAgICRzY29wZS5pdGVtID0gbnVsbDtcbiAgICAgICAgICB2YXIgY29tbWFuZElkID0gJHNjb3BlLmlkO1xuICAgICAgICAgIGlmIChjb21tYW5kSWQpIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgICAgdmFyIHVybCA9IGNvbW1hbmRJbnB1dEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkLCAkc2NvcGUubmFtZXNwYWNlLCAkc2NvcGUucHJvamVjdElkLCByZXNvdXJjZVBhdGgpO1xuICAgICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgICAgICAgJGh0dHAuZ2V0KHVybCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVEYXRhIGxvYWRlZCBzY2hlbWFcIik7XG4gICAgICAgICAgICAgICAgICB1cGRhdGVTY2hlbWEoZGF0YSk7XG4gICAgICAgICAgICAgICAgICBzZXRNb2RlbENvbW1hbmRJbnB1dHMoRm9yZ2VNb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLmlkLCAkc2NvcGUuc2NoZW1hKTtcbiAgICAgICAgICAgICAgICAgIG9uU2NoZW1hTG9hZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgICB9KS5cbiAgICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oXCJGYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiIFwiICsgZGF0YSArIFwiIFwiICsgc3RhdHVzKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25TY2hlbWFMb2FkKCkge1xuICAgICAgICAgIC8vIGxldHMgdXBkYXRlIHRoZSB2YWx1ZSBpZiBpdHMgYmxhbmsgd2l0aCB0aGUgZGVmYXVsdCB2YWx1ZXMgZnJvbSB0aGUgcHJvcGVydGllc1xuICAgICAgICAgIHZhciBzY2hlbWEgPSAkc2NvcGUuc2NoZW1hO1xuICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gc2NoZW1hO1xuICAgICAgICAgIHZhciBlbnRpdHkgPSAkc2NvcGUuZW50aXR5O1xuICAgICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWEucHJvcGVydGllcywgKHByb3BlcnR5LCBrZXkpID0+IHtcbiAgICAgICAgICAgICAgdmFyIHZhbHVlID0gcHJvcGVydHkudmFsdWU7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZSAmJiAhZW50aXR5W2tleV0pIHtcbiAgICAgICAgICAgICAgICBlbnRpdHlba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIENvbW1hbmRzQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJDb21tYW5kc0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGRpYWxvZ1wiLCBcIiR3aW5kb3dcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRsb2NhdGlvblwiLCBcImxvY2FsU3RvcmFnZVwiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLCBcIkZvcmdlTW9kZWxcIixcbiAgICAoJHNjb3BlLCAkZGlhbG9nLCAkd2luZG93LCAkdGVtcGxhdGVDYWNoZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgbG9jYWxTdG9yYWdlLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMLCBGb3JnZU1vZGVsKSA9PiB7XG5cbiAgICAgICRzY29wZS5tb2RlbCA9IEZvcmdlTW9kZWw7XG4gICAgICAkc2NvcGUucmVzb3VyY2VQYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXSB8fCAkbG9jYXRpb24uc2VhcmNoKClbXCJwYXRoXCJdIHx8IFwiXCI7XG4gICAgICAkc2NvcGUucmVwb05hbWUgPSBcIlwiO1xuICAgICAgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbiA9ICRzY29wZS5yZXNvdXJjZVBhdGggfHwgXCJcIjtcbiAgICAgIHZhciBwYXRoU3RlcHMgPSAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uLnNwbGl0KFwiL1wiKTtcbiAgICAgIGlmIChwYXRoU3RlcHMgJiYgcGF0aFN0ZXBzLmxlbmd0aCkge1xuICAgICAgICAkc2NvcGUucmVwb05hbWUgPSBwYXRoU3RlcHNbcGF0aFN0ZXBzLmxlbmd0aCAtIDFdO1xuICAgICAgfVxuICAgICAgaWYgKCEkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uLnN0YXJ0c1dpdGgoXCIvXCIpICYmICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24ubGVuZ3RoID4gMCkge1xuICAgICAgICAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uID0gXCIvXCIgKyAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuYXZhdGFyX3VybCA9IGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl07XG4gICAgICAkc2NvcGUudXNlciA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdO1xuXG4gICAgICAkc2NvcGUuY29tbWFuZHMgPSBnZXRNb2RlbENvbW1hbmRzKEZvcmdlTW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgpO1xuICAgICAgJHNjb3BlLmZldGNoZWQgPSAkc2NvcGUuY29tbWFuZHMubGVuZ3RoICE9PSAwO1xuXG4gICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG4gICAgICByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cblxuICAgICAgJHNjb3BlLnRhYmxlQ29uZmlnID0ge1xuICAgICAgICBkYXRhOiAnY29tbWFuZHMnLFxuICAgICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgbXVsdGlTZWxlY3Q6IHRydWUsXG4gICAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICAgZmlsdGVyVGV4dDogJGxvY2F0aW9uLnNlYXJjaCgpW1wicVwiXSB8fCAnJ1xuICAgICAgICB9LFxuICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICduYW1lJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTmFtZScsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcImlkVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0Rlc2NyaXB0aW9uJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdjYXRlZ29yeScsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0NhdGVnb3J5J1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gY29tbWFuZE1hdGNoZXMoY29tbWFuZCkge1xuICAgICAgICB2YXIgZmlsdGVyVGV4dCA9ICRzY29wZS50YWJsZUNvbmZpZy5maWx0ZXJPcHRpb25zLmZpbHRlclRleHQ7XG4gICAgICAgIHJldHVybiBjb21tYW5kTWF0Y2hlc1RleHQoY29tbWFuZCwgZmlsdGVyVGV4dCk7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3IgPSB7XG4gICAgICAgIGZpbHRlclRleHQ6IFwiXCIsXG4gICAgICAgIGZvbGRlcnM6IFtdLFxuICAgICAgICBzZWxlY3RlZENvbW1hbmRzOiBbXSxcbiAgICAgICAgZXhwYW5kZWRGb2xkZXJzOiB7fSxcblxuICAgICAgICBpc09wZW46IChmb2xkZXIpID0+IHtcbiAgICAgICAgICB2YXIgZmlsdGVyVGV4dCA9ICRzY29wZS50YWJsZUNvbmZpZy5maWx0ZXJPcHRpb25zLmZpbHRlclRleHQ7XG4gICAgICAgICAgaWYgKGZpbHRlclRleHQgIT09ICcnIHx8ICRzY29wZS5jb21tYW5kU2VsZWN0b3IuZXhwYW5kZWRGb2xkZXJzW2ZvbGRlci5pZF0pIHtcbiAgICAgICAgICAgIHJldHVybiBcIm9wZW5lZFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJjbG9zZWRcIjtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhclNlbGVjdGVkOiAoKSA9PiB7XG4gICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5leHBhbmRlZEZvbGRlcnMgPSB7fTtcbiAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZVNlbGVjdGVkOiAoKSA9PiB7XG4gICAgICAgICAgLy8gbGV0cyB1cGRhdGUgdGhlIHNlbGVjdGVkIGFwcHNcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRDb21tYW5kcyA9IFtdO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUubW9kZWwuYXBwRm9sZGVycywgKGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgdmFyIGFwcHMgPSBmb2xkZXIuYXBwcy5maWx0ZXIoKGFwcCkgPT4gYXBwLnNlbGVjdGVkKTtcbiAgICAgICAgICAgIGlmIChhcHBzKSB7XG4gICAgICAgICAgICAgIHNlbGVjdGVkQ29tbWFuZHMgPSBzZWxlY3RlZENvbW1hbmRzLmNvbmNhdChhcHBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLnNlbGVjdGVkQ29tbWFuZHMgPSBzZWxlY3RlZENvbW1hbmRzLnNvcnRCeShcIm5hbWVcIik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2VsZWN0OiAoY29tbWFuZCwgZmxhZykgPT4ge1xuICAgICAgICAgIHZhciBpZCA9IGNvbW1hbmQubmFtZTtcbi8qXG4gICAgICAgICAgYXBwLnNlbGVjdGVkID0gZmxhZztcbiovXG4gICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci51cGRhdGVTZWxlY3RlZCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFNlbGVjdGVkQ2xhc3M6IChhcHApID0+IHtcbiAgICAgICAgICBpZiAoYXBwLmFic3RyYWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gXCJhYnN0cmFjdFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYXBwLnNlbGVjdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJzZWxlY3RlZFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgfSxcblxuICAgICAgICBzaG93Q29tbWFuZDogKGNvbW1hbmQpID0+IHtcbiAgICAgICAgICByZXR1cm4gY29tbWFuZE1hdGNoZXMoY29tbWFuZCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2hvd0ZvbGRlcjogKGZvbGRlcikgPT4ge1xuICAgICAgICAgIHZhciBmaWx0ZXJUZXh0ID0gJHNjb3BlLnRhYmxlQ29uZmlnLmZpbHRlck9wdGlvbnMuZmlsdGVyVGV4dDtcbiAgICAgICAgICByZXR1cm4gIWZpbHRlclRleHQgfHwgZm9sZGVyLmNvbW1hbmRzLnNvbWUoKGFwcCkgPT4gY29tbWFuZE1hdGNoZXMoYXBwKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cblxuICAgICAgdmFyIHVybCA9IFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kc1wiLCAkc2NvcGUubmFtZXNwYWNlLCAkc2NvcGUucHJvamVjdElkLCAkc2NvcGUucmVzb3VyY2VQYXRoKTtcbiAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsKTtcbiAgICAgIGxvZy5pbmZvKFwiRmV0Y2hpbmcgY29tbWFuZHMgZnJvbTogXCIgKyB1cmwpO1xuICAgICAgJGh0dHAuZ2V0KHVybCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGRhdGEpICYmIHN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICAgIHZhciBmb2xkZXJNYXAgPSB7fTtcbiAgICAgICAgICAgIHZhciBmb2xkZXJzID0gW107XG4gICAgICAgICAgICAkc2NvcGUuY29tbWFuZHMgPSBfLnNvcnRCeShkYXRhLCBcIm5hbWVcIik7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmNvbW1hbmRzLCAoY29tbWFuZCkgPT4ge1xuICAgICAgICAgICAgICB2YXIgaWQgPSBjb21tYW5kLmlkIHx8IGNvbW1hbmQubmFtZTtcbiAgICAgICAgICAgICAgY29tbWFuZC4kbGluayA9IGNvbW1hbmRMaW5rKCRzY29wZS5wcm9qZWN0SWQsIGlkLCByZXNvdXJjZVBhdGgpO1xuXG4gICAgICAgICAgICAgIHZhciBuYW1lID0gY29tbWFuZC5uYW1lIHx8IGNvbW1hbmQuaWQ7XG4gICAgICAgICAgICAgIHZhciBmb2xkZXJOYW1lID0gY29tbWFuZC5jYXRlZ29yeTtcbiAgICAgICAgICAgICAgdmFyIHNob3J0TmFtZSA9IG5hbWU7XG4gICAgICAgICAgICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoXCI6XCIsIDIpO1xuICAgICAgICAgICAgICBpZiAobmFtZXMgIT0gbnVsbCAmJiBuYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZm9sZGVyTmFtZSA9IG5hbWVzWzBdO1xuICAgICAgICAgICAgICAgIHNob3J0TmFtZSA9IG5hbWVzWzFdLnRyaW0oKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoZm9sZGVyTmFtZSA9PT0gXCJQcm9qZWN0L0J1aWxkXCIpIHtcbiAgICAgICAgICAgICAgICBmb2xkZXJOYW1lID0gXCJQcm9qZWN0XCI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29tbWFuZC4kc2hvcnROYW1lID0gc2hvcnROYW1lO1xuICAgICAgICAgICAgICBjb21tYW5kLiRmb2xkZXJOYW1lID0gZm9sZGVyTmFtZTtcbiAgICAgICAgICAgICAgdmFyIGZvbGRlciA9IGZvbGRlck1hcFtmb2xkZXJOYW1lXTtcbiAgICAgICAgICAgICAgaWYgKCFmb2xkZXIpIHtcbiAgICAgICAgICAgICAgICBmb2xkZXIgPSB7XG4gICAgICAgICAgICAgICAgICBuYW1lOiBmb2xkZXJOYW1lLFxuICAgICAgICAgICAgICAgICAgY29tbWFuZHM6IFtdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBmb2xkZXJNYXBbZm9sZGVyTmFtZV0gPSBmb2xkZXI7XG4gICAgICAgICAgICAgICAgZm9sZGVycy5wdXNoKGZvbGRlcik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZm9sZGVyLmNvbW1hbmRzLnB1c2goY29tbWFuZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGZvbGRlcnMgPSBfLnNvcnRCeShmb2xkZXJzLCBcIm5hbWVcIik7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goZm9sZGVycywgKGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgICBmb2xkZXIuY29tbWFuZHMgPSBfLnNvcnRCeShmb2xkZXIuY29tbWFuZHMsIFwiJHNob3J0TmFtZVwiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5mb2xkZXJzID0gZm9sZGVycztcblxuICAgICAgICAgICAgc2V0TW9kZWxDb21tYW5kcygkc2NvcGUubW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5jb21tYW5kcyk7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KS5cbiAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgUmVwb0NvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiUmVwb0NvbnRyb2xsZXJcIixcbiAgICBbXCIkc2NvcGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLFxuICAgICAgKCRzY29wZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLm5hbWUgPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdO1xuXG4gICAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgICAgcmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQoJHNjb3BlLCAkbG9jYXRpb24pO1xuXG4gICAgICAgICRzY29wZS4kb24oJyRyb3V0ZVVwZGF0ZScsICgkZXZlbnQpID0+IHtcbiAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHVwZGF0ZURhdGEoKTtcblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVEYXRhKCkge1xuICAgICAgICAgIGlmICgkc2NvcGUubmFtZSkge1xuICAgICAgICAgICAgdmFyIHVybCA9IHJlcG9BcGlVcmwoRm9yZ2VBcGlVUkwsICRzY29wZS5uYW1lKTtcbiAgICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsKTtcbiAgICAgICAgICAgIHZhciBjb25maWcgPSBjcmVhdGVIdHRwQ29uZmlnKCk7XG4gICAgICAgICAgICAkaHR0cC5nZXQodXJsLCBjb25maWcpLlxuICAgICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICBlbnJpY2hSZXBvKGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkc2NvcGUuZW50aXR5ID0gZGF0YTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIFJlcG9zQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJSZXBvc0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGRpYWxvZ1wiLCBcIiR3aW5kb3dcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRsb2NhdGlvblwiLCBcImxvY2FsU3RvcmFnZVwiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLCBcIkt1YmVybmV0ZXNNb2RlbFwiLCBcIlNlcnZpY2VSZWdpc3RyeVwiLFxuICAgICgkc2NvcGUsICRkaWFsb2csICR3aW5kb3csICR0ZW1wbGF0ZUNhY2hlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEt1YmVybmV0ZXNNb2RlbDogS3ViZXJuZXRlcy5LdWJlcm5ldGVzTW9kZWxTZXJ2aWNlLCBTZXJ2aWNlUmVnaXN0cnkpID0+IHtcblxuICAgICAgJHNjb3BlLm1vZGVsID0gS3ViZXJuZXRlc01vZGVsO1xuICAgICAgJHNjb3BlLnJlc291cmNlUGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl07XG4gICAgICAkc2NvcGUuY29tbWFuZHNMaW5rID0gKHBhdGgpID0+IGNvbW1hbmRzTGluayhwYXRoLCAkc2NvcGUucHJvamVjdElkKTtcblxuICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuXG4gICAgICAkc2NvcGUuJG9uKCdrdWJlcm5ldGVzTW9kZWxVcGRhdGVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB1cGRhdGVMaW5rcygpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG5cbiAgICAgICRzY29wZS50YWJsZUNvbmZpZyA9IHtcbiAgICAgICAgZGF0YTogJ3Byb2plY3RzJyxcbiAgICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgIG11bHRpU2VsZWN0OiB0cnVlLFxuICAgICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgIGZpbHRlclRleHQ6ICRsb2NhdGlvbi5zZWFyY2goKVtcInFcIl0gfHwgJydcbiAgICAgICAgfSxcbiAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ1JlcG9zaXRvcnkgTmFtZScsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcInJlcG9UZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ2FjdGlvbnMnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdBY3Rpb25zJyxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwicmVwb0FjdGlvbnNUZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUubG9naW4gPSB7XG4gICAgICAgIGF1dGhIZWFkZXI6IGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdIHx8IFwiXCIsXG4gICAgICAgIHJlbG9naW46IGZhbHNlLFxuICAgICAgICBhdmF0YXJfdXJsOiBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdIHx8IFwiXCIsXG4gICAgICAgIHVzZXI6IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdIHx8IFwiXCIsXG4gICAgICAgIHBhc3N3b3JkOiBcIlwiLFxuICAgICAgICBlbWFpbDogbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdIHx8IFwiXCJcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kb0xvZ2luID0gKCkgPT4ge1xuICAgICAgICB2YXIgbG9naW4gPSAkc2NvcGUubG9naW47XG4gICAgICAgIHZhciB1c2VyID0gbG9naW4udXNlcjtcbiAgICAgICAgdmFyIHBhc3N3b3JkID0gbG9naW4ucGFzc3dvcmQ7XG4gICAgICAgIGlmICh1c2VyICYmIHBhc3N3b3JkKSB7XG4gICAgICAgICAgdmFyIHVzZXJQd2QgPSB1c2VyICsgJzonICsgcGFzc3dvcmQ7XG4gICAgICAgICAgbG9naW4uYXV0aEhlYWRlciA9ICdCYXNpYyAnICsgKHVzZXJQd2QuZW5jb2RlQmFzZTY0KCkpO1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmxvZ291dCA9ICgpID0+IHtcbiAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdO1xuICAgICAgICAkc2NvcGUubG9naW4uYXV0aEhlYWRlciA9IG51bGw7XG4gICAgICAgICRzY29wZS5sb2dpbi5sb2dnZWRJbiA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUubG9naW4uZmFpbGVkID0gZmFsc2U7XG4gICAgICAgIGxvZ2dlZEluVG9Hb2dzID0gZmFsc2U7XG4gICAgICB9O1xuXG5cbiAgICAgICRzY29wZS5vcGVuQ29tbWFuZHMgPSAoKSA9PiB7XG4gICAgICAgIHZhciByZXNvdXJjZVBhdGggPSBudWxsO1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSAkc2NvcGUudGFibGVDb25maWcuc2VsZWN0ZWRJdGVtcztcbiAgICAgICAgaWYgKF8uaXNBcnJheShzZWxlY3RlZCkgJiYgc2VsZWN0ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzb3VyY2VQYXRoID0gc2VsZWN0ZWRbMF0ucGF0aDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbGluayA9IGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgICBsb2cuaW5mbyhcIm1vdmluZyB0byBjb21tYW5kcyBsaW5rOiBcIiArIGxpbmspO1xuICAgICAgICAkbG9jYXRpb24ucGF0aChsaW5rKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGUgPSAocHJvamVjdHMpID0+IHtcbiAgICAgICAgVUkubXVsdGlJdGVtQ29uZmlybUFjdGlvbkRpYWxvZyg8VUkuTXVsdGlJdGVtQ29uZmlybUFjdGlvbk9wdGlvbnM+e1xuICAgICAgICAgIGNvbGxlY3Rpb246IHByb2plY3RzLFxuICAgICAgICAgIGluZGV4OiAncGF0aCcsXG4gICAgICAgICAgb25DbG9zZTogKHJlc3VsdDpib29sZWFuKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgIGRvRGVsZXRlKHByb2plY3RzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHRpdGxlOiAnRGVsZXRlIHByb2plY3RzPycsXG4gICAgICAgICAgYWN0aW9uOiAnVGhlIGZvbGxvd2luZyBwcm9qZWN0cyB3aWxsIGJlIHJlbW92ZWQgKHRob3VnaCB0aGUgZmlsZXMgd2lsbCByZW1haW4gb24geW91ciBmaWxlIHN5c3RlbSk6JyxcbiAgICAgICAgICBva1RleHQ6ICdEZWxldGUnLFxuICAgICAgICAgIG9rQ2xhc3M6ICdidG4tZGFuZ2VyJyxcbiAgICAgICAgICBjdXN0b206IFwiVGhpcyBvcGVyYXRpb24gaXMgcGVybWFuZW50IG9uY2UgY29tcGxldGVkIVwiLFxuICAgICAgICAgIGN1c3RvbUNsYXNzOiBcImFsZXJ0IGFsZXJ0LXdhcm5pbmdcIlxuICAgICAgICB9KS5vcGVuKCk7XG4gICAgICB9O1xuXG4gICAgICB1cGRhdGVMaW5rcygpO1xuXG4gICAgICBmdW5jdGlvbiBkb0RlbGV0ZShwcm9qZWN0cykge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2gocHJvamVjdHMsIChwcm9qZWN0KSA9PiB7XG4gICAgICAgICAgbG9nLmluZm8oXCJEZWxldGluZyBcIiArIGFuZ3VsYXIudG9Kc29uKCRzY29wZS5wcm9qZWN0cykpO1xuICAgICAgICAgIHZhciBwYXRoID0gcHJvamVjdC5wYXRoO1xuICAgICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgcGF0aCk7XG4gICAgICAgICAgICAkaHR0cC5kZWxldGUodXJsKS5cbiAgICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gXCJGYWlsZWQgdG8gUE9TVCB0byBcIiArIHVybCArIFwiIGdvdCBzdGF0dXM6IFwiICsgc3RhdHVzO1xuICAgICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdlcnJvcicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiB1cGRhdGVMaW5rcygpIHtcbiAgICAgICAgdmFyICRnb2dzTGluayA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlUmVhZHlMaW5rKGdvZ3NTZXJ2aWNlTmFtZSk7XG4gICAgICAgIGlmICgkZ29nc0xpbmspIHtcbiAgICAgICAgICAkc2NvcGUuc2lnblVwVXJsID0gVXJsSGVscGVycy5qb2luKCRnb2dzTGluaywgXCJ1c2VyL3NpZ25fdXBcIik7XG4gICAgICAgICAgJHNjb3BlLmZvcmdvdFBhc3N3b3JkVXJsID0gVXJsSGVscGVycy5qb2luKCRnb2dzTGluaywgXCJ1c2VyL2ZvcmdldF9wYXNzd29yZFwiKTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuJGdvZ3NMaW5rID0gJGdvZ3NMaW5rO1xuICAgICAgICAkc2NvcGUuJGZvcmdlTGluayA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlUmVhZHlMaW5rKEt1YmVybmV0ZXMuZmFicmljOEZvcmdlU2VydmljZU5hbWUpO1xuXG4gICAgICAgICRzY29wZS4kaGFzQ0RQaXBlbGluZVRlbXBsYXRlID0gXy5hbnkoJHNjb3BlLm1vZGVsLnRlbXBsYXRlcywgKHQpID0+IFwiY2QtcGlwZWxpbmVcIiA9PT0gS3ViZXJuZXRlcy5nZXROYW1lKHQpKTtcblxuICAgICAgICB2YXIgZXhwZWN0ZWRSQ1MgPSBbS3ViZXJuZXRlcy5nb2dzU2VydmljZU5hbWUsIEt1YmVybmV0ZXMuZmFicmljOEZvcmdlU2VydmljZU5hbWUsIEt1YmVybmV0ZXMuamVua2luc1NlcnZpY2VOYW1lXTtcbiAgICAgICAgdmFyIHJlcXVpcmVkUkNzID0ge307XG4gICAgICAgIHZhciBucyA9IEt1YmVybmV0ZXMuY3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoKTtcbiAgICAgICAgdmFyIHJ1bm5pbmdDRFBpcGVsaW5lID0gdHJ1ZTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGV4cGVjdGVkUkNTLCAocmNOYW1lKSA9PiB7XG4gICAgICAgICAgdmFyIHJjID0gJHNjb3BlLm1vZGVsLmdldFJlcGxpY2F0aW9uQ29udHJvbGxlcihucywgcmNOYW1lKTtcbiAgICAgICAgICBpZiAocmMpIHtcbiAgICAgICAgICAgIHJlcXVpcmVkUkNzW3JjTmFtZV0gPSByYztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcnVubmluZ0NEUGlwZWxpbmUgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUuJHJlcXVpcmVkUkNzID0gcmVxdWlyZWRSQ3M7XG4gICAgICAgICRzY29wZS4kcnVubmluZ0NEUGlwZWxpbmUgPSBydW5uaW5nQ0RQaXBlbGluZTtcbiAgICAgICAgdmFyIHVybCA9IFwiXCI7XG4gICAgICAgICRsb2NhdGlvbiA9IEt1YmVybmV0ZXMuaW5qZWN0KFwiJGxvY2F0aW9uXCIpO1xuICAgICAgICBpZiAoJGxvY2F0aW9uKSB7XG4gICAgICAgICAgdXJsID0gJGxvY2F0aW9uLnVybCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdXJsKSB7XG4gICAgICAgICAgdXJsID0gd2luZG93LmxvY2F0aW9uLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyBzaG91bGQgd2Ugc3VwcG9ydCBhbnkgb3RoZXIgdGVtcGxhdGUgbmFtZXNwYWNlcz9cbiAgICAgICAgdmFyIHRlbXBsYXRlTmFtZXNwYWNlID0gXCJkZWZhdWx0XCI7XG4gICAgICAgICRzY29wZS4kcnVuQ0RQaXBlbGluZUxpbmsgPSBcIi9rdWJlcm5ldGVzL25hbWVzcGFjZS9cIiArIHRlbXBsYXRlTmFtZXNwYWNlICsgXCIvdGVtcGxhdGVzL1wiICsgbnMgKyBcIj9xPWNkLXBpcGVsaW5lJnJldHVyblRvPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHVybCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgIHZhciBhdXRoSGVhZGVyID0gJHNjb3BlLmxvZ2luLmF1dGhIZWFkZXI7XG4gICAgICAgIHZhciBlbWFpbCA9ICRzY29wZS5sb2dpbi5lbWFpbCB8fCBcIlwiO1xuICAgICAgICBpZiAoYXV0aEhlYWRlcikge1xuICAgICAgICAgIHZhciB1cmwgPSByZXBvc0FwaVVybChGb3JnZUFwaVVSTCk7XG4gICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwsIGF1dGhIZWFkZXIsIGVtYWlsKTtcbiAgICAgICAgICB2YXIgY29uZmlnID0ge1xuLypcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgR29nc0F1dGhvcml6YXRpb246IGF1dGhIZWFkZXIsXG4gICAgICAgICAgICAgIEdvZ3NFbWFpbDogZW1haWxcbiAgICAgICAgICAgIH1cbiovXG4gICAgICAgICAgfTtcbiAgICAgICAgICAkaHR0cC5nZXQodXJsLCBjb25maWcpLlxuICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmZhaWxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAkc2NvcGUubG9naW4ubG9nZ2VkSW4gPSB0cnVlO1xuICAgICAgICAgICAgICBsb2dnZWRJblRvR29ncyA9IHRydWU7XG4gICAgICAgICAgICAgIHZhciBhdmF0YXJfdXJsID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKHN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFkYXRhIHx8ICFhbmd1bGFyLmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgIGRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gbGV0cyBzdG9yZSBhIHN1Y2Nlc3NmdWwgbG9naW4gc28gdGhhdCB3ZSBoaWRlIHRoZSBsb2dpbiBwYWdlXG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl0gPSBhdXRoSGVhZGVyO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NFbWFpbFwiXSA9IGVtYWlsO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdID0gJHNjb3BlLmxvZ2luLnVzZXIgfHwgXCJcIjtcblxuICAgICAgICAgICAgICAgICRzY29wZS5wcm9qZWN0cyA9IF8uc29ydEJ5KGRhdGEsIFwibmFtZVwiKTtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLnByb2plY3RzLCAocmVwbykgPT4ge1xuICAgICAgICAgICAgICAgICAgZW5yaWNoUmVwbyhyZXBvKTtcbiAgICAgICAgICAgICAgICAgIGlmICghYXZhdGFyX3VybCkge1xuICAgICAgICAgICAgICAgICAgICBhdmF0YXJfdXJsID0gQ29yZS5wYXRoR2V0KHJlcG8sIFtcIm93bmVyXCIsIFwiYXZhdGFyX3VybFwiXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhdmF0YXJfdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmF2YXRhcl91cmwgPSBhdmF0YXJfdXJsO1xuICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl0gPSBhdmF0YXJfdXJsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5cbiAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUubG9nb3V0KCk7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dpbi5mYWlsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICBpZiAoc3RhdHVzICE9PSA0MDMpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB1cGRhdGVEYXRhKCk7XG5cbiAgICB9XSk7XG59XG4iLCIvLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgY29uc3Qgc2VjcmV0TmFtZXNwYWNlS2V5ID0gXCJmYWJyaWM4U291cmNlU2VjcmV0TmFtZXNwYWNlXCI7XG4gIGNvbnN0IHNlY3JldE5hbWVLZXkgPSBcImZhYnJpYzhTb3VyY2VTZWNyZXRcIjtcblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0U291cmNlU2VjcmV0TmFtZXNwYWNlKGxvY2FsU3RvcmFnZSkge1xuICAgIHZhciBzZWNyZXROYW1lc3BhY2UgPSBsb2NhbFN0b3JhZ2Vbc2VjcmV0TmFtZXNwYWNlS2V5XTtcbiAgICB2YXIgdXNlck5hbWUgPSBLdWJlcm5ldGVzLmN1cnJlbnRVc2VyTmFtZSgpO1xuICAgIGlmICghc2VjcmV0TmFtZXNwYWNlKSB7XG4gICAgICBzZWNyZXROYW1lc3BhY2UgPSBcInVzZXItc2VjcmV0cy1zb3VyY2UtXCIgKyB1c2VyTmFtZTtcbiAgICB9XG4gICAgcmV0dXJuIHNlY3JldE5hbWVzcGFjZTtcbiAgfVxuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCBucywgcHJvamVjdElkKSB7XG4gICAgdmFyIHNlY3JldEtleSA9IGNyZWF0ZUxvY2FsU3RvcmFnZUtleShzZWNyZXROYW1lS2V5LCBucywgcHJvamVjdElkKTtcbiAgICB2YXIgc291cmNlU2VjcmV0ID0gbG9jYWxTdG9yYWdlW3NlY3JldEtleV07XG4gICAgcmV0dXJuIHNvdXJjZVNlY3JldDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzZXRQcm9qZWN0U291cmNlU2VjcmV0KGxvY2FsU3RvcmFnZSwgbnMsIHByb2plY3RJZCwgc2VjcmV0TmFtZSkge1xuICAgIHZhciBzZWNyZXRLZXkgPSBjcmVhdGVMb2NhbFN0b3JhZ2VLZXkoc2VjcmV0TmFtZUtleSwgbnMsIHByb2plY3RJZCk7XG4gICAgbG9jYWxTdG9yYWdlW3NlY3JldEtleV0gPSBzZWNyZXROYW1lO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlTG9jYWxTdG9yYWdlS2V5KHByZWZpeCwgbnMsIG5hbWUpIHtcbiAgICByZXR1cm4gcHJlZml4ICsgXCIvXCIgKyBucyArIFwiL1wiICsgbmFtZTtcbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJzZWNyZXRIZWxwZXJzLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG5cbiAgZXhwb3J0IHZhciBTZWNyZXRzQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJTZWNyZXRzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiRlbGVtZW50XCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkbG9jYXRpb25cIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJGb3JnZU1vZGVsXCIsIFwiS3ViZXJuZXRlc01vZGVsXCIsXG4gICAgKCRzY29wZSwgJGRpYWxvZywgJHdpbmRvdywgJGVsZW1lbnQsICR0ZW1wbGF0ZUNhY2hlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwsIEt1YmVybmV0ZXNNb2RlbCkgPT4ge1xuXG4gICAgICAkc2NvcGUubW9kZWwgPSBLdWJlcm5ldGVzTW9kZWw7XG5cbiAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTZXR0aW5nc0JyZWFkY3J1bWJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U2V0dGluZ3NTdWJOYXZCYXJzKCRzY29wZS5wcm9qZWN0SWQpO1xuXG4gICAgICB2YXIgcHJvamVjdElkID0gJHNjb3BlLnByb2plY3RJZDtcbiAgICAgIHZhciBucyA9ICRzY29wZS5uYW1lc3BhY2U7XG4gICAgICB2YXIgdXNlck5hbWUgPSBLdWJlcm5ldGVzLmN1cnJlbnRVc2VyTmFtZSgpO1xuICAgICAgJHNjb3BlLnNvdXJjZVNlY3JldCA9IGdldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCBucywgcHJvamVjdElkKTtcblxuICAgICAgdmFyIGNyZWF0ZWRTZWNyZXQgPSAkbG9jYXRpb24uc2VhcmNoKClbXCJzZWNyZXRcIl07XG5cbiAgICAgIHZhciBwcm9qZWN0Q2xpZW50ID0gS3ViZXJuZXRlcy5jcmVhdGVLdWJlcm5ldGVzQ2xpZW50KFwicHJvamVjdHNcIik7XG4gICAgICAkc2NvcGUuc291cmNlU2VjcmV0TmFtZXNwYWNlID0gZ2V0U291cmNlU2VjcmV0TmFtZXNwYWNlKGxvY2FsU3RvcmFnZSk7XG5cbiAgICAgIGxvZy5pbmZvKFwiRm91bmQgc291cmNlIHNlY3JldCBuYW1lc3BhY2UgXCIgKyAkc2NvcGUuc291cmNlU2VjcmV0TmFtZXNwYWNlKTtcbiAgICAgIGxvZy5pbmZvKFwiRm91bmQgc291cmNlIHNlY3JldCBmb3IgXCIgKyBucyArIFwiL1wiICsgcHJvamVjdElkICsgXCIgPSBcIiArICRzY29wZS5zb3VyY2VTZWNyZXQpO1xuXG4gICAgICAvLyBUT0RPIGRlZHVjZSB0aGUga2luZCBmcm9tIHRoZSBidWlsZENvbmZpZyBnaXQgdXJsXG4gICAgICB2YXIga2luZCA9IFwic3NoXCI7XG4gICAgICB2YXIgc2F2ZWRVcmwgPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgJHNjb3BlLmFkZE5ld1NlY3JldExpbmsgPSBEZXZlbG9wZXIucHJvamVjdFdvcmtzcGFjZUxpbmsobnMsIHByb2plY3RJZCwgVXJsSGVscGVycy5qb2luKFwibmFtZXNwYWNlXCIsICRzY29wZS5zb3VyY2VTZWNyZXROYW1lc3BhY2UsIFwic2VjcmV0Q3JlYXRlP2tpbmQ9XCIgKyBraW5kICsgXCImc2F2ZWRVcmw9XCIgKyBzYXZlZFVybCkpO1xuXG4gICAgICAkc2NvcGUuJG9uKCdrdWJlcm5ldGVzTW9kZWxVcGRhdGVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBjaGVja05hbWVzcGFjZUNyZWF0ZWQoKTtcbiAgICAgIH0pO1xuXG4gICAgICAkc2NvcGUudGFibGVDb25maWcgPSB7XG4gICAgICAgIGRhdGE6ICdwZXJzb25hbFNlY3JldHMnLFxuICAgICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiB0cnVlLFxuICAgICAgICBtdWx0aVNlbGVjdDogZmFsc2UsXG4gICAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICAgZmlsdGVyVGV4dDogJGxvY2F0aW9uLnNlYXJjaCgpW1wicVwiXSB8fCAnJ1xuICAgICAgICB9LFxuICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdfa2V5JyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnU2VjcmV0IE5hbWUnLFxuICAgICAgICAgICAgZGVmYXVsdFNvcnQ6IHRydWUsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dCBub3dyYXBcIj57e3Jvdy5lbnRpdHkubWV0YWRhdGEubmFtZX19PC9kaXY+J1xuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICckbGFiZWxzVGV4dCcsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0xhYmVscycsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcImxhYmVsVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH0sXG4gICAgICAgIF1cbiAgICAgIH07XG5cbiAgICAgIGlmIChjcmVhdGVkU2VjcmV0KSB7XG4gICAgICAgICRsb2NhdGlvbi5zZWFyY2goXCJzZWNyZXRcIiwgbnVsbCk7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZFNlY3JldE5hbWUgPSBjcmVhdGVkU2VjcmV0O1xuICAgICAgICBsb2cuaW5mbyhcIj09PT09PT09PSBzZXR0aW5nIHRoZSBzZWxlY3RlZCBzZWNyZXQgdG86IFwiICsgJHNjb3BlLnNlbGVjdGVkU2VjcmV0TmFtZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxlY3RlZFNlY3JldE5hbWUoKTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oXCJ0YWJsZUNvbmZpZy5zZWxlY3RlZEl0ZW1zXCIsICgpID0+IHtcbiAgICAgICAgc2VsZWN0ZWRTZWNyZXROYW1lKCk7XG4gICAgICB9KTtcblxuICAgICAgZnVuY3Rpb24gc2VsZWN0ZWRTZWNyZXROYW1lKCkge1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRTZWNyZXROYW1lID0gY3JlYXRlZFNlY3JldCB8fCBnZXRQcm9qZWN0U291cmNlU2VjcmV0KGxvY2FsU3RvcmFnZSwgbnMsIHByb2plY3RJZCk7XG4gICAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLnRhYmxlQ29uZmlnLnNlbGVjdGVkSXRlbXM7XG4gICAgICAgIGlmIChzZWxlY3RlZEl0ZW1zICYmIHNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIHNlY3JldCA9IHNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgICAgY29uc3QgbmFtZSA9IEt1YmVybmV0ZXMuZ2V0TmFtZShzZWNyZXQpO1xuICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRTZWNyZXROYW1lID0gbmFtZTtcbiAgICAgICAgICAgIGlmIChjcmVhdGVkU2VjcmV0ICYmIG5hbWUgIT09IGNyZWF0ZWRTZWNyZXQpIHtcbiAgICAgICAgICAgICAgbG9nLmluZm8oXCItLS0tLSBjbGVhcmluZyB0aGUgY3JlYXRlZFNlY3JldCFcIik7XG4gICAgICAgICAgICAgIC8vIGxldHMgY2xlYXIgdGhlIHByZXZpb3VzbHkgY3JlYXRlZCBzZWNyZXRcbiAgICAgICAgICAgICAgY3JlYXRlZFNlY3JldCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkc2NvcGUuc2VsZWN0ZWRTZWNyZXROYW1lO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS50YWJsZUNvbmZpZy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgICBzZWxlY3RlZEl0ZW1zLnNwbGljZSgwLCBzZWxlY3RlZEl0ZW1zLmxlbmd0aCk7XG4gICAgICAgIHZhciBjdXJyZW50ID0gY3JlYXRlZFNlY3JldCB8fCBnZXRQcm9qZWN0U291cmNlU2VjcmV0KGxvY2FsU3RvcmFnZSwgbnMsIHByb2plY3RJZCk7XG4gICAgICAgIGlmIChjdXJyZW50KSB7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5wZXJzb25hbFNlY3JldHMsIChzZWNyZXQpID0+IHtcbiAgICAgICAgICAgIGlmICghc2VsZWN0ZWRJdGVtcy5sZW5ndGggJiYgY3VycmVudCA9PT0gS3ViZXJuZXRlcy5nZXROYW1lKHNlY3JldCkpIHtcbiAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtcy5wdXNoKHNlY3JldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnRhYmxlQ29uZmlnLnNlbGVjdGVkSXRlbXMgPSBzZWxlY3RlZEl0ZW1zO1xuICAgICAgICBzZWxlY3RlZFNlY3JldE5hbWUoKTtcbiAgICAgICAgbG9nLmluZm8oXCI9PT09IGNhbmNlbCBmb3Igc2VsZWN0aW9uOiBcIiArIGN1cnJlbnQgKyBcIiBnZW5lcmF0ZWQgc2VsZWN0ZWRJdGVtczogXCIgKyBzZWxlY3RlZEl0ZW1zICsgXCIgaGFzIHNlbGVjdGlvbjogXCIgKyAkc2NvcGUuc2VsZWN0ZWRTZWNyZXROYW1lKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5jYW5TYXZlID0gKCkgPT4ge1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSBzZWxlY3RlZFNlY3JldE5hbWUoKTtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBnZXRQcm9qZWN0U291cmNlU2VjcmV0KGxvY2FsU3RvcmFnZSwgbnMsIHByb2plY3RJZCk7XG4gICAgICAgIHJldHVybiBzZWxlY3RlZCAmJiBzZWxlY3RlZCAhPT0gY3VycmVudDtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5zYXZlID0gKCkgPT4ge1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSBzZWxlY3RlZFNlY3JldE5hbWUoKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkKSB7XG4gICAgICAgICAgc2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsIG5zLCBwcm9qZWN0SWQsIHNlbGVjdGVkKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgY2hlY2tOYW1lc3BhY2VDcmVhdGVkKCk7XG5cblxuICAgICAgZnVuY3Rpb24gb25QZXJzb25hbFNlY3JldHMoc2VjcmV0cykge1xuICAgICAgICAkc2NvcGUucGVyc29uYWxTZWNyZXRzID0gc2VjcmV0cztcbiAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAkc2NvcGUuY2FuY2VsKCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNoZWNrTmFtZXNwYWNlQ3JlYXRlZCgpIHtcbiAgICAgICAgdmFyIG5hbWVzcGFjZU5hbWUgPSAkc2NvcGUuc291cmNlU2VjcmV0TmFtZXNwYWNlO1xuXG4gICAgICAgIGZ1bmN0aW9uIHdhdGNoU2VjcmV0cygpIHtcbiAgICAgICAgICBsb2cuaW5mbyhcIndhdGNoaW5nIHNlY3JldHMgb24gbmFtZXNwYWNlOiBcIiArIG5hbWVzcGFjZU5hbWUpO1xuICAgICAgICAgIEt1YmVybmV0ZXMud2F0Y2goJHNjb3BlLCAkZWxlbWVudCwgXCJzZWNyZXRzXCIsIG5hbWVzcGFjZU5hbWUsIG9uUGVyc29uYWxTZWNyZXRzKTtcbiAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEkc2NvcGUuc2VjcmV0TmFtZXNwYWNlKSB7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5tb2RlbC5wcm9qZWN0cywgKHByb2plY3QpID0+IHtcbiAgICAgICAgICAgIHZhciBuYW1lID0gS3ViZXJuZXRlcy5nZXROYW1lKHByb2plY3QpO1xuICAgICAgICAgICAgaWYgKG5hbWUgPT09IG5hbWVzcGFjZU5hbWUpIHtcbiAgICAgICAgICAgICAgbG9nLmluZm8oXCJGb3VuZCBzZWNyZXQgbmFtZXNwYWNlISBcIiArIG5hbWUpO1xuICAgICAgICAgICAgICAkc2NvcGUuc2VjcmV0TmFtZXNwYWNlID0gcHJvamVjdDtcbiAgICAgICAgICAgICAgd2F0Y2hTZWNyZXRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoISRzY29wZS5zZWNyZXROYW1lc3BhY2UgJiYgJHNjb3BlLm1vZGVsLnByb2plY3RzICYmICRzY29wZS5tb2RlbC5wcm9qZWN0cy5sZW5ndGgpIHtcbiAgICAgICAgICAvLyBsZXRzIGNyZWF0ZSBhIG5ldyBuYW1lc3BhY2UhXG4gICAgICAgICAgbG9nLmluZm8oXCJDcmVhdGluZyBhIG5ldyBuYW1lc3BhY2UgZm9yIHRoZSB1c2VyIHNlY3JldHMuLi4uIFwiICsgbmFtZXNwYWNlTmFtZSk7XG4gICAgICAgICAgdmFyIHByb2plY3QgPSB7XG4gICAgICAgICAgICBhcGlWZXJzaW9uOiBLdWJlcm5ldGVzLmRlZmF1bHRBcGlWZXJzaW9uLFxuICAgICAgICAgICAga2luZDogXCJQcm9qZWN0XCIsXG4gICAgICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgICAgICBuYW1lOiBuYW1lc3BhY2VOYW1lLFxuICAgICAgICAgICAgICBsYWJlbHM6IHtcbiAgICAgICAgICAgICAgICB1c2VyOiB1c2VyTmFtZSxcbiAgICAgICAgICAgICAgICBncm91cDogJ3NlY3JldHMnLFxuICAgICAgICAgICAgICAgIHByb2plY3Q6ICdzb3VyY2UnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcHJvamVjdENsaWVudC5wdXQocHJvamVjdCxcbiAgICAgICAgICAgIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICRzY29wZS5zZWNyZXROYW1lc3BhY2UgPSBwcm9qZWN0O1xuICAgICAgICAgICAgICB3YXRjaFNlY3JldHMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdlcnJvcicsIFwiRmFpbGVkIHRvIGNyZWF0ZSBzZWNyZXQgbmFtZXNwYWNlOiBcIiArIG5hbWVzcGFjZU5hbWUgKyBcIlxcblwiICsgZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICB9XSk7XG59XG4iLCIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxubW9kdWxlIE1haW4ge1xuXG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9IFwiZmFicmljOC1jb25zb2xlXCI7XG5cbiAgZXhwb3J0IHZhciBsb2c6IExvZ2dpbmcuTG9nZ2VyID0gTG9nZ2VyLmdldChwbHVnaW5OYW1lKTtcblxuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IFwicGx1Z2lucy9tYWluL2h0bWxcIjtcblxuICAvLyBrdWJlcm5ldGVzIHNlcnZpY2UgbmFtZXNcbiAgZXhwb3J0IHZhciBjaGF0U2VydmljZU5hbWUgPSBcImxldHNjaGF0XCI7XG4gIGV4cG9ydCB2YXIgZ3JhZmFuYVNlcnZpY2VOYW1lID0gXCJncmFmYW5hXCI7XG4gIGV4cG9ydCB2YXIgYXBwTGlicmFyeVNlcnZpY2VOYW1lID0gXCJhcHAtbGlicmFyeVwiO1xuXG4gIGV4cG9ydCB2YXIgdmVyc2lvbjphbnkgPSB7fTtcblxufVxuIiwiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9mb3JnZS90cy9mb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWFpbkdsb2JhbHMudHNcIi8+XG5cbm1vZHVsZSBNYWluIHtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbRm9yZ2UucGx1Z2luTmFtZV0pO1xuXG4gIHZhciB0YWIgPSB1bmRlZmluZWQ7XG5cbiAgX21vZHVsZS5ydW4oKCRyb290U2NvcGUsIEhhd3Rpb05hdjogSGF3dGlvTWFpbk5hdi5SZWdpc3RyeSwgS3ViZXJuZXRlc01vZGVsLCBTZXJ2aWNlUmVnaXN0cnksIHByZWZlcmVuY2VzUmVnaXN0cnkpID0+IHtcblxuICAgIEhhd3Rpb05hdi5vbihIYXd0aW9NYWluTmF2LkFjdGlvbnMuQ0hBTkdFRCwgcGx1Z2luTmFtZSwgKGl0ZW1zKSA9PiB7XG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHN3aXRjaChpdGVtLmlkKSB7XG4gICAgICAgICAgY2FzZSAnZm9yZ2UnOlxuICAgICAgICAgIGNhc2UgJ2p2bSc6XG4gICAgICAgICAgY2FzZSAnd2lraSc6XG4gICAgICAgICAgY2FzZSAnZG9ja2VyLXJlZ2lzdHJ5JzpcbiAgICAgICAgICAgIGl0ZW0uaXNWYWxpZCA9ICgpID0+IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAnbGlicmFyeScsXG4gICAgICB0aXRsZTogKCkgPT4gJ0xpYnJhcnknLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgdGhlIGxpYnJhcnkgb2YgYXBwbGljYXRpb25zJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGFwcExpYnJhcnlTZXJ2aWNlTmFtZSkgJiYgU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoXCJhcHAtbGlicmFyeS1qb2xva2lhXCIpLFxuICAgICAgaHJlZjogKCkgPT4gXCIvd2lraS92aWV3XCIsXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIHZhciBraWJhbmFTZXJ2aWNlTmFtZSA9IEt1YmVybmV0ZXMua2liYW5hU2VydmljZU5hbWU7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAna2liYW5hJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0xvZ3MnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgYW5kIHNlYXJjaCBhbGwgbG9ncyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgS2liYW5hIGFuZCBFbGFzdGljU2VhcmNoJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGtpYmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IEt1YmVybmV0ZXMua2liYW5hTG9nc0xpbmsoU2VydmljZVJlZ2lzdHJ5KSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2FwaW1hbicsXG4gICAgICB0aXRsZTogKCkgPT4gJ0FQSSBNYW5hZ2VtZW50JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdBZGQgUG9saWNpZXMgYW5kIFBsYW5zIHRvIHlvdXIgQVBJcyB3aXRoIEFwaW1hbicsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZSgnYXBpbWFuJyksXG4gICAgICBvbGRIcmVmOiAoKSA9PiB7IC8qIG5vdGhpbmcgdG8gZG8gKi8gfSxcbiAgICAgIGhyZWY6ICgpID0+IHtcbiAgICAgICAgdmFyIGhhc2ggPSB7XG4gICAgICAgICAgYmFja1RvOiBuZXcgVVJJKCkudG9TdHJpbmcoKSxcbiAgICAgICAgICB0b2tlbjogSGF3dGlvT0F1dGguZ2V0T0F1dGhUb2tlbigpXG4gICAgICAgIH07XG4gICAgICAgIHZhciB1cmkgPSBuZXcgVVJJKFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluaygnYXBpbWFuJykpO1xuICAgICAgICAvLyBUT0RPIGhhdmUgdG8gb3ZlcndyaXRlIHRoZSBwb3J0IGhlcmUgZm9yIHNvbWUgcmVhc29uXG4gICAgICAgICg8YW55PnVyaS5wb3J0KCc4MCcpLnF1ZXJ5KHt9KS5wYXRoKCdhcGltYW51aS9pbmRleC5odG1sJykpLmhhc2goVVJJLmVuY29kZShhbmd1bGFyLnRvSnNvbihoYXNoKSkpO1xuICAgICAgICByZXR1cm4gdXJpLnRvU3RyaW5nKCk7XG4gICAgICB9ICAgIFxuICAgIH0pO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2dyYWZhbmEnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnTWV0cmljcycsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlld3MgbWV0cmljcyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgR3JhZmFuYSBhbmQgSW5mbHV4REInLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoZ3JhZmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhncmFmYW5hU2VydmljZU5hbWUpLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiBcImNoYXRcIixcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0NoYXQnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NoYXQgcm9vbSBmb3IgZGlzY3Vzc2luZyB0aGlzIG5hbWVzcGFjZScsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShjaGF0U2VydmljZU5hbWUpLFxuICAgICAgaHJlZjogKCkgPT4ge1xuICAgICAgICB2YXIgYW5zd2VyID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKGNoYXRTZXJ2aWNlTmFtZSk7XG4gICAgICAgIGlmIChhbnN3ZXIpIHtcbi8qXG4gICAgICAgICAgVE9ETyBhZGQgYSBjdXN0b20gbGluayB0byB0aGUgY29ycmVjdCByb29tIGZvciB0aGUgY3VycmVudCBuYW1lc3BhY2U/XG5cbiAgICAgICAgICB2YXIgaXJjSG9zdCA9IFwiXCI7XG4gICAgICAgICAgdmFyIGlyY1NlcnZpY2UgPSBTZXJ2aWNlUmVnaXN0cnkuZmluZFNlcnZpY2UoXCJodWJvdFwiKTtcbiAgICAgICAgICBpZiAoaXJjU2VydmljZSkge1xuICAgICAgICAgICAgaXJjSG9zdCA9IGlyY1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpcmNIb3N0KSB7XG4gICAgICAgICAgICB2YXIgbmljayA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdIHx8IGxvY2FsU3RvcmFnZVtcImlyY05pY2tcIl0gfHwgXCJteW5hbWVcIjtcbiAgICAgICAgICAgIHZhciByb29tID0gXCIjZmFicmljOC1cIiArICBjdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgICAgICAgYW5zd2VyID0gVXJsSGVscGVycy5qb2luKGFuc3dlciwgXCIva2l3aVwiLCBpcmNIb3N0LCBcIj8mbmljaz1cIiArIG5pY2sgKyByb29tKTtcbiAgICAgICAgICB9XG4qL1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICB9LFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICAvLyBUT0RPIHdlIHNob3VsZCBtb3ZlIHRoaXMgdG8gYSBuaWNlciBsaW5rIGluc2lkZSB0aGUgTGlicmFyeSBzb29uIC0gYWxzbyBsZXRzIGhpZGUgdW50aWwgaXQgd29ya3MuLi5cbi8qXG4gICAgd29ya3NwYWNlLnRvcExldmVsVGFicy5wdXNoKHtcbiAgICAgIGlkOiAnY3JlYXRlUHJvamVjdCcsXG4gICAgICB0aXRsZTogKCkgPT4gICdDcmVhdGUnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NyZWF0ZXMgYSBuZXcgcHJvamVjdCcsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShcImFwcC1saWJyYXJ5XCIpICYmIGZhbHNlLFxuICAgICAgaHJlZjogKCkgPT4gXCIvcHJvamVjdC9jcmVhdGVcIlxuICAgIH0pO1xuKi9cblxuICAgIHByZWZlcmVuY2VzUmVnaXN0cnkuYWRkVGFiKCdBYm91dCAnICsgdmVyc2lvbi5uYW1lLCBVcmxIZWxwZXJzLmpvaW4odGVtcGxhdGVQYXRoLCAnYWJvdXQuaHRtbCcpKTtcblxuICAgIGxvZy5pbmZvKFwic3RhcnRlZCwgdmVyc2lvbjogXCIsIHZlcnNpb24udmVyc2lvbik7XG4gICAgbG9nLmluZm8oXCJjb21taXQgSUQ6IFwiLCB2ZXJzaW9uLmNvbW1pdElkKTtcbiAgfSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLnJlZ2lzdGVyUHJlQm9vdHN0cmFwVGFzaygobmV4dCkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICB1cmw6ICd2ZXJzaW9uLmpzb24/cmV2PScgKyBEYXRlLm5vdygpLCBcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdmVyc2lvbiA9IGFuZ3VsYXIuZnJvbUpzb24oZGF0YSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIHZlcnNpb24gPSB7XG4gICAgICAgICAgICBuYW1lOiAnZmFicmljOC1jb25zb2xlJyxcbiAgICAgICAgICAgIHZlcnNpb246ICcnXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgICB9LFxuICAgICAgZXJyb3I6IChqcVhIUiwgdGV4dCwgc3RhdHVzKSA9PiB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIkZhaWxlZCB0byBmZXRjaCB2ZXJzaW9uOiBqcVhIUjogXCIsIGpxWEhSLCBcIiB0ZXh0OiBcIiwgdGV4dCwgXCIgc3RhdHVzOiBcIiwgc3RhdHVzKTtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSxcbiAgICAgIGRhdGFUeXBlOiBcImh0bWxcIlxuICAgIH0pO1xuICB9KTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIuYWRkTW9kdWxlKHBsdWdpbk5hbWUpO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5HbG9iYWxzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5QbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBNYWluIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKCdNYWluLkFib3V0JywgKCRzY29wZSkgPT4ge1xuICAgICRzY29wZS5pbmZvID0gdmVyc2lvbjtcbiAgfSk7XG59XG5cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cblxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IHZhciBsb2c6TG9nZ2luZy5Mb2dnZXIgPSBMb2dnZXIuZ2V0KFwiV2lraVwiKTtcblxuICBleHBvcnQgdmFyIGNhbWVsTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9jYW1lbC5hcGFjaGUub3JnL3NjaGVtYS9zcHJpbmdcIiwgXCJodHRwOi8vY2FtZWwuYXBhY2hlLm9yZy9zY2hlbWEvYmx1ZXByaW50XCJdO1xuICBleHBvcnQgdmFyIHNwcmluZ05hbWVzcGFjZXMgPSBbXCJodHRwOi8vd3d3LnNwcmluZ2ZyYW1ld29yay5vcmcvc2NoZW1hL2JlYW5zXCJdO1xuICBleHBvcnQgdmFyIGRyb29sc05hbWVzcGFjZXMgPSBbXCJodHRwOi8vZHJvb2xzLm9yZy9zY2hlbWEvZHJvb2xzLXNwcmluZ1wiXTtcbiAgZXhwb3J0IHZhciBkb3plck5hbWVzcGFjZXMgPSBbXCJodHRwOi8vZG96ZXIuc291cmNlZm9yZ2UubmV0XCJdO1xuICBleHBvcnQgdmFyIGFjdGl2ZW1xTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9hY3RpdmVtcS5hcGFjaGUub3JnL3NjaGVtYS9jb3JlXCJdO1xuXG4gIGV4cG9ydCB2YXIgdXNlQ2FtZWxDYW52YXNCeURlZmF1bHQgPSBmYWxzZTtcblxuICBleHBvcnQgdmFyIGV4Y2x1ZGVBZGp1c3RtZW50UHJlZml4ZXMgPSBbXCJodHRwOi8vXCIsIFwiaHR0cHM6Ly9cIiwgXCIjXCJdO1xuXG4gIGV4cG9ydCBlbnVtIFZpZXdNb2RlIHsgTGlzdCwgSWNvbiB9O1xuXG4gIC8qKlxuICAgKiBUaGUgY3VzdG9tIHZpZXdzIHdpdGhpbiB0aGUgd2lraSBuYW1lc3BhY2U7IGVpdGhlciBcIi93aWtpLyRmb29cIiBvciBcIi93aWtpL2JyYW5jaC8kYnJhbmNoLyRmb29cIlxuICAgKi9cbiAgZXhwb3J0IHZhciBjdXN0b21XaWtpVmlld1BhZ2VzID0gW1wiL2Zvcm1UYWJsZVwiLCBcIi9jYW1lbC9kaWFncmFtXCIsIFwiL2NhbWVsL2NhbnZhc1wiLCBcIi9jYW1lbC9wcm9wZXJ0aWVzXCIsIFwiL2RvemVyL21hcHBpbmdzXCJdO1xuXG4gIC8qKlxuICAgKiBXaGljaCBleHRlbnNpb25zIGRvIHdlIHdpc2ggdG8gaGlkZSBpbiB0aGUgd2lraSBmaWxlIGxpc3RpbmdcbiAgICogQHByb3BlcnR5IGhpZGVFeHRlbnNpb25zXG4gICAqIEBmb3IgV2lraVxuICAgKiBAdHlwZSBBcnJheVxuICAgKi9cbiAgZXhwb3J0IHZhciBoaWRlRXh0ZW5zaW9ucyA9IFtcIi5wcm9maWxlXCJdO1xuXG4gIHZhciBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuID0gL15bYS16QS1aMC05Ll8tXSokLztcbiAgdmFyIGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkID0gXCJOYW1lIG11c3QgYmU6IGxldHRlcnMsIG51bWJlcnMsIGFuZCAuIF8gb3IgLSBjaGFyYWN0ZXJzXCI7XG5cbiAgdmFyIGRlZmF1bHRGaWxlTmFtZUV4dGVuc2lvblBhdHRlcm4gPSBcIlwiO1xuXG4gIHZhciBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuID0gL15bYS16MC05Ll8tXSokLztcbiAgdmFyIGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm5JbnZhbGlkID0gXCJOYW1lIG11c3QgYmU6IGxvd2VyLWNhc2UgbGV0dGVycywgbnVtYmVycywgYW5kIC4gXyBvciAtIGNoYXJhY3RlcnNcIjtcblxuICBleHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlT3B0aW9ucyB7XG4gICAgd29ya3NwYWNlOiBhbnk7XG4gICAgZm9ybTogYW55O1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBicmFuY2g6IHN0cmluZztcbiAgICBwYXJlbnRJZDogc3RyaW5nO1xuICAgIHN1Y2Nlc3M6IChmaWxlQ29udGVudHM/OnN0cmluZykgPT4gdm9pZDtcbiAgICBlcnJvcjogKGVycm9yOmFueSkgPT4gdm9pZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgd2l6YXJkIHRyZWUgZm9yIGNyZWF0aW5nIG5ldyBjb250ZW50IGluIHRoZSB3aWtpXG4gICAqIEBwcm9wZXJ0eSBkb2N1bWVudFRlbXBsYXRlc1xuICAgKiBAZm9yIFdpa2lcbiAgICogQHR5cGUgQXJyYXlcbiAgICovXG4gIGV4cG9ydCB2YXIgZG9jdW1lbnRUZW1wbGF0ZXMgPSBbXG4gICAge1xuICAgICAgbGFiZWw6IFwiRm9sZGVyXCIsXG4gICAgICB0b29sdGlwOiBcIkNyZWF0ZSBhIG5ldyBmb2xkZXIgdG8gY29udGFpbiBkb2N1bWVudHNcIixcbiAgICAgIGZvbGRlcjogdHJ1ZSxcbiAgICAgIGljb246IFwiL2ltZy9pY29ucy93aWtpL2ZvbGRlci5naWZcIixcbiAgICAgIGV4ZW1wbGFyOiBcIm15Zm9sZGVyXCIsXG4gICAgICByZWdleDogZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm5JbnZhbGlkXG4gICAgfSxcbiAgICAvKlxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkFwcFwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGVzIGEgbmV3IEFwcCBmb2xkZXIgdXNlZCB0byBjb25maWd1cmUgYW5kIHJ1biBjb250YWluZXJzXCIsXG4gICAgICBhZGRDbGFzczogXCJmYSBmYS1jb2cgZ3JlZW5cIixcbiAgICAgIGV4ZW1wbGFyOiAnbXlhcHAnLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogJycsXG4gICAgICBnZW5lcmF0ZWQ6IHtcbiAgICAgICAgbWJlYW46IFsnaW8uZmFicmljOCcsIHsgdHlwZTogJ0t1YmVybmV0ZXNUZW1wbGF0ZU1hbmFnZXInIH1dLFxuICAgICAgICBpbml0OiAod29ya3NwYWNlLCAkc2NvcGUpID0+IHtcblxuICAgICAgICB9LFxuICAgICAgICBnZW5lcmF0ZTogKG9wdGlvbnM6R2VuZXJhdGVPcHRpb25zKSA9PiB7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiR290IG9wdGlvbnM6IFwiLCBvcHRpb25zKTtcbiAgICAgICAgICBvcHRpb25zLmZvcm0ubmFtZSA9IG9wdGlvbnMubmFtZTtcbiAgICAgICAgICBvcHRpb25zLmZvcm0ucGF0aCA9IG9wdGlvbnMucGFyZW50SWQ7XG4gICAgICAgICAgb3B0aW9ucy5mb3JtLmJyYW5jaCA9IG9wdGlvbnMuYnJhbmNoO1xuICAgICAgICAgIHZhciBqc29uID0gYW5ndWxhci50b0pzb24ob3B0aW9ucy5mb3JtKTtcbiAgICAgICAgICB2YXIgam9sb2tpYSA9IDxKb2xva2lhLklKb2xva2lhPiBIYXd0aW9Db3JlLmluamVjdG9yLmdldChcImpvbG9raWFcIik7XG4gICAgICAgICAgam9sb2tpYS5yZXF1ZXN0KHtcbiAgICAgICAgICAgIHR5cGU6ICdleGVjJyxcbiAgICAgICAgICAgIG1iZWFuOiAnaW8uZmFicmljODp0eXBlPUt1YmVybmV0ZXNUZW1wbGF0ZU1hbmFnZXInLFxuICAgICAgICAgICAgb3BlcmF0aW9uOiAnY3JlYXRlQXBwQnlKc29uJyxcbiAgICAgICAgICAgIGFyZ3VtZW50czogW2pzb25dXG4gICAgICAgICAgfSwgQ29yZS5vblN1Y2Nlc3MoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJHZW5lcmF0ZWQgYXBwLCByZXNwb25zZTogXCIsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIG9wdGlvbnMuc3VjY2Vzcyh1bmRlZmluZWQpOyBcbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICBlcnJvcjogKHJlc3BvbnNlKSA9PiB7IG9wdGlvbnMuZXJyb3IocmVzcG9uc2UuZXJyb3IpOyB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9LFxuICAgICAgICBmb3JtOiAod29ya3NwYWNlLCAkc2NvcGUpID0+IHtcbiAgICAgICAgICAvLyBUT0RPIGRvY2tlciByZWdpc3RyeSBjb21wbGV0aW9uXG4gICAgICAgICAgaWYgKCEkc2NvcGUuZG9Eb2NrZXJSZWdpc3RyeUNvbXBsZXRpb24pIHtcbiAgICAgICAgICAgICRzY29wZS5mZXRjaERvY2tlclJlcG9zaXRvcmllcyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIERvY2tlclJlZ2lzdHJ5LmNvbXBsZXRlRG9ja2VyUmVnaXN0cnkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1bW1hcnlNYXJrZG93bjogJ0FkZCBhcHAgc3VtbWFyeSBoZXJlJyxcbiAgICAgICAgICAgIHJlcGxpY2FDb3VudDogMVxuICAgICAgICAgIH07XG4gICAgICAgIH0sXG4gICAgICAgIHNjaGVtYToge1xuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXBwIHNldHRpbmdzJyxcbiAgICAgICAgICB0eXBlOiAnamF2YS5sYW5nLlN0cmluZycsXG4gICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgJ2RvY2tlckltYWdlJzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnRG9ja2VyIEltYWdlJyxcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnamF2YS5sYW5nLlN0cmluZycsXG4gICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcbiAgICAgICAgICAgICAgICAncmVxdWlyZWQnOiAnJywgXG4gICAgICAgICAgICAgICAgJ2NsYXNzJzogJ2lucHV0LXhsYXJnZScsXG4gICAgICAgICAgICAgICAgJ3R5cGVhaGVhZCc6ICdyZXBvIGZvciByZXBvIGluIGZldGNoRG9ja2VyUmVwb3NpdG9yaWVzKCkgfCBmaWx0ZXI6JHZpZXdWYWx1ZScsXG4gICAgICAgICAgICAgICAgJ3R5cGVhaGVhZC13YWl0LW1zJzogJzIwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdzdW1tYXJ5TWFya2Rvd24nOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdTaG9ydCBEZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICd0eXBlJzogJ2phdmEubGFuZy5TdHJpbmcnLFxuICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgJ2NsYXNzJzogJ2lucHV0LXhsYXJnZScgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdyZXBsaWNhQ291bnQnOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdSZXBsaWNhIENvdW50JyxcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnamF2YS5sYW5nLkludGVnZXInLFxuICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHtcbiAgICAgICAgICAgICAgICBtaW46ICcwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2xhYmVscyc6IHtcbiAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogJ0xhYmVscycsXG4gICAgICAgICAgICAgICd0eXBlJzogJ21hcCcsXG4gICAgICAgICAgICAgICdpdGVtcyc6IHtcbiAgICAgICAgICAgICAgICAndHlwZSc6ICdzdHJpbmcnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkZhYnJpYzggUHJvZmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGUgYSBuZXcgZW1wdHkgZmFicmljIHByb2ZpbGUuIFVzaW5nIGEgaHlwaGVuICgnLScpIHdpbGwgY3JlYXRlIGEgZm9sZGVyIGhlaXJhcmNoeSwgZm9yIGV4YW1wbGUgJ215LWF3ZXNvbWUtcHJvZmlsZScgd2lsbCBiZSBhdmFpbGFibGUgdmlhIHRoZSBwYXRoICdteS9hd2Vzb21lL3Byb2ZpbGUnLlwiLFxuICAgICAgcHJvZmlsZTogdHJ1ZSxcbiAgICAgIGFkZENsYXNzOiBcImZhIGZhLWJvb2sgZ3JlZW5cIixcbiAgICAgIGV4ZW1wbGFyOiBcInVzZXItcHJvZmlsZVwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGZhYnJpY09ubHk6IHRydWVcbiAgICB9LFxuICAgICovXG4gICAge1xuICAgICAgbGFiZWw6IFwiUHJvcGVydGllcyBGaWxlXCIsXG4gICAgICB0b29sdGlwOiBcIkEgcHJvcGVydGllcyBmaWxlIHR5cGljYWxseSB1c2VkIHRvIGNvbmZpZ3VyZSBKYXZhIGNsYXNzZXNcIixcbiAgICAgIGV4ZW1wbGFyOiBcInByb3BlcnRpZXMtZmlsZS5wcm9wZXJ0aWVzXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5wcm9wZXJ0aWVzXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkpTT04gRmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJBIGZpbGUgY29udGFpbmluZyBKU09OIGRhdGFcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50Lmpzb25cIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLmpzb25cIlxuICAgIH0sXG4gICAgLypcbiAgICB7XG4gICAgICBsYWJlbDogXCJLZXkgU3RvcmUgRmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGVzIGEga2V5c3RvcmUgKGRhdGFiYXNlKSBvZiBjcnlwdG9ncmFwaGljIGtleXMsIFguNTA5IGNlcnRpZmljYXRlIGNoYWlucywgYW5kIHRydXN0ZWQgY2VydGlmaWNhdGVzLlwiLFxuICAgICAgZXhlbXBsYXI6ICdrZXlzdG9yZS5qa3MnLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIuamtzXCIsXG4gICAgICBnZW5lcmF0ZWQ6IHtcbiAgICAgICAgbWJlYW46IFsnaGF3dGlvJywgeyB0eXBlOiAnS2V5c3RvcmVTZXJ2aWNlJyB9XSxcbiAgICAgICAgaW5pdDogZnVuY3Rpb24od29ya3NwYWNlLCAkc2NvcGUpIHtcbiAgICAgICAgICB2YXIgbWJlYW4gPSAnaGF3dGlvOnR5cGU9S2V5c3RvcmVTZXJ2aWNlJztcbiAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB3b3Jrc3BhY2Uuam9sb2tpYS5yZXF1ZXN0KCB7dHlwZTogXCJyZWFkXCIsIG1iZWFuOiBtYmVhbiwgYXR0cmlidXRlOiBcIlNlY3VyaXR5UHJvdmlkZXJJbmZvXCIgfSwge1xuICAgICAgICAgICAgc3VjY2VzczogKHJlc3BvbnNlKT0+e1xuICAgICAgICAgICAgICAkc2NvcGUuc2VjdXJpdHlQcm92aWRlckluZm8gPSByZXNwb25zZS52YWx1ZTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb3VsZCBub3QgZmluZCB0aGUgc3VwcG9ydGVkIHNlY3VyaXR5IGFsZ29yaXRobXM6ICcsIHJlc3BvbnNlLmVycm9yKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2VuZXJhdGU6IGZ1bmN0aW9uKG9wdGlvbnM6R2VuZXJhdGVPcHRpb25zKSB7XG4gICAgICAgICAgdmFyIGVuY29kZWRGb3JtID0gSlNPTi5zdHJpbmdpZnkob3B0aW9ucy5mb3JtKVxuICAgICAgICAgIHZhciBtYmVhbiA9ICdoYXd0aW86dHlwZT1LZXlzdG9yZVNlcnZpY2UnO1xuICAgICAgICAgIHZhciByZXNwb25zZSA9IG9wdGlvbnMud29ya3NwYWNlLmpvbG9raWEucmVxdWVzdCgge1xuICAgICAgICAgICAgICB0eXBlOiAnZXhlYycsIFxuICAgICAgICAgICAgICBtYmVhbjogbWJlYW4sXG4gICAgICAgICAgICAgIG9wZXJhdGlvbjogJ2NyZWF0ZUtleVN0b3JlVmlhSlNPTihqYXZhLmxhbmcuU3RyaW5nKScsXG4gICAgICAgICAgICAgIGFyZ3VtZW50czogW2VuY29kZWRGb3JtXVxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICBtZXRob2Q6J1BPU1QnLFxuICAgICAgICAgICAgICBzdWNjZXNzOmZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKHJlc3BvbnNlLnZhbHVlKVxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBlcnJvcjpmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5lcnJvcihyZXNwb25zZS5lcnJvcilcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZvcm06IGZ1bmN0aW9uKHdvcmtzcGFjZSwgJHNjb3BlKXsgXG4gICAgICAgICAgcmV0dXJuIHsgXG4gICAgICAgICAgICBzdG9yZVR5cGU6ICRzY29wZS5zZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlTdG9yZVR5cGVzWzBdLFxuICAgICAgICAgICAgY3JlYXRlUHJpdmF0ZUtleTogZmFsc2UsXG4gICAgICAgICAgICBrZXlMZW5ndGg6IDQwOTYsXG4gICAgICAgICAgICBrZXlBbGdvcml0aG06ICRzY29wZS5zZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlBbGdvcml0aG1zWzBdLFxuICAgICAgICAgICAga2V5VmFsaWRpdHk6IDM2NVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2NoZW1hOiB7XG4gICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJLZXlzdG9yZSBTZXR0aW5nc1wiLFxuICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgIFwicHJvcGVydGllc1wiOiB7IFxuICAgICAgICAgICAgIFwic3RvcmVQYXNzd29yZFwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiS2V5c3RvcmUgcGFzc3dvcmQuXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJwYXNzd29yZFwiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7IFwicmVxdWlyZWRcIjogIFwiXCIsICBcIm5nLW1pbmxlbmd0aFwiOjYgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJzdG9yZVR5cGVcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB0eXBlIG9mIHN0b3JlIHRvIGNyZWF0ZVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWVsZW1lbnQnOiBcInNlbGVjdFwiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7IFwibmctb3B0aW9uc1wiOiAgXCJ2IGZvciB2IGluIHNlY3VyaXR5UHJvdmlkZXJJbmZvLnN1cHBvcnRlZEtleVN0b3JlVHlwZXNcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImNyZWF0ZVByaXZhdGVLZXlcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNob3VsZCB3ZSBnZW5lcmF0ZSBhIHNlbGYtc2lnbmVkIHByaXZhdGUga2V5P1wiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleUNvbW1vbk5hbWVcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb21tb24gbmFtZSBvZiB0aGUga2V5LCB0eXBpY2FsbHkgc2V0IHRvIHRoZSBob3N0bmFtZSBvZiB0aGUgc2VydmVyXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5TGVuZ3RoXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbGVuZ3RoIG9mIHRoZSBjcnlwdG9ncmFwaGljIGtleVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiTG9uZ1wiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleUFsZ29yaXRobVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGtleSBhbGdvcml0aG1cIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImphdmEubGFuZy5TdHJpbmdcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1lbGVtZW50JzogXCJzZWxlY3RcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcIm5nLW9wdGlvbnNcIjogIFwidiBmb3IgdiBpbiBzZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlBbGdvcml0aG1zXCIgfSxcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlWYWxpZGl0eVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG51bWJlciBvZiBkYXlzIHRoZSBrZXkgd2lsbCBiZSB2YWxpZCBmb3JcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIkxvbmdcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlQYXNzd29yZFwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiUGFzc3dvcmQgdG8gdGhlIHByaXZhdGUga2V5XCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJwYXNzd29yZFwiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfVxuICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgICovXG4gICAge1xuICAgICAgbGFiZWw6IFwiTWFya2Rvd24gRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBiYXNpYyBtYXJrdXAgZG9jdW1lbnQgdXNpbmcgdGhlIE1hcmtkb3duIHdpa2kgbWFya3VwLCBwYXJ0aWN1bGFybHkgdXNlZnVsIGZvciBSZWFkTWUgZmlsZXMgaW4gZGlyZWN0b3JpZXNcIixcbiAgICAgIGV4ZW1wbGFyOiBcIlJlYWRNZS5tZFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIubWRcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiVGV4dCBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJBIHBsYWluIHRleHQgZmlsZVwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG9jdW1lbnQudGV4dFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIudHh0XCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkhUTUwgRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBIVE1MIGRvY3VtZW50IHlvdSBjYW4gZWRpdCBkaXJlY3RseSB1c2luZyB0aGUgSFRNTCBtYXJrdXBcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50Lmh0bWxcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLmh0bWxcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiWE1MIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkFuIGVtcHR5IFhNTCBkb2N1bWVudFwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG9jdW1lbnQueG1sXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiSW50ZWdyYXRpb24gRmxvd3NcIixcbiAgICAgIHRvb2x0aXA6IFwiQ2FtZWwgcm91dGVzIGZvciBkZWZpbmluZyB5b3VyIGludGVncmF0aW9uIGZsb3dzXCIsXG4gICAgICBjaGlsZHJlbjogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IFwiQ2FtZWwgWE1MIGRvY3VtZW50XCIsXG4gICAgICAgICAgdG9vbHRpcDogXCJBIHZhbmlsbGEgQ2FtZWwgWE1MIGRvY3VtZW50IGZvciBpbnRlZ3JhdGlvbiBmbG93c1wiLFxuICAgICAgICAgIGljb246IFwiL2ltZy9pY29ucy9jYW1lbC5zdmdcIixcbiAgICAgICAgICBleGVtcGxhcjogXCJjYW1lbC54bWxcIixcbiAgICAgICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogXCJDYW1lbCBPU0dpIEJsdWVwcmludCBYTUwgZG9jdW1lbnRcIixcbiAgICAgICAgICB0b29sdGlwOiBcIkEgdmFuaWxsYSBDYW1lbCBYTUwgZG9jdW1lbnQgZm9yIGludGVncmF0aW9uIGZsb3dzIHdoZW4gdXNpbmcgT1NHaSBCbHVlcHJpbnRcIixcbiAgICAgICAgICBpY29uOiBcIi9pbWcvaWNvbnMvY2FtZWwuc3ZnXCIsXG4gICAgICAgICAgZXhlbXBsYXI6IFwiY2FtZWwtYmx1ZXByaW50LnhtbFwiLFxuICAgICAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiBcIkNhbWVsIFNwcmluZyBYTUwgZG9jdW1lbnRcIixcbiAgICAgICAgICB0b29sdGlwOiBcIkEgdmFuaWxsYSBDYW1lbCBYTUwgZG9jdW1lbnQgZm9yIGludGVncmF0aW9uIGZsb3dzIHdoZW4gdXNpbmcgdGhlIFNwcmluZyBmcmFtZXdvcmtcIixcbiAgICAgICAgICBpY29uOiBcIi9pbWcvaWNvbnMvY2FtZWwuc3ZnXCIsXG4gICAgICAgICAgZXhlbXBsYXI6IFwiY2FtZWwtc3ByaW5nLnhtbFwiLFxuICAgICAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiRGF0YSBNYXBwaW5nIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkRvemVyIGJhc2VkIGNvbmZpZ3VyYXRpb24gb2YgbWFwcGluZyBkb2N1bWVudHNcIixcbiAgICAgIGljb246IFwiL2ltZy9pY29ucy9kb3plci9kb3plci5naWZcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvemVyLW1hcHBpbmcueG1sXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgIH1cbiAgXTtcblxuICAvLyBUT0RPIFJFTU9WRVxuICBleHBvcnQgZnVuY3Rpb24gaXNGTUNDb250YWluZXIod29ya3NwYWNlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gVE9ETyBSRU1PVkVcbiAgZXhwb3J0IGZ1bmN0aW9uIGlzV2lraUVuYWJsZWQod29ya3NwYWNlLCBqb2xva2lhLCBsb2NhbFN0b3JhZ2UpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbi8qXG4gICAgcmV0dXJuIEdpdC5jcmVhdGVHaXRSZXBvc2l0b3J5KHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKSAhPT0gbnVsbDtcbiovXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbikge1xuICAgIHZhciBocmVmID0gQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIiNcIik7XG4gICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gbmF2aWdhdGUgdG86IFwiICsgaHJlZik7XG4gICAgICAkbG9jYXRpb24udXJsKGhyZWYpO1xuICAgIH0sIDEwMCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbGwgdGhlIGxpbmtzIGZvciB0aGUgZ2l2ZW4gYnJhbmNoIGZvciB0aGUgY3VzdG9tIHZpZXdzLCBzdGFydGluZyB3aXRoIFwiL1wiXG4gICAqIEBwYXJhbSAkc2NvcGVcbiAgICogQHJldHVybnMge3N0cmluZ1tdfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGN1c3RvbVZpZXdMaW5rcygkc2NvcGUpIHtcbiAgICB2YXIgcHJlZml4ID0gQ29yZS50cmltTGVhZGluZyhXaWtpLnN0YXJ0TGluaygkc2NvcGUpLCBcIiNcIik7XG4gICAgcmV0dXJuIGN1c3RvbVdpa2lWaWV3UGFnZXMubWFwKHBhdGggPT4gcHJlZml4ICsgcGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIG5ldyBjcmVhdGUgZG9jdW1lbnQgd2l6YXJkIHRyZWVcbiAgICogQG1ldGhvZCBjcmVhdGVXaXphcmRUcmVlXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlV2l6YXJkVHJlZSh3b3Jrc3BhY2UsICRzY29wZSkge1xuICAgIHZhciByb290ID0gY3JlYXRlRm9sZGVyKFwiTmV3IERvY3VtZW50c1wiKTtcbiAgICBhZGRDcmVhdGVXaXphcmRGb2xkZXJzKHdvcmtzcGFjZSwgJHNjb3BlLCByb290LCBkb2N1bWVudFRlbXBsYXRlcyk7XG4gICAgcmV0dXJuIHJvb3Q7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVGb2xkZXIobmFtZSk6IGFueSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICBjaGlsZHJlbjogW11cbiAgICB9O1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGFkZENyZWF0ZVdpemFyZEZvbGRlcnMod29ya3NwYWNlLCAkc2NvcGUsIHBhcmVudCwgdGVtcGxhdGVzOiBhbnlbXSkge1xuICAgIGFuZ3VsYXIuZm9yRWFjaCh0ZW1wbGF0ZXMsICh0ZW1wbGF0ZSkgPT4ge1xuXG4gICAgICBpZiAoIHRlbXBsYXRlLmdlbmVyYXRlZCApIHtcbiAgICAgICAgaWYgKCB0ZW1wbGF0ZS5nZW5lcmF0ZWQuaW5pdCApIHtcbiAgICAgICAgICB0ZW1wbGF0ZS5nZW5lcmF0ZWQuaW5pdCh3b3Jrc3BhY2UsICRzY29wZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIHRpdGxlID0gdGVtcGxhdGUubGFiZWwgfHwga2V5O1xuICAgICAgdmFyIG5vZGUgPSBjcmVhdGVGb2xkZXIodGl0bGUpO1xuICAgICAgbm9kZS5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICBub2RlLmVudGl0eSA9IHRlbXBsYXRlO1xuXG4gICAgICB2YXIgYWRkQ2xhc3MgPSB0ZW1wbGF0ZS5hZGRDbGFzcztcbiAgICAgIGlmIChhZGRDbGFzcykge1xuICAgICAgICBub2RlLmFkZENsYXNzID0gYWRkQ2xhc3M7XG4gICAgICB9XG5cbiAgICAgIHZhciBrZXkgPSB0ZW1wbGF0ZS5leGVtcGxhcjtcbiAgICAgIHZhciBwYXJlbnRLZXkgPSBwYXJlbnQua2V5IHx8IFwiXCI7XG4gICAgICBub2RlLmtleSA9IHBhcmVudEtleSA/IHBhcmVudEtleSArIFwiX1wiICsga2V5IDoga2V5O1xuICAgICAgdmFyIGljb24gPSB0ZW1wbGF0ZS5pY29uO1xuICAgICAgaWYgKGljb24pIHtcbiAgICAgICAgbm9kZS5pY29uID0gQ29yZS51cmwoaWNvbik7XG4gICAgICB9XG4gICAgICAvLyBjb21waWxlciB3YXMgY29tcGxhaW5pbmcgYWJvdXQgJ2xhYmVsJyBoYWQgbm8gaWRlYSB3aGVyZSBpdCdzIGNvbWluZyBmcm9tXG4gICAgICAvLyB2YXIgdG9vbHRpcCA9IHZhbHVlW1widG9vbHRpcFwiXSB8fCB2YWx1ZVtcImRlc2NyaXB0aW9uXCJdIHx8IGxhYmVsO1xuICAgICAgdmFyIHRvb2x0aXAgPSB0ZW1wbGF0ZVtcInRvb2x0aXBcIl0gfHwgdGVtcGxhdGVbXCJkZXNjcmlwdGlvblwiXSB8fCAnJztcbiAgICAgIG5vZGUudG9vbHRpcCA9IHRvb2x0aXA7XG4gICAgICBpZiAodGVtcGxhdGVbXCJmb2xkZXJcIl0pIHtcbiAgICAgICAgbm9kZS5pc0ZvbGRlciA9ICgpID0+IHsgcmV0dXJuIHRydWU7IH07XG4gICAgICB9XG4gICAgICBwYXJlbnQuY2hpbGRyZW4ucHVzaChub2RlKTtcblxuICAgICAgdmFyIGNoaWxkcmVuID0gdGVtcGxhdGUuY2hpbGRyZW47XG4gICAgICBpZiAoY2hpbGRyZW4pIHtcbiAgICAgICAgYWRkQ3JlYXRlV2l6YXJkRm9sZGVycyh3b3Jrc3BhY2UsICRzY29wZSwgbm9kZSwgY2hpbGRyZW4pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0V2lraUxpbmsocHJvamVjdElkLCBicmFuY2gpIHtcbiAgICB2YXIgc3RhcnQgPSBVcmxIZWxwZXJzLmpvaW4oRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCksIFwiL3dpa2lcIik7XG4gICAgaWYgKGJyYW5jaCkge1xuICAgICAgc3RhcnQgPSBVcmxIZWxwZXJzLmpvaW4oc3RhcnQsICdicmFuY2gnLCBicmFuY2gpO1xuICAgIH1cbiAgICByZXR1cm4gc3RhcnQ7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gc3RhcnRMaW5rKCRzY29wZSkge1xuICAgIHZhciBwcm9qZWN0SWQgPSAkc2NvcGUucHJvamVjdElkO1xuICAgIHZhciBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgIHJldHVybiBzdGFydFdpa2lMaW5rKHByb2plY3RJZCwgYnJhbmNoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIGZpbGVuYW1lL3BhdGggaXMgYW4gaW5kZXggcGFnZSAobmFtZWQgaW5kZXguKiBhbmQgaXMgYSBtYXJrZG93bi9odG1sIHBhZ2UpLlxuICAgKlxuICAgKiBAcGFyYW0gcGF0aFxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBpc0luZGV4UGFnZShwYXRoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gcGF0aCAmJiAocGF0aC5lbmRzV2l0aChcImluZGV4Lm1kXCIpIHx8IHBhdGguZW5kc1dpdGgoXCJpbmRleC5odG1sXCIpIHx8IHBhdGguZW5kc1dpdGgoXCJpbmRleFwiKSkgPyB0cnVlIDogZmFsc2U7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gdmlld0xpbmsoJHNjb3BlLCBwYWdlSWQ6c3RyaW5nLCAkbG9jYXRpb24sIGZpbGVOYW1lOnN0cmluZyA9IG51bGwpIHtcbiAgICB2YXIgbGluazpzdHJpbmcgPSBudWxsO1xuICAgIHZhciBzdGFydCA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgIGlmIChwYWdlSWQpIHtcbiAgICAgIC8vIGZpZ3VyZSBvdXQgd2hpY2ggdmlldyB0byB1c2UgZm9yIHRoaXMgcGFnZVxuICAgICAgdmFyIHZpZXcgPSBpc0luZGV4UGFnZShwYWdlSWQpID8gXCIvYm9vay9cIiA6IFwiL3ZpZXcvXCI7XG4gICAgICBsaW5rID0gc3RhcnQgKyB2aWV3ICsgZW5jb2RlUGF0aChDb3JlLnRyaW1MZWFkaW5nKHBhZ2VJZCwgXCIvXCIpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbGV0cyB1c2UgdGhlIGN1cnJlbnQgcGF0aFxuICAgICAgdmFyIHBhdGg6c3RyaW5nID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICAgIGxpbmsgPSBcIiNcIiArIHBhdGgucmVwbGFjZSgvKGVkaXR8Y3JlYXRlKS8sIFwidmlld1wiKTtcbiAgICB9XG4gICAgaWYgKGZpbGVOYW1lICYmIHBhZ2VJZCAmJiBwYWdlSWQuZW5kc1dpdGgoZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gbGluaztcbiAgICB9XG4gICAgaWYgKGZpbGVOYW1lKSB7XG4gICAgICBpZiAoIWxpbmsuZW5kc1dpdGgoXCIvXCIpKSB7XG4gICAgICAgIGxpbmsgKz0gXCIvXCI7XG4gICAgICB9XG4gICAgICBsaW5rICs9IGZpbGVOYW1lO1xuICAgIH1cbiAgICByZXR1cm4gbGluaztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBicmFuY2hMaW5rKCRzY29wZSwgcGFnZUlkOiBzdHJpbmcsICRsb2NhdGlvbiwgZmlsZU5hbWU6c3RyaW5nID0gbnVsbCkge1xuICAgIHJldHVybiB2aWV3TGluaygkc2NvcGUsIHBhZ2VJZCwgJGxvY2F0aW9uLCBmaWxlTmFtZSk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZWRpdExpbmsoJHNjb3BlLCBwYWdlSWQ6c3RyaW5nLCAkbG9jYXRpb24pIHtcbiAgICB2YXIgbGluazpzdHJpbmcgPSBudWxsO1xuICAgIHZhciBmb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQocGFnZUlkKTtcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgY2FzZSBcImltYWdlXCI6XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgIHZhciBzdGFydCA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgaWYgKHBhZ2VJZCkge1xuICAgICAgICBsaW5rID0gc3RhcnQgKyBcIi9lZGl0L1wiICsgZW5jb2RlUGF0aChwYWdlSWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbGV0cyB1c2UgdGhlIGN1cnJlbnQgcGF0aFxuICAgICAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICAgIGxpbmsgPSBcIiNcIiArIHBhdGgucmVwbGFjZSgvKHZpZXd8Y3JlYXRlKS8sIFwiZWRpdFwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpbms7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlTGluaygkc2NvcGUsIHBhZ2VJZDpzdHJpbmcsICRsb2NhdGlvbikge1xuICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICB2YXIgbGluayA9ICcnO1xuICAgIGlmIChwYWdlSWQpIHtcbiAgICAgIGxpbmsgPSBzdGFydCArIFwiL2NyZWF0ZS9cIiArIGVuY29kZVBhdGgocGFnZUlkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbGV0cyB1c2UgdGhlIGN1cnJlbnQgcGF0aFxuICAgICAgbGluayA9IFwiI1wiICsgcGF0aC5yZXBsYWNlKC8odmlld3xlZGl0fGZvcm1UYWJsZSkvLCBcImNyZWF0ZVwiKTtcbiAgICB9XG4gICAgLy8gd2UgaGF2ZSB0aGUgbGluayBzbyBsZXRzIG5vdyByZW1vdmUgdGhlIGxhc3QgcGF0aFxuICAgIC8vIG9yIGlmIHRoZXJlIGlzIG5vIC8gaW4gdGhlIHBhdGggdGhlbiByZW1vdmUgdGhlIGxhc3Qgc2VjdGlvblxuICAgIHZhciBpZHggPSBsaW5rLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICBpZiAoaWR4ID4gMCAmJiAhJHNjb3BlLmNoaWxkcmVuICYmICFwYXRoLnN0YXJ0c1dpdGgoXCIvd2lraS9mb3JtVGFibGVcIikpIHtcbiAgICAgIGxpbmsgPSBsaW5rLnN1YnN0cmluZygwLCBpZHggKyAxKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbms7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZW5jb2RlUGF0aChwYWdlSWQ6c3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhZ2VJZC5zcGxpdChcIi9cIikubWFwKGVuY29kZVVSSUNvbXBvbmVudCkuam9pbihcIi9cIik7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZGVjb2RlUGF0aChwYWdlSWQ6c3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhZ2VJZC5zcGxpdChcIi9cIikubWFwKGRlY29kZVVSSUNvbXBvbmVudCkuam9pbihcIi9cIik7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZmlsZUZvcm1hdChuYW1lOnN0cmluZywgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeT8pIHtcbiAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICBpZiAobmFtZSkge1xuICAgICAgaWYgKG5hbWUgPT09IFwiSmVua2luc2ZpbGVcIikge1xuICAgICAgICBleHRlbnNpb24gPSBcImdyb292eVwiO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgYW5zd2VyID0gbnVsbDtcbiAgICBpZiAoIWZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpIHtcbiAgICAgIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkgPSBIYXd0aW9Db3JlLmluamVjdG9yLmdldChcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIik7XG4gICAgfVxuICAgIGFuZ3VsYXIuZm9yRWFjaChmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5LCAoYXJyYXksIGtleSkgPT4ge1xuICAgICAgaWYgKGFycmF5LmluZGV4T2YoZXh0ZW5zaW9uKSA+PSAwKSB7XG4gICAgICAgIGFuc3dlciA9IGtleTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYW5zd2VyO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGZpbGUgbmFtZSBvZiB0aGUgZ2l2ZW4gcGF0aDsgc3RyaXBwaW5nIG9mZiBhbnkgZGlyZWN0b3JpZXNcbiAgICogQG1ldGhvZCBmaWxlTmFtZVxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZmlsZU5hbWUocGF0aDogc3RyaW5nKSB7XG4gICAgaWYgKHBhdGgpIHtcbiAgICAgICB2YXIgaWR4ID0gcGF0aC5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICByZXR1cm4gcGF0aC5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXRoO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGZvbGRlciBvZiB0aGUgZ2l2ZW4gcGF0aCAoZXZlcnl0aGluZyBidXQgdGhlIGxhc3QgcGF0aCBuYW1lKVxuICAgKiBAbWV0aG9kIGZpbGVQYXJlbnRcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVQYXJlbnQocGF0aDogc3RyaW5nKSB7XG4gICAgaWYgKHBhdGgpIHtcbiAgICAgICB2YXIgaWR4ID0gcGF0aC5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICByZXR1cm4gcGF0aC5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gbGV0cyByZXR1cm4gdGhlIHJvb3QgZGlyZWN0b3J5XG4gICAgcmV0dXJuIFwiXCI7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZmlsZSBuYW1lIGZvciB0aGUgZ2l2ZW4gbmFtZTsgd2UgaGlkZSBzb21lIGV4dGVuc2lvbnNcbiAgICogQG1ldGhvZCBoaWRlRmluZU5hbWVFeHRlbnNpb25zXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBoaWRlRmlsZU5hbWVFeHRlbnNpb25zKG5hbWUpIHtcbiAgICBpZiAobmFtZSkge1xuICAgICAgYW5ndWxhci5mb3JFYWNoKFdpa2kuaGlkZUV4dGVuc2lvbnMsIChleHRlbnNpb24pID0+IHtcbiAgICAgICAgaWYgKG5hbWUuZW5kc1dpdGgoZXh0ZW5zaW9uKSkge1xuICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZygwLCBuYW1lLmxlbmd0aCAtIGV4dGVuc2lvbi5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWU7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgVVJMIHRvIHBlcmZvcm0gYSBHRVQgb3IgUE9TVCBmb3IgdGhlIGdpdmVuIGJyYW5jaCBuYW1lIGFuZCBwYXRoXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZ2l0UmVzdFVSTCgkc2NvcGUsIHBhdGg6IHN0cmluZykge1xuICAgIHZhciB1cmwgPSBnaXRSZWxhdGl2ZVVSTCgkc2NvcGUsIHBhdGgpO1xuICAgIHVybCA9IENvcmUudXJsKCcvJyArIHVybCk7XG5cbi8qXG4gICAgdmFyIGNvbm5lY3Rpb25OYW1lID0gQ29yZS5nZXRDb25uZWN0aW9uTmFtZVBhcmFtZXRlcigpO1xuICAgIGlmIChjb25uZWN0aW9uTmFtZSkge1xuICAgICAgdmFyIGNvbm5lY3Rpb25PcHRpb25zID0gQ29yZS5nZXRDb25uZWN0T3B0aW9ucyhjb25uZWN0aW9uTmFtZSk7XG4gICAgICBpZiAoY29ubmVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgY29ubmVjdGlvbk9wdGlvbnMucGF0aCA9IHVybDtcbiAgICAgICAgdXJsID0gPHN0cmluZz5Db3JlLmNyZWF0ZVNlcnZlckNvbm5lY3Rpb25VcmwoY29ubmVjdGlvbk9wdGlvbnMpO1xuICAgICAgfVxuICAgIH1cblxuKi9cbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgICBmdW5jdGlvbiBnaXRVcmxQcmVmaXgoKSB7XG4gICAgICAgIHZhciBwcmVmaXggPSBcIlwiO1xuICAgICAgICB2YXIgaW5qZWN0b3IgPSBIYXd0aW9Db3JlLmluamVjdG9yO1xuICAgICAgICBpZiAoaW5qZWN0b3IpIHtcbiAgICAgICAgICAgIHByZWZpeCA9IGluamVjdG9yLmdldChcIldpa2lHaXRVcmxQcmVmaXhcIikgfHwgXCJcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJlZml4O1xuICAgIH1cblxuICAgIC8qKlxuICAgKiBSZXR1cm5zIGEgcmVsYXRpdmUgVVJMIHRvIHBlcmZvcm0gYSBHRVQgb3IgUE9TVCBmb3IgdGhlIGdpdmVuIGJyYW5jaC9wYXRoXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZ2l0UmVsYXRpdmVVUkwoJHNjb3BlLCBwYXRoOiBzdHJpbmcpIHtcbiAgICAgIHZhciBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgIHZhciBwcmVmaXggPSBnaXRVcmxQcmVmaXgoKTtcbiAgICBicmFuY2ggPSBicmFuY2ggfHwgXCJtYXN0ZXJcIjtcbiAgICBwYXRoID0gcGF0aCB8fCBcIi9cIjtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKHByZWZpeCwgXCJnaXQvXCIgKyBicmFuY2gsIHBhdGgpO1xuICB9XG5cblxuICAvKipcbiAgICogVGFrZXMgYSByb3cgY29udGFpbmluZyB0aGUgZW50aXR5IG9iamVjdDsgb3IgY2FuIHRha2UgdGhlIGVudGl0eSBkaXJlY3RseS5cbiAgICpcbiAgICogSXQgdGhlbiB1c2VzIHRoZSBuYW1lLCBkaXJlY3RvcnkgYW5kIHhtbE5hbWVzcGFjZXMgcHJvcGVydGllc1xuICAgKlxuICAgKiBAbWV0aG9kIGZpbGVJY29uSHRtbFxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge2FueX0gcm93XG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICpcbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlSWNvbkh0bWwocm93KSB7XG4gICAgdmFyIG5hbWUgPSByb3cubmFtZTtcbiAgICB2YXIgcGF0aCA9IHJvdy5wYXRoO1xuICAgIHZhciBicmFuY2ggPSByb3cuYnJhbmNoIDtcbiAgICB2YXIgZGlyZWN0b3J5ID0gcm93LmRpcmVjdG9yeTtcbiAgICB2YXIgeG1sTmFtZXNwYWNlcyA9IHJvdy54bWxfbmFtZXNwYWNlcyB8fCByb3cueG1sTmFtZXNwYWNlcztcbiAgICB2YXIgaWNvblVybCA9IHJvdy5pY29uVXJsO1xuICAgIHZhciBlbnRpdHkgPSByb3cuZW50aXR5O1xuICAgIGlmIChlbnRpdHkpIHtcbiAgICAgIG5hbWUgPSBuYW1lIHx8IGVudGl0eS5uYW1lO1xuICAgICAgcGF0aCA9IHBhdGggfHwgZW50aXR5LnBhdGg7XG4gICAgICBicmFuY2ggPSBicmFuY2ggfHwgZW50aXR5LmJyYW5jaDtcbiAgICAgIGRpcmVjdG9yeSA9IGRpcmVjdG9yeSB8fCBlbnRpdHkuZGlyZWN0b3J5O1xuICAgICAgeG1sTmFtZXNwYWNlcyA9IHhtbE5hbWVzcGFjZXMgfHwgZW50aXR5LnhtbF9uYW1lc3BhY2VzIHx8IGVudGl0eS54bWxOYW1lc3BhY2VzO1xuICAgICAgaWNvblVybCA9IGljb25VcmwgfHwgZW50aXR5Lmljb25Vcmw7XG4gICAgfVxuICAgIGJyYW5jaCA9IGJyYW5jaCB8fCBcIm1hc3RlclwiO1xuICAgIHZhciBjc3MgPSBudWxsO1xuICAgIHZhciBpY29uOnN0cmluZyA9IG51bGw7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgLy8gVE9ETyBjb3VsZCB3ZSB1c2UgZGlmZmVyZW50IGljb25zIGZvciBtYXJrZG93biB2IHhtbCB2IGh0bWxcbiAgICBpZiAoeG1sTmFtZXNwYWNlcyAmJiB4bWxOYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5jYW1lbE5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgaWNvbiA9IFwiaW1nL2ljb25zL2NhbWVsLnN2Z1wiO1xuICAgICAgfSBlbHNlIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuZG96ZXJOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgIGljb24gPSBcImltZy9pY29ucy9kb3plci9kb3plci5naWZcIjtcbiAgICAgIH0gZWxzZSBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmFjdGl2ZW1xTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICBpY29uID0gXCJpbWcvaWNvbnMvbWVzc2FnZWJyb2tlci5zdmdcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcImZpbGUgXCIgKyBuYW1lICsgXCIgaGFzIG5hbWVzcGFjZXMgXCIgKyB4bWxOYW1lc3BhY2VzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFpY29uVXJsICYmIG5hbWUpIHtcbiAgICAgIHZhciBsb3dlck5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICBpZiAobG93ZXJOYW1lID09IFwicG9tLnhtbFwiKSB7XG4gICAgICAgIGljb25VcmwgPSBcImltZy9tYXZlbi1pY29uLnBuZ1wiO1xuICAgICAgfSBlbHNlIGlmIChsb3dlck5hbWUgPT0gXCJqZW5raW5zZmlsZVwiKSB7XG4gICAgICAgIGljb25VcmwgPSBcImltZy9qZW5raW5zLWljb24uc3ZnXCI7XG4gICAgICB9IGVsc2UgaWYgKGxvd2VyTmFtZSA9PSBcImZhYnJpYzgueW1sXCIpIHtcbiAgICAgICAgaWNvblVybCA9IFwiaW1nL2ZhYnJpYzhfaWNvbi5zdmdcIjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaWNvblVybCkge1xuICAgICAgY3NzID0gbnVsbDtcbiAgICAgIGljb24gPSBpY29uVXJsO1xuLypcbiAgICAgIHZhciBwcmVmaXggPSBnaXRVcmxQcmVmaXgoKTtcbiAgICAgIGljb24gPSBVcmxIZWxwZXJzLmpvaW4ocHJlZml4LCBcImdpdFwiLCBpY29uVXJsKTtcbiovXG4vKlxuICAgICAgdmFyIGNvbm5lY3Rpb25OYW1lID0gQ29yZS5nZXRDb25uZWN0aW9uTmFtZVBhcmFtZXRlcigpO1xuICAgICAgaWYgKGNvbm5lY3Rpb25OYW1lKSB7XG4gICAgICAgIHZhciBjb25uZWN0aW9uT3B0aW9ucyA9IENvcmUuZ2V0Q29ubmVjdE9wdGlvbnMoY29ubmVjdGlvbk5hbWUpO1xuICAgICAgICBpZiAoY29ubmVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgICBjb25uZWN0aW9uT3B0aW9ucy5wYXRoID0gQ29yZS51cmwoJy8nICsgaWNvbik7XG4gICAgICAgICAgaWNvbiA9IDxzdHJpbmc+Q29yZS5jcmVhdGVTZXJ2ZXJDb25uZWN0aW9uVXJsKGNvbm5lY3Rpb25PcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfVxuKi9cbiAgICB9XG4gICAgaWYgKCFpY29uKSB7XG4gICAgICBpZiAoZGlyZWN0b3J5KSB7XG4gICAgICAgIHN3aXRjaCAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgY2FzZSAncHJvZmlsZSc6XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWJvb2tcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBsb2cuZGVidWcoXCJObyBtYXRjaCBmb3IgZXh0ZW5zaW9uOiBcIiwgZXh0ZW5zaW9uLCBcIiB1c2luZyBhIGdlbmVyaWMgZm9sZGVyIGljb25cIik7XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZvbGRlciBmb2xkZXItaWNvblwiO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzd2l0Y2ggKGV4dGVuc2lvbikge1xuICAgICAgICAgIGNhc2UgJ2phdmEnOlxuICAgICAgICAgICAgaWNvbiA9IFwiaW1nL2phdmEuc3ZnXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdwbmcnOlxuICAgICAgICAgIGNhc2UgJ3N2Zyc6XG4gICAgICAgICAgY2FzZSAnanBnJzpcbiAgICAgICAgICBjYXNlICdnaWYnOlxuICAgICAgICAgICAgY3NzID0gbnVsbDtcbiAgICAgICAgICAgIGljb24gPSBXaWtpLmdpdFJlbGF0aXZlVVJMKGJyYW5jaCwgcGF0aCk7XG4vKlxuICAgICAgICAgICAgdmFyIGNvbm5lY3Rpb25OYW1lID0gQ29yZS5nZXRDb25uZWN0aW9uTmFtZVBhcmFtZXRlcigpO1xuICAgICAgICAgICAgaWYgKGNvbm5lY3Rpb25OYW1lKSB7XG4gICAgICAgICAgICAgIHZhciBjb25uZWN0aW9uT3B0aW9ucyA9IENvcmUuZ2V0Q29ubmVjdE9wdGlvbnMoY29ubmVjdGlvbk5hbWUpO1xuICAgICAgICAgICAgICBpZiAoY29ubmVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uT3B0aW9ucy5wYXRoID0gQ29yZS51cmwoJy8nICsgaWNvbik7XG4gICAgICAgICAgICAgICAgaWNvbiA9IDxzdHJpbmc+Q29yZS5jcmVhdGVTZXJ2ZXJDb25uZWN0aW9uVXJsKGNvbm5lY3Rpb25PcHRpb25zKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuKi9cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2pzb24nOlxuICAgICAgICAgIGNhc2UgJ3htbCc6XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZpbGUtdGV4dFwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnbWQnOlxuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1maWxlLXRleHQtb1wiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIGxvZy5kZWJ1ZyhcIk5vIG1hdGNoIGZvciBleHRlbnNpb246IFwiLCBleHRlbnNpb24sIFwiIHVzaW5nIGEgZ2VuZXJpYyBmaWxlIGljb25cIik7XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZpbGUtb1wiO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpY29uKSB7XG4gICAgICByZXR1cm4gXCI8aW1nIHNyYz0nXCIgKyBDb3JlLnVybChpY29uKSArIFwiJz5cIjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFwiPGkgY2xhc3M9J1wiICsgY3NzICsgXCInPjwvaT5cIjtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaWNvbkNsYXNzKHJvdykge1xuICAgIHZhciBuYW1lID0gcm93LmdldFByb3BlcnR5KFwibmFtZVwiKTtcbiAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICB2YXIgZGlyZWN0b3J5ID0gcm93LmdldFByb3BlcnR5KFwiZGlyZWN0b3J5XCIpO1xuICAgIGlmIChkaXJlY3RvcnkpIHtcbiAgICAgIHJldHVybiBcImZhIGZhLWZvbGRlclwiO1xuICAgIH1cbiAgICBpZiAoXCJ4bWxcIiA9PT0gZXh0ZW5zaW9uKSB7XG4gICAgICAgIHJldHVybiBcImZhIGZhLWNvZ1wiO1xuICAgIH0gZWxzZSBpZiAoXCJtZFwiID09PSBleHRlbnNpb24pIHtcbiAgICAgICAgcmV0dXJuIFwiZmEgZmEtZmlsZS10ZXh0LW9cIjtcbiAgICB9XG4gICAgLy8gVE9ETyBjb3VsZCB3ZSB1c2UgZGlmZmVyZW50IGljb25zIGZvciBtYXJrZG93biB2IHhtbCB2IGh0bWxcbiAgICByZXR1cm4gXCJmYSBmYS1maWxlLW9cIjtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIHRoZSBwYWdlSWQsIGJyYW5jaCwgb2JqZWN0SWQgZnJvbSB0aGUgcm91dGUgcGFyYW1ldGVyc1xuICAgKiBAbWV0aG9kIGluaXRTY29wZVxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0geyp9ICRzY29wZVxuICAgKiBAcGFyYW0ge2FueX0gJHJvdXRlUGFyYW1zXG4gICAqIEBwYXJhbSB7bmcuSUxvY2F0aW9uU2VydmljZX0gJGxvY2F0aW9uXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pIHtcbiAgICAkc2NvcGUucGFnZUlkID0gV2lraS5wYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuXG4gICAgLy8gbGV0cyBsZXQgdGhlc2UgdG8gYmUgaW5oZXJpdGVkIGlmIHdlIGluY2x1ZGUgYSB0ZW1wbGF0ZSBvbiBhbm90aGVyIHBhZ2VcbiAgICAkc2NvcGUucHJvamVjdElkID0gJHJvdXRlUGFyYW1zW1wicHJvamVjdElkXCJdIHx8ICRzY29wZS5pZDtcbiAgICAkc2NvcGUubmFtZXNwYWNlID0gJHJvdXRlUGFyYW1zW1wibmFtZXNwYWNlXCJdIHx8ICRzY29wZS5uYW1lc3BhY2U7XG5cbiAgICAkc2NvcGUub3duZXIgPSAkcm91dGVQYXJhbXNbXCJvd25lclwiXTtcbiAgICAkc2NvcGUucmVwb0lkID0gJHJvdXRlUGFyYW1zW1wicmVwb0lkXCJdO1xuICAgICRzY29wZS5icmFuY2ggPSAkcm91dGVQYXJhbXNbXCJicmFuY2hcIl0gfHwgJGxvY2F0aW9uLnNlYXJjaCgpW1wiYnJhbmNoXCJdO1xuICAgICRzY29wZS5vYmplY3RJZCA9ICRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8ICRyb3V0ZVBhcmFtc1tcImRpZmZPYmplY3RJZDFcIl07XG4gICAgJHNjb3BlLnN0YXJ0TGluayA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgICRzY29wZS4kdmlld0xpbmsgPSB2aWV3TGluaygkc2NvcGUsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgJHNjb3BlLmhpc3RvcnlMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9oaXN0b3J5L1wiICsgKCRzY29wZS5wYWdlSWQgfHwgXCJcIik7XG4gICAgJHNjb3BlLndpa2lSZXBvc2l0b3J5ID0gbmV3IEdpdFdpa2lSZXBvc2l0b3J5KCRzY29wZSk7XG4gICAgJHNjb3BlLiR3b3Jrc3BhY2VMaW5rID0gRGV2ZWxvcGVyLndvcmtzcGFjZUxpbmsoKTtcbiAgICAkc2NvcGUuJHByb2plY3RMaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RCcmVhZGNydW1icygkc2NvcGUucHJvamVjdElkLCBjcmVhdGVTb3VyY2VCcmVhZGNydW1icygkc2NvcGUpKTtcbiAgICAkc2NvcGUuc3ViVGFiQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTdWJOYXZCYXJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvYWRzIHRoZSBicmFuY2hlcyBmb3IgdGhpcyB3aWtpIHJlcG9zaXRvcnkgYW5kIHN0b3JlcyB0aGVtIGluIHRoZSBicmFuY2hlcyBwcm9wZXJ0eSBpblxuICAgKiB0aGUgJHNjb3BlIGFuZCBlbnN1cmVzICRzY29wZS5icmFuY2ggaXMgc2V0IHRvIGEgdmFsaWQgdmFsdWVcbiAgICpcbiAgICogQHBhcmFtIHdpa2lSZXBvc2l0b3J5XG4gICAqIEBwYXJhbSAkc2NvcGVcbiAgICogQHBhcmFtIGlzRm1jIHdoZXRoZXIgd2UgcnVuIGFzIGZhYnJpYzggb3IgYXMgaGF3dGlvXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gbG9hZEJyYW5jaGVzKGpvbG9raWEsIHdpa2lSZXBvc2l0b3J5LCAkc2NvcGUsIGlzRm1jID0gZmFsc2UpIHtcbiAgICB3aWtpUmVwb3NpdG9yeS5icmFuY2hlcygocmVzcG9uc2UpID0+IHtcbiAgICAgIC8vIGxldHMgc29ydCBieSB2ZXJzaW9uIG51bWJlclxuICAgICAgJHNjb3BlLmJyYW5jaGVzID0gcmVzcG9uc2Uuc29ydEJ5KCh2KSA9PiBDb3JlLnZlcnNpb25Ub1NvcnRhYmxlU3RyaW5nKHYpLCB0cnVlKTtcblxuICAgICAgLy8gZGVmYXVsdCB0aGUgYnJhbmNoIG5hbWUgaWYgd2UgaGF2ZSAnbWFzdGVyJ1xuICAgICAgaWYgKCEkc2NvcGUuYnJhbmNoICYmICRzY29wZS5icmFuY2hlcy5maW5kKChicmFuY2gpID0+IHtcbiAgICAgICAgcmV0dXJuIGJyYW5jaCA9PT0gXCJtYXN0ZXJcIjtcbiAgICAgIH0pKSB7XG4gICAgICAgICRzY29wZS5icmFuY2ggPSBcIm1hc3RlclwiO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0cyB0aGUgcGFnZUlkIGZyb20gdGhlIHJvdXRlIHBhcmFtZXRlcnNcbiAgICogQG1ldGhvZCBwYWdlSWRcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHthbnl9ICRyb3V0ZVBhcmFtc1xuICAgKiBAcGFyYW0gQG5nLklMb2NhdGlvblNlcnZpY2UgQGxvY2F0aW9uXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBwYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pIHtcbiAgICB2YXIgcGFnZUlkID0gJHJvdXRlUGFyYW1zWydwYWdlJ107XG4gICAgaWYgKCFwYWdlSWQpIHtcbiAgICAgIC8vIExldHMgZGVhbCB3aXRoIHRoZSBoYWNrIG9mIEFuZ3VsYXJKUyBub3Qgc3VwcG9ydGluZyAvIGluIGEgcGF0aCB2YXJpYWJsZVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAxMDA7IGkrKykge1xuICAgICAgICB2YXIgdmFsdWUgPSAkcm91dGVQYXJhbXNbJ3BhdGgnICsgaV07XG4gICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgICAgICBpZiAoIXBhZ2VJZCkge1xuICAgICAgICAgICAgcGFnZUlkID0gdmFsdWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhZ2VJZCArPSBcIi9cIiArIHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBhZ2VJZCB8fCBcIi9cIjtcbiAgICB9XG5cbiAgICAvLyBpZiBubyAkcm91dGVQYXJhbXMgdmFyaWFibGVzIGxldHMgZmlndXJlIGl0IG91dCBmcm9tIHRoZSAkbG9jYXRpb25cbiAgICBpZiAoIXBhZ2VJZCkge1xuICAgICAgcGFnZUlkID0gcGFnZUlkRnJvbVVSSSgkbG9jYXRpb24ucGF0aCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhZ2VJZDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBwYWdlSWRGcm9tVVJJKHVybDpzdHJpbmcpIHtcbiAgICB2YXIgd2lraVByZWZpeCA9IFwiL3dpa2kvXCI7XG4gICAgaWYgKHVybCAmJiB1cmwuc3RhcnRzV2l0aCh3aWtpUHJlZml4KSkge1xuICAgICAgdmFyIGlkeCA9IHVybC5pbmRleE9mKFwiL1wiLCB3aWtpUHJlZml4Lmxlbmd0aCArIDEpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHVybC5zdWJzdHJpbmcoaWR4ICsgMSwgdXJsLmxlbmd0aClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGxcblxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVFeHRlbnNpb24obmFtZSkge1xuICAgIGlmIChuYW1lLmluZGV4T2YoJyMnKSA+IDApXG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcoMCwgbmFtZS5pbmRleE9mKCcjJykpO1xuICAgIHJldHVybiBDb3JlLmZpbGVFeHRlbnNpb24obmFtZSwgXCJtYXJrZG93blwiKTtcbiAgfVxuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIG9uQ29tcGxldGUoc3RhdHVzKSB7XG4gICAgY29uc29sZS5sb2coXCJDb21wbGV0ZWQgb3BlcmF0aW9uIHdpdGggc3RhdHVzOiBcIiArIEpTT04uc3RyaW5naWZ5KHN0YXR1cykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyB0aGUgZ2l2ZW4gSlNPTiB0ZXh0IHJlcG9ydGluZyB0byB0aGUgdXNlciBpZiB0aGVyZSBpcyBhIHBhcnNlIGVycm9yXG4gICAqIEBtZXRob2QgcGFyc2VKc29uXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0XG4gICAqIEByZXR1cm4ge2FueX1cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBwYXJzZUpzb24odGV4dDpzdHJpbmcpIHtcbiAgICBpZiAodGV4dCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UodGV4dCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwiZXJyb3JcIiwgXCJGYWlsZWQgdG8gcGFyc2UgSlNPTjogXCIgKyBlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQWRqdXN0cyBhIHJlbGF0aXZlIG9yIGFic29sdXRlIGxpbmsgZnJvbSBhIHdpa2kgb3IgZmlsZSBzeXN0ZW0gdG8gb25lIHVzaW5nIHRoZSBoYXNoIGJhbmcgc3ludGF4XG4gICAqIEBtZXRob2QgYWRqdXN0SHJlZlxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0geyp9ICRzY29wZVxuICAgKiBAcGFyYW0ge25nLklMb2NhdGlvblNlcnZpY2V9ICRsb2NhdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gaHJlZlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZmlsZUV4dGVuc2lvblxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gYWRqdXN0SHJlZigkc2NvcGUsICRsb2NhdGlvbiwgaHJlZiwgZmlsZUV4dGVuc2lvbikge1xuICAgIHZhciBleHRlbnNpb24gPSBmaWxlRXh0ZW5zaW9uID8gXCIuXCIgKyBmaWxlRXh0ZW5zaW9uIDogXCJcIjtcblxuICAgIC8vIGlmIHRoZSBsYXN0IHBhcnQgb2YgdGhlIHBhdGggaGFzIGEgZG90IGluIGl0IGxldHNcbiAgICAvLyBleGNsdWRlIGl0IGFzIHdlIGFyZSByZWxhdGl2ZSB0byBhIG1hcmtkb3duIG9yIGh0bWwgZmlsZSBpbiBhIGZvbGRlclxuICAgIC8vIHN1Y2ggYXMgd2hlbiB2aWV3aW5nIHJlYWRtZS5tZCBvciBpbmRleC5tZFxuICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICB2YXIgZm9sZGVyUGF0aCA9IHBhdGg7XG4gICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgIGlmIChpZHggPiAwKSB7XG4gICAgICB2YXIgbGFzdE5hbWUgPSBwYXRoLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgIGlmIChsYXN0TmFtZS5pbmRleE9mKFwiLlwiKSA+PSAwKSB7XG4gICAgICAgIGZvbGRlclBhdGggPSBwYXRoLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlYWwgd2l0aCByZWxhdGl2ZSBVUkxzIGZpcnN0Li4uXG4gICAgaWYgKGhyZWYuc3RhcnRzV2l0aCgnLi4vJykpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGhyZWYuc3BsaXQoJy8nKTtcbiAgICAgIHZhciBwYXRoUGFydHMgPSBmb2xkZXJQYXRoLnNwbGl0KCcvJyk7XG4gICAgICB2YXIgcGFyZW50cyA9IHBhcnRzLmZpbHRlcigocGFydCkgPT4ge1xuICAgICAgICByZXR1cm4gcGFydCA9PT0gXCIuLlwiO1xuICAgICAgfSk7XG4gICAgICBwYXJ0cyA9IHBhcnRzLmxhc3QocGFydHMubGVuZ3RoIC0gcGFyZW50cy5sZW5ndGgpO1xuICAgICAgcGF0aFBhcnRzID0gcGF0aFBhcnRzLmZpcnN0KHBhdGhQYXJ0cy5sZW5ndGggLSBwYXJlbnRzLmxlbmd0aCk7XG5cbiAgICAgIHJldHVybiAnIycgKyBwYXRoUGFydHMuam9pbignLycpICsgJy8nICsgcGFydHMuam9pbignLycpICsgZXh0ZW5zaW9uICsgJGxvY2F0aW9uLmhhc2goKTtcbiAgICB9XG5cbiAgICAvLyBUdXJuIGFuIGFic29sdXRlIGxpbmsgaW50byBhIHdpa2kgbGluay4uLlxuICAgIGlmIChocmVmLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgcmV0dXJuIFdpa2kuYnJhbmNoTGluaygkc2NvcGUsIGhyZWYgKyBleHRlbnNpb24sICRsb2NhdGlvbikgKyBleHRlbnNpb247XG4gICAgfVxuXG4gICAgaWYgKCFXaWtpLmV4Y2x1ZGVBZGp1c3RtZW50UHJlZml4ZXMuYW55KChleGNsdWRlKSA9PiB7XG4gICAgICByZXR1cm4gaHJlZi5zdGFydHNXaXRoKGV4Y2x1ZGUpO1xuICAgIH0pKSB7XG4gICAgICByZXR1cm4gJyMnICsgZm9sZGVyUGF0aCArIFwiL1wiICsgaHJlZiArIGV4dGVuc2lvbiArICRsb2NhdGlvbi5oYXNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICogQG1haW4gV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IHZhciBwbHVnaW5OYW1lID0gJ3dpa2knO1xuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9ICdwbHVnaW5zL3dpa2kvaHRtbC8nO1xuICBleHBvcnQgdmFyIHRhYjphbnkgPSBudWxsO1xuXG4gIGV4cG9ydCB2YXIgX21vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKHBsdWdpbk5hbWUsIFsnaGF3dGlvLWNvcmUnLCAnaGF3dGlvLXVpJywgJ3RyZWVDb250cm9sJywgJ3VpLmNvZGVtaXJyb3InXSk7XG4gIGV4cG9ydCB2YXIgY29udHJvbGxlciA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlQ29udHJvbGxlckZ1bmN0aW9uKF9tb2R1bGUsICdXaWtpJyk7XG4gIGV4cG9ydCB2YXIgcm91dGUgPSBQbHVnaW5IZWxwZXJzLmNyZWF0ZVJvdXRpbmdGdW5jdGlvbih0ZW1wbGF0ZVBhdGgpO1xuXG4gIF9tb2R1bGUuY29uZmlnKFtcIiRyb3V0ZVByb3ZpZGVyXCIsICgkcm91dGVQcm92aWRlcikgPT4ge1xuXG4gICAgLy8gYWxsb3cgb3B0aW9uYWwgYnJhbmNoIHBhdGhzLi4uXG4gICAgYW5ndWxhci5mb3JFYWNoKFtcIlwiLCBcIi9icmFuY2gvOmJyYW5jaFwiXSwgKHBhdGgpID0+IHtcbiAgICAgIC8vdmFyIHN0YXJ0Q29udGV4dCA9ICcvd2lraSc7XG4gICAgICB2YXIgc3RhcnRDb250ZXh0ID0gJy93b3Jrc3BhY2VzLzpuYW1lc3BhY2UvcHJvamVjdHMvOnByb2plY3RJZC93aWtpJztcbiAgICAgICRyb3V0ZVByb3ZpZGVyLlxuICAgICAgICAgICAgICB3aGVuKFVybEhlbHBlcnMuam9pbihzdGFydENvbnRleHQsIHBhdGgsICd2aWV3JyksIHJvdXRlKCd2aWV3UGFnZS5odG1sJywgZmFsc2UpKS5cbiAgICAgICAgICAgICAgd2hlbihVcmxIZWxwZXJzLmpvaW4oc3RhcnRDb250ZXh0LCBwYXRoLCAnY3JlYXRlLzpwYWdlKicpLCByb3V0ZSgnY3JlYXRlLmh0bWwnLCBmYWxzZSkpLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL3ZpZXcvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld1BhZ2UuaHRtbCcsIHJlbG9hZE9uU2VhcmNoOiBmYWxzZX0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2Jvb2svOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld0Jvb2suaHRtbCcsIHJlbG9hZE9uU2VhcmNoOiBmYWxzZX0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2VkaXQvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvZWRpdFBhZ2UuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy92ZXJzaW9uLzpwYWdlKlxcLzpvYmplY3RJZCcsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL3ZpZXdQYWdlLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvaGlzdG9yeS86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9oaXN0b3J5Lmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY29tbWl0LzpwYWdlKlxcLzpvYmplY3RJZCcsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbW1pdC5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NvbW1pdERldGFpbC86cGFnZSpcXC86b2JqZWN0SWQnLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb21taXREZXRhaWwuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9kaWZmLzpkaWZmT2JqZWN0SWQxLzpkaWZmT2JqZWN0SWQyLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL3ZpZXdQYWdlLmh0bWwnLCByZWxvYWRPblNlYXJjaDogZmFsc2V9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9mb3JtVGFibGUvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvZm9ybVRhYmxlLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvZG96ZXIvbWFwcGluZ3MvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvZG96ZXJNYXBwaW5ncy5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NvbmZpZ3VyYXRpb25zLzpwYWdlKicsIHsgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb25maWd1cmF0aW9ucy5odG1sJyB9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jb25maWd1cmF0aW9uLzpwaWQvOnBhZ2UqJywgeyB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbmZpZ3VyYXRpb24uaHRtbCcgfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvbmV3Q29uZmlndXJhdGlvbi86ZmFjdG9yeVBpZC86cGFnZSonLCB7IHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29uZmlndXJhdGlvbi5odG1sJyB9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jYW1lbC9kaWFncmFtLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NhbWVsRGlhZ3JhbS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NhbWVsL2NhbnZhcy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jYW1lbENhbnZhcy5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NhbWVsL3Byb3BlcnRpZXMvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY2FtZWxQcm9wZXJ0aWVzLmh0bWwnfSk7XG4gICAgfSk7XG59XSk7XG5cbiAgLyoqXG4gICAqIEJyYW5jaCBNZW51IHNlcnZpY2VcbiAgICovXG4gIGV4cG9ydCBpbnRlcmZhY2UgQnJhbmNoTWVudSB7XG4gICAgYWRkRXh0ZW5zaW9uOiAoaXRlbTpVSS5NZW51SXRlbSkgPT4gdm9pZDtcbiAgICBhcHBseU1lbnVFeHRlbnNpb25zOiAobWVudTpVSS5NZW51SXRlbVtdKSA9PiB2b2lkO1xuICB9XG5cbiAgX21vZHVsZS5mYWN0b3J5KCd3aWtpQnJhbmNoTWVudScsICgpID0+IHtcbiAgICB2YXIgc2VsZiA9IHtcbiAgICAgIGl0ZW1zOiBbXSxcbiAgICAgIGFkZEV4dGVuc2lvbjogKGl0ZW06VUkuTWVudUl0ZW0pID0+IHtcbiAgICAgICAgc2VsZi5pdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgfSxcbiAgICAgIGFwcGx5TWVudUV4dGVuc2lvbnM6IChtZW51OlVJLk1lbnVJdGVtW10pID0+IHtcbiAgICAgICAgaWYgKHNlbGYuaXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBleHRlbmRlZE1lbnU6VUkuTWVudUl0ZW1bXSA9IFt7XG4gICAgICAgICAgaGVhZGluZzogXCJBY3Rpb25zXCJcbiAgICAgICAgfV07XG4gICAgICAgIHNlbGYuaXRlbXMuZm9yRWFjaCgoaXRlbTpVSS5NZW51SXRlbSkgPT4ge1xuICAgICAgICAgIGlmIChpdGVtLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIGV4dGVuZGVkTWVudS5wdXNoKGl0ZW0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChleHRlbmRlZE1lbnUubGVuZ3RoID4gMSkge1xuICAgICAgICAgIG1lbnUuYWRkKGV4dGVuZGVkTWVudSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBzZWxmO1xuICB9KTtcblxuICBfbW9kdWxlLmZhY3RvcnkoJ1dpa2lHaXRVcmxQcmVmaXgnLCAoKSA9PiB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgfSk7XG5cbiAgX21vZHVsZS5mYWN0b3J5KCdmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5JywgKCkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBcImltYWdlXCI6IFtcInN2Z1wiLCBcInBuZ1wiLCBcImljb1wiLCBcImJtcFwiLCBcImpwZ1wiLCBcImdpZlwiXSxcbiAgICAgIFwibWFya2Rvd25cIjogW1wibWRcIiwgXCJtYXJrZG93blwiLCBcIm1kb3duXCIsIFwibWtkblwiLCBcIm1rZFwiXSxcbiAgICAgIFwiaHRtbG1peGVkXCI6IFtcImh0bWxcIiwgXCJ4aHRtbFwiLCBcImh0bVwiXSxcbiAgICAgIFwidGV4dC94LWphdmFcIjogW1wiamF2YVwiXSxcbiAgICAgIFwidGV4dC94LWdyb292eVwiOiBbXCJncm9vdnlcIl0sXG4gICAgICBcInRleHQveC1zY2FsYVwiOiBbXCJzY2FsYVwiXSxcbiAgICAgIFwiamF2YXNjcmlwdFwiOiBbXCJqc1wiLCBcImpzb25cIiwgXCJqYXZhc2NyaXB0XCIsIFwianNjcmlwdFwiLCBcImVjbWFzY3JpcHRcIiwgXCJmb3JtXCJdLFxuICAgICAgXCJ4bWxcIjogW1wieG1sXCIsIFwieHNkXCIsIFwid3NkbFwiLCBcImF0b21cIl0sXG4gICAgICBcInRleHQveC15YW1sXCI6IFtcInlhbWxcIiwgXCJ5bWxcIl0sXG4gICAgICBcInByb3BlcnRpZXNcIjogW1wicHJvcGVydGllc1wiXVxuICAgIH07XG4gIH0pO1xuXG4gIF9tb2R1bGUuZmlsdGVyKCdmaWxlSWNvbkNsYXNzJywgKCkgPT4gaWNvbkNsYXNzKTtcblxuICBfbW9kdWxlLnJ1bihbXCIkbG9jYXRpb25cIixcInZpZXdSZWdpc3RyeVwiLCAgXCJsb2NhbFN0b3JhZ2VcIiwgXCJsYXlvdXRGdWxsXCIsIFwiaGVscFJlZ2lzdHJ5XCIsIFwicHJlZmVyZW5jZXNSZWdpc3RyeVwiLCBcIndpa2lSZXBvc2l0b3J5XCIsXG4gICAgXCIkcm9vdFNjb3BlXCIsICgkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSxcbiAgICAgICAgdmlld1JlZ2lzdHJ5LFxuICAgICAgICBsb2NhbFN0b3JhZ2UsXG4gICAgICAgIGxheW91dEZ1bGwsXG4gICAgICAgIGhlbHBSZWdpc3RyeSxcbiAgICAgICAgcHJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgICAgd2lraVJlcG9zaXRvcnksXG4gICAgICAgICRyb290U2NvcGUpID0+IHtcblxuICAgIHZpZXdSZWdpc3RyeVsnd2lraSddID0gdGVtcGxhdGVQYXRoICsgJ2xheW91dFdpa2kuaHRtbCc7XG4vKlxuICAgIGhlbHBSZWdpc3RyeS5hZGRVc2VyRG9jKCd3aWtpJywgJ3BsdWdpbnMvd2lraS9kb2MvaGVscC5tZCcsICgpID0+IHtcbiAgICAgIHJldHVybiBXaWtpLmlzV2lraUVuYWJsZWQod29ya3NwYWNlLCBqb2xva2lhLCBsb2NhbFN0b3JhZ2UpO1xuICAgIH0pO1xuKi9cblxuLypcbiAgICBwcmVmZXJlbmNlc1JlZ2lzdHJ5LmFkZFRhYihcIkdpdFwiLCAncGx1Z2lucy93aWtpL2h0bWwvZ2l0UHJlZmVyZW5jZXMuaHRtbCcpO1xuKi9cblxuLypcbiAgICB0YWIgPSB7XG4gICAgICBpZDogXCJ3aWtpXCIsXG4gICAgICBjb250ZW50OiBcIldpa2lcIixcbiAgICAgIHRpdGxlOiBcIlZpZXcgYW5kIGVkaXQgd2lraSBwYWdlc1wiLFxuICAgICAgaXNWYWxpZDogKHdvcmtzcGFjZTpXb3Jrc3BhY2UpID0+IFdpa2kuaXNXaWtpRW5hYmxlZCh3b3Jrc3BhY2UsIGpvbG9raWEsIGxvY2FsU3RvcmFnZSksXG4gICAgICBocmVmOiAoKSA9PiBcIiMvd2lraS92aWV3XCIsXG4gICAgICBpc0FjdGl2ZTogKHdvcmtzcGFjZTpXb3Jrc3BhY2UpID0+IHdvcmtzcGFjZS5pc0xpbmtBY3RpdmUoXCIvd2lraVwiKSAmJiAhd29ya3NwYWNlLmxpbmtDb250YWlucyhcImZhYnJpY1wiLCBcInByb2ZpbGVzXCIpICYmICF3b3Jrc3BhY2UubGlua0NvbnRhaW5zKFwiZWRpdEZlYXR1cmVzXCIpXG4gICAgfTtcbiAgICB3b3Jrc3BhY2UudG9wTGV2ZWxUYWJzLnB1c2godGFiKTtcbiovXG5cbiAgICAvLyBhZGQgZW1wdHkgcmVnZXhzIHRvIHRlbXBsYXRlcyB0aGF0IGRvbid0IGRlZmluZVxuICAgIC8vIHRoZW0gc28gbmctcGF0dGVybiBkb2Vzbid0IGJhcmZcbiAgICBXaWtpLmRvY3VtZW50VGVtcGxhdGVzLmZvckVhY2goKHRlbXBsYXRlOiBhbnkpID0+IHtcbiAgICAgIGlmICghdGVtcGxhdGVbJ3JlZ2V4J10pIHtcbiAgICAgICAgdGVtcGxhdGUucmVnZXggPSAvKD86KS87XG4gICAgICB9XG4gICAgfSk7XG5cbiAgfV0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5hZGRNb2R1bGUocGx1Z2luTmFtZSk7XG59XG4iLCIvKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi93aWtpUGx1Z2luLnRzXCIvPlxubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCB2YXIgQ2FtZWxDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5DYW1lbENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJHJvb3RTY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRjb21waWxlXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCJsb2NhbFN0b3JhZ2VcIiwgKCRzY29wZSwgJHJvb3RTY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsICRjb21waWxlLCAkdGVtcGxhdGVDYWNoZSwgbG9jYWxTdG9yYWdlOldpbmRvd0xvY2FsU3RvcmFnZSkgPT4ge1xuXG4gICAgLy8gVE9ETyBSRU1PVkVcbiAgICB2YXIgam9sb2tpYSA9IG51bGw7XG4gICAgdmFyIGpvbG9raWFTdGF0dXMgPSBudWxsO1xuICAgIHZhciBqbXhUcmVlTGF6eUxvYWRSZWdpc3RyeSA9IG51bGw7XG4gICAgdmFyIHVzZXJEZXRhaWxzID0gbnVsbDtcbiAgICB2YXIgSGF3dGlvTmF2ID0gbnVsbDtcbiAgICB2YXIgd29ya3NwYWNlID0gbmV3IFdvcmtzcGFjZShqb2xva2lhLCBqb2xva2lhU3RhdHVzLCBqbXhUcmVlTGF6eUxvYWRSZWdpc3RyeSwgJGxvY2F0aW9uLCAkY29tcGlsZSwgJHRlbXBsYXRlQ2FjaGUsIGxvY2FsU3RvcmFnZSwgJHJvb3RTY29wZSwgdXNlckRldGFpbHMsIEhhd3Rpb05hdik7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICBDYW1lbC5pbml0RW5kcG9pbnRDaG9vc2VyU2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sIGxvY2FsU3RvcmFnZSwgd29ya3NwYWNlLCBqb2xva2lhKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuc2NoZW1hID0gQ2FtZWwuZ2V0Q29uZmlndXJlZENhbWVsTW9kZWwoKTtcbiAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcblxuICAgICRzY29wZS5zd2l0Y2hUb0NhbnZhc1ZpZXcgPSBuZXcgVUkuRGlhbG9nKCk7XG5cbiAgICAkc2NvcGUuZmluZFByb2ZpbGVDYW1lbENvbnRleHQgPSB0cnVlO1xuICAgICRzY29wZS5jYW1lbFNlbGVjdGlvbkRldGFpbHMgPSB7XG4gICAgICBzZWxlY3RlZENhbWVsQ29udGV4dElkOiBudWxsLFxuICAgICAgc2VsZWN0ZWRSb3V0ZUlkOiBudWxsXG4gICAgfTtcblxuICAgICRzY29wZS5pc1ZhbGlkID0gKG5hdikgPT4ge1xuICAgICAgcmV0dXJuIG5hdiAmJiBuYXYuaXNWYWxpZCh3b3Jrc3BhY2UpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2FtZWxTdWJMZXZlbFRhYnMgPSBbXG4gICAgICB7XG4gICAgICAgIGNvbnRlbnQ6ICc8aSBjbGFzcz1cImZhIGZhLXBpY3R1cmUtb1wiPjwvaT4gQ2FudmFzJyxcbiAgICAgICAgdGl0bGU6IFwiRWRpdCB0aGUgZGlhZ3JhbSBpbiBhIGRyYWdneSBkcm9wcHkgd2F5XCIsXG4gICAgICAgIGlzVmFsaWQ6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiB0cnVlLFxuICAgICAgICBocmVmOiAoKSA9PiBXaWtpLnN0YXJ0TGluaygkc2NvcGUpICsgXCIvY2FtZWwvY2FudmFzL1wiICsgJHNjb3BlLnBhZ2VJZFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgY29udGVudDogJzxpIGNsYXNzPVwiZmEgZmEtdHJlZVwiPjwvaT4gVHJlZScsXG4gICAgICAgIHRpdGxlOiBcIlZpZXcgdGhlIHJvdXRlcyBhcyBhIHRyZWVcIixcbiAgICAgICAgaXNWYWxpZDogKHdvcmtzcGFjZTpXb3Jrc3BhY2UpID0+IHRydWUsXG4gICAgICAgIGhyZWY6ICgpID0+IFdpa2kuc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9jYW1lbC9wcm9wZXJ0aWVzL1wiICsgJHNjb3BlLnBhZ2VJZFxuICAgICAgfS8qLFxuICAgICAgIHtcbiAgICAgICBjb250ZW50OiAnPGkgY2xhc3M9XCJmYSBmYS1zaXRlbWFwXCI+PC9pPiBEaWFncmFtJyxcbiAgICAgICB0aXRsZTogXCJWaWV3IGEgZGlhZ3JhbSBvZiB0aGUgcm91dGVcIixcbiAgICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gdHJ1ZSxcbiAgICAgICBocmVmOiAoKSA9PiBXaWtpLnN0YXJ0TGluaygkc2NvcGUpICsgXCIvY2FtZWwvZGlhZ3JhbS9cIiArICRzY29wZS5wYWdlSWRcbiAgICAgICB9LCovXG4gICAgXTtcblxuICAgIHZhciByb3V0ZU1vZGVsID0gX2FwYWNoZUNhbWVsTW9kZWwuZGVmaW5pdGlvbnMucm91dGU7XG4gICAgcm91dGVNb2RlbFtcIl9pZFwiXSA9IFwicm91dGVcIjtcblxuICAgICRzY29wZS5hZGREaWFsb2cgPSBuZXcgVUkuRGlhbG9nKCk7XG5cbiAgICAvLyBUT0RPIGRvZXNuJ3Qgc2VlbSB0aGF0IGFuZ3VsYXItdWkgdXNlcyB0aGVzZT9cbiAgICAkc2NvcGUuYWRkRGlhbG9nLm9wdGlvbnNbXCJkaWFsb2dDbGFzc1wiXSA9IFwibW9kYWwtbGFyZ2VcIjtcbiAgICAkc2NvcGUuYWRkRGlhbG9nLm9wdGlvbnNbXCJjc3NDbGFzc1wiXSA9IFwibW9kYWwtbGFyZ2VcIjtcblxuICAgICRzY29wZS5wYWxldHRlSXRlbVNlYXJjaCA9IFwiXCI7XG4gICAgJHNjb3BlLnBhbGV0dGVUcmVlID0gbmV3IEZvbGRlcihcIlBhbGV0dGVcIik7XG4gICAgJHNjb3BlLnBhbGV0dGVBY3RpdmF0aW9ucyA9IFtcIlJvdXRpbmdfYWdncmVnYXRlXCJdO1xuXG4gICAgLy8gbG9hZCAkc2NvcGUucGFsZXR0ZVRyZWVcbiAgICBhbmd1bGFyLmZvckVhY2goX2FwYWNoZUNhbWVsTW9kZWwuZGVmaW5pdGlvbnMsICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBpZiAodmFsdWUuZ3JvdXApIHtcbiAgICAgICAgdmFyIGdyb3VwID0gKGtleSA9PT0gXCJyb3V0ZVwiKSA/ICRzY29wZS5wYWxldHRlVHJlZSA6ICRzY29wZS5wYWxldHRlVHJlZS5nZXRPckVsc2UodmFsdWUuZ3JvdXApO1xuICAgICAgICBpZiAoIWdyb3VwLmtleSkge1xuICAgICAgICAgIGdyb3VwLmtleSA9IHZhbHVlLmdyb3VwO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlW1wiX2lkXCJdID0ga2V5O1xuICAgICAgICB2YXIgdGl0bGUgPSB2YWx1ZVtcInRpdGxlXCJdIHx8IGtleTtcbiAgICAgICAgdmFyIG5vZGUgPSBuZXcgRm9sZGVyKHRpdGxlKTtcbiAgICAgICAgbm9kZS5rZXkgPSBncm91cC5rZXkgKyBcIl9cIiArIGtleTtcbiAgICAgICAgbm9kZVtcIm5vZGVNb2RlbFwiXSA9IHZhbHVlO1xuICAgICAgICB2YXIgaW1hZ2VVcmwgPSBDYW1lbC5nZXRSb3V0ZU5vZGVJY29uKHZhbHVlKTtcbiAgICAgICAgbm9kZS5pY29uID0gaW1hZ2VVcmw7XG4gICAgICAgIC8vIGNvbXBpbGVyIHdhcyBjb21wbGFpbmluZyBhYm91dCAnbGFiZWwnIGhhZCBubyBpZGVhIHdoZXJlIGl0J3MgY29taW5nIGZyb21cbiAgICAgICAgLy8gdmFyIHRvb2x0aXAgPSB2YWx1ZVtcInRvb2x0aXBcIl0gfHwgdmFsdWVbXCJkZXNjcmlwdGlvblwiXSB8fCBsYWJlbDtcbiAgICAgICAgdmFyIHRvb2x0aXAgPSB2YWx1ZVtcInRvb2x0aXBcIl0gfHwgdmFsdWVbXCJkZXNjcmlwdGlvblwiXSB8fCAnJztcbiAgICAgICAgbm9kZS50b29sdGlwID0gdG9vbHRpcDtcblxuICAgICAgICBncm91cC5jaGlsZHJlbi5wdXNoKG5vZGUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gbG9hZCAkc2NvcGUuY29tcG9uZW50VHJlZVxuICAgICRzY29wZS5jb21wb25lbnRUcmVlID0gbmV3IEZvbGRlcihcIkVuZHBvaW50c1wiKTtcblxuICAgICRzY29wZS4kd2F0Y2goXCJjb21wb25lbnROYW1lc1wiLCAoKSA9PiB7XG4gICAgICB2YXIgY29tcG9uZW50TmFtZXMgPSAkc2NvcGUuY29tcG9uZW50TmFtZXM7XG4gICAgICBpZiAoY29tcG9uZW50TmFtZXMgJiYgY29tcG9uZW50TmFtZXMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5jb21wb25lbnRUcmVlID0gbmV3IEZvbGRlcihcIkVuZHBvaW50c1wiKTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5jb21wb25lbnROYW1lcywgKGVuZHBvaW50TmFtZSkgPT4ge1xuICAgICAgICAgIHZhciBjYXRlZ29yeSA9IENhbWVsLmdldEVuZHBvaW50Q2F0ZWdvcnkoZW5kcG9pbnROYW1lKTtcbiAgICAgICAgICB2YXIgZ3JvdXBOYW1lID0gY2F0ZWdvcnkubGFiZWwgfHwgXCJDb3JlXCI7XG4gICAgICAgICAgdmFyIGdyb3VwS2V5ID0gY2F0ZWdvcnkuaWQgfHwgZ3JvdXBOYW1lO1xuICAgICAgICAgIHZhciBncm91cCA9ICRzY29wZS5jb21wb25lbnRUcmVlLmdldE9yRWxzZShncm91cE5hbWUpO1xuXG4gICAgICAgICAgdmFyIHZhbHVlID0gQ2FtZWwuZ2V0RW5kcG9pbnRDb25maWcoZW5kcG9pbnROYW1lLCBjYXRlZ29yeSk7XG4gICAgICAgICAgdmFyIGtleSA9IGVuZHBvaW50TmFtZTtcbiAgICAgICAgICB2YXIgbGFiZWwgPSB2YWx1ZVtcImxhYmVsXCJdIHx8IGVuZHBvaW50TmFtZTtcbiAgICAgICAgICB2YXIgbm9kZSA9IG5ldyBGb2xkZXIobGFiZWwpO1xuICAgICAgICAgIG5vZGUua2V5ID0gZ3JvdXBLZXkgKyBcIl9cIiArIGtleTtcbiAgICAgICAgICBub2RlLmtleSA9IGtleTtcbiAgICAgICAgICBub2RlW1wibm9kZU1vZGVsXCJdID0gdmFsdWU7XG4gICAgICAgICAgdmFyIHRvb2x0aXAgPSB2YWx1ZVtcInRvb2x0aXBcIl0gfHwgdmFsdWVbXCJkZXNjcmlwdGlvblwiXSB8fCBsYWJlbDtcbiAgICAgICAgICB2YXIgaW1hZ2VVcmwgPSBDb3JlLnVybCh2YWx1ZVtcImljb25cIl0gfHwgQ2FtZWwuZW5kcG9pbnRJY29uKTtcbiAgICAgICAgICBub2RlLmljb24gPSBpbWFnZVVybDtcbiAgICAgICAgICBub2RlLnRvb2x0aXAgPSB0b29sdGlwO1xuXG4gICAgICAgICAgZ3JvdXAuY2hpbGRyZW4ucHVzaChub2RlKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgJHNjb3BlLmNvbXBvbmVudEFjdGl2YXRpb25zID0gW1wiYmVhblwiXTtcblxuICAgICRzY29wZS4kd2F0Y2goJ2FkZERpYWxvZy5zaG93JywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCRzY29wZS5hZGREaWFsb2cuc2hvdykge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAkKCcjc3VibWl0JykuZm9jdXMoKTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbihcImhhd3Rpby5mb3JtLm1vZGVsQ2hhbmdlXCIsIG9uTW9kZWxDaGFuZ2VFdmVudCk7XG5cbiAgICAkc2NvcGUub25Sb290VHJlZU5vZGUgPSAocm9vdFRyZWVOb2RlKSA9PiB7XG4gICAgICAkc2NvcGUucm9vdFRyZWVOb2RlID0gcm9vdFRyZWVOb2RlO1xuICAgICAgLy8gcmVzdG9yZSB0aGUgcmVhbCBkYXRhIGF0IHRoZSByb290IGZvciBzYXZpbmcgdGhlIGRvYyBldGNcbiAgICAgIHJvb3RUcmVlTm9kZS5kYXRhID0gJHNjb3BlLmNhbWVsQ29udGV4dFRyZWU7XG4gICAgfTtcblxuICAgICRzY29wZS5hZGROb2RlID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5ub2RlWG1sTm9kZSkge1xuICAgICAgICAkc2NvcGUuYWRkRGlhbG9nLm9wZW4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFkZE5ld05vZGUocm91dGVNb2RlbCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5vblBhbGV0dGVTZWxlY3QgPSAobm9kZSkgPT4ge1xuICAgICAgJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUgPSAobm9kZSAmJiBub2RlW1wibm9kZU1vZGVsXCJdKSA/IG5vZGUgOiBudWxsO1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlKSB7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUgPSBudWxsO1xuICAgICAgfVxuICAgICAgbG9nLmRlYnVnKFwiU2VsZWN0ZWQgXCIgKyAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSArIFwiIDogXCIgKyAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uQ29tcG9uZW50U2VsZWN0ID0gKG5vZGUpID0+IHtcbiAgICAgICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUgPSAobm9kZSAmJiBub2RlW1wibm9kZU1vZGVsXCJdKSA/IG5vZGUgOiBudWxsO1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUgPSBudWxsO1xuICAgICAgICB2YXIgbm9kZU5hbWUgPSBub2RlLmtleTtcbiAgICAgICAgbG9nLmRlYnVnKFwibG9hZGluZyBlbmRwb2ludCBzY2hlbWEgZm9yIG5vZGUgXCIgKyBub2RlTmFtZSk7XG4gICAgICAgICRzY29wZS5sb2FkRW5kcG9pbnRTY2hlbWEobm9kZU5hbWUpO1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROYW1lID0gbm9kZU5hbWU7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoXCJTZWxlY3RlZCBcIiArICRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlICsgXCIgOiBcIiArICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2VsZWN0ZWROb2RlTW9kZWwgPSAoKSA9PiB7XG4gICAgICB2YXIgbm9kZU1vZGVsID0gbnVsbDtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSkge1xuICAgICAgICBub2RlTW9kZWwgPSAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZVtcIm5vZGVNb2RlbFwiXTtcbiAgICAgICAgJHNjb3BlLmVuZHBvaW50Q29uZmlnID0gbnVsbDtcbiAgICAgIH0gZWxzZSBpZiAoJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSkge1xuICAgICAgICAvLyBUT0RPIGxlc3QgY3JlYXRlIGFuIGVuZHBvaW50IG5vZGVNb2RlbCBhbmQgYXNzb2NpYXRlXG4gICAgICAgIC8vIHRoZSBkdW1teSBVUkwgYW5kIHByb3BlcnRpZXMgZXRjLi4uXG4gICAgICAgIHZhciBlbmRwb2ludENvbmZpZyA9ICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGVbXCJub2RlTW9kZWxcIl07XG4gICAgICAgIHZhciBlbmRwb2ludFNjaGVtYSA9ICRzY29wZS5lbmRwb2ludFNjaGVtYTtcbiAgICAgICAgbm9kZU1vZGVsID0gJHNjb3BlLnNjaGVtYS5kZWZpbml0aW9ucy5lbmRwb2ludDtcbiAgICAgICAgJHNjb3BlLmVuZHBvaW50Q29uZmlnID0ge1xuICAgICAgICAgIGtleTogJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZS5rZXksXG4gICAgICAgICAgc2NoZW1hOiBlbmRwb2ludFNjaGVtYSxcbiAgICAgICAgICBkZXRhaWxzOiBlbmRwb2ludENvbmZpZ1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGVNb2RlbDtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmFkZEFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIG5vZGVNb2RlbCA9ICRzY29wZS5zZWxlY3RlZE5vZGVNb2RlbCgpO1xuICAgICAgaWYgKG5vZGVNb2RlbCkge1xuICAgICAgICBhZGROZXdOb2RlKG5vZGVNb2RlbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJXQVJOSU5HOiBubyBub2RlTW9kZWwhXCIpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLmFkZERpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmVtb3ZlTm9kZSA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgJiYgJHNjb3BlLnRyZWVOb2RlKSB7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZEZvbGRlci5kZXRhY2goKTtcbiAgICAgICAgJHNjb3BlLnRyZWVOb2RlLnJlbW92ZSgpO1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgPSBudWxsO1xuICAgICAgICAkc2NvcGUudHJlZU5vZGUgPSBudWxsO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY2FuRGVsZXRlID0gKCkgPT4ge1xuICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZEZvbGRlciA/IHRydWUgOiBmYWxzZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmlzQWN0aXZlID0gKG5hdikgPT4ge1xuICAgICAgaWYgKGFuZ3VsYXIuaXNTdHJpbmcobmF2KSlcbiAgICAgICAgcmV0dXJuIHdvcmtzcGFjZS5pc0xpbmtBY3RpdmUobmF2KTtcbiAgICAgIHZhciBmbiA9IG5hdi5pc0FjdGl2ZTtcbiAgICAgIGlmIChmbikge1xuICAgICAgICByZXR1cm4gZm4od29ya3NwYWNlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB3b3Jrc3BhY2UuaXNMaW5rQWN0aXZlKG5hdi5ocmVmKCkpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZSA9ICgpID0+IHtcbiAgICAgIC8vIGdlbmVyYXRlIHRoZSBuZXcgWE1MXG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkICYmICRzY29wZS5yb290VHJlZU5vZGUpIHtcbiAgICAgICAgdmFyIHhtbE5vZGUgPSBDYW1lbC5nZW5lcmF0ZVhtbEZyb21Gb2xkZXIoJHNjb3BlLnJvb3RUcmVlTm9kZSk7XG4gICAgICAgIGlmICh4bWxOb2RlKSB7XG4gICAgICAgICAgdmFyIHRleHQgPSBDb3JlLnhtbE5vZGVUb1N0cmluZyh4bWxOb2RlKTtcbiAgICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgLy8gbGV0cyBzYXZlIHRoZSBmaWxlLi4uXG4gICAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9ICRzY29wZS5jb21taXRNZXNzYWdlIHx8IFwiVXBkYXRlZCBwYWdlIFwiICsgJHNjb3BlLnBhZ2VJZDtcbiAgICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgdGV4dCwgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiU2F2ZWQgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICAgICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIGxvZy5kZWJ1ZyhcImNhbmNlbGxpbmcuLi5cIik7XG4gICAgICAvLyBUT0RPIHNob3cgZGlhbG9nIGlmIGZvbGtzIGFyZSBhYm91dCB0byBsb3NlIGNoYW5nZXMuLi5cbiAgICB9O1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnd29ya3NwYWNlLnRyZWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISRzY29wZS5naXQpIHtcbiAgICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgICAgLy9sb2cuZGVidWcoXCJSZWxvYWRpbmcgdGhlIHZpZXcgYXMgd2Ugbm93IHNlZW0gdG8gaGF2ZSBhIGdpdCBtYmVhbiFcIik7XG4gICAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gZ2V0Rm9sZGVyWG1sTm9kZSh0cmVlTm9kZSkge1xuICAgICAgdmFyIHJvdXRlWG1sTm9kZSA9IENhbWVsLmNyZWF0ZUZvbGRlclhtbFRyZWUodHJlZU5vZGUsIG51bGwpO1xuICAgICAgaWYgKHJvdXRlWG1sTm9kZSkge1xuICAgICAgICAkc2NvcGUubm9kZVhtbE5vZGUgPSByb3V0ZVhtbE5vZGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcm91dGVYbWxOb2RlO1xuICAgIH1cblxuICAgICRzY29wZS5vbk5vZGVTZWxlY3QgPSAoZm9sZGVyLCB0cmVlTm9kZSkgPT4ge1xuICAgICAgJHNjb3BlLnNlbGVjdGVkRm9sZGVyID0gZm9sZGVyO1xuICAgICAgJHNjb3BlLnRyZWVOb2RlID0gdHJlZU5vZGU7XG4gICAgICAkc2NvcGUucHJvcGVydGllc1RlbXBsYXRlID0gbnVsbDtcbiAgICAgICRzY29wZS5kaWFncmFtVGVtcGxhdGUgPSBudWxsO1xuICAgICAgJHNjb3BlLm5vZGVYbWxOb2RlID0gbnVsbDtcbiAgICAgIGlmIChmb2xkZXIpIHtcbiAgICAgICAgJHNjb3BlLm5vZGVEYXRhID0gQ2FtZWwuZ2V0Um91dGVGb2xkZXJKU09OKGZvbGRlcik7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YUNoYW5nZWRGaWVsZHMgPSB7fTtcbiAgICAgIH1cbiAgICAgIHZhciBub2RlTmFtZSA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKGZvbGRlcik7XG4gICAgICAvLyBsZXRzIGxhemlseSBjcmVhdGUgdGhlIFhNTCB0cmVlIHNvIGl0IGNhbiBiZSB1c2VkIGJ5IHRoZSBkaWFncmFtXG4gICAgICB2YXIgcm91dGVYbWxOb2RlID0gZ2V0Rm9sZGVyWG1sTm9kZSh0cmVlTm9kZSk7XG4gICAgICBpZiAobm9kZU5hbWUpIHtcbiAgICAgICAgLy92YXIgbm9kZU5hbWUgPSByb3V0ZVhtbE5vZGUubG9jYWxOYW1lO1xuICAgICAgICAkc2NvcGUubm9kZU1vZGVsID0gQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEobm9kZU5hbWUpO1xuICAgICAgICBpZiAoJHNjb3BlLm5vZGVNb2RlbCkge1xuICAgICAgICAgICRzY29wZS5wcm9wZXJ0aWVzVGVtcGxhdGUgPSBcInBsdWdpbnMvd2lraS9odG1sL2NhbWVsUHJvcGVydGllc0VkaXQuaHRtbFwiO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS5kaWFncmFtVGVtcGxhdGUgPSBcImFwcC9jYW1lbC9odG1sL3JvdXRlcy5odG1sXCI7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5vbk5vZGVEcmFnRW50ZXIgPSAobm9kZSwgc291cmNlTm9kZSkgPT4ge1xuICAgICAgdmFyIG5vZGVGb2xkZXIgPSBub2RlLmRhdGE7XG4gICAgICB2YXIgc291cmNlRm9sZGVyID0gc291cmNlTm9kZS5kYXRhO1xuICAgICAgaWYgKG5vZGVGb2xkZXIgJiYgc291cmNlRm9sZGVyKSB7XG4gICAgICAgIHZhciBub2RlSWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChub2RlRm9sZGVyKTtcbiAgICAgICAgdmFyIHNvdXJjZUlkID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQoc291cmNlRm9sZGVyKTtcbiAgICAgICAgaWYgKG5vZGVJZCAmJiBzb3VyY2VJZCkge1xuICAgICAgICAgIC8vIHdlIGNhbiBvbmx5IGRyYWcgcm91dGVzIG9udG8gb3RoZXIgcm91dGVzIChiZWZvcmUgLyBhZnRlciAvIG92ZXIpXG4gICAgICAgICAgaWYgKHNvdXJjZUlkID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlSWQgPT09IFwicm91dGVcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uTm9kZURyb3AgPSAobm9kZSwgc291cmNlTm9kZSwgaGl0TW9kZSwgdWksIGRyYWdnYWJsZSkgPT4ge1xuICAgICAgdmFyIG5vZGVGb2xkZXIgPSBub2RlLmRhdGE7XG4gICAgICB2YXIgc291cmNlRm9sZGVyID0gc291cmNlTm9kZS5kYXRhO1xuICAgICAgaWYgKG5vZGVGb2xkZXIgJiYgc291cmNlRm9sZGVyKSB7XG4gICAgICAgIC8vIHdlIGNhbm5vdCBkcm9wIGEgcm91dGUgaW50byBhIHJvdXRlIG9yIGEgbm9uLXJvdXRlIHRvIGEgdG9wIGxldmVsIVxuICAgICAgICB2YXIgbm9kZUlkID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQobm9kZUZvbGRlcik7XG4gICAgICAgIHZhciBzb3VyY2VJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKHNvdXJjZUZvbGRlcik7XG5cbiAgICAgICAgaWYgKG5vZGVJZCA9PT0gXCJyb3V0ZVwiKSB7XG4gICAgICAgICAgLy8gaGl0TW9kZSBtdXN0IGJlIFwib3ZlclwiIGlmIHdlIGFyZSBub3QgYW5vdGhlciByb3V0ZVxuICAgICAgICAgIGlmIChzb3VyY2VJZCA9PT0gXCJyb3V0ZVwiKSB7XG4gICAgICAgICAgICBpZiAoaGl0TW9kZSA9PT0gXCJvdmVyXCIpIHtcbiAgICAgICAgICAgICAgaGl0TW9kZSA9IFwiYWZ0ZXJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZGlzYWJsZSBiZWZvcmUgLyBhZnRlclxuICAgICAgICAgICAgaGl0TW9kZSA9IFwib3ZlclwiO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBpZiAoQ2FtZWwuYWNjZXB0T3V0cHV0KG5vZGVJZCkpIHtcbiAgICAgICAgICAgIGhpdE1vZGUgPSBcIm92ZXJcIjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGhpdE1vZGUgIT09IFwiYmVmb3JlXCIpIHtcbiAgICAgICAgICAgICAgaGl0TW9kZSA9IFwiYWZ0ZXJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbG9nLmRlYnVnKFwibm9kZURyb3Agbm9kZUlkOiBcIiArIG5vZGVJZCArIFwiIHNvdXJjZUlkOiBcIiArIHNvdXJjZUlkICsgXCIgaGl0TW9kZTogXCIgKyBoaXRNb2RlKTtcblxuICAgICAgICBzb3VyY2VOb2RlLm1vdmUobm9kZSwgaGl0TW9kZSk7XG4gICAgICB9XG4gICAgfTtcblxuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gYWRkTmV3Tm9kZShub2RlTW9kZWwpIHtcbiAgICAgIHZhciBkb2MgPSAkc2NvcGUuZG9jIHx8IGRvY3VtZW50O1xuICAgICAgdmFyIHBhcmVudEZvbGRlciA9ICRzY29wZS5zZWxlY3RlZEZvbGRlciB8fCAkc2NvcGUuY2FtZWxDb250ZXh0VHJlZTtcbiAgICAgIHZhciBrZXkgPSBub2RlTW9kZWxbXCJfaWRcIl07XG4gICAgICB2YXIgYmVmb3JlTm9kZSA9IG51bGw7XG4gICAgICBpZiAoIWtleSkge1xuICAgICAgICBsb2cuZGVidWcoXCJXQVJOSU5HOiBubyBpZCBmb3IgbW9kZWwgXCIgKyBKU09OLnN0cmluZ2lmeShub2RlTW9kZWwpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0cmVlTm9kZSA9ICRzY29wZS50cmVlTm9kZTtcbiAgICAgICAgaWYgKGtleSA9PT0gXCJyb3V0ZVwiKSB7XG4gICAgICAgICAgLy8gbGV0cyBhZGQgdG8gdGhlIHJvb3Qgb2YgdGhlIHRyZWVcbiAgICAgICAgICB0cmVlTm9kZSA9ICRzY29wZS5yb290VHJlZU5vZGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKCF0cmVlTm9kZSkge1xuICAgICAgICAgICAgLy8gbGV0cyBzZWxlY3QgdGhlIGxhc3Qgcm91dGUgLSBhbmQgY3JlYXRlIGEgbmV3IHJvdXRlIGlmIG5lZWQgYmVcbiAgICAgICAgICAgIHZhciByb290ID0gJHNjb3BlLnJvb3RUcmVlTm9kZTtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuZ2V0Q2hpbGRyZW4oKTtcbiAgICAgICAgICAgIGlmICghY2hpbGRyZW4gfHwgIWNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICBhZGROZXdOb2RlKENhbWVsLmdldENhbWVsU2NoZW1hKFwicm91dGVcIikpO1xuICAgICAgICAgICAgICBjaGlsZHJlbiA9IHJvb3QuZ2V0Q2hpbGRyZW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdHJlZU5vZGUgPSBjaGlsZHJlbltjaGlsZHJlbi5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNvdWxkIG5vdCBhZGQgYSBuZXcgcm91dGUgdG8gdGhlIGVtcHR5IHRyZWUhXCIpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgICAvLyBpZiB0aGUgcGFyZW50IGZvbGRlciBsaWtlcyB0byBhY3QgYXMgYSBwaXBlbGluZSwgdGhlbiBhZGRcbiAgICAgICAgICAvLyBhZnRlciB0aGUgcGFyZW50LCByYXRoZXIgdGhhbiBhcyBhIGNoaWxkXG4gICAgICAgICAgdmFyIHBhcmVudElkID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQodHJlZU5vZGUuZGF0YSk7XG4gICAgICAgICAgaWYgKCFDYW1lbC5hY2NlcHRPdXRwdXQocGFyZW50SWQpKSB7XG4gICAgICAgICAgICAvLyBsZXRzIGFkZCB0aGUgbmV3IG5vZGUgdG8gdGhlIGVuZCBvZiB0aGUgcGFyZW50XG4gICAgICAgICAgICBiZWZvcmVOb2RlID0gdHJlZU5vZGUuZ2V0TmV4dFNpYmxpbmcoKTtcbiAgICAgICAgICAgIHRyZWVOb2RlID0gdHJlZU5vZGUuZ2V0UGFyZW50KCkgfHwgdHJlZU5vZGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0cmVlTm9kZSkge1xuICAgICAgICAgIHZhciBub2RlID0gZG9jLmNyZWF0ZUVsZW1lbnQoa2V5KTtcbiAgICAgICAgICBwYXJlbnRGb2xkZXIgPSB0cmVlTm9kZS5kYXRhO1xuICAgICAgICAgIHZhciBhZGRlZE5vZGUgPSBDYW1lbC5hZGRSb3V0ZUNoaWxkKHBhcmVudEZvbGRlciwgbm9kZSk7XG4gICAgICAgICAgaWYgKGFkZGVkTm9kZSkge1xuICAgICAgICAgICAgdmFyIGFkZGVkID0gdHJlZU5vZGUuYWRkQ2hpbGQoYWRkZWROb2RlLCBiZWZvcmVOb2RlKTtcbiAgICAgICAgICAgIGlmIChhZGRlZCkge1xuICAgICAgICAgICAgICBnZXRGb2xkZXJYbWxOb2RlKGFkZGVkKTtcbiAgICAgICAgICAgICAgYWRkZWQuZXhwYW5kKHRydWUpO1xuICAgICAgICAgICAgICBhZGRlZC5zZWxlY3QodHJ1ZSk7XG4gICAgICAgICAgICAgIGFkZGVkLmFjdGl2YXRlKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uTW9kZWxDaGFuZ2VFdmVudChldmVudCwgbmFtZSkge1xuICAgICAgLy8gbGV0cyBmaWx0ZXIgb3V0IGV2ZW50cyBkdWUgdG8gdGhlIG5vZGUgY2hhbmdpbmcgY2F1c2luZyB0aGVcbiAgICAgIC8vIGZvcm1zIHRvIGJlIHJlY3JlYXRlZFxuICAgICAgaWYgKCRzY29wZS5ub2RlRGF0YSkge1xuICAgICAgICB2YXIgZmllbGRNYXAgPSAkc2NvcGUubm9kZURhdGFDaGFuZ2VkRmllbGRzO1xuICAgICAgICBpZiAoZmllbGRNYXApIHtcbiAgICAgICAgICBpZiAoZmllbGRNYXBbbmFtZV0pIHtcbiAgICAgICAgICAgIG9uTm9kZURhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHRoZSBzZWxlY3Rpb24gaGFzIGp1c3QgY2hhbmdlZCBzbyB3ZSBnZXQgdGhlIGluaXRpYWwgZXZlbnRcbiAgICAgICAgICAgIC8vIHdlIGNhbiBpZ25vcmUgdGhpcyA6KVxuICAgICAgICAgICAgZmllbGRNYXBbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uTm9kZURhdGFDaGFuZ2VkKCkge1xuICAgICAgJHNjb3BlLm1vZGlmaWVkID0gdHJ1ZTtcbiAgICAgIHZhciBzZWxlY3RlZEZvbGRlciA9ICRzY29wZS5zZWxlY3RlZEZvbGRlcjtcbiAgICAgIGlmICgkc2NvcGUudHJlZU5vZGUgJiYgc2VsZWN0ZWRGb2xkZXIpIHtcbiAgICAgICAgdmFyIHJvdXRlWG1sTm9kZSA9IGdldEZvbGRlclhtbE5vZGUoJHNjb3BlLnRyZWVOb2RlKTtcbiAgICAgICAgaWYgKHJvdXRlWG1sTm9kZSkge1xuICAgICAgICAgIHZhciBub2RlTmFtZSA9IHJvdXRlWG1sTm9kZS5sb2NhbE5hbWU7XG4gICAgICAgICAgdmFyIG5vZGVTZXR0aW5ncyA9IENhbWVsLmdldENhbWVsU2NoZW1hKG5vZGVOYW1lKTtcbiAgICAgICAgICBpZiAobm9kZVNldHRpbmdzKSB7XG4gICAgICAgICAgICAvLyB1cGRhdGUgdGhlIHRpdGxlIGFuZCB0b29sdGlwIGV0Y1xuICAgICAgICAgICAgQ2FtZWwudXBkYXRlUm91dGVOb2RlTGFiZWxBbmRUb29sdGlwKHNlbGVjdGVkRm9sZGVyLCByb3V0ZVhtbE5vZGUsIG5vZGVTZXR0aW5ncyk7XG4gICAgICAgICAgICAkc2NvcGUudHJlZU5vZGUucmVuZGVyKGZhbHNlLCBmYWxzZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE8gbm90IHN1cmUgd2UgbmVlZCB0aGlzIHRvIGJlIGhvbmVzdFxuICAgICAgICBzZWxlY3RlZEZvbGRlcltcImNhbWVsTm9kZURhdGFcIl0gPSAkc2NvcGUubm9kZURhdGE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25SZXN1bHRzKHJlc3BvbnNlKSB7XG4gICAgICB2YXIgdGV4dCA9IHJlc3BvbnNlLnRleHQ7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICAvLyBsZXRzIHJlbW92ZSBhbnkgZG9kZ3kgY2hhcmFjdGVycyBzbyB3ZSBjYW4gdXNlIGl0IGFzIGEgRE9NIGlkXG4gICAgICAgIHZhciB0cmVlID0gQ2FtZWwubG9hZENhbWVsVHJlZSh0ZXh0LCAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgaWYgKHRyZWUpIHtcbiAgICAgICAgICAkc2NvcGUuY2FtZWxDb250ZXh0VHJlZSA9IHRyZWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIFhNTCBmb3VuZCBmb3IgcGFnZSBcIiArICRzY29wZS5wYWdlSWQpO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHlMYXRlcigkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICAkc2NvcGUubG9hZEVuZHBvaW50TmFtZXMoKTtcbiAgICAgICRzY29wZS5wYWdlSWQgPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgICBsb2cuZGVidWcoXCJIYXMgcGFnZSBpZDogXCIgKyAkc2NvcGUucGFnZUlkICsgXCIgd2l0aCAkcm91dGVQYXJhbXMgXCIgKyBKU09OLnN0cmluZ2lmeSgkcm91dGVQYXJhbXMpKTtcblxuICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCAkc2NvcGUub2JqZWN0SWQsIG9uUmVzdWx0cyk7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBnb1RvVmlldygpIHtcbiAgICAgIC8vIFRPRE8gbGV0cyBuYXZpZ2F0ZSB0byB0aGUgdmlldyBpZiB3ZSBoYXZlIGEgc2VwYXJhdGUgdmlldyBvbmUgZGF5IDopXG4gICAgICAvKlxuICAgICAgIGlmICgkc2NvcGUuYnJlYWRjcnVtYnMgJiYgJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCA+IDEpIHtcbiAgICAgICB2YXIgdmlld0xpbmsgPSAkc2NvcGUuYnJlYWRjcnVtYnNbJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCAtIDJdO1xuICAgICAgIGxvZy5kZWJ1ZyhcImdvVG9WaWV3IGhhcyBmb3VuZCB2aWV3IFwiICsgdmlld0xpbmspO1xuICAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyh2aWV3TGluaywgXCIjXCIpO1xuICAgICAgICRsb2NhdGlvbi5wYXRoKHBhdGgpO1xuICAgICAgIH0gZWxzZSB7XG4gICAgICAgbG9nLmRlYnVnKFwiZ29Ub1ZpZXcgaGFzIG5vIGJyZWFkY3J1bWJzIVwiKTtcbiAgICAgICB9XG4gICAgICAgKi9cbiAgICB9XG5cbiAgICAkc2NvcGUuZG9Td2l0Y2hUb0NhbnZhc1ZpZXcgPSAoKSA9PiB7XG4gICAgICB2YXIgbGluayA9ICRsb2NhdGlvbi51cmwoKS5yZXBsYWNlKC9cXC9wcm9wZXJ0aWVzXFwvLywgJy9jYW52YXMvJyk7XG4gICAgICBsb2cuZGVidWcoXCJMaW5rOiBcIiwgbGluayk7XG4gICAgICAkbG9jYXRpb24udXJsKGxpbmspO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY29uZmlybVN3aXRjaFRvQ2FudmFzVmlldyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQpIHtcbiAgICAgICAgJHNjb3BlLnN3aXRjaFRvQ2FudmFzVmlldy5vcGVuKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuZG9Td2l0Y2hUb0NhbnZhc1ZpZXcoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gIH1dKTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3dpa2lQbHVnaW4udHNcIi8+XG5tb2R1bGUgV2lraSB7XG4gIGV4cG9ydCB2YXIgQ2FtZWxDYW52YXNDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5DYW1lbENhbnZhc0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRpbnRlcnBvbGF0ZVwiLCBcIiRsb2NhdGlvblwiLCAoJHNjb3BlLCAkZWxlbWVudCwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgJGludGVycG9sYXRlLCAkbG9jYXRpb24pID0+IHtcbiAgICB2YXIganNQbHVtYkluc3RhbmNlID0ganNQbHVtYi5nZXRJbnN0YW5jZSgpO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmFkZERpYWxvZyA9IG5ldyBVSS5EaWFsb2coKTtcbiAgICAkc2NvcGUucHJvcGVydGllc0RpYWxvZyA9IG5ldyBVSS5EaWFsb2coKTtcbiAgICAkc2NvcGUuc3dpdGNoVG9UcmVlVmlldyA9IG5ldyBVSS5EaWFsb2coKTtcbiAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcbiAgICAkc2NvcGUuY2FtZWxJZ25vcmVJZEZvckxhYmVsID0gQ2FtZWwuaWdub3JlSWRGb3JMYWJlbChsb2NhbFN0b3JhZ2UpO1xuICAgICRzY29wZS5jYW1lbE1heGltdW1MYWJlbFdpZHRoID0gQ2FtZWwubWF4aW11bUxhYmVsV2lkdGgobG9jYWxTdG9yYWdlKTtcbiAgICAkc2NvcGUuY2FtZWxNYXhpbXVtVHJhY2VPckRlYnVnQm9keUxlbmd0aCA9IENhbWVsLm1heGltdW1UcmFjZU9yRGVidWdCb2R5TGVuZ3RoKGxvY2FsU3RvcmFnZSk7XG5cbiAgICAkc2NvcGUuZm9ybXMgPSB7fTtcblxuICAgICRzY29wZS5ub2RlVGVtcGxhdGUgPSAkaW50ZXJwb2xhdGUoJHRlbXBsYXRlQ2FjaGUuZ2V0KFwibm9kZVRlbXBsYXRlXCIpKTtcblxuICAgICRzY29wZS4kd2F0Y2goXCJjYW1lbENvbnRleHRUcmVlXCIsICgpID0+IHtcbiAgICAgIHZhciB0cmVlID0gJHNjb3BlLmNhbWVsQ29udGV4dFRyZWU7XG4gICAgICAkc2NvcGUucm9vdEZvbGRlciA9IHRyZWU7XG4gICAgICAvLyBub3cgd2UndmUgZ290IGNpZCB2YWx1ZXMgaW4gdGhlIHRyZWUgYW5kIERPTSwgbGV0cyBjcmVhdGUgYW4gaW5kZXggc28gd2UgY2FuIGJpbmQgdGhlIERPTSB0byB0aGUgdHJlZSBtb2RlbFxuICAgICAgJHNjb3BlLmZvbGRlcnMgPSBDYW1lbC5hZGRGb2xkZXJzVG9JbmRleCgkc2NvcGUucm9vdEZvbGRlcik7XG5cbiAgICAgIHZhciBkb2MgPSBDb3JlLnBhdGhHZXQodHJlZSwgW1wieG1sRG9jdW1lbnRcIl0pO1xuICAgICAgaWYgKGRvYykge1xuICAgICAgICAkc2NvcGUuZG9jID0gZG9jO1xuICAgICAgICByZWxvYWRSb3V0ZUlkcygpO1xuICAgICAgICBvblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCgpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLmFkZEFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIG5vZGVNb2RlbCA9ICRzY29wZS5zZWxlY3RlZE5vZGVNb2RlbCgpO1xuICAgICAgaWYgKG5vZGVNb2RlbCkge1xuICAgICAgICBhZGROZXdOb2RlKG5vZGVNb2RlbCk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuYWRkRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5yZW1vdmVOb2RlID0gKCkgPT4ge1xuICAgICAgdmFyIGZvbGRlciA9IGdldFNlbGVjdGVkT3JSb3V0ZUZvbGRlcigpO1xuICAgICAgaWYgKGZvbGRlcikge1xuICAgICAgICB2YXIgbm9kZU5hbWUgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChmb2xkZXIpO1xuICAgICAgICBmb2xkZXIuZGV0YWNoKCk7XG4gICAgICAgIGlmIChcInJvdXRlXCIgPT09IG5vZGVOYW1lKSB7XG4gICAgICAgICAgLy8gbGV0cyBhbHNvIGNsZWFyIHRoZSBzZWxlY3RlZCByb3V0ZSBub2RlXG4gICAgICAgICAgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdXBkYXRlU2VsZWN0aW9uKG51bGwpO1xuICAgICAgICB0cmVlTW9kaWZpZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRvTGF5b3V0ID0gKCkgPT4ge1xuICAgICAgJHNjb3BlLmRyYXduUm91dGVJZCA9IG51bGw7XG4gICAgICBvblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCgpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBpc1JvdXRlT3JOb2RlKCkge1xuICAgICAgcmV0dXJuICEkc2NvcGUuc2VsZWN0ZWRGb2xkZXJcbiAgICB9XG5cbiAgICAkc2NvcGUuZ2V0RGVsZXRlVGl0bGUgPSAoKSA9PiB7XG4gICAgICBpZiAoaXNSb3V0ZU9yTm9kZSgpKSB7XG4gICAgICAgIHJldHVybiBcIkRlbGV0ZSB0aGlzIHJvdXRlXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gXCJEZWxldGUgdGhpcyBub2RlXCI7XG4gICAgfVxuXG4gICAgJHNjb3BlLmdldERlbGV0ZVRhcmdldCA9ICgpID0+IHtcbiAgICAgIGlmIChpc1JvdXRlT3JOb2RlKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiUm91dGVcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcIk5vZGVcIjtcbiAgICB9XG5cbiAgICAkc2NvcGUuaXNGb3JtRGlydHkgPSAoKSA9PiB7XG4gICAgICBsb2cuZGVidWcoXCJlbmRwb2ludEZvcm06IFwiLCAkc2NvcGUuZW5kcG9pbnRGb3JtKTtcbiAgICAgIGlmICgkc2NvcGUuZW5kcG9pbnRGb3JtLiRkaXJ0eSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICghJHNjb3BlLmZvcm1zWydmb3JtRWRpdG9yJ10pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICRzY29wZS5mb3Jtc1snZm9ybUVkaXRvciddWyckZGlydHknXTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyogVE9ET1xuICAgICAkc2NvcGUucmVzZXRGb3JtcyA9ICgpID0+IHtcblxuICAgICB9XG4gICAgICovXG5cbiAgICAvKlxuICAgICAqIENvbnZlcnRzIGEgcGF0aCBhbmQgYSBzZXQgb2YgZW5kcG9pbnQgcGFyYW1ldGVycyBpbnRvIGEgVVJJIHdlIGNhbiB0aGVuIHVzZSB0byBzdG9yZSBpbiB0aGUgWE1MXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRW5kcG9pbnRVUkkoZW5kcG9pbnRTY2hlbWU6c3RyaW5nLCBzbGFzaGVzVGV4dDpzdHJpbmcsIGVuZHBvaW50UGF0aDpzdHJpbmcsIGVuZHBvaW50UGFyYW1ldGVyczphbnkpIHtcbiAgICAgIGxvZy5kZWJ1ZyhcInNjaGVtZSBcIiArIGVuZHBvaW50U2NoZW1lICsgXCIgcGF0aCBcIiArIGVuZHBvaW50UGF0aCArIFwiIHBhcmFtZXRlcnMgXCIgKyBlbmRwb2ludFBhcmFtZXRlcnMpO1xuICAgICAgLy8gbm93IGxldHMgY3JlYXRlIHRoZSBuZXcgVVJJIGZyb20gdGhlIHBhdGggYW5kIHBhcmFtZXRlcnNcbiAgICAgIC8vIFRPRE8gc2hvdWxkIHdlIHVzZSBKTVggZm9yIHRoaXM/XG4gICAgICB2YXIgdXJpID0gKChlbmRwb2ludFNjaGVtZSkgPyBlbmRwb2ludFNjaGVtZSArIFwiOlwiICsgc2xhc2hlc1RleHQgOiBcIlwiKSArIChlbmRwb2ludFBhdGggPyBlbmRwb2ludFBhdGggOiBcIlwiKTtcbiAgICAgIHZhciBwYXJhbVRleHQgPSBDb3JlLmhhc2hUb1N0cmluZyhlbmRwb2ludFBhcmFtZXRlcnMpO1xuICAgICAgaWYgKHBhcmFtVGV4dCkge1xuICAgICAgICB1cmkgKz0gXCI/XCIgKyBwYXJhbVRleHQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gdXJpO1xuICAgIH1cblxuICAgICRzY29wZS51cGRhdGVQcm9wZXJ0aWVzID0gKCkgPT4ge1xuICAgICAgbG9nLmluZm8oXCJvbGQgVVJJIGlzIFwiICsgJHNjb3BlLm5vZGVEYXRhLnVyaSk7XG4gICAgICB2YXIgdXJpID0gY3JlYXRlRW5kcG9pbnRVUkkoJHNjb3BlLmVuZHBvaW50U2NoZW1lLCAoJHNjb3BlLmVuZHBvaW50UGF0aEhhc1NsYXNoZXMgPyBcIi8vXCIgOiBcIlwiKSwgJHNjb3BlLmVuZHBvaW50UGF0aCwgJHNjb3BlLmVuZHBvaW50UGFyYW1ldGVycyk7XG4gICAgICBsb2cuaW5mbyhcIm5ldyBVUkkgaXMgXCIgKyB1cmkpO1xuICAgICAgaWYgKHVyaSkge1xuICAgICAgICAkc2NvcGUubm9kZURhdGEudXJpID0gdXJpO1xuICAgICAgfVxuXG4gICAgICB2YXIga2V5ID0gbnVsbDtcbiAgICAgIHZhciBzZWxlY3RlZEZvbGRlciA9ICRzY29wZS5zZWxlY3RlZEZvbGRlcjtcbiAgICAgIGlmIChzZWxlY3RlZEZvbGRlcikge1xuICAgICAgICBrZXkgPSBzZWxlY3RlZEZvbGRlci5rZXk7XG5cbiAgICAgICAgLy8gbGV0cyBkZWxldGUgdGhlIGN1cnJlbnQgc2VsZWN0ZWQgbm9kZSdzIGRpdiBzbyBpdHMgdXBkYXRlZCB3aXRoIHRoZSBuZXcgdGVtcGxhdGUgdmFsdWVzXG4gICAgICAgIHZhciBlbGVtZW50cyA9ICRlbGVtZW50LmZpbmQoXCIuY2FudmFzXCIpLmZpbmQoXCJbaWQ9J1wiICsga2V5ICsgXCInXVwiKS5maXJzdCgpLnJlbW92ZSgpO1xuICAgICAgfVxuXG4gICAgICB0cmVlTW9kaWZpZWQoKTtcblxuICAgICAgaWYgKGtleSkge1xuICAgICAgICB1cGRhdGVTZWxlY3Rpb24oa2V5KVxuICAgICAgfVxuXG4gICAgICBpZiAoJHNjb3BlLmlzRm9ybURpcnR5KCkpIHtcbiAgICAgICAgJHNjb3BlLmVuZHBvaW50Rm9ybS4kc2V0UHJpc3RpbmUoKTtcbiAgICAgICAgaWYgKCRzY29wZS5mb3Jtc1snZm9ybUVkaXRvciddKSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1zWydmb3JtRWRpdG9yJ10uJHNldFByaXN0aW5lKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmUgPSAoKSA9PiB7XG4gICAgICAvLyBnZW5lcmF0ZSB0aGUgbmV3IFhNTFxuICAgICAgaWYgKCRzY29wZS5tb2RpZmllZCAmJiAkc2NvcGUucm9vdEZvbGRlcikge1xuICAgICAgICB2YXIgeG1sTm9kZSA9IENhbWVsLmdlbmVyYXRlWG1sRnJvbUZvbGRlcigkc2NvcGUucm9vdEZvbGRlcik7XG4gICAgICAgIGlmICh4bWxOb2RlKSB7XG4gICAgICAgICAgdmFyIHRleHQgPSBDb3JlLnhtbE5vZGVUb1N0cmluZyh4bWxOb2RlKTtcbiAgICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgdmFyIGRlY29kZWQgPSBkZWNvZGVVUklDb21wb25lbnQodGV4dCk7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJTYXZpbmcgeG1sIGRlY29kZWQ6IFwiICsgZGVjb2RlZCk7XG5cbiAgICAgICAgICAgIC8vIGxldHMgc2F2ZSB0aGUgZmlsZS4uLlxuICAgICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSAkc2NvcGUuY29tbWl0TWVzc2FnZSB8fCBcIlVwZGF0ZWQgcGFnZSBcIiArICRzY29wZS5wYWdlSWQ7XG4gICAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5wdXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsIGRlY29kZWQsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG4gICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIlNhdmVkIFwiICsgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgICAgICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuICAgICAgICAgICAgICBnb1RvVmlldygpO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICBsb2cuZGVidWcoXCJjYW5jZWxsaW5nLi4uXCIpO1xuICAgICAgLy8gVE9ETyBzaG93IGRpYWxvZyBpZiBmb2xrcyBhcmUgYWJvdXQgdG8gbG9zZSBjaGFuZ2VzLi4uXG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goXCJzZWxlY3RlZFJvdXRlSWRcIiwgb25Sb3V0ZVNlbGVjdGlvbkNoYW5nZWQpO1xuXG4gICAgZnVuY3Rpb24gZ29Ub1ZpZXcoKSB7XG4gICAgICAvLyBUT0RPIGxldHMgbmF2aWdhdGUgdG8gdGhlIHZpZXcgaWYgd2UgaGF2ZSBhIHNlcGFyYXRlIHZpZXcgb25lIGRheSA6KVxuICAgICAgLypcbiAgICAgICBpZiAoJHNjb3BlLmJyZWFkY3J1bWJzICYmICRzY29wZS5icmVhZGNydW1icy5sZW5ndGggPiAxKSB7XG4gICAgICAgdmFyIHZpZXdMaW5rID0gJHNjb3BlLmJyZWFkY3J1bWJzWyRzY29wZS5icmVhZGNydW1icy5sZW5ndGggLSAyXTtcbiAgICAgICBsb2cuZGVidWcoXCJnb1RvVmlldyBoYXMgZm91bmQgdmlldyBcIiArIHZpZXdMaW5rKTtcbiAgICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcodmlld0xpbmssIFwiI1wiKTtcbiAgICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgIGxvZy5kZWJ1ZyhcImdvVG9WaWV3IGhhcyBubyBicmVhZGNydW1icyFcIik7XG4gICAgICAgfVxuICAgICAgICovXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkTmV3Tm9kZShub2RlTW9kZWwpIHtcbiAgICAgIHZhciBkb2MgPSAkc2NvcGUuZG9jIHx8IGRvY3VtZW50O1xuICAgICAgdmFyIHBhcmVudEZvbGRlciA9ICRzY29wZS5zZWxlY3RlZEZvbGRlciB8fCAkc2NvcGUucm9vdEZvbGRlcjtcbiAgICAgIHZhciBrZXkgPSBub2RlTW9kZWxbXCJfaWRcIl07XG4gICAgICBpZiAoIWtleSkge1xuICAgICAgICBsb2cuZGVidWcoXCJXQVJOSU5HOiBubyBpZCBmb3IgbW9kZWwgXCIgKyBKU09OLnN0cmluZ2lmeShub2RlTW9kZWwpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0cmVlTm9kZSA9ICRzY29wZS5zZWxlY3RlZEZvbGRlcjtcbiAgICAgICAgaWYgKGtleSA9PT0gXCJyb3V0ZVwiKSB7XG4gICAgICAgICAgLy8gbGV0cyBhZGQgdG8gdGhlIHJvb3Qgb2YgdGhlIHRyZWVcbiAgICAgICAgICB0cmVlTm9kZSA9ICRzY29wZS5yb290Rm9sZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghdHJlZU5vZGUpIHtcbiAgICAgICAgICAgIC8vIGxldHMgc2VsZWN0IHRoZSBsYXN0IHJvdXRlIC0gYW5kIGNyZWF0ZSBhIG5ldyByb3V0ZSBpZiBuZWVkIGJlXG4gICAgICAgICAgICB2YXIgcm9vdCA9ICRzY29wZS5yb290Rm9sZGVyO1xuICAgICAgICAgICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbjtcbiAgICAgICAgICAgIGlmICghY2hpbGRyZW4gfHwgIWNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICBhZGROZXdOb2RlKENhbWVsLmdldENhbWVsU2NoZW1hKFwicm91dGVcIikpO1xuICAgICAgICAgICAgICBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHRyZWVOb2RlID0gZ2V0Um91dGVGb2xkZXIoJHNjb3BlLnJvb3RGb2xkZXIsICRzY29wZS5zZWxlY3RlZFJvdXRlSWQpIHx8IGNoaWxkcmVuW2NoaWxkcmVuLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9nLmRlYnVnKFwiQ291bGQgbm90IGFkZCBhIG5ldyByb3V0ZSB0byB0aGUgZW1wdHkgdHJlZSFcIik7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBpZiB0aGUgcGFyZW50IGZvbGRlciBsaWtlcyB0byBhY3QgYXMgYSBwaXBlbGluZSwgdGhlbiBhZGRcbiAgICAgICAgICAvLyBhZnRlciB0aGUgcGFyZW50LCByYXRoZXIgdGhhbiBhcyBhIGNoaWxkXG4gICAgICAgICAgdmFyIHBhcmVudFR5cGVOYW1lID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQodHJlZU5vZGUpO1xuICAgICAgICAgIGlmICghQ2FtZWwuYWNjZXB0T3V0cHV0KHBhcmVudFR5cGVOYW1lKSkge1xuICAgICAgICAgICAgdHJlZU5vZGUgPSB0cmVlTm9kZS5wYXJlbnQgfHwgdHJlZU5vZGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0cmVlTm9kZSkge1xuICAgICAgICAgIHZhciBub2RlID0gZG9jLmNyZWF0ZUVsZW1lbnQoa2V5KTtcbiAgICAgICAgICBwYXJlbnRGb2xkZXIgPSB0cmVlTm9kZTtcbiAgICAgICAgICB2YXIgYWRkZWROb2RlID0gQ2FtZWwuYWRkUm91dGVDaGlsZChwYXJlbnRGb2xkZXIsIG5vZGUpO1xuICAgICAgICAgIC8vIFRPRE8gYWRkIHRoZSBzY2hlbWEgaGVyZSBmb3IgYW4gZWxlbWVudD8/XG4gICAgICAgICAgLy8gb3IgZGVmYXVsdCB0aGUgZGF0YSBvciBzb21ldGhpbmdcblxuICAgICAgICAgIHZhciBub2RlRGF0YSA9IHtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGlmIChrZXkgPT09IFwiZW5kcG9pbnRcIiAmJiAkc2NvcGUuZW5kcG9pbnRDb25maWcpIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSAkc2NvcGUuZW5kcG9pbnRDb25maWcua2V5O1xuICAgICAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgICBub2RlRGF0YVtcInVyaVwiXSA9IGtleSArIFwiOlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBhZGRlZE5vZGVbXCJjYW1lbE5vZGVEYXRhXCJdID0gbm9kZURhdGE7XG4gICAgICAgICAgYWRkZWROb2RlW1wiZW5kcG9pbnRDb25maWdcIl0gPSAkc2NvcGUuZW5kcG9pbnRDb25maWc7XG5cbiAgICAgICAgICBpZiAoa2V5ID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAgIC8vIGxldHMgZ2VuZXJhdGUgYSBuZXcgcm91dGVJZCBhbmQgc3dpdGNoIHRvIGl0XG4gICAgICAgICAgICB2YXIgY291bnQgPSAkc2NvcGUucm91dGVJZHMubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIG5vZGVJZCA9IG51bGw7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICBub2RlSWQgPSBcInJvdXRlXCIgKyAoKytjb3VudCk7XG4gICAgICAgICAgICAgIGlmICghJHNjb3BlLnJvdXRlSWRzLmZpbmQobm9kZUlkKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhZGRlZE5vZGVbXCJyb3V0ZVhtbE5vZGVcIl0uc2V0QXR0cmlidXRlKFwiaWRcIiwgbm9kZUlkKTtcbiAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZFJvdXRlSWQgPSBub2RlSWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0cmVlTW9kaWZpZWQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmVlTW9kaWZpZWQocmVwb3NpdGlvbiA9IHRydWUpIHtcbiAgICAgIC8vIGxldHMgcmVjcmVhdGUgdGhlIFhNTCBtb2RlbCBmcm9tIHRoZSB1cGRhdGUgRm9sZGVyIHRyZWVcbiAgICAgIHZhciBuZXdEb2MgPSBDYW1lbC5nZW5lcmF0ZVhtbEZyb21Gb2xkZXIoJHNjb3BlLnJvb3RGb2xkZXIpO1xuICAgICAgdmFyIHRyZWUgPSBDYW1lbC5sb2FkQ2FtZWxUcmVlKG5ld0RvYywgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICBpZiAodHJlZSkge1xuICAgICAgICAkc2NvcGUucm9vdEZvbGRlciA9IHRyZWU7XG4gICAgICAgICRzY29wZS5kb2MgPSBDb3JlLnBhdGhHZXQodHJlZSwgW1wieG1sRG9jdW1lbnRcIl0pO1xuICAgICAgfVxuICAgICAgJHNjb3BlLm1vZGlmaWVkID0gdHJ1ZTtcbiAgICAgIHJlbG9hZFJvdXRlSWRzKCk7XG4gICAgICAkc2NvcGUuZG9MYXlvdXQoKTtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiByZWxvYWRSb3V0ZUlkcygpIHtcbiAgICAgICRzY29wZS5yb3V0ZUlkcyA9IFtdO1xuICAgICAgdmFyIGRvYyA9ICQoJHNjb3BlLmRvYyk7XG4gICAgICAkc2NvcGUuY2FtZWxTZWxlY3Rpb25EZXRhaWxzLnNlbGVjdGVkQ2FtZWxDb250ZXh0SWQgPSBkb2MuZmluZChcImNhbWVsQ29udGV4dFwiKS5hdHRyKFwiaWRcIik7XG4gICAgICBkb2MuZmluZChcInJvdXRlXCIpLmVhY2goKGlkeCwgcm91dGUpID0+IHtcbiAgICAgICAgdmFyIGlkID0gcm91dGUuZ2V0QXR0cmlidXRlKFwiaWRcIik7XG4gICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICRzY29wZS5yb3V0ZUlkcy5wdXNoKGlkKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Sb3V0ZVNlbGVjdGlvbkNoYW5nZWQoKSB7XG4gICAgICBpZiAoJHNjb3BlLmRvYykge1xuICAgICAgICBpZiAoISRzY29wZS5zZWxlY3RlZFJvdXRlSWQgJiYgJHNjb3BlLnJvdXRlSWRzICYmICRzY29wZS5yb3V0ZUlkcy5sZW5ndGgpIHtcbiAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkID0gJHNjb3BlLnJvdXRlSWRzWzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkICYmICRzY29wZS5zZWxlY3RlZFJvdXRlSWQgIT09ICRzY29wZS5kcmF3blJvdXRlSWQpIHtcbiAgICAgICAgICB2YXIgbm9kZXMgPSBbXTtcbiAgICAgICAgICB2YXIgbGlua3MgPSBbXTtcbiAgICAgICAgICBDYW1lbC5sb2FkUm91dGVYbWxOb2Rlcygkc2NvcGUsICRzY29wZS5kb2MsICRzY29wZS5zZWxlY3RlZFJvdXRlSWQsIG5vZGVzLCBsaW5rcywgZ2V0V2lkdGgoKSk7XG4gICAgICAgICAgdXBkYXRlU2VsZWN0aW9uKCRzY29wZS5zZWxlY3RlZFJvdXRlSWQpO1xuICAgICAgICAgIC8vIG5vdyB3ZSd2ZSBnb3QgY2lkIHZhbHVlcyBpbiB0aGUgdHJlZSBhbmQgRE9NLCBsZXRzIGNyZWF0ZSBhbiBpbmRleCBzbyB3ZSBjYW4gYmluZCB0aGUgRE9NIHRvIHRoZSB0cmVlIG1vZGVsXG4gICAgICAgICAgJHNjb3BlLmZvbGRlcnMgPSBDYW1lbC5hZGRGb2xkZXJzVG9JbmRleCgkc2NvcGUucm9vdEZvbGRlcik7XG4gICAgICAgICAgc2hvd0dyYXBoKG5vZGVzLCBsaW5rcyk7XG4gICAgICAgICAgJHNjb3BlLmRyYXduUm91dGVJZCA9ICRzY29wZS5zZWxlY3RlZFJvdXRlSWQ7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmNhbWVsU2VsZWN0aW9uRGV0YWlscy5zZWxlY3RlZFJvdXRlSWQgPSAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dHcmFwaChub2RlcywgbGlua3MpIHtcbiAgICAgIGxheW91dEdyYXBoKG5vZGVzLCBsaW5rcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Tm9kZUlkKG5vZGUpIHtcbiAgICAgIGlmIChhbmd1bGFyLmlzTnVtYmVyKG5vZGUpKSB7XG4gICAgICAgIHZhciBpZHggPSBub2RlO1xuICAgICAgICBub2RlID0gJHNjb3BlLm5vZGVTdGF0ZXNbaWR4XTtcbiAgICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiQ2FudCBmaW5kIG5vZGUgYXQgXCIgKyBpZHgpO1xuICAgICAgICAgIHJldHVybiBcIm5vZGUtXCIgKyBpZHg7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlLmNpZCB8fCBcIm5vZGUtXCIgKyBub2RlLmlkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNlbGVjdGVkT3JSb3V0ZUZvbGRlcigpIHtcbiAgICAgIHJldHVybiAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgfHwgZ2V0Um91dGVGb2xkZXIoJHNjb3BlLnJvb3RGb2xkZXIsICRzY29wZS5zZWxlY3RlZFJvdXRlSWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldENvbnRhaW5lckVsZW1lbnQoKSB7XG4gICAgICB2YXIgcm9vdEVsZW1lbnQgPSAkZWxlbWVudDtcbiAgICAgIHZhciBjb250YWluZXJFbGVtZW50ID0gcm9vdEVsZW1lbnQuZmluZChcIi5jYW52YXNcIik7XG4gICAgICBpZiAoIWNvbnRhaW5lckVsZW1lbnQgfHwgIWNvbnRhaW5lckVsZW1lbnQubGVuZ3RoKSBjb250YWluZXJFbGVtZW50ID0gcm9vdEVsZW1lbnQ7XG4gICAgICByZXR1cm4gY29udGFpbmVyRWxlbWVudDtcbiAgICB9XG5cbiAgICAvLyBjb25maWd1cmUgY2FudmFzIGxheW91dCBhbmQgc3R5bGVzXG4gICAgdmFyIGVuZHBvaW50U3R5bGU6YW55W10gPSBbXCJEb3RcIiwgeyByYWRpdXM6IDQsIGNzc0NsYXNzOiAnY2FtZWwtY2FudmFzLWVuZHBvaW50JyB9XTtcbiAgICB2YXIgaG92ZXJQYWludFN0eWxlID0geyBzdHJva2VTdHlsZTogXCJyZWRcIiwgbGluZVdpZHRoOiAzIH07XG4gICAgLy92YXIgbGFiZWxTdHlsZXM6IGFueVtdID0gWyBcIkxhYmVsXCIsIHsgbGFiZWw6XCJGT09cIiwgaWQ6XCJsYWJlbFwiIH1dO1xuICAgIHZhciBsYWJlbFN0eWxlczphbnlbXSA9IFsgXCJMYWJlbFwiIF07XG4gICAgdmFyIGFycm93U3R5bGVzOmFueVtdID0gWyBcIkFycm93XCIsIHtcbiAgICAgIGxvY2F0aW9uOiAxLFxuICAgICAgaWQ6IFwiYXJyb3dcIixcbiAgICAgIGxlbmd0aDogOCxcbiAgICAgIHdpZHRoOiA4LFxuICAgICAgZm9sZGJhY2s6IDAuOFxuICAgIH0gXTtcbiAgICB2YXIgY29ubmVjdG9yU3R5bGU6YW55W10gPSBbIFwiU3RhdGVNYWNoaW5lXCIsIHsgY3VydmluZXNzOiAxMCwgcHJveGltaXR5TGltaXQ6IDUwIH0gXTtcblxuICAgIGpzUGx1bWJJbnN0YW5jZS5pbXBvcnREZWZhdWx0cyh7XG4gICAgICBFbmRwb2ludDogZW5kcG9pbnRTdHlsZSxcbiAgICAgIEhvdmVyUGFpbnRTdHlsZTogaG92ZXJQYWludFN0eWxlLFxuICAgICAgQ29ubmVjdGlvbk92ZXJsYXlzOiBbXG4gICAgICAgIGFycm93U3R5bGVzLFxuICAgICAgICBsYWJlbFN0eWxlc1xuICAgICAgXVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCAoKSA9PiB7XG4gICAgICBqc1BsdW1iSW5zdGFuY2UucmVzZXQoKTtcbiAgICAgIGRlbGV0ZSBqc1BsdW1iSW5zdGFuY2U7XG4gICAgfSk7XG5cbiAgICAvLyBkb3VibGUgY2xpY2sgb24gYW55IGNvbm5lY3Rpb25cbiAgICBqc1BsdW1iSW5zdGFuY2UuYmluZChcImRibGNsaWNrXCIsIGZ1bmN0aW9uIChjb25uZWN0aW9uLCBvcmlnaW5hbEV2ZW50KSB7XG4gICAgICBpZiAoanNQbHVtYkluc3RhbmNlLmlzU3VzcGVuZERyYXdpbmcoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhbGVydChcImRvdWJsZSBjbGljayBvbiBjb25uZWN0aW9uIGZyb20gXCIgKyBjb25uZWN0aW9uLnNvdXJjZUlkICsgXCIgdG8gXCIgKyBjb25uZWN0aW9uLnRhcmdldElkKTtcbiAgICB9KTtcblxuICAgIGpzUGx1bWJJbnN0YW5jZS5iaW5kKCdjb25uZWN0aW9uJywgZnVuY3Rpb24gKGluZm8sIGV2dCkge1xuICAgICAgLy9sb2cuZGVidWcoXCJDb25uZWN0aW9uIGV2ZW50OiBcIiwgaW5mbyk7XG4gICAgICBsb2cuZGVidWcoXCJDcmVhdGluZyBjb25uZWN0aW9uIGZyb20gXCIsIGluZm8uc291cmNlSWQsIFwiIHRvIFwiLCBpbmZvLnRhcmdldElkKTtcbiAgICAgIHZhciBsaW5rID0gZ2V0TGluayhpbmZvKTtcbiAgICAgIHZhciBzb3VyY2UgPSAkc2NvcGUubm9kZXNbbGluay5zb3VyY2VdO1xuICAgICAgdmFyIHNvdXJjZUZvbGRlciA9ICRzY29wZS5mb2xkZXJzW2xpbmsuc291cmNlXTtcbiAgICAgIHZhciB0YXJnZXRGb2xkZXIgPSAkc2NvcGUuZm9sZGVyc1tsaW5rLnRhcmdldF07XG4gICAgICBpZiAoQ2FtZWwuaXNOZXh0U2libGluZ0FkZGVkQXNDaGlsZChzb3VyY2UudHlwZSkpIHtcbiAgICAgICAgc291cmNlRm9sZGVyLm1vdmVDaGlsZCh0YXJnZXRGb2xkZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc291cmNlRm9sZGVyLnBhcmVudC5pbnNlcnRBZnRlcih0YXJnZXRGb2xkZXIsIHNvdXJjZUZvbGRlcik7XG4gICAgICB9XG4gICAgICB0cmVlTW9kaWZpZWQoKTtcbiAgICB9KTtcblxuICAgIC8vIGxldHMgZGVsZXRlIGNvbm5lY3Rpb25zIG9uIGNsaWNrXG4gICAganNQbHVtYkluc3RhbmNlLmJpbmQoXCJjbGlja1wiLCBmdW5jdGlvbiAoYykge1xuICAgICAgaWYgKGpzUGx1bWJJbnN0YW5jZS5pc1N1c3BlbmREcmF3aW5nKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAganNQbHVtYkluc3RhbmNlLmRldGFjaChjKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGxheW91dEdyYXBoKG5vZGVzLCBsaW5rcykge1xuICAgICAgdmFyIHRyYW5zaXRpb25zID0gW107XG4gICAgICB2YXIgc3RhdGVzID0gQ29yZS5jcmVhdGVHcmFwaFN0YXRlcyhub2RlcywgbGlua3MsIHRyYW5zaXRpb25zKTtcblxuICAgICAgbG9nLmRlYnVnKFwibGlua3M6IFwiLCBsaW5rcyk7XG4gICAgICBsb2cuZGVidWcoXCJ0cmFuc2l0aW9uczogXCIsIHRyYW5zaXRpb25zKTtcblxuICAgICAgJHNjb3BlLm5vZGVTdGF0ZXMgPSBzdGF0ZXM7XG4gICAgICB2YXIgY29udGFpbmVyRWxlbWVudCA9IGdldENvbnRhaW5lckVsZW1lbnQoKTtcblxuICAgICAganNQbHVtYkluc3RhbmNlLmRvV2hpbGVTdXNwZW5kZWQoKCkgPT4ge1xuXG4gICAgICAgIC8vc2V0IG91ciBjb250YWluZXIgdG8gc29tZSBhcmJpdHJhcnkgaW5pdGlhbCBzaXplXG4gICAgICAgIGNvbnRhaW5lckVsZW1lbnQuY3NzKHtcbiAgICAgICAgICAnd2lkdGgnOiAnODAwcHgnLFxuICAgICAgICAgICdoZWlnaHQnOiAnODAwcHgnLFxuICAgICAgICAgICdtaW4taGVpZ2h0JzogJzgwMHB4JyxcbiAgICAgICAgICAnbWluLXdpZHRoJzogJzgwMHB4J1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGNvbnRhaW5lckhlaWdodCA9IDA7XG4gICAgICAgIHZhciBjb250YWluZXJXaWR0aCA9IDA7XG5cbiAgICAgICAgY29udGFpbmVyRWxlbWVudC5maW5kKCdkaXYuY29tcG9uZW50JykuZWFjaCgoaSwgZWwpID0+IHtcbiAgICAgICAgICBsb2cuZGVidWcoXCJDaGVja2luZzogXCIsIGVsLCBcIiBcIiwgaSk7XG4gICAgICAgICAgaWYgKCFzdGF0ZXMuYW55KChub2RlKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsLmlkID09PSBnZXROb2RlSWQobm9kZSk7XG4gICAgICAgICAgICAgIH0pKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJSZW1vdmluZyBlbGVtZW50OiBcIiwgZWwuaWQpO1xuICAgICAgICAgICAganNQbHVtYkluc3RhbmNlLnJlbW92ZShlbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBhbmd1bGFyLmZvckVhY2goc3RhdGVzLCAobm9kZSkgPT4ge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIm5vZGU6IFwiLCBub2RlKTtcbiAgICAgICAgICB2YXIgaWQgPSBnZXROb2RlSWQobm9kZSk7XG4gICAgICAgICAgdmFyIGRpdiA9IGNvbnRhaW5lckVsZW1lbnQuZmluZCgnIycgKyBpZCk7XG5cbiAgICAgICAgICBpZiAoIWRpdlswXSkge1xuICAgICAgICAgICAgZGl2ID0gJCgkc2NvcGUubm9kZVRlbXBsYXRlKHtcbiAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICBub2RlOiBub2RlXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBkaXYuYXBwZW5kVG8oY29udGFpbmVyRWxlbWVudCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gTWFrZSB0aGUgbm9kZSBhIGpzcGx1bWIgc291cmNlXG4gICAgICAgICAganNQbHVtYkluc3RhbmNlLm1ha2VTb3VyY2UoZGl2LCB7XG4gICAgICAgICAgICBmaWx0ZXI6IFwiaW1nLm5vZGVJY29uXCIsXG4gICAgICAgICAgICBhbmNob3I6IFwiQ29udGludW91c1wiLFxuICAgICAgICAgICAgY29ubmVjdG9yOiBjb25uZWN0b3JTdHlsZSxcbiAgICAgICAgICAgIGNvbm5lY3RvclN0eWxlOiB7IHN0cm9rZVN0eWxlOiBcIiM2NjZcIiwgbGluZVdpZHRoOiAzIH0sXG4gICAgICAgICAgICBtYXhDb25uZWN0aW9uczogLTFcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIGFuZCBhbHNvIGEganNwbHVtYiB0YXJnZXRcbiAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UubWFrZVRhcmdldChkaXYsIHtcbiAgICAgICAgICAgIGRyb3BPcHRpb25zOiB7IGhvdmVyQ2xhc3M6IFwiZHJhZ0hvdmVyXCIgfSxcbiAgICAgICAgICAgIGFuY2hvcjogXCJDb250aW51b3VzXCJcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5kcmFnZ2FibGUoZGl2LCB7XG4gICAgICAgICAgICBjb250YWlubWVudDogJy5jYW1lbC1jYW52YXMnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBhZGQgZXZlbnQgaGFuZGxlcnMgdG8gdGhpcyBub2RlXG4gICAgICAgICAgZGl2LmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBuZXdGbGFnID0gIWRpdi5oYXNDbGFzcyhcInNlbGVjdGVkXCIpO1xuICAgICAgICAgICAgY29udGFpbmVyRWxlbWVudC5maW5kKCdkaXYuY29tcG9uZW50JykudG9nZ2xlQ2xhc3MoXCJzZWxlY3RlZFwiLCBmYWxzZSk7XG4gICAgICAgICAgICBkaXYudG9nZ2xlQ2xhc3MoXCJzZWxlY3RlZFwiLCBuZXdGbGFnKTtcbiAgICAgICAgICAgIHZhciBpZCA9IGRpdi5hdHRyKFwiaWRcIik7XG4gICAgICAgICAgICB1cGRhdGVTZWxlY3Rpb24obmV3RmxhZyA/IGlkIDogbnVsbCk7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgZGl2LmRibGNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBpZCA9IGRpdi5hdHRyKFwiaWRcIik7XG4gICAgICAgICAgICB1cGRhdGVTZWxlY3Rpb24oaWQpO1xuICAgICAgICAgICAgLy8kc2NvcGUucHJvcGVydGllc0RpYWxvZy5vcGVuKCk7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdmFyIGhlaWdodCA9IGRpdi5oZWlnaHQoKTtcbiAgICAgICAgICB2YXIgd2lkdGggPSBkaXYud2lkdGgoKTtcbiAgICAgICAgICBpZiAoaGVpZ2h0IHx8IHdpZHRoKSB7XG4gICAgICAgICAgICBub2RlLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICBub2RlLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgICAgIGRpdi5jc3Moe1xuICAgICAgICAgICAgICAnbWluLXdpZHRoJzogd2lkdGgsXG4gICAgICAgICAgICAgICdtaW4taGVpZ2h0JzogaGVpZ2h0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBlZGdlU2VwID0gMTA7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBsYXlvdXQgYW5kIGdldCB0aGUgYnVpbGRHcmFwaFxuICAgICAgICBkYWdyZS5sYXlvdXQoKVxuICAgICAgICAgICAgLm5vZGVTZXAoMTAwKVxuICAgICAgICAgICAgLmVkZ2VTZXAoZWRnZVNlcClcbiAgICAgICAgICAgIC5yYW5rU2VwKDc1KVxuICAgICAgICAgICAgLm5vZGVzKHN0YXRlcylcbiAgICAgICAgICAgIC5lZGdlcyh0cmFuc2l0aW9ucylcbiAgICAgICAgICAgIC5kZWJ1Z0xldmVsKDEpXG4gICAgICAgICAgICAucnVuKCk7XG5cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHN0YXRlcywgKG5vZGUpID0+IHtcblxuICAgICAgICAgIC8vIHBvc2l0aW9uIHRoZSBub2RlIGluIHRoZSBncmFwaFxuICAgICAgICAgIHZhciBpZCA9IGdldE5vZGVJZChub2RlKTtcbiAgICAgICAgICB2YXIgZGl2ID0gJChcIiNcIiArIGlkKTtcbiAgICAgICAgICB2YXIgZGl2SGVpZ2h0ID0gZGl2LmhlaWdodCgpO1xuICAgICAgICAgIHZhciBkaXZXaWR0aCA9IGRpdi53aWR0aCgpO1xuICAgICAgICAgIHZhciBsZWZ0T2Zmc2V0ID0gbm9kZS5kYWdyZS54ICsgZGl2V2lkdGg7XG4gICAgICAgICAgdmFyIGJvdHRvbU9mZnNldCA9IG5vZGUuZGFncmUueSArIGRpdkhlaWdodDtcbiAgICAgICAgICBpZiAoY29udGFpbmVySGVpZ2h0IDwgYm90dG9tT2Zmc2V0KSB7XG4gICAgICAgICAgICBjb250YWluZXJIZWlnaHQgPSBib3R0b21PZmZzZXQgKyBlZGdlU2VwICogMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNvbnRhaW5lcldpZHRoIDwgbGVmdE9mZnNldCkge1xuICAgICAgICAgICAgY29udGFpbmVyV2lkdGggPSBsZWZ0T2Zmc2V0ICsgZWRnZVNlcCAqIDI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRpdi5jc3Moe3RvcDogbm9kZS5kYWdyZS55LCBsZWZ0OiBub2RlLmRhZ3JlLnh9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc2l6ZSB0aGUgY29udGFpbmVyIHRvIGZpdCB0aGUgZ3JhcGhcbiAgICAgICAgY29udGFpbmVyRWxlbWVudC5jc3Moe1xuICAgICAgICAgICd3aWR0aCc6IGNvbnRhaW5lcldpZHRoLFxuICAgICAgICAgICdoZWlnaHQnOiBjb250YWluZXJIZWlnaHQsXG4gICAgICAgICAgJ21pbi1oZWlnaHQnOiBjb250YWluZXJIZWlnaHQsXG4gICAgICAgICAgJ21pbi13aWR0aCc6IGNvbnRhaW5lcldpZHRoXG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgY29udGFpbmVyRWxlbWVudC5kYmxjbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJHNjb3BlLnByb3BlcnRpZXNEaWFsb2cub3BlbigpO1xuICAgICAgICB9KTtcblxuICAgICAgICBqc1BsdW1iSW5zdGFuY2Uuc2V0U3VzcGVuZEV2ZW50cyh0cnVlKTtcbiAgICAgICAgLy8gRGV0YWNoIGFsbCB0aGUgY3VycmVudCBjb25uZWN0aW9ucyBhbmQgcmVjb25uZWN0IGV2ZXJ5dGhpbmcgYmFzZWQgb24gdGhlIHVwZGF0ZWQgZ3JhcGhcbiAgICAgICAganNQbHVtYkluc3RhbmNlLmRldGFjaEV2ZXJ5Q29ubmVjdGlvbih7ZmlyZUV2ZW50OiBmYWxzZX0pO1xuXG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChsaW5rcywgKGxpbmspID0+IHtcbiAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UuY29ubmVjdCh7XG4gICAgICAgICAgICBzb3VyY2U6IGdldE5vZGVJZChsaW5rLnNvdXJjZSksXG4gICAgICAgICAgICB0YXJnZXQ6IGdldE5vZGVJZChsaW5rLnRhcmdldClcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGpzUGx1bWJJbnN0YW5jZS5zZXRTdXNwZW5kRXZlbnRzKGZhbHNlKTtcblxuICAgICAgfSk7XG5cblxuICAgICAgcmV0dXJuIHN0YXRlcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRMaW5rKGluZm8pIHtcbiAgICAgIHZhciBzb3VyY2VJZCA9IGluZm8uc291cmNlSWQ7XG4gICAgICB2YXIgdGFyZ2V0SWQgPSBpbmZvLnRhcmdldElkO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlOiBzb3VyY2VJZCxcbiAgICAgICAgdGFyZ2V0OiB0YXJnZXRJZFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5vZGVCeUNJRChub2RlcywgY2lkKSB7XG4gICAgICByZXR1cm4gbm9kZXMuZmluZCgobm9kZSkgPT4ge1xuICAgICAgICByZXR1cm4gbm9kZS5jaWQgPT09IGNpZDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qXG4gICAgICogVXBkYXRlcyB0aGUgc2VsZWN0aW9uIHdpdGggdGhlIGdpdmVuIGZvbGRlciBvciBJRFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVwZGF0ZVNlbGVjdGlvbihmb2xkZXJPcklkKSB7XG4gICAgICB2YXIgZm9sZGVyID0gbnVsbDtcbiAgICAgIGlmIChhbmd1bGFyLmlzU3RyaW5nKGZvbGRlck9ySWQpKSB7XG4gICAgICAgIHZhciBpZCA9IGZvbGRlck9ySWQ7XG4gICAgICAgIGZvbGRlciA9IChpZCAmJiAkc2NvcGUuZm9sZGVycykgPyAkc2NvcGUuZm9sZGVyc1tpZF0gOiBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9sZGVyID0gZm9sZGVyT3JJZDtcbiAgICAgIH1cbiAgICAgICRzY29wZS5zZWxlY3RlZEZvbGRlciA9IGZvbGRlcjtcbiAgICAgIGZvbGRlciA9IGdldFNlbGVjdGVkT3JSb3V0ZUZvbGRlcigpO1xuICAgICAgJHNjb3BlLm5vZGVYbWxOb2RlID0gbnVsbDtcbiAgICAgICRzY29wZS5wcm9wZXJ0aWVzVGVtcGxhdGUgPSBudWxsO1xuICAgICAgaWYgKGZvbGRlcikge1xuICAgICAgICB2YXIgbm9kZU5hbWUgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChmb2xkZXIpO1xuICAgICAgICAkc2NvcGUubm9kZURhdGEgPSBDYW1lbC5nZXRSb3V0ZUZvbGRlckpTT04oZm9sZGVyKTtcbiAgICAgICAgJHNjb3BlLm5vZGVEYXRhQ2hhbmdlZEZpZWxkcyA9IHt9O1xuICAgICAgICAkc2NvcGUubm9kZU1vZGVsID0gQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEobm9kZU5hbWUpO1xuICAgICAgICBpZiAoJHNjb3BlLm5vZGVNb2RlbCkge1xuICAgICAgICAgICRzY29wZS5wcm9wZXJ0aWVzVGVtcGxhdGUgPSBcInBsdWdpbnMvd2lraS9odG1sL2NhbWVsUHJvcGVydGllc0VkaXQuaHRtbFwiO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS5zZWxlY3RlZEVuZHBvaW50ID0gbnVsbDtcbiAgICAgICAgaWYgKFwiZW5kcG9pbnRcIiA9PT0gbm9kZU5hbWUpIHtcbiAgICAgICAgICB2YXIgdXJpID0gJHNjb3BlLm5vZGVEYXRhW1widXJpXCJdO1xuICAgICAgICAgIGlmICh1cmkpIHtcbiAgICAgICAgICAgIC8vIGxldHMgZGVjb21wb3NlIHRoZSBVUkkgaW50byBzY2hlbWUsIHBhdGggYW5kIHBhcmFtZXRlcnNcbiAgICAgICAgICAgIHZhciBpZHggPSB1cmkuaW5kZXhPZihcIjpcIik7XG4gICAgICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgICAgICB2YXIgZW5kcG9pbnRTY2hlbWUgPSB1cmkuc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgICAgICAgIHZhciBlbmRwb2ludFBhdGggPSB1cmkuc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgICAgICAgICAvLyBmb3IgZW1wdHkgcGF0aHMgbGV0cyBhc3N1bWUgd2UgbmVlZCAvLyBvbiBhIFVSSVxuICAgICAgICAgICAgICAkc2NvcGUuZW5kcG9pbnRQYXRoSGFzU2xhc2hlcyA9IGVuZHBvaW50UGF0aCA/IGZhbHNlIDogdHJ1ZTtcbiAgICAgICAgICAgICAgaWYgKGVuZHBvaW50UGF0aC5zdGFydHNXaXRoKFwiLy9cIikpIHtcbiAgICAgICAgICAgICAgICBlbmRwb2ludFBhdGggPSBlbmRwb2ludFBhdGguc3Vic3RyaW5nKDIpO1xuICAgICAgICAgICAgICAgICRzY29wZS5lbmRwb2ludFBhdGhIYXNTbGFzaGVzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZHggPSBlbmRwb2ludFBhdGguaW5kZXhPZihcIj9cIik7XG4gICAgICAgICAgICAgIHZhciBlbmRwb2ludFBhcmFtZXRlcnMgPSB7fTtcbiAgICAgICAgICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1ldGVycyA9IGVuZHBvaW50UGF0aC5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICAgICAgICAgICAgZW5kcG9pbnRQYXRoID0gZW5kcG9pbnRQYXRoLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgICAgICAgICAgIGVuZHBvaW50UGFyYW1ldGVycyA9IENvcmUuc3RyaW5nVG9IYXNoKHBhcmFtZXRlcnMpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50U2NoZW1lID0gZW5kcG9pbnRTY2hlbWU7XG4gICAgICAgICAgICAgICRzY29wZS5lbmRwb2ludFBhdGggPSBlbmRwb2ludFBhdGg7XG4gICAgICAgICAgICAgICRzY29wZS5lbmRwb2ludFBhcmFtZXRlcnMgPSBlbmRwb2ludFBhcmFtZXRlcnM7XG5cbiAgICAgICAgICAgICAgbG9nLmRlYnVnKFwiZW5kcG9pbnQgXCIgKyBlbmRwb2ludFNjaGVtZSArIFwiIHBhdGggXCIgKyBlbmRwb2ludFBhdGggKyBcIiBhbmQgcGFyYW1ldGVycyBcIiArIEpTT04uc3RyaW5naWZ5KGVuZHBvaW50UGFyYW1ldGVycykpO1xuICAgICAgICAgICAgICAkc2NvcGUubG9hZEVuZHBvaW50U2NoZW1hKGVuZHBvaW50U2NoZW1lKTtcbiAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkRW5kcG9pbnQgPSB7XG4gICAgICAgICAgICAgICAgZW5kcG9pbnRTY2hlbWU6IGVuZHBvaW50U2NoZW1lLFxuICAgICAgICAgICAgICAgIGVuZHBvaW50UGF0aDogZW5kcG9pbnRQYXRoLFxuICAgICAgICAgICAgICAgIHBhcmFtZXRlcnM6IGVuZHBvaW50UGFyYW1ldGVyc1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFdpZHRoKCkge1xuICAgICAgdmFyIGNhbnZhc0RpdiA9ICQoJGVsZW1lbnQpO1xuICAgICAgcmV0dXJuIGNhbnZhc0Rpdi53aWR0aCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEZvbGRlcklkQXR0cmlidXRlKHJvdXRlKSB7XG4gICAgICB2YXIgaWQgPSBudWxsO1xuICAgICAgaWYgKHJvdXRlKSB7XG4gICAgICAgIHZhciB4bWxOb2RlID0gcm91dGVbXCJyb3V0ZVhtbE5vZGVcIl07XG4gICAgICAgIGlmICh4bWxOb2RlKSB7XG4gICAgICAgICAgaWQgPSB4bWxOb2RlLmdldEF0dHJpYnV0ZShcImlkXCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Um91dGVGb2xkZXIodHJlZSwgcm91dGVJZCkge1xuICAgICAgdmFyIGFuc3dlciA9IG51bGw7XG4gICAgICBpZiAodHJlZSkge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2godHJlZS5jaGlsZHJlbiwgKHJvdXRlKSA9PiB7XG4gICAgICAgICAgaWYgKCFhbnN3ZXIpIHtcbiAgICAgICAgICAgIHZhciBpZCA9IGdldEZvbGRlcklkQXR0cmlidXRlKHJvdXRlKTtcbiAgICAgICAgICAgIGlmIChyb3V0ZUlkID09PSBpZCkge1xuICAgICAgICAgICAgICBhbnN3ZXIgPSByb3V0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICB9XG5cbiAgICAkc2NvcGUuZG9Td2l0Y2hUb1RyZWVWaWV3ID0gKCkgPT4ge1xuICAgICAgJGxvY2F0aW9uLnVybChDb3JlLnRyaW1MZWFkaW5nKCgkc2NvcGUuc3RhcnRMaW5rICsgXCIvY2FtZWwvcHJvcGVydGllcy9cIiArICRzY29wZS5wYWdlSWQpLCAnIycpKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNvbmZpcm1Td2l0Y2hUb1RyZWVWaWV3ID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5tb2RpZmllZCkge1xuICAgICAgICAkc2NvcGUuc3dpdGNoVG9UcmVlVmlldy5vcGVuKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuZG9Td2l0Y2hUb1RyZWVWaWV3KCk7XG4gICAgICB9XG4gICAgfTtcblxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuQ29tbWl0Q29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsICR0ZW1wbGF0ZUNhY2hlLCBtYXJrZWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpID0+IHtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuICAgIHZhciBqb2xva2lhID0gbnVsbDtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5jb21taXRJZCA9ICRzY29wZS5vYmplY3RJZDtcblxuICAgIC8vIFRPRE8gd2UgY291bGQgY29uZmlndXJlIHRoaXM/XG4gICAgJHNjb3BlLmRhdGVGb3JtYXQgPSAnRUVFLCBNTU0gZCwgeSA6IGhoOm1tOnNzIGEnO1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgZGF0YTogJ2NvbW1pdHMnLFxuICAgICAgc2hvd0ZpbHRlcjogZmFsc2UsXG4gICAgICBtdWx0aVNlbGVjdDogZmFsc2UsXG4gICAgICBzZWxlY3RXaXRoQ2hlY2tib3hPbmx5OiB0cnVlLFxuICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgZGlzcGxheVNlbGVjdGlvbkNoZWNrYm94IDogdHJ1ZSwgLy8gb2xkIHByZSAyLjAgY29uZmlnIVxuICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgIGZpbHRlclRleHQ6ICcnXG4gICAgICB9LFxuICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdwYXRoJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ0ZpbGUgTmFtZScsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ2ZpbGVDZWxsVGVtcGxhdGUuaHRtbCcpLFxuICAgICAgICAgIHdpZHRoOiBcIioqKlwiLFxuICAgICAgICAgIGNlbGxGaWx0ZXI6IFwiXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnJGRpZmZMaW5rJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ09wdGlvbnMnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KCd2aWV3RGlmZlRlbXBsYXRlLmh0bWwnKVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgICRzY29wZS4kd2F0Y2goJ3dvcmtzcGFjZS50cmVlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEkc2NvcGUuZ2l0KSB7XG4gICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJSZWxvYWRpbmcgdGhlIHZpZXcgYXMgd2Ugbm93IHNlZW0gdG8gaGF2ZSBhIGdpdCBtYmVhbiFcIik7XG4gICAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUuY2FuUmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgcmV0dXJuICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCA9PT0gMTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJldmVydCA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBwYXRoID0gY29tbWl0UGF0aChzZWxlY3RlZEl0ZW1zWzBdKTtcbiAgICAgICAgdmFyIG9iamVjdElkID0gJHNjb3BlLmNvbW1pdElkO1xuICAgICAgICBpZiAocGF0aCAmJiBvYmplY3RJZCkge1xuICAgICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gXCJSZXZlcnRpbmcgZmlsZSBcIiArICRzY29wZS5wYWdlSWQgKyBcIiB0byBwcmV2aW91cyB2ZXJzaW9uIFwiICsgb2JqZWN0SWQ7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8oJHNjb3BlLmJyYW5jaCwgb2JqZWN0SWQsICRzY29wZS5wYWdlSWQsIGNvbW1pdE1lc3NhZ2UsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShyZXN1bHQpO1xuICAgICAgICAgICAgLy8gbm93IGxldHMgdXBkYXRlIHRoZSB2aWV3XG4gICAgICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY29tbWl0UGF0aChjb21taXQpIHtcbiAgICAgIHJldHVybiBjb21taXQucGF0aCB8fCBjb21taXQubmFtZTtcbiAgICB9XG5cbiAgICAkc2NvcGUuZGlmZiA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBjb21taXQgPSBzZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICAvKlxuICAgICAgICAgdmFyIGNvbW1pdCA9IHJvdztcbiAgICAgICAgIHZhciBlbnRpdHkgPSByb3cuZW50aXR5O1xuICAgICAgICAgaWYgKGVudGl0eSkge1xuICAgICAgICAgY29tbWl0ID0gZW50aXR5O1xuICAgICAgICAgfVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIG90aGVyQ29tbWl0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG4gICAgICAgIHZhciBsaW5rID0gVXJsSGVscGVycy5qb2luKHN0YXJ0TGluaygkc2NvcGUpLCAgXCIvZGlmZi9cIiArICRzY29wZS5jb21taXRJZCArIFwiL1wiICsgb3RoZXJDb21taXRJZCArIFwiL1wiICsgY29tbWl0UGF0aChjb21taXQpKTtcbiAgICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiI1wiKTtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgocGF0aCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICB2YXIgY29tbWl0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG5cbiAgICAgIFdpa2kubG9hZEJyYW5jaGVzKGpvbG9raWEsIHdpa2lSZXBvc2l0b3J5LCAkc2NvcGUsIGlzRm1jKTtcblxuICAgICAgd2lraVJlcG9zaXRvcnkuY29tbWl0SW5mbyhjb21taXRJZCwgKGNvbW1pdEluZm8pID0+IHtcbiAgICAgICAgJHNjb3BlLmNvbW1pdEluZm8gPSBjb21taXRJbmZvO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG5cbiAgICAgIHdpa2lSZXBvc2l0b3J5LmNvbW1pdFRyZWUoY29tbWl0SWQsIChjb21taXRzKSA9PiB7XG4gICAgICAgICRzY29wZS5jb21taXRzID0gY29tbWl0cztcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbW1pdHMsIChjb21taXQpID0+IHtcbiAgICAgICAgICBjb21taXQuZmlsZUljb25IdG1sID0gV2lraS5maWxlSWNvbkh0bWwoY29tbWl0KTtcbiAgICAgICAgICBjb21taXQuZmlsZUNsYXNzID0gY29tbWl0Lm5hbWUuZW5kc1dpdGgoXCIucHJvZmlsZVwiKSA/IFwiZ3JlZW5cIiA6IFwiXCI7XG4gICAgICAgICAgdmFyIGNoYW5nZVR5cGUgPSBjb21taXQuY2hhbmdlVHlwZTtcbiAgICAgICAgICB2YXIgcGF0aCA9IGNvbW1pdFBhdGgoY29tbWl0KTtcbiAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgY29tbWl0LmZpbGVMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyAnL3ZlcnNpb24vJyArIHBhdGggKyAnLycgKyBjb21taXRJZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29tbWl0LiRkaWZmTGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvZGlmZi9cIiArIGNvbW1pdElkICsgXCIvXCIgKyBjb21taXRJZCArIFwiL1wiICsgKHBhdGggfHwgXCJcIik7XG4gICAgICAgICAgaWYgKGNoYW5nZVR5cGUpIHtcbiAgICAgICAgICAgIGNoYW5nZVR5cGUgPSBjaGFuZ2VUeXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBpZiAoY2hhbmdlVHlwZS5zdGFydHNXaXRoKFwiYVwiKSkge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1hZGRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwiYWRkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwiYWRkZWRcIjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhbmdlVHlwZS5zdGFydHNXaXRoKFwiZFwiKSkge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1kZWxldGVcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwiZGVsZXRlXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwiZGVsZXRlZFwiO1xuICAgICAgICAgICAgICBjb21taXQuZmlsZUxpbmsgPSBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtbW9kaWZ5XCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcIm1vZGlmeVwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcIm1vZGlmaWVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21taXQuY2hhbmdlVHlwZUh0bWwgPSAnPHNwYW4gY2xhc3M9XCInICsgY29tbWl0LmNoYW5nZUNsYXNzICsgJ1wiPicgKyBjb21taXQudGl0bGUgKyAnPC9zcGFuPic7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkNvbW1pdERldGFpbENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCJtYXJrZWRcIiwgXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgbWFya2VkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcbiAgICB2YXIgam9sb2tpYSA9IG51bGw7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuY29tbWl0SWQgPSAkc2NvcGUub2JqZWN0SWQ7XG5cbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgbW9kZToge1xuICAgICAgICBuYW1lOiAnZGlmZidcbiAgICAgIH1cbiAgICB9O1xuICAgICRzY29wZS5jb2RlTWlycm9yT3B0aW9ucyA9IENvZGVFZGl0b3IuY3JlYXRlRWRpdG9yU2V0dGluZ3Mob3B0aW9ucyk7XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCd3b3Jrc3BhY2UudHJlZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghJHNjb3BlLmdpdCkge1xuICAgICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiUmVsb2FkaW5nIHRoZSB2aWV3IGFzIHdlIG5vdyBzZWVtIHRvIGhhdmUgYSBnaXQgbWJlYW4hXCIpO1xuICAgICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgJHNjb3BlLmNhblJldmVydCA9ICgpID0+IHtcbiAgICAgIHJldHVybiAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGggPT09IDE7XG4gICAgfTtcblxuICAgICRzY29wZS5yZXZlcnQgPSAoKSA9PiB7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgcGF0aCA9IGNvbW1pdFBhdGgoc2VsZWN0ZWRJdGVtc1swXSk7XG4gICAgICAgIHZhciBvYmplY3RJZCA9ICRzY29wZS5jb21taXRJZDtcbiAgICAgICAgaWYgKHBhdGggJiYgb2JqZWN0SWQpIHtcbiAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9IFwiUmV2ZXJ0aW5nIGZpbGUgXCIgKyAkc2NvcGUucGFnZUlkICsgXCIgdG8gcHJldmlvdXMgdmVyc2lvbiBcIiArIG9iamVjdElkO1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnJldmVydFRvKCRzY29wZS5icmFuY2gsIG9iamVjdElkLCAkc2NvcGUucGFnZUlkLCBjb21taXRNZXNzYWdlLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUocmVzdWx0KTtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHVwZGF0ZSB0aGUgdmlld1xuICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNvbW1pdFBhdGgoY29tbWl0KSB7XG4gICAgICByZXR1cm4gY29tbWl0LnBhdGggfHwgY29tbWl0Lm5hbWU7XG4gICAgfVxuXG4gICAgJHNjb3BlLmRpZmYgPSAoKSA9PiB7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgY29tbWl0ID0gc2VsZWN0ZWRJdGVtc1swXTtcbiAgICAgICAgLypcbiAgICAgICAgIHZhciBjb21taXQgPSByb3c7XG4gICAgICAgICB2YXIgZW50aXR5ID0gcm93LmVudGl0eTtcbiAgICAgICAgIGlmIChlbnRpdHkpIHtcbiAgICAgICAgIGNvbW1pdCA9IGVudGl0eTtcbiAgICAgICAgIH1cbiAgICAgICAgICovXG4gICAgICAgIHZhciBvdGhlckNvbW1pdElkID0gJHNjb3BlLmNvbW1pdElkO1xuICAgICAgICB2YXIgbGluayA9IFVybEhlbHBlcnMuam9pbihzdGFydExpbmsoJHNjb3BlKSwgIFwiL2RpZmYvXCIgKyAkc2NvcGUuY29tbWl0SWQgKyBcIi9cIiArIG90aGVyQ29tbWl0SWQgKyBcIi9cIiArIGNvbW1pdFBhdGgoY29tbWl0KSk7XG4gICAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIiNcIik7XG4gICAgICAgICRsb2NhdGlvbi5wYXRoKHBhdGgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgdmFyIGNvbW1pdElkID0gJHNjb3BlLmNvbW1pdElkO1xuXG4gICAgICBXaWtpLmxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyk7XG5cbiAgICAgIHdpa2lSZXBvc2l0b3J5LmNvbW1pdERldGFpbChjb21taXRJZCwgKGNvbW1pdERldGFpbCkgPT4ge1xuICAgICAgICBpZiAoY29tbWl0RGV0YWlsKSB7XG4gICAgICAgICAgJHNjb3BlLmNvbW1pdERldGFpbCA9IGNvbW1pdERldGFpbDtcbiAgICAgICAgICB2YXIgY29tbWl0ID0gY29tbWl0RGV0YWlsLmNvbW1pdF9pbmZvO1xuICAgICAgICAgICRzY29wZS5jb21taXQgPSBjb21taXQ7XG4gICAgICAgICAgaWYgKGNvbW1pdCkge1xuICAgICAgICAgICAgY29tbWl0LiRkYXRlID0gRGV2ZWxvcGVyLmFzRGF0ZShjb21taXQuZGF0ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb21taXREZXRhaWwuZGlmZnMsIChkaWZmKSA9PiB7XG4gICAgICAgICAgICAvLyBhZGQgbGluayB0byB2aWV3IGZpbGUgbGlua1xuICAgICAgICAgICAgdmFyIHBhdGggPSBkaWZmLm5ld19wYXRoO1xuICAgICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgICAgZGlmZi4kdmlld0xpbmsgPSBVcmxIZWxwZXJzLmpvaW4oV2lraS5zdGFydFdpa2lMaW5rKCRzY29wZS5wcm9qZWN0SWQsIGNvbW1pdElkKSwgXCJ2aWV3XCIsIHBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcbiAgICB9XG5cbi8qXG4gICAgICB3aWtpUmVwb3NpdG9yeS5jb21taXRUcmVlKGNvbW1pdElkLCAoY29tbWl0cykgPT4ge1xuICAgICAgICAkc2NvcGUuY29tbWl0cyA9IGNvbW1pdHM7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb21taXRzLCAoY29tbWl0KSA9PiB7XG4gICAgICAgICAgY29tbWl0LmZpbGVJY29uSHRtbCA9IFdpa2kuZmlsZUljb25IdG1sKGNvbW1pdCk7XG4gICAgICAgICAgY29tbWl0LmZpbGVDbGFzcyA9IGNvbW1pdC5uYW1lLmVuZHNXaXRoKFwiLnByb2ZpbGVcIikgPyBcImdyZWVuXCIgOiBcIlwiO1xuICAgICAgICAgIHZhciBjaGFuZ2VUeXBlID0gY29tbWl0LmNoYW5nZVR5cGU7XG4gICAgICAgICAgdmFyIHBhdGggPSBjb21taXRQYXRoKGNvbW1pdCk7XG4gICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgIGNvbW1pdC5maWxlTGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgJy92ZXJzaW9uLycgKyBwYXRoICsgJy8nICsgY29tbWl0SWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbW1pdC4kZGlmZkxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArIFwiL2RpZmYvXCIgKyBjb21taXRJZCArIFwiL1wiICsgY29tbWl0SWQgKyBcIi9cIiArIChwYXRoIHx8IFwiXCIpO1xuICAgICAgICAgIGlmIChjaGFuZ2VUeXBlKSB7XG4gICAgICAgICAgICBjaGFuZ2VUeXBlID0gY2hhbmdlVHlwZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKGNoYW5nZVR5cGUuc3RhcnRzV2l0aChcImFcIikpIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtYWRkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcImFkZFwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcImFkZGVkXCI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoYW5nZVR5cGUuc3RhcnRzV2l0aChcImRcIikpIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtZGVsZXRlXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcImRlbGV0ZVwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcImRlbGV0ZWRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmZpbGVMaW5rID0gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VDbGFzcyA9IFwiY2hhbmdlLW1vZGlmeVwiO1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlID0gXCJtb2RpZnlcIjtcbiAgICAgICAgICAgICAgY29tbWl0LnRpdGxlID0gXCJtb2RpZmllZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29tbWl0LmNoYW5nZVR5cGVIdG1sID0gJzxzcGFuIGNsYXNzPVwiJyArIGNvbW1pdC5jaGFuZ2VDbGFzcyArICdcIj4nICsgY29tbWl0LnRpdGxlICsgJzwvc3Bhbj4nO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuICAgIH0pO1xuKi9cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBXaWtpIHtcblxuICB2YXIgQ3JlYXRlQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJDcmVhdGVDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRyb3V0ZVwiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgKCRzY29wZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtczpuZy5yb3V0ZS5JUm91dGVQYXJhbXNTZXJ2aWNlLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJGh0dHA6bmcuSUh0dHBTZXJ2aWNlLCAkdGltZW91dDpuZy5JVGltZW91dFNlcnZpY2UpID0+IHtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuXG4gICAgLy8gVE9ETyByZW1vdmVcbiAgICB2YXIgd29ya3NwYWNlID0gbnVsbDtcblxuICAgICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWUgPSBXaWtpLmNyZWF0ZVdpemFyZFRyZWUod29ya3NwYWNlLCAkc2NvcGUpO1xuICAgICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWVDaGlsZHJlbiA9ICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWUuY2hpbGRyZW47XG4gICAgJHNjb3BlLmNyZWF0ZURvY3VtZW50VHJlZUFjdGl2YXRpb25zID0gW1wiY2FtZWwtc3ByaW5nLnhtbFwiLCBcIlJlYWRNZS5tZFwiXTtcblxuICAgICRzY29wZS50cmVlT3B0aW9ucyA9IHtcbiAgICAgICAgbm9kZUNoaWxkcmVuOiBcImNoaWxkcmVuXCIsXG4gICAgICAgIGRpclNlbGVjdGFibGU6IHRydWUsXG4gICAgICAgIGluamVjdENsYXNzZXM6IHtcbiAgICAgICAgICAgIHVsOiBcImExXCIsXG4gICAgICAgICAgICBsaTogXCJhMlwiLFxuICAgICAgICAgICAgbGlTZWxlY3RlZDogXCJhN1wiLFxuICAgICAgICAgICAgaUV4cGFuZGVkOiBcImEzXCIsXG4gICAgICAgICAgICBpQ29sbGFwc2VkOiBcImE0XCIsXG4gICAgICAgICAgICBpTGVhZjogXCJhNVwiLFxuICAgICAgICAgICAgbGFiZWw6IFwiYTZcIixcbiAgICAgICAgICAgIGxhYmVsU2VsZWN0ZWQ6IFwiYThcIlxuICAgICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlRXhpc3RzID0ge1xuICAgICAgZXhpc3RzOiBmYWxzZSxcbiAgICAgIG5hbWU6IFwiXCJcbiAgICB9O1xuICAgICRzY29wZS5uZXdEb2N1bWVudE5hbWUgPSBcIlwiO1xuICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50RXh0ZW5zaW9uID0gbnVsbDtcbiAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSBmYWxzZTtcbiAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gXCJcIjtcbiAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gXCJcIjtcblxuICAgIGZ1bmN0aW9uIHJldHVyblRvRGlyZWN0b3J5KCkge1xuICAgICAgdmFyIGxpbmsgPSBXaWtpLnZpZXdMaW5rKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uKVxuICAgICAgbG9nLmRlYnVnKFwiQ2FuY2VsbGluZywgZ29pbmcgdG8gbGluazogXCIsIGxpbmspO1xuICAgICAgV2lraS5nb1RvTGluayhsaW5rLCAkdGltZW91dCwgJGxvY2F0aW9uKTtcbiAgICB9XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgcmV0dXJuVG9EaXJlY3RvcnkoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uQ3JlYXRlRG9jdW1lbnRTZWxlY3QgPSAobm9kZSkgPT4ge1xuICAgICAgLy8gcmVzZXQgYXMgd2Ugc3dpdGNoIGJldHdlZW4gZG9jdW1lbnQgdHlwZXNcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGZhbHNlO1xuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IFwiXCI7XG4gICAgICB2YXIgZW50aXR5ID0gbm9kZSA/IG5vZGUuZW50aXR5IDogbnVsbDtcbiAgICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUgPSBlbnRpdHk7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlUmVnZXggPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlLnJlZ2V4IHx8IC8uKi87XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlSW52YWxpZCA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUuaW52YWxpZCB8fCBcImludmFsaWQgbmFtZVwiO1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbiA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUuZXh0ZW5zaW9uIHx8IG51bGw7XG4gICAgICBsb2cuZGVidWcoXCJFbnRpdHk6IFwiLCBlbnRpdHkpO1xuICAgICAgaWYgKGVudGl0eSkge1xuICAgICAgICBpZiAoZW50aXR5LmdlbmVyYXRlZCkge1xuICAgICAgICAgICRzY29wZS5mb3JtU2NoZW1hID0gZW50aXR5LmdlbmVyYXRlZC5zY2hlbWE7XG4gICAgICAgICAgJHNjb3BlLmZvcm1EYXRhID0gZW50aXR5LmdlbmVyYXRlZC5mb3JtKHdvcmtzcGFjZSwgJHNjb3BlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybVNjaGVtYSA9IHt9O1xuICAgICAgICAgICRzY29wZS5mb3JtRGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9XG5cbiAgICB9O1xuXG4gICAgJHNjb3BlLmFkZEFuZENsb3NlRGlhbG9nID0gKGZpbGVOYW1lOnN0cmluZykgPT4ge1xuICAgICAgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSA9IGZpbGVOYW1lO1xuICAgICAgdmFyIHRlbXBsYXRlID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZTtcbiAgICAgIHZhciBwYXRoID0gZ2V0TmV3RG9jdW1lbnRQYXRoKCk7XG5cbiAgICAgIC8vIGNsZWFyICRzY29wZS5uZXdEb2N1bWVudE5hbWUgc28gd2UgZG9udCByZW1lbWJlciBpdCB3aGVuIHdlIG9wZW4gaXQgbmV4dCB0aW1lXG4gICAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gbnVsbDtcblxuICAgICAgLy8gcmVzZXQgYmVmb3JlIHdlIGNoZWNrIGp1c3QgaW4gYSBiaXRcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGZhbHNlO1xuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IFwiXCI7XG4gICAgICAkc2NvcGUuZmlsZUV4dGVuc2lvbkludmFsaWQgPSBudWxsO1xuXG4gICAgICBpZiAoIXRlbXBsYXRlIHx8ICFwYXRoKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGUgaWYgdGhlIG5hbWUgbWF0Y2ggdGhlIGV4dGVuc2lvblxuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVFeHRlbnNpb24pIHtcbiAgICAgICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoJy4nKTtcbiAgICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgICB2YXIgZXh0ID0gcGF0aC5zdWJzdHJpbmcoaWR4KTtcbiAgICAgICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbiAhPT0gZXh0KSB7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4dGVuc2lvbkludmFsaWQgPSBcIkZpbGUgZXh0ZW5zaW9uIG11c3QgYmU6IFwiICsgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbjtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkYXRlIGlmIHRoZSBmaWxlIGV4aXN0cywgYW5kIHVzZSB0aGUgc3luY2hyb25vdXMgY2FsbFxuICAgICAgd2lraVJlcG9zaXRvcnkuZXhpc3RzKCRzY29wZS5icmFuY2gsIHBhdGgsIChleGlzdHMpID0+IHtcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gZXhpc3RzO1xuICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gZXhpc3RzID8gcGF0aCA6IGZhbHNlO1xuICAgICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICAgIGRvQ3JlYXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiBkb0NyZWF0ZSgpIHtcbiAgICAgICAgdmFyIG5hbWUgPSBXaWtpLmZpbGVOYW1lKHBhdGgpO1xuICAgICAgICB2YXIgZm9sZGVyID0gV2lraS5maWxlUGFyZW50KHBhdGgpO1xuICAgICAgICB2YXIgZXhlbXBsYXIgPSB0ZW1wbGF0ZS5leGVtcGxhcjtcblxuICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9IFwiQ3JlYXRlZCBcIiArIHRlbXBsYXRlLmxhYmVsO1xuICAgICAgICB2YXIgZXhlbXBsYXJVcmkgPSBDb3JlLnVybChcIi9wbHVnaW5zL3dpa2kvZXhlbXBsYXIvXCIgKyBleGVtcGxhcik7XG5cbiAgICAgICAgaWYgKHRlbXBsYXRlLmZvbGRlcikge1xuICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIkNyZWF0aW5nIG5ldyBmb2xkZXIgXCIgKyBuYW1lKTtcblxuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmNyZWF0ZURpcmVjdG9yeSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICB2YXIgbGluayA9IFdpa2kudmlld0xpbmsoJHNjb3BlLCBwYXRoLCAkbG9jYXRpb24pO1xuICAgICAgICAgICAgZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGUucHJvZmlsZSkge1xuXG4gICAgICAgICAgZnVuY3Rpb24gdG9QYXRoKHByb2ZpbGVOYW1lOnN0cmluZykge1xuICAgICAgICAgICAgdmFyIGFuc3dlciA9IFwiZmFicmljL3Byb2ZpbGVzL1wiICsgcHJvZmlsZU5hbWU7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIucmVwbGFjZSgvLS9nLCBcIi9cIik7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIgKyBcIi5wcm9maWxlXCI7XG4gICAgICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmN0aW9uIHRvUHJvZmlsZU5hbWUocGF0aDpzdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBhbnN3ZXIgPSBwYXRoLnJlcGxhY2UoL15mYWJyaWNcXC9wcm9maWxlc1xcLy8sIFwiXCIpO1xuICAgICAgICAgICAgYW5zd2VyID0gYW5zd2VyLnJlcGxhY2UoL1xcLy9nLCBcIi1cIik7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIucmVwbGFjZSgvXFwucHJvZmlsZSQvLCBcIlwiKTtcbiAgICAgICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gc3RyaXAgb2ZmIGFueSBwcm9maWxlIG5hbWUgaW4gY2FzZSB0aGUgdXNlciBjcmVhdGVzIGEgcHJvZmlsZSB3aGlsZSBsb29raW5nIGF0XG4gICAgICAgICAgLy8gYW5vdGhlciBwcm9maWxlXG4gICAgICAgICAgZm9sZGVyID0gZm9sZGVyLnJlcGxhY2UoL1xcLz0/KFxcdyopXFwucHJvZmlsZSQvLCBcIlwiKTtcblxuICAgICAgICAgIHZhciBjb25jYXRlbmF0ZWQgPSBmb2xkZXIgKyBcIi9cIiArIG5hbWU7XG5cbiAgICAgICAgICB2YXIgcHJvZmlsZU5hbWUgPSB0b1Byb2ZpbGVOYW1lKGNvbmNhdGVuYXRlZCk7XG4gICAgICAgICAgdmFyIHRhcmdldFBhdGggPSB0b1BhdGgocHJvZmlsZU5hbWUpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGUuZ2VuZXJhdGVkKSB7XG4gICAgICAgICAgdmFyIG9wdGlvbnM6V2lraS5HZW5lcmF0ZU9wdGlvbnMgPSB7XG4gICAgICAgICAgICB3b3Jrc3BhY2U6IHdvcmtzcGFjZSxcbiAgICAgICAgICAgIGZvcm06ICRzY29wZS5mb3JtRGF0YSxcbiAgICAgICAgICAgIG5hbWU6IGZpbGVOYW1lLFxuICAgICAgICAgICAgcGFyZW50SWQ6IGZvbGRlcixcbiAgICAgICAgICAgIGJyYW5jaDogJHNjb3BlLmJyYW5jaCxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IChjb250ZW50cyk9PiB7XG4gICAgICAgICAgICAgIGlmIChjb250ZW50cykge1xuICAgICAgICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNyZWF0ZWQgZmlsZSBcIiArIG5hbWUpO1xuICAgICAgICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm5Ub0RpcmVjdG9yeSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVyblRvRGlyZWN0b3J5KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogKGVycm9yKT0+IHtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oJ2Vycm9yJywgZXJyb3IpO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgICAgdGVtcGxhdGUuZ2VuZXJhdGVkLmdlbmVyYXRlKG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGxvYWQgdGhlIGV4YW1wbGUgZGF0YSAoaWYgYW55KSBhbmQgdGhlbiBhZGQgdGhlIGRvY3VtZW50IHRvIGdpdCBhbmQgY2hhbmdlIHRoZSBsaW5rIHRvIHRoZSBuZXcgZG9jdW1lbnRcbiAgICAgICAgICAkaHR0cC5nZXQoZXhlbXBsYXJVcmkpXG4gICAgICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgcHV0UGFnZShwYXRoLCBuYW1lLCBmb2xkZXIsIGRhdGEsIGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5lcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuIGVtcHR5IGZpbGVcbiAgICAgICAgICAgICAgcHV0UGFnZShwYXRoLCBuYW1lLCBmb2xkZXIsIFwiXCIsIGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gcHV0UGFnZShwYXRoLCBuYW1lLCBmb2xkZXIsIGNvbnRlbnRzLCBjb21taXRNZXNzYWdlKSB7XG4gICAgICAvLyBUT0RPIGxldHMgY2hlY2sgdGhpcyBwYWdlIGRvZXMgbm90IGV4aXN0IC0gaWYgaXQgZG9lcyBsZXRzIGtlZXAgYWRkaW5nIGEgbmV3IHBvc3QgZml4Li4uXG4gICAgICB3aWtpUmVwb3NpdG9yeS5wdXRQYWdlKCRzY29wZS5icmFuY2gsIHBhdGgsIGNvbnRlbnRzLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIkNyZWF0ZWQgZmlsZSBcIiArIG5hbWUpO1xuICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcblxuICAgICAgICAvLyBsZXRzIG5hdmlnYXRlIHRvIHRoZSBlZGl0IGxpbmtcbiAgICAgICAgLy8gbG9hZCB0aGUgZGlyZWN0b3J5IGFuZCBmaW5kIHRoZSBjaGlsZCBpdGVtXG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvbGRlciwgJHNjb3BlLm9iamVjdElkLCAoZGV0YWlscykgPT4ge1xuICAgICAgICAgIC8vIGxldHMgZmluZCB0aGUgY2hpbGQgZW50cnkgc28gd2UgY2FuIGNhbGN1bGF0ZSBpdHMgY29ycmVjdCBlZGl0IGxpbmtcbiAgICAgICAgICB2YXIgbGluazpzdHJpbmcgPSBudWxsO1xuICAgICAgICAgIGlmIChkZXRhaWxzICYmIGRldGFpbHMuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcInNjYW5uZWQgdGhlIGRpcmVjdG9yeSBcIiArIGRldGFpbHMuY2hpbGRyZW4ubGVuZ3RoICsgXCIgY2hpbGRyZW5cIik7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbmQoYyA9PiBjLm5hbWUgPT09IGZpbGVOYW1lKTtcbiAgICAgICAgICAgIGlmIChjaGlsZCkge1xuICAgICAgICAgICAgICBsaW5rID0gJHNjb3BlLmNoaWxkTGluayhjaGlsZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2cuZGVidWcoXCJDb3VsZCBub3QgZmluZCBuYW1lICdcIiArIGZpbGVOYW1lICsgXCInIGluIHRoZSBsaXN0IG9mIGZpbGUgbmFtZXMgXCIgKyBKU09OLnN0cmluZ2lmeShkZXRhaWxzLmNoaWxkcmVuLm1hcChjID0+IGMubmFtZSkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFsaW5rKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJXQVJOSU5HOiBjb3VsZCBub3QgZmluZCB0aGUgY2hpbGRMaW5rIHNvIHJldmVydGluZyB0byB0aGUgd2lraSBlZGl0IHBhZ2UhXCIpO1xuICAgICAgICAgICAgbGluayA9IFdpa2kuZWRpdExpbmsoJHNjb3BlLCBwYXRoLCAkbG9jYXRpb24pO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvL0NvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROZXdEb2N1bWVudFBhdGgoKSB7XG4gICAgICB2YXIgdGVtcGxhdGUgPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlO1xuICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICBsb2cuZGVidWcoXCJObyB0ZW1wbGF0ZSBzZWxlY3RlZC5cIik7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgdmFyIGV4ZW1wbGFyID0gdGVtcGxhdGUuZXhlbXBsYXIgfHwgXCJcIjtcbiAgICAgIHZhciBuYW1lOnN0cmluZyA9ICRzY29wZS5uZXdEb2N1bWVudE5hbWUgfHwgZXhlbXBsYXI7XG5cbiAgICAgIGlmIChuYW1lLmluZGV4T2YoJy4nKSA8IDApIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgdGhlIGZpbGUgZXh0ZW5zaW9uIGZyb20gdGhlIGV4ZW1wbGFyXG4gICAgICAgIHZhciBpZHggPSBleGVtcGxhci5sYXN0SW5kZXhPZihcIi5cIik7XG4gICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgbmFtZSArPSBleGVtcGxhci5zdWJzdHJpbmcoaWR4KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBsZXRzIGRlYWwgd2l0aCBkaXJlY3RvcmllcyBpbiB0aGUgbmFtZVxuICAgICAgdmFyIGZvbGRlcjpzdHJpbmcgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgaWYgKCRzY29wZS5pc0ZpbGUpIHtcbiAgICAgICAgLy8gaWYgd2UgYXJlIGEgZmlsZSBsZXRzIGRpc2NhcmQgdGhlIGxhc3QgcGFydCBvZiB0aGUgcGF0aFxuICAgICAgICB2YXIgaWR4OmFueSA9IGZvbGRlci5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICAgIGlmIChpZHggPD0gMCkge1xuICAgICAgICAgIGZvbGRlciA9IFwiXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9sZGVyID0gZm9sZGVyLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgaWR4OmFueSA9IG5hbWUubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgZm9sZGVyICs9IFwiL1wiICsgbmFtZS5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgfVxuICAgICAgZm9sZGVyID0gQ29yZS50cmltTGVhZGluZyhmb2xkZXIsIFwiL1wiKTtcbiAgICAgIHJldHVybiBmb2xkZXIgKyAoZm9sZGVyID8gXCIvXCIgOiBcIlwiKSArIG5hbWU7XG4gICAgfVxuXG4gIH1dKTtcblxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5FZGl0Q29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZy5wdXNoKGNyZWF0ZUVkaXRpbmdCcmVhZGNydW1iKCRzY29wZSkpO1xuXG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmVudGl0eSA9IHtcbiAgICAgIHNvdXJjZTogbnVsbFxuICAgIH07XG5cbiAgICB2YXIgZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KCRzY29wZS5wYWdlSWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpO1xuICAgIHZhciBmb3JtID0gbnVsbDtcbiAgICBpZiAoKGZvcm1hdCAmJiBmb3JtYXQgPT09IFwiamF2YXNjcmlwdFwiKSB8fCBpc0NyZWF0ZSgpKSB7XG4gICAgICBmb3JtID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXTtcbiAgICB9XG5cbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIG1vZGU6IHtcbiAgICAgICAgbmFtZTogZm9ybWF0XG4gICAgICB9XG4gICAgfTtcbiAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMgPSBDb2RlRWRpdG9yLmNyZWF0ZUVkaXRvclNldHRpbmdzKG9wdGlvbnMpO1xuICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuXG5cbiAgICAkc2NvcGUuaXNWYWxpZCA9ICgpID0+ICRzY29wZS5maWxlTmFtZTtcblxuICAgICRzY29wZS5jYW5TYXZlID0gKCkgPT4gISRzY29wZS5tb2RpZmllZDtcblxuICAgICRzY29wZS4kd2F0Y2goJ2VudGl0eS5zb3VyY2UnLCAobmV3VmFsdWUsIG9sZFZhbHVlKSA9PiB7XG4gICAgICAkc2NvcGUubW9kaWZpZWQgPSBuZXdWYWx1ZSAmJiBvbGRWYWx1ZSAmJiBuZXdWYWx1ZSAhPT0gb2xkVmFsdWU7XG4gICAgfSwgdHJ1ZSk7XG5cbiAgICBsb2cuZGVidWcoXCJwYXRoOiBcIiwgJHNjb3BlLnBhdGgpO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnbW9kaWZpZWQnLCAobmV3VmFsdWUsIG9sZFZhbHVlKSA9PiB7XG4gICAgICBsb2cuZGVidWcoXCJtb2RpZmllZDogXCIsIG5ld1ZhbHVlKTtcbiAgICB9KTtcblxuICAgICRzY29wZS52aWV3TGluayA9ICgpID0+IFdpa2kudmlld0xpbmsoJHNjb3BlLCAkc2NvcGUucGFnZUlkLCAkbG9jYXRpb24sICRzY29wZS5maWxlTmFtZSk7XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgZ29Ub1ZpZXcoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmUgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkICYmICRzY29wZS5maWxlTmFtZSkge1xuICAgICAgICBzYXZlVG8oJHNjb3BlW1wicGFnZUlkXCJdKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNyZWF0ZSA9ICgpID0+IHtcbiAgICAgIC8vIGxldHMgY29tYmluZSB0aGUgZmlsZSBuYW1lIHdpdGggdGhlIGN1cnJlbnQgcGFnZUlkICh3aGljaCBpcyB0aGUgZGlyZWN0b3J5KVxuICAgICAgdmFyIHBhdGggPSAkc2NvcGUucGFnZUlkICsgXCIvXCIgKyAkc2NvcGUuZmlsZU5hbWU7XG4gICAgICBsb2cuZGVidWcoXCJjcmVhdGluZyBuZXcgZmlsZSBhdCBcIiArIHBhdGgpO1xuICAgICAgc2F2ZVRvKHBhdGgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub25TdWJtaXQgPSAoanNvbiwgZm9ybSkgPT4ge1xuICAgICAgaWYgKGlzQ3JlYXRlKCkpIHtcbiAgICAgICAgJHNjb3BlLmNyZWF0ZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLnNhdmUoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uQ2FuY2VsID0gKGZvcm0pID0+IHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBnb1RvVmlldygpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpXG4gICAgICB9LCA1MCk7XG4gICAgfTtcblxuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gaXNDcmVhdGUoKSB7XG4gICAgICByZXR1cm4gJGxvY2F0aW9uLnBhdGgoKS5zdGFydHNXaXRoKFwiL3dpa2kvY3JlYXRlXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICAvLyBvbmx5IGxvYWQgdGhlIHNvdXJjZSBpZiBub3QgaW4gY3JlYXRlIG1vZGVcbiAgICAgIGlmIChpc0NyZWF0ZSgpKSB7XG4gICAgICAgIHVwZGF0ZVNvdXJjZVZpZXcoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIkdldHRpbmcgcGFnZSwgYnJhbmNoOiBcIiwgJHNjb3BlLmJyYW5jaCwgXCIgcGFnZUlkOiBcIiwgJHNjb3BlLnBhZ2VJZCwgXCIgb2JqZWN0SWQ6IFwiLCAkc2NvcGUub2JqZWN0SWQpO1xuICAgICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsICRzY29wZS5vYmplY3RJZCwgb25GaWxlQ29udGVudHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRmlsZUNvbnRlbnRzKGRldGFpbHMpIHtcbiAgICAgIHZhciBjb250ZW50cyA9IGRldGFpbHMudGV4dDtcbiAgICAgICRzY29wZS5lbnRpdHkuc291cmNlID0gY29udGVudHM7XG4gICAgICAkc2NvcGUuZmlsZU5hbWUgPSAkc2NvcGUucGFnZUlkLnNwbGl0KCcvJykubGFzdCgpO1xuICAgICAgbG9nLmRlYnVnKFwiZmlsZSBuYW1lOiBcIiwgJHNjb3BlLmZpbGVOYW1lKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImZpbGUgZGV0YWlsczogXCIsIGRldGFpbHMpO1xuICAgICAgdXBkYXRlU291cmNlVmlldygpO1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVTb3VyY2VWaWV3KCkge1xuICAgICAgaWYgKGZvcm0pIHtcbiAgICAgICAgaWYgKGlzQ3JlYXRlKCkpIHtcbiAgICAgICAgICAvLyBsZXRzIGRlZmF1bHQgYSBmaWxlIG5hbWVcbiAgICAgICAgICBpZiAoISRzY29wZS5maWxlTmFtZSkge1xuICAgICAgICAgICAgJHNjb3BlLmZpbGVOYW1lID0gXCJcIiArIENvcmUuZ2V0VVVJRCgpICsgXCIuanNvblwiO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBub3cgbGV0cyB0cnkgbG9hZCB0aGUgZm9ybSBkZWZpbnRpb24gSlNPTiBzbyB3ZSBjYW4gdGhlbiByZW5kZXIgdGhlIGZvcm1cbiAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBudWxsO1xuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb3JtLCAkc2NvcGUub2JqZWN0SWQsIChkZXRhaWxzKSA9PiB7XG4gICAgICAgICAgb25Gb3JtU2NoZW1hKFdpa2kucGFyc2VKc29uKGRldGFpbHMudGV4dCkpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9zb3VyY2VFZGl0Lmh0bWxcIjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZvcm1TY2hlbWEoanNvbikge1xuICAgICAgJHNjb3BlLmZvcm1EZWZpbml0aW9uID0ganNvbjtcbiAgICAgIGlmICgkc2NvcGUuZW50aXR5LnNvdXJjZSkge1xuICAgICAgICAkc2NvcGUuZm9ybUVudGl0eSA9IFdpa2kucGFyc2VKc29uKCRzY29wZS5lbnRpdHkuc291cmNlKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9mb3JtRWRpdC5odG1sXCI7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdvVG9WaWV3KCkge1xuICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKCRzY29wZS52aWV3TGluaygpLCBcIiNcIik7XG4gICAgICBsb2cuZGVidWcoXCJnb2luZyB0byB2aWV3IFwiICsgcGF0aCk7XG4gICAgICAkbG9jYXRpb24ucGF0aChXaWtpLmRlY29kZVBhdGgocGF0aCkpO1xuICAgICAgbG9nLmRlYnVnKFwibG9jYXRpb24gaXMgbm93IFwiICsgJGxvY2F0aW9uLnBhdGgoKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2F2ZVRvKHBhdGg6c3RyaW5nKSB7XG4gICAgICB2YXIgY29tbWl0TWVzc2FnZSA9ICRzY29wZS5jb21taXRNZXNzYWdlIHx8IFwiVXBkYXRlZCBwYWdlIFwiICsgJHNjb3BlLnBhZ2VJZDtcbiAgICAgIHZhciBjb250ZW50cyA9ICRzY29wZS5lbnRpdHkuc291cmNlO1xuICAgICAgaWYgKCRzY29wZS5mb3JtRW50aXR5KSB7XG4gICAgICAgIGNvbnRlbnRzID0gSlNPTi5zdHJpbmdpZnkoJHNjb3BlLmZvcm1FbnRpdHksIG51bGwsIFwiICBcIik7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoXCJTYXZpbmcgZmlsZSwgYnJhbmNoOiBcIiwgJHNjb3BlLmJyYW5jaCwgXCIgcGF0aDogXCIsICRzY29wZS5wYXRoKTtcbiAgICAgIC8vbG9nLmRlYnVnKFwiQWJvdXQgdG8gd3JpdGUgY29udGVudHMgJ1wiICsgY29udGVudHMgKyBcIidcIik7XG4gICAgICB3aWtpUmVwb3NpdG9yeS5wdXRQYWdlKCRzY29wZS5icmFuY2gsIHBhdGgsIGNvbnRlbnRzLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgIFdpa2kub25Db21wbGV0ZShzdGF0dXMpO1xuICAgICAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcbiAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiU2F2ZWQgXCIgKyBwYXRoKTtcbiAgICAgICAgZ29Ub1ZpZXcoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICAvLyBjb250cm9sbGVyIGZvciBoYW5kbGluZyBmaWxlIGRyb3BzXG4gIGV4cG9ydCB2YXIgRmlsZURyb3BDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5GaWxlRHJvcENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiRmlsZVVwbG9hZGVyXCIsIFwiJHJvdXRlXCIsIFwiJHRpbWVvdXRcIiwgXCJ1c2VyRGV0YWlsc1wiLCAoJHNjb3BlLCBGaWxlVXBsb2FkZXIsICRyb3V0ZTpuZy5yb3V0ZS5JUm91dGVTZXJ2aWNlLCAkdGltZW91dDpuZy5JVGltZW91dFNlcnZpY2UsIHVzZXJEZXRhaWxzOkNvcmUuVXNlckRldGFpbHMpID0+IHtcblxuXG4gICAgdmFyIHVwbG9hZFVSSSA9IFdpa2kuZ2l0UmVzdFVSTCgkc2NvcGUsICRzY29wZS5wYWdlSWQpICsgJy8nO1xuICAgIHZhciB1cGxvYWRlciA9ICRzY29wZS51cGxvYWRlciA9IG5ldyBGaWxlVXBsb2FkZXIoe1xuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQXV0aG9yaXphdGlvbic6IENvcmUuYXV0aEhlYWRlclZhbHVlKHVzZXJEZXRhaWxzKVxuICAgICAgfSxcbiAgICAgIGF1dG9VcGxvYWQ6IHRydWUsXG4gICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWUsXG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIHVybDogdXBsb2FkVVJJXG4gICAgfSk7XG4gICAgJHNjb3BlLmRvVXBsb2FkID0gKCkgPT4ge1xuICAgICAgdXBsb2FkZXIudXBsb2FkQWxsKCk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbldoZW5BZGRpbmdGaWxlRmFpbGVkID0gZnVuY3Rpb24gKGl0ZW0gLyp7RmlsZXxGaWxlTGlrZU9iamVjdH0qLywgZmlsdGVyLCBvcHRpb25zKSB7XG4gICAgICBsb2cuZGVidWcoJ29uV2hlbkFkZGluZ0ZpbGVGYWlsZWQnLCBpdGVtLCBmaWx0ZXIsIG9wdGlvbnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25BZnRlckFkZGluZ0ZpbGUgPSBmdW5jdGlvbiAoZmlsZUl0ZW0pIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25BZnRlckFkZGluZ0ZpbGUnLCBmaWxlSXRlbSk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkFmdGVyQWRkaW5nQWxsID0gZnVuY3Rpb24gKGFkZGVkRmlsZUl0ZW1zKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQWZ0ZXJBZGRpbmdBbGwnLCBhZGRlZEZpbGVJdGVtcyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkJlZm9yZVVwbG9hZEl0ZW0gPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgaWYgKCdmaWxlJyBpbiBpdGVtKSB7XG4gICAgICAgIGl0ZW0uZmlsZVNpemVNQiA9IChpdGVtLmZpbGUuc2l6ZSAvIDEwMjQgLyAxMDI0KS50b0ZpeGVkKDIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaXRlbS5maWxlU2l6ZU1CID0gMDtcbiAgICAgIH1cbiAgICAgIC8vaXRlbS51cmwgPSBVcmxIZWxwZXJzLmpvaW4odXBsb2FkVVJJLCBpdGVtLmZpbGUubmFtZSk7XG4gICAgICBpdGVtLnVybCA9IHVwbG9hZFVSSTtcbiAgICAgIGxvZy5pbmZvKFwiTG9hZGluZyBmaWxlcyB0byBcIiArIHVwbG9hZFVSSSk7XG4gICAgICBsb2cuZGVidWcoJ29uQmVmb3JlVXBsb2FkSXRlbScsIGl0ZW0pO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25Qcm9ncmVzc0l0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHByb2dyZXNzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uUHJvZ3Jlc3NJdGVtJywgZmlsZUl0ZW0sIHByb2dyZXNzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uUHJvZ3Jlc3NBbGwgPSBmdW5jdGlvbiAocHJvZ3Jlc3MpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25Qcm9ncmVzc0FsbCcsIHByb2dyZXNzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uU3VjY2Vzc0l0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25TdWNjZXNzSXRlbScsIGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uRXJyb3JJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uRXJyb3JJdGVtJywgZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25DYW5jZWxJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQ2FuY2VsSXRlbScsIGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQ29tcGxldGVJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQ29tcGxldGVJdGVtJywgZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25Db21wbGV0ZUFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25Db21wbGV0ZUFsbCcpO1xuICAgICAgdXBsb2FkZXIuY2xlYXJRdWV1ZSgpO1xuICAgICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBsb2cuaW5mbyhcIkNvbXBsZXRlZCBhbGwgdXBsb2Fkcy4gTGV0cyBmb3JjZSBhIHJlbG9hZFwiKTtcbiAgICAgICAgJHJvdXRlLnJlbG9hZCgpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSwgMjAwKTtcbiAgICB9O1xuICB9XSk7XG5cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5Gb3JtVGFibGVDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcykgPT4ge1xuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5jb2x1bW5EZWZzID0gW107XG5cbiAgICAkc2NvcGUuZ3JpZE9wdGlvbnMgPSB7XG4gICAgICAgZGF0YTogJ2xpc3QnLFxuICAgICAgIGRpc3BsYXlGb290ZXI6IGZhbHNlLFxuICAgICAgIHNob3dGaWx0ZXI6IGZhbHNlLFxuICAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgIGZpbHRlclRleHQ6ICcnXG4gICAgICAgfSxcbiAgICAgICBjb2x1bW5EZWZzOiAkc2NvcGUuY29sdW1uRGVmc1xuICAgICB9O1xuXG5cbiAgICAkc2NvcGUudmlld0xpbmsgPSAocm93KSA9PiB7XG4gICAgICByZXR1cm4gY2hpbGRMaW5rKHJvdywgXCIvdmlld1wiKTtcbiAgICB9O1xuICAgICRzY29wZS5lZGl0TGluayA9IChyb3cpID0+IHtcbiAgICAgIHJldHVybiBjaGlsZExpbmsocm93LCBcIi9lZGl0XCIpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjaGlsZExpbmsoY2hpbGQsIHByZWZpeCkge1xuICAgICAgdmFyIHN0YXJ0ID0gV2lraS5zdGFydExpbmsoJHNjb3BlKTtcbiAgICAgIHZhciBjaGlsZElkID0gKGNoaWxkKSA/IGNoaWxkW1wiX2lkXCJdIHx8IFwiXCIgOiBcIlwiO1xuICAgICAgcmV0dXJuIENvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIHN0YXJ0ICsgcHJlZml4ICsgXCIvXCIgKyAkc2NvcGUucGFnZUlkICsgXCIvXCIgKyBjaGlsZElkKTtcbiAgICB9XG5cbiAgICB2YXIgbGlua3NDb2x1bW4gPSB7XG4gICAgICBmaWVsZDogJ19pZCcsXG4gICAgICBkaXNwbGF5TmFtZTogJ0FjdGlvbnMnLFxuICAgICAgY2VsbFRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cIm5nQ2VsbFRleHRcIlwiPjxhIG5nLWhyZWY9XCJ7e3ZpZXdMaW5rKHJvdy5lbnRpdHkpfX1cIiBjbGFzcz1cImJ0blwiPlZpZXc8L2E+IDxhIG5nLWhyZWY9XCJ7e2VkaXRMaW5rKHJvdy5lbnRpdHkpfX1cIiBjbGFzcz1cImJ0blwiPkVkaXQ8L2E+PC9kaXY+J1xuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cbiAgICB2YXIgZm9ybSA9ICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl07XG4gICAgaWYgKGZvcm0pIHtcbiAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgZm9ybSwgJHNjb3BlLm9iamVjdElkLCBvbkZvcm1EYXRhKTtcbiAgICB9XG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiBvblJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgIHZhciBsaXN0ID0gW107XG4gICAgICB2YXIgbWFwID0gV2lraS5wYXJzZUpzb24ocmVzcG9uc2UpO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKG1hcCwgKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgdmFsdWVbXCJfaWRcIl0gPSBrZXk7XG4gICAgICAgIGxpc3QucHVzaCh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICAgICRzY29wZS5saXN0ID0gbGlzdDtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIHZhciBmaWx0ZXIgPSBDb3JlLnBhdGhHZXQoJHNjb3BlLCBbXCJncmlkT3B0aW9uc1wiLCBcImZpbHRlck9wdGlvbnNcIiwgXCJmaWx0ZXJUZXh0XCJdKSB8fCBcIlwiO1xuICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5Lmpzb25DaGlsZENvbnRlbnRzKCRzY29wZS5wYWdlSWQsIFwiKi5qc29uXCIsIGZpbHRlciwgb25SZXN1bHRzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZvcm1EYXRhKGRldGFpbHMpIHtcbiAgICAgIHZhciB0ZXh0ID0gZGV0YWlscy50ZXh0O1xuICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgJHNjb3BlLmZvcm1EZWZpbml0aW9uID0gV2lraS5wYXJzZUpzb24odGV4dCk7XG5cbiAgICAgICAgdmFyIGNvbHVtbkRlZnMgPSBbXTtcbiAgICAgICAgdmFyIHNjaGVtYSA9ICRzY29wZS5mb3JtRGVmaW5pdGlvbjtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYS5wcm9wZXJ0aWVzLCAocHJvcGVydHksIG5hbWUpID0+IHtcbiAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgaWYgKCFGb3Jtcy5pc0FycmF5T3JOZXN0ZWRPYmplY3QocHJvcGVydHksIHNjaGVtYSkpIHtcbiAgICAgICAgICAgICAgdmFyIGNvbERlZiA9IHtcbiAgICAgICAgICAgICAgICBmaWVsZDogbmFtZSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZTogcHJvcGVydHkuZGVzY3JpcHRpb24gfHwgbmFtZSxcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiB0cnVlXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNvbHVtbkRlZnMucHVzaChjb2xEZWYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGNvbHVtbkRlZnMucHVzaChsaW5rc0NvbHVtbik7XG5cbiAgICAgICAgJHNjb3BlLmNvbHVtbkRlZnMgPSBjb2x1bW5EZWZzO1xuICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuY29sdW1uRGVmcyA9IGNvbHVtbkRlZnM7XG5cbiAgICAgICAgLy8gbm93IHdlIGhhdmUgdGhlIGdyaWQgY29sdW1uIHN0dWZmIGxvYWRlZCwgbGV0cyBsb2FkIHRoZSBkYXRhdGFibGVcbiAgICAgICAgJHNjb3BlLnRhYmxlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvZm9ybVRhYmxlRGF0YXRhYmxlLmh0bWxcIjtcbiAgICAgIH1cbiAgICB9XG4gICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbiBtb2R1bGUgV2lraSB7XG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuR2l0UHJlZmVyZW5jZXNcIiwgW1wiJHNjb3BlXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwidXNlckRldGFpbHNcIiwgKCRzY29wZSwgbG9jYWxTdG9yYWdlLCB1c2VyRGV0YWlscykgPT4ge1xuXG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgZ2l0VXNlck5hbWU6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBsYWJlbDogJ1VzZXJuYW1lJyxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSB1c2VyIG5hbWUgdG8gYmUgdXNlZCB3aGVuIG1ha2luZyBjaGFuZ2VzIHRvIGZpbGVzIHdpdGggdGhlIHNvdXJjZSBjb250cm9sIHN5c3RlbSdcbiAgICAgICAgfSxcbiAgICAgICAgZ2l0VXNlckVtYWlsOiB7XG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgbGFiZWw6ICdFbWFpbCcsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgZW1haWwgYWRkcmVzcyB0byB1c2Ugd2hlbiBtYWtpbmcgY2hhbmdlcyB0byBmaWxlcyB3aXRoIHRoZSBzb3VyY2UgY29udHJvbCBzeXN0ZW0nXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmVudGl0eSA9ICRzY29wZTtcbiAgICAkc2NvcGUuY29uZmlnID0gY29uZmlnO1xuXG4gICAgQ29yZS5pbml0UHJlZmVyZW5jZVNjb3BlKCRzY29wZSwgbG9jYWxTdG9yYWdlLCB7XG4gICAgICAnZ2l0VXNlck5hbWUnOiB7XG4gICAgICAgICd2YWx1ZSc6IHVzZXJEZXRhaWxzLnVzZXJuYW1lIHx8IFwiXCJcbiAgICAgIH0sXG4gICAgICAnZ2l0VXNlckVtYWlsJzoge1xuICAgICAgICAndmFsdWUnOiAnJ1xuICAgICAgfSAgXG4gICAgfSk7XG4gIH1dKTtcbiB9XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuSGlzdG9yeUNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCJtYXJrZWRcIiwgXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIsICAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgJHRlbXBsYXRlQ2FjaGUsIG1hcmtlZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgPT4ge1xuXG4gICAgLy8gVE9ETyByZW1vdmUhXG4gICAgdmFyIGlzRm1jID0gZmFsc2U7XG4gICAgdmFyIGpvbG9raWEgPSBudWxsO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgLy8gVE9ETyB3ZSBjb3VsZCBjb25maWd1cmUgdGhpcz9cbiAgICAkc2NvcGUuZGF0ZUZvcm1hdCA9ICdFRUUsIE1NTSBkLCB5IGF0IEhIOm1tOnNzIFonO1xuICAgIC8vJ3l5eXktTU0tZGQgSEg6bW06c3MgWidcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgIGRhdGE6ICdsb2dzJyxcbiAgICAgIHNob3dGaWx0ZXI6IGZhbHNlLFxuICAgICAgZW5hYmxlUm93Q2xpY2tTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgbXVsdGlTZWxlY3Q6IHRydWUsXG4gICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgIGRpc3BsYXlTZWxlY3Rpb25DaGVja2JveCA6IHRydWUsIC8vIG9sZCBwcmUgMi4wIGNvbmZpZyFcbiAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgZmlsdGVyVGV4dDogJydcbiAgICAgIH0sXG4gICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJyRkYXRlJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ01vZGlmaWVkJyxcbiAgICAgICAgICBkZWZhdWx0U29ydDogdHJ1ZSxcbiAgICAgICAgICBhc2NlbmRpbmc6IGZhbHNlLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0IHRleHQtbm93cmFwXCIgdGl0bGU9XCJ7e3Jvdy5lbnRpdHkuJGRhdGUgfCBkYXRlOlxcJ0VFRSwgTU1NIGQsIHl5eXkgOiBISDptbTpzcyBaXFwnfX1cIj57e3Jvdy5lbnRpdHkuJGRhdGUucmVsYXRpdmUoKX19PC9kaXY+JyxcbiAgICAgICAgICB3aWR0aDogXCIqKlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ3NoYScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdDaGFuZ2UnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0IHRleHQtbm93cmFwXCI+PGEgY2xhc3M9XCJjb21taXQtbGlua1wiIG5nLWhyZWY9XCJ7e3Jvdy5lbnRpdHkuY29tbWl0TGlua319e3toYXNofX1cIiB0aXRsZT1cInt7cm93LmVudGl0eS5zaGF9fVwiPnt7cm93LmVudGl0eS5zaGEgfCBsaW1pdFRvOjd9fSA8aSBjbGFzcz1cImZhIGZhLWFycm93LWNpcmNsZS1yaWdodFwiPjwvaT48L2E+PC9kaXY+JyxcbiAgICAgICAgICBjZWxsRmlsdGVyOiBcIlwiLFxuICAgICAgICAgIHdpZHRoOiBcIipcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdhdXRob3InLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnQXV0aG9yJyxcbiAgICAgICAgICBjZWxsRmlsdGVyOiBcIlwiLFxuICAgICAgICAgIHdpZHRoOiBcIioqXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnc2hvcnRfbWVzc2FnZScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdNZXNzYWdlJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dCB0ZXh0LW5vd3JhcFwiIHRpdGxlPVwie3tyb3cuZW50aXR5LnNob3J0X21lc3NhZ2V9fVwiPnt7cm93LmVudGl0eS5zaG9ydF9tZXNzYWdlfX08L2Rpdj4nLFxuICAgICAgICAgIHdpZHRoOiBcIioqKipcIlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5jYW5SZXZlcnQgPSAoKSA9PiB7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgcmV0dXJuIHNlbGVjdGVkSXRlbXMubGVuZ3RoID09PSAxICYmIHNlbGVjdGVkSXRlbXNbMF0gIT09ICRzY29wZS5sb2dzWzBdO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIG9iamVjdElkID0gc2VsZWN0ZWRJdGVtc1swXS5zaGE7XG4gICAgICAgIGlmIChvYmplY3RJZCkge1xuICAgICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gXCJSZXZlcnRpbmcgZmlsZSBcIiArICRzY29wZS5wYWdlSWQgKyBcIiB0byBwcmV2aW91cyB2ZXJzaW9uIFwiICsgb2JqZWN0SWQ7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8oJHNjb3BlLmJyYW5jaCwgb2JqZWN0SWQsICRzY29wZS5wYWdlSWQsIGNvbW1pdE1lc3NhZ2UsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShyZXN1bHQpO1xuICAgICAgICAgICAgLy8gbm93IGxldHMgdXBkYXRlIHRoZSB2aWV3XG4gICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbignc3VjY2VzcycsIFwiU3VjY2Vzc2Z1bGx5IHJldmVydGVkIFwiICsgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZWN0ZWRJdGVtcy5zcGxpY2UoMCwgc2VsZWN0ZWRJdGVtcy5sZW5ndGgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZGlmZiA9ICgpID0+IHtcbiAgICAgIHZhciBkZWZhdWx0VmFsdWUgPSBcIiBcIjtcbiAgICAgIHZhciBvYmplY3RJZCA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIG9iamVjdElkID0gc2VsZWN0ZWRJdGVtc1swXS5zaGEgfHwgZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgdmFyIGJhc2VPYmplY3RJZCA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgYmFzZU9iamVjdElkID0gc2VsZWN0ZWRJdGVtc1sxXS5zaGEgfHxkZWZhdWx0VmFsdWU7XG4gICAgICAgIC8vIG1ha2UgdGhlIG9iamVjdElkICh0aGUgb25lIHRoYXQgd2lsbCBzdGFydCB3aXRoIGIvIHBhdGgpIGFsd2F5cyBuZXdlciB0aGFuIGJhc2VPYmplY3RJZFxuICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtc1swXS5kYXRlIDwgc2VsZWN0ZWRJdGVtc1sxXS5kYXRlKSB7XG4gICAgICAgICAgdmFyIF8gPSBiYXNlT2JqZWN0SWQ7XG4gICAgICAgICAgYmFzZU9iamVjdElkID0gb2JqZWN0SWQ7XG4gICAgICAgICAgb2JqZWN0SWQgPSBfO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgbGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvZGlmZi9cIiArIG9iamVjdElkICsgXCIvXCIgKyBiYXNlT2JqZWN0SWQgKyBcIi9cIiArICRzY29wZS5wYWdlSWQ7XG4gICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcobGluaywgXCIjXCIpO1xuICAgICAgJGxvY2F0aW9uLnBhdGgocGF0aCk7XG4gICAgfTtcblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICB2YXIgb2JqZWN0SWQgPSBcIlwiO1xuICAgICAgdmFyIGxpbWl0ID0gMDtcblxuICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5Lmhpc3RvcnkoJHNjb3BlLmJyYW5jaCwgb2JqZWN0SWQsICRzY29wZS5wYWdlSWQsIGxpbWl0LCAobG9nQXJyYXkpID0+IHtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGxvZ0FycmF5LCAobG9nKSA9PiB7XG4gICAgICAgICAgLy8gbGV0cyB1c2UgdGhlIHNob3J0ZXIgaGFzaCBmb3IgbGlua3MgYnkgZGVmYXVsdFxuICAgICAgICAgIHZhciBjb21taXRJZCA9IGxvZy5zaGE7XG4gICAgICAgICAgbG9nLiRkYXRlID0gRGV2ZWxvcGVyLmFzRGF0ZShsb2cuZGF0ZSk7XG4gICAgICAgICAgbG9nLmNvbW1pdExpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArIFwiL2NvbW1pdERldGFpbC9cIiArICRzY29wZS5wYWdlSWQgKyBcIi9cIiArIGNvbW1pdElkO1xuICAgICAgICB9KTtcbiAgICAgICAgJHNjb3BlLmxvZ3MgPSBfLnNvcnRCeShsb2dBcnJheSwgXCIkZGF0ZVwiKS5yZXZlcnNlKCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcbiAgICAgIFdpa2kubG9hZEJyYW5jaGVzKGpvbG9raWEsIHdpa2lSZXBvc2l0b3J5LCAkc2NvcGUsIGlzRm1jKTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG4gIF9tb2R1bGUuZGlyZWN0aXZlKFwiY29tbWl0SGlzdG9yeVBhbmVsXCIsICgpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlUGF0aCArICdoaXN0b3J5UGFuZWwuaHRtbCdcbiAgICB9O1xuICB9KTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuTmF2QmFyQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCJ3aWtpQnJhbmNoTWVudVwiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgd2lraUJyYW5jaE1lbnU6QnJhbmNoTWVudSkgPT4ge1xuXG4gICAgLy8gVE9ETyByZW1vdmUhXG4gICAgdmFyIGlzRm1jID0gZmFsc2U7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuYnJhbmNoTWVudUNvbmZpZyA9IDxVSS5NZW51SXRlbT57XG4gICAgICB0aXRsZTogJHNjb3BlLmJyYW5jaCxcbiAgICAgIGl0ZW1zOiBbXVxuICAgIH07XG5cbiAgICAkc2NvcGUuVmlld01vZGUgPSBXaWtpLlZpZXdNb2RlO1xuICAgICRzY29wZS5zZXRWaWV3TW9kZSA9IChtb2RlOldpa2kuVmlld01vZGUpID0+IHtcbiAgICAgICRzY29wZS4kZW1pdCgnV2lraS5TZXRWaWV3TW9kZScsIG1vZGUpO1xuICAgIH07XG5cbiAgICB3aWtpQnJhbmNoTWVudS5hcHBseU1lbnVFeHRlbnNpb25zKCRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zKTtcblxuICAgICRzY29wZS4kd2F0Y2goJ2JyYW5jaGVzJywgKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgPT4ge1xuICAgICAgaWYgKG5ld1ZhbHVlID09PSBvbGRWYWx1ZSB8fCAhbmV3VmFsdWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgJHNjb3BlLmJyYW5jaE1lbnVDb25maWcuaXRlbXMgPSBbXTtcbiAgICAgIGlmIChuZXdWYWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zLnB1c2goe1xuICAgICAgICAgIGhlYWRpbmc6IGlzRm1jID8gXCJWZXJzaW9uc1wiIDogXCJCcmFuY2hlc1wiXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgbmV3VmFsdWUuc29ydCgpLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgdmFyIG1lbnVJdGVtID0ge1xuICAgICAgICAgIHRpdGxlOiBpdGVtLFxuICAgICAgICAgIGljb246ICcnLFxuICAgICAgICAgIGFjdGlvbjogKCkgPT4ge31cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGl0ZW0gPT09ICRzY29wZS5icmFuY2gpIHtcbiAgICAgICAgICBtZW51SXRlbS5pY29uID0gXCJmYSBmYS1va1wiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1lbnVJdGVtLmFjdGlvbiA9ICgpID0+IHtcbiAgICAgICAgICAgIHZhciB0YXJnZXRVcmwgPSBicmFuY2hMaW5rKGl0ZW0sIDxzdHJpbmc+JHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uKTtcbiAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKENvcmUudG9QYXRoKHRhcmdldFVybCkpO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmJyYW5jaE1lbnVDb25maWcuaXRlbXMucHVzaChtZW51SXRlbSk7XG4gICAgICB9KTtcbiAgICAgIHdpa2lCcmFuY2hNZW51LmFwcGx5TWVudUV4dGVuc2lvbnMoJHNjb3BlLmJyYW5jaE1lbnVDb25maWcuaXRlbXMpO1xuICAgIH0sIHRydWUpO1xuXG4gICAgJHNjb3BlLmNyZWF0ZUxpbmsgPSAoKSA9PiB7XG4gICAgICB2YXIgcGFnZUlkID0gV2lraS5wYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgICAgcmV0dXJuIFdpa2kuY3JlYXRlTGluaygkc2NvcGUsIHBhZ2VJZCwgJGxvY2F0aW9uKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnN0YXJ0TGluayA9IHN0YXJ0TGluaygkc2NvcGUpO1xuXG4gICAgJHNjb3BlLnNvdXJjZUxpbmsgPSAoKSA9PiB7XG4gICAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICB2YXIgYW5zd2VyID0gPHN0cmluZz5udWxsO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKFdpa2kuY3VzdG9tVmlld0xpbmtzKCRzY29wZSksIChsaW5rKSA9PiB7XG4gICAgICAgIGlmIChwYXRoLnN0YXJ0c1dpdGgobGluaykpIHtcbiAgICAgICAgICBhbnN3ZXIgPSA8c3RyaW5nPkNvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIFdpa2kuc3RhcnRMaW5rKCRzY29wZSkgKyBcIi92aWV3XCIgKyBwYXRoLnN1YnN0cmluZyhsaW5rLmxlbmd0aCkpXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gcmVtb3ZlIHRoZSBmb3JtIHBhcmFtZXRlciBvbiB2aWV3L2VkaXQgbGlua3NcbiAgICAgIHJldHVybiAoIWFuc3dlciAmJiAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdKVxuICAgICAgICAgICAgICA/IENvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIFwiI1wiICsgcGF0aCwgW1wiZm9ybVwiXSlcbiAgICAgICAgICAgICAgOiBhbnN3ZXI7XG4gICAgfTtcblxuICAgICRzY29wZS5pc0FjdGl2ZSA9IChocmVmKSA9PiB7XG4gICAgICBpZiAoIWhyZWYpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGhyZWYuZW5kc1dpdGgoJHJvdXRlUGFyYW1zWydwYWdlJ10pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgc2V0VGltZW91dChsb2FkQnJlYWRjcnVtYnMsIDUwKTtcbiAgICB9KTtcblxuICAgIGxvYWRCcmVhZGNydW1icygpO1xuXG4gICAgZnVuY3Rpb24gc3dpdGNoRnJvbVZpZXdUb0N1c3RvbUxpbmsoYnJlYWRjcnVtYiwgbGluaykge1xuICAgICAgdmFyIGhyZWYgPSBicmVhZGNydW1iLmhyZWY7XG4gICAgICBpZiAoaHJlZikge1xuICAgICAgICBicmVhZGNydW1iLmhyZWYgPSBocmVmLnJlcGxhY2UoXCJ3aWtpL3ZpZXdcIiwgbGluayk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9hZEJyZWFkY3J1bWJzKCkge1xuICAgICAgdmFyIHN0YXJ0ID0gV2lraS5zdGFydExpbmsoJHNjb3BlKTtcbiAgICAgIHZhciBocmVmID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICAkc2NvcGUuYnJlYWRjcnVtYnMgPSBbXG4gICAgICAgIHtocmVmOiBocmVmLCBuYW1lOiBcInJvb3RcIn1cbiAgICAgIF07XG4gICAgICB2YXIgcGF0aCA9IFdpa2kucGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAgIHZhciBhcnJheSA9IHBhdGggPyBwYXRoLnNwbGl0KFwiL1wiKSA6IFtdO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKGFycmF5LCAobmFtZSkgPT4ge1xuICAgICAgICBpZiAoIW5hbWUuc3RhcnRzV2l0aChcIi9cIikgJiYgIWhyZWYuZW5kc1dpdGgoXCIvXCIpKSB7XG4gICAgICAgICAgaHJlZiArPSBcIi9cIjtcbiAgICAgICAgfVxuICAgICAgICBocmVmICs9IFdpa2kuZW5jb2RlUGF0aChuYW1lKTtcbiAgICAgICAgaWYgKCFuYW1lLmlzQmxhbmsoKSkge1xuICAgICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBocmVmLCBuYW1lOiBuYW1lfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gbGV0cyBzd2l6emxlIHRoZSBsYXN0IG9uZSBvciB0d28gdG8gYmUgZm9ybVRhYmxlIHZpZXdzIGlmIHRoZSBsYXN0IG9yIDJuZCB0byBsYXN0XG4gICAgICB2YXIgbG9jID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICAgIGlmICgkc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBsYXN0ID0gJHNjb3BlLmJyZWFkY3J1bWJzWyRzY29wZS5icmVhZGNydW1icy5sZW5ndGggLSAxXTtcbiAgICAgICAgLy8gcG9zc2libHkgdHJpbSBhbnkgcmVxdWlyZWQgZmlsZSBleHRlbnNpb25zXG4gICAgICAgIGxhc3QubmFtZSA9IFdpa2kuaGlkZUZpbGVOYW1lRXh0ZW5zaW9ucyhsYXN0Lm5hbWUpO1xuXG4gICAgICAgIHZhciBzd2l6emxlZCA9IGZhbHNlO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goV2lraS5jdXN0b21WaWV3TGlua3MoJHNjb3BlKSwgKGxpbmspID0+IHtcbiAgICAgICAgICBpZiAoIXN3aXp6bGVkICYmIGxvYy5zdGFydHNXaXRoKGxpbmspKSB7XG4gICAgICAgICAgICAvLyBsZXRzIHN3aXp6bGUgdGhlIHZpZXcgdG8gdGhlIGN1cnJlbnQgbGlua1xuICAgICAgICAgICAgc3dpdGNoRnJvbVZpZXdUb0N1c3RvbUxpbmsoJHNjb3BlLmJyZWFkY3J1bWJzLmxhc3QoKSwgQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIi9cIikpO1xuICAgICAgICAgICAgc3dpenpsZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghc3dpenpsZWQgJiYgJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXSkge1xuICAgICAgICAgIHZhciBsYXN0TmFtZSA9ICRzY29wZS5icmVhZGNydW1icy5sYXN0KCkubmFtZTtcbiAgICAgICAgICBpZiAobGFzdE5hbWUgJiYgbGFzdE5hbWUuZW5kc1dpdGgoXCIuanNvblwiKSkge1xuICAgICAgICAgICAgLy8gcHJldmlvdXMgYnJlYWRjcnVtYiBzaG91bGQgYmUgYSBmb3JtVGFibGVcbiAgICAgICAgICAgIHN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rKCRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMl0sIFwid2lraS9mb3JtVGFibGVcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvKlxuICAgICAgaWYgKGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvaGlzdG9yeVwiKSB8fCBsb2Muc3RhcnRzV2l0aChcIi93aWtpL3ZlcnNpb25cIilcbiAgICAgICAgfHwgbG9jLnN0YXJ0c1dpdGgoXCIvd2lraS9kaWZmXCIpIHx8IGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvY29tbWl0XCIpKSB7XG4gICAgICAgIC8vIGxldHMgYWRkIGEgaGlzdG9yeSB0YWJcbiAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IFwiIy93aWtpL2hpc3RvcnkvXCIgKyBwYXRoLCBuYW1lOiBcIkhpc3RvcnlcIn0pO1xuICAgICAgfSBlbHNlIGlmICgkc2NvcGUuYnJhbmNoKSB7XG4gICAgICAgIHZhciBwcmVmaXggPVwiL3dpa2kvYnJhbmNoL1wiICsgJHNjb3BlLmJyYW5jaDtcbiAgICAgICAgaWYgKGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL2hpc3RvcnlcIikgfHwgbG9jLnN0YXJ0c1dpdGgocHJlZml4ICsgXCIvdmVyc2lvblwiKVxuICAgICAgICAgIHx8IGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL2RpZmZcIikgfHwgbG9jLnN0YXJ0c1dpdGgocHJlZml4ICsgXCIvY29tbWl0XCIpKSB7XG4gICAgICAgICAgLy8gbGV0cyBhZGQgYSBoaXN0b3J5IHRhYlxuICAgICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiMvd2lraS9icmFuY2gvXCIgKyAkc2NvcGUuYnJhbmNoICsgXCIvaGlzdG9yeS9cIiArIHBhdGgsIG5hbWU6IFwiSGlzdG9yeVwifSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgICovXG4gICAgICB2YXIgbmFtZTpzdHJpbmcgPSBudWxsO1xuICAgICAgaWYgKGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvdmVyc2lvblwiKSkge1xuICAgICAgICAvLyBsZXRzIGFkZCBhIHZlcnNpb24gdGFiXG4gICAgICAgIG5hbWUgPSAoJHJvdXRlUGFyYW1zW1wib2JqZWN0SWRcIl0gfHwgXCJcIikuc3Vic3RyaW5nKDAsIDYpIHx8IFwiVmVyc2lvblwiO1xuICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogXCIjXCIgKyBsb2MsIG5hbWU6IG5hbWV9KTtcbiAgICAgIH1cbiAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChcIi93aWtpL2RpZmZcIikpIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgYSB2ZXJzaW9uIHRhYlxuICAgICAgICB2YXIgdjEgPSAoJHJvdXRlUGFyYW1zW1wib2JqZWN0SWRcIl0gfHwgXCJcIikuc3Vic3RyaW5nKDAsIDYpO1xuICAgICAgICB2YXIgdjIgPSAoJHJvdXRlUGFyYW1zW1wiYmFzZU9iamVjdElkXCJdIHx8IFwiXCIpLnN1YnN0cmluZygwLCA2KTtcbiAgICAgICAgbmFtZSA9IFwiRGlmZlwiO1xuICAgICAgICBpZiAodjEpIHtcbiAgICAgICAgICBpZiAodjIpIHtcbiAgICAgICAgICAgIG5hbWUgKz0gXCIgXCIgKyB2MSArIFwiIFwiICsgdjI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5hbWUgKz0gXCIgXCIgKyB2MTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IFwiI1wiICsgbG9jLCBuYW1lOiBuYW1lfSk7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5tb2R1bGUgV2lraSB7XG4gIF9tb2R1bGUuY29udHJvbGxlcignV2lraS5PdmVydmlld0Rhc2hib2FyZCcsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKSA9PiB7XG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgJHNjb3BlLmRhc2hib2FyZEVtYmVkZGVkID0gdHJ1ZTtcbiAgICAkc2NvcGUuZGFzaGJvYXJkSWQgPSAnMCc7XG4gICAgJHNjb3BlLmRhc2hib2FyZEluZGV4ID0gJzAnO1xuICAgICRzY29wZS5kYXNoYm9hcmRSZXBvc2l0b3J5ID0ge1xuICAgICAgZ2V0VHlwZTogKCkgPT4gJ0dpdFdpa2lSZXBvc2l0b3J5JyxcbiAgICAgIHB1dERhc2hib2FyZHM6IChhcnJheTphbnlbXSwgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGNiKSA9PiB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSxcbiAgICAgIGRlbGV0ZURhc2hib2FyZHM6IChhcnJheTpBcnJheTxEYXNoYm9hcmQuRGFzaGJvYXJkPiwgZm4pID0+IHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9LFxuICAgICAgZ2V0RGFzaGJvYXJkczogKGZuOihkYXNoYm9hcmRzOiBBcnJheTxEYXNoYm9hcmQuRGFzaGJvYXJkPikgPT4gdm9pZCkgPT4ge1xuICAgICAgICBsb2cuZGVidWcoXCJnZXREYXNoYm9hcmRzIGNhbGxlZFwiKTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgZm4oW3tcbiAgICAgICAgICAgIGdyb3VwOiAnVGVzdCcsXG4gICAgICAgICAgICBpZDogJzAnLFxuICAgICAgICAgICAgdGl0bGU6ICdUZXN0JyxcbiAgICAgICAgICAgIHdpZGdldHM6IFt7XG4gICAgICAgICAgICAgIGNvbDogMSxcbiAgICAgICAgICAgICAgaWQ6ICd3MScsXG4gICAgICAgICAgICAgIGluY2x1ZGU6ICdwbHVnaW5zL3dpa2kvaHRtbC9wcm9qZWN0c0NvbW1pdFBhbmVsLmh0bWwnLFxuICAgICAgICAgICAgICBwYXRoOiAkbG9jYXRpb24ucGF0aCgpLFxuICAgICAgICAgICAgICByb3c6IDEsXG4gICAgICAgICAgICAgIHNlYXJjaDogJGxvY2F0aW9uLnNlYXJjaCgpLFxuICAgICAgICAgICAgICBzaXplX3g6IDMsXG4gICAgICAgICAgICAgIHNpemVfeTogMixcbiAgICAgICAgICAgICAgdGl0bGU6ICdDb21taXRzJ1xuICAgICAgICAgICAgfV1cbiAgICAgICAgICB9XSk7XG4gICAgICAgIH0sIDEwMDApO1xuXG4gICAgICB9LFxuICAgICAgZ2V0RGFzaGJvYXJkOiAoaWQ6c3RyaW5nLCBmbjogKGRhc2hib2FyZDogRGFzaGJvYXJkLkRhc2hib2FyZCkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAkc2NvcGUuJHdhdGNoKCdtb2RlbC5mZXRjaGVkJywgKGZldGNoZWQpID0+IHtcbiAgICAgICAgICBpZiAoIWZldGNoZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgJHNjb3BlLiR3YXRjaCgnc2VsZWN0ZWRCdWlsZCcsIChidWlsZCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFidWlsZCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdlbnRpdHknLCAoZW50aXR5KSA9PiB7XG4gICAgICAgICAgICAgIGlmICghZW50aXR5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHZhciBtb2RlbCA9ICRzY29wZS4kZXZhbCgnbW9kZWwnKTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJCdWlsZDogXCIsIGJ1aWxkKTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJNb2RlbDogXCIsIG1vZGVsKTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFbnRpdHk6IFwiLCBlbnRpdHkpO1xuICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB2YXIgc2VhcmNoID0gPERhc2hib2FyZC5TZWFyY2hNYXA+IHtcbiAgICAgICAgICAgICAgICBwcm9qZWN0SWQ6ICRzY29wZS5wcm9qZWN0SWQsXG4gICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAkc2NvcGUubmFtZXNwYWNlLFxuICAgICAgICAgICAgICAgIG93bmVyOiAkc2NvcGUub3duZXIsXG4gICAgICAgICAgICAgICAgYnJhbmNoOiAkc2NvcGUuYnJhbmNoLFxuICAgICAgICAgICAgICAgIGpvYjogYnVpbGQuJGpvYklkLFxuICAgICAgICAgICAgICAgIGlkOiAkc2NvcGUucHJvamVjdElkLFxuICAgICAgICAgICAgICAgIGJ1aWxkOiBidWlsZC5pZFxuXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB2YXIgZGFzaGJvYXJkID0ge1xuICAgICAgICAgICAgICAgICAgZ3JvdXA6ICdUZXN0JyxcbiAgICAgICAgICAgICAgICAgIGlkOiAnMCcsXG4gICAgICAgICAgICAgICAgICB0aXRsZTogJ1Rlc3QnLFxuICAgICAgICAgICAgICAgICAgd2lkZ2V0czogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb2w6IDEsXG4gICAgICAgICAgICAgICAgICAgIHJvdzogMyxcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICd3MycsXG4gICAgICAgICAgICAgICAgICAgIGluY2x1ZGU6ICdwbHVnaW5zL2t1YmVybmV0ZXMvaHRtbC9wZW5kaW5nUGlwZWxpbmVzLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiAkbG9jYXRpb24ucGF0aCgpLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHNlYXJjaCxcbiAgICAgICAgICAgICAgICAgICAgc2l6ZV94OiA5LFxuICAgICAgICAgICAgICAgICAgICBzaXplX3k6IDEsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnUGlwZWxpbmVzJ1xuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29sOiAxLFxuICAgICAgICAgICAgICAgICAgICByb3c6IDQsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAndzInLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlOiAncGx1Z2lucy9kZXZlbG9wZXIvaHRtbC9sb2dQYW5lbC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogJGxvY2F0aW9uLnBhdGgoKSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiBzZWFyY2gsXG4gICAgICAgICAgICAgICAgICAgIHNpemVfeDogNCxcbiAgICAgICAgICAgICAgICAgICAgc2l6ZV95OiAyLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0xvZ3MgZm9yIGpvYjogJyArIGJ1aWxkLiRqb2JJZCArICcgYnVpbGQ6ICcgKyBidWlsZC5pZFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29sOiA1LFxuICAgICAgICAgICAgICAgICAgICBpZDogJ3c0JyxcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVkZTogJ3BsdWdpbnMvd2lraS9odG1sL3Byb2plY3RDb21taXRzUGFuZWwuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6ICRsb2NhdGlvbi5wYXRoKCksXG4gICAgICAgICAgICAgICAgICAgIHJvdzogNCxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiBzZWFyY2gsXG4gICAgICAgICAgICAgICAgICAgIHNpemVfeDogNSxcbiAgICAgICAgICAgICAgICAgICAgc2l6ZV95OiAyLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0NvbW1pdHMnXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAoZW50aXR5LmVudmlyb25tZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgIHZhciBjb2xQb3NpdGlvbiA9IDE7XG4gICAgICAgICAgICAgICAgICBfLmZvckVhY2goZW50aXR5LmVudmlyb25tZW50cywgKGVudjphbnksIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzID0gPERhc2hib2FyZC5TZWFyY2hNYXA+IF8uZXh0ZW5kKHtcbiAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogZW52LmxhYmVsXG4gICAgICAgICAgICAgICAgICAgIH0sIHNlYXJjaCk7XG4gICAgICAgICAgICAgICAgICAgIGRhc2hib2FyZC53aWRnZXRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgIGlkOiBlbnYudXJsLFxuICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnRW52aXJvbm1lbnQ6ICcgKyBlbnYubGFiZWwsXG4gICAgICAgICAgICAgICAgICAgICAgc2l6ZV94OiAzLFxuICAgICAgICAgICAgICAgICAgICAgIHNpemVfeTogMixcbiAgICAgICAgICAgICAgICAgICAgICBjb2w6IGNvbFBvc2l0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgIHJvdzogMSxcbiAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlOiAncGx1Z2lucy9kZXZlbG9wZXIvaHRtbC9lbnZpcm9ubWVudFBhbmVsLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgIHBhdGg6ICRsb2NhdGlvbi5wYXRoKCksXG4gICAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiBzXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjb2xQb3NpdGlvbiA9IGNvbFBvc2l0aW9uICsgMztcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZuKGRhc2hib2FyZCk7XG4gICAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIGNyZWF0ZURhc2hib2FyZDogKG9wdGlvbnM6YW55KSA9PiB7XG5cbiAgICAgIH1cbiAgICB9O1xuXG5cbiAgfSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIC8vIG1haW4gcGFnZSBjb250cm9sbGVyXG4gIGV4cG9ydCB2YXIgVmlld0NvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLlZpZXdDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRyb3V0ZVwiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJtYXJrZWRcIiwgXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIsICBcIiRjb21waWxlXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCIkaW50ZXJwb2xhdGVcIiwgXCIkZGlhbG9nXCIsICgkc2NvcGUsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXM6bmcucm91dGUuSVJvdXRlUGFyYW1zU2VydmljZSwgJHJvdXRlOm5nLnJvdXRlLklSb3V0ZVNlcnZpY2UsICRodHRwOm5nLklIdHRwU2VydmljZSwgJHRpbWVvdXQ6bmcuSVRpbWVvdXRTZXJ2aWNlLCBtYXJrZWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnksICAkY29tcGlsZTpuZy5JQ29tcGlsZVNlcnZpY2UsICR0ZW1wbGF0ZUNhY2hlOm5nLklUZW1wbGF0ZUNhY2hlU2VydmljZSwgbG9jYWxTdG9yYWdlLCAkaW50ZXJwb2xhdGU6bmcuSUludGVycG9sYXRlU2VydmljZSwgJGRpYWxvZykgPT4ge1xuXG4gICAgJHNjb3BlLm5hbWUgPSBcIldpa2lWaWV3Q29udHJvbGxlclwiO1xuXG4gICAgLy8gVE9ETyByZW1vdmUhXG4gICAgdmFyIGlzRm1jID0gZmFsc2U7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICBTZWxlY3Rpb25IZWxwZXJzLmRlY29yYXRlKCRzY29wZSk7XG5cbiAgICAkc2NvcGUuZmFicmljVG9wTGV2ZWwgPSBcImZhYnJpYy9wcm9maWxlcy9cIjtcblxuICAgICRzY29wZS52ZXJzaW9uSWQgPSAkc2NvcGUuYnJhbmNoO1xuXG4gICAgJHNjb3BlLnBhbmVUZW1wbGF0ZSA9ICcnO1xuXG4gICAgJHNjb3BlLnByb2ZpbGVJZCA9IFwiXCI7XG4gICAgJHNjb3BlLnNob3dQcm9maWxlSGVhZGVyID0gZmFsc2U7XG4gICAgJHNjb3BlLnNob3dBcHBIZWFkZXIgPSBmYWxzZTtcblxuICAgICRzY29wZS5vcGVyYXRpb25Db3VudGVyID0gMTtcbiAgICAkc2NvcGUucmVuYW1lRGlhbG9nID0gPFdpa2lEaWFsb2c+IG51bGw7XG4gICAgJHNjb3BlLm1vdmVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUuZGVsZXRlRGlhbG9nID0gPFdpa2lEaWFsb2c+IG51bGw7XG4gICAgJHNjb3BlLmlzRmlsZSA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLnJlbmFtZSA9IHtcbiAgICAgIG5ld0ZpbGVOYW1lOiBcIlwiXG4gICAgfTtcbiAgICAkc2NvcGUubW92ZSA9IHtcbiAgICAgIG1vdmVGb2xkZXI6IFwiXCJcbiAgICB9O1xuICAgICRzY29wZS5WaWV3TW9kZSA9IFdpa2kuVmlld01vZGU7XG5cbiAgICAvLyBiaW5kIGZpbHRlciBtb2RlbCB2YWx1ZXMgdG8gc2VhcmNoIHBhcmFtcy4uLlxuICAgIENvcmUuYmluZE1vZGVsVG9TZWFyY2hQYXJhbSgkc2NvcGUsICRsb2NhdGlvbiwgXCJzZWFyY2hUZXh0XCIsIFwicVwiLCBcIlwiKTtcblxuICAgIFN0b3JhZ2VIZWxwZXJzLmJpbmRNb2RlbFRvTG9jYWxTdG9yYWdlKHtcbiAgICAgICRzY29wZTogJHNjb3BlLFxuICAgICAgJGxvY2F0aW9uOiAkbG9jYXRpb24sXG4gICAgICBsb2NhbFN0b3JhZ2U6IGxvY2FsU3RvcmFnZSxcbiAgICAgIG1vZGVsTmFtZTogJ21vZGUnLFxuICAgICAgcGFyYW1OYW1lOiAnd2lraVZpZXdNb2RlJyxcbiAgICAgIGluaXRpYWxWYWx1ZTogV2lraS5WaWV3TW9kZS5MaXN0LFxuICAgICAgdG86IENvcmUubnVtYmVyVG9TdHJpbmcsXG4gICAgICBmcm9tOiBDb3JlLnBhcnNlSW50VmFsdWVcbiAgICB9KTtcblxuICAgIC8vIG9ubHkgcmVsb2FkIHRoZSBwYWdlIGlmIGNlcnRhaW4gc2VhcmNoIHBhcmFtZXRlcnMgY2hhbmdlXG4gICAgQ29yZS5yZWxvYWRXaGVuUGFyYW1ldGVyc0NoYW5nZSgkcm91dGUsICRzY29wZSwgJGxvY2F0aW9uLCBbJ3dpa2lWaWV3TW9kZSddKTtcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgIGRhdGE6ICdjaGlsZHJlbicsXG4gICAgICBkaXNwbGF5Rm9vdGVyOiBmYWxzZSxcbiAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgZW5hYmxlU29ydGluZzogZmFsc2UsXG4gICAgICB1c2VFeHRlcm5hbFNvcnRpbmc6IHRydWUsXG4gICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ25hbWUnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTmFtZScsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ2ZpbGVDZWxsVGVtcGxhdGUuaHRtbCcpLFxuICAgICAgICAgIGhlYWRlckNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmaWxlQ29sdW1uVGVtcGxhdGUuaHRtbCcpXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbignV2lraS5TZXRWaWV3TW9kZScsICgkZXZlbnQsIG1vZGU6V2lraS5WaWV3TW9kZSkgPT4ge1xuICAgICAgJHNjb3BlLm1vZGUgPSBtb2RlO1xuICAgICAgc3dpdGNoKG1vZGUpIHtcbiAgICAgICAgY2FzZSBWaWV3TW9kZS5MaXN0OlxuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkxpc3QgdmlldyBtb2RlXCIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFZpZXdNb2RlLkljb246XG4gICAgICAgICAgbG9nLmRlYnVnKFwiSWNvbiB2aWV3IG1vZGVcIik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgJHNjb3BlLm1vZGUgPSBWaWV3TW9kZS5MaXN0O1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkRlZmF1bHRpbmcgdG8gbGlzdCB2aWV3IG1vZGVcIik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgICRzY29wZS5jaGlsZEFjdGlvbnMgPSBbXTtcblxuICAgIHZhciBtYXliZVVwZGF0ZVZpZXcgPSBDb3JlLnRocm90dGxlZCh1cGRhdGVWaWV3LCAxMDAwKTtcblxuICAgICRzY29wZS5tYXJrZWQgPSAodGV4dCkgPT4ge1xuICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgcmV0dXJuIG1hcmtlZCh0ZXh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIH1cbiAgICB9O1xuXG5cbiAgICAkc2NvcGUuJG9uKCd3aWtpQnJhbmNoZXNVcGRhdGVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXBkYXRlVmlldygpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmNyZWF0ZURhc2hib2FyZExpbmsgPSAoKSA9PiB7XG4gICAgICB2YXIgaHJlZiA9ICcvd2lraS9icmFuY2gvOmJyYW5jaC92aWV3LypwYWdlJztcbiAgICAgIHZhciBwYWdlID0gJHJvdXRlUGFyYW1zWydwYWdlJ107XG4gICAgICB2YXIgdGl0bGUgPSBwYWdlID8gcGFnZS5zcGxpdChcIi9cIikubGFzdCgpIDogbnVsbDtcbiAgICAgIHZhciBzaXplID0gYW5ndWxhci50b0pzb24oe1xuICAgICAgICBzaXplX3g6IDIsXG4gICAgICAgIHNpemVfeTogMlxuICAgICAgfSk7XG4gICAgICB2YXIgYW5zd2VyID0gXCIjL2Rhc2hib2FyZC9hZGQ/dGFiPWRhc2hib2FyZFwiICtcbiAgICAgICAgXCImaHJlZj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChocmVmKSArXG4gICAgICAgIFwiJnNpemU9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoc2l6ZSkgK1xuICAgICAgICBcIiZyb3V0ZVBhcmFtcz1cIiArIGVuY29kZVVSSUNvbXBvbmVudChhbmd1bGFyLnRvSnNvbigkcm91dGVQYXJhbXMpKTtcbiAgICAgIGlmICh0aXRsZSkge1xuICAgICAgICBhbnN3ZXIgKz0gXCImdGl0bGU9XCIgKyBlbmNvZGVVUklDb21wb25lbnQodGl0bGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmRpc3BsYXlDbGFzcyA9ICgpID0+IHtcbiAgICAgIGlmICghJHNjb3BlLmNoaWxkcmVuIHx8ICRzY29wZS5jaGlsZHJlbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gXCJzcGFuOVwiO1xuICAgIH07XG5cbiAgICAkc2NvcGUucGFyZW50TGluayA9ICgpID0+IHtcbiAgICAgIHZhciBzdGFydCA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgdmFyIHByZWZpeCA9IHN0YXJ0ICsgXCIvdmlld1wiO1xuICAgICAgLy9sb2cuZGVidWcoXCJwYWdlSWQ6IFwiLCAkc2NvcGUucGFnZUlkKVxuICAgICAgdmFyIHBhcnRzID0gJHNjb3BlLnBhZ2VJZC5zcGxpdChcIi9cIik7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhcnRzOiBcIiwgcGFydHMpO1xuICAgICAgdmFyIHBhdGggPSBcIi9cIiArIHBhcnRzLmZpcnN0KHBhcnRzLmxlbmd0aCAtIDEpLmpvaW4oXCIvXCIpO1xuICAgICAgLy9sb2cuZGVidWcoXCJwYXRoOiBcIiwgcGF0aCk7XG4gICAgICByZXR1cm4gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgcHJlZml4ICsgcGF0aCwgW10pO1xuICAgIH07XG5cblxuICAgICRzY29wZS5jaGlsZExpbmsgPSAoY2hpbGQpID0+IHtcbiAgICAgIHZhciBzdGFydCA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgdmFyIHByZWZpeCA9IHN0YXJ0ICsgXCIvdmlld1wiO1xuICAgICAgdmFyIHBvc3RGaXggPSBcIlwiO1xuICAgICAgdmFyIHBhdGggPSBXaWtpLmVuY29kZVBhdGgoY2hpbGQucGF0aCk7XG4gICAgICBpZiAoY2hpbGQuZGlyZWN0b3J5KSB7XG4gICAgICAgIC8vIGlmIHdlIGFyZSBhIGZvbGRlciB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgYSBmb3JtIGZpbGUsIGxldHMgYWRkIGEgZm9ybSBwYXJhbS4uLlxuICAgICAgICB2YXIgZm9ybVBhdGggPSBwYXRoICsgXCIuZm9ybVwiO1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSAkc2NvcGUuY2hpbGRyZW47XG4gICAgICAgIGlmIChjaGlsZHJlbikge1xuICAgICAgICAgIHZhciBmb3JtRmlsZSA9IGNoaWxkcmVuLmZpbmQoKGNoaWxkKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gY2hpbGRbJ3BhdGgnXSA9PT0gZm9ybVBhdGg7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKGZvcm1GaWxlKSB7XG4gICAgICAgICAgICBwcmVmaXggPSBzdGFydCArIFwiL2Zvcm1UYWJsZVwiO1xuICAgICAgICAgICAgcG9zdEZpeCA9IFwiP2Zvcm09XCIgKyBmb3JtUGF0aDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB4bWxOYW1lc3BhY2VzID0gY2hpbGQueG1sX25hbWVzcGFjZXMgfHwgY2hpbGQueG1sTmFtZXNwYWNlcztcbiAgICAgICAgaWYgKHhtbE5hbWVzcGFjZXMgJiYgeG1sTmFtZXNwYWNlcy5sZW5ndGgpIHtcbiAgICAgICAgICBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmNhbWVsTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICAgICAgaWYgKHVzZUNhbWVsQ2FudmFzQnlEZWZhdWx0KSB7XG4gICAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvY2FtZWwvY2FudmFzXCI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwcmVmaXggPSBzdGFydCArIFwiL2NhbWVsL3Byb3BlcnRpZXNcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5kb3plck5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvZG96ZXIvbWFwcGluZ3NcIjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiY2hpbGQgXCIgKyBwYXRoICsgXCIgaGFzIG5hbWVzcGFjZXMgXCIgKyB4bWxOYW1lc3BhY2VzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoaWxkLnBhdGguZW5kc1dpdGgoXCIuZm9ybVwiKSkge1xuICAgICAgICAgIHBvc3RGaXggPSBcIj9mb3JtPS9cIjtcbiAgICAgICAgfSBlbHNlIGlmIChXaWtpLmlzSW5kZXhQYWdlKGNoaWxkLnBhdGgpKSB7XG4gICAgICAgICAgLy8gbGV0cyBkZWZhdWx0IHRvIGJvb2sgdmlldyBvbiBpbmRleCBwYWdlc1xuICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvYm9va1wiO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgVXJsSGVscGVycy5qb2luKHByZWZpeCwgcGF0aCkgKyBwb3N0Rml4LCBbXCJmb3JtXCJdKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmZpbGVOYW1lID0gKGVudGl0eSkgPT4ge1xuICAgICAgcmV0dXJuIFdpa2kuaGlkZUZpbGVOYW1lRXh0ZW5zaW9ucyhlbnRpdHkuZGlzcGxheU5hbWUgfHwgZW50aXR5Lm5hbWUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZUNsYXNzID0gKGVudGl0eSkgPT4ge1xuICAgICAgaWYgKGVudGl0eS5uYW1lLmhhcyhcIi5wcm9maWxlXCIpKSB7XG4gICAgICAgIHJldHVybiBcImdyZWVuXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmZpbGVJY29uSHRtbCA9IChlbnRpdHkpID0+IHtcbiAgICAgIHJldHVybiBXaWtpLmZpbGVJY29uSHRtbChlbnRpdHkpO1xuICAgIH07XG5cblxuICAgICRzY29wZS5mb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQoJHNjb3BlLnBhZ2VJZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSk7XG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgIG1vZGU6IHtcbiAgICAgICAgbmFtZTogJHNjb3BlLmZvcm1hdFxuICAgICAgfVxuICAgIH07XG4gICAgJHNjb3BlLmNvZGVNaXJyb3JPcHRpb25zID0gQ29kZUVkaXRvci5jcmVhdGVFZGl0b3JTZXR0aW5ncyhvcHRpb25zKTtcblxuICAgICRzY29wZS5lZGl0TGluayA9ICgpID0+IHtcbiAgICAgIHZhciBwYWdlTmFtZSA9ICgkc2NvcGUuZGlyZWN0b3J5KSA/ICRzY29wZS5yZWFkTWVQYXRoIDogJHNjb3BlLnBhZ2VJZDtcbiAgICAgIHJldHVybiAocGFnZU5hbWUpID8gV2lraS5lZGl0TGluaygkc2NvcGUsIHBhZ2VOYW1lLCAkbG9jYXRpb24pIDogbnVsbDtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmJyYW5jaExpbmsgPSAoYnJhbmNoKSA9PiB7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHJldHVybiBXaWtpLmJyYW5jaExpbmsoYnJhbmNoLCAkc2NvcGUucGFnZUlkLCAkbG9jYXRpb24pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGxcbiAgICB9O1xuXG4gICAgJHNjb3BlLmhpc3RvcnlMaW5rID0gXCIjL3dpa2lcIiArICgkc2NvcGUuYnJhbmNoID8gXCIvYnJhbmNoL1wiICsgJHNjb3BlLmJyYW5jaCA6IFwiXCIpICsgXCIvaGlzdG9yeS9cIiArICRzY29wZS5wYWdlSWQ7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCd3b3Jrc3BhY2UudHJlZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghJHNjb3BlLmdpdCkge1xuICAgICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgICAvL2xvZy5pbmZvKFwiUmVsb2FkaW5nIHZpZXcgYXMgdGhlIHRyZWUgY2hhbmdlZCBhbmQgd2UgaGF2ZSBhIGdpdCBtYmVhbiBub3dcIik7XG4gICAgICAgIHNldFRpbWVvdXQobWF5YmVVcGRhdGVWaWV3LCA1MCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgLy9sb2cuaW5mbyhcIlJlbG9hZGluZyB2aWV3IGR1ZSB0byAkcm91dGVDaGFuZ2VTdWNjZXNzXCIpO1xuICAgICAgc2V0VGltZW91dChtYXliZVVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuXG4gICAgJHNjb3BlLm9wZW5EZWxldGVEaWFsb2cgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZEZpbGVIdG1sID0gXCI8dWw+XCIgKyAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5tYXAoZmlsZSA9PiBcIjxsaT5cIiArIGZpbGUubmFtZSArIFwiPC9saT5cIikuc29ydCgpLmpvaW4oXCJcIikgKyBcIjwvdWw+XCI7XG5cbiAgICAgICAgaWYgKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmZpbmQoKGZpbGUpID0+IHsgcmV0dXJuIGZpbGUubmFtZS5lbmRzV2l0aChcIi5wcm9maWxlXCIpfSkpIHtcbiAgICAgICAgICAkc2NvcGUuZGVsZXRlV2FybmluZyA9IFwiWW91IGFyZSBhYm91dCB0byBkZWxldGUgZG9jdW1lbnQocykgd2hpY2ggcmVwcmVzZW50IEZhYnJpYzggcHJvZmlsZShzKS4gVGhpcyByZWFsbHkgY2FuJ3QgYmUgdW5kb25lISBXaWtpIG9wZXJhdGlvbnMgYXJlIGxvdyBsZXZlbCBhbmQgbWF5IGxlYWQgdG8gbm9uLWZ1bmN0aW9uYWwgc3RhdGUgb2YgRmFicmljLlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRzY29wZS5kZWxldGVXYXJuaW5nID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS5kZWxldGVEaWFsb2cgPSBXaWtpLmdldERlbGV0ZURpYWxvZygkZGlhbG9nLCA8V2lraS5EZWxldGVEaWFsb2dPcHRpb25zPntcbiAgICAgICAgICBjYWxsYmFja3M6ICgpID0+IHsgcmV0dXJuICRzY29wZS5kZWxldGVBbmRDbG9zZURpYWxvZzsgfSxcbiAgICAgICAgICBzZWxlY3RlZEZpbGVIdG1sOiAoKSA9PiAgeyByZXR1cm4gJHNjb3BlLnNlbGVjdGVkRmlsZUh0bWw7IH0sXG4gICAgICAgICAgd2FybmluZzogKCkgPT4geyByZXR1cm4gJHNjb3BlLmRlbGV0ZVdhcm5pbmc7IH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLmRlbGV0ZURpYWxvZy5vcGVuKCk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIGl0ZW1zIHNlbGVjdGVkIHJpZ2h0IG5vdyEgXCIgKyAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5kZWxldGVBbmRDbG9zZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBmaWxlcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgdmFyIGZpbGVDb3VudCA9IGZpbGVzLmxlbmd0aDtcbiAgICAgIGxvZy5kZWJ1ZyhcIkRlbGV0aW5nIHNlbGVjdGlvbjogXCIgKyBmaWxlcyk7XG5cbiAgICAgIHZhciBwYXRoc1RvRGVsZXRlID0gW107XG4gICAgICBhbmd1bGFyLmZvckVhY2goZmlsZXMsIChmaWxlLCBpZHgpID0+IHtcbiAgICAgICAgdmFyIHBhdGggPSBVcmxIZWxwZXJzLmpvaW4oJHNjb3BlLnBhZ2VJZCwgZmlsZS5uYW1lKTtcbiAgICAgICAgcGF0aHNUb0RlbGV0ZS5wdXNoKHBhdGgpO1xuICAgICAgfSk7XG5cbiAgICAgIGxvZy5kZWJ1ZyhcIkFib3V0IHRvIGRlbGV0ZSBcIiArIHBhdGhzVG9EZWxldGUpO1xuICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LnJlbW92ZVBhZ2VzKCRzY29wZS5icmFuY2gsIHBhdGhzVG9EZWxldGUsIG51bGwsIChyZXN1bHQpID0+IHtcbiAgICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMgPSBbXTtcbiAgICAgICAgdmFyIG1lc3NhZ2UgPSBDb3JlLm1heWJlUGx1cmFsKGZpbGVDb3VudCwgXCJkb2N1bWVudFwiKTtcbiAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiRGVsZXRlZCBcIiArIG1lc3NhZ2UpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICB9KTtcbiAgICAgICRzY29wZS5kZWxldGVEaWFsb2cuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLiR3YXRjaChcInJlbmFtZS5uZXdGaWxlTmFtZVwiLCAoKSA9PiB7XG4gICAgICAvLyBpZ25vcmUgZXJyb3JzIGlmIHRoZSBmaWxlIGlzIHRoZSBzYW1lIGFzIHRoZSByZW5hbWUgZmlsZSFcbiAgICAgIHZhciBwYXRoID0gZ2V0UmVuYW1lRmlsZVBhdGgoKTtcbiAgICAgIGlmICgkc2NvcGUub3JpZ2luYWxSZW5hbWVGaWxlUGF0aCA9PT0gcGF0aCkge1xuICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cyA9IHsgZXhpc3RzOiBmYWxzZSwgbmFtZTogbnVsbCB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hlY2tGaWxlRXhpc3RzKHBhdGgpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLnJlbmFtZUFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtc1swXTtcbiAgICAgICAgdmFyIG5ld1BhdGggPSBnZXRSZW5hbWVGaWxlUGF0aCgpO1xuICAgICAgICBpZiAoc2VsZWN0ZWQgJiYgbmV3UGF0aCkge1xuICAgICAgICAgIHZhciBvbGROYW1lID0gc2VsZWN0ZWQubmFtZTtcbiAgICAgICAgICB2YXIgbmV3TmFtZSA9IFdpa2kuZmlsZU5hbWUobmV3UGF0aCk7XG4gICAgICAgICAgdmFyIG9sZFBhdGggPSBVcmxIZWxwZXJzLmpvaW4oJHNjb3BlLnBhZ2VJZCwgb2xkTmFtZSk7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gcmVuYW1lIGZpbGUgXCIgKyBvbGRQYXRoICsgXCIgdG8gXCIgKyBuZXdQYXRoKTtcbiAgICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkucmVuYW1lKCRzY29wZS5icmFuY2gsIG9sZFBhdGgsIG5ld1BhdGgsIG51bGwsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIlJlbmFtZWQgZmlsZSB0byAgXCIgKyBuZXdOYW1lKTtcbiAgICAgICAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLnNwbGljZSgwLCAxKTtcbiAgICAgICAgICAgICRzY29wZS5yZW5hbWVEaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgICRzY29wZS5yZW5hbWVEaWFsb2cuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9wZW5SZW5hbWVEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgbmFtZSA9IG51bGw7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICBuYW1lID0gc2VsZWN0ZWQubmFtZTtcbiAgICAgIH1cbiAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICRzY29wZS5yZW5hbWUubmV3RmlsZU5hbWUgPSBuYW1lO1xuICAgICAgICAkc2NvcGUub3JpZ2luYWxSZW5hbWVGaWxlUGF0aCA9IGdldFJlbmFtZUZpbGVQYXRoKCk7XG5cbiAgICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZyA9IFdpa2kuZ2V0UmVuYW1lRGlhbG9nKCRkaWFsb2csIDxXaWtpLlJlbmFtZURpYWxvZ09wdGlvbnM+e1xuICAgICAgICAgIHJlbmFtZTogKCkgPT4geyAgcmV0dXJuICRzY29wZS5yZW5hbWU7IH0sXG4gICAgICAgICAgZmlsZUV4aXN0czogKCkgPT4geyByZXR1cm4gJHNjb3BlLmZpbGVFeGlzdHM7IH0sXG4gICAgICAgICAgZmlsZU5hbWU6ICgpID0+IHsgcmV0dXJuICRzY29wZS5maWxlTmFtZTsgfSxcbiAgICAgICAgICBjYWxsYmFja3M6ICgpID0+IHsgcmV0dXJuICRzY29wZS5yZW5hbWVBbmRDbG9zZURpYWxvZzsgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUucmVuYW1lRGlhbG9nLm9wZW4oKTtcblxuICAgICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgJCgnI3JlbmFtZUZpbGVOYW1lJykuZm9jdXMoKTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gaXRlbXMgc2VsZWN0ZWQgcmlnaHQgbm93ISBcIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdmVBbmRDbG9zZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBmaWxlcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgdmFyIGZpbGVDb3VudCA9IGZpbGVzLmxlbmd0aDtcbiAgICAgIHZhciBtb3ZlRm9sZGVyID0gJHNjb3BlLm1vdmUubW92ZUZvbGRlcjtcbiAgICAgIHZhciBvbGRGb2xkZXI6c3RyaW5nID0gJHNjb3BlLnBhZ2VJZDtcbiAgICAgIGlmIChtb3ZlRm9sZGVyICYmIGZpbGVDb3VudCAmJiBtb3ZlRm9sZGVyICE9PSBvbGRGb2xkZXIpIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTW92aW5nIFwiICsgZmlsZUNvdW50ICsgXCIgZmlsZShzKSB0byBcIiArIG1vdmVGb2xkZXIpO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goZmlsZXMsIChmaWxlLCBpZHgpID0+IHtcbiAgICAgICAgICB2YXIgb2xkUGF0aCA9IG9sZEZvbGRlciArIFwiL1wiICsgZmlsZS5uYW1lO1xuICAgICAgICAgIHZhciBuZXdQYXRoID0gbW92ZUZvbGRlciArIFwiL1wiICsgZmlsZS5uYW1lO1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkFib3V0IHRvIG1vdmUgXCIgKyBvbGRQYXRoICsgXCIgdG8gXCIgKyBuZXdQYXRoKTtcbiAgICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkucmVuYW1lKCRzY29wZS5icmFuY2gsIG9sZFBhdGgsIG5ld1BhdGgsIG51bGwsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGlmIChpZHggKyAxID09PSBmaWxlQ291bnQpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMuc3BsaWNlKDAsIGZpbGVDb3VudCk7XG4gICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gQ29yZS5tYXliZVBsdXJhbChmaWxlQ291bnQsIFwiZG9jdW1lbnRcIik7XG4gICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIk1vdmVkIFwiICsgbWVzc2FnZSArIFwiIHRvIFwiICsgbmV3UGF0aCk7XG4gICAgICAgICAgICAgICRzY29wZS5tb3ZlRGlhbG9nLmNsb3NlKCk7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUubW92ZURpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZm9sZGVyTmFtZXMgPSAodGV4dCkgPT4ge1xuICAgICAgcmV0dXJuIHdpa2lSZXBvc2l0b3J5LmNvbXBsZXRlUGF0aCgkc2NvcGUuYnJhbmNoLCB0ZXh0LCB0cnVlLCBudWxsKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9wZW5Nb3ZlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAkc2NvcGUubW92ZS5tb3ZlRm9sZGVyID0gJHNjb3BlLnBhZ2VJZDtcblxuICAgICAgICAkc2NvcGUubW92ZURpYWxvZyA9IFdpa2kuZ2V0TW92ZURpYWxvZygkZGlhbG9nLCA8V2lraS5Nb3ZlRGlhbG9nT3B0aW9ucz57XG4gICAgICAgICAgbW92ZTogKCkgPT4geyAgcmV0dXJuICRzY29wZS5tb3ZlOyB9LFxuICAgICAgICAgIGZvbGRlck5hbWVzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZm9sZGVyTmFtZXM7IH0sXG4gICAgICAgICAgY2FsbGJhY2tzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUubW92ZUFuZENsb3NlRGlhbG9nOyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5tb3ZlRGlhbG9nLm9wZW4oKTtcblxuICAgICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgJCgnI21vdmVGb2xkZXInKS5mb2N1cygpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJObyBpdGVtcyBzZWxlY3RlZCByaWdodCBub3chIFwiICsgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMpO1xuICAgICAgfVxuICAgIH07XG5cblxuICAgIHNldFRpbWVvdXQobWF5YmVVcGRhdGVWaWV3LCA1MCk7XG5cbiAgICBmdW5jdGlvbiBpc0RpZmZWaWV3KCkge1xuICAgICAgcmV0dXJuICRyb3V0ZVBhcmFtc1tcImRpZmZPYmplY3RJZDFcIl0gfHwgJHJvdXRlUGFyYW1zW1wiZGlmZk9iamVjdElkMlwiXSA/IHRydWUgOiBmYWxzZVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgICAgICB2YXIgam9sb2tpYSA9IG51bGw7XG5cblxuICAgICAgaWYgKGlzRGlmZlZpZXcoKSkge1xuICAgICAgICB2YXIgYmFzZU9iamVjdElkID0gJHJvdXRlUGFyYW1zW1wiZGlmZk9iamVjdElkMlwiXTtcbiAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LmRpZmYoJHNjb3BlLm9iamVjdElkLCBiYXNlT2JqZWN0SWQsICRzY29wZS5wYWdlSWQsIG9uRmlsZURldGFpbHMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgJHNjb3BlLm9iamVjdElkLCBvbkZpbGVEZXRhaWxzKTtcbiAgICAgIH1cbiAgICAgIFdpa2kubG9hZEJyYW5jaGVzKGpvbG9raWEsIHdpa2lSZXBvc2l0b3J5LCAkc2NvcGUsIGlzRm1jKTtcbiAgICB9XG5cbiAgICAkc2NvcGUudXBkYXRlVmlldyA9IHVwZGF0ZVZpZXc7XG5cbiAgICBmdW5jdGlvbiB2aWV3Q29udGVudHMocGFnZU5hbWUsIGNvbnRlbnRzKSB7XG4gICAgICAkc2NvcGUuc291cmNlVmlldyA9IG51bGw7XG5cbiAgICAgIHZhciBmb3JtYXQ6c3RyaW5nID0gbnVsbDtcbiAgICAgIGlmIChpc0RpZmZWaWV3KCkpIHtcbiAgICAgICAgZm9ybWF0ID0gXCJkaWZmXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQocGFnZU5hbWUsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpIHx8ICRzY29wZS5mb3JtYXQ7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoXCJGaWxlIGZvcm1hdDogXCIsIGZvcm1hdCk7XG4gICAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgICBjYXNlIFwiaW1hZ2VcIjpcbiAgICAgICAgICB2YXIgaW1hZ2VVUkwgPSAnZ2l0LycgKyAkc2NvcGUuYnJhbmNoO1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIiRzY29wZTogXCIsICRzY29wZSk7XG4gICAgICAgICAgaW1hZ2VVUkwgPSBVcmxIZWxwZXJzLmpvaW4oaW1hZ2VVUkwsICRzY29wZS5wYWdlSWQpO1xuICAgICAgICAgIHZhciBpbnRlcnBvbGF0ZUZ1bmMgPSAkaW50ZXJwb2xhdGUoJHRlbXBsYXRlQ2FjaGUuZ2V0KFwiaW1hZ2VUZW1wbGF0ZS5odG1sXCIpKTtcbiAgICAgICAgICAkc2NvcGUuaHRtbCA9IGludGVycG9sYXRlRnVuYyh7XG4gICAgICAgICAgICBpbWFnZVVSTDogaW1hZ2VVUkxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcIm1hcmtkb3duXCI6XG4gICAgICAgICAgJHNjb3BlLmh0bWwgPSBjb250ZW50cyA/IG1hcmtlZChjb250ZW50cykgOiBcIlwiO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiamF2YXNjcmlwdFwiOlxuICAgICAgICAgIHZhciBmb3JtID0gbnVsbDtcbiAgICAgICAgICBmb3JtID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXTtcbiAgICAgICAgICAkc2NvcGUuc291cmNlID0gY29udGVudHM7XG4gICAgICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtO1xuICAgICAgICAgIGlmIChmb3JtKSB7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB0cnkgbG9hZCB0aGUgZm9ybSBKU09OIHNvIHdlIGNhbiB0aGVuIHJlbmRlciB0aGUgZm9ybVxuICAgICAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBudWxsO1xuICAgICAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgZm9ybSwgJHNjb3BlLm9iamVjdElkLCAoZGV0YWlscykgPT4ge1xuICAgICAgICAgICAgICBvbkZvcm1TY2hlbWEoV2lraS5wYXJzZUpzb24oZGV0YWlscy50ZXh0KSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL3NvdXJjZVZpZXcuaHRtbFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAkc2NvcGUuaHRtbCA9IG51bGw7XG4gICAgICAgICAgJHNjb3BlLnNvdXJjZSA9IGNvbnRlbnRzO1xuICAgICAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9zb3VyY2VWaWV3Lmh0bWxcIjtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Gb3JtU2NoZW1hKGpzb24pIHtcbiAgICAgICRzY29wZS5mb3JtRGVmaW5pdGlvbiA9IGpzb247XG4gICAgICBpZiAoJHNjb3BlLnNvdXJjZSkge1xuICAgICAgICAkc2NvcGUuZm9ybUVudGl0eSA9IFdpa2kucGFyc2VKc29uKCRzY29wZS5zb3VyY2UpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL2Zvcm1WaWV3Lmh0bWxcIjtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25GaWxlRGV0YWlscyhkZXRhaWxzKSB7XG4gICAgICB2YXIgY29udGVudHMgPSBkZXRhaWxzLnRleHQ7XG4gICAgICAkc2NvcGUuZGlyZWN0b3J5ID0gZGV0YWlscy5kaXJlY3Rvcnk7XG4gICAgICAkc2NvcGUuZmlsZURldGFpbHMgPSBkZXRhaWxzO1xuXG4gICAgICBpZiAoZGV0YWlscyAmJiBkZXRhaWxzLmZvcm1hdCkge1xuICAgICAgICAkc2NvcGUuZm9ybWF0ID0gZGV0YWlscy5mb3JtYXQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KCRzY29wZS5wYWdlSWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLmNvZGVNaXJyb3JPcHRpb25zLm1vZGUubmFtZSA9ICRzY29wZS5mb3JtYXQ7XG4gICAgICAkc2NvcGUuY2hpbGRyZW4gPSBudWxsO1xuXG4gICAgICBpZiAoZGV0YWlscy5kaXJlY3RvcnkpIHtcbiAgICAgICAgdmFyIGRpcmVjdG9yaWVzID0gZGV0YWlscy5jaGlsZHJlbi5maWx0ZXIoKGRpcikgPT4ge1xuICAgICAgICAgIHJldHVybiBkaXIuZGlyZWN0b3J5O1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHByb2ZpbGVzID0gZGV0YWlscy5jaGlsZHJlbi5maWx0ZXIoKGRpcikgPT4ge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBmaWxlcyA9IGRldGFpbHMuY2hpbGRyZW4uZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICAgICAgcmV0dXJuICFmaWxlLmRpcmVjdG9yeTtcbiAgICAgICAgfSk7XG4gICAgICAgIGRpcmVjdG9yaWVzID0gZGlyZWN0b3JpZXMuc29ydEJ5KChkaXIpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGlyLm5hbWU7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9maWxlcyA9IHByb2ZpbGVzLnNvcnRCeSgoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRpci5uYW1lO1xuICAgICAgICB9KTtcbiAgICAgICAgZmlsZXMgPSBmaWxlcy5zb3J0QnkoKGZpbGUpID0+IHtcbiAgICAgICAgICByZXR1cm4gZmlsZS5uYW1lO1xuICAgICAgICB9KVxuICAgICAgICAgIC5zb3J0QnkoKGZpbGUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmaWxlLm5hbWUuc3BsaXQoJy4nKS5sYXN0KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIC8vIEFsc28gZW5yaWNoIHRoZSByZXNwb25zZSB3aXRoIHRoZSBjdXJyZW50IGJyYW5jaCwgYXMgdGhhdCdzIHBhcnQgb2YgdGhlIGNvb3JkaW5hdGUgZm9yIGxvY2F0aW5nIHRoZSBhY3R1YWwgZmlsZSBpbiBnaXRcbiAgICAgICAgJHNjb3BlLmNoaWxkcmVuID0gKDxhbnk+QXJyYXkpLmNyZWF0ZShkaXJlY3RvcmllcywgcHJvZmlsZXMsIGZpbGVzKS5tYXAoKGZpbGUpID0+IHtcbiAgICAgICAgICBmaWxlLmJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgICAgICAgZmlsZS5maWxlTmFtZSA9IGZpbGUubmFtZTtcbiAgICAgICAgICBpZiAoZmlsZS5kaXJlY3RvcnkpIHtcbiAgICAgICAgICAgIGZpbGUuZmlsZU5hbWUgKz0gXCIuemlwXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZpbGUuZG93bmxvYWRVUkwgPSBXaWtpLmdpdFJlc3RVUkwoJHNjb3BlLCBmaWxlLnBhdGgpO1xuICAgICAgICAgIHJldHVybiBmaWxlO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuXG4gICAgICAkc2NvcGUuaHRtbCA9IG51bGw7XG4gICAgICAkc2NvcGUuc291cmNlID0gbnVsbDtcbiAgICAgICRzY29wZS5yZWFkTWVQYXRoID0gbnVsbDtcblxuICAgICAgJHNjb3BlLmlzRmlsZSA9IGZhbHNlO1xuICAgICAgaWYgKCRzY29wZS5jaGlsZHJlbikge1xuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgncGFuZS5vcGVuJyk7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSByZWFkbWUgdGhlbiBsZXRzIHJlbmRlciBpdC4uLlxuICAgICAgICB2YXIgaXRlbSA9ICRzY29wZS5jaGlsZHJlbi5maW5kKChpbmZvKSA9PiB7XG4gICAgICAgICAgdmFyIG5hbWUgPSAoaW5mby5uYW1lIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgdmFyIGV4dCA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgICAgICAgcmV0dXJuIG5hbWUgJiYgZXh0ICYmICgobmFtZS5zdGFydHNXaXRoKFwicmVhZG1lLlwiKSB8fCBuYW1lID09PSBcInJlYWRtZVwiKSB8fCAobmFtZS5zdGFydHNXaXRoKFwiaW5kZXguXCIpIHx8IG5hbWUgPT09IFwiaW5kZXhcIikpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICB2YXIgcGFnZU5hbWUgPSBpdGVtLnBhdGg7XG4gICAgICAgICAgJHNjb3BlLnJlYWRNZVBhdGggPSBwYWdlTmFtZTtcbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIHBhZ2VOYW1lLCAkc2NvcGUub2JqZWN0SWQsIChyZWFkbWVEZXRhaWxzKSA9PiB7XG4gICAgICAgICAgICB2aWV3Q29udGVudHMocGFnZU5hbWUsIHJlYWRtZURldGFpbHMudGV4dCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGt1YmVybmV0ZXNKc29uID0gJHNjb3BlLmNoaWxkcmVuLmZpbmQoKGNoaWxkKSA9PiB7XG4gICAgICAgICAgdmFyIG5hbWUgPSAoY2hpbGQubmFtZSB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgIHZhciBleHQgPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgICAgICAgIHJldHVybiBuYW1lICYmIGV4dCAmJiBuYW1lLnN0YXJ0c1dpdGgoXCJrdWJlcm5ldGVzXCIpICYmIGV4dCA9PT0gXCJqc29uXCI7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoa3ViZXJuZXRlc0pzb24pIHtcbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGt1YmVybmV0ZXNKc29uLnBhdGgsIHVuZGVmaW5lZCwgKGpzb24pID0+IHtcbiAgICAgICAgICAgIGlmIChqc29uICYmIGpzb24udGV4dCkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICRzY29wZS5rdWJlcm5ldGVzSnNvbiA9IGFuZ3VsYXIuZnJvbUpzb24oanNvbi50ZXh0KTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS5rdWJlcm5ldGVzSnNvbiA9IHtcbiAgICAgICAgICAgICAgICAgIGVycm9yUGFyc2luZzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgIGVycm9yOiBlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAkc2NvcGUuc2hvd0FwcEhlYWRlciA9IHRydWU7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ1dpa2kuVmlld1BhZ2UuQ2hpbGRyZW4nLCAkc2NvcGUucGFnZUlkLCAkc2NvcGUuY2hpbGRyZW4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ3BhbmUuY2xvc2UnKTtcbiAgICAgICAgdmFyIHBhZ2VOYW1lID0gJHNjb3BlLnBhZ2VJZDtcbiAgICAgICAgdmlld0NvbnRlbnRzKHBhZ2VOYW1lLCBjb250ZW50cyk7XG4gICAgICAgICRzY29wZS5pc0ZpbGUgPSB0cnVlO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja0ZpbGVFeGlzdHMocGF0aCkge1xuICAgICAgJHNjb3BlLm9wZXJhdGlvbkNvdW50ZXIgKz0gMTtcbiAgICAgIHZhciBjb3VudGVyID0gJHNjb3BlLm9wZXJhdGlvbkNvdW50ZXI7XG4gICAgICBpZiAocGF0aCkge1xuICAgICAgICB3aWtpUmVwb3NpdG9yeS5leGlzdHMoJHNjb3BlLmJyYW5jaCwgcGF0aCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIC8vIGZpbHRlciBvbGQgcmVzdWx0c1xuICAgICAgICAgIGlmICgkc2NvcGUub3BlcmF0aW9uQ291bnRlciA9PT0gY291bnRlcikge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiY2hlY2tGaWxlRXhpc3RzIGZvciBwYXRoIFwiICsgcGF0aCArIFwiIGdvdCByZXN1bHQgXCIgKyByZXN1bHQpO1xuICAgICAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gcmVzdWx0ID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IHJlc3VsdCA/IHJlc3VsdC5uYW1lIDogbnVsbDtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGxvZy5kZWJ1ZyhcIklnbm9yaW5nIG9sZCByZXN1bHRzIGZvciBcIiArIHBhdGgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2FsbGVkIGJ5IGhhd3RpbyBUT0MgZGlyZWN0aXZlLi4uXG4gICAgJHNjb3BlLmdldENvbnRlbnRzID0gKGZpbGVuYW1lLCBjYikgPT4ge1xuICAgICAgdmFyIHBhZ2VJZCA9IGZpbGVuYW1lO1xuICAgICAgaWYgKCRzY29wZS5kaXJlY3RvcnkpIHtcbiAgICAgICAgcGFnZUlkID0gJHNjb3BlLnBhZ2VJZCArICcvJyArIGZpbGVuYW1lO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBhdGhQYXJ0cyA9ICRzY29wZS5wYWdlSWQuc3BsaXQoJy8nKTtcbiAgICAgICAgcGF0aFBhcnRzID0gcGF0aFBhcnRzLnJlbW92ZShwYXRoUGFydHMubGFzdCgpKTtcbiAgICAgICAgcGF0aFBhcnRzLnB1c2goZmlsZW5hbWUpO1xuICAgICAgICBwYWdlSWQgPSBwYXRoUGFydHMuam9pbignLycpO1xuICAgICAgfVxuICAgICAgbG9nLmRlYnVnKFwicGFnZUlkOiBcIiwgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICBsb2cuZGVidWcoXCJicmFuY2g6IFwiLCAkc2NvcGUuYnJhbmNoKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImZpbGVuYW1lOiBcIiwgZmlsZW5hbWUpO1xuICAgICAgbG9nLmRlYnVnKFwidXNpbmcgcGFnZUlkOiBcIiwgcGFnZUlkKTtcbiAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGFnZUlkLCB1bmRlZmluZWQsIChkYXRhKSA9PiB7XG4gICAgICAgIGNiKGRhdGEudGV4dCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG5cbiAgICBmdW5jdGlvbiBnZXRSZW5hbWVGaWxlUGF0aCgpIHtcbiAgICAgIHZhciBuZXdGaWxlTmFtZSA9ICRzY29wZS5yZW5hbWUubmV3RmlsZU5hbWU7XG4gICAgICByZXR1cm4gKCRzY29wZS5wYWdlSWQgJiYgbmV3RmlsZU5hbWUpID8gVXJsSGVscGVycy5qb2luKCRzY29wZS5wYWdlSWQsIG5ld0ZpbGVOYW1lKSA6IG51bGw7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCBpbnRlcmZhY2UgV2lraURpYWxvZyB7XG4gICAgb3BlbjogKCkgPT4ge307XG4gICAgY2xvc2U6ICgpID0+IHt9O1xuICB9XG5cbiAgZXhwb3J0IGludGVyZmFjZSBSZW5hbWVEaWFsb2dPcHRpb25zIHtcbiAgICByZW5hbWU6ICgpID0+IHt9O1xuICAgIGZpbGVFeGlzdHM6ICgpID0+IHt9O1xuICAgIGZpbGVOYW1lOiAoKSA9PiBTdHJpbmc7XG4gICAgY2FsbGJhY2tzOiAoKSA9PiBTdHJpbmc7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0UmVuYW1lRGlhbG9nKCRkaWFsb2csICRzY29wZTpSZW5hbWVEaWFsb2dPcHRpb25zKTpXaWtpLldpa2lEaWFsb2cge1xuICAgIHJldHVybiAkZGlhbG9nLmRpYWxvZyh7XG4gICAgICByZXNvbHZlOiAkc2NvcGUsXG4gICAgICB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL21vZGFsL3JlbmFtZURpYWxvZy5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcImRpYWxvZ1wiLCAgXCJjYWxsYmFja3NcIiwgXCJyZW5hbWVcIiwgXCJmaWxlRXhpc3RzXCIsIFwiZmlsZU5hbWVcIiwgKCRzY29wZSwgZGlhbG9nLCBjYWxsYmFja3MsIHJlbmFtZSwgZmlsZUV4aXN0cywgZmlsZU5hbWUpID0+IHtcbiAgICAgICAgJHNjb3BlLnJlbmFtZSAgPSByZW5hbWU7XG4gICAgICAgICRzY29wZS5maWxlRXhpc3RzICA9IGZpbGVFeGlzdHM7XG4gICAgICAgICRzY29wZS5maWxlTmFtZSAgPSBmaWxlTmFtZTtcblxuICAgICAgICAkc2NvcGUuY2xvc2UgPSAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgZGlhbG9nLmNsb3NlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnJlbmFtZUFuZENsb3NlRGlhbG9nID0gY2FsbGJhY2tzO1xuXG4gICAgICB9XVxuICAgIH0pO1xuICB9XG5cbiAgZXhwb3J0IGludGVyZmFjZSBNb3ZlRGlhbG9nT3B0aW9ucyB7XG4gICAgbW92ZTogKCkgPT4ge307XG4gICAgZm9sZGVyTmFtZXM6ICgpID0+IHt9O1xuICAgIGNhbGxiYWNrczogKCkgPT4gU3RyaW5nO1xuICB9XG5cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0TW92ZURpYWxvZygkZGlhbG9nLCAkc2NvcGU6TW92ZURpYWxvZ09wdGlvbnMpOldpa2kuV2lraURpYWxvZyB7XG4gICAgcmV0dXJuICRkaWFsb2cuZGlhbG9nKHtcbiAgICAgIHJlc29sdmU6ICRzY29wZSxcbiAgICAgIHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvbW9kYWwvbW92ZURpYWxvZy5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcImRpYWxvZ1wiLCAgXCJjYWxsYmFja3NcIiwgXCJtb3ZlXCIsIFwiZm9sZGVyTmFtZXNcIiwgKCRzY29wZSwgZGlhbG9nLCBjYWxsYmFja3MsIG1vdmUsIGZvbGRlck5hbWVzKSA9PiB7XG4gICAgICAgICRzY29wZS5tb3ZlICA9IG1vdmU7XG4gICAgICAgICRzY29wZS5mb2xkZXJOYW1lcyAgPSBmb2xkZXJOYW1lcztcblxuICAgICAgICAkc2NvcGUuY2xvc2UgPSAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgZGlhbG9nLmNsb3NlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLm1vdmVBbmRDbG9zZURpYWxvZyA9IGNhbGxiYWNrcztcblxuICAgICAgfV1cbiAgICB9KTtcbiAgfVxuXG5cbiAgZXhwb3J0IGludGVyZmFjZSBEZWxldGVEaWFsb2dPcHRpb25zIHtcbiAgICBjYWxsYmFja3M6ICgpID0+IFN0cmluZztcbiAgICBzZWxlY3RlZEZpbGVIdG1sOiAoKSA9PiBTdHJpbmc7XG4gICAgd2FybmluZzogKCkgPT4gc3RyaW5nO1xuICB9XG5cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0RGVsZXRlRGlhbG9nKCRkaWFsb2csICRzY29wZTpEZWxldGVEaWFsb2dPcHRpb25zKTpXaWtpLldpa2lEaWFsb2cge1xuICAgIHJldHVybiAkZGlhbG9nLmRpYWxvZyh7XG4gICAgICByZXNvbHZlOiAkc2NvcGUsXG4gICAgICB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL21vZGFsL2RlbGV0ZURpYWxvZy5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcImRpYWxvZ1wiLCAgXCJjYWxsYmFja3NcIiwgXCJzZWxlY3RlZEZpbGVIdG1sXCIsIFwid2FybmluZ1wiLCAoJHNjb3BlLCBkaWFsb2csIGNhbGxiYWNrcywgc2VsZWN0ZWRGaWxlSHRtbCwgd2FybmluZykgPT4ge1xuXG4gICAgICAgICRzY29wZS5zZWxlY3RlZEZpbGVIdG1sID0gc2VsZWN0ZWRGaWxlSHRtbDtcblxuICAgICAgICAkc2NvcGUuY2xvc2UgPSAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgZGlhbG9nLmNsb3NlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmRlbGV0ZUFuZENsb3NlRGlhbG9nID0gY2FsbGJhY2tzO1xuXG4gICAgICAgICRzY29wZS53YXJuaW5nID0gd2FybmluZztcbiAgICAgIH1dXG4gICAgfSk7XG4gIH1cblxuXG5cblxuXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmRpcmVjdGl2ZSgnd2lraUhyZWZBZGp1c3RlcicsIFtcIiRsb2NhdGlvblwiLCAoJGxvY2F0aW9uKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICBsaW5rOiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHIpID0+IHtcblxuICAgICAgICAkZWxlbWVudC5iaW5kKCdET01Ob2RlSW5zZXJ0ZWQnLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICB2YXIgYXlzID0gJGVsZW1lbnQuZmluZCgnYScpO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChheXMsIChhKSA9PiB7XG4gICAgICAgICAgICBpZiAoYS5oYXNBdHRyaWJ1dGUoJ25vLWFkanVzdCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGEgPSAkKGEpO1xuICAgICAgICAgICAgdmFyIGhyZWYgPSAoYS5hdHRyKCdocmVmJykgfHwgXCJcIikudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGhyZWYpIHtcbiAgICAgICAgICAgICAgdmFyIGZpbGVFeHRlbnNpb24gPSBhLmF0dHIoJ2ZpbGUtZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgIHZhciBuZXdWYWx1ZSA9IFdpa2kuYWRqdXN0SHJlZigkc2NvcGUsICRsb2NhdGlvbiwgaHJlZiwgZmlsZUV4dGVuc2lvbik7XG4gICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGEuYXR0cignaHJlZicsIG5ld1ZhbHVlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHZhciBpbWdzID0gJGVsZW1lbnQuZmluZCgnaW1nJyk7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGltZ3MsIChhKSA9PiB7XG4gICAgICAgICAgICBpZiAoYS5oYXNBdHRyaWJ1dGUoJ25vLWFkanVzdCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGEgPSAkKGEpO1xuICAgICAgICAgICAgdmFyIGhyZWYgPSAoYS5hdHRyKCdzcmMnKSB8fCBcIlwiKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoaHJlZikge1xuICAgICAgICAgICAgICBpZiAoaHJlZi5zdGFydHNXaXRoKFwiL1wiKSkge1xuICAgICAgICAgICAgICAgIGhyZWYgPSBDb3JlLnVybChocmVmKTtcbiAgICAgICAgICAgICAgICBhLmF0dHIoJ3NyYycsIGhyZWYpO1xuXG4gICAgICAgICAgICAgICAgLy8gbGV0cyBhdm9pZCB0aGlzIGVsZW1lbnQgYmVpbmcgcmVwcm9jZXNzZWRcbiAgICAgICAgICAgICAgICBhLmF0dHIoJ25vLWFkanVzdCcsICd0cnVlJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICBfbW9kdWxlLmRpcmVjdGl2ZSgnd2lraVRpdGxlTGlua2VyJywgW1wiJGxvY2F0aW9uXCIsICgkbG9jYXRpb24pID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgIGxpbms6ICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cikgPT4ge1xuICAgICAgICB2YXIgbG9hZGVkID0gZmFsc2U7XG5cbiAgICAgICAgZnVuY3Rpb24gb2Zmc2V0VG9wKGVsZW1lbnRzKSB7XG4gICAgICAgICAgaWYgKGVsZW1lbnRzKSB7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gZWxlbWVudHMub2Zmc2V0KCk7XG4gICAgICAgICAgICBpZiAob2Zmc2V0KSB7XG4gICAgICAgICAgICAgIHJldHVybiBvZmZzZXQudG9wO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNjcm9sbFRvSGFzaCgpIHtcbiAgICAgICAgICB2YXIgYW5zd2VyID0gZmFsc2U7XG4gICAgICAgICAgdmFyIGlkID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiaGFzaFwiXTtcbiAgICAgICAgICByZXR1cm4gc2Nyb2xsVG9JZChpZCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzY3JvbGxUb0lkKGlkKSB7XG4gICAgICAgICAgdmFyIGFuc3dlciA9IGZhbHNlO1xuICAgICAgICAgIHZhciBpZCA9ICRsb2NhdGlvbi5zZWFyY2goKVtcImhhc2hcIl07XG4gICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0b3IgPSAnYVtuYW1lPVwiJyArIGlkICsgJ1wiXSc7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0RWxlbWVudHMgPSAkZWxlbWVudC5maW5kKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIGlmICh0YXJnZXRFbGVtZW50cyAmJiB0YXJnZXRFbGVtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdmFyIHNjcm9sbER1cmF0aW9uID0gMTtcbiAgICAgICAgICAgICAgdmFyIGRlbHRhID0gb2Zmc2V0VG9wKCQoJGVsZW1lbnQpKTtcbiAgICAgICAgICAgICAgdmFyIHRvcCA9IG9mZnNldFRvcCh0YXJnZXRFbGVtZW50cykgLSBkZWx0YTtcbiAgICAgICAgICAgICAgaWYgKHRvcCA8IDApIHtcbiAgICAgICAgICAgICAgICB0b3AgPSAwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vbG9nLmluZm8oXCJzY3JvbGxpbmcgdG8gaGFzaDogXCIgKyBpZCArIFwiIHRvcDogXCIgKyB0b3AgKyBcIiBkZWx0YTpcIiArIGRlbHRhKTtcbiAgICAgICAgICAgICAgJCgnYm9keSxodG1sJykuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2Nyb2xsVG9wOiB0b3BcbiAgICAgICAgICAgICAgfSwgc2Nyb2xsRHVyYXRpb24pO1xuICAgICAgICAgICAgICBhbnN3ZXIgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy9sb2cuaW5mbyhcImNvdWxkIGZpbmQgZWxlbWVudCBmb3I6IFwiICsgc2VsZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkTGlua3MoZXZlbnQpIHtcbiAgICAgICAgICB2YXIgaGVhZGluZ3MgPSAkZWxlbWVudC5maW5kKCdoMSxoMixoMyxoNCxoNSxoNixoNycpO1xuICAgICAgICAgIHZhciB1cGRhdGVkID0gZmFsc2U7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGhlYWRpbmdzLCAoaGUpID0+IHtcbiAgICAgICAgICAgIHZhciBoMSA9ICQoaGUpO1xuICAgICAgICAgICAgLy8gbm93IGxldHMgdHJ5IGZpbmQgYSBjaGlsZCBoZWFkZXJcbiAgICAgICAgICAgIHZhciBhID0gaDEucGFyZW50KFwiYVwiKTtcbiAgICAgICAgICAgIGlmICghYSB8fCAhYS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdmFyIHRleHQgPSBoMS50ZXh0KCk7XG4gICAgICAgICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9IHRleHQucmVwbGFjZSgvIC9nLCBcIi1cIik7XG4gICAgICAgICAgICAgICAgdmFyIHBhdGhXaXRoSGFzaCA9IFwiI1wiICsgJGxvY2F0aW9uLnBhdGgoKSArIFwiP2hhc2g9XCIgKyB0YXJnZXQ7XG4gICAgICAgICAgICAgICAgdmFyIGxpbmsgPSBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBwYXRoV2l0aEhhc2gsIFsnaGFzaCddKTtcblxuICAgICAgICAgICAgICAgIC8vIGxldHMgd3JhcCB0aGUgaGVhZGluZyBpbiBhIGxpbmtcbiAgICAgICAgICAgICAgICB2YXIgbmV3QSA9ICQoJzxhIG5hbWU9XCInICsgdGFyZ2V0ICsgJ1wiIGhyZWY9XCInICsgbGluayArICdcIiBuZy1jbGljaz1cIm9uTGlua0NsaWNrKClcIj48L2E+Jyk7XG4gICAgICAgICAgICAgICAgbmV3QS5vbihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsVG9JZCh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIG5ld0EuaW5zZXJ0QmVmb3JlKGgxKTtcbiAgICAgICAgICAgICAgICBoMS5kZXRhY2goKTtcbiAgICAgICAgICAgICAgICBuZXdBLmFwcGVuZChoMSk7XG4gICAgICAgICAgICAgICAgdXBkYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAodXBkYXRlZCAmJiAhbG9hZGVkKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHNjcm9sbFRvSGFzaCgpKSB7XG4gICAgICAgICAgICAgICAgbG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG9uRXZlbnRJbnNlcnRlZChldmVudCkge1xuICAgICAgICAgIC8vIGF2b2lkIGFueSBtb3JlIGV2ZW50cyB3aGlsZSB3ZSBkbyBvdXIgdGhpbmdcbiAgICAgICAgICAkZWxlbWVudC51bmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIG9uRXZlbnRJbnNlcnRlZCk7XG4gICAgICAgICAgYWRkTGlua3MoZXZlbnQpO1xuICAgICAgICAgICRlbGVtZW50LmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIG9uRXZlbnRJbnNlcnRlZCk7XG4gICAgICAgIH1cblxuICAgICAgICAkZWxlbWVudC5iaW5kKCdET01Ob2RlSW5zZXJ0ZWQnLCBvbkV2ZW50SW5zZXJ0ZWQpO1xuICAgICAgfVxuICAgIH07XG4gIH1dKTtcblxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuXG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBEZXZlbG9wZXIuY3VzdG9tUHJvamVjdFN1YlRhYkZhY3Rvcmllcy5wdXNoKFxuICAgIChjb250ZXh0KSA9PiB7XG4gICAgICB2YXIgcHJvamVjdExpbmsgPSBjb250ZXh0LnByb2plY3RMaW5rO1xuICAgICAgdmFyIHdpa2lMaW5rID0gbnVsbDtcbiAgICAgIGlmIChwcm9qZWN0TGluaykge1xuICAgICAgICB3aWtpTGluayA9IFVybEhlbHBlcnMuam9pbihwcm9qZWN0TGluaywgXCJ3aWtpXCIsIFwidmlld1wiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlzVmFsaWQ6ICgpID0+IHdpa2lMaW5rICYmIERldmVsb3Blci5mb3JnZVJlYWR5TGluaygpLFxuICAgICAgICBocmVmOiB3aWtpTGluayxcbiAgICAgICAgbGFiZWw6IFwiU291cmNlXCIsXG4gICAgICAgIHRpdGxlOiBcIkJyb3dzZSB0aGUgc291cmNlIGNvZGUgb2YgdGhpcyBwcm9qZWN0XCJcbiAgICAgIH07XG4gICAgfSk7XG5cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlU291cmNlQnJlYWRjcnVtYnMoJHNjb3BlKSB7XG4gICAgdmFyIHNvdXJjZUxpbmsgPSAkc2NvcGUuJHZpZXdMaW5rIHx8IFVybEhlbHBlcnMuam9pbihzdGFydExpbmsoJHNjb3BlKSwgXCJ2aWV3XCIpO1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIGxhYmVsOiBcIlNvdXJjZVwiLFxuICAgICAgICBocmVmOiBzb3VyY2VMaW5rLFxuICAgICAgICB0aXRsZTogXCJCcm93c2UgdGhlIHNvdXJjZSBjb2RlIG9mIHRoaXMgcHJvamVjdFwiXG4gICAgICB9XG4gICAgXVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVkaXRpbmdCcmVhZGNydW1iKCRzY29wZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGFiZWw6IFwiRWRpdGluZ1wiLFxuICAgICAgICB0aXRsZTogXCJFZGl0aW5nIHRoaXMgZmlsZVwiXG4gICAgICB9O1xuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIC8qKlxuICAgKiBAY2xhc3MgR2l0V2lraVJlcG9zaXRvcnlcbiAgICovXG4gIGV4cG9ydCBjbGFzcyBHaXRXaWtpUmVwb3NpdG9yeSB7XG4gICAgcHVibGljIGRpcmVjdG9yeVByZWZpeCA9IFwiXCI7XG4gICAgcHJpdmF0ZSAkaHR0cDtcbiAgICBwcml2YXRlIGNvbmZpZztcbiAgICBwcml2YXRlIGJhc2VVcmw7XG5cblxuICAgIGNvbnN0cnVjdG9yKCRzY29wZSkge1xuICAgICAgdmFyIEZvcmdlQXBpVVJMID0gS3ViZXJuZXRlcy5pbmplY3QoXCJGb3JnZUFwaVVSTFwiKTtcbiAgICAgIHRoaXMuJGh0dHAgPSBLdWJlcm5ldGVzLmluamVjdChcIiRodHRwXCIpO1xuICAgICAgdGhpcy5jb25maWcgPSBGb3JnZS5jcmVhdGVIdHRwQ29uZmlnKCk7XG4gICAgICB2YXIgb3duZXIgPSAkc2NvcGUub3duZXI7XG4gICAgICB2YXIgcmVwb05hbWUgPSAkc2NvcGUucmVwb0lkO1xuICAgICAgdmFyIHByb2plY3RJZCA9ICRzY29wZS5wcm9qZWN0SWQ7XG4gICAgICB2YXIgbnMgPSAkc2NvcGUubmFtZXNwYWNlIHx8IEt1YmVybmV0ZXMuY3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoKTtcbiAgICAgIHRoaXMuYmFzZVVybCA9IFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJyZXBvcy9wcm9qZWN0XCIsIG5zLCBwcm9qZWN0SWQpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRQYWdlKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBvYmplY3RJZDpzdHJpbmcsIGZuKSB7XG4gICAgICAvLyBUT0RPIGlnbm9yaW5nIG9iamVjdElkXG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJjb250ZW50XCIsIHBhdGggfHwgXCIvXCIpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBkZXRhaWxzOiBhbnkgPSBudWxsO1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goZGF0YSwgKGZpbGUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWZpbGUuZGlyZWN0b3J5ICYmIGZpbGUudHlwZSA9PT0gXCJkaXJcIikge1xuICAgICAgICAgICAgICAgICAgZmlsZS5kaXJlY3RvcnkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGRldGFpbHMgPSB7XG4gICAgICAgICAgICAgICAgZGlyZWN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBkYXRhXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGRldGFpbHMgPSBkYXRhO1xuICAgICAgICAgICAgICB2YXIgY29udGVudCA9IGRhdGEuY29udGVudDtcbiAgICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICBkZXRhaWxzLnRleHQgPSBjb250ZW50LmRlY29kZUJhc2U2NCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmbihkZXRhaWxzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBwdXRQYWdlKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBjb250ZW50czpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgdmFyIGJvZHkgPSBjb250ZW50cztcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcImNvbnRlbnRcIiwgcGF0aCB8fCBcIi9cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBoaXN0b3J5IG9mIHRoZSByZXBvc2l0b3J5IG9yIGEgc3BlY2lmaWMgZGlyZWN0b3J5IG9yIGZpbGUgcGF0aFxuICAgICAqIEBtZXRob2QgaGlzdG9yeVxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYnJhbmNoXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gbGltaXRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgaGlzdG9yeShicmFuY2g6c3RyaW5nLCBvYmplY3RJZDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBsaW1pdDpudW1iZXIsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGxpbWl0KSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJsaW1pdD1cIiArIGxpbWl0O1xuICAgICAgfVxuICAgICAgdmFyIGNvbW1pdElkID0gb2JqZWN0SWQgfHwgYnJhbmNoO1xuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJoaXN0b3J5XCIsIGNvbW1pdElkLCBwYXRoKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgY29tbWl0SW5mbyhjb21taXRJZDpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJjb21taXRJbmZvXCIsIGNvbW1pdElkKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgY29tbWl0RGV0YWlsKGNvbW1pdElkOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImNvbW1pdERldGFpbFwiLCBjb21taXRJZCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGNvbW1pdFRyZWUoY29tbWl0SWQ6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiY29tbWl0VHJlZVwiLCBjb21taXRJZCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBhIGRpZmYgb24gdGhlIHZlcnNpb25zXG4gICAgICogQG1ldGhvZCBkaWZmXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RJZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBiYXNlT2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBkaWZmKG9iamVjdElkOnN0cmluZywgYmFzZU9iamVjdElkOnN0cmluZywgcGF0aDpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdmFyIGNvbmZpZzogYW55ID0gRm9yZ2UuY3JlYXRlSHR0cENvbmZpZygpO1xuICAgICAgY29uZmlnLnRyYW5zZm9ybVJlc3BvbnNlID0gKGRhdGEsIGhlYWRlcnNHZXR0ZXIsIHN0YXR1cykgPT4ge1xuICAgICAgICBsb2cuaW5mbyhcImdvdCBkaWZmIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgfTtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiZGlmZlwiLCBvYmplY3RJZCwgYmFzZU9iamVjdElkLCBwYXRoKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIHZhciBkZXRhaWxzID0ge1xuICAgICAgICAgICAgdGV4dDogZGF0YSxcbiAgICAgICAgICAgIGZvcm1hdDogXCJkaWZmXCIsXG4gICAgICAgICAgICBkaXJlY3Rvcnk6IGZhbHNlXG4gICAgICAgICAgfTtcbiAgICAgICAgICBmbihkZXRhaWxzKTtcbiAgICAgICAgfSxcbiAgICAgICAgbnVsbCwgY29uZmlnKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgbGlzdCBvZiBicmFuY2hlc1xuICAgICAqIEBtZXRob2QgYnJhbmNoZXNcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGJyYW5jaGVzKGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdGhpcy5kb0dldChcImxpc3RCcmFuY2hlc1wiLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBleGlzdHMoYnJhbmNoOnN0cmluZywgcGF0aDpzdHJpbmcsIGZuKTogQm9vbGVhbiB7XG4gICAgICB2YXIgYW5zd2VyID0gZmFsc2U7XG4gICAgICB0aGlzLmdldFBhZ2UoYnJhbmNoLCBwYXRoLCBudWxsLCAoZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZGF0YS5kaXJlY3RvcnkpIHtcbiAgICAgICAgICBpZiAoZGF0YS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgbG9nLmluZm8oXCJleGlzdHMgXCIgKyBwYXRoICsgXCIgYW5zd2VyID0gXCIgKyBhbnN3ZXIpO1xuICAgICAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKGZuKSkge1xuICAgICAgICAgIGZuKGFuc3dlcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmV2ZXJ0VG8oYnJhbmNoOnN0cmluZywgb2JqZWN0SWQ6c3RyaW5nLCBibG9iUGF0aDpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgaWYgKCFjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBcIiArIGJsb2JQYXRoICsgXCIgY29tbWl0IFwiICsgKG9iamVjdElkIHx8IGJyYW5jaCk7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IFwiXCI7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJyZXZlcnRcIiwgb2JqZWN0SWQsIGJsb2JQYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVuYW1lKGJyYW5jaDpzdHJpbmcsIG9sZFBhdGg6c3RyaW5nLCAgbmV3UGF0aDpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgaWYgKCFjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIGNvbW1pdE1lc3NhZ2UgPSBcIlJlbmFtaW5nIHBhZ2UgXCIgKyBvbGRQYXRoICsgXCIgdG8gXCIgKyBuZXdQYXRoO1xuICAgICAgfVxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgaWYgKG9sZFBhdGgpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm9sZD1cIiArIGVuY29kZVVSSUNvbXBvbmVudChvbGRQYXRoKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gXCJcIjtcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcIm12XCIsIG5ld1BhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyByZW1vdmVQYWdlKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW1vdmluZyBwYWdlIFwiICsgcGF0aDtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gXCJcIjtcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcInJtXCIsIHBhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyByZW1vdmVQYWdlcyhicmFuY2g6c3RyaW5nLCBwYXRoczpBcnJheTxzdHJpbmc+LCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW1vdmluZyBwYWdlXCIgKyAocGF0aHMubGVuZ3RoID4gMSA/IFwic1wiIDogXCJcIikgKyBcIiBcIiArIHBhdGhzLmpvaW4oXCIsIFwiKTtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gcGF0aHM7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJybVwiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuXG4gICAgcHJpdmF0ZSBkb0dldChwYXRoLCBxdWVyeSwgc3VjY2Vzc0ZuLCBlcnJvckZuID0gbnVsbCwgY29uZmlnID0gbnVsbCkge1xuICAgICAgdmFyIHVybCA9IEZvcmdlLmNyZWF0ZUh0dHBVcmwoVXJsSGVscGVycy5qb2luKHRoaXMuYmFzZVVybCwgcGF0aCkpO1xuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHVybCArPSBcIiZcIiArIHF1ZXJ5O1xuICAgICAgfVxuICAgICAgaWYgKCFlcnJvckZuKSB7XG4gICAgICAgIGVycm9yRm4gPSAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkISBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgfVxuICAgICAgaWYgKCFjb25maWcpIHtcbiAgICAgICAgY29uZmlnID0gdGhpcy5jb25maWc7XG4gICAgICB9XG4gICAgICB0aGlzLiRodHRwLmdldCh1cmwsIGNvbmZpZykuXG4gICAgICAgIHN1Y2Nlc3Moc3VjY2Vzc0ZuKS5cbiAgICAgICAgZXJyb3IoZXJyb3JGbik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBkb1Bvc3QocGF0aCwgcXVlcnksIGJvZHksIHN1Y2Nlc3NGbiwgZXJyb3JGbiA9IG51bGwpIHtcbiAgICAgIHZhciB1cmwgPSBGb3JnZS5jcmVhdGVIdHRwVXJsKFVybEhlbHBlcnMuam9pbih0aGlzLmJhc2VVcmwsIHBhdGgpKTtcbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB1cmwgKz0gXCImXCIgKyBxdWVyeTtcbiAgICAgIH1cbiAgICAgIGlmICghZXJyb3JGbikge1xuICAgICAgICBlcnJvckZuID0gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCEgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgIH1cbiAgICAgIHRoaXMuJGh0dHAucG9zdCh1cmwsIGJvZHksIHRoaXMuY29uZmlnKS5cbiAgICAgICAgc3VjY2VzcyhzdWNjZXNzRm4pLlxuICAgICAgICBlcnJvcihlcnJvckZuKTtcbiAgICB9XG5cblxuICAgIHByaXZhdGUgZG9Qb3N0Rm9ybShwYXRoLCBxdWVyeSwgYm9keSwgc3VjY2Vzc0ZuLCBlcnJvckZuID0gbnVsbCkge1xuICAgICAgdmFyIHVybCA9IEZvcmdlLmNyZWF0ZUh0dHBVcmwoVXJsSGVscGVycy5qb2luKHRoaXMuYmFzZVVybCwgcGF0aCkpO1xuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHVybCArPSBcIiZcIiArIHF1ZXJ5O1xuICAgICAgfVxuICAgICAgaWYgKCFlcnJvckZuKSB7XG4gICAgICAgIGVycm9yRm4gPSAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkISBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgfVxuICAgICAgdmFyIGNvbmZpZyA9IEZvcmdlLmNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgIGlmICghY29uZmlnLmhlYWRlcnMpIHtcbiAgICAgICAgY29uZmlnLmhlYWRlcnMgPSB7fTtcbiAgICAgIH1cbiAgICAgIGNvbmZpZy5oZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdID0gXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9dXRmLThcIjtcblxuICAgICAgdGhpcy4kaHR0cC5wb3N0KHVybCwgYm9keSwgY29uZmlnKS5cbiAgICAgICAgc3VjY2VzcyhzdWNjZXNzRm4pLlxuICAgICAgICBlcnJvcihlcnJvckZuKTtcbiAgICB9XG5cblxuXG4gICAgcHVibGljIGNvbXBsZXRlUGF0aChicmFuY2g6c3RyaW5nLCBjb21wbGV0aW9uVGV4dDpzdHJpbmcsIGRpcmVjdG9yaWVzT25seTpib29sZWFuLCBmbikge1xuLypcbiAgICAgIHJldHVybiB0aGlzLmdpdCgpLmNvbXBsZXRlUGF0aChicmFuY2gsIGNvbXBsZXRpb25UZXh0LCBkaXJlY3Rvcmllc09ubHksIGZuKTtcbiovXG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBmdWxsIHBhdGggdG8gdXNlIGluIHRoZSBnaXQgcmVwb1xuICAgICAqIEBtZXRob2QgZ2V0UGF0aFxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEByZXR1cm4ge1N0cmluZ3tcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0UGF0aChwYXRoOnN0cmluZykge1xuICAgICAgdmFyIGRpcmVjdG9yeVByZWZpeCA9IHRoaXMuZGlyZWN0b3J5UHJlZml4O1xuICAgICAgcmV0dXJuIChkaXJlY3RvcnlQcmVmaXgpID8gZGlyZWN0b3J5UHJlZml4ICsgcGF0aCA6IHBhdGg7XG4gICAgfVxuXG4gICAgcHVibGljIGdldExvZ1BhdGgocGF0aDpzdHJpbmcpIHtcbiAgICAgIHJldHVybiBDb3JlLnRyaW1MZWFkaW5nKHRoaXMuZ2V0UGF0aChwYXRoKSwgXCIvXCIpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBjb250ZW50cyBvZiBhIGJsb2JQYXRoIGZvciBhIGdpdmVuIGNvbW1pdCBvYmplY3RJZFxuICAgICAqIEBtZXRob2QgZ2V0Q29udGVudFxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYmxvYlBhdGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0Q29udGVudChvYmplY3RJZDpzdHJpbmcsIGJsb2JQYXRoOnN0cmluZywgZm4pIHtcbi8qXG4gICAgICB2YXIgZnVsbFBhdGggPSB0aGlzLmdldExvZ1BhdGgoYmxvYlBhdGgpO1xuICAgICAgdmFyIGdpdCA9IHRoaXMuZ2l0KCk7XG4gICAgICBpZiAoZ2l0KSB7XG4gICAgICAgIGdpdC5nZXRDb250ZW50KG9iamVjdElkLCBmdWxsUGF0aCwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGdpdDtcbiovXG4gICAgfVxuXG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgSlNPTiBjb250ZW50cyBvZiB0aGUgcGF0aCB3aXRoIG9wdGlvbmFsIG5hbWUgd2lsZGNhcmQgYW5kIHNlYXJjaFxuICAgICAqIEBtZXRob2QganNvbkNoaWxkQ29udGVudHNcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVdpbGRjYXJkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHNlYXJjaFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBqc29uQ2hpbGRDb250ZW50cyhwYXRoOnN0cmluZywgbmFtZVdpbGRjYXJkOnN0cmluZywgc2VhcmNoOnN0cmluZywgZm4pIHtcbi8qXG4gICAgICB2YXIgZnVsbFBhdGggPSB0aGlzLmdldExvZ1BhdGgocGF0aCk7XG4gICAgICB2YXIgZ2l0ID0gdGhpcy5naXQoKTtcbiAgICAgIGlmIChnaXQpIHtcbiAgICAgICAgZ2l0LnJlYWRKc29uQ2hpbGRDb250ZW50KGZ1bGxQYXRoLCBuYW1lV2lsZGNhcmQsIHNlYXJjaCwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGdpdDtcbiovXG4gICAgfVxuXG5cbiAgICBwdWJsaWMgZ2l0KCkge1xuLypcbiAgICAgIHZhciByZXBvc2l0b3J5ID0gdGhpcy5mYWN0b3J5TWV0aG9kKCk7XG4gICAgICBpZiAoIXJlcG9zaXRvcnkpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJObyByZXBvc2l0b3J5IHlldCEgVE9ETyB3ZSBzaG91bGQgdXNlIGEgbG9jYWwgaW1wbCFcIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVwb3NpdG9yeTtcbiovXG4gICAgfVxuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCB2YXIgVG9wTGV2ZWxDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5Ub3BMZXZlbENvbnRyb2xsZXJcIiwgWyckc2NvcGUnLCAnJHJvdXRlJywgJyRyb3V0ZVBhcmFtcycsICgkc2NvcGUsICRyb3V0ZSwgJHJvdXRlUGFyYW1zKSA9PiB7XG5cbiAgfV0pO1xuXG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=

angular.module("fabric8-console-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/forge/html/command.html","<div ng-controller=\"Forge.CommandController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n<!--\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n-->\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <h3>{{schema.info.description}}</h3>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"executing\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-info\">executing...\n        <i class=\"fa fa-spinner fa-spin\"></i>\n      </p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response\">\n    <div class=\"col-md-12\">\n      <p ng-show=\"response.message\" ng-class=\"responseClass\"><span class=\"response-message\">{{response.message}}</span></p>\n      <p ng-show=\"response.output\" ng-class=\"responseClass\"><span class=\"response-output\">{{response.output}}</span></p>\n      <p ng-show=\"response.err\" ng-class=\"bg-warning\"><span class=\"response-err\">{{response.err}}</span></p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response && !invalid\">\n    <div class=\"col-md-12\">\n      <a class=\"btn btn-primary\" href=\"{{completedLink}}\">Done</a>\n      <a class=\"btn btn-default\" ng-click=\"response = null\" ng-hide=\"wizardCompleted\">Hide</a>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"validationError\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-danger\">{{validationError}}</p>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched && !wizardCompleted\">\n        <div hawtio-form-2=\"schema\" entity=\'entity\'></div>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\" ng-hide=\"wizardCompleted\">\n    <div class=\"col-md-2\">\n    </div>\n    <div class=\"col-md-2\">\n      <button class=\"btn btn-primary\"\n              title=\"Perform this command\"\n              ng-show=\"fetched\"\n              ng-disabled=\"executing\"\n              ng-click=\"execute()\">\n        Execute\n      </button>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/commands.html","<div class=\"row\" ng-controller=\"Forge.CommandsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\" ng-show=\"commands.length\">\n      <span ng-show=\"!id\">\n        Command: <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                                css-class=\"input-xxlarge\"\n                                placeholder=\"Filter commands...\"\n                                save-as=\"fabric8-forge-command-filter\"></hawtio-filter>\n      </span>\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched\">\n        <div ng-hide=\"commands.length\" class=\"align-center\">\n          <p class=\"alert alert-info\">There are no commands available!</p>\n        </div>\n        <div ng-show=\"commands.length\">\n        </div>\n        <div ng-show=\"mode == \'table\'\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && commands.length && mode != \'table\'\">\n    <div class=\"row\">\n      <ul>\n        <li class=\"no-list command-selector-folder\" ng-repeat=\"folder in commandSelector.folders\"\n            ng-show=\"commandSelector.showFolder(folder)\">\n          <div class=\"expandable\" ng-class=\"commandSelector.isOpen(folder)\">\n            <div title=\"{{folder.name}}\" class=\"title\">\n              <i class=\"expandable-indicator folder\"></i> <span class=\"folder-title\"\n                                                                ng-show=\"folder.name\">{{folder.name}}</span><span\n                    class=\"folder-title\" ng-hide=\"folder.name\">Uncategorized</span>\n            </div>\n            <div class=\"expandable-body\">\n              <ul>\n                <li class=\"no-list command\" ng-repeat=\"command in folder.commands\"\n                    ng-show=\"commandSelector.showCommand(command)\">\n                  <div class=\"inline-block command-selector-name\"\n                       ng-class=\"commandSelector.getSelectedClass(command)\">\n                    <span class=\"contained c-max\">\n                      <a href=\"{{command.$link}}\"\n                         title=\"{{command.description}}\">\n                        <span class=\"command-name\">{{command.$shortName}}</span>\n                      </a>\n                    </span>\n                  </div>\n                </li>\n              </ul>\n            </div>\n          </div>\n        </li>\n      </ul>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/createProject.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <style>\n    .createProjectPage {\n      padding-top: 40px;\n    }\n  </style>\n\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\"\n         ng-show=\"login.loggedIn && $runningCDPipeline && $gogsLink && $forgeLink\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <!--\n            <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n\n            <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n              <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n              {{login.user}}\n            </div>\n      -->\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && $runningCDPipeline && (!$gogsLink || !$forgeLink)\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p>Waiting for the <b>CD Pipeline</b> application to startup: &nbsp;&nbsp;<i class=\"fa fa-spinner fa-spin\"></i>\n        </p>\n\n        <ul class=\"pending-pods\">\n          <li class=\"ngCellText\" ng-repeat=\"item in $requiredRCs\">\n            <a ng-href=\"{{item | kubernetesPageLink}}\">\n              <img class=\"app-icon-small\" ng-src=\"{{item.$iconUrl}}\" ng-show=\"item.$iconUrl\">\n              <b>{{item.metadata.name}}</b>\n            </a>\n            <a ng-show=\"item.$podCounters.podsLink\" href=\"{{item.$podCounters.podsLink}}\" title=\"View pods\">\n              <span ng-show=\"item.$podCounters.ready\" class=\"badge badge-success\">{{item.$podCounters.ready}}</span>\n              <span ng-show=\"item.$podCounters.valid\" class=\"badge badge-info\">{{item.$podCounters.valid}}</span>\n              <span ng-show=\"item.$podCounters.waiting\" class=\"badge\">{{item.$podCounters.waiting}}</span>\n              <span ng-show=\"item.$podCounters.error\" class=\"badge badge-warning\">{{item.$podCounters.error}}</span>\n            </a>\n          </li>\n        </ul>\n        <p>Please be patient while the above pods are ready!</p>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && !$runningCDPipeline\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p class=\"text-warning\">You are not running the <b>CD Pipeline</b> application in this workspace.</p>\n\n        <p>To be able to create new projects please run it!</p>\n\n        <p><a href=\"{{$runCDPipelineLink}}\" class=\"btn btn-lg btn-default\">Run the <b>CD Pipeline</b></a></p>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"$runningCDPipeline && $gogsLink && $forgeLink && (!login.authHeader || login.relogin)\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository so that you can create a project</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n        <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"model.fetched || !login.authHeader || login.relogin || !$gogsLink ||!$forgeLink\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && login.authHeader && $gogsLink && $forgeLink\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <div class=\"col-md-6\">\n          <p class=\"align-center\">\n            <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n               ng-show=\"login.loggedIn\"\n               title=\"Create a new project in this workspace using a wizard\">\n              <i class=\"fa fa-plus\"></i> Create Project using Wizard\n            </a>\n          </p>\n\n          <p class=\"align-center\">\n            This wizard guides you though creating a new project, the git repository and the related builds and\n            Continuous\n            Delivery Pipelines.\n          </p>\n        </div>\n\n        <div class=\"col-md-6\">\n          <p class=\"align-center\">\n            <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/buildConfigEdit/\"\n               title=\"Import an existing project from a git source control repository\">\n              <i class=\"fa fa-plus\"></i> Import Project from Git\n            </a>\n          </p>\n\n          <p class=\"align-center\">\n            Import a project which already exists in git\n          </p>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/layoutForge.html","<script type=\"text/ng-template\" id=\"idTemplate.html\">\n  <div class=\"ngCellText\">\n    <a href=\"\"\n       title=\"Execute command {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$link}}\">\n      {{row.entity.name}}</a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoTemplate.html\">\n  <div class=\"ngCellText\">\n    <a title=\"View repository {{row.entity.name}}\"\n       ng-href=\"/forge/repos/{{row.entity.name}}\">\n      {{row.entity.name}}\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoActionsTemplate.html\">\n  <div class=\"ngCellText\">\n    <a ng-show=\"row.entity.$openProjectLink\"\n       class=\"btn btn-primary\" target=\"editor\"\n       title=\"Open project {{row.entity.name}} in an editor\"\n       ng-href=\"{{row.entity.$openProjectLink}}\">\n      <i class=\"fa fa-pencil-square\"></i>\n      Open\n    </a>\n    <a ng-show=\"row.entity.html_url\"\n       class=\"btn btn-default\" target=\"browse\"\n       title=\"Browse project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.html_url}}\">\n      <i class=\"fa fa-external-link\"></i>\n      Repository\n    </a>\n    <a ng-show=\"row.entity.$buildsLink\"\n       class=\"btn btn-default\" target=\"builds\"\n       title=\"View builds for this repository {{row.entity.owner.username}}/{{row.entity.name}}\"\n       ng-href=\"{{row.entity.$buildsLink}}\">\n      <i class=\"fa fa-cog\"></i>\n      Builds\n    </a>\n    <a ng-show=\"row.entity.$commandsLink\"\n       class=\"btn btn-default\"\n       title=\"Commands for project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$commandsLink}}\">\n      <i class=\"fa fa-play-circle\"></i>\n      Run...\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"categoryTemplate.html\">\n  <div class=\"ngCellText\">\n    <span class=\"pod-label badge\"\n          class=\"background-light-grey mouse-pointer\">{{row.entity.category}}</span>\n  </div>\n</script>\n\n<div class=\"row\">\n  <div class=\"wiki-icon-view\">\n    <div class=\"row forge-view\" ng-view></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repo.html","<div class=\"row\" ng-controller=\"Forge.RepoController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\"\n              href=\"/forge/repos\"><i class=\"fa fa-list\"></i></a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.$commandsLink\"\n         class=\"btn btn-default pull-right\"\n         title=\"Commands for project {{entity.name}}\"\n         ng-href=\"{{entity.$commandsLink}}\">\n        <i class=\"fa fa-play-circle\"></i>\n        Run...\n      </a>\n      <span class=\"pull-right\" ng-show=\"entity.$buildsLink\">&nbsp;</span>\n      <a ng-show=\"entity.$buildsLink\"\n         class=\"btn btn-primary pull-right\" target=\"builds\"\n         title=\"View builds for this repository {{entity.owner.username}}/{{entity.name}}\"\n         ng-href=\"{{entity.$buildsLink}}\">\n        <i class=\"fa fa-cog\"></i>\n        Builds\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.html_url\"\n         class=\"btn btn-default pull-right\" target=\"browse\"\n         title=\"Browse project {{entity.name}}\"\n         ng-href=\"{{entity.html_url}}\">\n        <i class=\"fa fa-external-link\"></i>\n        Browse\n      </a>\n    </div>\n  </div>\n\n  <div ng-hide=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n  <div ng-show=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <h3 title=\"repository for {{entity.owner.username}}\">\n          <span ng-show=\"entity.owner.username\">\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              <img src=\"{{entity.owner.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"entity.owner.avatar_url\">\n            </a>\n            &nbsp;\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              {{entity.owner.username}}\n            </a>\n             &nbsp;/&nbsp;\n          </span>\n          {{entity.name}}\n        </h3>\n      </div>\n    </div>\n\n    <div class=\"git-clone-tabs\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div class=\"tabbable\">\n            <div value=\"ssh\" class=\"tab-pane\" title=\"SSH\" ng-show=\"entity.ssh_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>ssh</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.ssh_url}}</code>\n                </pre>\n              </div>\n            </div>\n\n            <div value=\"http\" class=\"tab-pane\" title=\"HTTP\" ng-show=\"entity.clone_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>http</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.clone_url}}</code>\n                </pre>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repos.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                     ng-show=\"projects.length\"\n                     css-class=\"input-xxlarge\"\n                     placeholder=\"Filter repositories...\"></hawtio-filter>\n      <!--\n            <span class=\"pull-right\">&nbsp;</span>\n            <button ng-show=\"fetched\"\n                    class=\"btn btn-danger pull-right\"\n                    ng-disabled=\"tableConfig.selectedItems.length == 0\"\n                    ng-click=\"delete(tableConfig.selectedItems)\">\n              <i class=\"fa fa-remove\"></i> Delete\n            </button>\n      -->\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-primary pull-right\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n         ng-show=\"login.loggedIn\"\n         title=\"Create a new project and repository\">\n        <i class=\"fa fa-plus\"></i> Create Project</a>\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\" ng-show=\"login.loggedIn\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n      <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n        <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n        {{login.user}}\n      </div>\n    </div>\n  </div>\n\n\n  <div ng-show=\"!login.authHeader || login.relogin\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n          <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"fetched || !login.authHeader || login.relogin\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && login.authHeader\">\n    <div ng-hide=\"projects.length\" class=\"align-center\">\n      <div class=\"padded-div\">\n        <div class=\"row\">\n          <div class=\"col-md-12\">\n            <p class=\"alert alert-info\">There are no git repositories yet. Please create one!</p>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-show=\"projects.length\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/secrets.html","<div ng-controller=\"Forge.SecretsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row filter-header\" ng-show=\"personalSecrets.length\">\n    <div class=\"col-md-12\">\n      <button class=\"btn btn-default pull-right\"\n              title=\"Cancel changes to this secret\"\n              ng-click=\"cancel()\">\n        Cancel\n      </button>\n      <span class=\"pull-right\">&nbsp;</span>\n      <button class=\"btn btn-primary pull-right\"\n              title=\"Saves changes to this secret\"\n              ng-disabled=\"!canSave()\"\n              ng-click=\"save()\">\n        Save Changes\n      </button>\n    </div>\n  </div>\n\n\n  <div ng-hide=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n\n  <div ng-show=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n\n        <form name=\"secretForm\" class=\"form-horizontal\">\n          <div class=\"form-group\" ng-hide=\"id\"  ng-class=\"{\'has-error\': secretForm.$error.validator}\">\n            <label class=\"col-sm-2 control-label\" for=\"secretName\">\n              Secret\n              <a tabindex=\"0\" role=\"button\" data-toggle=\"popover\" data-trigger=\"focus\" data-html=\"true\" title=\"\"\n                 data-content=\"Select the secret used to clone and edit the git repository\" data-placement=\"top\" data-original-title=\"\">\n                <span class=\"fa fa-info-circle\"></span>\n              </a>\n            </label>\n\n            <div class=\"col-sm-10\">\n              <input type=\"text\" id=\"secretName\" name=\"secretName\" class=\"form-control\" ng-model=\"selectedSecretName\" required readonly>\n            </div>\n          </div>\n        </form>\n      </div>\n    </div>\n\n    <div ng-hide=\"personalSecrets.length\" class=\"align-center\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <p class=\"alert alert-info\">There are no secrets currently available.</p>\n        </div>\n      </div>\n      <div class=\"row\">\n        <div class=\"col-md-12 text-center\">\n          <a class=\"btn btn-primary\" href=\"{{addNewSecretLink}}\" title=\"Create a new secret for editing the git repository for this project\">\n            <i class=\"fa fa-plus\"></i> Create Secret\n          </a>\n        </div>\n      </div>\n    </div>\n    <div ng-show=\"personalSecrets.length\">\n      <div class=\"row select-table-filter\">\n        <div class=\"col-md-12\">\n          <hawtio-filter ng-show=\"model.secrets.length\"\n                         ng-model=\"tableConfig.filterOptions.filterText\"\n                         css-class=\"input-xxlarge\"\n                         placeholder=\"Filter secrets...\"></hawtio-filter>\n\n        </div>\n      </div>\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n      <div class=\"row\">\n        <div class=\"col-md-12 text-center\">\n          <a class=\"btn btn-default\" href=\"{{addNewSecretLink}}\" title=\"Create a new secret for editing the git repository for this project\">\n            <i class=\"fa fa-plus\"></i> Create Secret\n          </a>\n        </div>\n      </div>\n    </div>\n\n  </div>\n</div>\n");
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
$templateCache.put("plugins/wiki/html/editPage.html","<div ng-controller=\"Wiki.EditController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a id=\"saveButton\"\n             href=\"\"\n             ng-disabled=\"canSave()\"\n             ng-click=\"save()\"\n             title=\"Saves the updated wiki page\">\n            <i class=\"fa fa-save\"></i> Save</a>\n        </li>\n        <li class=\"pull-right\">\n          <a id=\"cancelButton\"\n             href=\"\"\n             ng-click=\"cancel()\"\n             title=\"Discards any updates\">\n            <i class=\"fa fa-remove\"></i> Cancel</a>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"control-group editor-autoresize\">\n      <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n    </div>\n  </div>\n</div>\n");
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