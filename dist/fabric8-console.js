

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

var Forge;
(function (Forge) {
    Forge._module = angular.module(Forge.pluginName, ['hawtio-core', 'hawtio-ui']);
    Forge.controller = PluginHelpers.createControllerFunction(Forge._module, Forge.pluginName);
    Forge.route = PluginHelpers.createRoutingFunction(Forge.templatePath);
    Forge._module.config(['$routeProvider', function ($routeProvider) {
        console.log("Listening on: " + UrlHelpers.join(Forge.context, '/createProject'));
        $routeProvider.when(UrlHelpers.join(Forge.context, '/createProject'), Forge.route('createProject.html', false)).when(UrlHelpers.join(Forge.context, '/repos/:path*'), Forge.route('repo.html', false)).when(UrlHelpers.join(Forge.context, '/repos'), Forge.route('repos.html', false));
        angular.forEach([Forge.context, '/workspaces/:namespace/projects/:project/forge'], function (path) {
            $routeProvider.when(UrlHelpers.join(path, '/commands'), Forge.route('commands.html', false)).when(UrlHelpers.join(path, '/commands/:path*'), Forge.route('commands.html', false)).when(UrlHelpers.join(path, '/command/:id'), Forge.route('command.html', false)).when(UrlHelpers.join(path, '/command/:id/:path*'), Forge.route('command.html', false));
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

var Forge;
(function (Forge) {
    Forge.CommandController = Forge.controller("CommandController", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel", function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) {
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
            $http.post(url, request, Forge.createHttpConfig()).success(function (data, status, headers, config) {
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
            }).error(function (data, status, headers, config) {
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
            $http.post(url, request, Forge.createHttpConfig()).success(function (data, status, headers, config) {
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
            }).error(function (data, status, headers, config) {
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
                $http.get(url, Forge.createHttpConfig()).success(function (data, status, headers, config) {
                    if (data) {
                        $scope.fetched = true;
                        console.log("updateData loaded schema");
                        updateSchema(data);
                        Forge.setModelCommandInputs(ForgeModel, $scope.resourcePath, $scope.id, $scope.schema);
                        onSchemaLoad();
                    }
                    Core.$apply($scope);
                }).error(function (data, status, headers, config) {
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

var Forge;
(function (Forge) {
    Forge.CommandsController = Forge.controller("CommandsController", ["$scope", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", function ($scope, $dialog, $window, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL, ForgeModel) {
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
        $http.get(url, Forge.createHttpConfig()).success(function (data, status, headers, config) {
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
        }).error(function (data, status, headers, config) {
            Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
        });
    }]);
})(Forge || (Forge = {}));

var Forge;
(function (Forge) {
    Forge.RepoController = Forge.controller("RepoController", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL) {
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
                $http.get(url, config).success(function (data, status, headers, config) {
                    if (data) {
                        Forge.enrichRepo(data);
                    }
                    $scope.entity = data;
                    $scope.fetched = true;
                }).error(function (data, status, headers, config) {
                    Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
                });
            }
            else {
                $scope.fetched = true;
            }
        }
    }]);
})(Forge || (Forge = {}));

var Forge;
(function (Forge) {
    Forge.ReposController = Forge.controller("ReposController", ["$scope", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "KubernetesModel", "ServiceRegistry", function ($scope, $dialog, $window, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL, KubernetesModel, ServiceRegistry) {
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
                    $http.delete(url).success(function (data, status, headers, config) {
                        updateData();
                    }).error(function (data, status, headers, config) {
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
                $http.get(url, config).success(function (data, status, headers, config) {
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
                }).error(function (data, status, headers, config) {
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
            oldHref: function () {
            },
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

var Main;
(function (Main) {
    Main._module.controller('Main.About', ["$scope", function ($scope) {
        $scope.info = Main.version;
    }]);
})(Main || (Main = {}));

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
                node.isFolder = function () {
                    return true;
                };
            }
            parent.children.push(node);
            var children = template.children;
            if (children) {
                addCreateWizardFolders(workspace, $scope, node, children);
            }
        });
    }
    Wiki.addCreateWizardFolders = addCreateWizardFolders;
    function startLink($scope) {
        var projectId = $scope.projectId;
        var start = UrlHelpers.join(Developer.projectLink(projectId), "/wiki");
        var branch = $scope.branch;
        if (branch) {
            start = UrlHelpers.join(start, 'branch', branch);
        }
        return start;
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
            $routeProvider.when(UrlHelpers.join(startContext, path, 'view'), Wiki.route('viewPage.html', false)).when(UrlHelpers.join(startContext, path, 'create/:page*'), Wiki.route('create.html', false)).when(startContext + path + '/view/:page*', { templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false }).when(startContext + path + '/book/:page*', { templateUrl: 'plugins/wiki/html/viewBook.html', reloadOnSearch: false }).when(startContext + path + '/edit/:page*', { templateUrl: 'plugins/wiki/html/editPage.html' }).when(startContext + path + '/version/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/viewPage.html' }).when(startContext + path + '/history/:page*', { templateUrl: 'plugins/wiki/html/history.html' }).when(startContext + path + '/commit/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/commit.html' }).when(startContext + path + '/diff/:page*\/:diffObjectId1/:diffObjectId2', { templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false }).when(startContext + path + '/formTable/:page*', { templateUrl: 'plugins/wiki/html/formTable.html' }).when(startContext + path + '/dozer/mappings/:page*', { templateUrl: 'plugins/wiki/html/dozerMappings.html' }).when(startContext + path + '/configurations/:page*', { templateUrl: 'plugins/wiki/html/configurations.html' }).when(startContext + path + '/configuration/:pid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' }).when(startContext + path + '/newConfiguration/:factoryPid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' }).when(startContext + path + '/camel/diagram/:page*', { templateUrl: 'plugins/wiki/html/camelDiagram.html' }).when(startContext + path + '/camel/canvas/:page*', { templateUrl: 'plugins/wiki/html/camelCanvas.html' }).when(startContext + path + '/camel/properties/:page*', { templateUrl: 'plugins/wiki/html/camelProperties.html' });
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
    Wiki._module.run(["$location", "viewRegistry", "localStorage", "layoutFull", "helpRegistry", "preferencesRegistry", "wikiRepository", "$rootScope", function ($location, viewRegistry, localStorage, layoutFull, helpRegistry, preferencesRegistry, wikiRepository, $rootScope) {
        viewRegistry['wiki'] = Wiki.templatePath + 'layoutWiki.html';
        Wiki.documentTemplates.forEach(function (template) {
            if (!template['regex']) {
                template.regex = /(?:)/;
            }
        });
    }]);
    hawtioPluginLoader.addModule(Wiki.pluginName);
})(Wiki || (Wiki = {}));

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
                content: '<i class=" icon-sitemap"></i> Tree',
                title: "View the routes as a tree",
                isValid: function (workspace) { return true; },
                href: function () { return Wiki.startLink($scope.branch) + "/camel/properties/" + $scope.pageId; }
            },
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
            console.log("Selected " + $scope.selectedPaletteNode + " : " + $scope.selectedComponentNode);
        };
        $scope.onComponentSelect = function (node) {
            $scope.selectedComponentNode = (node && node["nodeModel"]) ? node : null;
            if ($scope.selectedComponentNode) {
                $scope.selectedPaletteNode = null;
                var nodeName = node.key;
                console.log("loading endpoint schema for node " + nodeName);
                $scope.loadEndpointSchema(nodeName);
                $scope.selectedComponentName = nodeName;
            }
            console.log("Selected " + $scope.selectedPaletteNode + " : " + $scope.selectedComponentNode);
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
                console.log("WARNING: no nodeModel!");
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
            console.log("cancelling...");
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
                console.log("nodeDrop nodeId: " + nodeId + " sourceId: " + sourceId + " hitMode: " + hitMode);
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
                console.log("WARNING: no id for model " + JSON.stringify(nodeModel));
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
                            console.log("Could not add a new route to the empty tree!");
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
                console.log("No XML found for page " + $scope.pageId);
            }
            Core.$applyLater($scope);
        }
        function updateView() {
            $scope.loadEndpointNames();
            $scope.pageId = Wiki.pageId($routeParams, $location);
            console.log("Has page id: " + $scope.pageId + " with $routeParams " + JSON.stringify($routeParams));
            wikiRepository.getPage($scope.branch, $scope.pageId, $scope.objectId, onResults);
        }
        function goToView() {
        }
        $scope.doSwitchToCanvasView = function () {
            $location.url(Core.trimLeading((Wiki.startLink($scope.branch) + "/camel/canvas/" + $scope.pageId), '#'));
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
            console.log("scheme " + endpointScheme + " path " + endpointPath + " parameters " + endpointParameters);
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
            console.log("cancelling...");
        };
        $scope.$watch("selectedRouteId", onRouteSelectionChanged);
        function goToView() {
        }
        function addNewNode(nodeModel) {
            var doc = $scope.doc || document;
            var parentFolder = $scope.selectedFolder || $scope.rootFolder;
            var key = nodeModel["_id"];
            if (!key) {
                console.log("WARNING: no id for model " + JSON.stringify(nodeModel));
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
                            console.log("Could not add a new route to the empty tree!");
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
                    console.log("Cant find node at " + idx);
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
                dagre.layout().nodeSep(100).edgeSep(edgeSep).rankSep(75).nodes(states).edges(transitions).debugLevel(1).run();
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
                            console.log("endpoint " + endpointScheme + " path " + endpointPath + " and parameters " + JSON.stringify(endpointParameters));
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

var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.CommitController", ["$scope", "$location", "$routeParams", "$templateCache", "marked", "fileExtensionTypeRegistry", function ($scope, $location, $routeParams, $templateCache, marked, fileExtensionTypeRegistry) {
        var isFmc = false;
        var jolokia = null;
        Wiki.initScope($scope, $routeParams, $location);
        var wikiRepository = $scope.wikiRepository;
        $scope.commitId = $scope.objectId;
        $scope.selectedItems = [];
        $scope.dateFormat = 'EEE, MMM d, y : hh:mm:ss a';
        $scope.gridOptions = {
            data: 'commits',
            showFilter: false,
            multiSelect: false,
            selectWithCheckboxOnly: true,
            showSelectionCheckbox: true,
            displaySelectionCheckbox: true,
            selectedItems: $scope.selectedItems,
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
            return $scope.selectedItems.length === 1;
        };
        $scope.revert = function () {
            if ($scope.selectedItems.length > 0) {
                var path = commitPath($scope.selectedItems[0]);
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
            if ($scope.selectedItems.length > 0) {
                var commit = $scope.selectedItems[0];
                var link = Wiki.startLink($scope) + "/diff/" + commitPath(commit) + "/" + $scope.commitId + "/";
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
                    $http.get(exemplarUri).success(function (data, status, headers, config) {
                        putPage(path, name, folder, data, commitMessage);
                    }).error(function (data, status, headers, config) {
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
            console.log("creating new file at " + path);
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
            var link = Wiki.startLink($scope) + "/diff/" + $scope.pageId + "/" + objectId + "/" + baseObjectId;
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
                    log.commitLink = Wiki.startLink($scope) + "/commit/" + $scope.pageId + "/" + commitId;
                });
                $scope.logs = logArray;
                Core.$apply($scope);
            });
            Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
        }
    }]);
})(Wiki || (Wiki = {}));

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
                    action: function () {
                    }
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
            return (!answer && $location.search()["form"]) ? Core.createHref($location, "#" + path, ["form"]) : answer;
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
            initialValue: 0 /* List */,
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
                case 0 /* List */:
                    Wiki.log.debug("List view mode");
                    break;
                case 1 /* Icon */:
                    Wiki.log.debug("Icon view mode");
                    break;
                default:
                    $scope.mode = 0 /* List */;
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
            var answer = "#/dashboard/add?tab=dashboard" + "&href=" + encodeURIComponent(href) + "&size=" + encodeURIComponent(size) + "&routeParams=" + encodeURIComponent(angular.toJson($routeParams));
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
                if ($scope.gridOptions.selectedItems.find(function (file) {
                    return file.name.endsWith(".profile");
                })) {
                    $scope.deleteWarning = "You are about to delete document(s) which represent Fabric8 profile(s). This really can't be undone! Wiki operations are low level and may lead to non-functional state of Fabric.";
                }
                else {
                    $scope.deleteWarning = null;
                }
                $scope.deleteDialog = Wiki.getDeleteDialog($dialog, {
                    callbacks: function () {
                        return $scope.deleteAndCloseDialog;
                    },
                    selectedFileHtml: function () {
                        return $scope.selectedFileHtml;
                    },
                    warning: function () {
                        return $scope.deleteWarning;
                    }
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
                    rename: function () {
                        return $scope.rename;
                    },
                    fileExists: function () {
                        return $scope.fileExists;
                    },
                    fileName: function () {
                        return $scope.fileName;
                    },
                    callbacks: function () {
                        return $scope.renameAndCloseDialog;
                    }
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
                    move: function () {
                        return $scope.move;
                    },
                    folderNames: function () {
                        return $scope.folderNames;
                    },
                    callbacks: function () {
                        return $scope.moveAndCloseDialog;
                    }
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
                }).sortBy(function (file) {
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
            this.$http.get(url, config).success(successFn).error(errorFn);
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
            this.$http.post(url, body, this.config).success(successFn).error(errorFn);
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
            this.$http.post(url, body, config).success(successFn).error(errorFn);
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

var Wiki;
(function (Wiki) {
    Wiki.TopLevelController = Wiki._module.controller("Wiki.TopLevelController", ['$scope', '$route', '$routeParams', function ($scope, $route, $routeParams) {
    }]);
})(Wiki || (Wiki = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLmpzIiwiZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VQbHVnaW4udHMiLCJmb3JnZS90cy9jb21tYW5kLnRzIiwiZm9yZ2UvdHMvY29tbWFuZHMudHMiLCJmb3JnZS90cy9yZXBvLnRzIiwiZm9yZ2UvdHMvcmVwb3MudHMiLCJtYWluL3RzL21haW5HbG9iYWxzLnRzIiwibWFpbi90cy9tYWluUGx1Z2luLnRzIiwibWFpbi90cy9hYm91dC50cyIsIndpa2kvdHMvd2lraUhlbHBlcnMudHMiLCJ3aWtpL3RzL3dpa2lQbHVnaW4udHMiLCJ3aWtpL3RzL2NhbWVsLnRzIiwid2lraS90cy9jYW1lbENhbnZhcy50cyIsIndpa2kvdHMvY29tbWl0LnRzIiwid2lraS90cy9jcmVhdGUudHMiLCJ3aWtpL3RzL2VkaXQudHMiLCJ3aWtpL3RzL2ZpbGVEcm9wLnRzIiwid2lraS90cy9mb3JtVGFibGUudHMiLCJ3aWtpL3RzL2dpdFByZWZlcmVuY2VzLnRzIiwid2lraS90cy9oaXN0b3J5LnRzIiwid2lraS90cy9uYXZiYXIudHMiLCJ3aWtpL3RzL3ZpZXcudHMiLCJ3aWtpL3RzL3dpa2lEaWFsb2dzLnRzIiwid2lraS90cy93aWtpRGlyZWN0aXZlcy50cyIsIndpa2kvdHMvd2lraU5hdmlnYXRpb24udHMiLCJ3aWtpL3RzL3dpa2lSZXBvc2l0b3J5LnRzIiwid2lraS90cy93aWtpVG9wTGV2ZWwudHMiXSwibmFtZXMiOlsiRm9yZ2UiLCJGb3JnZS5pc0ZvcmdlIiwiRm9yZ2UuaW5pdFNjb3BlIiwiRm9yZ2UuY29tbWFuZExpbmsiLCJGb3JnZS5jb21tYW5kc0xpbmsiLCJGb3JnZS5yZXBvc0FwaVVybCIsIkZvcmdlLnJlcG9BcGlVcmwiLCJGb3JnZS5jb21tYW5kQXBpVXJsIiwiRm9yZ2UuZXhlY3V0ZUNvbW1hbmRBcGlVcmwiLCJGb3JnZS52YWxpZGF0ZUNvbW1hbmRBcGlVcmwiLCJGb3JnZS5jb21tYW5kSW5wdXRBcGlVcmwiLCJGb3JnZS5tb2RlbFByb2plY3QiLCJGb3JnZS5zZXRNb2RlbENvbW1hbmRzIiwiRm9yZ2UuZ2V0TW9kZWxDb21tYW5kcyIsIkZvcmdlLm1vZGVsQ29tbWFuZElucHV0TWFwIiwiRm9yZ2UuZ2V0TW9kZWxDb21tYW5kSW5wdXRzIiwiRm9yZ2Uuc2V0TW9kZWxDb21tYW5kSW5wdXRzIiwiRm9yZ2UuZW5yaWNoUmVwbyIsIkZvcmdlLmNyZWF0ZUh0dHBDb25maWciLCJGb3JnZS5hZGRRdWVyeUFyZ3VtZW50IiwiRm9yZ2UuY3JlYXRlSHR0cFVybCIsIkZvcmdlLmNvbW1hbmRNYXRjaGVzVGV4dCIsIkZvcmdlLmlzTG9nZ2VkSW50b0dvZ3MiLCJGb3JnZS5yZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCIsIkZvcmdlLm9uUm91dGVDaGFuZ2VkIiwiRm9yZ2UudXBkYXRlU2NoZW1hIiwiRm9yZ2UudmFsaWRhdGUiLCJGb3JnZS50b0JhY2tncm91bmRTdHlsZSIsIkZvcmdlLnVwZGF0ZURhdGEiLCJGb3JnZS5vblNjaGVtYUxvYWQiLCJGb3JnZS5jb21tYW5kTWF0Y2hlcyIsIkZvcmdlLmRvRGVsZXRlIiwiRm9yZ2UudXBkYXRlTGlua3MiLCJNYWluIiwiV2lraSIsIldpa2kuVmlld01vZGUiLCJXaWtpLmlzRk1DQ29udGFpbmVyIiwiV2lraS5pc1dpa2lFbmFibGVkIiwiV2lraS5nb1RvTGluayIsIldpa2kuY3VzdG9tVmlld0xpbmtzIiwiV2lraS5jcmVhdGVXaXphcmRUcmVlIiwiV2lraS5jcmVhdGVGb2xkZXIiLCJXaWtpLmFkZENyZWF0ZVdpemFyZEZvbGRlcnMiLCJXaWtpLnN0YXJ0TGluayIsIldpa2kuaXNJbmRleFBhZ2UiLCJXaWtpLnZpZXdMaW5rIiwiV2lraS5icmFuY2hMaW5rIiwiV2lraS5lZGl0TGluayIsIldpa2kuY3JlYXRlTGluayIsIldpa2kuZW5jb2RlUGF0aCIsIldpa2kuZGVjb2RlUGF0aCIsIldpa2kuZmlsZUZvcm1hdCIsIldpa2kuZmlsZU5hbWUiLCJXaWtpLmZpbGVQYXJlbnQiLCJXaWtpLmhpZGVGaWxlTmFtZUV4dGVuc2lvbnMiLCJXaWtpLmdpdFJlc3RVUkwiLCJXaWtpLmdpdFVybFByZWZpeCIsIldpa2kuZ2l0UmVsYXRpdmVVUkwiLCJXaWtpLmZpbGVJY29uSHRtbCIsIldpa2kuaWNvbkNsYXNzIiwiV2lraS5pbml0U2NvcGUiLCJXaWtpLmxvYWRCcmFuY2hlcyIsIldpa2kucGFnZUlkIiwiV2lraS5wYWdlSWRGcm9tVVJJIiwiV2lraS5maWxlRXh0ZW5zaW9uIiwiV2lraS5vbkNvbXBsZXRlIiwiV2lraS5wYXJzZUpzb24iLCJXaWtpLmFkanVzdEhyZWYiLCJXaWtpLmdldEZvbGRlclhtbE5vZGUiLCJXaWtpLmFkZE5ld05vZGUiLCJXaWtpLm9uTW9kZWxDaGFuZ2VFdmVudCIsIldpa2kub25Ob2RlRGF0YUNoYW5nZWQiLCJXaWtpLm9uUmVzdWx0cyIsIldpa2kudXBkYXRlVmlldyIsIldpa2kuZ29Ub1ZpZXciLCJXaWtpLmlzUm91dGVPck5vZGUiLCJXaWtpLmNyZWF0ZUVuZHBvaW50VVJJIiwiV2lraS50cmVlTW9kaWZpZWQiLCJXaWtpLnJlbG9hZFJvdXRlSWRzIiwiV2lraS5vblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCIsIldpa2kuc2hvd0dyYXBoIiwiV2lraS5nZXROb2RlSWQiLCJXaWtpLmdldFNlbGVjdGVkT3JSb3V0ZUZvbGRlciIsIldpa2kuZ2V0Q29udGFpbmVyRWxlbWVudCIsIldpa2kubGF5b3V0R3JhcGgiLCJXaWtpLmdldExpbmsiLCJXaWtpLmdldE5vZGVCeUNJRCIsIldpa2kudXBkYXRlU2VsZWN0aW9uIiwiV2lraS5nZXRXaWR0aCIsIldpa2kuZ2V0Rm9sZGVySWRBdHRyaWJ1dGUiLCJXaWtpLmdldFJvdXRlRm9sZGVyIiwiV2lraS5jb21taXRQYXRoIiwiV2lraS5yZXR1cm5Ub0RpcmVjdG9yeSIsIldpa2kuZG9DcmVhdGUiLCJXaWtpLmRvQ3JlYXRlLnRvUGF0aCIsIldpa2kuZG9DcmVhdGUudG9Qcm9maWxlTmFtZSIsIldpa2kucHV0UGFnZSIsIldpa2kuZ2V0TmV3RG9jdW1lbnRQYXRoIiwiV2lraS5pc0NyZWF0ZSIsIldpa2kub25GaWxlQ29udGVudHMiLCJXaWtpLnVwZGF0ZVNvdXJjZVZpZXciLCJXaWtpLm9uRm9ybVNjaGVtYSIsIldpa2kuc2F2ZVRvIiwiV2lraS5jaGlsZExpbmsiLCJXaWtpLm9uRm9ybURhdGEiLCJXaWtpLnN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rIiwiV2lraS5sb2FkQnJlYWRjcnVtYnMiLCJXaWtpLmlzRGlmZlZpZXciLCJXaWtpLnZpZXdDb250ZW50cyIsIldpa2kub25GaWxlRGV0YWlscyIsIldpa2kuY2hlY2tGaWxlRXhpc3RzIiwiV2lraS5nZXRSZW5hbWVGaWxlUGF0aCIsIldpa2kuZ2V0UmVuYW1lRGlhbG9nIiwiV2lraS5nZXRNb3ZlRGlhbG9nIiwiV2lraS5nZXREZWxldGVEaWFsb2ciLCJXaWtpLm9mZnNldFRvcCIsIldpa2kuc2Nyb2xsVG9IYXNoIiwiV2lraS5zY3JvbGxUb0lkIiwiV2lraS5hZGRMaW5rcyIsIldpa2kub25FdmVudEluc2VydGVkIiwiV2lraS5jcmVhdGVTb3VyY2VCcmVhZGNydW1icyIsIldpa2kuY3JlYXRlRWRpdGluZ0JyZWFkY3J1bWIiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5jb25zdHJ1Y3RvciIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0UGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucHV0UGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuaGlzdG9yeSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tbWl0SW5mbyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tbWl0VHJlZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZGlmZiIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuYnJhbmNoZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmV4aXN0cyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LnJlbmFtZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvR2V0IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5kb1Bvc3QiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvUG9zdEZvcm0iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbXBsZXRlUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0UGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0TG9nUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0Q29udGVudCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuanNvbkNoaWxkQ29udGVudHMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmdpdCJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQ0FBLElBQU8sS0FBSyxDQWdPWDtBQWhPRCxXQUFPLEtBQUssRUFBQyxDQUFDO0lBRURBLGFBQU9BLEdBQUdBLDhCQUE4QkEsQ0FBQ0E7SUFFekNBLFVBQUlBLEdBQUdBLEdBQUdBLEdBQUdBLGFBQU9BLENBQUNBO0lBQ3JCQSxnQkFBVUEsR0FBR0EsT0FBT0EsQ0FBQ0E7SUFDckJBLGdCQUFVQSxHQUFHQSxnQkFBZ0JBLENBQUNBO0lBQzlCQSxrQkFBWUEsR0FBR0EsZ0JBQVVBLEdBQUdBLE9BQU9BLENBQUNBO0lBQ3BDQSxTQUFHQSxHQUFrQkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZ0JBQVVBLENBQUNBLENBQUNBO0lBRTVDQSxvQkFBY0EsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxDQUFDQTtJQUU1Q0EscUJBQWVBLEdBQUdBLFVBQVVBLENBQUNBLGVBQWVBLENBQUNBO0lBQzdDQSxzQkFBZ0JBLEdBQUdBLE9BQU9BLENBQUNBO0lBRTNCQSxv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QUFFQSxXQUFLQSxDQUFDQSxlQUFlQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUN2RUEsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsa0JBQWtCQSxDQUFDQSxFQUFFQSxXQUFLQSxDQUFDQSxlQUFlQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUM5RUEsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsY0FBY0EsQ0FBQ0EsRUFBRUEsV0FBS0EsQ0FBQ0EsY0FBY0EsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FDekVBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEVBQUVBLHFCQUFxQkEsQ0FBQ0EsRUFBRUEsV0FBS0EsQ0FBQ0EsY0FBY0EsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDdEZBLENBQUNBLENBQUNBLENBQUNBO0lBRUxBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0lBRUpBLGFBQU9BLENBQUNBLE9BQU9BLENBQUNBLGFBQWFBLEVBQUVBLENBQUNBLElBQUlBLEVBQUVBLFlBQVlBLEVBQUVBLFVBQUNBLEVBQWVBLEVBQUVBLFVBQStCQTtRQUNuR0EsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsZ0JBQWdCQSxFQUFFQSxHQUFHQSxRQUFRQSxHQUFHQSxVQUFVQSxDQUFDQSx1QkFBdUJBLEVBQUVBLEdBQUdBLG1DQUFtQ0EsQ0FBQ0E7SUFDL0hBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0lBR0pBLGFBQU9BLENBQUNBLE9BQU9BLENBQUNBLFlBQVlBLEVBQUVBLENBQUNBLElBQUlBLEVBQUVBLFlBQVlBLEVBQUVBLFVBQUNBLEVBQWVBLEVBQUVBLFVBQStCQTtRQUNsR0EsTUFBTUEsQ0FBQ0E7WUFDTEEsV0FBV0EsRUFBRUEsRUFBRUE7WUFDZkEsUUFBUUEsRUFBRUEsRUFBRUE7U0FDYkEsQ0FBQUE7SUFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7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ckRBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1lBQ2xDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNwREEsQ0FBQ0E7UUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3ZGQSxNQUFNQSxDQUFDQSxrQkFBa0JBLEdBQUdBLEdBQUdBLEdBQUdBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0E7UUFDOURBLENBQUNBO1FBRURBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO1FBQ2xEQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxZQUFZQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtRQUV2Q0EsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0Esc0JBQWdCQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtRQUNwRUEsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7UUFFOUNBLGVBQVNBLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLFlBQVlBLENBQUNBLENBQUNBO1FBQzNDQSxtQ0FBNkJBLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1FBR2pEQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQTtZQUNuQkEsSUFBSUEsRUFBRUEsVUFBVUE7WUFDaEJBLHFCQUFxQkEsRUFBRUEsSUFBSUE7WUFDM0JBLHVCQUF1QkEsRUFB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Q3ZDQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxZQUFZQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtRQUN2RUEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsWUFBWUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsWUFBWUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0E7UUFDNUVBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBQ3JDQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxRQUFRQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUM5REEsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsV0FBV0EsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7UUFDN0VBLE1BQU1BLENBQUNBLGNBQWNBLEdBQUdBLElBQUlBLHNCQUFpQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFFdERBLE1BQU1BLENBQUNBLGNBQWNBLEdBQUdBLFNBQVNBLENBQUNBLGFBQWFBLEVBQUVBLENBQUNBO1FBQ2xEQSxNQUFNQSxDQUFDQSxZQUFZQSxHQUFHQSxTQUFTQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUM5REEsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxHQUFHQSxTQUFTQSxDQUFDQSx3QkFBd0JBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLEVBQUVBLDRCQUF1QkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDaEhBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFNBQVNBLENBQUNBLHVCQUF1QkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7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Q0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDdENBLENBQUNBO1FBQ0hBLENBQUNBO1FBR0RBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzNCQSxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUM1QkEsSUFBSUEsU0FBU0EsR0FBR0EsVUFBVUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDdENBLElBQUlBLE9BQU9BLEdBQUdBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLElBQUlBO2dCQUM5QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0E7WUFDdkJBLENBQUNBLENBQUNBLENBQUNBO1lBQ0hBLEtBQUtBLEdBQUdBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLEdBQUdBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ2xEQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxLQUFLQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxHQUFHQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUUvREEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDMUZBLENBQUNBO1FBR0RBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxFQUFFQSxJQUFJQSxHQUFHQSxTQUFTQSxFQUFFQSxTQUFTQSxDQUFDQSxHQUFHQSxTQUFTQSxDQUFDQTtRQUMxRUEsQ0FBQ0E7UUFFREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EseUJBQXlCQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFDQSxPQUFPQTtZQUM5Q0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7UUFDbENBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ0hBLE1BQU1BLENBQUNBLEdBQUdBLEdBQUdBLFVBQVVBLEdBQUdBLEdBQUdBLEdBQUdBLElBQUlBLEdBQUdBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3RFQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtRQUNkQSxDQUFDQTtJQUNIQSxDQUFDQTtJQXpDZWpDLGVBQVVBLEdBQVZBLFVBeUNmQSxDQUFBQTtBQUNIQSxDQUFDQSxFQWg5Qk0sSUFBSSxLQUFKLElBQUksUUFnOUJWOztBQy84QkQsSUFBTyxJQUFJLENBd0lWO0FBeElELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFFQUEsZUFBVUEsR0FBR0EsTUFBTUEsQ0FBQ0E7SUFDcEJBLGlCQUFZQSxHQUFHQSxvQkFBb0JBLENBQUNBO0lBQ3BDQSxRQUFHQSxHQUFPQSxJQUFJQSxDQUFDQTtJQUVmQSxZQUFPQSxHQUFHQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxlQUFVQSxFQUFFQSxDQUFDQSxhQUFhQSxFQUFFQSxXQUFXQSxFQUFFQSxhQUFhQSxFQUFFQSxlQUFlQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNuR0EsZUFBVUEsR0FBR0EsYUFBYUEsQ0FBQ0Esd0JBQXdCQSxDQUFDQSxZQUFPQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQTtJQUNyRUEsVUFBS0EsR0FBR0EsYUFBYUEsQ0FBQ0EscUJBQXFCQSxDQUFDQSxpQkFBWUEsQ0FBQ0EsQ0FBQ0E7SUFFckVBLFlBQU9BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLGdCQUFnQkEsRUFBRUEsVUFBQ0EsY0FBY0E7UUFHL0NBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLEVBQUVBLEVBQUVBLGlCQUFpQkEsQ0FBQ0EsRUFBRUEsVUFBQ0EsSUFBSUE7WUFFNUNBLElBQUlBLFlBQVlBLEdBQUdBLGlEQUFpREEsQ0FBQ0E7WUFDckVBLGNBQWNBLENBQ05BLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLEVBQUVBLElBQUlBLEVBQUVBLE1BQU1BLENBQUNBLEVBQUVBLFVBQUtBLENBQUNBLGVBQWVBLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBLENBQ2hGQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxFQUFFQSxJQUFJQSxFQUFFQSxlQUFlQSxDQUFDQSxFQUFFQSxVQUFLQSxDQUFDQSxhQUFhQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUN2RkEsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsR0FBR0EsY0FBY0EsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsaUNBQWlDQSxFQUFFQSxjQUFjQSxFQUFFQSxLQUFLQSxFQUFDQSxDQUFDQSxDQUNuSEEsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsR0FBR0EsY0FBY0EsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsaUNBQWlDQSxFQUFFQSxjQUFjQSxFQUFFQSxLQUFLQSxFQUFDQSxDQUFDQSxDQUNuSEEsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsR0FBR0EsY0FBY0EsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsaUNBQWlDQSxFQUFDQSxDQUFDQSxDQUM1RkEsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsR0FBR0EsNEJBQTRCQSxFQUFFQSxFQUFDQSxXQUFXQSxFQUFFQSxpQ0FBaUNBLEVBQUNBLENBQUNBLENBQzFHQSxJQUFJQSxDQUFDQSxZQUFZQSxHQUFHQSxJQUFJQSxHQUFHQSxpQkFBaUJBLEVBQUVBLEVBQUNBLFdBQVdBLEVBQUVBLGdDQUFnQ0EsRUFBQ0EsQ0FBQ0EsQ0FDOUZBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLDJCQUEyQkEsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsK0JBQStCQSxFQUFDQSxDQUFDQSxDQUN2R0EsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsR0FBR0EsNkNBQTZDQSxFQUFFQSxFQUFDQSxXQUFXQSxFQUFFQSxpQ0FBaUNBLEVBQUVBLGNBQWNBLEVBQUVBLEtBQUtBLEVBQUNBLENBQUNBLENBQ2xKQSxJQUFJQSxDQUFDQSxZQUFZQSxHQUFHQSxJQUFJQSxHQUFHQSxtQkFBbUJBLEVBQUVBLEVBQUNBLFdBQVdBLEVBQUVBLGtDQUFrQ0EsRUFBQ0EsQ0FBQ0EsQ0FDbEdBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLHdCQUF3QkEsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsc0NBQXNDQSxFQUFDQSxDQUFDQSxDQUMzR0EsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsR0FBR0Esd0JBQXdCQSxFQUFFQSxFQUFFQSxXQUFXQSxFQUFFQSx1Q0FBdUNBLEVBQUVBLENBQUNBLENBQzlHQSxJQUFJQSxDQUFDQSxZQUFZQSxHQUFHQSxJQUFJQSxHQUFHQSw0QkFBNEJBLEVBQUVBLEVBQUVBLFdBQVdBLEVBQUVBLHNDQUFzQ0EsRUFBRUEsQ0FBQ0EsQ0FDakhBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLHNDQUFzQ0EsRUFBRUEsRUFBRUEsV0FBV0EsRUFBRUEsc0NBQXNDQSxFQUFFQSxDQUFDQSxDQUMzSEEsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsR0FBR0EsdUJBQXVCQSxFQUFFQSxFQUFDQSxXQUFXQSxFQUFFQSxxQ0FBcUNBLEVBQUNBLENBQUNBLENBQ3pHQSxJQUFJQSxDQUFDQSxZQUFZQSxHQUFHQSxJQUFJQSxHQUFHQSxzQkFBc0JBLEVBQUVBLEVBQUNBLFdBQVdBLEVBQUVBLG9DQUFvQ0EsRUFBQ0EsQ0FBQ0EsQ0FDdkdBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLDBCQUEwQkEsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsd0NBQXdDQSxFQUFDQSxDQUFDQSxDQUFDQTtRQUMxSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDUEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFVRkEsWUFBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsZ0JBQWdCQSxFQUFFQTtRQUNoQ0EsSUFBSUEsSUFBSUEsR0FBR0E7WUFDVEEsS0FBS0EsRUFBRUEsRUFBRUE7WUFDVEEsWUFBWUEsRUFBRUEsVUFBQ0EsSUFBZ0JBO2dCQUM3QkEsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDeEJBLENBQUNBO1lBQ0RBLG1CQUFtQkEsRUFBRUEsVUFBQ0EsSUFBa0JBO2dCQUN0Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsTUFBTUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzVCQSxNQUFNQSxDQUFDQTtnQkFDVEEsQ0FBQ0E7Z0JBQ0RBLElBQUlBLFlBQVlBLEdBQWlCQSxDQUFDQTtvQkFDaENBLE9BQU9BLEVBQUVBLFNBQVNBO2lCQUNuQkEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLE9BQU9BLENBQUNBLFVBQUNBLElBQWdCQTtvQkFDbENBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO3dCQUNqQkEsWUFBWUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQzFCQSxDQUFDQTtnQkFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLEVBQUVBLENBQUNBLENBQUNBLFlBQVlBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUM1QkEsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3pCQSxDQUFDQTtZQUNIQSxDQUFDQTtTQUNGQSxDQUFDQTtRQUNGQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtJQUNkQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUVIQSxZQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxrQkFBa0JBLEVBQUVBO1FBQ2hDQSxNQUFNQSxDQUFDQSxFQUFFQSxDQUFDQTtJQUNkQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUVIQSxZQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSwyQkFBMkJBLEVBQUVBO1FBQzNDQSxNQUFNQSxDQUFDQTtZQUNMQSxPQUFPQSxFQUFFQSxDQUFDQSxLQUFLQSxFQUFFQSxLQUFLQSxFQUFFQSxLQUFLQSxFQUFFQSxLQUFLQSxFQUFFQSxLQUFLQSxFQUFFQSxLQUFLQSxDQUFDQTtZQUNuREEsVUFBVUEsRUFBRUEsQ0FBQ0EsSUFBSUEsRUFBRUEsVUFBVUEsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUEsRUFBRUEsS0FBS0EsQ0FBQ0E7WUFDdERBLFdBQVdBLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBLE9BQU9BLEVBQUVBLEtBQUtBLENBQUNBO1lBQ3JDQSxhQUFhQSxFQUFFQSxDQUFDQSxNQUFNQSxDQUFDQTtZQUN2QkEsZUFBZUEsRUFBRUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7WUFDM0JBLGNBQWNBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBO1lBQ3pCQSxZQUFZQSxFQUFFQSxDQUFDQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxZQUFZQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQSxFQUFFQSxNQUFNQSxDQUFDQTtZQUMzRUEsS0FBS0EsRUFBRUEsQ0FBQ0EsS0FBS0EsRUFBRUEsS0FBS0EsRUFBRUEsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0E7WUFDckNBLGFBQWFBLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBLEtBQUtBLENBQUNBO1lBQzlCQSxZQUFZQSxFQUFFQSxDQUFDQSxZQUFZQSxDQUFDQTtTQUM3QkEsQ0FBQ0E7SUFDSkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFFSEEsWUFBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZUFBZUEsRUFBRUEsY0FBTUEscUJBQVNBLEVBQVRBLENBQVNBLENBQUNBLENBQUNBO0lBRWpEQSxZQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFDQSxjQUFjQSxFQUFHQSxjQUFjQSxFQUFFQSxZQUFZQSxFQUFFQSxjQUFjQSxFQUFFQSxxQkFBcUJBLEVBQUVBLGdCQUFnQkEsRUFDN0hBLFlBQVlBLEVBQUVBLFVBQUNBLFNBQTZCQSxFQUN4Q0EsWUFBWUEsRUFDWkEsWUFBWUEsRUFDWkEsVUFBVUEsRUFDVkEsWUFBWUEsRUFDWkEsbUJBQW1CQSxFQUNuQkEsY0FBY0EsRUFDZEEsVUFBVUE7UUFFZEEsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsaUJBQVlBLEdBQUdBLGlCQUFpQkEsQ0FBQ0E7UUF5QnhEQSxJQUFJQSxDQUFDQSxpQkFBaUJBLENBQUNBLE9BQU9BLENBQUNBLFVBQUNBLFFBQWFBO1lBQzNDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDdkJBLFFBQVFBLENBQUNBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBO1lBQzFCQSxDQUFDQTtRQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUVMQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUVKQSxrQkFBa0JBLENBQUNBLFNBQVNBLENBQUNBLGVBQVVBLENBQUNBLENBQUNBO0FBQzNDQSxDQUFDQSxFQXhJTSxJQUFJLEtBQUosSUFBSSxRQXdJVjs7QUMzSUQsSUFBTyxJQUFJLENBcWVWO0FBcmVELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFFQUEsb0JBQWVBLEdBQUdBLFlBQU9BLENBQUNBLFVBQVVBLENBQUNBLHNCQUFzQkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsWUFBWUEsRUFBRUEsV0FBV0EsRUFBRUEsY0FBY0EsRUFBRUEsVUFBVUEsRUFBRUEsZ0JBQWdCQSxFQUFFQSxjQUFjQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxVQUFVQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQSxFQUFFQSxRQUFRQSxFQUFFQSxjQUFjQSxFQUFFQSxZQUErQkE7UUFHalJBLElBQUlBLE9BQU9BLEdBQUdBLElBQUlBLENBQUNBO1FBQ25CQSxJQUFJQSxhQUFhQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUN6QkEsSUFBSUEsdUJBQXVCQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUNuQ0EsSUFBSUEsV0FBV0EsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDdkJBLElBQUlBLFNBQVNBLEdBQUdBLElBQUlBLENBQUNBO1FBQ3JCQSxJQUFJQSxTQUFTQSxHQUFHQSxJQUFJQSxTQUFTQSxDQUFDQSxPQUFPQSxFQUFFQSxhQUFhQSxFQUFFQSx1QkFBdUJBLEVBQUVBLFNBQVNBLEVBQUVBLFFBQVFBLEVBQUVBLGNBQWNBLEVBQUVBLFlBQVlBLEVBQUVBLFVBQVVBLEVBQUVBLFdBQVdBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1FBRXRLQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxZQUFZQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUNoREEsS0FBS0EsQ0FBQ0Esd0JBQXdCQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQSxFQUFFQSxTQUFTQSxFQUFFQSxPQUFPQSxDQUFDQSxDQUFDQTtRQUNwRkEsSUFBSUEsY0FBY0EsR0FBR0EsTUFBTUEsQ0FBQ0EsY0FBY0EsQ0FBQ0E7UUFFM0NBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLEtBQUtBLENBQUNBLHVCQUF1QkEsRUFBRUEsQ0FBQ0E7UUFDaERBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBO1FBRXhCQSxNQUFNQSxDQUFDQSxrQkFBa0JBLEdBQUdBLElBQUlBLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO1FBRTVDQSxNQUFNQSxDQUFDQSx1QkFBdUJBLEdBQUdBLElBQUlBLENBQUNBO1FBQ3RDQSxNQUFNQSxDQUFDQSxxQkFBcUJBLEdBQUdBO1lBQzdCQSxzQkFBc0JBLEVBQUVBLElBQUlBO1lBQzVCQSxlQUFlQSxFQUFFQSxJQUFJQTtTQUN0QkEsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsVUFBQ0EsR0FBR0E7WUFDbkJBLE1BQU1BLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLENBQUNBLE9BQU9BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1FBQ3ZDQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxpQkFBaUJBLEdBQUdBO1lBT3ZCQTtnQkFDQUEsT0FBT0EsRUFBRUEsb0NBQW9DQTtnQkFDN0NBLEtBQUtBLEVBQUVBLDJCQUEyQkE7Z0JBQ2xDQSxPQUFPQSxFQUFFQSxVQUFDQSxTQUFtQkEsSUFBS0EsV0FBSUEsRUFBSkEsQ0FBSUE7Z0JBQ3RDQSxJQUFJQSxFQUFFQSxjQUFNQSxPQUFBQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxvQkFBb0JBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLEVBQXBFQSxDQUFvRUE7YUFDakZBO1NBU0ZBLENBQUNBO1FBRUZBLElBQUlBLFVBQVVBLEdBQUdBLGlCQUFpQkEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDckRBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLE9BQU9BLENBQUNBO1FBRTVCQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxJQUFJQSxFQUFFQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQTtRQUduQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsR0FBR0EsYUFBYUEsQ0FBQ0E7UUFDeERBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLE9BQU9BLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLGFBQWFBLENBQUNBO1FBRXJEQSxNQUFNQSxDQUFDQSxpQkFBaUJBLEdBQUdBLEVBQUVBLENBQUNBO1FBQzlCQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxJQUFJQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUMzQ0EsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBO1FBR2xEQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxpQkFBaUJBLENBQUNBLFdBQVdBLEVBQUVBLFVBQUNBLEtBQUtBLEVBQUVBLEdBQUdBO1lBQ3hEQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDaEJBLElBQUlBLEtBQUtBLEdBQUdBLENBQUNBLEdBQUdBLEtBQUtBLE9BQU9BLENBQUNBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLFNBQVNBLENBQUNBLEtBQUtBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO2dCQUMvRkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2ZBLEtBQUtBLENBQUNBLEdBQUdBLEdBQUdBLEtBQUtBLENBQUNBLEtBQUtBLENBQUNBO2dCQUMxQkEsQ0FBQ0E7Z0JBQ0RBLEtBQUtBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBO2dCQUNuQkEsSUFBSUEsS0FBS0EsR0FBR0EsS0FBS0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsR0FBR0EsQ0FBQ0E7Z0JBQ2xDQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtnQkFDN0JBLElBQUlBLENBQUNBLEdBQUdBLEdBQUdBLEtBQUtBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBO2dCQUNqQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0E7Z0JBQzFCQSxJQUFJQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQSxnQkFBZ0JBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO2dCQUM3Q0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsUUFBUUEsQ0FBQ0E7Z0JBR3JCQSxJQUFJQSxPQUFPQSxHQUFHQSxLQUFLQSxDQUFDQSxTQUFTQSxDQUFDQSxJQUFJQSxLQUFLQSxDQUFDQSxhQUFhQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtnQkFDN0RBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBLE9BQU9BLENBQUNBO2dCQUV2QkEsS0FBS0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDNUJBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBLENBQUNBO1FBR0hBLE1BQU1BLENBQUNBLGFBQWFBLEdBQUdBLElBQUlBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLENBQUNBO1FBRS9DQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLEVBQUVBO1lBQzlCQSxJQUFJQSxjQUFjQSxHQUFHQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQTtZQUMzQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsY0FBY0EsSUFBSUEsY0FBY0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzVDQSxNQUFNQSxDQUFDQSxhQUFhQSxHQUFHQSxJQUFJQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQTtnQkFDL0NBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLGNBQWNBLEVBQUVBLFVBQUNBLFlBQVlBO29CQUNsREEsSUFBSUEsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0EsbUJBQW1CQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtvQkFDdkRBLElBQUlBLFNBQVNBLEdBQUdBLFFBQVFBLENBQUNBLEtBQUtBLElBQUlBLE1BQU1BLENBQUNBO29CQUN6Q0EsSUFBSUEsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsRUFBRUEsSUFBSUEsU0FBU0EsQ0FBQ0E7b0JBQ3hDQSxJQUFJQSxLQUFLQSxHQUFHQSxNQUFNQSxDQUFDQSxhQUFhQSxDQUFDQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtvQkFFdERBLElBQUlBLEtBQUtBLEdBQUdBLEtBQUtBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsWUFBWUEsRUFBRUEsUUFBUUEsQ0FBQ0EsQ0FBQ0E7b0JBQzVEQSxJQUFJQSxHQUFHQSxHQUFHQSxZQUFZQSxDQUFDQTtvQkFDdkJBLElBQUlBLEtBQUtBLEdBQUdBLEtBQUtBLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLFlBQVlBLENBQUNBO29CQUMzQ0EsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7b0JBQzdCQSxJQUFJQSxDQUFDQSxHQUFHQSxHQUFHQSxRQUFRQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQTtvQkFDaENBLElBQUlBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBO29CQUNmQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxHQUFHQSxLQUFLQSxDQUFDQTtvQkFDMUJBLElBQUlBLE9BQU9BLEdBQUdBLEtBQUtBLENBQUNBLFNBQVNBLENBQUNBLElBQUlBLEtBQUtBLENBQUNBLGFBQWFBLENBQUNBLElBQUlBLEtBQUtBLENBQUNBO29CQUNoRUEsSUFBSUEsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsS0FBS0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7b0JBQzdEQSxJQUFJQSxDQUFDQSxJQUFJQSxHQUFHQSxRQUFRQSxDQUFDQTtvQkFDckJBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBLE9BQU9BLENBQUNBO29CQUV2QkEsS0FBS0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzVCQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNMQSxDQUFDQTtRQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNIQSxNQUFNQSxDQUFDQSxvQkFBb0JBLEdBQUdBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBRXZDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLEVBQUVBO1lBQzlCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDMUIsVUFBVSxDQUFDO29CQUNULENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDdkIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ1QsQ0FBQztRQUNILENBQUMsQ0FBQ0EsQ0FBQ0E7UUFFSEEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EseUJBQXlCQSxFQUFFQSxrQkFBa0JBLENBQUNBLENBQUNBO1FBRTFEQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxVQUFDQSxZQUFZQTtZQUNuQ0EsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsWUFBWUEsQ0FBQ0E7WUFFbkNBLFlBQVlBLENBQUNBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLGdCQUFnQkEsQ0FBQ0E7UUFDOUNBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBO1lBQ2ZBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLENBQUNBO2dCQUN2QkEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7WUFDMUJBLENBQUNBO1lBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUNOQSxVQUFVQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtZQUN6QkEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsZUFBZUEsR0FBR0EsVUFBQ0EsSUFBSUE7WUFDNUJBLE1BQU1BLENBQUNBLG1CQUFtQkEsR0FBR0EsQ0FBQ0EsSUFBSUEsSUFBSUEsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDdkVBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9CQSxNQUFNQSxDQUFDQSxxQkFBcUJBLEdBQUdBLElBQUlBLENBQUNBO1lBQ3RDQSxDQUFDQTtZQUNEQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxXQUFXQSxHQUFHQSxNQUFNQSxDQUFDQSxtQkFBbUJBLEdBQUdBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLHFCQUFxQkEsQ0FBQ0EsQ0FBQ0E7UUFDL0ZBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLGlCQUFpQkEsR0FBR0EsVUFBQ0EsSUFBSUE7WUFDOUJBLE1BQU1BLENBQUNBLHFCQUFxQkEsR0FBR0EsQ0FBQ0EsSUFBSUEsSUFBSUEsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDekVBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLHFCQUFxQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2pDQSxNQUFNQSxDQUFDQSxtQkFBbUJBLEdBQUdBLElBQUlBLENBQUNBO2dCQUNsQ0EsSUFBSUEsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0E7Z0JBQ3hCQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxtQ0FBbUNBLEdBQUdBLFFBQVFBLENBQUNBLENBQUNBO2dCQUM1REEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtnQkFDcENBLE1BQU1BLENBQUNBLHFCQUFxQkEsR0FBR0EsUUFBUUEsQ0FBQ0E7WUFDMUNBLENBQUNBO1lBQ0RBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFdBQVdBLEdBQUdBLE1BQU1BLENBQUNBLG1CQUFtQkEsR0FBR0EsS0FBS0EsR0FBR0EsTUFBTUEsQ0FBQ0EscUJBQXFCQSxDQUFDQSxDQUFDQTtRQUMvRkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxHQUFHQTtZQUN6QkEsSUFBSUEsU0FBU0EsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDckJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9CQSxTQUFTQSxHQUFHQSxNQUFNQSxDQUFDQSxtQkFBbUJBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBO2dCQUNwREEsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDL0JBLENBQUNBO1lBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLHFCQUFxQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBR3hDQSxJQUFJQSxjQUFjQSxHQUFHQSxNQUFNQSxDQUFDQSxxQkFBcUJBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBO2dCQUMvREEsSUFBSUEsY0FBY0EsR0FBR0EsTUFBTUEsQ0FBQ0EsY0FBY0EsQ0FBQ0E7Z0JBQzNDQSxTQUFTQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxRQUFRQSxDQUFDQTtnQkFDL0NBLE1BQU1BLENBQUNBLGNBQWNBLEdBQUdBO29CQUN0QkEsR0FBR0EsRUFBRUEsTUFBTUEsQ0FBQ0EscUJBQXFCQSxDQUFDQSxHQUFHQTtvQkFDckNBLE1BQU1BLEVBQUVBLGNBQWNBO29CQUN0QkEsT0FBT0EsRUFBRUEsY0FBY0E7aUJBQ3hCQSxDQUFDQTtZQUNKQSxDQUFDQTtZQUNEQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQTtRQUNuQkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxHQUFHQTtZQUN6QkEsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxFQUFFQSxDQUFDQTtZQUMzQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2RBLFVBQVVBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1lBQ3hCQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDTkEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esd0JBQXdCQSxDQUFDQSxDQUFDQTtZQUN4Q0EsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7UUFDM0JBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBO1lBQ2xCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxjQUFjQSxJQUFJQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDN0NBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO2dCQUMvQkEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7Z0JBQ3pCQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDN0JBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBO1lBQ3pCQSxDQUFDQTtRQUNIQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQTtZQUNqQkEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDOUNBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFVBQUNBLEdBQUdBO1lBQ3BCQSxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDeEJBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLFlBQVlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQ3JDQSxJQUFJQSxFQUFFQSxHQUFHQSxHQUFHQSxDQUFDQSxRQUFRQSxDQUFDQTtZQUN0QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1BBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1lBQ3ZCQSxDQUFDQTtZQUNEQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxZQUFZQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxDQUFDQTtRQUM1Q0EsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0E7WUFFWkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzNDQSxJQUFJQSxPQUFPQSxHQUFHQSxLQUFLQSxDQUFDQSxxQkFBcUJBLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO2dCQUMvREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1pBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLGVBQWVBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO29CQUN6Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBRVRBLElBQUlBLGFBQWFBLEdBQUdBLE1BQU1BLENBQUNBLGFBQWFBLElBQUlBLGVBQWVBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO3dCQUM1RUEsY0FBY0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsRUFBRUEsYUFBYUEsRUFBRUEsVUFBQ0EsTUFBTUE7NEJBQy9FQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTs0QkFDeEJBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFNBQVNBLEVBQUVBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBOzRCQUN2REEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0E7NEJBQ3hCQSxRQUFRQSxFQUFFQSxDQUFDQTs0QkFDWEEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7d0JBQ3RCQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDTEEsQ0FBQ0E7Z0JBQ0hBLENBQUNBO1lBQ0hBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBO1lBQ2RBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO1FBRS9CQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLEVBQUVBO1lBQzlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBR2hCLFVBQVUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDN0IsQ0FBQztRQUNILENBQUMsQ0FBQ0EsQ0FBQ0E7UUFFSEEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxFQUFFQSxVQUFVQSxLQUFLQSxFQUFFQSxPQUFPQSxFQUFFQSxRQUFRQTtZQUVsRSxVQUFVLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzdCLENBQUMsQ0FBQ0EsQ0FBQ0E7UUFFSEEsU0FBU0EsZ0JBQWdCQSxDQUFDQSxRQUFRQTtZQUNoQ2tDLElBQUlBLFlBQVlBLEdBQUdBLEtBQUtBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsUUFBUUEsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDN0RBLEVBQUVBLENBQUNBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBO2dCQUNqQkEsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0EsWUFBWUEsQ0FBQ0E7WUFDcENBLENBQUNBO1lBQ0RBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBO1FBQ3RCQSxDQUFDQTtRQUVEbEMsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsVUFBQ0EsTUFBTUEsRUFBRUEsUUFBUUE7WUFDckNBLE1BQU1BLENBQUNBLGNBQWNBLEdBQUdBLE1BQU1BLENBQUNBO1lBQy9CQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQTtZQUMzQkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNqQ0EsTUFBTUEsQ0FBQ0EsZUFBZUEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDOUJBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLElBQUlBLENBQUNBO1lBQzFCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWEEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtnQkFDbkRBLE1BQU1BLENBQUNBLHFCQUFxQkEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDcENBLENBQUNBO1lBQ0RBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFFbERBLElBQUlBLFlBQVlBLEdBQUdBLGdCQUFnQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7WUFDOUNBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUViQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxLQUFLQSxDQUFDQSxjQUFjQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtnQkFDbERBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO29CQUNyQkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSw0Q0FBNENBLENBQUNBO2dCQUMzRUEsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLGVBQWVBLEdBQUdBLDRCQUE0QkEsQ0FBQ0E7Z0JBQ3REQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUN0QkEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsZUFBZUEsR0FBR0EsVUFBQ0EsSUFBSUEsRUFBRUEsVUFBVUE7WUFDeENBLElBQUlBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBLElBQUlBLENBQUNBO1lBQzNCQSxJQUFJQSxZQUFZQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUNuQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsVUFBVUEsSUFBSUEsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9CQSxJQUFJQSxNQUFNQSxHQUFHQSxLQUFLQSxDQUFDQSxvQkFBb0JBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO2dCQUNwREEsSUFBSUEsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtnQkFDeERBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLElBQUlBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO29CQUV2QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsS0FBS0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ3pCQSxNQUFNQSxDQUFDQSxNQUFNQSxLQUFLQSxPQUFPQSxDQUFDQTtvQkFDNUJBLENBQUNBO29CQUNEQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDZEEsQ0FBQ0E7WUFDSEEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsVUFBQ0EsSUFBSUEsRUFBRUEsVUFBVUEsRUFBRUEsT0FBT0EsRUFBRUEsRUFBRUEsRUFBRUEsU0FBU0E7WUFDM0RBLElBQUlBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBLElBQUlBLENBQUNBO1lBQzNCQSxJQUFJQSxZQUFZQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUNuQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsVUFBVUEsSUFBSUEsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBRS9CQSxJQUFJQSxNQUFNQSxHQUFHQSxLQUFLQSxDQUFDQSxvQkFBb0JBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO2dCQUNwREEsSUFBSUEsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtnQkFFeERBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLEtBQUtBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO29CQUV2QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsS0FBS0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ3pCQSxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxLQUFLQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDdkJBLE9BQU9BLEdBQUdBLE9BQU9BLENBQUNBO3dCQUNwQkEsQ0FBQ0E7b0JBQ0hBLENBQUNBO29CQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTt3QkFFTkEsT0FBT0EsR0FBR0EsTUFBTUEsQ0FBQ0E7b0JBQ25CQSxDQUFDQTtnQkFDSEEsQ0FBQ0E7Z0JBQ0RBLElBQUlBLENBQUNBLENBQUNBO29CQUNKQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxZQUFZQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDL0JBLE9BQU9BLEdBQUdBLE1BQU1BLENBQUNBO29CQUNuQkEsQ0FBQ0E7b0JBQUNBLElBQUlBLENBQUNBLENBQUNBO3dCQUNOQSxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxLQUFLQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDekJBLE9BQU9BLEdBQUdBLE9BQU9BLENBQUNBO3dCQUNwQkEsQ0FBQ0E7b0JBQ0hBLENBQUNBO2dCQUNIQSxDQUFDQTtnQkFDREEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsbUJBQW1CQSxHQUFHQSxNQUFNQSxHQUFHQSxhQUFhQSxHQUFHQSxRQUFRQSxHQUFHQSxZQUFZQSxHQUFHQSxPQUFPQSxDQUFDQSxDQUFDQTtnQkFFOUZBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEVBQUVBLE9BQU9BLENBQUNBLENBQUNBO1lBQ2pDQSxDQUFDQTtRQUNIQSxDQUFDQSxDQUFDQTtRQUdGQSxVQUFVQSxFQUFFQSxDQUFDQTtRQUViQSxTQUFTQSxVQUFVQSxDQUFDQSxTQUFTQTtZQUMzQm1DLElBQUlBLEdBQUdBLEdBQUdBLE1BQU1BLENBQUNBLEdBQUdBLElBQUlBLFFBQVFBLENBQUNBO1lBQ2pDQSxJQUFJQSxZQUFZQSxHQUFHQSxNQUFNQSxDQUFDQSxjQUFjQSxJQUFJQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLENBQUNBO1lBQ3BFQSxJQUFJQSxHQUFHQSxHQUFHQSxTQUFTQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtZQUMzQkEsSUFBSUEsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDdEJBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO2dCQUNUQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSwyQkFBMkJBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3ZFQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDTkEsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7Z0JBQy9CQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxLQUFLQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFcEJBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBO2dCQUNqQ0EsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNOQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFFZEEsSUFBSUEsSUFBSUEsR0FBR0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0E7d0JBQy9CQSxJQUFJQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQTt3QkFDbENBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLFFBQVFBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBOzRCQUNsQ0EsVUFBVUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsY0FBY0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQzFDQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQTt3QkFDaENBLENBQUNBO3dCQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxJQUFJQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDaENBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO3dCQUMzQ0EsQ0FBQ0E7d0JBQUNBLElBQUlBLENBQUNBLENBQUNBOzRCQUNOQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSw4Q0FBOENBLENBQUNBLENBQUNBOzRCQUM1REEsTUFBTUEsQ0FBQ0E7d0JBQ1RBLENBQUNBO29CQUNIQSxDQUFDQTtvQkFLREEsSUFBSUEsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDekRBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLFlBQVlBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUVsQ0EsVUFBVUEsR0FBR0EsUUFBUUEsQ0FBQ0EsY0FBY0EsRUFBRUEsQ0FBQ0E7d0JBQ3ZDQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxTQUFTQSxFQUFFQSxJQUFJQSxRQUFRQSxDQUFDQTtvQkFDOUNBLENBQUNBO2dCQUNIQSxDQUFDQTtnQkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2JBLElBQUlBLElBQUlBLEdBQUdBLEdBQUdBLENBQUNBLGFBQWFBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO29CQUNsQ0EsWUFBWUEsR0FBR0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7b0JBQzdCQSxJQUFJQSxTQUFTQSxHQUFHQSxLQUFLQSxDQUFDQSxhQUFhQSxDQUFDQSxZQUFZQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDeERBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNkQSxJQUFJQSxLQUFLQSxHQUFHQSxRQUFRQSxDQUFDQSxRQUFRQSxDQUFDQSxTQUFTQSxFQUFFQSxVQUFVQSxDQUFDQSxDQUFDQTt3QkFDckRBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBOzRCQUNWQSxnQkFBZ0JBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBOzRCQUN4QkEsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7NEJBQ25CQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTs0QkFDbkJBLEtBQUtBLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO3dCQUN2QkEsQ0FBQ0E7b0JBQ0hBLENBQUNBO2dCQUNIQSxDQUFDQTtZQUNIQSxDQUFDQTtRQUNIQSxDQUFDQTtRQUVEbkMsU0FBU0Esa0JBQWtCQSxDQUFDQSxLQUFLQSxFQUFFQSxJQUFJQTtZQUdyQ29DLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUNwQkEsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EscUJBQXFCQSxDQUFDQTtnQkFDNUNBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO29CQUNiQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDbkJBLGlCQUFpQkEsRUFBRUEsQ0FBQ0E7b0JBQ3RCQSxDQUFDQTtvQkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7d0JBR05BLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBO29CQUN4QkEsQ0FBQ0E7Z0JBQ0hBLENBQUNBO1lBQ0hBLENBQUNBO1FBQ0hBLENBQUNBO1FBRURwQyxTQUFTQSxpQkFBaUJBO1lBQ3hCcUMsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDdkJBLElBQUlBLGNBQWNBLEdBQUdBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBO1lBQzNDQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxJQUFJQSxjQUFjQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDdENBLElBQUlBLFlBQVlBLEdBQUdBLGdCQUFnQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3JEQSxFQUFFQSxDQUFDQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDakJBLElBQUlBLFFBQVFBLEdBQUdBLFlBQVlBLENBQUNBLFNBQVNBLENBQUNBO29CQUN0Q0EsSUFBSUEsWUFBWUEsR0FBR0EsS0FBS0EsQ0FBQ0EsY0FBY0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7b0JBQ2xEQSxFQUFFQSxDQUFDQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFFakJBLEtBQUtBLENBQUNBLDhCQUE4QkEsQ0FBQ0EsY0FBY0EsRUFBRUEsWUFBWUEsRUFBRUEsWUFBWUEsQ0FBQ0EsQ0FBQ0E7d0JBQ2pGQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxLQUFLQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQTtvQkFDdkNBLENBQUNBO2dCQUNIQSxDQUFDQTtnQkFFREEsY0FBY0EsQ0FBQ0EsZUFBZUEsQ0FBQ0EsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7WUFDcERBLENBQUNBO1FBQ0hBLENBQUNBO1FBRURyQyxTQUFTQSxTQUFTQSxDQUFDQSxRQUFRQTtZQUN6QnNDLElBQUlBLElBQUlBLEdBQUdBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBO1lBQ3pCQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFFVEEsSUFBSUEsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3BEQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDVEEsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDakNBLENBQUNBO1lBQ0hBLENBQUNBO1lBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUNOQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSx3QkFBd0JBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ3hEQSxDQUFDQTtZQUNEQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUMzQkEsQ0FBQ0E7UUFFRHRDLFNBQVNBLFVBQVVBO1lBQ2pCdUMsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxFQUFFQSxDQUFDQTtZQUMzQkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsWUFBWUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDckRBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGVBQWVBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLHFCQUFxQkEsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFFcEdBLGNBQWNBLENBQUNBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLFFBQVFBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1FBQ25GQSxDQUFDQTtRQUdEdkMsU0FBU0EsUUFBUUE7UUFZakJ3QyxDQUFDQTtRQUVEeEMsTUFBTUEsQ0FBQ0Esb0JBQW9CQSxHQUFHQTtZQUM1QkEsU0FBU0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsZ0JBQWdCQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUMzR0EsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EseUJBQXlCQSxHQUFHQTtZQUNqQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3BCQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1lBQ25DQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDTkEsTUFBTUEsQ0FBQ0Esb0JBQW9CQSxFQUFFQSxDQUFDQTtZQUNoQ0EsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0E7SUFFSkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDTkEsQ0FBQ0EsRUFyZU0sSUFBSSxLQUFKLElBQUksUUFxZVY7O0FDcmVELElBQU8sSUFBSSxDQTRwQlY7QUE1cEJELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFDQUEsMEJBQXFCQSxHQUFHQSxZQUFPQSxDQUFDQSxVQUFVQSxDQUFDQSw0QkFBNEJBLEVBQUVBLENBQUNBLFFBQVFBLEVBQUVBLFVBQVVBLEVBQUVBLGNBQWNBLEVBQUVBLGdCQUFnQkEsRUFBRUEsY0FBY0EsRUFBRUEsV0FBV0EsRUFBRUEsVUFBQ0EsTUFBTUEsRUFBRUEsUUFBUUEsRUFBRUEsWUFBWUEsRUFBRUEsY0FBY0EsRUFBRUEsWUFBWUEsRUFBRUEsU0FBU0E7UUFDaFBBLElBQUlBLGVBQWVBLEdBQUdBLE9BQU9BLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBO1FBRTVDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxZQUFZQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUNoREEsSUFBSUEsY0FBY0EsR0FBR0EsTUFBTUEsQ0FBQ0EsY0FBY0EsQ0FBQ0E7UUFFM0NBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLElBQUlBLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO1FBQ25DQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLEdBQUdBLElBQUlBLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO1FBQzFDQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLEdBQUdBLElBQUlBLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO1FBQzFDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUN4QkEsTUFBTUEsQ0FBQ0EscUJBQXFCQSxHQUFHQSxLQUFLQSxDQUFDQSxnQkFBZ0JBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO1FBQ3BFQSxNQUFNQSxDQUFDQSxzQkFBc0JBLEdBQUdBLEtBQUtBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7UUFDdEVBLE1BQU1BLENBQUNBLGtDQUFrQ0EsR0FBR0EsS0FBS0EsQ0FBQ0EsNkJBQTZCQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtRQUU5RkEsTUFBTUEsQ0FBQ0EsS0FBS0EsR0FBR0EsRUFBRUEsQ0FBQ0E7UUFFbEJBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFlBQVlBLENBQUNBLGNBQWNBLENBQUNBLEdBQUdBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLENBQUNBO1FBRXZFQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxrQkFBa0JBLEVBQUVBO1lBQ2hDQSxJQUFJQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLENBQUNBO1lBQ25DQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUV6QkEsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsS0FBS0EsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtZQUU1REEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDOUNBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO2dCQUNSQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQTtnQkFDakJBLGNBQWNBLEVBQUVBLENBQUNBO2dCQUNqQkEsdUJBQXVCQSxFQUFFQSxDQUFDQTtZQUM1QkEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFFSEEsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxHQUFHQTtZQUN6QkEsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxFQUFFQSxDQUFDQTtZQUMzQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2RBLFVBQVVBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1lBQ3hCQSxDQUFDQTtZQUNEQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQTtRQUMzQkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0E7WUFDbEJBLElBQUlBLE1BQU1BLEdBQUdBLHdCQUF3QkEsRUFBRUEsQ0FBQ0E7WUFDeENBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dCQUNYQSxJQUFJQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQSxvQkFBb0JBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO2dCQUNsREEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7Z0JBQ2hCQSxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxLQUFLQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFekJBLE1BQU1BLENBQUNBLGVBQWVBLEdBQUdBLElBQUlBLENBQUNBO2dCQUNoQ0EsQ0FBQ0E7Z0JBQ0RBLGVBQWVBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUN0QkEsWUFBWUEsRUFBRUEsQ0FBQ0E7WUFDakJBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBO1lBQ2hCQSxNQUFNQSxDQUFDQSxZQUFZQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUMzQkEsdUJBQXVCQSxFQUFFQSxDQUFDQTtRQUM1QkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsU0FBU0EsYUFBYUE7WUFDcEJ5QyxNQUFNQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFBQTtRQUMvQkEsQ0FBQ0E7UUFFRHpDLE1BQU1BLENBQUNBLGNBQWNBLEdBQUdBO1lBQ3RCQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDcEJBLE1BQU1BLENBQUNBLG1CQUFtQkEsQ0FBQ0E7WUFDN0JBLENBQUNBO1lBQ0RBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0E7UUFDNUJBLENBQUNBLENBQUFBO1FBRURBLE1BQU1BLENBQUNBLGVBQWVBLEdBQUdBO1lBQ3ZCQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDcEJBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBO1lBQ2pCQSxDQUFDQTtZQUNEQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtRQUNoQkEsQ0FBQ0EsQ0FBQUE7UUFFREEsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0E7WUFDbkJBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLGdCQUFnQkEsRUFBRUEsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7WUFDakRBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dCQUMvQkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7WUFDZEEsQ0FBQ0E7WUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2hDQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtZQUNmQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDTkEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7WUFDOUNBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBV0ZBLFNBQVNBLGlCQUFpQkEsQ0FBQ0EsY0FBcUJBLEVBQUVBLFdBQWtCQSxFQUFFQSxZQUFtQkEsRUFBRUEsa0JBQXNCQTtZQUMvRzBDLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFNBQVNBLEdBQUdBLGNBQWNBLEdBQUdBLFFBQVFBLEdBQUdBLFlBQVlBLEdBQUdBLGNBQWNBLEdBQUdBLGtCQUFrQkEsQ0FBQ0EsQ0FBQ0E7WUFHeEdBLElBQUlBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLGNBQWNBLENBQUNBLEdBQUdBLGNBQWNBLEdBQUdBLEdBQUdBLEdBQUdBLFdBQVdBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLFlBQVlBLEdBQUdBLFlBQVlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO1lBQzVHQSxJQUFJQSxTQUFTQSxHQUFHQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxrQkFBa0JBLENBQUNBLENBQUNBO1lBQ3REQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDZEEsR0FBR0EsSUFBSUEsR0FBR0EsR0FBR0EsU0FBU0EsQ0FBQ0E7WUFDekJBLENBQUNBO1lBQ0RBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBO1FBQ2JBLENBQUNBO1FBRUQxQyxNQUFNQSxDQUFDQSxnQkFBZ0JBLEdBQUdBO1lBQ3hCQSxRQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUM5Q0EsSUFBSUEsR0FBR0EsR0FBR0EsaUJBQWlCQSxDQUFDQSxNQUFNQSxDQUFDQSxjQUFjQSxFQUFFQSxDQUFDQSxNQUFNQSxDQUFDQSxzQkFBc0JBLEdBQUdBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLEVBQUVBLE1BQU1BLENBQUNBLFlBQVlBLEVBQUVBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0EsQ0FBQ0E7WUFDaEpBLFFBQUdBLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBO1lBQzlCQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDUkEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0E7WUFDNUJBLENBQUNBO1lBRURBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBO1lBQ2ZBLElBQUlBLGNBQWNBLEdBQUdBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBO1lBQzNDQSxFQUFFQSxDQUFDQSxDQUFDQSxjQUFjQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbkJBLEdBQUdBLEdBQUdBLGNBQWNBLENBQUNBLEdBQUdBLENBQUNBO2dCQUd6QkEsSUFBSUEsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7WUFDdEZBLENBQUNBO1lBRURBLFlBQVlBLEVBQUVBLENBQUNBO1lBRWZBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO2dCQUNSQSxlQUFlQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFBQTtZQUN0QkEsQ0FBQ0E7WUFFREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3pCQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQSxZQUFZQSxFQUFFQSxDQUFDQTtnQkFDbkNBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUMvQkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsWUFBWUEsRUFBRUEsQ0FBQ0E7Z0JBQzVDQSxDQUFDQTtZQUNIQSxDQUFDQTtZQUVEQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUN0QkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0E7WUFFWkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3pDQSxJQUFJQSxPQUFPQSxHQUFHQSxLQUFLQSxDQUFDQSxxQkFBcUJBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO2dCQUM3REEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1pBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLGVBQWVBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO29CQUN6Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ1RBLElBQUlBLE9BQU9BLEdBQUdBLGtCQUFrQkEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7d0JBQ3ZDQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxzQkFBc0JBLEdBQUdBLE9BQU9BLENBQUNBLENBQUNBO3dCQUc1Q0EsSUFBSUEsYUFBYUEsR0FBR0EsTUFBTUEsQ0FBQ0EsYUFBYUEsSUFBSUEsZUFBZUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7d0JBQzVFQSxjQUFjQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxhQUFhQSxFQUFFQSxVQUFDQSxNQUFNQTs0QkFDbEZBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBOzRCQUN4QkEsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsU0FBU0EsRUFBRUEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7NEJBQ3ZEQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQTs0QkFDeEJBLFFBQVFBLEVBQUVBLENBQUNBOzRCQUNYQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTt3QkFDdEJBLENBQUNBLENBQUNBLENBQUNBO29CQUNMQSxDQUFDQTtnQkFDSEEsQ0FBQ0E7WUFDSEEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0E7WUFDZEEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0E7UUFFL0JBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLGlCQUFpQkEsRUFBRUEsdUJBQXVCQSxDQUFDQSxDQUFDQTtRQUUxREEsU0FBU0EsUUFBUUE7UUFZakJ3QyxDQUFDQTtRQUVEeEMsU0FBU0EsVUFBVUEsQ0FBQ0EsU0FBU0E7WUFDM0JtQyxJQUFJQSxHQUFHQSxHQUFHQSxNQUFNQSxDQUFDQSxHQUFHQSxJQUFJQSxRQUFRQSxDQUFDQTtZQUNqQ0EsSUFBSUEsWUFBWUEsR0FBR0EsTUFBTUEsQ0FBQ0EsY0FBY0EsSUFBSUEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0E7WUFDOURBLElBQUlBLEdBQUdBLEdBQUdBLFNBQVNBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO1lBQzNCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDVEEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsMkJBQTJCQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN2RUEsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLElBQUlBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBO2dCQUNyQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsS0FBS0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBRXBCQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQTtnQkFDL0JBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDTkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBRWRBLElBQUlBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBO3dCQUM3QkEsSUFBSUEsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7d0JBQzdCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDbENBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLGNBQWNBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBOzRCQUMxQ0EsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7d0JBQzNCQSxDQUFDQTt3QkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsSUFBSUEsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ2hDQSxRQUFRQSxHQUFHQSxjQUFjQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxlQUFlQSxDQUFDQSxJQUFJQSxRQUFRQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDeEdBLENBQUNBO3dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTs0QkFDTkEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsOENBQThDQSxDQUFDQSxDQUFDQTs0QkFDNURBLE1BQU1BLENBQUNBO3dCQUNUQSxDQUFDQTtvQkFDSEEsQ0FBQ0E7b0JBSURBLElBQUlBLGNBQWNBLEdBQUdBLEtBQUtBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7b0JBQzFEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxZQUFZQSxDQUFDQSxjQUFjQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDeENBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLE1BQU1BLElBQUlBLFFBQVFBLENBQUNBO29CQUN6Q0EsQ0FBQ0E7Z0JBQ0hBLENBQUNBO2dCQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDYkEsSUFBSUEsSUFBSUEsR0FBR0EsR0FBR0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2xDQSxZQUFZQSxHQUFHQSxRQUFRQSxDQUFDQTtvQkFDeEJBLElBQUlBLFNBQVNBLEdBQUdBLEtBQUtBLENBQUNBLGFBQWFBLENBQUNBLFlBQVlBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO29CQUl4REEsSUFBSUEsUUFBUUEsR0FBR0EsRUFDZEEsQ0FBQ0E7b0JBQ0ZBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEtBQUtBLFVBQVVBLElBQUlBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNoREEsSUFBSUEsR0FBR0EsR0FBR0EsTUFBTUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsR0FBR0EsQ0FBQ0E7d0JBQ3BDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDUkEsUUFBUUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0E7d0JBQzlCQSxDQUFDQTtvQkFDSEEsQ0FBQ0E7b0JBQ0RBLFNBQVNBLENBQUNBLGVBQWVBLENBQUNBLEdBQUdBLFFBQVFBLENBQUNBO29CQUN0Q0EsU0FBU0EsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxHQUFHQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQTtvQkFFcERBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEtBQUtBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO3dCQUVwQkEsSUFBSUEsS0FBS0EsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7d0JBQ25DQSxJQUFJQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQTt3QkFDbEJBLE9BQU9BLElBQUlBLEVBQUVBLENBQUNBOzRCQUNaQSxNQUFNQSxHQUFHQSxPQUFPQSxHQUFHQSxDQUFDQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQTs0QkFDN0JBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dDQUNsQ0EsS0FBS0EsQ0FBQ0E7NEJBQ1JBLENBQUNBO3dCQUNIQSxDQUFDQTt3QkFDREEsU0FBU0EsQ0FBQ0EsY0FBY0EsQ0FBQ0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7d0JBQ3JEQSxNQUFNQSxDQUFDQSxlQUFlQSxHQUFHQSxNQUFNQSxDQUFDQTtvQkFDbENBLENBQUNBO2dCQUNIQSxDQUFDQTtZQUNIQSxDQUFDQTtZQUNEQSxZQUFZQSxFQUFFQSxDQUFDQTtRQUNqQkEsQ0FBQ0E7UUFFRG5DLFNBQVNBLFlBQVlBLENBQUNBLFVBQWlCQTtZQUFqQjJDLDBCQUFpQkEsR0FBakJBLGlCQUFpQkE7WUFFckNBLElBQUlBLE1BQU1BLEdBQUdBLEtBQUtBLENBQUNBLHFCQUFxQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7WUFDNURBLElBQUlBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBLGFBQWFBLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ3REQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDVEEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQ3pCQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNuREEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDdkJBLGNBQWNBLEVBQUVBLENBQUNBO1lBQ2pCQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQTtZQUNsQkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFDdEJBLENBQUNBO1FBR0QzQyxTQUFTQSxjQUFjQTtZQUNyQjRDLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLEVBQUVBLENBQUNBO1lBQ3JCQSxJQUFJQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUN4QkEsTUFBTUEsQ0FBQ0EscUJBQXFCQSxDQUFDQSxzQkFBc0JBLEdBQUdBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQzFGQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFDQSxHQUFHQSxFQUFFQSxLQUFLQTtnQkFDaENBLElBQUlBLEVBQUVBLEdBQUdBLEtBQUtBLENBQUNBLFlBQVlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUNsQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1BBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBO2dCQUMzQkEsQ0FBQ0E7WUFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDTEEsQ0FBQ0E7UUFFRDVDLFNBQVNBLHVCQUF1QkE7WUFDOUI2QyxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDZkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZUFBZUEsSUFBSUEsTUFBTUEsQ0FBQ0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3pFQSxNQUFNQSxDQUFDQSxlQUFlQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDOUNBLENBQUNBO2dCQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxlQUFlQSxJQUFJQSxNQUFNQSxDQUFDQSxlQUFlQSxLQUFLQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDN0VBLElBQUlBLEtBQUtBLEdBQUdBLEVBQUVBLENBQUNBO29CQUNmQSxJQUFJQSxLQUFLQSxHQUFHQSxFQUFFQSxDQUFDQTtvQkFDZkEsS0FBS0EsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxHQUFHQSxFQUFFQSxNQUFNQSxDQUFDQSxlQUFlQSxFQUFFQSxLQUFLQSxFQUFFQSxLQUFLQSxFQUFFQSxRQUFRQSxFQUFFQSxDQUFDQSxDQUFDQTtvQkFDOUZBLGVBQWVBLENBQUNBLE1BQU1BLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO29CQUV4Q0EsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsS0FBS0EsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtvQkFDNURBLFNBQVNBLENBQUNBLEtBQUtBLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBO29CQUN4QkEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsTUFBTUEsQ0FBQ0EsZUFBZUEsQ0FBQ0E7Z0JBQy9DQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EscUJBQXFCQSxDQUFDQSxlQUFlQSxHQUFHQSxNQUFNQSxDQUFDQSxlQUFlQSxDQUFDQTtZQUN4RUEsQ0FBQ0E7UUFDSEEsQ0FBQ0E7UUFFRDdDLFNBQVNBLFNBQVNBLENBQUNBLEtBQUtBLEVBQUVBLEtBQUtBO1lBQzdCOEMsV0FBV0EsQ0FBQ0EsS0FBS0EsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7UUFDNUJBLENBQUNBO1FBRUQ5QyxTQUFTQSxTQUFTQSxDQUFDQSxJQUFJQTtZQUNyQitDLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUMzQkEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQ2ZBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUM5QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1ZBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLG9CQUFvQkEsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3hDQSxNQUFNQSxDQUFDQSxPQUFPQSxHQUFHQSxHQUFHQSxDQUFDQTtnQkFDdkJBLENBQUNBO1lBQ0hBLENBQUNBO1lBQ0RBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLElBQUlBLE9BQU9BLEdBQUdBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBO1FBQ3ZDQSxDQUFDQTtRQUVEL0MsU0FBU0Esd0JBQXdCQTtZQUMvQmdELE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLGNBQWNBLElBQUlBLGNBQWNBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLEVBQUVBLE1BQU1BLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO1FBQzVGQSxDQUFDQTtRQUVEaEQsU0FBU0EsbUJBQW1CQTtZQUMxQmlELElBQUlBLFdBQVdBLEdBQUdBLFFBQVFBLENBQUNBO1lBQzNCQSxJQUFJQSxnQkFBZ0JBLEdBQUdBLFdBQVdBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1lBQ25EQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxnQkFBZ0JBLElBQUlBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7Z0JBQUNBLGdCQUFnQkEsR0FBR0EsV0FBV0EsQ0FBQ0E7WUFDbEZBLE1BQU1BLENBQUNBLGdCQUFnQkEsQ0FBQ0E7UUFDMUJBLENBQUNBO1FBR0RqRCxJQUFJQSxhQUFhQSxHQUFTQSxDQUFDQSxLQUFLQSxFQUFFQSxFQUFFQSxNQUFNQSxFQUFFQSxDQUFDQSxFQUFFQSxRQUFRQSxFQUFFQSx1QkFBdUJBLEVBQUVBLENBQUNBLENBQUNBO1FBQ3BGQSxJQUFJQSxlQUFlQSxHQUFHQSxFQUFFQSxXQUFXQSxFQUFFQSxLQUFLQSxFQUFFQSxTQUFTQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQTtRQUUzREEsSUFBSUEsV0FBV0EsR0FBU0EsQ0FBRUEsT0FBT0EsQ0FBRUEsQ0FBQ0E7UUFDcENBLElBQUlBLFdBQVdBLEdBQVNBLENBQUVBLE9BQU9BLEVBQUVBO1lBQ2pDQSxRQUFRQSxFQUFFQSxDQUFDQTtZQUNYQSxFQUFFQSxFQUFFQSxPQUFPQTtZQUNYQSxNQUFNQSxFQUFFQSxDQUFDQTtZQUNUQSxLQUFLQSxFQUFFQSxDQUFDQTtZQUNSQSxRQUFRQSxFQUFFQSxHQUFHQTtTQUNkQSxDQUFFQSxDQUFDQTtRQUNKQSxJQUFJQSxjQUFjQSxHQUFTQSxDQUFFQSxjQUFjQSxFQUFFQSxFQUFFQSxTQUFTQSxFQUFFQSxFQUFFQSxFQUFFQSxjQUFjQSxFQUFFQSxFQUFFQSxFQUFFQSxDQUFFQSxDQUFDQTtRQUVyRkEsZUFBZUEsQ0FBQ0EsY0FBY0EsQ0FBQ0E7WUFDN0JBLFFBQVFBLEVBQUVBLGFBQWFBO1lBQ3ZCQSxlQUFlQSxFQUFFQSxlQUFlQTtZQUNoQ0Esa0JBQWtCQSxFQUFFQTtnQkFDbEJBLFdBQVdBO2dCQUNYQSxXQUFXQTthQUNaQTtTQUNGQSxDQUFDQSxDQUFDQTtRQUVIQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFVQSxFQUFFQTtZQUNyQkEsZUFBZUEsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7WUFDeEJBLE9BQU9BLGVBQWVBLENBQUNBO1FBQ3pCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUdIQSxlQUFlQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxFQUFFQSxVQUFVQSxVQUFVQSxFQUFFQSxhQUFhQTtZQUNsRSxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sQ0FBQztZQUNULENBQUM7WUFDRCxLQUFLLENBQUMsa0NBQWtDLEdBQUcsVUFBVSxDQUFDLFFBQVEsR0FBRyxNQUFNLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pHLENBQUMsQ0FBQ0EsQ0FBQ0E7UUFFSEEsZUFBZUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsRUFBRUEsVUFBVUEsSUFBSUEsRUFBRUEsR0FBR0E7WUFFcEQsUUFBRyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDN0UsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLElBQUksWUFBWSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9DLElBQUksWUFBWSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9DLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqRCxZQUFZLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3ZDLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTixZQUFZLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDOUQsQ0FBQztZQUNELFlBQVksRUFBRSxDQUFDO1FBQ2pCLENBQUMsQ0FBQ0EsQ0FBQ0E7UUFHSEEsZUFBZUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsRUFBRUEsVUFBVUEsQ0FBQ0E7WUFDdkMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN2QyxNQUFNLENBQUM7WUFDVCxDQUFDO1lBQ0QsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1QixDQUFDLENBQUNBLENBQUNBO1FBRUhBLFNBQVNBLFdBQVdBLENBQUNBLEtBQUtBLEVBQUVBLEtBQUtBO1lBQy9Ca0QsSUFBSUEsV0FBV0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDckJBLElBQUlBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsS0FBS0EsRUFBRUEsS0FBS0EsRUFBRUEsV0FBV0EsQ0FBQ0EsQ0FBQ0E7WUFFL0RBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLFNBQVNBLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBO1lBQzVCQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxlQUFlQSxFQUFFQSxXQUFXQSxDQUFDQSxDQUFDQTtZQUV4Q0EsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsTUFBTUEsQ0FBQ0E7WUFDM0JBLElBQUlBLGdCQUFnQkEsR0FBR0EsbUJBQW1CQSxFQUFFQSxDQUFDQTtZQUU3Q0EsZUFBZUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQTtnQkFHL0JBLGdCQUFnQkEsQ0FBQ0EsR0FBR0EsQ0FBQ0E7b0JBQ25CQSxPQUFPQSxFQUFFQSxPQUFPQTtvQkFDaEJBLFFBQVFBLEVBQUVBLE9BQU9BO29CQUNqQkEsWUFBWUEsRUFBRUEsT0FBT0E7b0JBQ3JCQSxXQUFXQSxFQUFFQSxPQUFPQTtpQkFDckJBLENBQUNBLENBQUNBO2dCQUNIQSxJQUFJQSxlQUFlQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDeEJBLElBQUlBLGNBQWNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUV2QkEsZ0JBQWdCQSxDQUFDQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFDQSxDQUFDQSxFQUFFQSxFQUFFQTtvQkFDaERBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLFlBQVlBLEVBQUVBLEVBQUVBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO29CQUNwQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQ0EsSUFBSUE7d0JBQ2ZBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLEtBQUtBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNuQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ1BBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLG9CQUFvQkEsRUFBRUEsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7d0JBQ3ZDQSxlQUFlQSxDQUFDQSxNQUFNQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQTtvQkFDN0JBLENBQUNBO2dCQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFFSEEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsRUFBRUEsVUFBQ0EsSUFBSUE7b0JBQzNCQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxRQUFRQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDMUJBLElBQUlBLEVBQUVBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUN6QkEsSUFBSUEsR0FBR0EsR0FBR0EsZ0JBQWdCQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtvQkFFMUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNaQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQTs0QkFDMUJBLEVBQUVBLEVBQUVBLEVBQUVBOzRCQUNOQSxJQUFJQSxFQUFFQSxJQUFJQTt5QkFDWEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ0pBLEdBQUdBLENBQUNBLFFBQVFBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsQ0FBQ0E7b0JBQ2pDQSxDQUFDQTtvQkFHREEsZUFBZUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsRUFBRUE7d0JBQzlCQSxNQUFNQSxFQUFFQSxjQUFjQTt3QkFDdEJBLE1BQU1BLEVBQUVBLFlBQVlBO3dCQUNwQkEsU0FBU0EsRUFBRUEsY0FBY0E7d0JBQ3pCQSxjQUFjQSxFQUFFQSxFQUFFQSxXQUFXQSxFQUFFQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxDQUFDQSxFQUFFQTt3QkFDckRBLGNBQWNBLEVBQUVBLENBQUNBLENBQUNBO3FCQUNuQkEsQ0FBQ0EsQ0FBQ0E7b0JBR0hBLGVBQWVBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLEVBQUVBO3dCQUM5QkEsV0FBV0EsRUFBRUEsRUFBRUEsVUFBVUEsRUFBRUEsV0FBV0EsRUFBRUE7d0JBQ3hDQSxNQUFNQSxFQUFFQSxZQUFZQTtxQkFDckJBLENBQUNBLENBQUNBO29CQUVIQSxlQUFlQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxFQUFFQTt3QkFDN0JBLFdBQVdBLEVBQUVBLGVBQWVBO3FCQUM3QkEsQ0FBQ0EsQ0FBQ0E7b0JBR0hBLEdBQUdBLENBQUNBLEtBQUtBLENBQUNBO3dCQUNSLElBQUksT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQzt3QkFDeEMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7d0JBQ3RFLEdBQUcsQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO3dCQUNyQyxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUN4QixlQUFlLENBQUMsT0FBTyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQzt3QkFDckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDdEIsQ0FBQyxDQUFDQSxDQUFDQTtvQkFFSEEsR0FBR0EsQ0FBQ0EsUUFBUUEsQ0FBQ0E7d0JBQ1gsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDeEIsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUVwQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUN0QixDQUFDLENBQUNBLENBQUNBO29CQUVIQSxJQUFJQSxNQUFNQSxHQUFHQSxHQUFHQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQTtvQkFDMUJBLElBQUlBLEtBQUtBLEdBQUdBLEdBQUdBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO29CQUN4QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsSUFBSUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ3BCQSxJQUFJQSxDQUFDQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQTt3QkFDbkJBLElBQUlBLENBQUNBLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBO3dCQUNyQkEsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0E7NEJBQ05BLFdBQVdBLEVBQUVBLEtBQUtBOzRCQUNsQkEsWUFBWUEsRUFBRUEsTUFBTUE7eUJBQ3JCQSxDQUFDQSxDQUFDQTtvQkFDTEEsQ0FBQ0E7Z0JBQ0hBLENBQUNBLENBQUNBLENBQUNBO2dCQUVIQSxJQUFJQSxPQUFPQSxHQUFHQSxFQUFFQSxDQUFDQTtnQkFHakJBLEtBQUtBLENBQUNBLE1BQU1BLEVBQUVBLENBQ1RBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLENBQ1pBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLENBQ2hCQSxPQUFPQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUNYQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUNiQSxLQUFLQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUNsQkEsVUFBVUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FDYkEsR0FBR0EsRUFBRUEsQ0FBQ0E7Z0JBRVhBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLE1BQU1BLEVBQUVBLFVBQUNBLElBQUlBO29CQUczQkEsSUFBSUEsRUFBRUEsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3pCQSxJQUFJQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtvQkFDdEJBLElBQUlBLFNBQVNBLEdBQUdBLEdBQUdBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO29CQUM3QkEsSUFBSUEsUUFBUUEsR0FBR0EsR0FBR0EsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7b0JBQzNCQSxJQUFJQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxHQUFHQSxRQUFRQSxDQUFDQTtvQkFDekNBLElBQUlBLFlBQVlBLEdBQUdBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLEdBQUdBLFNBQVNBLENBQUNBO29CQUM1Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsZUFBZUEsR0FBR0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ25DQSxlQUFlQSxHQUFHQSxZQUFZQSxHQUFHQSxPQUFPQSxHQUFHQSxDQUFDQSxDQUFDQTtvQkFDL0NBLENBQUNBO29CQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxjQUFjQSxHQUFHQSxVQUFVQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDaENBLGNBQWNBLEdBQUdBLFVBQVVBLEdBQUdBLE9BQU9BLEdBQUdBLENBQUNBLENBQUNBO29CQUM1Q0EsQ0FBQ0E7b0JBQ0RBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLEVBQUNBLEdBQUdBLEVBQUVBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLEVBQUNBLENBQUNBLENBQUNBO2dCQUNuREEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBR0hBLGdCQUFnQkEsQ0FBQ0EsR0FBR0EsQ0FBQ0E7b0JBQ25CQSxPQUFPQSxFQUFFQSxjQUFjQTtvQkFDdkJBLFFBQVFBLEVBQUVBLGVBQWVBO29CQUN6QkEsWUFBWUEsRUFBRUEsZUFBZUE7b0JBQzdCQSxXQUFXQSxFQUFFQSxjQUFjQTtpQkFDNUJBLENBQUNBLENBQUNBO2dCQUdIQSxnQkFBZ0JBLENBQUNBLFFBQVFBLENBQUNBO29CQUN4QixNQUFNLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2pDLENBQUMsQ0FBQ0EsQ0FBQ0E7Z0JBRUhBLGVBQWVBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBRXZDQSxlQUFlQSxDQUFDQSxxQkFBcUJBLENBQUNBLEVBQUNBLFNBQVNBLEVBQUVBLEtBQUtBLEVBQUNBLENBQUNBLENBQUNBO2dCQUUxREEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsS0FBS0EsRUFBRUEsVUFBQ0EsSUFBSUE7b0JBQzFCQSxlQUFlQSxDQUFDQSxPQUFPQSxDQUFDQTt3QkFDdEJBLE1BQU1BLEVBQUVBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBO3dCQUM5QkEsTUFBTUEsRUFBRUEsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7cUJBQy9CQSxDQUFDQSxDQUFDQTtnQkFDTEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLGVBQWVBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7WUFFMUNBLENBQUNBLENBQUNBLENBQUNBO1lBR0hBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO1FBQ2hCQSxDQUFDQTtRQUVEbEQsU0FBU0EsT0FBT0EsQ0FBQ0EsSUFBSUE7WUFDbkJtRCxJQUFJQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQTtZQUM3QkEsSUFBSUEsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7WUFDN0JBLE1BQU1BLENBQUNBO2dCQUNMQSxNQUFNQSxFQUFFQSxRQUFRQTtnQkFDaEJBLE1BQU1BLEVBQUVBLFFBQVFBO2FBQ2pCQSxDQUFBQTtRQUNIQSxDQUFDQTtRQUVEbkQsU0FBU0EsWUFBWUEsQ0FBQ0EsS0FBS0EsRUFBRUEsR0FBR0E7WUFDOUJvRCxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFDQSxJQUFJQTtnQkFDckJBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLEtBQUtBLEdBQUdBLENBQUNBO1lBQzFCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNMQSxDQUFDQTtRQUtEcEQsU0FBU0EsZUFBZUEsQ0FBQ0EsVUFBVUE7WUFDakNxRCxJQUFJQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNsQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2pDQSxJQUFJQSxFQUFFQSxHQUFHQSxVQUFVQSxDQUFDQTtnQkFDcEJBLE1BQU1BLEdBQUdBLENBQUNBLEVBQUVBLElBQUlBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBO1lBQzlEQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDTkEsTUFBTUEsR0FBR0EsVUFBVUEsQ0FBQ0E7WUFDdEJBLENBQUNBO1lBQ0RBLE1BQU1BLENBQUNBLGNBQWNBLEdBQUdBLE1BQU1BLENBQUNBO1lBQy9CQSxNQUFNQSxHQUFHQSx3QkFBd0JBLEVBQUVBLENBQUNBO1lBQ3BDQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUMxQkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNqQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1hBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ2xEQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQSxrQkFBa0JBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO2dCQUNuREEsTUFBTUEsQ0FBQ0EscUJBQXFCQSxHQUFHQSxFQUFFQSxDQUFDQTtnQkFDbENBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLEtBQUtBLENBQUNBLGNBQWNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO2dCQUNsREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3JCQSxNQUFNQSxDQUFDQSxrQkFBa0JBLEdBQUdBLDRDQUE0Q0EsQ0FBQ0E7Z0JBQzNFQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDL0JBLEVBQUVBLENBQUNBLENBQUNBLFVBQVVBLEtBQUtBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO29CQUM1QkEsSUFBSUEsR0FBR0EsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2pDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFFUkEsSUFBSUEsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7d0JBQzNCQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDWkEsSUFBSUEsY0FBY0EsR0FBR0EsR0FBR0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7NEJBQzNDQSxJQUFJQSxZQUFZQSxHQUFHQSxHQUFHQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFFMUNBLE1BQU1BLENBQUNBLHNCQUFzQkEsR0FBR0EsWUFBWUEsR0FBR0EsS0FBS0EsR0FBR0EsSUFBSUEsQ0FBQ0E7NEJBQzVEQSxFQUFFQSxDQUFDQSxDQUFDQSxZQUFZQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDbENBLFlBQVlBLEdBQUdBLFlBQVlBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dDQUN6Q0EsTUFBTUEsQ0FBQ0Esc0JBQXNCQSxHQUFHQSxJQUFJQSxDQUFDQTs0QkFDdkNBLENBQUNBOzRCQUNEQSxHQUFHQSxHQUFHQSxZQUFZQSxDQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTs0QkFDaENBLElBQUlBLGtCQUFrQkEsR0FBR0EsRUFBRUEsQ0FBQ0E7NEJBQzVCQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDWkEsSUFBSUEsVUFBVUEsR0FBR0EsWUFBWUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ2pEQSxZQUFZQSxHQUFHQSxZQUFZQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtnQ0FDOUNBLGtCQUFrQkEsR0FBR0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7NEJBQ3JEQSxDQUFDQTs0QkFFREEsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsY0FBY0EsQ0FBQ0E7NEJBQ3ZDQSxNQUFNQSxDQUFDQSxZQUFZQSxHQUFHQSxZQUFZQSxDQUFDQTs0QkFDbkNBLE1BQU1BLENBQUNBLGtCQUFrQkEsR0FBR0Esa0JBQWtCQSxDQUFDQTs0QkFFL0NBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFdBQVdBLEdBQUdBLGNBQWNBLEdBQUdBLFFBQVFBLEdBQUdBLFlBQVlBLEdBQUdBLGtCQUFrQkEsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDOUhBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsQ0FBQ0E7NEJBQzFDQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLEdBQUdBO2dDQUN4QkEsY0FBY0EsRUFBRUEsY0FBY0E7Z0NBQzlCQSxZQUFZQSxFQUFFQSxZQUFZQTtnQ0FDMUJBLFVBQVVBLEVBQUVBLGtCQUFrQkE7NkJBQy9CQSxDQUFDQTt3QkFDSkEsQ0FBQ0E7b0JBQ0hBLENBQUNBO2dCQUNIQSxDQUFDQTtZQUNIQSxDQUFDQTtRQUNIQSxDQUFDQTtRQUVEckQsU0FBU0EsUUFBUUE7WUFDZnNELElBQUlBLFNBQVNBLEdBQUdBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO1lBQzVCQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQTtRQUMzQkEsQ0FBQ0E7UUFFRHRELFNBQVNBLG9CQUFvQkEsQ0FBQ0EsS0FBS0E7WUFDakN1RCxJQUFJQSxFQUFFQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNkQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDVkEsSUFBSUEsT0FBT0EsR0FBR0EsS0FBS0EsQ0FBQ0EsY0FBY0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3BDQSxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDWkEsRUFBRUEsR0FBR0EsT0FBT0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ2xDQSxDQUFDQTtZQUNIQSxDQUFDQTtZQUNEQSxNQUFNQSxDQUFDQSxFQUFFQSxDQUFDQTtRQUNaQSxDQUFDQTtRQUVEdkQsU0FBU0EsY0FBY0EsQ0FBQ0EsSUFBSUEsRUFBRUEsT0FBT0E7WUFDbkN3RCxJQUFJQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNsQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1RBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLFFBQVFBLEVBQUVBLFVBQUNBLEtBQUtBO29CQUNuQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ1pBLElBQUlBLEVBQUVBLEdBQUdBLG9CQUFvQkEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7d0JBQ3JDQSxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxLQUFLQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDbkJBLE1BQU1BLEdBQUdBLEtBQUtBLENBQUNBO3dCQUNqQkEsQ0FBQ0E7b0JBQ0hBLENBQUNBO2dCQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNMQSxDQUFDQTtZQUNEQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtRQUNoQkEsQ0FBQ0E7UUFFRHhELE1BQU1BLENBQUNBLGtCQUFrQkEsR0FBR0E7WUFDMUJBLFNBQVNBLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLG9CQUFvQkEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDbEdBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLHVCQUF1QkEsR0FBR0E7WUFDL0JBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUNwQkEsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtZQUNqQ0EsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLE1BQU1BLENBQUNBLGtCQUFrQkEsRUFBRUEsQ0FBQ0E7WUFDOUJBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO0lBRUpBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBQ05BLENBQUNBLEVBNXBCTSxJQUFJLEtBQUosSUFBSSxRQTRwQlY7O0FDenBCRCxJQUFPLElBQUksQ0F5SVY7QUF6SUQsV0FBTyxJQUFJLEVBQUMsQ0FBQztJQUVYQSxZQUFPQSxDQUFDQSxVQUFVQSxDQUFDQSx1QkFBdUJBLEVBQUVBLENBQUNBLFFBQVFBLEVBQUVBLFdBQVdBLEVBQUVBLGNBQWNBLEVBQUVBLGdCQUFnQkEsRUFBRUEsUUFBUUEsRUFBRUEsMkJBQTJCQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQSxFQUFFQSxjQUFjQSxFQUFFQSxNQUFNQSxFQUFFQSx5QkFBeUJBO1FBRzlOQSxJQUFJQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNsQkEsSUFBSUEsT0FBT0EsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFFbkJBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLFlBQVlBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1FBQ2hEQSxJQUFJQSxjQUFjQSxHQUFHQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQTtRQUUzQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7UUFDbENBLE1BQU1BLENBQUNBLGFBQWFBLEdBQUdBLEVBQUVBLENBQUNBO1FBRzFCQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSw0QkFBNEJBLENBQUNBO1FBRWpEQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQTtZQUNuQkEsSUFBSUEsRUFBRUEsU0FBU0E7WUFDZkEsVUFBVUEsRUFBRUEsS0FBS0E7WUFDakJBLFdBQVdBLEVBQUVBLEtBQUtBO1lBQ2xCQSxzQkFBc0JBLEVBQUVBLElBQUlBO1lBQzVCQSxxQkFBcUJBLEVBQUVBLElBQUlBO1lBQzNCQSx3QkFBd0JBLEVBQUdBLElBQUlBO1lBQy9CQSxhQUFhQSxFQUFFQSxNQUFNQSxDQUFDQSxhQUFhQTtZQUNuQ0EsYUFBYUEsRUFBRUE7Z0JBQ2JBLFVBQVVBLEVBQUVBLEVBQUVBO2FBQ2ZBO1lBQ0RBLFVBQVVBLEVBQUVBO2dCQUNWQTtvQkFDRUEsS0FBS0EsRUFBRUEsTUFBTUE7b0JBQ2JBLFdBQVdBLEVBQUVBLFdBQVdBO29CQUN4QkEsWUFBWUEsRUFBRUEsY0FBY0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsdUJBQXVCQSxDQUFDQTtvQkFDekRBLEtBQUtBLEVBQUVBLEtBQUtBO29CQUNaQSxVQUFVQSxFQUFFQSxFQUFFQTtpQkFDZkE7YUFDRkE7U0FDRkEsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxFQUFFQSxVQUFVQSxLQUFLQSxFQUFFQSxPQUFPQSxFQUFFQSxRQUFRQTtZQUVsRSxVQUFVLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzdCLENBQUMsQ0FBQ0EsQ0FBQ0E7UUFFSEEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxFQUFFQTtZQUM5QixFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUdoQixVQUFVLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzdCLENBQUM7UUFDSCxDQUFDLENBQUNBLENBQUNBO1FBR0hBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBO1lBQ2pCQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxhQUFhQSxDQUFDQSxNQUFNQSxLQUFLQSxDQUFDQSxDQUFDQTtRQUMzQ0EsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0E7WUFDZEEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3BDQSxJQUFJQSxJQUFJQSxHQUFHQSxVQUFVQSxDQUFDQSxNQUFNQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDL0NBLElBQUlBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBO2dCQUMvQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsSUFBSUEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3JCQSxJQUFJQSxhQUFhQSxHQUFHQSxpQkFBaUJBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLHVCQUF1QkEsR0FBR0EsUUFBUUEsQ0FBQ0E7b0JBQzNGQSxjQUFjQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxRQUFRQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxhQUFhQSxFQUFFQSxVQUFDQSxNQUFNQTt3QkFDcEZBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO3dCQUV4QkEsVUFBVUEsRUFBRUEsQ0FBQ0E7b0JBQ2ZBLENBQUNBLENBQUNBLENBQUNBO2dCQUNMQSxDQUFDQTtZQUNIQSxDQUFDQTtRQUNIQSxDQUFDQSxDQUFDQTtRQUVGQSxTQUFTQSxVQUFVQSxDQUFDQSxNQUFNQTtZQUN4QnlELE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLElBQUlBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO1FBQ3BDQSxDQUFDQTtRQUVEekQsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0E7WUFDWkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3BDQSxJQUFJQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFRckNBLElBQUlBLElBQUlBLEdBQUdBLGNBQVNBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLFFBQVFBLEdBQUdBLFVBQVVBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLEdBQUdBLENBQUNBO2dCQUMzRkEsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3ZDQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUN2QkEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsVUFBVUEsRUFBRUEsQ0FBQ0E7UUFFYkEsU0FBU0EsVUFBVUE7WUFDakJ1QyxJQUFJQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQTtZQUUvQkEsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsT0FBT0EsRUFBRUEsY0FBY0EsRUFBRUEsTUFBTUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7WUFFMURBLGNBQWNBLENBQUNBLFVBQVVBLENBQUNBLFFBQVFBLEVBQUVBLFVBQUNBLFVBQVVBO2dCQUM3Q0EsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsVUFBVUEsQ0FBQ0E7Z0JBQy9CQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUN0QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFFSEEsY0FBY0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsUUFBUUEsRUFBRUEsVUFBQ0EsT0FBT0E7Z0JBQzFDQSxNQUFNQSxDQUFDQSxPQUFPQSxHQUFHQSxPQUFPQSxDQUFDQTtnQkFDekJBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLE9BQU9BLEVBQUVBLFVBQUNBLE1BQU1BO29CQUM5QkEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7b0JBQ2hEQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxPQUFPQSxHQUFHQSxFQUFFQSxDQUFDQTtvQkFDbkVBLElBQUlBLFVBQVVBLEdBQUdBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBO29CQUNuQ0EsSUFBSUEsSUFBSUEsR0FBR0EsVUFBVUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7b0JBQzlCQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDVEEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsY0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsV0FBV0EsR0FBR0EsSUFBSUEsR0FBR0EsR0FBR0EsR0FBR0EsUUFBUUEsQ0FBQ0E7b0JBQzVFQSxDQUFDQTtvQkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2ZBLFVBQVVBLEdBQUdBLFVBQVVBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBO3dCQUN0Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQy9CQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxZQUFZQSxDQUFDQTs0QkFDbENBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLEtBQUtBLENBQUNBOzRCQUN0QkEsTUFBTUEsQ0FBQ0EsS0FBS0EsR0FBR0EsT0FBT0EsQ0FBQ0E7d0JBQ3pCQSxDQUFDQTt3QkFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ3RDQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxlQUFlQSxDQUFDQTs0QkFDckNBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLFFBQVFBLENBQUNBOzRCQUN6QkEsTUFBTUEsQ0FBQ0EsS0FBS0EsR0FBR0EsU0FBU0EsQ0FBQ0E7NEJBQ3pCQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQTt3QkFDekJBLENBQUNBO3dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTs0QkFDTkEsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0EsZUFBZUEsQ0FBQ0E7NEJBQ3JDQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxRQUFRQSxDQUFDQTs0QkFDekJBLE1BQU1BLENBQUNBLEtBQUtBLEdBQUdBLFVBQVVBLENBQUNBO3dCQUM1QkEsQ0FBQ0E7d0JBQ0RBLE1BQU1BLENBQUNBLGNBQWNBLEdBQUdBLGVBQWVBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLEtBQUtBLEdBQUdBLFNBQVNBLENBQUNBO29CQUNqR0EsQ0FBQ0E7Z0JBQ0hBLENBQUNBLENBQUNBLENBQUNBO2dCQUNIQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUN0QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDTEEsQ0FBQ0E7SUFDSHZDLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBQ05BLENBQUNBLEVBeklNLElBQUksS0FBSixJQUFJLFFBeUlWOztBQzVJRCxJQUFPLElBQUksQ0FvUVY7QUFwUUQsV0FBTyxJQUFJLEVBQUMsQ0FBQztJQUVYQSxJQUFJQSxnQkFBZ0JBLEdBQUdBLGVBQVVBLENBQUNBLGtCQUFrQkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsV0FBV0EsRUFBRUEsY0FBY0EsRUFBRUEsUUFBUUEsRUFBRUEsT0FBT0EsRUFBRUEsVUFBVUEsRUFBRUEsVUFBQ0EsTUFBTUEsRUFBRUEsU0FBNkJBLEVBQUVBLFlBQXlDQSxFQUFFQSxNQUE2QkEsRUFBRUEsS0FBcUJBLEVBQUVBLFFBQTJCQTtRQUUvUkEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsWUFBWUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDaERBLElBQUlBLGNBQWNBLEdBQUdBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBO1FBSTNDQSxJQUFJQSxTQUFTQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUVyQkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxJQUFJQSxDQUFDQSxnQkFBZ0JBLENBQUNBLFNBQVNBLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBO1FBQ3JFQSxNQUFNQSxDQUFDQSwwQkFBMEJBLEdBQUdBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7UUFDdkVBLE1BQU1BLENBQUNBLDZCQUE2QkEsR0FBR0EsQ0FBQ0Esa0JBQWtCQSxFQUFFQSxXQUFXQSxDQUFDQSxDQUFDQTtRQUV6RUEsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0E7WUFDakJBLFlBQVlBLEVBQUVBLFVBQVVBO1lBQ3hCQSxhQUFhQSxFQUFFQSxJQUFJQTtZQUNuQkEsYUFBYUEsRUFBRUE7Z0JBQ1hBLEVBQUVBLEVBQUVBLElBQUlBO2dCQUNSQSxFQUFFQSxFQUFFQSxJQUFJQTtnQkFDUkEsVUFBVUEsRUFBRUEsSUFBSUE7Z0JBQ2hCQSxTQUFTQSxFQUFFQSxJQUFJQTtnQkFDZkEsVUFBVUEsRUFBRUEsSUFBSUE7Z0JBQ2hCQSxLQUFLQSxFQUFFQSxJQUFJQTtnQkFDWEEsS0FBS0EsRUFBRUEsSUFBSUE7Z0JBQ1hBLGFBQWFBLEVBQUVBLElBQUlBO2FBQ3RCQTtTQUNKQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQTtZQUNsQkEsTUFBTUEsRUFBRUEsS0FBS0E7WUFDYkEsSUFBSUEsRUFBRUEsRUFBRUE7U0FDVEEsQ0FBQ0E7UUFDRkEsTUFBTUEsQ0FBQ0EsZUFBZUEsR0FBR0EsRUFBRUEsQ0FBQ0E7UUFDNUJBLE1BQU1BLENBQUNBLCtCQUErQkEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDOUNBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLEdBQUdBLEtBQUtBLENBQUNBO1FBQ2pDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUM1QkEsTUFBTUEsQ0FBQ0EsZUFBZUEsR0FBR0EsRUFBRUEsQ0FBQ0E7UUFFNUJBLFNBQVNBLGlCQUFpQkE7WUFDeEIwRCxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFBQTtZQUMxREEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsNkJBQTZCQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUMvQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsRUFBRUEsUUFBUUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDM0NBLENBQUNBO1FBRUQxRCxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQTtZQUNkQSxpQkFBaUJBLEVBQUVBLENBQUNBO1FBQ3RCQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxzQkFBc0JBLEdBQUdBLFVBQUNBLElBQUlBO1lBRW5DQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxHQUFHQSxLQUFLQSxDQUFDQTtZQUNqQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDNUJBLElBQUlBLE1BQU1BLEdBQUdBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBO1lBQ3ZDQSxNQUFNQSxDQUFDQSw4QkFBOEJBLEdBQUdBLE1BQU1BLENBQUNBO1lBQy9DQSxNQUFNQSxDQUFDQSxtQ0FBbUNBLEdBQUdBLE1BQU1BLENBQUNBLDhCQUE4QkEsQ0FBQ0EsS0FBS0EsSUFBSUEsSUFBSUEsQ0FBQ0E7WUFDakdBLE1BQU1BLENBQUNBLHFDQUFxQ0EsR0FBR0EsTUFBTUEsQ0FBQ0EsOEJBQThCQSxDQUFDQSxPQUFPQSxJQUFJQSxjQUFjQSxDQUFDQTtZQUMvR0EsTUFBTUEsQ0FBQ0EsdUNBQXVDQSxHQUFHQSxNQUFNQSxDQUFDQSw4QkFBOEJBLENBQUNBLFNBQVNBLElBQUlBLElBQUlBLENBQUNBO1lBQ3pHQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUM5QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1hBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO29CQUNyQkEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0E7b0JBQzVDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQTtnQkFDN0RBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDTkEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsRUFBRUEsQ0FBQ0E7b0JBQ3ZCQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxFQUFFQSxDQUFDQTtnQkFDdkJBLENBQUNBO2dCQUNEQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUN0QkEsQ0FBQ0E7UUFFSEEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxHQUFHQSxVQUFDQSxRQUFlQTtZQUN6Q0EsTUFBTUEsQ0FBQ0EsZUFBZUEsR0FBR0EsUUFBUUEsQ0FBQ0E7WUFDbENBLElBQUlBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLDhCQUE4QkEsQ0FBQ0E7WUFDckRBLElBQUlBLElBQUlBLEdBQUdBLGtCQUFrQkEsRUFBRUEsQ0FBQ0E7WUFHaENBLE1BQU1BLENBQUNBLGVBQWVBLEdBQUdBLElBQUlBLENBQUNBO1lBRzlCQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxHQUFHQSxLQUFLQSxDQUFDQTtZQUNqQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDNUJBLE1BQU1BLENBQUNBLG9CQUFvQkEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFFbkNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLFFBQVFBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO2dCQUN2QkEsTUFBTUEsQ0FBQ0E7WUFDVEEsQ0FBQ0E7WUFHREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsdUNBQXVDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbkRBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUNoQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1pBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO29CQUM5QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsdUNBQXVDQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDM0RBLE1BQU1BLENBQUNBLG9CQUFvQkEsR0FBR0EsMEJBQTBCQSxHQUFHQSxNQUFNQSxDQUFDQSx1Q0FBdUNBLENBQUNBO3dCQUMxR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7d0JBQ3BCQSxNQUFNQSxDQUFDQTtvQkFDVEEsQ0FBQ0E7Z0JBQ0hBLENBQUNBO1lBQ0hBLENBQUNBO1lBR0RBLGNBQWNBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLEVBQUVBLFVBQUNBLE1BQU1BO2dCQUNoREEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7Z0JBQ2xDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxHQUFHQSxNQUFNQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtnQkFDL0NBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO29CQUNaQSxRQUFRQSxFQUFFQSxDQUFDQTtnQkFDYkEsQ0FBQ0E7Z0JBQ0RBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ3RCQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUVIQSxTQUFTQSxRQUFRQTtnQkFDZjJELElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUMvQkEsSUFBSUEsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ25DQSxJQUFJQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxRQUFRQSxDQUFDQTtnQkFFakNBLElBQUlBLGFBQWFBLEdBQUdBLFVBQVVBLEdBQUdBLFFBQVFBLENBQUNBLEtBQUtBLENBQUNBO2dCQUNoREEsSUFBSUEsV0FBV0EsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EseUJBQXlCQSxHQUFHQSxRQUFRQSxDQUFDQSxDQUFDQTtnQkFFakVBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO29CQUNwQkEsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsU0FBU0EsRUFBRUEsc0JBQXNCQSxHQUFHQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFFNURBLGNBQWNBLENBQUNBLGVBQWVBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLEVBQUVBLGFBQWFBLEVBQUVBLFVBQUNBLE1BQU1BO3dCQUN4RUEsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2xEQSxhQUFRQSxDQUFDQSxJQUFJQSxFQUFFQSxRQUFRQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtvQkFDdENBLENBQUNBLENBQUNBLENBQUNBO2dCQUNMQSxDQUFDQTtnQkFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBRTVCQSxTQUFTQSxNQUFNQSxDQUFDQSxXQUFrQkE7d0JBQ2hDQyxJQUFJQSxNQUFNQSxHQUFHQSxrQkFBa0JBLEdBQUdBLFdBQVdBLENBQUNBO3dCQUM5Q0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7d0JBQ25DQSxNQUFNQSxHQUFHQSxNQUFNQSxHQUFHQSxVQUFVQSxDQUFDQTt3QkFDN0JBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO29CQUNoQkEsQ0FBQ0E7b0JBRURELFNBQVNBLGFBQWFBLENBQUNBLElBQVdBO3dCQUNoQ0UsSUFBSUEsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EscUJBQXFCQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTt3QkFDckRBLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBLEtBQUtBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO3dCQUNwQ0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsWUFBWUEsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7d0JBQzFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtvQkFDaEJBLENBQUNBO29CQUlERixNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxPQUFPQSxDQUFDQSxxQkFBcUJBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBO29CQUVuREEsSUFBSUEsWUFBWUEsR0FBR0EsTUFBTUEsR0FBR0EsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0E7b0JBRXZDQSxJQUFJQSxXQUFXQSxHQUFHQSxhQUFhQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtvQkFDOUNBLElBQUlBLFVBQVVBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLENBQUNBO2dCQUV2Q0EsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO29CQUM5QkEsSUFBSUEsT0FBT0EsR0FBd0JBO3dCQUNqQ0EsU0FBU0EsRUFBRUEsU0FBU0E7d0JBQ3BCQSxJQUFJQSxFQUFFQSxNQUFNQSxDQUFDQSxRQUFRQTt3QkFDckJBLElBQUlBLEVBQUVBLFFBQVFBO3dCQUNkQSxRQUFRQSxFQUFFQSxNQUFNQTt3QkFDaEJBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BO3dCQUNyQkEsT0FBT0EsRUFBRUEsVUFBQ0EsUUFBUUE7NEJBQ2hCQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDYkEsY0FBY0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsRUFBRUEsUUFBUUEsRUFBRUEsYUFBYUEsRUFBRUEsVUFBQ0EsTUFBTUE7b0NBQzFFQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxlQUFlQSxHQUFHQSxJQUFJQSxDQUFDQSxDQUFDQTtvQ0FDbENBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO29DQUN4QkEsaUJBQWlCQSxFQUFFQSxDQUFDQTtnQ0FDdEJBLENBQUNBLENBQUNBLENBQUNBOzRCQUNMQSxDQUFDQTs0QkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0NBQ05BLGlCQUFpQkEsRUFBRUEsQ0FBQ0E7NEJBQ3RCQSxDQUFDQTt3QkFDSEEsQ0FBQ0E7d0JBQ0RBLEtBQUtBLEVBQUVBLFVBQUNBLEtBQUtBOzRCQUNYQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxPQUFPQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQTs0QkFDbENBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO3dCQUN0QkEsQ0FBQ0E7cUJBQ0ZBLENBQUNBO29CQUNGQSxRQUFRQSxDQUFDQSxTQUFTQSxDQUFDQSxRQUFRQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTtnQkFDdkNBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFFTkEsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FDbkJBLE9BQU9BLENBQUNBLFVBQVVBLElBQUlBLEVBQUVBLE1BQU1BLEVBQUVBLE9BQU9BLEVBQUVBLE1BQU1BO3dCQUM5QyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO29CQUNuRCxDQUFDLENBQUNBLENBQ0RBLEtBQUtBLENBQUNBLFVBQVVBLElBQUlBLEVBQUVBLE1BQU1BLEVBQUVBLE9BQU9BLEVBQUVBLE1BQU1BO3dCQUU1QyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDO29CQUNqRCxDQUFDLENBQUNBLENBQUNBO2dCQUNQQSxDQUFDQTtZQUNIQSxDQUFDQTtRQUNIM0QsQ0FBQ0EsQ0FBQ0E7UUFFRkEsU0FBU0EsT0FBT0EsQ0FBQ0EsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsUUFBUUEsRUFBRUEsYUFBYUE7WUFFMUQ4RCxjQUFjQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxJQUFJQSxFQUFFQSxRQUFRQSxFQUFFQSxhQUFhQSxFQUFFQSxVQUFDQSxNQUFNQTtnQkFDMUVBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLGVBQWVBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBO2dCQUNsQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBSXhCQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxjQUFjQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFFQSxVQUFDQSxPQUFPQTtvQkFFbEZBLElBQUlBLElBQUlBLEdBQVVBLElBQUlBLENBQUNBO29CQUN2QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsSUFBSUEsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2hDQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSx3QkFBd0JBLEdBQUdBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLEdBQUdBLFdBQVdBLENBQUNBLENBQUNBO3dCQUM1RUEsSUFBSUEsS0FBS0EsR0FBR0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBQUEsQ0FBQ0EsSUFBSUEsT0FBQUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsYUFBUUEsRUFBbkJBLENBQW1CQSxDQUFDQSxDQUFDQTt3QkFDNURBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBOzRCQUNWQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTt3QkFDakNBLENBQUNBO3dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTs0QkFDTkEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsdUJBQXVCQSxHQUFHQSxhQUFRQSxHQUFHQSw4QkFBOEJBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLEdBQUdBLENBQUNBLFVBQUFBLENBQUNBLElBQUlBLE9BQUFBLENBQUNBLENBQUNBLElBQUlBLEVBQU5BLENBQU1BLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNySUEsQ0FBQ0E7b0JBQ0hBLENBQUNBO29CQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDVkEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsMkVBQTJFQSxDQUFDQSxDQUFDQTt3QkFDdkZBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO29CQUNoREEsQ0FBQ0E7b0JBRURBLGFBQVFBLENBQUNBLElBQUlBLEVBQUVBLFFBQVFBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO2dCQUN0Q0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTEEsQ0FBQ0EsQ0FBQ0EsQ0FBQUE7UUFDSkEsQ0FBQ0E7UUFFRDlELFNBQVNBLGtCQUFrQkE7WUFDekIrRCxJQUFJQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSw4QkFBOEJBLENBQUNBO1lBQ3JEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDZEEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsdUJBQXVCQSxDQUFDQSxDQUFDQTtnQkFDbkNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO1lBQ2RBLENBQUNBO1lBQ0RBLElBQUlBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLFFBQVFBLElBQUlBLEVBQUVBLENBQUNBO1lBQ3ZDQSxJQUFJQSxJQUFJQSxHQUFVQSxNQUFNQSxDQUFDQSxlQUFlQSxJQUFJQSxRQUFRQSxDQUFDQTtZQUVyREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBRTFCQSxJQUFJQSxHQUFHQSxHQUFHQSxRQUFRQSxDQUFDQSxXQUFXQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDcENBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUNaQSxJQUFJQSxJQUFJQSxRQUFRQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDbENBLENBQUNBO1lBQ0hBLENBQUNBO1lBR0RBLElBQUlBLE1BQU1BLEdBQVVBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO1lBQ2xDQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFFbEJBLElBQUlBLEdBQUdBLEdBQU9BLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUN0Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2JBLE1BQU1BLEdBQUdBLEVBQUVBLENBQUNBO2dCQUNkQSxDQUFDQTtnQkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ05BLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO2dCQUNwQ0EsQ0FBQ0E7WUFDSEEsQ0FBQ0E7WUFDREEsSUFBSUEsR0FBR0EsR0FBT0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDcENBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUNaQSxNQUFNQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDdkNBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO1lBQ2pDQSxDQUFDQTtZQUNEQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUN2Q0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsTUFBTUEsR0FBR0EsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDN0NBLENBQUNBO0lBRUgvRCxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtBQUVOQSxDQUFDQSxFQXBRTSxJQUFJLEtBQUosSUFBSSxRQW9RVjs7QUNqUUQsSUFBTyxJQUFJLENBeUpWO0FBekpELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFDWEEsWUFBT0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EscUJBQXFCQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxXQUFXQSxFQUFFQSxjQUFjQSxFQUFFQSwyQkFBMkJBLEVBQUVBLFVBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLFlBQVlBLEVBQUVBLHlCQUF5QkE7UUFFeEtBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLFlBQVlBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1FBQ2hEQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLENBQUNBLElBQUlBLENBQUNBLDRCQUF1QkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFFOURBLElBQUlBLGNBQWNBLEdBQUdBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBO1FBRTNDQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQTtZQUNkQSxNQUFNQSxFQUFFQSxJQUFJQTtTQUNiQSxDQUFDQTtRQUVGQSxJQUFJQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSx5QkFBeUJBLENBQUNBLENBQUNBO1FBQ3ZFQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUNoQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsSUFBSUEsTUFBTUEsS0FBS0EsWUFBWUEsQ0FBQ0EsSUFBSUEsUUFBUUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdERBLElBQUlBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBQ3BDQSxDQUFDQTtRQUVEQSxJQUFJQSxPQUFPQSxHQUFHQTtZQUNaQSxJQUFJQSxFQUFFQTtnQkFDSkEsSUFBSUEsRUFBRUEsTUFBTUE7YUFDYkE7U0FDRkEsQ0FBQ0E7UUFDRkEsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxHQUFHQSxVQUFVQSxDQUFDQSxvQkFBb0JBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO1FBQ3BFQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUd4QkEsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsY0FBTUEsT0FBQUEsTUFBTUEsQ0FBQ0EsUUFBUUEsRUFBZkEsQ0FBZUEsQ0FBQ0E7UUFFdkNBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBLGNBQU1BLFFBQUNBLE1BQU1BLENBQUNBLFFBQVFBLEVBQWhCQSxDQUFnQkEsQ0FBQ0E7UUFFeENBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLGVBQWVBLEVBQUVBLFVBQUNBLFFBQVFBLEVBQUVBLFFBQVFBO1lBQ2hEQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxRQUFRQSxJQUFJQSxRQUFRQSxJQUFJQSxRQUFRQSxLQUFLQSxRQUFRQSxDQUFDQTtRQUNsRUEsQ0FBQ0EsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7UUFFVEEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsUUFBUUEsRUFBRUEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7UUFFakNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLEVBQUVBLFVBQUNBLFFBQVFBLEVBQUVBLFFBQVFBO1lBQzNDQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxZQUFZQSxFQUFFQSxRQUFRQSxDQUFDQSxDQUFDQTtRQUNwQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFFSEEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsY0FBTUEsT0FBQUEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsRUFBaEVBLENBQWdFQSxDQUFDQTtRQUV6RkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0E7WUFDZEEsUUFBUUEsRUFBRUEsQ0FBQ0E7UUFDYkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0E7WUFDWkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3ZDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzQkEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0E7WUFFZEEsSUFBSUEsSUFBSUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsR0FBR0EsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7WUFDakRBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLHVCQUF1QkEsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDNUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1FBQ2ZBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFVBQUNBLElBQUlBLEVBQUVBLElBQUlBO1lBQzNCQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDZkEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7WUFDbEJBLENBQUNBO1lBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUNOQSxNQUFNQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtZQUNoQkEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsVUFBQ0EsSUFBSUE7WUFDckJBLFVBQVVBLENBQUNBO2dCQUNUQSxRQUFRQSxFQUFFQSxDQUFDQTtnQkFDWEEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQUE7WUFDckJBLENBQUNBLEVBQUVBLEVBQUVBLENBQUNB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Q0EsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsSUFBSUEsRUFBRUEsYUFBYUEsQ0FBQ0EsQ0FBQ0E7NEJBQ3ZFQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDYkEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsRUFBRUEsUUFBUUEsQ0FBQ0EsQ0FBQ0E7NEJBQzNCQSxDQUFDQTt3QkFDSEEsQ0FBQ0E7b0JBQ0hBLENBQUNBLENBQUNBLENBQUNBO29CQUNIQSxJQUFJQSxJQUFJQSxHQUFHQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtvQkFDaENBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLEVBQUVBLFVBQUNBLENBQUNBO3dCQUN0QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ2hDQSxNQUFNQSxDQUFDQTt3QkFDVEEsQ0FBQ0E7d0JBQ0RBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNUQSxJQUFJQSxJQUFJQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTt3QkFDeENBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBOzRCQUNUQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDekJBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO2dDQUN0QkEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0NBR3BCQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxX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QUFLQSxHQUFHQSxDQUFDQSxLQUFLQSxHQUFHQSxLQUFLQSxHQUFHQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxVQUFVQSxHQUFHQSxrQkFBa0JBLENBQUNBLGFBQWFBLENBQUNBLENBQUNBO1lBQ3RGQSxDQUFDQTtZQUNEQSxJQUFJQSxJQUFJQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUNkQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxFQUFFQSxJQUFJQSxJQUFJQSxHQUFHQSxDQUFDQSxFQUFFQSxLQUFLQSxFQUFFQSxJQUFJQSxFQUN6REEsVUFBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUE7Z0JBQzVCQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNYQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNQQSxDQUFDQTtRQUVNWix1Q0FBV0EsR0FBbEJBLFVBQW1CQSxNQUFhQSxFQUFFQSxLQUFtQkEsRUFBRUEsYUFBb0JBLEVBQUVBLEVBQUVBO1lBQzdFYSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbkJBLGFBQWFBLEdBQUdBLGVBQWVBLEdBQUdBLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQzNGQSxDQUFDQTtZQUNEQSxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNqQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1hBLEtBQUtBLEdBQUdBLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBO1lBQzFCQSxDQUFDQTtZQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbEJB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QUdNckIsK0JBQUdBLEdBQVZBO1FBUUFzQixDQUFDQTtRQUNIdEIsd0JBQUNBO0lBQURBLENBallBeEYsQUFpWUN3RixJQUFBeEY7SUFqWVlBLHNCQUFpQkEsR0FBakJBLGlCQWlZWkEsQ0FBQUE7QUFDSEEsQ0FBQ0EsRUF2WU0sSUFBSSxLQUFKLElBQUksUUF1WVY7O0FDMVlELElBQU8sSUFBSSxDQU1WO0FBTkQsV0FBTyxJQUFJLEVBQUMsQ0FBQztJQUVBQSx1QkFBa0JBLEdBQUdBLFlBQU9BLENBQUNBLFVBQVVBLENBQUNBLHlCQUF5QkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsUUFBUUEsRUFBRUEsY0FBY0EsRUFBRUEsVUFBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsRUFBRUEsWUFBWUE7SUFFaEpBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBRU5BLENBQUNBLEVBTk0sSUFBSSxLQUFKLElBQUksUUFNViIsImZpbGUiOiJjb21waWxlZC5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbCwiLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgY29udGV4dCA9ICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL2ZvcmdlJztcblxuICBleHBvcnQgdmFyIGhhc2ggPSAnIycgKyBjb250ZXh0O1xuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSAnRm9yZ2UnO1xuICBleHBvcnQgdmFyIHBsdWdpblBhdGggPSAncGx1Z2lucy9mb3JnZS8nO1xuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IHBsdWdpblBhdGggKyAnaHRtbC8nO1xuICBleHBvcnQgdmFyIGxvZzpMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQocGx1Z2luTmFtZSk7XG5cbiAgZXhwb3J0IHZhciBkZWZhdWx0SWNvblVybCA9IENvcmUudXJsKFwiL2ltZy9mb3JnZS5zdmdcIik7XG5cbiAgZXhwb3J0IHZhciBnb2dzU2VydmljZU5hbWUgPSBLdWJlcm5ldGVzLmdvZ3NTZXJ2aWNlTmFtZTtcbiAgZXhwb3J0IHZhciBvcmlvblNlcnZpY2VOYW1lID0gXCJvcmlvblwiO1xuXG4gIGV4cG9ydCB2YXIgbG9nZ2VkSW5Ub0dvZ3MgPSBmYWxzZTtcblxuICBleHBvcnQgZnVuY3Rpb24gaXNGb3JnZSh3b3Jrc3BhY2UpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcykge1xuICAgICRzY29wZS5uYW1lc3BhY2UgPSAkcm91dGVQYXJhbXNbXCJuYW1lc3BhY2VcIl0gfHwgS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICRzY29wZS5wcm9qZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJwcm9qZWN0XCJdO1xuICAgICRzY29wZS4kd29ya3NwYWNlTGluayA9IERldmVsb3Blci53b3Jrc3BhY2VMaW5rKCk7XG4gICAgJHNjb3BlLiRwcm9qZWN0TGluayA9IERldmVsb3Blci5wcm9qZWN0TGluaygkc2NvcGUucHJvamVjdElkKTtcbiAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0QnJlYWRjcnVtYnMoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U3ViTmF2QmFycygkc2NvcGUucHJvamVjdElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTGluayhwcm9qZWN0SWQsIG5hbWUsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBsaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihsaW5rLCBcIi9mb3JnZS9jb21tYW5kXCIsIG5hbWUsIHJlc291cmNlUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmQvXCIsIG5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCBwcm9qZWN0SWQpIHtcbiAgICB2YXIgbGluayA9IERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpO1xuICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZHMvdXNlclwiLCByZXNvdXJjZVBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmRzXCIpO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZXBvc0FwaVVybChGb3JnZUFwaVVSTCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiL3JlcG9zXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHJlcG9BcGlVcmwoRm9yZ2VBcGlVUkwsIHBhdGgpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcIi9yZXBvcy91c2VyXCIsIHBhdGgpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCwgbnMsIHByb2plY3RJZCwgcmVzb3VyY2VQYXRoID0gbnVsbCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBjb21tYW5kSWQsIG5zLCBwcm9qZWN0SWQsIHJlc291cmNlUGF0aCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZXhlY3V0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcImV4ZWN1dGVcIiwgY29tbWFuZElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcInZhbGlkYXRlXCIsIGNvbW1hbmRJZCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY29tbWFuZElucHV0QXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsIG5zLCBwcm9qZWN0SWQsIHJlc291cmNlUGF0aCkge1xuICAgIGlmIChucyAmJiBwcm9qZWN0SWQpIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZElucHV0XCIsIGNvbW1hbmRJZCwgbnMsIHByb2plY3RJZCwgcmVzb3VyY2VQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kSW5wdXRcIiwgY29tbWFuZElkKTtcbiAgICB9XG4gIH1cblxuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHByb2plY3QgZm9yIHRoZSBnaXZlbiByZXNvdXJjZSBwYXRoXG4gICAqL1xuICBmdW5jdGlvbiBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgaWYgKHJlc291cmNlUGF0aCkge1xuICAgICAgdmFyIHByb2plY3QgPSBGb3JnZU1vZGVsLnByb2plY3RzW3Jlc291cmNlUGF0aF07XG4gICAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgICAgcHJvamVjdCA9IHt9O1xuICAgICAgICBGb3JnZU1vZGVsLnByb2plY3RzW3Jlc291cmNlUGF0aF0gPSBwcm9qZWN0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2plY3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBGb3JnZU1vZGVsLnJvb3RQcm9qZWN0O1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzZXRNb2RlbENvbW1hbmRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCwgY29tbWFuZHMpIHtcbiAgICB2YXIgcHJvamVjdCA9IG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHByb2plY3QuJGNvbW1hbmRzID0gY29tbWFuZHM7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxDb21tYW5kcyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpIHtcbiAgICB2YXIgcHJvamVjdCA9IG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBwcm9qZWN0LiRjb21tYW5kcyB8fCBbXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vZGVsQ29tbWFuZElucHV0TWFwKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBwcm9qZWN0LiRjb21tYW5kSW5wdXRzO1xuICAgIGlmICghY29tbWFuZElucHV0cykge1xuICAgICAgY29tbWFuZElucHV0cyA9IHt9O1xuICAgICAgcHJvamVjdC4kY29tbWFuZElucHV0cyA9IGNvbW1hbmRJbnB1dHM7XG4gICAgfVxuICAgIHJldHVybiBjb21tYW5kSW5wdXRzO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgsIGlkKSB7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBtb2RlbENvbW1hbmRJbnB1dE1hcChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBjb21tYW5kSW5wdXRzW2lkXTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzZXRNb2RlbENvbW1hbmRJbnB1dHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoLCBpZCwgaXRlbSkge1xuICAgIHZhciBjb21tYW5kSW5wdXRzID0gbW9kZWxDb21tYW5kSW5wdXRNYXAoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICByZXR1cm4gY29tbWFuZElucHV0c1tpZF0gPSBpdGVtO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGVucmljaFJlcG8ocmVwbykge1xuICAgIHZhciBvd25lciA9IHJlcG8ub3duZXIgfHwge307XG4gICAgdmFyIHVzZXIgPSBvd25lci51c2VybmFtZSB8fCByZXBvLnVzZXI7XG4gICAgdmFyIG5hbWUgPSByZXBvLm5hbWU7XG4gICAgdmFyIHByb2plY3RJZCA9IG5hbWU7XG4gICAgdmFyIGF2YXRhcl91cmwgPSBvd25lci5hdmF0YXJfdXJsO1xuICAgIGlmIChhdmF0YXJfdXJsICYmIGF2YXRhcl91cmwuc3RhcnRzV2l0aChcImh0dHAvL1wiKSkge1xuICAgICAgYXZhdGFyX3VybCA9IFwiaHR0cDovL1wiICsgYXZhdGFyX3VybC5zdWJzdHJpbmcoNik7XG4gICAgICBvd25lci5hdmF0YXJfdXJsID0gYXZhdGFyX3VybDtcbiAgICB9XG4gICAgaWYgKHVzZXIgJiYgbmFtZSkge1xuICAgICAgdmFyIHJlc291cmNlUGF0aCA9IHVzZXIgKyBcIi9cIiArIG5hbWU7XG4gICAgICByZXBvLiRjb21tYW5kc0xpbmsgPSBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCBwcm9qZWN0SWQpO1xuICAgICAgcmVwby4kYnVpbGRzTGluayA9IFwiL2t1YmVybmV0ZXMvYnVpbGRzP3E9L1wiICsgcmVzb3VyY2VQYXRoICsgXCIuZ2l0XCI7XG4gICAgICB2YXIgaW5qZWN0b3IgPSBIYXd0aW9Db3JlLmluamVjdG9yO1xuICAgICAgaWYgKGluamVjdG9yKSB7XG4gICAgICAgIHZhciBTZXJ2aWNlUmVnaXN0cnkgPSBpbmplY3Rvci5nZXQoXCJTZXJ2aWNlUmVnaXN0cnlcIik7XG4gICAgICAgIGlmIChTZXJ2aWNlUmVnaXN0cnkpIHtcbiAgICAgICAgICB2YXIgb3Jpb25MaW5rID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKG9yaW9uU2VydmljZU5hbWUpO1xuICAgICAgICAgIHZhciBnb2dzU2VydmljZSA9IFNlcnZpY2VSZWdpc3RyeS5maW5kU2VydmljZShnb2dzU2VydmljZU5hbWUpO1xuICAgICAgICAgIGlmIChvcmlvbkxpbmsgJiYgZ29nc1NlcnZpY2UpIHtcbiAgICAgICAgICAgIHZhciBwb3J0YWxJcCA9IGdvZ3NTZXJ2aWNlLnBvcnRhbElQO1xuICAgICAgICAgICAgaWYgKHBvcnRhbElwKSB7XG4gICAgICAgICAgICAgIHZhciBwb3J0ID0gZ29nc1NlcnZpY2UucG9ydDtcbiAgICAgICAgICAgICAgdmFyIHBvcnRUZXh0ID0gKHBvcnQgJiYgcG9ydCAhPT0gODAgJiYgcG9ydCAhPT0gNDQzKSA/IFwiOlwiICsgcG9ydCA6IFwiXCI7XG4gICAgICAgICAgICAgIHZhciBwcm90b2NvbCA9IChwb3J0ICYmIHBvcnQgPT09IDQ0MykgPyBcImh0dHBzOi8vXCIgOiBcImh0dHA6Ly9cIjtcbiAgICAgICAgICAgICAgdmFyIGdpdENsb25lVXJsID0gVXJsSGVscGVycy5qb2luKHByb3RvY29sICsgcG9ydGFsSXAgKyBwb3J0VGV4dCArIFwiL1wiLCByZXNvdXJjZVBhdGggKyBcIi5naXRcIik7XG5cbiAgICAgICAgICAgICAgcmVwby4kb3BlblByb2plY3RMaW5rID0gVXJsSGVscGVycy5qb2luKG9yaW9uTGluayxcbiAgICAgICAgICAgICAgICBcIi9naXQvZ2l0LXJlcG9zaXRvcnkuaHRtbCMsY3JlYXRlUHJvamVjdC5uYW1lPVwiICsgbmFtZSArIFwiLGNsb25lR2l0PVwiICsgZ2l0Q2xvbmVVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVIdHRwQ29uZmlnKCkge1xuICAgIHZhciBhdXRoSGVhZGVyID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl07XG4gICAgdmFyIGVtYWlsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdO1xuICAgIHZhciBjb25maWcgPSB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICB9XG4vKlxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBBdXRob3JpemF0aW9uOiBhdXRoSGVhZGVyLFxuICAgICAgICBFbWFpbDogZW1haWxcbiAgICAgIH1cbiovXG4gICAgfTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkUXVlcnlBcmd1bWVudCh1cmwsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKHVybCAmJiBuYW1lICYmIHZhbHVlKSB7XG4gICAgICB2YXIgc2VwID0gICh1cmwuaW5kZXhPZihcIj9cIikgPj0gMCkgPyBcIiZcIiA6IFwiP1wiO1xuICAgICAgcmV0dXJuIHVybCArIHNlcCArICBuYW1lICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUh0dHBVcmwodXJsLCBhdXRoSGVhZGVyID0gbnVsbCwgZW1haWwgPSBudWxsKSB7XG4gICAgYXV0aEhlYWRlciA9IGF1dGhIZWFkZXIgfHwgbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl07XG4gICAgZW1haWwgPSBlbWFpbCB8fCBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl07XG5cbiAgICB1cmwgPSBhZGRRdWVyeUFyZ3VtZW50KHVybCwgXCJfZ29nc0F1dGhcIiwgYXV0aEhlYWRlcik7XG4gICAgdXJsID0gYWRkUXVlcnlBcmd1bWVudCh1cmwsIFwiX2dvZ3NFbWFpbFwiLCBlbWFpbCk7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTWF0Y2hlc1RleHQoY29tbWFuZCwgZmlsdGVyVGV4dCkge1xuICAgIGlmIChmaWx0ZXJUZXh0KSB7XG4gICAgICByZXR1cm4gQ29yZS5tYXRjaEZpbHRlcklnbm9yZUNhc2UoYW5ndWxhci50b0pzb24oY29tbWFuZCksIGZpbHRlclRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaXNMb2dnZWRJbnRvR29ncygpIHtcbiAgICB2YXIgbG9jYWxTdG9yYWdlID0gS3ViZXJuZXRlcy5pbmplY3QoXCJsb2NhbFN0b3JhZ2VcIikgfHwge307XG4gICAgdmFyIGF1dGhIZWFkZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICAvL3JldHVybiBhdXRoSGVhZGVyID8gbG9nZ2VkSW5Ub0dvZ3MgOiBmYWxzZTtcbiAgICByZXR1cm4gYXV0aEhlYWRlciA/IHRydWUgOiBmYWxzZTtcbi8qXG4gICAgdmFyIGNvbmZpZyA9IGNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICByZXR1cm4gY29uZmlnLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA/IHRydWUgOiBmYWxzZTtcbiovXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQoJHNjb3BlLCAkbG9jYXRpb24pIHtcbiAgICBpZiAoIWlzTG9nZ2VkSW50b0dvZ3MoKSkge1xuICAgICAgdmFyIGRldkxpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICB2YXIgbG9naW5QYWdlID0gVXJsSGVscGVycy5qb2luKGRldkxpbmssIFwiZm9yZ2UvcmVwb3NcIik7XG4gICAgICBsb2cuaW5mbyhcIk5vdCBsb2dnZWQgaW4gc28gcmVkaXJlY3RpbmcgdG8gXCIgKyBsb2dpblBhZ2UpO1xuICAgICAgJGxvY2F0aW9uLnBhdGgobG9naW5QYWdlKVxuICAgIH1cbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbJ2hhd3Rpby1jb3JlJywgJ2hhd3Rpby11aSddKTtcbiAgZXhwb3J0IHZhciBjb250cm9sbGVyID0gUGx1Z2luSGVscGVycy5jcmVhdGVDb250cm9sbGVyRnVuY3Rpb24oX21vZHVsZSwgcGx1Z2luTmFtZSk7XG4gIGV4cG9ydCB2YXIgcm91dGUgPSBQbHVnaW5IZWxwZXJzLmNyZWF0ZVJvdXRpbmdGdW5jdGlvbih0ZW1wbGF0ZVBhdGgpO1xuXG4gIF9tb2R1bGUuY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCAoJHJvdXRlUHJvdmlkZXI6bmcucm91dGUuSVJvdXRlUHJvdmlkZXIpID0+IHtcblxuICAgIGNvbnNvbGUubG9nKFwiTGlzdGVuaW5nIG9uOiBcIiArIFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL2NyZWF0ZVByb2plY3QnKSk7XG5cbiAgICAkcm91dGVQcm92aWRlci53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL2NyZWF0ZVByb2plY3QnKSwgcm91dGUoJ2NyZWF0ZVByb2plY3QuaHRtbCcsIGZhbHNlKSlcbiAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL3JlcG9zLzpwYXRoKicpLCByb3V0ZSgncmVwby5odG1sJywgZmFsc2UpKVxuICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKGNvbnRleHQsICcvcmVwb3MnKSwgcm91dGUoJ3JlcG9zLmh0bWwnLCBmYWxzZSkpO1xuXG4gICAgYW5ndWxhci5mb3JFYWNoKFtjb250ZXh0LCAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9wcm9qZWN0cy86cHJvamVjdC9mb3JnZSddLCAocGF0aCkgPT4ge1xuICAgICAgJHJvdXRlUHJvdmlkZXJcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZHMnKSwgcm91dGUoJ2NvbW1hbmRzLmh0bWwnLCBmYWxzZSkpXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmRzLzpwYXRoKicpLCByb3V0ZSgnY29tbWFuZHMuaHRtbCcsIGZhbHNlKSlcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZC86aWQnKSwgcm91dGUoJ2NvbW1hbmQuaHRtbCcsIGZhbHNlKSlcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZC86aWQvOnBhdGgqJyksIHJvdXRlKCdjb21tYW5kLmh0bWwnLCBmYWxzZSkpO1xuICAgIH0pO1xuXG4gIH1dKTtcblxuICBfbW9kdWxlLmZhY3RvcnkoJ0ZvcmdlQXBpVVJMJywgWyckcScsICckcm9vdFNjb3BlJywgKCRxOm5nLklRU2VydmljZSwgJHJvb3RTY29wZTpuZy5JUm9vdFNjb3BlU2VydmljZSkgPT4ge1xuICAgIHJldHVybiBLdWJlcm5ldGVzLmt1YmVybmV0ZXNBcGlVcmwoKSArIFwiL3Byb3h5XCIgKyBLdWJlcm5ldGVzLmt1YmVybmV0ZXNOYW1lc3BhY2VQYXRoKCkgKyBcIi9zZXJ2aWNlcy9mYWJyaWM4LWZvcmdlL2FwaS9mb3JnZVwiO1xuICB9XSk7XG5cblxuICBfbW9kdWxlLmZhY3RvcnkoJ0ZvcmdlTW9kZWwnLCBbJyRxJywgJyRyb290U2NvcGUnLCAoJHE6bmcuSVFTZXJ2aWNlLCAkcm9vdFNjb3BlOm5nLklSb290U2NvcGVTZXJ2aWNlKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJvb3RQcm9qZWN0OiB7fSxcbiAgICAgIHByb2plY3RzOiBbXVxuICAgIH1cbiAgfV0pO1xuXG4gIF9tb2R1bGUucnVuKFsndmlld1JlZ2lzdHJ5JywgJ0hhd3Rpb05hdicsICh2aWV3UmVnaXN0cnksIEhhd3Rpb05hdikgPT4ge1xuICAgIHZpZXdSZWdpc3RyeVsnZm9yZ2UnXSA9IHRlbXBsYXRlUGF0aCArICdsYXlvdXRGb3JnZS5odG1sJztcbiAgfV0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5hZGRNb2R1bGUocGx1Z2luTmFtZSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgQ29tbWFuZENvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiQ29tbWFuZENvbnRyb2xsZXJcIixcbiAgICBbXCIkc2NvcGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLCBcIkZvcmdlTW9kZWxcIixcbiAgICAgICgkc2NvcGUsICR0ZW1wbGF0ZUNhY2hlOm5nLklUZW1wbGF0ZUNhY2hlU2VydmljZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtcywgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCwgRm9yZ2VNb2RlbCkgPT4ge1xuXG4gICAgICAgICRzY29wZS5tb2RlbCA9IEZvcmdlTW9kZWw7XG5cbiAgICAgICAgJHNjb3BlLnJlc291cmNlUGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl0gfHwgJGxvY2F0aW9uLnNlYXJjaCgpW1wicGF0aFwiXSB8fCBcIlwiO1xuICAgICAgICAkc2NvcGUuaWQgPSAkcm91dGVQYXJhbXNbXCJpZFwiXTtcbiAgICAgICAgJHNjb3BlLnBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdO1xuXG4gICAgICAgICRzY29wZS5hdmF0YXJfdXJsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXTtcbiAgICAgICAgJHNjb3BlLnVzZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXTtcbiAgICAgICAgJHNjb3BlLnJlcG9OYW1lID0gXCJcIjtcbiAgICAgICAgdmFyIHBhdGhTdGVwcyA9ICRzY29wZS5yZXNvdXJjZVBhdGguc3BsaXQoXCIvXCIpO1xuICAgICAgICBpZiAocGF0aFN0ZXBzICYmIHBhdGhTdGVwcy5sZW5ndGgpIHtcbiAgICAgICAgICAkc2NvcGUucmVwb05hbWUgPSBwYXRoU3RlcHNbcGF0aFN0ZXBzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG5cblxuICAgICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG4gICAgICAgIGlmICgkc2NvcGUuaWQgPT09IFwiZGV2b3BzLWVkaXRcIikge1xuICAgICAgICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTZXR0aW5nc0JyZWFkY3J1bWJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgICAgICRzY29wZS5zdWJUYWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdFNldHRpbmdzU3ViTmF2QmFycygkc2NvcGUucHJvamVjdElkKTtcbiAgICAgICAgfVxuICAgICAgICByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cbiAgICAgICAgJHNjb3BlLiRjb21wbGV0ZUxpbmsgPSAkc2NvcGUuJHByb2plY3RMaW5rO1xuICAgICAgICBpZiAoJHNjb3BlLnByb2plY3RJZCkge1xuXG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmNvbW1hbmRzTGluayA9IGNvbW1hbmRzTGluaygkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUucHJvamVjdElkKTtcbiAgICAgICAgJHNjb3BlLmNvbXBsZXRlZExpbmsgPSAkc2NvcGUucHJvamVjdElkID8gVXJsSGVscGVycy5qb2luKCRzY29wZS4kcHJvamVjdExpbmssIFwiZW52aXJvbm1lbnRzXCIpIDogJHNjb3BlLiRwcm9qZWN0TGluaztcblxuICAgICAgICAkc2NvcGUuZW50aXR5ID0ge1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuaW5wdXRMaXN0ID0gWyRzY29wZS5lbnRpdHldO1xuXG4gICAgICAgICRzY29wZS5zY2hlbWEgPSBnZXRNb2RlbENvbW1hbmRJbnB1dHMoRm9yZ2VNb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLmlkKTtcbiAgICAgICAgb25TY2hlbWFMb2FkKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gb25Sb3V0ZUNoYW5nZWQoKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJyb3V0ZSB1cGRhdGVkOyBsZXRzIGNsZWFyIHRoZSBlbnRpdHlcIik7XG4gICAgICAgICAgJHNjb3BlLmVudGl0eSA9IHtcbiAgICAgICAgICB9O1xuICAgICAgICAgICRzY29wZS5pbnB1dExpc3QgPSBbJHNjb3BlLmVudGl0eV07XG4gICAgICAgICAgJHNjb3BlLnByZXZpb3VzU2NoZW1hSnNvbiA9IFwiXCI7XG4gICAgICAgICAgJHNjb3BlLnNjaGVtYSA9IG51bGw7XG4gICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuJG9uKCckcm91dGVDaGFuZ2VTdWNjZXNzJywgb25Sb3V0ZUNoYW5nZWQpO1xuXG4gICAgICAgICRzY29wZS5leGVjdXRlID0gKCkgPT4ge1xuICAgICAgICAgIC8vIFRPRE8gY2hlY2sgaWYgdmFsaWQuLi5cbiAgICAgICAgICAkc2NvcGUucmVzcG9uc2UgPSBudWxsO1xuICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSB0cnVlO1xuICAgICAgICAgICRzY29wZS5pbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25FcnJvciA9IG51bGw7XG4gICAgICAgICAgdmFyIGNvbW1hbmRJZCA9ICRzY29wZS5pZDtcbiAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICB2YXIgdXJsID0gZXhlY3V0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCk7XG4gICAgICAgICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICAgICAgICBuYW1lc3BhY2U6ICRzY29wZS5uYW1lc3BhY2UsXG4gICAgICAgICAgICBwcm9qZWN0TmFtZTogJHNjb3BlLnByb2plY3RJZCxcbiAgICAgICAgICAgIHJlc291cmNlOiByZXNvdXJjZVBhdGgsXG4gICAgICAgICAgICBpbnB1dExpc3Q6ICRzY29wZS5pbnB1dExpc3RcbiAgICAgICAgICB9O1xuICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsKTtcbiAgICAgICAgICBsb2cuaW5mbyhcIkFib3V0IHRvIHBvc3QgdG8gXCIgKyB1cmwgKyBcIiBwYXlsb2FkOiBcIiArIGFuZ3VsYXIudG9Kc29uKHJlcXVlc3QpKTtcbiAgICAgICAgICAkaHR0cC5wb3N0KHVybCwgcmVxdWVzdCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgJHNjb3BlLmludmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25FcnJvciA9IG51bGw7XG4gICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlIHx8IGRhdGEub3V0cHV0O1xuICAgICAgICAgICAgICAgIHZhciB3aXphcmRSZXN1bHRzID0gZGF0YS53aXphcmRSZXN1bHRzO1xuICAgICAgICAgICAgICAgIGlmICh3aXphcmRSZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2god2l6YXJkUmVzdWx0cy5zdGVwVmFsaWRhdGlvbnMsICh2YWxpZGF0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghJHNjb3BlLmludmFsaWQgJiYgIXZhbGlkYXRpb24udmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZXMgPSB2YWxpZGF0aW9uLm1lc3NhZ2VzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbWVzc2FnZXNbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaW52YWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uRXJyb3IgPSBtZXNzYWdlLmRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbklucHV0ID0gbWVzc2FnZS5pbnB1dE5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIHZhciBzdGVwSW5wdXRzID0gd2l6YXJkUmVzdWx0cy5zdGVwSW5wdXRzO1xuICAgICAgICAgICAgICAgICAgaWYgKHN0ZXBJbnB1dHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNjaGVtYSA9IF8ubGFzdChzdGVwSW5wdXRzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHkgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVTY2hlbWEoc2NoZW1hKTtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBsZXRzIGNvcHkgYWNyb3NzIGFueSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSBzY2hlbWFcbiAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hW1wicHJvcGVydGllc1wiXSwgKHByb3BlcnR5LCBuYW1lKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0eS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBsb2cuaW5mbyhcIkFkZGluZyBlbnRpdHkuXCIgKyBuYW1lICsgXCIgPSBcIiArIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVudGl0eVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pbnB1dExpc3QucHVzaCgkc2NvcGUuZW50aXR5KTtcblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmNhbk1vdmVUb05leHRTdGVwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXRzIGNsZWFyIHRoZSByZXNwb25zZSB3ZSd2ZSBhbm90aGVyIHdpemFyZCBwYWdlIHRvIGRvXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGluZGljYXRlIHRoYXQgdGhlIHdpemFyZCBqdXN0IGNvbXBsZXRlZCBhbmQgbGV0cyBoaWRlIHRoZSBpbnB1dCBmb3JtXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2l6YXJkQ29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaW52YWxpZCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5yZXNwb25zZSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGRhdGFPckVtcHR5ID0gKGRhdGEgfHwge30pO1xuICAgICAgICAgICAgICAgIHZhciBzdGF0dXMgPSAoZGF0YU9yRW1wdHkuc3RhdHVzIHx8IFwiXCIpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2VDbGFzcyA9IHRvQmFja2dyb3VuZFN0eWxlKHN0YXR1cyk7XG5cbiAgICAgICAgICAgICAgICB2YXIgb3V0cHV0UHJvcGVydGllcyA9IChkYXRhT3JFbXB0eS5vdXRwdXRQcm9wZXJ0aWVzIHx8IHt9KTtcbiAgICAgICAgICAgICAgICB2YXIgcHJvamVjdElkID0gZGF0YU9yRW1wdHkucHJvamVjdE5hbWUgfHwgb3V0cHV0UHJvcGVydGllcy5mdWxsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnJlc3BvbnNlICYmIHByb2plY3RJZCAmJiAkc2NvcGUuaWQgPT09ICdwcm9qZWN0LW5ldycpIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5yZXNwb25zZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAvLyBsZXRzIGZvcndhcmQgdG8gdGhlIGRldm9wcyBlZGl0IHBhZ2VcbiAgICAgICAgICAgICAgICAgIHZhciBlZGl0UGF0aCA9IFVybEhlbHBlcnMuam9pbihEZXZlbG9wZXIucHJvamVjdExpbmsocHJvamVjdElkKSwgXCIvZm9yZ2UvY29tbWFuZC9kZXZvcHMtZWRpdFwiKTtcbiAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKFwiTW92aW5nIHRvIHRoZSBkZXZvcHMgZWRpdCBwYXRoOiBcIiArIGVkaXRQYXRoKTtcbiAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKGVkaXRQYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgbG9nLndhcm4oXCJGYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiIFwiICsgZGF0YSArIFwiIFwiICsgc3RhdHVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKFwiZW50aXR5XCIsICgpID0+IHtcbiAgICAgICAgICB2YWxpZGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVTY2hlbWEoc2NoZW1hKSB7XG4gICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgLy8gbGV0cyByZW1vdmUgdGhlIHZhbHVlcyBzbyB0aGF0IHdlIGNhbiBwcm9wZXJseSBjaGVjayB3aGVuIHRoZSBzY2hlbWEgcmVhbGx5IGRvZXMgY2hhbmdlXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UgdGhlIHNjaGVtYSB3aWxsIGNoYW5nZSBldmVyeSB0aW1lIHdlIHR5cGUgYSBjaGFyYWN0ZXIgOylcbiAgICAgICAgICAgIHZhciBzY2hlbWFXaXRob3V0VmFsdWVzID0gYW5ndWxhci5jb3B5KHNjaGVtYSk7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hV2l0aG91dFZhbHVlcy5wcm9wZXJ0aWVzLCAocHJvcGVydHkpID0+IHtcbiAgICAgICAgICAgICAgZGVsZXRlIHByb3BlcnR5W1widmFsdWVcIl07XG4gICAgICAgICAgICAgIGRlbGV0ZSBwcm9wZXJ0eVtcImVuYWJsZWRcIl07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBqc29uID0gYW5ndWxhci50b0pzb24oc2NoZW1hV2l0aG91dFZhbHVlcyk7XG4gICAgICAgICAgICBpZiAoanNvbiAhPT0gJHNjb3BlLnByZXZpb3VzU2NoZW1hSnNvbikge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgc2NoZW1hOiBcIiArIGpzb24pO1xuICAgICAgICAgICAgICAkc2NvcGUucHJldmlvdXNTY2hlbWFKc29uID0ganNvbjtcbiAgICAgICAgICAgICAgJHNjb3BlLnNjaGVtYSA9IHNjaGVtYTtcblxuICAgICAgICAgICAgICBpZiAoJHNjb3BlLmlkID09PSBcInByb2plY3QtbmV3XCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZW50aXR5ID0gJHNjb3BlLmVudGl0eTtcbiAgICAgICAgICAgICAgICAvLyBsZXRzIGhpZGUgdGhlIHRhcmdldCBsb2NhdGlvbiFcbiAgICAgICAgICAgICAgICB2YXIgcHJvcGVydGllcyA9IHNjaGVtYS5wcm9wZXJ0aWVzIHx8IHt9O1xuICAgICAgICAgICAgICAgIHZhciBvdmVyd3JpdGUgPSBwcm9wZXJ0aWVzLm92ZXJ3cml0ZTtcbiAgICAgICAgICAgICAgICB2YXIgY2F0YWxvZyA9IHByb3BlcnRpZXMuY2F0YWxvZztcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0TG9jYXRpb24gPSBwcm9wZXJ0aWVzLnRhcmdldExvY2F0aW9uO1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRMb2NhdGlvbikge1xuICAgICAgICAgICAgICAgICAgdGFyZ2V0TG9jYXRpb24uaGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGlmIChvdmVyd3JpdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcndyaXRlLmhpZGRlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImhpZGluZyB0YXJnZXRMb2NhdGlvbiFcIik7XG5cbiAgICAgICAgICAgICAgICAgIC8vIGxldHMgZGVmYXVsdCB0aGUgdHlwZVxuICAgICAgICAgICAgICAgICAgaWYgKCFlbnRpdHkudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHkudHlwZSA9IFwiRnJvbSBBcmNoZXR5cGUgQ2F0YWxvZ1wiO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2F0YWxvZykge1xuICAgICAgICAgICAgICAgICAgaWYgKCFlbnRpdHkuY2F0YWxvZykge1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHkuY2F0YWxvZyA9IFwiZmFicmljOFwiO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHZhbGlkYXRlKCkge1xuICAgICAgICAgIGlmICgkc2NvcGUuZXhlY3V0aW5nIHx8ICRzY29wZS52YWxpZGF0aW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBuZXdKc29uID0gYW5ndWxhci50b0pzb24oJHNjb3BlLmVudGl0eSk7XG4gICAgICAgICAgaWYgKG5ld0pzb24gPT09ICRzY29wZS52YWxpZGF0ZWRFbnRpdHlKc29uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS52YWxpZGF0ZWRFbnRpdHlKc29uID0gbmV3SnNvbjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGNvbW1hbmRJZCA9ICRzY29wZS5pZDtcbiAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICB2YXIgdXJsID0gdmFsaWRhdGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpO1xuICAgICAgICAgIC8vIGxldHMgcHV0IHRoZSBlbnRpdHkgaW4gdGhlIGxhc3QgaXRlbSBpbiB0aGUgbGlzdFxuICAgICAgICAgIHZhciBpbnB1dExpc3QgPSBbXS5jb25jYXQoJHNjb3BlLmlucHV0TGlzdCk7XG4gICAgICAgICAgaW5wdXRMaXN0W2lucHV0TGlzdC5sZW5ndGggLSAxXSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICAgICAgICBuYW1lc3BhY2U6ICRzY29wZS5uYW1lc3BhY2UsXG4gICAgICAgICAgICBwcm9qZWN0TmFtZTogJHNjb3BlLnByb2plY3RJZCxcbiAgICAgICAgICAgIHJlc291cmNlOiByZXNvdXJjZVBhdGgsXG4gICAgICAgICAgICBpbnB1dExpc3Q6ICRzY29wZS5pbnB1dExpc3RcbiAgICAgICAgICB9O1xuICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsKTtcbiAgICAgICAgICAvL2xvZy5pbmZvKFwiQWJvdXQgdG8gcG9zdCB0byBcIiArIHVybCArIFwiIHBheWxvYWQ6IFwiICsgYW5ndWxhci50b0pzb24ocmVxdWVzdCkpO1xuICAgICAgICAgICRzY29wZS52YWxpZGF0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAkaHR0cC5wb3N0KHVybCwgcmVxdWVzdCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgIHRoaXMudmFsaWRhdGlvbiA9IGRhdGE7XG4gICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJnb3QgdmFsaWRhdGlvbiBcIiArIGFuZ3VsYXIudG9Kc29uKGRhdGEsIHRydWUpKTtcbiAgICAgICAgICAgICAgdmFyIHdpemFyZFJlc3VsdHMgPSBkYXRhLndpemFyZFJlc3VsdHM7XG4gICAgICAgICAgICAgIGlmICh3aXphcmRSZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0ZXBJbnB1dHMgPSB3aXphcmRSZXN1bHRzLnN0ZXBJbnB1dHM7XG4gICAgICAgICAgICAgICAgaWYgKHN0ZXBJbnB1dHMpIHtcbiAgICAgICAgICAgICAgICAgIHZhciBzY2hlbWEgPSBfLmxhc3Qoc3RlcElucHV0cyk7XG4gICAgICAgICAgICAgICAgICB1cGRhdGVTY2hlbWEoc2NoZW1hKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcblxuICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgKiBMZXRzIHRocm90dGxlIHRoZSB2YWxpZGF0aW9ucyBzbyB0aGF0IHdlIG9ubHkgZmlyZSBhbm90aGVyIHZhbGlkYXRpb24gYSBsaXR0bGVcbiAgICAgICAgICAgICAgICogYWZ0ZXIgd2UndmUgZ290IGEgcmVwbHkgYW5kIG9ubHkgaWYgdGhlIG1vZGVsIGhhcyBjaGFuZ2VkIHNpbmNlIHRoZW5cbiAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhbGlkYXRlKCk7XG4gICAgICAgICAgICAgIH0sIDIwMCk7XG4gICAgICAgICAgICB9KS5cbiAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgIGxvZy53YXJuKFwiRmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIiBcIiArIGRhdGEgKyBcIiBcIiArIHN0YXR1cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZURhdGEoKTtcblxuICAgICAgICBmdW5jdGlvbiB0b0JhY2tncm91bmRTdHlsZShzdGF0dXMpIHtcbiAgICAgICAgICBpZiAoIXN0YXR1cykge1xuICAgICAgICAgICAgc3RhdHVzID0gXCJcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YXR1cy5zdGFydHNXaXRoKFwic3VjXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJiZy1zdWNjZXNzXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBcImJnLXdhcm5pbmdcIlxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlRGF0YSgpIHtcbiAgICAgICAgICAkc2NvcGUuaXRlbSA9IG51bGw7XG4gICAgICAgICAgdmFyIGNvbW1hbmRJZCA9ICRzY29wZS5pZDtcbiAgICAgICAgICBpZiAoY29tbWFuZElkKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICAgIHZhciB1cmwgPSBjb21tYW5kSW5wdXRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCwgJHNjb3BlLm5hbWVzcGFjZSwgJHNjb3BlLnByb2plY3RJZCwgcmVzb3VyY2VQYXRoKTtcbiAgICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsKTtcbiAgICAgICAgICAgICRodHRwLmdldCh1cmwsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlRGF0YSBsb2FkZWQgc2NoZW1hXCIpO1xuICAgICAgICAgICAgICAgICAgdXBkYXRlU2NoZW1hKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgc2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5pZCwgJHNjb3BlLnNjaGVtYSk7XG4gICAgICAgICAgICAgICAgICBvblNjaGVtYUxvYWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiRmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIiBcIiArIGRhdGEgKyBcIiBcIiArIHN0YXR1cyk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG9uU2NoZW1hTG9hZCgpIHtcbiAgICAgICAgICAvLyBsZXRzIHVwZGF0ZSB0aGUgdmFsdWUgaWYgaXRzIGJsYW5rIHdpdGggdGhlIGRlZmF1bHQgdmFsdWVzIGZyb20gdGhlIHByb3BlcnRpZXNcbiAgICAgICAgICB2YXIgc2NoZW1hID0gJHNjb3BlLnNjaGVtYTtcbiAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHNjaGVtYTtcbiAgICAgICAgICB2YXIgZW50aXR5ID0gJHNjb3BlLmVudGl0eTtcbiAgICAgICAgICBpZiAoc2NoZW1hKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hLnByb3BlcnRpZXMsIChwcm9wZXJ0eSwga2V5KSA9PiB7XG4gICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHByb3BlcnR5LnZhbHVlO1xuICAgICAgICAgICAgICBpZiAodmFsdWUgJiYgIWVudGl0eVtrZXldKSB7XG4gICAgICAgICAgICAgICAgZW50aXR5W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBDb21tYW5kc0NvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiQ29tbWFuZHNDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRkaWFsb2dcIiwgXCIkd2luZG93XCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkbG9jYXRpb25cIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJGb3JnZU1vZGVsXCIsXG4gICAgKCRzY29wZSwgJGRpYWxvZywgJHdpbmRvdywgJHRlbXBsYXRlQ2FjaGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsIGxvY2FsU3RvcmFnZSwgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCwgRm9yZ2VNb2RlbCkgPT4ge1xuXG4gICAgICAkc2NvcGUubW9kZWwgPSBGb3JnZU1vZGVsO1xuICAgICAgJHNjb3BlLnJlc291cmNlUGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl0gfHwgJGxvY2F0aW9uLnNlYXJjaCgpW1wicGF0aFwiXSB8fCBcIlwiO1xuICAgICAgJHNjb3BlLnJlcG9OYW1lID0gXCJcIjtcbiAgICAgICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24gPSAkc2NvcGUucmVzb3VyY2VQYXRoIHx8IFwiXCI7XG4gICAgICB2YXIgcGF0aFN0ZXBzID0gJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbi5zcGxpdChcIi9cIik7XG4gICAgICBpZiAocGF0aFN0ZXBzICYmIHBhdGhTdGVwcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLnJlcG9OYW1lID0gcGF0aFN0ZXBzW3BhdGhTdGVwcy5sZW5ndGggLSAxXTtcbiAgICAgIH1cbiAgICAgIGlmICghJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbi5zdGFydHNXaXRoKFwiL1wiKSAmJiAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uLmxlbmd0aCA+IDApIHtcbiAgICAgICAgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbiA9IFwiL1wiICsgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbjtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmF2YXRhcl91cmwgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdO1xuICAgICAgJHNjb3BlLnVzZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXTtcblxuICAgICAgJHNjb3BlLmNvbW1hbmRzID0gZ2V0TW9kZWxDb21tYW5kcyhGb3JnZU1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoKTtcbiAgICAgICRzY29wZS5mZXRjaGVkID0gJHNjb3BlLmNvbW1hbmRzLmxlbmd0aCAhPT0gMDtcblxuICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuICAgICAgcmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQoJHNjb3BlLCAkbG9jYXRpb24pO1xuXG5cbiAgICAgICRzY29wZS50YWJsZUNvbmZpZyA9IHtcbiAgICAgICAgZGF0YTogJ2NvbW1hbmRzJyxcbiAgICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgIG11bHRpU2VsZWN0OiB0cnVlLFxuICAgICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgIGZpbHRlclRleHQ6ICRsb2NhdGlvbi5zZWFyY2goKVtcInFcIl0gfHwgJydcbiAgICAgICAgfSxcbiAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ05hbWUnLFxuICAgICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoXCJpZFRlbXBsYXRlLmh0bWxcIilcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdEZXNjcmlwdGlvbidcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnY2F0ZWdvcnknLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdDYXRlZ29yeSdcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIGNvbW1hbmRNYXRjaGVzKGNvbW1hbmQpIHtcbiAgICAgICAgdmFyIGZpbHRlclRleHQgPSAkc2NvcGUudGFibGVDb25maWcuZmlsdGVyT3B0aW9ucy5maWx0ZXJUZXh0O1xuICAgICAgICByZXR1cm4gY29tbWFuZE1hdGNoZXNUZXh0KGNvbW1hbmQsIGZpbHRlclRleHQpO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yID0ge1xuICAgICAgICBmaWx0ZXJUZXh0OiBcIlwiLFxuICAgICAgICBmb2xkZXJzOiBbXSxcbiAgICAgICAgc2VsZWN0ZWRDb21tYW5kczogW10sXG4gICAgICAgIGV4cGFuZGVkRm9sZGVyczoge30sXG5cbiAgICAgICAgaXNPcGVuOiAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgdmFyIGZpbHRlclRleHQgPSAkc2NvcGUudGFibGVDb25maWcuZmlsdGVyT3B0aW9ucy5maWx0ZXJUZXh0O1xuICAgICAgICAgIGlmIChmaWx0ZXJUZXh0ICE9PSAnJyB8fCAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmV4cGFuZGVkRm9sZGVyc1tmb2xkZXIuaWRdKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJvcGVuZWRcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiY2xvc2VkXCI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2xlYXJTZWxlY3RlZDogKCkgPT4ge1xuICAgICAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3IuZXhwYW5kZWRGb2xkZXJzID0ge307XG4gICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgfSxcblxuICAgICAgICB1cGRhdGVTZWxlY3RlZDogKCkgPT4ge1xuICAgICAgICAgIC8vIGxldHMgdXBkYXRlIHRoZSBzZWxlY3RlZCBhcHBzXG4gICAgICAgICAgdmFyIHNlbGVjdGVkQ29tbWFuZHMgPSBbXTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLm1vZGVsLmFwcEZvbGRlcnMsIChmb2xkZXIpID0+IHtcbiAgICAgICAgICAgIHZhciBhcHBzID0gZm9sZGVyLmFwcHMuZmlsdGVyKChhcHApID0+IGFwcC5zZWxlY3RlZCk7XG4gICAgICAgICAgICBpZiAoYXBwcykge1xuICAgICAgICAgICAgICBzZWxlY3RlZENvbW1hbmRzID0gc2VsZWN0ZWRDb21tYW5kcy5jb25jYXQoYXBwcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5zZWxlY3RlZENvbW1hbmRzID0gc2VsZWN0ZWRDb21tYW5kcy5zb3J0QnkoXCJuYW1lXCIpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNlbGVjdDogKGNvbW1hbmQsIGZsYWcpID0+IHtcbiAgICAgICAgICB2YXIgaWQgPSBjb21tYW5kLm5hbWU7XG4vKlxuICAgICAgICAgIGFwcC5zZWxlY3RlZCA9IGZsYWc7XG4qL1xuICAgICAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3IudXBkYXRlU2VsZWN0ZWQoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRTZWxlY3RlZENsYXNzOiAoYXBwKSA9PiB7XG4gICAgICAgICAgaWYgKGFwcC5hYnN0cmFjdCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYWJzdHJhY3RcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFwcC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgcmV0dXJuIFwic2VsZWN0ZWRcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2hvd0NvbW1hbmQ6IChjb21tYW5kKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGNvbW1hbmRNYXRjaGVzKGNvbW1hbmQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNob3dGb2xkZXI6IChmb2xkZXIpID0+IHtcbiAgICAgICAgICB2YXIgZmlsdGVyVGV4dCA9ICRzY29wZS50YWJsZUNvbmZpZy5maWx0ZXJPcHRpb25zLmZpbHRlclRleHQ7XG4gICAgICAgICAgcmV0dXJuICFmaWx0ZXJUZXh0IHx8IGZvbGRlci5jb21tYW5kcy5zb21lKChhcHApID0+IGNvbW1hbmRNYXRjaGVzKGFwcCkpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG5cbiAgICAgIHZhciB1cmwgPSBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZHNcIiwgJHNjb3BlLm5hbWVzcGFjZSwgJHNjb3BlLnByb2plY3RJZCwgJHNjb3BlLnJlc291cmNlUGF0aCk7XG4gICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICBsb2cuaW5mbyhcIkZldGNoaW5nIGNvbW1hbmRzIGZyb206IFwiICsgdXJsKTtcbiAgICAgICRodHRwLmdldCh1cmwsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShkYXRhKSAmJiBzdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgICB2YXIgZm9sZGVyTWFwID0ge307XG4gICAgICAgICAgICB2YXIgZm9sZGVycyA9IFtdO1xuICAgICAgICAgICAgJHNjb3BlLmNvbW1hbmRzID0gXy5zb3J0QnkoZGF0YSwgXCJuYW1lXCIpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5jb21tYW5kcywgKGNvbW1hbmQpID0+IHtcbiAgICAgICAgICAgICAgdmFyIGlkID0gY29tbWFuZC5pZCB8fCBjb21tYW5kLm5hbWU7XG4gICAgICAgICAgICAgIGNvbW1hbmQuJGxpbmsgPSBjb21tYW5kTGluaygkc2NvcGUucHJvamVjdElkLCBpZCwgcmVzb3VyY2VQYXRoKTtcblxuICAgICAgICAgICAgICB2YXIgbmFtZSA9IGNvbW1hbmQubmFtZSB8fCBjb21tYW5kLmlkO1xuICAgICAgICAgICAgICB2YXIgZm9sZGVyTmFtZSA9IGNvbW1hbmQuY2F0ZWdvcnk7XG4gICAgICAgICAgICAgIHZhciBzaG9ydE5hbWUgPSBuYW1lO1xuICAgICAgICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KFwiOlwiLCAyKTtcbiAgICAgICAgICAgICAgaWYgKG5hbWVzICE9IG51bGwgJiYgbmFtZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGZvbGRlck5hbWUgPSBuYW1lc1swXTtcbiAgICAgICAgICAgICAgICBzaG9ydE5hbWUgPSBuYW1lc1sxXS50cmltKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGZvbGRlck5hbWUgPT09IFwiUHJvamVjdC9CdWlsZFwiKSB7XG4gICAgICAgICAgICAgICAgZm9sZGVyTmFtZSA9IFwiUHJvamVjdFwiO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbW1hbmQuJHNob3J0TmFtZSA9IHNob3J0TmFtZTtcbiAgICAgICAgICAgICAgY29tbWFuZC4kZm9sZGVyTmFtZSA9IGZvbGRlck5hbWU7XG4gICAgICAgICAgICAgIHZhciBmb2xkZXIgPSBmb2xkZXJNYXBbZm9sZGVyTmFtZV07XG4gICAgICAgICAgICAgIGlmICghZm9sZGVyKSB7XG4gICAgICAgICAgICAgICAgZm9sZGVyID0ge1xuICAgICAgICAgICAgICAgICAgbmFtZTogZm9sZGVyTmFtZSxcbiAgICAgICAgICAgICAgICAgIGNvbW1hbmRzOiBbXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgZm9sZGVyTWFwW2ZvbGRlck5hbWVdID0gZm9sZGVyO1xuICAgICAgICAgICAgICAgIGZvbGRlcnMucHVzaChmb2xkZXIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGZvbGRlci5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBmb2xkZXJzID0gXy5zb3J0QnkoZm9sZGVycywgXCJuYW1lXCIpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGZvbGRlcnMsIChmb2xkZXIpID0+IHtcbiAgICAgICAgICAgICAgZm9sZGVyLmNvbW1hbmRzID0gXy5zb3J0QnkoZm9sZGVyLmNvbW1hbmRzLCBcIiRzaG9ydE5hbWVcIik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3IuZm9sZGVycyA9IGZvbGRlcnM7XG5cbiAgICAgICAgICAgIHNldE1vZGVsQ29tbWFuZHMoJHNjb3BlLm1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuY29tbWFuZHMpO1xuICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkuXG4gICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gICAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIFJlcG9Db250cm9sbGVyID0gY29udHJvbGxlcihcIlJlcG9Db250cm9sbGVyXCIsXG4gICAgW1wiJHNjb3BlXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIixcbiAgICAgICgkc2NvcGUsICR0ZW1wbGF0ZUNhY2hlOm5nLklUZW1wbGF0ZUNhY2hlU2VydmljZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtcywgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCkgPT4ge1xuXG4gICAgICAgICRzY29wZS5uYW1lID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXTtcblxuICAgICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG4gICAgICAgIHJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkKCRzY29wZSwgJGxvY2F0aW9uKTtcblxuICAgICAgICAkc2NvcGUuJG9uKCckcm91dGVVcGRhdGUnLCAoJGV2ZW50KSA9PiB7XG4gICAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB1cGRhdGVEYXRhKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlRGF0YSgpIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLm5hbWUpIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSByZXBvQXBpVXJsKEZvcmdlQXBpVVJMLCAkc2NvcGUubmFtZSk7XG4gICAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICAgICAgICB2YXIgY29uZmlnID0gY3JlYXRlSHR0cENvbmZpZygpO1xuICAgICAgICAgICAgJGh0dHAuZ2V0KHVybCwgY29uZmlnKS5cbiAgICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgZW5yaWNoUmVwbyhkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJHNjb3BlLmVudGl0eSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9KS5cbiAgICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBSZXBvc0NvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiUmVwb3NDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRkaWFsb2dcIiwgXCIkd2luZG93XCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkbG9jYXRpb25cIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJLdWJlcm5ldGVzTW9kZWxcIiwgXCJTZXJ2aWNlUmVnaXN0cnlcIixcbiAgICAoJHNjb3BlLCAkZGlhbG9nLCAkd2luZG93LCAkdGVtcGxhdGVDYWNoZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgbG9jYWxTdG9yYWdlLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMLCBLdWJlcm5ldGVzTW9kZWw6IEt1YmVybmV0ZXMuS3ViZXJuZXRlc01vZGVsU2VydmljZSwgU2VydmljZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICAgICRzY29wZS5tb2RlbCA9IEt1YmVybmV0ZXNNb2RlbDtcbiAgICAgICRzY29wZS5yZXNvdXJjZVBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdO1xuICAgICAgJHNjb3BlLmNvbW1hbmRzTGluayA9IChwYXRoKSA9PiBjb21tYW5kc0xpbmsocGF0aCwgJHNjb3BlLnByb2plY3RJZCk7XG5cbiAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcblxuICAgICAgJHNjb3BlLiRvbigna3ViZXJuZXRlc01vZGVsVXBkYXRlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXBkYXRlTGlua3MoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuXG4gICAgICAkc2NvcGUudGFibGVDb25maWcgPSB7XG4gICAgICAgIGRhdGE6ICdwcm9qZWN0cycsXG4gICAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlUm93Q2xpY2tTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICBtdWx0aVNlbGVjdDogdHJ1ZSxcbiAgICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgICBmaWx0ZXJUZXh0OiAkbG9jYXRpb24uc2VhcmNoKClbXCJxXCJdIHx8ICcnXG4gICAgICAgIH0sXG4gICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ25hbWUnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdSZXBvc2l0b3J5IE5hbWUnLFxuICAgICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoXCJyZXBvVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdhY3Rpb25zJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnQWN0aW9ucycsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcInJlcG9BY3Rpb25zVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmxvZ2luID0ge1xuICAgICAgICBhdXRoSGVhZGVyOiBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXSB8fCBcIlwiLFxuICAgICAgICByZWxvZ2luOiBmYWxzZSxcbiAgICAgICAgYXZhdGFyX3VybDogbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXSB8fCBcIlwiLFxuICAgICAgICB1c2VyOiBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXSB8fCBcIlwiLFxuICAgICAgICBwYXNzd29yZDogXCJcIixcbiAgICAgICAgZW1haWw6IGxvY2FsU3RvcmFnZVtcImdvZ3NFbWFpbFwiXSB8fCBcIlwiXG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZG9Mb2dpbiA9ICgpID0+IHtcbiAgICAgICAgdmFyIGxvZ2luID0gJHNjb3BlLmxvZ2luO1xuICAgICAgICB2YXIgdXNlciA9IGxvZ2luLnVzZXI7XG4gICAgICAgIHZhciBwYXNzd29yZCA9IGxvZ2luLnBhc3N3b3JkO1xuICAgICAgICBpZiAodXNlciAmJiBwYXNzd29yZCkge1xuICAgICAgICAgIHZhciB1c2VyUHdkID0gdXNlciArICc6JyArIHBhc3N3b3JkO1xuICAgICAgICAgIGxvZ2luLmF1dGhIZWFkZXIgPSAnQmFzaWMgJyArICh1c2VyUHdkLmVuY29kZUJhc2U2NCgpKTtcbiAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5sb2dvdXQgPSAoKSA9PiB7XG4gICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICAgICAgJHNjb3BlLmxvZ2luLmF1dGhIZWFkZXIgPSBudWxsO1xuICAgICAgICAkc2NvcGUubG9naW4ubG9nZ2VkSW4gPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLmxvZ2luLmZhaWxlZCA9IGZhbHNlO1xuICAgICAgICBsb2dnZWRJblRvR29ncyA9IGZhbHNlO1xuICAgICAgfTtcblxuXG4gICAgICAkc2NvcGUub3BlbkNvbW1hbmRzID0gKCkgPT4ge1xuICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gbnVsbDtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLnRhYmxlQ29uZmlnLnNlbGVjdGVkSXRlbXM7XG4gICAgICAgIGlmIChfLmlzQXJyYXkoc2VsZWN0ZWQpICYmIHNlbGVjdGVkLmxlbmd0aCkge1xuICAgICAgICAgIHJlc291cmNlUGF0aCA9IHNlbGVjdGVkWzBdLnBhdGg7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGxpbmsgPSBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCAkc2NvcGUucHJvamVjdElkKTtcbiAgICAgICAgbG9nLmluZm8oXCJtb3ZpbmcgdG8gY29tbWFuZHMgbGluazogXCIgKyBsaW5rKTtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgobGluayk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZGVsZXRlID0gKHByb2plY3RzKSA9PiB7XG4gICAgICAgIFVJLm11bHRpSXRlbUNvbmZpcm1BY3Rpb25EaWFsb2coPFVJLk11bHRpSXRlbUNvbmZpcm1BY3Rpb25PcHRpb25zPntcbiAgICAgICAgICBjb2xsZWN0aW9uOiBwcm9qZWN0cyxcbiAgICAgICAgICBpbmRleDogJ3BhdGgnLFxuICAgICAgICAgIG9uQ2xvc2U6IChyZXN1bHQ6Ym9vbGVhbikgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICBkb0RlbGV0ZShwcm9qZWN0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB0aXRsZTogJ0RlbGV0ZSBwcm9qZWN0cz8nLFxuICAgICAgICAgIGFjdGlvbjogJ1RoZSBmb2xsb3dpbmcgcHJvamVjdHMgd2lsbCBiZSByZW1vdmVkICh0aG91Z2ggdGhlIGZpbGVzIHdpbGwgcmVtYWluIG9uIHlvdXIgZmlsZSBzeXN0ZW0pOicsXG4gICAgICAgICAgb2tUZXh0OiAnRGVsZXRlJyxcbiAgICAgICAgICBva0NsYXNzOiAnYnRuLWRhbmdlcicsXG4gICAgICAgICAgY3VzdG9tOiBcIlRoaXMgb3BlcmF0aW9uIGlzIHBlcm1hbmVudCBvbmNlIGNvbXBsZXRlZCFcIixcbiAgICAgICAgICBjdXN0b21DbGFzczogXCJhbGVydCBhbGVydC13YXJuaW5nXCJcbiAgICAgICAgfSkub3BlbigpO1xuICAgICAgfTtcblxuICAgICAgdXBkYXRlTGlua3MoKTtcblxuICAgICAgZnVuY3Rpb24gZG9EZWxldGUocHJvamVjdHMpIHtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHByb2plY3RzLCAocHJvamVjdCkgPT4ge1xuICAgICAgICAgIGxvZy5pbmZvKFwiRGVsZXRpbmcgXCIgKyBhbmd1bGFyLnRvSnNvbigkc2NvcGUucHJvamVjdHMpKTtcbiAgICAgICAgICB2YXIgcGF0aCA9IHByb2plY3QucGF0aDtcbiAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgdmFyIHVybCA9IHJlcG9BcGlVcmwoRm9yZ2VBcGlVUkwsIHBhdGgpO1xuICAgICAgICAgICAgJGh0dHAuZGVsZXRlKHVybCkuXG4gICAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgICAgICAgICB9KS5cbiAgICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IFwiRmFpbGVkIHRvIFBPU1QgdG8gXCIgKyB1cmwgKyBcIiBnb3Qgc3RhdHVzOiBcIiArIHN0YXR1cztcbiAgICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbignZXJyb3InLCBtZXNzYWdlKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gdXBkYXRlTGlua3MoKSB7XG4gICAgICAgIHZhciAkZ29nc0xpbmsgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZVJlYWR5TGluayhnb2dzU2VydmljZU5hbWUpO1xuICAgICAgICBpZiAoJGdvZ3NMaW5rKSB7XG4gICAgICAgICAgJHNjb3BlLnNpZ25VcFVybCA9IFVybEhlbHBlcnMuam9pbigkZ29nc0xpbmssIFwidXNlci9zaWduX3VwXCIpO1xuICAgICAgICAgICRzY29wZS5mb3Jnb3RQYXNzd29yZFVybCA9IFVybEhlbHBlcnMuam9pbigkZ29nc0xpbmssIFwidXNlci9mb3JnZXRfcGFzc3dvcmRcIik7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLiRnb2dzTGluayA9ICRnb2dzTGluaztcbiAgICAgICAgJHNjb3BlLiRmb3JnZUxpbmsgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZVJlYWR5TGluayhLdWJlcm5ldGVzLmZhYnJpYzhGb3JnZVNlcnZpY2VOYW1lKTtcblxuICAgICAgICAkc2NvcGUuJGhhc0NEUGlwZWxpbmVUZW1wbGF0ZSA9IF8uYW55KCRzY29wZS5tb2RlbC50ZW1wbGF0ZXMsICh0KSA9PiBcImNkLXBpcGVsaW5lXCIgPT09IEt1YmVybmV0ZXMuZ2V0TmFtZSh0KSk7XG5cbiAgICAgICAgdmFyIGV4cGVjdGVkUkNTID0gW0t1YmVybmV0ZXMuZ29nc1NlcnZpY2VOYW1lLCBLdWJlcm5ldGVzLmZhYnJpYzhGb3JnZVNlcnZpY2VOYW1lLCBLdWJlcm5ldGVzLmplbmtpbnNTZXJ2aWNlTmFtZV07XG4gICAgICAgIHZhciByZXF1aXJlZFJDcyA9IHt9O1xuICAgICAgICB2YXIgbnMgPSBLdWJlcm5ldGVzLmN1cnJlbnRLdWJlcm5ldGVzTmFtZXNwYWNlKCk7XG4gICAgICAgIHZhciBydW5uaW5nQ0RQaXBlbGluZSA9IHRydWU7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChleHBlY3RlZFJDUywgKHJjTmFtZSkgPT4ge1xuICAgICAgICAgIHZhciByYyA9ICRzY29wZS5tb2RlbC5nZXRSZXBsaWNhdGlvbkNvbnRyb2xsZXIobnMsIHJjTmFtZSk7XG4gICAgICAgICAgaWYgKHJjKSB7XG4gICAgICAgICAgICByZXF1aXJlZFJDc1tyY05hbWVdID0gcmM7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJ1bm5pbmdDRFBpcGVsaW5lID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgJHNjb3BlLiRyZXF1aXJlZFJDcyA9IHJlcXVpcmVkUkNzO1xuICAgICAgICAkc2NvcGUuJHJ1bm5pbmdDRFBpcGVsaW5lID0gcnVubmluZ0NEUGlwZWxpbmU7XG4gICAgICAgIHZhciB1cmwgPSBcIlwiO1xuICAgICAgICAkbG9jYXRpb24gPSBLdWJlcm5ldGVzLmluamVjdChcIiRsb2NhdGlvblwiKTtcbiAgICAgICAgaWYgKCRsb2NhdGlvbikge1xuICAgICAgICAgIHVybCA9ICRsb2NhdGlvbi51cmwoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgIHVybCA9IHdpbmRvdy5sb2NhdGlvbi50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE8gc2hvdWxkIHdlIHN1cHBvcnQgYW55IG90aGVyIHRlbXBsYXRlIG5hbWVzcGFjZXM/XG4gICAgICAgIHZhciB0ZW1wbGF0ZU5hbWVzcGFjZSA9IFwiZGVmYXVsdFwiO1xuICAgICAgICAkc2NvcGUuJHJ1bkNEUGlwZWxpbmVMaW5rID0gXCIva3ViZXJuZXRlcy9uYW1lc3BhY2UvXCIgKyB0ZW1wbGF0ZU5hbWVzcGFjZSArIFwiL3RlbXBsYXRlcy9cIiArIG5zICsgXCI/cT1jZC1waXBlbGluZSZyZXR1cm5Ubz1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh1cmwpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiB1cGRhdGVEYXRhKCkge1xuICAgICAgICB2YXIgYXV0aEhlYWRlciA9ICRzY29wZS5sb2dpbi5hdXRoSGVhZGVyO1xuICAgICAgICB2YXIgZW1haWwgPSAkc2NvcGUubG9naW4uZW1haWwgfHwgXCJcIjtcbiAgICAgICAgaWYgKGF1dGhIZWFkZXIpIHtcbiAgICAgICAgICB2YXIgdXJsID0gcmVwb3NBcGlVcmwoRm9yZ2VBcGlVUkwpO1xuICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsLCBhdXRoSGVhZGVyLCBlbWFpbCk7XG4gICAgICAgICAgdmFyIGNvbmZpZyA9IHtcbi8qXG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgIEdvZ3NBdXRob3JpemF0aW9uOiBhdXRoSGVhZGVyLFxuICAgICAgICAgICAgICBHb2dzRW1haWw6IGVtYWlsXG4gICAgICAgICAgICB9XG4qL1xuICAgICAgICAgIH07XG4gICAgICAgICAgJGh0dHAuZ2V0KHVybCwgY29uZmlnKS5cbiAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dpbi5mYWlsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmxvZ2dlZEluID0gdHJ1ZTtcbiAgICAgICAgICAgICAgbG9nZ2VkSW5Ub0dvZ3MgPSB0cnVlO1xuICAgICAgICAgICAgICB2YXIgYXZhdGFyX3VybCA9IG51bGw7XG4gICAgICAgICAgICAgIGlmIChzdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIGlmICghZGF0YSB8fCAhYW5ndWxhci5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICBkYXRhID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGxldHMgc3RvcmUgYSBzdWNjZXNzZnVsIGxvZ2luIHNvIHRoYXQgd2UgaGlkZSB0aGUgbG9naW4gcGFnZVxuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdID0gYXV0aEhlYWRlcjtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl0gPSBlbWFpbDtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXSA9ICRzY29wZS5sb2dpbi51c2VyIHx8IFwiXCI7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUucHJvamVjdHMgPSBfLnNvcnRCeShkYXRhLCBcIm5hbWVcIik7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5wcm9qZWN0cywgKHJlcG8pID0+IHtcbiAgICAgICAgICAgICAgICAgIGVucmljaFJlcG8ocmVwbyk7XG4gICAgICAgICAgICAgICAgICBpZiAoIWF2YXRhcl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgYXZhdGFyX3VybCA9IENvcmUucGF0aEdldChyZXBvLCBbXCJvd25lclwiLCBcImF2YXRhcl91cmxcIl0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXZhdGFyX3VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5sb2dpbi5hdmF0YXJfdXJsID0gYXZhdGFyX3VybDtcbiAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdID0gYXZhdGFyX3VybDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ291dCgpO1xuICAgICAgICAgICAgICAkc2NvcGUubG9naW4uZmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgaWYgKHN0YXR1cyAhPT0gNDAzKSB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdXBkYXRlRGF0YSgpO1xuXG4gICAgfV0pO1xufVxuIiwiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbm1vZHVsZSBNYWluIHtcblxuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSBcImZhYnJpYzgtY29uc29sZVwiO1xuXG4gIGV4cG9ydCB2YXIgbG9nOiBMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQocGx1Z2luTmFtZSk7XG5cbiAgZXhwb3J0IHZhciB0ZW1wbGF0ZVBhdGggPSBcInBsdWdpbnMvbWFpbi9odG1sXCI7XG5cbiAgLy8ga3ViZXJuZXRlcyBzZXJ2aWNlIG5hbWVzXG4gIGV4cG9ydCB2YXIgY2hhdFNlcnZpY2VOYW1lID0gXCJsZXRzY2hhdFwiO1xuICBleHBvcnQgdmFyIGdyYWZhbmFTZXJ2aWNlTmFtZSA9IFwiZ3JhZmFuYVwiO1xuICBleHBvcnQgdmFyIGFwcExpYnJhcnlTZXJ2aWNlTmFtZSA9IFwiYXBwLWxpYnJhcnlcIjtcblxuICBleHBvcnQgdmFyIHZlcnNpb246YW55ID0ge307XG5cbn1cbiIsIi8vLyBDb3B5cmlnaHQgMjAxNC0yMDE1IFJlZCBIYXQsIEluYy4gYW5kL29yIGl0cyBhZmZpbGlhdGVzXG4vLy8gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyBhcyBpbmRpY2F0ZWQgYnkgdGhlIEBhdXRob3IgdGFncy5cbi8vL1xuLy8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8vXG4vLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vL1xuLy8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5HbG9iYWxzLnRzXCIvPlxuXG5tb2R1bGUgTWFpbiB7XG5cbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgW0ZvcmdlLnBsdWdpbk5hbWVdKTtcblxuICB2YXIgdGFiID0gdW5kZWZpbmVkO1xuXG4gIF9tb2R1bGUucnVuKCgkcm9vdFNjb3BlLCBIYXd0aW9OYXY6IEhhd3Rpb01haW5OYXYuUmVnaXN0cnksIEt1YmVybmV0ZXNNb2RlbCwgU2VydmljZVJlZ2lzdHJ5LCBwcmVmZXJlbmNlc1JlZ2lzdHJ5KSA9PiB7XG5cbiAgICBIYXd0aW9OYXYub24oSGF3dGlvTWFpbk5hdi5BY3Rpb25zLkNIQU5HRUQsIHBsdWdpbk5hbWUsIChpdGVtcykgPT4ge1xuICAgICAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBzd2l0Y2goaXRlbS5pZCkge1xuICAgICAgICAgIGNhc2UgJ2ZvcmdlJzpcbiAgICAgICAgICBjYXNlICdqdm0nOlxuICAgICAgICAgIGNhc2UgJ3dpa2knOlxuICAgICAgICAgIGNhc2UgJ2RvY2tlci1yZWdpc3RyeSc6XG4gICAgICAgICAgICBpdGVtLmlzVmFsaWQgPSAoKSA9PiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2xpYnJhcnknLFxuICAgICAgdGl0bGU6ICgpID0+ICdMaWJyYXJ5JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdWaWV3IHRoZSBsaWJyYXJ5IG9mIGFwcGxpY2F0aW9ucycsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShhcHBMaWJyYXJ5U2VydmljZU5hbWUpICYmIFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKFwiYXBwLWxpYnJhcnktam9sb2tpYVwiKSxcbiAgICAgIGhyZWY6ICgpID0+IFwiL3dpa2kvdmlld1wiLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICB2YXIga2liYW5hU2VydmljZU5hbWUgPSBLdWJlcm5ldGVzLmtpYmFuYVNlcnZpY2VOYW1lO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2tpYmFuYScsXG4gICAgICB0aXRsZTogKCkgPT4gICdMb2dzJyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdWaWV3IGFuZCBzZWFyY2ggYWxsIGxvZ3MgYWNyb3NzIGFsbCBjb250YWluZXJzIHVzaW5nIEtpYmFuYSBhbmQgRWxhc3RpY1NlYXJjaCcsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShraWJhbmFTZXJ2aWNlTmFtZSksXG4gICAgICBocmVmOiAoKSA9PiBLdWJlcm5ldGVzLmtpYmFuYUxvZ3NMaW5rKFNlcnZpY2VSZWdpc3RyeSksXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6ICdhcGltYW4nLFxuICAgICAgdGl0bGU6ICgpID0+ICdBUEkgTWFuYWdlbWVudCcsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnQWRkIFBvbGljaWVzIGFuZCBQbGFucyB0byB5b3VyIEFQSXMgd2l0aCBBcGltYW4nLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoJ2FwaW1hbicpLFxuICAgICAgb2xkSHJlZjogKCkgPT4geyAvKiBub3RoaW5nIHRvIGRvICovIH0sXG4gICAgICBocmVmOiAoKSA9PiB7XG4gICAgICAgIHZhciBoYXNoID0ge1xuICAgICAgICAgIGJhY2tUbzogbmV3IFVSSSgpLnRvU3RyaW5nKCksXG4gICAgICAgICAgdG9rZW46IEhhd3Rpb09BdXRoLmdldE9BdXRoVG9rZW4oKVxuICAgICAgICB9O1xuICAgICAgICB2YXIgdXJpID0gbmV3IFVSSShTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsoJ2FwaW1hbicpKTtcbiAgICAgICAgLy8gVE9ETyBoYXZlIHRvIG92ZXJ3cml0ZSB0aGUgcG9ydCBoZXJlIGZvciBzb21lIHJlYXNvblxuICAgICAgICAoPGFueT51cmkucG9ydCgnODAnKS5xdWVyeSh7fSkucGF0aCgnYXBpbWFudWkvaW5kZXguaHRtbCcpKS5oYXNoKFVSSS5lbmNvZGUoYW5ndWxhci50b0pzb24oaGFzaCkpKTtcbiAgICAgICAgcmV0dXJuIHVyaS50b1N0cmluZygpO1xuICAgICAgfSAgICBcbiAgICB9KTtcblxuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6ICdncmFmYW5hJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ01ldHJpY3MnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXdzIG1ldHJpY3MgYWNyb3NzIGFsbCBjb250YWluZXJzIHVzaW5nIEdyYWZhbmEgYW5kIEluZmx1eERCJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGdyYWZhbmFTZXJ2aWNlTmFtZSksXG4gICAgICBocmVmOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsoZ3JhZmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogXCJjaGF0XCIsXG4gICAgICB0aXRsZTogKCkgPT4gICdDaGF0JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdDaGF0IHJvb20gZm9yIGRpc2N1c3NpbmcgdGhpcyBuYW1lc3BhY2UnLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoY2hhdFNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IHtcbiAgICAgICAgdmFyIGFuc3dlciA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhjaGF0U2VydmljZU5hbWUpO1xuICAgICAgICBpZiAoYW5zd2VyKSB7XG4vKlxuICAgICAgICAgIFRPRE8gYWRkIGEgY3VzdG9tIGxpbmsgdG8gdGhlIGNvcnJlY3Qgcm9vbSBmb3IgdGhlIGN1cnJlbnQgbmFtZXNwYWNlP1xuXG4gICAgICAgICAgdmFyIGlyY0hvc3QgPSBcIlwiO1xuICAgICAgICAgIHZhciBpcmNTZXJ2aWNlID0gU2VydmljZVJlZ2lzdHJ5LmZpbmRTZXJ2aWNlKFwiaHVib3RcIik7XG4gICAgICAgICAgaWYgKGlyY1NlcnZpY2UpIHtcbiAgICAgICAgICAgIGlyY0hvc3QgPSBpcmNTZXJ2aWNlLnBvcnRhbElQO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXJjSG9zdCkge1xuICAgICAgICAgICAgdmFyIG5pY2sgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXSB8fCBsb2NhbFN0b3JhZ2VbXCJpcmNOaWNrXCJdIHx8IFwibXluYW1lXCI7XG4gICAgICAgICAgICB2YXIgcm9vbSA9IFwiI2ZhYnJpYzgtXCIgKyAgY3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoKTtcbiAgICAgICAgICAgIGFuc3dlciA9IFVybEhlbHBlcnMuam9pbihhbnN3ZXIsIFwiL2tpd2lcIiwgaXJjSG9zdCwgXCI/Jm5pY2s9XCIgKyBuaWNrICsgcm9vbSk7XG4gICAgICAgICAgfVxuKi9cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgfSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgLy8gVE9ETyB3ZSBzaG91bGQgbW92ZSB0aGlzIHRvIGEgbmljZXIgbGluayBpbnNpZGUgdGhlIExpYnJhcnkgc29vbiAtIGFsc28gbGV0cyBoaWRlIHVudGlsIGl0IHdvcmtzLi4uXG4vKlxuICAgIHdvcmtzcGFjZS50b3BMZXZlbFRhYnMucHVzaCh7XG4gICAgICBpZDogJ2NyZWF0ZVByb2plY3QnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnQ3JlYXRlJyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdDcmVhdGVzIGEgbmV3IHByb2plY3QnLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoXCJhcHAtbGlicmFyeVwiKSAmJiBmYWxzZSxcbiAgICAgIGhyZWY6ICgpID0+IFwiL3Byb2plY3QvY3JlYXRlXCJcbiAgICB9KTtcbiovXG5cbiAgICBwcmVmZXJlbmNlc1JlZ2lzdHJ5LmFkZFRhYignQWJvdXQgJyArIHZlcnNpb24ubmFtZSwgVXJsSGVscGVycy5qb2luKHRlbXBsYXRlUGF0aCwgJ2Fib3V0Lmh0bWwnKSk7XG5cbiAgICBsb2cuaW5mbyhcInN0YXJ0ZWQsIHZlcnNpb246IFwiLCB2ZXJzaW9uLnZlcnNpb24pO1xuICAgIGxvZy5pbmZvKFwiY29tbWl0IElEOiBcIiwgdmVyc2lvbi5jb21taXRJZCk7XG4gIH0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5yZWdpc3RlclByZUJvb3RzdHJhcFRhc2soKG5leHQpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgdXJsOiAndmVyc2lvbi5qc29uP3Jldj0nICsgRGF0ZS5ub3coKSwgXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHZlcnNpb24gPSBhbmd1bGFyLmZyb21Kc29uKGRhdGEpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICB2ZXJzaW9uID0ge1xuICAgICAgICAgICAgbmFtZTogJ2ZhYnJpYzgtY29uc29sZScsXG4gICAgICAgICAgICB2ZXJzaW9uOiAnJ1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSxcbiAgICAgIGVycm9yOiAoanFYSFIsIHRleHQsIHN0YXR1cykgPT4ge1xuICAgICAgICBsb2cuZGVidWcoXCJGYWlsZWQgdG8gZmV0Y2ggdmVyc2lvbjoganFYSFI6IFwiLCBqcVhIUiwgXCIgdGV4dDogXCIsIHRleHQsIFwiIHN0YXR1czogXCIsIHN0YXR1cyk7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0sXG4gICAgICBkYXRhVHlwZTogXCJodG1sXCJcbiAgICB9KTtcbiAgfSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYWluR2xvYmFscy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYWluUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgTWFpbiB7XG4gIF9tb2R1bGUuY29udHJvbGxlcignTWFpbi5BYm91dCcsICgkc2NvcGUpID0+IHtcbiAgICAkc2NvcGUuaW5mbyA9IHZlcnNpb247XG4gIH0pO1xufVxuXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCB2YXIgbG9nOkxvZ2dpbmcuTG9nZ2VyID0gTG9nZ2VyLmdldChcIldpa2lcIik7XG5cbiAgZXhwb3J0IHZhciBjYW1lbE5hbWVzcGFjZXMgPSBbXCJodHRwOi8vY2FtZWwuYXBhY2hlLm9yZy9zY2hlbWEvc3ByaW5nXCIsIFwiaHR0cDovL2NhbWVsLmFwYWNoZS5vcmcvc2NoZW1hL2JsdWVwcmludFwiXTtcbiAgZXhwb3J0IHZhciBzcHJpbmdOYW1lc3BhY2VzID0gW1wiaHR0cDovL3d3dy5zcHJpbmdmcmFtZXdvcmsub3JnL3NjaGVtYS9iZWFuc1wiXTtcbiAgZXhwb3J0IHZhciBkcm9vbHNOYW1lc3BhY2VzID0gW1wiaHR0cDovL2Ryb29scy5vcmcvc2NoZW1hL2Ryb29scy1zcHJpbmdcIl07XG4gIGV4cG9ydCB2YXIgZG96ZXJOYW1lc3BhY2VzID0gW1wiaHR0cDovL2RvemVyLnNvdXJjZWZvcmdlLm5ldFwiXTtcbiAgZXhwb3J0IHZhciBhY3RpdmVtcU5hbWVzcGFjZXMgPSBbXCJodHRwOi8vYWN0aXZlbXEuYXBhY2hlLm9yZy9zY2hlbWEvY29yZVwiXTtcblxuICBleHBvcnQgdmFyIHVzZUNhbWVsQ2FudmFzQnlEZWZhdWx0ID0gZmFsc2U7XG5cbiAgZXhwb3J0IHZhciBleGNsdWRlQWRqdXN0bWVudFByZWZpeGVzID0gW1wiaHR0cDovL1wiLCBcImh0dHBzOi8vXCIsIFwiI1wiXTtcblxuICBleHBvcnQgZW51bSBWaWV3TW9kZSB7IExpc3QsIEljb24gfTtcblxuICAvKipcbiAgICogVGhlIGN1c3RvbSB2aWV3cyB3aXRoaW4gdGhlIHdpa2kgbmFtZXNwYWNlOyBlaXRoZXIgXCIvd2lraS8kZm9vXCIgb3IgXCIvd2lraS9icmFuY2gvJGJyYW5jaC8kZm9vXCJcbiAgICovXG4gIGV4cG9ydCB2YXIgY3VzdG9tV2lraVZpZXdQYWdlcyA9IFtcIi9mb3JtVGFibGVcIiwgXCIvY2FtZWwvZGlhZ3JhbVwiLCBcIi9jYW1lbC9jYW52YXNcIiwgXCIvY2FtZWwvcHJvcGVydGllc1wiLCBcIi9kb3plci9tYXBwaW5nc1wiXTtcblxuICAvKipcbiAgICogV2hpY2ggZXh0ZW5zaW9ucyBkbyB3ZSB3aXNoIHRvIGhpZGUgaW4gdGhlIHdpa2kgZmlsZSBsaXN0aW5nXG4gICAqIEBwcm9wZXJ0eSBoaWRlRXh0ZW5zaW9uc1xuICAgKiBAZm9yIFdpa2lcbiAgICogQHR5cGUgQXJyYXlcbiAgICovXG4gIGV4cG9ydCB2YXIgaGlkZUV4dGVuc2lvbnMgPSBbXCIucHJvZmlsZVwiXTtcblxuICB2YXIgZGVmYXVsdEZpbGVOYW1lUGF0dGVybiA9IC9eW2EtekEtWjAtOS5fLV0qJC87XG4gIHZhciBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCA9IFwiTmFtZSBtdXN0IGJlOiBsZXR0ZXJzLCBudW1iZXJzLCBhbmQgLiBfIG9yIC0gY2hhcmFjdGVyc1wiO1xuXG4gIHZhciBkZWZhdWx0RmlsZU5hbWVFeHRlbnNpb25QYXR0ZXJuID0gXCJcIjtcblxuICB2YXIgZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybiA9IC9eW2EtejAtOS5fLV0qJC87XG4gIHZhciBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuSW52YWxpZCA9IFwiTmFtZSBtdXN0IGJlOiBsb3dlci1jYXNlIGxldHRlcnMsIG51bWJlcnMsIGFuZCAuIF8gb3IgLSBjaGFyYWN0ZXJzXCI7XG5cbiAgZXhwb3J0IGludGVyZmFjZSBHZW5lcmF0ZU9wdGlvbnMge1xuICAgIHdvcmtzcGFjZTogYW55O1xuICAgIGZvcm06IGFueTtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgYnJhbmNoOiBzdHJpbmc7XG4gICAgcGFyZW50SWQ6IHN0cmluZztcbiAgICBzdWNjZXNzOiAoZmlsZUNvbnRlbnRzPzpzdHJpbmcpID0+IHZvaWQ7XG4gICAgZXJyb3I6IChlcnJvcjphbnkpID0+IHZvaWQ7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHdpemFyZCB0cmVlIGZvciBjcmVhdGluZyBuZXcgY29udGVudCBpbiB0aGUgd2lraVxuICAgKiBAcHJvcGVydHkgZG9jdW1lbnRUZW1wbGF0ZXNcbiAgICogQGZvciBXaWtpXG4gICAqIEB0eXBlIEFycmF5XG4gICAqL1xuICBleHBvcnQgdmFyIGRvY3VtZW50VGVtcGxhdGVzID0gW1xuICAgIHtcbiAgICAgIGxhYmVsOiBcIkZvbGRlclwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGUgYSBuZXcgZm9sZGVyIHRvIGNvbnRhaW4gZG9jdW1lbnRzXCIsXG4gICAgICBmb2xkZXI6IHRydWUsXG4gICAgICBpY29uOiBcIi9pbWcvaWNvbnMvd2lraS9mb2xkZXIuZ2lmXCIsXG4gICAgICBleGVtcGxhcjogXCJteWZvbGRlclwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuSW52YWxpZFxuICAgIH0sXG4gICAgLypcbiAgICB7XG4gICAgICBsYWJlbDogXCJBcHBcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlcyBhIG5ldyBBcHAgZm9sZGVyIHVzZWQgdG8gY29uZmlndXJlIGFuZCBydW4gY29udGFpbmVyc1wiLFxuICAgICAgYWRkQ2xhc3M6IFwiZmEgZmEtY29nIGdyZWVuXCIsXG4gICAgICBleGVtcGxhcjogJ215YXBwJyxcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246ICcnLFxuICAgICAgZ2VuZXJhdGVkOiB7XG4gICAgICAgIG1iZWFuOiBbJ2lvLmZhYnJpYzgnLCB7IHR5cGU6ICdLdWJlcm5ldGVzVGVtcGxhdGVNYW5hZ2VyJyB9XSxcbiAgICAgICAgaW5pdDogKHdvcmtzcGFjZSwgJHNjb3BlKSA9PiB7XG5cbiAgICAgICAgfSxcbiAgICAgICAgZ2VuZXJhdGU6IChvcHRpb25zOkdlbmVyYXRlT3B0aW9ucykgPT4ge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkdvdCBvcHRpb25zOiBcIiwgb3B0aW9ucyk7XG4gICAgICAgICAgb3B0aW9ucy5mb3JtLm5hbWUgPSBvcHRpb25zLm5hbWU7XG4gICAgICAgICAgb3B0aW9ucy5mb3JtLnBhdGggPSBvcHRpb25zLnBhcmVudElkO1xuICAgICAgICAgIG9wdGlvbnMuZm9ybS5icmFuY2ggPSBvcHRpb25zLmJyYW5jaDtcbiAgICAgICAgICB2YXIganNvbiA9IGFuZ3VsYXIudG9Kc29uKG9wdGlvbnMuZm9ybSk7XG4gICAgICAgICAgdmFyIGpvbG9raWEgPSA8Sm9sb2tpYS5JSm9sb2tpYT4gSGF3dGlvQ29yZS5pbmplY3Rvci5nZXQoXCJqb2xva2lhXCIpO1xuICAgICAgICAgIGpvbG9raWEucmVxdWVzdCh7XG4gICAgICAgICAgICB0eXBlOiAnZXhlYycsXG4gICAgICAgICAgICBtYmVhbjogJ2lvLmZhYnJpYzg6dHlwZT1LdWJlcm5ldGVzVGVtcGxhdGVNYW5hZ2VyJyxcbiAgICAgICAgICAgIG9wZXJhdGlvbjogJ2NyZWF0ZUFwcEJ5SnNvbicsXG4gICAgICAgICAgICBhcmd1bWVudHM6IFtqc29uXVxuICAgICAgICAgIH0sIENvcmUub25TdWNjZXNzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiR2VuZXJhdGVkIGFwcCwgcmVzcG9uc2U6IFwiLCByZXNwb25zZSk7XG4gICAgICAgICAgICBvcHRpb25zLnN1Y2Nlc3ModW5kZWZpbmVkKTsgXG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgZXJyb3I6IChyZXNwb25zZSkgPT4geyBvcHRpb25zLmVycm9yKHJlc3BvbnNlLmVycm9yKTsgfVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSxcbiAgICAgICAgZm9ybTogKHdvcmtzcGFjZSwgJHNjb3BlKSA9PiB7XG4gICAgICAgICAgLy8gVE9ETyBkb2NrZXIgcmVnaXN0cnkgY29tcGxldGlvblxuICAgICAgICAgIGlmICghJHNjb3BlLmRvRG9ja2VyUmVnaXN0cnlDb21wbGV0aW9uKSB7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hEb2NrZXJSZXBvc2l0b3JpZXMgPSAoKSA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiBEb2NrZXJSZWdpc3RyeS5jb21wbGV0ZURvY2tlclJlZ2lzdHJ5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdW1tYXJ5TWFya2Rvd246ICdBZGQgYXBwIHN1bW1hcnkgaGVyZScsXG4gICAgICAgICAgICByZXBsaWNhQ291bnQ6IDFcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICBzY2hlbWE6IHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FwcCBzZXR0aW5ncycsXG4gICAgICAgICAgdHlwZTogJ2phdmEubGFuZy5TdHJpbmcnLFxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICdkb2NrZXJJbWFnZSc6IHtcbiAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogJ0RvY2tlciBJbWFnZScsXG4gICAgICAgICAgICAgICd0eXBlJzogJ2phdmEubGFuZy5TdHJpbmcnLFxuICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgXG4gICAgICAgICAgICAgICAgJ3JlcXVpcmVkJzogJycsIFxuICAgICAgICAgICAgICAgICdjbGFzcyc6ICdpbnB1dC14bGFyZ2UnLFxuICAgICAgICAgICAgICAgICd0eXBlYWhlYWQnOiAncmVwbyBmb3IgcmVwbyBpbiBmZXRjaERvY2tlclJlcG9zaXRvcmllcygpIHwgZmlsdGVyOiR2aWV3VmFsdWUnLFxuICAgICAgICAgICAgICAgICd0eXBlYWhlYWQtd2FpdC1tcyc6ICcyMDAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnc3VtbWFyeU1hcmtkb3duJzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnU2hvcnQgRGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAndHlwZSc6ICdqYXZhLmxhbmcuU3RyaW5nJyxcbiAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7ICdjbGFzcyc6ICdpbnB1dC14bGFyZ2UnIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAncmVwbGljYUNvdW50Jzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnUmVwbGljYSBDb3VudCcsXG4gICAgICAgICAgICAgICd0eXBlJzogJ2phdmEubGFuZy5JbnRlZ2VyJyxcbiAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7XG4gICAgICAgICAgICAgICAgbWluOiAnMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsYWJlbHMnOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdMYWJlbHMnLFxuICAgICAgICAgICAgICAndHlwZSc6ICdtYXAnLFxuICAgICAgICAgICAgICAnaXRlbXMnOiB7XG4gICAgICAgICAgICAgICAgJ3R5cGUnOiAnc3RyaW5nJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJGYWJyaWM4IFByb2ZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlIGEgbmV3IGVtcHR5IGZhYnJpYyBwcm9maWxlLiBVc2luZyBhIGh5cGhlbiAoJy0nKSB3aWxsIGNyZWF0ZSBhIGZvbGRlciBoZWlyYXJjaHksIGZvciBleGFtcGxlICdteS1hd2Vzb21lLXByb2ZpbGUnIHdpbGwgYmUgYXZhaWxhYmxlIHZpYSB0aGUgcGF0aCAnbXkvYXdlc29tZS9wcm9maWxlJy5cIixcbiAgICAgIHByb2ZpbGU6IHRydWUsXG4gICAgICBhZGRDbGFzczogXCJmYSBmYS1ib29rIGdyZWVuXCIsXG4gICAgICBleGVtcGxhcjogXCJ1c2VyLXByb2ZpbGVcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBmYWJyaWNPbmx5OiB0cnVlXG4gICAgfSxcbiAgICAqL1xuICAgIHtcbiAgICAgIGxhYmVsOiBcIlByb3BlcnRpZXMgRmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJBIHByb3BlcnRpZXMgZmlsZSB0eXBpY2FsbHkgdXNlZCB0byBjb25maWd1cmUgSmF2YSBjbGFzc2VzXCIsXG4gICAgICBleGVtcGxhcjogXCJwcm9wZXJ0aWVzLWZpbGUucHJvcGVydGllc1wiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIucHJvcGVydGllc1wiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJKU09OIEZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBmaWxlIGNvbnRhaW5pbmcgSlNPTiBkYXRhXCIsXG4gICAgICBleGVtcGxhcjogXCJkb2N1bWVudC5qc29uXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5qc29uXCJcbiAgICB9LFxuICAgIC8qXG4gICAge1xuICAgICAgbGFiZWw6IFwiS2V5IFN0b3JlIEZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlcyBhIGtleXN0b3JlIChkYXRhYmFzZSkgb2YgY3J5cHRvZ3JhcGhpYyBrZXlzLCBYLjUwOSBjZXJ0aWZpY2F0ZSBjaGFpbnMsIGFuZCB0cnVzdGVkIGNlcnRpZmljYXRlcy5cIixcbiAgICAgIGV4ZW1wbGFyOiAna2V5c3RvcmUuamtzJyxcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLmprc1wiLFxuICAgICAgZ2VuZXJhdGVkOiB7XG4gICAgICAgIG1iZWFuOiBbJ2hhd3RpbycsIHsgdHlwZTogJ0tleXN0b3JlU2VydmljZScgfV0sXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uKHdvcmtzcGFjZSwgJHNjb3BlKSB7XG4gICAgICAgICAgdmFyIG1iZWFuID0gJ2hhd3Rpbzp0eXBlPUtleXN0b3JlU2VydmljZSc7XG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0gd29ya3NwYWNlLmpvbG9raWEucmVxdWVzdCgge3R5cGU6IFwicmVhZFwiLCBtYmVhbjogbWJlYW4sIGF0dHJpYnV0ZTogXCJTZWN1cml0eVByb3ZpZGVySW5mb1wiIH0sIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IChyZXNwb25zZSk9PntcbiAgICAgICAgICAgICAgJHNjb3BlLnNlY3VyaXR5UHJvdmlkZXJJbmZvID0gcmVzcG9uc2UudmFsdWU7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ291bGQgbm90IGZpbmQgdGhlIHN1cHBvcnRlZCBzZWN1cml0eSBhbGdvcml0aG1zOiAnLCByZXNwb25zZS5lcnJvcik7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGdlbmVyYXRlOiBmdW5jdGlvbihvcHRpb25zOkdlbmVyYXRlT3B0aW9ucykge1xuICAgICAgICAgIHZhciBlbmNvZGVkRm9ybSA9IEpTT04uc3RyaW5naWZ5KG9wdGlvbnMuZm9ybSlcbiAgICAgICAgICB2YXIgbWJlYW4gPSAnaGF3dGlvOnR5cGU9S2V5c3RvcmVTZXJ2aWNlJztcbiAgICAgICAgICB2YXIgcmVzcG9uc2UgPSBvcHRpb25zLndvcmtzcGFjZS5qb2xva2lhLnJlcXVlc3QoIHtcbiAgICAgICAgICAgICAgdHlwZTogJ2V4ZWMnLCBcbiAgICAgICAgICAgICAgbWJlYW46IG1iZWFuLFxuICAgICAgICAgICAgICBvcGVyYXRpb246ICdjcmVhdGVLZXlTdG9yZVZpYUpTT04oamF2YS5sYW5nLlN0cmluZyknLFxuICAgICAgICAgICAgICBhcmd1bWVudHM6IFtlbmNvZGVkRm9ybV1cbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgbWV0aG9kOidQT1NUJyxcbiAgICAgICAgICAgICAgc3VjY2VzczpmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuc3VjY2VzcyhyZXNwb25zZS52YWx1ZSlcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgZXJyb3I6ZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZXJyb3IocmVzcG9uc2UuZXJyb3IpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBmb3JtOiBmdW5jdGlvbih3b3Jrc3BhY2UsICRzY29wZSl7IFxuICAgICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgc3RvcmVUeXBlOiAkc2NvcGUuc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5U3RvcmVUeXBlc1swXSxcbiAgICAgICAgICAgIGNyZWF0ZVByaXZhdGVLZXk6IGZhbHNlLFxuICAgICAgICAgICAga2V5TGVuZ3RoOiA0MDk2LFxuICAgICAgICAgICAga2V5QWxnb3JpdGhtOiAkc2NvcGUuc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5QWxnb3JpdGhtc1swXSxcbiAgICAgICAgICAgIGtleVZhbGlkaXR5OiAzNjVcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNjaGVtYToge1xuICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiS2V5c3RvcmUgU2V0dGluZ3NcIixcbiAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICBcInByb3BlcnRpZXNcIjogeyBcbiAgICAgICAgICAgICBcInN0b3JlUGFzc3dvcmRcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIktleXN0b3JlIHBhc3N3b3JkLlwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicGFzc3dvcmRcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcInJlcXVpcmVkXCI6ICBcIlwiLCAgXCJuZy1taW5sZW5ndGhcIjo2IH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwic3RvcmVUeXBlXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgdHlwZSBvZiBzdG9yZSB0byBjcmVhdGVcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImphdmEubGFuZy5TdHJpbmdcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1lbGVtZW50JzogXCJzZWxlY3RcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcIm5nLW9wdGlvbnNcIjogIFwidiBmb3IgdiBpbiBzZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlTdG9yZVR5cGVzXCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJjcmVhdGVQcml2YXRlS2V5XCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaG91bGQgd2UgZ2VuZXJhdGUgYSBzZWxmLXNpZ25lZCBwcml2YXRlIGtleT9cIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlDb21tb25OYW1lXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29tbW9uIG5hbWUgb2YgdGhlIGtleSwgdHlwaWNhbGx5IHNldCB0byB0aGUgaG9zdG5hbWUgb2YgdGhlIHNlcnZlclwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleUxlbmd0aFwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGxlbmd0aCBvZiB0aGUgY3J5cHRvZ3JhcGhpYyBrZXlcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIkxvbmdcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlBbGdvcml0aG1cIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBrZXkgYWxnb3JpdGhtXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtZWxlbWVudCc6IFwic2VsZWN0XCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgXCJuZy1vcHRpb25zXCI6ICBcInYgZm9yIHYgaW4gc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5QWxnb3JpdGhtc1wiIH0sXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5VmFsaWRpdHlcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBudW1iZXIgb2YgZGF5cyB0aGUga2V5IHdpbGwgYmUgdmFsaWQgZm9yXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJMb25nXCIsXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5UGFzc3dvcmRcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlBhc3N3b3JkIHRvIHRoZSBwcml2YXRlIGtleVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicGFzc3dvcmRcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICAqL1xuICAgIHtcbiAgICAgIGxhYmVsOiBcIk1hcmtkb3duIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkEgYmFzaWMgbWFya3VwIGRvY3VtZW50IHVzaW5nIHRoZSBNYXJrZG93biB3aWtpIG1hcmt1cCwgcGFydGljdWxhcmx5IHVzZWZ1bCBmb3IgUmVhZE1lIGZpbGVzIGluIGRpcmVjdG9yaWVzXCIsXG4gICAgICBleGVtcGxhcjogXCJSZWFkTWUubWRcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLm1kXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIlRleHQgRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBwbGFpbiB0ZXh0IGZpbGVcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50LnRleHRcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLnR4dFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJIVE1MIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkEgSFRNTCBkb2N1bWVudCB5b3UgY2FuIGVkaXQgZGlyZWN0bHkgdXNpbmcgdGhlIEhUTUwgbWFya3VwXCIsXG4gICAgICBleGVtcGxhcjogXCJkb2N1bWVudC5odG1sXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5odG1sXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIlhNTCBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJBbiBlbXB0eSBYTUwgZG9jdW1lbnRcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50LnhtbFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkludGVncmF0aW9uIEZsb3dzXCIsXG4gICAgICB0b29sdGlwOiBcIkNhbWVsIHJvdXRlcyBmb3IgZGVmaW5pbmcgeW91ciBpbnRlZ3JhdGlvbiBmbG93c1wiLFxuICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiBcIkNhbWVsIFhNTCBkb2N1bWVudFwiLFxuICAgICAgICAgIHRvb2x0aXA6IFwiQSB2YW5pbGxhIENhbWVsIFhNTCBkb2N1bWVudCBmb3IgaW50ZWdyYXRpb24gZmxvd3NcIixcbiAgICAgICAgICBpY29uOiBcIi9pbWcvaWNvbnMvY2FtZWwuc3ZnXCIsXG4gICAgICAgICAgZXhlbXBsYXI6IFwiY2FtZWwueG1sXCIsXG4gICAgICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IFwiQ2FtZWwgT1NHaSBCbHVlcHJpbnQgWE1MIGRvY3VtZW50XCIsXG4gICAgICAgICAgdG9vbHRpcDogXCJBIHZhbmlsbGEgQ2FtZWwgWE1MIGRvY3VtZW50IGZvciBpbnRlZ3JhdGlvbiBmbG93cyB3aGVuIHVzaW5nIE9TR2kgQmx1ZXByaW50XCIsXG4gICAgICAgICAgaWNvbjogXCIvaW1nL2ljb25zL2NhbWVsLnN2Z1wiLFxuICAgICAgICAgIGV4ZW1wbGFyOiBcImNhbWVsLWJsdWVwcmludC54bWxcIixcbiAgICAgICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogXCJDYW1lbCBTcHJpbmcgWE1MIGRvY3VtZW50XCIsXG4gICAgICAgICAgdG9vbHRpcDogXCJBIHZhbmlsbGEgQ2FtZWwgWE1MIGRvY3VtZW50IGZvciBpbnRlZ3JhdGlvbiBmbG93cyB3aGVuIHVzaW5nIHRoZSBTcHJpbmcgZnJhbWV3b3JrXCIsXG4gICAgICAgICAgaWNvbjogXCIvaW1nL2ljb25zL2NhbWVsLnN2Z1wiLFxuICAgICAgICAgIGV4ZW1wbGFyOiBcImNhbWVsLXNwcmluZy54bWxcIixcbiAgICAgICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkRhdGEgTWFwcGluZyBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJEb3plciBiYXNlZCBjb25maWd1cmF0aW9uIG9mIG1hcHBpbmcgZG9jdW1lbnRzXCIsXG4gICAgICBpY29uOiBcIi9pbWcvaWNvbnMvZG96ZXIvZG96ZXIuZ2lmXCIsXG4gICAgICBleGVtcGxhcjogXCJkb3plci1tYXBwaW5nLnhtbFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICB9XG4gIF07XG5cbiAgLy8gVE9ETyBSRU1PVkVcbiAgZXhwb3J0IGZ1bmN0aW9uIGlzRk1DQ29udGFpbmVyKHdvcmtzcGFjZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFRPRE8gUkVNT1ZFXG4gIGV4cG9ydCBmdW5jdGlvbiBpc1dpa2lFbmFibGVkKHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4vKlxuICAgIHJldHVybiBHaXQuY3JlYXRlR2l0UmVwb3NpdG9yeSh3b3Jrc3BhY2UsIGpvbG9raWEsIGxvY2FsU3RvcmFnZSkgIT09IG51bGw7XG4qL1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdvVG9MaW5rKGxpbmssICR0aW1lb3V0LCAkbG9jYXRpb24pIHtcbiAgICB2YXIgaHJlZiA9IENvcmUudHJpbUxlYWRpbmcobGluaywgXCIjXCIpO1xuICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgIGxvZy5kZWJ1ZyhcIkFib3V0IHRvIG5hdmlnYXRlIHRvOiBcIiArIGhyZWYpO1xuICAgICAgJGxvY2F0aW9uLnVybChocmVmKTtcbiAgICB9LCAxMDApO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYWxsIHRoZSBsaW5rcyBmb3IgdGhlIGdpdmVuIGJyYW5jaCBmb3IgdGhlIGN1c3RvbSB2aWV3cywgc3RhcnRpbmcgd2l0aCBcIi9cIlxuICAgKiBAcGFyYW0gJHNjb3BlXG4gICAqIEByZXR1cm5zIHtzdHJpbmdbXX1cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBjdXN0b21WaWV3TGlua3MoJHNjb3BlKSB7XG4gICAgdmFyIHByZWZpeCA9IENvcmUudHJpbUxlYWRpbmcoV2lraS5zdGFydExpbmsoJHNjb3BlKSwgXCIjXCIpO1xuICAgIHJldHVybiBjdXN0b21XaWtpVmlld1BhZ2VzLm1hcChwYXRoID0+IHByZWZpeCArIHBhdGgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBuZXcgY3JlYXRlIGRvY3VtZW50IHdpemFyZCB0cmVlXG4gICAqIEBtZXRob2QgY3JlYXRlV2l6YXJkVHJlZVxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVdpemFyZFRyZWUod29ya3NwYWNlLCAkc2NvcGUpIHtcbiAgICB2YXIgcm9vdCA9IGNyZWF0ZUZvbGRlcihcIk5ldyBEb2N1bWVudHNcIik7XG4gICAgYWRkQ3JlYXRlV2l6YXJkRm9sZGVycyh3b3Jrc3BhY2UsICRzY29wZSwgcm9vdCwgZG9jdW1lbnRUZW1wbGF0ZXMpO1xuICAgIHJldHVybiByb290O1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRm9sZGVyKG5hbWUpOiBhbnkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgY2hpbGRyZW46IFtdXG4gICAgfTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBhZGRDcmVhdGVXaXphcmRGb2xkZXJzKHdvcmtzcGFjZSwgJHNjb3BlLCBwYXJlbnQsIHRlbXBsYXRlczogYW55W10pIHtcbiAgICBhbmd1bGFyLmZvckVhY2godGVtcGxhdGVzLCAodGVtcGxhdGUpID0+IHtcblxuICAgICAgaWYgKCB0ZW1wbGF0ZS5nZW5lcmF0ZWQgKSB7XG4gICAgICAgIGlmICggdGVtcGxhdGUuZ2VuZXJhdGVkLmluaXQgKSB7XG4gICAgICAgICAgdGVtcGxhdGUuZ2VuZXJhdGVkLmluaXQod29ya3NwYWNlLCAkc2NvcGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciB0aXRsZSA9IHRlbXBsYXRlLmxhYmVsIHx8IGtleTtcbiAgICAgIHZhciBub2RlID0gY3JlYXRlRm9sZGVyKHRpdGxlKTtcbiAgICAgIG5vZGUucGFyZW50ID0gcGFyZW50O1xuICAgICAgbm9kZS5lbnRpdHkgPSB0ZW1wbGF0ZTtcblxuICAgICAgdmFyIGFkZENsYXNzID0gdGVtcGxhdGUuYWRkQ2xhc3M7XG4gICAgICBpZiAoYWRkQ2xhc3MpIHtcbiAgICAgICAgbm9kZS5hZGRDbGFzcyA9IGFkZENsYXNzO1xuICAgICAgfVxuXG4gICAgICB2YXIga2V5ID0gdGVtcGxhdGUuZXhlbXBsYXI7XG4gICAgICB2YXIgcGFyZW50S2V5ID0gcGFyZW50LmtleSB8fCBcIlwiO1xuICAgICAgbm9kZS5rZXkgPSBwYXJlbnRLZXkgPyBwYXJlbnRLZXkgKyBcIl9cIiArIGtleSA6IGtleTtcbiAgICAgIHZhciBpY29uID0gdGVtcGxhdGUuaWNvbjtcbiAgICAgIGlmIChpY29uKSB7XG4gICAgICAgIG5vZGUuaWNvbiA9IENvcmUudXJsKGljb24pO1xuICAgICAgfVxuICAgICAgLy8gY29tcGlsZXIgd2FzIGNvbXBsYWluaW5nIGFib3V0ICdsYWJlbCcgaGFkIG5vIGlkZWEgd2hlcmUgaXQncyBjb21pbmcgZnJvbVxuICAgICAgLy8gdmFyIHRvb2x0aXAgPSB2YWx1ZVtcInRvb2x0aXBcIl0gfHwgdmFsdWVbXCJkZXNjcmlwdGlvblwiXSB8fCBsYWJlbDtcbiAgICAgIHZhciB0b29sdGlwID0gdGVtcGxhdGVbXCJ0b29sdGlwXCJdIHx8IHRlbXBsYXRlW1wiZGVzY3JpcHRpb25cIl0gfHwgJyc7XG4gICAgICBub2RlLnRvb2x0aXAgPSB0b29sdGlwO1xuICAgICAgaWYgKHRlbXBsYXRlW1wiZm9sZGVyXCJdKSB7XG4gICAgICAgIG5vZGUuaXNGb2xkZXIgPSAoKSA9PiB7IHJldHVybiB0cnVlOyB9O1xuICAgICAgfVxuICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2gobm9kZSk7XG5cbiAgICAgIHZhciBjaGlsZHJlbiA9IHRlbXBsYXRlLmNoaWxkcmVuO1xuICAgICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgIGFkZENyZWF0ZVdpemFyZEZvbGRlcnMod29ya3NwYWNlLCAkc2NvcGUsIG5vZGUsIGNoaWxkcmVuKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzdGFydExpbmsoJHNjb3BlKSB7XG4gICAgdmFyIHByb2plY3RJZCA9ICRzY29wZS5wcm9qZWN0SWQ7XG4gICAgdmFyIHN0YXJ0ID0gVXJsSGVscGVycy5qb2luKERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpLCBcIi93aWtpXCIpO1xuICAgIHZhciBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgIGlmIChicmFuY2gpIHtcbiAgICAgIHN0YXJ0ID0gVXJsSGVscGVycy5qb2luKHN0YXJ0LCAnYnJhbmNoJywgYnJhbmNoKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0YXJ0O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gZmlsZW5hbWUvcGF0aCBpcyBhbiBpbmRleCBwYWdlIChuYW1lZCBpbmRleC4qIGFuZCBpcyBhIG1hcmtkb3duL2h0bWwgcGFnZSkuXG4gICAqXG4gICAqIEBwYXJhbSBwYXRoXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGlzSW5kZXhQYWdlKHBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiBwYXRoICYmIChwYXRoLmVuZHNXaXRoKFwiaW5kZXgubWRcIikgfHwgcGF0aC5lbmRzV2l0aChcImluZGV4Lmh0bWxcIikgfHwgcGF0aC5lbmRzV2l0aChcImluZGV4XCIpKSA/IHRydWUgOiBmYWxzZTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB2aWV3TGluaygkc2NvcGUsIHBhZ2VJZDpzdHJpbmcsICRsb2NhdGlvbiwgZmlsZU5hbWU6c3RyaW5nID0gbnVsbCkge1xuICAgIHZhciBsaW5rOnN0cmluZyA9IG51bGw7XG4gICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgaWYgKHBhZ2VJZCkge1xuICAgICAgLy8gZmlndXJlIG91dCB3aGljaCB2aWV3IHRvIHVzZSBmb3IgdGhpcyBwYWdlXG4gICAgICB2YXIgdmlldyA9IGlzSW5kZXhQYWdlKHBhZ2VJZCkgPyBcIi9ib29rL1wiIDogXCIvdmlldy9cIjtcbiAgICAgIGxpbmsgPSBzdGFydCArIHZpZXcgKyBlbmNvZGVQYXRoKENvcmUudHJpbUxlYWRpbmcocGFnZUlkLCBcIi9cIikpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBsZXRzIHVzZSB0aGUgY3VycmVudCBwYXRoXG4gICAgICB2YXIgcGF0aDpzdHJpbmcgPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgbGluayA9IFwiI1wiICsgcGF0aC5yZXBsYWNlKC8oZWRpdHxjcmVhdGUpLywgXCJ2aWV3XCIpO1xuICAgIH1cbiAgICBpZiAoZmlsZU5hbWUgJiYgcGFnZUlkICYmIHBhZ2VJZC5lbmRzV2l0aChmaWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiBsaW5rO1xuICAgIH1cbiAgICBpZiAoZmlsZU5hbWUpIHtcbiAgICAgIGlmICghbGluay5lbmRzV2l0aChcIi9cIikpIHtcbiAgICAgICAgbGluayArPSBcIi9cIjtcbiAgICAgIH1cbiAgICAgIGxpbmsgKz0gZmlsZU5hbWU7XG4gICAgfVxuICAgIHJldHVybiBsaW5rO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGJyYW5jaExpbmsoJHNjb3BlLCBwYWdlSWQ6IHN0cmluZywgJGxvY2F0aW9uLCBmaWxlTmFtZTpzdHJpbmcgPSBudWxsKSB7XG4gICAgcmV0dXJuIHZpZXdMaW5rKCRzY29wZSwgcGFnZUlkLCAkbG9jYXRpb24sIGZpbGVOYW1lKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBlZGl0TGluaygkc2NvcGUsIHBhZ2VJZDpzdHJpbmcsICRsb2NhdGlvbikge1xuICAgIHZhciBsaW5rOnN0cmluZyA9IG51bGw7XG4gICAgdmFyIGZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdChwYWdlSWQpO1xuICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICBjYXNlIFwiaW1hZ2VcIjpcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICBpZiAocGFnZUlkKSB7XG4gICAgICAgIGxpbmsgPSBzdGFydCArIFwiL2VkaXQvXCIgKyBlbmNvZGVQYXRoKHBhZ2VJZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBsZXRzIHVzZSB0aGUgY3VycmVudCBwYXRoXG4gICAgICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICAgICAgbGluayA9IFwiI1wiICsgcGF0aC5yZXBsYWNlKC8odmlld3xjcmVhdGUpLywgXCJlZGl0XCIpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGluaztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMaW5rKCRzY29wZSwgcGFnZUlkOnN0cmluZywgJGxvY2F0aW9uKSB7XG4gICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgIHZhciBzdGFydCA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgIHZhciBsaW5rID0gJyc7XG4gICAgaWYgKHBhZ2VJZCkge1xuICAgICAgbGluayA9IHN0YXJ0ICsgXCIvY3JlYXRlL1wiICsgZW5jb2RlUGF0aChwYWdlSWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBsZXRzIHVzZSB0aGUgY3VycmVudCBwYXRoXG4gICAgICBsaW5rID0gXCIjXCIgKyBwYXRoLnJlcGxhY2UoLyh2aWV3fGVkaXR8Zm9ybVRhYmxlKS8sIFwiY3JlYXRlXCIpO1xuICAgIH1cbiAgICAvLyB3ZSBoYXZlIHRoZSBsaW5rIHNvIGxldHMgbm93IHJlbW92ZSB0aGUgbGFzdCBwYXRoXG4gICAgLy8gb3IgaWYgdGhlcmUgaXMgbm8gLyBpbiB0aGUgcGF0aCB0aGVuIHJlbW92ZSB0aGUgbGFzdCBzZWN0aW9uXG4gICAgdmFyIGlkeCA9IGxpbmsubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgIGlmIChpZHggPiAwICYmICEkc2NvcGUuY2hpbGRyZW4gJiYgIXBhdGguc3RhcnRzV2l0aChcIi93aWtpL2Zvcm1UYWJsZVwiKSkge1xuICAgICAgbGluayA9IGxpbmsuc3Vic3RyaW5nKDAsIGlkeCArIDEpO1xuICAgIH1cbiAgICByZXR1cm4gbGluaztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBlbmNvZGVQYXRoKHBhZ2VJZDpzdHJpbmcpIHtcbiAgICByZXR1cm4gcGFnZUlkLnNwbGl0KFwiL1wiKS5tYXAoZW5jb2RlVVJJQ29tcG9uZW50KS5qb2luKFwiL1wiKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBkZWNvZGVQYXRoKHBhZ2VJZDpzdHJpbmcpIHtcbiAgICByZXR1cm4gcGFnZUlkLnNwbGl0KFwiL1wiKS5tYXAoZGVjb2RlVVJJQ29tcG9uZW50KS5qb2luKFwiL1wiKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlRm9ybWF0KG5hbWU6c3RyaW5nLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5Pykge1xuICAgIHZhciBleHRlbnNpb24gPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgIGlmIChuYW1lKSB7XG4gICAgICBpZiAobmFtZSA9PT0gXCJKZW5raW5zZmlsZVwiKSB7XG4gICAgICAgIGV4dGVuc2lvbiA9IFwiZ3Jvb3Z5XCI7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBhbnN3ZXIgPSBudWxsO1xuICAgIGlmICghZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkge1xuICAgICAgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSA9IEhhd3Rpb0NvcmUuaW5qZWN0b3IuZ2V0KFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiKTtcbiAgICB9XG4gICAgYW5ndWxhci5mb3JFYWNoKGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnksIChhcnJheSwga2V5KSA9PiB7XG4gICAgICBpZiAoYXJyYXkuaW5kZXhPZihleHRlbnNpb24pID49IDApIHtcbiAgICAgICAgYW5zd2VyID0ga2V5O1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBhbnN3ZXI7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZmlsZSBuYW1lIG9mIHRoZSBnaXZlbiBwYXRoOyBzdHJpcHBpbmcgb2ZmIGFueSBkaXJlY3Rvcmllc1xuICAgKiBAbWV0aG9kIGZpbGVOYW1lXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlTmFtZShwYXRoOiBzdHJpbmcpIHtcbiAgICBpZiAocGF0aCkge1xuICAgICAgIHZhciBpZHggPSBwYXRoLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIHJldHVybiBwYXRoLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhdGg7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZm9sZGVyIG9mIHRoZSBnaXZlbiBwYXRoIChldmVyeXRoaW5nIGJ1dCB0aGUgbGFzdCBwYXRoIG5hbWUpXG4gICAqIEBtZXRob2QgZmlsZVBhcmVudFxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZmlsZVBhcmVudChwYXRoOiBzdHJpbmcpIHtcbiAgICBpZiAocGF0aCkge1xuICAgICAgIHZhciBpZHggPSBwYXRoLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIHJldHVybiBwYXRoLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBsZXRzIHJldHVybiB0aGUgcm9vdCBkaXJlY3RvcnlcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmaWxlIG5hbWUgZm9yIHRoZSBnaXZlbiBuYW1lOyB3ZSBoaWRlIHNvbWUgZXh0ZW5zaW9uc1xuICAgKiBAbWV0aG9kIGhpZGVGaW5lTmFtZUV4dGVuc2lvbnNcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGhpZGVGaWxlTmFtZUV4dGVuc2lvbnMobmFtZSkge1xuICAgIGlmIChuYW1lKSB7XG4gICAgICBhbmd1bGFyLmZvckVhY2goV2lraS5oaWRlRXh0ZW5zaW9ucywgKGV4dGVuc2lvbikgPT4ge1xuICAgICAgICBpZiAobmFtZS5lbmRzV2l0aChleHRlbnNpb24pKSB7XG4gICAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKDAsIG5hbWUubGVuZ3RoIC0gZXh0ZW5zaW9uLmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBVUkwgdG8gcGVyZm9ybSBhIEdFVCBvciBQT1NUIGZvciB0aGUgZ2l2ZW4gYnJhbmNoIG5hbWUgYW5kIHBhdGhcbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBnaXRSZXN0VVJMKCRzY29wZSwgcGF0aDogc3RyaW5nKSB7XG4gICAgdmFyIHVybCA9IGdpdFJlbGF0aXZlVVJMKCRzY29wZSwgcGF0aCk7XG4gICAgdXJsID0gQ29yZS51cmwoJy8nICsgdXJsKTtcblxuLypcbiAgICB2YXIgY29ubmVjdGlvbk5hbWUgPSBDb3JlLmdldENvbm5lY3Rpb25OYW1lUGFyYW1ldGVyKCk7XG4gICAgaWYgKGNvbm5lY3Rpb25OYW1lKSB7XG4gICAgICB2YXIgY29ubmVjdGlvbk9wdGlvbnMgPSBDb3JlLmdldENvbm5lY3RPcHRpb25zKGNvbm5lY3Rpb25OYW1lKTtcbiAgICAgIGlmIChjb25uZWN0aW9uT3B0aW9ucykge1xuICAgICAgICBjb25uZWN0aW9uT3B0aW9ucy5wYXRoID0gdXJsO1xuICAgICAgICB1cmwgPSA8c3RyaW5nPkNvcmUuY3JlYXRlU2VydmVyQ29ubmVjdGlvblVybChjb25uZWN0aW9uT3B0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuXG4qL1xuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICAgIGZ1bmN0aW9uIGdpdFVybFByZWZpeCgpIHtcbiAgICAgICAgdmFyIHByZWZpeCA9IFwiXCI7XG4gICAgICAgIHZhciBpbmplY3RvciA9IEhhd3Rpb0NvcmUuaW5qZWN0b3I7XG4gICAgICAgIGlmIChpbmplY3Rvcikge1xuICAgICAgICAgICAgcHJlZml4ID0gaW5qZWN0b3IuZ2V0KFwiV2lraUdpdFVybFByZWZpeFwiKSB8fCBcIlwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmVmaXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAqIFJldHVybnMgYSByZWxhdGl2ZSBVUkwgdG8gcGVyZm9ybSBhIEdFVCBvciBQT1NUIGZvciB0aGUgZ2l2ZW4gYnJhbmNoL3BhdGhcbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBnaXRSZWxhdGl2ZVVSTCgkc2NvcGUsIHBhdGg6IHN0cmluZykge1xuICAgICAgdmFyIGJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgdmFyIHByZWZpeCA9IGdpdFVybFByZWZpeCgpO1xuICAgIGJyYW5jaCA9IGJyYW5jaCB8fCBcIm1hc3RlclwiO1xuICAgIHBhdGggPSBwYXRoIHx8IFwiL1wiO1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4ocHJlZml4LCBcImdpdC9cIiArIGJyYW5jaCwgcGF0aCk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBUYWtlcyBhIHJvdyBjb250YWluaW5nIHRoZSBlbnRpdHkgb2JqZWN0OyBvciBjYW4gdGFrZSB0aGUgZW50aXR5IGRpcmVjdGx5LlxuICAgKlxuICAgKiBJdCB0aGVuIHVzZXMgdGhlIG5hbWUsIGRpcmVjdG9yeSBhbmQgeG1sTmFtZXNwYWNlcyBwcm9wZXJ0aWVzXG4gICAqXG4gICAqIEBtZXRob2QgZmlsZUljb25IdG1sXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7YW55fSByb3dcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKlxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVJY29uSHRtbChyb3cpIHtcbiAgICB2YXIgbmFtZSA9IHJvdy5uYW1lO1xuICAgIHZhciBwYXRoID0gcm93LnBhdGg7XG4gICAgdmFyIGJyYW5jaCA9IHJvdy5icmFuY2ggO1xuICAgIHZhciBkaXJlY3RvcnkgPSByb3cuZGlyZWN0b3J5O1xuICAgIHZhciB4bWxOYW1lc3BhY2VzID0gcm93LnhtbF9uYW1lc3BhY2VzIHx8IHJvdy54bWxOYW1lc3BhY2VzO1xuICAgIHZhciBpY29uVXJsID0gcm93Lmljb25Vcmw7XG4gICAgdmFyIGVudGl0eSA9IHJvdy5lbnRpdHk7XG4gICAgaWYgKGVudGl0eSkge1xuICAgICAgbmFtZSA9IG5hbWUgfHwgZW50aXR5Lm5hbWU7XG4gICAgICBwYXRoID0gcGF0aCB8fCBlbnRpdHkucGF0aDtcbiAgICAgIGJyYW5jaCA9IGJyYW5jaCB8fCBlbnRpdHkuYnJhbmNoO1xuICAgICAgZGlyZWN0b3J5ID0gZGlyZWN0b3J5IHx8IGVudGl0eS5kaXJlY3Rvcnk7XG4gICAgICB4bWxOYW1lc3BhY2VzID0geG1sTmFtZXNwYWNlcyB8fCBlbnRpdHkueG1sX25hbWVzcGFjZXMgfHwgZW50aXR5LnhtbE5hbWVzcGFjZXM7XG4gICAgICBpY29uVXJsID0gaWNvblVybCB8fCBlbnRpdHkuaWNvblVybDtcbiAgICB9XG4gICAgYnJhbmNoID0gYnJhbmNoIHx8IFwibWFzdGVyXCI7XG4gICAgdmFyIGNzcyA9IG51bGw7XG4gICAgdmFyIGljb246c3RyaW5nID0gbnVsbDtcbiAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAvLyBUT0RPIGNvdWxkIHdlIHVzZSBkaWZmZXJlbnQgaWNvbnMgZm9yIG1hcmtkb3duIHYgeG1sIHYgaHRtbFxuICAgIGlmICh4bWxOYW1lc3BhY2VzICYmIHhtbE5hbWVzcGFjZXMubGVuZ3RoKSB7XG4gICAgICBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmNhbWVsTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICBpY29uID0gXCJpbWcvaWNvbnMvY2FtZWwuc3ZnXCI7XG4gICAgICB9IGVsc2UgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5kb3plck5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgaWNvbiA9IFwiaW1nL2ljb25zL2RvemVyL2RvemVyLmdpZlwiO1xuICAgICAgfSBlbHNlIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuYWN0aXZlbXFOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgIGljb24gPSBcImltZy9pY29ucy9tZXNzYWdlYnJva2VyLnN2Z1wiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiZmlsZSBcIiArIG5hbWUgKyBcIiBoYXMgbmFtZXNwYWNlcyBcIiArIHhtbE5hbWVzcGFjZXMpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWljb25VcmwgJiYgbmFtZSkge1xuICAgICAgdmFyIGxvd2VyTmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIGlmIChsb3dlck5hbWUgPT0gXCJwb20ueG1sXCIpIHtcbiAgICAgICAgaWNvblVybCA9IFwiaW1nL21hdmVuLWljb24ucG5nXCI7XG4gICAgICB9IGVsc2UgaWYgKGxvd2VyTmFtZSA9PSBcImplbmtpbnNmaWxlXCIpIHtcbiAgICAgICAgaWNvblVybCA9IFwiaW1nL2plbmtpbnMtaWNvbi5zdmdcIjtcbiAgICAgIH0gZWxzZSBpZiAobG93ZXJOYW1lID09IFwiZmFicmljOC55bWxcIikge1xuICAgICAgICBpY29uVXJsID0gXCJpbWcvZmFicmljOF9pY29uLnN2Z1wiO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpY29uVXJsKSB7XG4gICAgICBjc3MgPSBudWxsO1xuICAgICAgaWNvbiA9IGljb25Vcmw7XG4vKlxuICAgICAgdmFyIHByZWZpeCA9IGdpdFVybFByZWZpeCgpO1xuICAgICAgaWNvbiA9IFVybEhlbHBlcnMuam9pbihwcmVmaXgsIFwiZ2l0XCIsIGljb25VcmwpO1xuKi9cbi8qXG4gICAgICB2YXIgY29ubmVjdGlvbk5hbWUgPSBDb3JlLmdldENvbm5lY3Rpb25OYW1lUGFyYW1ldGVyKCk7XG4gICAgICBpZiAoY29ubmVjdGlvbk5hbWUpIHtcbiAgICAgICAgdmFyIGNvbm5lY3Rpb25PcHRpb25zID0gQ29yZS5nZXRDb25uZWN0T3B0aW9ucyhjb25uZWN0aW9uTmFtZSk7XG4gICAgICAgIGlmIChjb25uZWN0aW9uT3B0aW9ucykge1xuICAgICAgICAgIGNvbm5lY3Rpb25PcHRpb25zLnBhdGggPSBDb3JlLnVybCgnLycgKyBpY29uKTtcbiAgICAgICAgICBpY29uID0gPHN0cmluZz5Db3JlLmNyZWF0ZVNlcnZlckNvbm5lY3Rpb25VcmwoY29ubmVjdGlvbk9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICB9XG4qL1xuICAgIH1cbiAgICBpZiAoIWljb24pIHtcbiAgICAgIGlmIChkaXJlY3RvcnkpIHtcbiAgICAgICAgc3dpdGNoIChleHRlbnNpb24pIHtcbiAgICAgICAgICBjYXNlICdwcm9maWxlJzpcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtYm9va1wiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIGxvZy5kZWJ1ZyhcIk5vIG1hdGNoIGZvciBleHRlbnNpb246IFwiLCBleHRlbnNpb24sIFwiIHVzaW5nIGEgZ2VuZXJpYyBmb2xkZXIgaWNvblwiKTtcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtZm9sZGVyIGZvbGRlci1pY29uXCI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN3aXRjaCAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgY2FzZSAnamF2YSc6XG4gICAgICAgICAgICBpY29uID0gXCJpbWcvamF2YS5zdmdcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3BuZyc6XG4gICAgICAgICAgY2FzZSAnc3ZnJzpcbiAgICAgICAgICBjYXNlICdqcGcnOlxuICAgICAgICAgIGNhc2UgJ2dpZic6XG4gICAgICAgICAgICBjc3MgPSBudWxsO1xuICAgICAgICAgICAgaWNvbiA9IFdpa2kuZ2l0UmVsYXRpdmVVUkwoYnJhbmNoLCBwYXRoKTtcbi8qXG4gICAgICAgICAgICB2YXIgY29ubmVjdGlvbk5hbWUgPSBDb3JlLmdldENvbm5lY3Rpb25OYW1lUGFyYW1ldGVyKCk7XG4gICAgICAgICAgICBpZiAoY29ubmVjdGlvbk5hbWUpIHtcbiAgICAgICAgICAgICAgdmFyIGNvbm5lY3Rpb25PcHRpb25zID0gQ29yZS5nZXRDb25uZWN0T3B0aW9ucyhjb25uZWN0aW9uTmFtZSk7XG4gICAgICAgICAgICAgIGlmIChjb25uZWN0aW9uT3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25PcHRpb25zLnBhdGggPSBDb3JlLnVybCgnLycgKyBpY29uKTtcbiAgICAgICAgICAgICAgICBpY29uID0gPHN0cmluZz5Db3JlLmNyZWF0ZVNlcnZlckNvbm5lY3Rpb25VcmwoY29ubmVjdGlvbk9wdGlvbnMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4qL1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnanNvbic6XG4gICAgICAgICAgY2FzZSAneG1sJzpcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtZmlsZS10ZXh0XCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdtZCc6XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZpbGUtdGV4dC1vXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gbG9nLmRlYnVnKFwiTm8gbWF0Y2ggZm9yIGV4dGVuc2lvbjogXCIsIGV4dGVuc2lvbiwgXCIgdXNpbmcgYSBnZW5lcmljIGZpbGUgaWNvblwiKTtcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtZmlsZS1vXCI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGljb24pIHtcbiAgICAgIHJldHVybiBcIjxpbWcgc3JjPSdcIiArIENvcmUudXJsKGljb24pICsgXCInPlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gXCI8aSBjbGFzcz0nXCIgKyBjc3MgKyBcIic+PC9pPlwiO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpY29uQ2xhc3Mocm93KSB7XG4gICAgdmFyIG5hbWUgPSByb3cuZ2V0UHJvcGVydHkoXCJuYW1lXCIpO1xuICAgIHZhciBleHRlbnNpb24gPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgIHZhciBkaXJlY3RvcnkgPSByb3cuZ2V0UHJvcGVydHkoXCJkaXJlY3RvcnlcIik7XG4gICAgaWYgKGRpcmVjdG9yeSkge1xuICAgICAgcmV0dXJuIFwiZmEgZmEtZm9sZGVyXCI7XG4gICAgfVxuICAgIGlmIChcInhtbFwiID09PSBleHRlbnNpb24pIHtcbiAgICAgICAgcmV0dXJuIFwiZmEgZmEtY29nXCI7XG4gICAgfSBlbHNlIGlmIChcIm1kXCIgPT09IGV4dGVuc2lvbikge1xuICAgICAgICByZXR1cm4gXCJmYSBmYS1maWxlLXRleHQtb1wiO1xuICAgIH1cbiAgICAvLyBUT0RPIGNvdWxkIHdlIHVzZSBkaWZmZXJlbnQgaWNvbnMgZm9yIG1hcmtkb3duIHYgeG1sIHYgaHRtbFxuICAgIHJldHVybiBcImZhIGZhLWZpbGUtb1wiO1xuICB9XG5cblxuICAvKipcbiAgICogRXh0cmFjdHMgdGhlIHBhZ2VJZCwgYnJhbmNoLCBvYmplY3RJZCBmcm9tIHRoZSByb3V0ZSBwYXJhbWV0ZXJzXG4gICAqIEBtZXRob2QgaW5pdFNjb3BlXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7Kn0gJHNjb3BlXG4gICAqIEBwYXJhbSB7YW55fSAkcm91dGVQYXJhbXNcbiAgICogQHBhcmFtIHtuZy5JTG9jYXRpb25TZXJ2aWNlfSAkbG9jYXRpb25cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBpbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbikge1xuICAgICRzY29wZS5wYWdlSWQgPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG5cbiAgICAvLyBsZXRzIGxldCB0aGVzZSB0byBiZSBpbmhlcml0ZWQgaWYgd2UgaW5jbHVkZSBhIHRlbXBsYXRlIG9uIGFub3RoZXIgcGFnZVxuICAgICRzY29wZS5wcm9qZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJwcm9qZWN0SWRcIl0gfHwgJHNjb3BlLmlkO1xuICAgICRzY29wZS5uYW1lc3BhY2UgPSAkcm91dGVQYXJhbXNbXCJuYW1lc3BhY2VcIl0gfHwgJHNjb3BlLm5hbWVzcGFjZTtcblxuICAgICRzY29wZS5vd25lciA9ICRyb3V0ZVBhcmFtc1tcIm93bmVyXCJdO1xuICAgICRzY29wZS5yZXBvSWQgPSAkcm91dGVQYXJhbXNbXCJyZXBvSWRcIl07XG4gICAgJHNjb3BlLmJyYW5jaCA9ICRyb3V0ZVBhcmFtc1tcImJyYW5jaFwiXSB8fCAkbG9jYXRpb24uc2VhcmNoKClbXCJicmFuY2hcIl07XG4gICAgJHNjb3BlLm9iamVjdElkID0gJHJvdXRlUGFyYW1zW1wib2JqZWN0SWRcIl0gfHwgJHJvdXRlUGFyYW1zW1wiZGlmZk9iamVjdElkMVwiXTtcbiAgICAkc2NvcGUuc3RhcnRMaW5rID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgJHNjb3BlLiR2aWV3TGluayA9IHZpZXdMaW5rKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uKTtcbiAgICAkc2NvcGUuaGlzdG9yeUxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArIFwiL2hpc3RvcnkvXCIgKyAoJHNjb3BlLnBhZ2VJZCB8fCBcIlwiKTtcbiAgICAkc2NvcGUud2lraVJlcG9zaXRvcnkgPSBuZXcgR2l0V2lraVJlcG9zaXRvcnkoJHNjb3BlKTtcblxuICAgICRzY29wZS4kd29ya3NwYWNlTGluayA9IERldmVsb3Blci53b3Jrc3BhY2VMaW5rKCk7XG4gICAgJHNjb3BlLiRwcm9qZWN0TGluayA9IERldmVsb3Blci5wcm9qZWN0TGluaygkc2NvcGUucHJvamVjdElkKTtcbiAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0QnJlYWRjcnVtYnMoJHNjb3BlLnByb2plY3RJZCwgY3JlYXRlU291cmNlQnJlYWRjcnVtYnMoJHNjb3BlKSk7XG4gICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U3ViTmF2QmFycygkc2NvcGUucHJvamVjdElkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2FkcyB0aGUgYnJhbmNoZXMgZm9yIHRoaXMgd2lraSByZXBvc2l0b3J5IGFuZCBzdG9yZXMgdGhlbSBpbiB0aGUgYnJhbmNoZXMgcHJvcGVydHkgaW5cbiAgICogdGhlICRzY29wZSBhbmQgZW5zdXJlcyAkc2NvcGUuYnJhbmNoIGlzIHNldCB0byBhIHZhbGlkIHZhbHVlXG4gICAqXG4gICAqIEBwYXJhbSB3aWtpUmVwb3NpdG9yeVxuICAgKiBAcGFyYW0gJHNjb3BlXG4gICAqIEBwYXJhbSBpc0ZtYyB3aGV0aGVyIHdlIHJ1biBhcyBmYWJyaWM4IG9yIGFzIGhhd3Rpb1xuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyA9IGZhbHNlKSB7XG4gICAgd2lraVJlcG9zaXRvcnkuYnJhbmNoZXMoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAvLyBsZXRzIHNvcnQgYnkgdmVyc2lvbiBudW1iZXJcbiAgICAgICRzY29wZS5icmFuY2hlcyA9IHJlc3BvbnNlLnNvcnRCeSgodikgPT4gQ29yZS52ZXJzaW9uVG9Tb3J0YWJsZVN0cmluZyh2KSwgdHJ1ZSk7XG5cbiAgICAgIC8vIGRlZmF1bHQgdGhlIGJyYW5jaCBuYW1lIGlmIHdlIGhhdmUgJ21hc3RlcidcbiAgICAgIGlmICghJHNjb3BlLmJyYW5jaCAmJiAkc2NvcGUuYnJhbmNoZXMuZmluZCgoYnJhbmNoKSA9PiB7XG4gICAgICAgIHJldHVybiBicmFuY2ggPT09IFwibWFzdGVyXCI7XG4gICAgICB9KSkge1xuICAgICAgICAkc2NvcGUuYnJhbmNoID0gXCJtYXN0ZXJcIjtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdHMgdGhlIHBhZ2VJZCBmcm9tIHRoZSByb3V0ZSBwYXJhbWV0ZXJzXG4gICAqIEBtZXRob2QgcGFnZUlkXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7YW55fSAkcm91dGVQYXJhbXNcbiAgICogQHBhcmFtIEBuZy5JTG9jYXRpb25TZXJ2aWNlIEBsb2NhdGlvblxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gcGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKSB7XG4gICAgdmFyIHBhZ2VJZCA9ICRyb3V0ZVBhcmFtc1sncGFnZSddO1xuICAgIGlmICghcGFnZUlkKSB7XG4gICAgICAvLyBMZXRzIGRlYWwgd2l0aCB0aGUgaGFjayBvZiBBbmd1bGFySlMgbm90IHN1cHBvcnRpbmcgLyBpbiBhIHBhdGggdmFyaWFibGVcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMTAwOyBpKyspIHtcbiAgICAgICAgdmFyIHZhbHVlID0gJHJvdXRlUGFyYW1zWydwYXRoJyArIGldO1xuICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpKSB7XG4gICAgICAgICAgaWYgKCFwYWdlSWQpIHtcbiAgICAgICAgICAgIHBhZ2VJZCA9IHZhbHVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYWdlSWQgKz0gXCIvXCIgKyB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBicmVhaztcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYWdlSWQgfHwgXCIvXCI7XG4gICAgfVxuXG4gICAgLy8gaWYgbm8gJHJvdXRlUGFyYW1zIHZhcmlhYmxlcyBsZXRzIGZpZ3VyZSBpdCBvdXQgZnJvbSB0aGUgJGxvY2F0aW9uXG4gICAgaWYgKCFwYWdlSWQpIHtcbiAgICAgIHBhZ2VJZCA9IHBhZ2VJZEZyb21VUkkoJGxvY2F0aW9uLnBhdGgoKSk7XG4gICAgfVxuICAgIHJldHVybiBwYWdlSWQ7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcGFnZUlkRnJvbVVSSSh1cmw6c3RyaW5nKSB7XG4gICAgdmFyIHdpa2lQcmVmaXggPSBcIi93aWtpL1wiO1xuICAgIGlmICh1cmwgJiYgdXJsLnN0YXJ0c1dpdGgod2lraVByZWZpeCkpIHtcbiAgICAgIHZhciBpZHggPSB1cmwuaW5kZXhPZihcIi9cIiwgd2lraVByZWZpeC5sZW5ndGggKyAxKTtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIHJldHVybiB1cmwuc3Vic3RyaW5nKGlkeCArIDEsIHVybC5sZW5ndGgpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsXG5cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlRXh0ZW5zaW9uKG5hbWUpIHtcbiAgICBpZiAobmFtZS5pbmRleE9mKCcjJykgPiAwKVxuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKDAsIG5hbWUuaW5kZXhPZignIycpKTtcbiAgICByZXR1cm4gQ29yZS5maWxlRXh0ZW5zaW9uKG5hbWUsIFwibWFya2Rvd25cIik7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBvbkNvbXBsZXRlKHN0YXR1cykge1xuICAgIGNvbnNvbGUubG9nKFwiQ29tcGxldGVkIG9wZXJhdGlvbiB3aXRoIHN0YXR1czogXCIgKyBKU09OLnN0cmluZ2lmeShzdGF0dXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZXMgdGhlIGdpdmVuIEpTT04gdGV4dCByZXBvcnRpbmcgdG8gdGhlIHVzZXIgaWYgdGhlcmUgaXMgYSBwYXJzZSBlcnJvclxuICAgKiBAbWV0aG9kIHBhcnNlSnNvblxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gdGV4dFxuICAgKiBAcmV0dXJuIHthbnl9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gcGFyc2VKc29uKHRleHQ6c3RyaW5nKSB7XG4gICAgaWYgKHRleHQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKHRleHQpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcImVycm9yXCIsIFwiRmFpbGVkIHRvIHBhcnNlIEpTT046IFwiICsgZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkanVzdHMgYSByZWxhdGl2ZSBvciBhYnNvbHV0ZSBsaW5rIGZyb20gYSB3aWtpIG9yIGZpbGUgc3lzdGVtIHRvIG9uZSB1c2luZyB0aGUgaGFzaCBiYW5nIHN5bnRheFxuICAgKiBAbWV0aG9kIGFkanVzdEhyZWZcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHsqfSAkc2NvcGVcbiAgICogQHBhcmFtIHtuZy5JTG9jYXRpb25TZXJ2aWNlfSAkbG9jYXRpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IGhyZWZcbiAgICogQHBhcmFtIHtTdHJpbmd9IGZpbGVFeHRlbnNpb25cbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGFkanVzdEhyZWYoJHNjb3BlLCAkbG9jYXRpb24sIGhyZWYsIGZpbGVFeHRlbnNpb24pIHtcbiAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZUV4dGVuc2lvbiA/IFwiLlwiICsgZmlsZUV4dGVuc2lvbiA6IFwiXCI7XG5cbiAgICAvLyBpZiB0aGUgbGFzdCBwYXJ0IG9mIHRoZSBwYXRoIGhhcyBhIGRvdCBpbiBpdCBsZXRzXG4gICAgLy8gZXhjbHVkZSBpdCBhcyB3ZSBhcmUgcmVsYXRpdmUgdG8gYSBtYXJrZG93biBvciBodG1sIGZpbGUgaW4gYSBmb2xkZXJcbiAgICAvLyBzdWNoIGFzIHdoZW4gdmlld2luZyByZWFkbWUubWQgb3IgaW5kZXgubWRcbiAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgdmFyIGZvbGRlclBhdGggPSBwYXRoO1xuICAgIHZhciBpZHggPSBwYXRoLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgdmFyIGxhc3ROYW1lID0gcGF0aC5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICBpZiAobGFzdE5hbWUuaW5kZXhPZihcIi5cIikgPj0gMCkge1xuICAgICAgICBmb2xkZXJQYXRoID0gcGF0aC5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZWFsIHdpdGggcmVsYXRpdmUgVVJMcyBmaXJzdC4uLlxuICAgIGlmIChocmVmLnN0YXJ0c1dpdGgoJy4uLycpKSB7XG4gICAgICB2YXIgcGFydHMgPSBocmVmLnNwbGl0KCcvJyk7XG4gICAgICB2YXIgcGF0aFBhcnRzID0gZm9sZGVyUGF0aC5zcGxpdCgnLycpO1xuICAgICAgdmFyIHBhcmVudHMgPSBwYXJ0cy5maWx0ZXIoKHBhcnQpID0+IHtcbiAgICAgICAgcmV0dXJuIHBhcnQgPT09IFwiLi5cIjtcbiAgICAgIH0pO1xuICAgICAgcGFydHMgPSBwYXJ0cy5sYXN0KHBhcnRzLmxlbmd0aCAtIHBhcmVudHMubGVuZ3RoKTtcbiAgICAgIHBhdGhQYXJ0cyA9IHBhdGhQYXJ0cy5maXJzdChwYXRoUGFydHMubGVuZ3RoIC0gcGFyZW50cy5sZW5ndGgpO1xuXG4gICAgICByZXR1cm4gJyMnICsgcGF0aFBhcnRzLmpvaW4oJy8nKSArICcvJyArIHBhcnRzLmpvaW4oJy8nKSArIGV4dGVuc2lvbiArICRsb2NhdGlvbi5oYXNoKCk7XG4gICAgfVxuXG4gICAgLy8gVHVybiBhbiBhYnNvbHV0ZSBsaW5rIGludG8gYSB3aWtpIGxpbmsuLi5cbiAgICBpZiAoaHJlZi5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgIHJldHVybiBXaWtpLmJyYW5jaExpbmsoJHNjb3BlLCBocmVmICsgZXh0ZW5zaW9uLCAkbG9jYXRpb24pICsgZXh0ZW5zaW9uO1xuICAgIH1cblxuICAgIGlmICghV2lraS5leGNsdWRlQWRqdXN0bWVudFByZWZpeGVzLmFueSgoZXhjbHVkZSkgPT4ge1xuICAgICAgcmV0dXJuIGhyZWYuc3RhcnRzV2l0aChleGNsdWRlKTtcbiAgICB9KSkge1xuICAgICAgcmV0dXJuICcjJyArIGZvbGRlclBhdGggKyBcIi9cIiArIGhyZWYgKyBleHRlbnNpb24gKyAkbG9jYXRpb24uaGFzaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqIEBtYWluIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9ICd3aWtpJztcbiAgZXhwb3J0IHZhciB0ZW1wbGF0ZVBhdGggPSAncGx1Z2lucy93aWtpL2h0bWwvJztcbiAgZXhwb3J0IHZhciB0YWI6YW55ID0gbnVsbDtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbJ2hhd3Rpby1jb3JlJywgJ2hhd3Rpby11aScsICd0cmVlQ29udHJvbCcsICd1aS5jb2RlbWlycm9yJ10pO1xuICBleHBvcnQgdmFyIGNvbnRyb2xsZXIgPSBQbHVnaW5IZWxwZXJzLmNyZWF0ZUNvbnRyb2xsZXJGdW5jdGlvbihfbW9kdWxlLCAnV2lraScpO1xuICBleHBvcnQgdmFyIHJvdXRlID0gUGx1Z2luSGVscGVycy5jcmVhdGVSb3V0aW5nRnVuY3Rpb24odGVtcGxhdGVQYXRoKTtcblxuICBfbW9kdWxlLmNvbmZpZyhbXCIkcm91dGVQcm92aWRlclwiLCAoJHJvdXRlUHJvdmlkZXIpID0+IHtcblxuICAgIC8vIGFsbG93IG9wdGlvbmFsIGJyYW5jaCBwYXRocy4uLlxuICAgIGFuZ3VsYXIuZm9yRWFjaChbXCJcIiwgXCIvYnJhbmNoLzpicmFuY2hcIl0sIChwYXRoKSA9PiB7XG4gICAgICAvL3ZhciBzdGFydENvbnRleHQgPSAnL3dpa2knO1xuICAgICAgdmFyIHN0YXJ0Q29udGV4dCA9ICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL3Byb2plY3RzLzpwcm9qZWN0SWQvd2lraSc7XG4gICAgICAkcm91dGVQcm92aWRlci5cbiAgICAgICAgICAgICAgd2hlbihVcmxIZWxwZXJzLmpvaW4oc3RhcnRDb250ZXh0LCBwYXRoLCAndmlldycpLCByb3V0ZSgndmlld1BhZ2UuaHRtbCcsIGZhbHNlKSkuXG4gICAgICAgICAgICAgIHdoZW4oVXJsSGVscGVycy5qb2luKHN0YXJ0Q29udGV4dCwgcGF0aCwgJ2NyZWF0ZS86cGFnZSonKSwgcm91dGUoJ2NyZWF0ZS5odG1sJywgZmFsc2UpKS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy92aWV3LzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL3ZpZXdQYWdlLmh0bWwnLCByZWxvYWRPblNlYXJjaDogZmFsc2V9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9ib29rLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL3ZpZXdCb29rLmh0bWwnLCByZWxvYWRPblNlYXJjaDogZmFsc2V9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9lZGl0LzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2VkaXRQYWdlLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvdmVyc2lvbi86cGFnZSpcXC86b2JqZWN0SWQnLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC92aWV3UGFnZS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2hpc3RvcnkvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvaGlzdG9yeS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NvbW1pdC86cGFnZSpcXC86b2JqZWN0SWQnLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb21taXQuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9kaWZmLzpwYWdlKlxcLzpkaWZmT2JqZWN0SWQxLzpkaWZmT2JqZWN0SWQyJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld1BhZ2UuaHRtbCcsIHJlbG9hZE9uU2VhcmNoOiBmYWxzZX0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2Zvcm1UYWJsZS86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9mb3JtVGFibGUuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9kb3plci9tYXBwaW5ncy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9kb3plck1hcHBpbmdzLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY29uZmlndXJhdGlvbnMvOnBhZ2UqJywgeyB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbmZpZ3VyYXRpb25zLmh0bWwnIH0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NvbmZpZ3VyYXRpb24vOnBpZC86cGFnZSonLCB7IHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29uZmlndXJhdGlvbi5odG1sJyB9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9uZXdDb25maWd1cmF0aW9uLzpmYWN0b3J5UGlkLzpwYWdlKicsIHsgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb25maWd1cmF0aW9uLmh0bWwnIH0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NhbWVsL2RpYWdyYW0vOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY2FtZWxEaWFncmFtLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY2FtZWwvY2FudmFzLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NhbWVsQ2FudmFzLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY2FtZWwvcHJvcGVydGllcy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jYW1lbFByb3BlcnRpZXMuaHRtbCd9KTtcbiAgICB9KTtcbn1dKTtcblxuICAvKipcbiAgICogQnJhbmNoIE1lbnUgc2VydmljZVxuICAgKi9cbiAgZXhwb3J0IGludGVyZmFjZSBCcmFuY2hNZW51IHtcbiAgICBhZGRFeHRlbnNpb246IChpdGVtOlVJLk1lbnVJdGVtKSA9PiB2b2lkO1xuICAgIGFwcGx5TWVudUV4dGVuc2lvbnM6IChtZW51OlVJLk1lbnVJdGVtW10pID0+IHZvaWQ7XG4gIH1cblxuICBfbW9kdWxlLmZhY3RvcnkoJ3dpa2lCcmFuY2hNZW51JywgKCkgPT4ge1xuICAgIHZhciBzZWxmID0ge1xuICAgICAgaXRlbXM6IFtdLFxuICAgICAgYWRkRXh0ZW5zaW9uOiAoaXRlbTpVSS5NZW51SXRlbSkgPT4ge1xuICAgICAgICBzZWxmLml0ZW1zLnB1c2goaXRlbSk7XG4gICAgICB9LFxuICAgICAgYXBwbHlNZW51RXh0ZW5zaW9uczogKG1lbnU6VUkuTWVudUl0ZW1bXSkgPT4ge1xuICAgICAgICBpZiAoc2VsZi5pdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGV4dGVuZGVkTWVudTpVSS5NZW51SXRlbVtdID0gW3tcbiAgICAgICAgICBoZWFkaW5nOiBcIkFjdGlvbnNcIlxuICAgICAgICB9XTtcbiAgICAgICAgc2VsZi5pdGVtcy5mb3JFYWNoKChpdGVtOlVJLk1lbnVJdGVtKSA9PiB7XG4gICAgICAgICAgaWYgKGl0ZW0udmFsaWQoKSkge1xuICAgICAgICAgICAgZXh0ZW5kZWRNZW51LnB1c2goaXRlbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGV4dGVuZGVkTWVudS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgbWVudS5hZGQoZXh0ZW5kZWRNZW51KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIHNlbGY7XG4gIH0pO1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnV2lraUdpdFVybFByZWZpeCcsICgpID0+IHtcbiAgICAgIHJldHVybiBcIlwiO1xuICB9KTtcblxuICBfbW9kdWxlLmZhY3RvcnkoJ2ZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnknLCAoKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIFwiaW1hZ2VcIjogW1wic3ZnXCIsIFwicG5nXCIsIFwiaWNvXCIsIFwiYm1wXCIsIFwianBnXCIsIFwiZ2lmXCJdLFxuICAgICAgXCJtYXJrZG93blwiOiBbXCJtZFwiLCBcIm1hcmtkb3duXCIsIFwibWRvd25cIiwgXCJta2RuXCIsIFwibWtkXCJdLFxuICAgICAgXCJodG1sbWl4ZWRcIjogW1wiaHRtbFwiLCBcInhodG1sXCIsIFwiaHRtXCJdLFxuICAgICAgXCJ0ZXh0L3gtamF2YVwiOiBbXCJqYXZhXCJdLFxuICAgICAgXCJ0ZXh0L3gtZ3Jvb3Z5XCI6IFtcImdyb292eVwiXSxcbiAgICAgIFwidGV4dC94LXNjYWxhXCI6IFtcInNjYWxhXCJdLFxuICAgICAgXCJqYXZhc2NyaXB0XCI6IFtcImpzXCIsIFwianNvblwiLCBcImphdmFzY3JpcHRcIiwgXCJqc2NyaXB0XCIsIFwiZWNtYXNjcmlwdFwiLCBcImZvcm1cIl0sXG4gICAgICBcInhtbFwiOiBbXCJ4bWxcIiwgXCJ4c2RcIiwgXCJ3c2RsXCIsIFwiYXRvbVwiXSxcbiAgICAgIFwidGV4dC94LXlhbWxcIjogW1wieWFtbFwiLCBcInltbFwiXSxcbiAgICAgIFwicHJvcGVydGllc1wiOiBbXCJwcm9wZXJ0aWVzXCJdXG4gICAgfTtcbiAgfSk7XG5cbiAgX21vZHVsZS5maWx0ZXIoJ2ZpbGVJY29uQ2xhc3MnLCAoKSA9PiBpY29uQ2xhc3MpO1xuXG4gIF9tb2R1bGUucnVuKFtcIiRsb2NhdGlvblwiLFwidmlld1JlZ2lzdHJ5XCIsICBcImxvY2FsU3RvcmFnZVwiLCBcImxheW91dEZ1bGxcIiwgXCJoZWxwUmVnaXN0cnlcIiwgXCJwcmVmZXJlbmNlc1JlZ2lzdHJ5XCIsIFwid2lraVJlcG9zaXRvcnlcIixcbiAgICBcIiRyb290U2NvcGVcIiwgKCRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLFxuICAgICAgICB2aWV3UmVnaXN0cnksXG4gICAgICAgIGxvY2FsU3RvcmFnZSxcbiAgICAgICAgbGF5b3V0RnVsbCxcbiAgICAgICAgaGVscFJlZ2lzdHJ5LFxuICAgICAgICBwcmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgICB3aWtpUmVwb3NpdG9yeSxcbiAgICAgICAgJHJvb3RTY29wZSkgPT4ge1xuXG4gICAgdmlld1JlZ2lzdHJ5Wyd3aWtpJ10gPSB0ZW1wbGF0ZVBhdGggKyAnbGF5b3V0V2lraS5odG1sJztcbi8qXG4gICAgaGVscFJlZ2lzdHJ5LmFkZFVzZXJEb2MoJ3dpa2knLCAncGx1Z2lucy93aWtpL2RvYy9oZWxwLm1kJywgKCkgPT4ge1xuICAgICAgcmV0dXJuIFdpa2kuaXNXaWtpRW5hYmxlZCh3b3Jrc3BhY2UsIGpvbG9raWEsIGxvY2FsU3RvcmFnZSk7XG4gICAgfSk7XG4qL1xuXG4vKlxuICAgIHByZWZlcmVuY2VzUmVnaXN0cnkuYWRkVGFiKFwiR2l0XCIsICdwbHVnaW5zL3dpa2kvaHRtbC9naXRQcmVmZXJlbmNlcy5odG1sJyk7XG4qL1xuXG4vKlxuICAgIHRhYiA9IHtcbiAgICAgIGlkOiBcIndpa2lcIixcbiAgICAgIGNvbnRlbnQ6IFwiV2lraVwiLFxuICAgICAgdGl0bGU6IFwiVmlldyBhbmQgZWRpdCB3aWtpIHBhZ2VzXCIsXG4gICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gV2lraS5pc1dpa2lFbmFibGVkKHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKSxcbiAgICAgIGhyZWY6ICgpID0+IFwiIy93aWtpL3ZpZXdcIixcbiAgICAgIGlzQWN0aXZlOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gd29ya3NwYWNlLmlzTGlua0FjdGl2ZShcIi93aWtpXCIpICYmICF3b3Jrc3BhY2UubGlua0NvbnRhaW5zKFwiZmFicmljXCIsIFwicHJvZmlsZXNcIikgJiYgIXdvcmtzcGFjZS5saW5rQ29udGFpbnMoXCJlZGl0RmVhdHVyZXNcIilcbiAgICB9O1xuICAgIHdvcmtzcGFjZS50b3BMZXZlbFRhYnMucHVzaCh0YWIpO1xuKi9cblxuICAgIC8vIGFkZCBlbXB0eSByZWdleHMgdG8gdGVtcGxhdGVzIHRoYXQgZG9uJ3QgZGVmaW5lXG4gICAgLy8gdGhlbSBzbyBuZy1wYXR0ZXJuIGRvZXNuJ3QgYmFyZlxuICAgIFdpa2kuZG9jdW1lbnRUZW1wbGF0ZXMuZm9yRWFjaCgodGVtcGxhdGU6IGFueSkgPT4ge1xuICAgICAgaWYgKCF0ZW1wbGF0ZVsncmVnZXgnXSkge1xuICAgICAgICB0ZW1wbGF0ZS5yZWdleCA9IC8oPzopLztcbiAgICAgIH1cbiAgICB9KTtcblxuICB9XSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3dpa2lQbHVnaW4udHNcIi8+XG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IHZhciBDYW1lbENvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkNhbWVsQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkcm9vdFNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGNvbXBpbGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcImxvY2FsU3RvcmFnZVwiLCAoJHNjb3BlLCAkcm9vdFNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgJGNvbXBpbGUsICR0ZW1wbGF0ZUNhY2hlLCBsb2NhbFN0b3JhZ2U6V2luZG93TG9jYWxTdG9yYWdlKSA9PiB7XG5cbiAgICAvLyBUT0RPIFJFTU9WRVxuICAgIHZhciBqb2xva2lhID0gbnVsbDtcbiAgICB2YXIgam9sb2tpYVN0YXR1cyA9IG51bGw7XG4gICAgdmFyIGpteFRyZWVMYXp5TG9hZFJlZ2lzdHJ5ID0gbnVsbDtcbiAgICB2YXIgdXNlckRldGFpbHMgPSBudWxsO1xuICAgIHZhciBIYXd0aW9OYXYgPSBudWxsO1xuICAgIHZhciB3b3Jrc3BhY2UgPSBuZXcgV29ya3NwYWNlKGpvbG9raWEsIGpvbG9raWFTdGF0dXMsIGpteFRyZWVMYXp5TG9hZFJlZ2lzdHJ5LCAkbG9jYXRpb24sICRjb21waWxlLCAkdGVtcGxhdGVDYWNoZSwgbG9jYWxTdG9yYWdlLCAkcm9vdFNjb3BlLCB1c2VyRGV0YWlscywgSGF3dGlvTmF2KTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIENhbWVsLmluaXRFbmRwb2ludENob29zZXJTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgbG9jYWxTdG9yYWdlLCB3b3Jrc3BhY2UsIGpvbG9raWEpO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5zY2hlbWEgPSBDYW1lbC5nZXRDb25maWd1cmVkQ2FtZWxNb2RlbCgpO1xuICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLnN3aXRjaFRvQ2FudmFzVmlldyA9IG5ldyBVSS5EaWFsb2coKTtcblxuICAgICRzY29wZS5maW5kUHJvZmlsZUNhbWVsQ29udGV4dCA9IHRydWU7XG4gICAgJHNjb3BlLmNhbWVsU2VsZWN0aW9uRGV0YWlscyA9IHtcbiAgICAgIHNlbGVjdGVkQ2FtZWxDb250ZXh0SWQ6IG51bGwsXG4gICAgICBzZWxlY3RlZFJvdXRlSWQ6IG51bGxcbiAgICB9O1xuXG4gICAgJHNjb3BlLmlzVmFsaWQgPSAobmF2KSA9PiB7XG4gICAgICByZXR1cm4gbmF2ICYmIG5hdi5pc1ZhbGlkKHdvcmtzcGFjZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jYW1lbFN1YkxldmVsVGFicyA9IFtcbiAgICAgIC8qe1xuICAgICAgICBjb250ZW50OiAnPGkgY2xhc3M9XCJpY29uLXBpY3R1cmVcIj48L2k+IENhbnZhcycsXG4gICAgICAgIHRpdGxlOiBcIkVkaXQgdGhlIGRpYWdyYW0gaW4gYSBkcmFnZ3kgZHJvcHB5IHdheVwiLFxuICAgICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gdHJ1ZSxcbiAgICAgICAgaHJlZjogKCkgPT4gV2lraS5zdGFydExpbmsoJHNjb3BlLmJyYW5jaCkgKyBcIi9jYW1lbC9jYW52YXMvXCIgKyAkc2NvcGUucGFnZUlkXG4gICAgICB9LFxuICAgICAgKi97XG4gICAgICAgIGNvbnRlbnQ6ICc8aSBjbGFzcz1cIiBpY29uLXNpdGVtYXBcIj48L2k+IFRyZWUnLFxuICAgICAgICB0aXRsZTogXCJWaWV3IHRoZSByb3V0ZXMgYXMgYSB0cmVlXCIsXG4gICAgICAgIGlzVmFsaWQ6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiB0cnVlLFxuICAgICAgICBocmVmOiAoKSA9PiBXaWtpLnN0YXJ0TGluaygkc2NvcGUuYnJhbmNoKSArIFwiL2NhbWVsL3Byb3BlcnRpZXMvXCIgKyAkc2NvcGUucGFnZUlkXG4gICAgICB9LFxuICAgICAgLypcbiAgICAgICB7XG4gICAgICAgY29udGVudDogJzxpIGNsYXNzPVwiaWNvbi1zaXRlbWFwXCI+PC9pPiBEaWFncmFtJyxcbiAgICAgICB0aXRsZTogXCJWaWV3IGEgZGlhZ3JhbSBvZiB0aGUgcm91dGVcIixcbiAgICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gdHJ1ZSxcbiAgICAgICBocmVmOiAoKSA9PiBXaWtpLnN0YXJ0TGluaygkc2NvcGUuYnJhbmNoKSArIFwiL2NhbWVsL2RpYWdyYW0vXCIgKyAkc2NvcGUucGFnZUlkXG4gICAgICAgfSxcbiAgICAgICAqL1xuICAgIF07XG5cbiAgICB2YXIgcm91dGVNb2RlbCA9IF9hcGFjaGVDYW1lbE1vZGVsLmRlZmluaXRpb25zLnJvdXRlO1xuICAgIHJvdXRlTW9kZWxbXCJfaWRcIl0gPSBcInJvdXRlXCI7XG5cbiAgICAkc2NvcGUuYWRkRGlhbG9nID0gbmV3IFVJLkRpYWxvZygpO1xuXG4gICAgLy8gVE9ETyBkb2Vzbid0IHNlZW0gdGhhdCBhbmd1bGFyLXVpIHVzZXMgdGhlc2U/XG4gICAgJHNjb3BlLmFkZERpYWxvZy5vcHRpb25zW1wiZGlhbG9nQ2xhc3NcIl0gPSBcIm1vZGFsLWxhcmdlXCI7XG4gICAgJHNjb3BlLmFkZERpYWxvZy5vcHRpb25zW1wiY3NzQ2xhc3NcIl0gPSBcIm1vZGFsLWxhcmdlXCI7XG5cbiAgICAkc2NvcGUucGFsZXR0ZUl0ZW1TZWFyY2ggPSBcIlwiO1xuICAgICRzY29wZS5wYWxldHRlVHJlZSA9IG5ldyBGb2xkZXIoXCJQYWxldHRlXCIpO1xuICAgICRzY29wZS5wYWxldHRlQWN0aXZhdGlvbnMgPSBbXCJSb3V0aW5nX2FnZ3JlZ2F0ZVwiXTtcblxuICAgIC8vIGxvYWQgJHNjb3BlLnBhbGV0dGVUcmVlXG4gICAgYW5ndWxhci5mb3JFYWNoKF9hcGFjaGVDYW1lbE1vZGVsLmRlZmluaXRpb25zLCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgaWYgKHZhbHVlLmdyb3VwKSB7XG4gICAgICAgIHZhciBncm91cCA9IChrZXkgPT09IFwicm91dGVcIikgPyAkc2NvcGUucGFsZXR0ZVRyZWUgOiAkc2NvcGUucGFsZXR0ZVRyZWUuZ2V0T3JFbHNlKHZhbHVlLmdyb3VwKTtcbiAgICAgICAgaWYgKCFncm91cC5rZXkpIHtcbiAgICAgICAgICBncm91cC5rZXkgPSB2YWx1ZS5ncm91cDtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZVtcIl9pZFwiXSA9IGtleTtcbiAgICAgICAgdmFyIHRpdGxlID0gdmFsdWVbXCJ0aXRsZVwiXSB8fCBrZXk7XG4gICAgICAgIHZhciBub2RlID0gbmV3IEZvbGRlcih0aXRsZSk7XG4gICAgICAgIG5vZGUua2V5ID0gZ3JvdXAua2V5ICsgXCJfXCIgKyBrZXk7XG4gICAgICAgIG5vZGVbXCJub2RlTW9kZWxcIl0gPSB2YWx1ZTtcbiAgICAgICAgdmFyIGltYWdlVXJsID0gQ2FtZWwuZ2V0Um91dGVOb2RlSWNvbih2YWx1ZSk7XG4gICAgICAgIG5vZGUuaWNvbiA9IGltYWdlVXJsO1xuICAgICAgICAvLyBjb21waWxlciB3YXMgY29tcGxhaW5pbmcgYWJvdXQgJ2xhYmVsJyBoYWQgbm8gaWRlYSB3aGVyZSBpdCdzIGNvbWluZyBmcm9tXG4gICAgICAgIC8vIHZhciB0b29sdGlwID0gdmFsdWVbXCJ0b29sdGlwXCJdIHx8IHZhbHVlW1wiZGVzY3JpcHRpb25cIl0gfHwgbGFiZWw7XG4gICAgICAgIHZhciB0b29sdGlwID0gdmFsdWVbXCJ0b29sdGlwXCJdIHx8IHZhbHVlW1wiZGVzY3JpcHRpb25cIl0gfHwgJyc7XG4gICAgICAgIG5vZGUudG9vbHRpcCA9IHRvb2x0aXA7XG5cbiAgICAgICAgZ3JvdXAuY2hpbGRyZW4ucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGxvYWQgJHNjb3BlLmNvbXBvbmVudFRyZWVcbiAgICAkc2NvcGUuY29tcG9uZW50VHJlZSA9IG5ldyBGb2xkZXIoXCJFbmRwb2ludHNcIik7XG5cbiAgICAkc2NvcGUuJHdhdGNoKFwiY29tcG9uZW50TmFtZXNcIiwgKCkgPT4ge1xuICAgICAgdmFyIGNvbXBvbmVudE5hbWVzID0gJHNjb3BlLmNvbXBvbmVudE5hbWVzO1xuICAgICAgaWYgKGNvbXBvbmVudE5hbWVzICYmIGNvbXBvbmVudE5hbWVzLmxlbmd0aCkge1xuICAgICAgICAkc2NvcGUuY29tcG9uZW50VHJlZSA9IG5ldyBGb2xkZXIoXCJFbmRwb2ludHNcIik7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuY29tcG9uZW50TmFtZXMsIChlbmRwb2ludE5hbWUpID0+IHtcbiAgICAgICAgICB2YXIgY2F0ZWdvcnkgPSBDYW1lbC5nZXRFbmRwb2ludENhdGVnb3J5KGVuZHBvaW50TmFtZSk7XG4gICAgICAgICAgdmFyIGdyb3VwTmFtZSA9IGNhdGVnb3J5LmxhYmVsIHx8IFwiQ29yZVwiO1xuICAgICAgICAgIHZhciBncm91cEtleSA9IGNhdGVnb3J5LmlkIHx8IGdyb3VwTmFtZTtcbiAgICAgICAgICB2YXIgZ3JvdXAgPSAkc2NvcGUuY29tcG9uZW50VHJlZS5nZXRPckVsc2UoZ3JvdXBOYW1lKTtcblxuICAgICAgICAgIHZhciB2YWx1ZSA9IENhbWVsLmdldEVuZHBvaW50Q29uZmlnKGVuZHBvaW50TmFtZSwgY2F0ZWdvcnkpO1xuICAgICAgICAgIHZhciBrZXkgPSBlbmRwb2ludE5hbWU7XG4gICAgICAgICAgdmFyIGxhYmVsID0gdmFsdWVbXCJsYWJlbFwiXSB8fCBlbmRwb2ludE5hbWU7XG4gICAgICAgICAgdmFyIG5vZGUgPSBuZXcgRm9sZGVyKGxhYmVsKTtcbiAgICAgICAgICBub2RlLmtleSA9IGdyb3VwS2V5ICsgXCJfXCIgKyBrZXk7XG4gICAgICAgICAgbm9kZS5rZXkgPSBrZXk7XG4gICAgICAgICAgbm9kZVtcIm5vZGVNb2RlbFwiXSA9IHZhbHVlO1xuICAgICAgICAgIHZhciB0b29sdGlwID0gdmFsdWVbXCJ0b29sdGlwXCJdIHx8IHZhbHVlW1wiZGVzY3JpcHRpb25cIl0gfHwgbGFiZWw7XG4gICAgICAgICAgdmFyIGltYWdlVXJsID0gQ29yZS51cmwodmFsdWVbXCJpY29uXCJdIHx8IENhbWVsLmVuZHBvaW50SWNvbik7XG4gICAgICAgICAgbm9kZS5pY29uID0gaW1hZ2VVcmw7XG4gICAgICAgICAgbm9kZS50b29sdGlwID0gdG9vbHRpcDtcblxuICAgICAgICAgIGdyb3VwLmNoaWxkcmVuLnB1c2gobm9kZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgICRzY29wZS5jb21wb25lbnRBY3RpdmF0aW9ucyA9IFtcImJlYW5cIl07XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdhZGREaWFsb2cuc2hvdycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICgkc2NvcGUuYWRkRGlhbG9nLnNob3cpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJCgnI3N1Ym1pdCcpLmZvY3VzKCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oXCJoYXd0aW8uZm9ybS5tb2RlbENoYW5nZVwiLCBvbk1vZGVsQ2hhbmdlRXZlbnQpO1xuXG4gICAgJHNjb3BlLm9uUm9vdFRyZWVOb2RlID0gKHJvb3RUcmVlTm9kZSkgPT4ge1xuICAgICAgJHNjb3BlLnJvb3RUcmVlTm9kZSA9IHJvb3RUcmVlTm9kZTtcbiAgICAgIC8vIHJlc3RvcmUgdGhlIHJlYWwgZGF0YSBhdCB0aGUgcm9vdCBmb3Igc2F2aW5nIHRoZSBkb2MgZXRjXG4gICAgICByb290VHJlZU5vZGUuZGF0YSA9ICRzY29wZS5jYW1lbENvbnRleHRUcmVlO1xuICAgIH07XG5cbiAgICAkc2NvcGUuYWRkTm9kZSA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUubm9kZVhtbE5vZGUpIHtcbiAgICAgICAgJHNjb3BlLmFkZERpYWxvZy5vcGVuKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhZGROZXdOb2RlKHJvdXRlTW9kZWwpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUub25QYWxldHRlU2VsZWN0ID0gKG5vZGUpID0+IHtcbiAgICAgICRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlID0gKG5vZGUgJiYgbm9kZVtcIm5vZGVNb2RlbFwiXSkgPyBub2RlIDogbnVsbDtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSkge1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKFwiU2VsZWN0ZWQgXCIgKyAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSArIFwiIDogXCIgKyAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uQ29tcG9uZW50U2VsZWN0ID0gKG5vZGUpID0+IHtcbiAgICAgICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUgPSAobm9kZSAmJiBub2RlW1wibm9kZU1vZGVsXCJdKSA/IG5vZGUgOiBudWxsO1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUgPSBudWxsO1xuICAgICAgICB2YXIgbm9kZU5hbWUgPSBub2RlLmtleTtcbiAgICAgICAgY29uc29sZS5sb2coXCJsb2FkaW5nIGVuZHBvaW50IHNjaGVtYSBmb3Igbm9kZSBcIiArIG5vZGVOYW1lKTtcbiAgICAgICAgJHNjb3BlLmxvYWRFbmRwb2ludFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5hbWUgPSBub2RlTmFtZTtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKFwiU2VsZWN0ZWQgXCIgKyAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSArIFwiIDogXCIgKyAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNlbGVjdGVkTm9kZU1vZGVsID0gKCkgPT4ge1xuICAgICAgdmFyIG5vZGVNb2RlbCA9IG51bGw7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUpIHtcbiAgICAgICAgbm9kZU1vZGVsID0gJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGVbXCJub2RlTW9kZWxcIl07XG4gICAgICAgICRzY29wZS5lbmRwb2ludENvbmZpZyA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKCRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUpIHtcbiAgICAgICAgLy8gVE9ETyBsZXN0IGNyZWF0ZSBhbiBlbmRwb2ludCBub2RlTW9kZWwgYW5kIGFzc29jaWF0ZVxuICAgICAgICAvLyB0aGUgZHVtbXkgVVJMIGFuZCBwcm9wZXJ0aWVzIGV0Yy4uLlxuICAgICAgICB2YXIgZW5kcG9pbnRDb25maWcgPSAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlW1wibm9kZU1vZGVsXCJdO1xuICAgICAgICB2YXIgZW5kcG9pbnRTY2hlbWEgPSAkc2NvcGUuZW5kcG9pbnRTY2hlbWE7XG4gICAgICAgIG5vZGVNb2RlbCA9ICRzY29wZS5zY2hlbWEuZGVmaW5pdGlvbnMuZW5kcG9pbnQ7XG4gICAgICAgICRzY29wZS5lbmRwb2ludENvbmZpZyA9IHtcbiAgICAgICAgICBrZXk6ICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUua2V5LFxuICAgICAgICAgIHNjaGVtYTogZW5kcG9pbnRTY2hlbWEsXG4gICAgICAgICAgZGV0YWlsczogZW5kcG9pbnRDb25maWdcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlTW9kZWw7XG4gICAgfTtcblxuICAgICRzY29wZS5hZGRBbmRDbG9zZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBub2RlTW9kZWwgPSAkc2NvcGUuc2VsZWN0ZWROb2RlTW9kZWwoKTtcbiAgICAgIGlmIChub2RlTW9kZWwpIHtcbiAgICAgICAgYWRkTmV3Tm9kZShub2RlTW9kZWwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJXQVJOSU5HOiBubyBub2RlTW9kZWwhXCIpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLmFkZERpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmVtb3ZlTm9kZSA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgJiYgJHNjb3BlLnRyZWVOb2RlKSB7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZEZvbGRlci5kZXRhY2goKTtcbiAgICAgICAgJHNjb3BlLnRyZWVOb2RlLnJlbW92ZSgpO1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgPSBudWxsO1xuICAgICAgICAkc2NvcGUudHJlZU5vZGUgPSBudWxsO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY2FuRGVsZXRlID0gKCkgPT4ge1xuICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZEZvbGRlciA/IHRydWUgOiBmYWxzZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmlzQWN0aXZlID0gKG5hdikgPT4ge1xuICAgICAgaWYgKGFuZ3VsYXIuaXNTdHJpbmcobmF2KSlcbiAgICAgICAgcmV0dXJuIHdvcmtzcGFjZS5pc0xpbmtBY3RpdmUobmF2KTtcbiAgICAgIHZhciBmbiA9IG5hdi5pc0FjdGl2ZTtcbiAgICAgIGlmIChmbikge1xuICAgICAgICByZXR1cm4gZm4od29ya3NwYWNlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB3b3Jrc3BhY2UuaXNMaW5rQWN0aXZlKG5hdi5ocmVmKCkpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZSA9ICgpID0+IHtcbiAgICAgIC8vIGdlbmVyYXRlIHRoZSBuZXcgWE1MXG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkICYmICRzY29wZS5yb290VHJlZU5vZGUpIHtcbiAgICAgICAgdmFyIHhtbE5vZGUgPSBDYW1lbC5nZW5lcmF0ZVhtbEZyb21Gb2xkZXIoJHNjb3BlLnJvb3RUcmVlTm9kZSk7XG4gICAgICAgIGlmICh4bWxOb2RlKSB7XG4gICAgICAgICAgdmFyIHRleHQgPSBDb3JlLnhtbE5vZGVUb1N0cmluZyh4bWxOb2RlKTtcbiAgICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgLy8gbGV0cyBzYXZlIHRoZSBmaWxlLi4uXG4gICAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9ICRzY29wZS5jb21taXRNZXNzYWdlIHx8IFwiVXBkYXRlZCBwYWdlIFwiICsgJHNjb3BlLnBhZ2VJZDtcbiAgICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgdGV4dCwgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiU2F2ZWQgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICAgICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiY2FuY2VsbGluZy4uLlwiKTtcbiAgICAgIC8vIFRPRE8gc2hvdyBkaWFsb2cgaWYgZm9sa3MgYXJlIGFib3V0IHRvIGxvc2UgY2hhbmdlcy4uLlxuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKCd3b3Jrc3BhY2UudHJlZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghJHNjb3BlLmdpdCkge1xuICAgICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiUmVsb2FkaW5nIHRoZSB2aWV3IGFzIHdlIG5vdyBzZWVtIHRvIGhhdmUgYSBnaXQgbWJlYW4hXCIpO1xuICAgICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGdldEZvbGRlclhtbE5vZGUodHJlZU5vZGUpIHtcbiAgICAgIHZhciByb3V0ZVhtbE5vZGUgPSBDYW1lbC5jcmVhdGVGb2xkZXJYbWxUcmVlKHRyZWVOb2RlLCBudWxsKTtcbiAgICAgIGlmIChyb3V0ZVhtbE5vZGUpIHtcbiAgICAgICAgJHNjb3BlLm5vZGVYbWxOb2RlID0gcm91dGVYbWxOb2RlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJvdXRlWG1sTm9kZTtcbiAgICB9XG5cbiAgICAkc2NvcGUub25Ob2RlU2VsZWN0ID0gKGZvbGRlciwgdHJlZU5vZGUpID0+IHtcbiAgICAgICRzY29wZS5zZWxlY3RlZEZvbGRlciA9IGZvbGRlcjtcbiAgICAgICRzY29wZS50cmVlTm9kZSA9IHRyZWVOb2RlO1xuICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IG51bGw7XG4gICAgICAkc2NvcGUuZGlhZ3JhbVRlbXBsYXRlID0gbnVsbDtcbiAgICAgICRzY29wZS5ub2RlWG1sTm9kZSA9IG51bGw7XG4gICAgICBpZiAoZm9sZGVyKSB7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YSA9IENhbWVsLmdldFJvdXRlRm9sZGVySlNPTihmb2xkZXIpO1xuICAgICAgICAkc2NvcGUubm9kZURhdGFDaGFuZ2VkRmllbGRzID0ge307XG4gICAgICB9XG4gICAgICB2YXIgbm9kZU5hbWUgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChmb2xkZXIpO1xuICAgICAgLy8gbGV0cyBsYXppbHkgY3JlYXRlIHRoZSBYTUwgdHJlZSBzbyBpdCBjYW4gYmUgdXNlZCBieSB0aGUgZGlhZ3JhbVxuICAgICAgdmFyIHJvdXRlWG1sTm9kZSA9IGdldEZvbGRlclhtbE5vZGUodHJlZU5vZGUpO1xuICAgICAgaWYgKG5vZGVOYW1lKSB7XG4gICAgICAgIC8vdmFyIG5vZGVOYW1lID0gcm91dGVYbWxOb2RlLmxvY2FsTmFtZTtcbiAgICAgICAgJHNjb3BlLm5vZGVNb2RlbCA9IENhbWVsLmdldENhbWVsU2NoZW1hKG5vZGVOYW1lKTtcbiAgICAgICAgaWYgKCRzY29wZS5ub2RlTW9kZWwpIHtcbiAgICAgICAgICAkc2NvcGUucHJvcGVydGllc1RlbXBsYXRlID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9jYW1lbFByb3BlcnRpZXNFZGl0Lmh0bWxcIjtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuZGlhZ3JhbVRlbXBsYXRlID0gXCJhcHAvY2FtZWwvaHRtbC9yb3V0ZXMuaHRtbFwiO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUub25Ob2RlRHJhZ0VudGVyID0gKG5vZGUsIHNvdXJjZU5vZGUpID0+IHtcbiAgICAgIHZhciBub2RlRm9sZGVyID0gbm9kZS5kYXRhO1xuICAgICAgdmFyIHNvdXJjZUZvbGRlciA9IHNvdXJjZU5vZGUuZGF0YTtcbiAgICAgIGlmIChub2RlRm9sZGVyICYmIHNvdXJjZUZvbGRlcikge1xuICAgICAgICB2YXIgbm9kZUlkID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQobm9kZUZvbGRlcik7XG4gICAgICAgIHZhciBzb3VyY2VJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKHNvdXJjZUZvbGRlcik7XG4gICAgICAgIGlmIChub2RlSWQgJiYgc291cmNlSWQpIHtcbiAgICAgICAgICAvLyB3ZSBjYW4gb25seSBkcmFnIHJvdXRlcyBvbnRvIG90aGVyIHJvdXRlcyAoYmVmb3JlIC8gYWZ0ZXIgLyBvdmVyKVxuICAgICAgICAgIGlmIChzb3VyY2VJZCA9PT0gXCJyb3V0ZVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZUlkID09PSBcInJvdXRlXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgICRzY29wZS5vbk5vZGVEcm9wID0gKG5vZGUsIHNvdXJjZU5vZGUsIGhpdE1vZGUsIHVpLCBkcmFnZ2FibGUpID0+IHtcbiAgICAgIHZhciBub2RlRm9sZGVyID0gbm9kZS5kYXRhO1xuICAgICAgdmFyIHNvdXJjZUZvbGRlciA9IHNvdXJjZU5vZGUuZGF0YTtcbiAgICAgIGlmIChub2RlRm9sZGVyICYmIHNvdXJjZUZvbGRlcikge1xuICAgICAgICAvLyB3ZSBjYW5ub3QgZHJvcCBhIHJvdXRlIGludG8gYSByb3V0ZSBvciBhIG5vbi1yb3V0ZSB0byBhIHRvcCBsZXZlbCFcbiAgICAgICAgdmFyIG5vZGVJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKG5vZGVGb2xkZXIpO1xuICAgICAgICB2YXIgc291cmNlSWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChzb3VyY2VGb2xkZXIpO1xuXG4gICAgICAgIGlmIChub2RlSWQgPT09IFwicm91dGVcIikge1xuICAgICAgICAgIC8vIGhpdE1vZGUgbXVzdCBiZSBcIm92ZXJcIiBpZiB3ZSBhcmUgbm90IGFub3RoZXIgcm91dGVcbiAgICAgICAgICBpZiAoc291cmNlSWQgPT09IFwicm91dGVcIikge1xuICAgICAgICAgICAgaWYgKGhpdE1vZGUgPT09IFwib3ZlclwiKSB7XG4gICAgICAgICAgICAgIGhpdE1vZGUgPSBcImFmdGVyXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGRpc2FibGUgYmVmb3JlIC8gYWZ0ZXJcbiAgICAgICAgICAgIGhpdE1vZGUgPSBcIm92ZXJcIjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKENhbWVsLmFjY2VwdE91dHB1dChub2RlSWQpKSB7XG4gICAgICAgICAgICBoaXRNb2RlID0gXCJvdmVyXCI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChoaXRNb2RlICE9PSBcImJlZm9yZVwiKSB7XG4gICAgICAgICAgICAgIGhpdE1vZGUgPSBcImFmdGVyXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKFwibm9kZURyb3Agbm9kZUlkOiBcIiArIG5vZGVJZCArIFwiIHNvdXJjZUlkOiBcIiArIHNvdXJjZUlkICsgXCIgaGl0TW9kZTogXCIgKyBoaXRNb2RlKTtcblxuICAgICAgICBzb3VyY2VOb2RlLm1vdmUobm9kZSwgaGl0TW9kZSk7XG4gICAgICB9XG4gICAgfTtcblxuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gYWRkTmV3Tm9kZShub2RlTW9kZWwpIHtcbiAgICAgIHZhciBkb2MgPSAkc2NvcGUuZG9jIHx8IGRvY3VtZW50O1xuICAgICAgdmFyIHBhcmVudEZvbGRlciA9ICRzY29wZS5zZWxlY3RlZEZvbGRlciB8fCAkc2NvcGUuY2FtZWxDb250ZXh0VHJlZTtcbiAgICAgIHZhciBrZXkgPSBub2RlTW9kZWxbXCJfaWRcIl07XG4gICAgICB2YXIgYmVmb3JlTm9kZSA9IG51bGw7XG4gICAgICBpZiAoIWtleSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIldBUk5JTkc6IG5vIGlkIGZvciBtb2RlbCBcIiArIEpTT04uc3RyaW5naWZ5KG5vZGVNb2RlbCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRyZWVOb2RlID0gJHNjb3BlLnRyZWVOb2RlO1xuICAgICAgICBpZiAoa2V5ID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAvLyBsZXRzIGFkZCB0byB0aGUgcm9vdCBvZiB0aGUgdHJlZVxuICAgICAgICAgIHRyZWVOb2RlID0gJHNjb3BlLnJvb3RUcmVlTm9kZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoIXRyZWVOb2RlKSB7XG4gICAgICAgICAgICAvLyBsZXRzIHNlbGVjdCB0aGUgbGFzdCByb3V0ZSAtIGFuZCBjcmVhdGUgYSBuZXcgcm91dGUgaWYgbmVlZCBiZVxuICAgICAgICAgICAgdmFyIHJvb3QgPSAkc2NvcGUucm9vdFRyZWVOb2RlO1xuICAgICAgICAgICAgdmFyIGNoaWxkcmVuID0gcm9vdC5nZXRDaGlsZHJlbigpO1xuICAgICAgICAgICAgaWYgKCFjaGlsZHJlbiB8fCAhY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIGFkZE5ld05vZGUoQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEoXCJyb3V0ZVwiKSk7XG4gICAgICAgICAgICAgIGNoaWxkcmVuID0gcm9vdC5nZXRDaGlsZHJlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICB0cmVlTm9kZSA9IGNoaWxkcmVuW2NoaWxkcmVuLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZCBub3QgYWRkIGEgbmV3IHJvdXRlIHRvIHRoZSBlbXB0eSB0cmVlIVwiKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuXG4gICAgICAgICAgLy8gaWYgdGhlIHBhcmVudCBmb2xkZXIgbGlrZXMgdG8gYWN0IGFzIGEgcGlwZWxpbmUsIHRoZW4gYWRkXG4gICAgICAgICAgLy8gYWZ0ZXIgdGhlIHBhcmVudCwgcmF0aGVyIHRoYW4gYXMgYSBjaGlsZFxuICAgICAgICAgIHZhciBwYXJlbnRJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKHRyZWVOb2RlLmRhdGEpO1xuICAgICAgICAgIGlmICghQ2FtZWwuYWNjZXB0T3V0cHV0KHBhcmVudElkKSkge1xuICAgICAgICAgICAgLy8gbGV0cyBhZGQgdGhlIG5ldyBub2RlIHRvIHRoZSBlbmQgb2YgdGhlIHBhcmVudFxuICAgICAgICAgICAgYmVmb3JlTm9kZSA9IHRyZWVOb2RlLmdldE5leHRTaWJsaW5nKCk7XG4gICAgICAgICAgICB0cmVlTm9kZSA9IHRyZWVOb2RlLmdldFBhcmVudCgpIHx8IHRyZWVOb2RlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodHJlZU5vZGUpIHtcbiAgICAgICAgICB2YXIgbm9kZSA9IGRvYy5jcmVhdGVFbGVtZW50KGtleSk7XG4gICAgICAgICAgcGFyZW50Rm9sZGVyID0gdHJlZU5vZGUuZGF0YTtcbiAgICAgICAgICB2YXIgYWRkZWROb2RlID0gQ2FtZWwuYWRkUm91dGVDaGlsZChwYXJlbnRGb2xkZXIsIG5vZGUpO1xuICAgICAgICAgIGlmIChhZGRlZE5vZGUpIHtcbiAgICAgICAgICAgIHZhciBhZGRlZCA9IHRyZWVOb2RlLmFkZENoaWxkKGFkZGVkTm9kZSwgYmVmb3JlTm9kZSk7XG4gICAgICAgICAgICBpZiAoYWRkZWQpIHtcbiAgICAgICAgICAgICAgZ2V0Rm9sZGVyWG1sTm9kZShhZGRlZCk7XG4gICAgICAgICAgICAgIGFkZGVkLmV4cGFuZCh0cnVlKTtcbiAgICAgICAgICAgICAgYWRkZWQuc2VsZWN0KHRydWUpO1xuICAgICAgICAgICAgICBhZGRlZC5hY3RpdmF0ZSh0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbk1vZGVsQ2hhbmdlRXZlbnQoZXZlbnQsIG5hbWUpIHtcbiAgICAgIC8vIGxldHMgZmlsdGVyIG91dCBldmVudHMgZHVlIHRvIHRoZSBub2RlIGNoYW5naW5nIGNhdXNpbmcgdGhlXG4gICAgICAvLyBmb3JtcyB0byBiZSByZWNyZWF0ZWRcbiAgICAgIGlmICgkc2NvcGUubm9kZURhdGEpIHtcbiAgICAgICAgdmFyIGZpZWxkTWFwID0gJHNjb3BlLm5vZGVEYXRhQ2hhbmdlZEZpZWxkcztcbiAgICAgICAgaWYgKGZpZWxkTWFwKSB7XG4gICAgICAgICAgaWYgKGZpZWxkTWFwW25hbWVdKSB7XG4gICAgICAgICAgICBvbk5vZGVEYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB0aGUgc2VsZWN0aW9uIGhhcyBqdXN0IGNoYW5nZWQgc28gd2UgZ2V0IHRoZSBpbml0aWFsIGV2ZW50XG4gICAgICAgICAgICAvLyB3ZSBjYW4gaWdub3JlIHRoaXMgOilcbiAgICAgICAgICAgIGZpZWxkTWFwW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbk5vZGVEYXRhQ2hhbmdlZCgpIHtcbiAgICAgICRzY29wZS5tb2RpZmllZCA9IHRydWU7XG4gICAgICB2YXIgc2VsZWN0ZWRGb2xkZXIgPSAkc2NvcGUuc2VsZWN0ZWRGb2xkZXI7XG4gICAgICBpZiAoJHNjb3BlLnRyZWVOb2RlICYmIHNlbGVjdGVkRm9sZGVyKSB7XG4gICAgICAgIHZhciByb3V0ZVhtbE5vZGUgPSBnZXRGb2xkZXJYbWxOb2RlKCRzY29wZS50cmVlTm9kZSk7XG4gICAgICAgIGlmIChyb3V0ZVhtbE5vZGUpIHtcbiAgICAgICAgICB2YXIgbm9kZU5hbWUgPSByb3V0ZVhtbE5vZGUubG9jYWxOYW1lO1xuICAgICAgICAgIHZhciBub2RlU2V0dGluZ3MgPSBDYW1lbC5nZXRDYW1lbFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgICAgaWYgKG5vZGVTZXR0aW5ncykge1xuICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSB0aXRsZSBhbmQgdG9vbHRpcCBldGNcbiAgICAgICAgICAgIENhbWVsLnVwZGF0ZVJvdXRlTm9kZUxhYmVsQW5kVG9vbHRpcChzZWxlY3RlZEZvbGRlciwgcm91dGVYbWxOb2RlLCBub2RlU2V0dGluZ3MpO1xuICAgICAgICAgICAgJHNjb3BlLnRyZWVOb2RlLnJlbmRlcihmYWxzZSwgZmFsc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIG5vdCBzdXJlIHdlIG5lZWQgdGhpcyB0byBiZSBob25lc3RcbiAgICAgICAgc2VsZWN0ZWRGb2xkZXJbXCJjYW1lbE5vZGVEYXRhXCJdID0gJHNjb3BlLm5vZGVEYXRhO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUmVzdWx0cyhyZXNwb25zZSkge1xuICAgICAgdmFyIHRleHQgPSByZXNwb25zZS50ZXh0O1xuICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgLy8gbGV0cyByZW1vdmUgYW55IGRvZGd5IGNoYXJhY3RlcnMgc28gd2UgY2FuIHVzZSBpdCBhcyBhIERPTSBpZFxuICAgICAgICB2YXIgdHJlZSA9IENhbWVsLmxvYWRDYW1lbFRyZWUodGV4dCwgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgIGlmICh0cmVlKSB7XG4gICAgICAgICAgJHNjb3BlLmNhbWVsQ29udGV4dFRyZWUgPSB0cmVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIk5vIFhNTCBmb3VuZCBmb3IgcGFnZSBcIiArICRzY29wZS5wYWdlSWQpO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHlMYXRlcigkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICAkc2NvcGUubG9hZEVuZHBvaW50TmFtZXMoKTtcbiAgICAgICRzY29wZS5wYWdlSWQgPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgICBjb25zb2xlLmxvZyhcIkhhcyBwYWdlIGlkOiBcIiArICRzY29wZS5wYWdlSWQgKyBcIiB3aXRoICRyb3V0ZVBhcmFtcyBcIiArIEpTT04uc3RyaW5naWZ5KCRyb3V0ZVBhcmFtcykpO1xuXG4gICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsICRzY29wZS5vYmplY3RJZCwgb25SZXN1bHRzKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGdvVG9WaWV3KCkge1xuICAgICAgLy8gVE9ETyBsZXRzIG5hdmlnYXRlIHRvIHRoZSB2aWV3IGlmIHdlIGhhdmUgYSBzZXBhcmF0ZSB2aWV3IG9uZSBkYXkgOilcbiAgICAgIC8qXG4gICAgICAgaWYgKCRzY29wZS5icmVhZGNydW1icyAmJiAkc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoID4gMSkge1xuICAgICAgIHZhciB2aWV3TGluayA9ICRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMl07XG4gICAgICAgY29uc29sZS5sb2coXCJnb1RvVmlldyBoYXMgZm91bmQgdmlldyBcIiArIHZpZXdMaW5rKTtcbiAgICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcodmlld0xpbmssIFwiI1wiKTtcbiAgICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgIGNvbnNvbGUubG9nKFwiZ29Ub1ZpZXcgaGFzIG5vIGJyZWFkY3J1bWJzIVwiKTtcbiAgICAgICB9XG4gICAgICAgKi9cbiAgICB9XG5cbiAgICAkc2NvcGUuZG9Td2l0Y2hUb0NhbnZhc1ZpZXcgPSAoKSA9PiB7XG4gICAgICAkbG9jYXRpb24udXJsKENvcmUudHJpbUxlYWRpbmcoKFdpa2kuc3RhcnRMaW5rKCRzY29wZS5icmFuY2gpICsgXCIvY2FtZWwvY2FudmFzL1wiICsgJHNjb3BlLnBhZ2VJZCksICcjJykpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY29uZmlybVN3aXRjaFRvQ2FudmFzVmlldyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQpIHtcbiAgICAgICAgJHNjb3BlLnN3aXRjaFRvQ2FudmFzVmlldy5vcGVuKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuZG9Td2l0Y2hUb0NhbnZhc1ZpZXcoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gIH1dKTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3dpa2lQbHVnaW4udHNcIi8+XG5tb2R1bGUgV2lraSB7XG4gIGV4cG9ydCB2YXIgQ2FtZWxDYW52YXNDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5DYW1lbENhbnZhc0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRpbnRlcnBvbGF0ZVwiLCBcIiRsb2NhdGlvblwiLCAoJHNjb3BlLCAkZWxlbWVudCwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgJGludGVycG9sYXRlLCAkbG9jYXRpb24pID0+IHtcbiAgICB2YXIganNQbHVtYkluc3RhbmNlID0ganNQbHVtYi5nZXRJbnN0YW5jZSgpO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmFkZERpYWxvZyA9IG5ldyBVSS5EaWFsb2coKTtcbiAgICAkc2NvcGUucHJvcGVydGllc0RpYWxvZyA9IG5ldyBVSS5EaWFsb2coKTtcbiAgICAkc2NvcGUuc3dpdGNoVG9UcmVlVmlldyA9IG5ldyBVSS5EaWFsb2coKTtcbiAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcbiAgICAkc2NvcGUuY2FtZWxJZ25vcmVJZEZvckxhYmVsID0gQ2FtZWwuaWdub3JlSWRGb3JMYWJlbChsb2NhbFN0b3JhZ2UpO1xuICAgICRzY29wZS5jYW1lbE1heGltdW1MYWJlbFdpZHRoID0gQ2FtZWwubWF4aW11bUxhYmVsV2lkdGgobG9jYWxTdG9yYWdlKTtcbiAgICAkc2NvcGUuY2FtZWxNYXhpbXVtVHJhY2VPckRlYnVnQm9keUxlbmd0aCA9IENhbWVsLm1heGltdW1UcmFjZU9yRGVidWdCb2R5TGVuZ3RoKGxvY2FsU3RvcmFnZSk7XG5cbiAgICAkc2NvcGUuZm9ybXMgPSB7fTtcblxuICAgICRzY29wZS5ub2RlVGVtcGxhdGUgPSAkaW50ZXJwb2xhdGUoJHRlbXBsYXRlQ2FjaGUuZ2V0KFwibm9kZVRlbXBsYXRlXCIpKTtcblxuICAgICRzY29wZS4kd2F0Y2goXCJjYW1lbENvbnRleHRUcmVlXCIsICgpID0+IHtcbiAgICAgIHZhciB0cmVlID0gJHNjb3BlLmNhbWVsQ29udGV4dFRyZWU7XG4gICAgICAkc2NvcGUucm9vdEZvbGRlciA9IHRyZWU7XG4gICAgICAvLyBub3cgd2UndmUgZ290IGNpZCB2YWx1ZXMgaW4gdGhlIHRyZWUgYW5kIERPTSwgbGV0cyBjcmVhdGUgYW4gaW5kZXggc28gd2UgY2FuIGJpbmQgdGhlIERPTSB0byB0aGUgdHJlZSBtb2RlbFxuICAgICAgJHNjb3BlLmZvbGRlcnMgPSBDYW1lbC5hZGRGb2xkZXJzVG9JbmRleCgkc2NvcGUucm9vdEZvbGRlcik7XG5cbiAgICAgIHZhciBkb2MgPSBDb3JlLnBhdGhHZXQodHJlZSwgW1wieG1sRG9jdW1lbnRcIl0pO1xuICAgICAgaWYgKGRvYykge1xuICAgICAgICAkc2NvcGUuZG9jID0gZG9jO1xuICAgICAgICByZWxvYWRSb3V0ZUlkcygpO1xuICAgICAgICBvblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCgpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLmFkZEFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIG5vZGVNb2RlbCA9ICRzY29wZS5zZWxlY3RlZE5vZGVNb2RlbCgpO1xuICAgICAgaWYgKG5vZGVNb2RlbCkge1xuICAgICAgICBhZGROZXdOb2RlKG5vZGVNb2RlbCk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuYWRkRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5yZW1vdmVOb2RlID0gKCkgPT4ge1xuICAgICAgdmFyIGZvbGRlciA9IGdldFNlbGVjdGVkT3JSb3V0ZUZvbGRlcigpO1xuICAgICAgaWYgKGZvbGRlcikge1xuICAgICAgICB2YXIgbm9kZU5hbWUgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChmb2xkZXIpO1xuICAgICAgICBmb2xkZXIuZGV0YWNoKCk7XG4gICAgICAgIGlmIChcInJvdXRlXCIgPT09IG5vZGVOYW1lKSB7XG4gICAgICAgICAgLy8gbGV0cyBhbHNvIGNsZWFyIHRoZSBzZWxlY3RlZCByb3V0ZSBub2RlXG4gICAgICAgICAgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdXBkYXRlU2VsZWN0aW9uKG51bGwpO1xuICAgICAgICB0cmVlTW9kaWZpZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRvTGF5b3V0ID0gKCkgPT4ge1xuICAgICAgJHNjb3BlLmRyYXduUm91dGVJZCA9IG51bGw7XG4gICAgICBvblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCgpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBpc1JvdXRlT3JOb2RlKCkge1xuICAgICAgcmV0dXJuICEkc2NvcGUuc2VsZWN0ZWRGb2xkZXJcbiAgICB9XG5cbiAgICAkc2NvcGUuZ2V0RGVsZXRlVGl0bGUgPSAoKSA9PiB7XG4gICAgICBpZiAoaXNSb3V0ZU9yTm9kZSgpKSB7XG4gICAgICAgIHJldHVybiBcIkRlbGV0ZSB0aGlzIHJvdXRlXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gXCJEZWxldGUgdGhpcyBub2RlXCI7XG4gICAgfVxuXG4gICAgJHNjb3BlLmdldERlbGV0ZVRhcmdldCA9ICgpID0+IHtcbiAgICAgIGlmIChpc1JvdXRlT3JOb2RlKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiUm91dGVcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcIk5vZGVcIjtcbiAgICB9XG5cbiAgICAkc2NvcGUuaXNGb3JtRGlydHkgPSAoKSA9PiB7XG4gICAgICBsb2cuZGVidWcoXCJlbmRwb2ludEZvcm06IFwiLCAkc2NvcGUuZW5kcG9pbnRGb3JtKTtcbiAgICAgIGlmICgkc2NvcGUuZW5kcG9pbnRGb3JtLiRkaXJ0eSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICghJHNjb3BlLmZvcm1zWydmb3JtRWRpdG9yJ10pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICRzY29wZS5mb3Jtc1snZm9ybUVkaXRvciddWyckZGlydHknXTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyogVE9ET1xuICAgICAkc2NvcGUucmVzZXRGb3JtcyA9ICgpID0+IHtcblxuICAgICB9XG4gICAgICovXG5cbiAgICAvKlxuICAgICAqIENvbnZlcnRzIGEgcGF0aCBhbmQgYSBzZXQgb2YgZW5kcG9pbnQgcGFyYW1ldGVycyBpbnRvIGEgVVJJIHdlIGNhbiB0aGVuIHVzZSB0byBzdG9yZSBpbiB0aGUgWE1MXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRW5kcG9pbnRVUkkoZW5kcG9pbnRTY2hlbWU6c3RyaW5nLCBzbGFzaGVzVGV4dDpzdHJpbmcsIGVuZHBvaW50UGF0aDpzdHJpbmcsIGVuZHBvaW50UGFyYW1ldGVyczphbnkpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwic2NoZW1lIFwiICsgZW5kcG9pbnRTY2hlbWUgKyBcIiBwYXRoIFwiICsgZW5kcG9pbnRQYXRoICsgXCIgcGFyYW1ldGVycyBcIiArIGVuZHBvaW50UGFyYW1ldGVycyk7XG4gICAgICAvLyBub3cgbGV0cyBjcmVhdGUgdGhlIG5ldyBVUkkgZnJvbSB0aGUgcGF0aCBhbmQgcGFyYW1ldGVyc1xuICAgICAgLy8gVE9ETyBzaG91bGQgd2UgdXNlIEpNWCBmb3IgdGhpcz9cbiAgICAgIHZhciB1cmkgPSAoKGVuZHBvaW50U2NoZW1lKSA/IGVuZHBvaW50U2NoZW1lICsgXCI6XCIgKyBzbGFzaGVzVGV4dCA6IFwiXCIpICsgKGVuZHBvaW50UGF0aCA/IGVuZHBvaW50UGF0aCA6IFwiXCIpO1xuICAgICAgdmFyIHBhcmFtVGV4dCA9IENvcmUuaGFzaFRvU3RyaW5nKGVuZHBvaW50UGFyYW1ldGVycyk7XG4gICAgICBpZiAocGFyYW1UZXh0KSB7XG4gICAgICAgIHVyaSArPSBcIj9cIiArIHBhcmFtVGV4dDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1cmk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnVwZGF0ZVByb3BlcnRpZXMgPSAoKSA9PiB7XG4gICAgICBsb2cuaW5mbyhcIm9sZCBVUkkgaXMgXCIgKyAkc2NvcGUubm9kZURhdGEudXJpKTtcbiAgICAgIHZhciB1cmkgPSBjcmVhdGVFbmRwb2ludFVSSSgkc2NvcGUuZW5kcG9pbnRTY2hlbWUsICgkc2NvcGUuZW5kcG9pbnRQYXRoSGFzU2xhc2hlcyA/IFwiLy9cIiA6IFwiXCIpLCAkc2NvcGUuZW5kcG9pbnRQYXRoLCAkc2NvcGUuZW5kcG9pbnRQYXJhbWV0ZXJzKTtcbiAgICAgIGxvZy5pbmZvKFwibmV3IFVSSSBpcyBcIiArIHVyaSk7XG4gICAgICBpZiAodXJpKSB7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YS51cmkgPSB1cmk7XG4gICAgICB9XG5cbiAgICAgIHZhciBrZXkgPSBudWxsO1xuICAgICAgdmFyIHNlbGVjdGVkRm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyO1xuICAgICAgaWYgKHNlbGVjdGVkRm9sZGVyKSB7XG4gICAgICAgIGtleSA9IHNlbGVjdGVkRm9sZGVyLmtleTtcblxuICAgICAgICAvLyBsZXRzIGRlbGV0ZSB0aGUgY3VycmVudCBzZWxlY3RlZCBub2RlJ3MgZGl2IHNvIGl0cyB1cGRhdGVkIHdpdGggdGhlIG5ldyB0ZW1wbGF0ZSB2YWx1ZXNcbiAgICAgICAgdmFyIGVsZW1lbnRzID0gJGVsZW1lbnQuZmluZChcIi5jYW52YXNcIikuZmluZChcIltpZD0nXCIgKyBrZXkgKyBcIiddXCIpLmZpcnN0KCkucmVtb3ZlKCk7XG4gICAgICB9XG5cbiAgICAgIHRyZWVNb2RpZmllZCgpO1xuXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHVwZGF0ZVNlbGVjdGlvbihrZXkpXG4gICAgICB9XG5cbiAgICAgIGlmICgkc2NvcGUuaXNGb3JtRGlydHkoKSkge1xuICAgICAgICAkc2NvcGUuZW5kcG9pbnRGb3JtLiRzZXRQcmlzdGluZSgpO1xuICAgICAgICBpZiAoJHNjb3BlLmZvcm1zWydmb3JtRWRpdG9yJ10pIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybXNbJ2Zvcm1FZGl0b3InXS4kc2V0UHJpc3RpbmUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZSA9ICgpID0+IHtcbiAgICAgIC8vIGdlbmVyYXRlIHRoZSBuZXcgWE1MXG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkICYmICRzY29wZS5yb290Rm9sZGVyKSB7XG4gICAgICAgIHZhciB4bWxOb2RlID0gQ2FtZWwuZ2VuZXJhdGVYbWxGcm9tRm9sZGVyKCRzY29wZS5yb290Rm9sZGVyKTtcbiAgICAgICAgaWYgKHhtbE5vZGUpIHtcbiAgICAgICAgICB2YXIgdGV4dCA9IENvcmUueG1sTm9kZVRvU3RyaW5nKHhtbE5vZGUpO1xuICAgICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICB2YXIgZGVjb2RlZCA9IGRlY29kZVVSSUNvbXBvbmVudCh0ZXh0KTtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIlNhdmluZyB4bWwgZGVjb2RlZDogXCIgKyBkZWNvZGVkKTtcblxuICAgICAgICAgICAgLy8gbGV0cyBzYXZlIHRoZSBmaWxlLi4uXG4gICAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9ICRzY29wZS5jb21taXRNZXNzYWdlIHx8IFwiVXBkYXRlZCBwYWdlIFwiICsgJHNjb3BlLnBhZ2VJZDtcbiAgICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgZGVjb2RlZCwgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiU2F2ZWQgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICAgICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiY2FuY2VsbGluZy4uLlwiKTtcbiAgICAgIC8vIFRPRE8gc2hvdyBkaWFsb2cgaWYgZm9sa3MgYXJlIGFib3V0IHRvIGxvc2UgY2hhbmdlcy4uLlxuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKFwic2VsZWN0ZWRSb3V0ZUlkXCIsIG9uUm91dGVTZWxlY3Rpb25DaGFuZ2VkKTtcblxuICAgIGZ1bmN0aW9uIGdvVG9WaWV3KCkge1xuICAgICAgLy8gVE9ETyBsZXRzIG5hdmlnYXRlIHRvIHRoZSB2aWV3IGlmIHdlIGhhdmUgYSBzZXBhcmF0ZSB2aWV3IG9uZSBkYXkgOilcbiAgICAgIC8qXG4gICAgICAgaWYgKCRzY29wZS5icmVhZGNydW1icyAmJiAkc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoID4gMSkge1xuICAgICAgIHZhciB2aWV3TGluayA9ICRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMl07XG4gICAgICAgY29uc29sZS5sb2coXCJnb1RvVmlldyBoYXMgZm91bmQgdmlldyBcIiArIHZpZXdMaW5rKTtcbiAgICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcodmlld0xpbmssIFwiI1wiKTtcbiAgICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgIGNvbnNvbGUubG9nKFwiZ29Ub1ZpZXcgaGFzIG5vIGJyZWFkY3J1bWJzIVwiKTtcbiAgICAgICB9XG4gICAgICAgKi9cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGROZXdOb2RlKG5vZGVNb2RlbCkge1xuICAgICAgdmFyIGRvYyA9ICRzY29wZS5kb2MgfHwgZG9jdW1lbnQ7XG4gICAgICB2YXIgcGFyZW50Rm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyIHx8ICRzY29wZS5yb290Rm9sZGVyO1xuICAgICAgdmFyIGtleSA9IG5vZGVNb2RlbFtcIl9pZFwiXTtcbiAgICAgIGlmICgha2V5KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiV0FSTklORzogbm8gaWQgZm9yIG1vZGVsIFwiICsgSlNPTi5zdHJpbmdpZnkobm9kZU1vZGVsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdHJlZU5vZGUgPSAkc2NvcGUuc2VsZWN0ZWRGb2xkZXI7XG4gICAgICAgIGlmIChrZXkgPT09IFwicm91dGVcIikge1xuICAgICAgICAgIC8vIGxldHMgYWRkIHRvIHRoZSByb290IG9mIHRoZSB0cmVlXG4gICAgICAgICAgdHJlZU5vZGUgPSAkc2NvcGUucm9vdEZvbGRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoIXRyZWVOb2RlKSB7XG4gICAgICAgICAgICAvLyBsZXRzIHNlbGVjdCB0aGUgbGFzdCByb3V0ZSAtIGFuZCBjcmVhdGUgYSBuZXcgcm91dGUgaWYgbmVlZCBiZVxuICAgICAgICAgICAgdmFyIHJvb3QgPSAkc2NvcGUucm9vdEZvbGRlcjtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW47XG4gICAgICAgICAgICBpZiAoIWNoaWxkcmVuIHx8ICFjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgYWRkTmV3Tm9kZShDYW1lbC5nZXRDYW1lbFNjaGVtYShcInJvdXRlXCIpKTtcbiAgICAgICAgICAgICAgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICB0cmVlTm9kZSA9IGdldFJvdXRlRm9sZGVyKCRzY29wZS5yb290Rm9sZGVyLCAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkKSB8fCBjaGlsZHJlbltjaGlsZHJlbi5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ291bGQgbm90IGFkZCBhIG5ldyByb3V0ZSB0byB0aGUgZW1wdHkgdHJlZSFcIik7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBpZiB0aGUgcGFyZW50IGZvbGRlciBsaWtlcyB0byBhY3QgYXMgYSBwaXBlbGluZSwgdGhlbiBhZGRcbiAgICAgICAgICAvLyBhZnRlciB0aGUgcGFyZW50LCByYXRoZXIgdGhhbiBhcyBhIGNoaWxkXG4gICAgICAgICAgdmFyIHBhcmVudFR5cGVOYW1lID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQodHJlZU5vZGUpO1xuICAgICAgICAgIGlmICghQ2FtZWwuYWNjZXB0T3V0cHV0KHBhcmVudFR5cGVOYW1lKSkge1xuICAgICAgICAgICAgdHJlZU5vZGUgPSB0cmVlTm9kZS5wYXJlbnQgfHwgdHJlZU5vZGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0cmVlTm9kZSkge1xuICAgICAgICAgIHZhciBub2RlID0gZG9jLmNyZWF0ZUVsZW1lbnQoa2V5KTtcbiAgICAgICAgICBwYXJlbnRGb2xkZXIgPSB0cmVlTm9kZTtcbiAgICAgICAgICB2YXIgYWRkZWROb2RlID0gQ2FtZWwuYWRkUm91dGVDaGlsZChwYXJlbnRGb2xkZXIsIG5vZGUpO1xuICAgICAgICAgIC8vIFRPRE8gYWRkIHRoZSBzY2hlbWEgaGVyZSBmb3IgYW4gZWxlbWVudD8/XG4gICAgICAgICAgLy8gb3IgZGVmYXVsdCB0aGUgZGF0YSBvciBzb21ldGhpbmdcblxuICAgICAgICAgIHZhciBub2RlRGF0YSA9IHtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGlmIChrZXkgPT09IFwiZW5kcG9pbnRcIiAmJiAkc2NvcGUuZW5kcG9pbnRDb25maWcpIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSAkc2NvcGUuZW5kcG9pbnRDb25maWcua2V5O1xuICAgICAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgICBub2RlRGF0YVtcInVyaVwiXSA9IGtleSArIFwiOlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBhZGRlZE5vZGVbXCJjYW1lbE5vZGVEYXRhXCJdID0gbm9kZURhdGE7XG4gICAgICAgICAgYWRkZWROb2RlW1wiZW5kcG9pbnRDb25maWdcIl0gPSAkc2NvcGUuZW5kcG9pbnRDb25maWc7XG5cbiAgICAgICAgICBpZiAoa2V5ID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAgIC8vIGxldHMgZ2VuZXJhdGUgYSBuZXcgcm91dGVJZCBhbmQgc3dpdGNoIHRvIGl0XG4gICAgICAgICAgICB2YXIgY291bnQgPSAkc2NvcGUucm91dGVJZHMubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIG5vZGVJZCA9IG51bGw7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICBub2RlSWQgPSBcInJvdXRlXCIgKyAoKytjb3VudCk7XG4gICAgICAgICAgICAgIGlmICghJHNjb3BlLnJvdXRlSWRzLmZpbmQobm9kZUlkKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhZGRlZE5vZGVbXCJyb3V0ZVhtbE5vZGVcIl0uc2V0QXR0cmlidXRlKFwiaWRcIiwgbm9kZUlkKTtcbiAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZFJvdXRlSWQgPSBub2RlSWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0cmVlTW9kaWZpZWQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmVlTW9kaWZpZWQocmVwb3NpdGlvbiA9IHRydWUpIHtcbiAgICAgIC8vIGxldHMgcmVjcmVhdGUgdGhlIFhNTCBtb2RlbCBmcm9tIHRoZSB1cGRhdGUgRm9sZGVyIHRyZWVcbiAgICAgIHZhciBuZXdEb2MgPSBDYW1lbC5nZW5lcmF0ZVhtbEZyb21Gb2xkZXIoJHNjb3BlLnJvb3RGb2xkZXIpO1xuICAgICAgdmFyIHRyZWUgPSBDYW1lbC5sb2FkQ2FtZWxUcmVlKG5ld0RvYywgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICBpZiAodHJlZSkge1xuICAgICAgICAkc2NvcGUucm9vdEZvbGRlciA9IHRyZWU7XG4gICAgICAgICRzY29wZS5kb2MgPSBDb3JlLnBhdGhHZXQodHJlZSwgW1wieG1sRG9jdW1lbnRcIl0pO1xuICAgICAgfVxuICAgICAgJHNjb3BlLm1vZGlmaWVkID0gdHJ1ZTtcbiAgICAgIHJlbG9hZFJvdXRlSWRzKCk7XG4gICAgICAkc2NvcGUuZG9MYXlvdXQoKTtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiByZWxvYWRSb3V0ZUlkcygpIHtcbiAgICAgICRzY29wZS5yb3V0ZUlkcyA9IFtdO1xuICAgICAgdmFyIGRvYyA9ICQoJHNjb3BlLmRvYyk7XG4gICAgICAkc2NvcGUuY2FtZWxTZWxlY3Rpb25EZXRhaWxzLnNlbGVjdGVkQ2FtZWxDb250ZXh0SWQgPSBkb2MuZmluZChcImNhbWVsQ29udGV4dFwiKS5hdHRyKFwiaWRcIik7XG4gICAgICBkb2MuZmluZChcInJvdXRlXCIpLmVhY2goKGlkeCwgcm91dGUpID0+IHtcbiAgICAgICAgdmFyIGlkID0gcm91dGUuZ2V0QXR0cmlidXRlKFwiaWRcIik7XG4gICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICRzY29wZS5yb3V0ZUlkcy5wdXNoKGlkKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Sb3V0ZVNlbGVjdGlvbkNoYW5nZWQoKSB7XG4gICAgICBpZiAoJHNjb3BlLmRvYykge1xuICAgICAgICBpZiAoISRzY29wZS5zZWxlY3RlZFJvdXRlSWQgJiYgJHNjb3BlLnJvdXRlSWRzICYmICRzY29wZS5yb3V0ZUlkcy5sZW5ndGgpIHtcbiAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkID0gJHNjb3BlLnJvdXRlSWRzWzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkICYmICRzY29wZS5zZWxlY3RlZFJvdXRlSWQgIT09ICRzY29wZS5kcmF3blJvdXRlSWQpIHtcbiAgICAgICAgICB2YXIgbm9kZXMgPSBbXTtcbiAgICAgICAgICB2YXIgbGlua3MgPSBbXTtcbiAgICAgICAgICBDYW1lbC5sb2FkUm91dGVYbWxOb2Rlcygkc2NvcGUsICRzY29wZS5kb2MsICRzY29wZS5zZWxlY3RlZFJvdXRlSWQsIG5vZGVzLCBsaW5rcywgZ2V0V2lkdGgoKSk7XG4gICAgICAgICAgdXBkYXRlU2VsZWN0aW9uKCRzY29wZS5zZWxlY3RlZFJvdXRlSWQpO1xuICAgICAgICAgIC8vIG5vdyB3ZSd2ZSBnb3QgY2lkIHZhbHVlcyBpbiB0aGUgdHJlZSBhbmQgRE9NLCBsZXRzIGNyZWF0ZSBhbiBpbmRleCBzbyB3ZSBjYW4gYmluZCB0aGUgRE9NIHRvIHRoZSB0cmVlIG1vZGVsXG4gICAgICAgICAgJHNjb3BlLmZvbGRlcnMgPSBDYW1lbC5hZGRGb2xkZXJzVG9JbmRleCgkc2NvcGUucm9vdEZvbGRlcik7XG4gICAgICAgICAgc2hvd0dyYXBoKG5vZGVzLCBsaW5rcyk7XG4gICAgICAgICAgJHNjb3BlLmRyYXduUm91dGVJZCA9ICRzY29wZS5zZWxlY3RlZFJvdXRlSWQ7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmNhbWVsU2VsZWN0aW9uRGV0YWlscy5zZWxlY3RlZFJvdXRlSWQgPSAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dHcmFwaChub2RlcywgbGlua3MpIHtcbiAgICAgIGxheW91dEdyYXBoKG5vZGVzLCBsaW5rcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Tm9kZUlkKG5vZGUpIHtcbiAgICAgIGlmIChhbmd1bGFyLmlzTnVtYmVyKG5vZGUpKSB7XG4gICAgICAgIHZhciBpZHggPSBub2RlO1xuICAgICAgICBub2RlID0gJHNjb3BlLm5vZGVTdGF0ZXNbaWR4XTtcbiAgICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJDYW50IGZpbmQgbm9kZSBhdCBcIiArIGlkeCk7XG4gICAgICAgICAgcmV0dXJuIFwibm9kZS1cIiArIGlkeDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGUuY2lkIHx8IFwibm9kZS1cIiArIG5vZGUuaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0ZWRPclJvdXRlRm9sZGVyKCkge1xuICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZEZvbGRlciB8fCBnZXRSb3V0ZUZvbGRlcigkc2NvcGUucm9vdEZvbGRlciwgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Q29udGFpbmVyRWxlbWVudCgpIHtcbiAgICAgIHZhciByb290RWxlbWVudCA9ICRlbGVtZW50O1xuICAgICAgdmFyIGNvbnRhaW5lckVsZW1lbnQgPSByb290RWxlbWVudC5maW5kKFwiLmNhbnZhc1wiKTtcbiAgICAgIGlmICghY29udGFpbmVyRWxlbWVudCB8fCAhY29udGFpbmVyRWxlbWVudC5sZW5ndGgpIGNvbnRhaW5lckVsZW1lbnQgPSByb290RWxlbWVudDtcbiAgICAgIHJldHVybiBjb250YWluZXJFbGVtZW50O1xuICAgIH1cblxuICAgIC8vIGNvbmZpZ3VyZSBjYW52YXMgbGF5b3V0IGFuZCBzdHlsZXNcbiAgICB2YXIgZW5kcG9pbnRTdHlsZTphbnlbXSA9IFtcIkRvdFwiLCB7IHJhZGl1czogNCwgY3NzQ2xhc3M6ICdjYW1lbC1jYW52YXMtZW5kcG9pbnQnIH1dO1xuICAgIHZhciBob3ZlclBhaW50U3R5bGUgPSB7IHN0cm9rZVN0eWxlOiBcInJlZFwiLCBsaW5lV2lkdGg6IDMgfTtcbiAgICAvL3ZhciBsYWJlbFN0eWxlczogYW55W10gPSBbIFwiTGFiZWxcIiwgeyBsYWJlbDpcIkZPT1wiLCBpZDpcImxhYmVsXCIgfV07XG4gICAgdmFyIGxhYmVsU3R5bGVzOmFueVtdID0gWyBcIkxhYmVsXCIgXTtcbiAgICB2YXIgYXJyb3dTdHlsZXM6YW55W10gPSBbIFwiQXJyb3dcIiwge1xuICAgICAgbG9jYXRpb246IDEsXG4gICAgICBpZDogXCJhcnJvd1wiLFxuICAgICAgbGVuZ3RoOiA4LFxuICAgICAgd2lkdGg6IDgsXG4gICAgICBmb2xkYmFjazogMC44XG4gICAgfSBdO1xuICAgIHZhciBjb25uZWN0b3JTdHlsZTphbnlbXSA9IFsgXCJTdGF0ZU1hY2hpbmVcIiwgeyBjdXJ2aW5lc3M6IDEwLCBwcm94aW1pdHlMaW1pdDogNTAgfSBdO1xuXG4gICAganNQbHVtYkluc3RhbmNlLmltcG9ydERlZmF1bHRzKHtcbiAgICAgIEVuZHBvaW50OiBlbmRwb2ludFN0eWxlLFxuICAgICAgSG92ZXJQYWludFN0eWxlOiBob3ZlclBhaW50U3R5bGUsXG4gICAgICBDb25uZWN0aW9uT3ZlcmxheXM6IFtcbiAgICAgICAgYXJyb3dTdHlsZXMsXG4gICAgICAgIGxhYmVsU3R5bGVzXG4gICAgICBdXG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcbiAgICAgIGpzUGx1bWJJbnN0YW5jZS5yZXNldCgpO1xuICAgICAgZGVsZXRlIGpzUGx1bWJJbnN0YW5jZTtcbiAgICB9KTtcblxuICAgIC8vIGRvdWJsZSBjbGljayBvbiBhbnkgY29ubmVjdGlvblxuICAgIGpzUGx1bWJJbnN0YW5jZS5iaW5kKFwiZGJsY2xpY2tcIiwgZnVuY3Rpb24gKGNvbm5lY3Rpb24sIG9yaWdpbmFsRXZlbnQpIHtcbiAgICAgIGlmIChqc1BsdW1iSW5zdGFuY2UuaXNTdXNwZW5kRHJhd2luZygpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGFsZXJ0KFwiZG91YmxlIGNsaWNrIG9uIGNvbm5lY3Rpb24gZnJvbSBcIiArIGNvbm5lY3Rpb24uc291cmNlSWQgKyBcIiB0byBcIiArIGNvbm5lY3Rpb24udGFyZ2V0SWQpO1xuICAgIH0pO1xuXG4gICAganNQbHVtYkluc3RhbmNlLmJpbmQoJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbiAoaW5mbywgZXZ0KSB7XG4gICAgICAvL2xvZy5kZWJ1ZyhcIkNvbm5lY3Rpb24gZXZlbnQ6IFwiLCBpbmZvKTtcbiAgICAgIGxvZy5kZWJ1ZyhcIkNyZWF0aW5nIGNvbm5lY3Rpb24gZnJvbSBcIiwgaW5mby5zb3VyY2VJZCwgXCIgdG8gXCIsIGluZm8udGFyZ2V0SWQpO1xuICAgICAgdmFyIGxpbmsgPSBnZXRMaW5rKGluZm8pO1xuICAgICAgdmFyIHNvdXJjZSA9ICRzY29wZS5ub2Rlc1tsaW5rLnNvdXJjZV07XG4gICAgICB2YXIgc291cmNlRm9sZGVyID0gJHNjb3BlLmZvbGRlcnNbbGluay5zb3VyY2VdO1xuICAgICAgdmFyIHRhcmdldEZvbGRlciA9ICRzY29wZS5mb2xkZXJzW2xpbmsudGFyZ2V0XTtcbiAgICAgIGlmIChDYW1lbC5pc05leHRTaWJsaW5nQWRkZWRBc0NoaWxkKHNvdXJjZS50eXBlKSkge1xuICAgICAgICBzb3VyY2VGb2xkZXIubW92ZUNoaWxkKHRhcmdldEZvbGRlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzb3VyY2VGb2xkZXIucGFyZW50Lmluc2VydEFmdGVyKHRhcmdldEZvbGRlciwgc291cmNlRm9sZGVyKTtcbiAgICAgIH1cbiAgICAgIHRyZWVNb2RpZmllZCgpO1xuICAgIH0pO1xuXG4gICAgLy8gbGV0cyBkZWxldGUgY29ubmVjdGlvbnMgb24gY2xpY2tcbiAgICBqc1BsdW1iSW5zdGFuY2UuYmluZChcImNsaWNrXCIsIGZ1bmN0aW9uIChjKSB7XG4gICAgICBpZiAoanNQbHVtYkluc3RhbmNlLmlzU3VzcGVuZERyYXdpbmcoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBqc1BsdW1iSW5zdGFuY2UuZGV0YWNoKGMpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gbGF5b3V0R3JhcGgobm9kZXMsIGxpbmtzKSB7XG4gICAgICB2YXIgdHJhbnNpdGlvbnMgPSBbXTtcbiAgICAgIHZhciBzdGF0ZXMgPSBDb3JlLmNyZWF0ZUdyYXBoU3RhdGVzKG5vZGVzLCBsaW5rcywgdHJhbnNpdGlvbnMpO1xuXG4gICAgICBsb2cuZGVidWcoXCJsaW5rczogXCIsIGxpbmtzKTtcbiAgICAgIGxvZy5kZWJ1ZyhcInRyYW5zaXRpb25zOiBcIiwgdHJhbnNpdGlvbnMpO1xuXG4gICAgICAkc2NvcGUubm9kZVN0YXRlcyA9IHN0YXRlcztcbiAgICAgIHZhciBjb250YWluZXJFbGVtZW50ID0gZ2V0Q29udGFpbmVyRWxlbWVudCgpO1xuXG4gICAgICBqc1BsdW1iSW5zdGFuY2UuZG9XaGlsZVN1c3BlbmRlZCgoKSA9PiB7XG5cbiAgICAgICAgLy9zZXQgb3VyIGNvbnRhaW5lciB0byBzb21lIGFyYml0cmFyeSBpbml0aWFsIHNpemVcbiAgICAgICAgY29udGFpbmVyRWxlbWVudC5jc3Moe1xuICAgICAgICAgICd3aWR0aCc6ICc4MDBweCcsXG4gICAgICAgICAgJ2hlaWdodCc6ICc4MDBweCcsXG4gICAgICAgICAgJ21pbi1oZWlnaHQnOiAnODAwcHgnLFxuICAgICAgICAgICdtaW4td2lkdGgnOiAnODAwcHgnXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgY29udGFpbmVySGVpZ2h0ID0gMDtcbiAgICAgICAgdmFyIGNvbnRhaW5lcldpZHRoID0gMDtcblxuICAgICAgICBjb250YWluZXJFbGVtZW50LmZpbmQoJ2Rpdi5jb21wb25lbnQnKS5lYWNoKChpLCBlbCkgPT4ge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNoZWNraW5nOiBcIiwgZWwsIFwiIFwiLCBpKTtcbiAgICAgICAgICBpZiAoIXN0YXRlcy5hbnkoKG5vZGUpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWwuaWQgPT09IGdldE5vZGVJZChub2RlKTtcbiAgICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIlJlbW92aW5nIGVsZW1lbnQ6IFwiLCBlbC5pZCk7XG4gICAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UucmVtb3ZlKGVsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzdGF0ZXMsIChub2RlKSA9PiB7XG4gICAgICAgICAgbG9nLmRlYnVnKFwibm9kZTogXCIsIG5vZGUpO1xuICAgICAgICAgIHZhciBpZCA9IGdldE5vZGVJZChub2RlKTtcbiAgICAgICAgICB2YXIgZGl2ID0gY29udGFpbmVyRWxlbWVudC5maW5kKCcjJyArIGlkKTtcblxuICAgICAgICAgIGlmICghZGl2WzBdKSB7XG4gICAgICAgICAgICBkaXYgPSAkKCRzY29wZS5ub2RlVGVtcGxhdGUoe1xuICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgIG5vZGU6IG5vZGVcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIGRpdi5hcHBlbmRUbyhjb250YWluZXJFbGVtZW50KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBNYWtlIHRoZSBub2RlIGEganNwbHVtYiBzb3VyY2VcbiAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UubWFrZVNvdXJjZShkaXYsIHtcbiAgICAgICAgICAgIGZpbHRlcjogXCJpbWcubm9kZUljb25cIixcbiAgICAgICAgICAgIGFuY2hvcjogXCJDb250aW51b3VzXCIsXG4gICAgICAgICAgICBjb25uZWN0b3I6IGNvbm5lY3RvclN0eWxlLFxuICAgICAgICAgICAgY29ubmVjdG9yU3R5bGU6IHsgc3Ryb2tlU3R5bGU6IFwiIzY2NlwiLCBsaW5lV2lkdGg6IDMgfSxcbiAgICAgICAgICAgIG1heENvbm5lY3Rpb25zOiAtMVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gYW5kIGFsc28gYSBqc3BsdW1iIHRhcmdldFxuICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5tYWtlVGFyZ2V0KGRpdiwge1xuICAgICAgICAgICAgZHJvcE9wdGlvbnM6IHsgaG92ZXJDbGFzczogXCJkcmFnSG92ZXJcIiB9LFxuICAgICAgICAgICAgYW5jaG9yOiBcIkNvbnRpbnVvdXNcIlxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAganNQbHVtYkluc3RhbmNlLmRyYWdnYWJsZShkaXYsIHtcbiAgICAgICAgICAgIGNvbnRhaW5tZW50OiAnLmNhbWVsLWNhbnZhcydcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIGFkZCBldmVudCBoYW5kbGVycyB0byB0aGlzIG5vZGVcbiAgICAgICAgICBkaXYuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG5ld0ZsYWcgPSAhZGl2Lmhhc0NsYXNzKFwic2VsZWN0ZWRcIik7XG4gICAgICAgICAgICBjb250YWluZXJFbGVtZW50LmZpbmQoJ2Rpdi5jb21wb25lbnQnKS50b2dnbGVDbGFzcyhcInNlbGVjdGVkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIGRpdi50b2dnbGVDbGFzcyhcInNlbGVjdGVkXCIsIG5ld0ZsYWcpO1xuICAgICAgICAgICAgdmFyIGlkID0gZGl2LmF0dHIoXCJpZFwiKTtcbiAgICAgICAgICAgIHVwZGF0ZVNlbGVjdGlvbihuZXdGbGFnID8gaWQgOiBudWxsKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBkaXYuZGJsY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGlkID0gZGl2LmF0dHIoXCJpZFwiKTtcbiAgICAgICAgICAgIHVwZGF0ZVNlbGVjdGlvbihpZCk7XG4gICAgICAgICAgICAvLyRzY29wZS5wcm9wZXJ0aWVzRGlhbG9nLm9wZW4oKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgaGVpZ2h0ID0gZGl2LmhlaWdodCgpO1xuICAgICAgICAgIHZhciB3aWR0aCA9IGRpdi53aWR0aCgpO1xuICAgICAgICAgIGlmIChoZWlnaHQgfHwgd2lkdGgpIHtcbiAgICAgICAgICAgIG5vZGUud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIG5vZGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAgICAgZGl2LmNzcyh7XG4gICAgICAgICAgICAgICdtaW4td2lkdGgnOiB3aWR0aCxcbiAgICAgICAgICAgICAgJ21pbi1oZWlnaHQnOiBoZWlnaHRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGVkZ2VTZXAgPSAxMDtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIGxheW91dCBhbmQgZ2V0IHRoZSBidWlsZEdyYXBoXG4gICAgICAgIGRhZ3JlLmxheW91dCgpXG4gICAgICAgICAgICAubm9kZVNlcCgxMDApXG4gICAgICAgICAgICAuZWRnZVNlcChlZGdlU2VwKVxuICAgICAgICAgICAgLnJhbmtTZXAoNzUpXG4gICAgICAgICAgICAubm9kZXMoc3RhdGVzKVxuICAgICAgICAgICAgLmVkZ2VzKHRyYW5zaXRpb25zKVxuICAgICAgICAgICAgLmRlYnVnTGV2ZWwoMSlcbiAgICAgICAgICAgIC5ydW4oKTtcblxuICAgICAgICBhbmd1bGFyLmZvckVhY2goc3RhdGVzLCAobm9kZSkgPT4ge1xuXG4gICAgICAgICAgLy8gcG9zaXRpb24gdGhlIG5vZGUgaW4gdGhlIGdyYXBoXG4gICAgICAgICAgdmFyIGlkID0gZ2V0Tm9kZUlkKG5vZGUpO1xuICAgICAgICAgIHZhciBkaXYgPSAkKFwiI1wiICsgaWQpO1xuICAgICAgICAgIHZhciBkaXZIZWlnaHQgPSBkaXYuaGVpZ2h0KCk7XG4gICAgICAgICAgdmFyIGRpdldpZHRoID0gZGl2LndpZHRoKCk7XG4gICAgICAgICAgdmFyIGxlZnRPZmZzZXQgPSBub2RlLmRhZ3JlLnggKyBkaXZXaWR0aDtcbiAgICAgICAgICB2YXIgYm90dG9tT2Zmc2V0ID0gbm9kZS5kYWdyZS55ICsgZGl2SGVpZ2h0O1xuICAgICAgICAgIGlmIChjb250YWluZXJIZWlnaHQgPCBib3R0b21PZmZzZXQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9IGJvdHRvbU9mZnNldCArIGVkZ2VTZXAgKiAyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY29udGFpbmVyV2lkdGggPCBsZWZ0T2Zmc2V0KSB7XG4gICAgICAgICAgICBjb250YWluZXJXaWR0aCA9IGxlZnRPZmZzZXQgKyBlZGdlU2VwICogMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGl2LmNzcyh7dG9wOiBub2RlLmRhZ3JlLnksIGxlZnQ6IG5vZGUuZGFncmUueH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBzaXplIHRoZSBjb250YWluZXIgdG8gZml0IHRoZSBncmFwaFxuICAgICAgICBjb250YWluZXJFbGVtZW50LmNzcyh7XG4gICAgICAgICAgJ3dpZHRoJzogY29udGFpbmVyV2lkdGgsXG4gICAgICAgICAgJ2hlaWdodCc6IGNvbnRhaW5lckhlaWdodCxcbiAgICAgICAgICAnbWluLWhlaWdodCc6IGNvbnRhaW5lckhlaWdodCxcbiAgICAgICAgICAnbWluLXdpZHRoJzogY29udGFpbmVyV2lkdGhcbiAgICAgICAgfSk7XG5cblxuICAgICAgICBjb250YWluZXJFbGVtZW50LmRibGNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAkc2NvcGUucHJvcGVydGllc0RpYWxvZy5vcGVuKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGpzUGx1bWJJbnN0YW5jZS5zZXRTdXNwZW5kRXZlbnRzKHRydWUpO1xuICAgICAgICAvLyBEZXRhY2ggYWxsIHRoZSBjdXJyZW50IGNvbm5lY3Rpb25zIGFuZCByZWNvbm5lY3QgZXZlcnl0aGluZyBiYXNlZCBvbiB0aGUgdXBkYXRlZCBncmFwaFxuICAgICAgICBqc1BsdW1iSW5zdGFuY2UuZGV0YWNoRXZlcnlDb25uZWN0aW9uKHtmaXJlRXZlbnQ6IGZhbHNlfSk7XG5cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGxpbmtzLCAobGluaykgPT4ge1xuICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5jb25uZWN0KHtcbiAgICAgICAgICAgIHNvdXJjZTogZ2V0Tm9kZUlkKGxpbmsuc291cmNlKSxcbiAgICAgICAgICAgIHRhcmdldDogZ2V0Tm9kZUlkKGxpbmsudGFyZ2V0KVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAganNQbHVtYkluc3RhbmNlLnNldFN1c3BlbmRFdmVudHMoZmFsc2UpO1xuXG4gICAgICB9KTtcblxuXG4gICAgICByZXR1cm4gc3RhdGVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldExpbmsoaW5mbykge1xuICAgICAgdmFyIHNvdXJjZUlkID0gaW5mby5zb3VyY2VJZDtcbiAgICAgIHZhciB0YXJnZXRJZCA9IGluZm8udGFyZ2V0SWQ7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzb3VyY2U6IHNvdXJjZUlkLFxuICAgICAgICB0YXJnZXQ6IHRhcmdldElkXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Tm9kZUJ5Q0lEKG5vZGVzLCBjaWQpIHtcbiAgICAgIHJldHVybiBub2Rlcy5maW5kKChub2RlKSA9PiB7XG4gICAgICAgIHJldHVybiBub2RlLmNpZCA9PT0gY2lkO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBVcGRhdGVzIHRoZSBzZWxlY3Rpb24gd2l0aCB0aGUgZ2l2ZW4gZm9sZGVyIG9yIElEXG4gICAgICovXG4gICAgZnVuY3Rpb24gdXBkYXRlU2VsZWN0aW9uKGZvbGRlck9ySWQpIHtcbiAgICAgIHZhciBmb2xkZXIgPSBudWxsO1xuICAgICAgaWYgKGFuZ3VsYXIuaXNTdHJpbmcoZm9sZGVyT3JJZCkpIHtcbiAgICAgICAgdmFyIGlkID0gZm9sZGVyT3JJZDtcbiAgICAgICAgZm9sZGVyID0gKGlkICYmICRzY29wZS5mb2xkZXJzKSA/ICRzY29wZS5mb2xkZXJzW2lkXSA6IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb2xkZXIgPSBmb2xkZXJPcklkO1xuICAgICAgfVxuICAgICAgJHNjb3BlLnNlbGVjdGVkRm9sZGVyID0gZm9sZGVyO1xuICAgICAgZm9sZGVyID0gZ2V0U2VsZWN0ZWRPclJvdXRlRm9sZGVyKCk7XG4gICAgICAkc2NvcGUubm9kZVhtbE5vZGUgPSBudWxsO1xuICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IG51bGw7XG4gICAgICBpZiAoZm9sZGVyKSB7XG4gICAgICAgIHZhciBub2RlTmFtZSA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKGZvbGRlcik7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YSA9IENhbWVsLmdldFJvdXRlRm9sZGVySlNPTihmb2xkZXIpO1xuICAgICAgICAkc2NvcGUubm9kZURhdGFDaGFuZ2VkRmllbGRzID0ge307XG4gICAgICAgICRzY29wZS5ub2RlTW9kZWwgPSBDYW1lbC5nZXRDYW1lbFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgIGlmICgkc2NvcGUubm9kZU1vZGVsKSB7XG4gICAgICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IFwicGx1Z2lucy93aWtpL2h0bWwvY2FtZWxQcm9wZXJ0aWVzRWRpdC5odG1sXCI7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRW5kcG9pbnQgPSBudWxsO1xuICAgICAgICBpZiAoXCJlbmRwb2ludFwiID09PSBub2RlTmFtZSkge1xuICAgICAgICAgIHZhciB1cmkgPSAkc2NvcGUubm9kZURhdGFbXCJ1cmlcIl07XG4gICAgICAgICAgaWYgKHVyaSkge1xuICAgICAgICAgICAgLy8gbGV0cyBkZWNvbXBvc2UgdGhlIFVSSSBpbnRvIHNjaGVtZSwgcGF0aCBhbmQgcGFyYW1ldGVyc1xuICAgICAgICAgICAgdmFyIGlkeCA9IHVyaS5pbmRleE9mKFwiOlwiKTtcbiAgICAgICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgICAgIHZhciBlbmRwb2ludFNjaGVtZSA9IHVyaS5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgICAgICAgdmFyIGVuZHBvaW50UGF0aCA9IHVyaS5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICAgICAgICAgIC8vIGZvciBlbXB0eSBwYXRocyBsZXRzIGFzc3VtZSB3ZSBuZWVkIC8vIG9uIGEgVVJJXG4gICAgICAgICAgICAgICRzY29wZS5lbmRwb2ludFBhdGhIYXNTbGFzaGVzID0gZW5kcG9pbnRQYXRoID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICAgICAgICBpZiAoZW5kcG9pbnRQYXRoLnN0YXJ0c1dpdGgoXCIvL1wiKSkge1xuICAgICAgICAgICAgICAgIGVuZHBvaW50UGF0aCA9IGVuZHBvaW50UGF0aC5zdWJzdHJpbmcoMik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGF0aEhhc1NsYXNoZXMgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlkeCA9IGVuZHBvaW50UGF0aC5pbmRleE9mKFwiP1wiKTtcbiAgICAgICAgICAgICAgdmFyIGVuZHBvaW50UGFyYW1ldGVycyA9IHt9O1xuICAgICAgICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbWV0ZXJzID0gZW5kcG9pbnRQYXRoLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgICAgICAgICAgICBlbmRwb2ludFBhdGggPSBlbmRwb2ludFBhdGguc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgICAgICAgICAgZW5kcG9pbnRQYXJhbWV0ZXJzID0gQ29yZS5zdHJpbmdUb0hhc2gocGFyYW1ldGVycyk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAkc2NvcGUuZW5kcG9pbnRTY2hlbWUgPSBlbmRwb2ludFNjaGVtZTtcbiAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGF0aCA9IGVuZHBvaW50UGF0aDtcbiAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGFyYW1ldGVycyA9IGVuZHBvaW50UGFyYW1ldGVycztcblxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImVuZHBvaW50IFwiICsgZW5kcG9pbnRTY2hlbWUgKyBcIiBwYXRoIFwiICsgZW5kcG9pbnRQYXRoICsgXCIgYW5kIHBhcmFtZXRlcnMgXCIgKyBKU09OLnN0cmluZ2lmeShlbmRwb2ludFBhcmFtZXRlcnMpKTtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvYWRFbmRwb2ludFNjaGVtYShlbmRwb2ludFNjaGVtZSk7XG4gICAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZEVuZHBvaW50ID0ge1xuICAgICAgICAgICAgICAgIGVuZHBvaW50U2NoZW1lOiBlbmRwb2ludFNjaGVtZSxcbiAgICAgICAgICAgICAgICBlbmRwb2ludFBhdGg6IGVuZHBvaW50UGF0aCxcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzOiBlbmRwb2ludFBhcmFtZXRlcnNcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRXaWR0aCgpIHtcbiAgICAgIHZhciBjYW52YXNEaXYgPSAkKCRlbGVtZW50KTtcbiAgICAgIHJldHVybiBjYW52YXNEaXYud2lkdGgoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRGb2xkZXJJZEF0dHJpYnV0ZShyb3V0ZSkge1xuICAgICAgdmFyIGlkID0gbnVsbDtcbiAgICAgIGlmIChyb3V0ZSkge1xuICAgICAgICB2YXIgeG1sTm9kZSA9IHJvdXRlW1wicm91dGVYbWxOb2RlXCJdO1xuICAgICAgICBpZiAoeG1sTm9kZSkge1xuICAgICAgICAgIGlkID0geG1sTm9kZS5nZXRBdHRyaWJ1dGUoXCJpZFwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGlkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFJvdXRlRm9sZGVyKHRyZWUsIHJvdXRlSWQpIHtcbiAgICAgIHZhciBhbnN3ZXIgPSBudWxsO1xuICAgICAgaWYgKHRyZWUpIHtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRyZWUuY2hpbGRyZW4sIChyb3V0ZSkgPT4ge1xuICAgICAgICAgIGlmICghYW5zd2VyKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSBnZXRGb2xkZXJJZEF0dHJpYnV0ZShyb3V0ZSk7XG4gICAgICAgICAgICBpZiAocm91dGVJZCA9PT0gaWQpIHtcbiAgICAgICAgICAgICAgYW5zd2VyID0gcm91dGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgfVxuXG4gICAgJHNjb3BlLmRvU3dpdGNoVG9UcmVlVmlldyA9ICgpID0+IHtcbiAgICAgICRsb2NhdGlvbi51cmwoQ29yZS50cmltTGVhZGluZygoJHNjb3BlLnN0YXJ0TGluayArIFwiL2NhbWVsL3Byb3BlcnRpZXMvXCIgKyAkc2NvcGUucGFnZUlkKSwgJyMnKSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jb25maXJtU3dpdGNoVG9UcmVlVmlldyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQpIHtcbiAgICAgICAgJHNjb3BlLnN3aXRjaFRvVHJlZVZpZXcub3BlbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmRvU3dpdGNoVG9UcmVlVmlldygpO1xuICAgICAgfVxuICAgIH07XG5cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkNvbW1pdENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCJtYXJrZWRcIiwgXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgbWFya2VkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcbiAgICB2YXIgam9sb2tpYSA9IG51bGw7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuY29tbWl0SWQgPSAkc2NvcGUub2JqZWN0SWQ7XG4gICAgJHNjb3BlLnNlbGVjdGVkSXRlbXMgPSBbXTtcblxuICAgIC8vIFRPRE8gd2UgY291bGQgY29uZmlndXJlIHRoaXM/XG4gICAgJHNjb3BlLmRhdGVGb3JtYXQgPSAnRUVFLCBNTU0gZCwgeSA6IGhoOm1tOnNzIGEnO1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgZGF0YTogJ2NvbW1pdHMnLFxuICAgICAgc2hvd0ZpbHRlcjogZmFsc2UsXG4gICAgICBtdWx0aVNlbGVjdDogZmFsc2UsXG4gICAgICBzZWxlY3RXaXRoQ2hlY2tib3hPbmx5OiB0cnVlLFxuICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgZGlzcGxheVNlbGVjdGlvbkNoZWNrYm94IDogdHJ1ZSwgLy8gb2xkIHByZSAyLjAgY29uZmlnIVxuICAgICAgc2VsZWN0ZWRJdGVtczogJHNjb3BlLnNlbGVjdGVkSXRlbXMsXG4gICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgIGZpbHRlclRleHQ6ICcnXG4gICAgICB9LFxuICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdwYXRoJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ0ZpbGUgTmFtZScsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ2ZpbGVDZWxsVGVtcGxhdGUuaHRtbCcpLFxuICAgICAgICAgIHdpZHRoOiBcIioqKlwiLFxuICAgICAgICAgIGNlbGxGaWx0ZXI6IFwiXCJcbiAgICAgICAgfSxcbiAgICAgIF1cbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnd29ya3NwYWNlLnRyZWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISRzY29wZS5naXQpIHtcbiAgICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIlJlbG9hZGluZyB0aGUgdmlldyBhcyB3ZSBub3cgc2VlbSB0byBoYXZlIGEgZ2l0IG1iZWFuIVwiKTtcbiAgICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgICRzY29wZS5jYW5SZXZlcnQgPSAoKSA9PiB7XG4gICAgICByZXR1cm4gJHNjb3BlLnNlbGVjdGVkSXRlbXMubGVuZ3RoID09PSAxO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIHBhdGggPSBjb21taXRQYXRoKCRzY29wZS5zZWxlY3RlZEl0ZW1zWzBdKTtcbiAgICAgICAgdmFyIG9iamVjdElkID0gJHNjb3BlLmNvbW1pdElkO1xuICAgICAgICBpZiAocGF0aCAmJiBvYmplY3RJZCkge1xuICAgICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gXCJSZXZlcnRpbmcgZmlsZSBcIiArICRzY29wZS5wYWdlSWQgKyBcIiB0byBwcmV2aW91cyB2ZXJzaW9uIFwiICsgb2JqZWN0SWQ7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8oJHNjb3BlLmJyYW5jaCwgb2JqZWN0SWQsICRzY29wZS5wYWdlSWQsIGNvbW1pdE1lc3NhZ2UsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShyZXN1bHQpO1xuICAgICAgICAgICAgLy8gbm93IGxldHMgdXBkYXRlIHRoZSB2aWV3XG4gICAgICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY29tbWl0UGF0aChjb21taXQpIHtcbiAgICAgIHJldHVybiBjb21taXQucGF0aCB8fCBjb21taXQubmFtZTtcbiAgICB9XG5cbiAgICAkc2NvcGUuZGlmZiA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBjb21taXQgPSAkc2NvcGUuc2VsZWN0ZWRJdGVtc1swXTtcbiAgICAgICAgLypcbiAgICAgICAgIHZhciBjb21taXQgPSByb3c7XG4gICAgICAgICB2YXIgZW50aXR5ID0gcm93LmVudGl0eTtcbiAgICAgICAgIGlmIChlbnRpdHkpIHtcbiAgICAgICAgIGNvbW1pdCA9IGVudGl0eTtcbiAgICAgICAgIH1cbiAgICAgICAgICovXG4gICAgICAgIHZhciBsaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9kaWZmL1wiICsgY29tbWl0UGF0aChjb21taXQpICsgXCIvXCIgKyAkc2NvcGUuY29tbWl0SWQgKyBcIi9cIjtcbiAgICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiI1wiKTtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgocGF0aCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICB2YXIgY29tbWl0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG5cbiAgICAgIFdpa2kubG9hZEJyYW5jaGVzKGpvbG9raWEsIHdpa2lSZXBvc2l0b3J5LCAkc2NvcGUsIGlzRm1jKTtcblxuICAgICAgd2lraVJlcG9zaXRvcnkuY29tbWl0SW5mbyhjb21taXRJZCwgKGNvbW1pdEluZm8pID0+IHtcbiAgICAgICAgJHNjb3BlLmNvbW1pdEluZm8gPSBjb21taXRJbmZvO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG5cbiAgICAgIHdpa2lSZXBvc2l0b3J5LmNvbW1pdFRyZWUoY29tbWl0SWQsIChjb21taXRzKSA9PiB7XG4gICAgICAgICRzY29wZS5jb21taXRzID0gY29tbWl0cztcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbW1pdHMsIChjb21taXQpID0+IHtcbiAgICAgICAgICBjb21taXQuZmlsZUljb25IdG1sID0gV2lraS5maWxlSWNvbkh0bWwoY29tbWl0KTtcbiAgICAgICAgICBjb21taXQuZmlsZUNsYXNzID0gY29tbWl0Lm5hbWUuZW5kc1dpdGgoXCIucHJvZmlsZVwiKSA/IFwiZ3JlZW5cIiA6IFwiXCI7XG4gICAgICAgICAgdmFyIGNoYW5nZVR5cGUgPSBjb21taXQuY2hhbmdlVHlwZTtcbiAgICAgICAgICB2YXIgcGF0aCA9IGNvbW1pdFBhdGgoY29tbWl0KTtcbiAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgY29tbWl0LmZpbGVMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyAnL3ZlcnNpb24vJyArIHBhdGggKyAnLycgKyBjb21taXRJZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNoYW5nZVR5cGUpIHtcbiAgICAgICAgICAgIGNoYW5nZVR5cGUgPSBjaGFuZ2VUeXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBpZiAoY2hhbmdlVHlwZS5zdGFydHNXaXRoKFwiYVwiKSkge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1hZGRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwiYWRkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwiYWRkZWRcIjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhbmdlVHlwZS5zdGFydHNXaXRoKFwiZFwiKSkge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1kZWxldGVcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwiZGVsZXRlXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwiZGVsZXRlZFwiO1xuICAgICAgICAgICAgICBjb21taXQuZmlsZUxpbmsgPSBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtbW9kaWZ5XCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcIm1vZGlmeVwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcIm1vZGlmaWVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21taXQuY2hhbmdlVHlwZUh0bWwgPSAnPHNwYW4gY2xhc3M9XCInICsgY29tbWl0LmNoYW5nZUNsYXNzICsgJ1wiPicgKyBjb21taXQudGl0bGUgKyAnPC9zcGFuPic7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBXaWtpIHtcblxuICB2YXIgQ3JlYXRlQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJDcmVhdGVDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRyb3V0ZVwiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgKCRzY29wZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtczpuZy5yb3V0ZS5JUm91dGVQYXJhbXNTZXJ2aWNlLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJGh0dHA6bmcuSUh0dHBTZXJ2aWNlLCAkdGltZW91dDpuZy5JVGltZW91dFNlcnZpY2UpID0+IHtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuXG4gICAgLy8gVE9ETyByZW1vdmVcbiAgICB2YXIgd29ya3NwYWNlID0gbnVsbDtcblxuICAgICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWUgPSBXaWtpLmNyZWF0ZVdpemFyZFRyZWUod29ya3NwYWNlLCAkc2NvcGUpO1xuICAgICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWVDaGlsZHJlbiA9ICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWUuY2hpbGRyZW47XG4gICAgJHNjb3BlLmNyZWF0ZURvY3VtZW50VHJlZUFjdGl2YXRpb25zID0gW1wiY2FtZWwtc3ByaW5nLnhtbFwiLCBcIlJlYWRNZS5tZFwiXTtcblxuICAgICRzY29wZS50cmVlT3B0aW9ucyA9IHtcbiAgICAgICAgbm9kZUNoaWxkcmVuOiBcImNoaWxkcmVuXCIsXG4gICAgICAgIGRpclNlbGVjdGFibGU6IHRydWUsXG4gICAgICAgIGluamVjdENsYXNzZXM6IHtcbiAgICAgICAgICAgIHVsOiBcImExXCIsXG4gICAgICAgICAgICBsaTogXCJhMlwiLFxuICAgICAgICAgICAgbGlTZWxlY3RlZDogXCJhN1wiLFxuICAgICAgICAgICAgaUV4cGFuZGVkOiBcImEzXCIsXG4gICAgICAgICAgICBpQ29sbGFwc2VkOiBcImE0XCIsXG4gICAgICAgICAgICBpTGVhZjogXCJhNVwiLFxuICAgICAgICAgICAgbGFiZWw6IFwiYTZcIixcbiAgICAgICAgICAgIGxhYmVsU2VsZWN0ZWQ6IFwiYThcIlxuICAgICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlRXhpc3RzID0ge1xuICAgICAgZXhpc3RzOiBmYWxzZSxcbiAgICAgIG5hbWU6IFwiXCJcbiAgICB9O1xuICAgICRzY29wZS5uZXdEb2N1bWVudE5hbWUgPSBcIlwiO1xuICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50RXh0ZW5zaW9uID0gbnVsbDtcbiAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSBmYWxzZTtcbiAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gXCJcIjtcbiAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gXCJcIjtcblxuICAgIGZ1bmN0aW9uIHJldHVyblRvRGlyZWN0b3J5KCkge1xuICAgICAgdmFyIGxpbmsgPSBXaWtpLnZpZXdMaW5rKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uKVxuICAgICAgbG9nLmRlYnVnKFwiQ2FuY2VsbGluZywgZ29pbmcgdG8gbGluazogXCIsIGxpbmspO1xuICAgICAgV2lraS5nb1RvTGluayhsaW5rLCAkdGltZW91dCwgJGxvY2F0aW9uKTtcbiAgICB9XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgcmV0dXJuVG9EaXJlY3RvcnkoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uQ3JlYXRlRG9jdW1lbnRTZWxlY3QgPSAobm9kZSkgPT4ge1xuICAgICAgLy8gcmVzZXQgYXMgd2Ugc3dpdGNoIGJldHdlZW4gZG9jdW1lbnQgdHlwZXNcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGZhbHNlO1xuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IFwiXCI7XG4gICAgICB2YXIgZW50aXR5ID0gbm9kZSA/IG5vZGUuZW50aXR5IDogbnVsbDtcbiAgICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUgPSBlbnRpdHk7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlUmVnZXggPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlLnJlZ2V4IHx8IC8uKi87XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlSW52YWxpZCA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUuaW52YWxpZCB8fCBcImludmFsaWQgbmFtZVwiO1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbiA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUuZXh0ZW5zaW9uIHx8IG51bGw7XG4gICAgICBsb2cuZGVidWcoXCJFbnRpdHk6IFwiLCBlbnRpdHkpO1xuICAgICAgaWYgKGVudGl0eSkge1xuICAgICAgICBpZiAoZW50aXR5LmdlbmVyYXRlZCkge1xuICAgICAgICAgICRzY29wZS5mb3JtU2NoZW1hID0gZW50aXR5LmdlbmVyYXRlZC5zY2hlbWE7XG4gICAgICAgICAgJHNjb3BlLmZvcm1EYXRhID0gZW50aXR5LmdlbmVyYXRlZC5mb3JtKHdvcmtzcGFjZSwgJHNjb3BlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybVNjaGVtYSA9IHt9O1xuICAgICAgICAgICRzY29wZS5mb3JtRGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9XG5cbiAgICB9O1xuXG4gICAgJHNjb3BlLmFkZEFuZENsb3NlRGlhbG9nID0gKGZpbGVOYW1lOnN0cmluZykgPT4ge1xuICAgICAgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSA9IGZpbGVOYW1lO1xuICAgICAgdmFyIHRlbXBsYXRlID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZTtcbiAgICAgIHZhciBwYXRoID0gZ2V0TmV3RG9jdW1lbnRQYXRoKCk7XG5cbiAgICAgIC8vIGNsZWFyICRzY29wZS5uZXdEb2N1bWVudE5hbWUgc28gd2UgZG9udCByZW1lbWJlciBpdCB3aGVuIHdlIG9wZW4gaXQgbmV4dCB0aW1lXG4gICAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gbnVsbDtcblxuICAgICAgLy8gcmVzZXQgYmVmb3JlIHdlIGNoZWNrIGp1c3QgaW4gYSBiaXRcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGZhbHNlO1xuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IFwiXCI7XG4gICAgICAkc2NvcGUuZmlsZUV4dGVuc2lvbkludmFsaWQgPSBudWxsO1xuXG4gICAgICBpZiAoIXRlbXBsYXRlIHx8ICFwYXRoKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGUgaWYgdGhlIG5hbWUgbWF0Y2ggdGhlIGV4dGVuc2lvblxuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVFeHRlbnNpb24pIHtcbiAgICAgICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoJy4nKTtcbiAgICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgICB2YXIgZXh0ID0gcGF0aC5zdWJzdHJpbmcoaWR4KTtcbiAgICAgICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbiAhPT0gZXh0KSB7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4dGVuc2lvbkludmFsaWQgPSBcIkZpbGUgZXh0ZW5zaW9uIG11c3QgYmU6IFwiICsgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbjtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkYXRlIGlmIHRoZSBmaWxlIGV4aXN0cywgYW5kIHVzZSB0aGUgc3luY2hyb25vdXMgY2FsbFxuICAgICAgd2lraVJlcG9zaXRvcnkuZXhpc3RzKCRzY29wZS5icmFuY2gsIHBhdGgsIChleGlzdHMpID0+IHtcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gZXhpc3RzO1xuICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gZXhpc3RzID8gcGF0aCA6IGZhbHNlO1xuICAgICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICAgIGRvQ3JlYXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiBkb0NyZWF0ZSgpIHtcbiAgICAgICAgdmFyIG5hbWUgPSBXaWtpLmZpbGVOYW1lKHBhdGgpO1xuICAgICAgICB2YXIgZm9sZGVyID0gV2lraS5maWxlUGFyZW50KHBhdGgpO1xuICAgICAgICB2YXIgZXhlbXBsYXIgPSB0ZW1wbGF0ZS5leGVtcGxhcjtcblxuICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9IFwiQ3JlYXRlZCBcIiArIHRlbXBsYXRlLmxhYmVsO1xuICAgICAgICB2YXIgZXhlbXBsYXJVcmkgPSBDb3JlLnVybChcIi9wbHVnaW5zL3dpa2kvZXhlbXBsYXIvXCIgKyBleGVtcGxhcik7XG5cbiAgICAgICAgaWYgKHRlbXBsYXRlLmZvbGRlcikge1xuICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIkNyZWF0aW5nIG5ldyBmb2xkZXIgXCIgKyBuYW1lKTtcblxuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmNyZWF0ZURpcmVjdG9yeSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICB2YXIgbGluayA9IFdpa2kudmlld0xpbmsoJHNjb3BlLCBwYXRoLCAkbG9jYXRpb24pO1xuICAgICAgICAgICAgZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGUucHJvZmlsZSkge1xuXG4gICAgICAgICAgZnVuY3Rpb24gdG9QYXRoKHByb2ZpbGVOYW1lOnN0cmluZykge1xuICAgICAgICAgICAgdmFyIGFuc3dlciA9IFwiZmFicmljL3Byb2ZpbGVzL1wiICsgcHJvZmlsZU5hbWU7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIucmVwbGFjZSgvLS9nLCBcIi9cIik7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIgKyBcIi5wcm9maWxlXCI7XG4gICAgICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmN0aW9uIHRvUHJvZmlsZU5hbWUocGF0aDpzdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBhbnN3ZXIgPSBwYXRoLnJlcGxhY2UoL15mYWJyaWNcXC9wcm9maWxlc1xcLy8sIFwiXCIpO1xuICAgICAgICAgICAgYW5zd2VyID0gYW5zd2VyLnJlcGxhY2UoL1xcLy9nLCBcIi1cIik7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIucmVwbGFjZSgvXFwucHJvZmlsZSQvLCBcIlwiKTtcbiAgICAgICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gc3RyaXAgb2ZmIGFueSBwcm9maWxlIG5hbWUgaW4gY2FzZSB0aGUgdXNlciBjcmVhdGVzIGEgcHJvZmlsZSB3aGlsZSBsb29raW5nIGF0XG4gICAgICAgICAgLy8gYW5vdGhlciBwcm9maWxlXG4gICAgICAgICAgZm9sZGVyID0gZm9sZGVyLnJlcGxhY2UoL1xcLz0/KFxcdyopXFwucHJvZmlsZSQvLCBcIlwiKTtcblxuICAgICAgICAgIHZhciBjb25jYXRlbmF0ZWQgPSBmb2xkZXIgKyBcIi9cIiArIG5hbWU7XG5cbiAgICAgICAgICB2YXIgcHJvZmlsZU5hbWUgPSB0b1Byb2ZpbGVOYW1lKGNvbmNhdGVuYXRlZCk7XG4gICAgICAgICAgdmFyIHRhcmdldFBhdGggPSB0b1BhdGgocHJvZmlsZU5hbWUpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGUuZ2VuZXJhdGVkKSB7XG4gICAgICAgICAgdmFyIG9wdGlvbnM6V2lraS5HZW5lcmF0ZU9wdGlvbnMgPSB7XG4gICAgICAgICAgICB3b3Jrc3BhY2U6IHdvcmtzcGFjZSxcbiAgICAgICAgICAgIGZvcm06ICRzY29wZS5mb3JtRGF0YSxcbiAgICAgICAgICAgIG5hbWU6IGZpbGVOYW1lLFxuICAgICAgICAgICAgcGFyZW50SWQ6IGZvbGRlcixcbiAgICAgICAgICAgIGJyYW5jaDogJHNjb3BlLmJyYW5jaCxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IChjb250ZW50cyk9PiB7XG4gICAgICAgICAgICAgIGlmIChjb250ZW50cykge1xuICAgICAgICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNyZWF0ZWQgZmlsZSBcIiArIG5hbWUpO1xuICAgICAgICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm5Ub0RpcmVjdG9yeSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVyblRvRGlyZWN0b3J5KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogKGVycm9yKT0+IHtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oJ2Vycm9yJywgZXJyb3IpO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgICAgdGVtcGxhdGUuZ2VuZXJhdGVkLmdlbmVyYXRlKG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGxvYWQgdGhlIGV4YW1wbGUgZGF0YSAoaWYgYW55KSBhbmQgdGhlbiBhZGQgdGhlIGRvY3VtZW50IHRvIGdpdCBhbmQgY2hhbmdlIHRoZSBsaW5rIHRvIHRoZSBuZXcgZG9jdW1lbnRcbiAgICAgICAgICAkaHR0cC5nZXQoZXhlbXBsYXJVcmkpXG4gICAgICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgcHV0UGFnZShwYXRoLCBuYW1lLCBmb2xkZXIsIGRhdGEsIGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5lcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuIGVtcHR5IGZpbGVcbiAgICAgICAgICAgICAgcHV0UGFnZShwYXRoLCBuYW1lLCBmb2xkZXIsIFwiXCIsIGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gcHV0UGFnZShwYXRoLCBuYW1lLCBmb2xkZXIsIGNvbnRlbnRzLCBjb21taXRNZXNzYWdlKSB7XG4gICAgICAvLyBUT0RPIGxldHMgY2hlY2sgdGhpcyBwYWdlIGRvZXMgbm90IGV4aXN0IC0gaWYgaXQgZG9lcyBsZXRzIGtlZXAgYWRkaW5nIGEgbmV3IHBvc3QgZml4Li4uXG4gICAgICB3aWtpUmVwb3NpdG9yeS5wdXRQYWdlKCRzY29wZS5icmFuY2gsIHBhdGgsIGNvbnRlbnRzLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIkNyZWF0ZWQgZmlsZSBcIiArIG5hbWUpO1xuICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcblxuICAgICAgICAvLyBsZXRzIG5hdmlnYXRlIHRvIHRoZSBlZGl0IGxpbmtcbiAgICAgICAgLy8gbG9hZCB0aGUgZGlyZWN0b3J5IGFuZCBmaW5kIHRoZSBjaGlsZCBpdGVtXG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvbGRlciwgJHNjb3BlLm9iamVjdElkLCAoZGV0YWlscykgPT4ge1xuICAgICAgICAgIC8vIGxldHMgZmluZCB0aGUgY2hpbGQgZW50cnkgc28gd2UgY2FuIGNhbGN1bGF0ZSBpdHMgY29ycmVjdCBlZGl0IGxpbmtcbiAgICAgICAgICB2YXIgbGluazpzdHJpbmcgPSBudWxsO1xuICAgICAgICAgIGlmIChkZXRhaWxzICYmIGRldGFpbHMuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcInNjYW5uZWQgdGhlIGRpcmVjdG9yeSBcIiArIGRldGFpbHMuY2hpbGRyZW4ubGVuZ3RoICsgXCIgY2hpbGRyZW5cIik7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbmQoYyA9PiBjLm5hbWUgPT09IGZpbGVOYW1lKTtcbiAgICAgICAgICAgIGlmIChjaGlsZCkge1xuICAgICAgICAgICAgICBsaW5rID0gJHNjb3BlLmNoaWxkTGluayhjaGlsZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2cuZGVidWcoXCJDb3VsZCBub3QgZmluZCBuYW1lICdcIiArIGZpbGVOYW1lICsgXCInIGluIHRoZSBsaXN0IG9mIGZpbGUgbmFtZXMgXCIgKyBKU09OLnN0cmluZ2lmeShkZXRhaWxzLmNoaWxkcmVuLm1hcChjID0+IGMubmFtZSkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFsaW5rKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJXQVJOSU5HOiBjb3VsZCBub3QgZmluZCB0aGUgY2hpbGRMaW5rIHNvIHJldmVydGluZyB0byB0aGUgd2lraSBlZGl0IHBhZ2UhXCIpO1xuICAgICAgICAgICAgbGluayA9IFdpa2kuZWRpdExpbmsoJHNjb3BlLCBwYXRoLCAkbG9jYXRpb24pO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvL0NvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROZXdEb2N1bWVudFBhdGgoKSB7XG4gICAgICB2YXIgdGVtcGxhdGUgPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlO1xuICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICBsb2cuZGVidWcoXCJObyB0ZW1wbGF0ZSBzZWxlY3RlZC5cIik7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgdmFyIGV4ZW1wbGFyID0gdGVtcGxhdGUuZXhlbXBsYXIgfHwgXCJcIjtcbiAgICAgIHZhciBuYW1lOnN0cmluZyA9ICRzY29wZS5uZXdEb2N1bWVudE5hbWUgfHwgZXhlbXBsYXI7XG5cbiAgICAgIGlmIChuYW1lLmluZGV4T2YoJy4nKSA8IDApIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgdGhlIGZpbGUgZXh0ZW5zaW9uIGZyb20gdGhlIGV4ZW1wbGFyXG4gICAgICAgIHZhciBpZHggPSBleGVtcGxhci5sYXN0SW5kZXhPZihcIi5cIik7XG4gICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgbmFtZSArPSBleGVtcGxhci5zdWJzdHJpbmcoaWR4KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBsZXRzIGRlYWwgd2l0aCBkaXJlY3RvcmllcyBpbiB0aGUgbmFtZVxuICAgICAgdmFyIGZvbGRlcjpzdHJpbmcgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgaWYgKCRzY29wZS5pc0ZpbGUpIHtcbiAgICAgICAgLy8gaWYgd2UgYXJlIGEgZmlsZSBsZXRzIGRpc2NhcmQgdGhlIGxhc3QgcGFydCBvZiB0aGUgcGF0aFxuICAgICAgICB2YXIgaWR4OmFueSA9IGZvbGRlci5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICAgIGlmIChpZHggPD0gMCkge1xuICAgICAgICAgIGZvbGRlciA9IFwiXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9sZGVyID0gZm9sZGVyLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgaWR4OmFueSA9IG5hbWUubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgZm9sZGVyICs9IFwiL1wiICsgbmFtZS5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgfVxuICAgICAgZm9sZGVyID0gQ29yZS50cmltTGVhZGluZyhmb2xkZXIsIFwiL1wiKTtcbiAgICAgIHJldHVybiBmb2xkZXIgKyAoZm9sZGVyID8gXCIvXCIgOiBcIlwiKSArIG5hbWU7XG4gICAgfVxuXG4gIH1dKTtcblxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5FZGl0Q29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZy5wdXNoKGNyZWF0ZUVkaXRpbmdCcmVhZGNydW1iKCRzY29wZSkpO1xuXG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmVudGl0eSA9IHtcbiAgICAgIHNvdXJjZTogbnVsbFxuICAgIH07XG5cbiAgICB2YXIgZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KCRzY29wZS5wYWdlSWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpO1xuICAgIHZhciBmb3JtID0gbnVsbDtcbiAgICBpZiAoKGZvcm1hdCAmJiBmb3JtYXQgPT09IFwiamF2YXNjcmlwdFwiKSB8fCBpc0NyZWF0ZSgpKSB7XG4gICAgICBmb3JtID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXTtcbiAgICB9XG5cbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIG1vZGU6IHtcbiAgICAgICAgbmFtZTogZm9ybWF0XG4gICAgICB9XG4gICAgfTtcbiAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMgPSBDb2RlRWRpdG9yLmNyZWF0ZUVkaXRvclNldHRpbmdzKG9wdGlvbnMpO1xuICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuXG5cbiAgICAkc2NvcGUuaXNWYWxpZCA9ICgpID0+ICRzY29wZS5maWxlTmFtZTtcblxuICAgICRzY29wZS5jYW5TYXZlID0gKCkgPT4gISRzY29wZS5tb2RpZmllZDtcblxuICAgICRzY29wZS4kd2F0Y2goJ2VudGl0eS5zb3VyY2UnLCAobmV3VmFsdWUsIG9sZFZhbHVlKSA9PiB7XG4gICAgICAkc2NvcGUubW9kaWZpZWQgPSBuZXdWYWx1ZSAmJiBvbGRWYWx1ZSAmJiBuZXdWYWx1ZSAhPT0gb2xkVmFsdWU7XG4gICAgfSwgdHJ1ZSk7XG5cbiAgICBsb2cuZGVidWcoXCJwYXRoOiBcIiwgJHNjb3BlLnBhdGgpO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnbW9kaWZpZWQnLCAobmV3VmFsdWUsIG9sZFZhbHVlKSA9PiB7XG4gICAgICBsb2cuZGVidWcoXCJtb2RpZmllZDogXCIsIG5ld1ZhbHVlKTtcbiAgICB9KTtcblxuICAgICRzY29wZS52aWV3TGluayA9ICgpID0+IFdpa2kudmlld0xpbmsoJHNjb3BlLCAkc2NvcGUucGFnZUlkLCAkbG9jYXRpb24sICRzY29wZS5maWxlTmFtZSk7XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgZ29Ub1ZpZXcoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmUgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkICYmICRzY29wZS5maWxlTmFtZSkge1xuICAgICAgICBzYXZlVG8oJHNjb3BlW1wicGFnZUlkXCJdKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNyZWF0ZSA9ICgpID0+IHtcbiAgICAgIC8vIGxldHMgY29tYmluZSB0aGUgZmlsZSBuYW1lIHdpdGggdGhlIGN1cnJlbnQgcGFnZUlkICh3aGljaCBpcyB0aGUgZGlyZWN0b3J5KVxuICAgICAgdmFyIHBhdGggPSAkc2NvcGUucGFnZUlkICsgXCIvXCIgKyAkc2NvcGUuZmlsZU5hbWU7XG4gICAgICBjb25zb2xlLmxvZyhcImNyZWF0aW5nIG5ldyBmaWxlIGF0IFwiICsgcGF0aCk7XG4gICAgICBzYXZlVG8ocGF0aCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vblN1Ym1pdCA9IChqc29uLCBmb3JtKSA9PiB7XG4gICAgICBpZiAoaXNDcmVhdGUoKSkge1xuICAgICAgICAkc2NvcGUuY3JlYXRlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuc2F2ZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUub25DYW5jZWwgPSAoZm9ybSkgPT4ge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSlcbiAgICAgIH0sIDUwKTtcbiAgICB9O1xuXG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiBpc0NyZWF0ZSgpIHtcbiAgICAgIHJldHVybiAkbG9jYXRpb24ucGF0aCgpLnN0YXJ0c1dpdGgoXCIvd2lraS9jcmVhdGVcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIC8vIG9ubHkgbG9hZCB0aGUgc291cmNlIGlmIG5vdCBpbiBjcmVhdGUgbW9kZVxuICAgICAgaWYgKGlzQ3JlYXRlKCkpIHtcbiAgICAgICAgdXBkYXRlU291cmNlVmlldygpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiR2V0dGluZyBwYWdlLCBicmFuY2g6IFwiLCAkc2NvcGUuYnJhbmNoLCBcIiBwYWdlSWQ6IFwiLCAkc2NvcGUucGFnZUlkLCBcIiBvYmplY3RJZDogXCIsICRzY29wZS5vYmplY3RJZCk7XG4gICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgJHNjb3BlLm9iamVjdElkLCBvbkZpbGVDb250ZW50cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25GaWxlQ29udGVudHMoZGV0YWlscykge1xuICAgICAgdmFyIGNvbnRlbnRzID0gZGV0YWlscy50ZXh0O1xuICAgICAgJHNjb3BlLmVudGl0eS5zb3VyY2UgPSBjb250ZW50cztcbiAgICAgICRzY29wZS5maWxlTmFtZSA9ICRzY29wZS5wYWdlSWQuc3BsaXQoJy8nKS5sYXN0KCk7XG4gICAgICBsb2cuZGVidWcoXCJmaWxlIG5hbWU6IFwiLCAkc2NvcGUuZmlsZU5hbWUpO1xuICAgICAgbG9nLmRlYnVnKFwiZmlsZSBkZXRhaWxzOiBcIiwgZGV0YWlscyk7XG4gICAgICB1cGRhdGVTb3VyY2VWaWV3KCk7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVNvdXJjZVZpZXcoKSB7XG4gICAgICBpZiAoZm9ybSkge1xuICAgICAgICBpZiAoaXNDcmVhdGUoKSkge1xuICAgICAgICAgIC8vIGxldHMgZGVmYXVsdCBhIGZpbGUgbmFtZVxuICAgICAgICAgIGlmICghJHNjb3BlLmZpbGVOYW1lKSB7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZU5hbWUgPSBcIlwiICsgQ29yZS5nZXRVVUlEKCkgKyBcIi5qc29uXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIG5vdyBsZXRzIHRyeSBsb2FkIHRoZSBmb3JtIGRlZmludGlvbiBKU09OIHNvIHdlIGNhbiB0aGVuIHJlbmRlciB0aGUgZm9ybVxuICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IG51bGw7XG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvcm0sICRzY29wZS5vYmplY3RJZCwgKGRldGFpbHMpID0+IHtcbiAgICAgICAgICBvbkZvcm1TY2hlbWEoV2lraS5wYXJzZUpzb24oZGV0YWlscy50ZXh0KSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL3NvdXJjZUVkaXQuaHRtbFwiO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRm9ybVNjaGVtYShqc29uKSB7XG4gICAgICAkc2NvcGUuZm9ybURlZmluaXRpb24gPSBqc29uO1xuICAgICAgaWYgKCRzY29wZS5lbnRpdHkuc291cmNlKSB7XG4gICAgICAgICRzY29wZS5mb3JtRW50aXR5ID0gV2lraS5wYXJzZUpzb24oJHNjb3BlLmVudGl0eS5zb3VyY2UpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL2Zvcm1FZGl0Lmh0bWxcIjtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ29Ub1ZpZXcoKSB7XG4gICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcoJHNjb3BlLnZpZXdMaW5rKCksIFwiI1wiKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImdvaW5nIHRvIHZpZXcgXCIgKyBwYXRoKTtcbiAgICAgICRsb2NhdGlvbi5wYXRoKFdpa2kuZGVjb2RlUGF0aChwYXRoKSk7XG4gICAgICBsb2cuZGVidWcoXCJsb2NhdGlvbiBpcyBub3cgXCIgKyAkbG9jYXRpb24ucGF0aCgpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzYXZlVG8ocGF0aDpzdHJpbmcpIHtcbiAgICAgIHZhciBjb21taXRNZXNzYWdlID0gJHNjb3BlLmNvbW1pdE1lc3NhZ2UgfHwgXCJVcGRhdGVkIHBhZ2UgXCIgKyAkc2NvcGUucGFnZUlkO1xuICAgICAgdmFyIGNvbnRlbnRzID0gJHNjb3BlLmVudGl0eS5zb3VyY2U7XG4gICAgICBpZiAoJHNjb3BlLmZvcm1FbnRpdHkpIHtcbiAgICAgICAgY29udGVudHMgPSBKU09OLnN0cmluZ2lmeSgkc2NvcGUuZm9ybUVudGl0eSwgbnVsbCwgXCIgIFwiKTtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcIlNhdmluZyBmaWxlLCBicmFuY2g6IFwiLCAkc2NvcGUuYnJhbmNoLCBcIiBwYXRoOiBcIiwgJHNjb3BlLnBhdGgpO1xuICAgICAgLy9jb25zb2xlLmxvZyhcIkFib3V0IHRvIHdyaXRlIGNvbnRlbnRzICdcIiArIGNvbnRlbnRzICsgXCInXCIpO1xuICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb250ZW50cywgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG4gICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIlNhdmVkIFwiICsgcGF0aCk7XG4gICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLy8gY29udHJvbGxlciBmb3IgaGFuZGxpbmcgZmlsZSBkcm9wc1xuICBleHBvcnQgdmFyIEZpbGVEcm9wQ29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuRmlsZURyb3BDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIkZpbGVVcGxvYWRlclwiLCBcIiRyb3V0ZVwiLCBcIiR0aW1lb3V0XCIsIFwidXNlckRldGFpbHNcIiwgKCRzY29wZSwgRmlsZVVwbG9hZGVyLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJHRpbWVvdXQ6bmcuSVRpbWVvdXRTZXJ2aWNlLCB1c2VyRGV0YWlsczpDb3JlLlVzZXJEZXRhaWxzKSA9PiB7XG5cblxuICAgIHZhciB1cGxvYWRVUkkgPSBXaWtpLmdpdFJlc3RVUkwoJHNjb3BlLCAkc2NvcGUucGFnZUlkKSArICcvJztcbiAgICB2YXIgdXBsb2FkZXIgPSAkc2NvcGUudXBsb2FkZXIgPSBuZXcgRmlsZVVwbG9hZGVyKHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBDb3JlLmF1dGhIZWFkZXJWYWx1ZSh1c2VyRGV0YWlscylcbiAgICAgIH0sXG4gICAgICBhdXRvVXBsb2FkOiB0cnVlLFxuICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlLFxuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICB1cmw6IHVwbG9hZFVSSVxuICAgIH0pO1xuICAgICRzY29wZS5kb1VwbG9hZCA9ICgpID0+IHtcbiAgICAgIHVwbG9hZGVyLnVwbG9hZEFsbCgpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25XaGVuQWRkaW5nRmlsZUZhaWxlZCA9IGZ1bmN0aW9uIChpdGVtIC8qe0ZpbGV8RmlsZUxpa2VPYmplY3R9Ki8sIGZpbHRlciwgb3B0aW9ucykge1xuICAgICAgbG9nLmRlYnVnKCdvbldoZW5BZGRpbmdGaWxlRmFpbGVkJywgaXRlbSwgZmlsdGVyLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQWZ0ZXJBZGRpbmdGaWxlID0gZnVuY3Rpb24gKGZpbGVJdGVtKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQWZ0ZXJBZGRpbmdGaWxlJywgZmlsZUl0ZW0pO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25BZnRlckFkZGluZ0FsbCA9IGZ1bmN0aW9uIChhZGRlZEZpbGVJdGVtcykge1xuICAgICAgbG9nLmRlYnVnKCdvbkFmdGVyQWRkaW5nQWxsJywgYWRkZWRGaWxlSXRlbXMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25CZWZvcmVVcGxvYWRJdGVtID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIGlmICgnZmlsZScgaW4gaXRlbSkge1xuICAgICAgICBpdGVtLmZpbGVTaXplTUIgPSAoaXRlbS5maWxlLnNpemUgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCgyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGl0ZW0uZmlsZVNpemVNQiA9IDA7XG4gICAgICB9XG4gICAgICAvL2l0ZW0udXJsID0gVXJsSGVscGVycy5qb2luKHVwbG9hZFVSSSwgaXRlbS5maWxlLm5hbWUpO1xuICAgICAgaXRlbS51cmwgPSB1cGxvYWRVUkk7XG4gICAgICBsb2cuaW5mbyhcIkxvYWRpbmcgZmlsZXMgdG8gXCIgKyB1cGxvYWRVUkkpO1xuICAgICAgbG9nLmRlYnVnKCdvbkJlZm9yZVVwbG9hZEl0ZW0nLCBpdGVtKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uUHJvZ3Jlc3NJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCBwcm9ncmVzcykge1xuICAgICAgbG9nLmRlYnVnKCdvblByb2dyZXNzSXRlbScsIGZpbGVJdGVtLCBwcm9ncmVzcyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vblByb2dyZXNzQWxsID0gZnVuY3Rpb24gKHByb2dyZXNzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uUHJvZ3Jlc3NBbGwnLCBwcm9ncmVzcyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vblN1Y2Nlc3NJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uU3VjY2Vzc0l0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkVycm9ySXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvbkVycm9ySXRlbScsIGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQ2FuY2VsSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvbkNhbmNlbEl0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkNvbXBsZXRlSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvbkNvbXBsZXRlSXRlbScsIGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQ29tcGxldGVBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQ29tcGxldGVBbGwnKTtcbiAgICAgIHVwbG9hZGVyLmNsZWFyUXVldWUoKTtcbiAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oXCJDb21wbGV0ZWQgYWxsIHVwbG9hZHMuIExldHMgZm9yY2UgYSByZWxvYWRcIik7XG4gICAgICAgICRyb3V0ZS5yZWxvYWQoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0sIDIwMCk7XG4gICAgfTtcbiAgfV0pO1xuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuRm9ybVRhYmxlQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpID0+IHtcbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuY29sdW1uRGVmcyA9IFtdO1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgIGRhdGE6ICdsaXN0JyxcbiAgICAgICBkaXNwbGF5Rm9vdGVyOiBmYWxzZSxcbiAgICAgICBzaG93RmlsdGVyOiBmYWxzZSxcbiAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICBmaWx0ZXJUZXh0OiAnJ1xuICAgICAgIH0sXG4gICAgICAgY29sdW1uRGVmczogJHNjb3BlLmNvbHVtbkRlZnNcbiAgICAgfTtcblxuXG4gICAgJHNjb3BlLnZpZXdMaW5rID0gKHJvdykgPT4ge1xuICAgICAgcmV0dXJuIGNoaWxkTGluayhyb3csIFwiL3ZpZXdcIik7XG4gICAgfTtcbiAgICAkc2NvcGUuZWRpdExpbmsgPSAocm93KSA9PiB7XG4gICAgICByZXR1cm4gY2hpbGRMaW5rKHJvdywgXCIvZWRpdFwiKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY2hpbGRMaW5rKGNoaWxkLCBwcmVmaXgpIHtcbiAgICAgIHZhciBzdGFydCA9IFdpa2kuc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgY2hpbGRJZCA9IChjaGlsZCkgPyBjaGlsZFtcIl9pZFwiXSB8fCBcIlwiIDogXCJcIjtcbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBzdGFydCArIHByZWZpeCArIFwiL1wiICsgJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgY2hpbGRJZCk7XG4gICAgfVxuXG4gICAgdmFyIGxpbmtzQ29sdW1uID0ge1xuICAgICAgZmllbGQ6ICdfaWQnLFxuICAgICAgZGlzcGxheU5hbWU6ICdBY3Rpb25zJyxcbiAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0XCJcIj48YSBuZy1ocmVmPVwie3t2aWV3TGluayhyb3cuZW50aXR5KX19XCIgY2xhc3M9XCJidG5cIj5WaWV3PC9hPiA8YSBuZy1ocmVmPVwie3tlZGl0TGluayhyb3cuZW50aXR5KX19XCIgY2xhc3M9XCJidG5cIj5FZGl0PC9hPjwvZGl2PidcbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgdmFyIGZvcm0gPSAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdO1xuICAgIGlmIChmb3JtKSB7XG4gICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvcm0sICRzY29wZS5vYmplY3RJZCwgb25Gb3JtRGF0YSk7XG4gICAgfVxuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gb25SZXN1bHRzKHJlc3BvbnNlKSB7XG4gICAgICB2YXIgbGlzdCA9IFtdO1xuICAgICAgdmFyIG1hcCA9IFdpa2kucGFyc2VKc29uKHJlc3BvbnNlKTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChtYXAsICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIHZhbHVlW1wiX2lkXCJdID0ga2V5O1xuICAgICAgICBsaXN0LnB1c2godmFsdWUpO1xuICAgICAgfSk7XG4gICAgICAkc2NvcGUubGlzdCA9IGxpc3Q7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICB2YXIgZmlsdGVyID0gQ29yZS5wYXRoR2V0KCRzY29wZSwgW1wiZ3JpZE9wdGlvbnNcIiwgXCJmaWx0ZXJPcHRpb25zXCIsIFwiZmlsdGVyVGV4dFwiXSkgfHwgXCJcIjtcbiAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5qc29uQ2hpbGRDb250ZW50cygkc2NvcGUucGFnZUlkLCBcIiouanNvblwiLCBmaWx0ZXIsIG9uUmVzdWx0cyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Gb3JtRGF0YShkZXRhaWxzKSB7XG4gICAgICB2YXIgdGV4dCA9IGRldGFpbHMudGV4dDtcbiAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICRzY29wZS5mb3JtRGVmaW5pdGlvbiA9IFdpa2kucGFyc2VKc29uKHRleHQpO1xuXG4gICAgICAgIHZhciBjb2x1bW5EZWZzID0gW107XG4gICAgICAgIHZhciBzY2hlbWEgPSAkc2NvcGUuZm9ybURlZmluaXRpb247XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWEucHJvcGVydGllcywgKHByb3BlcnR5LCBuYW1lKSA9PiB7XG4gICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgIGlmICghRm9ybXMuaXNBcnJheU9yTmVzdGVkT2JqZWN0KHByb3BlcnR5LCBzY2hlbWEpKSB7XG4gICAgICAgICAgICAgIHZhciBjb2xEZWYgPSB7XG4gICAgICAgICAgICAgICAgZmllbGQ6IG5hbWUsXG4gICAgICAgICAgICAgICAgZGlzcGxheU5hbWU6IHByb3BlcnR5LmRlc2NyaXB0aW9uIHx8IG5hbWUsXG4gICAgICAgICAgICAgICAgdmlzaWJsZTogdHJ1ZVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjb2x1bW5EZWZzLnB1c2goY29sRGVmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjb2x1bW5EZWZzLnB1c2gobGlua3NDb2x1bW4pO1xuXG4gICAgICAgICRzY29wZS5jb2x1bW5EZWZzID0gY29sdW1uRGVmcztcbiAgICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLmNvbHVtbkRlZnMgPSBjb2x1bW5EZWZzO1xuXG4gICAgICAgIC8vIG5vdyB3ZSBoYXZlIHRoZSBncmlkIGNvbHVtbiBzdHVmZiBsb2FkZWQsIGxldHMgbG9hZCB0aGUgZGF0YXRhYmxlXG4gICAgICAgICRzY29wZS50YWJsZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL2Zvcm1UYWJsZURhdGF0YWJsZS5odG1sXCI7XG4gICAgICB9XG4gICAgfVxuICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG4gbW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkdpdFByZWZlcmVuY2VzXCIsIFtcIiRzY29wZVwiLCBcImxvY2FsU3RvcmFnZVwiLCBcInVzZXJEZXRhaWxzXCIsICgkc2NvcGUsIGxvY2FsU3RvcmFnZSwgdXNlckRldGFpbHMpID0+IHtcblxuICAgIHZhciBjb25maWcgPSB7XG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGdpdFVzZXJOYW1lOiB7XG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgbGFiZWw6ICdVc2VybmFtZScsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgdXNlciBuYW1lIHRvIGJlIHVzZWQgd2hlbiBtYWtpbmcgY2hhbmdlcyB0byBmaWxlcyB3aXRoIHRoZSBzb3VyY2UgY29udHJvbCBzeXN0ZW0nXG4gICAgICAgIH0sXG4gICAgICAgIGdpdFVzZXJFbWFpbDoge1xuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGxhYmVsOiAnRW1haWwnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGVtYWlsIGFkZHJlc3MgdG8gdXNlIHdoZW4gbWFraW5nIGNoYW5nZXMgdG8gZmlsZXMgd2l0aCB0aGUgc291cmNlIGNvbnRyb2wgc3lzdGVtJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5lbnRpdHkgPSAkc2NvcGU7XG4gICAgJHNjb3BlLmNvbmZpZyA9IGNvbmZpZztcblxuICAgIENvcmUuaW5pdFByZWZlcmVuY2VTY29wZSgkc2NvcGUsIGxvY2FsU3RvcmFnZSwge1xuICAgICAgJ2dpdFVzZXJOYW1lJzoge1xuICAgICAgICAndmFsdWUnOiB1c2VyRGV0YWlscy51c2VybmFtZSB8fCBcIlwiXG4gICAgICB9LFxuICAgICAgJ2dpdFVzZXJFbWFpbCc6IHtcbiAgICAgICAgJ3ZhbHVlJzogJydcbiAgICAgIH0gIFxuICAgIH0pO1xuICB9XSk7XG4gfVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkhpc3RvcnlDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwibWFya2VkXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsICR0ZW1wbGF0ZUNhY2hlLCBtYXJrZWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpID0+IHtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuICAgIHZhciBqb2xva2lhID0gbnVsbDtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgIC8vIFRPRE8gd2UgY291bGQgY29uZmlndXJlIHRoaXM/XG4gICAgJHNjb3BlLmRhdGVGb3JtYXQgPSAnRUVFLCBNTU0gZCwgeSBhdCBISDptbTpzcyBaJztcbiAgICAvLyd5eXl5LU1NLWRkIEhIOm1tOnNzIFonXG5cbiAgICAkc2NvcGUuZ3JpZE9wdGlvbnMgPSB7XG4gICAgICBkYXRhOiAnbG9ncycsXG4gICAgICBzaG93RmlsdGVyOiBmYWxzZSxcbiAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgIG11bHRpU2VsZWN0OiB0cnVlLFxuICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBkaXNwbGF5U2VsZWN0aW9uQ2hlY2tib3ggOiB0cnVlLCAvLyBvbGQgcHJlIDIuMCBjb25maWchXG4gICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgIGZpbHRlclRleHQ6ICcnXG4gICAgICB9LFxuICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICckZGF0ZScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdNb2RpZmllZCcsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cIm5nQ2VsbFRleHQgdGV4dC1ub3dyYXBcIiB0aXRsZT1cInt7cm93LmVudGl0eS4kZGF0ZSB8IGRhdGU6XFwnRUVFLCBNTU0gZCwgeXl5eSA6IEhIOm1tOnNzIFpcXCd9fVwiPnt7cm93LmVudGl0eS4kZGF0ZS5yZWxhdGl2ZSgpfX08L2Rpdj4nLFxuICAgICAgICAgIHdpZHRoOiBcIioqXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnc2hhJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ0NoYW5nZScsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cIm5nQ2VsbFRleHQgdGV4dC1ub3dyYXBcIj48YSBjbGFzcz1cImNvbW1pdC1saW5rXCIgbmctaHJlZj1cInt7cm93LmVudGl0eS5jb21taXRMaW5rfX17e2hhc2h9fVwiIHRpdGxlPVwie3tyb3cuZW50aXR5LnNoYX19XCI+e3tyb3cuZW50aXR5LnNoYSB8IGxpbWl0VG86N319IDxpIGNsYXNzPVwiZmEgZmEtYXJyb3ctY2lyY2xlLXJpZ2h0XCI+PC9pPjwvYT48L2Rpdj4nLFxuICAgICAgICAgIGNlbGxGaWx0ZXI6IFwiXCIsXG4gICAgICAgICAgd2lkdGg6IFwiKlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ2F1dGhvcicsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdBdXRob3InLFxuICAgICAgICAgIGNlbGxGaWx0ZXI6IFwiXCIsXG4gICAgICAgICAgd2lkdGg6IFwiKipcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdzaG9ydF9tZXNzYWdlJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ01lc3NhZ2UnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0IHRleHQtbm93cmFwXCIgdGl0bGU9XCJ7e3Jvdy5lbnRpdHkuc2hvcnRfbWVzc2FnZX19XCI+e3tyb3cuZW50aXR5LnNob3J0X21lc3NhZ2V9fTwvZGl2PicsXG4gICAgICAgICAgd2lkdGg6IFwiKioqKlwiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmNhblJldmVydCA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICByZXR1cm4gc2VsZWN0ZWRJdGVtcy5sZW5ndGggPT09IDEgJiYgc2VsZWN0ZWRJdGVtc1swXSAhPT0gJHNjb3BlLmxvZ3NbMF07XG4gICAgfTtcblxuICAgICRzY29wZS5yZXZlcnQgPSAoKSA9PiB7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgb2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzBdLnNoYTtcbiAgICAgICAgaWYgKG9iamVjdElkKSB7XG4gICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBmaWxlIFwiICsgJHNjb3BlLnBhZ2VJZCArIFwiIHRvIHByZXZpb3VzIHZlcnNpb24gXCIgKyBvYmplY3RJZDtcbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5yZXZlcnRUbygkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgY29tbWl0TWVzc2FnZSwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHJlc3VsdCk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB1cGRhdGUgdGhlIHZpZXdcbiAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdzdWNjZXNzJywgXCJTdWNjZXNzZnVsbHkgcmV2ZXJ0ZWQgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBzZWxlY3RlZEl0ZW1zLnNwbGljZSgwLCBzZWxlY3RlZEl0ZW1zLmxlbmd0aCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5kaWZmID0gKCkgPT4ge1xuICAgICAgdmFyIGRlZmF1bHRWYWx1ZSA9IFwiIFwiO1xuICAgICAgdmFyIG9iamVjdElkID0gZGVmYXVsdFZhbHVlO1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgb2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzBdLnNoYSB8fCBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG4gICAgICB2YXIgYmFzZU9iamVjdElkID0gZGVmYXVsdFZhbHVlO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMSkge1xuICAgICAgICBiYXNlT2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzFdLnNoYSB8fGRlZmF1bHRWYWx1ZTtcbiAgICAgICAgLy8gbWFrZSB0aGUgb2JqZWN0SWQgKHRoZSBvbmUgdGhhdCB3aWxsIHN0YXJ0IHdpdGggYi8gcGF0aCkgYWx3YXlzIG5ld2VyIHRoYW4gYmFzZU9iamVjdElkXG4gICAgICAgIGlmIChzZWxlY3RlZEl0ZW1zWzBdLmRhdGUgPCBzZWxlY3RlZEl0ZW1zWzFdLmRhdGUpIHtcbiAgICAgICAgICB2YXIgXyA9IGJhc2VPYmplY3RJZDtcbiAgICAgICAgICBiYXNlT2JqZWN0SWQgPSBvYmplY3RJZDtcbiAgICAgICAgICBvYmplY3RJZCA9IF87XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBsaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9kaWZmL1wiICsgJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgb2JqZWN0SWQgKyBcIi9cIiArIGJhc2VPYmplY3RJZDtcbiAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIiNcIik7XG4gICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICB9O1xuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIHZhciBvYmplY3RJZCA9IFwiXCI7XG4gICAgICB2YXIgbGltaXQgPSAwO1xuXG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuaGlzdG9yeSgkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgbGltaXQsIChsb2dBcnJheSkgPT4ge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2gobG9nQXJyYXksIChsb2cpID0+IHtcbiAgICAgICAgICAvLyBsZXRzIHVzZSB0aGUgc2hvcnRlciBoYXNoIGZvciBsaW5rcyBieSBkZWZhdWx0XG4gICAgICAgICAgdmFyIGNvbW1pdElkID0gbG9nLnNoYTtcbiAgICAgICAgICBsb2cuJGRhdGUgPSBEZXZlbG9wZXIuYXNEYXRlKGxvZy5kYXRlKTtcbiAgICAgICAgICBsb2cuY29tbWl0TGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvY29tbWl0L1wiICsgJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgY29tbWl0SWQ7XG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUubG9ncyA9IGxvZ0FycmF5O1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgICBXaWtpLmxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLk5hdkJhckNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwid2lraUJyYW5jaE1lbnVcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsIHdpa2lCcmFuY2hNZW51OkJyYW5jaE1lbnUpID0+IHtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmJyYW5jaE1lbnVDb25maWcgPSA8VUkuTWVudUl0ZW0+e1xuICAgICAgdGl0bGU6ICRzY29wZS5icmFuY2gsXG4gICAgICBpdGVtczogW11cbiAgICB9O1xuXG4gICAgJHNjb3BlLlZpZXdNb2RlID0gV2lraS5WaWV3TW9kZTtcbiAgICAkc2NvcGUuc2V0Vmlld01vZGUgPSAobW9kZTpXaWtpLlZpZXdNb2RlKSA9PiB7XG4gICAgICAkc2NvcGUuJGVtaXQoJ1dpa2kuU2V0Vmlld01vZGUnLCBtb2RlKTtcbiAgICB9O1xuXG4gICAgd2lraUJyYW5jaE1lbnUuYXBwbHlNZW51RXh0ZW5zaW9ucygkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcyk7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdicmFuY2hlcycsIChuZXdWYWx1ZSwgb2xkVmFsdWUpID0+IHtcbiAgICAgIGlmIChuZXdWYWx1ZSA9PT0gb2xkVmFsdWUgfHwgIW5ld1ZhbHVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zID0gW107XG4gICAgICBpZiAobmV3VmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcy5wdXNoKHtcbiAgICAgICAgICBoZWFkaW5nOiBpc0ZtYyA/IFwiVmVyc2lvbnNcIiA6IFwiQnJhbmNoZXNcIlxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIG5ld1ZhbHVlLnNvcnQoKS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHZhciBtZW51SXRlbSA9IHtcbiAgICAgICAgICB0aXRsZTogaXRlbSxcbiAgICAgICAgICBpY29uOiAnJyxcbiAgICAgICAgICBhY3Rpb246ICgpID0+IHt9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChpdGVtID09PSAkc2NvcGUuYnJhbmNoKSB7XG4gICAgICAgICAgbWVudUl0ZW0uaWNvbiA9IFwiZmEgZmEtb2tcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtZW51SXRlbS5hY3Rpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0VXJsID0gYnJhbmNoTGluayhpdGVtLCA8c3RyaW5nPiRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgICAgICAgICAkbG9jYXRpb24ucGF0aChDb3JlLnRvUGF0aCh0YXJnZXRVcmwpKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zLnB1c2gobWVudUl0ZW0pO1xuICAgICAgfSk7XG4gICAgICB3aWtpQnJhbmNoTWVudS5hcHBseU1lbnVFeHRlbnNpb25zKCRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zKTtcbiAgICB9LCB0cnVlKTtcblxuICAgICRzY29wZS5jcmVhdGVMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhZ2VJZCA9IFdpa2kucGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAgIHJldHVybiBXaWtpLmNyZWF0ZUxpbmsoJHNjb3BlLCBwYWdlSWQsICRsb2NhdGlvbik7XG4gICAgfTtcblxuICAgICRzY29wZS5zdGFydExpbmsgPSBzdGFydExpbmsoJHNjb3BlKTtcblxuICAgICRzY29wZS5zb3VyY2VMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgdmFyIGFuc3dlciA9IDxzdHJpbmc+bnVsbDtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChXaWtpLmN1c3RvbVZpZXdMaW5rcygkc2NvcGUpLCAobGluaykgPT4ge1xuICAgICAgICBpZiAocGF0aC5zdGFydHNXaXRoKGxpbmspKSB7XG4gICAgICAgICAgYW5zd2VyID0gPHN0cmluZz5Db3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBXaWtpLnN0YXJ0TGluaygkc2NvcGUpICsgXCIvdmlld1wiICsgcGF0aC5zdWJzdHJpbmcobGluay5sZW5ndGgpKVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIHJlbW92ZSB0aGUgZm9ybSBwYXJhbWV0ZXIgb24gdmlldy9lZGl0IGxpbmtzXG4gICAgICByZXR1cm4gKCFhbnN3ZXIgJiYgJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXSlcbiAgICAgICAgICAgICAgPyBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBcIiNcIiArIHBhdGgsIFtcImZvcm1cIl0pXG4gICAgICAgICAgICAgIDogYW5zd2VyO1xuICAgIH07XG5cbiAgICAkc2NvcGUuaXNBY3RpdmUgPSAoaHJlZikgPT4ge1xuICAgICAgaWYgKCFocmVmKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBocmVmLmVuZHNXaXRoKCRyb3V0ZVBhcmFtc1sncGFnZSddKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQobG9hZEJyZWFkY3J1bWJzLCA1MCk7XG4gICAgfSk7XG5cbiAgICBsb2FkQnJlYWRjcnVtYnMoKTtcblxuICAgIGZ1bmN0aW9uIHN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rKGJyZWFkY3J1bWIsIGxpbmspIHtcbiAgICAgIHZhciBocmVmID0gYnJlYWRjcnVtYi5ocmVmO1xuICAgICAgaWYgKGhyZWYpIHtcbiAgICAgICAgYnJlYWRjcnVtYi5ocmVmID0gaHJlZi5yZXBsYWNlKFwid2lraS92aWV3XCIsIGxpbmspO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxvYWRCcmVhZGNydW1icygpIHtcbiAgICAgIHZhciBzdGFydCA9IFdpa2kuc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgaHJlZiA9IHN0YXJ0ICsgXCIvdmlld1wiO1xuICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzID0gW1xuICAgICAgICB7aHJlZjogaHJlZiwgbmFtZTogXCJyb290XCJ9XG4gICAgICBdO1xuICAgICAgdmFyIHBhdGggPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgICB2YXIgYXJyYXkgPSBwYXRoID8gcGF0aC5zcGxpdChcIi9cIikgOiBbXTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChhcnJheSwgKG5hbWUpID0+IHtcbiAgICAgICAgaWYgKCFuYW1lLnN0YXJ0c1dpdGgoXCIvXCIpICYmICFocmVmLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgICAgICAgIGhyZWYgKz0gXCIvXCI7XG4gICAgICAgIH1cbiAgICAgICAgaHJlZiArPSBXaWtpLmVuY29kZVBhdGgobmFtZSk7XG4gICAgICAgIGlmICghbmFtZS5pc0JsYW5rKCkpIHtcbiAgICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogaHJlZiwgbmFtZTogbmFtZX0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIGxldHMgc3dpenpsZSB0aGUgbGFzdCBvbmUgb3IgdHdvIHRvIGJlIGZvcm1UYWJsZSB2aWV3cyBpZiB0aGUgbGFzdCBvciAybmQgdG8gbGFzdFxuICAgICAgdmFyIGxvYyA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICBpZiAoJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCkge1xuICAgICAgICB2YXIgbGFzdCA9ICRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMV07XG4gICAgICAgIC8vIHBvc3NpYmx5IHRyaW0gYW55IHJlcXVpcmVkIGZpbGUgZXh0ZW5zaW9uc1xuICAgICAgICBsYXN0Lm5hbWUgPSBXaWtpLmhpZGVGaWxlTmFtZUV4dGVuc2lvbnMobGFzdC5uYW1lKTtcblxuICAgICAgICB2YXIgc3dpenpsZWQgPSBmYWxzZTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKFdpa2kuY3VzdG9tVmlld0xpbmtzKCRzY29wZSksIChsaW5rKSA9PiB7XG4gICAgICAgICAgaWYgKCFzd2l6emxlZCAmJiBsb2Muc3RhcnRzV2l0aChsaW5rKSkge1xuICAgICAgICAgICAgLy8gbGV0cyBzd2l6emxlIHRoZSB2aWV3IHRvIHRoZSBjdXJyZW50IGxpbmtcbiAgICAgICAgICAgIHN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rKCRzY29wZS5icmVhZGNydW1icy5sYXN0KCksIENvcmUudHJpbUxlYWRpbmcobGluaywgXCIvXCIpKTtcbiAgICAgICAgICAgIHN3aXp6bGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXN3aXp6bGVkICYmICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl0pIHtcbiAgICAgICAgICB2YXIgbGFzdE5hbWUgPSAkc2NvcGUuYnJlYWRjcnVtYnMubGFzdCgpLm5hbWU7XG4gICAgICAgICAgaWYgKGxhc3ROYW1lICYmIGxhc3ROYW1lLmVuZHNXaXRoKFwiLmpzb25cIikpIHtcbiAgICAgICAgICAgIC8vIHByZXZpb3VzIGJyZWFkY3J1bWIgc2hvdWxkIGJlIGEgZm9ybVRhYmxlXG4gICAgICAgICAgICBzd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluaygkc2NvcGUuYnJlYWRjcnVtYnNbJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCAtIDJdLCBcIndpa2kvZm9ybVRhYmxlXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLypcbiAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChcIi93aWtpL2hpc3RvcnlcIikgfHwgbG9jLnN0YXJ0c1dpdGgoXCIvd2lraS92ZXJzaW9uXCIpXG4gICAgICAgIHx8IGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvZGlmZlwiKSB8fCBsb2Muc3RhcnRzV2l0aChcIi93aWtpL2NvbW1pdFwiKSkge1xuICAgICAgICAvLyBsZXRzIGFkZCBhIGhpc3RvcnkgdGFiXG4gICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiMvd2lraS9oaXN0b3J5L1wiICsgcGF0aCwgbmFtZTogXCJIaXN0b3J5XCJ9KTtcbiAgICAgIH0gZWxzZSBpZiAoJHNjb3BlLmJyYW5jaCkge1xuICAgICAgICB2YXIgcHJlZml4ID1cIi93aWtpL2JyYW5jaC9cIiArICRzY29wZS5icmFuY2g7XG4gICAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi9oaXN0b3J5XCIpIHx8IGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL3ZlcnNpb25cIilcbiAgICAgICAgICB8fCBsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi9kaWZmXCIpIHx8IGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL2NvbW1pdFwiKSkge1xuICAgICAgICAgIC8vIGxldHMgYWRkIGEgaGlzdG9yeSB0YWJcbiAgICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogXCIjL3dpa2kvYnJhbmNoL1wiICsgJHNjb3BlLmJyYW5jaCArIFwiL2hpc3RvcnkvXCIgKyBwYXRoLCBuYW1lOiBcIkhpc3RvcnlcIn0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAqL1xuICAgICAgdmFyIG5hbWU6c3RyaW5nID0gbnVsbDtcbiAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChcIi93aWtpL3ZlcnNpb25cIikpIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgYSB2ZXJzaW9uIHRhYlxuICAgICAgICBuYW1lID0gKCRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8IFwiXCIpLnN1YnN0cmluZygwLCA2KSB8fCBcIlZlcnNpb25cIjtcbiAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IFwiI1wiICsgbG9jLCBuYW1lOiBuYW1lfSk7XG4gICAgICB9XG4gICAgICBpZiAobG9jLnN0YXJ0c1dpdGgoXCIvd2lraS9kaWZmXCIpKSB7XG4gICAgICAgIC8vIGxldHMgYWRkIGEgdmVyc2lvbiB0YWJcbiAgICAgICAgdmFyIHYxID0gKCRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8IFwiXCIpLnN1YnN0cmluZygwLCA2KTtcbiAgICAgICAgdmFyIHYyID0gKCRyb3V0ZVBhcmFtc1tcImJhc2VPYmplY3RJZFwiXSB8fCBcIlwiKS5zdWJzdHJpbmcoMCwgNik7XG4gICAgICAgIG5hbWUgPSBcIkRpZmZcIjtcbiAgICAgICAgaWYgKHYxKSB7XG4gICAgICAgICAgaWYgKHYyKSB7XG4gICAgICAgICAgICBuYW1lICs9IFwiIFwiICsgdjEgKyBcIiBcIiArIHYyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuYW1lICs9IFwiIFwiICsgdjE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiNcIiArIGxvYywgbmFtZTogbmFtZX0pO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLy8gbWFpbiBwYWdlIGNvbnRyb2xsZXJcbiAgZXhwb3J0IHZhciBWaWV3Q29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuVmlld0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHJvdXRlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgIFwiJGNvbXBpbGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcImxvY2FsU3RvcmFnZVwiLCBcIiRpbnRlcnBvbGF0ZVwiLCBcIiRkaWFsb2dcIiwgKCRzY29wZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtczpuZy5yb3V0ZS5JUm91dGVQYXJhbXNTZXJ2aWNlLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJGh0dHA6bmcuSUh0dHBTZXJ2aWNlLCAkdGltZW91dDpuZy5JVGltZW91dFNlcnZpY2UsIG1hcmtlZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSwgICRjb21waWxlOm5nLklDb21waWxlU2VydmljZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRpbnRlcnBvbGF0ZTpuZy5JSW50ZXJwb2xhdGVTZXJ2aWNlLCAkZGlhbG9nKSA9PiB7XG5cbiAgICAkc2NvcGUubmFtZSA9IFwiV2lraVZpZXdDb250cm9sbGVyXCI7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgIFNlbGVjdGlvbkhlbHBlcnMuZGVjb3JhdGUoJHNjb3BlKTtcblxuICAgICRzY29wZS5mYWJyaWNUb3BMZXZlbCA9IFwiZmFicmljL3Byb2ZpbGVzL1wiO1xuXG4gICAgJHNjb3BlLnZlcnNpb25JZCA9ICRzY29wZS5icmFuY2g7XG5cbiAgICAkc2NvcGUucGFuZVRlbXBsYXRlID0gJyc7XG5cbiAgICAkc2NvcGUucHJvZmlsZUlkID0gXCJcIjtcbiAgICAkc2NvcGUuc2hvd1Byb2ZpbGVIZWFkZXIgPSBmYWxzZTtcbiAgICAkc2NvcGUuc2hvd0FwcEhlYWRlciA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLm9wZXJhdGlvbkNvdW50ZXIgPSAxO1xuICAgICRzY29wZS5yZW5hbWVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUubW92ZURpYWxvZyA9IDxXaWtpRGlhbG9nPiBudWxsO1xuICAgICRzY29wZS5kZWxldGVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUuaXNGaWxlID0gZmFsc2U7XG5cbiAgICAkc2NvcGUucmVuYW1lID0ge1xuICAgICAgbmV3RmlsZU5hbWU6IFwiXCJcbiAgICB9O1xuICAgICRzY29wZS5tb3ZlID0ge1xuICAgICAgbW92ZUZvbGRlcjogXCJcIlxuICAgIH07XG4gICAgJHNjb3BlLlZpZXdNb2RlID0gV2lraS5WaWV3TW9kZTtcblxuICAgIC8vIGJpbmQgZmlsdGVyIG1vZGVsIHZhbHVlcyB0byBzZWFyY2ggcGFyYW1zLi4uXG4gICAgQ29yZS5iaW5kTW9kZWxUb1NlYXJjaFBhcmFtKCRzY29wZSwgJGxvY2F0aW9uLCBcInNlYXJjaFRleHRcIiwgXCJxXCIsIFwiXCIpO1xuXG4gICAgU3RvcmFnZUhlbHBlcnMuYmluZE1vZGVsVG9Mb2NhbFN0b3JhZ2Uoe1xuICAgICAgJHNjb3BlOiAkc2NvcGUsXG4gICAgICAkbG9jYXRpb246ICRsb2NhdGlvbixcbiAgICAgIGxvY2FsU3RvcmFnZTogbG9jYWxTdG9yYWdlLFxuICAgICAgbW9kZWxOYW1lOiAnbW9kZScsXG4gICAgICBwYXJhbU5hbWU6ICd3aWtpVmlld01vZGUnLFxuICAgICAgaW5pdGlhbFZhbHVlOiBXaWtpLlZpZXdNb2RlLkxpc3QsXG4gICAgICB0bzogQ29yZS5udW1iZXJUb1N0cmluZyxcbiAgICAgIGZyb206IENvcmUucGFyc2VJbnRWYWx1ZVxuICAgIH0pO1xuXG4gICAgLy8gb25seSByZWxvYWQgdGhlIHBhZ2UgaWYgY2VydGFpbiBzZWFyY2ggcGFyYW1ldGVycyBjaGFuZ2VcbiAgICBDb3JlLnJlbG9hZFdoZW5QYXJhbWV0ZXJzQ2hhbmdlKCRyb3V0ZSwgJHNjb3BlLCAkbG9jYXRpb24sIFsnd2lraVZpZXdNb2RlJ10pO1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgZGF0YTogJ2NoaWxkcmVuJyxcbiAgICAgIGRpc3BsYXlGb290ZXI6IGZhbHNlLFxuICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBlbmFibGVTb3J0aW5nOiBmYWxzZSxcbiAgICAgIHVzZUV4dGVybmFsU29ydGluZzogdHJ1ZSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdOYW1lJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldCgnZmlsZUNlbGxUZW1wbGF0ZS5odG1sJyksXG4gICAgICAgICAgaGVhZGVyQ2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ2ZpbGVDb2x1bW5UZW1wbGF0ZS5odG1sJylcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKCdXaWtpLlNldFZpZXdNb2RlJywgKCRldmVudCwgbW9kZTpXaWtpLlZpZXdNb2RlKSA9PiB7XG4gICAgICAkc2NvcGUubW9kZSA9IG1vZGU7XG4gICAgICBzd2l0Y2gobW9kZSkge1xuICAgICAgICBjYXNlIFZpZXdNb2RlLkxpc3Q6XG4gICAgICAgICAgbG9nLmRlYnVnKFwiTGlzdCB2aWV3IG1vZGVcIik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgVmlld01vZGUuSWNvbjpcbiAgICAgICAgICBsb2cuZGVidWcoXCJJY29uIHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAkc2NvcGUubW9kZSA9IFZpZXdNb2RlLkxpc3Q7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiRGVmYXVsdGluZyB0byBsaXN0IHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgJHNjb3BlLmNoaWxkQWN0aW9ucyA9IFtdO1xuXG4gICAgdmFyIG1heWJlVXBkYXRlVmlldyA9IENvcmUudGhyb3R0bGVkKHVwZGF0ZVZpZXcsIDEwMDApO1xuXG4gICAgJHNjb3BlLm1hcmtlZCA9ICh0ZXh0KSA9PiB7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICByZXR1cm4gbWFya2VkKHRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuICAgIH07XG5cblxuICAgICRzY29wZS4kb24oJ3dpa2lCcmFuY2hlc1VwZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1cGRhdGVWaWV3KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuY3JlYXRlRGFzaGJvYXJkTGluayA9ICgpID0+IHtcbiAgICAgIHZhciBocmVmID0gJy93aWtpL2JyYW5jaC86YnJhbmNoL3ZpZXcvKnBhZ2UnO1xuICAgICAgdmFyIHBhZ2UgPSAkcm91dGVQYXJhbXNbJ3BhZ2UnXTtcbiAgICAgIHZhciB0aXRsZSA9IHBhZ2UgPyBwYWdlLnNwbGl0KFwiL1wiKS5sYXN0KCkgOiBudWxsO1xuICAgICAgdmFyIHNpemUgPSBhbmd1bGFyLnRvSnNvbih7XG4gICAgICAgIHNpemVfeDogMixcbiAgICAgICAgc2l6ZV95OiAyXG4gICAgICB9KTtcbiAgICAgIHZhciBhbnN3ZXIgPSBcIiMvZGFzaGJvYXJkL2FkZD90YWI9ZGFzaGJvYXJkXCIgK1xuICAgICAgICBcIiZocmVmPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGhyZWYpICtcbiAgICAgICAgXCImc2l6ZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChzaXplKSArXG4gICAgICAgIFwiJnJvdXRlUGFyYW1zPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGFuZ3VsYXIudG9Kc29uKCRyb3V0ZVBhcmFtcykpO1xuICAgICAgaWYgKHRpdGxlKSB7XG4gICAgICAgIGFuc3dlciArPSBcIiZ0aXRsZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh0aXRsZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYW5zd2VyO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZGlzcGxheUNsYXNzID0gKCkgPT4ge1xuICAgICAgaWYgKCEkc2NvcGUuY2hpbGRyZW4gfHwgJHNjb3BlLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcInNwYW45XCI7XG4gICAgfTtcblxuICAgICRzY29wZS5wYXJlbnRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgcHJlZml4ID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhZ2VJZDogXCIsICRzY29wZS5wYWdlSWQpXG4gICAgICB2YXIgcGFydHMgPSAkc2NvcGUucGFnZUlkLnNwbGl0KFwiL1wiKTtcbiAgICAgIC8vbG9nLmRlYnVnKFwicGFydHM6IFwiLCBwYXJ0cyk7XG4gICAgICB2YXIgcGF0aCA9IFwiL1wiICsgcGFydHMuZmlyc3QocGFydHMubGVuZ3RoIC0gMSkuam9pbihcIi9cIik7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhdGg6IFwiLCBwYXRoKTtcbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBwcmVmaXggKyBwYXRoLCBbXSk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmNoaWxkTGluayA9IChjaGlsZCkgPT4ge1xuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgcHJlZml4ID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICB2YXIgcG9zdEZpeCA9IFwiXCI7XG4gICAgICB2YXIgcGF0aCA9IFdpa2kuZW5jb2RlUGF0aChjaGlsZC5wYXRoKTtcbiAgICAgIGlmIChjaGlsZC5kaXJlY3RvcnkpIHtcbiAgICAgICAgLy8gaWYgd2UgYXJlIGEgZm9sZGVyIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBhIGZvcm0gZmlsZSwgbGV0cyBhZGQgYSBmb3JtIHBhcmFtLi4uXG4gICAgICAgIHZhciBmb3JtUGF0aCA9IHBhdGggKyBcIi5mb3JtXCI7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9ICRzY29wZS5jaGlsZHJlbjtcbiAgICAgICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgICAgdmFyIGZvcm1GaWxlID0gY2hpbGRyZW4uZmluZCgoY2hpbGQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZFsncGF0aCddID09PSBmb3JtUGF0aDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAoZm9ybUZpbGUpIHtcbiAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvZm9ybVRhYmxlXCI7XG4gICAgICAgICAgICBwb3N0Rml4ID0gXCI/Zm9ybT1cIiArIGZvcm1QYXRoO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHhtbE5hbWVzcGFjZXMgPSBjaGlsZC54bWxfbmFtZXNwYWNlcyB8fCBjaGlsZC54bWxOYW1lc3BhY2VzO1xuICAgICAgICBpZiAoeG1sTmFtZXNwYWNlcyAmJiB4bWxOYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICAgIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuY2FtZWxOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgICAgICBpZiAodXNlQ2FtZWxDYW52YXNCeURlZmF1bHQpIHtcbiAgICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9jYW1lbC9jYW52YXNcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvY2FtZWwvcHJvcGVydGllc1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmRvemVyTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9kb3plci9tYXBwaW5nc1wiO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJjaGlsZCBcIiArIHBhdGggKyBcIiBoYXMgbmFtZXNwYWNlcyBcIiArIHhtbE5hbWVzcGFjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGQucGF0aC5lbmRzV2l0aChcIi5mb3JtXCIpKSB7XG4gICAgICAgICAgcG9zdEZpeCA9IFwiP2Zvcm09L1wiO1xuICAgICAgICB9IGVsc2UgaWYgKFdpa2kuaXNJbmRleFBhZ2UoY2hpbGQucGF0aCkpIHtcbiAgICAgICAgICAvLyBsZXRzIGRlZmF1bHQgdG8gYm9vayB2aWV3IG9uIGluZGV4IHBhZ2VzXG4gICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9ib29rXCI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBVcmxIZWxwZXJzLmpvaW4ocHJlZml4LCBwYXRoKSArIHBvc3RGaXgsIFtcImZvcm1cIl0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZU5hbWUgPSAoZW50aXR5KSA9PiB7XG4gICAgICByZXR1cm4gV2lraS5oaWRlRmlsZU5hbWVFeHRlbnNpb25zKGVudGl0eS5kaXNwbGF5TmFtZSB8fCBlbnRpdHkubmFtZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlQ2xhc3MgPSAoZW50aXR5KSA9PiB7XG4gICAgICBpZiAoZW50aXR5Lm5hbWUuaGFzKFwiLnByb2ZpbGVcIikpIHtcbiAgICAgICAgcmV0dXJuIFwiZ3JlZW5cIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZUljb25IdG1sID0gKGVudGl0eSkgPT4ge1xuICAgICAgcmV0dXJuIFdpa2kuZmlsZUljb25IdG1sKGVudGl0eSk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdCgkc2NvcGUucGFnZUlkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KTtcbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgbW9kZToge1xuICAgICAgICBuYW1lOiAkc2NvcGUuZm9ybWF0XG4gICAgICB9XG4gICAgfTtcbiAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMgPSBDb2RlRWRpdG9yLmNyZWF0ZUVkaXRvclNldHRpbmdzKG9wdGlvbnMpO1xuXG4gICAgJHNjb3BlLmVkaXRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhZ2VOYW1lID0gKCRzY29wZS5kaXJlY3RvcnkpID8gJHNjb3BlLnJlYWRNZVBhdGggOiAkc2NvcGUucGFnZUlkO1xuICAgICAgcmV0dXJuIChwYWdlTmFtZSkgPyBXaWtpLmVkaXRMaW5rKCRzY29wZSwgcGFnZU5hbWUsICRsb2NhdGlvbikgOiBudWxsO1xuICAgIH07XG5cbiAgICAkc2NvcGUuYnJhbmNoTGluayA9IChicmFuY2gpID0+IHtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcmV0dXJuIFdpa2kuYnJhbmNoTGluayhicmFuY2gsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH07XG5cbiAgICAkc2NvcGUuaGlzdG9yeUxpbmsgPSBcIiMvd2lraVwiICsgKCRzY29wZS5icmFuY2ggPyBcIi9icmFuY2gvXCIgKyAkc2NvcGUuYnJhbmNoIDogXCJcIikgKyBcIi9oaXN0b3J5L1wiICsgJHNjb3BlLnBhZ2VJZDtcblxuICAgICRzY29wZS4kd2F0Y2goJ3dvcmtzcGFjZS50cmVlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEkc2NvcGUuZ2l0KSB7XG4gICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAgIC8vbG9nLmluZm8oXCJSZWxvYWRpbmcgdmlldyBhcyB0aGUgdHJlZSBjaGFuZ2VkIGFuZCB3ZSBoYXZlIGEgZ2l0IG1iZWFuIG5vd1wiKTtcbiAgICAgICAgc2V0VGltZW91dChtYXliZVVwZGF0ZVZpZXcsIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAvL2xvZy5pbmZvKFwiUmVsb2FkaW5nIHZpZXcgZHVlIHRvICRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIik7XG4gICAgICBzZXRUaW1lb3V0KG1heWJlVXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUub3BlbkRlbGV0ZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRmlsZUh0bWwgPSBcIjx1bD5cIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLm1hcChmaWxlID0+IFwiPGxpPlwiICsgZmlsZS5uYW1lICsgXCI8L2xpPlwiKS5zb3J0KCkuam9pbihcIlwiKSArIFwiPC91bD5cIjtcblxuICAgICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMuZmluZCgoZmlsZSkgPT4geyByZXR1cm4gZmlsZS5uYW1lLmVuZHNXaXRoKFwiLnByb2ZpbGVcIil9KSkge1xuICAgICAgICAgICRzY29wZS5kZWxldGVXYXJuaW5nID0gXCJZb3UgYXJlIGFib3V0IHRvIGRlbGV0ZSBkb2N1bWVudChzKSB3aGljaCByZXByZXNlbnQgRmFicmljOCBwcm9maWxlKHMpLiBUaGlzIHJlYWxseSBjYW4ndCBiZSB1bmRvbmUhIFdpa2kgb3BlcmF0aW9ucyBhcmUgbG93IGxldmVsIGFuZCBtYXkgbGVhZCB0byBub24tZnVuY3Rpb25hbCBzdGF0ZSBvZiBGYWJyaWMuXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJHNjb3BlLmRlbGV0ZVdhcm5pbmcgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLmRlbGV0ZURpYWxvZyA9IFdpa2kuZ2V0RGVsZXRlRGlhbG9nKCRkaWFsb2csIDxXaWtpLkRlbGV0ZURpYWxvZ09wdGlvbnM+e1xuICAgICAgICAgIGNhbGxiYWNrczogKCkgPT4geyByZXR1cm4gJHNjb3BlLmRlbGV0ZUFuZENsb3NlRGlhbG9nOyB9LFxuICAgICAgICAgIHNlbGVjdGVkRmlsZUh0bWw6ICgpID0+ICB7IHJldHVybiAkc2NvcGUuc2VsZWN0ZWRGaWxlSHRtbDsgfSxcbiAgICAgICAgICB3YXJuaW5nOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZGVsZXRlV2FybmluZzsgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuZGVsZXRlRGlhbG9nLm9wZW4oKTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gaXRlbXMgc2VsZWN0ZWQgcmlnaHQgbm93ISBcIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRlbGV0ZUFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIGZpbGVzID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICB2YXIgZmlsZUNvdW50ID0gZmlsZXMubGVuZ3RoO1xuICAgICAgbG9nLmRlYnVnKFwiRGVsZXRpbmcgc2VsZWN0aW9uOiBcIiArIGZpbGVzKTtcblxuICAgICAgdmFyIHBhdGhzVG9EZWxldGUgPSBbXTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChmaWxlcywgKGZpbGUsIGlkeCkgPT4ge1xuICAgICAgICB2YXIgcGF0aCA9IFVybEhlbHBlcnMuam9pbigkc2NvcGUucGFnZUlkLCBmaWxlLm5hbWUpO1xuICAgICAgICBwYXRoc1RvRGVsZXRlLnB1c2gocGF0aCk7XG4gICAgICB9KTtcblxuICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gZGVsZXRlIFwiICsgcGF0aHNUb0RlbGV0ZSk7XG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZXMoJHNjb3BlLmJyYW5jaCwgcGF0aHNUb0RlbGV0ZSwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyA9IFtdO1xuICAgICAgICB2YXIgbWVzc2FnZSA9IENvcmUubWF5YmVQbHVyYWwoZmlsZUNvdW50LCBcImRvY3VtZW50XCIpO1xuICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJEZWxldGVkIFwiICsgbWVzc2FnZSk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgIH0pO1xuICAgICAgJHNjb3BlLmRlbGV0ZURpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKFwicmVuYW1lLm5ld0ZpbGVOYW1lXCIsICgpID0+IHtcbiAgICAgIC8vIGlnbm9yZSBlcnJvcnMgaWYgdGhlIGZpbGUgaXMgdGhlIHNhbWUgYXMgdGhlIHJlbmFtZSBmaWxlIVxuICAgICAgdmFyIHBhdGggPSBnZXRSZW5hbWVGaWxlUGF0aCgpO1xuICAgICAgaWYgKCRzY29wZS5vcmlnaW5hbFJlbmFtZUZpbGVQYXRoID09PSBwYXRoKSB7XG4gICAgICAgICRzY29wZS5maWxlRXhpc3RzID0geyBleGlzdHM6IGZhbHNlLCBuYW1lOiBudWxsIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGVja0ZpbGVFeGlzdHMocGF0aCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUucmVuYW1lQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICB2YXIgbmV3UGF0aCA9IGdldFJlbmFtZUZpbGVQYXRoKCk7XG4gICAgICAgIGlmIChzZWxlY3RlZCAmJiBuZXdQYXRoKSB7XG4gICAgICAgICAgdmFyIG9sZE5hbWUgPSBzZWxlY3RlZC5uYW1lO1xuICAgICAgICAgIHZhciBuZXdOYW1lID0gV2lraS5maWxlTmFtZShuZXdQYXRoKTtcbiAgICAgICAgICB2YXIgb2xkUGF0aCA9IFVybEhlbHBlcnMuam9pbigkc2NvcGUucGFnZUlkLCBvbGROYW1lKTtcbiAgICAgICAgICBsb2cuZGVidWcoXCJBYm91dCB0byByZW5hbWUgZmlsZSBcIiArIG9sZFBhdGggKyBcIiB0byBcIiArIG5ld1BhdGgpO1xuICAgICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5yZW5hbWUoJHNjb3BlLmJyYW5jaCwgb2xkUGF0aCwgbmV3UGF0aCwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiUmVuYW1lZCBmaWxlIHRvICBcIiArIG5ld05hbWUpO1xuICAgICAgICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMuc3BsaWNlKDAsIDEpO1xuICAgICAgICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZy5jbG9zZSgpO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub3BlblJlbmFtZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBuYW1lID0gbnVsbDtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgIG5hbWUgPSBzZWxlY3RlZC5uYW1lO1xuICAgICAgfVxuICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgJHNjb3BlLnJlbmFtZS5uZXdGaWxlTmFtZSA9IG5hbWU7XG4gICAgICAgICRzY29wZS5vcmlnaW5hbFJlbmFtZUZpbGVQYXRoID0gZ2V0UmVuYW1lRmlsZVBhdGgoKTtcblxuICAgICAgICAkc2NvcGUucmVuYW1lRGlhbG9nID0gV2lraS5nZXRSZW5hbWVEaWFsb2coJGRpYWxvZywgPFdpa2kuUmVuYW1lRGlhbG9nT3B0aW9ucz57XG4gICAgICAgICAgcmVuYW1lOiAoKSA9PiB7ICByZXR1cm4gJHNjb3BlLnJlbmFtZTsgfSxcbiAgICAgICAgICBmaWxlRXhpc3RzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZmlsZUV4aXN0czsgfSxcbiAgICAgICAgICBmaWxlTmFtZTogKCkgPT4geyByZXR1cm4gJHNjb3BlLmZpbGVOYW1lOyB9LFxuICAgICAgICAgIGNhbGxiYWNrczogKCkgPT4geyByZXR1cm4gJHNjb3BlLnJlbmFtZUFuZENsb3NlRGlhbG9nOyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5yZW5hbWVEaWFsb2cub3BlbigpO1xuXG4gICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAkKCcjcmVuYW1lRmlsZU5hbWUnKS5mb2N1cygpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJObyBpdGVtcyBzZWxlY3RlZCByaWdodCBub3chIFwiICsgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUubW92ZUFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIGZpbGVzID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICB2YXIgZmlsZUNvdW50ID0gZmlsZXMubGVuZ3RoO1xuICAgICAgdmFyIG1vdmVGb2xkZXIgPSAkc2NvcGUubW92ZS5tb3ZlRm9sZGVyO1xuICAgICAgdmFyIG9sZEZvbGRlcjpzdHJpbmcgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgaWYgKG1vdmVGb2xkZXIgJiYgZmlsZUNvdW50ICYmIG1vdmVGb2xkZXIgIT09IG9sZEZvbGRlcikge1xuICAgICAgICBsb2cuZGVidWcoXCJNb3ZpbmcgXCIgKyBmaWxlQ291bnQgKyBcIiBmaWxlKHMpIHRvIFwiICsgbW92ZUZvbGRlcik7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChmaWxlcywgKGZpbGUsIGlkeCkgPT4ge1xuICAgICAgICAgIHZhciBvbGRQYXRoID0gb2xkRm9sZGVyICsgXCIvXCIgKyBmaWxlLm5hbWU7XG4gICAgICAgICAgdmFyIG5ld1BhdGggPSBtb3ZlRm9sZGVyICsgXCIvXCIgKyBmaWxlLm5hbWU7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gbW92ZSBcIiArIG9sZFBhdGggKyBcIiB0byBcIiArIG5ld1BhdGgpO1xuICAgICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5yZW5hbWUoJHNjb3BlLmJyYW5jaCwgb2xkUGF0aCwgbmV3UGF0aCwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlkeCArIDEgPT09IGZpbGVDb3VudCkge1xuICAgICAgICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5zcGxpY2UoMCwgZmlsZUNvdW50KTtcbiAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBDb3JlLm1heWJlUGx1cmFsKGZpbGVDb3VudCwgXCJkb2N1bWVudFwiKTtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiTW92ZWQgXCIgKyBtZXNzYWdlICsgXCIgdG8gXCIgKyBuZXdQYXRoKTtcbiAgICAgICAgICAgICAgJHNjb3BlLm1vdmVEaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5tb3ZlRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5mb2xkZXJOYW1lcyA9ICh0ZXh0KSA9PiB7XG4gICAgICByZXR1cm4gd2lraVJlcG9zaXRvcnkuY29tcGxldGVQYXRoKCRzY29wZS5icmFuY2gsIHRleHQsIHRydWUsIG51bGwpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub3Blbk1vdmVEaWFsb2cgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5tb3ZlLm1vdmVGb2xkZXIgPSAkc2NvcGUucGFnZUlkO1xuXG4gICAgICAgICRzY29wZS5tb3ZlRGlhbG9nID0gV2lraS5nZXRNb3ZlRGlhbG9nKCRkaWFsb2csIDxXaWtpLk1vdmVEaWFsb2dPcHRpb25zPntcbiAgICAgICAgICBtb3ZlOiAoKSA9PiB7ICByZXR1cm4gJHNjb3BlLm1vdmU7IH0sXG4gICAgICAgICAgZm9sZGVyTmFtZXM6ICgpID0+IHsgcmV0dXJuICRzY29wZS5mb2xkZXJOYW1lczsgfSxcbiAgICAgICAgICBjYWxsYmFja3M6ICgpID0+IHsgcmV0dXJuICRzY29wZS5tb3ZlQW5kQ2xvc2VEaWFsb2c7IH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLm1vdmVEaWFsb2cub3BlbigpO1xuXG4gICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAkKCcjbW92ZUZvbGRlcicpLmZvY3VzKCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIGl0ZW1zIHNlbGVjdGVkIHJpZ2h0IG5vdyEgXCIgKyAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyk7XG4gICAgICB9XG4gICAgfTtcblxuXG4gICAgc2V0VGltZW91dChtYXliZVVwZGF0ZVZpZXcsIDUwKTtcblxuICAgIGZ1bmN0aW9uIGlzRGlmZlZpZXcoKSB7XG4gICAgICByZXR1cm4gJHJvdXRlUGFyYW1zW1wiZGlmZk9iamVjdElkMVwiXSB8fCAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQyXCJdID8gdHJ1ZSA6IGZhbHNlXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgICAgLy8gVE9ETyByZW1vdmUhXG4gICAgICAgIHZhciBqb2xva2lhID0gbnVsbDtcblxuXG4gICAgICBpZiAoaXNEaWZmVmlldygpKSB7XG4gICAgICAgIHZhciBiYXNlT2JqZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQyXCJdO1xuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZGlmZigkc2NvcGUub2JqZWN0SWQsIGJhc2VPYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgb25GaWxlRGV0YWlscyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCAkc2NvcGUub2JqZWN0SWQsIG9uRmlsZURldGFpbHMpO1xuICAgICAgfVxuICAgICAgV2lraS5sb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMpO1xuICAgIH1cblxuICAgICRzY29wZS51cGRhdGVWaWV3ID0gdXBkYXRlVmlldztcblxuICAgIGZ1bmN0aW9uIHZpZXdDb250ZW50cyhwYWdlTmFtZSwgY29udGVudHMpIHtcbiAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gbnVsbDtcblxuICAgICAgdmFyIGZvcm1hdDpzdHJpbmcgPSBudWxsO1xuICAgICAgaWYgKGlzRGlmZlZpZXcoKSkge1xuICAgICAgICBmb3JtYXQgPSBcImRpZmZcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdChwYWdlTmFtZSwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgfHwgJHNjb3BlLmZvcm1hdDtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcIkZpbGUgZm9ybWF0OiBcIiwgZm9ybWF0KTtcbiAgICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICAgIGNhc2UgXCJpbWFnZVwiOlxuICAgICAgICAgIHZhciBpbWFnZVVSTCA9ICdnaXQvJyArICRzY29wZS5icmFuY2g7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiJHNjb3BlOiBcIiwgJHNjb3BlKTtcbiAgICAgICAgICBpbWFnZVVSTCA9IFVybEhlbHBlcnMuam9pbihpbWFnZVVSTCwgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgICAgdmFyIGludGVycG9sYXRlRnVuYyA9ICRpbnRlcnBvbGF0ZSgkdGVtcGxhdGVDYWNoZS5nZXQoXCJpbWFnZVRlbXBsYXRlLmh0bWxcIikpO1xuICAgICAgICAgICRzY29wZS5odG1sID0gaW50ZXJwb2xhdGVGdW5jKHtcbiAgICAgICAgICAgIGltYWdlVVJMOiBpbWFnZVVSTFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwibWFya2Rvd25cIjpcbiAgICAgICAgICAkc2NvcGUuaHRtbCA9IGNvbnRlbnRzID8gbWFya2VkKGNvbnRlbnRzKSA6IFwiXCI7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJqYXZhc2NyaXB0XCI6XG4gICAgICAgICAgdmFyIGZvcm0gPSBudWxsO1xuICAgICAgICAgIGZvcm0gPSAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdO1xuICAgICAgICAgICRzY29wZS5zb3VyY2UgPSBjb250ZW50cztcbiAgICAgICAgICAkc2NvcGUuZm9ybSA9IGZvcm07XG4gICAgICAgICAgaWYgKGZvcm0pIHtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHRyeSBsb2FkIHRoZSBmb3JtIEpTT04gc28gd2UgY2FuIHRoZW4gcmVuZGVyIHRoZSBmb3JtXG4gICAgICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb3JtLCAkc2NvcGUub2JqZWN0SWQsIChkZXRhaWxzKSA9PiB7XG4gICAgICAgICAgICAgIG9uRm9ybVNjaGVtYShXaWtpLnBhcnNlSnNvbihkZXRhaWxzLnRleHQpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvc291cmNlVmlldy5odG1sXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICRzY29wZS5odG1sID0gbnVsbDtcbiAgICAgICAgICAkc2NvcGUuc291cmNlID0gY29udGVudHM7XG4gICAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL3NvdXJjZVZpZXcuaHRtbFwiO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZvcm1TY2hlbWEoanNvbikge1xuICAgICAgJHNjb3BlLmZvcm1EZWZpbml0aW9uID0ganNvbjtcbiAgICAgIGlmICgkc2NvcGUuc291cmNlKSB7XG4gICAgICAgICRzY29wZS5mb3JtRW50aXR5ID0gV2lraS5wYXJzZUpzb24oJHNjb3BlLnNvdXJjZSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvZm9ybVZpZXcuaHRtbFwiO1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZpbGVEZXRhaWxzKGRldGFpbHMpIHtcbiAgICAgIHZhciBjb250ZW50cyA9IGRldGFpbHMudGV4dDtcbiAgICAgICRzY29wZS5kaXJlY3RvcnkgPSBkZXRhaWxzLmRpcmVjdG9yeTtcbiAgICAgICRzY29wZS5maWxlRGV0YWlscyA9IGRldGFpbHM7XG5cbiAgICAgIGlmIChkZXRhaWxzICYmIGRldGFpbHMuZm9ybWF0KSB7XG4gICAgICAgICRzY29wZS5mb3JtYXQgPSBkZXRhaWxzLmZvcm1hdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5mb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQoJHNjb3BlLnBhZ2VJZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMubW9kZS5uYW1lID0gJHNjb3BlLmZvcm1hdDtcbiAgICAgICRzY29wZS5jaGlsZHJlbiA9IG51bGw7XG5cbiAgICAgIGlmIChkZXRhaWxzLmRpcmVjdG9yeSkge1xuICAgICAgICB2YXIgZGlyZWN0b3JpZXMgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbHRlcigoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRpci5kaXJlY3Rvcnk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgcHJvZmlsZXMgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbHRlcigoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGZpbGVzID0gZGV0YWlscy5jaGlsZHJlbi5maWx0ZXIoKGZpbGUpID0+IHtcbiAgICAgICAgICByZXR1cm4gIWZpbGUuZGlyZWN0b3J5O1xuICAgICAgICB9KTtcbiAgICAgICAgZGlyZWN0b3JpZXMgPSBkaXJlY3Rvcmllcy5zb3J0QnkoKGRpcikgPT4ge1xuICAgICAgICAgIHJldHVybiBkaXIubmFtZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2ZpbGVzID0gcHJvZmlsZXMuc29ydEJ5KChkaXIpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGlyLm5hbWU7XG4gICAgICAgIH0pO1xuICAgICAgICBmaWxlcyA9IGZpbGVzLnNvcnRCeSgoZmlsZSkgPT4ge1xuICAgICAgICAgIHJldHVybiBmaWxlLm5hbWU7XG4gICAgICAgIH0pXG4gICAgICAgICAgLnNvcnRCeSgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGZpbGUubmFtZS5zcGxpdCgnLicpLmxhc3QoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgLy8gQWxzbyBlbnJpY2ggdGhlIHJlc3BvbnNlIHdpdGggdGhlIGN1cnJlbnQgYnJhbmNoLCBhcyB0aGF0J3MgcGFydCBvZiB0aGUgY29vcmRpbmF0ZSBmb3IgbG9jYXRpbmcgdGhlIGFjdHVhbCBmaWxlIGluIGdpdFxuICAgICAgICAkc2NvcGUuY2hpbGRyZW4gPSAoPGFueT5BcnJheSkuY3JlYXRlKGRpcmVjdG9yaWVzLCBwcm9maWxlcywgZmlsZXMpLm1hcCgoZmlsZSkgPT4ge1xuICAgICAgICAgIGZpbGUuYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICAgICAgICBmaWxlLmZpbGVOYW1lID0gZmlsZS5uYW1lO1xuICAgICAgICAgIGlmIChmaWxlLmRpcmVjdG9yeSkge1xuICAgICAgICAgICAgZmlsZS5maWxlTmFtZSArPSBcIi56aXBcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmlsZS5kb3dubG9hZFVSTCA9IFdpa2kuZ2l0UmVzdFVSTCgkc2NvcGUsIGZpbGUucGF0aCk7XG4gICAgICAgICAgcmV0dXJuIGZpbGU7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG5cbiAgICAgICRzY29wZS5odG1sID0gbnVsbDtcbiAgICAgICRzY29wZS5zb3VyY2UgPSBudWxsO1xuICAgICAgJHNjb3BlLnJlYWRNZVBhdGggPSBudWxsO1xuXG4gICAgICAkc2NvcGUuaXNGaWxlID0gZmFsc2U7XG4gICAgICBpZiAoJHNjb3BlLmNoaWxkcmVuKSB7XG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdwYW5lLm9wZW4nKTtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIHJlYWRtZSB0aGVuIGxldHMgcmVuZGVyIGl0Li4uXG4gICAgICAgIHZhciBpdGVtID0gJHNjb3BlLmNoaWxkcmVuLmZpbmQoKGluZm8pID0+IHtcbiAgICAgICAgICB2YXIgbmFtZSA9IChpbmZvLm5hbWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICB2YXIgZXh0ID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAgICAgICByZXR1cm4gbmFtZSAmJiBleHQgJiYgKChuYW1lLnN0YXJ0c1dpdGgoXCJyZWFkbWUuXCIpIHx8IG5hbWUgPT09IFwicmVhZG1lXCIpIHx8IChuYW1lLnN0YXJ0c1dpdGgoXCJpbmRleC5cIikgfHwgbmFtZSA9PT0gXCJpbmRleFwiKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgIHZhciBwYWdlTmFtZSA9IGl0ZW0ucGF0aDtcbiAgICAgICAgICAkc2NvcGUucmVhZE1lUGF0aCA9IHBhZ2VOYW1lO1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGFnZU5hbWUsICRzY29wZS5vYmplY3RJZCwgKHJlYWRtZURldGFpbHMpID0+IHtcbiAgICAgICAgICAgIHZpZXdDb250ZW50cyhwYWdlTmFtZSwgcmVhZG1lRGV0YWlscy50ZXh0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIga3ViZXJuZXRlc0pzb24gPSAkc2NvcGUuY2hpbGRyZW4uZmluZCgoY2hpbGQpID0+IHtcbiAgICAgICAgICB2YXIgbmFtZSA9IChjaGlsZC5uYW1lIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgdmFyIGV4dCA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgICAgICAgcmV0dXJuIG5hbWUgJiYgZXh0ICYmIG5hbWUuc3RhcnRzV2l0aChcImt1YmVybmV0ZXNcIikgJiYgZXh0ID09PSBcImpzb25cIjtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChrdWJlcm5ldGVzSnNvbikge1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwga3ViZXJuZXRlc0pzb24ucGF0aCwgdW5kZWZpbmVkLCAoanNvbikgPT4ge1xuICAgICAgICAgICAgaWYgKGpzb24gJiYganNvbi50ZXh0KSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmt1YmVybmV0ZXNKc29uID0gYW5ndWxhci5mcm9tSnNvbihqc29uLnRleHQpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmt1YmVybmV0ZXNKc29uID0ge1xuICAgICAgICAgICAgICAgICAgZXJyb3JQYXJzaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgZXJyb3I6IGVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRzY29wZS5zaG93QXBwSGVhZGVyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnV2lraS5WaWV3UGFnZS5DaGlsZHJlbicsICRzY29wZS5wYWdlSWQsICRzY29wZS5jaGlsZHJlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgncGFuZS5jbG9zZScpO1xuICAgICAgICB2YXIgcGFnZU5hbWUgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgICB2aWV3Q29udGVudHMocGFnZU5hbWUsIGNvbnRlbnRzKTtcbiAgICAgICAgJHNjb3BlLmlzRmlsZSA9IHRydWU7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrRmlsZUV4aXN0cyhwYXRoKSB7XG4gICAgICAkc2NvcGUub3BlcmF0aW9uQ291bnRlciArPSAxO1xuICAgICAgdmFyIGNvdW50ZXIgPSAkc2NvcGUub3BlcmF0aW9uQ291bnRlcjtcbiAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgIHdpa2lSZXBvc2l0b3J5LmV4aXN0cygkc2NvcGUuYnJhbmNoLCBwYXRoLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgLy8gZmlsdGVyIG9sZCByZXN1bHRzXG4gICAgICAgICAgaWYgKCRzY29wZS5vcGVyYXRpb25Db3VudGVyID09PSBjb3VudGVyKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJjaGVja0ZpbGVFeGlzdHMgZm9yIHBhdGggXCIgKyBwYXRoICsgXCIgZ290IHJlc3VsdCBcIiArIHJlc3VsdCk7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSByZXN1bHQgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gcmVzdWx0ID8gcmVzdWx0Lm5hbWUgOiBudWxsO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbG9nLmRlYnVnKFwiSWdub3Jpbmcgb2xkIHJlc3VsdHMgZm9yIFwiICsgcGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDYWxsZWQgYnkgaGF3dGlvIFRPQyBkaXJlY3RpdmUuLi5cbiAgICAkc2NvcGUuZ2V0Q29udGVudHMgPSAoZmlsZW5hbWUsIGNiKSA9PiB7XG4gICAgICB2YXIgcGFnZUlkID0gZmlsZW5hbWU7XG4gICAgICBpZiAoJHNjb3BlLmRpcmVjdG9yeSkge1xuICAgICAgICBwYWdlSWQgPSAkc2NvcGUucGFnZUlkICsgJy8nICsgZmlsZW5hbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGF0aFBhcnRzID0gJHNjb3BlLnBhZ2VJZC5zcGxpdCgnLycpO1xuICAgICAgICBwYXRoUGFydHMgPSBwYXRoUGFydHMucmVtb3ZlKHBhdGhQYXJ0cy5sYXN0KCkpO1xuICAgICAgICBwYXRoUGFydHMucHVzaChmaWxlbmFtZSk7XG4gICAgICAgIHBhZ2VJZCA9IHBhdGhQYXJ0cy5qb2luKCcvJyk7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoXCJwYWdlSWQ6IFwiLCAkc2NvcGUucGFnZUlkKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImJyYW5jaDogXCIsICRzY29wZS5icmFuY2gpO1xuICAgICAgbG9nLmRlYnVnKFwiZmlsZW5hbWU6IFwiLCBmaWxlbmFtZSk7XG4gICAgICBsb2cuZGVidWcoXCJ1c2luZyBwYWdlSWQ6IFwiLCBwYWdlSWQpO1xuICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYWdlSWQsIHVuZGVmaW5lZCwgKGRhdGEpID0+IHtcbiAgICAgICAgY2IoZGF0YS50ZXh0KTtcbiAgICAgIH0pO1xuICAgIH07XG5cblxuICAgIGZ1bmN0aW9uIGdldFJlbmFtZUZpbGVQYXRoKCkge1xuICAgICAgdmFyIG5ld0ZpbGVOYW1lID0gJHNjb3BlLnJlbmFtZS5uZXdGaWxlTmFtZTtcbiAgICAgIHJldHVybiAoJHNjb3BlLnBhZ2VJZCAmJiBuZXdGaWxlTmFtZSkgPyBVcmxIZWxwZXJzLmpvaW4oJHNjb3BlLnBhZ2VJZCwgbmV3RmlsZU5hbWUpIDogbnVsbDtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IGludGVyZmFjZSBXaWtpRGlhbG9nIHtcbiAgICBvcGVuOiAoKSA9PiB7fTtcbiAgICBjbG9zZTogKCkgPT4ge307XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIFJlbmFtZURpYWxvZ09wdGlvbnMge1xuICAgIHJlbmFtZTogKCkgPT4ge307XG4gICAgZmlsZUV4aXN0czogKCkgPT4ge307XG4gICAgZmlsZU5hbWU6ICgpID0+IFN0cmluZztcbiAgICBjYWxsYmFja3M6ICgpID0+IFN0cmluZztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRSZW5hbWVEaWFsb2coJGRpYWxvZywgJHNjb3BlOlJlbmFtZURpYWxvZ09wdGlvbnMpOldpa2kuV2lraURpYWxvZyB7XG4gICAgcmV0dXJuICRkaWFsb2cuZGlhbG9nKHtcbiAgICAgIHJlc29sdmU6ICRzY29wZSxcbiAgICAgIHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvbW9kYWwvcmVuYW1lRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcInJlbmFtZVwiLCBcImZpbGVFeGlzdHNcIiwgXCJmaWxlTmFtZVwiLCAoJHNjb3BlLCBkaWFsb2csIGNhbGxiYWNrcywgcmVuYW1lLCBmaWxlRXhpc3RzLCBmaWxlTmFtZSkgPT4ge1xuICAgICAgICAkc2NvcGUucmVuYW1lICA9IHJlbmFtZTtcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMgID0gZmlsZUV4aXN0cztcbiAgICAgICAgJHNjb3BlLmZpbGVOYW1lICA9IGZpbGVOYW1lO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUucmVuYW1lQW5kQ2xvc2VEaWFsb2cgPSBjYWxsYmFja3M7XG5cbiAgICAgIH1dXG4gICAgfSk7XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIE1vdmVEaWFsb2dPcHRpb25zIHtcbiAgICBtb3ZlOiAoKSA9PiB7fTtcbiAgICBmb2xkZXJOYW1lczogKCkgPT4ge307XG4gICAgY2FsbGJhY2tzOiAoKSA9PiBTdHJpbmc7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRNb3ZlRGlhbG9nKCRkaWFsb2csICRzY29wZTpNb3ZlRGlhbG9nT3B0aW9ucyk6V2lraS5XaWtpRGlhbG9nIHtcbiAgICByZXR1cm4gJGRpYWxvZy5kaWFsb2coe1xuICAgICAgcmVzb2x2ZTogJHNjb3BlLFxuICAgICAgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9tb2RhbC9tb3ZlRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcIm1vdmVcIiwgXCJmb2xkZXJOYW1lc1wiLCAoJHNjb3BlLCBkaWFsb2csIGNhbGxiYWNrcywgbW92ZSwgZm9sZGVyTmFtZXMpID0+IHtcbiAgICAgICAgJHNjb3BlLm1vdmUgID0gbW92ZTtcbiAgICAgICAgJHNjb3BlLmZvbGRlck5hbWVzICA9IGZvbGRlck5hbWVzO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUubW92ZUFuZENsb3NlRGlhbG9nID0gY2FsbGJhY2tzO1xuXG4gICAgICB9XVxuICAgIH0pO1xuICB9XG5cblxuICBleHBvcnQgaW50ZXJmYWNlIERlbGV0ZURpYWxvZ09wdGlvbnMge1xuICAgIGNhbGxiYWNrczogKCkgPT4gU3RyaW5nO1xuICAgIHNlbGVjdGVkRmlsZUh0bWw6ICgpID0+IFN0cmluZztcbiAgICB3YXJuaW5nOiAoKSA9PiBzdHJpbmc7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXREZWxldGVEaWFsb2coJGRpYWxvZywgJHNjb3BlOkRlbGV0ZURpYWxvZ09wdGlvbnMpOldpa2kuV2lraURpYWxvZyB7XG4gICAgcmV0dXJuICRkaWFsb2cuZGlhbG9nKHtcbiAgICAgIHJlc29sdmU6ICRzY29wZSxcbiAgICAgIHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvbW9kYWwvZGVsZXRlRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcInNlbGVjdGVkRmlsZUh0bWxcIiwgXCJ3YXJuaW5nXCIsICgkc2NvcGUsIGRpYWxvZywgY2FsbGJhY2tzLCBzZWxlY3RlZEZpbGVIdG1sLCB3YXJuaW5nKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRmlsZUh0bWwgPSBzZWxlY3RlZEZpbGVIdG1sO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGVsZXRlQW5kQ2xvc2VEaWFsb2cgPSBjYWxsYmFja3M7XG5cbiAgICAgICAgJHNjb3BlLndhcm5pbmcgPSB3YXJuaW5nO1xuICAgICAgfV1cbiAgICB9KTtcbiAgfVxuXG5cblxuXG5cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuZGlyZWN0aXZlKCd3aWtpSHJlZkFkanVzdGVyJywgW1wiJGxvY2F0aW9uXCIsICgkbG9jYXRpb24pID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgIGxpbms6ICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cikgPT4ge1xuXG4gICAgICAgICRlbGVtZW50LmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIChldmVudCkgPT4ge1xuICAgICAgICAgIHZhciBheXMgPSAkZWxlbWVudC5maW5kKCdhJyk7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGF5cywgKGEpID0+IHtcbiAgICAgICAgICAgIGlmIChhLmhhc0F0dHJpYnV0ZSgnbm8tYWRqdXN0JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYSA9ICQoYSk7XG4gICAgICAgICAgICB2YXIgaHJlZiA9IChhLmF0dHIoJ2hyZWYnKSB8fCBcIlwiKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoaHJlZikge1xuICAgICAgICAgICAgICB2YXIgZmlsZUV4dGVuc2lvbiA9IGEuYXR0cignZmlsZS1leHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gV2lraS5hZGp1c3RIcmVmKCRzY29wZSwgJGxvY2F0aW9uLCBocmVmLCBmaWxlRXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYS5hdHRyKCdocmVmJywgbmV3VmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmFyIGltZ3MgPSAkZWxlbWVudC5maW5kKCdpbWcnKTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goaW1ncywgKGEpID0+IHtcbiAgICAgICAgICAgIGlmIChhLmhhc0F0dHJpYnV0ZSgnbm8tYWRqdXN0JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYSA9ICQoYSk7XG4gICAgICAgICAgICB2YXIgaHJlZiA9IChhLmF0dHIoJ3NyYycpIHx8IFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChocmVmKSB7XG4gICAgICAgICAgICAgIGlmIChocmVmLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XG4gICAgICAgICAgICAgICAgaHJlZiA9IENvcmUudXJsKGhyZWYpO1xuICAgICAgICAgICAgICAgIGEuYXR0cignc3JjJywgaHJlZik7XG5cbiAgICAgICAgICAgICAgICAvLyBsZXRzIGF2b2lkIHRoaXMgZWxlbWVudCBiZWluZyByZXByb2Nlc3NlZFxuICAgICAgICAgICAgICAgIGEuYXR0cignbm8tYWRqdXN0JywgJ3RydWUnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIF9tb2R1bGUuZGlyZWN0aXZlKCd3aWtpVGl0bGVMaW5rZXInLCBbXCIkbG9jYXRpb25cIiwgKCRsb2NhdGlvbikgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgbGluazogKCRzY29wZSwgJGVsZW1lbnQsICRhdHRyKSA9PiB7XG4gICAgICAgIHZhciBsb2FkZWQgPSBmYWxzZTtcblxuICAgICAgICBmdW5jdGlvbiBvZmZzZXRUb3AoZWxlbWVudHMpIHtcbiAgICAgICAgICBpZiAoZWxlbWVudHMpIHtcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSBlbGVtZW50cy5vZmZzZXQoKTtcbiAgICAgICAgICAgIGlmIChvZmZzZXQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mZnNldC50b3A7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2Nyb2xsVG9IYXNoKCkge1xuICAgICAgICAgIHZhciBhbnN3ZXIgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgaWQgPSAkbG9jYXRpb24uc2VhcmNoKClbXCJoYXNoXCJdO1xuICAgICAgICAgIHJldHVybiBzY3JvbGxUb0lkKGlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNjcm9sbFRvSWQoaWQpIHtcbiAgICAgICAgICB2YXIgYW5zd2VyID0gZmFsc2U7XG4gICAgICAgICAgdmFyIGlkID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiaGFzaFwiXTtcbiAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHZhciBzZWxlY3RvciA9ICdhW25hbWU9XCInICsgaWQgKyAnXCJdJztcbiAgICAgICAgICAgIHZhciB0YXJnZXRFbGVtZW50cyA9ICRlbGVtZW50LmZpbmQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKHRhcmdldEVsZW1lbnRzICYmIHRhcmdldEVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB2YXIgc2Nyb2xsRHVyYXRpb24gPSAxO1xuICAgICAgICAgICAgICB2YXIgZGVsdGEgPSBvZmZzZXRUb3AoJCgkZWxlbWVudCkpO1xuICAgICAgICAgICAgICB2YXIgdG9wID0gb2Zmc2V0VG9wKHRhcmdldEVsZW1lbnRzKSAtIGRlbHRhO1xuICAgICAgICAgICAgICBpZiAodG9wIDwgMCkge1xuICAgICAgICAgICAgICAgIHRvcCA9IDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy9sb2cuaW5mbyhcInNjcm9sbGluZyB0byBoYXNoOiBcIiArIGlkICsgXCIgdG9wOiBcIiArIHRvcCArIFwiIGRlbHRhOlwiICsgZGVsdGEpO1xuICAgICAgICAgICAgICAkKCdib2R5LGh0bWwnKS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY3JvbGxUb3A6IHRvcFxuICAgICAgICAgICAgICB9LCBzY3JvbGxEdXJhdGlvbik7XG4gICAgICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvL2xvZy5pbmZvKFwiY291bGQgZmluZCBlbGVtZW50IGZvcjogXCIgKyBzZWxlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGRMaW5rcyhldmVudCkge1xuICAgICAgICAgIHZhciBoZWFkaW5ncyA9ICRlbGVtZW50LmZpbmQoJ2gxLGgyLGgzLGg0LGg1LGg2LGg3Jyk7XG4gICAgICAgICAgdmFyIHVwZGF0ZWQgPSBmYWxzZTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goaGVhZGluZ3MsIChoZSkgPT4ge1xuICAgICAgICAgICAgdmFyIGgxID0gJChoZSk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB0cnkgZmluZCBhIGNoaWxkIGhlYWRlclxuICAgICAgICAgICAgdmFyIGEgPSBoMS5wYXJlbnQoXCJhXCIpO1xuICAgICAgICAgICAgaWYgKCFhIHx8ICFhLmxlbmd0aCkge1xuICAgICAgICAgICAgICB2YXIgdGV4dCA9IGgxLnRleHQoKTtcbiAgICAgICAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gdGV4dC5yZXBsYWNlKC8gL2csIFwiLVwiKTtcbiAgICAgICAgICAgICAgICB2YXIgcGF0aFdpdGhIYXNoID0gXCIjXCIgKyAkbG9jYXRpb24ucGF0aCgpICsgXCI/aGFzaD1cIiArIHRhcmdldDtcbiAgICAgICAgICAgICAgICB2YXIgbGluayA9IENvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIHBhdGhXaXRoSGFzaCwgWydoYXNoJ10pO1xuXG4gICAgICAgICAgICAgICAgLy8gbGV0cyB3cmFwIHRoZSBoZWFkaW5nIGluIGEgbGlua1xuICAgICAgICAgICAgICAgIHZhciBuZXdBID0gJCgnPGEgbmFtZT1cIicgKyB0YXJnZXQgKyAnXCIgaHJlZj1cIicgKyBsaW5rICsgJ1wiIG5nLWNsaWNrPVwib25MaW5rQ2xpY2soKVwiPjwvYT4nKTtcbiAgICAgICAgICAgICAgICBuZXdBLm9uKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxUb0lkKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbmV3QS5pbnNlcnRCZWZvcmUoaDEpO1xuICAgICAgICAgICAgICAgIGgxLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIG5ld0EuYXBwZW5kKGgxKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmICh1cGRhdGVkICYmICFsb2FkZWQpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICBpZiAoc2Nyb2xsVG9IYXNoKCkpIHtcbiAgICAgICAgICAgICAgICBsb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25FdmVudEluc2VydGVkKGV2ZW50KSB7XG4gICAgICAgICAgLy8gYXZvaWQgYW55IG1vcmUgZXZlbnRzIHdoaWxlIHdlIGRvIG91ciB0aGluZ1xuICAgICAgICAgICRlbGVtZW50LnVuYmluZCgnRE9NTm9kZUluc2VydGVkJywgb25FdmVudEluc2VydGVkKTtcbiAgICAgICAgICBhZGRMaW5rcyhldmVudCk7XG4gICAgICAgICAgJGVsZW1lbnQuYmluZCgnRE9NTm9kZUluc2VydGVkJywgb25FdmVudEluc2VydGVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRlbGVtZW50LmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIG9uRXZlbnRJbnNlcnRlZCk7XG4gICAgICB9XG4gICAgfTtcbiAgfV0pO1xuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIERldmVsb3Blci5jdXN0b21Qcm9qZWN0U3ViVGFiRmFjdG9yaWVzLnB1c2goXG4gICAgKGNvbnRleHQpID0+IHtcbiAgICAgIHZhciBwcm9qZWN0TGluayA9IGNvbnRleHQucHJvamVjdExpbms7XG4gICAgICB2YXIgd2lraUxpbmsgPSBudWxsO1xuICAgICAgaWYgKHByb2plY3RMaW5rKSB7XG4gICAgICAgIHdpa2lMaW5rID0gVXJsSGVscGVycy5qb2luKHByb2plY3RMaW5rLCBcIndpa2lcIiwgXCJ2aWV3XCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNWYWxpZDogKCkgPT4gd2lraUxpbmsgJiYgRGV2ZWxvcGVyLmZvcmdlUmVhZHlMaW5rKCksXG4gICAgICAgIGhyZWY6IHdpa2lMaW5rLFxuICAgICAgICBsYWJlbDogXCJTb3VyY2VcIixcbiAgICAgICAgdGl0bGU6IFwiQnJvd3NlIHRoZSBzb3VyY2UgY29kZSBvZiB0aGlzIHByb2plY3RcIlxuICAgICAgfTtcbiAgICB9KTtcblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTb3VyY2VCcmVhZGNydW1icygkc2NvcGUpIHtcbiAgICB2YXIgc291cmNlTGluayA9ICRzY29wZS4kdmlld0xpbmsgfHwgVXJsSGVscGVycy5qb2luKHN0YXJ0TGluaygkc2NvcGUpLCBcInZpZXdcIik7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtcbiAgICAgICAgbGFiZWw6IFwiU291cmNlXCIsXG4gICAgICAgIGhyZWY6IHNvdXJjZUxpbmssXG4gICAgICAgIHRpdGxlOiBcIkJyb3dzZSB0aGUgc291cmNlIGNvZGUgb2YgdGhpcyBwcm9qZWN0XCJcbiAgICAgIH1cbiAgICBdXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlRWRpdGluZ0JyZWFkY3J1bWIoJHNjb3BlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsYWJlbDogXCJFZGl0aW5nXCIsXG4gICAgICAgIHRpdGxlOiBcIkVkaXRpbmcgdGhpcyBmaWxlXCJcbiAgICAgIH07XG4gIH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLyoqXG4gICAqIEBjbGFzcyBHaXRXaWtpUmVwb3NpdG9yeVxuICAgKi9cbiAgZXhwb3J0IGNsYXNzIEdpdFdpa2lSZXBvc2l0b3J5IHtcbiAgICBwdWJsaWMgZGlyZWN0b3J5UHJlZml4ID0gXCJcIjtcbiAgICBwcml2YXRlICRodHRwO1xuICAgIHByaXZhdGUgY29uZmlnO1xuICAgIHByaXZhdGUgYmFzZVVybDtcblxuXG4gICAgY29uc3RydWN0b3IoJHNjb3BlKSB7XG4gICAgICB2YXIgRm9yZ2VBcGlVUkwgPSBLdWJlcm5ldGVzLmluamVjdChcIkZvcmdlQXBpVVJMXCIpO1xuICAgICAgdGhpcy4kaHR0cCA9IEt1YmVybmV0ZXMuaW5qZWN0KFwiJGh0dHBcIik7XG4gICAgICB0aGlzLmNvbmZpZyA9IEZvcmdlLmNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgIHZhciBvd25lciA9ICRzY29wZS5vd25lcjtcbiAgICAgIHZhciByZXBvTmFtZSA9ICRzY29wZS5yZXBvSWQ7XG4gICAgICB2YXIgcHJvamVjdElkID0gJHNjb3BlLnByb2plY3RJZDtcbiAgICAgIHZhciBucyA9ICRzY29wZS5uYW1lc3BhY2UgfHwgS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgdGhpcy5iYXNlVXJsID0gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcInJlcG9zL3Byb2plY3RcIiwgbnMsIHByb2plY3RJZCk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFBhZ2UoYnJhbmNoOnN0cmluZywgcGF0aDpzdHJpbmcsIG9iamVjdElkOnN0cmluZywgZm4pIHtcbiAgICAgIC8vIFRPRE8gaWdub3Jpbmcgb2JqZWN0SWRcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImNvbnRlbnRcIiwgcGF0aCB8fCBcIi9cIiksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgdmFyIGRldGFpbHM6IGFueSA9IG51bGw7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChkYXRhLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghZmlsZS5kaXJlY3RvcnkgJiYgZmlsZS50eXBlID09PSBcImRpclwiKSB7XG4gICAgICAgICAgICAgICAgICBmaWxlLmRpcmVjdG9yeSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgZGV0YWlscyA9IHtcbiAgICAgICAgICAgICAgICBkaXJlY3Rvcnk6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hpbGRyZW46IGRhdGFcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZGV0YWlscyA9IGRhdGE7XG4gICAgICAgICAgICAgIHZhciBjb250ZW50ID0gZGF0YS5jb250ZW50O1xuICAgICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgIGRldGFpbHMudGV4dCA9IGNvbnRlbnQuZGVjb2RlQmFzZTY0KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZuKGRldGFpbHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIHB1dFBhZ2UoYnJhbmNoOnN0cmluZywgcGF0aDpzdHJpbmcsIGNvbnRlbnRzOnN0cmluZywgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IGNvbnRlbnRzO1xuICAgICAgdGhpcy5kb1Bvc3QoVXJsSGVscGVycy5qb2luKFwiY29udGVudFwiLCBwYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIGhpc3Rvcnkgb2YgdGhlIHJlcG9zaXRvcnkgb3IgYSBzcGVjaWZpYyBkaXJlY3Rvcnkgb3IgZmlsZSBwYXRoXG4gICAgICogQG1ldGhvZCBoaXN0b3J5XG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBicmFuY2hcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBsaW1pdFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBoaXN0b3J5KGJyYW5jaDpzdHJpbmcsIG9iamVjdElkOnN0cmluZywgcGF0aDpzdHJpbmcsIGxpbWl0Om51bWJlciwgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAobGltaXQpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcImxpbWl0PVwiICsgbGltaXQ7XG4gICAgICB9XG4gICAgICB2YXIgY29tbWl0SWQgPSBvYmplY3RJZCB8fCBicmFuY2g7XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImhpc3RvcnlcIiwgY29tbWl0SWQsIHBhdGgpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBjb21taXRJbmZvKGNvbW1pdElkOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImNvbW1pdEluZm9cIiwgY29tbWl0SWQpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBjb21taXRUcmVlKGNvbW1pdElkOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImNvbW1pdFRyZWVcIiwgY29tbWl0SWQpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgYSBkaWZmIG9uIHRoZSB2ZXJzaW9uc1xuICAgICAqIEBtZXRob2QgZGlmZlxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYmFzZU9iamVjdElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgZGlmZihvYmplY3RJZDpzdHJpbmcsIGJhc2VPYmplY3RJZDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHZhciBjb25maWc6IGFueSA9IEZvcmdlLmNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgIGNvbmZpZy50cmFuc2Zvcm1SZXNwb25zZSA9IChkYXRhLCBoZWFkZXJzR2V0dGVyLCBzdGF0dXMpID0+IHtcbiAgICAgICAgbG9nLmluZm8oXCJnb3QgZGlmZiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgIH07XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImRpZmZcIiwgb2JqZWN0SWQsIGJhc2VPYmplY3RJZCwgcGF0aCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICB2YXIgZGV0YWlscyA9IHtcbiAgICAgICAgICAgIHRleHQ6IGRhdGEsXG4gICAgICAgICAgICBmb3JtYXQ6IFwiZGlmZlwiLFxuICAgICAgICAgICAgZGlyZWN0b3J5OiBmYWxzZVxuICAgICAgICAgIH07XG4gICAgICAgICAgZm4oZGV0YWlscyk7XG4gICAgICAgIH0sXG4gICAgICAgIG51bGwsIGNvbmZpZyk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGxpc3Qgb2YgYnJhbmNoZXNcbiAgICAgKiBAbWV0aG9kIGJyYW5jaGVzXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBicmFuY2hlcyhmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHRoaXMuZG9HZXQoXCJsaXN0QnJhbmNoZXNcIiwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZXhpc3RzKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBmbik6IEJvb2xlYW4ge1xuICAgICAgdmFyIGFuc3dlciA9IGZhbHNlO1xuICAgICAgdGhpcy5nZXRQYWdlKGJyYW5jaCwgcGF0aCwgbnVsbCwgKGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGRhdGEuZGlyZWN0b3J5KSB7XG4gICAgICAgICAgaWYgKGRhdGEuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICBhbnN3ZXIgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhbnN3ZXIgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGxvZy5pbmZvKFwiZXhpc3RzIFwiICsgcGF0aCArIFwiIGFuc3dlciA9IFwiICsgYW5zd2VyKTtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNGdW5jdGlvbihmbikpIHtcbiAgICAgICAgICBmbihhbnN3ZXIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgfVxuXG4gICAgcHVibGljIHJldmVydFRvKGJyYW5jaDpzdHJpbmcsIG9iamVjdElkOnN0cmluZywgYmxvYlBhdGg6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZXZlcnRpbmcgXCIgKyBibG9iUGF0aCArIFwiIGNvbW1pdCBcIiArIChvYmplY3RJZCB8fCBicmFuY2gpO1xuICAgICAgfVxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgdmFyIGJvZHkgPSBcIlwiO1xuICAgICAgdGhpcy5kb1Bvc3QoVXJsSGVscGVycy5qb2luKFwicmV2ZXJ0XCIsIG9iamVjdElkLCBibG9iUGF0aCB8fCBcIi9cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIHJlbmFtZShicmFuY2g6c3RyaW5nLCBvbGRQYXRoOnN0cmluZywgIG5ld1BhdGg6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW5hbWluZyBwYWdlIFwiICsgb2xkUGF0aCArIFwiIHRvIFwiICsgbmV3UGF0aDtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIGlmIChvbGRQYXRoKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJvbGQ9XCIgKyBlbmNvZGVVUklDb21wb25lbnQob2xkUGF0aCk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IFwiXCI7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJtdlwiLCBuZXdQYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVtb3ZlUGFnZShicmFuY2g6c3RyaW5nLCBwYXRoOnN0cmluZywgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICBpZiAoIWNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgY29tbWl0TWVzc2FnZSA9IFwiUmVtb3ZpbmcgcGFnZSBcIiArIHBhdGg7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IFwiXCI7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJybVwiLCBwYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVtb3ZlUGFnZXMoYnJhbmNoOnN0cmluZywgcGF0aHM6QXJyYXk8c3RyaW5nPiwgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICBpZiAoIWNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgY29tbWl0TWVzc2FnZSA9IFwiUmVtb3ZpbmcgcGFnZVwiICsgKHBhdGhzLmxlbmd0aCA+IDEgPyBcInNcIiA6IFwiXCIpICsgXCIgXCIgKyBwYXRocy5qb2luKFwiLCBcIik7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IHBhdGhzO1xuICAgICAgdGhpcy5kb1Bvc3QoVXJsSGVscGVycy5qb2luKFwicm1cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cblxuICAgIHByaXZhdGUgZG9HZXQocGF0aCwgcXVlcnksIHN1Y2Nlc3NGbiwgZXJyb3JGbiA9IG51bGwsIGNvbmZpZyA9IG51bGwpIHtcbiAgICAgIHZhciB1cmwgPSBGb3JnZS5jcmVhdGVIdHRwVXJsKFVybEhlbHBlcnMuam9pbih0aGlzLmJhc2VVcmwsIHBhdGgpKTtcbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB1cmwgKz0gXCImXCIgKyBxdWVyeTtcbiAgICAgIH1cbiAgICAgIGlmICghZXJyb3JGbikge1xuICAgICAgICBlcnJvckZuID0gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCEgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgIH1cbiAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IHRoaXMuY29uZmlnO1xuICAgICAgfVxuICAgICAgdGhpcy4kaHR0cC5nZXQodXJsLCBjb25maWcpLlxuICAgICAgICBzdWNjZXNzKHN1Y2Nlc3NGbikuXG4gICAgICAgIGVycm9yKGVycm9yRm4pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZG9Qb3N0KHBhdGgsIHF1ZXJ5LCBib2R5LCBzdWNjZXNzRm4sIGVycm9yRm4gPSBudWxsKSB7XG4gICAgICB2YXIgdXJsID0gRm9yZ2UuY3JlYXRlSHR0cFVybChVcmxIZWxwZXJzLmpvaW4odGhpcy5iYXNlVXJsLCBwYXRoKSk7XG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdXJsICs9IFwiJlwiICsgcXVlcnk7XG4gICAgICB9XG4gICAgICBpZiAoIWVycm9yRm4pIHtcbiAgICAgICAgZXJyb3JGbiA9IChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQhIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICB9O1xuXG4gICAgICB9XG4gICAgICB0aGlzLiRodHRwLnBvc3QodXJsLCBib2R5LCB0aGlzLmNvbmZpZykuXG4gICAgICAgIHN1Y2Nlc3Moc3VjY2Vzc0ZuKS5cbiAgICAgICAgZXJyb3IoZXJyb3JGbik7XG4gICAgfVxuXG5cbiAgICBwcml2YXRlIGRvUG9zdEZvcm0ocGF0aCwgcXVlcnksIGJvZHksIHN1Y2Nlc3NGbiwgZXJyb3JGbiA9IG51bGwpIHtcbiAgICAgIHZhciB1cmwgPSBGb3JnZS5jcmVhdGVIdHRwVXJsKFVybEhlbHBlcnMuam9pbih0aGlzLmJhc2VVcmwsIHBhdGgpKTtcbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB1cmwgKz0gXCImXCIgKyBxdWVyeTtcbiAgICAgIH1cbiAgICAgIGlmICghZXJyb3JGbikge1xuICAgICAgICBlcnJvckZuID0gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCEgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgIH1cbiAgICAgIHZhciBjb25maWcgPSBGb3JnZS5jcmVhdGVIdHRwQ29uZmlnKCk7XG4gICAgICBpZiAoIWNvbmZpZy5oZWFkZXJzKSB7XG4gICAgICAgIGNvbmZpZy5oZWFkZXJzID0ge307XG4gICAgICB9XG4gICAgICBjb25maWcuaGVhZGVyc1tcIkNvbnRlbnQtVHlwZVwiXSA9IFwiYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PXV0Zi04XCI7XG5cbiAgICAgIHRoaXMuJGh0dHAucG9zdCh1cmwsIGJvZHksIGNvbmZpZykuXG4gICAgICAgIHN1Y2Nlc3Moc3VjY2Vzc0ZuKS5cbiAgICAgICAgZXJyb3IoZXJyb3JGbik7XG4gICAgfVxuXG5cblxuICAgIHB1YmxpYyBjb21wbGV0ZVBhdGgoYnJhbmNoOnN0cmluZywgY29tcGxldGlvblRleHQ6c3RyaW5nLCBkaXJlY3Rvcmllc09ubHk6Ym9vbGVhbiwgZm4pIHtcbi8qXG4gICAgICByZXR1cm4gdGhpcy5naXQoKS5jb21wbGV0ZVBhdGgoYnJhbmNoLCBjb21wbGV0aW9uVGV4dCwgZGlyZWN0b3JpZXNPbmx5LCBmbik7XG4qL1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZnVsbCBwYXRoIHRvIHVzZSBpbiB0aGUgZ2l0IHJlcG9cbiAgICAgKiBAbWV0aG9kIGdldFBhdGhcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd7XG4gICAgICovXG4gICAgcHVibGljIGdldFBhdGgocGF0aDpzdHJpbmcpIHtcbiAgICAgIHZhciBkaXJlY3RvcnlQcmVmaXggPSB0aGlzLmRpcmVjdG9yeVByZWZpeDtcbiAgICAgIHJldHVybiAoZGlyZWN0b3J5UHJlZml4KSA/IGRpcmVjdG9yeVByZWZpeCArIHBhdGggOiBwYXRoO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRMb2dQYXRoKHBhdGg6c3RyaW5nKSB7XG4gICAgICByZXR1cm4gQ29yZS50cmltTGVhZGluZyh0aGlzLmdldFBhdGgocGF0aCksIFwiL1wiKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgY29udGVudHMgb2YgYSBibG9iUGF0aCBmb3IgYSBnaXZlbiBjb21taXQgb2JqZWN0SWRcbiAgICAgKiBAbWV0aG9kIGdldENvbnRlbnRcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGJsb2JQYXRoXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGdldENvbnRlbnQob2JqZWN0SWQ6c3RyaW5nLCBibG9iUGF0aDpzdHJpbmcsIGZuKSB7XG4vKlxuICAgICAgdmFyIGZ1bGxQYXRoID0gdGhpcy5nZXRMb2dQYXRoKGJsb2JQYXRoKTtcbiAgICAgIHZhciBnaXQgPSB0aGlzLmdpdCgpO1xuICAgICAgaWYgKGdpdCkge1xuICAgICAgICBnaXQuZ2V0Q29udGVudChvYmplY3RJZCwgZnVsbFBhdGgsIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBnaXQ7XG4qL1xuICAgIH1cblxuXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIEpTT04gY29udGVudHMgb2YgdGhlIHBhdGggd2l0aCBvcHRpb25hbCBuYW1lIHdpbGRjYXJkIGFuZCBzZWFyY2hcbiAgICAgKiBAbWV0aG9kIGpzb25DaGlsZENvbnRlbnRzXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVXaWxkY2FyZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzZWFyY2hcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMganNvbkNoaWxkQ29udGVudHMocGF0aDpzdHJpbmcsIG5hbWVXaWxkY2FyZDpzdHJpbmcsIHNlYXJjaDpzdHJpbmcsIGZuKSB7XG4vKlxuICAgICAgdmFyIGZ1bGxQYXRoID0gdGhpcy5nZXRMb2dQYXRoKHBhdGgpO1xuICAgICAgdmFyIGdpdCA9IHRoaXMuZ2l0KCk7XG4gICAgICBpZiAoZ2l0KSB7XG4gICAgICAgIGdpdC5yZWFkSnNvbkNoaWxkQ29udGVudChmdWxsUGF0aCwgbmFtZVdpbGRjYXJkLCBzZWFyY2gsIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBnaXQ7XG4qL1xuICAgIH1cblxuXG4gICAgcHVibGljIGdpdCgpIHtcbi8qXG4gICAgICB2YXIgcmVwb3NpdG9yeSA9IHRoaXMuZmFjdG9yeU1ldGhvZCgpO1xuICAgICAgaWYgKCFyZXBvc2l0b3J5KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTm8gcmVwb3NpdG9yeSB5ZXQhIFRPRE8gd2Ugc2hvdWxkIHVzZSBhIGxvY2FsIGltcGwhXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlcG9zaXRvcnk7XG4qL1xuICAgIH1cbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgdmFyIFRvcExldmVsQ29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuVG9wTGV2ZWxDb250cm9sbGVyXCIsIFsnJHNjb3BlJywgJyRyb3V0ZScsICckcm91dGVQYXJhbXMnLCAoJHNjb3BlLCAkcm91dGUsICRyb3V0ZVBhcmFtcykgPT4ge1xuXG4gIH1dKTtcblxufVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
angular.module("fabric8-console-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/forge/html/command.html","<div ng-controller=\"Forge.CommandController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n<!--\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n-->\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <h3>{{schema.info.description}}</h3>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"executing\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-info\">executing...\n        <i class=\"fa fa-spinner fa-spin\"></i>\n      </p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response\">\n    <div class=\"col-md-12\">\n      <p ng-show=\"response.message\" ng-class=\"responseClass\"><span class=\"response-message\">{{response.message}}</span></p>\n      <p ng-show=\"response.output\" ng-class=\"responseClass\"><span class=\"response-output\">{{response.output}}</span></p>\n      <p ng-show=\"response.err\" ng-class=\"bg-warning\"><span class=\"response-err\">{{response.err}}</span></p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response && !invalid\">\n    <div class=\"col-md-12\">\n      <a class=\"btn btn-primary\" href=\"{{completedLink}}\">Done</a>\n      <a class=\"btn btn-default\" ng-click=\"response = null\" ng-hide=\"wizardCompleted\">Hide</a>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"validationError\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-danger\">{{validationError}}</p>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched && !wizardCompleted\">\n        <div hawtio-form-2=\"schema\" entity=\'entity\'></div>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\" ng-hide=\"wizardCompleted\">\n    <div class=\"col-md-2\">\n    </div>\n    <div class=\"col-md-2\">\n      <button class=\"btn btn-primary\"\n              title=\"Perform this command\"\n              ng-show=\"fetched\"\n              ng-disabled=\"executing\"\n              ng-click=\"execute()\">\n        Execute\n      </button>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/commands.html","<div class=\"row\" ng-controller=\"Forge.CommandsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\" ng-show=\"commands.length\">\n      <span ng-show=\"!id\">\n        Command: <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                                css-class=\"input-xxlarge\"\n                                placeholder=\"Filter commands...\"\n                                save-as=\"fabric8-forge-command-filter\"></hawtio-filter>\n      </span>\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched\">\n        <div ng-hide=\"commands.length\" class=\"align-center\">\n          <p class=\"alert alert-info\">There are no commands available!</p>\n        </div>\n        <div ng-show=\"commands.length\">\n        </div>\n        <div ng-show=\"mode == \'table\'\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && commands.length && mode != \'table\'\">\n    <div class=\"row\">\n      <ul>\n        <li class=\"no-list command-selector-folder\" ng-repeat=\"folder in commandSelector.folders\"\n            ng-show=\"commandSelector.showFolder(folder)\">\n          <div class=\"expandable\" ng-class=\"commandSelector.isOpen(folder)\">\n            <div title=\"{{folder.name}}\" class=\"title\">\n              <i class=\"expandable-indicator folder\"></i> <span class=\"folder-title\"\n                                                                ng-show=\"folder.name\">{{folder.name}}</span><span\n                    class=\"folder-title\" ng-hide=\"folder.name\">Uncategorized</span>\n            </div>\n            <div class=\"expandable-body\">\n              <ul>\n                <li class=\"no-list command\" ng-repeat=\"command in folder.commands\"\n                    ng-show=\"commandSelector.showCommand(command)\">\n                  <div class=\"inline-block command-selector-name\"\n                       ng-class=\"commandSelector.getSelectedClass(command)\">\n                    <span class=\"contained c-max\">\n                      <a href=\"{{command.$link}}\"\n                         title=\"{{command.description}}\">\n                        <span class=\"command-name\">{{command.$shortName}}</span>\n                      </a>\n                    </span>\n                  </div>\n                </li>\n              </ul>\n            </div>\n          </div>\n        </li>\n      </ul>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/createProject.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <style>\n    .createProjectPage {\n      padding-top: 40px;\n    }\n  </style>\n\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\"\n         ng-show=\"login.loggedIn && $runningCDPipeline && $gogsLink && $forgeLink\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <!--\n            <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n\n            <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n              <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n              {{login.user}}\n            </div>\n      -->\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && $runningCDPipeline && (!$gogsLink || !$forgeLink)\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p>Waiting for the <b>CD Pipeline</b> application to startup: &nbsp;&nbsp;<i class=\"fa fa-spinner fa-spin\"></i>\n        </p>\n\n        <ul class=\"pending-pods\">\n          <li class=\"ngCellText\" ng-repeat=\"item in $requiredRCs\">\n            <a ng-href=\"{{item | kubernetesPageLink}}\">\n              <img class=\"app-icon-small\" ng-src=\"{{item.$iconUrl}}\" ng-show=\"item.$iconUrl\">\n              <b>{{item.metadata.name}}</b>\n            </a>\n            <a ng-show=\"item.$podCounters.podsLink\" href=\"{{item.$podCounters.podsLink}}\" title=\"View pods\">\n              <span ng-show=\"item.$podCounters.ready\" class=\"badge badge-success\">{{item.$podCounters.ready}}</span>\n              <span ng-show=\"item.$podCounters.valid\" class=\"badge badge-info\">{{item.$podCounters.valid}}</span>\n              <span ng-show=\"item.$podCounters.waiting\" class=\"badge\">{{item.$podCounters.waiting}}</span>\n              <span ng-show=\"item.$podCounters.error\" class=\"badge badge-warning\">{{item.$podCounters.error}}</span>\n            </a>\n          </li>\n        </ul>\n        <p>Please be patient while the above pods are ready!</p>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && !$runningCDPipeline\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p class=\"text-warning\">You are not running the <b>CD Pipeline</b> application in this workspace.</p>\n\n        <p>To be able to create new projects please run it!</p>\n\n        <p><a href=\"{{$runCDPipelineLink}}\" class=\"btn btn-lg btn-default\">Run the <b>CD Pipeline</b></a></p>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"$runningCDPipeline && $gogsLink && $forgeLink && (!login.authHeader || login.relogin)\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository so that you can create a project</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n        <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"model.fetched || !login.authHeader || login.relogin || !$gogsLink ||!$forgeLink\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && login.authHeader && $gogsLink && $forgeLink\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <div class=\"col-md-6\">\n          <p class=\"align-center\">\n            <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n               ng-show=\"login.loggedIn\"\n               title=\"Create a new project in this workspace using a wizard\">\n              <i class=\"fa fa-plus\"></i> Create Project using Wizard\n            </a>\n          </p>\n\n          <p class=\"align-center\">\n            This wizard guides you though creating a new project, the git repository and the related builds and\n            Continuous\n            Delivery Pipelines.\n          </p>\n        </div>\n\n        <div class=\"col-md-6\">\n          <p class=\"align-center\">\n            <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/buildConfigEdit/\"\n               title=\"Import an existing project from a git source control repository\">\n              <i class=\"fa fa-plus\"></i> Import Project from Git\n            </a>\n          </p>\n\n          <p class=\"align-center\">\n            Import a project which already exists in git\n          </p>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/layoutForge.html","<script type=\"text/ng-template\" id=\"idTemplate.html\">\n  <div class=\"ngCellText\">\n    <a href=\"\"\n       title=\"Execute command {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$link}}\">\n      {{row.entity.name}}</a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoTemplate.html\">\n  <div class=\"ngCellText\">\n    <a title=\"View repository {{row.entity.name}}\"\n       ng-href=\"/forge/repos/{{row.entity.name}}\">\n      {{row.entity.name}}\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoActionsTemplate.html\">\n  <div class=\"ngCellText\">\n    <a ng-show=\"row.entity.$openProjectLink\"\n       class=\"btn btn-primary\" target=\"editor\"\n       title=\"Open project {{row.entity.name}} in an editor\"\n       ng-href=\"{{row.entity.$openProjectLink}}\">\n      <i class=\"fa fa-pencil-square\"></i>\n      Open\n    </a>\n    <a ng-show=\"row.entity.html_url\"\n       class=\"btn btn-default\" target=\"browse\"\n       title=\"Browse project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.html_url}}\">\n      <i class=\"fa fa-external-link\"></i>\n      Repository\n    </a>\n    <a ng-show=\"row.entity.$buildsLink\"\n       class=\"btn btn-default\" target=\"builds\"\n       title=\"View builds for this repository {{row.entity.owner.username}}/{{row.entity.name}}\"\n       ng-href=\"{{row.entity.$buildsLink}}\">\n      <i class=\"fa fa-cog\"></i>\n      Builds\n    </a>\n    <a ng-show=\"row.entity.$commandsLink\"\n       class=\"btn btn-default\"\n       title=\"Commands for project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$commandsLink}}\">\n      <i class=\"fa fa-play-circle\"></i>\n      Run...\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"categoryTemplate.html\">\n  <div class=\"ngCellText\">\n    <span class=\"pod-label badge\"\n          class=\"background-light-grey mouse-pointer\">{{row.entity.category}}</span>\n  </div>\n</script>\n\n<div class=\"row\">\n  <div class=\"wiki-icon-view\">\n    <div class=\"row forge-view\" ng-view></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repo.html","<div class=\"row\" ng-controller=\"Forge.RepoController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\"\n              href=\"/forge/repos\"><i class=\"fa fa-list\"></i></a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.$commandsLink\"\n         class=\"btn btn-default pull-right\"\n         title=\"Commands for project {{entity.name}}\"\n         ng-href=\"{{entity.$commandsLink}}\">\n        <i class=\"fa fa-play-circle\"></i>\n        Run...\n      </a>\n      <span class=\"pull-right\" ng-show=\"entity.$buildsLink\">&nbsp;</span>\n      <a ng-show=\"entity.$buildsLink\"\n         class=\"btn btn-primary pull-right\" target=\"builds\"\n         title=\"View builds for this repository {{entity.owner.username}}/{{entity.name}}\"\n         ng-href=\"{{entity.$buildsLink}}\">\n        <i class=\"fa fa-cog\"></i>\n        Builds\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.html_url\"\n         class=\"btn btn-default pull-right\" target=\"browse\"\n         title=\"Browse project {{entity.name}}\"\n         ng-href=\"{{entity.html_url}}\">\n        <i class=\"fa fa-external-link\"></i>\n        Browse\n      </a>\n    </div>\n  </div>\n\n  <div ng-hide=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n  <div ng-show=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <h3 title=\"repository for {{entity.owner.username}}\">\n          <span ng-show=\"entity.owner.username\">\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              <img src=\"{{entity.owner.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"entity.owner.avatar_url\">\n            </a>\n            &nbsp;\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              {{entity.owner.username}}\n            </a>\n             &nbsp;/&nbsp;\n          </span>\n          {{entity.name}}\n        </h3>\n      </div>\n    </div>\n\n    <div class=\"git-clone-tabs\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div class=\"tabbable\">\n            <div value=\"ssh\" class=\"tab-pane\" title=\"SSH\" ng-show=\"entity.ssh_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>ssh</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.ssh_url}}</code>\n                </pre>\n              </div>\n            </div>\n\n            <div value=\"http\" class=\"tab-pane\" title=\"HTTP\" ng-show=\"entity.clone_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>http</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.clone_url}}</code>\n                </pre>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repos.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                     ng-show=\"projects.length\"\n                     css-class=\"input-xxlarge\"\n                     placeholder=\"Filter repositories...\"></hawtio-filter>\n      <!--\n            <span class=\"pull-right\">&nbsp;</span>\n            <button ng-show=\"fetched\"\n                    class=\"btn btn-danger pull-right\"\n                    ng-disabled=\"tableConfig.selectedItems.length == 0\"\n                    ng-click=\"delete(tableConfig.selectedItems)\">\n              <i class=\"fa fa-remove\"></i> Delete\n            </button>\n      -->\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-primary pull-right\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n         ng-show=\"login.loggedIn\"\n         title=\"Create a new project and repository\">\n        <i class=\"fa fa-plus\"></i> Create Project</a>\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\" ng-show=\"login.loggedIn\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n      <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n        <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n        {{login.user}}\n      </div>\n    </div>\n  </div>\n\n\n  <div ng-show=\"!login.authHeader || login.relogin\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n          <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"fetched || !login.authHeader || login.relogin\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && login.authHeader\">\n    <div ng-hide=\"projects.length\" class=\"align-center\">\n      <div class=\"padded-div\">\n        <div class=\"row\">\n          <div class=\"col-md-12\">\n            <p class=\"alert alert-info\">There are no git repositories yet. Please create one!</p>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-show=\"projects.length\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/main/html/about.html","<div ng-controller=\"Main.About\">\n  <p>Version: {{info.version}}</p>\n  <p>Commit ID: {{info.commitId}}</p>\n  <table class=\"table table-striped\">\n    <thead>\n      <tr>\n        <th>\n          Name\n        </th>\n        <th>\n          Version\n        </th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr ng-repeat=\"(key, info) in info.packages\">\n        <td>{{key}}</td>\n        <td>{{info.version || \'--\'}}</td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n");
$templateCache.put("plugins/wiki/exemplar/document.html","<h2>This is a title</h2>\n\n<p>Here are some notes</p>");
$templateCache.put("plugins/wiki/html/camelCanvas.html","<div ng-controller=\"Wiki.CamelController\">\n  <div ng-controller=\"Wiki.CamelCanvasController\">\n    <div class=\"row\">\n      <div hawtio-breadcrumbs></div>\n    </div>\n\n    <div class=\"wiki-fixed\">\n\n      <ng-include src=\"\'plugins/wiki/html/camelNavBar.html\'\"></ng-include>\n\n      <script type=\"text/ng-template\"\n              id=\"nodeTemplate\">\n        <div class=\"component window\"\n             id=\"{{id}}\"\n             title=\"{{node.tooltip}}\">\n          <div class=\"window-inner {{node.type}}\">\n            <img class=\"nodeIcon\"\n                 title=\"Click and drag to create a connection\"\n                 src=\"{{node.imageUrl}}\">\n          <span class=\"nodeText\"\n                title=\"{{node.label}}\">{{node.label}}</span>\n          </div>\n        </div>\n      </script>\n\n\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <ul class=\"nav nav-tabs\">\n            <li ng-class=\"{active : true}\">\n              <a ng-href=\'{{startLink}}/camel/canvas/{{pageId}}\' title=\"Edit the diagram in a draggy droppy way\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-picture\"></i> Canvas</a></li>\n            <li ng-class=\"{active : false}\">\n              <a href=\'\' ng-click=\'confirmSwitchToTreeView()\' title=\"Switch to the tree based view\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-sitemap\"></i> Tree</a></li>\n\n            <li class=\"pull-right\">\n              <a href=\'\' title=\"Add new pattern node connecting to this pattern\" ng-click=\"addDialog.open()\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-plus\"></i> Add</a></li>\n\n            <li class=\"pull-right\">\n              <a href=\'\' title=\"Automatically layout the diagram \" ng-click=\"doLayout()\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-magic\"></i> Layout</a></li>\n\n            <li class=\"pull-right\" style=\"margin-top: 0; margin-bottom: 0;\">\n            </li>\n\n            <!--\n            <li class=\"pull-right\">\n              <a href=\'\' title=\"Edit the properties for the selected node\" ng-disabled=\"!selectedFolder\"\n                 ng-click=\"propertiesDialog.open()\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-edit\"></i> Properties</a></li>\n                -->\n          </ul>\n\n          <div class=\"modal-large\">\n            <div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n              <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n                <div class=\"modal-header\"><h4>Add Node</h4></div>\n                <div class=\"modal-body\">\n                  <tabset>\n                    <tab heading=\"Patterns\">\n                      <div hawtio-tree=\"paletteTree\" hideRoot=\"true\" onSelect=\"onPaletteSelect\"\n                           activateNodes=\"paletteActivations\"></div>\n                    </tab>\n                    <tab heading=\"Endpoints\">\n                      <div hawtio-tree=\"componentTree\" hideRoot=\"true\" onSelect=\"onComponentSelect\"\n                           activateNodes=\"componentActivations\"></div>\n                    </tab>\n                  </tabset>\n                </div>\n                <div class=\"modal-footer\">\n                  <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\"\n                         ng-disabled=\"!selectedPaletteNode && !selectedComponentNode\"\n                         value=\"Add\">\n                  <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n                </div>\n              </form>\n            </div>\n          </div>\n\n\n          <!--\n          <div modal=\"propertiesDialog.show\" close=\"propertiesDialog.close()\" ng-options=\"propertiesDialog.options\">\n            <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"updatePropertiesAndCloseDialog()\">\n              <div class=\"modal-header\"><h4>Properties</h4></div>\n              <div class=\"modal-body\">\n\n                <div ng-show=\"!selectedEndpoint\"> -->\n          <!-- pattern form --> <!--\n                <div simple-form name=\"formEditor\" entity=\'nodeData\' data=\'nodeModel\' schema=\"schema\"\n                     onsubmit=\"updatePropertiesAndCloseDialog\"></div>\n              </div>\n              <div ng-show=\"selectedEndpoint\"> -->\n          <!-- endpoint form -->\n          <!--\n          <div class=\"control-group\">\n            <label class=\"control-label\" for=\"endpointPath\">Endpoint</label>\n\n            <div class=\"controls\">\n              <input id=\"endpointPath\" class=\"col-md-10\" type=\"text\" ng-model=\"endpointPath\" placeholder=\"name\"\n                     typeahead=\"title for title in endpointCompletions($viewValue) | filter:$viewValue\"\n                     typeahead-editable=\'true\'\n                     min-length=\"1\">\n            </div>\n          </div>\n          <div simple-form name=\"formEditor\" entity=\'endpointParameters\' data=\'endpointSchema\'\n               schema=\"schema\"></div>\n        </div>\n\n\n      </div>\n      <div class=\"modal-footer\">\n        <input class=\"btn btn-primary add\" type=\"submit\" ng-click=\"updatePropertiesAndCloseDialog()\" value=\"OK\">\n        <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"propertiesDialog.close()\">Cancel</button>\n      </div>\n    </form>\n  </div>\n  -->\n\n        </div>\n      </div>\n\n      <div class=\"row\">\n      </div>\n\n      <div class=\"panes gridStyle\">\n        <div class=\"left-pane\">\n          <div class=\"camel-viewport camel-canvas\">\n            <div style=\"position: relative;\" class=\"canvas\"></div>\n          </div>\n        </div>\n        <div class=\"right-pane\">\n          <div class=\"camel-props\">\n            <div class=\"button-bar\">\n              <div class=\"centered\">\n                <form class=\"form-inline\">\n                  <label>Route: </label>\n                  <select ng-model=\"selectedRouteId\" ng-options=\"routeId for routeId in routeIds\"></select>\n                </form>\n                <div class=\"btn-group\">\n                  <button class=\"btn\"\n                          title=\"{{getDeleteTitle()}}\"\n                          ng-click=\"removeNode()\"\n                          data-placement=\"bottom\">\n                    <i class=\"icon-remove\"></i> Delete {{getDeleteTarget()}}\n                  </button>\n                  <button class=\"btn\"\n                          title=\"Apply any changes to the endpoint properties\"\n                          ng-disabled=\"!isFormDirty()\"\n                          ng-click=\"updateProperties()\">\n                    <i class=\"icon-ok\"></i> Apply\n                  </button>\n                  <!-- TODO Would be good to have this too\n                  <button class=\"btn\"\n                          title=\"Clear any changes to the endpoint properties\"\n                          ng-disabled=\"!isFormDirty()\"\n                          ng-click=\"resetForms()\">\n                    <i class=\"icon-remove\"></i> Cancel</button> -->\n                </div>\n              </div>\n            </div>\n            <div class=\"prop-viewport\">\n\n              <div>\n                <!-- pattern form -->\n                <div ng-show=\"!selectedEndpoint\">\n                  <div simple-form\n                       name=\"formEditor\"\n                       entity=\'nodeData\'\n                       data=\'nodeModel\'\n                       schema=\"schema\"\n                       onsubmit=\"updateProperties\"></div>\n                </div>\n\n                <!-- endpoint form -->\n                <div class=\"endpoint-props\" ng-show=\"selectedEndpoint\">\n                  <p>Endpoint</p>\n\n                  <form name=\"endpointForm\">\n                    <div class=\"control-group\">\n                      <label class=\"control-label\" for=\"endpointPath\">URI:</label>\n\n                      <div class=\"controls\">\n                        <input id=\"endpointPath\" class=\"col-md-10\" type=\"text\" ng-model=\"endpointPath\"\n                               placeholder=\"name\"\n                               typeahead=\"title for title in endpointCompletions($viewValue) | filter:$viewValue\"\n                               typeahead-editable=\'true\'\n                               min-length=\"1\">\n                      </div>\n                    </div>\n                  </form>\n\n                  <div simple-form\n                       name=\"formEditor\"\n                       entity=\'endpointParameters\'\n                       data=\'endpointSchema\'\n                       schema=\"schema\"\n                       onsubmit=\"updateProperties\"></div>\n                </div>\n\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n\n      <div hawtio-confirm-dialog=\"switchToTreeView.show\" ok-button-text=\"Yes\" cancel-button-text=\"No\"\n           on-ok=\"doSwitchToTreeView()\" title=\"You have unsaved changes\">\n        <div class=\"dialog-body\">\n          <p>Unsaved changes will be discarded. Do you really want to switch views?</p>\n        </div>\n      </div>\n\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/camelDiagram.html","<div ng-include=\"diagramTemplate\"></div>\n");
$templateCache.put("plugins/wiki/html/camelNavBar.html","<div class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs connected\">\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n        <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n      </li>\n\n      <!--\n              <li class=\"pull-right\">\n                <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this camel configuration\"\n                   data-placement=\"bottom\">\n                  <i class=\"icon-edit\"></i> Edit</a></li>\n              <li class=\"pull-right\" ng-show=\"sourceLink()\">\n      -->\n      <li class=\"pull-right\">\n        <a ng-href=\"\" id=\"saveButton\" ng-disabled=\"!modified\" ng-click=\"save(); $event.stopPropagation();\"\n           ng-class=\"{\'nav-primary\' : modified, \'nav-primary-disabled\' : !modified}\"\n           title=\"Saves the Camel document\">\n          <i class=\"icon-save\"></i> Save</a>\n      </li>\n      <!--<li class=\"pull-right\">-->\n        <!--<a href=\"\" id=\"cancelButton\" ng-click=\"cancel()\"-->\n           <!--title=\"Discards any updates\">-->\n          <!--<i class=\"icon-remove\"></i> Cancel</a>-->\n      <!--</li>-->\n\n      <li class=\"pull-right\">\n        <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n           data-placement=\"bottom\">\n          <i class=\"icon-file-alt\"></i> Source</a>\n      </li>\n    </ul>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/camelProperties.html","<div ng-controller=\"Wiki.CamelController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"wiki-fixed\">\n\n      <ng-include src=\"\'plugins/wiki/html/camelNavBar.html\'\"></ng-include>\n\n      <div class=\"row\">\n        <div class=\"col-md-12\" ng-include=\"\'plugins/wiki/html/camelSubLevelTabs.html\'\"></div>\n      </div>\n\n      <div class=\"row\">\n        <div id=\"tree-container\" class=\"col-md-3\" ng-controller=\"Camel.TreeController\">\n          <div hawtio-tree=\"camelContextTree\" onselect=\"onNodeSelect\" onDragEnter=\"onNodeDragEnter\" onDrop=\"onNodeDrop\"\n               onRoot=\"onRootTreeNode\"\n               hideRoot=\"true\"></div>\n        </div>\n\n        <div class=\"col-md-9\">\n          <div ng-include=\"propertiesTemplate\"></div>\n        </div>\n      </div>\n\n      <div hawtio-confirm-dialog=\"switchToCanvasView.show\" ok-button-text=\"Yes\" cancel-button-text=\"No\"\n           on-ok=\"doSwitchToCanvasView()\" title=\"You have unsaved changes\">\n        <div class=\"dialog-body\">\n          <p>Unsaved changes will be discarded. Do you really want to switch views?</p>\n        </div>\n      </div>\n\n    </div>\n  </div>\n</div>");
$templateCache.put("plugins/wiki/html/camelPropertiesEdit.html","<div simple-form name=\"formEditor\" entity=\'nodeData\' data=\'nodeModel\' schema=\"schema\"></div>\n");
$templateCache.put("plugins/wiki/html/camelSubLevelTabs.html","<ul class=\"nav nav-tabs\">\n  <li ng-class=\"{active : false}\">\n    <a href=\'\' ng-click=\'confirmSwitchToCanvasView()\' title=\"Edit the diagram in a draggy droppy way\"\n        data-placement=\"bottom\">\n      <i class=\"icon-picture\"></i> Canvas</a></li>\n  <li ng-repeat=\"nav in camelSubLevelTabs\" ng-show=\"isValid(nav)\" ng-class=\"{active : isActive(nav)}\">\n    <a ng-href=\"{{nav.href()}}{{hash}}\" title=\"{{nav.title}}\"\n       data-placement=\"bottom\" ng-bind-html-unsafe=\"nav.content\"></a></li>\n\n  <li class=\"pull-right\">\n    <a href=\'\' title=\"Add new pattern node connecting to this pattern\" ng-click=\"addNode()\" data-placement=\"bottom\">\n      <i class=\"icon-plus\"></i> Add</a></li>\n  <li class=\"pull-right\">\n    <a href=\'\' title=\"Deletes the selected pattern\" ng-disabled=\"!canDelete()\" ng-click=\"removeNode()\" data-placement=\"bottom\">\n      <i class=\"icon-remove\"></i> Delete</a></li>\n</ul>\n\n<div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n  <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Add Node</h4></div>\n    <div class=\"modal-body\">\n      <div hawtio-tree=\"paletteTree\" hideRoot=\"true\" onSelect=\"onPaletteSelect\" activateNodes=\"paletteActivations\"></div>\n    </div>\n    <div class=\"modal-footer\">\n      <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\" ng-disabled=\"!selectedPaletteNode\" value=\"Add\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n      </div>\n    </form>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/commit.html","<div ng-controller=\"Wiki.CommitController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\">\n      <a ng-href=\"{{row.entity.fileLink}}\" class=\"file-name text-nowrap\" title=\"{{row.entity.title}}\">\n        <span ng-class=\"row.entity.changeClass\"></span>\n        <span class=\"file-icon\" ng-class=\"row.entity.fileClass\" ng-bind-html=\"row.entity.fileIconHtml\"></span>\n        {{row.entity.path}}\n      </a>\n    </div>\n  </script>\n\n  <div ng-hide=\"inDashboard\" class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div ng-hide=\"inDashboard\" class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n          <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n             title=\"The branch to view\">\n            {{branch || \'branch\'}}\n            <span class=\"caret\"></span>\n          </a>\n          <ul class=\"dropdown-menu\">\n            <li ng-repeat=\"otherBranch in branches\">\n              <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n                 ng-hide=\"otherBranch === branch\"\n                 title=\"Switch to the {{otherBranch}} branch\"\n                 data-placement=\"bottom\">\n                {{otherBranch}}</a>\n            </li>\n          </ul>\n        </li>\n        <li ng-repeat=\"link in breadcrumbs\">\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n        <li>\n          <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n        </li>\n        <li title=\"{{commitInfo.shortMessage}}\" class=\"active\">\n          <a class=\"commit-id\">{{commitInfo.commitHashText}}</a>\n        </li>\n        <li class=\"pull-right\">\n        <span class=\"commit-author\">\n          <i class=\"fa fa-user\"></i> {{commitInfo.author}}\n        </span>\n        </li>\n        <li class=\"pull-right\">\n          <span class=\"commit-date\">{{commitInfo.date | date: dateFormat}}</span>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed row\">\n    <div class=\"commit-message\" title=\"{{commitInfo.shortMessage}}\">\n      {{commitInfo.trimmedMessage}}\n    </div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-4\">\n      <div class=\"control-group\">\n        <button class=\"btn\" ng-disabled=\"!selectedItems.length\" ng-click=\"diff()\"\n                title=\"Compare the selected versions of the files to see how they differ\"><i class=\"fa fa-exchange\"></i>\n          Compare\n        </button>\n\n        <!--\n                <button class=\"btn\" ng-disabled=\"!canRevert()\" ng-click=\"revert()\"\n                        title=\"Revert to this version of the file\"><i class=\"fa fa-exchange\"></i> Revert\n                </button>\n        -->\n      </div>\n    </div>\n    <div class=\"col-md-8\">\n      <div class=\"control-group\">\n        <input class=\"col-md-12 search-query\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n               placeholder=\"search\">\n      </div>\n    </div>\n  </div>\n\n  <div class=\"form-horizontal\">\n    <div class=\"row\">\n      <table class=\"table-condensed table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n    </div>\n  </div>\n\n</div>\n");
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
$templateCache.put("plugins/wiki/html/history.html","<div ng-controller=\"Wiki.HistoryController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div ng-hide=\"inDashboard\" class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n          <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n             title=\"The branch to view\">\n            {{branch || \'branch\'}}\n            <span class=\"caret\"></span>\n          </a>\n          <ul class=\"dropdown-menu\">\n            <li ng-repeat=\"otherBranch in branches\">\n              <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n                 ng-hide=\"otherBranch === branch\"\n                 title=\"Switch to the {{otherBranch}} branch\"\n                 data-placement=\"bottom\">\n                {{otherBranch}}</a>\n            </li>\n          </ul>\n        </li>\n        <li ng-repeat=\"link in breadcrumbs\">\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n        <li class=\"ng-scope active\">\n          <a>History</a>\n        </li>\n\n        <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n          <a class=\"btn\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-click=\"diff()\"\n                  title=\"Compare the selected versions of the files to see how they differ\">\n            <i class=\"fa fa-exchange\"></i> Compare\n          </a>\n        </li>\n        <li class=\"pull-right\">\n          <a class=\"btn\" ng-disabled=\"!canRevert()\" ng-click=\"revert()\"\n                  title=\"Revert to this version of the file\" hawtio-show object-name=\"{{gitMBean}}\"\n                  method-name=\"revertTo\">\n            <i class=\"fa fa-exchange\"></i> Revert\n          </a>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed row\">\n    <div class=\"col-md-12\">\n      <div class=\"control-group\">\n        <input class=\"col-md-12 search-query\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n               placeholder=\"search\">\n      </div>\n    </div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <table class=\"table-condensed table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/layoutWiki.html","<div class=\"row\" ng-controller=\"Wiki.TopLevelController\">\n  <div ng-view></div>\n</div>\n\n");
$templateCache.put("plugins/wiki/html/sourceEdit.html","<textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"entity.source\"></textarea>\n");
$templateCache.put("plugins/wiki/html/sourceView.html","<textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"source\"></textarea>\n");
$templateCache.put("plugins/wiki/html/viewBook.html","<div ng-controller=\"Wiki.ViewController\">\n\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.length}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              ng-bind-html-unsafe=\"fileIconHtml(row)\">\n\n              </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"fa fa-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n\n  </script>\n\n  <ng-include src=\"\'plugins/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"row\">\n      <div class=\"tocify\" wiki-href-adjuster>\n        <!-- TODO we maybe want a more flexible way to find the links to include than the current link-filter -->\n        <div hawtio-toc-display get-contents=\"getContents(filename, cb)\"\n             html=\"html\" link-filter=\"[file-extension]\">\n        </div>\n      </div>\n      <div class=\"toc-content\" id=\"toc-content\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/viewNavBar.html","<div class=\"row\">\n  <div hawtio-breadcrumbs></div>\n</div>\n\n<!--\n<div class=\"row\">\n  <div hawtio-tabs></div>\n</div>\n-->\n<div ng-hide=\"inDashboard\" class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\">\n        <div hawtio-drop-down=\"branchMenuConfig\"></div>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n        <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n          <span class=\"contained c-medium\">{{link.name}}</span>\n        </a>\n      </li>\n      <li ng-show=\"objectId\">\n        <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n      </li>\n      <li ng-show=\"objectId\" class=\"active\">\n        <a>{{objectId}}</a>\n      </li>\n\n      <li class=\"pull-right dropdown\">\n        <a href=\"\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">\n          <i class=\"fa fa-ellipsis-v\"></i>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-show=\"sourceLink()\">\n            <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-file-o\"></i> Source</a>\n          </li>\n          <li>\n            <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-comments-alt\"></i> History</a>\n          </li>\n          <!--\n          <li class=\"divider\">\n          </li>\n          -->\n          <li ng-hide=\"gridOptions.selectedItems.length !== 1\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n            <a ng-click=\"openRenameDialog()\"\n               title=\"Rename the selected document\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-adjust\"></i> Rename</a>\n          </li>\n          <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n            <a ng-click=\"openMoveDialog()\"\n               title=\"move the selected documents to a new folder\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-move\"></i> Move</a>\n          </li>\n          <!--\n          <li class=\"divider\">\n          </li>\n          -->\n          <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"remove\">\n            <a ng-click=\"openDeleteDialog()\"\n               title=\"Delete the selected document(s)\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-remove\"></i> Delete</a>\n          </li>\n          <li class=\"divider\" ng-show=\"childActions.length\">\n          </li>\n          <li ng-repeat=\"childAction in childActions\">\n            <a ng-click=\"childAction.doAction()\"\n               title=\"{{childAction.title}}\"\n               data-placement=\"bottom\">\n              <i class=\"{{childAction.icon}}\"></i> {{childAction.name}}</a>\n          </li>\n        </ul>\n      </li>\n      <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n        <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-edit\"></i> Edit</a>\n      </li>\n      <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n        <a ng-href=\"{{createLink()}}{{hash}}\"\n           title=\"Create new page\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-plus\"></i> Create</a>\n      </li>\n      <li class=\"pull-right\">\n        <div class=\"btn-group\" \n             ng-hide=\"!children || profile\">\n          <a class=\"btn btn-sm\"\n             ng-disabled=\"mode == ViewMode.List\"\n             href=\"\" \n             ng-click=\"setViewMode(ViewMode.List)\">\n            <i class=\"fa fa-list\"></i></a>\n          <a class=\"btn btn-sm\" \n             ng-disabled=\"mode == ViewMode.Icon\"\n             href=\"\" \n             ng-click=\"setViewMode(ViewMode.Icon)\">\n            <i class=\"fa fa-th-large\"></i></a>\n        </div>\n      </li>\n<!--\n      <li class=\"pull-right\">\n        <a href=\"\" ng-hide=\"children || profile\" title=\"Add to dashboard\" ng-href=\"{{createDashboardLink()}}\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-share\"></i>\n        </a>\n      </li>\n-->\n    </ul>\n  </div>\n</div>\n\n\n");
$templateCache.put("plugins/wiki/html/viewPage.html","<div ng-controller=\"Wiki.ViewController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.size}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\" hawtio-file-drop=\"{{row.entity.fileName}}\" download-url=\"{{row.entity.downloadURL}}\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              compile=\"fileIconHtml(row)\">\n        </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"fa fa-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"imageTemplate.html\">\n    <img src=\"{{imageURL}}\">\n  </script>\n\n  <ng-include src=\"\'plugins/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <!-- Icon View -->\n  <div ng-show=\"mode == ViewMode.Icon\" class=\"wiki-fixed\">\n    <div ng-hide=\"!showAppHeader\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div kubernetes-json=\"kubernetesJson\"></div>\n        </div>\n      </div>\n    </div>\n    <div class=\"row\" ng-show=\"html && children\">\n      <div class=\"col-md-12 wiki-icon-view-header\">\n        <h5>Directories and Files</h5>\n      </div>\n    </div>\n    <div class=\"row\" ng-hide=\"!directory\">\n      <div class=\"col-md-12\" ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-icon-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"column-box mouse-pointer well\"\n               ng-repeat=\"child in children track by $index\"\n               ng-class=\"isInGroup(gridOptions.selectedItems, child, \'selected\', \'\')\"\n               ng-click=\"toggleSelectionFromGroup(gridOptions.selectedItems, child)\">\n            <div class=\"row\">\n              <div class=\"col-md-2\" hawtio-file-drop=\"{{child.fileName}}\" download-url=\"{{child.downloadURL}}\">\n                  <span class=\"app-logo\" ng-class=\"fileClass(child)\" compile=\"fileIconHtml(child)\"></span>\n              </div>\n              <div class=\"col-md-10\">\n                <h3>\n                  <a href=\"{{childLink(child)}}\">{{child.displayName || child.name}}</a>\n                </h3>\n              </div>\n            </div>\n            <div class=\"row\" ng-show=\"child.summary\">\n              <div class=\"col-md-12\">\n                <p compile=\"marked(child.summary)\"></p>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n      <div class=\"row\" style=\"margin-left: 10px\">\n        <div class=\"col-md-12\">\n          <div compile=\"html\"></div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end Icon view -->\n\n  <!-- start List view -->\n  <div ng-show=\"mode == ViewMode.List\" class=\"wiki-fixed\">\n    <hawtio-pane position=\"left\" width=\"300\">\n      <div ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-list-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"wiki-grid\" hawtio-list=\"gridOptions\"></div>\n        </div>\n      </div>\n    </hawtio-pane>\n    <div class=\"row\">\n      <div ng-class=\"col-md-12\">\n        <div ng-hide=\"!showProfileHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div fabric-profile-details version-id=\"versionId\" profile-id=\"profileId\"></div>\n              <p></p>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!showAppHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div kubernetes-json=\"kubernetesJson\" children=\"children\"></div>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n          <div class=\"row\" style=\"margin-left: 10px\">\n            <div class=\"col-md-12\">\n              <div compile=\"html\"></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end List view -->\n  <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/deleteDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"deleteAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Delete Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <p>You are about to delete\n          <ng-pluralize count=\"gridOptions.selectedItems.length\"\n                        when=\"{\'1\': \'this document!\', \'other\': \'these {} documents!\'}\">\n          </ng-pluralize>\n        </p>\n\n        <div ng-bind-html-unsafe=\"selectedFileHtml\"></div>\n        <p class=\"alert alert-danger\" ng-show=\"warning\" ng-bind-html-unsafe=\"warning\">\n        </p>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             value=\"Delete\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/moveDialog.html","<div>\n    <form class=\"form-horizontal\" ng-submit=\"moveAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Move Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"moveFolder\">Folder</label>\n\n        <div class=\"controls\">\n          <input type=\"text\" id=\"moveFolder\" ng-model=\"move.moveFolder\"\n                 typeahead=\"title for title in folderNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!move.moveFolder\"\n             value=\"Move\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>");
$templateCache.put("plugins/wiki/html/modal/renameDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"renameAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Rename Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"row\">\n        <div class=\"form-group\">\n          <label class=\"col-sm-2 control-label\" for=\"renameFileName\">Name</label>\n\n          <div class=\"col-sm-10\">\n            <input type=\"text\" id=\"renameFileName\" ng-model=\"rename.newFileName\">\n          </div>\n        </div>\n\n        <div class=\"form-group\">\n          <div ng-show=\"fileExists.exists\" class=\"alert\">\n            Please choose a different name as <b>{{fileExists.name}}</b> already exists\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!fileName || fileExists.exists\"\n             value=\"Rename\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");}]); hawtioPluginLoader.addModule("fabric8-console-templates");