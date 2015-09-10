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
/// <reference path="mainGlobals.ts"/>

// TODO not sure if these are required? They are defined in hawtio-kubernetes too...
/*
declare var OSOAuthConfig: Kubernetes.OpenShiftOAuthConfig;
declare var GoogleOAuthConfig: Kubernetes.GoogleOAuthConfig;
declare var KeycloakConfig: Kubernetes.KeyCloakAuthConfig;
*/

module Main {

  export var _module = angular.module(pluginName, []);

  var tab = undefined;

  _module.config(["$locationProvider", "$routeProvider", "HawtioNavBuilderProvider",
    ($locationProvider, $routeProvider: ng.route.IRouteProvider, builder: HawtioMainNav.BuilderFactory) => {
/*
    tab = builder.create()
      .id(pluginName)
      .title(() => "Example")
      .href(() => "/example")
      .subPath("Page 1", "page1", builder.join(templatePath, "page1.html"))
      .build();
    builder.configureRouting($routeProvider, tab);
    $locationProvider.html5Mode(true);
*/
  }]);

  _module.run(["$rootScope", "HawtioNav", "KubernetesModel", "ServiceRegistry", "Logger", "Configuration", ($rootScope, nav: HawtioMainNav.Registry, KubernetesModel, ServiceRegistry, Logger, Configuration) => {
    
    if (Configuration.platform === 'fabric8') {
       var apiEndpointConfig = Configuration.api.endpoint.toLowerCase();
       var dynamicEndpoint;

       // Gets called back so we can update the endpoint settings when the namespace changes
       $rootScope.$on('kubernetesModelUpdated', function () {
         //if the endpoint config starts with 'dynamic' then try to lookup the apiman
         //backend in the current namespace. By default you'd want to use the dynamicRoute since
         //that is the only publicly available endpoint, but there maybe usecases where you'd want
         //to use the ServiceUrl (Kubernetes Service IP address), or the Kubernetes Proxy.
         //dynamicRoute, dynamicServiceUrl, dynamicProxyUrl
         if (apiEndpointConfig.indexOf("dynamic") === 0) {
            var namespace = KubernetesModel.currentNamespace();
            var hasService = ServiceRegistry.hasService("apiman");
            if (hasService === true && namespace !== null) {
               var service = KubernetesModel.getService(namespace, "apiman");
               Logger.debug("apiman route: " + service.$connectUrl);
               Logger.debug("apiman proxyUrl: " + service.proxyUrl);
               Logger.debug("apiman serviceUrl: " + service.$serviceUrl);
               if (apiEndpointConfig === "dynamicServiceUrl") {
                    dynamicEndpoint = service.$serviceUrl + "apiman";
               } else if (apiEndpointConfig === "dynamicProxyUrl") {
                    dynamicEndpoint = service.proxyUrl + "apiman";
               } else {
                    dynamicEndpoint = service.$connectUrl + "apiman";
               }
               if (Configuration.api.endpoint !== dynamicEndpoint) {
                    Configuration.api.endpoint = dynamicEndpoint;
                    Logger.debug("apiman route: {0}", service.$connectUrl);
                    Logger.debug("apiman proxyUrl: {0} ", service.proxyUrl);
                    Logger.debug("apiman serviceUrl: {0}", service.$serviceUrl);
                    Logger.info("Apiman Dynamic Endpoint: {0}", dynamicEndpoint);
               }
            } else {
               Configuration.api.endpoint = "no-apiman-running-in-" + namespace + "-namespace";
               // Logger.debug("No apiman running in {0} namespace", namespace);
            }
         }
       });
    }

    nav.on(HawtioMainNav.Actions.CHANGED, pluginName, (items) => {
      items.forEach((item) => {
        switch(item.id) {
          case 'forge':
          case 'jvm':
          case 'wiki':
          case 'docker-registry':
            item.isValid = () => false;
        }
      });
    });
    nav.add({
      id: 'library',
      title: () => 'Library',
      tooltip: () => 'View the library of applications',
      isValid: () => ServiceRegistry.hasService(appLibraryServiceName) && ServiceRegistry.hasService("app-library-jolokia") && !Core.isRemoteConnection(),
      href: () => "/wiki/view",
      isActive: () => false
    });

    var kibanaServiceName = Kubernetes.kibanaServiceName;

    nav.add({
      id: 'kibana',
      title: () =>  'Logs',
      tooltip: () => 'View and search all logs across all containers using Kibana and ElasticSearch',
      isValid: () => ServiceRegistry.hasService(kibanaServiceName) && !Core.isRemoteConnection(),
      href: () => Kubernetes.kibanaLogsLink(ServiceRegistry),
      isActive: () => false
    });

    nav.add({
      id: 'apiman',
      title: () => 'API Management',
      tooltip: () => 'Add Policies and Plans to your APIs with Apiman',
      isValid: () => ServiceRegistry.hasService('apiman') && !Core.isRemoteConnection(),
      href: () => "/api-manager"
    });

    nav.add({
      id: 'grafana',
      title: () =>  'Metrics',
      tooltip: () => 'Views metrics across all containers using Grafana and InfluxDB',
      isValid: () => ServiceRegistry.hasService(grafanaServiceName) && !Core.isRemoteConnection(),
      href: () => ServiceRegistry.serviceLink(grafanaServiceName),
      isActive: () => false
    });

    nav.add({
      id: "chat",
      title: () =>  'Chat',
      tooltip: () => 'Chat room for discussing this namespace',
      isValid: () => ServiceRegistry.hasService(chatServiceName) && !Core.isRemoteConnection(),
      href: () => {
        var answer = ServiceRegistry.serviceLink(chatServiceName);
        if (answer) {
/*
          TODO add a custom link to the correct room for the current namespace?

          var ircHost = "";
          var ircService = ServiceRegistry.findService("hubot");
          if (ircService) {
            ircHost = ircService.portalIP;
          }
          if (ircHost) {
            var nick = localStorage["gogsUser"] || localStorage["ircNick"] || "myname";
            var room = "#fabric8-" +  currentKubernetesNamespace();
            answer = UrlHelpers.join(answer, "/kiwi", ircHost, "?&nick=" + nick + room);
          }
*/
        }
        return answer;
      },
      isActive: () => false
    });

    // TODO we should move this to a nicer link inside the Library soon - also lets hide until it works...
/*
    workspace.topLevelTabs.push({
      id: 'createProject',
      title: () =>  'Create',
      tooltip: () => 'Creates a new project',
      isValid: () => ServiceRegistry.hasService("app-library") && false,
      href: () => "/project/create"
    });
*/

    log.debug("loaded");
  }]);

  hawtioPluginLoader.addModule(pluginName);
}
