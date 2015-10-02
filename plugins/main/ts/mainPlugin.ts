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

module Main {

  export var _module = angular.module(pluginName, []);

  var tab = undefined;

  _module.run(["$rootScope", "HawtioNav", "KubernetesModel", "ServiceRegistry", ($rootScope, nav: HawtioMainNav.Registry, KubernetesModel, ServiceRegistry) => {

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
      oldHref: () => { /* nothing to do */ },
      href: () => {
        var hash = {
          backTo: new URI().toString(),
          token: HawtioOAuth.getOAuthToken()
        };
        var uri = new URI(ServiceRegistry.serviceLink('apiman'));
        // TODO have to overwrite the port here for some reason
        (<any>uri.port('80').query({}).path('apimanui/index.html')).hash(URI.encode(angular.toJson(hash)));
        return uri.toString();
      }    
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
