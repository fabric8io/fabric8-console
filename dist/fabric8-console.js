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
/// <reference path="../libs/hawtio-jmx/defs.d.ts"/>
/// <reference path="../libs/hawtio-kubernetes/defs.d.ts"/>

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
/// <reference path="mainGlobals.ts"/>
var Main;
(function (Main) {
    Main._module = angular.module(Main.pluginName, []);
    var tab = undefined;
    Main._module.config(["$locationProvider", "$routeProvider", "HawtioNavBuilderProvider",
        function ($locationProvider, $routeProvider, builder) {
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
                                dynamicEndpoint = service.$serviceUrl + "apiman";
                            }
                            else if (apiEndpointConfig === "dynamicProxyUrl") {
                                dynamicEndpoint = service.proxyUrl + "apiman";
                            }
                            else {
                                dynamicEndpoint = service.$connectUrl + "apiman";
                            }
                            if (Configuration.api.endpoint !== dynamicEndpoint) {
                                Configuration.api.endpoint = dynamicEndpoint;
                                Logger.debug("apiman route: {0}", service.$connectUrl);
                                Logger.debug("apiman proxyUrl: {0} ", service.proxyUrl);
                                Logger.debug("apiman serviceUrl: {0}", service.$serviceUrl);
                                Logger.info("Apiman Dynamic Endpoint: {0}", dynamicEndpoint);
                            }
                        }
                        else {
                            Configuration.api.endpoint = "no-apiman-running-in-" + namespace + "-namespace";
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLnRzIiwibWFpbi90cy9tYWluR2xvYmFscy50cyIsIm1haW4vdHMvbWFpblBsdWdpbi50cyJdLCJuYW1lcyI6WyJNYWluIl0sIm1hcHBpbmdzIjoiQUFBQSwyREFBMkQ7QUFDM0QsNERBQTREO0FBQzVELEdBQUc7QUFDSCxtRUFBbUU7QUFDbkUsb0VBQW9FO0FBQ3BFLDJDQUEyQztBQUMzQyxHQUFHO0FBQ0gsZ0RBQWdEO0FBQ2hELEdBQUc7QUFDSCx1RUFBdUU7QUFDdkUscUVBQXFFO0FBQ3JFLDRFQUE0RTtBQUM1RSx1RUFBdUU7QUFDdkUsa0NBQWtDO0FBRWxDLDBEQUEwRDtBQUMxRCxvREFBb0Q7QUFDcEQsMkRBQTJEOztBQ2pCM0QsMkRBQTJEO0FBQzNELDREQUE0RDtBQUM1RCxHQUFHO0FBQ0gsbUVBQW1FO0FBQ25FLG9FQUFvRTtBQUNwRSwyQ0FBMkM7QUFDM0MsR0FBRztBQUNILGdEQUFnRDtBQUNoRCxHQUFHO0FBQ0gsdUVBQXVFO0FBQ3ZFLHFFQUFxRTtBQUNyRSw0RUFBNEU7QUFDNUUsdUVBQXVFO0FBQ3ZFLGtDQUFrQztBQUVsQyxBQUNBLHlDQUR5QztBQUN6QyxJQUFPLElBQUksQ0FhVjtBQWJELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFFQUEsZUFBVUEsR0FBR0EsaUJBQWlCQSxDQUFDQTtJQUUvQkEsUUFBR0EsR0FBbUJBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLGVBQVVBLENBQUNBLENBQUNBO0lBRTdDQSxpQkFBWUEsR0FBR0EsbUJBQW1CQSxDQUFDQTtJQUduQ0Esb0JBQWVBLEdBQUdBLFVBQVVBLENBQUNBO0lBQzdCQSx1QkFBa0JBLEdBQUdBLFNBQVNBLENBQUNBO0lBQy9CQSwwQkFBcUJBLEdBQUdBLGFBQWFBLENBQUNBO0FBRW5EQSxDQUFDQSxFQWJNLElBQUksS0FBSixJQUFJLFFBYVY7O0FDN0JELDJEQUEyRDtBQUMzRCw0REFBNEQ7QUFDNUQsR0FBRztBQUNILG1FQUFtRTtBQUNuRSxvRUFBb0U7QUFDcEUs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QSxFQUF6Q0EsQ0FBeUNBO2dCQUN4REEsT0FBT0EsRUFBRUEsY0FBTUEsT0FBQUEsZUFBZUEsQ0FBQ0EsVUFBVUEsQ0FBQ0Esb0JBQWVBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLGtCQUFrQkEsRUFBRUEsRUFBekVBLENBQXlFQTtnQkFDeEZBLElBQUlBLEVBQUVBO29CQUNKQSxJQUFJQSxNQUFNQSxHQUFHQSxlQUFlQSxDQUFDQSxXQUFXQSxDQUFDQSxvQkFBZUEsQ0FBQ0EsQ0FBQ0E7b0JBQzFEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFlYkEsQ0FBQ0E7b0JBQ0RBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO2dCQUNoQkEsQ0FBQ0E7Z0JBQ0RBLFFBQVFBLEVBQUVBLGNBQU1BLE9BQUFBLEtBQUtBLEVBQUxBLENBQUtBO2FBQ3RCQSxDQUFDQSxDQUFDQTtZQWFIQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtRQUN0QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFFSkEsa0JBQWtCQSxDQUFDQSxTQUFTQSxDQUFDQSxlQUFVQSxDQUFDQSxDQUFDQTtBQUMzQ0EsQ0FBQ0EsRUExSk0sSUFBSSxLQUFKLElBQUksUUEwSlYiLCJmaWxlIjoiY29tcGlsZWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2xpYnMvaGF3dGlvLXV0aWxpdGllcy9kZWZzLmQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbGlicy9oYXd0aW8tam14L2RlZnMuZC50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9saWJzL2hhd3Rpby1rdWJlcm5ldGVzL2RlZnMuZC50c1wiLz5cbiIsIi8vLyBDb3B5cmlnaHQgMjAxNC0yMDE1IFJlZCBIYXQsIEluYy4gYW5kL29yIGl0cyBhZmZpbGlhdGVzXG4vLy8gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyBhcyBpbmRpY2F0ZWQgYnkgdGhlIEBhdXRob3IgdGFncy5cbi8vL1xuLy8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8vXG4vLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vL1xuLy8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5tb2R1bGUgTWFpbiB7XG5cbiAgZXhwb3J0IHZhciBwbHVnaW5OYW1lID0gXCJmYWJyaWM4LWNvbnNvbGVcIjtcblxuICBleHBvcnQgdmFyIGxvZzogTG9nZ2luZy5Mb2dnZXIgPSBMb2dnZXIuZ2V0KHBsdWdpbk5hbWUpO1xuXG4gIGV4cG9ydCB2YXIgdGVtcGxhdGVQYXRoID0gXCJwbHVnaW5zL21haW4vaHRtbFwiO1xuXG4gIC8vIGt1YmVybmV0ZXMgc2VydmljZSBuYW1lc1xuICBleHBvcnQgdmFyIGNoYXRTZXJ2aWNlTmFtZSA9IFwibGV0c2NoYXRcIjtcbiAgZXhwb3J0IHZhciBncmFmYW5hU2VydmljZU5hbWUgPSBcImdyYWZhbmFcIjtcbiAgZXhwb3J0IHZhciBhcHBMaWJyYXJ5U2VydmljZU5hbWUgPSBcImFwcC1saWJyYXJ5XCI7XG5cbn1cbiIsIi8vLyBDb3B5cmlnaHQgMjAxNC0yMDE1IFJlZCBIYXQsIEluYy4gYW5kL29yIGl0cyBhZmZpbGlhdGVzXG4vLy8gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyBhcyBpbmRpY2F0ZWQgYnkgdGhlIEBhdXRob3IgdGFncy5cbi8vL1xuLy8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8vXG4vLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vL1xuLy8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWFpbkdsb2JhbHMudHNcIi8+XG5cbi8vIFRPRE8gbm90IHN1cmUgaWYgdGhlc2UgYXJlIHJlcXVpcmVkPyBUaGV5IGFyZSBkZWZpbmVkIGluIGhhd3Rpby1rdWJlcm5ldGVzIHRvby4uLlxuLypcbmRlY2xhcmUgdmFyIE9TT0F1dGhDb25maWc6IEt1YmVybmV0ZXMuT3BlblNoaWZ0T0F1dGhDb25maWc7XG5kZWNsYXJlIHZhciBHb29nbGVPQXV0aENvbmZpZzogS3ViZXJuZXRlcy5Hb29nbGVPQXV0aENvbmZpZztcbmRlY2xhcmUgdmFyIEtleWNsb2FrQ29uZmlnOiBLdWJlcm5ldGVzLktleUNsb2FrQXV0aENvbmZpZztcbiovXG5cbm1vZHVsZSBNYWluIHtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbXSk7XG5cbiAgdmFyIHRhYiA9IHVuZGVmaW5lZDtcblxuICBfbW9kdWxlLmNvbmZpZyhbXCIkbG9jYXRpb25Qcm92aWRlclwiLCBcIiRyb3V0ZVByb3ZpZGVyXCIsIFwiSGF3dGlvTmF2QnVpbGRlclByb3ZpZGVyXCIsXG4gICAgKCRsb2NhdGlvblByb3ZpZGVyLCAkcm91dGVQcm92aWRlcjogbmcucm91dGUuSVJvdXRlUHJvdmlkZXIsIGJ1aWxkZXI6IEhhd3Rpb01haW5OYXYuQnVpbGRlckZhY3RvcnkpID0+IHtcbi8qXG4gICAgdGFiID0gYnVpbGRlci5jcmVhdGUoKVxuICAgICAgLmlkKHBsdWdpbk5hbWUpXG4gICAgICAudGl0bGUoKCkgPT4gXCJFeGFtcGxlXCIpXG4gICAgICAuaHJlZigoKSA9PiBcIi9leGFtcGxlXCIpXG4gICAgICAuc3ViUGF0aChcIlBhZ2UgMVwiLCBcInBhZ2UxXCIsIGJ1aWxkZXIuam9pbih0ZW1wbGF0ZVBhdGgsIFwicGFnZTEuaHRtbFwiKSlcbiAgICAgIC5idWlsZCgpO1xuICAgIGJ1aWxkZXIuY29uZmlndXJlUm91dGluZygkcm91dGVQcm92aWRlciwgdGFiKTtcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4qL1xuICB9XSk7XG5cbiAgX21vZHVsZS5ydW4oW1wiJHJvb3RTY29wZVwiLCBcIkhhd3Rpb05hdlwiLCBcIkt1YmVybmV0ZXNNb2RlbFwiLCBcIlNlcnZpY2VSZWdpc3RyeVwiLCBcIkxvZ2dlclwiLCBcIkNvbmZpZ3VyYXRpb25cIiwgKCRyb290U2NvcGUsIG5hdjogSGF3dGlvTWFpbk5hdi5SZWdpc3RyeSwgS3ViZXJuZXRlc01vZGVsLCBTZXJ2aWNlUmVnaXN0cnksIExvZ2dlciwgQ29uZmlndXJhdGlvbikgPT4ge1xuICAgIFxuICAgIGlmIChDb25maWd1cmF0aW9uLnBsYXRmb3JtID09PSAnZmFicmljOCcpIHtcbiAgICAgICB2YXIgYXBpRW5kcG9pbnRDb25maWcgPSBDb25maWd1cmF0aW9uLmFwaS5lbmRwb2ludC50b0xvd2VyQ2FzZSgpO1xuICAgICAgIHZhciBkeW5hbWljRW5kcG9pbnQ7XG5cbiAgICAgICAvLyBHZXRzIGNhbGxlZCBiYWNrIHNvIHdlIGNhbiB1cGRhdGUgdGhlIGVuZHBvaW50IHNldHRpbmdzIHdoZW4gdGhlIG5hbWVzcGFjZSBjaGFuZ2VzXG4gICAgICAgJHJvb3RTY29wZS4kb24oJ2t1YmVybmV0ZXNNb2RlbFVwZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAvL2lmIHRoZSBlbmRwb2ludCBjb25maWcgc3RhcnRzIHdpdGggJ2R5bmFtaWMnIHRoZW4gdHJ5IHRvIGxvb2t1cCB0aGUgYXBpbWFuXG4gICAgICAgICAvL2JhY2tlbmQgaW4gdGhlIGN1cnJlbnQgbmFtZXNwYWNlLiBCeSBkZWZhdWx0IHlvdSdkIHdhbnQgdG8gdXNlIHRoZSBkeW5hbWljUm91dGUgc2luY2VcbiAgICAgICAgIC8vdGhhdCBpcyB0aGUgb25seSBwdWJsaWNseSBhdmFpbGFibGUgZW5kcG9pbnQsIGJ1dCB0aGVyZSBtYXliZSB1c2VjYXNlcyB3aGVyZSB5b3UnZCB3YW50XG4gICAgICAgICAvL3RvIHVzZSB0aGUgU2VydmljZVVybCAoS3ViZXJuZXRlcyBTZXJ2aWNlIElQIGFkZHJlc3MpLCBvciB0aGUgS3ViZXJuZXRlcyBQcm94eS5cbiAgICAgICAgIC8vZHluYW1pY1JvdXRlLCBkeW5hbWljU2VydmljZVVybCwgZHluYW1pY1Byb3h5VXJsXG4gICAgICAgICBpZiAoYXBpRW5kcG9pbnRDb25maWcuaW5kZXhPZihcImR5bmFtaWNcIikgPT09IDApIHtcbiAgICAgICAgICAgIHZhciBuYW1lc3BhY2UgPSBLdWJlcm5ldGVzTW9kZWwuY3VycmVudE5hbWVzcGFjZSgpO1xuICAgICAgICAgICAgdmFyIGhhc1NlcnZpY2UgPSBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShcImFwaW1hblwiKTtcbiAgICAgICAgICAgIGlmIChoYXNTZXJ2aWNlID09PSB0cnVlICYmIG5hbWVzcGFjZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgdmFyIHNlcnZpY2UgPSBLdWJlcm5ldGVzTW9kZWwuZ2V0U2VydmljZShuYW1lc3BhY2UsIFwiYXBpbWFuXCIpO1xuICAgICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiYXBpbWFuIHJvdXRlOiBcIiArIHNlcnZpY2UuJGNvbm5lY3RVcmwpO1xuICAgICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiYXBpbWFuIHByb3h5VXJsOiBcIiArIHNlcnZpY2UucHJveHlVcmwpO1xuICAgICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiYXBpbWFuIHNlcnZpY2VVcmw6IFwiICsgc2VydmljZS4kc2VydmljZVVybCk7XG4gICAgICAgICAgICAgICBpZiAoYXBpRW5kcG9pbnRDb25maWcgPT09IFwiZHluYW1pY1NlcnZpY2VVcmxcIikge1xuICAgICAgICAgICAgICAgICAgICBkeW5hbWljRW5kcG9pbnQgPSBzZXJ2aWNlLiRzZXJ2aWNlVXJsICsgXCJhcGltYW5cIjtcbiAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYXBpRW5kcG9pbnRDb25maWcgPT09IFwiZHluYW1pY1Byb3h5VXJsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZHluYW1pY0VuZHBvaW50ID0gc2VydmljZS5wcm94eVVybCArIFwiYXBpbWFuXCI7XG4gICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkeW5hbWljRW5kcG9pbnQgPSBzZXJ2aWNlLiRjb25uZWN0VXJsICsgXCJhcGltYW5cIjtcbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIGlmIChDb25maWd1cmF0aW9uLmFwaS5lbmRwb2ludCAhPT0gZHluYW1pY0VuZHBvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgIENvbmZpZ3VyYXRpb24uYXBpLmVuZHBvaW50ID0gZHluYW1pY0VuZHBvaW50O1xuICAgICAgICAgICAgICAgICAgICBMb2dnZXIuZGVidWcoXCJhcGltYW4gcm91dGU6IHswfVwiLCBzZXJ2aWNlLiRjb25uZWN0VXJsKTtcbiAgICAgICAgICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiYXBpbWFuIHByb3h5VXJsOiB7MH0gXCIsIHNlcnZpY2UucHJveHlVcmwpO1xuICAgICAgICAgICAgICAgICAgICBMb2dnZXIuZGVidWcoXCJhcGltYW4gc2VydmljZVVybDogezB9XCIsIHNlcnZpY2UuJHNlcnZpY2VVcmwpO1xuICAgICAgICAgICAgICAgICAgICBMb2dnZXIuaW5mbyhcIkFwaW1hbiBEeW5hbWljIEVuZHBvaW50OiB7MH1cIiwgZHluYW1pY0VuZHBvaW50KTtcbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICBDb25maWd1cmF0aW9uLmFwaS5lbmRwb2ludCA9IFwibm8tYXBpbWFuLXJ1bm5pbmctaW4tXCIgKyBuYW1lc3BhY2UgKyBcIi1uYW1lc3BhY2VcIjtcbiAgICAgICAgICAgICAgIC8vIExvZ2dlci5kZWJ1ZyhcIk5vIGFwaW1hbiBydW5uaW5nIGluIHswfSBuYW1lc3BhY2VcIiwgbmFtZXNwYWNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgICB9KTtcbiAgICB9XG5cbiAgICBuYXYub24oSGF3dGlvTWFpbk5hdi5BY3Rpb25zLkNIQU5HRUQsIHBsdWdpbk5hbWUsIChpdGVtcykgPT4ge1xuICAgICAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBzd2l0Y2goaXRlbS5pZCkge1xuICAgICAgICAgIGNhc2UgJ2ZvcmdlJzpcbiAgICAgICAgICBjYXNlICdqdm0nOlxuICAgICAgICAgIGNhc2UgJ3dpa2knOlxuICAgICAgICAgIGNhc2UgJ2RvY2tlci1yZWdpc3RyeSc6XG4gICAgICAgICAgICBpdGVtLmlzVmFsaWQgPSAoKSA9PiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgbmF2LmFkZCh7XG4gICAgICBpZDogJ2xpYnJhcnknLFxuICAgICAgdGl0bGU6ICgpID0+ICdMaWJyYXJ5JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdWaWV3IHRoZSBsaWJyYXJ5IG9mIGFwcGxpY2F0aW9ucycsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShhcHBMaWJyYXJ5U2VydmljZU5hbWUpICYmIFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKFwiYXBwLWxpYnJhcnktam9sb2tpYVwiKSAmJiAhQ29yZS5pc1JlbW90ZUNvbm5lY3Rpb24oKSxcbiAgICAgIGhyZWY6ICgpID0+IFwiL3dpa2kvdmlld1wiLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICB2YXIga2liYW5hU2VydmljZU5hbWUgPSBLdWJlcm5ldGVzLmtpYmFuYVNlcnZpY2VOYW1lO1xuXG4gICAgbmF2LmFkZCh7XG4gICAgICBpZDogJ2tpYmFuYScsXG4gICAgICB0aXRsZTogKCkgPT4gICdMb2dzJyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdWaWV3IGFuZCBzZWFyY2ggYWxsIGxvZ3MgYWNyb3NzIGFsbCBjb250YWluZXJzIHVzaW5nIEtpYmFuYSBhbmQgRWxhc3RpY1NlYXJjaCcsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShraWJhbmFTZXJ2aWNlTmFtZSkgJiYgIUNvcmUuaXNSZW1vdGVDb25uZWN0aW9uKCksXG4gICAgICBocmVmOiAoKSA9PiBLdWJlcm5ldGVzLmtpYmFuYUxvZ3NMaW5rKFNlcnZpY2VSZWdpc3RyeSksXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIG5hdi5hZGQoe1xuICAgICAgaWQ6ICdhcGltYW4nLFxuICAgICAgdGl0bGU6ICgpID0+ICdBUEkgTWFuYWdlbWVudCcsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnQWRkIFBvbGljaWVzIGFuZCBQbGFucyB0byB5b3VyIEFQSXMgd2l0aCBBcGltYW4nLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoJ2FwaW1hbicpICYmICFDb3JlLmlzUmVtb3RlQ29ubmVjdGlvbigpLFxuICAgICAgaHJlZjogKCkgPT4gXCIvYXBpLW1hbmFnZXJcIlxuICAgIH0pO1xuXG4gICAgbmF2LmFkZCh7XG4gICAgICBpZDogJ2dyYWZhbmEnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnTWV0cmljcycsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlld3MgbWV0cmljcyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgR3JhZmFuYSBhbmQgSW5mbHV4REInLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoZ3JhZmFuYVNlcnZpY2VOYW1lKSAmJiAhQ29yZS5pc1JlbW90ZUNvbm5lY3Rpb24oKSxcbiAgICAgIGhyZWY6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhncmFmYW5hU2VydmljZU5hbWUpLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICBuYXYuYWRkKHtcbiAgICAgIGlkOiBcImNoYXRcIixcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0NoYXQnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NoYXQgcm9vbSBmb3IgZGlzY3Vzc2luZyB0aGlzIG5hbWVzcGFjZScsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShjaGF0U2VydmljZU5hbWUpICYmICFDb3JlLmlzUmVtb3RlQ29ubmVjdGlvbigpLFxuICAgICAgaHJlZjogKCkgPT4ge1xuICAgICAgICB2YXIgYW5zd2VyID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKGNoYXRTZXJ2aWNlTmFtZSk7XG4gICAgICAgIGlmIChhbnN3ZXIpIHtcbi8qXG4gICAgICAgICAgVE9ETyBhZGQgYSBjdXN0b20gbGluayB0byB0aGUgY29ycmVjdCByb29tIGZvciB0aGUgY3VycmVudCBuYW1lc3BhY2U/XG5cbiAgICAgICAgICB2YXIgaXJjSG9zdCA9IFwiXCI7XG4gICAgICAgICAgdmFyIGlyY1NlcnZpY2UgPSBTZXJ2aWNlUmVnaXN0cnkuZmluZFNlcnZpY2UoXCJodWJvdFwiKTtcbiAgICAgICAgICBpZiAoaXJjU2VydmljZSkge1xuICAgICAgICAgICAgaXJjSG9zdCA9IGlyY1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpcmNIb3N0KSB7XG4gICAgICAgICAgICB2YXIgbmljayA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdIHx8IGxvY2FsU3RvcmFnZVtcImlyY05pY2tcIl0gfHwgXCJteW5hbWVcIjtcbiAgICAgICAgICAgIHZhciByb29tID0gXCIjZmFicmljOC1cIiArICBjdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgICAgICAgYW5zd2VyID0gVXJsSGVscGVycy5qb2luKGFuc3dlciwgXCIva2l3aVwiLCBpcmNIb3N0LCBcIj8mbmljaz1cIiArIG5pY2sgKyByb29tKTtcbiAgICAgICAgICB9XG4qL1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICB9LFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICAvLyBUT0RPIHdlIHNob3VsZCBtb3ZlIHRoaXMgdG8gYSBuaWNlciBsaW5rIGluc2lkZSB0aGUgTGlicmFyeSBzb29uIC0gYWxzbyBsZXRzIGhpZGUgdW50aWwgaXQgd29ya3MuLi5cbi8qXG4gICAgd29ya3NwYWNlLnRvcExldmVsVGFicy5wdXNoKHtcbiAgICAgIGlkOiAnY3JlYXRlUHJvamVjdCcsXG4gICAgICB0aXRsZTogKCkgPT4gICdDcmVhdGUnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NyZWF0ZXMgYSBuZXcgcHJvamVjdCcsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShcImFwcC1saWJyYXJ5XCIpICYmIGZhbHNlLFxuICAgICAgaHJlZjogKCkgPT4gXCIvcHJvamVjdC9jcmVhdGVcIlxuICAgIH0pO1xuKi9cblxuICAgIGxvZy5kZWJ1ZyhcImxvYWRlZFwiKTtcbiAgfV0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5hZGRNb2R1bGUocGx1Z2luTmFtZSk7XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=