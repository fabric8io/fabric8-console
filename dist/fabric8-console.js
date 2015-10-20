

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
    function commandApiUrl(ForgeApiURL, commandId, resourcePath) {
        if (resourcePath === void 0) { resourcePath = null; }
        return UrlHelpers.join(ForgeApiURL, "command", commandId, resourcePath);
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
    function commandInputApiUrl(ForgeApiURL, commandId, resourcePath) {
        return UrlHelpers.join(ForgeApiURL, "commandInput", commandId, resourcePath);
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
        var config = {};
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
        var authHeader = localStorage["gogsAuthorization"];
        return authHeader ? Forge.loggedInToGogs : false;
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
                    var status = ((data || {}).status || "").toString().toLowerCase();
                    $scope.responseClass = toBackgroundStyle(status);
                    var fullName = ((data || {}).outputProperties || {}).fullName;
                    if ($scope.response && fullName && $scope.id === 'project-new') {
                        $scope.response = null;
                        var projectId = fullName.replace('/', "-");
                        var editPath = UrlHelpers.join(Developer.projectLink(projectId), "/forge/command/devops-edit/user", fullName);
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
                var url = Forge.commandInputApiUrl(ForgeApiURL, commandId, resourcePath);
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
        var url = UrlHelpers.join(ForgeApiURL, "commands", $scope.resourcePath);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLmpzIiwiZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VQbHVnaW4udHMiLCJmb3JnZS90cy9jb21tYW5kLnRzIiwiZm9yZ2UvdHMvY29tbWFuZHMudHMiLCJmb3JnZS90cy9yZXBvLnRzIiwiZm9yZ2UvdHMvcmVwb3MudHMiLCJtYWluL3RzL21haW5HbG9iYWxzLnRzIiwibWFpbi90cy9tYWluUGx1Z2luLnRzIiwibWFpbi90cy9hYm91dC50cyJdLCJuYW1lcyI6WyJGb3JnZSIsIkZvcmdlLmlzRm9yZ2UiLCJGb3JnZS5pbml0U2NvcGUiLCJGb3JnZS5jb21tYW5kTGluayIsIkZvcmdlLmNvbW1hbmRzTGluayIsIkZvcmdlLnJlcG9zQXBpVXJsIiwiRm9yZ2UucmVwb0FwaVVybCIsIkZvcmdlLmNvbW1hbmRBcGlVcmwiLCJGb3JnZS5leGVjdXRlQ29tbWFuZEFwaVVybCIsIkZvcmdlLnZhbGlkYXRlQ29tbWFuZEFwaVVybCIsIkZvcmdlLmNvbW1hbmRJbnB1dEFwaVVybCIsIkZvcmdlLm1vZGVsUHJvamVjdCIsIkZvcmdlLnNldE1vZGVsQ29tbWFuZHMiLCJGb3JnZS5nZXRNb2RlbENvbW1hbmRzIiwiRm9yZ2UubW9kZWxDb21tYW5kSW5wdXRNYXAiLCJGb3JnZS5nZXRNb2RlbENvbW1hbmRJbnB1dHMiLCJGb3JnZS5zZXRNb2RlbENvbW1hbmRJbnB1dHMiLCJGb3JnZS5lbnJpY2hSZXBvIiwiRm9yZ2UuY3JlYXRlSHR0cENvbmZpZyIsIkZvcmdlLmFkZFF1ZXJ5QXJndW1lbnQiLCJGb3JnZS5jcmVhdGVIdHRwVXJsIiwiRm9yZ2UuY29tbWFuZE1hdGNoZXNUZXh0IiwiRm9yZ2UuaXNMb2dnZWRJbnRvR29ncyIsIkZvcmdlLnJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkIiwiRm9yZ2Uub25Sb3V0ZUNoYW5nZWQiLCJGb3JnZS51cGRhdGVTY2hlbWEiLCJGb3JnZS52YWxpZGF0ZSIsIkZvcmdlLnRvQmFja2dyb3VuZFN0eWxlIiwiRm9yZ2UudXBkYXRlRGF0YSIsIkZvcmdlLm9uU2NoZW1hTG9hZCIsIkZvcmdlLmNvbW1hbmRNYXRjaGVzIiwiRm9yZ2UuZG9EZWxldGUiLCJGb3JnZS51cGRhdGVMaW5rcyIsIk1haW4iXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUNBQSxJQUFPLEtBQUssQ0F1Tlg7QUF2TkQsV0FBTyxLQUFLLEVBQUMsQ0FBQztJQUVEQSxhQUFPQSxHQUFHQSw4QkFBOEJBLENBQUNBO0lBRXpDQSxVQUFJQSxHQUFHQSxHQUFHQSxHQUFHQSxhQUFPQSxDQUFDQTtJQUNyQkEsZ0JBQVVBLEdBQUdBLE9BQU9BLENBQUNBO0lBQ3JCQSxnQkFBVUEsR0FBR0EsZ0JBQWdCQSxDQUFDQTtJQUM5QkEsa0JBQVlBLEdBQUdBLGdCQUFVQSxHQUFHQSxPQUFPQSxDQUFDQTtJQUNwQ0EsU0FBR0EsR0FBa0JBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLGdCQUFVQSxDQUFDQSxDQUFDQTtJQUU1Q0Esb0JBQWNBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsQ0FBQ0E7SUFFNUNBLHFCQUFlQSxHQUFHQSxVQUFVQSxDQUFDQSxlQUFlQSxDQUFDQTtJQUM3Q0Esc0JBQWdCQSxHQUFHQSxPQUFPQSxDQUFDQTtJQUUzQkEsb0JBQWNBLEdBQUdBLEtBQUtBLENBQUNBO0lBRWxDQSxTQUFnQkEsT0FBT0EsQ0FBQ0EsU0FBU0E7UUFDL0JDLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO0lBQ2RBLENBQUNBO0lBRmVELGFBQU9BLEdBQVBBLE9BRWZBLENBQUFBO0lBRURBLFNBQWdCQSxTQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQTtRQUN2REUsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsWUFBWUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDM0NBLE1BQU1BLENBQUNBLGNBQWNBLEdBQUdBLFNBQVNBLENBQUNBLGFBQWFBLEVBQUVBLENBQUNBO1FBQ2xEQSxN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QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFFbkNBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO1FBQ2xEQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxZQUFZQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtRQUN2Q0EsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsRUFBRUEsQ0FBQ0E7UUFDckJBLElBQUlBLFNBQVNBLEdBQUdBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQy9DQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxJQUFJQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNsQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsU0FBU0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDcERBLENBQUNBO1FBR0RBLGVBQVNBLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLFlBQVlBLENBQUNBLENBQUNBO1FBQzNDQSxtQ0FBNkJBLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1FBRWpEQSxNQUFNQSxDQUFDQSxhQUFhQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQTtRQUMzQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFFdkJBLENBQUNBO1FBQ0RBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLGtCQUFZQSxDQUFDQSxNQUFNQSxDQUFDQSxZQUFZQSxFQUFFQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUMxRUEsTUFBTUEsQ0FBQ0EsYUFBYUEsR0FBR0EsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0Es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Q0EsQ0FBQ0E7QUFDTEEsQ0FBQ0EsRUFKTSxJQUFJLEtBQUosSUFBSSxRQUlWIiwiZmlsZSI6ImNvbXBpbGVkLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsLCIvLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBjb250ZXh0ID0gJy93b3Jrc3BhY2VzLzpuYW1lc3BhY2UvZm9yZ2UnO1xuXG4gIGV4cG9ydCB2YXIgaGFzaCA9ICcjJyArIGNvbnRleHQ7XG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9ICdGb3JnZSc7XG4gIGV4cG9ydCB2YXIgcGx1Z2luUGF0aCA9ICdwbHVnaW5zL2ZvcmdlLyc7XG4gIGV4cG9ydCB2YXIgdGVtcGxhdGVQYXRoID0gcGx1Z2luUGF0aCArICdodG1sLyc7XG4gIGV4cG9ydCB2YXIgbG9nOkxvZ2dpbmcuTG9nZ2VyID0gTG9nZ2VyLmdldChwbHVnaW5OYW1lKTtcblxuICBleHBvcnQgdmFyIGRlZmF1bHRJY29uVXJsID0gQ29yZS51cmwoXCIvaW1nL2ZvcmdlLnN2Z1wiKTtcblxuICBleHBvcnQgdmFyIGdvZ3NTZXJ2aWNlTmFtZSA9IEt1YmVybmV0ZXMuZ29nc1NlcnZpY2VOYW1lO1xuICBleHBvcnQgdmFyIG9yaW9uU2VydmljZU5hbWUgPSBcIm9yaW9uXCI7XG5cbiAgZXhwb3J0IHZhciBsb2dnZWRJblRvR29ncyA9IGZhbHNlO1xuXG4gIGV4cG9ydCBmdW5jdGlvbiBpc0ZvcmdlKHdvcmtzcGFjZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKSB7XG4gICAgJHNjb3BlLnByb2plY3RJZCA9ICRyb3V0ZVBhcmFtc1tcInByb2plY3RcIl07XG4gICAgJHNjb3BlLiR3b3Jrc3BhY2VMaW5rID0gRGV2ZWxvcGVyLndvcmtzcGFjZUxpbmsoKTtcbiAgICAkc2NvcGUuJHByb2plY3RMaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RCcmVhZGNydW1icygkc2NvcGUucHJvamVjdElkKTtcbiAgICAkc2NvcGUuc3ViVGFiQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTdWJOYXZCYXJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRMaW5rKHByb2plY3RJZCwgbmFtZSwgcmVzb3VyY2VQYXRoKSB7XG4gICAgdmFyIGxpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsocHJvamVjdElkKTtcbiAgICBpZiAobmFtZSkge1xuICAgICAgaWYgKHJlc291cmNlUGF0aCkge1xuICAgICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmRcIiwgbmFtZSwgcmVzb3VyY2VQYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZC9cIiwgbmFtZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsIHByb2plY3RJZCkge1xuICAgIHZhciBsaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCk7XG4gICAgaWYgKHJlc291cmNlUGF0aCkge1xuICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihsaW5rLCBcIi9mb3JnZS9jb21tYW5kcy91c2VyXCIsIHJlc291cmNlUGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZHNcIik7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHJlcG9zQXBpVXJsKEZvcmdlQXBpVVJMKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCIvcmVwb3NcIik7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgcGF0aCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiL3JlcG9zL3VzZXJcIiwgcGF0aCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkLCByZXNvdXJjZVBhdGggPSBudWxsKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kXCIsIGNvbW1hbmRJZCwgcmVzb3VyY2VQYXRoKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBleGVjdXRlQ29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kXCIsIFwiZXhlY3V0ZVwiLCBjb21tYW5kSWQpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kXCIsIFwidmFsaWRhdGVcIiwgY29tbWFuZElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kSW5wdXRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kSW5wdXRcIiwgY29tbWFuZElkLCByZXNvdXJjZVBhdGgpO1xuICB9XG5cblxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBwcm9qZWN0IGZvciB0aGUgZ2l2ZW4gcmVzb3VyY2UgcGF0aFxuICAgKi9cbiAgZnVuY3Rpb24gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCkge1xuICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgIHZhciBwcm9qZWN0ID0gRm9yZ2VNb2RlbC5wcm9qZWN0c1tyZXNvdXJjZVBhdGhdO1xuICAgICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICAgIHByb2plY3QgPSB7fTtcbiAgICAgICAgRm9yZ2VNb2RlbC5wcm9qZWN0c1tyZXNvdXJjZVBhdGhdID0gcHJvamVjdDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9qZWN0O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gRm9yZ2VNb2RlbC5yb290UHJvamVjdDtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gc2V0TW9kZWxDb21tYW5kcyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgsIGNvbW1hbmRzKSB7XG4gICAgdmFyIHByb2plY3QgPSBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICBwcm9qZWN0LiRjb21tYW5kcyA9IGNvbW1hbmRzO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgdmFyIHByb2plY3QgPSBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICByZXR1cm4gcHJvamVjdC4kY29tbWFuZHMgfHwgW107XG4gIH1cblxuICBmdW5jdGlvbiBtb2RlbENvbW1hbmRJbnB1dE1hcChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpIHtcbiAgICB2YXIgcHJvamVjdCA9IG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHZhciBjb21tYW5kSW5wdXRzID0gcHJvamVjdC4kY29tbWFuZElucHV0cztcbiAgICBpZiAoIWNvbW1hbmRJbnB1dHMpIHtcbiAgICAgIGNvbW1hbmRJbnB1dHMgPSB7fTtcbiAgICAgIHByb2plY3QuJGNvbW1hbmRJbnB1dHMgPSBjb21tYW5kSW5wdXRzO1xuICAgIH1cbiAgICByZXR1cm4gY29tbWFuZElucHV0cztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlbENvbW1hbmRJbnB1dHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoLCBpZCkge1xuICAgIHZhciBjb21tYW5kSW5wdXRzID0gbW9kZWxDb21tYW5kSW5wdXRNYXAoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICByZXR1cm4gY29tbWFuZElucHV0c1tpZF07XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gc2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCwgaWQsIGl0ZW0pIHtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IG1vZGVsQ29tbWFuZElucHV0TWFwKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHNbaWRdID0gaXRlbTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBlbnJpY2hSZXBvKHJlcG8pIHtcbiAgICB2YXIgb3duZXIgPSByZXBvLm93bmVyIHx8IHt9O1xuICAgIHZhciB1c2VyID0gb3duZXIudXNlcm5hbWUgfHwgcmVwby51c2VyO1xuICAgIHZhciBuYW1lID0gcmVwby5uYW1lO1xuICAgIHZhciBwcm9qZWN0SWQgPSBuYW1lO1xuICAgIHZhciBhdmF0YXJfdXJsID0gb3duZXIuYXZhdGFyX3VybDtcbiAgICBpZiAoYXZhdGFyX3VybCAmJiBhdmF0YXJfdXJsLnN0YXJ0c1dpdGgoXCJodHRwLy9cIikpIHtcbiAgICAgIGF2YXRhcl91cmwgPSBcImh0dHA6Ly9cIiArIGF2YXRhcl91cmwuc3Vic3RyaW5nKDYpO1xuICAgICAgb3duZXIuYXZhdGFyX3VybCA9IGF2YXRhcl91cmw7XG4gICAgfVxuICAgIGlmICh1c2VyICYmIG5hbWUpIHtcbiAgICAgIHZhciByZXNvdXJjZVBhdGggPSB1c2VyICsgXCIvXCIgKyBuYW1lO1xuICAgICAgcmVwby4kY29tbWFuZHNMaW5rID0gY29tbWFuZHNMaW5rKHJlc291cmNlUGF0aCwgcHJvamVjdElkKTtcbiAgICAgIHJlcG8uJGJ1aWxkc0xpbmsgPSBcIi9rdWJlcm5ldGVzL2J1aWxkcz9xPS9cIiArIHJlc291cmNlUGF0aCArIFwiLmdpdFwiO1xuICAgICAgdmFyIGluamVjdG9yID0gSGF3dGlvQ29yZS5pbmplY3RvcjtcbiAgICAgIGlmIChpbmplY3Rvcikge1xuICAgICAgICB2YXIgU2VydmljZVJlZ2lzdHJ5ID0gaW5qZWN0b3IuZ2V0KFwiU2VydmljZVJlZ2lzdHJ5XCIpO1xuICAgICAgICBpZiAoU2VydmljZVJlZ2lzdHJ5KSB7XG4gICAgICAgICAgdmFyIG9yaW9uTGluayA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhvcmlvblNlcnZpY2VOYW1lKTtcbiAgICAgICAgICB2YXIgZ29nc1NlcnZpY2UgPSBTZXJ2aWNlUmVnaXN0cnkuZmluZFNlcnZpY2UoZ29nc1NlcnZpY2VOYW1lKTtcbiAgICAgICAgICBpZiAob3Jpb25MaW5rICYmIGdvZ3NTZXJ2aWNlKSB7XG4gICAgICAgICAgICB2YXIgcG9ydGFsSXAgPSBnb2dzU2VydmljZS5wb3J0YWxJUDtcbiAgICAgICAgICAgIGlmIChwb3J0YWxJcCkge1xuICAgICAgICAgICAgICB2YXIgcG9ydCA9IGdvZ3NTZXJ2aWNlLnBvcnQ7XG4gICAgICAgICAgICAgIHZhciBwb3J0VGV4dCA9IChwb3J0ICYmIHBvcnQgIT09IDgwICYmIHBvcnQgIT09IDQ0MykgPyBcIjpcIiArIHBvcnQgOiBcIlwiO1xuICAgICAgICAgICAgICB2YXIgcHJvdG9jb2wgPSAocG9ydCAmJiBwb3J0ID09PSA0NDMpID8gXCJodHRwczovL1wiIDogXCJodHRwOi8vXCI7XG4gICAgICAgICAgICAgIHZhciBnaXRDbG9uZVVybCA9IFVybEhlbHBlcnMuam9pbihwcm90b2NvbCArIHBvcnRhbElwICsgcG9ydFRleHQgKyBcIi9cIiwgcmVzb3VyY2VQYXRoICsgXCIuZ2l0XCIpO1xuXG4gICAgICAgICAgICAgIHJlcG8uJG9wZW5Qcm9qZWN0TGluayA9IFVybEhlbHBlcnMuam9pbihvcmlvbkxpbmssXG4gICAgICAgICAgICAgICAgXCIvZ2l0L2dpdC1yZXBvc2l0b3J5Lmh0bWwjLGNyZWF0ZVByb2plY3QubmFtZT1cIiArIG5hbWUgKyBcIixjbG9uZUdpdD1cIiArIGdpdENsb25lVXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlSHR0cENvbmZpZygpIHtcbiAgICB2YXIgYXV0aEhlYWRlciA9IGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdO1xuICAgIHZhciBlbWFpbCA9IGxvY2FsU3RvcmFnZVtcImdvZ3NFbWFpbFwiXTtcbiAgICB2YXIgY29uZmlnID0ge1xuLypcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYXV0aEhlYWRlcixcbiAgICAgICAgRW1haWw6IGVtYWlsXG4gICAgICB9XG4qL1xuICAgIH07XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZFF1ZXJ5QXJndW1lbnQodXJsLCBuYW1lLCB2YWx1ZSkge1xuICAgIGlmICh1cmwgJiYgbmFtZSAmJiB2YWx1ZSkge1xuICAgICAgdmFyIHNlcCA9ICAodXJsLmluZGV4T2YoXCI/XCIpID49IDApID8gXCImXCIgOiBcIj9cIjtcbiAgICAgIHJldHVybiB1cmwgKyBzZXAgKyAgbmFtZSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVIdHRwVXJsKHVybCwgYXV0aEhlYWRlciA9IG51bGwsIGVtYWlsID0gbnVsbCkge1xuICAgIGF1dGhIZWFkZXIgPSBhdXRoSGVhZGVyIHx8IGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdO1xuICAgIGVtYWlsID0gZW1haWwgfHwgbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdO1xuXG4gICAgdXJsID0gYWRkUXVlcnlBcmd1bWVudCh1cmwsIFwiX2dvZ3NBdXRoXCIsIGF1dGhIZWFkZXIpO1xuICAgIHVybCA9IGFkZFF1ZXJ5QXJndW1lbnQodXJsLCBcIl9nb2dzRW1haWxcIiwgZW1haWwpO1xuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY29tbWFuZE1hdGNoZXNUZXh0KGNvbW1hbmQsIGZpbHRlclRleHQpIHtcbiAgICBpZiAoZmlsdGVyVGV4dCkge1xuICAgICAgcmV0dXJuIENvcmUubWF0Y2hGaWx0ZXJJZ25vcmVDYXNlKGFuZ3VsYXIudG9Kc29uKGNvbW1hbmQpLCBmaWx0ZXJUZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGlzTG9nZ2VkSW50b0dvZ3MoKSB7XG4gICAgdmFyIGF1dGhIZWFkZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICByZXR1cm4gYXV0aEhlYWRlciA/IGxvZ2dlZEluVG9Hb2dzIDogZmFsc2U7XG4vKlxuICAgIHZhciBjb25maWcgPSBjcmVhdGVIdHRwQ29uZmlnKCk7XG4gICAgcmV0dXJuIGNvbmZpZy5oZWFkZXJzLkF1dGhvcml6YXRpb24gPyB0cnVlIDogZmFsc2U7XG4qL1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkKCRzY29wZSwgJGxvY2F0aW9uKSB7XG4gICAgaWYgKCFpc0xvZ2dlZEludG9Hb2dzKCkpIHtcbiAgICAgIHZhciBkZXZMaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgdmFyIGxvZ2luUGFnZSA9IFVybEhlbHBlcnMuam9pbihkZXZMaW5rLCBcImZvcmdlL3JlcG9zXCIpO1xuICAgICAgbG9nLmluZm8oXCJOb3QgbG9nZ2VkIGluIHNvIHJlZGlyZWN0aW5nIHRvIFwiICsgbG9naW5QYWdlKTtcbiAgICAgICRsb2NhdGlvbi5wYXRoKGxvZ2luUGFnZSlcbiAgICB9XG4gIH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgWydoYXd0aW8tY29yZScsICdoYXd0aW8tdWknXSk7XG4gIGV4cG9ydCB2YXIgY29udHJvbGxlciA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlQ29udHJvbGxlckZ1bmN0aW9uKF9tb2R1bGUsIHBsdWdpbk5hbWUpO1xuICBleHBvcnQgdmFyIHJvdXRlID0gUGx1Z2luSGVscGVycy5jcmVhdGVSb3V0aW5nRnVuY3Rpb24odGVtcGxhdGVQYXRoKTtcblxuICBfbW9kdWxlLmNvbmZpZyhbJyRyb3V0ZVByb3ZpZGVyJywgKCRyb3V0ZVByb3ZpZGVyOm5nLnJvdXRlLklSb3V0ZVByb3ZpZGVyKSA9PiB7XG5cbiAgICBjb25zb2xlLmxvZyhcIkxpc3RlbmluZyBvbjogXCIgKyBVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9jcmVhdGVQcm9qZWN0JykpO1xuXG4gICAgJHJvdXRlUHJvdmlkZXIud2hlbihVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9jcmVhdGVQcm9qZWN0JyksIHJvdXRlKCdjcmVhdGVQcm9qZWN0Lmh0bWwnLCBmYWxzZSkpXG4gICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9yZXBvcy86cGF0aConKSwgcm91dGUoJ3JlcG8uaHRtbCcsIGZhbHNlKSlcbiAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL3JlcG9zJyksIHJvdXRlKCdyZXBvcy5odG1sJywgZmFsc2UpKTtcblxuICAgIGFuZ3VsYXIuZm9yRWFjaChbY29udGV4dCwgJy93b3Jrc3BhY2VzLzpuYW1lc3BhY2UvcHJvamVjdHMvOnByb2plY3QvZm9yZ2UnXSwgKHBhdGgpID0+IHtcbiAgICAgICRyb3V0ZVByb3ZpZGVyXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmRzJyksIHJvdXRlKCdjb21tYW5kcy5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kcy86cGF0aConKSwgcm91dGUoJ2NvbW1hbmRzLmh0bWwnLCBmYWxzZSkpXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmQvOmlkJyksIHJvdXRlKCdjb21tYW5kLmh0bWwnLCBmYWxzZSkpXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmQvOmlkLzpwYXRoKicpLCByb3V0ZSgnY29tbWFuZC5odG1sJywgZmFsc2UpKTtcbiAgICB9KTtcblxuICB9XSk7XG5cbiAgX21vZHVsZS5mYWN0b3J5KCdGb3JnZUFwaVVSTCcsIFsnJHEnLCAnJHJvb3RTY29wZScsICgkcTpuZy5JUVNlcnZpY2UsICRyb290U2NvcGU6bmcuSVJvb3RTY29wZVNlcnZpY2UpID0+IHtcbiAgICByZXR1cm4gS3ViZXJuZXRlcy5rdWJlcm5ldGVzQXBpVXJsKCkgKyBcIi9wcm94eVwiICsgS3ViZXJuZXRlcy5rdWJlcm5ldGVzTmFtZXNwYWNlUGF0aCgpICsgXCIvc2VydmljZXMvZmFicmljOC1mb3JnZS9hcGkvZm9yZ2VcIjtcbiAgfV0pO1xuXG5cbiAgX21vZHVsZS5mYWN0b3J5KCdGb3JnZU1vZGVsJywgWyckcScsICckcm9vdFNjb3BlJywgKCRxOm5nLklRU2VydmljZSwgJHJvb3RTY29wZTpuZy5JUm9vdFNjb3BlU2VydmljZSkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICByb290UHJvamVjdDoge30sXG4gICAgICBwcm9qZWN0czogW11cbiAgICB9XG4gIH1dKTtcblxuICBfbW9kdWxlLnJ1bihbJ3ZpZXdSZWdpc3RyeScsICdIYXd0aW9OYXYnLCAodmlld1JlZ2lzdHJ5LCBIYXd0aW9OYXYpID0+IHtcbiAgICB2aWV3UmVnaXN0cnlbJ2ZvcmdlJ10gPSB0ZW1wbGF0ZVBhdGggKyAnbGF5b3V0Rm9yZ2UuaHRtbCc7XG4gIH1dKTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIuYWRkTW9kdWxlKHBsdWdpbk5hbWUpO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIENvbW1hbmRDb250cm9sbGVyID0gY29udHJvbGxlcihcIkNvbW1hbmRDb250cm9sbGVyXCIsXG4gICAgW1wiJHNjb3BlXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJGb3JnZU1vZGVsXCIsXG4gICAgICAoJHNjb3BlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXMsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwpID0+IHtcblxuICAgICAgICAkc2NvcGUubW9kZWwgPSBGb3JnZU1vZGVsO1xuXG4gICAgICAgICRzY29wZS5yZXNvdXJjZVBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdIHx8ICRsb2NhdGlvbi5zZWFyY2goKVtcInBhdGhcIl0gfHwgXCJcIjtcbiAgICAgICAgJHNjb3BlLmlkID0gJHJvdXRlUGFyYW1zW1wiaWRcIl07XG4gICAgICAgICRzY29wZS5wYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXTtcblxuICAgICAgICAkc2NvcGUuYXZhdGFyX3VybCA9IGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl07XG4gICAgICAgICRzY29wZS51c2VyID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl07XG4gICAgICAgICRzY29wZS5yZXBvTmFtZSA9IFwiXCI7XG4gICAgICAgIHZhciBwYXRoU3RlcHMgPSAkc2NvcGUucmVzb3VyY2VQYXRoLnNwbGl0KFwiL1wiKTtcbiAgICAgICAgaWYgKHBhdGhTdGVwcyAmJiBwYXRoU3RlcHMubGVuZ3RoKSB7XG4gICAgICAgICAgJHNjb3BlLnJlcG9OYW1lID0gcGF0aFN0ZXBzW3BhdGhTdGVwcy5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuICAgICAgICByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cbiAgICAgICAgJHNjb3BlLiRjb21wbGV0ZUxpbmsgPSAkc2NvcGUuJHByb2plY3RMaW5rO1xuICAgICAgICBpZiAoJHNjb3BlLnByb2plY3RJZCkge1xuXG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmNvbW1hbmRzTGluayA9IGNvbW1hbmRzTGluaygkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUucHJvamVjdElkKTtcbiAgICAgICAgJHNjb3BlLmNvbXBsZXRlZExpbmsgPSAkc2NvcGUucHJvamVjdElkID8gVXJsSGVscGVycy5qb2luKCRzY29wZS4kcHJvamVjdExpbmssIFwiZW52aXJvbm1lbnRzXCIpIDogJHNjb3BlLiRwcm9qZWN0TGluaztcblxuICAgICAgICAkc2NvcGUuZW50aXR5ID0ge1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuaW5wdXRMaXN0ID0gWyRzY29wZS5lbnRpdHldO1xuXG4gICAgICAgICRzY29wZS5zY2hlbWEgPSBnZXRNb2RlbENvbW1hbmRJbnB1dHMoRm9yZ2VNb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLmlkKTtcbiAgICAgICAgb25TY2hlbWFMb2FkKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gb25Sb3V0ZUNoYW5nZWQoKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJyb3V0ZSB1cGRhdGVkOyBsZXRzIGNsZWFyIHRoZSBlbnRpdHlcIik7XG4gICAgICAgICAgJHNjb3BlLmVudGl0eSA9IHtcbiAgICAgICAgICB9O1xuICAgICAgICAgICRzY29wZS5pbnB1dExpc3QgPSBbJHNjb3BlLmVudGl0eV07XG4gICAgICAgICAgJHNjb3BlLnByZXZpb3VzU2NoZW1hSnNvbiA9IFwiXCI7XG4gICAgICAgICAgJHNjb3BlLnNjaGVtYSA9IG51bGw7XG4gICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuJG9uKCckcm91dGVDaGFuZ2VTdWNjZXNzJywgb25Sb3V0ZUNoYW5nZWQpO1xuXG4gICAgICAgICRzY29wZS5leGVjdXRlID0gKCkgPT4ge1xuICAgICAgICAgIC8vIFRPRE8gY2hlY2sgaWYgdmFsaWQuLi5cbiAgICAgICAgICAkc2NvcGUucmVzcG9uc2UgPSBudWxsO1xuICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSB0cnVlO1xuICAgICAgICAgICRzY29wZS5pbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25FcnJvciA9IG51bGw7XG4gICAgICAgICAgdmFyIGNvbW1hbmRJZCA9ICRzY29wZS5pZDtcbiAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICB2YXIgdXJsID0gZXhlY3V0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCk7XG4gICAgICAgICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICAgICAgICByZXNvdXJjZTogcmVzb3VyY2VQYXRoLFxuICAgICAgICAgICAgaW5wdXRMaXN0OiAkc2NvcGUuaW5wdXRMaXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICAgICAgbG9nLmluZm8oXCJBYm91dCB0byBwb3N0IHRvIFwiICsgdXJsICsgXCIgcGF5bG9hZDogXCIgKyBhbmd1bGFyLnRvSnNvbihyZXF1ZXN0KSk7XG4gICAgICAgICAgJGh0dHAucG9zdCh1cmwsIHJlcXVlc3QsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICRzY29wZS5pbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uRXJyb3IgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIGRhdGEubWVzc2FnZSA9IGRhdGEubWVzc2FnZSB8fCBkYXRhLm91dHB1dDtcbiAgICAgICAgICAgICAgICB2YXIgd2l6YXJkUmVzdWx0cyA9IGRhdGEud2l6YXJkUmVzdWx0cztcbiAgICAgICAgICAgICAgICBpZiAod2l6YXJkUmVzdWx0cykge1xuICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHdpemFyZFJlc3VsdHMuc3RlcFZhbGlkYXRpb25zLCAodmFsaWRhdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoISRzY29wZS5pbnZhbGlkICYmICF2YWxpZGF0aW9uLnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2VzID0gdmFsaWRhdGlvbi5tZXNzYWdlcyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG1lc3NhZ2VzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmludmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbkVycm9yID0gbWVzc2FnZS5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25JbnB1dCA9IG1lc3NhZ2UuaW5wdXROYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3RlcElucHV0cyA9IHdpemFyZFJlc3VsdHMuc3RlcElucHV0cztcbiAgICAgICAgICAgICAgICAgIGlmIChzdGVwSW5wdXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2hlbWEgPSBfLmxhc3Qoc3RlcElucHV0cyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZW50aXR5ID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgdXBkYXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gbGV0cyBjb3B5IGFjcm9zcyBhbnkgZGVmYXVsdCB2YWx1ZXMgZnJvbSB0aGUgc2NoZW1hXG4gICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYVtcInByb3BlcnRpZXNcIl0sIChwcm9wZXJ0eSwgbmFtZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gcHJvcGVydHkudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nLmluZm8oXCJBZGRpbmcgZW50aXR5LlwiICsgbmFtZSArIFwiID0gXCIgKyB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHlbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaW5wdXRMaXN0LnB1c2goJHNjb3BlLmVudGl0eSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5jYW5Nb3ZlVG9OZXh0U3RlcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0cyBjbGVhciB0aGUgcmVzcG9uc2Ugd2UndmUgYW5vdGhlciB3aXphcmQgcGFnZSB0byBkb1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG90aGVyd2lzZSBpbmRpY2F0ZSB0aGF0IHRoZSB3aXphcmQganVzdCBjb21wbGV0ZWQgYW5kIGxldHMgaGlkZSB0aGUgaW5wdXQgZm9ybVxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndpemFyZENvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICghJHNjb3BlLmludmFsaWQpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2UgPSBkYXRhO1xuICAgICAgICAgICAgICAgIHZhciBzdGF0dXMgPSAoKGRhdGEgfHwge30pLnN0YXR1cyB8fCBcIlwiKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlc3BvbnNlQ2xhc3MgPSB0b0JhY2tncm91bmRTdHlsZShzdGF0dXMpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGZ1bGxOYW1lID0gKChkYXRhIHx8IHt9KS5vdXRwdXRQcm9wZXJ0aWVzIHx8IHt9KS5mdWxsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnJlc3BvbnNlICYmIGZ1bGxOYW1lICYmICRzY29wZS5pZCA9PT0gJ3Byb2plY3QtbmV3Jykge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIC8vIGxldHMgZm9yd2FyZCB0byB0aGUgZGV2b3BzIGVkaXQgcGFnZVxuICAgICAgICAgICAgICAgICAgdmFyIHByb2plY3RJZCA9IGZ1bGxOYW1lLnJlcGxhY2UoJy8nLCBcIi1cIik7XG4gICAgICAgICAgICAgICAgICB2YXIgZWRpdFBhdGggPSBVcmxIZWxwZXJzLmpvaW4oRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCksIFwiL2ZvcmdlL2NvbW1hbmQvZGV2b3BzLWVkaXQvdXNlclwiLCBmdWxsTmFtZSk7XG4gICAgICAgICAgICAgICAgICBsb2cuaW5mbyhcIk1vdmluZyB0byB0aGUgZGV2b3BzIGVkaXQgcGF0aDogXCIgKyBlZGl0UGF0aCk7XG4gICAgICAgICAgICAgICAgICAkbG9jYXRpb24ucGF0aChlZGl0UGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9KS5cbiAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgIGxvZy53YXJuKFwiRmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIiBcIiArIGRhdGEgKyBcIiBcIiArIHN0YXR1cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbihcImVudGl0eVwiLCAoKSA9PiB7XG4gICAgICAgICAgdmFsaWRhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlU2NoZW1hKHNjaGVtYSkge1xuICAgICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICAgIC8vIGxldHMgcmVtb3ZlIHRoZSB2YWx1ZXMgc28gdGhhdCB3ZSBjYW4gcHJvcGVybHkgY2hlY2sgd2hlbiB0aGUgc2NoZW1hIHJlYWxseSBkb2VzIGNoYW5nZVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBzY2hlbWEgd2lsbCBjaGFuZ2UgZXZlcnkgdGltZSB3ZSB0eXBlIGEgY2hhcmFjdGVyIDspXG4gICAgICAgICAgICB2YXIgc2NoZW1hV2l0aG91dFZhbHVlcyA9IGFuZ3VsYXIuY29weShzY2hlbWEpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYVdpdGhvdXRWYWx1ZXMucHJvcGVydGllcywgKHByb3BlcnR5KSA9PiB7XG4gICAgICAgICAgICAgIGRlbGV0ZSBwcm9wZXJ0eVtcInZhbHVlXCJdO1xuICAgICAgICAgICAgICBkZWxldGUgcHJvcGVydHlbXCJlbmFibGVkXCJdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIganNvbiA9IGFuZ3VsYXIudG9Kc29uKHNjaGVtYVdpdGhvdXRWYWx1ZXMpO1xuICAgICAgICAgICAgaWYgKGpzb24gIT09ICRzY29wZS5wcmV2aW91c1NjaGVtYUpzb24pIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVkIHNjaGVtYTogXCIgKyBqc29uKTtcbiAgICAgICAgICAgICAgJHNjb3BlLnByZXZpb3VzU2NoZW1hSnNvbiA9IGpzb247XG4gICAgICAgICAgICAgICRzY29wZS5zY2hlbWEgPSBzY2hlbWE7XG5cbiAgICAgICAgICAgICAgaWYgKCRzY29wZS5pZCA9PT0gXCJwcm9qZWN0LW5ld1wiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVudGl0eSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgICAgICAgLy8gbGV0cyBoaWRlIHRoZSB0YXJnZXQgbG9jYXRpb24hXG4gICAgICAgICAgICAgICAgdmFyIHByb3BlcnRpZXMgPSBzY2hlbWEucHJvcGVydGllcyB8fCB7fTtcbiAgICAgICAgICAgICAgICB2YXIgb3ZlcndyaXRlID0gcHJvcGVydGllcy5vdmVyd3JpdGU7XG4gICAgICAgICAgICAgICAgdmFyIGNhdGFsb2cgPSBwcm9wZXJ0aWVzLmNhdGFsb2c7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldExvY2F0aW9uID0gcHJvcGVydGllcy50YXJnZXRMb2NhdGlvbjtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0TG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgIHRhcmdldExvY2F0aW9uLmhpZGRlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBpZiAob3ZlcndyaXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJ3cml0ZS5oaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJoaWRpbmcgdGFyZ2V0TG9jYXRpb24hXCIpO1xuXG4gICAgICAgICAgICAgICAgICAvLyBsZXRzIGRlZmF1bHQgdGhlIHR5cGVcbiAgICAgICAgICAgICAgICAgIGlmICghZW50aXR5LnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5LnR5cGUgPSBcIkZyb20gQXJjaGV0eXBlIENhdGFsb2dcIjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhdGFsb2cpIHtcbiAgICAgICAgICAgICAgICAgIGlmICghZW50aXR5LmNhdGFsb2cpIHtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5LmNhdGFsb2cgPSBcImZhYnJpYzhcIjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB2YWxpZGF0ZSgpIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLmV4ZWN1dGluZyB8fCAkc2NvcGUudmFsaWRhdGluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbmV3SnNvbiA9IGFuZ3VsYXIudG9Kc29uKCRzY29wZS5lbnRpdHkpO1xuICAgICAgICAgIGlmIChuZXdKc29uID09PSAkc2NvcGUudmFsaWRhdGVkRW50aXR5SnNvbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUudmFsaWRhdGVkRW50aXR5SnNvbiA9IG5ld0pzb247XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBjb21tYW5kSWQgPSAkc2NvcGUuaWQ7XG4gICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgdmFyIHVybCA9IHZhbGlkYXRlQ29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkKTtcbiAgICAgICAgICAvLyBsZXRzIHB1dCB0aGUgZW50aXR5IGluIHRoZSBsYXN0IGl0ZW0gaW4gdGhlIGxpc3RcbiAgICAgICAgICB2YXIgaW5wdXRMaXN0ID0gW10uY29uY2F0KCRzY29wZS5pbnB1dExpc3QpO1xuICAgICAgICAgIGlucHV0TGlzdFtpbnB1dExpc3QubGVuZ3RoIC0gMV0gPSAkc2NvcGUuZW50aXR5O1xuICAgICAgICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgICAgICAgcmVzb3VyY2U6IHJlc291cmNlUGF0aCxcbiAgICAgICAgICAgIGlucHV0TGlzdDogJHNjb3BlLmlucHV0TGlzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgICAgIC8vbG9nLmluZm8oXCJBYm91dCB0byBwb3N0IHRvIFwiICsgdXJsICsgXCIgcGF5bG9hZDogXCIgKyBhbmd1bGFyLnRvSnNvbihyZXF1ZXN0KSk7XG4gICAgICAgICAgJHNjb3BlLnZhbGlkYXRpbmcgPSB0cnVlO1xuICAgICAgICAgICRodHRwLnBvc3QodXJsLCByZXF1ZXN0LCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgdGhpcy52YWxpZGF0aW9uID0gZGF0YTtcbiAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcImdvdCB2YWxpZGF0aW9uIFwiICsgYW5ndWxhci50b0pzb24oZGF0YSwgdHJ1ZSkpO1xuICAgICAgICAgICAgICB2YXIgd2l6YXJkUmVzdWx0cyA9IGRhdGEud2l6YXJkUmVzdWx0cztcbiAgICAgICAgICAgICAgaWYgKHdpemFyZFJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3RlcElucHV0cyA9IHdpemFyZFJlc3VsdHMuc3RlcElucHV0cztcbiAgICAgICAgICAgICAgICBpZiAoc3RlcElucHV0cykge1xuICAgICAgICAgICAgICAgICAgdmFyIHNjaGVtYSA9IF8ubGFzdChzdGVwSW5wdXRzKTtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVNjaGVtYShzY2hlbWEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuXG4gICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAqIExldHMgdGhyb3R0bGUgdGhlIHZhbGlkYXRpb25zIHNvIHRoYXQgd2Ugb25seSBmaXJlIGFub3RoZXIgdmFsaWRhdGlvbiBhIGxpdHRsZVxuICAgICAgICAgICAgICAgKiBhZnRlciB3ZSd2ZSBnb3QgYSByZXBseSBhbmQgb25seSBpZiB0aGUgbW9kZWwgaGFzIGNoYW5nZWQgc2luY2UgdGhlblxuICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGUoKTtcbiAgICAgICAgICAgICAgfSwgMjAwKTtcbiAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgbG9nLndhcm4oXCJGYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiIFwiICsgZGF0YSArIFwiIFwiICsgc3RhdHVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdXBkYXRlRGF0YSgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIHRvQmFja2dyb3VuZFN0eWxlKHN0YXR1cykge1xuICAgICAgICAgIGlmICghc3RhdHVzKSB7XG4gICAgICAgICAgICBzdGF0dXMgPSBcIlwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc3RhdHVzLnN0YXJ0c1dpdGgoXCJzdWNcIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcImJnLXN1Y2Nlc3NcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiYmctd2FybmluZ1wiXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVEYXRhKCkge1xuICAgICAgICAgICRzY29wZS5pdGVtID0gbnVsbDtcbiAgICAgICAgICB2YXIgY29tbWFuZElkID0gJHNjb3BlLmlkO1xuICAgICAgICAgIGlmIChjb21tYW5kSWQpIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgICAgdmFyIHVybCA9IGNvbW1hbmRJbnB1dEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkLCByZXNvdXJjZVBhdGgpO1xuICAgICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgICAgICAgJGh0dHAuZ2V0KHVybCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVEYXRhIGxvYWRlZCBzY2hlbWFcIik7XG4gICAgICAgICAgICAgICAgICB1cGRhdGVTY2hlbWEoZGF0YSk7XG4gICAgICAgICAgICAgICAgICBzZXRNb2RlbENvbW1hbmRJbnB1dHMoRm9yZ2VNb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLmlkLCAkc2NvcGUuc2NoZW1hKTtcbiAgICAgICAgICAgICAgICAgIG9uU2NoZW1hTG9hZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgICB9KS5cbiAgICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oXCJGYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiIFwiICsgZGF0YSArIFwiIFwiICsgc3RhdHVzKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25TY2hlbWFMb2FkKCkge1xuICAgICAgICAgIC8vIGxldHMgdXBkYXRlIHRoZSB2YWx1ZSBpZiBpdHMgYmxhbmsgd2l0aCB0aGUgZGVmYXVsdCB2YWx1ZXMgZnJvbSB0aGUgcHJvcGVydGllc1xuICAgICAgICAgIHZhciBzY2hlbWEgPSAkc2NvcGUuc2NoZW1hO1xuICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gc2NoZW1hO1xuICAgICAgICAgIHZhciBlbnRpdHkgPSAkc2NvcGUuZW50aXR5O1xuICAgICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWEucHJvcGVydGllcywgKHByb3BlcnR5LCBrZXkpID0+IHtcbiAgICAgICAgICAgICAgdmFyIHZhbHVlID0gcHJvcGVydHkudmFsdWU7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZSAmJiAhZW50aXR5W2tleV0pIHtcbiAgICAgICAgICAgICAgICBlbnRpdHlba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIENvbW1hbmRzQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJDb21tYW5kc0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGRpYWxvZ1wiLCBcIiR3aW5kb3dcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRsb2NhdGlvblwiLCBcImxvY2FsU3RvcmFnZVwiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLCBcIkZvcmdlTW9kZWxcIixcbiAgICAoJHNjb3BlLCAkZGlhbG9nLCAkd2luZG93LCAkdGVtcGxhdGVDYWNoZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgbG9jYWxTdG9yYWdlLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMLCBGb3JnZU1vZGVsKSA9PiB7XG5cbiAgICAgICRzY29wZS5tb2RlbCA9IEZvcmdlTW9kZWw7XG4gICAgICAkc2NvcGUucmVzb3VyY2VQYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXSB8fCAkbG9jYXRpb24uc2VhcmNoKClbXCJwYXRoXCJdIHx8IFwiXCI7XG4gICAgICAkc2NvcGUucmVwb05hbWUgPSBcIlwiO1xuICAgICAgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbiA9ICRzY29wZS5yZXNvdXJjZVBhdGggfHwgXCJcIjtcbiAgICAgIHZhciBwYXRoU3RlcHMgPSAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uLnNwbGl0KFwiL1wiKTtcbiAgICAgIGlmIChwYXRoU3RlcHMgJiYgcGF0aFN0ZXBzLmxlbmd0aCkge1xuICAgICAgICAkc2NvcGUucmVwb05hbWUgPSBwYXRoU3RlcHNbcGF0aFN0ZXBzLmxlbmd0aCAtIDFdO1xuICAgICAgfVxuICAgICAgaWYgKCEkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uLnN0YXJ0c1dpdGgoXCIvXCIpICYmICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24ubGVuZ3RoID4gMCkge1xuICAgICAgICAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uID0gXCIvXCIgKyAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuYXZhdGFyX3VybCA9IGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl07XG4gICAgICAkc2NvcGUudXNlciA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdO1xuXG4gICAgICAkc2NvcGUuY29tbWFuZHMgPSBnZXRNb2RlbENvbW1hbmRzKEZvcmdlTW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgpO1xuICAgICAgJHNjb3BlLmZldGNoZWQgPSAkc2NvcGUuY29tbWFuZHMubGVuZ3RoICE9PSAwO1xuXG4gICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG4gICAgICByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cblxuICAgICAgJHNjb3BlLnRhYmxlQ29uZmlnID0ge1xuICAgICAgICBkYXRhOiAnY29tbWFuZHMnLFxuICAgICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgbXVsdGlTZWxlY3Q6IHRydWUsXG4gICAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICAgZmlsdGVyVGV4dDogJGxvY2F0aW9uLnNlYXJjaCgpW1wicVwiXSB8fCAnJ1xuICAgICAgICB9LFxuICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICduYW1lJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTmFtZScsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcImlkVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0Rlc2NyaXB0aW9uJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdjYXRlZ29yeScsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0NhdGVnb3J5J1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gY29tbWFuZE1hdGNoZXMoY29tbWFuZCkge1xuICAgICAgICB2YXIgZmlsdGVyVGV4dCA9ICRzY29wZS50YWJsZUNvbmZpZy5maWx0ZXJPcHRpb25zLmZpbHRlclRleHQ7XG4gICAgICAgIHJldHVybiBjb21tYW5kTWF0Y2hlc1RleHQoY29tbWFuZCwgZmlsdGVyVGV4dCk7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3IgPSB7XG4gICAgICAgIGZpbHRlclRleHQ6IFwiXCIsXG4gICAgICAgIGZvbGRlcnM6IFtdLFxuICAgICAgICBzZWxlY3RlZENvbW1hbmRzOiBbXSxcbiAgICAgICAgZXhwYW5kZWRGb2xkZXJzOiB7fSxcblxuICAgICAgICBpc09wZW46IChmb2xkZXIpID0+IHtcbiAgICAgICAgICB2YXIgZmlsdGVyVGV4dCA9ICRzY29wZS50YWJsZUNvbmZpZy5maWx0ZXJPcHRpb25zLmZpbHRlclRleHQ7XG4gICAgICAgICAgaWYgKGZpbHRlclRleHQgIT09ICcnIHx8ICRzY29wZS5jb21tYW5kU2VsZWN0b3IuZXhwYW5kZWRGb2xkZXJzW2ZvbGRlci5pZF0pIHtcbiAgICAgICAgICAgIHJldHVybiBcIm9wZW5lZFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJjbG9zZWRcIjtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhclNlbGVjdGVkOiAoKSA9PiB7XG4gICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5leHBhbmRlZEZvbGRlcnMgPSB7fTtcbiAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZVNlbGVjdGVkOiAoKSA9PiB7XG4gICAgICAgICAgLy8gbGV0cyB1cGRhdGUgdGhlIHNlbGVjdGVkIGFwcHNcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRDb21tYW5kcyA9IFtdO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUubW9kZWwuYXBwRm9sZGVycywgKGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgdmFyIGFwcHMgPSBmb2xkZXIuYXBwcy5maWx0ZXIoKGFwcCkgPT4gYXBwLnNlbGVjdGVkKTtcbiAgICAgICAgICAgIGlmIChhcHBzKSB7XG4gICAgICAgICAgICAgIHNlbGVjdGVkQ29tbWFuZHMgPSBzZWxlY3RlZENvbW1hbmRzLmNvbmNhdChhcHBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLnNlbGVjdGVkQ29tbWFuZHMgPSBzZWxlY3RlZENvbW1hbmRzLnNvcnRCeShcIm5hbWVcIik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2VsZWN0OiAoY29tbWFuZCwgZmxhZykgPT4ge1xuICAgICAgICAgIHZhciBpZCA9IGNvbW1hbmQubmFtZTtcbi8qXG4gICAgICAgICAgYXBwLnNlbGVjdGVkID0gZmxhZztcbiovXG4gICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci51cGRhdGVTZWxlY3RlZCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFNlbGVjdGVkQ2xhc3M6IChhcHApID0+IHtcbiAgICAgICAgICBpZiAoYXBwLmFic3RyYWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gXCJhYnN0cmFjdFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYXBwLnNlbGVjdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJzZWxlY3RlZFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgfSxcblxuICAgICAgICBzaG93Q29tbWFuZDogKGNvbW1hbmQpID0+IHtcbiAgICAgICAgICByZXR1cm4gY29tbWFuZE1hdGNoZXMoY29tbWFuZCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2hvd0ZvbGRlcjogKGZvbGRlcikgPT4ge1xuICAgICAgICAgIHZhciBmaWx0ZXJUZXh0ID0gJHNjb3BlLnRhYmxlQ29uZmlnLmZpbHRlck9wdGlvbnMuZmlsdGVyVGV4dDtcbiAgICAgICAgICByZXR1cm4gIWZpbHRlclRleHQgfHwgZm9sZGVyLmNvbW1hbmRzLnNvbWUoKGFwcCkgPT4gY29tbWFuZE1hdGNoZXMoYXBwKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cblxuICAgICAgdmFyIHVybCA9IFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kc1wiLCAkc2NvcGUucmVzb3VyY2VQYXRoKTtcbiAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsKTtcbiAgICAgIGxvZy5pbmZvKFwiRmV0Y2hpbmcgY29tbWFuZHMgZnJvbTogXCIgKyB1cmwpO1xuICAgICAgJGh0dHAuZ2V0KHVybCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGRhdGEpICYmIHN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICAgIHZhciBmb2xkZXJNYXAgPSB7fTtcbiAgICAgICAgICAgIHZhciBmb2xkZXJzID0gW107XG4gICAgICAgICAgICAkc2NvcGUuY29tbWFuZHMgPSBfLnNvcnRCeShkYXRhLCBcIm5hbWVcIik7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmNvbW1hbmRzLCAoY29tbWFuZCkgPT4ge1xuICAgICAgICAgICAgICB2YXIgaWQgPSBjb21tYW5kLmlkIHx8IGNvbW1hbmQubmFtZTtcbiAgICAgICAgICAgICAgY29tbWFuZC4kbGluayA9IGNvbW1hbmRMaW5rKCRzY29wZS5wcm9qZWN0SWQsIGlkLCByZXNvdXJjZVBhdGgpO1xuXG4gICAgICAgICAgICAgIHZhciBuYW1lID0gY29tbWFuZC5uYW1lIHx8IGNvbW1hbmQuaWQ7XG4gICAgICAgICAgICAgIHZhciBmb2xkZXJOYW1lID0gY29tbWFuZC5jYXRlZ29yeTtcbiAgICAgICAgICAgICAgdmFyIHNob3J0TmFtZSA9IG5hbWU7XG4gICAgICAgICAgICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoXCI6XCIsIDIpO1xuICAgICAgICAgICAgICBpZiAobmFtZXMgIT0gbnVsbCAmJiBuYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZm9sZGVyTmFtZSA9IG5hbWVzWzBdO1xuICAgICAgICAgICAgICAgIHNob3J0TmFtZSA9IG5hbWVzWzFdLnRyaW0oKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoZm9sZGVyTmFtZSA9PT0gXCJQcm9qZWN0L0J1aWxkXCIpIHtcbiAgICAgICAgICAgICAgICBmb2xkZXJOYW1lID0gXCJQcm9qZWN0XCI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29tbWFuZC4kc2hvcnROYW1lID0gc2hvcnROYW1lO1xuICAgICAgICAgICAgICBjb21tYW5kLiRmb2xkZXJOYW1lID0gZm9sZGVyTmFtZTtcbiAgICAgICAgICAgICAgdmFyIGZvbGRlciA9IGZvbGRlck1hcFtmb2xkZXJOYW1lXTtcbiAgICAgICAgICAgICAgaWYgKCFmb2xkZXIpIHtcbiAgICAgICAgICAgICAgICBmb2xkZXIgPSB7XG4gICAgICAgICAgICAgICAgICBuYW1lOiBmb2xkZXJOYW1lLFxuICAgICAgICAgICAgICAgICAgY29tbWFuZHM6IFtdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBmb2xkZXJNYXBbZm9sZGVyTmFtZV0gPSBmb2xkZXI7XG4gICAgICAgICAgICAgICAgZm9sZGVycy5wdXNoKGZvbGRlcik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZm9sZGVyLmNvbW1hbmRzLnB1c2goY29tbWFuZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGZvbGRlcnMgPSBfLnNvcnRCeShmb2xkZXJzLCBcIm5hbWVcIik7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goZm9sZGVycywgKGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgICBmb2xkZXIuY29tbWFuZHMgPSBfLnNvcnRCeShmb2xkZXIuY29tbWFuZHMsIFwiJHNob3J0TmFtZVwiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5mb2xkZXJzID0gZm9sZGVycztcblxuICAgICAgICAgICAgc2V0TW9kZWxDb21tYW5kcygkc2NvcGUubW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5jb21tYW5kcyk7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KS5cbiAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgUmVwb0NvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiUmVwb0NvbnRyb2xsZXJcIixcbiAgICBbXCIkc2NvcGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLFxuICAgICAgKCRzY29wZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLm5hbWUgPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdO1xuXG4gICAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgICAgcmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQoJHNjb3BlLCAkbG9jYXRpb24pO1xuXG4gICAgICAgICRzY29wZS4kb24oJyRyb3V0ZVVwZGF0ZScsICgkZXZlbnQpID0+IHtcbiAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHVwZGF0ZURhdGEoKTtcblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVEYXRhKCkge1xuICAgICAgICAgIGlmICgkc2NvcGUubmFtZSkge1xuICAgICAgICAgICAgdmFyIHVybCA9IHJlcG9BcGlVcmwoRm9yZ2VBcGlVUkwsICRzY29wZS5uYW1lKTtcbiAgICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsKTtcbiAgICAgICAgICAgIHZhciBjb25maWcgPSBjcmVhdGVIdHRwQ29uZmlnKCk7XG4gICAgICAgICAgICAkaHR0cC5nZXQodXJsLCBjb25maWcpLlxuICAgICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICBlbnJpY2hSZXBvKGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkc2NvcGUuZW50aXR5ID0gZGF0YTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIFJlcG9zQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJSZXBvc0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGRpYWxvZ1wiLCBcIiR3aW5kb3dcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRsb2NhdGlvblwiLCBcImxvY2FsU3RvcmFnZVwiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLCBcIkt1YmVybmV0ZXNNb2RlbFwiLCBcIlNlcnZpY2VSZWdpc3RyeVwiLFxuICAgICgkc2NvcGUsICRkaWFsb2csICR3aW5kb3csICR0ZW1wbGF0ZUNhY2hlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEt1YmVybmV0ZXNNb2RlbDogS3ViZXJuZXRlcy5LdWJlcm5ldGVzTW9kZWxTZXJ2aWNlLCBTZXJ2aWNlUmVnaXN0cnkpID0+IHtcblxuICAgICAgJHNjb3BlLm1vZGVsID0gS3ViZXJuZXRlc01vZGVsO1xuICAgICAgJHNjb3BlLnJlc291cmNlUGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl07XG4gICAgICAkc2NvcGUuY29tbWFuZHNMaW5rID0gKHBhdGgpID0+IGNvbW1hbmRzTGluayhwYXRoLCAkc2NvcGUucHJvamVjdElkKTtcblxuICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuXG4gICAgICAkc2NvcGUuJG9uKCdrdWJlcm5ldGVzTW9kZWxVcGRhdGVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB1cGRhdGVMaW5rcygpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG5cbiAgICAgICRzY29wZS50YWJsZUNvbmZpZyA9IHtcbiAgICAgICAgZGF0YTogJ3Byb2plY3RzJyxcbiAgICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgIG11bHRpU2VsZWN0OiB0cnVlLFxuICAgICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgIGZpbHRlclRleHQ6ICRsb2NhdGlvbi5zZWFyY2goKVtcInFcIl0gfHwgJydcbiAgICAgICAgfSxcbiAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ1JlcG9zaXRvcnkgTmFtZScsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcInJlcG9UZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ2FjdGlvbnMnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdBY3Rpb25zJyxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwicmVwb0FjdGlvbnNUZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUubG9naW4gPSB7XG4gICAgICAgIGF1dGhIZWFkZXI6IGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdIHx8IFwiXCIsXG4gICAgICAgIHJlbG9naW46IGZhbHNlLFxuICAgICAgICBhdmF0YXJfdXJsOiBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdIHx8IFwiXCIsXG4gICAgICAgIHVzZXI6IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdIHx8IFwiXCIsXG4gICAgICAgIHBhc3N3b3JkOiBcIlwiLFxuICAgICAgICBlbWFpbDogbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdIHx8IFwiXCJcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kb0xvZ2luID0gKCkgPT4ge1xuICAgICAgICB2YXIgbG9naW4gPSAkc2NvcGUubG9naW47XG4gICAgICAgIHZhciB1c2VyID0gbG9naW4udXNlcjtcbiAgICAgICAgdmFyIHBhc3N3b3JkID0gbG9naW4ucGFzc3dvcmQ7XG4gICAgICAgIGlmICh1c2VyICYmIHBhc3N3b3JkKSB7XG4gICAgICAgICAgdmFyIHVzZXJQd2QgPSB1c2VyICsgJzonICsgcGFzc3dvcmQ7XG4gICAgICAgICAgbG9naW4uYXV0aEhlYWRlciA9ICdCYXNpYyAnICsgKHVzZXJQd2QuZW5jb2RlQmFzZTY0KCkpO1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmxvZ291dCA9ICgpID0+IHtcbiAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdO1xuICAgICAgICAkc2NvcGUubG9naW4uYXV0aEhlYWRlciA9IG51bGw7XG4gICAgICAgICRzY29wZS5sb2dpbi5sb2dnZWRJbiA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUubG9naW4uZmFpbGVkID0gZmFsc2U7XG4gICAgICAgIGxvZ2dlZEluVG9Hb2dzID0gZmFsc2U7XG4gICAgICB9O1xuXG5cbiAgICAgICRzY29wZS5vcGVuQ29tbWFuZHMgPSAoKSA9PiB7XG4gICAgICAgIHZhciByZXNvdXJjZVBhdGggPSBudWxsO1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSAkc2NvcGUudGFibGVDb25maWcuc2VsZWN0ZWRJdGVtcztcbiAgICAgICAgaWYgKF8uaXNBcnJheShzZWxlY3RlZCkgJiYgc2VsZWN0ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzb3VyY2VQYXRoID0gc2VsZWN0ZWRbMF0ucGF0aDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbGluayA9IGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgICBsb2cuaW5mbyhcIm1vdmluZyB0byBjb21tYW5kcyBsaW5rOiBcIiArIGxpbmspO1xuICAgICAgICAkbG9jYXRpb24ucGF0aChsaW5rKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGUgPSAocHJvamVjdHMpID0+IHtcbiAgICAgICAgVUkubXVsdGlJdGVtQ29uZmlybUFjdGlvbkRpYWxvZyg8VUkuTXVsdGlJdGVtQ29uZmlybUFjdGlvbk9wdGlvbnM+e1xuICAgICAgICAgIGNvbGxlY3Rpb246IHByb2plY3RzLFxuICAgICAgICAgIGluZGV4OiAncGF0aCcsXG4gICAgICAgICAgb25DbG9zZTogKHJlc3VsdDpib29sZWFuKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgIGRvRGVsZXRlKHByb2plY3RzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHRpdGxlOiAnRGVsZXRlIHByb2plY3RzPycsXG4gICAgICAgICAgYWN0aW9uOiAnVGhlIGZvbGxvd2luZyBwcm9qZWN0cyB3aWxsIGJlIHJlbW92ZWQgKHRob3VnaCB0aGUgZmlsZXMgd2lsbCByZW1haW4gb24geW91ciBmaWxlIHN5c3RlbSk6JyxcbiAgICAgICAgICBva1RleHQ6ICdEZWxldGUnLFxuICAgICAgICAgIG9rQ2xhc3M6ICdidG4tZGFuZ2VyJyxcbiAgICAgICAgICBjdXN0b206IFwiVGhpcyBvcGVyYXRpb24gaXMgcGVybWFuZW50IG9uY2UgY29tcGxldGVkIVwiLFxuICAgICAgICAgIGN1c3RvbUNsYXNzOiBcImFsZXJ0IGFsZXJ0LXdhcm5pbmdcIlxuICAgICAgICB9KS5vcGVuKCk7XG4gICAgICB9O1xuXG4gICAgICB1cGRhdGVMaW5rcygpO1xuXG4gICAgICBmdW5jdGlvbiBkb0RlbGV0ZShwcm9qZWN0cykge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2gocHJvamVjdHMsIChwcm9qZWN0KSA9PiB7XG4gICAgICAgICAgbG9nLmluZm8oXCJEZWxldGluZyBcIiArIGFuZ3VsYXIudG9Kc29uKCRzY29wZS5wcm9qZWN0cykpO1xuICAgICAgICAgIHZhciBwYXRoID0gcHJvamVjdC5wYXRoO1xuICAgICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgcGF0aCk7XG4gICAgICAgICAgICAkaHR0cC5kZWxldGUodXJsKS5cbiAgICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gXCJGYWlsZWQgdG8gUE9TVCB0byBcIiArIHVybCArIFwiIGdvdCBzdGF0dXM6IFwiICsgc3RhdHVzO1xuICAgICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdlcnJvcicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiB1cGRhdGVMaW5rcygpIHtcbiAgICAgICAgdmFyICRnb2dzTGluayA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlUmVhZHlMaW5rKGdvZ3NTZXJ2aWNlTmFtZSk7XG4gICAgICAgIGlmICgkZ29nc0xpbmspIHtcbiAgICAgICAgICAkc2NvcGUuc2lnblVwVXJsID0gVXJsSGVscGVycy5qb2luKCRnb2dzTGluaywgXCJ1c2VyL3NpZ25fdXBcIik7XG4gICAgICAgICAgJHNjb3BlLmZvcmdvdFBhc3N3b3JkVXJsID0gVXJsSGVscGVycy5qb2luKCRnb2dzTGluaywgXCJ1c2VyL2ZvcmdldF9wYXNzd29yZFwiKTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuJGdvZ3NMaW5rID0gJGdvZ3NMaW5rO1xuICAgICAgICAkc2NvcGUuJGZvcmdlTGluayA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlUmVhZHlMaW5rKEt1YmVybmV0ZXMuZmFicmljOEZvcmdlU2VydmljZU5hbWUpO1xuXG4gICAgICAgICRzY29wZS4kaGFzQ0RQaXBlbGluZVRlbXBsYXRlID0gXy5hbnkoJHNjb3BlLm1vZGVsLnRlbXBsYXRlcywgKHQpID0+IFwiY2QtcGlwZWxpbmVcIiA9PT0gS3ViZXJuZXRlcy5nZXROYW1lKHQpKTtcblxuICAgICAgICB2YXIgZXhwZWN0ZWRSQ1MgPSBbS3ViZXJuZXRlcy5nb2dzU2VydmljZU5hbWUsIEt1YmVybmV0ZXMuZmFicmljOEZvcmdlU2VydmljZU5hbWUsIEt1YmVybmV0ZXMuamVua2luc1NlcnZpY2VOYW1lXTtcbiAgICAgICAgdmFyIHJlcXVpcmVkUkNzID0ge307XG4gICAgICAgIHZhciBucyA9IEt1YmVybmV0ZXMuY3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoKTtcbiAgICAgICAgdmFyIHJ1bm5pbmdDRFBpcGVsaW5lID0gdHJ1ZTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGV4cGVjdGVkUkNTLCAocmNOYW1lKSA9PiB7XG4gICAgICAgICAgdmFyIHJjID0gJHNjb3BlLm1vZGVsLmdldFJlcGxpY2F0aW9uQ29udHJvbGxlcihucywgcmNOYW1lKTtcbiAgICAgICAgICBpZiAocmMpIHtcbiAgICAgICAgICAgIHJlcXVpcmVkUkNzW3JjTmFtZV0gPSByYztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcnVubmluZ0NEUGlwZWxpbmUgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUuJHJlcXVpcmVkUkNzID0gcmVxdWlyZWRSQ3M7XG4gICAgICAgICRzY29wZS4kcnVubmluZ0NEUGlwZWxpbmUgPSBydW5uaW5nQ0RQaXBlbGluZTtcbiAgICAgICAgdmFyIHVybCA9IFwiXCI7XG4gICAgICAgICRsb2NhdGlvbiA9IEt1YmVybmV0ZXMuaW5qZWN0KFwiJGxvY2F0aW9uXCIpO1xuICAgICAgICBpZiAoJGxvY2F0aW9uKSB7XG4gICAgICAgICAgdXJsID0gJGxvY2F0aW9uLnVybCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdXJsKSB7XG4gICAgICAgICAgdXJsID0gd2luZG93LmxvY2F0aW9uLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyBzaG91bGQgd2Ugc3VwcG9ydCBhbnkgb3RoZXIgdGVtcGxhdGUgbmFtZXNwYWNlcz9cbiAgICAgICAgdmFyIHRlbXBsYXRlTmFtZXNwYWNlID0gXCJkZWZhdWx0XCI7XG4gICAgICAgICRzY29wZS4kcnVuQ0RQaXBlbGluZUxpbmsgPSBcIi9rdWJlcm5ldGVzL25hbWVzcGFjZS9cIiArIHRlbXBsYXRlTmFtZXNwYWNlICsgXCIvdGVtcGxhdGVzL1wiICsgbnMgKyBcIj9xPWNkLXBpcGVsaW5lJnJldHVyblRvPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHVybCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgIHZhciBhdXRoSGVhZGVyID0gJHNjb3BlLmxvZ2luLmF1dGhIZWFkZXI7XG4gICAgICAgIHZhciBlbWFpbCA9ICRzY29wZS5sb2dpbi5lbWFpbCB8fCBcIlwiO1xuICAgICAgICBpZiAoYXV0aEhlYWRlcikge1xuICAgICAgICAgIHZhciB1cmwgPSByZXBvc0FwaVVybChGb3JnZUFwaVVSTCk7XG4gICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwsIGF1dGhIZWFkZXIsIGVtYWlsKTtcbiAgICAgICAgICB2YXIgY29uZmlnID0ge1xuLypcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgR29nc0F1dGhvcml6YXRpb246IGF1dGhIZWFkZXIsXG4gICAgICAgICAgICAgIEdvZ3NFbWFpbDogZW1haWxcbiAgICAgICAgICAgIH1cbiovXG4gICAgICAgICAgfTtcbiAgICAgICAgICAkaHR0cC5nZXQodXJsLCBjb25maWcpLlxuICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmZhaWxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAkc2NvcGUubG9naW4ubG9nZ2VkSW4gPSB0cnVlO1xuICAgICAgICAgICAgICBsb2dnZWRJblRvR29ncyA9IHRydWU7XG4gICAgICAgICAgICAgIHZhciBhdmF0YXJfdXJsID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKHN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFkYXRhIHx8ICFhbmd1bGFyLmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgIGRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gbGV0cyBzdG9yZSBhIHN1Y2Nlc3NmdWwgbG9naW4gc28gdGhhdCB3ZSBoaWRlIHRoZSBsb2dpbiBwYWdlXG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl0gPSBhdXRoSGVhZGVyO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NFbWFpbFwiXSA9IGVtYWlsO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdID0gJHNjb3BlLmxvZ2luLnVzZXIgfHwgXCJcIjtcblxuICAgICAgICAgICAgICAgICRzY29wZS5wcm9qZWN0cyA9IF8uc29ydEJ5KGRhdGEsIFwibmFtZVwiKTtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLnByb2plY3RzLCAocmVwbykgPT4ge1xuICAgICAgICAgICAgICAgICAgZW5yaWNoUmVwbyhyZXBvKTtcbiAgICAgICAgICAgICAgICAgIGlmICghYXZhdGFyX3VybCkge1xuICAgICAgICAgICAgICAgICAgICBhdmF0YXJfdXJsID0gQ29yZS5wYXRoR2V0KHJlcG8sIFtcIm93bmVyXCIsIFwiYXZhdGFyX3VybFwiXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhdmF0YXJfdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmF2YXRhcl91cmwgPSBhdmF0YXJfdXJsO1xuICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl0gPSBhdmF0YXJfdXJsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5cbiAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUubG9nb3V0KCk7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dpbi5mYWlsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICBpZiAoc3RhdHVzICE9PSA0MDMpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB1cGRhdGVEYXRhKCk7XG5cbiAgICB9XSk7XG59XG4iLCIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxubW9kdWxlIE1haW4ge1xuXG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9IFwiZmFicmljOC1jb25zb2xlXCI7XG5cbiAgZXhwb3J0IHZhciBsb2c6IExvZ2dpbmcuTG9nZ2VyID0gTG9nZ2VyLmdldChwbHVnaW5OYW1lKTtcblxuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IFwicGx1Z2lucy9tYWluL2h0bWxcIjtcblxuICAvLyBrdWJlcm5ldGVzIHNlcnZpY2UgbmFtZXNcbiAgZXhwb3J0IHZhciBjaGF0U2VydmljZU5hbWUgPSBcImxldHNjaGF0XCI7XG4gIGV4cG9ydCB2YXIgZ3JhZmFuYVNlcnZpY2VOYW1lID0gXCJncmFmYW5hXCI7XG4gIGV4cG9ydCB2YXIgYXBwTGlicmFyeVNlcnZpY2VOYW1lID0gXCJhcHAtbGlicmFyeVwiO1xuXG4gIGV4cG9ydCB2YXIgdmVyc2lvbjphbnkgPSB7fTtcblxufVxuIiwiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9mb3JnZS90cy9mb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWFpbkdsb2JhbHMudHNcIi8+XG5cbm1vZHVsZSBNYWluIHtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbRm9yZ2UucGx1Z2luTmFtZV0pO1xuXG4gIHZhciB0YWIgPSB1bmRlZmluZWQ7XG5cbiAgX21vZHVsZS5ydW4oKCRyb290U2NvcGUsIEhhd3Rpb05hdjogSGF3dGlvTWFpbk5hdi5SZWdpc3RyeSwgS3ViZXJuZXRlc01vZGVsLCBTZXJ2aWNlUmVnaXN0cnksIHByZWZlcmVuY2VzUmVnaXN0cnkpID0+IHtcblxuICAgIEhhd3Rpb05hdi5vbihIYXd0aW9NYWluTmF2LkFjdGlvbnMuQ0hBTkdFRCwgcGx1Z2luTmFtZSwgKGl0ZW1zKSA9PiB7XG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHN3aXRjaChpdGVtLmlkKSB7XG4gICAgICAgICAgY2FzZSAnZm9yZ2UnOlxuICAgICAgICAgIGNhc2UgJ2p2bSc6XG4gICAgICAgICAgY2FzZSAnd2lraSc6XG4gICAgICAgICAgY2FzZSAnZG9ja2VyLXJlZ2lzdHJ5JzpcbiAgICAgICAgICAgIGl0ZW0uaXNWYWxpZCA9ICgpID0+IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAnbGlicmFyeScsXG4gICAgICB0aXRsZTogKCkgPT4gJ0xpYnJhcnknLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgdGhlIGxpYnJhcnkgb2YgYXBwbGljYXRpb25zJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGFwcExpYnJhcnlTZXJ2aWNlTmFtZSkgJiYgU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoXCJhcHAtbGlicmFyeS1qb2xva2lhXCIpLFxuICAgICAgaHJlZjogKCkgPT4gXCIvd2lraS92aWV3XCIsXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIHZhciBraWJhbmFTZXJ2aWNlTmFtZSA9IEt1YmVybmV0ZXMua2liYW5hU2VydmljZU5hbWU7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAna2liYW5hJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0xvZ3MnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgYW5kIHNlYXJjaCBhbGwgbG9ncyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgS2liYW5hIGFuZCBFbGFzdGljU2VhcmNoJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGtpYmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IEt1YmVybmV0ZXMua2liYW5hTG9nc0xpbmsoU2VydmljZVJlZ2lzdHJ5KSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2FwaW1hbicsXG4gICAgICB0aXRsZTogKCkgPT4gJ0FQSSBNYW5hZ2VtZW50JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdBZGQgUG9saWNpZXMgYW5kIFBsYW5zIHRvIHlvdXIgQVBJcyB3aXRoIEFwaW1hbicsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZSgnYXBpbWFuJyksXG4gICAgICBvbGRIcmVmOiAoKSA9PiB7IC8qIG5vdGhpbmcgdG8gZG8gKi8gfSxcbiAgICAgIGhyZWY6ICgpID0+IHtcbiAgICAgICAgdmFyIGhhc2ggPSB7XG4gICAgICAgICAgYmFja1RvOiBuZXcgVVJJKCkudG9TdHJpbmcoKSxcbiAgICAgICAgICB0b2tlbjogSGF3dGlvT0F1dGguZ2V0T0F1dGhUb2tlbigpXG4gICAgICAgIH07XG4gICAgICAgIHZhciB1cmkgPSBuZXcgVVJJKFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluaygnYXBpbWFuJykpO1xuICAgICAgICAvLyBUT0RPIGhhdmUgdG8gb3ZlcndyaXRlIHRoZSBwb3J0IGhlcmUgZm9yIHNvbWUgcmVhc29uXG4gICAgICAgICg8YW55PnVyaS5wb3J0KCc4MCcpLnF1ZXJ5KHt9KS5wYXRoKCdhcGltYW51aS9pbmRleC5odG1sJykpLmhhc2goVVJJLmVuY29kZShhbmd1bGFyLnRvSnNvbihoYXNoKSkpO1xuICAgICAgICByZXR1cm4gdXJpLnRvU3RyaW5nKCk7XG4gICAgICB9ICAgIFxuICAgIH0pO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2dyYWZhbmEnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnTWV0cmljcycsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlld3MgbWV0cmljcyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgR3JhZmFuYSBhbmQgSW5mbHV4REInLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoZ3JhZmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhncmFmYW5hU2VydmljZU5hbWUpLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiBcImNoYXRcIixcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0NoYXQnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NoYXQgcm9vbSBmb3IgZGlzY3Vzc2luZyB0aGlzIG5hbWVzcGFjZScsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShjaGF0U2VydmljZU5hbWUpLFxuICAgICAgaHJlZjogKCkgPT4ge1xuICAgICAgICB2YXIgYW5zd2VyID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKGNoYXRTZXJ2aWNlTmFtZSk7XG4gICAgICAgIGlmIChhbnN3ZXIpIHtcbi8qXG4gICAgICAgICAgVE9ETyBhZGQgYSBjdXN0b20gbGluayB0byB0aGUgY29ycmVjdCByb29tIGZvciB0aGUgY3VycmVudCBuYW1lc3BhY2U/XG5cbiAgICAgICAgICB2YXIgaXJjSG9zdCA9IFwiXCI7XG4gICAgICAgICAgdmFyIGlyY1NlcnZpY2UgPSBTZXJ2aWNlUmVnaXN0cnkuZmluZFNlcnZpY2UoXCJodWJvdFwiKTtcbiAgICAgICAgICBpZiAoaXJjU2VydmljZSkge1xuICAgICAgICAgICAgaXJjSG9zdCA9IGlyY1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpcmNIb3N0KSB7XG4gICAgICAgICAgICB2YXIgbmljayA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdIHx8IGxvY2FsU3RvcmFnZVtcImlyY05pY2tcIl0gfHwgXCJteW5hbWVcIjtcbiAgICAgICAgICAgIHZhciByb29tID0gXCIjZmFicmljOC1cIiArICBjdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgICAgICAgYW5zd2VyID0gVXJsSGVscGVycy5qb2luKGFuc3dlciwgXCIva2l3aVwiLCBpcmNIb3N0LCBcIj8mbmljaz1cIiArIG5pY2sgKyByb29tKTtcbiAgICAgICAgICB9XG4qL1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICB9LFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICAvLyBUT0RPIHdlIHNob3VsZCBtb3ZlIHRoaXMgdG8gYSBuaWNlciBsaW5rIGluc2lkZSB0aGUgTGlicmFyeSBzb29uIC0gYWxzbyBsZXRzIGhpZGUgdW50aWwgaXQgd29ya3MuLi5cbi8qXG4gICAgd29ya3NwYWNlLnRvcExldmVsVGFicy5wdXNoKHtcbiAgICAgIGlkOiAnY3JlYXRlUHJvamVjdCcsXG4gICAgICB0aXRsZTogKCkgPT4gICdDcmVhdGUnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NyZWF0ZXMgYSBuZXcgcHJvamVjdCcsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShcImFwcC1saWJyYXJ5XCIpICYmIGZhbHNlLFxuICAgICAgaHJlZjogKCkgPT4gXCIvcHJvamVjdC9jcmVhdGVcIlxuICAgIH0pO1xuKi9cblxuICAgIHByZWZlcmVuY2VzUmVnaXN0cnkuYWRkVGFiKCdBYm91dCAnICsgdmVyc2lvbi5uYW1lLCBVcmxIZWxwZXJzLmpvaW4odGVtcGxhdGVQYXRoLCAnYWJvdXQuaHRtbCcpKTtcblxuICAgIGxvZy5pbmZvKFwic3RhcnRlZCwgdmVyc2lvbjogXCIsIHZlcnNpb24udmVyc2lvbik7XG4gICAgbG9nLmluZm8oXCJjb21taXQgSUQ6IFwiLCB2ZXJzaW9uLmNvbW1pdElkKTtcbiAgfSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLnJlZ2lzdGVyUHJlQm9vdHN0cmFwVGFzaygobmV4dCkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICB1cmw6ICd2ZXJzaW9uLmpzb24/cmV2PScgKyBEYXRlLm5vdygpLCBcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdmVyc2lvbiA9IGFuZ3VsYXIuZnJvbUpzb24oZGF0YSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIHZlcnNpb24gPSB7XG4gICAgICAgICAgICBuYW1lOiAnZmFicmljOC1jb25zb2xlJyxcbiAgICAgICAgICAgIHZlcnNpb246ICcnXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgICB9LFxuICAgICAgZXJyb3I6IChqcVhIUiwgdGV4dCwgc3RhdHVzKSA9PiB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIkZhaWxlZCB0byBmZXRjaCB2ZXJzaW9uOiBqcVhIUjogXCIsIGpxWEhSLCBcIiB0ZXh0OiBcIiwgdGV4dCwgXCIgc3RhdHVzOiBcIiwgc3RhdHVzKTtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSxcbiAgICAgIGRhdGFUeXBlOiBcImh0bWxcIlxuICAgIH0pO1xuICB9KTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIuYWRkTW9kdWxlKHBsdWdpbk5hbWUpO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5HbG9iYWxzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5QbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBNYWluIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKCdNYWluLkFib3V0JywgKCRzY29wZSkgPT4ge1xuICAgICRzY29wZS5pbmZvID0gdmVyc2lvbjtcbiAgfSk7XG59XG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
angular.module("fabric8-console-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/forge/html/command.html","<div ng-controller=\"Forge.CommandController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n<!--\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n-->\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <h3>{{schema.info.description}}</h3>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"executing\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-info\">executing...\n        <i class=\"fa fa-spinner fa-spin\"></i>\n      </p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response\">\n    <div class=\"col-md-12\">\n      <p ng-show=\"response.message\" ng-class=\"responseClass\"><span class=\"response-message\">{{response.message}}</span></p>\n      <p ng-show=\"response.output\" ng-class=\"responseClass\"><span class=\"response-output\">{{response.output}}</span></p>\n      <p ng-show=\"response.err\" ng-class=\"bg-warning\"><span class=\"response-err\">{{response.err}}</span></p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response && !invalid\">\n    <div class=\"col-md-12\">\n      <a class=\"btn btn-primary\" href=\"{{completedLink}}\">Done</a>\n      <a class=\"btn btn-default\" ng-click=\"response = null\" ng-hide=\"wizardCompleted\">Hide</a>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"validationError\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-danger\">{{validationError}}</p>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched && !wizardCompleted\">\n        <div hawtio-form-2=\"schema\" entity=\'entity\'></div>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\" ng-hide=\"wizardCompleted\">\n    <div class=\"col-md-2\">\n    </div>\n    <div class=\"col-md-2\">\n      <button class=\"btn btn-primary\"\n              title=\"Perform this command\"\n              ng-show=\"fetched\"\n              ng-disabled=\"executing\"\n              ng-click=\"execute()\">\n        Execute\n      </button>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/commands.html","<div class=\"row\" ng-controller=\"Forge.CommandsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\" ng-show=\"commands.length\">\n      <span ng-show=\"!id\">\n        Command: <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                                css-class=\"input-xxlarge\"\n                                placeholder=\"Filter commands...\"\n                                save-as=\"fabric8-forge-command-filter\"></hawtio-filter>\n      </span>\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched\">\n        <div ng-hide=\"commands.length\" class=\"align-center\">\n          <p class=\"alert alert-info\">There are no commands available!</p>\n        </div>\n        <div ng-show=\"commands.length\">\n        </div>\n        <div ng-show=\"mode == \'table\'\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && commands.length && mode != \'table\'\">\n    <div class=\"row\">\n      <ul>\n        <li class=\"no-list command-selector-folder\" ng-repeat=\"folder in commandSelector.folders\"\n            ng-show=\"commandSelector.showFolder(folder)\">\n          <div class=\"expandable\" ng-class=\"commandSelector.isOpen(folder)\">\n            <div title=\"{{folder.name}}\" class=\"title\">\n              <i class=\"expandable-indicator folder\"></i> <span class=\"folder-title\"\n                                                                ng-show=\"folder.name\">{{folder.name}}</span><span\n                    class=\"folder-title\" ng-hide=\"folder.name\">Uncategorized</span>\n            </div>\n            <div class=\"expandable-body\">\n              <ul>\n                <li class=\"no-list command\" ng-repeat=\"command in folder.commands\"\n                    ng-show=\"commandSelector.showCommand(command)\">\n                  <div class=\"inline-block command-selector-name\"\n                       ng-class=\"commandSelector.getSelectedClass(command)\">\n                    <span class=\"contained c-max\">\n                      <a href=\"{{command.$link}}\"\n                         title=\"{{command.description}}\">\n                        <span class=\"command-name\">{{command.$shortName}}</span>\n                      </a>\n                    </span>\n                  </div>\n                </li>\n              </ul>\n            </div>\n          </div>\n        </li>\n      </ul>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/createProject.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <style>\n    .createProjectPage {\n      padding-top: 40px;\n    }\n  </style>\n\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\" ng-show=\"login.loggedIn && $runningCDPipeline && $gogsLink && $forgeLink\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <!--\n            <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n\n            <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n              <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n              {{login.user}}\n            </div>\n      -->\n    </div>\n  </div>\n\n\n  <div ng-show=\"model.fetched && $runningCDPipeline && (!$gogsLink || !$forgeLink)\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p>Waiting for the <b>CD Pipeline</b> application to startup: &nbsp;&nbsp;<i class=\"fa fa-spinner fa-spin\"></i></p>\n\n        <ul class=\"pending-pods\">\n          <li class=\"ngCellText\" ng-repeat=\"item in $requiredRCs\">\n            <a ng-href=\"{{item | kubernetesPageLink}}\">\n              <img class=\"app-icon-small\" ng-src=\"{{item.$iconUrl}}\" ng-show=\"item.$iconUrl\">\n              <b>{{item.metadata.name}}</b>\n            </a>\n            <a ng-show=\"item.$podCounters.podsLink\" href=\"{{item.$podCounters.podsLink}}\" title=\"View pods\">\n              <span ng-show=\"item.$podCounters.ready\" class=\"badge badge-success\">{{item.$podCounters.ready}}</span>\n              <span ng-show=\"item.$podCounters.valid\" class=\"badge badge-info\">{{item.$podCounters.valid}}</span>\n              <span ng-show=\"item.$podCounters.waiting\" class=\"badge\">{{item.$podCounters.waiting}}</span>\n              <span ng-show=\"item.$podCounters.error\" class=\"badge badge-warning\">{{item.$podCounters.error}}</span>\n            </a>\n          </li>\n        </ul>\n        <p>Please be patient while the above pods are ready!</p>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && !$runningCDPipeline\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p class=\"text-warning\">You are not running the <b>CD Pipeline</b> application in this workspace.</p>\n\n        <p>To be able to create new projects please run it!</p>\n\n        <p><a href=\"{{$runCDPipelineLink}}\" class=\"btn btn-lg btn-default\">Run the <b>CD Pipeline</b></a></p>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"$runningCDPipeline && $gogsLink && $forgeLink && (!login.authHeader || login.relogin)\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository so that you can create a project</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n        <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"model.fetched || !login.authHeader || login.relogin || !$gogsLink ||!$forgeLink\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && login.authHeader && $gogsLink && $forgeLink\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p class=\"align-center\">\n          <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n             ng-show=\"login.loggedIn\"\n             title=\"Create a new project in this workspace using a wizard\">\n            <i class=\"fa fa-plus\"></i> Create Project using Wizard</a>\n          </a>\n        </p>\n\n        <p class=\"lead align-center\">\n          This wizard guides you though creating a new project, the git repository and the related builds and Continuous\n          Delivery Pipelines.\n        </p>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/layoutForge.html","<script type=\"text/ng-template\" id=\"idTemplate.html\">\n  <div class=\"ngCellText\">\n    <a href=\"\"\n       title=\"Execute command {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$link}}\">\n      {{row.entity.name}}</a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoTemplate.html\">\n  <div class=\"ngCellText\">\n    <a title=\"View repository {{row.entity.name}}\"\n       ng-href=\"/forge/repos/{{row.entity.name}}\">\n      {{row.entity.name}}\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoActionsTemplate.html\">\n  <div class=\"ngCellText\">\n    <a ng-show=\"row.entity.$openProjectLink\"\n       class=\"btn btn-primary\" target=\"editor\"\n       title=\"Open project {{row.entity.name}} in an editor\"\n       ng-href=\"{{row.entity.$openProjectLink}}\">\n      <i class=\"fa fa-pencil-square\"></i>\n      Open\n    </a>\n    <a ng-show=\"row.entity.html_url\"\n       class=\"btn btn-default\" target=\"browse\"\n       title=\"Browse project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.html_url}}\">\n      <i class=\"fa fa-external-link\"></i>\n      Repository\n    </a>\n    <a ng-show=\"row.entity.$buildsLink\"\n       class=\"btn btn-default\" target=\"builds\"\n       title=\"View builds for this repository {{row.entity.owner.username}}/{{row.entity.name}}\"\n       ng-href=\"{{row.entity.$buildsLink}}\">\n      <i class=\"fa fa-cog\"></i>\n      Builds\n    </a>\n    <a ng-show=\"row.entity.$commandsLink\"\n       class=\"btn btn-default\"\n       title=\"Commands for project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$commandsLink}}\">\n      <i class=\"fa fa-play-circle\"></i>\n      Run...\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"categoryTemplate.html\">\n  <div class=\"ngCellText\">\n    <span class=\"pod-label badge\"\n          class=\"background-light-grey mouse-pointer\">{{row.entity.category}}</span>\n  </div>\n</script>\n\n<div class=\"row\">\n  <div class=\"wiki-icon-view\">\n    <div class=\"row forge-view\" ng-view></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repo.html","<div class=\"row\" ng-controller=\"Forge.RepoController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\"\n              href=\"/forge/repos\"><i class=\"fa fa-list\"></i></a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.$commandsLink\"\n         class=\"btn btn-default pull-right\"\n         title=\"Commands for project {{entity.name}}\"\n         ng-href=\"{{entity.$commandsLink}}\">\n        <i class=\"fa fa-play-circle\"></i>\n        Run...\n      </a>\n      <span class=\"pull-right\" ng-show=\"entity.$buildsLink\">&nbsp;</span>\n      <a ng-show=\"entity.$buildsLink\"\n         class=\"btn btn-primary pull-right\" target=\"builds\"\n         title=\"View builds for this repository {{entity.owner.username}}/{{entity.name}}\"\n         ng-href=\"{{entity.$buildsLink}}\">\n        <i class=\"fa fa-cog\"></i>\n        Builds\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.html_url\"\n         class=\"btn btn-default pull-right\" target=\"browse\"\n         title=\"Browse project {{entity.name}}\"\n         ng-href=\"{{entity.html_url}}\">\n        <i class=\"fa fa-external-link\"></i>\n        Browse\n      </a>\n    </div>\n  </div>\n\n  <div ng-hide=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n  <div ng-show=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <h3 title=\"repository for {{entity.owner.username}}\">\n          <span ng-show=\"entity.owner.username\">\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              <img src=\"{{entity.owner.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"entity.owner.avatar_url\">\n            </a>\n            &nbsp;\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              {{entity.owner.username}}\n            </a>\n             &nbsp;/&nbsp;\n          </span>\n          {{entity.name}}\n        </h3>\n      </div>\n    </div>\n\n    <div class=\"git-clone-tabs\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div class=\"tabbable\">\n            <div value=\"ssh\" class=\"tab-pane\" title=\"SSH\" ng-show=\"entity.ssh_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>ssh</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.ssh_url}}</code>\n                </pre>\n              </div>\n            </div>\n\n            <div value=\"http\" class=\"tab-pane\" title=\"HTTP\" ng-show=\"entity.clone_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>http</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.clone_url}}</code>\n                </pre>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repos.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                     ng-show=\"projects.length\"\n                     css-class=\"input-xxlarge\"\n                     placeholder=\"Filter repositories...\"></hawtio-filter>\n      <!--\n            <span class=\"pull-right\">&nbsp;</span>\n            <button ng-show=\"fetched\"\n                    class=\"btn btn-danger pull-right\"\n                    ng-disabled=\"tableConfig.selectedItems.length == 0\"\n                    ng-click=\"delete(tableConfig.selectedItems)\">\n              <i class=\"fa fa-remove\"></i> Delete\n            </button>\n      -->\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-primary pull-right\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n         ng-show=\"login.loggedIn\"\n         title=\"Create a new project and repository\">\n        <i class=\"fa fa-plus\"></i> Create Project</a>\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\" ng-show=\"login.loggedIn\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n      <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n        <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n        {{login.user}}\n      </div>\n    </div>\n  </div>\n\n\n  <div ng-show=\"!login.authHeader || login.relogin\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n          <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"fetched || !login.authHeader || login.relogin\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && login.authHeader\">\n    <div ng-hide=\"projects.length\" class=\"align-center\">\n      <div class=\"padded-div\">\n        <div class=\"row\">\n          <div class=\"col-md-12\">\n            <p class=\"alert alert-info\">There are no git repositories yet. Please create one!</p>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-show=\"projects.length\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/main/html/about.html","<div ng-controller=\"Main.About\">\n  <p>Version: {{info.version}}</p>\n  <p>Commit ID: {{info.commitId}}</p>\n  <table class=\"table table-striped\">\n    <thead>\n      <tr>\n        <th>\n          Name\n        </th>\n        <th>\n          Version\n        </th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr ng-repeat=\"(key, info) in info.packages\">\n        <td>{{key}}</td>\n        <td>{{info.version || \'--\'}}</td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n");}]); hawtioPluginLoader.addModule("fabric8-console-templates");