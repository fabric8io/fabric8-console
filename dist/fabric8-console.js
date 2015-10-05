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
/// <reference path="../libs/hawtio-oauth/defs.d.ts"/>
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
    Main._module.run(["$rootScope", "HawtioNav", "KubernetesModel", "ServiceRegistry", function ($rootScope, nav, KubernetesModel, ServiceRegistry) {
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLnRzIiwibWFpbi90cy9tYWluR2xvYmFscy50cyIsIm1haW4vdHMvbWFpblBsdWdpbi50cyJdLCJuYW1lcyI6WyJNYWluIl0sIm1hcHBpbmdzIjoiQUFBQSwyREFBMkQ7QUFDM0QsNERBQTREO0FBQzVELEdBQUc7QUFDSCxtRUFBbUU7QUFDbkUsb0VBQW9FO0FBQ3BFLDJDQUEyQztBQUMzQyxHQUFHO0FBQ0gsZ0RBQWdEO0FBQ2hELEdBQUc7QUFDSCx1RUFBdUU7QUFDdkUscUVBQXFFO0FBQ3JFLDRFQUE0RTtBQUM1RSx1RUFBdUU7QUFDdkUsa0NBQWtDO0FBRWxDLDBEQUEwRDtBQUMxRCxvREFBb0Q7QUFDcEQsc0RBQXNEO0FBQ3RELDJEQUEyRDs7QUNsQjNELDJEQUEyRDtBQUMzRCw0REFBNEQ7QUFDNUQsR0FBRztBQUNILG1FQUFtRTtBQUNuRSxvRUFBb0U7QUFDcEUsMkNBQTJDO0FBQzNDLEdBQUc7QUFDSCxnREFBZ0Q7QUFDaEQsR0FBRztBQUNILHVFQUF1RTtBQUN2RSxxRUFBcUU7QUFDckUsNEVBQTRFO0FBQzVFLHVFQUF1RTtBQUN2RSxrQ0FBa0M7QUFFbEMseUNBQXlDO0FBQ3pDLElBQU8sSUFBSSxDQWFWO0FBYkQsV0FBTyxJQUFJLEVBQUMsQ0FBQztJQUVBQSxlQUFVQSxHQUFHQSxpQkFBaUJBLENBQUNBO0lBRS9CQSxRQUFHQSxHQUFtQkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZUFBVUEsQ0FBQ0EsQ0FBQ0E7SUFFN0NBLGlCQUFZQSxHQUFHQSxtQkFBbUJBLENBQUNBO0lBR25DQSxvQkFBZUEsR0FBR0EsVUFBVUEsQ0FBQ0E7SUFDN0JBLHVCQUFrQkEsR0FBR0EsU0FBU0EsQ0FBQ0E7SUFDL0JBLDBCQUFxQkEsR0FBR0EsYUFBYUEsQ0FBQ0E7QUFFbkRBLENBQUNBLEVBYk0sSUFBSSxLQUFKLElBQUksUUFhVjs7QUM3QkQsMkRBQTJEO0FBQzNELDREQUE0RDtBQUM1RCxHQUFHO0FBQ0gsbUVBQW1FO0FBQ25FLG9FQUFv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Q0EsQ0FBQ0E7WUFhSEEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7UUFDdEJBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0lBRUpBLGtCQUFrQkEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsZUFBVUEsQ0FBQ0EsQ0FBQ0E7QUFDM0NBLENBQUNBLEVBN0dNLElBQUksS0FBSixJQUFJLFFBNkdWIiwiZmlsZSI6ImNvbXBpbGVkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9saWJzL2hhd3Rpby11dGlsaXRpZXMvZGVmcy5kLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2xpYnMvaGF3dGlvLWpteC9kZWZzLmQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbGlicy9oYXd0aW8tb2F1dGgvZGVmcy5kLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2xpYnMvaGF3dGlvLWt1YmVybmV0ZXMvZGVmcy5kLnRzXCIvPlxuIiwiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbm1vZHVsZSBNYWluIHtcblxuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSBcImZhYnJpYzgtY29uc29sZVwiO1xuXG4gIGV4cG9ydCB2YXIgbG9nOiBMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQocGx1Z2luTmFtZSk7XG5cbiAgZXhwb3J0IHZhciB0ZW1wbGF0ZVBhdGggPSBcInBsdWdpbnMvbWFpbi9odG1sXCI7XG5cbiAgLy8ga3ViZXJuZXRlcyBzZXJ2aWNlIG5hbWVzXG4gIGV4cG9ydCB2YXIgY2hhdFNlcnZpY2VOYW1lID0gXCJsZXRzY2hhdFwiO1xuICBleHBvcnQgdmFyIGdyYWZhbmFTZXJ2aWNlTmFtZSA9IFwiZ3JhZmFuYVwiO1xuICBleHBvcnQgdmFyIGFwcExpYnJhcnlTZXJ2aWNlTmFtZSA9IFwiYXBwLWxpYnJhcnlcIjtcblxufVxuIiwiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYWluR2xvYmFscy50c1wiLz5cblxubW9kdWxlIE1haW4ge1xuXG4gIGV4cG9ydCB2YXIgX21vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKHBsdWdpbk5hbWUsIFtdKTtcblxuICB2YXIgdGFiID0gdW5kZWZpbmVkO1xuXG4gIF9tb2R1bGUucnVuKFtcIiRyb290U2NvcGVcIiwgXCJIYXd0aW9OYXZcIiwgXCJLdWJlcm5ldGVzTW9kZWxcIiwgXCJTZXJ2aWNlUmVnaXN0cnlcIiwgKCRyb290U2NvcGUsIG5hdjogSGF3dGlvTWFpbk5hdi5SZWdpc3RyeSwgS3ViZXJuZXRlc01vZGVsLCBTZXJ2aWNlUmVnaXN0cnkpID0+IHtcblxuICAgIG5hdi5vbihIYXd0aW9NYWluTmF2LkFjdGlvbnMuQ0hBTkdFRCwgcGx1Z2luTmFtZSwgKGl0ZW1zKSA9PiB7XG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHN3aXRjaChpdGVtLmlkKSB7XG4gICAgICAgICAgY2FzZSAnZm9yZ2UnOlxuICAgICAgICAgIGNhc2UgJ2p2bSc6XG4gICAgICAgICAgY2FzZSAnd2lraSc6XG4gICAgICAgICAgY2FzZSAnZG9ja2VyLXJlZ2lzdHJ5JzpcbiAgICAgICAgICAgIGl0ZW0uaXNWYWxpZCA9ICgpID0+IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBuYXYuYWRkKHtcbiAgICAgIGlkOiAnbGlicmFyeScsXG4gICAgICB0aXRsZTogKCkgPT4gJ0xpYnJhcnknLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgdGhlIGxpYnJhcnkgb2YgYXBwbGljYXRpb25zJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGFwcExpYnJhcnlTZXJ2aWNlTmFtZSkgJiYgU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoXCJhcHAtbGlicmFyeS1qb2xva2lhXCIpICYmICFDb3JlLmlzUmVtb3RlQ29ubmVjdGlvbigpLFxuICAgICAgaHJlZjogKCkgPT4gXCIvd2lraS92aWV3XCIsXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIHZhciBraWJhbmFTZXJ2aWNlTmFtZSA9IEt1YmVybmV0ZXMua2liYW5hU2VydmljZU5hbWU7XG5cbiAgICBuYXYuYWRkKHtcbiAgICAgIGlkOiAna2liYW5hJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0xvZ3MnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgYW5kIHNlYXJjaCBhbGwgbG9ncyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgS2liYW5hIGFuZCBFbGFzdGljU2VhcmNoJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGtpYmFuYVNlcnZpY2VOYW1lKSAmJiAhQ29yZS5pc1JlbW90ZUNvbm5lY3Rpb24oKSxcbiAgICAgIGhyZWY6ICgpID0+IEt1YmVybmV0ZXMua2liYW5hTG9nc0xpbmsoU2VydmljZVJlZ2lzdHJ5KSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgbmF2LmFkZCh7XG4gICAgICBpZDogJ2FwaW1hbicsXG4gICAgICB0aXRsZTogKCkgPT4gJ0FQSSBNYW5hZ2VtZW50JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdBZGQgUG9saWNpZXMgYW5kIFBsYW5zIHRvIHlvdXIgQVBJcyB3aXRoIEFwaW1hbicsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZSgnYXBpbWFuJykgJiYgIUNvcmUuaXNSZW1vdGVDb25uZWN0aW9uKCksXG4gICAgICBvbGRIcmVmOiAoKSA9PiB7IC8qIG5vdGhpbmcgdG8gZG8gKi8gfSxcbiAgICAgIGhyZWY6ICgpID0+IHtcbiAgICAgICAgdmFyIGhhc2ggPSB7XG4gICAgICAgICAgYmFja1RvOiBuZXcgVVJJKCkudG9TdHJpbmcoKSxcbiAgICAgICAgICB0b2tlbjogSGF3dGlvT0F1dGguZ2V0T0F1dGhUb2tlbigpXG4gICAgICAgIH07XG4gICAgICAgIHZhciB1cmkgPSBuZXcgVVJJKFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluaygnYXBpbWFuJykpO1xuICAgICAgICAvLyBUT0RPIGhhdmUgdG8gb3ZlcndyaXRlIHRoZSBwb3J0IGhlcmUgZm9yIHNvbWUgcmVhc29uXG4gICAgICAgICg8YW55PnVyaS5wb3J0KCc4MCcpLnF1ZXJ5KHt9KS5wYXRoKCdhcGltYW51aS9pbmRleC5odG1sJykpLmhhc2goVVJJLmVuY29kZShhbmd1bGFyLnRvSnNvbihoYXNoKSkpO1xuICAgICAgICByZXR1cm4gdXJpLnRvU3RyaW5nKCk7XG4gICAgICB9ICAgIFxuICAgIH0pO1xuXG4gICAgbmF2LmFkZCh7XG4gICAgICBpZDogJ2dyYWZhbmEnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnTWV0cmljcycsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlld3MgbWV0cmljcyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgR3JhZmFuYSBhbmQgSW5mbHV4REInLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoZ3JhZmFuYVNlcnZpY2VOYW1lKSAmJiAhQ29yZS5pc1JlbW90ZUNvbm5lY3Rpb24oKSxcbiAgICAgIGhyZWY6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhncmFmYW5hU2VydmljZU5hbWUpLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICBuYXYuYWRkKHtcbiAgICAgIGlkOiBcImNoYXRcIixcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0NoYXQnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NoYXQgcm9vbSBmb3IgZGlzY3Vzc2luZyB0aGlzIG5hbWVzcGFjZScsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShjaGF0U2VydmljZU5hbWUpICYmICFDb3JlLmlzUmVtb3RlQ29ubmVjdGlvbigpLFxuICAgICAgaHJlZjogKCkgPT4ge1xuICAgICAgICB2YXIgYW5zd2VyID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKGNoYXRTZXJ2aWNlTmFtZSk7XG4gICAgICAgIGlmIChhbnN3ZXIpIHtcbi8qXG4gICAgICAgICAgVE9ETyBhZGQgYSBjdXN0b20gbGluayB0byB0aGUgY29ycmVjdCByb29tIGZvciB0aGUgY3VycmVudCBuYW1lc3BhY2U/XG5cbiAgICAgICAgICB2YXIgaXJjSG9zdCA9IFwiXCI7XG4gICAgICAgICAgdmFyIGlyY1NlcnZpY2UgPSBTZXJ2aWNlUmVnaXN0cnkuZmluZFNlcnZpY2UoXCJodWJvdFwiKTtcbiAgICAgICAgICBpZiAoaXJjU2VydmljZSkge1xuICAgICAgICAgICAgaXJjSG9zdCA9IGlyY1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpcmNIb3N0KSB7XG4gICAgICAgICAgICB2YXIgbmljayA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdIHx8IGxvY2FsU3RvcmFnZVtcImlyY05pY2tcIl0gfHwgXCJteW5hbWVcIjtcbiAgICAgICAgICAgIHZhciByb29tID0gXCIjZmFicmljOC1cIiArICBjdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgICAgICAgYW5zd2VyID0gVXJsSGVscGVycy5qb2luKGFuc3dlciwgXCIva2l3aVwiLCBpcmNIb3N0LCBcIj8mbmljaz1cIiArIG5pY2sgKyByb29tKTtcbiAgICAgICAgICB9XG4qL1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICB9LFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICAvLyBUT0RPIHdlIHNob3VsZCBtb3ZlIHRoaXMgdG8gYSBuaWNlciBsaW5rIGluc2lkZSB0aGUgTGlicmFyeSBzb29uIC0gYWxzbyBsZXRzIGhpZGUgdW50aWwgaXQgd29ya3MuLi5cbi8qXG4gICAgd29ya3NwYWNlLnRvcExldmVsVGFicy5wdXNoKHtcbiAgICAgIGlkOiAnY3JlYXRlUHJvamVjdCcsXG4gICAgICB0aXRsZTogKCkgPT4gICdDcmVhdGUnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NyZWF0ZXMgYSBuZXcgcHJvamVjdCcsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShcImFwcC1saWJyYXJ5XCIpICYmIGZhbHNlLFxuICAgICAgaHJlZjogKCkgPT4gXCIvcHJvamVjdC9jcmVhdGVcIlxuICAgIH0pO1xuKi9cblxuICAgIGxvZy5kZWJ1ZyhcImxvYWRlZFwiKTtcbiAgfV0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5hZGRNb2R1bGUocGx1Z2luTmFtZSk7XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
