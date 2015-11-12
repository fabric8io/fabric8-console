

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
            $routeProvider.when(UrlHelpers.join(startContext, path, 'view'), Wiki.route('viewPage.html', false)).when(UrlHelpers.join(startContext, path, 'create/:page*'), Wiki.route('create.html', false)).when(startContext + path + '/view/:page*', { templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false }).when(startContext + path + '/book/:page*', { templateUrl: 'plugins/wiki/html/viewBook.html', reloadOnSearch: false }).when(startContext + path + '/edit/:page*', { templateUrl: 'plugins/wiki/html/editPage.html' }).when(startContext + path + '/version/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/viewPage.html' }).when(startContext + path + '/history/:page*', { templateUrl: 'plugins/wiki/html/history.html' }).when(startContext + path + '/commit/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/commit.html' }).when(startContext + path + '/diff/:diffObjectId1/:diffObjectId2/:page*', { templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false }).when(startContext + path + '/formTable/:page*', { templateUrl: 'plugins/wiki/html/formTable.html' }).when(startContext + path + '/dozer/mappings/:page*', { templateUrl: 'plugins/wiki/html/dozerMappings.html' }).when(startContext + path + '/configurations/:page*', { templateUrl: 'plugins/wiki/html/configurations.html' }).when(startContext + path + '/configuration/:pid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' }).when(startContext + path + '/newConfiguration/:factoryPid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' }).when(startContext + path + '/camel/diagram/:page*', { templateUrl: 'plugins/wiki/html/camelDiagram.html' }).when(startContext + path + '/camel/canvas/:page*', { templateUrl: 'plugins/wiki/html/camelCanvas.html' }).when(startContext + path + '/camel/properties/:page*', { templateUrl: 'plugins/wiki/html/camelProperties.html' });
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
                    log.commitLink = Wiki.startLink($scope) + "/commit/" + $scope.pageId + "/" + commitId;
                });
                $scope.logs = _.sortBy(logArray, "$date").reverse();
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLmpzIiwibWFpbi90cy9tYWluR2xvYmFscy50cyIsImZvcmdlL3RzL2ZvcmdlSGVscGVycy50cyIsIm1haW4vdHMvbWFpblBsdWdpbi50cyIsIm1haW4vdHMvYWJvdXQudHMiLCJmb3JnZS90cy9mb3JnZVBsdWdpbi50cyIsImZvcmdlL3RzL2NvbW1hbmQudHMiLCJmb3JnZS90cy9jb21tYW5kcy50cyIsImZvcmdlL3RzL3JlcG8udHMiLCJmb3JnZS90cy9yZXBvcy50cyIsIndpa2kvdHMvd2lraUhlbHBlcnMudHMiLCJ3aWtpL3RzL3dpa2lQbHVnaW4udHMiLCJ3aWtpL3RzL2NhbWVsLnRzIiwid2lraS90cy9jYW1lbENhbnZhcy50cyIsIndpa2kvdHMvY29tbWl0LnRzIiwid2lraS90cy9jcmVhdGUudHMiLCJ3aWtpL3RzL2VkaXQudHMiLCJ3aWtpL3RzL2ZpbGVEcm9wLnRzIiwid2lraS90cy9mb3JtVGFibGUudHMiLCJ3aWtpL3RzL2dpdFByZWZlcmVuY2VzLnRzIiwid2lraS90cy9oaXN0b3J5LnRzIiwid2lraS90cy9uYXZiYXIudHMiLCJ3aWtpL3RzL3ZpZXcudHMiLCJ3aWtpL3RzL3dpa2lEaWFsb2dzLnRzIiwid2lraS90cy93aWtpRGlyZWN0aXZlcy50cyIsIndpa2kvdHMvd2lraU5hdmlnYXRpb24udHMiLCJ3aWtpL3RzL3dpa2lSZXBvc2l0b3J5LnRzIiwid2lraS90cy93aWtpVG9wTGV2ZWwudHMiXSwibmFtZXMiOlsiTWFpbiIsIkZvcmdlIiwiRm9yZ2UuaXNGb3JnZSIsIkZvcmdlLmluaXRTY29wZSIsIkZvcmdlLmNvbW1hbmRMaW5rIiwiRm9yZ2UuY29tbWFuZHNMaW5rIiwiRm9yZ2UucmVwb3NBcGlVcmwiLCJGb3JnZS5yZXBvQXBpVXJsIiwiRm9yZ2UuY29tbWFuZEFwaVVybCIsIkZvcmdlLmV4ZWN1dGVDb21tYW5kQXBpVXJsIiwiRm9yZ2UudmFsaWRhdGVDb21tYW5kQXBpVXJsIiwiRm9yZ2UuY29tbWFuZElucHV0QXBpVXJsIiwiRm9yZ2UubW9kZWxQcm9qZWN0IiwiRm9yZ2Uuc2V0TW9kZWxDb21tYW5kcyIsIkZvcmdlLmdldE1vZGVsQ29tbWFuZHMiLCJGb3JnZS5tb2RlbENvbW1hbmRJbnB1dE1hcCIsIkZvcmdlLmdldE1vZGVsQ29tbWFuZElucHV0cyIsIkZvcmdlLnNldE1vZGVsQ29tbWFuZElucHV0cyIsIkZvcmdlLmVucmljaFJlcG8iLCJGb3JnZS5jcmVhdGVIdHRwQ29uZmlnIiwiRm9yZ2UuYWRkUXVlcnlBcmd1bWVudCIsIkZvcmdlLmNyZWF0ZUh0dHBVcmwiLCJGb3JnZS5jb21tYW5kTWF0Y2hlc1RleHQiLCJGb3JnZS5pc0xvZ2dlZEludG9Hb2dzIiwiRm9yZ2UucmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQiLCJGb3JnZS5vblJvdXRlQ2hhbmdlZCIsIkZvcmdlLnVwZGF0ZVNjaGVtYSIsIkZvcmdlLnZhbGlkYXRlIiwiRm9yZ2UudG9CYWNrZ3JvdW5kU3R5bGUiLCJGb3JnZS51cGRhdGVEYXRhIiwiRm9yZ2Uub25TY2hlbWFMb2FkIiwiRm9yZ2UuY29tbWFuZE1hdGNoZXMiLCJGb3JnZS5kb0RlbGV0ZSIsIkZvcmdlLnVwZGF0ZUxpbmtzIiwiV2lraSIsIldpa2kuVmlld01vZGUiLCJXaWtpLmlzRk1DQ29udGFpbmVyIiwiV2lraS5pc1dpa2lFbmFibGVkIiwiV2lraS5nb1RvTGluayIsIldpa2kuY3VzdG9tVmlld0xpbmtzIiwiV2lraS5jcmVhdGVXaXphcmRUcmVlIiwiV2lraS5jcmVhdGVGb2xkZXIiLCJXaWtpLmFkZENyZWF0ZVdpemFyZEZvbGRlcnMiLCJXaWtpLnN0YXJ0TGluayIsIldpa2kuaXNJbmRleFBhZ2UiLCJXaWtpLnZpZXdMaW5rIiwiV2lraS5icmFuY2hMaW5rIiwiV2lraS5lZGl0TGluayIsIldpa2kuY3JlYXRlTGluayIsIldpa2kuZW5jb2RlUGF0aCIsIldpa2kuZGVjb2RlUGF0aCIsIldpa2kuZmlsZUZvcm1hdCIsIldpa2kuZmlsZU5hbWUiLCJXaWtpLmZpbGVQYXJlbnQiLCJXaWtpLmhpZGVGaWxlTmFtZUV4dGVuc2lvbnMiLCJXaWtpLmdpdFJlc3RVUkwiLCJXaWtpLmdpdFVybFByZWZpeCIsIldpa2kuZ2l0UmVsYXRpdmVVUkwiLCJXaWtpLmZpbGVJY29uSHRtbCIsIldpa2kuaWNvbkNsYXNzIiwiV2lraS5pbml0U2NvcGUiLCJXaWtpLmxvYWRCcmFuY2hlcyIsIldpa2kucGFnZUlkIiwiV2lraS5wYWdlSWRGcm9tVVJJIiwiV2lraS5maWxlRXh0ZW5zaW9uIiwiV2lraS5vbkNvbXBsZXRlIiwiV2lraS5wYXJzZUpzb24iLCJXaWtpLmFkanVzdEhyZWYiLCJXaWtpLmdldEZvbGRlclhtbE5vZGUiLCJXaWtpLmFkZE5ld05vZGUiLCJXaWtpLm9uTW9kZWxDaGFuZ2VFdmVudCIsIldpa2kub25Ob2RlRGF0YUNoYW5nZWQiLCJXaWtpLm9uUmVzdWx0cyIsIldpa2kudXBkYXRlVmlldyIsIldpa2kuZ29Ub1ZpZXciLCJXaWtpLmlzUm91dGVPck5vZGUiLCJXaWtpLmNyZWF0ZUVuZHBvaW50VVJJIiwiV2lraS50cmVlTW9kaWZpZWQiLCJXaWtpLnJlbG9hZFJvdXRlSWRzIiwiV2lraS5vblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCIsIldpa2kuc2hvd0dyYXBoIiwiV2lraS5nZXROb2RlSWQiLCJXaWtpLmdldFNlbGVjdGVkT3JSb3V0ZUZvbGRlciIsIldpa2kuZ2V0Q29udGFpbmVyRWxlbWVudCIsIldpa2kubGF5b3V0R3JhcGgiLCJXaWtpLmdldExpbmsiLCJXaWtpLmdldE5vZGVCeUNJRCIsIldpa2kudXBkYXRlU2VsZWN0aW9uIiwiV2lraS5nZXRXaWR0aCIsIldpa2kuZ2V0Rm9sZGVySWRBdHRyaWJ1dGUiLCJXaWtpLmdldFJvdXRlRm9sZGVyIiwiV2lraS5jb21taXRQYXRoIiwiV2lraS5yZXR1cm5Ub0RpcmVjdG9yeSIsIldpa2kuZG9DcmVhdGUiLCJXaWtpLmRvQ3JlYXRlLnRvUGF0aCIsIldpa2kuZG9DcmVhdGUudG9Qcm9maWxlTmFtZSIsIldpa2kucHV0UGFnZSIsIldpa2kuZ2V0TmV3RG9jdW1lbnRQYXRoIiwiV2lraS5pc0NyZWF0ZSIsIldpa2kub25GaWxlQ29udGVudHMiLCJXaWtpLnVwZGF0ZVNvdXJjZVZpZXciLCJXaWtpLm9uRm9ybVNjaGVtYSIsIldpa2kuc2F2ZVRvIiwiV2lraS5jaGlsZExpbmsiLCJXaWtpLm9uRm9ybURhdGEiLCJXaWtpLnN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rIiwiV2lraS5sb2FkQnJlYWRjcnVtYnMiLCJXaWtpLmlzRGlmZlZpZXciLCJXaWtpLnZpZXdDb250ZW50cyIsIldpa2kub25GaWxlRGV0YWlscyIsIldpa2kuY2hlY2tGaWxlRXhpc3RzIiwiV2lraS5nZXRSZW5hbWVGaWxlUGF0aCIsIldpa2kuZ2V0UmVuYW1lRGlhbG9nIiwiV2lraS5nZXRNb3ZlRGlhbG9nIiwiV2lraS5nZXREZWxldGVEaWFsb2ciLCJXaWtpLm9mZnNldFRvcCIsIldpa2kuc2Nyb2xsVG9IYXNoIiwiV2lraS5zY3JvbGxUb0lkIiwiV2lraS5hZGRMaW5rcyIsIldpa2kub25FdmVudEluc2VydGVkIiwiV2lraS5jcmVhdGVTb3VyY2VCcmVhZGNydW1icyIsIldpa2kuY3JlYXRlRWRpdGluZ0JyZWFkY3J1bWIiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5jb25zdHJ1Y3RvciIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0UGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucHV0UGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuaGlzdG9yeSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tbWl0SW5mbyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tbWl0VHJlZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZGlmZiIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuYnJhbmNoZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmV4aXN0cyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LnJlbmFtZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvR2V0IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5kb1Bvc3QiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvUG9zdEZvcm0iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbXBsZXRlUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0UGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0TG9nUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0Q29udGVudCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuanNvbkNoaWxkQ29udGVudHMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmdpdCJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQ2VBLElBQU8sSUFBSSxDQWVWO0FBZkQsV0FBTyxJQUFJLEVBQUMsQ0FBQztJQUVBQSxlQUFVQSxHQUFHQSxpQkFBaUJBLENBQUNBO0lBRS9CQSxRQUFHQSxHQUFtQkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZUFBVUEsQ0FBQ0EsQ0FBQ0E7SUFFN0NBLGlCQUFZQSxHQUFHQSxtQkFBbUJBLENBQUNBO0lBR25DQSxvQkFBZUEsR0FBR0EsVUFBVUEsQ0FBQ0E7SUFDN0JBLHVCQUFrQkEsR0FBR0EsU0FBU0EsQ0FBQ0E7SUFDL0JBLDBCQUFxQkEsR0FBR0EsYUFBYUEsQ0FBQ0E7SUFFdENBLFlBQU9BLEdBQU9BLEVBQUVBLENBQUNBO0FBRTlCQSxDQUFDQSxFQWZNLElBQUksS0FBSixJQUFJLFFBZVY7O0FDOUJELElBQU8sS0FBSyxDQWdPWDtBQWhPRCxXQUFPLEtBQUssRUFBQyxDQUFDO0lBRURDLGFBQU9BLEdBQUdBLDhCQUE4QkEsQ0FBQ0E7SUFFekNBLFVBQUlBLEdBQUdBLEdBQUdBLEdBQUdBLGFBQU9BLENBQUNBO0lBQ3JCQSxnQkFBVUEsR0FBR0EsT0FBT0EsQ0FBQ0E7SUFDckJBLGdCQUFVQSxHQUFHQSxnQkFBZ0JBLENBQUNBO0lBQzlCQSxrQkFBWUEsR0FBR0EsZ0JBQVVBLEdBQUdBLE9BQU9BLENBQUNBO0lBQ3BDQSxTQUFHQSxHQUFrQkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZ0JBQVVBLENBQUNBLENBQUNBO0lBRTVDQSxvQkFBY0EsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxDQUFDQTtJQUU1Q0EscUJBQWVBLEdBQUdBLFVBQVVBLENBQUNBLGVBQWVBLENBQUNBO0lBQzdDQSxzQkFBZ0JBLEdBQUdBLE9BQU9BLENBQUNBO0lBRTNCQSxvQkFBY0EsR0FBR0EsS0FBS0EsQ0FBQ0E7SUFFbENBLFNBQWdCQSxPQUFPQSxDQUFDQSxTQUFTQTtRQUMvQkMsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7SUFDZEEsQ0FBQ0E7SUFGZUQsYUFBT0EsR0FBUEEsT0FFZkEsQ0FBQUE7SUFFREEsU0FBZ0JBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLFlBQVlBO1FBQ3ZERSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxZQUFZQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxVQUFVQSxDQUFDQSwwQkFBMEJBLEVBQUVBLENBQUNBO1FBQ3hGQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxZQUFZQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUMzQ0EsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsU0FBU0EsQ0FBQ0EsYUFBYUEsRUFBRUEsQ0FBQ0E7UUFDbERBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFNBQVNBLENBQUNBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1FBQzlEQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLEdBQUdBLFNBQVNBLENBQUNBLHdCQUF3QkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDL0VBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFNBQVNBLENBQUNBLHVCQUF1QkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7SUFDNUVBLENBQUNBO0lBUGVGLGVBQVNBLEdBQVRBLFNBT2ZBLENBQUFBO0lBRURBLFNBQWdCQSxXQUFXQSxDQUFDQSxTQUFTQSxFQUFFQSxJQUFJQSxFQUFFQSxZQUFZQTtRQUN2REcsSUFBSUEsSUFBSUEsR0FBR0EsU0FBU0EsQ0FBQ0EsV0FBV0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDNUNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO1lBQ1RBLEVBQUVBLENBQUNBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBO2dCQUNqQkEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsZ0JBQWdCQSxFQUFFQSxJQUFJQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQTtZQUNyRUEsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEVBQUVBLGlCQUFpQkEsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDeERBLENBQUNBO1FBQ0hBLENBQUNBO1FBQ0RBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO0lBQ2RBLENBQUNBO0lBVmVILGlCQUFXQSxHQUFYQSxXQVVmQSxDQUFBQTtJQUVEQSxTQUFnQkEsWUFBWUEsQ0FBQ0EsWUFBWUEsRUFBRUEsU0FBU0E7UUFDbERJLElBQUlBLElBQUlBLEdBQUdBLFNBQVNBLENBQUNBLFdBQVdBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1FBQzVDQSxFQUFFQSxDQUFDQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNqQkEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsc0JBQXNCQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQTtRQUNyRUEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsaUJBQWlCQSxDQUFDQSxDQUFDQTtRQUNsREEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFQZUosa0JBQVlBLEdBQVpBLFlBT2ZBLENBQUFBO0lBRURBLFNBQWdCQSxXQUFXQSxDQUFDQSxXQUFXQTtRQUNyQ0ssTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsRUFBRUEsUUFBUUEsQ0FBQ0EsQ0FBQ0E7SUFDaERBLENBQUNBO0lBRmVMLGlCQUFXQSxHQUFYQSxXQUVmQSxDQUFBQTtJQUVEQSxTQUFnQkEsVUFBVUEsQ0FBQ0EsV0FBV0EsRUFBRUEsSUFBSUE7UUFDMUNNLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLEVBQUVBLGFBQWFBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO0lBQzNEQSxDQUFDQTtJQUZlTixnQkFBVUEsR0FBVkEsVUFFZkEsQ0FBQUE7SUFFREEsU0FBZ0JBLGFBQWFBLENBQUNBLFdBQVdBLEVBQUVBLFNBQVNBLEVBQUVBLEVBQUVBLEVBQUVBLFNBQVNBLEVBQUVBLFlBQW1CQTtRQUFuQk8sNEJBQW1CQSxHQUFuQkEsbUJBQW1CQTtRQUN0RkEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsRUFBRUEsU0FBU0EsRUFBRUEsU0FBU0EsRUFBRUEsRUFBRUEsRUFBRUEsU0FBU0EsRUFBRUEsWUFBWUEsQ0FBQ0EsQ0FBQ0E7SUFDekZBLENBQUNBO0lBRmVQLG1CQUFhQSxHQUFiQSxhQUVmQSxDQUFBQTtJQUVEQSxTQUFnQkEsb0JBQW9CQSxDQUFDQSxXQUFXQSxFQUFFQSxTQUFTQTtRQUN6RFEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsRUFBRUEsU0FBU0EsRUFBRUEsU0FBU0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7SUFDdkVBLENBQUNBO0lBRmVSLDBCQUFvQkEsR0FBcEJBLG9CQUVmQSxDQUFBQTtJQUVEQSxTQUFnQkEscUJBQXFCQSxDQUFDQSxXQUFXQSxFQUFFQSxTQUFTQTtRQUMxRFMsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsRUFBRUEsU0FBU0EsRUFBRUEsVUFBVUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7SUFDeEVBLENBQUNBO0lBRmVULDJCQUFxQkEsR0FBckJBLHFCQUVmQSxDQUFBQTtJQUVEQSxTQUFnQkEsa0JBQWtCQSxDQUFDQSxXQUFXQSxFQUFFQSxTQUFTQSxFQUFFQSxFQUFFQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQTtRQUNwRlUsRUFBRUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsSUFBSUEsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDcEJBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLEVBQUVBLGNBQWNBLEVBQUVBLFNBQVNBLEVBQUVBLEVBQUVBLEVBQUVBLFNBQVNBLEVBQUVBLFlBQVlBLENBQUNBLENBQUNBO1FBQzlGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxFQUFFQSxjQUFjQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUNqRUEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFOZVYsd0JBQWtCQSxHQUFsQkEsa0JBTWZBLENBQUFBO0lBT0RBLFNBQVNBLFlBQVlBLENBQUNBLFVBQVVBLEVBQUVBLFlBQVlBO1FBQzVDVyxFQUFFQSxDQUFDQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNqQkEsSUFBSUEsT0FBT0EsR0FBR0EsVUFBVUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7WUFDaERBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO2dCQUNiQSxPQUFPQSxHQUFHQSxFQUFFQSxDQUFDQTtnQkFDYkEsVUFBVUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsR0FBR0EsT0FBT0EsQ0FBQ0E7WUFDOUNBLENBQUNBO1lBQ0RBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBO1FBQ2pCQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxXQUFXQSxDQUFDQTtRQUNoQ0EsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFRFgsU0FBZ0JBLGdCQUFnQkEsQ0FBQ0EsVUFBVUEsRUFBRUEsWUFBWUEsRUFBRUEsUUFBUUE7UUFDakVZLElBQUlBLE9BQU9BLEdBQUdBLFlBQVlBLENBQUNBLFVBQVVBLEVBQUVBLFlBQVlBLENBQUNBLENBQUNBO1FBQ3JEQSxPQUFPQSxDQUFDQSxTQUFTQSxHQUFHQSxRQUFRQSxDQUFDQTtJQUMvQkEsQ0FBQ0E7SUFIZVosc0JBQWdCQSxHQUFoQkEsZ0JBR2ZBLENBQUFBO0lBRURBLFNBQWdCQSxnQkFBZ0JBLENBQUNBLFVBQVVBLEVBQUVBLFlBQVlBO1FBQ3ZEYSxJQUFJQSxPQUFPQSxHQUFHQSxZQUFZQSxDQUFDQSxVQUFVQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQTtRQUNyREEsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsSUFBSUEsRUFBRUEsQ0FBQ0E7SUFDakNBLENBQUNBO0lBSGViLHNCQUFnQkEsR0FBaEJBLGdCQUdmQSxDQUFBQTtJQUVEQSxTQUFTQSxvQkFBb0JBLENBQUNBLFVBQVVBLEVBQUVBLFlBQVlBO1FBQ3BEYyxJQUFJQSxPQUFPQSxHQUFHQSxZQUFZQSxDQUFDQSxVQUFVQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQTtRQUNyREEsSUFBSUEsYUFBYUEsR0FBR0EsT0FBT0EsQ0FBQ0EsY0FBY0EsQ0FBQ0E7UUFDM0NBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLGFBQWFBLENBQUNBLENBQUNBLENBQUNBO1lBQ25CQSxhQUFhQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUNuQkEsT0FBT0EsQ0FBQ0EsY0FBY0EsR0FBR0EsYUFBYUEsQ0FBQ0E7UUFDekNBLENBQUNBO1FBQ0RBLE1BQU1BLENBQUNBLGFBQWFBLENBQUNBO0lBQ3ZCQSxDQUFDQTtJQUVEZCxTQUFnQkEscUJBQXFCQSxDQUFDQSxVQUFVQSxFQUFFQSxZQUFZQSxFQUFFQSxFQUFFQTtRQUNoRWUsSUFBSUEsYUFBYUEsR0FBR0Esb0JBQW9CQSxDQUFDQSxVQUFVQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQTtRQUNuRUEsTUFBTUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7SUFDM0JBLENBQUNBO0lBSGVmLDJCQUFxQkEsR0FBckJBLHFCQUdmQSxDQUFBQTtJQUVEQSxTQUFnQkEscUJBQXFCQSxDQUFDQSxVQUFVQSxFQUFFQSxZQUFZQSxFQUFFQSxFQUFFQSxFQUFFQSxJQUFJQTtRQUN0RWdCLElBQUlBLGFBQWFBLEdBQUdBLG9CQUFvQkEsQ0FBQ0EsVUFBVUEsRUFBRUEsWUFBWUEsQ0FBQ0EsQ0FBQ0E7UUFDbkVBLE1BQU1BLENBQUNBLGFBQWFBLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBO0lBQ2xDQSxDQUFDQTtJQUhlaEIsMkJBQXFCQSxHQUFyQkEscUJBR2ZBLENBQUFBO0lBRURBLFNBQWdCQSxVQUFVQSxDQUFDQSxJQUFJQTtRQUM3QmlCLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBLEtBQUtBLElBQUlBLEVBQUVBLENBQUNBO1FBQzdCQSxJQUFJQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQSxRQUFRQSxJQUFJQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTtRQUN2Q0EsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7UUFDckJBLElBQUlBLFNBQVNBLEdBQUdBLElBQUlBLENBQUNBO1FBQ3JCQSxJQUFJQSxVQUFVQSxHQUFHQSxLQUFLQSxDQUFDQSxVQUFVQSxDQUFDQTtRQUNsQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsVUFBVUEsSUFBSUEsVUFBVUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDbERBLFVBQVVBLEdBQUdBLFNBQVNBLEdBQUdBLFVBQVVBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2pEQSxLQUFLQSxDQUFDQSxVQUFVQSxHQUFHQSxVQUFVQSxDQUFDQTtRQUNoQ0EsQ0FBQ0E7UUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsSUFBSUEsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDakJBLElBQUlBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBO1lBQ3JDQSxJQUFJQSxDQUFDQSxhQUFhQSxHQUFHQSxZQUFZQSxDQUFDQSxZQUFZQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUMzREEsSUFBSUEsQ0FBQ0EsV0FBV0EsR0FBR0Esd0JBQXdCQSxHQUFHQSxZQUFZQSxHQUFHQSxNQUFNQSxDQUFDQTtZQUNwRUEsSUFBSUEsUUFBUUEsR0FBR0EsVUFBVUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7WUFDbkNBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUNiQSxJQUFJQSxlQUFlQSxHQUFHQSxRQUFRQSxDQUFDQSxHQUFHQSxDQUFDQSxpQkFBaUJBLENBQUNBLENBQUNBO2dCQUN0REEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3BCQSxJQUFJQSxTQUFTQSxHQUFHQSxlQUFlQSxDQUFDQSxXQUFXQSxDQUFDQSxzQkFBZ0JBLENBQUNBLENBQUNBO29CQUM5REEsSUFBSUEsV0FBV0EsR0FBR0EsZUFBZUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EscUJBQWVBLENBQUNBLENBQUNBO29CQUMvREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsSUFBSUEsV0FBV0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQzdCQSxJQUFJQSxRQUFRQSxHQUFHQSxXQUFXQSxDQUFDQSxRQUFRQSxDQUFDQTt3QkFDcENBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBOzRCQUNiQSxJQUFJQSxJQUFJQSxHQUFHQSxXQUFXQSxDQUFDQSxJQUFJQSxDQUFDQTs0QkFDNUJBLElBQUlBLFFBQVFBLEdBQUdBLENBQUNBLElBQUlBLElBQUlBLElBQUlBLEtBQUtBLEVBQUVBLElBQUlBLElBQUlBLEtBQUtBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBOzRCQUN2RUEsSUFBSUEsUUFBUUEsR0FBR0EsQ0FBQ0EsSUFBSUEsSUFBSUEsSUFBSUEsS0FBS0EsR0FBR0EsQ0FBQ0EsR0FBR0EsVUFBVUEsR0FBR0EsU0FBU0EsQ0FBQ0E7NEJBQy9EQSxJQUFJQSxXQUFXQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxHQUFHQSxRQUFRQSxHQUFHQSxRQUFRQSxHQUFHQSxHQUFHQSxFQUFFQSxZQUFZQSxHQUFHQSxNQUFNQSxDQUFDQSxDQUFDQTs0QkFFL0ZBLElBQUlBLENBQUNBLGdCQUFnQkEsR0FBR0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsRUFDL0NBLCtDQUErQ0EsR0FBR0EsSUFBSUEsR0FBR0EsWUFBWUEsR0FBR0EsV0FBV0EsQ0FBQ0EsQ0FBQ0E7d0JBQ3pGQSxDQUFDQTtvQkFDSEEsQ0FBQ0E7Z0JBQ0hBLENBQUNBO1lBQ0hBLENBQUNBO1FBQ0hBLENBQUNBO0lBQ0hBLENBQUNBO0lBbkNlakIsZ0JBQVVBLEdBQVZBLFVBbUNmQSxDQUFBQTtJQUVEQSxTQUFnQkEsZ0JBQWdCQTtRQUM5QmtCLElBQUlBLFVBQVVBLEdBQUdBLFlBQVlBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0E7UUFDbkRBLElBQUlBLEtBQUtBLEdBQUdBLFlBQVlBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBO1FBQ3RDQSxJQUFJQSxNQUFNQSxHQUFHQTtZQUNYQSxPQUFPQSxFQUFFQSxFQUNSQTtTQU9GQSxDQUFDQTtRQUNGQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtJQUNoQkEsQ0FBQ0E7SUFkZWxCLHNCQUFnQkEsR0FBaEJBLGdCQWNmQSxDQUFBQTtJQUVEQSxTQUFTQSxnQkFBZ0JBLENBQUNBLEdBQUdBLEVBQUVBLElBQUlBLEVBQUVBLEtBQUtBO1FBQ3hDbUIsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsSUFBSUEsSUFBSUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekJBLElBQUlBLEdBQUdBLEdBQUlBLENBQUNBLEdBQUdBLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBO1lBQy9DQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFJQSxJQUFJQSxHQUFHQSxHQUFHQSxHQUFHQSxrQkFBa0JBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO1FBQzdEQSxDQUFDQTtRQUNEQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQTtJQUNiQSxDQUFDQTtJQUVEbkIsU0FBZ0JBLGFBQWFBLENBQUNBLEdBQUdBLEVBQUVBLFVBQWlCQSxFQUFFQSxLQUFZQTtRQUEvQm9CLDBCQUFpQkEsR0FBakJBLGlCQUFpQkE7UUFBRUEscUJBQVlBLEdBQVpBLFlBQVlBO1FBQ2hFQSxVQUFVQSxHQUFHQSxVQUFVQSxJQUFJQSxZQUFZQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBO1FBQzdEQSxLQUFLQSxHQUFHQSxLQUFLQSxJQUFJQSxZQUFZQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQTtRQUUzQ0EsR0FBR0EsR0FBR0EsZ0JBQWdCQSxDQUFDQSxHQUFHQSxFQUFFQSxXQUFXQSxFQUFFQSxVQUFVQSxDQUFDQSxDQUFDQTtRQUNyREEsR0FBR0EsR0FBR0EsZ0JBQWdCQSxDQUFDQSxHQUFHQSxFQUFFQSxZQUFZQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQTtRQUNqREEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0E7SUFDYkEsQ0FBQ0E7SUFQZXBCLG1CQUFhQSxHQUFiQSxhQU9mQSxDQUFBQTtJQUVEQSxTQUFnQkEsa0JBQWtCQSxDQUFDQSxPQUFPQSxFQUFFQSxVQUFVQTtRQUNwRHFCLEVBQUVBLENBQUNBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBLENBQUNBO1lBQ2ZBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLHFCQUFxQkEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsRUFBRUEsVUFBVUEsQ0FBQ0EsQ0FBQ0E7UUFDekVBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO1FBQ2RBLENBQUNBO0lBQ0hBLENBQUNBO0lBTmVyQix3QkFBa0JBLEdBQWxCQSxrQkFNZkEsQ0FBQUE7SUFFREEsU0FBZ0JBLGdCQUFnQkE7UUFDOUJzQixJQUFJQSxZQUFZQSxHQUFHQSxVQUFVQSxDQUFDQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUMzREEsSUFBSUEsVUFBVUEsR0FBR0EsWUFBWUEsQ0FBQ0EsbUJBQW1CQSxDQUFDQSxDQUFDQTtRQUVuREEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7SUFLbkNBLENBQUNBO0lBVGV0QixzQkFBZ0JBLEdBQWhCQSxnQkFTZkEsQ0FBQUE7SUFFREEsU0FBZ0JBLDZCQUE2QkEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0E7UUFDN0R1QixFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxnQkFBZ0JBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO1lBQ3hCQSxJQUFJQSxPQUFPQSxHQUFHQSxTQUFTQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUN0REEsSUFBSUEsU0FBU0EsR0FBR0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsRUFBRUEsYUFBYUEsQ0FBQ0EsQ0FBQ0E7WUFDeERBLFNBQUdBLENBQUNBLElBQUlBLENBQUNBLGtDQUFrQ0EsR0FBR0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDekRBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLENBQUFBO1FBQzNCQSxDQUFDQTtJQUNIQSxDQUFDQTtJQVBldkIsbUNBQTZCQSxHQUE3QkEsNkJBT2ZBLENBQUFBO0FBQ0hBLENBQUNBLEVBaE9NLEtBQUssS0FBTCxLQUFLLFFBZ09YOztBQzlNRCxJQUFPLElBQUksQ0FzSVY7QUF0SUQsV0FBTyxJQUFJLEVBQUMsQ0FBQztJQUVBRCxZQUFPQSxHQUFHQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxlQUFVQSxFQUFFQSxDQUFDQSxLQUFLQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUVwRUEsSUFBSUEsR0FBR0EsR0FBR0EsU0FBU0EsQ0FBQ0E7SUFFcEJBLFlBQU9BLENBQUNBLEdBQUdBLENBQUNBLFVBQUNBLFVBQVVBLEVBQUVBLFNBQWlDQSxFQUFFQSxlQUFlQSxFQUFFQSxlQUFlQSxFQUFFQSxtQkFBbUJBO1FBRS9HQSxTQUFTQSxDQUFDQSxFQUFFQSxDQUFDQSxhQUFhQSxDQUFDQSxPQUFPQSxDQUFDQSxPQUFPQSxFQUFFQSxlQUFVQSxFQUFFQSxVQUFDQSxLQUFLQTtZQUM1REEsS0FBS0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsVUFBQ0EsSUFBSUE7Z0JBQ2pCQSxNQUFNQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDZkEsS0FBS0EsT0FBT0EsQ0FBQ0E7b0JBQ2JBLEtBQUtBLEtBQUtBLENBQUNBO29CQUNYQSxLQUFLQSxNQUFNQSxDQUFDQTtvQkFDWkEsS0FBS0EsaUJBQWlCQTt3QkFDcEJBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBLGNBQU1BLFlBQUtBLEVBQUxBLENBQUtBLENBQUNBO2dCQUMvQkEsQ0FBQ0E7WUFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDTEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDSEEsU0FBU0EsQ0FBQ0EsR0FBR0EsQ0FBQ0E7WUFDWkEsRUFBRUEsRUFBRUEsU0FBU0E7WUFDYkEsS0FBS0EsRUFBRUEsY0FBTUEsZ0JBQVNBLEVBQVRBLENBQVNBO1lBQ3RCQSxPQUFPQSxFQUFFQSxjQUFNQSx5Q0FBa0NBLEVBQWxDQSxDQUFrQ0E7WUFDakRBLE9BQU9BLEVBQUVBLGNBQU1BLE9BQUFBLGVBQWVBLENBQUNBLFVBQVVBLENBQUNBLDBCQUFxQkEsQ0FBQ0EsSUFBSUEsZUFBZUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EscUJBQXFCQSxDQUFDQSxFQUF0R0EsQ0FBc0dBO1lBQ3JIQSxJQUFJQSxFQUFFQSxjQUFNQSxtQkFBWUEsRUFBWkEsQ0FBWUE7WUFDeEJBLFFBQVFBLEVBQUVBLGNBQU1BLFlBQUtBLEVBQUxBLENBQUtBO1NBQ3RCQSxDQUFDQSxDQUFDQTtRQUVIQSxJQUFJQSxpQkFBaUJBLEdBQUdBLFVBQVVBLENBQUNBLGlCQUFpQkEsQ0FBQ0E7UUFFckRBLFNBQVNBLENBQUNBLEdBQUdBLENBQUNBO1lBQ1pBLEVBQUVBLEVBQUVBLFFBQVFBO1lBQ1pBLEtBQUtBLEVBQUVBLGNBQU9BLGFBQU1BLEVBQU5BLENBQU1BO1lBQ3BCQSxPQUFPQSxFQUFFQSxjQUFNQSxzRkFBK0VBLEVBQS9FQSxDQUErRUE7WUFDOUZBLE9BQU9BLEVBQUVBLGNBQU1BLE9BQUFBLGVBQWVBLENBQUNBLFVBQVVBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsRUFBN0NBLENBQTZDQTtZQUM1REEsSUFBSUEsRUFBRUEsY0FBTUEsT0FBQUEsVUFBVUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsZUFBZUEsQ0FBQ0EsRUFBMUNBLENBQTBDQTtZQUN0REEsUUFBUUEsRUFBRUEsY0FBTUEsWUFBS0EsRUFBTEEsQ0FBS0E7U0FDdEJBLENBQUNBLENBQUNBO1FBRUhBLFNBQVNBLENBQUNBLEdBQUdBLENBQUNBO1lBQ1pBLEVBQUVBLEVBQUVBLFFBQVFBO1lBQ1pBLEtBQUtBLEVBQUVBLGNBQU1BLHVCQUFnQkEsRUFBaEJBLENBQWdCQTtZQUM3QkEsT0FBT0EsRUFBRUEsY0FBTUEsd0RBQWlEQSxFQUFqREEsQ0FBaURBO1lBQ2hFQSxPQUFPQSxFQUFFQSxjQUFNQSxPQUFBQSxlQUFlQSxDQUFDQSxVQUFVQSxDQUFDQSxRQUFRQSxDQUFDQSxFQUFwQ0EsQ0FBb0NBO1lBQ25EQSxPQUFPQSxFQUFFQTtZQUE0QkEsQ0FBQ0E7WUFDdENBLElBQUlBLEVBQUVBO2dCQUNKQSxJQUFJQSxJQUFJQSxHQUFHQTtvQkFDVEEsTUFBTUEsRUFBRUEsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUE7b0JBQzVCQSxLQUFLQSxFQUFFQSxXQUFXQSxDQUFDQSxhQUFhQSxFQUFFQTtpQkFDbkNBLENBQUNBO2dCQUNGQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxHQUFHQSxDQUFDQSxlQUFlQSxDQUFDQSxXQUFXQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFFbkRBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLHFCQUFxQkEsQ0FBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ25HQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQTtZQUN4QkEsQ0FBQ0E7U0FDRkEsQ0FBQ0EsQ0FBQ0E7UUFFSEEsU0FBU0EsQ0FBQ0EsR0FBR0EsQ0FBQ0E7WUFDWkEsRUFBRUEsRUFBRUEsU0FBU0E7WUFDYkEsS0FBS0EsRUFBRUEsY0FBT0EsZ0JBQVNBLEVBQVRBLENBQVNBO1lBQ3ZCQSxPQUFPQSxFQUFFQSxjQUFNQSx1RUFBZ0VBLEVBQWhFQSxDQUFnRUE7WUFDL0VBLE9BQU9BLEVBQUVBLGNBQU1BLE9BQUFBLGVBQWVBLENBQUNBLFVBQVVBLENBQUNBLHVCQUFrQkEsQ0FBQ0EsRUFBOUNBLENBQThDQTtZQUM3REEsSUFBSUEsRUFBRUEsY0FBTUEsT0FBQUEsZUFBZUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsdUJBQWtCQSxDQUFDQSxFQUEvQ0EsQ0FBK0NBO1lBQzNEQSxRQUFRQSxFQUFFQSxjQUFNQSxZQUFLQSxFQUFMQSxDQUFLQTtTQUN0QkEsQ0FBQ0EsQ0FBQ0E7UUFFSEEsU0FBU0EsQ0FBQ0EsR0FBR0EsQ0FBQ0E7WUFDWkEsRUFBRUEsRUFBRUEsTUFBTUE7WUFDVkEsS0FBS0EsRUFBRUEsY0FBT0EsYUFBTUEsRUFBTkEsQ0FBTUE7WUFDcEJBLE9BQU9BLEVBQUVBLGNBQU1BLGdEQUF5Q0EsRUFBekNBLENBQXlDQTtZQUN4REEsT0FBT0EsRUFBRUEsY0FBTUEsT0FBQUEsZUFBZUEsQ0FBQ0EsVUFBVUEsQ0FBQ0Esb0JBQWVBLENBQUNBLEVBQTNDQSxDQUEyQ0E7WUFDMURBLElBQUlBLEVBQUVBO2dCQUNKQSxJQUFJQSxNQUFNQSxHQUFHQSxlQUFlQSxDQUFDQSxXQUFXQSxDQUFDQSxvQkFBZUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzFEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFlYkEsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO1lBQ2hCQSxDQUFDQTtZQUNEQSxRQUFRQSxFQUFFQSxjQUFNQSxZQUFLQSxFQUFMQSxDQUFLQTtTQUN0QkEsQ0FBQ0EsQ0FBQ0E7UUFhSEEsbUJBQW1CQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxZQUFPQSxDQUFDQSxJQUFJQSxFQUFFQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxpQkFBWUEsRUFBRUEsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFFakdBLFFBQUdBLENBQUNBLElBQUlBLENBQUNBLG9CQUFvQkEsRUFBRUEsWUFBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7UUFDaERBLFFBQUdBLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLEVBQUVBLFlBQU9BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO0lBQzVDQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUVIQSxrQkFBa0JBLENBQUNBLHdCQUF3QkEsQ0FBQ0EsVUFBQ0EsSUFBSUE7UUFDL0NBLENBQUNBLENBQUNBLElBQUlBLENBQUNBO1lBQ0xBLEdBQUdBLEVBQUVBLG1CQUFtQkEsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsRUFBRUE7WUFDckNBLE9BQU9BLEVBQUVBLFVBQUNBLElBQUlBO2dCQUNaQSxJQUFBQSxDQUFDQTtvQkFDQ0EsWUFBT0EsR0FBR0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ25DQSxDQUFFQTtnQkFBQUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2JBLFlBQU9BLEdBQUdBO3dCQUNSQSxJQUFJQSxFQUFFQSxpQkFBaUJBO3dCQUN2QkEsT0FBT0EsRUFBRUEsRUFBRUE7cUJBQ1pBLENBQUNBO2dCQUNKQSxDQUFDQTtnQkFDREEsSUFBSUEsRUFBRUEsQ0FBQ0E7WUFDVEEsQ0FBQ0E7WUFDREEsS0FBS0EsRUFBRUEsVUFBQ0EsS0FBS0EsRUFBRUEsSUFBSUEsRUFBRUEsTUFBTUE7Z0JBQ3pCQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxrQ0FBa0NBLEVBQUVBLEtBQUtBLEVBQUVBLFNBQVNBLEVBQUVBLElBQUlBLEVBQUVBLFdBQVdBLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBO2dCQUMzRkEsSUFBSUEsRUFBRUEsQ0FBQ0E7WUFDVEEsQ0FBQ0E7WUFDREEsUUFBUUEsRUFBRUEsTUFBTUE7U0FDakJBLENBQUNBLENBQUNBO0lBQ0xBLENBQUNBLENBQUNBLENBQUNBO0lBRUhBLGtCQUFrQkEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsZUFBVUEsQ0FBQ0EsQ0FBQ0E7QUFDM0NBLENBQUNBLEVBdElNLElBQUksS0FBSixJQUFJLFFBc0lWOztBQ3RKRCxJQUFPLElBQUksQ0FJVjtBQUpELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFDWEEsWUFBT0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsWUFBWUEsRUFBRUEsVUFBQ0EsTUFBTUE7UUFDdENBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLFlBQU9BLENBQUNBO0lBQ3hCQSxDQUFDQSxDQUFDQSxDQUFDQTtBQUNMQSxDQUFDQSxFQUpNLElBQUksS0FBSixJQUFJLFFBSVY7O0FDSkQsSUFBTyxLQUFLLENBeUNYO0FBekNELFdBQU8sS0FBSyxFQUFDLENBQUM7SUFFREMsYUFBT0EsR0FBR0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZ0JBQVVBLEVBQUVBLENBQUNBLGFBQWFBLEVBQUVBLFdBQVdBLENBQUNBLENBQUNBLENBQUNBO0lBQ25FQSxnQkFBVUEsR0FBR0EsYUFBYUEsQ0FBQ0Esd0JBQXdCQSxDQUFDQSxhQUFPQSxFQUFFQSxnQkFBVUEsQ0FBQ0EsQ0FBQ0E7SUFDekVBLFdBQUtBLEdBQUdBLGFBQWFBLENBQUNBLHFCQUFxQkEsQ0FBQ0Esa0JBQVlBLENBQUNBLENBQUNBO0lBRXJFQSxhQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxnQkFBZ0JBLEVBQUVBLFVBQUNBLGNBQXNDQTtRQUV2RUEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZ0JBQWdCQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFPQSxFQUFFQSxnQkFBZ0JBLENBQUNBLENBQUNBLENBQUNBO1FBRTNFQSxjQUFjQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFPQSxFQUFFQSxnQkFBZ0JBLENBQUNBLEVBQUVBLFdBQUtBLENBQUNBLG9CQUFvQkEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FDaEdBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLGFBQU9BLEVBQUVBLGVBQWVBLENBQUNBLEVBQUVBLFdBQUtBLENBQUNBLFdBQVdBLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBLENBQzFFQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFPQSxFQUFFQSxRQUFRQSxDQUFDQSxFQUFFQSxXQUFLQSxDQUFDQSxZQUFZQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUV4RUEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsYUFBT0EsRUFBRUEsZ0RBQWdEQSxDQUFDQSxFQUFFQSxVQUFDQSxJQUFJQTtZQUNoRkEsY0FBY0EsQ0FDWEEsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsV0FBV0EsQ0FBQ0EsRUFBRUEsV0FBS0EsQ0FBQ0EsZUFBZUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FDdkVBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEVBQUVBLGtCQUFrQkEsQ0FBQ0EsRUFBRUEsV0FBS0EsQ0FBQ0EsZUFBZUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FDOUVBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEVBQUVBLGNBQWNBLENBQUNBLEVBQUVBLFdBQUtBLENBQUNBLGNBQWNBLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBLENBQ3pFQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxFQUFFQSxxQkFBcUJBLENBQUNBLEVBQUVBLFdBQUtBLENBQUNBLGNBQWNBLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO1FBQ3RGQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUVMQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUVKQSxhQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxhQUFhQSxFQUFFQSxDQUFDQSxJQUFJQSxFQUFFQSxZQUFZQSxFQUFFQSxVQUFDQSxFQUFlQSxFQUFFQSxVQUErQkE7UUFDbkdBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLGdCQUFnQkEsRUFBRUEsR0FBR0EsUUFBUUEsR0FBR0EsVUFBVUEsQ0FBQ0EsdUJBQXVCQSxFQUFFQSxHQUFHQSxtQ0FBbUNBLENBQUNBO0lBQy9IQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUdKQSxhQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxZQUFZQSxFQUFFQSxDQUFDQSxJQUFJQSxFQUFFQSxZQUFZQSxFQUFFQSxVQUFDQSxFQUFlQSxFQUFFQSxVQUErQkE7UUFDbEdBLE1BQU1BLENBQUNBO1lBQ0xBLFdBQVdBLEVBQUVBLEVBQUVBO1lBQ2ZBLFFBQVFBLEVBQUVBLEVBQUVBO1NBQ2JBLENBQUFBO0lBQ0hBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0lBRUpBLGFBQU9BLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLGNBQWNBLEVBQUVBLFdBQVdBLEVBQUVBLFVBQUNBLFlBQVlBLEVBQUVBLFNBQVNBO1FBQ2hFQSxZQUFZQSxDQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxrQkFBWUEsR0FBR0Esa0JBQWtCQSxDQUFDQTtJQUM1REEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFFSkEsa0JBQWtCQSxDQUFDQSxTQUFTQSxDQUFDQSxnQkFBVUEsQ0FBQ0EsQ0FBQ0E7QUFDM0NBLENBQUNBLEVBekNNLEtBQUssS0FBTCxLQUFLLFFBeUNYOztBQ3hDRCxJQUFPLEtBQUssQ0E0U1g7QUE1U0QsV0FBTyxLQUFLLEVBQUMsQ0FBQztJQUVEQSx1QkFBaUJBLEdBQUdBLGdCQUFVQSxDQUFDQSxtQkFBbUJBLEVBQzNEQSxDQUFDQSxRQUFRQSxFQUFFQSxnQkFBZ0JBLEVBQUVBLFdBQVdBLEVBQUVBLGNBQWNBLEVBQUVBLE9BQU9BLEVBQUVBLFVBQVVBLEVBQUVBLGFBQWFBLEVBQUVBLFlBQVlBLEVBQ3hHQSxVQUFDQSxNQUFNQSxFQUFFQSxjQUF1Q0EsRUFBRUEsU0FBNkJBLEVBQUVBLFlBQVlBLEVBQUVBLEtBQUtBLEVBQUVBLFFBQVFBLEVBQUVBLFdBQVdBLEVBQUVBLFVBQVVBO1FBRXJJQSxNQUFNQSxDQUFDQSxLQUFLQSxHQUFHQSxVQUFVQSxDQUFDQTtRQUUxQkEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDL0VBLE1BQU1BLENBQUNBLEVBQUVBLEdBQUdBLFlBQVlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1FBQy9CQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxZQUFZQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUVuQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsWUFBWUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0E7UUFDbERBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLFlBQVlBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO1FBQ3ZDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUNyQkEsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDL0NBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1lBQ2xDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNwREEsQ0FBQ0E7UUFHREEsZUFBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsWUFBWUEsQ0FBQ0EsQ0FBQ0E7UUFDM0NBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLEVBQUVBLEtBQUtBLGFBQWFBLENBQUNBLENBQUNBLENBQUNBO1lBQ2hDQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLEdBQUdBLFNBQVNBLENBQUNBLGdDQUFnQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDdkZBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFNBQVNBLENBQUNBLCtCQUErQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDcEZBLENBQUNBO1FBQ0RBLG1DQUE2QkEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFFakRBLE1BQU1BLENBQUNBLGFBQWFBLEdBQUdBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBO1FBQzNDQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUV2QkEsQ0FBQ0E7UUFDREEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0Esa0JBQVlBLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLEVBQUVBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1FBQzFFQSxNQUFNQSxDQUFDQSxhQUFhQSxHQUFHQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxZQUFZQSxFQUFFQSxjQUFjQSxDQUFDQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQTtRQUVySEEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsRUFDZkEsQ0FBQ0E7UUFDRkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFFbkNBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLDJCQUFxQkEsQ0FBQ0EsVUFBVUEsRUFBRUEsTUFBTUEsQ0FBQ0EsWUFBWUEsRUFBRUEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7UUFDbEZBLFlBQVlBLEVBQUVBLENBQUNBO1FBRWZBLFNBQVNBLGNBQWNBO1lBQ3JCd0IsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esc0NBQXNDQSxDQUFDQSxDQUFDQTtZQUNwREEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsRUFDZkEsQ0FBQ0E7WUFDRkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDbkNBLE1BQU1BLENBQUNBLGtCQUFrQkEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDL0JBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBO1lBQ3JCQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUNwQkEsVUFBVUEsRUFBRUEsQ0FBQ0E7UUFDZkEsQ0FBQ0E7UUFFRHhCLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLHFCQUFxQkEsRUFBRUEsY0FBY0EsQ0FBQ0EsQ0FBQ0E7UUFFbERBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBO1lBRWZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBO1lBQ3ZCQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUN4QkEsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsS0FBS0EsQ0FBQ0E7WUFDdkJBLE1BQU1BLENBQUNBLGVBQWVBLEdBQUdBLElBQUlBLENBQUNBO1lBQzlCQSxJQUFJQSxTQUFTQSxHQUFHQSxNQUFNQSxDQUFDQSxFQUFFQSxDQUFDQTtZQUMxQkEsSUFBSUEsWUFBWUEsR0FBR0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0E7WUFDdkNBLElBQUlBLEdBQUdBLEdBQUdBLDBCQUFvQkEsQ0FBQ0EsV0FBV0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDdkRBLElBQUlBLE9BQU9BLEdBQUdBO2dCQUNaQSxTQUFTQSxFQUFFQSxNQUFNQSxDQUFDQSxTQUFTQTtnQkFDM0JBLFdBQVdBLEVBQUVBLE1BQU1BLENBQUNBLFNBQVNBO2dCQUM3QkEsUUFBUUEsRUFBRUEsWUFBWUE7Z0JBQ3RCQSxTQUFTQSxFQUFFQSxNQUFNQSxDQUFDQSxTQUFTQTthQUM1QkEsQ0FBQ0E7WUFDRkEsR0FBR0EsR0FBR0EsbUJBQWFBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQ3pCQSxTQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxtQkFBbUJBLEdBQUdBLEdBQUdBLEdBQUdBLFlBQVlBLEdBQUdBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO1lBQzdFQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxFQUFFQSxPQUFPQSxFQUFFQSxzQkFBZ0JBLEVBQUVBLENBQUNBLENBQzFDQSxPQUFPQSxDQUFDQSxVQUFVQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxNQUFNQTtnQkFDN0MsTUFBTSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7Z0JBQ3pCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO2dCQUN2QixNQUFNLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztnQkFDOUIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDVCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQztvQkFDM0MsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztvQkFDdkMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQzt3QkFDbEIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLFVBQUMsVUFBVTs0QkFDeEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0NBQ3pDLElBQUksUUFBUSxHQUFHLFVBQVUsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDO2dDQUN6QyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztvQ0FDcEIsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO29DQUMxQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3dDQUNaLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO3dDQUN0QixNQUFNLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7d0NBQzdDLE1BQU0sQ0FBQyxlQUFlLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztvQ0FDN0MsQ0FBQztnQ0FDSCxDQUFDOzRCQUNILENBQUM7d0JBQ0gsQ0FBQyxDQUFDLENBQUM7d0JBQ0gsSUFBSSxVQUFVLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQzt3QkFDMUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzs0QkFDZixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDOzRCQUNoQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dDQUNYLE1BQU0sQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO2dDQUNuQixZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7Z0NBRXJCLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFLFVBQUMsUUFBUSxFQUFFLElBQUk7b0NBQ25ELElBQUksS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7b0NBQzNCLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7d0NBQ1YsU0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDO3dDQUNsRCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztvQ0FDOUIsQ0FBQztnQ0FDSCxDQUFDLENBQUMsQ0FBQztnQ0FDSCxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7Z0NBRXJDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7b0NBRTNCLElBQUksR0FBRyxJQUFJLENBQUM7Z0NBQ2QsQ0FBQztnQ0FBQyxJQUFJLENBQUMsQ0FBQztvQ0FFTixNQUFNLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztnQ0FDaEMsQ0FBQzs0QkFDSCxDQUFDO3dCQUNILENBQUM7b0JBQ0gsQ0FBQztnQkFDSCxDQUFDO2dCQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ3BCLE1BQU0sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO29CQUN2QixJQUFJLFdBQVcsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQztvQkFDL0IsSUFBSSxNQUFNLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNqRSxNQUFNLENBQUMsYUFBYSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUVqRCxJQUFJLGdCQUFnQixHQUFHLENBQUMsV0FBVyxDQUFDLGdCQUFnQixJQUFJLEVBQUUsQ0FBQyxDQUFDO29CQUM1RCxJQUFJLFNBQVMsR0FBRyxXQUFXLENBQUMsV0FBVyxJQUFJLGdCQUFnQixDQUFDLFFBQVEsQ0FBQztvQkFDckUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxTQUFTLElBQUksTUFBTSxDQUFDLEVBQUUsS0FBSyxhQUFhLENBQUMsQ0FBQyxDQUFDO3dCQUNoRSxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzt3QkFFdkIsSUFBSSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxFQUFFLDRCQUE0QixDQUFDLENBQUM7d0JBQy9GLFNBQUcsQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEdBQUcsUUFBUSxDQUFDLENBQUM7d0JBQ3hELFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQzNCLENBQUM7Z0JBQ0gsQ0FBQztnQkFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RCLENBQUMsQ0FBQ0EsQ0FDRkEsS0FBS0EsQ0FBQ0EsVUFBVUEsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUE7Z0JBQzNDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO2dCQUN6QixTQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQztZQUNoRSxDQUFDLENBQUNBLENBQUNBO1FBQ1BBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLGdCQUFnQkEsQ0FBQ0EsUUFBUUEsRUFBRUE7WUFDaENBLFFBQVFBLEVBQUVBLENBQUNBO1FBQ2JBLENBQUNBLENBQUNBLENBQUNBO1FBRUhBLFNBQVNBLFlBQVlBLENBQUNBLE1BQU1BO1lBQzFCeUIsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBR1hBLElBQUlBLG1CQUFtQkEsR0FBR0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQy9DQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxtQkFBbUJBLENBQUNBLFVBQVVBLEVBQUVBLFVBQUNBLFFBQVFBO29CQUN2REEsT0FBT0EsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3pCQSxPQUFPQSxRQUFRQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtnQkFDN0JBLENBQUNBLENBQUNBLENBQUNBO2dCQUNIQSxJQUFJQSxJQUFJQSxHQUFHQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBO2dCQUMvQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDdkNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGtCQUFrQkEsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3ZDQSxNQUFNQSxDQUFDQSxrQkFBa0JBLEdBQUdBLElBQUlBLENBQUNBO29CQUNqQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7b0JBRXZCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxFQUFFQSxLQUFLQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDaENBLElBQUlBLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO3dCQUUzQkEsSUFBSUEsVUFBVUEsR0FBR0EsTUFBTUEsQ0FBQ0EsVUFBVUEsSUFBSUEsRUFBRUEsQ0FBQ0E7d0JBQ3pDQSxJQUFJQSxTQUFTQSxHQUFHQSxVQUFVQSxDQUFDQSxTQUFTQSxDQUFDQTt3QkFDckNBLElBQUlBLE9BQU9BLEdBQUdBLFVBQVVBLENBQUNBLE9BQU9BLENBQUNBO3dCQUNqQ0EsSUFBSUEsY0FBY0EsR0FBR0EsVUFBVUEsQ0FBQ0EsY0FBY0EsQ0FBQ0E7d0JBQy9DQSxFQUFFQSxDQUFDQSxDQUFDQSxjQUFjQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDbkJBLGNBQWNBLENBQUNBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBOzRCQUM3QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ2RBLFNBQVNBLENBQUNBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBOzRCQUMxQkEsQ0FBQ0E7NEJBQ0RBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLHdCQUF3QkEsQ0FBQ0EsQ0FBQ0E7NEJBR3RDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDakJBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLHdCQUF3QkEsQ0FBQ0E7NEJBQ3pDQSxDQUFDQTt3QkFDSEEsQ0FBQ0E7d0JBQ0RBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBOzRCQUNaQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDcEJBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBLFNBQVNBLENBQUNBOzRCQUM3QkEsQ0FBQ0E7d0JBQ0hBLENBQUNBO29CQUNIQSxDQUFDQTtnQkFDSEEsQ0FBQ0E7WUFDSEEsQ0FBQ0E7UUFDSEEsQ0FBQ0E7UUFFRHpCLFNBQVNBLFFBQVFBO1lBQ2YwQixFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxJQUFJQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDMUNBLE1BQU1BLENBQUNBO1lBQ1RBLENBQUNBO1lBQ0RBLElBQUlBLE9BQU9BLEdBQUdBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQzVDQSxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxLQUFLQSxNQUFNQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBLENBQUNBO2dCQUMzQ0EsTUFBTUEsQ0FBQ0E7WUFDVEEsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLE1BQU1BLENBQUNBLG1CQUFtQkEsR0FBR0EsT0FBT0EsQ0FBQ0E7WUFDdkNBLENBQUNBO1lBQ0RBLElBQUlBLFNBQVNBLEdBQUdBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBO1lBQzFCQSxJQUFJQSxZQUFZQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQTtZQUN2Q0EsSUFBSUEsR0FBR0EsR0FBR0EsMkJBQXFCQSxDQUFDQSxXQUFXQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUV4REEsSUFBSUEsU0FBU0EsR0FBR0EsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDNUNBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO1lBQ2hEQSxJQUFJQSxPQUFPQSxHQUFHQTtnQkFDWkEsU0FBU0EsRUFBRUEsTUFBTUEsQ0FBQ0EsU0FBU0E7Z0JBQzNCQSxXQUFXQSxFQUFFQSxNQUFNQSxDQUFDQSxTQUFTQTtnQkFDN0JBLFFBQVFBLEVBQUVBLFlBQVlBO2dCQUN0QkEsU0FBU0EsRUFBRUEsTUFBTUEsQ0FBQ0EsU0FBU0E7YUFDNUJBLENBQUNBO1lBQ0ZBLEdBQUdBLEdBQUdBLG1CQUFhQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUV6QkEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDekJBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLEVBQUVBLE9BQU9BLEVBQUVBLHNCQUFnQkEsRUFBRUEsQ0FBQ0EsQ0FDMUNBLE9BQU9BLENBQUNBLFVBQVVBLElBQUlBLEVBQUVBLE1BQU1BLEVBQUVBLE9BQU9BLEVBQUVBLE1BQU1BO2dCQUM3QyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztnQkFFdkIsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztnQkFDdkMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztvQkFDbEIsSUFBSSxVQUFVLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQztvQkFDMUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzt3QkFDZixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUNoQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3ZCLENBQUM7Z0JBQ0gsQ0FBQztnQkFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQU1wQixRQUFRLENBQUM7b0JBQ1AsTUFBTSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7b0JBQzFCLFFBQVEsRUFBRSxDQUFDO2dCQUNiLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNWLENBQUMsQ0FBQ0EsQ0FDRkEsS0FBS0EsQ0FBQ0EsVUFBVUEsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUE7Z0JBQzNDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO2dCQUN6QixTQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQztZQUNoRSxDQUFDLENBQUNBLENBQUNBO1FBQ1BBLENBQUNBO1FBRUQxQixVQUFVQSxFQUFFQSxDQUFDQTtRQUViQSxTQUFTQSxpQkFBaUJBLENBQUNBLE1BQU1BO1lBQy9CMkIsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1pBLE1BQU1BLEdBQUdBLEVBQUVBLENBQUNBO1lBQ2RBLENBQUNBO1lBQ0RBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUM3QkEsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0E7WUFDdEJBLENBQUNBO1lBQ0RBLE1BQU1BLENBQUNBLFlBQVlBLENBQUFBO1FBQ3JCQSxDQUFDQTtRQUVEM0IsU0FBU0EsVUFBVUE7WUFDakI0QixNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNuQkEsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7WUFDMUJBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO2dCQUNkQSxJQUFJQSxZQUFZQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQTtnQkFDdkNBLElBQUlBLEdBQUdBLEdBQUdBLHdCQUFrQkEsQ0FBQ0EsV0FBV0EsRUFBRUEsU0FBU0EsRUFBRUEsTUFBTUEsQ0FBQ0EsU0FBU0EsRUFBRUEsTUFBTUEsQ0FBQ0EsU0FBU0EsRUFBRUEsWUFBWUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3ZHQSxHQUFHQSxHQUFHQSxtQkFBYUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3pCQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxFQUFFQSxzQkFBZ0JBLEVBQUVBLENBQUNBLENBQ2hDQSxPQUFPQSxDQUFDQSxVQUFVQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxNQUFNQTtvQkFDN0MsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzt3QkFDVCxNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQzt3QkFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO3dCQUN4QyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ25CLDJCQUFxQixDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO3dCQUNqRixZQUFZLEVBQUUsQ0FBQztvQkFDakIsQ0FBQztvQkFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN0QixDQUFDLENBQUNBLENBQ0ZBLEtBQUtBLENBQUNBLFVBQVVBLElBQUlBLEVBQUVBLE1BQU1BLEVBQUVBLE9BQU9BLEVBQUVBLE1BQU1BO29CQUMzQyxTQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQztnQkFDaEUsQ0FBQyxDQUFDQSxDQUFDQTtZQUNQQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDTkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDdEJBLENBQUNBO1FBQ0hBLENBQUNBO1FBRUQ1QixTQUFTQSxZQUFZQTtZQUVuQjZCLElBQUlBLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO1lBQzNCQSxNQUFNQSxDQUFDQSxPQUFPQSxHQUFHQSxNQUFNQSxDQUFDQTtZQUN4QkEsSUFBSUEsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7WUFDM0JBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dCQUNYQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxFQUFFQSxVQUFDQSxRQUFRQSxFQUFFQSxHQUFHQTtvQkFDL0NBLElBQUlBLEtBQUtBLEdBQUdBLFFBQVFBLENBQUNBLEtBQUtBLENBQUNBO29CQUMzQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQzFCQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxLQUFLQSxDQUFDQTtvQkFDdEJBLENBQUNBO2dCQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNMQSxDQUFDQTtRQUNIQSxDQUFDQTtJQUNIN0IsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDVkEsQ0FBQ0EsRUE1U00sS0FBSyxLQUFMLEtBQUssUUE0U1g7O0FDN1NELElBQU8sS0FBSyxDQTJLWDtBQTNLRCxXQUFPLEtBQUssRUFBQyxDQUFDO0lBRURBLHdCQUFrQkEsR0FBR0EsZ0JBQVVBLENBQUNBLG9CQUFvQkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsU0FBU0EsRUFBRUEsU0FBU0EsRUFBRUEsZ0JBQWdCQSxFQUFFQSxjQUFjQSxFQUFFQSxXQUFXQSxFQUFFQSxjQUFjQSxFQUFFQSxPQUFPQSxFQUFFQSxVQUFVQSxFQUFFQSxhQUFhQSxFQUFFQSxZQUFZQSxFQUMvTUEsVUFBQ0EsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsT0FBT0EsRUFBRUEsY0FBY0EsRUFBRUEsWUFBWUEsRUFBRUEsU0FBNkJBLEVBQUVBLFlBQVlBLEVBQUVBLEtBQUtBLEVBQUVBLFFBQVFBLEVBQUVBLFdBQVdBLEVBQUVBLFVBQVVBO1FBRTVJQSxNQUFNQSxDQUFDQSxLQUFLQSxHQUFHQSxVQUFVQSxDQUFDQTtRQUMxQkEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDL0VBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLEVBQUVBLENBQUNBO1FBQ3JCQSxNQUFNQSxDQUFDQSxrQkFBa0JBLEdBQUdBLE1BQU1BLENBQUNBLFlBQVlBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3REQSxJQUFJQSxTQUFTQSxHQUFHQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQ3JEQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxJQUFJQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNsQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsU0FBU0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDcERBLENBQUNBO1FBQ0RBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN2RkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxHQUFHQSxHQUFHQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBO1FBQzlEQSxDQUFDQTtRQUVEQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxZQUFZQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQTtRQUNsREEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsWUFBWUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7UUFFdkNBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLHNCQUFnQkEsQ0FBQ0EsVUFBVUEsRUFBRUEsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7UUFDcEVBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLEtBQUtBLENBQUNBLENBQUNBO1FBRTlDQSxlQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQTtRQUMzQ0EsbUNBQTZCQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUdqREEsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0E7WUFDbkJBLElBQUlBLEVBQUVBLFVBQVVBO1lBQ2hCQSxxQkFBcUJBLEVBQUVBLElBQUlBO1lBQzNCQSx1QkFBdUJBLEVBQUVBLEtBQUtBO1lBQzlCQSxXQUFXQSxFQUFFQSxJQUFJQTtZQUNqQkEsYUFBYUEsRUFBRUEsRUFBRUE7WUFDakJBLGFBQWFBLEVBQUVBO2dCQUNiQSxVQUFVQSxFQUFFQSxTQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxFQUFFQTthQUMxQ0E7WUFDREEsVUFBVUEsRUFBRUE7Z0JBQ1ZBO29CQUNFQSxLQUFLQSxFQUFFQSxNQUFNQTtvQkFDYkEsV0FBV0EsRUFBRUEsTUFBTUE7b0JBQ25CQSxZQUFZQSxFQUFFQSxjQUFjQSxDQUFDQSxHQUFHQSxDQUFDQSxpQkFBaUJBLENBQUNBO2lCQUNwREE7Z0JBQ0RBO29CQUNFQSxLQUFLQSxFQUFFQSxhQUFhQTtvQkFDcEJBLFdBQVdBLEVBQUVBLGFBQWFBO2lCQUMzQkE7Z0JBQ0RBO29CQUNFQSxLQUFLQSxFQUFFQSxVQUFVQTtvQkFDakJBLFdBQVdBLEVBQUVBLFVBQVVBO2lCQUN4QkE7YUFDRkE7U0FDRkEsQ0FBQ0E7UUFFRkEsU0FBU0EsY0FBY0EsQ0FBQ0EsT0FBT0E7WUFDN0I4QixJQUFJQSxVQUFVQSxHQUFHQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxhQUFhQSxDQUFDQSxVQUFVQSxDQUFDQTtZQUM3REEsTUFBTUEsQ0FBQ0Esd0JBQWtCQSxDQUFDQSxPQUFPQSxFQUFFQSxVQUFVQSxDQUFDQSxDQUFDQTtRQUNqREEsQ0FBQ0E7UUFFRDlCLE1BQU1BLENBQUNBLGVBQWVBLEdBQUdBO1lBQ3ZCQSxVQUFVQSxFQUFFQSxFQUFFQTtZQUNkQSxPQUFPQSxFQUFFQSxFQUFFQTtZQUNYQSxnQkFBZ0JBLEVBQUVBLEVBQUVBO1lBQ3BCQSxlQUFlQSxFQUFFQSxFQUFFQTtZQUVuQkEsTUFBTUEsRUFBRUEsVUFBQ0EsTUFBTUE7Z0JBQ2JBLElBQUlBLFVBQVVBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLGFBQWFBLENBQUNBLFVBQVVBLENBQUNBO2dCQUM3REEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsVUFBVUEsS0FBS0EsRUFBRUEsSUFBSUEsTUFBTUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzNFQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQTtnQkFDbEJBLENBQUNBO2dCQUNEQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQTtZQUNsQkEsQ0FBQ0E7WUFFREEsYUFBYUEsRUFBRUE7Z0JBQ2JBLE1BQU1BLENBQUNBLGVBQWVBLENBQUNBLGVBQWVBLEdBQUdBLEVBQUVBLENBQUNBO2dCQUM1Q0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDdEJBLENBQUNBO1lBRURBLGNBQWNBLEVBQUVBO2dCQUVkQSxJQUFJQSxnQkFBZ0JBLEdBQUdBLEVBQUVBLENBQUNBO2dCQUMxQkEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsVUFBVUEsRUFBRUEsVUFBQ0EsTUFBTUE7b0JBQzlDQSxJQUFJQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxHQUFHQSxJQUFLQSxPQUFBQSxHQUFHQSxDQUFDQSxRQUFRQSxFQUFaQSxDQUFZQSxDQUFDQSxDQUFDQTtvQkFDckRBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO3dCQUNUQSxnQkFBZ0JBLEdBQUdBLGdCQUFnQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ25EQSxDQUFDQTtnQkFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLE1BQU1BLENBQUNBLGVBQWVBLENBQUNBLGdCQUFnQkEsR0FBR0EsZ0JBQWdCQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUM1RUEsQ0FBQ0E7WUFFREEsTUFBTUEsRUFBRUEsVUFBQ0EsT0FBT0EsRUFBRUEsSUFBSUE7Z0JBQ3BCQSxJQUFJQSxFQUFFQSxHQUFHQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFJdEJBLE1BQU1BLENBQUNBLGVBQWVBLENBQUNBLGNBQWNBLEVBQUVBLENBQUNBO1lBQzFDQSxDQUFDQTtZQUVEQSxnQkFBZ0JBLEVBQUVBLFVBQUNBLEdBQUdBO2dCQUNwQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2pCQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQTtnQkFDcEJBLENBQUNBO2dCQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDakJBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBO2dCQUNwQkEsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBO1lBQ1pBLENBQUNBO1lBRURBLFdBQVdBLEVBQUVBLFVBQUNBLE9BQU9BO2dCQUNuQkEsTUFBTUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7WUFDakNBLENBQUNBO1lBRURBLFVBQVVBLEVBQUVBLFVBQUNBLE1BQU1BO2dCQUNqQkEsSUFBSUEsVUFBVUEsR0FBR0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsVUFBVUEsQ0FBQ0E7Z0JBQzdEQSxNQUFNQSxDQUFDQSxDQUFDQSxVQUFVQSxJQUFJQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFDQSxHQUFHQSxJQUFLQSxPQUFBQSxjQUFjQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFuQkEsQ0FBbUJBLENBQUNBLENBQUNBO1lBQzNFQSxDQUFDQTtTQUNGQSxDQUFDQTtRQUdGQSxJQUFJQSxHQUFHQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxFQUFFQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxTQUFTQSxFQUFFQSxNQUFNQSxDQUFDQSxTQUFTQSxFQUFFQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtRQUM1R0EsR0FBR0EsR0FBR0EsbUJBQWFBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQ3pCQSxTQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSwwQkFBMEJBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBO1FBQzNDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxFQUFFQSxzQkFBZ0JBLEVBQUVBLENBQUNBLENBQ2hDQSxPQUFPQSxDQUFDQSxVQUFVQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxNQUFNQTtZQUM3QyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUM1QyxJQUFJLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDO2dCQUN2QyxJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7Z0JBQ25CLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDakIsTUFBTSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDekMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQUMsT0FBTztvQkFDdkMsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUUsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNwQyxPQUFPLENBQUMsS0FBSyxHQUFHLGlCQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7b0JBRWhFLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDdEMsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztvQkFDbEMsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDO29CQUNyQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDL0IsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3RDLFVBQVUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3RCLFNBQVMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQzlCLENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsVUFBVSxLQUFLLGVBQWUsQ0FBQyxDQUFDLENBQUM7d0JBQ25DLFVBQVUsR0FBRyxTQUFTLENBQUM7b0JBQ3pCLENBQUM7b0JBQ0QsT0FBTyxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7b0JBQy9CLE9BQU8sQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDO29CQUNqQyxJQUFJLE1BQU0sR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ25DLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDWixNQUFNLEdBQUc7NEJBQ1AsSUFBSSxFQUFFLFVBQVU7NEJBQ2hCLFFBQVEsRUFBRSxFQUFFO3lCQUNiLENBQUM7d0JBQ0YsU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLE1BQU0sQ0FBQzt3QkFDL0IsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDdkIsQ0FBQztvQkFDRCxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDaEMsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsT0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxVQUFDLE1BQU07b0JBQzlCLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUM1RCxDQUFDLENBQUMsQ0FBQztnQkFDSCxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7Z0JBRXpDLHNCQUFnQixDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3JFLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ3hCLENBQUM7UUFDSCxDQUFDLENBQUNBLENBQ0ZBLEtBQUtBLENBQUNBLFVBQVVBLElBQUlBLEVBQUVBLE1BQU1BLEVBQUVBLE9BQU9BLEVBQUVBLE1BQU1BO1lBQzNDLFNBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxHQUFHLFlBQVksR0FBRyxNQUFNLEdBQUcsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQy9FLENBQUMsQ0FBQ0EsQ0FBQ0E7SUFFUEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDUkEsQ0FBQ0EsRUEzS00sS0FBSyxLQUFMLEtBQUssUUEyS1g7O0FDMUtELElBQU8sS0FBSyxDQXNDWDtBQXRDRCxXQUFPLEtBQUssRUFBQyxDQUFDO0lBRURBLG9CQUFjQSxHQUFHQSxnQkFBVUEsQ0FBQ0EsZ0JBQWdCQSxFQUNyREEsQ0FBQ0EsUUFBUUEsRUFBRUEsZ0JBQWdCQSxFQUFFQSxXQUFXQSxFQUFFQSxjQUFjQSxFQUFFQSxPQUFPQSxFQUFFQSxVQUFVQSxFQUFFQSxhQUFhQSxFQUMxRkEsVUFBQ0EsTUFBTUEsRUFBRUEsY0FBdUNBLEVBQUVBLFNBQTZCQSxFQUFFQSxZQUFZQSxFQUFFQSxLQUFLQSxFQUFFQSxRQUFRQSxFQUFFQSxXQUFXQTtRQUV6SEEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFFbkNBLGVBQVNBLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLFlBQVlBLENBQUNBLENBQUNBO1FBQzNDQSxtQ0FBNkJBLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1FBRWpEQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxjQUFjQSxFQUFFQSxVQUFDQSxNQUFNQTtZQUNoQ0EsVUFBVUEsRUFBRUEsQ0FBQ0E7UUFDZkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFFSEEsVUFBVUEsRUFBRUEsQ0FBQ0E7UUFFYkEsU0FBU0EsVUFBVUE7WUFDakI0QixFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDaEJBLElBQUlBLEdBQUdBLEdBQUdBLGdCQUFVQSxDQUFDQSxXQUFXQSxFQUFFQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDL0NBLEdBQUdBLEdBQUdBLG1CQUFhQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDekJBLElBQUlBLE1BQU1BLEdBQUdBLHNCQUFnQkEsRUFBRUEsQ0FBQ0E7Z0JBQ2hDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUNwQkEsT0FBT0EsQ0FBQ0EsVUFBVUEsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUE7b0JBQzdDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ1QsZ0JBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDbkIsQ0FBQztvQkFDRCxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztvQkFDckIsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7Z0JBQ3hCLENBQUMsQ0FBQ0EsQ0FDRkEsS0FBS0EsQ0FBQ0EsVUFBVUEsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUE7b0JBQzNDLFNBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxHQUFHLFlBQVksR0FBRyxNQUFNLEdBQUcsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDO2dCQUMvRSxDQUFDLENBQUNBLENBQUNBO1lBQ1BBLENBQUNBO1lBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUNOQSxNQUFNQSxDQUFDQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUN4QkEsQ0FBQ0E7UUFDSEEsQ0FBQ0E7SUFDSDVCLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBQ1ZBLENBQUNBLEVBdENNLEtBQUssS0FBTCxLQUFLLFFBc0NYOztBQ3RDRCxJQUFPLEtBQUssQ0FvTlg7QUFwTkQsV0FBTyxLQUFLLEVBQUMsQ0FBQztJQUVEQSxxQkFBZUEsR0FBR0EsZ0JBQVVBLENBQUNBLGlCQUFpQkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsU0FBU0EsRUFBRUEsU0FBU0EsRUFBRUEsZ0JBQWdCQSxFQUFFQSxjQUFjQSxFQUFFQSxXQUFXQSxFQUFFQSxjQUFjQSxFQUFFQSxPQUFPQSxFQUFFQSxVQUFVQSxFQUFFQSxhQUFhQSxFQUFFQSxpQkFBaUJBLEVBQUVBLGlCQUFpQkEsRUFDak9BLFVBQUNBLE1BQU1BLEVBQUVBLE9BQU9BLEVBQUVBLE9BQU9BLEVBQUVBLGNBQWNBLEVBQUVBLFlBQVlBLEVBQUVBLFNBQTZCQSxFQUFFQSxZQUFZQSxFQUFFQSxLQUFLQSxFQUFFQSxRQUFRQSxFQUFFQSxXQUFXQSxFQUFFQSxlQUFrREEsRUFBRUEsZUFBZUE7UUFFck1BLE1BQU1BLENBQUNBLEtBQUtBLEdBQUdBLGVBQWVBLENBQUNBO1FBQy9CQSxNQUFNQSxDQUFDQSxZQUFZQSxHQUFHQSxZQUFZQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUMzQ0EsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsVUFBQ0EsSUFBSUEsSUFBS0EsT0FBQUEsa0JBQVlBLENBQUNBLElBQUlBLEVBQUVBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLEVBQXBDQSxDQUFvQ0EsQ0FBQ0E7UUFFckVBLGVBQVNBLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLFlBQVlBLENBQUNBLENBQUNBO1FBRTNDQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSx3QkFBd0JBLEVBQUVBO1lBQ25DLFdBQVcsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QixDQUFDLENBQUNBLENBQUNBO1FBRUhBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBO1lBQ25CQSxJQUFJQSxFQUFFQSxVQUFVQTtZQUNoQkEscUJBQXFCQSxFQUFFQSxJQUFJQTtZQUMzQkEsdUJBQXVCQSxFQUFFQSxLQUFLQTtZQUM5QkEsV0FBV0EsRUFBRUEsSUFBSUE7WUFDakJBLGFBQWFBLEVBQUVBLEVBQUVBO1lBQ2pCQSxhQUFhQSxFQUFFQTtnQkFDYkEsVUFBVUEsRUFBRUEsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsRUFBRUE7YUFDMUNBO1lBQ0RBLFVBQVVBLEVBQUVBO2dCQUNWQTtvQkFDRUEsS0FBS0EsRUFBRUEsTUFBTUE7b0JBQ2JBLFdBQVdBLEVBQUVBLGlCQUFpQkE7b0JBQzlCQSxZQUFZQSxFQUFFQSxjQUFjQSxDQUFDQSxHQUFHQSxDQUFDQSxtQkFBbUJBLENBQUNBO2lCQUN0REE7Z0JBQ0RBO29CQUNFQSxLQUFLQSxFQUFFQSxTQUFTQTtvQkFDaEJBLFdBQVdBLEVBQUVBLFNBQVNBO29CQUN0QkEsWUFBWUEsRUFBRUEsY0FBY0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsMEJBQTBCQSxDQUFDQTtpQkFDN0RBO2FBQ0ZBO1NBQ0ZBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLEtBQUtBLEdBQUdBO1lBQ2JBLFVBQVVBLEVBQUVBLFlBQVlBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsSUFBSUEsRUFBRUE7WUFDbkRBLE9BQU9BLEVBQUVBLEtBQUtBO1lBQ2RBLFVBQVVBLEVBQUVBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLElBQUlBLEVBQUVBO1lBQy9DQSxJQUFJQSxFQUFFQSxZQUFZQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxFQUFFQTtZQUNwQ0EsUUFBUUEsRUFBRUEsRUFBRUE7WUFDWkEsS0FBS0EsRUFBRUEsWUFBWUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsRUFBRUE7U0FDdkNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBO1lBQ2ZBLElBQUlBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO1lBQ3pCQSxJQUFJQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUN0QkEsSUFBSUEsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0EsUUFBUUEsQ0FBQ0E7WUFDOUJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLElBQUlBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUNyQkEsSUFBSUEsT0FBT0EsR0FBR0EsSUFBSUEsR0FBR0EsR0FBR0EsR0FBR0EsUUFBUUEsQ0FBQ0E7Z0JBQ3BDQSxLQUFLQSxDQUFDQSxVQUFVQSxHQUFHQSxRQUFRQSxHQUFHQSxDQUFDQSxPQUFPQSxDQUFDQSxZQUFZQSxFQUFFQSxDQUFDQSxDQUFDQTtnQkFDdkRBLFVBQVVBLEVBQUVBLENBQUNBO1lBQ2ZBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBO1lBQ2RBLE9BQU9BLFlBQVlBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0E7WUFDekNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBO1lBQy9CQSxNQUFNQSxDQUFDQSxL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QTtZQUNqQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2JBLElBQUlBLENBQUNBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBO1lBQzNCQSxDQUFDQTtZQUVEQSxJQUFJQSxHQUFHQSxHQUFHQSxRQUFRQSxDQUFDQSxRQUFRQSxDQUFDQTtZQUM1QkEsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsR0FBR0EsSUFBSUEsRUFBRUEsQ0FBQ0E7WUFDakNBLElBQUlBLENBQUNBLEdBQUdBLEdBQUdBLFNBQVNBLEdBQUdBLFNBQVNBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBO1lBQ25EQSxJQUFJQSxJQUFJQSxHQUFHQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUN6QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1RBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQzdCQSxDQUFDQTtZQUdEQSxJQUFJQSxPQUFPQSxHQUFHQSxRQUFRQSxDQUFDQSxTQUFTQSxDQUFDQSxJQUFJQSxRQUFRQSxDQUFDQSxhQUFhQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtZQUNuRUEsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsT0FBT0EsQ0FBQ0E7WUFDdkJBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUN2QkEsSUFBSUEsQ0FBQ0EsUUFBUUEsR0FBR0E7b0JBQVFBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO2dCQUFDQSxDQUFDQSxDQUFDQTtZQUN6Q0EsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFFM0JBLElBQUlBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLFFBQVFBLENBQUNB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R0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBRUE7UUFDekJBLElBQUlBLFNBQVNBLEdBQUdBLEdBQUdBLENBQUNBLFNBQVNBLENBQUNBO1FBQzlCQSxJQUFJQSxhQUFhQSxHQUFHQSxHQUFHQSxDQUFDQSxjQUFjQSxJQUFJQSxHQUFHQSxDQUFDQSxhQUFhQSxDQUFDQTtRQUM1REEsSUFBSUEsT0FBT0EsR0FBR0EsR0FBR0EsQ0FBQ0EsT0FBT0EsQ0FBQ0E7UUFDMUJBLElBQUlBLE1BQU1BLEdBQUdBLEdBQUdBLENBQUNBLE1BQU1BLENBQUNBO1FBQ3hCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNYQSxJQUFJQSxHQUFHQSxJQUFJQSxJQUFJQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUMzQkEsSUFBSUEsR0FBR0EsSUFBSUEsSUFBSUEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7WUFDM0JBLE1BQU1BLEdBQUdBLE1BQU1BLElBQUlBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO1lBQ2pDQSxTQUFTQSxHQUFHQSxTQUFTQSxJQUFJQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQTtZQUMxQ0EsYUFBYUEsR0FBR0EsYUFBYUEsSUFBSUEsTUFBTUEsQ0FBQ0EsY0FBY0EsSUFBSUEsTUFBTUEsQ0FBQ0EsYUFBYUEsQ0FBQ0E7WUFDL0VBLE9BQU9BLEdBQUdBLE9BQU9BLElBQUlBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBO1FBQ3RDQSxDQUFDQTtRQUNEQSxNQUFNQSxHQUFHQSxNQUFNQSxJQUFJQSxRQUFRQSxDQUFDQTtRQUM1QkEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDZkEsSUFBSUEsSUFBSUEsR0FBVUEsSUFBSUEsQ0FBQ0E7UUFDdkJBLElBQUlBLFNBQVNBLEdBQUdBLGFBQWFBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1FBRXBDQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxJQUFJQSxhQUFhQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFD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QUN2Q0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsWUFBWUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7UUFDdkVBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFlBQVlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO1FBQzVFQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUNyQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsUUFBUUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDOURBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLFdBQVdBLEdBQUdBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLElBQUlBLEVBQUVBLENBQUNBLENBQUNBO1FBQzdFQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxJQUFJQSxzQkFBaUJBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBRXREQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxTQUFTQSxDQUFDQSxhQUFhQSxFQUFFQSxDQUFDQTtRQUNsREEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsU0FBU0EsQ0FBQ0EsV0FBV0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDOURBLE1BQU1BLENBQUNBLGdCQUFnQkEsR0FBR0EsU0FBU0EsQ0FBQ0Esd0JBQXdCQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxFQUFFQSw0QkFBdUJBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1FBQ2hIQSxNQUFNQSxDQUFDQSxZQUFZQSxHQUFHQSxTQUFTQSxDQUFDQSx1QkFBdUJBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNB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QUNBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO1lBQ3RDQSxDQUFDQTtRQUNIQSxDQUFDQTtRQUdEQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzQkEsSUFBSUEsS0FBS0EsR0FBR0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDNUJBLElBQUlBLFNBQVNBLEdBQUdBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQ3RDQSxJQUFJQSxPQUFPQSxHQUFHQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxJQUFJQTtnQkFDOUJBLE1BQU1BLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBO1lBQ3ZCQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNIQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxNQUFNQSxHQUFHQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUNsREEsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsR0FBR0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFFL0RBLE1BQU1BLENBQUNBLEdBQUdBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQzFGQSxDQUFDQTtRQUdEQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsRUFB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TUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDdEJBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLGVBQWVBLEdBQUdBLFVBQUNBLElBQUlBLEVBQUVBLFVBQVVBO1lBQ3hDQSxJQUFJQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUMzQkEsSUFBSUEsWUFBWUEsR0FBR0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7WUFDbkNBLEVBQUVBLENBQUNBLENBQUNBLFVBQVVBLElBQUlBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBO2dCQUMvQkEsSUFBSUEsTUFBTUEsR0FBR0EsS0FBS0EsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtnQkFDcERBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3hEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxJQUFJQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFdkJBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLEtBQUtBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO3dCQUN6QkEsTUFBTUEsQ0FBQ0EsTUFBTUEsS0FBS0EsT0FBT0EsQ0FBQ0E7b0JBQzVCQSxDQUFDQTtvQkFDREEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7Z0JBQ2RBLENBQUNBO1lBQ0hBLENBQUNBO1lBQ0RBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO1FBQ2ZBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLFVBQUNBLElBQUlBLEVBQUVBLFVBQVVBLEVBQUVBLE9BQU9BLEVBQUVBLEVBQUVBLEVBQUVBLFNBQVNBO1lBQzNEQSxJQUFJQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUMzQkEsSUFBSUEsWUFBWUEsR0FBR0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7WUFDbkNBLEVBQUVBLENBQUNBLENBQUNB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UUEsR0FBR0EsSUFBSUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0E7d0JBQ2xDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDbENBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLGNBQWNBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBOzRCQUMxQ0EsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0E7d0JBQ2hDQSxDQUFDQTt3QkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsSUFBSUEsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ2hDQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDM0NBLENBQUNBO3dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTs0QkFDTkEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsOENBQThDQSxDQUFDQSxDQUFDQTs0QkFDNURBLE1BQU1BLENBQUNBO3dCQUNUQSxDQUFDQTtvQkFDSEEsQ0FBQ0E7b0JBS0RBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3pEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxZQUFZQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFFbENBLFVBQVVBLEdBQUdBLFFBQVFBLENBQUNBLGNBQWNBLEVBQUVBLENBQUNBO3dCQUN2Q0EsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsU0FBU0EsRUFBRUEsSUFBSUEsUUFBUUEsQ0FBQ0E7b0JBQzlDQSxDQUFDQTtnQkFDSEEsQ0FBQ0E7Z0JBQ0RBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO29CQUNi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QUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDN0JBLElBQUlBLE1BQU1BLEdBQUdBLGFBQWFBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQVE5QkEsSUFBSUEsYUFBYUEsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7Z0JBQ3BDQSxJQUFJQSxJQUFJQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxjQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxFQUFHQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxHQUFHQSxHQUFHQSxhQUFhQSxHQUFHQSxHQUFHQSxHQUFHQSxVQUFVQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDNUhBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO2dCQUN2Q0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDdkJBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBRUZBLFVBQVVBLEVBQUVBLENBQUNBO1FBRWJBLFNBQVNBLFVBQVVBO1lBQ2pCdUMsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7WUFFL0JBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLE9BQU9BLEVBQUVBLGNBQWNBLEVBQUVBLE1BQU1BLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBO1lBRTFEQSxjQUFjQSxDQUFDQSxVQUFVQSxDQUFDQSxRQUFRQSxFQUFFQSxVQUFDQSxVQUFVQTtnQkFDN0NBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLFVBQVVBLENBQUNBO2dCQUMvQkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDdEJBLENBQUNBLENBQUNBLENBQUNBO1lBRUhBLGNBQWNBLENBQUNBLFVBQVVBLENBQUNBLFFBQVFBLEVBQUVBLFVBQUNBLE9BQU9B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QSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDWkEsSUFBSUEsSUFBSUEsUUFBUUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2xDQSxDQUFDQTtZQUNIQSxDQUFDQTtZQUdEQSxJQUFJQSxNQUFNQSxHQUFVQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtZQUNsQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBRWxCQSxJQUFJQSxHQUFHQSxHQUFPQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDdENBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUNiQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQTtnQkFDZEEsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNOQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDcENBLENBQUNBO1lBQ0hBLENBQUNBO1lBQ0RBLElBQUlBLEdBQUdBLEdBQU9BLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQ3BDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWkEsTUFBTUEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3ZDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNqQ0EsQ0FBQ0E7WUFDREEsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsTUFBTUEsRUFBRUEsR0FB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QVFBLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLEVBQWhFQSxDQUFnRUEsQ0FBQ0E7UUFFekZBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBO1lBQ2RBLFFBQVFBLEVBQUVBLENBQUNBO1FBQ2JBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBO1lBQ1pBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLElBQUlBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUN2Q0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDM0JBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBO1lBRWRBLElBQUlBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLEdBQUdBLEdBQUdBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBO1lBQ2pEQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSx1QkFBdUJBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBO1lBQzVDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtRQUNmQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxVQUFDQSxJQUFJQSxFQUFFQSxJQUFJQTtZQUMzQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2ZBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO1lBQ2xCQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDTkEsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7WUFDaEJBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFVBQUNBLElBQUlB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QUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFFQSxnQkFBZ0JBLENBQUNBLENBQUNBO29CQUNsR0EsQ0FBQ0E7Z0JBQ0hBLENBQUNBO1lBQ0hBLENBQUNBO1lBZURBLElBQUlBLElBQUlBLEdBQVVBLElBQUlBLENBQUNBO1lBQ3ZCQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFVQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFFcENBLElBQUlBLEdBQUdBLENBQUNBLFlBQVlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLFNBQVNBLENBQUNBO2dCQUNyRUEsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsRUFBQ0EsSUFBSUEsRUFBRUEsR0FBR0EsR0FBR0EsR0FBR0EsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekRBLENBQUNBO1lBQ0RBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLFVBQVVBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUVqQ0EsSUFBSUEsRUFBRUEsR0FBR0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzFEQSxJQUFJQSxFQUFFQSxHQUFHQSxDQUFDQSxZQUFZQSxDQUFDQSxjQUFjQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDOURBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBO2dCQUNkQSxFQUFFQSxDQUFDQSxDQUFDQSxF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bkNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBO2dCQUNsQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLEdBQUdBO29CQUM3QkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7Z0JBQ2xCQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDSEEsS0FBS0EsR0FBR0EsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsSUFBSUE7b0JBQ3hCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDbkJBLENBQUNBLENBQUNBLENBQ0NBLE1BQU1BLENBQUNBLFVBQUNBLElBQUlBO29CQUNYQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtnQkFDckNBLENBQUNBLENBQUNBLENBQUNBO2dCQUVMQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFTQSxLQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxFQUFFQSxRQUFRQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFDQSxJQUFJQTtvQkFDM0VBLElBQUlBLENBQUNBLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO29CQUM1QkEsSUFBSUEsQ0FBQ0EsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7b0JBQzFCQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDbkJBLElBQUlBLENBQUNBLFFBQVFBLElBQUlBLE1BQU1BLENBQUNBO29CQUMxQkEsQ0FBQ0E7b0JBQ0RBLElBQUlBLENBQUNBLFdBQVdBLEdBQUdBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLENBQUNBLElBQUlBLENBQUNB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QUNBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO1FBQ25EQSxDQUFDQTtRQVlNbkIsc0NBQVVBLEdBQWpCQSxVQUFrQkEsUUFBZUEsRUFBRUEsUUFBZUEsRUFBRUEsRUFBRUE7UUFTdERvQixDQUFDQTtRQWNNcEIsNkNBQWlCQSxHQUF4QkEsVUFBeUJBLElBQVdBLEVBQUVBLFlBQW1CQSxFQUFFQSxNQUFhQSxFQUFFQSxFQUFFQTtRQVM1RXFCLENBQUNBO1FBR01yQiwrQkFBR0EsR0FBVkE7UUFRQXNCLENBQUNBO1FBQ0h0Qix3QkFBQ0E7SUFBREEsQ0FqWUF4RixBQWlZQ3dGLElBQUF4RjtJQWpZWUEsc0JBQWlCQSxHQUFqQkEsaUJBaVlaQSxDQUFBQTtBQUNIQSxDQUFDQSxFQXZZTSxJQUFJLEtBQUosSUFBSSxRQXVZVjs7QUMxWUQsSUFBTyxJQUFJLENBTVY7QUFORCxXQUFPLElBQUksRUFBQyxDQUFDO0lBRUFBLHVCQUFrQkEsR0FBR0EsWUFBT0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EseUJBQXlCQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxRQUFRQSxFQUFFQSxjQUFjQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxFQUFFQSxZQUFZQTtJQUVoSkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFFTkEsQ0FBQ0EsRUFOTSxJQUFJLEtBQUosSUFBSSxRQU1WIiwiZmlsZSI6ImNvbXBpbGVkLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsLCIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxubW9kdWxlIE1haW4ge1xuXG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9IFwiZmFicmljOC1jb25zb2xlXCI7XG5cbiAgZXhwb3J0IHZhciBsb2c6IExvZ2dpbmcuTG9nZ2VyID0gTG9nZ2VyLmdldChwbHVnaW5OYW1lKTtcblxuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IFwicGx1Z2lucy9tYWluL2h0bWxcIjtcblxuICAvLyBrdWJlcm5ldGVzIHNlcnZpY2UgbmFtZXNcbiAgZXhwb3J0IHZhciBjaGF0U2VydmljZU5hbWUgPSBcImxldHNjaGF0XCI7XG4gIGV4cG9ydCB2YXIgZ3JhZmFuYVNlcnZpY2VOYW1lID0gXCJncmFmYW5hXCI7XG4gIGV4cG9ydCB2YXIgYXBwTGlicmFyeVNlcnZpY2VOYW1lID0gXCJhcHAtbGlicmFyeVwiO1xuXG4gIGV4cG9ydCB2YXIgdmVyc2lvbjphbnkgPSB7fTtcblxufVxuIiwiLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgY29udGV4dCA9ICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL2ZvcmdlJztcblxuICBleHBvcnQgdmFyIGhhc2ggPSAnIycgKyBjb250ZXh0O1xuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSAnRm9yZ2UnO1xuICBleHBvcnQgdmFyIHBsdWdpblBhdGggPSAncGx1Z2lucy9mb3JnZS8nO1xuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IHBsdWdpblBhdGggKyAnaHRtbC8nO1xuICBleHBvcnQgdmFyIGxvZzpMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQocGx1Z2luTmFtZSk7XG5cbiAgZXhwb3J0IHZhciBkZWZhdWx0SWNvblVybCA9IENvcmUudXJsKFwiL2ltZy9mb3JnZS5zdmdcIik7XG5cbiAgZXhwb3J0IHZhciBnb2dzU2VydmljZU5hbWUgPSBLdWJlcm5ldGVzLmdvZ3NTZXJ2aWNlTmFtZTtcbiAgZXhwb3J0IHZhciBvcmlvblNlcnZpY2VOYW1lID0gXCJvcmlvblwiO1xuXG4gIGV4cG9ydCB2YXIgbG9nZ2VkSW5Ub0dvZ3MgPSBmYWxzZTtcblxuICBleHBvcnQgZnVuY3Rpb24gaXNGb3JnZSh3b3Jrc3BhY2UpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcykge1xuICAgICRzY29wZS5uYW1lc3BhY2UgPSAkcm91dGVQYXJhbXNbXCJuYW1lc3BhY2VcIl0gfHwgS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICRzY29wZS5wcm9qZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJwcm9qZWN0XCJdO1xuICAgICRzY29wZS4kd29ya3NwYWNlTGluayA9IERldmVsb3Blci53b3Jrc3BhY2VMaW5rKCk7XG4gICAgJHNjb3BlLiRwcm9qZWN0TGluayA9IERldmVsb3Blci5wcm9qZWN0TGluaygkc2NvcGUucHJvamVjdElkKTtcbiAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0QnJlYWRjcnVtYnMoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U3ViTmF2QmFycygkc2NvcGUucHJvamVjdElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTGluayhwcm9qZWN0SWQsIG5hbWUsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBsaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihsaW5rLCBcIi9mb3JnZS9jb21tYW5kXCIsIG5hbWUsIHJlc291cmNlUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmQvXCIsIG5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCBwcm9qZWN0SWQpIHtcbiAgICB2YXIgbGluayA9IERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpO1xuICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZHMvdXNlclwiLCByZXNvdXJjZVBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmRzXCIpO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZXBvc0FwaVVybChGb3JnZUFwaVVSTCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiL3JlcG9zXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHJlcG9BcGlVcmwoRm9yZ2VBcGlVUkwsIHBhdGgpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcIi9yZXBvcy91c2VyXCIsIHBhdGgpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCwgbnMsIHByb2plY3RJZCwgcmVzb3VyY2VQYXRoID0gbnVsbCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBjb21tYW5kSWQsIG5zLCBwcm9qZWN0SWQsIHJlc291cmNlUGF0aCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZXhlY3V0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcImV4ZWN1dGVcIiwgY29tbWFuZElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcInZhbGlkYXRlXCIsIGNvbW1hbmRJZCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY29tbWFuZElucHV0QXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsIG5zLCBwcm9qZWN0SWQsIHJlc291cmNlUGF0aCkge1xuICAgIGlmIChucyAmJiBwcm9qZWN0SWQpIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZElucHV0XCIsIGNvbW1hbmRJZCwgbnMsIHByb2plY3RJZCwgcmVzb3VyY2VQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kSW5wdXRcIiwgY29tbWFuZElkKTtcbiAgICB9XG4gIH1cblxuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHByb2plY3QgZm9yIHRoZSBnaXZlbiByZXNvdXJjZSBwYXRoXG4gICAqL1xuICBmdW5jdGlvbiBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgaWYgKHJlc291cmNlUGF0aCkge1xuICAgICAgdmFyIHByb2plY3QgPSBGb3JnZU1vZGVsLnByb2plY3RzW3Jlc291cmNlUGF0aF07XG4gICAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgICAgcHJvamVjdCA9IHt9O1xuICAgICAgICBGb3JnZU1vZGVsLnByb2plY3RzW3Jlc291cmNlUGF0aF0gPSBwcm9qZWN0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2plY3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBGb3JnZU1vZGVsLnJvb3RQcm9qZWN0O1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzZXRNb2RlbENvbW1hbmRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCwgY29tbWFuZHMpIHtcbiAgICB2YXIgcHJvamVjdCA9IG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHByb2plY3QuJGNvbW1hbmRzID0gY29tbWFuZHM7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxDb21tYW5kcyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpIHtcbiAgICB2YXIgcHJvamVjdCA9IG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBwcm9qZWN0LiRjb21tYW5kcyB8fCBbXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vZGVsQ29tbWFuZElucHV0TWFwKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBwcm9qZWN0LiRjb21tYW5kSW5wdXRzO1xuICAgIGlmICghY29tbWFuZElucHV0cykge1xuICAgICAgY29tbWFuZElucHV0cyA9IHt9O1xuICAgICAgcHJvamVjdC4kY29tbWFuZElucHV0cyA9IGNvbW1hbmRJbnB1dHM7XG4gICAgfVxuICAgIHJldHVybiBjb21tYW5kSW5wdXRzO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgsIGlkKSB7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBtb2RlbENvbW1hbmRJbnB1dE1hcChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBjb21tYW5kSW5wdXRzW2lkXTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzZXRNb2RlbENvbW1hbmRJbnB1dHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoLCBpZCwgaXRlbSkge1xuICAgIHZhciBjb21tYW5kSW5wdXRzID0gbW9kZWxDb21tYW5kSW5wdXRNYXAoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICByZXR1cm4gY29tbWFuZElucHV0c1tpZF0gPSBpdGVtO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGVucmljaFJlcG8ocmVwbykge1xuICAgIHZhciBvd25lciA9IHJlcG8ub3duZXIgfHwge307XG4gICAgdmFyIHVzZXIgPSBvd25lci51c2VybmFtZSB8fCByZXBvLnVzZXI7XG4gICAgdmFyIG5hbWUgPSByZXBvLm5hbWU7XG4gICAgdmFyIHByb2plY3RJZCA9IG5hbWU7XG4gICAgdmFyIGF2YXRhcl91cmwgPSBvd25lci5hdmF0YXJfdXJsO1xuICAgIGlmIChhdmF0YXJfdXJsICYmIGF2YXRhcl91cmwuc3RhcnRzV2l0aChcImh0dHAvL1wiKSkge1xuICAgICAgYXZhdGFyX3VybCA9IFwiaHR0cDovL1wiICsgYXZhdGFyX3VybC5zdWJzdHJpbmcoNik7XG4gICAgICBvd25lci5hdmF0YXJfdXJsID0gYXZhdGFyX3VybDtcbiAgICB9XG4gICAgaWYgKHVzZXIgJiYgbmFtZSkge1xuICAgICAgdmFyIHJlc291cmNlUGF0aCA9IHVzZXIgKyBcIi9cIiArIG5hbWU7XG4gICAgICByZXBvLiRjb21tYW5kc0xpbmsgPSBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCBwcm9qZWN0SWQpO1xuICAgICAgcmVwby4kYnVpbGRzTGluayA9IFwiL2t1YmVybmV0ZXMvYnVpbGRzP3E9L1wiICsgcmVzb3VyY2VQYXRoICsgXCIuZ2l0XCI7XG4gICAgICB2YXIgaW5qZWN0b3IgPSBIYXd0aW9Db3JlLmluamVjdG9yO1xuICAgICAgaWYgKGluamVjdG9yKSB7XG4gICAgICAgIHZhciBTZXJ2aWNlUmVnaXN0cnkgPSBpbmplY3Rvci5nZXQoXCJTZXJ2aWNlUmVnaXN0cnlcIik7XG4gICAgICAgIGlmIChTZXJ2aWNlUmVnaXN0cnkpIHtcbiAgICAgICAgICB2YXIgb3Jpb25MaW5rID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKG9yaW9uU2VydmljZU5hbWUpO1xuICAgICAgICAgIHZhciBnb2dzU2VydmljZSA9IFNlcnZpY2VSZWdpc3RyeS5maW5kU2VydmljZShnb2dzU2VydmljZU5hbWUpO1xuICAgICAgICAgIGlmIChvcmlvbkxpbmsgJiYgZ29nc1NlcnZpY2UpIHtcbiAgICAgICAgICAgIHZhciBwb3J0YWxJcCA9IGdvZ3NTZXJ2aWNlLnBvcnRhbElQO1xuICAgICAgICAgICAgaWYgKHBvcnRhbElwKSB7XG4gICAgICAgICAgICAgIHZhciBwb3J0ID0gZ29nc1NlcnZpY2UucG9ydDtcbiAgICAgICAgICAgICAgdmFyIHBvcnRUZXh0ID0gKHBvcnQgJiYgcG9ydCAhPT0gODAgJiYgcG9ydCAhPT0gNDQzKSA/IFwiOlwiICsgcG9ydCA6IFwiXCI7XG4gICAgICAgICAgICAgIHZhciBwcm90b2NvbCA9IChwb3J0ICYmIHBvcnQgPT09IDQ0MykgPyBcImh0dHBzOi8vXCIgOiBcImh0dHA6Ly9cIjtcbiAgICAgICAgICAgICAgdmFyIGdpdENsb25lVXJsID0gVXJsSGVscGVycy5qb2luKHByb3RvY29sICsgcG9ydGFsSXAgKyBwb3J0VGV4dCArIFwiL1wiLCByZXNvdXJjZVBhdGggKyBcIi5naXRcIik7XG5cbiAgICAgICAgICAgICAgcmVwby4kb3BlblByb2plY3RMaW5rID0gVXJsSGVscGVycy5qb2luKG9yaW9uTGluayxcbiAgICAgICAgICAgICAgICBcIi9naXQvZ2l0LXJlcG9zaXRvcnkuaHRtbCMsY3JlYXRlUHJvamVjdC5uYW1lPVwiICsgbmFtZSArIFwiLGNsb25lR2l0PVwiICsgZ2l0Q2xvbmVVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVIdHRwQ29uZmlnKCkge1xuICAgIHZhciBhdXRoSGVhZGVyID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl07XG4gICAgdmFyIGVtYWlsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdO1xuICAgIHZhciBjb25maWcgPSB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICB9XG4vKlxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBBdXRob3JpemF0aW9uOiBhdXRoSGVhZGVyLFxuICAgICAgICBFbWFpbDogZW1haWxcbiAgICAgIH1cbiovXG4gICAgfTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkUXVlcnlBcmd1bWVudCh1cmwsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKHVybCAmJiBuYW1lICYmIHZhbHVlKSB7XG4gICAgICB2YXIgc2VwID0gICh1cmwuaW5kZXhPZihcIj9cIikgPj0gMCkgPyBcIiZcIiA6IFwiP1wiO1xuICAgICAgcmV0dXJuIHVybCArIHNlcCArICBuYW1lICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUh0dHBVcmwodXJsLCBhdXRoSGVhZGVyID0gbnVsbCwgZW1haWwgPSBudWxsKSB7XG4gICAgYXV0aEhlYWRlciA9IGF1dGhIZWFkZXIgfHwgbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl07XG4gICAgZW1haWwgPSBlbWFpbCB8fCBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl07XG5cbiAgICB1cmwgPSBhZGRRdWVyeUFyZ3VtZW50KHVybCwgXCJfZ29nc0F1dGhcIiwgYXV0aEhlYWRlcik7XG4gICAgdXJsID0gYWRkUXVlcnlBcmd1bWVudCh1cmwsIFwiX2dvZ3NFbWFpbFwiLCBlbWFpbCk7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTWF0Y2hlc1RleHQoY29tbWFuZCwgZmlsdGVyVGV4dCkge1xuICAgIGlmIChmaWx0ZXJUZXh0KSB7XG4gICAgICByZXR1cm4gQ29yZS5tYXRjaEZpbHRlcklnbm9yZUNhc2UoYW5ndWxhci50b0pzb24oY29tbWFuZCksIGZpbHRlclRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaXNMb2dnZWRJbnRvR29ncygpIHtcbiAgICB2YXIgbG9jYWxTdG9yYWdlID0gS3ViZXJuZXRlcy5pbmplY3QoXCJsb2NhbFN0b3JhZ2VcIikgfHwge307XG4gICAgdmFyIGF1dGhIZWFkZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICAvL3JldHVybiBhdXRoSGVhZGVyID8gbG9nZ2VkSW5Ub0dvZ3MgOiBmYWxzZTtcbiAgICByZXR1cm4gYXV0aEhlYWRlciA/IHRydWUgOiBmYWxzZTtcbi8qXG4gICAgdmFyIGNvbmZpZyA9IGNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICByZXR1cm4gY29uZmlnLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA/IHRydWUgOiBmYWxzZTtcbiovXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQoJHNjb3BlLCAkbG9jYXRpb24pIHtcbiAgICBpZiAoIWlzTG9nZ2VkSW50b0dvZ3MoKSkge1xuICAgICAgdmFyIGRldkxpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICB2YXIgbG9naW5QYWdlID0gVXJsSGVscGVycy5qb2luKGRldkxpbmssIFwiZm9yZ2UvcmVwb3NcIik7XG4gICAgICBsb2cuaW5mbyhcIk5vdCBsb2dnZWQgaW4gc28gcmVkaXJlY3RpbmcgdG8gXCIgKyBsb2dpblBhZ2UpO1xuICAgICAgJGxvY2F0aW9uLnBhdGgobG9naW5QYWdlKVxuICAgIH1cbiAgfVxufVxuIiwiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9mb3JnZS90cy9mb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWFpbkdsb2JhbHMudHNcIi8+XG5cbm1vZHVsZSBNYWluIHtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbRm9yZ2UucGx1Z2luTmFtZV0pO1xuXG4gIHZhciB0YWIgPSB1bmRlZmluZWQ7XG5cbiAgX21vZHVsZS5ydW4oKCRyb290U2NvcGUsIEhhd3Rpb05hdjogSGF3dGlvTWFpbk5hdi5SZWdpc3RyeSwgS3ViZXJuZXRlc01vZGVsLCBTZXJ2aWNlUmVnaXN0cnksIHByZWZlcmVuY2VzUmVnaXN0cnkpID0+IHtcblxuICAgIEhhd3Rpb05hdi5vbihIYXd0aW9NYWluTmF2LkFjdGlvbnMuQ0hBTkdFRCwgcGx1Z2luTmFtZSwgKGl0ZW1zKSA9PiB7XG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHN3aXRjaChpdGVtLmlkKSB7XG4gICAgICAgICAgY2FzZSAnZm9yZ2UnOlxuICAgICAgICAgIGNhc2UgJ2p2bSc6XG4gICAgICAgICAgY2FzZSAnd2lraSc6XG4gICAgICAgICAgY2FzZSAnZG9ja2VyLXJlZ2lzdHJ5JzpcbiAgICAgICAgICAgIGl0ZW0uaXNWYWxpZCA9ICgpID0+IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAnbGlicmFyeScsXG4gICAgICB0aXRsZTogKCkgPT4gJ0xpYnJhcnknLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgdGhlIGxpYnJhcnkgb2YgYXBwbGljYXRpb25zJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGFwcExpYnJhcnlTZXJ2aWNlTmFtZSkgJiYgU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoXCJhcHAtbGlicmFyeS1qb2xva2lhXCIpLFxuICAgICAgaHJlZjogKCkgPT4gXCIvd2lraS92aWV3XCIsXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIHZhciBraWJhbmFTZXJ2aWNlTmFtZSA9IEt1YmVybmV0ZXMua2liYW5hU2VydmljZU5hbWU7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAna2liYW5hJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0xvZ3MnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgYW5kIHNlYXJjaCBhbGwgbG9ncyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgS2liYW5hIGFuZCBFbGFzdGljU2VhcmNoJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGtpYmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IEt1YmVybmV0ZXMua2liYW5hTG9nc0xpbmsoU2VydmljZVJlZ2lzdHJ5KSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2FwaW1hbicsXG4gICAgICB0aXRsZTogKCkgPT4gJ0FQSSBNYW5hZ2VtZW50JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdBZGQgUG9saWNpZXMgYW5kIFBsYW5zIHRvIHlvdXIgQVBJcyB3aXRoIEFwaW1hbicsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZSgnYXBpbWFuJyksXG4gICAgICBvbGRIcmVmOiAoKSA9PiB7IC8qIG5vdGhpbmcgdG8gZG8gKi8gfSxcbiAgICAgIGhyZWY6ICgpID0+IHtcbiAgICAgICAgdmFyIGhhc2ggPSB7XG4gICAgICAgICAgYmFja1RvOiBuZXcgVVJJKCkudG9TdHJpbmcoKSxcbiAgICAgICAgICB0b2tlbjogSGF3dGlvT0F1dGguZ2V0T0F1dGhUb2tlbigpXG4gICAgICAgIH07XG4gICAgICAgIHZhciB1cmkgPSBuZXcgVVJJKFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluaygnYXBpbWFuJykpO1xuICAgICAgICAvLyBUT0RPIGhhdmUgdG8gb3ZlcndyaXRlIHRoZSBwb3J0IGhlcmUgZm9yIHNvbWUgcmVhc29uXG4gICAgICAgICg8YW55PnVyaS5wb3J0KCc4MCcpLnF1ZXJ5KHt9KS5wYXRoKCdhcGltYW51aS9pbmRleC5odG1sJykpLmhhc2goVVJJLmVuY29kZShhbmd1bGFyLnRvSnNvbihoYXNoKSkpO1xuICAgICAgICByZXR1cm4gdXJpLnRvU3RyaW5nKCk7XG4gICAgICB9ICAgIFxuICAgIH0pO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2dyYWZhbmEnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnTWV0cmljcycsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlld3MgbWV0cmljcyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgR3JhZmFuYSBhbmQgSW5mbHV4REInLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoZ3JhZmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhncmFmYW5hU2VydmljZU5hbWUpLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiBcImNoYXRcIixcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0NoYXQnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NoYXQgcm9vbSBmb3IgZGlzY3Vzc2luZyB0aGlzIG5hbWVzcGFjZScsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShjaGF0U2VydmljZU5hbWUpLFxuICAgICAgaHJlZjogKCkgPT4ge1xuICAgICAgICB2YXIgYW5zd2VyID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKGNoYXRTZXJ2aWNlTmFtZSk7XG4gICAgICAgIGlmIChhbnN3ZXIpIHtcbi8qXG4gICAgICAgICAgVE9ETyBhZGQgYSBjdXN0b20gbGluayB0byB0aGUgY29ycmVjdCByb29tIGZvciB0aGUgY3VycmVudCBuYW1lc3BhY2U/XG5cbiAgICAgICAgICB2YXIgaXJjSG9zdCA9IFwiXCI7XG4gICAgICAgICAgdmFyIGlyY1NlcnZpY2UgPSBTZXJ2aWNlUmVnaXN0cnkuZmluZFNlcnZpY2UoXCJodWJvdFwiKTtcbiAgICAgICAgICBpZiAoaXJjU2VydmljZSkge1xuICAgICAgICAgICAgaXJjSG9zdCA9IGlyY1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpcmNIb3N0KSB7XG4gICAgICAgICAgICB2YXIgbmljayA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdIHx8IGxvY2FsU3RvcmFnZVtcImlyY05pY2tcIl0gfHwgXCJteW5hbWVcIjtcbiAgICAgICAgICAgIHZhciByb29tID0gXCIjZmFicmljOC1cIiArICBjdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgICAgICAgYW5zd2VyID0gVXJsSGVscGVycy5qb2luKGFuc3dlciwgXCIva2l3aVwiLCBpcmNIb3N0LCBcIj8mbmljaz1cIiArIG5pY2sgKyByb29tKTtcbiAgICAgICAgICB9XG4qL1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICB9LFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICAvLyBUT0RPIHdlIHNob3VsZCBtb3ZlIHRoaXMgdG8gYSBuaWNlciBsaW5rIGluc2lkZSB0aGUgTGlicmFyeSBzb29uIC0gYWxzbyBsZXRzIGhpZGUgdW50aWwgaXQgd29ya3MuLi5cbi8qXG4gICAgd29ya3NwYWNlLnRvcExldmVsVGFicy5wdXNoKHtcbiAgICAgIGlkOiAnY3JlYXRlUHJvamVjdCcsXG4gICAgICB0aXRsZTogKCkgPT4gICdDcmVhdGUnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NyZWF0ZXMgYSBuZXcgcHJvamVjdCcsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShcImFwcC1saWJyYXJ5XCIpICYmIGZhbHNlLFxuICAgICAgaHJlZjogKCkgPT4gXCIvcHJvamVjdC9jcmVhdGVcIlxuICAgIH0pO1xuKi9cblxuICAgIHByZWZlcmVuY2VzUmVnaXN0cnkuYWRkVGFiKCdBYm91dCAnICsgdmVyc2lvbi5uYW1lLCBVcmxIZWxwZXJzLmpvaW4odGVtcGxhdGVQYXRoLCAnYWJvdXQuaHRtbCcpKTtcblxuICAgIGxvZy5pbmZvKFwic3RhcnRlZCwgdmVyc2lvbjogXCIsIHZlcnNpb24udmVyc2lvbik7XG4gICAgbG9nLmluZm8oXCJjb21taXQgSUQ6IFwiLCB2ZXJzaW9uLmNvbW1pdElkKTtcbiAgfSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLnJlZ2lzdGVyUHJlQm9vdHN0cmFwVGFzaygobmV4dCkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICB1cmw6ICd2ZXJzaW9uLmpzb24/cmV2PScgKyBEYXRlLm5vdygpLCBcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdmVyc2lvbiA9IGFuZ3VsYXIuZnJvbUpzb24oZGF0YSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIHZlcnNpb24gPSB7XG4gICAgICAgICAgICBuYW1lOiAnZmFicmljOC1jb25zb2xlJyxcbiAgICAgICAgICAgIHZlcnNpb246ICcnXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgICB9LFxuICAgICAgZXJyb3I6IChqcVhIUiwgdGV4dCwgc3RhdHVzKSA9PiB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIkZhaWxlZCB0byBmZXRjaCB2ZXJzaW9uOiBqcVhIUjogXCIsIGpxWEhSLCBcIiB0ZXh0OiBcIiwgdGV4dCwgXCIgc3RhdHVzOiBcIiwgc3RhdHVzKTtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSxcbiAgICAgIGRhdGFUeXBlOiBcImh0bWxcIlxuICAgIH0pO1xuICB9KTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIuYWRkTW9kdWxlKHBsdWdpbk5hbWUpO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5HbG9iYWxzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5QbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBNYWluIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKCdNYWluLkFib3V0JywgKCRzY29wZSkgPT4ge1xuICAgICRzY29wZS5pbmZvID0gdmVyc2lvbjtcbiAgfSk7XG59XG5cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgWydoYXd0aW8tY29yZScsICdoYXd0aW8tdWknXSk7XG4gIGV4cG9ydCB2YXIgY29udHJvbGxlciA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlQ29udHJvbGxlckZ1bmN0aW9uKF9tb2R1bGUsIHBsdWdpbk5hbWUpO1xuICBleHBvcnQgdmFyIHJvdXRlID0gUGx1Z2luSGVscGVycy5jcmVhdGVSb3V0aW5nRnVuY3Rpb24odGVtcGxhdGVQYXRoKTtcblxuICBfbW9kdWxlLmNvbmZpZyhbJyRyb3V0ZVByb3ZpZGVyJywgKCRyb3V0ZVByb3ZpZGVyOm5nLnJvdXRlLklSb3V0ZVByb3ZpZGVyKSA9PiB7XG5cbiAgICBjb25zb2xlLmxvZyhcIkxpc3RlbmluZyBvbjogXCIgKyBVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9jcmVhdGVQcm9qZWN0JykpO1xuXG4gICAgJHJvdXRlUHJvdmlkZXIud2hlbihVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9jcmVhdGVQcm9qZWN0JyksIHJvdXRlKCdjcmVhdGVQcm9qZWN0Lmh0bWwnLCBmYWxzZSkpXG4gICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9yZXBvcy86cGF0aConKSwgcm91dGUoJ3JlcG8uaHRtbCcsIGZhbHNlKSlcbiAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL3JlcG9zJyksIHJvdXRlKCdyZXBvcy5odG1sJywgZmFsc2UpKTtcblxuICAgIGFuZ3VsYXIuZm9yRWFjaChbY29udGV4dCwgJy93b3Jrc3BhY2VzLzpuYW1lc3BhY2UvcHJvamVjdHMvOnByb2plY3QvZm9yZ2UnXSwgKHBhdGgpID0+IHtcbiAgICAgICRyb3V0ZVByb3ZpZGVyXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmRzJyksIHJvdXRlKCdjb21tYW5kcy5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kcy86cGF0aConKSwgcm91dGUoJ2NvbW1hbmRzLmh0bWwnLCBmYWxzZSkpXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmQvOmlkJyksIHJvdXRlKCdjb21tYW5kLmh0bWwnLCBmYWxzZSkpXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmQvOmlkLzpwYXRoKicpLCByb3V0ZSgnY29tbWFuZC5odG1sJywgZmFsc2UpKTtcbiAgICB9KTtcblxuICB9XSk7XG5cbiAgX21vZHVsZS5mYWN0b3J5KCdGb3JnZUFwaVVSTCcsIFsnJHEnLCAnJHJvb3RTY29wZScsICgkcTpuZy5JUVNlcnZpY2UsICRyb290U2NvcGU6bmcuSVJvb3RTY29wZVNlcnZpY2UpID0+IHtcbiAgICByZXR1cm4gS3ViZXJuZXRlcy5rdWJlcm5ldGVzQXBpVXJsKCkgKyBcIi9wcm94eVwiICsgS3ViZXJuZXRlcy5rdWJlcm5ldGVzTmFtZXNwYWNlUGF0aCgpICsgXCIvc2VydmljZXMvZmFicmljOC1mb3JnZS9hcGkvZm9yZ2VcIjtcbiAgfV0pO1xuXG5cbiAgX21vZHVsZS5mYWN0b3J5KCdGb3JnZU1vZGVsJywgWyckcScsICckcm9vdFNjb3BlJywgKCRxOm5nLklRU2VydmljZSwgJHJvb3RTY29wZTpuZy5JUm9vdFNjb3BlU2VydmljZSkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICByb290UHJvamVjdDoge30sXG4gICAgICBwcm9qZWN0czogW11cbiAgICB9XG4gIH1dKTtcblxuICBfbW9kdWxlLnJ1bihbJ3ZpZXdSZWdpc3RyeScsICdIYXd0aW9OYXYnLCAodmlld1JlZ2lzdHJ5LCBIYXd0aW9OYXYpID0+IHtcbiAgICB2aWV3UmVnaXN0cnlbJ2ZvcmdlJ10gPSB0ZW1wbGF0ZVBhdGggKyAnbGF5b3V0Rm9yZ2UuaHRtbCc7XG4gIH1dKTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIuYWRkTW9kdWxlKHBsdWdpbk5hbWUpO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIENvbW1hbmRDb250cm9sbGVyID0gY29udHJvbGxlcihcIkNvbW1hbmRDb250cm9sbGVyXCIsXG4gICAgW1wiJHNjb3BlXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJGb3JnZU1vZGVsXCIsXG4gICAgICAoJHNjb3BlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXMsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwpID0+IHtcblxuICAgICAgICAkc2NvcGUubW9kZWwgPSBGb3JnZU1vZGVsO1xuXG4gICAgICAgICRzY29wZS5yZXNvdXJjZVBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdIHx8ICRsb2NhdGlvbi5zZWFyY2goKVtcInBhdGhcIl0gfHwgXCJcIjtcbiAgICAgICAgJHNjb3BlLmlkID0gJHJvdXRlUGFyYW1zW1wiaWRcIl07XG4gICAgICAgICRzY29wZS5wYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXTtcblxuICAgICAgICAkc2NvcGUuYXZhdGFyX3VybCA9IGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl07XG4gICAgICAgICRzY29wZS51c2VyID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl07XG4gICAgICAgICRzY29wZS5yZXBvTmFtZSA9IFwiXCI7XG4gICAgICAgIHZhciBwYXRoU3RlcHMgPSAkc2NvcGUucmVzb3VyY2VQYXRoLnNwbGl0KFwiL1wiKTtcbiAgICAgICAgaWYgKHBhdGhTdGVwcyAmJiBwYXRoU3RlcHMubGVuZ3RoKSB7XG4gICAgICAgICAgJHNjb3BlLnJlcG9OYW1lID0gcGF0aFN0ZXBzW3BhdGhTdGVwcy5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuICAgICAgICBpZiAoJHNjb3BlLmlkID09PSBcImRldm9wcy1lZGl0XCIpIHtcbiAgICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U2V0dGluZ3NCcmVhZGNydW1icygkc2NvcGUucHJvamVjdElkKTtcbiAgICAgICAgICAkc2NvcGUuc3ViVGFiQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTZXR0aW5nc1N1Yk5hdkJhcnMoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQoJHNjb3BlLCAkbG9jYXRpb24pO1xuXG4gICAgICAgICRzY29wZS4kY29tcGxldGVMaW5rID0gJHNjb3BlLiRwcm9qZWN0TGluaztcbiAgICAgICAgaWYgKCRzY29wZS5wcm9qZWN0SWQpIHtcblxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5jb21tYW5kc0xpbmsgPSBjb21tYW5kc0xpbmsoJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICAgICRzY29wZS5jb21wbGV0ZWRMaW5rID0gJHNjb3BlLnByb2plY3RJZCA/IFVybEhlbHBlcnMuam9pbigkc2NvcGUuJHByb2plY3RMaW5rLCBcImVudmlyb25tZW50c1wiKSA6ICRzY29wZS4kcHJvamVjdExpbms7XG5cbiAgICAgICAgJHNjb3BlLmVudGl0eSA9IHtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmlucHV0TGlzdCA9IFskc2NvcGUuZW50aXR5XTtcblxuICAgICAgICAkc2NvcGUuc2NoZW1hID0gZ2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5pZCk7XG4gICAgICAgIG9uU2NoZW1hTG9hZCgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uUm91dGVDaGFuZ2VkKCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwicm91dGUgdXBkYXRlZDsgbGV0cyBjbGVhciB0aGUgZW50aXR5XCIpO1xuICAgICAgICAgICRzY29wZS5lbnRpdHkgPSB7XG4gICAgICAgICAgfTtcbiAgICAgICAgICAkc2NvcGUuaW5wdXRMaXN0ID0gWyRzY29wZS5lbnRpdHldO1xuICAgICAgICAgICRzY29wZS5wcmV2aW91c1NjaGVtYUpzb24gPSBcIlwiO1xuICAgICAgICAgICRzY29wZS5zY2hlbWEgPSBudWxsO1xuICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLiRvbignJHJvdXRlQ2hhbmdlU3VjY2VzcycsIG9uUm91dGVDaGFuZ2VkKTtcblxuICAgICAgICAkc2NvcGUuZXhlY3V0ZSA9ICgpID0+IHtcbiAgICAgICAgICAvLyBUT0RPIGNoZWNrIGlmIHZhbGlkLi4uXG4gICAgICAgICAgJHNjb3BlLnJlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAkc2NvcGUuaW52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uRXJyb3IgPSBudWxsO1xuICAgICAgICAgIHZhciBjb21tYW5kSWQgPSAkc2NvcGUuaWQ7XG4gICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgdmFyIHVybCA9IGV4ZWN1dGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpO1xuICAgICAgICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgICAgICAgbmFtZXNwYWNlOiAkc2NvcGUubmFtZXNwYWNlLFxuICAgICAgICAgICAgcHJvamVjdE5hbWU6ICRzY29wZS5wcm9qZWN0SWQsXG4gICAgICAgICAgICByZXNvdXJjZTogcmVzb3VyY2VQYXRoLFxuICAgICAgICAgICAgaW5wdXRMaXN0OiAkc2NvcGUuaW5wdXRMaXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICAgICAgbG9nLmluZm8oXCJBYm91dCB0byBwb3N0IHRvIFwiICsgdXJsICsgXCIgcGF5bG9hZDogXCIgKyBhbmd1bGFyLnRvSnNvbihyZXF1ZXN0KSk7XG4gICAgICAgICAgJGh0dHAucG9zdCh1cmwsIHJlcXVlc3QsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICRzY29wZS5pbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uRXJyb3IgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIGRhdGEubWVzc2FnZSA9IGRhdGEubWVzc2FnZSB8fCBkYXRhLm91dHB1dDtcbiAgICAgICAgICAgICAgICB2YXIgd2l6YXJkUmVzdWx0cyA9IGRhdGEud2l6YXJkUmVzdWx0cztcbiAgICAgICAgICAgICAgICBpZiAod2l6YXJkUmVzdWx0cykge1xuICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHdpemFyZFJlc3VsdHMuc3RlcFZhbGlkYXRpb25zLCAodmFsaWRhdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoISRzY29wZS5pbnZhbGlkICYmICF2YWxpZGF0aW9uLnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2VzID0gdmFsaWRhdGlvbi5tZXNzYWdlcyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG1lc3NhZ2VzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmludmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbkVycm9yID0gbWVzc2FnZS5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25JbnB1dCA9IG1lc3NhZ2UuaW5wdXROYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3RlcElucHV0cyA9IHdpemFyZFJlc3VsdHMuc3RlcElucHV0cztcbiAgICAgICAgICAgICAgICAgIGlmIChzdGVwSW5wdXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2hlbWEgPSBfLmxhc3Qoc3RlcElucHV0cyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZW50aXR5ID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgdXBkYXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gbGV0cyBjb3B5IGFjcm9zcyBhbnkgZGVmYXVsdCB2YWx1ZXMgZnJvbSB0aGUgc2NoZW1hXG4gICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYVtcInByb3BlcnRpZXNcIl0sIChwcm9wZXJ0eSwgbmFtZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gcHJvcGVydHkudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nLmluZm8oXCJBZGRpbmcgZW50aXR5LlwiICsgbmFtZSArIFwiID0gXCIgKyB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHlbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaW5wdXRMaXN0LnB1c2goJHNjb3BlLmVudGl0eSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5jYW5Nb3ZlVG9OZXh0U3RlcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0cyBjbGVhciB0aGUgcmVzcG9uc2Ugd2UndmUgYW5vdGhlciB3aXphcmQgcGFnZSB0byBkb1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG90aGVyd2lzZSBpbmRpY2F0ZSB0aGF0IHRoZSB3aXphcmQganVzdCBjb21wbGV0ZWQgYW5kIGxldHMgaGlkZSB0aGUgaW5wdXQgZm9ybVxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndpemFyZENvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICghJHNjb3BlLmludmFsaWQpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2UgPSBkYXRhO1xuICAgICAgICAgICAgICAgIHZhciBkYXRhT3JFbXB0eSA9IChkYXRhIHx8IHt9KTtcbiAgICAgICAgICAgICAgICB2YXIgc3RhdHVzID0gKGRhdGFPckVtcHR5LnN0YXR1cyB8fCBcIlwiKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlc3BvbnNlQ2xhc3MgPSB0b0JhY2tncm91bmRTdHlsZShzdGF0dXMpO1xuXG4gICAgICAgICAgICAgICAgdmFyIG91dHB1dFByb3BlcnRpZXMgPSAoZGF0YU9yRW1wdHkub3V0cHV0UHJvcGVydGllcyB8fCB7fSk7XG4gICAgICAgICAgICAgICAgdmFyIHByb2plY3RJZCA9IGRhdGFPckVtcHR5LnByb2plY3ROYW1lIHx8IG91dHB1dFByb3BlcnRpZXMuZnVsbE5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS5yZXNwb25zZSAmJiBwcm9qZWN0SWQgJiYgJHNjb3BlLmlkID09PSAncHJvamVjdC1uZXcnKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2UgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgLy8gbGV0cyBmb3J3YXJkIHRvIHRoZSBkZXZvcHMgZWRpdCBwYWdlXG4gICAgICAgICAgICAgICAgICB2YXIgZWRpdFBhdGggPSBVcmxIZWxwZXJzLmpvaW4oRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCksIFwiL2ZvcmdlL2NvbW1hbmQvZGV2b3BzLWVkaXRcIik7XG4gICAgICAgICAgICAgICAgICBsb2cuaW5mbyhcIk1vdmluZyB0byB0aGUgZGV2b3BzIGVkaXQgcGF0aDogXCIgKyBlZGl0UGF0aCk7XG4gICAgICAgICAgICAgICAgICAkbG9jYXRpb24ucGF0aChlZGl0UGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9KS5cbiAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgIGxvZy53YXJuKFwiRmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIiBcIiArIGRhdGEgKyBcIiBcIiArIHN0YXR1cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbihcImVudGl0eVwiLCAoKSA9PiB7XG4gICAgICAgICAgdmFsaWRhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlU2NoZW1hKHNjaGVtYSkge1xuICAgICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICAgIC8vIGxldHMgcmVtb3ZlIHRoZSB2YWx1ZXMgc28gdGhhdCB3ZSBjYW4gcHJvcGVybHkgY2hlY2sgd2hlbiB0aGUgc2NoZW1hIHJlYWxseSBkb2VzIGNoYW5nZVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBzY2hlbWEgd2lsbCBjaGFuZ2UgZXZlcnkgdGltZSB3ZSB0eXBlIGEgY2hhcmFjdGVyIDspXG4gICAgICAgICAgICB2YXIgc2NoZW1hV2l0aG91dFZhbHVlcyA9IGFuZ3VsYXIuY29weShzY2hlbWEpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYVdpdGhvdXRWYWx1ZXMucHJvcGVydGllcywgKHByb3BlcnR5KSA9PiB7XG4gICAgICAgICAgICAgIGRlbGV0ZSBwcm9wZXJ0eVtcInZhbHVlXCJdO1xuICAgICAgICAgICAgICBkZWxldGUgcHJvcGVydHlbXCJlbmFibGVkXCJdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIganNvbiA9IGFuZ3VsYXIudG9Kc29uKHNjaGVtYVdpdGhvdXRWYWx1ZXMpO1xuICAgICAgICAgICAgaWYgKGpzb24gIT09ICRzY29wZS5wcmV2aW91c1NjaGVtYUpzb24pIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVkIHNjaGVtYTogXCIgKyBqc29uKTtcbiAgICAgICAgICAgICAgJHNjb3BlLnByZXZpb3VzU2NoZW1hSnNvbiA9IGpzb247XG4gICAgICAgICAgICAgICRzY29wZS5zY2hlbWEgPSBzY2hlbWE7XG5cbiAgICAgICAgICAgICAgaWYgKCRzY29wZS5pZCA9PT0gXCJwcm9qZWN0LW5ld1wiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVudGl0eSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgICAgICAgLy8gbGV0cyBoaWRlIHRoZSB0YXJnZXQgbG9jYXRpb24hXG4gICAgICAgICAgICAgICAgdmFyIHByb3BlcnRpZXMgPSBzY2hlbWEucHJvcGVydGllcyB8fCB7fTtcbiAgICAgICAgICAgICAgICB2YXIgb3ZlcndyaXRlID0gcHJvcGVydGllcy5vdmVyd3JpdGU7XG4gICAgICAgICAgICAgICAgdmFyIGNhdGFsb2cgPSBwcm9wZXJ0aWVzLmNhdGFsb2c7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldExvY2F0aW9uID0gcHJvcGVydGllcy50YXJnZXRMb2NhdGlvbjtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0TG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgIHRhcmdldExvY2F0aW9uLmhpZGRlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBpZiAob3ZlcndyaXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJ3cml0ZS5oaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJoaWRpbmcgdGFyZ2V0TG9jYXRpb24hXCIpO1xuXG4gICAgICAgICAgICAgICAgICAvLyBsZXRzIGRlZmF1bHQgdGhlIHR5cGVcbiAgICAgICAgICAgICAgICAgIGlmICghZW50aXR5LnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5LnR5cGUgPSBcIkZyb20gQXJjaGV0eXBlIENhdGFsb2dcIjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhdGFsb2cpIHtcbiAgICAgICAgICAgICAgICAgIGlmICghZW50aXR5LmNhdGFsb2cpIHtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5LmNhdGFsb2cgPSBcImZhYnJpYzhcIjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB2YWxpZGF0ZSgpIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLmV4ZWN1dGluZyB8fCAkc2NvcGUudmFsaWRhdGluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbmV3SnNvbiA9IGFuZ3VsYXIudG9Kc29uKCRzY29wZS5lbnRpdHkpO1xuICAgICAgICAgIGlmIChuZXdKc29uID09PSAkc2NvcGUudmFsaWRhdGVkRW50aXR5SnNvbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUudmFsaWRhdGVkRW50aXR5SnNvbiA9IG5ld0pzb247XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBjb21tYW5kSWQgPSAkc2NvcGUuaWQ7XG4gICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgdmFyIHVybCA9IHZhbGlkYXRlQ29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkKTtcbiAgICAgICAgICAvLyBsZXRzIHB1dCB0aGUgZW50aXR5IGluIHRoZSBsYXN0IGl0ZW0gaW4gdGhlIGxpc3RcbiAgICAgICAgICB2YXIgaW5wdXRMaXN0ID0gW10uY29uY2F0KCRzY29wZS5pbnB1dExpc3QpO1xuICAgICAgICAgIGlucHV0TGlzdFtpbnB1dExpc3QubGVuZ3RoIC0gMV0gPSAkc2NvcGUuZW50aXR5O1xuICAgICAgICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgICAgICAgbmFtZXNwYWNlOiAkc2NvcGUubmFtZXNwYWNlLFxuICAgICAgICAgICAgcHJvamVjdE5hbWU6ICRzY29wZS5wcm9qZWN0SWQsXG4gICAgICAgICAgICByZXNvdXJjZTogcmVzb3VyY2VQYXRoLFxuICAgICAgICAgICAgaW5wdXRMaXN0OiAkc2NvcGUuaW5wdXRMaXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICAgICAgLy9sb2cuaW5mbyhcIkFib3V0IHRvIHBvc3QgdG8gXCIgKyB1cmwgKyBcIiBwYXlsb2FkOiBcIiArIGFuZ3VsYXIudG9Kc29uKHJlcXVlc3QpKTtcbiAgICAgICAgICAkc2NvcGUudmFsaWRhdGluZyA9IHRydWU7XG4gICAgICAgICAgJGh0dHAucG9zdCh1cmwsIHJlcXVlc3QsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICB0aGlzLnZhbGlkYXRpb24gPSBkYXRhO1xuICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiZ290IHZhbGlkYXRpb24gXCIgKyBhbmd1bGFyLnRvSnNvbihkYXRhLCB0cnVlKSk7XG4gICAgICAgICAgICAgIHZhciB3aXphcmRSZXN1bHRzID0gZGF0YS53aXphcmRSZXN1bHRzO1xuICAgICAgICAgICAgICBpZiAod2l6YXJkUmVzdWx0cykge1xuICAgICAgICAgICAgICAgIHZhciBzdGVwSW5wdXRzID0gd2l6YXJkUmVzdWx0cy5zdGVwSW5wdXRzO1xuICAgICAgICAgICAgICAgIGlmIChzdGVwSW5wdXRzKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgc2NoZW1hID0gXy5sYXN0KHN0ZXBJbnB1dHMpO1xuICAgICAgICAgICAgICAgICAgdXBkYXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG5cbiAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICogTGV0cyB0aHJvdHRsZSB0aGUgdmFsaWRhdGlvbnMgc28gdGhhdCB3ZSBvbmx5IGZpcmUgYW5vdGhlciB2YWxpZGF0aW9uIGEgbGl0dGxlXG4gICAgICAgICAgICAgICAqIGFmdGVyIHdlJ3ZlIGdvdCBhIHJlcGx5IGFuZCBvbmx5IGlmIHRoZSBtb2RlbCBoYXMgY2hhbmdlZCBzaW5jZSB0aGVuXG4gICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZSgpO1xuICAgICAgICAgICAgICB9LCAyMDApO1xuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB1cGRhdGVEYXRhKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gdG9CYWNrZ3JvdW5kU3R5bGUoc3RhdHVzKSB7XG4gICAgICAgICAgaWYgKCFzdGF0dXMpIHtcbiAgICAgICAgICAgIHN0YXR1cyA9IFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzdGF0dXMuc3RhcnRzV2l0aChcInN1Y1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYmctc3VjY2Vzc1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJiZy13YXJuaW5nXCJcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgICAgJHNjb3BlLml0ZW0gPSBudWxsO1xuICAgICAgICAgIHZhciBjb21tYW5kSWQgPSAkc2NvcGUuaWQ7XG4gICAgICAgICAgaWYgKGNvbW1hbmRJZCkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgICB2YXIgdXJsID0gY29tbWFuZElucHV0QXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsICRzY29wZS5uYW1lc3BhY2UsICRzY29wZS5wcm9qZWN0SWQsIHJlc291cmNlUGF0aCk7XG4gICAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICAgICAgICAkaHR0cC5nZXQodXJsLCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZURhdGEgbG9hZGVkIHNjaGVtYVwiKTtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVNjaGVtYShkYXRhKTtcbiAgICAgICAgICAgICAgICAgIHNldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuaWQsICRzY29wZS5zY2hlbWEpO1xuICAgICAgICAgICAgICAgICAgb25TY2hlbWFMb2FkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvblNjaGVtYUxvYWQoKSB7XG4gICAgICAgICAgLy8gbGV0cyB1cGRhdGUgdGhlIHZhbHVlIGlmIGl0cyBibGFuayB3aXRoIHRoZSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgdmFyIHNjaGVtYSA9ICRzY29wZS5zY2hlbWE7XG4gICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSBzY2hlbWE7XG4gICAgICAgICAgdmFyIGVudGl0eSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYS5wcm9wZXJ0aWVzLCAocHJvcGVydHksIGtleSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0eS52YWx1ZTtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlICYmICFlbnRpdHlba2V5XSkge1xuICAgICAgICAgICAgICAgIGVudGl0eVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgQ29tbWFuZHNDb250cm9sbGVyID0gY29udHJvbGxlcihcIkNvbW1hbmRzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGxvY2F0aW9uXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiRm9yZ2VNb2RlbFwiLFxuICAgICgkc2NvcGUsICRkaWFsb2csICR3aW5kb3csICR0ZW1wbGF0ZUNhY2hlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwpID0+IHtcblxuICAgICAgJHNjb3BlLm1vZGVsID0gRm9yZ2VNb2RlbDtcbiAgICAgICRzY29wZS5yZXNvdXJjZVBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdIHx8ICRsb2NhdGlvbi5zZWFyY2goKVtcInBhdGhcIl0gfHwgXCJcIjtcbiAgICAgICRzY29wZS5yZXBvTmFtZSA9IFwiXCI7XG4gICAgICAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uID0gJHNjb3BlLnJlc291cmNlUGF0aCB8fCBcIlwiO1xuICAgICAgdmFyIHBhdGhTdGVwcyA9ICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24uc3BsaXQoXCIvXCIpO1xuICAgICAgaWYgKHBhdGhTdGVwcyAmJiBwYXRoU3RlcHMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5yZXBvTmFtZSA9IHBhdGhTdGVwc1twYXRoU3RlcHMubGVuZ3RoIC0gMV07XG4gICAgICB9XG4gICAgICBpZiAoISRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24uc3RhcnRzV2l0aChcIi9cIikgJiYgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24gPSBcIi9cIiArICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb247XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5hdmF0YXJfdXJsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXTtcbiAgICAgICRzY29wZS51c2VyID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl07XG5cbiAgICAgICRzY29wZS5jb21tYW5kcyA9IGdldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCk7XG4gICAgICAkc2NvcGUuZmV0Y2hlZCA9ICRzY29wZS5jb21tYW5kcy5sZW5ndGggIT09IDA7XG5cbiAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgIHJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkKCRzY29wZSwgJGxvY2F0aW9uKTtcblxuXG4gICAgICAkc2NvcGUudGFibGVDb25maWcgPSB7XG4gICAgICAgIGRhdGE6ICdjb21tYW5kcycsXG4gICAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlUm93Q2xpY2tTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICBtdWx0aVNlbGVjdDogdHJ1ZSxcbiAgICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgICBmaWx0ZXJUZXh0OiAkbG9jYXRpb24uc2VhcmNoKClbXCJxXCJdIHx8ICcnXG4gICAgICAgIH0sXG4gICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ25hbWUnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdOYW1lJyxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwiaWRUZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnRGVzY3JpcHRpb24nXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ2NhdGVnb3J5JyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnQ2F0ZWdvcnknXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiBjb21tYW5kTWF0Y2hlcyhjb21tYW5kKSB7XG4gICAgICAgIHZhciBmaWx0ZXJUZXh0ID0gJHNjb3BlLnRhYmxlQ29uZmlnLmZpbHRlck9wdGlvbnMuZmlsdGVyVGV4dDtcbiAgICAgICAgcmV0dXJuIGNvbW1hbmRNYXRjaGVzVGV4dChjb21tYW5kLCBmaWx0ZXJUZXh0KTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3RvciA9IHtcbiAgICAgICAgZmlsdGVyVGV4dDogXCJcIixcbiAgICAgICAgZm9sZGVyczogW10sXG4gICAgICAgIHNlbGVjdGVkQ29tbWFuZHM6IFtdLFxuICAgICAgICBleHBhbmRlZEZvbGRlcnM6IHt9LFxuXG4gICAgICAgIGlzT3BlbjogKGZvbGRlcikgPT4ge1xuICAgICAgICAgIHZhciBmaWx0ZXJUZXh0ID0gJHNjb3BlLnRhYmxlQ29uZmlnLmZpbHRlck9wdGlvbnMuZmlsdGVyVGV4dDtcbiAgICAgICAgICBpZiAoZmlsdGVyVGV4dCAhPT0gJycgfHwgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5leHBhbmRlZEZvbGRlcnNbZm9sZGVyLmlkXSkge1xuICAgICAgICAgICAgcmV0dXJuIFwib3BlbmVkXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBcImNsb3NlZFwiO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFyU2VsZWN0ZWQ6ICgpID0+IHtcbiAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmV4cGFuZGVkRm9sZGVycyA9IHt9O1xuICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlU2VsZWN0ZWQ6ICgpID0+IHtcbiAgICAgICAgICAvLyBsZXRzIHVwZGF0ZSB0aGUgc2VsZWN0ZWQgYXBwc1xuICAgICAgICAgIHZhciBzZWxlY3RlZENvbW1hbmRzID0gW107XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5tb2RlbC5hcHBGb2xkZXJzLCAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgICB2YXIgYXBwcyA9IGZvbGRlci5hcHBzLmZpbHRlcigoYXBwKSA9PiBhcHAuc2VsZWN0ZWQpO1xuICAgICAgICAgICAgaWYgKGFwcHMpIHtcbiAgICAgICAgICAgICAgc2VsZWN0ZWRDb21tYW5kcyA9IHNlbGVjdGVkQ29tbWFuZHMuY29uY2F0KGFwcHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3Iuc2VsZWN0ZWRDb21tYW5kcyA9IHNlbGVjdGVkQ29tbWFuZHMuc29ydEJ5KFwibmFtZVwiKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZWxlY3Q6IChjb21tYW5kLCBmbGFnKSA9PiB7XG4gICAgICAgICAgdmFyIGlkID0gY29tbWFuZC5uYW1lO1xuLypcbiAgICAgICAgICBhcHAuc2VsZWN0ZWQgPSBmbGFnO1xuKi9cbiAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLnVwZGF0ZVNlbGVjdGVkKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0U2VsZWN0ZWRDbGFzczogKGFwcCkgPT4ge1xuICAgICAgICAgIGlmIChhcHAuYWJzdHJhY3QpIHtcbiAgICAgICAgICAgIHJldHVybiBcImFic3RyYWN0XCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhcHAuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBcInNlbGVjdGVkXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNob3dDb21tYW5kOiAoY29tbWFuZCkgPT4ge1xuICAgICAgICAgIHJldHVybiBjb21tYW5kTWF0Y2hlcyhjb21tYW5kKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzaG93Rm9sZGVyOiAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgdmFyIGZpbHRlclRleHQgPSAkc2NvcGUudGFibGVDb25maWcuZmlsdGVyT3B0aW9ucy5maWx0ZXJUZXh0O1xuICAgICAgICAgIHJldHVybiAhZmlsdGVyVGV4dCB8fCBmb2xkZXIuY29tbWFuZHMuc29tZSgoYXBwKSA9PiBjb21tYW5kTWF0Y2hlcyhhcHApKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuXG4gICAgICB2YXIgdXJsID0gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRzXCIsICRzY29wZS5uYW1lc3BhY2UsICRzY29wZS5wcm9qZWN0SWQsICRzY29wZS5yZXNvdXJjZVBhdGgpO1xuICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgbG9nLmluZm8oXCJGZXRjaGluZyBjb21tYW5kcyBmcm9tOiBcIiArIHVybCk7XG4gICAgICAkaHR0cC5nZXQodXJsLCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoZGF0YSkgJiYgc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgICAgdmFyIGZvbGRlck1hcCA9IHt9O1xuICAgICAgICAgICAgdmFyIGZvbGRlcnMgPSBbXTtcbiAgICAgICAgICAgICRzY29wZS5jb21tYW5kcyA9IF8uc29ydEJ5KGRhdGEsIFwibmFtZVwiKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuY29tbWFuZHMsIChjb21tYW5kKSA9PiB7XG4gICAgICAgICAgICAgIHZhciBpZCA9IGNvbW1hbmQuaWQgfHwgY29tbWFuZC5uYW1lO1xuICAgICAgICAgICAgICBjb21tYW5kLiRsaW5rID0gY29tbWFuZExpbmsoJHNjb3BlLnByb2plY3RJZCwgaWQsIHJlc291cmNlUGF0aCk7XG5cbiAgICAgICAgICAgICAgdmFyIG5hbWUgPSBjb21tYW5kLm5hbWUgfHwgY29tbWFuZC5pZDtcbiAgICAgICAgICAgICAgdmFyIGZvbGRlck5hbWUgPSBjb21tYW5kLmNhdGVnb3J5O1xuICAgICAgICAgICAgICB2YXIgc2hvcnROYW1lID0gbmFtZTtcbiAgICAgICAgICAgICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChcIjpcIiwgMik7XG4gICAgICAgICAgICAgIGlmIChuYW1lcyAhPSBudWxsICYmIG5hbWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBmb2xkZXJOYW1lID0gbmFtZXNbMF07XG4gICAgICAgICAgICAgICAgc2hvcnROYW1lID0gbmFtZXNbMV0udHJpbSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChmb2xkZXJOYW1lID09PSBcIlByb2plY3QvQnVpbGRcIikge1xuICAgICAgICAgICAgICAgIGZvbGRlck5hbWUgPSBcIlByb2plY3RcIjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb21tYW5kLiRzaG9ydE5hbWUgPSBzaG9ydE5hbWU7XG4gICAgICAgICAgICAgIGNvbW1hbmQuJGZvbGRlck5hbWUgPSBmb2xkZXJOYW1lO1xuICAgICAgICAgICAgICB2YXIgZm9sZGVyID0gZm9sZGVyTWFwW2ZvbGRlck5hbWVdO1xuICAgICAgICAgICAgICBpZiAoIWZvbGRlcikge1xuICAgICAgICAgICAgICAgIGZvbGRlciA9IHtcbiAgICAgICAgICAgICAgICAgIG5hbWU6IGZvbGRlck5hbWUsXG4gICAgICAgICAgICAgICAgICBjb21tYW5kczogW11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGZvbGRlck1hcFtmb2xkZXJOYW1lXSA9IGZvbGRlcjtcbiAgICAgICAgICAgICAgICBmb2xkZXJzLnB1c2goZm9sZGVyKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBmb2xkZXIuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZm9sZGVycyA9IF8uc29ydEJ5KGZvbGRlcnMsIFwibmFtZVwiKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChmb2xkZXJzLCAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgICAgIGZvbGRlci5jb21tYW5kcyA9IF8uc29ydEJ5KGZvbGRlci5jb21tYW5kcywgXCIkc2hvcnROYW1lXCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmZvbGRlcnMgPSBmb2xkZXJzO1xuXG4gICAgICAgICAgICBzZXRNb2RlbENvbW1hbmRzKCRzY29wZS5tb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLmNvbW1hbmRzKTtcbiAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pLlxuICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICB9KTtcblxuICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBSZXBvQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJSZXBvQ29udHJvbGxlclwiLFxuICAgIFtcIiRzY29wZVwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsXG4gICAgICAoJHNjb3BlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXMsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwpID0+IHtcblxuICAgICAgICAkc2NvcGUubmFtZSA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl07XG5cbiAgICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuICAgICAgICByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cbiAgICAgICAgJHNjb3BlLiRvbignJHJvdXRlVXBkYXRlJywgKCRldmVudCkgPT4ge1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdXBkYXRlRGF0YSgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5uYW1lKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgJHNjb3BlLm5hbWUpO1xuICAgICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IGNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgICAgICAgICRodHRwLmdldCh1cmwsIGNvbmZpZykuXG4gICAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgIGVucmljaFJlcG8oZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHkgPSBkYXRhO1xuICAgICAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgUmVwb3NDb250cm9sbGVyID0gY29udHJvbGxlcihcIlJlcG9zQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGxvY2F0aW9uXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiS3ViZXJuZXRlc01vZGVsXCIsIFwiU2VydmljZVJlZ2lzdHJ5XCIsXG4gICAgKCRzY29wZSwgJGRpYWxvZywgJHdpbmRvdywgJHRlbXBsYXRlQ2FjaGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsIGxvY2FsU3RvcmFnZSwgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCwgS3ViZXJuZXRlc01vZGVsOiBLdWJlcm5ldGVzLkt1YmVybmV0ZXNNb2RlbFNlcnZpY2UsIFNlcnZpY2VSZWdpc3RyeSkgPT4ge1xuXG4gICAgICAkc2NvcGUubW9kZWwgPSBLdWJlcm5ldGVzTW9kZWw7XG4gICAgICAkc2NvcGUucmVzb3VyY2VQYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXTtcbiAgICAgICRzY29wZS5jb21tYW5kc0xpbmsgPSAocGF0aCkgPT4gY29tbWFuZHNMaW5rKHBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuXG4gICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG5cbiAgICAgICRzY29wZS4kb24oJ2t1YmVybmV0ZXNNb2RlbFVwZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHVwZGF0ZUxpbmtzKCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcblxuICAgICAgJHNjb3BlLnRhYmxlQ29uZmlnID0ge1xuICAgICAgICBkYXRhOiAncHJvamVjdHMnLFxuICAgICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgbXVsdGlTZWxlY3Q6IHRydWUsXG4gICAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICAgZmlsdGVyVGV4dDogJGxvY2F0aW9uLnNlYXJjaCgpW1wicVwiXSB8fCAnJ1xuICAgICAgICB9LFxuICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICduYW1lJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnUmVwb3NpdG9yeSBOYW1lJyxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwicmVwb1RlbXBsYXRlLmh0bWxcIilcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnYWN0aW9ucycsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0FjdGlvbnMnLFxuICAgICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoXCJyZXBvQWN0aW9uc1RlbXBsYXRlLmh0bWxcIilcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5sb2dpbiA9IHtcbiAgICAgICAgYXV0aEhlYWRlcjogbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl0gfHwgXCJcIixcbiAgICAgICAgcmVsb2dpbjogZmFsc2UsXG4gICAgICAgIGF2YXRhcl91cmw6IGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl0gfHwgXCJcIixcbiAgICAgICAgdXNlcjogbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl0gfHwgXCJcIixcbiAgICAgICAgcGFzc3dvcmQ6IFwiXCIsXG4gICAgICAgIGVtYWlsOiBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl0gfHwgXCJcIlxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRvTG9naW4gPSAoKSA9PiB7XG4gICAgICAgIHZhciBsb2dpbiA9ICRzY29wZS5sb2dpbjtcbiAgICAgICAgdmFyIHVzZXIgPSBsb2dpbi51c2VyO1xuICAgICAgICB2YXIgcGFzc3dvcmQgPSBsb2dpbi5wYXNzd29yZDtcbiAgICAgICAgaWYgKHVzZXIgJiYgcGFzc3dvcmQpIHtcbiAgICAgICAgICB2YXIgdXNlclB3ZCA9IHVzZXIgKyAnOicgKyBwYXNzd29yZDtcbiAgICAgICAgICBsb2dpbi5hdXRoSGVhZGVyID0gJ0Jhc2ljICcgKyAodXNlclB3ZC5lbmNvZGVCYXNlNjQoKSk7XG4gICAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUubG9nb3V0ID0gKCkgPT4ge1xuICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl07XG4gICAgICAgICRzY29wZS5sb2dpbi5hdXRoSGVhZGVyID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLmxvZ2luLmxvZ2dlZEluID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5sb2dpbi5mYWlsZWQgPSBmYWxzZTtcbiAgICAgICAgbG9nZ2VkSW5Ub0dvZ3MgPSBmYWxzZTtcbiAgICAgIH07XG5cblxuICAgICAgJHNjb3BlLm9wZW5Db21tYW5kcyA9ICgpID0+IHtcbiAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9IG51bGw7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICRzY29wZS50YWJsZUNvbmZpZy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgICBpZiAoXy5pc0FycmF5KHNlbGVjdGVkKSAmJiBzZWxlY3RlZC5sZW5ndGgpIHtcbiAgICAgICAgICByZXNvdXJjZVBhdGggPSBzZWxlY3RlZFswXS5wYXRoO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsaW5rID0gY29tbWFuZHNMaW5rKHJlc291cmNlUGF0aCwgJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICAgIGxvZy5pbmZvKFwibW92aW5nIHRvIGNvbW1hbmRzIGxpbms6IFwiICsgbGluayk7XG4gICAgICAgICRsb2NhdGlvbi5wYXRoKGxpbmspO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRlbGV0ZSA9IChwcm9qZWN0cykgPT4ge1xuICAgICAgICBVSS5tdWx0aUl0ZW1Db25maXJtQWN0aW9uRGlhbG9nKDxVSS5NdWx0aUl0ZW1Db25maXJtQWN0aW9uT3B0aW9ucz57XG4gICAgICAgICAgY29sbGVjdGlvbjogcHJvamVjdHMsXG4gICAgICAgICAgaW5kZXg6ICdwYXRoJyxcbiAgICAgICAgICBvbkNsb3NlOiAocmVzdWx0OmJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgZG9EZWxldGUocHJvamVjdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdGl0bGU6ICdEZWxldGUgcHJvamVjdHM/JyxcbiAgICAgICAgICBhY3Rpb246ICdUaGUgZm9sbG93aW5nIHByb2plY3RzIHdpbGwgYmUgcmVtb3ZlZCAodGhvdWdoIHRoZSBmaWxlcyB3aWxsIHJlbWFpbiBvbiB5b3VyIGZpbGUgc3lzdGVtKTonLFxuICAgICAgICAgIG9rVGV4dDogJ0RlbGV0ZScsXG4gICAgICAgICAgb2tDbGFzczogJ2J0bi1kYW5nZXInLFxuICAgICAgICAgIGN1c3RvbTogXCJUaGlzIG9wZXJhdGlvbiBpcyBwZXJtYW5lbnQgb25jZSBjb21wbGV0ZWQhXCIsXG4gICAgICAgICAgY3VzdG9tQ2xhc3M6IFwiYWxlcnQgYWxlcnQtd2FybmluZ1wiXG4gICAgICAgIH0pLm9wZW4oKTtcbiAgICAgIH07XG5cbiAgICAgIHVwZGF0ZUxpbmtzKCk7XG5cbiAgICAgIGZ1bmN0aW9uIGRvRGVsZXRlKHByb2plY3RzKSB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChwcm9qZWN0cywgKHByb2plY3QpID0+IHtcbiAgICAgICAgICBsb2cuaW5mbyhcIkRlbGV0aW5nIFwiICsgYW5ndWxhci50b0pzb24oJHNjb3BlLnByb2plY3RzKSk7XG4gICAgICAgICAgdmFyIHBhdGggPSBwcm9qZWN0LnBhdGg7XG4gICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSByZXBvQXBpVXJsKEZvcmdlQXBpVVJMLCBwYXRoKTtcbiAgICAgICAgICAgICRodHRwLmRlbGV0ZSh1cmwpLlxuICAgICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBcIkZhaWxlZCB0byBQT1NUIHRvIFwiICsgdXJsICsgXCIgZ290IHN0YXR1czogXCIgKyBzdGF0dXM7XG4gICAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oJ2Vycm9yJywgbWVzc2FnZSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZUxpbmtzKCkge1xuICAgICAgICB2YXIgJGdvZ3NMaW5rID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VSZWFkeUxpbmsoZ29nc1NlcnZpY2VOYW1lKTtcbiAgICAgICAgaWYgKCRnb2dzTGluaykge1xuICAgICAgICAgICRzY29wZS5zaWduVXBVcmwgPSBVcmxIZWxwZXJzLmpvaW4oJGdvZ3NMaW5rLCBcInVzZXIvc2lnbl91cFwiKTtcbiAgICAgICAgICAkc2NvcGUuZm9yZ290UGFzc3dvcmRVcmwgPSBVcmxIZWxwZXJzLmpvaW4oJGdvZ3NMaW5rLCBcInVzZXIvZm9yZ2V0X3Bhc3N3b3JkXCIpO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS4kZ29nc0xpbmsgPSAkZ29nc0xpbms7XG4gICAgICAgICRzY29wZS4kZm9yZ2VMaW5rID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VSZWFkeUxpbmsoS3ViZXJuZXRlcy5mYWJyaWM4Rm9yZ2VTZXJ2aWNlTmFtZSk7XG5cbiAgICAgICAgJHNjb3BlLiRoYXNDRFBpcGVsaW5lVGVtcGxhdGUgPSBfLmFueSgkc2NvcGUubW9kZWwudGVtcGxhdGVzLCAodCkgPT4gXCJjZC1waXBlbGluZVwiID09PSBLdWJlcm5ldGVzLmdldE5hbWUodCkpO1xuXG4gICAgICAgIHZhciBleHBlY3RlZFJDUyA9IFtLdWJlcm5ldGVzLmdvZ3NTZXJ2aWNlTmFtZSwgS3ViZXJuZXRlcy5mYWJyaWM4Rm9yZ2VTZXJ2aWNlTmFtZSwgS3ViZXJuZXRlcy5qZW5raW5zU2VydmljZU5hbWVdO1xuICAgICAgICB2YXIgcmVxdWlyZWRSQ3MgPSB7fTtcbiAgICAgICAgdmFyIG5zID0gS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgICB2YXIgcnVubmluZ0NEUGlwZWxpbmUgPSB0cnVlO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goZXhwZWN0ZWRSQ1MsIChyY05hbWUpID0+IHtcbiAgICAgICAgICB2YXIgcmMgPSAkc2NvcGUubW9kZWwuZ2V0UmVwbGljYXRpb25Db250cm9sbGVyKG5zLCByY05hbWUpO1xuICAgICAgICAgIGlmIChyYykge1xuICAgICAgICAgICAgcmVxdWlyZWRSQ3NbcmNOYW1lXSA9IHJjO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBydW5uaW5nQ0RQaXBlbGluZSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgICRzY29wZS4kcmVxdWlyZWRSQ3MgPSByZXF1aXJlZFJDcztcbiAgICAgICAgJHNjb3BlLiRydW5uaW5nQ0RQaXBlbGluZSA9IHJ1bm5pbmdDRFBpcGVsaW5lO1xuICAgICAgICB2YXIgdXJsID0gXCJcIjtcbiAgICAgICAgJGxvY2F0aW9uID0gS3ViZXJuZXRlcy5pbmplY3QoXCIkbG9jYXRpb25cIik7XG4gICAgICAgIGlmICgkbG9jYXRpb24pIHtcbiAgICAgICAgICB1cmwgPSAkbG9jYXRpb24udXJsKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICB1cmwgPSB3aW5kb3cubG9jYXRpb24udG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIHNob3VsZCB3ZSBzdXBwb3J0IGFueSBvdGhlciB0ZW1wbGF0ZSBuYW1lc3BhY2VzP1xuICAgICAgICB2YXIgdGVtcGxhdGVOYW1lc3BhY2UgPSBcImRlZmF1bHRcIjtcbiAgICAgICAgJHNjb3BlLiRydW5DRFBpcGVsaW5lTGluayA9IFwiL2t1YmVybmV0ZXMvbmFtZXNwYWNlL1wiICsgdGVtcGxhdGVOYW1lc3BhY2UgKyBcIi90ZW1wbGF0ZXMvXCIgKyBucyArIFwiP3E9Y2QtcGlwZWxpbmUmcmV0dXJuVG89XCIgKyBlbmNvZGVVUklDb21wb25lbnQodXJsKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gdXBkYXRlRGF0YSgpIHtcbiAgICAgICAgdmFyIGF1dGhIZWFkZXIgPSAkc2NvcGUubG9naW4uYXV0aEhlYWRlcjtcbiAgICAgICAgdmFyIGVtYWlsID0gJHNjb3BlLmxvZ2luLmVtYWlsIHx8IFwiXCI7XG4gICAgICAgIGlmIChhdXRoSGVhZGVyKSB7XG4gICAgICAgICAgdmFyIHVybCA9IHJlcG9zQXBpVXJsKEZvcmdlQXBpVVJMKTtcbiAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCwgYXV0aEhlYWRlciwgZW1haWwpO1xuICAgICAgICAgIHZhciBjb25maWcgPSB7XG4vKlxuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICBHb2dzQXV0aG9yaXphdGlvbjogYXV0aEhlYWRlcixcbiAgICAgICAgICAgICAgR29nc0VtYWlsOiBlbWFpbFxuICAgICAgICAgICAgfVxuKi9cbiAgICAgICAgICB9O1xuICAgICAgICAgICRodHRwLmdldCh1cmwsIGNvbmZpZykuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUubG9naW4uZmFpbGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dpbi5sb2dnZWRJbiA9IHRydWU7XG4gICAgICAgICAgICAgIGxvZ2dlZEluVG9Hb2dzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdmFyIGF2YXRhcl91cmwgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICBpZiAoIWRhdGEgfHwgIWFuZ3VsYXIuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgZGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBsZXRzIHN0b3JlIGEgc3VjY2Vzc2Z1bCBsb2dpbiBzbyB0aGF0IHdlIGhpZGUgdGhlIGxvZ2luIHBhZ2VcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXSA9IGF1dGhIZWFkZXI7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdID0gZW1haWw7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl0gPSAkc2NvcGUubG9naW4udXNlciB8fCBcIlwiO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnByb2plY3RzID0gXy5zb3J0QnkoZGF0YSwgXCJuYW1lXCIpO1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUucHJvamVjdHMsIChyZXBvKSA9PiB7XG4gICAgICAgICAgICAgICAgICBlbnJpY2hSZXBvKHJlcG8pO1xuICAgICAgICAgICAgICAgICAgaWYgKCFhdmF0YXJfdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIGF2YXRhcl91cmwgPSBDb3JlLnBhdGhHZXQocmVwbywgW1wib3duZXJcIiwgXCJhdmF0YXJfdXJsXCJdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF2YXRhcl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9naW4uYXZhdGFyX3VybCA9IGF2YXRhcl91cmw7XG4gICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXSA9IGF2YXRhcl91cmw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dvdXQoKTtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmZhaWxlZCA9IHRydWU7XG4gICAgICAgICAgICAgIGlmIChzdGF0dXMgIT09IDQwMykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHVwZGF0ZURhdGEoKTtcblxuICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cblxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IHZhciBsb2c6TG9nZ2luZy5Mb2dnZXIgPSBMb2dnZXIuZ2V0KFwiV2lraVwiKTtcblxuICBleHBvcnQgdmFyIGNhbWVsTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9jYW1lbC5hcGFjaGUub3JnL3NjaGVtYS9zcHJpbmdcIiwgXCJodHRwOi8vY2FtZWwuYXBhY2hlLm9yZy9zY2hlbWEvYmx1ZXByaW50XCJdO1xuICBleHBvcnQgdmFyIHNwcmluZ05hbWVzcGFjZXMgPSBbXCJodHRwOi8vd3d3LnNwcmluZ2ZyYW1ld29yay5vcmcvc2NoZW1hL2JlYW5zXCJdO1xuICBleHBvcnQgdmFyIGRyb29sc05hbWVzcGFjZXMgPSBbXCJodHRwOi8vZHJvb2xzLm9yZy9zY2hlbWEvZHJvb2xzLXNwcmluZ1wiXTtcbiAgZXhwb3J0IHZhciBkb3plck5hbWVzcGFjZXMgPSBbXCJodHRwOi8vZG96ZXIuc291cmNlZm9yZ2UubmV0XCJdO1xuICBleHBvcnQgdmFyIGFjdGl2ZW1xTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9hY3RpdmVtcS5hcGFjaGUub3JnL3NjaGVtYS9jb3JlXCJdO1xuXG4gIGV4cG9ydCB2YXIgdXNlQ2FtZWxDYW52YXNCeURlZmF1bHQgPSBmYWxzZTtcblxuICBleHBvcnQgdmFyIGV4Y2x1ZGVBZGp1c3RtZW50UHJlZml4ZXMgPSBbXCJodHRwOi8vXCIsIFwiaHR0cHM6Ly9cIiwgXCIjXCJdO1xuXG4gIGV4cG9ydCBlbnVtIFZpZXdNb2RlIHsgTGlzdCwgSWNvbiB9O1xuXG4gIC8qKlxuICAgKiBUaGUgY3VzdG9tIHZpZXdzIHdpdGhpbiB0aGUgd2lraSBuYW1lc3BhY2U7IGVpdGhlciBcIi93aWtpLyRmb29cIiBvciBcIi93aWtpL2JyYW5jaC8kYnJhbmNoLyRmb29cIlxuICAgKi9cbiAgZXhwb3J0IHZhciBjdXN0b21XaWtpVmlld1BhZ2VzID0gW1wiL2Zvcm1UYWJsZVwiLCBcIi9jYW1lbC9kaWFncmFtXCIsIFwiL2NhbWVsL2NhbnZhc1wiLCBcIi9jYW1lbC9wcm9wZXJ0aWVzXCIsIFwiL2RvemVyL21hcHBpbmdzXCJdO1xuXG4gIC8qKlxuICAgKiBXaGljaCBleHRlbnNpb25zIGRvIHdlIHdpc2ggdG8gaGlkZSBpbiB0aGUgd2lraSBmaWxlIGxpc3RpbmdcbiAgICogQHByb3BlcnR5IGhpZGVFeHRlbnNpb25zXG4gICAqIEBmb3IgV2lraVxuICAgKiBAdHlwZSBBcnJheVxuICAgKi9cbiAgZXhwb3J0IHZhciBoaWRlRXh0ZW5zaW9ucyA9IFtcIi5wcm9maWxlXCJdO1xuXG4gIHZhciBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuID0gL15bYS16QS1aMC05Ll8tXSokLztcbiAgdmFyIGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkID0gXCJOYW1lIG11c3QgYmU6IGxldHRlcnMsIG51bWJlcnMsIGFuZCAuIF8gb3IgLSBjaGFyYWN0ZXJzXCI7XG5cbiAgdmFyIGRlZmF1bHRGaWxlTmFtZUV4dGVuc2lvblBhdHRlcm4gPSBcIlwiO1xuXG4gIHZhciBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuID0gL15bYS16MC05Ll8tXSokLztcbiAgdmFyIGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm5JbnZhbGlkID0gXCJOYW1lIG11c3QgYmU6IGxvd2VyLWNhc2UgbGV0dGVycywgbnVtYmVycywgYW5kIC4gXyBvciAtIGNoYXJhY3RlcnNcIjtcblxuICBleHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlT3B0aW9ucyB7XG4gICAgd29ya3NwYWNlOiBhbnk7XG4gICAgZm9ybTogYW55O1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBicmFuY2g6IHN0cmluZztcbiAgICBwYXJlbnRJZDogc3RyaW5nO1xuICAgIHN1Y2Nlc3M6IChmaWxlQ29udGVudHM/OnN0cmluZykgPT4gdm9pZDtcbiAgICBlcnJvcjogKGVycm9yOmFueSkgPT4gdm9pZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgd2l6YXJkIHRyZWUgZm9yIGNyZWF0aW5nIG5ldyBjb250ZW50IGluIHRoZSB3aWtpXG4gICAqIEBwcm9wZXJ0eSBkb2N1bWVudFRlbXBsYXRlc1xuICAgKiBAZm9yIFdpa2lcbiAgICogQHR5cGUgQXJyYXlcbiAgICovXG4gIGV4cG9ydCB2YXIgZG9jdW1lbnRUZW1wbGF0ZXMgPSBbXG4gICAge1xuICAgICAgbGFiZWw6IFwiRm9sZGVyXCIsXG4gICAgICB0b29sdGlwOiBcIkNyZWF0ZSBhIG5ldyBmb2xkZXIgdG8gY29udGFpbiBkb2N1bWVudHNcIixcbiAgICAgIGZvbGRlcjogdHJ1ZSxcbiAgICAgIGljb246IFwiL2ltZy9pY29ucy93aWtpL2ZvbGRlci5naWZcIixcbiAgICAgIGV4ZW1wbGFyOiBcIm15Zm9sZGVyXCIsXG4gICAgICByZWdleDogZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm5JbnZhbGlkXG4gICAgfSxcbiAgICAvKlxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkFwcFwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGVzIGEgbmV3IEFwcCBmb2xkZXIgdXNlZCB0byBjb25maWd1cmUgYW5kIHJ1biBjb250YWluZXJzXCIsXG4gICAgICBhZGRDbGFzczogXCJmYSBmYS1jb2cgZ3JlZW5cIixcbiAgICAgIGV4ZW1wbGFyOiAnbXlhcHAnLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogJycsXG4gICAgICBnZW5lcmF0ZWQ6IHtcbiAgICAgICAgbWJlYW46IFsnaW8uZmFicmljOCcsIHsgdHlwZTogJ0t1YmVybmV0ZXNUZW1wbGF0ZU1hbmFnZXInIH1dLFxuICAgICAgICBpbml0OiAod29ya3NwYWNlLCAkc2NvcGUpID0+IHtcblxuICAgICAgICB9LFxuICAgICAgICBnZW5lcmF0ZTogKG9wdGlvbnM6R2VuZXJhdGVPcHRpb25zKSA9PiB7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiR290IG9wdGlvbnM6IFwiLCBvcHRpb25zKTtcbiAgICAgICAgICBvcHRpb25zLmZvcm0ubmFtZSA9IG9wdGlvbnMubmFtZTtcbiAgICAgICAgICBvcHRpb25zLmZvcm0ucGF0aCA9IG9wdGlvbnMucGFyZW50SWQ7XG4gICAgICAgICAgb3B0aW9ucy5mb3JtLmJyYW5jaCA9IG9wdGlvbnMuYnJhbmNoO1xuICAgICAgICAgIHZhciBqc29uID0gYW5ndWxhci50b0pzb24ob3B0aW9ucy5mb3JtKTtcbiAgICAgICAgICB2YXIgam9sb2tpYSA9IDxKb2xva2lhLklKb2xva2lhPiBIYXd0aW9Db3JlLmluamVjdG9yLmdldChcImpvbG9raWFcIik7XG4gICAgICAgICAgam9sb2tpYS5yZXF1ZXN0KHtcbiAgICAgICAgICAgIHR5cGU6ICdleGVjJyxcbiAgICAgICAgICAgIG1iZWFuOiAnaW8uZmFicmljODp0eXBlPUt1YmVybmV0ZXNUZW1wbGF0ZU1hbmFnZXInLFxuICAgICAgICAgICAgb3BlcmF0aW9uOiAnY3JlYXRlQXBwQnlKc29uJyxcbiAgICAgICAgICAgIGFyZ3VtZW50czogW2pzb25dXG4gICAgICAgICAgfSwgQ29yZS5vblN1Y2Nlc3MoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJHZW5lcmF0ZWQgYXBwLCByZXNwb25zZTogXCIsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIG9wdGlvbnMuc3VjY2Vzcyh1bmRlZmluZWQpOyBcbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICBlcnJvcjogKHJlc3BvbnNlKSA9PiB7IG9wdGlvbnMuZXJyb3IocmVzcG9uc2UuZXJyb3IpOyB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9LFxuICAgICAgICBmb3JtOiAod29ya3NwYWNlLCAkc2NvcGUpID0+IHtcbiAgICAgICAgICAvLyBUT0RPIGRvY2tlciByZWdpc3RyeSBjb21wbGV0aW9uXG4gICAgICAgICAgaWYgKCEkc2NvcGUuZG9Eb2NrZXJSZWdpc3RyeUNvbXBsZXRpb24pIHtcbiAgICAgICAgICAgICRzY29wZS5mZXRjaERvY2tlclJlcG9zaXRvcmllcyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIERvY2tlclJlZ2lzdHJ5LmNvbXBsZXRlRG9ja2VyUmVnaXN0cnkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1bW1hcnlNYXJrZG93bjogJ0FkZCBhcHAgc3VtbWFyeSBoZXJlJyxcbiAgICAgICAgICAgIHJlcGxpY2FDb3VudDogMVxuICAgICAgICAgIH07XG4gICAgICAgIH0sXG4gICAgICAgIHNjaGVtYToge1xuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXBwIHNldHRpbmdzJyxcbiAgICAgICAgICB0eXBlOiAnamF2YS5sYW5nLlN0cmluZycsXG4gICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgJ2RvY2tlckltYWdlJzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnRG9ja2VyIEltYWdlJyxcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnamF2YS5sYW5nLlN0cmluZycsXG4gICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcbiAgICAgICAgICAgICAgICAncmVxdWlyZWQnOiAnJywgXG4gICAgICAgICAgICAgICAgJ2NsYXNzJzogJ2lucHV0LXhsYXJnZScsXG4gICAgICAgICAgICAgICAgJ3R5cGVhaGVhZCc6ICdyZXBvIGZvciByZXBvIGluIGZldGNoRG9ja2VyUmVwb3NpdG9yaWVzKCkgfCBmaWx0ZXI6JHZpZXdWYWx1ZScsXG4gICAgICAgICAgICAgICAgJ3R5cGVhaGVhZC13YWl0LW1zJzogJzIwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdzdW1tYXJ5TWFya2Rvd24nOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdTaG9ydCBEZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICd0eXBlJzogJ2phdmEubGFuZy5TdHJpbmcnLFxuICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgJ2NsYXNzJzogJ2lucHV0LXhsYXJnZScgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdyZXBsaWNhQ291bnQnOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdSZXBsaWNhIENvdW50JyxcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnamF2YS5sYW5nLkludGVnZXInLFxuICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHtcbiAgICAgICAgICAgICAgICBtaW46ICcwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2xhYmVscyc6IHtcbiAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogJ0xhYmVscycsXG4gICAgICAgICAgICAgICd0eXBlJzogJ21hcCcsXG4gICAgICAgICAgICAgICdpdGVtcyc6IHtcbiAgICAgICAgICAgICAgICAndHlwZSc6ICdzdHJpbmcnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkZhYnJpYzggUHJvZmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGUgYSBuZXcgZW1wdHkgZmFicmljIHByb2ZpbGUuIFVzaW5nIGEgaHlwaGVuICgnLScpIHdpbGwgY3JlYXRlIGEgZm9sZGVyIGhlaXJhcmNoeSwgZm9yIGV4YW1wbGUgJ215LWF3ZXNvbWUtcHJvZmlsZScgd2lsbCBiZSBhdmFpbGFibGUgdmlhIHRoZSBwYXRoICdteS9hd2Vzb21lL3Byb2ZpbGUnLlwiLFxuICAgICAgcHJvZmlsZTogdHJ1ZSxcbiAgICAgIGFkZENsYXNzOiBcImZhIGZhLWJvb2sgZ3JlZW5cIixcbiAgICAgIGV4ZW1wbGFyOiBcInVzZXItcHJvZmlsZVwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGZhYnJpY09ubHk6IHRydWVcbiAgICB9LFxuICAgICovXG4gICAge1xuICAgICAgbGFiZWw6IFwiUHJvcGVydGllcyBGaWxlXCIsXG4gICAgICB0b29sdGlwOiBcIkEgcHJvcGVydGllcyBmaWxlIHR5cGljYWxseSB1c2VkIHRvIGNvbmZpZ3VyZSBKYXZhIGNsYXNzZXNcIixcbiAgICAgIGV4ZW1wbGFyOiBcInByb3BlcnRpZXMtZmlsZS5wcm9wZXJ0aWVzXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5wcm9wZXJ0aWVzXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkpTT04gRmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJBIGZpbGUgY29udGFpbmluZyBKU09OIGRhdGFcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50Lmpzb25cIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLmpzb25cIlxuICAgIH0sXG4gICAgLypcbiAgICB7XG4gICAgICBsYWJlbDogXCJLZXkgU3RvcmUgRmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGVzIGEga2V5c3RvcmUgKGRhdGFiYXNlKSBvZiBjcnlwdG9ncmFwaGljIGtleXMsIFguNTA5IGNlcnRpZmljYXRlIGNoYWlucywgYW5kIHRydXN0ZWQgY2VydGlmaWNhdGVzLlwiLFxuICAgICAgZXhlbXBsYXI6ICdrZXlzdG9yZS5qa3MnLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIuamtzXCIsXG4gICAgICBnZW5lcmF0ZWQ6IHtcbiAgICAgICAgbWJlYW46IFsnaGF3dGlvJywgeyB0eXBlOiAnS2V5c3RvcmVTZXJ2aWNlJyB9XSxcbiAgICAgICAgaW5pdDogZnVuY3Rpb24od29ya3NwYWNlLCAkc2NvcGUpIHtcbiAgICAgICAgICB2YXIgbWJlYW4gPSAnaGF3dGlvOnR5cGU9S2V5c3RvcmVTZXJ2aWNlJztcbiAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB3b3Jrc3BhY2Uuam9sb2tpYS5yZXF1ZXN0KCB7dHlwZTogXCJyZWFkXCIsIG1iZWFuOiBtYmVhbiwgYXR0cmlidXRlOiBcIlNlY3VyaXR5UHJvdmlkZXJJbmZvXCIgfSwge1xuICAgICAgICAgICAgc3VjY2VzczogKHJlc3BvbnNlKT0+e1xuICAgICAgICAgICAgICAkc2NvcGUuc2VjdXJpdHlQcm92aWRlckluZm8gPSByZXNwb25zZS52YWx1ZTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb3VsZCBub3QgZmluZCB0aGUgc3VwcG9ydGVkIHNlY3VyaXR5IGFsZ29yaXRobXM6ICcsIHJlc3BvbnNlLmVycm9yKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2VuZXJhdGU6IGZ1bmN0aW9uKG9wdGlvbnM6R2VuZXJhdGVPcHRpb25zKSB7XG4gICAgICAgICAgdmFyIGVuY29kZWRGb3JtID0gSlNPTi5zdHJpbmdpZnkob3B0aW9ucy5mb3JtKVxuICAgICAgICAgIHZhciBtYmVhbiA9ICdoYXd0aW86dHlwZT1LZXlzdG9yZVNlcnZpY2UnO1xuICAgICAgICAgIHZhciByZXNwb25zZSA9IG9wdGlvbnMud29ya3NwYWNlLmpvbG9raWEucmVxdWVzdCgge1xuICAgICAgICAgICAgICB0eXBlOiAnZXhlYycsIFxuICAgICAgICAgICAgICBtYmVhbjogbWJlYW4sXG4gICAgICAgICAgICAgIG9wZXJhdGlvbjogJ2NyZWF0ZUtleVN0b3JlVmlhSlNPTihqYXZhLmxhbmcuU3RyaW5nKScsXG4gICAgICAgICAgICAgIGFyZ3VtZW50czogW2VuY29kZWRGb3JtXVxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICBtZXRob2Q6J1BPU1QnLFxuICAgICAgICAgICAgICBzdWNjZXNzOmZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKHJlc3BvbnNlLnZhbHVlKVxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBlcnJvcjpmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5lcnJvcihyZXNwb25zZS5lcnJvcilcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZvcm06IGZ1bmN0aW9uKHdvcmtzcGFjZSwgJHNjb3BlKXsgXG4gICAgICAgICAgcmV0dXJuIHsgXG4gICAgICAgICAgICBzdG9yZVR5cGU6ICRzY29wZS5zZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlTdG9yZVR5cGVzWzBdLFxuICAgICAgICAgICAgY3JlYXRlUHJpdmF0ZUtleTogZmFsc2UsXG4gICAgICAgICAgICBrZXlMZW5ndGg6IDQwOTYsXG4gICAgICAgICAgICBrZXlBbGdvcml0aG06ICRzY29wZS5zZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlBbGdvcml0aG1zWzBdLFxuICAgICAgICAgICAga2V5VmFsaWRpdHk6IDM2NVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2NoZW1hOiB7XG4gICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJLZXlzdG9yZSBTZXR0aW5nc1wiLFxuICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgIFwicHJvcGVydGllc1wiOiB7IFxuICAgICAgICAgICAgIFwic3RvcmVQYXNzd29yZFwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiS2V5c3RvcmUgcGFzc3dvcmQuXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJwYXNzd29yZFwiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7IFwicmVxdWlyZWRcIjogIFwiXCIsICBcIm5nLW1pbmxlbmd0aFwiOjYgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJzdG9yZVR5cGVcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB0eXBlIG9mIHN0b3JlIHRvIGNyZWF0ZVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWVsZW1lbnQnOiBcInNlbGVjdFwiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7IFwibmctb3B0aW9uc1wiOiAgXCJ2IGZvciB2IGluIHNlY3VyaXR5UHJvdmlkZXJJbmZvLnN1cHBvcnRlZEtleVN0b3JlVHlwZXNcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImNyZWF0ZVByaXZhdGVLZXlcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNob3VsZCB3ZSBnZW5lcmF0ZSBhIHNlbGYtc2lnbmVkIHByaXZhdGUga2V5P1wiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleUNvbW1vbk5hbWVcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb21tb24gbmFtZSBvZiB0aGUga2V5LCB0eXBpY2FsbHkgc2V0IHRvIHRoZSBob3N0bmFtZSBvZiB0aGUgc2VydmVyXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5TGVuZ3RoXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbGVuZ3RoIG9mIHRoZSBjcnlwdG9ncmFwaGljIGtleVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiTG9uZ1wiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleUFsZ29yaXRobVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGtleSBhbGdvcml0aG1cIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImphdmEubGFuZy5TdHJpbmdcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1lbGVtZW50JzogXCJzZWxlY3RcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcIm5nLW9wdGlvbnNcIjogIFwidiBmb3IgdiBpbiBzZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlBbGdvcml0aG1zXCIgfSxcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlWYWxpZGl0eVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG51bWJlciBvZiBkYXlzIHRoZSBrZXkgd2lsbCBiZSB2YWxpZCBmb3JcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIkxvbmdcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlQYXNzd29yZFwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiUGFzc3dvcmQgdG8gdGhlIHByaXZhdGUga2V5XCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJwYXNzd29yZFwiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfVxuICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgICovXG4gICAge1xuICAgICAgbGFiZWw6IFwiTWFya2Rvd24gRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBiYXNpYyBtYXJrdXAgZG9jdW1lbnQgdXNpbmcgdGhlIE1hcmtkb3duIHdpa2kgbWFya3VwLCBwYXJ0aWN1bGFybHkgdXNlZnVsIGZvciBSZWFkTWUgZmlsZXMgaW4gZGlyZWN0b3JpZXNcIixcbiAgICAgIGV4ZW1wbGFyOiBcIlJlYWRNZS5tZFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIubWRcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiVGV4dCBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJBIHBsYWluIHRleHQgZmlsZVwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG9jdW1lbnQudGV4dFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIudHh0XCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkhUTUwgRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBIVE1MIGRvY3VtZW50IHlvdSBjYW4gZWRpdCBkaXJlY3RseSB1c2luZyB0aGUgSFRNTCBtYXJrdXBcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50Lmh0bWxcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLmh0bWxcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiWE1MIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkFuIGVtcHR5IFhNTCBkb2N1bWVudFwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG9jdW1lbnQueG1sXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiSW50ZWdyYXRpb24gRmxvd3NcIixcbiAgICAgIHRvb2x0aXA6IFwiQ2FtZWwgcm91dGVzIGZvciBkZWZpbmluZyB5b3VyIGludGVncmF0aW9uIGZsb3dzXCIsXG4gICAgICBjaGlsZHJlbjogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IFwiQ2FtZWwgWE1MIGRvY3VtZW50XCIsXG4gICAgICAgICAgdG9vbHRpcDogXCJBIHZhbmlsbGEgQ2FtZWwgWE1MIGRvY3VtZW50IGZvciBpbnRlZ3JhdGlvbiBmbG93c1wiLFxuICAgICAgICAgIGljb246IFwiL2ltZy9pY29ucy9jYW1lbC5zdmdcIixcbiAgICAgICAgICBleGVtcGxhcjogXCJjYW1lbC54bWxcIixcbiAgICAgICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogXCJDYW1lbCBPU0dpIEJsdWVwcmludCBYTUwgZG9jdW1lbnRcIixcbiAgICAgICAgICB0b29sdGlwOiBcIkEgdmFuaWxsYSBDYW1lbCBYTUwgZG9jdW1lbnQgZm9yIGludGVncmF0aW9uIGZsb3dzIHdoZW4gdXNpbmcgT1NHaSBCbHVlcHJpbnRcIixcbiAgICAgICAgICBpY29uOiBcIi9pbWcvaWNvbnMvY2FtZWwuc3ZnXCIsXG4gICAgICAgICAgZXhlbXBsYXI6IFwiY2FtZWwtYmx1ZXByaW50LnhtbFwiLFxuICAgICAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiBcIkNhbWVsIFNwcmluZyBYTUwgZG9jdW1lbnRcIixcbiAgICAgICAgICB0b29sdGlwOiBcIkEgdmFuaWxsYSBDYW1lbCBYTUwgZG9jdW1lbnQgZm9yIGludGVncmF0aW9uIGZsb3dzIHdoZW4gdXNpbmcgdGhlIFNwcmluZyBmcmFtZXdvcmtcIixcbiAgICAgICAgICBpY29uOiBcIi9pbWcvaWNvbnMvY2FtZWwuc3ZnXCIsXG4gICAgICAgICAgZXhlbXBsYXI6IFwiY2FtZWwtc3ByaW5nLnhtbFwiLFxuICAgICAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiRGF0YSBNYXBwaW5nIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkRvemVyIGJhc2VkIGNvbmZpZ3VyYXRpb24gb2YgbWFwcGluZyBkb2N1bWVudHNcIixcbiAgICAgIGljb246IFwiL2ltZy9pY29ucy9kb3plci9kb3plci5naWZcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvemVyLW1hcHBpbmcueG1sXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgIH1cbiAgXTtcblxuICAvLyBUT0RPIFJFTU9WRVxuICBleHBvcnQgZnVuY3Rpb24gaXNGTUNDb250YWluZXIod29ya3NwYWNlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gVE9ETyBSRU1PVkVcbiAgZXhwb3J0IGZ1bmN0aW9uIGlzV2lraUVuYWJsZWQod29ya3NwYWNlLCBqb2xva2lhLCBsb2NhbFN0b3JhZ2UpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbi8qXG4gICAgcmV0dXJuIEdpdC5jcmVhdGVHaXRSZXBvc2l0b3J5KHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKSAhPT0gbnVsbDtcbiovXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbikge1xuICAgIHZhciBocmVmID0gQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIiNcIik7XG4gICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gbmF2aWdhdGUgdG86IFwiICsgaHJlZik7XG4gICAgICAkbG9jYXRpb24udXJsKGhyZWYpO1xuICAgIH0sIDEwMCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbGwgdGhlIGxpbmtzIGZvciB0aGUgZ2l2ZW4gYnJhbmNoIGZvciB0aGUgY3VzdG9tIHZpZXdzLCBzdGFydGluZyB3aXRoIFwiL1wiXG4gICAqIEBwYXJhbSAkc2NvcGVcbiAgICogQHJldHVybnMge3N0cmluZ1tdfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGN1c3RvbVZpZXdMaW5rcygkc2NvcGUpIHtcbiAgICB2YXIgcHJlZml4ID0gQ29yZS50cmltTGVhZGluZyhXaWtpLnN0YXJ0TGluaygkc2NvcGUpLCBcIiNcIik7XG4gICAgcmV0dXJuIGN1c3RvbVdpa2lWaWV3UGFnZXMubWFwKHBhdGggPT4gcHJlZml4ICsgcGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIG5ldyBjcmVhdGUgZG9jdW1lbnQgd2l6YXJkIHRyZWVcbiAgICogQG1ldGhvZCBjcmVhdGVXaXphcmRUcmVlXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlV2l6YXJkVHJlZSh3b3Jrc3BhY2UsICRzY29wZSkge1xuICAgIHZhciByb290ID0gY3JlYXRlRm9sZGVyKFwiTmV3IERvY3VtZW50c1wiKTtcbiAgICBhZGRDcmVhdGVXaXphcmRGb2xkZXJzKHdvcmtzcGFjZSwgJHNjb3BlLCByb290LCBkb2N1bWVudFRlbXBsYXRlcyk7XG4gICAgcmV0dXJuIHJvb3Q7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVGb2xkZXIobmFtZSk6IGFueSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICBjaGlsZHJlbjogW11cbiAgICB9O1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGFkZENyZWF0ZVdpemFyZEZvbGRlcnMod29ya3NwYWNlLCAkc2NvcGUsIHBhcmVudCwgdGVtcGxhdGVzOiBhbnlbXSkge1xuICAgIGFuZ3VsYXIuZm9yRWFjaCh0ZW1wbGF0ZXMsICh0ZW1wbGF0ZSkgPT4ge1xuXG4gICAgICBpZiAoIHRlbXBsYXRlLmdlbmVyYXRlZCApIHtcbiAgICAgICAgaWYgKCB0ZW1wbGF0ZS5nZW5lcmF0ZWQuaW5pdCApIHtcbiAgICAgICAgICB0ZW1wbGF0ZS5nZW5lcmF0ZWQuaW5pdCh3b3Jrc3BhY2UsICRzY29wZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIHRpdGxlID0gdGVtcGxhdGUubGFiZWwgfHwga2V5O1xuICAgICAgdmFyIG5vZGUgPSBjcmVhdGVGb2xkZXIodGl0bGUpO1xuICAgICAgbm9kZS5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICBub2RlLmVudGl0eSA9IHRlbXBsYXRlO1xuXG4gICAgICB2YXIgYWRkQ2xhc3MgPSB0ZW1wbGF0ZS5hZGRDbGFzcztcbiAgICAgIGlmIChhZGRDbGFzcykge1xuICAgICAgICBub2RlLmFkZENsYXNzID0gYWRkQ2xhc3M7XG4gICAgICB9XG5cbiAgICAgIHZhciBrZXkgPSB0ZW1wbGF0ZS5leGVtcGxhcjtcbiAgICAgIHZhciBwYXJlbnRLZXkgPSBwYXJlbnQua2V5IHx8IFwiXCI7XG4gICAgICBub2RlLmtleSA9IHBhcmVudEtleSA/IHBhcmVudEtleSArIFwiX1wiICsga2V5IDoga2V5O1xuICAgICAgdmFyIGljb24gPSB0ZW1wbGF0ZS5pY29uO1xuICAgICAgaWYgKGljb24pIHtcbiAgICAgICAgbm9kZS5pY29uID0gQ29yZS51cmwoaWNvbik7XG4gICAgICB9XG4gICAgICAvLyBjb21waWxlciB3YXMgY29tcGxhaW5pbmcgYWJvdXQgJ2xhYmVsJyBoYWQgbm8gaWRlYSB3aGVyZSBpdCdzIGNvbWluZyBmcm9tXG4gICAgICAvLyB2YXIgdG9vbHRpcCA9IHZhbHVlW1widG9vbHRpcFwiXSB8fCB2YWx1ZVtcImRlc2NyaXB0aW9uXCJdIHx8IGxhYmVsO1xuICAgICAgdmFyIHRvb2x0aXAgPSB0ZW1wbGF0ZVtcInRvb2x0aXBcIl0gfHwgdGVtcGxhdGVbXCJkZXNjcmlwdGlvblwiXSB8fCAnJztcbiAgICAgIG5vZGUudG9vbHRpcCA9IHRvb2x0aXA7XG4gICAgICBpZiAodGVtcGxhdGVbXCJmb2xkZXJcIl0pIHtcbiAgICAgICAgbm9kZS5pc0ZvbGRlciA9ICgpID0+IHsgcmV0dXJuIHRydWU7IH07XG4gICAgICB9XG4gICAgICBwYXJlbnQuY2hpbGRyZW4ucHVzaChub2RlKTtcblxuICAgICAgdmFyIGNoaWxkcmVuID0gdGVtcGxhdGUuY2hpbGRyZW47XG4gICAgICBpZiAoY2hpbGRyZW4pIHtcbiAgICAgICAgYWRkQ3JlYXRlV2l6YXJkRm9sZGVycyh3b3Jrc3BhY2UsICRzY29wZSwgbm9kZSwgY2hpbGRyZW4pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0TGluaygkc2NvcGUpIHtcbiAgICB2YXIgcHJvamVjdElkID0gJHNjb3BlLnByb2plY3RJZDtcbiAgICB2YXIgc3RhcnQgPSBVcmxIZWxwZXJzLmpvaW4oRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCksIFwiL3dpa2lcIik7XG4gICAgdmFyIGJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgaWYgKGJyYW5jaCkge1xuICAgICAgc3RhcnQgPSBVcmxIZWxwZXJzLmpvaW4oc3RhcnQsICdicmFuY2gnLCBicmFuY2gpO1xuICAgIH1cbiAgICByZXR1cm4gc3RhcnQ7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBmaWxlbmFtZS9wYXRoIGlzIGFuIGluZGV4IHBhZ2UgKG5hbWVkIGluZGV4LiogYW5kIGlzIGEgbWFya2Rvd24vaHRtbCBwYWdlKS5cbiAgICpcbiAgICogQHBhcmFtIHBhdGhcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gaXNJbmRleFBhZ2UocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhdGggJiYgKHBhdGguZW5kc1dpdGgoXCJpbmRleC5tZFwiKSB8fCBwYXRoLmVuZHNXaXRoKFwiaW5kZXguaHRtbFwiKSB8fCBwYXRoLmVuZHNXaXRoKFwiaW5kZXhcIikpID8gdHJ1ZSA6IGZhbHNlO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHZpZXdMaW5rKCRzY29wZSwgcGFnZUlkOnN0cmluZywgJGxvY2F0aW9uLCBmaWxlTmFtZTpzdHJpbmcgPSBudWxsKSB7XG4gICAgdmFyIGxpbms6c3RyaW5nID0gbnVsbDtcbiAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICBpZiAocGFnZUlkKSB7XG4gICAgICAvLyBmaWd1cmUgb3V0IHdoaWNoIHZpZXcgdG8gdXNlIGZvciB0aGlzIHBhZ2VcbiAgICAgIHZhciB2aWV3ID0gaXNJbmRleFBhZ2UocGFnZUlkKSA/IFwiL2Jvb2svXCIgOiBcIi92aWV3L1wiO1xuICAgICAgbGluayA9IHN0YXJ0ICsgdmlldyArIGVuY29kZVBhdGgoQ29yZS50cmltTGVhZGluZyhwYWdlSWQsIFwiL1wiKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGxldHMgdXNlIHRoZSBjdXJyZW50IHBhdGhcbiAgICAgIHZhciBwYXRoOnN0cmluZyA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICBsaW5rID0gXCIjXCIgKyBwYXRoLnJlcGxhY2UoLyhlZGl0fGNyZWF0ZSkvLCBcInZpZXdcIik7XG4gICAgfVxuICAgIGlmIChmaWxlTmFtZSAmJiBwYWdlSWQgJiYgcGFnZUlkLmVuZHNXaXRoKGZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIGxpbms7XG4gICAgfVxuICAgIGlmIChmaWxlTmFtZSkge1xuICAgICAgaWYgKCFsaW5rLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgICAgICBsaW5rICs9IFwiL1wiO1xuICAgICAgfVxuICAgICAgbGluayArPSBmaWxlTmFtZTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbms7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gYnJhbmNoTGluaygkc2NvcGUsIHBhZ2VJZDogc3RyaW5nLCAkbG9jYXRpb24sIGZpbGVOYW1lOnN0cmluZyA9IG51bGwpIHtcbiAgICByZXR1cm4gdmlld0xpbmsoJHNjb3BlLCBwYWdlSWQsICRsb2NhdGlvbiwgZmlsZU5hbWUpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGVkaXRMaW5rKCRzY29wZSwgcGFnZUlkOnN0cmluZywgJGxvY2F0aW9uKSB7XG4gICAgdmFyIGxpbms6c3RyaW5nID0gbnVsbDtcbiAgICB2YXIgZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KHBhZ2VJZCk7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgXCJpbWFnZVwiOlxuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICAgIGlmIChwYWdlSWQpIHtcbiAgICAgICAgbGluayA9IHN0YXJ0ICsgXCIvZWRpdC9cIiArIGVuY29kZVBhdGgocGFnZUlkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGxldHMgdXNlIHRoZSBjdXJyZW50IHBhdGhcbiAgICAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgICBsaW5rID0gXCIjXCIgKyBwYXRoLnJlcGxhY2UoLyh2aWV3fGNyZWF0ZSkvLCBcImVkaXRcIik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsaW5rO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxpbmsoJHNjb3BlLCBwYWdlSWQ6c3RyaW5nLCAkbG9jYXRpb24pIHtcbiAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgdmFyIGxpbmsgPSAnJztcbiAgICBpZiAocGFnZUlkKSB7XG4gICAgICBsaW5rID0gc3RhcnQgKyBcIi9jcmVhdGUvXCIgKyBlbmNvZGVQYXRoKHBhZ2VJZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGxldHMgdXNlIHRoZSBjdXJyZW50IHBhdGhcbiAgICAgIGxpbmsgPSBcIiNcIiArIHBhdGgucmVwbGFjZSgvKHZpZXd8ZWRpdHxmb3JtVGFibGUpLywgXCJjcmVhdGVcIik7XG4gICAgfVxuICAgIC8vIHdlIGhhdmUgdGhlIGxpbmsgc28gbGV0cyBub3cgcmVtb3ZlIHRoZSBsYXN0IHBhdGhcbiAgICAvLyBvciBpZiB0aGVyZSBpcyBubyAvIGluIHRoZSBwYXRoIHRoZW4gcmVtb3ZlIHRoZSBsYXN0IHNlY3Rpb25cbiAgICB2YXIgaWR4ID0gbGluay5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgaWYgKGlkeCA+IDAgJiYgISRzY29wZS5jaGlsZHJlbiAmJiAhcGF0aC5zdGFydHNXaXRoKFwiL3dpa2kvZm9ybVRhYmxlXCIpKSB7XG4gICAgICBsaW5rID0gbGluay5zdWJzdHJpbmcoMCwgaWR4ICsgMSk7XG4gICAgfVxuICAgIHJldHVybiBsaW5rO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGVuY29kZVBhdGgocGFnZUlkOnN0cmluZykge1xuICAgIHJldHVybiBwYWdlSWQuc3BsaXQoXCIvXCIpLm1hcChlbmNvZGVVUklDb21wb25lbnQpLmpvaW4oXCIvXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGRlY29kZVBhdGgocGFnZUlkOnN0cmluZykge1xuICAgIHJldHVybiBwYWdlSWQuc3BsaXQoXCIvXCIpLm1hcChkZWNvZGVVUklDb21wb25lbnQpLmpvaW4oXCIvXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVGb3JtYXQobmFtZTpzdHJpbmcsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnk/KSB7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGlmIChuYW1lID09PSBcIkplbmtpbnNmaWxlXCIpIHtcbiAgICAgICAgZXh0ZW5zaW9uID0gXCJncm9vdnlcIjtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGFuc3dlciA9IG51bGw7XG4gICAgaWYgKCFmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSB7XG4gICAgICBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5ID0gSGF3dGlvQ29yZS5pbmplY3Rvci5nZXQoXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIpO1xuICAgIH1cbiAgICBhbmd1bGFyLmZvckVhY2goZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSwgKGFycmF5LCBrZXkpID0+IHtcbiAgICAgIGlmIChhcnJheS5pbmRleE9mKGV4dGVuc2lvbikgPj0gMCkge1xuICAgICAgICBhbnN3ZXIgPSBrZXk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGFuc3dlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmaWxlIG5hbWUgb2YgdGhlIGdpdmVuIHBhdGg7IHN0cmlwcGluZyBvZmYgYW55IGRpcmVjdG9yaWVzXG4gICAqIEBtZXRob2QgZmlsZU5hbWVcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVOYW1lKHBhdGg6IHN0cmluZykge1xuICAgIGlmIChwYXRoKSB7XG4gICAgICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHBhdGguc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmb2xkZXIgb2YgdGhlIGdpdmVuIHBhdGggKGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IHBhdGggbmFtZSlcbiAgICogQG1ldGhvZCBmaWxlUGFyZW50XG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlUGFyZW50KHBhdGg6IHN0cmluZykge1xuICAgIGlmIChwYXRoKSB7XG4gICAgICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHBhdGguc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGxldHMgcmV0dXJuIHRoZSByb290IGRpcmVjdG9yeVxuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGZpbGUgbmFtZSBmb3IgdGhlIGdpdmVuIG5hbWU7IHdlIGhpZGUgc29tZSBleHRlbnNpb25zXG4gICAqIEBtZXRob2QgaGlkZUZpbmVOYW1lRXh0ZW5zaW9uc1xuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gaGlkZUZpbGVOYW1lRXh0ZW5zaW9ucyhuYW1lKSB7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChXaWtpLmhpZGVFeHRlbnNpb25zLCAoZXh0ZW5zaW9uKSA9PiB7XG4gICAgICAgIGlmIChuYW1lLmVuZHNXaXRoKGV4dGVuc2lvbikpIHtcbiAgICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcoMCwgbmFtZS5sZW5ndGggLSBleHRlbnNpb24ubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIFVSTCB0byBwZXJmb3JtIGEgR0VUIG9yIFBPU1QgZm9yIHRoZSBnaXZlbiBicmFuY2ggbmFtZSBhbmQgcGF0aFxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGdpdFJlc3RVUkwoJHNjb3BlLCBwYXRoOiBzdHJpbmcpIHtcbiAgICB2YXIgdXJsID0gZ2l0UmVsYXRpdmVVUkwoJHNjb3BlLCBwYXRoKTtcbiAgICB1cmwgPSBDb3JlLnVybCgnLycgKyB1cmwpO1xuXG4vKlxuICAgIHZhciBjb25uZWN0aW9uTmFtZSA9IENvcmUuZ2V0Q29ubmVjdGlvbk5hbWVQYXJhbWV0ZXIoKTtcbiAgICBpZiAoY29ubmVjdGlvbk5hbWUpIHtcbiAgICAgIHZhciBjb25uZWN0aW9uT3B0aW9ucyA9IENvcmUuZ2V0Q29ubmVjdE9wdGlvbnMoY29ubmVjdGlvbk5hbWUpO1xuICAgICAgaWYgKGNvbm5lY3Rpb25PcHRpb25zKSB7XG4gICAgICAgIGNvbm5lY3Rpb25PcHRpb25zLnBhdGggPSB1cmw7XG4gICAgICAgIHVybCA9IDxzdHJpbmc+Q29yZS5jcmVhdGVTZXJ2ZXJDb25uZWN0aW9uVXJsKGNvbm5lY3Rpb25PcHRpb25zKTtcbiAgICAgIH1cbiAgICB9XG5cbiovXG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gICAgZnVuY3Rpb24gZ2l0VXJsUHJlZml4KCkge1xuICAgICAgICB2YXIgcHJlZml4ID0gXCJcIjtcbiAgICAgICAgdmFyIGluamVjdG9yID0gSGF3dGlvQ29yZS5pbmplY3RvcjtcbiAgICAgICAgaWYgKGluamVjdG9yKSB7XG4gICAgICAgICAgICBwcmVmaXggPSBpbmplY3Rvci5nZXQoXCJXaWtpR2l0VXJsUHJlZml4XCIpIHx8IFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZWZpeDtcbiAgICB9XG5cbiAgICAvKipcbiAgICogUmV0dXJucyBhIHJlbGF0aXZlIFVSTCB0byBwZXJmb3JtIGEgR0VUIG9yIFBPU1QgZm9yIHRoZSBnaXZlbiBicmFuY2gvcGF0aFxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGdpdFJlbGF0aXZlVVJMKCRzY29wZSwgcGF0aDogc3RyaW5nKSB7XG4gICAgICB2YXIgYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICB2YXIgcHJlZml4ID0gZ2l0VXJsUHJlZml4KCk7XG4gICAgYnJhbmNoID0gYnJhbmNoIHx8IFwibWFzdGVyXCI7XG4gICAgcGF0aCA9IHBhdGggfHwgXCIvXCI7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihwcmVmaXgsIFwiZ2l0L1wiICsgYnJhbmNoLCBwYXRoKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFRha2VzIGEgcm93IGNvbnRhaW5pbmcgdGhlIGVudGl0eSBvYmplY3Q7IG9yIGNhbiB0YWtlIHRoZSBlbnRpdHkgZGlyZWN0bHkuXG4gICAqXG4gICAqIEl0IHRoZW4gdXNlcyB0aGUgbmFtZSwgZGlyZWN0b3J5IGFuZCB4bWxOYW1lc3BhY2VzIHByb3BlcnRpZXNcbiAgICpcbiAgICogQG1ldGhvZCBmaWxlSWNvbkh0bWxcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHthbnl9IHJvd1xuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZmlsZUljb25IdG1sKHJvdykge1xuICAgIHZhciBuYW1lID0gcm93Lm5hbWU7XG4gICAgdmFyIHBhdGggPSByb3cucGF0aDtcbiAgICB2YXIgYnJhbmNoID0gcm93LmJyYW5jaCA7XG4gICAgdmFyIGRpcmVjdG9yeSA9IHJvdy5kaXJlY3Rvcnk7XG4gICAgdmFyIHhtbE5hbWVzcGFjZXMgPSByb3cueG1sX25hbWVzcGFjZXMgfHwgcm93LnhtbE5hbWVzcGFjZXM7XG4gICAgdmFyIGljb25VcmwgPSByb3cuaWNvblVybDtcbiAgICB2YXIgZW50aXR5ID0gcm93LmVudGl0eTtcbiAgICBpZiAoZW50aXR5KSB7XG4gICAgICBuYW1lID0gbmFtZSB8fCBlbnRpdHkubmFtZTtcbiAgICAgIHBhdGggPSBwYXRoIHx8IGVudGl0eS5wYXRoO1xuICAgICAgYnJhbmNoID0gYnJhbmNoIHx8IGVudGl0eS5icmFuY2g7XG4gICAgICBkaXJlY3RvcnkgPSBkaXJlY3RvcnkgfHwgZW50aXR5LmRpcmVjdG9yeTtcbiAgICAgIHhtbE5hbWVzcGFjZXMgPSB4bWxOYW1lc3BhY2VzIHx8IGVudGl0eS54bWxfbmFtZXNwYWNlcyB8fCBlbnRpdHkueG1sTmFtZXNwYWNlcztcbiAgICAgIGljb25VcmwgPSBpY29uVXJsIHx8IGVudGl0eS5pY29uVXJsO1xuICAgIH1cbiAgICBicmFuY2ggPSBicmFuY2ggfHwgXCJtYXN0ZXJcIjtcbiAgICB2YXIgY3NzID0gbnVsbDtcbiAgICB2YXIgaWNvbjpzdHJpbmcgPSBudWxsO1xuICAgIHZhciBleHRlbnNpb24gPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgIC8vIFRPRE8gY291bGQgd2UgdXNlIGRpZmZlcmVudCBpY29ucyBmb3IgbWFya2Rvd24gdiB4bWwgdiBodG1sXG4gICAgaWYgKHhtbE5hbWVzcGFjZXMgJiYgeG1sTmFtZXNwYWNlcy5sZW5ndGgpIHtcbiAgICAgIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuY2FtZWxOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgIGljb24gPSBcImltZy9pY29ucy9jYW1lbC5zdmdcIjtcbiAgICAgIH0gZWxzZSBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmRvemVyTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICBpY29uID0gXCJpbWcvaWNvbnMvZG96ZXIvZG96ZXIuZ2lmXCI7XG4gICAgICB9IGVsc2UgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5hY3RpdmVtcU5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgaWNvbiA9IFwiaW1nL2ljb25zL21lc3NhZ2Vicm9rZXIuc3ZnXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJmaWxlIFwiICsgbmFtZSArIFwiIGhhcyBuYW1lc3BhY2VzIFwiICsgeG1sTmFtZXNwYWNlcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghaWNvblVybCAmJiBuYW1lKSB7XG4gICAgICB2YXIgbG93ZXJOYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgaWYgKGxvd2VyTmFtZSA9PSBcInBvbS54bWxcIikge1xuICAgICAgICBpY29uVXJsID0gXCJpbWcvbWF2ZW4taWNvbi5wbmdcIjtcbiAgICAgIH0gZWxzZSBpZiAobG93ZXJOYW1lID09IFwiamVua2luc2ZpbGVcIikge1xuICAgICAgICBpY29uVXJsID0gXCJpbWcvamVua2lucy1pY29uLnN2Z1wiO1xuICAgICAgfSBlbHNlIGlmIChsb3dlck5hbWUgPT0gXCJmYWJyaWM4LnltbFwiKSB7XG4gICAgICAgIGljb25VcmwgPSBcImltZy9mYWJyaWM4X2ljb24uc3ZnXCI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGljb25VcmwpIHtcbiAgICAgIGNzcyA9IG51bGw7XG4gICAgICBpY29uID0gaWNvblVybDtcbi8qXG4gICAgICB2YXIgcHJlZml4ID0gZ2l0VXJsUHJlZml4KCk7XG4gICAgICBpY29uID0gVXJsSGVscGVycy5qb2luKHByZWZpeCwgXCJnaXRcIiwgaWNvblVybCk7XG4qL1xuLypcbiAgICAgIHZhciBjb25uZWN0aW9uTmFtZSA9IENvcmUuZ2V0Q29ubmVjdGlvbk5hbWVQYXJhbWV0ZXIoKTtcbiAgICAgIGlmIChjb25uZWN0aW9uTmFtZSkge1xuICAgICAgICB2YXIgY29ubmVjdGlvbk9wdGlvbnMgPSBDb3JlLmdldENvbm5lY3RPcHRpb25zKGNvbm5lY3Rpb25OYW1lKTtcbiAgICAgICAgaWYgKGNvbm5lY3Rpb25PcHRpb25zKSB7XG4gICAgICAgICAgY29ubmVjdGlvbk9wdGlvbnMucGF0aCA9IENvcmUudXJsKCcvJyArIGljb24pO1xuICAgICAgICAgIGljb24gPSA8c3RyaW5nPkNvcmUuY3JlYXRlU2VydmVyQ29ubmVjdGlvblVybChjb25uZWN0aW9uT3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiovXG4gICAgfVxuICAgIGlmICghaWNvbikge1xuICAgICAgaWYgKGRpcmVjdG9yeSkge1xuICAgICAgICBzd2l0Y2ggKGV4dGVuc2lvbikge1xuICAgICAgICAgIGNhc2UgJ3Byb2ZpbGUnOlxuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1ib29rXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gbG9nLmRlYnVnKFwiTm8gbWF0Y2ggZm9yIGV4dGVuc2lvbjogXCIsIGV4dGVuc2lvbiwgXCIgdXNpbmcgYSBnZW5lcmljIGZvbGRlciBpY29uXCIpO1xuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1mb2xkZXIgZm9sZGVyLWljb25cIjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3dpdGNoIChleHRlbnNpb24pIHtcbiAgICAgICAgICBjYXNlICdqYXZhJzpcbiAgICAgICAgICAgIGljb24gPSBcImltZy9qYXZhLnN2Z1wiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAncG5nJzpcbiAgICAgICAgICBjYXNlICdzdmcnOlxuICAgICAgICAgIGNhc2UgJ2pwZyc6XG4gICAgICAgICAgY2FzZSAnZ2lmJzpcbiAgICAgICAgICAgIGNzcyA9IG51bGw7XG4gICAgICAgICAgICBpY29uID0gV2lraS5naXRSZWxhdGl2ZVVSTChicmFuY2gsIHBhdGgpO1xuLypcbiAgICAgICAgICAgIHZhciBjb25uZWN0aW9uTmFtZSA9IENvcmUuZ2V0Q29ubmVjdGlvbk5hbWVQYXJhbWV0ZXIoKTtcbiAgICAgICAgICAgIGlmIChjb25uZWN0aW9uTmFtZSkge1xuICAgICAgICAgICAgICB2YXIgY29ubmVjdGlvbk9wdGlvbnMgPSBDb3JlLmdldENvbm5lY3RPcHRpb25zKGNvbm5lY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgaWYgKGNvbm5lY3Rpb25PcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbk9wdGlvbnMucGF0aCA9IENvcmUudXJsKCcvJyArIGljb24pO1xuICAgICAgICAgICAgICAgIGljb24gPSA8c3RyaW5nPkNvcmUuY3JlYXRlU2VydmVyQ29ubmVjdGlvblVybChjb25uZWN0aW9uT3B0aW9ucyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiovXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdqc29uJzpcbiAgICAgICAgICBjYXNlICd4bWwnOlxuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1maWxlLXRleHRcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ21kJzpcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtZmlsZS10ZXh0LW9cIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBsb2cuZGVidWcoXCJObyBtYXRjaCBmb3IgZXh0ZW5zaW9uOiBcIiwgZXh0ZW5zaW9uLCBcIiB1c2luZyBhIGdlbmVyaWMgZmlsZSBpY29uXCIpO1xuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1maWxlLW9cIjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaWNvbikge1xuICAgICAgcmV0dXJuIFwiPGltZyBzcmM9J1wiICsgQ29yZS51cmwoaWNvbikgKyBcIic+XCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBcIjxpIGNsYXNzPSdcIiArIGNzcyArIFwiJz48L2k+XCI7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGljb25DbGFzcyhyb3cpIHtcbiAgICB2YXIgbmFtZSA9IHJvdy5nZXRQcm9wZXJ0eShcIm5hbWVcIik7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgdmFyIGRpcmVjdG9yeSA9IHJvdy5nZXRQcm9wZXJ0eShcImRpcmVjdG9yeVwiKTtcbiAgICBpZiAoZGlyZWN0b3J5KSB7XG4gICAgICByZXR1cm4gXCJmYSBmYS1mb2xkZXJcIjtcbiAgICB9XG4gICAgaWYgKFwieG1sXCIgPT09IGV4dGVuc2lvbikge1xuICAgICAgICByZXR1cm4gXCJmYSBmYS1jb2dcIjtcbiAgICB9IGVsc2UgaWYgKFwibWRcIiA9PT0gZXh0ZW5zaW9uKSB7XG4gICAgICAgIHJldHVybiBcImZhIGZhLWZpbGUtdGV4dC1vXCI7XG4gICAgfVxuICAgIC8vIFRPRE8gY291bGQgd2UgdXNlIGRpZmZlcmVudCBpY29ucyBmb3IgbWFya2Rvd24gdiB4bWwgdiBodG1sXG4gICAgcmV0dXJuIFwiZmEgZmEtZmlsZS1vXCI7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBFeHRyYWN0cyB0aGUgcGFnZUlkLCBicmFuY2gsIG9iamVjdElkIGZyb20gdGhlIHJvdXRlIHBhcmFtZXRlcnNcbiAgICogQG1ldGhvZCBpbml0U2NvcGVcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHsqfSAkc2NvcGVcbiAgICogQHBhcmFtIHthbnl9ICRyb3V0ZVBhcmFtc1xuICAgKiBAcGFyYW0ge25nLklMb2NhdGlvblNlcnZpY2V9ICRsb2NhdGlvblxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKSB7XG4gICAgJHNjb3BlLnBhZ2VJZCA9IFdpa2kucGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcblxuICAgIC8vIGxldHMgbGV0IHRoZXNlIHRvIGJlIGluaGVyaXRlZCBpZiB3ZSBpbmNsdWRlIGEgdGVtcGxhdGUgb24gYW5vdGhlciBwYWdlXG4gICAgJHNjb3BlLnByb2plY3RJZCA9ICRyb3V0ZVBhcmFtc1tcInByb2plY3RJZFwiXSB8fCAkc2NvcGUuaWQ7XG4gICAgJHNjb3BlLm5hbWVzcGFjZSA9ICRyb3V0ZVBhcmFtc1tcIm5hbWVzcGFjZVwiXSB8fCAkc2NvcGUubmFtZXNwYWNlO1xuXG4gICAgJHNjb3BlLm93bmVyID0gJHJvdXRlUGFyYW1zW1wib3duZXJcIl07XG4gICAgJHNjb3BlLnJlcG9JZCA9ICRyb3V0ZVBhcmFtc1tcInJlcG9JZFwiXTtcbiAgICAkc2NvcGUuYnJhbmNoID0gJHJvdXRlUGFyYW1zW1wiYnJhbmNoXCJdIHx8ICRsb2NhdGlvbi5zZWFyY2goKVtcImJyYW5jaFwiXTtcbiAgICAkc2NvcGUub2JqZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJvYmplY3RJZFwiXSB8fCAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQxXCJdO1xuICAgICRzY29wZS5zdGFydExpbmsgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICAkc2NvcGUuJHZpZXdMaW5rID0gdmlld0xpbmsoJHNjb3BlLCAkc2NvcGUucGFnZUlkLCAkbG9jYXRpb24pO1xuICAgICRzY29wZS5oaXN0b3J5TGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvaGlzdG9yeS9cIiArICgkc2NvcGUucGFnZUlkIHx8IFwiXCIpO1xuICAgICRzY29wZS53aWtpUmVwb3NpdG9yeSA9IG5ldyBHaXRXaWtpUmVwb3NpdG9yeSgkc2NvcGUpO1xuXG4gICAgJHNjb3BlLiR3b3Jrc3BhY2VMaW5rID0gRGV2ZWxvcGVyLndvcmtzcGFjZUxpbmsoKTtcbiAgICAkc2NvcGUuJHByb2plY3RMaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RCcmVhZGNydW1icygkc2NvcGUucHJvamVjdElkLCBjcmVhdGVTb3VyY2VCcmVhZGNydW1icygkc2NvcGUpKTtcbiAgICAkc2NvcGUuc3ViVGFiQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTdWJOYXZCYXJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvYWRzIHRoZSBicmFuY2hlcyBmb3IgdGhpcyB3aWtpIHJlcG9zaXRvcnkgYW5kIHN0b3JlcyB0aGVtIGluIHRoZSBicmFuY2hlcyBwcm9wZXJ0eSBpblxuICAgKiB0aGUgJHNjb3BlIGFuZCBlbnN1cmVzICRzY29wZS5icmFuY2ggaXMgc2V0IHRvIGEgdmFsaWQgdmFsdWVcbiAgICpcbiAgICogQHBhcmFtIHdpa2lSZXBvc2l0b3J5XG4gICAqIEBwYXJhbSAkc2NvcGVcbiAgICogQHBhcmFtIGlzRm1jIHdoZXRoZXIgd2UgcnVuIGFzIGZhYnJpYzggb3IgYXMgaGF3dGlvXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gbG9hZEJyYW5jaGVzKGpvbG9raWEsIHdpa2lSZXBvc2l0b3J5LCAkc2NvcGUsIGlzRm1jID0gZmFsc2UpIHtcbiAgICB3aWtpUmVwb3NpdG9yeS5icmFuY2hlcygocmVzcG9uc2UpID0+IHtcbiAgICAgIC8vIGxldHMgc29ydCBieSB2ZXJzaW9uIG51bWJlclxuICAgICAgJHNjb3BlLmJyYW5jaGVzID0gcmVzcG9uc2Uuc29ydEJ5KCh2KSA9PiBDb3JlLnZlcnNpb25Ub1NvcnRhYmxlU3RyaW5nKHYpLCB0cnVlKTtcblxuICAgICAgLy8gZGVmYXVsdCB0aGUgYnJhbmNoIG5hbWUgaWYgd2UgaGF2ZSAnbWFzdGVyJ1xuICAgICAgaWYgKCEkc2NvcGUuYnJhbmNoICYmICRzY29wZS5icmFuY2hlcy5maW5kKChicmFuY2gpID0+IHtcbiAgICAgICAgcmV0dXJuIGJyYW5jaCA9PT0gXCJtYXN0ZXJcIjtcbiAgICAgIH0pKSB7XG4gICAgICAgICRzY29wZS5icmFuY2ggPSBcIm1hc3RlclwiO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0cyB0aGUgcGFnZUlkIGZyb20gdGhlIHJvdXRlIHBhcmFtZXRlcnNcbiAgICogQG1ldGhvZCBwYWdlSWRcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHthbnl9ICRyb3V0ZVBhcmFtc1xuICAgKiBAcGFyYW0gQG5nLklMb2NhdGlvblNlcnZpY2UgQGxvY2F0aW9uXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBwYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pIHtcbiAgICB2YXIgcGFnZUlkID0gJHJvdXRlUGFyYW1zWydwYWdlJ107XG4gICAgaWYgKCFwYWdlSWQpIHtcbiAgICAgIC8vIExldHMgZGVhbCB3aXRoIHRoZSBoYWNrIG9mIEFuZ3VsYXJKUyBub3Qgc3VwcG9ydGluZyAvIGluIGEgcGF0aCB2YXJpYWJsZVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAxMDA7IGkrKykge1xuICAgICAgICB2YXIgdmFsdWUgPSAkcm91dGVQYXJhbXNbJ3BhdGgnICsgaV07XG4gICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgICAgICBpZiAoIXBhZ2VJZCkge1xuICAgICAgICAgICAgcGFnZUlkID0gdmFsdWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhZ2VJZCArPSBcIi9cIiArIHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBhZ2VJZCB8fCBcIi9cIjtcbiAgICB9XG5cbiAgICAvLyBpZiBubyAkcm91dGVQYXJhbXMgdmFyaWFibGVzIGxldHMgZmlndXJlIGl0IG91dCBmcm9tIHRoZSAkbG9jYXRpb25cbiAgICBpZiAoIXBhZ2VJZCkge1xuICAgICAgcGFnZUlkID0gcGFnZUlkRnJvbVVSSSgkbG9jYXRpb24ucGF0aCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhZ2VJZDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBwYWdlSWRGcm9tVVJJKHVybDpzdHJpbmcpIHtcbiAgICB2YXIgd2lraVByZWZpeCA9IFwiL3dpa2kvXCI7XG4gICAgaWYgKHVybCAmJiB1cmwuc3RhcnRzV2l0aCh3aWtpUHJlZml4KSkge1xuICAgICAgdmFyIGlkeCA9IHVybC5pbmRleE9mKFwiL1wiLCB3aWtpUHJlZml4Lmxlbmd0aCArIDEpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHVybC5zdWJzdHJpbmcoaWR4ICsgMSwgdXJsLmxlbmd0aClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGxcblxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVFeHRlbnNpb24obmFtZSkge1xuICAgIGlmIChuYW1lLmluZGV4T2YoJyMnKSA+IDApXG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcoMCwgbmFtZS5pbmRleE9mKCcjJykpO1xuICAgIHJldHVybiBDb3JlLmZpbGVFeHRlbnNpb24obmFtZSwgXCJtYXJrZG93blwiKTtcbiAgfVxuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIG9uQ29tcGxldGUoc3RhdHVzKSB7XG4gICAgY29uc29sZS5sb2coXCJDb21wbGV0ZWQgb3BlcmF0aW9uIHdpdGggc3RhdHVzOiBcIiArIEpTT04uc3RyaW5naWZ5KHN0YXR1cykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyB0aGUgZ2l2ZW4gSlNPTiB0ZXh0IHJlcG9ydGluZyB0byB0aGUgdXNlciBpZiB0aGVyZSBpcyBhIHBhcnNlIGVycm9yXG4gICAqIEBtZXRob2QgcGFyc2VKc29uXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0XG4gICAqIEByZXR1cm4ge2FueX1cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBwYXJzZUpzb24odGV4dDpzdHJpbmcpIHtcbiAgICBpZiAodGV4dCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UodGV4dCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwiZXJyb3JcIiwgXCJGYWlsZWQgdG8gcGFyc2UgSlNPTjogXCIgKyBlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQWRqdXN0cyBhIHJlbGF0aXZlIG9yIGFic29sdXRlIGxpbmsgZnJvbSBhIHdpa2kgb3IgZmlsZSBzeXN0ZW0gdG8gb25lIHVzaW5nIHRoZSBoYXNoIGJhbmcgc3ludGF4XG4gICAqIEBtZXRob2QgYWRqdXN0SHJlZlxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0geyp9ICRzY29wZVxuICAgKiBAcGFyYW0ge25nLklMb2NhdGlvblNlcnZpY2V9ICRsb2NhdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gaHJlZlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZmlsZUV4dGVuc2lvblxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gYWRqdXN0SHJlZigkc2NvcGUsICRsb2NhdGlvbiwgaHJlZiwgZmlsZUV4dGVuc2lvbikge1xuICAgIHZhciBleHRlbnNpb24gPSBmaWxlRXh0ZW5zaW9uID8gXCIuXCIgKyBmaWxlRXh0ZW5zaW9uIDogXCJcIjtcblxuICAgIC8vIGlmIHRoZSBsYXN0IHBhcnQgb2YgdGhlIHBhdGggaGFzIGEgZG90IGluIGl0IGxldHNcbiAgICAvLyBleGNsdWRlIGl0IGFzIHdlIGFyZSByZWxhdGl2ZSB0byBhIG1hcmtkb3duIG9yIGh0bWwgZmlsZSBpbiBhIGZvbGRlclxuICAgIC8vIHN1Y2ggYXMgd2hlbiB2aWV3aW5nIHJlYWRtZS5tZCBvciBpbmRleC5tZFxuICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICB2YXIgZm9sZGVyUGF0aCA9IHBhdGg7XG4gICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgIGlmIChpZHggPiAwKSB7XG4gICAgICB2YXIgbGFzdE5hbWUgPSBwYXRoLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgIGlmIChsYXN0TmFtZS5pbmRleE9mKFwiLlwiKSA+PSAwKSB7XG4gICAgICAgIGZvbGRlclBhdGggPSBwYXRoLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlYWwgd2l0aCByZWxhdGl2ZSBVUkxzIGZpcnN0Li4uXG4gICAgaWYgKGhyZWYuc3RhcnRzV2l0aCgnLi4vJykpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGhyZWYuc3BsaXQoJy8nKTtcbiAgICAgIHZhciBwYXRoUGFydHMgPSBmb2xkZXJQYXRoLnNwbGl0KCcvJyk7XG4gICAgICB2YXIgcGFyZW50cyA9IHBhcnRzLmZpbHRlcigocGFydCkgPT4ge1xuICAgICAgICByZXR1cm4gcGFydCA9PT0gXCIuLlwiO1xuICAgICAgfSk7XG4gICAgICBwYXJ0cyA9IHBhcnRzLmxhc3QocGFydHMubGVuZ3RoIC0gcGFyZW50cy5sZW5ndGgpO1xuICAgICAgcGF0aFBhcnRzID0gcGF0aFBhcnRzLmZpcnN0KHBhdGhQYXJ0cy5sZW5ndGggLSBwYXJlbnRzLmxlbmd0aCk7XG5cbiAgICAgIHJldHVybiAnIycgKyBwYXRoUGFydHMuam9pbignLycpICsgJy8nICsgcGFydHMuam9pbignLycpICsgZXh0ZW5zaW9uICsgJGxvY2F0aW9uLmhhc2goKTtcbiAgICB9XG5cbiAgICAvLyBUdXJuIGFuIGFic29sdXRlIGxpbmsgaW50byBhIHdpa2kgbGluay4uLlxuICAgIGlmIChocmVmLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgcmV0dXJuIFdpa2kuYnJhbmNoTGluaygkc2NvcGUsIGhyZWYgKyBleHRlbnNpb24sICRsb2NhdGlvbikgKyBleHRlbnNpb247XG4gICAgfVxuXG4gICAgaWYgKCFXaWtpLmV4Y2x1ZGVBZGp1c3RtZW50UHJlZml4ZXMuYW55KChleGNsdWRlKSA9PiB7XG4gICAgICByZXR1cm4gaHJlZi5zdGFydHNXaXRoKGV4Y2x1ZGUpO1xuICAgIH0pKSB7XG4gICAgICByZXR1cm4gJyMnICsgZm9sZGVyUGF0aCArIFwiL1wiICsgaHJlZiArIGV4dGVuc2lvbiArICRsb2NhdGlvbi5oYXNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICogQG1haW4gV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IHZhciBwbHVnaW5OYW1lID0gJ3dpa2knO1xuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9ICdwbHVnaW5zL3dpa2kvaHRtbC8nO1xuICBleHBvcnQgdmFyIHRhYjphbnkgPSBudWxsO1xuXG4gIGV4cG9ydCB2YXIgX21vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKHBsdWdpbk5hbWUsIFsnaGF3dGlvLWNvcmUnLCAnaGF3dGlvLXVpJywgJ3RyZWVDb250cm9sJywgJ3VpLmNvZGVtaXJyb3InXSk7XG4gIGV4cG9ydCB2YXIgY29udHJvbGxlciA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlQ29udHJvbGxlckZ1bmN0aW9uKF9tb2R1bGUsICdXaWtpJyk7XG4gIGV4cG9ydCB2YXIgcm91dGUgPSBQbHVnaW5IZWxwZXJzLmNyZWF0ZVJvdXRpbmdGdW5jdGlvbih0ZW1wbGF0ZVBhdGgpO1xuXG4gIF9tb2R1bGUuY29uZmlnKFtcIiRyb3V0ZVByb3ZpZGVyXCIsICgkcm91dGVQcm92aWRlcikgPT4ge1xuXG4gICAgLy8gYWxsb3cgb3B0aW9uYWwgYnJhbmNoIHBhdGhzLi4uXG4gICAgYW5ndWxhci5mb3JFYWNoKFtcIlwiLCBcIi9icmFuY2gvOmJyYW5jaFwiXSwgKHBhdGgpID0+IHtcbiAgICAgIC8vdmFyIHN0YXJ0Q29udGV4dCA9ICcvd2lraSc7XG4gICAgICB2YXIgc3RhcnRDb250ZXh0ID0gJy93b3Jrc3BhY2VzLzpuYW1lc3BhY2UvcHJvamVjdHMvOnByb2plY3RJZC93aWtpJztcbiAgICAgICRyb3V0ZVByb3ZpZGVyLlxuICAgICAgICAgICAgICB3aGVuKFVybEhlbHBlcnMuam9pbihzdGFydENvbnRleHQsIHBhdGgsICd2aWV3JyksIHJvdXRlKCd2aWV3UGFnZS5odG1sJywgZmFsc2UpKS5cbiAgICAgICAgICAgICAgd2hlbihVcmxIZWxwZXJzLmpvaW4oc3RhcnRDb250ZXh0LCBwYXRoLCAnY3JlYXRlLzpwYWdlKicpLCByb3V0ZSgnY3JlYXRlLmh0bWwnLCBmYWxzZSkpLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL3ZpZXcvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld1BhZ2UuaHRtbCcsIHJlbG9hZE9uU2VhcmNoOiBmYWxzZX0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2Jvb2svOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld0Jvb2suaHRtbCcsIHJlbG9hZE9uU2VhcmNoOiBmYWxzZX0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2VkaXQvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvZWRpdFBhZ2UuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy92ZXJzaW9uLzpwYWdlKlxcLzpvYmplY3RJZCcsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL3ZpZXdQYWdlLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvaGlzdG9yeS86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9oaXN0b3J5Lmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY29tbWl0LzpwYWdlKlxcLzpvYmplY3RJZCcsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbW1pdC5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2RpZmYvOmRpZmZPYmplY3RJZDEvOmRpZmZPYmplY3RJZDIvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld1BhZ2UuaHRtbCcsIHJlbG9hZE9uU2VhcmNoOiBmYWxzZX0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2Zvcm1UYWJsZS86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9mb3JtVGFibGUuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9kb3plci9tYXBwaW5ncy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9kb3plck1hcHBpbmdzLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY29uZmlndXJhdGlvbnMvOnBhZ2UqJywgeyB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbmZpZ3VyYXRpb25zLmh0bWwnIH0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NvbmZpZ3VyYXRpb24vOnBpZC86cGFnZSonLCB7IHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29uZmlndXJhdGlvbi5odG1sJyB9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9uZXdDb25maWd1cmF0aW9uLzpmYWN0b3J5UGlkLzpwYWdlKicsIHsgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb25maWd1cmF0aW9uLmh0bWwnIH0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NhbWVsL2RpYWdyYW0vOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY2FtZWxEaWFncmFtLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY2FtZWwvY2FudmFzLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NhbWVsQ2FudmFzLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY2FtZWwvcHJvcGVydGllcy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jYW1lbFByb3BlcnRpZXMuaHRtbCd9KTtcbiAgICB9KTtcbn1dKTtcblxuICAvKipcbiAgICogQnJhbmNoIE1lbnUgc2VydmljZVxuICAgKi9cbiAgZXhwb3J0IGludGVyZmFjZSBCcmFuY2hNZW51IHtcbiAgICBhZGRFeHRlbnNpb246IChpdGVtOlVJLk1lbnVJdGVtKSA9PiB2b2lkO1xuICAgIGFwcGx5TWVudUV4dGVuc2lvbnM6IChtZW51OlVJLk1lbnVJdGVtW10pID0+IHZvaWQ7XG4gIH1cblxuICBfbW9kdWxlLmZhY3RvcnkoJ3dpa2lCcmFuY2hNZW51JywgKCkgPT4ge1xuICAgIHZhciBzZWxmID0ge1xuICAgICAgaXRlbXM6IFtdLFxuICAgICAgYWRkRXh0ZW5zaW9uOiAoaXRlbTpVSS5NZW51SXRlbSkgPT4ge1xuICAgICAgICBzZWxmLml0ZW1zLnB1c2goaXRlbSk7XG4gICAgICB9LFxuICAgICAgYXBwbHlNZW51RXh0ZW5zaW9uczogKG1lbnU6VUkuTWVudUl0ZW1bXSkgPT4ge1xuICAgICAgICBpZiAoc2VsZi5pdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGV4dGVuZGVkTWVudTpVSS5NZW51SXRlbVtdID0gW3tcbiAgICAgICAgICBoZWFkaW5nOiBcIkFjdGlvbnNcIlxuICAgICAgICB9XTtcbiAgICAgICAgc2VsZi5pdGVtcy5mb3JFYWNoKChpdGVtOlVJLk1lbnVJdGVtKSA9PiB7XG4gICAgICAgICAgaWYgKGl0ZW0udmFsaWQoKSkge1xuICAgICAgICAgICAgZXh0ZW5kZWRNZW51LnB1c2goaXRlbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGV4dGVuZGVkTWVudS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgbWVudS5hZGQoZXh0ZW5kZWRNZW51KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIHNlbGY7XG4gIH0pO1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnV2lraUdpdFVybFByZWZpeCcsICgpID0+IHtcbiAgICAgIHJldHVybiBcIlwiO1xuICB9KTtcblxuICBfbW9kdWxlLmZhY3RvcnkoJ2ZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnknLCAoKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIFwiaW1hZ2VcIjogW1wic3ZnXCIsIFwicG5nXCIsIFwiaWNvXCIsIFwiYm1wXCIsIFwianBnXCIsIFwiZ2lmXCJdLFxuICAgICAgXCJtYXJrZG93blwiOiBbXCJtZFwiLCBcIm1hcmtkb3duXCIsIFwibWRvd25cIiwgXCJta2RuXCIsIFwibWtkXCJdLFxuICAgICAgXCJodG1sbWl4ZWRcIjogW1wiaHRtbFwiLCBcInhodG1sXCIsIFwiaHRtXCJdLFxuICAgICAgXCJ0ZXh0L3gtamF2YVwiOiBbXCJqYXZhXCJdLFxuICAgICAgXCJ0ZXh0L3gtZ3Jvb3Z5XCI6IFtcImdyb292eVwiXSxcbiAgICAgIFwidGV4dC94LXNjYWxhXCI6IFtcInNjYWxhXCJdLFxuICAgICAgXCJqYXZhc2NyaXB0XCI6IFtcImpzXCIsIFwianNvblwiLCBcImphdmFzY3JpcHRcIiwgXCJqc2NyaXB0XCIsIFwiZWNtYXNjcmlwdFwiLCBcImZvcm1cIl0sXG4gICAgICBcInhtbFwiOiBbXCJ4bWxcIiwgXCJ4c2RcIiwgXCJ3c2RsXCIsIFwiYXRvbVwiXSxcbiAgICAgIFwidGV4dC94LXlhbWxcIjogW1wieWFtbFwiLCBcInltbFwiXSxcbiAgICAgIFwicHJvcGVydGllc1wiOiBbXCJwcm9wZXJ0aWVzXCJdXG4gICAgfTtcbiAgfSk7XG5cbiAgX21vZHVsZS5maWx0ZXIoJ2ZpbGVJY29uQ2xhc3MnLCAoKSA9PiBpY29uQ2xhc3MpO1xuXG4gIF9tb2R1bGUucnVuKFtcIiRsb2NhdGlvblwiLFwidmlld1JlZ2lzdHJ5XCIsICBcImxvY2FsU3RvcmFnZVwiLCBcImxheW91dEZ1bGxcIiwgXCJoZWxwUmVnaXN0cnlcIiwgXCJwcmVmZXJlbmNlc1JlZ2lzdHJ5XCIsIFwid2lraVJlcG9zaXRvcnlcIixcbiAgICBcIiRyb290U2NvcGVcIiwgKCRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLFxuICAgICAgICB2aWV3UmVnaXN0cnksXG4gICAgICAgIGxvY2FsU3RvcmFnZSxcbiAgICAgICAgbGF5b3V0RnVsbCxcbiAgICAgICAgaGVscFJlZ2lzdHJ5LFxuICAgICAgICBwcmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgICB3aWtpUmVwb3NpdG9yeSxcbiAgICAgICAgJHJvb3RTY29wZSkgPT4ge1xuXG4gICAgdmlld1JlZ2lzdHJ5Wyd3aWtpJ10gPSB0ZW1wbGF0ZVBhdGggKyAnbGF5b3V0V2lraS5odG1sJztcbi8qXG4gICAgaGVscFJlZ2lzdHJ5LmFkZFVzZXJEb2MoJ3dpa2knLCAncGx1Z2lucy93aWtpL2RvYy9oZWxwLm1kJywgKCkgPT4ge1xuICAgICAgcmV0dXJuIFdpa2kuaXNXaWtpRW5hYmxlZCh3b3Jrc3BhY2UsIGpvbG9raWEsIGxvY2FsU3RvcmFnZSk7XG4gICAgfSk7XG4qL1xuXG4vKlxuICAgIHByZWZlcmVuY2VzUmVnaXN0cnkuYWRkVGFiKFwiR2l0XCIsICdwbHVnaW5zL3dpa2kvaHRtbC9naXRQcmVmZXJlbmNlcy5odG1sJyk7XG4qL1xuXG4vKlxuICAgIHRhYiA9IHtcbiAgICAgIGlkOiBcIndpa2lcIixcbiAgICAgIGNvbnRlbnQ6IFwiV2lraVwiLFxuICAgICAgdGl0bGU6IFwiVmlldyBhbmQgZWRpdCB3aWtpIHBhZ2VzXCIsXG4gICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gV2lraS5pc1dpa2lFbmFibGVkKHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKSxcbiAgICAgIGhyZWY6ICgpID0+IFwiIy93aWtpL3ZpZXdcIixcbiAgICAgIGlzQWN0aXZlOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gd29ya3NwYWNlLmlzTGlua0FjdGl2ZShcIi93aWtpXCIpICYmICF3b3Jrc3BhY2UubGlua0NvbnRhaW5zKFwiZmFicmljXCIsIFwicHJvZmlsZXNcIikgJiYgIXdvcmtzcGFjZS5saW5rQ29udGFpbnMoXCJlZGl0RmVhdHVyZXNcIilcbiAgICB9O1xuICAgIHdvcmtzcGFjZS50b3BMZXZlbFRhYnMucHVzaCh0YWIpO1xuKi9cblxuICAgIC8vIGFkZCBlbXB0eSByZWdleHMgdG8gdGVtcGxhdGVzIHRoYXQgZG9uJ3QgZGVmaW5lXG4gICAgLy8gdGhlbSBzbyBuZy1wYXR0ZXJuIGRvZXNuJ3QgYmFyZlxuICAgIFdpa2kuZG9jdW1lbnRUZW1wbGF0ZXMuZm9yRWFjaCgodGVtcGxhdGU6IGFueSkgPT4ge1xuICAgICAgaWYgKCF0ZW1wbGF0ZVsncmVnZXgnXSkge1xuICAgICAgICB0ZW1wbGF0ZS5yZWdleCA9IC8oPzopLztcbiAgICAgIH1cbiAgICB9KTtcblxuICB9XSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3dpa2lQbHVnaW4udHNcIi8+XG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IHZhciBDYW1lbENvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkNhbWVsQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkcm9vdFNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGNvbXBpbGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcImxvY2FsU3RvcmFnZVwiLCAoJHNjb3BlLCAkcm9vdFNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgJGNvbXBpbGUsICR0ZW1wbGF0ZUNhY2hlLCBsb2NhbFN0b3JhZ2U6V2luZG93TG9jYWxTdG9yYWdlKSA9PiB7XG5cbiAgICAvLyBUT0RPIFJFTU9WRVxuICAgIHZhciBqb2xva2lhID0gbnVsbDtcbiAgICB2YXIgam9sb2tpYVN0YXR1cyA9IG51bGw7XG4gICAgdmFyIGpteFRyZWVMYXp5TG9hZFJlZ2lzdHJ5ID0gbnVsbDtcbiAgICB2YXIgdXNlckRldGFpbHMgPSBudWxsO1xuICAgIHZhciBIYXd0aW9OYXYgPSBudWxsO1xuICAgIHZhciB3b3Jrc3BhY2UgPSBuZXcgV29ya3NwYWNlKGpvbG9raWEsIGpvbG9raWFTdGF0dXMsIGpteFRyZWVMYXp5TG9hZFJlZ2lzdHJ5LCAkbG9jYXRpb24sICRjb21waWxlLCAkdGVtcGxhdGVDYWNoZSwgbG9jYWxTdG9yYWdlLCAkcm9vdFNjb3BlLCB1c2VyRGV0YWlscywgSGF3dGlvTmF2KTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIENhbWVsLmluaXRFbmRwb2ludENob29zZXJTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgbG9jYWxTdG9yYWdlLCB3b3Jrc3BhY2UsIGpvbG9raWEpO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5zY2hlbWEgPSBDYW1lbC5nZXRDb25maWd1cmVkQ2FtZWxNb2RlbCgpO1xuICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLnN3aXRjaFRvQ2FudmFzVmlldyA9IG5ldyBVSS5EaWFsb2coKTtcblxuICAgICRzY29wZS5maW5kUHJvZmlsZUNhbWVsQ29udGV4dCA9IHRydWU7XG4gICAgJHNjb3BlLmNhbWVsU2VsZWN0aW9uRGV0YWlscyA9IHtcbiAgICAgIHNlbGVjdGVkQ2FtZWxDb250ZXh0SWQ6IG51bGwsXG4gICAgICBzZWxlY3RlZFJvdXRlSWQ6IG51bGxcbiAgICB9O1xuXG4gICAgJHNjb3BlLmlzVmFsaWQgPSAobmF2KSA9PiB7XG4gICAgICByZXR1cm4gbmF2ICYmIG5hdi5pc1ZhbGlkKHdvcmtzcGFjZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jYW1lbFN1YkxldmVsVGFicyA9IFtcbiAgICAgIC8qe1xuICAgICAgICBjb250ZW50OiAnPGkgY2xhc3M9XCJpY29uLXBpY3R1cmVcIj48L2k+IENhbnZhcycsXG4gICAgICAgIHRpdGxlOiBcIkVkaXQgdGhlIGRpYWdyYW0gaW4gYSBkcmFnZ3kgZHJvcHB5IHdheVwiLFxuICAgICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gdHJ1ZSxcbiAgICAgICAgaHJlZjogKCkgPT4gV2lraS5zdGFydExpbmsoJHNjb3BlLmJyYW5jaCkgKyBcIi9jYW1lbC9jYW52YXMvXCIgKyAkc2NvcGUucGFnZUlkXG4gICAgICB9LFxuICAgICAgKi97XG4gICAgICAgIGNvbnRlbnQ6ICc8aSBjbGFzcz1cIiBpY29uLXNpdGVtYXBcIj48L2k+IFRyZWUnLFxuICAgICAgICB0aXRsZTogXCJWaWV3IHRoZSByb3V0ZXMgYXMgYSB0cmVlXCIsXG4gICAgICAgIGlzVmFsaWQ6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiB0cnVlLFxuICAgICAgICBocmVmOiAoKSA9PiBXaWtpLnN0YXJ0TGluaygkc2NvcGUuYnJhbmNoKSArIFwiL2NhbWVsL3Byb3BlcnRpZXMvXCIgKyAkc2NvcGUucGFnZUlkXG4gICAgICB9LFxuICAgICAgLypcbiAgICAgICB7XG4gICAgICAgY29udGVudDogJzxpIGNsYXNzPVwiaWNvbi1zaXRlbWFwXCI+PC9pPiBEaWFncmFtJyxcbiAgICAgICB0aXRsZTogXCJWaWV3IGEgZGlhZ3JhbSBvZiB0aGUgcm91dGVcIixcbiAgICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gdHJ1ZSxcbiAgICAgICBocmVmOiAoKSA9PiBXaWtpLnN0YXJ0TGluaygkc2NvcGUuYnJhbmNoKSArIFwiL2NhbWVsL2RpYWdyYW0vXCIgKyAkc2NvcGUucGFnZUlkXG4gICAgICAgfSxcbiAgICAgICAqL1xuICAgIF07XG5cbiAgICB2YXIgcm91dGVNb2RlbCA9IF9hcGFjaGVDYW1lbE1vZGVsLmRlZmluaXRpb25zLnJvdXRlO1xuICAgIHJvdXRlTW9kZWxbXCJfaWRcIl0gPSBcInJvdXRlXCI7XG5cbiAgICAkc2NvcGUuYWRkRGlhbG9nID0gbmV3IFVJLkRpYWxvZygpO1xuXG4gICAgLy8gVE9ETyBkb2Vzbid0IHNlZW0gdGhhdCBhbmd1bGFyLXVpIHVzZXMgdGhlc2U/XG4gICAgJHNjb3BlLmFkZERpYWxvZy5vcHRpb25zW1wiZGlhbG9nQ2xhc3NcIl0gPSBcIm1vZGFsLWxhcmdlXCI7XG4gICAgJHNjb3BlLmFkZERpYWxvZy5vcHRpb25zW1wiY3NzQ2xhc3NcIl0gPSBcIm1vZGFsLWxhcmdlXCI7XG5cbiAgICAkc2NvcGUucGFsZXR0ZUl0ZW1TZWFyY2ggPSBcIlwiO1xuICAgICRzY29wZS5wYWxldHRlVHJlZSA9IG5ldyBGb2xkZXIoXCJQYWxldHRlXCIpO1xuICAgICRzY29wZS5wYWxldHRlQWN0aXZhdGlvbnMgPSBbXCJSb3V0aW5nX2FnZ3JlZ2F0ZVwiXTtcblxuICAgIC8vIGxvYWQgJHNjb3BlLnBhbGV0dGVUcmVlXG4gICAgYW5ndWxhci5mb3JFYWNoKF9hcGFjaGVDYW1lbE1vZGVsLmRlZmluaXRpb25zLCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgaWYgKHZhbHVlLmdyb3VwKSB7XG4gICAgICAgIHZhciBncm91cCA9IChrZXkgPT09IFwicm91dGVcIikgPyAkc2NvcGUucGFsZXR0ZVRyZWUgOiAkc2NvcGUucGFsZXR0ZVRyZWUuZ2V0T3JFbHNlKHZhbHVlLmdyb3VwKTtcbiAgICAgICAgaWYgKCFncm91cC5rZXkpIHtcbiAgICAgICAgICBncm91cC5rZXkgPSB2YWx1ZS5ncm91cDtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZVtcIl9pZFwiXSA9IGtleTtcbiAgICAgICAgdmFyIHRpdGxlID0gdmFsdWVbXCJ0aXRsZVwiXSB8fCBrZXk7XG4gICAgICAgIHZhciBub2RlID0gbmV3IEZvbGRlcih0aXRsZSk7XG4gICAgICAgIG5vZGUua2V5ID0gZ3JvdXAua2V5ICsgXCJfXCIgKyBrZXk7XG4gICAgICAgIG5vZGVbXCJub2RlTW9kZWxcIl0gPSB2YWx1ZTtcbiAgICAgICAgdmFyIGltYWdlVXJsID0gQ2FtZWwuZ2V0Um91dGVOb2RlSWNvbih2YWx1ZSk7XG4gICAgICAgIG5vZGUuaWNvbiA9IGltYWdlVXJsO1xuICAgICAgICAvLyBjb21waWxlciB3YXMgY29tcGxhaW5pbmcgYWJvdXQgJ2xhYmVsJyBoYWQgbm8gaWRlYSB3aGVyZSBpdCdzIGNvbWluZyBmcm9tXG4gICAgICAgIC8vIHZhciB0b29sdGlwID0gdmFsdWVbXCJ0b29sdGlwXCJdIHx8IHZhbHVlW1wiZGVzY3JpcHRpb25cIl0gfHwgbGFiZWw7XG4gICAgICAgIHZhciB0b29sdGlwID0gdmFsdWVbXCJ0b29sdGlwXCJdIHx8IHZhbHVlW1wiZGVzY3JpcHRpb25cIl0gfHwgJyc7XG4gICAgICAgIG5vZGUudG9vbHRpcCA9IHRvb2x0aXA7XG5cbiAgICAgICAgZ3JvdXAuY2hpbGRyZW4ucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGxvYWQgJHNjb3BlLmNvbXBvbmVudFRyZWVcbiAgICAkc2NvcGUuY29tcG9uZW50VHJlZSA9IG5ldyBGb2xkZXIoXCJFbmRwb2ludHNcIik7XG5cbiAgICAkc2NvcGUuJHdhdGNoKFwiY29tcG9uZW50TmFtZXNcIiwgKCkgPT4ge1xuICAgICAgdmFyIGNvbXBvbmVudE5hbWVzID0gJHNjb3BlLmNvbXBvbmVudE5hbWVzO1xuICAgICAgaWYgKGNvbXBvbmVudE5hbWVzICYmIGNvbXBvbmVudE5hbWVzLmxlbmd0aCkge1xuICAgICAgICAkc2NvcGUuY29tcG9uZW50VHJlZSA9IG5ldyBGb2xkZXIoXCJFbmRwb2ludHNcIik7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuY29tcG9uZW50TmFtZXMsIChlbmRwb2ludE5hbWUpID0+IHtcbiAgICAgICAgICB2YXIgY2F0ZWdvcnkgPSBDYW1lbC5nZXRFbmRwb2ludENhdGVnb3J5KGVuZHBvaW50TmFtZSk7XG4gICAgICAgICAgdmFyIGdyb3VwTmFtZSA9IGNhdGVnb3J5LmxhYmVsIHx8IFwiQ29yZVwiO1xuICAgICAgICAgIHZhciBncm91cEtleSA9IGNhdGVnb3J5LmlkIHx8IGdyb3VwTmFtZTtcbiAgICAgICAgICB2YXIgZ3JvdXAgPSAkc2NvcGUuY29tcG9uZW50VHJlZS5nZXRPckVsc2UoZ3JvdXBOYW1lKTtcblxuICAgICAgICAgIHZhciB2YWx1ZSA9IENhbWVsLmdldEVuZHBvaW50Q29uZmlnKGVuZHBvaW50TmFtZSwgY2F0ZWdvcnkpO1xuICAgICAgICAgIHZhciBrZXkgPSBlbmRwb2ludE5hbWU7XG4gICAgICAgICAgdmFyIGxhYmVsID0gdmFsdWVbXCJsYWJlbFwiXSB8fCBlbmRwb2ludE5hbWU7XG4gICAgICAgICAgdmFyIG5vZGUgPSBuZXcgRm9sZGVyKGxhYmVsKTtcbiAgICAgICAgICBub2RlLmtleSA9IGdyb3VwS2V5ICsgXCJfXCIgKyBrZXk7XG4gICAgICAgICAgbm9kZS5rZXkgPSBrZXk7XG4gICAgICAgICAgbm9kZVtcIm5vZGVNb2RlbFwiXSA9IHZhbHVlO1xuICAgICAgICAgIHZhciB0b29sdGlwID0gdmFsdWVbXCJ0b29sdGlwXCJdIHx8IHZhbHVlW1wiZGVzY3JpcHRpb25cIl0gfHwgbGFiZWw7XG4gICAgICAgICAgdmFyIGltYWdlVXJsID0gQ29yZS51cmwodmFsdWVbXCJpY29uXCJdIHx8IENhbWVsLmVuZHBvaW50SWNvbik7XG4gICAgICAgICAgbm9kZS5pY29uID0gaW1hZ2VVcmw7XG4gICAgICAgICAgbm9kZS50b29sdGlwID0gdG9vbHRpcDtcblxuICAgICAgICAgIGdyb3VwLmNoaWxkcmVuLnB1c2gobm9kZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgICRzY29wZS5jb21wb25lbnRBY3RpdmF0aW9ucyA9IFtcImJlYW5cIl07XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdhZGREaWFsb2cuc2hvdycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICgkc2NvcGUuYWRkRGlhbG9nLnNob3cpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJCgnI3N1Ym1pdCcpLmZvY3VzKCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oXCJoYXd0aW8uZm9ybS5tb2RlbENoYW5nZVwiLCBvbk1vZGVsQ2hhbmdlRXZlbnQpO1xuXG4gICAgJHNjb3BlLm9uUm9vdFRyZWVOb2RlID0gKHJvb3RUcmVlTm9kZSkgPT4ge1xuICAgICAgJHNjb3BlLnJvb3RUcmVlTm9kZSA9IHJvb3RUcmVlTm9kZTtcbiAgICAgIC8vIHJlc3RvcmUgdGhlIHJlYWwgZGF0YSBhdCB0aGUgcm9vdCBmb3Igc2F2aW5nIHRoZSBkb2MgZXRjXG4gICAgICByb290VHJlZU5vZGUuZGF0YSA9ICRzY29wZS5jYW1lbENvbnRleHRUcmVlO1xuICAgIH07XG5cbiAgICAkc2NvcGUuYWRkTm9kZSA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUubm9kZVhtbE5vZGUpIHtcbiAgICAgICAgJHNjb3BlLmFkZERpYWxvZy5vcGVuKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhZGROZXdOb2RlKHJvdXRlTW9kZWwpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUub25QYWxldHRlU2VsZWN0ID0gKG5vZGUpID0+IHtcbiAgICAgICRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlID0gKG5vZGUgJiYgbm9kZVtcIm5vZGVNb2RlbFwiXSkgPyBub2RlIDogbnVsbDtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSkge1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKFwiU2VsZWN0ZWQgXCIgKyAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSArIFwiIDogXCIgKyAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uQ29tcG9uZW50U2VsZWN0ID0gKG5vZGUpID0+IHtcbiAgICAgICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUgPSAobm9kZSAmJiBub2RlW1wibm9kZU1vZGVsXCJdKSA/IG5vZGUgOiBudWxsO1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUgPSBudWxsO1xuICAgICAgICB2YXIgbm9kZU5hbWUgPSBub2RlLmtleTtcbiAgICAgICAgY29uc29sZS5sb2coXCJsb2FkaW5nIGVuZHBvaW50IHNjaGVtYSBmb3Igbm9kZSBcIiArIG5vZGVOYW1lKTtcbiAgICAgICAgJHNjb3BlLmxvYWRFbmRwb2ludFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5hbWUgPSBub2RlTmFtZTtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKFwiU2VsZWN0ZWQgXCIgKyAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSArIFwiIDogXCIgKyAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNlbGVjdGVkTm9kZU1vZGVsID0gKCkgPT4ge1xuICAgICAgdmFyIG5vZGVNb2RlbCA9IG51bGw7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUpIHtcbiAgICAgICAgbm9kZU1vZGVsID0gJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGVbXCJub2RlTW9kZWxcIl07XG4gICAgICAgICRzY29wZS5lbmRwb2ludENvbmZpZyA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKCRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUpIHtcbiAgICAgICAgLy8gVE9ETyBsZXN0IGNyZWF0ZSBhbiBlbmRwb2ludCBub2RlTW9kZWwgYW5kIGFzc29jaWF0ZVxuICAgICAgICAvLyB0aGUgZHVtbXkgVVJMIGFuZCBwcm9wZXJ0aWVzIGV0Yy4uLlxuICAgICAgICB2YXIgZW5kcG9pbnRDb25maWcgPSAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlW1wibm9kZU1vZGVsXCJdO1xuICAgICAgICB2YXIgZW5kcG9pbnRTY2hlbWEgPSAkc2NvcGUuZW5kcG9pbnRTY2hlbWE7XG4gICAgICAgIG5vZGVNb2RlbCA9ICRzY29wZS5zY2hlbWEuZGVmaW5pdGlvbnMuZW5kcG9pbnQ7XG4gICAgICAgICRzY29wZS5lbmRwb2ludENvbmZpZyA9IHtcbiAgICAgICAgICBrZXk6ICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUua2V5LFxuICAgICAgICAgIHNjaGVtYTogZW5kcG9pbnRTY2hlbWEsXG4gICAgICAgICAgZGV0YWlsczogZW5kcG9pbnRDb25maWdcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlTW9kZWw7XG4gICAgfTtcblxuICAgICRzY29wZS5hZGRBbmRDbG9zZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBub2RlTW9kZWwgPSAkc2NvcGUuc2VsZWN0ZWROb2RlTW9kZWwoKTtcbiAgICAgIGlmIChub2RlTW9kZWwpIHtcbiAgICAgICAgYWRkTmV3Tm9kZShub2RlTW9kZWwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJXQVJOSU5HOiBubyBub2RlTW9kZWwhXCIpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLmFkZERpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmVtb3ZlTm9kZSA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgJiYgJHNjb3BlLnRyZWVOb2RlKSB7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZEZvbGRlci5kZXRhY2goKTtcbiAgICAgICAgJHNjb3BlLnRyZWVOb2RlLnJlbW92ZSgpO1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgPSBudWxsO1xuICAgICAgICAkc2NvcGUudHJlZU5vZGUgPSBudWxsO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY2FuRGVsZXRlID0gKCkgPT4ge1xuICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZEZvbGRlciA/IHRydWUgOiBmYWxzZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmlzQWN0aXZlID0gKG5hdikgPT4ge1xuICAgICAgaWYgKGFuZ3VsYXIuaXNTdHJpbmcobmF2KSlcbiAgICAgICAgcmV0dXJuIHdvcmtzcGFjZS5pc0xpbmtBY3RpdmUobmF2KTtcbiAgICAgIHZhciBmbiA9IG5hdi5pc0FjdGl2ZTtcbiAgICAgIGlmIChmbikge1xuICAgICAgICByZXR1cm4gZm4od29ya3NwYWNlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB3b3Jrc3BhY2UuaXNMaW5rQWN0aXZlKG5hdi5ocmVmKCkpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZSA9ICgpID0+IHtcbiAgICAgIC8vIGdlbmVyYXRlIHRoZSBuZXcgWE1MXG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkICYmICRzY29wZS5yb290VHJlZU5vZGUpIHtcbiAgICAgICAgdmFyIHhtbE5vZGUgPSBDYW1lbC5nZW5lcmF0ZVhtbEZyb21Gb2xkZXIoJHNjb3BlLnJvb3RUcmVlTm9kZSk7XG4gICAgICAgIGlmICh4bWxOb2RlKSB7XG4gICAgICAgICAgdmFyIHRleHQgPSBDb3JlLnhtbE5vZGVUb1N0cmluZyh4bWxOb2RlKTtcbiAgICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgLy8gbGV0cyBzYXZlIHRoZSBmaWxlLi4uXG4gICAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9ICRzY29wZS5jb21taXRNZXNzYWdlIHx8IFwiVXBkYXRlZCBwYWdlIFwiICsgJHNjb3BlLnBhZ2VJZDtcbiAgICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgdGV4dCwgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiU2F2ZWQgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICAgICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiY2FuY2VsbGluZy4uLlwiKTtcbiAgICAgIC8vIFRPRE8gc2hvdyBkaWFsb2cgaWYgZm9sa3MgYXJlIGFib3V0IHRvIGxvc2UgY2hhbmdlcy4uLlxuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKCd3b3Jrc3BhY2UudHJlZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghJHNjb3BlLmdpdCkge1xuICAgICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiUmVsb2FkaW5nIHRoZSB2aWV3IGFzIHdlIG5vdyBzZWVtIHRvIGhhdmUgYSBnaXQgbWJlYW4hXCIpO1xuICAgICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGdldEZvbGRlclhtbE5vZGUodHJlZU5vZGUpIHtcbiAgICAgIHZhciByb3V0ZVhtbE5vZGUgPSBDYW1lbC5jcmVhdGVGb2xkZXJYbWxUcmVlKHRyZWVOb2RlLCBudWxsKTtcbiAgICAgIGlmIChyb3V0ZVhtbE5vZGUpIHtcbiAgICAgICAgJHNjb3BlLm5vZGVYbWxOb2RlID0gcm91dGVYbWxOb2RlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJvdXRlWG1sTm9kZTtcbiAgICB9XG5cbiAgICAkc2NvcGUub25Ob2RlU2VsZWN0ID0gKGZvbGRlciwgdHJlZU5vZGUpID0+IHtcbiAgICAgICRzY29wZS5zZWxlY3RlZEZvbGRlciA9IGZvbGRlcjtcbiAgICAgICRzY29wZS50cmVlTm9kZSA9IHRyZWVOb2RlO1xuICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IG51bGw7XG4gICAgICAkc2NvcGUuZGlhZ3JhbVRlbXBsYXRlID0gbnVsbDtcbiAgICAgICRzY29wZS5ub2RlWG1sTm9kZSA9IG51bGw7XG4gICAgICBpZiAoZm9sZGVyKSB7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YSA9IENhbWVsLmdldFJvdXRlRm9sZGVySlNPTihmb2xkZXIpO1xuICAgICAgICAkc2NvcGUubm9kZURhdGFDaGFuZ2VkRmllbGRzID0ge307XG4gICAgICB9XG4gICAgICB2YXIgbm9kZU5hbWUgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChmb2xkZXIpO1xuICAgICAgLy8gbGV0cyBsYXppbHkgY3JlYXRlIHRoZSBYTUwgdHJlZSBzbyBpdCBjYW4gYmUgdXNlZCBieSB0aGUgZGlhZ3JhbVxuICAgICAgdmFyIHJvdXRlWG1sTm9kZSA9IGdldEZvbGRlclhtbE5vZGUodHJlZU5vZGUpO1xuICAgICAgaWYgKG5vZGVOYW1lKSB7XG4gICAgICAgIC8vdmFyIG5vZGVOYW1lID0gcm91dGVYbWxOb2RlLmxvY2FsTmFtZTtcbiAgICAgICAgJHNjb3BlLm5vZGVNb2RlbCA9IENhbWVsLmdldENhbWVsU2NoZW1hKG5vZGVOYW1lKTtcbiAgICAgICAgaWYgKCRzY29wZS5ub2RlTW9kZWwpIHtcbiAgICAgICAgICAkc2NvcGUucHJvcGVydGllc1RlbXBsYXRlID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9jYW1lbFByb3BlcnRpZXNFZGl0Lmh0bWxcIjtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuZGlhZ3JhbVRlbXBsYXRlID0gXCJhcHAvY2FtZWwvaHRtbC9yb3V0ZXMuaHRtbFwiO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUub25Ob2RlRHJhZ0VudGVyID0gKG5vZGUsIHNvdXJjZU5vZGUpID0+IHtcbiAgICAgIHZhciBub2RlRm9sZGVyID0gbm9kZS5kYXRhO1xuICAgICAgdmFyIHNvdXJjZUZvbGRlciA9IHNvdXJjZU5vZGUuZGF0YTtcbiAgICAgIGlmIChub2RlRm9sZGVyICYmIHNvdXJjZUZvbGRlcikge1xuICAgICAgICB2YXIgbm9kZUlkID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQobm9kZUZvbGRlcik7XG4gICAgICAgIHZhciBzb3VyY2VJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKHNvdXJjZUZvbGRlcik7XG4gICAgICAgIGlmIChub2RlSWQgJiYgc291cmNlSWQpIHtcbiAgICAgICAgICAvLyB3ZSBjYW4gb25seSBkcmFnIHJvdXRlcyBvbnRvIG90aGVyIHJvdXRlcyAoYmVmb3JlIC8gYWZ0ZXIgLyBvdmVyKVxuICAgICAgICAgIGlmIChzb3VyY2VJZCA9PT0gXCJyb3V0ZVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZUlkID09PSBcInJvdXRlXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgICRzY29wZS5vbk5vZGVEcm9wID0gKG5vZGUsIHNvdXJjZU5vZGUsIGhpdE1vZGUsIHVpLCBkcmFnZ2FibGUpID0+IHtcbiAgICAgIHZhciBub2RlRm9sZGVyID0gbm9kZS5kYXRhO1xuICAgICAgdmFyIHNvdXJjZUZvbGRlciA9IHNvdXJjZU5vZGUuZGF0YTtcbiAgICAgIGlmIChub2RlRm9sZGVyICYmIHNvdXJjZUZvbGRlcikge1xuICAgICAgICAvLyB3ZSBjYW5ub3QgZHJvcCBhIHJvdXRlIGludG8gYSByb3V0ZSBvciBhIG5vbi1yb3V0ZSB0byBhIHRvcCBsZXZlbCFcbiAgICAgICAgdmFyIG5vZGVJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKG5vZGVGb2xkZXIpO1xuICAgICAgICB2YXIgc291cmNlSWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChzb3VyY2VGb2xkZXIpO1xuXG4gICAgICAgIGlmIChub2RlSWQgPT09IFwicm91dGVcIikge1xuICAgICAgICAgIC8vIGhpdE1vZGUgbXVzdCBiZSBcIm92ZXJcIiBpZiB3ZSBhcmUgbm90IGFub3RoZXIgcm91dGVcbiAgICAgICAgICBpZiAoc291cmNlSWQgPT09IFwicm91dGVcIikge1xuICAgICAgICAgICAgaWYgKGhpdE1vZGUgPT09IFwib3ZlclwiKSB7XG4gICAgICAgICAgICAgIGhpdE1vZGUgPSBcImFmdGVyXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGRpc2FibGUgYmVmb3JlIC8gYWZ0ZXJcbiAgICAgICAgICAgIGhpdE1vZGUgPSBcIm92ZXJcIjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKENhbWVsLmFjY2VwdE91dHB1dChub2RlSWQpKSB7XG4gICAgICAgICAgICBoaXRNb2RlID0gXCJvdmVyXCI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChoaXRNb2RlICE9PSBcImJlZm9yZVwiKSB7XG4gICAgICAgICAgICAgIGhpdE1vZGUgPSBcImFmdGVyXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKFwibm9kZURyb3Agbm9kZUlkOiBcIiArIG5vZGVJZCArIFwiIHNvdXJjZUlkOiBcIiArIHNvdXJjZUlkICsgXCIgaGl0TW9kZTogXCIgKyBoaXRNb2RlKTtcblxuICAgICAgICBzb3VyY2VOb2RlLm1vdmUobm9kZSwgaGl0TW9kZSk7XG4gICAgICB9XG4gICAgfTtcblxuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gYWRkTmV3Tm9kZShub2RlTW9kZWwpIHtcbiAgICAgIHZhciBkb2MgPSAkc2NvcGUuZG9jIHx8IGRvY3VtZW50O1xuICAgICAgdmFyIHBhcmVudEZvbGRlciA9ICRzY29wZS5zZWxlY3RlZEZvbGRlciB8fCAkc2NvcGUuY2FtZWxDb250ZXh0VHJlZTtcbiAgICAgIHZhciBrZXkgPSBub2RlTW9kZWxbXCJfaWRcIl07XG4gICAgICB2YXIgYmVmb3JlTm9kZSA9IG51bGw7XG4gICAgICBpZiAoIWtleSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIldBUk5JTkc6IG5vIGlkIGZvciBtb2RlbCBcIiArIEpTT04uc3RyaW5naWZ5KG5vZGVNb2RlbCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRyZWVOb2RlID0gJHNjb3BlLnRyZWVOb2RlO1xuICAgICAgICBpZiAoa2V5ID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAvLyBsZXRzIGFkZCB0byB0aGUgcm9vdCBvZiB0aGUgdHJlZVxuICAgICAgICAgIHRyZWVOb2RlID0gJHNjb3BlLnJvb3RUcmVlTm9kZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoIXRyZWVOb2RlKSB7XG4gICAgICAgICAgICAvLyBsZXRzIHNlbGVjdCB0aGUgbGFzdCByb3V0ZSAtIGFuZCBjcmVhdGUgYSBuZXcgcm91dGUgaWYgbmVlZCBiZVxuICAgICAgICAgICAgdmFyIHJvb3QgPSAkc2NvcGUucm9vdFRyZWVOb2RlO1xuICAgICAgICAgICAgdmFyIGNoaWxkcmVuID0gcm9vdC5nZXRDaGlsZHJlbigpO1xuICAgICAgICAgICAgaWYgKCFjaGlsZHJlbiB8fCAhY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIGFkZE5ld05vZGUoQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEoXCJyb3V0ZVwiKSk7XG4gICAgICAgICAgICAgIGNoaWxkcmVuID0gcm9vdC5nZXRDaGlsZHJlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICB0cmVlTm9kZSA9IGNoaWxkcmVuW2NoaWxkcmVuLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZCBub3QgYWRkIGEgbmV3IHJvdXRlIHRvIHRoZSBlbXB0eSB0cmVlIVwiKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuXG4gICAgICAgICAgLy8gaWYgdGhlIHBhcmVudCBmb2xkZXIgbGlrZXMgdG8gYWN0IGFzIGEgcGlwZWxpbmUsIHRoZW4gYWRkXG4gICAgICAgICAgLy8gYWZ0ZXIgdGhlIHBhcmVudCwgcmF0aGVyIHRoYW4gYXMgYSBjaGlsZFxuICAgICAgICAgIHZhciBwYXJlbnRJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKHRyZWVOb2RlLmRhdGEpO1xuICAgICAgICAgIGlmICghQ2FtZWwuYWNjZXB0T3V0cHV0KHBhcmVudElkKSkge1xuICAgICAgICAgICAgLy8gbGV0cyBhZGQgdGhlIG5ldyBub2RlIHRvIHRoZSBlbmQgb2YgdGhlIHBhcmVudFxuICAgICAgICAgICAgYmVmb3JlTm9kZSA9IHRyZWVOb2RlLmdldE5leHRTaWJsaW5nKCk7XG4gICAgICAgICAgICB0cmVlTm9kZSA9IHRyZWVOb2RlLmdldFBhcmVudCgpIHx8IHRyZWVOb2RlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodHJlZU5vZGUpIHtcbiAgICAgICAgICB2YXIgbm9kZSA9IGRvYy5jcmVhdGVFbGVtZW50KGtleSk7XG4gICAgICAgICAgcGFyZW50Rm9sZGVyID0gdHJlZU5vZGUuZGF0YTtcbiAgICAgICAgICB2YXIgYWRkZWROb2RlID0gQ2FtZWwuYWRkUm91dGVDaGlsZChwYXJlbnRGb2xkZXIsIG5vZGUpO1xuICAgICAgICAgIGlmIChhZGRlZE5vZGUpIHtcbiAgICAgICAgICAgIHZhciBhZGRlZCA9IHRyZWVOb2RlLmFkZENoaWxkKGFkZGVkTm9kZSwgYmVmb3JlTm9kZSk7XG4gICAgICAgICAgICBpZiAoYWRkZWQpIHtcbiAgICAgICAgICAgICAgZ2V0Rm9sZGVyWG1sTm9kZShhZGRlZCk7XG4gICAgICAgICAgICAgIGFkZGVkLmV4cGFuZCh0cnVlKTtcbiAgICAgICAgICAgICAgYWRkZWQuc2VsZWN0KHRydWUpO1xuICAgICAgICAgICAgICBhZGRlZC5hY3RpdmF0ZSh0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbk1vZGVsQ2hhbmdlRXZlbnQoZXZlbnQsIG5hbWUpIHtcbiAgICAgIC8vIGxldHMgZmlsdGVyIG91dCBldmVudHMgZHVlIHRvIHRoZSBub2RlIGNoYW5naW5nIGNhdXNpbmcgdGhlXG4gICAgICAvLyBmb3JtcyB0byBiZSByZWNyZWF0ZWRcbiAgICAgIGlmICgkc2NvcGUubm9kZURhdGEpIHtcbiAgICAgICAgdmFyIGZpZWxkTWFwID0gJHNjb3BlLm5vZGVEYXRhQ2hhbmdlZEZpZWxkcztcbiAgICAgICAgaWYgKGZpZWxkTWFwKSB7XG4gICAgICAgICAgaWYgKGZpZWxkTWFwW25hbWVdKSB7XG4gICAgICAgICAgICBvbk5vZGVEYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB0aGUgc2VsZWN0aW9uIGhhcyBqdXN0IGNoYW5nZWQgc28gd2UgZ2V0IHRoZSBpbml0aWFsIGV2ZW50XG4gICAgICAgICAgICAvLyB3ZSBjYW4gaWdub3JlIHRoaXMgOilcbiAgICAgICAgICAgIGZpZWxkTWFwW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbk5vZGVEYXRhQ2hhbmdlZCgpIHtcbiAgICAgICRzY29wZS5tb2RpZmllZCA9IHRydWU7XG4gICAgICB2YXIgc2VsZWN0ZWRGb2xkZXIgPSAkc2NvcGUuc2VsZWN0ZWRGb2xkZXI7XG4gICAgICBpZiAoJHNjb3BlLnRyZWVOb2RlICYmIHNlbGVjdGVkRm9sZGVyKSB7XG4gICAgICAgIHZhciByb3V0ZVhtbE5vZGUgPSBnZXRGb2xkZXJYbWxOb2RlKCRzY29wZS50cmVlTm9kZSk7XG4gICAgICAgIGlmIChyb3V0ZVhtbE5vZGUpIHtcbiAgICAgICAgICB2YXIgbm9kZU5hbWUgPSByb3V0ZVhtbE5vZGUubG9jYWxOYW1lO1xuICAgICAgICAgIHZhciBub2RlU2V0dGluZ3MgPSBDYW1lbC5nZXRDYW1lbFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgICAgaWYgKG5vZGVTZXR0aW5ncykge1xuICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSB0aXRsZSBhbmQgdG9vbHRpcCBldGNcbiAgICAgICAgICAgIENhbWVsLnVwZGF0ZVJvdXRlTm9kZUxhYmVsQW5kVG9vbHRpcChzZWxlY3RlZEZvbGRlciwgcm91dGVYbWxOb2RlLCBub2RlU2V0dGluZ3MpO1xuICAgICAgICAgICAgJHNjb3BlLnRyZWVOb2RlLnJlbmRlcihmYWxzZSwgZmFsc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIG5vdCBzdXJlIHdlIG5lZWQgdGhpcyB0byBiZSBob25lc3RcbiAgICAgICAgc2VsZWN0ZWRGb2xkZXJbXCJjYW1lbE5vZGVEYXRhXCJdID0gJHNjb3BlLm5vZGVEYXRhO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUmVzdWx0cyhyZXNwb25zZSkge1xuICAgICAgdmFyIHRleHQgPSByZXNwb25zZS50ZXh0O1xuICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgLy8gbGV0cyByZW1vdmUgYW55IGRvZGd5IGNoYXJhY3RlcnMgc28gd2UgY2FuIHVzZSBpdCBhcyBhIERPTSBpZFxuICAgICAgICB2YXIgdHJlZSA9IENhbWVsLmxvYWRDYW1lbFRyZWUodGV4dCwgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgIGlmICh0cmVlKSB7XG4gICAgICAgICAgJHNjb3BlLmNhbWVsQ29udGV4dFRyZWUgPSB0cmVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIk5vIFhNTCBmb3VuZCBmb3IgcGFnZSBcIiArICRzY29wZS5wYWdlSWQpO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHlMYXRlcigkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICAkc2NvcGUubG9hZEVuZHBvaW50TmFtZXMoKTtcbiAgICAgICRzY29wZS5wYWdlSWQgPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgICBjb25zb2xlLmxvZyhcIkhhcyBwYWdlIGlkOiBcIiArICRzY29wZS5wYWdlSWQgKyBcIiB3aXRoICRyb3V0ZVBhcmFtcyBcIiArIEpTT04uc3RyaW5naWZ5KCRyb3V0ZVBhcmFtcykpO1xuXG4gICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsICRzY29wZS5vYmplY3RJZCwgb25SZXN1bHRzKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGdvVG9WaWV3KCkge1xuICAgICAgLy8gVE9ETyBsZXRzIG5hdmlnYXRlIHRvIHRoZSB2aWV3IGlmIHdlIGhhdmUgYSBzZXBhcmF0ZSB2aWV3IG9uZSBkYXkgOilcbiAgICAgIC8qXG4gICAgICAgaWYgKCRzY29wZS5icmVhZGNydW1icyAmJiAkc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoID4gMSkge1xuICAgICAgIHZhciB2aWV3TGluayA9ICRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMl07XG4gICAgICAgY29uc29sZS5sb2coXCJnb1RvVmlldyBoYXMgZm91bmQgdmlldyBcIiArIHZpZXdMaW5rKTtcbiAgICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcodmlld0xpbmssIFwiI1wiKTtcbiAgICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgIGNvbnNvbGUubG9nKFwiZ29Ub1ZpZXcgaGFzIG5vIGJyZWFkY3J1bWJzIVwiKTtcbiAgICAgICB9XG4gICAgICAgKi9cbiAgICB9XG5cbiAgICAkc2NvcGUuZG9Td2l0Y2hUb0NhbnZhc1ZpZXcgPSAoKSA9PiB7XG4gICAgICAkbG9jYXRpb24udXJsKENvcmUudHJpbUxlYWRpbmcoKFdpa2kuc3RhcnRMaW5rKCRzY29wZS5icmFuY2gpICsgXCIvY2FtZWwvY2FudmFzL1wiICsgJHNjb3BlLnBhZ2VJZCksICcjJykpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY29uZmlybVN3aXRjaFRvQ2FudmFzVmlldyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQpIHtcbiAgICAgICAgJHNjb3BlLnN3aXRjaFRvQ2FudmFzVmlldy5vcGVuKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuZG9Td2l0Y2hUb0NhbnZhc1ZpZXcoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gIH1dKTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3dpa2lQbHVnaW4udHNcIi8+XG5tb2R1bGUgV2lraSB7XG4gIGV4cG9ydCB2YXIgQ2FtZWxDYW52YXNDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5DYW1lbENhbnZhc0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRpbnRlcnBvbGF0ZVwiLCBcIiRsb2NhdGlvblwiLCAoJHNjb3BlLCAkZWxlbWVudCwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgJGludGVycG9sYXRlLCAkbG9jYXRpb24pID0+IHtcbiAgICB2YXIganNQbHVtYkluc3RhbmNlID0ganNQbHVtYi5nZXRJbnN0YW5jZSgpO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmFkZERpYWxvZyA9IG5ldyBVSS5EaWFsb2coKTtcbiAgICAkc2NvcGUucHJvcGVydGllc0RpYWxvZyA9IG5ldyBVSS5EaWFsb2coKTtcbiAgICAkc2NvcGUuc3dpdGNoVG9UcmVlVmlldyA9IG5ldyBVSS5EaWFsb2coKTtcbiAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcbiAgICAkc2NvcGUuY2FtZWxJZ25vcmVJZEZvckxhYmVsID0gQ2FtZWwuaWdub3JlSWRGb3JMYWJlbChsb2NhbFN0b3JhZ2UpO1xuICAgICRzY29wZS5jYW1lbE1heGltdW1MYWJlbFdpZHRoID0gQ2FtZWwubWF4aW11bUxhYmVsV2lkdGgobG9jYWxTdG9yYWdlKTtcbiAgICAkc2NvcGUuY2FtZWxNYXhpbXVtVHJhY2VPckRlYnVnQm9keUxlbmd0aCA9IENhbWVsLm1heGltdW1UcmFjZU9yRGVidWdCb2R5TGVuZ3RoKGxvY2FsU3RvcmFnZSk7XG5cbiAgICAkc2NvcGUuZm9ybXMgPSB7fTtcblxuICAgICRzY29wZS5ub2RlVGVtcGxhdGUgPSAkaW50ZXJwb2xhdGUoJHRlbXBsYXRlQ2FjaGUuZ2V0KFwibm9kZVRlbXBsYXRlXCIpKTtcblxuICAgICRzY29wZS4kd2F0Y2goXCJjYW1lbENvbnRleHRUcmVlXCIsICgpID0+IHtcbiAgICAgIHZhciB0cmVlID0gJHNjb3BlLmNhbWVsQ29udGV4dFRyZWU7XG4gICAgICAkc2NvcGUucm9vdEZvbGRlciA9IHRyZWU7XG4gICAgICAvLyBub3cgd2UndmUgZ290IGNpZCB2YWx1ZXMgaW4gdGhlIHRyZWUgYW5kIERPTSwgbGV0cyBjcmVhdGUgYW4gaW5kZXggc28gd2UgY2FuIGJpbmQgdGhlIERPTSB0byB0aGUgdHJlZSBtb2RlbFxuICAgICAgJHNjb3BlLmZvbGRlcnMgPSBDYW1lbC5hZGRGb2xkZXJzVG9JbmRleCgkc2NvcGUucm9vdEZvbGRlcik7XG5cbiAgICAgIHZhciBkb2MgPSBDb3JlLnBhdGhHZXQodHJlZSwgW1wieG1sRG9jdW1lbnRcIl0pO1xuICAgICAgaWYgKGRvYykge1xuICAgICAgICAkc2NvcGUuZG9jID0gZG9jO1xuICAgICAgICByZWxvYWRSb3V0ZUlkcygpO1xuICAgICAgICBvblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCgpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLmFkZEFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIG5vZGVNb2RlbCA9ICRzY29wZS5zZWxlY3RlZE5vZGVNb2RlbCgpO1xuICAgICAgaWYgKG5vZGVNb2RlbCkge1xuICAgICAgICBhZGROZXdOb2RlKG5vZGVNb2RlbCk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuYWRkRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5yZW1vdmVOb2RlID0gKCkgPT4ge1xuICAgICAgdmFyIGZvbGRlciA9IGdldFNlbGVjdGVkT3JSb3V0ZUZvbGRlcigpO1xuICAgICAgaWYgKGZvbGRlcikge1xuICAgICAgICB2YXIgbm9kZU5hbWUgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChmb2xkZXIpO1xuICAgICAgICBmb2xkZXIuZGV0YWNoKCk7XG4gICAgICAgIGlmIChcInJvdXRlXCIgPT09IG5vZGVOYW1lKSB7XG4gICAgICAgICAgLy8gbGV0cyBhbHNvIGNsZWFyIHRoZSBzZWxlY3RlZCByb3V0ZSBub2RlXG4gICAgICAgICAgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdXBkYXRlU2VsZWN0aW9uKG51bGwpO1xuICAgICAgICB0cmVlTW9kaWZpZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRvTGF5b3V0ID0gKCkgPT4ge1xuICAgICAgJHNjb3BlLmRyYXduUm91dGVJZCA9IG51bGw7XG4gICAgICBvblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCgpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBpc1JvdXRlT3JOb2RlKCkge1xuICAgICAgcmV0dXJuICEkc2NvcGUuc2VsZWN0ZWRGb2xkZXJcbiAgICB9XG5cbiAgICAkc2NvcGUuZ2V0RGVsZXRlVGl0bGUgPSAoKSA9PiB7XG4gICAgICBpZiAoaXNSb3V0ZU9yTm9kZSgpKSB7XG4gICAgICAgIHJldHVybiBcIkRlbGV0ZSB0aGlzIHJvdXRlXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gXCJEZWxldGUgdGhpcyBub2RlXCI7XG4gICAgfVxuXG4gICAgJHNjb3BlLmdldERlbGV0ZVRhcmdldCA9ICgpID0+IHtcbiAgICAgIGlmIChpc1JvdXRlT3JOb2RlKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiUm91dGVcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcIk5vZGVcIjtcbiAgICB9XG5cbiAgICAkc2NvcGUuaXNGb3JtRGlydHkgPSAoKSA9PiB7XG4gICAgICBsb2cuZGVidWcoXCJlbmRwb2ludEZvcm06IFwiLCAkc2NvcGUuZW5kcG9pbnRGb3JtKTtcbiAgICAgIGlmICgkc2NvcGUuZW5kcG9pbnRGb3JtLiRkaXJ0eSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICghJHNjb3BlLmZvcm1zWydmb3JtRWRpdG9yJ10pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICRzY29wZS5mb3Jtc1snZm9ybUVkaXRvciddWyckZGlydHknXTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyogVE9ET1xuICAgICAkc2NvcGUucmVzZXRGb3JtcyA9ICgpID0+IHtcblxuICAgICB9XG4gICAgICovXG5cbiAgICAvKlxuICAgICAqIENvbnZlcnRzIGEgcGF0aCBhbmQgYSBzZXQgb2YgZW5kcG9pbnQgcGFyYW1ldGVycyBpbnRvIGEgVVJJIHdlIGNhbiB0aGVuIHVzZSB0byBzdG9yZSBpbiB0aGUgWE1MXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRW5kcG9pbnRVUkkoZW5kcG9pbnRTY2hlbWU6c3RyaW5nLCBzbGFzaGVzVGV4dDpzdHJpbmcsIGVuZHBvaW50UGF0aDpzdHJpbmcsIGVuZHBvaW50UGFyYW1ldGVyczphbnkpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwic2NoZW1lIFwiICsgZW5kcG9pbnRTY2hlbWUgKyBcIiBwYXRoIFwiICsgZW5kcG9pbnRQYXRoICsgXCIgcGFyYW1ldGVycyBcIiArIGVuZHBvaW50UGFyYW1ldGVycyk7XG4gICAgICAvLyBub3cgbGV0cyBjcmVhdGUgdGhlIG5ldyBVUkkgZnJvbSB0aGUgcGF0aCBhbmQgcGFyYW1ldGVyc1xuICAgICAgLy8gVE9ETyBzaG91bGQgd2UgdXNlIEpNWCBmb3IgdGhpcz9cbiAgICAgIHZhciB1cmkgPSAoKGVuZHBvaW50U2NoZW1lKSA/IGVuZHBvaW50U2NoZW1lICsgXCI6XCIgKyBzbGFzaGVzVGV4dCA6IFwiXCIpICsgKGVuZHBvaW50UGF0aCA/IGVuZHBvaW50UGF0aCA6IFwiXCIpO1xuICAgICAgdmFyIHBhcmFtVGV4dCA9IENvcmUuaGFzaFRvU3RyaW5nKGVuZHBvaW50UGFyYW1ldGVycyk7XG4gICAgICBpZiAocGFyYW1UZXh0KSB7XG4gICAgICAgIHVyaSArPSBcIj9cIiArIHBhcmFtVGV4dDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1cmk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnVwZGF0ZVByb3BlcnRpZXMgPSAoKSA9PiB7XG4gICAgICBsb2cuaW5mbyhcIm9sZCBVUkkgaXMgXCIgKyAkc2NvcGUubm9kZURhdGEudXJpKTtcbiAgICAgIHZhciB1cmkgPSBjcmVhdGVFbmRwb2ludFVSSSgkc2NvcGUuZW5kcG9pbnRTY2hlbWUsICgkc2NvcGUuZW5kcG9pbnRQYXRoSGFzU2xhc2hlcyA/IFwiLy9cIiA6IFwiXCIpLCAkc2NvcGUuZW5kcG9pbnRQYXRoLCAkc2NvcGUuZW5kcG9pbnRQYXJhbWV0ZXJzKTtcbiAgICAgIGxvZy5pbmZvKFwibmV3IFVSSSBpcyBcIiArIHVyaSk7XG4gICAgICBpZiAodXJpKSB7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YS51cmkgPSB1cmk7XG4gICAgICB9XG5cbiAgICAgIHZhciBrZXkgPSBudWxsO1xuICAgICAgdmFyIHNlbGVjdGVkRm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyO1xuICAgICAgaWYgKHNlbGVjdGVkRm9sZGVyKSB7XG4gICAgICAgIGtleSA9IHNlbGVjdGVkRm9sZGVyLmtleTtcblxuICAgICAgICAvLyBsZXRzIGRlbGV0ZSB0aGUgY3VycmVudCBzZWxlY3RlZCBub2RlJ3MgZGl2IHNvIGl0cyB1cGRhdGVkIHdpdGggdGhlIG5ldyB0ZW1wbGF0ZSB2YWx1ZXNcbiAgICAgICAgdmFyIGVsZW1lbnRzID0gJGVsZW1lbnQuZmluZChcIi5jYW52YXNcIikuZmluZChcIltpZD0nXCIgKyBrZXkgKyBcIiddXCIpLmZpcnN0KCkucmVtb3ZlKCk7XG4gICAgICB9XG5cbiAgICAgIHRyZWVNb2RpZmllZCgpO1xuXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHVwZGF0ZVNlbGVjdGlvbihrZXkpXG4gICAgICB9XG5cbiAgICAgIGlmICgkc2NvcGUuaXNGb3JtRGlydHkoKSkge1xuICAgICAgICAkc2NvcGUuZW5kcG9pbnRGb3JtLiRzZXRQcmlzdGluZSgpO1xuICAgICAgICBpZiAoJHNjb3BlLmZvcm1zWydmb3JtRWRpdG9yJ10pIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybXNbJ2Zvcm1FZGl0b3InXS4kc2V0UHJpc3RpbmUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZSA9ICgpID0+IHtcbiAgICAgIC8vIGdlbmVyYXRlIHRoZSBuZXcgWE1MXG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkICYmICRzY29wZS5yb290Rm9sZGVyKSB7XG4gICAgICAgIHZhciB4bWxOb2RlID0gQ2FtZWwuZ2VuZXJhdGVYbWxGcm9tRm9sZGVyKCRzY29wZS5yb290Rm9sZGVyKTtcbiAgICAgICAgaWYgKHhtbE5vZGUpIHtcbiAgICAgICAgICB2YXIgdGV4dCA9IENvcmUueG1sTm9kZVRvU3RyaW5nKHhtbE5vZGUpO1xuICAgICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICB2YXIgZGVjb2RlZCA9IGRlY29kZVVSSUNvbXBvbmVudCh0ZXh0KTtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIlNhdmluZyB4bWwgZGVjb2RlZDogXCIgKyBkZWNvZGVkKTtcblxuICAgICAgICAgICAgLy8gbGV0cyBzYXZlIHRoZSBmaWxlLi4uXG4gICAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9ICRzY29wZS5jb21taXRNZXNzYWdlIHx8IFwiVXBkYXRlZCBwYWdlIFwiICsgJHNjb3BlLnBhZ2VJZDtcbiAgICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgZGVjb2RlZCwgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiU2F2ZWQgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICAgICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiY2FuY2VsbGluZy4uLlwiKTtcbiAgICAgIC8vIFRPRE8gc2hvdyBkaWFsb2cgaWYgZm9sa3MgYXJlIGFib3V0IHRvIGxvc2UgY2hhbmdlcy4uLlxuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKFwic2VsZWN0ZWRSb3V0ZUlkXCIsIG9uUm91dGVTZWxlY3Rpb25DaGFuZ2VkKTtcblxuICAgIGZ1bmN0aW9uIGdvVG9WaWV3KCkge1xuICAgICAgLy8gVE9ETyBsZXRzIG5hdmlnYXRlIHRvIHRoZSB2aWV3IGlmIHdlIGhhdmUgYSBzZXBhcmF0ZSB2aWV3IG9uZSBkYXkgOilcbiAgICAgIC8qXG4gICAgICAgaWYgKCRzY29wZS5icmVhZGNydW1icyAmJiAkc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoID4gMSkge1xuICAgICAgIHZhciB2aWV3TGluayA9ICRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMl07XG4gICAgICAgY29uc29sZS5sb2coXCJnb1RvVmlldyBoYXMgZm91bmQgdmlldyBcIiArIHZpZXdMaW5rKTtcbiAgICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcodmlld0xpbmssIFwiI1wiKTtcbiAgICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgIGNvbnNvbGUubG9nKFwiZ29Ub1ZpZXcgaGFzIG5vIGJyZWFkY3J1bWJzIVwiKTtcbiAgICAgICB9XG4gICAgICAgKi9cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGROZXdOb2RlKG5vZGVNb2RlbCkge1xuICAgICAgdmFyIGRvYyA9ICRzY29wZS5kb2MgfHwgZG9jdW1lbnQ7XG4gICAgICB2YXIgcGFyZW50Rm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyIHx8ICRzY29wZS5yb290Rm9sZGVyO1xuICAgICAgdmFyIGtleSA9IG5vZGVNb2RlbFtcIl9pZFwiXTtcbiAgICAgIGlmICgha2V5KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiV0FSTklORzogbm8gaWQgZm9yIG1vZGVsIFwiICsgSlNPTi5zdHJpbmdpZnkobm9kZU1vZGVsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdHJlZU5vZGUgPSAkc2NvcGUuc2VsZWN0ZWRGb2xkZXI7XG4gICAgICAgIGlmIChrZXkgPT09IFwicm91dGVcIikge1xuICAgICAgICAgIC8vIGxldHMgYWRkIHRvIHRoZSByb290IG9mIHRoZSB0cmVlXG4gICAgICAgICAgdHJlZU5vZGUgPSAkc2NvcGUucm9vdEZvbGRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoIXRyZWVOb2RlKSB7XG4gICAgICAgICAgICAvLyBsZXRzIHNlbGVjdCB0aGUgbGFzdCByb3V0ZSAtIGFuZCBjcmVhdGUgYSBuZXcgcm91dGUgaWYgbmVlZCBiZVxuICAgICAgICAgICAgdmFyIHJvb3QgPSAkc2NvcGUucm9vdEZvbGRlcjtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW47XG4gICAgICAgICAgICBpZiAoIWNoaWxkcmVuIHx8ICFjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgYWRkTmV3Tm9kZShDYW1lbC5nZXRDYW1lbFNjaGVtYShcInJvdXRlXCIpKTtcbiAgICAgICAgICAgICAgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICB0cmVlTm9kZSA9IGdldFJvdXRlRm9sZGVyKCRzY29wZS5yb290Rm9sZGVyLCAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkKSB8fCBjaGlsZHJlbltjaGlsZHJlbi5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ291bGQgbm90IGFkZCBhIG5ldyByb3V0ZSB0byB0aGUgZW1wdHkgdHJlZSFcIik7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBpZiB0aGUgcGFyZW50IGZvbGRlciBsaWtlcyB0byBhY3QgYXMgYSBwaXBlbGluZSwgdGhlbiBhZGRcbiAgICAgICAgICAvLyBhZnRlciB0aGUgcGFyZW50LCByYXRoZXIgdGhhbiBhcyBhIGNoaWxkXG4gICAgICAgICAgdmFyIHBhcmVudFR5cGVOYW1lID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQodHJlZU5vZGUpO1xuICAgICAgICAgIGlmICghQ2FtZWwuYWNjZXB0T3V0cHV0KHBhcmVudFR5cGVOYW1lKSkge1xuICAgICAgICAgICAgdHJlZU5vZGUgPSB0cmVlTm9kZS5wYXJlbnQgfHwgdHJlZU5vZGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0cmVlTm9kZSkge1xuICAgICAgICAgIHZhciBub2RlID0gZG9jLmNyZWF0ZUVsZW1lbnQoa2V5KTtcbiAgICAgICAgICBwYXJlbnRGb2xkZXIgPSB0cmVlTm9kZTtcbiAgICAgICAgICB2YXIgYWRkZWROb2RlID0gQ2FtZWwuYWRkUm91dGVDaGlsZChwYXJlbnRGb2xkZXIsIG5vZGUpO1xuICAgICAgICAgIC8vIFRPRE8gYWRkIHRoZSBzY2hlbWEgaGVyZSBmb3IgYW4gZWxlbWVudD8/XG4gICAgICAgICAgLy8gb3IgZGVmYXVsdCB0aGUgZGF0YSBvciBzb21ldGhpbmdcblxuICAgICAgICAgIHZhciBub2RlRGF0YSA9IHtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGlmIChrZXkgPT09IFwiZW5kcG9pbnRcIiAmJiAkc2NvcGUuZW5kcG9pbnRDb25maWcpIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSAkc2NvcGUuZW5kcG9pbnRDb25maWcua2V5O1xuICAgICAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgICBub2RlRGF0YVtcInVyaVwiXSA9IGtleSArIFwiOlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBhZGRlZE5vZGVbXCJjYW1lbE5vZGVEYXRhXCJdID0gbm9kZURhdGE7XG4gICAgICAgICAgYWRkZWROb2RlW1wiZW5kcG9pbnRDb25maWdcIl0gPSAkc2NvcGUuZW5kcG9pbnRDb25maWc7XG5cbiAgICAgICAgICBpZiAoa2V5ID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAgIC8vIGxldHMgZ2VuZXJhdGUgYSBuZXcgcm91dGVJZCBhbmQgc3dpdGNoIHRvIGl0XG4gICAgICAgICAgICB2YXIgY291bnQgPSAkc2NvcGUucm91dGVJZHMubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIG5vZGVJZCA9IG51bGw7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICBub2RlSWQgPSBcInJvdXRlXCIgKyAoKytjb3VudCk7XG4gICAgICAgICAgICAgIGlmICghJHNjb3BlLnJvdXRlSWRzLmZpbmQobm9kZUlkKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhZGRlZE5vZGVbXCJyb3V0ZVhtbE5vZGVcIl0uc2V0QXR0cmlidXRlKFwiaWRcIiwgbm9kZUlkKTtcbiAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZFJvdXRlSWQgPSBub2RlSWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0cmVlTW9kaWZpZWQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmVlTW9kaWZpZWQocmVwb3NpdGlvbiA9IHRydWUpIHtcbiAgICAgIC8vIGxldHMgcmVjcmVhdGUgdGhlIFhNTCBtb2RlbCBmcm9tIHRoZSB1cGRhdGUgRm9sZGVyIHRyZWVcbiAgICAgIHZhciBuZXdEb2MgPSBDYW1lbC5nZW5lcmF0ZVhtbEZyb21Gb2xkZXIoJHNjb3BlLnJvb3RGb2xkZXIpO1xuICAgICAgdmFyIHRyZWUgPSBDYW1lbC5sb2FkQ2FtZWxUcmVlKG5ld0RvYywgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICBpZiAodHJlZSkge1xuICAgICAgICAkc2NvcGUucm9vdEZvbGRlciA9IHRyZWU7XG4gICAgICAgICRzY29wZS5kb2MgPSBDb3JlLnBhdGhHZXQodHJlZSwgW1wieG1sRG9jdW1lbnRcIl0pO1xuICAgICAgfVxuICAgICAgJHNjb3BlLm1vZGlmaWVkID0gdHJ1ZTtcbiAgICAgIHJlbG9hZFJvdXRlSWRzKCk7XG4gICAgICAkc2NvcGUuZG9MYXlvdXQoKTtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiByZWxvYWRSb3V0ZUlkcygpIHtcbiAgICAgICRzY29wZS5yb3V0ZUlkcyA9IFtdO1xuICAgICAgdmFyIGRvYyA9ICQoJHNjb3BlLmRvYyk7XG4gICAgICAkc2NvcGUuY2FtZWxTZWxlY3Rpb25EZXRhaWxzLnNlbGVjdGVkQ2FtZWxDb250ZXh0SWQgPSBkb2MuZmluZChcImNhbWVsQ29udGV4dFwiKS5hdHRyKFwiaWRcIik7XG4gICAgICBkb2MuZmluZChcInJvdXRlXCIpLmVhY2goKGlkeCwgcm91dGUpID0+IHtcbiAgICAgICAgdmFyIGlkID0gcm91dGUuZ2V0QXR0cmlidXRlKFwiaWRcIik7XG4gICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICRzY29wZS5yb3V0ZUlkcy5wdXNoKGlkKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Sb3V0ZVNlbGVjdGlvbkNoYW5nZWQoKSB7XG4gICAgICBpZiAoJHNjb3BlLmRvYykge1xuICAgICAgICBpZiAoISRzY29wZS5zZWxlY3RlZFJvdXRlSWQgJiYgJHNjb3BlLnJvdXRlSWRzICYmICRzY29wZS5yb3V0ZUlkcy5sZW5ndGgpIHtcbiAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkID0gJHNjb3BlLnJvdXRlSWRzWzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkICYmICRzY29wZS5zZWxlY3RlZFJvdXRlSWQgIT09ICRzY29wZS5kcmF3blJvdXRlSWQpIHtcbiAgICAgICAgICB2YXIgbm9kZXMgPSBbXTtcbiAgICAgICAgICB2YXIgbGlua3MgPSBbXTtcbiAgICAgICAgICBDYW1lbC5sb2FkUm91dGVYbWxOb2Rlcygkc2NvcGUsICRzY29wZS5kb2MsICRzY29wZS5zZWxlY3RlZFJvdXRlSWQsIG5vZGVzLCBsaW5rcywgZ2V0V2lkdGgoKSk7XG4gICAgICAgICAgdXBkYXRlU2VsZWN0aW9uKCRzY29wZS5zZWxlY3RlZFJvdXRlSWQpO1xuICAgICAgICAgIC8vIG5vdyB3ZSd2ZSBnb3QgY2lkIHZhbHVlcyBpbiB0aGUgdHJlZSBhbmQgRE9NLCBsZXRzIGNyZWF0ZSBhbiBpbmRleCBzbyB3ZSBjYW4gYmluZCB0aGUgRE9NIHRvIHRoZSB0cmVlIG1vZGVsXG4gICAgICAgICAgJHNjb3BlLmZvbGRlcnMgPSBDYW1lbC5hZGRGb2xkZXJzVG9JbmRleCgkc2NvcGUucm9vdEZvbGRlcik7XG4gICAgICAgICAgc2hvd0dyYXBoKG5vZGVzLCBsaW5rcyk7XG4gICAgICAgICAgJHNjb3BlLmRyYXduUm91dGVJZCA9ICRzY29wZS5zZWxlY3RlZFJvdXRlSWQ7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmNhbWVsU2VsZWN0aW9uRGV0YWlscy5zZWxlY3RlZFJvdXRlSWQgPSAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dHcmFwaChub2RlcywgbGlua3MpIHtcbiAgICAgIGxheW91dEdyYXBoKG5vZGVzLCBsaW5rcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Tm9kZUlkKG5vZGUpIHtcbiAgICAgIGlmIChhbmd1bGFyLmlzTnVtYmVyKG5vZGUpKSB7XG4gICAgICAgIHZhciBpZHggPSBub2RlO1xuICAgICAgICBub2RlID0gJHNjb3BlLm5vZGVTdGF0ZXNbaWR4XTtcbiAgICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJDYW50IGZpbmQgbm9kZSBhdCBcIiArIGlkeCk7XG4gICAgICAgICAgcmV0dXJuIFwibm9kZS1cIiArIGlkeDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGUuY2lkIHx8IFwibm9kZS1cIiArIG5vZGUuaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0ZWRPclJvdXRlRm9sZGVyKCkge1xuICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZEZvbGRlciB8fCBnZXRSb3V0ZUZvbGRlcigkc2NvcGUucm9vdEZvbGRlciwgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Q29udGFpbmVyRWxlbWVudCgpIHtcbiAgICAgIHZhciByb290RWxlbWVudCA9ICRlbGVtZW50O1xuICAgICAgdmFyIGNvbnRhaW5lckVsZW1lbnQgPSByb290RWxlbWVudC5maW5kKFwiLmNhbnZhc1wiKTtcbiAgICAgIGlmICghY29udGFpbmVyRWxlbWVudCB8fCAhY29udGFpbmVyRWxlbWVudC5sZW5ndGgpIGNvbnRhaW5lckVsZW1lbnQgPSByb290RWxlbWVudDtcbiAgICAgIHJldHVybiBjb250YWluZXJFbGVtZW50O1xuICAgIH1cblxuICAgIC8vIGNvbmZpZ3VyZSBjYW52YXMgbGF5b3V0IGFuZCBzdHlsZXNcbiAgICB2YXIgZW5kcG9pbnRTdHlsZTphbnlbXSA9IFtcIkRvdFwiLCB7IHJhZGl1czogNCwgY3NzQ2xhc3M6ICdjYW1lbC1jYW52YXMtZW5kcG9pbnQnIH1dO1xuICAgIHZhciBob3ZlclBhaW50U3R5bGUgPSB7IHN0cm9rZVN0eWxlOiBcInJlZFwiLCBsaW5lV2lkdGg6IDMgfTtcbiAgICAvL3ZhciBsYWJlbFN0eWxlczogYW55W10gPSBbIFwiTGFiZWxcIiwgeyBsYWJlbDpcIkZPT1wiLCBpZDpcImxhYmVsXCIgfV07XG4gICAgdmFyIGxhYmVsU3R5bGVzOmFueVtdID0gWyBcIkxhYmVsXCIgXTtcbiAgICB2YXIgYXJyb3dTdHlsZXM6YW55W10gPSBbIFwiQXJyb3dcIiwge1xuICAgICAgbG9jYXRpb246IDEsXG4gICAgICBpZDogXCJhcnJvd1wiLFxuICAgICAgbGVuZ3RoOiA4LFxuICAgICAgd2lkdGg6IDgsXG4gICAgICBmb2xkYmFjazogMC44XG4gICAgfSBdO1xuICAgIHZhciBjb25uZWN0b3JTdHlsZTphbnlbXSA9IFsgXCJTdGF0ZU1hY2hpbmVcIiwgeyBjdXJ2aW5lc3M6IDEwLCBwcm94aW1pdHlMaW1pdDogNTAgfSBdO1xuXG4gICAganNQbHVtYkluc3RhbmNlLmltcG9ydERlZmF1bHRzKHtcbiAgICAgIEVuZHBvaW50OiBlbmRwb2ludFN0eWxlLFxuICAgICAgSG92ZXJQYWludFN0eWxlOiBob3ZlclBhaW50U3R5bGUsXG4gICAgICBDb25uZWN0aW9uT3ZlcmxheXM6IFtcbiAgICAgICAgYXJyb3dTdHlsZXMsXG4gICAgICAgIGxhYmVsU3R5bGVzXG4gICAgICBdXG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcbiAgICAgIGpzUGx1bWJJbnN0YW5jZS5yZXNldCgpO1xuICAgICAgZGVsZXRlIGpzUGx1bWJJbnN0YW5jZTtcbiAgICB9KTtcblxuICAgIC8vIGRvdWJsZSBjbGljayBvbiBhbnkgY29ubmVjdGlvblxuICAgIGpzUGx1bWJJbnN0YW5jZS5iaW5kKFwiZGJsY2xpY2tcIiwgZnVuY3Rpb24gKGNvbm5lY3Rpb24sIG9yaWdpbmFsRXZlbnQpIHtcbiAgICAgIGlmIChqc1BsdW1iSW5zdGFuY2UuaXNTdXNwZW5kRHJhd2luZygpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGFsZXJ0KFwiZG91YmxlIGNsaWNrIG9uIGNvbm5lY3Rpb24gZnJvbSBcIiArIGNvbm5lY3Rpb24uc291cmNlSWQgKyBcIiB0byBcIiArIGNvbm5lY3Rpb24udGFyZ2V0SWQpO1xuICAgIH0pO1xuXG4gICAganNQbHVtYkluc3RhbmNlLmJpbmQoJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbiAoaW5mbywgZXZ0KSB7XG4gICAgICAvL2xvZy5kZWJ1ZyhcIkNvbm5lY3Rpb24gZXZlbnQ6IFwiLCBpbmZvKTtcbiAgICAgIGxvZy5kZWJ1ZyhcIkNyZWF0aW5nIGNvbm5lY3Rpb24gZnJvbSBcIiwgaW5mby5zb3VyY2VJZCwgXCIgdG8gXCIsIGluZm8udGFyZ2V0SWQpO1xuICAgICAgdmFyIGxpbmsgPSBnZXRMaW5rKGluZm8pO1xuICAgICAgdmFyIHNvdXJjZSA9ICRzY29wZS5ub2Rlc1tsaW5rLnNvdXJjZV07XG4gICAgICB2YXIgc291cmNlRm9sZGVyID0gJHNjb3BlLmZvbGRlcnNbbGluay5zb3VyY2VdO1xuICAgICAgdmFyIHRhcmdldEZvbGRlciA9ICRzY29wZS5mb2xkZXJzW2xpbmsudGFyZ2V0XTtcbiAgICAgIGlmIChDYW1lbC5pc05leHRTaWJsaW5nQWRkZWRBc0NoaWxkKHNvdXJjZS50eXBlKSkge1xuICAgICAgICBzb3VyY2VGb2xkZXIubW92ZUNoaWxkKHRhcmdldEZvbGRlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzb3VyY2VGb2xkZXIucGFyZW50Lmluc2VydEFmdGVyKHRhcmdldEZvbGRlciwgc291cmNlRm9sZGVyKTtcbiAgICAgIH1cbiAgICAgIHRyZWVNb2RpZmllZCgpO1xuICAgIH0pO1xuXG4gICAgLy8gbGV0cyBkZWxldGUgY29ubmVjdGlvbnMgb24gY2xpY2tcbiAgICBqc1BsdW1iSW5zdGFuY2UuYmluZChcImNsaWNrXCIsIGZ1bmN0aW9uIChjKSB7XG4gICAgICBpZiAoanNQbHVtYkluc3RhbmNlLmlzU3VzcGVuZERyYXdpbmcoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBqc1BsdW1iSW5zdGFuY2UuZGV0YWNoKGMpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gbGF5b3V0R3JhcGgobm9kZXMsIGxpbmtzKSB7XG4gICAgICB2YXIgdHJhbnNpdGlvbnMgPSBbXTtcbiAgICAgIHZhciBzdGF0ZXMgPSBDb3JlLmNyZWF0ZUdyYXBoU3RhdGVzKG5vZGVzLCBsaW5rcywgdHJhbnNpdGlvbnMpO1xuXG4gICAgICBsb2cuZGVidWcoXCJsaW5rczogXCIsIGxpbmtzKTtcbiAgICAgIGxvZy5kZWJ1ZyhcInRyYW5zaXRpb25zOiBcIiwgdHJhbnNpdGlvbnMpO1xuXG4gICAgICAkc2NvcGUubm9kZVN0YXRlcyA9IHN0YXRlcztcbiAgICAgIHZhciBjb250YWluZXJFbGVtZW50ID0gZ2V0Q29udGFpbmVyRWxlbWVudCgpO1xuXG4gICAgICBqc1BsdW1iSW5zdGFuY2UuZG9XaGlsZVN1c3BlbmRlZCgoKSA9PiB7XG5cbiAgICAgICAgLy9zZXQgb3VyIGNvbnRhaW5lciB0byBzb21lIGFyYml0cmFyeSBpbml0aWFsIHNpemVcbiAgICAgICAgY29udGFpbmVyRWxlbWVudC5jc3Moe1xuICAgICAgICAgICd3aWR0aCc6ICc4MDBweCcsXG4gICAgICAgICAgJ2hlaWdodCc6ICc4MDBweCcsXG4gICAgICAgICAgJ21pbi1oZWlnaHQnOiAnODAwcHgnLFxuICAgICAgICAgICdtaW4td2lkdGgnOiAnODAwcHgnXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgY29udGFpbmVySGVpZ2h0ID0gMDtcbiAgICAgICAgdmFyIGNvbnRhaW5lcldpZHRoID0gMDtcblxuICAgICAgICBjb250YWluZXJFbGVtZW50LmZpbmQoJ2Rpdi5jb21wb25lbnQnKS5lYWNoKChpLCBlbCkgPT4ge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNoZWNraW5nOiBcIiwgZWwsIFwiIFwiLCBpKTtcbiAgICAgICAgICBpZiAoIXN0YXRlcy5hbnkoKG5vZGUpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWwuaWQgPT09IGdldE5vZGVJZChub2RlKTtcbiAgICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIlJlbW92aW5nIGVsZW1lbnQ6IFwiLCBlbC5pZCk7XG4gICAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UucmVtb3ZlKGVsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzdGF0ZXMsIChub2RlKSA9PiB7XG4gICAgICAgICAgbG9nLmRlYnVnKFwibm9kZTogXCIsIG5vZGUpO1xuICAgICAgICAgIHZhciBpZCA9IGdldE5vZGVJZChub2RlKTtcbiAgICAgICAgICB2YXIgZGl2ID0gY29udGFpbmVyRWxlbWVudC5maW5kKCcjJyArIGlkKTtcblxuICAgICAgICAgIGlmICghZGl2WzBdKSB7XG4gICAgICAgICAgICBkaXYgPSAkKCRzY29wZS5ub2RlVGVtcGxhdGUoe1xuICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgIG5vZGU6IG5vZGVcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIGRpdi5hcHBlbmRUbyhjb250YWluZXJFbGVtZW50KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBNYWtlIHRoZSBub2RlIGEganNwbHVtYiBzb3VyY2VcbiAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UubWFrZVNvdXJjZShkaXYsIHtcbiAgICAgICAgICAgIGZpbHRlcjogXCJpbWcubm9kZUljb25cIixcbiAgICAgICAgICAgIGFuY2hvcjogXCJDb250aW51b3VzXCIsXG4gICAgICAgICAgICBjb25uZWN0b3I6IGNvbm5lY3RvclN0eWxlLFxuICAgICAgICAgICAgY29ubmVjdG9yU3R5bGU6IHsgc3Ryb2tlU3R5bGU6IFwiIzY2NlwiLCBsaW5lV2lkdGg6IDMgfSxcbiAgICAgICAgICAgIG1heENvbm5lY3Rpb25zOiAtMVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gYW5kIGFsc28gYSBqc3BsdW1iIHRhcmdldFxuICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5tYWtlVGFyZ2V0KGRpdiwge1xuICAgICAgICAgICAgZHJvcE9wdGlvbnM6IHsgaG92ZXJDbGFzczogXCJkcmFnSG92ZXJcIiB9LFxuICAgICAgICAgICAgYW5jaG9yOiBcIkNvbnRpbnVvdXNcIlxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAganNQbHVtYkluc3RhbmNlLmRyYWdnYWJsZShkaXYsIHtcbiAgICAgICAgICAgIGNvbnRhaW5tZW50OiAnLmNhbWVsLWNhbnZhcydcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIGFkZCBldmVudCBoYW5kbGVycyB0byB0aGlzIG5vZGVcbiAgICAgICAgICBkaXYuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG5ld0ZsYWcgPSAhZGl2Lmhhc0NsYXNzKFwic2VsZWN0ZWRcIik7XG4gICAgICAgICAgICBjb250YWluZXJFbGVtZW50LmZpbmQoJ2Rpdi5jb21wb25lbnQnKS50b2dnbGVDbGFzcyhcInNlbGVjdGVkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIGRpdi50b2dnbGVDbGFzcyhcInNlbGVjdGVkXCIsIG5ld0ZsYWcpO1xuICAgICAgICAgICAgdmFyIGlkID0gZGl2LmF0dHIoXCJpZFwiKTtcbiAgICAgICAgICAgIHVwZGF0ZVNlbGVjdGlvbihuZXdGbGFnID8gaWQgOiBudWxsKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBkaXYuZGJsY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGlkID0gZGl2LmF0dHIoXCJpZFwiKTtcbiAgICAgICAgICAgIHVwZGF0ZVNlbGVjdGlvbihpZCk7XG4gICAgICAgICAgICAvLyRzY29wZS5wcm9wZXJ0aWVzRGlhbG9nLm9wZW4oKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgaGVpZ2h0ID0gZGl2LmhlaWdodCgpO1xuICAgICAgICAgIHZhciB3aWR0aCA9IGRpdi53aWR0aCgpO1xuICAgICAgICAgIGlmIChoZWlnaHQgfHwgd2lkdGgpIHtcbiAgICAgICAgICAgIG5vZGUud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIG5vZGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAgICAgZGl2LmNzcyh7XG4gICAgICAgICAgICAgICdtaW4td2lkdGgnOiB3aWR0aCxcbiAgICAgICAgICAgICAgJ21pbi1oZWlnaHQnOiBoZWlnaHRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGVkZ2VTZXAgPSAxMDtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIGxheW91dCBhbmQgZ2V0IHRoZSBidWlsZEdyYXBoXG4gICAgICAgIGRhZ3JlLmxheW91dCgpXG4gICAgICAgICAgICAubm9kZVNlcCgxMDApXG4gICAgICAgICAgICAuZWRnZVNlcChlZGdlU2VwKVxuICAgICAgICAgICAgLnJhbmtTZXAoNzUpXG4gICAgICAgICAgICAubm9kZXMoc3RhdGVzKVxuICAgICAgICAgICAgLmVkZ2VzKHRyYW5zaXRpb25zKVxuICAgICAgICAgICAgLmRlYnVnTGV2ZWwoMSlcbiAgICAgICAgICAgIC5ydW4oKTtcblxuICAgICAgICBhbmd1bGFyLmZvckVhY2goc3RhdGVzLCAobm9kZSkgPT4ge1xuXG4gICAgICAgICAgLy8gcG9zaXRpb24gdGhlIG5vZGUgaW4gdGhlIGdyYXBoXG4gICAgICAgICAgdmFyIGlkID0gZ2V0Tm9kZUlkKG5vZGUpO1xuICAgICAgICAgIHZhciBkaXYgPSAkKFwiI1wiICsgaWQpO1xuICAgICAgICAgIHZhciBkaXZIZWlnaHQgPSBkaXYuaGVpZ2h0KCk7XG4gICAgICAgICAgdmFyIGRpdldpZHRoID0gZGl2LndpZHRoKCk7XG4gICAgICAgICAgdmFyIGxlZnRPZmZzZXQgPSBub2RlLmRhZ3JlLnggKyBkaXZXaWR0aDtcbiAgICAgICAgICB2YXIgYm90dG9tT2Zmc2V0ID0gbm9kZS5kYWdyZS55ICsgZGl2SGVpZ2h0O1xuICAgICAgICAgIGlmIChjb250YWluZXJIZWlnaHQgPCBib3R0b21PZmZzZXQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9IGJvdHRvbU9mZnNldCArIGVkZ2VTZXAgKiAyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY29udGFpbmVyV2lkdGggPCBsZWZ0T2Zmc2V0KSB7XG4gICAgICAgICAgICBjb250YWluZXJXaWR0aCA9IGxlZnRPZmZzZXQgKyBlZGdlU2VwICogMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGl2LmNzcyh7dG9wOiBub2RlLmRhZ3JlLnksIGxlZnQ6IG5vZGUuZGFncmUueH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBzaXplIHRoZSBjb250YWluZXIgdG8gZml0IHRoZSBncmFwaFxuICAgICAgICBjb250YWluZXJFbGVtZW50LmNzcyh7XG4gICAgICAgICAgJ3dpZHRoJzogY29udGFpbmVyV2lkdGgsXG4gICAgICAgICAgJ2hlaWdodCc6IGNvbnRhaW5lckhlaWdodCxcbiAgICAgICAgICAnbWluLWhlaWdodCc6IGNvbnRhaW5lckhlaWdodCxcbiAgICAgICAgICAnbWluLXdpZHRoJzogY29udGFpbmVyV2lkdGhcbiAgICAgICAgfSk7XG5cblxuICAgICAgICBjb250YWluZXJFbGVtZW50LmRibGNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAkc2NvcGUucHJvcGVydGllc0RpYWxvZy5vcGVuKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGpzUGx1bWJJbnN0YW5jZS5zZXRTdXNwZW5kRXZlbnRzKHRydWUpO1xuICAgICAgICAvLyBEZXRhY2ggYWxsIHRoZSBjdXJyZW50IGNvbm5lY3Rpb25zIGFuZCByZWNvbm5lY3QgZXZlcnl0aGluZyBiYXNlZCBvbiB0aGUgdXBkYXRlZCBncmFwaFxuICAgICAgICBqc1BsdW1iSW5zdGFuY2UuZGV0YWNoRXZlcnlDb25uZWN0aW9uKHtmaXJlRXZlbnQ6IGZhbHNlfSk7XG5cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGxpbmtzLCAobGluaykgPT4ge1xuICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5jb25uZWN0KHtcbiAgICAgICAgICAgIHNvdXJjZTogZ2V0Tm9kZUlkKGxpbmsuc291cmNlKSxcbiAgICAgICAgICAgIHRhcmdldDogZ2V0Tm9kZUlkKGxpbmsudGFyZ2V0KVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAganNQbHVtYkluc3RhbmNlLnNldFN1c3BlbmRFdmVudHMoZmFsc2UpO1xuXG4gICAgICB9KTtcblxuXG4gICAgICByZXR1cm4gc3RhdGVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldExpbmsoaW5mbykge1xuICAgICAgdmFyIHNvdXJjZUlkID0gaW5mby5zb3VyY2VJZDtcbiAgICAgIHZhciB0YXJnZXRJZCA9IGluZm8udGFyZ2V0SWQ7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzb3VyY2U6IHNvdXJjZUlkLFxuICAgICAgICB0YXJnZXQ6IHRhcmdldElkXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Tm9kZUJ5Q0lEKG5vZGVzLCBjaWQpIHtcbiAgICAgIHJldHVybiBub2Rlcy5maW5kKChub2RlKSA9PiB7XG4gICAgICAgIHJldHVybiBub2RlLmNpZCA9PT0gY2lkO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBVcGRhdGVzIHRoZSBzZWxlY3Rpb24gd2l0aCB0aGUgZ2l2ZW4gZm9sZGVyIG9yIElEXG4gICAgICovXG4gICAgZnVuY3Rpb24gdXBkYXRlU2VsZWN0aW9uKGZvbGRlck9ySWQpIHtcbiAgICAgIHZhciBmb2xkZXIgPSBudWxsO1xuICAgICAgaWYgKGFuZ3VsYXIuaXNTdHJpbmcoZm9sZGVyT3JJZCkpIHtcbiAgICAgICAgdmFyIGlkID0gZm9sZGVyT3JJZDtcbiAgICAgICAgZm9sZGVyID0gKGlkICYmICRzY29wZS5mb2xkZXJzKSA/ICRzY29wZS5mb2xkZXJzW2lkXSA6IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb2xkZXIgPSBmb2xkZXJPcklkO1xuICAgICAgfVxuICAgICAgJHNjb3BlLnNlbGVjdGVkRm9sZGVyID0gZm9sZGVyO1xuICAgICAgZm9sZGVyID0gZ2V0U2VsZWN0ZWRPclJvdXRlRm9sZGVyKCk7XG4gICAgICAkc2NvcGUubm9kZVhtbE5vZGUgPSBudWxsO1xuICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IG51bGw7XG4gICAgICBpZiAoZm9sZGVyKSB7XG4gICAgICAgIHZhciBub2RlTmFtZSA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKGZvbGRlcik7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YSA9IENhbWVsLmdldFJvdXRlRm9sZGVySlNPTihmb2xkZXIpO1xuICAgICAgICAkc2NvcGUubm9kZURhdGFDaGFuZ2VkRmllbGRzID0ge307XG4gICAgICAgICRzY29wZS5ub2RlTW9kZWwgPSBDYW1lbC5nZXRDYW1lbFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgIGlmICgkc2NvcGUubm9kZU1vZGVsKSB7XG4gICAgICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IFwicGx1Z2lucy93aWtpL2h0bWwvY2FtZWxQcm9wZXJ0aWVzRWRpdC5odG1sXCI7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRW5kcG9pbnQgPSBudWxsO1xuICAgICAgICBpZiAoXCJlbmRwb2ludFwiID09PSBub2RlTmFtZSkge1xuICAgICAgICAgIHZhciB1cmkgPSAkc2NvcGUubm9kZURhdGFbXCJ1cmlcIl07XG4gICAgICAgICAgaWYgKHVyaSkge1xuICAgICAgICAgICAgLy8gbGV0cyBkZWNvbXBvc2UgdGhlIFVSSSBpbnRvIHNjaGVtZSwgcGF0aCBhbmQgcGFyYW1ldGVyc1xuICAgICAgICAgICAgdmFyIGlkeCA9IHVyaS5pbmRleE9mKFwiOlwiKTtcbiAgICAgICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgICAgIHZhciBlbmRwb2ludFNjaGVtZSA9IHVyaS5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgICAgICAgdmFyIGVuZHBvaW50UGF0aCA9IHVyaS5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICAgICAgICAgIC8vIGZvciBlbXB0eSBwYXRocyBsZXRzIGFzc3VtZSB3ZSBuZWVkIC8vIG9uIGEgVVJJXG4gICAgICAgICAgICAgICRzY29wZS5lbmRwb2ludFBhdGhIYXNTbGFzaGVzID0gZW5kcG9pbnRQYXRoID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICAgICAgICBpZiAoZW5kcG9pbnRQYXRoLnN0YXJ0c1dpdGgoXCIvL1wiKSkge1xuICAgICAgICAgICAgICAgIGVuZHBvaW50UGF0aCA9IGVuZHBvaW50UGF0aC5zdWJzdHJpbmcoMik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGF0aEhhc1NsYXNoZXMgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlkeCA9IGVuZHBvaW50UGF0aC5pbmRleE9mKFwiP1wiKTtcbiAgICAgICAgICAgICAgdmFyIGVuZHBvaW50UGFyYW1ldGVycyA9IHt9O1xuICAgICAgICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbWV0ZXJzID0gZW5kcG9pbnRQYXRoLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgICAgICAgICAgICBlbmRwb2ludFBhdGggPSBlbmRwb2ludFBhdGguc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgICAgICAgICAgZW5kcG9pbnRQYXJhbWV0ZXJzID0gQ29yZS5zdHJpbmdUb0hhc2gocGFyYW1ldGVycyk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAkc2NvcGUuZW5kcG9pbnRTY2hlbWUgPSBlbmRwb2ludFNjaGVtZTtcbiAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGF0aCA9IGVuZHBvaW50UGF0aDtcbiAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGFyYW1ldGVycyA9IGVuZHBvaW50UGFyYW1ldGVycztcblxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImVuZHBvaW50IFwiICsgZW5kcG9pbnRTY2hlbWUgKyBcIiBwYXRoIFwiICsgZW5kcG9pbnRQYXRoICsgXCIgYW5kIHBhcmFtZXRlcnMgXCIgKyBKU09OLnN0cmluZ2lmeShlbmRwb2ludFBhcmFtZXRlcnMpKTtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvYWRFbmRwb2ludFNjaGVtYShlbmRwb2ludFNjaGVtZSk7XG4gICAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZEVuZHBvaW50ID0ge1xuICAgICAgICAgICAgICAgIGVuZHBvaW50U2NoZW1lOiBlbmRwb2ludFNjaGVtZSxcbiAgICAgICAgICAgICAgICBlbmRwb2ludFBhdGg6IGVuZHBvaW50UGF0aCxcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzOiBlbmRwb2ludFBhcmFtZXRlcnNcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRXaWR0aCgpIHtcbiAgICAgIHZhciBjYW52YXNEaXYgPSAkKCRlbGVtZW50KTtcbiAgICAgIHJldHVybiBjYW52YXNEaXYud2lkdGgoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRGb2xkZXJJZEF0dHJpYnV0ZShyb3V0ZSkge1xuICAgICAgdmFyIGlkID0gbnVsbDtcbiAgICAgIGlmIChyb3V0ZSkge1xuICAgICAgICB2YXIgeG1sTm9kZSA9IHJvdXRlW1wicm91dGVYbWxOb2RlXCJdO1xuICAgICAgICBpZiAoeG1sTm9kZSkge1xuICAgICAgICAgIGlkID0geG1sTm9kZS5nZXRBdHRyaWJ1dGUoXCJpZFwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGlkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFJvdXRlRm9sZGVyKHRyZWUsIHJvdXRlSWQpIHtcbiAgICAgIHZhciBhbnN3ZXIgPSBudWxsO1xuICAgICAgaWYgKHRyZWUpIHtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRyZWUuY2hpbGRyZW4sIChyb3V0ZSkgPT4ge1xuICAgICAgICAgIGlmICghYW5zd2VyKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSBnZXRGb2xkZXJJZEF0dHJpYnV0ZShyb3V0ZSk7XG4gICAgICAgICAgICBpZiAocm91dGVJZCA9PT0gaWQpIHtcbiAgICAgICAgICAgICAgYW5zd2VyID0gcm91dGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgfVxuXG4gICAgJHNjb3BlLmRvU3dpdGNoVG9UcmVlVmlldyA9ICgpID0+IHtcbiAgICAgICRsb2NhdGlvbi51cmwoQ29yZS50cmltTGVhZGluZygoJHNjb3BlLnN0YXJ0TGluayArIFwiL2NhbWVsL3Byb3BlcnRpZXMvXCIgKyAkc2NvcGUucGFnZUlkKSwgJyMnKSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jb25maXJtU3dpdGNoVG9UcmVlVmlldyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQpIHtcbiAgICAgICAgJHNjb3BlLnN3aXRjaFRvVHJlZVZpZXcub3BlbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmRvU3dpdGNoVG9UcmVlVmlldygpO1xuICAgICAgfVxuICAgIH07XG5cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkNvbW1pdENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCJtYXJrZWRcIiwgXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgbWFya2VkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcbiAgICB2YXIgam9sb2tpYSA9IG51bGw7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuY29tbWl0SWQgPSAkc2NvcGUub2JqZWN0SWQ7XG5cbiAgICAvLyBUT0RPIHdlIGNvdWxkIGNvbmZpZ3VyZSB0aGlzP1xuICAgICRzY29wZS5kYXRlRm9ybWF0ID0gJ0VFRSwgTU1NIGQsIHkgOiBoaDptbTpzcyBhJztcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgIGRhdGE6ICdjb21taXRzJyxcbiAgICAgIHNob3dGaWx0ZXI6IGZhbHNlLFxuICAgICAgbXVsdGlTZWxlY3Q6IGZhbHNlLFxuICAgICAgc2VsZWN0V2l0aENoZWNrYm94T25seTogdHJ1ZSxcbiAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgIGRpc3BsYXlTZWxlY3Rpb25DaGVja2JveCA6IHRydWUsIC8vIG9sZCBwcmUgMi4wIGNvbmZpZyFcbiAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICBmaWx0ZXJUZXh0OiAnJ1xuICAgICAgfSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAncGF0aCcsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdGaWxlIE5hbWUnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmaWxlQ2VsbFRlbXBsYXRlLmh0bWwnKSxcbiAgICAgICAgICB3aWR0aDogXCIqKipcIixcbiAgICAgICAgICBjZWxsRmlsdGVyOiBcIlwiXG4gICAgICAgIH0sXG4gICAgICBdXG4gICAgfTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgICRzY29wZS4kd2F0Y2goJ3dvcmtzcGFjZS50cmVlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEkc2NvcGUuZ2l0KSB7XG4gICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJSZWxvYWRpbmcgdGhlIHZpZXcgYXMgd2Ugbm93IHNlZW0gdG8gaGF2ZSBhIGdpdCBtYmVhbiFcIik7XG4gICAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUuY2FuUmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgcmV0dXJuICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCA9PT0gMTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJldmVydCA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBwYXRoID0gY29tbWl0UGF0aChzZWxlY3RlZEl0ZW1zWzBdKTtcbiAgICAgICAgdmFyIG9iamVjdElkID0gJHNjb3BlLmNvbW1pdElkO1xuICAgICAgICBpZiAocGF0aCAmJiBvYmplY3RJZCkge1xuICAgICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gXCJSZXZlcnRpbmcgZmlsZSBcIiArICRzY29wZS5wYWdlSWQgKyBcIiB0byBwcmV2aW91cyB2ZXJzaW9uIFwiICsgb2JqZWN0SWQ7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8oJHNjb3BlLmJyYW5jaCwgb2JqZWN0SWQsICRzY29wZS5wYWdlSWQsIGNvbW1pdE1lc3NhZ2UsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShyZXN1bHQpO1xuICAgICAgICAgICAgLy8gbm93IGxldHMgdXBkYXRlIHRoZSB2aWV3XG4gICAgICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY29tbWl0UGF0aChjb21taXQpIHtcbiAgICAgIHJldHVybiBjb21taXQucGF0aCB8fCBjb21taXQubmFtZTtcbiAgICB9XG5cbiAgICAkc2NvcGUuZGlmZiA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBjb21taXQgPSBzZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICAvKlxuICAgICAgICAgdmFyIGNvbW1pdCA9IHJvdztcbiAgICAgICAgIHZhciBlbnRpdHkgPSByb3cuZW50aXR5O1xuICAgICAgICAgaWYgKGVudGl0eSkge1xuICAgICAgICAgY29tbWl0ID0gZW50aXR5O1xuICAgICAgICAgfVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIG90aGVyQ29tbWl0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG4gICAgICAgIHZhciBsaW5rID0gVXJsSGVscGVycy5qb2luKHN0YXJ0TGluaygkc2NvcGUpLCAgXCIvZGlmZi9cIiArICRzY29wZS5jb21taXRJZCArIFwiL1wiICsgb3RoZXJDb21taXRJZCArIFwiL1wiICsgY29tbWl0UGF0aChjb21taXQpKTtcbiAgICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiI1wiKTtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgocGF0aCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICB2YXIgY29tbWl0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG5cbiAgICAgIFdpa2kubG9hZEJyYW5jaGVzKGpvbG9raWEsIHdpa2lSZXBvc2l0b3J5LCAkc2NvcGUsIGlzRm1jKTtcblxuICAgICAgd2lraVJlcG9zaXRvcnkuY29tbWl0SW5mbyhjb21taXRJZCwgKGNvbW1pdEluZm8pID0+IHtcbiAgICAgICAgJHNjb3BlLmNvbW1pdEluZm8gPSBjb21taXRJbmZvO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG5cbiAgICAgIHdpa2lSZXBvc2l0b3J5LmNvbW1pdFRyZWUoY29tbWl0SWQsIChjb21taXRzKSA9PiB7XG4gICAgICAgICRzY29wZS5jb21taXRzID0gY29tbWl0cztcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbW1pdHMsIChjb21taXQpID0+IHtcbiAgICAgICAgICBjb21taXQuZmlsZUljb25IdG1sID0gV2lraS5maWxlSWNvbkh0bWwoY29tbWl0KTtcbiAgICAgICAgICBjb21taXQuZmlsZUNsYXNzID0gY29tbWl0Lm5hbWUuZW5kc1dpdGgoXCIucHJvZmlsZVwiKSA/IFwiZ3JlZW5cIiA6IFwiXCI7XG4gICAgICAgICAgdmFyIGNoYW5nZVR5cGUgPSBjb21taXQuY2hhbmdlVHlwZTtcbiAgICAgICAgICB2YXIgcGF0aCA9IGNvbW1pdFBhdGgoY29tbWl0KTtcbiAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgY29tbWl0LmZpbGVMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyAnL3ZlcnNpb24vJyArIHBhdGggKyAnLycgKyBjb21taXRJZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNoYW5nZVR5cGUpIHtcbiAgICAgICAgICAgIGNoYW5nZVR5cGUgPSBjaGFuZ2VUeXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBpZiAoY2hhbmdlVHlwZS5zdGFydHNXaXRoKFwiYVwiKSkge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1hZGRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwiYWRkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwiYWRkZWRcIjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhbmdlVHlwZS5zdGFydHNXaXRoKFwiZFwiKSkge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1kZWxldGVcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwiZGVsZXRlXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwiZGVsZXRlZFwiO1xuICAgICAgICAgICAgICBjb21taXQuZmlsZUxpbmsgPSBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtbW9kaWZ5XCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcIm1vZGlmeVwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcIm1vZGlmaWVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21taXQuY2hhbmdlVHlwZUh0bWwgPSAnPHNwYW4gY2xhc3M9XCInICsgY29tbWl0LmNoYW5nZUNsYXNzICsgJ1wiPicgKyBjb21taXQudGl0bGUgKyAnPC9zcGFuPic7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBXaWtpIHtcblxuICB2YXIgQ3JlYXRlQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJDcmVhdGVDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRyb3V0ZVwiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgKCRzY29wZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtczpuZy5yb3V0ZS5JUm91dGVQYXJhbXNTZXJ2aWNlLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJGh0dHA6bmcuSUh0dHBTZXJ2aWNlLCAkdGltZW91dDpuZy5JVGltZW91dFNlcnZpY2UpID0+IHtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuXG4gICAgLy8gVE9ETyByZW1vdmVcbiAgICB2YXIgd29ya3NwYWNlID0gbnVsbDtcblxuICAgICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWUgPSBXaWtpLmNyZWF0ZVdpemFyZFRyZWUod29ya3NwYWNlLCAkc2NvcGUpO1xuICAgICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWVDaGlsZHJlbiA9ICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWUuY2hpbGRyZW47XG4gICAgJHNjb3BlLmNyZWF0ZURvY3VtZW50VHJlZUFjdGl2YXRpb25zID0gW1wiY2FtZWwtc3ByaW5nLnhtbFwiLCBcIlJlYWRNZS5tZFwiXTtcblxuICAgICRzY29wZS50cmVlT3B0aW9ucyA9IHtcbiAgICAgICAgbm9kZUNoaWxkcmVuOiBcImNoaWxkcmVuXCIsXG4gICAgICAgIGRpclNlbGVjdGFibGU6IHRydWUsXG4gICAgICAgIGluamVjdENsYXNzZXM6IHtcbiAgICAgICAgICAgIHVsOiBcImExXCIsXG4gICAgICAgICAgICBsaTogXCJhMlwiLFxuICAgICAgICAgICAgbGlTZWxlY3RlZDogXCJhN1wiLFxuICAgICAgICAgICAgaUV4cGFuZGVkOiBcImEzXCIsXG4gICAgICAgICAgICBpQ29sbGFwc2VkOiBcImE0XCIsXG4gICAgICAgICAgICBpTGVhZjogXCJhNVwiLFxuICAgICAgICAgICAgbGFiZWw6IFwiYTZcIixcbiAgICAgICAgICAgIGxhYmVsU2VsZWN0ZWQ6IFwiYThcIlxuICAgICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlRXhpc3RzID0ge1xuICAgICAgZXhpc3RzOiBmYWxzZSxcbiAgICAgIG5hbWU6IFwiXCJcbiAgICB9O1xuICAgICRzY29wZS5uZXdEb2N1bWVudE5hbWUgPSBcIlwiO1xuICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50RXh0ZW5zaW9uID0gbnVsbDtcbiAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSBmYWxzZTtcbiAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gXCJcIjtcbiAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gXCJcIjtcblxuICAgIGZ1bmN0aW9uIHJldHVyblRvRGlyZWN0b3J5KCkge1xuICAgICAgdmFyIGxpbmsgPSBXaWtpLnZpZXdMaW5rKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uKVxuICAgICAgbG9nLmRlYnVnKFwiQ2FuY2VsbGluZywgZ29pbmcgdG8gbGluazogXCIsIGxpbmspO1xuICAgICAgV2lraS5nb1RvTGluayhsaW5rLCAkdGltZW91dCwgJGxvY2F0aW9uKTtcbiAgICB9XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgcmV0dXJuVG9EaXJlY3RvcnkoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uQ3JlYXRlRG9jdW1lbnRTZWxlY3QgPSAobm9kZSkgPT4ge1xuICAgICAgLy8gcmVzZXQgYXMgd2Ugc3dpdGNoIGJldHdlZW4gZG9jdW1lbnQgdHlwZXNcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGZhbHNlO1xuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IFwiXCI7XG4gICAgICB2YXIgZW50aXR5ID0gbm9kZSA/IG5vZGUuZW50aXR5IDogbnVsbDtcbiAgICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUgPSBlbnRpdHk7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlUmVnZXggPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlLnJlZ2V4IHx8IC8uKi87XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlSW52YWxpZCA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUuaW52YWxpZCB8fCBcImludmFsaWQgbmFtZVwiO1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbiA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUuZXh0ZW5zaW9uIHx8IG51bGw7XG4gICAgICBsb2cuZGVidWcoXCJFbnRpdHk6IFwiLCBlbnRpdHkpO1xuICAgICAgaWYgKGVudGl0eSkge1xuICAgICAgICBpZiAoZW50aXR5LmdlbmVyYXRlZCkge1xuICAgICAgICAgICRzY29wZS5mb3JtU2NoZW1hID0gZW50aXR5LmdlbmVyYXRlZC5zY2hlbWE7XG4gICAgICAgICAgJHNjb3BlLmZvcm1EYXRhID0gZW50aXR5LmdlbmVyYXRlZC5mb3JtKHdvcmtzcGFjZSwgJHNjb3BlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybVNjaGVtYSA9IHt9O1xuICAgICAgICAgICRzY29wZS5mb3JtRGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9XG5cbiAgICB9O1xuXG4gICAgJHNjb3BlLmFkZEFuZENsb3NlRGlhbG9nID0gKGZpbGVOYW1lOnN0cmluZykgPT4ge1xuICAgICAgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSA9IGZpbGVOYW1lO1xuICAgICAgdmFyIHRlbXBsYXRlID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZTtcbiAgICAgIHZhciBwYXRoID0gZ2V0TmV3RG9jdW1lbnRQYXRoKCk7XG5cbiAgICAgIC8vIGNsZWFyICRzY29wZS5uZXdEb2N1bWVudE5hbWUgc28gd2UgZG9udCByZW1lbWJlciBpdCB3aGVuIHdlIG9wZW4gaXQgbmV4dCB0aW1lXG4gICAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gbnVsbDtcblxuICAgICAgLy8gcmVzZXQgYmVmb3JlIHdlIGNoZWNrIGp1c3QgaW4gYSBiaXRcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGZhbHNlO1xuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IFwiXCI7XG4gICAgICAkc2NvcGUuZmlsZUV4dGVuc2lvbkludmFsaWQgPSBudWxsO1xuXG4gICAgICBpZiAoIXRlbXBsYXRlIHx8ICFwYXRoKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGUgaWYgdGhlIG5hbWUgbWF0Y2ggdGhlIGV4dGVuc2lvblxuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVFeHRlbnNpb24pIHtcbiAgICAgICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoJy4nKTtcbiAgICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgICB2YXIgZXh0ID0gcGF0aC5zdWJzdHJpbmcoaWR4KTtcbiAgICAgICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbiAhPT0gZXh0KSB7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4dGVuc2lvbkludmFsaWQgPSBcIkZpbGUgZXh0ZW5zaW9uIG11c3QgYmU6IFwiICsgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbjtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkYXRlIGlmIHRoZSBmaWxlIGV4aXN0cywgYW5kIHVzZSB0aGUgc3luY2hyb25vdXMgY2FsbFxuICAgICAgd2lraVJlcG9zaXRvcnkuZXhpc3RzKCRzY29wZS5icmFuY2gsIHBhdGgsIChleGlzdHMpID0+IHtcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gZXhpc3RzO1xuICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gZXhpc3RzID8gcGF0aCA6IGZhbHNlO1xuICAgICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICAgIGRvQ3JlYXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiBkb0NyZWF0ZSgpIHtcbiAgICAgICAgdmFyIG5hbWUgPSBXaWtpLmZpbGVOYW1lKHBhdGgpO1xuICAgICAgICB2YXIgZm9sZGVyID0gV2lraS5maWxlUGFyZW50KHBhdGgpO1xuICAgICAgICB2YXIgZXhlbXBsYXIgPSB0ZW1wbGF0ZS5leGVtcGxhcjtcblxuICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9IFwiQ3JlYXRlZCBcIiArIHRlbXBsYXRlLmxhYmVsO1xuICAgICAgICB2YXIgZXhlbXBsYXJVcmkgPSBDb3JlLnVybChcIi9wbHVnaW5zL3dpa2kvZXhlbXBsYXIvXCIgKyBleGVtcGxhcik7XG5cbiAgICAgICAgaWYgKHRlbXBsYXRlLmZvbGRlcikge1xuICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIkNyZWF0aW5nIG5ldyBmb2xkZXIgXCIgKyBuYW1lKTtcblxuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmNyZWF0ZURpcmVjdG9yeSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICB2YXIgbGluayA9IFdpa2kudmlld0xpbmsoJHNjb3BlLCBwYXRoLCAkbG9jYXRpb24pO1xuICAgICAgICAgICAgZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGUucHJvZmlsZSkge1xuXG4gICAgICAgICAgZnVuY3Rpb24gdG9QYXRoKHByb2ZpbGVOYW1lOnN0cmluZykge1xuICAgICAgICAgICAgdmFyIGFuc3dlciA9IFwiZmFicmljL3Byb2ZpbGVzL1wiICsgcHJvZmlsZU5hbWU7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIucmVwbGFjZSgvLS9nLCBcIi9cIik7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIgKyBcIi5wcm9maWxlXCI7XG4gICAgICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmN0aW9uIHRvUHJvZmlsZU5hbWUocGF0aDpzdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBhbnN3ZXIgPSBwYXRoLnJlcGxhY2UoL15mYWJyaWNcXC9wcm9maWxlc1xcLy8sIFwiXCIpO1xuICAgICAgICAgICAgYW5zd2VyID0gYW5zd2VyLnJlcGxhY2UoL1xcLy9nLCBcIi1cIik7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIucmVwbGFjZSgvXFwucHJvZmlsZSQvLCBcIlwiKTtcbiAgICAgICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gc3RyaXAgb2ZmIGFueSBwcm9maWxlIG5hbWUgaW4gY2FzZSB0aGUgdXNlciBjcmVhdGVzIGEgcHJvZmlsZSB3aGlsZSBsb29raW5nIGF0XG4gICAgICAgICAgLy8gYW5vdGhlciBwcm9maWxlXG4gICAgICAgICAgZm9sZGVyID0gZm9sZGVyLnJlcGxhY2UoL1xcLz0/KFxcdyopXFwucHJvZmlsZSQvLCBcIlwiKTtcblxuICAgICAgICAgIHZhciBjb25jYXRlbmF0ZWQgPSBmb2xkZXIgKyBcIi9cIiArIG5hbWU7XG5cbiAgICAgICAgICB2YXIgcHJvZmlsZU5hbWUgPSB0b1Byb2ZpbGVOYW1lKGNvbmNhdGVuYXRlZCk7XG4gICAgICAgICAgdmFyIHRhcmdldFBhdGggPSB0b1BhdGgocHJvZmlsZU5hbWUpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGUuZ2VuZXJhdGVkKSB7XG4gICAgICAgICAgdmFyIG9wdGlvbnM6V2lraS5HZW5lcmF0ZU9wdGlvbnMgPSB7XG4gICAgICAgICAgICB3b3Jrc3BhY2U6IHdvcmtzcGFjZSxcbiAgICAgICAgICAgIGZvcm06ICRzY29wZS5mb3JtRGF0YSxcbiAgICAgICAgICAgIG5hbWU6IGZpbGVOYW1lLFxuICAgICAgICAgICAgcGFyZW50SWQ6IGZvbGRlcixcbiAgICAgICAgICAgIGJyYW5jaDogJHNjb3BlLmJyYW5jaCxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IChjb250ZW50cyk9PiB7XG4gICAgICAgICAgICAgIGlmIChjb250ZW50cykge1xuICAgICAgICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNyZWF0ZWQgZmlsZSBcIiArIG5hbWUpO1xuICAgICAgICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm5Ub0RpcmVjdG9yeSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVyblRvRGlyZWN0b3J5KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogKGVycm9yKT0+IHtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oJ2Vycm9yJywgZXJyb3IpO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgICAgdGVtcGxhdGUuZ2VuZXJhdGVkLmdlbmVyYXRlKG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGxvYWQgdGhlIGV4YW1wbGUgZGF0YSAoaWYgYW55KSBhbmQgdGhlbiBhZGQgdGhlIGRvY3VtZW50IHRvIGdpdCBhbmQgY2hhbmdlIHRoZSBsaW5rIHRvIHRoZSBuZXcgZG9jdW1lbnRcbiAgICAgICAgICAkaHR0cC5nZXQoZXhlbXBsYXJVcmkpXG4gICAgICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgcHV0UGFnZShwYXRoLCBuYW1lLCBmb2xkZXIsIGRhdGEsIGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5lcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuIGVtcHR5IGZpbGVcbiAgICAgICAgICAgICAgcHV0UGFnZShwYXRoLCBuYW1lLCBmb2xkZXIsIFwiXCIsIGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gcHV0UGFnZShwYXRoLCBuYW1lLCBmb2xkZXIsIGNvbnRlbnRzLCBjb21taXRNZXNzYWdlKSB7XG4gICAgICAvLyBUT0RPIGxldHMgY2hlY2sgdGhpcyBwYWdlIGRvZXMgbm90IGV4aXN0IC0gaWYgaXQgZG9lcyBsZXRzIGtlZXAgYWRkaW5nIGEgbmV3IHBvc3QgZml4Li4uXG4gICAgICB3aWtpUmVwb3NpdG9yeS5wdXRQYWdlKCRzY29wZS5icmFuY2gsIHBhdGgsIGNvbnRlbnRzLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIkNyZWF0ZWQgZmlsZSBcIiArIG5hbWUpO1xuICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcblxuICAgICAgICAvLyBsZXRzIG5hdmlnYXRlIHRvIHRoZSBlZGl0IGxpbmtcbiAgICAgICAgLy8gbG9hZCB0aGUgZGlyZWN0b3J5IGFuZCBmaW5kIHRoZSBjaGlsZCBpdGVtXG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvbGRlciwgJHNjb3BlLm9iamVjdElkLCAoZGV0YWlscykgPT4ge1xuICAgICAgICAgIC8vIGxldHMgZmluZCB0aGUgY2hpbGQgZW50cnkgc28gd2UgY2FuIGNhbGN1bGF0ZSBpdHMgY29ycmVjdCBlZGl0IGxpbmtcbiAgICAgICAgICB2YXIgbGluazpzdHJpbmcgPSBudWxsO1xuICAgICAgICAgIGlmIChkZXRhaWxzICYmIGRldGFpbHMuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcInNjYW5uZWQgdGhlIGRpcmVjdG9yeSBcIiArIGRldGFpbHMuY2hpbGRyZW4ubGVuZ3RoICsgXCIgY2hpbGRyZW5cIik7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbmQoYyA9PiBjLm5hbWUgPT09IGZpbGVOYW1lKTtcbiAgICAgICAgICAgIGlmIChjaGlsZCkge1xuICAgICAgICAgICAgICBsaW5rID0gJHNjb3BlLmNoaWxkTGluayhjaGlsZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2cuZGVidWcoXCJDb3VsZCBub3QgZmluZCBuYW1lICdcIiArIGZpbGVOYW1lICsgXCInIGluIHRoZSBsaXN0IG9mIGZpbGUgbmFtZXMgXCIgKyBKU09OLnN0cmluZ2lmeShkZXRhaWxzLmNoaWxkcmVuLm1hcChjID0+IGMubmFtZSkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFsaW5rKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJXQVJOSU5HOiBjb3VsZCBub3QgZmluZCB0aGUgY2hpbGRMaW5rIHNvIHJldmVydGluZyB0byB0aGUgd2lraSBlZGl0IHBhZ2UhXCIpO1xuICAgICAgICAgICAgbGluayA9IFdpa2kuZWRpdExpbmsoJHNjb3BlLCBwYXRoLCAkbG9jYXRpb24pO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvL0NvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROZXdEb2N1bWVudFBhdGgoKSB7XG4gICAgICB2YXIgdGVtcGxhdGUgPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlO1xuICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICBsb2cuZGVidWcoXCJObyB0ZW1wbGF0ZSBzZWxlY3RlZC5cIik7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgdmFyIGV4ZW1wbGFyID0gdGVtcGxhdGUuZXhlbXBsYXIgfHwgXCJcIjtcbiAgICAgIHZhciBuYW1lOnN0cmluZyA9ICRzY29wZS5uZXdEb2N1bWVudE5hbWUgfHwgZXhlbXBsYXI7XG5cbiAgICAgIGlmIChuYW1lLmluZGV4T2YoJy4nKSA8IDApIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgdGhlIGZpbGUgZXh0ZW5zaW9uIGZyb20gdGhlIGV4ZW1wbGFyXG4gICAgICAgIHZhciBpZHggPSBleGVtcGxhci5sYXN0SW5kZXhPZihcIi5cIik7XG4gICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgbmFtZSArPSBleGVtcGxhci5zdWJzdHJpbmcoaWR4KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBsZXRzIGRlYWwgd2l0aCBkaXJlY3RvcmllcyBpbiB0aGUgbmFtZVxuICAgICAgdmFyIGZvbGRlcjpzdHJpbmcgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgaWYgKCRzY29wZS5pc0ZpbGUpIHtcbiAgICAgICAgLy8gaWYgd2UgYXJlIGEgZmlsZSBsZXRzIGRpc2NhcmQgdGhlIGxhc3QgcGFydCBvZiB0aGUgcGF0aFxuICAgICAgICB2YXIgaWR4OmFueSA9IGZvbGRlci5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICAgIGlmIChpZHggPD0gMCkge1xuICAgICAgICAgIGZvbGRlciA9IFwiXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9sZGVyID0gZm9sZGVyLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgaWR4OmFueSA9IG5hbWUubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgZm9sZGVyICs9IFwiL1wiICsgbmFtZS5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgfVxuICAgICAgZm9sZGVyID0gQ29yZS50cmltTGVhZGluZyhmb2xkZXIsIFwiL1wiKTtcbiAgICAgIHJldHVybiBmb2xkZXIgKyAoZm9sZGVyID8gXCIvXCIgOiBcIlwiKSArIG5hbWU7XG4gICAgfVxuXG4gIH1dKTtcblxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5FZGl0Q29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZy5wdXNoKGNyZWF0ZUVkaXRpbmdCcmVhZGNydW1iKCRzY29wZSkpO1xuXG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmVudGl0eSA9IHtcbiAgICAgIHNvdXJjZTogbnVsbFxuICAgIH07XG5cbiAgICB2YXIgZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KCRzY29wZS5wYWdlSWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpO1xuICAgIHZhciBmb3JtID0gbnVsbDtcbiAgICBpZiAoKGZvcm1hdCAmJiBmb3JtYXQgPT09IFwiamF2YXNjcmlwdFwiKSB8fCBpc0NyZWF0ZSgpKSB7XG4gICAgICBmb3JtID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXTtcbiAgICB9XG5cbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIG1vZGU6IHtcbiAgICAgICAgbmFtZTogZm9ybWF0XG4gICAgICB9XG4gICAgfTtcbiAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMgPSBDb2RlRWRpdG9yLmNyZWF0ZUVkaXRvclNldHRpbmdzKG9wdGlvbnMpO1xuICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuXG5cbiAgICAkc2NvcGUuaXNWYWxpZCA9ICgpID0+ICRzY29wZS5maWxlTmFtZTtcblxuICAgICRzY29wZS5jYW5TYXZlID0gKCkgPT4gISRzY29wZS5tb2RpZmllZDtcblxuICAgICRzY29wZS4kd2F0Y2goJ2VudGl0eS5zb3VyY2UnLCAobmV3VmFsdWUsIG9sZFZhbHVlKSA9PiB7XG4gICAgICAkc2NvcGUubW9kaWZpZWQgPSBuZXdWYWx1ZSAmJiBvbGRWYWx1ZSAmJiBuZXdWYWx1ZSAhPT0gb2xkVmFsdWU7XG4gICAgfSwgdHJ1ZSk7XG5cbiAgICBsb2cuZGVidWcoXCJwYXRoOiBcIiwgJHNjb3BlLnBhdGgpO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnbW9kaWZpZWQnLCAobmV3VmFsdWUsIG9sZFZhbHVlKSA9PiB7XG4gICAgICBsb2cuZGVidWcoXCJtb2RpZmllZDogXCIsIG5ld1ZhbHVlKTtcbiAgICB9KTtcblxuICAgICRzY29wZS52aWV3TGluayA9ICgpID0+IFdpa2kudmlld0xpbmsoJHNjb3BlLCAkc2NvcGUucGFnZUlkLCAkbG9jYXRpb24sICRzY29wZS5maWxlTmFtZSk7XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgZ29Ub1ZpZXcoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmUgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkICYmICRzY29wZS5maWxlTmFtZSkge1xuICAgICAgICBzYXZlVG8oJHNjb3BlW1wicGFnZUlkXCJdKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNyZWF0ZSA9ICgpID0+IHtcbiAgICAgIC8vIGxldHMgY29tYmluZSB0aGUgZmlsZSBuYW1lIHdpdGggdGhlIGN1cnJlbnQgcGFnZUlkICh3aGljaCBpcyB0aGUgZGlyZWN0b3J5KVxuICAgICAgdmFyIHBhdGggPSAkc2NvcGUucGFnZUlkICsgXCIvXCIgKyAkc2NvcGUuZmlsZU5hbWU7XG4gICAgICBjb25zb2xlLmxvZyhcImNyZWF0aW5nIG5ldyBmaWxlIGF0IFwiICsgcGF0aCk7XG4gICAgICBzYXZlVG8ocGF0aCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vblN1Ym1pdCA9IChqc29uLCBmb3JtKSA9PiB7XG4gICAgICBpZiAoaXNDcmVhdGUoKSkge1xuICAgICAgICAkc2NvcGUuY3JlYXRlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuc2F2ZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUub25DYW5jZWwgPSAoZm9ybSkgPT4ge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSlcbiAgICAgIH0sIDUwKTtcbiAgICB9O1xuXG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiBpc0NyZWF0ZSgpIHtcbiAgICAgIHJldHVybiAkbG9jYXRpb24ucGF0aCgpLnN0YXJ0c1dpdGgoXCIvd2lraS9jcmVhdGVcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIC8vIG9ubHkgbG9hZCB0aGUgc291cmNlIGlmIG5vdCBpbiBjcmVhdGUgbW9kZVxuICAgICAgaWYgKGlzQ3JlYXRlKCkpIHtcbiAgICAgICAgdXBkYXRlU291cmNlVmlldygpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiR2V0dGluZyBwYWdlLCBicmFuY2g6IFwiLCAkc2NvcGUuYnJhbmNoLCBcIiBwYWdlSWQ6IFwiLCAkc2NvcGUucGFnZUlkLCBcIiBvYmplY3RJZDogXCIsICRzY29wZS5vYmplY3RJZCk7XG4gICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgJHNjb3BlLm9iamVjdElkLCBvbkZpbGVDb250ZW50cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25GaWxlQ29udGVudHMoZGV0YWlscykge1xuICAgICAgdmFyIGNvbnRlbnRzID0gZGV0YWlscy50ZXh0O1xuICAgICAgJHNjb3BlLmVudGl0eS5zb3VyY2UgPSBjb250ZW50cztcbiAgICAgICRzY29wZS5maWxlTmFtZSA9ICRzY29wZS5wYWdlSWQuc3BsaXQoJy8nKS5sYXN0KCk7XG4gICAgICBsb2cuZGVidWcoXCJmaWxlIG5hbWU6IFwiLCAkc2NvcGUuZmlsZU5hbWUpO1xuICAgICAgbG9nLmRlYnVnKFwiZmlsZSBkZXRhaWxzOiBcIiwgZGV0YWlscyk7XG4gICAgICB1cGRhdGVTb3VyY2VWaWV3KCk7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVNvdXJjZVZpZXcoKSB7XG4gICAgICBpZiAoZm9ybSkge1xuICAgICAgICBpZiAoaXNDcmVhdGUoKSkge1xuICAgICAgICAgIC8vIGxldHMgZGVmYXVsdCBhIGZpbGUgbmFtZVxuICAgICAgICAgIGlmICghJHNjb3BlLmZpbGVOYW1lKSB7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZU5hbWUgPSBcIlwiICsgQ29yZS5nZXRVVUlEKCkgKyBcIi5qc29uXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIG5vdyBsZXRzIHRyeSBsb2FkIHRoZSBmb3JtIGRlZmludGlvbiBKU09OIHNvIHdlIGNhbiB0aGVuIHJlbmRlciB0aGUgZm9ybVxuICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IG51bGw7XG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvcm0sICRzY29wZS5vYmplY3RJZCwgKGRldGFpbHMpID0+IHtcbiAgICAgICAgICBvbkZvcm1TY2hlbWEoV2lraS5wYXJzZUpzb24oZGV0YWlscy50ZXh0KSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL3NvdXJjZUVkaXQuaHRtbFwiO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRm9ybVNjaGVtYShqc29uKSB7XG4gICAgICAkc2NvcGUuZm9ybURlZmluaXRpb24gPSBqc29uO1xuICAgICAgaWYgKCRzY29wZS5lbnRpdHkuc291cmNlKSB7XG4gICAgICAgICRzY29wZS5mb3JtRW50aXR5ID0gV2lraS5wYXJzZUpzb24oJHNjb3BlLmVudGl0eS5zb3VyY2UpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL2Zvcm1FZGl0Lmh0bWxcIjtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ29Ub1ZpZXcoKSB7XG4gICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcoJHNjb3BlLnZpZXdMaW5rKCksIFwiI1wiKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImdvaW5nIHRvIHZpZXcgXCIgKyBwYXRoKTtcbiAgICAgICRsb2NhdGlvbi5wYXRoKFdpa2kuZGVjb2RlUGF0aChwYXRoKSk7XG4gICAgICBsb2cuZGVidWcoXCJsb2NhdGlvbiBpcyBub3cgXCIgKyAkbG9jYXRpb24ucGF0aCgpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzYXZlVG8ocGF0aDpzdHJpbmcpIHtcbiAgICAgIHZhciBjb21taXRNZXNzYWdlID0gJHNjb3BlLmNvbW1pdE1lc3NhZ2UgfHwgXCJVcGRhdGVkIHBhZ2UgXCIgKyAkc2NvcGUucGFnZUlkO1xuICAgICAgdmFyIGNvbnRlbnRzID0gJHNjb3BlLmVudGl0eS5zb3VyY2U7XG4gICAgICBpZiAoJHNjb3BlLmZvcm1FbnRpdHkpIHtcbiAgICAgICAgY29udGVudHMgPSBKU09OLnN0cmluZ2lmeSgkc2NvcGUuZm9ybUVudGl0eSwgbnVsbCwgXCIgIFwiKTtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcIlNhdmluZyBmaWxlLCBicmFuY2g6IFwiLCAkc2NvcGUuYnJhbmNoLCBcIiBwYXRoOiBcIiwgJHNjb3BlLnBhdGgpO1xuICAgICAgLy9jb25zb2xlLmxvZyhcIkFib3V0IHRvIHdyaXRlIGNvbnRlbnRzICdcIiArIGNvbnRlbnRzICsgXCInXCIpO1xuICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb250ZW50cywgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG4gICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIlNhdmVkIFwiICsgcGF0aCk7XG4gICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLy8gY29udHJvbGxlciBmb3IgaGFuZGxpbmcgZmlsZSBkcm9wc1xuICBleHBvcnQgdmFyIEZpbGVEcm9wQ29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuRmlsZURyb3BDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIkZpbGVVcGxvYWRlclwiLCBcIiRyb3V0ZVwiLCBcIiR0aW1lb3V0XCIsIFwidXNlckRldGFpbHNcIiwgKCRzY29wZSwgRmlsZVVwbG9hZGVyLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJHRpbWVvdXQ6bmcuSVRpbWVvdXRTZXJ2aWNlLCB1c2VyRGV0YWlsczpDb3JlLlVzZXJEZXRhaWxzKSA9PiB7XG5cblxuICAgIHZhciB1cGxvYWRVUkkgPSBXaWtpLmdpdFJlc3RVUkwoJHNjb3BlLCAkc2NvcGUucGFnZUlkKSArICcvJztcbiAgICB2YXIgdXBsb2FkZXIgPSAkc2NvcGUudXBsb2FkZXIgPSBuZXcgRmlsZVVwbG9hZGVyKHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBDb3JlLmF1dGhIZWFkZXJWYWx1ZSh1c2VyRGV0YWlscylcbiAgICAgIH0sXG4gICAgICBhdXRvVXBsb2FkOiB0cnVlLFxuICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlLFxuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICB1cmw6IHVwbG9hZFVSSVxuICAgIH0pO1xuICAgICRzY29wZS5kb1VwbG9hZCA9ICgpID0+IHtcbiAgICAgIHVwbG9hZGVyLnVwbG9hZEFsbCgpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25XaGVuQWRkaW5nRmlsZUZhaWxlZCA9IGZ1bmN0aW9uIChpdGVtIC8qe0ZpbGV8RmlsZUxpa2VPYmplY3R9Ki8sIGZpbHRlciwgb3B0aW9ucykge1xuICAgICAgbG9nLmRlYnVnKCdvbldoZW5BZGRpbmdGaWxlRmFpbGVkJywgaXRlbSwgZmlsdGVyLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQWZ0ZXJBZGRpbmdGaWxlID0gZnVuY3Rpb24gKGZpbGVJdGVtKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQWZ0ZXJBZGRpbmdGaWxlJywgZmlsZUl0ZW0pO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25BZnRlckFkZGluZ0FsbCA9IGZ1bmN0aW9uIChhZGRlZEZpbGVJdGVtcykge1xuICAgICAgbG9nLmRlYnVnKCdvbkFmdGVyQWRkaW5nQWxsJywgYWRkZWRGaWxlSXRlbXMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25CZWZvcmVVcGxvYWRJdGVtID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIGlmICgnZmlsZScgaW4gaXRlbSkge1xuICAgICAgICBpdGVtLmZpbGVTaXplTUIgPSAoaXRlbS5maWxlLnNpemUgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCgyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGl0ZW0uZmlsZVNpemVNQiA9IDA7XG4gICAgICB9XG4gICAgICAvL2l0ZW0udXJsID0gVXJsSGVscGVycy5qb2luKHVwbG9hZFVSSSwgaXRlbS5maWxlLm5hbWUpO1xuICAgICAgaXRlbS51cmwgPSB1cGxvYWRVUkk7XG4gICAgICBsb2cuaW5mbyhcIkxvYWRpbmcgZmlsZXMgdG8gXCIgKyB1cGxvYWRVUkkpO1xuICAgICAgbG9nLmRlYnVnKCdvbkJlZm9yZVVwbG9hZEl0ZW0nLCBpdGVtKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uUHJvZ3Jlc3NJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCBwcm9ncmVzcykge1xuICAgICAgbG9nLmRlYnVnKCdvblByb2dyZXNzSXRlbScsIGZpbGVJdGVtLCBwcm9ncmVzcyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vblByb2dyZXNzQWxsID0gZnVuY3Rpb24gKHByb2dyZXNzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uUHJvZ3Jlc3NBbGwnLCBwcm9ncmVzcyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vblN1Y2Nlc3NJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uU3VjY2Vzc0l0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkVycm9ySXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvbkVycm9ySXRlbScsIGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQ2FuY2VsSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvbkNhbmNlbEl0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkNvbXBsZXRlSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvbkNvbXBsZXRlSXRlbScsIGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQ29tcGxldGVBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQ29tcGxldGVBbGwnKTtcbiAgICAgIHVwbG9hZGVyLmNsZWFyUXVldWUoKTtcbiAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oXCJDb21wbGV0ZWQgYWxsIHVwbG9hZHMuIExldHMgZm9yY2UgYSByZWxvYWRcIik7XG4gICAgICAgICRyb3V0ZS5yZWxvYWQoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0sIDIwMCk7XG4gICAgfTtcbiAgfV0pO1xuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuRm9ybVRhYmxlQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpID0+IHtcbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuY29sdW1uRGVmcyA9IFtdO1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgIGRhdGE6ICdsaXN0JyxcbiAgICAgICBkaXNwbGF5Rm9vdGVyOiBmYWxzZSxcbiAgICAgICBzaG93RmlsdGVyOiBmYWxzZSxcbiAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICBmaWx0ZXJUZXh0OiAnJ1xuICAgICAgIH0sXG4gICAgICAgY29sdW1uRGVmczogJHNjb3BlLmNvbHVtbkRlZnNcbiAgICAgfTtcblxuXG4gICAgJHNjb3BlLnZpZXdMaW5rID0gKHJvdykgPT4ge1xuICAgICAgcmV0dXJuIGNoaWxkTGluayhyb3csIFwiL3ZpZXdcIik7XG4gICAgfTtcbiAgICAkc2NvcGUuZWRpdExpbmsgPSAocm93KSA9PiB7XG4gICAgICByZXR1cm4gY2hpbGRMaW5rKHJvdywgXCIvZWRpdFwiKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY2hpbGRMaW5rKGNoaWxkLCBwcmVmaXgpIHtcbiAgICAgIHZhciBzdGFydCA9IFdpa2kuc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgY2hpbGRJZCA9IChjaGlsZCkgPyBjaGlsZFtcIl9pZFwiXSB8fCBcIlwiIDogXCJcIjtcbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBzdGFydCArIHByZWZpeCArIFwiL1wiICsgJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgY2hpbGRJZCk7XG4gICAgfVxuXG4gICAgdmFyIGxpbmtzQ29sdW1uID0ge1xuICAgICAgZmllbGQ6ICdfaWQnLFxuICAgICAgZGlzcGxheU5hbWU6ICdBY3Rpb25zJyxcbiAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0XCJcIj48YSBuZy1ocmVmPVwie3t2aWV3TGluayhyb3cuZW50aXR5KX19XCIgY2xhc3M9XCJidG5cIj5WaWV3PC9hPiA8YSBuZy1ocmVmPVwie3tlZGl0TGluayhyb3cuZW50aXR5KX19XCIgY2xhc3M9XCJidG5cIj5FZGl0PC9hPjwvZGl2PidcbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgdmFyIGZvcm0gPSAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdO1xuICAgIGlmIChmb3JtKSB7XG4gICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvcm0sICRzY29wZS5vYmplY3RJZCwgb25Gb3JtRGF0YSk7XG4gICAgfVxuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gb25SZXN1bHRzKHJlc3BvbnNlKSB7XG4gICAgICB2YXIgbGlzdCA9IFtdO1xuICAgICAgdmFyIG1hcCA9IFdpa2kucGFyc2VKc29uKHJlc3BvbnNlKTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChtYXAsICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIHZhbHVlW1wiX2lkXCJdID0ga2V5O1xuICAgICAgICBsaXN0LnB1c2godmFsdWUpO1xuICAgICAgfSk7XG4gICAgICAkc2NvcGUubGlzdCA9IGxpc3Q7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICB2YXIgZmlsdGVyID0gQ29yZS5wYXRoR2V0KCRzY29wZSwgW1wiZ3JpZE9wdGlvbnNcIiwgXCJmaWx0ZXJPcHRpb25zXCIsIFwiZmlsdGVyVGV4dFwiXSkgfHwgXCJcIjtcbiAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5qc29uQ2hpbGRDb250ZW50cygkc2NvcGUucGFnZUlkLCBcIiouanNvblwiLCBmaWx0ZXIsIG9uUmVzdWx0cyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Gb3JtRGF0YShkZXRhaWxzKSB7XG4gICAgICB2YXIgdGV4dCA9IGRldGFpbHMudGV4dDtcbiAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICRzY29wZS5mb3JtRGVmaW5pdGlvbiA9IFdpa2kucGFyc2VKc29uKHRleHQpO1xuXG4gICAgICAgIHZhciBjb2x1bW5EZWZzID0gW107XG4gICAgICAgIHZhciBzY2hlbWEgPSAkc2NvcGUuZm9ybURlZmluaXRpb247XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWEucHJvcGVydGllcywgKHByb3BlcnR5LCBuYW1lKSA9PiB7XG4gICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgIGlmICghRm9ybXMuaXNBcnJheU9yTmVzdGVkT2JqZWN0KHByb3BlcnR5LCBzY2hlbWEpKSB7XG4gICAgICAgICAgICAgIHZhciBjb2xEZWYgPSB7XG4gICAgICAgICAgICAgICAgZmllbGQ6IG5hbWUsXG4gICAgICAgICAgICAgICAgZGlzcGxheU5hbWU6IHByb3BlcnR5LmRlc2NyaXB0aW9uIHx8IG5hbWUsXG4gICAgICAgICAgICAgICAgdmlzaWJsZTogdHJ1ZVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjb2x1bW5EZWZzLnB1c2goY29sRGVmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjb2x1bW5EZWZzLnB1c2gobGlua3NDb2x1bW4pO1xuXG4gICAgICAgICRzY29wZS5jb2x1bW5EZWZzID0gY29sdW1uRGVmcztcbiAgICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLmNvbHVtbkRlZnMgPSBjb2x1bW5EZWZzO1xuXG4gICAgICAgIC8vIG5vdyB3ZSBoYXZlIHRoZSBncmlkIGNvbHVtbiBzdHVmZiBsb2FkZWQsIGxldHMgbG9hZCB0aGUgZGF0YXRhYmxlXG4gICAgICAgICRzY29wZS50YWJsZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL2Zvcm1UYWJsZURhdGF0YWJsZS5odG1sXCI7XG4gICAgICB9XG4gICAgfVxuICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG4gbW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkdpdFByZWZlcmVuY2VzXCIsIFtcIiRzY29wZVwiLCBcImxvY2FsU3RvcmFnZVwiLCBcInVzZXJEZXRhaWxzXCIsICgkc2NvcGUsIGxvY2FsU3RvcmFnZSwgdXNlckRldGFpbHMpID0+IHtcblxuICAgIHZhciBjb25maWcgPSB7XG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGdpdFVzZXJOYW1lOiB7XG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgbGFiZWw6ICdVc2VybmFtZScsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgdXNlciBuYW1lIHRvIGJlIHVzZWQgd2hlbiBtYWtpbmcgY2hhbmdlcyB0byBmaWxlcyB3aXRoIHRoZSBzb3VyY2UgY29udHJvbCBzeXN0ZW0nXG4gICAgICAgIH0sXG4gICAgICAgIGdpdFVzZXJFbWFpbDoge1xuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGxhYmVsOiAnRW1haWwnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGVtYWlsIGFkZHJlc3MgdG8gdXNlIHdoZW4gbWFraW5nIGNoYW5nZXMgdG8gZmlsZXMgd2l0aCB0aGUgc291cmNlIGNvbnRyb2wgc3lzdGVtJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5lbnRpdHkgPSAkc2NvcGU7XG4gICAgJHNjb3BlLmNvbmZpZyA9IGNvbmZpZztcblxuICAgIENvcmUuaW5pdFByZWZlcmVuY2VTY29wZSgkc2NvcGUsIGxvY2FsU3RvcmFnZSwge1xuICAgICAgJ2dpdFVzZXJOYW1lJzoge1xuICAgICAgICAndmFsdWUnOiB1c2VyRGV0YWlscy51c2VybmFtZSB8fCBcIlwiXG4gICAgICB9LFxuICAgICAgJ2dpdFVzZXJFbWFpbCc6IHtcbiAgICAgICAgJ3ZhbHVlJzogJydcbiAgICAgIH0gIFxuICAgIH0pO1xuICB9XSk7XG4gfVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkhpc3RvcnlDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwibWFya2VkXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsICR0ZW1wbGF0ZUNhY2hlLCBtYXJrZWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpID0+IHtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuICAgIHZhciBqb2xva2lhID0gbnVsbDtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgIC8vIFRPRE8gd2UgY291bGQgY29uZmlndXJlIHRoaXM/XG4gICAgJHNjb3BlLmRhdGVGb3JtYXQgPSAnRUVFLCBNTU0gZCwgeSBhdCBISDptbTpzcyBaJztcbiAgICAvLyd5eXl5LU1NLWRkIEhIOm1tOnNzIFonXG5cbiAgICAkc2NvcGUuZ3JpZE9wdGlvbnMgPSB7XG4gICAgICBkYXRhOiAnbG9ncycsXG4gICAgICBzaG93RmlsdGVyOiBmYWxzZSxcbiAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgIG11bHRpU2VsZWN0OiB0cnVlLFxuICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBkaXNwbGF5U2VsZWN0aW9uQ2hlY2tib3ggOiB0cnVlLCAvLyBvbGQgcHJlIDIuMCBjb25maWchXG4gICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgIGZpbHRlclRleHQ6ICcnXG4gICAgICB9LFxuICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICckZGF0ZScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdNb2RpZmllZCcsXG4gICAgICAgICAgZGVmYXVsdFNvcnQ6IHRydWUsXG4gICAgICAgICAgYXNjZW5kaW5nOiBmYWxzZSxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dCB0ZXh0LW5vd3JhcFwiIHRpdGxlPVwie3tyb3cuZW50aXR5LiRkYXRlIHwgZGF0ZTpcXCdFRUUsIE1NTSBkLCB5eXl5IDogSEg6bW06c3MgWlxcJ319XCI+e3tyb3cuZW50aXR5LiRkYXRlLnJlbGF0aXZlKCl9fTwvZGl2PicsXG4gICAgICAgICAgd2lkdGg6IFwiKipcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdzaGEnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnQ2hhbmdlJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dCB0ZXh0LW5vd3JhcFwiPjxhIGNsYXNzPVwiY29tbWl0LWxpbmtcIiBuZy1ocmVmPVwie3tyb3cuZW50aXR5LmNvbW1pdExpbmt9fXt7aGFzaH19XCIgdGl0bGU9XCJ7e3Jvdy5lbnRpdHkuc2hhfX1cIj57e3Jvdy5lbnRpdHkuc2hhIHwgbGltaXRUbzo3fX0gPGkgY2xhc3M9XCJmYSBmYS1hcnJvdy1jaXJjbGUtcmlnaHRcIj48L2k+PC9hPjwvZGl2PicsXG4gICAgICAgICAgY2VsbEZpbHRlcjogXCJcIixcbiAgICAgICAgICB3aWR0aDogXCIqXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnYXV0aG9yJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ0F1dGhvcicsXG4gICAgICAgICAgY2VsbEZpbHRlcjogXCJcIixcbiAgICAgICAgICB3aWR0aDogXCIqKlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ3Nob3J0X21lc3NhZ2UnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTWVzc2FnZScsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cIm5nQ2VsbFRleHQgdGV4dC1ub3dyYXBcIiB0aXRsZT1cInt7cm93LmVudGl0eS5zaG9ydF9tZXNzYWdlfX1cIj57e3Jvdy5lbnRpdHkuc2hvcnRfbWVzc2FnZX19PC9kaXY+JyxcbiAgICAgICAgICB3aWR0aDogXCIqKioqXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuY2FuUmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIHJldHVybiBzZWxlY3RlZEl0ZW1zLmxlbmd0aCA9PT0gMSAmJiBzZWxlY3RlZEl0ZW1zWzBdICE9PSAkc2NvcGUubG9nc1swXTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJldmVydCA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBvYmplY3RJZCA9IHNlbGVjdGVkSXRlbXNbMF0uc2hhO1xuICAgICAgICBpZiAob2JqZWN0SWQpIHtcbiAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9IFwiUmV2ZXJ0aW5nIGZpbGUgXCIgKyAkc2NvcGUucGFnZUlkICsgXCIgdG8gcHJldmlvdXMgdmVyc2lvbiBcIiArIG9iamVjdElkO1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnJldmVydFRvKCRzY29wZS5icmFuY2gsIG9iamVjdElkLCAkc2NvcGUucGFnZUlkLCBjb21taXRNZXNzYWdlLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUocmVzdWx0KTtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHVwZGF0ZSB0aGUgdmlld1xuICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oJ3N1Y2Nlc3MnLCBcIlN1Y2Nlc3NmdWxseSByZXZlcnRlZCBcIiArICRzY29wZS5wYWdlSWQpO1xuICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHNlbGVjdGVkSXRlbXMuc3BsaWNlKDAsIHNlbGVjdGVkSXRlbXMubGVuZ3RoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRpZmYgPSAoKSA9PiB7XG4gICAgICB2YXIgZGVmYXVsdFZhbHVlID0gXCIgXCI7XG4gICAgICB2YXIgb2JqZWN0SWQgPSBkZWZhdWx0VmFsdWU7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICBvYmplY3RJZCA9IHNlbGVjdGVkSXRlbXNbMF0uc2hhIHx8IGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIHZhciBiYXNlT2JqZWN0SWQgPSBkZWZhdWx0VmFsdWU7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGJhc2VPYmplY3RJZCA9IHNlbGVjdGVkSXRlbXNbMV0uc2hhIHx8ZGVmYXVsdFZhbHVlO1xuICAgICAgICAvLyBtYWtlIHRoZSBvYmplY3RJZCAodGhlIG9uZSB0aGF0IHdpbGwgc3RhcnQgd2l0aCBiLyBwYXRoKSBhbHdheXMgbmV3ZXIgdGhhbiBiYXNlT2JqZWN0SWRcbiAgICAgICAgaWYgKHNlbGVjdGVkSXRlbXNbMF0uZGF0ZSA8IHNlbGVjdGVkSXRlbXNbMV0uZGF0ZSkge1xuICAgICAgICAgIHZhciBfID0gYmFzZU9iamVjdElkO1xuICAgICAgICAgIGJhc2VPYmplY3RJZCA9IG9iamVjdElkO1xuICAgICAgICAgIG9iamVjdElkID0gXztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIGxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArIFwiL2RpZmYvXCIgKyBvYmplY3RJZCArIFwiL1wiICsgYmFzZU9iamVjdElkICsgXCIvXCIgKyAkc2NvcGUucGFnZUlkO1xuICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiI1wiKTtcbiAgICAgICRsb2NhdGlvbi5wYXRoKHBhdGgpO1xuICAgIH07XG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgdmFyIG9iamVjdElkID0gXCJcIjtcbiAgICAgIHZhciBsaW1pdCA9IDA7XG5cbiAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5oaXN0b3J5KCRzY29wZS5icmFuY2gsIG9iamVjdElkLCAkc2NvcGUucGFnZUlkLCBsaW1pdCwgKGxvZ0FycmF5KSA9PiB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChsb2dBcnJheSwgKGxvZykgPT4ge1xuICAgICAgICAgIC8vIGxldHMgdXNlIHRoZSBzaG9ydGVyIGhhc2ggZm9yIGxpbmtzIGJ5IGRlZmF1bHRcbiAgICAgICAgICB2YXIgY29tbWl0SWQgPSBsb2cuc2hhO1xuICAgICAgICAgIGxvZy4kZGF0ZSA9IERldmVsb3Blci5hc0RhdGUobG9nLmRhdGUpO1xuICAgICAgICAgIGxvZy5jb21taXRMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9jb21taXQvXCIgKyAkc2NvcGUucGFnZUlkICsgXCIvXCIgKyBjb21taXRJZDtcbiAgICAgICAgfSk7XG4gICAgICAgICRzY29wZS5sb2dzID0gXy5zb3J0QnkobG9nQXJyYXksIFwiJGRhdGVcIikucmV2ZXJzZSgpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgICBXaWtpLmxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLk5hdkJhckNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwid2lraUJyYW5jaE1lbnVcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsIHdpa2lCcmFuY2hNZW51OkJyYW5jaE1lbnUpID0+IHtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmJyYW5jaE1lbnVDb25maWcgPSA8VUkuTWVudUl0ZW0+e1xuICAgICAgdGl0bGU6ICRzY29wZS5icmFuY2gsXG4gICAgICBpdGVtczogW11cbiAgICB9O1xuXG4gICAgJHNjb3BlLlZpZXdNb2RlID0gV2lraS5WaWV3TW9kZTtcbiAgICAkc2NvcGUuc2V0Vmlld01vZGUgPSAobW9kZTpXaWtpLlZpZXdNb2RlKSA9PiB7XG4gICAgICAkc2NvcGUuJGVtaXQoJ1dpa2kuU2V0Vmlld01vZGUnLCBtb2RlKTtcbiAgICB9O1xuXG4gICAgd2lraUJyYW5jaE1lbnUuYXBwbHlNZW51RXh0ZW5zaW9ucygkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcyk7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdicmFuY2hlcycsIChuZXdWYWx1ZSwgb2xkVmFsdWUpID0+IHtcbiAgICAgIGlmIChuZXdWYWx1ZSA9PT0gb2xkVmFsdWUgfHwgIW5ld1ZhbHVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zID0gW107XG4gICAgICBpZiAobmV3VmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcy5wdXNoKHtcbiAgICAgICAgICBoZWFkaW5nOiBpc0ZtYyA/IFwiVmVyc2lvbnNcIiA6IFwiQnJhbmNoZXNcIlxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIG5ld1ZhbHVlLnNvcnQoKS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHZhciBtZW51SXRlbSA9IHtcbiAgICAgICAgICB0aXRsZTogaXRlbSxcbiAgICAgICAgICBpY29uOiAnJyxcbiAgICAgICAgICBhY3Rpb246ICgpID0+IHt9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChpdGVtID09PSAkc2NvcGUuYnJhbmNoKSB7XG4gICAgICAgICAgbWVudUl0ZW0uaWNvbiA9IFwiZmEgZmEtb2tcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtZW51SXRlbS5hY3Rpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0VXJsID0gYnJhbmNoTGluayhpdGVtLCA8c3RyaW5nPiRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgICAgICAgICAkbG9jYXRpb24ucGF0aChDb3JlLnRvUGF0aCh0YXJnZXRVcmwpKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zLnB1c2gobWVudUl0ZW0pO1xuICAgICAgfSk7XG4gICAgICB3aWtpQnJhbmNoTWVudS5hcHBseU1lbnVFeHRlbnNpb25zKCRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zKTtcbiAgICB9LCB0cnVlKTtcblxuICAgICRzY29wZS5jcmVhdGVMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhZ2VJZCA9IFdpa2kucGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAgIHJldHVybiBXaWtpLmNyZWF0ZUxpbmsoJHNjb3BlLCBwYWdlSWQsICRsb2NhdGlvbik7XG4gICAgfTtcblxuICAgICRzY29wZS5zdGFydExpbmsgPSBzdGFydExpbmsoJHNjb3BlKTtcblxuICAgICRzY29wZS5zb3VyY2VMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgdmFyIGFuc3dlciA9IDxzdHJpbmc+bnVsbDtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChXaWtpLmN1c3RvbVZpZXdMaW5rcygkc2NvcGUpLCAobGluaykgPT4ge1xuICAgICAgICBpZiAocGF0aC5zdGFydHNXaXRoKGxpbmspKSB7XG4gICAgICAgICAgYW5zd2VyID0gPHN0cmluZz5Db3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBXaWtpLnN0YXJ0TGluaygkc2NvcGUpICsgXCIvdmlld1wiICsgcGF0aC5zdWJzdHJpbmcobGluay5sZW5ndGgpKVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIHJlbW92ZSB0aGUgZm9ybSBwYXJhbWV0ZXIgb24gdmlldy9lZGl0IGxpbmtzXG4gICAgICByZXR1cm4gKCFhbnN3ZXIgJiYgJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXSlcbiAgICAgICAgICAgICAgPyBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBcIiNcIiArIHBhdGgsIFtcImZvcm1cIl0pXG4gICAgICAgICAgICAgIDogYW5zd2VyO1xuICAgIH07XG5cbiAgICAkc2NvcGUuaXNBY3RpdmUgPSAoaHJlZikgPT4ge1xuICAgICAgaWYgKCFocmVmKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBocmVmLmVuZHNXaXRoKCRyb3V0ZVBhcmFtc1sncGFnZSddKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQobG9hZEJyZWFkY3J1bWJzLCA1MCk7XG4gICAgfSk7XG5cbiAgICBsb2FkQnJlYWRjcnVtYnMoKTtcblxuICAgIGZ1bmN0aW9uIHN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rKGJyZWFkY3J1bWIsIGxpbmspIHtcbiAgICAgIHZhciBocmVmID0gYnJlYWRjcnVtYi5ocmVmO1xuICAgICAgaWYgKGhyZWYpIHtcbiAgICAgICAgYnJlYWRjcnVtYi5ocmVmID0gaHJlZi5yZXBsYWNlKFwid2lraS92aWV3XCIsIGxpbmspO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxvYWRCcmVhZGNydW1icygpIHtcbiAgICAgIHZhciBzdGFydCA9IFdpa2kuc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgaHJlZiA9IHN0YXJ0ICsgXCIvdmlld1wiO1xuICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzID0gW1xuICAgICAgICB7aHJlZjogaHJlZiwgbmFtZTogXCJyb290XCJ9XG4gICAgICBdO1xuICAgICAgdmFyIHBhdGggPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgICB2YXIgYXJyYXkgPSBwYXRoID8gcGF0aC5zcGxpdChcIi9cIikgOiBbXTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChhcnJheSwgKG5hbWUpID0+IHtcbiAgICAgICAgaWYgKCFuYW1lLnN0YXJ0c1dpdGgoXCIvXCIpICYmICFocmVmLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgICAgICAgIGhyZWYgKz0gXCIvXCI7XG4gICAgICAgIH1cbiAgICAgICAgaHJlZiArPSBXaWtpLmVuY29kZVBhdGgobmFtZSk7XG4gICAgICAgIGlmICghbmFtZS5pc0JsYW5rKCkpIHtcbiAgICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogaHJlZiwgbmFtZTogbmFtZX0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIGxldHMgc3dpenpsZSB0aGUgbGFzdCBvbmUgb3IgdHdvIHRvIGJlIGZvcm1UYWJsZSB2aWV3cyBpZiB0aGUgbGFzdCBvciAybmQgdG8gbGFzdFxuICAgICAgdmFyIGxvYyA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICBpZiAoJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCkge1xuICAgICAgICB2YXIgbGFzdCA9ICRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMV07XG4gICAgICAgIC8vIHBvc3NpYmx5IHRyaW0gYW55IHJlcXVpcmVkIGZpbGUgZXh0ZW5zaW9uc1xuICAgICAgICBsYXN0Lm5hbWUgPSBXaWtpLmhpZGVGaWxlTmFtZUV4dGVuc2lvbnMobGFzdC5uYW1lKTtcblxuICAgICAgICB2YXIgc3dpenpsZWQgPSBmYWxzZTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKFdpa2kuY3VzdG9tVmlld0xpbmtzKCRzY29wZSksIChsaW5rKSA9PiB7XG4gICAgICAgICAgaWYgKCFzd2l6emxlZCAmJiBsb2Muc3RhcnRzV2l0aChsaW5rKSkge1xuICAgICAgICAgICAgLy8gbGV0cyBzd2l6emxlIHRoZSB2aWV3IHRvIHRoZSBjdXJyZW50IGxpbmtcbiAgICAgICAgICAgIHN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rKCRzY29wZS5icmVhZGNydW1icy5sYXN0KCksIENvcmUudHJpbUxlYWRpbmcobGluaywgXCIvXCIpKTtcbiAgICAgICAgICAgIHN3aXp6bGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXN3aXp6bGVkICYmICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl0pIHtcbiAgICAgICAgICB2YXIgbGFzdE5hbWUgPSAkc2NvcGUuYnJlYWRjcnVtYnMubGFzdCgpLm5hbWU7XG4gICAgICAgICAgaWYgKGxhc3ROYW1lICYmIGxhc3ROYW1lLmVuZHNXaXRoKFwiLmpzb25cIikpIHtcbiAgICAgICAgICAgIC8vIHByZXZpb3VzIGJyZWFkY3J1bWIgc2hvdWxkIGJlIGEgZm9ybVRhYmxlXG4gICAgICAgICAgICBzd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluaygkc2NvcGUuYnJlYWRjcnVtYnNbJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCAtIDJdLCBcIndpa2kvZm9ybVRhYmxlXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLypcbiAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChcIi93aWtpL2hpc3RvcnlcIikgfHwgbG9jLnN0YXJ0c1dpdGgoXCIvd2lraS92ZXJzaW9uXCIpXG4gICAgICAgIHx8IGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvZGlmZlwiKSB8fCBsb2Muc3RhcnRzV2l0aChcIi93aWtpL2NvbW1pdFwiKSkge1xuICAgICAgICAvLyBsZXRzIGFkZCBhIGhpc3RvcnkgdGFiXG4gICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiMvd2lraS9oaXN0b3J5L1wiICsgcGF0aCwgbmFtZTogXCJIaXN0b3J5XCJ9KTtcbiAgICAgIH0gZWxzZSBpZiAoJHNjb3BlLmJyYW5jaCkge1xuICAgICAgICB2YXIgcHJlZml4ID1cIi93aWtpL2JyYW5jaC9cIiArICRzY29wZS5icmFuY2g7XG4gICAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi9oaXN0b3J5XCIpIHx8IGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL3ZlcnNpb25cIilcbiAgICAgICAgICB8fCBsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi9kaWZmXCIpIHx8IGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL2NvbW1pdFwiKSkge1xuICAgICAgICAgIC8vIGxldHMgYWRkIGEgaGlzdG9yeSB0YWJcbiAgICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogXCIjL3dpa2kvYnJhbmNoL1wiICsgJHNjb3BlLmJyYW5jaCArIFwiL2hpc3RvcnkvXCIgKyBwYXRoLCBuYW1lOiBcIkhpc3RvcnlcIn0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAqL1xuICAgICAgdmFyIG5hbWU6c3RyaW5nID0gbnVsbDtcbiAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChcIi93aWtpL3ZlcnNpb25cIikpIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgYSB2ZXJzaW9uIHRhYlxuICAgICAgICBuYW1lID0gKCRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8IFwiXCIpLnN1YnN0cmluZygwLCA2KSB8fCBcIlZlcnNpb25cIjtcbiAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IFwiI1wiICsgbG9jLCBuYW1lOiBuYW1lfSk7XG4gICAgICB9XG4gICAgICBpZiAobG9jLnN0YXJ0c1dpdGgoXCIvd2lraS9kaWZmXCIpKSB7XG4gICAgICAgIC8vIGxldHMgYWRkIGEgdmVyc2lvbiB0YWJcbiAgICAgICAgdmFyIHYxID0gKCRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8IFwiXCIpLnN1YnN0cmluZygwLCA2KTtcbiAgICAgICAgdmFyIHYyID0gKCRyb3V0ZVBhcmFtc1tcImJhc2VPYmplY3RJZFwiXSB8fCBcIlwiKS5zdWJzdHJpbmcoMCwgNik7XG4gICAgICAgIG5hbWUgPSBcIkRpZmZcIjtcbiAgICAgICAgaWYgKHYxKSB7XG4gICAgICAgICAgaWYgKHYyKSB7XG4gICAgICAgICAgICBuYW1lICs9IFwiIFwiICsgdjEgKyBcIiBcIiArIHYyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuYW1lICs9IFwiIFwiICsgdjE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiNcIiArIGxvYywgbmFtZTogbmFtZX0pO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLy8gbWFpbiBwYWdlIGNvbnRyb2xsZXJcbiAgZXhwb3J0IHZhciBWaWV3Q29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuVmlld0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHJvdXRlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgIFwiJGNvbXBpbGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcImxvY2FsU3RvcmFnZVwiLCBcIiRpbnRlcnBvbGF0ZVwiLCBcIiRkaWFsb2dcIiwgKCRzY29wZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtczpuZy5yb3V0ZS5JUm91dGVQYXJhbXNTZXJ2aWNlLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJGh0dHA6bmcuSUh0dHBTZXJ2aWNlLCAkdGltZW91dDpuZy5JVGltZW91dFNlcnZpY2UsIG1hcmtlZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSwgICRjb21waWxlOm5nLklDb21waWxlU2VydmljZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRpbnRlcnBvbGF0ZTpuZy5JSW50ZXJwb2xhdGVTZXJ2aWNlLCAkZGlhbG9nKSA9PiB7XG5cbiAgICAkc2NvcGUubmFtZSA9IFwiV2lraVZpZXdDb250cm9sbGVyXCI7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgIFNlbGVjdGlvbkhlbHBlcnMuZGVjb3JhdGUoJHNjb3BlKTtcblxuICAgICRzY29wZS5mYWJyaWNUb3BMZXZlbCA9IFwiZmFicmljL3Byb2ZpbGVzL1wiO1xuXG4gICAgJHNjb3BlLnZlcnNpb25JZCA9ICRzY29wZS5icmFuY2g7XG5cbiAgICAkc2NvcGUucGFuZVRlbXBsYXRlID0gJyc7XG5cbiAgICAkc2NvcGUucHJvZmlsZUlkID0gXCJcIjtcbiAgICAkc2NvcGUuc2hvd1Byb2ZpbGVIZWFkZXIgPSBmYWxzZTtcbiAgICAkc2NvcGUuc2hvd0FwcEhlYWRlciA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLm9wZXJhdGlvbkNvdW50ZXIgPSAxO1xuICAgICRzY29wZS5yZW5hbWVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUubW92ZURpYWxvZyA9IDxXaWtpRGlhbG9nPiBudWxsO1xuICAgICRzY29wZS5kZWxldGVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUuaXNGaWxlID0gZmFsc2U7XG5cbiAgICAkc2NvcGUucmVuYW1lID0ge1xuICAgICAgbmV3RmlsZU5hbWU6IFwiXCJcbiAgICB9O1xuICAgICRzY29wZS5tb3ZlID0ge1xuICAgICAgbW92ZUZvbGRlcjogXCJcIlxuICAgIH07XG4gICAgJHNjb3BlLlZpZXdNb2RlID0gV2lraS5WaWV3TW9kZTtcblxuICAgIC8vIGJpbmQgZmlsdGVyIG1vZGVsIHZhbHVlcyB0byBzZWFyY2ggcGFyYW1zLi4uXG4gICAgQ29yZS5iaW5kTW9kZWxUb1NlYXJjaFBhcmFtKCRzY29wZSwgJGxvY2F0aW9uLCBcInNlYXJjaFRleHRcIiwgXCJxXCIsIFwiXCIpO1xuXG4gICAgU3RvcmFnZUhlbHBlcnMuYmluZE1vZGVsVG9Mb2NhbFN0b3JhZ2Uoe1xuICAgICAgJHNjb3BlOiAkc2NvcGUsXG4gICAgICAkbG9jYXRpb246ICRsb2NhdGlvbixcbiAgICAgIGxvY2FsU3RvcmFnZTogbG9jYWxTdG9yYWdlLFxuICAgICAgbW9kZWxOYW1lOiAnbW9kZScsXG4gICAgICBwYXJhbU5hbWU6ICd3aWtpVmlld01vZGUnLFxuICAgICAgaW5pdGlhbFZhbHVlOiBXaWtpLlZpZXdNb2RlLkxpc3QsXG4gICAgICB0bzogQ29yZS5udW1iZXJUb1N0cmluZyxcbiAgICAgIGZyb206IENvcmUucGFyc2VJbnRWYWx1ZVxuICAgIH0pO1xuXG4gICAgLy8gb25seSByZWxvYWQgdGhlIHBhZ2UgaWYgY2VydGFpbiBzZWFyY2ggcGFyYW1ldGVycyBjaGFuZ2VcbiAgICBDb3JlLnJlbG9hZFdoZW5QYXJhbWV0ZXJzQ2hhbmdlKCRyb3V0ZSwgJHNjb3BlLCAkbG9jYXRpb24sIFsnd2lraVZpZXdNb2RlJ10pO1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgZGF0YTogJ2NoaWxkcmVuJyxcbiAgICAgIGRpc3BsYXlGb290ZXI6IGZhbHNlLFxuICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBlbmFibGVTb3J0aW5nOiBmYWxzZSxcbiAgICAgIHVzZUV4dGVybmFsU29ydGluZzogdHJ1ZSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdOYW1lJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldCgnZmlsZUNlbGxUZW1wbGF0ZS5odG1sJyksXG4gICAgICAgICAgaGVhZGVyQ2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ2ZpbGVDb2x1bW5UZW1wbGF0ZS5odG1sJylcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKCdXaWtpLlNldFZpZXdNb2RlJywgKCRldmVudCwgbW9kZTpXaWtpLlZpZXdNb2RlKSA9PiB7XG4gICAgICAkc2NvcGUubW9kZSA9IG1vZGU7XG4gICAgICBzd2l0Y2gobW9kZSkge1xuICAgICAgICBjYXNlIFZpZXdNb2RlLkxpc3Q6XG4gICAgICAgICAgbG9nLmRlYnVnKFwiTGlzdCB2aWV3IG1vZGVcIik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgVmlld01vZGUuSWNvbjpcbiAgICAgICAgICBsb2cuZGVidWcoXCJJY29uIHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAkc2NvcGUubW9kZSA9IFZpZXdNb2RlLkxpc3Q7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiRGVmYXVsdGluZyB0byBsaXN0IHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgJHNjb3BlLmNoaWxkQWN0aW9ucyA9IFtdO1xuXG4gICAgdmFyIG1heWJlVXBkYXRlVmlldyA9IENvcmUudGhyb3R0bGVkKHVwZGF0ZVZpZXcsIDEwMDApO1xuXG4gICAgJHNjb3BlLm1hcmtlZCA9ICh0ZXh0KSA9PiB7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICByZXR1cm4gbWFya2VkKHRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuICAgIH07XG5cblxuICAgICRzY29wZS4kb24oJ3dpa2lCcmFuY2hlc1VwZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1cGRhdGVWaWV3KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuY3JlYXRlRGFzaGJvYXJkTGluayA9ICgpID0+IHtcbiAgICAgIHZhciBocmVmID0gJy93aWtpL2JyYW5jaC86YnJhbmNoL3ZpZXcvKnBhZ2UnO1xuICAgICAgdmFyIHBhZ2UgPSAkcm91dGVQYXJhbXNbJ3BhZ2UnXTtcbiAgICAgIHZhciB0aXRsZSA9IHBhZ2UgPyBwYWdlLnNwbGl0KFwiL1wiKS5sYXN0KCkgOiBudWxsO1xuICAgICAgdmFyIHNpemUgPSBhbmd1bGFyLnRvSnNvbih7XG4gICAgICAgIHNpemVfeDogMixcbiAgICAgICAgc2l6ZV95OiAyXG4gICAgICB9KTtcbiAgICAgIHZhciBhbnN3ZXIgPSBcIiMvZGFzaGJvYXJkL2FkZD90YWI9ZGFzaGJvYXJkXCIgK1xuICAgICAgICBcIiZocmVmPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGhyZWYpICtcbiAgICAgICAgXCImc2l6ZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChzaXplKSArXG4gICAgICAgIFwiJnJvdXRlUGFyYW1zPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGFuZ3VsYXIudG9Kc29uKCRyb3V0ZVBhcmFtcykpO1xuICAgICAgaWYgKHRpdGxlKSB7XG4gICAgICAgIGFuc3dlciArPSBcIiZ0aXRsZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh0aXRsZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYW5zd2VyO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZGlzcGxheUNsYXNzID0gKCkgPT4ge1xuICAgICAgaWYgKCEkc2NvcGUuY2hpbGRyZW4gfHwgJHNjb3BlLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcInNwYW45XCI7XG4gICAgfTtcblxuICAgICRzY29wZS5wYXJlbnRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgcHJlZml4ID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhZ2VJZDogXCIsICRzY29wZS5wYWdlSWQpXG4gICAgICB2YXIgcGFydHMgPSAkc2NvcGUucGFnZUlkLnNwbGl0KFwiL1wiKTtcbiAgICAgIC8vbG9nLmRlYnVnKFwicGFydHM6IFwiLCBwYXJ0cyk7XG4gICAgICB2YXIgcGF0aCA9IFwiL1wiICsgcGFydHMuZmlyc3QocGFydHMubGVuZ3RoIC0gMSkuam9pbihcIi9cIik7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhdGg6IFwiLCBwYXRoKTtcbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBwcmVmaXggKyBwYXRoLCBbXSk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmNoaWxkTGluayA9IChjaGlsZCkgPT4ge1xuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgcHJlZml4ID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICB2YXIgcG9zdEZpeCA9IFwiXCI7XG4gICAgICB2YXIgcGF0aCA9IFdpa2kuZW5jb2RlUGF0aChjaGlsZC5wYXRoKTtcbiAgICAgIGlmIChjaGlsZC5kaXJlY3RvcnkpIHtcbiAgICAgICAgLy8gaWYgd2UgYXJlIGEgZm9sZGVyIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBhIGZvcm0gZmlsZSwgbGV0cyBhZGQgYSBmb3JtIHBhcmFtLi4uXG4gICAgICAgIHZhciBmb3JtUGF0aCA9IHBhdGggKyBcIi5mb3JtXCI7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9ICRzY29wZS5jaGlsZHJlbjtcbiAgICAgICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgICAgdmFyIGZvcm1GaWxlID0gY2hpbGRyZW4uZmluZCgoY2hpbGQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZFsncGF0aCddID09PSBmb3JtUGF0aDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAoZm9ybUZpbGUpIHtcbiAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvZm9ybVRhYmxlXCI7XG4gICAgICAgICAgICBwb3N0Rml4ID0gXCI/Zm9ybT1cIiArIGZvcm1QYXRoO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHhtbE5hbWVzcGFjZXMgPSBjaGlsZC54bWxfbmFtZXNwYWNlcyB8fCBjaGlsZC54bWxOYW1lc3BhY2VzO1xuICAgICAgICBpZiAoeG1sTmFtZXNwYWNlcyAmJiB4bWxOYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICAgIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuY2FtZWxOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgICAgICBpZiAodXNlQ2FtZWxDYW52YXNCeURlZmF1bHQpIHtcbiAgICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9jYW1lbC9jYW52YXNcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvY2FtZWwvcHJvcGVydGllc1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmRvemVyTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9kb3plci9tYXBwaW5nc1wiO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJjaGlsZCBcIiArIHBhdGggKyBcIiBoYXMgbmFtZXNwYWNlcyBcIiArIHhtbE5hbWVzcGFjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGQucGF0aC5lbmRzV2l0aChcIi5mb3JtXCIpKSB7XG4gICAgICAgICAgcG9zdEZpeCA9IFwiP2Zvcm09L1wiO1xuICAgICAgICB9IGVsc2UgaWYgKFdpa2kuaXNJbmRleFBhZ2UoY2hpbGQucGF0aCkpIHtcbiAgICAgICAgICAvLyBsZXRzIGRlZmF1bHQgdG8gYm9vayB2aWV3IG9uIGluZGV4IHBhZ2VzXG4gICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9ib29rXCI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBVcmxIZWxwZXJzLmpvaW4ocHJlZml4LCBwYXRoKSArIHBvc3RGaXgsIFtcImZvcm1cIl0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZU5hbWUgPSAoZW50aXR5KSA9PiB7XG4gICAgICByZXR1cm4gV2lraS5oaWRlRmlsZU5hbWVFeHRlbnNpb25zKGVudGl0eS5kaXNwbGF5TmFtZSB8fCBlbnRpdHkubmFtZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlQ2xhc3MgPSAoZW50aXR5KSA9PiB7XG4gICAgICBpZiAoZW50aXR5Lm5hbWUuaGFzKFwiLnByb2ZpbGVcIikpIHtcbiAgICAgICAgcmV0dXJuIFwiZ3JlZW5cIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZUljb25IdG1sID0gKGVudGl0eSkgPT4ge1xuICAgICAgcmV0dXJuIFdpa2kuZmlsZUljb25IdG1sKGVudGl0eSk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdCgkc2NvcGUucGFnZUlkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KTtcbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgbW9kZToge1xuICAgICAgICBuYW1lOiAkc2NvcGUuZm9ybWF0XG4gICAgICB9XG4gICAgfTtcbiAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMgPSBDb2RlRWRpdG9yLmNyZWF0ZUVkaXRvclNldHRpbmdzKG9wdGlvbnMpO1xuXG4gICAgJHNjb3BlLmVkaXRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhZ2VOYW1lID0gKCRzY29wZS5kaXJlY3RvcnkpID8gJHNjb3BlLnJlYWRNZVBhdGggOiAkc2NvcGUucGFnZUlkO1xuICAgICAgcmV0dXJuIChwYWdlTmFtZSkgPyBXaWtpLmVkaXRMaW5rKCRzY29wZSwgcGFnZU5hbWUsICRsb2NhdGlvbikgOiBudWxsO1xuICAgIH07XG5cbiAgICAkc2NvcGUuYnJhbmNoTGluayA9IChicmFuY2gpID0+IHtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcmV0dXJuIFdpa2kuYnJhbmNoTGluayhicmFuY2gsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH07XG5cbiAgICAkc2NvcGUuaGlzdG9yeUxpbmsgPSBcIiMvd2lraVwiICsgKCRzY29wZS5icmFuY2ggPyBcIi9icmFuY2gvXCIgKyAkc2NvcGUuYnJhbmNoIDogXCJcIikgKyBcIi9oaXN0b3J5L1wiICsgJHNjb3BlLnBhZ2VJZDtcblxuICAgICRzY29wZS4kd2F0Y2goJ3dvcmtzcGFjZS50cmVlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEkc2NvcGUuZ2l0KSB7XG4gICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAgIC8vbG9nLmluZm8oXCJSZWxvYWRpbmcgdmlldyBhcyB0aGUgdHJlZSBjaGFuZ2VkIGFuZCB3ZSBoYXZlIGEgZ2l0IG1iZWFuIG5vd1wiKTtcbiAgICAgICAgc2V0VGltZW91dChtYXliZVVwZGF0ZVZpZXcsIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAvL2xvZy5pbmZvKFwiUmVsb2FkaW5nIHZpZXcgZHVlIHRvICRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIik7XG4gICAgICBzZXRUaW1lb3V0KG1heWJlVXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUub3BlbkRlbGV0ZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRmlsZUh0bWwgPSBcIjx1bD5cIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLm1hcChmaWxlID0+IFwiPGxpPlwiICsgZmlsZS5uYW1lICsgXCI8L2xpPlwiKS5zb3J0KCkuam9pbihcIlwiKSArIFwiPC91bD5cIjtcblxuICAgICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMuZmluZCgoZmlsZSkgPT4geyByZXR1cm4gZmlsZS5uYW1lLmVuZHNXaXRoKFwiLnByb2ZpbGVcIil9KSkge1xuICAgICAgICAgICRzY29wZS5kZWxldGVXYXJuaW5nID0gXCJZb3UgYXJlIGFib3V0IHRvIGRlbGV0ZSBkb2N1bWVudChzKSB3aGljaCByZXByZXNlbnQgRmFicmljOCBwcm9maWxlKHMpLiBUaGlzIHJlYWxseSBjYW4ndCBiZSB1bmRvbmUhIFdpa2kgb3BlcmF0aW9ucyBhcmUgbG93IGxldmVsIGFuZCBtYXkgbGVhZCB0byBub24tZnVuY3Rpb25hbCBzdGF0ZSBvZiBGYWJyaWMuXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJHNjb3BlLmRlbGV0ZVdhcm5pbmcgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLmRlbGV0ZURpYWxvZyA9IFdpa2kuZ2V0RGVsZXRlRGlhbG9nKCRkaWFsb2csIDxXaWtpLkRlbGV0ZURpYWxvZ09wdGlvbnM+e1xuICAgICAgICAgIGNhbGxiYWNrczogKCkgPT4geyByZXR1cm4gJHNjb3BlLmRlbGV0ZUFuZENsb3NlRGlhbG9nOyB9LFxuICAgICAgICAgIHNlbGVjdGVkRmlsZUh0bWw6ICgpID0+ICB7IHJldHVybiAkc2NvcGUuc2VsZWN0ZWRGaWxlSHRtbDsgfSxcbiAgICAgICAgICB3YXJuaW5nOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZGVsZXRlV2FybmluZzsgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuZGVsZXRlRGlhbG9nLm9wZW4oKTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gaXRlbXMgc2VsZWN0ZWQgcmlnaHQgbm93ISBcIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRlbGV0ZUFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIGZpbGVzID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICB2YXIgZmlsZUNvdW50ID0gZmlsZXMubGVuZ3RoO1xuICAgICAgbG9nLmRlYnVnKFwiRGVsZXRpbmcgc2VsZWN0aW9uOiBcIiArIGZpbGVzKTtcblxuICAgICAgdmFyIHBhdGhzVG9EZWxldGUgPSBbXTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChmaWxlcywgKGZpbGUsIGlkeCkgPT4ge1xuICAgICAgICB2YXIgcGF0aCA9IFVybEhlbHBlcnMuam9pbigkc2NvcGUucGFnZUlkLCBmaWxlLm5hbWUpO1xuICAgICAgICBwYXRoc1RvRGVsZXRlLnB1c2gocGF0aCk7XG4gICAgICB9KTtcblxuICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gZGVsZXRlIFwiICsgcGF0aHNUb0RlbGV0ZSk7XG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZXMoJHNjb3BlLmJyYW5jaCwgcGF0aHNUb0RlbGV0ZSwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyA9IFtdO1xuICAgICAgICB2YXIgbWVzc2FnZSA9IENvcmUubWF5YmVQbHVyYWwoZmlsZUNvdW50LCBcImRvY3VtZW50XCIpO1xuICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJEZWxldGVkIFwiICsgbWVzc2FnZSk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgIH0pO1xuICAgICAgJHNjb3BlLmRlbGV0ZURpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKFwicmVuYW1lLm5ld0ZpbGVOYW1lXCIsICgpID0+IHtcbiAgICAgIC8vIGlnbm9yZSBlcnJvcnMgaWYgdGhlIGZpbGUgaXMgdGhlIHNhbWUgYXMgdGhlIHJlbmFtZSBmaWxlIVxuICAgICAgdmFyIHBhdGggPSBnZXRSZW5hbWVGaWxlUGF0aCgpO1xuICAgICAgaWYgKCRzY29wZS5vcmlnaW5hbFJlbmFtZUZpbGVQYXRoID09PSBwYXRoKSB7XG4gICAgICAgICRzY29wZS5maWxlRXhpc3RzID0geyBleGlzdHM6IGZhbHNlLCBuYW1lOiBudWxsIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGVja0ZpbGVFeGlzdHMocGF0aCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUucmVuYW1lQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICB2YXIgbmV3UGF0aCA9IGdldFJlbmFtZUZpbGVQYXRoKCk7XG4gICAgICAgIGlmIChzZWxlY3RlZCAmJiBuZXdQYXRoKSB7XG4gICAgICAgICAgdmFyIG9sZE5hbWUgPSBzZWxlY3RlZC5uYW1lO1xuICAgICAgICAgIHZhciBuZXdOYW1lID0gV2lraS5maWxlTmFtZShuZXdQYXRoKTtcbiAgICAgICAgICB2YXIgb2xkUGF0aCA9IFVybEhlbHBlcnMuam9pbigkc2NvcGUucGFnZUlkLCBvbGROYW1lKTtcbiAgICAgICAgICBsb2cuZGVidWcoXCJBYm91dCB0byByZW5hbWUgZmlsZSBcIiArIG9sZFBhdGggKyBcIiB0byBcIiArIG5ld1BhdGgpO1xuICAgICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5yZW5hbWUoJHNjb3BlLmJyYW5jaCwgb2xkUGF0aCwgbmV3UGF0aCwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiUmVuYW1lZCBmaWxlIHRvICBcIiArIG5ld05hbWUpO1xuICAgICAgICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMuc3BsaWNlKDAsIDEpO1xuICAgICAgICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZy5jbG9zZSgpO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub3BlblJlbmFtZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBuYW1lID0gbnVsbDtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgIG5hbWUgPSBzZWxlY3RlZC5uYW1lO1xuICAgICAgfVxuICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgJHNjb3BlLnJlbmFtZS5uZXdGaWxlTmFtZSA9IG5hbWU7XG4gICAgICAgICRzY29wZS5vcmlnaW5hbFJlbmFtZUZpbGVQYXRoID0gZ2V0UmVuYW1lRmlsZVBhdGgoKTtcblxuICAgICAgICAkc2NvcGUucmVuYW1lRGlhbG9nID0gV2lraS5nZXRSZW5hbWVEaWFsb2coJGRpYWxvZywgPFdpa2kuUmVuYW1lRGlhbG9nT3B0aW9ucz57XG4gICAgICAgICAgcmVuYW1lOiAoKSA9PiB7ICByZXR1cm4gJHNjb3BlLnJlbmFtZTsgfSxcbiAgICAgICAgICBmaWxlRXhpc3RzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZmlsZUV4aXN0czsgfSxcbiAgICAgICAgICBmaWxlTmFtZTogKCkgPT4geyByZXR1cm4gJHNjb3BlLmZpbGVOYW1lOyB9LFxuICAgICAgICAgIGNhbGxiYWNrczogKCkgPT4geyByZXR1cm4gJHNjb3BlLnJlbmFtZUFuZENsb3NlRGlhbG9nOyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5yZW5hbWVEaWFsb2cub3BlbigpO1xuXG4gICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAkKCcjcmVuYW1lRmlsZU5hbWUnKS5mb2N1cygpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJObyBpdGVtcyBzZWxlY3RlZCByaWdodCBub3chIFwiICsgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUubW92ZUFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIGZpbGVzID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICB2YXIgZmlsZUNvdW50ID0gZmlsZXMubGVuZ3RoO1xuICAgICAgdmFyIG1vdmVGb2xkZXIgPSAkc2NvcGUubW92ZS5tb3ZlRm9sZGVyO1xuICAgICAgdmFyIG9sZEZvbGRlcjpzdHJpbmcgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgaWYgKG1vdmVGb2xkZXIgJiYgZmlsZUNvdW50ICYmIG1vdmVGb2xkZXIgIT09IG9sZEZvbGRlcikge1xuICAgICAgICBsb2cuZGVidWcoXCJNb3ZpbmcgXCIgKyBmaWxlQ291bnQgKyBcIiBmaWxlKHMpIHRvIFwiICsgbW92ZUZvbGRlcik7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChmaWxlcywgKGZpbGUsIGlkeCkgPT4ge1xuICAgICAgICAgIHZhciBvbGRQYXRoID0gb2xkRm9sZGVyICsgXCIvXCIgKyBmaWxlLm5hbWU7XG4gICAgICAgICAgdmFyIG5ld1BhdGggPSBtb3ZlRm9sZGVyICsgXCIvXCIgKyBmaWxlLm5hbWU7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gbW92ZSBcIiArIG9sZFBhdGggKyBcIiB0byBcIiArIG5ld1BhdGgpO1xuICAgICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5yZW5hbWUoJHNjb3BlLmJyYW5jaCwgb2xkUGF0aCwgbmV3UGF0aCwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlkeCArIDEgPT09IGZpbGVDb3VudCkge1xuICAgICAgICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5zcGxpY2UoMCwgZmlsZUNvdW50KTtcbiAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBDb3JlLm1heWJlUGx1cmFsKGZpbGVDb3VudCwgXCJkb2N1bWVudFwiKTtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiTW92ZWQgXCIgKyBtZXNzYWdlICsgXCIgdG8gXCIgKyBuZXdQYXRoKTtcbiAgICAgICAgICAgICAgJHNjb3BlLm1vdmVEaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5tb3ZlRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5mb2xkZXJOYW1lcyA9ICh0ZXh0KSA9PiB7XG4gICAgICByZXR1cm4gd2lraVJlcG9zaXRvcnkuY29tcGxldGVQYXRoKCRzY29wZS5icmFuY2gsIHRleHQsIHRydWUsIG51bGwpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub3Blbk1vdmVEaWFsb2cgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5tb3ZlLm1vdmVGb2xkZXIgPSAkc2NvcGUucGFnZUlkO1xuXG4gICAgICAgICRzY29wZS5tb3ZlRGlhbG9nID0gV2lraS5nZXRNb3ZlRGlhbG9nKCRkaWFsb2csIDxXaWtpLk1vdmVEaWFsb2dPcHRpb25zPntcbiAgICAgICAgICBtb3ZlOiAoKSA9PiB7ICByZXR1cm4gJHNjb3BlLm1vdmU7IH0sXG4gICAgICAgICAgZm9sZGVyTmFtZXM6ICgpID0+IHsgcmV0dXJuICRzY29wZS5mb2xkZXJOYW1lczsgfSxcbiAgICAgICAgICBjYWxsYmFja3M6ICgpID0+IHsgcmV0dXJuICRzY29wZS5tb3ZlQW5kQ2xvc2VEaWFsb2c7IH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLm1vdmVEaWFsb2cub3BlbigpO1xuXG4gICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAkKCcjbW92ZUZvbGRlcicpLmZvY3VzKCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIGl0ZW1zIHNlbGVjdGVkIHJpZ2h0IG5vdyEgXCIgKyAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyk7XG4gICAgICB9XG4gICAgfTtcblxuXG4gICAgc2V0VGltZW91dChtYXliZVVwZGF0ZVZpZXcsIDUwKTtcblxuICAgIGZ1bmN0aW9uIGlzRGlmZlZpZXcoKSB7XG4gICAgICByZXR1cm4gJHJvdXRlUGFyYW1zW1wiZGlmZk9iamVjdElkMVwiXSB8fCAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQyXCJdID8gdHJ1ZSA6IGZhbHNlXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgICAgLy8gVE9ETyByZW1vdmUhXG4gICAgICAgIHZhciBqb2xva2lhID0gbnVsbDtcblxuXG4gICAgICBpZiAoaXNEaWZmVmlldygpKSB7XG4gICAgICAgIHZhciBiYXNlT2JqZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQyXCJdO1xuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZGlmZigkc2NvcGUub2JqZWN0SWQsIGJhc2VPYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgb25GaWxlRGV0YWlscyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCAkc2NvcGUub2JqZWN0SWQsIG9uRmlsZURldGFpbHMpO1xuICAgICAgfVxuICAgICAgV2lraS5sb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMpO1xuICAgIH1cblxuICAgICRzY29wZS51cGRhdGVWaWV3ID0gdXBkYXRlVmlldztcblxuICAgIGZ1bmN0aW9uIHZpZXdDb250ZW50cyhwYWdlTmFtZSwgY29udGVudHMpIHtcbiAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gbnVsbDtcblxuICAgICAgdmFyIGZvcm1hdDpzdHJpbmcgPSBudWxsO1xuICAgICAgaWYgKGlzRGlmZlZpZXcoKSkge1xuICAgICAgICBmb3JtYXQgPSBcImRpZmZcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdChwYWdlTmFtZSwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgfHwgJHNjb3BlLmZvcm1hdDtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcIkZpbGUgZm9ybWF0OiBcIiwgZm9ybWF0KTtcbiAgICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICAgIGNhc2UgXCJpbWFnZVwiOlxuICAgICAgICAgIHZhciBpbWFnZVVSTCA9ICdnaXQvJyArICRzY29wZS5icmFuY2g7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiJHNjb3BlOiBcIiwgJHNjb3BlKTtcbiAgICAgICAgICBpbWFnZVVSTCA9IFVybEhlbHBlcnMuam9pbihpbWFnZVVSTCwgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgICAgdmFyIGludGVycG9sYXRlRnVuYyA9ICRpbnRlcnBvbGF0ZSgkdGVtcGxhdGVDYWNoZS5nZXQoXCJpbWFnZVRlbXBsYXRlLmh0bWxcIikpO1xuICAgICAgICAgICRzY29wZS5odG1sID0gaW50ZXJwb2xhdGVGdW5jKHtcbiAgICAgICAgICAgIGltYWdlVVJMOiBpbWFnZVVSTFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwibWFya2Rvd25cIjpcbiAgICAgICAgICAkc2NvcGUuaHRtbCA9IGNvbnRlbnRzID8gbWFya2VkKGNvbnRlbnRzKSA6IFwiXCI7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJqYXZhc2NyaXB0XCI6XG4gICAgICAgICAgdmFyIGZvcm0gPSBudWxsO1xuICAgICAgICAgIGZvcm0gPSAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdO1xuICAgICAgICAgICRzY29wZS5zb3VyY2UgPSBjb250ZW50cztcbiAgICAgICAgICAkc2NvcGUuZm9ybSA9IGZvcm07XG4gICAgICAgICAgaWYgKGZvcm0pIHtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHRyeSBsb2FkIHRoZSBmb3JtIEpTT04gc28gd2UgY2FuIHRoZW4gcmVuZGVyIHRoZSBmb3JtXG4gICAgICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb3JtLCAkc2NvcGUub2JqZWN0SWQsIChkZXRhaWxzKSA9PiB7XG4gICAgICAgICAgICAgIG9uRm9ybVNjaGVtYShXaWtpLnBhcnNlSnNvbihkZXRhaWxzLnRleHQpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvc291cmNlVmlldy5odG1sXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICRzY29wZS5odG1sID0gbnVsbDtcbiAgICAgICAgICAkc2NvcGUuc291cmNlID0gY29udGVudHM7XG4gICAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL3NvdXJjZVZpZXcuaHRtbFwiO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZvcm1TY2hlbWEoanNvbikge1xuICAgICAgJHNjb3BlLmZvcm1EZWZpbml0aW9uID0ganNvbjtcbiAgICAgIGlmICgkc2NvcGUuc291cmNlKSB7XG4gICAgICAgICRzY29wZS5mb3JtRW50aXR5ID0gV2lraS5wYXJzZUpzb24oJHNjb3BlLnNvdXJjZSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvZm9ybVZpZXcuaHRtbFwiO1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZpbGVEZXRhaWxzKGRldGFpbHMpIHtcbiAgICAgIHZhciBjb250ZW50cyA9IGRldGFpbHMudGV4dDtcbiAgICAgICRzY29wZS5kaXJlY3RvcnkgPSBkZXRhaWxzLmRpcmVjdG9yeTtcbiAgICAgICRzY29wZS5maWxlRGV0YWlscyA9IGRldGFpbHM7XG5cbiAgICAgIGlmIChkZXRhaWxzICYmIGRldGFpbHMuZm9ybWF0KSB7XG4gICAgICAgICRzY29wZS5mb3JtYXQgPSBkZXRhaWxzLmZvcm1hdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5mb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQoJHNjb3BlLnBhZ2VJZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMubW9kZS5uYW1lID0gJHNjb3BlLmZvcm1hdDtcbiAgICAgICRzY29wZS5jaGlsZHJlbiA9IG51bGw7XG5cbiAgICAgIGlmIChkZXRhaWxzLmRpcmVjdG9yeSkge1xuICAgICAgICB2YXIgZGlyZWN0b3JpZXMgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbHRlcigoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRpci5kaXJlY3Rvcnk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgcHJvZmlsZXMgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbHRlcigoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGZpbGVzID0gZGV0YWlscy5jaGlsZHJlbi5maWx0ZXIoKGZpbGUpID0+IHtcbiAgICAgICAgICByZXR1cm4gIWZpbGUuZGlyZWN0b3J5O1xuICAgICAgICB9KTtcbiAgICAgICAgZGlyZWN0b3JpZXMgPSBkaXJlY3Rvcmllcy5zb3J0QnkoKGRpcikgPT4ge1xuICAgICAgICAgIHJldHVybiBkaXIubmFtZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2ZpbGVzID0gcHJvZmlsZXMuc29ydEJ5KChkaXIpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGlyLm5hbWU7XG4gICAgICAgIH0pO1xuICAgICAgICBmaWxlcyA9IGZpbGVzLnNvcnRCeSgoZmlsZSkgPT4ge1xuICAgICAgICAgIHJldHVybiBmaWxlLm5hbWU7XG4gICAgICAgIH0pXG4gICAgICAgICAgLnNvcnRCeSgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGZpbGUubmFtZS5zcGxpdCgnLicpLmxhc3QoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgLy8gQWxzbyBlbnJpY2ggdGhlIHJlc3BvbnNlIHdpdGggdGhlIGN1cnJlbnQgYnJhbmNoLCBhcyB0aGF0J3MgcGFydCBvZiB0aGUgY29vcmRpbmF0ZSBmb3IgbG9jYXRpbmcgdGhlIGFjdHVhbCBmaWxlIGluIGdpdFxuICAgICAgICAkc2NvcGUuY2hpbGRyZW4gPSAoPGFueT5BcnJheSkuY3JlYXRlKGRpcmVjdG9yaWVzLCBwcm9maWxlcywgZmlsZXMpLm1hcCgoZmlsZSkgPT4ge1xuICAgICAgICAgIGZpbGUuYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICAgICAgICBmaWxlLmZpbGVOYW1lID0gZmlsZS5uYW1lO1xuICAgICAgICAgIGlmIChmaWxlLmRpcmVjdG9yeSkge1xuICAgICAgICAgICAgZmlsZS5maWxlTmFtZSArPSBcIi56aXBcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmlsZS5kb3dubG9hZFVSTCA9IFdpa2kuZ2l0UmVzdFVSTCgkc2NvcGUsIGZpbGUucGF0aCk7XG4gICAgICAgICAgcmV0dXJuIGZpbGU7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG5cbiAgICAgICRzY29wZS5odG1sID0gbnVsbDtcbiAgICAgICRzY29wZS5zb3VyY2UgPSBudWxsO1xuICAgICAgJHNjb3BlLnJlYWRNZVBhdGggPSBudWxsO1xuXG4gICAgICAkc2NvcGUuaXNGaWxlID0gZmFsc2U7XG4gICAgICBpZiAoJHNjb3BlLmNoaWxkcmVuKSB7XG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdwYW5lLm9wZW4nKTtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIHJlYWRtZSB0aGVuIGxldHMgcmVuZGVyIGl0Li4uXG4gICAgICAgIHZhciBpdGVtID0gJHNjb3BlLmNoaWxkcmVuLmZpbmQoKGluZm8pID0+IHtcbiAgICAgICAgICB2YXIgbmFtZSA9IChpbmZvLm5hbWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICB2YXIgZXh0ID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAgICAgICByZXR1cm4gbmFtZSAmJiBleHQgJiYgKChuYW1lLnN0YXJ0c1dpdGgoXCJyZWFkbWUuXCIpIHx8IG5hbWUgPT09IFwicmVhZG1lXCIpIHx8IChuYW1lLnN0YXJ0c1dpdGgoXCJpbmRleC5cIikgfHwgbmFtZSA9PT0gXCJpbmRleFwiKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgIHZhciBwYWdlTmFtZSA9IGl0ZW0ucGF0aDtcbiAgICAgICAgICAkc2NvcGUucmVhZE1lUGF0aCA9IHBhZ2VOYW1lO1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGFnZU5hbWUsICRzY29wZS5vYmplY3RJZCwgKHJlYWRtZURldGFpbHMpID0+IHtcbiAgICAgICAgICAgIHZpZXdDb250ZW50cyhwYWdlTmFtZSwgcmVhZG1lRGV0YWlscy50ZXh0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIga3ViZXJuZXRlc0pzb24gPSAkc2NvcGUuY2hpbGRyZW4uZmluZCgoY2hpbGQpID0+IHtcbiAgICAgICAgICB2YXIgbmFtZSA9IChjaGlsZC5uYW1lIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgdmFyIGV4dCA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgICAgICAgcmV0dXJuIG5hbWUgJiYgZXh0ICYmIG5hbWUuc3RhcnRzV2l0aChcImt1YmVybmV0ZXNcIikgJiYgZXh0ID09PSBcImpzb25cIjtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChrdWJlcm5ldGVzSnNvbikge1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwga3ViZXJuZXRlc0pzb24ucGF0aCwgdW5kZWZpbmVkLCAoanNvbikgPT4ge1xuICAgICAgICAgICAgaWYgKGpzb24gJiYganNvbi50ZXh0KSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmt1YmVybmV0ZXNKc29uID0gYW5ndWxhci5mcm9tSnNvbihqc29uLnRleHQpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmt1YmVybmV0ZXNKc29uID0ge1xuICAgICAgICAgICAgICAgICAgZXJyb3JQYXJzaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgZXJyb3I6IGVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRzY29wZS5zaG93QXBwSGVhZGVyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnV2lraS5WaWV3UGFnZS5DaGlsZHJlbicsICRzY29wZS5wYWdlSWQsICRzY29wZS5jaGlsZHJlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgncGFuZS5jbG9zZScpO1xuICAgICAgICB2YXIgcGFnZU5hbWUgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgICB2aWV3Q29udGVudHMocGFnZU5hbWUsIGNvbnRlbnRzKTtcbiAgICAgICAgJHNjb3BlLmlzRmlsZSA9IHRydWU7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrRmlsZUV4aXN0cyhwYXRoKSB7XG4gICAgICAkc2NvcGUub3BlcmF0aW9uQ291bnRlciArPSAxO1xuICAgICAgdmFyIGNvdW50ZXIgPSAkc2NvcGUub3BlcmF0aW9uQ291bnRlcjtcbiAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgIHdpa2lSZXBvc2l0b3J5LmV4aXN0cygkc2NvcGUuYnJhbmNoLCBwYXRoLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgLy8gZmlsdGVyIG9sZCByZXN1bHRzXG4gICAgICAgICAgaWYgKCRzY29wZS5vcGVyYXRpb25Db3VudGVyID09PSBjb3VudGVyKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJjaGVja0ZpbGVFeGlzdHMgZm9yIHBhdGggXCIgKyBwYXRoICsgXCIgZ290IHJlc3VsdCBcIiArIHJlc3VsdCk7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSByZXN1bHQgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gcmVzdWx0ID8gcmVzdWx0Lm5hbWUgOiBudWxsO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbG9nLmRlYnVnKFwiSWdub3Jpbmcgb2xkIHJlc3VsdHMgZm9yIFwiICsgcGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDYWxsZWQgYnkgaGF3dGlvIFRPQyBkaXJlY3RpdmUuLi5cbiAgICAkc2NvcGUuZ2V0Q29udGVudHMgPSAoZmlsZW5hbWUsIGNiKSA9PiB7XG4gICAgICB2YXIgcGFnZUlkID0gZmlsZW5hbWU7XG4gICAgICBpZiAoJHNjb3BlLmRpcmVjdG9yeSkge1xuICAgICAgICBwYWdlSWQgPSAkc2NvcGUucGFnZUlkICsgJy8nICsgZmlsZW5hbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGF0aFBhcnRzID0gJHNjb3BlLnBhZ2VJZC5zcGxpdCgnLycpO1xuICAgICAgICBwYXRoUGFydHMgPSBwYXRoUGFydHMucmVtb3ZlKHBhdGhQYXJ0cy5sYXN0KCkpO1xuICAgICAgICBwYXRoUGFydHMucHVzaChmaWxlbmFtZSk7XG4gICAgICAgIHBhZ2VJZCA9IHBhdGhQYXJ0cy5qb2luKCcvJyk7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoXCJwYWdlSWQ6IFwiLCAkc2NvcGUucGFnZUlkKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImJyYW5jaDogXCIsICRzY29wZS5icmFuY2gpO1xuICAgICAgbG9nLmRlYnVnKFwiZmlsZW5hbWU6IFwiLCBmaWxlbmFtZSk7XG4gICAgICBsb2cuZGVidWcoXCJ1c2luZyBwYWdlSWQ6IFwiLCBwYWdlSWQpO1xuICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYWdlSWQsIHVuZGVmaW5lZCwgKGRhdGEpID0+IHtcbiAgICAgICAgY2IoZGF0YS50ZXh0KTtcbiAgICAgIH0pO1xuICAgIH07XG5cblxuICAgIGZ1bmN0aW9uIGdldFJlbmFtZUZpbGVQYXRoKCkge1xuICAgICAgdmFyIG5ld0ZpbGVOYW1lID0gJHNjb3BlLnJlbmFtZS5uZXdGaWxlTmFtZTtcbiAgICAgIHJldHVybiAoJHNjb3BlLnBhZ2VJZCAmJiBuZXdGaWxlTmFtZSkgPyBVcmxIZWxwZXJzLmpvaW4oJHNjb3BlLnBhZ2VJZCwgbmV3RmlsZU5hbWUpIDogbnVsbDtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IGludGVyZmFjZSBXaWtpRGlhbG9nIHtcbiAgICBvcGVuOiAoKSA9PiB7fTtcbiAgICBjbG9zZTogKCkgPT4ge307XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIFJlbmFtZURpYWxvZ09wdGlvbnMge1xuICAgIHJlbmFtZTogKCkgPT4ge307XG4gICAgZmlsZUV4aXN0czogKCkgPT4ge307XG4gICAgZmlsZU5hbWU6ICgpID0+IFN0cmluZztcbiAgICBjYWxsYmFja3M6ICgpID0+IFN0cmluZztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRSZW5hbWVEaWFsb2coJGRpYWxvZywgJHNjb3BlOlJlbmFtZURpYWxvZ09wdGlvbnMpOldpa2kuV2lraURpYWxvZyB7XG4gICAgcmV0dXJuICRkaWFsb2cuZGlhbG9nKHtcbiAgICAgIHJlc29sdmU6ICRzY29wZSxcbiAgICAgIHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvbW9kYWwvcmVuYW1lRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcInJlbmFtZVwiLCBcImZpbGVFeGlzdHNcIiwgXCJmaWxlTmFtZVwiLCAoJHNjb3BlLCBkaWFsb2csIGNhbGxiYWNrcywgcmVuYW1lLCBmaWxlRXhpc3RzLCBmaWxlTmFtZSkgPT4ge1xuICAgICAgICAkc2NvcGUucmVuYW1lICA9IHJlbmFtZTtcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMgID0gZmlsZUV4aXN0cztcbiAgICAgICAgJHNjb3BlLmZpbGVOYW1lICA9IGZpbGVOYW1lO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUucmVuYW1lQW5kQ2xvc2VEaWFsb2cgPSBjYWxsYmFja3M7XG5cbiAgICAgIH1dXG4gICAgfSk7XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIE1vdmVEaWFsb2dPcHRpb25zIHtcbiAgICBtb3ZlOiAoKSA9PiB7fTtcbiAgICBmb2xkZXJOYW1lczogKCkgPT4ge307XG4gICAgY2FsbGJhY2tzOiAoKSA9PiBTdHJpbmc7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRNb3ZlRGlhbG9nKCRkaWFsb2csICRzY29wZTpNb3ZlRGlhbG9nT3B0aW9ucyk6V2lraS5XaWtpRGlhbG9nIHtcbiAgICByZXR1cm4gJGRpYWxvZy5kaWFsb2coe1xuICAgICAgcmVzb2x2ZTogJHNjb3BlLFxuICAgICAgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9tb2RhbC9tb3ZlRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcIm1vdmVcIiwgXCJmb2xkZXJOYW1lc1wiLCAoJHNjb3BlLCBkaWFsb2csIGNhbGxiYWNrcywgbW92ZSwgZm9sZGVyTmFtZXMpID0+IHtcbiAgICAgICAgJHNjb3BlLm1vdmUgID0gbW92ZTtcbiAgICAgICAgJHNjb3BlLmZvbGRlck5hbWVzICA9IGZvbGRlck5hbWVzO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUubW92ZUFuZENsb3NlRGlhbG9nID0gY2FsbGJhY2tzO1xuXG4gICAgICB9XVxuICAgIH0pO1xuICB9XG5cblxuICBleHBvcnQgaW50ZXJmYWNlIERlbGV0ZURpYWxvZ09wdGlvbnMge1xuICAgIGNhbGxiYWNrczogKCkgPT4gU3RyaW5nO1xuICAgIHNlbGVjdGVkRmlsZUh0bWw6ICgpID0+IFN0cmluZztcbiAgICB3YXJuaW5nOiAoKSA9PiBzdHJpbmc7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXREZWxldGVEaWFsb2coJGRpYWxvZywgJHNjb3BlOkRlbGV0ZURpYWxvZ09wdGlvbnMpOldpa2kuV2lraURpYWxvZyB7XG4gICAgcmV0dXJuICRkaWFsb2cuZGlhbG9nKHtcbiAgICAgIHJlc29sdmU6ICRzY29wZSxcbiAgICAgIHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvbW9kYWwvZGVsZXRlRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcInNlbGVjdGVkRmlsZUh0bWxcIiwgXCJ3YXJuaW5nXCIsICgkc2NvcGUsIGRpYWxvZywgY2FsbGJhY2tzLCBzZWxlY3RlZEZpbGVIdG1sLCB3YXJuaW5nKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRmlsZUh0bWwgPSBzZWxlY3RlZEZpbGVIdG1sO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGVsZXRlQW5kQ2xvc2VEaWFsb2cgPSBjYWxsYmFja3M7XG5cbiAgICAgICAgJHNjb3BlLndhcm5pbmcgPSB3YXJuaW5nO1xuICAgICAgfV1cbiAgICB9KTtcbiAgfVxuXG5cblxuXG5cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuZGlyZWN0aXZlKCd3aWtpSHJlZkFkanVzdGVyJywgW1wiJGxvY2F0aW9uXCIsICgkbG9jYXRpb24pID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgIGxpbms6ICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cikgPT4ge1xuXG4gICAgICAgICRlbGVtZW50LmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIChldmVudCkgPT4ge1xuICAgICAgICAgIHZhciBheXMgPSAkZWxlbWVudC5maW5kKCdhJyk7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGF5cywgKGEpID0+IHtcbiAgICAgICAgICAgIGlmIChhLmhhc0F0dHJpYnV0ZSgnbm8tYWRqdXN0JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYSA9ICQoYSk7XG4gICAgICAgICAgICB2YXIgaHJlZiA9IChhLmF0dHIoJ2hyZWYnKSB8fCBcIlwiKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoaHJlZikge1xuICAgICAgICAgICAgICB2YXIgZmlsZUV4dGVuc2lvbiA9IGEuYXR0cignZmlsZS1leHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gV2lraS5hZGp1c3RIcmVmKCRzY29wZSwgJGxvY2F0aW9uLCBocmVmLCBmaWxlRXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYS5hdHRyKCdocmVmJywgbmV3VmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmFyIGltZ3MgPSAkZWxlbWVudC5maW5kKCdpbWcnKTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goaW1ncywgKGEpID0+IHtcbiAgICAgICAgICAgIGlmIChhLmhhc0F0dHJpYnV0ZSgnbm8tYWRqdXN0JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYSA9ICQoYSk7XG4gICAgICAgICAgICB2YXIgaHJlZiA9IChhLmF0dHIoJ3NyYycpIHx8IFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChocmVmKSB7XG4gICAgICAgICAgICAgIGlmIChocmVmLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XG4gICAgICAgICAgICAgICAgaHJlZiA9IENvcmUudXJsKGhyZWYpO1xuICAgICAgICAgICAgICAgIGEuYXR0cignc3JjJywgaHJlZik7XG5cbiAgICAgICAgICAgICAgICAvLyBsZXRzIGF2b2lkIHRoaXMgZWxlbWVudCBiZWluZyByZXByb2Nlc3NlZFxuICAgICAgICAgICAgICAgIGEuYXR0cignbm8tYWRqdXN0JywgJ3RydWUnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIF9tb2R1bGUuZGlyZWN0aXZlKCd3aWtpVGl0bGVMaW5rZXInLCBbXCIkbG9jYXRpb25cIiwgKCRsb2NhdGlvbikgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgbGluazogKCRzY29wZSwgJGVsZW1lbnQsICRhdHRyKSA9PiB7XG4gICAgICAgIHZhciBsb2FkZWQgPSBmYWxzZTtcblxuICAgICAgICBmdW5jdGlvbiBvZmZzZXRUb3AoZWxlbWVudHMpIHtcbiAgICAgICAgICBpZiAoZWxlbWVudHMpIHtcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSBlbGVtZW50cy5vZmZzZXQoKTtcbiAgICAgICAgICAgIGlmIChvZmZzZXQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mZnNldC50b3A7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2Nyb2xsVG9IYXNoKCkge1xuICAgICAgICAgIHZhciBhbnN3ZXIgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgaWQgPSAkbG9jYXRpb24uc2VhcmNoKClbXCJoYXNoXCJdO1xuICAgICAgICAgIHJldHVybiBzY3JvbGxUb0lkKGlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNjcm9sbFRvSWQoaWQpIHtcbiAgICAgICAgICB2YXIgYW5zd2VyID0gZmFsc2U7XG4gICAgICAgICAgdmFyIGlkID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiaGFzaFwiXTtcbiAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHZhciBzZWxlY3RvciA9ICdhW25hbWU9XCInICsgaWQgKyAnXCJdJztcbiAgICAgICAgICAgIHZhciB0YXJnZXRFbGVtZW50cyA9ICRlbGVtZW50LmZpbmQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKHRhcmdldEVsZW1lbnRzICYmIHRhcmdldEVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB2YXIgc2Nyb2xsRHVyYXRpb24gPSAxO1xuICAgICAgICAgICAgICB2YXIgZGVsdGEgPSBvZmZzZXRUb3AoJCgkZWxlbWVudCkpO1xuICAgICAgICAgICAgICB2YXIgdG9wID0gb2Zmc2V0VG9wKHRhcmdldEVsZW1lbnRzKSAtIGRlbHRhO1xuICAgICAgICAgICAgICBpZiAodG9wIDwgMCkge1xuICAgICAgICAgICAgICAgIHRvcCA9IDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy9sb2cuaW5mbyhcInNjcm9sbGluZyB0byBoYXNoOiBcIiArIGlkICsgXCIgdG9wOiBcIiArIHRvcCArIFwiIGRlbHRhOlwiICsgZGVsdGEpO1xuICAgICAgICAgICAgICAkKCdib2R5LGh0bWwnKS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY3JvbGxUb3A6IHRvcFxuICAgICAgICAgICAgICB9LCBzY3JvbGxEdXJhdGlvbik7XG4gICAgICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvL2xvZy5pbmZvKFwiY291bGQgZmluZCBlbGVtZW50IGZvcjogXCIgKyBzZWxlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGRMaW5rcyhldmVudCkge1xuICAgICAgICAgIHZhciBoZWFkaW5ncyA9ICRlbGVtZW50LmZpbmQoJ2gxLGgyLGgzLGg0LGg1LGg2LGg3Jyk7XG4gICAgICAgICAgdmFyIHVwZGF0ZWQgPSBmYWxzZTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goaGVhZGluZ3MsIChoZSkgPT4ge1xuICAgICAgICAgICAgdmFyIGgxID0gJChoZSk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB0cnkgZmluZCBhIGNoaWxkIGhlYWRlclxuICAgICAgICAgICAgdmFyIGEgPSBoMS5wYXJlbnQoXCJhXCIpO1xuICAgICAgICAgICAgaWYgKCFhIHx8ICFhLmxlbmd0aCkge1xuICAgICAgICAgICAgICB2YXIgdGV4dCA9IGgxLnRleHQoKTtcbiAgICAgICAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gdGV4dC5yZXBsYWNlKC8gL2csIFwiLVwiKTtcbiAgICAgICAgICAgICAgICB2YXIgcGF0aFdpdGhIYXNoID0gXCIjXCIgKyAkbG9jYXRpb24ucGF0aCgpICsgXCI/aGFzaD1cIiArIHRhcmdldDtcbiAgICAgICAgICAgICAgICB2YXIgbGluayA9IENvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIHBhdGhXaXRoSGFzaCwgWydoYXNoJ10pO1xuXG4gICAgICAgICAgICAgICAgLy8gbGV0cyB3cmFwIHRoZSBoZWFkaW5nIGluIGEgbGlua1xuICAgICAgICAgICAgICAgIHZhciBuZXdBID0gJCgnPGEgbmFtZT1cIicgKyB0YXJnZXQgKyAnXCIgaHJlZj1cIicgKyBsaW5rICsgJ1wiIG5nLWNsaWNrPVwib25MaW5rQ2xpY2soKVwiPjwvYT4nKTtcbiAgICAgICAgICAgICAgICBuZXdBLm9uKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxUb0lkKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbmV3QS5pbnNlcnRCZWZvcmUoaDEpO1xuICAgICAgICAgICAgICAgIGgxLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIG5ld0EuYXBwZW5kKGgxKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmICh1cGRhdGVkICYmICFsb2FkZWQpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICBpZiAoc2Nyb2xsVG9IYXNoKCkpIHtcbiAgICAgICAgICAgICAgICBsb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25FdmVudEluc2VydGVkKGV2ZW50KSB7XG4gICAgICAgICAgLy8gYXZvaWQgYW55IG1vcmUgZXZlbnRzIHdoaWxlIHdlIGRvIG91ciB0aGluZ1xuICAgICAgICAgICRlbGVtZW50LnVuYmluZCgnRE9NTm9kZUluc2VydGVkJywgb25FdmVudEluc2VydGVkKTtcbiAgICAgICAgICBhZGRMaW5rcyhldmVudCk7XG4gICAgICAgICAgJGVsZW1lbnQuYmluZCgnRE9NTm9kZUluc2VydGVkJywgb25FdmVudEluc2VydGVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRlbGVtZW50LmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIG9uRXZlbnRJbnNlcnRlZCk7XG4gICAgICB9XG4gICAgfTtcbiAgfV0pO1xuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIERldmVsb3Blci5jdXN0b21Qcm9qZWN0U3ViVGFiRmFjdG9yaWVzLnB1c2goXG4gICAgKGNvbnRleHQpID0+IHtcbiAgICAgIHZhciBwcm9qZWN0TGluayA9IGNvbnRleHQucHJvamVjdExpbms7XG4gICAgICB2YXIgd2lraUxpbmsgPSBudWxsO1xuICAgICAgaWYgKHByb2plY3RMaW5rKSB7XG4gICAgICAgIHdpa2lMaW5rID0gVXJsSGVscGVycy5qb2luKHByb2plY3RMaW5rLCBcIndpa2lcIiwgXCJ2aWV3XCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNWYWxpZDogKCkgPT4gd2lraUxpbmsgJiYgRGV2ZWxvcGVyLmZvcmdlUmVhZHlMaW5rKCksXG4gICAgICAgIGhyZWY6IHdpa2lMaW5rLFxuICAgICAgICBsYWJlbDogXCJTb3VyY2VcIixcbiAgICAgICAgdGl0bGU6IFwiQnJvd3NlIHRoZSBzb3VyY2UgY29kZSBvZiB0aGlzIHByb2plY3RcIlxuICAgICAgfTtcbiAgICB9KTtcblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTb3VyY2VCcmVhZGNydW1icygkc2NvcGUpIHtcbiAgICB2YXIgc291cmNlTGluayA9ICRzY29wZS4kdmlld0xpbmsgfHwgVXJsSGVscGVycy5qb2luKHN0YXJ0TGluaygkc2NvcGUpLCBcInZpZXdcIik7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtcbiAgICAgICAgbGFiZWw6IFwiU291cmNlXCIsXG4gICAgICAgIGhyZWY6IHNvdXJjZUxpbmssXG4gICAgICAgIHRpdGxlOiBcIkJyb3dzZSB0aGUgc291cmNlIGNvZGUgb2YgdGhpcyBwcm9qZWN0XCJcbiAgICAgIH1cbiAgICBdXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlRWRpdGluZ0JyZWFkY3J1bWIoJHNjb3BlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsYWJlbDogXCJFZGl0aW5nXCIsXG4gICAgICAgIHRpdGxlOiBcIkVkaXRpbmcgdGhpcyBmaWxlXCJcbiAgICAgIH07XG4gIH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLyoqXG4gICAqIEBjbGFzcyBHaXRXaWtpUmVwb3NpdG9yeVxuICAgKi9cbiAgZXhwb3J0IGNsYXNzIEdpdFdpa2lSZXBvc2l0b3J5IHtcbiAgICBwdWJsaWMgZGlyZWN0b3J5UHJlZml4ID0gXCJcIjtcbiAgICBwcml2YXRlICRodHRwO1xuICAgIHByaXZhdGUgY29uZmlnO1xuICAgIHByaXZhdGUgYmFzZVVybDtcblxuXG4gICAgY29uc3RydWN0b3IoJHNjb3BlKSB7XG4gICAgICB2YXIgRm9yZ2VBcGlVUkwgPSBLdWJlcm5ldGVzLmluamVjdChcIkZvcmdlQXBpVVJMXCIpO1xuICAgICAgdGhpcy4kaHR0cCA9IEt1YmVybmV0ZXMuaW5qZWN0KFwiJGh0dHBcIik7XG4gICAgICB0aGlzLmNvbmZpZyA9IEZvcmdlLmNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgIHZhciBvd25lciA9ICRzY29wZS5vd25lcjtcbiAgICAgIHZhciByZXBvTmFtZSA9ICRzY29wZS5yZXBvSWQ7XG4gICAgICB2YXIgcHJvamVjdElkID0gJHNjb3BlLnByb2plY3RJZDtcbiAgICAgIHZhciBucyA9ICRzY29wZS5uYW1lc3BhY2UgfHwgS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgdGhpcy5iYXNlVXJsID0gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcInJlcG9zL3Byb2plY3RcIiwgbnMsIHByb2plY3RJZCk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFBhZ2UoYnJhbmNoOnN0cmluZywgcGF0aDpzdHJpbmcsIG9iamVjdElkOnN0cmluZywgZm4pIHtcbiAgICAgIC8vIFRPRE8gaWdub3Jpbmcgb2JqZWN0SWRcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImNvbnRlbnRcIiwgcGF0aCB8fCBcIi9cIiksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgdmFyIGRldGFpbHM6IGFueSA9IG51bGw7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChkYXRhLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghZmlsZS5kaXJlY3RvcnkgJiYgZmlsZS50eXBlID09PSBcImRpclwiKSB7XG4gICAgICAgICAgICAgICAgICBmaWxlLmRpcmVjdG9yeSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgZGV0YWlscyA9IHtcbiAgICAgICAgICAgICAgICBkaXJlY3Rvcnk6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hpbGRyZW46IGRhdGFcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZGV0YWlscyA9IGRhdGE7XG4gICAgICAgICAgICAgIHZhciBjb250ZW50ID0gZGF0YS5jb250ZW50O1xuICAgICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgIGRldGFpbHMudGV4dCA9IGNvbnRlbnQuZGVjb2RlQmFzZTY0KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZuKGRldGFpbHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIHB1dFBhZ2UoYnJhbmNoOnN0cmluZywgcGF0aDpzdHJpbmcsIGNvbnRlbnRzOnN0cmluZywgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IGNvbnRlbnRzO1xuICAgICAgdGhpcy5kb1Bvc3QoVXJsSGVscGVycy5qb2luKFwiY29udGVudFwiLCBwYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIGhpc3Rvcnkgb2YgdGhlIHJlcG9zaXRvcnkgb3IgYSBzcGVjaWZpYyBkaXJlY3Rvcnkgb3IgZmlsZSBwYXRoXG4gICAgICogQG1ldGhvZCBoaXN0b3J5XG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBicmFuY2hcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBsaW1pdFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBoaXN0b3J5KGJyYW5jaDpzdHJpbmcsIG9iamVjdElkOnN0cmluZywgcGF0aDpzdHJpbmcsIGxpbWl0Om51bWJlciwgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAobGltaXQpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcImxpbWl0PVwiICsgbGltaXQ7XG4gICAgICB9XG4gICAgICB2YXIgY29tbWl0SWQgPSBvYmplY3RJZCB8fCBicmFuY2g7XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImhpc3RvcnlcIiwgY29tbWl0SWQsIHBhdGgpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBjb21taXRJbmZvKGNvbW1pdElkOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImNvbW1pdEluZm9cIiwgY29tbWl0SWQpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBjb21taXRUcmVlKGNvbW1pdElkOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImNvbW1pdFRyZWVcIiwgY29tbWl0SWQpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgYSBkaWZmIG9uIHRoZSB2ZXJzaW9uc1xuICAgICAqIEBtZXRob2QgZGlmZlxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYmFzZU9iamVjdElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgZGlmZihvYmplY3RJZDpzdHJpbmcsIGJhc2VPYmplY3RJZDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHZhciBjb25maWc6IGFueSA9IEZvcmdlLmNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgIGNvbmZpZy50cmFuc2Zvcm1SZXNwb25zZSA9IChkYXRhLCBoZWFkZXJzR2V0dGVyLCBzdGF0dXMpID0+IHtcbiAgICAgICAgbG9nLmluZm8oXCJnb3QgZGlmZiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgIH07XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImRpZmZcIiwgb2JqZWN0SWQsIGJhc2VPYmplY3RJZCwgcGF0aCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICB2YXIgZGV0YWlscyA9IHtcbiAgICAgICAgICAgIHRleHQ6IGRhdGEsXG4gICAgICAgICAgICBmb3JtYXQ6IFwiZGlmZlwiLFxuICAgICAgICAgICAgZGlyZWN0b3J5OiBmYWxzZVxuICAgICAgICAgIH07XG4gICAgICAgICAgZm4oZGV0YWlscyk7XG4gICAgICAgIH0sXG4gICAgICAgIG51bGwsIGNvbmZpZyk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGxpc3Qgb2YgYnJhbmNoZXNcbiAgICAgKiBAbWV0aG9kIGJyYW5jaGVzXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBicmFuY2hlcyhmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHRoaXMuZG9HZXQoXCJsaXN0QnJhbmNoZXNcIiwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZXhpc3RzKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBmbik6IEJvb2xlYW4ge1xuICAgICAgdmFyIGFuc3dlciA9IGZhbHNlO1xuICAgICAgdGhpcy5nZXRQYWdlKGJyYW5jaCwgcGF0aCwgbnVsbCwgKGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGRhdGEuZGlyZWN0b3J5KSB7XG4gICAgICAgICAgaWYgKGRhdGEuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICBhbnN3ZXIgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhbnN3ZXIgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGxvZy5pbmZvKFwiZXhpc3RzIFwiICsgcGF0aCArIFwiIGFuc3dlciA9IFwiICsgYW5zd2VyKTtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNGdW5jdGlvbihmbikpIHtcbiAgICAgICAgICBmbihhbnN3ZXIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgfVxuXG4gICAgcHVibGljIHJldmVydFRvKGJyYW5jaDpzdHJpbmcsIG9iamVjdElkOnN0cmluZywgYmxvYlBhdGg6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZXZlcnRpbmcgXCIgKyBibG9iUGF0aCArIFwiIGNvbW1pdCBcIiArIChvYmplY3RJZCB8fCBicmFuY2gpO1xuICAgICAgfVxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgdmFyIGJvZHkgPSBcIlwiO1xuICAgICAgdGhpcy5kb1Bvc3QoVXJsSGVscGVycy5qb2luKFwicmV2ZXJ0XCIsIG9iamVjdElkLCBibG9iUGF0aCB8fCBcIi9cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIHJlbmFtZShicmFuY2g6c3RyaW5nLCBvbGRQYXRoOnN0cmluZywgIG5ld1BhdGg6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW5hbWluZyBwYWdlIFwiICsgb2xkUGF0aCArIFwiIHRvIFwiICsgbmV3UGF0aDtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIGlmIChvbGRQYXRoKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJvbGQ9XCIgKyBlbmNvZGVVUklDb21wb25lbnQob2xkUGF0aCk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IFwiXCI7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJtdlwiLCBuZXdQYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVtb3ZlUGFnZShicmFuY2g6c3RyaW5nLCBwYXRoOnN0cmluZywgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICBpZiAoIWNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgY29tbWl0TWVzc2FnZSA9IFwiUmVtb3ZpbmcgcGFnZSBcIiArIHBhdGg7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IFwiXCI7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJybVwiLCBwYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVtb3ZlUGFnZXMoYnJhbmNoOnN0cmluZywgcGF0aHM6QXJyYXk8c3RyaW5nPiwgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICBpZiAoIWNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgY29tbWl0TWVzc2FnZSA9IFwiUmVtb3ZpbmcgcGFnZVwiICsgKHBhdGhzLmxlbmd0aCA+IDEgPyBcInNcIiA6IFwiXCIpICsgXCIgXCIgKyBwYXRocy5qb2luKFwiLCBcIik7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IHBhdGhzO1xuICAgICAgdGhpcy5kb1Bvc3QoVXJsSGVscGVycy5qb2luKFwicm1cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cblxuICAgIHByaXZhdGUgZG9HZXQocGF0aCwgcXVlcnksIHN1Y2Nlc3NGbiwgZXJyb3JGbiA9IG51bGwsIGNvbmZpZyA9IG51bGwpIHtcbiAgICAgIHZhciB1cmwgPSBGb3JnZS5jcmVhdGVIdHRwVXJsKFVybEhlbHBlcnMuam9pbih0aGlzLmJhc2VVcmwsIHBhdGgpKTtcbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB1cmwgKz0gXCImXCIgKyBxdWVyeTtcbiAgICAgIH1cbiAgICAgIGlmICghZXJyb3JGbikge1xuICAgICAgICBlcnJvckZuID0gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCEgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgIH1cbiAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IHRoaXMuY29uZmlnO1xuICAgICAgfVxuICAgICAgdGhpcy4kaHR0cC5nZXQodXJsLCBjb25maWcpLlxuICAgICAgICBzdWNjZXNzKHN1Y2Nlc3NGbikuXG4gICAgICAgIGVycm9yKGVycm9yRm4pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZG9Qb3N0KHBhdGgsIHF1ZXJ5LCBib2R5LCBzdWNjZXNzRm4sIGVycm9yRm4gPSBudWxsKSB7XG4gICAgICB2YXIgdXJsID0gRm9yZ2UuY3JlYXRlSHR0cFVybChVcmxIZWxwZXJzLmpvaW4odGhpcy5iYXNlVXJsLCBwYXRoKSk7XG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdXJsICs9IFwiJlwiICsgcXVlcnk7XG4gICAgICB9XG4gICAgICBpZiAoIWVycm9yRm4pIHtcbiAgICAgICAgZXJyb3JGbiA9IChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQhIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICB9O1xuXG4gICAgICB9XG4gICAgICB0aGlzLiRodHRwLnBvc3QodXJsLCBib2R5LCB0aGlzLmNvbmZpZykuXG4gICAgICAgIHN1Y2Nlc3Moc3VjY2Vzc0ZuKS5cbiAgICAgICAgZXJyb3IoZXJyb3JGbik7XG4gICAgfVxuXG5cbiAgICBwcml2YXRlIGRvUG9zdEZvcm0ocGF0aCwgcXVlcnksIGJvZHksIHN1Y2Nlc3NGbiwgZXJyb3JGbiA9IG51bGwpIHtcbiAgICAgIHZhciB1cmwgPSBGb3JnZS5jcmVhdGVIdHRwVXJsKFVybEhlbHBlcnMuam9pbih0aGlzLmJhc2VVcmwsIHBhdGgpKTtcbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB1cmwgKz0gXCImXCIgKyBxdWVyeTtcbiAgICAgIH1cbiAgICAgIGlmICghZXJyb3JGbikge1xuICAgICAgICBlcnJvckZuID0gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCEgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgIH1cbiAgICAgIHZhciBjb25maWcgPSBGb3JnZS5jcmVhdGVIdHRwQ29uZmlnKCk7XG4gICAgICBpZiAoIWNvbmZpZy5oZWFkZXJzKSB7XG4gICAgICAgIGNvbmZpZy5oZWFkZXJzID0ge307XG4gICAgICB9XG4gICAgICBjb25maWcuaGVhZGVyc1tcIkNvbnRlbnQtVHlwZVwiXSA9IFwiYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PXV0Zi04XCI7XG5cbiAgICAgIHRoaXMuJGh0dHAucG9zdCh1cmwsIGJvZHksIGNvbmZpZykuXG4gICAgICAgIHN1Y2Nlc3Moc3VjY2Vzc0ZuKS5cbiAgICAgICAgZXJyb3IoZXJyb3JGbik7XG4gICAgfVxuXG5cblxuICAgIHB1YmxpYyBjb21wbGV0ZVBhdGgoYnJhbmNoOnN0cmluZywgY29tcGxldGlvblRleHQ6c3RyaW5nLCBkaXJlY3Rvcmllc09ubHk6Ym9vbGVhbiwgZm4pIHtcbi8qXG4gICAgICByZXR1cm4gdGhpcy5naXQoKS5jb21wbGV0ZVBhdGgoYnJhbmNoLCBjb21wbGV0aW9uVGV4dCwgZGlyZWN0b3JpZXNPbmx5LCBmbik7XG4qL1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZnVsbCBwYXRoIHRvIHVzZSBpbiB0aGUgZ2l0IHJlcG9cbiAgICAgKiBAbWV0aG9kIGdldFBhdGhcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd7XG4gICAgICovXG4gICAgcHVibGljIGdldFBhdGgocGF0aDpzdHJpbmcpIHtcbiAgICAgIHZhciBkaXJlY3RvcnlQcmVmaXggPSB0aGlzLmRpcmVjdG9yeVByZWZpeDtcbiAgICAgIHJldHVybiAoZGlyZWN0b3J5UHJlZml4KSA/IGRpcmVjdG9yeVByZWZpeCArIHBhdGggOiBwYXRoO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRMb2dQYXRoKHBhdGg6c3RyaW5nKSB7XG4gICAgICByZXR1cm4gQ29yZS50cmltTGVhZGluZyh0aGlzLmdldFBhdGgocGF0aCksIFwiL1wiKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgY29udGVudHMgb2YgYSBibG9iUGF0aCBmb3IgYSBnaXZlbiBjb21taXQgb2JqZWN0SWRcbiAgICAgKiBAbWV0aG9kIGdldENvbnRlbnRcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGJsb2JQYXRoXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGdldENvbnRlbnQob2JqZWN0SWQ6c3RyaW5nLCBibG9iUGF0aDpzdHJpbmcsIGZuKSB7XG4vKlxuICAgICAgdmFyIGZ1bGxQYXRoID0gdGhpcy5nZXRMb2dQYXRoKGJsb2JQYXRoKTtcbiAgICAgIHZhciBnaXQgPSB0aGlzLmdpdCgpO1xuICAgICAgaWYgKGdpdCkge1xuICAgICAgICBnaXQuZ2V0Q29udGVudChvYmplY3RJZCwgZnVsbFBhdGgsIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBnaXQ7XG4qL1xuICAgIH1cblxuXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIEpTT04gY29udGVudHMgb2YgdGhlIHBhdGggd2l0aCBvcHRpb25hbCBuYW1lIHdpbGRjYXJkIGFuZCBzZWFyY2hcbiAgICAgKiBAbWV0aG9kIGpzb25DaGlsZENvbnRlbnRzXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVXaWxkY2FyZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzZWFyY2hcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMganNvbkNoaWxkQ29udGVudHMocGF0aDpzdHJpbmcsIG5hbWVXaWxkY2FyZDpzdHJpbmcsIHNlYXJjaDpzdHJpbmcsIGZuKSB7XG4vKlxuICAgICAgdmFyIGZ1bGxQYXRoID0gdGhpcy5nZXRMb2dQYXRoKHBhdGgpO1xuICAgICAgdmFyIGdpdCA9IHRoaXMuZ2l0KCk7XG4gICAgICBpZiAoZ2l0KSB7XG4gICAgICAgIGdpdC5yZWFkSnNvbkNoaWxkQ29udGVudChmdWxsUGF0aCwgbmFtZVdpbGRjYXJkLCBzZWFyY2gsIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBnaXQ7XG4qL1xuICAgIH1cblxuXG4gICAgcHVibGljIGdpdCgpIHtcbi8qXG4gICAgICB2YXIgcmVwb3NpdG9yeSA9IHRoaXMuZmFjdG9yeU1ldGhvZCgpO1xuICAgICAgaWYgKCFyZXBvc2l0b3J5KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTm8gcmVwb3NpdG9yeSB5ZXQhIFRPRE8gd2Ugc2hvdWxkIHVzZSBhIGxvY2FsIGltcGwhXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlcG9zaXRvcnk7XG4qL1xuICAgIH1cbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgdmFyIFRvcExldmVsQ29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuVG9wTGV2ZWxDb250cm9sbGVyXCIsIFsnJHNjb3BlJywgJyRyb3V0ZScsICckcm91dGVQYXJhbXMnLCAoJHNjb3BlLCAkcm91dGUsICRyb3V0ZVBhcmFtcykgPT4ge1xuXG4gIH1dKTtcblxufVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
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
$templateCache.put("plugins/wiki/html/commit.html","<div ng-controller=\"Wiki.CommitController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\">\n      <a ng-href=\"{{row.entity.fileLink}}\" class=\"file-name text-nowrap\" title=\"{{row.entity.title}}\">\n        <span ng-class=\"row.entity.changeClass\"></span>\n        <span class=\"file-icon\" ng-class=\"row.entity.fileClass\" ng-bind-html=\"row.entity.fileIconHtml\"></span>\n        {{row.entity.path}}\n      </a>\n    </div>\n  </script>\n\n  <div ng-hide=\"inDashboard\" class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div ng-hide=\"inDashboard\" class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n          <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n             title=\"The branch to view\">\n            {{branch || \'branch\'}}\n            <span class=\"caret\"></span>\n          </a>\n          <ul class=\"dropdown-menu\">\n            <li ng-repeat=\"otherBranch in branches\">\n              <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n                 ng-hide=\"otherBranch === branch\"\n                 title=\"Switch to the {{otherBranch}} branch\"\n                 data-placement=\"bottom\">\n                {{otherBranch}}</a>\n            </li>\n          </ul>\n        </li>\n        <li ng-repeat=\"link in breadcrumbs\">\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n        <li>\n          <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n        </li>\n        <li title=\"{{commitInfo.shortMessage}}\" class=\"active\">\n          <a class=\"commit-id\">{{commitInfo.commitHashText}}</a>\n        </li>\n        <li class=\"pull-right\">\n        <span class=\"commit-author\">\n          <i class=\"fa fa-user\"></i> {{commitInfo.author}}\n        </span>\n        </li>\n        <li class=\"pull-right\">\n          <span class=\"commit-date\">{{commitInfo.date | date: dateFormat}}</span>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed row\">\n    <div class=\"commit-message\" title=\"{{commitInfo.shortMessage}}\">\n      {{commitInfo.trimmedMessage}}\n    </div>\n  </div>\n\n  <div class=\"row filter-header\">\n    <div class=\"col-md-12\">\n      <hawtio-filter ng-model=\"gridOptions.filterOptions.filterText\"\n                     css-class=\"input-xxlarge\"\n                     placeholder=\"Filter...\"></hawtio-filter>\n\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-click=\"diff()\"\n         title=\"Compare the selected versions of the files to see how they differ\">\n        <i class=\"fa fa-exchange\"></i>\n        Compare\n      </a>\n    </div>\n  </div>\n\n  <div class=\"form-horizontal\">\n    <div class=\"row\">\n      <table class=\"table-condensed table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n    </div>\n  </div>\n\n</div>\n");
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
$templateCache.put("plugins/wiki/html/projectCommitsPanel.html","<div ng-controller=\"Wiki.HistoryController\">\n  <div ng-show=\"logs.length\">\n    <div class=\"row\">\n      <h4 class=\"project-overview-title\"><a ng-href=\"{{$projectLink}}/wiki/history//\">Commits</a></h4>\n    </div>\n\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <table class=\"table-condensed table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/sourceEdit.html","<textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"entity.source\"></textarea>\n");
$templateCache.put("plugins/wiki/html/sourceView.html","<textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"source\"></textarea>\n");
$templateCache.put("plugins/wiki/html/viewBook.html","<div ng-controller=\"Wiki.ViewController\">\n\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.length}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              ng-bind-html-unsafe=\"fileIconHtml(row)\">\n\n              </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"fa fa-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n\n  </script>\n\n  <ng-include src=\"\'plugins/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"row\">\n      <div class=\"tocify\" wiki-href-adjuster>\n        <!-- TODO we maybe want a more flexible way to find the links to include than the current link-filter -->\n        <div hawtio-toc-display get-contents=\"getContents(filename, cb)\"\n             html=\"html\" link-filter=\"[file-extension]\">\n        </div>\n      </div>\n      <div class=\"toc-content\" id=\"toc-content\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/viewNavBar.html","<div class=\"row\">\n  <div hawtio-breadcrumbs></div>\n</div>\n\n<!--\n<div class=\"row\">\n  <div hawtio-tabs></div>\n</div>\n-->\n<div ng-hide=\"inDashboard\" class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\">\n        <div hawtio-drop-down=\"branchMenuConfig\"></div>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n        <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n          <span class=\"contained c-medium\">{{link.name}}</span>\n        </a>\n      </li>\n      <li ng-show=\"objectId\">\n        <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n      </li>\n      <li ng-show=\"objectId\" class=\"active\">\n        <a>{{objectId}}</a>\n      </li>\n\n      <li class=\"pull-right dropdown\">\n        <a href=\"\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">\n          <i class=\"fa fa-ellipsis-v\"></i>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-show=\"sourceLink()\">\n            <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-file-o\"></i> Source</a>\n          </li>\n          <li>\n            <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-comments-alt\"></i> History</a>\n          </li>\n          <!--\n          <li class=\"divider\">\n          </li>\n          -->\n          <li ng-hide=\"gridOptions.selectedItems.length !== 1\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n            <a ng-click=\"openRenameDialog()\"\n               title=\"Rename the selected document\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-adjust\"></i> Rename</a>\n          </li>\n          <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n            <a ng-click=\"openMoveDialog()\"\n               title=\"move the selected documents to a new folder\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-move\"></i> Move</a>\n          </li>\n          <!--\n          <li class=\"divider\">\n          </li>\n          -->\n          <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"remove\">\n            <a ng-click=\"openDeleteDialog()\"\n               title=\"Delete the selected document(s)\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-remove\"></i> Delete</a>\n          </li>\n          <li class=\"divider\" ng-show=\"childActions.length\">\n          </li>\n          <li ng-repeat=\"childAction in childActions\">\n            <a ng-click=\"childAction.doAction()\"\n               title=\"{{childAction.title}}\"\n               data-placement=\"bottom\">\n              <i class=\"{{childAction.icon}}\"></i> {{childAction.name}}</a>\n          </li>\n        </ul>\n      </li>\n      <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n        <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-edit\"></i> Edit</a>\n      </li>\n      <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n        <a ng-href=\"{{createLink()}}{{hash}}\"\n           title=\"Create new page\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-plus\"></i> Create</a>\n      </li>\n      <li class=\"pull-right\">\n        <div class=\"btn-group\" \n             ng-hide=\"!children || profile\">\n          <a class=\"btn btn-sm\"\n             ng-disabled=\"mode == ViewMode.List\"\n             href=\"\" \n             ng-click=\"setViewMode(ViewMode.List)\">\n            <i class=\"fa fa-list\"></i></a>\n          <a class=\"btn btn-sm\" \n             ng-disabled=\"mode == ViewMode.Icon\"\n             href=\"\" \n             ng-click=\"setViewMode(ViewMode.Icon)\">\n            <i class=\"fa fa-th-large\"></i></a>\n        </div>\n      </li>\n<!--\n      <li class=\"pull-right\">\n        <a href=\"\" ng-hide=\"children || profile\" title=\"Add to dashboard\" ng-href=\"{{createDashboardLink()}}\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-share\"></i>\n        </a>\n      </li>\n-->\n    </ul>\n  </div>\n</div>\n\n\n");
$templateCache.put("plugins/wiki/html/viewPage.html","<div ng-controller=\"Wiki.ViewController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.size}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\" hawtio-file-drop=\"{{row.entity.fileName}}\" download-url=\"{{row.entity.downloadURL}}\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              compile=\"fileIconHtml(row)\">\n        </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"fa fa-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"imageTemplate.html\">\n    <img src=\"{{imageURL}}\">\n  </script>\n\n  <ng-include src=\"\'plugins/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <!-- Icon View -->\n  <div ng-show=\"mode == ViewMode.Icon\" class=\"wiki-fixed\">\n    <div ng-hide=\"!showAppHeader\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div kubernetes-json=\"kubernetesJson\"></div>\n        </div>\n      </div>\n    </div>\n    <div class=\"row\" ng-show=\"html && children\">\n      <div class=\"col-md-12 wiki-icon-view-header\">\n        <h5>Directories and Files</h5>\n      </div>\n    </div>\n    <div class=\"row\" ng-hide=\"!directory\">\n      <div class=\"col-md-12\" ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-icon-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"column-box mouse-pointer well\"\n               ng-repeat=\"child in children track by $index\"\n               ng-class=\"isInGroup(gridOptions.selectedItems, child, \'selected\', \'\')\"\n               ng-click=\"toggleSelectionFromGroup(gridOptions.selectedItems, child)\">\n            <div class=\"row\">\n              <div class=\"col-md-2\" hawtio-file-drop=\"{{child.fileName}}\" download-url=\"{{child.downloadURL}}\">\n                  <span class=\"app-logo\" ng-class=\"fileClass(child)\" compile=\"fileIconHtml(child)\"></span>\n              </div>\n              <div class=\"col-md-10\">\n                <h3>\n                  <a href=\"{{childLink(child)}}\">{{child.displayName || child.name}}</a>\n                </h3>\n              </div>\n            </div>\n            <div class=\"row\" ng-show=\"child.summary\">\n              <div class=\"col-md-12\">\n                <p compile=\"marked(child.summary)\"></p>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n      <div class=\"row\" style=\"margin-left: 10px\">\n        <div class=\"col-md-12\">\n          <div compile=\"html\"></div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end Icon view -->\n\n  <!-- start List view -->\n  <div ng-show=\"mode == ViewMode.List\" class=\"wiki-fixed\">\n    <hawtio-pane position=\"left\" width=\"300\">\n      <div ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-list-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"wiki-grid\" hawtio-list=\"gridOptions\"></div>\n        </div>\n      </div>\n    </hawtio-pane>\n    <div class=\"row\">\n      <div ng-class=\"col-md-12\">\n        <div ng-hide=\"!showProfileHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div fabric-profile-details version-id=\"versionId\" profile-id=\"profileId\"></div>\n              <p></p>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!showAppHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div kubernetes-json=\"kubernetesJson\" children=\"children\"></div>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n          <div class=\"row\" style=\"margin-left: 10px\">\n            <div class=\"col-md-12\">\n              <div compile=\"html\"></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end List view -->\n  <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/deleteDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"deleteAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Delete Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <p>You are about to delete\n          <ng-pluralize count=\"gridOptions.selectedItems.length\"\n                        when=\"{\'1\': \'this document!\', \'other\': \'these {} documents!\'}\">\n          </ng-pluralize>\n        </p>\n\n        <div ng-bind-html-unsafe=\"selectedFileHtml\"></div>\n        <p class=\"alert alert-danger\" ng-show=\"warning\" ng-bind-html-unsafe=\"warning\">\n        </p>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             value=\"Delete\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/moveDialog.html","<div>\n    <form class=\"form-horizontal\" ng-submit=\"moveAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Move Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"moveFolder\">Folder</label>\n\n        <div class=\"controls\">\n          <input type=\"text\" id=\"moveFolder\" ng-model=\"move.moveFolder\"\n                 typeahead=\"title for title in folderNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!move.moveFolder\"\n             value=\"Move\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>");
$templateCache.put("plugins/wiki/html/modal/renameDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"renameAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Rename Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"row\">\n        <div class=\"form-group\">\n          <label class=\"col-sm-2 control-label\" for=\"renameFileName\">Name</label>\n\n          <div class=\"col-sm-10\">\n            <input type=\"text\" id=\"renameFileName\" ng-model=\"rename.newFileName\">\n          </div>\n        </div>\n\n        <div class=\"form-group\">\n          <div ng-show=\"fileExists.exists\" class=\"alert\">\n            Please choose a different name as <b>{{fileExists.name}}</b> already exists\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!fileName || fileExists.exists\"\n             value=\"Rename\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");}]); hawtioPluginLoader.addModule("fabric8-console-templates");