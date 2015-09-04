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


var Main;
(function (Main) {
    Main.pluginName = "fabric8-console";
    Main.log = Logger.get(Main.pluginName);
    Main.templatePath = "plugins/main/html";
    Main.chatServiceName = "letschat";
    Main.grafanaServiceName = "grafana";
    Main.appLibraryServiceName = "app-library";
})(Main || (Main = {}));

var Main;
(function (Main) {
    Main._module = angular.module(Main.pluginName, []);
    var tab = undefined;
    Main._module.config(["$locationProvider", "$routeProvider", "HawtioNavBuilderProvider", function ($locationProvider, $routeProvider, builder) {
    }]);
    Main._module.run(["$rootScope", "HawtioNav", "KubernetesModel", "ServiceRegistry", "Logger", "Configuration", function ($rootScope, nav, KubernetesModel, ServiceRegistry, Logger, Configuration) {
        if (Configuration.platform === 'fabric8') {
            var apiEndpointConfig = Configuration.api.endpoint.toLowerCase();
            var dynamicEndpoint;
            $rootScope.$on('kubernetesModelUpdated', function () {
                if (apiEndpointConfig.indexOf("dynamic") === 0) {
                    var namespace = KubernetesModel.currentNamespace();
                    var hasService = ServiceRegistry.hasService("apiman");
                    if (hasService === true && namespace !== null) {
                        var service = KubernetesModel.getService(namespace, "apiman");
                        Logger.debug("apiman route: " + service.$connectUrl);
                        Logger.debug("apiman proxyUrl: " + service.proxyUrl);
                        Logger.debug("apiman serviceUrl: " + service.$serviceUrl);
                        if (apiEndpointConfig === "dynamicServiceUrl") {
                            dynamicEndpoint = service.$serviceUrl;
                        }
                        else if (apiEndpointConfig === "dynamicProxyUrl") {
                            dynamicEndpoint = service.proxyUrl;
                        }
                        else {
                            dynamicEndpoint = service.$connectUrl + "apiman";
                        }
                        Configuration.api.endpoint = dynamicEndpoint;
                        Logger.info("Apiman Dynamic Endpoint: {0}", dynamicEndpoint);
                    }
                    else {
                        Configuration.api.endpoint = "no-apiman-running-in-" + namespace + "-namespace";
                        Logger.debug("No apiman running in {0} namespace", namespace);
                    }
                }
            });
        }
        nav.on(HawtioMainNav.Actions.CHANGED, Main.pluginName, function (items) {
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
        nav.add({
            id: 'library',
            title: function () { return 'Library'; },
            tooltip: function () { return 'View the library of applications'; },
            isValid: function () { return ServiceRegistry.hasService(Main.appLibraryServiceName) && ServiceRegistry.hasService("app-library-jolokia") && !Core.isRemoteConnection(); },
            href: function () { return "/wiki/view"; },
            isActive: function () { return false; }
        });
        var kibanaServiceName = Kubernetes.kibanaServiceName;
        nav.add({
            id: 'kibana',
            title: function () { return 'Logs'; },
            tooltip: function () { return 'View and search all logs across all containers using Kibana and ElasticSearch'; },
            isValid: function () { return ServiceRegistry.hasService(kibanaServiceName) && !Core.isRemoteConnection(); },
            href: function () { return Kubernetes.kibanaLogsLink(ServiceRegistry); },
            isActive: function () { return false; }
        });
        nav.add({
            id: 'apiman',
            title: function () { return 'API Management'; },
            tooltip: function () { return 'Add Policies and Plans to your APIs with Apiman'; },
            isValid: function () { return ServiceRegistry.hasService('apiman') && !Core.isRemoteConnection(); },
            href: function () { return "/api-manager"; }
        });
        nav.add({
            id: 'grafana',
            title: function () { return 'Metrics'; },
            tooltip: function () { return 'Views metrics across all containers using Grafana and InfluxDB'; },
            isValid: function () { return ServiceRegistry.hasService(Main.grafanaServiceName) && !Core.isRemoteConnection(); },
            href: function () { return ServiceRegistry.serviceLink(Main.grafanaServiceName); },
            isActive: function () { return false; }
        });
        nav.add({
            id: "chat",
            title: function () { return 'Chat'; },
            tooltip: function () { return 'Chat room for discussing this namespace'; },
            isValid: function () { return ServiceRegistry.hasService(Main.chatServiceName) && !Core.isRemoteConnection(); },
            href: function () {
                var answer = ServiceRegistry.serviceLink(Main.chatServiceName);
                if (answer) {
                }
                return answer;
            },
            isActive: function () { return false; }
        });
        Main.log.debug("loaded");
    }]);
    hawtioPluginLoader.addModule(Main.pluginName);
})(Main || (Main = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLmpzIiwibWFpbi90cy9tYWluR2xvYmFscy50cyIsIm1haW4vdHMvbWFpblBsdWdpbi50cyJdLCJuYW1lcyI6WyJNYWluIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FDZUEsSUFBTyxJQUFJLENBYVY7QUFiRCxXQUFPLElBQUksRUFBQyxDQUFDO0lBRUFBLGVBQVVBLEdBQUdBLGlCQUFpQkEsQ0FBQ0E7SUFFL0JBLFFBQUdBLEdBQW1CQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxlQUFVQSxDQUFDQSxDQUFDQTtJQUU3Q0EsaUJBQVlBLEdBQUdBLG1CQUFtQkEsQ0FBQ0E7SUFHbkNBLG9CQUFlQSxHQUFHQSxVQUFVQSxDQUFDQTtJQUM3QkEsdUJBQWtCQSxHQUFHQSxTQUFTQSxDQUFDQTtJQUMvQkEsMEJBQXFCQSxHQUFHQSxhQUFhQSxDQUFDQTtBQUVuREEsQ0FBQ0EsRUFiTSxJQUFJLEtBQUosSUFBSSxRQWFWOztBQ0pELElBQU8sSUFBSSxDQXFKVjtBQXJKRCxXQUFPLElBQUksRUFBQyxDQUFDO0lBRUFBLFlBQU9BLEdBQUdBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLGVBQVVBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBO0lBRXBEQSxJQUFJQSxHQUFHQSxHQUFHQSxTQUFTQSxDQUFDQTtJQUVwQkEsWUFBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsbUJBQW1CQSxFQUFFQSxnQkFBZ0JBLEVBQUVBLDBCQUEwQkEsRUFDL0VBLFVBQUNBLGlCQUFpQkEsRUFBRUEsY0FBdUNBLEVBQUVBLE9BQXFDQTtJQVdwR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFFSkEsWUFBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsWUFBWUEsRUFBRUEsV0FBV0EsRUFBRUEsaUJBQWlCQSxFQUFFQSxpQkFBaUJBLEVBQUVBLFFBQVFBLEVBQUVBLGVBQWVBLEVBQUVBLFVBQUNBLFVBQVVBLEVBQUVBLEdBQTJCQSxFQUFFQSxlQUFlQSxFQUFFQSxlQUFlQSxFQUFFQSxNQUFNQSxFQUFFQSxhQUFhQTtRQUV4TUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsUUFBUUEsS0FBS0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDeENBLElBQUlBLGlCQUFpQkEsR0FBR0EsYUFBYUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0E7WUFDakVBLElBQUlBLGVBQWVBLENBQUNBO1lBR3BCQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSx3QkFBd0JBLEVBQUVBO2dCQU12QyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDOUMsSUFBSSxTQUFTLEdBQUcsZUFBZSxDQUFDLGdCQUFnQixFQUFFLENBQUM7b0JBQ25ELElBQUksVUFBVSxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3RELEVBQUUsQ0FBQyxDQUFDLFVBQVUsS0FBSyxJQUFJLElBQUksU0FBUyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQzdDLElBQUksT0FBTyxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO3dCQUM5RCxNQUFNLENBQUMsS0FBSyxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQzt3QkFDckQsTUFBTSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQ3JELE1BQU0sQ0FBQyxLQUFLLENBQUMscUJBQXFCLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO3dCQUMxRCxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsS0FBSyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7NEJBQzNDLGVBQWUsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDO3dCQUMzQyxDQUFDO3dCQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsS0FBSyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7NEJBQ2hELGVBQWUsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO3dCQUN4QyxDQUFDO3dCQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNILGVBQWUsR0FBSSxPQUFPLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQzt3QkFDdkQsQ0FBQzt3QkFDRCxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxlQUFlLENBQUM7d0JBQ3hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsOEJBQThCLEVBQUUsZUFBZSxDQUFDLENBQUM7b0JBQ3JFLENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0wsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsdUJBQXVCLEdBQUcsU0FBUyxHQUFHLFlBQVksQ0FBQzt3QkFDaEYsTUFBTSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDakUsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQyxDQUFDQSxDQUFDQTtRQUNOQSxDQUFDQTtRQUVEQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxhQUFhQSxDQUFDQSxPQUFPQSxDQUFDQSxPQUFPQSxFQUFFQSxlQUFVQSxFQUFFQSxVQUFDQSxLQUFLQTtZQUN0REEsS0FBS0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsVUFBQ0EsSUFBSUE7Z0JBQ2pCQSxNQUFNQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDZkEsS0FBS0EsT0FBT0EsQ0FBQ0E7b0JBQ2JBLEtBQUtBLEtBQUtBLENBQUNBO29CQUNYQSxLQUFLQSxNQUFNQSxDQUFDQTtvQkFDWkEsS0FBS0EsaUJBQWlCQTt3QkFDcEJBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBLGNBQU1BLFlBQUtBLEVBQUxBLENBQUtBLENBQUNBO2dCQUMvQkEsQ0FBQ0E7WUFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDTEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDSEEsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0E7WUFDTkEsRUFBRUEsRUFBRUEsU0FBU0E7WUFDYkEsS0FBS0EsRUFBRUEsY0FBTUEsZ0JBQVNBLEVBQVRBLENBQVNBO1lBQ3RCQSxPQUFPQSxFQUFFQSxjQUFNQSx5Q0FBa0NBLEVBQWxDQSxDQUFrQ0E7WUFDakRBLE9BQU9BLEVBQUVBLGNBQU1BLE9BQUFBLGVBQWVBLENBQUNBLFVBQVVBLENBQUNBLDBCQUFxQkEsQ0FBQ0EsSUFBSUEsZUFBZUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EscUJBQXFCQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxrQkFBa0JBLEVBQUVBLEVBQXBJQSxDQUFvSUE7WUFDbkpBLElBQUlBLEVBQUVBLGNBQU1BLG1CQUFZQSxFQUFaQSxDQUFZQTtZQUN4QkEsUUFBUUEsRUFBRUEsY0FBTUEsWUFBS0EsRUFBTEEsQ0FBS0E7U0FDdEJBLENBQUNBLENBQUNBO1FBRUhBLElBQUlBLGlCQUFpQkEsR0FBR0EsVUFBVUEsQ0FBQ0EsaUJBQWlCQSxDQUFDQTtRQUVyREEsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0E7WUFDTkEsRUFBRUEsRUFBRUEsUUFBUUE7WUFDWkEsS0FBS0EsRUFBRUEsY0FBT0EsYUFBTUEsRUFBTkEsQ0FBTUE7WUFDcEJBLE9BQU9BLEVBQUVBLGNBQU1BLHNGQUErRUEsRUFBL0VBLENBQStFQTtZQUM5RkEsT0FBT0EsRUFBRUEsY0FBTUEsT0FBQUEsZUFBZUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxrQkFBa0JBLEVBQUVBLEVBQTNFQSxDQUEyRUE7WUFDMUZBLElBQUlBLEVBQUVBLGNBQU1BLE9BQUFBLFVBQVVBLENBQUNBLGNBQWNBLENBQUNBLGVBQWVBLENBQUNBLEVBQTFDQSxDQUEwQ0E7WUFDdERBLFFBQVFBLEVBQUVBLGNBQU1BLFlBQUtBLEVBQUxBLENBQUtBO1NBQ3RCQSxDQUFDQSxDQUFDQTtRQUVIQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQTtZQUNOQSxFQUFFQSxFQUFFQSxRQUFRQTtZQUNaQSxLQUFLQSxFQUFFQSxjQUFNQSx1QkFBZ0JBLEVBQWhCQSxDQUFnQkE7WUFDN0JBLE9BQU9BLEVBQUVBLGNBQU1BLHdEQUFpREEsRUFBakRBLENBQWlEQTtZQUNoRUEsT0FBT0EsRUFBRUEsY0FBTUEsT0FBQUEsZUFBZUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0Esa0JBQWtCQSxFQUFFQSxFQUFsRUEsQ0FBa0VBO1lBQ2pGQSxJQUFJQSxFQUFFQSxjQUFNQSxxQkFBY0EsRUFBZEEsQ0FBY0E7U0FDM0JBLENBQUNBLENBQUNBO1FBRUhBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBO1lBQ05BLEVBQUVBLEVBQUVBLFNBQVNBO1lBQ2JBLEtBQUtBLEVBQUVBLGNBQU9BLGdCQUFTQSxFQUFUQSxDQUFTQTtZQUN2QkEsT0FBT0EsRUFBRUEsY0FBTUEsdUVBQWdFQSxFQUFoRUEsQ0FBZ0VBO1lBQy9FQSxPQUFPQSxFQUFFQSxjQUFNQSxPQUFBQSxlQUFlQSxDQUFDQSxVQUFVQSxDQUFDQSx1QkFBa0JBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLGtCQUFrQkEsRUFBRUEsRUFBNUVBLENBQTRFQTtZQUMzRkEsSUFBSUEsRUFBRUEsY0FBTUEsT0FBQUEsZUFBZUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsdUJBQWtCQSxDQUFDQSxFQUEvQ0EsQ0FBK0NBO1lBQzNEQSxRQUFRQSxFQUFFQSxjQUFNQSxZQUFLQSxFQUFMQSxDQUFLQTtTQUN0QkEsQ0FBQ0EsQ0FBQ0E7UUFFSEEsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0E7WUFDTkEsRUFBRUEsRUFBRUEsTUFBTUE7WUFDVkEsS0FBS0EsRUFBRUEsY0FBT0EsYUFBTUEsRUFBTkEsQ0FBTUE7WUFDcEJBLE9BQU9BLEVBQUVBLGNBQU1BLGdEQUF5Q0EsRUFBekNBLENBQXlDQTtZQUN4REEsT0FBT0EsRUFBRUEsY0FBTUEsT0FBQUEsZUFBZUEsQ0FBQ0EsVUFBVUEsQ0FBQ0Esb0JBQWVBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLGtCQUFrQkEsRUFBRUEsRUFBekVBLENBQXlFQTtZQUN4RkEsSUFBSUEsRUFBRUE7Z0JBQ0pBLElBQUlBLE1BQU1BLEdBQUdBLGVBQWVBLENBQUNBLFdBQVdBLENBQUNBLG9CQUFlQSxDQUFDQSxDQUFDQTtnQkFDMURBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dCQWViQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7WUFDaEJBLENBQUNBO1lBQ0RBLFFBQVFBLEVBQUVBLGNBQU1BLFlBQUtBLEVBQUxBLENBQUtBO1NBQ3RCQSxDQUFDQSxDQUFDQTtRQWFIQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtJQUN0QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFFSkEsa0JBQWtCQSxDQUFDQSxTQUFTQSxDQUFDQSxlQUFVQSxDQUFDQSxDQUFDQTtBQUMzQ0EsQ0FBQ0EsRUFySk0sSUFBSSxLQUFKLElBQUksUUFxSlYiLCJmaWxlIjoiY29tcGlsZWQuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGwsIi8vLyBDb3B5cmlnaHQgMjAxNC0yMDE1IFJlZCBIYXQsIEluYy4gYW5kL29yIGl0cyBhZmZpbGlhdGVzXG4vLy8gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyBhcyBpbmRpY2F0ZWQgYnkgdGhlIEBhdXRob3IgdGFncy5cbi8vL1xuLy8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8vXG4vLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vL1xuLy8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5tb2R1bGUgTWFpbiB7XG5cbiAgZXhwb3J0IHZhciBwbHVnaW5OYW1lID0gXCJmYWJyaWM4LWNvbnNvbGVcIjtcblxuICBleHBvcnQgdmFyIGxvZzogTG9nZ2luZy5Mb2dnZXIgPSBMb2dnZXIuZ2V0KHBsdWdpbk5hbWUpO1xuXG4gIGV4cG9ydCB2YXIgdGVtcGxhdGVQYXRoID0gXCJwbHVnaW5zL21haW4vaHRtbFwiO1xuXG4gIC8vIGt1YmVybmV0ZXMgc2VydmljZSBuYW1lc1xuICBleHBvcnQgdmFyIGNoYXRTZXJ2aWNlTmFtZSA9IFwibGV0c2NoYXRcIjtcbiAgZXhwb3J0IHZhciBncmFmYW5hU2VydmljZU5hbWUgPSBcImdyYWZhbmFcIjtcbiAgZXhwb3J0IHZhciBhcHBMaWJyYXJ5U2VydmljZU5hbWUgPSBcImFwcC1saWJyYXJ5XCI7XG5cbn1cbiIsIi8vLyBDb3B5cmlnaHQgMjAxNC0yMDE1IFJlZCBIYXQsIEluYy4gYW5kL29yIGl0cyBhZmZpbGlhdGVzXG4vLy8gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyBhcyBpbmRpY2F0ZWQgYnkgdGhlIEBhdXRob3IgdGFncy5cbi8vL1xuLy8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8vXG4vLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vL1xuLy8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWFpbkdsb2JhbHMudHNcIi8+XG5cbi8vIFRPRE8gbm90IHN1cmUgaWYgdGhlc2UgYXJlIHJlcXVpcmVkPyBUaGV5IGFyZSBkZWZpbmVkIGluIGhhd3Rpby1rdWJlcm5ldGVzIHRvby4uLlxuLypcbmRlY2xhcmUgdmFyIE9TT0F1dGhDb25maWc6IEt1YmVybmV0ZXMuT3BlblNoaWZ0T0F1dGhDb25maWc7XG5kZWNsYXJlIHZhciBHb29nbGVPQXV0aENvbmZpZzogS3ViZXJuZXRlcy5Hb29nbGVPQXV0aENvbmZpZztcbmRlY2xhcmUgdmFyIEtleWNsb2FrQ29uZmlnOiBLdWJlcm5ldGVzLktleUNsb2FrQXV0aENvbmZpZztcbiovXG5cbm1vZHVsZSBNYWluIHtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbXSk7XG5cbiAgdmFyIHRhYiA9IHVuZGVmaW5lZDtcblxuICBfbW9kdWxlLmNvbmZpZyhbXCIkbG9jYXRpb25Qcm92aWRlclwiLCBcIiRyb3V0ZVByb3ZpZGVyXCIsIFwiSGF3dGlvTmF2QnVpbGRlclByb3ZpZGVyXCIsXG4gICAgKCRsb2NhdGlvblByb3ZpZGVyLCAkcm91dGVQcm92aWRlcjogbmcucm91dGUuSVJvdXRlUHJvdmlkZXIsIGJ1aWxkZXI6IEhhd3Rpb01haW5OYXYuQnVpbGRlckZhY3RvcnkpID0+IHtcbi8qXG4gICAgdGFiID0gYnVpbGRlci5jcmVhdGUoKVxuICAgICAgLmlkKHBsdWdpbk5hbWUpXG4gICAgICAudGl0bGUoKCkgPT4gXCJFeGFtcGxlXCIpXG4gICAgICAuaHJlZigoKSA9PiBcIi9leGFtcGxlXCIpXG4gICAgICAuc3ViUGF0aChcIlBhZ2UgMVwiLCBcInBhZ2UxXCIsIGJ1aWxkZXIuam9pbih0ZW1wbGF0ZVBhdGgsIFwicGFnZTEuaHRtbFwiKSlcbiAgICAgIC5idWlsZCgpO1xuICAgIGJ1aWxkZXIuY29uZmlndXJlUm91dGluZygkcm91dGVQcm92aWRlciwgdGFiKTtcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4qL1xuICB9XSk7XG5cbiAgX21vZHVsZS5ydW4oW1wiJHJvb3RTY29wZVwiLCBcIkhhd3Rpb05hdlwiLCBcIkt1YmVybmV0ZXNNb2RlbFwiLCBcIlNlcnZpY2VSZWdpc3RyeVwiLCBcIkxvZ2dlclwiLCBcIkNvbmZpZ3VyYXRpb25cIiwgKCRyb290U2NvcGUsIG5hdjogSGF3dGlvTWFpbk5hdi5SZWdpc3RyeSwgS3ViZXJuZXRlc01vZGVsLCBTZXJ2aWNlUmVnaXN0cnksIExvZ2dlciwgQ29uZmlndXJhdGlvbikgPT4ge1xuICAgIFxuICAgIGlmIChDb25maWd1cmF0aW9uLnBsYXRmb3JtID09PSAnZmFicmljOCcpIHtcbiAgICAgICB2YXIgYXBpRW5kcG9pbnRDb25maWcgPSBDb25maWd1cmF0aW9uLmFwaS5lbmRwb2ludC50b0xvd2VyQ2FzZSgpO1xuICAgICAgIHZhciBkeW5hbWljRW5kcG9pbnQ7XG5cbiAgICAgICAvLyBHZXRzIGNhbGxlZCBiYWNrIHNvIHdlIGNhbiB1cGRhdGUgdGhlIGVuZHBvaW50IHNldHRpbmdzIHdoZW4gdGhlIG5hbWVzcGFjZSBjaGFuZ2VzXG4gICAgICAgJHJvb3RTY29wZS4kb24oJ2t1YmVybmV0ZXNNb2RlbFVwZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAvL2lmIHRoZSBlbmRwb2ludCBjb25maWcgc3RhcnRzIHdpdGggJ2R5bmFtaWMnIHRoZW4gdHJ5IHRvIGxvb2t1cCB0aGUgYXBpbWFuXG4gICAgICAgICAvL2JhY2tlbmQgaW4gdGhlIGN1cnJlbnQgbmFtZXNwYWNlLiBCeSBkZWZhdWx0IHlvdSdkIHdhbnQgdG8gdXNlIHRoZSBkeW5hbWljUm91dGUgc2luY2VcbiAgICAgICAgIC8vdGhhdCBpcyB0aGUgb25seSBwdWJsaWNseSBhdmFpbGFibGUgZW5kcG9pbnQsIGJ1dCB0aGVyZSBtYXliZSB1c2VjYXNlcyB3aGVyZSB5b3UnZCB3YW50XG4gICAgICAgICAvL3RvIHVzZSB0aGUgU2VydmljZVVybCAoS3ViZXJuZXRlcyBTZXJ2aWNlIElQIGFkZHJlc3MpLCBvciB0aGUgS3ViZXJuZXRlcyBQcm94eS5cbiAgICAgICAgIC8vZHluYW1pY1JvdXRlLCBkeW5hbWljU2VydmljZVVybCwgZHluYW1pY1Byb3h5VXJsXG4gICAgICAgICBpZiAoYXBpRW5kcG9pbnRDb25maWcuaW5kZXhPZihcImR5bmFtaWNcIikgPT09IDApIHtcbiAgICAgICAgICAgIHZhciBuYW1lc3BhY2UgPSBLdWJlcm5ldGVzTW9kZWwuY3VycmVudE5hbWVzcGFjZSgpO1xuICAgICAgICAgICAgdmFyIGhhc1NlcnZpY2UgPSBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShcImFwaW1hblwiKTtcbiAgICAgICAgICAgIGlmIChoYXNTZXJ2aWNlID09PSB0cnVlICYmIG5hbWVzcGFjZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgdmFyIHNlcnZpY2UgPSBLdWJlcm5ldGVzTW9kZWwuZ2V0U2VydmljZShuYW1lc3BhY2UsIFwiYXBpbWFuXCIpO1xuICAgICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiYXBpbWFuIHJvdXRlOiBcIiArIHNlcnZpY2UuJGNvbm5lY3RVcmwpO1xuICAgICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiYXBpbWFuIHByb3h5VXJsOiBcIiArIHNlcnZpY2UucHJveHlVcmwpO1xuICAgICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiYXBpbWFuIHNlcnZpY2VVcmw6IFwiICsgc2VydmljZS4kc2VydmljZVVybCk7XG4gICAgICAgICAgICAgICBpZiAoYXBpRW5kcG9pbnRDb25maWcgPT09IFwiZHluYW1pY1NlcnZpY2VVcmxcIikge1xuICAgICAgICAgICAgICAgICAgICBkeW5hbWljRW5kcG9pbnQgPSBzZXJ2aWNlLiRzZXJ2aWNlVXJsO1xuICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhcGlFbmRwb2ludENvbmZpZyA9PT0gXCJkeW5hbWljUHJveHlVcmxcIikge1xuICAgICAgICAgICAgICAgICAgICBkeW5hbWljRW5kcG9pbnQgPSBzZXJ2aWNlLnByb3h5VXJsO1xuICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZHluYW1pY0VuZHBvaW50ID0gIHNlcnZpY2UuJGNvbm5lY3RVcmwgKyBcImFwaW1hblwiO1xuICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5hcGkuZW5kcG9pbnQgPSBkeW5hbWljRW5kcG9pbnQ7XG4gICAgICAgICAgICAgICAgICAgIExvZ2dlci5pbmZvKFwiQXBpbWFuIER5bmFtaWMgRW5kcG9pbnQ6IHswfVwiLCBkeW5hbWljRW5kcG9pbnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgIENvbmZpZ3VyYXRpb24uYXBpLmVuZHBvaW50ID0gXCJuby1hcGltYW4tcnVubmluZy1pbi1cIiArIG5hbWVzcGFjZSArIFwiLW5hbWVzcGFjZVwiO1xuICAgICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiTm8gYXBpbWFuIHJ1bm5pbmcgaW4gezB9IG5hbWVzcGFjZVwiLCBuYW1lc3BhY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgfVxuICAgICAgIH0pO1xuICAgIH1cblxuICAgIG5hdi5vbihIYXd0aW9NYWluTmF2LkFjdGlvbnMuQ0hBTkdFRCwgcGx1Z2luTmFtZSwgKGl0ZW1zKSA9PiB7XG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHN3aXRjaChpdGVtLmlkKSB7XG4gICAgICAgICAgY2FzZSAnZm9yZ2UnOlxuICAgICAgICAgIGNhc2UgJ2p2bSc6XG4gICAgICAgICAgY2FzZSAnd2lraSc6XG4gICAgICAgICAgY2FzZSAnZG9ja2VyLXJlZ2lzdHJ5JzpcbiAgICAgICAgICAgIGl0ZW0uaXNWYWxpZCA9ICgpID0+IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBuYXYuYWRkKHtcbiAgICAgIGlkOiAnbGlicmFyeScsXG4gICAgICB0aXRsZTogKCkgPT4gJ0xpYnJhcnknLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgdGhlIGxpYnJhcnkgb2YgYXBwbGljYXRpb25zJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGFwcExpYnJhcnlTZXJ2aWNlTmFtZSkgJiYgU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoXCJhcHAtbGlicmFyeS1qb2xva2lhXCIpICYmICFDb3JlLmlzUmVtb3RlQ29ubmVjdGlvbigpLFxuICAgICAgaHJlZjogKCkgPT4gXCIvd2lraS92aWV3XCIsXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIHZhciBraWJhbmFTZXJ2aWNlTmFtZSA9IEt1YmVybmV0ZXMua2liYW5hU2VydmljZU5hbWU7XG5cbiAgICBuYXYuYWRkKHtcbiAgICAgIGlkOiAna2liYW5hJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0xvZ3MnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgYW5kIHNlYXJjaCBhbGwgbG9ncyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgS2liYW5hIGFuZCBFbGFzdGljU2VhcmNoJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGtpYmFuYVNlcnZpY2VOYW1lKSAmJiAhQ29yZS5pc1JlbW90ZUNvbm5lY3Rpb24oKSxcbiAgICAgIGhyZWY6ICgpID0+IEt1YmVybmV0ZXMua2liYW5hTG9nc0xpbmsoU2VydmljZVJlZ2lzdHJ5KSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgbmF2LmFkZCh7XG4gICAgICBpZDogJ2FwaW1hbicsXG4gICAgICB0aXRsZTogKCkgPT4gJ0FQSSBNYW5hZ2VtZW50JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdBZGQgUG9saWNpZXMgYW5kIFBsYW5zIHRvIHlvdXIgQVBJcyB3aXRoIEFwaW1hbicsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZSgnYXBpbWFuJykgJiYgIUNvcmUuaXNSZW1vdGVDb25uZWN0aW9uKCksXG4gICAgICBocmVmOiAoKSA9PiBcIi9hcGktbWFuYWdlclwiXG4gICAgfSk7XG5cbiAgICBuYXYuYWRkKHtcbiAgICAgIGlkOiAnZ3JhZmFuYScsXG4gICAgICB0aXRsZTogKCkgPT4gICdNZXRyaWNzJyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdWaWV3cyBtZXRyaWNzIGFjcm9zcyBhbGwgY29udGFpbmVycyB1c2luZyBHcmFmYW5hIGFuZCBJbmZsdXhEQicsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShncmFmYW5hU2VydmljZU5hbWUpICYmICFDb3JlLmlzUmVtb3RlQ29ubmVjdGlvbigpLFxuICAgICAgaHJlZjogKCkgPT4gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKGdyYWZhbmFTZXJ2aWNlTmFtZSksXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIG5hdi5hZGQoe1xuICAgICAgaWQ6IFwiY2hhdFwiLFxuICAgICAgdGl0bGU6ICgpID0+ICAnQ2hhdCcsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnQ2hhdCByb29tIGZvciBkaXNjdXNzaW5nIHRoaXMgbmFtZXNwYWNlJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGNoYXRTZXJ2aWNlTmFtZSkgJiYgIUNvcmUuaXNSZW1vdGVDb25uZWN0aW9uKCksXG4gICAgICBocmVmOiAoKSA9PiB7XG4gICAgICAgIHZhciBhbnN3ZXIgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsoY2hhdFNlcnZpY2VOYW1lKTtcbiAgICAgICAgaWYgKGFuc3dlcikge1xuLypcbiAgICAgICAgICBUT0RPIGFkZCBhIGN1c3RvbSBsaW5rIHRvIHRoZSBjb3JyZWN0IHJvb20gZm9yIHRoZSBjdXJyZW50IG5hbWVzcGFjZT9cblxuICAgICAgICAgIHZhciBpcmNIb3N0ID0gXCJcIjtcbiAgICAgICAgICB2YXIgaXJjU2VydmljZSA9IFNlcnZpY2VSZWdpc3RyeS5maW5kU2VydmljZShcImh1Ym90XCIpO1xuICAgICAgICAgIGlmIChpcmNTZXJ2aWNlKSB7XG4gICAgICAgICAgICBpcmNIb3N0ID0gaXJjU2VydmljZS5wb3J0YWxJUDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlyY0hvc3QpIHtcbiAgICAgICAgICAgIHZhciBuaWNrID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl0gfHwgbG9jYWxTdG9yYWdlW1wiaXJjTmlja1wiXSB8fCBcIm15bmFtZVwiO1xuICAgICAgICAgICAgdmFyIHJvb20gPSBcIiNmYWJyaWM4LVwiICsgIGN1cnJlbnRLdWJlcm5ldGVzTmFtZXNwYWNlKCk7XG4gICAgICAgICAgICBhbnN3ZXIgPSBVcmxIZWxwZXJzLmpvaW4oYW5zd2VyLCBcIi9raXdpXCIsIGlyY0hvc3QsIFwiPyZuaWNrPVwiICsgbmljayArIHJvb20pO1xuICAgICAgICAgIH1cbiovXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgIH0sXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIC8vIFRPRE8gd2Ugc2hvdWxkIG1vdmUgdGhpcyB0byBhIG5pY2VyIGxpbmsgaW5zaWRlIHRoZSBMaWJyYXJ5IHNvb24gLSBhbHNvIGxldHMgaGlkZSB1bnRpbCBpdCB3b3Jrcy4uLlxuLypcbiAgICB3b3Jrc3BhY2UudG9wTGV2ZWxUYWJzLnB1c2goe1xuICAgICAgaWQ6ICdjcmVhdGVQcm9qZWN0JyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0NyZWF0ZScsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnQ3JlYXRlcyBhIG5ldyBwcm9qZWN0JyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKFwiYXBwLWxpYnJhcnlcIikgJiYgZmFsc2UsXG4gICAgICBocmVmOiAoKSA9PiBcIi9wcm9qZWN0L2NyZWF0ZVwiXG4gICAgfSk7XG4qL1xuXG4gICAgbG9nLmRlYnVnKFwibG9hZGVkXCIpO1xuICB9XSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
/// <reference path="../defs.d.ts"/>

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
var DevExample;
(function (DevExample) {
    DevExample.pluginName = "hawtio-test-plugin";
    DevExample.log = Logger.get(DevExample.pluginName);
    DevExample.templatePath = "test-plugins/example/html";
})(DevExample || (DevExample = {}));

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
/// <reference path="exampleGlobals.ts"/>
var DevExample;
(function (DevExample) {
    DevExample._module = angular.module(DevExample.pluginName, []);
    var tab = undefined;
    DevExample._module.config(["$locationProvider", "$routeProvider", "HawtioNavBuilderProvider", function ($locationProvider, $routeProvider, builder) {
        tab = builder.create().id(DevExample.pluginName).title(function () { return "Test DevExample"; }).href(function () { return "/test_example"; }).subPath("Page 1", "page1", builder.join(DevExample.templatePath, "page1.html")).build();
        builder.configureRouting($routeProvider, tab);
    }]);
    DevExample._module.run(["HawtioNav", function (HawtioNav) {
        HawtioNav.add(tab);
        DevExample.log.debug("loaded");
    }]);
})(DevExample || (DevExample = {}));

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
/// <reference path="examplePlugin.ts"/>
var DevExample;
(function (DevExample) {
    DevExample.Page1Controller = DevExample._module.controller("DevExample.Page1Controller", ["$scope", function ($scope) {
        $scope.target = "World!";
    }]);
})(DevExample || (DevExample = {}));

angular.module("fabric8-console-test-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("test-plugins/example/html/page1.html","<div class=\"row\">\n  <div class=\"col-md-12\" ng-controller=\"DevExample.Page1Controller\">\n    <h1>Page 1</h1>\n    <p>This plugin won\'t be exported in the bower package</p>\n    <p class=\'customClass\'>Hello {{target}}</p>\n  </div>\n</div>\n");}]); hawtioPluginLoader.addModule("fabric8-console-test-templates");